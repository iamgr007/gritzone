// GRITZONE Quest Library
// Weekly/daily challenges that auto-progress from existing user actions.
// Design principle: no pop-ups, no nagging. Users see quests on /quests or dashboard.

export type QuestPeriod = "daily" | "weekly" | "monthly";

export type Quest = {
  key: string;
  title: string;
  description: string;
  icon: string;
  period: QuestPeriod;
  target: number;
  xpReward: number;
  trigger: "checkin" | "workout" | "food_log" | "supplement" | "social_post" | "streak_day";
  category: "consistency" | "strength" | "nutrition" | "social" | "wellness";
};

export const QUESTS: Quest[] = [
  // ========== WEEKLY ==========
  {
    key: "weekly_3_workouts",
    title: "Show Up 3x",
    description: "Complete 3 workouts this week",
    icon: "💪",
    period: "weekly",
    target: 3,
    xpReward: 100,
    trigger: "workout",
    category: "consistency",
  },
  {
    key: "weekly_5_workouts",
    title: "Animal Mode",
    description: "Complete 5 workouts this week",
    icon: "🔥",
    period: "weekly",
    target: 5,
    xpReward: 250,
    trigger: "workout",
    category: "strength",
  },
  {
    key: "weekly_checkin_streak",
    title: "Daily Pulse",
    description: "Check in all 7 days this week",
    icon: "📊",
    period: "weekly",
    target: 7,
    xpReward: 200,
    trigger: "checkin",
    category: "consistency",
  },
  {
    key: "weekly_food_logs",
    title: "Macro Master",
    description: "Log food 20 times this week",
    icon: "🍽️",
    period: "weekly",
    target: 20,
    xpReward: 150,
    trigger: "food_log",
    category: "nutrition",
  },
  {
    key: "weekly_supps",
    title: "Supplement Sentry",
    description: "Log your supplements 5 days",
    icon: "💊",
    period: "weekly",
    target: 5,
    xpReward: 80,
    trigger: "supplement",
    category: "wellness",
  },
  {
    key: "weekly_social_post",
    title: "Share the Grind",
    description: "Post 2 check-ins to feed with a photo",
    icon: "📸",
    period: "weekly",
    target: 2,
    xpReward: 60,
    trigger: "social_post",
    category: "social",
  },

  // ========== DAILY ==========
  {
    key: "daily_checkin",
    title: "Show Up Today",
    description: "Complete today's check-in",
    icon: "✅",
    period: "daily",
    target: 1,
    xpReward: 15,
    trigger: "checkin",
    category: "consistency",
  },
  {
    key: "daily_3_foods",
    title: "Track Every Bite",
    description: "Log 3+ food items today",
    icon: "🥗",
    period: "daily",
    target: 3,
    xpReward: 20,
    trigger: "food_log",
    category: "nutrition",
  },

  // ========== MONTHLY ==========
  {
    key: "monthly_20_workouts",
    title: "20 Workout Challenge",
    description: "Complete 20 workouts in 30 days",
    icon: "🏆",
    period: "monthly",
    target: 20,
    xpReward: 1000,
    trigger: "workout",
    category: "strength",
  },
  {
    key: "monthly_streak",
    title: "30-Day Warrior",
    description: "Keep a 30-day check-in streak",
    icon: "⚔️",
    period: "monthly",
    target: 30,
    xpReward: 1500,
    trigger: "streak_day",
    category: "consistency",
  },
];

export const QUEST_MAP: Record<string, Quest> = Object.fromEntries(QUESTS.map(q => [q.key, q]));

// Get the period start date for a quest
export function getPeriodStart(period: QuestPeriod, now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "daily") {
    return d.toISOString().split("T")[0];
  }
  if (period === "weekly") {
    // Monday as start of week
    const day = d.getDay(); // 0 = Sun, 1 = Mon
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  }
  // monthly
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

export function getPeriodEnd(period: QuestPeriod, startStr: string): string {
  const d = new Date(startStr);
  if (period === "daily") d.setDate(d.getDate() + 1);
  else if (period === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

// For display: e.g. "Resets in 3d 4h"
export function timeUntilReset(period: QuestPeriod): string {
  const start = getPeriodStart(period);
  const end = getPeriodEnd(period, start);
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return "Resetting…";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export const QUEST_CATEGORY_COLORS: Record<Quest["category"], string> = {
  consistency: "amber",
  strength: "red",
  nutrition: "green",
  social: "purple",
  wellness: "blue",
};
