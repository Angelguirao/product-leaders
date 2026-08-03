#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "og", "tensions");

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
      <stop offset="0%" stop-color="#f4efe6"/>
      <stop offset="100%" stop-color="#efe8dc"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="80" r="180" fill="#e8c4b0" opacity="0.45"/>
  <circle cx="120" cy="540" r="140" fill="#ddd4c4" opacity="0.55"/>
  <text x="80" y="100" font-family="Georgia, 'Times New Roman', serif" font-size="24" fill="#6b6358" letter-spacing="3">PRODUCT LEADERS · TENSION</text>
  <text x="80" y="180" font-family="Georgia, 'Times New Roman', serif" font-size="48" fill="#2a2318">${axisText}</text>
  <rect x="80" y="300" width="480" height="240" fill="#faf7f2" stroke="#d4cbbd"/>
  <rect x="640" y="300" width="480" height="240" fill="#faf7f2" stroke="#d4cbbd"/>
  <text x="110" y="350" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#b85c38">${esc(aPole)}</text>
  <text x="110" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="${aSize}" fill="#2a2318">${esc(aName)}</text>
  <text x="670" y="350" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#b85c38">${esc(bPole)}</text>
  <text x="670" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="${bSize}" fill="#2a2318">${esc(bName)}</text>
  <text x="580" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-style="italic" fill="#6b6358" text-anchor="middle">vs</text>
</svg>
`;
}

const items = [
  {
    id: "underwriting-vs-rails",
    axis: "What is the fintech wedge?",
    aPole: "Underwriting as core IP",
    aName: "Capchase",
    bPole: "Kill UX — sell rails",
    bName: "Devengo",
  },
  {
    id: "factory-vs-humanization",
    axis: "What makes DTC defensible?",
    aPole: "Own the factory",
    aName: "Freshly Cosmetics",
    bPole: "Humanize the subscription",
    bName: "Dogfy Diet",
  },
  {
    id: "explore-data-vs-govern-ai",
    axis: "How do companies unlock their data?",
    aPole: "Explore without a gatekeeper",
    aName: "Graphext",
    bPole: "Prep + govern for AI",
    bName: "Capably",
  },
];

mkdirSync(out, { recursive: true });
for (const item of items) {
  const path = join(out, `${item.id}.svg`);
  writeFileSync(path, svg(item));
  console.log("wrote", path);
}
