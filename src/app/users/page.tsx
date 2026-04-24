"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type Tab = "discover" | "followers" | "following";

function UsersInner() {
  const { user, loading: authLoading } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const initialTab = (params.get("tab") as Tab) || "discover";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    async function load() {
      setLoading(true);
      const [followingRes, followersRes, allProfilesRes] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user!.id),
        supabase.from("follows").select("follower_id").eq("following_id", user!.id),
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, bio")
          .neq("id", user!.id)
          .order("display_name", { ascending: true })
          .limit(500),
      ]);
      if (!alive) return;
      setFollowingIds(
        new Set((followingRes.data || []).map((r: { following_id: string }) => r.following_id)),
      );
      setFollowerIds(
        new Set((followersRes.data || []).map((r: { follower_id: string }) => r.follower_id)),
      );
      setProfiles((allProfilesRes.data as Profile[]) || []);
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, [user]);

  function switchTab(t: Tab) {
    setTab(t);
    router.replace(`/users?tab=${t}`);
  }

  async function follow(id: string) {
    if (!user || busy.has(id)) return;
    setBusy((b) => new Set(b).add(id));
    const prev = new Set(followingIds);
    setFollowingIds((s) => new Set(s).add(id));
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: id });
    if (error) {
      console.error("follow failed", error);
      setFollowingIds(prev);
      alert("Could not follow: " + error.message);
    }
    setBusy((b) => {
      const n = new Set(b);
      n.delete(id);
      return n;
    });
  }

  async function unfollow(id: string) {
    if (!user || busy.has(id)) return;
    setBusy((b) => new Set(b).add(id));
    const prev = new Set(followingIds);
    setFollowingIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", id);
    if (error) {
      console.error("unfollow failed", error);
      setFollowingIds(prev);
      alert("Could not unfollow: " + error.message);
    }
    setBusy((b) => {
      const n = new Set(b);
      n.delete(id);
      return n;
    });
  }

  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach((p) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const listIds = useMemo(() => {
    let ids: string[];
    if (tab === "discover") ids = profiles.map((p) => p.id);
    else if (tab === "following") ids = Array.from(followingIds);
    else ids = Array.from(followerIds);
    const q = query.trim().toLowerCase();
    if (!q) return ids;
    return ids.filter((id) => {
      const p = profileMap[id];
      return p?.display_name?.toLowerCase().includes(q);
    });
  }, [tab, profiles, followingIds, followerIds, query, profileMap]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">People</h1>
          <Link href="/profile" className="text-xs text-neutral-500 hover:text-neutral-300">
            ← Profile
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 bg-[#141414] rounded-xl p-1 border border-neutral-800">
          {(["discover", "followers", "following"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                tab === t ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {t}
              {t === "followers" && (
                <span className="ml-1 text-[10px] opacity-70">({followerIds.size})</span>
              )}
              {t === "following" && (
                <span className="ml-1 text-[10px] opacity-70">({followingIds.size})</span>
              )}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="w-full mb-4 bg-[#141414] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm placeholder-neutral-600 focus:outline-none focus:border-amber-500/40"
        />

        {listIds.length === 0 ? (
          <div className="text-center text-neutral-500 text-sm py-12">
            {tab === "discover"
              ? "No other users yet. Invite friends!"
              : tab === "followers"
                ? "No followers yet. Share your referral link to grow your squad."
                : "You are not following anyone yet. Head to Discover."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {listIds.map((id) => {
              const p = profileMap[id];
              if (!p) return null;
              const isFollowing = followingIds.has(id);
              const isBusy = busy.has(id);
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 bg-[#141414] rounded-2xl border border-neutral-800 p-3"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold flex-shrink-0">
                    {(p.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {p.display_name || "Unnamed"}
                    </p>
                    {p.bio && (
                      <p className="text-[11px] text-neutral-500 truncate">
                        {safeBio(p.bio)}
                      </p>
                    )}
                  </div>
                  <button
                    disabled={isBusy}
                    onClick={() => (isFollowing ? unfollow(id) : follow(id))}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                      isFollowing
                        ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        : "bg-amber-500 text-black hover:bg-amber-400"
                    }`}
                  >
                    {isBusy ? "…" : isFollowing ? "Following" : "Follow"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Nav />
    </div>
  );
}

function safeBio(bio: string): string {
  // bio may contain JSON from onboarding. Show only if it's plain text.
  const s = bio.trim();
  if (s.startsWith("{") || s.startsWith("[")) return "";
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-dvh">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <UsersInner />
    </Suspense>
  );
}
