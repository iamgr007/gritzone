import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Complete a claimed plan review.
//   - Updates the underlying ai_plans.plan with the coach's edits
//   - Sets ai_plans.status = 'reviewed', stamps reviewed_by/reviewed_at/review_notes
//   - Sets plan_reviews.status = 'completed', completed_at = now()
// Auth: caller must own the claim (claimed_by = auth.uid()).

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  type Body = { reviewId?: string; updatedPlan?: unknown; notes?: string };
  const body = (await req.json().catch(() => ({}))) as Body;
  const { reviewId, updatedPlan, notes } = body;
  if (!reviewId || updatedPlan === undefined) {
    return NextResponse.json({ error: "reviewId and updatedPlan required" }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Verify the reviewer owns this claim
  const { data: review } = await admin
    .from("plan_reviews")
    .select("id, plan_id, client_id, claimed_by, status")
    .eq("id", reviewId)
    .single();

  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  if (review.claimed_by !== user.id) {
    return NextResponse.json({ error: "Not your claim" }, { status: 403 });
  }
  if (review.status !== "claimed") {
    return NextResponse.json({ error: `Cannot complete — status is ${review.status}` }, { status: 409 });
  }

  // Update the plan
  const { error: planErr } = await admin
    .from("ai_plans")
    .update({
      plan: updatedPlan,
      status: "reviewed",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", review.plan_id);

  if (planErr) return NextResponse.json({ error: planErr.message }, { status: 500 });

  // Mark review complete
  const { error: revErr } = await admin
    .from("plan_reviews")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
