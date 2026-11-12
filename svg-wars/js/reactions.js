/* =====================================================================
   SVG WARS · reactions
   Terrain that reacts to what happens on it. The rules, all of them:
     fire     heat sets flammable tiles (trees, barricades) alight; fire spreads to flammable
              neighbours, burns whoever stands in it, and leaves bare ground
     melting  heat turns ice to water
     freezing cold turns water to ice and lava to rock, and puts fires out
     shock    lightning that lands in water hits everyone standing in that stretch of water
     cooling  lava touching water hardens into rock
     flow     water pours into pits next to it (and on under a road bridge), and spills through a broken or burnt barricade
   Heat comes from explosions, dragon breath, meteors, lava, lightning and anyone on fire.
   Cold comes from Deep Freeze and snowballs.
   Terrain opts in with fields: flammable, burnTime, burnsTo, meltsTo, freezesTo, conducts, floodable.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, fx = FO.fx, T = FO.TILE, TC = world.TC, TR = world.TR, N = TC * TR;
const STEP = 0.2;
const fire = world.fire = new Float32Array(N);      // seconds each tile has left to burn (0 = not burning)
const burning = world.burning = new Set();
let floods = [], acc = 0, shocked = null;
const spilt = new Set();                          // tiles that are water only because a flood put it there
const R = FO.react = {};

const defAt = i => FO.terrain[world.tiles[i]] || null;
const idOf = name => FO.terrainById[name] ? FO.terrainById[name].index : 0;
const cx = i => (i % TC + 0.5) * T, cy = i => (((i / TC) | 0) + 0.5) * T;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = N4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
function near(i, dirs, fn) {
  const x = i % TC, y = (i / TC) | 0;
  for (let k = 0; k < dirs.length; k++) { const nx = x + dirs[k][0], ny = y + dirs[k][1]; if (nx >= 0 && ny >= 0 && nx < TC && ny < TR) fn(ny * TC + nx, k >= 4); }
}
function tilesIn(x, y, rad, fn) {
  const own = world.tileIndex(x, y);
  if (rad <= 0) { if (own >= 0) fn(own); return; }
  const x0 = Math.max(0, ((x - rad) / T) | 0), x1 = Math.min(TC - 1, ((x + rad) / T) | 0), y0 = Math.max(0, ((y - rad) / T) | 0), y1 = Math.min(TR - 1, ((y + rad) / T) | 0);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const i = ty * TC + tx;
    if (i === own || ((tx + 0.5) * T - x) ** 2 + ((ty + 0.5) * T - y) ** 2 <= rad * rad) fn(i);
  }
}
const steam = i => fx.dots(cx(i), cy(i) - 4, '#ffffff', 3, 45, 2.6);

function ignite(i) {
  const d = defAt(i);
  if (!d || !d.flammable || fire[i] > 0) return false;
  fire[i] = (d.burnTime || 5) * (0.8 + Math.random() * 0.5); burning.add(i);
  return true;
}
function putOut(i) { if (fire[i] > 0) { fire[i] = 0; burning.delete(i); steam(i); } }
function become(i, name) { putOut(i); return world.setTile(i, name ? idOf(name) : 0); }

/* ---------- things that happen to terrain ---------- */
// Something hot at (x, y): everything flammable within `rad` catches, ice melts. rad 0 = just that tile.
R.heat = function (x, y, rad) {
  if (world.mode !== 'running') return;
  tilesIn(x, y, rad, i => { const d = defAt(i); if (!d) return; if (d.flammable) ignite(i); else if (d.meltsTo) { become(i, d.meltsTo); steam(i); } });
  world.commitTiles();
};
// Something cold: fires go out, water freezes over, lava hardens.
R.chill = function (x, y, rad) {
  if (world.mode !== 'running') return;
  tilesIn(x, y, rad, i => { const d = defAt(i); if (!d) return; putOut(i); if (d.freezesTo) become(i, d.freezesTo); });
  world.commitTiles();
};
// Lightning at (x, y). If that is water, everyone standing in the same stretch of water (either side) is hit.
R.shock = function (x, y, dmg, src, skip) {
  if (world.mode !== 'running') return 0;
  const start = world.tileIndex(x, y), d0 = start >= 0 && defAt(start);
  if (!d0 || !d0.conducts) return 0;
  const seen = new Set([start]), q = [start];
  for (let h = 0; h < q.length && q.length < 220; h++) near(q[h], N4, n => { const d = defAt(n); if (d && d.conducts && !seen.has(n)) { seen.add(n); q.push(n); } });
  let hits = 0;
  for (const u of world.units) {
    if (!u.alive || u.def.flying || u.under || u.untargetable || (skip && skip.indexOf(u) >= 0)) continue;
    if (!seen.has(world.tileIndex(u.x, u.y))) continue;
    FO.damage(u, dmg, src && src.alive ? src : null, { pure: true });
    if (u.alive) FO.applyStatus(u, 'stun', 0.6, null);
    hits++;
  }
  shocked = { tiles: q, t: 0.45 };
  for (let k = 0; k < Math.min(14, q.length); k++) { const i = q[(Math.random() * q.length) | 0]; fx.dots(cx(i), cy(i), '#fff7a8', 2, 70, 1.6); }
  return hits;
};

/* ---------- flooding ---------- */
function startFlood(i) {
  let source = -1; near(i, N4, n => { const d = defAt(n); if (d && d.id === 'water') source = n; });
  if (source < 0) return;
  if (floods.length) { floods[0].front.push(i); return; }             // one spill at a time: more gaps just widen it
  // a lake can spill about half its own size (70 tiles at most) over the whole battle, however many gaps open
  const seen = new Set([source]), q = [source]; let lake = 0, out = 0;
  for (let h = 0; h < q.length && q.length < 500; h++) { if (spilt.has(q[h])) out++; else lake++; near(q[h], N4, n => { const d = defAt(n); if (d && d.id === 'water' && !seen.has(n)) { seen.add(n); q.push(n); } }); }
  const left = Math.max(6, Math.min(70, Math.round(lake * 0.5))) - out;
  if (left > 0) floods.push({ front: [i], left });
}
const floodable = i => { const d = defAt(i); return !d || d.floodable; };
FO.on('tile-broken', (x, y, i) => { if (world.mode === 'running' && i != null) startFlood(i); });

/* ---------- the tick ---------- */
function step() {
  const water = idOf('water');
  // fire: burn down, spread, melt
  for (const i of [...burning]) {
    const d = defAt(i);
    if (!d || !d.flammable) { fire[i] = 0; burning.delete(i); continue; }
    fire[i] -= STEP;
    near(i, N8, (n, diag) => {
      const nd = defAt(n); if (!nd) return;
      if (nd.flammable) { if (fire[n] <= 0 && FO.chance(diag ? 0.03 : 0.075)) ignite(n); }
      else if (nd.meltsTo && FO.chance(0.12)) { become(n, nd.meltsTo); steam(n); }
    });
    if (fire[i] <= 0) {
      fire[i] = 0; burning.delete(i);
      const wasSolid = d.solid;
      world.setTile(i, d.burnsTo ? idOf(d.burnsTo) : 0);
      fx.dots(cx(i), cy(i), '#3a3a3a', 4, 50, 2.2);
      if (wasSolid) startFlood(i);
    } else if (FO.chance(0.25)) fx.dots(cx(i) + FO.rand(-6, 6), cy(i) - 8, FO.chance(0.5) ? '#ffb347' : '#6b6b6b', 1, 55, 1.8);
  }
  // fighters standing in a fire burn; fighters on fire set light to what they stand in
  for (const u of world.units) {
    if (!u.alive || u.def.flying || u.under || u.carried) continue;
    const i = world.tileIndex(u.x, u.y); if (i < 0) continue;
    if (fire[i] > 0) { FO.applyStatus(u, 'burn', 2.2, null); FO.damage(u, 14 * STEP, null, { pure: true, quiet: true, kind: 'burn' }); }
    else if (u.alive && FO.hasStatus(u, 'burn') && FO.chance(0.07)) ignite(i);
  }
  // lava, pits and anything else that reacts to its neighbours. Changes are applied after the scan.
  const todo = [];
  for (let i = 0; i < N; i++) {
    const id = world.tiles[i]; if (!id) continue;
    const d = FO.terrain[id];
    if (d.id === 'lava') {
      let cooled = false;
      near(i, N4, n => {
        const nd = defAt(n); if (!nd || cooled) return;
        if (nd.id === 'water') cooled = true;
        else if (nd.flammable) { if (fire[n] <= 0 && FO.chance(0.03)) ignite(n); }
        else if (nd.meltsTo && FO.chance(0.05)) todo.push([n, nd.meltsTo, true]);
      });
      if (cooled) todo.push([i, 'rock', true]);
    } else if (d.lowGround) {
      // wet if water is next to it, or just the other side of a bridge (up to three tiles of road in a straight line)
      let wet = false;
      const x = i % TC, y = (i / TC) | 0;
      for (let k = 0; k < 4 && !wet; k++) for (let j = 1; j <= 4; j++) {
        const nx = x + N4[k][0] * j, ny = y + N4[k][1] * j; if (nx < 0 || ny < 0 || nx >= TC || ny >= TR) break;
        const t = world.tiles[ny * TC + nx];
        if (t === water) { wet = true; break; }
        if (!t || !FO.terrain[t].spans) break;
      }
      if (wet && FO.chance(0.4)) todo.push([i, 'water', false]);
    }
  }
  for (const [i, name, hiss] of todo) { if (become(i, name) && hiss) steam(i); }
  // a spill creeps outward a few tiles at a time until it runs out of water
  for (const f of floods) {
    for (let k = 0; k < 3 && f.front.length && f.left > 0; k++) {
      // take one of the oldest few at random, so the edge of the spill is ragged instead of a neat diamond
      const i = f.front.splice(Math.min(f.front.length - 1, Math.floor(FO.rand(0, 6))), 1)[0];
      if (world.tiles[i] === water || !floodable(i)) { k--; if (!f.front.length) break; continue; }
      become(i, 'water'); spilt.add(i); f.left--;
      near(i, N4, n => { if (world.tiles[n] !== water && floodable(n) && f.front.indexOf(n) < 0) f.front.push(n); });
    }
  }
  floods = floods.filter(f => f.left > 0 && f.front.length);
  world.commitTiles();
}
R.tick = function (dt) {
  if (shocked && (shocked.t -= dt) <= 0) shocked = null;
  acc += dt;
  while (acc >= STEP) { acc -= STEP; step(); }
};
R.reset = function () { fire.fill(0); burning.clear(); floods = []; spilt.clear(); acc = 0; shocked = null; };
FO.on('reset', R.reset);
FO.on('start', R.reset);

/* ---------- drawing: flames on burning tiles, a flash on shocked water ---------- */
function flame(ctx, x, y, w, h, sway) {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 1.1, y - h * 0.5, x + sway, y - h);
  ctx.quadraticCurveTo(x + w * 1.1, y - h * 0.5, x + w, y);
  ctx.quadraticCurveTo(x, y + w * 0.9, x - w, y);
  ctx.closePath();
}
R.draw = function (ctx, now) {
  if (shocked) {
    ctx.fillStyle = `rgba(255,247,150,${0.55 * shocked.t / 0.45})`;
    ctx.beginPath(); for (const i of shocked.tiles) ctx.rect((i % TC) * T, ((i / TC) | 0) * T, T, T); ctx.fill();
  }
  if (!burning.size) return;
  ctx.lineJoin = 'round';
  for (const i of burning) {
    if (FO.onScreen && !FO.onScreen(cx(i), cy(i), T * 2)) continue;
    const x = cx(i), y = cy(i) + 6, k = Math.min(1, fire[i] / 1.2), f = Math.sin(now * 11 + i * 1.7), g = Math.sin(now * 7 + i * 0.9);
    const h = (15 + f * 3) * (0.5 + 0.5 * k);
    flame(ctx, x, y, 7, h, g * 3); ctx.fillStyle = '#ff7a1a'; ctx.fill(); ctx.strokeStyle = '#1c1d22'; ctx.lineWidth = 1.3; ctx.stroke();
    flame(ctx, x + g, y - 0.5, 3.6, h * 0.58, -g * 2); ctx.fillStyle = '#ffd43b'; ctx.fill();
  }
};
})();
