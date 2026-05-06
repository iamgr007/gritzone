import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Claim an open plan review. Atomic via SQL function `claim_plan_review`.
// Auth: caller must be a coach (trainer or nutritionist) matching required_role.

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = (await req.json().catch(() => ({}))) as { reviewId?: string };
  if (!reviewId) return NextResponse.json({ error: "reviewId required" }, { status: 400 });

  const { data, error } = await userClient.rpc("claim_plan_review", { p_review_id: reviewId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data !== true) {
    return NextResponse.json({ error: "Could not claim — already taken or role mismatch" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
