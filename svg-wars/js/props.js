/* =====================================================================
   SVG WARS · props
   Single objects placed on the field (banana peels, barrels, traps).
   Unlike terrain they are placed one per click, can be used
   up or destroyed, and react to fighters, shots and explosions.
   FO.defineProp({
     id, name, desc, r, art (svg string), artSpent (optional), artScale,
     solid      fighters can't walk through it
     mass       0 = never moves; otherwise how hard it is to shove
     hp         0 = indestructible
     shotStop   flat shots hit it instead of flying past
     flammable  fire breath damages it
     onTouch(p, u, nx, ny)   a ground fighter stepped on it
     update(p, dt)           every step during a battle
     onDestroy(p)            its health ran out
   })
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, W = FO.W, H = FO.H;

FO.props = {}; FO.propList = [];
FO.defineProp = function (d) {
  const p = Object.assign({ r: 10, solid: false, mass: 0, hp: 0, shotStop: false, flammable: false, artScale: 2.4 }, d);
  FO.props[p.id] = p; FO.propList.push(p);
  return p;
};

world.props = [];
world.slipping = [];
let nextPid = 1;

FO.placeProp = function (id, x, y) {
  const def = FO.props[id]; if (!def) return null;
  const p = { pid: nextPid++, def, x, y, hp: def.hp, vx: 0, vy: 0, rot: def.mass ? Math.random() * 6.28 : 0, spent: false, t: 0, hitAt: {}, flash: 0, fuse: null };
  world.props.push(p);
  return p;
};
FO.canPlaceProp = (def, x, y) =>
  x > def.r && y > def.r && x < W - def.r && y < H - def.r && world.fits(x, y, def.r * 0.8) &&
  !world.props.some(p => !p.dead && Math.hypot(p.x - x, p.y - y) < p.def.r + def.r + 2);

FO.damageProp = function (p, amount) {
  if (p.dead || !p.def.hp || p.fuse != null) return;
  p.hp -= amount; p.flash = 0.12;
  if (p.hp <= 0) { if (p.def.onDestroy) p.def.onDestroy(p); else p.dead = true; }
};
FO.pushProp = function (p, nx, ny, v) { if (p.def.mass && !p.dead) { p.vx += nx * v; p.vy += ny * v; } };

// Explosions damage and shove props.
FO.propsBlast = function (x, y, R, dmg, o) {
  for (const p of world.props) {
    if (p.dead) continue;
    const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
    if (d > R + p.def.r) continue;
    const k = 1 - 0.5 * Math.min(1, d / R);
    FO.damageProp(p, dmg * k);
    FO.pushProp(p, dx / d, dy / d, ((o && o.knock) || 200) * 0.8 * k);
  }
};
// Does this projectile hit a prop? Returns the prop it hit.
FO.propShot = function (s) {
  for (const p of world.props) {
    if (p.dead) continue;
    const def = p.def, fire = s.look === 'puff' && def.flammable;
    if (s.air ? !fire : !(def.shotStop || fire)) continue;
    if (Math.hypot(p.x - s.x, p.y - s.y) < def.r + (s.rad || 2)) {
      FO.damageProp(p, s.dmg);
      if (def.mass) { const sp = Math.hypot(s.vx, s.vy) || 1; FO.pushProp(p, s.vx / sp, s.vy / sp, 20); }
      return p;
    }
  }
  return null;
};

FO.updateProps = function (dt) {
  // fighters spinning after a slip
  if (world.slipping.length) {
    for (const u of world.slipping) { u.slipT -= dt; u.spin = u.slipT > 0 ? (1 - u.slipT / 0.9) * 12.57 : 0; }
    world.slipping = world.slipping.filter(u => u.slipT > 0 && u.alive);
  }
  const ps = world.props;
  if (!ps.length) return;
  for (const p of ps) {
    if (p.dead) continue;
    const def = p.def, R = def.r;
    p.t += dt; if (p.flash > 0) p.flash -= dt;
    if (def.update) { def.update(p, dt); if (p.dead) continue; }
    world.forNear(p.x, p.y, R + FO.maxR, u => {
      if (!u.alive || u.def.flying || u.under || p.dead) return;
      const dx = u.x - p.x, dy = u.y - p.y, d = Math.hypot(dx, dy) || 0.01, nx = dx / d, ny = dy / d;
      if (def.onTouch && !p.spent && d < u.def.r * 0.5 + R * 0.7) def.onTouch(p, u, nx, ny);
      if (!def.solid || p.dead) return;
      const ov = u.def.r + R - d;
      if (ov <= 0) return;
      if (def.mass) {                     // movable: hit it hard, or lean on it with something heavy, and it shifts
        const kin = -(u.kx * nx + u.ky * ny);
        if (kin > 40) FO.pushProp(p, -nx, -ny, kin * u.def.mass / def.mass * 1.6);
        if (u.def.mass >= 5) { const vin = -(u.vx * nx + u.vy * ny); if (vin > 10) FO.pushProp(p, -nx, -ny, vin * u.def.mass / def.mass * dt * 6); }
      }
      u.x += nx * ov; u.y += ny * ov;
      const vn = u.kx * nx + u.ky * ny; if (vn < 0) { u.kx -= vn * nx * 1.3; u.ky -= vn * ny * 1.3; }
    });
  }
  if (ps.some(p => p.dead)) world.props = ps.filter(p => !p.dead);
};

FO.defineStatus('rooted', {
  name: 'Trapped', color: 'rgba(110,115,125,.35)', speedMul: 0,
  tick(u) { u.kx = 0; u.ky = 0; },
});
})();
