/* =====================================================================
   SVG WARS · mechanics
   The reusable building blocks units are made from:
     attacks  – how a unit hurts (or helps) its target
     traits   – passive abilities that hook into the simulation
     statuses – timed effects such as burning or chilled
   Add a new one here and any unit in content/units.js can use it.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, fx = FO.fx;

/* =====================================================================
   ATTACKS
   ===================================================================== */

// Hit the target in front of you. Options: reach, knock, splash (radius hit around the target), inflict.
FO.defineAttack('melee', {
  los: 'walk',
  reach: (u, tg, a) => u.def.r + tg.def.r + (a.reach || 4),
  fire(u, tg, a, nx, ny) {
    const mul = u.hitMul; u.hitMul = 1;
    const big = mul > 1.5;
    FO.damage(tg, a.dmg * mul, u, { nx, ny, knock: (a.knock || 0) * (big ? 1.6 : 1) + (big ? 160 : 0), direct: true, inflict: a.inflict });
    fx.slash(tg, nx, ny, FO.teams[u.team].dark);
    if (a.splash) {
      // a swing connects with a handful of the nearest bodies, not an entire crowd
      const hits = [];
      world.forNear(tg.x, tg.y, a.splash + FO.maxR, o => {
        if (o === tg || !o.alive || o.side === u.side) return;
        const dd = Math.hypot(o.x - tg.x, o.y - tg.y);
        if (dd < a.splash + o.def.r) hits.push([dd, o]);
      });
      hits.sort((p, q) => p[0] - q[0]);
      for (const [dd, o] of hits.slice(0, a.maxHits || 5)) {
        const d = dd || 1;
        FO.damage(o, a.dmg * 0.6, u, { nx: (o.x - tg.x) / d, ny: (o.y - tg.y) / d, knock: a.knock });
      }
      fx.ring(tg.x, tg.y, a.splash); FO.shake(5);
    }
    FO.emit('swing', u, big);
  },
});

// Fire a projectile. Options: range, speed, look ('arrow'|'orb'|'glyph'), glyph, color, hitscan, splash, inflict, pierce, spread, count.
FO.defineAttack('shoot', {
  los: 'shot',
  reach: (u, tg, a) => a.range,
  fire(u, tg, a, nx, ny, d) {
    const r = u.def.r;
    if (a.hitscan) {
      const hit = world.shotBlocked(u.x, u.y, tg.x, tg.y);
      if (hit) fx.dots(hit.x, hit.y, '#666a75', 5, 100, 1.4);
      else FO.damage(tg, a.dmg, u, { nx, ny, knock: a.knock, direct: true, inflict: a.inflict });
      fx.tracer(u.x + nx * r, u.y + ny * r, hit ? hit.x : tg.x, hit ? hit.y : tg.y, a.color);
      FO.emit('shoot', u, 'bang');
      return;
    }
    // Arcing shot: when something solid is in the way, loose the arrow high so it comes down on the far side.
    if (a.arc && world.shotBlocked(u.x, u.y, tg.x, tg.y)) {
      const dur = 0.55 + d / 700, h = 55 + d * 0.3;
      FO.shoot({ look: 'arrow', pinpoint: true, air: true, x: u.x, y: u.y - u.def.r * 0.4, vx: 0, vy: 0, life: dur, dmg: a.dmg, side: u.side, src: u, inflict: a.inflict,
        lob: { x1: tg.x + (tg.rvx || 0) * dur * 0.75 + FO.rand(-6, 6), y1: tg.y + (tg.rvy || 0) * dur * 0.75 + FO.rand(-6, 6), dur, h } });
      FO.emit('shoot', u, 'twang');
      return;
    }
    const spd = a.speed || 420, lead = d / spd;
    for (let k = 0; k < (a.count || 1); k++) {
      let px = tg.x + tg.vx * lead - u.x, py = tg.y + tg.vy * lead - u.y;
      const ang = Math.atan2(py, px) + (Math.random() - 0.5) * (a.spread || 0.04);
      FO.shoot({
        look: a.look || 'arrow', glyph: a.glyph, color: a.color,
        x: u.x + Math.cos(ang) * r, y: u.y + Math.sin(ang) * r, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        ax: tg.x, ay: tg.y, life: a.range * (u.high ? 1.7 : 1.3) / spd, dmg: a.dmg, side: u.side, src: u,
        rad: a.rad || 2, splash: a.splash, inflict: a.inflict, knock: a.knock, pierce: a.pierce || 0, boom: a.boom,
      });
    }
    FO.emit('shoot', u, a.look === 'arrow' || !a.look ? 'twang' : 'pew');
  },
});

// Tessa's jewelry. Each throw is one of two: a diamond ring that goes straight through the first fighter it hits and
// on into the next, or a pair of earrings that fan out and leave their targets bleeding.
FO.defineAttack('bling', {
  los: 'shot',
  reach: (u, tg, a) => a.range,
  fire(u, tg, a, nx, ny, d) {
    const spd = a.speed || 460, lead = d / spd, r = u.def.r, base = Math.atan2(tg.y + tg.vy * lead - u.y, tg.x + tg.vx * lead - u.x);
    const shot = (ang, o) => FO.shoot(Object.assign({ look: 'glyph', x: u.x + Math.cos(ang) * r, y: u.y + Math.sin(ang) * r, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      ax: tg.x, ay: tg.y, life: a.range * (u.high ? 1.7 : 1.3) / spd, side: u.side, src: u, rad: 4 }, o));
    const ring = FO.chance(0.5);
    if (ring) shot(base + FO.rand(-0.02, 0.02), { glyph: '💍', dmg: a.dmg * 1.5, pierce: 1 });
    else for (const off of [-0.09, 0.09]) shot(base + off, { glyph: '💎', dmg: a.dmg * 0.5, inflict: ['bleed', 2.5] });
    if (FO.chance(0.2)) fx.text(u.x, u.y - r - 6, ring ? 'Tiffany' : 'Kendra Scott', ring ? '#1f9c95' : '#a9791c', 11);
    FO.emit('shoot', u, 'pew');
  },
});

// Throw something in an arc. It flies over walls and lands with a splash. Options: range, splash, flight, glyph, inflict, boom,
// soft (lands quietly: no bang, no shake, breaks nothing).
FO.defineAttack('lob', {
  los: 'none',
  reach: (u, tg, a) => a.range,
  fire(u, tg, a, nx, ny, d) {
    const dur = (a.flight || 0.9) * (0.6 + 0.4 * Math.min(1, d / a.range));
    FO.shoot({
      look: 'glyph', glyph: a.glyph || '🪨', x: u.x, y: u.y, vx: 0, vy: 0, life: dur, dmg: a.dmg, side: u.side, src: u,
      splash: a.splash || 40, inflict: a.inflict, knock: a.knock || 120, boom: a.boom, soft: a.soft, air: true,
      lob: { x1: tg.x + tg.vx * dur * 0.7 + FO.rand(-8, 8), y1: tg.y + tg.vy * dur * 0.7 + FO.rand(-8, 8), dur, h: 40 + d * 0.22 },
    });
    FO.emit('shoot', u, 'whoosh');
  },
});

// Lightning that jumps between enemies. Options: range, chains, jump, falloff.
FO.defineAttack('zap', {
  los: 'shot',
  reach: (u, tg, a) => a.range,
  fire(u, tg, a) {
    const hit = [tg];
    let from = u, cur = tg, dmg = a.dmg;
    for (let k = 0; k <= (a.chains || 2) && cur; k++) {
      fx.bolt(from.x, from.y, cur.x, cur.y, a.color);
      const dx = cur.x - from.x, dy = cur.y - from.y, dd = Math.hypot(dx, dy) || 1;
      FO.damage(cur, dmg, u, { nx: dx / dd, ny: dy / dd, direct: k === 0, inflict: a.inflict });
      dmg *= a.falloff || 0.7; from = cur;
      let next = null, nd = (a.jump || 90) ** 2;
      world.forNear(cur.x, cur.y, a.jump || 90, o => {
        if (!o.alive || o.side === u.side || hit.indexOf(o) >= 0) return;
        const q = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2;
        if (q < nd) { nd = q; next = o; }
      });
      cur = next; if (cur) hit.push(cur);
    }
    if (FO.react) { FO.react.shock(tg.x, tg.y, a.dmg * 0.6, u, hit); if (FO.chance(0.35)) FO.react.heat(tg.x, tg.y, 0); }
    FO.emit('zap', u);
  },
});

// A stream of short-lived puffs (dragon fire). Options: range, inflict, color.
FO.defineAttack('breath', {
  los: 'none',
  reach: (u, tg, a) => a.range,
  fire(u, tg, a, nx, ny) {
    const r = u.def.r;
    for (let k = 0; k < 2; k++) {
      const ang = Math.atan2(ny, nx) + (Math.random() - 0.5) * 0.45, spd = 230 + Math.random() * 70, life = (a.range + 30) / spd;
      FO.shoot({ look: 'puff', x: u.x + Math.cos(ang) * r * 0.9, y: u.y + Math.sin(ang) * r * 0.9, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        life, dmg: a.dmg, side: u.side, src: u, rad: 5, air: true, inflict: a.inflict, lift: u.def.flying ? 14 : 0 });
    }
    if (FO.chance(0.15)) FO.emit('shoot', u, 'roar');
  },
});

// Run at the enemy and go off. Pair with the `volatile` trait, which does the actual bang.
FO.defineAttack('kamikaze', {
  los: 'walk',
  reach: (u, tg, a) => u.def.r + tg.def.r + 6,
  fire(u) { FO.kill(u, null, { quiet: true }); },
});

// A yell that hits everyone in front. Options: range, knock, inflict.
FO.defineAttack('shout', {
  los: 'walk',
  reach: (u, tg, a) => a.range,
  fire(u, tg, a, nx, ny) {
    world.forNear(u.x, u.y, a.range + FO.maxR, o => {
      if (!o.alive || o.side === u.side) return;
      const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy) || 1;
      if (d > a.range + o.def.r || (dx * nx + dy * ny) / d < 0.2) return;
      FO.damage(o, a.dmg, u, { nx: dx / d, ny: dy / d, knock: a.knock, direct: o === tg, inflict: a.inflict });
    });
    fx.ring(u.x + nx * a.range * 0.5, u.y + ny * a.range * 0.5, a.range * 0.55, '#e86a9a', 3);
    fx.text(u.x + nx * 22, u.y - u.def.r - 6, '!!', '#c8102e', 15);
    FO.emit('shoot', u, 'whoosh');
  },
});

// A long sticky tongue: hits from a distance and yanks the target in. Options: range, pull.
FO.defineAttack('tongue', {
  los: 'shot',
  reach: (u, tg, a) => a.range,
  fire(u, tg, a, nx, ny) {
    fx.tracer(u.x + nx * u.def.r, u.y + ny * u.def.r, tg.x, tg.y, '#f08a9b', 4);
    FO.damage(tg, a.dmg, u, { nx, ny, direct: true, inflict: a.inflict });
    if (tg.alive) { const m = Math.min(520, (a.pull || 260) / tg.def.mass); tg.kx -= nx * m; tg.ky -= ny * m; }
    FO.emit('shoot', u, 'twang');
  },
});

// Throw whatever is to hand. Each throw is a random item with its own effect. Options: range, flight.
const JUNK = [
  { g: '🧨', splash: 46, mul: 1.3, inflict: ['burn', 2], boom: 'fire' },
  { g: '🎆', splash: 60, mul: 0.9, boom: 'fire' },
  { g: '🪑', mul: 1.4, inflict: ['stun', 0.6] },
  { g: '🥫', mul: 0.8, inflict: ['stun', 0.3] },
  { g: '🦩', mul: 1.1 },
  { g: '🛞', mul: 1.6 },
];
FO.defineAttack('junk', {
  los: 'none',
  reach: (u, tg, a) => a.range,
  fire(u, tg, a, nx, ny, d) {
    const it = FO.pick(JUNK), dur = (a.flight || 0.8) * (0.6 + 0.4 * Math.min(1, d / a.range));
    FO.shoot({
      look: 'glyph', glyph: it.g, x: u.x, y: u.y, vx: 0, vy: 0, life: dur, dmg: a.dmg * it.mul, side: u.side, src: u,
      splash: it.splash, pinpoint: !it.splash, inflict: it.inflict, knock: 140, boom: it.boom, air: true,
      lob: { x1: tg.x + (tg.rvx || 0) * dur * 0.7 + FO.rand(-8, 8), y1: tg.y + (tg.rvy || 0) * dur * 0.7 + FO.rand(-8, 8), dur, h: 45 + d * 0.25 },
    });
    FO.emit('shoot', u, 'whoosh');
  },
});

// Top up a friend. Used with ai: 'support'. Options: range.
FO.defineAttack('heal', {
  los: 'walk',
  reach: (u, tg, a) => a.range,
  fire(u, tg, a) {
    const got = FO.heal(tg, a.dmg);
    if (got > 0) { fx.beam(u, tg, '#27c26c'); fx.glyph(tg.x, tg.y - tg.def.r - 4, '💚', 11); FO.emit('heal', u); }
  },
});

/* =====================================================================
   CUSTOM AIs
   A unit picks one with ai: 'name'. Each is called every step and sets
   u.wantX / u.wantY (a direction) and does its own attacking.
   ===================================================================== */

/* Burrower (the Giant Worm): travels underground where nothing can touch it, leaving a trail,
   then erupts under the thickest crowd it can find, swallowing the small and flinging the big.
   It stays up for a few seconds, biting, and that is the only time it can be hurt. */
function pickCrowd(u) {
  const us = world.units, stride = Math.max(1, Math.floor(us.length / 28));
  let best = null, bs = -Infinity;
  for (let i = (Math.random() * stride) | 0; i < us.length; i += stride) {
    const o = us[i];
    if (!o.alive || o.side === u.side || o.untargetable) continue;
    let n = 0;
    world.forNear(o.x, o.y, 75, q => { if (q.alive && q.side !== u.side && (q.x - o.x) ** 2 + (q.y - o.y) ** 2 < 5625) n += q.def.r <= 16 ? 1 : 0.5; });
    const sc = n - Math.hypot(o.x - u.x, o.y - u.y) * 0.004;
    if (sc > bs) { bs = sc; best = o; }
  }
  return best || FO.findEnemy(u);
}
function wormDive(u) {
  const s = u.ts;
  u.under = true; u.untargetable = true; s.mode = 'under'; s.age = 0; s.cool = 0.9; s.goal = null; s.pick = 0; s.lx = u.x; s.ly = u.y;
  fx.dots(u.x, u.y, '#b08a5a', 12, 130, 3); fx.ring(u.x, u.y, u.def.r, '#8a6a3e', 3);
  if (FO.decal) FO.decal(u.x, u.y, u.def.r * 0.8, '#7a5c36');
}
function wormErupt(u, strike) {
  const s = u.ts, def = u.def, a = def.attack;
  u.under = false; u.untargetable = false; s.mode = 'up'; s.t = 3.0; u.riseK = 0; u.swing = 0.22;
  world.ensureDerived(); world.resolveTiles(u);
  if (!strike) return;
  const R = def.r + 26;
  world.forNear(u.x, u.y, R + FO.maxR, o => {
    if (!o.alive || o.side === u.side || o === u) return;
    const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy) || 1;
    if (d > R + o.def.r) return;
    if (o.def.r <= 16 && (s.ate || 0) < (p => p ? p.p.maxEat || 8 : 8)(def.traits.find(t => t.id === 'devour'))) { FO.kill(o, u, { quiet: true }); s.ate = (s.ate || 0) + 1; }
    else FO.damage(o, a.dmg * (o.def.r <= 16 ? 0.5 : 1.3), u, { nx: dx / d, ny: dy / d, knock: 460, direct: true });   // too full to swallow: just thrown clear
  });
  if (s.ate) { fx.text(u.x, u.y - def.r - 10, s.ate > 1 ? `gulp ×${s.ate}` : 'gulp', '#7a5236', 15); s.ate = 0; }
  FO.emit('boom', u.x, u.y, R, 'dirt');
}
FO.ai.burrower = function (u, dt) {
  const s = u.ts, def = u.def, a = def.attack;
  if (!s.mode) wormDive(u);
  if (s.mode === 'under') {
    s.cool -= dt; s.age += dt; s.pick -= dt;
    if (s.pick <= 0 || !s.goal || !s.goal.alive) { s.pick = 0.5; s.goal = pickCrowd(u); }
    const g = s.goal;
    if (!g) { wormErupt(u, false); return; }           // nobody left to hunt
    const dx = g.x - u.x, dy = g.y - u.y, d = Math.hypot(dx, dy) || 1;
    if (d > 10) { u.wantX = dx / d; u.wantY = dy / d; if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1; }
    // wormsign: loose dirt above, and a furrow left behind
    if (FO.chance(dt * 16)) fx.dots(u.x + FO.rand(-1, 1) * def.r * 0.5, u.y + FO.rand(-1, 1) * def.r * 0.3, FO.chance(0.5) ? '#b08a5a' : '#8a6a3e', 1, 45, 2.6);
    if (Math.hypot(u.x - s.lx, u.y - s.ly) > 16) { s.lx = u.x; s.ly = u.y; if (FO.decal) FO.decal(u.x, u.y, def.r * 0.3, '#7a5c36', 'scorch'); }
    if ((d <= 12 || s.age > 9) && s.cool <= 0) wormErupt(u, true);
  } else {
    s.t -= dt;
    if (u.riseK < 1) u.riseK = Math.min(1, u.riseK + dt * 5);
    if (u.retT <= 0 || !u.target || !u.target.alive) { u.target = FO.findEnemy(u); u.retT = 0.3; }
    const tg = u.target;
    if (tg) {
      const dx = tg.x - u.x, dy = tg.y - u.y, d = Math.hypot(dx, dy) || 1;
      if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1;
      if (d <= def.r + tg.def.r + (a.reach || 4) && u.cd <= 0) { def._atk.fire(u, tg, a, dx / d, dy / d, d); u.cd = a.cd; u.swing = 0.22; }
    }
    if (s.t <= 0 && tg) wormDive(u);
  }
};

/* Lurker (the Alligator): an ambush predator. Waits in the water at the edge nearest the enemy,
   bursts out at anything that comes close, won't chase far onto land before sliding back in,
   and goes for any shooter picking at it from the bank. With no water nearby it hunts like
   any other fighter, and if nothing comes for a long while it gets bored and goes hunting too. */
FO.ai.lurker = function (u, dt) {
  const s = u.ts, def = u.def, p = def.lurk || {}, wt = FO.terrainById.water;
  if (!wt || s.free) return FO.ai.fighter(u, dt);
  s.chk = (s.chk || 0) - dt;
  if (s.chk <= 0) {
    s.chk = 0.5;
    s.home = world.nearestTile(u.x, u.y, wt.index, 520);
    s.e = FO.findEnemy(u);
    s.spot = s.e && s.home ? world.nearestTile(s.e.x, s.e.y, wt.index, 1200) : null;
  }
  if (!s.home) return FO.ai.fighter(u, dt);                      // no water about: hunt on land
  const e = s.e && s.e.alive ? s.e : null;
  if (!e) return;
  // hit and run: after a kill, or when badly hurt, slip back into the water before striking again
  if (u.kills > (s.k || 0)) { s.k = u.kills; if (!u.swimming) s.back = 1.6; }
  if (!u.swimming && u.hp < u.maxHp * 0.45 && !(s.back > 0) && !s.hurtBack) { s.hurtBack = true; s.back = 2.5; }
  if (s.back > 0) {
    s.back -= dt; s.hunt = 0;
    if (u.swimming && s.back < 1) s.back = 0;
    else { const hx = s.home.x - u.x, hy = s.home.y - u.y, hd = Math.hypot(hx, hy) || 1; u.wantX = hx / hd; u.wantY = hy / hd; if (Math.abs(hx) > 2) u.face = hx > 0 ? 1 : -1; return; }
  }
  if (u.swimming) s.hurtBack = false;
  const de = Math.hypot(e.x - u.x, e.y - u.y);
  const src = u.lastSrc;
  const shotAt = src && src.alive && src.side !== u.side && world.time - (u.hurtT || -9) < 1 && Math.hypot(src.x - u.x, src.y - u.y) < (p.provoke || 300);
  if (shotAt && !(s.hunt > 0)) { u.target = src; u.retT = 1.5; }
  if (de < (p.ambush || 150) || shotAt) s.hunt = 1.2;
  s.hunt = (s.hunt || 0) - dt;
  if (s.hunt > 0) {
    s.idle = 0;
    const tg = u.target, biting = tg && tg.alive && Math.hypot(tg.x - u.x, tg.y - u.y) < def.r + tg.def.r + 24;
    if (u.swimming || s.home.d < (p.leash || 150) || biting) return FO.ai.fighter(u, dt);
    s.hunt = 0;                                                  // too far from the water: back in
  }
  s.idle = (s.idle || 0) + dt;
  if (s.idle > (p.patience || 14)) { s.free = true; return FO.ai.fighter(u, dt); }
  const g = s.spot || s.home, gx = g.x - u.x, gy = g.y - u.y, gd = Math.hypot(gx, gy);
  if (gd > 10) { u.wantX = gx / gd; u.wantY = gy / gd; }
  if (Math.abs(e.x - u.x) > 2) u.face = e.x > u.x ? 1 : -1;
};

/* Dimwit (Bryan): means well. Spends a third of the time fighting, the rest wandering off in a
   random direction or standing there wondering what is going on. Misses a lot, and now and then
   bonks a teammate by accident. */
FO.ai.dimwit = function (u, dt) {
  const s = u.ts, def = u.def, a = def.attack;
  s.t = (s.t || 0) - dt;
  if (s.t <= 0) {
    const r = Math.random();
    if (r < 0.4) { s.mode = 'fight'; s.t = FO.rand(1.5, 3); }
    else if (r < 0.72) { s.mode = 'wander'; s.t = FO.rand(1, 2.2); const ang = Math.random() * 6.28; s.dx = Math.cos(ang); s.dy = Math.sin(ang); }
    else { s.mode = 'idle'; s.t = FO.rand(0.9, 1.8); fx.text(u.x, u.y - def.r - 6, FO.pick(['?', '??', '...', 'huh']), '#3b6cf6', 14); }
  }
  if (s.mode === 'fight') {
    const tg = u.target;
    if (u.cd <= 0 && tg && tg.alive && Math.hypot(tg.x - u.x, tg.y - u.y) <= def.r + tg.def.r + 8 && FO.chance(0.45)) {
      u.cd = a.cd; u.swing = 0.22; fx.text(u.x, u.y - def.r - 6, FO.pick(['whoops', 'missed', 'oof']), '#8a8f9c', 11);
    }
    FO.ai.fighter(u, dt);
  } else if (s.mode === 'wander') {
    u.wantX = s.dx; u.wantY = s.dy; if (Math.abs(s.dx) > 0.1) u.face = s.dx > 0 ? 1 : -1;
    if (u.cd <= 0) {
      let pal = null;
      world.forNear(u.x, u.y, def.r + FO.maxR, o => { if (o !== u && o.alive && o.side === u.side && Math.hypot(o.x - u.x, o.y - u.y) < def.r + o.def.r + 5) { pal = o; return false; } });
      if (pal) { u.cd = 2.5; u.swing = 0.22; FO.damage(pal, 1, u, { nx: s.dx, ny: s.dy, knock: 60 }); fx.say(u, FO.pick(['Sorry!', 'My bad', 'Oops, sorry']) ); }
    }
  }
};

/* =====================================================================
   TRAITS
   label + desc show up in the unit info panel.
   ===================================================================== */
FO.defineTrait('lifesteal', {
  label: 'Lifesteal', desc: p => `Heals for ${Math.round((p.pct || 0.5) * 100)}% of the damage it deals`,
  onHit(u, tg, dealt, o, p) { if (FO.heal(u, dealt * (p.pct || 0.5)) > 1 && FO.chance(0.3)) fx.glyph(u.x, u.y - u.def.r - 4, '🩸', 10); },
});

// Brandon rolls into the enemy and bounces off, pinball fashion. Friends near him pick up the good vibes, and as
// 'good vibes' is one status, a second Brandon adds nothing to a friend who already has them. Bad vibes (the undead,
// Karens and a few others) make him bounce off much harder. Either way he mentions it.
const BAD_VIBES = { karen: 1, manager: 1, grungus: 1, darkgrungus: 1, medusa: 1, necromancer: 1, lagger: 1 };
const badVibes = o => o.def.undead || BAD_VIBES[o.def.id];
FO.defineTrait('vibes', {
  label: 'Vibes', desc: p => `Rolls into enemies and bounces off again. The ${p.max || 8} nearest friends within ${p.radius || 120} get good vibes: a little faster, slowly healing, and they stop panicking. Other Brandons don’t get them, and more Brandons don’t add more. Bad vibes repel him: off the undead, a Karen, a Manager, a Grungus, Medusa, a Necromancer or a Lagger he bounces three times as far, and every so often he announces that the vibes are bad and leaves for a moment. Comments on the vibes throughout`,
  onSpawn(u) { u.ts.sayT = 2 + Math.random() * 4; },
  onUpdate(u, dt, p) {
    const s = u.ts;
    s.vt = (s.vt || 0) - dt;
    if (s.vt <= 0) {
      s.vt = 0.3;
      const R = p.radius || 120, pals = [];
      let bad = null, bd = R;
      world.forNear(u.x, u.y, R + FO.maxR, o => {
        if (o === u || !o.alive || o.under) return;
        const d = Math.hypot(o.x - u.x, o.y - u.y);
        if (badVibes(o)) { if (d < bd) { bd = d; bad = o; } }
        else if (o.side === u.side && d < R && o.def.id !== u.def.id) pals.push([d, o]);      // Brandons don't vibe off each other
      });
      s.bad = bad;
      // every so often the bad vibes get too much and he leaves for a moment, saying so
      s.leaveCd = (s.leaveCd || 0) - 0.3;
      if (bad && s.leaveCd <= 0 && !u.stunned) {
        s.leaveCd = 6 + Math.random() * 4; s.leaveT = 1.3; s.sayT = 3 + Math.random() * 2;
        const dx = u.x - bad.x, dy = u.y - bad.y, d = Math.hypot(dx, dy) || 1;
        s.away = [dx / d, dy / d];
        fx.say(u, FO.pick(['The vibes are bad', 'Bad vibes, I’m out', 'The vibes are off', 'Not the vibe', 'Nope. Vibes', 'Vibes: rancid']));
      }
      pals.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < Math.min(p.max || 8, pals.length); i++) FO.applyStatus(pals[i][1], 'vibing', 0.8, u);
    }
    if (s.leaveT > 0) { s.leaveT -= dt; u.kx += s.away[0] * 1500 * dt; u.ky += s.away[1] * 1500 * dt; }
    if (u.moving && FO.chance(dt * 5)) fx.dots(u.x - u.vx * 0.06, u.y + u.def.r * 0.8, '#c9c2b4', 1, 26, 2.2);
    if (u.stunned) return;
    s.sayT -= dt;
    if (s.sayT <= 0) {
      s.sayT = 3.5 + Math.random() * 3;
      fx.say(u, s.bad ? FO.pick(['Bad vibes', 'Weird energy', 'Something’s off']) : FO.pick(['Good vibes', 'Vibe check', 'Immaculate vibes', 'This is a vibe', 'We’re vibing', 'Vibes are high']));
    }
  },
  onHit(u, tg, dealt, o, p) {
    const dx = u.x - tg.x, dy = u.y - tg.y, d = Math.hypot(dx, dy) || 1, k = badVibes(tg) ? (p.recoil || 150) * 3 : (p.recoil || 150);
    u.kx += dx / d * k; u.ky += dy / d * k;
    if (badVibes(tg) && FO.chance(0.4)) fx.text(u.x, u.y - u.def.r - 6, FO.pick(['ew', 'nope', 'bad vibes']), '#8a5fbf', 11);
  },
});
// Nemo. Hurt the best boy and everyone near him takes it personally. He also has something to tell you.
FO.defineTrait('bestBoy', {
  label: 'Best boy', desc: p => `Hurt him and every friend within ${p.radius || 170} is furious for 3s: faster and hitting more often (once every ${p.cd || 4}s). Knows what’s up: chicken butt`,
  onSpawn(u) { u.ts.sayT = 1.5 + Math.random() * 4; },
  onUpdate(u, dt) {
    if (u.stunned) return;
    u.ts.sayT -= dt;
    if (u.ts.sayT <= 0) { u.ts.sayT = 4 + Math.random() * 4; fx.say(u, FO.pick(['Chicken butt', 'Guess what? Chicken butt', 'Chicken butt', 'Guess why? Chicken thigh', 'What’s up? Chicken butt'])); }
  },
  onDamaged(u, amount, src, o, p) {
    if (o.quiet || !(amount > 0) || world.time < (u.ts.bbT || 0)) return amount;
    u.ts.bbT = world.time + (p.cd || 4);
    const R = p.radius || 170; let n = 0;
    world.forNear(u.x, u.y, R, f => {
      if (f === u || !f.alive || f.side !== u.side || Math.hypot(f.x - u.x, f.y - u.y) > R) return;
      FO.applyStatus(f, 'pumped', 3, u);
      if (n++ < 3) fx.text(f.x, f.y - f.def.r - 6, FO.pick(['Not Nemo!', 'Hey!', 'He’s the best boy!']), '#c8102e', 11);
    });
    return amount;
  },
});
// Ryan, pour-over purist, fights up close with his gooseneck kettle. Three moves, each now and then announced with
// tasting notes nobody asked for:
//   Coffee spray   his one ranged move: a scalding cone of coffee at whatever is in front of him
//   Single origin  everyone close on his side gets caffeinated, then the jitters
//   Judgement      a kettle to the head of whoever he is fighting, and a question about their coffee; they slump, deflated
// Like Christian's tea, every Ryan has his own taste and his own timing, so a table of them doesn't move as one.
const COFFEE = {
  spray: ['Washed Kenyan: blackcurrant, tomato leaf, PAIN', 'Ninety-three degrees. Exactly.', 'Yirgacheffe! Jasmine! Bergamot! Scalding!', 'Let it bloom!'],
  origin: ['Natural Geisha. Peach, honeysuckle, ambition.', 'Anaerobic Colombian. A strawberry with a philosophy degree.', 'Single estate, single varietal. Drink.', 'Carbonic maceration. You wouldn’t get it. Drink it.'],
  judge: ['Is that… dark roast?', 'Oat milk? In a Geisha?', 'Oh. You use pods.', 'That’s just burnt, man', 'Sugar? Respectfully, no.', 'Did you use pre-ground?'],
};
// Tasting notes now and then, never twice within a few seconds, so the board games still get a word in.
function brag(u, lines, chance) {
  if (world.time < (u.ts.bragT || 0) || !FO.chance(chance)) return;
  u.ts.bragT = world.time + FO.rand(5, 8);
  fx.say(u, FO.pick(lines));
}
FO.defineTrait('pourOver', {
  label: 'Pour-over', desc: () => 'Coffee spray: a scalding cone of coffee at enemies a little way in front of him. Single origin: friends close by (not other Ryans, already on their fourth cup) get caffeinated, faster with quicker hands, for 4s, then the jitters. Judgement: a kettle to the head of whoever he is fighting, who slumps, deflated, for 3s',
  onSpawn(u) {
    const s = u.ts, r = FO.rand;
    s.sprayCd = r(0.5, 4); s.originCd = r(2, 8); s.judgeCd = r(1, 5);
    s.taste = { spray: r(0.6, 1.6), origin: r(0.6, 1.6), judge: r(0.6, 1.6) };
    s.mind = r(0.2, 0.9);
  },
  onUpdate(u, dt, p) {
    const s = u.ts;
    s.sprayCd -= dt; s.originCd -= dt; s.judgeCd -= dt; s.mind -= dt;
    if (u.stunned || s.mind > 0) return;
    s.mind = FO.rand(0.2, 0.7);
    let pals = 0, foes = 0, close = null, cd = Infinity;
    world.forNear(u.x, u.y, 140 + FO.maxR, o => {
      if (!o.alive || o.under || o === u) return;
      const d = Math.hypot(o.x - u.x, o.y - u.y);
      if (o.side === u.side) { if (d < 110 && !o.def.grid && o.def.id !== u.def.id) pals++; return; }
      if (d < 140) foes++;
      if (d < u.def.r + o.def.r + 10 && d < cd && !o.def.flying) { cd = d; close = o; }
    });
    const t = u.target, td = t && t.alive ? Math.hypot(t.x - u.x, t.y - u.y) : Infinity;
    const opts = [];
    if (s.sprayCd <= 0 && td > 30 && td < 130 && !world.solidBetween(u.x, u.y, t.x, t.y)) opts.push(['spray', s.taste.spray]);
    if (s.originCd <= 0 && pals >= 2 && foes >= 1) opts.push(['origin', s.taste.origin * (pals >= 5 ? 1.8 : 1)]);
    if (s.judgeCd <= 0 && close && !FO.hasStatus(close, 'crash')) opts.push(['judge', s.taste.judge]);
    if (!opts.length || !FO.chance(0.6)) return;
    let w = 0; for (const o of opts) w += o[1];
    let r = Math.random() * w, move = opts[0][0];
    for (const o of opts) { if ((r -= o[1]) <= 0) { move = o[0]; break; } }
    const jit = () => FO.rand(0.75, 1.35);
    if (move === 'spray') {
      s.sprayCd = 4 * jit();
      const a0 = Math.atan2(t.y - u.y, t.x - u.x), r0 = u.def.r;
      u.face = Math.cos(a0) >= 0 ? 1 : -1;
      for (let k = 0; k < 8; k++) {
        const ang = a0 + (Math.random() - 0.5) * 0.7, spd = 200 + Math.random() * 80;
        FO.shoot({ look: 'spray', x: u.x + Math.cos(ang) * r0, y: u.y + Math.sin(ang) * r0, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          life: 150 / spd, dmg: p.spray || 5, side: u.side, src: u, rad: 5, air: true, inflict: ['burn', 1] });
      }
      u.swing = 0.22;
      brag(u, COFFEE.spray, 0.3);
    } else if (move === 'origin') {
      s.originCd = 11 * jit();
      world.forNear(u.x, u.y, 110 + FO.maxR, f => { if (f.alive && f.side === u.side && !f.def.grid && f.def.id !== u.def.id && Math.hypot(f.x - u.x, f.y - u.y) < 110) FO.applyStatus(f, 'caffeinated', 4, u); });   // other Ryans are already on their fourth cup
      fx.ring(u.x, u.y, 110, '#6b4226', 3); fx.dots(u.x, u.y - u.def.r, '#d9b48a', 10, 90, 2.2);
      brag(u, COFFEE.origin, 0.35);
    } else {
      s.judgeCd = 5 * jit();
      const dx = close.x - u.x, dy = close.y - u.y, d = Math.hypot(dx, dy) || 1;
      FO.damage(close, p.smack || 16, u, { direct: true, nx: dx / d, ny: dy / d, knock: 260 });
      if (close.alive) FO.applyStatus(close, 'crash', 3, u);
      u.swing = 0.22; fx.ring(close.x, close.y, close.def.r + 6, '#6b4226', 3);
      fx.text(close.x, close.y - close.def.r - 6, FO.pick(['burnt', 'pods?', 'dark roast', 'pre-ground']), '#6b4226', 12);
      brag(u, COFFEE.judge, 0.35);
    }
  },
});
// ...and nobody wants to play. Everyone near him who isn't another Ryan, on either side, backs off in a hurry.
FO.defineTrait('boardGames', {
  label: 'Board games?', desc: p => `Every ${p.every || 11}s or so he asks if anyone wants to play a board game. Everyone nearby who isn’t a Ryan, friend or enemy, backs away fast`,
  onSpawn(u, p) { u.ts.gameT = (p.every || 11) * (0.4 + Math.random() * 0.6); },
  onUpdate(u, dt, p) {
    if (u.stunned) return;
    u.ts.gameT -= dt;
    if (u.ts.gameT > 0) return;
    const R = p.radius || 140, near = [];
    world.forNear(u.x, u.y, R + FO.maxR, o => { if (o !== u && o.alive && o.def.id !== u.def.id && !o.under && !o.carried && Math.hypot(o.x - u.x, o.y - u.y) < R + o.def.r) near.push(o); });
    if (near.length < 2) { u.ts.gameT = 1.5; return; }             // nobody to ask yet
    u.ts.gameT = (p.every || 11) * (0.8 + Math.random() * 0.4);
    fx.say(u, FO.pick(['Anyone want to play board games?', 'Board games, anyone?', 'I brought a board game!', 'It only takes four hours', 'I’ll explain the rules']));
    fx.ring(u.x, u.y, R, '#1c1d22', 3);
    for (const o of near) {
      const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy) || 1, m = Math.min(520, 430 / Math.sqrt(o.def.mass));
      o.kx += dx / d * m; o.ky += dy / d * m;
      FO.applyStatus(o, 'fear', 1.4, u);
    }
  },
});
// Sierra's two lives: at home with the muffins until a friend nearby is hurt, then on call until they are patched up.
FO.defineTrait('onCall', {
  label: 'On call', desc: p => p.when === 'hurt' ? 'When a friend nearby is badly hurt she puts the muffins down and becomes a doctor, healing like a medic' : 'Once everyone nearby is patched up she goes home to bake',
  onUpdate(u, dt, p) {
    const s = u.ts;
    s.dwell = (s.dwell || 0) + dt; s.callT = (s.callT || 0) - dt;
    if (s.callT > 0) return;
    s.callT = 0.5;
    const line = p.when === 'hurt' ? 0.7 : 0.92;
    let hurt = false;
    world.forNear(u.x, u.y, 260 + FO.maxR, o => { if (o !== u && o.alive && o.side === u.side && o.hp < o.maxHp * line && Math.hypot(o.x - u.x, o.y - u.y) < 260) { hurt = true; return false; } });
    if (p.when === 'hurt' ? !(hurt && s.dwell > 2) : !(!hurt && s.dwell > 3)) return;
    const next = FO.units[p.into]; if (!next) return;
    FO.prepUnit(next);
    fx.dots(u.x, u.y - u.def.r * 0.3, p.when === 'hurt' ? '#ffffff' : '#f1d9b0', 8, 90, 2);
    u.def = next; u.maxHp = next.hp; u.hp = Math.min(u.hp, next.hp); u.ts = { dwell: 0 }; u.pop = 0.25; u.cd = 0.4; u.target = null; u.retT = 0;
    if (FO.chance(0.7)) fx.say(u, p.when === 'hurt' ? FO.pick(['I’m a doctor', 'Let me through', 'On my way']) : FO.pick(['Back to the oven', 'Right, where was I', 'Muffins?']));
  },
});
// Stops for a cigarette every so often, whatever is going on around him.
FO.defineTrait('smokeBreak', {
  label: 'Smoke breaks', desc: p => `Every ${p.every || 9}s or so he stops dead for ${p.lasts || 2.4}s and has a cigarette, whatever is happening`,
  onSpawn(u, p) { u.ts.smokeT = (p.every || 9) * (0.5 + Math.random() * 0.6); },
  onUpdate(u, dt, p) {
    if (u.stunned) return;
    u.ts.smokeT -= dt;
    if (u.ts.smokeT > 0) return;
    u.ts.smokeT = (p.every || 9) * (0.85 + Math.random() * 0.3) + (p.lasts || 2.4);
    FO.applyStatus(u, 'smoke', p.lasts || 2.4, null);
    if (FO.chance(0.6)) fx.say(u, FO.pick(['brb', 'Smoke break', 'One sec', 'Back in five']));
  },
});
FO.defineTrait('dodge', {
  label: 'Dodgy', desc: p => `${Math.round((p.chance || 0.3) * 100)}% chance to avoid a hit`,
  onDamaged(u, amount, src, o, p) {
    if (o.pure || !FO.chance(p.chance || 0.3)) return amount;
    if (FO.chance(0.5)) fx.text(u.x, u.y - u.def.r - 4, 'miss', '#8a8f9c', 11);
    return 0;
  },
});

FO.defineTrait('berserk', {
  label: 'Berserk', desc: () => 'Attacks faster the more hurt it is',
  onUpdate(u, dt, p) { u.rateMul *= 1 + (1 - u.hp / u.maxHp) * ((p.max || 2.5) - 1); },
});

FO.defineTrait('charge', {
  label: 'Charge', desc: () => 'Builds speed on a long run-up; the first hit lands much harder',
  onUpdate(u, dt, p) {
    const s = u.ts;
    s.run = u.moving && !u.stunned ? (s.run || 0) + dt : 0;
    const on = s.run > (p.windup || 0.7);
    if (on) { u.speedMul *= p.speed || 1.9; if (FO.chance(0.3)) fx.dots(u.x - u.vx * 0.05, u.y + u.def.r * 0.8, '#c9c2b4', 1, 30, 2.5); }
    u.hitMul = on ? (p.mult || 2.5) : 1;
  },
  onHit(u) { u.ts.run = 0; },
});

FO.defineTrait('split', {
  label: 'Splits', desc: () => 'Breaks into smaller ones when it dies',
  onDeath(u, killer, p) {
    for (let i = 0; i < (p.n || 2); i++) {
      const a = Math.random() * 6.28, k = FO.spawn(p.into, FO.clamp(u.x + Math.cos(a) * u.def.r * 0.6, 8, FO.W - 8), FO.clamp(u.y + Math.sin(a) * u.def.r * 0.6, 8, FO.H - 8), u.team, { side: u.side });
      if (k) { k.kx = Math.cos(a) * 160; k.ky = Math.sin(a) * 160; }
    }
  },
});

FO.defineTrait('volatile', {
  label: 'Explosive', desc: () => 'Blows up when it dies, however it dies',
  onDeath(u, killer, p) { FO.explode(u.x, u.y, p.radius || 55, p.dmg || 90, u, u.side, { knock: 260, look: 'fire' }); },
});

FO.defineTrait('raiseDead', {
  label: 'Raises the dead', desc: p => `Turns nearby fallen fighters into ${p.into || 'skeleton'}s`,
  onAnyDeath(u, victim, killer, p) {
    const d = victim.def;
    if (d.flying || d.undead || d.r > 16 || world.time - (u.ts.raised || -9) < (p.cd || 1)) return;
    if (Math.hypot(victim.x - u.x, victim.y - u.y) > (p.radius || 220)) return;
    u.ts.raised = world.time;
    const k = FO.spawn(p.into || 'skeleton', victim.x, victim.y, u.team, { side: u.side });
    if (k) { fx.beam(u, k, '#8a5cf6'); fx.dots(k.x, k.y, '#b9a2ff', 8, 90, 2); FO.emit('raise', u); }
  },
});

FO.defineTrait('infect', {
  label: 'Infectious', desc: () => 'Anything it kills gets back up on its side',
  onKill(u, victim, p) {
    const d = victim.def;
    if (d.flying || d.undead || d.r > 16) return;
    const k = FO.spawn(p.into || 'zombie', victim.x, victim.y, u.team, { side: u.side });
    if (k) fx.dots(k.x, k.y, '#8fe36b', 8, 90, 2);
  },
});

FO.defineTrait('weakTo', {
  label: 'Weakness', desc: p => `Takes ${p.mult || 2}× damage from ${p.kind}`,
  onDamaged(u, amount, src, o, p) { return o.kind === p.kind ? amount * (p.mult || 2) : amount; },
});

FO.defineTrait('thorns', {
  label: 'Spiky', desc: p => `Hurts whoever hits it up close for ${p.dmg || 5}`,
  onDamaged(u, amount, src, o, p) {
    if (o.direct && src && src.alive && src !== u && Math.hypot(src.x - u.x, src.y - u.y) < u.def.r + src.def.r + 12) FO.damage(src, p.dmg || 5, u, { pure: true, quiet: true });
    return amount;
  },
});

// Second stage: after a while, or once hurt enough, the unit turns into another unit on the spot.
FO.defineTrait('evolve', {
  label: 'Second stage', desc: p => { const n = id => FO.units[id] ? FO.units[id].name : 'something else', hp = Math.round((p.hpBelow || 0.5) * 100);
    const rares = [].concat(p.rare || []).filter(r => !r.secret);
    return `Transforms into ${n(p.into)} ${p.after > 999 ? `when it drops below ${hp}% health` : 'after a while, or when badly hurt'}` + rares.map(r => `. ${Math.round(r.chance * 100)}% of the time it becomes ${n(r.into)} instead`).join(''); },
  onUpdate(u, dt, p) {
    const s = u.ts;
    s.age = (s.age || 0) + dt;
    if (s.age < (p.after || 12) && u.hp > u.maxHp * (p.hpBelow || 0.5)) return;
    const rare = [].concat(p.rare || []).find(r => FO.chance(r.chance)) || null;      // rarest is listed first
    const next = FO.units[rare ? rare.into : p.into]; if (!next) return;
    FO.prepUnit(next);
    fx.dots(u.x, u.y - u.def.r * 0.4, p.bits || '#6b4a2e', 14, 120, 2.2); fx.ring(u.x, u.y, u.def.r + 10, '#ffd43b', 3);
    fx.text(u.x, u.y - u.def.r - 8, (rare && rare.sound) || p.sound || 'bzzzt', '#1c1d22', 14);
    if (rare) { fx.ring(u.x, u.y, u.def.r + 26, rare.ring || '#7b2ff7', 4); world.shake = Math.max(world.shake || 0, rare.shake || 6); if (rare.announce && FO.toast) FO.toast(rare.announce); }
    const frac = (rare && rare.full) || p.full ? 1 : Math.min(1, u.hp / u.maxHp + 0.25);   // shaving is refreshing, not a full heal
    u.def = next; u.maxHp = next.hp; u.hp = next.hp * frac; u.ts = {}; u.st = []; u.pop = 0.25; u.cd = 0.3;
    if (rare ? rare.say : p.say) fx.say(u, rare ? rare.say : p.say);
    FO.emit('raise', u);
  },
});

// Tea arts: three moves, each called with the tasting notes of the tea it comes from.
//   Tieguanyin (Iron Goddess oolong)   when hurt or crowded: two and a half seconds of iron skin, hits bounce off him
//   Shou pu-erh (aged, earthy)         when enemies crowd in: slams the ground, knocking back and stunning them
//   Da Hong Pao (roasted rock oolong)  when his target is a little way off: a flying kick that lands hot
const TEA = {
  iron: ['Tieguanyin! Orchid, cream, IRON!', 'Iron Goddess of Mercy: florals, butter, zero mercy', 'Third steep Tieguanyin. Lilac. Steel.', 'Rolled oolong, tight as my core'],
  slam: ['Twenty-year shou pu-erh! Forest floor! Leather! EARTH!', 'Aged pu-erh: camphor, damp cellar, GROUND', 'Pressed in ’99. Feel the earth.', 'Notes of wet stone and old library!'],
  kick: ['Da Hong Pao! Roasted cherry, mineral rock rhyme!', 'Big Red Robe! Charcoal roast, dark chocolate, KICK', 'Wuyi rock oolong: smoke, stone, HYAH!', 'High-fire roast! Yan yun!'],
};
FO.defineTrait('teaArts', {
  label: 'Tea arts', desc: () => 'Tieguanyin: iron skin for a moment when hurt or crowded. Shou pu-erh: a ground slam that knocks back and stuns everyone close. Da Hong Pao: a flying kick at a target a little way off that lands hot',
  onSpawn(u) {
    const s = u.ts, r = FO.rand;
    s.ironCd = r(1, 6); s.slamCd = r(1, 7); s.kickCd = r(0.5, 6);
    s.taste = { iron: r(0.6, 1.6), slam: r(0.6, 1.6), kick: r(0.6, 1.6) };     // every Christian has his favourite teas
    s.mind = r(0.2, 0.9);                                                     // and takes his own time to decide
  },
  onUpdate(u, dt, p) {
    const s = u.ts;
    s.ironCd -= dt; s.slamCd -= dt; s.kickCd -= dt; s.mind -= dt;
    if (s.ironT > 0) { s.ironT -= dt; if (FO.chance(dt * 6)) fx.dots(u.x, u.y - u.def.r * 0.3, '#c9ced8', 1, 30, 2); }
    if (s.kickT > 0) {                                            // in the air: the first enemy he reaches takes the kick
      s.kickT -= dt;
      if (FO.chance(dt * 30)) fx.dots(u.x, u.y, FO.chance(0.5) ? '#a0412b' : '#ff8a2a', 1, 20, 2.4);
      let hit = null;
      world.forNear(u.x, u.y, u.def.r + FO.maxR + 10, o => { if (!hit && o.alive && o.side !== u.side && !o.under && Math.hypot(o.x - u.x, o.y - u.y) < u.def.r + o.def.r + 6) hit = o; });
      if (hit) {
        s.kickT = 0;
        const dx = hit.x - u.x, dy = hit.y - u.y, d = Math.hypot(dx, dy) || 1;
        FO.damage(hit, p.kick || 40, u, { direct: true, nx: dx / d, ny: dy / d, knock: 420, inflict: ['burn', 2.5] });
        u.kx *= 0.2; u.ky *= 0.2;
        fx.ring(hit.x, hit.y, hit.def.r + 8, '#ff8a2a', 3);
      }
    }
    if (u.stunned || s.mind > 0) return;
    s.mind = FO.rand(0.15, 0.6);                                  // looks for an opening every so often, not every frame
    let near = 0, crowd = 0;
    world.forNear(u.x, u.y, 80 + FO.maxR, o => { if (o.alive && o.side !== u.side && !o.under) { const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < 80) near++; if (d < 55) crowd++; } });
    // every move that fits right now, weighted by his taste and how strongly the moment calls for it; then one is drawn
    const opts = [];
    if (s.ironCd <= 0 && (u.hp < u.maxHp * 0.55 || crowd >= 3)) opts.push(['iron', s.taste.iron * (u.hp < u.maxHp * 0.35 ? 2 : 1)]);
    if (s.slamCd <= 0 && near >= 2) opts.push(['slam', s.taste.slam * (near >= 4 ? 1.8 : 1)]);
    const t = u.target;
    if (s.kickCd <= 0 && t && t.alive) {
      const d = Math.hypot(t.x - u.x, t.y - u.y);
      if (d > 70 && d < 210 && !world.solidBetween(u.x, u.y, t.x, t.y)) opts.push(['kick', s.taste.kick]);
    }
    if (!opts.length || !FO.chance(0.6)) return;                 // and sometimes he just lets it steep a moment longer
    let w = 0; for (const o of opts) w += o[1];
    let r = Math.random() * w, move = opts[0][0];
    for (const o of opts) { if ((r -= o[1]) <= 0) { move = o[0]; break; } }
    const jit = () => FO.rand(0.75, 1.35);
    if (move === 'iron') {
      s.ironCd = 10 * jit(); s.ironT = FO.rand(2, 3);
      fx.ring(u.x, u.y, u.def.r + 8, '#c9ced8', 4); fx.text(u.x, u.y - u.def.r - 8, 'clang', '#6b7380', 12);
      brag(u, TEA.iron, 0.35);
    } else if (move === 'slam') {
      s.slamCd = 7 * jit();
      const R = p.slam || 80;
      world.forNear(u.x, u.y, R + FO.maxR, o => {
        if (!o.alive || o.side === u.side || o.under || o.def.flying) return;
        const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy) || 1;
        if (d > R + o.def.r) return;
        FO.damage(o, (p.slamDmg || 28) * (1 - 0.4 * Math.min(1, d / R)), u, { nx: dx / d, ny: dy / d, knock: 380 });
        if (o.alive) FO.applyStatus(o, 'stun', 0.9, u);
      });
      fx.ring(u.x, u.y, R * 0.6, '#6b4a2e', 5); fx.ring(u.x, u.y, R, '#8a6a46', 3); fx.dots(u.x, u.y, '#5b3b2a', 16, 140, 2.6);
      world.shake = Math.max(world.shake || 0, 3);
      brag(u, TEA.slam, 0.35);
    } else {
      s.kickCd = 6 * jit(); s.kickT = 0.55;
      const dx = t.x - u.x, dy = t.y - u.y, d = Math.hypot(dx, dy) || 1, v = Math.min(1100, d * 6.5);   // a shove decays fast: this carries him about d
      u.kx += dx / d * v; u.ky += dy / d * v;
      brag(u, TEA.kick, 0.3);
    }
  },
  onDamaged(u, amount, src, o) {
    if (!(u.ts.ironT > 0)) return amount;
    if (o.direct && src && src.alive && src !== u && Math.hypot(src.x - u.x, src.y - u.y) < u.def.r + src.def.r + 14) {
      const dx = src.x - u.x, dy = src.y - u.y, d = Math.hypot(dx, dy) || 1;
      src.kx += dx / d * 220; src.ky += dy / d * 220;
    }
    if (FO.chance(0.3)) fx.text(u.x, u.y - u.def.r - 4, 'tink', '#8a8f9c', 10);
    return amount * 0.3;
  },
});

// AI psychosis: once he has been out there long enough he has had time to "talk it through with the AI". One roll:
// most of the time nothing, sometimes he spirals into a spinning paralysis that kills him, sometimes he comes back as a cyborg.
FO.defineTrait('psychosis', {
  label: 'AI psychosis', desc: p => { const n = FO.units[p.into] ? FO.units[p.into].name : 'something else';
    return `After ${p.after || 10}s alive: ${Math.round((p.spiral || 0.3) * 100)}% chance he spirals into a fatal spinning paralysis, ${Math.round((p.mutate || 0.2) * 100)}% chance he is upgraded into ${n}`; },
  onUpdate(u, dt, p) {
    const s = u.ts;
    if (s.spiral) { if (!FO.hasStatus(u, 'spiral')) FO.applyStatus(u, 'spiral', 999, null); return; }    // nothing snaps him out of it
    if (s.psy) return;
    s.age = (s.age || 0) + dt;
    if (s.age < (p.after || 10)) return;
    s.psy = 1;
    const r = Math.random();
    if (r < (p.spiral || 0.3)) {
      s.spiral = 1; u.target = null;
      FO.applyStatus(u, 'spiral', 999, null);
      fx.say(u, FO.pick(['wait… what if', 'the AI said I’m onto something', 'it all connects', 'I need to think about this', 'we’re all just prompts']));
    } else if (r < (p.spiral || 0.3) + (p.mutate || 0.2)) {
      const next = FO.units[p.into]; if (!next) return;
      FO.prepUnit(next);
      fx.dots(u.x, u.y - u.def.r * 0.4, '#9aa3b0', 14, 150, 2.6); fx.dots(u.x, u.y - u.def.r * 0.4, '#ffd43b', 8, 180, 2); fx.ring(u.x, u.y, u.def.r + 12, '#ff3b3b', 3); fx.ring(u.x, u.y, u.def.r + 28, '#9aa3b0', 4);
      fx.text(u.x, u.y - u.def.r - 10, 'UPGRADED', '#c8102e', 15);
      world.shake = Math.max(world.shake || 0, 4);
      const h = next.hp * (u.hp / u.maxHp);
      u.def = next; u.maxHp = next.hp; u.hp = h + (next.hp - h) / 2;          // comes back with half of what he was missing
      u.ts = { psy: 1 }; u.st = []; u.pop = 0.3; u.cd = 0.2;
      fx.say(u, FO.pick(['feel the AGI', 'I see it now', 'I have merged with the model', 'I am awake', 'it all makes sense now']));
      FO.emit('raise', u);
    } else if (FO.chance(0.5)) fx.say(u, FO.pick(['nah, I’m good', 'anyway', 'closed the tab', 'touched grass']));
  },
});
// Serial chain smoking: never stops for a break, never stops smoking.
FO.defineTrait('chainSmoke', {
  label: 'Chain smoker', desc: () => 'Smokes the whole time and never stops for a break',
  onUpdate(u, dt) { if (FO.chance(dt * 9)) fx.dots(u.x + u.face * u.def.r * 0.75 + FO.rand(-2, 2), u.y - u.def.r * 0.45, FO.chance(0.5) ? '#d9dbe2' : '#b4b7c2', 1, 40, 3); },
});
// Jolts about: every so often a sudden twitch throws him a short way to one side.
FO.defineTrait('jolt', {
  label: 'Jolty', desc: () => 'Twitches and jolts about without warning',
  onUpdate(u, dt, p) {
    const s = u.ts; s.jt = (s.jt == null ? 0.3 : s.jt) - dt;
    if (s.jt > 0 || u.stunned) return;
    s.jt = 0.25 + Math.random() * 0.45;
    const a = Math.random() * 6.28, f = p.force || 260;
    u.kx += Math.cos(a) * f; u.ky += Math.sin(a) * f;
    if (FO.chance(0.3)) fx.dots(u.x, u.y - u.def.r * 0.3, '#ffd43b', 2, 60, 1.8);      // sparks
  },
});

// The Void: every enemy that comes close is deleted, whoever and whatever it is. Checked ten times a second.
FO.defineTrait('void', {
  label: 'The Void', desc: p => `Every enemy that comes within ${p.radius || 150} is deleted. No exceptions`,
  onUpdate(u, dt, p) {
    const s = u.ts; s.vt = (s.vt || 0) - dt;
    if (s.vt > 0) return;
    s.vt = 0.1;
    const R = p.radius || 150, gone = [];
    world.forNear(u.x, u.y, R + FO.maxR, o => { if (o.alive && o.side !== u.side && !o.under && Math.hypot(o.x - u.x, o.y - u.y) < R + o.def.r * 0.5) gone.push(o); });
    for (const o of gone) {
      if (!o.alive) continue;
      fx.dots(o.x, o.y, '#000000', 9, 70, 2.8); fx.dots(o.x, o.y, '#2b2b2b', 4, 50, 1.8);
      const hp = Math.max(0, o.hp); if (FO.stats) FO.stats.hit(o, hp, u);
      u.dmg += hp; if (!world.best || u.dmg > world.best.dmg) world.best = u; world.lastDamageT = world.time;
      FO.kill(o, u, { quiet: true, deleted: true });
    }
    if (gone.length && FO.chance(0.25)) fx.text(u.x + FO.rand(-R, R) * 0.5, u.y - R * 0.4, FO.pick(['deleted', 'gone', '…']), '#1c1d22', 12);
  },
});

// A one-off roll the first time a fighter drops below half health: a small chance it turns into something else entirely.
FO.defineTrait('rareForm', {
  label: '???', desc: () => 'Nobody knows',
  onUpdate(u, dt, p) {
    const s = u.ts;
    if (s.rolled || u.hp > u.maxHp * (p.hpBelow || 0.5)) return;
    s.rolled = 1;
    if (!FO.chance(p.chance || 0.04)) return;
    const next = FO.units[p.into]; if (!next) return;
    FO.prepUnit(next);
    fx.dots(u.x, u.y - u.def.r * 0.4, p.bits || '#b96a3c', 18, 140, 2.6); fx.ring(u.x, u.y, u.def.r + 30, '#c8102e', 4);
    world.shake = Math.max(world.shake || 0, 7);
    u.def = next; u.maxHp = next.hp; u.hp = next.hp * Math.min(1, u.hp / u.maxHp + 0.3); u.ts = { rolled: 1 }; u.st = []; u.pop = 0.25; u.cd = 0.3; u.target = null;
    if (p.say) fx.say(u, p.say);
    const R = p.scare || 150;                                      // the entrance alone sends nearby enemies running
    world.forNear(u.x, u.y, R, o => { if (o.alive && o.side !== u.side && Math.hypot(o.x - u.x, o.y - u.y) < R) FO.applyStatus(o, 'fear', 1.6, u); });
    FO.emit('raise', u);
  },
});
// Talks. A lot.
FO.defineTrait('chatter', {
  onSpawn(u, p) { u.ts.chatT = 1 + Math.random() * 2; },
  onUpdate(u, dt, p) {
    if (u.stunned) return;
    u.ts.chatT = (u.ts.chatT == null ? 1 : u.ts.chatT) - dt;
    if (u.ts.chatT <= 0) { u.ts.chatT = (p.every || 4) * (0.8 + Math.random() * 0.5); fx.say(u, FO.pick(p.lines)); }
  },
});

// Hype cycle: friends nearby get a big boost for a few seconds, then the bubble pops and they sag.
FO.defineTrait('hypeCycle', {
  label: 'Hype cycle', desc: () => 'Pumps up nearby friends for a few seconds, then the bubble pops and they slump',
  onUpdate(u, dt, p) {
    const s = u.ts, up = p.up || 4.5, down = p.down || 2.5, R = p.radius || 120;
    s.hc = (s.hc == null ? 0 : s.hc) + dt;
    const ph = s.hc % (up + down), hyping = ph < up;
    if (hyping !== s.hyping) {
      s.hyping = hyping;
      if (hyping) fx.say(u, FO.pick(u.def.quips));
      else { fx.text(u.x, u.y - u.def.r - 8, 'pop!', '#c8102e', 15); fx.ring(u.x, u.y, R * 0.6, '#8a8f9c', 2); }
    }
    s.hp2 = (s.hp2 || 0) - dt; if (s.hp2 > 0) return; s.hp2 = 0.4;
    world.forNear(u.x, u.y, R, o => {
      if (o === u || !o.alive || o.side !== u.side || o.def.id === u.def.id || Math.hypot(o.x - u.x, o.y - u.y) > R) return;
      FO.clearStatus(o, hyping ? 'crash' : 'hyped'); FO.applyStatus(o, hyping ? 'hyped' : 'crash', 0.7, u);
    });
  },
});

// Funding rounds: backers keep turning up to fight for it, and all walk away the moment it looks like a bad bet.
FO.defineTrait('funding', {
  label: 'Raises funding', desc: p => `${FO.units[p.unit || 'investor'] ? FO.units[p.unit || 'investor'].name : 'Backer'}s keep arriving to fight for it, and all pull out once it is badly hurt`,
  onUpdate(u, dt, p) {
    const s = u.ts;
    if (s.bust) return;
    const list = s.inv || (s.inv = []);
    if (u.hp < u.maxHp * (p.bailBelow || 0.4)) return bail(u);
    s.fund = (s.fund == null ? (p.first || 2.5) : s.fund) - dt;
    if (s.fund > 0) return;
    s.fund = p.every || 8;
    s.inv = list.filter(o => o.alive);
    if (s.inv.length >= (p.max || 6)) return;
    s.round = (s.round || 0) + 1;
    fx.text(u.x, u.y - u.def.r - 10, s.round === 1 ? 'Seed round!' : 'Series ' + String.fromCharCode(64 + Math.min(26, s.round - 1)) + '!', '#12754a', 14);
    for (let i = 0; i < (p.n || 2); i++) {
      const a = Math.random() * 6.28, m = FO.spawn(p.unit || 'investor', FO.clamp(u.x + Math.cos(a) * 30, 16, FO.W - 16), FO.clamp(u.y + Math.sin(a) * 30, 16, FO.H - 16), u.team, { side: u.side });
      if (m) { s.inv.push(m); fx.dots(m.x, m.y, '#3fae5a', 6, 80, 2); }
    }
    FO.emit('raise', u);
  },
  onDeath(u) { bail(u); },
});
function bail(u) {
  const s = u.ts; if (s.bust) return; s.bust = true;
  let n = 0;
  for (const o of s.inv || []) if (o.alive) {
    if (n++ < 2) fx.text(o.x, o.y - o.def.r - 6, FO.pick(['We’re out.', 'Pass.', 'Writing it off']), '#1c1d22', 12);
    fx.dots(o.x, o.y, '#c9ced8', 8, 110, 2.2);
    FO.kill(o, null, { quiet: true });
  }
  if (n && u.alive) fx.say(u, 'Wait, come back!');
}

// Lunge: a sudden burst of speed at prey that has wandered close.
FO.defineTrait('lunge', {
  label: 'Lunge', desc: () => 'Explodes forward at anything that comes close, faster still from the water',
  onUpdate(u, dt, p) {
    const s = u.ts, tg = u.target;
    if (!tg || !tg.alive || s.rollT > 0 || world.time - (s.lunged || -9) < (p.cd || 3)) return;
    const dx = tg.x - u.x, dy = tg.y - u.y, d = Math.hypot(dx, dy) || 1;
    if (d > (p.range || 120) || d < u.def.r + tg.def.r + 10 || !u.shotOK) return;
    s.lunged = world.time;
    const v = (p.speed || 520) * (u.swimming ? 1.35 : 1);
    u.kx += dx / d * v; u.ky += dy / d * v;
    fx.dots(u.x, u.y, u.swimming ? '#ffffff' : '#c9c2b4', 8, 110, 2.6);
    if (u.swimming) fx.ring(u.x, u.y, u.def.r, '#ffffff', 2);
  },
});

// Death roll: clamps onto a smaller fighter and spins, holding it helpless while the damage piles up.
FO.defineTrait('deathRoll', {
  label: 'Death roll', desc: () => 'Clamps onto smaller fighters and spins, holding them helpless',
  onHit(u, tg, dealt, o, p) {
    const s = u.ts;
    if (!tg.alive || !o.direct || tg.def.r > (p.maxR || 18) || s.rollT > 0 || world.time - (s.rolled || -9) < (p.cd || 3.5)) return;
    s.rollT = p.time || 1.3; s.prey = tg; s.rolled = world.time + s.rollT;
    FO.applyStatus(tg, 'stun', s.rollT, u);
  },
  onUpdate(u, dt, p) {
    const s = u.ts;
    if (u.swimming) u.rateMul *= 1.5;      // at its most dangerous in the water
    if (!(s.rollT > 0)) { u.spin = 0; return; }
    const tg = s.prey;
    s.rollT -= dt;
    if (!tg || !tg.alive || s.rollT <= 0) { s.rollT = 0; s.prey = null; u.spin = 0; return; }
    u.speedMul = 0; u.cd = Math.max(u.cd, 0.2);
    u.spin = (u.spin || 0) + dt * 16;
    const hx = u.x + u.face * (u.def.r + tg.def.r * 0.4);
    tg.x += (hx - tg.x) * Math.min(1, dt * 10); tg.y += (u.y - tg.y) * Math.min(1, dt * 10); tg.kx = tg.ky = 0;
    FO.damage(tg, (p.dps || 45) * dt, u, { pure: true, quiet: true });
    if (FO.chance(dt * 12)) fx.dots(tg.x, tg.y, u.swimming ? '#ffffff' : '#c9c2b4', 1, 90, 2.4);
  },
});

// Submerged: while swimming, shots from a distance mostly splash harmlessly.
FO.defineTrait('submerged', {
  label: 'Lurks underwater', desc: p => `While swimming, ${Math.round((p.chance || 0.55) * 100)}% of shots from a distance just splash`,
  onDamaged(u, amount, src, o, p) {
    if (!u.swimming || !o.direct || !src || Math.hypot(src.x - u.x, src.y - u.y) < u.def.r + src.def.r + 24 || !FO.chance(p.chance || 0.55)) return amount;
    fx.dots(u.x, u.y, '#ffffff', 4, 80, 2); fx.text(u.x, u.y - u.def.r * 0.6, 'splash', '#3d8fd6', 11);
    return 0;
  },
});

// Roar: every so often, small enemies nearby panic and run for a moment.
FO.defineTrait('roar', {
  label: 'Roar', desc: p => `Every ${p.every || 9}s, fighters worth ${p.maxCost || 45} points or less nearby panic and run`,
  onUpdate(u, dt, p) {
    const s = u.ts;
    s.roar = (s.roar == null ? FO.rand(2, 5) : s.roar) - dt;
    if (s.roar > 0 || !u.target || Math.hypot(u.target.x - u.x, u.target.y - u.y) > (p.radius || 130) * 1.3) return;
    s.roar = p.every || 9;
    const R = p.radius || 130;
    let n = 0;
    world.forNear(u.x, u.y, R, o => {
      if (!o.alive || o.side === u.side || o.def.cost > (p.maxCost || 45) || Math.hypot(o.x - u.x, o.y - u.y) > R) return;
      FO.applyStatus(o, 'fear', p.time || 1.6, u); n++;
    });
    fx.ring(u.x, u.y, R * 0.7, '#c7741f', 4); fx.ring(u.x, u.y, R, '#c7741f', 2);
    fx.text(u.x, u.y - u.def.r - 8, 'ROAR', '#a35512', 18); FO.shake(4); FO.emit('shoot', u, 'roar');
  },
});

// Pride: hits harder with others of its own kind close by.
FO.defineTrait('pack', {
  label: 'Pack hunter', desc: p => `Hits ${Math.round((p.per || 0.2) * 100)}% harder for each packmate nearby (up to ${p.max || 3})`,
  onHit(u, tg, dealt, o, p) {
    if (!tg.alive) return;
    let n = 0;
    world.forNear(u.x, u.y, p.radius || 140, q => { if (q !== u && q.alive && q.def.id === u.def.id && q.side === u.side) n++; });
    n = Math.min(n, p.max || 3);
    if (n) FO.damage(tg, dealt * (p.per || 0.2) * n, u, { quiet: true });
  },
});

// Second wind: the first blow that would finish it off doesn't.
FO.defineTrait('secondWind', {
  label: 'Second wind', desc: () => 'Shrugs off the first deathblow of the battle and gets back up',
  onDamaged(u, amount, src, o, p) {
    const s = u.ts;
    if (s.wind || amount < u.hp) return amount;
    s.wind = true;
    u.hp = u.maxHp * (p.hp || 0.4); u.st = []; u.pop = 0.25;
    fx.say(u, FO.pick(p.lines || ['I’m fine!'])); fx.dots(u.x, u.y, '#ffd43b', 10, 110, 2.4);
    return 0;
  },
});

// Gator whisperer: an alligator that bites it may decide to switch sides.
FO.defineTrait('tameGators', {
  label: 'Gator whisperer', desc: p => `${Math.round((p.chance || 0.4) * 100)}% chance an alligator that bites it switches sides`,
  onDamaged(u, amount, src, o, p) {
    if (!o.direct || !src || !src.alive || src.def.id !== 'gator' || src.side === u.side || !FO.chance(p.chance || 0.4)) return amount;
    src.team = u.team; src.side = u.side;
    src.target = null; src.retT = 0; src.losT = 0; src.path = null; src.wp = null; src.pop = 0.25; src.ts.e = null; src.ts.chk = 0;
    fx.say(u, FO.pick(['Easy, buddy', 'Who’s a good boy?', 'He’s with me now'])); fx.glyph(src.x, src.y - src.def.r - 4, '💖', 14);
    return amount * 0.5;
  },
});

// Healing presence: friends close by slowly recover.
FO.defineTrait('healAura', {
  label: 'Healing presence', desc: p => `Friends within ${p.radius || 90} heal ${p.perSec || 6} health a second`,
  onUpdate(u, dt, p) {
    const R = p.radius || 90;
    world.forNear(u.x, u.y, R, o => {
      if (o.alive && o.side === u.side && o.hp < o.maxHp && Math.hypot(o.x - u.x, o.y - u.y) < R) FO.heal(o, (p.perSec || 6) * dt);
    });
    if (FO.chance(dt * 3)) fx.dots(u.x + FO.rand(-1, 1) * R * 0.6, u.y + FO.rand(-1, 1) * R * 0.4, '#ffe9a8', 1, 20, 2);
  },
});

// Raise the fallen: friends who fall nearby get back up shortly after.
FO.defineTrait('raiseFallen', {
  label: 'Raises the fallen', desc: p => `Friends who fall within ${p.radius || 160} get back up (one every ${p.cd || 5}s)`,
  onAnyDeath(u, victim, killer, p) {
    const s = u.ts, d = victim.def;
    if (victim.side !== u.side || d.r > (p.maxR || 24) || d.id === u.def.id || world.time - (s.raised || -99) < (p.cd || 5)) return;
    if (Math.hypot(victim.x - u.x, victim.y - u.y) > (p.radius || 160) || world.solidAt(victim.x, victim.y)) return;
    s.raised = world.time;
    const x = victim.x, y = victim.y, team = victim.team, side = victim.side;
    setTimeout(() => {
      if (!u.alive || world.mode !== 'running') return;
      const k = FO.spawn(d, x, y, team, { side });
      if (!k) return;
      k.hp = k.maxHp * (p.hp || 0.5);
      fx.beam(u, k, '#ffd43b'); fx.ring(k.x, k.y, k.def.r + 8, '#f2c14e', 3); fx.dots(k.x, k.y, '#fff3c4', 10, 90, 2.2);
      FO.emit('heal', u);
    }, (p.delay || 0.8) * 1000 / Math.max(0.5, (FO.ui && FO.ui.speed) || 1));
  },
});

FO.defineTrait('hop', {
  label: 'Hops', desc: () => 'Gets about in quick leaps',
  onUpdate(u, dt, p) {
    const s = u.ts, cyc = 0.62, air = 0.34;
    s.h = (s.h == null ? Math.random() * cyc : s.h) + dt;
    const ph = s.h % cyc;
    if (ph < air) { u.speedMul *= 2.2; u.z = u.moving ? Math.sin(ph / air * Math.PI) * u.def.r * 1.1 : 0; }
    else { u.speedMul *= 0.06; u.z = 0; }
  },
});

FO.defineTrait('callManager', {
  label: 'Calls the manager', desc: () => 'When things go badly, the manager turns up to sort it out',
  onDamaged(u, amount, src, o, p) {
    if (u.ts.called || u.hp - amount > u.maxHp * 0.65 || u.hp - amount <= 0) return amount;
    u.ts.called = true;
    const a = Math.random() * 6.28, m = FO.spawn(p.unit || 'manager', FO.clamp(u.x + Math.cos(a) * 26, 16, FO.W - 16), FO.clamp(u.y + Math.sin(a) * 26, 16, FO.H - 16), u.team, { side: u.side });
    if (m) { fx.ring(m.x, m.y, 26, '#1f3a6e', 3); fx.dots(m.x, m.y, '#ffffff', 8, 90, 2); fx.say(m, 'You asked for me?'); FO.emit('raise', u); }
    fx.say(u, 'MANAGER!!');
    return amount;
  },
});

FO.defineTrait('shiny', {
  label: 'Shiny', desc: p => `${Math.round((p.chance || 0.45) * 100)}% of shots from a distance bounce off his head and back at the shooter`,
  onDamaged(u, amount, src, o, p) {
    if (!o.direct || !src || Math.hypot(src.x - u.x, src.y - u.y) < u.def.r + src.def.r + 24 || !FO.chance(p.chance || 0.45)) return amount;
    fx.text(u.x, u.y - u.def.r - 4, 'ping', '#8a8f9c', 11); fx.dots(u.x, u.y - u.def.r * 0.6, '#ffffff', 3, 90, 1.6);
    if (src.alive) { fx.tracer(u.x, u.y - u.def.r * 0.7, src.x, src.y, '#ffffff', 2.5); FO.damage(src, amount * 0.8, u, {}); }
    return 0;
  },
});

FO.defineTrait('charm', {
  label: 'Gains followers', desc: p => `${Math.round((p.chance || 0.35) * 100)}% chance a small enemy it hits switches to its side`,
  onHit(u, tg, dealt, o, p) {
    if (!tg.alive || tg.def.cost > (p.maxCost || 45) || tg.def.id === u.def.id || !FO.chance(p.chance || 0.35)) return;
    tg.team = u.team; tg.side = u.side;
    tg.target = null; tg.retT = 0; tg.losT = 0; tg.path = null; tg.wp = null; tg.pop = 0.25;
    fx.glyph(tg.x, tg.y - tg.def.r - 4, '💖', 13); fx.dots(tg.x, tg.y, '#ff7ab8', 5, 80, 2);
  },
});

FO.defineTrait('devour', {
  label: 'Devours', desc: p => p.heal === 0 ? 'Swallows small fighters whole' : 'Swallows small fighters whole and heals from the snack',
  onHit(u, tg, dealt, o, p) {
    if (!tg.alive || tg.def.r > (p.maxR || 16)) return;
    FO.kill(tg, u, { quiet: true });
    if (p.heal !== 0) FO.heal(u, p.heal || 40);
    if (FO.chance(0.4)) fx.text(u.x, u.y - u.def.r - 6, 'gulp', '#7a5236', 13);
  },
});

FO.defineTrait('aura', {
  label: 'Hype aura', desc: p => `Friends within ${p.radius || 110} move and attack faster`,
  onUpdate(u, dt, p) {
    u.ts.aura = (u.ts.aura || 0) - dt;
    if (u.ts.aura > 0) return;
    u.ts.aura = 0.5;
    const R = p.radius || 110;
    world.forNear(u.x, u.y, R, o => {
      if (o !== u && o.alive && o.side === u.side && Math.hypot(o.x - u.x, o.y - u.y) < R) FO.applyStatus(o, p.status || 'pumped', 1.2, u);
    });
  },
});

/* =====================================================================
   STATUSES
   ===================================================================== */
FO.defineStatus('burn', {
  name: 'Burning', color: 'rgba(255,122,26,.42)',
  tick(u, s, dt) {
    FO.damage(u, (6 + u.maxHp * 0.012) * dt, s.src, { pure: true, quiet: true, kind: 'burn' });
    if (FO.chance(dt * 6)) fx.dots(u.x + FO.rand(-1, 1) * u.def.r * 0.6, u.y - u.def.r * 0.5, FO.chance(0.5) ? '#ffd34d' : '#ff8a2a', 1, 40, 2.4);
  },
});
FO.defineStatus('poison', {
  name: 'Poisoned', color: 'rgba(110,200,60,.42)',
  tick(u, s, dt) {
    FO.damage(u, (3 + u.maxHp * 0.008) * dt, s.src, { pure: true, quiet: true, kind: 'poison' });
    if (FO.chance(dt * 3)) fx.dots(u.x + FO.rand(-1, 1) * u.def.r * 0.6, u.y - u.def.r * 0.6, '#7ed957', 1, 26, 2);
  },
});
FO.defineStatus('chill', { name: 'Chilled', color: 'rgba(120,190,255,.45)', speedMul: 0.5, rateMul: 0.65 });
FO.defineStatus('frozen', { name: 'Frozen', color: 'rgba(170,225,255,.8)', stun: true, speedMul: 0 });
FO.defineStatus('pumped', { name: 'Pumped', color: 'rgba(255,196,0,.18)', speedMul: 1.2, rateMul: 1.35 });
FO.defineStatus('hyped', { name: 'Hyped', color: 'rgba(255,196,0,.22)', speedMul: 1.3, rateMul: 1.5 });
FO.defineStatus('crash', { name: 'Deflated', color: 'rgba(110,120,150,.35)', speedMul: 0.7, rateMul: 0.65 });
FO.defineStatus('fear', { name: 'Panicking', color: 'rgba(160,120,220,.3)', speedMul: 1.15 });
FO.defineStatus('stun', { name: 'Stunned', color: 'rgba(255,220,90,.4)', stun: true, speedMul: 0 });
// Can't see: stumbles about and hits whoever it bumps into, friends included (FO.ai.blind). Comes round wearing glasses.
FO.defineStatus('blurry', {
  name: 'Blurred vision', color: 'rgba(255,255,255,.12)', blind: true, speedMul: 0.45,
  onApply(u, s) {
    if (u.def.r >= 24) s.t *= 0.5;                                 // giants blink it away sooner
    u.target = null;
    fx.text(u.x, u.y - u.def.r - 6, FO.pick(['E', 'F P', 'T O Z', 'L P E D', '?']), '#1c1d22', 13);
  },
  onEnd(u) { u.specs = true; },
});
FO.defineStatus('bleed', {
  name: 'Bleeding', color: 'rgba(200,30,40,.2)',
  tick(u, s, dt) {
    FO.damage(u, 3 * dt, s.src, { pure: true, quiet: true, kind: 'bleed' });
    if (FO.chance(dt * 4)) fx.dots(u.x + FO.rand(-1, 1) * u.def.r * 0.5, u.y + u.def.r * 0.3, '#c8102e', 1, 22, 1.8);
  },
});
FO.defineStatus('vibing', {
  name: 'Good vibes', color: 'rgba(255,150,210,.13)', speedMul: 1.1, rateMul: 1.25,
  tick(u, s, dt) { if (u.hp < u.maxHp) FO.heal(u, 5 * dt); if (FO.hasStatus(u, 'fear')) FO.clearStatus(u, 'fear'); },
});
// Ryan's coffee: a good cup, and then the comedown.
FO.defineStatus('caffeinated', {
  name: 'Caffeinated', color: 'rgba(160,110,60,.18)', speedMul: 1.25, rateMul: 1.4,
  onEnd(u) { if (u.alive) FO.applyStatus(u, 'jitters', 1.5, null); },
});
FO.defineStatus('jitters', {
  name: 'Jitters', color: 'rgba(160,110,60,.1)', speedMul: 0.85, rateMul: 0.8,
  tick(u, s, dt) { if (FO.chance(dt * 4)) { u.kx += FO.rand(-60, 60); u.ky += FO.rand(-60, 60); } },
});
// A muffin has landed nearby: wanders over to it and eats instead of fighting (FO.ai.lured), until the muffin is
// finished or somebody hits it. Nobody falls for it twice in a row: it is full for a few seconds afterwards.
FO.defineStatus('muffin', {
  name: 'Distraction', color: 'rgba(255,214,150,.16)', lure: true,
  onApply(u, s) {
    if (world.time < (u.fullT || 0)) { s.t = 0; return; }
    if (u.def.r >= 24) s.t *= 0.5;
    s.ate = true; s.hp0 = u.hp; u.target = null;
  },
  onEnd(u, s) { if (s.ate) u.fullT = world.time + 5; },
});
// A smoke break: stands there, does nothing, smokes.
// Spiralling: stuck on the spot, spinning, until it kills him.
FO.defineStatus('spiral', {
  name: 'Spiralling', color: 'rgba(140,90,200,.22)', stun: true, speedMul: 0,
  tick(u, s, dt) {
    u.spin = (u.spin || 0) + dt * 9;
    if (FO.chance(dt * 1.2)) fx.text(u.x + FO.rand(-8, 8), u.y - u.def.r - 6, FO.pick(['?', '…', 'what if', '?!']), '#6b4aa0', 12);
    FO.damage(u, u.maxHp / 9 * dt, null, { pure: true, quiet: true, kind: 'spiral' });
  },
});
FO.defineStatus('smoke', {
  name: 'On a break', color: 'rgba(120,124,136,.16)', stun: true, speedMul: 0,
  tick(u, s, dt) { if (FO.chance(dt * 7)) fx.dots(u.x + u.face * u.def.r * 0.7 + FO.rand(-2, 2), u.y - u.def.r * 0.5, FO.chance(0.5) ? '#d9dbe2' : '#b4b7c2', 1, 34, 3); },
});
})();
