/* =====================================================================
   SVG WARS · boot + main loop
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, view = FO.view;

FO.unitList.forEach(FO.prepUnit);
FO.initUI();
FO.syncUI();

let last = performance.now(), acc = 0, hudT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (world.mode === 'running') {
    acc += dt * FO.ui.speed;
    let n = 0;
    while (acc >= FO.DT && n < 10 && world.mode === 'running') { FO.step(FO.DT); acc -= FO.DT; n++; }
    if (n === 10) acc = 0;
    FO.updateFx(dt * FO.ui.speed);
  } else {
    acc = 0;
    if (world.mode !== 'paused') { for (const u of world.units) u.moving = false; FO.updateFx(dt); }
    world.rebuildGrid();
  }
  FO.updatePointer();
  FO.render(view);
  hudT -= dt;
  if (hudT <= 0) { FO.updateTally(); hudT = 0.12; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(() => { FO.fitView(); requestAnimationFrame(frame); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => FO.fitView());

/* Hooks for automated tests (and for poking at things from the console). */
FO.test = {
  clear() { FO.clearField(); FO.syncUI(); },
  start() { const r = FO.startBattle(); FO.syncUI(); return r; },
  speed(v) { FO.ui.speed = v; },
  ffa(v) { FO.setMode(v ? 'ffa' : 'teams'); },
  mode(m) { FO.setMode(m); },
  spawn(id, x, y, team) { world.rebuildGrid(); return !!FO.spawn(id, x, y, team); },
  build(fn) { world.rebuildGrid(); fn(FO.builder()); },
  state() {
    return { mode: world.mode, t: world.time, alive: world.units.length, byTeam: FO.teams.map((_, i) => world.units.filter(u => u.team === i).length),
      result: world.result ? world.result.kind : null, shots: world.shots.length, fx: world.fx.length };
  },
  // run the simulation flat out, without rendering, until it ends or `seconds` of battle time pass
  renderMs(n) { const t0 = performance.now(); for (let i = 0; i < n; i++) FO.render(FO.view); return (performance.now() - t0) / n; },
  run(seconds) {
    const t0 = performance.now(); let steps = 0;
    while (world.mode === 'running' && world.time < seconds) { FO.step(FO.DT); steps++; }
    return { ms: performance.now() - t0, steps };
  },
};
})();
