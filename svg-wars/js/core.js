/* =====================================================================
   SVG WARS · core
   The registry everything else plugs into. Content files call
   FO.defineUnit / defineAttack / defineTrait / defineStatus /
   defineTerrain / definePower / defineScenario.
   ===================================================================== */
(function () {
'use strict';

const FO = window.FO = {
  W: 1400, H: 880,         // battlefield size, world units
  TILE: 20,                // terrain tile size
  DT: 1 / 60,              // fixed simulation step
  MAX_UNITS: 2500,

  teams: [
    { name: 'Red',   color: '#ef4444', dark: '#b42323', light: '#ffeceb' },
    { name: 'Blue',  color: '#3b6cf6', dark: '#1f44b8', light: '#eaf0ff' },
    { name: 'Green', color: '#1faa66', dark: '#12754a', light: '#e6f8ee' },
    { name: 'Gold',  color: '#f2a900', dark: '#9a6a00', light: '#fff6da' },
  ],

  // Palette tabs. Units pick one with `category`.
  categories: [
    { id: 'people',  name: 'People', group: 'fighters' },      // tabs with the same group are drawn joined together
    { id: 'beasts',  name: 'Beasts', group: 'fighters' },
    { id: 'myths',   name: 'Myths',  group: 'fighters' },
    { id: 'friends', name: 'Friends', group: 'fighters' },
    { id: 'nature',  name: 'Nature' },
    { id: 'terrain', name: 'Terrain' },
    { id: 'powers',  name: 'Powers' },
  ],

  units: {}, unitList: [],
  attacks: {}, traits: {}, statuses: {},
  terrain: [null], terrainById: {},     // index 0 = bare ground
  powers: [], scenarios: [],
  maxR: 10,
};

/* ---------- tiny event bus ---------- */
const listeners = {};
FO.on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
FO.emit = (name, a, b, c, d) => { const l = listeners[name]; if (l) for (let i = 0; i < l.length; i++) l[i](a, b, c, d); };

/* ---------- helpers ---------- */
FO.rand = (a, b) => a + Math.random() * (b - a);
FO.pick = arr => arr[(Math.random() * arr.length) | 0];
FO.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
FO.chance = p => Math.random() < p;

/* =====================================================================
   UNITS
   FO.defineUnit({
     id, name, category, desc, cost,
     icon:   emoji string, or function (g, cx, cy, R) that draws the face
     weapon: emoji shown in the unit's hand (optional)
     art:    { body, weapon } SVG strings; usually set in content/art.js instead
     r, hp, speed, armor, flying, flip (true when the icon faces left)
     plural: 'Mice'  (optional; otherwise an s is added in win messages)
     attack: { type, dmg, cd, ... }   type is one of the attacks in mechanics.js: melee, shoot, lob, zap, breath,
             kamikaze, heal, shout, tongue, junk, bling. shoot can take arc: true to lob over walls when the
             straight line is blocked; inflict: ['status', seconds] puts a status on whatever it hits
     traits: ['lifesteal', ['dodge', { chance: .3 }], ...]
     immune: ['poison', ...]      statuses this unit ignores
     quips:  ['Things it shouts']
     ai:     'fighter' (default, tactics.js) | 'support' (sim.js) | 'burrower' | 'dimwit' | 'lurker' (mechanics.js)
             | 'conway' (life.js) | 'warren' | 'boid' | 'box' (theory.js) | 'vacuum' (quirks.js)
     role:   override the tactics role worked out from its stats: line, tank, skirmisher, brute, bomber, ranged
     formOf: (set in units.js) the unit this one is another form of; the battle report counts it as that one
     noFeet, roll (spins as it moves), ground: 'hole' (drawn under it)
     swims: 2.4   speed multiplier in water (instead of being slowed); it is drawn half-submerged
     waterWalk: true   crosses water at full speed, on the surface · peaceful: true  a support unit that never fights
     hidden: true keeps it out of the palette (summons, split-offs)
   })
   ===================================================================== */
FO.defineUnit = function (d) {
  const u = Object.assign({
    category: 'people', icon: '🙂', weapon: null, desc: '', cost: 10,
    r: 10, hp: 50, speed: 50, armor: 0, flying: false, flip: false,
    traits: [], immune: [], quips: null, ai: 'fighter', hidden: false,
  }, d);
  u.mass = d.mass || Math.max(0.3, (u.r / 10) ** 2);
  u.traits = (u.traits || []).map(t =>
    typeof t === 'string' ? { id: t, p: {} } : Array.isArray(t) ? { id: t[0], p: t[1] || {} } : { id: t.id, p: t.p || {} });
  u.attack = Object.assign({ type: 'melee', dmg: 5, cd: 1 }, u.attack);
  u._sprites = {}; u._ready = false;
  const old = FO.units[u.id];
  FO.units[u.id] = u;
  if (old) FO.unitList[FO.unitList.indexOf(old)] = u; else FO.unitList.push(u);
  FO.emit('units-changed', u);
  return u;
};

// Resolve attack + trait implementations once, the first time a unit type is used.
FO.prepUnit = function (def) {
  if (def._ready) return def;
  def._atk = FO.attacks[def.attack.type] || FO.attacks.melee;
  def.traits.forEach(t => { t.impl = FO.traits[t.id] || {}; });
  const hook = name => def.traits.filter(t => t.impl[name]);
  def._onSpawn = hook('onSpawn'); def._onUpdate = hook('onUpdate'); def._onDamaged = hook('onDamaged');
  const vd = def.traits.find(t => t.id === 'void'); def._void = vd ? (vd.p.radius || 150) : 0;      // the renderer draws the Void
  def._onHit = hook('onHit'); def._onKill = hook('onKill'); def._onDeath = hook('onDeath'); def._onAnyDeath = hook('onAnyDeath');
  if (def.r > FO.maxR) FO.maxR = def.r;
  def._ready = true;
  return def;
};


/* =====================================================================
   BUILDING BLOCKS
   ===================================================================== */
// Attack type: { los: 'walk'|'shot'|'none', reach(u, target, a) -> distance, fire(u, target, a, nx, ny, d) }
FO.defineAttack = (id, impl) => { FO.attacks[id] = Object.assign({ los: 'walk' }, impl); };

// Trait: any of onSpawn(u,p) onUpdate(u,dt,p) onDamaged(u,amount,src,o,p)->amount
//        onHit(u,target,dealt,o,p) onKill(u,victim,p) onDeath(u,killer,p) onAnyDeath(u,victim,killer,p)
//        plus label/desc for the info panel.
FO.defineTrait = (id, impl) => { FO.traits[id] = Object.assign({ id }, impl); };

// Status: { name, color, speedMul, rateMul, stun, tick(u, s, dt), onApply(u, s) }
FO.defineStatus = (id, impl) => { FO.statuses[id] = Object.assign({ id, speedMul: 1, rateMul: 1, stun: false }, impl); };

// Terrain: { id, name, desc, solid, blockShot:'hard'|'cover', speedMul, navCost, hazard, onStand(u, dt), draw:{...} }
FO.defineTerrain = function (d) {
  const t = Object.assign({ solid: false, blockShot: null, speedMul: 1, navCost: 1, hazard: false, onStand: null }, d);
  t.index = FO.terrain.length;
  FO.terrain.push(t); FO.terrainById[t.id] = t;
  return t;
};

// Power: { id, name, icon, desc, radius, cooldown, cast(x, y, team) }
FO.definePower = d => { FO.powers.push(Object.assign({ radius: 60, cooldown: 0.4 }, d)); };

// Scenario: { id, name, blurb, mode: 'teams'|'units'|'ffa', build(b) } where b is the builder from sim.js
FO.defineScenario = d => { FO.scenarios.push(d); };
})();
