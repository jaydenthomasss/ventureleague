"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  TrendingUp,
  User,
  GraduationCap,
  BookOpen,
  Loader2,
  AlertCircle,
  ArrowRight,
  Check,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "student" | "teacher";
type Step = 1 | 2;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setUserEmail(user.email ?? "");
      setCheckingAuth(false);
    }
    checkAuth();
  }, [router, supabase]);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!role) {
      setError("Please select a role.");
      return;
    }
    if (role === "student" && !roomCode.trim()) {
      setError("Please enter your teacher's room code.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          roomCode: role === "student" ? roomCode.trim().toUpperCase() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      toast({
        title: "Welcome to VentureLeague!",
        description: `You're set up as a ${role}. Let's get started.`,
        variant: "default",
      });

      router.push(data.redirectTo);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8A045]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#E8A045] flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#0a0a0a]" />
            </div>
            <span className="text-xl font-bold text-white">VentureLeague</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Set up your profile</h1>
          <p className="text-gray-400 mt-2 text-sm">{userEmail}</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3">
          <div className={cn(
            "flex items-center gap-2 text-sm font-medium",
            step >= 1 ? "text-[#E8A045]" : "text-gray-500"
          )}>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border",
              step > 1
                ? "bg-[#E8A045] border-[#E8A045] text-[#0a0a0a]"
                : step === 1
                ? "border-[#E8A045] text-[#E8A045]"
                : "border-gray-600 text-gray-500"
            )}>
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
            </div>
            Your name
          </div>
          <div className="w-8 h-px bg-[#2a2a2a]" />
          <div className={cn(
            "flex items-center gap-2 text-sm font-medium",
            step >= 2 ? "text-[#E8A045]" : "text-gray-500"
          )}>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border",
              step === 2
                ? "border-[#E8A045] text-[#E8A045]"
                : "border-gray-600 text-gray-500"
            )}>
              2
            </div>
            Your role
          </div>
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-6 animate-fade-in">
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#E8A045]/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#E8A045]" />
                </div>
                <div>
                  <p className="text-white font-semibold">What&apos;s your name?</p>
                  <p className="text-gray-500 text-xs">This will be shown on the leaderboard</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="name"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg">
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-6 animate-fade-in">
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-6 space-y-5">
              <div>
                <p className="text-white font-semibold">What&apos;s your role?</p>
                <p className="text-gray-500 text-xs mt-1">Choose carefully — this cannot be changed</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setRole("student"); setError(""); }}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all duration-200 cursor-pointer",
                    role === "student"
                      ? "border-[#E8A045] bg-[#E8A045]/5"
                      : "border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#1a1a1a]"
                  )}
                >
                  <GraduationCap className={cn("w-6 h-6 mb-2", role === "student" ? "text-[#E8A045]" : "text-gray-400")} />
                  <p className={cn("font-semibold text-sm", role === "student" ? "text-[#E8A045]" : "text-white")}>Student</p>
                  <p className="text-gray-500 text-xs mt-0.5">Join with a room code</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setRole("teacher"); setError(""); }}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all duration-200 cursor-pointer",
                    role === "teacher"
                      ? "border-[#4A9EFF] bg-[#4A9EFF]/5"
                      : "border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#1a1a1a]"
                  )}
                >
                  <BookOpen className={cn("w-6 h-6 mb-2", role === "teacher" ? "text-[#4A9EFF]" : "text-gray-400")} />
                  <p className={cn("font-semibold text-sm", role === "teacher" ? "text-[#4A9EFF]" : "text-white")}>Teacher</p>
                  <p className="text-gray-500 text-xs mt-0.5">Manage sessions &amp; rounds</p>
                </button>
              </div>

              {/* Student: enter room code */}
              {role === "student" && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="roomCode" className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#E8A045]" />
                    Room code
                  </Label>
                  <Input
                    id="roomCode"
                    type="text"
                    placeholder="e.g. K3M9XP"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    required
                    maxLength={10}
                    className="uppercase tracking-widest font-mono text-center text-lg"
                    autoFocus
                  />
                  <p className="text-gray-500 text-xs">Your teacher will display this code at the start of class</p>
                </div>
              )}

              {/* Teacher: no code needed */}
              {role === "teacher" && (
                <div className="rounded-lg bg-[#4A9EFF]/5 border border-[#4A9EFF]/20 p-3 animate-fade-in">
                  <p className="text-[#4A9EFF] text-sm font-medium">You&apos;re signing up as a teacher</p>
                  <p className="text-gray-400 text-xs mt-1">
                    After setup you&apos;ll create a session and get a unique room code to share with your students.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => { setStep(1); setError(""); }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={loading || !role}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Let&apos;s Go
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
