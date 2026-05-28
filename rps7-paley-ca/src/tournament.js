// tournament.js
// Cyclic-dominance ("rock-paper-scissors") relation for N elements.
//
// The default N=7 relation is the Paley / quadratic-residue tournament:
//   element x beats x+1, x+2, x+4 (mod 7)
// because {1,2,4} are the quadratic residues mod 7. This is the unique
// DOUBLY REGULAR tournament on 7 vertices: every element beats exactly 3
// and loses to exactly 3, AND every ordered pair of elements has exactly
// one common predator. That second property is the "2-paradox" — no pair
// of elements can form a dominating coalition, because some third element
// always beats them both. See RESEARCH.md (OEIS A362137, Erdos-Schutte).
//
// A balanced tournament (each element beats as many as it loses) only
// exists for ODD N. This is why 6 factions can never be clean RPS and why
// 7 is the smallest "interesting" size beyond the trivial 3 and 5.

export function makeTournament(n, skipSet) {
  // skipSet: the set of forward offsets d (mod n) for which x beats x+d.
  // For a regular tournament |skipSet| must equal (n-1)/2 and must contain
  // exactly one of {d, n-d} for every d in 1..n-1.
  if (n % 2 === 0) {
    console.warn(`Tournament N=${n} is even; no balanced cyclic relation exists.`);
  }
  const skips = new Set(skipSet);
  const beatsMatrix = Array.from({ length: n }, () => new Uint8Array(n));
  for (let a = 0; a < n; a++) {
    for (let d = 1; d < n; d++) {
      if (skips.has(d)) beatsMatrix[a][(a + d) % n] = 1;
    }
  }
  return {
    n,
    skipSet: [...skips],
    beats: (a, b) => beatsMatrix[a][b] === 1,
    predatorsOf: (x) => {
      const out = [];
      for (let e = 0; e < n; e++) if (beatsMatrix[e][x]) out.push(e);
      return out;
    },
    preyOf: (x) => {
      const out = [];
      for (let e = 0; e < n; e++) if (beatsMatrix[x][e]) out.push(e);
      return out;
    },
    matrix: beatsMatrix,
  };
}

// The canonical N=7 system used by the PoC.
export const PALEY7 = makeTournament(7, [1, 2, 4]);

// N=5 balanced cycle (each beats next 2). Balanced but NOT doubly regular.
export const CYCLE5 = makeTournament(5, [1, 2]);

// N=3 plain rock-paper-scissors.
export const RPS3 = makeTournament(3, [1]);

// ---- Subset analysis -------------------------------------------------------
// Given the set of currently active elements, classify the dynamics.

// All directed 3-cycles among a list of element indices.
export function cyclicTriples(t, elements) {
  const out = [];
  const els = [...elements];
  for (let i = 0; i < els.length; i++)
    for (let j = i + 1; j < els.length; j++)
      for (let k = j + 1; k < els.length; k++) {
        const a = els[i], b = els[j], c = els[k];
        // a 3-set is cyclic iff it is NOT transitive: some rotation a->b->c->a
        if ((t.beats(a, b) && t.beats(b, c) && t.beats(c, a)) ||
            (t.beats(a, c) && t.beats(c, b) && t.beats(b, a))) {
          out.push([a, b, c]);
        }
      }
  return out;
}

// Is there a Condorcet element (one that beats every other active element)?
export function condorcetWinner(t, elements) {
  const els = [...elements];
  for (const a of els) {
    if (els.every((b) => b === a || t.beats(a, b))) return a;
  }
  return null;
}

// High-level label for the active subset, used to drive UI hints.
export function classifySubset(t, elements) {
  const els = [...elements];
  if (els.length <= 1) return { kind: 'trivial', detail: 'single element' };
  if (els.length === 2) {
    const [a, b] = els;
    const winner = t.beats(a, b) ? a : b;
    return { kind: 'transitive', detail: `${winner} dominates`, winner };
  }
  const cw = condorcetWinner(t, els);
  if (cw !== null) return { kind: 'transitive', detail: `Condorcet winner ${cw}`, winner: cw };
  const cyc = cyclicTriples(t, els);
  return { kind: 'cyclic', detail: `${cyc.length} cyclic triple(s), no winner`, cycles: cyc };
}
