// automode.js — the "Auto" director. Watches the population each step and, when
// the board is heading nowhere interesting, introduces an ANTAGONIST of whatever
// element is winning, to keep the dynamics alive indefinitely.
//
// Triggers (whichever comes first, after a cooldown):
//   1. monopoly — the dominant element exceeds `monopoly` (default 0.70) of the
//      occupied board.
//   2. stable balance — every element's population has barely moved (range over
//      the last `window` steps is below `stableFrac` of the board): the system
//      has frozen / settled, so nothing new will happen on its own.
//
// On a trigger it picks an antagonist = a PREDATOR of the dominant element (one
// that beats it), preferring the predator with the LOWEST current population (the
// most absent → the most dramatic re-introduction). The caller activates + seeds
// it. A cooldown then runs so the introduced wave has time to act before the
// director re-evaluates — if the antagonist itself monopolises, the next trigger
// introduces ITS predator, giving an endless rock-paper-scissors cascade.
//
// Pure logic, no DOM: tick(pop, total) -> null | { antagonist, dominant, reason }.

export function makeAutoDirector(tournament, opts = {}) {
  const {
    window: W = 40,
    monopoly = 0.70,
    stableFrac = 0.015,
    cooldownSteps = 80,
  } = opts;

  let hist = [];      // recent pop snapshots
  let cooldown = 0;

  function reset() { hist = []; cooldown = 0; }

  function isStable(total) {
    if (hist.length < W) return false;
    const n = hist[0].length;
    for (let e = 0; e < n; e++) {
      let lo = Infinity, hi = -Infinity;
      for (const p of hist) { const v = p[e]; if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi - lo > total * stableFrac) return false;
    }
    return true;
  }

  function tick(pop, total) {
    if (!total || total <= 0) return null;
    hist.push(pop.slice());
    if (hist.length > W) hist.shift();

    if (cooldown > 0) { cooldown--; return null; }

    let dom = 0;
    for (let e = 1; e < pop.length; e++) if (pop[e] > pop[dom]) dom = e;
    const share = pop[dom] / total;

    let reason = null;
    if (share > monopoly) reason = 'monopoly';
    else if (isStable(total)) reason = 'stable';
    if (!reason) return null;

    // antagonist = predator of the dominant element with the lowest population
    const preds = tournament.predatorsOf(dom);
    if (!preds.length) return null;
    let ant = preds[0];
    for (const p of preds) if (pop[p] < pop[ant]) ant = p;

    cooldown = cooldownSteps;
    hist = [];
    return { antagonist: ant, dominant: dom, reason, share };
  }

  return { tick, reset };
}
