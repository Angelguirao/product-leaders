/**
 * Shared formatting for ownership bullets and practice keys.
 */

const PRACTICE_LABELS = {
  discovery: "Continuous / structured discovery",
  delivery: "Delivery & shipping model",
  org_shape: "Org design & team topology",
  roles: "Role boundaries (PM / design / eng)",
  metrics: "Metrics, rituals, operating cadence",
  ai_product: "AI in the product or workflow",
  enterprise: "Enterprise / B2B sales-led product",
  growth: "Growth, PMF, GTM",
  design: "Design systems & craft",
  leadership: "Product leadership & culture",
  founder: "Founder / early-stage product",
  platform: "Platform / infra product",
};

const PRACTICE_SHORT = {
  discovery: "Discovery",
  delivery: "Delivery",
  org_shape: "Org shape",
  roles: "Roles",
  metrics: "Metrics",
  ai_product: "AI product",
  enterprise: "Enterprise",
  growth: "Growth",
  design: "Design",
  leadership: "Leadership",
  founder: "Founder",
  platform: "Platform",
};

/** @param {string} line */
export function parseOwnershipLine(line) {
  const m = String(line || "").match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (m) return { label: m[1], text: m[2] };
  return { label: null, text: String(line || "") };
}

/**
 * Prefer Discovery / Prioritization / Shipping for steal teasers.
 * @param {string[] | undefined} ownership
 * @param {number} [limit]
 */
export function stealBullets(ownership, limit = 2) {
  const own = Array.isArray(ownership) ? ownership : [];
  if (!own.length) return [];
  const preferred = ["Discovery", "Prioritization", "Shipping"];
  const picked = [];
  for (const key of preferred) {
    const hit = own.find((b) => {
      const { label } = parseOwnershipLine(b);
      return label === key || String(b).includes(`**${key}`);
    });
    if (hit && !picked.includes(hit)) picked.push(hit);
  }
  for (const b of own) {
    if (picked.length >= limit) break;
    if (!picked.includes(b)) picked.push(b);
  }
  return picked.slice(0, limit).map(parseOwnershipLine);
}

/** @param {string} key */
export function practiceLabel(key) {
  return PRACTICE_LABELS[key] || key;
}

/** @param {string} key */
export function practiceShort(key) {
  return PRACTICE_SHORT[key] || key;
}

export function practiceLabels() {
  return { ...PRACTICE_LABELS };
}
