import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Generate a new trainer invite code.
// Auth: caller must be a trainer (we verify their JWT via getUser()).

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Verify user via anon client + their access token
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role — trainers and nutritionists can both invite clients
  const { data: profile } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "trainer" && profile?.role !== "nutritionist") {
    return NextResponse.json({ error: "Only coaches can create invites" }, { status: 403 });
  }

  const { targetEmail } = (await req.json().catch(() => ({}))) as { targetEmail?: string };

  // Generate a unique-ish code (retry on collision)
  const admin = createClient(supabaseUrl, serviceKey);
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = "GZ-" + Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    const { data: clash } = await admin
      .from("trainer_invites")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!clash) break;
  }

  const { data: invite, error: insertErr } = await admin
    .from("trainer_invites")
    .insert({
      trainer_id: user.id,
      code,
      target_email: targetEmail?.toLowerCase().trim() || null,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ invite });
}
