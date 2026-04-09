"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  TrendingUp,
  Plus,
  Play,
  Square,
  Calculator,
  Download,
  Users,
  ChevronDown,
  ChevronUp,
  LogOut,
  Loader2,
  Copy,
  Check,
  Trophy,
  BarChart2,
  Settings,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { Session, Scenario, Decision, RoundResult, Pitch } from "@/lib/types";

interface AdminClientProps {
  teacher: { id: string; name: string; email: string };
  sessions: Session[];
  activeSession: Session | null;
  teams: Array<{ id: string; name: string; join_code: string; cash_balance: number; session_id: string; member_count?: number }>;
  scenarios: Scenario[];
  allDecisions: Decision[];
  allResults: RoundResult[];
  allPitches: Pitch[];
}

export default function AdminClient({
  teacher,
  sessions: _sessions,
  activeSession: initialSession,
  teams: initialTeams,
  scenarios: initialScenarios,
  allDecisions,
  allResults,
  allPitches,
}: AdminClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeSession, setActiveSession] = useState(initialSession);
  const [teams, setTeams] = useState(initialTeams);
  const [scenarios, setScenarios] = useState(initialScenarios);

  // Modal states
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createScenarioOpen, setCreateScenarioOpen] = useState(false);
  const [calculateOpen, setCalculateOpen] = useState(false);

  // Form states
  const [sessionName, setSessionName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamJoinCode, setTeamJoinCode] = useState("");
  const [scenarioDesc, setScenarioDesc] = useState("");
  const [scenarioDemand, setScenarioDemand] = useState("1.0");
  const [scenarioCost, setScenarioCost] = useState("0");

  // Loading states
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [togglingSubmissions, setTogglingSubmissions] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedPitchRound, setExpandedPitchRound] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Team creation loading
  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        name: sessionName,
        created_by: teacher.id,
        status: "active",
        current_round: 1,
        submissions_open: false,
      })
      .select()
      .single();

    setLoading(false);
    if (error || !data) {
      toast({ title: "Error creating session", description: error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Session created!", variant: "default" });
    setCreateSessionOpen(false);
    setSessionName("");
    router.refresh();
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSession) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: teamName,
        join_code: teamJoinCode.toUpperCase(),
        session_id: activeSession.id,
        cash_balance: 10000,
      })
      .select()
      .single();

    setLoading(false);
    if (error || !data) {
      toast({ title: "Error creating team", description: error?.message ?? "Join code may already be taken.", variant: "destructive" });
      return;
    }
    toast({ title: `Team "${teamName}" created!`, variant: "default" });
    setTeams([...teams, { ...data, member_count: 0 }]);
    setCreateTeamOpen(false);
    setTeamName("");
    setTeamJoinCode("");
  }

  async function handleCreateScenario(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSession) return;
    setLoading(true);

    const { error } = await supabase.from("scenarios").upsert({
      session_id: activeSession.id,
      round_number: activeSession.current_round,
      description: scenarioDesc,
      demand_multiplier: parseFloat(scenarioDemand),
      cost_shock: parseFloat(scenarioCost),
    }, { onConflict: "session_id,round_number" });

    setLoading(false);
    if (error) {
      toast({ title: "Error saving scenario", description: error.message, variant: "destructive" });
      return;
    }

    setScenarios(prev => {
      const filtered = prev.filter(s => !(s.session_id === activeSession.id && s.round_number === activeSession.current_round));
      return [...filtered, {
        id: "",
        session_id: activeSession.id,
        round_number: activeSession.current_round,
        description: scenarioDesc,
        demand_multiplier: parseFloat(scenarioDemand),
        cost_shock: parseFloat(scenarioCost),
      }];
    });

    toast({ title: "Scenario set for round " + activeSession.current_round, variant: "default" });
    setCreateScenarioOpen(false);
    setScenarioDesc("");
    setScenarioDemand("1.0");
    setScenarioCost("0");
  }

  async function handleToggleSubmissions() {
    if (!activeSession) return;
    setTogglingSubmissions(true);

    const { error } = await supabase
      .from("sessions")
      .update({ submissions_open: !activeSession.submissions_open })
      .eq("id", activeSession.id);

    setTogglingSubmissions(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    const newOpen = !activeSession.submissions_open;
    setActiveSession({ ...activeSession, submissions_open: newOpen });
    toast({
      title: newOpen ? "Submissions opened!" : "Submissions closed",
      description: newOpen
        ? "Students can now submit their decisions."
        : "No more submissions accepted for this round.",
      variant: newOpen ? "success" : "default",
    });
  }

  async function handleCalculateResults() {
    if (!activeSession) return;
    setCalculating(true);

    const res = await fetch("/api/calculate-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSession.id }),
    });

    const data = await res.json();
    setCalculating(false);
    setCalculateOpen(false);

    if (!data.success) {
      toast({ title: "Calculation failed", description: data.error, variant: "destructive" });
      return;
    }

    toast({
      title: `Round ${data.round} results calculated!`,
      description: `Results for ${data.results?.length ?? 0} teams are now available.`,
      variant: "success",
    });

    router.refresh();
  }

  async function handleExportCSV() {
    if (!activeSession) return;
    window.open(`/api/export-csv?sessionId=${activeSession.id}`, "_blank");
  }

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function generateJoinCode(name: string): string {
    const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    const num = Math.floor(Math.random() * 90 + 10);
    return `${clean}${num}`;
  }

  // Organize results by round
  const rounds = Array.from(new Set(allResults.map((r) => r.round_number))).sort((a, b) => a - b);
  const teamMap: Record<string, string> = {};
  teams.forEach((t) => { teamMap[t.id] = t.name; });

  const currentScenario = scenarios.find(s => s.round_number === activeSession?.current_round);
  const submittedDecisions = allDecisions.filter(d => d.round_number === activeSession?.current_round);
  const submissionCount = submittedDecisions.length;

  // Pitch rounds
  const pitchRounds = Array.from(new Set(allPitches.map(p => p.round_number))).sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] bg-[#0a0a0a] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-[#E8A045] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#0a0a0a]" />
              </div>
              <span className="font-bold text-white">VentureLeague</span>
            </div>
            <Badge variant="secondary" className="text-xs">Admin</Badge>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-gray-400 text-sm hidden sm:block">{teacher.name}</p>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4 text-gray-400" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-[#1a1a1a] grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="pitches">Pitches</TabsTrigger>
          </TabsList>

          {/* ======= OVERVIEW TAB ======= */}
          <TabsContent value="overview" className="space-y-6">
            {/* Session management */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-xl">
                  {activeSession ? activeSession.name : "No active session"}
                </h2>
                {activeSession && (
                  <p className="text-gray-400 text-sm">
                    Round {activeSession.current_round} &bull; {teams.length} teams
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!activeSession && (
                  <Button onClick={() => setCreateSessionOpen(true)}>
                    <Plus className="w-4 h-4" />
                    New Session
                  </Button>
                )}
                {activeSession && (
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>

            {!activeSession ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mx-auto">
                  <Settings className="w-7 h-7 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">No session yet</h3>
                  <p className="text-gray-500 text-sm mt-1">Create a session to get started</p>
                </div>
                <Button onClick={() => setCreateSessionOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create Session
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Round control */}
                <Card>
                  <CardHeader>
                    <CardTitle>Round Control</CardTitle>
                    <CardDescription>Manage the current round</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[#1a1a1a] rounded-lg">
                        <p className="text-gray-500 text-xs">Current Round</p>
                        <p className="text-white mono font-bold text-2xl mt-1">{activeSession.current_round}</p>
                      </div>
                      <div className="p-3 bg-[#1a1a1a] rounded-lg">
                        <p className="text-gray-500 text-xs">Submissions</p>
                        <p className={cn("mono font-bold text-lg mt-1", activeSession.submissions_open ? "text-green-400" : "text-gray-400")}>
                          {submissionCount}/{teams.length}
                        </p>
                      </div>
                    </div>

                    {/* Current scenario */}
                    {currentScenario ? (
                      <div className="p-3 bg-[#E8A045]/5 border border-[#E8A045]/20 rounded-lg">
                        <p className="text-[#E8A045] text-xs font-semibold mb-1">Current Scenario</p>
                        <p className="text-white text-sm">{currentScenario.description}</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-center">
                        <p className="text-gray-500 text-sm">No scenario set for round {activeSession.current_round}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setCreateScenarioOpen(true)}
                      >
                        <Settings className="w-4 h-4" />
                        {currentScenario ? "Edit Scenario" : "Set Scenario"}
                      </Button>

                      <Button
                        className={cn("w-full", activeSession.submissions_open ? "bg-red-500 hover:bg-red-600 text-white" : "")}
                        variant={activeSession.submissions_open ? "destructive" : "default"}
                        onClick={handleToggleSubmissions}
                        disabled={togglingSubmissions}
                      >
                        {togglingSubmissions ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : activeSession.submissions_open ? (
                          <><Square className="w-4 h-4" /> Close Submissions</>
                        ) : (
                          <><Play className="w-4 h-4" /> Open Submissions</>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full border-[#E8A045]/30 text-[#E8A045] hover:bg-[#E8A045]/5"
                        onClick={() => setCalculateOpen(true)}
                        disabled={activeSession.submissions_open}
                      >
                        <Calculator className="w-4 h-4" />
                        Calculate Results
                      </Button>
                    </div>

                    {activeSession.submissions_open && (
                      <p className="text-center text-gray-500 text-xs">
                        Close submissions before calculating results
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Submission status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Status</CardTitle>
                    <CardDescription>Round {activeSession.current_round} submissions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {teams.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No teams yet</p>
                    ) : (
                      teams.map((team) => {
                        const submitted = submittedDecisions.some(d => d.team_id === team.id);
                        return (
                          <div key={team.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-2 rounded-full", submitted ? "bg-green-400" : "bg-gray-600")} />
                              <div>
                                <p className="text-white text-sm font-medium">{team.name}</p>
                                <p className="text-gray-500 text-xs">{team.member_count ?? 0} members &bull; {team.join_code}</p>
                              </div>
                            </div>
                            <Badge variant={submitted ? "success" : "muted"} className="text-xs">
                              {submitted ? "Submitted" : "Pending"}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Leaderboard summary */}
                {allResults.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <CardTitle>Current Standings</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#1f1f1f]">
                              <th className="text-left py-2 text-gray-500 font-medium">Rank</th>
                              <th className="text-left py-2 text-gray-500 font-medium">Team</th>
                              {rounds.map(r => (
                                <th key={r} className="text-right py-2 text-gray-500 font-medium">R{r} Profit</th>
                              ))}
                              <th className="text-right py-2 text-gray-500 font-medium">Cumulative</th>
                              <th className="text-right py-2 text-gray-500 font-medium">Market Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const lastRound = Math.max(...rounds);
                              const lastResults = allResults.filter(r => r.round_number === lastRound);
                              const sorted = [...lastResults].sort((a, b) => b.cumulative_profit - a.cumulative_profit);
                              return sorted.map((result, idx) => {
                                const teamName = teamMap[result.team_id] ?? result.team_id;
                                return (
                                  <tr key={result.team_id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1a1a1a]">
                                    <td className="py-3">
                                      <span className={cn("w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold",
                                        idx === 0 ? "bg-yellow-400/20 text-yellow-400" :
                                        idx === 1 ? "bg-gray-400/20 text-gray-300" :
                                        "bg-[#2a2a2a] text-gray-500"
                                      )}>{idx + 1}</span>
                                    </td>
                                    <td className="py-3 text-white font-medium">{teamName}</td>
                                    {rounds.map(r => {
                                      const rResult = allResults.find(x => x.team_id === result.team_id && x.round_number === r);
                                      return (
                                        <td key={r} className={cn("py-3 text-right mono", rResult && rResult.profit >= 0 ? "text-green-400" : "text-red-400")}>
                                          {rResult ? formatCurrency(rResult.profit) : "—"}
                                        </td>
                                      );
                                    })}
                                    <td className={cn("py-3 text-right mono font-semibold", result.cumulative_profit >= 0 ? "text-[#E8A045]" : "text-red-400")}>
                                      {formatCurrency(result.cumulative_profit)}
                                    </td>
                                    <td className="py-3 text-right mono text-[#4A9EFF]">
                                      {(result.market_share * 100).toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ======= TEAMS TAB ======= */}
          <TabsContent value="teams" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-xl">Teams</h2>
              {activeSession && (
                <Button onClick={() => setCreateTeamOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add Team
                </Button>
              )}
            </div>

            {!activeSession ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Create a session first to add teams.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Card key={team.id}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-white font-semibold">{team.name}</h3>
                          <p className="text-gray-500 text-xs mt-0.5">{team.member_count ?? 0} members</p>
                        </div>
                        <Badge variant="muted">{team.join_code}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                        <div>
                          <p className="text-gray-500 text-xs">Join Code</p>
                          <p className="text-white mono font-bold tracking-widest">{team.join_code}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => copyCode(team.join_code)}
                        >
                          {copiedCode === team.join_code
                            ? <Check className="w-4 h-4 text-green-400" />
                            : <Copy className="w-4 h-4 text-gray-400" />
                          }
                        </Button>
                      </div>
                      <div className="mt-3 flex justify-between text-xs">
                        <span className="text-gray-500">Cash balance</span>
                        <span className="text-[#E8A045] mono font-semibold">{formatCurrency(team.cash_balance)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {teams.length === 0 && (
                  <div className="col-span-full text-center py-12 space-y-3">
                    <Users className="w-10 h-10 text-gray-600 mx-auto" />
                    <p className="text-gray-500">No teams yet. Add your first team.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ======= RESULTS TAB ======= */}
          <TabsContent value="results" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-xl">Round Results</h2>
              {activeSession && allResults.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              )}
            </div>

            {allResults.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <BarChart2 className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-gray-500">No results calculated yet.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {rounds.map((round) => {
                  const roundResults = allResults.filter(r => r.round_number === round);
                  const roundDecisions = allDecisions.filter(d => d.round_number === round);
                  const sorted = [...roundResults].sort((a, b) => b.cumulative_profit - a.cumulative_profit);

                  return (
                    <div key={round}>
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-white font-semibold">Round {round}</h3>
                        <Separator className="flex-1" />
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-[#1f1f1f]">
                        <table className="w-full text-sm">
                          <thead className="bg-[#1a1a1a]">
                            <tr>
                              {["Team", "Price", "Marketing", "Produced", "Sold", "Revenue", "Costs", "Profit", "Market Share", "Cumulative"].map(h => (
                                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map((result) => {
                              const decision = roundDecisions.find(d => d.team_id === result.team_id);
                              return (
                                <tr key={result.team_id} className="border-t border-[#1f1f1f] hover:bg-[#1a1a1a]">
                                  <td className="px-4 py-3 text-white font-medium">{teamMap[result.team_id] ?? "?"}</td>
                                  <td className="px-4 py-3 mono text-gray-300">{decision ? formatCurrency(decision.price) : "—"}</td>
                                  <td className="px-4 py-3 mono text-gray-300">{decision ? formatCurrency(decision.marketing_spend) : "—"}</td>
                                  <td className="px-4 py-3 mono text-gray-300">{decision ? decision.units_produced : "—"}</td>
                                  <td className="px-4 py-3 mono text-white">{Math.round(result.units_sold)}</td>
                                  <td className="px-4 py-3 mono text-green-400">{formatCurrency(result.revenue)}</td>
                                  <td className="px-4 py-3 mono text-red-400">{formatCurrency(result.costs)}</td>
                                  <td className={cn("px-4 py-3 mono font-semibold", result.profit >= 0 ? "text-green-400" : "text-red-400")}>
                                    {formatCurrency(result.profit)}
                                  </td>
                                  <td className="px-4 py-3 mono text-[#4A9EFF]">{(result.market_share * 100).toFixed(1)}%</td>
                                  <td className={cn("px-4 py-3 mono font-bold", result.cumulative_profit >= 0 ? "text-[#E8A045]" : "text-red-400")}>
                                    {formatCurrency(result.cumulative_profit)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ======= PITCHES TAB ======= */}
          <TabsContent value="pitches" className="space-y-4">
            <h2 className="text-white font-bold text-xl">Team Pitches</h2>

            {allPitches.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FileText className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-gray-500">No pitches submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pitchRounds.map((round) => {
                  const roundPitches = allPitches.filter(p => p.round_number === round);
                  const isExpanded = expandedPitchRound === round;

                  return (
                    <Card key={round}>
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedPitchRound(isExpanded ? null : round)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Round {round} Pitches</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="muted">{roundPitches.length} submitted</Badge>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                          </div>
                        </CardHeader>
                      </button>

                      {isExpanded && (
                        <CardContent className="pt-0 space-y-3">
                          {roundPitches.map((pitch) => (
                            <div key={pitch.id} className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                              <p className="text-[#E8A045] text-xs font-semibold mb-2">{teamMap[pitch.team_id] ?? pitch.team_id}</p>
                              <p className="text-gray-300 text-sm leading-relaxed">{pitch.pitch_text}</p>
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ======= MODALS ======= */}

      {/* Create Session */}
      <Dialog open={createSessionOpen} onOpenChange={setCreateSessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
            <DialogDescription>Set up a new game session for your class.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSession} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="session-name">Session name</Label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. Spring 2025 — Period 3"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateSessionOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Team */}
      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team</DialogTitle>
            <DialogDescription>Create a new team and set their join code.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  if (!teamJoinCode) setTeamJoinCode(generateJoinCode(e.target.value));
                }}
                placeholder="e.g. Alpha"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-code">Join code</Label>
              <Input
                id="team-code"
                value={teamJoinCode}
                onChange={(e) => setTeamJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ALPHA01"
                required
                maxLength={20}
                className="uppercase tracking-widest"
              />
              <p className="text-gray-500 text-xs">Share this with students to join this team.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Set Scenario */}
      <Dialog open={createScenarioOpen} onOpenChange={setCreateScenarioOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Round {activeSession?.current_round} Scenario</DialogTitle>
            <DialogDescription>Describe the market conditions students will face this round.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateScenario} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="scenario-desc">Scenario description</Label>
              <textarea
                id="scenario-desc"
                value={scenarioDesc}
                onChange={(e) => setScenarioDesc(e.target.value)}
                placeholder="e.g. A viral social media post has boosted interest in your product category. Consumer sentiment is high."
                rows={4}
                required
                className="w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#E8A045] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demand-mult">Demand multiplier</Label>
                <Input
                  id="demand-mult"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  value={scenarioDemand}
                  onChange={(e) => setScenarioDemand(e.target.value)}
                />
                <p className="text-gray-500 text-xs">1.0 = normal, 1.5 = +50% demand</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost-shock">Cost shock ($/unit)</Label>
                <Input
                  id="cost-shock"
                  type="number"
                  step="1"
                  value={scenarioCost}
                  onChange={(e) => setScenarioCost(e.target.value)}
                />
                <p className="text-gray-500 text-xs">Base cost is $20. Positive = higher costs.</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateScenarioOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Scenario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Calculate Results Confirmation */}
      <Dialog open={calculateOpen} onOpenChange={setCalculateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#E8A045]" />
              Calculate Round {activeSession?.current_round} Results?
            </DialogTitle>
            <DialogDescription>
              This will run the simulation for all teams using their current decisions, store results, and advance to round {(activeSession?.current_round ?? 0) + 1}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="p-4 bg-[#1a1a1a] rounded-lg space-y-1">
              <p className="text-sm text-gray-400"><span className="text-white font-medium">{submissionCount}</span> of <span className="text-white font-medium">{teams.length}</span> teams have submitted</p>
              {submissionCount < teams.length && (
                <p className="text-yellow-400 text-xs">Teams without submissions will receive $0 revenue this round.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalculateOpen(false)} disabled={calculating}>Cancel</Button>
            <Button onClick={handleCalculateResults} disabled={calculating}>
              {calculating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
              ) : (
                <><Calculator className="w-4 h-4" /> Run Simulation</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
