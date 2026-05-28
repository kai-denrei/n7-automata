---
role: qa
owner: Gerald
status: active
last-updated: 2026-05-28
---

# Quality Assurance

## Scope
Verification strategy: what "working" means without a human in the loop, and
checking implementation against the BRIEF's per-milestone acceptance criteria.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-28 | Verification = Node logic check + HTTP-200 serving check; visual feel is human-judged by Gerald | No DOM in tournament/hex/island/automaton, so they test cleanly in Node. The browser render must be eyeballed. | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] M1 acceptance "200x150 grid runs >30fps" is unverified and may be render-bound, not compute-bound (see [[arch]] assumption). How is fps to be measured for sign-off? — owner: Gerald — since: 2026-05-28 — STILL OPEN after V1: the Web Worker (M1) is explicitly out of V1 scope, and fps cannot be measured headless. The DPR change increases the backing-store fill area (×dpr²) but does not change the cell count or the per-step compute; if anything fps is now render-bound on hi-dpr displays. Needs Gerald's eyes / a perf counter in-browser.
- [x] M1 acceptance "same seed → same evolution" currently cannot pass for stochastic runs (uses Math.random). Track as a gate on the determinism work. — owner: Gerald — since: 2026-05-28 — CLOSED 2026-05-28: seeded RNG (`src/rng.js`) threaded through fill + stochastic step. Node check asserts a fixed seed reproduces an identical board AND identical 20-step evolution under BOTH the threshold and the (now seeded) stochastic rule. Different seeds produce different boards. Gate met for the automated half.

## Assumptions
- A passing Node logic check + all-assets-200 is a sufficient automated gate for V1; the rest is Gerald's visual sign-off in localhost. — status: untested — since: 2026-05-28

## Dependencies
Blocked by: [[dev]]
Feeds into: [[pm]]

## Session Log
2026-05-28 — V1 verification. Node logic+determinism check: 12/12 pass (regular, doubly regular, 14 cyclic triples, classifySubset winner/cyclic, fixed-seed identical fill, different-seed differs, both rules evolve, threshold conserves land count, fixed-seed identical evolution under threshold AND stochastic). All 13 served paths HTTP 200 (incl. new rng.js, wheel.js). `node --check` clean on all 8 modules. fps acceptance remains human-judged; visual correctness of wheel/crispness remains Gerald's call.
2026-05-28 — Init. Recorded the verification split (Node logic + HTTP serving vs human visual) and two unmeetable-as-written acceptance criteria.
