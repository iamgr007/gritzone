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
  category: "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "cardio" | "other";
  aliases: string[];
  description: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  /** Absolute URL to a static image, or null. */
  image: string | null;
};

const WGER_BASE = "https://wger.de";

function deriveCategory(eq: string[], wgerCategory: string): Exercise["category"] {
  const lower = eq.map((e) => e.toLowerCase()).join(" ");
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

function pickPrimaryMuscle(e: RawExercise): string {
  return e.primary_muscles[0] || e.secondary_muscles[0] || e.category || "Other";
}

const RAW = data as RawExercise[];

export const EXERCISES: Exercise[] = RAW.map((e) => ({
  id: e.id,
  name: e.name,
  muscle: pickPrimaryMuscle(e),
  category: deriveCategory(e.equipment, e.category),
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
}));

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
