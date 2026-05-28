// wheel.js
// The tournament-wheel diagram: the 7 elements as nodes on a circle, with the
// directed dominance edges drawn as arrows. This is the in-UI surfacing of the
// doubly-regular structure described in RESEARCH.md.
//
// IMPORTANT: every edge is read from the tournament object (preyOf / beats).
// Nothing here hard-codes "x beats x+1,x+2,x+4" — change makeTournament and the
// wheel follows. Node colors come from the palette (elements[i].color), so a
// skin swap re-colors the wheel without changing any edge.
//
// Behaviour:
//   - deactivated elements (right-click toggle in main.js) and their edges dim
//   - if the active set contains a cyclic triple, that triple's nodes + the
//     three edges among them are highlighted

export function makeWheel(canvas, tournament) {
  const ctx = canvas.getContext('2d');
  const n = tournament.n;

  // Crisp on retina: render at devicePixelRatio. The CSS box stays at the
  // attribute size; we scale the backing store and the context up by dpr.
  function sizeForDpr() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width;   // logical size from the HTML attributes
    const cssH = canvas.height;
    // Only resize the backing store once / when dpr changes, to avoid clobbering
    // the attribute-derived logical size on every draw.
    if (canvas._logicalW === undefined) {
      canvas._logicalW = cssW;
      canvas._logicalH = cssH;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
    }
    const W = canvas._logicalW, H = canvas._logicalH;
    const wantW = Math.round(W * dpr), wantH = Math.round(H * dpr);
    if (canvas.width !== wantW || canvas.height !== wantH) {
      canvas.width = wantW;
      canvas.height = wantH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { W, H };
  }

  function nodePositions(W, H) {
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) / 2 - 16;
    const pos = [];
    for (let i = 0; i < n; i++) {
      // start at top, go clockwise
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      pos.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
    return pos;
  }

  // Draw a directed edge a -> b (a beats b) with an arrowhead near b.
  function arrow(ax, ay, bx, by, rNode, color, alpha, lw) {
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    // pull endpoints to the node rims
    const sx = ax + ux * rNode, sy = ay + uy * rNode;
    const ex = bx - ux * (rNode + 5), ey = by - uy * (rNode + 5);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // arrowhead
    const ah = 6, aw = 3.2;
    const px = -uy, py = ux;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ux * ah + px * aw, ey - uy * ah + py * aw);
    ctx.lineTo(ex - ux * ah - px * aw, ey - uy * ah - py * aw);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // elements: palette element list; active: boolean[n]; cycleTriple: number[3]
  // or null (a cyclic triple in the active set to highlight).
  function draw(elements, active, cycleTriple) {
    const { W, H } = sizeForDpr();
    ctx.clearRect(0, 0, W, H);
    const pos = nodePositions(W, H);
    const rNode = 11;
    const inCycle = new Set(cycleTriple || []);

    // Edges first, so nodes sit on top.
    for (let a = 0; a < n; a++) {
      for (const b of tournament.preyOf(a)) {
        const live = active[a] && active[b];
        const both = cycleTriple && inCycle.has(a) && inCycle.has(b);
        let alpha, lw, color;
        if (both) { alpha = 0.95; lw = 2.2; color = '#ffffff'; }
        else if (live) { alpha = 0.5; lw = 1.1; color = elements[a].color; }
        else { alpha = 0.08; lw = 1; color = '#666'; }
        arrow(pos[a][0], pos[a][1], pos[b][0], pos[b][1], rNode, color, alpha, lw);
      }
    }

    // Nodes.
    for (let i = 0; i < n; i++) {
      const [x, y] = pos[i];
      const live = active[i];
      const hot = inCycle.has(i);
      ctx.globalAlpha = live ? 1 : 0.22;
      ctx.beginPath();
      ctx.arc(x, y, rNode, 0, Math.PI * 2);
      ctx.fillStyle = elements[i].color;
      ctx.fill();
      if (hot) {
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
      // glyph
      ctx.globalAlpha = live ? 1 : 0.35;
      ctx.fillStyle = '#000';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(elements[i].glyph, x, y + 0.5);
      ctx.globalAlpha = 1;
    }
  }

  return { draw };
}
