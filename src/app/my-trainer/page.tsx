"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

type TrainerInfo = {
  link_id: string;
  trainer_id: string;
  display_name: string;
  trainer_specialty: string | null;
  trainer_bio: string | null;
  trainer_city: string | null;
  trainer_experience_years: number | null;
  trainer_certifications: string | null;
  started_at: string;
};

export default function MyTrainerPage() {
  const { user, loading: authLoading } = useAuth({ requireRole: "client" });
  const [trainers, setTrainers] = useState<TrainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("trainer_clients")
      .select("id, started_at, status, trainer:profiles!trainer_clients_trainer_id_fkey(id, display_name, trainer_specialty, trainer_bio, trainer_city, trainer_experience_years, trainer_certifications)")
      .eq("client_id", user.id)
      .eq("status", "active");
    type Row = {
      id: string;
      started_at: string;
      trainer: {
        id: string;
        display_name: string;
        trainer_specialty: string | null;
        trainer_bio: string | null;
        trainer_city: string | null;
        trainer_experience_years: number | null;
        trainer_certifications: string | null;
      } | null;
    };
    const rows: TrainerInfo[] = ((data as unknown as Row[]) || [])
      .filter((r) => r.trainer)
      .map((r) => ({
        link_id: r.id,
        trainer_id: r.trainer!.id,
        display_name: r.trainer!.display_name,
        trainer_specialty: r.trainer!.trainer_specialty,
        trainer_bio: r.trainer!.trainer_bio,
        trainer_city: r.trainer!.trainer_city,
        trainer_experience_years: r.trainer!.trainer_experience_years,
        trainer_certifications: r.trainer!.trainer_certifications,
        started_at: r.started_at,
      }));
    setTrainers(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function redeem() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setRedeeming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/trainer/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Couldn't connect with that code", false);
        return;
      }
      showToast(`Connected with ${data.trainer?.name || "your trainer"}!`, true);
      setCode("");
      load();
    } finally {
      setRedeeming(false);
    }
  }

  async function disconnect(linkId: string, trainerName: string) {
    if (!confirm(`Disconnect from ${trainerName}? They'll lose access to your data immediately. You can reconnect later with a new code.`)) return;
    await supabase.from("trainer_clients").delete().eq("id", linkId);
    load();
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-12">
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto">
          <div className={`text-white text-sm rounded-xl px-4 py-3 shadow-lg ${toast.ok ? "bg-green-500/90" : "bg-red-500/90"}`}>
            {toast.msg}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 backdrop-blur-lg bg-black/80 border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/settings" className="text-neutral-400 hover:text-white text-sm">←</Link>
          <h1 className="text-sm font-bold flex-1">My Trainer</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <p className="text-xs text-neutral-500 mb-4">
          Connect with a coach to let them see your check-ins, workouts, and meals. They&apos;ll guide your plan based on your real data.
        </p>

        {/* Connected trainers */}
        {loading ? null : trainers.length > 0 && (
          <section className="flex flex-col gap-3 mb-6">
            {trainers.map((t) => (
              <div key={t.link_id} className="bg-[#141414] border border-amber-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 font-bold text-lg flex items-center justify-center flex-shrink-0">
                    {t.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{t.display_name}</p>
                    {t.trainer_specialty && <p className="text-[11px] text-amber-400">{t.trainer_specialty}</p>}
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-[10px] mb-3">
                  {t.trainer_experience_years != null && (
                    <Stat label="Experience" value={`${t.trainer_experience_years} yr`} />
                  )}
                  {t.trainer_city && <Stat label="City" value={t.trainer_city} />}
                  <Stat label="Connected" value={new Date(t.started_at).toLocaleDateString()} />
                </dl>
                {t.trainer_bio && <p className="text-[11px] text-neutral-300 leading-relaxed mb-3">{t.trainer_bio}</p>}
                {t.trainer_certifications && (
                  <p className="text-[10px] text-neutral-500 mb-3">📜 {t.trainer_certifications}</p>
                )}
                <button
                  onClick={() => disconnect(t.link_id, t.display_name)}
                  className="text-[11px] text-red-400 hover:text-red-300"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Redeem code */}
        <section className="bg-[#141414] border border-neutral-800 rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-1">Connect with a trainer</h2>
          <p className="text-[11px] text-neutral-500 mb-3">Got an invite code from your coach? Enter it below.</p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GZ-XXXXXX"
              maxLength={20}
              className="flex-1 font-mono text-sm tracking-wider"
            />
            <button
              onClick={redeem}
              disabled={redeeming || !code.trim()}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold px-5 rounded-xl text-sm"
            >
              {redeeming ? "..." : "Connect"}
            </button>
          </div>
          <p className="text-[10px] text-neutral-600 mt-3">
            🔒 Your trainer will only see check-ins, workouts, and meals — not your password or payment info. You can disconnect anytime.
          </p>
        </section>

        <div className="mt-8 text-center">
          <p className="text-[11px] text-neutral-500 mb-2">Are you a trainer?</p>
          <Link href="/login?mode=signup&role=trainer" className="text-amber-400 text-xs hover:underline">
            Create a trainer account →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-900/50 rounded-lg p-2">
      <p className="text-neutral-600 uppercase tracking-wider text-[8px]">{label}</p>
      <p className="text-neutral-200 font-semibold">{value}</p>
    </div>
  );
}
