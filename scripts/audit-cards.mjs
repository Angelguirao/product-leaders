/**
 * Spot thin or contaminated published cards.
 * Usage: node scripts/audit-cards.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { section, extractThesis, isGenericThesis } from "./quality.mjs";

const episodesDir = join(process.cwd(), "episodes");
const files = readdirSync(episodesDir).filter((f) => f.endsWith(".md"));
const thin = [];
const published = [];

function tokens(s) {
  return new Set(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function jaccard(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

for (const f of files) {
  const raw = readFileSync(join(episodesDir, f), "utf8");
  if (!/^status:\s*published/m.test(raw)) continue;
  const body = raw.replace(/^---[\s\S]*?---\n/, "");
  const thesis = extractThesis(body);
  const ownership = section(body, "Ownership");
  const context = section(body, "Context");
  const company = (raw.match(/^company:\s*"?(.*?)"?\s*$/m) || [])[1];
  const slug = (raw.match(/^company_slug:\s*"?(.*?)"?\s*$/m) || [])[1];
  const issues = [];
  if (!company || company === "null") issues.push("missing-company");
  if (company && /former|ex-|svp of|head of product de/i.test(company)) {
    issues.push("mangled-company-name");
  }
  if (slug && slug.length > 40) issues.push("mangled-company-slug");
  if (isGenericThesis(thesis)) issues.push("generic-thesis");
  if (!ownership || ownership.length < 40) issues.push("thin-ownership");
  if (/Unknown/i.test(ownership || "") && (ownership.match(/Unknown/gi) || []).length >= 3) {
    issues.push("ownership-mostly-unknown");
  }
  if (!context || context.length < 40) issues.push("thin-context");
  if (/^## \w[^\n]*[—–:]/.test(body)) issues.push("inline-heading");
  published.push({ file: f, company, slug, thesis });
  if (issues.length) {
    thin.push({ file: f, company, issues, thesis: (thesis || "").slice(0, 90) });
  }
}

const nearDupes = [];
for (let i = 0; i < published.length; i++) {
  for (let j = i + 1; j < published.length; j++) {
    const score = jaccard(published[i].thesis, published[j].thesis);
    if (score >= 0.55) {
      nearDupes.push({
        a: published[i].company,
        b: published[j].company,
        score: Number(score.toFixed(2)),
        aThesis: (published[i].thesis || "").slice(0, 70),
        bThesis: (published[j].thesis || "").slice(0, 70),
      });
    }
  }
}

console.log(`thin/suspicious published: ${thin.length}`);
for (const row of thin) console.log(JSON.stringify(row));
console.log(`near-duplicate theses (>=0.55): ${nearDupes.length}`);
for (const row of nearDupes) console.log(JSON.stringify(row));
