// braille.js — the "braille 100%" progress methodology (ported from 01-kai-meta).
// Four Braille glyphs, each filled bottom-up through 9 levels (0..8 dots); the
// four together render a 0..100% bar at fine resolution. Recoloured here to the
// VFD teal ramp (kai-meta used an amber/gold ramp). Pure, no DOM.
//
//   brailleBar(pct) -> HTML string of 4 coloured <span> glyphs.

const FILL = ['⠀', '⡀', '⡄', '⡆', '⡇', '⣇', '⣧', '⣷', '⣿'];
const FULL = '⣿';
const TEAL = {
  dim: '#13322d',  // unlit cell
  def: '#1bf0c8',  // the block currently filling
  d1: '#1aa78f', d2: '#1bc9ab', d3: '#3df3ce', d4: '#9bffe9', // completed blocks, escalating
};

// state n in 0..36 -> { glyphs[4], colors[4] } (kai-meta's stateAt, teal keys)
function stateAt(n) {
  const glyphs = [FULL, FULL, FULL, FULL];
  const colors = ['dim', 'dim', 'dim', 'dim'];
  if (n <= 0) return { glyphs, colors };
  const bs = n - 1, block = Math.floor(bs / 9), inb = bs % 9;
  for (let i = 0; i < block; i++) colors[i] = 'd' + (i + 1);
  if (inb < 8) { glyphs[block] = FILL[inb + 1]; colors[block] = 'def'; }
  else { colors[block] = 'd' + (block + 1); }
  return { glyphs, colors };
}

export function brailleBar(pct) {
  const p = Number.isFinite(pct) ? pct : 0;
  const n = Math.max(0, Math.min(36, Math.round((p / 100) * 36)));
  const s = stateAt(n);
  return s.glyphs.map((g, i) => `<span style="color:${TEAL[s.colors[i]] || TEAL.dim}">${g}</span>`).join('');
}
