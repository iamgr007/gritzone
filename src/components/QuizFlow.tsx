"use client";

import { useState } from "react";
import { EMPTY_QUIZ, type QuizData } from "@/lib/quiz-types";

export type QuizStep =
  | "welcome"
  | "basics"
  | "measurements"
  | "bodytype"
  | "metabolism"
  | "lifestyle"
  | "training"
  | "equipment"
  | "tests"
  | "goal"
  | "diet"
  | "contact"
  | "results";

export const QUIZ_STEPS_AUTH: QuizStep[] = [
  "welcome", "basics", "measurements", "bodytype", "metabolism",
  "lifestyle", "training", "equipment", "tests", "goal", "diet", "results",
];

export const QUIZ_STEPS_PUBLIC: QuizStep[] = [
  "welcome", "basics", "measurements", "bodytype", "metabolism",
  "lifestyle", "training", "equipment", "tests", "goal", "diet", "contact", "results",
];

type Props = {
  data: QuizData;
  setData: (d: QuizData) => void;
  step: QuizStep;
  setStep: (s: QuizStep) => void;
  steps: QuizStep[];
  onFinish: () => void;
  finishLabel?: string;
  saving?: boolean;
  publicMode?: boolean;
  resultsNode?: React.ReactNode; // injected results UI
};

export function useQuizState(initial?: Partial<QuizData>) {
  const [data, setData] = useState<QuizData>({ ...EMPTY_QUIZ, ...initial });
  const [step, setStep] = useState<QuizStep>("welcome");
  return { data, setData, step, setStep };
}

export default function QuizFlow(props: Props) {
  const { data, setData, step, setStep, steps, onFinish, saving, publicMode, resultsNode } = props;
  const finishLabel = props.finishLabel || "Continue →";

  const upd = <K extends keyof QuizData>(k: K, v: QuizData[K]) => setData({ ...data, [k]: v });
  const toggleArr = (k: keyof QuizData, v: string) => {
    const cur = (data[k] as unknown as string[]) || [];
    const next = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
    setData({ ...data, [k]: next as unknown as QuizData[typeof k] });
  };

  const idx = steps.indexOf(step);
  const totalQuestionSteps = steps.length - 2; // exclude welcome + results
  const progress = Math.max(0, Math.min(100, Math.round(((idx) / (steps.length - 1)) * 100)));
  const stepNumber = Math.max(1, idx);

  const next = () => { if (idx < steps.length - 1) setStep(steps[idx + 1]); };
  const back = () => { if (idx > 0) setStep(steps[idx - 1]); };

  return (
    <div className="min-h-dvh flex items-start justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {step !== "welcome" && step !== "results" && (
          <div className="mb-5">
            <div className="flex justify-between text-[10px] text-neutral-500 mb-1.5">
              <span>Step {stepNumber} of {totalQuestionSteps}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {step === "welcome" && <Welcome onNext={next} publicMode={publicMode} />}
        {step === "basics" && <Basics data={data} upd={upd} onBack={back} onNext={next} />}
        {step === "measurements" && <Measurements data={data} upd={upd} onBack={back} onNext={next} />}
        {step === "bodytype" && <BodyType data={data} upd={upd} onBack={back} onNext={next} />}
        {step === "metabolism" && <Metabolism data={data} upd={upd} onBack={back} onNext={next} />}
        {step === "lifestyle" && <Lifestyle data={data} upd={upd} onBack={back} onNext={next} />}
        {step === "training" && <Training data={data} upd={upd} onBack={back} onNext={next} />}
        {step === "equipment" && <Equipment data={data} upd={upd} toggleArr={toggleArr} onBack={back} onNext={next} />}
        {step === "tests" && <Tests data={data} upd={upd} onBack={back} onNext={next} />}
        {step === "goal" && <Goal data={data} upd={upd} onBack={back} onNext={next} />}
        {step === "diet" && <Diet data={data} upd={upd} toggleArr={toggleArr} onBack={back} onNext={next} />}
        {step === "contact" && <Contact data={data} upd={upd} onBack={back} onNext={next} />}
        {step === "results" && (
          <div>
            {resultsNode}
            <button onClick={onFinish} disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-xl py-3 mt-4 transition-colors">
              {saving ? "Saving..." : finishLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== STEP COMPONENTS ============== */

function NavBtns({ onBack, onNext, disabled, nextLabel }: { onBack: () => void; onNext: () => void; disabled?: boolean; nextLabel?: string }) {
  return (
    <div className="flex gap-3 mt-6">
      <button onClick={onBack} className="px-4 bg-neutral-800 text-neutral-400 rounded-xl py-3">←</button>
      <button onClick={onNext} disabled={disabled} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-bold rounded-xl py-3">
        {nextLabel || "Next"}
      </button>
    </div>
  );
}

function ChoiceGrid<T extends string>({ value, onChange, options, cols = 2 }: { value: string; onChange: (v: T) => void; options: { value: T; label: string; icon?: string; desc?: string }[]; cols?: number }) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`p-3 rounded-xl border text-left transition-colors ${value === o.value ? "bg-amber-500/10 border-amber-500/40" : "bg-[#141414] border-neutral-800 hover:border-neutral-700"}`}>
          {o.icon && <div className="text-xl mb-0.5">{o.icon}</div>}
          <div className="text-sm font-semibold">{o.label}</div>
          {o.desc && <div className="text-[10px] text-neutral-500 mt-0.5">{o.desc}</div>}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-neutral-400 mb-1.5 block">{label}{hint && <span className="text-neutral-600 ml-1.5">{hint}</span>}</label>
      {children}
    </div>
  );
}

function Welcome({ onNext, publicMode }: { onNext: () => void; publicMode?: boolean }) {
  return (
    <div className="text-center pt-10">
      <span className="text-amber-500 font-black text-3xl tracking-tight">GRIT<span className="text-neutral-500">ZONE</span></span>
      <h1 className="text-2xl font-black mt-6 mb-2">The Body Blueprint Quiz</h1>
      <p className="text-neutral-400 text-sm mb-4">Discover your body type, metabolism, and fitness age — then get a plan built for <em>you</em>.</p>
      <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-4 mb-6 text-left">
        <p className="text-[11px] text-neutral-500 mb-2 font-semibold uppercase tracking-wider">You&apos;ll discover</p>
        <ul className="text-xs text-neutral-300 space-y-1.5">
          <li>✓ Your <span className="text-amber-400">body type</span> (ectomorph / mesomorph / endomorph)</li>
          <li>✓ Your <span className="text-amber-400">metabolism score</span> & fat-loss potential</li>
          <li>✓ Your <span className="text-amber-400">fitness age</span> vs your real age</li>
          <li>✓ Body fat % (US Navy method)</li>
          <li>✓ Daily calorie & macro targets</li>
          <li>✓ Recommended training split</li>
        </ul>
      </div>
      <button onClick={onNext} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl py-4 text-lg transition-colors">
        Start Quiz →
      </button>
      <p className="text-[10px] text-neutral-600 mt-3">~2 minutes • Free • No credit card</p>
      {!publicMode && (
        <button onClick={() => (window.location.href = "/dashboard")} className="mt-4 text-neutral-500 text-xs hover:underline">
          Skip for now
        </button>
      )}
    </div>
  );
}

function Basics({ data, upd, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; onBack: () => void; onNext: () => void }) {
  const valid = data.gender && data.age && data.height && data.weight;
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">About you</h2>
      <p className="text-xs text-neutral-500 mb-5">The basics we need to calibrate everything else.</p>
      <div className="flex flex-col gap-4">
        <Field label="Gender">
          <ChoiceGrid value={data.gender} onChange={(v) => upd("gender", v)} cols={3}
            options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }]} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Age"><input type="number" placeholder="25" value={data.age} onChange={(e) => upd("age", e.target.value)} className="text-center" /></Field>
          <Field label="Height (cm)"><input type="number" placeholder="170" value={data.height} onChange={(e) => upd("height", e.target.value)} className="text-center" /></Field>
          <Field label="Weight (kg)"><input type="number" placeholder="70" value={data.weight} onChange={(e) => upd("weight", e.target.value)} className="text-center" /></Field>
        </div>
      </div>
      <NavBtns onBack={onBack} onNext={onNext} disabled={!valid} />
    </div>
  );
}

function Measurements({ data, upd, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; onBack: () => void; onNext: () => void }) {
  const isFemale = data.gender === "Female";
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Body measurements <span className="text-[11px] text-neutral-500 font-normal">(optional)</span></h2>
      <p className="text-xs text-neutral-500 mb-5">Adds Navy body-fat % and frame-size analysis. Use a tape measure or skip.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Waist (cm)" hint="at navel"><input type="number" placeholder="80" value={data.waist} onChange={(e) => upd("waist", e.target.value)} className="text-center" /></Field>
        <Field label="Neck (cm)" hint="mid-neck"><input type="number" placeholder="38" value={data.neck} onChange={(e) => upd("neck", e.target.value)} className="text-center" /></Field>
        {isFemale && (
          <Field label="Hip (cm)" hint="widest"><input type="number" placeholder="95" value={data.hip} onChange={(e) => upd("hip", e.target.value)} className="text-center" /></Field>
        )}
        <Field label="Wrist (cm)" hint="frame size"><input type="number" placeholder="17" value={data.wrist} onChange={(e) => upd("wrist", e.target.value)} className="text-center" /></Field>
      </div>
      <NavBtns onBack={onBack} onNext={onNext} nextLabel="Next" />
    </div>
  );
}

function BodyType({ data, upd, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Your body type</h2>
      <p className="text-xs text-neutral-500 mb-5">Pick the silhouette closest to your natural build (not your current weight).</p>
      <div className="flex flex-col gap-2 mb-5">
        {[
          { value: "ectomorph", label: "Ectomorph", desc: "Lean, narrow frame, fast metabolism, hard to gain weight", icon: "🥒" },
          { value: "mesomorph", label: "Mesomorph", desc: "Athletic, naturally muscular, gains & loses easily", icon: "🏋️" },
          { value: "endomorph", label: "Endomorph", desc: "Solid frame, gains muscle easily but also fat", icon: "🐻" },
          { value: "unknown", label: "Not sure", desc: "We&apos;ll figure it out from your other answers", icon: "🤷" },
        ].map(o => (
          <button key={o.value} onClick={() => upd("somatotype", o.value as QuizData["somatotype"])}
            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${data.somatotype === o.value ? "bg-amber-500/10 border-amber-500/40" : "bg-[#141414] border-neutral-800 hover:border-neutral-700"}`}>
            <span className="text-2xl">{o.icon}</span>
            <div>
              <p className="font-semibold text-sm">{o.label}</p>
              <p className="text-[10px] text-neutral-500">{o.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <Field label="Current body fat estimate (%)" hint="optional">
        <ChoiceGrid value={data.bodyFatEstimate} onChange={(v) => upd("bodyFatEstimate", v)} cols={5}
          options={[
            { value: "10", label: "10%" }, { value: "15", label: "15%" }, { value: "20", label: "20%" }, { value: "25", label: "25%" }, { value: "30", label: "30%+" },
          ]} />
      </Field>
      <NavBtns onBack={onBack} onNext={onNext} disabled={!data.somatotype} />
    </div>
  );
}

function Metabolism({ data, upd, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Your metabolism signals</h2>
      <p className="text-xs text-neutral-500 mb-5">These tell us how fast your engine runs.</p>
      <div className="flex flex-col gap-4">
        <Field label="Daily energy level">
          <ChoiceGrid value={data.energy} onChange={(v) => upd("energy", v)} cols={3}
            options={[{ value: "low", label: "Low", icon: "😴" }, { value: "medium", label: "Medium", icon: "😐" }, { value: "high", label: "High", icon: "⚡" }]} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sleep (hrs/night)"><input type="number" placeholder="7" value={data.sleepHours} onChange={(e) => upd("sleepHours", e.target.value)} className="text-center" /></Field>
          <Field label="Sleep quality">
            <ChoiceGrid value={data.sleepQuality} onChange={(v) => upd("sleepQuality", v)} cols={3}
              options={[{ value: "poor", label: "Poor" }, { value: "ok", label: "OK" }, { value: "good", label: "Good" }]} />
          </Field>
        </div>
        <Field label="Stress level">
          <ChoiceGrid value={data.stress} onChange={(v) => upd("stress", v)} cols={3}
            options={[{ value: "low", label: "Low", icon: "🧘" }, { value: "medium", label: "Medium", icon: "🙂" }, { value: "high", label: "High", icon: "🔥" }]} />
        </Field>
        <Field label="Hunger pattern">
          <ChoiceGrid value={data.hunger} onChange={(v) => upd("hunger", v)} cols={1}
            options={[
              { value: "always_hungry", label: "Always hungry", desc: "Crash quickly between meals" },
              { value: "normal", label: "Normal", desc: "3-4 meals feels right" },
              { value: "rarely_hungry", label: "Rarely hungry", desc: "Sometimes forget to eat" },
            ]} />
        </Field>
        <Field label="Weight tendency">
          <ChoiceGrid value={data.weightTendency} onChange={(v) => upd("weightTendency", v)} cols={1}
            options={[
              { value: "gains_easy", label: "Gain weight easily" },
              { value: "balanced", label: "Stay stable" },
              { value: "loses_easy", label: "Lose weight easily / struggle to gain" },
            ]} />
        </Field>
      </div>
      <NavBtns onBack={onBack} onNext={onNext} disabled={!data.energy || !data.stress || !data.hunger || !data.weightTendency} />
    </div>
  );
}

function Lifestyle({ data, upd, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Daily activity</h2>
      <p className="text-xs text-neutral-500 mb-5">Most apps overestimate calorie burn. We get this right.</p>
      <div className="flex flex-col gap-4">
        <Field label="Job / daytime activity">
          <ChoiceGrid value={data.job} onChange={(v) => upd("job", v)} cols={1}
            options={[
              { value: "sedentary", label: "Desk job", desc: "Sitting most of the day", icon: "💻" },
              { value: "light", label: "Mixed desk + standing", desc: "Some walking, light movement", icon: "🚶" },
              { value: "moderate", label: "On feet often", desc: "Retail, teaching, walking job", icon: "🏃" },
              { value: "active", label: "Physical labor", desc: "Construction, delivery, sport", icon: "💪" },
            ]} />
        </Field>
        <Field label="Average daily steps">
          <ChoiceGrid value={data.dailySteps} onChange={(v) => upd("dailySteps", v)} cols={4}
            options={[{ value: "3000", label: "<3k" }, { value: "6000", label: "3-6k" }, { value: "9000", label: "6-10k" }, { value: "12000", label: "10k+" }]} />
        </Field>
      </div>
      <NavBtns onBack={onBack} onNext={onNext} disabled={!data.job || !data.dailySteps} />
    </div>
  );
}

function Training({ data, upd, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Training experience</h2>
      <p className="text-xs text-neutral-500 mb-5">Calibrates volume, intensity, and rest periods.</p>
      <div className="flex flex-col gap-4">
        <Field label="Experience">
          <ChoiceGrid value={data.experience} onChange={(v) => upd("experience", v)} cols={1}
            options={[
              { value: "beginner", label: "Beginner", desc: "< 6 months consistent", icon: "🌱" },
              { value: "intermediate", label: "Intermediate", desc: "6 months – 2 years", icon: "🌿" },
              { value: "advanced", label: "Advanced", desc: "2+ years serious training", icon: "🌳" },
            ]} />
        </Field>
        <Field label="Preferred training style">
          <ChoiceGrid value={data.trainingStyle} onChange={(v) => upd("trainingStyle", v)} cols={2}
            options={[
              { value: "hypertrophy", label: "Hypertrophy", desc: "Muscle size" },
              { value: "strength", label: "Strength", desc: "Heavy compounds" },
              { value: "hiit", label: "HIIT / Cond.", desc: "Fat burn + cardio" },
              { value: "calisthenics", label: "Calisthenics", desc: "Bodyweight skill" },
              { value: "balanced", label: "Balanced", desc: "A bit of everything" },
            ]} />
        </Field>
        <Field label="Current lifts (kg)" hint="optional, helps calibrate">
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Bench" value={data.benchPress} onChange={(e) => upd("benchPress", e.target.value)} className="text-center" />
            <input type="number" placeholder="Squat" value={data.squat} onChange={(e) => upd("squat", e.target.value)} className="text-center" />
            <input type="number" placeholder="Deadlift" value={data.deadlift} onChange={(e) => upd("deadlift", e.target.value)} className="text-center" />
          </div>
        </Field>
      </div>
      <NavBtns onBack={onBack} onNext={onNext} disabled={!data.experience || !data.trainingStyle} />
    </div>
  );
}

function Equipment({ data, upd, toggleArr, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; toggleArr: (k: keyof QuizData, v: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Equipment & schedule</h2>
      <p className="text-xs text-neutral-500 mb-5">We&apos;ll only pick exercises you can actually do.</p>
      <div className="flex flex-col gap-4">
        <Field label="Equipment access">
          <ChoiceGrid value={data.equipment} onChange={(v) => upd("equipment", v)} cols={2}
            options={[
              { value: "full_gym", label: "Full Gym", icon: "🏟️" },
              { value: "home_dumbbells", label: "Home + DB", icon: "🏠" },
              { value: "resistance_bands", label: "Bands", icon: "🪢" },
              { value: "bodyweight", label: "Bodyweight", icon: "🤸" },
            ]} />
        </Field>
        <Field label="Days per week you can train">
          <ChoiceGrid value={data.daysPerWeek} onChange={(v) => upd("daysPerWeek", v)} cols={4}
            options={[{ value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" }, { value: "6", label: "6" }]} />
        </Field>
        <Field label="Preferred time">
          <ChoiceGrid value={data.preferredTime} onChange={(v) => upd("preferredTime", v)} cols={3}
            options={[{ value: "morning", label: "Morning", icon: "🌅" }, { value: "afternoon", label: "Afternoon", icon: "☀️" }, { value: "evening", label: "Evening", icon: "🌙" }]} />
        </Field>
        <Field label="Injuries / limitations" hint="select all that apply">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "none", l: "None ✓" }, { v: "knee", l: "Knee" }, { v: "lower_back", l: "Lower back" },
              { v: "shoulder", l: "Shoulder" }, { v: "wrist", l: "Wrist" }, { v: "neck", l: "Neck" },
            ].map(i => (
              <button key={i.v} onClick={() => toggleArr("injuries", i.v)}
                className={`py-2 rounded-xl text-xs font-medium transition-colors ${data.injuries.includes(i.v) ? "bg-amber-500/10 border border-amber-500/40 text-amber-300" : "bg-neutral-800 border border-transparent text-neutral-400"}`}>
                {i.l}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <NavBtns onBack={onBack} onNext={onNext} disabled={!data.equipment || !data.daysPerWeek} />
    </div>
  );
}

function Tests({ data, upd, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Quick fitness tests <span className="text-[11px] text-neutral-500 font-normal">(optional)</span></h2>
      <p className="text-xs text-neutral-500 mb-5">Skip or test yourself now to unlock your <span className="text-amber-400 font-semibold">Fitness Age</span>.</p>
      <div className="flex flex-col gap-4">
        <Field label="Max push-ups (no rest)">
          <input type="number" placeholder="20" value={data.pushUps} onChange={(e) => upd("pushUps", e.target.value)} className="text-center" />
        </Field>
        <Field label="Plank hold (seconds)">
          <input type="number" placeholder="60" value={data.plankSeconds} onChange={(e) => upd("plankSeconds", e.target.value)} className="text-center" />
        </Field>
        <Field label="Resting heart rate (bpm)" hint="best in the morning">
          <input type="number" placeholder="65" value={data.restingHR} onChange={(e) => upd("restingHR", e.target.value)} className="text-center" />
        </Field>
        <div className="bg-[#141414] border border-neutral-800 rounded-xl p-3 text-[11px] text-neutral-400">
          💡 Don&apos;t know your resting HR? Check your phone&apos;s health app, or count your pulse for 60 sec right after waking.
        </div>
      </div>
      <NavBtns onBack={onBack} onNext={onNext} nextLabel="Next" />
    </div>
  );
}

function Goal({ data, upd, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">What&apos;s your goal?</h2>
      <p className="text-xs text-neutral-500 mb-5">Pick the primary outcome you&apos;re chasing.</p>
      <div className="flex flex-col gap-2 mb-4">
        {[
          { value: "lose_fat", label: "Lose Fat", desc: "Reduce body fat", icon: "🔥" },
          { value: "build_muscle", label: "Build Muscle", desc: "Gain lean mass", icon: "💪" },
          { value: "maintain", label: "Stay Fit", desc: "Maintain & feel great", icon: "⚖️" },
          { value: "strength", label: "Get Stronger", desc: "Max lifts, power", icon: "🏋️" },
          { value: "endurance", label: "Improve Endurance", desc: "Run/cycle longer", icon: "🏃" },
        ].map(g => (
          <button key={g.value} onClick={() => upd("goal", g.value)}
            className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${data.goal === g.value ? "bg-amber-500/10 border-amber-500/40" : "bg-[#141414] border-neutral-800 hover:border-neutral-700"}`}>
            <span className="text-2xl">{g.icon}</span>
            <div>
              <p className="font-semibold text-sm">{g.label}</p>
              <p className="text-[10px] text-neutral-500">{g.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Target weight (kg)" hint="optional">
          <input type="number" placeholder="65" value={data.targetWeight} onChange={(e) => upd("targetWeight", e.target.value)} className="text-center" />
        </Field>
        <Field label="In how many weeks?" hint="optional">
          <input type="number" placeholder="12" value={data.deadlineWeeks} onChange={(e) => upd("deadlineWeeks", e.target.value)} className="text-center" />
        </Field>
      </div>
      <Field label="What motivates you most?">
        <ChoiceGrid value={data.motivation} onChange={(v) => upd("motivation", v)} cols={2}
          options={[
            { value: "aesthetics", label: "Look good", icon: "✨" },
            { value: "health", label: "Feel healthy", icon: "❤️" },
            { value: "performance", label: "Perform", icon: "🏆" },
            { value: "longevity", label: "Live long", icon: "🌳" },
          ]} />
      </Field>
      <NavBtns onBack={onBack} onNext={onNext} disabled={!data.goal} />
    </div>
  );
}

function Diet({ data, upd, toggleArr, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; toggleArr: (k: keyof QuizData, v: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Nutrition preferences</h2>
      <p className="text-xs text-neutral-500 mb-5">So your meal plan doesn&apos;t feel like punishment.</p>
      <div className="flex flex-col gap-4">
        <Field label="Diet type">
          <ChoiceGrid value={data.dietType} onChange={(v) => upd("dietType", v)} cols={2}
            options={[
              { value: "veg", label: "Vegetarian", icon: "🥬" },
              { value: "nonveg", label: "Non-Veg", icon: "🍗" },
              { value: "eggetarian", label: "Eggetarian", icon: "🥚" },
              { value: "vegan", label: "Vegan", icon: "🌱" },
            ]} />
        </Field>
        <Field label="Meals per day">
          <ChoiceGrid value={data.mealsPerDay} onChange={(v) => upd("mealsPerDay", v)} cols={4}
            options={[{ value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5+" }, { value: "if", label: "IF 16:8" }]} />
        </Field>
        <Field label="Cuisine you enjoy" hint="select all">
          <div className="grid grid-cols-3 gap-2">
            {["indian", "mediterranean", "asian", "continental", "mexican", "middle_east"].map(c => (
              <button key={c} onClick={() => toggleArr("cuisine", c)}
                className={`py-2 rounded-xl text-xs font-medium capitalize transition-colors ${data.cuisine.includes(c) ? "bg-amber-500/10 border border-amber-500/40 text-amber-300" : "bg-neutral-800 border border-transparent text-neutral-400"}`}>
                {c.replace("_", " ")}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Cooking time you can spare">
          <ChoiceGrid value={data.cookingTime} onChange={(v) => upd("cookingTime", v)} cols={3}
            options={[
              { value: "minimal", label: "<15 min" },
              { value: "moderate", label: "15-30" },
              { value: "love_cooking", label: "I cook" },
            ]} />
        </Field>
        <Field label="Food budget">
          <ChoiceGrid value={data.budget} onChange={(v) => upd("budget", v)} cols={3}
            options={[{ value: "low", label: "Budget" }, { value: "medium", label: "Moderate" }, { value: "high", label: "Premium" }]} />
        </Field>
        <Field label="Allergies / dislikes" hint="select all">
          <div className="grid grid-cols-3 gap-2">
            {["dairy", "gluten", "nuts", "soy", "seafood", "eggs"].map(a => (
              <button key={a} onClick={() => toggleArr("allergies", a)}
                className={`py-2 rounded-xl text-xs font-medium capitalize transition-colors ${data.allergies.includes(a) ? "bg-amber-500/10 border border-amber-500/40 text-amber-300" : "bg-neutral-800 border border-transparent text-neutral-400"}`}>
                {a}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Specific foods you dislike" hint="optional">
          <input type="text" placeholder="e.g. mushrooms, paneer" value={data.dislikes} onChange={(e) => upd("dislikes", e.target.value)} />
        </Field>
      </div>
      <NavBtns onBack={onBack} onNext={onNext} disabled={!data.dietType} nextLabel="See my plan →" />
    </div>
  );
}

function Contact({ data, upd, onBack, onNext }: { data: QuizData; upd: <K extends keyof QuizData>(k: K, v: QuizData[K]) => void; onBack: () => void; onNext: () => void }) {
  const validEmail = !!data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Where do we send your report?</h2>
      <p className="text-xs text-neutral-500 mb-5">Your personalized Body Blueprint — calories, macros, split, and 7-day kickstart plan — emailed instantly.</p>
      <div className="flex flex-col gap-4">
        <Field label="Your name">
          <input type="text" placeholder="Alex" value={data.name || ""} onChange={(e) => upd("name", e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" placeholder="you@example.com" value={data.email || ""} onChange={(e) => upd("email", e.target.value)} />
        </Field>
        <Field label="WhatsApp (optional)" hint="for daily tips, never spam">
          <input type="tel" placeholder="+91 9876543210" value={data.phone || ""} onChange={(e) => upd("phone", e.target.value)} />
        </Field>
        <p className="text-[10px] text-neutral-600 text-center">We respect your inbox. Unsubscribe anytime.</p>
      </div>
      <NavBtns onBack={onBack} onNext={onNext} disabled={!validEmail} nextLabel="Reveal my Blueprint →" />
    </div>
  );
}
