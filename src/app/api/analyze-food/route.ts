import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Validate it's a base64 data URL
    if (!image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert. Analyze food photos and identify each food item visible.
For each item, estimate the portion size and provide nutritional information.
Respond ONLY with valid JSON in this exact format:
{
  "items": [
    {
      "name": "Food Name",
      "quantity": 150,
      "unit": "g",
      "calories": 200,
      "protein": 12.0,
      "carbs": 25.0,
      "fat": 6.0
    }
  ]
}
Use Indian food names where applicable (e.g., "Chapati" not "Flatbread", "Dal Tadka" not "Lentil Soup").
Estimate realistic portion sizes. All macros per the specified quantity.
If you can't identify any food, return {"items": []}.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "What foods are in this image? Identify each item with estimated macros." },
            { type: "image_url", image_url: { url: image, detail: "low" } },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ items: [] });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    console.error("Food analysis error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
