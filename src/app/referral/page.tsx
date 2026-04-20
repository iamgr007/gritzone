"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";

export default function ReferralPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("referral_code, display_name").eq("id", user.id).single(),
      supabase.from("referrals").select("id", { count: "exact" }).eq("referrer_id", user.id),
    ]).then(([profileRes, refRes]) => {
      setProfile(profileRes.data);
      setReferralCount(refRes.count ?? 0);
      setLoading(false);
    });
  }, [user]);

  function copyLink() {
    if (!profile?.referral_code) return;
    const link = `https://gritzone.me/join/${profile.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareLink() {
    if (!profile?.referral_code) return;
    const link = `https://gritzone.me/join/${profile.referral_code}`;
    const text = `Join me on GRITZONE — track workouts, meals, and build real discipline. Use my referral: ${link}`;
    if (navigator.share) {
      navigator.share({ title: "GRITZONE", text, url: link });
    } else {
      copyLink();
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const referralLink = `https://gritzone.me/join/${profile?.referral_code}`;

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold mb-1">Refer & Earn</h1>
        <p className="text-neutral-500 text-sm mb-6">
          Bring your squad to the GRITZONE
        </p>

        {/* How it works */}
        <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-sm text-amber-400 mb-3">🏆 Beta Referral Rewards</h2>
          <div className="flex flex-col gap-3">
            <RewardStep
              step="1"
              title="Share your link"
              desc="Send your unique referral link to a friend"
            />
            <RewardStep
              step="2"
              title="They join GRITZONE"
              desc="When they sign up using your link"
            />
            <RewardStep
              step="3"
              title="Both earn rewards"
              desc="You BOTH get +30 days added to your Beta Tester badge. That's 30 extra free days when Pro launches!"
            />
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-5 mb-5">
          <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Your Referral Code</p>
          <p className="text-2xl font-black tracking-wider text-amber-400 mb-4">
            {profile?.referral_code}
          </p>
          <div className="bg-neutral-900 rounded-xl p-3 mb-4">
            <p className="text-xs text-neutral-400 break-all font-mono">{referralLink}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={copyLink}
              className={`flex-1 rounded-xl py-3 font-semibold text-sm transition-all ${
                copied
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {copied ? "Copied! ✓" : "Copy Link"}
            </button>
            <button
              onClick={shareLink}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Share 🔗
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">Successful Referrals</p>
              <p className="text-3xl font-bold text-amber-400">{referralCount}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500">Bonus Days Earned</p>
              <p className="text-3xl font-bold text-amber-400">{referralCount * 30}</p>
            </div>
          </div>
          {referralCount >= 5 && (
            <p className="text-xs text-center text-amber-400 mt-3 bg-amber-500/10 rounded-lg py-2">
              🎖️ Ambassador Badge Unlocked!
            </p>
          )}
        </div>
      </div>
      <Nav />
    </div>
  );
}

function RewardStep({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 flex items-center justify-center bg-amber-500 text-black rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
        {step}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-neutral-400">{desc}</p>
      </div>
    </div>
  );
}
