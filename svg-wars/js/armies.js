/* =====================================================================
   SVG WARS · armies
   FO.balance()   evens out the sides' points, keeping each army's mix
   FO.multiply()  doubles every army, each twin placed beside the original
   FO.generate()  rolls a random matchup for the current fight mode
   Both work on the field as painted; terrain and props are kept.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, W = FO.W, H = FO.H, T = FO.TILE;
const cost = d => Math.max(1, d.cost || 1);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = d => d.plural || (/[sz]$/i.test(d.name) ? d.name : d.name + 's');

/* ---------- balance ---------- */
// what a "side" is for balancing purposes in each mode
const groupKey = u => world.fightMode === 'units' ? u.def.id : u.team;

// Try to put one more `def` next to one of `near` (fighters of the same kind and team).
function addNear(def, team, near) {
  if (world.units.length >= FO.MAX_UNITS) return null;
  const s = def.r * 2.2 + 2;
  for (let tries = 0; tries < 40; tries++) {
    const o = pick(near);
    let x, y;
    if (def.grid) {                                         // chickens: a free tile in a widening ring
      const ring = 1 + (tries / 8 | 0), cx = Math.floor(o.x / T) + Math.round(rnd(-ring, ring)), cy = Math.floor(o.y / T) + Math.round(rnd(-ring, ring));
      x = (cx + 0.5) * T; y = (cy + 0.5) * T;
    } else {
      const a = rnd(0, 6.283), d = s * (1 + tries / 10) * rnd(0.9, 1.4);
      x = o.x + Math.cos(a) * d; y = o.y + Math.sin(a) * d;
    }
    if (FO.canPlace(def, x, y)) { const u = FO.spawn(def, x, y, team); world.rebuildGrid(); if (u) { if (o.nature) FO.nature.set(u, o.nature); near.push(u); return u; } }
  }
  return null;
}

// Work out new counts per kind so a group lands on `target` points with its mix intact.
function plan(kinds, target) {
  const P = kinds.reduce((s, k) => s + k.n * cost(k.def), 0), f = target / P;
  for (const k of kinds) { k.want = k.n * f; k.to = Math.max(1, Math.floor(k.want)); }
  let pts = kinds.reduce((s, k) => s + k.to * cost(k.def), 0);
  for (;;) {                                                // top up whichever kind is furthest below its share
    let best = null, gap = -1;
    for (const k of kinds) { const g = (k.want - k.to) / Math.max(1, k.want); if (g > gap && target - pts >= cost(k.def) / 2) { gap = g; best = k; } }
    if (!best) break;
    best.to++; pts += cost(best.def);
  }
  for (;;) {                                                // a kind that can't be split (one ogre) can overshoot: trim the others back
    let best = null, over = -1;
    for (const k of kinds) { if (k.to <= 1 || pts - target < cost(k.def) / 2) continue; const o = (k.to - k.want) / Math.max(1, k.want); if (o > over) { over = o; best = k; } }
    if (!best) break;
    best.to--; pts -= cost(best.def);
  }
  return pts;
}

FO.balance = function () {
  if (world.fightMode === 'ffa') return { err: 'ffa' };
  const groups = new Map();
  for (const u of world.units) {
    if (!u.alive) continue;
    const g = groupKey(u);
    if (!groups.has(g)) groups.set(g, { key: g, team: u.team, kinds: new Map() });
    const kinds = groups.get(g).kinds;
    const kk = u.def.id + '|' + u.team;
    if (!kinds.has(kk)) kinds.set(kk, { def: u.def, team: u.team, n: 0, list: [] });
    const k = kinds.get(kk); k.n++; k.list.push(u);
  }
  if (groups.size < 2) return { err: 'one' };
  const gs = [...groups.values()].map(g => ({ ...g, kinds: [...g.kinds.values()] }));
  for (const g of gs) { g.pts = g.kinds.reduce((s, k) => s + k.n * cost(k.def), 0); g.min = g.kinds.reduce((s, k) => s + cost(k.def), 0); }
  // meet in the middle, unless a side can't shrink that far without losing a kind of fighter altogether
  const target = Math.max(gs.reduce((s, g) => s + g.pts, 0) / gs.length, ...gs.map(g => g.min));
  let added = 0, removed = 0;
  for (const g of gs) {
    plan(g.kinds, target);
    for (const k of g.kinds) {
      if (k.to < k.n) {
        shuffle(k.list);
        for (const u of k.list.slice(0, k.n - k.to)) { u.alive = false; removed++; }
        k.list = k.list.filter(u => u.alive);
      }
    }
  }
  world.units = world.units.filter(u => u.alive); world.rebuildGrid();
  for (const g of gs) for (const k of g.kinds) for (let i = k.list.length; i < k.to; i++) { if (!addNear(k.def, k.team, k.list)) break; added++; }
  const after = new Map();
  for (const u of world.units) after.set(groupKey(u), (after.get(groupKey(u)) || 0) + cost(u.def));
  return { added, removed, sides: gs.map(g => ({ key: g.key, team: g.team, before: g.pts, after: after.get(g.key) || 0 })) };
};

/* ---------- double ---------- */
// Every fighter on the field gets a twin placed right beside it, so each army keeps its mix and its shape.
FO.multiply = function () {
  const all = world.units.filter(u => u.alive), room = FO.MAX_UNITS - world.units.length;
  let added = 0;
  for (const u of shuffle(all.slice())) {
    if (added >= room) break;
    if (addNear(u.def, u.team, [u])) added++;
  }
  world.rebuildGrid();
  return { before: all.length, added, capped: added < all.length && world.units.length >= FO.MAX_UNITS };
};

/* ---------- generate ---------- */
const FRONT = ['tank', 'brute', 'line', 'bomber', 'skirmisher'];
const rank = d => { const r = FO.roleOf(d), i = FRONT.indexOf(r); return i >= 0 ? i : r === 'ranged' ? 6 : 7; };

// Fill a region with blocks of fighters, front rank first. dir: which edge of the region faces the enemy.
function fillRegion(reg, team, blocks) {
  const horiz = reg.dir === 'left' || reg.dir === 'right';
  const rowLen = (horiz ? reg.y1 - reg.y0 : reg.x1 - reg.x0) - 20, maxDepth = horiz ? reg.x1 - reg.x0 : reg.y1 - reg.y0;
  const mid = horiz ? (reg.y0 + reg.y1) / 2 : (reg.x0 + reg.x1) / 2;
  const at = (depth, v) => reg.dir === 'right' ? [reg.x1 - depth, mid + v] : reg.dir === 'left' ? [reg.x0 + depth, mid + v]
    : reg.dir === 'down' ? [mid + v, reg.y1 - depth] : [mid + v, reg.y0 + depth];
  let depth = 8;
  for (const [def, n] of blocks.sort((a, b) => rank(a[0]) - rank(b[0]))) {
    if (def.grid) {                                         // a random soup of chickens, ~42% of the tiles
      const per = Math.max(1, Math.floor(rowLen / T)), rows = Math.ceil(n / 0.42 / per), cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < per; c++) cells.push([depth + (r + 0.5) * T, (c - per / 2 + 0.5) * T]);
      let k = 0; for (const [d, v] of shuffle(cells)) { if (k >= n) break; const [x, y] = at(d, v); if (FO.canPlace(def, x, y)) { FO.spawn(def, x, y, team); world.rebuildGrid(); k++; } }
      depth += rows * T + 6; continue;
    }
    const s = def.r * 2.25 + 3, per = Math.max(1, Math.floor(rowLen / s));
    let k = 0;
    while (k < n && depth < maxDepth + 200) {
      const inRow = Math.min(per, n - k);
      for (let i = 0; i < inRow; i++, k++) {
        const [x, y] = at(depth + def.r + rnd(-2, 2), (i - (inRow - 1) / 2) * s + rnd(-2, 2));
        if (FO.canPlace(def, x, y, 0.8)) FO.spawn(def, x, y, team);
      }
      world.rebuildGrid();
      depth += s;
    }
    depth += 6;
  }
}

function regionsFor(n) {
  const L = { x0: 40, x1: W / 2 - 170, y0: 50, y1: H - 50, dir: 'right' }, R = { x0: W / 2 + 170, x1: W - 40, y0: 50, y1: H - 50, dir: 'left' };
  if (n === 2) return [L, R];
  const narrowL = { ...L, y0: 230, y1: H - 230 }, narrowR = { ...R, y0: 230, y1: H - 230 };
  const top = { x0: W / 2 - 300, x1: W / 2 + 300, y0: 30, y1: 260, dir: 'down' }, bottom = { x0: W / 2 - 300, x1: W / 2 + 300, y0: H - 260, y1: H - 30, dir: 'up' };
  return n === 3 ? [narrowL, narrowR, top] : [narrowL, narrowR, top, bottom];
}

const fighters = () => FO.unitList.filter(d => !d.hidden && !d.peaceful && d.ai !== 'support' && d.id !== 'bryan');
const supports = () => FO.unitList.filter(d => !d.hidden && (d.ai === 'support' || d.id === 'necromancer'));

// One army worth about `budget` points: a main kind, maybe a second, maybe a healer or necromancer behind.
function rollArmy(budget, avoid) {
  const pool = fighters().filter(d => cost(d) <= budget && !avoid.has(d.id) && budget / cost(d) <= 260);
  const main = pick(pool.length ? pool : fighters().filter(d => cost(d) <= budget)), out = [[main, 0]];
  let share = 1;
  if (Math.random() < 0.55) {
    const second = pick(fighters().filter(d => d !== main && cost(d) <= budget * 0.4 && budget * 0.35 / cost(d) <= 150));
    if (second) { out.push([second, 0.35]); share -= 0.35; }
  }
  if (Math.random() < 0.3) {
    const sup = pick(supports().filter(d => cost(d) <= budget * 0.2));
    if (sup) { out.push([sup, 0.15]); share -= 0.15; }
  }
  out[0][1] = share;
  return out.map(([d, s]) => [d, Math.max(1, Math.round(budget * s / cost(d)))]);
}

const describe = blocks => blocks.map(([d, n]) => `${n} ${n === 1 ? d.name : plural(d)}`).join(' + ');

FO.generate = function () {
  const mode = world.fightMode;
  world.units = []; world.rebuildGrid();
  let summary;
  if (mode === 'ffa') {
    // everyone for themselves: a crowd from one price bracket, scattered over the field
    const tiers = [[1, 25], [25, 120], [100, 3000]], [lo, hi] = pick(tiers);
    const pool = fighters().filter(d => cost(d) >= lo && cost(d) <= hi && !d.grid && !d.fib);
    const n = Math.round(rnd(10, 26)); let k = 0;
    for (let tries = 0; k < n && tries < n * 40; tries++) {
      const d = pick(pool), x = rnd(60, W - 60), y = rnd(60, H - 60);
      if (FO.canPlace(d, x, y, 2.2)) { FO.spawn(d, x, y, k % FO.teams.length); world.rebuildGrid(); k++; }
    }
    summary = `${k} fighters, every one for themselves`;
  } else if (mode === 'units') {
    // a few kinds, the same points each, one block per kind
    const n = Math.random() < 0.6 ? 3 : 4, budget = pick([400, 700, 1000, 1000, 2600]), regs = regionsFor(n), used = new Set(), names = [];
    for (let i = 0; i < n; i++) {
      const pool = fighters().filter(d => !used.has(d.id) && cost(d) <= budget && budget / cost(d) <= 200 && !d.fib);
      const d = pick(pool); used.add(d.id);
      const cnt = Math.max(1, Math.round(budget / cost(d)));
      fillRegion(regs[i], i, [[d, cnt]]); names.push(plural(d));
    }
    FO.balance();
    summary = names.join(' vs ');
  } else {
    const n = Math.random() < 0.75 ? 2 : Math.random() < 0.6 ? 3 : 4;
    const budget = pick([300, 500, 800, 800, 1200, 1200, 2600]) * (n > 2 ? 0.8 : 1), regs = regionsFor(n), used = new Set(), parts = [];
    for (let i = 0; i < n; i++) {
      const army = rollArmy(budget, used); used.add(army[0][0].id);
      fillRegion(regs[i], i, army.map(a => [...a]));
      parts.push(`${FO.teams[i].name}: ${describe(army)}`);
    }
    FO.balance();
    summary = parts.join(' vs ');
  }
  world.rebuildGrid();
  return { summary };
};
})();
