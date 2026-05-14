"use client";

import type { Recommendations } from "@/lib/quiz-types";

export default function QuizResults({ rec, shareUrl, publicMode }: { rec: Recommendations; shareUrl?: string; publicMode?: boolean }) {
  const fitDiff = rec.fitnessAge !== null ? rec.fitnessAge - rec.chronologicalAge : null;
  return (
    <div>
      <div className="text-center mb-5">
        <h2 className="text-2xl font-black mb-1">Your Body Blueprint</h2>
        <p className="text-xs text-neutral-500">Built from {Object.keys(rec).length} data points</p>
      </div>

      {/* Hero cards: Body type + Fitness Age */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <HeroCard
          label="Body Type"
          value={rec.bodyType === "unknown" ? "—" : capitalize(rec.bodyType)}
          color="text-amber-400"
          sub={rec.bodyTypeReason}
        />
        <HeroCard
          label="Fitness Age"
          value={rec.fitnessAge !== null ? String(rec.fitnessAge) : "—"}
          color={fitDiff !== null ? (fitDiff <= 0 ? "text-emerald-400" : fitDiff >= 5 ? "text-red-400" : "text-amber-400") : "text-neutral-400"}
          sub={rec.fitnessAge !== null ? `Real age: ${rec.chronologicalAge}` : "Complete fitness tests to unlock"}
        />
      </div>

      {/* Body comp */}
      <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-3">Body Composition</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatTile label="BMI" value={rec.bmi.toFixed(1)} sub={rec.bmiCategory} />
          <StatTile label="Body Fat" value={rec.bodyFat ? `${rec.bodyFat.toFixed(1)}%` : "—"} sub={rec.bodyFatMethod} />
          <StatTile label="Frame" value={rec.frameSize === "unknown" ? "—" : capitalize(rec.frameSize)} sub={rec.whr ? `WHR ${rec.whr}` : ""} />
        </div>
      </div>

      {/* Metabolism */}
      <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-amber-400">Metabolism</h3>
          <span className={`text-xs font-bold ${rec.metabolismLabel === "fast" ? "text-emerald-400" : rec.metabolismLabel === "slow" ? "text-red-400" : "text-amber-400"}`}>
            {capitalize(rec.metabolismLabel)}
          </span>
        </div>
        <div className="h-2 bg-neutral-900 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400" style={{ width: `${rec.metabolismScore * 10}%` }} />
        </div>
        <p className="text-[10px] text-neutral-500 mb-2">Score: {rec.metabolismScore}/10</p>
        {rec.metabolismInsights.length > 0 && (
          <ul className="text-[11px] text-neutral-400 space-y-1 mt-2">
            {rec.metabolismInsights.slice(0, 3).map((i, k) => <li key={k}>• {i}</li>)}
          </ul>
        )}
      </div>

      {/* Macros */}
      <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-3">Daily Targets</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <MacroTile color="amber" value={String(rec.calories)} label="kcal" />
          <MacroTile color="blue" value={`${rec.protein}g`} label="Protein" />
          <MacroTile color="amber-light" value={`${rec.carbs}g`} label="Carbs" />
          <MacroTile color="pink" value={`${rec.fat}g`} label="Fat" />
        </div>
        <p className="text-[10px] text-neutral-500 mt-2 text-center">BMR {rec.bmr} • TDEE {rec.tdee} kcal</p>
        {rec.estimatedWeeksToGoal && (
          <p className="text-[11px] text-emerald-400 mt-2 text-center font-medium">
            Goal in ~{rec.estimatedWeeksToGoal} weeks at {rec.weeklyChangeKg > 0 ? "+" : ""}{rec.weeklyChangeKg} kg/week
          </p>
        )}
      </div>

      {/* Training split */}
      <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-1">Recommended Split</h3>
        <p className="text-sm font-bold">{rec.split}</p>
        <p className="text-xs text-neutral-500 mt-1">{rec.splitReason}</p>
      </div>

      {/* Insights */}
      {rec.insights.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl border border-amber-500/20 p-4 mb-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">Key Insights</h3>
          <ul className="text-xs text-neutral-300 space-y-1.5">
            {rec.insights.map((i, k) => <li key={k}>✦ {i}</li>)}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {rec.warnings.length > 0 && (
        <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-4 mb-4">
          <h3 className="text-sm font-semibold text-red-400 mb-2">Heads-up</h3>
          <ul className="text-xs text-neutral-300 space-y-1.5">
            {rec.warnings.map((i, k) => <li key={k}>⚠ {i}</li>)}
          </ul>
        </div>
      )}

      {/* Share */}
      {shareUrl && <ShareBlock url={shareUrl} rec={rec} />}

      {/* Pro upsell */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">👑</span>
          <h3 className="text-sm font-bold text-amber-400">Unlock the Full Plan</h3>
        </div>
        <ul className="text-xs text-neutral-400 flex flex-col gap-1 mb-3">
          <li>✓ 7-day meal plan matching your macros</li>
          <li>✓ Full workout regime auto-generated</li>
          <li>✓ Progressive overload tracking</li>
          <li>✓ Weekly AI adjustments based on progress</li>
          <li>✓ 1-on-1 coach matching ({rec.bodyType === "unknown" ? "your body type" : `for ${rec.bodyType}s`})</li>
        </ul>
        <a href={publicMode ? "/login" : "/pro"} className="block text-center bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-2.5 text-sm transition-colors">
          {publicMode ? "Create Free Account →" : "Upgrade to Pro →"}
        </a>
      </div>
    </div>
  );
}

function HeroCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-neutral-500 mt-1 leading-tight">{sub}</p>}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-neutral-900 rounded-lg py-2 px-1">
      <p className="text-[9px] text-neutral-500">{label}</p>
      <p className="text-base font-bold text-amber-400">{value}</p>
      {sub && <p className="text-[9px] text-neutral-500 truncate">{sub}</p>}
    </div>
  );
}

function MacroTile({ value, label, color }: { value: string; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber: "text-amber-400", blue: "text-blue-400", "amber-light": "text-amber-300", pink: "text-pink-400",
  };
  return (
    <div className="bg-neutral-900 rounded-lg py-2">
      <p className={`font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-[9px] text-neutral-500">{label}</p>
    </div>
  );
}

function ShareBlock({ url, rec }: { url: string; rec: Recommendations }) {
  const text = `I just took the GritZone Body Blueprint Quiz 💪\nBody type: ${capitalize(rec.bodyType)}\n${rec.fitnessAge !== null ? `Fitness Age: ${rec.fitnessAge}\n` : ""}Metabolism: ${capitalize(rec.metabolismLabel)}\n\nFind yours:`;
  const shareNative = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "My GritZone Body Blueprint", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        alert("Link copied to clipboard!");
      }
    } catch { /* user cancelled */ }
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  return (
    <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-4 mb-4">
      <h3 className="text-sm font-semibold text-amber-400 mb-2">Share your Blueprint</h3>
      <p className="text-[11px] text-neutral-500 mb-3">Challenge friends to take the quiz.</p>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={shareNative} className="bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl py-2 text-xs font-medium">Share</button>
        <a href={wa} target="_blank" rel="noopener" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 text-xs font-medium text-center">WhatsApp</a>
        <a href={tw} target="_blank" rel="noopener" className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-2 text-xs font-medium text-center">Twitter</a>
      </div>
    </div>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
