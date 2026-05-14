import type { Metadata } from "next";
import Link from "next/link";

// Public share landing page for a quiz result. Shows OG card preview and a CTA to take the quiz.

type Params = { params: Promise<{ id: string }> };

async function fetchLead(id: string): Promise<null | {
  bodyType: string | null;
  fitnessAge: number | null;
  metabolismLabel: string | null;
  goal: string | null;
  name: string | null;
}> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    const res = await fetch(`${base}/api/quiz-lead?id=${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const lead = await fetchLead(id);
  const bt = lead?.bodyType ? cap(lead.bodyType) : "Mesomorph";
  const fa = lead?.fitnessAge ?? "";
  const m = lead?.metabolismLabel ?? "moderate";
  const name = lead?.name || "I";

  const cardUrl = `/api/quiz-card?bt=${encodeURIComponent(bt)}&fa=${fa}&m=${encodeURIComponent(m)}&n=${encodeURIComponent(name)}`;
  const title = `${name === "I" ? "My" : `${name}'s`} GritZone Body Blueprint`;
  const description = `Body type: ${bt}${fa ? ` · Fitness Age ${fa}` : ""} · Metabolism: ${cap(m)}. Take the free 2-min quiz to find yours.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: cardUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cardUrl],
    },
  };
}

export default async function QuizResultSharePage({ params }: Params) {
  const { id } = await params;
  const lead = await fetchLead(id);

  if (!lead) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-neutral-400 mb-4">This result couldn&apos;t be found.</p>
          <Link href="/quiz" className="bg-amber-500 text-black font-bold rounded-xl px-5 py-3">Take the quiz →</Link>
        </div>
      </div>
    );
  }

  const bt = lead.bodyType ? cap(lead.bodyType) : "—";
  const fa = lead.fitnessAge ?? null;
  const m = lead.metabolismLabel ? cap(lead.metabolismLabel) : "—";
  const name = lead.name || "Someone";

  const cardUrl = `/api/quiz-card?bt=${encodeURIComponent(bt)}&fa=${fa ?? ""}&m=${encodeURIComponent(lead.metabolismLabel || "moderate")}&n=${encodeURIComponent(name)}`;

  return (
    <div className="min-h-dvh px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-lg">
        <div className="text-center mb-5">
          <span className="text-amber-500 font-black text-2xl tracking-tight">GRIT<span className="text-neutral-500">ZONE</span></span>
          <h1 className="text-2xl font-black mt-3">{name}&apos;s Body Blueprint</h1>
        </div>

        {/* OG card preview */}
        <div className="rounded-2xl overflow-hidden border border-neutral-800 mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardUrl} alt="Quiz result card" className="w-full" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat label="Body Type" value={bt} />
          <Stat label="Fitness Age" value={fa !== null ? String(fa) : "—"} />
          <Stat label="Metabolism" value={m} />
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl border border-amber-500/20 p-5 mb-4 text-center">
          <h2 className="text-lg font-bold mb-1">What&apos;s your body type?</h2>
          <p className="text-sm text-neutral-400 mb-4">Take the 2-minute quiz to get your personalized blueprint — body fat %, fitness age, calorie targets, and a training split built for you.</p>
          <Link href="/quiz" className="block bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-3 text-base">
            Take the Free Quiz →
          </Link>
          <p className="text-[10px] text-neutral-600 mt-2">No signup required</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#141414] border border-neutral-800 rounded-xl p-3 text-center">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-black text-amber-400 mt-1">{value}</p>
    </div>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
