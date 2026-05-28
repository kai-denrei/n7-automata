// graphca.js — the RPS-N cellular automaton over an ARBITRARY adjacency graph
// (as opposed to automaton.js, which is hard-wired to the regular 6-neighbour
// hex grid). Used by the organic-grid tab: each cell is a dual cell of the
// relaxed Stålberg quad mesh and its neighbours come from the mesh topology, so
// neighbour counts vary per cell (typically 3–6).
//
// The rule logic MIRRORS automaton.js exactly — same threshold (attacker +bias,
// defender −bias) and stochastic (uniform sample + augmented-defender self-
// resistance) families, same EMPTY/decay semantics — just iterating adj[i]
// instead of the fixed 6-neighbour stencil. Kept as a separate module so the
// verified regular-grid automaton stays untouched. If these two ever diverge,
// reconcile them deliberately.
//
//   adj: Array<Int32Array|number[]>  adj[i] = neighbour cell indices of cell i
//   EMPTY = N (sentinel for unclaimed land); element states are 0..N-1; -1 cells
//   (if any) are inert and skipped.

export function makeGraphAutomaton(adj, tournament, EMPTY) {
  const n = adj.length;
  const next = new Int8Array(n);
  const counts = new Int8Array(tournament.n);

  function stepThreshold(grid, active, threshold, bias) {
    next.set(grid);
    for (let i = 0; i < n; i++) {
      const s = grid[i];
      if (s === -1) continue;
      counts.fill(0);
      const nb = adj[i];
      const deg = nb.length;
      for (let k = 0; k < deg; k++) {
        const ns = grid[nb[k]];
        if (ns >= 0 && ns < EMPTY) counts[ns]++;
      }
      let best = -1, bestK = threshold - 1;
      if (s === EMPTY) {
        for (let e = 0; e < tournament.n; e++) {
          if (!active[e] || counts[e] === 0) continue;
          const eff = counts[e] + (bias ? bias[e] : 0);
          if (eff > bestK) { best = e; bestK = eff; }
        }
      } else {
        for (let e = 0; e < tournament.n; e++) {
          if (!active[e] || counts[e] === 0 || !tournament.beats(e, s)) continue;
          // attacker's bias helps; defender (cell s) bias resists (mirrors automaton.js)
          const eff = counts[e] + (bias ? bias[e] - bias[s] : 0);
          if (eff > bestK) { best = e; bestK = eff; }
        }
        if (!active[s] && best === -1) { next[i] = EMPTY; continue; }
      }
      if (best >= 0) next[i] = best;
    }
    grid.set(next);
  }

  function stepStochastic(grid, active, rng = Math.random, bias) {
    next.set(grid);
    for (let i = 0; i < n; i++) {
      const s = grid[i];
      if (s === -1) continue;
      const nb = adj[i];
      const deg = nb.length;
      if (deg === 0) continue;
      // augmented cell resists absorption (extra "stay as self" weight), mirroring
      // automaton.js; otherwise a uniform sample over the cell's neighbours.
      let selfW = 0;
      if (bias && s >= 0 && s < EMPTY && bias[s] > 0) selfW = Math.pow(2, bias[s]) - 1;
      const totalW = deg + selfW;
      let rp = rng() * totalW;
      if (rp < selfW) continue;
      rp -= selfW;
      let k = rp | 0; if (k >= deg) k = deg - 1;
      const pick = grid[nb[k]];
      if (pick < 0 || pick >= EMPTY || !active[pick]) continue;
      if (s === EMPTY || tournament.beats(pick, s)) next[i] = pick;
    }
    grid.set(next);
  }

  function population(grid) {
    const pop = new Array(tournament.n).fill(0);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const s = grid[i];
      if (s >= 0 && s < EMPTY) { pop[s]++; total++; }
    }
    return { pop, total };
  }

  return { stepThreshold, stepStochastic, population };
}

// Build dual-cell adjacency from a finalized mesh + extracted dual cells.
// Two cells are neighbours iff their primary vertices share a primary (quad)
// edge. Returns { adj, cellOfVertex } where adj[i] is an Int32Array of
// neighbour cell indices for cell i (index into the `cells` array).
export function buildDualAdjacency(mesh, cells) {
  const cellOfVertex = new Map();
  cells.forEach((c, i) => cellOfVertex.set(c.vertexIndex, i));
  const sets = cells.map(() => new Set());
  for (const q of mesh.quads) {
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      const ca = cellOfVertex.get(a), cb = cellOfVertex.get(b);
      if (ca !== undefined && cb !== undefined && ca !== cb) {
        sets[ca].add(cb); sets[cb].add(ca);
      }
    }
  }
  const adj = sets.map((s) => Int32Array.from(s));
  return { adj, cellOfVertex };
}
