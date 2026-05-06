// Server-side notification helper. Inserts an in-app notification row AND
// fires a push notification (best-effort) so the user gets it on web bell +
// native lock screen. Safe to call from any API route.

import { createClient } from "@supabase/supabase-js";

type NotifyArgs = {
  userId: string;
  kind: string;
  title: string;
  body: string;
  href?: string;
};

export async function notify(args: NotifyArgs): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey);

  // 1. Insert in-app notification row (cheap, always works).
  await admin.from("notifications").insert({
    user_id: args.userId,
    kind: args.kind,
    title: args.title,
    body: args.body,
    href: args.href ?? null,
  });

  // 2. Fire push notification (best-effort — failure here doesn't break the request).
  // We hit our own /api/push/send endpoint with the cron secret rather than
  // duplicating the FCM logic. Skip if CRON_SECRET / FCM creds aren't configured.
  if (!process.env.CRON_SECRET || !process.env.FIREBASE_PROJECT_ID) return;

  // Determine our own origin so this works in dev + prod + preview deployments.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";

  try {
    await fetch(`${origin}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": process.env.CRON_SECRET,
      },
      body: JSON.stringify({
        userId: args.userId,
        title: args.title,
        body: args.body,
        url: args.href,
      }),
    });
  } catch {
    // Push delivery is opportunistic; the in-app row is the source of truth.
  }
}
