"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, RefreshCw } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { RoundResult } from "@/lib/types";

interface LeaderboardEntry {
  team_id: string;
  team_name: string;
  cumulative_profit: number;
  market_share: number;
  last_round_profit: number;
  round_number: number;
  rank: number;
  prev_rank?: number;
}

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function LeaderboardPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sessionName, setSessionName] = useState<string>("");
  const [currentRound, setCurrentRound] = useState<number>(1);
  const prevRanksRef = useRef<Record<string, number>>({});
  const [rankChanges, setRankChanges] = useState<Record<string, "up" | "down" | "same">>({});

  const fetchLeaderboard = useCallback(async () => {
    // Get the most recent active session
    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "active")
      .order("current_round", { ascending: false })
      .limit(1);

    const session = sessions?.[0];
    if (!session) {
      setLoading(false);
      return;
    }

    setSessionName(session.name);
    setCurrentRound(session.current_round);

    // Get teams
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .eq("session_id", session.id);

    if (!teams || teams.length === 0) {
      setLoading(false);
      return;
    }

    const teamIds = teams.map((t) => t.id);
    const teamMap: Record<string, string> = {};
    teams.forEach((t) => { teamMap[t.id] = t.name; });

    // Get latest round number with results
    const { data: allResults } = await supabase
      .from("round_results")
      .select("*")
      .in("team_id", teamIds)
      .order("round_number", { ascending: false });

    if (!allResults || allResults.length === 0) {
      setLoading(false);
      return;
    }

    const latestRound = allResults[0].round_number;
    const latestResults = allResults.filter((r: RoundResult) => r.round_number === latestRound);

    // Also get previous round for last_round_profit if needed
    const sorted = [...latestResults].sort((a: RoundResult, b: RoundResult) => b.cumulative_profit - a.cumulative_profit);

    const newEntries: LeaderboardEntry[] = sorted.map((result: RoundResult, idx: number) => ({
      team_id: result.team_id,
      team_name: teamMap[result.team_id] ?? "Unknown",
      cumulative_profit: result.cumulative_profit,
      market_share: result.market_share,
      last_round_profit: result.profit,
      round_number: result.round_number,
      rank: idx + 1,
    }));

    // Calculate rank changes
    const newRankChanges: Record<string, "up" | "down" | "same"> = {};
    newEntries.forEach((entry) => {
      const prev = prevRanksRef.current[entry.team_id];
      if (prev === undefined) {
        newRankChanges[entry.team_id] = "same";
      } else if (entry.rank < prev) {
        newRankChanges[entry.team_id] = "up";
      } else if (entry.rank > prev) {
        newRankChanges[entry.team_id] = "down";
      } else {
        newRankChanges[entry.team_id] = "same";
      }
    });

    // Update previous ranks
    const newPrevRanks: Record<string, number> = {};
    newEntries.forEach((e) => { newPrevRanks[e.team_id] = e.rank; });
    prevRanksRef.current = newPrevRanks;

    setRankChanges(newRankChanges);
    setEntries(newEntries);
    setLastUpdated(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLeaderboard();

    // Polling fallback every 30 seconds
    const interval = setInterval(fetchLeaderboard, REFRESH_INTERVAL);

    // Realtime subscription
    const channel = supabase
      .channel("leaderboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "round_results",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard, supabase]);

  // Clear rank change animations after 3s
  useEffect(() => {
    if (Object.values(rankChanges).some((v) => v !== "same")) {
      const t = setTimeout(() => {
        setRankChanges((prev) => {
          const reset: Record<string, "up" | "down" | "same"> = {};
          Object.keys(prev).forEach((k) => { reset[k] = "same"; });
          return reset;
        });
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [rankChanges]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#E8A045] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#0a0a0a]" />
            </div>
            <div>
              <span className="font-bold text-white">VentureLeague</span>
              {sessionName && <span className="text-gray-500 text-sm ml-2">{sessionName}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentRound > 1 && (
              <Badge variant="secondary" className="text-xs">
                After Round {currentRound - 1}
              </Badge>
            )}
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                <RefreshCw className="w-3 h-3" />
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">Live Leaderboard</h1>
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-gray-400">Ranked by cumulative profit &bull; Auto-refreshes every 30 seconds</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-[#111111] border border-[#1f1f1f] animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mx-auto">
              <Trophy className="w-7 h-7 text-gray-500" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">No results yet</h2>
              <p className="text-gray-500 text-sm mt-1">Results will appear after the first round is calculated.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const rankChange = rankChanges[entry.team_id] ?? "same";
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              const isThird = entry.rank === 3;

              return (
                <div
                  key={entry.team_id}
                  className={cn(
                    "relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-500",
                    isFirst
                      ? "border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-transparent"
                      : isSecond
                      ? "border-gray-400/20 bg-gradient-to-r from-gray-400/3 to-transparent"
                      : isThird
                      ? "border-amber-700/20 bg-gradient-to-r from-amber-700/3 to-transparent"
                      : "border-[#1f1f1f] bg-[#111111]",
                    rankChange === "up" && "animate-rank-up",
                    rankChange === "down" && "animate-rank-down"
                  )}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 text-center">
                    {isFirst ? (
                      <div className="text-3xl">🥇</div>
                    ) : isSecond ? (
                      <div className="text-3xl">🥈</div>
                    ) : isThird ? (
                      <div className="text-3xl">🥉</div>
                    ) : (
                      <span className={cn("text-2xl font-bold mono", "text-gray-500")}>
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Team info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={cn(
                        "font-bold text-lg truncate",
                        isFirst ? "text-yellow-300" : isSecond ? "text-gray-200" : isThird ? "text-amber-600" : "text-white"
                      )}>
                        {entry.team_name}
                      </h3>
                      {rankChange === "up" && (
                        <div className="flex items-center gap-0.5 text-green-400 text-xs font-semibold">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {rankChange === "down" && (
                        <div className="flex items-center gap-0.5 text-red-400 text-xs font-semibold">
                          <TrendingDown className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-400">
                      <span>
                        Round profit:{" "}
                        <span className={cn("mono font-semibold", entry.last_round_profit >= 0 ? "text-green-400" : "text-red-400")}>
                          {formatCurrency(entry.last_round_profit)}
                        </span>
                      </span>
                      <span>
                        Market share:{" "}
                        <span className="mono font-semibold text-[#4A9EFF]">
                          {(entry.market_share * 100).toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Cumulative profit */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-gray-500 text-xs mb-0.5">Cumulative</p>
                    <p className={cn(
                      "mono font-bold text-xl",
                      entry.cumulative_profit >= 0 ? "text-[#E8A045]" : "text-red-400"
                    )}>
                      {formatCurrency(entry.cumulative_profit)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-10">
          VentureLeague &bull; Auto-refreshing every {REFRESH_INTERVAL / 1000}s via Supabase Realtime
        </p>
      </main>
    </div>
  );
}
