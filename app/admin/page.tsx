import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminClient from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userData || !userData.name) {
    redirect("/onboarding");
  }

  if (userData.role !== "teacher") {
    redirect("/dashboard");
  }

  // Get all sessions created by this teacher
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("created_by", user.id)
    .order("current_round", { ascending: false });

  // Get active session (first active one)
  const activeSession = sessions?.find((s) => s.status === "active") ?? sessions?.[0] ?? null;

  let teams: Array<{ id: string; name: string; join_code: string; cash_balance: number; session_id: string; member_count?: number }> = [];
  let scenarios: Array<{ id: string; session_id: string; round_number: number; description: string; demand_multiplier: number; cost_shock: number }> = [];
  let allDecisions: Array<{ id: string; team_id: string; round_number: number; price: number; marketing_spend: number; units_produced: number; submitted_at: string }> = [];
  let allResults: Array<{ id: string; team_id: string; round_number: number; units_sold: number; revenue: number; costs: number; profit: number; market_share: number; cumulative_profit: number }> = [];
  let allPitches: Array<{ id: string; team_id: string; round_number: number; pitch_text: string; submitted_at: string }> = [];

  if (activeSession) {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("*")
      .eq("session_id", activeSession.id);

    teams = teamsData ?? [];

    if (teams.length > 0) {
      const teamIds = teams.map((t) => t.id);

      const [scenariosRes, decisionsRes, resultsRes, pitchesRes] = await Promise.all([
        supabase.from("scenarios").select("*").eq("session_id", activeSession.id).order("round_number"),
        supabase.from("decisions").select("*").in("team_id", teamIds).order("round_number"),
        supabase.from("round_results").select("*").in("team_id", teamIds).order("round_number"),
        supabase.from("pitches").select("*").in("team_id", teamIds).order("round_number"),
      ]);

      scenarios = scenariosRes.data ?? [];
      allDecisions = decisionsRes.data ?? [];
      allResults = resultsRes.data ?? [];
      allPitches = pitchesRes.data ?? [];

      // Count members per team
      const { data: members } = await supabase
        .from("users")
        .select("team_id")
        .in("team_id", teamIds);

      const memberCountMap: Record<string, number> = {};
      (members ?? []).forEach((m) => {
        if (m.team_id) {
          memberCountMap[m.team_id] = (memberCountMap[m.team_id] ?? 0) + 1;
        }
      });

      teams = teams.map((t) => ({
        ...t,
        member_count: memberCountMap[t.id] ?? 0,
      }));
    }
  }

  return (
    <AdminClient
      teacher={{ id: user.id, name: userData.name, email: user.email ?? "" }}
      sessions={sessions ?? []}
      activeSession={activeSession}
      teams={teams}
      scenarios={scenarios}
      allDecisions={allDecisions}
      allResults={allResults}
      allPitches={allPitches}
    />
  );
}
