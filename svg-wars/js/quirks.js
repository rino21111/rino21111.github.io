/* =====================================================================
   SVG WARS · quirks
   Fighters built around one odd rule, and the AIs that take over a fighter
   while some status has it.
     The Lagger      damage reaches him two seconds late
     Medusa          melee attackers who face her turn to stone (a statue tile)
     Robot Vacuum    drives in straight lines and bounces off whatever it hits
     blurred vision  (Zach) stumbles about, lashing out at whoever it bumps
     muffins         (Sierra) walks over to the nearest muffin and eats it
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, fx = FO.fx, W = FO.W, H = FO.H, T = FO.TILE;

/* ---------- The Lagger ---------- */
FO.defineTrait('lag', {
  label: 'High ping', desc: p => `Damage reaches him ${p.delay || 2}s late, so he fights on after he should have dropped. A quick medic can heal it before it lands. On screen he freezes, teleports and rubber-bands`,
  onDamaged(u, amount, src, o, p) {
    if (o.lagged) return amount;
    (u.ts.q || (u.ts.q = [])).push({ t: world.time + (p.delay || 2), amount, src });
    if (FO.chance(0.25)) fx.text(u.x, u.y - u.def.r - 6, FO.pick(['lag', '…', '999ms', 'buffering']), '#6a6f80', 11);
    return 0;
  },
  onUpdate(u, dt) {
    const s = u.ts, q = s.q;
    while (q && q.length && q[0].t <= world.time && u.alive) { const e = q.shift(); FO.damage(u, e.amount, e.src && e.src.alive ? e.src : null, { pure: true, lagged: true }); }
    // What everyone else sees is his last "packet": the picture updates in jerks, sometimes freezes outright,
    // then snaps to where he really is. Now and then the snap goes the other way and he is yanked back.
    const L = u.lag || (u.lag = { x: u.x, y: u.y, face: u.face, nt: 0, frozen: false, gt: 0, gx: 0, gy: 0 });
    if (L.gt > 0) L.gt -= dt;
    L.nt -= dt;
    if (L.nt > 0) return;
    if (L.rb) {                                       // rubber-band, part two: yanked back to where the freeze began
      if (!world.solidAt(L.rb.x, L.rb.y)) { u.x = L.rb.x; u.y = L.rb.y; }
      L.rb = null;
    } else if (L.frozen && FO.chance(0.3) && Math.hypot(u.x - L.x, u.y - L.y) > 12) {
      L.rb = { x: L.x, y: L.y };                      // part one: he pops forward to where he thought he was...
      L.gx = L.x; L.gy = L.y; L.gt = 0.3; L.x = u.x; L.y = u.y; L.face = u.face; L.frozen = false; L.nt = 0.2;
      return;
    }
    if (Math.hypot(u.x - L.x, u.y - L.y) > 5) { L.gx = L.x; L.gy = L.y; L.gt = 0.3; }
    L.x = u.x; L.y = u.y; L.face = u.face;
    L.frozen = FO.chance(0.28);
    L.nt = L.frozen ? 0.55 + Math.random() * 0.6 : 0.09 + Math.random() * 0.14;
    if (L.frozen && FO.chance(0.35)) fx.text(u.x, u.y - u.def.r - 8, FO.pick(['reconnecting…', '▁▃▅ ✕', 'packet loss']), '#c0392b', 10);
  },
});

/* ---------- Medusa ---------- */
let WALL = -1;
FO.defineTrait('stoneGaze', {
  label: 'Stone gaze', desc: p => `A fighter who strikes her from the front turns to stone and stays there as a statue, blocking the way until someone smashes it (once every ${p.cd || 1.2}s). Giants are only frozen stiff. Arrows, spells and attacks from behind are safe`,
  onUpdate(u, dt) { if (u.ts.gz > 0) u.ts.gz -= dt; },
  onDamaged(u, amount, src, o, p) {
    if (!o.direct || !src || !src.alive || src.side === u.side || u.ts.gz > 0 || world.mode !== 'running') return amount;
    if ((src.x - u.x) * u.face < 0) return amount;                             // came from behind
    u.ts.gz = p.cd || 1.2;
    if (src.def.r > (p.maxR || 20)) { FO.applyStatus(src, 'stun', 2, u); fx.text(src.x, src.y - src.def.r - 6, 'stiff', '#8b8f9c', 13); return amount * 0.5; }
    if (WALL < 0) WALL = FO.terrain.findIndex(t => t && t.id === 'statue');
    const x = src.x, y = src.y;
    FO.kill(src, u, { quiet: true });
    fx.dots(x, y, '#b9bcc8', 8, 90, 2.4); fx.text(x, y - 14, 'stone', '#6a6f80', 12);
    if (!world.solidAt(x, y)) world.paintTiles(x, y, 1, WALL, true);
    return 0;
  },
});

/* ---------- blurred vision (Zach) ---------- */
// A fighter that can't see wanders a few steps this way and that. Hand-to-hand fighters lash out at whoever they
// bump into, friend or enemy; anything that needs to aim does nothing.
FO.ai.blind = function (u, dt) {
  const s = u.ts, def = u.def, a = def.attack;
  s.bt = (s.bt || 0) - dt;
  if (s.bt <= 0) { s.bt = 0.5 + Math.random() * 0.7; const t = Math.random() * 6.283; s.bx = Math.cos(t); s.by = Math.sin(t); }
  u.target = null;
  u.wantX = s.bx; u.wantY = s.by;
  if (Math.abs(s.bx) > 0.2) u.face = s.bx > 0 ? 1 : -1;
  if (a.range || a.type === 'heal' || u.cd > 0) return;
  let near = null, nd = 12;
  world.forNear(u.x, u.y, def.r + FO.maxR + 14, o => {
    if (o === u || !o.alive || o.untargetable || o.under || o.carried || (o.def.flying && !def.flying)) return;
    const d = Math.hypot(o.x - u.x, o.y - u.y) - o.def.r - def.r;
    if (d < nd) { nd = d; near = o; }
  });
  if (!near) return;
  const dx = near.x - u.x, dy = near.y - u.y, d = Math.hypot(dx, dy) || 1;
  def._atk.fire(u, near, a, dx / d, dy / d, d);
  u.cd = a.cd; u.swing = 0.22;
};

/* ---------- muffins (Sierra) ---------- */
// Where muffins have landed lately. A distracted fighter walks to the nearest one and stands there eating.
let muffins = [];
FO.on('soft-land', (x, y) => {
  muffins.push({ x, y, t: world.time });
  if (muffins.length > 40) muffins.shift();
  fx.glyph(x, y, '🧁', 15, 3.2); fx.dots(x, y, '#e9c48a', 5, 60, 1.8);
});
FO.on('start', () => { muffins = []; });
FO.ai.lured = function (u, dt) {
  const s = u.st.find(q => q.impl.lure); if (!s) return;
  if (u.hp < s.hp0 - 3) { s.t = 0; return; }                       // something hit it: back to the fight
  if (s.x == null) {
    let bd = 130; s.x = u.x; s.y = u.y;
    for (const m of muffins) { if (world.time - m.t > 3.5) continue; const d = Math.hypot(m.x - u.x, m.y - u.y); if (d < bd) { bd = d; s.x = m.x; s.y = m.y; } }
  }
  u.target = null;
  const dx = s.x - u.x, dy = s.y - u.y, d = Math.hypot(dx, dy);
  if (d > u.def.r + 4) { u.wantX = dx / d; u.wantY = dy / d; if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1; }
  else if (FO.chance(dt * 1.2)) fx.text(u.x, u.y - u.def.r - 6, FO.pick(['nom', 'mmm', 'ooh, muffin']), '#8a5a36', 11);
};

/* ---------- Robot Vacuum ---------- */
// No sensors and no plan: it drives straight until it actually runs into something (a wall, the edge of the
// field, a fighter from either side), backs off a little, turns to a random new heading and sets off again.
function bump(u, s) {
  s.back = 0.22; s.grace = 0.5; s.slow = 0;
  const a = Math.atan2(s.hy, s.hx) + (Math.random() < 0.5 ? -1 : 1) * (1.0 + Math.random() * 2.0);
  s.nx = Math.cos(a); s.ny = Math.sin(a);
  fx.dots(u.x + s.hx * u.def.r, u.y + s.hy * u.def.r, '#e9ebf1', 3, 60, 1.8);
  if (FO.chance(0.3)) fx.text(u.x, u.y - u.def.r - 6, FO.pick(['bonk', '*bump*', 'clunk']), '#6a6f80', 11);
}
FO.ai.vacuum = function (u, dt) {
  const s = u.ts, a = u.def.attack, r = u.def.r;
  if (s.hx == null) { const t = Math.random() * 6.283; s.hx = Math.cos(t); s.hy = Math.sin(t); s.slow = 0; s.grace = 0.4; s.back = 0; }
  if (u.stunned) { s.slow = 0; return; }
  if (s.back > 0) {                                   // reversing off whatever it hit
    s.back -= dt; u.wantX = -s.hx * 0.6; u.wantY = -s.hy * 0.6;
    if (s.back <= 0) { s.hx = s.nx; s.hy = s.ny; }
    return;
  }
  u.wantX = s.hx; u.wantY = s.hy;
  if (Math.abs(s.hx) > 0.2) u.face = s.hx > 0 ? 1 : -1;
  // hit an enemy: knock it (or swallow it) and bounce off
  if (u.cd <= 0) {
    let hit = null;
    world.forNear(u.x, u.y, r + FO.maxR + 4, o => {
      if (hit || !o.alive || o.side === u.side || o.untargetable || o.under || o.def.flying && o.def.r > 8) return;
      const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy) || 1;
      if (d < r + o.def.r + 3 && (dx * s.hx + dy * s.hy) / d > 0.2) hit = o;
    });
    if (hit) {
      const dx = hit.x - u.x, dy = hit.y - u.y, d = Math.hypot(dx, dy) || 1;
      FO.damage(hit, a.dmg * u.hitMul, u, { nx: dx / d, ny: dy / d, knock: a.knock, direct: true });
      u.cd = a.cd;
      if (hit.alive) bump(u, s);
      return;
    }
  }
  // hit anything else: it only knows because it has stopped making headway
  if (s.grace > 0) { s.grace -= dt; return; }
  const vx = u.rvx || 0, vy = u.rvy || 0, along = vx * s.hx + vy * s.hy, side = Math.abs(vx * s.hy - vy * s.hx);
  s.slow = along < u.def.speed * 0.35 || side > u.def.speed * 0.22 ? s.slow + dt : 0;        // stopped, or scraping along something
  if (s.slow > 0.1) bump(u, s);
};
FO.defineTrait('bumper', {
  label: 'Bump and turn', desc: () => 'No sensors, no target. Drives straight until it runs into a wall, the edge of the field or a fighter, backs off, turns a random way and drives on',
});
})();
