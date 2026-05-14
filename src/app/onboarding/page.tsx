"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import QuizFlow, { QUIZ_STEPS_AUTH, useQuizState } from "@/components/QuizFlow";
import QuizResults from "@/components/QuizResults";
import { getRecommendations } from "@/lib/quiz-engine";

export default function OnboardingPage() {
  const { data, setData, step, setStep } = useQuizState();
  const [saving, setSaving] = useState(false);

  const rec = getRecommendations(data);

  async function finish() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          display_name: user.email?.split("@")[0] || "user",
          bio: JSON.stringify({
            quiz: data,
            recommendations: rec,
            completedAt: new Date().toISOString(),
          }),
        }, { onConflict: "id" });
        if (error) console.warn("Profile save error:", error.message);
      }
    } catch (e) {
      console.warn("Onboarding finish error:", e);
    }
    window.location.href = "/dashboard";
  }

  return (
    <QuizFlow
      data={data}
      setData={setData}
      step={step}
      setStep={setStep}
      steps={QUIZ_STEPS_AUTH}
      onFinish={finish}
      saving={saving}
      finishLabel="Continue to Dashboard →"
      resultsNode={<QuizResults rec={rec} />}
    />
  );
}
