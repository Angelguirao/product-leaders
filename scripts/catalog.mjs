#!/usr/bin/env node
/**
 * Catalog Entrevistas a Product Leaders from the Anchor/Spotify RSS feed.
 * Prefer RSS over yt-dlp (full history + works when yt-dlp is blocked).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "catalog");

const RSS_URL = "https://anchor.fm/s/ddca5200/podcast/rss";
const SHOW_URL = "https://podcasters.spotify.com/pod/show/danidiestre";
const YOUTUBE_CHANNEL = "https://www.youtube.com/@DaniDiestre";

function decodeXml(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripHtml(s) {
  return decodeXml(s)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  const re = new RegExp(
    `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>|<${name}(?:\\s[^>]*)?/>`,
    "i"
  );
  const m = block.match(re);
  return m ? decodeXml(m[1] || "") : "";
}

function attr(block, name, attrName) {
  const re = new RegExp(`<${name}[^>]*\\s${attrName}="([^"]+)"`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function youtubeFromText(text) {
  const hay = String(text || "");
  const patterns = [
    /https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})/,
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = hay.match(re);
    if (m) {
      return {
        id: m[1],
        url: `https://www.youtube.com/watch?v=${m[1]}`,
      };
    }
  }
  return { id: null, url: null };
}

function parseGuestCompany(title) {
  // Common shapes:
  //   Topic | Name, Role de Company
  //   "Quote" con Name, Role de Company
  const s = String(title || "").trim();
  const pipe = s.split("|").map((p) => p.trim());
  let right = pipe.length >= 2 ? pipe[pipe.length - 1] : s;

  const con = right.match(
    /\bcon\s+(.+?),\s*(.+?)\s+(?:de|en|at|@)\s+(.+)$/i
  );
  if (con) {
    return {
      guest: con[1].trim(),
      role: con[2].trim(),
      company: con[3].replace(/\.$/, "").trim(),
    };
  }

  const deMatch = right.match(
    /^(.+?),\s*(.+?)\s+(?:de|en|at|@)\s+(.+)$/i
  );
  if (deMatch) {
    return {
      guest: deMatch[1].trim(),
      role: deMatch[2].trim(),
      company: deMatch[3].replace(/\.$/, "").trim(),
    };
  }
  const comma = right.match(/^(.+?),\s*(.+)$/);
  if (comma && pipe.length >= 2) {
    return { guest: comma[1].trim(), role: comma[2].trim(), company: null };
  }
  return { guest: pipe.length >= 2 ? right : null, role: null, company: null };
}

function slugifyCompany(name) {
  if (!name) return null;
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || null;
}

console.log(`Fetching RSS… ${RSS_URL}`);
const res = await fetch(RSS_URL, {
  headers: { "User-Agent": "product-leaders-atlas/0.1 (+local)" },
});
if (!res.ok) {
  throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`);
}
const xml = await res.text();

// Note: some episode descriptions link a mismatched YouTube URL.
// Process trusts the extract + LLM company fields over the RSS title when they diverge.

const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
const seenYt = new Set();
const episodes = [];
for (let i = 0; i < itemBlocks.length; i++) {
  const block = itemBlocks[i];
  const title = tag(block, "title");
  const descriptionHtml = tag(block, "description") || tag(block, "content:encoded");
  const description = stripHtml(descriptionHtml);
  const guid = tag(block, "guid") || tag(block, "link") || `ep-${i}`;
  const link = tag(block, "link");
  const pubDate = tag(block, "pubDate");
  const duration = tag(block, "itunes:duration") || null;
  const audioUrl =
    attr(block, "enclosure", "url") ||
    attr(block, "media:content", "url") ||
    null;
  const yt = youtubeFromText(`${descriptionHtml}\n${description}\n${link}`);
  // One card per YouTube id — RSS sometimes repeats / mismatches titles
  if (yt.id) {
    if (seenYt.has(yt.id)) continue;
    seenYt.add(yt.id);
  }
  const parsed = parseGuestCompany(title);

  episodes.push({
    id: guid,
    guid,
    title,
    url: link || SHOW_URL,
    audio_url: audioUrl,
    youtube_id: yt.id,
    youtube_url: yt.url,
    pub_date: pubDate ? new Date(pubDate).toISOString() : null,
    duration,
    description: description.slice(0, 1200),
    guest_guess: parsed.guest,
    role_guess: parsed.role,
    company_guess: parsed.company,
    company_slug_guess: slugifyCompany(parsed.company),
    channel_index: i,
  });
}

mkdirSync(outDir, { recursive: true });
const catalog = {
  fetched_at: new Date().toISOString(),
  show: "Entrevistas a Product Leaders",
  host: "Dani Diestre",
  rss_url: RSS_URL,
  show_url: SHOW_URL,
  youtube_channel: YOUTUBE_CHANNEL,
  episode_count: episodes.length,
  with_youtube: episodes.filter((e) => e.youtube_id).length,
  episodes,
};

writeFileSync(join(outDir, "episodes.json"), JSON.stringify(catalog, null, 2));
writeFileSync(
  join(outDir, "episodes.md"),
  [
    `# Entrevistas a Product Leaders — catalog`,
    ``,
    `Fetched: ${catalog.fetched_at}`,
    `Episodes: ${episodes.length}`,
    `With YouTube link in description: ${catalog.with_youtube}`,
    ``,
    ...episodes.map((e, i) => {
      const watch = e.youtube_url || e.url;
      const company = e.company_guess ? ` — **${e.company_guess}**` : "";
      return `${i + 1}. [${e.title}](${watch})${company}`;
    }),
  ].join("\n")
);

console.log(
  `Wrote ${episodes.length} episodes (${catalog.with_youtube} with YouTube) → catalog/episodes.json`
);
