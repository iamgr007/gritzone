"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import Link from "next/link";
import { getLevel, getRank, nextRank, RANKS, formatXP } from "@/lib/xp";

type LeaderRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
};

// XP formula must match dashboard: checkins*10 + badges*20 + streak*5
// Since we can't aggregate streak server-side easily, we approximate using
// checkin count + badge count (server-side fetch).
export default function RanksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"global" | "friends">("global");
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [myXp, setMyXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Count own XP
      const [mine, followRes] = await Promise.all([
        countXP(user.id),
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
      ]);
      setMyXp(mine);

      let targetIds: string[];
      if (tab === "friends") {
        targetIds = (followRes.data || []).map((f: { following_id: string }) => f.following_id).concat(user.id);
        if (targetIds.length === 1) { setRows([]); setLoading(false); return; }
      } else {
        // Global = all profiles (capped)
        const { data } = await supabase.from("profiles").select("id").limit(200);
        targetIds = (data || []).map((p: { id: string }) => p.id);
      }

      // Fetch display names + counts in parallel
      const profilesPromise = supabase.from("profiles").select("id, display_name, avatar_url").in("id", targetIds);
      const [profRes, xpMap] = await Promise.all([
        profilesPromise,
        countXPBatch(targetIds),
      ]);

      const byId: Record<string, { name: string | null; avatar: string | null }> = {};
      (profRes.data || []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
        byId[p.id] = { name: p.display_name, avatar: p.avatar_url };
      });

      const leaderboard: LeaderRow[] = targetIds
        .map(id => ({
          user_id: id,
          display_name: byId[id]?.name || null,
          avatar_url: byId[id]?.avatar || null,
          xp: xpMap[id] || 0,
        }))
        .filter(r => r.xp > 0 || r.user_id === user.id)
        .sort((a, b) => b.xp - a.xp);

      setRows(leaderboard);
      setLoading(false);
    })();
  }, [user, tab]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const myLevel = getLevel(myXp).level;
  const myRank = getRank(myLevel);
  const nxt = nextRank(myLevel);
  const myPosition = rows.findIndex(r => r.user_id === user?.id) + 1;

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight">Ranks</h1>
          <p className="text-xs text-neutral-500">Climb the ladder. Earn respect.</p>
        </div>

        {/* Your rank card */}
        <div className={`bg-gradient-to-br ${myRank.gradient} rounded-3xl p-5 mb-5 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Your Rank</p>
                <p className="text-white text-3xl font-black">{myRank.name}</p>
                <p className="text-white/80 text-xs italic">"{myRank.tagline}"</p>
              </div>
              <span className="text-6xl drop-shadow-2xl">{myRank.icon}</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 text-xs">
              <span>Lvl {myLevel}</span>
              <span className="w-1 h-1 bg-white/40 rounded-full" />
              <span>{formatXP(myXp)} XP</span>
              {myPosition > 0 && <><span className="w-1 h-1 bg-white/40 rounded-full" /><span>#{myPosition} {tab === "global" ? "global" : "friends"}</span></>}
            </div>
            {nxt && (
              <div className="mt-3 bg-black/25 rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-xl">{nxt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-[10px] uppercase font-bold">Next Rank</p>
                  <p className="text-white text-xs font-bold">{nxt.name} — Level {nxt.minLevel}</p>
                </div>
                <p className="text-white/80 text-[10px]">{nxt.minLevel - myLevel} lvls away</p>
              </div>
            )}
          </div>
        </div>

        {/* Tab selector */}
        <div className="bg-[#141414] border border-neutral-800 rounded-full p-1 flex gap-1 mb-5">
          {(["global", "friends"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setLoading(true); setTab(t); }}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-amber-500 text-black" : "text-neutral-400"}`}
            >{t === "global" ? "🌍 Global" : "👥 Friends"}</button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="flex flex-col gap-2">
          {rows.slice(0, 50).map((r, i) => {
            const rank = getRank(getLevel(r.xp).level);
            const isMe = r.user_id === user?.id;
            const positionColor = i === 0 ? "text-amber-400" : i === 1 ? "text-neutral-300" : i === 2 ? "text-orange-500" : "text-neutral-500";
            return (
              <div
                key={r.user_id}
                className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${isMe ? "bg-amber-500/5 border-amber-500/30" : "bg-[#141414] border-neutral-800"}`}
              >
                <p className={`font-black text-lg w-8 text-center ${positionColor}`}>
                  {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i + 1}`}
                </p>
                <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">{rank.icon}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{r.display_name || "Anonymous"}{isMe && <span className="text-amber-400 ml-1">(you)</span>}</p>
                  <p className="text-[10px] text-neutral-500">{rank.name} · Lvl {getLevel(r.xp).level}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 font-bold text-sm">{formatXP(r.xp)}</p>
                  <p className="text-[9px] text-neutral-600 uppercase">XP</p>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 text-center">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm text-neutral-400">
                {tab === "friends" ? "Follow people to see them here." : "No one on the leaderboard yet."}
              </p>
              {tab === "friends" && (
                <Link href="/group" className="inline-block mt-3 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-full px-4 py-2">Find friends</Link>
              )}
            </div>
          )}
        </div>

        {/* All ranks reference */}
        <div className="mt-8">
          <p className="text-[10px] uppercase text-neutral-500 mb-3 text-center">All Ranks</p>
          <div className="grid grid-cols-2 gap-2">
            {RANKS.map(r => (
              <div key={r.key} className={`bg-gradient-to-br ${r.gradient} rounded-xl p-3 relative`}>
                <div className="absolute inset-0 bg-black/30 rounded-xl" />
                <div className="relative flex items-center gap-2">
                  <span className="text-2xl">{r.icon}</span>
                  <div>
                    <p className="text-white font-black text-sm">{r.name}</p>
                    <p className="text-white/70 text-[9px]">Level {r.minLevel}+</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Nav />
    </div>
  );
}

// ============================================================
// XP computation — mirrors dashboard formula
// ============================================================
async function countXP(userId: string): Promise<number> {
  const [checkins, badges] = await Promise.all([
    supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return (checkins.count || 0) * 10 + (badges.count || 0) * 20;
}

async function countXPBatch(userIds: string[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const [cRes, bRes] = await Promise.all([
    supabase.from("checkins").select("user_id").in("user_id", userIds),
    supabase.from("user_badges").select("user_id").in("user_id", userIds),
  ]);
  const counts: Record<string, { c: number; b: number }> = {};
  userIds.forEach(id => { counts[id] = { c: 0, b: 0 }; });
  (cRes.data || []).forEach((r: { user_id: string }) => { if (counts[r.user_id]) counts[r.user_id].c++; });
  (bRes.data || []).forEach((r: { user_id: string }) => { if (counts[r.user_id]) counts[r.user_id].b++; });
  const out: Record<string, number> = {};
  for (const id of userIds) out[id] = counts[id].c * 10 + counts[id].b * 20;
  return out;
}
