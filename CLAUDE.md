# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

Next.js **16.2.10** (App Router), React **19.2**, TypeScript (strict), Tailwind CSS **v4**. No test runner is configured. `@/*` is aliased to `src/*`.

> Next 16 differs from older Next.js. Per `AGENTS.md`, consult `node_modules/next/dist/docs/` (start at `01-app/`) before writing framework code — don't rely on training-data conventions.

## Commands

```bash
npm run dev      # next dev → http://localhost:3000
npm run build    # next build
npm run start    # serve the production build
npm run lint     # eslint (next/core-web-vitals + next/typescript)
```

## What this is

`riff` is a single-page interactive marketing/landing screen. The page is one very tall image (`public/main_desktop.png`, ~8000×22792) with an SVG overlay of clickable regions painted on top.

## Architecture

The whole app is the `/` route — there is no routing tree beyond `src/app/`.

- **`src/app/page.tsx` (Server Component)** reads `public/svg_main_screen.svg` from disk with `node:fs` at request time and regex-parses every `<path>` into a `Region[]` (`d`, `fill`, `fillOpacity`, `fillRule`). The regions are passed to the client overlay. Editing the clickable hotspots means editing that SVG, not the TSX.
- **`src/app/main-screen-overlay.tsx` (Client Component)** renders the parsed regions as an interactive `<svg viewBox="0 0 8000 22792">` layered absolutely over the image. It handles hover state and click, and paints a translucent number glyph inside each region (clipped to the region shape).
- **`src/app/main-screen-overlay-debug-panel.tsx`** is a dev-only fixed-position panel for nudging each number's position/scale; edits are written to `localStorage` under `main-screen-overlay:number-overrides`.

### Two things that will trip you up

1. **Flipped Y axis.** The source SVG uses a bottom-left origin, so the overlay wraps region paths in `translate(0, 22792) scale(1,-1)`. Any geometry math (bbox centers, label placement) must account for this flip — see how `cy = VIEWBOX_HEIGHT - (box.y + box.height/2)` is computed.
2. **Number glyphs are hardcoded vector paths**, not text. `NUMBER_GLYPHS` in `main-screen-overlay.tsx` holds one SVG path per digit (from the brand font outlines), and `INITIAL_OVERRIDES` holds hand-tuned `{dx, dy, scale}` per region. `localStorage` overrides (set via the debug panel) take precedence over `INITIAL_OVERRIDES`. Rendering text with a font was tried and abandoned (see the commented-out `<text>` block).

### Styling & fonts

Tailwind v4 is configured in CSS, not JS: `src/app/globals.css` uses `@import "tailwindcss"` + an `@theme` block. The brand font **mr-eaves-xl-modern** is loaded via a Typekit `<link>` in `layout.tsx` and set as `--font-sans`. There is no `tailwind.config.*`.

## State of the repo

Single "Initial commit"; the main-screen overlay work and mobile assets (`background-mobile.png`, `shapes-mobile.svg`, `public/numbers/`) are uncommitted work-in-progress. The overlay currently always shows the number glyphs (marked `TEMP` in code) for positioning; that is expected to change.
