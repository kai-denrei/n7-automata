---
role: devops
owner: Gerald
status: active
last-updated: 2026-05-28
---

# DevOps / Tooling

## Scope
Local serving, cache invalidation + asset versioning, git hygiene. No CI/CD
target yet (local-only V1).

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-28 | Serve statically via `python3 -m http.server`; no build step | Matches dependency-free constraint; ES modules require HTTP (file:// breaks module imports). | [[arch]] |
| 2026-05-28 | git initialized at repo root with the kai-denrei identity | kainode convention — all agent git work routes through the Kai Denrei account, never Gerald's personal GitHub. | |
| 2026-05-28 | Cache-busting toolkit for cache management + asset versioning, with the 3-shape visual badge | Requested explicitly. Gives URL fingerprinting, anti-cache meta, a version token / build receipt, an on-save watcher, and a shape favicon + corner badge so a human can see at a glance whether a reload actually busted the cache. | |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] No deploy target chosen (V1 is local-only). If this later ships as a PWA (M7), the cache-busting service-worker invalidation pattern becomes load-bearing — revisit then. — owner: Gerald — since: 2026-05-28

## Assumptions
- Local-only is the V1 deployment story; no hosting/CDN config needed yet. — status: untested — since: 2026-05-28

## Dependencies
Blocked by:
Feeds into: [[arch]]

## Session Log
2026-05-28 — Cache-busting installed into rps7-paley-ca (token-bump runner, fingerprinting, anti-cache meta, on-save watcher, 3-shape favicon+badge). cb-assets relocated from `public/` to the served root so the root-absolute `/cb-shapes/` and `/cb-badge.js` refs resolve under http.server. Verified: `./scripts/bust.sh` bumps token + favicon cell end-to-end; all assets serve 200.
2026-05-28 — Init. Recorded local-serve + git-init decisions; cache-busting install pending in this same session.
