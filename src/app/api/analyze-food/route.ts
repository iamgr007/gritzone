import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key not configured. Add GEMINI_API_KEY to .env.local" },
      { status: 500 }
    );
  }

  try {
    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    // Extract base64 and mime type from data URL
    const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: "Invalid base64 image" }, { status: 400 });
    }
    const mimeType = matches[1] as "image/jpeg" | "image/png" | "image/webp";
    const base64Data = matches[2];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a nutrition expert. Analyze this food photo and identify each food item visible.
For each item, estimate the portion size and provide nutritional information.
Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
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
If you can't identify any food, return {"items": []}.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const content = result.response.text();
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
