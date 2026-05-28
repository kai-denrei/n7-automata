---
role: ux
owner: Gerald
status: active
last-updated: 2026-05-28
---

# UX / Visual Design

## Scope
The "to look at" surface: legibility of elements, the legend/chip interactions,
the population history strip, and the in-UI surfacing of the math (subset
classification, and the proposed M2 tournament-wheel diagram).

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-28 | Palette swap must never change who-beats-whom | Skin and rules are orthogonal; lore reads via name→index ordering, not edge changes. | [[arch]] |
| 2026-05-28 | Tournament wheel placed to the RIGHT of the grid (flex row, 190×190, stacks below the grid under 560px), not above/below. Nodes on a circle starting at top going clockwise; directed arrows for all 21 edges; node fill = palette color, glyph centered; deactivated nodes+edges dim, active cyclic-triple nodes+edges highlighted white. | Side placement keeps the wheel adjacent to the legend/map without pushing the history strip below the fold; it reads as a compact "key" to the map. Arrows (not plain lines) make direction legible — the doubly-regular structure is the headline thing to see. White highlight for the cyclic triple stands out against any palette. Edges are read live from `tournament.preyOf` (never hard-coded), so it stays correct if N/skipSet change. Rejected: overlaying the wheel on the grid corner (occludes cells); a separate row below the controls (too far from the map to read as a key). | [[dev]] |
| 2026-05-28 | Per-element strength controls are always-visible inline buttons on each chip (−/⊘/+) with a colour-coded bias readout (green +, red −, dim 0), not a click-popover. Buttons stopPropagation so the chip body still picks the brush; ⊘ duplicates the right-click on/off toggle, making it discoverable. | Always-visible beats a popover for the stated goal (rapid tweaking to watch a takeover live). Inline keeps the control next to the count/relations already on the chip; colour-coding makes the perturbed elements scannable at a glance. | [[dev]] |
| 2026-05-28 | Tab bar (Regular hex / Organic · Stålberg). The Organic view breaks out wider (min(96vw, 1200px)) for a much bigger board; controls are a compact strip + a compact chip legend. Cells render as rounded Townscaper polygons (fill = element colour) over a faint quad-grid underlay. | Operator asked for a new tab, much bigger board, smaller controls. The breakout leaves Tab 1's 720px layout untouched while the organic board uses the viewport width. | [[dev]], [[arch]] |
| 2026-05-28 | Organic is the LANDING tab (regular-hex still available; `#hex` opens it). It opens as a 2-colour board (Fire vs Water) on the Stochastic rule with Auto engaged, and the dominance wheel is overlaid in the top-right corner of the board (the hexagon leaves that corner empty; `pointer-events:none` so painting works under it). | Best first impression: a living, self-running cascade, not a static full-random board. Two colours + Auto demonstrates the introduce-antagonist mechanic immediately; the wheel makes the dominance structure legible at a glance. | [[dev]] |
| 2026-05-28 | Adopted the 01-kai-meta "VFD" design language as the look & feel: teal (#1bf0c8) vacuum-fluorescent on CRT-black — glowing teal pills/labels/tabs, scanline panels, halo-bordered canvases, mono uppercase tracked type. The organic landing gets a hero 7-segment dominance-% counter + a braille bar; every element chip (both tabs) carries a live braille share-bar. | Operator asked to match that dashboard. Element palette colours are untouched — only the chrome went teal. Jersey 25 (kai-meta's display font) was skipped to stay dependency-free/offline; the mono stack + teal glow carries the vibe and the 7-seg is canvas-drawn so it's exact regardless of fonts. | [[dev]] |
| 2026-05-28 | ROYGBIV is the DEFAULT palette, recoloured to faded/dusty retro tones (desaturated hues) to sit on the VFD ground. Board cells are no longer flat fills: each is drawn at its own brightness (cellGlow jitter) with a soft bloom halo, so they read as individually-lit VFD elements. | Operator wanted a faded retro feel and less-uniform, "7-seg-like" cells. Brightness-via-alpha + a one-pass bloom keeps it cheap at thousands of cells/frame (no per-cell shadowBlur). Element palette is still swappable (Wuxing/alchemical remain). | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [x] M2 proposes a 7-node wheel diagram with directed edges, highlighting the active subset + any cyclic triple. This is the single highest-value "interesting to look at" addition (it makes the doubly-regular structure visible). Include in V1? — owner: Gerald — since: 2026-05-28 — RESOLVED 2026-05-28: built `src/wheel.js`, placed right of the grid. 7 nodes + 21 directed edges, palette-colored, DPR-crisp; dims toggled-off elements; highlights an active cyclic triple. Visual correctness is Gerald's call in localhost.
- [ ] Does the current Wuxing index ordering make the {1,2,4}-mod-7 edges read sensibly ("Water beats Fire"), or do they look arbitrary without the lore-fit search? — owner: Gerald — since: 2026-05-28 — NOTE: the wheel now makes this directly inspectable (arrows show every dominance edge against the colored/glyphed nodes), but the lore-fit search itself is out of V1 scope.

## Assumptions
- The current UI (legend chips with hover ▲/▼ relations, population history strip, status line classifier) is already a reasonable "look at" surface; V1 polish is additive, not a redesign. — status: untested — since: 2026-05-28

## Dependencies
Blocked by: [[dev]]
Feeds into:

## Session Log
2026-05-28 — Further vertical compaction: title + "+" on one line (title = STÅLBERG QUAD GRID RPS-7), reduced VFD-hero padding/height, "%" beside the dial number, no emoji in the status note.
2026-05-28 — Compacted the organic UI: description collapsed behind a "+", one-line non-wrapping chips (no count/braille), ‹/› steppers instead of sliders. Verified via headless screenshot.
2026-05-28 — Defaulted to a faded retro ROYGBIV palette; gave board cells per-cell brightness jitter + a bloom halo (lit VFD look, less uniform). Both tabs verified via headless screenshot.
2026-05-28 — Reskinned to the kai-meta VFD aesthetic (teal-on-black, glowing pills, scanline panels, halo canvases). Added a 7-seg dominance-% counter to the organic landing and braille share-bars to every element chip. Both tabs verified via headless screenshot.
2026-05-28 — Made Organic the landing tab with a 2-colour (Fire/Water) Stochastic + Auto start; re-added the dominance wheel overlaid top-right of the board. Headless screenshot confirms it lands mid-cascade (Auto introduced a predator) with the wheel rendering.
2026-05-28 — Added the Organic tab: tab bar + wide breakout board + compact controls/legend; rounded dual cells over a faint quad grid. Verified visually via headless screenshot (renders correctly). Feel/tuning pending Gerald's look.
2026-05-28 — Added −/⊘/+ strength controls + colour-coded bias readout to each legend chip; updated the hint text to explain the lever and the threshold-vs-stochastic difference. Visual feel pending Gerald's look.
2026-05-28 — V1 build. Wheel diagram shipped (right of grid, DPR-crisp, palette-driven, dims/highlights). Added a seed readout + Re-run/New-seed buttons in the controls row and extended the status line with winner/period. Layout is additive; visual feel pending Gerald's look.
2026-05-28 — Init. Flagged the M2 wheel diagram as the top "to look at" candidate and the lore-readability question.
