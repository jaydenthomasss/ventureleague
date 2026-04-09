import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, joinCode, adminCode } = body as {
      name: string;
      role: "student" | "teacher";
      joinCode?: string;
      adminCode?: string;
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

    // Verify admin code for teachers (server-side only)
    if (role === "teacher") {
      const expectedCode = process.env.ADMIN_SECRET_CODE;
      if (!expectedCode || adminCode !== expectedCode) {
        return NextResponse.json(
          { success: false, error: "Invalid admin code. Please check with your administrator." },
          { status: 403 }
        );
      }
    }

    // Get the authenticated user
    const cookieStore = await cookies();

    const anonClient = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();

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
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    let teamId: string | null = null;

    // If student, find team by join code
    if (role === "student") {
      if (!joinCode) {
        return NextResponse.json(
          { success: false, error: "Join code is required for students." },
          { status: 400 }
        );
      }

      const { data: team, error: teamError } = await serviceClient
        .from("teams")
        .select("id, name")
        .eq("join_code", joinCode.toUpperCase())
        .single();

      if (teamError || !team) {
        return NextResponse.json(
          { success: false, error: `Team with code "${joinCode}" not found. Double-check with your teacher.` },
          { status: 404 }
        );
      }

      teamId = team.id;
    }

    // Upsert user record
    const { error: upsertError } = await serviceClient
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email!,
          name,
          role,
          team_id: teamId,
        },
        { onConflict: "id" }
      );

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
