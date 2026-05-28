// hex.js — hexagonal lattice seeder (Oskar Stålberg "Variant B"). Stage 1B of
// the grid kernel. Pure geometry: NO DOM, NO RNG (deterministic by construction;
// the pipeline's `seed` still drives the random dissolve downstream in grid.js).
//
// A triangular point lattice clipped to a hexagonal outline of `rings` rings
// around `center`. Triangular basis:
//   e1 = (spacing, 0)
//   e2 = (spacing/2, spacing·√3/2)
// A lattice node at axial coord (q, r) sits at: center + q·e1 + r·e2.
// Include every (q, r) with hex-distance max(|q|, |r|, |q+r|) ≤ rings.
//
// Ring k contributes 6·k points; total = 1 + 3·rings·(rings+1) (centered
// hexagonal numbers: rings 1→7, 2→19, 3→37, 4→61).
//
//   hexLattice({ rings, spacing = 0.1, center = [0, 0], variance = 0, seed = 0 })
//       -> { points, boundary }
//     points:   [[x,y], ...]  — the lattice nodes, world units, centered on `center`
//     boundary: number[]      — indices (into points) of the outermost ring's
//                               nodes (hex-distance == rings). Unused in H1;
//                               exposed for H2b shared-edge identification.
//
// `variance` (0..1) DENSITY-MODULATES the seed so the resulting organic grid has
// coherent BIG and SMALL cell regions instead of a near-uniform texture. At 0 it
// returns the exact uniform lattice (backward-compatible). As it rises, an fBm
// value-noise field decides, per interior node, whether to keep it (high-noise
// regions stay dense → small cells; low-noise regions are decimated → big cells)
// and adds a noise-scaled positional jitter. The outermost ring is ALWAYS kept
// and never jittered, so the hex outline stays intact (the relaxer pins it) and
// the mesh stays valid; only interior density varies.

const SQRT3 = Math.sqrt(3);

// --- value noise + fBm (no deps) -------------------------------------------
// Deterministic 2D value noise hashed from integer lattice + the field seed,
// bilinearly interpolated with a smoothstep fade. fBm sums a few octaves.
function hash2(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h & 0xffff) / 0xffff; // [0,1)
}
function smooth(t) { return t * t * (3 - 2 * t); }
function valueNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const v00 = hash2(ix, iy, seed), v10 = hash2(ix + 1, iy, seed);
  const v01 = hash2(ix, iy + 1, seed), v11 = hash2(ix + 1, iy + 1, seed);
  const ux = smooth(fx), uy = smooth(fy);
  const a = v00 + (v10 - v00) * ux;
  const b = v01 + (v11 - v01) * ux;
  return a + (b - a) * uy; // [0,1)
}
function fbm(x, y, seed) {
  let amp = 0.6, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < 3; o++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 1013);
    norm += amp; amp *= 0.5; freq *= 2.1;
  }
  return sum / norm; // ~[0,1)
}

// Hex (axial) distance from the origin (0,0). For axial coords this is
// max(|q|, |r|, |q+r|) — the cube-coordinate Chebyshev distance.
export function hexDistance(q, r) {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
}

export function hexLattice({ rings, spacing = 0.1, center = [0, 0], variance = 0, seed = 0 } = {}) {
  const R = rings | 0;
  if (!(R >= 1)) {
    throw new Error(`hexLattice: rings must be an integer >= 1, got ${rings}`);
  }
  const V = Math.max(0, Math.min(1, variance || 0)); // clamp to [0,1]

  const [cx, cy] = center;
  // Triangular basis vectors.
  const e1x = spacing,        e1y = 0;
  const e2x = spacing / 2,    e2y = (spacing * SQRT3) / 2;

  // Noise field frequency: a few cycles across the patch so regions are coherent
  // (not per-node speckle). Scale world coords by this before sampling fBm.
  const nf = 1.6 / (R * spacing || 1);
  // Decimation probability and jitter both scale with V. Keep ≥1 ring of nodes
  // always (the outline ring) so the patch never collapses.
  const keepFloor = 0.18;        // even in the sparsest region, keep this fraction of nodes
  const maxDrop = 0.62;          // at V=1 the sparsest region drops up to this fraction
  const jitterAmt = 0.32 * V;    // positional jitter as a fraction of `spacing`

  const points = [];
  const boundary = [];

  for (let q = -R; q <= R; q++) {
    const rLo = Math.max(-R, -q - R);
    const rHi = Math.min(R, -q + R);
    for (let r = rLo; r <= rHi; r++) {
      const onBoundary = hexDistance(q, r) === R;
      let x = cx + q * e1x + r * e2x;
      let y = cy + q * e1y + r * e2y;

      if (V > 0 && !onBoundary) {
        // fBm in [0,1]: high → dense (keep, small cells); low → sparse (drop, big cells).
        const nz = fbm(x * nf + 17.3, y * nf + 4.1, seed >>> 0);
        // keep probability: dense regions keep ~all, sparse regions drop up to maxDrop.
        const keepP = 1 - V * maxDrop * (1 - smooth(nz));
        const rk = hash2(q + 512, r + 512, (seed + 7) >>> 0); // node-stable decide
        if (rk > Math.max(keepFloor, keepP)) continue;        // decimate this node
        // jitter: pseudo-random offset, node-stable, scaled by spacing.
        const ja = hash2(q + 31, r + 91, (seed + 11) >>> 0) * Math.PI * 2;
        const jr = hash2(q + 53, r + 17, (seed + 13) >>> 0) * jitterAmt * spacing;
        x += Math.cos(ja) * jr;
        y += Math.sin(ja) * jr;
      }

      const idx = points.length;
      points.push([x, y]);
      if (onBoundary) boundary.push(idx);
    }
  }

  return { points, boundary };
}
