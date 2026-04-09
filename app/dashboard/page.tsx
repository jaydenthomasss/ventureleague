import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  // Get user profile
  const { data: userData } = await supabase
    .from("users")
    .select("id, name, role, team_id")
    .eq("id", user.id)
    .single();

  if (!userData || !userData.name) {
    redirect("/onboarding");
  }

  if (userData.role === "teacher") {
    redirect("/admin");
  }

  // Get team separately
  const team = userData.team_id
    ? (await supabase.from("teams").select("id, name, cash_balance, session_id").eq("id", userData.team_id).single()).data
    : null;

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-white font-semibold text-lg">No team assigned</h2>
          <p className="text-gray-400 text-sm">
            You haven&apos;t been assigned to a team yet. Ask your teacher to add you, or re-do onboarding with a valid join code.
          </p>
        </div>
      </div>
    );
  }

  // Get session
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", team.session_id)
    .single();

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h2 className="text-white font-semibold">Session not found</h2>
          <p className="text-gray-400 text-sm">Your team&apos;s session doesn&apos;t exist or has ended.</p>
        </div>
      </div>
    );
  }

  // Get current round scenario
  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("session_id", session.id)
    .eq("round_number", session.current_round)
    .single();

  // Get current decision (if any)
  const { data: currentDecision } = await supabase
    .from("decisions")
    .select("*")
    .eq("team_id", team.id)
    .eq("round_number", session.current_round)
    .single();

  // Get current pitch (if any)
  const { data: currentPitch } = await supabase
    .from("pitches")
    .select("*")
    .eq("team_id", team.id)
    .eq("round_number", session.current_round)
    .single();

  // Get historical results for this team
  const { data: historicalResults } = await supabase
    .from("round_results")
    .select("*")
    .eq("team_id", team.id)
    .order("round_number", { ascending: true });

  // Get leaderboard (top 5 by cumulative profit, latest round)
  const { data: allTeams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("session_id", team.session_id);

  const latestRound = session.current_round - 1;
  let leaderboard: Array<{
    team_id: string;
    team_name: string;
    cumulative_profit: number;
    market_share: number;
  }> = [];

  if (latestRound >= 1 && allTeams) {
    const { data: latestResults } = await supabase
      .from("round_results")
      .select("*")
      .in("team_id", allTeams.map((t) => t.id))
      .eq("round_number", latestRound)
      .order("cumulative_profit", { ascending: false });

    leaderboard = (latestResults ?? []).map((r) => ({
      team_id: r.team_id,
      team_name: allTeams.find((t) => t.id === r.team_id)?.name ?? "Unknown",
      cumulative_profit: r.cumulative_profit,
      market_share: r.market_share,
    }));
  }

  return (
    <DashboardClient
      user={{ id: user.id, name: userData.name, email: user.email ?? "" }}
      team={team}
      session={session}
      scenario={scenario ?? null}
      currentDecision={currentDecision ?? null}
      currentPitch={currentPitch ?? null}
      historicalResults={historicalResults ?? []}
      leaderboard={leaderboard}
    />
  );
}
