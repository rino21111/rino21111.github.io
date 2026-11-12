/* =====================================================================
   SVG WARS · ready-made battles
   Each one is a place: somewhere with a road in, water that goes
   somewhere, ground worth holding and ground worth avoiding. Each is
   also there to show something off, a reaction in the terrain or units
   that work together. Team scenarios are tuned so either side can win.
   build(b) gets the builder from sim.js plus the map kit (js/mapkit.js),
   and everything here is placed by tile: the field is 70 columns × 44 rows.
   Teams: 0 red, 1 blue, 2 green, 3 gold.
   ===================================================================== */
(function () {
'use strict';
const S = window.FO.defineScenario;
const GROUND = [null], SOFT = [null, 'mud', 'trees'];

S({ id: 'dragon', name: 'Dragon Season', blurb: 'A palisaded camp in an old forest, and a dragon up from its lair.',
  build(b) {
    b.seed(11);
    // the forest, thinning out towards the heath in the west
    b.blotch('trees', 46, 22, 21, 18, 0.3).blotch('trees', 60, 7, 9, 6).blotch('trees', 59, 38, 10, 6).blotch('trees', 30, 10, 6, 4).blotch('trees', 30, 35, 7, 4);
    b.sprinkle('trees', 17, 8, 8, 5, 7, 2).sprinkle('trees', 18, 37, 8, 4, 6, 2).sprinkle('trees', 21, 17, 4, 4, 3, 1.4);
    b.blotch('hill', 58, 9, 6, 3.5, 0.2);                                                   // the lookout
    b.blotch('water', 55, 21, 4.5, 3.5, 0.3).stroke('water', [[55, 24], [58, 29], [55, 34], [58, 40], [61, 44]], 1.7, { wobble: 0.3 });
    b.fringe('mud', 'water', { on: SOFT, patches: 0.1 });
    b.blotch(null, 43, 22, 8.5, 7.5, 0.12);                                                 // the clearing, and the camp in it
    b.loop('barricade', 43, 22, 6.5, 5.5, { gaps: [[180, 3], [0, 3]] });
    b.sprinkle('wall', 38, 9, 6, 3, 4, 1.1, { on: ['trees'] }).sprinkle('wall', 48, 35, 6, 3, 4, 1.1, { on: ['trees'] });
    // the lair: cooled rock round a vent
    b.blotch('rock', 7, 32.5, 4.5, 3.2, 0.3).blotch('lava', 5, 33, 1.7, 1.3, 0.2).sprinkle('wall', 9, 32, 7, 5, 5, 0.8, { on: ['rock', null] });
    b.stroke('road', [[0, 22], [9, 20], [18, 23], [27, 20], [35, 22], [43, 22], [50, 22]], 1.6, { on: SOFT });
    b.stroke('road', [[50, 22], [51, 26], [56, 30], [63, 28], [70, 29]], 1.5, { on: [null, 'mud', 'trees', 'water'] });
    b.thing('barrel', 41, 19.5).thing('barrel', 42.2, 19).thing('barrel', 45, 25.5);
    b.nature('territorial').troop('archer', 1, 43, 22, 9, 7, 14).troop('sniper', 1, 58, 9, 6, 3, 2).troop('knight', 1, 35, 22, 2, 7, 6).troop('snowman', 1, 47, 22, 2, 7, 6);
    b.troop('wizard', 1, 42, 24, 3, 2, 2).troop('medic', 1, 44, 20, 3, 2, 2).nature(null).troop('peasant', 1, 31, 22, 5, 14, 14);
    b.one('dragon', 0, 9, 31);
  } });

S({ id: 'river', name: 'The Dry River', blurb: 'Two armies, a dry riverbed, two bridges. Upstream, lava is licking at a wooden dam.',
  build(b) {
    b.seed(22);
    b.box('water', 23, 0, 47, 7);                                                           // the reservoir, between two crags
    b.blotch('wall', 21, 2, 7, 6, 0.25).blotch('wall', 49, 2, 7, 6, 0.25).blotch('wall', 8, 0, 9, 2.6, 0.3).blotch('wall', 62, 0, 9, 2.6, 0.3);
    b.box('barricade', 23, 7, 47, 8, { on: GROUND });                                       // the dam
    b.blotch('lava', 29.5, 9.3, 2.3, 1.4, 0.15, { on: GROUND }).blotch('lava', 40.5, 9.3, 2.3, 1.4, 0.15, { on: GROUND });
    b.blotch('pit', 35, 10, 4, 2.2, 0.2, { on: GROUND }).fringe('rock', 'lava', { chance: 0.5 });
    b.stroke('pit', [[35, 9], [34, 14], [38, 19], [34, 25], [31, 31], [35, 37], [37, 44]], 3.4, { wobble: 0.25, on: [null, 'rock'] });
    b.blotch('pit', 40.5, 20, 2.6, 1.8, 0.3, { on: GROUND }).blotch('pit', 28.5, 31, 2.4, 1.7, 0.3, { on: GROUND });      // dried-up backwaters
    b.fringe('mud', 'pit', { patches: 0.1 });
    b.stroke('road', [[0, 17], [12, 15], [24, 16.5], [35.5, 16], [46, 16.5], [58, 15], [70, 17]], 1.6, { on: [null, 'pit', 'mud'] });
    b.stroke('road', [[0, 36], [12, 34], [24, 35], [33, 34.5], [44, 35], [58, 34], [70, 36]], 1.6, { on: [null, 'pit', 'mud'] });
    for (const m of [c => c, c => 70 - c]) {
      b.blotch('hill', m(15), 24, 5, 4.5, 0.2, { on: GROUND }).blotch('trees', m(8), 7, 6, 3.5, 0.3, { on: GROUND }).blotch('trees', m(8), 41, 7, 3, 0.3, { on: GROUND });
      b.sprinkle('trees', m(22), 6, 5, 3, 4, 1.5, { on: GROUND }).sprinkle('trees', m(5), 27, 3, 5, 4, 1.4, { on: GROUND }).sprinkle('wall', m(25), 26, 3, 5, 3, 0.9, { on: GROUND });
    }
    for (const [t, m] of [[0, c => c], [1, c => 70 - c]]) {
      b.troop('knight', t, m(25), 25, 2.5, 15, 10).troop('viking', t, m(22), 25, 2.5, 12, 8).troop('peasant', t, m(19), 25, 4, 22, 24);
      b.troop('archer', t, m(15), 24, 5, 6, 10).troop('wizard', t, m(18), 25, 2, 10, 3).one('medic', t, m(11), 30);
    }
  } });

S({ id: 'ice', name: 'Thin Ice', blurb: 'A frozen tarn with barrels on it. One side brought clowns, the other snowmen.',
  build(b) {
    b.seed(33);
    b.blotch('ice', 35, 22, 17, 12.5, 0.35);
    b.stroke('ice', [[39, 0], [37, 5], [39, 10]], 2.2, { wobble: 0.3 }).stroke('ice', [[32, 33], [29, 39], [31, 44]], 2.2, { wobble: 0.3 });        // the beck in and out
    b.blotch('hill', 28, 17, 2.6, 2, 0.2).sprinkle('trees', 28, 17, 1.8, 1.2, 3, 1, { on: ['hill'] });                                             // an island
    b.blotch('wall', 43, 27.5, 1.8, 1.3, 0.2).blotch('water', 37, 23, 2, 1.4, 0.3, { on: ['ice'] });
    b.fringe('mud', 'ice', { patches: 0.25 });
    b.blotch('trees', 14, 7, 8, 4, 0.3, { on: SOFT }).blotch('trees', 57, 6, 8, 4, 0.3, { on: SOFT }).blotch('trees', 13, 38, 8, 4, 0.3, { on: SOFT }).blotch('trees', 58, 38, 8, 4, 0.3, { on: SOFT });
    b.sprinkle('trees', 24, 34, 4, 3, 4, 1.4, { on: GROUND }).sprinkle('trees', 47, 9, 4, 3, 4, 1.4, { on: GROUND });
    b.blotch('hill', 11, 22, 4, 5.5, 0.2, { on: GROUND }).blotch('hill', 60, 22, 4, 5.5, 0.2, { on: GROUND });
    b.sprinkle('wall', 22, 11, 3, 2, 3, 1, { on: GROUND }).sprinkle('wall', 50, 34, 3, 2, 3, 1, { on: GROUND });
    b.stroke('road', [[0, 23], [6, 21], [15, 22.5], [24, 22.5]], 1.2, { on: [null, 'mud', 'ice', 'hill'] }).stroke('road', [[70, 21], [64, 23], [55, 21.5], [46, 21.5]], 1.2, { on: [null, 'mud', 'ice', 'hill'] });      // tracks down to the jetties
    b.plan(31, 27, ['##']).plan(40, 16, ['##']);                                                                                                // fishing huts
    for (const [c, r] of [[25, 21.5], [25.2, 23.6], [45, 20.5], [44.8, 22.6], [34, 20], [35.3, 20.8], [33, 25], [39.5, 25.5], [41, 19], [30.5, 23], [37.5, 28]]) b.thing('barrel', c, r);
    b.troop('bomber', 0, 18, 22, 2.5, 13, 8).troop('viking', 0, 15.5, 22, 2.5, 14, 14).troop('knight', 0, 20.5, 22, 2, 16, 6).troop('wizard', 0, 13, 22, 2, 8, 2);
    b.troop('archer', 0, 10.5, 22, 4, 8, 8).troop('peasant', 0, 7, 22, 5, 22, 20);
    b.troop('snowman', 1, 56, 22, 3, 16, 10).troop('gorilla', 1, 52.5, 22, 2, 11, 2).troop('knight', 1, 54, 22, 2.5, 16, 10).troop('archer', 1, 60, 22, 4, 8, 8).troop('peasant', 1, 64, 22, 5, 22, 16);
  } });

S({ id: 'hillfort', name: 'Hill Fort', blurb: 'A palisade on a hill with a ditch round it. The besiegers have clowns, a rhino and an ogre.',
  build(b) {
    b.seed(44);
    b.blotch('hill', 50, 22, 13, 11.5, 0.2);
    b.loop('pit', 50, 22, 16, 14.3, { width: 1.7, gaps: [[180, 6], [0, 4]], on: GROUND });         // the ditch
    b.loop('barricade', 50, 22, 11.5, 10, { gaps: [[180, 4.5], [0, 2.5]] });                // the palisade, a gate and a postern
    b.box('wall', 37, 17, 39, 19).box('wall', 37, 25, 39, 27);                              // gate towers
    b.box('wall', 57, 14, 59, 16).box('wall', 41, 14, 43, 16).box('wall', 41, 28, 43, 30).box('wall', 57, 28, 59, 30);
    b.stroke('water', [[34, 44], [39, 40.5], [50, 40], [60, 41.5], [70, 39]], 1.7, { wobble: 0.3, on: GROUND }).fringe('mud', 'water', { patches: 0.1 });
    b.blotch('trees', 8, 6, 8, 4.5, 0.3).blotch('trees', 7, 38, 8, 4.5, 0.3).sprinkle('trees', 22, 40, 5, 2.5, 5, 1.5, { on: GROUND }).sprinkle('trees', 20, 5, 4, 3, 4, 1.4, { on: GROUND });
    b.blotch('hill', 27, 8, 4.5, 3, 0.2, { on: GROUND }).blotch('mud', 30.5, 25.5, 3.5, 2.5, 0.3, { on: GROUND });
    b.stroke('road', [[0, 23], [10, 24], [20, 21], [30, 22], [38, 22], [47, 22]], 1.6, { on: [null, 'pit', 'hill', 'mud'] });
    b.stroke('barricade', [[29, 15], [29.6, 18]], 1, { straight: true }).stroke('barricade', [[28.6, 27.5], [28, 30.5]], 1, { straight: true }).stroke('barricade', [[26, 19.3], [26, 20.2]], 1, { straight: true });      // siege screens
    b.sprinkle('wall', 15, 14, 4, 2, 3, 0.9, { on: GROUND }).sprinkle('wall', 16, 31, 4, 2, 3, 0.9, { on: GROUND });
    b.thing('barrel', 11, 19.5).thing('barrel', 12.2, 20.3).thing('barrel', 11.2, 21.2);
    b.nature('territorial').troop('archer', 1, 47, 22, 9, 14, 16).troop('sniper', 1, 55, 21, 3, 3, 3).troop('knight', 1, 41.5, 22, 2, 10, 14).troop('wizard', 1, 50, 22, 3, 8, 2).troop('medic', 1, 53, 25, 2, 3, 2).nature(null);
    b.troop('peasant', 0, 15, 23, 8, 14, 26).troop('bomber', 0, 24, 23, 2, 9, 5).troop('archer', 0, 27, 8, 5, 4, 8);
    b.one('ogre', 0, 21, 23).troop('hedgehog', 0, 18.5, 23, 2.5, 4, 6).one('rhino', 0, 20, 31).troop('knight', 0, 17, 31, 3, 5, 3);
  } });

S({ id: 'ambush', name: 'Ambush at the Pass', blurb: 'A column on the road through a mountain pass. Archers above, ninjas in the woods, traps on the road.',
  build(b) {
    b.seed(55);
    b.blotch('wall', 34, 2, 23, 6.5, 0.28).blotch('wall', 10, 0, 11, 3.2, 0.3).blotch('wall', 61, 1, 10, 4, 0.3);
    b.blotch('wall', 33, 42, 24, 6.5, 0.28).blotch('wall', 8, 44, 9, 3, 0.3).blotch('wall', 62, 43, 9, 4, 0.3);
    b.stroke(null, [[41, 0], [42, 4], [40, 9]], 1.8);                                       // a goat track through the north wall
    b.fringe('hill', 'wall').fringe('hill', ['wall', 'hill'], { chance: 0.6 });
    b.blotch('hill', 29, 10.5, 8, 2.5, 0.25, { on: GROUND }).blotch('hill', 45, 11, 6, 2, 0.25, { on: GROUND }).blotch('hill', 30, 33.5, 8, 2.5, 0.25, { on: GROUND }).blotch('hill', 46, 33, 6, 2, 0.25, { on: GROUND });
    b.stroke('water', [[52, 8], [53, 14], [50, 21], [53, 28], [51, 37]], 1.5, { wobble: 0.3, on: [null, 'hill'] }).fringe('mud', 'water', { patches: 0.1 });
    b.blotch('trees', 61, 13, 6, 5, 0.3, { on: [null, 'hill'] }).blotch('trees', 61, 31, 6, 5, 0.3, { on: [null, 'hill'] });
    b.sprinkle('trees', 13, 13, 5, 3, 5, 1.5, { on: GROUND }).sprinkle('trees', 14, 31, 5, 3, 5, 1.5, { on: GROUND }).sprinkle('trees', 40, 28, 3, 2, 2, 1.2, { on: GROUND });
    b.sprinkle('wall', 36, 17.5, 5, 2, 4, 1, { on: GROUND }).sprinkle('wall', 25, 26.5, 4, 2, 3, 1, { on: GROUND }).blotch('mud', 44, 26, 3, 2, 0.3, { on: GROUND });
    b.stroke('road', [[0, 22], [9, 20], [19, 23], [29, 21], [39, 23], [49, 21], [59, 23], [70, 22]], 1.7, { on: [null, 'water', 'mud'] });
    b.thing('beartrap', 33, 21.6).thing('beartrap', 40, 23).thing('beartrap', 46, 21.6).thing('beartrap', 37, 22.4);
    b.troop('knight', 0, 19, 22.5, 4, 7, 14).troop('peasant', 0, 11, 21.5, 9, 9, 40).troop('medic', 0, 4, 22, 2, 5, 3).troop('viking', 0, 23, 22.5, 2, 6, 6);
    b.nature('ambusher').troop('archer', 1, 30, 10.5, 12, 3, 12).troop('archer', 1, 30, 33.5, 12, 3, 12).troop('ninja', 1, 61, 13, 5, 4, 8).troop('ninja', 1, 61, 31, 5, 4, 8);
    b.nature('territorial').troop('knight', 1, 63, 22, 3, 9, 9).nature(null);                 // the roadblock
  } });

S({ id: 'swamp', name: 'Gator Swamp', blurb: 'Florida Men follow a boardwalk into the swamp after alligators. Some alligators change sides.',
  build(b) {
    b.seed(66);
    for (const [c, r, rx, ry] of [[34, 22, 9, 6.5], [47, 14, 6, 4.5], [25, 31, 6, 4.5], [51, 30, 6, 4.5], [40, 36, 5, 3], [29, 11, 5, 3], [58, 21, 4, 3], [20, 20, 4, 3]]) b.blotch('water', c, r, rx, ry, 0.35);
    for (const pts of [[[20, 20], [27, 24], [33, 22]], [[29, 11], [36, 15], [46, 14]], [[47, 15], [53, 19], [58, 21]], [[51, 30], [45, 33], [40, 36]], [[25, 31], [31, 28], [35, 26]], [[40, 38], [44, 41], [46, 44]]]) b.stroke('water', pts, 1.6, { wobble: 0.3 });
    b.fringe('mud', 'water', { chance: 0.75 }).fringe('mud', ['water', 'mud'], { chance: 0.35 });
    b.sprinkle('trees', 36, 22, 9, 7, 7, 1.4, { on: ['water'] }).sprinkle('trees', 48, 22, 10, 12, 9, 1.3, { on: ['water', 'mud'] }).sprinkle('trees', 27, 28, 7, 6, 6, 1.3, { on: ['water', 'mud'] });       // mangrove islets
    b.blotch('trees', 59, 6, 8, 4.5, 0.3, { on: [null, 'mud'] }).blotch('trees', 61, 40, 8, 4, 0.3, { on: [null, 'mud'] }).blotch('trees', 13, 4, 7, 3, 0.3, { on: GROUND }).blotch('trees', 11, 41, 7, 3, 0.3, { on: GROUND });
    b.blotch('hill', 63, 23, 3.5, 3.2, 0.2, { on: [null, 'mud'] });
    b.blotch('hill', 35.5, 21.5, 3, 2.4, 0.15).plan(34, 20, ['###', '#_#']);                // the shack on its island
    b.stroke('road', [[0, 23], [9, 22], [17, 24], [25, 23], [32.5, 22.5]], 1.1);            // the boardwalk
    b.thing('barrel', 7, 17.5).thing('barrel', 8.2, 18.4).thing('barrel', 7.3, 19.6);
    b.thing('beartrap', 17, 20).thing('beartrap', 19, 27.5).thing('beartrap', 23, 25.5).thing('beartrap', 15.5, 29.5);
    b.troop('gator', 2, 40, 23, 24, 18, 12).nature('territorial').troop('frog', 2, 61, 23, 6, 10, 10).nature('ambusher').troop('snake', 2, 66, 22, 3, 12, 12).nature(null);
    b.troop('floridaman', 0, 11, 22, 3, 14, 5).troop('peasant', 0, 6, 22, 5, 24, 14).troop('archer', 0, 2.5, 22, 2, 18, 8).troop('dog', 0, 13.5, 22, 2, 14, 6).troop('bee', 0, 10, 10, 5, 5, 30);
  } });

S({ id: 'wormsign', name: 'Wormsign', blurb: 'A fortified camp on the plain. The furrows and sinkholes outside it are new.',
  build(b) {
    b.seed(77);
    b.frame('pit', 35, 6, 67, 38).frame('barricade', 37, 8, 65, 36);
    b.box('road', 0, 21, 64, 23, { on: [null, 'pit', 'barricade'] }).box('road', 50, 6, 52, 38, { on: [null, 'pit', 'barricade'] });      // the two roads, and the gates they pass through
    b.stroke('mud', [[1, 9], [11, 14], [18, 8], [27, 12], [33, 17]], 1.5, { wobble: 0.3 }).stroke('mud', [[3, 37], [13, 30], [23, 36], [30, 28], [34, 24]], 1.5, { wobble: 0.3 });
    b.stroke('mud', [[0, 20], [8, 25], [16, 19], [25, 24]], 1.5, { wobble: 0.3 }).stroke('mud', [[33, 17], [38, 17.5], [42, 17]], 1.6);      // the last one goes straight through the palisade
    for (const [c, r, k] of [[18, 8, 1.8], [23, 36, 1.9], [11, 14, 1.4], [30, 28, 1.5], [25, 24, 1.3], [43, 17.5, 1.6]]) b.blotch('pit', c, r, k, k * 0.8, 0.25);
    b.blotch('hill', 58.5, 22, 4, 5, 0.15, { on: GROUND });
    b.box('water', 45, 26, 47, 28).frame('barricade', 40, 11, 46, 15).box(null, 42, 14, 44, 15);
    b.sprinkle('wall', 8, 4, 6, 2, 3, 1, { on: GROUND }).sprinkle('wall', 14, 40, 6, 2, 3, 1, { on: GROUND }).sprinkle('trees', 22, 2, 16, 1.5, 7, 1.5, { on: GROUND }).sprinkle('trees', 22, 42, 16, 1.5, 7, 1.5, { on: GROUND });
    for (const [c, r] of [[55, 31], [56.1, 31.1], [55.2, 32.2], [56.4, 32.3], [57.3, 31.6]]) b.thing('barrel', c, r);
    b.nature('territorial').troop('peasant', 1, 51, 22, 22, 22, 38).troop('knight', 1, 40, 22, 2, 8, 8).troop('archer', 1, 58.5, 22, 5, 8, 12).troop('sniper', 1, 59, 20, 2, 3, 2).troop('medic', 1, 61, 28, 2, 3, 2);
    b.nature(null).troop('gorilla', 1, 48, 22, 8, 14, 2);
    b.one('worm', 0, 9, 22).troop('snake', 0, 15, 22, 3, 12, 8);
  } });

S({ id: 'outbreak', name: 'Outbreak', blurb: 'A market town with a few zombies by the well. Everyone else is indoors.',
  build(b) {
    b.seed(88);
    b.box('road', 0, 21, 70, 23).box('road', 34, 2, 36, 42).box('road', 28, 17, 42, 27);    // main street, cross street, the square
    b.box('road', 8, 10, 63, 11).box('road', 8, 33, 63, 34).box('road', 8, 10, 9, 34).box('road', 62, 10, 63, 34);      // back lanes
    b.box('water', 34, 21, 36, 23);                                                          // the well
    // a house: walls, a floor, a two-tile doorway on one side, and whoever lives there
    const house = (c, r, w, h, door, n) => {
      b.frame('wall', c, r, c + w, r + h).box(null, c + 1, r + 1, c + w - 1, r + h - 1);
      const mc = c + (w >> 1), mr = r + (h >> 1);
      if (door === 'S') b.box('road', mc - 1, r + h - 1, mc + 1, r + h + 1); else if (door === 'N') b.box('road', mc - 1, r - 1, mc + 1, r + 1);
      else if (door === 'E') b.box('road', c + w - 1, mr - 1, c + w + 1, mr + 1); else b.box('road', c - 1, mr - 1, c + 1, mr + 1);
      if (n) b.nature('skittish').troop('peasant', 0, c + w / 2, r + h / 2, w - 3, h - 3, n).nature(null);
    };
    for (const [c, r, w, h] of [[11, 13, 6, 6], [19, 12, 7, 7], [45, 12, 7, 7], [54, 13, 6, 6]]) house(c, r, w, h, 'S', 5);
    for (const [c, r, w, h] of [[11, 25, 6, 6], [19, 25, 7, 7], [45, 25, 7, 7], [54, 25, 6, 6]]) house(c, r, w, h, 'N', 5);
    house(28, 12, 5, 4, 'S', 2); house(37, 12, 5, 4, 'S', 2); house(28, 28, 5, 4, 'N', 2); house(37, 28, 5, 4, 'N', 2);
    for (const [c, r, w, h] of [[12, 3, 6, 6], [21, 4, 7, 5], [38, 4, 7, 5]]) house(c, r, w, h, 'S', 4);
    for (const [c, r, w, h] of [[12, 35, 6, 6], [21, 36, 7, 5], [38, 36, 7, 5], [48, 35, 6, 6], [56, 36, 5, 5]]) house(c, r, w, h, 'N', 4);
    b.plan(47, 2, ['.###########.', '##_________##', '#___________#', '#___________#', '#___________#', '##_________##', '.####rr####.']);          // the church
    for (const [c, r] of [[62, 3], [64, 3], [66, 3], [62, 6], [64, 6], [66, 6], [68, 6]]) b.box('wall', c, r, c + 1, r + 1);                       // and its churchyard
    for (const [c, r] of [[29, 18], [39, 18], [29, 25], [39, 25]]) b.box('barricade', c, r, c + 2, r + 1);                                         // market stalls
    for (let r = 2; r < 9; r += 2) b.box('mud', 0, r, 7, r + 1);                             // ploughed fields
    for (let r = 35; r < 43; r += 2) b.box('mud', 64, r, 70, r + 1);
    for (let c = 1; c < 7; c += 2) for (let r = 36; r < 43; r += 2) b.box('trees', c, r, c + 1, r + 1);       // an orchard
    b.blotch('water', 66.5, 15, 2.4, 1.9, 0.3, { on: GROUND }).fringe('mud', 'water', { patches: 0 });
    b.sprinkle('trees', 35, 22, 31, 19, 26, 0.9, { on: GROUND });                            // gardens
    b.troop('zombie', 2, 35, 22, 5, 5, 6);
    b.troop('dog', 0, 16, 22, 10, 1.5, 7).troop('archer', 0, 35, 33.5, 20, 1, 12).nature('skittish').troop('medic', 0, 53, 5, 6, 2, 2).troop('peasant', 0, 53, 5, 8, 3, 5).nature(null);
  } });

S({ id: 'friday', name: 'Casual Friday', blurb: 'The office away day, at a cemetery. The residents are in.',
  build(b) {
    b.seed(99);
    b.frame('wall', 33, 3, 69, 41).box(null, 33, 20, 34, 22).box(null, 33, 33, 34, 36).sprinkle('wall', 31.5, 34.5, 1.5, 2, 3, 0.7, { on: GROUND });      // the wall, the gate, and a stretch that fell down
    b.stroke('road', [[0, 23], [10, 21], [20, 22], [28, 21], [34, 21]], 1.6).box('road', 34, 20, 60, 22).box('road', 46, 4, 48, 40);
    b.plan(59, 17, ['.######', '##____#', '#_____#', 'r_____#', 'r_____#', '#_____#', '##____#', '.######']);                                      // the chapel
    b.plan(63, 6, ['###', '#_#', '#_#']).plan(63, 33, ['#_#', '#_#', '###']);                                                                      // two crypts
    // plots: rows of headstones, a few of them with the grave open
    for (const [c0, r0, c1, r1] of [[36, 6, 45, 18], [50, 6, 59, 16], [36, 24, 45, 39], [50, 26, 59, 39]])
      for (let c = c0; c < c1; c += 3) for (let r = r0; r < r1; r += 3) { if (b.rnd() < 0.85) b.box('wall', c, r, c + 1, r + 1); if (b.rnd() < 0.2) b.box('pit', c, r + 1, c + 1, r + 2); }
    for (const [c, r] of [[40, 10], [43, 13], [38, 14], [41, 15], [40, 30], [43, 28], [38, 33], [42, 34]]) b.box('statue', c, r, c + 1, r + 1);       // people who met Medusa
    b.sprinkle('trees', 66, 5.5, 2, 1.5, 3, 1.2, { on: GROUND }).sprinkle('trees', 66, 38, 2, 1.5, 3, 1.2, { on: GROUND }).sprinkle('trees', 30, 9, 2, 5, 4, 1.3, { on: GROUND }).sprinkle('trees', 30, 29, 2, 4, 4, 1.3, { on: GROUND });
    b.blotch('water', 65, 27.5, 2.2, 1.6, 0.3, { on: GROUND }).fringe('mud', 'water', { patches: 0 });
    b.blotch('trees', 8, 5, 8, 3.5, 0.3, { on: GROUND }).blotch('trees', 9, 40, 8, 3.5, 0.3, { on: GROUND });
    b.box('road', 6, 15, 17, 30);                                                            // the car park, and what is left of the picnic
    for (const [c, r] of [[22, 19.5], [25, 23.5], [27, 19.5], [24, 26], [29.5, 22.8]]) b.thing('banana', c, r);
    b.thing('barrel', 19.5, 16.5).thing('barrel', 20.6, 17.4);
    b.nature('territorial').one('medusa', 1, 41.5, 12.5).one('medusa', 1, 41.5, 31.5).troop('necromancer', 1, 62.5, 21, 3, 3, 2).troop('skeleton', 1, 44, 22, 18, 32, 38).troop('slime', 1, 52, 31, 6, 8, 3);
    b.nature('ambusher').troop('vampire', 1, 55, 21, 6, 26, 10).nature(null).troop('ghost', 1, 60, 22, 12, 30, 10);
    b.troop('karen', 0, 14, 22.5, 3, 12, 4).troop('influencer', 0, 10, 22.5, 2, 10, 3).one('founder', 0, 7.5, 22.5).one('baldy', 0, 16, 22.5);
    b.troop('lagger', 0, 14, 17, 5, 3, 3).troop('matt', 0, 14, 28, 5, 3, 3).troop('bryan', 0, 11, 22.5, 8, 13, 8).troop('catbox', 0, 19.5, 23, 1.5, 10, 4);
    b.troop('justin', 0, 17.5, 22.5, 1.5, 6, 2).one('zach', 0, 9, 19).one('ryan', 0, 9, 26).one('sierra', 0, 7.5, 25);
  } });

S({ id: 'maths', name: 'Recreational Maths', blurb: 'Chickens on a plaza, rabbits in a golden spiral, boids over a Sierpinski hill, against an ordinary army.',
  build(b) {
    b.seed(1010);
    const pulsar = ['..OOO...OOO..', '.............', 'O....O.O....O', 'O....O.O....O', 'O....O.O....O', '..OOO...OOO..', '.............',
                    '..OOO...OOO..', 'O....O.O....O', 'O....O.O....O', 'O....O.O....O', '.............', '..OOO...OOO..'], rpent = ['.OO', 'OO.', '.O.'];
    b.blotch('hill', 8, 22, 4, 5.5, 0.2).blotch('trees', 8, 7, 7, 3.5, 0.3).blotch('trees', 8, 37, 7, 3, 0.3).sprinkle('trees', 19, 13, 3, 2, 3, 1.3).sprinkle('trees', 20, 31, 3, 2, 3, 1.3);
    b.stroke('road', [[0, 23], [12, 21], [22, 22.5], [31, 21.5]], 1.5, { on: [null, 'hill'] });
    b.box('road', 31, 13, 48, 30).box('road', 39, 3, 46, 10).box('road', 22, 30, 29, 37);                  // the plaza, and a pad for each R-pentomino
    b.loop('water', 24, 8, 4.2, 3.8, { width: 1.7 }).box('trees', 23, 7, 25, 9);                           // an annulus
    for (let i = 0; i < 16; i++) for (let j = 0; j <= i; j++) if ((i & j) === j) b.box('hill', 52 + j, 1 + i, 53 + j, 2 + i);      // Pascal's triangle, odd numbers only
    const spiral = []; for (let t = 0; t <= Math.PI * 3; t += 0.06) { const k = 0.6 * Math.pow(1.618034, t / (Math.PI / 2)); spiral.push([59 + Math.cos(t) * k, 28 - Math.sin(t) * k]); }
    b.stroke('road', spiral, 1.1, { straight: true });
    b.box('road', 18, 40, 68, 43);                                                                          // the racetrack: each post is half the distance left
    for (const c of [43, 31, 26, 23, 21, 20]) b.box('wall', c, 39, c + 1, 40);
    b.cells('conway', 3, 33, 15, pulsar).cells('conway', 3, 41, 5, rpent).cells('conway', 3, 24, 32, rpent);
    for (let r = 14; r <= 29; r += 3) b.one('catbox', 3, 29.5, r + 0.5);
    b.troop('zeno', 3, 65, 41.5, 4, 2.4, 4).troop('boid', 3, 58, 10, 10, 10, 26).one('fibrabbit', 3, 59.5, 28);
    b.troop('knight', 0, 17, 22, 3, 14, 10).troop('archer', 0, 8, 22, 6, 9, 22).troop('peasant', 0, 13, 22, 5, 22, 30).troop('viking', 0, 19.5, 22, 2, 8, 6).troop('wizard', 0, 11.5, 22, 2, 10, 5);
  } });
})();
