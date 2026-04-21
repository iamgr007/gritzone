"use client";

// Lightweight celebration helpers — no external deps.

export function haptic(type: "light" | "medium" | "heavy" | "success" = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [15, 30, 15],
  };
  try { navigator.vibrate(patterns[type]); } catch { /* ignore */ }
}

// Canvas-based confetti burst. Call this on wins.
export function confetti(opts: { colors?: string[]; count?: number; duration?: number } = {}) {
  if (typeof window === "undefined") return;
  const colors = opts.colors || ["#f59e0b", "#fbbf24", "#fb923c", "#22c55e", "#f43f5e"];
  const count = opts.count || 60;
  const duration = opts.duration || 1500;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }

  type Particle = { x: number; y: number; vx: number; vy: number; rot: number; vRot: number; size: number; color: string; shape: "rect" | "circle" };
  const particles: Particle[] = [];
  const cx = canvas.width / 2;
  const cy = canvas.height / 3;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 6 + Math.random() * 8;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? "rect" : "circle",
    });
  }

  const start = performance.now();
  function frame(now: number) {
    const t = now - start;
    if (t > duration) { canvas.remove(); return; }
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    const alpha = 1 - t / duration;
    for (const p of particles) {
      p.vy += 0.3; // gravity
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;
      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Combined: for big wins (level up, badge earned, workout complete)
export function celebrate() {
  haptic("success");
  confetti();
}
