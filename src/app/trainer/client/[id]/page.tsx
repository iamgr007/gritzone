"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

type CheckinRow = {
  date: string;
  morning_weight: number | null;
  workout_done: boolean;
  workout_details: string;
  steps_count: number;
  water_intake: number;
  sleep_hours: number;
  notes: string;
};

type Profile = {
  id: string;
  display_name: string;
  avatar_url?: string | null;
};

export default function TrainerClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = usePromise(params);
  const { user, role, loading: authLoading } = useAuth({ requireRole: "coach" });
  const isNutritionist = role === "nutritionist";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [linkInfo, setLinkInfo] = useState<{ id: string; notes: string | null } | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Verify the trainer-client link exists and is active
      const { data: link } = await supabase
        .from("trainer_clients")
        .select("id, notes, status")
        .eq("trainer_id", user.id)
        .eq("client_id", clientId)
        .eq("status", "active")
        .maybeSingle();

      if (!link) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      setLinkInfo({ id: link.id, notes: link.notes });
      setNotesDraft(link.notes || "");

      const [{ data: prof }, { data: cks }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("id", clientId)
          .maybeSingle(),
        supabase
          .from("checkins")
          .select("date, morning_weight, workout_done, workout_details, steps_count, water_intake, sleep_hours, notes")
          .eq("user_id", clientId)
          .order("date", { ascending: false })
          .limit(30),
      ]);

      setProfile(prof as Profile | null);
      setCheckins((cks as CheckinRow[]) || []);
      setLoading(false);
    })();
  }, [user, clientId]);

  async function saveNotes() {
    if (!linkInfo) return;
    setSavingNotes(true);
    await supabase
      .from("trainer_clients")
      .update({ notes: notesDraft })
      .eq("id", linkInfo.id);
    setSavingNotes(false);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-3xl mb-2">🚫</p>
          <p className="text-sm text-neutral-300 mb-3">This client is not on your active roster.</p>
          <Link href="/trainer" className="text-amber-400 text-sm hover:underline">← Back to roster</Link>
        </div>
      </div>
    );
  }

  // Compute streaks/adherence
  const today = new Date();
  const last7: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7.push(d.toISOString().slice(0, 10));
  }
  const checkinDates = new Set(checkins.map((c) => c.date));
  const adherence7 = last7.filter((d) => checkinDates.has(d)).length;

  return (
    <div className="min-h-dvh pb-12">
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-black/80 border-b border-neutral-900">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/trainer" className="text-neutral-400 hover:text-white text-sm">←</Link>
          <h1 className="text-sm font-bold flex-1 truncate">{profile?.display_name || "Client"}</h1>
          <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">{isNutritionist ? "Nutritionist view" : "Trainer view"}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        {/* Adherence */}
        <section className="bg-[#141414] border border-neutral-800 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Last 7 days</h2>
            <span className="text-xs text-amber-400 font-bold">{adherence7}/7</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {last7.slice().reverse().map((d) => {
              const checked = checkinDates.has(d);
              return (
                <div
                  key={d}
                  className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-bold ${checked ? "bg-green-500/30 text-green-300 border border-green-500/40" : "bg-neutral-900 border border-neutral-800 text-neutral-600"}`}
                >
                  {d.slice(8)}
                </div>
              );
            })}
          </div>
        </section>

        {/* Trainer notes */}
        <section className="bg-[#141414] border border-neutral-800 rounded-2xl p-4 mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Your private notes on this client</h2>
          <textarea
            rows={3}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Goals, injuries, plan adjustments..."
            className="text-sm mb-2"
          />
          <div className="flex justify-end">
            <button
              onClick={saveNotes}
              disabled={savingNotes || notesDraft === (linkInfo?.notes || "")}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-lg px-3 py-1.5 text-xs"
            >
              {savingNotes ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        {/* Recent check-ins */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Recent activity</h2>
          {checkins.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">No check-ins yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {checkins.map((c) => (
                <div key={c.date} className="bg-[#141414] border border-neutral-800 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">{c.date}</p>
                    {c.workout_done && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Workout ✓</span>}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px] text-neutral-500">
                    {c.morning_weight ? <Cell label="Weight" value={`${c.morning_weight}kg`} /> : null}
                    <Cell label="Steps" value={c.steps_count.toLocaleString()} />
                    <Cell label="Water" value={`${c.water_intake}L`} />
                    <Cell label="Sleep" value={`${c.sleep_hours}h`} />
                  </div>
                  {c.workout_details && (
                    <p className="text-[11px] text-neutral-400 mt-2 line-clamp-2">💪 {c.workout_details}</p>
                  )}
                  {c.notes && (
                    <p className="text-[11px] text-neutral-400 mt-1 italic line-clamp-2">📝 {c.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-neutral-600 uppercase tracking-wider text-[8px]">{label}</p>
      <p className="text-neutral-200 text-xs font-semibold">{value}</p>
    </div>
  );
}
