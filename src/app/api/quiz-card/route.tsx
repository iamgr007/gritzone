import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Shareable result card image. Used as og:image and direct PNG share.
// Renders body type + fitness age + metabolism in GritZone branding.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const bodyType = (p.get("bt") || "Mesomorph").replace(/^./, c => c.toUpperCase());
  const fitnessAge = p.get("fa") || "—";
  const realAge = p.get("ra") || "—";
  const metabolism = (p.get("m") || "moderate").replace(/^./, c => c.toUpperCase());
  const name = p.get("n") || "I";

  const fitDiff = parseInt(fitnessAge) - parseInt(realAge);
  const fitColor = !isFinite(fitDiff) ? "#fbbf24" : fitDiff <= 0 ? "#34d399" : fitDiff >= 5 ? "#f87171" : "#fbbf24";

  return new ImageResponse(
    (
      <div style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
        padding: 60,
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, color: "#f59e0b" }}>
              GRIT<span style={{ color: "#525252" }}>ZONE</span>
            </div>
          </div>
          <div style={{ fontSize: 18, color: "#737373", display: "flex" }}>Body Blueprint</div>
        </div>

        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", marginTop: 20 }}>
          <div style={{ fontSize: 28, color: "#a3a3a3", marginBottom: 8, display: "flex" }}>
            {name === "I" ? "Just discovered:" : `${name}'s results:`}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 30 }}>
            <div style={{ fontSize: 96, fontWeight: 900, color: "#f59e0b", lineHeight: 1, letterSpacing: -2 }}>
              {bodyType}
            </div>
          </div>

          {/* Stat tiles */}
          <div style={{ display: "flex", gap: 20 }}>
            <Tile label="Fitness Age" value={fitnessAge} valueColor={fitColor} sub={`vs real age ${realAge}`} />
            <Tile label="Metabolism" value={metabolism} valueColor="#fbbf24" />
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          background: "rgba(245, 158, 11, 0.12)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: 16,
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Find your body type in 2 minutes</div>
            <div style={{ fontSize: 16, color: "#a3a3a3" }}>Free quiz · No signup needed</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>gritzone.app/quiz →</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function Tile({ label, value, valueColor, sub }: { label: string; value: string; valueColor: string; sub?: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 20,
      padding: "24px 28px",
    }}>
      <div style={{ fontSize: 14, color: "#737373", textTransform: "uppercase", letterSpacing: 2, display: "flex" }}>{label}</div>
      <div style={{ fontSize: 64, fontWeight: 900, color: valueColor, lineHeight: 1.1, display: "flex" }}>{value}</div>
      {sub && <div style={{ fontSize: 16, color: "#737373", marginTop: 4, display: "flex" }}>{sub}</div>}
    </div>
  );
}
