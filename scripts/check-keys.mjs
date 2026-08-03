#!/usr/bin/env node
import { loadProjectEnv, hasLlmKey, defaultBriefModel } from "./load-env.mjs";

const sources = loadProjectEnv();

const keys = [
  ["OPENROUTER_API_KEY", "preferred — shared with brain/aie-sessions"],
  ["OPENAI_API_KEY", "summaries + transcription"],
  ["GROQ_API_KEY", "cheap transcription fallback"],
  ["ELEVENLABS_API_KEY", "speaker diarization"],
  ["ANTHROPIC_API_KEY", "optional Claude summaries"],
  ["GEMINI_API_KEY", "optional Gemini summaries"],
];

for (const [name, why] of keys) {
  const present = Boolean(process.env[name]?.trim());
  console.log(`${present ? "OK " : "MISSING"}  ${name}  — ${why}`);
}

if (sources.length) {
  console.log("\nLoaded shared keys from:");
  for (const s of sources) {
    const short = s.path.replace(/\\/g, "/").split("/projects/").pop() || s.path;
    console.log(`  ${short} → ${s.loaded.join(", ")}`);
  }
}

console.log("");
if (!hasLlmKey()) {
  console.log("No LLM key found. Keep OpenRouter in brain/.env — scripts auto-load it.");
  process.exitCode = 1;
} else {
  console.log(`LLM ready. Default brief model: ${defaultBriefModel()}`);
  console.log("Run: npm run process -- --limit 3");
}
