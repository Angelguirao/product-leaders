# Daily refresh (cron)

The atlas stays current via GitHub Actions:

**Workflow:** [`.github/workflows/daily-refresh.yml`](../.github/workflows/daily-refresh.yml)  
**Schedule:** every day at **07:00 UTC**  
**Manual:** Actions → *Daily refresh* → Run workflow

## Pipeline

```
catalog → process (pending YouTube only) → index (incl. OG PNGs) → commit → push
```

Vercel deploys production from `main` after the push. `npm run index` emits PNG Open Graph images (1200×630) from the SVG templates so Slack / X / LinkedIn previews work.

Default cap: **8 new briefs per day** (`PL_PROCESS_LIMIT`). Raise via workflow input or repo variable.

## Required secret

In the GitHub repo → **Settings → Secrets and variables → Actions**:

| Name | Value |
|------|--------|
| `OPENROUTER_API_KEY` | Same key as brain / PersonalOS / aie-sessions |

Optional repo **variable**: `PL_BRIEF_MODEL` (defaults in code to OpenRouter Gemini flash-lite).

```bash
gh secret set OPENROUTER_API_KEY --repo Angelguirao/product-leaders --body "$OPENROUTER_API_KEY"
```

## Local equivalent

```bash
npm run refresh -- --limit 8
```

`process` prefers episodes missing a thesis / still stub or weak, so a small daily limit still catches new uploads.

## Cost / safety

- YouTube captions first; full extracts stay in gitignored `raw/`
- Public English cards only are committed
- Quality gate holds soft theses as `weak`
- Overlapping runs are serialized (`concurrency` group)
