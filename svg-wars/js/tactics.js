/* =====================================================================
   SVG WARS · tactics
   How ordinary fighters think. Every unit gets a role from its stats
   (or def.role to override), and the role decides who it goes after
   and how it moves:
     line        ordinary melee: marches with its army, surrounds its target,
                 and goes after whatever is attacking its own back line
     tank        tough melee: leads the line
     skirmisher  fast melee: swings wide round the flank and hunts the back line
     brute       giants: charge straight in, looking for crowds
     bomber      kamikaze: dives at the thickest crowd
     ranged      keeps its distance, steps back while reloading when something
                 closes in, and takes nearby high ground and holds it
     support     healers (their AI is in sim.js)
   Hurt fighters that are badly outnumbered fall back to a medic
   or their own army, then rejoin. Before the armies meet, each side
   advances together instead of streaming in one at a time.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, W = FO.W, H = FO.H;

FO.roleOf = function (def) {
  if (def._role) return def._role;
  const a = def.attack;
  let r;
  if (def.role) r = def.role;
  else if (def.ai === 'support') r = 'support';
  else if (a.type === 'kamikaze') r = 'bomber';
  else if (a.range >= 110 && a.type !== 'breath') r = 'ranged';
  else if (def.r >= 20) r = 'brute';
  else if (def.armor >= 3 || def.hp >= 180) r = 'tank';
  else if (def.speed >= 85) r = 'skirmisher';
  else r = 'line';
  return (def._role = r);
};
const backline = role => role === 'ranged' || role === 'support';

/* ---------- what each army looks like, refreshed five times a second ---------- */
const sides = new Map();
let tickT = 0;
FO.tactics = {
  sides,
  reset() { tickT = 0; sides.clear(); },
  tick(dt) {
    tickT -= dt; if (tickT > 0) return; tickT = 0.2;
    sides.clear();
    const us = world.units;
    let tx = 0, ty = 0, tn = 0;
    for (const u of us) {
      if (!u.alive || u.under) continue;
      u.atk = 0; tx += u.x; ty += u.y; tn++;
      let s = sides.get(u.side);
      if (!s) sides.set(u.side, s = { n: 0, x: 0, y: 0, f: 0, fn: 0, ax: 0, ay: 0 });
      s.n++; s.x += u.x; s.y += u.y;
    }
    for (const s of sides.values()) {
      s.cx = s.x / s.n; s.cy = s.y / s.n;
      const en = tn - s.n;
      if (en > 0) {
        const ex = (tx - s.x) / en, ey = (ty - s.y) / en, d = Math.hypot(ex - s.cx, ey - s.cy) || 1;
        s.ax = (ex - s.cx) / d; s.ay = (ey - s.cy) / d;
      }
    }
    for (const u of us) {
      if (!u.alive || u.under) continue;
      const s = sides.get(u.side), role = FO.roleOf(u.def);
      u.adv = (u.x - s.cx) * s.ax + (u.y - s.cy) * s.ay;          // how far ahead of its army's centre it is
      if ((role === 'line' || role === 'tank') && !u.def.flying) { s.f += u.adv; s.fn++; }
      const t = u.target;
      if (t && t.alive && !backline(role) && Math.hypot(t.x - u.x, t.y - u.y) < t.def.r + u.def.r + 30) t.atk++;
    }
    for (const s of sides.values()) s.front = s.fn ? s.f / s.fn : 0;
  },
};
FO.on('start', () => FO.tactics.reset());

/* ---------- small helpers ---------- */
function go(u, x, y, mag) {
  const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy) || 1;
  u.wantX = dx / d * mag; u.wantY = dy / d * mag;
}
// Walk toward the target, using the pathfinder's waypoint when the straight line is blocked.
function approach(u, tg, mag) {
  if (u.wp || !u.pathOK) { FO.ai.steer(u, tg); u.wantX *= mag; u.wantY *= mag; }
  else go(u, tg.x, tg.y, mag);
}
const hazardAt = (x, y) => { const t = world.terrainAt(x, y); return !!(t && (t.hazard || t.lowGround)); };

// Before the fighting starts, units that have got ahead of their army ease off so it arrives together.
function cohesion(u, role, d) {
  if (world.fightMode === 'ffa' || world.time > 20 || d < 230 || u.def.flying) return 1;
  if (role === 'skirmisher' || role === 'brute' || role === 'bomber') return 1;
  const s = sides.get(u.side);
  if (!s || s.n < 4 || !s.fn || u.adv == null) return 1;
  const lead = role === 'tank' ? s.front + 50 : backline(role) ? s.front - 70 : s.front + 12;
  return FO.clamp(1 - (u.adv - lead) / 35, 0.15, 1);
}

/* ---------- choosing a target ---------- */
function pickTarget(u, role) {
  const def = u.def, range = def.attack.range || 0;
  const cur = u.target && u.target.alive && !u.target.untargetable && u.target.side !== u.side ? u.target : null;
  const walled = world.navNeeded && !def.flying;
  const zone = u.nature ? FO.nature.zone(u) : 0, inflicts = def.attack.inflict && def.attack.inflict[0], avoid = def.attack.avoid;                 // territorial: only what is inside the territory
  let best = null, bs = Infinity;
  world.forNear(u.x, u.y, role === 'skirmisher' ? 460 : 360, o => {
    if (o.side === u.side || !o.alive || o.untargetable) return;
    if (zone && Math.hypot(o.x - u.hx, o.y - u.hy) > zone + o.def.r) return;
    const d = Math.hypot(o.x - u.x, o.y - u.y), orole = FO.roleOf(o.def);
    let sc = d;
    if (o === cur) sc -= 45;                                    // finish what you started
    sc -= (1 - o.hp / o.maxHp) * 50;                            // and pick off the wounded
    if (!backline(role)) {                                      // don't all pile onto one enemy
      const cap = Math.max(2, Math.round(o.def.r / 4)), n = o.atk - (o === cur ? 1 : 0);
      sc += n >= cap ? 120 : n * 10;
    }
    if (role === 'ranged') {
      if (d <= range) sc -= 70;
      if (!backline(orole) && d < 130) sc -= 110;               // shoot whatever is about to reach you
    } else if (role === 'skirmisher') {
      sc *= 0.55;
      if (backline(orole)) sc -= 170;                           // hunt archers and medics
    } else if (role === 'brute' || role === 'bomber') {
      let n = 0;
      world.forNear(o.x, o.y, 55, q => { if (q.alive && q.side !== u.side && (q.x - o.x) ** 2 + (q.y - o.y) ** 2 < 3025) n++; });
      sc -= n * (role === 'bomber' ? 40 : 18);                  // go where it's crowded
    } else {
      const t = o.target;                                       // protect your own back line
      if (t && t.side === u.side && t !== u && backline(FO.roleOf(t.def))) sc -= 45;
    }
    if (inflicts && FO.hasStatus(o, inflicts)) sc += 90;
    if (avoid && o.st.length && avoid.some(id => FO.hasStatus(o, id))) sc += 90;         // already has what this attack gives: pick someone else
    sc -= FO.preyPull(u, o);                                    // natural prey comes first
    if (sc < bs && walled && !def.attack.arc && world.solidBetween(u.x, u.y, o.x, o.y)) sc += 220;      // only worth checking for a would-be best
    if (sc < bs) { bs = sc; best = o; }
  });
  return best || (zone ? FO.nature.threat(u) : FO.findEnemy(u));
}

/* ---------- falling back ---------- */
function maybeFlee(u, role) {
  const s = u.ts;
  if (u.hp > u.maxHp * 0.3 || s.fled || world.fightMode === 'ffa') return false;
  if (role === 'brute' || role === 'tank' || role === 'bomber' || u.def.cost > 120) return false;
  let mine = 0, theirs = 0;
  world.forNear(u.x, u.y, 150, o => {
    if (!o.alive || o === u || Math.hypot(o.x - u.x, o.y - u.y) > 150) return;
    const v = o.def.cost * o.hp / o.maxHp;
    if (o.side === u.side) mine += v; else theirs += v;
  });
  if (theirs < mine * 1.8 + 10) return false;
  s.fled = 1;
  u.fleeT = 2.6; u.refuge = refuge(u);
  FO.fx.text(u.x, u.y - u.def.r - 6, '!', '#c8102e', 16);
  if (FO.chance(0.25)) FO.fx.say(u, FO.pick(['Fall back!', 'Retreat!', 'Nope!', 'Help!']));
  return true;
}
function refuge(u) {
  let best = null, bd = 420;
  for (const o of world.units) {
    if (!o.alive || o.side !== u.side || FO.roleOf(o.def) !== 'support') continue;
    const d = Math.hypot(o.x - u.x, o.y - u.y);
    if (d < bd) { bd = d; best = o; }
  }
  if (best) return { u: best };
  const s = sides.get(u.side);
  if (s && s.n > 3) return { x: s.cx - s.ax * 80, y: s.cy - s.ay * 80 };
  return null;
}
function fleeMove(u, dt) {
  const r = u.refuge;
  u.fleeT -= dt;
  let px, py;
  if (r && r.u) { if (!r.u.alive) { u.fleeT = 0; return; } px = r.u.x; py = r.u.y; }
  else if (r) { px = r.x; py = r.y; }
  else { const e = FO.findEnemy(u); if (!e) { u.fleeT = 0; return; } px = u.x * 2 - e.x; py = u.y * 2 - e.y; }
  if (Math.hypot(px - u.x, py - u.y) < 26) { u.fleeT = 0; return; }
  go(u, FO.clamp(px, 20, W - 20), FO.clamp(py, 20, H - 20), 1);
  if (Math.abs(u.wantX) > 0.1) u.face = u.wantX > 0 ? 1 : -1;
}

/* ---------- ranged: keep your distance, take the high ground ---------- */
function threat(u) {
  let best = null, bd = Infinity;
  world.forNear(u.x, u.y, 140, o => {
    if (!o.alive || o.side === u.side || o.untargetable || backline(FO.roleOf(o.def))) return;
    const d = Math.hypot(o.x - u.x, o.y - u.y);
    if (d < o.def.r + u.def.r + 50 + (o.def.attack.reach || 4) && d < bd) { bd = d; best = o; }
  });
  return best;
}
function rangedMove(u, tg, d, reach, inRange, dt) {
  const s = u.ts;
  s.thT = (s.thT || 0) - dt;
  if (s.thT <= 0) { s.thT = 0.15; s.th = threat(u); }
  const th = s.th;
  if (th && th.alive && u.cd > 0.1) {                            // step back while reloading
    const ax = u.x - th.x, ay = u.y - th.y, ad = Math.hypot(ax, ay) || 1, r = u.def.r;
    const bx = u.x + ax / ad * 30, by = u.y + ay / ad * 30;
    if (bx > r && by > r && bx < W - r && by < H - r && (u.def.flying || (world.fits(bx, by, r * 0.9) && !hazardAt(bx, by)))) {
      u.wantX = ax / ad; u.wantY = ay / ad; return;
    }
  }
  if (s.hill === undefined) {                                    // is there high ground nearby, on the way?
    s.hill = null;
    const h = FO.terrainById.hill, si = sides.get(u.side);
    if (h && !u.def.flying) {
      const t = world.nearestTile(u.x, u.y, h.index, 230);
      if (t && (!si || (t.x - u.x) * si.ax + (t.y - u.y) * si.ay > -80)) s.hill = t;
    }
  }
  if (s.hill && !u.high && world.time < 25 && !inRange) { go(u, s.hill.x, s.hill.y, 1); return; }
  if (u.high && !inRange && d < reach * 1.9 && world.time < 30) return;   // let them come to you
  if (!inRange) approach(u, tg, cohesion(u, 'ranged', d));
}

/* ---------- melee: march together, flank, surround ---------- */
function meleeMove(u, tg, d, role) {
  if (u.wp || !u.pathOK) { approach(u, tg, cohesion(u, role, d)); return; }
  let px = tg.x, py = tg.y;
  if (role === 'skirmisher' && d > 170) {                        // swing wide round the side
    const nx = (tg.x - u.x) / d, ny = (tg.y - u.y) / d, side = u.id % 2 ? 1 : -1, off = Math.min(160, d * 0.55);
    px = FO.clamp(tg.x - ny * side * off, 20, W - 20); py = FO.clamp(tg.y + nx * side * off, 20, H - 20);
    if (!u.def.flying && !world.walkClear(u.x, u.y, px, py, u.def.r * 0.9)) { px = tg.x; py = tg.y; }
  } else if (d < 110 && role !== 'brute') {                      // come at it from your own angle, so a crowd surrounds it
    const ang = Math.atan2(u.y - tg.y, u.x - tg.x) + ((u.id % 5) - 2) * 0.32, rr = tg.def.r + u.def.r + 2;
    px = tg.x + Math.cos(ang) * rr; py = tg.y + Math.sin(ang) * rr;
  }
  go(u, px, py, cohesion(u, role, d));
}

/* ---------- the fighter AI ---------- */
FO.ai.fighter = function (u, dt) {
  const def = u.def, a = def.attack, impl = def._atk, role = FO.roleOf(def);
  if (u.st.length) {                                             // panicking: run from whatever scared you
    const f = u.st.find(s => s.id === 'fear');
    if (f && f.src && f.src.alive) {
      const dx = u.x - f.src.x, dy = u.y - f.src.y, d = Math.hypot(dx, dy) || 1;
      u.wantX = dx / d; u.wantY = dy / d; if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1;
      return;
    }
  }
  if (u.fleeT > 0) { fleeMove(u, dt); return; }
  if (!u.target || !u.target.alive || u.target.untargetable || u.target.side === u.side || u.retT <= 0) {
    u.target = pickTarget(u, role); u.retT = 0.35 + Math.random() * 0.3;
    if (maybeFlee(u, role)) { fleeMove(u, dt); return; }
  }
  const tg = u.target;
  if (!tg) return;
  const dx = tg.x - u.x, dy = tg.y - u.y, d = Math.hypot(dx, dy) || 1;
  const reach = impl.reach(u, tg, a) * FO.sightMul(u, a);
  FO.ai.sense(u, tg, def.flying || a.arc ? 'none' : impl.los, dt);      // arcing shooters don't need a clear line
  if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1;
  const inRange = d <= reach * (a.range ? 0.92 : 1) && u.shotOK;
  if (!inRange && !u.pathOK && !u.wp && !def.flying && a.type !== 'heal' && FO.ai.siege(u, tg, a, dt)) return;
  if (role === 'ranged') rangedMove(u, tg, d, reach, inRange, dt);
  else if (!inRange) meleeMove(u, tg, d, role);
  if (d <= reach && u.shotOK && u.cd <= 0) {
    impl.fire(u, tg, a, dx / d, dy / d, d);
    u.cd = a.cd * (0.85 + Math.random() * 0.3);
    u.swing = 0.22;
  }
};
})();
