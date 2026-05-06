"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

export default function TrainerProfilePage() {
  const { user, role, loading: authLoading } = useAuth({ requireRole: "coach" });
  const isNutritionist = role === "nutritionist";
  const coachLabel = isNutritionist ? "Nutritionist" : "Trainer";
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [years, setYears] = useState<string>("");
  const [city, setCity] = useState("");
  const [rate, setRate] = useState<string>("");
  const [certs, setCerts] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, trainer_bio, trainer_specialty, trainer_experience_years, trainer_city, trainer_rate_inr, trainer_certifications")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name || "");
        setBio(data.trainer_bio || "");
        setSpecialty(data.trainer_specialty || "");
        setYears(data.trainer_experience_years?.toString() || "");
        setCity(data.trainer_city || "");
        setRate(data.trainer_rate_inr?.toString() || "");
        setCerts(data.trainer_certifications || "");
      }
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        trainer_bio: bio.trim() || null,
        trainer_specialty: specialty.trim() || null,
        trainer_experience_years: years ? parseInt(years) : null,
        trainer_city: city.trim() || null,
        trainer_rate_inr: rate ? parseInt(rate) : null,
        trainer_certifications: certs.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-12">
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-black/80 border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/trainer" className="text-neutral-400 hover:text-white text-sm">←</Link>
          <h1 className="text-sm font-bold flex-1">{coachLabel} Profile</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-4">
        <p className="text-xs text-neutral-500">
          This information will be shown to clients you connect with. Filling it out builds trust.
        </p>

        <Field label="Display name">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
        </Field>

        <Field label="Specialty" hint={isNutritionist ? "e.g. Weight loss, PCOS, Sports nutrition, Diabetic diet" : "e.g. Strength training, Fat loss, Powerlifting, Pre/post-natal"}>
          <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="What do you specialize in?" />
        </Field>

        <Field label="Bio" hint="A short paragraph about your coaching philosophy. Markdown not supported.">
          <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={isNutritionist ? "I help clients hit their macros sustainably without crash diets..." : "I help everyday lifters build strength sustainably..."} className="text-sm" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Experience (years)">
            <input type="number" min={0} max={60} value={years} onChange={(e) => setYears(e.target.value)} placeholder="5" />
          </Field>
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
          </Field>
        </div>

        <Field label="Monthly rate (₹)" hint="Optional. Shown to clients considering hiring you. Leave blank to hide.">
          <input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="3000" />
        </Field>

        <Field label="Certifications" hint={isNutritionist ? "K11 Nutrition, ISSN, RD, etc. Comma-separated." : "ACE, NSCA, K11, etc. Comma-separated."}>
          <input value={certs} onChange={(e) => setCerts(e.target.value)} placeholder={isNutritionist ? "K11 Nutrition, ISSN-CISSN" : "ACE-CPT, K11 Nutrition"} />
        </Field>

        <button
          onClick={save}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-xl py-3 mt-2"
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-neutral-300 font-medium mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-neutral-500 mt-1">{hint}</p>}
    </div>
  );
}
