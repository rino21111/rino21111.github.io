/* =====================================================================
   SVG WARS · theory
   Fighters built on a piece of maths rather than a weapon.
     Fibonacci Rabbit   breeds on the Fibonacci sequence
     Boid               flocks by the three boids rules
     Zeno's Tortoise    everything about it happens by halves
     Schrödinger's Cat  a closed box: cat or no cat, decided when observed
   (Conway's Chicken, the other one of these, lives in js/life.js.)
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, fx = FO.fx, W = FO.W, H = FO.H;

/* ---------- Fibonacci Rabbit ----------
   Every generation each adult has one kit and each kit grows up, so a
   lone kit becomes 1, 1, 2, 3, 5, 8, 13... rabbits. */
const FIB_GEN = 5, FIB_CAP = 233;
let fibGen = 0, fibCountT = 0;
const swarming = new Set();
FO.fibTick = function () {
  const gen = Math.floor(world.time / FIB_GEN);
  // the warren swarms once its side outweighs everyone else put together by a quarter (or it can't grow any more)
  if (world.time < fibCountT || world.time > fibCountT + 0.4) {
    if (world.time < fibCountT) swarming.clear();
    fibCountT = world.time;
    const mine = new Map(), bySide = new Map(); let all = 0;       // strength is measured in points
    for (const u of world.units) {
      if (!u.alive) continue;
      const c = u.def.cost || 10; all += c; bySide.set(u.side, (bySide.get(u.side) || 0) + c);
      if (u.def.fib) mine.set(u.side, (mine.get(u.side) || 0) + 1);
    }
    for (const [side, n] of mine) if (bySide.get(side) >= 1.25 * (all - bySide.get(side)) || n >= FIB_CAP * 0.9) swarming.add(side);
  }
  if (gen === fibGen) return;
  fibGen = gen;
  if (gen === 0) return;
  let bred = false;
  const groups = new Map();
  for (const u of world.units) {
    if (!u.alive || !u.def.fib) continue;
    const k = u.side + '|' + u.team;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(u);
  }
  for (const list of groups.values()) {
    let n = list.length, sx = 0, sy = 0;
    for (const u of list) {
      sx += u.x; sy += u.y;
      if (u.young) { u.young = false; u.size = 1; u.pop = 0.25; u.maxHp = u.def.hp; u.hp = Math.min(u.maxHp, u.hp + u.def.hp / 2); continue; }
      if (n >= FIB_CAP) continue;
      const a = Math.random() * 6.28;
      const k = FO.spawn(u.def, u.x + Math.cos(a) * 12, u.y + Math.sin(a) * 12, u.team, { side: u.side });
      if (k) { n++; bred = true; }
    }
    if (n !== list.length) fx.text(sx / list.length, sy / list.length - 22, String(n), '#1c1d22', 20);
  }
  if (bred) world.lastDamageT = world.time;        // a growing warren is not a stalemate
};
// Keeps its distance and breeds until the warren is big enough, then fights like anyone else.
FO.ai.warren = function (u, dt) {
  if (world.ffa || swarming.has(u.side)) return FO.ai.fighter(u, dt);
  let fx_ = 0, fy_ = 0, bd = 1e9, near = null;
  world.forNear(u.x, u.y, 190, o => {
    if (!o.alive || o.side === u.side || o.untargetable) return;
    const dx = u.x - o.x, dy = u.y - o.y, d = Math.hypot(dx, dy) || 1;
    if (d > 190) return;
    const k = (190 - d) / 190; fx_ += dx / d * k; fy_ += dy / d * k;
    if (d < bd) { bd = d; near = o; }
  });
  if (!near) return;
  const a = u.def.attack;                           // cornered: bite back
  if (bd < u.def.r + near.def.r + 5 && u.cd <= 0) { FO.damage(near, a.dmg * u.hitMul, u, { direct: true }); u.cd = a.cd; u.swing = 0.22; }
  const m = 70;                                     // don't get pinned against the edge of the field
  if (u.x < m) fx_ += (m - u.x) / m * 1.5; else if (u.x > W - m) fx_ -= (u.x - W + m) / m * 1.5;
  if (u.y < m) fy_ += (m - u.y) / m * 1.5; else if (u.y > H - m) fy_ -= (u.y - H + m) / m * 1.5;
  const l = Math.hypot(fx_, fy_); if (l < 0.05) return;
  u.wantX = fx_ / l; u.wantY = fy_ / l; u.face = fx_ > 0 ? 1 : -1;
};
FO.defineTrait('fibonacci', {
  label: 'Fibonacci', desc: () => `Every ${FIB_GEN}s each adult has one kit and each kit grows up: 1, 1, 2, 3, 5, 8, 13… up to ${FIB_CAP}. Keeps away from the fight until its side clearly outweighs the enemy in points, then swarms`,
  onSpawn(u) { u.young = true; u.size = 0.68; u.maxHp = u.hp = u.def.hp / 2; },
  onUpdate(u) { u.hitMul = u.young ? 0.5 : 1; },
});

/* ---------- Boid ----------
   Reynolds' three rules and nothing else: keep apart, match your
   neighbours' heading, stay with the group. A faint pull toward the
   nearest enemy gives the flock somewhere to go; it never stops, it
   pecks whatever it passes through. */
const SEE = 70, NEAR = 26;
FO.ai.boid = function (u, dt) {
  const s = u.ts, a = u.def.attack;
  if (s.hx == null) { const t = Math.random() * 6.28; s.hx = Math.cos(t); s.hy = Math.sin(t); s.seekT = Math.random() * 0.5; }
  let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0, hit = null;
  world.forNear(u.x, u.y, SEE, o => {
    if (o === u || !o.alive) return;
    const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy) || 0.01;
    if (o.def.ai === 'boid' && o.side === u.side) {
      if (d > SEE || o.ts.hx == null) return;
      n++; ax += o.ts.hx; ay += o.ts.hy; cx += o.x; cy += o.y;
      if (d < NEAR) { const k = (NEAR - d) / NEAR; sx -= dx / d * k; sy -= dy / d * k; }
    } else if (o.side !== u.side && !o.untargetable && !o.under && d < u.def.r + o.def.r + 10) hit = o;
  });
  s.seekT -= dt;
  if (s.seekT <= 0) {
    s.seekT = 0.5 + Math.random() * 0.3;
    let best = null, bd = 1e12;
    for (const o of world.units) {
      if (!o.alive || o.side === u.side || o.untargetable || o.under) continue;
      const d = (o.x - u.x) ** 2 + (o.y - u.y) ** 2;
      if (d < bd) { bd = d; best = o; }
    }
    s.goal = best;
  }
  let fx_ = sx * 2.6, fy_ = sy * 2.6;
  if (n) {
    fx_ += (ax / n - s.hx) * 1.1 + (cx / n - u.x) / SEE * 0.9;
    fy_ += (ay / n - s.hy) * 1.1 + (cy / n - u.y) / SEE * 0.9;
  }
  const g = s.goal;
  if (g && g.alive) {
    const dx = g.x - u.x, dy = g.y - u.y, d = Math.hypot(dx, dy) || 1, k = 0.85 * Math.min(1, d / 110);
    fx_ += dx / d * k; fy_ += dy / d * k;
  }
  const m = 50;                                    // turn away from the edges
  if (u.x < m) fx_ += (m - u.x) / m * 2; else if (u.x > W - m) fx_ -= (u.x - W + m) / m * 2;
  if (u.y < m) fy_ += (m - u.y) / m * 2; else if (u.y > H - m) fy_ -= (u.y - H + m) / m * 2;
  s.hx += fx_ * dt * 3.4; s.hy += fy_ * dt * 3.4;
  const l = Math.hypot(s.hx, s.hy) || 1; s.hx /= l; s.hy /= l;
  u.wantX = s.hx; u.wantY = s.hy;
  if (Math.abs(s.hx) > 0.25) u.face = s.hx > 0 ? 1 : -1;
  if (hit && u.cd <= 0) {
    FO.damage(hit, a.dmg * u.hitMul, u, { nx: s.hx, ny: s.hy, direct: true });
    u.cd = a.cd * (0.85 + Math.random() * 0.3);
  }
};
FO.defineTrait('flocking', {
  label: 'Boids', desc: () => 'Steers by three rules only: keep apart, line up, stay together. Never stops flying',
});

/* ---------- Schrödinger's Cat ----------
   A box that sits where you put it. The first time an enemy touches it,
   hits it, shoots it or blows it up, the box is opened: half the time a
   cat leaps out (the blow that opened it does nothing), half the time
   it was empty all along and the box is gone. */
FO.ai.box = function (u) { u.x = u.bx; u.y = u.by; };
function observe(u) {
  if (!u.alive || u.opened) return;
  u.opened = true; u.alive = false;                   // the box itself is gone either way: no corpse, nothing to raise
  fx.dots(u.x, u.y, '#c9a26b', 9, 120, 2.4);
  if (Math.random() < 0.5) {
    const c = FO.spawn(u.def.opens, u.x, u.y, u.team, { side: u.side });
    if (c) { c.face = u.face; c.cd = 0.15; fx.say(c, FO.pick(['Meow.', 'Alive!', 'MRRROW', '*hiss*'])); }
  } else {
    const ts = world.teamStats[u.team]; if (ts) ts.lost++;
    fx.text(u.x, u.y - u.def.r - 6, FO.pick(['…empty', 'no cat', '∅', 'nobody home']), '#6a6f80', 13);
  }
  FO.emit('observe', u);
}
FO.defineTrait('superposition', {
  label: 'Superposition', desc: () => 'Cat and no cat until an enemy touches, hits or shoots the box. Then it’s a coin flip: a cat leaps out, or the box was empty',
  onSpawn(u) { u.bx = u.x; u.by = u.y; },
  onDamaged(u) { if (world.mode === 'running') observe(u); return 0; },
  onUpdate(u, dt) {
    u.bx = u.x; u.by = u.y;
    const s = u.ts; s.w = (s.w == null ? Math.random() * 3 : s.w) - dt;      // an occasional rustle from inside
    if (s.w < 0) { s.w = 2 + Math.random() * 3; s.wt = 0.45; }
    if (s.wt > 0) { s.wt -= dt; u.spin = Math.sin(s.wt * 40) * 0.12 * (s.wt / 0.45); } else u.spin = 0;
    if (world.mode !== 'running') return;
    world.forNear(u.x, u.y, u.def.r + FO.maxR + 4, o => {
      if (!o.alive || o.side === u.side || o.under || o.untargetable) return;
      if (Math.hypot(o.x - u.x, o.y - u.y) < u.def.r + o.def.r + 4) { observe(u); return false; }
    });
  },
});

/* ---------- Zeno's Tortoise ---------- */
FO.defineTrait('zenoStep', {
  label: 'Dichotomy', desc: () => 'Each moment it covers half the distance left to its target: quick from afar, a crawl up close',
  onUpdate(u) {
    const t = u.target; if (!t || !t.alive) return;
    const d = Math.max(0, Math.hypot(t.x - u.x, t.y - u.y) - u.def.r - t.def.r);
    u.speedMul *= Math.min(2.4, Math.max(0.3, d * 1.15 / u.def.speed));      // halves the gap every 0.6s
  },
});
FO.defineTrait('zenoShell', {
  label: 'Half-life', desc: () => 'No blow, however hard, can take more than half its remaining health',
  onDamaged(u, amount, src, o) {
    if (o.quiet) return amount;                    // fire and poison don't care about paradoxes
    if (u.hp <= 3) return u.hp + 1;
    if (amount <= u.hp / 2) return amount;
    fx.text(u.x, u.y - u.def.r - 6, '½', '#3f7d4e', 14);
    return u.hp / 2 / (src && !o.pure && FO.level(u) > FO.level(src) ? 0.75 : 1);
  },
});
FO.defineTrait('zenoBite', {
  label: 'Halving bite', desc: p => `Each bite takes half the victim’s remaining health (at least ${p.min})`,
  onHit(u, t, amount, o, p) { if (t.alive && t.hp > 0) FO.damage(t, Math.max(p.min, t.hp / 2), u, { pure: true }); },
});
})();
