"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"client" | "trainer">("client");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If URL has ?mode=signup, start in signup mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    if (params.get("role") === "trainer") { setMode("signup"); setRole("trainer"); }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don’t match.");
        return;
      }
    }

    setLoading(true);

    if (mode === "signup") {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0], role },
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (authData.user) {
        // Create profile row with chosen role
        await supabase.from("profiles").upsert({
          id: authData.user.id,
          display_name: displayName || email.split("@")[0],
          role,
        }, { onConflict: "id" });
        // Auto-grant beta tester badge for clients only (trainers don't need fitness badges)
        if (role === "client") {
          await supabase.from("user_badges").upsert({
            user_id: authData.user.id,
            badge_key: "beta_tester",
            earned_at: new Date().toISOString(),
          }, { onConflict: "user_id,badge_key" });
        }
      }
      window.location.href = role === "trainer" ? "/trainer" : "/onboarding";
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const { data: { user: loginUser } } = await supabase.auth.getUser();
      if (loginUser) {
        await supabase.from("profiles").upsert({
          id: loginUser.id,
          display_name: loginUser.user_metadata?.display_name || loginUser.email?.split("@")[0] || "user",
        }, { onConflict: "id", ignoreDuplicates: true });
        // Read back role to redirect
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", loginUser.id)
          .maybeSingle();
        window.location.href = prof?.role === "trainer" ? "/trainer" : "/dashboard";
        return;
      }
      window.location.href = "/dashboard";
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-300 text-sm mb-6"
        >
          ← Back to home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-amber-500 mb-0.5">GRIT<span className="text-neutral-400">ZONE</span></h1>
          <div className="inline-block bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-2 mb-1">
            Beta — Early Access
          </div>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.35em] mt-1">Your discipline zone</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">I&apos;m signing up as</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("client")}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all ${role === "client" ? "bg-amber-500 border-amber-500 text-black" : "bg-neutral-900 border-neutral-800 text-neutral-300"}`}
                >
                  <div className="text-base mb-0.5">💪</div>
                  Client
                  <p className={`text-[10px] font-normal mt-0.5 ${role === "client" ? "text-black/70" : "text-neutral-500"}`}>Track my fitness</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("trainer")}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all ${role === "trainer" ? "bg-amber-500 border-amber-500 text-black" : "bg-neutral-900 border-neutral-800 text-neutral-300"}`}
                >
                  <div className="text-base mb-0.5">🏆</div>
                  Trainer
                  <p className={`text-[10px] font-normal mt-0.5 ${role === "trainer" ? "text-black/70" : "text-neutral-500"}`}>Manage my clients</p>
                </button>
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">
              Password
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="float-right text-[11px] text-amber-500 hover:text-amber-400"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "signup" ? 8 : 6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
            {mode === "signup" && password.length > 0 && (
              <PasswordStrength value={password} />
            )}
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && (
                <p className={`text-[11px] mt-1 ${password === confirmPassword ? "text-green-400" : "text-red-400"}`}>
                  {password === confirmPassword ? "✓ Passwords match" : "Passwords don’t match"}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold rounded-xl py-3 mt-2 transition-colors"
          >
            {loading ? "..." : mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setConfirmPassword(""); }}
            className="text-amber-500 hover:underline"
          >
            {mode === "login" ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );
}

function PasswordStrength({ value }: { value: string }) {
  // Cheap heuristic: length + variety of character classes
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const labels = ["Very weak", "Weak", "Okay", "Good", "Strong", "Excellent"];
  const colors = ["bg-red-500", "bg-red-400", "bg-amber-400", "bg-amber-300", "bg-green-400", "bg-green-500"];
  const widthPct = (score / 5) * 100;
  return (
    <div className="mt-1.5">
      <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-full ${colors[score]} transition-all`} style={{ width: `${widthPct}%` }} />
      </div>
      <p className="text-[11px] text-neutral-500 mt-1">Strength: <span className="text-neutral-300">{labels[score]}</span></p>
    </div>
  );
}
