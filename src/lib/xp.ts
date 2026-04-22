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

// ============================================================
// RANKED TIERS — public-facing brackets (like a ladder)
// Groups users into competitive tiers regardless of exact level.
// ============================================================
export type RankTier = {
  key: string;
  name: string;
  icon: string;
  color: string;      // tailwind hue
  gradient: string;   // tailwind gradient classes
  minLevel: number;
  tagline: string;
};

export const RANKS: RankTier[] = [
  { key: "bronze",    name: "Bronze",    icon: "🥉", color: "orange",  gradient: "from-orange-700 to-amber-800", minLevel: 1,  tagline: "Everyone starts here." },
  { key: "silver",    name: "Silver",    icon: "🥈", color: "neutral", gradient: "from-neutral-400 to-neutral-600", minLevel: 4,  tagline: "The habit is forming." },
  { key: "gold",      name: "Gold",      icon: "🥇", color: "yellow",  gradient: "from-yellow-400 to-amber-600", minLevel: 7,  tagline: "You've earned this." },
  { key: "platinum",  name: "Platinum",  icon: "💎", color: "cyan",    gradient: "from-cyan-400 to-blue-500", minLevel: 10, tagline: "Rare air. Keep pushing." },
  { key: "diamond",   name: "Diamond",   icon: "💠", color: "sky",     gradient: "from-sky-400 to-indigo-500", minLevel: 13, tagline: "Built different." },
  { key: "obsidian",  name: "Obsidian",  icon: "🖤", color: "purple",  gradient: "from-purple-600 to-black",   minLevel: 16, tagline: "The 1% of the 1%." },
  { key: "grit",      name: "GRIT",      icon: "🔱", color: "amber",   gradient: "from-amber-300 to-orange-500", minLevel: 19, tagline: "Unbreakable." },
];

export function getRank(level: number): RankTier {
  let r = RANKS[0];
  for (const tier of RANKS) if (level >= tier.minLevel) r = tier;
  return r;
}

export function nextRank(level: number): RankTier | null {
  for (const tier of RANKS) if (level < tier.minLevel) return tier;
  return null;
}
