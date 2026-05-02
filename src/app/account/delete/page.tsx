"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DeleteAccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      setLoading(false);
    })();
  }, []);

  async function handleDelete() {
    setError(null);
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not logged in.");
        setBusy(false);
        return;
      }
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not delete account.");
        setBusy(false);
        return;
      }
      await supabase.auth.signOut();
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">← Back to home</Link>

      <h1 className="text-2xl font-black mt-6 mb-2">Delete your account</h1>
      <p className="text-sm text-neutral-400 mb-6">
        This page lets you permanently delete your <span className="font-semibold">GRITZONE</span> account
        and all data we hold about you. This action cannot be undone.
      </p>

      <div className="rounded-2xl border border-neutral-800 bg-[#141414] p-5 mb-6">
        <h2 className="text-sm font-bold mb-3">What gets deleted</h2>
        <ul className="text-xs text-neutral-300 space-y-1.5 list-disc pl-5">
          <li>Your profile (name, photo, bio, stats)</li>
          <li>All check-ins, workouts, sets, and logged food</li>
          <li>Habits and habit logs</li>
          <li>Earned badges, quest progress, XP and rank</li>
          <li>Follow relationships (followers and following)</li>
          <li>Payment records and subscription history</li>
          <li>Push notification device tokens</li>
          <li>Your authentication account (login becomes impossible)</li>
        </ul>

        <h2 className="text-sm font-bold mt-5 mb-2">What gets retained</h2>
        <ul className="text-xs text-neutral-400 space-y-1.5 list-disc pl-5">
          <li>Anonymized aggregates (counts of users, total workouts, etc.)</li>
          <li>Tax & invoicing records for past payments — required by Indian law for up to 8 years (cannot be linked back to you after deletion)</li>
        </ul>
      </div>

      {done ? (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-center">
          <p className="text-green-400 font-bold mb-1">Account deleted</p>
          <p className="text-xs text-neutral-300">
            Your account and personal data have been removed. Goodbye 👋
          </p>
        </div>
      ) : loading ? (
        <p className="text-sm text-neutral-500">Checking session…</p>
      ) : !email ? (
        <div className="rounded-2xl border border-neutral-800 bg-[#141414] p-5">
          <p className="text-sm text-neutral-300 mb-3">
            You need to be logged in to delete your account.
          </p>
          <Link
            href="/login?next=/account/delete"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-bold px-4 py-2 rounded-lg text-sm"
          >
            Log in to continue
          </Link>
          <p className="text-xs text-neutral-500 mt-4">
            Lost access to your account? Email{" "}
            <a href="mailto:support@gritzone.me" className="underline">
              support@gritzone.me
            </a>{" "}
            from the address you signed up with and we will delete it for you within 30 days.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <p className="text-sm text-neutral-300 mb-1">
            Logged in as <span className="font-mono text-amber-400">{email}</span>
          </p>
          <p className="text-xs text-neutral-500 mb-4">
            To confirm, type <span className="font-mono text-red-400">DELETE</span> below.
          </p>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono mb-3"
          />
          <button
            onClick={handleDelete}
            disabled={confirm !== "DELETE" || busy}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm"
          >
            {busy ? "Deleting…" : "Permanently delete my account"}
          </button>
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        </div>
      )}

      <p className="text-xs text-neutral-500 mt-8 leading-relaxed">
        Questions? Contact{" "}
        <a href="mailto:support@gritzone.me" className="underline">
          support@gritzone.me
        </a>
        . See our{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>{" "}
        for more on how we handle your data.
      </p>
    </div>
  );
}
