// GRITZONE XP & Leveling System
// Philosophy: reward consistency, not volume. XP comes from checking in, logging,
// finishing workouts — not from arbitrary "gems". Levels map to fitness archetypes.

export const XP_ACTIONS = {
  daily_checkin: 10,
  log_food: 3,
  complete_workout: 25,
  finish_workout_streak_3: 15,       // bonus for 3 days in a row
  finish_workout_streak_7: 50,       // bonus for 7 days
  earn_badge: 20,
  log_supplement: 2,
  post_to_feed: 5,
  add_follower: 5,
  complete_regime_week: 100,
  beta_day: 5,                        // 1 per day during beta
} as const;

export type XPAction = keyof typeof XP_ACTIONS;

// 30 levels. Thresholds scale so you hit L5 in ~1 week, L15 in 2 months.
// Each level is a fitness archetype.
export const LEVELS: { threshold: number; title: string; icon: string }[] = [
  { threshold: 0,     title: "Rookie",          icon: "🌱" },
  { threshold: 50,    title: "Day 1 Lifter",    icon: "💫" },
  { threshold: 150,   title: "Regular",         icon: "🔥" },
  { threshold: 350,   title: "Grinder",         icon: "⚡" },
  { threshold: 700,   title: "Dedicated",       icon: "💪" },
  { threshold: 1200,  title: "Iron Heart",      icon: "❤️‍🔥" },
  { threshold: 1900,  title: "Warrior",         icon: "⚔️" },
  { threshold: 2800,  title: "Athlete",         icon: "🏃" },
  { threshold: 4000,  title: "Beast",           icon: "🦁" },
  { threshold: 5500,  title: "Unstoppable",     icon: "🚀" },
  { threshold: 7500,  title: "Machine",         icon: "🤖" },
  { threshold: 10000, title: "Elite",           icon: "⭐" },
  { threshold: 13000, title: "Titan",           icon: "🏛️" },
  { threshold: 17000, title: "Champion",        icon: "🏆" },
  { threshold: 22000, title: "Legend",          icon: "👑" },
  { threshold: 28000, title: "Mythic",          icon: "⚜️" },
  { threshold: 36000, title: "Ascendant",       icon: "🌟" },
  { threshold: 46000, title: "Immortal",        icon: "♾️" },
  { threshold: 60000, title: "GRIT",            icon: "🔱" },
];

export function getLevel(xp: number): { level: number; title: string; icon: string; currentXp: number; nextXp: number; progress: number } {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].threshold) level = i + 1;
    else break;
  }
  const current = LEVELS[level - 1];
  const next = LEVELS[level] || { threshold: current.threshold + 10000, title: "Max", icon: "∞" };
  const progress = next.threshold === current.threshold
    ? 100
    : Math.min(100, ((xp - current.threshold) / (next.threshold - current.threshold)) * 100);

  return {
    level,
    title: current.title,
    icon: current.icon,
    currentXp: xp - current.threshold,
    nextXp: next.threshold - current.threshold,
    progress,
  };
}

export function formatXP(xp: number): string {
  if (xp >= 10000) return `${(xp / 1000).toFixed(1)}K`;
  return xp.toLocaleString("en-IN");
}
