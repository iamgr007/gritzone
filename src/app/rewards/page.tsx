"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import Link from "next/link";
import { getLevel } from "@/lib/xp";
import { celebrate } from "@/lib/celebrate";

type Partner = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  category: string | null;
};

type Reward = {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  discount_flat: number | null;
  promo_code: string;
  min_tier: string;
  required_badge: string | null;
  required_level: number;
  terms: string | null;
  partner?: Partner;
};

type Redemption = {
  reward_id: string;
  promo_code: string;
  redeemed_at: string;
};

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [partners, setPartners] = useState<Record<string, Partner>>({});
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [userTier, setUserTier] = useState<string>("free");
  const [userXp, setUserXp] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500); }

  useEffect(() => {
    (async () => {
      const [pRes, rRes] = await Promise.all([
        supabase.from("partners").select("*").eq("active", true),
        supabase.from("rewards").select("*").eq("active", true).order("required_level"),
      ]);
      const pMap: Record<string, Partner> = {};
      (pRes.data || []).forEach((p: Partner) => { pMap[p.id] = p; });
      setPartners(pMap);
      setRewards((rRes.data || []) as Reward[]);

      if (user) {
        const [profileRes, badgesRes, redemptionsRes, checkinsRes] = await Promise.all([
          supabase.from("profiles").select("tier").eq("id", user.id).single(),
          supabase.from("user_badges").select("badge_key").eq("user_id", user.id),
          supabase.from("reward_redemptions").select("reward_id, promo_code, redeemed_at").eq("user_id", user.id),
          supabase.from("checkins").select("id").eq("user_id", user.id),
        ]);
        setUserTier((profileRes.data as { tier?: string } | null)?.tier || "free");
        setUserBadges((badgesRes.data || []).map((b: { badge_key: string }) => b.badge_key));
        setRedemptions((redemptionsRes.data || []) as Redemption[]);
        // Approximate XP same way dashboard does (keep in sync with dashboard formula)
        const checkinCount = (checkinsRes.data || []).length;
        const badgeCount = (badgesRes.data || []).length;
        setUserXp(checkinCount * 10 + badgeCount * 20);
      }
      setLoading(false);
    })();
  }, [user]);

  const userLevel = getLevel(userXp).level;

  function isUnlocked(r: Reward) {
    const tierOk = r.min_tier === "free"
      || (r.min_tier === "pro" && (userTier === "pro" || userTier === "pro_max"))
      || (r.min_tier === "pro_max" && userTier === "pro_max");
    const badgeOk = !r.required_badge || userBadges.includes(r.required_badge);
    const levelOk = userLevel >= r.required_level;
    return tierOk && badgeOk && levelOk;
  }

  function redemptionFor(r: Reward) {
    return redemptions.find(x => x.reward_id === r.id);
  }

  async function reveal(r: Reward) {
    if (!user) return;
    if (!isUnlocked(r)) return;
    if (redemptionFor(r)) { setRevealed(r.id); return; }
    const { error } = await supabase.from("reward_redemptions").insert({
      user_id: user.id,
      reward_id: r.id,
      promo_code: r.promo_code,
    });
    if (error) { showToast("Could not claim. Please try again."); return; }
    setRedemptions(rs => [...rs, { reward_id: r.id, promo_code: r.promo_code, redeemed_at: new Date().toISOString() }]);
    setRevealed(r.id);
    celebrate();
    showToast("✓ Code revealed — happy shopping!");
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      showToast("✓ Code copied to clipboard");
    } catch {
      showToast(code);
    }
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const filteredRewards = rewards.filter(r => {
    if (filter === "unlocked") return isUnlocked(r);
    if (filter === "locked") return !isUnlocked(r);
    return true;
  });

  const unlockedCount = rewards.filter(isUnlocked).length;

  return (
    <div className="min-h-dvh pb-24">
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto animate-slide-down">
          <div className={`text-white text-sm rounded-xl px-4 py-3 shadow-lg ${toast.startsWith("✓") ? "bg-green-500/90" : "bg-red-500/90"}`}>{toast}</div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Rewards</h1>
            <p className="text-xs text-neutral-500">Unlock perks from our partners</p>
          </div>
          <Link href="/quests" className="text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700 px-3 py-1.5 rounded-full font-semibold">
            🎯 Quests
          </Link>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Unlocked</p>
              <p className="text-3xl font-black text-amber-400">{unlockedCount}<span className="text-lg text-neutral-500">/{rewards.length}</span></p>
              <p className="text-[10px] text-neutral-500 mt-1">Keep levelling up for more.</p>
            </div>
            <span className="text-4xl">🎁</span>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-[#141414] border border-neutral-800 rounded-full p-1 flex gap-1 mb-5">
          {(["all", "unlocked", "locked"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-amber-500 text-black" : "text-neutral-400"}`}
            >{f}</button>
          ))}
        </div>

        {/* Reward cards */}
        <div className="flex flex-col gap-3">
          {filteredRewards.map(r => {
            const partner = partners[r.partner_id];
            const unlocked = isUnlocked(r);
            const redemption = redemptionFor(r);
            const isRevealed = revealed === r.id || !!redemption;
            const badgeReq = r.required_badge;
            const tierReq = r.min_tier !== "free";

            return (
              <div key={r.id} className={`rounded-2xl border p-4 transition-all ${unlocked ? "bg-[#141414] border-amber-500/30" : "bg-[#0d0d0d] border-neutral-900 opacity-70"}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {partner?.logo_url
                      ? <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <span className="text-lg font-black text-neutral-600">{partner?.name?.[0] || "?"}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wide">{partner?.name || "Partner"}</p>
                    <p className="font-bold text-sm leading-tight">{r.title}</p>
                    {r.description && <p className="text-[11px] text-neutral-500 mt-0.5">{r.description}</p>}
                  </div>
                  {unlocked && (
                    <div className="text-right flex-shrink-0">
                      {r.discount_percent && <p className="text-green-400 font-black">{r.discount_percent}%</p>}
                      {r.discount_flat && <p className="text-green-400 font-black">₹{(r.discount_flat / 100).toFixed(0)}</p>}
                      <p className="text-[9px] text-neutral-600 uppercase">Off</p>
                    </div>
                  )}
                </div>

                {/* Lock requirements */}
                {!unlocked && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tierReq && <RequirementChip met={userTier === "pro" || userTier === "pro_max"} label={`${r.min_tier.replace("_", " ").toUpperCase()} tier`} />}
                    {badgeReq && <RequirementChip met={userBadges.includes(badgeReq)} label={`Badge: ${badgeReq.replace(/_/g, " ")}`} />}
                    {r.required_level > 1 && <RequirementChip met={userLevel >= r.required_level} label={`Level ${r.required_level}+`} />}
                  </div>
                )}

                {/* Reveal area */}
                {unlocked && !isRevealed && (
                  <button
                    onClick={() => reveal(r)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg py-2.5 text-sm transition-colors btn-glow"
                  >
                    🔓 Reveal Code
                  </button>
                )}
                {unlocked && isRevealed && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-neutral-500 uppercase">Your code</p>
                      <p className="font-mono font-bold text-green-400 text-lg tracking-wider">{r.promo_code}</p>
                    </div>
                    <button
                      onClick={() => copyCode(r.promo_code)}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold"
                    >Copy</button>
                  </div>
                )}

                {r.terms && (
                  <p className="text-[9px] text-neutral-600 mt-2">{r.terms}</p>
                )}
              </div>
            );
          })}

          {filteredRewards.length === 0 && (
            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-8 text-center">
              <p className="text-4xl mb-2">🎯</p>
              <p className="text-sm text-neutral-400">No rewards here yet.</p>
              <p className="text-xs text-neutral-600 mt-1">Complete quests and earn badges to unlock more.</p>
            </div>
          )}
        </div>

        <p className="text-[10px] text-neutral-600 text-center mt-6">
          Want your brand featured? Email <a href="mailto:partners@gritzone.me" className="text-amber-500">partners@gritzone.me</a>
        </p>
      </div>
      <Nav />
    </div>
  );
}

function RequirementChip({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`text-[9px] px-2 py-1 rounded-full font-semibold ${met ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-neutral-900 text-neutral-500 border border-neutral-800"}`}>
      {met ? "✓" : "🔒"} {label}
    </span>
  );
}
