"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";

type Coach = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "trainer" | "nutritionist";
  trainer_specialty: string | null;
  trainer_bio: string | null;
  trainer_city: string | null;
  trainer_experience_years: number | null;
  trainer_certifications: string | null;
  trainer_rate_inr: number | null;
  trainer_hourly_inr: number | null;
  trainer_session_inr: number | null;
  trainer_accepting_clients: boolean | null;
  trainer_languages: string | null;
  trainer_modes: string | null;
};

type Filter = "all" | "trainer" | "nutritionist";

export default function CoachesPage() {
  const { user, loading: authLoading } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: dirData }, { data: pending }, { data: linked }] = await Promise.all([
        supabase.from("coach_directory").select("*").order("trainer_accepting_clients", { ascending: false }),
        supabase.from("coaching_requests").select("coach_id").eq("client_id", user.id).eq("status", "pending"),
        supabase.from("trainer_clients").select("trainer_id").eq("client_id", user.id).eq("status", "active"),
      ]);
      if (!alive) return;
      setCoaches((dirData as Coach[]) || []);
      setPendingIds(new Set((pending || []).map((r: { coach_id: string }) => r.coach_id)));
      setLinkedIds(new Set((linked || []).map((r: { trainer_id: string }) => r.trainer_id)));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coaches.filter(c => {
      if (filter !== "all" && c.role !== filter) return false;
      if (!q) return true;
      return (
        (c.display_name || "").toLowerCase().includes(q) ||
        (c.trainer_specialty || "").toLowerCase().includes(q) ||
        (c.trainer_city || "").toLowerCase().includes(q) ||
        (c.trainer_languages || "").toLowerCase().includes(q)
      );
    });
  }, [coaches, query, filter]);

  async function request(coachId: string) {
    if (!user || requesting) return;
    setRequesting(coachId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/coaching-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ coachId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Couldn't send request", false);
        return;
      }
      setPendingIds(s => new Set(s).add(coachId));
      showToast("Request sent ✉️ — we'll notify you when they respond.", true);
    } finally {
      setRequesting(null);
    }
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-dvh pb-24">
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto">
          <div className={`text-white text-sm rounded-xl px-4 py-3 shadow-lg ${toast.ok ? "bg-green-500/90" : "bg-red-500/90"}`}>{toast.msg}</div>
        </div>
      )}

      <header className="sticky top-0 z-30 backdrop-blur-lg bg-black/80 border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-neutral-400 hover:text-white text-sm">←</Link>
          <h1 className="text-sm font-bold flex-1">Find a Coach</h1>
          <Link href="/my-trainer" className="text-xs text-amber-500 hover:underline">My coaches</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-1">Coaches you can hire 💬</h2>
          <p className="text-sm text-neutral-500">Tap a coach to send a request. They&apos;ll get notified and reply right here.</p>
        </div>

        {/* Filter pills */}
        <div className="grid grid-cols-3 gap-2 mb-3 bg-[#141414] rounded-xl p-1 border border-neutral-800">
          {(["all", "trainer", "nutritionist"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              {f === "trainer" ? "🏆 Trainers" : f === "nutritionist" ? "🥗 Nutritionists" : "All"}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, specialty, city, language…"
          className="w-full mb-4 bg-[#141414] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm placeholder-neutral-600 focus:outline-none focus:border-amber-500/40"
        />

        {filtered.length === 0 ? (
          <div className="text-center text-neutral-500 text-sm py-12 bg-[#141414] border border-neutral-800 rounded-2xl">
            <p className="mb-2">No coaches yet match that.</p>
            <p className="text-[11px] text-neutral-600">Are you a coach? <Link href="/login?mode=signup&role=trainer" className="text-amber-400 hover:underline">Join the marketplace</Link>.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(c => (
              <CoachCard
                key={c.id}
                c={c}
                state={
                  linkedIds.has(c.id) ? "linked"
                    : pendingIds.has(c.id) ? "pending"
                    : "idle"
                }
                busy={requesting === c.id}
                onRequest={() => request(c.id)}
              />
            ))}
          </div>
        )}
      </div>
      <Nav />
    </div>
  );
}

function CoachCard({ c, state, busy, onRequest }: { c: Coach; state: "idle" | "pending" | "linked"; busy: boolean; onRequest: () => void }) {
  const isNutritionist = c.role === "nutritionist";
  const accepting = c.trainer_accepting_clients !== false;

  return (
    <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <Link href={`/users/${c.id}`} className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 font-bold text-lg flex items-center justify-center flex-shrink-0">
          {c.display_name?.[0]?.toUpperCase() || "?"}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/users/${c.id}`} className="font-bold text-sm truncate hover:underline">{c.display_name}</Link>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${isNutritionist ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
              {isNutritionist ? "🥗 Nutritionist" : "🏆 Trainer"}
            </span>
            {!accepting && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-neutral-800 text-neutral-400">
                Roster full
              </span>
            )}
          </div>
          {c.trainer_specialty && <p className="text-[11px] text-neutral-400 mt-0.5">{c.trainer_specialty}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {c.trainer_experience_years != null && <Meta>{c.trainer_experience_years}y exp</Meta>}
            {c.trainer_city && <Meta>📍 {c.trainer_city}</Meta>}
            {c.trainer_languages && <Meta>{c.trainer_languages}</Meta>}
            {c.trainer_modes && <Meta>{c.trainer_modes}</Meta>}
          </div>
        </div>
      </div>

      {c.trainer_bio && <p className="text-[12px] text-neutral-300 leading-relaxed mb-3 line-clamp-3">{c.trainer_bio}</p>}

      {(c.trainer_hourly_inr || c.trainer_session_inr || c.trainer_rate_inr) && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <PriceBox label="Hourly" amount={c.trainer_hourly_inr} />
          <PriceBox label="Per session" amount={c.trainer_session_inr} />
          <PriceBox label="Monthly" amount={c.trainer_rate_inr} />
        </div>
      )}

      <button
        onClick={onRequest}
        disabled={state !== "idle" || busy || !accepting}
        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${
          state === "linked"
            ? "bg-emerald-500/15 text-emerald-400 cursor-default"
            : state === "pending"
            ? "bg-amber-500/15 text-amber-400 cursor-default"
            : !accepting
            ? "bg-neutral-900 text-neutral-600 cursor-not-allowed"
            : "bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50"
        }`}
      >
        {busy ? "Sending..."
          : state === "linked" ? "✓ Connected"
          : state === "pending" ? "⏳ Request sent"
          : !accepting ? "Not accepting clients"
          : "Request coaching"}
      </button>
    </div>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] text-neutral-500">{children}</span>;
}

function PriceBox({ label, amount }: { label: string; amount: number | null }) {
  return (
    <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
      <p className="text-[8px] text-neutral-600 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-bold text-neutral-200">
        {amount != null ? `₹${amount.toLocaleString()}` : "—"}
      </p>
    </div>
  );
}
