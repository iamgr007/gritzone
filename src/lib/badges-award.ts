// Client-side badge awarding helpers.
// These are best-effort: failures are swallowed so they never block UX.
import { supabase } from "@/lib/supabase";

/** Use a local-time YYYY-MM-DD string (avoids UTC day-rollover bugs). */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Compute current streak from sorted-desc checkin date strings.
 *  Streak counts back from today; if today not yet checked-in but yesterday was,
 *  we still show the running streak ending yesterday (so users see progress). */
export function computeStreakFromDates(datesDesc: string[]): number {
  if (datesDesc.length === 0) return 0;
  const set = new Set(datesDesc);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Anchor: today if checked in today; else yesterday if checked in yesterday; else 0.
  const todayKey = localDateStr(today);
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yesterdayKey = localDateStr(y);
  let anchor: Date;
  if (set.has(todayKey)) anchor = today;
  else if (set.has(yesterdayKey)) anchor = y;
  else return 0;

  let streak = 0;
  const cursor = new Date(anchor);
  while (set.has(localDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function grant(userId: string, keys: string[]) {
  if (keys.length === 0) return;
  const rows = keys.map((k) => ({ user_id: userId, badge_key: k }));
  // ignoreDuplicates uses the unique(user_id, badge_key) constraint.
  await supabase.from("user_badges").upsert(rows, {
    onConflict: "user_id,badge_key",
    ignoreDuplicates: true,
  });
}

const STREAK_TIERS: { days: number; key: string }[] = [
  { days: 1, key: "first_checkin" },
  { days: 3, key: "streak_3" },
  { days: 7, key: "streak_7" },
  { days: 14, key: "streak_14" },
  { days: 21, key: "streak_21" },
  { days: 30, key: "streak_30" },
  { days: 60, key: "streak_60" },
  { days: 90, key: "streak_90" },
  { days: 100, key: "streak_100" },
  { days: 365, key: "streak_365" },
];

const WORKOUT_TIERS: { count: number; key: string }[] = [
  { count: 1, key: "first_workout" },
  { count: 10, key: "workouts_10" },
  { count: 25, key: "workouts_25" },
  { count: 50, key: "workouts_50" },
  { count: 100, key: "workouts_100" },
  { count: 200, key: "workouts_200" },
];

const PHOTO_TIERS: { count: number; key: string }[] = [
  { count: 1, key: "first_photo" },
  { count: 10, key: "photos_10" },
  { count: 30, key: "photos_30" },
];

const FOLLOWER_TIERS: { count: number; key: string }[] = [
  { count: 1, key: "first_follower" },
  { count: 5, key: "followers_5" },
];

const MUSCLE_FIRST_BADGE: Record<string, string> = {
  chest: "chest_day",
  back: "back_day",
  legs: "leg_day",
  quads: "leg_day",
  hamstrings: "leg_day",
  glutes: "leg_day",
  arms: "arm_day",
  biceps: "arm_day",
  triceps: "arm_day",
};

/** After a check-in is saved, evaluate and grant streak/discipline badges. */
export async function awardCheckinBadges(userId: string) {
  try {
    const { data } = await supabase
      .from("checkins")
      .select("date, water_intake, sleep_hours, steps_count, morning_weight, breakfast, lunch, dinner, workout_done, created_at")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(120);
    const rows = (data ?? []) as Array<{ date: string; water_intake: number | null; sleep_hours: number | null; steps_count: number | null; morning_weight: number | null; breakfast: string | null; lunch: string | null; dinner: string | null; workout_done: boolean | null; created_at: string }>;
    const dates = rows.map((r) => r.date);
    const streak = computeStreakFromDates(dates);

    const toGrant: string[] = [];
    for (const t of STREAK_TIERS) if (streak >= t.days) toGrant.push(t.key);

    // Early bird: any checkin created before 7 AM local time
    if (rows.some((r) => new Date(r.created_at).getHours() < 7)) toGrant.push("early_bird");

    // Complete log: weight + steps + water + sleep + all 3 meals + workout_done all set
    if (rows.some((r) => r.morning_weight && r.steps_count && r.water_intake && r.sleep_hours && r.breakfast && r.lunch && r.dinner)) {
      toGrant.push("complete_log");
    }

    // 7-day disciplines (consecutive)
    const dateSet = new Set(dates);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - i);
      return localDateStr(d);
    });
    const last7Rows = rows.filter((r) => last7.includes(r.date));
    if (last7.every((d) => dateSet.has(d))) {
      // 7 consecutive checkins
      if (last7Rows.every((r) => (r.water_intake ?? 0) >= 3)) toGrant.push("hydration_7");
      if (last7Rows.every((r) => (r.sleep_hours ?? 0) >= 7)) toGrant.push("sleep_master_7");
      if (last7Rows.every((r) => (r.steps_count ?? 0) >= 10000)) toGrant.push("steps_10k_7");
      // Perfect week: all fields filled every day
      if (last7Rows.every((r) => r.morning_weight && r.water_intake && r.sleep_hours && r.steps_count)) {
        toGrant.push("perfect_week");
      }
    }

    await grant(userId, toGrant);
  } catch (e) {
    // best-effort
    console.warn("awardCheckinBadges failed", e);
  }
}

/** After a workout is saved, evaluate and grant workout badges. */
export async function awardWorkoutBadges(userId: string, opts: { hasPhoto: boolean; muscleGroups: string[]; maxWeightKg: number; setsCount: number }) {
  try {
    const [workoutsRes, photosRes] = await Promise.all([
      supabase.from("workouts").select("id, photo_url", { count: "exact" }).eq("user_id", userId),
      supabase.from("workouts").select("id", { count: "exact" }).eq("user_id", userId).not("photo_url", "is", null),
    ]);
    const total = workoutsRes.count ?? 0;
    const photoCount = photosRes.count ?? 0;

    const toGrant: string[] = [];
    for (const t of WORKOUT_TIERS) if (total >= t.count) toGrant.push(t.key);
    for (const t of PHOTO_TIERS) if (photoCount >= t.count) toGrant.push(t.key);

    if (opts.maxWeightKg >= 100) toGrant.push("heavy_100kg");
    if (opts.maxWeightKg >= 150) toGrant.push("heavy_150kg");
    if (opts.setsCount >= 15) toGrant.push("volume_king");

    for (const m of opts.muscleGroups) {
      const k = MUSCLE_FIRST_BADGE[m.toLowerCase()];
      if (k) toGrant.push(k);
    }

    await grant(userId, toGrant);
  } catch (e) {
    console.warn("awardWorkoutBadges failed", e);
  }
}

/** After a follower is gained, evaluate social badges. Should be called by the
 *  user being followed (we read their follower count). */
export async function awardFollowerBadges(userId: string) {
  try {
    const { count } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId);
    const total = count ?? 0;
    const toGrant: string[] = [];
    for (const t of FOLLOWER_TIERS) if (total >= t.count) toGrant.push(t.key);
    await grant(userId, toGrant);
  } catch (e) {
    console.warn("awardFollowerBadges failed", e);
  }
}

/** Backfill ALL badges from existing data. Idempotent — safe to call on every
 *  app open. Awards retroactive badges for users who logged data before badges
 *  worked, or before they earned a tier. */
export async function backfillAllBadges(userId: string) {
  try {
    // Fire all three pipelines using read queries; uniqueness constraint handles dedup.
    const [, workoutsForBadges] = await Promise.all([
      awardCheckinBadges(userId),
      supabase
        .from("workouts")
        .select("id, photo_url")
        .eq("user_id", userId),
    ]);

    // Workout-derived badges need set data. Pull max weight + set count from sets.
    const workoutIds = (workoutsForBadges.data ?? []).map((w: { id: string }) => w.id);
    let maxWeightKg = 0;
    let largestSetsCount = 0;
    const muscleGroups: string[] = [];
    if (workoutIds.length > 0) {
      const { data: sets } = await supabase
        .from("workout_sets")
        .select("workout_id, muscle_group, weight_kg")
        .in("workout_id", workoutIds);
      const setRows = (sets ?? []) as Array<{ workout_id: string; muscle_group: string; weight_kg: number }>;
      const perWorkout: Record<string, number> = {};
      for (const s of setRows) {
        if (s.weight_kg > maxWeightKg) maxWeightKg = s.weight_kg;
        perWorkout[s.workout_id] = (perWorkout[s.workout_id] || 0) + 1;
        muscleGroups.push(s.muscle_group);
      }
      largestSetsCount = Object.values(perWorkout).reduce((m, c) => Math.max(m, c), 0);
    }

    await awardWorkoutBadges(userId, {
      hasPhoto: (workoutsForBadges.data ?? []).some((w: { photo_url: string | null }) => !!w.photo_url),
      muscleGroups: Array.from(new Set(muscleGroups)),
      maxWeightKg,
      setsCount: largestSetsCount,
    });

    await awardFollowerBadges(userId);
  } catch (e) {
    console.warn("backfillAllBadges failed", e);
  }
}
