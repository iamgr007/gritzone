"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import AppHeader from "@/components/AppHeader";
import Link from "next/link";
import { EXERCISES, MUSCLE_GROUPS, searchExercises, type Exercise } from "@/lib/exercise-data";
import { celebrate, haptic } from "@/lib/celebrate";
import { incrementQuestProgress } from "@/lib/quests-client";
import { awardWorkoutBadges } from "@/lib/badges-award";

type SetType = "normal" | "warmup" | "drop" | "failure" | "amrap";

type WorkoutSet = {
  exercise: Exercise;
  set_number: number;
  weight_kg: string;
  reps: string;
  target_reps?: string;   // e.g. "8-12" from regime
  suggested_kg?: string;  // progressive overload hint (prev best + 2.5)
  set_type: SetType;
  is_warmup: boolean;     // kept for back-compat
  done: boolean;
};

type ExerciseGroup = {
  exercise: Exercise;
  sets: WorkoutSet[];
  prevBest?: string; // e.g. "60kg × 10"
  restSeconds?: number; // user-set rest time per exercise
};

type SavedWorkout = {
  id: string;
  name: string;
  date: string;
  duration_seconds: number;
  photo_url: string | null;
  sets_count?: number;
  exercises?: string[];
};

type RegimeExercise = { exercise: Exercise; sets: number; reps: string; rest: string };
type Regime = {
  id: string;
  name: string;
  days: { name: string; exercises: RegimeExercise[] }[];
  is_template: boolean;
};

type PrevSet = { exercise_name: string; weight_kg: number; reps: number };

export default function WorkoutPage() {
  const { user, loading: authLoading } = useAuth();
  const [active, setActive] = useState(false);
  const [exercises, setExercises] = useState<ExerciseGroup[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [workoutName, setWorkoutName] = useState("Workout");
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMuscle, setFilterMuscle] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedWorkout[]>([]);
  const [saving, setSaving] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [notes, setNotes] = useState("");
  const [workoutPhoto, setWorkoutPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const startTimeRef = useRef<number>(0);

  // Regime picker state
  const [showRegimePicker, setShowRegimePicker] = useState(false);
  const [myRegimes, setMyRegimes] = useState<Regime[]>([]);
  const [prevSets, setPrevSets] = useState<PrevSet[]>([]);

  // Rest timer state
  const [restRemaining, setRestRemaining] = useState(0); // seconds left
  const [restTotal, setRestTotal] = useState(90);
  const [showRestConfig, setShowRestConfig] = useState(false);
  const [defaultRest, setDefaultRest] = useState(90);
  const restIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("gritzone_active_workout");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setActive(true);
        setExercises(data.exercises || []);
        setWorkoutName(data.name || "Workout");
        startTimeRef.current = data.startTime || Date.now();
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      } catch { /* ignore */ }
    }
    // Load regimes
    try {
      const regimeData = localStorage.getItem("gritzone_regimes");
      if (regimeData) setMyRegimes(JSON.parse(regimeData));
    } catch {}
    // Load user's default rest time
    const savedRest = localStorage.getItem("gritzone_default_rest");
    if (savedRest) setDefaultRest(parseInt(savedRest) || 90);
  }, []);

  // Load previous workout sets for "Prev" column
  useEffect(() => {
    if (!user) return;
    supabase
      .from("workout_sets")
      .select("exercise_name, weight_kg, reps")
      .order("weight_kg", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (data) setPrevSets(data as PrevSet[]);
      });
  }, [user]);

  // Timer
  useEffect(() => {
    if (active) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [active]);

  // Persist active workout
  const persist = useCallback(() => {
    if (active) {
      localStorage.setItem("gritzone_active_workout", JSON.stringify({
        exercises, name: workoutName, startTime: startTimeRef.current,
      }));
    }
  }, [active, exercises, workoutName]);

  useEffect(() => { persist(); }, [persist]);

  // Load history
  useEffect(() => {
    if (!user) return;
    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(20)
      .then(({ data }) => setHistory((data as SavedWorkout[]) ?? []));
  }, [user]);

  function startWorkout() {
    startTimeRef.current = Date.now();
    setActive(true);
    setExercises([]);
    setElapsed(0);
    setWorkoutName("Workout");
    setNotes("");
  }

  function parseRestSeconds(rest: string): number {
    // "90s", "60-90s", "1min", "1-2min"
    const m = rest.match(/(\d+)(?:-(\d+))?\s*(s|sec|min|m)?/i);
    if (!m) return defaultRest;
    const a = parseInt(m[1]);
    const b = m[2] ? parseInt(m[2]) : a;
    const avg = (a + b) / 2;
    const unit = (m[3] || "s").toLowerCase();
    return unit.startsWith("m") ? avg * 60 : avg;
  }

  function suggestedWeightFromPrev(exerciseName: string): string {
    const matches = prevSets.filter(s => s.exercise_name === exerciseName);
    if (matches.length === 0) return "";
    const best = matches.reduce((a, b) => (a.weight_kg * a.reps > b.weight_kg * b.reps ? a : b));
    // Progressive overload: +2.5kg if last best was done for target reps, else stay
    return String(best.weight_kg);
  }

  function startFromRegimeDay(regime: Regime, dayIdx: number) {
    const day = regime.days[dayIdx];
    startTimeRef.current = Date.now();
    setWorkoutName(`${regime.name} — ${day.name}`);
    setElapsed(0);
    setNotes("");

    const groups: ExerciseGroup[] = day.exercises
      .filter(e => e.exercise)
      .map(e => {
        const best = getPrevBest(e.exercise.name);
        const suggestedKg = suggestedWeightFromPrev(e.exercise.name);
        const restSec = parseRestSeconds(e.rest);
        const sets: WorkoutSet[] = Array.from({ length: e.sets }, (_, i) => ({
          exercise: e.exercise,
          set_number: i + 1,
          weight_kg: "",
          reps: "",
          target_reps: e.reps,
          suggested_kg: suggestedKg,
          set_type: "normal",
          is_warmup: false,
          done: false,
        }));
        return { exercise: e.exercise, sets, prevBest: best, restSeconds: restSec };
      });

    setExercises(groups);
    setActive(true);
    setShowRegimePicker(false);
  }

  function getPrevBest(exerciseName: string): string | undefined {
    const matches = prevSets.filter(s => s.exercise_name === exerciseName);
    if (matches.length === 0) return undefined;
    // Find heaviest set
    const best = matches.reduce((a, b) => (a.weight_kg * a.reps > b.weight_kg * b.reps ? a : b));
    return `${best.weight_kg}kg × ${best.reps}`;
  }

  function addExercise(ex: Exercise) {
    const best = getPrevBest(ex.name);
    const suggestedKg = suggestedWeightFromPrev(ex.name);
    setExercises((prev) => [
      ...prev,
      {
        exercise: ex,
        sets: [{ exercise: ex, set_number: 1, weight_kg: "", reps: "", suggested_kg: suggestedKg, set_type: "normal", is_warmup: false, done: false }],
        prevBest: best,
        restSeconds: defaultRest,
      },
    ]);
    setShowExercisePicker(false);
    setSearchQuery("");
    setFilterMuscle(null);
  }

  function addSet(exIdx: number) {
    setExercises((prev) => {
      const copy = [...prev];
      const group = { ...copy[exIdx], sets: [...copy[exIdx].sets] };
      const lastSet = group.sets[group.sets.length - 1];
      group.sets.push({
        exercise: group.exercise,
        set_number: group.sets.length + 1,
        weight_kg: lastSet?.weight_kg || "",
        reps: lastSet?.reps || "",
        target_reps: lastSet?.target_reps,
        suggested_kg: lastSet?.suggested_kg,
        set_type: "normal",
        is_warmup: false,
        done: false,
      });
      copy[exIdx] = group;
      return copy;
    });
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof WorkoutSet, value: string | boolean) {
    if (field === "done" && value === true) {
      haptic("medium");
      // Start rest timer using exercise's restSeconds or default
      const restSec = exercises[exIdx]?.restSeconds || defaultRest;
      startRest(restSec);
    }
    setExercises((prev) => {
      const copy = [...prev];
      const group = { ...copy[exIdx], sets: [...copy[exIdx].sets] };
      const updated = { ...group.sets[setIdx], [field]: value };
      // Sync is_warmup with set_type for back-compat
      if (field === "set_type") updated.is_warmup = value === "warmup";
      group.sets[setIdx] = updated;
      copy[exIdx] = group;
      return copy;
    });
  }

  function startRest(seconds: number) {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestTotal(seconds);
    setRestRemaining(seconds);
    restIntervalRef.current = setInterval(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          clearInterval(restIntervalRef.current);
          haptic("success");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  function stopRest() {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestRemaining(0);
  }

  function adjustRest(delta: number) {
    setRestRemaining((r) => Math.max(0, r + delta));
    setRestTotal((t) => Math.max(0, t + delta));
  }

  function setUserDefaultRest(seconds: number) {
    setDefaultRest(seconds);
    localStorage.setItem("gritzone_default_rest", String(seconds));
    // Apply to all existing exercises that don't have a custom rest
    setExercises(prev => prev.map(g => g.restSeconds ? g : { ...g, restSeconds: seconds }));
  }

  function setExerciseRest(exIdx: number, seconds: number) {
    setExercises(prev => {
      const copy = [...prev];
      copy[exIdx] = { ...copy[exIdx], restSeconds: seconds };
      return copy;
    });
  }

  useEffect(() => () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); }, []);

  function removeExercise(exIdx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) => {
      const copy = [...prev];
      const group = { ...copy[exIdx], sets: copy[exIdx].sets.filter((_, i) => i !== setIdx) };
      if (group.sets.length === 0) return copy.filter((_, i) => i !== exIdx);
      group.sets = group.sets.map((s, i) => ({ ...s, set_number: i + 1 }));
      copy[exIdx] = group;
      return copy;
    });
  }

  async function finishWorkout() {
    if (!user) return;
    setSaving(true);

    // Upload photo if selected
    let photoUrl: string | null = null;
    if (workoutPhoto) {
      const ext = workoutPhoto.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, workoutPhoto);
      if (!error) {
        const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const { data: workout } = await supabase.from("workouts").insert({
      user_id: user.id,
      name: workoutName,
      date: new Date().toISOString().split("T")[0],
      duration_seconds: elapsed,
      notes,
      photo_url: photoUrl,
    }).select("id").single();

    if (workout) {
      const allSets = exercises.flatMap((group) =>
        group.sets.filter((s) => s.done).map((s) => ({
          workout_id: workout.id,
          exercise_name: group.exercise.name,
          muscle_group: group.exercise.muscle,
          set_number: s.set_number,
          weight_kg: parseFloat(s.weight_kg) || 0,
          reps: parseInt(s.reps) || 0,
          is_warmup: s.set_type === "warmup",
          set_type: s.set_type,
        }))
      );
      if (allSets.length > 0) {
        await supabase.from("workout_sets").insert(allSets);
      }
    }

    localStorage.removeItem("gritzone_active_workout");
    setActive(false);
    setShowFinish(false);
    setSaving(false);
    setWorkoutPhoto(null);
    setPhotoPreview(null);
    celebrate(); // 🎉 on workout finish
    incrementQuestProgress(user, "workout").catch(() => {});

    // Award workout-related badges
    if (workout) {
      const completedSets = exercises.flatMap((g) => g.sets.filter((s) => s.done));
      const maxWeightKg = completedSets.reduce((m, s) => Math.max(m, parseFloat(s.weight_kg) || 0), 0);
      const muscleGroups = Array.from(new Set(exercises.map((g) => g.exercise.muscle)));
      awardWorkoutBadges(user.id, {
        hasPhoto: !!photoUrl,
        muscleGroups,
        maxWeightKg,
        setsCount: completedSets.length,
      }).catch(() => {});
    }

    // Refresh history
    const { data } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(20);
    setHistory((data as SavedWorkout[]) ?? []);
  }

  function discardWorkout() {
    localStorage.removeItem("gritzone_active_workout");
    setActive(false);
    setExercises([]);
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  const totalSets = exercises.reduce((s, g) => s + g.sets.filter((s) => s.done).length, 0);
  const totalVolume = exercises.reduce((s, g) =>
    s + g.sets.filter((s) => s.done).reduce((v, s) => v + (parseFloat(s.weight_kg) || 0) * (parseInt(s.reps) || 0), 0), 0);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ===== ACTIVE WORKOUT VIEW =====
  if (active) {
    return (
      <div className="min-h-dvh pb-24">
        <div className="max-w-lg mx-auto px-4 pt-4">
          {/* Timer Bar */}
          <div className="flex items-center justify-between mb-4 bg-[#141414] rounded-2xl p-3 border border-neutral-800">
            <div>
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="!bg-transparent !border-0 !p-0 font-bold text-lg !rounded-none !w-auto"
              />
              <p className="text-xs text-neutral-500 mt-0.5">
                {totalSets} sets · {Math.round(totalVolume).toLocaleString()} kg vol
              </p>
            </div>
            <div className="text-right flex items-center gap-2">
              <button
                onClick={() => setShowRestConfig(true)}
                className="text-[10px] bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 px-2 py-1 rounded-lg text-neutral-400"
                title="Default rest time"
              >⏱ {defaultRest}s</button>
              <p className="text-amber-400 font-mono text-xl font-bold">{formatTime(elapsed)}</p>
            </div>
          </div>

          {/* Exercise List */}
          <div className="flex flex-col gap-4">
            {exercises.map((group, exIdx) => (
              <div key={exIdx} className="bg-[#141414] rounded-2xl border border-neutral-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-amber-400 truncate">{group.exercise.name}</p>
                    <p className="text-[10px] text-neutral-500">{group.exercise.muscle}</p>
                  </div>
                  <button
                    onClick={() => setExerciseRest(exIdx, ((group.restSeconds || defaultRest) + 30) % 301 || 30)}
                    className="text-[10px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-2 py-1 rounded-lg text-neutral-400"
                    title="Tap to cycle rest time"
                  >⏱ {group.restSeconds || defaultRest}s</button>
                  <button onClick={() => removeExercise(exIdx)} className="text-neutral-600 hover:text-red-400 text-xs p-1 ml-2">✕</button>
                </div>

                {/* Set Header */}
                <div className="grid grid-cols-[32px_60px_1fr_1fr_36px] gap-1 px-3 py-2 text-[10px] text-neutral-500 uppercase">
                  <span>Set</span>
                  <span>Type</span>
                  <span>kg</span>
                  <span>Reps</span>
                  <span></span>
                </div>

                {/* Sets */}
                {group.sets.map((set, setIdx) => {
                  const typeLabel: Record<SetType, string> = { normal: "—", warmup: "W", drop: "D", failure: "F", amrap: "A" };
                  const typeColor: Record<SetType, string> = { normal: "text-neutral-300", warmup: "text-neutral-500", drop: "text-purple-400", failure: "text-red-400", amrap: "text-amber-400" };
                  return (
                    <div
                      key={setIdx}
                      className={`grid grid-cols-[32px_60px_1fr_1fr_36px] gap-1 px-3 py-1.5 items-center ${
                        set.done ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <span className={`text-xs font-medium ${typeColor[set.set_type]}`}>
                        {set.set_type === "normal" ? set.set_number : typeLabel[set.set_type]}
                      </span>
                      <select
                        value={set.set_type}
                        onChange={(e) => updateSet(exIdx, setIdx, "set_type", e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-md text-[10px] text-neutral-400 px-1 py-1 w-full"
                      >
                        <option value="normal">Work</option>
                        <option value="warmup">Warm-up</option>
                        <option value="drop">Drop</option>
                        <option value="failure">Failure</option>
                        <option value="amrap">AMRAP</option>
                      </select>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder={set.suggested_kg || "0"}
                        value={set.weight_kg}
                        onChange={(e) => updateSet(exIdx, setIdx, "weight_kg", e.target.value)}
                        className="!bg-neutral-900 !border-neutral-700 !rounded-lg !py-1.5 !px-2 text-center text-sm placeholder:text-neutral-600"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={set.target_reps || "0"}
                        value={set.reps}
                        onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                        className="!bg-neutral-900 !border-neutral-700 !rounded-lg !py-1.5 !px-2 text-center text-sm placeholder:text-neutral-600"
                      />
                      <button
                        onClick={() => updateSet(exIdx, setIdx, "done", !set.done)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                          set.done
                            ? "bg-amber-500 text-black"
                            : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700"
                        }`}
                      >
                        ✓
                      </button>
                    </div>
                  );
                })}

                {(group.prevBest || group.sets[0]?.target_reps) && (
                  <div className="px-3 pb-1 flex items-center gap-3 text-[10px] text-neutral-600">
                    {group.prevBest && <span>Prev best: {group.prevBest}</span>}
                    {group.sets[0]?.target_reps && <span>Target: {group.sets[0].target_reps} reps</span>}
                  </div>
                )}

                <div className="px-3 py-2 flex gap-2">
                  <button
                    onClick={() => addSet(exIdx)}
                    className="flex-1 text-xs text-amber-500 hover:bg-amber-500/10 py-2 rounded-lg transition-colors"
                  >
                    + Add Set
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Exercise Button */}
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full mt-4 border-2 border-dashed border-neutral-700 hover:border-amber-500/40 rounded-2xl py-4 text-neutral-400 hover:text-amber-400 transition-colors text-sm"
          >
            + Add Exercise
          </button>

          {/* Finish / Discard */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowFinish(true)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-3.5 transition-colors"
            >
              Finish Workout
            </button>
            <button
              onClick={discardWorkout}
              className="px-4 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-xl py-3.5 transition-colors text-sm"
            >
              Discard
            </button>
          </div>
        </div>

        {/* Exercise Picker Modal */}
        {showExercisePicker && (
          <ExercisePickerModal
            onSelect={addExercise}
            onClose={() => { setShowExercisePicker(false); setSearchQuery(""); setFilterMuscle(null); }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterMuscle={filterMuscle}
            setFilterMuscle={setFilterMuscle}
          />
        )}

        {/* Finish Modal */}
        {showFinish && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center" style={{ height: "100dvh" }}>
            <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-neutral-800 flex flex-col" style={{ maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px))" }}>
              <div className="p-6 pb-3 border-b border-neutral-800">
                <h2 className="text-lg font-bold mb-1">Finish Workout?</h2>
                <p className="text-sm text-neutral-500">
                  {formatTime(elapsed)} · {totalSets} sets · {Math.round(totalVolume).toLocaleString()} kg
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-4">
              <textarea
                rows={2}
                placeholder="Any notes about this workout..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mb-3"
              />

              {/* Workout Photo */}
              <div className="mb-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      setWorkoutPhoto(file);
                      const reader = new FileReader();
                      reader.onload = () => setPhotoPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Workout" className="w-full h-40 object-cover rounded-xl" />
                    <button
                      onClick={() => { setWorkoutPhoto(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-xs text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-neutral-700 hover:border-amber-500/40 rounded-xl py-4 text-neutral-400 hover:text-amber-400 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    📷 Add Workout Photo (optional)
                  </button>
                )}
              </div>
              </div>

              <div className="sticky bottom-0 p-4 border-t border-neutral-800 flex gap-3 bg-[#141414] pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={() => setShowFinish(false)}
                  className="px-4 bg-neutral-800 text-neutral-400 rounded-xl py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={finishWorkout}
                  disabled={saving}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-xl py-3 transition-colors btn-glow"
                >
                  {saving ? "Saving..." : "💾 Save Workout"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Rest Timer */}
        {restRemaining > 0 && (
          <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto animate-slide-up">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-2xl shadow-2xl shadow-amber-500/30 p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase opacity-80">Rest</p>
                <p className="text-2xl font-black tabular-nums">{Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, "0")}</p>
              </div>
              <button onClick={() => adjustRest(-15)} className="bg-black/15 hover:bg-black/25 rounded-lg w-9 h-9 font-bold">-15</button>
              <button onClick={() => adjustRest(15)} className="bg-black/15 hover:bg-black/25 rounded-lg w-9 h-9 font-bold">+15</button>
              <button onClick={stopRest} className="bg-black/80 text-white rounded-lg px-3 h-9 text-xs font-bold">Skip</button>
            </div>
            <div className="h-1 bg-black/20 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-black/60 transition-all" style={{ width: `${(restRemaining / restTotal) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Rest Config Modal */}
        {showRestConfig && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowRestConfig(false)}>
            <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 border border-neutral-800" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-1">Default Rest Time</h2>
              <p className="text-xs text-neutral-500 mb-4">Applied to all exercises without a custom rest.</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[45, 60, 90, 120, 150, 180, 240, 300].map(s => (
                  <button
                    key={s}
                    onClick={() => { setUserDefaultRest(s); setShowRestConfig(false); }}
                    className={`rounded-xl py-3 text-sm font-semibold border ${defaultRest === s ? "bg-amber-500 text-black border-amber-500" : "bg-neutral-900 border-neutral-800 text-neutral-300"}`}
                  >{s}s</button>
                ))}
              </div>
              <button onClick={() => setShowRestConfig(false)} className="w-full bg-neutral-800 text-neutral-400 rounded-xl py-3 text-sm">Close</button>
            </div>
          </div>
        )}

        <Nav />
      </div>
    );
  }
  return (
    <div className="min-h-dvh pb-24">
      <AppHeader title="Workout" />
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold mb-4">Workout</h1>

        {/* Start Options */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={startWorkout}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl py-5 text-lg transition-colors"
          >
            Start Empty Workout
          </button>

          {myRegimes.length > 0 ? (
            <button
              onClick={() => setShowRegimePicker(true)}
              className="w-full border-2 border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 rounded-2xl py-4 text-amber-400 font-semibold transition-colors text-sm"
            >
              📋 Start from Regime
            </button>
          ) : (
            <Link
              href="/regimes"
              className="w-full border-2 border-dashed border-neutral-700 hover:border-amber-500/40 rounded-2xl py-4 text-neutral-400 hover:text-amber-400 transition-colors text-sm text-center block"
            >
              📋 Create a Regime to quick-start workouts
            </Link>
          )}
        </div>

        {/* Quick Stats */}
        {history.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#141414] rounded-xl border border-neutral-800 p-3 text-center">
              <p className="text-lg font-bold text-amber-400">{history.length}</p>
              <p className="text-[9px] text-neutral-500">Total</p>
            </div>
            <div className="bg-[#141414] rounded-xl border border-neutral-800 p-3 text-center">
              <p className="text-lg font-bold text-green-400">{getThisWeekCount(history)}</p>
              <p className="text-[9px] text-neutral-500">This Week</p>
            </div>
            <div className="bg-[#141414] rounded-xl border border-neutral-800 p-3 text-center">
              <p className="text-lg font-bold text-blue-400">{formatTime(Math.round(history.reduce((s, w) => s + w.duration_seconds, 0) / Math.max(history.length, 1)))}</p>
              <p className="text-[9px] text-neutral-500">Avg Time</p>
            </div>
          </div>
        )}

        {/* History */}
        <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">Recent Workouts</h2>
        {history.length === 0 ? (
          <p className="text-neutral-600 text-sm text-center py-8">No workouts yet. Start your first one!</p>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((w) => (
              <Link
                key={w.id}
                href={`/workout/${w.id}`}
                className="bg-[#141414] rounded-2xl border border-neutral-800 hover:border-amber-500/30 transition-colors overflow-hidden block"
              >
                {w.photo_url && (
                  <img src={w.photo_url} alt={w.name} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{w.name}</p>
                    <span className="text-xs text-neutral-500">{formatTime(w.duration_seconds)}</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {new Date(w.date + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Regime Picker Modal */}
      {showRegimePicker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 border border-neutral-800 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Pick a Regime Day</h2>
              <button onClick={() => setShowRegimePicker(false)} className="text-neutral-500 text-lg">✕</button>
            </div>
            {myRegimes.map(regime => (
              <div key={regime.id} className="mb-4">
                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">{regime.name}</p>
                <div className="flex flex-col gap-2">
                  {regime.days.map((day, di) => (
                    <button
                      key={di}
                      onClick={() => startFromRegimeDay(regime, di)}
                      className="flex items-center justify-between bg-neutral-900 hover:bg-neutral-800 rounded-xl p-3 text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">Day {di + 1}: {day.name}</p>
                        <p className="text-[10px] text-neutral-500">{day.exercises.length} exercises</p>
                      </div>
                      <span className="text-amber-500 text-lg">→</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {myRegimes.length === 0 && (
              <p className="text-neutral-500 text-sm text-center py-6">No regimes yet. <Link href="/regimes" className="text-amber-400 underline">Create one →</Link></p>
            )}
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}

function ExercisePickerModal({
  onSelect, onClose, searchQuery, setSearchQuery, filterMuscle, setFilterMuscle,
}: {
  onSelect: (ex: Exercise) => void;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  filterMuscle: string | null;
  setFilterMuscle: (s: string | null) => void;
}) {
  let results = searchQuery ? searchExercises(searchQuery) : EXERCISES;
  if (filterMuscle) results = results.filter((e) => e.muscle === filterMuscle);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="bg-[#0a0a0a] flex-1 flex flex-col max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
          <button onClick={onClose} className="text-neutral-400 text-lg">←</button>
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="!bg-transparent !border-0 !p-0 text-lg !rounded-none flex-1"
            autoFocus
          />
        </div>

        {/* Muscle Group Chips */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterMuscle(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !filterMuscle ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400"
            }`}
          >
            All
          </button>
          {MUSCLE_GROUPS.map((m) => (
            <button
              key={m}
              onClick={() => setFilterMuscle(filterMuscle === m ? null : m)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterMuscle === m ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {results.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-900 border-b border-neutral-800/50 text-left"
            >
              {ex.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ex.image}
                  alt=""
                  loading="lazy"
                  className="w-12 h-12 rounded-lg object-cover bg-neutral-800 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0 text-lg">
                  {ex.category === "cardio" ? "🏃" : "💪"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ex.name}</p>
                <p className="text-[10px] text-neutral-500 truncate">
                  {ex.primary_muscles.length ? ex.primary_muscles.join(", ") : ex.muscle} · {ex.category}
                </p>
              </div>
              <span className="text-amber-500 text-lg">+</span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-neutral-500">No exercises match.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function getThisWeekCount(history: SavedWorkout[]): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return history.filter(w => new Date(w.date + "T00:00:00") >= weekStart).length;
}
