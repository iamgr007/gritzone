#!/usr/bin/env node
/**
 * One-off: fetches the full wger.de exercise database (CC-BY-SA),
 * normalizes it, and writes a bundled JSON to src/lib/exercises.json.
 *
 * Run: node scripts/fetch-wger.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const API = "https://wger.de/api/v2/exerciseinfo/?language=2&limit=200";
const stripHtml = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function fetchAll() {
  let url = API;
  const out = [];
  while (url) {
    process.stdout.write(`  → ${url.replace(/^https?:\/\/wger\.de/, "")}\n`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`wger fetch failed: ${res.status}`);
    const j = await res.json();
    out.push(...j.results);
    url = j.next;
  }
  return out;
}

function normalize(items) {
  const exercises = [];
  for (const it of items) {
    // English translation only
    const en = (it.translations || []).find((t) => t.language === 2);
    if (!en?.name) continue;

    // Skip exercises without any muscle info — we can't categorize them
    const primary = (it.muscles || []).map((m) => m.name_en || m.name).filter(Boolean);
    const secondary = (it.muscles_secondary || [])
      .map((m) => m.name_en || m.name)
      .filter(Boolean);

    const category = it.category?.name || "Other";
    const equipment = (it.equipment || []).map((e) => e.name);

    // Prefer a "main" image if multiple — the API marks one with is_main=true
    const images = (it.images || []).map((i) => ({
      url: i.image,
      is_main: i.is_main ?? false,
    }));
    images.sort((a, b) => Number(b.is_main) - Number(a.is_main));
    const imageUrl = images[0]?.url || null;

    exercises.push({
      id: it.uuid,
      name: en.name,
      aliases: en.aliases?.map((a) => a.alias) || [],
      description: stripHtml(en.description),
      category,
      primary_muscles: primary,
      secondary_muscles: secondary,
      equipment,
      image: imageUrl,
    });
  }
  // Dedupe by lowercased name (wger has duplicates from different authors)
  const seen = new Map();
  for (const e of exercises) {
    const key = e.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, e);
    else {
      // Prefer the entry with more data (image, muscles, description)
      const score = (x) =>
        (x.image ? 4 : 0) +
        (x.primary_muscles.length ? 2 : 0) +
        (x.description ? 1 : 0);
      if (score(e) > score(seen.get(key))) seen.set(key, e);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

(async () => {
  console.log("Fetching wger exercise database…");
  const raw = await fetchAll();
  console.log(`  ${raw.length} raw exercises`);
  const norm = normalize(raw);
  console.log(`  ${norm.length} after normalize + dedupe`);

  const outPath = path.resolve("src/lib/exercises.json");
  await fs.writeFile(outPath, JSON.stringify(norm, null, 0) + "\n");
  const stat = await fs.stat(outPath);
  console.log(`✓ wrote ${outPath} (${(stat.size / 1024).toFixed(1)} KB)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
