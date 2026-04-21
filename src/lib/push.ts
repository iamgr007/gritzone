"use client";

import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Register device for push notifications.
 * Safely no-ops on web; only runs on native Capacitor (iOS / Android).
 * On web, falls back to a local-notification-enabled state so the UI can
 * still prompt / educate the user.
 */
export async function registerPush(user: User | null | undefined): Promise<{ ok: boolean; reason?: string }> {
  if (!user) return { ok: false, reason: "no_user" };

  // Only load Capacitor libs in the browser to keep SSR builds clean.
  let Capacitor: typeof import("@capacitor/core").Capacitor;
  try {
    ({ Capacitor } = await import("@capacitor/core"));
  } catch {
    return { ok: false, reason: "capacitor_missing" };
  }

  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: "web_platform" };
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let permStatus = perm.receive;
    if (permStatus === "prompt") {
      const req = await PushNotifications.requestPermissions();
      permStatus = req.receive;
    }
    if (permStatus !== "granted") {
      return { ok: false, reason: "permission_denied" };
    }

    await PushNotifications.register();

    return new Promise((resolve) => {
      const tokenListener = PushNotifications.addListener("registration", async (tokenData) => {
        const token = tokenData.value;
        const platform = Capacitor.getPlatform(); // "ios" | "android" | "web"
        try {
          await supabase.from("push_tokens").upsert(
            { user_id: user.id, token, platform, last_seen_at: new Date().toISOString() },
            { onConflict: "token" }
          );
          resolve({ ok: true });
        } catch (e) {
          resolve({ ok: false, reason: "token_save_failed" });
        }
        (await tokenListener).remove();
      });

      PushNotifications.addListener("registrationError", (err) => {
        resolve({ ok: false, reason: `registration_error:${err.error}` });
      });

      // Tap handler → deep-link
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = action.notification.data?.url;
        if (url && typeof window !== "undefined") window.location.href = url;
      });
    });
  } catch (err) {
    return { ok: false, reason: `exception:${String(err)}` };
  }
}
