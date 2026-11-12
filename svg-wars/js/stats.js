/* =====================================================================
   SVG WARS · stats
   Keeps the battle's record book: a timeline of fighters left, running
   totals, and the moments worth an award. The results panel in ui.js
   reads it all from world.stats / world.typeStats when the battle ends.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world;
const blank = () => ({ dmg: 0, healed: 0, shots: 0, born: 0, first: null, bigHit: null, samples: [], every: 0.5, nextT: 0 });
world.stats = blank();

const who = u => ({ def: u.def, team: u.team });
const typeOf = u => { const id = FO.kindOf(u); return world.typeStats[id] || (world.typeStats[id] = { def: FO.units[id] || u.def, team: u.team, start: 0, kills: 0 }); };
function sample() {
  const c = FO.teams.map(() => 0), p = FO.teams.map(() => 0), k = {};     // head count and points still standing, per team and per kind
  for (const u of world.units) if (u.alive) {
    c[u.team]++; p[u.team] += u.def.cost || 0;
    const id = FO.kindOf(u), e = k[id] || (k[id] = [0, 0]); e[0]++; e[1] += u.def.cost || 0;
  }
  const s = world.stats; s.samples.push({ t: world.time, c, p, k });
  if (s.samples.length > 240) { s.samples = s.samples.filter((_, i) => i % 2 === 0); s.every *= 2; }
}

FO.stats = {
  reset() { world.stats = blank(); for (const u of world.units) { u.taken = 0; } sample(); world.stats.nextT = world.stats.every; },
  tick() { const s = world.stats; if (world.time >= s.nextT) { s.nextT = world.time + s.every; sample(); } },
  hit(t, amount, src) {
    const s = world.stats;
    const real = Math.min(amount, t.hp);               // totals don't count overkill
    t.taken = (t.taken || 0) + real; s.dmg += real;
    if (!src || src === t) return;
    const ts = typeOf(src); ts.dmg = (ts.dmg || 0) + real;
    if (!s.bigHit || real > s.bigHit.amount) s.bigHit = { amount: real, by: who(src), on: who(t) };
  },
  healed(amount) { world.stats.healed += amount; },
  born(u) { world.stats.born++; const ts = typeOf(u); ts.born = (ts.born || 0) + 1; },
};
FO.on('death', (t, src, o) => {
  const s = world.stats;
  if (!s.first && src && src !== t) s.first = { t: world.time, by: who(src), on: who(t) };
});
FO.on('shoot', () => { world.stats.shots++; });
FO.on('end', () => sample());
})();
