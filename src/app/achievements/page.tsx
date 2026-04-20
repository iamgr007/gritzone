"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import { ALL_BADGES, BADGE_MAP, RARITY_COLORS, RARITY_LABELS, type Badge } from "@/lib/badges";

const CATEGORIES = ["all", "streak", "workout", "diet", "discipline", "social", "beta"] as const;
const CAT_LABELS: Record<string, string> = {
  all: "All", streak: "Streaks", workout: "Workout", diet: "Diet",
  discipline: "Discipline", social: "Social", beta: "Beta",
};

export default function AchievementsPage() {
  const { user, loading: authLoading } = useAuth();
  const [earnedKeys, setEarnedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Badge | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_badges")
      .select("badge_key")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setEarnedKeys(new Set((data ?? []).map((d: { badge_key: string }) => d.badge_key)));
        setLoading(false);
      });
  }, [user]);

  const filtered = filter === "all"
    ? ALL_BADGES
    : ALL_BADGES.filter((b) => b.category === filter);

  const earnedCount = ALL_BADGES.filter((b) => earnedKeys.has(b.key)).length;
  const totalCount = ALL_BADGES.length;
  const pct = Math.round((earnedCount / totalCount) * 100);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold mb-1">Achievements</h1>
        <p className="text-neutral-500 text-sm mb-4">
          {earnedCount}/{totalCount} unlocked · {pct}% complete
        </p>

        {/* Progress Bar */}
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === cat ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {CAT_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((badge) => {
            const earned = earnedKeys.has(badge.key);
            return (
              <button
                key={badge.key}
                onClick={() => setSelected(badge)}
                className={`relative rounded-2xl border p-3 text-center transition-all ${
                  earned
                    ? RARITY_COLORS[badge.rarity]
                    : "border-neutral-800 bg-neutral-900/50 opacity-40"
                }`}
              >
                <span className="text-3xl block mb-1">{badge.icon}</span>
                <p className="text-[10px] font-medium leading-tight">{badge.name}</p>
                {earned && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-black font-bold">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div
            className={`w-full max-w-xs rounded-3xl border p-6 text-center ${RARITY_COLORS[selected.rarity]}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-6xl block mb-3">{selected.icon}</span>
            <h3 className="text-lg font-bold mb-1">{selected.name}</h3>
            <p className="text-sm text-neutral-400 mb-3">{selected.description}</p>
            <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
              selected.rarity === "legendary" ? "bg-amber-500/20 text-amber-400" :
              selected.rarity === "epic" ? "bg-purple-500/20 text-purple-400" :
              selected.rarity === "rare" ? "bg-blue-500/20 text-blue-400" :
              "bg-neutral-700 text-neutral-400"
            }`}>
              {RARITY_LABELS[selected.rarity]}
            </span>
            <div className="mt-4">
              {earnedKeys.has(selected.key) ? (
                <p className="text-amber-400 text-sm font-medium">🏆 Unlocked!</p>
              ) : (
                <p className="text-neutral-500 text-sm">🔒 Not yet earned</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}
