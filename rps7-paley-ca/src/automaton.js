// automaton.js
// The cellular-automaton step. Two rule families:
//
// THRESHOLD (deterministic, Greenberg-Hastings / Bays cyclic-CA / Softology
//   "RPS-CA"): a cell of element s flips to a predator e (e beats s) if e
//   holds >= threshold of the cell's 6 neighbors. Empty land is claimed by
//   the element with the most neighbors (>= threshold). Produces sharp,
//   coherent fronts and can lock into near-static domains.
//   - threshold 1: boiling chaos
//   - threshold 2: coherent waves (good default for N=7 on 6 neighbors)
//   - threshold 3: crystallizes into stable patches
//   - threshold 4+: mostly frozen (rarely 4 matching neighbors of 6)
//
// STOCHASTIC (Stenseke "Pokemon" infection): each cell samples ONE random
//   neighbor; if that neighbor's element beats the cell (or the cell is
//   empty and the neighbor is alive), the cell is absorbed. Never reaches a
//   true fixed point — perpetual fuzzy spirals. Closest to the reference
//   video's organic look.
//
// EMPTY is the sentinel for playable-but-unclaimed land (N for an N-element
// system, e.g. 7). Sea cells are -1 and never change.

export function makeAutomaton(grid2d, tournament, EMPTY) {
  const { cols, rows, idx, neighbors } = grid2d;
  const size = cols * rows;
  const next = new Int8Array(size);
  const counts = new Int8Array(tournament.n);
  const nb = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
  const wbuf = [0, 0, 0, 0, 0, 0];

  // `bias` (optional) is a per-element Int/array. In the threshold rule it is an
  // additive shift to an element's effective neighbour count: +1 lets it claim a
  // cell with one fewer real matching neighbour (spreads aggressively), -1 makes
  // it need one more (recedes). It only ever amplifies a LEGAL move (a predator
  // consuming its prey, or claiming empty land) and an element must still have
  // >=1 neighbour present, so there is no spontaneous generation. Absent bias
  // (or all-zero) reproduces the unbiased rule exactly. This is the lever for
  // breaking the RPS equilibrium to see which element takes over.
  function stepThreshold(grid, active, threshold, bias) {
    next.set(grid);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = grid[idx(c, r)];
        if (s === -1) continue;
        counts.fill(0);
        neighbors(c, r, nb);
        for (let k = 0; k < 6; k++) {
          const nc = nb[k][0], nr = nb[k][1];
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
          const ns = grid[idx(nc, nr)];
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
            // attacker's bias helps; defender (cell s) bias resists -> augmenting
            // an element makes it both spread AND hold ground, so it can dominate.
            const eff = counts[e] + (bias ? bias[e] - bias[s] : 0);
            if (eff > bestK) { best = e; bestK = eff; }
          }
          // A deactivated element decays to empty when no active predator
          // is present, so toggling an element off makes it fade out.
          if (!active[s] && best === -1) { next[idx(c, r)] = EMPTY; continue; }
        }
        if (best >= 0) next[idx(c, r)] = best;
      }
    }
    grid.set(next);
  }

  // `rng` is a () -> [0,1) function (see rng.js); pass a seeded RNG for
  // reproducible stochastic runs. Defaults to Math.random. `bias` weights the
  // neighbour sample: an augmented element (bias>0) is 2^bias times more likely
  // to be the sampled aggressor, a reduced one less likely. Absent/all-zero bias
  // is a uniform sample over valid neighbours (the unbiased rule).
  function stepStochastic(grid, active, rng = Math.random, bias) {
    next.set(grid);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = grid[idx(c, r)];
        if (s === -1) continue;
        neighbors(c, r, nb);
        let totalW = 0;
        for (let k = 0; k < 6; k++) {
          const nc = nb[k][0], nr = nb[k][1];
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) { wbuf[k] = 0; continue; }
          // Uniform neighbour sample. Bias acts purely as defence (selfW below):
          // weighting the *invader* backfires (augmented elements over-extend and
          // collapse), so an augmented element instead just resists absorption.
          wbuf[k] = 1; totalW += 1;
        }
        // The cell can also "win" the sample as itself (defends, no change) with
        // extra weight 2^bias[s]-1, so an augmented element resists absorption.
        let selfW = 0;
        if (bias && s >= 0 && s < EMPTY && bias[s] > 0) { selfW = Math.pow(2, bias[s]) - 1; totalW += selfW; }
        if (totalW <= 0) continue;
        let rp = rng() * totalW;
        if (rp < selfW) continue;
        rp -= selfW;
        let chosen = -1;
        for (let k = 0; k < 6; k++) { rp -= wbuf[k]; if (rp < 0) { chosen = k; break; } }
        if (chosen < 0) continue;
        const pick = grid[idx(nb[chosen][0], nb[chosen][1])];
        if (pick < 0 || pick >= EMPTY || !active[pick]) continue;
        if (s === EMPTY || tournament.beats(pick, s)) next[idx(c, r)] = pick;
      }
    }
    grid.set(next);
  }

  // LIFE — classic 2-state Conway-style Game of Life on the regular 6-neighbour
  // hex grid (used by the monochrome "Life" rule). State 0 = ALIVE, EMPTY = DEAD.
  // `live` counts neighbours whose state is an element (0..EMPTY-1). An alive
  // cell SURVIVES (stays 0) when live ∈ survival set, else dies to EMPTY; a dead
  // cell is BORN (→0) when live ∈ birth set. Sea (-1) cells never change.
  // params: { birth:Set<int>|int[], survive:Set<int>|int[] } over 0..6.
  function stepLife(grid, active, params) {
    const birth = params && params.birth ? params.birth : [2];
    const survive = params && params.survive ? params.survive : [3, 4];
    const inBirth = (v) => (birth.has ? birth.has(v) : birth.indexOf(v) >= 0);
    const inSurv = (v) => (survive.has ? survive.has(v) : survive.indexOf(v) >= 0);
    next.set(grid);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = grid[idx(c, r)];
        if (s === -1) continue;
        neighbors(c, r, nb);
        let live = 0;
        for (let k = 0; k < 6; k++) {
          const nc = nb[k][0], nr = nb[k][1];
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
          const ns = grid[idx(nc, nr)];
          if (ns >= 0 && ns < EMPTY) live++;
        }
        if (s >= 0 && s < EMPTY) {
          next[idx(c, r)] = inSurv(live) ? 0 : EMPTY;
        } else {
          next[idx(c, r)] = inBirth(live) ? 0 : EMPTY;
        }
      }
    }
    grid.set(next);
  }

  function population(grid) {
    const pop = new Array(tournament.n).fill(0);
    let total = 0;
    for (let i = 0; i < size; i++) {
      const s = grid[i];
      if (s >= 0 && s < EMPTY) { pop[s]++; total++; }
    }
    return { pop, total };
  }

  return { stepThreshold, stepStochastic, stepLife, population };
}
