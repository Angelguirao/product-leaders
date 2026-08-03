#!/usr/bin/env node
/**
 * Load env for product-leaders without duplicating secrets.
 * Same shared-key pattern as aie-sessions.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const root = join(__dirname, "..");

const SHARED_KEYS = new Set([
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GROQ_API_KEY",
  "ELEVENLABS_API_KEY",
  "GEMINI_API_KEY",
]);

const SHARED_ENV_FILES = [
  join(root, "..", "brain", ".env"),
  join(root, "..", "aie-sessions", ".env"),
  join(root, "..", "personal-agent", "personalos", ".env.local"),
];

function parseEnvFile(path, { sharedOnly = false } = {}) {
  if (!existsSync(path)) return { path, loaded: [] };
  const loaded = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || m[1].startsWith("#")) continue;
    const key = m[1];
    if (sharedOnly && !SHARED_KEYS.has(key)) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!val) continue;
    if (!process.env[key]) {
      process.env[key] = val;
      loaded.push(key);
    }
  }
  return { path, loaded };
}

export function loadProjectEnv() {
  const sources = [];
  sources.push(parseEnvFile(join(root, ".env"), { sharedOnly: false }));
  for (const path of SHARED_ENV_FILES) {
    sources.push(parseEnvFile(path, { sharedOnly: true }));
  }
  return sources.filter((s) => s.loaded.length > 0);
}

export function hasLlmKey() {
  return Boolean(
    process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim()
  );
}

export function defaultBriefModel() {
  if (process.env.PL_BRIEF_MODEL?.trim()) return process.env.PL_BRIEF_MODEL.trim();
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    return "openrouter/google/gemini-2.5-flash-lite";
  }
  return "auto";
}
