# Product Leaders Atlas

A **public English product-org map** — how real teams run product, and how they disagree — seeded from [Entrevistas a Product Leaders](https://podcasters.spotify.com/pod/show/danidiestre) (Dani Diestre).

Promise: **see opposing operating bets, then steal the one that fits.** All published card content is English. Unofficial. Not affiliated. See [docs/LEGAL.md](docs/LEGAL.md).

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
| `/tensions` | Curated opposing bets — filter by craft, marketplace, GTM, data, content, industry |
| `/steal` | Random tension; optional `?theme=` lens + `?go=1` auto-draw |
| `/pole` | Five forced choices → your operating pole |
| `/gaps` | Held weak, unset craft, orgs argued only once |
| `/desk` | Printable debate sheet (tension axis + org cards) |
| `/compare` | Side-by-side thesis / loop / ownership; matched tensions surface |
| `/companies/:slug` | Thesis-first company card + opponents |
| `/tensions/:id` | One argument — ownership to steal, OG preview |
| `/practices` | Cross-company practice browse (compare prefilled) |
| `/browse` | All episode cards (shareable `?status=` / `?craft=` / `?q=`) |
| `/docs/how-to-read` | How to read a card |
| `/docs/about` | What this is + share links |

Live: [product-leaders-self.vercel.app](https://product-leaders-self.vercel.app)

**Daily refresh:** GitHub Actions runs `npm run refresh` (catalog → process pending → index). See [docs/CRON.md](docs/CRON.md).
