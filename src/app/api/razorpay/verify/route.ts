import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, userId } = await req.json();

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
    }

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Update user tier in Supabase using service role (bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceKey && userId) {
      const supabase = createClient(supabaseUrl, serviceKey);
      const tier = plan.startsWith("promax") ? "pro_max" : "pro";
      const duration = plan.endsWith("yearly") ? 365 : 30;
      const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("profiles").update({
        tier,
        pro_expires_at: expiresAt,
      }).eq("id", userId);

      // Log payment for audit
      await supabase.from("payments").insert({
        user_id: userId,
        razorpay_order_id,
        razorpay_payment_id,
        plan,
        status: "completed",
      });
    }

    return NextResponse.json({
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
