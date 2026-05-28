// organic.js — Tab 2: the RPS-7 CA on an organic Stålberg quad grid.
// Self-contained (own controls + state), reusing the shared tournament, palette
// and rng, plus the ported grid kernel (src/grid/*) and the graph CA (graphca).
//
// Pipeline on (re)generate: hex-lattice seed -> quad mesh -> relax -> half-edge
// -> dual cells (organic "hexagons") -> dual adjacency -> seed CA. State lives
// on the dual cells; they are drawn (rounded, Townscaper-style) over the faint
// quad grid. Same dominance, rules, strength-bias and introduce-seed as Tab 1.

import { PALEY7, classifySubset } from './tournament.js';
import { PALETTES, DEFAULT_PALETTE } from './palette.js';
import { makeRng, newSeed } from './rng.js';
import { generateMesh, relax } from './grid/mesh.js';
import { buildHalfEdge } from './grid/halfedge.js';
import { extractDualCells } from './grid/dual.js';
import { makeGraphAutomaton, buildDualAdjacency } from './graphca.js';
import { makeAutoDirector } from './automode.js';
import { makeWheel } from './wheel.js';
import { brailleBar } from './braille.js';
import { makeSevenSeg } from './vfd.js';
import { cellGlow, bloom } from './fx.js';

const tournament = PALEY7;
const N = tournament.n;
const EMPTY = N;

const $ = (id) => document.getElementById(id);
const view = $('view-organic');
const canvas = $('org-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');

  let paletteKey = DEFAULT_PALETTE;
  let elements = PALETTES[paletteKey].elements;

  // Landing experience: start with just two colours on the board, on the
  // Stochastic rule, with Auto engaged so the director grows the cascade.
  const START_PAIR = [0, 4]; // two high-contrast elements to start (Red vs Blue in ROYGBIV)
  const state = {
    active: (() => { const a = new Array(N).fill(false); for (const e of START_PAIR) a[e] = true; return a; })(),
    bias: new Array(N).fill(0),
    brush: 2,
    playing: true,
    speed: 12,
    threshold: 2,
    mode: 'stochastic',
    seed: newSeed(),
    rings: 14,
    step: 0,
    auto: true,
    autoNote: '',
  };

  const director = makeAutoDirector(tournament);
  const orgWheel = $('org-wheel') ? makeWheel($('org-wheel'), tournament) : null;
  const orgSeg = $('org-vfd') ? makeSevenSeg($('org-vfd'), { color: '#1bf0c8' }) : null;

  // mesh-derived data
  let mesh, cells, adj, grid, auto, rng;
  let cellPaths = [];        // Path2D per cell, in logical screen coords
  let gridPath = null;       // faint quad-grid underlay, logical screen coords
  let fit = null;            // { scale, ox, oy, toScreen }

  // ---- generation --------------------------------------------------------
  function regenerate() {
    mesh = generateMesh({ seeder: 'hex', rings: state.rings, spacing: 0.1, seed: state.seed });
    relax(mesh, { n_iters: 90, SIDE_LENGTH: 0.06, PULL_RATE: 0.3 });
    const he = buildHalfEdge(mesh);
    cells = extractDualCells(mesh, he);
    ({ adj } = buildDualAdjacency(mesh, cells));
    grid = new Int8Array(cells.length).fill(EMPTY);
    auto = makeGraphAutomaton(adj, tournament, EMPTY);
    rng = makeRng(state.seed ^ 0x9e3779b9);
    state.step = 0;
    randomize(false);
    fitAndBuildPaths();
  }

  function activeIndices() {
    return state.active.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
  }
  function randomize(refit = true) {
    rng = makeRng(state.seed ^ 0x9e3779b9);
    const act = activeIndices();
    if (act.length) for (let i = 0; i < grid.length; i++) grid[i] = act[(rng() * act.length) | 0];
    state.step = 0;
    if (refit) { record(); render(); }
  }

  // ---- view fit + path building -----------------------------------------
  function fitAndBuildPaths() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    if (cssW <= 0 || cssH <= 0) return; // hidden / not laid out yet
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const [x, y] of mesh.vertices) {
      if (x < minx) minx = x; if (y < miny) miny = y;
      if (x > maxx) maxx = x; if (y > maxy) maxy = y;
    }
    const m = 8;
    const scale = Math.min((cssW - 2 * m) / (maxx - minx || 1), (cssH - 2 * m) / (maxy - miny || 1));
    const ox = (cssW - (maxx - minx) * scale) / 2 - minx * scale;
    const oy = (cssH - (maxy - miny) * scale) / 2 - miny * scale;
    const toScreen = ([x, y]) => [x * scale + ox, y * scale + oy];
    fit = { scale, ox, oy, toScreen };

    // rounded dual-cell paths (Townscaper add_path: midpoints on-curve, centroids control)
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    cellPaths = cells.map((cell) => {
      const p = cell.centroids.map(toScreen);
      const n = p.length;
      const path = new Path2D();
      if (n < 3) return path;
      const s0 = mid(p[n - 1], p[0]);
      path.moveTo(s0[0], s0[1]);
      for (let i = 0; i < n; i++) {
        const ctrl = p[i];
        const end = mid(p[i], p[(i + 1) % n]);
        path.quadraticCurveTo(ctrl[0], ctrl[1], end[0], end[1]);
      }
      path.closePath();
      return path;
    });

    // faint quad-grid underlay (de-duplicated edges)
    gridPath = new Path2D();
    const seen = new Set();
    for (const q of mesh.quads) {
      for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const [ax, ay] = toScreen(mesh.vertices[a]);
        const [bx, by] = toScreen(mesh.vertices[b]);
        gridPath.moveTo(ax, ay); gridPath.lineTo(bx, by);
      }
    }
    render();
  }

  // ---- render ------------------------------------------------------------
  function render() {
    if (!fit) return;
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cssW, cssH);

    // filled organic cells — each lit at its own brightness (VFD-style jitter)
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < grid.length; i++) {
      const s = grid[i];
      const path = cellPaths[i];
      if (!path || s < 0 || s >= EMPTY) continue;
      ctx.globalAlpha = cellGlow(i);
      ctx.fillStyle = elements[s].color;
      ctx.fill(path);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.32)';
      ctx.stroke(path);
    }
    // soft VFD halo over the lit cells (one cheap self-composite pass)
    bloom(ctx, canvas, cssW, cssH, { blur: 2.5, alpha: 0.42 });
    // faint teal quad grid, crisp on top so structure stays readable
    ctx.strokeStyle = 'rgba(27,240,200,0.10)';
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    if (gridPath) ctx.stroke(gridPath);
  }

  // ---- diagnostics -------------------------------------------------------
  function record() {
    const { pop, total } = auto.population(grid);
    let dom = 0;
    for (let e = 1; e < N; e++) if (pop[e] > pop[dom]) dom = e;
    // VFD dominance readout: big 7-seg of the leading element's share + braille bar
    const share = total > 0 ? Math.round((100 * pop[dom]) / total) : 0;
    if (orgSeg) orgSeg.draw(share);
    const ofEl = $('org-vfd-of');
    if (ofEl) ofEl.textContent = total > 0 ? `LEADING ${elements[dom].name.toUpperCase()} · DOMINANCE` : '— DOMINANCE';
    const barEl = $('org-vfd-bar');
    if (barEl) barEl.innerHTML = brailleBar(share);
    const cls = classifySubset(tournament, activeIndices());
    let extra = '';
    if (cls.kind === 'transitive' && cls.winner !== undefined && elements[cls.winner]) {
      extra = ` · winner: ${elements[cls.winner].name}`;
    }
    if (orgWheel) orgWheel.draw(elements, state.active, cls.kind === 'cyclic' && cls.cycles && cls.cycles.length ? cls.cycles[0] : null);
    const st = $('org-status');
    if (st) st.textContent = `step ${state.step} · cells ${total}/${grid.length} · ${cls.kind}: ${cls.detail}${extra}` + (state.autoNote ? ` · ${state.autoNote}` : '');
  }

  // ---- simulation --------------------------------------------------------
  function step() {
    if (state.mode === 'stochastic') auto.stepStochastic(grid, state.active, rng, state.bias);
    else auto.stepThreshold(grid, state.active, state.threshold, state.bias);
    state.step++;
    record();
    if (state.auto) autoTick();
  }
  // Auto mode: introduce a predator of the dominant element on monopoly/stall.
  function autoTick() {
    const { pop, total } = auto.population(grid);
    const iv = director.tick(pop, total);
    if (!iv) return;
    state.active[iv.antagonist] = true;
    seedElement(iv.antagonist);
    updateChips();
    state.autoNote = `auto · ${iv.reason}: ${elements[iv.antagonist].name} vs ${elements[iv.dominant].name}`;
  }
  function popOf(e) { return auto.population(grid).pop[e]; }
  // Introduce: flood a connected blob from a random cell so an absent element
  // has a foothold to spread from (a lone cell can't cross the threshold).
  function seedElement(e) {
    if (!grid.length) return;
    const target = Math.max(20, Math.round(grid.length * 0.04));
    const start = (Math.random() * grid.length) | 0;
    const q = [start]; const seen = new Set([start]); let placed = 0;
    while (q.length && placed < target) {
      const c = q.shift(); grid[c] = e; placed++;
      for (const nb of adj[c]) if (!seen.has(nb)) { seen.add(nb); q.push(nb); }
    }
  }

  // ---- compact legend ----------------------------------------------------
  let orgChips = [];
  function buildLegend() {
    const leg = $('org-legend');
    if (!leg) return;
    leg.innerHTML = '';
    orgChips = [];
    elements.forEach((el, e) => {
      const chip = document.createElement('div');
      chip.className = 'ochip';
      chip.innerHTML =
        `<span class="oglyph" style="color:${el.color}">${el.glyph}</span>` +
        `<span class="obias"></span>` +
        `<button type="button" class="ocb cb-m" title="reduce ${el.name}">−</button>` +
        `<button type="button" class="ocb cb-o" title="off / on ${el.name}">⊘</button>` +
        `<button type="button" class="ocb cb-p" title="augment ${el.name}">+</button>`;
      const clamp = (v) => Math.max(-3, Math.min(3, v));
      chip.querySelector('.cb-m').onclick = (ev) => { ev.stopPropagation(); state.bias[e] = clamp(state.bias[e] - 1); updateChips(); render(); record(); };
      chip.querySelector('.cb-p').onclick = (ev) => { ev.stopPropagation(); state.bias[e] = clamp(state.bias[e] + 1); if (!state.active[e]) state.active[e] = true; if (popOf(e) === 0) seedElement(e); updateChips(); render(); record(); };
      chip.querySelector('.cb-o').onclick = (ev) => { ev.stopPropagation(); const was = state.active[e]; state.active[e] = !was; if (!was && popOf(e) === 0) seedElement(e); updateChips(); render(); record(); };
      chip.addEventListener('click', () => { state.brush = e; state.active[e] = true; updateChips(); });
      orgChips.push(chip);
      leg.appendChild(chip);
    });
    updateChips();
  }
  // Update chips in place (no innerHTML rebuild) so introducing/toggling an
  // element never reflows the legend — this is what removes the "jump".
  function updateChips() {
    orgChips.forEach((chip, e) => {
      chip.dataset.active = state.active[e] ? '1' : '0';
      chip.dataset.brush = state.brush === e ? '1' : '0';
      const b = state.bias[e];
      const bel = chip.querySelector('.obias');
      if (bel) {
        bel.className = 'obias ' + (b > 0 ? 'pos' : b < 0 ? 'neg' : 'zero');
        bel.textContent = b > 0 ? '+' + b : b < 0 ? '−' + (-b) : '0';
      }
    });
  }

  // ---- paint -------------------------------------------------------------
  function pointInPoly(pt, poly) {
    const [px, py] = pt; let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function cellAt(lx, ly) {
    if (!fit) return -1;
    const wx = (lx - fit.ox) / fit.scale, wy = (ly - fit.oy) / fit.scale;
    for (let i = 0; i < cells.length; i++) if (pointInPoly([wx, wy], cells[i].centroids)) return i;
    return -1;
  }
  let painting = false;
  function paintAt(ev) {
    const rect = canvas.getBoundingClientRect();
    const i = cellAt(ev.clientX - rect.left, ev.clientY - rect.top);
    if (i < 0) return;
    grid[i] = state.brush;
    if (!state.active[state.brush]) { state.active[state.brush] = true; updateChips(); }
    render();
  }
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { paintAt(e); painting = true; } });
  canvas.addEventListener('mousemove', (e) => { if (painting) paintAt(e); });
  window.addEventListener('mouseup', () => { painting = false; });

  // ---- controls ----------------------------------------------------------
  function bind() {
    $('org-play').onclick = () => { state.playing = !state.playing; $('org-play').textContent = state.playing ? '⏸ Pause' : '▶ Play'; };
    $('org-step').onclick = () => { step(); render(); };
    $('org-rand').onclick = () => randomize();
    $('org-regen').onclick = () => { state.seed = newSeed(); regenerate(); buildLegend(); };
    $('org-auto').onclick = () => {
      state.auto = !state.auto; director.reset(); state.autoNote = '';
      if (state.auto && !state.playing) { state.playing = true; $('org-play').textContent = '⏸ Pause'; }
      $('org-auto').classList.toggle('on', state.auto);
      $('org-auto').textContent = state.auto ? 'Auto ●' : 'Auto';
    };
    $('org-mode').onchange = (e) => { state.mode = e.target.value; };
    const stepper = (downId, upId, outId, lo, hi, step, get, set, after) => {
      const out = $(outId);
      const apply = (v) => { v = Math.max(lo, Math.min(hi, v)); const changed = v !== get(); set(v); if (out) out.textContent = v; if (changed && after) after(); };
      if ($(downId)) $(downId).onclick = () => apply(get() - step);
      if ($(upId)) $(upId).onclick = () => apply(get() + step);
      if (out) out.textContent = get();
    };
    stepper('org-speed-dn', 'org-speed-up', 'org-speedOut', 2, 40, 2, () => state.speed, (v) => { state.speed = v; });
    stepper('org-thr-dn', 'org-thr-up', 'org-thrOut', 1, 4, 1, () => state.threshold, (v) => { state.threshold = v; });
    stepper('org-rings-dn', 'org-rings-up', 'org-ringsOut', 6, 22, 1, () => state.rings, (v) => { state.rings = v; }, () => { regenerate(); buildLegend(); });
    const palSel = $('org-palette');
    Object.entries(PALETTES).forEach(([k, v]) => {
      const o = document.createElement('option'); o.value = k; o.textContent = v.label;
      if (k === paletteKey) o.selected = true; palSel.appendChild(o);
    });
    palSel.onchange = (e) => { paletteKey = e.target.value; elements = PALETTES[paletteKey].elements; buildLegend(); render(); record(); };
    // reflect the landing defaults on the controls
    $('org-mode').value = state.mode;
    $('org-auto').classList.toggle('on', state.auto);
    $('org-auto').textContent = state.auto ? 'Auto ●' : 'Auto';
  }

  // ---- loop --------------------------------------------------------------
  let last = 0;
  function loop(t) {
    const visible = view && !view.hasAttribute('hidden');
    if (visible && state.playing && t - last > 1000 / state.speed) { step(); last = t; render(); }
    requestAnimationFrame(loop);
  }

  // refit when the tab becomes visible / window resizes
  window.addEventListener('resize', () => { if (view && !view.hasAttribute('hidden')) fitAndBuildPaths(); });

  bind();
  regenerate();
  buildLegend();
  record();
  requestAnimationFrame(loop);
}
