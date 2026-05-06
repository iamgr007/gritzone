// Fun comparators that turn raw lifting volume / streaks into vivid analogies.
// All thresholds are total cumulative kg lifted across all workout_sets.
// Numbers loosely sourced from average adult body mass / common object weights.

export type Analogy = {
  kg: number;
  emoji: string;
  label: string;       // short headline ("You lifted a tiger")
  detail: string;      // body line
};

// Sorted ascending by kg.
const TIERS: Analogy[] = [
  { kg: 100,      emoji: "🐕",  label: "A Great Dane",        detail: "About 70 kg of pure muscle and drool." },
  { kg: 250,      emoji: "🐺",  label: "A pack of wolves",    detail: "Six wolves stacked. Don't try this at home." },
  { kg: 500,      emoji: "🦁",  label: "A full-grown lion",   detail: "Lions weigh ~250 kg. You did two." },
  { kg: 1_000,    emoji: "🐅",  label: "A Bengal tiger",      detail: "300 kg of striped chaos. Bench-pressed." },
  { kg: 2_500,    emoji: "🐊",  label: "A saltwater croc",    detail: "Largest croc ever weighed ~1,000 kg. You did 2.5×." },
  { kg: 5_000,    emoji: "🐎",  label: "Five racehorses",     detail: "A thoroughbred is ~500 kg. You moved a stable." },
  { kg: 10_000,   emoji: "🐂",  label: "Ten bulls",           detail: "Each Indian bull is ~1,000 kg. You wrestled the herd." },
  { kg: 20_000,   emoji: "🚗",  label: "Fifteen Maruti Swifts", detail: "Each Swift is ~1,000 kg. That's a parking lot." },
  { kg: 50_000,   emoji: "🐘",  label: "Eight elephants",     detail: "Asian elephants weigh ~5,000 kg. You moved a herd." },
  { kg: 100_000,  emoji: "🚛",  label: "A loaded Tata truck", detail: "An empty truck plus 80 tonnes of cement. Hauled by you." },
  { kg: 250_000,  emoji: "🏠",  label: "An entire bungalow",  detail: "Average 2BHK weighs ~250 tonnes. Lifted." },
  { kg: 500_000,  emoji: "🐋",  label: "A blue whale",        detail: "180 tonnes of ocean royalty — and you lifted it 2.7×." },
  { kg: 1_000_000, emoji: "🛩️", label: "A Boeing 737",         detail: "Empty 737: ~42 tonnes. You moved 24 of them." },
  { kg: 5_000_000, emoji: "🗽",  label: "The Statue of Liberty", detail: "225 tonnes of copper + steel. You're not human." },
  { kg: 10_000_000, emoji: "🏛️", label: "The Eiffel Tower",     detail: "10,100 tonnes. The whole damn thing." },
];

export function getStrengthAnalogy(totalKg: number): Analogy {
  if (totalKg <= 0) {
    return {
      kg: 0,
      emoji: "💪",
      label: "Just getting started",
      detail: "Log your first set and we'll start the comparisons.",
    };
  }
  // Find the highest tier the user has cleared.
  let cleared: Analogy = TIERS[0];
  for (const t of TIERS) {
    if (totalKg >= t.kg) cleared = t;
    else break;
  }
  return cleared;
}

export function nextStrengthAnalogy(totalKg: number): Analogy | null {
  return TIERS.find(t => t.kg > totalKg) ?? null;
}

// Streak-based hype messages
export function getStreakHype(streak: number): { emoji: string; line: string } {
  if (streak === 0) return { emoji: "🌱", line: "Day 0. Today is a clean slate." };
  if (streak === 1) return { emoji: "🔥", line: "Day 1. The first one is the hardest. You did it." };
  if (streak < 3)   return { emoji: "🔥", line: `Day ${streak}. Habits start at three.` };
  if (streak < 7)   return { emoji: "⚡", line: `Day ${streak}. You're past the dropout zone.` };
  if (streak < 14)  return { emoji: "💎", line: `${streak} days. Most people quit before now.` };
  if (streak < 30)  return { emoji: "👑", line: `${streak} days. You're elite already.` };
  if (streak < 60)  return { emoji: "🦾", line: `${streak} days. Your discipline is mythological.` };
  if (streak < 100) return { emoji: "🚀", line: `${streak} days. You don't break — you compound.` };
  return { emoji: "🏆", line: `${streak} days. Triple digits. Legendary.` };
}

// Workout count milestones
export function getWorkoutMilestone(count: number): string | null {
  const milestones = [
    [1, "🎉 First workout logged. The journey begins."],
    [5, "💪 Five workouts in. Momentum building."],
    [10, "🔥 Ten workouts. You're not just trying — you're training."],
    [25, "⚡ 25 workouts. You've earned the calluses."],
    [50, "💎 50 workouts. Halfway to a hundred."],
    [100, "👑 Triple digits. You're the gym now."],
    [250, "🚀 250 workouts. People ask you for advice."],
    [500, "🏛️ 500 workouts. You're an institution."],
  ] as const;
  // Show the highest one they've JUST hit (within 1 of the milestone)
  for (const [n, msg] of [...milestones].reverse()) {
    if (count === n) return msg;
  }
  return null;
}
