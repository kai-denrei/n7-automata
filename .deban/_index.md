---
project: RPS-7 Paley hex CA (n7-automata)
created: 2026-05-28
status: active
mode: solo
stale_threshold_days: 30
---

# RPS-7 Paley hex CA (n7-automata) — Index

## Brief
A cellular-automaton sandbox where 7 "elements" spread across a procedurally
generated hex map under a rock-paper-scissors dominance relation (the Paley
QR-mod-7 tournament: x beats x+1, x+2, x+4). Elements consume what they beat and
are consumed by their predators; activating/deactivating an element changes the
global regime. Deliverable is both a playable local toy and a reusable module
that later drops onto an Oskar Stålberg-style WFC map layer. House style:
dependency-free vanilla ES modules, no build step, served statically.

## Active Roles
<!-- Format: - [[rolename]] — owner: [name] -->
- [[pm]] — owner: Gerald
- [[arch]] — owner: Gerald
- [[dev]] — owner: Gerald
- [[ux]] — owner: Gerald
- [[qa]] — owner: Gerald
- [[devops]] — owner: Gerald

## Key Decisions
<!-- Cross-role summary, maintained by COMPACT -->
- 2026-05-28 — Stay dependency-free, no bundler, statically served ES modules. ([[arch]])
- 2026-05-28 — Dominance relation is data (`skipSet`), never baked into render/UI. ([[arch]], [[dev]])
- 2026-05-28 — Theme = Wuxing+Godai as working default (Ryukyu project + reference screenshots). ([[pm]], [[ux]])
- 2026-05-28 — V1 excludes M5 (WFC integration): the external Stålberg map tool is not in this repo. ([[pm]])
- 2026-05-28 — Cache-busting toolkit + 3-shape version badge installed for cache management and asset versioning. ([[devops]])
- 2026-05-28 — V1 = "Polished toy": harden PoC (retina/DPR + seedable runs) + M2 wheel diagram & readouts. Default rule = Threshold T=2. ([[pm]])
- 2026-05-28 — Added Organic CA tab (Tab 2): RPS-7 on the dual cells of a relaxed Stålberg hex-lattice quad mesh; ported grid kernel (src/grid/*) + graph CA (graphca.js). Tab 1 untouched. ([[arch]], [[dev]], [[ux]])
- 2026-05-28 — Added Auto mode (automode.js): director introduces a predator of the dominant element on >70% monopoly or stable balance (cooldown-gated → endless cascade). Both tabs. ([[dev]])
- 2026-05-28 — Look & feel adopted from sibling repo 01-kai-meta: teal "VFD" aesthetic + ported braille-100% bar (braille.js) and 7-seg counter (vfd.js). ([[ux]], [[dev]])

## Open Questions (cross-role)
<!-- Unresolved items spanning more than one role -->
- [x] V1 definition-of-done — RESOLVED 2026-05-28: "Polished toy"; M5 out of V1.
- [x] Default rule for the shipped "look" — RESOLVED 2026-05-28: Threshold T=2 (stochastic still selectable).
- [ ] Lore-fit search (RESEARCH §7): deferred post-V1; Wuxing ordering accepted as-is for now. — owner: Gerald ([[pm]], [[ux]])
- [ ] M4 terrain-coupling: deferred post-V1, gated on the external WFC map tool. — owner: Gerald ([[pm]], [[arch]])
