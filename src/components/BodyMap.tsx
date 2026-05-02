"use client";

/**
 * Stylized front + back body silhouette with highlightable muscle groups.
 *
 * Pass `primary` (bright amber) and `secondary` (dim amber) sets of muscle keys.
 * Recognized keys (case-insensitive, matches wger naming):
 *   chest, shoulders, biceps, triceps, abs, obliquus externus abdominis (obliques),
 *   serratus anterior (serratus), brachialis, quads, calves, soleus,
 *   trapezius, lats, glutes, hamstrings
 */

type MuscleKey = string;

const norm = (s: string) =>
  s.toLowerCase().replace(/^obliquus.*/, "obliques").replace(/^serratus.*/, "serratus");

function classFor(muscles: Set<string>, primary: Set<string>, secondary: Set<string>) {
  const has = (m: string) =>
    muscles.has(m) ||
    [...muscles].some((x) => x.includes(m) || m.includes(x));
  if ([...primary].some(has)) return "fill-amber-500/85 stroke-amber-300";
  if ([...secondary].some(has)) return "fill-amber-500/35 stroke-amber-500/40";
  return "fill-neutral-800 stroke-neutral-700";
}

export default function BodyMap({
  primary = [],
  secondary = [],
  size = 200,
}: {
  primary?: MuscleKey[];
  secondary?: MuscleKey[];
  size?: number;
}) {
  const p = new Set(primary.map(norm));
  const s = new Set(secondary.map(norm));

  // Helper: build the className-by-muscle-key set for a region
  const cls = (...keys: string[]) => classFor(new Set(keys.map(norm)), p, s);

  return (
    <div className="flex items-center justify-center gap-3">
      {/* FRONT VIEW */}
      <svg viewBox="0 0 100 220" width={size / 2} height={size}>
        {/* head */}
        <ellipse cx="50" cy="14" rx="9" ry="11" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        {/* neck */}
        <rect x="46" y="24" width="8" height="6" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        {/* trapezius (upper) */}
        <path
          d="M30 32 Q50 26 70 32 L66 38 Q50 34 34 38 Z"
          className={cls("trapezius")}
          strokeWidth="0.6"
        />
        {/* shoulders */}
        <ellipse cx="26" cy="40" rx="8" ry="7" className={cls("shoulders")} strokeWidth="0.6" />
        <ellipse cx="74" cy="40" rx="8" ry="7" className={cls("shoulders")} strokeWidth="0.6" />
        {/* chest (two pecs) */}
        <path
          d="M34 40 Q42 38 50 40 L50 60 Q44 62 36 58 Z"
          className={cls("chest")}
          strokeWidth="0.6"
        />
        <path
          d="M66 40 Q58 38 50 40 L50 60 Q56 62 64 58 Z"
          className={cls("chest")}
          strokeWidth="0.6"
        />
        {/* serratus */}
        <path d="M34 60 L36 70 L40 64 Z" className={cls("serratus")} strokeWidth="0.6" />
        <path d="M66 60 L64 70 L60 64 Z" className={cls("serratus")} strokeWidth="0.6" />
        {/* biceps */}
        <ellipse cx="20" cy="56" rx="5" ry="9" className={cls("biceps", "brachialis")} strokeWidth="0.6" />
        <ellipse cx="80" cy="56" rx="5" ry="9" className={cls("biceps", "brachialis")} strokeWidth="0.6" />
        {/* forearm */}
        <ellipse cx="17" cy="76" rx="4" ry="9" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        <ellipse cx="83" cy="76" rx="4" ry="9" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        {/* abs */}
        <rect x="42" y="62" width="16" height="28" rx="3" className={cls("abs")} strokeWidth="0.6" />
        {/* obliques */}
        <path d="M34 64 L42 64 L42 88 L36 86 Z" className={cls("obliques")} strokeWidth="0.6" />
        <path d="M66 64 L58 64 L58 88 L64 86 Z" className={cls("obliques")} strokeWidth="0.6" />
        {/* hips */}
        <path d="M34 92 Q50 96 66 92 L62 102 Q50 104 38 102 Z" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        {/* quads */}
        <ellipse cx="40" cy="130" rx="9" ry="22" className={cls("quads")} strokeWidth="0.6" />
        <ellipse cx="60" cy="130" rx="9" ry="22" className={cls("quads")} strokeWidth="0.6" />
        {/* knee */}
        <ellipse cx="40" cy="158" rx="6" ry="4" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        <ellipse cx="60" cy="158" rx="6" ry="4" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        {/* calf-front (tib + soleus showing) */}
        <ellipse cx="40" cy="186" rx="6" ry="20" className={cls("calves", "soleus")} strokeWidth="0.6" />
        <ellipse cx="60" cy="186" rx="6" ry="20" className={cls("calves", "soleus")} strokeWidth="0.6" />
        <text x="50" y="216" textAnchor="middle" className="fill-neutral-500" style={{ fontSize: 7 }}>FRONT</text>
      </svg>

      {/* BACK VIEW */}
      <svg viewBox="0 0 100 220" width={size / 2} height={size}>
        <ellipse cx="50" cy="14" rx="9" ry="11" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        <rect x="46" y="24" width="8" height="6" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        {/* trapezius (full) */}
        <path
          d="M30 32 Q50 26 70 32 L66 60 Q50 56 34 60 Z"
          className={cls("trapezius")}
          strokeWidth="0.6"
        />
        {/* rear delts */}
        <ellipse cx="26" cy="40" rx="8" ry="7" className={cls("shoulders")} strokeWidth="0.6" />
        <ellipse cx="74" cy="40" rx="8" ry="7" className={cls("shoulders")} strokeWidth="0.6" />
        {/* lats */}
        <path
          d="M34 56 L46 60 L46 90 L34 84 Z"
          className={cls("lats")}
          strokeWidth="0.6"
        />
        <path
          d="M66 56 L54 60 L54 90 L66 84 Z"
          className={cls("lats")}
          strokeWidth="0.6"
        />
        {/* spine line */}
        <rect x="48" y="60" width="4" height="32" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        {/* triceps */}
        <ellipse cx="20" cy="56" rx="5" ry="9" className={cls("triceps")} strokeWidth="0.6" />
        <ellipse cx="80" cy="56" rx="5" ry="9" className={cls("triceps")} strokeWidth="0.6" />
        <ellipse cx="17" cy="76" rx="4" ry="9" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        <ellipse cx="83" cy="76" rx="4" ry="9" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        {/* glutes */}
        <ellipse cx="42" cy="100" rx="10" ry="9" className={cls("glutes")} strokeWidth="0.6" />
        <ellipse cx="58" cy="100" rx="10" ry="9" className={cls("glutes")} strokeWidth="0.6" />
        {/* hamstrings */}
        <ellipse cx="40" cy="130" rx="9" ry="22" className={cls("hamstrings")} strokeWidth="0.6" />
        <ellipse cx="60" cy="130" rx="9" ry="22" className={cls("hamstrings")} strokeWidth="0.6" />
        <ellipse cx="40" cy="158" rx="6" ry="4" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        <ellipse cx="60" cy="158" rx="6" ry="4" className="fill-neutral-800 stroke-neutral-700" strokeWidth="0.6" />
        {/* calves rear */}
        <ellipse cx="40" cy="186" rx="6" ry="20" className={cls("calves", "soleus")} strokeWidth="0.6" />
        <ellipse cx="60" cy="186" rx="6" ry="20" className={cls("calves", "soleus")} strokeWidth="0.6" />
        <text x="50" y="216" textAnchor="middle" className="fill-neutral-500" style={{ fontSize: 7 }}>BACK</text>
      </svg>
    </div>
  );
}
