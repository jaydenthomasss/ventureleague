import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, roomCode } = body as {
      name: string;
      role: "student" | "teacher";
      roomCode?: string;
    };

    if (!name || !role) {
      return NextResponse.json(
        { success: false, error: "Name and role are required." },
        { status: 400 }
      );
    }

    if (!["student", "teacher"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role." },
        { status: 400 }
      );
    }

    if (role === "student" && !roomCode) {
      return NextResponse.json(
        { success: false, error: "Room code is required for students." },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const cookieStore = await cookies();

    const anonClient = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    // Use service role to bypass RLS
    const serviceClient = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    let teamId: string | null = null;
    let sessionId: string | null = null;

    // If student, find session by room code and auto-assign to a team
    if (role === "student" && roomCode) {
      const { data: session, error: sessionError } = await serviceClient
        .from("sessions")
        .select("id, name")
        .eq("session_code", roomCode.toUpperCase())
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { success: false, error: `Room code "${roomCode}" not found. Double-check with your teacher.` },
          { status: 404 }
        );
      }

      sessionId = session.id;

      // Find all teams in this session
      const { data: teams } = await serviceClient
        .from("teams")
        .select("id, name")
        .eq("session_id", session.id);

      if (teams && teams.length > 0) {
        // Count members per team and assign to the one with fewest
        const memberCounts = await Promise.all(
          teams.map(async (team) => {
            const { count } = await serviceClient
              .from("users")
              .select("id", { count: "exact", head: true })
              .eq("team_id", team.id);
            return { id: team.id, count: count ?? 0 };
          })
        );
        const smallest = memberCounts.reduce((a, b) => (a.count <= b.count ? a : b));
        teamId = smallest.id;
      }
      // If no teams exist yet, student will be unassigned (team_id null, session_id set)
    }

    // Upsert core user record
    const { error: upsertError } = await serviceClient
      .from("users")
      .upsert(
        { id: user.id, email: user.email!, name, role, team_id: teamId },
        { onConflict: "id" }
      );

    // Separately set session_id if present (requires migration 002 to have been run)
    if (!upsertError && sessionId) {
      await serviceClient
        .from("users")
        .update({ session_id: sessionId })
        .eq("id", user.id);
    }

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return NextResponse.json(
        { success: false, error: "Failed to save profile. Please try again." },
        { status: 500 }
      );
    }

    const redirectTo = role === "teacher" ? "/admin" : "/dashboard";
    return NextResponse.json({ success: true, redirectTo });
  } catch (err) {
    console.error("Onboard API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
