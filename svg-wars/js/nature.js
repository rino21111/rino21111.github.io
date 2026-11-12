/* =====================================================================
   SVG WARS · natures
   A nature is painted onto a fighter and decides where and when it
   fights. How it fights is still up to its own AI.
     aggressive   the default: goes looking for the enemy
     territorial  holds the ground it was placed on: fights whatever comes
                  within its territory (or within range, from inside it),
                  never leaves it, and walks home afterwards
     ambusher     stands still until an enemy is close or it is hurt, then
                  attacks for the rest of the battle. One going off sets
                  off the ambushers near it
     skittish     keeps away from enemies and fights only when caught or
                  cornered
     random       rolls one of the four above, fresh at the start of every
                  fight (the roll is u.natRoll; the fighter keeps 'random')
   Fighters with a mind of their own (FO.nature.applies) ignore natures.
   Passive natures can't stall a battle: if the field goes quiet, or 20
   seconds pass with nobody hurt, every nature is dropped and everyone
   fights. A territorial fighter being hurt by something it can't reach
   also gives up its post.
   The sim asks FO.nature.act(u, dt) before a fighter's AI: true means the
   nature has moved it this step and the AI is skipped.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, W = FO.W, H = FO.H, fx = () => FO.fx;
const OWN_MIND = { conway: 1, warren: 1, boid: 1, box: 1, vacuum: 1, burrower: 1 };
const TERRITORY = 130, FEAR = 170;

FO.natures = {}; FO.natureList = [];
const N = d => { FO.natures[d.id] = d; FO.natureList.push(d); };
// icon: a line drawing in a 24 × 24 box, used on the card and on the badge over a fighter
N({ id: 'aggressive', name: 'Aggressive', icon: 'M5 5L19 19M19 5L5 19M14 18L18 14M6 14L10 18',
  desc: 'How everyone starts: goes looking for the enemy and fights wherever it finds them. Paint it over fighters to clear another nature.' });
N({ id: 'territorial', name: 'Territorial', icon: 'M7 21V4L18 8L7 12',
  desc: 'Holds the ground it was placed on. It fights whatever comes into its territory, shoots from inside it, never leaves it, and walks back to its spot afterwards. Being hurt by something it can’t reach makes it give up the post.' });
N({ id: 'ambusher', name: 'Ambusher', icon: 'M3 12C7 6 17 6 21 12C17 18 7 18 3 12ZM14.5 12a2.5 2.5 0 1 0 -5 0a2.5 2.5 0 1 0 5 0',
  desc: 'Stands still until an enemy comes close or it gets hurt, then attacks for the rest of the battle. One ambusher going off sets off the others near it.' });
N({ id: 'skittish', name: 'Skittish', icon: 'M3 8H11M2 12H10M4 16H11M20.5 12a3.5 3.5 0 1 0 -7 0a3.5 3.5 0 1 0 7 0',
  desc: 'Keeps away from enemies and fights only when caught or cornered. If nobody is hurt for a while, it finds its nerve.' });

N({ id: 'random', name: 'Random', icon: 'M8.5 9a3.5 3.5 0 1 1 5.5 2.8c-1.3.9-2 1.7-2 3.2M12 18.6v.3',
  desc: 'Rolls one of the other four at the start of every fight, with equal odds. Press Again and the same army behaves differently.' });
const ROLLS = ['aggressive', 'territorial', 'ambusher', 'skittish'];

const kind = u => u.nature === 'random' ? u.natRoll : u.nature;      // what the fighter is actually being this fight
const active = u => u.nature && !u.natOff && !world.natureOff && IMPL[kind(u)];
const foe = (u, o) => o.alive && o.side !== u.side && !o.untargetable && !o.under;
let sprung = [];

function giveUp(u, why) {
  u.natOff = true;
  if (why !== 'quiet') fx().text(u.x, u.y - u.def.r - 6, '!', '#c8102e', 16);
}
// Walk to a spot, round walls if need be.
const HOME = { id: 'home', x: 0, y: 0 };
function walkTo(u, s, x, y, dt) {
  const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy);
  if (d < 12) { u.wantX = u.wantY = 0; return; }
  s.wpT = (s.wpT || 0) - dt;
  if (s.wpT <= 0) {
    s.wpT = 0.3;
    HOME.x = x; HOME.y = y;
    s.wp = u.def.flying || !world.navNeeded || world.walkClear(u.x, u.y, x, y, u.def.r * 0.9) ? null : world.waypointTo(u, HOME);
  }
  const p = s.wp || { x, y }, px = p.x - u.x, py = p.y - u.y, pd = Math.hypot(px, py) || 1;
  u.wantX = px / pd; u.wantY = py / pd;
  if (Math.abs(px) > 2) u.face = px > 0 ? 1 : -1;
}

const IMPL = {
  territorial(u, dt, s) {
    const a = u.def.attack, hx = u.hx, hy = u.hy;
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 0.25;
      const zone = s.zone = TERRITORY + (a.range ? a.range * FO.sightMul(u, a) * 0.95 : 0);
      let best = null, bd = Infinity;
      world.forNear(hx, hy, zone + FO.maxR, o => {
        if (!foe(u, o) || Math.hypot(o.x - hx, o.y - hy) > zone + o.def.r) return;
        const d = (o.x - u.x) ** 2 + (o.y - u.y) ** 2;
        if (d < bd) { bd = d; best = o; }
      });
      s.threat = best;
    }
    if (u.def.ai === 'support') return false;                      // healers heal; the leash keeps them home
    const th = s.threat;
    if (th && foe(u, th)) {
      s.prov = 0;
      const tg = u.target;
      if (!tg || !foe(u, tg) || Math.hypot(tg.x - hx, tg.y - hy) > s.zone + tg.def.r) { u.target = th; u.retT = 0.4; }
      return false;
    }
    // nobody in the territory: go home, unless something out of reach keeps hurting it
    if (u.hurtT != null && world.time - u.hurtT < 0.6) { s.prov = (s.prov || 0) + dt; if (s.prov > 2.5) { giveUp(u); return false; } }
    else if (s.prov > 0) s.prov = Math.max(0, s.prov - dt * 0.3);
    u.target = null;
    walkTo(u, s, hx, hy, dt);
    return true;
  },
  ambusher(u, dt, s) {
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 0.2;
      const a = u.def.attack, trig = Math.max(150, (a.range || 0) * FO.sightMul(u, a) * 0.85);
      let go = u.hurtT != null && world.time - u.hurtT < 0.5;
      if (!go) world.forNear(u.x, u.y, trig + FO.maxR, o => { if (foe(u, o) && Math.hypot(o.x - u.x, o.y - u.y) < trig + o.def.r) { go = true; return false; } });
      if (!go) for (const e of sprung) if (e.side === u.side && world.time - e.t > 0.15 && Math.hypot(e.x - u.x, e.y - u.y) < 170) { go = true; break; }
      if (go) { sprung.push({ x: u.x, y: u.y, side: u.side, t: world.time }); giveUp(u); return false; }
    }
    u.wantX = u.wantY = 0;
    return true;
  },
  skittish(u, dt, s) {
    if (s.fightT > 0) { s.fightT -= dt; return false; }
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 0.15;
      const r = u.def.r;
      let ax = 0, ay = 0, n = 0, close = null, cd = Infinity;
      world.forNear(u.x, u.y, FEAR + 80 + FO.maxR, o => {
        if (!foe(u, o) || o.def.peaceful) return;
        const d = Math.hypot(o.x - u.x, o.y - u.y) || 1;
        if (d > FEAR + (o.def.r >= 24 ? 80 : 0) + o.def.r) return;
        ax += (u.x - o.x) / d / (d * d); ay += (u.y - o.y) / d / (d * d); n++;
        if (d - o.def.r < cd) { cd = d - o.def.r; close = o; }
      });
      const src = u.lastSrc;                                       // shot from further off: run from the shooter
      if (!n && src && foe(u, src) && u.hurtT != null && world.time - u.hurtT < 1.5) { ax = u.x - src.x; ay = u.y - src.y; n = 1; }
      s.dir = null;
      const fight = () => { if (!close) return false; u.target = close; u.retT = 0.6; s.fightT = 0.8; return true; };
      if (n) {
        if (close && cd < r + 10 && fight()) return false;         // caught
        const base = Math.atan2(ay, ax), sg = s.sg || 1;
        for (const off of [0, 0.5 * sg, -0.5 * sg, 1.0 * sg, -1.0 * sg, 1.5 * sg, -1.5 * sg]) {
          const cx = Math.cos(base + off), cy = Math.sin(base + off), px = u.x + cx * 30, py = u.y + cy * 30;
          if (px < r + 2 || py < r + 2 || px > W - r - 2 || py > H - r - 2) continue;
          if (!u.def.flying) { const t = world.terrainAt(px, py); if (!world.fits(px, py, r * 0.9) || (t && t.hazard)) continue; }
          s.dir = [cx, cy]; if (off) s.sg = off > 0 ? 1 : -1;
          break;
        }
        if (!s.dir && fight()) return false;                       // cornered
      }
    }
    if (s.dir) { u.wantX = s.dir[0]; u.wantY = s.dir[1]; if (Math.abs(s.dir[0]) > 0.1) u.face = s.dir[0] > 0 ? 1 : -1; return true; }
    return u.def.ai !== 'support';                                 // a skittish medic still heals when nothing is near
  },
};

FO.nature = {
  TERRITORY,
  applies: def => !OWN_MIND[def.ai] && def.speed > 0,
  // Give a fighter a nature (or 'aggressive' / nothing to clear it). Returns false if this fighter ignores natures.
  set(u, id) {
    if (!id || id === 'aggressive') { if (!u.nature) return true; delete u.nature; }
    else { if (!FO.natures[id] || !FO.nature.applies(u.def)) return false; u.nature = id; }
    u.hx = u.x; u.hy = u.y; u.natOff = false; if (u.ts) u.ts.nat = null;
    u.natRoll = u.nature === 'random' && world.mode !== 'edit' ? FO.pick(ROLLS) : null;      // painted on mid-fight: roll now
    return true;
  },
  act(u, dt) {
    if (!active(u)) return false;
    if (u.hx == null) { u.hx = u.x; u.hy = u.y; }
    if (u.st.length && u.st.some(q => q.id === 'fear')) return false;
    return IMPL[kind(u)](u, dt, u.ts.nat || (u.ts.nat = { t: Math.random() * 0.2 }));
  },
  // After the AI has decided where to go: a territorial fighter never walks out of its territory.
  after(u) {
    if (kind(u) !== 'territorial' || !active(u)) return;
    const dx = u.x - u.hx, dy = u.y - u.hy, d = Math.hypot(dx, dy);
    if (d <= TERRITORY) return;
    const ox = dx / d, oy = dy / d, out = u.wantX * ox + u.wantY * oy, k = Math.min(1, (d - TERRITORY) / 30);
    if (out > 0) { u.wantX -= ox * out; u.wantY -= oy * out; }
    u.wantX -= ox * k; u.wantY -= oy * k;
  },
  // The territory a fighter may pick targets in (0 = anywhere). Used by the target chooser in tactics.js.
  zone: u => (kind(u) === 'territorial' && active(u) && u.ts.nat && u.ts.nat.zone) || 0,
  kind,
  threat: u => (u.ts.nat && u.ts.nat.threat) || null,
  // Everyone drops their nature and fights. Called when a battle has gone quiet.
  breakAll() {
    if (world.natureOff) return false;
    let n = 0;
    for (const u of world.units) if (u.alive && active(u)) { if (n++ < 40) fx().text(u.x, u.y - u.def.r - 6, '!', '#c8102e', 16); }
    world.natureOff = true;
    return n > 0;
  },
  tick() {
    if (world.natureOff) return;
    if (sprung.length && world.time - sprung[0].t > 1.5) sprung.shift();
    if (world.time - world.lastDamageT > 20) FO.nature.breakAll();
  },
};
const fresh = () => { world.natureOff = false; sprung = []; for (const u of world.units) { u.hx = u.x; u.hy = u.y; u.natOff = false; u.natRoll = null; } };
FO.on('start', () => { fresh(); for (const u of world.units) if (u.nature === 'random') u.natRoll = FO.pick(ROLLS); });
FO.on('reset', fresh);
})();
