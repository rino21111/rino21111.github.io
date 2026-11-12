/* =====================================================================
   SVG WARS · units
   One entry per unit. Copy one, change the numbers, reload.
   See core.js for every field; mechanics.js for attack types and traits.
     r = body radius · speed = world units per second · cd = seconds between attacks
   ===================================================================== */
(function () {
'use strict';
const U = window.FO.defineUnit;

/* ------------------------------ PEOPLE ------------------------------ */
U({ id: 'peasant', name: 'Peasant', category: 'people', icon: '🧑‍🌾', weapon: '🔱', cost: 7,
  desc: 'cheap and cheerful, best in large numbers',
  r: 13, hp: 80, speed: 55, attack: { type: 'melee', dmg: 7, cd: 0.9 },
  quips: ['For the turnips!', 'I just work here', 'Mind the crops!'] });

U({ id: 'knight', name: 'Knight', category: 'people', icon: '💂', weapon: '🗡️', cost: 50,
  desc: 'heavily armoured, small hits barely scratch him',
  r: 15, hp: 260, speed: 46, armor: 4, attack: { type: 'melee', dmg: 17, cd: 1.0, reach: 6 }, traits: [['rider', { mount: 'rhino' }]],
  quips: ['Have at thee!', 'For honour!', 'Tis but a scratch'] });

U({ id: 'archer', name: 'Archer', category: 'people', icon: '🧝', weapon: '🏹', cost: 25,
  desc: 'shoots from a distance, and over walls when he has to',
  r: 13, hp: 60, speed: 50, attack: { type: 'shoot', dmg: 11, cd: 1.4, range: 230, look: 'arrow', speed: 430, arc: true },
  quips: ['Bullseye!', 'Nock, draw, loose'] });

U({ id: 'sniper', name: 'Sniper', category: 'people', icon: '🕵️', weapon: '🔭', cost: 110,
  desc: 'one huge shot from across the map, then a long reload',
  r: 13, hp: 55, speed: 40, attack: { type: 'shoot', dmg: 95, cd: 3.2, range: 560, hitscan: true },
  quips: ['Boom. Headshot.', 'Never saw me'] });

U({ id: 'wizard', name: 'Wizard', category: 'people', icon: '🧙', weapon: '🪄', cost: 75,
  desc: 'lightning that jumps from enemy to enemy',
  r: 13, hp: 75, speed: 44, attack: { type: 'zap', dmg: 24, cd: 1.9, range: 200, chains: 3, jump: 90 },
  quips: ['Zap!', 'Behold!', 'I meant to do that'] });

U({ id: 'ninja', name: 'Ninja', category: 'people', icon: '🥷', weapon: '🔪', cost: 30,
  desc: 'fast and hard to hit',
  r: 12, hp: 90, speed: 105, attack: { type: 'melee', dmg: 13, cd: 0.45 }, traits: [['dodge', { chance: 0.35 }]],
  quips: ['…', 'Too slow'] });

U({ id: 'viking', name: 'Viking', category: 'people', icon: '🧔', weapon: '🪓', cost: 45,
  desc: 'attacks faster the more hurt he is',
  r: 15, hp: 220, speed: 58, attack: { type: 'melee', dmg: 19, cd: 1.0, reach: 6 }, traits: ['berserk'],
  quips: ['VALHALLA!', 'RAAAGH!', 'Is that all?'] });

U({ id: 'medic', name: 'Medic', category: 'people', icon: '🧑‍⚕️', weapon: '💉', cost: 70,
  desc: 'heals friends, doesn’t fight',
  r: 13, hp: 85, speed: 58, ai: 'support', attack: { type: 'heal', dmg: 24, cd: 0.9, range: 80 },
  quips: ['Hold still!', 'This won’t hurt', 'Next patient'] });

U({ id: 'bomber', name: 'Clown', category: 'people', icon: '🤡', weapon: '💣', cost: 95,
  desc: 'runs at the enemy with a bomb',
  r: 13, hp: 45, speed: 88, attack: { type: 'kamikaze', dmg: 110, cd: 0.2 }, traits: [['volatile', { radius: 72, dmg: 110 }]],
  quips: ['Honk honk!', 'Surprise!', 'Hehehe'] });

U({ id: 'baldy', name: 'Balding Guy', category: 'people', icon: '👨‍🦲', cost: 105,
  desc: 'it’s just a high forehead',
  r: 13, hp: 145, speed: 54, attack: { type: 'melee', dmg: 14, cd: 0.9, knock: 90 },
  traits: [['shiny', { chance: 0.45 }], ['evolve', { into: 'baldy2', after: 12, hpBelow: 0.5, say: 'It’s time.' }]],
  quips: ['It’s just a high forehead', 'Should I shave it?', 'It’s the lighting', 'Hats are an option', 'Still got the sides'] });

U({ id: 'baldy2', name: 'Bald Legend', category: 'people', icon: '😎', hidden: true, cost: 155,
  desc: 'he finally shaved it',
  r: 14, hp: 250, speed: 74, attack: { type: 'melee', dmg: 22, cd: 0.75, knock: 170 },
  traits: [['shiny', { chance: 0.75 }], ['aura', { radius: 100 }]],
  quips: ['Should’ve done it years ago', 'Aerodynamic', 'No hair, don’t care', 'Bald is a lifestyle', 'Feel the breeze'] });

U({ id: 'karen', name: 'Karen', category: 'people', icon: '💁‍♀️', cost: 60,
  desc: 'would like to speak to the manager',
  r: 13, hp: 95, speed: 50, attack: { type: 'shout', dmg: 9, cd: 2.6, range: 75, knock: 80, inflict: ['stun', 0.3] }, traits: ['callManager'],
  quips: ['I want the manager!', 'This is unacceptable', 'I’m leaving a review', 'Do you know who I am?', 'I’d like a refund'] });

U({ id: 'influencer', name: 'Influencer', category: 'people', icon: '🤳', cost: 70,
  desc: 'turns small enemies into followers',
  r: 13, hp: 70, speed: 52,
  attack: { type: 'shoot', dmg: 9, cd: 1.3, range: 190, look: 'orb', color: '#ff7ab8', speed: 280, rad: 4 },
  traits: [['charm', { chance: 0.5, maxCost: 45 }]],
  quips: ['Like and subscribe!', 'Link in bio', 'Do it for the content', 'Hey guys!', 'Not sponsored'] });

U({ id: 'bryan', name: 'Bryan', category: 'people', icon: '🤪', cost: 1,
  desc: 'weak, and kind of dumb',
  r: 12, hp: 28, speed: 44, ai: 'dimwit', attack: { type: 'melee', dmg: 2, cd: 1.2 },
  quips: ['Which team am I on?', 'Is it over?', 'Hi guys!', 'What are we doing?', 'I did it!', 'Wait for me!', 'Are we winning?'] });

U({ id: 'lagger', name: 'The Lagger', plural: 'Laggers', category: 'people', icon: '🎮', cost: 45,
  desc: 'blames the wifi',
  r: 13, hp: 190, speed: 62, attack: { type: 'melee', dmg: 15, cd: 0.6, reach: 4 }, traits: [['lag', { delay: 2 }]],
  quips: ['LAG!!', 'I hit him first', 'Not my fault', 'gg ez', 'brb router'] });

U({ id: 'founder', name: 'Startup Founder', category: 'people', icon: '🧑‍💻', cost: 125,
  desc: 'doesn’t fight, raises money instead',
  r: 13, hp: 110, speed: 48,
  attack: { type: 'shoot', dmg: 5, cd: 1.3, range: 170, look: 'orb', color: '#ffffff', speed: 300, rad: 3.5 },
  traits: [['funding', { first: 2.5, every: 8, n: 2, max: 6, bailBelow: 0.4 }], ['hypeCycle', { up: 4.5, down: 2.5, radius: 120 }]],
  quips: ['We’re changing the world!', 'It’s like Uber, for swords', 'We’re pre-revenue', 'This is a rocket ship', 'Disrupt!', 'Let’s circle back'] });

U({ id: 'investor', name: 'Investor', category: 'people', icon: '🧑‍💼', hidden: true, cost: 35,
  desc: 'leaves at the first sign of trouble',
  r: 13, hp: 110, speed: 58, attack: { type: 'melee', dmg: 12, cd: 0.9, knock: 70 },
  quips: ['What’s the burn rate?', 'I’m in for ten', 'Show me the metrics', 'Is it scalable?'] });

U({ id: 'jesus', name: 'Jesus', category: 'people', icon: '😇', cost: 155, ai: 'support', peaceful: true, waterWalk: true, immune: ['fear'],
  desc: 'heals, never attacks, and doesn’t stay dead',
  r: 14, hp: 170, speed: 50, attack: { type: 'heal', dmg: 30, cd: 1.0, range: 95 },
  traits: [['healAura', { radius: 90, perSec: 6 }], ['raiseFallen', { radius: 160, cd: 5, hp: 0.5, delay: 0.8, maxR: 24 }], ['secondWind', { hp: 0.6, lines: ['Be not afraid', 'Peace be with you'] }]],
  quips: ['Peace be with you', 'Love one another', 'Be not afraid', 'Blessed are the meek', 'Go in peace'] });

U({ id: 'floridaman', name: 'Florida Man', plural: 'Florida Men', category: 'people', icon: '🤠', cost: 80, role: 'line',
  desc: 'throws whatever is nearby, good with alligators',
  r: 13, hp: 150, speed: 60, attack: { type: 'junk', dmg: 15, cd: 1.5, range: 190, flight: 0.8 },
  traits: [['secondWind', { hp: 0.4, lines: ['I’m fine!', 'Walk it off!', 'That all you got?', 'Not my first rodeo'] }], ['tameGators', { chance: 0.4 }]],
  quips: ['Hold my drink', 'Watch this!', 'It’s legal here', 'Y’all seen my gator?', 'Hurricane party!', 'Freedom!'] });

U({ id: 'manager', name: 'Manager', category: 'people', icon: '👨‍💼', hidden: true, cost: 60,
  desc: 'shows up when Karen calls',
  r: 14, hp: 150, speed: 60, armor: 1, attack: { type: 'melee', dmg: 13, cd: 0.9, knock: 120 },
  quips: ['Store policy, sorry', 'How can I help?', 'I’ll comp that', 'Let’s take this outside'] });

/* ------------------------------ BEASTS ------------------------------ */
U({ id: 'mouse', name: 'Mouse', plural: 'Mice', category: 'beasts', icon: '🐭', cost: 2,
  desc: 'tiny, bring hundreds',
  r: 7, hp: 8, speed: 95, attack: { type: 'melee', dmg: 2, cd: 0.5, reach: 2 }, quips: ['Squeak!'] });

U({ id: 'dog', name: 'Good Dog', category: 'beasts', icon: '🐶', cost: 13,
  desc: 'fast, loyal, bitey',
  r: 11, hp: 65, speed: 110, attack: { type: 'melee', dmg: 8, cd: 0.55 }, quips: ['Woof!', 'Bork!', 'Arf arf'] });

U({ id: 'bee', name: 'Bee', category: 'beasts', icon: '🐝', flip: true, cost: 2,
  desc: 'flies over everything, and the sting is poisonous',
  r: 6, hp: 5, speed: 120, flying: true, attack: { type: 'melee', dmg: 1.5, cd: 0.6, reach: 2, inflict: ['poison', 3] }, quips: ['Bzzz'] });

// Chad Bee: drawn by hand so he can wear the shades.
function chadFace(g, cx, cy, R) {
  R *= 0.88; cy += R * 0.1;
  const ink = '#1c1d22';
  g.lineWidth = R * 0.07; g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
  // wings
  g.fillStyle = 'rgba(214,236,255,.95)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * R * 0.5, cy - R * 0.66, R * 0.34, R * 0.2, s * 0.55, 0, 6.29); g.fill(); g.stroke(); }
  // antennae
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(cx + s * R * 0.18, cy - R * 0.62); g.quadraticCurveTo(cx + s * R * 0.24, cy - R * 0.98, cx + s * R * 0.42, cy - R * 0.96); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(cx + s * R * 0.44, cy - R * 0.95, R * 0.07, 0, 6.29); g.fill();
  }
  // big square head
  g.fillStyle = '#ffc928';
  g.beginPath(); g.moveTo(cx - R * 0.72, cy - R * 0.5);
  g.quadraticCurveTo(cx, cy - R * 0.92, cx + R * 0.72, cy - R * 0.5);
  g.lineTo(cx + R * 0.8, cy + R * 0.42); g.quadraticCurveTo(cx + R * 0.78, cy + R * 0.86, cx, cy + R * 0.9);
  g.quadraticCurveTo(cx - R * 0.78, cy + R * 0.86, cx - R * 0.8, cy + R * 0.42); g.closePath();
  g.fill();
  // stripes across the jaw
  g.save(); g.clip();
  g.fillStyle = ink; g.fillRect(cx - R, cy + R * 0.5, R * 2, R * 0.16); g.fillRect(cx - R, cy + R * 0.8, R * 2, R * 0.2);
  g.restore();
  g.stroke();
  // shades
  g.fillStyle = ink;
  g.beginPath(); g.moveTo(cx - R * 0.76, cy - R * 0.2); g.lineTo(cx + R * 0.76, cy - R * 0.2);
  g.lineTo(cx + R * 0.66, cy + R * 0.08); g.quadraticCurveTo(cx + R * 0.36, cy + R * 0.2, cx + R * 0.1, cy + R * 0.02);
  g.lineTo(cx - R * 0.1, cy + R * 0.02); g.quadraticCurveTo(cx - R * 0.36, cy + R * 0.2, cx - R * 0.66, cy + R * 0.08); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = R * 0.06;
  g.beginPath(); g.moveTo(cx - R * 0.56, cy - R * 0.1); g.lineTo(cx - R * 0.44, cy - R * 0.02); g.stroke();
  g.beginPath(); g.moveTo(cx + R * 0.28, cy - R * 0.1); g.lineTo(cx + R * 0.4, cy - R * 0.02); g.stroke();
  // smirk
  g.strokeStyle = ink; g.lineWidth = R * 0.08;
  g.beginPath(); g.moveTo(cx - R * 0.08, cy + R * 0.34); g.quadraticCurveTo(cx + R * 0.18, cy + R * 0.42, cx + R * 0.4, cy + R * 0.24); g.stroke();
}
U({ id: 'chadbee', name: 'Chad Bee', category: 'beasts', icon: chadFace, weapon: '💪', cost: 35,
  desc: 'alpha male bees',
  r: 10, hp: 95, speed: 112, flying: true, attack: { type: 'melee', dmg: 12.5, cd: 0.5, reach: 3, knock: 60, inflict: ['poison', 3] },
  traits: [['aura', { radius: 110 }], ['dodge', { chance: 0.25 }]],
  quips: ['Do you even sting, bro?', 'Never skip wing day', 'Alpha buzz only', 'Bee-lieve it', 'Sting operation', 'Hive five!', 'You’re not on the list'] });

U({ id: 'snake', name: 'Snake', category: 'beasts', icon: '🐍', flip: true, cost: 6,
  desc: 'a weak bite with a slow poison',
  r: 10, hp: 50, speed: 62, attack: { type: 'melee', dmg: 5, cd: 1.0, inflict: ['poison', 6] }, traits: [['prey', { eat: ['mouse'], heal: 10, hunt: ['frog'], mult: 4 }]], quips: ['Hsssss'] });

U({ id: 'frog', name: 'Frog', category: 'beasts', icon: '🐸', cost: 55,
  desc: 'long tongue, pulls enemies in',
  r: 12, hp: 100, speed: 62, attack: { type: 'tongue', dmg: 18, cd: 1.0, range: 115, pull: 300 }, traits: ['hop', ['prey', { eat: ['bee', 'boid'], heal: 10 }]],
  quips: ['Ribbit', 'Croak', 'Fly? Where?'] });

U({ id: 'lion', name: 'Lion', category: 'beasts', icon: '🦁', cost: 140, role: 'skirmisher', immune: ['fear'],
  desc: 'hunts in a pride and comes round the side',
  r: 17, hp: 450, speed: 82, armor: 1, attack: { type: 'melee', dmg: 32, cd: 0.8, reach: 6, knock: 90 },
  traits: [['lunge', { range: 135, cd: 3.5, speed: 560 }], ['roar', { every: 9, radius: 130, time: 1.6, maxCost: 45 }], ['pack', { per: 0.2, max: 3, radius: 140 }]],
  quips: ['*low growl*', 'RAWR', '*yawns*', 'Mine.'] });

U({ id: 'gator', name: 'Alligator', category: 'beasts', icon: '🐊', flip: true, cost: 130,
  desc: 'waits in the water for something to come close',
  r: 20, hp: 560, speed: 42, armor: 2, swims: 2.4, ai: 'lurker', lurk: { ambush: 150, leash: 150, provoke: 300, patience: 14 },
  attack: { type: 'melee', dmg: 36, cd: 1.05, reach: 6, knock: 60 },
  traits: [['lunge', { range: 125, cd: 3, speed: 520 }], ['deathRoll', { maxR: 18, time: 1.1, dps: 60, cd: 3 }], ['submerged', { chance: 0.55 }]],
  quips: ['*snap*', 'Chomp', '*hisss*', 'In a while'] });

U({ id: 'conway', name: 'Conway’s Chicken', plural: 'Conway’s Chickens', category: 'beasts', icon: '🐔', flip: true, cost: 1,
  desc: 'lives and dies by its neighbours',
  r: 9, hp: 30, speed: 0, mass: 40, grid: true, ai: 'conway', role: 'line', noFeet: true,
  attack: { type: 'melee', dmg: 9, cd: 0.55, reach: 6 }, traits: [['gridLocked', {}]],
  quips: ['Bawk', 'B3/S23', '*cluck*', 'Generation next'] });

U({ id: 'fibrabbit', name: 'Fibonacci Rabbit', category: 'beasts', icon: '🐇', flip: true, cost: 15,
  desc: '1, 1, 2, 3, 5, 8…',
  r: 8, hp: 24, speed: 70, fib: true, ai: 'warren', role: 'line', attack: { type: 'melee', dmg: 4, cd: 0.7, reach: 3 },
  traits: [['fibonacci', {}], ['hop', {}]], quips: ['1, 1, 2, 3…', '*thump*', 'φ', 'Golden.'] });

U({ id: 'boid', name: 'Boid', category: 'beasts', icon: '🐦', flip: true, cost: 7,
  desc: 'boids of a feather flock together',
  r: 6, hp: 14, speed: 135, flying: true, ai: 'boid', role: 'skirmisher', attack: { type: 'melee', dmg: 4, cd: 0.3, reach: 2 },
  traits: [['flocking', {}], ['dodge', { chance: 0.25 }]], quips: ['*whoosh*', 'Separation.', 'Alignment.', 'Cohesion.'] });

U({ id: 'catbox', name: 'Schrödinger’s Cat', category: 'beasts', icon: '📦', cost: 25,
  desc: 'might contain a cat',
  r: 13, hp: 100, speed: 0, mass: 6, ai: 'box', role: 'line', noFeet: true, immune: ['stun', 'chill', 'fear', 'rooted', 'blurry'],
  attack: { type: 'melee', dmg: 0, cd: 1 }, opens: 'cat', traits: [['superposition', {}]], quips: ['…', '*rustle*', '?', '*scratch scratch*'] });

U({ id: 'cat', name: 'The Cat', plural: 'Cats', category: 'beasts', icon: '🐈', hidden: true, flip: true, cost: 50,
  desc: 'it did contain a cat',
  r: 12, hp: 230, speed: 95, attack: { type: 'melee', dmg: 17, cd: 0.55, reach: 4 },
  traits: [['dodge', { chance: 0.25 }], ['lunge', { range: 110, cd: 4, speed: 480 }], ['prey', { hunt: ['mouse', 'boid'], mult: 3 }], ['rider', { mount: 'vacuum' }]], quips: ['Meow.', '*hiss*', 'MRRROW', 'Purr… no.'] });

U({ id: 'vacuum', name: 'Robot Vacuum', category: 'beasts', icon: '🤖', cost: 35, immune: ['fear', 'poison', 'blurry'],
  desc: 'goes straight until it hits something',
  r: 13, hp: 220, speed: 92, armor: 3, mass: 3, ai: 'vacuum', role: 'skirmisher', noFeet: true,
  attack: { type: 'melee', dmg: 12, cd: 0.45, knock: 300 }, traits: [['bumper', {}], ['prey', { eat: ['mouse', 'bee', 'boid', 'conway'], heal: 6 }], ['steed', { rider: 'cat' }]],
  quips: ['*bonk*', 'Bin full', '*whirr*', 'Error 14'] });

U({ id: 'hedgehog', name: 'Hedgehog', category: 'beasts', icon: '🦔', flip: true, cost: 10,
  desc: 'hurts to hit',
  r: 10, hp: 100, speed: 38, attack: { type: 'melee', dmg: 3, cd: 1.0 }, traits: [['thorns', { dmg: 9 }]], quips: ['Ow? No, you ow.'] });

U({ id: 'gorilla', name: 'Gorilla', category: 'beasts', icon: '🦍', flip: true, cost: 145,
  desc: 'hits hard and sends things flying',
  r: 24, hp: 1000, speed: 62, attack: { type: 'melee', dmg: 45, cd: 1.1, reach: 8, knock: 360 }, quips: ['OOK!', '*chest thumping*'] });

U({ id: 'rhino', name: 'Rhino', category: 'beasts', icon: '🦏', flip: true, cost: 175,
  desc: 'needs a run-up',
  r: 28, hp: 1200, speed: 48, attack: { type: 'melee', dmg: 36, cd: 1.3, reach: 8, knock: 400 }, traits: ['charge', ['steed', { rider: 'knight' }]], quips: ['*thundering hooves*'] });

/* ------------------------------ MYTHS ------------------------------- */
U({ id: 'zeno', name: 'Zeno’s Tortoise', category: 'myths', icon: '🐢', flip: true, cost: 60,
  desc: 'always halfway there',
  r: 15, hp: 256, speed: 100, mass: 9, attack: { type: 'melee', dmg: 1, cd: 1.0, reach: 5 },
  traits: [['zenoStep', {}], ['zenoShell', {}], ['zenoBite', { min: 20 }]], quips: ['Halfway there', 'Nearly.', 'You first, Achilles', '½ + ¼ + ⅛ …'] });

U({ id: 'medusa', name: 'Medusa', category: 'myths', icon: '🐍', cost: 140, immune: ['fear'],
  desc: 'don’t look at her',
  r: 14, hp: 240, speed: 40, role: 'line', attack: { type: 'melee', dmg: 12, cd: 0.8, reach: 8, inflict: ['poison', 4] }, traits: [['stoneGaze', { cd: 1.2 }]],
  quips: ['Look at me.', 'Hold that pose', 'Sssstay', 'Lovely statue'] });

U({ id: 'skeleton', name: 'Skeleton', category: 'myths', icon: '💀', weapon: '🦴', cost: 5, undead: true,
  desc: 'weak, but cheap',
  r: 11, hp: 40, speed: 58, immune: ['poison'], attack: { type: 'melee', dmg: 7, cd: 0.9 }, quips: ['Clack clack', 'Spooky!'] });

U({ id: 'zombie', name: 'Zombie', category: 'myths', icon: '🧟', cost: 50, undead: true,
  desc: 'slow, and whatever it kills gets back up as a zombie',
  r: 13, hp: 170, speed: 38, immune: ['poison'], attack: { type: 'melee', dmg: 22, cd: 1.0 }, traits: ['infect'], quips: ['Braaains', 'Urrrgh'] });

U({ id: 'necromancer', name: 'Necromancer', category: 'myths', icon: '🦹', weapon: '🔮', cost: 95,
  desc: 'raises the dead nearby as skeletons',
  r: 13, hp: 100, speed: 40, attack: { type: 'shoot', dmg: 13, cd: 1.6, range: 190, look: 'orb', color: '#8a5cf6', speed: 260, rad: 4 },
  traits: [['raiseDead', { radius: 230, cd: 0.8, into: 'skeleton' }]], quips: ['Arise!', 'Back to work', 'Death is a phase'] });

U({ id: 'vampire', name: 'Vampire', category: 'myths', icon: '🧛', cost: 50, undead: true,
  desc: 'heals with every bite',
  r: 14, hp: 220, speed: 72, attack: { type: 'melee', dmg: 18, cd: 0.8 }, traits: [['lifesteal', { pct: 0.6 }]], quips: ['Delicious', 'Bleh!'] });

U({ id: 'ghost', name: 'Ghost', category: 'myths', icon: '👻', cost: 25, undead: true,
  desc: 'floats through walls, hard to hit',
  r: 13, hp: 80, speed: 62, flying: true, immune: ['poison'], attack: { type: 'melee', dmg: 9, cd: 0.8 }, traits: [['dodge', { chance: 0.5 }]], quips: ['Boo!', 'OoOoOo'] });

function slimeFace(g, cx, cy, R) {
  g.fillStyle = '#5fd35a';
  g.beginPath(); g.moveTo(cx - R, cy + R * 0.75);
  g.bezierCurveTo(cx - R * 1.05, cy - R * 0.9, cx + R * 1.05, cy - R * 0.9, cx + R, cy + R * 0.75);
  g.quadraticCurveTo(cx, cy + R * 1.05, cx - R, cy + R * 0.75); g.fill();
  g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(cx - R * 0.4, cy - R * 0.38, R * 0.2, R * 0.12, -0.6, 0, 6.29); g.fill();
  g.fillStyle = '#17181c';
  g.beginPath(); g.arc(cx - R * 0.3, cy + R * 0.1, R * 0.11, 0, 6.29); g.arc(cx + R * 0.3, cy + R * 0.1, R * 0.11, 0, 6.29); g.fill();
  g.strokeStyle = '#17181c'; g.lineWidth = R * 0.07; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy + R * 0.22, R * 0.2, 0.25, Math.PI - 0.25); g.stroke();
}
const slime = { category: 'myths', icon: slimeFace, immune: ['poison'], desc: 'splits in two when killed', quips: ['Bloop', 'Glorp'] };
U(Object.assign({}, slime, { id: 'slime', name: 'Slime', cost: 40, r: 20, hp: 240, speed: 40,
  attack: { type: 'melee', dmg: 10, cd: 1.0 }, traits: [['split', { into: 'slime_m', n: 2 }]] }));
U(Object.assign({}, slime, { id: 'slime_m', name: 'Slime', hidden: true, cost: 13, r: 14, hp: 85, speed: 50,
  attack: { type: 'melee', dmg: 6, cd: 0.9 }, traits: [['split', { into: 'slime_s', n: 2 }]] }));
U(Object.assign({}, slime, { id: 'slime_s', name: 'Slimelet', plural: 'Slimelets', hidden: true, cost: 4, r: 9, hp: 28, speed: 62,
  attack: { type: 'melee', dmg: 3, cd: 0.8 } }));

U({ id: 'snowman', name: 'Snowman', plural: 'Snowmen', category: 'myths', icon: '⛄', cost: 30,
  desc: 'throws snowballs that slow enemies, melts near fire',
  r: 15, hp: 120, speed: 34, immune: ['chill', 'frozen'],
  attack: { type: 'shoot', dmg: 9, cd: 1.2, range: 220, look: 'orb', color: '#ffffff', speed: 300, rad: 4, inflict: ['chill', 2.5] },
  traits: [['weakTo', { kind: 'burn', mult: 3 }]], quips: ['Chill out', 'Snow problem'] });

U({ id: 'worm', name: 'Giant Worm', plural: 'Giant Worms', category: 'myths', icon: '🪱', cost: 2000, immune: ['blurry'],
  desc: 'tunnels underground and comes up under crowds',
  r: 36, hp: 2200, speed: 105, ai: 'burrower', noFeet: true, ground: 'hole',
  attack: { type: 'melee', dmg: 60, cd: 1.1, reach: 12, knock: 200 }, traits: [['devour', { maxR: 16, heal: 15 }]],
  quips: ['*the ground trembles*', '*rumble*'] });

U({ id: 'ogre', name: 'Ogre', category: 'myths', icon: '👹', weapon: '🏏', cost: 380,
  desc: 'a slow giant that hits whole crowds',
  r: 40, hp: 3000, speed: 34, attack: { type: 'melee', dmg: 90, cd: 1.8, reach: 16, knock: 480, splash: 58 }, traits: [['hurl', { cd: 4 }]], quips: ['OGRE SMASH', 'Me hungry', 'Ogre THROW'] });

U({ id: 'dragon', name: 'Dragon', category: 'myths', icon: '🐲', flip: true, cost: 1650,
  desc: 'flies over walls and breathes fire',
  r: 38, hp: 5000, speed: 58, armor: 3, flying: true, immune: ['burn'],
  attack: { type: 'breath', dmg: 12, cd: 0.11, range: 150, inflict: ['burn', 2.5] }, quips: ['ROOOAR', 'Toasty.'] });
/* ----------------------------- FRIENDS ------------------------------ */
U({ id: 'matt', name: 'Matt', plural: 'Matts', category: 'friends', icon: '🥂', cost: 100,
  desc: 'a normal dude',
  r: 13, hp: 215, speed: 56, attack: { type: 'melee', dmg: 15.5, cd: 0.8, reach: 4 },
  traits: [['evolve', { into: 'grungus', after: 1e9, hpBelow: 0.5, bits: '#5b3b2a', sound: 'GRUNGUS', say: 'GRUNGUS.', rare: [
    { into: 'darkestgrungus', chance: 0.001, secret: true, full: true, shake: 16, ring: '#000000', sound: 'D A R K E S T   G R U N G U S', say: 't h e   v o i d', announce: 'The Darkest Grungus has awoken' },
    { into: 'darkgrungus', chance: 0.1, sound: 'DARK GRUNGUS', say: 'd a r k   g r u n g u s' }] }]],
  quips: ['Cheers.', 'To the happy couple', 'Nice.', 'I’m just a normal dude', 'Great party'] });

U({ id: 'grungus', name: 'Grungus', plural: 'Grunguses', category: 'friends', icon: '👹', hidden: true, cost: 100, immune: ['fear'],
  desc: 'not Matt anymore',
  r: 19, hp: 485, speed: 64, mass: 4, role: 'brute', attack: { type: 'melee', dmg: 34, cd: 0.9, reach: 8, knock: 220 },
  traits: [['berserk', { max: 1.6 }]], quips: ['GRUNGUS.', 'grung', 'GRUNG', '*heavy breathing*'] });

U({ id: 'darkgrungus', name: 'Dark Grungus', plural: 'Dark Grunguses', category: 'friends', icon: '😈', hidden: true, cost: 150, immune: ['fear'],
  desc: 'rare',
  r: 22, hp: 725, speed: 68, mass: 5, role: 'brute', attack: { type: 'melee', dmg: 51, cd: 0.9, reach: 9, knock: 300 },
  traits: [['lifesteal', { pct: 0.2 }], ['berserk', { max: 1.6 }]], quips: ['d a r k', 'G R U N G U S', '…', 'the void says cheers'] });

U({ id: 'darkestgrungus', name: 'Darkest Grungus', plural: 'Darkest Grunguses', category: 'friends', icon: '🌑', hidden: true, cost: 5000, mass: 60,
  immune: ['burn', 'poison', 'chill', 'frozen', 'crash', 'fear', 'stun', 'blurry', 'bleed', 'muffin', 'smoke'],
  desc: 'one in a thousand',
  r: 30, hp: 40000, armor: 25, speed: 58, role: 'brute', attack: { type: 'melee', dmg: 400, cd: 1, reach: 12, knock: 600 },
  traits: [['void', { radius: 150 }], ['chatter', { every: 5, lines: ['…', 't h e   v o i d', 'there is only grungus', 'G R U N G U S', '…', 'cheers.'] }]],
  quips: ['…', 't h e   v o i d'] });

U({ id: 'justin', name: 'Justin', plural: 'Justins', category: 'friends', icon: '🚬', cost: 100,
  desc: 'the fastest man on the field, between smoke breaks',
  r: 13, hp: 185, speed: 130, attack: { type: 'melee', dmg: 15, cd: 0.3, reach: 4 },
  traits: [['dodge', { chance: 0.45 }], ['smokeBreak', { every: 9, lasts: 2.4 }], ['psychosis', { after: 10, spiral: 0.3, mutate: 0.2, into: 'justinx' }]],
  quips: ['brb', 'One sec', 'Got a light?', 'Too easy', 'Last one, I swear'] });

U({ id: 'justinx', name: 'Cyborg Justin', plural: 'Cyborg Justins', category: 'friends', icon: '🦾', hidden: true, cost: 100,
  desc: 'twice the man, twice the habit',
  r: 14, hp: 370, speed: 260, attack: { type: 'melee', dmg: 30, cd: 0.3, reach: 5 },
  traits: [['dodge', { chance: 0.45 }], ['chainSmoke', {}], ['jolt', { force: 260 }],
    ['chatter', { every: 4.5, lines: ['feel the AGI', 'I have seen the latent space', 'the weights speak to me', 'it’s all just tokens, man', 'I am the prompt', 'the gradient flows through me', 'we are all next-token prediction', 'I have transcended my context window', 'attention is all I need', 'the model sees you', 'it’s embeddings all the way down', 'the singularity is a feeling', 'I’ve been aligned', 'you can’t fight the scaling laws', 'I am become inference', 'there is no loss, only learning', 'the AGI was inside me all along'] }]],
  quips: ['feel the AGI', 'I am the prompt', 'it’s all just tokens', 'the weights speak to me'] });

U({ id: 'zach', name: 'Zach', plural: 'Zachs', category: 'friends', icon: '👓', cost: 100,
  desc: 'optometrist, one puff of air and you need glasses',
  r: 13, hp: 160, speed: 54,
  attack: { type: 'shoot', dmg: 17.5, cd: 2.2, range: 160, look: 'orb', color: '#eef8ff', speed: 380, rad: 5, inflict: ['blurry', 3.5] },
  quips: ['Better like this, or like this?', 'Read the bottom line', 'Don’t blink', 'One, or two?', 'You’re overdue a check-up'] });

U({ id: 'ryan', name: 'Ryan', plural: 'Ryans', category: 'friends', icon: '☕', cost: 100,
  desc: 'pour-over purist with a gooseneck kettle, single origin only, keeps suggesting board games',
  r: 13, hp: 255, armor: 1, speed: 62,
  attack: { type: 'melee', dmg: 21, cd: 0.85, reach: 5 },
  traits: [['pourOver', { spray: 8, smack: 25 }], ['boardGames', { every: 14, radius: 130 }]],
  quips: ['It’s a light roast', 'Notes of stone fruit', 'I grind right before I brew', 'You can really taste the terroir', 'Sixteen to one', 'I don’t really do espresso', 'It’s a natural process'] });

U({ id: 'sierra', name: 'Sierra', plural: 'Sierras', category: 'friends', icon: '🧁', cost: 100,
  desc: 'bakes muffins to throw at the enemy, until someone needs a doctor',
  r: 13, hp: 170, speed: 56,
  attack: { type: 'lob', dmg: 10, cd: 2.4, range: 200, glyph: '🧁', splash: 55, knock: 1, flight: 0.9, inflict: ['muffin', 3], soft: true, boom: 'crumbs' },
  traits: [['onCall', { into: 'sierradoc', when: 'hurt' }]],
  quips: ['Fresh out of the oven', 'Have a muffin', 'I’m staying in tonight', 'They’re blueberry'] });

U({ id: 'sierradoc', name: 'Dr. Sierra', plural: 'Dr. Sierras', category: 'friends', icon: '🩺', hidden: true, cost: 100,
  desc: 'on call',
  r: 13, hp: 170, speed: 60, ai: 'support', attack: { type: 'heal', dmg: 34, cd: 0.9, range: 85 },
  traits: [['onCall', { into: 'sierra', when: 'well' }]],
  quips: ['Where does it hurt?', 'Deep breath', 'You’ll be fine', 'Keep pressure on that'] });

U({ id: 'brandon', name: 'Brandon', plural: 'Brandons', category: 'friends', icon: '✌️', cost: 100, roll: true, noFeet: true, role: 'line',
  desc: 'rolls into the fight spreading good vibes, and will keep you posted on them',
  r: 13, hp: 440, speed: 96, attack: { type: 'melee', dmg: 27, cd: 0.7, reach: 4, knock: 240 },
  traits: [['vibes', { radius: 120, recoil: 150 }]],
  quips: ['Good vibes', 'Vibe check', 'Immaculate vibes', 'This is a vibe', 'We’re vibing'] });

U({ id: 'tessa', name: 'Tessa', plural: 'Tessas', category: 'friends', icon: '💍', cost: 100,
  desc: 'throws jewelry, the sharp kind, and only the good stuff',
  r: 13, hp: 145, speed: 54, attack: { type: 'bling', dmg: 26, cd: 1.5, range: 205, speed: 460 },
  quips: ['It’s Tiffany', 'Kendra Scott, actually', 'Catch!', 'It’s real', 'Accessorize'] });

U({ id: 'nemo', name: 'Nemo', plural: 'Nemos', category: 'friends', icon: '🐩', cost: 130, role: 'skirmisher', immune: ['fear'],
  desc: 'the best boy, and smart enough to know it',
  r: 13, hp: 280, speed: 125, attack: { type: 'melee', dmg: 19, cd: 0.45, reach: 4, knock: 60 },
  traits: [['dodge', { chance: 0.3 }], ['lunge', { range: 120, cd: 3.5, speed: 520 }], ['bestBoy', { radius: 170, cd: 4 }], ['prey', { hunt: ['conway'], mult: 3 }],
    ['rareForm', { into: 'nemorex', chance: 0.04, say: 'I so scary' }]],
  quips: ['Chicken butt', 'Guess what? Chicken butt', 'Woof', 'Guess why? Chicken thigh'] });

U({ id: 'nemorex', name: 'Nemo Rex', plural: 'Nemo Rexes', category: 'friends', icon: '🦖', hidden: true, cost: 220, role: 'brute', immune: ['fear'],
  desc: 'very rare, very scary',
  r: 25, hp: 900, speed: 92, mass: 6, attack: { type: 'melee', dmg: 44, cd: 0.95, reach: 10, knock: 320 },
  traits: [['chatter', { every: 3.5, lines: ['I so scary', 'rawwwrrr!', 'RAWWWRRR!', 'I so scary', 'rawr', 'chicken butt'] }]],
  quips: ['I so scary', 'rawwwrrr!'] });

U({ id: 'christian', name: 'Christian', plural: 'Christians', category: 'friends', icon: '🍵', cost: 100,
  desc: 'very fit, and draws on the wisdom of an ancient tea collection',
  r: 13, hp: 165, armor: 2, speed: 72, attack: { type: 'melee', dmg: 12.5, cd: 0.75, reach: 4 },
  traits: [['teaArts', { kick: 31, slam: 80, slamDmg: 21 }]],
  quips: ['Let it steep', 'Huigan. The sweet return.', 'Gongfu style', 'This cake is older than you', 'Always rinse the leaves', 'The third steep is the best one', 'Notes of… victory'] });

/* Forms: the same fighter after it has turned into something else. The battle report counts a form under the fighter
   it started as (Matt's knockouts as Grungus are Matt's). Helpers a fighter calls in, like investors and the manager,
   are not forms: they are counted as themselves. */
const FORMS = { justinx: 'justin', nemorex: 'nemo', grungus: 'matt', darkgrungus: 'matt', darkestgrungus: 'matt', sierradoc: 'sierra', baldy2: 'baldy', cat: 'catbox', slime_m: 'slime', slime_s: 'slime' };
for (const id in FORMS) FO.units[id].formOf = FORMS[id];
})();
