/* =====================================================================
   SVG WARS · life
   Units marked `grid: true` (Conway's Chicken) live on the tile grid and
   follow Conway's Game of Life. Once per generation, for each team:
     - a chicken with fewer than 2 or more than 3 neighbours dies
     - an empty tile with exactly 3 neighbours hatches a new chicken
   Neighbours are same-team grid units in the 8 surrounding tiles.
   Nothing hatches inside walls or lava, or on a tile two teams
   both claim in the same generation.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, T = FO.TILE, TC = world.TC, TR = world.TR;
const GEN = 0.7, CAP = 900;
FO.life = { GEN };

const cellOf = (x, y) => Math.min(TR - 1, Math.max(0, Math.floor(y / T))) * TC + Math.min(TC - 1, Math.max(0, Math.floor(x / T)));
FO.life.snap = (x, y) => { const c = cellOf(x, y); return [(c % TC + 0.5) * T, ((c / TC | 0) + 0.5) * T]; };
FO.life.cellTaken = (x, y) => { const c = cellOf(x, y); for (const u of world.units) if (u.alive && u.def.grid && cellOf(u.x, u.y) === c) return true; return false; };

let lastGen = 0; const sigs = [0, 0];
FO.lifeTick = function () {
  const gen = Math.floor(world.time / GEN);
  if (gen === lastGen) return;
  lastGen = gen;
  if (gen === 0) return;
  const occ = new Map(), teams = new Map();
  let total = 0;
  for (const u of world.units) {
    if (!u.alive || !u.def.grid) continue;
    u.cell = cellOf(u.x, u.y); occ.set(u.cell, u); total++;
    if (!teams.has(u.team)) teams.set(u.team, []);
    teams.get(u.team).push(u);
  }
  if (!total) return;
  // a colony that is still changing shape (not just blinking in place) keeps the battle from being called a stalemate
  let sig = total; for (const c of occ.keys()) sig = (sig * 31 + c) % 1000003;
  if (sig !== sigs[0] && sig !== sigs[1]) world.lastDamageT = world.time;
  sigs[1] = sigs[0]; sigs[0] = sig;
  const dying = [], births = new Map();
  for (const [team, list] of teams) {
    const cnt = new Uint8Array(TC * TR), par = new Map();
    for (const u of list) {
      const cx = u.cell % TC, cy = u.cell / TC | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= TC || y >= TR) continue;
        const n = y * TC + x; cnt[n]++; par.set(n, u);
      }
    }
    for (const u of list) { const n = cnt[u.cell]; if (n < 2 || n > 3) { u.lifeEnd = n < 2 ? 'lonely' : 'crowded'; dying.push(u); } }
    for (const [n, p] of par) {
      if (cnt[n] !== 3 || occ.has(n)) continue;
      births.set(n, births.has(n) ? null : { team, p });
    }
  }
  for (const u of dying) {
    if (!u.alive) continue;
    FO.fx.dots(u.x, u.y, '#ffffff', 2, 50, 1.6);
    FO.kill(u, null, { quiet: true, life: true });
  }
  total -= dying.length;
  for (const [n, b] of births) {
    if (!b || total >= CAP) continue;
    const x = (n % TC + 0.5) * T, y = ((n / TC | 0) + 0.5) * T;
    if (world.solidAt(x, y)) continue;
    const td = world.terrainAt(x, y); if (td && td.hazard) continue;
    if (FO.spawn(b.p.def, x, y, b.team, { side: b.p.side })) total++;
  }
};

// Grid units never leave their tile: no walking, no knockback.
FO.defineTrait('gridLocked', {
  label: 'Game of Life', desc: () => `Lives on the grid. Every ${GEN}s: dies with fewer than 2 or more than 3 neighbours; an empty tile with exactly 3 hatches a chick`,
  onSpawn(u) { const p = FO.life.snap(u.x, u.y); u.x = u.gx = p[0]; u.y = u.gy = p[1]; },
  onUpdate(u) { u.x = u.gx; u.y = u.gy; u.kx = u.ky = 0; u.vx = u.vy = 0; },
});

// Stays put and pecks whatever comes within a tile of it.
FO.ai.conway = function (u) {
  u.x = u.gx; u.y = u.gy;
  if (u.cd > 0) return;
  let best = null, bd = 1e9;
  world.forNear(u.x, u.y, T * 1.5 + FO.maxR, o => {
    if (!o.alive || o.side === u.side || o.untargetable || o.under) return;
    if (o.def.grid && o.team === u.team) return;
    const d = Math.hypot(o.x - u.x, o.y - u.y) - o.def.r;
    if (d < T * 0.95 && d < bd) { bd = d; best = o; }
  });
  if (!best) return;
  const a = u.def.attack, dx = best.x - u.x, dy = best.y - u.y, d = Math.hypot(dx, dy) || 1;
  if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1;
  FO.damage(best, a.dmg * u.hitMul, u, { nx: dx / d, ny: dy / d, direct: true });
  u.cd = a.cd * (0.85 + Math.random() * 0.3); u.swing = 0.22;
};
})();
