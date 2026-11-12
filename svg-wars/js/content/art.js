/* =====================================================================
   SVG WARS · unit art
   Hand-drawn SVGs that replace a unit's emoji. Keyed by unit id.
     body    the character, drawn facing RIGHT in a 100 × 100 box.
             The unit's hit circle is the middle ~86 of that box; leave
             the feet off (the game draws and animates them) and end the
             body around y = 90.
     weapon  optional, drawn pointing UP in a 100 × 100 box with the
             hand at (50, 62). The game swings it on every attack.
   Team colour is NOT part of the art: it shows in the ground shadow.
   Units without an entry here keep their emoji.
   ===================================================================== */
(function () {
'use strict';
const svg = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200"><g stroke="#1c1d22" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
const eyes = (x, y, gap, r) => `<g stroke="none" fill="#1c1d22"><circle cx="${x}" cy="${y}" r="${r || 4}"/><circle cx="${x + gap}" cy="${y}" r="${r || 4}"/></g>`;

const INK = '#1c1d22', SKIN = '#f2c9a0';
const BODY = 'M22 60 C22 44 34 36 52 36 C70 36 80 44 80 60 L80 78 C80 88 70 91 51 91 C32 91 22 88 22 78 Z';
const CLOTH = 'M22 70 C36 76 66 76 80 70 L80 78 C80 88 70 91 51 91 C32 91 22 88 22 78 Z';
const TALL = 'M20 60 C20 36 34 22 51 22 C68 22 82 36 82 60 L82 78 C82 88 72 91 51 91 C30 91 20 88 20 78 Z';
const HOOD = 'M20 62 C20 30 34 8 54 6 C50 14 80 30 80 62 L80 78 C80 88 70 91 50 91 C30 91 20 88 20 78 Z';
const person = (skin, cloth) => `<path d="${BODY}" fill="${skin}"/><path d="${CLOTH}" fill="${cloth}"/>`;
const line = (d, color, w) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 5}"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
const smile = (x, y, w) => `<path d="M${x} ${y} Q${x + w / 2} ${y + 5} ${x + w} ${y}" fill="none" stroke-width="3"/>`;

// A forehead. The basic body stops low, so anyone with a high hairline needs this under the hair or the ground shows through.
const dome = y => `<path d="M27 52 C27 ${y + 9} 38 ${y} 52 ${y} C66 ${y} 76 ${y + 9} 76 52 Z" fill="${SKIN}" stroke="none"/>`;
// Sierra looks the same in both her lives from the neck up: hair parted in the middle and pulled back, a long braid
// over one shoulder, clear glasses.
const SIERRA_BRAID = `<path d="M21 57 C16 67 18 81 25 90 C31 83 32 67 29 57 Z" fill="#6b4a35"/>
      <path d="M19.5 66 L25 71 L30.5 66 M20 75 L25 80 L30 75" fill="none" stroke="#4a3122" stroke-width="2.2"/>
      <path d="M21.5 85.5 H28.5" fill="none" stroke="#d9606a" stroke-width="3"/>`;
const SIERRA_HEAD = `${dome(21)}
      <path d="M19 58 C14 28 33 12 51 12 C69 12 88 28 83 58 L77 56 C77 46 74 38 67 33 C62 30 56 28 51 27 C46 28 40 30 35 33 C28 38 26 46 26 56 Z" fill="#6b4a35"/>
      <path d="M51 13 V27 M40 17 C35 22 31 28 29 35 M62 17 C67 22 71 28 73 35" fill="none" stroke="#4a3122" stroke-width="2.2"/>
      <g stroke="none" fill="#f08f8a" opacity=".5"><circle cx="35" cy="63" r="4.5"/><circle cx="73" cy="63" r="4.5"/></g>
      <g fill="rgba(255,255,255,.3)" stroke="#9aa6c4" stroke-width="2"><rect x="36.5" y="46.5" width="16.5" height="15" rx="6.5"/><rect x="56" y="46.5" width="16.5" height="15" rx="6.5"/></g>
      <path d="M53 52.5 H56" fill="none" stroke="#9aa6c4" stroke-width="2"/>
      ${eyes(45, 54, 19, 3.4)}
      <path d="M43 64.5 Q54.5 78 66 64.5 Z" fill="#ffffff" stroke-width="2.6"/>`;

// A curly outline: n little bumps round an oval.
const fluff = (cx, cy, rx, ry, n) => {
  const r = ((rx + ry) / 2 * 3.5 / n).toFixed(1);
  let d = '';
  for (let i = 0; i <= n; i++) { const a = i / n * 6.2832, x = (cx + Math.cos(a) * rx).toFixed(1), y = (cy + Math.sin(a) * ry).toFixed(1); d += i ? `A${r} ${r} 0 0 1 ${x} ${y} ` : `M${x} ${y} `; }
  return d + 'Z';
};

window.FO.art = {
  peasant: {
    body: svg(`
      <path d="M22 60 C22 44 34 36 52 36 C70 36 80 44 80 60 L80 78 C80 88 70 91 51 91 C32 91 22 88 22 78 Z" fill="#f2c9a0"/>
      <path d="M22 70 C36 76 66 76 80 70 L80 78 C80 88 70 91 51 91 C32 91 22 88 22 78 Z" fill="#5b8fd6"/>
      <path d="M40 73 V90 M62 73 V90" fill="none" stroke-width="3"/>
      <path d="M8 40 C24 46 78 46 94 40 C90 34 80 32 74 32 C72 16 62 10 51 10 C40 10 30 16 28 32 C22 32 12 34 8 40 Z" fill="#f0cf6b"/>
      <path d="M28 32 C40 36 62 36 74 32" fill="none" stroke-width="3"/>
      ${eyes(50, 54, 16)}
      <path d="M52 63 Q59 68 66 63" fill="none" stroke-width="3"/>
      <path d="M74 52 L92 46" fill="none" stroke="#c98a3c" stroke-width="3"/>`),
    weapon: svg(`
      <path d="M50 92 V30" fill="none" stroke="#9a6a3a" stroke-width="6"/>
      <path d="M50 92 V30" fill="none" stroke-width="0"/>
      <path d="M32 6 V26 Q32 34 50 34 Q68 34 68 26 V6 M50 6 V34" fill="none" stroke="#1c1d22" stroke-width="8"/>
      <path d="M32 6 V26 Q32 34 50 34 Q68 34 68 26 V6 M50 6 V34" fill="none" stroke="#c9ced8" stroke-width="3.5"/>`),
  },

  knight: {
    body: svg(`
      <path d="M48 16 C36 -2 66 -4 76 10 C68 10 60 14 56 20 Z" fill="#e2574c"/>
      <path d="M18 56 C18 30 32 14 50 14 C68 14 82 30 82 56 L82 78 C82 88 72 91 50 91 C28 91 18 88 18 78 Z" fill="#c9ced8"/>
      <path d="M26 54 C26 36 36 24 48 21" fill="none" stroke="#ffffff" stroke-width="4" opacity=".7"/>
      <path d="M34 42 H82 V58 H34 Q30 50 34 42 Z" fill="#2a2c36"/>
      <g stroke="none" fill="#ffffff"><circle cx="54" cy="50" r="4.5"/><circle cx="70" cy="50" r="4.5"/></g>
      <path d="M18 68 C36 74 64 74 82 68" fill="none" stroke-width="3"/>
      <g stroke="none" fill="#1c1d22"><circle cx="30" cy="80" r="2.4"/><circle cx="50" cy="83" r="2.4"/><circle cx="70" cy="80" r="2.4"/></g>`),
    weapon: svg(`
      <path d="M44 58 V14 L50 4 L56 14 V58 Z" fill="#e6e9f0"/>
      <path d="M50 12 V56" fill="none" stroke-width="2" opacity=".35"/>
      <path d="M32 58 H68 V66 H32 Z" fill="#f2c14e"/>
      <path d="M46 66 H54 V84 H46 Z" fill="#8a5a36"/>
      <circle cx="50" cy="89" r="6" fill="#f2c14e"/>`),
  },

  archer: {
    body: svg(`
      <path d="M20 62 C20 30 34 8 54 6 C50 14 80 30 80 62 L80 78 C80 88 70 91 50 91 C30 91 20 88 20 78 Z" fill="#4f9a5b"/>
      <path d="M32 58 C32 44 42 36 55 36 C68 36 76 44 76 58 C76 68 68 74 55 74 C42 74 32 68 32 58 Z" fill="#f2c9a0"/>
      ${eyes(52, 55, 15)}
      <path d="M53 65 Q59 69 65 65" fill="none" stroke-width="3"/>
      <path d="M20 74 C36 80 64 80 80 74" fill="none" stroke-width="3"/>
      <path d="M54 6 C60 2 66 4 68 10" fill="none" stroke-width="3"/>
      <path d="M12 48 L24 40 L24 66 L12 60 Z" fill="#9a6a3a"/>
      <path d="M14 44 L10 34 M19 41 L17 31" fill="none" stroke="#e2574c" stroke-width="3"/>`),
    weapon: svg(`
      <path d="M40 8 C74 24 74 80 40 96" fill="none" stroke="#1c1d22" stroke-width="10"/>
      <path d="M40 8 C74 24 74 80 40 96" fill="none" stroke="#b9793d" stroke-width="5"/>
      <path d="M40 8 V96" fill="none" stroke="#f4f1e6" stroke-width="2"/>`),
  },

  wizard: {
    body: svg(`
      <path d="M22 62 C22 48 34 40 51 40 C68 40 80 48 80 62 L80 78 C80 88 70 91 51 91 C32 91 22 88 22 78 Z" fill="#6d4bc4"/>
      <path d="M32 52 C32 44 42 40 53 40 C66 40 76 44 76 54 C76 60 70 62 54 62 C40 62 32 60 32 52 Z" fill="#f2c9a0"/>
      <path d="M34 58 C38 60 44 60 48 58 C52 62 60 62 64 58 C68 60 72 60 76 56 C78 74 68 88 56 88 C44 88 32 76 34 58 Z" fill="#f4f1e6"/>
      ${eyes(51, 51, 15, 3.6)}
      <path d="M10 42 C28 48 76 48 92 42 C86 36 78 34 72 34 C66 18 60 4 40 2 C46 8 40 22 30 34 C22 34 14 36 10 42 Z" fill="#6d4bc4"/>
      <path d="M30 34 C44 38 60 38 72 34" fill="none" stroke="#f2c14e" stroke-width="5"/>
      <path d="M52 14 L54.5 19 L60 19.5 L56 23 L57.5 28.5 L52 25.5 L46.5 28.5 L48 23 L44 19.5 L49.5 19 Z" fill="#f2c14e" stroke-width="2"/>`),
    weapon: svg(`
      <path d="M50 94 V26" fill="none" stroke="#1c1d22" stroke-width="9"/>
      <path d="M50 94 V26" fill="none" stroke="#8a5a36" stroke-width="4.5"/>
      <circle cx="50" cy="16" r="12" fill="#7fe0ff"/>
      <circle cx="46" cy="12" r="3.5" fill="#ffffff" stroke="none"/>`),
  },

  gorilla: {
    body: svg(`
      <path d="M8 62 C4 46 10 30 22 28 C30 12 44 8 56 8 C74 8 90 22 92 44 C96 52 96 66 90 74 C88 86 74 91 52 91 C28 91 12 86 8 62 Z" fill="#4a4d59"/>
      <path d="M8 62 C6 72 10 82 18 84 C26 82 28 72 24 62 Z" fill="#3a3c47"/>
      <path d="M40 44 C40 32 50 26 62 26 C76 26 86 32 86 46 C86 62 78 72 63 72 C50 72 40 60 40 44 Z" fill="#8d909c"/>
      <path d="M44 38 C52 32 60 36 64 38 C68 36 76 32 84 38" fill="none" stroke-width="5"/>
      ${eyes(56, 45, 16, 3.6)}
      <g stroke="none" fill="#1c1d22"><ellipse cx="61" cy="54" rx="2" ry="2.6"/><ellipse cx="68" cy="54" rx="2" ry="2.6"/></g>
      <path d="M54 62 Q64 67 75 62" fill="none" stroke-width="3"/>
      <path d="M22 28 C18 22 22 16 28 18" fill="none" stroke-width="3"/>`),
  },

  mouse: {
    body: svg(`
      <path d="M14 70 C2 70 0 54 8 50" fill="none" stroke="#e79aa6" stroke-width="5"/>
      <circle cx="30" cy="30" r="18" fill="#a9adb9"/><circle cx="30" cy="30" r="9" fill="#f4b6c0" stroke="none"/>
      <circle cx="68" cy="26" r="18" fill="#a9adb9"/><circle cx="68" cy="26" r="9" fill="#f4b6c0" stroke="none"/>
      <path d="M14 62 C14 44 30 34 50 34 C70 34 92 46 94 62 C94 80 76 90 52 90 C28 90 14 80 14 62 Z" fill="#a9adb9"/>
      <path d="M40 76 C46 84 66 84 74 78 C70 86 46 88 40 76 Z" fill="#f4f1e6" stroke="none"/>
      ${eyes(56, 56, 18, 4.5)}
      <circle cx="92" cy="62" r="5" fill="#f08a9b"/>
      <path d="M78 68 L96 74 M78 72 L92 82" fill="none" stroke-width="2"/>`),
  },

  sniper: {
    body: svg(`${person(SKIN, '#5f6f45')}
      <path d="M24 42 C24 22 36 14 52 14 C68 14 78 22 80 38 L96 40 C96 47 90 49 80 47 C60 51 40 49 24 45 Z" fill="#4c5a36"/>
      <circle cx="66" cy="57" r="4" fill="${INK}" stroke="none"/>
      <path d="M44 57 H54 M54 66 H66" fill="none" stroke-width="3"/>`),
    weapon: svg(`
      <path d="M46 96 L44 66 H56 L54 96 Z" fill="#8a5a36"/>
      <path d="M46 66 V8 H54 V66 Z" fill="#3a3c47"/>
      <path d="M56 28 H66 V52 H56 Z" fill="#2a2c36"/>
      <circle cx="61" cy="28" r="5" fill="#7fe0ff"/>`),
  },

  ninja: {
    body: svg(`
      <path d="M22 50 L4 42 L10 54 L2 62 L22 60 Z" fill="#e2574c"/>
      <path d="${TALL}" fill="#2a2c36"/>
      <path d="M34 46 H82 V62 H34 Q30 54 34 46 Z" fill="${SKIN}"/>
      ${eyes(52, 55, 16, 3.6)}
      <path d="M44 48 L58 51 M78 48 L64 51" fill="none" stroke-width="3.5"/>
      <path d="M20 44 C40 40 62 40 82 44" fill="none" stroke="#e2574c" stroke-width="4"/>`),
    weapon: svg(`
      <path d="M46 60 C44 36 48 16 58 4 C58 24 56 44 54 60 Z" fill="#e6e9f0"/>
      <path d="M40 60 H60 V66 H40 Z" fill="#f2c14e"/>
      <path d="M46 66 H54 V88 H46 Z" fill="#2a2c36"/>`),
  },

  viking: {
    body: svg(`${person(SKIN, '#8a5a36')}
      <path d="M26 30 C12 28 8 14 14 6 C18 16 24 20 32 22 Z" fill="#f4f1e6"/>
      <path d="M76 30 C90 28 94 14 88 6 C84 16 78 20 70 22 Z" fill="#f4f1e6"/>
      <path d="M24 44 C24 22 36 12 51 12 C66 12 80 22 80 44 Z" fill="#c9ced8"/>
      <path d="M24 44 H80 M52 12 V44" fill="none" stroke-width="3"/>
      ${eyes(50, 52, 16, 3.6)}
      <path d="M32 58 C38 62 48 61 54 58 C60 61 70 62 80 58 C82 76 70 89 56 89 C42 89 30 76 32 58 Z" fill="#e08a3c"/>
      <path d="M48 72 V84 M62 72 V84" fill="none" stroke-width="2.5"/>`),
    weapon: svg(`
      ${line('M50 94 V16', '#8a5a36', 5)}
      <path d="M50 12 C70 4 84 18 82 38 C72 30 60 30 50 36 Z" fill="#c9ced8"/>
      <path d="M50 12 C34 8 26 18 28 30 C36 26 44 28 50 32 Z" fill="#c9ced8"/>`),
  },

  medic: {
    body: svg(`${person(SKIN, '#f4f1e6')}
      <path d="M24 48 C22 26 36 14 52 14 C68 14 82 26 80 48 C72 38 62 34 52 36 C42 36 32 40 24 48 Z" fill="#6b4a2e"/>
      <path d="M36 20 C40 8 64 8 68 20 C58 16 46 16 36 20 Z" fill="#f4f1e6"/>
      <path d="M52 10 V17 M48.5 13.5 H55.5" fill="none" stroke="#e2574c" stroke-width="3"/>
      ${eyes(50, 54, 16)}
      ${smile(52, 63, 14)}
      <path d="M51 76 V88 M45 82 H57" fill="none" stroke="#e2574c" stroke-width="5"/>`),
    weapon: svg(`
      <path d="M50 26 V4" fill="none" stroke-width="3"/>
      <path d="M42 26 H58 V66 H42 Z" fill="#dff4ff"/>
      <path d="M42 46 H58 V66 H42 Z" fill="#6fd08c" stroke="none"/>
      <path d="M42 26 H58 V66 H42 Z" fill="none"/>
      <path d="M36 66 H64 M50 66 V86 M40 88 H60" fill="none" stroke-width="5"/>`),
  },

  bomber: {
    body: svg(`
      <circle cx="20" cy="42" r="15" fill="#e2574c"/><circle cx="82" cy="42" r="15" fill="#e2574c"/>
      <path d="${BODY}" fill="#ffffff"/><path d="${CLOTH}" fill="#f2c14e"/>
      <g stroke="none" fill="#3b6cf6"><circle cx="34" cy="82" r="3.5"/><circle cx="52" cy="85" r="3.5"/><circle cx="70" cy="82" r="3.5"/></g>
      <path d="M38 34 L52 6 L66 34 Z" fill="#3b6cf6"/><circle cx="52" cy="6" r="5" fill="#f2c14e"/>
      ${eyes(48, 50, 18, 3.6)}
      <path d="M44 62 Q58 76 74 62 Q58 68 44 62 Z" fill="#e2574c"/>
      <circle cx="62" cy="57" r="7" fill="#e2574c"/>`),
    weapon: svg(`
      <path d="M58 28 C60 16 70 14 76 8" fill="none" stroke-width="4"/>
      <path d="M76 8 L80 0 L82 8 L90 8 L84 13 L86 21 L79 16 L72 20 L74 12 Z" fill="#ffd34d" stroke-width="2.5"/>
      <path d="M44 22 H62 V32 H44 Z" fill="#3a3c47"/>
      <circle cx="52" cy="56" r="27" fill="#2a2c36"/>
      <path d="M36 50 C38 40 46 36 52 36" fill="none" stroke="#ffffff" stroke-width="4" opacity=".6"/>`),
  },

  dog: {
    body: svg(`
      ${line('M18 70 C6 66 2 54 8 46', '#e8b878', 6)}
      <path d="M16 60 C16 40 32 30 52 30 C74 30 90 42 90 60 C90 80 74 90 52 90 C30 90 16 80 16 60 Z" fill="#e8b878"/>
      <path d="M24 36 C10 34 6 56 14 66 C24 60 30 48 32 38 Z" fill="#8a5a36"/>
      <path d="M68 32 C82 26 96 42 94 58 C84 54 76 46 72 38 Z" fill="#8a5a36"/>
      <circle cx="72" cy="50" r="10" fill="#8a5a36" stroke="none"/>
      <ellipse cx="64" cy="68" rx="19" ry="13" fill="#fff6e6" stroke="none"/>
      ${eyes(52, 52, 20, 4)}
      <ellipse cx="68" cy="62" rx="6" ry="4.5" fill="${INK}" stroke="none"/>
      <path d="M68 66 V71 M58 72 Q63 77 68 71 Q73 77 78 72" fill="none" stroke-width="2.5"/>
      <path d="M64 75 Q68 88 72 75 Z" fill="#f08a9b" stroke-width="2.5"/>`),
  },

  bee: {
    body: svg(`
      <ellipse cx="38" cy="28" rx="17" ry="12" transform="rotate(-20 38 28)" fill="#d6ecff"/>
      <ellipse cx="60" cy="24" rx="17" ry="12" transform="rotate(15 60 24)" fill="#d6ecff"/>
      <path d="M22 54 L6 58 L22 66 Z" fill="${INK}"/>
      <ellipse cx="54" cy="58" rx="34" ry="25" fill="#ffc928"/>
      <path d="M40 36 C35 48 35 68 40 80 M56 34 C51 48 51 68 56 82" fill="none" stroke-width="8"/>
      <circle cx="74" cy="54" r="4.5" fill="${INK}" stroke="none"/>
      ${smile(70, 64, 12)}
      <path d="M76 36 C80 26 86 24 90 26" fill="none" stroke-width="3"/>`),
  },

  chadbee: {
    body: svg(`
      <ellipse cx="26" cy="18" rx="17" ry="10" transform="rotate(-30 26 18)" fill="#d6ecff"/>
      <ellipse cx="74" cy="18" rx="17" ry="10" transform="rotate(30 74 18)" fill="#d6ecff"/>
      <path d="M40 20 C38 8 30 4 26 6 M60 20 C62 8 70 4 74 6" fill="none" stroke-width="3"/>
      <path d="M18 30 Q50 10 82 30 L86 70 Q84 90 50 92 Q16 90 14 70 Z" fill="#ffc928"/>
      <path d="M15 74 H85 M24 86 H76" fill="none" stroke-width="7"/>
      <path d="M12 40 H88 L84 54 Q70 61 57 50 H45 Q32 61 18 54 Z" fill="${INK}"/>
      <path d="M24 44 L30 49 M62 44 L68 49" fill="none" stroke="#ffffff" stroke-width="3"/>
      <path d="M48 65 Q60 70 72 61" fill="none" stroke-width="3.5"/>`),
    weapon: svg(`
      <path d="M44 94 C34 74 38 54 50 46 C44 38 48 24 60 24 C70 24 74 34 68 42 C80 50 80 72 64 78 C62 86 58 92 54 94 Z" fill="#ffc928"/>
      <path d="M52 58 C58 54 66 56 68 62" fill="none" stroke-width="3"/>
      <path d="M52 30 H66 M52 36 H68" fill="none" stroke-width="2.5"/>`),
  },

  snake: {
    body: svg(`
      <path d="M12 76 C12 62 88 62 88 76 C88 91 12 91 12 76 Z" fill="#6fbf4a"/>
      <path d="M22 64 C22 52 78 52 78 64 C78 74 22 74 22 64 Z" fill="#7fcf58"/>
      <path d="M46 60 C40 38 50 20 68 18 C84 16 94 26 90 36 C86 46 74 44 68 40 C64 46 66 54 68 62 Z" fill="#6fbf4a"/>
      <path d="M52 58 C48 44 52 32 60 26" fill="none" stroke="#d9f2a0" stroke-width="4"/>
      <circle cx="76" cy="27" r="4" fill="${INK}" stroke="none"/>
      <path d="M90 34 L99 31 M90 34 L99 38" fill="none" stroke="#e2574c" stroke-width="3"/>
      <path d="M26 78 H34 M46 82 H54 M66 78 H74" fill="none" stroke-width="2.5" opacity=".5"/>`),
  },

  conway: {
    body: svg(`
      <path d="M40 90 L40 96 M56 90 L56 96" stroke="#e8912d" stroke-width="5"/>
      <path d="M16 46 C4 40 6 28 14 26 C12 36 20 40 26 44 Z" fill="#f4f1ea"/>
      <path d="M14 60 C14 40 30 36 46 40 C52 22 62 14 74 16 C86 18 90 30 86 42 C90 62 80 90 50 90 C28 90 14 80 14 60 Z" fill="#f4f1ea"/>
      <path d="M30 60 C36 52 52 52 58 62 C54 74 36 74 30 60 Z" fill="#dcd6ca"/>
      <path d="M62 16 C60 6 68 4 70 12 C72 4 80 4 80 12 C86 8 90 14 84 20 Z" fill="#e23b3b"/>
      <path d="M88 30 L99 34 L88 40 Z" fill="#ffb52e"/>
      <path d="M84 42 C88 48 86 54 80 52 Z" fill="#e23b3b"/>
      <circle cx="76" cy="29" r="4" fill="${INK}" stroke="none"/>`),
  },

  fibrabbit: {
    body: svg(`
      <path d="M52 40 C44 22 46 6 54 6 C62 6 62 24 60 40 Z" fill="#d9c2a3"/>
      <path d="M66 40 C64 22 70 8 78 10 C84 12 80 28 74 42 Z" fill="#d9c2a3"/>
      <circle cx="16" cy="70" r="9" fill="#ffffff"/>
      <path d="M16 68 C16 50 34 42 54 42 C60 36 74 36 82 42 C92 50 94 62 86 70 C84 82 70 90 50 90 C28 90 16 82 16 68 Z" fill="#d9c2a3"/>
      <path d="M34 72 C40 62 54 62 58 74" fill="none" stroke-width="3"/>
      <circle cx="78" cy="54" r="4" fill="${INK}" stroke="none"/>
      <circle cx="92" cy="60" r="3.5" fill="#e98a9a" stroke="none"/>`),
  },

  boid: {
    body: svg(`
      <path d="M22 56 L4 48 L8 64 Z" fill="#2d3a4a"/>
      <path d="M18 58 C20 40 40 34 58 36 C74 32 88 40 88 52 C88 68 70 78 48 76 C32 76 20 70 18 58 Z" fill="#2d3a4a"/>
      <path d="M36 50 C30 30 40 12 56 10 C58 26 60 40 62 52 Z" fill="#40566e"/>
      <path d="M86 46 L99 50 L86 56 Z" fill="#ffc928"/>
      <circle cx="76" cy="46" r="4" fill="#ffffff" stroke="none"/><circle cx="77" cy="46" r="2" fill="${INK}" stroke="none"/>
      <g stroke="none" fill="#8fd3c8"><circle cx="34" cy="62" r="2.5"/><circle cx="46" cy="66" r="2.5"/><circle cx="58" cy="62" r="2.5"/></g>`),
  },

  zeno: {
    body: svg(`
      <path d="M10 70 L2 76 L12 78 Z" fill="#9bc77a"/>
      <path d="M70 62 C74 48 88 44 95 52 C100 60 96 70 86 72 L72 74 Z" fill="#9bc77a"/>
      <path d="M8 74 C8 44 26 26 46 26 C66 26 82 44 82 74 C82 84 70 88 45 88 C20 88 8 84 8 74 Z" fill="#3f7d4e"/>
      <path d="M45 27 L45 87 M45 57 L81 57 M63 57 L63 86 M63 72 L81 72" fill="none" stroke-width="3" stroke="#cfe6b8"/>
      <path d="M8 74 C8 44 26 26 46 26 C66 26 82 44 82 74 C82 84 70 88 45 88 C20 88 8 84 8 74 Z" fill="none"/>
      <circle cx="88" cy="56" r="3.5" fill="${INK}" stroke="none"/>
      <path d="M88 66 Q92 68 95 65" fill="none" stroke-width="2.5"/>`),
  },

  catbox: {
    body: svg(`
      <path d="M14 40 L50 28 L86 40 L86 82 L50 94 L14 82 Z" fill="#c9a26b"/>
      <path d="M50 52 L50 94 M14 40 L50 52 L86 40" fill="none"/>
      <path d="M14 40 L50 52 L50 94 L14 82 Z" fill="#b48a52"/>
      <path d="M14 40 L4 28 L40 16 L50 28 Z M86 40 L96 28 L60 16 L50 28 Z" fill="#dcb987"/>
      <path d="M30 24 L70 36" stroke="#e8dcc0" stroke-width="7" stroke-linecap="butt"/>
      <path d="M62 62 C62 56 72 54 72 60 C72 64 67 64 67 69 M67 76 L67 77" fill="none" stroke-width="3.5"/>
      <g stroke="none" fill="${INK}"><circle cx="24" cy="66" r="2"/><circle cx="34" cy="70" r="2"/><circle cx="29" cy="76" r="2"/></g>`),
  },

  cat: {
    body: svg(`
      <path d="M22 76 C6 74 4 56 14 50 C12 60 16 68 26 68 Z" fill="#6b6f78"/>
      <path d="M22 70 C22 52 36 44 52 46 L74 46 C88 48 92 60 90 72 C88 86 74 91 54 91 C34 91 22 86 22 70 Z" fill="#6b6f78"/>
      <path d="M58 46 L60 24 L72 38 Z M84 46 L90 24 L78 38 Z" fill="#6b6f78"/>
      <path d="M62 40 L64 31 L68 38 Z" fill="#f4b6c0" stroke="none"/>
      <path d="M34 60 L40 66 M34 72 L42 76" fill="none" stroke-width="3" stroke="#4b4f58"/>
      <path d="M68 56 L76 56 M82 56 L88 56" stroke="#9be36c" stroke-width="6"/>
      <circle cx="72" cy="56" r="2" fill="${INK}" stroke="none"/><circle cx="85" cy="56" r="2" fill="${INK}" stroke="none"/>
      <path d="M76 66 L80 69 L84 66 M80 69 L80 72" fill="none" stroke-width="2.5"/>
      <path d="M90 66 L99 63 M90 70 L99 71" fill="none" stroke-width="2"/>`),
  },

  matt: {
    body: svg(`
      <path d="M22 34 C10 44 8 70 16 86 C20 78 24 72 28 60 Z M78 34 C92 44 92 72 86 86 C80 78 78 70 74 60 Z" fill="${'#6a4a33'}"/>
      ${person(SKIN, '#22242c')}
      <path d="M44 72 L51 80 L58 72 L55 91 L47 91 Z" fill="#ffffff"/>
      <path d="M49 74 L53 74 L54 90 L51 93 L48 90 Z" fill="#1c1d22" stroke-width="2"/>
      <path d="M22 70 C30 73 40 74 44 72 L47 91 C34 91 22 88 22 78 Z M80 70 C72 73 62 74 58 72 L55 91 C70 91 80 88 80 78 Z" fill="#22242c"/>
      <circle cx="68" cy="80" r="3.5" fill="#f4efe2" stroke-width="2"/><path d="M68 76 L70 71 M66 77 L63 73" stroke="#7fa08a" stroke-width="2" fill="none"/>
      <path d="M22 56 C16 30 34 18 52 18 C70 18 86 30 80 56 C78 44 70 36 60 38 C50 30 34 34 28 46 C26 50 24 54 22 56 Z" fill="#6a4a33"/>
      <path d="M40 47 L50 46 M58 44 L68 46" fill="none" stroke-width="3"/>
      ${eyes(45, 52, 18, 3.5)}
      <path d="M46 63 Q54 68 62 61" fill="none" stroke-width="3"/>
      <g stroke="none" fill="#6a4a33" opacity=".45"><circle cx="42" cy="66" r="1.4"/><circle cx="50" cy="69" r="1.4"/><circle cx="58" cy="68" r="1.4"/><circle cx="64" cy="64" r="1.4"/></g>`),
    weapon: svg(`
      <path d="M40 22 L60 22 L57 44 C56 50 44 50 43 44 Z" fill="#eaf4fb" fill-opacity=".85" stroke-width="3"/>
      <path d="M50 49 L50 64 M42 66 L58 66" fill="none" stroke-width="3.5"/>
      <path d="M43 36 L57 36" stroke="#bfe0f2" stroke-width="3"/>`),
  },

  justin: {
    body: svg(`
      <path d="M26 66 C22 60 24 52 30 50 L72 50 C78 52 80 60 76 66 Z" fill="#17181d"/>
      ${person(SKIN, '#22242c')}
      <path d="M36 72 C42 78 60 78 66 72" fill="none" stroke-width="3"/>
      <path d="M46 75 V87 M56 75 V85" fill="none" stroke="#c9ced8" stroke-width="2.5"/>
      <path d="M21 58 C10 28 30 10 50 12 C72 8 92 28 81 58 C80 50 77 44 72 42 C70 34 62 30 56 32 C54 40 48 44 42 40 C40 46 34 48 30 46 C26 50 23 54 21 58 Z" fill="#23242b"/>
      <path d="M56 32 C52 24 54 18 58 14 M30 46 C26 40 28 32 34 26 M72 42 C76 36 76 30 72 24" fill="none" stroke="#4a4c58" stroke-width="2.5"/>
      <path d="M40 50 H49 M59 50 H68" fill="none" stroke-width="3"/>
      ${eyes(45, 55, 18, 3)}
      <path d="M46 64 Q53 62 60 64" fill="none" stroke-width="2.5"/>
      <path d="M49 69 H58" fill="none" stroke-width="2.5"/>
      <path d="M58 69 L74 71" fill="none" stroke-width="7"/><path d="M58 69 L72 70.7" fill="none" stroke="#f4f1e8" stroke-width="3.5"/><path d="M72 70.7 L75 71.1" fill="none" stroke="#ff8a2a" stroke-width="3.5"/>`),
  },

  // Justin after the upgrade: still Justin, but half his face is a steel plate with a red optic, an antenna, wiring.
  justinx: {
    body: svg(`
      <path d="M26 66 C22 60 24 52 30 50 L72 50 C78 52 80 60 76 66 Z" fill="#17181d"/>
      ${person(SKIN, '#22242c')}
      <path d="M50 39 L50 75 C40 76 31 72 27 64 L27 52 C29 45 37 40 50 39 Z" fill="#9aa3b0"/>
      <path d="M50 46 H38 M50 66 H34" fill="none" stroke="#6b7380" stroke-width="2"/>
      <g fill="#6b7380" stroke="none"><circle cx="31" cy="56" r="1.6"/><circle cx="34" cy="69" r="1.6"/><circle cx="46" cy="70" r="1.6"/></g>
      <path d="M30 66 C24 70 26 78 32 80" fill="none" stroke="#4aa3df" stroke-width="2"/><path d="M36 72 C34 78 38 82 42 82" fill="none" stroke="#ffd43b" stroke-width="2"/>
      <path d="M36 72 C42 78 60 78 66 72" fill="none" stroke-width="3"/>
      <path d="M46 75 V87 M56 75 V85" fill="none" stroke="#c9ced8" stroke-width="2.5"/>
      <path d="M21 58 C10 28 30 10 50 12 C72 8 92 28 81 58 C80 50 77 44 72 42 C70 34 62 30 56 32 C54 40 48 44 42 40 C40 46 34 48 30 46 C26 50 23 54 21 58 Z" fill="#23242b"/>
      <path d="M56 32 C52 24 54 18 58 14 M30 46 C26 40 28 32 34 26 M72 42 C76 36 76 30 72 24" fill="none" stroke="#4a4c58" stroke-width="2.5"/>
      <path d="M61 14 L66 6" fill="none" stroke-width="3"/><circle cx="66.5" cy="5" r="3" fill="#ff3b3b" stroke-width="2"/>
      <path d="M59 50 H68" fill="none" stroke-width="3"/>
      <rect x="38" y="50" width="13" height="10" rx="3" fill="#1c1d22" stroke="none"/>
      <circle cx="45" cy="55" r="3.6" fill="#ff3b3b" stroke="none"/><circle cx="45" cy="55" r="1.4" fill="#ffd0d0" stroke="none"/>
      <circle cx="63" cy="55" r="3" fill="#1c1d22" stroke="none"/>
      <path d="M46 64 Q53 62 60 64" fill="none" stroke-width="2.5"/>
      <path d="M49 69 H58" fill="none" stroke-width="2.5"/>
      <path d="M58 69 L74 71" fill="none" stroke-width="7"/><path d="M58 69 L72 70.7" fill="none" stroke="#f4f1e8" stroke-width="3.5"/><path d="M72 70.7 L75 71.1" fill="none" stroke="#ff8a2a" stroke-width="3.5"/>`),
  },

  // Christian: broad shoulders, brown hair swept up and back with short sides, a huge grin. Carries a clay teapot.
  christian: {
    body: svg(`
      <path d="M15 80 C11 70 15 63 25 62 L77 62 C87 63 91 70 87 80 Z" fill="#20232e"/>
      ${person(SKIN, '#20232e')}
      ${dome(18)}
      <path d="M23 54 C21 46 23 39 28 35 L32 41 C29 44 27 49 26 54 Z M79 54 C81 46 79 39 75 35 L71 41 C74 44 76 49 77 54 Z" fill="#7a5232" stroke="none"/>
      <path d="M28 39 C25 22 38 9 54 9 C67 7 81 11 85 21 C87 28 83 34 77 34 C71 28 63 27 57 30 C48 26 37 30 28 39 Z" fill="#8a5a36"/>
      <path d="M40 22 C50 14 66 13 79 19 M35 31 C45 22 60 20 73 25" fill="none" stroke="#6e4a2c" stroke-width="2.5"/>
      <path d="M38 46 Q43 43 48 46 M58 46 Q63 43 68 46" fill="none" stroke-width="2.6"/>
      <path d="M39 54 Q43.5 50 48 54 M58 54 Q62.5 50 67 54" fill="none" stroke-width="3"/>
      <path d="M41 63 C45 74 61 74 65 63 Z" fill="#ffffff" stroke-width="3"/>
      <path d="M42 63 H64" fill="none" stroke-width="2"/>`),
    weapon: svg(`
      <path d="M30 46 C30 34 40 30 50 30 C60 30 70 34 70 46 C70 58 62 64 50 64 C38 64 30 58 30 46 Z" fill="#9c4a2e"/>
      <path d="M70 42 C80 40 84 34 86 28" fill="none" stroke-width="5"/>
      <path d="M30 40 C20 38 18 50 30 54" fill="none" stroke-width="4"/>
      <path d="M40 30 C42 24 58 24 60 30 Z" fill="#7d3a23"/><circle cx="50" cy="23" r="3.5" fill="#7d3a23"/>
      <path d="M38 44 C40 38 44 36 48 36" fill="none" stroke="#c8734e" stroke-width="3"/>`),
  },

  zach: {
    body: svg(`
      ${person(SKIN, '#22242c')}
      <path d="M41 73 C46 77 56 77 61 73 L59 91 L43 91 Z" fill="#f4f1e8"/>
      <path d="M22 70 C30 73 37 74 41 72 L45 91 C33 91 22 88 22 78 Z M80 70 C72 73 65 74 61 72 L57 91 C70 91 80 88 80 78 Z" fill="#22242c"/>
      ${dome(20)}
      <path d="M22 62 C14 30 32 14 51 14 C70 14 88 30 80 62 C80 50 76 40 68 34 C62 30 56 28 52 22 C48 28 42 30 36 34 C28 40 24 50 22 62 Z" fill="#7a5a3c"/>
      <path d="M52 22 C50 18 50 16 51 14 M30 44 C28 36 32 26 40 20 M72 44 C74 36 70 26 62 20" fill="none" stroke="#5c4229" stroke-width="2.5"/>
      <g fill="rgba(255,255,255,.45)" stroke-width="3"><circle cx="43" cy="54" r="8.5"/><circle cx="64" cy="54" r="8.5"/></g>
      <path d="M51.5 53 H55.5 M34.5 53 L24 50" fill="none" stroke-width="3"/>
      ${eyes(44, 54, 20, 2.8)}
      <path d="M47 67 H60" fill="none" stroke-width="3"/>
      <g stroke="none" fill="#7a5a3c" opacity=".45"><circle cx="42" cy="68" r="1.3"/><circle cx="48" cy="71" r="1.3"/><circle cx="56" cy="71" r="1.3"/><circle cx="63" cy="68" r="1.3"/></g>`),
    weapon: svg(`
      <path d="M46 46 L50 14 L54 46 Z" fill="#c9ced8"/>
      <ellipse cx="50" cy="58" rx="11" ry="14" fill="#5fb7a6"/>
      <path d="M43 54 C44 48 48 46 52 46" fill="none" stroke="#ffffff" stroke-width="3" opacity=".6"/>
      <path d="M44 8 L50 12 M56 8 L50 12 M50 4 V11" fill="none" stroke="#9fd6f2" stroke-width="2.5"/>`),
  },

  ryan: {
    body: svg(`
      ${person(SKIN, '#2f6f9f')}
      ${dome(20)}
      <path d="M42 74 C46 81 56 81 60 74 Z" fill="${SKIN}" stroke-width="3"/>
      <path d="M23 80 L31 83 M79 80 L71 83" fill="none" stroke-width="2.5"/>
      <path d="M21 54 C16 28 33 12 52 12 C71 12 86 28 81 52 C80 44 76 37 69 34 C62 31 54 31 47 35 C41 39 35 42 28 42 C24 45 22 50 21 54 Z" fill="#2b2622"/>
      <path d="M52 19 C44 23 38 29 34 37 M64 19 C58 22 52 26 49 31" fill="none" stroke="#4a433d" stroke-width="2.5"/>
      <path d="M41 47.5 Q45 45.5 49 47.5 M59 47.5 Q63 45.5 67 47.5" fill="none" stroke-width="2.4"/>
      ${eyes(45, 54, 18, 3.4)}
      <path d="M42 61 Q54 75 66 61 Z" fill="#ffffff" stroke-width="2.6"/>
      <g stroke="none" fill="#2b2622" opacity=".4"><circle cx="36" cy="64" r="1.3"/><circle cx="40" cy="69" r="1.3"/><circle cx="47" cy="72" r="1.3"/><circle cx="61" cy="72" r="1.3"/><circle cx="68" cy="68" r="1.3"/><circle cx="71" cy="63" r="1.3"/></g>`),
    weapon: svg(`
      <path d="M34 62 L36 40 C37 34 41 32 50 32 C59 32 63 34 64 40 L66 62 Z" fill="#2a2c33"/>
      <path d="M40 32 C40 26 60 26 60 32 Z" fill="#2a2c33"/><circle cx="50" cy="25" r="3" fill="#c8a46a"/>
      <path d="M64 40 C70 44 74 48 72 56 L66 58" fill="none" stroke-width="4"/>
      <path d="M36 56 C26 54 22 44 20 30 C19 22 22 16 27 14" fill="none" stroke-width="7"/>
      <path d="M36 56 C26 54 22 44 20 30 C19 22 22 16 27 14" fill="none" stroke="#2a2c33" stroke-width="3"/>
      <path d="M28 14 C30 13 31 14 30 16" fill="none" stroke="#6b4226" stroke-width="2.5"/>
      <path d="M38 50 H62" fill="none" stroke="#c8a46a" stroke-width="2.5"/>
      <path d="M40 38 C41 36 43 35 45 35" fill="none" stroke="#5a5d68" stroke-width="2.5"/>`),
  },

  sierra: {
    body: svg(`
      ${person(SKIN, '#fbf6ee')}
      <path d="M38 73 C44 83 60 83 66 73 Z" fill="${SKIN}" stroke-width="3"/>
      <g stroke="none"><circle cx="36" cy="84" r="2.4" fill="#d9606a"/><circle cx="41" cy="88" r="1.6" fill="#6fa377"/><circle cx="68" cy="84" r="2.4" fill="#d9606a"/><circle cx="63" cy="88" r="1.6" fill="#6fa377"/><circle cx="75" cy="77" r="2.2" fill="#d9606a"/><circle cx="52" cy="87" r="2.2" fill="#d9606a"/><circle cx="73" cy="85" r="1.6" fill="#6fa377"/></g>
      ${SIERRA_BRAID}
      ${SIERRA_HEAD}`),
    weapon: svg(`
      <path d="M35 44 C33 26 67 26 65 44 C66 50 34 50 35 44 Z" fill="#9a6338"/>
      <path d="M38 48 L62 48 L58 68 L42 68 Z" fill="#e7c489"/>
      <path d="M45 49 L46 67 M50 49 V67 M55 49 L54 67" fill="none" stroke-width="2"/>
      <g stroke="none" fill="#3d4a8a"><circle cx="43" cy="38" r="2.6"/><circle cx="52" cy="33" r="2.6"/><circle cx="58" cy="40" r="2.6"/></g>`),
  },

  sierradoc: {
    body: svg(`
      ${person(SKIN, '#f4f6f8')}
      <path d="M42 71 L51 86 L60 71 C56 75 46 75 42 71 Z" fill="#3aa7a0"/>
      <path d="M51 86 V91" fill="none" stroke-width="2.5"/>
      <path d="M64 72 C69 80 67 84 63 85" fill="none" stroke="#2a2c36" stroke-width="3"/>
      <circle cx="62" cy="86" r="3.6" fill="#c9ced8" stroke-width="2"/>
      ${SIERRA_BRAID}
      ${SIERRA_HEAD}`),
  },

  brandon: {
    body: svg(`
      <path d="M24 68 C20 60 24 52 32 50 L70 50 C78 52 82 60 78 68 Z" fill="#17181d"/>
      <path d="M22 68 C22 58 28 55 29 46 C30 30 40 22 52 22 C64 22 73 30 74 46 C75 55 80 58 80 68 L80 78 C80 88 70 91 51 91 C32 91 22 88 22 78 Z" fill="${SKIN}"/>
      <path d="${CLOTH}" fill="#22242c"/>
      <path d="M51 77 V91" fill="none" stroke="#3b3e4a" stroke-width="2.5"/>
      <path d="M28 50 C24 34 31 22 40 18 C42 13 47 13 50 16 C53 11 59 12 61 16 C67 14 71 18 71 22 C78 27 79 38 75 50 C74 43 71 39 66 37 C60 34 52 35 47 37 C42 35 36 39 33 43 C30 45 29 48 28 50 Z" fill="#9a7350"/>
      <path d="M42 22 C40 26 39 30 39 34 M53 18 C51 23 51 28 52 32 M63 21 C63 26 64 30 66 33" fill="none" stroke="#7a5a3c" stroke-width="2.4"/>
      <path d="M41 47.5 Q45 45.5 49 47.5 M59 47.5 Q63 45.5 67 47.5" fill="none" stroke-width="2.4"/>
      ${eyes(45, 53, 18, 3.2)}
      <path d="M43 60 Q54 72 65 60 Z" fill="#ffffff" stroke-width="2.6"/>
      <g stroke="none" fill="#7a5a3c" opacity=".5"><circle cx="35" cy="61" r="1.3"/><circle cx="37" cy="66" r="1.3"/><circle cx="42" cy="69.5" r="1.3"/><circle cx="48" cy="71.5" r="1.3"/><circle cx="60" cy="71.5" r="1.3"/><circle cx="66" cy="69.5" r="1.3"/><circle cx="70" cy="66" r="1.3"/><circle cx="72" cy="61" r="1.3"/><circle cx="47" cy="58" r="1.2"/><circle cx="61" cy="58" r="1.2"/></g>`),
  },

  tessa: {
    body: svg(`
      ${person(SKIN, '#2b3f63')}
      <path d="M41 73.5 C46 81 56 81 61 73.5 Z" fill="${SKIN}" stroke-width="3"/>
      <path d="M33 80 C40 84 46 85 51 85 M69 80 C62 84 56 85 51 85" fill="none" stroke="#3d5480" stroke-width="2"/>
      ${dome(21)}
      <path d="M14 91 C6 60 18 12 51 12 C84 12 96 60 88 91 L71 91 C76 78 77 66 75 56 C75 46 73 38 67 33 C62 30 56 28 51 27 C46 28 40 30 35 33 C29 38 27 46 27 56 C25 66 26 78 31 91 Z" fill="#f0d489"/>
      <path d="M51 13 V27 M21 60 C18 70 19 82 22 89 M81 60 C84 70 83 82 80 89 M38 18 C31 24 26 32 24 44 M64 18 C71 24 76 32 78 44" fill="none" stroke="#d4b25f" stroke-width="2.2"/>
      <g stroke="none" fill="#f08f8a" opacity=".45"><circle cx="35" cy="63" r="4.5"/><circle cx="73" cy="63" r="4.5"/></g>
      <g fill="rgba(255,255,255,.3)" stroke="#dba29a" stroke-width="2"><rect x="36" y="46.5" width="17" height="14" rx="5.5"/><rect x="56" y="46.5" width="17" height="14" rx="5.5"/></g>
      <path d="M53 52 H56" fill="none" stroke="#dba29a" stroke-width="2"/>
      ${eyes(45, 54, 19, 3.2)}
      <path d="M44 64.5 Q54.5 76 65 64.5 Z" fill="#ffffff" stroke-width="2.6"/>`),
    weapon: svg(`
      <circle cx="50" cy="58" r="11" fill="none" stroke-width="9"/>
      <circle cx="50" cy="58" r="11" fill="none" stroke="#f2c14e" stroke-width="4.5"/>
      <path d="M41 40 L45 32 H55 L59 40 L50 50 Z" fill="#c9f1f7" stroke-width="3"/>
      <path d="M41 40 H59 M47 32 L50 40 L53 32" fill="none" stroke-width="1.6"/>`),
  },

  nemo: {
    body: svg(`
      <path d="${fluff(11, 60, 9, 9, 7)}" fill="#a85a30"/>
      <path d="${fluff(52, 61, 36, 29, 17)}" fill="#b96a3c"/>
      <path d="M32 84 C44 90 62 90 76 84" fill="none" stroke-width="7"/><path d="M32 84 C44 90 62 90 76 84" fill="none" stroke="#2a3a33" stroke-width="3.5"/>
      <path d="M50 87 L41 82 L41 92 Z M50 87 L59 82 L59 92 Z" fill="#2f4a3a" stroke-width="2.5"/><circle cx="50" cy="87" r="2.2" fill="#e08a3c" stroke-width="1.5"/>
      <path d="${fluff(21, 52, 11, 19, 10)}" fill="#96502b"/>
      <path d="${fluff(86, 50, 10, 18, 10)}" fill="#96502b"/>
      <path d="${fluff(55, 31, 17, 9, 9)}" fill="#c47744"/>
      <ellipse cx="65" cy="66" rx="16" ry="11.5" fill="#cf8a57" stroke="none"/>
      <path d="M33 64 q3 -4 6 0 M38 76 q3 -4 6 0 M29 74 q3 -4 6 0 M42 42 q3 -4 6 0 M76 74 q3 -4 6 0" fill="none" stroke="#96502b" stroke-width="2"/>
      ${eyes(53, 53, 20, 3.6)}
      <ellipse cx="67" cy="61.5" rx="5.5" ry="4.2" fill="${INK}" stroke="none"/>
      <path d="M67 65 V69 M59 70 Q63 74 67 69 Q71 74 75 70" fill="none" stroke-width="2.5"/>
      <path d="M64 72.5 Q67 82 70 72.5 Z" fill="#f08a9b" stroke-width="2.5"/>`),
  },

  nemorex: {
    body: svg(`
      <path d="${fluff(19, 70, 15, 9, 9)}" fill="#a85a30" transform="rotate(-18 19 70)"/>
      <path d="${fluff(46, 66, 24, 23, 14)}" fill="#b96a3c"/>
      <path d="M32 84 C42 89 56 89 66 84" fill="none" stroke-width="7"/><path d="M32 84 C42 89 56 89 66 84" fill="none" stroke="#2a3a33" stroke-width="3.5"/>
      <path d="M49 86 L41 81 L41 91 Z M49 86 L57 81 L57 91 Z" fill="#2f4a3a" stroke-width="2.5"/><circle cx="49" cy="86" r="2.2" fill="#e08a3c" stroke-width="1.5"/>
      <path d="M63 66 q6 2 8 7 M60 72 q5 2 6 6" fill="none" stroke-width="3.5"/><path d="M63 66 q6 2 8 7 M60 72 q5 2 6 6" fill="none" stroke="#c47744" stroke-width="2"/>
      <path d="${fluff(66, 34, 24, 17, 13)}" fill="#c47744"/>
      <path d="${fluff(48, 21, 9, 6, 6)}" fill="#a85a30"/>
      <path d="M58 41 C66 48 82 48 92 40 L92 43 C82 54 64 54 56 46 Z" fill="#f4f1e8" stroke-width="2.5"/>
      <path d="M62 43 l2.5 5 2.5 -5 M69 45 l2.5 5 2.5 -5 M76 45 l2.5 5 2.5 -5 M83 43 l2.5 4.5 2.5 -4.5" fill="#ffffff" stroke-width="1.6"/>
      <ellipse cx="88" cy="31" rx="4.5" ry="3.4" fill="${INK}" stroke="none"/>
      ${eyes(64, 27, 12, 3.4)}
      <path d="M58 21 L64 24 M76 24 L80 20" fill="none" stroke-width="2.6"/>
      <path d="M36 60 q3 -4 6 0 M30 72 q3 -4 6 0 M44 74 q3 -4 6 0 M52 58 q3 -4 6 0 M70 30 q3 -4 6 0" fill="none" stroke="#96502b" stroke-width="2"/>`),
  },

  grungus: {
    body: svg(`
      <path d="M16 30 C0 44 0 76 10 92 C16 84 22 74 26 58 Z M84 30 C100 44 100 76 90 92 C84 84 78 74 74 58 Z" fill="#4a3424"/>
      <path d="M16 60 C16 34 32 22 51 22 C70 22 86 34 86 60 L86 78 C86 89 74 92 51 92 C28 92 16 89 16 78 Z" fill="#8fa37a"/>
      <path d="M16 70 C24 73 38 76 42 72 L40 80 L46 84 L44 92 C28 92 16 89 16 78 Z M86 70 C78 73 64 76 60 72 L63 82 L57 85 L59 92 C74 92 86 89 86 78 Z" fill="#22242c"/>
      <path d="M48 76 L52 76 L55 86 L50 90 L46 84 Z" fill="#1c1d22" stroke-width="2"/>
      <path d="M14 58 C6 24 30 8 52 10 C76 8 96 26 86 58 C84 46 80 40 74 42 C70 30 62 40 56 36 C50 28 44 42 38 38 C32 36 26 46 22 48 C18 52 16 56 14 58 Z" fill="#4a3424"/>
      <path d="M34 44 L48 50 M70 44 L56 50" fill="none" stroke-width="4"/>
      <g stroke="none"><circle cx="42" cy="54" r="5.5" fill="#f6e36a"/><circle cx="62" cy="54" r="5.5" fill="#f6e36a"/><circle cx="43" cy="54" r="2.2" fill="#1c1d22"/><circle cx="61" cy="54" r="2.2" fill="#1c1d22"/></g>
      <path d="M36 68 C44 62 60 62 68 68 C60 72 44 72 36 68 Z" fill="#3a2a2a"/>
      <path d="M42 66 L45 71 L48 66 M56 66 L59 71 L62 66" fill="#ffffff" stroke-width="2"/>`),
  },

  darkgrungus: {
    body: svg(`
      <g stroke="none" fill="#7b2ff7" opacity=".28"><circle cx="50" cy="52" r="48"/></g>
      <path d="M14 28 C-4 44 -2 80 8 96 C14 86 22 74 26 58 Z M86 28 C104 44 102 80 92 96 C86 86 78 74 74 58 Z" fill="#15121f"/>
      <path d="M30 14 L22 0 L38 8 Z M70 14 L78 0 L62 8 Z" fill="#2a2140"/>
      <path d="M14 60 C14 32 32 20 51 20 C70 20 88 32 88 60 L88 78 C88 90 74 93 51 93 C28 93 14 90 14 78 Z" fill="#2a2140"/>
      <path d="M14 70 C24 74 38 77 42 73 L39 82 L46 85 L43 93 C28 93 14 90 14 78 Z M88 70 C78 74 64 77 60 73 L64 83 L57 86 L60 93 C74 93 88 90 88 78 Z" fill="#0d0b14"/>
      <path d="M12 58 C4 22 30 6 52 8 C76 6 98 24 88 58 C86 46 80 38 74 42 C70 28 62 40 56 34 C50 26 44 42 38 36 C32 34 26 46 22 48 C18 52 14 56 12 58 Z" fill="#15121f"/>
      <g stroke="none"><path d="M32 50 L48 56 L34 60 Z M72 50 L56 56 L70 60 Z" fill="#ff3b6b"/><circle cx="40" cy="55" r="1.8" fill="#fff"/><circle cx="64" cy="55" r="1.8" fill="#fff"/></g>
      <path d="M34 68 C44 76 60 76 70 68 C60 72 44 72 34 68 Z" fill="#ff3b6b" stroke-width="3"/>
      <path d="M40 70 L43 76 L46 71 M52 72 L55 77 L58 71 M62 70 L64 75" fill="#ffffff" stroke-width="2"/>`),
  },

  darkestgrungus: {
    body: svg(`
      <path d="M14 28 C-4 44 -2 80 8 96 C14 86 22 74 26 58 Z M86 28 C104 44 102 80 92 96 C86 86 78 74 74 58 Z" fill="#000000"/>
      <path d="M28 16 L18 -2 L38 8 Z M72 16 L82 -2 L62 8 Z M50 10 L46 -4 L54 -4 Z" fill="#050505"/>
      <path d="M14 60 C14 32 32 20 51 20 C70 20 88 32 88 60 L88 78 C88 90 74 93 51 93 C28 93 14 90 14 78 Z" fill="#050505"/>
      <path d="M12 58 C4 22 30 6 52 8 C76 6 98 24 88 58 C86 46 80 38 74 42 C70 28 62 40 56 34 C50 26 44 42 38 36 C32 34 26 46 22 48 C18 52 14 56 12 58 Z" fill="#000000"/>
      <g stroke="none"><circle cx="40" cy="54" r="5.5" fill="#f4f2ee"/><circle cx="64" cy="54" r="5.5" fill="#f4f2ee"/><circle cx="40" cy="54" r="2.6" fill="#000000"/><circle cx="64" cy="54" r="2.6" fill="#000000"/></g>
      <rect x="37" y="66" width="30" height="13" rx="6.5" fill="#e48aa4" stroke="#000000" stroke-width="2.5"/>
      <path d="M41 72.5 H63" fill="none" stroke="#2a0a14" stroke-width="2.2"/>`),
  },

  lagger: {
    body: svg(`${person(SKIN, '#3b3f52')}
      <path d="M24 44 C22 22 36 12 50 12 C66 12 78 22 76 42 C68 30 60 28 50 30 C40 28 30 32 24 44 Z" fill="#5b3b2a"/>
      <path d="M20 50 C18 22 34 8 50 8 C66 8 82 22 80 50" fill="none" stroke-width="5" stroke="#2a2c36"/>
      <rect x="13" y="44" width="12" height="20" rx="5" fill="#e23b3b"/><rect x="75" y="44" width="12" height="20" rx="5" fill="#e23b3b"/>
      <path d="M22 62 C22 72 30 74 38 72" fill="none" stroke-width="3"/><circle cx="40" cy="72" r="3.5" fill="#2a2c36"/>
      ${eyes(41, 50, 18, 3.5)}
      <path d="M44 62 H58" fill="none" stroke-width="3"/>
      <g fill="none" stroke="#9be36c" stroke-width="2.5" stroke-linecap="round"><path d="M44 80 a8 8 0 0 1 12 0"/><path d="M40 76 a14 14 0 0 1 20 0" opacity=".45"/></g><circle cx="50" cy="84" r="2" fill="#9be36c" stroke="none"/>`),
  },

  medusa: {
    body: svg(`
      <g fill="none" stroke-linecap="round">
        <path d="M30 30 C14 28 10 14 20 8" stroke-width="9"/><path d="M30 30 C14 28 10 14 20 8" stroke="#3f9a5a" stroke-width="5"/>
        <path d="M42 22 C36 8 44 0 54 4" stroke-width="9"/><path d="M42 22 C36 8 44 0 54 4" stroke="#3f9a5a" stroke-width="5"/>
        <path d="M60 22 C68 6 80 6 82 16" stroke-width="9"/><path d="M60 22 C68 6 80 6 82 16" stroke="#3f9a5a" stroke-width="5"/>
        <path d="M72 32 C88 30 94 40 88 48" stroke-width="9"/><path d="M72 32 C88 30 94 40 88 48" stroke="#3f9a5a" stroke-width="5"/>
        <path d="M24 42 C10 44 6 56 12 62" stroke-width="9"/><path d="M24 42 C10 44 6 56 12 62" stroke="#3f9a5a" stroke-width="5"/>
      </g>
      <g stroke="none" fill="#1c1d22"><circle cx="20" cy="8" r="2.2"/><circle cx="54" cy="4" r="2.2"/><circle cx="82" cy="16" r="2.2"/><circle cx="88" cy="48" r="2.2"/><circle cx="12" cy="62" r="2.2"/></g>
      ${person('#a9d6a0', '#6b4a8c')}
      <path d="M36 44 L46 48 M64 44 L54 48" fill="none" stroke-width="3"/>
      <g stroke="none"><ellipse cx="41" cy="52" rx="5" ry="4" fill="#ffe14a"/><ellipse cx="59" cy="52" rx="5" ry="4" fill="#ffe14a"/><rect x="40" y="48.5" width="2" height="7" fill="#1c1d22"/><rect x="58" y="48.5" width="2" height="7" fill="#1c1d22"/></g>
      <path d="M44 63 Q50 66 56 63" fill="none" stroke-width="3"/>`),
  },

  vacuum: {
    body: svg(`
      <ellipse cx="50" cy="68" rx="44" ry="22" fill="#2a2c36"/>
      <ellipse cx="50" cy="60" rx="44" ry="22" fill="#e9ebf1"/>
      <ellipse cx="50" cy="58" rx="30" ry="13" fill="#c9ced8"/>
      <path d="M8 62 C10 76 30 84 50 84 C70 84 90 76 92 62" fill="none" stroke-width="3"/>
      <ellipse cx="50" cy="57" rx="9" ry="4.5" fill="#3ddc84"/>
      <g stroke="none" fill="#1c1d22"><circle cx="72" cy="52" r="2.2"/><circle cx="80" cy="57" r="2.2"/></g>
      <path d="M88 48 L97 42 M90 54 L99 52" fill="none" stroke-width="2.5"/>`),
  },

  hedgehog: {
    body: svg(`
      <path d="M12 72 L4 56 L16 54 L10 38 L24 40 L24 22 L38 30 L46 12 L56 28 L70 16 L72 34 L84 30 L78 46 C60 50 52 66 52 88 L20 88 Z" fill="#7a5236"/>
      <path d="M44 89 C40 64 54 46 72 46 C84 46 96 56 97 64 C97 70 91 72 86 72 C86 84 76 90 60 90 Z" fill="#f0d9b5"/>
      <circle cx="95" cy="63" r="4.5" fill="${INK}" stroke="none"/>
      <circle cx="76" cy="58" r="4" fill="${INK}" stroke="none"/>
      <path d="M72 72 Q78 76 84 72" fill="none" stroke-width="2.5"/>
      <circle cx="60" cy="70" r="5" fill="#f4b6c0" stroke="none"/>`),
  },

  rhino: {
    body: svg(`
      <path d="M24 24 C16 8 32 6 36 18 Z" fill="#8795a3"/><path d="M52 16 C52 2 68 4 64 18 Z" fill="#8795a3"/>
      <path d="M8 58 C8 30 28 14 52 14 C76 14 92 30 94 52 C96 74 80 91 52 91 C26 91 8 84 8 58 Z" fill="#9aa7b4"/>
      <path d="M14 58 C24 64 30 76 28 88 M26 34 C22 44 22 52 24 58" fill="none" stroke-width="3" opacity=".45"/>
      <path d="M64 42 C66 34 70 30 74 28 C76 36 76 42 74 46 Z" fill="#f4f1e6"/>
      <path d="M78 46 C84 32 92 18 98 10 C100 28 98 42 92 54 Z" fill="#f4f1e6"/>
      ${eyes(44, 50, 18, 3.8)}
      <path d="M38 42 L50 45" fill="none" stroke-width="3.5"/>
      <ellipse cx="86" cy="62" rx="2.4" ry="3" fill="${INK}" stroke="none"/>
      <path d="M68 74 Q80 78 90 70" fill="none" stroke-width="3"/>`),
  },

  skeleton: {
    body: svg(`
      <path d="M32 74 H70 L74 90 H28 Z" fill="#f4f1e6"/>
      <path d="M34 80 H68 M32 86 H70 M51 74 V90" fill="none" stroke-width="2.5"/>
      <path d="M20 48 C20 26 34 12 51 12 C68 12 82 26 82 48 C82 60 78 66 72 68 L72 77 H30 L30 68 C24 66 20 60 20 48 Z" fill="#f4f1e6"/>
      <g stroke="none" fill="${INK}"><ellipse cx="44" cy="45" rx="8" ry="9.5"/><ellipse cx="67" cy="45" rx="8" ry="9.5"/><path d="M56 55 L52 63 H60 Z"/></g>
      <path d="M38 68 V77 M46 68 V77 M54 68 V77 M62 68 V77 M30 68 H72" fill="none" stroke-width="2.5"/>`),
    weapon: svg(`
      <path d="M44 22 C36 22 34 12 40 8 C44 4 50 8 50 12 C50 8 56 4 60 8 C66 12 64 22 56 22 V78 C64 78 66 88 60 92 C56 96 50 92 50 88 C50 92 44 96 40 92 C34 88 36 78 44 78 Z" fill="#f4f1e6"/>`),
  },

  zombie: {
    body: svg(`
      <path d="M70 62 C82 58 96 60 97 67 C97 74 84 76 70 76 Z" fill="#8fbf7a"/>
      ${person('#8fbf7a', '#6b5a4a')}
      <path d="M30 76 L36 84 L42 76 M60 77 L66 85 L72 76" fill="none" stroke-width="2.5"/>
      <path d="M24 48 C22 24 40 14 54 16 C70 16 82 28 80 46 C76 40 72 32 62 32 C56 38 46 30 40 38 C34 36 28 42 24 48 Z" fill="#3f4a35"/>
      <circle cx="48" cy="54" r="7.5" fill="#f4f1e6" stroke-width="3"/><circle cx="50" cy="55" r="2.6" fill="${INK}" stroke="none"/>
      <path d="M62 49 L72 59 M72 49 L62 59" fill="none" stroke-width="3.5"/>
      <path d="M46 68 L52 64 L58 69 L64 64 L70 68" fill="none" stroke-width="3"/>`),
  },

  necromancer: {
    body: svg(`
      <path d="${HOOD}" fill="#3a2f52"/>
      <path d="M32 58 C32 44 42 36 55 36 C68 36 76 44 76 58 C76 68 68 74 55 74 C42 74 32 68 32 58 Z" fill="#15131f"/>
      <g stroke="none" fill="#7dffb0"><ellipse cx="50" cy="54" rx="4.5" ry="5.5"/><ellipse cx="66" cy="54" rx="4.5" ry="5.5"/></g>
      <path d="M20 76 C36 82 64 82 80 76" fill="none" stroke="#b78aff" stroke-width="3.5"/>
      <path d="M54 6 C60 2 66 4 68 10" fill="none" stroke-width="3"/>`),
    weapon: svg(`
      ${line('M50 94 V30', '#4a3a5e', 5)}
      <path d="M34 14 C34 2 66 2 66 14 C66 22 62 26 58 27 V34 H42 V27 C38 26 34 22 34 14 Z" fill="#f4f1e6"/>
      <g stroke="none" fill="#8a5cf6"><circle cx="44" cy="15" r="4.5"/><circle cx="56" cy="15" r="4.5"/></g>`),
  },

  vampire: {
    body: svg(`
      <path d="M14 66 L16 26 L38 48 Z" fill="#b3243a"/><path d="M88 66 L86 26 L64 48 Z" fill="#b3243a"/>
      ${person('#e6e3f0', '#2a2c36')}
      <path d="M44 74 L51 82 L58 74" fill="#f4f1e6" stroke-width="2.5"/>
      <path d="M24 50 C22 26 38 14 52 14 C68 14 82 26 80 50 C74 42 66 38 58 38 L52 48 L46 38 C38 38 30 42 24 50 Z" fill="${INK}"/>
      <g stroke="none" fill="#c8102e"><circle cx="46" cy="56" r="4"/><circle cx="64" cy="56" r="4"/></g>
      <path d="M48 65 Q57 70 68 65" fill="none" stroke-width="3"/>
      <path d="M52 67 L54 73 L57 68 Z M60 68 L63 73 L65 67 Z" fill="#ffffff" stroke-width="1.5"/>`),
  },

  ghost: {
    body: svg(`
      <path d="M18 56 C18 30 34 12 52 12 C70 12 86 30 86 56 L86 92 L75 83 L64 92 L52 83 L40 92 L29 83 L18 92 Z" fill="#f7f7fb"/>
      <g stroke="none" fill="${INK}"><ellipse cx="48" cy="46" rx="5.5" ry="8"/><ellipse cx="68" cy="46" rx="5.5" ry="8"/><ellipse cx="58" cy="64" rx="5" ry="6.5"/></g>
      <path d="M26 54 C26 36 34 26 42 22" fill="none" stroke="#dcdcea" stroke-width="4"/>`),
  },

  slime: {
    body: svg(`
      <path d="M8 78 C6 30 28 14 52 14 C76 14 96 30 92 78 C82 93 20 93 8 78 Z" fill="#5fd35a"/>
      <ellipse cx="32" cy="36" rx="9" ry="5" transform="rotate(-35 32 36)" fill="#ffffff" stroke="none" opacity=".55"/>
      ${eyes(44, 58, 22, 4.5)}
      <path d="M48 68 Q55 76 62 68" fill="none" stroke-width="3.5"/>`),
  },

  snowman: {
    body: svg(`
      <circle cx="50" cy="66" r="26" fill="#ffffff"/>
      <circle cx="52" cy="34" r="19" fill="#ffffff"/>
      <path d="M32 46 C42 54 62 54 72 46 L72 53 C62 61 42 61 32 53 Z" fill="#e2574c"/>
      <path d="M36 54 L30 72 L40 70 L42 56 Z" fill="#e2574c"/>
      <path d="M40 2 H66 V18 H40 Z" fill="#2a2c36"/><path d="M32 18 H74 V24 H32 Z" fill="#2a2c36"/>
      <path d="M62 33 L84 38 L62 42 Z" fill="#f08a3c" stroke-width="2.5"/>
      <g stroke="none" fill="${INK}"><circle cx="50" cy="31" r="3"/><circle cx="60" cy="29" r="3"/><circle cx="54" cy="66" r="2.8"/><circle cx="54" cy="77" r="2.8"/></g>`),
  },

  ogre: {
    body: svg(`
      <path d="M12 52 C2 48 0 36 2 28 C10 30 18 36 20 44 Z" fill="#7a9644"/><path d="M88 52 C98 48 100 36 98 28 C90 30 82 36 80 44 Z" fill="#7a9644"/>
      <path d="M8 60 C6 34 24 12 50 12 C76 12 94 34 92 60 C92 80 78 91 50 91 C22 91 8 80 8 60 Z" fill="#8aa84f"/>
      <path d="M12 74 C30 82 70 82 88 74 C86 86 72 91 50 91 C28 91 14 86 12 74 Z" fill="#8a5a36"/>
      <path d="M44 14 C46 6 54 4 58 10" fill="none" stroke-width="3.5"/>
      <path d="M30 38 L52 45 M86 38 L66 45" fill="none" stroke-width="6"/>
      <g stroke="none" fill="#ffe36b"><circle cx="46" cy="50" r="5"/><circle cx="70" cy="50" r="5"/></g>
      <g stroke="none" fill="${INK}"><circle cx="47" cy="50" r="2.2"/><circle cx="71" cy="50" r="2.2"/><circle cx="55" cy="58" r="1.8"/><circle cx="62" cy="58" r="1.8"/></g>
      <path d="M34 68 H84" fill="none" stroke-width="3.5"/>
      <path d="M40 68 L44 57 L48 68 Z M70 68 L74 57 L78 68 Z" fill="#f4f1e6" stroke-width="2.5"/>`),
    weapon: svg(`
      <path d="M45 94 L38 34 C34 6 66 6 62 34 L55 94 Z" fill="#8a5a36"/>
      <path d="M44 40 H56 M42 26 H58" fill="none" stroke-width="2.5" opacity=".5"/>
      <g fill="#c9ced8" stroke-width="2.5"><path d="M38 22 L28 18 L38 30 Z"/><path d="M62 22 L72 18 L62 30 Z"/><path d="M46 10 L50 0 L54 10 Z"/></g>`),
  },

  dragon: {
    body: svg(`
      <path d="M28 52 C10 42 2 24 6 8 C14 18 22 20 32 18 C30 28 36 36 42 40 Z" fill="#2f8a48"/>
      <path d="M68 36 C74 20 86 10 98 8 C96 20 98 30 94 40 C88 38 82 40 78 46 Z" fill="#2f8a48"/>
      ${line('M24 72 C8 76 0 64 4 52', '#3fae5a', 7)}
      <path d="M40 30 L34 10 L50 24 Z" fill="#f2c14e"/><path d="M56 24 L60 4 L68 26 Z" fill="#f2c14e"/>
      <path d="M20 62 C20 38 36 24 54 24 C74 24 88 38 88 58 C88 78 74 90 54 90 C34 90 20 80 20 62 Z" fill="#3fae5a"/>
      <path d="M36 70 C42 82 66 84 74 72 C70 90 40 90 36 70 Z" fill="#f2e08a" stroke-width="3"/>
      <path d="M64 50 C78 42 99 48 99 60 C99 70 86 73 68 70 Z" fill="#3fae5a"/>
      <path d="M70 68 L74 74 L78 69 L82 74 L86 69" fill="#ffffff" stroke-width="2"/>
      <circle cx="58" cy="44" r="8" fill="#ffe36b" stroke-width="3"/><ellipse cx="60" cy="44" rx="2.4" ry="5.5" fill="${INK}" stroke="none"/>
      <path d="M48 34 L64 37" fill="none" stroke-width="4"/>
      <circle cx="93" cy="55" r="2" fill="${INK}" stroke="none"/>`),
  },

  baldy: {
    body: svg(`
      <path d="${TALL}" fill="${SKIN}"/>
      <path d="M20 70 C36 76 66 76 82 70 L82 78 C82 88 72 91 51 91 C30 91 20 88 20 78 Z" fill="#7a8696"/>
      <path d="M20 58 C17 50 19 43 23 40 C24 48 25 54 27 61 Z" fill="#6b4a2e"/>
      <path d="M82 58 C85 50 83 43 79 40 C78 48 77 54 75 61 Z" fill="#6b4a2e"/>
      <path d="M32 36 C38 28 48 25 58 27" fill="none" stroke="#ffffff" stroke-width="5" opacity=".85"/>
      <path d="M72 14 L74 21 L81 23 L74 25 L72 32 L70 25 L63 23 L70 21 Z" fill="#ffffff" stroke-width="2"/>
      <path d="M42 48 L52 45 M76 48 L66 45" fill="none" stroke-width="3"/>
      ${eyes(51, 55, 16)}
      <path d="M52 67 Q59 63 66 67" fill="none" stroke-width="3"/>`),
  },

  baldy2: {
    body: svg(`
      <path d="${TALL}" fill="${SKIN}"/>
      <path d="M20 70 C36 76 66 76 82 70 L82 78 C82 88 72 91 51 91 C30 91 20 88 20 78 Z" fill="#2a2c36"/>
      <path d="M38 73 Q51 86 64 73" fill="none" stroke="#f2c14e" stroke-width="3"/>
      <path d="M30 40 C36 29 48 24 62 27" fill="none" stroke="#ffffff" stroke-width="6" opacity=".9"/>
      <path d="M72 10 L75 19 L84 22 L75 25 L72 34 L69 25 L60 22 L69 19 Z" fill="#ffffff" stroke-width="2"/>
      <path d="M26 16 L27.5 20.5 L32 22 L27.5 23.5 L26 28 L24.5 23.5 L20 22 L24.5 20.5 Z" fill="#ffffff" stroke-width="1.5"/>
      <path d="M36 48 H82 L80 58 Q72 63 64 56 H56 Q48 63 40 58 Z" fill="${INK}"/>
      <path d="M44 51 L48 55 M68 51 L72 55" fill="none" stroke="#ffffff" stroke-width="2.5"/>
      <path d="M40 66 C46 76 70 76 76 66 C72 70 46 70 40 66 Z" fill="#8a6a50" stroke="none" opacity=".55"/>
      <path d="M50 67 Q60 72 70 64" fill="none" stroke-width="3.5"/>`),
  },

  karen: {
    body: svg(`
      <path d="M28 18 L22 4 L36 12 L40 0 L48 10 L58 2 L60 12 Z" fill="#f2d16b"/>
      ${person(SKIN, '#e86a9a')}
      <path d="M16 66 C10 32 28 10 54 10 C76 10 90 28 84 52 L80 47 C74 38 62 34 50 36 C40 38 34 46 34 60 L30 74 Z" fill="#f2d16b"/>
      <path d="M40 48 H56 Q58 60 48 60 Q40 60 40 48 Z M60 48 H76 Q78 60 68 60 Q60 60 60 48 Z" fill="${INK}"/>
      <path d="M56 50 H60" fill="none" stroke-width="3"/>
      <path d="M40 44 L54 42 M78 44 L64 42" fill="none" stroke-width="3"/>
      <path d="M52 68 Q60 60 68 68 Q60 76 52 68 Z" fill="#8a1c2b" stroke-width="2.5"/>
      <circle cx="51" cy="80" r="3" fill="#f2c14e" stroke-width="2"/>`),
    weapon: svg(`
      <path d="M36 46 C36 70 64 70 64 46" fill="none" stroke-width="5"/>
      <path d="M26 12 H74 L80 46 H20 Z" fill="#b3243a"/>
      <path d="M22 26 H78" fill="none" stroke-width="3"/>
      <circle cx="50" cy="27" r="5" fill="#f2c14e"/>`),
  },

  influencer: {
    body: svg(`
      <circle cx="52" cy="11" r="10" fill="#5a3a2a"/>
      <path d="M18 80 C10 42 28 16 52 16 C76 16 92 42 84 80 L76 72 C80 52 70 40 52 40 C36 40 26 52 30 72 Z" fill="#5a3a2a"/>
      ${person(SKIN, '#b78aff')}
      <path d="M24 46 C24 30 38 24 52 24 C66 24 80 30 80 46 C72 38 62 36 52 36 C42 36 32 38 24 46 Z" fill="#5a3a2a"/>
      ${eyes(50, 54, 16, 3.8)}
      <path d="M44 50 L40 46 M72 50 L76 46" fill="none" stroke-width="2.5"/>
      <g stroke="none" fill="#f7a8b8" opacity=".9"><circle cx="42" cy="62" r="4"/><circle cx="74" cy="62" r="4"/></g>
      <path d="M58 62 C55 59 51 63 58 68 C65 63 61 59 58 62 Z" fill="#e2574c" stroke-width="2"/>`),
    weapon: svg(`
      ${line('M50 92 V44', '#c9ced8', 3)}
      <path d="M34 4 H66 Q70 4 70 8 V42 Q70 46 66 46 H34 Q30 46 30 42 V8 Q30 4 34 4 Z" fill="#2a2c36"/>
      <path d="M36 10 H64 V38 H36 Z" fill="#7fe0ff" stroke="none"/>
      <path d="M50 21 C46 16 40 22 50 30 C60 22 54 16 50 21 Z" fill="#ff7ab8" stroke-width="2"/>`),
  },

  bryan: {
    body: svg(`${person(SKIN, '#9ad14b')}
      <path d="M22 46 C20 26 36 14 52 14 C68 14 80 24 80 40 L78 44 C60 38 40 40 22 46 Z" fill="#e2574c"/>
      <path d="M22 44 C12 44 4 48 2 54 C10 56 20 54 28 50 Z" fill="#e2574c"/>
      <circle cx="52" cy="14" r="4" fill="#f2c14e" stroke-width="2.5"/>
      <circle cx="44" cy="56" r="9" fill="#ffffff" stroke-width="3"/><circle cx="68" cy="53" r="7" fill="#ffffff" stroke-width="3"/>
      <g stroke="none" fill="${INK}"><circle cx="40" cy="59" r="3.4"/><circle cx="71" cy="50" r="3"/></g>
      <path d="M46 68 Q58 80 72 67 Q58 72 46 68 Z" fill="#8a1c2b" stroke-width="2.5"/>
      <path d="M56 73 Q60 84 65 72 Z" fill="#f08a9b" stroke-width="2.5"/>
      <path d="M30 82 H38 M60 84 H70" fill="none" stroke-width="2.5" opacity=".4"/>`),
    weapon: svg(`
      ${line('M50 92 C46 70 58 56 50 38 C44 24 54 14 52 6', '#ff8ac0', 9)}
      <path d="M50 92 C46 70 58 56 50 38" fill="none" stroke="#ffffff" stroke-width="2" opacity=".5"/>`),
  },

  founder: {
    body: svg(`
      <path d="M16 64 C12 38 30 22 52 22 C74 22 90 38 86 64 Z" fill="#5a616e"/>
      ${person(SKIN, '#6f7785')}
      <path d="M44 74 V86 M58 74 V86" fill="none" stroke="#f4f1e6" stroke-width="2.5"/>
      <path d="M24 48 C20 30 30 16 44 18 C48 10 60 10 64 18 C76 16 86 30 80 46 C74 38 66 40 60 34 C52 40 44 34 38 40 C32 38 28 42 24 48 Z" fill="#6b4a2e"/>
      <circle cx="46" cy="55" r="6.5" fill="#ffffff" stroke-width="3"/><circle cx="66" cy="55" r="6.5" fill="#ffffff" stroke-width="3"/>
      <g stroke="none" fill="${INK}"><circle cx="47.5" cy="55" r="3"/><circle cx="67.5" cy="55" r="3"/></g>
      <path d="M46 66 Q57 76 70 66 Q57 70 46 66 Z" fill="#ffffff" stroke-width="2.5"/>`),
    weapon: svg(`
      <path d="M22 10 H78 V50 H22 Z" fill="#c9ced8"/>
      <path d="M28 16 H72 V44 H28 Z" fill="#1f3a6e" stroke="none"/>
      <path d="M34 38 L44 30 L52 34 L66 20" fill="none" stroke="#6fd08c" stroke-width="3.5"/>
      <path d="M60 20 H66 V26" fill="none" stroke="#6fd08c" stroke-width="3.5"/>
      <path d="M14 50 H86 L80 62 H20 Z" fill="#e6e9f0"/>`),
  },

  investor: {
    body: svg(`${person(SKIN, '#b9d4f2')}
      <path d="M22 70 C28 73 36 74 42 75 L46 91 C32 90 22 88 22 78 Z" fill="#26375e"/>
      <path d="M80 70 C74 73 66 74 60 75 L56 91 C70 90 80 88 80 78 Z" fill="#26375e"/>
      <path d="M24 46 C22 26 38 14 54 16 C70 16 82 28 80 44 C70 40 54 38 44 30 C38 36 30 40 24 46 Z" fill="#c9ced8"/>
      ${eyes(50, 54, 16, 3.6)}
      <path d="M44 47 L55 49 M76 47 L66 49" fill="none" stroke-width="3"/>
      <path d="M52 66 Q59 68 68 63" fill="none" stroke-width="3"/>`),
    weapon: svg(`
      <path d="M40 22 V12 H60 V22" fill="none" stroke-width="5"/>
      <path d="M22 22 H78 V62 H22 Z" fill="#8a5a36"/>
      <path d="M22 38 H78" fill="none" stroke-width="3"/>
      <path d="M44 34 H56 V44 H44 Z" fill="#f2c14e" stroke-width="2.5"/>`),
  },

  lion: {
    body: svg(`
      ${line('M18 70 C4 70 2 54 10 46', '#d9a24e', 5)}
      <circle cx="10" cy="44" r="6" fill="#8a4a16"/>
      <path d="M14 72 C14 60 22 56 34 56 L50 60 L50 90 C30 90 14 86 14 72 Z" fill="#d9a24e"/>
      <path d="M96.0 48.0 L85.7 56.3 L89.7 68.5 L76.3 70.3 L72.6 82.6 L60.4 77.2 L50.3 85.6 L43.1 74.8 L29.8 76.7 L29.9 63.9 L17.6 58.7 L25.0 48.0 L17.6 37.3 L29.9 32.1 L29.8 19.3 L43.1 21.2 L50.3 10.4 L60.4 18.8 L72.6 13.4 L76.3 25.7 L89.7 27.5 L85.7 39.7 Z" fill="#b8641c"/>
      <circle cx="60" cy="50" r="24" fill="#e6b35a"/>
      <circle cx="44" cy="30" r="7" fill="#e6b35a"/><circle cx="74" cy="28" r="7" fill="#e6b35a"/>
      <circle cx="44" cy="30" r="3" fill="#8a4a16" stroke="none"/><circle cx="74" cy="28" r="3" fill="#8a4a16" stroke="none"/>
      <ellipse cx="66" cy="62" rx="14" ry="10" fill="#f6dfaa" stroke-width="3"/>
      <path d="M60 54 L72 54 L66 61 Z" fill="${INK}" stroke-width="2"/>
      <path d="M66 61 V66 M58 68 Q66 72 74 68" fill="none" stroke-width="2.5"/>
      ${eyes(54, 44, 18, 3.6)}
      <path d="M48 38 L58 40 M78 38 L68 40" fill="none" stroke-width="3"/>
      <path d="M50 84 H60 M66 84 H74" fill="none" stroke-width="2.5" opacity=".35"/>`),
  },

  jesus: {
    body: svg(`
      <ellipse cx="51" cy="10" rx="17" ry="5" fill="none" stroke="#f2c14e" stroke-width="4"/>
      <path d="M16 70 C14 34 30 18 51 18 C72 18 88 34 86 70 C82 64 78 58 74 56 L28 56 C24 58 20 64 16 70 Z" fill="#7a4e2a"/>
      <path d="M20 62 C20 46 34 38 52 38 C70 38 82 46 82 62 L84 80 C84 89 72 91 51 91 C30 91 18 89 18 80 Z" fill="#f4f1e6"/>
      <path d="M62 56 L36 91 L44 91 L68 58 Z" fill="#c8453a" stroke-width="2.5"/>
      <path d="M32 44 C32 30 42 24 54 24 C68 24 76 32 76 44 C76 52 70 56 54 56 C40 56 32 52 32 44 Z" fill="#f2c9a0"/>
      <path d="M34 50 C38 58 46 66 54 66 C64 66 72 58 76 48 C72 54 64 56 56 56 C46 56 38 54 34 50 Z" fill="#7a4e2a"/>
      <path d="M32 42 C30 30 40 20 54 20 C66 20 78 28 76 40 C70 32 62 30 54 30 C44 30 36 34 32 42 Z" fill="#7a4e2a"/>
      ${eyes(48, 42, 14, 3.2)}
      <path d="M52 51 Q56 54 61 51" fill="none" stroke-width="2.5"/>`),
  },

  floridaman: {
    body: svg(`
      <path d="M22 50 C14 60 14 76 22 82 L30 78 C26 70 26 60 30 52 Z" fill="#8a5a2e"/>
      ${person('#f2a58a', '#f4f1e6')}
      <path d="M30 70 V84 M72 70 V84" fill="none" stroke="#f2a58a" stroke-width="7"/>
      <path d="M22 70 C36 76 66 76 80 70" fill="none" stroke-width="3"/>
      <path d="M26 46 C24 30 36 22 52 22 C68 22 80 30 78 44 C70 38 62 36 54 36 C44 36 34 40 26 46 Z" fill="#8a5a2e"/>
      <path d="M38 48 H82 L80 56 Q72 60 64 54 H58 Q50 60 42 56 Z" fill="#ff7a1a"/>
      <path d="M44 50 L48 54 M66 50 L70 54" fill="none" stroke="#ffffff" stroke-width="2.5"/>
      <path d="M50 64 C54 60 60 62 62 64 C64 62 70 60 74 64 C70 68 66 68 62 66 C58 68 54 68 50 64 Z" fill="#8a5a2e" stroke-width="2.5"/>
      <g stroke="none" fill="#e2574c" opacity=".35"><circle cx="42" cy="62" r="5"/><circle cx="78" cy="60" r="4"/></g>`),
    weapon: svg(`
      ${line('M50 94 V40', '#7a5236', 3)}
      <path d="M50 40 C40 40 34 30 40 22 C44 16 52 18 54 24 C56 30 50 34 50 40 Z" fill="#ff8ac0"/>
      <path d="M50 22 C52 10 62 6 68 10 C64 12 60 16 58 22" fill="#ff8ac0"/>
      <path d="M68 10 L74 12 L68 14 Z" fill="${INK}" stroke-width="2"/>
      <circle cx="64" cy="11" r="1.5" fill="${INK}" stroke="none"/>`),
  },

  manager: {
    body: svg(`${person(SKIN, '#1f3a6e')}
      <path d="M40 72 L51 82 L62 72 L58 70 H44 Z" fill="#ffffff" stroke-width="2.5"/>
      <path d="M48 74 H54 L56 88 L51 91 L46 88 Z" fill="#e2574c" stroke-width="2.5"/>
      <path d="M24 46 C22 26 36 14 54 16 C70 16 82 28 80 44 C72 36 60 36 50 30 C42 36 32 38 24 46 Z" fill="#3a2a1e"/>
      ${eyes(50, 54, 16, 3.6)}
      <path d="M43 54 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M59 54 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M57 54 H59" fill="none" stroke-width="2.5"/>
      <path d="M52 66 H66" fill="none" stroke-width="3"/>
      <path d="M66 76 H78 V82 H66 Z" fill="#f2c14e" stroke-width="2"/>`),
    weapon: svg(`
      <path d="M28 8 H72 V62 H28 Z" fill="#b9793d"/>
      <path d="M34 16 H66 V56 H34 Z" fill="#ffffff" stroke-width="2.5"/>
      <path d="M40 26 H60 M40 34 H60 M40 42 H54" fill="none" stroke-width="2.5" opacity=".5"/>
      <path d="M42 4 H58 V12 H42 Z" fill="#c9ced8" stroke-width="2.5"/>`),
  },

  gator: {
    body: svg(`
      ${line('M24 66 C8 68 0 56 6 42', '#5d8f3f', 8)}
      <path d="M22 46 L27 33 L33 44 Z M35 42 L41 29 L47 41 Z M49 41 L54 30 L59 41 Z" fill="#47752f" stroke-width="3"/>
      <path d="M12 62 C12 46 30 38 48 38 C60 38 66 42 70 46 L94 47 C99 49 99 58 94 60 L72 65 C70 78 58 85 44 85 C26 85 12 78 12 62 Z" fill="#5d8f3f"/>
      <path d="M22 72 C30 83 56 85 68 70 C62 88 30 90 22 72 Z" fill="#d9d58a" stroke-width="3"/>
      <circle cx="64" cy="38" r="9" fill="#5d8f3f"/>
      <circle cx="65" cy="38" r="5" fill="#ffe36b" stroke-width="2.5"/><ellipse cx="66" cy="38" rx="1.6" ry="4" fill="${INK}" stroke="none"/>
      <path d="M70 59 L96 56" fill="none" stroke-width="3"/>
      <path d="M73 59 l2.5 6 l2.5 -6 Z M79 59 l2.5 6 l2.5 -6 Z M85 59 l2.5 6 l2.5 -6 Z M91 59 l2.5 6 l2.5 -6 Z" fill="#ffffff" stroke-width="1.8"/>
      <circle cx="93" cy="50" r="1.8" fill="${INK}" stroke="none"/>
      <path d="M24 56 H30 M38 54 H44" fill="none" stroke-width="2.5" opacity=".35"/>`),
  },

  frog: {
    body: svg(`
      <circle cx="32" cy="34" r="15" fill="#4f9a3a"/><circle cx="70" cy="34" r="15" fill="#4f9a3a"/>
      <path d="M8 66 C8 46 28 40 50 40 C72 40 92 46 92 66 C92 82 76 90 50 90 C24 90 8 82 8 66 Z" fill="#4f9a3a"/>
      <path d="M26 76 C34 87 66 87 74 76 C70 91 30 91 26 76 Z" fill="#f2d98a" stroke-width="3"/>
      <g stroke="none" fill="#3d7c2c"><circle cx="20" cy="60" r="4"/><circle cx="84" cy="58" r="3.5"/><circle cx="50" cy="48" r="3"/></g>
      <circle cx="34" cy="33" r="8" fill="#ffffff" stroke-width="3"/><circle cx="72" cy="33" r="8" fill="#ffffff" stroke-width="3"/>
      <g stroke="none" fill="${INK}"><circle cx="36" cy="33" r="3.6"/><circle cx="74" cy="33" r="3.6"/><circle cx="56" cy="56" r="1.6"/><circle cx="64" cy="56" r="1.6"/></g>
      <path d="M24 62 Q52 78 82 62" fill="none" stroke-width="3.5"/>`),
  },

  worm: {
    body: svg(`
      <path d="M20 91 C10 60 18 30 44 14 C62 4 88 12 92 34 C96 54 86 66 74 70 C78 80 76 88 72 91 Z" fill="#c9a26b"/>
      <path d="M17 70 C34 76 58 76 75 72 M16 52 C28 58 44 62 58 62 M24 34 C30 42 38 48 46 52" fill="none" stroke-width="3" opacity=".45"/>
      <path d="M26 84 H34 M46 86 H54" fill="none" stroke-width="2.5" opacity=".35"/>
      <circle cx="66" cy="38" r="21" fill="#3a1d1d"/>
      <path d="M84.5 33.9 L75.0 38.0 L84.5 42.1 Z M83.4 45.5 L73.3 43.3 L78.6 52.3 Z M75.7 54.4 L68.8 46.6 L67.8 56.9 Z M64.2 56.9 L63.2 46.6 L56.3 54.4 Z M53.4 52.3 L58.7 43.3 L48.6 45.5 Z M47.5 42.1 L57.0 38.0 L47.5 33.9 Z M48.6 30.5 L58.7 32.7 L53.4 23.7 Z M56.3 21.6 L63.2 29.4 L64.2 19.1 Z M67.8 19.1 L68.8 29.4 L75.7 21.6 Z M78.6 23.7 L73.3 32.7 L83.4 30.5 Z" fill="#f4f1e6" stroke-width="2"/>
      <circle cx="66" cy="38" r="6" fill="#170b0b" stroke="none"/>`),
  },
};
// the smaller slimes share the big one's art
window.FO.art.slime_m = window.FO.art.slime_s = window.FO.art.slime;
})();
