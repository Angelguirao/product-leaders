import craft from "../data/craft-lean.json";

export function craftFor(slug) {
  const row = craft.leans?.[slug];
  if (!row?.lean) return null;
  const label = craft._meta?.labels?.[row.lean] || row.lean;
  return { lean: row.lean, note: row.note || "", label };
}

export function craftLabels() {
  return craft._meta?.labels || {};
}

export function craftBlurb() {
  return craft._meta?.blurb || "";
}

export function craftShort(lean) {
  const map = {
    product_engineering: "Eng craft",
    pm_craft: "PM craft",
    design_led: "Design-led",
    founder_led: "Founder",
  };
  return map[lean] || lean;
}
