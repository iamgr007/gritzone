import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// PayU posts back to this endpoint as a form POST after payment.
// We verify the reverse hash, update the user's tier, then redirect to /pro?status=...

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const data = Object.fromEntries(form.entries()) as Record<string, string>;

    const {
      status,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1: userId,
      udf2: plan,
      mihpayid,
      hash: receivedHash,
    } = data;

    const merchantKey = process.env.PAYU_MERCHANT_KEY!;
    const merchantSalt = process.env.PAYU_MERCHANT_SALT!;

    // Reverse hash to verify: sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    const reverseHashString = `${merchantSalt}|${status}||||||||||${plan}|${userId}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`;
    const expectedHash = crypto.createHash("sha512").update(reverseHashString).digest("hex");

    const baseRedirect = `${new URL(req.url).origin}/pro`;

    if (expectedHash !== receivedHash) {
      return NextResponse.redirect(`${baseRedirect}?status=invalid_signature`, 303);
    }

    if (status !== "success") {
      return NextResponse.redirect(`${baseRedirect}?status=failed&txnid=${txnid}`, 303);
    }

    // Update user tier
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    if (serviceKey && userId) {
      const supabase = createClient(supabaseUrl, serviceKey);
      const tier = plan.startsWith("promax") ? "pro_max" : "pro";
      const duration = plan.endsWith("yearly") ? 365 : 30;
      const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("profiles").update({
        tier,
        pro_expires_at: expiresAt,
      }).eq("id", userId);

      await supabase.from("payments").insert({
        user_id: userId,
        provider: "payu",
        external_order_id: txnid,
        external_payment_id: mihpayid,
        plan,
        amount: Math.round(parseFloat(amount) * 100), // store in paise
        status: "completed",
      });
    }

    return NextResponse.redirect(`${baseRedirect}?status=success&plan=${plan}`, 303);
  } catch (e) {
    return NextResponse.redirect(`${new URL(req.url).origin}/pro?status=error&msg=${encodeURIComponent((e as Error).message)}`, 303);
  }
}

// Allow GET redirect from PayU (some flows use GET for surl/furl)
export async function GET(req: NextRequest) {
  return NextResponse.redirect(`${new URL(req.url).origin}/pro?status=unknown`, 303);
}
