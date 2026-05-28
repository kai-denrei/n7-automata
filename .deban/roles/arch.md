---
role: arch
owner: Gerald
status: active
last-updated: 2026-05-28
---

# Architecture

## Scope
Module boundaries, data representations, the integration contract with the map
tool, and the "keep it dependency-free" constraint.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-28 | Dependency-free vanilla ES modules, no bundler, served statically | House style (PWA/vanilla modules). Lowers handover friction; runs with `python3 -m http.server`. Alternative (Vite/bundler) rejected: adds a build step for no current benefit. | [[devops]] |
| 2026-05-28 | `grid` is one `Int8Array`: -1=sea, N=empty land, 0..N-1=elements; double-buffered in automaton.js, last-write-wins | Cache-friendly, trivially serializable for record/replay, cheap to snapshot. | [[dev]] |
| 2026-05-28 | Dominance is data (`skipSet`), never baked into render/UI | Keeps N and the edge set configurable; palette (skin) stays orthogonal to tournament (rules). | [[dev]], [[ux]] |
| 2026-05-28 | Map integration is an adapter behind a fixed signature `{cols, rows, landMask, biomeId?, orientation}` | The CA never sees WFC internals; swapping map generators touches only the adapter. `island.js` is the seam. | [[pm]] |
| 2026-05-28 | Ported the Oskar Stålberg organic-grid kernel from the oskar-procedure repo into `src/grid/` (vec, hexlattice, poisson, mesh, halfedge, dual) + vendored `delaunator`+`robust-predicates`. New "Organic" tab runs the CA on this irregular grid. | Bridges toward the project's M5 north-star (CA on a Stålberg map) without the full WFC. Verbatim port (only import paths + cache-bust queries changed) keeps it faithful and re-syncable. | [[dev]], [[ux]] |
| 2026-05-28 | Organic-CA substrate = the mesh's DUAL cells (one per interior vertex), adjacency = primary-edge-connected vertices. NOT the quad faces. | Dual cells are the Townscaper "organic hexagons" and read as a map; avg degree ~3.8 (range 2–6) keeps the threshold rule in a workable regime. Quad faces (~4 nbr, more angular) were the rejected alternative. | [[dev]] |
| 2026-05-28 | Two tabs are INDEPENDENT apps sharing libraries (tournament, palette, rng), not one app with two renderers. Tab 1 = `main.js` (regular hex, untouched); Tab 2 = `organic.js` (own state + compact controls). | Zero risk to the verified Tab 1; clean isolation. Cost: the strength/active control logic is duplicated (compact in organic.js). | [[dev]], [[ux]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] Map coordinate convention (BRIEF open decision #4): the CA is pointy-top odd-r. If the Stålberg tool emits axial or flat-top, add a coordinate adapter — do NOT fork the CA's hex math. Unresolved until the map tool's output is seen. — owner: Gerald — since: 2026-05-28

## Assumptions
- Likely bottleneck at large grids (200x150) is main-thread Canvas2D rendering (per-hex path + stroke), NOT the step compute. Moving only the step into a Web Worker (M1) may not deliver the >30fps acceptance if render stays on the main thread. — status: untested — since: 2026-05-28

## Dependencies
Blocked by:
Feeds into: [[dev]], [[devops]]

## Session Log
2026-05-28 — Ported the Stålberg grid kernel + added the Organic CA tab (CA on dual cells of a relaxed hex-lattice quad mesh). Two independent tabs sharing tournament/palette/rng. Verified in Node (775-cell graph CA evolves/conserves/deterministic; augment grows) and headless-Chrome screenshots of both tabs render correctly.
2026-05-28 — Init. Recorded the four load-bearing architectural invariants from the handover; flagged the render-vs-compute bottleneck assumption against M1's fps target.
