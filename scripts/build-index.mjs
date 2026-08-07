#!/usr/bin/env node
/**
 * Build atlas JSON from thesis-first episode cards.
 * Only status=published companies appear on the public map.
 */
import {
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { extractThesis, isGenericThesis, section, firstParagraph } from "./quality.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const episodesDir = join(root, "episodes");
const outDir = join(root, "src", "data");
const practicesPath = join(root, "practices.yaml");

const practiceLabels = existsSync(practicesPath)
  ? parseYaml(readFileSync(practicesPath, "utf8")).labels || {}
  : {};

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { meta: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 4);
  if (end < 0) return { meta: {}, body: raw };
  const fm = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const meta = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = [...val.matchAll(/"((?:\\.|[^"])*)"/g)].map((x) =>
        x[1].replace(/\\"/g, '"')
      );
    } else if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      meta[key] = val.slice(1, -1);
    } else if (val === "null") {
      meta[key] = null;
    } else if (/^-?\d+(\.\d+)?$/.test(val)) {
      meta[key] = Number(val);
    } else {
      meta[key] = val;
    }
  }
  return { meta, body };
}

function bulletLines(text, limit = 8) {
  return text
    .split(/\n/)
    .map((l) => l.replace(/^[*+-]\s+/, "").trim())
    .filter((l) => l && !l.startsWith("_") && !l.startsWith("```"))
    .slice(0, limit);
}

function firstMermaid(text) {
  const m = String(text || "").match(/```mermaid\s*([\s\S]*?)```/i);
  if (!m) return null;
  let s = m[1].trim().replace(/^graph (TD|TB|LR|RL)/i, "flowchart $1");
  return s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

function normalizeStatus(meta, body) {
  let status = meta.status || "unknown";
  // Migrate old "briefed" through the quality gate
  if (status === "briefed") {
    const thesis = extractThesis(body);
    status = isGenericThesis(thesis) ? "weak" : "published";
  }
  return status;
}

mkdirSync(outDir, { recursive: true });
mkdirSync(episodesDir, { recursive: true });

const files = readdirSync(episodesDir).filter((f) => f.endsWith(".md"));
const episodes = files.map((file) => {
  const slug = file.replace(/\.md$/, "");
  const raw = readFileSync(join(episodesDir, file), "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const thesisSec = section(body, "Thesis");
  const contextSec = section(body, "Context") || section(body, "Snapshot");
  const loopSec =
    section(body, "Operating loop") || section(body, "Product workflow");
  const ownershipSec =
    section(body, "Ownership") || section(body, "Roles & org");
  const evidenceSec = section(body, "Evidence");
  const gapsSec = section(body, "Gaps");
  const status = normalizeStatus(meta, body);
  const thesis =
    firstParagraph(thesisSec) || extractThesis(body) || firstParagraph(contextSec);

  return {
    slug,
    title: meta.title || slug,
    youtube_id: meta.youtube_id || null,
    url: meta.url || null,
    audio_url: meta.audio_url || null,
    pub_date: meta.pub_date || null,
    guest: meta.guest || null,
    role: meta.role || null,
    company: meta.company || null,
    company_slug: meta.company_slug || null,
    stage: meta.stage || null,
    practices: meta.practices || [],
    status,
    processed_at: meta.processed_at || null,
    thesis,
    context: firstParagraph(contextSec),
    ownership: bulletLines(ownershipSec, 6),
    evidence: bulletLines(evidenceSec, 3),
    gaps: bulletLines(gapsSec, 4),
    loop_bullets: bulletLines(loopSec, 7),
    loop_mermaid: firstMermaid(loopSec),
    // legacy aliases for any leftover UI
    overview: thesis,
    workflow_mermaid: firstMermaid(loopSec),
  };
});

episodes.sort((a, b) => {
  const da = a.pub_date || "";
  const db = b.pub_date || "";
  return db.localeCompare(da);
});

const companyMap = new Map();
for (const ep of episodes) {
  if (!ep.company_slug || !ep.company) continue;
  // Only published cards enter the public map
  if (ep.status !== "published") continue;

  if (!companyMap.has(ep.company_slug)) {
    companyMap.set(ep.company_slug, {
      slug: ep.company_slug,
      name: ep.company,
      stage: ep.stage,
      practices: new Set(),
      guests: [],
      episodes: [],
      thesis: ep.thesis,
    });
  }
  const c = companyMap.get(ep.company_slug);
  if (ep.stage && (!c.stage || c.stage === "other")) c.stage = ep.stage;
  // Newest episode is processed first (list is date-desc). Do not let older
  // interviews overwrite the company headline thesis.
  if (ep.thesis && !c.thesis) c.thesis = ep.thesis;
  for (const p of ep.practices || []) c.practices.add(p);
  if (ep.guest) {
    c.guests.push({ name: ep.guest, role: ep.role, episode_slug: ep.slug });
  }
  c.episodes.push({
    slug: ep.slug,
    title: ep.title,
    guest: ep.guest,
    role: ep.role,
    pub_date: ep.pub_date,
    url: ep.url,
    thesis: ep.thesis,
    context: ep.context,
    ownership: ep.ownership,
    evidence: ep.evidence,
    gaps: ep.gaps,
    loop_bullets: ep.loop_bullets,
    loop_mermaid: ep.loop_mermaid,
    overview: ep.thesis,
    workflow_mermaid: ep.loop_mermaid,
  });
}

const companies = [...companyMap.values()]
  .map((c) => ({
    ...c,
    practices: [...c.practices],
    episode_count: c.episodes.length,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const practiceIndex = {};
for (const [key, label] of Object.entries(practiceLabels)) {
  practiceIndex[key] = {
    key,
    label,
    companies: companies
      .filter((c) => c.practices.includes(key))
      .map((c) => ({ slug: c.slug, name: c.name, thesis: c.thesis })),
    episodes: episodes
      .filter(
        (e) => e.status === "published" && (e.practices || []).includes(key)
      )
      .map((e) => ({
        slug: e.slug,
        title: e.title,
        company: e.company,
        company_slug: e.company_slug,
        thesis: e.thesis,
      })),
  };
}

function buildAtlasMermaid(companies, practiceLabels) {
  const lines = [
    "flowchart LR",
    "  classDef company fill:#fafafa,stroke:#18181b,color:#18181b",
    "  classDef practice fill:#fef3c7,stroke:#d97706,color:#18181b",
  ];
  const usedPractices = new Set();
  for (const c of companies) {
    const cid = "C_" + c.slug.replace(/[^a-z0-9_]/gi, "_");
    const label = String(c.name).replace(/"/g, "'");
    lines.push(`  ${cid}["${label}"]:::company`);
    lines.push(`  click ${cid} "/companies/${c.slug}" "Open ${label}"`);
    for (const p of c.practices || []) {
      usedPractices.add(p);
      lines.push(`  ${cid} --- P_${p}`);
    }
  }
  for (const p of usedPractices) {
    const short = (practiceLabels[p] || p).replace(/"/g, "'");
    const compact = short.split(/[&/]/)[0].trim().slice(0, 28);
    lines.push(`  P_${p}(["${compact}"]):::practice`);
    lines.push(`  click P_${p} "/practices/${p}" "Browse ${compact}"`);
  }
  return lines.join("\n");
}

function escapeXml(s) {
  return String(s || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapWords(text, maxChars, maxLines) {
  const words = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    } else {
      cur = next;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (words.join(" ").length > lines.join(" ").length) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length > 3) {
      lines[last] = lines[last].replace(/\s+\S*$/, "") + "…";
    }
  }
  return lines;
}

function companyOgSvg(company) {
  const name = escapeXml(company.name);
  const thesisLines = wrapWords(company.thesis || "How this product org operates.", 42, 4);
  const thesisTspans = thesisLines
    .map(
      (line, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : 44}">${escapeXml(line)}</tspan>`
    )
    .join("");
  const stage = escapeXml(company.stage || "product org");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${name}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fafafa"/>
      <stop offset="100%" stop-color="#f4f4f5"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="80" r="180" fill="#fef3c7" opacity="0.55"/>
  <circle cx="120" cy="540" r="140" fill="#e4e4e7" opacity="0.65"/>
  <text x="80" y="120" font-family="Georgia, 'Times New Roman', serif" font-size="26" fill="#71717a" letter-spacing="3">PRODUCT LEADERS ATLAS</text>
  <text x="80" y="200" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#d97706">${stage}</text>
  <text x="80" y="270" font-family="Georgia, 'Times New Roman', serif" font-size="64" fill="#18181b">${name}</text>
  <text x="80" y="360" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#18181b">${thesisTspans}</text>
</svg>
`;
}

function tensionOgSvg(tension, bySlug) {
  const axisLines = wrapWords(tension.axis || "Tension", 36, 2);
  const axisTspans = axisLines
    .map(
      (line, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : 40}">${escapeXml(line)}</tspan>`
    )
    .join("");
  const aName = escapeXml(bySlug[tension.a.slug]?.name || tension.a.slug);
  const bName = escapeXml(bySlug[tension.b.slug]?.name || tension.b.slug);
  const aPole = escapeXml(tension.a.pole || "");
  const bPole = escapeXml(tension.b.pole || "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(tension.axis)}">
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
  <text x="80" y="180" font-family="Georgia, 'Times New Roman', serif" font-size="48" fill="#18181b">${axisTspans}</text>
  <rect x="80" y="300" width="480" height="240" fill="#ffffff" stroke="#e4e4e7"/>
  <rect x="640" y="300" width="480" height="240" fill="#ffffff" stroke="#e4e4e7"/>
  <text x="110" y="350" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#d97706">${aPole}</text>
  <text x="110" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="#18181b">${aName}</text>
  <text x="670" y="350" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#d97706">${bPole}</text>
  <text x="670" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="#18181b">${bName}</text>
  <text x="580" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-style="italic" fill="#71717a" text-anchor="middle">vs</text>
</svg>
`;
}

async function svgToPng(svg, outPath) {
  const { default: sharp } = await import("sharp");
  const clean = String(svg).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  await sharp(Buffer.from(clean)).png({ compressionLevel: 9 }).toFile(outPath);
}

async function writeOgAssets(companies) {
  const ogDir = join(root, "public", "og");
  mkdirSync(ogDir, { recursive: true });
  const keepSvg = new Set(companies.map((c) => `${c.slug}.svg`));
  const keepPng = new Set(companies.map((c) => `${c.slug}.png`));
  for (const file of readdirSync(ogDir).filter((f) => f.endsWith(".svg") || f.endsWith(".png"))) {
    if (file.endsWith(".svg") && !keepSvg.has(file)) unlinkSync(join(ogDir, file));
    if (file.endsWith(".png") && !keepPng.has(file)) unlinkSync(join(ogDir, file));
  }
  for (const c of companies) {
    const svg = companyOgSvg(c);
    writeFileSync(join(ogDir, `${c.slug}.svg`), svg);
    await svgToPng(svg, join(ogDir, `${c.slug}.png`));
  }

  const siteOgSvg = join(root, "public", "og.svg");
  if (existsSync(siteOgSvg)) {
    await svgToPng(readFileSync(siteOgSvg, "utf8"), join(root, "public", "og.png"));
  }

  const tensionsPath = join(outDir, "tensions.json");
  if (!existsSync(tensionsPath)) return;
  const tensions = JSON.parse(readFileSync(tensionsPath, "utf8"));
  const bySlug = Object.fromEntries(companies.map((c) => [c.slug, c]));
  const tDir = join(ogDir, "tensions");
  mkdirSync(tDir, { recursive: true });
  const keepTSvg = new Set(tensions.map((t) => `${t.id}.svg`));
  const keepTPng = new Set(tensions.map((t) => `${t.id}.png`));
  for (const file of readdirSync(tDir).filter((f) => f.endsWith(".svg") || f.endsWith(".png"))) {
    if (file.endsWith(".svg") && !keepTSvg.has(file)) unlinkSync(join(tDir, file));
    if (file.endsWith(".png") && !keepTPng.has(file)) unlinkSync(join(tDir, file));
  }
  for (const t of tensions) {
    const svg = tensionOgSvg(t, bySlug);
    writeFileSync(join(tDir, `${t.id}.svg`), svg);
    await svgToPng(svg, join(tDir, `${t.id}.png`));
  }
}

const published = episodes.filter((e) => e.status === "published");
const weak = episodes.filter((e) => e.status === "weak");
const stubs = episodes.filter((e) => e.status === "stub");

const payload = {
  built_at: new Date().toISOString(),
  episode_count: episodes.length,
  company_count: companies.length,
  published_count: published.length,
  weak_count: weak.length,
  stub_count: stubs.length,
  briefed_count: published.length,
  diagrammed_count: published.filter((e) => e.loop_mermaid).length,
  episodes,
  companies,
  practices: practiceIndex,
  map_mermaid: buildAtlasMermaid(companies, practiceLabels),
};

writeFileSync(join(outDir, "atlas.json"), JSON.stringify(payload, null, 2));
writeFileSync(join(outDir, "episodes.json"), JSON.stringify(episodes, null, 2));
writeFileSync(join(outDir, "companies.json"), JSON.stringify(companies, null, 2));

await writeOgAssets(companies);

const companiesDir = join(root, "companies");
mkdirSync(companiesDir, { recursive: true });
const publishedSlugs = new Set(companies.map((c) => c.slug));
for (const file of readdirSync(companiesDir).filter((f) => f.endsWith(".md"))) {
  const slug = file.replace(/\.md$/, "");
  if (!publishedSlugs.has(slug)) unlinkSync(join(companiesDir, file));
}
for (const c of companies) {
  const lines = [
    `# ${c.name}`,
    ``,
    `> ${c.thesis || ""}`,
    ``,
    `- Stage: ${c.stage || "unknown"}`,
    `- Practices: ${c.practices.join(", ") || "—"}`,
    ``,
  ];
  for (const e of c.episodes) {
    lines.push(`## ${e.guest || "Episode"}`, ``);
    if (e.loop_mermaid) {
      lines.push("### Operating loop", "", "```mermaid", e.loop_mermaid, "```", "");
    } else if (e.loop_bullets?.length) {
      lines.push("### Operating loop", "", ...e.loop_bullets.map((b) => `- ${b}`), "");
    }
    if (e.ownership?.length) {
      lines.push("### Ownership", "", ...e.ownership.map((b) => `- ${b}`), "");
    }
    if (e.evidence?.length) {
      lines.push("### Evidence", "", ...e.evidence.map((b) => `- ${b}`), "");
    }
    lines.push(`[Source](../episodes/${e.slug}.md)`, ``);
  }
  writeFileSync(join(companiesDir, `${c.slug}.md`), lines.join("\n"));
}

console.log(
  `Indexed ${episodes.length} episodes → ${companies.length} published companies ` +
    `(${published.length} published · ${weak.length} weak · ${stubs.length} stub)`
);
