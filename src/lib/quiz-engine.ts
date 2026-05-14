import type { QuizData, Recommendations, Somatotype } from "./quiz-types";

const num = (s: string | undefined, fallback = 0) => {
  const n = parseFloat(s || "");
  return isFinite(n) && n > 0 ? n : fallback;
};

// US Navy body-fat formula. Requires waist + neck (men) or waist + hip + neck (women).
function navyBodyFat(d: QuizData): number | null {
  const h = num(d.height);
  const waist = num(d.waist);
  const neck = num(d.neck);
  if (!h || !waist || !neck) return null;
  const isMale = d.gender !== "Female";
  try {
    if (isMale) {
      if (waist <= neck) return null;
      const bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450;
      return clamp(bf, 3, 60);
    } else {
      const hip = num(d.hip);
      if (!hip || waist + hip <= neck) return null;
      const bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(h)) - 450;
      return clamp(bf, 8, 60);
    }
  } catch {
    return null;
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function frameSize(d: QuizData): "small" | "medium" | "large" | "unknown" {
  const wrist = num(d.wrist);
  const h = num(d.height);
  if (!wrist || !h) return "unknown";
  // Approx: ratio of height to wrist circumference
  const r = h / wrist;
  const isMale = d.gender !== "Female";
  if (isMale) {
    if (r > 10.4) return "small";
    if (r > 9.6) return "medium";
    return "large";
  } else {
    if (r > 11) return "small";
    if (r > 10.1) return "medium";
    return "large";
  }
}

function bmiCategory(bmi: number): string {
  if (!bmi) return "—";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese I";
  return "Obese II+";
}

// Activity multiplier from job + steps + training days. More accurate than days-only.
function activityMultiplier(d: QuizData): number {
  let mult = 1.2; // sedentary baseline
  const jobMap: Record<string, number> = {
    sedentary: 1.2,
    light: 1.3,
    moderate: 1.45,
    active: 1.6,
  };
  if (d.job && jobMap[d.job]) mult = jobMap[d.job];

  const steps = num(d.dailySteps);
  if (steps >= 12000) mult += 0.15;
  else if (steps >= 8000) mult += 0.08;
  else if (steps >= 5000) mult += 0.03;

  const days = num(d.daysPerWeek);
  if (days >= 6) mult += 0.15;
  else if (days >= 5) mult += 0.12;
  else if (days >= 4) mult += 0.08;
  else if (days >= 3) mult += 0.05;

  return clamp(mult, 1.2, 2.1);
}

// Infer somatotype from build + tendency + frame, if user didn't pick one.
function inferSomatotype(d: QuizData, bmi: number, frame: string): { type: Somatotype; reason: string } {
  if (d.somatotype && d.somatotype !== "unknown") {
    return { type: d.somatotype, reason: "Based on your self-assessment." };
  }
  // Heuristic combining BMI, frame, and weight tendency
  let ectoScore = 0, mesoScore = 0, endoScore = 0;
  if (bmi && bmi < 20) ectoScore += 2;
  else if (bmi && bmi < 25) mesoScore += 2;
  else if (bmi && bmi >= 25) endoScore += 2;

  if (frame === "small") ectoScore += 2;
  else if (frame === "medium") mesoScore += 2;
  else if (frame === "large") endoScore += 2;

  if (d.weightTendency === "loses_easy") ectoScore += 2;
  else if (d.weightTendency === "balanced") mesoScore += 2;
  else if (d.weightTendency === "gains_easy") endoScore += 2;

  if (d.hunger === "rarely_hungry") ectoScore += 1;
  else if (d.hunger === "always_hungry") endoScore += 1;

  const max = Math.max(ectoScore, mesoScore, endoScore);
  if (max === 0) return { type: "unknown", reason: "Tell us more to refine." };
  const type: Somatotype = ectoScore === max ? "ectomorph" : mesoScore === max ? "mesomorph" : "endomorph";
  const reason = {
    ectomorph: "Lean frame, fast metabolism — you struggle to gain weight.",
    mesomorph: "Athletic build, balanced metabolism — you respond fast to training.",
    endomorph: "Solid frame, slower metabolism — you gain muscle and fat easily.",
    unknown: "",
  }[type];
  return { type, reason };
}

// Metabolism score 1-10 from energy/sleep/stress/hunger/weight tendency/cold tolerance.
function metabolismScore(d: QuizData): { score: number; label: "slow" | "moderate" | "fast"; insights: string[] } {
  let score = 5;
  const insights: string[] = [];

  if (d.energy === "high") score += 1;
  else if (d.energy === "low") { score -= 1; insights.push("Low energy can signal under-eating or poor sleep."); }

  const sleep = num(d.sleepHours);
  if (sleep >= 7) score += 1;
  else if (sleep > 0 && sleep < 6) { score -= 1; insights.push("Sleeping under 6 hrs slashes recovery and slows fat loss."); }

  if (d.sleepQuality === "good") score += 0.5;
  else if (d.sleepQuality === "poor") { score -= 0.5; insights.push("Poor sleep elevates cortisol and stalls progress."); }

  if (d.stress === "low") score += 0.5;
  else if (d.stress === "high") { score -= 1; insights.push("Chronic stress promotes belly fat — prioritize recovery."); }

  if (d.hunger === "always_hungry") { score += 0.5; insights.push("High appetite suggests a faster metabolic engine."); }
  else if (d.hunger === "rarely_hungry") { score -= 0.5; insights.push("Low hunger can mean a sluggish metabolism — protein at every meal helps."); }

  if (d.weightTendency === "loses_easy") score += 1;
  else if (d.weightTendency === "gains_easy") score -= 1;

  if (d.coldTolerance === "low") { score -= 0.5; insights.push("Often cold? Low calorie intake or low muscle mass can be the cause."); }

  score = clamp(Math.round(score), 1, 10);
  const label = score >= 7 ? "fast" : score <= 4 ? "slow" : "moderate";
  return { score, label, insights };
}

// Fitness Age — combines resting HR, push-ups, plank, BMI relative to chronological age.
function computeFitnessAge(d: QuizData, age: number): number | null {
  const rhr = num(d.restingHR);
  const pushups = num(d.pushUps);
  const plank = num(d.plankSeconds);
  if (!rhr && !pushups && !plank) return null;

  let delta = 0; // years older/younger than chronological
  const isMale = d.gender !== "Female";

  // Resting HR (lower = younger)
  if (rhr) {
    if (rhr < 55) delta -= 6;
    else if (rhr < 60) delta -= 4;
    else if (rhr < 65) delta -= 2;
    else if (rhr < 70) delta += 0;
    else if (rhr < 75) delta += 2;
    else if (rhr < 80) delta += 4;
    else delta += 7;
  }

  // Push-ups
  if (pushups) {
    const target = isMale ? 30 : 18;
    const ratio = pushups / target;
    if (ratio >= 1.5) delta -= 5;
    else if (ratio >= 1.2) delta -= 3;
    else if (ratio >= 0.9) delta -= 1;
    else if (ratio >= 0.6) delta += 2;
    else delta += 5;
  }

  // Plank
  if (plank) {
    if (plank >= 120) delta -= 4;
    else if (plank >= 90) delta -= 2;
    else if (plank >= 60) delta += 0;
    else if (plank >= 30) delta += 2;
    else delta += 5;
  }

  // BMI penalty
  const bmi = bmiVal(d);
  if (bmi >= 30) delta += 5;
  else if (bmi >= 25) delta += 2;

  // Sleep penalty
  const sleep = num(d.sleepHours);
  if (sleep > 0 && sleep < 6) delta += 2;

  // Stress
  if (d.stress === "high") delta += 1;

  const fa = Math.max(16, Math.round(age + delta));
  return fa;
}

function bmiVal(d: QuizData): number {
  const h = num(d.height) / 100;
  const w = num(d.weight);
  if (!h || !w) return 0;
  return w / (h * h);
}

export function getRecommendations(d: QuizData): Recommendations {
  const w = num(d.weight, 70);
  const h = num(d.height, 170);
  const age = num(d.age, 25);
  const isMale = d.gender !== "Female";
  const bmi = bmiVal(d);

  // Mifflin-St Jeor BMR (default)
  let bmr = isMale ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;

  // If we have Navy BF%, use Katch-McArdle (more accurate)
  const bf = navyBodyFat(d);
  const bfEstimate = bf ?? num(d.bodyFatEstimate);
  if (bfEstimate > 0) {
    const lbm = w * (1 - bfEstimate / 100);
    bmr = 370 + 21.6 * lbm;
  }
  bmr = Math.round(bmr);

  const mult = activityMultiplier(d);
  const tdee = Math.round(bmr * mult);

  // Goal-driven calorie target
  let calories = tdee;
  let proteinPerKg = 1.8;
  if (d.goal === "lose_fat") { calories = Math.round(tdee * 0.8); proteinPerKg = 2.2; }
  else if (d.goal === "build_muscle") { calories = Math.round(tdee * 1.12); proteinPerKg = 2.0; }
  else if (d.goal === "strength") { calories = Math.round(tdee * 1.08); proteinPerKg = 2.2; }
  else if (d.goal === "endurance") { calories = tdee; proteinPerKg = 1.6; }

  // Target weight + deadline override
  const targetW = num(d.targetWeight);
  const deadline = num(d.deadlineWeeks);
  let weeklyChangeKg = 0;
  let estimatedWeeksToGoal: number | null = null;
  let weeklyDeficit = 0;
  if (targetW && deadline) {
    const delta = targetW - w; // negative = lose
    weeklyChangeKg = delta / deadline;
    // Safety clamp: max 1% bw / week
    const maxRate = w * 0.01;
    weeklyChangeKg = clamp(weeklyChangeKg, -maxRate, maxRate);
    weeklyDeficit = Math.round(weeklyChangeKg * 7700); // ~7700 kcal per kg fat
    calories = Math.round(tdee + weeklyDeficit / 7);
    estimatedWeeksToGoal = Math.ceil(Math.abs(delta / weeklyChangeKg));
  }

  // Adjust for endomorph: slightly more protein, fewer carbs
  const { type: bodyType, reason: bodyTypeReason } = inferSomatotype(d, bmi, frameSize(d));
  if (bodyType === "endomorph") proteinPerKg = Math.max(proteinPerKg, 2.0);
  if (bodyType === "ectomorph" && d.goal === "build_muscle") {
    calories = Math.round(tdee * 1.18);
  }

  const protein = Math.round(w * proteinPerKg);
  const fatRatio = bodyType === "endomorph" ? 0.3 : 0.25;
  const fatCals = calories * fatRatio;
  const fat = Math.round(fatCals / 9);
  const carbCals = Math.max(0, calories - protein * 4 - fatCals);
  const carbs = Math.round(carbCals / 4);

  // Split selection
  const days = num(d.daysPerWeek) || 3;
  let split = "Full Body (3 days)";
  let splitReason = "A great foundation for beginners.";
  if (days >= 6) { split = "Push / Pull / Legs (6 days)"; splitReason = "Hit each muscle 2×/week — top hypertrophy frequency."; }
  else if (days >= 5) { split = "Upper / Lower + PPL hybrid (5 days)"; splitReason = "Balanced 5-day for intermediates."; }
  else if (days >= 4) { split = "Upper / Lower (4 days)"; splitReason = "Optimal frequency-to-recovery ratio."; }
  if (d.experience === "beginner" && days >= 5) {
    split = "Upper / Lower (4 days) + 1 conditioning";
    splitReason = "Build a base before pushing volume — extra day for cardio.";
  }
  if (d.trainingStyle === "calisthenics") {
    split = "Bodyweight Push/Pull/Legs";
    splitReason = "Optimized for skill + strength using just your body.";
  } else if (d.trainingStyle === "hiit") {
    split = `${days}-day Strength + HIIT`;
    splitReason = "Lifting paired with HIIT for max conditioning.";
  } else if (d.trainingStyle === "strength") {
    split = days >= 4 ? "Upper / Lower Strength (4×)" : "5×5 Full Body";
    splitReason = "Heavy compound focus, low reps, long rest.";
  }

  // Metabolism
  const meta = metabolismScore(d);

  // Fitness age
  const fitnessAge = computeFitnessAge(d, age);

  // Insights & warnings
  const insights: string[] = [];
  const warnings: string[] = [];

  if (bf !== null) insights.push(`Your estimated body fat is ${bf.toFixed(1)}% (US Navy method).`);
  if (bodyType !== "unknown") insights.push(`You're a ${capitalize(bodyType)} — ${bodyTypeReason}`);
  insights.push(`Your metabolism is ${meta.label} (${meta.score}/10).`);
  if (fitnessAge !== null) {
    const diff = fitnessAge - age;
    if (diff <= -3) insights.push(`Fitness age ${fitnessAge} — ${Math.abs(diff)} years younger than your real age. Elite!`);
    else if (diff >= 5) insights.push(`Fitness age ${fitnessAge} — ${diff} years older than your real age. We can fix this in 8 weeks.`);
    else insights.push(`Fitness age ${fitnessAge} — close to your real age (${age}).`);
  }
  if (estimatedWeeksToGoal) {
    insights.push(`At a safe pace, you'll hit ${targetW}kg in ~${estimatedWeeksToGoal} weeks.`);
  }

  if (bmi >= 30) warnings.push("Your BMI suggests Obese — consider a slower deficit (15%) and joint-friendly cardio.");
  if (num(d.sleepHours) > 0 && num(d.sleepHours) < 6) warnings.push("Under 6 hrs of sleep — fix this before chasing aggressive goals.");
  if (d.stress === "high") warnings.push("High stress is a hidden plateau driver. Walks + breathwork are non-negotiable.");
  if (d.injuries && d.injuries.length > 0 && !d.injuries.includes("none")) warnings.push(`We'll filter exercises that aggravate: ${d.injuries.filter(x => x !== "none").join(", ")}.`);
  if (targetW && deadline) {
    const requested = (targetW - w) / deadline;
    const safe = w * 0.01;
    if (Math.abs(requested) > safe) warnings.push(`Your timeline is faster than safe (1% bw/week). We adjusted to a sustainable pace.`);
  }

  return {
    calories, protein, carbs, fat, bmr, tdee,
    bmi, bmiCategory: bmiCategory(bmi),
    bodyFat: bf ?? (num(d.bodyFatEstimate) || null),
    bodyFatMethod: bf !== null ? "US Navy" : (num(d.bodyFatEstimate) ? "Visual estimate" : "—"),
    whr: num(d.waist) && num(d.hip) ? +(num(d.waist) / num(d.hip)).toFixed(2) : null,
    frameSize: frameSize(d),
    bodyType, bodyTypeReason,
    metabolismScore: meta.score,
    metabolismLabel: meta.label,
    metabolismInsights: meta.insights,
    fitnessAge,
    chronologicalAge: age,
    split, splitReason,
    weeklyDeficit, estimatedWeeksToGoal, weeklyChangeKg: +weeklyChangeKg.toFixed(2),
    insights, warnings,
  };
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Encode quiz data into a compact URL-safe string for sharing
export function encodeShareToken(d: QuizData): string {
  const minimal = {
    g: d.gender, a: d.age, h: d.height, w: d.weight,
    bt: d.somatotype, go: d.goal, dp: d.daysPerWeek,
    rhr: d.restingHR, pu: d.pushUps, pl: d.plankSeconds,
    sl: d.sleepHours, st: d.stress, en: d.energy,
  };
  return Buffer.from(JSON.stringify(minimal)).toString("base64url");
}

export function decodeShareToken(token: string): Partial<QuizData> | null {
  try {
    const obj = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    return {
      gender: obj.g, age: obj.a, height: obj.h, weight: obj.w,
      somatotype: obj.bt, goal: obj.go, daysPerWeek: obj.dp,
      restingHR: obj.rhr, pushUps: obj.pu, plankSeconds: obj.pl,
      sleepHours: obj.sl, stress: obj.st, energy: obj.en,
    };
  } catch { return null; }
}
