/* =====================================================================
   SVG WARS · effects
   Short-lived visuals (particles, rings, lightning, speech bubbles).
   Mechanics call FO.fx.*; render.js draws whatever is in world.fx.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world;
const MAX_FX = 1400;
const push = f => { if (world.fx.length < MAX_FX) world.fx.push(f); return f; };

const fx = FO.fx = {
  dots(x, y, color, n, speed, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = (speed || 100) * (0.35 + Math.random() * 0.65), life = 0.3 + Math.random() * 0.35;
      push({ kind: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: (size || 2) * (0.6 + Math.random() * 0.8), color, life, max: life });
    }
  },
  ring(x, y, r, color, width) { push({ kind: 'ring', x, y, r, color: color || '#1c1d22', w: width || 3, life: 0.32, max: 0.32 }); },
  slash(tg, nx, ny, color) {
    push({ kind: 'slash', x: tg.x - nx * tg.def.r * 0.5, y: tg.y - ny * tg.def.r * 0.5, a: Math.atan2(ny, nx), r: Math.max(8, tg.def.r * 0.9), color, life: 0.12, max: 0.12 });
  },
  tracer(x, y, x2, y2, color, w) { push({ kind: 'tracer', x, y, x2, y2, color: color || '#ffb000', w: w || 2.2, life: 0.14, max: 0.14 }); },
  bolt(x, y, x2, y2, color) {
    const pts = [[x, y]], n = Math.max(2, Math.round(Math.hypot(x2 - x, y2 - y) / 16));
    for (let i = 1; i < n; i++) pts.push([x + (x2 - x) * i / n + (Math.random() - 0.5) * 14, y + (y2 - y) * i / n + (Math.random() - 0.5) * 14]);
    pts.push([x2, y2]);
    push({ kind: 'bolt', pts, color: color || '#7c5cff', life: 0.2, max: 0.2 });
  },
  beam(a, b, color) { push({ kind: 'beam', a, b, color: color || '#27c26c', life: 0.3, max: 0.3 }); },
  text(x, y, str, color, size) { push({ kind: 'text', x, y, str, color: color || '#1c1d22', size: size || 13, life: 0.8, max: 0.8 }); },
  glyph(x, y, g, size, life) { push({ kind: 'glyph', x, y, g, size: size || 14, life: life || 0.7, max: life || 0.7 }); },
  ghost(u) { push({ kind: 'ghost', x: u.x, y: u.y, def: u.def, team: u.team, life: 0.35, max: 0.35 }); },
  say(u, text) {
    if (!text) return;
    let n = 0;
    for (const f of world.fx) if (f.kind === 'bubble') { if (f.u === u) return; n++; }
    if (n >= 6) return;
    push({ kind: 'bubble', u, text, life: 1.9, max: 1.9 });
  },
};

FO.updateFx = function (dt) {
  const list = world.fx;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    f.life -= dt;
    if (f.kind === 'dot') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
    else if (f.kind === 'text' || f.kind === 'glyph') f.y -= 26 * dt;
    else if (f.kind === 'bubble' && !f.u.alive) f.life = Math.min(f.life, 0.15);
    if (f.life <= 0) { list[i] = list[list.length - 1]; list.pop(); }
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 40);
};
FO.shake = amt => { world.shake = Math.min(14, Math.max(world.shake, amt)); };

/* ---------- reactions to game events ---------- */
const GENERIC_KILL = ['Ha!', 'Next!', 'Got one!', 'Too easy', 'Boop', 'Sorry!', 'Who’s next?'];
const GENERIC_START = ['Charge!', 'Let’s go!', 'For glory!', 'Uh oh', 'Aaaah!'];

FO.on('hit', (t, amount) => {
  if (amount >= 60) { fx.text(t.x, t.y - t.def.r - 6, String(Math.round(amount)), '#1c1d22', amount >= 150 ? 18 : 14); }
  if (amount >= 80) FO.shake(Math.min(8, amount / 30));
});

FO.on('death', (t, src, o) => {
  const team = FO.teams[t.team];
  if (!(o && o.quiet)) {
    fx.dots(t.x, t.y, team.color, Math.min(16, 5 + (t.def.r / 3) | 0), 140, 1.5 + t.def.r * 0.12);
    fx.ghost(t);
    if (FO.decal) FO.decal(t.x, t.y, t.def.r, team.color);
    if (t.def.r >= 20) FO.shake(4 + t.def.r / 8);
  }
  if (src && src.alive && src !== t) {
    const q = src.def.quips;
    if (FO.chance(q ? 0.05 : 0.012)) fx.say(src, FO.pick(q || GENERIC_KILL));
  }
});

FO.on('boom', (x, y, R, look) => {
  const colors = look === 'dirt' ? ['#c9a26b', '#8a6a3e', '#e6cf9f'] : look === 'ice' ? ['#bfe6ff', '#7cc4ff', '#ffffff'] : look === 'pie' ? ['#f6d7a8', '#d9534f', '#fff3d6']
    : look === 'heal' ? ['#9af0be', '#27c26c', '#ffffff'] : look === 'goo' ? ['#8fe36b', '#4bb543', '#d9ffc9'] : ['#ffd34d', '#ff8a2a', '#e8452c'];
  for (const c of colors) fx.dots(x, y, c, Math.min(14, 4 + R / 8), 80 + R * 2, 2 + R / 28);
  fx.ring(x, y, R, look === 'ice' ? '#4aa8f0' : look === 'heal' ? '#27c26c' : '#1c1d22', 3);
  if (look === 'fire' && FO.decal) FO.decal(x, y, R * 0.55, '#3a2a22', 'scorch');
  if (look !== 'heal') FO.shake(Math.min(10, R / 9));
});

FO.on('tile-hit', (x, y) => { fx.dots(x, y, '#d9a066', 2, 80, 2); if (FO.audio) FO.audio.play('hit'); });
FO.on('tile-broken', (x, y) => { fx.dots(x, y, '#b9793d', 6, 130, 2.8); fx.dots(x, y, '#5a3a1e', 3, 90, 2); if (FO.audio) FO.audio.play('thump'); });
FO.on('shot-blocked', (x, y) => fx.dots(x, y, '#666a75', 3, 90, 1.3));

FO.on('start', () => {
  const us = world.units.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(5, us.length); i++) {
    const u = us[i];
    if (FO.chance(0.6)) fx.say(u, FO.pick(u.def.quips || GENERIC_START));
  }
});
})();
