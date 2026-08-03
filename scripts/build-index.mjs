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
import { extractThesis, isGenericThesis } from "./quality.mjs";

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

function section(body, heading) {
  const re = new RegExp(
    `## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
    "i"
  );
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

function firstParagraph(text) {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("_") && !l.startsWith("```"));
  return lines[0] || "";
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
  // Keep first published thesis as company headline (later episodes stay linked)
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
    "  classDef company fill:#faf7f1,stroke:#2a2318,color:#2a2318",
    "  classDef practice fill:#e8c4b0,stroke:#b85c38,color:#2a2318",
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
