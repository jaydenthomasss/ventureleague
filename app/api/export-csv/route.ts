import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    // Auth check
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
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { data: userData } = await anonClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Service role client (bypasses RLS)
    const serviceClient = createServiceClient();

    // Get all teams in session
    const { data: teams } = await serviceClient
      .from("teams")
      .select("id, name")
      .eq("session_id", sessionId);

    if (!teams || teams.length === 0) {
      return NextResponse.json({ error: "No teams found." }, { status: 404 });
    }

    const teamMap: Record<string, string> = {};
    teams.forEach((t) => {
      teamMap[t.id] = t.name;
    });

    // Get all round results
    const { data: results, error: resultsError } = await serviceClient
      .from("round_results")
      .select("*")
      .in("team_id", teams.map((t) => t.id))
      .order("round_number", { ascending: true })
      .order("team_id", { ascending: true });

    if (resultsError) {
      return NextResponse.json({ error: "Failed to fetch results." }, { status: 500 });
    }

    // Get decisions for context
    const { data: decisions } = await serviceClient
      .from("decisions")
      .select("*")
      .in("team_id", teams.map((t) => t.id))
      .order("round_number", { ascending: true });

    const decisionMap: Record<string, typeof decisions> = {};
    (decisions ?? []).forEach((d) => {
      const key = `${d.team_id}:${d.round_number}`;
      decisionMap[key] = [d] as typeof decisions;
    });

    // Build CSV
    const headers = [
      "Round",
      "Team",
      "Price ($)",
      "Marketing Spend ($)",
      "Units Produced",
      "Units Sold",
      "Revenue ($)",
      "Costs ($)",
      "Profit ($)",
      "Market Share (%)",
      "Cumulative Profit ($)",
    ];

    const rows: string[][] = [];

    for (const result of results ?? []) {
      const teamName = teamMap[result.team_id] ?? result.team_id;
      const decisionKey = `${result.team_id}:${result.round_number}`;
      const decisionArr = decisionMap[decisionKey];
      const decision = decisionArr?.[0];

      rows.push([
        result.round_number.toString(),
        teamName,
        decision ? decision.price.toFixed(2) : "N/A",
        decision ? decision.marketing_spend.toFixed(2) : "N/A",
        decision ? decision.units_produced.toString() : "N/A",
        result.units_sold.toFixed(0),
        result.revenue.toFixed(2),
        result.costs.toFixed(2),
        result.profit.toFixed(2),
        (result.market_share * 100).toFixed(2),
        result.cumulative_profit.toFixed(2),
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ventureleague-results-${sessionId}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export CSV error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
