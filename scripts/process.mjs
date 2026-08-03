#!/usr/bin/env node
/**
 * Process podcast episodes → public English product-org cards (thesis-first).
 *
 * Usage:
 *   npm run process -- --limit 3
 *   npm run process -- --id YOUTUBE_ID
 *   npm run process -- --from-raw --limit 20
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import {
  defaultBriefModel,
  hasLlmKey,
  loadProjectEnv,
  root,
} from "./load-env.mjs";
import { sanitizeMermaid } from "./sanitize-mermaid.mjs";
import { gateStatus } from "./quality.mjs";

loadProjectEnv();

const args = parseArgs(process.argv.slice(2));
const catalogPath = join(root, "catalog", "episodes.json");

if (!existsSync(catalogPath)) {
  console.error("Run npm run catalog first");
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
let queue = catalog.episodes || [];

mkdirSync(join(root, "raw"), { recursive: true });
mkdirSync(join(root, "episodes"), { recursive: true });

const doneSlugs = new Set(
  readdirSync(join(root, "episodes"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
);

const doneYt = new Set();
for (const f of readdirSync(join(root, "episodes")).filter((x) =>
  x.endsWith(".md")
)) {
  const t = readFileSync(join(root, "episodes", f), "utf8");
  const m = t.match(/^youtube_id:\s*(.*)$/m);
  if (!m) continue;
  let id = m[1].trim();
  if (
    (id.startsWith('"') && id.endsWith('"')) ||
    (id.startsWith("'") && id.endsWith("'"))
  ) {
    id = id.slice(1, -1);
  }
  if (id && id !== "null") doneYt.add(id);
}

const done = doneSlugs;

if (args.id) {
  const needle = String(args.id);
  queue = queue.filter(
    (e) =>
      e.id === needle ||
      e.guid === needle ||
      e.youtube_id === needle ||
      slugify(e.title, e.youtube_id || e.id) === needle
  );
  const byYt = new Map();
  for (const e of queue) {
    const key = e.youtube_id || e.id;
    if (!byYt.has(key)) byYt.set(key, e);
  }
  queue = [...byYt.values()];
  if (args.fromRaw) args.force = true;
} else if (args.fromRaw) {
  queue = queue.filter((e) => {
    const idKey = e.youtube_id || stableId(e.id);
    return existsSync(join(root, "raw", `${idKey}.md`));
  });
  const byYt = new Map();
  for (const e of queue) {
    const key = e.youtube_id || e.id;
    if (!byYt.has(key)) byYt.set(key, e);
  }
  queue = [...byYt.values()];

  // Prefer cards that are not yet thesis-first (or are stub/weak)
  if (!args.forceAll) {
    const needs = [];
    const rest = [];
    for (const e of queue) {
      const idKey = e.youtube_id || stableId(e.id);
      const slug = slugify(e.title, idKey);
      // any episode file for this youtube id
      let body = "";
      let status = "";
      for (const f of readdirSync(join(root, "episodes")).filter((x) =>
        x.endsWith(".md")
      )) {
        const t = readFileSync(join(root, "episodes", f), "utf8");
        if (t.includes(`youtube_id: "${idKey}"`) || t.includes(`youtube_id: ${idKey}`)) {
          body = t;
          status = (t.match(/^status:\s*(.*)$/m) || [])[1] || "";
          break;
        }
      }
      const needsWork =
        !body ||
        !/^## Thesis/m.test(body) ||
        status === "stub" ||
        status === "weak" ||
        status === "briefed";
      if (needsWork) needs.push(e);
      else rest.push(e);
    }
    queue = [...needs, ...rest];
    console.log(`from-raw needing rewrite: ${needs.length} / ${needs.length + rest.length}`);
  } else {
    console.log(`from-raw candidates: ${queue.length}`);
  }
  args.force = true;
  queue = queue.slice(0, args.limit ?? queue.length);
} else {
  if (!args.audio) {
    const ytOnly = queue.filter((e) => e.youtube_id);
    console.log(`youtube-backed: ${ytOnly.length} / ${queue.length}`);
    queue = ytOnly;
  }
  if (!args.force) {
    const pending = queue.filter((e) => {
      const slug = slugify(e.title, e.youtube_id || stableId(e.id));
      if (done.has(slug)) return false;
      if (e.youtube_id && doneYt.has(e.youtube_id)) return false;
      return true;
    });
    console.log(`pending briefs: ${pending.length} / ${queue.length}`);
    queue = pending.slice(0, args.limit ?? 3);
  } else {
    queue = queue.slice(0, args.limit ?? 3);
  }
}

if (!queue.length) {
  console.log("Nothing to process.");
  process.exit(0);
}

const practicesYaml = readFileSync(join(root, "practices.yaml"), "utf8");

for (const episode of queue) {
  const idKey = episode.youtube_id || stableId(episode.id);
  let slug = slugify(episode.title, idKey);

  // Prefer existing episode filename for this YouTube id (avoid RSS title twins)
  for (const f of readdirSync(join(root, "episodes")).filter((x) =>
    x.endsWith(".md")
  )) {
    const t = readFileSync(join(root, "episodes", f), "utf8");
    if (
      t.includes(`youtube_id: "${idKey}"`) ||
      t.includes(`youtube_id: ${idKey}`)
    ) {
      slug = f.replace(/\.md$/, "");
      break;
    }
  }

  if (done.has(slug) && !args.force) {
    console.log(`skip (exists): ${slug}`);
    continue;
  }

  const sourceUrl = episode.youtube_url || episode.audio_url || episode.url;
  console.log(`\n=== ${episode.title}`);
  console.log(sourceUrl);

  const rawPath = join(root, "raw", `${idKey}.md`);
  let extractOut = "";

  if (args.fromRaw && existsSync(rawPath)) {
    extractOut = readFileSync(rawPath, "utf8");
    console.log(`using local raw ${rawPath} (${extractOut.length} chars)`);
  } else {
    if (!sourceUrl) {
      console.error(`no media URL for ${episode.id}`);
      continue;
    }

    const extractArgs = [sourceUrl, "--extract", "--format", "md"];
    if (args.diarize) {
      extractArgs.push("--diarize");
      if (process.env.ELEVENLABS_API_KEY) extractArgs.push("elevenlabs");
      extractArgs.push("--identify-speakers", "--timestamps");
    }

    const extract = runSummarize(extractArgs);
    extractOut = String(extract.stdout ?? "");
    const extractErr = String(extract.stderr ?? "");
    if (extract.error || extract.status !== 0 || !extractOut.trim()) {
      const detail =
        extract.error?.message || extractErr || extractOut || "unknown error";
      console.error(`extract failed for ${idKey}:`, detail.slice(0, 1500));
      writeFileSync(join(root, "raw", `${idKey}.error.txt`), detail);
      continue;
    }

    writeFileSync(rawPath, extractOut);
    console.log(
      `wrote local ${rawPath} (${extractOut.length} chars) — not committed`
    );
  }

  const prompt = buildOperatingModelPrompt(episode, practicesYaml, extractOut);
  const llmReady = hasLlmKey();
  const model = args.model || defaultBriefModel();

  let body;
  let metaExtra = {};
  if (!llmReady) {
    console.warn("no LLM key — writing public stub");
    body = publicStub(episode);
  } else {
    console.log(`briefing with model ${model}`);
    const summary = runSummarize(
      ["-", "--length", "long", "--format", "md", "--model", model],
      prompt
    );
    const summaryOut = String(summary.stdout ?? "").trim();
    const echoed =
      summaryOut.includes("You are writing a PUBLIC company card") ||
      summaryOut.includes("Practice taxonomy:");
    if (!summary.error && summary.status === 0 && summaryOut && !echoed) {
      const parsed = splitMetaAndBody(summaryOut);
      body = sanitizeBriefMermaid(parsed.body).replace(/&amp;/g, "&");
      metaExtra = parsed.meta;
    } else {
      console.warn(
        "brief failed; writing stub:",
        (summary.error?.message || String(summary.stderr ?? "")).slice(0, 300)
      );
      body = publicStub(episode);
    }
  }

  const guest = metaExtra.guest || episode.guest_guess || null;
  const role = metaExtra.role || episode.role_guess || null;
  const company = metaExtra.company || episode.company_guess || null;
  const companySlug =
    metaExtra.company_slug ||
    episode.company_slug_guess ||
    (company ? slugifyCompany(company) : null);
  let practices = Array.isArray(metaExtra.practices)
    ? metaExtra.practices
    : typeof metaExtra.practices === "string"
      ? metaExtra.practices.split(/[,\s]+/).filter(Boolean)
      : [];
  if (!practices.length) {
    practices = tagPractices(`${episode.title}\n${body}`);
  }
  const stage = metaExtra.stage || inferStage(`${episode.title}\n${body}`);
  const status = gateStatus(metaExtra, body);
  console.log(`status: ${status}`);

  const episodePath = join(root, "episodes", `${slug}.md`);
  writeFileSync(
    episodePath,
    [
      `---`,
      `title: ${yamlQuote(episode.title)}`,
      `youtube_id: ${yamlQuote(episode.youtube_id)}`,
      `url: ${yamlQuote(episode.youtube_url || episode.url)}`,
      `audio_url: ${yamlQuote(episode.audio_url)}`,
      `pub_date: ${yamlQuote(episode.pub_date)}`,
      `guest: ${yamlQuote(guest)}`,
      `role: ${yamlQuote(role)}`,
      `company: ${yamlQuote(company)}`,
      `company_slug: ${yamlQuote(companySlug)}`,
      `stage: ${yamlQuote(stage)}`,
      `practices: [${practices.map(yamlQuote).join(", ")}]`,
      `status: ${status}`,
      `processed_at: ${new Date().toISOString()}`,
      `---`,
      ``,
      body.trim(),
      ``,
      `## Listen`,
      ``,
      episode.youtube_url
        ? `- YouTube: [${episode.title}](${episode.youtube_url})`
        : null,
      episode.audio_url ? `- Audio: [episode audio](${episode.audio_url})` : null,
      `- Show: [Entrevistas a Product Leaders](${catalog.show_url})`,
      `- Host: [Dani Diestre](${catalog.youtube_channel})`,
      ``,
      `_Unofficial community note. Episode © host / guests. See [docs/LEGAL.md](../docs/LEGAL.md)._`,
      ``,
    ]
      .filter((line) => line !== null)
      .join("\n")
  );
  console.log(`wrote ${episodePath}`);
  done.add(slug);
  if (episode.youtube_id) doneYt.add(episode.youtube_id);
}

function parseArgs(argv) {
  const out = {
    limit: 3,
    diarize: false,
    force: false,
    audio: false,
    fromRaw: false,
    forceAll: false,
    id: null,
    model: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--diarize") out.diarize = true;
    else if (a === "--force") out.force = true;
    else if (a === "--audio") out.audio = true;
    else if (a === "--from-raw") out.fromRaw = true;
    else if (a === "--force-all") out.forceAll = true;
    else if (a === "--id") out.id = argv[++i];
    else if (a === "--model") out.model = argv[++i];
  }
  return out;
}

function runSummarize(args, stdinText) {
  const cli = join(
    process.env.APPDATA || "",
    "npm",
    "node_modules",
    "@steipete",
    "summarize",
    "dist",
    "cli.js"
  );
  const useGlobalCli = process.platform === "win32" && existsSync(cli);
  if (useGlobalCli) {
    return spawnSync(process.execPath, [cli, ...args], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      input: stdinText,
      env: process.env,
      windowsHide: true,
    });
  }
  return spawnSync("summarize", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    input: stdinText,
    env: process.env,
    shell: process.platform === "win32",
    windowsHide: true,
  });
}

function stableId(guid) {
  return String(guid || "ep")
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-24);
}

function slugify(title, id) {
  const base = String(title || id)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
  return `${base || "episode"}-${id}`;
}

function slugifyCompany(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function yamlQuote(s) {
  if (s === null || s === undefined || s === "") return "null";
  return JSON.stringify(String(s));
}

function splitMetaAndBody(text) {
  const m = text.match(/```ya?ml\s*([\s\S]*?)```\s*([\s\S]*)$/i);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[kv[1]] = [...val.matchAll(/["']?([^"',\[\]]+)["']?/g)]
        .map((x) => x[1].trim())
        .filter(Boolean);
    } else if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      meta[kv[1]] = val.slice(1, -1);
    } else if (val === "null" || val === "~") {
      meta[kv[1]] = null;
    } else {
      meta[kv[1]] = val;
    }
  }
  return { meta, body: m[2].trim() };
}

function buildOperatingModelPrompt(episode, practicesYaml, extract) {
  const clipped =
    extract.length > 120_000
      ? extract.slice(0, 120_000) + "\n\n[truncated]"
      : extract;
  return `You are writing a PUBLIC company card for an English-language product-org map.

Goal: a stranger must distinguish THIS company from two peers in 20 seconds.
Source: Entrevistas a Product Leaders (Dani Diestre). Write ALL sections in English only — never Spanish. Do not invent facts.
If extract guest/company disagree with the RSS title guess, trust the extract.
RSS titles are often wrong or clickbait — never invent a company from the title alone.
If the extract clearly names an employer (e.g. Real Madrid) and the title names a different brand, use the extract's employer.

Practice taxonomy (pick 2-4 that truly fit):
\`\`\`yaml
${practicesYaml}
\`\`\`

Episode: ${episode.title}
URL: ${episode.youtube_url || episode.url}
Guess — guest: ${episode.guest_guess || "?"} · role: ${episode.role_guess || "?"} · company: ${episode.company_guess || "?"}

FIRST a YAML fence:
guest, role, company, company_slug (kebab-case ASCII), stage (early|growth|scale|enterprise|agency|other),
practices (taxonomy keys), publishable (yes|no)

Set publishable: no if the interview lacks a distinctive product-operating signal.

Example:
\`\`\`yaml
guest: Ada Lovelace
role: Head of Product
company: ExampleCo
company_slug: exampleco
stage: growth
practices: [discovery, delivery]
publishable: yes
\`\`\`

THEN Markdown with ONLY these sections:

1. ## Thesis — ONE sentence naming a specific operating choice. FORBIDDEN generics: continuous improvement, aligning teams, adapting to growth, customer-centric, data-driven, importance of culture.

2. ## Context — 1-2 sentences: what they sell, stage/market. No biography padding.

3. ## Operating loop — Prefer ONE \`\`\`mermaid flowchart TD\`\`\` with 4-7 CONCRETE nodes from the interview. If you cannot name concrete nodes, use 4-7 bullets instead — never a generic Discovery→Build→Ship skeleton.

4. ## Ownership — bullets: who owns discovery / prioritization / shipping / sales-input / design (only what the interview supports). Mark unknowns.

5. ## Evidence — 1-2 short attributed quotes.

6. ## Gaps — 1-3 bullets on what the interview does NOT say about how they run product.

Quality bar: if Thesis could apply to almost any SaaS company, rewrite it or set publishable: no.

--- EXTRACT ---
${clipped}
`;
}

function sanitizeBriefMermaid(body) {
  let out = String(body || "").replace(
    /```mermaid\s*([\s\S]*?)```/gi,
    (_, code) => "```mermaid\n" + sanitizeMermaid(code) + "\n```"
  );
  const heads =
    "Operating loop|Product workflow|Roles & org|Roles & Org|Practice map";
  for (const kind of ["flowchart", "graph (?:TD|TB|LR|RL)"]) {
    out = out.replace(
      new RegExp(
        `(## (?:${heads})\\s*\\n)(?!\`\`\`)(${kind}[\\s\\S]*?)(?=\\n## |\\n*$)`,
        "gi"
      ),
      (_, heading, code) =>
        `${heading}\`\`\`mermaid\n${sanitizeMermaid(code)}\n\`\`\`\n`
    );
  }
  return out;
}

function tagPractices(text) {
  const hay = String(text || "").toLowerCase();
  const rules = [
    ["enterprise", /enterprise|b2b|grandes empresas|legacy/],
    ["ai_product", /\bai\b|\bia\b|llm|agente|prototip/],
    ["discovery", /discovery|research|validaci[oó]n|hip[oó]tesis/],
    ["delivery", /roadmap|sprint|prioriz|ship|delivery|ciclo/],
    ["org_shape", /squad|tribu|equipo de producto|org /],
    ["roles", /product manager|head of product|product engineer|cpo|diseñador/],
    ["metrics", /okr|kpi|north star|m[eé]trica|ritual/],
    ["growth", /growth|pmf|product market fit|retenci[oó]n/],
    ["design", /design system|diseño|ux\b/],
    ["leadership", /cultura|liderazgo|coaching/],
    ["founder", /founder|fundador|startup/],
    ["platform", /platform|plataforma|api\b|infra/],
  ];
  return rules
    .filter(([, re]) => re.test(hay))
    .map(([k]) => k)
    .slice(0, 4);
}

function inferStage(text) {
  const hay = String(text || "").toLowerCase();
  if (/enterprise|40.?year|grandes empresas/.test(hay)) return "enterprise";
  if (/scale.?up|serie [bc]|unicorn/.test(hay)) return "scale";
  if (/growth|serie a|product market fit/.test(hay)) return "growth";
  if (/early|seed|pre.?seed|fundador|from scratch/.test(hay)) return "early";
  return null;
}

function publicStub(episode) {
  return [
    `## Thesis`,
    ``,
    `_Card pending — re-run with LLM key:_`,
    ``,
    `\`\`\`bash`,
    `npm run process -- --id ${episode.youtube_id || episode.id} --from-raw --force`,
    `\`\`\``,
    ``,
    `## Context`,
    ``,
    `Guess: ${episode.guest_guess || "?"} · ${episode.role_guess || "?"} · ${episode.company_guess || "?"}`,
    ``,
    `## Operating loop`,
    ``,
    `- _Pending_`,
    ``,
    `## Ownership`,
    ``,
    `- _Pending_`,
    ``,
    `## Evidence`,
    ``,
    `- _None yet_`,
    ``,
    `## Gaps`,
    ``,
    `- Brief not generated yet`,
  ].join("\n");
}
