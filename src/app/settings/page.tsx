"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";
import Link from "next/link";

type FeedSettings = { showWorkouts: boolean; showFood: boolean; showCheckins: boolean };

function getSettings(): FeedSettings {
  if (typeof window === "undefined") return { showWorkouts: true, showFood: true, showCheckins: true };
  try { const s = localStorage.getItem("gritzone_feed_settings"); if (s) return JSON.parse(s); } catch {}
  return { showWorkouts: true, showFood: true, showCheckins: true };
}

export default function SettingsPage() {
  const { loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<FeedSettings>(getSettings);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof FeedSettings) {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("gritzone_feed_settings", JSON.stringify(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      return next;
    });
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold mb-6">Settings</h1>

        {/* Feed Settings */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-5">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">Feed Settings</h2>
          <p className="text-xs text-neutral-500 mb-4">Choose what you see in your activity feed</p>

          <div className="flex flex-col gap-3">
            <Toggle label="Show Workouts" description="See when people complete workouts" checked={settings.showWorkouts} onChange={() => toggle("showWorkouts")} />
            <Toggle label="Show Food Logs" description="See what people eat & their calories" checked={settings.showFood} onChange={() => toggle("showFood")} />
            <Toggle label="Show Check-ins" description="See daily check-ins (weight, steps)" checked={settings.showCheckins} onChange={() => toggle("showCheckins")} />
          </div>

          {saved && <p className="text-xs text-green-400 mt-3">✓ Saved</p>}
        </div>

        {/* Smartwatch Integration */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-5">
          <h2 className="text-sm font-semibold text-neutral-300 mb-1">Smartwatch Integration</h2>
          <p className="text-xs text-neutral-500 mb-4">Connect your device for auto-tracking</p>

          <div className="flex flex-col gap-3">
            {[
              { name: "Apple Watch", icon: "⌚", status: "coming_soon" },
              { name: "Garmin", icon: "🏃", status: "coming_soon" },
              { name: "Fitbit", icon: "📟", status: "coming_soon" },
              { name: "Noise / boAt", icon: "⚡", status: "coming_soon" },
            ].map(device => (
              <div key={device.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{device.icon}</span>
                  <span className="text-sm">{device.name}</span>
                </div>
                <span className="text-[10px] bg-neutral-800 text-neutral-500 px-2 py-1 rounded-full">Coming Soon</span>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-col gap-2">
          <Link href="/settings/subscription" className="flex items-center justify-between bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">💳</span>
              <div>
                <p className="font-semibold text-sm">Subscription</p>
                <p className="text-[10px] text-neutral-500">Manage your plan, view payments & cancel</p>
              </div>
            </div>
            <span className="text-neutral-500">→</span>
          </Link>

          <Link href="/pro" className="flex items-center justify-between bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">👑</span>
              <div>
                <p className="font-semibold text-sm">GRITZONE Pro</p>
                <p className="text-[10px] text-neutral-500">Unlock AI food scanner, custom regimes & more</p>
              </div>
            </div>
            <span className="text-neutral-500">→</span>
          </Link>

          <Link href="/regimes" className="flex items-center justify-between bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className="font-semibold text-sm">Workout Regimes</p>
                <p className="text-[10px] text-neutral-500">Create & manage your workout plans</p>
              </div>
            </div>
            <span className="text-neutral-500">→</span>
          </Link>

          <Link href="/supplements" className="flex items-center justify-between bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">💊</span>
              <div>
                <p className="font-semibold text-sm">Supplements</p>
                <p className="text-[10px] text-neutral-500">Track your daily vitamins & supps</p>
              </div>
            </div>
            <span className="text-neutral-500">→</span>
          </Link>
        </div>

        {/* Legal & account */}
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/privacy" className="flex items-center justify-between bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <div>
                <p className="font-semibold text-sm">Privacy Policy</p>
                <p className="text-[10px] text-neutral-500">How we handle your data</p>
              </div>
            </div>
            <span className="text-neutral-500">→</span>
          </Link>

          <Link href="/terms" className="flex items-center justify-between bg-[#141414] rounded-2xl border border-neutral-800 p-4 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">📄</span>
              <div>
                <p className="font-semibold text-sm">Terms of Service</p>
                <p className="text-[10px] text-neutral-500">Rules for using GRITZONE</p>
              </div>
            </div>
            <span className="text-neutral-500">→</span>
          </Link>

          <Link href="/account/delete" className="flex items-center justify-between bg-red-500/5 rounded-2xl border border-red-500/30 p-4 hover:border-red-500/60 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">🗑️</span>
              <div>
                <p className="font-semibold text-sm text-red-400">Delete Account</p>
                <p className="text-[10px] text-neutral-500">Permanently remove your data</p>
              </div>
            </div>
            <span className="text-red-400/70">→</span>
          </Link>
        </div>
      </div>
      <Nav />
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-[10px] text-neutral-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? "bg-amber-500" : "bg-neutral-700"}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${checked ? "translate-x-5.5 left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
