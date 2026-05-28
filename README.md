# RPS-7 Paley hex cellular automaton

A proof-of-concept for a 7-element, rock-paper-scissors-style cellular automaton
running on a hex map. Seven "elements" spread across a landmass, each consuming
the elements it beats and being consumed by its predators. The end goal is to
fuse this dominance dynamic with an Oskar Stalberg-style procedural map
generator (Wave Function Collapse).

## Run it

No build step. It is plain ES modules, so it must be served over HTTP (opening
`index.html` via `file://` will fail on the module imports).

```sh
cd rps7-paley-ca
python3 -m http.server 8000
# then open http://localhost:8000/
```

Or any static server: `npx serve`, `php -S localhost:8000`, etc.

## Controls

- **Play / Step** — run or single-step the automaton.
- **Randomize** — refill all land with random active elements (the correct
  starting condition; a sparse scatter will not propagate, see below).
- **Clear** — empty all land.
- **New island** — regenerate terrain + refill.
- **Rule** — `Threshold` (deterministic, sharp fronts) or `Stochastic`
  (sampling, organic perpetual churn).
- **Palette** — swap the element skin (Wuxing+Godai / ROYGBIV / alchemical).
- **Threshold** — neighbor count needed to flip (threshold rule only).
- **Brush** — paint size. Click a chip to pick the brush element; right-click a
  chip to toggle that element in or out of the whole simulation.

The bottom strip is the population history. The status line classifies the
active subset as `cyclic` (perpetual oscillation, no winner) or `transitive`
(one element will dominate).

## File map

```
index.html        entry point
style.css
src/
  tournament.js   dominance relation (Paley QR-mod-7) + subset analysis
  hex.js          pointy-top odd-r hex grid geometry + neighbors
  island.js       fBm island generator (SEAM for WFC integration) + fill/clear
  automaton.js    CA engine: threshold + stochastic rules
  palette.js      element sets / skins
  main.js         wiring, rendering, UI, loop
BRIEF.md          handover spec + roadmap for continuing the project
RESEARCH.md       the math, references, and design findings
```

## The one gotcha that bit the PoC

A sparse scatter of single-cell seeds does **not** spread under the threshold
rule: an isolated cell never gives any neighbor enough matching neighbors to
cross the threshold, so the board sits at a fixed point and looks frozen. The
fix is to start from a **full random fill** so every boundary is a live front.
On a 6-neighbor hex grid with 7 elements, threshold 2 is the lively default;
threshold 3+ crystallizes; threshold 1 boils. See `RESEARCH.md`.
