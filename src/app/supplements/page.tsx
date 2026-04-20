"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";

type Supplement = { id: string; name: string; time: string; emoji: string };
type LogEntry = { date: string; supplements: string[] }; // supplement IDs taken that day

const DEFAULT_SUPPLEMENTS: Supplement[] = [
  { id: "multivitamin", name: "Multivitamin", time: "Morning", emoji: "💊" },
  { id: "fish_oil", name: "Fish Oil (Omega-3)", time: "Morning", emoji: "🐟" },
  { id: "vitamin_d", name: "Vitamin D3", time: "Morning", emoji: "☀️" },
  { id: "creatine", name: "Creatine", time: "Post-workout", emoji: "⚡" },
  { id: "protein", name: "Whey Protein", time: "Post-workout", emoji: "🥛" },
  { id: "ashwagandha", name: "Ashwagandha", time: "Night", emoji: "🌿" },
  { id: "zinc_mag", name: "Zinc + Magnesium (ZMA)", time: "Night", emoji: "💤" },
  { id: "biotin", name: "Biotin", time: "Morning", emoji: "💇" },
];

function todayStr() { return new Date().toISOString().split("T")[0]; }

function getLogs(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try { const s = localStorage.getItem("gritzone_supplement_logs"); if (s) return JSON.parse(s); } catch {}
  return [];
}

function getMySupplements(): Supplement[] {
  if (typeof window === "undefined") return DEFAULT_SUPPLEMENTS.slice(0, 4);
  try { const s = localStorage.getItem("gritzone_my_supplements"); if (s) return JSON.parse(s); } catch {}
  return DEFAULT_SUPPLEMENTS.slice(0, 4);
}

export default function SupplementsPage() {
  const { loading: authLoading } = useAuth();
  const [mySupps, setMySupps] = useState<Supplement[]>(getMySupplements);
  const [logs, setLogs] = useState<LogEntry[]>(getLogs);
  const [showAdd, setShowAdd] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customTime, setCustomTime] = useState("Morning");

  const today = todayStr();
  const todayLog = logs.find(l => l.date === today);
  const takenToday = todayLog?.supplements ?? [];

  function saveLogs(newLogs: LogEntry[]) {
    setLogs(newLogs);
    localStorage.setItem("gritzone_supplement_logs", JSON.stringify(newLogs));
  }

  function saveSupps(supps: Supplement[]) {
    setMySupps(supps);
    localStorage.setItem("gritzone_my_supplements", JSON.stringify(supps));
  }

  function toggleSuppToday(suppId: string) {
    const existing = logs.find(l => l.date === today);
    let newLogs: LogEntry[];
    if (existing) {
      const taken = existing.supplements.includes(suppId)
        ? existing.supplements.filter(s => s !== suppId)
        : [...existing.supplements, suppId];
      newLogs = logs.map(l => l.date === today ? { ...l, supplements: taken } : l);
    } else {
      newLogs = [...logs, { date: today, supplements: [suppId] }];
    }
    saveLogs(newLogs);
  }

  function addCustomSupplement() {
    if (!customName.trim()) return;
    const supp: Supplement = { id: `custom-${Date.now()}`, name: customName.trim(), time: customTime, emoji: "💊" };
    saveSupps([...mySupps, supp]);
    setCustomName("");
    setShowAdd(false);
  }

  function removeSupplement(id: string) {
    saveSupps(mySupps.filter(s => s.id !== id));
  }

  function addPreset(supp: Supplement) {
    if (mySupps.find(s => s.id === supp.id)) return;
    saveSupps([...mySupps, supp]);
    setShowAdd(false);
  }

  // Generate 365-day grid
  const gridData = generateYearGrid(logs, mySupps);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const allTaken = mySupps.length > 0 && mySupps.every(s => takenToday.includes(s.id));

  return (
    <div className="min-h-dvh pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Supplements</h1>
          <button onClick={() => setShowAdd(true)} className="text-amber-500 text-sm font-medium hover:underline">+ Add</button>
        </div>

        {/* Today's Status */}
        <div className={`rounded-2xl p-4 mb-5 border ${allTaken ? "bg-green-500/10 border-green-500/20" : "bg-[#141414] border-neutral-800"}`}>
          <p className={`text-sm font-semibold mb-3 ${allTaken ? "text-green-400" : "text-neutral-300"}`}>
            {allTaken ? "All supplements taken today ✓" : "Today's Supplements"}
          </p>
          {mySupps.length === 0 ? (
            <p className="text-neutral-500 text-xs">Add your supplements to start tracking</p>
          ) : (
            <div className="flex flex-col gap-2">
              {mySupps.map(supp => {
                const taken = takenToday.includes(supp.id);
                return (
                  <div key={supp.id} className="flex items-center justify-between">
                    <button
                      onClick={() => toggleSuppToday(supp.id)}
                      className="flex items-center gap-3 flex-1 text-left py-1"
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs border ${taken ? "bg-amber-500 border-amber-500 text-black" : "border-neutral-600 text-neutral-600"}`}>
                        {taken ? "✓" : ""}
                      </span>
                      <div>
                        <p className={`text-sm ${taken ? "text-neutral-400 line-through" : ""}`}>{supp.emoji} {supp.name}</p>
                        <p className="text-[10px] text-neutral-600">{supp.time}</p>
                      </div>
                    </button>
                    <button onClick={() => removeSupplement(supp.id)} className="text-neutral-700 hover:text-red-400 text-xs p-1">✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 365-Day Activity Grid */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-5">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">Year Activity</h2>
          <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
            <div className="flex gap-[2px]" style={{ width: "max-content" }}>
              {gridData.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[2px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={`w-[10px] h-[10px] rounded-[2px] ${day.color}`}
                      title={day.date ? `${day.date}: ${day.pct}% taken` : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[9px] text-neutral-500">Less</span>
            <div className="w-[10px] h-[10px] rounded-[2px] bg-neutral-800" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-amber-500/30" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-amber-500/60" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-amber-500" />
            <span className="text-[9px] text-neutral-500">More</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#141414] rounded-xl border border-neutral-800 p-3 text-center">
            <p className="text-lg font-bold text-amber-400">{getConsecutiveDays(logs, mySupps)}</p>
            <p className="text-[9px] text-neutral-500">Day Streak</p>
          </div>
          <div className="bg-[#141414] rounded-xl border border-neutral-800 p-3 text-center">
            <p className="text-lg font-bold text-green-400">{getCompletionRate(logs, mySupps)}%</p>
            <p className="text-[9px] text-neutral-500">This Month</p>
          </div>
          <div className="bg-[#141414] rounded-xl border border-neutral-800 p-3 text-center">
            <p className="text-lg font-bold text-blue-400">{logs.length}</p>
            <p className="text-[9px] text-neutral-500">Days Logged</p>
          </div>
        </div>
      </div>

      {/* Add Supplement Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 border border-neutral-800 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Supplement</h2>
              <button onClick={() => setShowAdd(false)} className="text-neutral-500 text-lg">✕</button>
            </div>

            {/* Presets */}
            <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Common Supplements</p>
            <div className="flex flex-col gap-2 mb-5">
              {DEFAULT_SUPPLEMENTS.filter(s => !mySupps.find(m => m.id === s.id)).map(supp => (
                <button key={supp.id} onClick={() => addPreset(supp)} className="flex items-center gap-3 bg-neutral-900 rounded-xl p-3 hover:bg-neutral-800 text-left">
                  <span className="text-lg">{supp.emoji}</span>
                  <div>
                    <p className="text-sm">{supp.name}</p>
                    <p className="text-[10px] text-neutral-500">{supp.time}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom */}
            <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Custom</p>
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder="Supplement name" value={customName} onChange={(e) => setCustomName(e.target.value)} className="flex-1" />
              <select value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 text-sm">
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Post-workout</option>
                <option>Night</option>
              </select>
            </div>
            <button onClick={addCustomSupplement} disabled={!customName.trim()} className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-bold rounded-xl py-3">Add Custom</button>
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}

function generateYearGrid(logs: LogEntry[], supps: Supplement[]): { date: string; pct: number; color: string }[][] {
  const weeks: { date: string; pct: number; color: string }[][] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  // Align to start of week (Sunday)
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const logMap: Record<string, string[]> = {};
  logs.forEach(l => { logMap[l.date] = l.supplements; });

  let week: { date: string; pct: number; color: string }[] = [];
  const d = new Date(startDate);
  while (d <= today) {
    const dateStr = d.toISOString().split("T")[0];
    const dayLog = logMap[dateStr] ?? [];
    const pct = supps.length > 0 ? Math.round((dayLog.filter(s => supps.find(sp => sp.id === s)).length / supps.length) * 100) : 0;
    let color = "bg-neutral-800";
    if (pct > 0 && pct <= 25) color = "bg-amber-500/20";
    else if (pct > 25 && pct <= 50) color = "bg-amber-500/40";
    else if (pct > 50 && pct <= 75) color = "bg-amber-500/60";
    else if (pct > 75) color = "bg-amber-500";
    week.push({ date: dateStr, pct, color });
    if (week.length === 7) { weeks.push(week); week = []; }
    d.setDate(d.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

function getConsecutiveDays(logs: LogEntry[], supps: Supplement[]): number {
  if (supps.length === 0) return 0;
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const log = logs.find(l => l.date === dateStr);
    if (log && supps.every(s => log.supplements.includes(s.id))) streak++;
    else break;
  }
  return streak;
}

function getCompletionRate(logs: LogEntry[], supps: Supplement[]): number {
  if (supps.length === 0) return 0;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysSoFar = now.getDate();
  let complete = 0;
  for (let i = 1; i <= daysSoFar; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), i).toISOString().split("T")[0];
    const log = logs.find(l => l.date === d);
    if (log && supps.every(s => log.supplements.includes(s.id))) complete++;
  }
  return Math.round((complete / daysSoFar) * 100);
}
