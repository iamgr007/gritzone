"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Landing page for the password recovery email link.
// Supabase JS converts the recovery token in the URL into a temporary session
// (PASSWORD_RECOVERY event). While that session is active we let the user
// pick a new password via supabase.auth.updateUser({ password }).
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also probe current session for cases where the event fired before mount.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don’t match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => { window.location.href = "/dashboard"; }, 1800);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold mb-1">Choose a new password</h1>
          <p className="text-neutral-500 text-sm">Make it strong. You won&apos;t have to do this often.</p>
        </div>

        {done ? (
          <div className="text-center bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <p className="text-green-400 font-semibold">✓ Password updated</p>
            <p className="text-neutral-400 text-xs mt-1">Redirecting to your dashboard...</p>
          </div>
        ) : !ready ? (
          <div className="text-center text-neutral-500 text-sm">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Validating your reset link...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">
                New Password
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
              />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold rounded-xl py-3 mt-2 transition-colors"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
