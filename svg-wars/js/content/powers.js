/* =====================================================================
   SVG WARS · powers
   Things you can drop on the battlefield by hand during a fight.
   cast(x, y) runs once per click.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, fx = FO.fx;

FO.definePower({
  id: 'meteor', name: 'Meteor', icon: '☄️', radius: 95,
  desc: 'A rock from the sky. Hits everyone under it, on every team, and sets them alight.',
  cast(x, y) {
    FO.shoot({ look: 'glyph', glyph: '☄️', size: 34, x: x + 260, y: y - 80, vx: 0, vy: 0, life: 0.5, dmg: 170, side: null, src: null,
      splash: 95, knock: 520, inflict: ['burn', 3], air: true, lob: { x1: x, y1: y, dur: 0.5, h: 230 } });
  },
});

FO.definePower({
  id: 'lightning', name: 'Lightning', icon: '⚡', radius: 58,
  desc: 'Strikes up to six fighters closest to where you click. Aim at water and everyone standing in it gets a shock.',
  cast(x, y) {
    const near = [];
    world.forNear(x, y, 58 + FO.maxR, u => { if (u.alive) { const d = Math.hypot(u.x - x, u.y - y); if (d < 58 + u.def.r) near.push([d, u]); } });
    near.sort((a, b) => a[0] - b[0]);
    if (!near.length) fx.bolt(x + FO.rand(-30, 30), y - 420, x, y, '#ffd21f');
    near.slice(0, 6).forEach(([, u]) => {
      fx.bolt(u.x + FO.rand(-40, 40), u.y - 420, u.x, u.y, '#ffd21f');
      FO.damage(u, 130, null, { pure: true });
      if (u.alive) FO.applyStatus(u, 'stun', 0.8, null);
      if (FO.react) FO.react.heat(u.x, u.y, 0);
    });
    if (FO.react) { FO.react.shock(x, y, 70, null, near.slice(0, 6).map(n => n[1])); if (!near.length) FO.react.heat(x, y, 0); }
    fx.ring(x, y, 58, '#f2a900'); FO.shake(6); FO.emit('zap');
  },
});

FO.definePower({
  id: 'freeze', name: 'Deep Freeze', icon: '❄️', radius: 110,
  desc: 'Freezes everyone in the circle solid for a few seconds. Water freezes over, lava hardens and fires go out.',
  cast(x, y) {
    world.forNear(x, y, 110 + FO.maxR, u => { if (u.alive && Math.hypot(u.x - x, u.y - y) < 110 + u.def.r) { FO.clearStatus(u, 'burn'); FO.applyStatus(u, 'frozen', 3.5, null); } });
    if (FO.react) FO.react.chill(x, y, 110);
    FO.emit('boom', x, y, 110, 'ice');
  },
});

FO.definePower({
  id: 'mend', name: 'Group Hug', icon: '💚', radius: 110,
  desc: 'Heals everyone in the circle and clears fire and poison.',
  cast(x, y) {
    world.forNear(x, y, 110 + FO.maxR, u => {
      if (!u.alive || Math.hypot(u.x - x, u.y - y) > 110 + u.def.r) return;
      FO.heal(u, u.maxHp * 0.6 + 30); FO.clearStatus(u, 'burn'); FO.clearStatus(u, 'poison');
    });
    FO.emit('boom', x, y, 110, 'heal'); FO.emit('heal');
  },
});
})();
