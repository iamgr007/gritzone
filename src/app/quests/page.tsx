"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import Link from "next/link";
import { loadActiveQuests, claimQuestReward } from "@/lib/quests-client";
import { timeUntilReset, QUEST_CATEGORY_COLORS } from "@/lib/quests";
import { celebrate } from "@/lib/celebrate";

type QuestState = Awaited<ReturnType<typeof loadActiveQuests>>[0];

export default function QuestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [quests, setQuests] = useState<QuestState[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await loadActiveQuests(user);
      setQuests(data);
      setLoading(false);
    })();
  }, [user]);

  async function handleClaim(q: QuestState) {
    if (!user) return;
    setClaiming(q.quest.key);
    const ok = await claimQuestReward(user, q.quest.key, q.periodStart);
    setClaiming(null);
    if (ok) {
      celebrate();
      setQuests(qs => qs.map(x => x.quest.key === q.quest.key && x.periodStart === q.periodStart ? { ...x, claimed: true } : x));
    }
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const filtered = quests.filter(q => q.quest.period === tab);
  const completedCount = filtered.filter(q => q.completed).length;
  const totalXPAvailable = filtered.filter(q => q.completed && !q.claimed).reduce((s, q) => s + q.quest.xpReward, 0);

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Quests</h1>
            <p className="text-xs text-neutral-500">Earn XP by completing challenges</p>
          </div>
          <Link href="/rewards" className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full font-semibold hover:bg-amber-500/20">
            🎁 Rewards
          </Link>
        </div>

        {totalXPAvailable > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-xl p-3 mb-5 flex items-center justify-between animate-slide-down">
            <p className="text-sm"><strong className="text-amber-400">{totalXPAvailable} XP</strong> ready to claim</p>
            <span className="text-2xl">🎉</span>
          </div>
        )}

        {/* Tab selector */}
        <div className="bg-[#141414] border border-neutral-800 rounded-full p-1 flex gap-1 mb-5">
          {(["daily", "weekly", "monthly"] as const).map(p => (
            <button
              key={p}
              onClick={() => setTab(p)}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${tab === p ? "bg-amber-500 text-black" : "text-neutral-400"}`}
            >{p}</button>
          ))}
        </div>

        <p className="text-[10px] text-neutral-600 mb-4 text-center">
          {completedCount}/{filtered.length} completed · resets in {timeUntilReset(tab)}
        </p>

        {/* Quest cards */}
        <div className="flex flex-col gap-3">
          {filtered.map(q => {
            const pct = Math.min(100, (q.progress / q.quest.target) * 100);
            const color = QUEST_CATEGORY_COLORS[q.quest.category];
            return (
              <div
                key={q.quest.key}
                className={`rounded-2xl border p-4 transition-all ${q.completed ? `bg-${color}-500/5 border-${color}-500/30` : "bg-[#141414] border-neutral-800"}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-xl flex-shrink-0`}>
                    {q.quest.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{q.quest.title}</p>
                      {q.completed && !q.claimed && <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold uppercase">Ready</span>}
                      {q.claimed && <span className="text-[9px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded-full font-bold uppercase">Done</span>}
                    </div>
                    <p className="text-[11px] text-neutral-500">{q.quest.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-amber-400 font-black text-sm">+{q.quest.xpReward}</p>
                    <p className="text-[8px] text-neutral-600 uppercase">XP</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-${color}-600 to-${color}-400 transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono min-w-[38px] text-right">
                    {q.progress}/{q.quest.target}
                  </p>
                </div>

                {q.completed && !q.claimed && (
                  <button
                    onClick={() => handleClaim(q)}
                    disabled={claiming === q.quest.key}
                    className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg py-2 text-sm transition-colors btn-glow disabled:opacity-60"
                  >
                    {claiming === q.quest.key ? "Claiming..." : `Claim ${q.quest.xpReward} XP 🎉`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-neutral-600 text-center mt-6">
          New quests every week. Keep grinding. 💪
        </p>
      </div>
      <Nav />
    </div>
  );
}
