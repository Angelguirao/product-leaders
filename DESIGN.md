---
version: alpha
name: Product Leaders Atlas
description: >
  Living map of how product teams operate. Editorial atlas — Fraunces display,
  Source Serif body, IBM Plex Mono for codes. Currently shares LifeOS Industrial
  color tokens (@angelguirao/personal-tokens) for zinc + amber; type is the brand.
  Not Holzen Nox. Not PersonalOS desk chrome.
colors:
  primary: "#18181B"
  background: "#FAFAFA"
  background-breathe: "#F4F4F5"
  foreground: "#18181B"
  muted: "#71717A"
  accent: "#D97706"
  accent-soft: "#FEF3C7"
  accent-strong: "#B45309"
  surface: "#FFFFFF"
  border: "#E4E4E7"
typography:
  display:
    fontFamily: Fraunces
    fontSize: 2rem
    fontWeight: 500
    letterSpacing: -0.02em
  body-md:
    fontFamily: Source Serif 4
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  mono:
    fontFamily: IBM Plex Mono
    fontSize: 0.8125rem
    fontWeight: 400
rounded:
  sm: 4px
  md: 8px
spacing:
  md: 16px
  lg: 24px
---

## Overview

**Editorial atlas / research map.** Product Leaders Atlas is a reading-and-comparison surface for how product orgs work — denser than a steward desk, warmer in type, cooler in chrome. Personality lives in **Fraunces** (display) + **Source Serif 4** (body) + **IBM Plex Mono** (codes, IDs). Color currently follows LifeOS Industrial zinc + rare amber via `@angelguirao/personal-tokens` so the site stays aligned with the post-cream personal stack without inventing a second palette.

This is **not** PersonalOS (no Space Grotesk desk chrome) and **not** Holzen Nox.

## Colors

Imported from personal-tokens until an Atlas-specific palette ADR exists.

- **Background / surface / border:** cool zinc family.
- **Accent:** amber-600 — sparse (brand italic span, focus, primary links).
- **Muted:** zinc-500 for nav and meta.

Do not reintroduce terracotta cream. Do not import Holzen blues.

## Typography

- **Display / brand:** Fraunces — optical serif, slight italic accent on brand mark is allowed.
- **Body:** Source Serif 4 — long-form reading.
- **Mono:** IBM Plex Mono — practice codes, slugs, technical labels.

Serif here is **atlas editorial**, not Claude cream-journal. Keep density map-like; avoid pill SaaS chrome.

## Layout

- Header: blur + hairline rule (`--map-rule`).
- Content: comfortable reading measure; comparison grids may go denser.
- Grain overlay ok at low opacity.

## Components

Astro site — no shadcn yet. Prefer semantic HTML + `src/styles/global.css`. If interactive islands need a kit later, init a local component set themed to these tokens; do not copy PersonalOS `components/ui` wholesale.

## Do's and Don'ts

**Do**

- Keep Fraunces + Source Serif as the Atlas signal.
- Treat amber as rare emphasis.
- Read this file before restyling atlas pages.

**Don't**

- Apply Holzen Nox or PersonalOS Space Grotesk desk chrome as the default atlas look.
- Cream `#f4efe6` / terracotta `#b85c38` / Cormorant stacks.
- Purple SaaS gradients.

## Figma

Deferred. When the atlas skin is stable: code→Figma reference, then Code Connect if components are published.

## Agent prompt guide

1. Portfolio map: `personal-agent/docs/DESIGN-SYSTEMS.md`.
2. Colors: personal-tokens industrial. Type: Fraunces / Source Serif / IBM Plex Mono.
3. If a mock looks like PersonalOS desk or Holzen dark app — wrong product.
