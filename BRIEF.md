# Handover brief — RPS-7 Paley hex CA

A Claude Code project brief for continuing this locally and integrating it with
the existing Oskar Stalberg-style procedural map tooling.

## Goal

A cellular-automaton sandbox where N (=7) "elements" spread across a procedurally
generated hex map under a rock-paper-scissors-style dominance relation. Elements
consume what they beat and are consumed by their predators. Introducing or
removing an element changes the global regime. The deliverable is both a
playable toy and a reusable module that drops onto the Stalberg WFC map layer.

## Current state (this PoC)

Working, no build step, plain ES modules. Implements:

- Paley QR-mod-7 tournament (generic `makeTournament(n, skipSet)`).
- Pointy-top odd-r hex grid (`hex.js`).
- fBm noise island generator (`island.js`) — explicitly a stub seam for WFC.
- Two CA rules: threshold (deterministic) and stochastic (sampling).
- Element activation/deactivation (the "introduce a new element" lever),
  brush painting, population history, and cyclic/transitive subset detection.
- Three swappable palettes (Wuxing+Godai, ROYGBIV, alchemical).

Read `RESEARCH.md` before changing the rule or the tournament — the math (odd-N
balance, doubly regular property, threshold-vs-neighborhood tuning) is what
makes or breaks the dynamics.

## Architecture / conventions

- Vanilla ES modules, no bundler, served statically. Keep it dependency-free.
- `grid` is a single `Int8Array`: `-1` = sea, `N` = empty land, `0..N-1` =
  elements. Double-buffered in `automaton.js` (`next`), last-write-wins.
- The dominance relation is data (`skipSet`), not code — keep it that way so N
  and the edge set stay configurable.
- Palette (skin) and tournament (rules) are orthogonal: swapping a palette must
  never change who beats whom.

## Roadmap (suggested order)

### M1 — Solidify the core (mostly done)
- [ ] Decouple grid resolution from canvas size; support retina / devicePixelRatio.
- [ ] Move the CA step into a Web Worker so large grids stay at 60fps.
- [ ] Deterministic seeding (seedable RNG) so runs are reproducible.
- Acceptance: 200x150 grid runs >30fps; same seed -> same evolution.

### M2 — Subset diagnostics in UI
- [ ] Render the tournament as a 7-node wheel diagram with directed edges;
      highlight the active subset and any cyclic triple it contains.
- [ ] Show live per-element population sparkline already in `record()`; add a
      readout of dominant element / oscillation period when cyclic.
- Acceptance: deactivating down to a transitive triple shows "winner: X";
  down to a cyclic triple shows "cyclic, period ~k".

### M3 — Element-introduction event system
- [ ] A tiny timeline DSL: `[{step: 200, action: 'introduce', element: 'Aether',
      at: [c,r], radius: 6}]`. Drives scripted regime-change demos.
- [ ] Record/replay: capture a session as a seed + event list.
- Acceptance: can reproduce "one element monopolizes, then a predator is
  introduced and the front reverses" deterministically from a script.

### M4 — Terrain coupling
- [ ] Per-cell biome id from the map; a bias matrix `biomeFavor[biome][element]`
      that adds to neighbor counts (threshold rule) or to sampling weights
      (stochastic). E.g. mountains favor Earth/Metal, rivers favor Water/Wood.
- [ ] Decide: is the CA independent of terrain, or coupled? (Recommend coupled
      but with a strength slider, 0 = pure topology.)
- Acceptance: with bias on, element distributions correlate with biomes;
  bias=0 reproduces current behavior exactly.

### M5 — WFC / Stalberg map integration (the main objective)
- [ ] Replace `genIsland()` with an adapter that consumes the existing
      procedural map output and returns `{ landMask, biomeId }` on the same hex
      indexing. Keep the adapter behind the same signature so the CA never sees
      WFC internals.
- [ ] Confirm hex orientation/offset convention matches the map tool; if the map
      uses axial or flat-top, add a coordinate adapter rather than rewriting the CA.
- [ ] Coastline / impassable tiles act as permanent `-1`.
- Acceptance: the CA runs unmodified on a real generated map; swapping the map
  generator requires touching only the adapter.

### M6 — Nested / configurable N
- [ ] Expose N and skipSet in the UI; validate regularity.
- [ ] Add a 9-element nested set (3 macro-groups) for literal "RPS within RPS"
      (see RESEARCH.md s8). Different visual texture from Paley-7.
- Acceptance: N=3,5,7,9 all run; UI warns on even / non-regular configs.

### M7 — Polish / export
- [ ] PWA shell (matches house style): offline, installable.
- [ ] GIF / frame export for sharing (the reference is a video).
- [ ] Palette editor + lore-fit search (RESEARCH.md s7): score name orderings
      against a "should beat" preference matrix, suggest best assignments.

## Open decisions (resolve before M4/M5)

1. **CA vs terrain coupling strength** — independent, lightly biased, or
   terrain-dominated? Affects how "geographic" the result feels.
2. **Element set / theme** — Wuxing+Godai (narrative weight, your Ryukyu
   project), ROYGBIV (legibility), or alchemical (motivated dominance lore)?
3. **Abstract 7 vs nested 9** — doubly-regular elegance vs literal two-level
   paradox.
4. **Map coordinate convention** — match whatever the Stalberg tool emits;
   write an adapter, do not fork the CA's hex math.
5. **Rule default** — threshold (sharp, screenshot-like) or stochastic (organic,
   video-like) as the shipped default.

## Integration contract with the map tool

The CA needs only this from the map generator:

```
interface MapInput {
  cols: number;
  rows: number;
  landMask: Int8Array;   // length cols*rows; 1 = land, 0 = sea
  biomeId?: Uint8Array;  // optional; per-cell biome for M4 coupling
  orientation: 'pointy-odd-r' | 'pointy-even-r' | 'flat-odd-q' | 'flat-even-q';
}
```

Everything else (dominance, rules, rendering, UI) is self-contained in this repo.

## Things NOT to do

- Do not reintroduce sparse single-cell seeding as the default state — it does
  not propagate under the threshold rule (see README gotcha).
- Do not bake the dominance edges into rendering or UI code; they live only in
  `tournament.js`.
- Do not port the 3-element/8-neighbor threshold (3) blindly; retune T to the
  neighborhood and N.
