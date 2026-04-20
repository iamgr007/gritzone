"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import type { CheckIn } from "@/lib/types";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function CheckInPage() {
  const { user, loading: authLoading } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    morning_weight: "",
    breakfast: "",
    lunch: "",
    dinner: "",
    snacks: "",
    workout_done: false,
    workout_details: "",
    steps_count: "",
    water_intake: "",
    sleep_hours: "",
    notes: "",
  });

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    supabase
      .from("checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          setForm({
            morning_weight: data.morning_weight?.toString() ?? "",
            breakfast: data.breakfast ?? "",
            lunch: data.lunch ?? "",
            dinner: data.dinner ?? "",
            snacks: data.snacks ?? "",
            workout_done: data.workout_done ?? false,
            workout_details: data.workout_details ?? "",
            steps_count: data.steps_count?.toString() ?? "",
            water_intake: data.water_intake?.toString() ?? "",
            sleep_hours: data.sleep_hours?.toString() ?? "",
            notes: data.notes ?? "",
          });
        } else {
          setExistingId(null);
          setForm({
            morning_weight: "",
            breakfast: "",
            lunch: "",
            dinner: "",
            snacks: "",
            workout_done: false,
            workout_details: "",
            steps_count: "",
            water_intake: "",
            sleep_hours: "",
            notes: "",
          });
        }
        setLoadingData(false);
      });
  }, [user, date]);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      date,
      morning_weight: form.morning_weight ? parseFloat(form.morning_weight) : null,
      breakfast: form.breakfast,
      lunch: form.lunch,
      dinner: form.dinner,
      snacks: form.snacks,
      workout_done: form.workout_done,
      workout_details: form.workout_details,
      steps_count: form.steps_count ? parseInt(form.steps_count, 10) : 0,
      water_intake: form.water_intake ? parseFloat(form.water_intake) : 0,
      sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : 0,
      notes: form.notes,
    };

    if (existingId) {
      const { user_id, date: _d, ...updatePayload } = payload;
      await supabase.from("checkins").update(updatePayload).eq("id", existingId);
    } else {
      const { data } = await supabase.from("checkins").insert(payload).select("id").single();
      if (data) setExistingId(data.id);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold mb-4">Log Your Grind</h1>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mb-6 text-center"
        />

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            {/* Weight */}
            <Section title="⚖️ Morning Weight (kg)">
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 72.5"
                value={form.morning_weight}
                onChange={(e) => update("morning_weight", e.target.value)}
              />
            </Section>

            {/* Meals */}
            <Section title="🍽️ Meals">
              <label className="block text-sm text-neutral-400 mb-1">Breakfast</label>
              <textarea
                rows={2}
                placeholder="What did you eat?"
                value={form.breakfast}
                onChange={(e) => update("breakfast", e.target.value)}
              />
              <label className="block text-sm text-neutral-400 mb-1 mt-3">Lunch</label>
              <textarea
                rows={2}
                placeholder="What did you eat?"
                value={form.lunch}
                onChange={(e) => update("lunch", e.target.value)}
              />
              <label className="block text-sm text-neutral-400 mb-1 mt-3">Dinner</label>
              <textarea
                rows={2}
                placeholder="What did you eat?"
                value={form.dinner}
                onChange={(e) => update("dinner", e.target.value)}
              />
              <label className="block text-sm text-neutral-400 mb-1 mt-3">Snacks</label>
              <textarea
                rows={2}
                placeholder="Any snacks?"
                value={form.snacks}
                onChange={(e) => update("snacks", e.target.value)}
              />
            </Section>

            {/* Workout */}
            <Section title="💪 Workout">
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => update("workout_done", !form.workout_done)}
                  className={`w-14 h-8 rounded-full transition-colors relative ${
                    form.workout_done ? "bg-amber-500" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                      form.workout_done ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-neutral-300">
                  {form.workout_done ? "Yes! 🔥" : "Not yet"}
                </span>
              </div>
              {form.workout_done && (
                <textarea
                  rows={2}
                  placeholder="What did you do?"
                  value={form.workout_details}
                  onChange={(e) => update("workout_details", e.target.value)}
                />
              )}
            </Section>

            {/* Steps */}
            <Section title="🚶 Steps">
              <input
                type="number"
                placeholder="e.g. 8000"
                value={form.steps_count}
                onChange={(e) => update("steps_count", e.target.value)}
              />
            </Section>

            {/* Water */}
            <Section title="💧 Water Intake (liters)">
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 3.0"
                value={form.water_intake}
                onChange={(e) => update("water_intake", e.target.value)}
              />
            </Section>

            {/* Sleep */}
            <Section title="😴 Sleep Hours">
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 7.5"
                value={form.sleep_hours}
                onChange={(e) => update("sleep_hours", e.target.value)}
              />
            </Section>

            {/* Notes */}
            <Section title="📝 Notes / How you felt">
              <textarea
                rows={3}
                placeholder="Any notes about how you felt today..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Section>

            <button
              type="submit"
              disabled={saving}
              className={`font-semibold rounded-xl py-3.5 mt-2 transition-all ${
                saved
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-amber-500 hover:bg-amber-600 text-black"
              } disabled:opacity-50`}
            >
              {saving ? "Saving..." : saved ? "✓ Saved!" : existingId ? "Update Check-In" : "Save Check-In"}
            </button>
          </form>
        )}
      </div>
      <Nav />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] rounded-2xl p-4 border border-neutral-800">
      <h2 className="text-sm font-semibold text-neutral-300 mb-3">{title}</h2>
      {children}
    </div>
  );
}
