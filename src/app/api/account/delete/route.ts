import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Permanently deletes the authenticated user's account + all associated data.
// Requires a valid Supabase JWT in Authorization: Bearer <token>.
// Cascading deletes on FK references handle most rows; we explicitly clear the
// rest so no orphan data is left behind.
export async function POST(req: NextRequest) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (!serviceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = user.id;

    // Best-effort wipe of user data tables. Errors are non-fatal so deletion
    // proceeds even if a table doesn't exist in this environment.
    const tables = [
      "checkins",
      "workouts",
      "workout_sets",
      "food_logs",
      "habits",
      "habit_logs",
      "user_badges",
      "user_quests",
      "follows",
      "user_devices",
      "payments",
      "profiles",
    ];
    for (const t of tables) {
      try {
        await admin.from(t).delete().eq("user_id", uid);
      } catch { /* ignore */ }
    }
    // profiles uses id = uid (not user_id)
    try { await admin.from("profiles").delete().eq("id", uid); } catch {}
    // follows has follower_id and following_id
    try { await admin.from("follows").delete().eq("follower_id", uid); } catch {}
    try { await admin.from("follows").delete().eq("following_id", uid); } catch {}

    // Delete the auth user — this revokes all sessions and removes the login
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
