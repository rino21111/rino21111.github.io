/* =====================================================================
   SVG WARS · map kit
   Extra tools on the scenario builder for drawing geography instead of
   rectangles and circles. Everything here works in tiles (the field is
   70 columns × 44 rows) and is driven by a seeded random number, so a
   map comes out the same every time it is loaded.
     b.seed(n)                                   start the random sequence for this map
     b.blotch(id, c, r, rx, ry, rough, o)        an uneven patch: a wood, a lake, a hill
     b.stroke(id, points, width, o)              a smooth winding line through [c, r] points: a river, a road, a ridge
                                                 (o.straight joins the points with straight lines, o.wobble varies the width)
     b.loop(id, c, r, rx, ry, o)                 an oval outline: a palisade, a ditch. o.gaps = [[degrees, tiles], …]
     b.sprinkle(id, c, r, rx, ry, n, size, o)    n small clumps scattered over an area: boulders, copses, puddles
     b.fringe(id, around, o)                     paint the tiles bordering `around`: mud banks along water (o.patches = in stretches)
     b.box(id, c0, r0, c1, r1, o)                a block of tiles (end not included)
     b.frame(id, c0, r0, c1, r1, o)              the one-tile outline of a block
     b.plan(c, r, rows, legend)                  a picture in text, one character per tile, for buildings
     b.troop / b.one / b.thing                   b.army, b.unit and b.prop, but placed by tile
   id is a terrain id, or null to clear back to grass.
   o.on limits what may be painted over: null = bare ground only, 'water' or ['water', 'mud'] = only those,
   and by default anything. o.chance (0–1) paints only some of the tiles.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO, world = FO.world, TC = world.TC, TR = world.TR;
const LEGEND = { '#': 'wall', '=': 'barricade', '~': 'water', 'r': 'road', 't': 'trees', 'm': 'mud', 'h': 'hill', 'p': 'pit', 'i': 'ice', 'L': 'lava', 's': 'statue', 'k': 'rock', '_': null };

const base = FO.builder;
FO.builder = function () {
  const b = base();
  let s = 1;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const idx = id => id ? FO.terrainById[id].index : 0;
  const allowed = (i, o) => {
    if (!o || o.on === undefined || o.on === '*') return true;
    const cur = world.tiles[i], name = cur ? FO.terrain[cur].id : null;
    return Array.isArray(o.on) ? o.on.indexOf(name) >= 0 : o.on === name;
  };
  const put = (c, r, id, o) => {
    if (c < 0 || r < 0 || c >= TC || r >= TR) return;
    const i = r * TC + c;
    if (!allowed(i, o) || (o && o.chance != null && rnd() > o.chance)) return;
    world.tiles[i] = id;
  };
  const disc = (id, c, r, rad, o) => {
    const oc = Math.floor(c), or = Math.floor(r);
    for (let y = Math.floor(r - rad); y <= Math.ceil(r + rad); y++) for (let x = Math.floor(c - rad); x <= Math.ceil(c + rad); x++)
      if ((x === oc && y === or) || (x + 0.5 - c) ** 2 + (y + 0.5 - r) ** 2 <= rad * rad) put(x, y, id, o);
  };
  const done = () => { world.touchTiles(); return b; };

  b.seed = n => { s = n | 0; return b; };
  b.rnd = rnd;
  b.blotch = (id, c, r, rx, ry, rough, o) => {
    const t = idx(id), k = rough == null ? 0.25 : rough, p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28;
    for (let y = Math.floor(r - ry * 1.6); y <= Math.ceil(r + ry * 1.6); y++) for (let x = Math.floor(c - rx * 1.6); x <= Math.ceil(c + rx * 1.6); x++) {
      const dx = (x + 0.5 - c) / rx, dy = (y + 0.5 - r) / ry, a = Math.atan2(dy, dx);
      const edge = 1 + k * (Math.sin(a * 2 + p1) * 0.5 + Math.sin(a * 3 + p2) * 0.32 + Math.sin(a * 5 + p3) * 0.18) + (rnd() - 0.5) * 0.1;
      if (dx * dx + dy * dy <= edge * edge) put(x, y, t, o);
    }
    return done();
  };
  // points along a smooth curve through pts, about a quarter of a tile apart
  const curve = pts => {
    const out = [], P = i => pts[Math.max(0, Math.min(pts.length - 1, i))];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 4));
      for (let j = 0; j < n; j++) {
        const u = j / n, u2 = u * u, u3 = u2 * u;
        out.push([0.5 * (2 * p1[0] + (p2[0] - p0[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * u3),
                  0.5 * (2 * p1[1] + (p2[1] - p0[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * u3)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const straight = pts => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], z = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(z[0] - a[0], z[1] - a[1]) * 4)); for (let j = 0; j < n; j++) out.push([a[0] + (z[0] - a[0]) * j / n, a[1] + (z[1] - a[1]) * j / n]); }
    out.push(pts[pts.length - 1]);
    return out;
  };
  b.stroke = (id, pts, width, o) => {
    const t = idx(id), w = width || 1.5, wob = o && o.wobble || 0, ph = rnd() * 6.28, line = o && o.straight ? straight(pts) : curve(pts);
    line.forEach((p, i) => disc(t, p[0], p[1], w / 2 * (1 + wob * Math.sin(i * 0.11 + ph)), o));
    return done();
  };
  b.loop = (id, c, r, rx, ry, o) => {
    const t = idx(id), gaps = o && o.gaps || [], w = o && o.width || 1, n = Math.ceil((rx + ry) * 8);
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.2832, x = c + Math.cos(a) * rx, y = r - Math.sin(a) * ry;
      let open = false;
      for (const g of gaps) { const gx = c + Math.cos(g[0] * Math.PI / 180) * rx, gy = r - Math.sin(g[0] * Math.PI / 180) * ry; if (Math.hypot(x - gx, y - gy) < g[1] / 2) open = true; }
      if (!open) disc(t, x, y, w / 2, o);
    }
    return done();
  };
  b.sprinkle = (id, c, r, rx, ry, n, size, o) => {
    const t = idx(id);
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28, d = Math.sqrt(rnd());
      disc(t, c + Math.cos(a) * d * rx, r + Math.sin(a) * d * ry, (size || 1) * (0.35 + rnd() * 0.65), o);
    }
    return done();
  };
  b.fringe = (id, around, o) => {
    const t = idx(id), a = [].concat(around).map(idx), oo = Object.assign({ on: null }, o), hit = [];
    for (let y = 0; y < TR; y++) for (let x = 0; x < TC; x++) {
      if (a.indexOf(world.tiles[y * TC + x]) >= 0) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < TC && ny < TR && a.indexOf(world.tiles[ny * TC + nx]) >= 0) { near = true; break; }
      }
      if (near) hit.push([x, y]);
    }
    // o.patches (-1…1): keep stretches of the border instead of single scattered tiles; higher keeps less
    const q1 = rnd() * 6.28, q2 = rnd() * 6.28, q3 = rnd() * 6.28;
    for (const h of hit) {
      if (oo.patches != null && (Math.sin(h[0] * 0.55 + q1) + Math.sin(h[1] * 0.55 + q2) + Math.sin((h[0] + h[1]) * 0.33 + q3)) / 2 < oo.patches) continue;
      put(h[0], h[1], t, oo);
    }
    return done();
  };
  b.box = (id, c0, r0, c1, r1, o) => { const t = idx(id); for (let y = r0; y < r1; y++) for (let x = c0; x < c1; x++) put(x, y, t, o); return done(); };
  b.frame = (id, c0, r0, c1, r1, o) => {
    const t = idx(id);
    for (let x = c0; x < c1; x++) { put(x, r0, t, o); put(x, r1 - 1, t, o); }
    for (let y = r0; y < r1; y++) { put(c0, y, t, o); put(c1 - 1, y, t, o); }
    return done();
  };
  b.plan = (c, r, rows, legend) => {
    const L = Object.assign({}, LEGEND, legend);
    rows.forEach((line, j) => { for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch in L) put(c + i, r + j, idx(L[ch])); } });
    return done();
  };
  const X = c => c * b.W / TC, Y = r => r * b.H / TR;
  b.troop = (id, team, c, r, w, h, n) => b.army(id, team, X(c), Y(r), X(w), Y(h), n);
  b.one = (id, team, c, r) => b.unit(id, team, X(c), Y(r));
  b.thing = (id, c, r) => b.prop(id, X(c), Y(r));
  return b;
};
})();
