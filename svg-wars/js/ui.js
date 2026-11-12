/* =====================================================================
   SVG WARS · interface
   Palette, toolbars, painting, camera, scoreboard.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, W = FO.W, H = FO.H, T = FO.TILE;
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

const ui = FO.ui = {
  tab: 'people',
  sel: { kind: 'unit', id: 'peasant' },   // unit | terrain | power
  team: 0, brush: 36, erase: false, recolor: false, keep: false, speed: 1,
};
const canvas = $('stage');
const view = FO.view = { canvas, ctx: canvas.getContext('2d'), dpr: 1, vw: 0, vh: 0, cam: { x: 0, y: 0, z: 1 }, hover: null, cursor: null, hoverUnit: null };

/* ---------- small helpers ---------- */
let toastTimer = 0;
FO.toast = function (msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
};
function tokenImg(def, team) {
  const spr = FO.portrait(def, team);
  if (!spr._url) spr._url = spr.toDataURL();
  const img = new Image(); img.alt = ''; img.src = spr._url; img.draggable = false;
  return img;
}
FO.tokenImg = tokenImg;
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const selDef = () => ui.sel.kind === 'unit' ? FO.units[ui.sel.id] : ui.sel.kind === 'terrain' ? FO.terrainById[ui.sel.id] : ui.sel.kind === 'prop' ? FO.props[ui.sel.id] : ui.sel.kind === 'nature' ? FO.natures[ui.sel.id] : FO.powers.find(p => p.id === ui.sel.id);
function natureGlyph(n) {
  const g = el('span', 'glyph line');
  g.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${n.icon}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return g;
}
function propImg(def) { const i = new Image(); i.alt = ''; i.draggable = false; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(def.art); return i; }

/* =====================================================================
   TOYBOX
   ===================================================================== */
// The fighter strip scrolls sideways: arrows and faded edges show when there is more, and a mouse wheel scrolls it.
function syncStrip() {
  const c = $('cards'), s = c.parentNode;
  s.classList.toggle('more-l', c.scrollLeft > 4); s.classList.toggle('more-r', c.scrollLeft < c.scrollWidth - c.clientWidth - 4);
}
function unitsIn(cat) { return FO.unitList.filter(u => u.category === cat && !u.hidden); }

function renderTabs() {
  const box = $('tabs'); box.innerHTML = '';
  let into = box, group = null;
  for (const c of FO.categories) {
    if ((c.group || null) !== group) { group = c.group || null; into = box; if (group) { into = el('span', 'tabgroup'); into.setAttribute('role', 'presentation'); box.append(into); } }
    const b = el('button', null, c.name);
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(ui.tab === c.id));
    b.addEventListener('click', () => { ui.tab = c.id; renderTabs(); renderCards(); $('cards').scrollLeft = 0; FO.audio.play('click'); });
    into.append(b);
  }
  const on = box.querySelector('[aria-selected="true"]');
  if (on && box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, on.offsetLeft - box.offsetLeft - (box.clientWidth - on.offsetWidth) / 2);
}

function card(kind, id, visual, name, sub) {
  const b = el('button', 'unitcard');
  b.dataset.kind = kind; b.dataset.id = id;
  b.setAttribute('aria-pressed', String(ui.sel.kind === kind && ui.sel.id === id));
  b.append(visual, el('span', 'nm', name));
  if (sub != null) b.append(el('span', 'ct', sub));
  b.addEventListener('click', () => { if (performance.now() - dragEndT > 250) select(kind, id); });
  b.addEventListener('pointerdown', e => { if (e.button === 0) cardDrag = { kind, id, visual, x0: e.clientX, y0: e.clientY, pid: e.pointerId, touch: e.pointerType !== 'mouse', ghost: null }; });
  return b;
}
// Drag a card out of the strip and drop it on the field: the same as picking it and clicking there. A mouse drag
// starts in any direction; a finger has to pull upward, because sideways scrolls the strip.
let cardDrag = null, dragEndT = 0;
const overField = e => document.elementFromPoint(e.clientX, e.clientY) === canvas;
const fieldPoint = e => { const r = canvas.getBoundingClientRect(); return toWorld(e.clientX - r.left, e.clientY - r.top); };
function endCardDrag(e, drop) {
  const d = cardDrag; cardDrag = null;
  if (!d || !d.ghost) return;
  d.ghost.remove(); document.body.classList.remove('dragging');
  dragEndT = performance.now();
  view.hover = null;
  if (drop && overField(e)) { beginStroke(fieldPoint(e)); endStroke(); }
}
window.addEventListener('pointermove', e => {
  const d = cardDrag; if (!d || e.pointerId !== d.pid) return;
  if (!d.ghost) {
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (d.touch ? !(dy < -14 && -dy > Math.abs(dx)) : Math.hypot(dx, dy) < 8) return;
    select(d.kind, d.id); closePops();
    d.ghost = el('div', 'unitcard dragghost'); d.ghost.append(d.visual.cloneNode(true));
    document.body.append(d.ghost); document.body.classList.add('dragging');
  }
  d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
  const on = overField(e);
  d.ghost.classList.toggle('over', on);
  view.hover = on ? fieldPoint(e) : null;
});
window.addEventListener('pointerup', e => { if (cardDrag && e.pointerId === cardDrag.pid) endCardDrag(e, true); });
window.addEventListener('pointercancel', e => { if (cardDrag && e.pointerId === cardDrag.pid) endCardDrag(e, false); });

function renderCards() {
  const box = $('cards'); box.innerHTML = '';
  requestAnimationFrame(syncStrip);
  $('keepChip').hidden = ui.tab !== 'terrain';
  $('ctxTeams').hidden = ui.tab === 'terrain' || ui.tab === 'powers' || ui.tab === 'nature';     // team colours only matter for fighters
  if (ui.tab === 'terrain') {
    for (const t of FO.terrain) {
      if (!t || t.hidden) continue;
      const sw = el('span', 'swatch'); sw.style.background = t.color; sw.style.borderColor = t.edge || '#1c1d22';
      box.append(card('terrain', t.id, sw, t.name));
    }
    for (const p of FO.propList) box.append(card('prop', p.id, propImg(p), p.name));
  } else if (ui.tab === 'nature') {
    for (const n of FO.natureList) box.append(card('nature', n.id, natureGlyph(n), n.name));
  } else if (ui.tab === 'powers') {
    for (const p of FO.powers) box.append(card('power', p.id, el('span', 'glyph', p.icon), p.name));
  } else {
    for (const u of unitsIn(ui.tab)) {
      const c = card('unit', u.id, tokenImg(u, ui.team), u.name, String(u.cost));
      c.title = u.desc;
      box.append(c);
    }
  }
}

function bar(label, frac, text) {
  const track = el('span', 'track'); const i = el('i'); i.style.width = Math.round(FO.clamp(frac, 0.03, 1) * 100) + '%'; track.append(i);
  return [el('span', null, label), track, el('span', 'v', text)];
}
function renderInfo() {
  const box = $('info'); box.innerHTML = '';
  const d = selDef(), sb = $('selBtn'); sb.innerHTML = '';
  if (!d) return;
  sb.append(el('span', 'nm', d.name));
  if (ui.sel.kind === 'unit') sb.append(el('span', 'ct', String(d.cost)));
  sb.append(el('i', 'i', 'i'));
  const head = el('div', 'head'), titles = el('div');
  if (ui.sel.kind === 'unit') head.append(tokenImg(d, ui.team));
  else if (ui.sel.kind === 'terrain') { const sw = el('span', 'swatch'); sw.style.background = d.color; sw.style.borderColor = d.edge; head.append(sw); }
  else if (ui.sel.kind === 'prop') head.append(propImg(d));
  else if (ui.sel.kind === 'nature') head.append(natureGlyph(d));
  else head.append(el('span', 'glyph', d.icon));
  titles.append(el('h2', null, d.name));
  if (ui.sel.kind === 'unit') titles.append(el('span', 'cost', `${d.cost} points`));
  head.append(titles); box.append(head);
  box.append(el('p', null, ui.sel.kind === 'power' ? d.desc + ' Click the battlefield during a fight.' : d.desc));
  if (ui.sel.kind === 'nature') box.append(el('p', 'note', 'Paint it over fighters. A few have a mind of their own and ignore it.'));
  if (ui.sel.kind !== 'unit') return;

  const sd = d.opens ? FO.units[d.opens] : d;            // a box shows what might be inside it
  if (sd !== d) box.append(el('p', 'note', `Half the time, out comes ${sd.name.toLowerCase()}:`));
  const a = sd.attack, heals = a.type === 'heal', boom = sd.traits.find(t => t.id === 'volatile');
  const dps = (boom ? boom.p.dmg : a.dmg) / (boom ? 1 : a.cd) * (a.type === 'breath' ? 2 : 1);
  const bars = el('div', 'bars');
  bars.append(...bar('Health', Math.log(sd.hp) / Math.log(3000), String(sd.hp)));
  bars.append(...bar(heals ? 'Healing' : 'Damage', Math.log(1 + dps) / Math.log(240), boom ? `${Math.round(dps)} blast` : `${dps < 10 ? dps.toFixed(1) : Math.round(dps)}/s`));
  bars.append(...bar('Speed', sd.speed / 125, String(Math.round(sd.speed))));
  bars.append(...bar('Reach', a.range ? a.range / 560 : 0.03, a.range ? String(a.range) : 'Melee'));
  box.append(bars);

  const chips = el('div', 'chips');
  const add = (label, tip) => { const c = el('span', 'chip', label); if (tip) c.title = tip; chips.append(c); };
  if (d.flying) add('Flies', 'Ignores walls and terrain');
  if (d.armor) add('Armour ' + d.armor, `Every hit does ${d.armor} less`);
  if (a.type === 'lob') add('Lobs over walls'); if (a.type === 'zap') add('Chain lightning');
  if (a.splash && a.type === 'melee') add('Hits a crowd'); if (a.knock >= 200) add('Knockback');
  if (a.inflict) add((FO.statuses[a.inflict[0]] || {}).name ? 'Inflicts ' + FO.statuses[a.inflict[0]].name.toLowerCase() : a.inflict[0]);
  for (const t of d.traits) { const impl = FO.traits[t.id]; if (impl && impl.label) add(impl.label, impl.desc ? impl.desc(t.p) : ''); }
  if (chips.children.length) box.append(chips);
}

function select(kind, id) {
  ui.sel = { kind, id };
  if (ui.erase) setErase(false);
  if (ui.recolor) setRecolor(false);
  document.querySelectorAll('#cards .unitcard').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === kind && b.dataset.id === id)));
  renderInfo();
  FO.audio.play('click');
}
FO.select = select;

let dirtyUnits = false;
FO.on('units-changed', () => {
  if (dirtyUnits) return; dirtyUnits = true;
  requestAnimationFrame(() => {
    dirtyUnits = false;
    if (ui.sel.kind === 'unit' && !FO.units[ui.sel.id]) ui.sel = { kind: 'unit', id: 'peasant' };
    renderTabs(); renderCards(); renderInfo();
  });
});

/* =====================================================================
   TOOLBARS
   ===================================================================== */
function buildTeams() {
  const box = $('teams'); box.innerHTML = '';
  FO.teams.forEach((tm, i) => {
    const b = el('button', 'team'); b.style.background = tm.color;
    b.title = `${tm.name} team (${i + 1})`; b.setAttribute('aria-label', `${tm.name} team`); b.setAttribute('aria-pressed', String(ui.team === i));
    b.dataset.key = String(i + 1);
    b.addEventListener('click', () => setTeam(i));
    box.append(b);
  });
}
function setTeam(i) {
  ui.team = i;
  document.querySelectorAll('#teams .team').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  renderCards(); renderInfo();
}
function syncTool() {
  $('eraseBtn').setAttribute('aria-pressed', String(ui.erase)); $('recolorBtn').setAttribute('aria-pressed', String(ui.recolor));
}
function setErase(v) { ui.erase = v; if (v) ui.recolor = false; syncTool(); }
function setRecolor(v) { ui.recolor = v; if (v) ui.erase = false; syncTool(); }
const MODE_BTNS = { teams: 'modeTeams', units: 'modeUnits', ffa: 'modeFFA' };
const MODE_NAMES = { teams: 'Teams', units: 'Units', ffa: 'Free-for-all' };
function syncModeBtns() {
  for (const [m, id] of Object.entries(MODE_BTNS)) $(id).setAttribute('aria-pressed', String(world.fightMode === m));
}
function setMode(m) {
  if (world.mode !== 'edit') return;
  FO.setMode(m); syncModeBtns(); updateTally(true); FO.toast(MODE_NAMES[m] + (m === 'teams' ? ': same colour fights together' : m === 'units' ? ': every kind of fighter is its own side' : ': every fighter for themselves'));
}
function buildSpeeds() {
  const box = $('speeds');
  [[0.5, '½×'], [1, '1×'], [2, '2×'], [4, '4×']].forEach(([v, label]) => {
    const b = el('button', null, label); b.dataset.v = v; b.title = `Speed ${label}`;
    b.setAttribute('aria-pressed', String(v === ui.speed));
    b.addEventListener('click', () => { ui.speed = v; box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.v === v))); });
    box.append(b);
  });
}
// A small picture of each scenario: terrain blocks and a dot per fighter. Built once at start-up, while the field is empty.
function makeThumbs() {
  const TW = 240, k = TW / W, TH = Math.round(H * k), TC = world.TC;
  for (const sc of FO.scenarios) {
    FO.loadScenario(sc);
    const c = document.createElement('canvas'); c.width = TW * 2; c.height = TH * 2;
    const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = '#adbd9c'; g.fillRect(0, 0, TW, TH);
    for (let i = 0; i < world.tiles.length; i++) {
      const t = world.tiles[i]; if (!t) continue;
      g.fillStyle = FO.terrain[t].id === 'trees' ? '#3fae5a' : FO.terrain[t].color;
      g.fillRect((i % TC) * T * k, ((i / TC) | 0) * T * k, T * k + 0.4, T * k + 0.4);
    }
    for (const p of world.props) { g.fillStyle = p.def.id === 'barrel' ? '#d6453a' : p.def.id === 'banana' ? '#e6c02e' : '#6b6f78'; g.beginPath(); g.arc(p.x * k, p.y * k, Math.max(1.5, p.def.r * k), 0, 6.29); g.fill(); }
    for (const u of world.units) {
      g.fillStyle = FO.teams[u.team].color;
      g.beginPath(); g.arc(u.x * k, u.y * k, Math.max(1.3, u.def.r * k * 0.9), 0, 6.29); g.fill();
    }
    sc._thumb = c;
  }
  FO.clearField(); FO.setMode('teams');
}
function scenarioCard(sc) {
  const b = el('button', 'sc');
  const c = document.createElement('canvas'); c.width = sc._thumb.width; c.height = sc._thumb.height; c.getContext('2d').drawImage(sc._thumb, 0, 0);
  b.append(c, el('b', null, sc.name), el('span', null, sc.blurb));
  const mode = sc.mode || 'teams';
  if (mode !== 'teams') b.append(el('span', 'tag', MODE_NAMES[mode]));
  b.addEventListener('click', () => { pushUndo(); FO.loadScenario(sc); togglePop('battles', false); fitView(); FO.audio.play('click'); });
  return b;
}
function buildBattles() {
  const box = $('battles'); box.innerHTML = '';
  const x = el('button', 'round close', '×'); x.setAttribute('aria-label', 'Close'); x.addEventListener('click', () => togglePop('battles', false));
  box.append(x, el('h3', null, 'Scenarios'), el('p', 'lead', 'Ready-made battlefields. Press Fight, or repaint them into something of your own.'));
  const grid = el('div', 'scgrid');
  for (const sc of FO.scenarios) grid.append(scenarioCard(sc));
  box.append(grid);
}
const POPS = ['battles', 'help', 'brushPop', 'menuPop', 'info', 'clearPop'];
const ANCHOR = { brushPop: 'brushBtn', info: 'selBtn' }, POP_BTN = { brushPop: 'brushBtn', menuPop: 'menuBtn', info: 'selBtn' };
function closePops() { for (const id of POPS) togglePop(id, false); }
function togglePop(id, show) {
  const p = $(id), on = show == null ? p.classList.contains('hidden') : show;
  for (const other of POPS) if (other !== id) $(other).classList.add('hidden');
  p.classList.toggle('hidden', !on);
  const anchor = ANCHOR[id];
  if (on && anchor) {            // these open just above the dock, lined up with their button
    const a = $(anchor).getBoundingClientRect(), box = $('arena').getBoundingClientRect(), dock = $('dock').getBoundingClientRect();
    if (a.bottom < dock.top - 8) {     // the button floats beside the field (wide screens): open next to it
      p.style.bottom = 'auto'; p.style.top = FO.clamp(a.top - box.top - 8, 8, Math.max(8, box.height - p.offsetHeight - 8)) + 'px';
      p.style.left = (a.right - box.left + 12) + 'px';
    } else {
      p.style.top = 'auto'; p.style.bottom = (box.bottom - dock.top + 8) + 'px';
      p.style.left = FO.clamp(a.left - box.left, 8, Math.max(8, box.width - p.offsetWidth - 8)) + 'px';
    }
  }
  for (const [pop, btn] of Object.entries(POP_BTN)) $(btn).setAttribute('aria-expanded', String(!$(pop).classList.contains('hidden')));
}

function syncUI() {
  const f = $('fightBtn'), m = world.mode;
  f.textContent = m === 'edit' ? 'Fight!' : m === 'running' ? 'Pause' : m === 'paused' ? 'Resume' : 'Again!';
  f.classList.toggle('running', m === 'running');
  f.classList.toggle('again', m === 'over');
  f.classList.toggle('idle', m === 'edit' && world.units.length > 0);
  $('resetBtn').disabled = !world.snap;
  $('balanceBtn').disabled = $('railBalance').disabled = world.fightMode === 'ffa' || m === 'running' || m === 'paused';
  $('genBtn').disabled = m === 'running' || m === 'paused';
  $('railDouble').disabled = $('doubleBtn').disabled = m === 'running' || m === 'paused';
  $('undoBtn').disabled = m !== 'edit' || !undo.length;
  for (const id of Object.values(MODE_BTNS)) $(id).disabled = m !== 'edit';
  const dock = $('dock'), battle = m !== 'edit';
  if (dock.classList.contains('battle') !== battle) {       // the toybox folds away when a fight starts and comes back afterwards
    dock.classList.toggle('battle', battle); setDock(!battle);
    if (battle) for (const id of ['brushPop', 'info']) togglePop(id, false);
  }
  syncModeBtns();
  if (m !== 'over') $('results').classList.add('hidden');
  updateTally(true);
}
FO.syncUI = syncUI;

let lastFit = null;
function setDock(open) {
  const dock = $('dock'), untouched = lastFit && lastFit.x === view.cam.x && lastFit.y === view.cam.y && lastFit.z === view.cam.z;
  dock.classList.toggle('shut', !open); $('dockToggle').setAttribute('aria-expanded', String(open)); $('dockToggle').textContent = open ? 'Hide toybox' : 'Toybox';
  requestAnimationFrame(syncStrip);
  if (untouched || !lastFit) fitView();                     // re-frame the field, unless the view has been moved by hand
}
function fight() {
  FO.audio.unlock();
  const m = world.mode;
  if (m === 'edit') {
    const r = FO.startBattle();
    if (r === 'empty') FO.toast('Paint some fighters first');
    else if (r === 'one-team') FO.toast('Only one team so far. Pick another colour and paint an enemy.');
    else if (r === 'ffa-one') FO.toast('A free-for-all needs at least two fighters');
    else if (r === 'units-one') FO.toast('Units mode needs at least two different kinds of fighter');
  } else if (m === 'running') world.mode = 'paused';
  else if (m === 'paused') world.mode = 'running';
  else if (m === 'over') { const mode = world.snapMode; FO.resetBattle(); FO.setMode(mode); FO.startBattle(); }
  syncUI();
}
// Balance and Generate work on the painted field, so a finished battle is put back first.
function toEdit() { if (world.mode !== 'edit') { const mode = world.snapMode; FO.resetBattle(); FO.setMode(mode); } }
function balance() {
  toEdit();
  if (world.fightMode === 'ffa') { FO.toast('Free-for-all has no sides to balance'); return; }
  const before = world.snapshot(), r = FO.balance();
  if (r.err === 'one') { FO.toast(world.fightMode === 'units' ? 'Paint at least two kinds of fighter first' : 'Paint at least two teams first'); return; }
  undo.push(before); if (undo.length > 40) undo.shift();
  const fmt = s => (world.fightMode === 'units' ? FO.units[s.key].name : FO.teams[s.team].name) + ' ' + s.after.toLocaleString();
  FO.toast(r.added || r.removed ? `Balanced: ${r.sides.map(fmt).join(' · ')} points` : 'Already as even as it gets');
  FO.audio.play('place'); syncUI();
}
function double() {
  toEdit();
  if (!world.units.length) { FO.toast('Paint some fighters first'); return; }
  pushUndo();
  const r = FO.multiply();
  if (!r.added) { undo.pop(); FO.toast('No room for any more fighters'); return; }
  FO.toast(r.capped ? `Added ${r.added}: that’s as many fighters as the field holds`
    : r.added < r.before * 0.97 ? `Added ${r.added} of ${r.before}: the rest had no room nearby` : `Doubled: ${r.before} → ${r.before + r.added} fighters`);
  FO.audio.play('place'); syncUI();
}
function generate() {
  toEdit(); pushUndo();
  const r = FO.generate();
  FO.toast(r.summary); FO.audio.play('place'); fitView(); syncUI();
}
function reset() { const mode = world.snapMode; if (FO.resetBattle()) { FO.setMode(mode); syncUI(); } }
// Clear asks first, in a small popup beside the button that was pressed (or near the top on narrow screens).
function askClear(btn) {
  if (!world.units.length && !world.props.length && !world.tiles.some(t => t)) { closePops(); FO.toast('The field is already empty'); return; }
  togglePop('clearPop', true);
  const p = $('clearPop'), box = $('arena').getBoundingClientRect(), b = btn.getBoundingClientRect();
  if (btn.offsetParent && b.width && btn.id === 'railClear') { p.style.left = (b.right - box.left + 12) + 'px'; p.style.top = (b.top - box.top + b.height / 2 - p.offsetHeight / 2) + 'px'; p.style.transform = 'none'; }
  else { p.style.left = '50%'; p.style.top = '64px'; p.style.transform = 'translateX(-50%)'; }
  $('clearNo').focus();
}
function clearAll() { if (world.mode === 'edit') pushUndo(); FO.clearField(); undoTrim(); syncUI(); }

/* ---------- undo ---------- */
const undo = [];
function pushUndo() { if (world.mode !== 'edit') return; undo.push(world.snapshot()); if (undo.length > 40) undo.shift(); $('undoBtn').disabled = false; }
function undoTrim() { $('undoBtn').disabled = world.mode !== 'edit' || !undo.length; }
function doUndo() {
  if (world.mode !== 'edit' || !undo.length) return;
  world.restore(undo.pop()); undoTrim(); syncUI();
}

/* =====================================================================
   TALLY + RESULTS
   ===================================================================== */
let lastTally = '';
function spriteURL(def, team) { const s = FO.portrait(def, team); if (!s._url) s._url = s.toDataURL(); return s._url; }
function updateTallyUnits(force) {
  const battle = world.mode !== 'edit', by = new Map();
  for (const u of world.units) if (u.alive) {
    const d = battle ? FO.units[FO.kindOf(u)] || u.def : u.def;
    const e = by.get(d) || { def: d, team: u.team, n: 0, pts: 0 }; e.n++; e.pts += u.def.cost; by.set(d, e);
  }
  if (battle) for (const id in world.typeStats) { const s = world.typeStats[id]; if (s.start && !by.has(s.def)) by.set(s.def, { def: s.def, team: s.team, n: 0, pts: 0 }); }
  const list = [...by.values()].sort((a, b) => b.n - a.n || b.pts - a.pts);
  let html = battle ? `<div class="clock">${fmtTime(world.time)}</div>` : '';
  list.slice(0, 7).forEach(e => {
    const start = battle && world.typeStats[e.def.id] ? world.typeStats[e.def.id].start : 0;
    html += `<div class="tchip${battle && !e.n ? ' out' : ''}" title="${e.def.name.replace(/"/g, '')}"><img alt="" src="${spriteURL(e.def, e.team)}"><b>${e.n}</b>` +
      (battle ? `<small>of ${Math.max(start, e.n)}</small>` : `<small>${e.pts.toLocaleString()} pts</small>`) + '</div>';
  });
  if (list.length > 7) html += `<div class="tchip more">+${list.length - 7} more kinds</div>`;
  if (html !== lastTally || force) { $('tally').innerHTML = html; lastTally = html; }
}
function updateTally(force) {
  if (world.fightMode === 'units') return updateTallyUnits(force);
  const counts = FO.teams.map(() => 0), value = FO.teams.map(() => 0);
  for (const u of world.units) if (u.alive) { counts[u.team]++; value[u.team] += u.def.cost; }
  const battle = world.mode !== 'edit';
  let html = battle ? `<div class="clock">${fmtTime(world.time)}</div>` : '';
  FO.teams.forEach((tm, i) => {
    const start = battle ? world.teamStats[i].start : 0;
    if (!counts[i] && !start) return;
    html += `<div class="tchip${battle && !counts[i] ? ' out' : ''}"><span class="dot" style="background:${tm.color}"></span><b>${counts[i]}</b>` +
      (battle ? `<small>of ${Math.max(start, counts[i])}</small>` : `<small>${value[i].toLocaleString()} pts</small>`) + '</div>';
  });
  if (html !== lastTally || force) { $('tally').innerHTML = html; lastTally = html; }
}
FO.updateTally = updateTally;

/* ---------- end-of-battle statistics ---------- */
const LINE = ['#ef4444', '#3b6cf6', '#1faa66', '#c48600'];      // team colours, gold darkened to read on white
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, text) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
const named = w => `${w.def.name} (${FO.teams[w.team].name})`;
const num = n => Math.round(n).toLocaleString();
let chartView = 'count';

// Line chart of strength over the battle, three ways: head count, share of the starting army, points.
// One line per team in a team battle, one per kind of fighter in a units battle, one for everybody in a free-for-all.
const KIND_LINE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];      // checked for colour-blind separation; never cycled
const OTHER_LINE = '#8a8f9c';
let kindColor = {};                                  // def id → line colour, for the table under the chart
function chartSeries(r, S) {
  const sum = a => a.reduce((x, y) => x + y, 0);
  if (r.mode === 'teams') return FO.teams.map((tm, i) => ({ name: tm.name, color: LINE[i], raw: (s, pts) => (pts ? s.p : s.c)[i] })).filter(q => S.some(s => q.raw(s, false) > 0));
  if (r.mode !== 'units' || !S[0].k) return [{ name: 'Everyone', color: '#1c1d22', raw: (s, pts) => sum(pts ? s.p : s.c) }];
  // Which kinds get a line of their own: whoever is left at the end, then the biggest armies, counting both heads and
  // points so a crowd of peasants and a pair of gorillas both make it. That order also fixes each kind's colour.
  const peak = {}, last = S[S.length - 1].k;
  for (const s of S) for (const id in s.k) { const e = peak[id] || (peak[id] = [0, 0]); e[0] = Math.max(e[0], s.k[id][0]); e[1] = Math.max(e[1], s.k[id][1]); }
  const tot = [1, 1]; for (const id in peak) { tot[0] += peak[id][0]; tot[1] += peak[id][1]; }
  const weight = id => (last[id] ? 10 : 0) + peak[id][0] / tot[0] + peak[id][1] / tot[1];
  const ids = Object.keys(peak).sort((a, b) => weight(b) - weight(a));
  const shown = ids.length > KIND_LINE.length ? ids.slice(0, KIND_LINE.length - 1) : ids, rest = ids.slice(shown.length);
  const at = (s, id, pts) => (s.k[id] || [0, 0])[pts ? 1 : 0];
  const out = shown.map((id, i) => { kindColor[id] = KIND_LINE[i]; return { name: FO.units[id] ? FO.units[id].name : id, def: FO.units[id], color: KIND_LINE[i], raw: (s, pts) => at(s, id, pts) }; });
  if (rest.length) out.push({ name: `${rest.length} other kinds`, color: OTHER_LINE, raw: (s, pts) => rest.reduce((x, id) => x + at(s, id, pts), 0) });
  return out;
}
function strengthChart(r) {
  const S = world.stats.samples; if (S.length < 3) return null;
  kindColor = {};
  const series = chartSeries(r, S), many = series.length > 4;
  // "% of start" is measured from the first moment a line has anybody at all, so kinds that turn up mid-battle still read
  for (const q of series) { const f = S.find(s => q.raw(s, false) > 0); q.base = f ? q.raw(f, false) : 0; }
  const VIEWS = [['count', 'Fighters'], ['share', '% of start'], ['points', 'Strength']];
  const val = (s, q, v) => v === 'share' ? (q.base ? q.raw(s, false) / q.base * 100 : 0) : q.raw(s, v === 'points');
  const fmt = (x, v) => v === 'share' ? Math.round(x) + '%' : num(x);
  const wrap = el('div', 'chart'), head = el('div', 'charthead'), seg = el('div', 'seg small'), legend = el('div', 'legend'), plot = el('div', 'plot'), tip = el('div', 'tip hidden');
  seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Strength measure');
  head.append(el('b', null, 'Strength left'), seg);
  if (series.length > 1) for (const q of series) { const k = el('span'), d = el('i'); d.style.background = q.color; k.append(d, document.createTextNode(q.name)); legend.append(k); }
  wrap.append(head, legend, plot);
  const Wd = 420, Ht = 132, L = 6, R = 44, Tp = 8, B = 18, tEnd = S[S.length - 1].t || 1;
  const X = t => L + t / tEnd * (Wd - L - R);
  function draw() {
    const v = chartView;
    for (const b of seg.children) b.classList.toggle('on', b.dataset.v === v);
    let max = 1; for (const s of S) for (const q of series) max = Math.max(max, val(s, q, v));
    if (v === 'share') max = Math.max(100, max);
    const Y = x => Tp + (1 - x / max) * (Ht - Tp - B);
    const svg = sv('svg', { viewBox: `0 0 ${Wd} ${Ht}`, role: 'img', 'aria-label': `${VIEWS.find(a => a[0] === v)[1]} left over time` });
    svg.append(sv('line', { x1: L, x2: Wd - R, y1: Y(max), y2: Y(max), class: 'grid' }), sv('line', { x1: L, x2: Wd - R, y1: Y(0), y2: Y(0), class: 'axis' }));
    if (v === 'share' && max > 100) svg.append(sv('line', { x1: L, x2: Wd - R, y1: Y(100), y2: Y(100), class: 'grid' }));
    svg.append(sv('text', { x: L, y: Ht - 4, class: 'tick' }, '0:00'), sv('text', { x: Wd - R, y: Ht - 4, class: 'tick', 'text-anchor': 'end' }, fmtTime(tEnd)),
      sv('text', { x: L + 2, y: Y(max) + 11, class: 'tick' }, fmt(max, v)));
    const ends = [];
    for (const q of series) {
      svg.append(sv('polyline', { points: S.map(s => X(s.t).toFixed(1) + ',' + Y(val(s, q, v)).toFixed(1)).join(' '), fill: 'none', stroke: q.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      const last = val(S[S.length - 1], q, v);
      if (many && last <= 0) continue;                  // with many lines, only the survivors get an end marker and a number
      svg.append(sv('circle', { cx: X(tEnd), cy: Y(last), r: 4, fill: q.color, stroke: '#fff', 'stroke-width': 2 }));
      ends.push({ y: Y(last), text: fmt(last, v) });
    }
    ends.sort((a, b) => a.y - b.y);                     // end labels: nudge apart so they never overlap
    for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 12) ends[k].y = ends[k - 1].y + 12;
    for (let k = ends.length - 1; k >= 0; k--) { const cap = Ht - B - (ends.length - 1 - k) * 12; if (ends[k].y > cap) ends[k].y = cap; }
    for (const e of ends) svg.append(sv('text', { x: X(tEnd) + 8, y: e.y + 4, class: 'endlbl' }, e.text));
    const cross = sv('line', { y1: Tp, y2: Ht - B, class: 'cross', visibility: 'hidden' }); svg.append(cross);
    const move = e => {
      const b = svg.getBoundingClientRect(), t = Math.max(0, Math.min(tEnd, ((e.clientX - b.left) / b.width * Wd - L) / (Wd - L - R) * tEnd));
      let s = S[0]; for (const q of S) if (Math.abs(q.t - t) < Math.abs(s.t - t)) s = q;
      cross.setAttribute('x1', X(s.t)); cross.setAttribute('x2', X(s.t)); cross.setAttribute('visibility', 'visible');
      tip.innerHTML = ''; tip.append(el('b', null, fmtTime(s.t)));
      const rows = series.map(q => [val(s, q, v), q]);
      if (many) rows.sort((x, y) => y[0] - x[0]);       // biggest first, and nobody who has nothing left
      for (const [x, q] of rows) { if (many && x <= 0) continue; const row = el('span'), d = el('i'); d.style.background = q.color; row.append(d, document.createTextNode(`${q.name} ${fmt(x, v)}`)); tip.append(row); }
      tip.classList.remove('hidden');
      const px = X(s.t) / Wd * b.width; tip.style.left = Math.max(0, Math.min(b.width - tip.offsetWidth, px < b.width / 2 ? px + 10 : px - tip.offsetWidth - 10)) + 'px';
    };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); tip.classList.add('hidden'); });
    plot.innerHTML = ''; plot.append(svg, tip);
  }
  for (const [v, label] of VIEWS) { const b = el('button', null, label); b.type = 'button'; b.dataset.v = v; b.addEventListener('click', () => { chartView = v; draw(); }); seg.append(b); }
  draw();
  return wrap;
}

// Awards, running totals and a per-fighter table, tucked under the scoreboard.
function moreStats(r, alive) {
  const s = world.stats, everyone = world.units.concat(world.fallen || []), out = el('div', 'more');
  const awards = el('div', 'awards');
  const award = (label, who, line) => { const a = el('div', 'award'), t = el('div'); t.append(el('span', 'lbl', label), el('b', null, who.def.name), el('span', null, line)); a.append(tokenImg(who.def, who.team), t); awards.append(a); };
  if (s.first) award('FIRST BLOOD', s.first.by, `Dropped ${named(s.first.on)} at ${fmtTime(s.first.t)}`);
  if (s.bigHit && s.bigHit.amount >= 20) award('BIGGEST HIT', s.bigHit.by, `${num(s.bigHit.amount)} damage to ${named(s.bigHit.on)} in one blow`);
  let top = null, tank = null, close = null;
  for (const u of everyone) {
    if (u.kills > 1 && (!top || u.kills > top.kills)) top = u;
    if (u.taken > 0 && (!tank || u.taken > tank.taken)) tank = u;
  }
  for (const u of alive) if (u.hp < u.maxHp * 0.35 && (!close || u.hp / u.maxHp < close.hp / close.maxHp)) close = u;
  if (top && top !== r.mvp) award('MOST KNOCKOUTS', top, `${top.kills} knockouts${top.alive ? '' : ' · fell in battle'}`);
  if (tank) award('PUNCHING BAG', tank, `Soaked up ${num(tank.taken)} damage${tank.alive ? ' and lived' : ''}`);
  if (close) award('CLOSEST CALL', close, `Finished on ${Math.max(1, Math.round(close.hp))} of ${Math.round(close.maxHp)} health`);
  const types = Object.values(world.typeStats).filter(t => t.dmg > 0 && t.def.cost > 0);
  if (types.length > 1) {
    const worth = t => t.dmg / ((t.start + (t.born || 0)) * t.def.cost);
    const best = types.reduce((a, b) => worth(b) > worth(a) ? b : a);
    award('BEST VALUE', best, `${worth(best) >= 10 ? Math.round(worth(best)) : worth(best).toFixed(1)} damage for every point spent`);
  }
  if (awards.children.length) { const d = el('details'); d.append(el('summary', null, `Awards (${awards.children.length})`), awards); out.append(d); }

  const chips = el('div', 'chips');
  const chip = (n, label) => { const c = el('span'); c.append(el('b', null, num(n)), document.createTextNode(' ' + label)); chips.append(c); };
  chip(s.dmg, 'damage dealt');
  if (s.healed >= 1) chip(s.healed, 'healed');
  if (s.shots) chip(s.shots, 'shots fired');
  if (s.born) chip(s.born, 'joined mid-battle');

  const rows = Object.values(world.typeStats).sort((a, b) => (b.dmg || 0) - (a.dmg || 0)).slice(0, 8);
  if (r.mode !== 'units' && rows.length > 1) {
    const d = el('details'), table = el('table', 'score'), head = el('tr');
    d.append(el('summary', null, 'By fighter'));
    ['Fighter', 'Fielded', 'Left', 'Knockouts', 'Damage'].forEach(t => head.append(el('th', null, t)));
    table.append(head);
    for (const t of rows) {
      const tr = el('tr'), name = el('td');
      name.append(tokenImg(t.def, t.team), document.createTextNode(t.def.name));
      tr.append(name, el('td', null, String(t.start + (t.born || 0))), el('td', null, String(alive.filter(u => FO.kindOf(u) === t.def.id).length)), el('td', null, String(t.kills)), el('td', null, num(t.dmg || 0)));
      table.append(tr);
    }
    d.append(table); out.append(d);
  }
  out.append(chips);
  return out;
}

function showResults(r) {
  const box = $('results'); box.innerHTML = '';
  const alive = world.units.filter(u => u.alive);
  let title, sub, color = '#1c1d22';
  if (r.kind === 'stalemate') { title = 'Stalemate'; sub = `Nobody can get at anybody · ${fmtTime(r.time)}`; }
  else if (r.kind === 'wipeout' || !alive.length) { title = 'Nobody wins'; sub = `Mutual destruction in ${fmtTime(r.time)}`; }
  else if (r.mode === 'ffa') {
    const u = alive[0]; color = FO.teams[u.team].dark;
    title = `${u.def.name} wins!`; sub = `Last one standing of ${world.startTotal} · ${fmtTime(r.time)}`;
  } else if (r.mode === 'units') {
    const d = FO.units[FO.kindOf(alive[0])] || alive[0].def, s = world.typeStats[d.id]; color = FO.teams[alive[0].team].dark;
    const many = alive.length > 1, plural = d.plural || (/[sz]$/i.test(d.name) ? d.name : d.name + 's');
    title = many ? `${plural} win!` : `${d.name} wins!`; sub = `${alive.length} of ${Math.max(s ? s.start : 0, alive.length)} still standing · ${fmtTime(r.time)}`;
  } else {
    const t = r.winnerTeam; color = FO.teams[t].dark;
    title = `${FO.teams[t].name} wins!`; sub = `${alive.length} of ${Math.max(world.teamStats[t].start, alive.length)} still standing · ${fmtTime(r.time)}`;
  }
  const h = el('h2', null, title); h.style.color = color;
  box.append(h, el('p', 'sub', sub));

  const chart = strengthChart(r); if (chart) box.append(chart);

  const table = el('table', 'score'), head = el('tr');
  [r.mode === 'units' ? 'Kind' : 'Team', 'Started', 'Left', 'Knockouts'].forEach(t => head.append(el('th', null, t)));
  table.append(head);
  if (r.mode === 'units') {
    const rows = Object.values(world.typeStats).filter(s => s.start).map(s => ({ s, left: alive.filter(u => FO.kindOf(u) === s.def.id).length }))
      .sort((a, b) => b.left - a.left || b.s.kills - a.s.kills || b.s.start - a.s.start);
    if (rows.length > 8) table.classList.add('long');
    for (const { s, left } of rows) {
      const tr = el('tr'), name = el('td'), dot = el('span', 'dot key'); dot.style.background = kindColor[s.def.id] || OTHER_LINE;
      name.append(dot, tokenImg(s.def, s.team), document.createTextNode(s.def.name));
      tr.append(name, el('td', null, String(s.start)), el('td', null, String(left)), el('td', null, String(s.kills)));
      table.append(tr);
    }
  } else FO.teams.forEach((tm, i) => {
    const s = world.teamStats[i]; if (!s.start) return;
    const tr = el('tr'), name = el('td'), dot = el('span', 'dot'); dot.style.background = tm.color;
    name.append(dot, document.createTextNode(tm.name));
    tr.append(name, el('td', null, String(s.start)), el('td', null, String(alive.filter(u => u.team === i).length)), el('td', null, String(s.kills)));
    table.append(tr);
  });
  box.append(table);
  const m = r.mvp;
  if (m && m.dmg > 0) {
    const row = el('div', 'mvp'), txt = el('div');
    txt.append(el('span', 'lbl', 'MOST VALUABLE FIGHTER'), el('b', null, `${m.def.name} (${FO.teams[m.team].name})`),
      el('span', null, `${m.kills} knockout${m.kills === 1 ? '' : 's'} · ${Math.round(m.dmg).toLocaleString()} damage${m.alive ? '' : ' · fell in battle'}`));
    row.append(tokenImg(m.def, m.team), txt); box.append(row);
  }
  const extra = moreStats(r, alive); if (extra) box.append(extra);
  const row = el('div', 'row');
  const again = el('button', 'tool primary', 'Rematch'); again.addEventListener('click', fight); again.title = 'Rematch (Space)'; again.dataset.key = 'Space';
  const edit = el('button', 'tool', 'Change the armies'); edit.addEventListener('click', reset); edit.title = 'Back to the field (Esc)'; edit.dataset.key = 'Esc';
  row.append(again, edit); box.append(row);
  box.classList.remove('hidden');
}
FO.on('end', r => {
  syncUI();
  if (r.kind === 'win') {
    const c = FO.teams[world.units.find(u => u.alive).team].color;
    for (let i = 0; i < 26; i++) FO.fx.dots(FO.rand(60, W - 60), FO.rand(40, H * 0.5), FO.pick([c, '#ffd43b', '#ffffff', c]), 5, 220, 4);
  }
  setTimeout(() => { if (world.result === r) showResults(r); }, 650);
});
FO.on('reset', () => { $('results').classList.add('hidden'); });
FO.on('scenario', () => syncUI());

/* =====================================================================
   CAMERA
   ===================================================================== */
function resize() {
  const a = $('arena');
  view.dpr = Math.min(2, window.devicePixelRatio || 1);
  view.vw = a.clientWidth; view.vh = a.clientHeight;
  canvas.width = Math.round(view.vw * view.dpr); canvas.height = Math.round(view.vh * view.dpr);
}
function fitView() {
  const wide = window.matchMedia('(min-width:1100px)').matches, top = wide ? 64 : 56, bottom = view.vh - $('dock').offsetTop + 14, side = wide && world.mode === 'edit' ? 78 : 14;
  const z = Math.min((view.vw - side * 2) / W, (view.vh - top - bottom) / H);
  view.cam.z = Math.max(0.12, z);
  view.cam.x = W / 2 - (view.vw / 2) / view.cam.z;
  view.cam.y = H / 2 - ((top + (view.vh - bottom)) / 2) / view.cam.z;
  lastFit = { x: view.cam.x, y: view.cam.y, z: view.cam.z };
}
FO.fitView = fitView;
const toWorld = (sx, sy) => ({ x: sx / view.cam.z + view.cam.x, y: sy / view.cam.z + view.cam.y });
function zoomAt(sx, sy, f) {
  const before = toWorld(sx, sy);
  view.cam.z = Math.max(0.12, Math.min(5, view.cam.z * f));
  view.cam.x = before.x - sx / view.cam.z; view.cam.y = before.y - sy / view.cam.z;
}
const local = e => { const r = canvas.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; };

/* =====================================================================
   PAINTING
   ===================================================================== */
let stroke = null, pan = null, shiftDown = false, limitWarned = 0;
const pointers = new Map();
const erasing = () => ui.erase || shiftDown;
const terrainBrush = () => Math.max(T * 0.5, ui.brush * 0.6);

function placeUnits(x, y) {
  const def = FO.units[ui.sel.id]; if (!def) return;
  if (world.units.length >= FO.MAX_UNITS) {
    if (performance.now() - limitWarned > 2500) { FO.toast(`That’s the limit: ${FO.MAX_UNITS} fighters`); limitWarned = performance.now(); }
    return;
  }
  let placed = 0;
  if (def.grid && ui.brush >= T * 1.2) {
    // a big brush scatters a random soup, the same tiles every pass so dragging doesn't fill it solid
    const r = ui.brush, seed = stroke.seed || (stroke.seed = 1 + Math.random() * 1e4 | 0);
    for (let cy = Math.floor((y - r) / T); cy <= (y + r) / T; cy++) for (let cx = Math.floor((x - r) / T); cx <= (x + r) / T; cx++) {
      const px = (cx + 0.5) * T, py = (cy + 0.5) * T;
      if (Math.hypot(px - x, py - y) > r) continue;
      let h = Math.imul(cx * 73856093 ^ cy * 19349663 ^ seed, 2654435761) >>> 0; h = (h ^ h >>> 15) >>> 0;
      if (h % 100 >= 42 || world.units.length >= FO.MAX_UNITS) continue;
      if (FO.canPlace(def, px, py)) { FO.spawn(def, px, py, ui.team); world.rebuildGrid(); placed++; }
    }
  }
  else if (ui.brush < def.r * 1.6 || def.grid) { if (FO.canPlace(def, x, y)) { FO.spawn(def, x, y, ui.team); placed++; } }
  else {
    const n = Math.min(28, Math.max(1, Math.round((ui.brush * ui.brush) / ((def.r * 1.3) ** 2) * 0.16)));
    for (let i = 0; i < n * 2 && placed < n && world.units.length < FO.MAX_UNITS; i++) {
      const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * ui.brush;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (FO.canPlace(def, px, py)) { FO.spawn(def, px, py, ui.team); placed++; }
    }
  }
  if (placed) { stroke.changed = true; FO.audio.play('place'); }
}
function eraseAt(x, y) {
  const r = Math.max(ui.brush, 14);
  let hit = false;
  for (const u of world.units) if (Math.hypot(u.x - x, u.y - y) < r + u.def.r * 0.5) { u.alive = false; hit = true; }
  if (hit) world.units = world.units.filter(u => u.alive);
  const before = world.props.length;
  world.props = world.props.filter(p => Math.hypot(p.x - x, p.y - y) >= r + p.def.r * 0.5);
  if (world.props.length !== before) hit = true;
  if (world.paintTiles(x, y, r, 0)) hit = true;
  if (hit) stroke.changed = true;
}
// Move every fighter under the brush to the selected team. Mid-battle they switch sides on the spot.
function recolorAt(x, y) {
  const r = Math.max(ui.brush, 14), team = ui.team, tm = FO.teams[team], live = world.mode !== 'edit';
  let n = 0;
  for (const u of world.units) {
    if (!u.alive || u.team === team || Math.hypot(u.x - x, u.y - y) >= r + u.def.r * 0.5) continue;
    u.team = team;
    if (!live) { u.side = team; u.face = team % 2 === 0 ? 1 : -1; }
    else {
      if (world.fightMode === 'teams') u.side = team;   // in the other modes colour doesn't decide sides
      u.target = null; u.retT = 0; u.losT = 0; u.path = null; u.wp = null; u.pop = 0.25;
      if (FO.chance(0.15)) FO.fx.say(u, FO.pick(['Wait, what?', 'I’m with them now', 'Traitor!', 'New team, who dis']));
    }
    FO.fx.dots(u.x, u.y, tm.color, 5, 90, 2);
    n++;
  }
  if (n) { stroke.changed = true; FO.audio.play('place'); }
}
// Give every fighter under the brush the selected nature.
function natureAt(x, y) {
  const r = Math.max(ui.brush, 14), id = ui.sel.id, want = id === 'aggressive' ? undefined : id;
  let n = 0;
  for (const u of world.units) {
    if (!u.alive || u.nature === want || Math.hypot(u.x - x, u.y - y) >= r + u.def.r * 0.5) continue;
    if (!FO.nature.set(u, id)) { if (!stroke.told) { stroke.told = true; FO.toast(`${u.def.plural || u.def.name + 's'} have a mind of their own`); } continue; }
    FO.fx.dots(u.x, u.y, '#1c1d22', 4, 80, 1.8);
    n++;
  }
  if (n) { stroke.changed = true; FO.audio.play('place'); }
}
function apply(x, y) {
  if (stroke.kind === 'erase') eraseAt(x, y);
  else if (stroke.kind === 'recolor') recolorAt(x, y);
  else if (stroke.kind === 'nature') natureAt(x, y);
  else if (stroke.kind === 'unit') placeUnits(x, y);
  else if (stroke.kind === 'terrain') { if (world.paintTiles(x, y, terrainBrush(), FO.terrainById[ui.sel.id].index, ui.keep)) stroke.changed = true; }
  else if (stroke.kind === 'prop') { const d = FO.props[ui.sel.id]; if (d && FO.canPlaceProp(d, x, y)) { FO.placeProp(d.id, x, y); stroke.changed = true; FO.audio.play('place'); } }
}
const powerReady = {};
function castPower(x, y) {
  const p = selDef(); if (!p) return;
  if (world.mode === 'edit') { FO.toast('Powers work once the fight has started'); return; }
  if (world.mode !== 'running') return;
  const now = performance.now();
  if (now < (powerReady[p.id] || 0)) return;
  powerReady[p.id] = now + p.cooldown * 1000;
  p.cast(FO.clamp(x, 0, W), FO.clamp(y, 0, H), ui.team);
}
function beginStroke(w) {
  FO.audio.unlock();
  if (!erasing() && !ui.recolor && ui.sel.kind === 'power') { castPower(w.x, w.y); return; }
  if (world.mode === 'over') return;
  pushUndo();
  world.rebuildGrid();
  const kind = erasing() ? 'erase' : ui.recolor ? 'recolor' : ui.sel.kind;
  stroke = { kind, last: w, acc: 0, changed: false };
  apply(w.x, w.y);
}
function moveStroke(w) {
  const def = selDef();
  const stepLen = stroke.kind === 'unit' ? (def.grid ? T * 0.5 : Math.max(def.r * 2.1, ui.brush * 0.55)) : stroke.kind === 'terrain' ? T * 0.5 : stroke.kind === 'prop' ? def.r * 2 + 12 : 8;
  let dx = w.x - stroke.last.x, dy = w.y - stroke.last.y, d = Math.hypot(dx, dy);
  while (stroke.acc + d >= stepLen) {
    const k = (stepLen - stroke.acc) / d, px = stroke.last.x + dx * k, py = stroke.last.y + dy * k;
    apply(px, py);
    stroke.last = { x: px, y: py }; stroke.acc = 0;
    dx = w.x - px; dy = w.y - py; d = Math.hypot(dx, dy);
    if (d < 1e-6) break;
  }
  stroke.acc += d; stroke.last = w;
}
function endStroke() {
  if (!stroke) return;
  if (stroke.kind === 'terrain' && stroke.changed) {
    world.ensureDerived();
    for (const u of world.units) if (!u.def.flying) world.resolveTiles(u);   // nobody gets bricked in
  }
  if (!stroke.changed && world.mode === 'edit') undo.pop();
  stroke = null;
  syncUI();
}

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  const p = local(e);
  pointers.set(e.pointerId, p);
  closePops();
  if (pointers.size === 2) {
    endStroke();
    const [a, b] = [...pointers.values()];
    pan = { pinch: true, d: Math.hypot(a.sx - b.sx, a.sy - b.sy), mx: (a.sx + b.sx) / 2, my: (a.sy + b.sy) / 2 };
    return;
  }
  if (e.button === 1 || e.button === 2) { pan = { x: p.sx, y: p.sy }; canvas.classList.add('panning'); return; }
  if (e.button !== 0) return;
  shiftDown = e.shiftKey;
  beginStroke(toWorld(p.sx, p.sy));
});
canvas.addEventListener('pointermove', e => {
  const p = local(e);
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
  view.hover = toWorld(p.sx, p.sy);
  shiftDown = e.shiftKey;
  if (pan) {
    if (pan.pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.sx - b.sx, a.sy - b.sy), mx = (a.sx + b.sx) / 2, my = (a.sy + b.sy) / 2;
      view.cam.x -= (mx - pan.mx) / view.cam.z; view.cam.y -= (my - pan.my) / view.cam.z;
      zoomAt(mx, my, d / pan.d);
      pan.d = d; pan.mx = mx; pan.my = my;
    } else if (!pan.pinch) {
      view.cam.x -= (p.sx - pan.x) / view.cam.z; view.cam.y -= (p.sy - pan.y) / view.cam.z;
      pan.x = p.sx; pan.y = p.sy;
    }
    return;
  }
  if (stroke) moveStroke(view.hover);
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pan && (pointers.size === 0 || !pan.pinch)) { pan = null; canvas.classList.remove('panning'); }
  endStroke();
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => { if (!stroke) view.hover = null; });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const p = local(e);
  zoomAt(p.sx, p.sy, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
}, { passive: false });

// Called every frame by main.js: what the brush cursor should look like, and which unit is under it.
FO.updatePointer = function () {
  view.cursor = null; view.hoverUnit = null;
  if (!view.hover || pan) return;
  const d = selDef(), tm = FO.teams[ui.team];
  if (erasing()) view.cursor = { r: Math.max(ui.brush, 14), color: '#1c1d22', fill: 'rgba(28,29,34,.07)' };
  else if (ui.recolor) view.cursor = { r: Math.max(ui.brush, 14), color: tm.dark, fill: tm.color + '38' };
  else if (ui.sel.kind === 'unit' && d) view.cursor = { r: Math.max(ui.brush, d.r), color: tm.color };
  else if (ui.sel.kind === 'terrain' && d) view.cursor = ui.keep ? { r: terrainBrush(), color: d.edge || '#1c1d22', keep: true } : { r: terrainBrush(), color: d.edge || '#1c1d22', fill: 'rgba(28,29,34,.06)' };
  else if (ui.sel.kind === 'prop' && d) view.cursor = { r: d.r, color: '#1c1d22', fill: 'rgba(28,29,34,.06)' };
  else if (ui.sel.kind === 'nature' && d) view.cursor = { r: Math.max(ui.brush, 14), color: '#1c1d22', fill: 'rgba(255,255,255,.22)' };
  else if (ui.sel.kind === 'power' && d) view.cursor = { r: d.radius, color: '#1c1d22', fill: world.mode === 'running' ? 'rgba(255,212,59,.3)' : 'rgba(28,29,34,.05)' };
  if (world.mode !== 'edit' && !stroke) {
    const h = view.hover; let best = null, bd = Infinity;
    world.forNear(h.x, h.y, FO.maxR, u => {
      if (!u.alive || u.under) return;
      const dd = Math.hypot(u.x - h.x, u.y - h.y);
      if (dd < u.def.r + 3 && dd < bd) { bd = dd; best = u; }
    });
    view.hoverUnit = best;
  }
};

/* =====================================================================
   WIRING
   ===================================================================== */
$('fightBtn').addEventListener('click', fight);
$('resetBtn').addEventListener('click', reset);
$('clearBtn').addEventListener('click', e => askClear(e.currentTarget));
$('clearYes').addEventListener('click', () => { closePops(); clearAll(); FO.toast('Cleared. Undo (Z) brings it back'); });
$('clearNo').addEventListener('click', () => togglePop('clearPop', false));
$('undoBtn').addEventListener('click', doUndo);
$('eraseBtn').addEventListener('click', () => setErase(!ui.erase));
$('recolorBtn').addEventListener('click', () => setRecolor(!ui.recolor));
for (const [m, id] of Object.entries(MODE_BTNS)) $(id).addEventListener('click', () => setMode(m));
$('brush').addEventListener('input', e => { ui.brush = +e.target.value; $('brushVal').textContent = ui.brush; });
function stepBrush(d) { ui.brush = FO.clamp(Math.round((ui.brush + d) / 10) * 10, 0, 140); $('brush').value = ui.brush; $('brushVal').textContent = ui.brush; }
$('brushDown').addEventListener('click', () => stepBrush(-10));
$('brushUp').addEventListener('click', () => stepBrush(10));
function setKeep(v) { ui.keep = v; $('keepBtn').setAttribute('aria-checked', String(v)); $('keepChip').setAttribute('aria-checked', String(v)); $('brushBtn').classList.toggle('keep', v); $('brushBtn').title = v ? 'Brush size and options (keeping existing terrain)' : 'Brush size and options'; }
$('keepBtn').addEventListener('click', () => setKeep(!ui.keep));
$('keepChip').addEventListener('click', () => setKeep(!ui.keep));
$('battlesBtn').addEventListener('click', () => togglePop('battles'));
$('genBtn').addEventListener('click', () => { closePops(); generate(); });
$('balanceBtn').addEventListener('click', () => { closePops(); balance(); });
$('menuBtn').addEventListener('click', () => togglePop('menuPop'));
$('selBtn').addEventListener('click', () => togglePop('info'));
$('dockToggle').addEventListener('click', () => setDock($('dock').classList.contains('shut')));
$('brushBtn').addEventListener('click', () => togglePop('brushPop'));
$('helpBtn').addEventListener('click', () => togglePop('help'));
$('helpIco').addEventListener('click', () => togglePop('help'));
$('soundIco').addEventListener('click', () => { FO.audio.toggle(); syncSound(); FO.audio.play('click'); });
$('railBalance').addEventListener('click', () => { closePops(); balance(); });
$('railDouble').addEventListener('click', () => { closePops(); double(); });
$('doubleBtn').addEventListener('click', () => { closePops(); double(); });
$('railClear').addEventListener('click', e => askClear(e.currentTarget));
const soundBtn = $('soundBtn');
const syncSound = () => { soundBtn.textContent = FO.audio.on ? 'Sound on' : 'Sound off'; $('soundIco').classList.toggle('muted', !FO.audio.on); $('soundIco').title = FO.audio.on ? 'Sound is on (M)' : 'Sound is off (M)'; };
soundBtn.addEventListener('click', () => { FO.audio.toggle(); syncSound(); FO.audio.play('click'); });

window.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' && e.target.type !== 'range') return;
  if (e.key === 'Shift') { shiftDown = true; return; }
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) fight(); return; }
  const k = e.key.toLowerCase();
  if (e.key === '?') { const on = !document.body.classList.contains('hints'); setHints(on); FO.toast(on ? 'Shortcut hints on (? to hide)' : 'Shortcut hints off'); return; }
  if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); doUndo(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (k >= '1' && k <= String(FO.teams.length)) setTeam(+k - 1);
  else if (k === 'e') setErase(!ui.erase);
  else if (k === 't') setRecolor(!ui.recolor);
  else if (k === 'z') doUndo();
  else if (k === 'r') reset();
  else if (k === 'f') fitView();
  else if (k === 'g') generate();
  else if (k === 'b') balance();
  else if (k === 'x') double();
  else if (k === 'm') { FO.audio.toggle(); syncSound(); }
  else if (k === 'escape') {
    const anyPop = POPS.some(id => !$(id).classList.contains('hidden'));
    closePops(); setErase(false); setRecolor(false);
    if (!anyPop && (world.mode === 'over' || world.mode === 'paused')) reset();        // paused, or on the results screen: put everyone back where they started
  }
  else if (k === '[' || k === '-' || k === '_') stepBrush(-10);
  else if (k === ']' || k === '+' || k === '=') stepBrush(10);
  else if (k === 'k') setKeep(!ui.keep);
});
window.addEventListener('keyup', e => { if (e.key === 'Shift') shiftDown = false; });
window.addEventListener('blur', () => { shiftDown = false; });

$('cards').addEventListener('scroll', syncStrip, { passive: true });
$('cards').addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); $('cards').scrollBy({ left: e.deltaY, behavior: 'auto' }); } }, { passive: false });
$('cardsL').addEventListener('click', () => $('cards').scrollBy({ left: -$('cards').clientWidth * 0.7 }));
$('cardsR').addEventListener('click', () => $('cards').scrollBy({ left: $('cards').clientWidth * 0.7 }));
window.addEventListener('resize', syncStrip);
// Who-fights-whom sits above Fight on wide screens and in the menu otherwise.
const wideMQ = window.matchMedia('(min-width:1100px)');
function placeMode() {
  const seg = $('modeSeg');
  if (wideMQ.matches) $('fightBtn').before(seg); else document.querySelector('#menuPop .menusec').append(seg);
}
wideMQ.addEventListener('change', placeMode);
// Shortcut hints: faint key letters beside the tools (keyboards only). Off by default; the choice is remembered.
function setHints(on) {
  document.body.classList.toggle('hints', on); $('hintsBtn').setAttribute('aria-checked', String(on));
  try { localStorage.setItem('svgwars.hints', on ? '1' : '0'); } catch (e) { /* storage unavailable: not remembered */ }
}
$('hintsBtn').addEventListener('click', () => setHints(!document.body.classList.contains('hints')));
FO.initUI = function () {
  let hintsOn = false; try { hintsOn = localStorage.getItem('svgwars.hints') === '1'; } catch (e) { /* default off */ }
  setHints(hintsOn);
  placeMode();
  makeThumbs();
  renderTabs(); renderCards(); renderInfo(); buildTeams(); buildSpeeds(); buildBattles(); syncSound();
  resize();
  new ResizeObserver(() => { resize(); fitView(); }).observe($('arena'));
  syncUI();
};
})();
