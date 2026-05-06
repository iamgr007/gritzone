import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Client redeems a trainer's invite code.
// Body: { code: string }

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const normalizedCode = (code || "").toUpperCase().trim();
  if (!normalizedCode) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Look up invite
  const { data: invite } = await admin
    .from("trainer_invites")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }
  if (invite.redeemed_by) {
    return NextResponse.json({ error: "This code has already been used" }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This code has expired" }, { status: 410 });
  }
  if (invite.target_email && invite.target_email !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: "This invite is for a different email" }, { status: 403 });
  }
  if (invite.trainer_id === user.id) {
    return NextResponse.json({ error: "You can't redeem your own invite" }, { status: 400 });
  }

  // Get coach role + name for response
  const { data: trainerProfile } = await admin
    .from("profiles")
    .select("display_name, role, trainer_specialty")
    .eq("id", invite.trainer_id)
    .maybeSingle();

  // Set scope based on coach role:
  //  - trainer        → workouts only by default (clients with both should redeem 2 invites)
  //  - nutritionist   → diet only by default
  // Client can adjust scope later (Phase 2).
  const isNutritionist = trainerProfile?.role === "nutritionist";
  const scope_workouts = !isNutritionist;
  const scope_diet = isNutritionist;

  // Create the trainer-client link (idempotent on the unique constraint)
  const { error: linkErr } = await admin
    .from("trainer_clients")
    .upsert({
      trainer_id: invite.trainer_id,
      client_id: user.id,
      status: "active",
      scope_workouts,
      scope_diet,
    }, { onConflict: "trainer_id,client_id" });

  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  // Mark invite redeemed
  await admin
    .from("trainer_invites")
    .update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({
    ok: true,
    trainer: {
      id: invite.trainer_id,
      name: trainerProfile?.display_name,
      role: trainerProfile?.role,
      specialty: trainerProfile?.trainer_specialty,
    },
  });
}
