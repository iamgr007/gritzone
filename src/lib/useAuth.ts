"use client";

import { useEffect, useState } from "react";
import { supabase, ensureProfile } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      // Ensure profile exists (fixes FK violations if onboarding was skipped)
      ensureProfile(data.user);
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

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
