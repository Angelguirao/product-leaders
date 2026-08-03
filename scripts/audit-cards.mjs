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

for (const f of files) {
  const raw = readFileSync(join(episodesDir, f), "utf8");
  if (!/^status:\s*published/m.test(raw)) continue;
  const body = raw.replace(/^---[\s\S]*?---\n/, "");
  const thesis = extractThesis(body);
  const ownership = section(body, "Ownership");
  const context = section(body, "Context");
  const company = (raw.match(/^company:\s*"?(.*?)"?\s*$/m) || [])[1];
  const issues = [];
  if (!company || company === "null") issues.push("missing-company");
  if (isGenericThesis(thesis)) issues.push("generic-thesis");
  if (!ownership || ownership.length < 40) issues.push("thin-ownership");
  if (!context || context.length < 40) issues.push("thin-context");
  if (/^## \w[^\n]*[—–:]/.test(body)) issues.push("inline-heading");
  if (issues.length) {
    thin.push({ file: f, company, issues, thesis: (thesis || "").slice(0, 90) });
  }
}

console.log(`thin/suspicious published: ${thin.length}`);
for (const row of thin) console.log(JSON.stringify(row));
