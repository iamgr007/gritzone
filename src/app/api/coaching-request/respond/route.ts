import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notify";

// Coach responds to an incoming coaching request.
// POST { requestId, action: "accept" | "decline" }
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

  const { requestId, action } = (await req.json().catch(() => ({}))) as { requestId?: string; action?: "accept" | "decline" };
  if (!requestId || !action) return NextResponse.json({ error: "requestId+action required" }, { status: 400 });
  if (action !== "accept" && action !== "decline") return NextResponse.json({ error: "invalid action" }, { status: 400 });

  if (action === "accept") {
    // Atomic accept via SQL function (validates ownership, creates trainer_clients link).
    const { data, error } = await userClient.rpc("accept_coaching_request", { p_request_id: requestId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const result = data as { ok: boolean; error?: string };
    if (!result?.ok) return NextResponse.json({ error: result?.error || "Failed" }, { status: 400 });
  } else {
    const admin = createClient(url, serviceKey);
    // Verify ownership (coach_id) before updating
    const { data: r } = await admin
      .from("coaching_requests")
      .select("coach_id, status, client_id")
      .eq("id", requestId)
      .maybeSingle();
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (r.coach_id !== user.id) return NextResponse.json({ error: "Not your request" }, { status: 403 });
    if (r.status !== "pending") return NextResponse.json({ error: "Already responded" }, { status: 409 });
    await admin
      .from("coaching_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", requestId);
  }

  // Notify client of the response.
  const admin = createClient(url, serviceKey);
  const { data: r } = await admin
    .from("coaching_requests")
    .select("client_id")
    .eq("id", requestId)
    .maybeSingle();
  if (r?.client_id) {
    const coachName =
      (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "Your coach";
    await notify({
      userId: r.client_id,
      kind: action === "accept" ? "coach_accepted" : "coach_declined",
      title: action === "accept" ? "You're connected! 🎉" : "Request update",
      body: action === "accept"
        ? `${coachName} accepted your coaching request.`
        : `${coachName} can't take new clients right now.`,
      href: action === "accept" ? "/my-trainer" : "/coaches",
    });
  }

  return NextResponse.json({ ok: true });
}
