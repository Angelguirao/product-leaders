import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(
  readFileSync(join(root, "catalog", "episodes.json"), "utf8")
);
const done = new Set();
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
  if (id && id !== "null") done.add(id);
}

const pending = catalog.episodes.filter(
  (e) => e.youtube_id && !done.has(e.youtube_id)
);
console.log(`done yt ${done.size} · pending yt ${pending.length}`);
pending.slice(0, 15).forEach((e, i) => {
  console.log(
    `${i} ${e.youtube_id} ${(e.company_guess || "-").slice(0, 18)} ${e.title.slice(0, 55)}`
  );
});
