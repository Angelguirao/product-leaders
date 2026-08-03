# Product Leaders Atlas

A **public English product-org map** — how real teams run product (thesis, loop, ownership) — seeded from [Entrevistas a Product Leaders](https://podcasters.spotify.com/pod/show/danidiestre) (Dani Diestre).

All published card content is English. Unofficial. Not affiliated. See [docs/LEGAL.md](docs/LEGAL.md).

## What a card is

| Field | Rule |
|-------|------|
| **Thesis** | One specific operating choice. Generics fail the gate. |
| **Context** | What they sell / stage |
| **Operating loop** | Concrete steps (diagram or bullets) |
| **Ownership** | Who decides what |
| **Evidence** | 1–2 short quotes + source link |
| **Gaps** | What the interview doesn’t cover |

Only `status: published` cards appear on the public map. `weak` / `stub` stay in git for rework.

## Pipeline

```
RSS catalog → extract (raw/) → thesis-first brief (English) → index → Astro site
```

```bash
npm install
npm run catalog
npm run process -- --limit 3          # new YouTube episodes
npm run rebrief -- --limit 20         # rewrite from local raw/
npm run dev
```

## Site

| Path | What |
|------|------|
| `/` | Org map by stage + practice graph (filters + clickable nodes) |
| `/compare` | Side-by-side thesis / loop / ownership for 2–3 orgs |
| `/companies/:slug` | Thesis-first company card |
| `/practices` | Cross-company practice browse |
| `/browse` | All episode cards (incl. weak) |

Live: [product-leaders-self.vercel.app](https://product-leaders-self.vercel.app)
