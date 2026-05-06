import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notify";

// Client-initiated coaching request. The client picks a coach from the
// directory and sends a request; coach receives a notification and can
// accept (creates a trainer_clients link) or decline.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { coachId, message } = (await req.json().catch(() => ({}))) as { coachId?: string; message?: string };
  if (!coachId) return NextResponse.json({ error: "coachId required" }, { status: 400 });
  if (coachId === user.id) return NextResponse.json({ error: "You can't coach yourself" }, { status: 400 });

  const admin = createClient(url, serviceKey);

  // Verify target is actually a coach
  const { data: coach } = await admin
    .from("profiles")
    .select("display_name, role, trainer_accepting_clients")
    .eq("id", coachId)
    .maybeSingle();
  if (!coach || (coach.role !== "trainer" && coach.role !== "nutritionist")) {
    return NextResponse.json({ error: "Not a coach" }, { status: 404 });
  }
  if (coach.trainer_accepting_clients === false) {
    return NextResponse.json({ error: "This coach isn't accepting new clients right now" }, { status: 409 });
  }

  // Already linked? short-circuit
  const { data: existing } = await admin
    .from("trainer_clients")
    .select("id, status")
    .eq("trainer_id", coachId)
    .eq("client_id", user.id)
    .maybeSingle();
  if (existing && existing.status === "active") {
    return NextResponse.json({ error: "You're already connected with this coach" }, { status: 409 });
  }

  // Already pending?
  const { data: pending } = await admin
    .from("coaching_requests")
    .select("id")
    .eq("client_id", user.id)
    .eq("coach_id", coachId)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) {
    return NextResponse.json({ error: "You already have a pending request with this coach", id: pending.id }, { status: 409 });
  }

  const { data: req2, error: insErr } = await admin
    .from("coaching_requests")
    .insert({ client_id: user.id, coach_id: coachId, message: (message || "").slice(0, 500) || null })
    .select("id")
    .single();
  if (insErr || !req2) {
    return NextResponse.json({ error: insErr?.message || "Failed" }, { status: 500 });
  }

  const clientName =
    (user.user_metadata?.display_name as string) ||
    user.email?.split("@")[0] ||
    "Someone";
  await notify({
    userId: coachId,
    kind: "coach_request",
    title: "New coaching request 💬",
    body: `${clientName} would like to work with you.`,
    href: "/trainer",
  });

  return NextResponse.json({ ok: true, id: req2.id });
}
