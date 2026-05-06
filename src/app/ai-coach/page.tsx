"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

type PlanType = "workout" | "diet";
type Tier = "free" | "pro" | "pro_max";

type AIPlanRow = {
  id: string;
  plan_type: PlanType;
  status: string;
  inputs: Record<string, unknown>;
  plan: PlanContent;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
};

type Exercise = {
  name: string;
  tracking_mode: string;
  sets?: number;
  reps?: string | number;
  duration_s?: number;
  distance_m?: number;
  rest_s?: number;
  notes?: string;
};
type Session = { name: string; day_of_week?: number; warmup?: string; exercises: Exercise[] };
type Week = { week: number; sessions: Session[] };

type Meal = { name: string; items: { food: string; qty_g: number }[]; kcal: number; protein_g: number; carbs_g: number; fat_g: number };
type Day = { day: number; meals: Meal[] };

type WorkoutPlan = { title: string; summary: string; weeks: Week[] };
type DietPlan = { title: string; summary: string; tdee_kcal: number; target_kcal: number; macros: { protein_g: number; carbs_g: number; fat_g: number }; days: Day[] };
type PlanContent = WorkoutPlan | DietPlan;

const EQUIPMENT_OPTIONS = [
  "Barbell", "Dumbbell", "Kettlebell", "Cable machine", "Pull-up bar",
  "Bench", "Mat", "Bicycle", "Treadmill", "Pool", "Resistance band",
  "Bodyweight only", "Full gym",
];
const ACTIVITY_OPTIONS = [
  "Lifting", "Calisthenics", "Cardio", "Run", "Swim", "Cycle", "Yoga", "Pilates", "HIIT",
];

function isWorkoutPlan(p: PlanContent): p is WorkoutPlan {
  return Array.isArray((p as WorkoutPlan).weeks);
}

export default function AICoachPage() {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  const [usage, setUsage] = useState<{ lifetime: number; month: number } | null>(null);
  const [plans, setPlans] = useState<AIPlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"my-plans" | "new">("my-plans");
  const [planType, setPlanType] = useState<PlanType>("workout");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<AIPlanRow | null>(null);

  // Workout form state
  const [goal, setGoal] = useState<"fat_loss" | "muscle_gain" | "strength" | "endurance" | "general_fitness">("muscle_gain");
  const [timelineWeeks, setTimelineWeeks] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [equipment, setEquipment] = useState<string[]>(["Full gym"]);
  const [activities, setActivities] = useState<string[]>(["Lifting"]);
  const [experience, setExperience] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [injuries, setInjuries] = useState("");

  // Diet form state
  const [dietGoal, setDietGoal] = useState<"fat_loss" | "muscle_gain" | "maintenance" | "recomp">("fat_loss");
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(75);
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState<"M" | "F" | "other">("M");
  const [activityLevel, setActivityLevel] = useState<"sedentary" | "light" | "moderate" | "active" | "very_active">("moderate");
  const [dietPref, setDietPref] = useState<"veg" | "non_veg" | "vegan" | "eggetarian">("non_veg");
  const [allergies, setAllergies] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: usageRow }, { data: planRows }] = await Promise.all([
        supabase.from("profiles").select("tier, pro_expires_at").eq("id", user.id).single(),
        supabase.from("ai_plan_usage").select("lifetime_count, month_count, current_month").eq("user_id", user.id).maybeSingle(),
        supabase.from("ai_plans").select("id, plan_type, status, inputs, plan, created_at, reviewed_at, review_notes").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      const expired = profile?.pro_expires_at && new Date(profile.pro_expires_at) < new Date();
      setTier(expired ? "free" : ((profile?.tier as Tier) || "free"));
      const ym = new Date().toISOString().slice(0, 7);
      setUsage({
        lifetime: usageRow?.lifetime_count ?? 0,
        month: usageRow?.current_month === ym ? (usageRow?.month_count ?? 0) : 0,
      });
      setPlans((planRows as AIPlanRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  function toggle<T extends string>(arr: T[], setter: (v: T[]) => void, val: T) {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  async function generate() {
    if (!user) return;
    setGenerating(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const body = planType === "workout" ? {
      plan_type: "workout" as const,
      goal, timeline_weeks: timelineWeeks, days_per_week: daysPerWeek,
      session_minutes: sessionMinutes,
      equipment: equipment.map(e => e.toLowerCase()),
      activity_types: activities.map(a => a.toLowerCase()),
      experience,
      injuries: injuries.split(",").map(s => s.trim()).filter(Boolean),
    } : {
      plan_type: "diet" as const,
      goal: dietGoal, height_cm: heightCm, weight_kg: weightKg, age, sex,
      activity_level: activityLevel, dietary_pref: dietPref,
      allergies: allergies.split(",").map(s => s.trim()).filter(Boolean),
      cuisine: "indian",
    };

    const res = await fetch("/api/ai-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(json.error || "Failed to generate plan");
      return;
    }
    // Reload list
    const { data: refreshed } = await supabase
      .from("ai_plans")
      .select("id, plan_type, status, inputs, plan, created_at, reviewed_at, review_notes")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPlans((refreshed as AIPlanRow[]) || []);
    setUsage(u => u ? { lifetime: u.lifetime + 1, month: u.month + 1 } : { lifetime: 1, month: 1 });
    const newPlan = (refreshed as AIPlanRow[] | null)?.find(p => p.id === json.plan_id);
    if (newPlan) setActivePlan(newPlan);
    setTab("my-plans");
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const limit = tier === "pro_max" ? 100 : tier === "pro" ? 30 : 1;
  const used = tier === "free" ? (usage?.lifetime ?? 0) : (usage?.month ?? 0);
  // BETA: limits disabled — never block generation
  const BETA_MODE = true;
  const blocked = !BETA_MODE && used >= limit;

  if (activePlan) {
    return <PlanView plan={activePlan} onBack={() => setActivePlan(null)} />;
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Coach</h1>
          <p className="text-xs text-neutral-500">Personalized plans, generated in seconds</p>
        </div>
        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
          tier === "pro_max" ? "bg-amber-500 text-black" : tier === "pro" ? "bg-amber-500/20 text-amber-400" : "bg-neutral-800 text-neutral-400"
        }`}>{tier === "pro_max" ? "Pro Max" : tier}</span>
      </header>

      {/* Usage bar */}
      <div className="mx-4 mb-3 bg-neutral-900 border border-neutral-800 rounded-lg p-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-neutral-400">Plans generated</span>
          <span className="font-medium">{usage?.lifetime ?? 0} {BETA_MODE && <span className="text-emerald-400 text-[10px] uppercase font-bold ml-1">· beta · unlimited</span>}</span>
        </div>
        {tier === "pro_max" && (
          <p className="text-[10px] text-amber-400 mt-2">✨ Plans you generate are auto-queued for human coach review (within 24h)</p>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 mb-3 flex gap-2">
        <button
          onClick={() => setTab("my-plans")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === "my-plans" ? "bg-amber-500 text-black" : "bg-neutral-900 text-neutral-400"}`}
        >My Plans ({plans.length})</button>
        <button
          onClick={() => setTab("new")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === "new" ? "bg-amber-500 text-black" : "bg-neutral-900 text-neutral-400"}`}
        >+ New Plan</button>
      </div>

      {tab === "my-plans" && (
        <div className="px-4 space-y-2">
          {plans.length === 0 && (
            <div className="text-center py-12 text-neutral-500 text-sm">
              No plans yet. Tap <span className="text-amber-500">+ New Plan</span> to generate one.
            </div>
          )}
          {plans.map(p => {
            const title = p.plan?.title || (p.plan_type === "workout" ? "Workout Plan" : "Diet Plan");
            return (
              <button
                key={p.id}
                onClick={() => setActivePlan(p)}
                className="w-full text-left bg-neutral-900 border border-neutral-800 rounded-xl p-3 hover:border-neutral-700"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-sm">{title}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-[11px] text-neutral-500">
                  {p.plan_type === "workout" ? "💪 Training" : "🥗 Nutrition"}
                  {" · "}
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {tab === "new" && (
        <div className="px-4 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setPlanType("workout")}
              className={`flex-1 py-3 rounded-lg text-sm font-medium ${planType === "workout" ? "bg-amber-500 text-black" : "bg-neutral-900 text-neutral-400"}`}
            >💪 Workout</button>
            <button
              onClick={() => setPlanType("diet")}
              className={`flex-1 py-3 rounded-lg text-sm font-medium ${planType === "diet" ? "bg-amber-500 text-black" : "bg-neutral-900 text-neutral-400"}`}
            >🥗 Diet</button>
          </div>

          {planType === "workout" ? (
            <>
              <Field label="Goal">
                <select value={goal} onChange={e => setGoal(e.target.value as typeof goal)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm">
                  <option value="fat_loss">Fat loss</option>
                  <option value="muscle_gain">Muscle gain</option>
                  <option value="strength">Strength</option>
                  <option value="endurance">Endurance</option>
                  <option value="general_fitness">General fitness</option>
                </select>
              </Field>
              <Field label="Experience">
                <select value={experience} onChange={e => setExperience(e.target.value as typeof experience)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Weeks"><input type="number" value={timelineWeeks} onChange={e => setTimelineWeeks(parseInt(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm" /></Field>
                <Field label="Days/wk"><input type="number" value={daysPerWeek} onChange={e => setDaysPerWeek(parseInt(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm" /></Field>
                <Field label="Min/session"><input type="number" value={sessionMinutes} onChange={e => setSessionMinutes(parseInt(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm" /></Field>
              </div>
              <Field label="Equipment available">
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT_OPTIONS.map(e => (
                    <button key={e} onClick={() => toggle(equipment, setEquipment, e)} className={`text-xs px-2.5 py-1.5 rounded-full border ${equipment.includes(e) ? "bg-amber-500 text-black border-amber-500" : "bg-neutral-900 text-neutral-400 border-neutral-800"}`}>{e}</button>
                  ))}
                </div>
              </Field>
              <Field label="Activity types">
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_OPTIONS.map(a => (
                    <button key={a} onClick={() => toggle(activities, setActivities, a)} className={`text-xs px-2.5 py-1.5 rounded-full border ${activities.includes(a) ? "bg-amber-500 text-black border-amber-500" : "bg-neutral-900 text-neutral-400 border-neutral-800"}`}>{a}</button>
                  ))}
                </div>
              </Field>
              <Field label="Injuries / limitations (comma-separated, optional)">
                <input value={injuries} onChange={e => setInjuries(e.target.value)} placeholder="e.g. lower back, left shoulder" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm" />
              </Field>
            </>
          ) : (
            <>
              <Field label="Goal">
                <select value={dietGoal} onChange={e => setDietGoal(e.target.value as typeof dietGoal)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm">
                  <option value="fat_loss">Fat loss</option>
                  <option value="muscle_gain">Muscle gain</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="recomp">Recomposition</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Height (cm)"><input type="number" value={heightCm} onChange={e => setHeightCm(parseInt(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm" /></Field>
                <Field label="Weight (kg)"><input type="number" value={weightKg} onChange={e => setWeightKg(parseInt(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm" /></Field>
                <Field label="Age"><input type="number" value={age} onChange={e => setAge(parseInt(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm" /></Field>
                <Field label="Sex">
                  <select value={sex} onChange={e => setSex(e.target.value as typeof sex)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm">
                    <option value="M">Male</option><option value="F">Female</option><option value="other">Other</option>
                  </select>
                </Field>
              </div>
              <Field label="Activity level">
                <select value={activityLevel} onChange={e => setActivityLevel(e.target.value as typeof activityLevel)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm">
                  <option value="sedentary">Sedentary (desk job, no exercise)</option>
                  <option value="light">Light (1-3 workouts/wk)</option>
                  <option value="moderate">Moderate (3-5 workouts/wk)</option>
                  <option value="active">Active (6+ workouts/wk)</option>
                  <option value="very_active">Very active (athlete)</option>
                </select>
              </Field>
              <Field label="Dietary preference">
                <div className="flex flex-wrap gap-1.5">
                  {(["non_veg", "veg", "eggetarian", "vegan"] as const).map(p => (
                    <button key={p} onClick={() => setDietPref(p)} className={`text-xs px-2.5 py-1.5 rounded-full border ${dietPref === p ? "bg-amber-500 text-black border-amber-500" : "bg-neutral-900 text-neutral-400 border-neutral-800"}`}>{p.replace("_", " ")}</button>
                  ))}
                </div>
              </Field>
              <Field label="Allergies (comma-separated, optional)">
                <input value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. peanuts, lactose" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm" />
              </Field>
              <p className="text-[10px] text-neutral-500 italic">
                AI-generated nutrition guidance is informational only. Consult a registered dietitian for medical conditions.
              </p>
            </>
          )}

          <button
            onClick={generate}
            disabled={generating || blocked}
            className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50"
          >
            {generating ? "Generating… (10–15s)" : blocked ? "Limit reached — Upgrade" : "✨ Generate Plan"}
          </button>
          {tier === "pro_max" && (
            <p className="text-[10px] text-center text-amber-400">Plan will be queued for coach review within 24h</p>
          )}
        </div>
      )}

      <Nav />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase text-neutral-500 mb-1.5 font-medium">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:           { label: "Draft", cls: "bg-neutral-800 text-neutral-400" },
    active:          { label: "Active", cls: "bg-emerald-500/20 text-emerald-400" },
    pending_review:  { label: "Awaiting coach", cls: "bg-amber-500/20 text-amber-400" },
    reviewed:        { label: "Coach reviewed ✓", cls: "bg-blue-500/20 text-blue-400" },
    archived:        { label: "Archived", cls: "bg-neutral-900 text-neutral-600" },
  };
  const m = map[status] || { label: status, cls: "bg-neutral-800 text-neutral-400" };
  return <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}

function PlanView({ plan, onBack }: { plan: AIPlanRow; onBack: () => void }) {
  const content = plan.plan;
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-4 py-4 flex items-center gap-3 sticky top-0 bg-black/80 backdrop-blur z-10">
        <button onClick={onBack} className="text-neutral-400">← Back</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{content?.title || "Plan"}</h1>
          <p className="text-[11px] text-neutral-500 truncate">{content?.summary}</p>
        </div>
        <StatusBadge status={plan.status} />
      </header>

      {plan.review_notes && (
        <div className="mx-4 mb-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-[10px] uppercase text-blue-400 font-bold mb-1">Coach notes</p>
          <p className="text-xs text-neutral-300 whitespace-pre-wrap">{plan.review_notes}</p>
        </div>
      )}

      {plan.plan_type === "workout" && isWorkoutPlan(content) && (
        <div className="px-4 space-y-4">
          {content.weeks?.map(w => (
            <div key={w.week} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-neutral-950 border-b border-neutral-800 text-xs uppercase text-neutral-400 font-bold">Week {w.week}</div>
              <div className="divide-y divide-neutral-800">
                {w.sessions?.map((s, i) => (
                  <div key={i} className="p-3">
                    <h3 className="text-sm font-semibold mb-1">{s.name}</h3>
                    {s.warmup && <p className="text-[11px] text-neutral-500 mb-2">🔥 {s.warmup}</p>}
                    <div className="space-y-1">
                      {s.exercises?.map((ex, j) => (
                        <div key={j} className="text-xs flex items-baseline justify-between gap-2 py-0.5">
                          <span className="text-neutral-200">{ex.name}</span>
                          <span className="text-neutral-500 text-[10px] shrink-0">
                            {ex.tracking_mode === "sets_reps" && `${ex.sets ?? "?"}×${ex.reps ?? "?"}`}
                            {ex.tracking_mode === "time" && `${Math.round((ex.duration_s || 0) / 60)}min`}
                            {ex.tracking_mode === "time_distance" && `${Math.round((ex.duration_s || 0) / 60)}min · ${((ex.distance_m || 0) / 1000).toFixed(1)}km`}
                            {ex.tracking_mode === "distance" && `${((ex.distance_m || 0) / 1000).toFixed(1)}km`}
                            {ex.tracking_mode === "flow" && `${Math.round((ex.duration_s || 0) / 60)}min flow`}
                            {ex.rest_s ? ` · rest ${ex.rest_s}s` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {plan.plan_type === "diet" && !isWorkoutPlan(content) && (
        <div className="px-4 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><p className="text-[9px] uppercase text-neutral-500">TDEE</p><p className="text-sm font-bold">{content.tdee_kcal}</p></div>
              <div><p className="text-[9px] uppercase text-neutral-500">Target</p><p className="text-sm font-bold text-amber-500">{content.target_kcal}</p></div>
              <div><p className="text-[9px] uppercase text-neutral-500">Protein</p><p className="text-sm font-bold">{content.macros?.protein_g}g</p></div>
              <div><p className="text-[9px] uppercase text-neutral-500">C / F</p><p className="text-sm font-bold">{content.macros?.carbs_g}/{content.macros?.fat_g}</p></div>
            </div>
          </div>
          {content.days?.map(d => (
            <div key={d.day} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-neutral-950 border-b border-neutral-800 text-xs uppercase text-neutral-400 font-bold">Day {d.day}</div>
              <div className="divide-y divide-neutral-800">
                {d.meals?.map((m, i) => (
                  <div key={i} className="p-3">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-sm font-semibold">{m.name}</h3>
                      <span className="text-[10px] text-neutral-500">{m.kcal} kcal · P{m.protein_g} C{m.carbs_g} F{m.fat_g}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      {m.items?.map(it => `${it.food} ${it.qty_g}g`).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Nav />
    </div>
  );
}
