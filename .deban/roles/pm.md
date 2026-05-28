---
role: pm
owner: Gerald
status: active
last-updated: 2026-05-28
---

# Product Management

## Scope
Owns scope, milestone prioritization, the five open decisions in BRIEF.md, and
the definition of "working V1." Arbitrates the product-feel calls (theme, rule
default, how geographic the result should read).

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-28 | Theme = Wuxing+Godai as working default | Reference screenshots use it; fits Gerald's Ryukyu animism project; already the code default. Palette is orthogonal to rules, so this is reversible at zero cost to dynamics. | [[ux]] |
| 2026-05-28 | V1 explicitly excludes M5 (WFC integration) | M5 is the stated "main objective" but needs the external Stålberg map tool, which is NOT in this repo. `island.js` stays as the stub seam; V1 is a local toy that demonstrates the dynamics. | [[arch]] |
| 2026-05-28 | V1 = "Polished toy" (operator decision) | Harden the PoC: retina/DPR crispness + seedable reproducible runs (M1 essentials) + the M2 tournament-wheel diagram & live readouts that make the doubly-regular structure visible. Cache-busting + 3-shape badge already installed. Rejected "Minimal wrap" (too thin to be interesting to look at) and "Ambitious local" (M3 timeline + lore-fit + PWA — deferred to protect the usage budget, currently 71%). | [[dev]], [[ux]] |
| 2026-05-28 | Default rule = Threshold T=2 (operator decision) | Sharp, coherent travelling fronts; documented lively default for 7 elements on a 6-neighbor hex. Stochastic stays one dropdown click away for the organic/video look. | [[dev]], [[ux]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
<!-- Challenged brief — untested assumptions / logical gaps surfaced at init. -->
- [x] V1 definition-of-done — RESOLVED 2026-05-28: "Polished toy" (see Decisions). M5 out of V1.
- [x] Aesthetic-vs-default — RESOLVED 2026-05-28: ship Threshold T=2 as the default; stochastic stays selectable.
- [ ] M4 terrain-coupling strength is called the "biggest unforced decision," yet M4 needs biome data from the WFC tool (M5). It cannot be exercised in a local V1. Defer, or prototype against synthetic biomes? — owner: Gerald — since: 2026-05-28 — DEFERRED (post-V1, gated on M5/map tool)
- [ ] Lore-fit (RESEARCH §7): Wuxing+Godai accepted as-is for V1; the ordering-search is deferred (was in the "Ambitious" scope). Revisit before any public theme lock. — owner: Gerald — since: 2026-05-28 — DEFERRED (post-V1)
- [ ] Abstract-7 vs nested-9 (BRIEF open decision #3) — RESOLVED 2026-05-28 for V1: abstract doubly-regular 7. Nested-9 (M6) deferred. — owner: Gerald
- [ ] BACKLOG (next up, operator-flagged 2026-05-28): (A) a Conway's Game-of-Life variant rule on the board (alongside threshold/stochastic); (B) more cell-size variance / higher delta — bigger and smaller cells; (C) audit against mobile PWA standards (manifest, service worker, installability, touch ergonomics). — owner: Gerald — since: 2026-05-28

## Assumptions
- Gerald will personally look at the running V1 in localhost (only a human can judge "looks right"); automated checks verify logic + serving, not visual feel. — status: untested — since: 2026-05-28
- "Basic, local" caps V1 ambition: polish the toy, do not chase the full M1–M7 roadmap. — status: untested — since: 2026-05-28

## Dependencies
Blocked by:
Feeds into: [[dev]], [[ux]], [[qa]]

## Session Log
2026-05-28 — SYNC. Recorded next-up backlog: (A) Game-of-Life variant rule, (B) bigger cell-size variance / higher delta, (C) mobile PWA standards audit.
2026-05-28 — Init. Challenged brief; surfaced 5 scope/feel open questions. Locked theme (Wuxing+Godai) and V1-excludes-M5 as working decisions.
