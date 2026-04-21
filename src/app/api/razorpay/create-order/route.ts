import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Simple Razorpay order creation — no SDK required
// Uses Basic auth with key_id:key_secret
export async function POST(req: NextRequest) {
  try {
    const { plan, userId } = await req.json();

    const PRICES: Record<string, number> = {
      pro_monthly: 19900,    // ₹199 in paise
      pro_yearly: 129900,    // ₹1299
      promax_monthly: 39900, // ₹399
      promax_yearly: 249900, // ₹2499
    };

    const amount = PRICES[plan];
    if (!amount) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({
        error: "Razorpay not configured. Add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET to .env.local",
      }, { status: 500 });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const receipt = `rcpt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: { plan, userId: userId || "anonymous" },
      }),
    });

    const order = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: order.error?.description || "Order creation failed" }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      plan,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
