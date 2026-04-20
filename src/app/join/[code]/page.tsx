"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

export default function JoinPage() {
  const params = useParams();
  const code = params.code as string;
  const [referrer, setReferrer] = useState<string | null>(null);
  const [mode, setMode] = useState<"signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingReferrer, setLoadingReferrer] = useState(true);

  useEffect(() => {
    if (!code) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("referral_code", code)
      .single()
      .then(({ data }) => {
        setReferrer(data?.display_name ?? null);
        setLoadingReferrer(false);
      });
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
          referral_code: code,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Create referral record
    if (data.user && code) {
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", code)
        .single();

      if (referrerProfile) {
        await supabase.from("referrals").insert({
          referrer_id: referrerProfile.id,
          referred_id: data.user.id,
          bonus_days: 30,
        });
      }
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black tracking-tighter text-amber-500 mb-0.5">
            GRIT<span className="text-neutral-400">ZONE</span>
          </h1>
          <div className="inline-block bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-1 mb-3">
            Beta
          </div>
          {loadingReferrer ? (
            <p className="text-neutral-500 text-sm">Loading...</p>
          ) : referrer ? (
            <div className="bg-[#141414] border border-amber-500/20 rounded-2xl p-4 mb-2">
              <p className="text-sm text-neutral-300">
                <span className="text-amber-400 font-semibold">{referrer}</span> invited you to join the grind
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Sign up and you both get <strong className="text-amber-400">+30 days</strong> of beta rewards
              </p>
            </div>
          ) : (
            <p className="text-red-400 text-sm">Invalid referral code</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Your Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
            />
          </div>
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
            <label className="block text-sm text-neutral-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || (!referrer && !loadingReferrer)}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold rounded-xl py-3 mt-2 transition-colors"
          >
            {loading ? "..." : "Join the Grind 💪"}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-amber-500 hover:underline">Log In</a>
        </p>
      </div>
    </div>
  );
}
