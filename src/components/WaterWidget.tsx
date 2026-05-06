"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { haptic } from "@/lib/celebrate";

const QUICK_ADDS = [
  { label: "Glass", ml: 250, emoji: "🥛" },
  { label: "Bottle", ml: 500, emoji: "🍶" },
  { label: "Big", ml: 1000, emoji: "🫙" },
];

const DEFAULT_GOAL_L = 3.0;

type Props = {
  goalL?: number;
  /** Optional callback for the dashboard to refresh totals/streak after add. */
  onChange?: () => void;
};

export default function WaterWidget({ goalL, onChange }: Props) {
  const { user } = useAuth();
  const [liters, setLiters] = useState(0);
  const [goal, setGoal] = useState<number>(goalL ?? DEFAULT_GOAL_L);
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    if (!user) return;

    // Today's water + last 30 days for streak
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);

    const [{ data: rows }, { data: tgt }] = await Promise.all([
      supabase
        .from("checkins")
        .select("date, water_intake")
        .eq("user_id", user.id)
        .gte("date", sinceStr)
        .order("date", { ascending: false }),
      goalL
        ? Promise.resolve({ data: null })
        : supabase
            .from("daily_targets")
            .select("target_water_l")
            .eq("user_id", user.id)
            .maybeSingle(),
    ]);

    const list = (rows || []) as Array<{ date: string; water_intake: number | null }>;
    const todayRow = list.find((r) => r.date === today);
    setLiters(Number(todayRow?.water_intake ?? 0));

    if (!goalL) {
      const target = (tgt as { target_water_l?: number | null } | null)?.target_water_l;
      if (target && target > 0) setGoal(Number(target));
    }

    // Streak: consecutive days from today back where water_intake >= goal-0.5
    const minToCount = (goalL ?? DEFAULT_GOAL_L) - 0.5;
    const byDate = new Map(list.map((r) => [r.date, Number(r.water_intake ?? 0)]));
    let s = 0;
    const cursor = new Date();
    for (let i = 0; i < 30; i++) {
      const key = cursor.toISOString().slice(0, 10);
      const v = byDate.get(key) ?? 0;
      // Today counts only if already at threshold; otherwise stop counting from yesterday
      if (i === 0 && v < minToCount) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      if (v >= minToCount) {
        s++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    setStreak(s);
  }, [user, today, goalL]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function add(ml: number) {
    if (!user || busy) return;
    setBusy(true);
    haptic("light");
    const next = Math.round((liters + ml / 1000) * 10) / 10;
    setLiters(next); // optimistic

    // Upsert checkin row for today
    const { data: existing } = await supabase
      .from("checkins")
      .select("id, water_intake")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      const newVal = Math.round((Number(existing.water_intake ?? 0) + ml / 1000) * 10) / 10;
      await supabase.from("checkins").update({ water_intake: newVal }).eq("id", existing.id);
    } else {
      await supabase.from("checkins").insert({ user_id: user.id, date: today, water_intake: Math.round((ml / 1000) * 10) / 10 });
    }

    setBusy(false);
    onChange?.();
    // Refresh streak if we just crossed the threshold
    const minToCount = goal - 0.5;
    if (liters < minToCount && next >= minToCount) {
      haptic("medium");
      load();
    }
  }

  async function reset() {
    if (!user || busy) return;
    if (!confirm("Reset today's water to 0?")) return;
    setBusy(true);
    setLiters(0);
    await supabase
      .from("checkins")
      .update({ water_intake: 0 })
      .eq("user_id", user.id)
      .eq("date", today);
    setBusy(false);
    onChange?.();
    load();
  }

  const pct = Math.min(100, Math.round((liters / goal) * 100));
  const filled = pct >= 100;

  return (
    <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💧</span>
          <p className="text-sm font-semibold">Hydration</p>
          {streak > 0 && (
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
              {streak}d streak
            </span>
          )}
        </div>
        <button onClick={reset} className="text-[10px] text-neutral-500 hover:text-neutral-300">reset</button>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <WaterRing pct={pct} filled={filled} />
        <div className="flex-1">
          <p className="text-xl font-bold">
            {liters.toFixed(1)}<span className="text-sm text-neutral-500"> / {goal.toFixed(1)} L</span>
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {filled ? "🎯 Goal hit. Keep sipping." : `${(goal - liters).toFixed(1)} L to go`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {QUICK_ADDS.map((q) => (
          <button
            key={q.ml}
            onClick={() => add(q.ml)}
            disabled={busy}
            className="bg-neutral-900 hover:bg-neutral-800 active:scale-95 border border-neutral-800 rounded-xl py-2 px-2 transition-all flex flex-col items-center gap-0.5 disabled:opacity-50"
          >
            <span className="text-lg">{q.emoji}</span>
            <span className="text-[10px] text-neutral-400 leading-tight">+{q.ml >= 1000 ? `${q.ml / 1000}L` : `${q.ml}ml`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WaterRing({ pct, filled }: { pct: number; filled: boolean }) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#262626" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={filled ? "#10b981" : "#3b82f6"}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${filled ? "text-emerald-400" : "text-blue-400"}`}>{pct}%</span>
      </div>
    </div>
  );
}
