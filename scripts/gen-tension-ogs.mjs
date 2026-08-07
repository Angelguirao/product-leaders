#!/usr/bin/env node
/**
 * Generate missing public/og/tensions/<id>.svg files from tensions.json + companies.json.
 * Usage: node scripts/gen-tension-ogs.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "og", "tensions");
const tensions = JSON.parse(
  readFileSync(join(root, "src/data/tensions.json"), "utf8"),
);
const companies = JSON.parse(
  readFileSync(join(root, "src/data/companies.json"), "utf8"),
);
const bySlug = Object.fromEntries(companies.map((c) => [c.slug, c]));

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapAxis(axis, max = 34) {
  const words = axis.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function svg({ axis, aPole, aName, bPole, bName }) {
  const lines = wrapAxis(axis);
  const axisText = lines
    .map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : 56}">${esc(l)}</tspan>`)
    .join("");
  const aSize = aName.length > 16 ? 32 : 40;
  const bSize = bName.length > 16 ? 32 : 40;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${esc(axis)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fafafa"/>
      <stop offset="100%" stop-color="#f4f4f5"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="80" r="180" fill="#fef3c7" opacity="0.55"/>
  <circle cx="120" cy="540" r="140" fill="#e4e4e7" opacity="0.65"/>
  <text x="80" y="100" font-family="Georgia, 'Times New Roman', serif" font-size="24" fill="#71717a" letter-spacing="3">PRODUCT LEADERS · TENSION</text>
  <text x="80" y="180" font-family="Georgia, 'Times New Roman', serif" font-size="48" fill="#18181b">${axisText}</text>
  <rect x="80" y="300" width="480" height="240" fill="#ffffff" stroke="#e4e4e7"/>
  <rect x="640" y="300" width="480" height="240" fill="#ffffff" stroke="#e4e4e7"/>
  <text x="110" y="350" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#d97706">${esc(aPole)}</text>
  <text x="110" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="${aSize}" fill="#18181b">${esc(aName)}</text>
  <text x="670" y="350" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#d97706">${esc(bPole)}</text>
  <text x="670" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="${bSize}" fill="#18181b">${esc(bName)}</text>
  <text x="580" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-style="italic" fill="#71717a" text-anchor="middle">vs</text>
</svg>
`;
}

mkdirSync(out, { recursive: true });
let wrote = 0;
for (const t of tensions) {
  const path = join(out, `${t.id}.svg`);
  if (existsSync(path) && !process.argv.includes("--force")) continue;
  const a = bySlug[t.a.slug];
  const b = bySlug[t.b.slug];
  if (!a || !b) {
    console.warn("skip missing org", t.id);
    continue;
  }
  writeFileSync(
    path,
    svg({
      axis: t.axis,
      aPole: t.a.pole,
      aName: a.name,
      bPole: t.b.pole,
      bName: b.name,
    }),
  );
  console.log("wrote", path);
  wrote += 1;
}
console.log(`done — ${wrote} new/updated`);
