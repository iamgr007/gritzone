import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Voice log: user speaks naturally, Gemini parses, we insert.
// Supports food, workout, water, steps, weight, sleep — auto-detected from speech.
//
// POST { transcript: string, context?: "food" | "workout" | "any", date?: "YYYY-MM-DD" }
// Auth: bearer token (user's supabase access token).
//
// Response: { ok: true, summary: string, logged: { food: number; sets: number; water_l?: number; ... } }

type ParsedFood = {
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
type ParsedSet = {
  exercise_name: string;
  muscle_group: string;
  weight_kg: number;
  reps: number;
};
type ParsedWorkout = {
  name: string;
  duration_seconds?: number;
  notes?: string;
  sets: ParsedSet[];
};
type ParsedPayload = {
  food?: ParsedFood[];
  workout?: ParsedWorkout;
  water_l?: number;        // ADD this many litres to today's checkin
  steps?: number;          // SET steps for today
  weight_kg?: number;      // SET morning weight
  sleep_hours?: number;    // SET sleep
  notes?: string;          // freeform append to checkin notes
};

function pickJson(s: string): string | null {
  const m = s.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

function defaultMealForNow(): "breakfast" | "lunch" | "dinner" | "snack" {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 22) return "dinner";
  return "snack";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const transcript: string = (body.transcript || "").toString().trim();
  const context: "food" | "workout" | "any" = body.context || "any";
  const date: string = (body.date || new Date().toISOString().slice(0, 10)).toString();
  if (!transcript) return NextResponse.json({ error: "No transcript" }, { status: 400 });

  const defaultMeal = defaultMealForNow();
  const prompt = `You are a fitness logging assistant. The user just spoke a sentence in English/Hindi/Hinglish describing what they ate, drank, or did. Extract STRUCTURED logs as JSON.

CONTEXT HINT: page=${context}. Default meal_type if user didn't say one: "${defaultMeal}". Date: ${date}.

Output ONLY a single JSON object (no prose, no markdown fences) matching this schema. Omit keys that don't apply.
{
  "food": [
    { "meal_type": "breakfast"|"lunch"|"dinner"|"snack", "food_name": "string", "quantity": number, "unit": "g"|"ml"|"piece"|"cup"|"bowl", "calories": number, "protein": number, "carbs": number, "fat": number }
  ],
  "workout": {
    "name": "string e.g. Push Day",
    "duration_seconds": number_or_omit,
    "notes": "string or omit",
    "sets": [
      { "exercise_name": "string", "muscle_group": "chest|back|legs|shoulders|arms|core|cardio|full_body", "weight_kg": number, "reps": number }
    ]
  },
  "water_l": number,
  "steps": number,
  "weight_kg": number,
  "sleep_hours": number,
  "notes": "string"
}

RULES:
- Use Indian food names (Chapati, Dal, Idli, Paneer, etc.) when applicable.
- For each food item, ESTIMATE realistic per-portion macros.
- water: convert to litres ("a glass" = 0.25, "bottle" = 0.5, "1 litre" = 1).
- workout: parse "3 sets of 10 pushups" -> 3 sets, reps=10, weight_kg=0 (bodyweight). "bench press 60kg 5 reps" -> weight_kg=60, reps=5.
- If the speech is unclear or doesn't describe any logging activity, return {}.
- Do NOT invent values. Only log what the user clearly said.

USER SAID:
"""
${transcript}
"""`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let parsed: ParsedPayload = {};
  try {
    const result = await model.generateContent(prompt);
    const txt = result.response.text();
    const json = pickJson(txt);
    if (json) parsed = JSON.parse(json);
  } catch (e) {
    console.error("voice-log gemini error:", e);
    return NextResponse.json({ error: "Could not understand. Try again." }, { status: 500 });
  }

  // ----- Apply to DB -----
  const logged = { food: 0, sets: 0, water_l: 0, steps: 0, weight_kg: 0, sleep_hours: 0, workout: false };

  // 1) Food logs
  if (Array.isArray(parsed.food) && parsed.food.length) {
    const rows = parsed.food.map((f) => ({
      user_id: user.id,
      date,
      meal_type: f.meal_type || defaultMeal,
      food_name: f.food_name,
      quantity: f.quantity || 0,
      unit: f.unit || "g",
      calories: Math.round(f.calories || 0),
      protein: f.protein || 0,
      carbs: f.carbs || 0,
      fat: f.fat || 0,
    }));
    const { error } = await supabase.from("food_logs").insert(rows);
    if (!error) logged.food = rows.length;
  }

  // 2) Workout
  if (parsed.workout && Array.isArray(parsed.workout.sets) && parsed.workout.sets.length) {
    const w = parsed.workout;
    const { data: wo, error: woErr } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        date,
        name: w.name || "Voice-logged workout",
        duration_seconds: w.duration_seconds || 0,
        notes: w.notes || "",
      })
      .select("id")
      .single();
    if (!woErr && wo) {
      const setRows = w.sets.map((s, i) => ({
        workout_id: wo.id,
        exercise_name: s.exercise_name,
        muscle_group: s.muscle_group || "full_body",
        set_number: i + 1,
        weight_kg: s.weight_kg || 0,
        reps: s.reps || 0,
        is_warmup: false,
      }));
      const { error: setErr } = await supabase.from("workout_sets").insert(setRows);
      if (!setErr) {
        logged.sets = setRows.length;
        logged.workout = true;
      }
    }
  }

  // 3) Checkin fields (water/steps/weight/sleep/notes) — upsert today's row
  const checkinPatch: Record<string, unknown> = {};
  let waterAdded = 0;
  if (parsed.water_l && parsed.water_l > 0) waterAdded = parsed.water_l;
  if (parsed.steps && parsed.steps > 0) checkinPatch.steps_count = parsed.steps;
  if (parsed.weight_kg && parsed.weight_kg > 0) checkinPatch.morning_weight = parsed.weight_kg;
  if (parsed.sleep_hours && parsed.sleep_hours > 0) checkinPatch.sleep_hours = parsed.sleep_hours;
  if (parsed.notes) checkinPatch.notes = parsed.notes;

  if (waterAdded || Object.keys(checkinPatch).length) {
    const { data: existing } = await supabase
      .from("checkins")
      .select("id, water_intake")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();
    if (existing) {
      const newWater = waterAdded
        ? Math.round((Number(existing.water_intake ?? 0) + waterAdded) * 10) / 10
        : undefined;
      const update: Record<string, unknown> = { ...checkinPatch };
      if (newWater !== undefined) update.water_intake = newWater;
      await supabase.from("checkins").update(update).eq("id", existing.id);
    } else {
      await supabase.from("checkins").insert({
        user_id: user.id,
        date,
        water_intake: waterAdded || 0,
        ...checkinPatch,
      });
    }
    logged.water_l = waterAdded;
    if (typeof checkinPatch.steps_count === "number") logged.steps = checkinPatch.steps_count;
    if (typeof checkinPatch.morning_weight === "number") logged.weight_kg = checkinPatch.morning_weight;
    if (typeof checkinPatch.sleep_hours === "number") logged.sleep_hours = checkinPatch.sleep_hours;
  }

  // ----- Build human summary -----
  const parts: string[] = [];
  if (logged.food) parts.push(`${logged.food} food item${logged.food > 1 ? "s" : ""}`);
  if (logged.workout) parts.push(`workout (${logged.sets} set${logged.sets !== 1 ? "s" : ""})`);
  if (logged.water_l) parts.push(`${logged.water_l}L water`);
  if (logged.steps) parts.push(`${logged.steps.toLocaleString()} steps`);
  if (logged.weight_kg) parts.push(`weight ${logged.weight_kg}kg`);
  if (logged.sleep_hours) parts.push(`${logged.sleep_hours}h sleep`);

  if (!parts.length) {
    return NextResponse.json({
      ok: false,
      summary: "I didn't catch anything to log. Try: 'I had 2 idli and chai for breakfast' or 'logged 3 sets of 10 pushups'.",
      logged,
      transcript,
    });
  }

  return NextResponse.json({
    ok: true,
    summary: `Logged: ${parts.join(", ")}`,
    logged,
    transcript,
  });
}
