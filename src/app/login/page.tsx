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
  const [role, setRole] = useState<"client" | "trainer" | "nutritionist">("client");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifySent, setVerifySent] = useState(false);

  // If URL has ?mode=signup, start in signup mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    const r = params.get("role");
    if (r === "trainer" || r === "nutritionist") {
      setMode("signup");
      setRole(r);
    }
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
          emailRedirectTo: `${window.location.origin}${role === "client" ? "/onboarding" : "/trainer"}`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Supabase returns a user with empty identities[] when the email is
      // already registered. Treat that as "you already have an account".
      // Telling them to sign in (and switch role from /settings) is far
      // better than the silent "check your inbox" loop.
      if (authData.user && (authData.user.identities?.length ?? 0) === 0) {
        setLoading(false);
        setError(
          "An account already exists for this email. Sign in instead — you can switch to a coach role any time from Settings → Account type."
        );
        return;
      }

      // If Supabase requires email confirmation, no session is returned.
      // Show "check your inbox" instead of redirecting (which would bounce
      // back to /login and lose the role they picked).
      if (authData.user && !authData.session) {
        setLoading(false);
        setError("");
        setVerifySent(true);
        return;
      }

      if (authData.user && authData.session) {
        // Confirmed sessions: safe to write to DB now (RLS sees auth.uid()).
        await supabase.from("profiles").upsert({
          id: authData.user.id,
          display_name: displayName || email.split("@")[0],
          role,
        }, { onConflict: "id" });
        if (role === "client") {
          await supabase.from("user_badges").upsert({
            user_id: authData.user.id,
            badge_key: "beta_tester",
            earned_at: new Date().toISOString(),
          }, { onConflict: "user_id,badge_key" });
        }
      }
      window.location.href = role === "client" ? "/onboarding" : "/trainer";
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
        const isCoach = prof?.role === "trainer" || prof?.role === "nutritionist";
        window.location.href = isCoach ? "/trainer" : "/dashboard";
        return;
      }
      window.location.href = "/dashboard";
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      {verifySent ? (
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-neutral-400 text-sm mb-6">
            We sent a verification link to <span className="text-amber-500">{email}</span>.
            Click it to activate your {role === "client" ? "account" : `${role} account`} and finish signing up.
          </p>
          <p className="text-[11px] text-neutral-600 mb-6">
            Didn&apos;t arrive? Check spam, or try signing up again with a different email.
          </p>
          <button
            onClick={() => { setVerifySent(false); setMode("login"); }}
            className="text-amber-500 text-sm hover:underline"
          >
            ← Back to sign in
          </button>
        </div>
      ) : (
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
              <div className="grid grid-cols-3 gap-2">
                <RoleCard active={role === "client"} onClick={() => setRole("client")} icon="💪" title="Client" sub="Track my fitness" />
                <RoleCard active={role === "trainer"} onClick={() => setRole("trainer")} icon="🏆" title="Trainer" sub="Coach lifters" />
                <RoleCard active={role === "nutritionist"} onClick={() => setRole("nutritionist")} icon="🥗" title="Nutritionist" sub="Coach diets" />
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
      )}
    </div>
  );
}

function RoleCard({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: string; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 px-1 rounded-xl border text-xs font-semibold transition-all ${active ? "bg-amber-500 border-amber-500 text-black" : "bg-neutral-900 border-neutral-800 text-neutral-300"}`}
    >
      <div className="text-base mb-0.5">{icon}</div>
      {title}
      <p className={`text-[9px] font-normal mt-0.5 leading-tight ${active ? "text-black/70" : "text-neutral-500"}`}>{sub}</p>
    </button>
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
