# @angelguirao/personal-tokens

Cream / serif personal-surface tokens for **tbd**, **PersonalOS**, **AI-Native Product Building**, and **AIE Sessions**.

- Holzen uses `@holzen/design-tokens` (Nox) — do not mix.
- Contract: [`docs/PERSONAL-SURFACE-TOKENS.md`](../../docs/PERSONAL-SURFACE-TOKENS.md)
- ADR: [`personal-agent/docs/adrs/004-shared-personal-surface.md`](../../personal-agent/docs/adrs/004-shared-personal-surface.md)

## Exports

| Import | Contents |
|--------|----------|
| `@angelguirao/personal-tokens/tokens.css` | `:root` color, radius, shadow, type roles |
| `@angelguirao/personal-tokens/primitives.css` | grain, breathe, question-layers, desk chrome |

### Desk chrome classes

| Class | Use |
|-------|-----|
| `.personal-desk-panel` | Primary Today / desk card |
| `.personal-soft-panel` | Nested / secondary panel |
| `.personal-sheet` | Review modal / bottom sheet |
| `.personal-eyebrow` | Section labels (Orient, Experiment) |
| `.personal-display-title` | Italic display titles |
| `.personal-quiet` | Supporting body line |

## Sync

This folder is the **SSOT** in the meta-repo. Deployable copies live inside each app (Vercel roots). After editing here:

```bash
node scripts/sync-personal-tokens.mjs
```

## Fonts

Apps load Cormorant Garamond + Source Serif 4 via `next/font` and map them in local `@theme inline` to `--font-display` / `--font-body`.
