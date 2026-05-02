"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Shared top header for all signed-in screens.
 * Provides quick-access notifications (🔔) and settings (⚙) on every page,
 * not just the dashboard. Avatar + greeting on the left.
 */
type Profile = { display_name?: string | null; avatar_url?: string | null };

export default function AppHeader({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unseenBadgeCount, setUnseenBadgeCount] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;

      // Profile (display name + avatar)
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (alive) setProfile(prof);

      // Unseen badge count = total earned − client-tracked seen
      const { data: badges } = await supabase
        .from("user_badges")
        .select("badge_key")
        .eq("user_id", user.id);
      try {
        const seen = new Set<string>(JSON.parse(localStorage.getItem("gritzone_seen_badges") || "[]"));
        const unseen = (badges || []).filter((b) => !seen.has(b.badge_key)).length;
        if (alive) setUnseenBadgeCount(unseen);
      } catch {
        if (alive) setUnseenBadgeCount(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  const initials = (profile?.display_name || "U").trim().slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-20 bg-black/85 backdrop-blur-md border-b border-neutral-900">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        {/* Left: avatar + title */}
        <Link href="/profile" className="flex items-center gap-2 min-w-0">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-neutral-800"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold border border-amber-500/30">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            {title ? (
              <p className="text-sm font-bold leading-tight truncate">{title}</p>
            ) : (
              <p className="text-sm font-bold leading-tight truncate">
                {profile?.display_name || "Athlete"}
              </p>
            )}
            {subtitle && (
              <p className="text-[10px] text-neutral-500 leading-tight truncate">{subtitle}</p>
            )}
          </div>
        </Link>

        {/* Right: bell + gear */}
        <div className="flex items-center gap-1">
          <Link
            href="/achievements"
            aria-label="Notifications"
            className="relative p-2 rounded-full hover:bg-neutral-900 active:scale-95 transition"
          >
            <span className="text-lg leading-none">🔔</span>
            {unseenBadgeCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-amber-500 rounded-full flex items-center justify-center text-[9px] text-black font-bold">
                {unseenBadgeCount > 9 ? "9+" : unseenBadgeCount}
              </span>
            )}
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="p-2 rounded-full hover:bg-neutral-900 active:scale-95 transition"
          >
            <span className="text-lg leading-none">⚙️</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
