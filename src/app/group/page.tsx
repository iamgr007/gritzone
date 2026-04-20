"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import type { CheckIn, Profile } from "@/lib/types";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function GroupPage() {
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<(Profile & { todayCheckin: CheckIn | null; streak: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data: profiles } = await supabase.from("profiles").select("*");
      if (!profiles) {
        setLoading(false);
        return;
      }

      const today = todayStr();
      const { data: todayCheckins } = await supabase
        .from("checkins")
        .select("*")
        .eq("date", today);

      const { data: allCheckins } = await supabase
        .from("checkins")
        .select("user_id, date")
        .order("date", { ascending: false });

      const enriched = profiles.map((p) => {
        const tc = todayCheckins?.find((c) => c.user_id === p.id) ?? null;
        const userCheckins = (allCheckins ?? []).filter((c) => c.user_id === p.id);
        const streak = calcStreak(userCheckins.map((c) => c.date));
        return { ...p, todayCheckin: tc, streak };
      });

      setMembers(enriched);
      setLoading(false);
    }

    load();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold mb-2">Accountability Group</h1>
        <p className="text-neutral-500 text-sm mb-6">Track each other&apos;s progress</p>

        <div className="flex flex-col gap-4">
          {members.map((m) => (
            <div key={m.id} className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm">
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{m.display_name}</p>
                    <p className="text-xs text-neutral-500">{m.streak}d streak 🔥</p>
                  </div>
                </div>
                {m.todayCheckin ? (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full">
                    Checked in ✓
                  </span>
                ) : (
                  <span className="text-xs bg-neutral-800 text-neutral-500 px-2.5 py-1 rounded-full">
                    Pending
                  </span>
                )}
              </div>

              {m.todayCheckin && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <MiniStat
                    label="Weight"
                    value={m.todayCheckin.morning_weight ? `${m.todayCheckin.morning_weight}` : "—"}
                  />
                  <MiniStat
                    label="Steps"
                    value={m.todayCheckin.steps_count ? m.todayCheckin.steps_count.toLocaleString() : "—"}
                  />
                  <MiniStat label="Water" value={`${m.todayCheckin.water_intake}L`} />
                  <MiniStat
                    label="Workout"
                    value={m.todayCheckin.workout_done ? "✓" : "✗"}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {members.length === 0 && (
          <p className="text-center text-neutral-500 py-12">No members yet. Invite people to sign up!</p>
        )}
      </div>
      <Nav />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-900 rounded-lg py-1.5 px-1">
      <p className="text-xs font-medium text-neutral-200">{value}</p>
      <p className="text-[9px] text-neutral-500">{label}</p>
    </div>
  );
}

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split("T")[0];
    if (sorted[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
