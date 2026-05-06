import data from "./exercises.json";

/**
 * Exercise database — sourced from wger.de (CC-BY-SA 3.0).
 * Bundled at build time so lookups are instant and offline-safe.
 *
 * Backwards-compatible with the previous Exercise shape (`muscle`, `category`)
 * so existing call sites keep working, plus new fields for rich exercise info.
 */
export type RawExercise = {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  category: string; // wger high-level: Chest, Back, Legs, etc.
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  image: string | null;
};

export type Exercise = {
  id: string;
  name: string;
  /** @deprecated use primary_muscles */
  muscle: string;
  /** Equipment-based bucket (kept for legacy display/filter). */
  category: "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "cardio" | "yoga" | "calisthenics" | "swim" | "run" | "cycle" | "other";
  /** How this activity is logged in the workout UI. */
  tracking_mode: "sets_reps" | "time" | "distance" | "time_distance" | "flow";
  aliases: string[];
  description: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  /** Absolute URL to a static image, or null. */
  image: string | null;
};

const WGER_BASE = "https://wger.de";

function deriveCategory(eq: string[], wgerCategory: string, name: string): Exercise["category"] {
  const lower = eq.map((e) => e.toLowerCase()).join(" ");
  const n = name.toLowerCase();

  // Activity-type heuristics first (more specific than equipment)
  if (/\b(yoga|asana|vinyasa|namaskar|pose)\b/.test(n)) return "yoga";
  if (/\b(swim|swimming|freestyle|backstroke|breaststroke|butterfly)\b/.test(n)) return "swim";
  if (/\b(run|running|jog|sprint|treadmill)\b/.test(n)) return "run";
  if (/\b(cycle|cycling|bike|biking|spin)\b/.test(n)) return "cycle";
  if (wgerCategory === "Cardio") return "cardio";

  if (lower.includes("barbell")) return "barbell";
  if (lower.includes("dumbbell")) return "dumbbell";
  if (lower.includes("cable") || lower.includes("pulley")) return "cable";
  if (lower.includes("machine") || lower.includes("smith")) return "machine";
  if (
    eq.length === 0 ||
    lower.includes("none") ||
    lower.includes("bodyweight") ||
    lower.includes("body weight") ||
    lower.includes("mat")
  )
    return "bodyweight";
  return "other";
}

function deriveTrackingMode(category: Exercise["category"], name: string): Exercise["tracking_mode"] {
  const n = name.toLowerCase();
  // Distance + time (cardio you can measure distance for)
  if (category === "run" || category === "swim" || category === "cycle") return "time_distance";
  if (category === "cardio") {
    // Rowing, elliptical, treadmill, etc.
    if (/\b(row|elliptical|stair|stepmill)\b/.test(n)) return "time_distance";
    return "time";
  }
  // Time-based: holds (plank, wall sit, hanging), yoga
  if (category === "yoga") return "flow";
  if (/\b(plank|wall sit|hold|isometric|hang|dead hang|l-sit|hollow hold)\b/.test(n)) return "time";
  // Default: classic sets×reps×weight
  return "sets_reps";
}

function pickPrimaryMuscle(e: RawExercise): string {
  return e.primary_muscles[0] || e.secondary_muscles[0] || e.category || "Other";
}

const RAW = data as RawExercise[];

export const EXERCISES: Exercise[] = RAW.map((e) => {
  const category = deriveCategory(e.equipment, e.category, e.name);
  return {
    id: e.id,
    name: e.name,
    muscle: pickPrimaryMuscle(e),
    category,
    tracking_mode: deriveTrackingMode(category, e.name),
    aliases: e.aliases,
    description: e.description,
    primary_muscles: e.primary_muscles,
    secondary_muscles: e.secondary_muscles,
    equipment: e.equipment,
    image: e.image
      ? e.image.startsWith("http")
        ? e.image
        : `${WGER_BASE}${e.image}`
      : null,
  };
});

// ──────────────────────────────────────────────────────────────────
// Synthetic activities not in wger: yoga flows, runs, swims, etc.
// These give universal-workout users something to log even if wger
// doesn't have it as a discrete exercise.
// ──────────────────────────────────────────────────────────────────
const SYNTHETIC: Exercise[] = [
  // Running
  { id: "syn_run_outdoor", name: "Outdoor Run", category: "run", tracking_mode: "time_distance", muscle: "Quads", aliases: ["jog", "running"], description: "Outdoor running. Track time and distance.", primary_muscles: ["Quads", "Calves", "Glutes"], secondary_muscles: ["Hamstrings"], equipment: ["None"], image: null },
  { id: "syn_run_treadmill", name: "Treadmill Run", category: "run", tracking_mode: "time_distance", muscle: "Quads", aliases: ["treadmill"], description: "Indoor treadmill running.", primary_muscles: ["Quads", "Calves", "Glutes"], secondary_muscles: ["Hamstrings"], equipment: ["Treadmill"], image: null },
  { id: "syn_walk", name: "Brisk Walk", category: "cardio", tracking_mode: "time_distance", muscle: "Calves", aliases: [], description: "Brisk walking pace.", primary_muscles: ["Calves", "Glutes"], secondary_muscles: [], equipment: [], image: null },
  // Cycling
  { id: "syn_cycle_outdoor", name: "Outdoor Cycling", category: "cycle", tracking_mode: "time_distance", muscle: "Quads", aliases: ["bike", "cycling"], description: "Outdoor cycling.", primary_muscles: ["Quads", "Glutes"], secondary_muscles: ["Calves", "Hamstrings"], equipment: ["Bicycle"], image: null },
  { id: "syn_cycle_indoor", name: "Spin Bike / Indoor Cycle", category: "cycle", tracking_mode: "time_distance", muscle: "Quads", aliases: ["spin", "stationary bike"], description: "Stationary or spin bike.", primary_muscles: ["Quads", "Glutes"], secondary_muscles: ["Calves"], equipment: ["Stationary bike"], image: null },
  // Swimming
  { id: "syn_swim_freestyle", name: "Freestyle Swim", category: "swim", tracking_mode: "time_distance", muscle: "Lats", aliases: ["front crawl", "swimming"], description: "Freestyle / front crawl.", primary_muscles: ["Lats", "Shoulders"], secondary_muscles: ["Chest", "Triceps", "Glutes"], equipment: ["Pool"], image: null },
  { id: "syn_swim_breast", name: "Breaststroke", category: "swim", tracking_mode: "time_distance", muscle: "Chest", aliases: [], description: "Breaststroke swim.", primary_muscles: ["Chest", "Lats"], secondary_muscles: ["Shoulders", "Quads"], equipment: ["Pool"], image: null },
  { id: "syn_swim_back", name: "Backstroke", category: "swim", tracking_mode: "time_distance", muscle: "Lats", aliases: [], description: "Backstroke swim.", primary_muscles: ["Lats", "Shoulders"], secondary_muscles: ["Glutes"], equipment: ["Pool"], image: null },
  // Yoga / mobility flows
  { id: "syn_yoga_vinyasa", name: "Vinyasa Yoga Flow", category: "yoga", tracking_mode: "flow", muscle: "Abs", aliases: ["yoga"], description: "Flow-based yoga linking breath and movement.", primary_muscles: ["Abs", "Glutes", "Shoulders"], secondary_muscles: ["Quads", "Hamstrings"], equipment: ["Mat"], image: null },
  { id: "syn_yoga_hatha", name: "Hatha Yoga", category: "yoga", tracking_mode: "flow", muscle: "Abs", aliases: [], description: "Slower, alignment-focused yoga.", primary_muscles: ["Abs", "Glutes"], secondary_muscles: [], equipment: ["Mat"], image: null },
  { id: "syn_yoga_surya", name: "Surya Namaskar", category: "yoga", tracking_mode: "sets_reps", muscle: "Abs", aliases: ["sun salutation"], description: "Sun salutation cycles.", primary_muscles: ["Abs", "Shoulders"], secondary_muscles: ["Quads", "Hamstrings"], equipment: ["Mat"], image: null },
  // Pilates
  { id: "syn_pilates_mat", name: "Pilates (Mat)", category: "yoga", tracking_mode: "flow", muscle: "Abs", aliases: ["pilates"], description: "Mat pilates session.", primary_muscles: ["Abs", "Glutes"], secondary_muscles: ["Hamstrings"], equipment: ["Mat"], image: null },
  // HIIT / circuit
  { id: "syn_hiit", name: "HIIT Circuit", category: "cardio", tracking_mode: "time", muscle: "Quads", aliases: ["circuit"], description: "High-intensity interval training circuit.", primary_muscles: ["Quads", "Glutes", "Abs"], secondary_muscles: ["Shoulders", "Chest"], equipment: [], image: null },
  { id: "syn_jump_rope", name: "Jump Rope", category: "cardio", tracking_mode: "time", muscle: "Calves", aliases: ["skipping"], description: "Jump rope conditioning.", primary_muscles: ["Calves", "Shoulders"], secondary_muscles: ["Quads"], equipment: ["Jump rope"], image: null },
  // Climbing
  { id: "syn_climb", name: "Bouldering / Climbing", category: "calisthenics", tracking_mode: "time", muscle: "Lats", aliases: ["bouldering"], description: "Indoor or outdoor climbing.", primary_muscles: ["Lats", "Biceps", "Forearms"], secondary_muscles: ["Abs", "Shoulders"], equipment: ["Climbing wall"], image: null },
  // Hike
  { id: "syn_hike", name: "Hiking", category: "cardio", tracking_mode: "time_distance", muscle: "Quads", aliases: [], description: "Outdoor hiking.", primary_muscles: ["Quads", "Glutes", "Calves"], secondary_muscles: ["Hamstrings"], equipment: [], image: null },
];

// Prepend synthetic so they appear at top of obvious searches like "yoga", "run"
EXERCISES.unshift(...SYNTHETIC);

const _byId = new Map(EXERCISES.map((e) => [e.id, e]));
export function getExerciseById(id: string): Exercise | undefined {
  return _byId.get(id);
}

export const MUSCLE_GROUPS: string[] = Array.from(
  new Set(EXERCISES.flatMap((e) => e.primary_muscles).filter(Boolean))
).sort();

export function searchExercises(query: string): Exercise[] {
  if (!query.trim()) return EXERCISES;
  const q = query.toLowerCase();
  return EXERCISES.filter((e) => {
    if (e.name.toLowerCase().includes(q)) return true;
    if (e.muscle.toLowerCase().includes(q)) return true;
    if (e.category.includes(q)) return true;
    if (e.primary_muscles.some((m) => m.toLowerCase().includes(q))) return true;
    if (e.aliases.some((a) => a.toLowerCase().includes(q))) return true;
    if (e.equipment.some((eq) => eq.toLowerCase().includes(q))) return true;
    return false;
  });
}

export function getExercisesByMuscle(muscle: string): Exercise[] {
  return EXERCISES.filter(
    (e) => e.muscle === muscle || e.primary_muscles.includes(muscle)
  );
}

/**
 * Forgiving exercise lookup. Tries:
 *   1. exact name match
 *   2. case-insensitive exact
 *   3. case-insensitive without trailing "s" (so "Pull Ups" matches "Pull Up")
 *   4. case-insensitive contains
 * Returns undefined if nothing matches.
 */
export function findExercise(name: string): Exercise | undefined {
  if (!name) return undefined;
  const direct = EXERCISES.find((e) => e.name === name);
  if (direct) return direct;
  const target = name.toLowerCase().trim();
  const targetSing = target.replace(/s$/, "");
  let m = EXERCISES.find((e) => e.name.toLowerCase() === target);
  if (m) return m;
  m = EXERCISES.find((e) => e.name.toLowerCase().replace(/s$/, "") === targetSing);
  if (m) return m;
  // Prefer the shortest containing name (closest to canonical)
  const candidates = EXERCISES
    .filter((e) => e.name.toLowerCase().includes(targetSing))
    .sort((a, b) => a.name.length - b.name.length);
  return candidates[0];
}
