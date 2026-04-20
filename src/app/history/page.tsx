"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import type { CheckIn } from "@/lib/types";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const endDate = `${y}-${String(m + 1 > 12 ? 1 : m + 1).padStart(2, "0")}-01`;
    const endYear = m + 1 > 12 ? y + 1 : y;
    const endDateFinal = `${endYear}-${String(m + 1 > 12 ? 1 : m + 1).padStart(2, "0")}-01`;

    supabase
      .from("checkins")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDateFinal)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setCheckins(data ?? []);
        setLoading(false);
      });
  }, [user, month]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalDays = checkins.length;
  const workoutDays = checkins.filter((c) => c.workout_done).length;
  const avgWeight =
    checkins.filter((c) => c.morning_weight).length > 0
      ? (
          checkins.filter((c) => c.morning_weight).reduce((s, c) => s + (c.morning_weight ?? 0), 0) /
          checkins.filter((c) => c.morning_weight).length
        ).toFixed(1)
      : "—";
  const avgSteps =
    totalDays > 0
      ? Math.round(checkins.reduce((s, c) => s + c.steps_count, 0) / totalDays).toLocaleString()
      : "—";
  const avgWater =
    totalDays > 0
      ? (checkins.reduce((s, c) => s + c.water_intake, 0) / totalDays).toFixed(1)
      : "—";
  const avgSleep =
    totalDays > 0
      ? (checkins.reduce((s, c) => s + c.sleep_hours, 0) / totalDays).toFixed(1)
      : "—";

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">History</h1>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="!w-auto text-sm !py-2 !px-3"
          />
        </div>

        {/* Monthly Summary */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <MiniStat label="Check-ins" value={`${totalDays}`} />
          <MiniStat label="Workouts" value={`${workoutDays}`} />
          <MiniStat label="Avg Weight" value={avgWeight} />
          <MiniStat label="Avg Steps" value={avgSteps} />
          <MiniStat label="Avg Water" value={`${avgWater}L`} />
          <MiniStat label="Avg Sleep" value={`${avgSleep}h`} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : checkins.length === 0 ? (
          <p className="text-center text-neutral-500 py-12">No check-ins this month</p>
        ) : (
          <div className="flex flex-col gap-3">
            {checkins.map((c) => (
              <div
                key={c.id}
                className="bg-[#141414] rounded-2xl border border-neutral-800 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(c.date + "T00:00:00").toLocaleDateString("en-IN", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {c.morning_weight ? `${c.morning_weight}kg` : "—"} ·{" "}
                      {c.steps_count.toLocaleString()} steps · {c.water_intake}L
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.workout_done && <span className="text-green-400 text-xs">💪</span>}
                    <span className="text-neutral-500 text-xs">{expandedId === c.id ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expandedId === c.id && (
                  <div className="px-4 pb-4 pt-0 text-sm border-t border-neutral-800">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3">
                      <Detail label="Weight" value={c.morning_weight ? `${c.morning_weight} kg` : "—"} />
                      <Detail label="Steps" value={c.steps_count.toLocaleString()} />
                      <Detail label="Water" value={`${c.water_intake} L`} />
                      <Detail label="Sleep" value={`${c.sleep_hours} h`} />
                      <Detail label="Workout" value={c.workout_done ? "Yes" : "No"} />
                    </div>
                    {c.breakfast && <MealRow label="Breakfast" text={c.breakfast} />}
                    {c.lunch && <MealRow label="Lunch" text={c.lunch} />}
                    {c.dinner && <MealRow label="Dinner" text={c.dinner} />}
                    {c.snacks && <MealRow label="Snacks" text={c.snacks} />}
                    {c.workout_details && <MealRow label="Workout" text={c.workout_details} />}
                    {c.notes && (
                      <div className="mt-3 p-3 bg-neutral-900 rounded-xl">
                        <p className="text-xs text-neutral-400 mb-1">Notes</p>
                        <p className="text-neutral-300 text-sm">{c.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Nav />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#141414] rounded-xl p-2.5 border border-neutral-800 text-center">
      <p className="text-sm font-bold text-neutral-200">{value}</p>
      <p className="text-[10px] text-neutral-500">{label}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-neutral-500 text-xs">{label}</p>
      <p className="text-neutral-200">{value}</p>
    </div>
  );
}

function MealRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-2">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-neutral-300">{text}</p>
    </div>
  );
}
