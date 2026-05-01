"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";

type Workout = {
  id: string;
  user_id: string;
  name: string;
  date: string;
  duration_seconds: number;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

type WorkoutSet = {
  id: string;
  exercise_name: string;
  muscle_group: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  is_warmup: boolean;
  set_type?: string;
};

type Profile = { id: string; display_name: string | null };

type ExerciseGroup = { name: string; muscle: string; sets: WorkoutSet[] };

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    async function load() {
      setLoading(true);
      const { data: w } = await supabase
        .from("workouts")
        .select("id, user_id, name, date, duration_seconds, notes, photo_url, created_at")
        .eq("id", id)
        .maybeSingle();
      if (!alive) return;
      if (!w) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setWorkout(w as Workout);
      const [setsRes, profileRes] = await Promise.all([
        supabase
          .from("workout_sets")
          .select("id, exercise_name, muscle_group, set_number, weight_kg, reps, is_warmup, set_type")
          .eq("workout_id", id)
          .order("set_number", { ascending: true }),
        supabase.from("profiles").select("id, display_name").eq("id", w.user_id).maybeSingle(),
      ]);
      if (!alive) return;
      const sets = (setsRes.data as WorkoutSet[]) ?? [];
      // group by exercise_name preserving insertion order
      const map = new Map<string, ExerciseGroup>();
      sets.forEach((s) => {
        if (!map.has(s.exercise_name)) {
          map.set(s.exercise_name, { name: s.exercise_name, muscle: s.muscle_group, sets: [] });
        }
        map.get(s.exercise_name)!.sets.push(s);
      });
      setGroups(Array.from(map.values()));
      setAuthor((profileRes.data as Profile) ?? null);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [user, id]);

  async function deleteWorkout() {
    if (!workout || !user || workout.user_id !== user.id) return;
    if (!confirm("Delete this workout? This cannot be undone.")) return;
    setDeleting(true);
    await supabase.from("workouts").delete().eq("id", workout.id);
    window.location.href = "/workout";
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3 px-6 text-center">
        <p className="text-neutral-400">Workout not found</p>
        <Link href="/workout" className="text-amber-500 text-sm hover:underline">← Back</Link>
      </div>
    );
  }

  const isOwner = user?.id === workout.user_id;
  const totalSets = groups.reduce((s, g) => s + g.sets.length, 0);
  const totalVolume = groups.reduce(
    (s, g) => s + g.sets.reduce((v, x) => v + (x.weight_kg || 0) * (x.reps || 0), 0),
    0,
  );
  const maxWeight = groups.reduce(
    (m, g) => Math.max(m, ...g.sets.map((s) => s.weight_kg || 0)),
    0,
  );

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <Link href={isOwner ? "/workout" : `/users/${workout.user_id}`} className="text-xs text-neutral-500 hover:text-neutral-300">
            ← Back
          </Link>
          {isOwner && (
            <button
              disabled={deleting}
              onClick={deleteWorkout}
              className="text-xs text-red-400 hover:underline disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>

        {workout.photo_url && (
          <img src={workout.photo_url} alt={workout.name} className="w-full rounded-2xl mb-4 max-h-96 object-cover" />
        )}

        <h1 className="text-2xl font-bold mb-1">{workout.name}</h1>
        <p className="text-xs text-neutral-500 mb-4">
          {author?.display_name ? (
            <Link href={`/users/${workout.user_id}`} className="text-amber-500 hover:underline">
              {isOwner ? "You" : author.display_name}
            </Link>
          ) : "—"}
          {" · "}
          {new Date(workout.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <Stat label="Duration" value={formatDuration(workout.duration_seconds)} />
          <Stat label="Sets" value={String(totalSets)} />
          <Stat label="Volume" value={`${Math.round(totalVolume).toLocaleString()}kg`} />
        </div>

        {maxWeight > 0 && (
          <p className="text-[11px] text-neutral-500 mb-5 text-center">
            Heaviest set: <span className="text-amber-400 font-semibold">{maxWeight}kg</span>
          </p>
        )}

        {workout.notes && (
          <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-5">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Notes</p>
            <p className="text-sm text-neutral-300 whitespace-pre-wrap">{workout.notes}</p>
          </div>
        )}

        {groups.length === 0 ? (
          <p className="text-neutral-600 text-sm text-center py-8">No sets recorded.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <div key={g.name} className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{g.name}</p>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{g.muscle}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {g.sets.map((s) => {
                    const tag = s.set_type && s.set_type !== "normal" ? s.set_type : (s.is_warmup ? "warmup" : "");
                    return (
                      <div key={s.id} className="flex items-center justify-between text-xs py-1">
                        <span className="text-neutral-500 w-8">#{s.set_number}</span>
                        <span className="flex-1 text-neutral-200">
                          {s.weight_kg}kg × {s.reps}
                        </span>
                        {tag && (
                          <span className="text-[9px] uppercase tracking-wider text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Nav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#141414] rounded-xl border border-neutral-800 p-3 text-center">
      <p className="text-base font-bold text-amber-400">{value}</p>
      <p className="text-[9px] text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}
