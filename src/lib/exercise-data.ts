export type Exercise = {
  name: string;
  muscle: string;
  category: "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "cardio";
};

export const EXERCISES: Exercise[] = [
  // ===== CHEST =====
  { name: "Flat Bench Press", muscle: "Chest", category: "barbell" },
  { name: "Incline Bench Press", muscle: "Chest", category: "barbell" },
  { name: "Decline Bench Press", muscle: "Chest", category: "barbell" },
  { name: "Dumbbell Bench Press", muscle: "Chest", category: "dumbbell" },
  { name: "Incline Dumbbell Press", muscle: "Chest", category: "dumbbell" },
  { name: "Dumbbell Fly", muscle: "Chest", category: "dumbbell" },
  { name: "Cable Fly", muscle: "Chest", category: "cable" },
  { name: "Chest Press Machine", muscle: "Chest", category: "machine" },
  { name: "Push-ups", muscle: "Chest", category: "bodyweight" },
  { name: "Dips (Chest)", muscle: "Chest", category: "bodyweight" },
  { name: "Pec Deck", muscle: "Chest", category: "machine" },

  // ===== BACK =====
  { name: "Deadlift", muscle: "Back", category: "barbell" },
  { name: "Barbell Row", muscle: "Back", category: "barbell" },
  { name: "Pull-ups", muscle: "Back", category: "bodyweight" },
  { name: "Chin-ups", muscle: "Back", category: "bodyweight" },
  { name: "Lat Pulldown", muscle: "Back", category: "cable" },
  { name: "Seated Cable Row", muscle: "Back", category: "cable" },
  { name: "T-Bar Row", muscle: "Back", category: "barbell" },
  { name: "Dumbbell Row", muscle: "Back", category: "dumbbell" },
  { name: "Face Pull", muscle: "Back", category: "cable" },
  { name: "Hyperextensions", muscle: "Back", category: "bodyweight" },

  // ===== SHOULDERS =====
  { name: "Overhead Press", muscle: "Shoulders", category: "barbell" },
  { name: "Dumbbell Shoulder Press", muscle: "Shoulders", category: "dumbbell" },
  { name: "Arnold Press", muscle: "Shoulders", category: "dumbbell" },
  { name: "Lateral Raise", muscle: "Shoulders", category: "dumbbell" },
  { name: "Front Raise", muscle: "Shoulders", category: "dumbbell" },
  { name: "Rear Delt Fly", muscle: "Shoulders", category: "dumbbell" },
  { name: "Cable Lateral Raise", muscle: "Shoulders", category: "cable" },
  { name: "Upright Row", muscle: "Shoulders", category: "barbell" },
  { name: "Shrugs", muscle: "Shoulders", category: "dumbbell" },

  // ===== LEGS =====
  { name: "Barbell Squat", muscle: "Legs", category: "barbell" },
  { name: "Front Squat", muscle: "Legs", category: "barbell" },
  { name: "Leg Press", muscle: "Legs", category: "machine" },
  { name: "Hack Squat", muscle: "Legs", category: "machine" },
  { name: "Romanian Deadlift", muscle: "Legs", category: "barbell" },
  { name: "Leg Curl", muscle: "Legs", category: "machine" },
  { name: "Leg Extension", muscle: "Legs", category: "machine" },
  { name: "Bulgarian Split Squat", muscle: "Legs", category: "dumbbell" },
  { name: "Walking Lunges", muscle: "Legs", category: "dumbbell" },
  { name: "Calf Raises", muscle: "Legs", category: "machine" },
  { name: "Goblet Squat", muscle: "Legs", category: "dumbbell" },
  { name: "Hip Thrust", muscle: "Legs", category: "barbell" },
  { name: "Sumo Deadlift", muscle: "Legs", category: "barbell" },

  // ===== ARMS (BICEPS) =====
  { name: "Barbell Curl", muscle: "Biceps", category: "barbell" },
  { name: "Dumbbell Curl", muscle: "Biceps", category: "dumbbell" },
  { name: "Hammer Curl", muscle: "Biceps", category: "dumbbell" },
  { name: "Preacher Curl", muscle: "Biceps", category: "barbell" },
  { name: "Concentration Curl", muscle: "Biceps", category: "dumbbell" },
  { name: "Cable Curl", muscle: "Biceps", category: "cable" },
  { name: "Incline Dumbbell Curl", muscle: "Biceps", category: "dumbbell" },

  // ===== ARMS (TRICEPS) =====
  { name: "Tricep Pushdown", muscle: "Triceps", category: "cable" },
  { name: "Overhead Tricep Extension", muscle: "Triceps", category: "dumbbell" },
  { name: "Skull Crushers", muscle: "Triceps", category: "barbell" },
  { name: "Close Grip Bench Press", muscle: "Triceps", category: "barbell" },
  { name: "Dips (Triceps)", muscle: "Triceps", category: "bodyweight" },
  { name: "Tricep Kickback", muscle: "Triceps", category: "dumbbell" },
  { name: "Rope Pushdown", muscle: "Triceps", category: "cable" },

  // ===== CORE =====
  { name: "Plank", muscle: "Core", category: "bodyweight" },
  { name: "Crunches", muscle: "Core", category: "bodyweight" },
  { name: "Hanging Leg Raise", muscle: "Core", category: "bodyweight" },
  { name: "Russian Twist", muscle: "Core", category: "bodyweight" },
  { name: "Cable Crunch", muscle: "Core", category: "cable" },
  { name: "Ab Wheel Rollout", muscle: "Core", category: "bodyweight" },
  { name: "Mountain Climbers", muscle: "Core", category: "bodyweight" },
  { name: "Dead Bug", muscle: "Core", category: "bodyweight" },

  // ===== CARDIO =====
  { name: "Running", muscle: "Cardio", category: "cardio" },
  { name: "Cycling", muscle: "Cardio", category: "cardio" },
  { name: "Rowing Machine", muscle: "Cardio", category: "cardio" },
  { name: "Jump Rope", muscle: "Cardio", category: "cardio" },
  { name: "Stair Climber", muscle: "Cardio", category: "cardio" },
  { name: "Elliptical", muscle: "Cardio", category: "cardio" },
  { name: "Swimming", muscle: "Cardio", category: "cardio" },
  { name: "Battle Ropes", muscle: "Cardio", category: "cardio" },
  { name: "Burpees", muscle: "Cardio", category: "bodyweight" },
];

export const MUSCLE_GROUPS = [...new Set(EXERCISES.map((e) => e.muscle))];

export function searchExercises(query: string): Exercise[] {
  if (!query.trim()) return EXERCISES;
  const q = query.toLowerCase();
  return EXERCISES.filter(
    (e) => e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q) || e.category.includes(q)
  );
}

export function getExercisesByMuscle(muscle: string): Exercise[] {
  return EXERCISES.filter((e) => e.muscle === muscle);
}
