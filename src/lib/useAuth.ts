"use client";

import { useEffect, useState } from "react";
import { supabase, ensureProfile } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type AppRole = "client" | "trainer" | "nutritionist";
export type RoleGuard = AppRole | "coach"; // "coach" matches trainer OR nutritionist

export function useAuth(opts: { requireRole?: RoleGuard } = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      await ensureProfile(data.user);
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const userRole = (prof?.role as AppRole) || "client";

      // Enforce required role
      if (opts.requireRole) {
        const ok =
          opts.requireRole === userRole ||
          (opts.requireRole === "coach" && (userRole === "trainer" || userRole === "nutritionist"));
        if (!ok) {
          window.location.replace(
            userRole === "trainer" || userRole === "nutritionist" ? "/trainer" : "/dashboard"
          );
          return;
        }
      }

      setRole(userRole);
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        window.location.href = "/login";
        return;
      }
      setUser(session.user);
    });

    return () => { alive = false; subscription.unsubscribe(); };
  }, [opts.requireRole]);

  return { user, role, loading };
}
