import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// PayU uses a hash-based flow. We generate the hash server-side and
// return all fields the client needs to POST to PayU's form endpoint.
// Docs: https://devguide.payu.in/restapi/payu-web-sdk-integration/

const PRICES: Record<string, number> = {
  pro_monthly: 199,
  pro_yearly: 1299,
  promax_monthly: 399,
  promax_yearly: 2499,
};

const PLAN_LABELS: Record<string, string> = {
  pro_monthly: "GRITZONE Pro - Monthly",
  pro_yearly: "GRITZONE Pro - Yearly",
  promax_monthly: "GRITZONE Pro Max - Monthly",
  promax_yearly: "GRITZONE Pro Max - Yearly",
};

// PayU V1 endpoint rejects non-ASCII characters in productinfo / firstname / email
// with a generic 409 "Invalid response format received from V1". Strip aggressively.
function sanitize(s: string, max = 100): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^\x20-\x7E]/g, "")     // ASCII printable only
    .replace(/[|]/g, "")               // pipe is the hash separator
    .trim()
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, email, name } = await req.json();

    const amount = PRICES[plan];
    if (!amount) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const merchantKey = process.env.PAYU_MERCHANT_KEY;
    const merchantSalt = process.env.PAYU_MERCHANT_SALT;
    const mode = process.env.PAYU_MODE || "test"; // "test" or "live"

    if (!merchantKey || !merchantSalt) {
      return NextResponse.json({
        error: "PayU not configured. Add PAYU_MERCHANT_KEY & PAYU_MERCHANT_SALT to .env.local",
      }, { status: 500 });
    }

    const txnid = `gz_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const productinfo = sanitize(PLAN_LABELS[plan]);
    const firstname = sanitize(name || email?.split("@")[0] || "User", 50) || "User";
    const userEmail = sanitize(email || "user@gritzone.me", 80);

    // Custom fields (PayU udf1..udf5) — use udf1 for userId, udf2 for plan
    const udf1 = sanitize(userId || "");
    const udf2 = sanitize(plan);

    // PayU hash formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
    const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${userEmail}|${udf1}|${udf2}|||||||||${merchantSalt}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    const baseUrl = mode === "live" ? "https://secure.payu.in" : "https://test.payu.in";
    const siteOrigin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://gritzone.me";

    return NextResponse.json({
      action: `${baseUrl}/_payment`,
      params: {
        key: merchantKey,
        txnid,
        amount: amount.toString(),
        productinfo,
        firstname,
        email: userEmail,
        phone: "",
        surl: `${siteOrigin}/api/payu/verify`,
        furl: `${siteOrigin}/api/payu/verify`,
        udf1,
        udf2,
        hash,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
