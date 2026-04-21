"use client";

import { supabase } from "./supabase";
import { QUESTS, QUEST_MAP, getPeriodStart, type Quest } from "./quests";
import type { User } from "@supabase/supabase-js";

// Increment progress on every quest that listens to a given trigger.
// Called from checkin, workout, food log, etc. Fails silently on schema errors
// (quests table may not exist yet for older users).
export async function incrementQuestProgress(
  user: User | null | undefined,
  trigger: Quest["trigger"],
  amount = 1
): Promise<{ completed: Quest[] }> {
  if (!user) return { completed: [] };
  const matching = QUESTS.filter(q => q.trigger === trigger);
  const completed: Quest[] = [];

  for (const quest of matching) {
    const periodStart = getPeriodStart(quest.period);

    // Upsert row — create if missing
    const { data: existing } = await supabase
      .from("quest_progress")
      .select("id, progress, target, completed_at")
      .eq("user_id", user.id)
      .eq("quest_key", quest.key)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (!existing) {
      const newProgress = Math.min(amount, quest.target);
      const { error } = await supabase.from("quest_progress").insert({
        user_id: user.id,
        quest_key: quest.key,
        period_start: periodStart,
        progress: newProgress,
        target: quest.target,
        completed_at: newProgress >= quest.target ? new Date().toISOString() : null,
      });
      if (!error && newProgress >= quest.target) completed.push(quest);
    } else if (!existing.completed_at) {
      const newProgress = Math.min(existing.progress + amount, quest.target);
      const done = newProgress >= quest.target;
      await supabase.from("quest_progress").update({
        progress: newProgress,
        completed_at: done ? new Date().toISOString() : null,
      }).eq("id", existing.id);
      if (done) completed.push(quest);
    }
  }

  return { completed };
}

export async function loadActiveQuests(user: User | null | undefined) {
  if (!user) return [];
  const dailyStart = getPeriodStart("daily");
  const weeklyStart = getPeriodStart("weekly");
  const monthlyStart = getPeriodStart("monthly");

  const { data } = await supabase
    .from("quest_progress")
    .select("quest_key, period_start, progress, target, completed_at, xp_claimed")
    .eq("user_id", user.id)
    .in("period_start", [dailyStart, weeklyStart, monthlyStart]);

  const rows = data || [];

  // For each quest in library, find its current-period row (or treat as 0 progress)
  return QUESTS.map(q => {
    const start = getPeriodStart(q.period);
    const row = rows.find(r => r.quest_key === q.key && r.period_start === start);
    return {
      quest: q,
      progress: row?.progress || 0,
      completed: !!row?.completed_at,
      claimed: row?.xp_claimed || false,
      periodStart: start,
    };
  });
}

export async function claimQuestReward(user: User, questKey: string, periodStart: string): Promise<boolean> {
  const { error } = await supabase
    .from("quest_progress")
    .update({ xp_claimed: true })
    .eq("user_id", user.id)
    .eq("quest_key", questKey)
    .eq("period_start", periodStart)
    .not("completed_at", "is", null);
  return !error;
}
