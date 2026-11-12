/* =====================================================================
   SVG WARS · world
   Battlefield state, the unit spatial grid, terrain tiles, line of
   sight, and pathfinding. Nothing in here knows about specific units.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, W = FO.W, H = FO.H, T = FO.TILE;
const TC = W / T, TR = H / T;                     // tile columns / rows
const NS = 10, NC = W / NS + 1, NR = H / NS + 1;  // nav lattice: a node every 10 units, on tile edges and centres
const NN = NC * NR;
const CELL = 50, GC = Math.ceil(W / CELL), GR = Math.ceil(H / CELL);

const world = FO.world = {
  TC, TR,
  units: [], shots: [], fx: [],
  tiles: new Uint8Array(TC * TR),   // terrain index per tile, 0 = bare ground
  tileVersion: 1,
  time: 0, mode: 'edit',            // edit | running | paused | over
  fightMode: 'teams', ffa: false, nextId: 1,   // ffa mirrors fightMode === 'ffa'
  shake: 0, result: null,
  navNeeded: false,
};

/* ---------- unit spatial grid ---------- */
const grid = Array.from({ length: GC * GR }, () => []);
const usedCells = [];                              // cells holding anybody, so a rebuild only has to clear those
function cellOf(x, y) {
  let cx = (x / CELL) | 0, cy = (y / CELL) | 0;
  if (cx < 0) cx = 0; else if (cx >= GC) cx = GC - 1;
  if (cy < 0) cy = 0; else if (cy >= GR) cy = GR - 1;
  return cy * GC + cx;
}
world.rebuildGrid = function () {
  for (let i = 0; i < usedCells.length; i++) grid[usedCells[i]].length = 0;
  usedCells.length = 0;
  const us = world.units;
  let maxR = 0;
  for (let i = 0; i < us.length; i++) {
    const u = us[i]; if (!u.alive) continue;
    const c = grid[cellOf(u.x, u.y)];
    if (!c.length) usedCells.push(cellOf(u.x, u.y));
    c.push(u);
    if (u.def.r > maxR) maxR = u.def.r;
  }
  world.liveMaxR = maxR;                           // the biggest radius actually on the field right now
};
world.gridAdd = u => { const k = cellOf(u.x, u.y), c = grid[k]; if (!c.length) usedCells.push(k); c.push(u); if (u.def.r > (world.liveMaxR || 0)) world.liveMaxR = u.def.r; };
// The raw grid, for the one loop hot enough to skip forNear's callback (the overlap pass in sim.js).
world.grid = { cells: grid, CELL, GC, GR };
// Calls fn(unit) for every unit in cells touching the circle. Return false from fn to stop early.
world.forNear = function (x, y, rad, fn) {
  const x0 = Math.max(0, ((x - rad) / CELL) | 0), x1 = Math.min(GC - 1, ((x + rad) / CELL) | 0);
  const y0 = Math.max(0, ((y - rad) / CELL) | 0), y1 = Math.min(GR - 1, ((y + rad) / CELL) | 0);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const c = grid[cy * GC + cx];
    for (let i = 0; i < c.length; i++) if (fn(c[i]) === false) return;
  }
};

/* =====================================================================
   TERRAIN TILES
   ===================================================================== */
const solid = new Uint8Array(TC * TR);      // 1 = blocks movement
const blockShot = new Uint8Array(TC * TR);  // 1 = always stops shots, 2 = cover (stops shots passing through)
const hazard = new Uint8Array(TC * TR);
const breakT = new Uint8Array(TC * TR);    // 1 = can be smashed or blown up
const tileHp = new Float32Array(TC * TR);  // damage taken so far by breakable tiles (0 = untouched)
const TILE_HP = 70;
const clearance = new Float32Array(NN);     // distance from each nav node to the nearest solid thing
// Summed-area tables over the tile flags. A line can only touch tiles inside its bounding box, so when the box holds
// none of a flag the line checks below can answer at once. They are rebuilt with the flags; the only change made
// to a flag between rebuilds clears it, so a table can over-count but never miss.
const satSolid = new Int32Array((TC + 1) * (TR + 1)), satShot = new Int32Array((TC + 1) * (TR + 1)), satHaz = new Int32Array((TC + 1) * (TR + 1));
function buildSat(sat, flag) {
  for (let ty = 0; ty < TR; ty++) {
    let row = 0;
    for (let tx = 0; tx < TC; tx++) {
      row += flag[ty * TC + tx] ? 1 : 0;
      sat[(ty + 1) * (TC + 1) + tx + 1] = sat[ty * (TC + 1) + tx + 1] + row;
    }
  }
}
// Any flagged tile among the tiles a line from (x0,y0) to (x1,y1) could touch? Uses the same truncation as the line loops.
function anyInBox(sat, x0, y0, x1, y1) {
  let a = (Math.min(x0, x1) / T) | 0, b = (Math.max(x0, x1) / T) | 0, c = (Math.min(y0, y1) / T) | 0, d = (Math.max(y0, y1) / T) | 0;
  if (a < 0) a = 0; if (c < 0) c = 0; if (b > TC - 1) b = TC - 1; if (d > TR - 1) d = TR - 1;
  if (a > b || c > d) return false;
  const W1 = TC + 1;
  return sat[(d + 1) * W1 + b + 1] - sat[c * W1 + b + 1] - sat[(d + 1) * W1 + a] + sat[c * W1 + a] > 0;
}
const navCost = new Float32Array(NN);       // movement cost multiplier at each node
let derivedDirty = true, anySolid = false, anyHazard = false;
const MAXC = 60;

world.tileIndex = (x, y) => {
  const tx = (x / T) | 0, ty = (y / T) | 0;
  return (tx < 0 || ty < 0 || tx >= TC || ty >= TR) ? -1 : ty * TC + tx;
};
world.terrainAt = (x, y) => { const i = world.tileIndex(x, y); return i < 0 ? null : FO.terrain[world.tiles[i]]; };
// Which tiles changed since the renderer last looked: 'all', or a rectangle { x0, y0, x1, y1 } so it can repaint just that part.
world.dirtyTiles = 'all';
function mark(x0, y0, x1, y1) {
  const d = world.dirtyTiles;
  if (d === 'all') return;
  if (!d) world.dirtyTiles = { x0, y0, x1, y1 };
  else { d.x0 = Math.min(d.x0, x0); d.y0 = Math.min(d.y0, y0); d.x1 = Math.max(d.x1, x1); d.y1 = Math.max(d.y1, y1); }
}
world.touchTiles = partial => { world.tileVersion++; derivedDirty = true; fields.clear(); if (!partial) world.dirtyTiles = 'all'; };
// Change single tiles (terrain reactions do this), then commit once so paths and pictures are rebuilt a single time.
let pendingTiles = false;
world.setTile = (i, id) => {
  if (world.tiles[i] === id) return false;
  world.tiles[i] = id; tileHp[i] = 0; mark(i % TC, (i / TC) | 0, i % TC, (i / TC) | 0); pendingTiles = true;
  return true;
};
world.commitTiles = () => { if (pendingTiles) { pendingTiles = false; world.touchTiles(true); } };
world.resetTileDamage = () => { tileHp.fill(0); };

// Paint terrain index `id` (0 erases) into every tile whose centre is inside the brush. Returns true if anything changed.
// With keep = true, tiles that already hold terrain are left alone.
world.paintTiles = function (x, y, rad, id, keep) {
  let changed = false;
  const r = Math.max(rad, T * 0.5);
  const x0 = Math.max(0, ((x - r) / T) | 0), x1 = Math.min(TC - 1, ((x + r) / T) | 0);
  const y0 = Math.max(0, ((y - r) / T) | 0), y1 = Math.min(TR - 1, ((y + r) / T) | 0);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
    if ((cx - x) ** 2 + (cy - y) ** 2 > r * r && !(((x / T) | 0) === tx && ((y / T) | 0) === ty)) continue;
    const i = ty * TC + tx;
    if (world.tiles[i] !== id && !(keep && world.tiles[i] !== 0)) { world.tiles[i] = id; changed = true; }
  }
  if (changed) { mark(x0, y0, x1, y1); world.touchTiles(true); }
  return changed;
};

function ensureDerived() {
  if (!derivedDirty) return;
  derivedDirty = false; anySolid = false; anyHazard = false;
  const tiles = world.tiles;
  for (let i = 0; i < tiles.length; i++) {
    const d = FO.terrain[tiles[i]];
    solid[i] = d && d.solid ? 1 : 0;
    breakT[i] = d && d.breakable ? 1 : 0;
    if (!breakT[i]) tileHp[i] = 0;
    blockShot[i] = d ? (d.blockShot === 'hard' ? 1 : d.blockShot === 'cover' ? 2 : 0) : 0;
    hazard[i] = d && d.hazard ? 1 : 0;
    if (solid[i]) anySolid = true;
    if (hazard[i]) anyHazard = true;
  }
  buildSat(satSolid, solid); buildSat(satShot, blockShot); buildSat(satHaz, hazard);
  // clearance: start from distance to the field edge, then pull down around every solid tile
  for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) {
    const x = i * NS, y = j * NS;
    clearance[j * NC + i] = Math.min(MAXC, x, W - x, y, H - y);
  }
  if (anySolid) {
    const span = Math.ceil(MAXC / NS);
    for (let ty = 0; ty < TR; ty++) for (let tx = 0; tx < TC; tx++) {
      if (!solid[ty * TC + tx]) continue;
      const rx0 = tx * T, ry0 = ty * T, rx1 = rx0 + T, ry1 = ry0 + T;
      const i0 = Math.max(0, tx * 2 - span), i1 = Math.min(NC - 1, tx * 2 + 2 + span);
      const j0 = Math.max(0, ty * 2 - span), j1 = Math.min(NR - 1, ty * 2 + 2 + span);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = i * NS, y = j * NS;
        const dx = x < rx0 ? rx0 - x : x > rx1 ? x - rx1 : 0, dy = y < ry0 ? ry0 - y : y > ry1 ? y - ry1 : 0;
        const d = Math.hypot(dx, dy), n = j * NC + i;
        if (d < clearance[n]) clearance[n] = d;
      }
    }
  }
  // movement cost: average of the (up to four) tiles touching each node
  for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) {
    let sum = 0, cnt = 0;
    for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) {
      const tx = ((i * NS) / T | 0) + ((i % 2 === 0) ? ox : 0), ty = ((j * NS) / T | 0) + ((j % 2 === 0) ? oy : 0);
      if (tx < 0 || ty < 0 || tx >= TC || ty >= TR) continue;
      const d = FO.terrain[tiles[ty * TC + tx]];
      sum += d ? d.navCost : 1; cnt++;
    }
    navCost[j * NC + i] = cnt ? sum / cnt : 1;
  }
  world.navNeeded = anySolid || anyHazard;
}
world.ensureDerived = ensureDerived;
// Centre of the nearest tile of terrain index `idx` within R, or null.
world.nearestTile = function (x, y, idx, R) {
  const x0 = Math.max(0, ((x - R) / T) | 0), x1 = Math.min(TC - 1, ((x + R) / T) | 0);
  const y0 = Math.max(0, ((y - R) / T) | 0), y1 = Math.min(TR - 1, ((y + R) / T) | 0);
  let best = null, bd = R;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (world.tiles[ty * TC + tx] !== idx) continue;
    const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T, d = Math.hypot(cx - x, cy - y);
    if (d < bd) { bd = d; best = { x: cx, y: cy, d }; }
  }
  return best;
};

world.solidAt = (x, y) => { const i = world.tileIndex(x, y); return i < 0 ? true : solid[i] === 1; };
// Can a circle of radius r sit here without overlapping a solid tile?
world.fits = function (x, y, r) {
  ensureDerived();
  if (!anySolid) return true;
  const x0 = Math.max(0, ((x - r) / T) | 0), x1 = Math.min(TC - 1, ((x + r) / T) | 0);
  const y0 = Math.max(0, ((y - r) / T) | 0), y1 = Math.min(TR - 1, ((y + r) / T) | 0);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solid[ty * TC + tx]) continue;
    const cx = FO.clamp(x, tx * T, tx * T + T), cy = FO.clamp(y, ty * T, ty * T + T);
    if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) return false;
  }
  return true;
};
// The first solid tile on the way from A to B, if it is one that can be broken down.
world.firstBreakable = function (x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
  for (let k = 0; k <= n; k++) {
    const i = world.tileIndex(x0 + dx * k / n, y0 + dy * k / n);
    if (i >= 0 && solid[i]) return breakT[i] ? { i, x: (i % TC + 0.5) * T, y: (((i / TC) | 0) + 0.5) * T } : null;
  }
  return null;
};
// No breakable tile on the straight line: the handiest one within R that is on the way (not further from the goal than we are).
world.breakableNear = function (x0, y0, x1, y1, R) {
  ensureDerived();
  const far = Math.hypot(x1 - x0, y1 - y0) + 20;
  let best = null, bs = Infinity;
  for (let ty = Math.max(0, ((y0 - R) / T) | 0); ty <= Math.min(TR - 1, ((y0 + R) / T) | 0); ty++) for (let tx = Math.max(0, ((x0 - R) / T) | 0); tx <= Math.min(TC - 1, ((x0 + R) / T) | 0); tx++) {
    const i = ty * TC + tx; if (!breakT[i]) continue;
    const x = (tx + 0.5) * T, y = (ty + 0.5) * T, a = Math.hypot(x - x0, y - y0), b = Math.hypot(x1 - x, y1 - y);
    if (a > R || b > far) continue;
    if (a + b < bs) { bs = a + b; best = { i, x, y }; }
  }
  return best;
};
// Chip away at one breakable tile. Returns true when it gives way.
world.hitTile = function (i, dmg) {
  if (!breakT[i] || world.tiles[i] === 0) return true;
  const x = (i % TC + 0.5) * T, y = (((i / TC) | 0) + 0.5) * T;
  tileHp[i] += dmg;
  if (tileHp[i] < TILE_HP) { FO.emit('tile-hit', x, y); return false; }
  world.tiles[i] = 0; tileHp[i] = 0; mark(i % TC, (i / TC) | 0, i % TC, (i / TC) | 0); world.touchTiles(true); FO.emit('tile-broken', x, y, i);
  return true;
};
// Destroy breakable tiles inside a circle (explosions do this).
world.breakTiles = function (x, y, R) {
  ensureDerived();
  let n = 0;
  const x0 = Math.max(0, ((x - R) / T) | 0), x1 = Math.min(TC - 1, ((x + R) / T) | 0);
  const y0 = Math.max(0, ((y - R) / T) | 0), y1 = Math.min(TR - 1, ((y + R) / T) | 0);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const i = ty * TC + tx, cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
    if (!breakT[i] || (cx - x) ** 2 + (cy - y) ** 2 > R * R) continue;
    world.tiles[i] = 0; n++; FO.emit('tile-broken', cx, cy, i);
  }
  if (n) { mark(x0, y0, x1, y1); world.touchTiles(true); }
  return n;
};
// Push a unit out of any solid tiles it overlaps.
world.resolveTiles = function (u) {
  if (!anySolid) return;
  const r = u.def.r;
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    const x0 = Math.max(0, ((u.x - r) / T) | 0), x1 = Math.min(TC - 1, ((u.x + r) / T) | 0);
    const y0 = Math.max(0, ((u.y - r) / T) | 0), y1 = Math.min(TR - 1, ((u.y + r) / T) | 0);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!solid[ty * TC + tx]) continue;
      const rx = tx * T, ry = ty * T;
      const cx = FO.clamp(u.x, rx, rx + T), cy = FO.clamp(u.y, ry, ry + T);
      let dx = u.x - cx, dy = u.y - cy, d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      const ti = ty * TC + tx;
      if (breakT[ti] && r >= 24) {          // giants walk straight through barricades
        world.tiles[ti] = 0; solid[ti] = 0; breakT[ti] = 0; world.tileVersion++; derivedDirty = true; fields.clear();
        FO.emit('tile-broken', rx + T / 2, ry + T / 2); continue;
      }
      if (d2 < 1e-6) {            // centre is inside the tile: leave through the nearest open side
        const opts = [[-1, 0, u.x - rx], [1, 0, rx + T - u.x], [0, -1, u.y - ry], [0, 1, ry + T - u.y]];
        let best = null;
        for (const o of opts) {
          const nx = tx + o[0], ny = ty + o[1];
          const blocked = nx < 0 || ny < 0 || nx >= TC || ny >= TR || solid[ny * TC + nx];
          const score = o[2] + (blocked ? 1000 : 0);
          if (!best || score < best[3]) best = [o[0], o[1], o[2], score];
        }
        u.x += best[0] * (best[2] + r * 0.5); u.y += best[1] * (best[2] + r * 0.5);
      } else {
        const d = Math.sqrt(d2), push = r - d; dx /= d; dy /= d;
        u.x += dx * push; u.y += dy * push;
        const vn = u.kx * dx + u.ky * dy; if (vn < 0) { u.kx -= vn * dx * 1.4; u.ky -= vn * dy * 1.4; }
      }
      moved = true;
    }
    if (!moved) break;
  }
};

/* =====================================================================
   LINE OF SIGHT
   ===================================================================== */
// Any solid tile on the straight line?
world.solidBetween = function (x0, y0, x1, y1) {
  if (!anySolid || !anyInBox(satSolid, x0, y0, x1, y1)) return false;
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
  for (let i = 0; i <= n; i++) {
    const x = x0 + dx * i / n, y = y0 + dy * i / n;
    const tx = (x / T) | 0, ty = (y / T) | 0;
    if (tx >= 0 && ty >= 0 && tx < TC && ty < TR && solid[ty * TC + tx]) return true;
  }
  return false;
};
// Where does a shot along this line stop? Returns null when it is clear.
// Hard blockers always stop it; cover (trees) only stops shots that pass through, so units at the edge can still fight.
const COVER_EDGE = 34;
world.shotBlocked = function (x0, y0, x1, y1) {
  ensureDerived();
  if (!anyInBox(satShot, x0, y0, x1, y1)) return null;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(len / 5));
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = x0 + dx * k, y = y0 + dy * k;
    const tx = (x / T) | 0, ty = (y / T) | 0;
    if (tx < 0 || ty < 0 || tx >= TC || ty >= TR) continue;
    const b = blockShot[ty * TC + tx];
    if (b === 1 || (b === 2 && k * len > COVER_EDGE && (1 - k) * len > COVER_EDGE)) return { x, y };
  }
  return null;
};
world.shotTileAt = (x, y) => { const i = world.tileIndex(x, y); return i < 0 ? 0 : blockShot[i]; };
world.hazardBetween = function (x0, y0, x1, y1) {
  if (!anyHazard || !anyInBox(satHaz, x0, y0, x1, y1)) return false;
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
  for (let i = 1; i <= n; i++) {
    const idx = world.tileIndex(x0 + dx * i / n, y0 + dy * i / n);
    if (idx >= 0 && hazard[idx]) return true;
  }
  return false;
};
function clearAt(x, y) {
  let fx = x / NS, fy = y / NS;
  if (fx < 0) fx = 0; else if (fx > NC - 1.001) fx = NC - 1.001;
  if (fy < 0) fy = 0; else if (fy > NR - 1.001) fy = NR - 1.001;
  const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, n = j * NC + i;
  return (clearance[n] * (1 - u) + clearance[n + 1] * u) * (1 - v) + (clearance[n + NC] * (1 - u) + clearance[n + NC + 1] * u) * v;
}
// Can a circle of radius `rad` slide along the straight line without touching anything solid?
world.walkClear = function (x0, y0, x1, y1, rad) {
  if (!anySolid) return true;
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
  for (let i = 1; i <= n; i++) if (clearAt(x0 + dx * i / n, y0 + dy * i / n) < rad) return false;
  return true;
};

/* =====================================================================
   PATHFINDING
   Team battles: one distance field per (side, unit size), built with
   Dijkstra from every enemy at once. Units walk downhill.
   Free-for-all: A* per unit toward its own target, cached briefly.
   Size classes mean big units never route through gaps they can't fit.
   ===================================================================== */
const classOf = r => Math.min(4, Math.max(0, Math.ceil(r / 10) - 1));
const passThr = cls => (cls + 1) * 10 - 0.5;
const fields = new Map();
const seedMark = new Int32Array(NN); let seedStamp = 0;

// Binary min-heap of (node, key), on typed arrays that are kept between uses and grow when needed.
let heapK = new Float64Array(1 << 15), heapV = new Int32Array(1 << 15);
class Heap {
  constructor() { this.n = 0; }
  get size() { return this.n; }
  topKey() { return heapK[0]; }
  push(v, k) {
    if (this.n === heapV.length) { const k2 = new Float64Array(this.n * 2), v2 = new Int32Array(this.n * 2); k2.set(heapK); v2.set(heapV); heapK = k2; heapV = v2; }
    const K = heapK, V = heapV; let i = this.n++;
    while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= k) break; K[i] = K[p]; V[i] = V[p]; i = p; }
    K[i] = k; V[i] = v;
  }
  pop() {
    const K = heapK, V = heapV, top = V[0], n = --this.n, lk = K[n], lv = V[n];
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && K[c + 1] < K[c]) c++;
        if (K[c] >= lk) break;
        K[i] = K[c]; V[i] = V[c]; i = c;
      }
      K[i] = lk; V[i] = lv;
    }
    return top;
  }
}

function buildField(side, cls) {
  const thr = passThr(cls), d = new Float32Array(NN).fill(Infinity), heap = new Heap();
  const R = thr + 12, span = Math.ceil(R / NS);
  seedStamp++;
  for (const o of world.units) {
    if (!o.alive || o.side === side) continue;
    const ci = Math.round(o.x / NS), cj = Math.round(o.y / NS), key = cj * NC + ci;
    if (key < 0 || key >= NN || seedMark[key] === seedStamp) continue;
    seedMark[key] = seedStamp;
    for (let j = cj - span; j <= cj + span; j++) for (let i = ci - span; i <= ci + span; i++) {
      if (i < 0 || j < 0 || i >= NC || j >= NR) continue;
      const x = i * NS, y = j * NS, dd = Math.hypot(x - o.x, y - o.y);
      if (dd > R || world.solidBetween(o.x, o.y, x, y)) continue;
      const n = j * NC + i, v = Math.fround(dd / NS);
      if (v < d[n]) { d[n] = v; heap.push(n, v); }
    }
  }
  while (heap.size) {
    const dc = heap.topKey(), c = heap.pop();
    if (dc > d[c]) continue;
    const cx = c % NC, cy = (c / NC) | 0, cc = navCost[c];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = cx + ox, ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= NC || ny >= NR) continue;
      const n = ny * NC + nx;
      if (clearance[n] < thr) continue;
      if (ox && oy && (clearance[cy * NC + nx] < thr || clearance[ny * NC + cx] < thr)) continue;   // no corner cutting
      const nd = Math.fround(dc + (ox && oy ? 1.4142 : 1) * (cc + navCost[n]) * 0.5);
      if (nd < d[n]) { d[n] = nd; heap.push(n, nd); }
    }
  }
  return d;
}
function getField(side, cls) {
  const key = side + '|' + cls, f = fields.get(key);
  if (f && world.time - f.t < 0.4) return f.d;
  const d = buildField(side, cls);
  fields.set(key, { d, t: world.time });
  return d;
}
world.clearFields = () => fields.clear();

// A nav node near the unit that it can reach in a straight line. `score(n)` ranks candidates.
function startNode(u, score) {
  const ci = Math.round(u.x / NS), cj = Math.round(u.y / NS);
  let best = -1, bs = Infinity;
  for (let ring = 1; ring <= 2 && best < 0; ring++) {
    for (let j = cj - ring; j <= cj + ring; j++) for (let i = ci - ring; i <= ci + ring; i++) {
      if (i < 0 || j < 0 || i >= NC || j >= NR) continue;
      const n = j * NC + i, s0 = score(n);
      if (!isFinite(s0)) continue;
      const x = i * NS, y = j * NS;
      if (world.solidBetween(u.x, u.y, x, y)) continue;
      const s = s0 + Math.hypot(x - u.x, y - u.y) / NS;
      if (s < bs) { bs = s; best = n; }
    }
  }
  return best;
}
const nodeXY = n => ({ x: (n % NC) * NS, y: ((n / NC) | 0) * NS });
// Furthest point along `nodes` (from index a to b) the unit can walk straight to.
function farthestVisible(u, nodes, a, b) {
  const rad = u.def.r * 0.9;
  for (let i = Math.min(b, nodes.length - 1); i > a; i--) {
    const p = nodeXY(nodes[i]);
    if (world.walkClear(u.x, u.y, p.x, p.y, rad)) return p;
  }
  return nodeXY(nodes[Math.min(a + 1, nodes.length - 1)]);
}

function fieldWaypoint(u) {
  const cls = classOf(u.def.r), d = getField(u.side, cls);
  const start = startNode(u, n => d[n]);
  if (start < 0 || d[start] < 2) return null;
  const path = [start];
  let cur = start;
  for (let k = 0; k < 14; k++) {
    const cx = cur % NC, cy = (cur / NC) | 0;
    let best = -1, bv = d[cur];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = cx + ox, ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= NC || ny >= NR) continue;
      const n = ny * NC + nx;
      if (ox && oy && (!isFinite(d[cy * NC + nx]) || !isFinite(d[ny * NC + cx]))) continue;
      if (d[n] < bv) { bv = d[n]; best = n; }
    }
    if (best < 0) break;
    path.push(best); cur = best;
  }
  return farthestVisible(u, path, -1, path.length - 1);
}

/* ---------- A* (free-for-all) ---------- */
const gScore = new Float32Array(NN), gStamp = new Int32Array(NN), parent = new Int32Array(NN), closed = new Int32Array(NN);
let aStamp = 0;
world.astarBudget = 0;
function astar(u, tg) {
  const cls = classOf(u.def.r), thr = passThr(cls), heap = new Heap();
  const goalR = Math.max(14, thr + 12), gx = tg.x, gy = tg.y;
  aStamp++;
  const h = n => Math.hypot((n % NC) * NS - gx, ((n / NC) | 0) * NS - gy) / NS;
  const ci = Math.round(u.x / NS), cj = Math.round(u.y / NS);
  for (let j = cj - 2; j <= cj + 2; j++) for (let i = ci - 2; i <= ci + 2; i++) {
    if (i < 0 || j < 0 || i >= NC || j >= NR) continue;
    const n = j * NC + i, x = i * NS, y = j * NS;
    if (clearance[n] < thr || world.solidBetween(u.x, u.y, x, y)) continue;
    const g = Math.hypot(x - u.x, y - u.y) / NS;
    gScore[n] = g; gStamp[n] = aStamp; parent[n] = -1; heap.push(n, g + h(n));
  }
  let pops = 0, goal = -1;
  while (heap.size && pops++ < 7000) {
    const c = heap.pop();
    if (closed[c] === aStamp) continue;
    closed[c] = aStamp;
    const cx = c % NC, cy = (c / NC) | 0, x = cx * NS, y = cy * NS;
    if (Math.hypot(x - gx, y - gy) <= goalR && !world.solidBetween(x, y, gx, gy)) { goal = c; break; }
    const gc = gScore[c], cc = navCost[c];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = cx + ox, ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= NC || ny >= NR) continue;
      const n = ny * NC + nx;
      if (closed[n] === aStamp || clearance[n] < thr) continue;
      if (ox && oy && (clearance[cy * NC + nx] < thr || clearance[ny * NC + cx] < thr)) continue;
      const ng = gc + (ox && oy ? 1.4142 : 1) * (cc + navCost[n]) * 0.5;
      if (gStamp[n] !== aStamp || ng < gScore[n]) { gScore[n] = ng; gStamp[n] = aStamp; parent[n] = c; heap.push(n, ng + h(n)); }
    }
  }
  if (goal < 0) return null;
  const nodes = [];
  for (let n = goal; n >= 0; n = parent[n]) nodes.push(n);
  return nodes.reverse();
}
function astarWaypoint(u, tg) {
  let p = u.path;
  if (!p || p.tg !== tg.id || world.time - p.t > 0.8) {
    if (world.astarBudget <= 0) return p && p.tg === tg.id && p.nodes ? followPath(u, p) : null;
    world.astarBudget--;
    p = u.path = { tg: tg.id, t: world.time + Math.random() * 0.2, nodes: astar(u, tg), i: 0 };
  }
  return p.nodes ? followPath(u, p) : null;
}
function followPath(u, p) {
  const nodes = p.nodes;
  let bi = p.i, bd = Infinity;
  for (let i = p.i; i < Math.min(nodes.length, p.i + 8); i++) {
    const q = nodeXY(nodes[i]), d = (q.x - u.x) ** 2 + (q.y - u.y) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  p.i = bi;
  if (bi >= nodes.length - 1) return null;
  return farthestVisible(u, nodes, bi - 1, bi + 14);
}

// The next point a ground unit should walk toward when the straight line to its target is no good.
// The same, toward any point (tg needs an id, x and y) rather than toward the enemy.
world.waypointTo = function (u, tg) { ensureDerived(); return astarWaypoint(u, tg); };
world.waypoint = function (u, tg) {
  ensureDerived();
  return world.ffa ? astarWaypoint(u, tg) : fieldWaypoint(u);
};

/* ---------- snapshots (undo, reset) ---------- */
world.snapshot = function () {
  return {
    tiles: world.tiles.slice(),
    units: world.units.filter(u => u.alive).map(u => [u.def.id, Math.round(u.x * 10) / 10, Math.round(u.y * 10) / 10, u.team, u.nature || 0]),
    props: (world.props || []).filter(p => !p.dead).map(p => [p.def.id, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]),
  };
};
world.restore = function (s) {
  world.units = []; world.shots = []; world.fx = []; world.watchers = [];
  world.tiles.set(s.tiles); tileHp.fill(0); world.touchTiles();
  world.rebuildGrid();
  for (const [id, x, y, team, nat] of s.units) if (FO.units[id]) { const u = FO.spawn(id, x, y, team); if (u && nat) FO.nature.set(u, nat); }
  world.props = []; world.slipping = [];
  for (const [id, x, y] of s.props || []) FO.placeProp(id, x, y);
};
})();
