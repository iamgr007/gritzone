import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  _supabase = createClient(url, key);
  return _supabase;
}

// For convenience — only use in client components
export const supabase = typeof window !== "undefined"
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    )
  : (null as unknown as SupabaseClient);

// Ensure a profile row exists for the current user.
// Call after auth is confirmed. No-ops if row already exists.
// Picks up `role` and `display_name` from user_metadata so that trainers /
// nutritionists who signed up before verifying email still land on the
// correct dashboard.
export async function ensureProfile(user: { id: string; email?: string; user_metadata?: Record<string, string> }) {
  if (!supabase) return;
  const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "user";
  const metaRole = user.user_metadata?.role;
  const role = metaRole === "trainer" || metaRole === "nutritionist" ? metaRole : "client";
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: name,
    role,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) console.warn("ensureProfile failed:", error.message);
}
