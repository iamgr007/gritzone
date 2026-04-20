"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import Link from "next/link";
import type { CheckIn, Profile } from "@/lib/types";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function getStreak(checkins: CheckIn[]): number {
  if (checkins.length === 0) return 0;
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split("T")[0];
    if (sorted[i].date === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [todayCheckin, setTodayCheckin] = useState<CheckIn | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckIn[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const last7 = recentCheckins.slice(0, 7).reverse();

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <p className="text-neutral-400 text-sm">{greeting()}</p>
          <h1 className="text-2xl font-bold">
            {profile?.display_name ?? user?.email?.split("@")[0]}
          </h1>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Streak" value={`${streak}d`} color="text-green-400" />
          <StatCard
            label="Weight"
            value={todayCheckin?.morning_weight ? `${todayCheckin.morning_weight}` : "—"}
            color="text-blue-400"
          />
          <StatCard
            label="Steps"
            value={todayCheckin?.steps_count ? todayCheckin.steps_count.toLocaleString() : "—"}
            color="text-purple-400"
          />
        </div>

        {/* Today Status */}
        {todayCheckin ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-semibold text-sm">Today&apos;s check-in done ✓</p>
                <p className="text-neutral-400 text-xs mt-0.5">
                  {todayCheckin.workout_done ? "Workout done 💪" : "No workout logged"} ·{" "}
                  {todayCheckin.water_intake}L water · {todayCheckin.sleep_hours}h sleep
                </p>
              </div>
              <Link
                href="/checkin"
                className="text-xs text-green-500 hover:underline"
              >
                Edit
              </Link>
            </div>
          </div>
        ) : (
          <Link
            href="/checkin"
            className="block bg-green-500 hover:bg-green-600 text-black font-semibold text-center rounded-2xl py-4 mb-6 transition-colors"
          >
            Log Today&apos;s Check-In →
          </Link>
        )}

        {/* Weight Trend (last 7 days) */}
        {last7.some((c) => c.morning_weight) && (
          <div className="bg-[#141414] rounded-2xl p-4 border border-neutral-800 mb-4">
            <h2 className="text-sm font-semibold text-neutral-300 mb-3">Weight Trend (7d)</h2>
            <WeightChart data={last7} />
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-[#141414] rounded-2xl p-4 border border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">Recent Activity</h2>
          {recentCheckins.length === 0 ? (
            <p className="text-neutral-500 text-sm">No check-ins yet. Start today!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentCheckins.slice(0, 7).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(c.date + "T00:00:00").toLocaleDateString("en-IN", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {c.morning_weight ? `${c.morning_weight}kg` : "—"} · {c.steps_count.toLocaleString()} steps
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {c.workout_done && <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Workout</span>}
                    {c.water_intake >= 3 && <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Hydrated</span>}
                    {c.sleep_hours >= 7 && <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Well Rested</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Nav />
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
  const h = 80;
  const w = 280;

  const points = data
    .map((d, i) => {
      if (d.morning_weight === null) return null;
      const x = (i / (data.length - 1 || 1)) * w;
      const y = h - ((d.morning_weight - min) / range) * h;
      return `${x},${y}`;
    })
    .filter(Boolean);

  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full h-20">
      <polyline
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        points={points.join(" ")}
      />
      {data.map((d, i) => {
        if (d.morning_weight === null) return null;
        const x = (i / (data.length - 1 || 1)) * w;
        const y = h - ((d.morning_weight - min) / range) * h;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="#22c55e" />
            <text x={x} y={h + 14} textAnchor="middle" fill="#737373" fontSize="8">
              {new Date(d.date + "T00:00:00").toLocaleDateString("en", { day: "numeric" })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
