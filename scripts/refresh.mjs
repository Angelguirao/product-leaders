#!/usr/bin/env node
/**
 * Daily refresh: catalog → process pending YouTube briefs → index.
 *
 * Usage:
 *   npm run refresh
 *   npm run refresh -- --limit 10
 *   PL_PROCESS_LIMIT=10 npm run refresh
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const limit =
  Number(
    process.argv.includes("--limit")
      ? process.argv[process.argv.indexOf("--limit") + 1]
      : process.env.PL_PROCESS_LIMIT || 8
  ) || 8;

function run(script, args = []) {
  console.log(`\n>>> node scripts/${script} ${args.join(" ")}`.trim());
  const r = spawnSync(
    process.execPath,
    [join(root, "scripts", script), ...args],
    {
      cwd: root,
      encoding: "utf8",
      stdio: "inherit",
      env: process.env,
    }
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("catalog.mjs");
run("process.mjs", ["--limit", String(limit)]);
run("build-index.mjs");

console.log("\nRefresh complete.");
