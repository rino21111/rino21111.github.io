/* =====================================================================
   SVG WARS · sound
   Tiny synthesised effects, no audio files. Starts on the first click
   (browsers require that), and listens to game events.
   ===================================================================== */
(function () {
'use strict';
const FO = window.FO;
let ctx = null, master = null, noiseBuf = null;
const last = {};
const audio = FO.audio = { on: true };
try { audio.on = (localStorage.getItem('svgwars.sound') || localStorage.getItem('faceoff.sound')) !== 'off'; } catch (e) { /* storage unavailable */ }   // faceoff.* is the game's old name

audio.unlock = function () {
  if (ctx || !audio.on) { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; }
};
audio.toggle = function () {
  audio.on = !audio.on;
  try { localStorage.setItem('svgwars.sound', audio.on ? 'on' : 'off'); } catch (e) { /* ignore */ }
  if (audio.on) audio.unlock(); else if (ctx) ctx.suspend().catch(() => {});
  return audio.on;
};

function tone(type, f0, f1, dur, vol, delay) {
  const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, q) {
  const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.2), t + dur); f.Q.value = q || 0.7;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}
const SOUNDS = {
  hit:    () => { noise(0.06, 0.5, 900 + Math.random() * 600); },
  thump:  () => { tone('sine', 150, 50, 0.16, 0.9); noise(0.1, 0.5, 500); },
  twang:  () => tone('triangle', 620 + Math.random() * 120, 240, 0.09, 0.35),
  pew:    () => tone('square', 880, 300, 0.1, 0.16),
  bang:   () => { noise(0.14, 0.9, 3000); tone('sine', 220, 60, 0.12, 0.5); },
  whoosh: () => noise(0.25, 0.3, 1400, 3),
  roar:   () => { noise(0.35, 0.45, 500, 2); tone('sawtooth', 110, 60, 0.3, 0.18); },
  boom:   () => { noise(0.45, 1.0, 900); tone('sine', 120, 35, 0.4, 0.9); },
  pop:    () => tone('sine', 520 + Math.random() * 200, 140, 0.09, 0.4),
  bigpop: () => { tone('sine', 260, 60, 0.3, 0.8); noise(0.2, 0.5, 700); },
  zap:    () => { tone('sawtooth', 1400, 180, 0.14, 0.2); noise(0.08, 0.3, 5000); },
  heal:   () => { tone('sine', 520, 780, 0.12, 0.25); tone('sine', 780, 1040, 0.14, 0.2, 0.08); },
  raise:  () => tone('triangle', 160, 420, 0.25, 0.3),
  place:  () => tone('sine', 420 + Math.random() * 80, 620, 0.05, 0.16),
  click:  () => tone('square', 660, 660, 0.03, 0.1),
  start:  () => { tone('square', 392, 392, 0.1, 0.2); tone('square', 523, 523, 0.1, 0.2, 0.1); tone('square', 784, 784, 0.22, 0.22, 0.2); },
  win:    () => { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.2, 0.4, i * 0.12)); tone('triangle', 1319, 1319, 0.5, 0.4, 0.5); },
  draw:   () => { tone('triangle', 392, 392, 0.2, 0.3); tone('triangle', 311, 311, 0.4, 0.3, 0.2); },
};
const GAP = { hit: 0.045, twang: 0.05, pew: 0.06, pop: 0.05, place: 0.04, zap: 0.08, boom: 0.09, thump: 0.08, heal: 0.15, roar: 0.5, whoosh: 0.1, bang: 0.08, raise: 0.15, bigpop: 0.1 };
audio.play = function (name) {
  if (!audio.on || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (last[name] || -1) < (GAP[name] || 0)) return;
  last[name] = now;
  try { SOUNDS[name](); } catch (e) { /* never let sound break the game */ }
};

FO.on('hit', (t, amount) => audio.play(amount >= 40 ? 'thump' : 'hit'));
FO.on('death', (t, src, o) => !(o && o.life) && audio.play(t.def.r >= 20 ? 'bigpop' : 'pop'));
FO.on('shoot', (u, kind) => audio.play(kind || 'twang'));
FO.on('boom', (x, y, R, look) => audio.play(look === 'heal' ? 'heal' : 'boom'));
FO.on('zap', () => audio.play('zap'));
FO.on('heal', () => audio.play('heal'));
FO.on('raise', () => audio.play('raise'));
FO.on('start', () => audio.play('start'));
FO.on('end', r => audio.play(r.kind === 'win' ? 'win' : 'draw'));
})();
