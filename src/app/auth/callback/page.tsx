"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// OAuth landing page. Supabase JS auto-handles the URL hash/code on page load,
// so we just wait for the session and then route the user based on role.
export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Signing you in...");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Wait briefly for supabase-js to consume the OAuth code in the URL.
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");

      // Supabase's detectSessionInUrl handles ?code= or #access_token automatically
      // on initial load; we just need to read the resulting session.
      let session = null;
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) { session = data.session; break; }
        await new Promise(r => setTimeout(r, 100));
      }
      if (cancelled) return;

      if (!session) {
        setMsg("Sign-in failed. Redirecting...");
        setTimeout(() => { window.location.href = "/login"; }, 1500);
        return;
      }

      // First-time OAuth users won't have a profile row yet — create one.
      const u = session.user;
      const displayName = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email?.split("@")[0] || "user";
      await supabase.from("profiles").upsert(
        { id: u.id, display_name: displayName },
        { onConflict: "id", ignoreDuplicates: true }
      );

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", u.id)
        .maybeSingle();

      const isCoach = prof?.role === "trainer" || prof?.role === "nutritionist";
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      window.location.replace(safeNext || (isCoach ? "/trainer" : "/dashboard"));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 text-center">
      <div>
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-400 text-sm">{msg}</p>
      </div>
    </div>
  );
}
