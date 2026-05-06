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
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);

  // If URL has ?mode=signup, start in signup mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    const r = params.get("role");
    if (r === "trainer" || r === "nutritionist") {
      setMode("signup");
      setRole(r);
    }
    const n = params.get("next");
    // Only allow same-site relative paths to prevent open-redirect.
    if (n && n.startsWith("/") && !n.startsWith("//")) setNextUrl(n);
  }, []);

  async function handleGoogle() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ""}`,
      },
    });
    if (error) setError(error.message);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email) { setError("Enter your email above first."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  }

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
      window.location.href = nextUrl || (role === "client" ? "/onboarding" : "/trainer");
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
        window.location.href = nextUrl || (isCoach ? "/trainer" : "/dashboard");
        return;
      }
      window.location.href = nextUrl || "/dashboard";
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
      ) : resetSent ? (
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-neutral-400 text-sm mb-6">
            We sent a password reset link to <span className="text-amber-500">{email}</span>.
            Open it to choose a new password.
          </p>
          <button
            onClick={() => { setResetSent(false); setForgotMode(false); }}
            className="text-amber-500 text-sm hover:underline"
          >
            ← Back to sign in
          </button>
        </div>
      ) : forgotMode ? (
        <div className="w-full max-w-sm">
          <button
            onClick={() => { setForgotMode(false); setError(""); }}
            className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-300 text-sm mb-6"
          >
            ← Back to sign in
          </button>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔑</div>
            <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
            <p className="text-neutral-500 text-sm">We&apos;ll email you a secure reset link.</p>
          </div>
          <form onSubmit={handleForgot} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold rounded-xl py-3 mt-2 transition-colors"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
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

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full bg-white hover:bg-neutral-100 text-black font-semibold rounded-xl py-3 mb-4 transition-colors flex items-center justify-center gap-2.5"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-neutral-800" />
          <span className="text-[10px] uppercase tracking-widest text-neutral-600">or with email</span>
          <div className="flex-1 h-px bg-neutral-800" />
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
            {mode === "login" && (
              <button
                type="button"
                onClick={() => { setForgotMode(true); setError(""); }}
                className="text-[11px] text-amber-500 hover:underline mt-1.5"
              >
                Forgot password?
              </button>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
