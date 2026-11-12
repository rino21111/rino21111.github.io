/* =====================================================================
   SVG WARS · synergy
   Things fighters do with (or to) particular other fighters.
     prey    food chain: bonus damage to, or a meal of, natural prey
     hurl    the ogre throws small friends at the enemy
     rider   a knight next to a friendly rhino mounts up
   A fighter that is being thrown or is riding is `carried`: it skips its
   own AI, can't be hit, and is moved by FO.carryTick instead.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, fx = FO.fx;
const nameOf = id => { const d = FO.units[id]; return d ? (d.plural || d.name + 's') : id; };
const list = ids => ids.map(nameOf).join(' and ');

/* ---------- food chain ---------- */
// p.eat: ids swallowed whole (heals p.heal). p.hunt: ids that take p.mult times damage.
FO.defineTrait('prey', {
  label: 'Food chain',
  desc: p => [p.eat && `Swallows ${list(p.eat)} whole and heals`, p.hunt && `${p.mult || 2}× damage to ${list(p.hunt)}`].filter(Boolean).join('. ') + '. Goes for them first',
  onHit(u, tg, dealt, o, p) {
    const id = tg.def.id;
    if (p.eat && p.eat.indexOf(id) >= 0) {
      if (tg.alive) FO.kill(tg, u, { quiet: true });
      FO.heal(u, p.heal || 10); u.pop = 0.25;
      if (FO.chance(0.5)) fx.text(u.x, u.y - u.def.r - 6, FO.pick(['gulp', 'nom', 'snack']), '#7a5236', 12);
    } else if (p.hunt && p.hunt.indexOf(id) >= 0 && tg.alive && !o.bonus) {
      FO.damage(tg, dealt * ((p.mult || 2) - 1), u, { pure: true, bonus: true });
    }
  },
});
// used by tactics.pickTarget: how much closer a target "feels" when it is this fighter's prey
FO.preyPull = function (u, o) {
  const t = u.def._prey; if (t === undefined) {
    const tr = u.def.traits.find(x => x.id === 'prey');
    u.def._prey = tr ? (tr.p.eat || []).concat(tr.p.hunt || []) : null;
    return FO.preyPull(u, o);
  }
  return t && t.indexOf(o.def.id) >= 0 ? 150 : 0;
};

/* ---------- carried fighters ---------- */
function land(u) {
  const t = u.thrown; u.thrown = null;
  u.carried = false; u.untargetable = false; u.z = 0; u.spin = 0;
  if (world.solidAt(u.x, u.y)) { u.x = t.fx; u.y = t.fy; }
  const R = 46, by = t.by && t.by.alive ? t.by : u;
  let hits = 0;
  world.forNear(u.x, u.y, R + FO.maxR, o => {
    if (!o.alive || o.side === u.side || o.untargetable || hits >= 6) return;
    const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy) || 1;
    if (d > R + o.def.r) return;
    hits++;
    FO.damage(o, t.dmg, by, { nx: dx / d, ny: dy / d, knock: 260 });
    if (t.spiky && o.alive) FO.applyStatus(o, 'stun', 0.5, by);
  });
  fx.dots(u.x, u.y, '#c9c2b4', 8, 110, 2.6); FO.emit('thud', u);
  u.pop = 0.25; u.target = null; u.retT = 0;
  FO.damage(u, Math.min(u.hp - 1, u.maxHp * 0.15), null, { pure: true });      // a rough landing, never a fatal one
  if (u.alive) FO.applyStatus(u, 'stun', 0.5, null);
}
function dismount(k) {
  const r = k.riding; k.riding = null; if (r && r.rider === k) r.rider = null;
  k.carried = false; k.untargetable = false; k.z = 0; k.size = 1; k.noFeet = false; k.pop = 0.25; k.target = null; k.retT = 0;
}
// Called from the sim for every carried fighter instead of its normal update.
FO.carryTick = function (u, dt) {
  if (u.flash > 0) u.flash -= dt; if (u.pop > 0) u.pop -= dt; if (u.swing > 0) u.swing -= dt;
  const t = u.thrown;
  if (t) {
    t.t += dt; const k = Math.min(1, t.t / t.dur);
    u.x = t.x0 + (t.x1 - t.x0) * k; u.y = t.y0 + (t.y1 - t.y0) * k;
    if (!world.solidAt(u.x, u.y)) { t.fx = u.x; t.fy = u.y; }
    u.z = Math.sin(k * Math.PI) * t.h; u.spin = t.t * 14 * t.dir;
    if (k >= 1) land(u);
    return;
  }
  const r = u.riding;
  if (!r || !r.alive || r.side !== u.side) return dismount(u);
  u.x = r.x; u.y = r.y + 0.5; u.face = r.face; u.z = r.def.r * 1.0 + (r.z || 0); u.moving = false;
  u.cd -= dt;
  if (u.cd > 0) return;
  const a = u.def.attack, reach = r.def.r + 26; let best = null, bd = 1e9;       // sword swings from the saddle
  world.forNear(r.x, r.y, reach + FO.maxR, o => {
    if (!o.alive || o.side === u.side || o.untargetable) return;
    const d = Math.hypot(o.x - r.x, o.y - r.y) - o.def.r;
    if (d < reach && d < bd) { bd = d; best = o; }
  });
  if (best) { FO.damage(best, a.dmg * 1.5, u, { direct: true }); u.cd = a.cd; u.swing = 0.22; }
};

/* ---------- ogre throw ---------- */
const canThrow = (u, o, p) => o !== u && o.alive && o.side === u.side && !o.carried && !o.under && !o.rider && !o.def.flying && !o.def.grid && o.def.r <= (p.maxR || 13);
FO.defineTrait('hurl', {
  label: 'Throws friends', desc: p => `Picks up a small friend standing nearby and throws it at the enemy every ${p.cd || 4}s. Hedgehogs hurt most`,
  onUpdate(u, dt, p) {
    const s = u.ts; s.hurl = (s.hurl == null ? 1 + Math.random() * 2 : s.hurl) - dt;
    if (s.hurl > 0 || u.stunned || world.mode !== 'running') return;
    // aim at its own target, or if that one is already in club range, at someone further back
    const lo = p.min || 110, hi = p.max || 430, inBand = o => { const q = Math.hypot(o.x - u.x, o.y - u.y); return q >= lo && q <= hi; };
    let tg = u.target && u.target.alive && !u.target.untargetable && inBand(u.target) ? u.target : null;
    if (!tg) { const c = world.units.filter(o => o.alive && o.side !== u.side && !o.untargetable && !o.under && inBand(o)); if (c.length) tg = FO.pick(c); }
    if (!tg) { s.hurl = 0.4; return; }
    const d = Math.hypot(tg.x - u.x, tg.y - u.y);
    let ammo = null, bd = 1e9;
    world.forNear(u.x, u.y, u.def.r + 70, o => {
      if (!canThrow(u, o, p)) return;
      const q = Math.hypot(o.x - u.x, o.y - u.y);
      if (q < u.def.r + 60 && q < bd) { bd = q; ammo = o; }
    });
    if (!ammo) { s.hurl = 0.5; return; }
    const id = ammo.def.id, spiky = ammo.def.traits.some(t => t.id === 'thorns');
    ammo.carried = true; ammo.untargetable = true; ammo.st.length = 0;
    ammo.thrown = { t: 0, dur: 0.45 + d / 650, x0: u.x, y0: u.y - u.def.r * 0.6, x1: tg.x, y1: tg.y, fx: ammo.x, fy: ammo.y, h: 50 + d * 0.22, dir: tg.x > u.x ? 1 : -1,
      dmg: (p.dmg || 22) + ammo.def.mass * 8 + (spiky ? 30 : 0), spiky, by: u };
    u.swing = 0.25; u.face = tg.x > u.x ? 1 : -1; s.hurl = p.cd || 4;
    fx.say(ammo, id === 'bryan' ? FO.pick(['AAAAAAH', 'Not agaaain', 'Wheee?']) : spiky ? 'Ow? No, YOU ow.' : FO.pick(['Wheee!', '!!!', 'Aaaah']));
    FO.emit('shoot', u, 'whoosh');
  },
});

/* ---------- cavalry ---------- */
FO.defineTrait('rider', {
  label: 'Rider', desc: p => `Climbs onto a friendly ${FO.units[p.mount].name} it touches. Rides until the ${FO.units[p.mount].name.toLowerCase()} falls, striking from the saddle and safe from harm`,
  onUpdate(u, dt, p) {
    if (world.mode !== 'running') return;
    const s = u.ts; s.mnt = (s.mnt || 0) - dt; if (s.mnt > 0) return; s.mnt = 0.3;
    let best = null, bd = 1e9;
    world.forNear(u.x, u.y, u.def.r + FO.maxR + 24, o => {
      if (!o.alive || o.side !== u.side || o.def.id !== p.mount || o.rider || o.carried) return;
      const d = Math.hypot(o.x - u.x, o.y - u.y) - o.def.r - u.def.r;
      if (d < 22 && d < bd) { bd = d; best = o; }
    });
    if (!best) return;
    best.rider = u; u.riding = best; u.carried = true; u.untargetable = true; u.size = 0.82; u.noFeet = true; u.st.length = 0; u.cd = 0.4;
    best.pop = 0.25; fx.say(u, FO.pick(['Giddy up!', 'Charge!', 'Onward!']));
  },
});
FO.defineTrait('steed', {
  label: 'Mount', desc: p => `With ${/^The /.test(FO.units[p.rider].name) ? FO.units[p.rider].name.toLowerCase() : 'a ' + FO.units[p.rider].name.toLowerCase()} on its back it moves faster and takes a quarter less damage`,
  onUpdate(u) { if (u.rider && u.rider.alive) u.speedMul *= 1.2; },
  onDamaged(u, amount) { return u.rider && u.rider.alive ? amount * 0.75 : amount; },
});
})();
