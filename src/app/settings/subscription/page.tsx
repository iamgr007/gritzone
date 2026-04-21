"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Link from "next/link";

type ProfileSub = {
  tier: string | null;
  pro_expires_at: string | null;
  subscription_cancelled_at: string | null;
};

type Payment = {
  id: string;
  plan: string | null;
  amount: number | null;
  status: string | null;
  created_at: string;
  external_payment_id: string | null;
};

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const [sub, setSub] = useState<ProfileSub | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tier, pro_expires_at, subscription_cancelled_at")
        .eq("id", user.id)
        .single();
      setSub(profile as ProfileSub);

      const { data: pays } = await supabase
        .from("payments")
        .select("id, plan, amount, status, created_at, external_payment_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setPayments((pays as Payment[]) || []);
      setLoading(false);
    })();
  }, [user]);

  async function handleCancel() {
    if (!user) return;
    setCancelling(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/subscription/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: user.id }),
    });
    const json = await res.json();
    setCancelling(false);
    setConfirmCancel(false);
    if (res.ok) {
      showToast("✓ Subscription cancelled. Access continues until expiry.");
      setSub(s => s ? { ...s, subscription_cancelled_at: new Date().toISOString() } : s);
    } else {
      showToast(json.error || "Could not cancel. Email support@gritzone.me");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tier = sub?.tier || "free";
  const isPaid = tier !== "free";
  const expiresAt = sub?.pro_expires_at ? new Date(sub.pro_expires_at) : null;
  const isActive = isPaid && expiresAt && expiresAt > new Date();
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  const cancelled = !!sub?.subscription_cancelled_at;

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
        <Link href="/settings" className="text-neutral-400 text-sm hover:text-white">← Settings</Link>
        <h1 className="text-xl font-bold mt-3 mb-6">Subscription</h1>

        {/* Current Plan Card */}
        <div className={`rounded-2xl border p-5 mb-5 ${isActive ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30" : "bg-[#141414] border-neutral-800"}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Current Plan</p>
            {isActive && <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
            {cancelled && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase">Cancelled</span>}
          </div>
          <div className="flex items-end gap-2 mb-2">
            <h2 className={`text-3xl font-black tracking-tight ${isActive ? "text-amber-400" : ""}`}>
              {tier === "pro_max" ? "Pro Max" : tier === "pro" ? "Pro" : "Free"}
            </h2>
            {isActive && <span className="text-lg">👑</span>}
          </div>

          {isActive && expiresAt ? (
            <>
              <p className="text-xs text-neutral-400">
                {cancelled ? "Access until" : "Renews on"} <strong className="text-white">{expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
              </p>
              <p className="text-[10px] text-neutral-500 mt-1">{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</p>

              {/* Days remaining progress ring vibe */}
              <div className="mt-3 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                  style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-neutral-500">Unlock AI food scanner, unlimited regimes, and personalized plans.</p>
          )}
        </div>

        {/* Action Buttons */}
        {!isActive ? (
          <Link href="/pro" className="block w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-3 text-center text-sm btn-glow transition-all mb-5">
            Upgrade to Pro →
          </Link>
        ) : !cancelled ? (
          <div className="flex flex-col gap-3 mb-5">
            <Link href="/pro" className="block w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl py-3 text-center text-sm transition-colors">
              Change Plan
            </Link>
            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                className="w-full text-red-400 hover:text-red-300 text-xs py-2 transition-colors"
              >
                Cancel Subscription
              </button>
            ) : (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-300 mb-1">Cancel subscription?</p>
                <p className="text-xs text-neutral-400 mb-3">You&apos;ll keep access until {expiresAt?.toLocaleDateString("en-IN")}. After that, your account reverts to Free. Your data is preserved.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 bg-neutral-800 text-neutral-300 rounded-lg py-2 text-xs font-medium"
                  >Keep Plan</button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 bg-red-500/80 hover:bg-red-500 text-white rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-50"
                  >{cancelling ? "Cancelling..." : "Yes, Cancel"}</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 mb-5 text-center">
            <p className="text-sm text-orange-300 font-semibold">Subscription cancelled</p>
            <p className="text-xs text-neutral-400 mt-1">You&apos;ll retain access until {expiresAt?.toLocaleDateString("en-IN")}. Change your mind?</p>
            <Link href="/pro" className="inline-block mt-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg px-4 py-2 text-xs transition-colors">
              Resume Subscription
            </Link>
          </div>
        )}

        {/* Payment History */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-neutral-300 mb-3">Payment History</h3>
          {payments.length === 0 ? (
            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-4 text-center">
              <p className="text-xs text-neutral-500">No payments yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {payments.map(p => (
                <div key={p.id} className="bg-[#141414] border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{formatPlan(p.plan)}</p>
                    <p className="text-[10px] text-neutral-500">
                      {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {p.external_payment_id && <span className="ml-2">· {p.external_payment_id.slice(0, 16)}...</span>}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-bold">₹{p.amount ? (p.amount / 100).toFixed(0) : "0"}</p>
                    <p className={`text-[10px] ${p.status === "completed" ? "text-green-400" : "text-neutral-500"}`}>{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="bg-[#141414] border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-neutral-400">
            Need help? Email <a href="mailto:support@gritzone.me" className="text-amber-500">support@gritzone.me</a> — we reply within 24 hours.
          </p>
          <div className="flex items-center gap-3 text-[10px] text-neutral-500 mt-3">
            <Link href="/refund" className="hover:text-amber-500">Refund Policy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-amber-500">Terms</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-amber-500">Privacy</Link>
          </div>
        </div>
      </div>
      <Nav />
    </div>
  );
}

function formatPlan(plan: string | null): string {
  if (!plan) return "Payment";
  const map: Record<string, string> = {
    pro_monthly: "Pro — Monthly",
    pro_yearly: "Pro — Yearly",
    promax_monthly: "Pro Max — Monthly",
    promax_yearly: "Pro Max — Yearly",
  };
  return map[plan] || plan;
}
