"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import Link from "next/link";

type Ebook = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_emoji: string;
  cover_gradient: string;
  category: string | null;
  difficulty: string | null;
  pages: number | null;
  pdf_url: string | null;
  min_tier: string;
  required_level: number;
  highlights: string[] | null;
};

const CATEGORIES = [
  { key: "all", label: "All", icon: "📚" },
  { key: "fatloss", label: "Fat Loss", icon: "🔥" },
  { key: "muscle", label: "Muscle", icon: "💪" },
  { key: "nutrition", label: "Nutrition", icon: "🍛" },
  { key: "beginner", label: "Beginner", icon: "🌱" },
  { key: "recovery", label: "Recovery", icon: "🧘" },
];

export default function EbooksPage() {
  const { user, loading: authLoading } = useAuth();
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [userTier, setUserTier] = useState("free");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Ebook | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ebooks").select("*").eq("active", true).order("sort_order");
      setEbooks((data || []) as Ebook[]);
      if (user) {
        const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
        setUserTier((p as { tier?: string } | null)?.tier || "free");
      }
      setLoading(false);
    })();
  }, [user]);

  function canRead(e: Ebook) {
    if (e.min_tier === "free") return true;
    if (e.min_tier === "pro") return userTier === "pro" || userTier === "pro_max";
    if (e.min_tier === "pro_max") return userTier === "pro_max";
    return false;
  }

  async function handleRead(e: Ebook) {
    if (!canRead(e)) return;
    if (!e.pdf_url) { alert("This guide is launching soon. We'll notify you."); return; }
    if (user) await supabase.from("ebook_downloads").insert({ user_id: user.id, ebook_id: e.id });
    window.open(e.pdf_url, "_blank");
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const filtered = filter === "all" ? ebooks : ebooks.filter(e => e.category === filter);

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight">Free Guides</h1>
          <p className="text-xs text-neutral-500">Read anywhere. Built by the GRITZONE team.</p>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${filter === c.key ? "bg-amber-500 text-black border-amber-500" : "bg-[#141414] border-neutral-800 text-neutral-400"}`}
            >{c.icon} {c.label}</button>
          ))}
        </div>

        {/* Ebook grid */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(e => {
            const locked = !canRead(e);
            return (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className="text-left bg-[#141414] border border-neutral-800 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all active:scale-[0.98]"
              >
                <div className={`relative aspect-[3/4] bg-gradient-to-br ${e.cover_gradient} flex flex-col items-center justify-center p-3`}>
                  <span className="text-4xl mb-2 drop-shadow-lg">{e.cover_emoji}</span>
                  <p className="text-white text-xl font-black tracking-wider text-center leading-none drop-shadow-lg">{e.title}</p>
                  {e.subtitle && <p className="text-white/80 text-[9px] mt-2 text-center leading-tight drop-shadow">{e.subtitle}</p>}
                  {locked && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                      <span className="text-2xl mb-1">🔒</span>
                      <p className="text-white text-[10px] font-bold uppercase">{e.min_tier === "pro" ? "Pro" : "Pro Max"} only</p>
                    </div>
                  )}
                  {!e.pdf_url && !locked && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">SOON</div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-[10px] text-neutral-500 uppercase">{e.difficulty}</p>
                  <p className="text-xs text-neutral-300 line-clamp-2 mt-0.5">{e.description}</p>
                  {e.pages && <p className="text-[10px] text-neutral-600 mt-1">{e.pages} pages</p>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 bg-[#141414] border border-neutral-800 rounded-2xl p-4">
          <p className="text-sm font-bold mb-1">📬 Want a topic covered?</p>
          <p className="text-xs text-neutral-500">Email <a className="text-amber-500" href="mailto:guides@gritzone.me">guides@gritzone.me</a> — we publish what the community asks for.</p>
        </div>
      </div>

      {/* Ebook detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-neutral-800 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className={`bg-gradient-to-br ${selected.cover_gradient} p-6 rounded-t-3xl`}>
              <span className="text-5xl block mb-3 drop-shadow-lg">{selected.cover_emoji}</span>
              <p className="text-white text-3xl font-black tracking-wider drop-shadow-lg">{selected.title}</p>
              {selected.subtitle && <p className="text-white/80 text-sm mt-1">{selected.subtitle}</p>}
              <div className="flex gap-2 mt-3">
                {selected.difficulty && <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full uppercase">{selected.difficulty}</span>}
                {selected.pages && <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">{selected.pages} pages</span>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm text-neutral-300 mb-4">{selected.description}</p>
              {selected.highlights && selected.highlights.length > 0 && (
                <>
                  <p className="text-[10px] uppercase text-neutral-500 mb-2">Inside this guide</p>
                  <div className="flex flex-col gap-2 mb-4">
                    {selected.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 bg-neutral-900 rounded-lg px-3 py-2">
                        <span className="text-amber-400 mt-0.5">✓</span>
                        <span className="text-xs text-neutral-200">{h}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-neutral-800 safe-bottom flex gap-2">
              <button onClick={() => setSelected(null)} className="px-4 bg-neutral-800 text-neutral-400 rounded-xl py-3 text-sm">Close</button>
              {canRead(selected) ? (
                <button
                  onClick={() => handleRead(selected)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-3 btn-glow"
                >
                  {selected.pdf_url ? "📥 Read / Download" : "🔔 Notify Me"}
                </button>
              ) : (
                <Link href="/pro" className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-3 text-center btn-glow">
                  🔓 Unlock with Pro
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}
