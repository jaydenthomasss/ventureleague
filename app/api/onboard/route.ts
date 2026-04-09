import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase/server";
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
      return NextResponse.json({ success: false, error: "Name and role are required." }, { status: 400 });
    }
    if (!["student", "teacher"].includes(role)) {
      return NextResponse.json({ success: false, error: "Invalid role." }, { status: 400 });
    }
    if (role === "student" && !roomCode) {
      return NextResponse.json({ success: false, error: "Room code is required for students." }, { status: 400 });
    }

    // Verify the requesting user is authenticated (anon client reads cookies)
    const cookieStore = await cookies();
    const anonClient = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }

    // Service role client — properly bypasses RLS
    const serviceClient = createServiceClient();

    let teamId: string | null = null;
    let sessionId: string | null = null;

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

      const { data: teams } = await serviceClient
        .from("teams")
        .select("id")
        .eq("session_id", session.id);

      if (teams && teams.length > 0) {
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
    }

    // Upsert user — service role properly bypasses RLS so INSERT works
    const { error: upsertError } = await serviceClient
      .from("users")
      .upsert(
        { id: user.id, email: user.email!, name, role, team_id: teamId },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return NextResponse.json(
        { success: false, error: `Failed to save profile: ${upsertError.message}` },
        { status: 500 }
      );
    }

    // Set session_id if migration 002 has been run
    if (sessionId) {
      await serviceClient.from("users").update({ session_id: sessionId }).eq("id", user.id);
    }

    return NextResponse.json({ success: true, redirectTo: role === "teacher" ? "/admin" : "/dashboard" });
  } catch (err) {
    console.error("Onboard API error:", err);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
