"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  BarChart2,
  Users,
  Megaphone,
  Package,
  Trophy,
  CheckCircle2,
  Clock,
  LogOut,
  Loader2,
  AlertCircle,
  Send,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { Session, Scenario, Decision, RoundResult, Pitch } from "@/lib/types";

interface DashboardClientProps {
  user: { id: string; name: string; email: string };
  team: { id: string; name: string; cash_balance: number; session_id: string };
  session: Session;
  scenario: Scenario | null;
  currentDecision: Decision | null;
  currentPitch: Pitch | null;
  historicalResults: RoundResult[];
  leaderboard: Array<{
    team_id: string;
    team_name: string;
    cumulative_profit: number;
    market_share: number;
  }>;
}

export default function DashboardClient({
  user,
  team,
  session: initialSession,
  scenario,
  currentDecision: initialDecision,
  currentPitch: initialPitch,
  historicalResults,
  leaderboard: initialLeaderboard,
}: DashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();

  // Session state (can be updated via realtime)
  const [session, setSession] = useState(initialSession);
  const [decision, setDecision] = useState(initialDecision);
  const [pitch, setPitch] = useState(initialPitch);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);

  // Form state
  const [price, setPrice] = useState(initialDecision?.price ?? 50);
  const [marketingSpend, setMarketingSpend] = useState(initialDecision?.marketing_spend ?? 500);
  const [unitsProduced, setUnitsProduced] = useState(initialDecision?.units_produced ?? 250);
  const [pitchText, setPitchText] = useState(initialPitch?.pitch_text ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const refreshLeaderboard = useCallback(async () => {
    const latestRound = session.current_round - 1;
    if (latestRound < 1) return;

    const { data: allTeams } = await supabase
      .from("teams")
      .select("id, name")
      .eq("session_id", team.session_id);

    if (!allTeams) return;

    const { data: results } = await supabase
      .from("round_results")
      .select("*")
      .in("team_id", allTeams.map((t) => t.id))
      .eq("round_number", latestRound)
      .order("cumulative_profit", { ascending: false });

    if (results) {
      setLeaderboard(results.map((r) => ({
        team_id: r.team_id,
        team_name: allTeams.find((t) => t.id === r.team_id)?.name ?? "Unknown",
        cumulative_profit: r.cumulative_profit,
        market_share: r.market_share,
      })));
    }
  }, [session.current_round, supabase, team.session_id]);

  // Realtime subscription for session changes
  useEffect(() => {
    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const newSession = payload.new as Session;
          const oldSession = session;

          setSession(newSession);

          if (!oldSession.submissions_open && newSession.submissions_open) {
            toast({
              title: "Submissions are now open!",
              description: `Round ${newSession.current_round} has begun. Submit your decisions.`,
              variant: "success",
            });
          } else if (oldSession.submissions_open && !newSession.submissions_open) {
            toast({
              title: "Submissions closed",
              description: "The teacher has closed this round. Results will be calculated shortly.",
              variant: "warning",
            });
            refreshLeaderboard();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "round_results",
        },
        () => {
          refreshLeaderboard();
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id, session, supabase, router, refreshLeaderboard]);

  async function handleSubmitDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!session.submissions_open) return;

    setSubmitting(true);
    setSubmitError("");

    const decisionData = {
      team_id: team.id,
      round_number: session.current_round,
      price,
      marketing_spend: marketingSpend,
      units_produced: unitsProduced,
    };

    // Upsert decision
    const { data, error } = await supabase
      .from("decisions")
      .upsert(decisionData, { onConflict: "team_id,round_number" })
      .select()
      .single();

    if (error) {
      setSubmitError("Failed to submit decision. Please try again.");
      setSubmitting(false);
      return;
    }

    setDecision(data);

    // Also save pitch if provided
    if (pitchText.trim()) {
      await supabase.from("pitches").upsert(
        {
          team_id: team.id,
          round_number: session.current_round,
          pitch_text: pitchText.trim(),
        },
        { onConflict: "team_id,round_number" }
      );
      setPitch({ id: "", team_id: team.id, round_number: session.current_round, pitch_text: pitchText, submitted_at: new Date().toISOString() });
    }

    toast({
      title: "Decision submitted!",
      description: "Your strategy has been recorded. You can update it until submissions close.",
      variant: "success",
    });

    setSubmitting(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  // Chart data
  const chartData = historicalResults.map((r) => ({
    round: `R${r.round_number}`,
    profit: r.profit,
    cumulative: r.cumulative_profit,
    market_share: Math.round(r.market_share * 10000) / 100,
  }));

  const latestResult = historicalResults[historicalResults.length - 1];

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
              <span className="font-bold text-white hidden sm:block">VentureLeague</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <p className="text-white font-semibold text-sm">{team.name}</p>
              <p className="text-gray-500 text-xs">{user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-500 text-xs">Round</p>
              <p className="text-white font-bold mono">{session.current_round}</p>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="text-right">
              <p className="text-gray-500 text-xs">Balance</p>
              <p className="text-[#E8A045] font-bold mono text-sm">{formatCurrency(team.cash_balance)}</p>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-gray-400 hover:text-white"
            >
              {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Status banner */}
        <div className={cn(
          "rounded-lg border p-4 flex items-center justify-between",
          session.submissions_open
            ? "bg-green-500/5 border-green-500/20"
            : "bg-[#1a1a1a] border-[#2a2a2a]"
        )}>
          <div className="flex items-center gap-3">
            {session.submissions_open ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <div>
                  <p className="text-green-400 font-semibold text-sm">Submissions Open</p>
                  <p className="text-gray-400 text-xs">Round {session.current_round} — Enter your decisions below</p>
                </div>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-300 font-semibold text-sm">Waiting for teacher</p>
                  <p className="text-gray-500 text-xs">Submissions are currently closed</p>
                </div>
              </>
            )}
          </div>
          <Badge variant={session.submissions_open ? "success" : "muted"}>
            {session.submissions_open ? "Open" : "Closed"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scenario card */}
            {scenario && (
              <Card className="border-[#E8A045]/20 bg-gradient-to-br from-[#111111] to-[#141008]">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#E8A045]" />
                    <CardTitle className="text-sm text-[#E8A045] uppercase tracking-wider">Round {session.current_round} Scenario</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-white text-base leading-relaxed">{scenario.description}</p>
                  <div className="flex gap-4 mt-4">
                    {scenario.demand_multiplier !== 1.0 && (
                      <div className="text-xs">
                        <span className="text-gray-500">Demand: </span>
                        <span className={cn("font-mono font-semibold", scenario.demand_multiplier > 1 ? "text-green-400" : "text-red-400")}>
                          {scenario.demand_multiplier > 1 ? "+" : ""}{((scenario.demand_multiplier - 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {scenario.cost_shock !== 0 && (
                      <div className="text-xs">
                        <span className="text-gray-500">Cost shock: </span>
                        <span className={cn("font-mono font-semibold", scenario.cost_shock < 0 ? "text-green-400" : "text-red-400")}>
                          {scenario.cost_shock > 0 ? "+" : ""}{formatCurrency(scenario.cost_shock)}/unit
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decision form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Round {session.current_round} Decisions</CardTitle>
                    <CardDescription>Set your strategy for this round</CardDescription>
                  </div>
                  {decision && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Submitted
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitDecision} className="space-y-8">
                  {/* Price */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#E8A045]" />
                        <label className="text-white font-medium text-sm">Price per unit</label>
                      </div>
                      <span className="mono text-[#E8A045] font-bold text-lg">{formatCurrency(price)}</span>
                    </div>
                    <Slider
                      min={1}
                      max={200}
                      step={1}
                      value={[price]}
                      onValueChange={([v]) => setPrice(v)}
                      disabled={!session.submissions_open}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>$1</span>
                      <span>Fair price: $50</span>
                      <span>$200</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Marketing Spend */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-[#4A9EFF]" />
                        <label className="text-white font-medium text-sm">Marketing spend</label>
                      </div>
                      <span className="mono text-[#4A9EFF] font-bold text-lg">{formatCurrency(marketingSpend)}</span>
                    </div>
                    <Slider
                      min={0}
                      max={5000}
                      step={100}
                      value={[marketingSpend]}
                      onValueChange={([v]) => setMarketingSpend(v)}
                      disabled={!session.submissions_open}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>$0</span>
                      <span>Boost: +{(marketingSpend / 1000 * 100).toFixed(0)}% demand</span>
                      <span>$5,000</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Units produced */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-400" />
                        <label className="text-white font-medium text-sm">Units to produce</label>
                      </div>
                      <span className="mono text-purple-400 font-bold text-lg">{unitsProduced.toLocaleString()}</span>
                    </div>
                    <Slider
                      min={0}
                      max={1000}
                      step={10}
                      value={[unitsProduced]}
                      onValueChange={([v]) => setUnitsProduced(v)}
                      disabled={!session.submissions_open}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0</span>
                      <span>Cost: {formatCurrency(unitsProduced * 20)}</span>
                      <span>1,000</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Cost estimate */}
                  <div className="p-4 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] space-y-2">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Estimated P&amp;L</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Est. Revenue</p>
                        <p className="text-white mono font-semibold">{formatCurrency(unitsProduced * price * 0.6)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Total Costs</p>
                        <p className="text-white mono font-semibold">{formatCurrency(unitsProduced * 20 + marketingSpend)}</p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs mt-2">* Revenue estimate assumes ~60% sell-through. Actual depends on market.</p>
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-500/10 rounded-md border border-red-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={!session.submissions_open || submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : decision ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Update Decision
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Decision
                      </>
                    )}
                  </Button>

                  {!session.submissions_open && (
                    <p className="text-center text-gray-500 text-xs">
                      Submissions are closed. Wait for your teacher to open the next round.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Pitch & Reflect */}
            <Card>
              <CardHeader>
                <CardTitle>Pitch &amp; Reflect</CardTitle>
                <CardDescription>Explain your strategy in 1-2 sentences. Your teacher will see this.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <textarea
                    value={pitchText}
                    onChange={(e) => setPitchText(e.target.value)}
                    disabled={!session.submissions_open}
                    placeholder="e.g. We set a premium price to maximize margin and invested heavily in marketing to capture demand..."
                    rows={3}
                    maxLength={500}
                    className={cn(
                      "w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-gray-500 resize-none",
                      "focus:outline-none focus:ring-1 focus:ring-[#E8A045] focus:border-[#E8A045] transition-colors",
                      !session.submissions_open && "opacity-60 cursor-not-allowed"
                    )}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-gray-600 text-xs">{pitchText.length}/500 characters</p>
                    {pitch && <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saved</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Stats cards */}
            {latestResult && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4">
                    <p className="text-gray-500 text-xs mb-1">Last Profit</p>
                    <p className={cn("mono font-bold text-lg", latestResult.profit >= 0 ? "text-green-400" : "text-red-400")}>
                      {formatCurrency(latestResult.profit)}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-gray-500 text-xs mb-1">Cumulative</p>
                    <p className={cn("mono font-bold text-lg", latestResult.cumulative_profit >= 0 ? "text-[#E8A045]" : "text-red-400")}>
                      {formatCurrency(latestResult.cumulative_profit)}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-gray-500 text-xs mb-1">Market Share</p>
                    <p className="mono font-bold text-lg text-[#4A9EFF]">
                      {(latestResult.market_share * 100).toFixed(1)}%
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-gray-500 text-xs mb-1">Units Sold</p>
                    <p className="mono font-bold text-lg text-white">
                      {Math.round(latestResult.units_sold).toLocaleString()}
                    </p>
                  </Card>
                </div>

                {/* Market share bar */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-gray-400 text-xs">Your market share</p>
                      <p className="text-[#4A9EFF] mono text-sm font-semibold">
                        {(latestResult.market_share * 100).toFixed(1)}%
                      </p>
                    </div>
                    <Progress value={latestResult.market_share * 100} />
                  </CardContent>
                </Card>
              </>
            )}

            {/* Leaderboard */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <CardTitle className="text-sm">Leaderboard</CardTitle>
                </div>
                <CardDescription className="text-xs">By cumulative profit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No results yet</p>
                ) : (
                  leaderboard.slice(0, 5).map((entry, idx) => (
                    <div
                      key={entry.team_id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-md",
                        entry.team_id === team.id
                          ? "bg-[#E8A045]/5 border border-[#E8A045]/20"
                          : "bg-[#1a1a1a]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          idx === 0 ? "bg-yellow-400/20 text-yellow-400" :
                          idx === 1 ? "bg-gray-400/20 text-gray-300" :
                          idx === 2 ? "bg-amber-700/20 text-amber-600" :
                          "bg-[#2a2a2a] text-gray-500"
                        )}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className={cn("text-sm font-medium", entry.team_id === team.id ? "text-[#E8A045]" : "text-white")}>
                            {entry.team_name}
                          </p>
                          <p className="text-gray-500 text-xs">{(entry.market_share * 100).toFixed(1)}% share</p>
                        </div>
                      </div>
                      <p className={cn("mono font-semibold text-sm", entry.cumulative_profit >= 0 ? "text-green-400" : "text-red-400")}>
                        {formatCurrency(entry.cumulative_profit)}
                      </p>
                    </div>
                  ))
                )}
                {leaderboard.length === 0 && (
                  <p className="text-center text-gray-600 text-xs pt-2">Results appear after each round</p>
                )}
              </CardContent>
            </Card>

            {/* Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#4A9EFF]" />
                    <CardTitle className="text-sm">Performance</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis dataKey="round" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} width={50}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px" }}
                          labelStyle={{ color: "#9ca3af" }}
                          formatter={(value) => [formatCurrency(Number(value)), ""]}
                        />
                        <Line type="monotone" dataKey="profit" stroke="#E8A045" strokeWidth={2} dot={{ r: 3, fill: "#E8A045" }} name="Profit" />
                        <Line type="monotone" dataKey="cumulative" stroke="#4A9EFF" strokeWidth={2} dot={{ r: 3, fill: "#4A9EFF" }} name="Cumulative" strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 mt-2 justify-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-[#E8A045] rounded" />
                      <span className="text-xs text-gray-500">Round profit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-[#4A9EFF] rounded" style={{ borderTop: "2px dashed #4A9EFF", background: "none" }} />
                      <span className="text-xs text-gray-500">Cumulative</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market share chart */}
            {chartData.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <CardTitle className="text-sm">Market Share</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis dataKey="round" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} width={35}
                          tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px" }}
                          formatter={(value) => [`${Number(value).toFixed(1)}%`, "Market share"]}
                        />
                        <Line type="monotone" dataKey="market_share" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: "#a855f7" }} name="Market share" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
