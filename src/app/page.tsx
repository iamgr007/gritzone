"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    } else if (!loading && user) {
      window.location.href = "/dashboard";
    }
  }, [loading, user]);

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}
