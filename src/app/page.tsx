"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LandingPage() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();
        const isCoach = prof?.role === "trainer" || prof?.role === "nutritionist";
        window.location.replace(isCoach ? "/trainer" : "/dashboard");
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
      <section className="px-4 py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            🧪 Beta — All Pro features unlocked, free
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-4 leading-[0.95]">
            Train smarter.<br />
            <span className="text-amber-500">Lift heavier.</span><br />
            <span className="text-neutral-500 text-3xl sm:text-5xl">In tigers and trucks.</span>
          </h1>
          <p className="text-neutral-400 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            AI plans for any goal. Track lifts, runs, swims, yoga — all in one place.
            See your progress in <span className="text-amber-400">elephants and aircraft</span>, not just numbers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?mode=signup" className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl px-8 py-4 text-lg transition-colors shadow-lg shadow-amber-500/20">
              Start Free →
            </Link>
            <Link href="/login?mode=signup&role=trainer" className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-semibold rounded-2xl px-8 py-4 text-lg transition-colors">
              I&apos;m a Coach 🏋️
            </Link>
          </div>
          <p className="text-neutral-600 text-xs mt-4">No credit card. Coaches earn ₹50 per AI plan reviewed.</p>
        </div>
      </section>

      {/* Why GRITZONE — three pillars */}
      <section className="px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <Pillar
              emoji="✨"
              title="AI Coach"
              desc="60-second quiz → custom workout & diet plan. Powered by Gemini, reviewed by humans on Pro Max."
            />
            <Pillar
              emoji="🏋️"
              title="Universal Tracker"
              desc="Lift weights, run trails, do yoga, swim laps. One logger. Per-exercise smart inputs."
            />
            <Pillar
              emoji="📈"
              title="Real Progress"
              desc="Streak tracker. Strength analogies. 50+ badges. Watch yourself become unstoppable."
            />
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Everything in one app</h2>
          <p className="text-neutral-500 text-center mb-10">Replace Hevy + Healthify + Fitbit + your coach.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon="✨" title="AI Plan Generator" desc="Tell us your goal, equipment, and schedule. Get a structured plan instantly. Free during beta." badge="New" />
            <FeatureCard icon="🏋️" title="Universal Workout Logger" desc="Lifts, calisthenics, yoga, runs, swims, cycling. Each gets the right inputs — sets×reps, time, distance, or flow." />
            <FeatureCard icon="📷" title="AI Food Scanner" desc="Snap a photo of your plate. Identifies items, calculates macros — Indian dishes too." />
            <FeatureCard icon="🐅" title="Strength Analogies" desc="Total volume in tigers, trucks, blue whales. Numbers are boring. Animals are not." />
            <FeatureCard icon="📊" title="Daily Check-ins" desc="Weight, sleep, water, steps. Build a 365-day streak and watch your body transform." />
            <FeatureCard icon="🎯" title="Quests & XP" desc="Daily and weekly objectives. Stack XP, climb levels, earn free Pro days at launch." />
            <FeatureCard icon="🏆" title="50+ Badges" desc="Beta tester, perfect week, first plate, double plate. Gamified milestones for every grinder." />
            <FeatureCard icon="👥" title="Coach Marketplace" desc="Pro Max users get every AI plan reviewed by a real trainer or nutritionist within 24h." badge="Pro Max" />
            <FeatureCard icon="📚" title="Free Knowledge" desc="TRANSFORM, FUEL, IGNITE — handbooks for every fitness goal, free for beta users." />
          </div>
        </div>
      </section>

      {/* Universal activities highlight */}
      <section className="px-4 py-16 bg-neutral-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Not just a gym app.</h2>
          <p className="text-neutral-500 text-center mb-10">Track whatever you do.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { e: "🏋️", l: "Lifting" },
              { e: "🤸", l: "Calisthenics" },
              { e: "🧘", l: "Yoga" },
              { e: "🏃", l: "Running" },
              { e: "🏊", l: "Swimming" },
              { e: "🚴", l: "Cycling" },
              { e: "🧗", l: "Climbing" },
              { e: "🥋", l: "Pilates" },
              { e: "💃", l: "HIIT" },
              { e: "🥾", l: "Hiking" },
            ].map(a => (
              <span key={a.l} className="bg-[#141414] border border-neutral-800 rounded-full px-4 py-2 text-sm">
                <span className="mr-1.5">{a.e}</span>{a.l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <Step num={1} title="Take the quiz" desc="60 seconds. Tell us your goal, schedule, equipment, dietary preferences." />
            <Step num={2} title="Get your plan" desc="AI generates a structured plan. Pro Max gets a real coach review within 24h." />
            <Step num={3} title="Log & transform" desc="Workouts, food, check-ins. See your strength in tigers. Earn badges." />
          </div>
        </div>
      </section>

      {/* For Coaches */}
      <section className="px-4 py-16 bg-neutral-950">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">For Coaches</span>
          <h2 className="text-3xl font-bold mt-2 mb-3">Earn while you sleep.</h2>
          <p className="text-neutral-400 mb-8">
            Every AI plan from a Pro Max user is queued for human review. Claim a job, edit the plan in 10 minutes, get paid ₹50.
            Build a roster of clients on the side.
          </p>
          <Link href="/login?mode=signup&role=trainer" className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl px-8 py-3 transition-colors">
            Sign up as a Coach →
          </Link>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2">Start Free. All features unlocked in beta.</h2>
          <p className="text-neutral-500 mb-8">Every day you use GRITZONE in beta = 1 free Pro day at launch.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <PlanTeaser name="Free" price="₹0" features={["Unlimited workouts", "Food logging", "Basic AI plans", "50+ badges"]} />
            <PlanTeaser name="Pro" price="₹199" highlight features={["Everything in Free", "Unlimited AI plans", "Custom regimes", "Smartwatch sync"]} />
            <PlanTeaser name="Pro Max" price="₹399" features={["Everything in Pro", "AI food scanner", "Human coach review", "Priority support"]} />
          </div>
          <Link href="/pro" className="inline-block mt-6 text-amber-500 hover:underline text-sm">View full plan comparison →</Link>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black tracking-tight mb-4">Ready to lift a tiger?</h2>
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
          <a href="mailto:support@gritzone.me" className="hover:text-amber-500">Contact</a>
        </div>
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

function Pillar({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0e0e0e] border border-neutral-800 rounded-2xl p-5 text-center">
      <div className="text-4xl mb-2" style={{ animation: "float 4s ease-in-out infinite" }}>{emoji}</div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-neutral-500 text-sm leading-relaxed">{desc}</p>
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
