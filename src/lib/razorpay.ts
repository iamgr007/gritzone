"use client";

import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export type RazorpayPlan = "pro_monthly" | "pro_yearly" | "promax_monthly" | "promax_yearly";

export async function startRazorpayCheckout(
  plan: RazorpayPlan,
  opts: { onSuccess?: () => void; onError?: (msg: string) => void } = {}
) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    opts.onError?.("Failed to load payment gateway. Check your internet.");
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    opts.onError?.("Please log in first.");
    return;
  }

  // Create order on server
  const orderRes = await fetch("/api/razorpay/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, userId: user.id }),
  });
  const order = await orderRes.json();

  if (!orderRes.ok) {
    opts.onError?.(order.error || "Could not create order");
    return;
  }

  // Open Razorpay checkout
  const rzp = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    name: "GRITZONE",
    description: planLabel(plan),
    order_id: order.orderId,
    prefill: {
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
    },
    theme: { color: "#f59e0b" },
    handler: async (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      // Verify payment on server
      const verifyRes = await fetch("/api/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...response,
          plan,
          userId: user.id,
        }),
      });
      const verified = await verifyRes.json();
      if (verified.success) {
        opts.onSuccess?.();
      } else {
        opts.onError?.(verified.error || "Payment verification failed");
      }
    },
    modal: {
      ondismiss: () => opts.onError?.("Payment cancelled"),
    },
  });

  rzp.open();
}

function planLabel(plan: RazorpayPlan): string {
  const map: Record<RazorpayPlan, string> = {
    pro_monthly: "Pro — Monthly",
    pro_yearly: "Pro — Yearly",
    promax_monthly: "Pro Max — Monthly",
    promax_yearly: "Pro Max — Yearly",
  };
  return map[plan];
}
