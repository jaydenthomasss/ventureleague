import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

// Simulation constants
const BASE_DEMAND = 500;
const PRICE_SENSITIVITY = 1.5;
const FAIR_PRICE = 50;

function calculateDemand(
  price: number,
  marketingSpend: number,
  demandMultiplier: number
): number {
  const marketingBoost = marketingSpend / 1000;
  const priceFactor = Math.pow(FAIR_PRICE, PRICE_SENSITIVITY) / Math.pow(price, PRICE_SENSITIVITY);
  const demand = BASE_DEMAND * priceFactor * (1 + marketingBoost) * demandMultiplier;
  return Math.max(0, demand);
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Auth check with anon client
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
      return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }

    // Verify teacher role
    const { data: userData } = await anonClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "teacher") {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    const { sessionId } = await request.json() as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required." }, { status: 400 });
    }

    // Use service role client for all DB operations
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

    // Get current session
    const { data: session, error: sessionError } = await serviceClient
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: "Session not found." }, { status: 404 });
    }

    const currentRound = session.current_round;

    // Get scenario for this round
    const { data: scenario } = await serviceClient
      .from("scenarios")
      .select("*")
      .eq("session_id", sessionId)
      .eq("round_number", currentRound)
      .single();

    const demandMultiplier = scenario?.demand_multiplier ?? 1.0;
    const costShock = scenario?.cost_shock ?? 0;
    const costPerUnit = 20 + costShock;

    // Get all teams in this session
    const { data: teams, error: teamsError } = await serviceClient
      .from("teams")
      .select("*")
      .eq("session_id", sessionId);

    if (teamsError || !teams || teams.length === 0) {
      return NextResponse.json({ success: false, error: "No teams found." }, { status: 404 });
    }

    // Get decisions for this round from all teams
    const { data: decisions, error: decisionsError } = await serviceClient
      .from("decisions")
      .select("*")
      .in("team_id", teams.map((t) => t.id))
      .eq("round_number", currentRound);

    if (decisionsError) {
      return NextResponse.json({ success: false, error: "Error fetching decisions." }, { status: 500 });
    }

    // Calculate raw results for each team
    type TeamCalc = {
      teamId: string;
      unitsDemanded: number;
      unitsProduced: number;
      unitsSold: number;
      price: number;
      marketingSpend: number;
    };

    const teamCalculations: TeamCalc[] = teams.map((team) => {
      const decision = decisions?.find((d) => d.team_id === team.id);

      if (!decision) {
        // No decision submitted — sell nothing
        return {
          teamId: team.id,
          unitsDemanded: 0,
          unitsProduced: 0,
          unitsSold: 0,
          price: FAIR_PRICE,
          marketingSpend: 0,
        };
      }

      const demanded = calculateDemand(decision.price, decision.marketing_spend, demandMultiplier);
      const unitsSold = Math.min(decision.units_produced, demanded);

      return {
        teamId: team.id,
        unitsDemanded: demanded,
        unitsProduced: decision.units_produced,
        unitsSold,
        price: decision.price,
        marketingSpend: decision.marketing_spend,
      };
    });

    // Total units sold across all teams (for market share)
    const totalUnitsSold = teamCalculations.reduce((sum, t) => sum + t.unitsSold, 0);

    // Get previous cumulative profits
    const { data: prevResults } = await serviceClient
      .from("round_results")
      .select("team_id, cumulative_profit")
      .in("team_id", teams.map((t) => t.id))
      .eq("round_number", currentRound - 1);

    const prevCumulativeMap: Record<string, number> = {};
    (prevResults ?? []).forEach((r) => {
      prevCumulativeMap[r.team_id] = r.cumulative_profit;
    });

    // Build final results
    const results = teamCalculations.map((calc) => {
      const revenue = calc.unitsSold * calc.price;
      const totalCosts = calc.unitsProduced * costPerUnit + calc.marketingSpend;
      const profit = revenue - totalCosts;
      const marketShare = totalUnitsSold > 0 ? calc.unitsSold / totalUnitsSold : 0;
      const prevCumulative = prevCumulativeMap[calc.teamId] ?? 0;
      const cumulativeProfit = prevCumulative + profit;

      return {
        team_id: calc.teamId,
        round_number: currentRound,
        units_sold: Math.round(calc.unitsSold * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        costs: Math.round(totalCosts * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        market_share: Math.round(marketShare * 10000) / 10000,
        cumulative_profit: Math.round(cumulativeProfit * 100) / 100,
      };
    });

    // Delete existing results for this round (idempotent)
    await serviceClient
      .from("round_results")
      .delete()
      .in("team_id", teams.map((t) => t.id))
      .eq("round_number", currentRound);

    // Insert new results
    const { error: insertError } = await serviceClient
      .from("round_results")
      .insert(results);

    if (insertError) {
      console.error("Insert results error:", insertError);
      return NextResponse.json({ success: false, error: "Failed to save results." }, { status: 500 });
    }

    // Close submissions and advance round
    await serviceClient
      .from("sessions")
      .update({
        submissions_open: false,
        current_round: currentRound + 1,
      })
      .eq("id", sessionId);

    // Attach team names to results for response
    const teamNameMap: Record<string, string> = {};
    teams.forEach((t) => {
      teamNameMap[t.id] = t.name;
    });

    const enrichedResults = results.map((r) => ({
      ...r,
      team_name: teamNameMap[r.team_id] ?? "Unknown",
    }));

    return NextResponse.json({
      success: true,
      round: currentRound,
      results: enrichedResults,
    });
  } catch (err) {
    console.error("Calculate results error:", err);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
