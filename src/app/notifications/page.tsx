"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

const KIND_ICON: Record<string, string> = {
  coach_request: "💬",
  coach_accepted: "🎉",
  coach_declined: "📭",
  client_joined: "🤝",
  plan_reviewed: "✅",
  plan_ready: "✨",
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as Notif[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  // Mark all as read once on mount.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null)
      .then(() => {});
  }, [user]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-dvh pb-12">
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-black/80 border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-neutral-400 hover:text-white text-sm">←</Link>
          <h1 className="text-sm font-bold flex-1">Notifications</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {items.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 text-sm">
            <p className="text-3xl mb-2">🔕</p>
            <p>You&apos;re all caught up.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map(n => {
              const Wrapper = n.href ? Link : "div";
              const unread = !n.read_at;
              return (
                <Wrapper
                  key={n.id}
                  href={n.href || "#"}
                  className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors ${unread ? "bg-amber-500/5 border-amber-500/20" : "bg-[#141414] border-neutral-800"}`}
                >
                  <span className="text-2xl flex-shrink-0">{KIND_ICON[n.kind] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-[12px] text-neutral-400 leading-snug mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-neutral-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {n.href && <span className="text-neutral-500 text-sm">→</span>}
                </Wrapper>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
