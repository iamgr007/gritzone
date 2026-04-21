"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import Link from "next/link";
import type { CheckIn, Profile } from "@/lib/types";
import { BADGE_MAP } from "@/lib/badges";
import { getLevel, formatXP, XP_ACTIONS } from "@/lib/xp";

function todayStr() { return new Date().toISOString().split("T")[0]; }

function getStreak(checkins: CheckIn[]): number {
  if (checkins.length === 0) return 0;
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (sorted[i].date === expected.toISOString().split("T")[0]) streak++;
    else break;
  }
  return streak;
}

type FeedItem = {
  id: string;
  type: "workout" | "food" | "checkin";
  user_id: string;
  user_name: string;
  date: string;
  created_at: string;
  workout_name?: string;
  duration_seconds?: number;
  photo_url?: string | null;
  total_calories?: number;
  meal_count?: number;
  workout_done?: boolean;
  steps_count?: number;
  morning_weight?: number | null;
};

type FeedSettings = { showWorkouts: boolean; showFood: boolean; showCheckins: boolean };

function getFeedSettings(): FeedSettings {
  if (typeof window === "undefined") return { showWorkouts: true, showFood: true, showCheckins: true };
  try { const s = localStorage.getItem("gritzone_feed_settings"); if (s) return JSON.parse(s); } catch {}
  return { showWorkouts: true, showFood: true, showCheckins: true };
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [todayCheckin, setTodayCheckin] = useState<CheckIn | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckIn[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedSettings] = useState<FeedSettings>(getFeedSettings);
  const [earnedBadges, setEarnedBadges] = useState<{ badge_key: string; earned_at: string }[]>([]);
  const [showBadgePanel, setShowBadgePanel] = useState(false);
  const [newBadgeKeys, setNewBadgeKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [profileRes, todayRes, allRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).single(),
        supabase.from("checkins").select("*").eq("user_id", user!.id).eq("date", todayStr()).maybeSingle(),
        supabase.from("checkins").select("*").eq("user_id", user!.id).order("date", { ascending: false }).limit(30),
      ]);
      setProfile(profileRes.data);
      setTodayCheckin(todayRes.data);
      setRecentCheckins(allRes.data ?? []);
      setStreak(getStreak(allRes.data ?? []));
      setLoading(false);
    }
    load();
  }, [user]);

  // Register for push notifications on native platform (no-op on web)
  useEffect(() => {
    if (!user) return;
    import("@/lib/push").then(({ registerPush }) => {
      registerPush(user).catch(() => {});
    });
  }, [user]);

  // Load earned badges
  useEffect(() => {
    if (!user) return;
    supabase.from("user_badges").select("badge_key, earned_at").eq("user_id", user.id).order("earned_at", { ascending: false }).then(({ data }) => {
      const badges = (data ?? []) as { badge_key: string; earned_at: string }[];
      setEarnedBadges(badges);
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const seenStr = localStorage.getItem("gritzone_seen_badges") || "[]";
      let seen: string[] = [];
      try { seen = JSON.parse(seenStr); } catch {}
      const newKeys = new Set(badges.filter(b => new Date(b.earned_at) > sevenDaysAgo && !seen.includes(b.badge_key)).map(b => b.badge_key));
      setNewBadgeKeys(newKeys);
    });
  }, [user]);

  function dismissBadgeNotifs() {
    const allKeys = earnedBadges.map(b => b.badge_key);
    localStorage.setItem("gritzone_seen_badges", JSON.stringify(allKeys));
    setNewBadgeKeys(new Set());
    setShowBadgePanel(false);
  }

  useEffect(() => {
    if (!user) return;
    async function loadFeed() {
      setFeedLoading(true);
      const items: FeedItem[] = [];
      const { data: followData } = await supabase.from("follows").select("following_id").eq("follower_id", user!.id);
      const followingIds = (followData ?? []).map((f: any) => f.following_id);
      const feedUsers = [user!.id, ...followingIds];

      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", feedUsers);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.display_name; });

      if (feedSettings.showWorkouts) {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: workouts } = await supabase.from("workouts").select("id, user_id, name, date, duration_seconds, photo_url, created_at").in("user_id", feedUsers).gte("date", weekAgo.toISOString().split("T")[0]).order("created_at", { ascending: false }).limit(20);
        (workouts ?? []).forEach((w: any) => {
          items.push({ id: `w-${w.id}`, type: "workout", user_id: w.user_id, user_name: nameMap[w.user_id] || "User", date: w.date, created_at: w.created_at, workout_name: w.name, duration_seconds: w.duration_seconds, photo_url: w.photo_url });
        });
      }

      if (feedSettings.showFood) {
        const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const { data: foodLogs } = await supabase.from("food_logs").select("user_id, date, calories, created_at").in("user_id", feedUsers).gte("date", threeDaysAgo.toISOString().split("T")[0]).order("created_at", { ascending: false });
        const foodGroups: Record<string, { calories: number; count: number; created_at: string }> = {};
        (foodLogs ?? []).forEach((f: any) => {
          const key = `${f.user_id}|${f.date}`;
          if (!foodGroups[key]) foodGroups[key] = { calories: 0, count: 0, created_at: f.created_at };
          foodGroups[key].calories += f.calories;
          foodGroups[key].count++;
        });
        Object.entries(foodGroups).forEach(([key, val]) => {
          const [uid, d] = key.split("|");
          items.push({ id: `f-${key}`, type: "food", user_id: uid, user_name: nameMap[uid] || "User", date: d, created_at: val.created_at, total_calories: val.calories, meal_count: val.count });
        });
      }

      if (feedSettings.showCheckins) {
        const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const { data: checkins } = await supabase.from("checkins").select("id, user_id, date, workout_done, steps_count, morning_weight, created_at").in("user_id", feedUsers).neq("user_id", user!.id).gte("date", threeDaysAgo.toISOString().split("T")[0]).order("date", { ascending: false }).limit(10);
        (checkins ?? []).forEach((c: any) => {
          items.push({ id: `c-${c.id}`, type: "checkin", user_id: c.user_id, user_name: nameMap[c.user_id] || "User", date: c.date, created_at: c.created_at, workout_done: c.workout_done, steps_count: c.steps_count, morning_weight: c.morning_weight });
        });
      }

      items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setFeed(items);
      setFeedLoading(false);
    }
    loadFeed();
  }, [user, feedSettings]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const greeting = () => { const h = new Date().getHours(); if (h < 12) return "Good Morning"; if (h < 17) return "Good Afternoon"; return "Good Evening"; };
  const last7 = recentCheckins.slice(0, 7).reverse();
  const formatTime = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const timeAgo = (d: string) => { const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (diff < 60) return "now"; if (diff < 3600) return `${Math.floor(diff / 60)}m`; if (diff < 86400) return `${Math.floor(diff / 3600)}h`; return `${Math.floor(diff / 86400)}d`; };

  // Compute XP from activity (no extra DB queries — uses what we already loaded)
  const totalXP =
    recentCheckins.length * XP_ACTIONS.daily_checkin +
    earnedBadges.length * XP_ACTIONS.earn_badge +
    streak * XP_ACTIONS.beta_day +
    (streak >= 3 ? XP_ACTIONS.finish_workout_streak_3 : 0) +
    (streak >= 7 ? XP_ACTIONS.finish_workout_streak_7 : 0);
  const levelInfo = getLevel(totalXP);

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-xs uppercase tracking-widest">{greeting()}</p>
              <h1 className="text-2xl font-bold">{profile?.display_name ?? user?.email?.split("@")[0]}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowBadgePanel(true)} className="relative text-neutral-500 hover:text-neutral-300 text-lg">
                🔔
                {newBadgeKeys.size > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-black font-bold">{newBadgeKeys.size}</span>
                )}
              </button>
              <Link href="/settings" className="text-neutral-500 hover:text-neutral-300 text-lg">⚙️</Link>
              <div className="text-right">
                <span className="text-amber-500 font-black text-lg tracking-tight">GRIT<span className="text-neutral-500 font-black">ZONE</span></span>
                <span className="block text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-center -mt-0.5">Beta</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Streak" value={`${streak}d`} color="text-amber-400" />
          <StatCard label="Weight" value={todayCheckin?.morning_weight ? `${todayCheckin.morning_weight}` : "—"} color="text-blue-400" />
          <StatCard label="Steps" value={todayCheckin?.steps_count ? todayCheckin.steps_count.toLocaleString() : "—"} color="text-purple-400" />
        </div>

        {/* Level / XP Bar */}
        <Link href="/achievements" className="block mb-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{levelInfo.icon}</span>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Level {levelInfo.level}</p>
                <p className="font-bold text-sm">{levelInfo.title}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-amber-400 font-black text-lg leading-none">{formatXP(totalXP)}</p>
              <p className="text-[9px] text-neutral-500">XP</p>
            </div>
          </div>
          <div className="h-2 bg-neutral-900 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 transition-all duration-700"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>
          <p className="text-[9px] text-neutral-500 mt-1.5 text-right">
            {levelInfo.currentXp} / {levelInfo.nextXp} to next level
          </p>
        </Link>

        {/* Quick Actions: Quests + Rewards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/quests" className="bg-[#141414] hover:bg-[#1a1a1a] border border-neutral-800 hover:border-amber-500/30 rounded-2xl p-3 flex items-center gap-2 transition-all">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-sm font-bold">Quests</p>
              <p className="text-[10px] text-neutral-500">Earn XP</p>
            </div>
          </Link>
          <Link href="/rewards" className="bg-[#141414] hover:bg-[#1a1a1a] border border-neutral-800 hover:border-amber-500/30 rounded-2xl p-3 flex items-center gap-2 transition-all">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-sm font-bold">Rewards</p>
              <p className="text-[10px] text-neutral-500">Brand perks</p>
            </div>
          </Link>
        </div>

        {/* Beta Tester Badge Banner */}
        {earnedBadges.some(b => b.badge_key === "beta_tester") && (() => {
          const betaBadge = earnedBadges.find(b => b.badge_key === "beta_tester")!;
          const daysSince = Math.max(1, Math.floor((Date.now() - new Date(betaBadge.earned_at).getTime()) / 86400000));
          return (
            <Link href="/achievements" className="block bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-2xl p-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧪</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-400">Beta Tester · Day {daysSince}</p>
                  <p className="text-[10px] text-neutral-500">Every day in beta = 1 free Pro day at launch</p>
                </div>
                <span className="text-xs text-neutral-500">→</span>
              </div>
            </Link>
          );
        })()}

        {/* Today Status */}
        {todayCheckin ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-400 font-semibold text-sm">Today&apos;s check-in done ✓</p>
                <p className="text-neutral-400 text-xs mt-0.5">{todayCheckin.workout_done ? "Workout done 💪" : "No workout"} · {todayCheckin.water_intake}L water · {todayCheckin.sleep_hours}h sleep</p>
              </div>
              <Link href="/checkin" className="text-xs text-amber-500 hover:underline">Edit</Link>
            </div>
          </div>
        ) : (
          <Link href="/checkin" className="block bg-amber-500 hover:bg-amber-600 text-black font-semibold text-center rounded-2xl py-4 mb-6 transition-colors">Log Today&apos;s Grind →</Link>
        )}

        {/* Weight Trend */}
        {last7.some((c) => c.morning_weight) && (
          <div className="bg-[#141414] rounded-2xl p-4 border border-neutral-800 mb-5">
            <h2 className="text-sm font-semibold text-neutral-300 mb-3">Weight Trend (7d)</h2>
            <WeightChart data={last7} />
          </div>
        )}

        {/* Activity Feed */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Activity Feed</h2>
            <Link href="/settings" className="text-[10px] text-amber-500 hover:underline">Settings</Link>
          </div>

          {feedLoading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : feed.length === 0 ? (
            <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-6 text-center">
              <p className="text-neutral-500 text-sm mb-2">No activity yet</p>
              <p className="text-neutral-600 text-xs">Follow friends or start working out to see activity here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {feed.map((item) => (
                <FeedCard key={item.id} item={item} currentUserId={user!.id} formatTime={formatTime} timeAgo={timeAgo} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badge Notification Panel */}
      {showBadgePanel && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 border border-neutral-800 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">🔔 Notifications</h2>
              <button onClick={() => setShowBadgePanel(false)} className="text-neutral-500 text-lg">✕</button>
            </div>

            {earnedBadges.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-6">No badges earned yet. Keep grinding!</p>
            ) : (
              <div className="flex flex-col gap-2">
                {earnedBadges.map(b => {
                  const badge = BADGE_MAP[b.badge_key];
                  if (!badge) return null;
                  const isNew = newBadgeKeys.has(b.badge_key);
                  const earnedDate = new Date(b.earned_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                  return (
                    <div key={b.badge_key} className={`flex items-center gap-3 p-3 rounded-xl ${isNew ? "bg-amber-500/10 border border-amber-500/20" : "bg-neutral-900"}`}>
                      <span className="text-2xl">{badge.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{badge.name} {isNew && <span className="text-[8px] bg-amber-500 text-black px-1.5 py-0.5 rounded-full ml-1 font-bold">NEW</span>}</p>
                        <p className="text-[10px] text-neutral-500">{badge.description}</p>
                      </div>
                      <span className="text-[10px] text-neutral-600">{earnedDate}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {newBadgeKeys.size > 0 && (
              <button onClick={dismissBadgeNotifs} className="w-full mt-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl py-3 text-sm transition-colors">
                Mark all as read
              </button>
            )}

            <Link href="/achievements" className="block text-center text-amber-500 text-xs mt-3 hover:underline">
              View all badges →
            </Link>
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}

function FeedCard({ item, currentUserId, formatTime, timeAgo }: { item: FeedItem; currentUserId: string; formatTime: (s: number) => string; timeAgo: (d: string) => string }) {
  const name = item.user_id === currentUserId ? "You" : item.user_name;
  if (item.type === "workout") {
    return (
      <div className="bg-[#141414] rounded-2xl border border-neutral-800 overflow-hidden">
        {item.photo_url && <img src={item.photo_url} alt={item.workout_name} className="w-full h-40 object-cover" />}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold flex-shrink-0">{item.user_name.charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm"><span className="font-semibold">{name}</span><span className="text-neutral-500"> completed a workout</span></p>
            </div>
            <span className="text-[10px] text-neutral-600 flex-shrink-0">{timeAgo(item.created_at)}</span>
          </div>
          <div className="ml-9 mt-1">
            <p className="text-amber-400 font-semibold text-sm">{item.workout_name}</p>
            <p className="text-xs text-neutral-500">{item.duration_seconds ? formatTime(item.duration_seconds) : "—"}</p>
          </div>
        </div>
      </div>
    );
  }
  if (item.type === "food") {
    return (
      <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold flex-shrink-0">{item.user_name.charAt(0).toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm"><span className="font-semibold">{name}</span><span className="text-neutral-500"> logged {item.meal_count} items</span></p>
            <p className="text-xs text-neutral-500">{item.total_calories} cal · {new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</p>
          </div>
          <span className="text-[10px] text-neutral-600">{timeAgo(item.created_at)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold flex-shrink-0">{item.user_name.charAt(0).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm"><span className="font-semibold">{name}</span><span className="text-neutral-500"> checked in</span></p>
          <p className="text-xs text-neutral-500">{item.workout_done && "💪 "}{item.steps_count ? `${item.steps_count.toLocaleString()} steps` : ""}{item.morning_weight ? ` · ${item.morning_weight}kg` : ""}</p>
        </div>
        <span className="text-[10px] text-neutral-600">{timeAgo(item.created_at)}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#141414] rounded-2xl p-3 border border-neutral-800 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}

function WeightChart({ data }: { data: CheckIn[] }) {
  const weights = data.map((d) => d.morning_weight).filter((w): w is number => w !== null);
  if (weights.length === 0) return null;
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const range = max - min || 1;
  const h = 80, w = 280;
  const points = data.map((d, i) => { if (d.morning_weight === null) return null; return `${(i / (data.length - 1 || 1)) * w},${h - ((d.morning_weight - min) / range) * h}`; }).filter(Boolean);
  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full h-20">
      <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={points.join(" ")} />
      {data.map((d, i) => { if (d.morning_weight === null) return null; const x = (i / (data.length - 1 || 1)) * w; const y = h - ((d.morning_weight - min) / range) * h; return (<g key={i}><circle cx={x} cy={y} r="3" fill="#f59e0b" /><text x={x} y={h + 14} textAnchor="middle" fill="#737373" fontSize="8">{new Date(d.date + "T00:00:00").toLocaleDateString("en", { day: "numeric" })}</text></g>); })}
    </svg>
  );
}
