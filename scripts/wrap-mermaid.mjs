#!/usr/bin/env node
/** One-shot: wrap bare mermaid blocks in existing episode markdown. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeMermaid } from "./sanitize-mermaid.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "episodes");

function wrap(body) {
  let out = body;
  const heads = "Product workflow|Roles & org|Roles & Org|Practice map";
  for (const kind of ["flowchart", "mindmap", "graph (?:TD|TB|LR|RL)"]) {
    const re = new RegExp(
      `(## (?:${heads})\\s*\\n)(?!\`\`\`)(${kind}[\\s\\S]*?)(?=\\n## |\\n*$)`,
      "gi"
    );
    out = out.replace(
      re,
      (_, heading, code) =>
        `${heading}\`\`\`mermaid\n${sanitizeMermaid(code)}\n\`\`\`\n`
    );
  }
  return out;
}

let n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".md"))) {
  const path = join(dir, f);
  const raw = readFileSync(path, "utf8");
  const next = wrap(raw);
  if (next !== raw) {
    writeFileSync(path, next);
    n++;
    console.log("wrapped", f);
  }
}
console.log(`done — ${n} files updated`);
