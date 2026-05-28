---
role: dev
owner: Gerald
status: active
last-updated: 2026-05-28
---

# Development

## Scope
Implementation of the CA engine, rendering, UI wiring, and the V1 feature
increments (M1 essentials, M2 diagnostics).

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-28 | Start condition is full random fill, not sparse seeding | Verified gotcha: an isolated cell never gives a neighbor enough matching neighbors to cross the threshold, so the board freezes. Full fill gives live fronts from frame 1. | [[qa]] |
| 2026-05-28 | Retina crispness: keep the canvas HTML attributes as the LOGICAL size, derive cols/rows from those, then inflate the backing store to logical×dpr and `ctx.setTransform(dpr,…)`. Grid CSS size left at `width:100%` (NOT pinned inline); hist same; wheel pins its own CSS box. | Computing cols/rows from the scaled backing store would silently change the cell count on retina. Deriving from logical dims keeps the simulation grid identical while rendering sharp. Not pinning the grid's CSS width preserves the responsive `width:100%` layout; backing store stays ≥ display×dpr so it never loses crispness when flex shrinks it. Rejected: a global resize-on-dpr-change handler (gold-plating for a fixed-layout toy). | [[qa]], [[ux]] |
| 2026-05-28 | Seeded PRNG = mulberry32 in `src/rng.js`; one integer `state.seed` threaded through genIsland (its existing hash-noise seed), fillRandom (new `rng` param), and stepStochastic (new `rng` param). The stochastic RNG is reset (`seed ^ 0x9e3779b9`) on every (re)init so a fixed seed reproduces the whole evolution, not just frame 1. | mulberry32 is ~5 lines, no deps, good-enough distribution for a toy. Threading a single seed (not per-call) keeps the UI to one readout. fillRandom/stepStochastic default to `Math.random` so old call sites stay valid. Rejected: xorshift128 (more state, no benefit here); seeding genIsland and fill from the SAME stream (genIsland already had its own deterministic hash, so reusing the seed integer directly is simpler and already reproducible). | [[qa]], [[ux]] |
| 2026-05-28 | Per-element strength **bias** lever (chip −/⊘/+ controls), range [−3,+3], default 0 everywhere. Threshold rule: additive to effective neighbour count — attacker uses +bias[e], defender uses −bias[s], so an augmented element both spreads AND holds ground. Stochastic rule: defence-only (augmented cell resists absorption via extra self-weight 2^bias−1); the invader is NOT weighted. | Purpose: break the RPS equilibrium and watch a takeover. Verified on threshold (+3 → 592 vs balanced 232; −3 → 0). Stochastic kept defence-only because weighting the invader backfired and, more deeply, cyclic dynamics are non-monotonic in strength (see Lessons). bias=0 reproduces the unbiased rule exactly. Rejected: one-shot population inject/cull (transient, re-equilibrates — does not show "no equilibrium"). | [[ux]], [[qa]] |
| 2026-05-28 | Introduce-seed: turning an element on (⊘ / right-click) or + while it has 0 live cells drops a dense blob (radius 6) on random land. Brush-pick (chip-body click) intentionally does NOT seed. | The brief calls activation "the introduce a new element lever", but activation placed no cells — so on a monopolised board, augmenting a predator did nothing (nothing to grow; a lone cell can't cross the threshold). Seeding a blob gives the foothold; with bias it flips the board. Verified: Aether monopoly → seed+augment Wind → 100% Wind; no-seed control → no change. | [[ux]], [[qa]] |
| 2026-05-28 | Organic tab built from `src/graphca.js` (graph automaton mirroring automaton.js's rules over an arbitrary adjacency list + `buildDualAdjacency`) and `src/organic.js` (mesh→relax→dual→adj→graph CA→Canvas2D: rounded dual cells over a faint quad grid, own compact controls, click-paint, introduce-seed via BFS blob). | Reuses the verified rule logic (attack+defence bias, uniform+selfW stochastic, EMPTY decay) without touching automaton.js. Path2D per cell built once per fit; loop gated on tab visibility. | [[arch]], [[ux]] |
| 2026-05-28 | Auto mode = shared `src/automode.js` director. Each step (while playing) it reads the population and, after a cooldown, introduces a PREDATOR of the dominant element (the lowest-population predator) when one colour passes 70% OR the board goes stable (every element's population flat over a 40-step window). Wired into both tabs via an Auto toggle; the antagonist is activated + seeded. | One director, both tabs. The cooldown (80 steps) lets the introduced wave act before re-evaluating — if the new element monopolises, its predator is introduced next: an endless RPS cascade. Predator-of-dominant (not a fixed antagonist) keeps it correct as the board changes. | [[arch]], [[ux]] |
| 2026-05-28 | Ported two render methods from 01-kai-meta: `src/braille.js` (the "braille 100%" bar — 4 Braille glyphs filling bottom-up, 0..100% at fine resolution, teal-recoloured) and `src/vfd.js` (canvas 7-segment glowing counter, `makeSevenSeg(canvas,{color})`). braille drives per-element share bars on both tabs + the dominance braille bar; vfd drives the organic landing's big dominance-% counter. | Reuse, not reinvention (kept the kai-meta algorithms). Both are pure/DOM-light and refreshed each frame from the live population. | [[ux]] |
| 2026-05-28 | `src/fx.js`: `cellGlow(i)` (stable per-cell brightness 0.6–1.0 from a hash) + `bloom(ctx,canvas,w,h)` (one-pass self-composite: redraw the canvas onto itself blurred, in 'lighter'). Both board renderers now fill each cell at cellGlow alpha over black, then bloom once. | Makes the board non-uniform + glowing (VFD-lit) cheaply: brightness via alpha and a single drawImage, vs per-cell shadowBlur which is untenable at thousands of cells/frame. Requires the black-filled opaque board so blurred black is a no-op under 'lighter'. | [[ux]] |
| 2026-05-28 | Legend chips update IN PLACE (`updateChips()` sets data-active/brush + bias text on existing nodes) instead of rebuilding via `innerHTML` on every introduce/toggle; the organic legend is `flex-wrap: nowrap`. Range sliders replaced by ‹/› stepper buttons (both tabs). | Rebuilding a wrapping flex legend on Auto-introduce reflowed the row and shifted the board down — the "jump" the operator saw. In-place updates + nowrap keep the layout constant. Per-chip count/braille dropped for a tight one-line legend (the hero 7-seg already shows dominance). | [[ux]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-28 (pre-handover, recorded) | Sparse single-cell seeding as the default initial state | Does not propagate under the threshold rule — no neighborhood ever reaches T, board sits at a fixed point and looks frozen. This killed the first PoC. Default must be full random fill. |
| 2026-05-28 (pre-handover, recorded) | Porting the classic 3-element / 8-neighbor RPS-CA threshold of 3 directly | On a 6-neighbor / 7-element grid, T=3 crystallizes and looks dead; T must be retuned to the neighborhood. T=2 is the lively default. |
| 2026-05-28 | Strength bias as attacker-only bonus in the threshold rule (eff = counts[e] + bias[e]) | An augmented element claimed cells with ≥1 neighbour and over-expanded into the territory of its 3 predators, which then ate it — it COLLAPSED instead of dominating (sim: +3 → 1 cell vs balanced 232). Fixed by subtracting the defender's bias (−bias[s]) so an augmented element also resists being taken. |
| 2026-05-28 | Stochastic bias by weighting the sampled invader (weight 2^bias[neighbour]) | The augmented element got sampled as aggressor even against cells it cannot beat, wasting the sample; it collapsed (sim: +3 → 6 vs balanced 247). Switched to uniform neighbour sampling + a defender self-resistance weight. |

## Lessons
- A cyclic CA's liveness depends on the threshold being matched to the neighborhood size and element count, not copied from another rule's parameters. — from dead end on 2026-05-28
- Cyclic-dominance CAs need a dense initial condition; sparse seeds are a fixed point, not a slow start. — from dead end on 2026-05-28
- In cyclic (rock-paper-scissors) dynamics, increasing one element's competitive strength does NOT monotonically increase its abundance — the "survival of the weakest" paradox. A clean "augment → dominates" lever holds only for the deterministic threshold rule; the stochastic rule responds paradoxically. Verify dominance levers against the actual dynamics; never assume monotonicity. — from dead ends on 2026-05-28

## Open Questions
- [x] M1 acceptance says "same seed → same evolution," but `fillRandom` and `stepStochastic` call `Math.random()` directly and only `genIsland` takes a seed. Determinism is currently false for stochastic runs and fills. Needs a seedable RNG threaded through all three. — owner: Gerald — since: 2026-05-28 — RESOLVED 2026-05-28: added `src/rng.js` (mulberry32), threaded one seed through genIsland/fillRandom/stepStochastic. Node check confirms a fixed seed reproduces an identical board AND identical 20-step evolution under both the threshold and stochastic rules.

## Assumptions
- `cellAt` (pixel→cell inverse) is approximate by design ("fine for a brush"). Any V1 feature needing exact cell pick (e.g. click-to-inspect) would need a precise inverse near hex boundaries. — status: untested — since: 2026-05-28

## Dependencies
Blocked by: [[arch]]
Feeds into: [[qa]], [[ux]]

## Session Log
2026-05-28 — Compaction: organic title → "STÅLBERG QUAD GRID RPS-7" with the "+" toggle inline-right (the title line is the details summary); tighter VFD hero (less padding, 74px counter); dial shows "%" via a static glyph; removed the ⚡ emoji from auto-notes (both tabs).
2026-05-28 — Polish: in-place chip updates + nowrap legend (fixes the introduce "jump"); removed per-chip count/braille; ‹/› steppers replace the Speed/Threshold/Board/Brush sliders on both tabs; organic description collapsed behind a "+". node --check clean; both tabs render error-free in headless Chrome.
2026-05-28 — Added fx.js (cellGlow jitter + one-pass bloom) and applied to both renderers; faded ROYGBIV is now the default palette. node --check clean; both tabs render glowing/non-uniform in headless Chrome.
2026-05-28 — Ported braille.js (the braille-100% bar) + vfd.js (canvas 7-seg counter) from kai-meta; wired into both tabs (per-chip braille share + the organic dominance-% counter). node --check clean; both tabs render in headless Chrome.
2026-05-28 — Added Auto mode (automode.js director) to both tabs: introduces a predator of the dominant element on >70% monopoly or stable balance, cooldown-gated → self-sustaining cascade. Director unit test 7/7 + 800-step loop sim (2+ interventions, dominant shifts 0→3, never locks); both tabs load error-free in headless Chrome.
2026-05-28 — Built the Organic CA tab: graphca.js (graph automaton mirroring automaton.js) + buildDualAdjacency, organic.js (mesh→dual→CA→Canvas2D render, compact controls, click-paint, seed-on-introduce). Node graph-CA check passes (775 cells evolve/conserve/deterministic; augment grows 505 vs 126); both tabs render cleanly in headless Chrome.
2026-05-28 — Fixed "introduce does nothing on a monopolised board": activating/augmenting an absent element now seeds a radius-6 blob so it has a foothold. Verified the full flip scenario in Node (no seed → no change; seed+augment Wind → flips an Aether monopoly to 100% Wind).
2026-05-28 — Added the per-element strength bias lever (chip −/⊘/+) to break the RPS equilibrium. Threshold = attack+defence (verified intuitive dominance: +3→592, −3→0 vs balanced 232); stochastic = defence-only (paradoxical, documented). bias=0 is back-compat (== unbiased). Two dead ends + a survival-of-the-weakest lesson recorded.
2026-05-28 — V1 polished-toy build. Added `src/rng.js` (mulberry32) and threaded one seed through island/fill/stochastic; added DPR crispness to grid + hist (logical-derived cols/rows, backing store ×dpr); added `src/wheel.js` tournament diagram; extended status readout with winner/period. Node check 12/12 pass incl. seed reproducibility; all assets HTTP 200. No dead ends this session.
2026-05-28 — Init. Recorded the two verified gotchas as dead ends + lessons; flagged the determinism gap between M1 acceptance and current Math.random() usage.
