"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

type ClientRow = {
  id: string;
  status: string;
  started_at: string;
  client: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
  lastCheckin?: string | null;
};

type Invite = {
  id: string;
  code: string;
  target_email: string | null;
  expires_at: string;
  redeemed_by: string | null;
  created_at: string;
};

type CoachRequest = {
  id: string;
  message: string | null;
  created_at: string;
  client: { id: string; display_name: string | null; avatar_url: string | null } | null;
};

export default function TrainerDashboardPage() {
  const { user, role, loading: authLoading } = useAuth({ requireRole: "coach" });
  const isNutritionist = role === "nutritionist";
  const coachLabel = isNutritionist ? "Nutritionist" : "Trainer";
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [requests, setRequests] = useState<CoachRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: rels }, { data: invs }, { data: reqs }] = await Promise.all([
      supabase
        .from("trainer_clients")
        .select("id, status, started_at, client:profiles!trainer_clients_client_id_fkey(id, display_name, avatar_url)")
        .eq("trainer_id", user.id)
        .order("started_at", { ascending: false }),
      supabase
        .from("trainer_invites")
        .select("*")
        .eq("trainer_id", user.id)
        .is("redeemed_by", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("coaching_requests")
        .select("id, message, created_at, client:profiles!coaching_requests_client_id_fkey(id, display_name, avatar_url)")
        .eq("coach_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    const rowsWithLast: ClientRow[] = await Promise.all(
      ((rels as unknown as ClientRow[]) || []).map(async (r) => {
        if (!r.client) return r;
        const { data: ck } = await supabase
          .from("checkins")
          .select("date")
          .eq("user_id", r.client.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();
        return { ...r, lastCheckin: ck?.date || null };
      })
    );

    setClients(rowsWithLast);
    setInvites((invs as Invite[]) || []);
    setRequests((reqs as unknown as CoachRequest[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  async function createInvite() {
    setCreatingInvite(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/trainer/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ targetEmail: inviteEmail || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create invite");
        return;
      }
      showToast(`Code created: ${data.invite.code}`);
      setInviteEmail("");
      loadData();
    } finally {
      setCreatingInvite(false);
    }
  }

  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Copied ${code}`);
    } catch {
      showToast(code);
    }
  }

  async function shareInvite(code: string) {
    const text = `You've been invited to GRITZONE — your fitness coach is using it to track your progress.\n\nUse this code to connect: ${code}\n\nDownload: https://gritzone.me`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled */ }
    } else {
      copyInvite(text);
    }
  }

  async function revokeInvite(id: string) {
    await supabase.from("trainer_invites").delete().eq("id", id);
    loadData();
  }

  async function endRelationship(relId: string) {
    if (!confirm("End this client relationship? They'll keep their data but you'll no longer see it.")) return;
    await supabase.from("trainer_clients").delete().eq("id", relId);
    loadData();
  }

  async function respondRequest(requestId: string, action: "accept" | "decline") {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/coaching-request/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ requestId, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed");
      return;
    }
    showToast(action === "accept" ? "Client connected ✓" : "Request declined");
    loadData();
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = clients.filter((c) => c.lastCheckin === today).length;

  return (
    <div className="min-h-dvh pb-12">
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto">
          <div className="bg-amber-500 text-black text-sm rounded-xl px-4 py-3 shadow-lg font-semibold">
            {toast}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 backdrop-blur-lg bg-black/80 border-b border-neutral-900">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-amber-500 font-black text-lg tracking-tight">GRIT<span className="text-neutral-400">ZONE</span></span>
            <span className="ml-2 text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">{coachLabel}</span>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
            className="text-neutral-500 hover:text-neutral-300 text-xs"
          >Sign out</button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-4 text-xs">
          <Link href="/dashboard" className="text-amber-500 hover:underline">💪 My fitness →</Link>
          <span className="text-neutral-700">·</span>
          <Link href="/settings" className="text-neutral-400 hover:text-neutral-200">⚙️ Settings</Link>
        </div>
        <h1 className="text-2xl font-bold mb-1">Your Roster</h1>
        <p className="text-neutral-500 text-sm mb-5">
          {isNutritionist
            ? "Track every client's meals, macros, weight, and adherence in one place."
            : "Track every client's workouts, diet, and adherence in one place."}
        </p>

        {/* AI Review Queue CTA */}
        <Link
          href="/trainer/queue"
          className="block mb-5 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">✨ AI Plan Review Queue</p>
              <p className="text-[11px] text-neutral-400">Earn ₹50 per review · 24h SLA</p>
            </div>
            <span className="text-amber-500 text-lg">→</span>
          </div>
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Stat label="Active clients" value={String(clients.filter((c) => c.status === "active").length)} />
          <Stat label="Checked in today" value={String(checkedInToday)} accent />
          <Stat label="Pending invites" value={String(invites.length)} />
        </div>

        {/* Incoming coaching requests (client-initiated) */}
        {requests.length > 0 && (
          <section className="bg-gradient-to-br from-purple-500/15 to-transparent border border-purple-500/30 rounded-2xl p-4 mb-6">
            <h2 className="text-sm font-bold mb-1 flex items-center gap-2">
              💬 Coaching requests
              <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-bold">{requests.length}</span>
            </h2>
            <p className="text-[11px] text-neutral-500 mb-3">These clients found you in the directory and want to work with you. Tap accept to connect immediately.</p>
            <div className="flex flex-col gap-2">
              {requests.map((r) => (
                <div key={r.id} className="bg-black/30 rounded-xl p-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-300 font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {r.client?.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.client?.display_name || "A client"}</p>
                    {r.message && <p className="text-[11px] text-neutral-300 mt-0.5 line-clamp-2">{r.message}</p>}
                    <p className="text-[9px] text-neutral-500 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => respondRequest(r.id, "accept")} className="bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold rounded-lg px-3 py-1.5">Accept</button>
                    <button onClick={() => respondRequest(r.id, "decline")} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] rounded-lg px-3 py-1.5">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Invite section */}
        <section className="bg-[#141414] border border-neutral-800 rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-bold mb-1">Invite a client</h2>
          <p className="text-[11px] text-neutral-500 mb-3">Generate a one-time code. They enter it inside GRITZONE under Settings → My Trainer.</p>
          <div className="flex gap-2 mb-3">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="client@email.com (optional, restricts code)"
              className="flex-1 text-sm"
              type="email"
            />
            <button
              onClick={createInvite}
              disabled={creatingInvite}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold px-4 rounded-xl text-sm"
            >
              {creatingInvite ? "..." : "Generate"}
            </button>
          </div>
          {invites.length > 0 && (
            <div className="flex flex-col gap-2">
              {invites.map((inv) => {
                const expired = new Date(inv.expires_at) < new Date();
                return (
                  <div key={inv.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${expired ? "border-neutral-800 bg-neutral-900/40" : "border-amber-500/20 bg-amber-500/5"}`}>
                    <code className={`text-sm font-mono font-bold ${expired ? "text-neutral-500 line-through" : "text-amber-400"}`}>
                      {inv.code}
                    </code>
                    {inv.target_email && (
                      <span className="text-[10px] text-neutral-500 truncate flex-1">→ {inv.target_email}</span>
                    )}
                    {!inv.target_email && <span className="flex-1" />}
                    {!expired && (
                      <>
                        <button onClick={() => copyInvite(inv.code)} className="text-[10px] text-neutral-400 hover:text-amber-400 px-2 py-1">Copy</button>
                        <button onClick={() => shareInvite(inv.code)} className="text-[10px] text-neutral-400 hover:text-amber-400 px-2 py-1">Share</button>
                      </>
                    )}
                    <button onClick={() => revokeInvite(inv.id)} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1">Revoke</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Clients list */}
        <section>
          <h2 className="text-sm font-bold mb-3">Clients ({clients.length})</h2>
          {loading ? (
            <div className="text-center py-8 text-neutral-500 text-sm">Loading...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 bg-[#141414] border border-neutral-800 border-dashed rounded-2xl">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm text-neutral-400 font-semibold mb-1">No clients yet</p>
              <p className="text-xs text-neutral-500">Generate an invite code above and share it with your first client.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {clients.map((c) => {
                const lastSeen = c.lastCheckin
                  ? c.lastCheckin === today
                    ? "Checked in today ✓"
                    : `Last: ${c.lastCheckin}`
                  : "Never checked in";
                const lastSeenColor = c.lastCheckin === today ? "text-green-400" : c.lastCheckin ? "text-amber-400" : "text-red-400";
                return (
                  <div key={c.id} className="bg-[#141414] border border-neutral-800 rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-400 font-bold flex items-center justify-center flex-shrink-0">
                      {c.client?.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.client?.display_name || "Unknown"}</p>
                      <p className={`text-[10px] ${lastSeenColor}`}>{lastSeen}</p>
                    </div>
                    <Link
                      href={`/trainer/client/${c.client?.id}`}
                      className="text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-3 py-2 font-semibold"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => endRelationship(c.id)}
                      className="text-[11px] text-red-400 hover:text-red-300 px-2 py-2"
                      title="End relationship"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-8 text-center">
          <Link href="/trainer/profile" className="text-xs text-neutral-500 hover:text-amber-400">
            Edit your {coachLabel.toLowerCase()} profile →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 border ${accent ? "bg-amber-500/5 border-amber-500/30" : "bg-[#141414] border-neutral-800"}`}>
      <p className={`text-2xl font-black ${accent ? "text-amber-400" : ""}`}>{value}</p>
      <p className="text-[10px] text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}
