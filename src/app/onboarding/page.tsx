"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Step = "welcome" | "basics" | "goal" | "experience" | "schedule" | "diet" | "results";

type QuizData = {
  gender: string;
  age: string;
  height: string;
  weight: string;
  goal: string;
  experience: string;
  daysPerWeek: string;
  dietType: string;
  allergies: string[];
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [data, setData] = useState<QuizData>({
    gender: "", age: "", height: "", weight: "", goal: "", experience: "", daysPerWeek: "", dietType: "", allergies: [],
  });

  function update(field: keyof QuizData, value: string | string[]) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  function next() {
    const steps: Step[] = ["welcome", "basics", "goal", "experience", "schedule", "diet", "results"];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  }

  function back() {
    const steps: Step[] = ["welcome", "basics", "goal", "experience", "schedule", "diet", "results"];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  }

  async function finish() {
    // Save quiz data to profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const bmi = calcBMI(data.height, data.weight);
      await supabase.from("profiles").update({
        bio: JSON.stringify({ quiz: data, bmi }),
      }).eq("id", user.id);
    }
    window.location.href = "/dashboard";
  }

  const bmi = calcBMI(data.height, data.weight);
  const recommendations = getRecommendations(data);

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {step === "welcome" && (
          <div className="text-center">
            <span className="text-amber-500 font-black text-3xl tracking-tight">GRIT<span className="text-neutral-500">ZONE</span></span>
            <p className="text-neutral-400 text-sm mt-4 mb-2">Let&apos;s personalize your experience.</p>
            <p className="text-neutral-600 text-xs mb-8">Takes 60 seconds. Helps us suggest workouts, macros & goals.</p>
            <button onClick={next} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl py-4 text-lg transition-colors">
              Let&apos;s Go →
            </button>
            <button onClick={() => { window.location.href = "/dashboard"; }} className="mt-4 text-neutral-500 text-xs hover:underline">
              Skip for now
            </button>
          </div>
        )}

        {step === "basics" && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">Step 1 of 5</p>
            <h2 className="text-xl font-bold mb-6">About You</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-neutral-400 mb-2 block">Gender</label>
                <div className="flex gap-2">
                  {["Male", "Female", "Other"].map(g => (
                    <button key={g} onClick={() => update("gender", g)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${data.gender === g ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400"}`}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-2 block">Age</label>
                <input type="number" placeholder="25" value={data.age} onChange={(e) => update("age", e.target.value)} className="text-center text-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-2 block">Height (cm)</label>
                  <input type="number" placeholder="170" value={data.height} onChange={(e) => update("height", e.target.value)} className="text-center" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-2 block">Weight (kg)</label>
                  <input type="number" placeholder="70" value={data.weight} onChange={(e) => update("weight", e.target.value)} className="text-center" />
                </div>
              </div>
              {bmi > 0 && (
                <div className="bg-neutral-900 rounded-xl p-3 text-center">
                  <p className="text-xs text-neutral-500">Your BMI</p>
                  <p className={`text-2xl font-bold ${bmi < 18.5 ? "text-blue-400" : bmi < 25 ? "text-green-400" : bmi < 30 ? "text-amber-400" : "text-red-400"}`}>{bmi.toFixed(1)}</p>
                  <p className="text-[10px] text-neutral-500">{bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={back} className="px-4 bg-neutral-800 text-neutral-400 rounded-xl py-3">←</button>
              <button onClick={next} disabled={!data.gender || !data.age || !data.height || !data.weight} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-bold rounded-xl py-3">Next</button>
            </div>
          </div>
        )}

        {step === "goal" && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">Step 2 of 5</p>
            <h2 className="text-xl font-bold mb-6">What&apos;s your goal?</h2>
            <div className="flex flex-col gap-2">
              {[
                { value: "lose_fat", label: "Lose Fat", desc: "Reduce body fat while maintaining muscle", icon: "🔥" },
                { value: "build_muscle", label: "Build Muscle", desc: "Gain lean mass and strength", icon: "💪" },
                { value: "maintain", label: "Stay Fit", desc: "Maintain current physique & health", icon: "⚖️" },
                { value: "strength", label: "Get Stronger", desc: "Increase max lifts and power", icon: "🏋️" },
                { value: "endurance", label: "Improve Endurance", desc: "Run longer, recover faster", icon: "🏃" },
              ].map(g => (
                <button key={g.value} onClick={() => { update("goal", g.value); next(); }} className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${data.goal === g.value ? "bg-amber-500/10 border-amber-500/30" : "bg-[#141414] border-neutral-800 hover:border-neutral-700"}`}>
                  <span className="text-2xl">{g.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{g.label}</p>
                    <p className="text-[10px] text-neutral-500">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={back} className="mt-4 text-neutral-500 text-xs hover:underline">← Back</button>
          </div>
        )}

        {step === "experience" && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">Step 3 of 5</p>
            <h2 className="text-xl font-bold mb-6">Training Experience</h2>
            <div className="flex flex-col gap-2">
              {[
                { value: "beginner", label: "Beginner", desc: "< 6 months of consistent training", icon: "🌱" },
                { value: "intermediate", label: "Intermediate", desc: "6 months – 2 years", icon: "🌿" },
                { value: "advanced", label: "Advanced", desc: "2+ years of serious training", icon: "🌳" },
              ].map(e => (
                <button key={e.value} onClick={() => { update("experience", e.value); next(); }} className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${data.experience === e.value ? "bg-amber-500/10 border-amber-500/30" : "bg-[#141414] border-neutral-800 hover:border-neutral-700"}`}>
                  <span className="text-2xl">{e.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{e.label}</p>
                    <p className="text-[10px] text-neutral-500">{e.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={back} className="mt-4 text-neutral-500 text-xs hover:underline">← Back</button>
          </div>
        )}

        {step === "schedule" && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">Step 4 of 5</p>
            <h2 className="text-xl font-bold mb-6">How often can you train?</h2>
            <div className="flex flex-col gap-2">
              {[
                { value: "3", label: "3 days/week", desc: "Full body recommended" },
                { value: "4", label: "4 days/week", desc: "Upper/Lower split ideal" },
                { value: "5", label: "5 days/week", desc: "PPL or muscle group split" },
                { value: "6", label: "6 days/week", desc: "PPL (each twice) or Bro Split" },
              ].map(s => (
                <button key={s.value} onClick={() => { update("daysPerWeek", s.value); next(); }} className={`p-4 rounded-2xl border text-left transition-colors ${data.daysPerWeek === s.value ? "bg-amber-500/10 border-amber-500/30" : "bg-[#141414] border-neutral-800 hover:border-neutral-700"}`}>
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-[10px] text-neutral-500">{s.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={back} className="mt-4 text-neutral-500 text-xs hover:underline">← Back</button>
          </div>
        )}

        {step === "diet" && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">Step 5 of 5</p>
            <h2 className="text-xl font-bold mb-6">Diet Preference</h2>
            <div className="flex flex-col gap-2 mb-6">
              {[
                { value: "veg", label: "Vegetarian", icon: "🥬" },
                { value: "nonveg", label: "Non-Vegetarian", icon: "🍗" },
                { value: "eggetarian", label: "Eggetarian", icon: "🥚" },
                { value: "vegan", label: "Vegan", icon: "🌱" },
              ].map(d => (
                <button key={d.value} onClick={() => update("dietType", d.value)} className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${data.dietType === d.value ? "bg-amber-500/10 border-amber-500/30" : "bg-[#141414] border-neutral-800 hover:border-neutral-700"}`}>
                  <span className="text-xl">{d.icon}</span>
                  <p className="font-semibold text-sm">{d.label}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="px-4 bg-neutral-800 text-neutral-400 rounded-xl py-3">←</button>
              <button onClick={next} disabled={!data.dietType} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-bold rounded-xl py-3">See My Plan</button>
            </div>
          </div>
        )}

        {step === "results" && (
          <div>
            <h2 className="text-xl font-bold mb-2">Your Personalized Plan</h2>
            <p className="text-xs text-neutral-500 mb-5">Based on your profile & goals</p>

            <div className="flex flex-col gap-4 mb-6">
              {/* Macros */}
              <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
                <h3 className="text-sm font-semibold text-amber-400 mb-3">Daily Macros Target</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-neutral-900 rounded-lg py-2">
                    <p className="text-amber-400 font-bold">{recommendations.calories}</p>
                    <p className="text-[9px] text-neutral-500">Cal</p>
                  </div>
                  <div className="bg-neutral-900 rounded-lg py-2">
                    <p className="text-blue-400 font-bold">{recommendations.protein}g</p>
                    <p className="text-[9px] text-neutral-500">Protein</p>
                  </div>
                  <div className="bg-neutral-900 rounded-lg py-2">
                    <p className="text-amber-300 font-bold">{recommendations.carbs}g</p>
                    <p className="text-[9px] text-neutral-500">Carbs</p>
                  </div>
                  <div className="bg-neutral-900 rounded-lg py-2">
                    <p className="text-pink-400 font-bold">{recommendations.fat}g</p>
                    <p className="text-[9px] text-neutral-500">Fat</p>
                  </div>
                </div>
              </div>

              {/* Workout Suggestion */}
              <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
                <h3 className="text-sm font-semibold text-amber-400 mb-2">Recommended Split</h3>
                <p className="text-sm font-medium">{recommendations.split}</p>
                <p className="text-xs text-neutral-500 mt-1">{recommendations.splitReason}</p>
              </div>

              {/* Pro Upsell */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👑</span>
                  <h3 className="text-sm font-bold text-amber-400">Unlock Full Plan with Pro</h3>
                </div>
                <ul className="text-xs text-neutral-400 flex flex-col gap-1 mb-3">
                  <li>✓ Detailed weekly meal plan for your macros</li>
                  <li>✓ Customized workout regime auto-generated</li>
                  <li>✓ Progressive overload suggestions</li>
                  <li>✓ Weekly adjustments based on progress</li>
                </ul>
                <a href="/pro" className="block text-center bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-2.5 text-sm transition-colors">
                  View Pro Plans →
                </a>
              </div>
            </div>

            <button onClick={finish} className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl py-3 transition-colors">
              Continue with Free →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function calcBMI(height: string, weight: string): number {
  const h = parseFloat(height) / 100;
  const w = parseFloat(weight);
  if (!h || !w || h <= 0) return 0;
  return w / (h * h);
}

function getRecommendations(data: QuizData) {
  const w = parseFloat(data.weight) || 70;
  const h = parseFloat(data.height) || 170;
  const age = parseInt(data.age) || 25;
  const isMale = data.gender !== "Female";

  // Mifflin-St Jeor BMR
  const bmr = isMale
    ? 10 * w + 6.25 * h - 5 * age + 5
    : 10 * w + 6.25 * h - 5 * age - 161;

  const activityMultiplier = parseFloat(data.daysPerWeek) >= 5 ? 1.55 : parseFloat(data.daysPerWeek) >= 3 ? 1.375 : 1.2;
  let tdee = Math.round(bmr * activityMultiplier);

  let calories = tdee;
  let protein = Math.round(w * 1.8);
  if (data.goal === "lose_fat") { calories = Math.round(tdee * 0.8); protein = Math.round(w * 2.2); }
  else if (data.goal === "build_muscle") { calories = Math.round(tdee * 1.15); protein = Math.round(w * 2.0); }
  else if (data.goal === "strength") { calories = Math.round(tdee * 1.1); protein = Math.round(w * 2.2); }

  const fatCals = calories * 0.25;
  const fat = Math.round(fatCals / 9);
  const carbCals = calories - (protein * 4) - fatCals;
  const carbs = Math.round(carbCals / 4);

  let split = "Full Body (3 days)";
  let splitReason = "Great for beginners to build a foundation.";
  const days = parseInt(data.daysPerWeek) || 3;
  if (days >= 6) { split = "Push / Pull / Legs"; splitReason = "Hit each muscle 2×/week with good volume."; }
  else if (days >= 5) { split = "Upper/Lower + Push/Pull/Legs"; splitReason = "5-day hybrid for balanced development."; }
  else if (days >= 4) { split = "Upper / Lower (4 days)"; splitReason = "Good balance of frequency and recovery."; }

  if (data.experience === "beginner" && days >= 5) {
    split = "Upper / Lower (4 days) + 1 Cardio";
    splitReason = "Build a base before high volume. Extra day for cardio/conditioning.";
  }

  return { calories, protein, carbs, fat, split, splitReason };
}
