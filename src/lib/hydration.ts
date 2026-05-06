// Hydration reminder scheduling via Capacitor LocalNotifications.
// Works on Android/iOS apps — silently no-ops on web.
import { Capacitor } from "@capacitor/core";

const HYDRATION_GROUP_ID_BASE = 4000;
const SLOTS = [
  { hour: 9, minute: 0, body: "💧 Morning glass — kick off the day" },
  { hour: 11, minute: 30, body: "💧 Mid-morning sip" },
  { hour: 13, minute: 30, body: "💧 Post-lunch hydration check" },
  { hour: 15, minute: 30, body: "💧 Afternoon top-up" },
  { hour: 17, minute: 30, body: "💧 Evening glass" },
  { hour: 20, minute: 0, body: "💧 Last call — close the rings" },
];

const STORAGE_KEY = "gz_hydration_reminders_enabled";

export function hydrationRemindersEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Default ON.
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}

export async function setHydrationReminders(enabled: boolean): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    if (enabled) {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== "granted") return;
      // Cancel any previous schedule first
      const pending = await LocalNotifications.getPending();
      const ours = pending.notifications.filter((n) => n.id >= HYDRATION_GROUP_ID_BASE && n.id < HYDRATION_GROUP_ID_BASE + 100);
      if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });

      await LocalNotifications.schedule({
        notifications: SLOTS.map((s, i) => ({
          id: HYDRATION_GROUP_ID_BASE + i,
          title: "Hydration check",
          body: s.body,
          schedule: {
            on: { hour: s.hour, minute: s.minute },
            allowWhileIdle: true,
            repeats: true,
          },
          smallIcon: "ic_stat_icon_config_sample",
        })),
      });
    } else {
      const pending = await LocalNotifications.getPending();
      const ours = pending.notifications.filter((n) => n.id >= HYDRATION_GROUP_ID_BASE && n.id < HYDRATION_GROUP_ID_BASE + 100);
      if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
    }
  } catch {
    // Plugin not available — fail quietly.
  }
}

/** Best-effort: ensure reminders are scheduled if user has them on. */
export async function ensureHydrationReminders(): Promise<void> {
  if (!hydrationRemindersEnabled()) return;
  await setHydrationReminders(true);
}
