/**
 * Repair common LLM mermaid mistakes so diagrams still render.
 */
export function sanitizeMermaid(code) {
  let s = String(code || "").trim();
  if (!s) return s;

  // Prefer flowchart keyword
  s = s.replace(/^graph (TD|TB|LR|RL)/i, "flowchart $1");

  // Mindmap: strip leading list markers on lines
  if (/^\s*mindmap\b/im.test(s)) {
    s = s
      .split("\n")
      .map((line) => line.replace(/^(\s*)[-*+]\s+/, "$1"))
      .join("\n");
  }

  // Drop curly quotes that break parsers
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  return s;
}
