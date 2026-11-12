/* =====================================================================
   SVG WARS · simulation
   Spawning, damage, statuses, projectiles, AI and the per-frame step.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, W = FO.W, H = FO.H;

/* =====================================================================
   SPAWN / DAMAGE / HEAL / KILL
   ===================================================================== */
/* ---------- fight modes ----------
   teams: same colour fights together · units: same unit type fights together · ffa: everyone alone */
FO.fightModes = ['teams', 'units', 'ffa'];
FO.setMode = function (m) { world.fightMode = FO.fightModes.indexOf(m) >= 0 ? m : 'teams'; world.ffa = world.fightMode === 'ffa'; };
// What a fighter counts as in the battle report: in a units battle, the side it fights for (so helpers count for whoever
// brought them); otherwise the kind it started as (so Matt's Grungus is still Matt).
FO.kindOf = u => typeof u.side === 'string' && u.side[0] === 'k' && u.side[1] === ':' ? u.side.slice(2) : (u.def.formOf || u.def.id);
FO.sideFor = u => world.fightMode === 'ffa' ? 'u' + u.id : world.fightMode === 'units' ? 'k:' + u.def.id : u.team;

FO.spawn = function (def, x, y, team, o) {
  if (typeof def === 'string') def = FO.units[def];
  if (!def || world.units.length >= FO.MAX_UNITS) return null;
  FO.prepUnit(def);
  const id = world.nextId++;
  const u = {
    id, def, x, y, vx: 0, vy: 0, kx: 0, ky: 0, wantX: 0, wantY: 0,
    hp: def.hp, maxHp: def.hp, team, side: team,
    cd: Math.random() * def.attack.cd, target: null, retT: 0, losT: 0, losTg: null,
    shotOK: true, pathOK: true, wp: null, path: null,
    alive: true, flash: 0, face: team % 2 === 0 ? 1 : -1, phase: Math.random() * 6.28, moving: false, swing: 0,
    st: [], speedMul: 1, rateMul: 1, stunned: false, inHazard: false,
    kills: 0, dmg: 0, hitMul: 1, ts: {}, born: world.time, pop: world.mode === 'edit' ? 0 : 0.25,
  };
  if (world.mode !== 'edit') u.side = o && o.side != null ? o.side : FO.sideFor(u);
  world.units.push(u);
  world.gridAdd(u);
  if (world.mode === 'running' && FO.stats) FO.stats.born(u);
  for (const t of def._onSpawn) t.impl.onSpawn(u, t.p);
  if (def._onAnyDeath.length) world.watchers.push(u);
  return u;
};
world.watchers = [];

/* opts: nx, ny (hit direction), knock, direct (a real attack, triggers on-hit traits),
         pure (ignores armour), quiet (no flash / sound; used by damage over time), inflict: [statusId, seconds] */
// Height: hills are 1, pits are -1, everything else (and anything flying) is 0.
FO.level = u => u.high ? 1 : u.low ? -1 : 0;
FO.sightMul = (u, a) => a.range ? (u.high ? 1.3 : u.low ? 0.8 : 1) : 1;      // high ground sees further, low ground less far
FO.damage = function (t, amount, src, o) {
  if (!t.alive || amount <= 0 || t.untargetable) return 0;
  o = o || {};
  const td = t.def._onDamaged;
  for (let i = 0; i < td.length; i++) { amount = td[i].impl.onDamaged(t, amount, src, o, td[i].p); if (!(amount > 0)) return 0; }
  if (src) t.lastSrc = src;
  t.hurtT = world.time;
  if (src && !o.pure && FO.level(t) > FO.level(src)) amount *= 0.75;     // attacking uphill is hard work
  if (!o.pure) amount = Math.max(1, amount - t.def.armor);
  if (FO.stats) FO.stats.hit(t, amount, src);
  t.hp -= amount;
  world.lastDamageT = world.time;
  if (src) {
    src.dmg += amount;
    if (!world.best || src.dmg > world.best.dmg) world.best = src;
  }
  if (!o.quiet) {
    if (amount > Math.max(1, t.maxHp * 0.003)) t.flash = 0.1;      // scratches on something huge don't flash it
    if (o.knock) { const m = Math.min(650, o.knock / t.def.mass); t.kx += (o.nx || 0) * m; t.ky += (o.ny || 0) * m; }
    FO.emit('hit', t, amount, src);
  }
  if (o.inflict) FO.applyStatus(t, o.inflict[0], o.inflict[1], src);
  if (o.direct && src && src.alive) { const h = src.def._onHit; for (let i = 0; i < h.length; i++) h[i].impl.onHit(src, t, amount, o, h[i].p); }
  if (t.hp <= 0) FO.kill(t, src);
  return amount;
};

FO.heal = function (t, amount) {
  if (!t.alive || t.hp >= t.maxHp) return 0;
  const before = t.hp;
  t.hp = Math.min(t.maxHp, t.hp + amount);
  if (FO.stats) FO.stats.healed(t.hp - before);
  return t.hp - before;
};

FO.kill = function (t, src, o) {
  if (!t.alive) return;
  t.alive = false; t.hp = 0;
  const ts = world.teamStats[t.team]; if (ts) ts.lost++;
  if (src && src !== t) {
    src.kills++;
    const ks = world.teamStats[src.team]; if (ks) ks.kills++;
    const ky = world.typeStats[FO.kindOf(src)]; if (ky) ky.kills++;
    if (src.alive) { const k = src.def._onKill; for (let i = 0; i < k.length; i++) k[i].impl.onKill(src, t, k[i].p); }
  }
  const dt = t.def._onDeath;
  for (let i = 0; i < dt.length; i++) dt[i].impl.onDeath(t, src, dt[i].p);
  for (let i = 0; i < world.watchers.length; i++) {
    const w = world.watchers[i]; if (!w.alive || w === t) continue;
    const l = w.def._onAnyDeath; for (let k = 0; k < l.length; k++) l[k].impl.onAnyDeath(w, t, src, l[k].p);
  }
  world.fallen.push(t);
  FO.emit('death', t, src, o);
};

FO.applyStatus = function (u, id, dur, src) {
  const impl = FO.statuses[id];
  if (!impl || !u.alive || u.untargetable || u.def.immune.indexOf(id) >= 0) return;
  for (const s of u.st) if (s.id === id) { if (dur > s.t) s.t = dur; s.src = src || s.src; return; }
  const s = { id, impl, t: dur, src: src || null };
  u.st.push(s);
  if (impl.onApply) impl.onApply(u, s);
};
FO.hasStatus = (u, id) => { for (const s of u.st) if (s.id === id) return true; return false; };
FO.clearStatus = (u, id) => { u.st = u.st.filter(s => s.id !== id); };

/* Area damage. side = the attacker's side (those units are spared); pass null to hit everyone. */
FO.explode = function (x, y, R, dmg, src, side, o) {
  o = o || {};
  if (!o.gentle) world.breakTiles(x, y, R);
  if (FO.propsBlast) FO.propsBlast(x, y, R, dmg, o);
  world.forNear(x, y, R + FO.maxR, t => {
    if (!t.alive || (side != null && t.side === side) || t === o.skip) return;
    const dx = t.x - x, dy = t.y - y, d = Math.hypot(dx, dy) || 1;
    if (d > R + t.def.r) return;
    const k = 1 - 0.5 * Math.min(1, d / R);
    FO.damage(t, dmg * k, src, { nx: dx / d, ny: dy / d, knock: o.knock || 0, inflict: o.inflict });
  });
  if (FO.react) { const look = o.look || 'fire'; if (look === 'fire') FO.react.heat(x, y, R * 0.7); else if (look === 'ice') FO.react.chill(x, y, R * 0.7); }
  if (!o.silent) FO.emit('boom', x, y, R, o.look || 'fire');
};

/* =====================================================================
   PROJECTILES
   FO.shoot({ look, x, y, vx, vy, life, dmg, side, src, rad, splash, inflict, knock, pierce, air, glyph, color,
              lob: { x1, y1, dur, h } })
   ===================================================================== */
FO.shoot = function (s) {
  s.rad = s.rad || 2; s.ox = s.x; s.oy = s.y; s.max = s.life;
  if (s.ax == null) { s.ax = s.x + (s.vx || 0) * (s.life || 0); s.ay = s.y + (s.vy || 0) * (s.life || 0); }
  if (s.lob) { s.lob.x0 = s.x; s.lob.y0 = s.y; s.lob.t = 0; s.z = 0; }
  world.shots.push(s);
  return s;
};
function landShot(s, x, y, hitUnit) {
  if (s.pinpoint) {                       // an arrow coming down: hits whoever is standing where it lands
    let best = null, bd = Infinity;
    world.forNear(x, y, FO.maxR + 8, o => {
      if (!o.alive || o.untargetable || o.side === s.side) return;
      const d = Math.hypot(o.x - x, o.y - y);
      if (d < o.def.r + 7 && d < bd) { bd = d; best = o; }
    });
    if (best) FO.damage(best, s.dmg, s.src, { nx: (s.lob.x1 - s.lob.x0) / (s.lob.dur * 400), ny: (s.lob.y1 - s.lob.y0) / (s.lob.dur * 400), direct: true, inflict: s.inflict });
    else FO.fx.dots(x, y, '#8a7a5c', 2, 50, 1.4);
    return;
  }
  if (s.splash) { FO.explode(x, y, s.splash, s.dmg, s.src, s.side, { inflict: s.inflict, knock: s.knock, look: s.boom || 'fire', gentle: s.soft, silent: s.soft }); if (s.soft) FO.emit('soft-land', x, y, s); }
  else if (hitUnit) {
    const sp = Math.hypot(s.vx, s.vy) || 1;
    FO.damage(hitUnit, s.dmg, s.src, { nx: s.vx / sp, ny: s.vy / sp, knock: s.knock, inflict: s.inflict, direct: true });
  }
  if (FO.react && s.inflict && !s.splash) {            // fiery shots light what they land in; icy ones freeze it
    if (s.inflict[0] === 'burn') FO.react.heat(x, y, 0);
    else if (s.inflict[0] === 'chill' || s.inflict[0] === 'frozen') FO.react.chill(x, y, 16);
  }
}
function updateShots(dt) {
  const shots = world.shots;
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    let dead = false;
    if (s.lob) {
      const L = s.lob; L.t += dt;
      const k = Math.min(1, L.t / L.dur);
      s.x = L.x0 + (L.x1 - L.x0) * k; s.y = L.y0 + (L.y1 - L.y0) * k; s.z = L.h * 4 * k * (1 - k);
      if (s.pinpoint) { s.vx = (L.x1 - L.x0) / L.dur; s.vy = (L.y1 - L.y0) / L.dur - L.h * 4 * (1 - 2 * k) / L.dur; }   // for drawing the arrow's angle
      if (k >= 1) { landShot(s, s.x, s.y, null); dead = true; }
    } else {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.look === 'puff' && s.inflict && s.inflict[0] === 'burn' && FO.react && FO.chance(dt * 5)) FO.react.heat(s.x, s.y, 0);   // fire breath scorches what it passes over
      if (s.life <= 0 || s.x < 0 || s.y < 0 || s.x > W || s.y > H) { dead = true; if (s.splash && s.life <= 0) landShot(s, s.x, s.y, null); }
      if (!dead && world.props.length && FO.propShot(s)) { dead = true; if (s.splash) landShot(s, s.x, s.y, null); }
      if (!dead && !s.air) {
        const b = world.shotTileAt(s.x, s.y);
        if (b === 1 || (b === 2 && Math.hypot(s.x - s.ox, s.y - s.oy) > 34 && Math.hypot(s.x - s.ax, s.y - s.ay) > 34)) {
          dead = true; FO.emit('shot-blocked', s.x, s.y);
          if (s.splash) landShot(s, s.x, s.y, null);
        }
      }
      if (!dead) {
        world.forNear(s.x, s.y, s.rad + FO.maxR, o => {
          if (!o.alive || o.untargetable || o.side === s.side || (s.hitIds && s.hitIds.indexOf(o.id) >= 0)) return;
          const dx = o.x - s.x, dy = o.y - s.y, rr = o.def.r + s.rad;
          if (dx * dx + dy * dy < rr * rr) {
            landShot(s, s.x, s.y, o);
            if (s.pierce > 0) { s.pierce--; (s.hitIds = s.hitIds || []).push(o.id); }
            else { dead = true; return false; }
          }
        });
      }
    }
    if (dead) { shots[i] = shots[shots.length - 1]; shots.pop(); }
  }
}

/* =====================================================================
   AI
   ===================================================================== */
FO.ai = {};

function findEnemy(u) {
  let best = null, bd = Infinity;
  const cur = u.target && u.target.alive && u.target.side !== u.side ? u.target : null;
  const walled = world.navNeeded && !u.def.flying;
  const cands = walled ? [] : null;
  world.forNear(u.x, u.y, 340, o => {
    if (o.side === u.side || !o.alive || o.untargetable) return;
    let d = (o.x - u.x) ** 2 + (o.y - u.y) ** 2;
    if (o === cur) d *= 0.7;                       // a little stickiness
    if (walled) cands.push([d, o]);
    else if (d < bd) { bd = d; best = o; }
  });
  if (walled && cands.length) {
    // prefer the nearest enemy we can actually see; otherwise take the nearest and path to it
    cands.sort((a, b) => a[0] - b[0]);
    best = cands[0][1];
    for (let i = 0; i < Math.min(5, cands.length); i++) {
      const o = cands[i][1];
      if (!world.solidBetween(u.x, u.y, o.x, o.y)) { best = o; break; }
    }
  }
  if (!best) {
    const us = world.units;
    for (let i = 0; i < us.length; i++) {
      const o = us[i];
      if (!o.alive || o.side === u.side || o.untargetable) continue;
      const d = (o.x - u.x) ** 2 + (o.y - u.y) ** 2;
      if (d < bd) { bd = d; best = o; }
    }
  }
  return best;
}
FO.findEnemy = findEnemy;

// Refresh what the unit knows about the line to `tg` a few times a second.
function sense(u, tg, los, dt) {
  u.losT -= dt;
  if (u.losT > 0 && u.losTg === tg) return;
  u.losT = 0.1 + Math.random() * 0.08; u.losTg = tg;
  const def = u.def;
  u.shotOK = los === 'none' ? true : los === 'shot' ? !world.shotBlocked(u.x, u.y, tg.x, tg.y) : !world.solidBetween(u.x, u.y, tg.x, tg.y);
  if (def.flying || !world.navNeeded) { u.pathOK = true; u.wp = null; return; }
  u.pathOK = world.walkClear(u.x, u.y, tg.x, tg.y, def.r * 0.9) && (u.inHazard || !world.hazardBetween(u.x, u.y, tg.x, tg.y));
  u.wp = u.pathOK ? null : world.waypoint(u, tg);
}
function steer(u, tg) {
  const p = u.wp || tg, dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy) || 1;
  u.wantX = dx / d; u.wantY = dy / d;
}

// Nothing but a barricade between a unit and its target: go and break it down.
function siege(u, tg, a, dt) {
  let s = u.siege;
  if (!s || world.time - s.t > 1 || world.tiles[s.i] === 0) {
    const b = world.firstBreakable(u.x, u.y, tg.x, tg.y) || world.breakableNear(u.x, u.y, tg.x, tg.y, 150);
    s = u.siege = b ? { i: b.i, x: b.x, y: b.y, t: world.time } : null;
  }
  if (!s) return false;
  const dx = s.x - u.x, dy = s.y - u.y, d = Math.hypot(dx, dy) || 1;
  if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1;
  if (d > u.def.r + 16) { u.wantX = dx / d; u.wantY = dy / d; return true; }
  if (u.cd <= 0) {
    u.cd = a.cd; u.swing = 0.22;
    if (a.type === 'kamikaze') FO.kill(u, null, { quiet: true });        // the bomb does the rest
    else if (world.hitTile(s.i, Math.max(4, a.dmg))) u.siege = null;
  }
  return true;
}
FO.ai.sense = sense; FO.ai.steer = steer; FO.ai.siege = siege;   // for custom AIs in mechanics.js

// FO.ai.fighter, the standard AI, lives in tactics.js.

// Healers and other helpers: go to the most-hurt friend in reach and use the attack on them.
FO.ai.support = function (u, dt) {
  const def = u.def, a = def.attack, impl = def._atk;
  if (u.retT <= 0 || !u.target || !u.target.alive || u.target.side !== u.side || u.target.hp >= u.target.maxHp) {
    u.retT = 0.3 + Math.random() * 0.2;
    let best = null, bs = 0, friend = null, fd = Infinity;
    world.forNear(u.x, u.y, 360, o => {
      if (o === u || !o.alive || o.side !== u.side) return;
      const dd = Math.hypot(o.x - u.x, o.y - u.y);
      if (o.def.ai !== 'support' && dd < fd) { fd = dd; friend = o; }
      const miss = 1 - o.hp / o.maxHp;
      if (miss < 0.04) return;
      const s = miss * 400 - dd;
      if (!best || s > bs) { bs = s; best = o; }
    });
    u.target = best;
    if (!best && !friend) {
      for (const o of world.units) {
        if (o === u || !o.alive || o.side !== u.side || o.def.ai === 'support') continue;
        const dd = Math.hypot(o.x - u.x, o.y - u.y);
        if (dd < fd) { fd = dd; friend = o; }
      }
    }
    u.friend = friend;
  }
  const tg = u.target;
  if (tg) {
    const dx = tg.x - u.x, dy = tg.y - u.y, d = Math.hypot(dx, dy) || 1;
    const reach = impl.reach(u, tg, a) * FO.sightMul(u, a);
    sense(u, tg, impl.los, dt);
    if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1;
    if (d > reach * 0.8 || !u.shotOK) steer(u, tg);
    if (d <= reach && u.shotOK && u.cd <= 0) { impl.fire(u, tg, a, dx / d, dy / d, d); u.cd = a.cd * (0.85 + Math.random() * 0.3); u.swing = 0.22; }
  } else if (u.friend && u.friend.alive) {
    const f = u.friend, d = Math.hypot(f.x - u.x, f.y - u.y);
    sense(u, f, 'walk', dt);
    if (d > 46 + f.def.r) steer(u, f);
  } else {
    // nobody left to help: fight with whatever is to hand (unless it never fights)
    if (def.peaceful) return;
    if (!u.foe || !u.foe.alive || u.retT <= 0.05) u.foe = findEnemy(u);
    const e = u.foe; if (!e) return;
    const dx = e.x - u.x, dy = e.y - u.y, d = Math.hypot(dx, dy) || 1, reach = def.r + e.def.r + 4;
    sense(u, e, 'walk', dt);
    if (d > reach) steer(u, e);
    else if (u.cd <= 0) { FO.damage(e, a.bonk || 4, u, { nx: dx / d, ny: dy / d, direct: true }); u.cd = 1; u.swing = 0.22; }
  }
};

/* =====================================================================
   PER-UNIT UPDATE
   ===================================================================== */
function updateUnit(u, dt) {
  const def = u.def;
  if (u.flash > 0) u.flash -= dt;
  if (u.swing > 0) u.swing -= dt;
  if (u.pop > 0) u.pop -= dt;
  u.retT -= dt;

  // statuses
  let sm = 1, rm = 1, stun = false, blind = false, lure = false;
  if (u.st.length) {
    for (let i = u.st.length - 1; i >= 0; i--) {
      const s = u.st[i]; if (!s) continue;            // a tick can clear other statuses (water puts out fire), shortening the list under us
      s.t -= dt;
      if (s.impl.tick) s.impl.tick(u, s, dt);
      if (!u.alive) return;
      if (s.t <= 0) { const k = u.st.indexOf(s); if (k >= 0) u.st.splice(k, 1); if (s.impl.onEnd) s.impl.onEnd(u, s); continue; }
      sm *= s.sm != null ? s.sm : s.impl.speedMul; rm *= s.rm != null ? s.rm : s.impl.rateMul;      // a status can set its own s.sm / s.rm as it goes
      if (s.impl.stun) stun = true; if (s.impl.blind) blind = true; if (s.impl.lure) lure = true;
    }
  }
  // terrain underfoot
  u.inHazard = false; u.swimming = false; u.high = false; u.low = false; u.slick = false;
  if (!def.flying && !u.under) {
    const td = world.terrainAt(u.x, u.y);
    if (td) {
      if (def.swims && td.id === 'water') { sm *= def.swims; u.swimming = true; }   // swimmers are at home in water
      else if (def.waterWalk && td.id === 'water') { /* walks on the surface at full speed */ }
      else sm *= td.speedMul;
      if (td.hazard) u.inHazard = true;
      if (td.highGround) u.high = true;
      if (td.lowGround) u.low = true;
      if (td.slick) u.slick = true;
      if (td.onStand) { td.onStand(u, dt); if (!u.alive) return; }
    }
  }
  u.speedMul = sm; u.rateMul = rm; u.stunned = stun; u.blind = blind;
  const ou = def._onUpdate;
  for (let i = 0; i < ou.length; i++) { ou[i].impl.onUpdate(u, dt, ou[i].p); if (!u.alive) return; }

  u.wantX = 0; u.wantY = 0;
  if (!stun) {
    u.cd -= dt * u.rateMul;
    if (blind) FO.ai.blind(u, dt);                                  // can't see: no nature, no plan
    else if (lure) FO.ai.lured(u, dt);                              // there is a muffin
    else if (!u.nature || !FO.nature.act(u, dt)) (FO.ai[def.ai] || FO.ai.fighter)(u, dt);      // a nature can hold a fighter back; otherwise its own AI decides
    if (u.nature) FO.nature.after(u);
  }
  const sp = def.speed * u.speedMul;
  const a = Math.min(1, dt * (u.slick ? 1.3 : 8));      // on ice you can't change direction quickly
  u.vx += (u.wantX * sp - u.vx) * a; u.vy += (u.wantY * sp - u.vy) * a;
  u.x += (u.vx + u.kx) * dt; u.y += (u.vy + u.ky) * dt;
  const kd = Math.exp(-dt * (u.slick ? 1.5 : 6)); u.kx *= kd; u.ky *= kd;      // ...and a shove sends you sliding
  const v = Math.hypot(u.vx, u.vy);
  u.moving = v > 8;
  if (u.moving) u.phase += dt * v / (def.r * 0.8 + 4);
}

/* =====================================================================
   STEP
   ===================================================================== */
FO.step = function (dt) {
  world.time += dt;
  world.ensureDerived();
  world.astarBudget = 14;
  world.rebuildGrid();
  if (FO.tactics) FO.tactics.tick(dt);
  FO.nature.tick();
  const units = world.units;
  for (let i = 0; i < units.length; i++) { const u = units[i]; if (!u.alive) continue; if (u.carried) FO.carryTick(u, dt); else updateUnit(u, dt); }

  // keep units from overlapping (ground and air are separate layers). The hottest loop in the game, so it walks the
  // grid itself rather than going through forNear; the order it visits pairs in is the same.
  world.rebuildGrid();
  separate(units);
  // terrain + field edges
  for (let i = 0; i < units.length; i++) {
    const u = units[i]; if (!u.alive) continue;
    if (!u.def.flying && !u.under && !u.carried) {
      world.resolveTiles(u);
    }
    const r = u.def.r;
    if (u.x < r) { u.x = r; u.kx = Math.abs(u.kx); } else if (u.x > W - r) { u.x = W - r; u.kx = -Math.abs(u.kx); }
    if (u.y < r) { u.y = r; u.ky = Math.abs(u.ky); } else if (u.y > H - r) { u.y = H - r; u.ky = -Math.abs(u.ky); }
    // how it actually moved this step (blocked by a wall = not moving), for anything that leads a shot
    u.rvx = u.px == null ? 0 : (u.x - u.px) / dt; u.rvy = u.py == null ? 0 : (u.y - u.py) / dt; u.px = u.x; u.py = u.y;
  }

  if (FO.react) FO.react.tick(dt);
  if (FO.stats) FO.stats.tick();
  if (FO.lifeTick) FO.lifeTick();
  if (FO.fibTick) FO.fibTick();
  if (FO.updateProps) FO.updateProps(dt);
  updateShots(dt);

  // drop the dead
  let anyDead = false;
  for (let i = 0; i < units.length; i++) if (!units[i].alive) { anyDead = true; break; }
  if (anyDead) {
    world.units = units.filter(u => u.alive);
    world.watchers = world.watchers.filter(u => u.alive);
  }
  checkEnd(dt);
};

function separate(units) {
  const G = world.grid, cells = G.cells, CELL = G.CELL, GC = G.GC, GR = G.GR, maxR = world.liveMaxR;
  for (let i = 0; i < units.length; i++) {
    const u = units[i]; if (!u.alive || u.under || u.carried) continue;
    const ur = u.def.r, um = u.def.mass, uf = u.def.flying, rad = ur + maxR, uid = u.id;
    const x0 = Math.max(0, ((u.x - rad) / CELL) | 0), x1 = Math.min(GC - 1, ((u.x + rad) / CELL) | 0);
    const y0 = Math.max(0, ((u.y - rad) / CELL) | 0), y1 = Math.min(GR - 1, ((u.y + rad) / CELL) | 0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const c = cells[cy * GC + cx];
      for (let k = 0; k < c.length; k++) {
        const o = c[k];
        if (o.id <= uid || !o.alive || o.under || o.carried || o.def.flying !== uf) continue;
        let dx = o.x - u.x, dy = o.y - u.y; const rr = ur + o.def.r, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        let d = Math.sqrt(d2);
        if (d < 0.01) { const a = Math.random() * 6.28; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
        const om = o.def.mass, ov = (rr - d) * 0.6, nx = dx / d, ny = dy / d, tot = um + om;
        const pu = ov * (om / tot), po = ov * (um / tot);
        u.x -= nx * pu; u.y -= ny * pu; o.x += nx * po; o.y += ny * po;
      }
    }
  }
}

/* ---------- battle flow ---------- */
function sidesAlive() { const s = new Set(); for (const u of world.units) if (u.alive) s.add(u.side); return s; }

let stallT = 0, stallWin = 0, stallPos = null;
function checkEnd(dt) {
  if (world.result) return;
  const sides = sidesAlive();
  if (sides.size <= 1) return finish(sides.size ? 'win' : 'wipeout');
  // stalemate: nobody has been hurt and nobody is really moving
  stallWin += dt;
  if (stallWin >= 3) {
    let moved = 0, n = 0;
    const next = new Map();
    for (const u of world.units) {
      next.set(u.id, [u.x, u.y]);
      const p = stallPos && stallPos.get(u.id);
      if (p) { moved += Math.hypot(u.x - p[0], u.y - p[1]); n++; }
    }
    const quiet = world.time - world.lastDamageT > 3 && n > 0 && moved / n < 9;
    stallT = quiet ? stallT + stallWin : 0;
    stallPos = next; stallWin = 0;
    if (stallT >= 6 && FO.nature.breakAll()) stallT = 0;          // gone quiet: fighters holding back stop holding back
    if (stallT >= 12) finish('stalemate');
  }
}
function finish(kind) {
  const alive = world.units.filter(u => u.alive);
  world.result = {
    kind, time: world.time, mode: world.fightMode, ffa: world.ffa, survivors: alive.length,
    winner: kind === 'win' && alive.length ? alive[0] : null,
    winnerTeam: kind === 'win' && alive.length && world.fightMode === 'teams' ? alive[0].team : null,
    mvp: world.best || null,
  };
  world.mode = 'over';
  FO.emit('end', world.result);
}

FO.startBattle = function () {
  const units = world.units;
  if (!units.length) return 'empty';
  world.snap = world.snapshot();
  world.snapMode = world.fightMode;
  units.forEach(u => { u.side = FO.sideFor(u); u.target = null; u.retT = 0; u.losT = 0; u.path = null; u.born = 0; });
  if (sidesAlive().size < 2) { world.snap = null; return world.fightMode === 'ffa' ? 'ffa-one' : world.fightMode === 'units' ? 'units-one' : 'one-team'; }
  world.time = 0; world.lastDamageT = 0; world.result = null; world.best = null; world.fallen = [];
  world.teamStats = FO.teams.map((_, i) => ({ start: units.filter(u => u.team === i).length, kills: 0, lost: 0 }));
  world.startTotal = units.length;
  world.typeStats = {};
  for (const u of units) { const s = world.typeStats[u.def.id] || (world.typeStats[u.def.id] = { def: u.def, team: u.team, start: 0, kills: 0 }); s.start++; }
  stallT = 0; stallWin = 0; stallPos = null;
  world.clearFields();
  if (FO.stats) FO.stats.reset();
  world.mode = 'running';
  FO.emit('start');
  return 'ok';
};
FO.resetBattle = function () {
  if (!world.snap) return false;
  world.restore(world.snap);
  world.snap = null; world.result = null; world.mode = 'edit'; world.time = 0; world.best = null; world.fallen = [];
  world.watchers = world.watchers.filter(u => u.alive && world.units.indexOf(u) >= 0);
  FO.emit('reset');
  return true;
};
FO.clearField = function () {
  world.units = []; world.shots = []; world.fx = []; world.watchers = []; world.props = []; world.slipping = [];
  world.tiles.fill(0); world.resetTileDamage(); world.touchTiles();
  world.snap = null; world.result = null; world.mode = 'edit'; world.time = 0; world.best = null; world.fallen = [];
  FO.emit('reset');
};
world.teamStats = FO.teams.map(() => ({ start: 0, kills: 0, lost: 0 }));
world.typeStats = {};
world.fallen = []; world.best = null; world.lastDamageT = 0; world.snap = null;

/* =====================================================================
   PLACEMENT HELPERS (used by painting and scenarios)
   ===================================================================== */
FO.canPlace = function (def, x, y, slack) {
  const r = def.r;
  if (def.grid) { const p = FO.life.snap(x, y); x = p[0]; y = p[1]; if (FO.life.cellTaken(x, y)) return false; }
  if (x < r || y < r || x > W - r || y > H - r) return false;
  if (!def.flying && !world.fits(x, y, r * 0.95)) return false;
  let hit = false;
  world.forNear(x, y, r + FO.maxR, o => {
    if (!o.alive) return;
    const rr = (r + o.def.r) * (slack || 0.92), dx = o.x - x, dy = o.y - y;
    if (dx * dx + dy * dy < rr * rr) { hit = true; return false; }
  });
  return !hit;
};

// Builder handed to scenarios.
FO.builder = function () {
  const T = FO.TILE, sx = W / 1600, sy = H / 1000;
  let nat = null;
  const born = u => { if (u && nat) FO.nature.set(u, nat); return u; };
  const b = {
    W: 1600, H: 1000,
    // every fighter placed after this gets the nature (null goes back to the default)
    nature(id) { nat = id || null; return b; },
    // scatter n units of a type inside a w×h box centred on (cx, cy)
    army(id, team, cx, cy, w, h, n) {
      const def = FO.units[id]; if (!def) return b;
      cx *= sx; cy *= sy; w *= sx; h *= sy;
      let k = 0, guard = 0;
      while (k < n && guard++ < n * 30) {
        const x = cx + (Math.random() - 0.5) * w, y = cy + (Math.random() - 0.5) * h;
        if (FO.canPlace(def, x, y)) { born(FO.spawn(def, x, y, team)); k++; }
      }
      return b;
    },
    unit(id, team, x, y) { born(FO.spawn(id, x * sx, y * sy, team)); return b; },
    prop(id, x, y) { FO.placeProp(id, x * sx, y * sy); return b; },
    // place units on exact tiles from a picture: rows of text, anything but '.' or ' ' is a unit. (col, row) is the top-left tile
    cells(id, team, col, row, rows) {
      rows.forEach((line, j) => { for (let i = 0; i < line.length; i++) if (line[i] !== '.' && line[i] !== ' ') FO.spawn(id, (col + i + 0.5) * T, (row + j + 0.5) * T, team); });
      return b;
    },
    // fill a rectangle / line / circle of terrain (world units)
    rect(terrainId, x0, y0, x1, y1) {
      const idx = terrainId ? FO.terrainById[terrainId].index : 0;
      x0 = Math.round(x0 * sx / T) * T; x1 = Math.max(x0 + T, Math.round(x1 * sx / T) * T); y0 = Math.round(y0 * sy / T) * T; y1 = Math.max(y0 + T, Math.round(y1 * sy / T) * T);
      for (let ty = Math.max(0, (y0 / T) | 0); ty < Math.min(world.TR, Math.ceil(y1 / T)); ty++)
        for (let tx = Math.max(0, (x0 / T) | 0); tx < Math.min(world.TC, Math.ceil(x1 / T)); tx++) world.tiles[ty * world.TC + tx] = idx;
      world.touchTiles(); return b;
    },
    line(terrainId, x0, y0, x1, y1, thick) {
      const idx = terrainId ? FO.terrainById[terrainId].index : 0;
      x0 *= sx; x1 *= sx; y0 *= sy; y1 *= sy;
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (T / 2));
      for (let i = 0; i <= n; i++) world.paintTiles(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, (thick || T) / 2, idx);
      return b;
    },
    blob(terrainId, cx, cy, r) { world.paintTiles(cx * sx, cy * sy, r * sx, terrainId ? FO.terrainById[terrainId].index : 0); return b; },
  };
  return b;
};
FO.loadScenario = function (sc) {
  FO.clearField();
  FO.setMode(sc.mode || 'teams');
  world.rebuildGrid();
  sc.build(FO.builder());
  world.ensureDerived();
  // anything that ended up inside a wall gets nudged out
  for (const u of world.units) if (!u.def.flying) world.resolveTiles(u);
  FO.emit('scenario', sc);
};
})();
