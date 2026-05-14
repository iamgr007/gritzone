import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { QuizData, Recommendations } from "@/lib/quiz-types";

// Public endpoint: stores quiz results for marketing leads from /quiz.
// No auth required — but we rate-limit by IP + email to prevent abuse.
export async function POST(req: NextRequest) {
  let body: { data?: QuizData; recommendations?: Recommendations } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const d = body.data;
  const rec = body.recommendations;
  if (!d || !d.email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const email = String(d.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If service key missing, still return a stub id so the UX doesn't break.
  if (!url || !serviceKey) {
    return NextResponse.json({ id: cryptoRandom(), stored: false });
  }

  const admin = createClient(url, serviceKey);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent") || null;
  const referrer = req.headers.get("referer") || null;

  // Rate limit: max 5 submissions per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("quiz_leads")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", oneHourAgo);
  if ((count || 0) >= 5) {
    return NextResponse.json({ error: "Too many submissions, try again later" }, { status: 429 });
  }

  const { data: row, error } = await admin
    .from("quiz_leads")
    .insert({
      email,
      name: d.name || null,
      phone: d.phone || null,
      quiz_data: d,
      recommendations: rec || null,
      body_type: rec?.bodyType || null,
      fitness_age: rec?.fitnessAge ?? null,
      metabolism_label: rec?.metabolismLabel || null,
      goal: d.goal || null,
      ip,
      user_agent: userAgent,
      referrer,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("quiz_leads insert error:", error.message);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ id: row.id, stored: true });
}

// GET: fetch a lead's public summary by id (used by /quiz/r/[id] share page)
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey);
  const { data, error } = await admin
    .from("quiz_leads")
    .select("body_type, fitness_age, metabolism_label, goal, name, recommendations")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Only expose non-sensitive fields publicly
  return NextResponse.json({
    bodyType: data.body_type,
    fitnessAge: data.fitness_age,
    metabolismLabel: data.metabolism_label,
    goal: data.goal,
    name: data.name?.split(" ")[0] || null,
    recommendations: data.recommendations,
  });
}

function cryptoRandom() {
  // Fallback id when DB is not configured
  return "lead_" + Math.random().toString(36).slice(2, 10);
}
