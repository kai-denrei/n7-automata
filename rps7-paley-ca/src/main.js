// main.js
import { PALEY7, classifySubset } from './tournament.js';
import { makeHexGrid } from './hex.js';
import { genIsland, fillRandom, clearLand } from './island.js';
import { makeAutomaton } from './automaton.js';
import { PALETTES, DEFAULT_PALETTE } from './palette.js';
import { makeRng, newSeed } from './rng.js';
import { makeWheel } from './wheel.js';
import { makeAutoDirector } from './automode.js';
import { cellGlow, bloom } from './fx.js';

const tournament = PALEY7;
const N = tournament.n;
const EMPTY = N; // sentinel for empty land

let paletteKey = DEFAULT_PALETTE;
let elements = PALETTES[paletteKey].elements;

const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
const HEX = 5;

// --- Retina crispness ------------------------------------------------------
// The canvas attribute width/height are the LOGICAL (CSS-pixel) dimensions.
// Derive cols/rows from these so the cell count never changes, THEN inflate the
// backing store by devicePixelRatio and scale the context, so hexes render
// sharp on retina without altering the simulation grid.
const GRID_CSS_W = canvas.width;   // 680 logical px
const GRID_CSS_H = canvas.height;  // 420 logical px
const cols = Math.floor((GRID_CSS_W - 4) / (Math.sqrt(3) * HEX));
const rows = Math.floor((GRID_CSS_H - 6) / (1.5 * HEX));
const G = makeHexGrid(cols, rows, HEX);

// Inflate the backing store to logical x dpr and scale the context, so drawing
// in logical coords renders sharp. CSS display size is left to the stylesheet
// (the grid is responsive width:100%; the backing store stays >= display x dpr,
// so it never loses crispness when flex shrinks it). The wheel uses a fixed CSS
// size so we pin it here.
function fitCanvasToDpr(cv, c, cssW, cssH, pinCss = false) {
  const dpr = window.devicePixelRatio || 1;
  if (pinCss) { cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px'; }
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvasToDpr(canvas, ctx, GRID_CSS_W, GRID_CSS_H);

const grid = new Int8Array(G.size).fill(-1);
const auto = makeAutomaton(G, tournament, EMPTY);
const director = makeAutoDirector(tournament);

const state = {
  active: new Array(N).fill(true),
  brush: 2,
  brushSize: 4,
  playing: true,
  speed: 12,
  threshold: 2,
  mode: 'threshold',
  step: 0,
  seed: newSeed(),   // current run seed (surfaced in the UI, reproducible)
  bias: new Array(N).fill(0),  // per-element strength: + spreads easier, - harder, 0 = balanced
  auto: false,                 // Auto mode: director introduces antagonists
  autoNote: '',                // last Auto intervention, shown in the status line
};
const history = [];
const HIST_LEN = 240;

// Seeded RNG for the stochastic step. Reset to the run seed whenever the board
// is (re)initialised so a fixed seed reproduces the whole evolution, not just
// the first frame. genIsland takes the seed directly (its own hash noise);
// fillRandom and stepStochastic take this rng function.
let rng = makeRng(state.seed);
function resetRng() { rng = makeRng(state.seed ^ 0x9e3779b9); }

// ---- rendering -------------------------------------------------------------
function drawHex(cx, cy) {
  ctx.beginPath();
  const pts = G.corners(cx, cy);
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GRID_CSS_W, GRID_CSS_H);
  ctx.lineWidth = 0.7;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = G.idx(c, r);
      const s = grid[i];
      if (s === -1) continue;
      const [x, y] = G.centerOf(c, r);
      drawHex(x, y);
      if (s === EMPTY) {
        ctx.strokeStyle = 'rgba(72,72,84,0.16)';
        ctx.stroke();
      } else {
        const col = elements[s].color;
        ctx.globalAlpha = cellGlow(i);   // per-cell brightness jitter (lit elements)
        ctx.fillStyle = col;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.30)';
        ctx.stroke();
      }
    }
  }
  // soft VFD halo over the lit cells
  bloom(ctx, canvas, GRID_CSS_W, GRID_CSS_H, { blur: 2, alpha: 0.4 });
}

const hist = document.getElementById('hist');
const hctx = hist.getContext('2d');
// History canvas: same retina treatment. Logical dims captured before scaling.
const HIST_CSS_W = hist.width;
const HIST_CSS_H = hist.height;
fitCanvasToDpr(hist, hctx, HIST_CSS_W, HIST_CSS_H);

function record() {
  const { pop, total } = auto.population(grid);
  history.push({ pop, total });
  while (history.length > HIST_LEN) history.shift();
  for (let e = 0; e < N; e++) {
    const el = document.getElementById('ct-' + e);
    if (el) el.textContent = pop[e];
  }
  const activeIdx = activeIndices();
  const cls = classifySubset(tournament, activeIdx);
  // Extend the readout: name a Condorcet winner when transitive; estimate an
  // oscillation period when cyclic (peak-to-peak on one element's population).
  let extra = '';
  if (cls.kind === 'transitive' && cls.winner !== undefined && elements[cls.winner]) {
    extra = ` · winner: ${elements[cls.winner].name}`;
  } else if (cls.kind === 'cyclic') {
    const p = estimatePeriod(activeIdx);
    extra = p ? ` · period ~${p}` : ' · period: settling…';
  }
  document.getElementById('status').textContent =
    `step ${state.step} · cells ${total} · ${cls.kind}: ${cls.detail}${extra}` +
    (state.autoNote ? ` · ${state.autoNote}` : '');
  // Keep the wheel in sync with the active set / palette and any cyclic triple.
  const triple = cls.kind === 'cyclic' && cls.cycles && cls.cycles.length ? cls.cycles[0] : null;
  if (wheel) wheel.draw(elements, state.active, triple);
  drawHist();
}

// Peak-to-peak period estimate on the population series of the active element
// with the largest swing. Returns null until there are enough samples / peaks.
function estimatePeriod(activeIdx) {
  if (history.length < 16 || !activeIdx.length) return null;
  // Pick the element with the largest peak-to-trough range across history.
  let bestE = activeIdx[0], bestRange = -1;
  for (const e of activeIdx) {
    let lo = Infinity, hi = -Infinity;
    for (const h of history) { const v = h.pop[e]; if (v < lo) lo = v; if (v > hi) hi = v; }
    const range = hi - lo;
    if (range > bestRange) { bestRange = range; bestE = e; }
  }
  if (bestRange < 4) return null; // too flat to read a cycle
  const series = history.map(h => h.pop[bestE]);
  // Find local maxima (peaks) with a small prominence guard.
  const peaks = [];
  const guard = bestRange * 0.15;
  for (let i = 2; i < series.length - 2; i++) {
    const v = series[i];
    if (v >= series[i - 1] && v >= series[i + 1] &&
        v - series[i - 2] > guard && v - series[i + 2] > guard) {
      peaks.push(i);
    }
  }
  if (peaks.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < peaks.length; i++) sum += peaks[i] - peaks[i - 1];
  return Math.round(sum / (peaks.length - 1));
}

function drawHist() {
  const w = HIST_CSS_W, h = HIST_CSS_H;
  hctx.fillStyle = '#0a0a0c';
  hctx.fillRect(0, 0, w, h);
  if (!history.length) return;
  const colW = w / HIST_LEN;
  let max = 1;
  for (const e of history) if (e.total > max) max = e.total;
  for (let i = 0; i < history.length; i++) {
    let y = h;
    const x = i * colW;
    for (let e = 0; e < N; e++) {
      const v = history[i].pop[e];
      if (!v) continue;
      const ph = (v / max) * h;
      y -= ph;
      hctx.fillStyle = elements[e].color;
      hctx.fillRect(x, y, Math.ceil(colW) + 0.5, ph + 0.5);
    }
  }
}

// ---- simulation control ----------------------------------------------------
function activeIndices() {
  return state.active.map((a, i) => a ? i : -1).filter(i => i >= 0);
}
function step() {
  if (state.mode === 'stochastic') auto.stepStochastic(grid, state.active, rng, state.bias);
  else auto.stepThreshold(grid, state.active, state.threshold, state.bias);
  state.step++;
  record();
  if (state.auto) autoTick();
}
// Auto mode: when the board monopolises (>70%) or goes stable, introduce a
// predator of the dominant element so the dynamics never settle.
function autoTick() {
  const { pop, total } = auto.population(grid);
  const iv = director.tick(pop, total);
  if (!iv) return;
  state.active[iv.antagonist] = true;
  seedElement(iv.antagonist);
  buildLegend();
  state.autoNote = `auto · ${iv.reason}: ${elements[iv.antagonist].name} introduced vs ${elements[iv.dominant].name}`;
}
// Refill all land from a fresh seeded RNG and reset the step/history so a fixed
// seed reproduces both the board AND its subsequent evolution.
function randomize() {
  resetRng();
  fillRandom(grid, EMPTY, activeIndices(), rng);
  history.length = 0;
  state.step = 0;
  record();
  render();
}
function newIsland() {
  genIsland(grid, G, EMPTY, state.seed);
  randomize();
}
function setSeed(s) {
  state.seed = s >>> 0;
  const out = document.getElementById('seedOut');
  if (out) out.textContent = state.seed;
}

function popOf(e) { return auto.population(grid).pop[e]; }

// Introduce an element by dropping a dense seed patch onto the land, so an
// element that is activated / augmented while ABSENT actually has a foothold to
// spread from. A lone cell never propagates under the threshold rule (the README
// gotcha) — a blob does. This is the "introduce a new element" lever: e.g. on a
// board monopolised by one element, seeding + augmenting a predator flips it.
function seedElement(e, radius = 6) {
  const lands = [];
  for (let i = 0; i < grid.length; i++) if (grid[i] !== -1) lands.push(i);
  if (!lands.length) return;
  const ci = lands[(Math.random() * lands.length) | 0];
  const c0 = ci % cols, r0 = (ci / cols) | 0;
  for (let r = r0 - radius; r <= r0 + radius; r++)
    for (let c = c0 - radius; c <= c0 + radius; c++) {
      if (!G.inBounds(c, r)) continue;
      const dx = c - c0, dy = (r - r0) * 0.9;
      if (dx * dx + dy * dy > radius * radius) continue;
      const gi = G.idx(c, r);
      if (grid[gi] !== -1) grid[gi] = e;
    }
}

// ---- brush -----------------------------------------------------------------
let painting = false;
function paint(px, py) {
  const [c0, r0] = G.cellAt(px, py);
  if (c0 < 0) return;
  const bs = state.brushSize;
  for (let r = r0 - bs; r <= r0 + bs; r++)
    for (let c = c0 - bs; c <= c0 + bs; c++) {
      if (!G.inBounds(c, r)) continue;
      const dx = c - c0, dy = (r - r0) * 0.9;
      if (dx * dx + dy * dy > bs * bs) continue;
      if (grid[G.idx(c, r)] !== -1) grid[G.idx(c, r)] = state.brush;
    }
  if (!state.active[state.brush]) { state.active[state.brush] = true; buildLegend(); }
  render();
}
function canvasXY(e) {
  const rect = canvas.getBoundingClientRect();
  // Map client px -> LOGICAL canvas px (centerOf/cellAt work in logical space;
  // the dpr scale is applied to the context, not these coordinates).
  return [(e.clientX - rect.left) * (GRID_CSS_W / rect.width),
          (e.clientY - rect.top) * (GRID_CSS_H / rect.height)];
}
canvas.addEventListener('mousedown', e => { if (e.button === 0) { paint(...canvasXY(e)); painting = true; } });
canvas.addEventListener('mousemove', e => { if (painting) paint(...canvasXY(e)); });
window.addEventListener('mouseup', () => { painting = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---- legend ----------------------------------------------------------------
function buildLegend() {
  const leg = document.getElementById('legend');
  leg.innerHTML = '';
  elements.forEach((el, e) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.active = state.active[e] ? '1' : '0';
    chip.dataset.brush = state.brush === e ? '1' : '0';
    const bv = state.bias[e];
    chip.innerHTML =
      `<div class="glyph" style="color:${el.color}">${el.glyph}</div>` +
      `<div class="name">${el.name}</div>` +
      `<div class="count" id="ct-${e}">0</div>` +
      `<div class="rel" id="rel-${e}"></div>` +
      `<div class="bias ${bv > 0 ? 'pos' : bv < 0 ? 'neg' : 'zero'}">${bv > 0 ? '+' + bv : bv < 0 ? '−' + (-bv) : '0'}</div>` +
      `<div class="ctrls">` +
        `<button type="button" class="cb-m" title="reduce ${el.name}">−</button>` +
        `<button type="button" class="cb-o" title="turn ${el.name} off / on">⊘</button>` +
        `<button type="button" class="cb-p" title="augment ${el.name}">+</button>` +
      `</div>`;
    const clamp = v => Math.max(-3, Math.min(3, v));
    const after = () => { buildLegend(); refreshWheel(); render(); record(); };
    chip.querySelector('.cb-m').onclick = ev => { ev.stopPropagation(); state.bias[e] = clamp(state.bias[e] - 1); after(); };
    chip.querySelector('.cb-p').onclick = ev => { ev.stopPropagation(); state.bias[e] = clamp(state.bias[e] + 1); if (!state.active[e]) state.active[e] = true; if (popOf(e) === 0) seedElement(e); after(); };
    chip.querySelector('.cb-o').onclick = ev => { ev.stopPropagation(); const was = state.active[e]; state.active[e] = !was; if (!was && popOf(e) === 0) seedElement(e); after(); };
    chip.addEventListener('click', () => { state.brush = e; state.active[e] = true; buildLegend(); refreshWheel(); });
    chip.addEventListener('contextmenu', ev => { ev.preventDefault(); const was = state.active[e]; state.active[e] = !was; if (!was && popOf(e) === 0) seedElement(e); after(); });
    chip.addEventListener('mouseenter', () => showRel(e));
    chip.addEventListener('mouseleave', clearRel);
    leg.appendChild(chip);
  });
}
function showRel(e) {
  for (let i = 0; i < N; i++) {
    const rel = document.getElementById('rel-' + i);
    if (!rel) continue;
    if (i === e) { rel.textContent = ''; continue; }
    if (tournament.beats(e, i)) { rel.textContent = '▼'; rel.style.color = elements[e].color; }
    else if (tournament.beats(i, e)) { rel.textContent = '▲'; rel.style.color = elements[i].color; }
    else rel.textContent = '';
  }
}
function clearRel() { for (let i = 0; i < N; i++) { const r = document.getElementById('rel-' + i); if (r) r.textContent = ''; } }

// ---- UI bindings -----------------------------------------------------------
const $ = id => document.getElementById(id);
$('play').onclick = () => { state.playing = !state.playing; $('play').textContent = state.playing ? '⏸ Pause' : '▶ Play'; };
$('stepBtn').onclick = () => { step(); render(); };
$('rand').onclick = () => { randomize(); };
$('clear').onclick = () => { clearLand(grid, EMPTY); history.length = 0; state.step = 0; record(); render(); };
$('reset').onclick = () => { newIsland(); };
$('auto').onclick = () => {
  state.auto = !state.auto;
  director.reset();
  state.autoNote = '';
  if (state.auto && !state.playing) { state.playing = true; $('play').textContent = '⏸ Pause'; }
  $('auto').classList.toggle('on', state.auto);
  $('auto').textContent = state.auto ? 'Auto ●' : 'Auto';
};
$('mode').onchange = e => { state.mode = e.target.value; };
$('palette').onchange = e => { paletteKey = e.target.value; elements = PALETTES[paletteKey].elements; buildLegend(); render(); drawHist(); if (wheel) wheel.draw(elements, state.active, currentTriple()); };
function stepper(downId, upId, outId, lo, hi, step, get, set) {
  const out = $(outId);
  const apply = v => { v = Math.max(lo, Math.min(hi, v)); set(v); if (out) out.textContent = v; };
  if ($(downId)) $(downId).onclick = () => apply(get() - step);
  if ($(upId)) $(upId).onclick = () => apply(get() + step);
  if (out) out.textContent = get();
}
stepper('speed-dn', 'speed-up', 'speedOut', 2, 40, 2, () => state.speed, v => { state.speed = v; });
stepper('thr-dn', 'thr-up', 'thrOut', 1, 4, 1, () => state.threshold, v => { state.threshold = v; });
stepper('brush-dn', 'brush-up', 'brushOut', 1, 10, 1, () => state.brushSize, v => { state.brushSize = v; });

// Seed controls: re-run the same seed (reproducible) or roll a fresh one.
$('seedOut').textContent = state.seed;
$('rerun').onclick = () => { newIsland(); };          // same seed -> identical run
$('newseed').onclick = () => { setSeed(newSeed()); newIsland(); };

// Current cyclic triple in the active set (for the wheel highlight), or null.
function currentTriple() {
  const cls = classifySubset(tournament, activeIndices());
  return cls.kind === 'cyclic' && cls.cycles && cls.cycles.length ? cls.cycles[0] : null;
}

// palette dropdown options
const palSel = $('palette');
Object.entries(PALETTES).forEach(([k, v]) => {
  const o = document.createElement('option');
  o.value = k; o.textContent = v.label;
  if (k === paletteKey) o.selected = true;
  palSel.appendChild(o);
});

// Tournament-wheel diagram (M2). Reads edges from the tournament object; node
// colors come from the palette. Redrawn from record() and on palette / toggle.
const wheel = makeWheel($('wheel'), tournament);
function refreshWheel() { if (wheel) wheel.draw(elements, state.active, currentTriple()); }

// ---- loop ------------------------------------------------------------------
let last = 0;
function loop(t) {
  if (state.playing && t - last > 1000 / state.speed) { step(); last = t; render(); }
  requestAnimationFrame(loop);
}

buildLegend();
newIsland();
requestAnimationFrame(loop);
