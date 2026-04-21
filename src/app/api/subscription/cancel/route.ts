import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cancels a user's subscription by setting tier to downgrade-at-expiry.
// We don't revoke access immediately — user keeps Pro until pro_expires_at.
// We mark cancelled_at so auto-renewal logic knows to not re-charge.

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    if (!serviceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify user owns this cancellation — check JWT from header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await supabase.from("profiles").update({
      subscription_cancelled_at: new Date().toISOString(),
    }).eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
