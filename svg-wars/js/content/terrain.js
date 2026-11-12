/* =====================================================================
   SVG WARS · terrain
   Each entry is a paintable tile type.
     solid      blocks movement
     blockShot  'hard' stops every shot, 'cover' only stops shots passing through
     speedMul   how fast ground units move across it
     navCost    how much pathfinding dislikes it (1 = normal ground)
     hazard     units route around it instead of walking straight through
     highGround units on it see 30% further and take 25% less from attackers below
     lowGround  the reverse: units in it see 20% less far and deal 25% less to anyone above; water pours in
     slick      slippery: hard to turn, and knockback sends you sliding
     breakable  (use with solid) explosions destroy it and giants walk through it
     raised / sunken   draws a lip so the blob reads as higher or lower ground
     onStand    called every step for each ground unit standing on it
     color/edge/shadow   how the blob is filled, outlined and lifted
     detail(g, x, y, T, rnd)   optional decoration per tile
     canopy(g, x, y, T, rnd, stamp)   optional decoration drawn above units; with canopyStamp { n, w, h, ax, ay, draw(g, v) }
                                      it places pre-drawn pictures by calling stamp(v, x, y)
     hidden     not offered in the toybox (things terrain turns into, like cooled rock)
   How it reacts (see js/reactions.js):
     flammable, burnTime, burnsTo   catches fire, burns this many seconds, leaves this terrain (or bare ground)
     meltsTo    what heat turns it into          freezesTo  what cold turns it into
     conducts   lightning spreads through it     floodable  spilling water can cover it
     spans      a bridge: water filling a pit carries on underneath it
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO;

FO.defineTerrain({
  id: 'wall', name: 'Wall', desc: 'Blocks walking and shots. Flyers go over, lobbed things arc over.',
  solid: true, blockShot: 'hard', color: '#2e3039', edge: '#17181c', shadow: true,
  detail(g, x, y, T, rnd) {
    g.fillStyle = 'rgba(255,255,255,.07)';
    g.fillRect(x + 2 + rnd() * 6, y + 3 + rnd() * 3, 6 + rnd() * 5, 2.5);
    g.fillRect(x + 4 + rnd() * 8, y + 11 + rnd() * 3, 5 + rnd() * 4, 2.5);
  },
});

FO.defineTerrain({
  id: 'water', name: 'Water', desc: 'Slows anyone wading through, and puts out fires. Lightning shocks everyone standing in it, cold freezes it, and it pours into pits and through broken barricades.',
  speedMul: 0.5, navCost: 2, freezesTo: 'ice', conducts: true, color: '#9bd4ff', edge: '#3d8fd6',
  onStand(u) { if (u.st.length && FO.hasStatus(u, 'burn')) FO.clearStatus(u, 'burn'); },
  detail(g, x, y, T, rnd) {
    if (rnd() > 0.45) return;
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; g.lineCap = 'round';
    const px = x + 3 + rnd() * 6, py = y + 5 + rnd() * 10;
    g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + 3, py - 3, px + 6, py); g.quadraticCurveTo(px + 9, py + 3, px + 12, py); g.stroke();
  },
});

FO.defineTerrain({
  id: 'lava', name: 'Lava', desc: 'Burns whatever stands in it. Units walk around it when they can. Sets nearby woods alight, and hardens into rock where water or cold touches it.',
  speedMul: 0.7, navCost: 14, hazard: true, freezesTo: 'rock', color: '#ff7a1a', edge: '#7a2a10',
  onStand(u, dt) {
    FO.applyStatus(u, 'burn', 2.5, null);
    FO.damage(u, 22 * dt, null, { pure: true, quiet: true, kind: 'burn' });
  },
  detail(g, x, y, T, rnd) {
    g.fillStyle = '#ffc93c';
    g.beginPath(); g.arc(x + 4 + rnd() * 12, y + 4 + rnd() * 12, 2 + rnd() * 3.5, 0, 6.29); g.fill();
    if (rnd() > 0.6) { g.fillStyle = '#fff1a8'; g.beginPath(); g.arc(x + 4 + rnd() * 12, y + 4 + rnd() * 12, 1.5, 0, 6.29); g.fill(); }
  },
});

FO.defineTerrain({
  id: 'trees', name: 'Trees', desc: 'Cover, and slow going. Shots can’t pass through a wood, though fighters at its edge can still be hit. Burns.',
  speedMul: 0.6, navCost: 1.6, flammable: true, burnTime: 5, blockShot: 'cover', color: '#8c9f78', edge: '#5a6c4a',
  // A tree per tile, seen from slightly above, back to front so nearer trees overlap the ones behind. There are
  // eight kinds (two of them pines); each is drawn once into a small picture and stamped wherever it is needed,
  // which keeps big woods cheap to repaint. Now and then a tile is left as a clearing.
  canopyStamp: {
    n: 8, w: 44, h: 56, ax: 22, ay: 34,           // picture size in world units, and where the tile centre sits in it
    draw(g, v) {
      const cx = 0, cy = -4, r = 7.5 + (v % 4), pine = v >= 6, shade = v % 2;
      const INK = '#1c1d22', DARK = shade ? '#3d7443' : '#447c4a', MID = shade ? '#4f9152' : '#58975b', LIGHT = '#6dae65';
      g.fillStyle = 'rgba(28,29,34,.2)'; g.beginPath(); g.ellipse(cx + 2.5, cy + r * 1.25, r * 0.95, r * 0.32, 0, 0, 6.29); g.fill();
      g.fillStyle = INK; g.beginPath(); g.roundRect(cx - 2.8, cy + r * 0.3, 5.6, r * 0.95 + 1.4, 1.5); g.fill();
      g.fillStyle = '#7a5434'; g.fillRect(cx - 1.4, cy + r * 0.3, 2.8, r * 0.95);
      g.lineJoin = 'round';
      if (pine) {
        const tiers = [[r * 1.0, cy - r * 0.2, cy + r * 0.62], [r * 0.78, cy - r * 0.85, cy + r * 0.1], [r * 0.52, cy - r * 1.45, cy - r * 0.45]];
        for (const [w, top, bot] of tiers) {
          g.beginPath(); g.moveTo(cx - w, bot); g.lineTo(cx, top); g.lineTo(cx + w, bot); g.closePath();
          g.fillStyle = DARK; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
          g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.moveTo(cx, top + 1.5); g.lineTo(cx - w * 0.55, bot - 1); g.lineTo(cx - w * 0.12, bot - 1); g.closePath(); g.fill();
        }
        return;
      }
      const puffs = [[0, 0, 1], [-0.6, 0.2, 0.68], [0.6, 0.16, 0.7], [0.04, -0.52, 0.66]];
      const crown = (grow, lift, k) => { g.beginPath(); for (const [dx, dy, s] of puffs) { const px = cx + dx * r, py = cy + dy * r - s * r * lift, rr = s * r * k + grow; g.moveTo(px + rr, py); g.arc(px, py, rr, 0, 6.29); } g.fill(); };
      g.fillStyle = INK; crown(1.4, 0, 1);
      g.fillStyle = DARK; crown(0, 0, 1);
      g.fillStyle = MID; crown(0, 0.16, 0.8);
      g.fillStyle = LIGHT; g.beginPath();
      for (const [dx, dy, s] of puffs) { const px = cx + dx * r - s * r * 0.25, py = cy + dy * r - s * r * 0.38, rr = s * r * 0.3; g.moveTo(px + rr, py); g.arc(px, py, rr, 0, 6.29); }
      g.fill();
    },
  },
  canopy(g, x, y, T, rnd, stamp) {
    const jx = (rnd() - 0.5) * 6, jy = (rnd() - 0.5) * 5, v = Math.floor(rnd() * 8);
    if (rnd() < 0.12) return;
    stamp(v, x + T / 2 + jx, y + T / 2 + jy);
  },
});

FO.defineTerrain({
  id: 'mud', name: 'Mud', desc: 'Sticky. Everyone on foot slows to a trudge.',
  speedMul: 0.5, navCost: 2, floodable: true, color: '#cfa77e', edge: '#8f6a45',
  detail(g, x, y, T, rnd) {
    g.fillStyle = 'rgba(120,84,50,.45)';
    g.beginPath(); g.ellipse(x + 4 + rnd() * 12, y + 4 + rnd() * 12, 2 + rnd() * 3, 1.5 + rnd() * 1.5, 0, 0, 6.29); g.fill();
  },
});

FO.defineTerrain({
  id: 'hill', name: 'Hill', desc: 'High ground. Fighters up here see 30% further and take a quarter less damage from anyone attacking from below.',
  highGround: true, speedMul: 0.85, navCost: 1.4, color: '#c9c08e', edge: '#7f7648', shadow: true, raised: true,
  detail(g, x, y, T, rnd) {
    if (rnd() > 0.4) return;
    g.strokeStyle = 'rgba(110,100,60,.4)'; g.lineWidth = 1.4; g.lineCap = 'round';
    const px = x + 3 + rnd() * 8, py = y + 6 + rnd() * 9;
    g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + 4, py - 4, px + 9, py - 1); g.stroke();
  },
});

FO.defineTerrain({
  id: 'road', name: 'Road', desc: 'Packed earth, a little quicker underfoot, and fighters finding their way round obstacles prefer it. Laid across water or a pit it is a bridge: a flood runs underneath and leaves it dry.',
  speedMul: 1.15, navCost: 0.8, spans: true, color: '#d9d2c0', edge: '#a39a84',
  detail(g, x, y, T, rnd) {
    if (rnd() > 0.3) return;
    g.fillStyle = 'rgba(120,108,84,.4)';
    g.beginPath(); g.arc(x + 3 + rnd() * 14, y + 3 + rnd() * 14, 0.9 + rnd() * 0.9, 0, 6.29); g.fill();
  },
});

FO.defineTerrain({
  id: 'ice', name: 'Ice', desc: 'Fast but slippery. Nobody can turn quickly, and a shove sends fighters sliding a long way. Melts into water near fire.',
  slick: true, speedMul: 1.2, meltsTo: 'water', color: '#e3f4fb', edge: '#86c3e0',
  detail(g, x, y, T, rnd) {
    if (rnd() > 0.5) return;
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 1.6; g.lineCap = 'round';
    const px = x + 3 + rnd() * 9, py = y + 5 + rnd() * 9, l = 4 + rnd() * 5;
    g.beginPath(); g.moveTo(px, py + l * 0.6); g.lineTo(px + l, py); g.stroke();
    if (rnd() > 0.6) { g.strokeStyle = 'rgba(120,180,215,.5)'; g.beginPath(); g.moveTo(px + 2, py + l); g.lineTo(px + l * 0.8, py + l * 0.5); g.stroke(); }
  },
});

FO.defineTerrain({
  id: 'pit', name: 'Pit', desc: 'Low ground, the opposite of a hill. Slow to cross, and fighters down here see a fifth less far and deal a quarter less damage to anyone above them. Water next to it pours in and fills it.',
  lowGround: true, speedMul: 0.6, navCost: 2.2, floodable: true, color: '#7b6850', edge: '#3f3225', sunken: true,
  detail(g, x, y, T, rnd) {
    if (rnd() > 0.4) return;
    g.fillStyle = 'rgba(40,28,16,.28)';
    g.beginPath(); g.ellipse(x + 4 + rnd() * 12, y + 7 + rnd() * 10, 1.6 + rnd() * 2, 1.2 + rnd() * 1.2, 0, 0, 6.29); g.fill();
  },
});

FO.defineTerrain({
  id: 'barricade', name: 'Barricade', desc: 'Blocks walking and shots like a wall, but it doesn’t last. Fighters with no other way through hack it down, explosions blow it apart, and anything huge walks straight through. It burns, and if it was holding water back, the water spills out.',
  solid: true, blockShot: 'hard', breakable: true, flammable: true, burnTime: 6, color: '#b9793d', edge: '#4f3219', shadow: true,
  // Wooden planks: three boards per tile in slightly different shades, a seam between each, a streak of grain
  // and a nail at each end. The boards run the same way the barricade does.
  detail(g, x, y, T, rnd) {
    const w = window.FO.world, tx = Math.round(x / T), ty = Math.round(y / T), me = w.tiles[ty * w.TC + tx];
    const at = (dx, dy) => { const X = tx + dx, Y = ty + dy; return X >= 0 && Y >= 0 && X < w.TC && Y < w.TR && w.tiles[Y * w.TC + X] === me; };
    const upright = (at(0, -1) || at(0, 1)) && !(at(-1, 0) || at(1, 0));
    g.save();
    if (upright) { g.translate(x + T, y); g.rotate(Math.PI / 2); x = 0; y = 0; }      // draw as if horizontal, turned a quarter
    const h = T / 3;
    for (let i = 0; i < 3; i++) {
      const py = y + i * h, tone = rnd();
      g.fillStyle = tone < 0.33 ? 'rgba(255,230,190,.16)' : tone < 0.66 ? 'rgba(0,0,0,0)' : 'rgba(79,50,25,.14)';
      g.fillRect(x, py, T, h);
      g.strokeStyle = 'rgba(110,68,32,.45)'; g.lineWidth = 0.7; g.lineCap = 'round';           // grain
      const gx = x + 3 + rnd() * (T - 10), gl = 4 + rnd() * 6;
      g.beginPath(); g.moveTo(gx, py + h * 0.5); g.lineTo(gx + gl, py + h * 0.5 + (rnd() - 0.5) * 0.8); g.stroke();
      g.fillStyle = 'rgba(40,24,10,.75)';                                                       // nails
      for (const nx of [x + 2.4, x + T - 2.4]) { g.beginPath(); g.arc(nx, py + h * 0.5, 0.75, 0, 6.29); g.fill(); }
    }
    g.strokeStyle = 'rgba(79,50,25,.8)'; g.lineWidth = 1;                                       // seams between boards
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + T, y + h); g.moveTo(x, y + 2 * h); g.lineTo(x + T, y + 2 * h); g.stroke();
    if (rnd() < 0.35) {                                                                          // a board end, here and there
      const bx = x + 5 + rnd() * (T - 10), row = Math.floor(rnd() * 3) * h;
      g.beginPath(); g.moveTo(bx, y + row + 0.5); g.lineTo(bx, y + row + h - 0.5); g.stroke();
    }
    g.restore();
  },
});

// Lava that has cooled. Not paintable.
FO.defineTerrain({
  id: 'rock', name: 'Cooled rock', desc: 'Lava that met water or cold. Safe to walk on.', hidden: true,
  color: '#4a4650', edge: '#26232b',
  detail(g, x, y, T, rnd) {
    g.strokeStyle = 'rgba(255,122,26,.55)'; g.lineWidth = 1; g.lineCap = 'round';            // cracks still glowing
    const px = x + 3 + rnd() * 8, py = y + 4 + rnd() * 10;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + 4 + rnd() * 3, py + (rnd() - 0.5) * 6); g.lineTo(px + 9 + rnd() * 3, py + (rnd() - 0.5) * 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 2 + rnd() * 10, y + 2 + rnd() * 12, 5, 1.6);
  },
});
// What Medusa leaves behind: one tile of stone where a fighter stood. Blocks like a wall, but can be smashed like a barricade.
FO.defineTerrain({
  id: 'statue', name: 'Statue', desc: 'Someone who looked at Medusa. Blocks walking and shots until it is smashed.', hidden: true,
  solid: true, blockShot: 'hard', breakable: true, color: '#a4a8b6', edge: '#565a69', shadow: true,
  detail(g, x, y, T) {
    g.fillStyle = 'rgba(40,44,60,.55)';
    g.beginPath(); g.arc(x + T * 0.34, y + T * 0.42, 1.5, 0, 6.29); g.arc(x + T * 0.66, y + T * 0.42, 1.5, 0, 6.29); g.fill();
    g.strokeStyle = 'rgba(40,44,60,.55)'; g.lineWidth = 1.3; g.lineCap = 'round';
    g.beginPath(); g.arc(x + T * 0.5, y + T * 0.66, 2.6, 0.2, Math.PI - 0.2, true); g.stroke();
  },
});

})();
