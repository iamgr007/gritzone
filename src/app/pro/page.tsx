"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import { startPayUCheckout, PayUPlan } from "@/lib/payu";

type Billing = "monthly" | "yearly";

const PLANS: Array<{
  key: string;
  name: string;
  price: { monthly: string; yearly: string };
  period: { monthly: string; yearly: string };
  discount?: string;
  highlight: boolean;
  features: { text: string; included: boolean }[];
}> = [
  {
    key: "free",
    name: "Free",
    price: { monthly: "₹0", yearly: "₹0" },
    period: { monthly: "forever", yearly: "forever" },
    highlight: false,
    features: [
      { text: "Daily check-ins (weight, sleep, water, steps)", included: true },
      { text: "Manual food logging (search + type)", included: true },
      { text: "Workout logger (unlimited workouts)", included: true },
      { text: "50+ badge achievements", included: true },
      { text: "Social feed & follow friends", included: true },
      { text: "Supplement tracker + 365 grid", included: true },
      { text: "4 custom workout regimes", included: true },
      { text: "AI food photo scanner", included: false },
      { text: "Personalized meal plans", included: false },
      { text: "Unlimited workout regimes", included: false },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: { monthly: "₹199", yearly: "₹1,299" },
    period: { monthly: "/month", yearly: "/year" },
    discount: "Save ₹1,089",
    highlight: true,
    features: [
      { text: "Everything in Free", included: true },
      { text: "Unlimited workout regimes", included: true },
      { text: "Personalized meal plan (from quiz)", included: true },
      { text: "Auto-generated workout plans", included: true },
      { text: "Weekly progress insights", included: true },
      { text: "Progressive overload suggestions", included: true },
      { text: "Smartwatch sync (when available)", included: true },
      { text: "Priority support", included: true },
      { text: "AI food photo scanner", included: false },
    ],
  },
  {
    key: "promax",
    name: "Pro Max",
    price: { monthly: "₹399", yearly: "₹2,499" },
    period: { monthly: "/month", yearly: "/year" },
    discount: "Save ₹2,289",
    highlight: false,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "AI food photo scanner (unlimited)", included: true },
      { text: "Snap a photo → instant macro logging", included: true },
      { text: "AI meal suggestions based on macros left", included: true },
      { text: "AI workout form feedback (coming soon)", included: true },
      { text: "Export data (CSV/PDF)", included: true },
      { text: "Custom branding (hide GRITZONE logo)", included: true },
      { text: "Early access to new features", included: true },
    ],
  },
];

export default function ProPage() {
  const { loading: authLoading } = useAuth();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Handle redirect back from PayU
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") {
      showToast("✓ Payment successful! Your plan is now active.");
      setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
    } else if (status === "failed") {
      showToast("Payment failed. Please try again.");
    } else if (status === "invalid_signature") {
      showToast("Payment verification failed. Contact support.");
    } else if (status === "error") {
      showToast(params.get("msg") || "Something went wrong.");
    }
    if (status) {
      // Clean URL
      window.history.replaceState({}, "", "/pro");
    }
  }, []);

  async function handleUpgrade(planKey: string) {
    if (planKey === "free") return;
    const plan = `${planKey}_${billing}` as PayUPlan;
    setLoading(planKey);
    await startPayUCheckout(plan, {
      onError: (msg) => {
        setLoading(null);
        showToast(msg);
      },
    });
    // Note: on success, PayU redirects away — this component unmounts
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-dvh pb-24">
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto animate-slide-down">
          <div className={`text-white text-sm rounded-xl px-4 py-3 flex items-center justify-between shadow-lg ${toast.startsWith("✓") ? "bg-green-500/90" : "bg-red-500/90"}`}>
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="text-center mb-6">
          <span className="text-amber-500 font-black text-2xl tracking-tight">GRIT<span className="text-neutral-500">ZONE</span></span>
          <h1 className="text-2xl font-bold mt-2">Choose Your Plan</h1>
          <p className="text-neutral-500 text-xs mt-1">Upgrade anytime. Cancel anytime.</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-[#141414] border border-neutral-800 rounded-full p-1 flex gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${billing === "monthly" ? "bg-amber-500 text-black" : "text-neutral-400"}`}
            >Monthly</button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${billing === "yearly" ? "bg-amber-500 text-black" : "text-neutral-400"}`}
            >
              Yearly <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${billing === "yearly" ? "bg-black/20 text-black" : "bg-green-500/20 text-green-400"}`}>-45%</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="flex flex-col gap-4 mb-8">
          {PLANS.map(plan => (
            <div
              key={plan.key}
              className={`rounded-2xl border p-5 card-hover ${plan.highlight ? "bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20" : "bg-[#141414] border-neutral-800"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-lg font-bold ${plan.highlight ? "text-amber-400" : ""}`}>{plan.name}</h2>
                    {plan.highlight && <span className="text-[9px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold uppercase">Popular</span>}
                  </div>
                  <p className="text-2xl font-black mt-1">
                    {plan.price[billing]}<span className="text-sm font-normal text-neutral-500">{plan.period[billing]}</span>
                  </p>
                  {billing === "yearly" && plan.discount && (
                    <p className="text-[10px] text-green-400 font-semibold mt-0.5">{plan.discount}/year</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-xs mt-0.5 ${feat.included ? "text-green-400" : "text-neutral-600"}`}>
                      {feat.included ? "✓" : "✕"}
                    </span>
                    <span className={`text-xs ${feat.included ? "text-neutral-300" : "text-neutral-600"}`}>
                      {feat.text}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(plan.key)}
                disabled={loading === plan.key || plan.key === "free"}
                className={`w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 ${
                  plan.key === "free"
                    ? "bg-neutral-800 text-neutral-400 cursor-default"
                    : plan.highlight
                    ? "bg-amber-500 hover:bg-amber-600 text-black btn-glow"
                    : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                }`}
              >
                {loading === plan.key ? "Loading..." : plan.key === "free" ? "Current Plan" : `Get ${plan.name} →`}
              </button>
            </div>
          ))}
        </div>

        {/* Beta note */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 text-center">
          <p className="text-xs text-neutral-400">
            🧪 <strong className="text-amber-400">Beta testers</strong> — every day you use GRITZONE in beta earns you 1 free Pro day when we launch.
          </p>
        </div>

        {/* Trust */}
        <div className="mt-6 flex items-center justify-center gap-3 text-[10px] text-neutral-600 flex-wrap">
          <span>🔒 Secure payment</span>
          <span>·</span>
          <span>Powered by PayU</span>
          <span>·</span>
          <span>UPI / Cards / Netbanking</span>
        </div>

        {/* FAQ */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-neutral-300 mb-3">FAQ</h3>
          <div className="flex flex-col gap-3">
            <FAQ q="Can I switch plans?" a="Yes! Upgrade or downgrade anytime. Changes apply immediately." />
            <FAQ q="What happens to my data if I downgrade?" a="Nothing is deleted. You keep all logged data. Regime limit goes back to 4." />
            <FAQ q="How does AI food scanner work?" a="Take a photo of your meal. Google Gemini AI identifies every item and estimates macros instantly." />
            <FAQ q="Refund policy?" a="7-day money-back guarantee on annual plans. Contact support@gritzone.me." />
          </div>
        </div>
      </div>
      <Nav />
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-[#141414] rounded-xl border border-neutral-800 p-3">
      <p className="text-xs font-medium text-neutral-300">{q}</p>
      <p className="text-[10px] text-neutral-500 mt-1">{a}</p>
    </div>
  );
}
