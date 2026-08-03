/**
 * Quality gate for public Spanish product-org cards.
 */

export function section(body, heading) {
  // Accept "## Context\n..." and legacy "## Context — inline..."
  const re = new RegExp(
    `## ${heading}\\s*(?:[—–:]\\s*([^\\n]+)\\n?|\\n)([\\s\\S]*?)(?=\\n## |$)`,
    "i"
  );
  const m = String(body || "").match(re);
  if (!m) return "";
  const inline = (m[1] || "").trim();
  const rest = (m[2] || "").trim();
  return [inline, rest].filter(Boolean).join("\n\n");
}

export function firstParagraph(text) {
  const lines = String(text || "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !l.startsWith("_") &&
        !l.startsWith("```") &&
        !l.startsWith("#") &&
        !l.startsWith("```")
    );
  return lines[0] || "";
}

export function isGenericThesis(thesis) {
  const t = String(thesis || "").toLowerCase();
  if (t.length < 40) return true;
  const banned = [
    /continuous (learning|improvement)/,
    /adapting to (company )?growth/,
    /aligning product/,
    /customer-?centric/,
    /data-?driven/,
    /importance of (culture|collaboration|communication)/,
    /evolving (product|growth) strateg/,
    /best practices/,
    /unique challenges and opportunities/,
    /\bdiscusses\b/,
    /\bhighlights the\b/,
    /\bemphasizes the importance\b/,
    /^[a-z].*\bis a (fintech|company|platform|marketplace|solution)/,
    /struggled to find product/,
  ];
  return banned.some((re) => re.test(t));
}

export function extractThesis(body) {
  return firstParagraph(
    section(body, "Thesis") || section(body, "Snapshot")
  );
}

/**
 * @returns {'published'|'weak'|'stub'}
 */
export function gateStatus(metaExtra, body) {
  if (/Diagram pending|Brief pending|Interview not briefed yet|_Pending_/.test(body)) {
    return "stub";
  }
  const pub = metaExtra?.publishable;
  if (pub === "no" || pub === false || pub === "false") return "weak";
  const thesis = extractThesis(body);
  if (isGenericThesis(thesis)) return "weak";
  return "published";
}
