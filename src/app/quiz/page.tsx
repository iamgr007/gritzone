"use client";

import { useState } from "react";
import QuizFlow, { QUIZ_STEPS_PUBLIC, useQuizState } from "@/components/QuizFlow";
import QuizResults from "@/components/QuizResults";
import { getRecommendations } from "@/lib/quiz-engine";

export default function PublicQuizPage() {
  const { data, setData, step, setStep } = useQuizState();
  const [saving, setSaving] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | undefined>();

  const rec = getRecommendations(data);

  async function finish() {
    // We're already on the results step. "Finish" = create account / go to login with prefilled email.
    if (leadId && data.email) {
      window.location.href = `/login?email=${encodeURIComponent(data.email)}`;
    } else {
      window.location.href = "/login";
    }
  }

  // Auto-save lead when user lands on results step
  const onSetStep = async (s: typeof step) => {
    setStep(s);
    if (s === "results" && !leadId && data.email) {
      setSaving(true);
      try {
        const res = await fetch("/api/quiz-lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data, recommendations: rec }),
        });
        if (res.ok) {
          const json = await res.json();
          setLeadId(json.id);
          if (typeof window !== "undefined") {
            setShareUrl(`${window.location.origin}/quiz/r/${json.id}`);
          }
        }
      } catch (e) {
        console.warn("Lead save failed", e);
      }
      setSaving(false);
    }
  };

  return (
    <>
      <QuizFlow
        data={data}
        setData={setData}
        step={step}
        setStep={onSetStep}
        steps={QUIZ_STEPS_PUBLIC}
        onFinish={finish}
        publicMode
        saving={saving}
        finishLabel="Create Free Account →"
        resultsNode={<QuizResults rec={rec} shareUrl={shareUrl} publicMode />}
      />
    </>
  );
}
