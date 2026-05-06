import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Tier limits for AI plan generation.
// BETA MODE: limits are disabled — every authenticated user gets unlimited
// generations regardless of tier. Flip BETA_MODE to false to re-enable.
const BETA_MODE = true;
const LIFETIME_FREE = 1;        // free users: 1 plan ever
const MONTHLY_PRO = 30;         // pro: 30 / month
const MONTHLY_PRO_MAX = 100;    // pro max: 100 / month + auto coach review

// Safe JSON extract (Gemini sometimes wraps in ```json ... ```)
function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // Try to find first { ... last }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON object found in response");
  return JSON.parse(cleaned.slice(first, last + 1));
}

type WorkoutInputs = {
  plan_type: "workout";
  goal: "fat_loss" | "muscle_gain" | "strength" | "endurance" | "general_fitness";
  timeline_weeks: number;
  days_per_week: number;
  session_minutes: number;
  equipment: string[];           // e.g. ["barbell","dumbbell","mat"] or ["bodyweight"] or ["gym"]
  activity_types: string[];      // e.g. ["lifting","cardio","yoga","run","swim"]
  injuries?: string[];
  experience?: "beginner" | "intermediate" | "advanced";
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  sex?: "M" | "F" | "other";
};

type DietInputs = {
  plan_type: "diet";
  goal: "fat_loss" | "muscle_gain" | "maintenance" | "recomp";
  height_cm: number;
  weight_kg: number;
  age: number;
  sex: "M" | "F" | "other";
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  dietary_pref?: "veg" | "non_veg" | "vegan" | "eggetarian";
  allergies?: string[];
  cuisine?: string;              // e.g. "indian", "mediterranean"
};

type PlanInputs = WorkoutInputs | DietInputs;

function buildWorkoutPrompt(i: WorkoutInputs): string {
  return `You are an elite strength & conditioning coach. Design a ${i.timeline_weeks}-week training plan.

Athlete profile:
- Goal: ${i.goal}
- Experience: ${i.experience ?? "intermediate"}
- Days/week: ${i.days_per_week}
- Session length: ${i.session_minutes} min
- Equipment available: ${i.equipment.join(", ") || "bodyweight only"}
- Activity types preferred: ${i.activity_types.join(", ")}
- Injuries / limitations: ${(i.injuries ?? []).join(", ") || "none"}
${i.weight_kg ? `- Weight: ${i.weight_kg}kg, Height: ${i.height_cm}cm, Age: ${i.age}` : ""}

Rules:
- Use ONLY the listed equipment / activity types.
- Each exercise must specify a tracking_mode: "sets_reps" | "time" | "distance" | "time_distance" | "flow".
- For lifts use sets_reps with sets+reps.
- For cardio (run/swim/cycle) use time_distance with duration_s and optional distance_m.
- For yoga use flow with duration_s.
- For holds (plank, wall sit) use time with duration_s.
- Progress weekly (volume, intensity, or complexity).
- Include warmup notes and rest seconds per exercise.

Respond ONLY with valid JSON (no markdown, no commentary):
{
  "title": "string",
  "summary": "1-2 sentence pitch",
  "weeks": [
    {
      "week": 1,
      "sessions": [
        {
          "name": "Push Day A",
          "day_of_week": 1,
          "warmup": "5 min row + dynamic stretches",
          "exercises": [
            {
              "name": "Barbell Bench Press",
              "tracking_mode": "sets_reps",
              "sets": 4,
              "reps": "6-8",
              "rest_s": 120,
              "notes": "Last set AMRAP"
            }
          ]
        }
      ]
    }
  ]
}`;
}

function buildDietPrompt(i: DietInputs): string {
  return `You are a registered dietitian. Design a 7-day meal plan.

Client:
- Goal: ${i.goal}
- Sex: ${i.sex}, Age: ${i.age}, Height: ${i.height_cm}cm, Weight: ${i.weight_kg}kg
- Activity level: ${i.activity_level}
- Dietary preference: ${i.dietary_pref ?? "non_veg"}
- Allergies: ${(i.allergies ?? []).join(", ") || "none"}
- Cuisine preference: ${i.cuisine ?? "indian"}

Rules:
- Compute TDEE using Mifflin-St Jeor.
- Set target_kcal based on goal (fat_loss: -20%, muscle_gain: +15%, maintenance: 0, recomp: -10%).
- Hit protein at 1.8–2.2 g/kg.
- Use realistic, easy-to-source ingredients.
- Include exact gram quantities.

Respond ONLY with valid JSON:
{
  "title": "string",
  "summary": "1-2 sentence pitch",
  "tdee_kcal": 2500,
  "target_kcal": 2000,
  "macros": { "protein_g": 165, "carbs_g": 200, "fat_g": 60 },
  "days": [
    {
      "day": 1,
      "meals": [
        {
          "name": "Breakfast",
          "items": [{ "food": "Oats", "qty_g": 60 }, { "food": "Milk", "qty_g": 250 }],
          "kcal": 420, "protein_g": 22, "carbs_g": 60, "fat_g": 10
        }
      ]
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Verify caller
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let inputs: PlanInputs;
  try {
    inputs = (await req.json()) as PlanInputs;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!inputs?.plan_type || (inputs.plan_type !== "workout" && inputs.plan_type !== "diet")) {
    return NextResponse.json({ error: "plan_type must be 'workout' or 'diet'" }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Check tier
  const { data: profile } = await admin
    .from("profiles")
    .select("tier, pro_expires_at")
    .eq("id", user.id)
    .single();
  const rawTier = (profile?.tier || "free") as "free" | "pro" | "pro_max";
  const expired = profile?.pro_expires_at && new Date(profile.pro_expires_at) < new Date();
  const tier = expired ? "free" : rawTier;

  // Fetch usage
  const { data: usage } = await admin
    .from("ai_plan_usage")
    .select("lifetime_count, month_count, current_month")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentYm = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthCount = usage?.current_month === currentYm ? (usage?.month_count ?? 0) : 0;
  const lifetimeCount = usage?.lifetime_count ?? 0;

  if (!BETA_MODE) {
    if (tier === "free" && lifetimeCount >= LIFETIME_FREE) {
      return NextResponse.json({
        error: "Free tier allows 1 AI plan only. Upgrade to Pro for 30/month.",
        code: "tier_limit",
        tier,
        lifetime_count: lifetimeCount,
      }, { status: 402 });
    }
    if (tier === "pro" && monthCount >= MONTHLY_PRO) {
      return NextResponse.json({
        error: `Pro tier limit reached (${MONTHLY_PRO}/month). Upgrade to Pro Max for ${MONTHLY_PRO_MAX}/month + coach review.`,
        code: "tier_limit",
        tier,
        month_count: monthCount,
      }, { status: 402 });
    }
    if (tier === "pro_max" && monthCount >= MONTHLY_PRO_MAX) {
      return NextResponse.json({
        error: `Pro Max limit reached (${MONTHLY_PRO_MAX}/month).`,
        code: "tier_limit",
        tier,
        month_count: monthCount,
      }, { status: 402 });
    }
  }

  // Generate via Gemini
  const prompt = inputs.plan_type === "workout"
    ? buildWorkoutPrompt(inputs)
    : buildDietPrompt(inputs);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
  });

  let plan: unknown;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    plan = extractJson(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return NextResponse.json({ error: `AI generation failed: ${msg}` }, { status: 502 });
  }

  // Pro Max → auto-queue for coach review
  const wantsReview = tier === "pro_max";
  const status = wantsReview ? "pending_review" : "active";

  // Insert plan
  const { data: planRow, error: planErr } = await admin
    .from("ai_plans")
    .insert({
      user_id: user.id,
      plan_type: inputs.plan_type,
      status,
      inputs,
      plan,
      generated_by: "gemini-2.0-flash",
      prompt_version: "v1",
    })
    .select("id")
    .single();

  if (planErr || !planRow) {
    return NextResponse.json({ error: planErr?.message || "Failed to save plan" }, { status: 500 });
  }

  // Bump usage atomically
  await admin.rpc("bump_ai_plan_usage", { p_user_id: user.id });

  // Queue for review if Pro Max
  let reviewId: string | null = null;
  if (wantsReview) {
    const requiredRole = inputs.plan_type === "diet" ? "nutritionist" : "trainer";
    const { data: rev } = await admin
      .from("plan_reviews")
      .insert({
        plan_id: planRow.id,
        client_id: user.id,
        required_role: requiredRole,
        payout_inr: 50,
      })
      .select("id")
      .single();
    reviewId = rev?.id ?? null;
  }

  return NextResponse.json({
    ok: true,
    plan_id: planRow.id,
    plan,
    status,
    review_id: reviewId,
    tier,
  });
}
