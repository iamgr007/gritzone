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
  const [hourly, setHourly] = useState<string>("");
  const [session, setSession] = useState<string>("");
  const [accepting, setAccepting] = useState(true);
  const [languages, setLanguages] = useState("");
  const [modes, setModes] = useState("");
  const [certs, setCerts] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, trainer_bio, trainer_specialty, trainer_experience_years, trainer_city, trainer_rate_inr, trainer_hourly_inr, trainer_session_inr, trainer_accepting_clients, trainer_languages, trainer_modes, trainer_certifications")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name || "");
        setBio(data.trainer_bio || "");
        setSpecialty(data.trainer_specialty || "");
        setYears(data.trainer_experience_years?.toString() || "");
        setCity(data.trainer_city || "");
        setRate(data.trainer_rate_inr?.toString() || "");
        setHourly(data.trainer_hourly_inr?.toString() || "");
        setSession(data.trainer_session_inr?.toString() || "");
        setAccepting(data.trainer_accepting_clients !== false);
        setLanguages(data.trainer_languages || "");
        setModes(data.trainer_modes || "");
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
        trainer_hourly_inr: hourly ? parseInt(hourly) : null,
        trainer_session_inr: session ? parseInt(session) : null,
        trainer_accepting_clients: accepting,
        trainer_languages: languages.trim() || null,
        trainer_modes: modes.trim() || null,
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

        <Field label="Pricing" hint="Optional. Leave any field blank to hide it. Clients see whatever you fill in.">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <input type="number" min={0} value={hourly} onChange={(e) => setHourly(e.target.value)} placeholder="₹/hour" className="text-sm" />
              <p className="text-[10px] text-neutral-500 mt-1 text-center">Hourly</p>
            </div>
            <div>
              <input type="number" min={0} value={session} onChange={(e) => setSession(e.target.value)} placeholder="₹/session" className="text-sm" />
              <p className="text-[10px] text-neutral-500 mt-1 text-center">Per session</p>
            </div>
            <div>
              <input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="₹/month" className="text-sm" />
              <p className="text-[10px] text-neutral-500 mt-1 text-center">Monthly</p>
            </div>
          </div>
        </Field>

        <Field label="Languages" hint="Comma-separated. Helps clients find you.">
          <input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Hindi" />
        </Field>

        <Field label="Modes" hint="How you coach. Comma-separated, e.g. online, in-person, hybrid.">
          <input value={modes} onChange={(e) => setModes(e.target.value)} placeholder="online, in-person" />
        </Field>

        <div className="flex items-center justify-between bg-[#141414] border border-neutral-800 rounded-xl p-4">
          <div>
            <p className="text-sm font-semibold">Accepting new clients</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Turn off when your roster is full. You&apos;ll still appear in the directory but with a &quot;not accepting&quot; badge.</p>
          </div>
          <button
            type="button"
            onClick={() => setAccepting(v => !v)}
            className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${accepting ? "bg-amber-500" : "bg-neutral-700"}`}
            aria-pressed={accepting}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${accepting ? "translate-x-5" : ""}`} />
          </button>
        </div>

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
