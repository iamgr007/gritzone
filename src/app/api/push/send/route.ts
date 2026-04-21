import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/push/send
 * Body: { userId?: string; userIds?: string[]; title: string; body: string; url?: string }
 * Auth: Requires `x-cron-secret` header matching CRON_SECRET env var.
 *
 * Sends an FCM HTTP v1 push to every registered device token.
 * Requires:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY  (escape \n as \\n in Vercel env UI)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - CRON_SECRET
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { userId, userIds, title, body, url } = await req.json();
  if (!title || !body) return NextResponse.json({ error: "title+body required" }, { status: 400 });

  const targets: string[] = userIds || (userId ? [userId] : []);
  if (!targets.length) return NextResponse.json({ error: "no targets" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token, platform, user_id")
    .in("user_id", targets);

  if (!tokens?.length) return NextResponse.json({ sent: 0, note: "no tokens for targets" });

  const accessToken = await getFirebaseAccessToken();
  if (!accessToken) return NextResponse.json({ error: "firebase auth failed" }, { status: 500 });

  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  let sent = 0; const failed: string[] = [];
  for (const t of tokens) {
    try {
      const res = await fetch(fcmUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token: t.token,
            notification: { title, body },
            data: url ? { url } : {},
            android: { priority: "HIGH", notification: { sound: "default" } },
            apns: { payload: { aps: { sound: "default", badge: 1 } } },
          },
        }),
      });
      if (res.ok) sent++; else { failed.push(t.token); }
    } catch { failed.push(t.token); }
  }

  return NextResponse.json({ sent, failed: failed.length });
}

// Minimal Firebase OAuth token helper (service-account JWT → access_token).
async function getFirebaseAccessToken(): Promise<string | null> {
  try {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claim = {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };
    const { createSign } = await import("crypto");
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const signingInput = `${b64(header)}.${b64(claim)}`;
    const signer = createSign("RSA-SHA256"); signer.update(signingInput); signer.end();
    const sig = signer.sign(privateKey).toString("base64url");
    const jwt = `${signingInput}.${sig}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const json = await tokenRes.json();
    return json.access_token || null;
  } catch {
    return null;
  }
}
