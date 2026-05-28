// rng.js
// Tiny seedable PRNG (mulberry32) so runs are reproducible: the same integer
// seed always yields the same stream. Used to make island generation, the
// random fill, and the stochastic CA step deterministic. A bare Math.random()
// can never reproduce a board; threading one seed through all three closes the
// M1 "same seed -> same evolution" gap.
//
// makeRng(seed) returns a function rng() -> float in [0, 1).

export function makeRng(seed) {
  // Coerce to a 32-bit unsigned integer state.
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience: a fresh random 32-bit seed (for "roll a new one").
export function newSeed() {
  return (Math.random() * 0x100000000) >>> 0;
}
