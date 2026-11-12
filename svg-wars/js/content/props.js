/* =====================================================================
   SVG WARS · props content
   Banana peel, bear trap, explosive barrel. See js/props.js
   for every field. Art is drawn in a 100 × 100 box, seen from above.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, fx = FO.fx;
const svg = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200"><g stroke="#1c1d22" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;

const teeth = (() => {
  let d = '';
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, b = a + 0.22;
    const p = (r, t) => `${(50 + r * Math.cos(t)).toFixed(1)} ${(50 + r * Math.sin(t)).toFixed(1)}`;
    d += `M${p(31, a - 0.22)} L${p(20, a)} L${p(31, b)} Z `;
  }
  return d;
})();

FO.defineProp({
  id: 'banana', name: 'Banana Peel', r: 11, artScale: 2.8,
  desc: 'The first fighter to step on it slips: a long slide in whatever direction it was going, and a moment flat on its back. Lethal next to lava.',
  art: svg(`
    <path d="M50 62 C38 52 20 54 8 68 C24 64 36 68 46 72 Z" fill="#ffd84d"/>
    <path d="M50 62 C62 52 80 54 92 68 C76 64 64 68 54 72 Z" fill="#ffd84d"/>
    <path d="M48 64 C40 48 42 30 52 20 C56 34 58 50 56 66 Z" fill="#ffe680"/>
    <ellipse cx="50" cy="66" rx="13" ry="9" fill="#fff1b3"/>
    <path d="M52 20 L56 11" stroke-width="5"/>
    <g stroke="none" fill="#7a5236"><circle cx="10" cy="67" r="3"/><circle cx="90" cy="67" r="3"/></g>`),
  onTouch(p, u) {
    const sp = Math.hypot(u.vx, u.vy);
    if (sp < 15) return;
    const k = 470 / Math.sqrt(u.def.mass);
    u.kx += u.vx / sp * k; u.ky += u.vy / sp * k;
    FO.applyStatus(u, 'stun', 0.9, null);
    u.slipT = 0.9; if (world.slipping.indexOf(u) < 0) world.slipping.push(u);
    p.dead = true;
    fx.text(u.x, u.y - u.def.r - 6, FO.pick(['whoa!', 'woah', 'yikes']), '#1c1d22', 13);
    fx.dots(p.x, p.y, '#ffd84d', 5, 80, 2);
    if (FO.audio) FO.audio.play('whoosh');
  },
});

FO.defineProp({
  id: 'beartrap', name: 'Bear Trap', r: 14, artScale: 2.5,
  desc: 'Snaps shut on whoever steps in it: a nasty bite, and they can’t move for a few seconds, though they can still swing. Works on giants too.',
  art: svg(`
    <path d="M86 50 H97" stroke-width="5"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke-width="13"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke="#a3abb5" stroke-width="7"/>
    <path d="${teeth}" fill="#d7dce2" stroke-width="2.2"/>
    <circle cx="50" cy="50" r="11" fill="#c9a26b"/>`),
  artSpent: svg(`
    <path d="M86 50 H97" stroke-width="5"/>
    <path d="M12 50 Q50 26 88 50 Q50 74 12 50 Z" fill="#a3abb5"/>
    <path d="M18 50 L24 44 L30 50 L36 44 L42 50 L48 44 L54 50 L60 44 L66 50 L72 44 L78 50 L84 50" fill="none" stroke-width="2.5"/>
    <path d="M18 50 L24 56 L30 50 L36 56 L42 50 L48 56 L54 50 L60 56 L66 50 L72 56 L78 50" fill="none" stroke-width="2.5"/>`),
  onTouch(p, u, nx, ny) {
    if (Math.hypot(u.x - p.x, u.y - p.y) > p.def.r * 0.8 + u.def.r * 0.4) return;
    p.spent = true;
    u.x = p.x; u.y = p.y;
    FO.damage(u, 35, null, { pure: true });
    if (u.alive) FO.applyStatus(u, 'rooted', 3.5, null);
    fx.text(u.x, u.y - u.def.r - 8, 'SNAP!', '#c8102e', 15); FO.shake(3);
    if (FO.audio) FO.audio.play('thump');
  },
});

FO.defineProp({
  id: 'barrel', name: 'Explosive Barrel', r: 14, solid: true, hp: 30, shotStop: true, flammable: true, artScale: 2.6,
  desc: 'Blocks the way and catches stray shots. Shoot it, burn it or blow it up and it explodes, hitting everyone nearby on both sides and setting off any barrels close by.',
  art: svg(`
    <ellipse cx="50" cy="50" rx="36" ry="36" fill="#d6453a"/>
    <ellipse cx="50" cy="50" rx="26" ry="26" fill="none" stroke-width="4"/>
    <ellipse cx="50" cy="50" rx="36" ry="36" fill="none" stroke="#a8322a" stroke-width="3" opacity=".6"/>
    <path d="M50 32 L66 60 H34 Z" fill="#ffd43b" stroke-width="3"/>
    <path d="M50 41 V51" stroke-width="3.5"/><circle cx="50" cy="56" r="2" fill="#1c1d22" stroke="none"/>
    <circle cx="66" cy="28" r="5" fill="#a8322a" stroke-width="2.5"/>`),
  onDestroy(p) { if (p.fuse == null) p.fuse = 0.12 + Math.random() * 0.12; },
  update(p, dt) {
    if (p.fuse == null) return;
    p.fuse -= dt;
    if (p.fuse > 0) return;
    p.dead = true;
    FO.explode(p.x, p.y, 80, 110, null, null, { knock: 400, look: 'fire', inflict: ['burn', 2] });
  },
});

})();
