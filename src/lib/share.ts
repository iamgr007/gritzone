"use client";

// Renders a square (1080×1080) social-card image on a canvas with the user's
// stat, brands it for GRITZONE, and triggers the OS share sheet (Instagram /
// WhatsApp / Twitter / Stories etc) via the Web Share API with a File payload.
// Falls back to downloading the PNG if file-sharing isn't supported.

export type ShareCardOptions = {
  /** Big number, e.g. "12,450 kg" or "47 days". */
  value: string;
  /** Small uppercase label above the number, e.g. "TOTAL LIFTED". */
  label: string;
  /** Big emoji floated to the right (e.g. "🐅"). */
  emoji?: string;
  /** Punchline below the number, e.g. "I just lifted a tiger 🐅". */
  headline: string;
  /** Optional secondary line, e.g. the analogy detail. */
  subline?: string;
  /** Background gradient tuple (top → bottom). Defaults to brand orange→red. */
  gradient?: [string, string];
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const tentative = current ? `${current} ${word}` : word;
    if (ctx.measureText(tentative).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = tentative;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateShareCard(opts: ShareCardOptions): Promise<Blob> {
  const SIZE = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  // Background gradient
  const [g1, g2] = opts.gradient ?? ["#1a0f0a", "#0a0a0a"];
  const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0, g1);
  grad.addColorStop(1, g2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle radial glow top-right
  const glow = ctx.createRadialGradient(SIZE * 0.78, SIZE * 0.22, 20, SIZE * 0.78, SIZE * 0.22, 700);
  glow.addColorStop(0, "rgba(251, 146, 60, 0.35)");
  glow.addColorStop(1, "rgba(251, 146, 60, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Brand mark — top
  ctx.font = "900 56px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillStyle = "#f59e0b";
  ctx.textAlign = "left";
  ctx.fillText("GRIT", 80, 140);
  ctx.fillStyle = "#737373";
  ctx.fillText("ZONE", 80 + ctx.measureText("GRIT").width, 140);

  // Beta tag
  ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
  const tagText = "BETA";
  ctx.font = "800 22px ui-sans-serif, system-ui";
  const tagW = ctx.measureText(tagText).width + 28;
  roundRect(ctx, 80 + ctx.measureText("GRITZONE").width + 16, 102, tagW, 36, 18);
  ctx.fill();
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(tagText, 80 + ctx.measureText("GRITZONE").width + 30, 128);

  // Big emoji (drawn first, behind text)
  if (opts.emoji) {
    ctx.font = "320px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(opts.emoji, SIZE - 70, 540);
  }

  // Label
  ctx.font = "800 32px ui-sans-serif, system-ui";
  ctx.fillStyle = "#fb923c";
  ctx.textAlign = "left";
  ctx.fillText(opts.label.toUpperCase(), 80, 720);

  // Value (huge)
  ctx.font = "900 168px ui-sans-serif, system-ui";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(opts.value, 80, 870);

  // Headline (wrap)
  ctx.font = "700 44px ui-sans-serif, system-ui";
  ctx.fillStyle = "#fafafa";
  const headlineLines = wrapText(ctx, opts.headline, SIZE - 160);
  let y = 920;
  for (const line of headlineLines) {
    y += 56;
    ctx.fillText(line, 80, y);
  }

  // Subline
  if (opts.subline) {
    ctx.font = "500 28px ui-sans-serif, system-ui";
    ctx.fillStyle = "#a3a3a3";
    const sublineLines = wrapText(ctx, opts.subline, SIZE - 160);
    for (const line of sublineLines) {
      y += 38;
      ctx.fillText(line, 80, y);
    }
  }

  // Footer URL
  ctx.font = "600 26px ui-sans-serif, system-ui";
  ctx.fillStyle = "#525252";
  ctx.textAlign = "right";
  ctx.fillText("gritzone.me", SIZE - 80, SIZE - 60);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 0.95);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function shareOrDownload(opts: ShareCardOptions, fallbackText: string) {
  let blob: Blob;
  try {
    blob = await generateShareCard(opts);
  } catch (e) {
    console.error("share card render failed", e);
    return;
  }
  const file = new File([blob], `gritzone-${Date.now()}.png`, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  // Prefer file share — Instagram / WhatsApp / Twitter all accept image files.
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: fallbackText,
        title: "GRITZONE",
      });
      return;
    } catch (e) {
      // user cancelled or share rejected — fall through to download
      if ((e as DOMException)?.name === "AbortError") return;
    }
  }
  // Text-only share fallback (some Android browsers)
  if (navigator.share) {
    try {
      await navigator.share({ text: `${fallbackText} https://gritzone.me` });
      return;
    } catch { /* ignore */ }
  }
  // Final fallback: download the PNG
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
