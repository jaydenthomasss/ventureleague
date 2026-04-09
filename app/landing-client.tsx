"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { TrendingUp, Zap, Trophy, BarChart2, Loader2, AlertCircle } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();

  // Sign In state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState("");

  // Sign Up state
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // Forgot password
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInLoading(true);
    setSignInError("");

    const { error, data } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });

    if (error) {
      setSignInError(error.message);
      setSignInLoading(false);
      return;
    }

    if (!data.user) {
      setSignInError("Login failed. Please try again.");
      setSignInLoading(false);
      return;
    }

    // Check if user has completed onboarding
    const { data: userData } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", data.user.id)
      .single();

    if (!userData || !userData.name) {
      router.push("/onboarding");
    } else if (userData.role === "teacher") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSignUpLoading(true);
    setSignUpError("");

    if (signUpPassword !== signUpConfirm) {
      setSignUpError("Passwords do not match.");
      setSignUpLoading(false);
      return;
    }

    if (signUpPassword.length < 6) {
      setSignUpError("Password must be at least 6 characters.");
      setSignUpLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      setSignUpError(error.message);
      setSignUpLoading(false);
      return;
    }

    setSignUpSuccess(true);
    setSignUpLoading(false);

    // If email confirmation is disabled, redirect immediately
    setTimeout(() => {
      router.push("/onboarding");
    }, 1500);
  }

  async function handleForgotPassword() {
    if (!signInEmail) {
      setSignInError("Enter your email address above, then click Forgot Password.");
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(signInEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      setSignInError(error.message);
    } else {
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for a link to reset your password.",
        variant: "default",
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[#0d0d0d] border-r border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8A045] flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-[#0a0a0a]" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">VentureLeague</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Build your empire.{" "}
              <span className="text-[#E8A045]">Crush the competition.</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              The ultimate business simulation game for high school students. Make real economic decisions, compete with your peers, and master the art of strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              {
                icon: <Zap className="w-5 h-5 text-[#E8A045]" />,
                title: "Real-time competition",
                desc: "Make decisions each round and see results instantly",
              },
              {
                icon: <BarChart2 className="w-5 h-5 text-[#4A9EFF]" />,
                title: "Data-driven insights",
                desc: "Track your performance with live charts and analytics",
              },
              {
                icon: <Trophy className="w-5 h-5 text-yellow-400" />,
                title: "Live leaderboard",
                desc: "Climb the ranks and dominate the market",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 p-4 rounded-lg bg-[#111111] border border-[#1f1f1f]"
              >
                <div className="mt-0.5">{feature.icon}</div>
                <div>
                  <p className="text-white font-medium text-sm">{feature.title}</p>
                  <p className="text-gray-500 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} VentureLeague. Built for the next generation of entrepreneurs.
        </p>
      </div>

      {/* Right side - auth forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="w-9 h-9 rounded-lg bg-[#E8A045] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#0a0a0a]" />
            </div>
            <span className="text-xl font-bold text-white">VentureLeague</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-gray-400 mt-1 text-sm">Sign in to your account or create a new one.</p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#1a1a1a]">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email address</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@school.edu"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotLoading}
                      className="text-xs text-[#E8A045] hover:text-[#d4923a] transition-colors disabled:opacity-50"
                    >
                      {forgotLoading ? "Sending..." : "Forgot password?"}
                    </button>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                {signInError && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{signInError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={signInLoading}
                >
                  {signInLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="mt-6">
              {signUpSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                    <Trophy className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold">Account created!</h3>
                  <p className="text-gray-400 text-sm">
                    Redirecting you to set up your profile...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@school.edu"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Repeat your password"
                      value={signUpConfirm}
                      onChange={(e) => setSignUpConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  {signUpError && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{signUpError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={signUpLoading}
                  >
                    {signUpLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <p className="text-center text-xs text-gray-500">
                    By signing up, you agree to participate in good faith and follow your teacher&apos;s instructions.
                  </p>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
