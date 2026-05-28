// island.js
// Generates the playable landmass mask. This is the SEAM where the project
// will later plug into the Oskar Stalberg-style procedural map generator
// (Wave Function Collapse / tile-based terrain). For now it produces a
// blobby continent with radial falloff + fractal Brownian motion noise.
//
// Cell states written into `grid` (Int8Array):
//   -1  = sea (not playable)
//    7  = empty land (playable, no element) for N=7; generally === EMPTY
// Element indices 0..N-1 are written later by the seeder / automaton.
//
// INTEGRATION NOTE (see BRIEF.md, milestone 5):
// Replace genIsland() with a function that consumes a WFC tile map and
// returns BOTH the land mask AND a per-cell biome id. Biomes can then bias
// the automaton (e.g. mountains favor Earth/Metal, rivers favor Water).

export function genIsland(grid, grid2d, EMPTY, seed = 1) {
  const { cols, rows, idx } = grid2d;

  const hash = (x, y) => {
    let n = ((x * 374761393) ^ (y * 668265263) ^ (seed * 2654435761)) >>> 0;
    n = Math.imul(n ^ (n >>> 15), 2246822507);
    n = Math.imul(n ^ (n >>> 13), 3266489909);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = hash(xi, yi), b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = smooth(xf), v = smooth(yf);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  const fbm = (x, y) => {
    let amp = 1, f = 0.055, sum = 0, norm = 0;
    for (let i = 0; i < 5; i++) { sum += amp * vnoise(x * f, y * f); norm += amp; amp *= 0.5; f *= 2; }
    return sum / norm;
  };

  const cx = cols / 2, cy = rows / 2;
  const rmax = Math.min(cols, rows) * 0.46;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = c - cx;
      const dy = (r - cy) * 1.05;
      const dist = Math.sqrt(dx * dx + dy * dy) / rmax;
      const radial = 1 - dist;
      const n = fbm(c * 0.7 + seed * 0.3, r * 0.7);
      const v = radial * 0.55 + n * 0.75 - 0.36;
      grid[idx(c, r)] = v > 0 ? EMPTY : -1;
    }
  }
}

// Fill every land cell with a uniformly random active element. This is the
// correct default initial condition: a sparse scatter of single cells will
// NOT propagate under the threshold rule (no neighborhood ever reaches the
// threshold), so the board appears frozen. Full random fill gives live
// fronts from frame one.
//
// `rng` is a () -> [0,1) function (see rng.js). Passing a seeded RNG makes the
// initial board reproducible; defaulting to Math.random keeps old call sites
// working.
export function fillRandom(grid, EMPTY, activeElements, rng = Math.random) {
  if (!activeElements.length) return;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== -1) {
      grid[i] = activeElements[(rng() * activeElements.length) | 0];
    }
  }
}

export function clearLand(grid, EMPTY) {
  for (let i = 0; i < grid.length; i++) if (grid[i] !== -1) grid[i] = EMPTY;
}
