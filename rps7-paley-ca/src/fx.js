// fx.js — cheap VFD-style board effects shared by both renderers.
//
// cellGlow(i): a STABLE per-cell brightness factor in [0.35, 1.0]. Drawing each
//   cell's colour at this alpha over the black board makes every cell read as an
//   individually-lit element with its own brightness — echoing the 7-seg
//   numerals' per-segment brightness jitter — instead of a flat field of
//   identical fills. Deterministic per index, so it's a fixed texture (no
//   flicker), and a cell keeps its slot as it changes element. The floor was
//   widened from 0.6 → 0.35 for stronger VFD contrast between cells.
//
// bloom(ctx, canvas, w, h): a one-pass self-composite halo. Redraw the canvas
//   onto itself blurred and in 'lighter' mode so lit cells gain a soft glow.
//   One drawImage — far cheaper than per-cell shadowBlur across thousands of
//   cells per frame. Requires an opaque (black-filled) board so blurred black
//   contributes nothing under 'lighter'.

export function cellGlow(i) {
  let h = (i * 2654435761) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
  return 0.35 + 0.65 * (((h >>> 0) & 0xffff) / 0xffff);
}

export function bloom(ctx, canvas, w, h, { blur = 2.5, alpha = 0.45 } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(canvas, 0, 0, w, h);
  ctx.restore();
  ctx.filter = 'none';
}
