"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import { BADGE_MAP, RARITY_COLORS } from "@/lib/badges";
import Link from "next/link";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<{ badge_key: string; earned_at: string }[]>([]);
  const [stats, setStats] = useState({ checkins: 0, workouts: 0, foodDays: 0 });
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [betaDays, setBetaDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const [profileRes, badgesRes, checkinsRes, workoutsRes, followersRes, followingRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).single(),
        supabase.from("user_badges").select("badge_key, earned_at").eq("user_id", user!.id),
        supabase.from("checkins").select("id", { count: "exact" }).eq("user_id", user!.id),
        supabase.from("workouts").select("id", { count: "exact" }).eq("user_id", user!.id),
        supabase.from("follows").select("id", { count: "exact" }).eq("following_id", user!.id),
        supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", user!.id),
      ]);

      setProfile(profileRes.data);
      setBadges((badgesRes.data as any[]) ?? []);
      setStats({
        checkins: checkinsRes.count ?? 0,
        workouts: workoutsRes.count ?? 0,
        foodDays: 0,
      });
      setFollowers(followersRes.count ?? 0);
      setFollowing(followingRes.count ?? 0);

      if (profileRes.data?.beta_joined_at) {
        const joined = new Date(profileRes.data.beta_joined_at);
        const now = new Date();
        setBetaDays(Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24)));
      }

      setLoading(false);
    }

    load();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const recentBadges = badges.sort((a, b) => b.earned_at.localeCompare(a.earned_at)).slice(0, 6);

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-2xl flex-shrink-0">
            {profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{profile?.display_name}</h1>
              <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Beta
              </span>
            </div>
            <p className="text-xs text-neutral-500">{user?.email}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              🧪 Beta Tester · {betaDays} days active
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <StatBox label="Check-ins" value={stats.checkins} />
          <StatBox label="Workouts" value={stats.workouts} />
          <Link href="/users?tab=followers" className="contents">
            <StatBox label="Followers" value={followers} />
          </Link>
          <Link href="/users?tab=following" className="contents">
            <StatBox label="Following" value={following} />
          </Link>
        </div>

        {/* Beta Tester Card */}
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🧪</span>
            <h3 className="font-bold text-sm text-amber-400">Beta Tester Badge</h3>
          </div>
          <p className="text-xs text-neutral-400 mb-2">
            You&apos;ve been grinding for <strong className="text-amber-400">{betaDays} days</strong> during the GRITZONE beta.
            When Pro launches, you get <strong className="text-amber-400">{betaDays} days free</strong> — earned through pure discipline.
          </p>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${Math.min((betaDays / 90) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">{betaDays}/90 days to Beta Veteran badge</p>
        </div>

        {/* Recent Badges */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-300">Badges ({badges.length})</h2>
            <Link href="/achievements" className="text-xs text-amber-500 hover:underline">View All →</Link>
          </div>
          {recentBadges.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
              {recentBadges.map((ub) => {
                const badge = BADGE_MAP[ub.badge_key];
                if (!badge) return null;
                return (
                  <div
                    key={ub.badge_key}
                    className={`flex-shrink-0 w-20 rounded-2xl border p-3 text-center ${RARITY_COLORS[badge.rarity]}`}
                  >
                    <span className="text-2xl block mb-1">{badge.icon}</span>
                    <p className="text-[9px] font-medium leading-tight">{badge.name}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-neutral-600 text-sm">No badges yet. Start grinding!</p>
          )}
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-2">
          <Link
            href="/users"
            className="flex items-center justify-between bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">👥</span>
              <div>
                <p className="font-semibold text-sm">Find People</p>
                <p className="text-[10px] text-neutral-500">Follow friends to see their updates</p>
              </div>
            </div>
            <span className="text-neutral-500">→</span>
          </Link>

          <Link
            href="/referral"
            className="flex items-center justify-between bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🤝</span>
              <div>
                <p className="font-semibold text-sm">Refer a Friend</p>
                <p className="text-[10px] text-neutral-500">Both get +30 days beta badge</p>
              </div>
            </div>
            <span className="text-neutral-500">→</span>
          </Link>

          <Link
            href="/checkin"
            className="flex items-center justify-between bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✏️</span>
              <div>
                <p className="font-semibold text-sm">Daily Check-In</p>
                <p className="text-[10px] text-neutral-500">Weight, sleep, water, steps</p>
              </div>
            </div>
            <span className="text-neutral-500">→</span>
          </Link>

          <button
            onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/login"))}
            className="flex items-center gap-3 bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-red-500/30 transition-colors text-left"
          >
            <span className="text-xl">🚪</span>
            <p className="font-semibold text-sm text-red-400">Log Out</p>
          </button>
        </div>
      </div>
      <Nav />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#141414] rounded-xl border border-neutral-800 py-2 text-center">
      <p className="text-lg font-bold text-neutral-200">{value}</p>
      <p className="text-[9px] text-neutral-500">{label}</p>
    </div>
  );
}
