"use client";

import { useEffect } from "react";

/**
 * Mounts a hardware back-button handler for Android (Capacitor).
 * Behavior:
 *  - On any non-root page: pop browser history (act like web back).
 *  - On root pages (/, /dashboard, /login): minimize the app instead of closing.
 *
 * No-op on web.
 */
export default function BackButtonHandler() {
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");

        const ROOT_PATHS = new Set(["/", "/dashboard", "/login"]);

        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          const path = window.location.pathname;
          if (canGoBack && !ROOT_PATHS.has(path)) {
            window.history.back();
          } else {
            // At a root page — minimize, don't crash-close.
            App.minimizeApp().catch(() => App.exitApp());
          }
        });
        cleanup = () => { handle.remove(); };
      } catch {
        // Plugin not installed in this build — ignore.
      }
    })();

    return () => { cleanup?.(); };
  }, []);

  return null;
}
