"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import { BADGE_MAP, RARITY_COLORS } from "@/lib/badges";
import { awardFollowerBadges } from "@/lib/badges-award";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type Workout = {
  id: string;
  name: string;
  date: string;
  duration_seconds: number;
  photo_url: string | null;
};

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<{ badge_key: string; earned_at: string }[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState({ checkins: 0, workouts: 0, followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isSelf = user?.id === id;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    async function load() {
      setLoading(true);
      const [profileRes, badgesRes, checkinsRes, workoutsListRes, workoutsCountRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, bio").eq("id", id).maybeSingle(),
        supabase.from("user_badges").select("badge_key, earned_at").eq("user_id", id).order("earned_at", { ascending: false }),
        supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("workouts").select("id, name, date, duration_seconds, photo_url").eq("user_id", id).order("date", { ascending: false }).limit(20),
        supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", id),
        isSelf
          ? Promise.resolve({ data: null })
          : supabase.from("follows").select("id").eq("follower_id", user!.id).eq("following_id", id).maybeSingle(),
      ]);
      if (!alive) return;
      if (!profileRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(profileRes.data as Profile);
      setBadges((badgesRes.data as { badge_key: string; earned_at: string }[]) ?? []);
      setWorkouts((workoutsListRes.data as Workout[]) ?? []);
      setStats({
        checkins: checkinsRes.count ?? 0,
        workouts: workoutsCountRes.count ?? 0,
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
      });
      setIsFollowing(!!isFollowingRes.data);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [user, id, isSelf]);

  async function toggleFollow() {
    if (!user || isSelf || busy) return;
    setBusy(true);
    if (isFollowing) {
      const prev = isFollowing;
      setIsFollowing(false);
      setStats((s) => ({ ...s, followers: Math.max(0, s.followers - 1) }));
      const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
      if (error) {
        setIsFollowing(prev);
        setStats((s) => ({ ...s, followers: s.followers + 1 }));
        alert("Could not unfollow");
      }
    } else {
      setIsFollowing(true);
      setStats((s) => ({ ...s, followers: s.followers + 1 }));
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
      if (error) {
        setIsFollowing(false);
        setStats((s) => ({ ...s, followers: Math.max(0, s.followers - 1) }));
        alert("Could not follow");
      } else {
        awardFollowerBadges(id).catch(() => {});
      }
    }
    setBusy(false);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3 px-6 text-center">
        <p className="text-neutral-400">User not found</p>
        <Link href="/users" className="text-amber-500 text-sm hover:underline">← Back to People</Link>
      </div>
    );
  }

  const recentBadges = badges.slice(0, 8);
  const formatDuration = (s: number) => { const m = Math.floor(s / 60); const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; };

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/users" className="text-xs text-neutral-500 hover:text-neutral-300">← Back</Link>
          {isSelf && <Link href="/profile" className="text-xs text-amber-500 hover:underline">Edit Profile</Link>}
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-2xl flex-shrink-0">
            {(profile?.display_name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{profile?.display_name || "Unnamed"}</h1>
            {profile?.bio && !profile.bio.trim().startsWith("{") && (
              <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{profile.bio}</p>
            )}
          </div>
          {!isSelf && (
            <button
              onClick={toggleFollow}
              disabled={busy}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                isFollowing
                  ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  : "bg-amber-500 text-black hover:bg-amber-400"
              }`}
            >
              {busy ? "…" : isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <StatBox label="Check-ins" value={stats.checkins} />
          <StatBox label="Workouts" value={stats.workouts} />
          <StatBox label="Followers" value={stats.followers} />
          <StatBox label="Following" value={stats.following} />
        </div>

        {/* Badges */}
        {recentBadges.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-neutral-300 mb-3">Badges ({badges.length})</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
              {recentBadges.map((ub) => {
                const badge = BADGE_MAP[ub.badge_key];
                if (!badge) return null;
                return (
                  <div key={ub.badge_key} className={`flex-shrink-0 w-20 rounded-2xl border p-3 text-center ${RARITY_COLORS[badge.rarity]}`}>
                    <span className="text-2xl block mb-1">{badge.icon}</span>
                    <p className="text-[9px] font-medium leading-tight">{badge.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Workouts */}
        <h2 className="text-sm font-semibold text-neutral-300 mb-3">Recent Workouts</h2>
        {workouts.length === 0 ? (
          <p className="text-neutral-600 text-sm text-center py-8">No workouts logged yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {workouts.map((w) => (
              <Link
                key={w.id}
                href={`/workout/${w.id}`}
                className="bg-[#141414] rounded-2xl border border-neutral-800 hover:border-amber-500/30 transition-colors overflow-hidden block"
              >
                {w.photo_url && <img src={w.photo_url} alt={w.name} className="w-full h-40 object-cover" />}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{w.name}</p>
                    <span className="text-xs text-neutral-500">{formatDuration(w.duration_seconds)}</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {new Date(w.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
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
