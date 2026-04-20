"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import Link from "next/link";
import { EXERCISES, MUSCLE_GROUPS, type Exercise } from "@/lib/exercise-data";

type RegimeExercise = { exercise: Exercise; sets: number; reps: string; rest: string };
type Regime = {
  id: string;
  name: string;
  days: { name: string; exercises: RegimeExercise[] }[];
  is_template: boolean;
};

const PRESET_REGIMES: Regime[] = [
  {
    id: "ppl",
    name: "Push / Pull / Legs (6-day)",
    is_template: true,
    days: [
      { name: "Push (Chest/Shoulders/Triceps)", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Bench Press")!, sets: 4, reps: "8-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Overhead Press")!, sets: 3, reps: "8-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Incline Dumbbell Press")!, sets: 3, reps: "10-12", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Lateral Raises")!, sets: 3, reps: "12-15", rest: "45s" },
        { exercise: EXERCISES.find(e => e.name === "Tricep Pushdowns")!, sets: 3, reps: "12-15", rest: "45s" },
      ]},
      { name: "Pull (Back/Biceps)", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Deadlift")!, sets: 4, reps: "5-6", rest: "120s" },
        { exercise: EXERCISES.find(e => e.name === "Barbell Rows")!, sets: 4, reps: "8-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Pull Ups")!, sets: 3, reps: "6-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Face Pulls")!, sets: 3, reps: "15-20", rest: "45s" },
        { exercise: EXERCISES.find(e => e.name === "Barbell Curls")!, sets: 3, reps: "10-12", rest: "45s" },
      ]},
      { name: "Legs", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Squats")!, sets: 4, reps: "6-8", rest: "120s" },
        { exercise: EXERCISES.find(e => e.name === "Leg Press")!, sets: 3, reps: "10-12", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Romanian Deadlift")!, sets: 3, reps: "10-12", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Leg Extensions")!, sets: 3, reps: "12-15", rest: "45s" },
        { exercise: EXERCISES.find(e => e.name === "Calf Raises")!, sets: 4, reps: "15-20", rest: "30s" },
      ]},
    ],
  },
  {
    id: "ul",
    name: "Upper / Lower (4-day)",
    is_template: true,
    days: [
      { name: "Upper A (Strength)", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Bench Press")!, sets: 4, reps: "5-6", rest: "120s" },
        { exercise: EXERCISES.find(e => e.name === "Barbell Rows")!, sets: 4, reps: "5-6", rest: "120s" },
        { exercise: EXERCISES.find(e => e.name === "Overhead Press")!, sets: 3, reps: "8-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Pull Ups")!, sets: 3, reps: "6-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Barbell Curls")!, sets: 2, reps: "10-12", rest: "45s" },
      ]},
      { name: "Lower A (Strength)", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Squats")!, sets: 4, reps: "5-6", rest: "120s" },
        { exercise: EXERCISES.find(e => e.name === "Romanian Deadlift")!, sets: 3, reps: "8-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Leg Press")!, sets: 3, reps: "10-12", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Leg Curls")!, sets: 3, reps: "12-15", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Calf Raises")!, sets: 4, reps: "15-20", rest: "30s" },
      ]},
      { name: "Upper B (Hypertrophy)", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Incline Dumbbell Press")!, sets: 3, reps: "10-12", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Cable Rows")!, sets: 3, reps: "10-12", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Lateral Raises")!, sets: 4, reps: "12-15", rest: "45s" },
        { exercise: EXERCISES.find(e => e.name === "Tricep Pushdowns")!, sets: 3, reps: "12-15", rest: "45s" },
        { exercise: EXERCISES.find(e => e.name === "Hammer Curls")!, sets: 3, reps: "10-12", rest: "45s" },
      ]},
      { name: "Lower B (Hypertrophy)", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Leg Press")!, sets: 4, reps: "12-15", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Lunges")!, sets: 3, reps: "10/leg", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Leg Extensions")!, sets: 3, reps: "12-15", rest: "45s" },
        { exercise: EXERCISES.find(e => e.name === "Leg Curls")!, sets: 3, reps: "12-15", rest: "45s" },
        { exercise: EXERCISES.find(e => e.name === "Calf Raises")!, sets: 4, reps: "15-20", rest: "30s" },
      ]},
    ],
  },
  {
    id: "fb",
    name: "Full Body (3-day)",
    is_template: true,
    days: [
      { name: "Day A", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Squats")!, sets: 3, reps: "8-10", rest: "120s" },
        { exercise: EXERCISES.find(e => e.name === "Bench Press")!, sets: 3, reps: "8-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Barbell Rows")!, sets: 3, reps: "8-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Overhead Press")!, sets: 3, reps: "10-12", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Barbell Curls")!, sets: 2, reps: "12-15", rest: "45s" },
      ]},
      { name: "Day B", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Deadlift")!, sets: 3, reps: "5-6", rest: "120s" },
        { exercise: EXERCISES.find(e => e.name === "Incline Dumbbell Press")!, sets: 3, reps: "10-12", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Pull Ups")!, sets: 3, reps: "6-10", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Lateral Raises")!, sets: 3, reps: "12-15", rest: "45s" },
        { exercise: EXERCISES.find(e => e.name === "Tricep Pushdowns")!, sets: 2, reps: "12-15", rest: "45s" },
      ]},
      { name: "Day C", exercises: [
        { exercise: EXERCISES.find(e => e.name === "Leg Press")!, sets: 3, reps: "12-15", rest: "90s" },
        { exercise: EXERCISES.find(e => e.name === "Cable Rows")!, sets: 3, reps: "10-12", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Dumbbell Shoulder Press")!, sets: 3, reps: "10-12", rest: "60s" },
        { exercise: EXERCISES.find(e => e.name === "Chest Flys")!, sets: 3, reps: "12-15", rest: "45s" },
        { exercise: EXERCISES.find(e => e.name === "Plank")!, sets: 3, reps: "45-60s", rest: "30s" },
      ]},
    ],
  },
];

const MAX_FREE_REGIMES = 4;

export default function RegimesPage() {
  const { user, loading: authLoading } = useAuth();
  const [myRegimes, setMyRegimes] = useState<Regime[]>([]);
  const [viewing, setViewing] = useState<Regime | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [userTier] = useState<"free" | "pro" | "promax">("free");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("gritzone_regimes");
      if (saved) setMyRegimes(JSON.parse(saved));
    } catch {}
  }, []);

  function saveRegimes(regimes: Regime[]) {
    setMyRegimes(regimes);
    localStorage.setItem("gritzone_regimes", JSON.stringify(regimes));
  }

  function copyTemplate(template: Regime) {
    if (userTier === "free" && myRegimes.length >= MAX_FREE_REGIMES) return;
    const copy: Regime = { ...template, id: `custom-${Date.now()}`, is_template: false };
    saveRegimes([...myRegimes, copy]);
    setShowTemplates(false);
  }

  function createRegime() {
    if (!newName.trim()) return;
    if (userTier === "free" && myRegimes.length >= MAX_FREE_REGIMES) return;
    const regime: Regime = { id: `custom-${Date.now()}`, name: newName.trim(), days: [], is_template: false };
    saveRegimes([...myRegimes, regime]);
    setNewName("");
    setShowCreate(false);
  }

  function deleteRegime(id: string) {
    saveRegimes(myRegimes.filter(r => r.id !== id));
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const canCreate = userTier !== "free" || myRegimes.length < MAX_FREE_REGIMES;

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Workout Regimes</h1>
          <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-1 rounded-full">
            {myRegimes.length}/{userTier === "free" ? MAX_FREE_REGIMES : "∞"} used
          </span>
        </div>

        {/* Info card */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-5">
          <p className="text-xs text-neutral-400 mb-2">
            Create your workout plans or copy from proven templates. When you start a workout, pick a regime day to auto-fill exercises.
          </p>
          {userTier === "free" && (
            <p className="text-[10px] text-amber-400">
              Free tier: {MAX_FREE_REGIMES} regimes max. <Link href="/pro" className="underline">Upgrade for unlimited →</Link>
            </p>
          )}
        </div>

        {/* My Regimes */}
        {myRegimes.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-neutral-300 mb-3">My Regimes</h2>
            <div className="flex flex-col gap-2">
              {myRegimes.map(regime => (
                <div key={regime.id} className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setViewing(regime)} className="text-left flex-1">
                      <p className="font-semibold text-sm text-amber-400">{regime.name}</p>
                      <p className="text-xs text-neutral-500">{regime.days.length} day{regime.days.length !== 1 ? "s" : ""}</p>
                    </button>
                    <button onClick={() => deleteRegime(regime.id)} className="text-neutral-600 hover:text-red-400 text-xs p-2">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => canCreate ? setShowCreate(true) : null}
            className={`w-full rounded-2xl py-4 font-semibold text-sm transition-colors ${canCreate ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-neutral-800 text-neutral-500 cursor-not-allowed"}`}
          >
            {canCreate ? "+ Create Custom Regime" : `Upgrade to Pro for more regimes`}
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="w-full border-2 border-dashed border-neutral-700 hover:border-amber-500/40 rounded-2xl py-4 text-neutral-400 hover:text-amber-400 transition-colors text-sm"
          >
            📋 Browse Templates (PPL, Upper/Lower, Full Body)
          </button>
        </div>

        {/* Help Section */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
          <h3 className="font-semibold text-sm mb-2">Which regime is right for you?</h3>
          <div className="flex flex-col gap-2 text-xs text-neutral-400">
            <div className="flex gap-2"><span className="text-amber-400 font-bold w-16">PPL</span> <span>Best for 6-day/week lifters. Hits each muscle 2×/week.</span></div>
            <div className="flex gap-2"><span className="text-amber-400 font-bold w-16">Upper/Lower</span> <span>4 days/week. Good balance of volume & recovery.</span></div>
            <div className="flex gap-2"><span className="text-amber-400 font-bold w-16">Full Body</span> <span>3 days/week. Best for beginners or busy schedules.</span></div>
            <div className="flex gap-2"><span className="text-amber-400 font-bold w-16">Bro Split</span> <span>5-6 days. One muscle per day. Classic bodybuilding.</span></div>
          </div>
        </div>
      </div>

      {/* Template Browser Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 border border-neutral-800 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Template Library</h2>
              <button onClick={() => setShowTemplates(false)} className="text-neutral-500 text-lg">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              {PRESET_REGIMES.map(template => (
                <div key={template.id} className="bg-neutral-900 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{template.name}</p>
                      <p className="text-xs text-neutral-500">{template.days.length} days · {template.days[0].exercises.length} exercises/day</p>
                    </div>
                    <button
                      onClick={() => copyTemplate(template)}
                      disabled={!canCreate}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg ${canCreate ? "bg-amber-500 text-black" : "bg-neutral-700 text-neutral-500"}`}
                    >
                      {canCreate ? "Copy" : "Pro"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.days.map((day, i) => (
                      <span key={i} className="text-[9px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">{day.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 border border-neutral-800">
            <h2 className="text-lg font-bold mb-4">New Regime</h2>
            <input
              type="text"
              placeholder="Regime name (e.g. My PPL)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={createRegime} disabled={!newName.trim()} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-bold rounded-xl py-3">Create</button>
              <button onClick={() => setShowCreate(false)} className="px-4 bg-neutral-800 text-neutral-400 rounded-xl py-3">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View Regime Detail */}
      {viewing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="bg-[#0a0a0a] flex-1 flex flex-col max-w-lg mx-auto w-full overflow-y-auto">
            <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
              <button onClick={() => setViewing(null)} className="text-neutral-400 text-lg">←</button>
              <h2 className="font-bold">{viewing.name}</h2>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {viewing.days.map((day, i) => (
                <div key={i} className="bg-[#141414] rounded-2xl border border-neutral-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-800">
                    <p className="font-semibold text-sm text-amber-400">Day {i + 1}: {day.name}</p>
                  </div>
                  <div className="divide-y divide-neutral-800">
                    {day.exercises.map((ex, j) => (
                      <div key={j} className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm">{ex.exercise?.name ?? "Unknown"}</p>
                          <p className="text-[10px] text-neutral-500">{ex.exercise?.muscle}</p>
                        </div>
                        <p className="text-xs text-neutral-400">{ex.sets} × {ex.reps}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {viewing.days.length === 0 && (
                <p className="text-neutral-500 text-sm text-center py-8">No days added yet. Edit coming soon!</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}
