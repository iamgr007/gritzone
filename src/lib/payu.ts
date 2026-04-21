"use client";

import { supabase } from "./supabase";

export type PayUPlan = "pro_monthly" | "pro_yearly" | "promax_monthly" | "promax_yearly";

export async function startPayUCheckout(
  plan: PayUPlan,
  opts: { onError?: (msg: string) => void } = {}
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    opts.onError?.("Please log in first.");
    return;
  }

  const res = await fetch("/api/payu/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan,
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split("@")[0],
    }),
  });
  const order = await res.json();

  if (!res.ok) {
    opts.onError?.(order.error || "Could not create order");
    return;
  }

  // PayU requires a form POST — build one dynamically and submit
  const form = document.createElement("form");
  form.method = "POST";
  form.action = order.action;
  form.style.display = "none";

  for (const [key, value] of Object.entries(order.params as Record<string, string>)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
