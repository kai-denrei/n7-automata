// vfd.js — VFD 7-segment counter (ported from 01-kai-meta, which ported it from
// laifu-keisan's sevenseg.js). Thick rounded-tip hex segments with a multi-pass
// glow + white hot-core, drawn on a canvas. The signature glowing teal number.
//
//   const seg = makeSevenSeg(canvas, { color: '#1bf0c8' });
//   seg.draw(33);   // renders the value, sized to fit the canvas

const SEG_CHAR = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'], '1': ['b', 'c'], '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'], '4': ['f', 'g', 'b', 'c'], '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'c', 'd'], '7': ['a', 'b', 'c'], '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'], '-': ['g'],
};
const SEG_ALL = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const SEG = { thickness: 0.17, aspect: 1.62, gap: 0.28, glowBlur: 16, ghostAlpha: 0.05, jitter: 0.32, coreWhite: 0.9, coreThickness: 0.6 };

function vhash(k) { let h = (k | 0) * 2654435761; h ^= h >>> 16; h = (h * 2246822507) | 0; h ^= h >>> 13; h = (h * 3266489909) | 0; return ((h >>> 0) & 0xfff) / 0xfff; }
function segEnds(seg, w, h, t) {
  const ht = t / 2, hh = h / 2;
  switch (seg) {
    case 'a': return [t, ht, w - t, ht];
    case 'b': return [w - ht, t, w - ht, hh - ht];
    case 'c': return [w - ht, hh + ht, w - ht, h - t];
    case 'd': return [t, h - ht, w - t, h - ht];
    case 'e': return [ht, hh + ht, ht, h - t];
    case 'f': return [ht, t, ht, hh - ht];
    case 'g': return [t, hh, w - t, hh];
  }
  return [0, 0, 0, 0];
}
function vhex(ctx, x1, y1, x2, y2, th) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 0.001) return;
  const ux = dx / len, uy = dy / len, px = -uy, py = ux, h = th / 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + ux * h - px * h, y1 + uy * h - py * h);
  ctx.lineTo(x2 - ux * h - px * h, y2 - uy * h - py * h);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - ux * h + px * h, y2 - uy * h + py * h);
  ctx.lineTo(x1 + ux * h + px * h, y1 + uy * h + py * h);
  ctx.closePath();
}
function vseg(ctx, x1, y1, x2, y2, th, color, bright, on) {
  if (!on) {
    ctx.shadowBlur = 0; ctx.globalAlpha = SEG.ghostAlpha; ctx.fillStyle = color;
    vhex(ctx, x1, y1, x2, y2, th * 0.92); ctx.fill(); ctx.globalAlpha = 1; return;
  }
  ctx.fillStyle = color; ctx.shadowColor = color;
  ctx.globalAlpha = 0.55 * bright; ctx.shadowBlur = SEG.glowBlur; vhex(ctx, x1, y1, x2, y2, th); ctx.fill();
  ctx.globalAlpha = Math.min(1, bright); ctx.shadowBlur = 0; ctx.fill();
  if (SEG.coreWhite > 0) {
    ctx.globalAlpha = Math.min(1, SEG.coreWhite * bright); ctx.fillStyle = '#ffffff';
    vhex(ctx, x1, y1, x2, y2, th * SEG.coreThickness); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}
function vdigit(ctx, ch, x, y, w, h, color, seed) {
  const t = w * SEG.thickness, on = new Set(SEG_CHAR[ch] || []);
  ctx.save(); ctx.translate(x, y);
  for (let i = 0; i < SEG_ALL.length; i++) {
    const [x1, y1, x2, y2] = segEnds(SEG_ALL[i], w, h, t);
    const b = 1 - SEG.jitter * vhash(seed * 7 + i);
    vseg(ctx, x1, y1, x2, y2, t, color, b, on.has(SEG_ALL[i]));
  }
  ctx.restore();
}

export function makeSevenSeg(canvas, { color = '#1bf0c8' } = {}) {
  const ctx = canvas.getContext('2d');
  function draw(value) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth || 150, H = canvas.clientHeight || 84;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const text = String(value), n = text.length, pad = 14;
    let dh = H - pad * 2, dw = dh / SEG.aspect, gp = dw * SEG.gap, tw = n * dw + (n - 1) * gp;
    const maxW = W - pad * 2;
    if (tw > maxW) { const s = maxW / tw; dw *= s; dh *= s; gp = dw * SEG.gap; tw = n * dw + (n - 1) * gp; }
    let x = (W - tw) / 2; const y = (H - dh) / 2;
    for (let j = 0; j < n; j++) { vdigit(ctx, text[j], x, y, dw, dh, color, j * 17 + 3); x += dw + gp; }
  }
  return { draw };
}
