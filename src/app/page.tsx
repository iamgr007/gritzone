"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LandingPage() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        window.location.href = "/dashboard";
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-lg bg-black/70 border-b border-neutral-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-black text-xl tracking-tighter">GRIT<span className="text-neutral-400">ZONE</span></span>
            <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Beta</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-neutral-400 hover:text-white text-sm">Sign In</Link>
            <Link href="/login?mode=signup" className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm rounded-xl px-4 py-2 transition-colors">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            🧪 Now in Beta — Free Pro days for early users
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-4 leading-[0.95]">
            Your fitness,<br />
            <span className="text-amber-500">your grind.</span>
          </h1>
          <p className="text-neutral-400 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
            Track workouts like Hevy. Log food like Healthify. Build habits like Strava.
            All in one app — designed for people who actually show up.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?mode=signup" className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl px-8 py-4 text-lg transition-colors">
              Start Free →
            </Link>
            <Link href="/login?mode=signup" className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-semibold rounded-2xl px-8 py-4 text-lg transition-colors">
              Take the 60s Quiz
            </Link>
          </div>
          <p className="text-neutral-600 text-xs mt-4">No credit card. No ads. No BS.</p>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Everything you need, nothing you don&apos;t</h2>
          <p className="text-neutral-500 text-center mb-10">One app replaces four.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon="📷" title="AI Food Scanner" desc="Snap a photo of your plate. Our AI identifies every item and calculates macros instantly." badge="Pro Max" />
            <FeatureCard icon="💪" title="Workout Logger" desc="Hevy-style set tracking with previous bests, rest timers, and regime templates (PPL, Upper/Lower)." />
            <FeatureCard icon="🍽️" title="Food Diary" desc="90+ Indian foods with macros. Search, quick-add, or create custom entries." />
            <FeatureCard icon="📊" title="Daily Check-ins" desc="Weight, sleep, water, steps. Build a 365-day streak and watch your body transform." />
            <FeatureCard icon="🏆" title="50+ Badges" desc="Unlock achievements as you grind. Gamified progress that keeps you coming back." />
            <FeatureCard icon="👥" title="Social Feed" desc="Follow friends. See their workouts and meals. Stay accountable together." />
            <FeatureCard icon="💊" title="Supplement Tracker" desc="Log multivitamins, fish oil, creatine. Watch your year as a 365-day GitHub-style grid." />
            <FeatureCard icon="📋" title="Workout Regimes" desc="Copy proven templates or build your own. Start a workout with one tap." />
            <FeatureCard icon="🎯" title="Personalized Plans" desc="60-second quiz. BMI, goals, diet. We calculate your macros and recommend a split." badge="Pro" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 bg-neutral-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <Step num={1} title="Take the quiz" desc="Tell us your goals in 60 seconds. Get your personalized macros & split." />
            <Step num={2} title="Log daily" desc="Food, workouts, check-ins. Each log earns badges and builds your streak." />
            <Step num={3} title="Transform" desc="Track progress over weeks, not days. 365-day grids show your grind." />
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2">Start Free. Upgrade when you&apos;re ready.</h2>
          <p className="text-neutral-500 mb-8">Every day you use GRITZONE in beta earns you 1 free Pro day at launch.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <PlanTeaser name="Free" price="₹0" features={["Unlimited workouts", "Food logging", "4 custom regimes", "50+ badges"]} />
            <PlanTeaser name="Pro" price="₹199" highlight features={["Everything in Free", "Unlimited regimes", "Personalized meal plans", "Smartwatch sync"]} />
            <PlanTeaser name="Pro Max" price="₹399" features={["Everything in Pro", "AI food scanner", "Export data", "Priority support"]} />
          </div>
          <Link href="/pro" className="inline-block mt-6 text-amber-500 hover:underline text-sm">View full plan comparison →</Link>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black tracking-tight mb-4">Ready to earn your GRIT?</h2>
          <p className="text-neutral-400 mb-6">Join the beta. Build the habit. Transform in public.</p>
          <Link href="/login?mode=signup" className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl px-10 py-4 text-lg transition-colors">
            Start Your Grind →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-neutral-900 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-neutral-500 mb-3 flex-wrap">
          <Link href="/privacy" className="hover:text-amber-500">Privacy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-amber-500">Terms</Link>
          <span>·</span>
          <Link href="/refund" className="hover:text-amber-500">Refunds</Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-amber-500">Contact</Link>
        </div>
        {/* TEMP: payment gateway verification - remove after approval */}
        <div className="text-neutral-500 text-xs leading-relaxed mb-2">
          <p className="text-neutral-300 font-semibold">Abhishek Bagathi</p>
          <p>2, 11th Street, Kartikeyapuram, Madipakkam, Chennai - 600091, Tamil Nadu, India</p>
          <p>
            <a href="mailto:abhishek@gritzone.me" className="hover:text-amber-500">abhishek@gritzone.me</a>
            {" · "}
            <a href="tel:+917407461154" className="hover:text-amber-500">+91 74074 61154</a>
          </p>
        </div>
        {/* END TEMP */}
        <p className="text-neutral-600 text-xs">
          <span className="text-amber-500 font-bold">GRIT</span>ZONE · Made for lifters, by lifters · © 2026
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, badge }: { icon: string; title: string; desc: string; badge?: string }) {
  return (
    <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-5 hover:border-amber-500/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        {badge && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase">{badge}</span>}
      </div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-neutral-500 text-sm">{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl mx-auto mb-3">{num}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-neutral-500 text-sm">{desc}</p>
    </div>
  );
}

function PlanTeaser({ name, price, features, highlight }: { name: string; price: string; features: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 text-left ${highlight ? "bg-amber-500/5 border-amber-500/30" : "bg-[#141414] border-neutral-800"}`}>
      <div className="flex items-center gap-2 mb-1">
        <h3 className={`font-bold ${highlight ? "text-amber-400" : ""}`}>{name}</h3>
        {highlight && <span className="text-[9px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold uppercase">Popular</span>}
      </div>
      <p className="text-2xl font-black mb-3">{price}<span className="text-sm font-normal text-neutral-500">/mo</span></p>
      <ul className="text-xs text-neutral-400 flex flex-col gap-1">
        {features.map((f, i) => <li key={i}>✓ {f}</li>)}
      </ul>
    </div>
  );
}
