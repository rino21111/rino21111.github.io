/* =====================================================================
   SVG WARS · rendering
   Sprites for unit tokens, cached terrain layers, and the frame draw.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, W = FO.W, H = FO.H, T = FO.TILE;
const INK = '#1c1d22';
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const UI_FONT = '"Fredoka", ui-rounded, system-ui, sans-serif';
const SPR = 3;

/* ---------- unit art (SVG) ---------- */
const artImgs = new Map();
// Turn an SVG string into an image. Returns null until it has loaded; sprites are rebuilt when it does.
FO.artImg = svg => artImg(svg);
function artImg(svg) {
  if (!svg) return null;
  let e = artImgs.get(svg);
  if (!e) {
    e = { img: new Image(), ok: false }; artImgs.set(svg, e);
    e.img.onload = () => { e.ok = true; for (const d of FO.unitList) d._sprites = {}; glyphs.clear(); FO.emit('units-changed', null); };
    e.img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  return e.ok ? e.img : null;
}
const artOf = def => def.art || (FO.art && FO.art[def.id]) || null;
function bodyArt(def) { const a = def.art || (FO.art && FO.art[def.id]); return a ? artImg(a.body) : null; }
function weaponArt(def) { const a = artOf(def); return a ? artImg(a.weapon) : null; }

/* ---------- sprites ---------- */
// A unit's body: SVG art, or its emoji. No team colour here; that lives in the ground shadow.
// `s` is the resolution (pixels per world unit); the frame draw picks the smallest one that still looks sharp.
const BOX = 1.15;   // the sprite box is this many radii from centre to edge
FO.sprite = function (def, team, s) {
  s = s || SPR;
  const key = '@' + s;
  let c = def._sprites[key];
  if (c) return c;
  const R = def.r * s, S = Math.ceil(R * BOX * 2) + 4;
  c = document.createElement('canvas'); c.width = c.height = S; c.s = s;
  const g = c.getContext('2d'), cx = S / 2, art = bodyArt(def);
  if (art) {
    g.drawImage(art, cx - R * BOX, cx - R * BOX, R * BOX * 2, R * BOX * 2);
  } else if (typeof def.icon === 'function') {
    def.icon(g, cx, cx, R);
  } else {
    g.font = `${Math.round(R * 1.8)}px ${EMOJI}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(def.icon, cx, cx + R * 0.1);
  }
  def._sprites[key] = c;
  return c;
};
// The same sprite filled with one colour, for hit flashes and status tints.
function tinted(spr, color) {
  const t = spr._t || (spr._t = {});
  let c = t[color];
  if (!c) {
    c = t[color] = document.createElement('canvas'); c.width = spr.width; c.height = spr.height;
    const g = c.getContext('2d'); g.drawImage(spr, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}
// Palette / scoreboard picture: the unit standing on its team-coloured shadow.
FO.portrait = function (def, team) {
  const key = 'p' + team;
  let c = def._sprites[key];
  if (c) return c;
  const s = Math.max(3, Math.ceil(30 / def.r)), spr = FO.sprite(def, team, s), R = def.r * s, S = spr.width;
  c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = FO.teams[team].color; g.beginPath(); g.ellipse(S / 2, S / 2 + R * 0.86, R * 0.95, R * 0.3, 0, 0, 6.29); g.fill();
  g.drawImage(spr, 0, -R * 0.06);
  def._sprites[key] = c;
  return c;
};

const glyphs = new Map();
let lod = SPR;   // sprite resolution for the current zoom, set each frame
FO.glyphSprite = function (str, px, s) {
  px = Math.max(8, Math.round(px / 2) * 2); s = s || lod;
  const key = str + '|' + px + '|' + s;
  let c = glyphs.get(key);
  if (c) return c;
  const S = Math.ceil(px * s * 1.35);
  c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.font = `${px * s}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(str, S / 2, S / 2 + px * s * 0.06);
  c.px = px * 1.35;
  glyphs.set(key, c);
  return c;
};

/* ---------- terrain layers ---------- */
const TS = 1.5;   // terrain canvas resolution
const ground = document.createElement('canvas'), canopy = document.createElement('canvas');
ground.width = canopy.width = W * TS; ground.height = canopy.height = H * TS;
const gg = ground.getContext('2d'), cg = canopy.getContext('2d');
let drawnVersion = -1, hasCanopy = false;

function hashRnd(tx, ty) {
  let s = (tx * 73856093) ^ (ty * 19349663) ^ 0x9e3779b9;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; };
}
function tilePath(g, tx, ty, idx, grow) {
  const tiles = world.tiles, TC = world.TC, TR = world.TR;
  const same = (dx, dy) => { const x = tx + dx, y = ty + dy; return x >= 0 && y >= 0 && x < TC && y < TR && tiles[y * TC + x] === idx; };
  const l = same(-1, 0), r = same(1, 0), u = same(0, -1), d = same(0, 1);
  const rad = 7 + grow, x = tx * T - grow, y = ty * T - grow, s = T + grow * 2;
  const tl = !l && !u ? rad : 0, tr = !r && !u ? rad : 0, br = !r && !d ? rad : 0, bl = !l && !d ? rad : 0;
  g.moveTo(x + tl, y);
  g.lineTo(x + s - tr, y); if (tr) g.quadraticCurveTo(x + s, y, x + s, y + tr);
  g.lineTo(x + s, y + s - br); if (br) g.quadraticCurveTo(x + s, y + s, x + s - br, y + s);
  g.lineTo(x + bl, y + s); if (bl) g.quadraticCurveTo(x, y + s, x, y + s - bl);
  g.lineTo(x, y + tl); if (tl) g.quadraticCurveTo(x, y, x + tl, y);
  g.closePath();
}
// Tiles changed: note which, for each of the two cached pictures. Each is only repainted when it is next shown.
const join = (a, d) => d === 'all' || a === 'all' || !d ? 'all' : a ? { x0: Math.min(a.x0, d.x0), y0: Math.min(a.y0, d.y0), x1: Math.max(a.x1, d.x1), y1: Math.max(a.y1, d.y1) } : { ...d };
let baseDirty = 'all';
function redrawTerrain() {
  drawnVersion = world.tileVersion;
  const d = world.dirtyTiles; world.dirtyTiles = null;
  baseDirty = join(baseDirty, d); sharp.dirty = join(sharp.dirty, d);
  hasCanopy = false;
  for (let i = 0; i < world.tiles.length; i++) { const t = FO.terrain[world.tiles[i]]; if (t && t.canopy) { hasCanopy = true; break; } }
}
function freshBase() {
  if (!baseDirty) return;
  if (baseDirty === 'all') paintTerrain(gg, cg, TS, 0, 0, null); else repaintPart(gg, cg, TS, 0, 0, baseDirty);
  baseDirty = null;
}
// Repaint only the tiles in rectangle `d` (plus a margin, since shadows, trees and rounded corners spill into their
// neighbours) on a pair of layers drawn at `k` pixels per unit with world point (ox, oy) at the origin.
function repaintPart(gg, cg, k, ox, oy, d) {
  const TC = world.TC, TR = world.TR, m = 2;
  const cx0 = Math.max(0, d.x0 - m), cy0 = Math.max(0, d.y0 - m), cx1 = Math.min(TC - 1, d.x1 + m), cy1 = Math.min(TR - 1, d.y1 + m);
  // the cleared patch is snapped outward to whole pixels so no half-cleared seam is left around it
  const px0 = Math.floor((cx0 * T - ox) * k), py0 = Math.floor((cy0 * T - oy) * k), px1 = Math.ceil(((cx1 + 1) * T - ox) * k), py1 = Math.ceil(((cy1 + 1) * T - oy) * k);
  for (const g of [gg, cg]) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(px0, py0, px1 - px0, py1 - py0); g.clip(); g.clearRect(px0, py0, px1 - px0, py1 - py0);
    g.setTransform(k, 0, 0, k, -ox * k, -oy * k);
  }
  paintTerrain(gg, cg, k, ox, oy, { x0: Math.max(0, d.x0 - m - 2), y0: Math.max(0, d.y0 - m - 2), x1: Math.min(TC - 1, d.x1 + m + 2), y1: Math.min(TR - 1, d.y1 + m + 2) }, true);
  for (const g of [gg, cg]) g.restore();
}
// Draw the terrain into a ground and a canopy context at `k` pixels per world unit, with world point (ox, oy) at the
// canvas origin. `win` limits it to a window of tiles {x0, y0, x1, y1}; null draws the whole field. Returns whether
// any canopy was drawn.
// Pre-drawn canopy pictures (trees), one set per scale. stamper() returns a function that places picture `v` with
// its anchor at world point (x, y), snapped to whole pixels so it stays crisp.
const stampSets = new Map();
function stamper(def, g, k) {
  const S = def.canopyStamp, key = def.id + '@' + k.toFixed(3);
  let set = stampSets.get(key);
  if (!set) {
    if (stampSets.size > 5) stampSets.delete(stampSets.keys().next().value);
    set = [];
    for (let v = 0; v < S.n; v++) {
      const c = document.createElement('canvas'); c.width = Math.ceil(S.w * k); c.height = Math.ceil(S.h * k);
      const cg = c.getContext('2d'); cg.setTransform(k, 0, 0, k, S.ax * k, S.ay * k); S.draw(cg, v);
      set.push(c);
    }
    stampSets.set(key, set);
  }
  const m = g.getTransform(), a = m.a, e = m.e, f = m.f;
  return (v, x, y) => {
    const c = set[v], px = Math.round((x - S.ax) * a + e), py = Math.round((y - S.ay) * a + f);
    g.drawImage(c, (px - e) / a, (py - f) / a, c.width / a, c.height / a);
  };
}
function paintTerrain(gg, cg, k, ox, oy, win, direct) {
  const tiles = world.tiles, TC = world.TC, TR = world.TR;
  if (!direct) for (const g of [gg, cg]) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.setTransform(k, 0, 0, k, -ox * k, -oy * k); }
  let hasCanopy = false;
  for (let idx = 1; idx < FO.terrain.length; idx++) {
    const def = FO.terrain[idx], list = [];
    if (win) { for (let ty = win.y0; ty <= win.y1; ty++) for (let tx = win.x0; tx <= win.x1; tx++) { const i = ty * TC + tx; if (tiles[i] === idx) list.push(i); } }
    else for (let i = 0; i < tiles.length; i++) if (tiles[i] === idx) list.push(i);
    if (!list.length) continue;
    const each = fn => { for (const i of list) fn(i % TC, (i / TC) | 0); };
    // A tile surrounded by its own kind is "inner": it needs no outline, shadow or rounded corner, so runs of them
    // are filled as plain rectangles. Only the rim of a blob is drawn as a shaped path.
    const inner = list.map(i => { const tx = i % TC, ty = (i / TC) | 0; return tx > 0 && tx < TC - 1 && ty > 0 && ty < TR - 1 && tiles[i - 1] === idx && tiles[i + 1] === idx && tiles[i - TC] === idx && tiles[i + TC] === idx; });
    const rim = (g, grow) => { for (let n = 0; n < list.length; n++) if (!inner[n]) tilePath(g, list[n] % TC, (list[n] / TC) | 0, idx, grow); };
    const whole = g => {
      for (let n = 0; n < list.length; n++) {
        const i = list[n];
        if (!inner[n]) { tilePath(g, i % TC, (i / TC) | 0, idx, 0); continue; }
        let m = n; while (m + 1 < list.length && inner[m + 1] && list[m + 1] === list[m] + 1) m++;       // a run along the row
        g.rect((i % TC) * T, ((i / TC) | 0) * T, (m - n + 1) * T, T); n = m;
      }
    };
    if (gg) {
      if (def.shadow) {
        gg.fillStyle = 'rgba(28,29,34,.22)'; gg.beginPath();
        gg.save(); gg.translate(3, 6); rim(gg, 1.5); gg.fill(); gg.restore();
      }
      gg.fillStyle = def.edge || INK; gg.beginPath(); rim(gg, 1.6); gg.fill();
      gg.fillStyle = def.color || '#ccc'; gg.beginPath(); whole(gg); gg.fill();
      if (def.sunken || def.raised) {       // a lip along the far edge gives depth (sunken) or height (raised)
        gg.save(); gg.beginPath(); whole(gg); gg.clip();
        gg.fillStyle = def.sunken ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.35)';
        each((tx, ty) => { if (ty === 0 || tiles[(ty - 1) * TC + tx] !== idx) gg.fillRect(tx * T, ty * T, T, def.sunken ? 7 : 4); });
        if (def.raised) { gg.fillStyle = 'rgba(0,0,0,.22)'; each((tx, ty) => { if (ty === TR - 1 || tiles[(ty + 1) * TC + tx] !== idx) gg.fillRect(tx * T, ty * T + T - 6, T, 6); }); }
        gg.restore();
      }
      if (def.detail) each((tx, ty) => def.detail(gg, tx * T, ty * T, T, hashRnd(tx, ty)));
    }
    if (def.canopy) {
      hasCanopy = true;
      if (cg) { const st = def.canopyStamp ? stamper(def, cg, k) : null; each((tx, ty) => def.canopy(cg, tx * T, ty * T, T, hashRnd(tx, ty), st)); }
    }
  }
  return hasCanopy;
}

/* ---------- sharp terrain ----------
   The full-field layers above are only 1.5 pixels per unit, which blurs when zoomed in. When the screen shows the
   field at more detail than that, the visible part is redrawn at screen resolution, once the camera has held still
   for a moment (or straight away if the view is small enough to be cheap). While zooming or panning, the full-field
   layers stand in. */
const sharp = { ground: document.createElement('canvas'), canopy: document.createElement('canvas'), key: '', ver: -1, want: '', since: 0, x: 0, y: 0, w: 0, h: 0, canopyOn: false, dirty: 'all' };
const sg = sharp.ground.getContext('2d'), sc = sharp.canopy.getContext('2d');
// the tiles on screen, padded by one (trees and shadows spill over their tile), or null if the field is off screen
function tileWindow(view) {
  const { cam, vw, vh } = view, z = cam.z;
  const x0 = Math.max(0, Math.floor(cam.x / T) - 1), y0 = Math.max(0, Math.floor(cam.y / T) - 1);
  const x1 = Math.min(world.TC - 1, Math.ceil((cam.x + vw / z) / T) + 1), y1 = Math.min(world.TR - 1, Math.ceil((cam.y + vh / z) / T) + 1);
  return x1 < x0 || y1 < y0 ? null : { x0, y0, x1, y1 };
}
function sharpTerrain(view, k, now) {
  const tw = tileWindow(view); if (!tw) return false;
  const { x0, y0, x1, y1 } = tw;
  const key = `${x0},${y0},${x1},${y1},${k.toFixed(3)}`;
  if (sharp.key === key && sharp.ver === world.tileVersion) return true;
  if (sharp.key === key && sharp.dirty && sharp.dirty !== 'all') {     // same view, a few tiles changed: patch them in place
    repaintPart(sg, sc, k, sharp.x, sharp.y, sharp.dirty);
    sharp.dirty = null; sharp.ver = world.tileVersion; sharp.canopyOn = hasCanopy;
    return true;
  }
  if (sharp.want !== key || sharp.wantVer !== world.tileVersion) { sharp.want = key; sharp.wantVer = world.tileVersion; sharp.since = now; }
  const tilesInView = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (tilesInView > 900 && now - sharp.since < 0.12) return false;     // still moving: wait, and show the blurry layer meanwhile
  const ox = x0 * T, oy = y0 * T, w = (x1 - x0 + 1) * T, h = (y1 - y0 + 1) * T;
  const pw = Math.ceil(w * k), ph = Math.ceil(h * k);
  if (pw * ph > 16e6) return false;                                    // absurdly large: not worth it
  for (const c of [sharp.ground, sharp.canopy]) if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  sharp.canopyOn = paintTerrain(sg, sc, k, ox, oy, { x0, y0, x1, y1 });
  sharp.key = key; sharp.ver = world.tileVersion; sharp.x = ox; sharp.y = oy; sharp.w = w; sharp.h = h; sharp.dirty = null;
  return true;
}

/* ---------- decals: marks left on the ground ---------- */
const decal = document.createElement('canvas'); decal.width = W; decal.height = H;
const dctx = decal.getContext('2d');
let decalVer = 0;
FO.decal = function (x, y, r, color, kind) {
  decalVer++;
  dctx.fillStyle = color;
  dctx.globalAlpha = kind === 'scorch' ? 0.1 : 0.16;
  dctx.beginPath(); dctx.arc(x, y, r * 1.05, 0, 6.29); dctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * 6.28, d = r * (0.6 + Math.random() * 0.9);
    dctx.globalAlpha = (kind === 'scorch' ? 0.05 : 0.1) + Math.random() * 0.12;
    dctx.beginPath(); dctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.12 + Math.random() * 0.3), 0, 6.29); dctx.fill();
  }
  dctx.globalAlpha = 1;
};
FO.clearDecals = () => { decalVer++; dctx.clearRect(0, 0, W, H); };
FO.on('reset', FO.clearDecals);

/* ---------- frame ---------- */
let pattern = null;
// Grass: one flat muted green with short blades, drawn at 2x and tiled.
const GRASS = '#adbd9c';
function fieldPattern(ctx) {
  const N = 192, S = 2, p = document.createElement('canvas'); p.width = p.height = N * S;
  const g = p.getContext('2d'); g.scale(S, S);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const wrap = fn => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) fn(ox, oy); };
  g.fillStyle = GRASS; g.fillRect(0, 0, N, N);
  g.lineCap = 'round';
  for (let i = 0; i < 170; i++) {
    const x = rnd() * N, y = rnd() * N, h = 2 + rnd() * 3.5, lean = (rnd() - 0.5) * 2.4, light = rnd() < 0.35;
    g.strokeStyle = light ? 'rgba(236,240,222,.22)' : 'rgba(74,94,60,.16)';
    g.lineWidth = 0.9 + rnd() * 0.5;
    wrap((ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + lean, y + oy - h); g.stroke(); });
  }
  const pat = ctx.createPattern(p, 'repeat');
  if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / S));
  return pat;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// The frame's world-to-screen transform (scale B, offset E, F in device pixels), and the part of the world on screen
// with a margin. Anything drawn with its own transform builds on the first; anything outside the second is skipped.
let B = 1, E = 0, F = 0;
const vis = { x0: 0, y0: 0, x1: 0, y1: 0 };
const onScreen = (x, y, r) => x + r > vis.x0 && x - r < vis.x1 && y + r > vis.y0 && y - r < vis.y1;
// Set the canvas to: the frame transform, then translate (tx, ty), scale (sx, sy), rotate by rot. No save/restore needed;
// call resetT() afterwards.
function place(ctx, tx, ty, sx, sy, rot) {
  const c = rot ? Math.cos(rot) : 1, s = rot ? Math.sin(rot) : 0;
  ctx.setTransform(B * sx * c, B * sy * s, -B * sx * s, B * sy * c, B * tx + E, B * ty + F);
}
const resetT = ctx => ctx.setTransform(B, 0, 0, B, E, F);
FO.onScreen = onScreen;

// The battlefield under everything that moves (its shadow, grass, scorch marks, terrain, border) changes only when the
// view, the tiles or the marks do, so it is drawn once into a screen-sized picture and copied every frame after that.
const backdrop = { c: document.createElement('canvas'), key: '' };
backdrop.g = backdrop.c.getContext('2d');

/* view = { ctx, dpr, vw, vh, cam:{x,y,z}, hover:{x,y}|null, cursor:{r,color,fill}|null, hoverUnit } */
FO.render = function (view) {
  const { ctx, dpr, vw, vh, cam } = view, z = cam.z;
  if (!pattern) pattern = fieldPattern(ctx);
  if (drawnVersion !== world.tileVersion) redrawTerrain();
  const now = performance.now() / 1000;
  const px = z * dpr;
  lod = px <= 1.1 ? 1 : px <= 2.2 ? 2 : px <= 4.4 ? 4 : 6;
  const sh = world.shake, sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, vw, vh);
  B = dpr * z; E = (-cam.x * z + sx) * dpr; F = (-cam.y * z + sy) * dpr;
  const m = 90 / Math.min(1, z);                 // margin: speech bubbles, health bars and flyers poke out of a unit's circle
  vis.x0 = cam.x - m; vis.y0 = cam.y - m; vis.x1 = cam.x + vw / z + m; vis.y1 = cam.y + vh / z + m;

  // Zoomed in: draw the visible tiles straight onto the screen (few of them, always sharp). In between: a cached
  // copy of the visible part at screen resolution. Zoomed out: the full-field layer is already sharp enough.
  const tw = tileWindow(view), few = px > TS * 1.08 && tw && (tw.x1 - tw.x0 + 1) * (tw.y1 - tw.y0 + 1) <= 700;
  const crisp = !few && px > TS * 1.08 && sharpTerrain(view, px, now);
  if (!few && !crisp) freshBase();
  const bw = Math.round(vw * dpr), bh = Math.round(vh * dpr);
  const key = `${cam.x},${cam.y},${z},${dpr},${bw},${bh},${world.tileVersion},${decalVer},${few ? 'f' : crisp ? 'c' + sharp.key + sharp.ver : 'b'}`;
  if (backdrop.key !== key) {
    backdrop.key = key;
    const c = backdrop.c, g = backdrop.g;
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; } else { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, bw, bh); }
    g.setTransform(dpr * z, 0, 0, dpr * z, -cam.x * z * dpr, -cam.y * z * dpr);
    // the field: a sheet of paper with a hard shadow
    roundRect(g, 7 / z, 9 / z, W, H, 14); g.fillStyle = INK; g.fill();
    roundRect(g, 0, 0, W, H, 14); g.fillStyle = pattern; g.fill();
    g.save(); g.clip();
    g.drawImage(decal, 0, 0, W, H);
    if (few) paintTerrain(g, null, px, 0, 0, tw, true);
    else if (crisp) g.drawImage(sharp.ground, sharp.x, sharp.y, sharp.w, sharp.h);
    else g.drawImage(ground, 0, 0, W, H);
    g.restore();
    roundRect(g, 0, 0, W, H, 14); g.strokeStyle = INK; g.lineWidth = 2.5 / Math.min(1, z); g.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);              // the backdrop is already in device pixels
  ctx.drawImage(backdrop.c, sx * dpr, sy * dpr);
  resetT(ctx);
  drawProps(ctx, now);

  const units = world.units;
  const over = world.mode === 'over';
  // laggy fighters are drawn where their last update put them, not where they really are
  let lagged = null;
  if (world.mode === 'running' || world.mode === 'paused') for (let i = 0; i < units.length; i++) {
    const u = units[i], L = u.lag; if (!L || !u.alive || u.carried) continue;
    (lagged || (lagged = [])).push(u, u.x, u.y, u.face, u.moving);
    u.x = L.x; u.y = L.y; u.face = L.face; if (L.frozen) u.moving = false;
  }
  // ground shadows carry the team colour
  for (let t = 0; t < FO.teams.length; t++) {
    let any = false;
    ctx.beginPath();
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (u.team !== t || ((u.under || u.swimming) && !over) || !onScreen(u.x, u.y, u.def.r * 2)) continue;
      const r = u.def.r, fly = u.def.flying;
      const yy = u.y + r * (fly ? 1.3 : 0.88), rx = r * (fly ? 0.7 : 0.98);
      ctx.moveTo(u.x + rx, yy); ctx.ellipse(u.x, yy, rx, r * (fly ? 0.24 : 0.34), 0, 0, 6.29); any = true;
    }
    if (any) { ctx.fillStyle = FO.teams[t].color; ctx.globalAlpha = 0.92; ctx.fill(); }
  }
  ctx.globalAlpha = 1;

  // the Void: a pool of darkness round anything that has one, drawn on the ground under everybody. Its edge breathes.
  for (let i = 0; i < units.length; i++) {
    const u = units[i], v = u.alive && u.def._void; if (!v) continue;
    const R = v * (1 + Math.sin(now * 1.3) * 0.015), g = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, R);
    g.addColorStop(0, 'rgba(0,0,0,.96)'); g.addColorStop(0.55, 'rgba(0,0,0,.88)'); g.addColorStop(0.85, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u.x, u.y, R, 0, 6.29); ctx.fill();
    for (let k = 0; k < 10; k++) {                    // smoke drifting round the edge, so it is never a clean circle
      const a = k / 10 * 6.283 + now * 0.1 * (k % 2 ? 1 : -1), d = R * (0.8 + 0.1 * Math.sin(now * 0.8 + k * 1.9)), r = R * (0.28 + 0.06 * Math.sin(now * 1.1 + k));
      const x = u.x + Math.cos(a) * d, y = u.y + Math.sin(a) * d, sg = ctx.createRadialGradient(x, y, 0, x, y, r);
      sg.addColorStop(0, 'rgba(0,0,0,.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    }
  }
  // while natures are being painted, show the ground each territorial fighter will hold
  if (world.mode === 'edit' && FO.ui && FO.ui.tab === 'nature') {
    ctx.beginPath();
    for (let i = 0; i < units.length; i++) { const u = units[i]; if (u.nature === 'territorial') { ctx.moveTo(u.x + FO.nature.TERRITORY, u.y); ctx.arc(u.x, u.y, FO.nature.TERRITORY, 0, 6.29); } }
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
  }
  // units: ground first (then the tree canopy), then flyers
  const sorted = units.filter(u => onScreen(u.x, u.y, u.def.r * 2.5)).sort((a, b) => (a.def.flying - b.def.flying) || (a.y - b.y));
  const win = world.mode === 'over' && world.result && world.result.kind === 'win';
  let i = 0;
  for (; i < sorted.length && !sorted[i].def.flying; i++) drawUnit(ctx, sorted[i], z, now, win);
  if (hasCanopy) {
    ctx.globalAlpha = 0.9;
    if (few) paintTerrain(null, ctx, px, 0, 0, tw, true);
    else if (crisp) { if (sharp.canopyOn) ctx.drawImage(sharp.canopy, sharp.x, sharp.y, sharp.w, sharp.h); }
    else { freshBase(); ctx.drawImage(canopy, 0, 0, W, H); }
    ctx.globalAlpha = 1;
  }
  if (FO.react) FO.react.draw(ctx, now, z);
  for (; i < sorted.length; i++) drawUnit(ctx, sorted[i], z, now, win);
  if (world.mode === 'edit') drawNatures(ctx, units);

  if (lagged) for (let i = 0; i < lagged.length; i += 5) {
    const u = lagged[i], L = u.lag;
    if (L.gt > 0) { const spr = FO.sprite(u.def, u.team, lod), sz = spr.width / lod; ctx.globalAlpha = L.gt / 0.3 * 0.4; ctx.drawImage(spr, L.gx - sz / 2, L.gy - sz / 2, sz, sz); ctx.globalAlpha = 1; }
    u.x = lagged[i + 1]; u.y = lagged[i + 2]; u.face = lagged[i + 3]; u.moving = lagged[i + 4];
  }
  drawShots(ctx);
  drawFx(ctx, z);

  // brush cursor
  if (view.hover && view.cursor) {
    const c = view.cursor;
    if (c.fill) { ctx.fillStyle = c.fill; ctx.beginPath(); ctx.arc(view.hover.x, view.hover.y, c.r, 0, 6.29); ctx.fill(); }
    ctx.strokeStyle = c.color; ctx.lineWidth = 1.8 / z; ctx.setLineDash(c.keep ? [1.5 / z, 4 / z] : [6 / z, 5 / z]);   // keeping terrain: a dotted, hollow brush
    ctx.beginPath(); ctx.arc(view.hover.x, view.hover.y, c.r, 0, 6.29); ctx.stroke();
    ctx.setLineDash([]);
  }
  // hovered unit label
  const hu = view.hoverUnit;
  if (hu && hu.alive) {
    const label = `${hu.def.name} · ${Math.ceil(hu.hp)}/${hu.maxHp}` + (hu.kills ? ` · ${hu.kills} KO` : '');
    tag(ctx, hu.x, hu.y - hu.def.r - 12 / z, label, z, FO.teams[hu.team].dark);
  }
};

function tag(ctx, x, y, text, z, color) {
  const fs = 12 / Math.max(0.6, Math.min(z, 1.6));
  ctx.font = `600 ${fs}px ${UI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + fs, h = fs * 1.7;
  roundRect(ctx, x - w / 2, y - h, w, h, h / 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = fs * 0.12; ctx.stroke();
  ctx.fillStyle = color || INK; ctx.fillText(text, x, y - h / 2 + fs * 0.05);
}

// The thing in a unit's hand: SVG art when there is some, otherwise its emoji.
function weaponSprite(def) {
  const img = weaponArt(def), r = def.r;
  if (!img) return def.weapon ? FO.glyphSprite(def.weapon, Math.min(34, Math.max(8, r * 1.05))) : null;
  const px = Math.round(r * 2), key = 'art|' + def.id + '|' + px + '|' + lod;
  let c = glyphs.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = px * lod; c.px = px;
    c.getContext('2d').drawImage(img, 0, 0, px * lod, px * lod);
    glyphs.set(key, c);
  }
  return c;
}
// A burrowed unit shows only as a moving mound of loose earth.
function drawMound(ctx, u, now) {
  const r = u.def.r, w = Math.sin(now * 9 + u.id) * 1.5;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(u.x, u.y, r * 0.78 + 1.6, r * 0.36 + 1.6, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#b9925c'; ctx.beginPath(); ctx.ellipse(u.x, u.y, r * 0.78, r * 0.36, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#d4b483'; ctx.beginPath(); ctx.ellipse(u.x - r * 0.1, u.y - r * 0.1 + w * 0.3, r * 0.5, r * 0.18, 0, 0, 6.29); ctx.fill();
  ctx.strokeStyle = '#7a5c36'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(u.x - r * 0.4, u.y + w * 0.4); ctx.lineTo(u.x - r * 0.1, u.y - r * 0.08); ctx.lineTo(u.x + r * 0.15, u.y + r * 0.06 + w * 0.3); ctx.lineTo(u.x + r * 0.45, u.y - r * 0.04);
  ctx.stroke();
}
function drawUnit(ctx, u, z, now, win) {
  if (u.under && world.mode !== 'over') return drawMound(ctx, u, now);
  const def = u.def, r = def.r, spr = FO.sprite(def, u.team, lod), sz = spr.width / lod;
  let bob = 0;
  if (u.moving) bob = -Math.abs(Math.sin(u.phase)) * r * 0.2;
  if (def.flying) bob += -r * 0.45 - 4 + Math.sin(now * 3 + u.id) * 2.5;
  if (u.z) bob -= u.z;
  if (win) bob -= Math.abs(Math.sin(now * 7 + u.id * 1.7)) * (6 + r * 0.15);
  const scale = (u.pop > 0 ? 1 + Math.sin((u.pop / 0.25) * Math.PI) * 0.25 : 1) * (u.size || 1);
  const frozen = u.stunned;

  // feet
  if (def.ground === 'hole') {
    ctx.fillStyle = '#b9925c'; ctx.beginPath(); ctx.ellipse(u.x, u.y + r * 0.84, r * 1.02, r * 0.4, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#4a3520'; ctx.beginPath(); ctx.ellipse(u.x, u.y + r * 0.84, r * 0.8, r * 0.28, 0, 0, 6.29); ctx.fill();
  }
  const swim = u.swimming && world.mode !== 'over';
  if (swim) {            // a ripple in the team colour instead of a shadow
    ctx.strokeStyle = FO.teams[u.team].color; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(u.x, u.y + r * 0.2, r * (1.05 + Math.sin(now * 4 + u.id) * 0.06), r * 0.38, 0, 0, 6.29); ctx.stroke();
  }
  if (!def.flying && !def.noFeet && !u.noFeet && !swim && r >= 5) {
    const s = u.moving && !frozen ? Math.sin(u.phase) : 0, fr = Math.max(1.6, r * 0.24), fy = u.y + r * 0.9;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(u.x - r * 0.42 + s * r * 0.22, fy - Math.max(0, s) * r * 0.16, fr, fr * 0.72, 0, 0, 6.29);
    ctx.ellipse(u.x + r * 0.42 - s * r * 0.22, fy - Math.max(0, -s) * r * 0.16, fr, fr * 0.72, 0, 0, 6.29);
    ctx.fill();
  }
  // body
  // art faces right; emoji that face left are marked with `flip`
  const flipX = bodyArt(def) ? (u.face < 0 ? -1 : 1) : def.flip ? (u.face > 0 ? -1 : 1) : 1;
  const rise = u.riseK != null && u.riseK < 1 ? Math.max(0.05, u.riseK) : 1, rot = def.roll ? u.phase * 0.5 : (u.spin || 0);
  if (swim) { ctx.save(); ctx.beginPath(); ctx.rect(u.x - sz, u.y + bob - sz, sz * 2, sz + r * 0.2); ctx.clip(); }   // only what is above the waterline
  const plain = flipX === 1 && scale === 1 && rise === 1 && !rot;
  if (!plain) place(ctx, u.x, u.y + bob + r * (1 - rise), flipX * scale, scale * rise, rot);
  const ox = plain ? u.x - sz / 2 : -sz / 2, oy = plain ? u.y + bob - sz / 2 : -sz / 2;
  if (u.blind) { ctx.globalAlpha = 0.5; ctx.drawImage(spr, ox - r * 0.2, oy, sz, sz); ctx.drawImage(spr, ox + r * 0.2, oy, sz, sz); ctx.globalAlpha = 1; }      // seeing double
  else ctx.drawImage(spr, ox, oy, sz, sz);
  for (let i = 0; i < u.st.length; i++) ctx.drawImage(tinted(spr, u.st[i].impl.color), ox, oy, sz, sz);
  if (u.flash > 0) { ctx.globalAlpha = Math.min(0.8, u.flash * 9); ctx.drawImage(tinted(spr, '#fff'), ox, oy, sz, sz); ctx.globalAlpha = 1; }
  if (!plain) resetT(ctx);
  if (swim) {
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(u.x, u.y + r * 0.2, r * 0.8, r * 0.2, 0, 0.15, Math.PI - 0.15); ctx.stroke();
  }
  if (u.specs && !u.blind) {          // been to see Zach: wears glasses for the rest of the battle
    const gx = u.x + u.face * r * 0.1, gy = u.y + bob + r * 0.04, gr = r * 0.2, gap = r * 0.23;
    ctx.lineWidth = Math.max(1.1, r * 0.1); ctx.strokeStyle = INK; ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.arc(gx - gap, gy, gr, 0, 6.29); ctx.moveTo(gx + gap + gr, gy); ctx.arc(gx + gap, gy, gr, 0, 6.29); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx - gap + gr, gy); ctx.lineTo(gx + gap - gr, gy); ctx.stroke();
  }
  // weapon in hand
  const g = weaponSprite(def);
  if (g) {
    const gs = g.px;
    const k = u.swing > 0 ? 1 - u.swing / 0.22 : 1;
    const ang = u.swing > 0 ? (-0.9 + Math.sin(k * Math.PI) * 1.7) : -0.25 + (u.moving ? Math.sin(u.phase) * 0.12 : 0);
    place(ctx, u.x + u.face * r * 0.88, u.y + bob + r * 0.22, u.face, 1, ang);
    ctx.drawImage(g, -gs / 2, -gs * 0.62, gs, gs);
    resetT(ctx);
  }
  // health bar
  if (u.hp < u.maxHp) {
    const w = Math.max(10, r * 1.7), h = Math.max(2.2, 3 / Math.max(z, 0.6)), y = u.y + bob - r * 1.1 - h - 3;
    ctx.fillStyle = INK; ctx.fillRect(u.x - w / 2 - 0.8, y - 0.8, w + 1.6, h + 1.6);
    ctx.fillStyle = '#fff'; ctx.fillRect(u.x - w / 2, y, w, h);
    ctx.fillStyle = FO.teams[u.team].color; ctx.fillRect(u.x - w / 2, y, w * Math.max(0, u.hp / u.maxHp), h);
  }
}

// A fighter's nature shows as a small badge while the field is being edited.
const badges = {};
function natureBadge(id) {
  if (badges[id]) return badges[id];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 30, 0, 6.29); g.fill();
  g.fillStyle = INK; g.beginPath(); g.arc(32, 32, 26, 0, 6.29); g.fill();
  g.translate(32 - 12 * 1.7, 32 - 12 * 1.7); g.scale(1.7, 1.7);
  g.strokeStyle = '#fff'; g.lineWidth = 2.3; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(new Path2D(FO.natures[id].icon));
  return (badges[id] = c);
}
function drawNatures(ctx, units) {
  for (let i = 0; i < units.length; i++) {
    const u = units[i]; if (!u.nature || !FO.natures[u.nature]) continue;
    const r = u.def.r, s = Math.max(10, Math.min(15, r * 0.95));
    ctx.drawImage(natureBadge(u.nature), u.x + r * 0.72 - s / 2, u.y - r * 0.8 - s / 2 - (u.def.flying ? r * 0.45 + 4 : 0), s, s);
  }
}

function drawProps(ctx, now) {
  for (const p of world.props) {
    const def = p.def, img = artImg(p.spent && def.artSpent ? def.artSpent : def.art), r = def.r, s = r * def.artScale;
    if (def.solid) { ctx.fillStyle = 'rgba(28,29,34,.2)'; ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + r * 0.55, r * 1.05, r * 0.5, 0, 0, 6.29); ctx.fill(); }
    ctx.save(); ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate(p.rot);
    if (p.fuse != null) { const k = 1.1 + Math.sin(now * 60) * 0.08; ctx.scale(k, k); }
    if (img) ctx.drawImage(img, -s / 2, -s / 2, s, s);
    else { ctx.fillStyle = '#9a9590'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.fill(); }
    if (p.flash > 0 || p.fuse != null) { ctx.globalAlpha = p.fuse != null ? 0.45 : 0.6; ctx.fillStyle = p.fuse != null ? '#ffd43b' : '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
}

function drawShots(ctx) {
  const shots = world.shots;
  for (let i = 0; i < shots.length; i++) {
    const p = shots[i];
    if (!onScreen(p.x, p.y, 40 + (p.z || 0))) continue;
    if (p.look === 'arrow') {
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, l = 13, zz = p.z || 0, ay = p.y - zz;
      if (p.lob) { ctx.fillStyle = 'rgba(28,29,34,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 3.5, 1.6, 0, 0, 6.29); ctx.fill(); }
      ctx.strokeStyle = '#4a3b28'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x - ux * l, ay - uy * l); ctx.lineTo(p.x, ay); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(p.x + ux * 3, ay + uy * 3); ctx.lineTo(p.x - ux * 2 - uy * 2.4, ay - uy * 2 + ux * 2.4); ctx.lineTo(p.x - ux * 2 + uy * 2.4, ay - uy * 2 - ux * 2.4); ctx.fill();
    } else if (p.look === 'puff') {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = 0.85 * (1 - k * 0.7);
      ctx.fillStyle = k < 0.35 ? '#ffd34d' : k < 0.7 ? '#ff8a2a' : '#e8452c';
      ctx.beginPath(); ctx.arc(p.x, p.y - (p.lift || 0) * (1 - k), 4 + k * 9, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.look === 'spray') {                               // Ryan's coffee: a light crema going dark
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = 0.85 * (1 - k * 0.6);
      ctx.fillStyle = k < 0.35 ? '#d9b48a' : k < 0.7 ? '#a0703f' : '#6b4226';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3 + k * 6, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.look === 'glyph') {
      const size = p.size || 16, g = FO.glyphSprite(p.glyph || '🪨', size), gs = g.px, zz = p.z || 0;
      if (p.lob) { ctx.fillStyle = 'rgba(28,29,34,.16)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 5 + size * 0.2, 2.5 + size * 0.08, 0, 0, 6.29); ctx.fill(); }
      ctx.save(); ctx.translate(p.x, p.y - zz); ctx.rotate(p.lob ? p.lob.t * 7 : 0); ctx.drawImage(g, -gs / 2, -gs / 2, gs, gs); ctx.restore();
    } else {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.x, p.y, (p.rad || 3) + 1.4, 0, 6.29); ctx.fill();
      ctx.fillStyle = p.color || '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.rad || 3, 0, 6.29); ctx.fill();
    }
  }
}

// Particles are by far the most numerous effect, so they are gathered by colour and fade step (eight steps) and each
// group is filled in one go, after everything else.
const dotGroups = new Map();
function drawFx(ctx, z) {
  const list = world.fx;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const gs of dotGroups.values()) for (let a = 1; a <= 8; a++) gs[a].length = 0;
  for (let i = 0; i < list.length; i++) {
    const f = list[i], k = f.life / f.max;
    if (f.kind !== 'bubble' && f.kind !== 'bolt' && f.kind !== 'tracer' && f.kind !== 'beam' && !onScreen(f.x, f.y, (f.r || f.size || 20) + 10)) continue;
    switch (f.kind) {
      case 'dot': {
        let gs = dotGroups.get(f.color);
        if (!gs) { gs = [null, [], [], [], [], [], [], [], []]; dotGroups.set(f.color, gs); }
        gs[Math.max(1, Math.ceil(Math.min(1, k * 1.6) * 8))].push(f); break;
      }
      case 'slash':
        ctx.globalAlpha = k * 0.75; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2.4, f.r * 0.22);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, f.a - 0.8, f.a + 0.8); ctx.stroke();
        ctx.strokeStyle = f.color; ctx.lineWidth = Math.max(1, f.r * 0.09); ctx.stroke(); break;
      case 'ring':
        ctx.globalAlpha = k * 0.85; ctx.strokeStyle = f.color; ctx.lineWidth = f.w;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.15 - k * 0.55), 0, 6.29); ctx.stroke(); break;
      case 'tracer':
        ctx.globalAlpha = k; ctx.strokeStyle = f.color; ctx.lineWidth = f.w;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke(); break;
      case 'bolt':
        ctx.globalAlpha = k;
        for (const [col, lw] of [[INK, 5], [f.color, 3], ['#fff', 1.2]]) {
          ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(f.pts[0][0], f.pts[0][1]);
          for (let j = 1; j < f.pts.length; j++) ctx.lineTo(f.pts[j][0], f.pts[j][1]);
          ctx.stroke();
        }
        break;
      case 'beam':
        ctx.globalAlpha = k * 0.8; ctx.strokeStyle = f.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(f.a.x, f.a.y); ctx.lineTo(f.b.x, f.b.y); ctx.stroke(); break;
      case 'ghost': {
        ctx.globalAlpha = k * 0.8;
        const spr = FO.sprite(f.def, f.team, lod), s = 1 + (1 - k) * 0.5, sz = spr.width / lod * s;
        ctx.drawImage(spr, f.x - sz / 2, f.y - sz / 2 - (1 - k) * 14, sz, sz); break;
      }
      case 'text':
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.font = `700 ${f.size}px ${UI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = f.size * 0.28; ctx.strokeStyle = '#fff'; ctx.strokeText(f.str, f.x, f.y);
        ctx.fillStyle = f.color; ctx.fillText(f.str, f.x, f.y); break;
      case 'glyph': {
        ctx.globalAlpha = Math.min(1, k * 2);
        const g = FO.glyphSprite(f.g, f.size); ctx.drawImage(g, f.x - g.px / 2, f.y - g.px / 2, g.px, g.px); break;
      }
      case 'bubble': {
        const u = f.u, a = Math.min(1, k * 6, (1 - k) * 12 + 0.2);
        ctx.globalAlpha = a;
        const fs = 12 / Math.max(0.7, Math.min(z, 1.5));
        ctx.font = `600 ${fs}px ${UI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const w = ctx.measureText(f.text).width + fs * 1.3, h = fs * 1.9, bx = u.x, by = u.y - u.def.r - fs * 0.9 - (u.def.flying ? u.def.r * 0.5 : 0);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(bx - fs * 0.45, by - 2); ctx.lineTo(bx, by + fs * 0.55); ctx.lineTo(bx + fs * 0.45, by - 2); ctx.fill();
        roundRect(ctx, bx - w / 2, by - h, w, h, h / 2); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = fs * 0.14; ctx.stroke();
        ctx.fillStyle = INK; ctx.fillText(f.text, bx, by - h / 2 + fs * 0.05); break;
      }
    }
    ctx.globalAlpha = 1;
  }
  for (const [color, gs] of dotGroups) {
    for (let a = 1; a <= 8; a++) {
      const g = gs[a]; if (!g.length) continue;
      ctx.globalAlpha = a / 8; ctx.fillStyle = color; ctx.beginPath();
      for (let i = 0; i < g.length; i++) { const f = g[i]; ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, 6.29); }
      ctx.fill();
    }
  }
  if (dotGroups.size > 200) dotGroups.clear();      // colours come and go; don't keep empty groups forever
  ctx.globalAlpha = 1;
}
})();
