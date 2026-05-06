"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

type ReviewRow = {
  id: string;
  plan_id: string;
  client_id: string;
  status: "open" | "claimed" | "completed" | "expired" | "cancelled";
  required_role: "trainer" | "nutritionist";
  claimed_by: string | null;
  claimed_at: string | null;
  claim_expires_at: string | null;
  payout_inr: number;
  created_at: string;
};

type PlanRow = {
  id: string;
  user_id: string;
  plan_type: "workout" | "diet";
  inputs: Record<string, unknown>;
  plan: PlanContent;
  review_notes: string | null;
};

type ProfileRow = { id: string; display_name: string };

type Exercise = {
  name: string; tracking_mode: string; sets?: number; reps?: string | number;
  duration_s?: number; distance_m?: number; rest_s?: number; notes?: string;
};
type Session = { name: string; day_of_week?: number; warmup?: string; exercises: Exercise[] };
type Week = { week: number; sessions: Session[] };
type Meal = { name: string; items: { food: string; qty_g: number }[]; kcal: number; protein_g: number; carbs_g: number; fat_g: number };
type Day = { day: number; meals: Meal[] };
type WorkoutPlan = { title: string; summary: string; weeks: Week[] };
type DietPlan = { title: string; summary: string; tdee_kcal: number; target_kcal: number; macros: { protein_g: number; carbs_g: number; fat_g: number }; days: Day[] };
type PlanContent = WorkoutPlan | DietPlan;

function isWorkoutPlan(p: PlanContent): p is WorkoutPlan {
  return Array.isArray((p as WorkoutPlan).weeks);
}

function timeLeft(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms < 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return hours >= 1 ? `${hours}h ${mins}m left` : `${mins}m left`;
}

export default function CoachQueuePage() {
  const { user, role, loading: authLoading } = useAuth({ requireRole: "coach" });
  const [openReviews, setOpenReviews] = useState<ReviewRow[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewRow[]>([]);
  const [plansById, setPlansById] = useState<Record<string, PlanRow>>({});
  const [clientsById, setClientsById] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "claimed">("claimed");
  const [activeReview, setActiveReview] = useState<ReviewRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Open queue (RLS filters to matching role)
    const [{ data: open }, { data: mine }] = await Promise.all([
      supabase
        .from("plan_reviews")
        .select("id, plan_id, client_id, status, required_role, claimed_by, claimed_at, claim_expires_at, payout_inr, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("plan_reviews")
        .select("id, plan_id, client_id, status, required_role, claimed_by, claimed_at, claim_expires_at, payout_inr, created_at")
        .eq("claimed_by", user.id)
        .in("status", ["claimed", "completed"])
        .order("claimed_at", { ascending: false })
        .limit(50),
    ]);

    const allReviews = [...(open || []), ...(mine || [])] as ReviewRow[];
    const planIds = Array.from(new Set(allReviews.map(r => r.plan_id)));
    const clientIds = Array.from(new Set(allReviews.map(r => r.client_id)));

    const [{ data: plans }, { data: profs }] = await Promise.all([
      planIds.length
        ? supabase.from("ai_plans").select("id, user_id, plan_type, inputs, plan, review_notes").in("id", planIds)
        : Promise.resolve({ data: [] as PlanRow[] }),
      clientIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", clientIds)
        : Promise.resolve({ data: [] as ProfileRow[] }),
    ]);

    const planMap: Record<string, PlanRow> = {};
    (plans as PlanRow[] | null)?.forEach(p => { planMap[p.id] = p; });
    const profMap: Record<string, ProfileRow> = {};
    (profs as ProfileRow[] | null)?.forEach(p => { profMap[p.id] = p; });

    setOpenReviews((open || []) as ReviewRow[]);
    setMyReviews((mine || []) as ReviewRow[]);
    setPlansById(planMap);
    setClientsById(profMap);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function claim(reviewId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/plan-review/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ reviewId }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || "Claim failed");
      return;
    }
    showToast("✓ Claimed — 24h to complete");
    setTab("claimed");
    await load();
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter open queue to matching role (defensive — RLS already does this)
  const openForMe = openReviews.filter(r => r.required_role === role);
  const claimedActive = myReviews.filter(r => r.status === "claimed");
  const claimedDone = myReviews.filter(r => r.status === "completed");

  if (activeReview) {
    const plan = plansById[activeReview.plan_id];
    const client = clientsById[activeReview.client_id];
    if (!plan) {
      return (
        <div className="p-4">
          <button onClick={() => setActiveReview(null)} className="text-neutral-400 mb-3">← Back</button>
          <p className="text-sm text-red-400">Plan not found.</p>
        </div>
      );
    }
    return (
      <ReviewEditor
        review={activeReview}
        plan={plan}
        clientName={client?.display_name || "Client"}
        onBack={() => setActiveReview(null)}
        onCompleted={async () => { setActiveReview(null); await load(); showToast("✓ Review submitted"); }}
      />
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-4 py-4 flex items-center gap-3">
        <Link href="/trainer" className="text-neutral-400">←</Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-xs text-neutral-500">₹{50} per review · 24h SLA from claim</p>
        </div>
      </header>

      <div className="px-4 mb-3 flex gap-2">
        <button
          onClick={() => setTab("claimed")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === "claimed" ? "bg-amber-500 text-black" : "bg-neutral-900 text-neutral-400"}`}
        >My Claims ({claimedActive.length})</button>
        <button
          onClick={() => setTab("open")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === "open" ? "bg-amber-500 text-black" : "bg-neutral-900 text-neutral-400"}`}
        >Open ({openForMe.length})</button>
      </div>

      {tab === "claimed" && (
        <div className="px-4 space-y-2">
          {claimedActive.length === 0 && claimedDone.length === 0 && (
            <div className="text-center py-12 text-neutral-500 text-sm">
              No reviews claimed yet. Check the <button onClick={() => setTab("open")} className="text-amber-500 underline">open queue</button>.
            </div>
          )}
          {claimedActive.map(r => {
            const plan = plansById[r.plan_id];
            const client = clientsById[r.client_id];
            return (
              <button key={r.id} onClick={() => setActiveReview(r)}
                className="w-full text-left bg-neutral-900 border border-amber-500/30 rounded-xl p-3 hover:border-amber-500/60">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-sm">{plan?.plan?.title || "Plan"}</h3>
                  <span className="text-[10px] font-bold text-amber-400">{timeLeft(r.claim_expires_at)}</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  {plan?.plan_type === "workout" ? "💪" : "🥗"} for {client?.display_name || "Client"} · ₹{r.payout_inr}
                </p>
              </button>
            );
          })}
          {claimedDone.length > 0 && (
            <>
              <p className="pt-4 text-[10px] uppercase text-neutral-500 font-bold">Completed</p>
              {claimedDone.map(r => {
                const plan = plansById[r.plan_id];
                const client = clientsById[r.client_id];
                return (
                  <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 opacity-70">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm">{plan?.plan?.title || "Plan"}</h3>
                      <span className="text-[10px] text-emerald-400">✓ Done</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">{client?.display_name} · ₹{r.payout_inr} pending payout</p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === "open" && (
        <div className="px-4 space-y-2">
          {openForMe.length === 0 && (
            <div className="text-center py-12 text-neutral-500 text-sm">No open reviews right now. Check back later.</div>
          )}
          {openForMe.map(r => {
            const plan = plansById[r.plan_id];
            const client = clientsById[r.client_id];
            const inputs = (plan?.inputs ?? {}) as Record<string, unknown>;
            return (
              <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-sm">{plan?.plan?.title || (plan?.plan_type === "diet" ? "Diet Plan" : "Workout Plan")}</h3>
                  <span className="text-[10px] font-bold text-amber-500">₹{r.payout_inr}</span>
                </div>
                <p className="text-[11px] text-neutral-500 mb-2">
                  {plan?.plan_type === "workout" ? "💪 Training" : "🥗 Nutrition"} for {client?.display_name || "Client"}
                </p>
                <div className="text-[10px] text-neutral-400 mb-3 leading-relaxed">
                  Goal: <span className="text-neutral-200">{String(inputs.goal ?? "—")}</span>
                  {inputs.timeline_weeks ? <> · {String(inputs.timeline_weeks)}w</> : null}
                  {inputs.days_per_week ? <> · {String(inputs.days_per_week)}d/wk</> : null}
                  {inputs.experience ? <> · {String(inputs.experience)}</> : null}
                </div>
                <button onClick={() => claim(r.id)}
                  className="w-full bg-amber-500 text-black font-bold py-2 rounded-lg text-xs">
                  Claim review
                </button>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-lg text-sm shadow-lg z-50">{toast}</div>
      )}
    </div>
  );
}

function ReviewEditor({
  review, plan, clientName, onBack, onCompleted,
}: {
  review: ReviewRow;
  plan: PlanRow;
  clientName: string;
  onBack: () => void;
  onCompleted: () => void;
}) {
  const [draft, setDraft] = useState<string>(JSON.stringify(plan.plan, null, 2));
  const [notes, setNotes] = useState<string>(plan.review_notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch (e) {
      setError("Plan JSON is invalid: " + (e instanceof Error ? e.message : "parse error"));
      return;
    }
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/plan-review/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ reviewId: review.id, updatedPlan: parsed, notes }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error || "Submit failed");
      return;
    }
    onCompleted();
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-4 py-4 flex items-center gap-3 sticky top-0 bg-black/80 backdrop-blur z-10 border-b border-neutral-900">
        <button onClick={onBack} className="text-neutral-400">← Back</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{(plan.plan as { title?: string })?.title || "Plan"}</h1>
          <p className="text-[11px] text-neutral-500 truncate">For {clientName} · {timeLeft(review.claim_expires_at)}</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Plan summary */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
          <p className="text-[10px] uppercase text-neutral-500 font-bold mb-2">Read-only preview</p>
          {plan.plan_type === "workout" && isWorkoutPlan(plan.plan) && (
            <div className="space-y-2">
              {plan.plan.weeks?.slice(0, 2).map(w => (
                <div key={w.week}>
                  <p className="text-xs font-bold text-amber-400">Week {w.week}</p>
                  {w.sessions?.map((s, i) => (
                    <div key={i} className="text-[11px] text-neutral-400 ml-2">
                      • {s.name} — {s.exercises?.length} exercises
                    </div>
                  ))}
                </div>
              ))}
              {plan.plan.weeks && plan.plan.weeks.length > 2 && (
                <p className="text-[10px] text-neutral-600">…+{plan.plan.weeks.length - 2} more weeks</p>
              )}
            </div>
          )}
          {plan.plan_type === "diet" && !isWorkoutPlan(plan.plan) && (
            <div className="text-xs text-neutral-400">
              {plan.plan.target_kcal} kcal · P{plan.plan.macros?.protein_g} C{plan.plan.macros?.carbs_g} F{plan.plan.macros?.fat_g} · {plan.plan.days?.length} days
            </div>
          )}
        </div>

        <div>
          <label className="block text-[11px] uppercase text-neutral-500 mb-1.5 font-medium">Edit plan JSON</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={20}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-[11px] font-mono leading-relaxed"
            spellCheck={false}
          />
          <p className="text-[10px] text-neutral-600 mt-1">Edit values directly. Must remain valid JSON.</p>
        </div>

        <div>
          <label className="block text-[11px] uppercase text-neutral-500 mb-1.5 font-medium">Notes for client</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="What you changed and why, plus any cues / form tips."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">{error}</div>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50"
        >
          {submitting ? "Submitting…" : `Submit review · earn ₹${review.payout_inr}`}
        </button>
      </div>
    </div>
  );
}
