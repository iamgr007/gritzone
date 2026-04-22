"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import { haptic } from "@/lib/celebrate";

type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  target_days: string[];
  active: boolean;
  sort_order: number;
};

type HabitLog = { habit_id: string; date: string; done: boolean };

const STARTERS: { name: string; icon: string; color: string }[] = [
  { name: "Drink 3L water", icon: "💧", color: "blue" },
  { name: "Sleep 7+ hours", icon: "😴", color: "indigo" },
  { name: "10,000 steps", icon: "🚶", color: "emerald" },
  { name: "Meditate 10 min", icon: "🧘", color: "purple" },
  { name: "No sugar", icon: "🚫", color: "red" },
  { name: "Read 20 min", icon: "📖", color: "amber" },
  { name: "No screens after 10pm", icon: "🌙", color: "violet" },
  { name: "Morning stretch", icon: "🤸", color: "pink" },
  { name: "Protein at every meal", icon: "🍗", color: "orange" },
  { name: "Cold shower", icon: "🚿", color: "cyan" },
];

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayStr() { return new Date().toISOString().split("T")[0]; }

function last7Days(): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}

function computeStreak(logs: HabitLog[], habitId: string): number {
  const doneDates = new Set(logs.filter(l => l.habit_id === habitId && l.done).map(l => l.date));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().split("T")[0];
    if (doneDates.has(ds)) streak++;
    else if (i > 0) break; // missing today is OK (not done yet)
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function HabitsPage() {
  const { user, loading: authLoading } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("✅");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [hRes, lRes] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).order("sort_order"),
        supabase.from("habit_logs").select("habit_id, date, done").eq("user_id", user.id).gte("date", last7Days()[0]),
      ]);
      setHabits((hRes.data || []) as Habit[]);
      setLogs((lRes.data || []) as HabitLog[]);
      setLoading(false);
    })();
  }, [user]);

  async function toggleHabit(habitId: string, date: string) {
    if (!user) return;
    haptic("light");
    const existing = logs.find(l => l.habit_id === habitId && l.date === date);
    if (existing) {
      // Toggle off → delete
      await supabase.from("habit_logs").delete().eq("user_id", user.id).eq("habit_id", habitId).eq("date", date);
      setLogs(ls => ls.filter(l => !(l.habit_id === habitId && l.date === date)));
    } else {
      await supabase.from("habit_logs").insert({ user_id: user.id, habit_id: habitId, date, done: true });
      setLogs(ls => [...ls, { habit_id: habitId, date, done: true }]);
    }
  }

  async function addHabit(name: string, icon: string) {
    if (!user || !name.trim()) return;
    const { data } = await supabase.from("habits").insert({
      user_id: user.id, name: name.trim(), icon, sort_order: habits.length,
    }).select("*").single();
    if (data) setHabits(h => [...h, data as Habit]);
    setShowAdd(false); setNewName(""); setNewIcon("✅");
  }

  async function removeHabit(id: string) {
    if (!user || !confirm("Archive this habit? Your history stays.")) return;
    await supabase.from("habits").update({ active: false }).eq("id", id);
    setHabits(hs => hs.filter(h => h.id !== id));
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const days = last7Days();
  const today = todayStr();
  const todayCompleted = habits.filter(h => logs.some(l => l.habit_id === h.id && l.date === today && l.done)).length;
  const completionPct = habits.length ? Math.round((todayCompleted / habits.length) * 100) : 0;

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Daily Habits</h1>
            <p className="text-xs text-neutral-500">Small wins → big results</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-amber-500 text-black text-xs font-bold px-3 py-2 rounded-full"
          >+ Habit</button>
        </div>

        {/* Today summary */}
        {habits.length > 0 && (
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Today</p>
                <p className="text-2xl font-black"><span className="text-amber-400">{todayCompleted}</span><span className="text-neutral-500">/{habits.length}</span></p>
              </div>
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#262626" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="97.4" strokeDashoffset={97.4 - (97.4 * completionPct) / 100} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-400">{completionPct}%</div>
              </div>
            </div>
            {completionPct === 100 && <p className="text-xs text-green-400 font-semibold">🎉 Perfect day!</p>}
          </div>
        )}

        {/* Empty state */}
        {habits.length === 0 && (
          <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-6 text-center mb-5">
            <p className="text-4xl mb-2">✨</p>
            <p className="font-bold mb-1">Start with 1-3 habits</p>
            <p className="text-xs text-neutral-500 mb-4">Consistency beats intensity. Pick your first:</p>
            <div className="flex flex-col gap-2">
              {STARTERS.slice(0, 5).map(s => (
                <button
                  key={s.name}
                  onClick={() => addHabit(s.name, s.icon)}
                  className="flex items-center gap-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl px-3 py-2.5 text-left"
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-sm font-medium">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Habit cards */}
        <div className="flex flex-col gap-3">
          {habits.map(h => {
            const streak = computeStreak(logs, h.id);
            return (
              <div key={h.id} className="bg-[#141414] border border-neutral-800 rounded-2xl p-3">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{h.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{h.name}</p>
                    {streak > 0 && <p className="text-[10px] text-amber-400">🔥 {streak}-day streak</p>}
                  </div>
                  <button onClick={() => removeHabit(h.id)} className="text-neutral-600 hover:text-red-400 text-xs p-1">✕</button>
                </div>
                {/* 7-day grid */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((d, i) => {
                    const done = logs.some(l => l.habit_id === h.id && l.date === d && l.done);
                    const isToday = d === today;
                    return (
                      <button
                        key={d}
                        onClick={() => toggleHabit(h.id, d)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold transition-all ${
                          done
                            ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                            : isToday
                              ? "bg-neutral-900 border-2 border-amber-500/40 text-neutral-400"
                              : "bg-neutral-900 border border-neutral-800 text-neutral-600 hover:border-neutral-700"
                        }`}
                      >
                        <span className="text-[8px] opacity-70">{WEEK[i]}</span>
                        <span>{done ? "✓" : new Date(d).getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {habits.length > 0 && habits.length < 8 && (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full mt-4 border-2 border-dashed border-neutral-800 hover:border-amber-500/30 rounded-2xl py-4 text-sm text-neutral-500 hover:text-amber-400"
          >+ Add another habit</button>
        )}

        <p className="text-[10px] text-neutral-600 text-center mt-6">
          💡 Tip: Stack habits. After brushing teeth → meditate. After workout → log it.
        </p>
      </div>

      {/* Add habit modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-neutral-800 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-neutral-800">
              <h2 className="font-bold text-lg">Add a Habit</h2>
              <p className="text-xs text-neutral-500">Pick a starter or create your own</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-[10px] text-neutral-500 uppercase mb-2">Starters</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {STARTERS.filter(s => !habits.some(h => h.name === s.name)).map(s => (
                  <button
                    key={s.name}
                    onClick={() => addHabit(s.name, s.icon)}
                    className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl px-3 py-2.5 text-left"
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-xs font-medium truncate">{s.name}</span>
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-neutral-500 uppercase mb-2">Custom</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  maxLength={2}
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value || "✅")}
                  className="!w-14 text-center text-xl"
                />
                <input
                  type="text"
                  placeholder="e.g. No coffee after 2pm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1"
                />
              </div>
              <button
                onClick={() => addHabit(newName, newIcon)}
                disabled={!newName.trim()}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-bold rounded-xl py-3 text-sm"
              >Add Habit</button>
            </div>
            <div className="p-4 border-t border-neutral-800 safe-bottom">
              <button onClick={() => setShowAdd(false)} className="w-full bg-neutral-800 text-neutral-400 rounded-xl py-2.5 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}
