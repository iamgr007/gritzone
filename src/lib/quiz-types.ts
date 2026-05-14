// Shared types for the GritZone Body Blueprint quiz.
// Used by /onboarding (in-app) and /quiz (public marketing funnel).

export type Somatotype = "ectomorph" | "mesomorph" | "endomorph" | "unknown";
export type EnergyLevel = "low" | "medium" | "high";
export type SleepQuality = "poor" | "ok" | "good";
export type StressLevel = "low" | "medium" | "high";
export type HungerPattern = "always_hungry" | "normal" | "rarely_hungry";
export type WeightTendency = "gains_easy" | "balanced" | "loses_easy";
export type JobActivity = "sedentary" | "light" | "moderate" | "active";
export type Equipment = "full_gym" | "home_dumbbells" | "bodyweight" | "resistance_bands";
export type TrainingStyle = "strength" | "hypertrophy" | "hiit" | "calisthenics" | "balanced";
export type CookingTime = "minimal" | "moderate" | "love_cooking";
export type Budget = "low" | "medium" | "high";
export type Motivation = "aesthetics" | "health" | "performance" | "longevity";

export type QuizData = {
  // Basics
  gender: string;
  age: string;
  height: string; // cm
  weight: string; // kg

  // Body measurements (optional, unlocks Navy BF%)
  waist: string; // cm
  hip: string; // cm (women only for Navy formula)
  neck: string; // cm
  wrist: string; // cm

  // Body type
  somatotype: Somatotype;
  bodyFatEstimate: string; // visual %

  // Metabolism signals
  energy: EnergyLevel | "";
  sleepHours: string;
  sleepQuality: SleepQuality | "";
  stress: StressLevel | "";
  hunger: HungerPattern | "";
  weightTendency: WeightTendency | "";
  coldTolerance: "low" | "normal" | "high" | "";

  // Lifestyle
  job: JobActivity | "";
  dailySteps: string; // estimate

  // Training
  experience: string;
  daysPerWeek: string;
  equipment: Equipment | "";
  trainingStyle: TrainingStyle | "";
  benchPress: string; // kg, optional
  squat: string;
  deadlift: string;
  injuries: string[]; // knee, back, shoulder, none
  preferredTime: "morning" | "afternoon" | "evening" | "";

  // Goal
  goal: string;
  targetWeight: string;
  deadlineWeeks: string;
  motivation: Motivation | "";

  // Diet
  dietType: string;
  mealsPerDay: string;
  cuisine: string[];
  dislikes: string;
  allergies: string[];
  cookingTime: CookingTime | "";
  budget: Budget | "";

  // Quick fitness tests (optional - powers Fitness Age)
  pushUps: string;
  plankSeconds: string;
  restingHR: string;

  // Contact (public quiz only)
  email?: string;
  name?: string;
  phone?: string;
};

export type Recommendations = {
  // Macros
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;

  // Body composition
  bmi: number;
  bmiCategory: string;
  bodyFat: number | null; // navy method or estimate
  bodyFatMethod: string;
  whr: number | null; // waist-to-hip ratio
  frameSize: "small" | "medium" | "large" | "unknown";

  // Body type
  bodyType: Somatotype;
  bodyTypeReason: string;

  // Metabolism
  metabolismScore: number; // 1-10
  metabolismLabel: "slow" | "moderate" | "fast";
  metabolismInsights: string[];

  // Fitness age
  fitnessAge: number | null;
  chronologicalAge: number;

  // Plan
  split: string;
  splitReason: string;
  weeklyDeficit: number; // kcal/week deficit or surplus
  estimatedWeeksToGoal: number | null;
  weeklyChangeKg: number;

  // Personalized insights (3-5 punchy bullets for marketing)
  insights: string[];
  warnings: string[];
};

export const EMPTY_QUIZ: QuizData = {
  gender: "", age: "", height: "", weight: "",
  waist: "", hip: "", neck: "", wrist: "",
  somatotype: "unknown", bodyFatEstimate: "",
  energy: "", sleepHours: "", sleepQuality: "", stress: "",
  hunger: "", weightTendency: "", coldTolerance: "",
  job: "", dailySteps: "",
  experience: "", daysPerWeek: "", equipment: "", trainingStyle: "",
  benchPress: "", squat: "", deadlift: "", injuries: [], preferredTime: "",
  goal: "", targetWeight: "", deadlineWeeks: "", motivation: "",
  dietType: "", mealsPerDay: "", cuisine: [], dislikes: "", allergies: [],
  cookingTime: "", budget: "",
  pushUps: "", plankSeconds: "", restingHR: "",
};
