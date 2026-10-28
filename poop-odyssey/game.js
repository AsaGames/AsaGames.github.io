// Super Poop Odyssey: a 3D explore-em-up by Asa, age 6. three.js r128, no other libraries.
// Kingdom layouts live in levels.js (built by tools/levels.py); the models live in art.js.
'use strict';
(function () {
const A = window.ART, LV = window.LEVELS, CS = window.CS;
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const wrapAng = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const lerpAng = (a, b, t) => a + wrapAng(b - a) * t;
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ------------------------------------------------------------------ renderer
const holder = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
holder.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe9ff');
scene.fog = new THREE.Fog('#bfe9ff', 30, 110);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
function resize() {
  const w = holder.clientWidth || innerWidth, h = holder.clientHeight || innerHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
scene.add(new THREE.HemisphereLight('#f2fbff', '#ffcf9a', 0.9));
const sun = new THREE.DirectionalLight('#ffffff', 0.55); sun.position.set(8, 14, 10); scene.add(sun);
let world = null;
function newWorld() { if (world) scene.remove(world); world = new THREE.Group(); scene.add(world); clearFloaters(); }

// ------------------------------------------------------------------ outfits & kingdoms
const OUTFITS = {
  party:   { name: 'Party Hat', slot: 'hat' },
  plumber: { name: 'Plumber Cap', slot: 'hat' },
  crown:   { name: 'Bottle Cap Crown', slot: 'hat' },
  goggles: { name: 'Goggles', slot: 'face', power: 'You can see and stand on ghost blocks!' },
  hardhat: { name: 'Hard Hat', slot: 'hat', power: 'Run into cracked blocks to smash them!' },
  sailor:  { name: 'Sailor Hat', slot: 'hat' },
  pirate:  { name: 'Pirate Hat', slot: 'hat' },
  shades:  { name: 'Sunglasses', slot: 'face', price: 10 },
  nose:    { name: 'Clown Nose', slot: 'face', price: 6 },
  stache:  { name: 'Mustache', slot: 'face', price: 8 },
  bow:     { name: 'Big Bow', slot: 'hat', price: 12 },
  cowboy:  { name: 'Cowboy Hat', slot: 'hat', price: 15 },
  chef:    { name: 'Chef Hat', slot: 'hat', price: 20 },
  viking:  { name: 'Viking Helmet', slot: 'hat', price: 25 },
};
const SHOP = ['shades', 'nose', 'stache', 'bow', 'cowboy', 'chef', 'viking', 'snack'];
const SNACK_PRICE = 15;
const FOUND_IN = {};
LV.forEach((L, i) => L.objs.forEach(o => { if (o.kind === 'treasure') FOUND_IN[o.outfit] = i; }));
const GOLD_TOTAL = LV.map(L => L.objs.filter(o => o.kind === 'gold' || o.kind === 'door').length);
const ALL_GOLD = GOLD_TOTAL.reduce((a, b) => a + b, 0);

const THEMES = {
  toilet:  { sky: '#a8dcff', top: '#e6f1ff', top2: '#b9dcfb', side: '#8fb3dc', floor: '#7cc2ee', wall: '#d2e6fb', trim: '#4fa8e8', plat: '#8fd0f7', water: '#4fb0ee',
             walker: 'tp', flyer: 'fly', swimmer: 'poop', dropper: 'plunger', spinner: 'fan', spike: 'plain', root: 262, tempo: 0.14 },
  pipes:   { sky: '#5a3c2a', top: '#e09656', top2: '#d0874a', side: '#8a4a20', floor: '#5a3a26', wall: '#6b4430', trim: '#c8743a', plat: '#f0aa6a', water: '#4a9ad0',
             walker: 'car', flyer: 'drip', swimmer: 'poop', dropper: 'plunger', spinner: 'fan', spike: 'lego', root: 294, tempo: 0.14 },
  sewer:   { sky: '#33452f', top: '#9a8a70', top2: '#8c7c64', side: '#5d5040', floor: '#4b5a3a', wall: '#4a3e33', trim: '#7f9a46', plat: '#a89878', water: '#4f8f78',
             walker: 'poop', flyer: 'fly', swimmer: 'gator', dropper: 'plunger', spinner: 'fan', spike: 'plain', root: 220, tempo: 0.15 },
  fans:    { sky: '#46506a', top: '#b0b9ca', top2: '#a1abbe', side: '#5d6578', floor: '#4d5568', wall: '#565f75', trim: '#ffcf3f', plat: '#c9d1de', water: '#4fa0e0',
             walker: 'dust', flyer: 'fly', swimmer: 'poop', dropper: 'press', spinner: 'fan', spike: 'grate', root: 247, tempo: 0.13 },
  plant:   { sky: '#2a7280', top: '#68cfc6', top2: '#58beb5', side: '#2a7a74', floor: '#1f5f6a', wall: '#22706c', trim: '#ffffff', plat: '#a8efe6', water: '#58c8f0',
             walker: 'bot', flyer: 'fly', swimmer: 'poop', dropper: 'press', spinner: 'paddle', spike: 'grate', root: 277, tempo: 0.14 },
  bigpipe: { sky: '#3a4b46', top: '#98ac9e', top2: '#899d8f', side: '#4c5a52', floor: '#3b4a44', wall: '#5e6c64', trim: '#c96f3a', plat: '#b0906a', water: '#3f8fc8',
             walker: 'crab', flyer: 'fly', swimmer: 'poop', dropper: 'press', spinner: 'fan', spike: 'plain', root: 330, tempo: 0.13 },
  ocean:   { sky: '#9fe2ff', top: '#f2d690', top2: '#e8ca7e', side: '#c9a85a', floor: '#e0c27a', wall: null, trim: '#ff8fb1', plat: '#8a6a4a', water: '#2c8fd6',
             walker: 'crab', flyer: 'gull', swimmer: 'fishy', dropper: 'press', spinner: 'fan', spike: 'urchin', root: 196, tempo: 0.17 },
};

// ------------------------------------------------------------------ save
const SAVE_KEY = 'poop-odyssey-3d-v1';
function freshSave() {
  return { started: false, unlocked: 1, golden: {}, owned: [], hat: null, face: null, corn: 0, size: 3, grow: 0, beaten: {}, won: false, muted: false, best: 0 };
}
let S = freshSave();
try { const raw = localStorage.getItem(SAVE_KEY); if (raw) S = Object.assign(freshSave(), JSON.parse(raw)); } catch (e) { /* private window */ }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
const owns = o => S.owned.includes(o);
const wearing = o => S.hat === o || S.face === o;
function goldIn(key) { let n = 0; for (const k in S.golden) if (k.startsWith(key + ':')) n++; return n; }
function wear(o) { const slot = OUTFITS[o].slot; S[slot] = S[slot] === o ? null : o; persist(); }

// ------------------------------------------------------------------ sound (all made up on the spot with WebAudio)
let AC = null, master, sfxBus, musicBus, noiseBuf;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
  master = AC.createGain(); master.gain.value = S.muted ? 0 : 1; master.connect(AC.destination);
  sfxBus = AC.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
  musicBus = AC.createGain(); musicBus.gain.value = 0.12; musicBus.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function tone(type, f0, f1, dur, vol, delay = 0, bus = sfxBus) {
  const t = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, type, f0, f1, delay = 0, q = 1) {
  const t = AC.currentTime + delay;
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.05);
}
const SFX = {
  fart() {
    const t = AC.currentTime, dur = 0.22 + Math.random() * 0.32, base = 65 + Math.random() * 60;
    const o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * 1.35, t); o.frequency.exponentialRampToValueAtTime(base * 0.7, t + dur);
    const lfo = AC.createOscillator(); lfo.frequency.value = 16 + Math.random() * 22;
    const lg = AC.createGain(); lg.gain.value = base * 0.4; lfo.connect(lg); lg.connect(o.frequency);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 450 + Math.random() * 450; f.Q.value = 5;
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.02);
    g.gain.setValueAtTime(0.55, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(sfxBus);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    noise(dur * 0.8, 0.12, 'lowpass', 500, 160);
  },
  squish() { noise(0.28, 0.55, 'bandpass', 1900, 220, 0, 3); tone('sine', 330, 70, 0.24, 0.35); },
  jump() { tone('square', 280, 560, 0.11, 0.06); },
  corn() { tone('triangle', 880, 1320, 0.07, 0.16); tone('triangle', 1320, 1760, 0.07, 0.1, 0.05); },
  golden() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone('triangle', f, 0, 0.22, 0.2, i * 0.08)); },
  fanfare() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone('square', f, 0, 0.16, 0.08, i * 0.1)); },
  grow() { [330, 440, 554, 660, 880].forEach((f, i) => tone('square', f, 0, 0.1, 0.07, i * 0.06)); },
  stomp() { tone('sine', 720, 110, 0.13, 0.32); noise(0.06, 0.15, 'highpass', 2500, 2000); },
  splash() { noise(0.4, 0.3, 'bandpass', 1100, 260, 0, 1.4); },
  blub() { tone('sine', 300, 700, 0.09, 0.12); },
  flush() { noise(2.2, 0.55, 'lowpass', 2600, 160, 0, 1); tone('sine', 220, 55, 2.0, 0.14); },
  pop() { tone('sine', 900, 1700, 0.07, 0.22); },
  quack() { tone('square', 620, 420, 0.13, 0.1); tone('square', 580, 380, 0.12, 0.08, 0.14); },
  nope() { tone('square', 220, 160, 0.14, 0.07); tone('square', 160, 110, 0.2, 0.07, 0.13); },
  buy() { [988, 1319].forEach((f, i) => tone('square', f, 0, 0.12, 0.08, i * 0.08)); },
  smash() { noise(0.3, 0.45, 'lowpass', 1400, 180); tone('square', 130, 55, 0.18, 0.1); },
  whoosh() { noise(0.7, 0.35, 'bandpass', 300, 2600, 0, 2); },
  blip() { tone('square', 700, 0, 0.05, 0.05); },
  thud() { tone('sine', 140, 50, 0.18, 0.3); noise(0.12, 0.2, 'lowpass', 600, 100); },
};
function sfx(n) { if (!AC || S.muted) return; try { SFX[n](); } catch (e) { /* ignore */ } }
function toggleMute() {
  S.muted = !S.muted; persist();
  if (master) master.gain.value = S.muted ? 0 : 1;
  $('#sndpath').setAttribute('d', S.muted ? 'M4 9h4l5-4v14l-5-4H4z M16 9l5 6 M21 9l-5 6' : 'M4 9h4l5-4v14l-5-4H4z M16 8c2 2 2 6 0 8 M19 5c4 4 4 10 0 14');
  const b = document.querySelector('#pause [data-act="sound"]'); if (b) b.textContent = S.muted ? 'Sound: OFF' : 'Sound: ON';
}
const MEL = [0, null, 4, null, 7, null, 4, null, 9, null, 7, 4, 5, null, 2, null, 0, null, 4, 7, 12, null, 11, null, 9, null, 7, null, 5, 4, 2, null];
const BASS = [0, null, null, null, 7, null, null, null, 5, null, null, null, 7, null, 2, null];
let musicNext = 0, musicStep = 0, musicRoot = 262, musicTempo = 0.14;
function musicTick() {
  if (!AC || S.muted) return;
  while (musicNext < AC.currentTime + 0.25) {
    if (musicNext < AC.currentTime) musicNext = AC.currentTime + 0.05;
    const m = MEL[musicStep % 32], b = BASS[musicStep % 16];
    const at = musicNext - AC.currentTime;
    if (m !== null) tone('square', musicRoot * Math.pow(2, m / 12), 0, musicTempo * 0.9, 0.05, at, musicBus);
    if (b !== null) tone('triangle', musicRoot / 2 * Math.pow(2, b / 12), 0, musicTempo * 1.8, 0.12, at, musicBus);
    musicNext += musicTempo; musicStep++;
  }
}

// ------------------------------------------------------------------ input
const keys = {}, hit = {};
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', Enter: 'ok', NumpadEnter: 'ok', Escape: 'esc', KeyP: 'esc', KeyC: 'closet', KeyM: 'mute', KeyQ: 'camL', KeyE: 'camR',
  KeyX: 'out', KeyZ: 'out', ShiftLeft: 'out', ShiftRight: 'out' };
addEventListener('keydown', e => {
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault(); audioInit();
  if (!keys[k]) hit[k] = true;
  keys[k] = true;
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('pointerdown', audioInit);
const joy = { x: 0, y: 0, id: null };
if (isTouch) { $('#touch').hidden = false; document.body.classList.add('has-touch'); }
(function setupTouch() {
  const pad = $('#joy'), knob = $('#knob');
  const upd = e => {
    const r = pad.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    joy.x = x; joy.y = y; knob.style.transform = `translate(${x * 38}px,${y * 38}px)`;
  };
  pad.addEventListener('pointerdown', e => { joy.id = e.pointerId; pad.setPointerCapture(e.pointerId); upd(e); e.preventDefault(); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === joy.id) upd(e); });
  const end = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  for (const [id, k] of [['#tJump', 'jump'], ['#tOut', 'out']]) {
    const b = $(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); if (!keys[k]) hit[k] = true; keys[k] = true; b.classList.add('on'); });
    const up = () => { keys[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  }
  // drag anywhere else to turn the camera
  let drag = null;
  holder.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX }; });
  addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) { camYawDrag -= (e.clientX - drag.x) * 0.008; drag.x = e.clientX; } });
  addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) drag = null; });
})();
let camYawDrag = 0;

// ------------------------------------------------------------------ little pictures for the menus (rendered once with a second renderer)
const TR = (() => {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(160, 160);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight('#ffffff', '#ffcf9a', 0.95));
  const l = new THREE.DirectionalLight('#ffffff', 0.6); l.position.set(3, 5, 6); sc.add(l);
  return { r, sc, cam: new THREE.PerspectiveCamera(30, 1, 0.01, 100) };
})();
const thumbCache = {};
function thumb(key, build, size = 160, look = { y: 0.6, d: 3.4, h: 0.6 }) {
  if (thumbCache[key]) return thumbCache[key];
  const o = build();
  TR.r.setSize(size, size); TR.sc.add(o);
  TR.cam.position.set(look.d * 0.32, look.y + look.h, look.d); TR.cam.lookAt(0, look.y, 0);
  TR.r.render(TR.sc, TR.cam);
  const url = TR.r.domElement.toDataURL();
  TR.sc.remove(o);
  return (thumbCache[key] = url);
}
function poopThumb(hat, face, size = 160) {
  return thumb(`poop:${hat}:${face}:${size}`, () => { const p = A.makePoop(); A.setOutfit(p, hat, face); p.rotation.y = 0.35; return p; }, size, { y: 0.62, d: 3.5, h: 0.5 });
}
const ICON = {};
function buildIcons() {
  ICON.corn = thumb('corn', () => { const c = A.makeCorn(); c.rotation.z = 0.3; return c; }, 64, { y: 0, d: 1.6, h: 0.1 });
  ICON.gold = thumb('gold', () => { const g = A.makeGold(); g.remove(g.userData.glow); g.rotation.z = 0.25; return g; }, 64, { y: 0.1, d: 2.6, h: 0.1 });
  ICON.rat = thumb('rat', () => { const r = A.makeRat(); r.rotation.y = 0.2; return r; }, 200, { y: 0.9, d: 4.4, h: 0.2 });
  ICON.poop = poopThumb(null, null, 64);
  $('#goldicon').src = ICON.gold; $('#cornicon').src = ICON.corn; $('#shopcorn').src = ICON.corn; $('#ratimg').src = ICON.rat;
  const sb = $('#sizebox'); sb.innerHTML = '';
  for (let i = 0; i < 6; i++) { const im = document.createElement('img'); im.src = ICON.poop; im.width = im.height = 16 + i * 3.5; sb.appendChild(im); }
  const gb = document.createElement('div'); gb.id = 'growbar'; for (let i = 0; i < 5; i++) gb.appendChild(document.createElement('i')); sb.appendChild(gb);
}

// ------------------------------------------------------------------ DOM helpers
let toastT = 0, msgT = 0, msgText = '';
function banner(text, sub, secs = 3.2) {
  const t = $('#toast'); t.innerHTML = ''; t.append(text);
  if (sub) { const s = document.createElement('small'); s.textContent = sub; t.appendChild(s); }
  t.hidden = false; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); toastT = secs;
}
function say(text, secs = 4) { msgText = text; msgT = secs; }
const floaters = [];
function floatText(text, pos, color) {
  const el = document.createElement('div'); el.className = 'fl'; el.textContent = text; if (color) el.style.color = color;
  $('#floaters').appendChild(el); floaters.push({ el, pos: pos.clone(), t: 1.1 });
}
function clearFloaters() { for (const f of floaters) f.el.remove(); floaters.length = 0; }
function updateFloaters(dt) {
  const v = new THREE.Vector3(), w = innerWidth, h = innerHeight;
  for (const f of floaters) {
    f.t -= dt; f.pos.y += dt * 1.4;
    v.copy(f.pos).project(camera);
    f.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`;
    f.el.style.opacity = Math.min(1, f.t * 3);
    if (f.t <= 0 || v.z > 1) f.el.remove();
  }
  for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].t <= 0) floaters.splice(i, 1);
}
let hudCache = '';
function updateHUD() {
  if (!G) return;
  const got = goldIn(G.L.key);
  const key = [G.L.name, got, S.corn, S.size, S.grow].join('|');
  if (key === hudCache) return;
  hudCache = key;
  $('#kname').textContent = G.L.name.toUpperCase();
  $('#goldpill').lastChild.textContent = ` ${got}/${GOLD_TOTAL[G.i]}`;
  $('#cornpill').lastChild.textContent = ` ${S.corn}`;
  const imgs = $('#sizebox').querySelectorAll('img');
  imgs.forEach((im, i) => im.classList.toggle('off', i >= S.size));
  $('#growbar').querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i < S.grow));
  $('#growbar').style.visibility = S.size >= 6 ? 'hidden' : 'visible';
}
function showOnly(ids) {
  for (const id of ['#title', '#intro', '#mapui', '#shop', '#closet', '#pause', '#ending', '#hud']) $(id).hidden = !ids.includes(id);
  $('#touch').hidden = !(isTouch && ids.includes('#hud'));
}

// generic keyboard menus
let menuSel = 0;
function menuButtons(el) { return el ? [...el.querySelectorAll('.mbtn')].filter(b => !b.disabled && b.offsetParent !== null) : []; }
function markSel(el) { menuButtons(el).forEach((b, i) => b.classList.toggle('sel', i === menuSel)); }
function menuNav(el) {
  const bs = menuButtons(el); if (!bs.length) return;
  const cols = +(el.dataset.cols || 1);
  let s = menuSel;
  if (cols > 1) { if (hit.left) s--; if (hit.right) s++; if (hit.up) s -= cols; if (hit.down) s += cols; }
  else { if (hit.up || hit.left) s--; if (hit.down || hit.right) s++; }
  s = clamp(s, 0, bs.length - 1);
  if (s !== menuSel) { menuSel = s; sfx('blip'); onMenuMove(el); }
  markSel(el);
  if (hit.jump || hit.ok) bs[menuSel].click();
}
function onMenuMove(el) { if (el.id === 'closetgrid') closetInfo(); }

// ------------------------------------------------------------------ game state
let state = 'title', overlay = null, G = null, P = null;
let camYaw = 0, camDist = 9, camPitch = 0.42;
const tmpV = new THREE.Vector3();

// ------------------------------------------------------------------ building a kingdom
function cellOf(x, z) { return [Math.floor(x / CS), Math.floor(z / CS)]; }
function top(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= G.W || cz >= G.D) return 1e6;
  return G.h[cz][cx];
}
function ctype(cx, cz) { return (cx < 0 || cz < 0 || cx >= G.W || cz >= G.D) ? '#' : G.t[cz][cx]; }
function wlAt(cx, cz) { return (cx < 0 || cz < 0 || cx >= G.W || cz >= G.D) ? null : G.wl[cz][cx]; }
function wpos(o, dy = 0) {
  const cx = Math.floor(o.x), cz = Math.floor(o.z);
  const y = o.y !== undefined ? o.y : G.h[cz][cx];
  return new THREE.Vector3((o.x + 0.5) * CS, y + dy, (o.z + 0.5) * CS);
}

function startLevel(i) {
  const L = LV[i], th = THEMES[L.key];
  newWorld();
  G = { i, L, th, W: L.W, D: L.D, t: 0, h: L.h.map(r => r.slice()), t2: null, wl: L.wl, items: [], ents: [], caps: [], plats: [], doors: [], signs: [],
        parts: [], cracks: {}, exit: null, shop: null, exiting: 0, winds: L.winds, lift: {}, cur: {}, below: {}, zone: null };
  G.t = L.t.map(r => r.split(''));
  for (const [x, z, v] of L.lift) G.lift[x + ',' + z] = v;
  for (const [x, z, dx, dz] of L.cur) G.cur[x + ',' + z] = [dx, dz];
  for (const [x, z, v] of L.below) G.below[x + ',' + z] = v;
  G.time = 0;
  scene.background = new THREE.Color(th.sky);
  scene.fog = new THREE.Fog(th.sky, 34, 120);
  buildTerrain(); buildWater(); buildWalls(); buildDeco();
  for (const p of L.plats) addPlat(p);
  for (const o of L.objs) spawn(o);
  // the player
  P = makePlayer(G.start);
  camYaw = 0; camDist = 9;
  placeCamera(1);
  state = 'play'; overlay = null;
  showOnly(['#hud']); hudCache = '';
  musicRoot = th.root; musicTempo = th.tempo;
  S.started = true; persist();
  say(L.final ? 'The ocean! Swim around, then walk to the beach umbrella.' : `Welcome to the ${L.name}! Find ${L.needed} Golden Corn to open the exit pipe.`, 4);
}

function buildTerrain() {
  const th = G.th, pos = [], col = [], nor = [], uv = [];
  const cTop = new THREE.Color(th.top), cTop2 = new THREE.Color(th.top2), cSide = new THREE.Color(th.side), cFloor = new THREE.Color(th.floor);
  const cSpike = new THREE.Color(th.side), cFan = new THREE.Color('#3a4152');
  const c = new THREE.Color();
  const quad = (a, b, cc, d, n, c1, c2) => {
    for (const p of [a, b, cc, a, cc, d]) pos.push(p[0], p[1], p[2]);
    uv.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
    for (let i = 0; i < 6; i++) nor.push(n[0], n[1], n[2]);
    const cs = [c1, c1, c2 || c1, c1, c2 || c1, c2 || c1];
    for (const k of [0, 1, 2, 0, 2, 3]) { const cc2 = k === 2 || k === 3 ? (c2 || c1) : c1; col.push(cc2.r, cc2.g, cc2.b); }
  };
  const rH = (x, z) => {
    if (x < 0 || z < 0 || x >= G.W || z >= G.D) return -1e3;
    return G.t[z][x] === 'C' ? G.below[x + ',' + z] : G.h[z][x];
  };
  for (let z = 0; z < G.D; z++) for (let x = 0; x < G.W; x++) {
    const h = rH(x, z), t = G.t[z][x];
    const x0 = x * CS, x1 = x0 + CS, z0 = z * CS, z1 = z0 + CS;
    if (t === 'w' || t === 'g') c.copy(cFloor);
    else if (t === '^') c.copy(cSpike);
    else if (t === 'A') c.copy(cFan);
    else { c.copy((x + z) % 2 ? cTop : cTop2); if (h > 0.5) c.offsetHSL(0, 0, Math.min(0.06, h * 0.008)); }
    quad([x0, h, z0], [x0, h, z1], [x1, h, z1], [x1, h, z0], [0, 1, 0], c.clone());
    for (const [dx, dz, n] of [[1, 0, [1, 0, 0]], [-1, 0, [-1, 0, 0]], [0, 1, [0, 0, 1]], [0, -1, [0, 0, -1]]]) {
      let nh = rH(x + dx, z + dz);
      if (nh <= -1e3) nh = Math.min(h, -14);
      if (nh >= h) continue;
      const lo = new THREE.Color(th.side).multiplyScalar(0.72), hi = new THREE.Color(th.side);
      if (t === 'w' || t === 'g') { hi.copy(cFloor); lo.copy(cFloor).multiplyScalar(0.8); }
      let a, b, cc, d;
      if (dx === 1) { a = [x1, h, z1]; b = [x1, nh, z1]; cc = [x1, nh, z0]; d = [x1, h, z0]; }
      else if (dx === -1) { a = [x0, h, z0]; b = [x0, nh, z0]; cc = [x0, nh, z1]; d = [x0, h, z1]; }
      else if (dz === 1) { a = [x0, h, z1]; b = [x0, nh, z1]; cc = [x1, nh, z1]; d = [x1, h, z1]; }
      else { a = [x1, h, z0]; b = [x1, nh, z0]; cc = [x0, nh, z0]; d = [x0, h, z0]; }
      // a,d are the top edge; b,c the bottom edge
      for (const p of [a, b, cc, a, cc, d]) pos.push(p[0], p[1], p[2]);
      const vh = (h - nh) / CS;
      uv.push(0, vh, 0, 0, 1, 0, 0, vh, 1, 0, 1, vh);
      for (let i = 0; i < 6; i++) nor.push(n[0], n[1], n[2]);
      for (const cc3 of [hi, lo, lo, hi, lo, hi]) col.push(cc3.r, cc3.g, cc3.b);
      // a bright toy-like rim along the top edge
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const kind = { toilet: 'tiles', pipes: 'plain', sewer: 'bricks', fans: 'plates', plant: 'tiles', bigpipe: 'plates', ocean: 'sand' }[G.L.key];
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: A.tileTex(kind) }));
  world.add(m); G.terrain = m;
  // cracked blocks are their own meshes so they can be smashed
  const crackMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(th.top).lerp(new THREE.Color('#c9a27a'), 0.35), map: A.TEX.crack });
  for (let z = 0; z < G.D; z++) for (let x = 0; x < G.W; x++) if (G.t[z][x] === 'C') {
    const b = G.below[x + ',' + z], h = G.h[z][x];
    const m2 = new THREE.Mesh(A.GEO.box, crackMat); m2.scale.set(CS - 0.04, h - b, CS - 0.04); m2.position.set((x + 0.5) * CS, (h + b) / 2, (z + 0.5) * CS);
    world.add(m2); G.cracks[x + ',' + z] = m2;
  }
  // spikes, fans
  for (let z = 0; z < G.D; z++) for (let x = 0; x < G.W; x++) {
    const t = G.t[z][x], h = G.h[z][x], cx = (x + 0.5) * CS, cz = (z + 0.5) * CS;
    if (t === '^') addSpikes(cx, h, cz, x);
    if (t === 'A') {
      const f = new THREE.Group(); f.position.set(cx, h + 0.05, cz);
      A.part('cyl', '#2b3140', 1.8, 0.1, 1.8, 0, 0, 0, f);
      const blades = new THREE.Group(); f.add(blades);
      for (let i = 0; i < 4; i++) { const bl = A.part('box', '#c1cad9', 0.8, 0.06, 0.3, 0.42, 0.08, 0, blades); bl.rotation.y = 0; const pv = new THREE.Group(); pv.rotation.y = i * Math.PI / 2; pv.add(bl); blades.add(pv); }
      A.part('cyl', '#ffcf3f', 0.3, 0.16, 0.3, 0, 0.1, 0, f);
      world.add(f); G.ents.push({ k: 'fanprop', blades });
      for (let i = 0; i < 3; i++) {
        const s = A.part('box', '#ffffff', 0.05, 0.9, 0.05, cx + rand(-0.7, 0.7), h + rand(0, 8), cz + rand(-0.7, 0.7), world, { transparent: true, opacity: 0.55 });
        G.ents.push({ k: 'streak', m: s, y0: h, y1: G.lift[x + ',' + z] + 0.5, v: [0, rand(5, 8), 0] });
      }
    }
  }
}
function addSpikes(cx, h, cz, x) {
  const kind = G.th.spike;
  if (kind === 'lego') {
    const colz = ['#e3242b', '#0a6cd6', '#ffcd03', '#2f9e44'];
    for (const [dx, dz] of [[-0.45, -0.45], [0.45, 0.45], [-0.45, 0.45], [0.45, -0.45]]) {
      const c = colz[(x + Math.round(dx * 2) + 4) % 4];
      A.part('box', c, 0.8, 0.38, 0.8, cx + dx, h + 0.19, cz + dz, world);
      for (const sx of [-0.2, 0.2]) for (const sz of [-0.2, 0.2]) A.part('cyl', c, 0.22, 0.14, 0.22, cx + dx + sx, h + 0.44, cz + dz + sz, world);
    }
  } else if (kind === 'grate') {
    A.part('box', '#5b6375', CS, 0.12, CS, cx, h + 0.06, cz, world);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) A.part('cone', '#d6dce6', 0.22, 0.55, 0.22, cx - 0.75 + i * 0.5, h + 0.38, cz - 0.75 + j * 0.5, world);
  } else if (kind === 'urchin') {
    A.part('sphLo', '#6a3a9a', 0.9, 0.7, 0.9, cx, h + 0.3, cz, world);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const s = A.part('cone', '#3b1f5a', 0.12, 0.7, 0.12, cx + Math.cos(a) * 0.4, h + 0.5, cz + Math.sin(a) * 0.4, world); s.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); }
  } else {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) A.part('cone', '#d0d4dc', 0.36, 0.6, 0.36, cx - 0.6 + i * 0.6, h + 0.3, cz - 0.6 + j * 0.6, world);
  }
}
function buildWater() {
  const groups = { w: [], g: [] }, uvs = { w: [], g: [] };
  for (let z = 0; z < G.D; z++) for (let x = 0; x < G.W; x++) {
    const t = G.t[z][x]; if (t !== 'w' && t !== 'g') continue;
    const y = G.wl[z][x], x0 = x * CS, x1 = x0 + CS, z0 = z * CS, z1 = z0 + CS;
    groups[t].push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
    uvs[t].push(x0 / 8, z0 / 8, x0 / 8, z1 / 8, x1 / 8, z1 / 8, x0 / 8, z0 / 8, x1 / 8, z1 / 8, x1 / 8, z0 / 8);
  }
  const mk = (arr, uv, m, y) => {
    if (!arr.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, m); mesh.position.y = y || 0; mesh.renderOrder = 3; world.add(mesh); return mesh;
  };
  const wm = new THREE.MeshLambertMaterial({ color: G.th.water, transparent: true, opacity: G.L.key === 'ocean' ? 0.45 : 0.6, depthWrite: false, side: THREE.DoubleSide });
  mk(groups.w, uvs.w, wm);
  G.ripple = A.TEX.ripple.clone(); G.ripple.needsUpdate = true;
  G.ripple.wrapS = G.ripple.wrapT = THREE.RepeatWrapping;
  mk(groups.w, uvs.w, new THREE.MeshBasicMaterial({ map: G.ripple, transparent: true, opacity: 0.55, depthWrite: false }), 0.03);
  const gm = new THREE.MeshLambertMaterial({ color: '#7ddc3a', emissive: '#2a5a00', transparent: true, opacity: 0.92, depthWrite: false });
  mk(groups.g, uvs.g, gm);
  if (groups.g.length) mk(groups.g, uvs.g, new THREE.MeshBasicMaterial({ map: G.ripple, transparent: true, opacity: 0.4, depthWrite: false, color: '#d8ff9a' }), 0.03);
  if (G.L.key === 'ocean') {
    // the sea goes on and on past the edge of the map
    const W = G.W * CS, D = G.D * CS, F = 300, sm = new THREE.MeshLambertMaterial({ color: G.th.water });
    for (const [x, z, w, d] of [[W / 2, -F / 2, W + 2 * F, F], [W / 2, D + F / 2, W + 2 * F, F], [-F / 2, D / 2, F, D], [W + F / 2, D / 2, F, D]]) {
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sm); sea.rotation.x = -Math.PI / 2; sea.position.set(x, 0, z); world.add(sea);
    }
  }
}
function buildWalls() {
  // a low toy-box rim around the kingdom, so the camera can always see over it
  let maxH = 0; for (const r of G.h) for (const v of r) maxH = Math.max(maxH, v);
  G.wallH = maxH + 2.5;
  const th = G.th; if (!th.wall) return;
  const W = G.W * CS, D = G.D * CS, H = G.wallH, T = 2;
  const m = A.mat(th.wall), tm = A.mat(th.trim);
  for (const [x, z, w, d] of [[W / 2, -T / 2, W + T * 2, T], [W / 2, D + T / 2, W + T * 2, T], [-T / 2, D / 2, T, D], [W + T / 2, D / 2, T, D]]) {
    const b = new THREE.Mesh(A.GEO.box, m); b.scale.set(w, H + 30, d); b.position.set(x, (H - 30) / 2, z); world.add(b);
    const r = new THREE.Mesh(A.GEO.box, tm); r.scale.set(w + 0.3, 0.6, d + 0.3); r.position.set(x, H, z); world.add(r);
  }
  const base = new THREE.Mesh(A.GEO.box, A.mat(th.side)); base.scale.set(W + 600, 1, D + 600); base.position.set(W / 2, -30, D / 2); world.add(base);
}
function buildDeco() {
  const key = G.L.key, W = G.W * CS, D = G.D * CS, H = G.L.ceil;
  const deco = new THREE.Group(); world.add(deco); G.deco = deco;
  const spinners = [];
  if (key === 'toilet') {
    for (let i = 0; i < 9; i++) { const b = A.part('sph', '#e6f7ff', rand(0.8, 1.8), 0, 0, rand(4, W - 4), rand(H + 2, H + 8), rand(4, D - 4), deco, { transparent: true, opacity: 0.3 }); b.scale.y = b.scale.z = b.scale.x; G.ents.push({ k: 'floaty', m: b, y0: b.position.y, ph: rand(0, 6) }); }
    const brush = new THREE.Group(); A.part('box', '#ff8fb1', 1, 14, 1, 0, 7, 0, brush); A.part('box', '#ffffff', 1.4, 3, 1.6, 0, 14.5, 0.6, brush); brush.position.set(W - 3, 0, D * 0.6); brush.rotation.z = 0.25; deco.add(brush);
    const soap = A.part('box', '#ffd6f0', 6, 2.4, 4, 4, 1.2, D - 5, deco); soap.rotation.y = 0.3;
    G.plats.push({ x0: 1, x1: 7, z0: D - 7, z1: D - 3, y0: 0, y1: 2.4, solid: true, deco: true });
  } else if (key === 'pipes' || key === 'bigpipe') {
    const c = key === 'pipes' ? '#c8743a' : '#6f7d74';
    for (let i = 0; i < (key === 'pipes' ? 5 : 9); i++) {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(key === 'pipes' ? W / 2 + 1 : W / 2 + 2, 0.9, 10, 40, Math.PI), A.mat(c));
      tor.position.set(W / 2, key === 'pipes' ? H - 2 : 0, (i + 0.5) * D / (key === 'pipes' ? 5 : 9)); deco.add(tor);
    }
    for (let i = 0; i < 6; i++) { const p = A.part('cyl', c, 1.4, H + 6, 1.4, i % 2 ? 1.2 : W - 1.2, H / 2, 6 + i * (D - 12) / 5, deco); }
  } else if (key === 'sewer') {
    for (let i = 0; i < 6; i++) {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(W / 2 + 1, 1.2, 8, 30, Math.PI), A.mat('#6b5a48'));
      tor.position.set(W / 2, H - 4, (i + 0.5) * D / 6); deco.add(tor);
    }
  } else if (key === 'fans') {
    for (const [x, z, ry] of [[W / 2, 0.2, 0], [0.2, D / 2, Math.PI / 2], [W - 0.2, D / 2, -Math.PI / 2]]) {
      const f = new THREE.Group(); f.position.set(x, H - 1, z); f.rotation.y = ry; deco.add(f);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.5, 8, 30), A.mat('#7b8496')); f.add(ring);
      const bl = new THREE.Group(); f.add(bl);
      for (let i = 0; i < 4; i++) { const b = A.part('box', '#c1cad9', 1.8, 5.6, 0.2, 0, 2.8, 0, null); const pv = new THREE.Group(); pv.rotation.z = i * Math.PI / 2; pv.add(b); bl.add(pv); }
      A.part('cyl', '#ffcf3f', 1.2, 0.6, 1.2, 0, 0, 0.2, f).rotation.x = Math.PI / 2;
      spinners.push(bl);
    }
  } else if (key === 'plant') {
    for (const [x, z] of [[-6, D * 0.3], [-6, D * 0.7], [W + 6, D * 0.3], [W + 6, D * 0.7], [W * 0.3, -6], [W * 0.7, -6]]) {
      A.part('cyl', '#9fe8df', 9, H + 8, 9, x, (H + 8) / 2, z, deco);
      A.part('cyl', '#ffffff', 9.4, 0.8, 9.4, x, H + 8, z, deco);
    }
    for (let i = 0; i < 4; i++) { const p = A.part('cyl', '#ffffff', 0.8, W, 0.8, W / 2, H - 1 - i * 0.2, 10 + i * 15, deco); p.rotation.z = Math.PI / 2; }
  } else if (key === 'ocean') {
    for (let i = 0; i < 8; i++) { const c = A.makeCloud(); c.position.set(rand(-30, W + 30), rand(16, 26), rand(-30, D + 30)); c.scale.setScalar(rand(0.8, 1.6)); deco.add(c); G.ents.push({ k: 'cloud', m: c }); }
    const sunS = A.sprite(A.TEX.glow, 30, 30); sunS.position.set(W + 40, 40, -40); deco.add(sunS);
    const palm = A.makePalm(5); palm.position.set(38 * CS, 1, 1.5 * CS); deco.add(palm);
    const palm2 = A.makePalm(4); palm2.position.set(31 * CS, 1, 1 * CS); deco.add(palm2);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rand(0, G.W)), z = Math.floor(rand(8, G.D));
      if (G.t[z][x] !== 'w') continue;
      const h = G.h[z][x], sw = new THREE.Group(); sw.position.set((x + rand(0.2, 0.8)) * CS, h, (z + rand(0.2, 0.8)) * CS);
      const len = rand(2, 5); A.part('box', ['#2fae6b', '#3fc27a', '#1f8f55'][i % 3], 0.3, len, 0.12, 0, len / 2, 0, sw); deco.add(sw);
      G.ents.push({ k: 'kelp', m: sw, ph: rand(0, 6) });
    }
    for (let i = 0; i < 16; i++) { const x = Math.floor(rand(0, G.W)), z = Math.floor(rand(10, G.D)); if (G.t[z][x] !== 'w') continue; A.part('sphLo', ['#ff8fb1', '#ffb36b', '#c08aff'][i % 3], rand(0.8, 1.8), rand(0.8, 2.4), rand(0.8, 1.8), (x + 0.5) * CS, G.h[z][x] + 0.6, (z + 0.5) * CS, deco); }
  }
  G.decoSpin = spinners;
}
function addPlat(p) {
  const x0 = p.x * CS, z0 = p.z * CS, x1 = (p.x + p.w) * CS, z1 = (p.z + p.d) * CS, y1 = p.y, y0 = p.y - 0.6;
  let mesh;
  if (p.ghost) {
    mesh = new THREE.Mesh(A.GEO.box, new THREE.MeshLambertMaterial({ map: A.TEX.ghost, transparent: true, opacity: 0.4, depthWrite: false, color: '#ffffff' }));
  } else mesh = new THREE.Mesh(A.GEO.box, A.mat(p.color || G.th.plat));
  mesh.scale.set(x1 - x0 - 0.04, y1 - y0, z1 - z0 - 0.04); mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  world.add(mesh);
  if (!p.ghost) {
    const rim = new THREE.Mesh(A.GEO.box, A.mat(new THREE.Color(p.color || G.th.plat).offsetHSL(0, 0, 0.08).getStyle()));
    rim.scale.set(x1 - x0, 0.12, z1 - z0); rim.position.set((x0 + x1) / 2, y1 - 0.04, (z0 + z1) / 2); world.add(rim);
  }
  const plat = { x0, x1, z0, z1, y0, y1, ghost: p.ghost, mesh, solid: true };
  G.plats.push(plat);
  return plat;
}

// ------------------------------------------------------------------ objects
function spawn(o) {
  const th = G.th, L = G.L;
  const p = wpos(o);
  const cx = Math.floor(o.x), cz = Math.floor(o.z);
  switch (o.kind) {
    case 'start': G.start = p; break;
    case 'corn': {
      if (o.y === undefined) p.y += 0.7;
      const m = A.makeCorn(); m.position.copy(p); world.add(m);
      G.items.push({ k: 'corn', m, p, ph: rand(0, 6) }); break;
    }
    case 'gold': {
      if (o.y === undefined) p.y += 1.0;
      const id = `${L.key}:${o.x},${o.z}`, got = !!S.golden[id];
      const m = A.makeGold(got); m.position.copy(p); world.add(m);
      G.items.push({ k: 'gold', m, p, id, got, ph: rand(0, 6) }); break;
    }
    case 'treasure': {
      if (owns(o.outfit)) break;
      const m = A.makePresent(); m.position.copy(p); world.add(m);
      const gl = A.sprite(A.TEX.glow, 3, 3); gl.material.color.set('#ffb3e6'); gl.position.y = 0.5; m.add(gl);
      G.items.push({ k: 'treasure', m, p, outfit: o.outfit, ph: 0 }); break;
    }
    case 'sign': {
      const m = A.makeSign(); m.position.copy(p); world.add(m);
      G.signs.push({ p, text: o.text }); break;
    }
    case 'door': {
      const id = `${L.key}:door`;
      const tex = new THREE.TextureLoader().load(poopThumb(OUTFITS[o.outfit].slot === 'hat' ? o.outfit : null, OUTFITS[o.outfit].slot === 'face' ? o.outfit : null, 160));
      const m = A.makeDoor(tex); m.position.copy(p); world.add(m);
      const d = { p, outfit: o.outfit, id, open: !!S.golden[id], m };
      if (d.open) openDoorLook(d);
      G.doors.push(d);
      G.plats.push({ x0: p.x - 0.85, x1: p.x + 0.85, z0: p.z - 0.25, z1: p.z + 0.25, y0: p.y - 5, y1: p.y + 2.5, solid: true });
      break;
    }
    case 'shop': {
      const m = A.makeShop(); m.position.copy(p); world.add(m);
      G.shop = { p, m };
      G.plats.push({ x0: p.x - 1.3, x1: p.x + 1.3, z0: p.z + 0.1, z1: p.z + 1.1, y0: p.y - 5, y1: p.y + 1.1, solid: true });
      G.plats.push({ x0: p.x - 1.4, x1: p.x + 1.4, z0: p.z - 0.8, z1: p.z + 0.1, y0: p.y - 5, y1: p.y + 2.8, solid: true });
      break;
    }
    case 'exit': {
      const m = A.makeExit(L.final); m.position.copy(p); world.add(m);
      G.exit = { p, m };
      if (!L.final) G.exit.plat = G.plats[G.plats.push({ x0: p.x - 1.05, x1: p.x + 1.05, z0: p.z - 1.05, z1: p.z + 1.05, y0: p.y - 5, y1: p.y + 1.8, solid: true }) - 1];
      updateExitLabel(); break;
    }
    case 'walker': {
      const m = A.makeEnemy(th.walker); m.position.copy(p); world.add(m);
      G.ents.push({ k: 'walker', skin: th.walker, m, x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, r: 0.45, hgt: 0.9, home: p.clone(), yaw: rand(0, 6), turnT: 0, stomp: true });
      break;
    }
    case 'flyer': {
      if (th.flyer === 'drip') {
        const m = A.makeEnemy('drip'); world.add(m);
        const sh = shadowBlob(0.8); world.add(sh);
        G.ents.push({ k: 'drip', m, sh, x: p.x, z: p.z, y0: G.L.ceil - 1, y: G.L.ceil - 1, g: p.y, vy: 0, wait: rand(0, 2), r: 0.3, hgt: 0.6 });
      } else {
        const m = A.makeEnemy(th.flyer); world.add(m);
        const y0 = o.y !== undefined ? o.y : p.y + 2.5;
        G.ents.push({ k: 'flyer', m, cx: p.x, cz: p.z, y0, x: p.x, y: y0, z: p.z, a: rand(0, 6), rad: 2.6, r: 0.5, hgt: 0.6, stomp: true, sh: worldShadow() });
      }
      break;
    }
    case 'dropper': {
      const m = A.makeEnemy(th.dropper); world.add(m);
      const y0 = p.y + 5.5; m.position.set(p.x, y0, p.z);
      const sh = shadowBlob(1.4); sh.position.set(p.x, p.y + 0.03, p.z); world.add(sh);
      G.ents.push({ k: 'drop', m, sh, x: p.x, z: p.z, g: p.y, y0, y: y0, vy: 0, st: 'wait', tm: 0, r: 0.6 });
      break;
    }
    case 'spinner': {
      const y = (o.y !== undefined ? o.y : p.y) + 0.6, R = (o.r || 3) * CS * 0.5 + 0.6;
      const m = A.makeEnemy(th.spinner); m.position.set(p.x, y, p.z); world.add(m);
      const bar = A.makeSpinBar(th.spinner, R); m.add(bar);
      G.ents.push({ k: 'spin', m, bar, x: p.x, y, z: p.z, a: rand(0, 6), R, sp: 1.1 });
      break;
    }
    case 'swimmer': case 'shark': case 'jelly': {
      const skin = o.kind === 'shark' ? 'shark' : o.kind === 'jelly' ? 'jelly' : th.swimmer === 'fishy' ? 'gator' : th.swimmer;
      const m = A.makeEnemy(skin === 'poop' ? 'poop' : skin); world.add(m);
      const y = o.y !== undefined ? o.y : (G.wl[cz][cx] || 0) - 1.2;
      const big = o.kind === 'shark';
      G.ents.push({ k: o.kind === 'jelly' ? 'jelly' : 'swim', skin, m, cx: p.x, cz: p.z, y0: y, x: p.x, y, z: p.z, a: rand(0, 6), rad: big ? 6 : 3, sp: big ? 0.35 : 0.55, r: big ? 1.4 : 0.6, hgt: big ? 1.2 : 0.7 });
      break;
    }
    case 'duck': case 'bubble': case 'roll': case 'fish': {
      const m = A.makeCapture(o.kind); world.add(m);
      const c = { type: o.kind, m, home: p.clone(), x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, r: o.kind === 'bubble' ? 0.9 : 0.6, hgt: o.kind === 'bubble' ? 1.8 : 1.0, hidden: false, back: 0, yaw: 0 };
      if (o.kind === 'duck' && G.wl[cz][cx] !== null) c.y = G.wl[cz][cx] - 0.35;
      G.caps.push(c); break;
    }
  }
}
function shadowBlob(s) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: A.TEX.shadow, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(s, s, 1); m.renderOrder = 1;
  return m;
}
function worldShadow() { const s = shadowBlob(1); world.add(s); return s; }
function openDoorLook(d) { d.m.userData.door.material = A.mat('#ffe066'); d.m.userData.top.material = A.mat('#ffe066'); }
function updateExitLabel() {
  if (!G.exit) return;
  const got = goldIn(G.L.key), open = got >= G.L.needed || S.beaten[G.L.key];
  A.setLabel(G.exit.m.userData.label, open ? (G.L.final ? 'BEACH!' : 'GO!') : `${got}/${G.L.needed}`, open ? '#9cff7a' : '#ffffff');
}

// ------------------------------------------------------------------ player
const STEP = 0.45, GRAV = 32, JUMP = 12, FART = 10, SPEED = 6.5;
function pScale() { return 0.8 + (S.size - 1) * 0.1; }
function makePlayer(at) {
  const m = A.makePoop(); A.setOutfit(m, S.hat, S.face); world.add(m);
  const p = { m, x: at.x, y: at.y, z: at.z, vx: 0, vy: 0, vz: 0, r: 0.4, hgt: 1, yaw: Math.PI, onGround: false, canFart: true, inv: 0, mode: 'poop', cap: null, capCool: 0,
              coyote: 0, jbuf: 0, sq: 0, blink: 2, sh: shadowBlob(1), swim: false, capM: null };
  world.add(p.sh);
  sizePlayer(p);
  return p;
}
function sizePlayer(p) {
  if (p.mode === 'poop') { const s = pScale(); p.r = 0.4 * s; p.hgt = 1.0 * s; }
  else { p.r = p.cap.r; p.hgt = p.cap.hgt; }
}
function moveInput() {
  let f = 0, s = 0;
  if (keys.up) f += 1; if (keys.down) f -= 1; if (keys.right) s += 1; if (keys.left) s -= 1;
  if (joy.id !== null) { f -= joy.y; s += joy.x; }
  const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  return { x: fx * f + rx * s, z: fz * f + rz * s, f, s, mag: Math.min(1, Math.hypot(f, s)) };
}

// collision against the cell columns and the platforms
function solidPlat(pl) { return pl.solid && (!pl.ghost || S.face === 'goggles'); }
function blockedCell(cx, cz, b, o) {
  const t = top(cx, cz);
  if (t <= b.y + STEP) return false;
  if (o.breakC && ctype(cx, cz) === 'C') { smash(cx, cz); return false; }
  return true;
}
function sweep(b, nx, nz, axis, o) {
  const r = b.r;
  const x0 = Math.floor((nx - r) / CS), x1 = Math.floor((nx + r - 1e-4) / CS), z0 = Math.floor((nz - r) / CS), z1 = Math.floor((nz + r - 1e-4) / CS);
  let v = axis === 'x' ? nx : nz;
  const moving = axis === 'x' ? nx - b.x : nz - b.z;
  for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
    if (!blockedCell(cx, cz, b, o)) continue;
    b.hitWall = true;
    if (axis === 'x') v = moving > 0 ? Math.min(v, cx * CS - r - 1e-3) : Math.max(v, (cx + 1) * CS + r + 1e-3);
    else v = moving > 0 ? Math.min(v, cz * CS - r - 1e-3) : Math.max(v, (cz + 1) * CS + r + 1e-3);
  }
  for (const pl of G.plats) {
    if (!solidPlat(pl)) continue;
    if (!(pl.y1 > b.y + STEP && pl.y0 < b.y + b.hgt)) continue;
    const ax = axis === 'x' ? v : nx, az = axis === 'z' ? v : nz;
    if (ax + r <= pl.x0 || ax - r >= pl.x1 || az + r <= pl.z0 || az - r >= pl.z1) continue;
    b.hitWall = true;
    if (axis === 'x') v = moving > 0 ? Math.min(v, pl.x0 - r - 1e-3) : Math.max(v, pl.x1 + r + 1e-3);
    else v = moving > 0 ? Math.min(v, pl.z0 - r - 1e-3) : Math.max(v, pl.z1 + r + 1e-3);
  }
  return v;
}
function support(x, z, r, maxY) {
  let best = -1e6, cell = null, plat = null;
  const x0 = Math.floor((x - r) / CS), x1 = Math.floor((x + r) / CS), z0 = Math.floor((z - r) / CS), z1 = Math.floor((z + r) / CS);
  for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
    const t = top(cx, cz);
    if (t <= maxY && t > best) { best = t; cell = [cx, cz]; }
  }
  for (const pl of G.plats) {
    if (!solidPlat(pl) || pl.y1 > maxY || pl.y1 <= best) continue;
    if (x + r <= pl.x0 || x - r >= pl.x1 || z + r <= pl.z0 || z - r >= pl.z1) continue;
    best = pl.y1; plat = pl; cell = null;
  }
  return { y: best, cell, plat };
}
function moveBody(b, dt, o = {}) {
  b.hitWall = false; b.hitHead = false;
  const nx = sweep(b, b.x + b.vx * dt, b.z, 'x', o);
  if (nx !== b.x + b.vx * dt) b.vx = 0;
  b.x = nx;
  const nz = sweep(b, b.x, b.z + b.vz * dt, 'z', o);
  if (nz !== b.z + b.vz * dt) b.vz = 0;
  b.z = nz;
  const prevY = b.y;
  let ny = b.y + b.vy * dt;
  const sup = support(b.x, b.z, b.r * 0.8, prevY + STEP);
  b.onGround = false; b.supCell = null; b.supPlat = null;
  if (ny <= sup.y + 0.001) { ny = sup.y; if (b.vy < 0) b.vy = 0; b.onGround = true; b.supCell = sup.cell; b.supPlat = sup.plat; }
  if (b.vy > 0) {
    for (const pl of G.plats) {
      if (!solidPlat(pl) || pl.y0 < prevY + b.hgt - 0.05) continue;
      if (b.x + b.r * 0.8 <= pl.x0 || b.x - b.r * 0.8 >= pl.x1 || b.z + b.r * 0.8 <= pl.z0 || b.z - b.r * 0.8 >= pl.z1) continue;
      if (ny + b.hgt > pl.y0) { ny = pl.y0 - b.hgt; b.vy = 0; b.hitHead = true; }
    }
  }
  b.y = ny;
}
function smash(cx, cz) {
  const k = cx + ',' + cz;
  if (ctype(cx, cz) !== 'C') return;
  G.t[cz][cx] = '.'; G.h[cz][cx] = G.below[k];
  const m = G.cracks[k];
  if (m) {
    world.remove(m);
    for (let i = 0; i < 10; i++) {
      const c = A.part('box', G.th.top, rand(0.3, 0.6), rand(0.3, 0.6), rand(0.3, 0.6), m.position.x + rand(-0.8, 0.8), m.position.y + rand(-1, 1), m.position.z + rand(-0.8, 0.8), world);
      G.parts.push({ m: c, v: new THREE.Vector3(rand(-5, 5), rand(4, 10), rand(-5, 5)), life: 1.2, grav: true, spin: true });
    }
  }
  sfx('smash'); shake = 0.3;
}
function cellUnder(b) { const [cx, cz] = cellOf(b.x, b.z); return { cx, cz, t: ctype(cx, cz), wl: wlAt(cx, cz) }; }

function updatePlayer(dt) {
  const p = P;
  if (p.inv > 0) p.inv -= dt;
  if (p.capCool > 0) p.capCool -= dt;
  if (G.exiting) return;
  const mv = moveInput();
  if (hit.jump) p.jbuf = 0.15; else p.jbuf = Math.max(0, p.jbuf - dt);
  if (p.mode !== 'poop' && hit.out) { releaseCap(false); return; }
  const c = cellUnder(p);
  const water = c.t === 'w' && p.y < c.wl - 0.2;
  const liquidTop = (c.t === 'w' || c.t === 'g') ? c.wl : null;
  const lift = c.t === 'A' ? G.lift[c.cx + ',' + c.cz] : null;
  const wasSwim = p.swim; p.swim = false;

  if (p.mode === 'poop') {
    if (water) {
      p.swim = true;
      if (!wasSwim) { sfx('splash'); splash(p); }
      p.vx = lerp(p.vx, mv.x * 4.2, Math.min(1, 5 * dt)); p.vz = lerp(p.vz, mv.z * 4.2, Math.min(1, 5 * dt));
      p.vy = Math.max(p.vy - 7 * dt, -2.6); p.vy *= 1 - 1.5 * dt;
      if (keys.jump) p.vy = Math.min(p.vy + 16 * dt, 4);
      p.canFart = true;
      if (p.jbuf > 0) {
        p.jbuf = 0;
        if (p.y + p.hgt * 0.6 > c.wl - 0.3) { p.vy = 11.5; sfx('splash'); splash(p); }
        else { p.vy = 5.5; sfx('blub'); bubbleP(p.x, p.y + p.hgt, p.z); }
      }
      if (Math.random() < 0.03) bubbleP(p.x, p.y + p.hgt, p.z);
    } else {
      const acc = p.onGround ? 14 : 6;
      p.vx = lerp(p.vx, mv.x * SPEED, Math.min(1, acc * dt)); p.vz = lerp(p.vz, mv.z * SPEED, Math.min(1, acc * dt));
      p.vy -= GRAV * dt; if (p.vy < -26) p.vy = -26;
      if (p.onGround) { p.coyote = 0.12; p.canFart = true; } else p.coyote -= dt;
      if (p.jbuf > 0) {
        if (p.coyote > 0) { p.vy = JUMP; p.coyote = 0; p.jbuf = 0; sfx('jump'); p.sq = -0.25; }
        else if (p.canFart) { p.vy = FART; p.canFart = false; p.jbuf = 0; sfx('fart'); p.sq = 0.2; fartPuff(p); }
      }
    }
  } else if (p.mode === 'duck') {
    const afloat = liquidTop !== null && p.y < liquidTop - 0.25;
    if (afloat) { p.vy += 30 * dt + (liquidTop - 0.35 - p.y) * 10 * dt; p.vy *= 1 - 4 * dt; }
    else p.vy -= GRAV * dt;
    const sp = afloat ? 9 : 4.5;
    p.vx = lerp(p.vx, mv.x * sp, Math.min(1, 4 * dt)); p.vz = lerp(p.vz, mv.z * sp, Math.min(1, 4 * dt));
    if (p.jbuf > 0) {
      if (p.onGround || afloat) { p.vy = 11; p.jbuf = 0; sfx('quack'); }
      else { releaseCap(false); return; }
    }
    if (afloat && mv.mag > 0.2 && Math.random() < 0.3) G.parts.push(sparkP(p.x - mv.x, liquidTop, p.z - mv.z, c.t === 'g' ? '#b8ff7a' : '#e6f7ff'));
  } else if (p.mode === 'bubble') {
    const target = p.y < G.L.ceil - 2 ? 2.4 : 0;
    p.vy = lerp(p.vy, target, Math.min(1, 2 * dt));
    p.vx = lerp(p.vx, mv.x * 4.5, Math.min(1, 3 * dt)); p.vz = lerp(p.vz, mv.z * 4.5, Math.min(1, 3 * dt));
    if (p.jbuf > 0) { p.jbuf = 0; releaseCap(false); return; }
  } else if (p.mode === 'roll') {
    if (water) { releaseCap(false); floatText('Soggy!', new THREE.Vector3(p.x, p.y + 2, p.z), '#bfe3ff'); return; }
    p.vx = lerp(p.vx, mv.x * 11, Math.min(1, 2.5 * dt)); p.vz = lerp(p.vz, mv.z * 11, Math.min(1, 2.5 * dt));
    p.vy -= GRAV * dt; if (p.vy < -26) p.vy = -26;
    if (p.jbuf > 0) {
      if (p.onGround) { p.vy = 10.5; p.jbuf = 0; sfx('jump'); }
      else { releaseCap(false); return; }
    }
  } else if (p.mode === 'fish') {
    if (water) {
      p.swim = true;
      p.vx = lerp(p.vx, mv.x * 10, Math.min(1, 4 * dt)); p.vz = lerp(p.vz, mv.z * 10, Math.min(1, 4 * dt));
      p.vy = Math.max(p.vy - 5 * dt, -3); p.vy *= 1 - 1.5 * dt;
      if (keys.jump) p.vy = Math.min(p.vy + 22 * dt, 6);
      if (p.jbuf > 0) { p.jbuf = 0; if (p.y + p.hgt > c.wl - 0.3) { p.vy = 12; sfx('splash'); } }
    } else {
      p.vy -= GRAV * dt;
      p.vx *= 1 - 2 * dt; p.vz *= 1 - 2 * dt;
      if (p.jbuf > 0) {
        if (p.onGround) { p.vy = 6; p.vx = mv.x * 3; p.vz = mv.z * 3; p.jbuf = 0; sfx('blub'); }
        else { releaseCap(false); return; }
      }
    }
  }
  // fan updrafts lift you up
  if (lift !== null && p.y < lift + 0.6 && p.mode !== 'roll') {
    p.vy += GRAV * dt;
    const target = clamp((lift + 0.4 - p.y) * 3, -1.5, 9);
    p.vy = lerp(p.vy, target, Math.min(1, 6 * dt));
    p.canFart = true;
  }
  // wind boxes push you
  for (const w of G.winds) {
    if (p.x > w.x1 * CS && p.x < w.x2 * CS && p.z > w.z1 * CS && p.z < w.z2 * CS && p.y > w.y1 - 0.5 && p.y < w.y2) { p.vx += w.fx * 3 * dt; p.vz += w.fz * 3 * dt; }
  }
  // currents carry you along
  const cur = G.cur[c.cx + ',' + c.cz];
  const inCur = cur && liquidTop !== null && p.y < liquidTop + 0.1;
  const breakC = p.mode === 'roll' || (p.mode === 'poop' && S.hat === 'hardhat');
  const wasGround = p.onGround, fallV = p.vy;
  if (inCur) { p.x += cur[0] * dt * 2; p.z += cur[1] * dt * 2; }
  moveBody(p, dt, { breakC });
  if (p.onGround && !wasGround && fallV < -8) { p.sq = 0.3; if (p.mode === 'poop') dust(p); }
  p.sq *= Math.pow(0.02, dt);
  const sp = Math.hypot(p.vx, p.vz);
  if (sp > 0.6 && p.mode !== 'bubble') p.yaw = lerpAng(p.yaw, Math.atan2(p.vx, p.vz), Math.min(1, 12 * dt));
  else if (p.mode === 'bubble' && mv.mag > 0.1) p.yaw = lerpAng(p.yaw, Math.atan2(mv.x, mv.z), Math.min(1, 6 * dt));

  // goo hurts (unless you ride the ducky)
  const c2 = cellUnder(p);
  if (c2.t === 'g' && p.mode !== 'duck' && p.y <= c2.wl + 0.05) {
    hurt(null); p.vy = 13; p.canFart = true;
    for (let i = 0; i < 8; i++) G.parts.push(sparkP(p.x, c2.wl, p.z, '#8be04a', true));
  }
  // spikes
  if (p.onGround && p.supCell && ctype(p.supCell[0], p.supCell[1]) === '^') { hurt({ x: p.x - p.vx, z: p.z - p.vz }); p.vy = 10; }
  // fell out of the world somehow? pop back to the start
  if (p.y < -40) { p.x = G.start.x; p.y = G.start.y + 1; p.z = G.start.z; p.vx = p.vy = p.vz = 0; }
}
function hurt(src) {
  const p = P;
  if (p.inv > 0) return;
  shake = 0.25;
  if (p.mode !== 'poop') { releaseCap(true); p.inv = 1.2; return; }
  if (S.size > 1) { S.size--; S.grow = 0; persist(); sizePlayer(p); }
  sfx('squish'); p.inv = 1.6; p.sq = 0.5;
  floatText('SQUISH!', new THREE.Vector3(p.x, p.y + p.hgt + 0.8, p.z), '#ffb38a');
  if (S.size === 1) say('You are as small as you can get, but you can keep going! Eat corn to grow back.', 4);
  p.vy = Math.max(p.vy, 7);
  if (src) { const dx = p.x - src.x, dz = p.z - src.z, l = Math.hypot(dx, dz) || 1; p.vx = dx / l * 6; p.vz = dz / l * 6; }
}
const CAPMSG = {
  duck: 'Ducky power! Zoom across water AND goo. SPACE hops. SPACE again in the air hops out.',
  bubble: 'Bubble ride! It floats way up. Steer with the arrows. Press SPACE to hop out.',
  roll: 'Toilet paper roll! Roll into cracked walls to smash them. SPACE twice to hop out.',
  fish: 'Fish power! Swim super fast. Hold SPACE to swim up. Jump out of the water, then SPACE to hop out.',
};
function capture(c) {
  const p = P;
  p.mode = c.type; p.cap = c; c.hidden = true; c.m.visible = false; c.back = 0;
  p.x = c.x; p.z = c.z; p.y = c.y; p.vx = p.vz = 0; p.vy = 0;
  sizePlayer(p);
  p.m.visible = c.type === 'bubble';
  if (!p.capM) { p.capM = new THREE.Group(); world.add(p.capM); }
  p.capM.clear();
  const cm = A.makeCapture(c.type); p.capM.add(cm); p.capM.userData.inner = cm;
  if (cm.userData.hatPos && S.hat) { const h = A.makeHat(S.hat); h.position.set(...cm.userData.hatPos); h.scale.setScalar(1.3); cm.add(h); }
  if (c.type === 'bubble') p.m.scale.setScalar(0.7);
  sfx(c.type === 'duck' ? 'quack' : 'pop'); sparkle(new THREE.Vector3(p.x, p.y + 1, p.z), '#ffffff', 12);
  say(CAPMSG[c.type], 5);
}
function releaseCap(popped) {
  const p = P, c = p.cap;
  p.mode = 'poop'; p.cap = null; p.m.visible = true;
  if (p.capM) p.capM.clear();
  sizePlayer(p);
  c.x = p.x; c.y = p.y; c.z = p.z; c.vx = c.vz = 0; c.vy = 0;
  if (c.type === 'bubble') { c.back = 1.5; sfx('pop'); sparkle(new THREE.Vector3(p.x, p.y + 1, p.z), '#e6f7ff', 16); }
  else { c.hidden = false; c.m.visible = true; c.back = 6; }
  p.vy = 8; p.canFart = true; p.capCool = 0.8;
  if (popped) { floatText('Pop!', new THREE.Vector3(p.x, p.y + 2, p.z)); sfx('squish'); }
  else { sfx('fart'); fartPuff(p); }
}

// ------------------------------------------------------------------ particles
function sparkP(x, y, z, color, big) {
  const s = A.sprite(A.TEX.puff, big ? 0.5 : 0.3, big ? 0.5 : 0.3, { color }); s.position.set(x, y, z); world.add(s);
  return { m: s, v: new THREE.Vector3(rand(-2, 2), rand(2, 5), rand(-2, 2)), life: 0.6, grav: true };
}
function sparkle(pos, color = '#ffe066', n = 14) {
  for (let i = 0; i < n; i++) { const p = sparkP(pos.x, pos.y, pos.z, color); p.v.set(rand(-4, 4), rand(0, 6), rand(-4, 4)); p.life = 0.8; G.parts.push(p); }
}
function fartPuff(p) {
  const back = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  for (let i = 0; i < 8; i++) {
    const s = A.sprite(A.TEX.puff, 0.5, 0.5, { color: '#a8c46a', opacity: 0.8 });
    s.position.set(p.x + back.x * 0.3 * p.hgt, p.y + 0.25, p.z + back.z * 0.3 * p.hgt); world.add(s);
    G.parts.push({ m: s, v: new THREE.Vector3(back.x * rand(0.5, 2) + rand(-1, 1), rand(-2.5, -0.5), back.z * rand(0.5, 2) + rand(-1, 1)), life: 0.9, grow: 1.6, drag: true });
  }
}
function dust(p) {
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, s = A.sprite(A.TEX.puff, 0.4, 0.4, { opacity: 0.8 });
    s.position.set(p.x, p.y + 0.1, p.z); world.add(s);
    G.parts.push({ m: s, v: new THREE.Vector3(Math.cos(a) * 2.5, 0.4, Math.sin(a) * 2.5), life: 0.45, grow: 1.2, drag: true });
  }
}
function splash(p) {
  const c = cellUnder(p); const y = c.wl !== null ? c.wl : p.y;
  for (let i = 0; i < 10; i++) { const s = sparkP(p.x, y, p.z, '#e6f7ff', true); s.v.set(rand(-3, 3), rand(3, 7), rand(-3, 3)); G.parts.push(s); }
}
function bubbleP(x, y, z) {
  const s = A.sprite(A.TEX.puff, 0.25, 0.25, { color: '#e6f7ff', opacity: 0.8 }); s.position.set(x + rand(-0.2, 0.2), y, z + rand(-0.2, 0.2)); world.add(s);
  G.parts.push({ m: s, v: new THREE.Vector3(0, 2, 0), life: 1.5, bubble: true });
}
function poof(pos) {
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, s = A.sprite(A.TEX.puff, 0.7, 0.7, { opacity: 0.9 }); s.position.copy(pos); world.add(s);
    G.parts.push({ m: s, v: new THREE.Vector3(Math.cos(a) * 3, rand(0, 2), Math.sin(a) * 3), life: 0.5, grow: 1.5, drag: true });
  }
}
function updateParts(dt) {
  for (const q of G.parts) {
    q.life -= dt;
    if (q.grav) q.v.y -= 14 * dt;
    if (q.drag) q.v.multiplyScalar(1 - 3 * dt);
    q.m.position.addScaledVector(q.v, dt);
    if (q.grow) q.m.scale.multiplyScalar(1 + q.grow * dt);
    if (q.spin) { q.m.rotation.x += dt * 5; q.m.rotation.y += dt * 4; }
    if (q.bubble) { const c = cellOf(q.m.position.x, q.m.position.z); const wl = wlAt(c[0], c[1]); if (wl === null || q.m.position.y > wl) q.life = 0; }
    if (q.m.material && q.m.material.opacity !== undefined && q.life < 0.3) q.m.material.opacity = Math.max(0, q.life / 0.3);
    if (q.life <= 0) world.remove(q.m);
  }
  G.parts = G.parts.filter(q => q.life > 0);
}

// ------------------------------------------------------------------ the kingdom ticking along
let shake = 0;
function updateLevel(dt) {
  G.time += dt;
  const p = P, T = G.time;
  updatePlayer(dt);
  // enemies
  for (const e of G.ents) {
    if (e.dead) continue;
    updateEnemy(e, dt, T);
    if (G.exiting || p.inv > 0) continue;
    touchEnemy(e);
  }
  G.ents = G.ents.filter(e => !e.dead);
  // captures waiting to be grabbed
  for (const c of G.caps) {
    if (c === p.cap) continue;
    if (c.back > 0 && (c.back -= dt) <= 0) {
      if (Math.hypot(c.x - c.home.x, c.z - c.home.z) > 0.5 || c.hidden) { poof(new THREE.Vector3(c.x, c.y + 0.5, c.z)); c.x = c.home.x; c.y = c.home.y; c.z = c.home.z; poof(new THREE.Vector3(c.x, c.y + 0.5, c.z)); }
      c.hidden = false; c.m.visible = true;
    }
    if (c.hidden) continue;
    const cc = cellUnder(c), lt = (cc.t === 'w' || cc.t === 'g') ? cc.wl : null;
    if (c.type === 'duck') {
      if (lt !== null && c.y < lt - 0.25) { c.vy += 30 * dt + (lt - 0.35 - c.y) * 10 * dt; c.vy *= 1 - 4 * dt; } else c.vy -= GRAV * dt;
      c.vx *= 1 - 2 * dt; c.vz *= 1 - 2 * dt; moveBody(c, dt);
      c.m.rotation.z = Math.sin(T * 2) * 0.08;
    } else if (c.type === 'roll' || (c.type === 'fish' && !(cc.t === 'w' && c.y < cc.wl))) {
      c.vy -= GRAV * dt; c.vx *= 1 - 3 * dt; c.vz *= 1 - 3 * dt; moveBody(c, dt);
      if (c.type === 'fish' && c.onGround && Math.random() < 0.02) c.vy = 5;
    } else if (c.type === 'fish') {
      c.x = c.home.x + Math.sin(T * 0.7) * 1.5; c.y = c.home.y + Math.sin(T * 1.3) * 0.3; c.yaw = Math.cos(T * 0.7) > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else if (c.type === 'bubble') {
      c.y = c.home.y + 0.2 + Math.sin(T * 2) * 0.15;
    }
    c.m.position.set(c.x, c.y, c.z); c.m.rotation.y = c.yaw || 0;
    if (p.mode === 'poop' && p.capCool <= 0 && !G.exiting && Math.hypot(p.x - c.x, p.z - c.z) < p.r + c.r + 0.5 && p.y < c.y + c.hgt + 0.3 && p.y + p.hgt > c.y - 0.5) capture(c);
  }
  // pickups
  const pc = new THREE.Vector3(p.x, p.y + p.hgt / 2, p.z);
  for (const it of G.items) {
    if (it.taken) continue;
    it.m.position.y = it.p.y + Math.sin(T * 2.5 + it.ph) * 0.15;
    if (it.k === 'gold') { it.m.userData.spin.rotation.y = T * 2; }
    else if (it.k === 'corn') it.m.rotation.y = T * 3 + it.ph;
    else it.m.rotation.y = T;
    const rr = it.k === 'corn' ? 0.6 : 0.95;
    if (pc.distanceTo(it.m.position) < p.r + rr + (p.mode !== 'poop' ? 0.4 : 0)) {
      it.taken = true; world.remove(it.m);
      if (it.k === 'corn') gotCorn(it.m.position);
      else if (it.k === 'gold') gotGold(it);
      else gotTreasure(it);
    }
  }
  // doors, shop, exit, signs
  let zone = null;
  for (const d of G.doors) if (Math.hypot(p.x - d.p.x, p.z - (d.p.z + 0.9)) < 1.3 && Math.abs(p.y - d.p.y) < 1.5) zone = { k: 'door', d };
  if (G.shop && Math.hypot(p.x - G.shop.p.x, p.z - (G.shop.p.z + 1.9)) < 1.3 && Math.abs(p.y - G.shop.p.y) < 1.5) zone = { k: 'shop' };
  if (G.exit) {
    if (G.L.final ? Math.hypot(p.x - G.exit.p.x, p.z - G.exit.p.z) < 2.2 && Math.abs(p.y - G.exit.p.y) < 2 : p.onGround && p.supPlat === G.exit.plat) zone = { k: 'exit' };
  }
  const zk = zone ? zone.k + (zone.d ? zone.d.id : '') : null;
  if (zk !== G.zone) { G.zone = zk; if (zone) useThing(zone); }
  let sign = null;
  for (const s of G.signs) if (Math.hypot(p.x - s.p.x, p.z - s.p.z) < 2.6 && Math.abs(p.y - s.p.y) < 3) sign = s;
  G.sign = sign;
  // pipe exit animation
  if (G.exiting) {
    G.exiting -= dt;
    if (G.L.final) { p.yaw += dt * 8; p.y += dt * 0.6; } else { p.y -= dt * 2.2; p.yaw += dt * 10; }
    if (G.exiting <= 0) { finishLevel(); return; }
  }
  updateParts(dt);
  // water ripples
  if (G.ripple) {
    const cur = G.L.cur.length ? G.L.cur[0] : null;
    G.ripple.offset.x += (cur ? -cur[2] * 0.25 : 0.01) * dt; G.ripple.offset.y += (cur ? -cur[3] * 0.25 : 0.006) * dt;
  }
  if (G.decoSpin) for (const s of G.decoSpin) s.rotation.z += dt * 1.2;
  // ghost blocks show up with goggles on
  const gog = S.face === 'goggles';
  for (const pl of G.plats) if (pl.ghost) { pl.mesh.material.opacity = gog ? 0.9 : 0.22 + Math.sin(T * 3) * 0.08; pl.mesh.material.color.set(gog ? '#9cefff' : '#ffffff'); }
  if (toastT > 0 && (toastT -= dt) <= 0) $('#toast').hidden = true;
  if (msgT > 0) msgT -= dt;
  const text = msgT > 0 ? msgText : G.sign ? G.sign.text : '';
  const msg = $('#msg');
  if (text) { if (msg.textContent !== text) msg.textContent = text; msg.hidden = false; } else msg.hidden = true;
  if (shake > 0) shake -= dt;
}
function updateEnemy(e, dt, T) {
  const p = P;
  if (e.k === 'walker') {
    const dxp = p.x - e.x, dzp = p.z - e.z, dp = Math.hypot(dxp, dzp);
    const chase = dp < 7 && Math.abs(p.y - e.y) < 2 && p.mode !== 'bubble';
    let want = e.yaw, sp = 1.4;
    if (chase) { want = Math.atan2(dxp, dzp); sp = 2.6; }
    else if ((e.turnT -= dt) <= 0) { e.turnT = rand(1.5, 3.5); e.yaw = want = e.yaw + rand(-1.5, 1.5); if (Math.hypot(e.x - e.home.x, e.z - e.home.z) > 8) e.yaw = want = Math.atan2(e.home.x - e.x, e.home.z - e.z); }
    e.yaw = lerpAng(e.yaw, want, Math.min(1, 4 * dt));
    const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
    // don't walk off ledges, into water or onto spikes
    const ax = e.x + fx * 0.9, az = e.z + fz * 0.9, [acx, acz] = cellOf(ax, az), at = ctype(acx, acz);
    if (Math.abs(top(acx, acz) - e.y) > 0.5 || at === 'w' || at === 'g' || at === '^') { e.yaw += Math.PI * rand(0.6, 1.4); e.vx = e.vz = 0; e.turnT = rand(1, 2); }
    else { e.vx = fx * sp; e.vz = fz * sp; }
    e.vy -= GRAV * dt;
    moveBody(e, dt);
    if (e.hitWall) { e.yaw += Math.PI * rand(0.5, 1.5); }
    e.m.position.set(e.x, e.y, e.z); e.m.rotation.y = e.yaw;
    const u = e.m.userData, s = Math.abs(Math.sin(T * 8));
    e.m.position.y += s * 0.08;
    if (u.wheels) u.wheels.forEach(w => { w.rotation.x += dt * 8; });
    if (u.brush) u.brush.rotation.y += dt * 12;
    if (u.claws) u.claws.forEach((c, i) => { c.position.y = 0.66 + Math.sin(T * 6 + i * 3) * 0.08; });
    if (u.tail) u.tail.rotation.y = Math.sin(T * 6) * 0.4;
  } else if (e.k === 'flyer') {
    e.a += dt * 0.9;
    const nx = e.cx + Math.cos(e.a) * e.rad, nz = e.cz + Math.sin(e.a) * e.rad;
    e.m.rotation.y = Math.atan2(nx - e.x, nz - e.z);
    e.x = nx; e.z = nz; e.y = e.y0 + Math.sin(T * 3) * 0.3;
    e.m.position.set(e.x, e.y, e.z);
    const u = e.m.userData;
    if (u.wings) u.wings.forEach((w, i) => { w.rotation.z = Math.sin(T * (e.m.userData.wings.length && w.isGroup ? 8 : 40)) * (i ? 0.6 : -0.6); });
    const sup = support(e.x, e.z, 0.2, e.y);
    e.sh.position.set(e.x, sup.y + 0.03, e.z);
  } else if (e.k === 'drip') {
    if (e.wait > 0) { e.wait -= dt; e.m.visible = e.wait < 0.6; e.y = e.y0; e.m.position.set(e.x, e.y, e.z); e.sh.visible = false; return; }
    e.sh.visible = true;
    e.vy -= 20 * dt; e.y += e.vy * dt;
    const g = support(e.x, e.z, 0.1, e.y + 1).y, [cx, cz] = cellOf(e.x, e.z), wl = wlAt(cx, cz);
    const floor = Math.max(g, wl !== null ? wl : -1e6);
    e.sh.position.set(e.x, floor + 0.03, e.z); e.sh.scale.setScalar(0.5 + clamp(1 - (e.y - floor) / 10, 0, 1) * 0.8);
    if (e.y <= floor) {
      for (let i = 0; i < 6; i++) G.parts.push(sparkP(e.x, floor + 0.1, e.z, '#9fd8ff'));
      e.y = e.y0; e.vy = 0; e.wait = rand(1, 2.5);
    }
    e.m.position.set(e.x, e.y, e.z);
  } else if (e.k === 'drop') {
    const dp = Math.hypot(p.x - e.x, p.z - e.z);
    if (e.st === 'wait') { if ((e.tm -= dt) <= 0 && dp < 1.6 && p.y < e.y) { e.st = 'shake'; e.tm = 0.4; } }
    else if (e.st === 'shake') { if ((e.tm -= dt) <= 0) { e.st = 'fall'; e.vy = 0; } }
    else if (e.st === 'fall') {
      const [cx, cz] = cellOf(e.x, e.z), wl = wlAt(cx, cz), wet = wl !== null && e.y < wl;
      e.vy = wet ? Math.max(e.vy - 10 * dt, -6) : e.vy - 45 * dt; e.y += e.vy * dt;
      if (e.y <= e.g) { e.y = e.g; e.st = 'rest'; e.tm = 1.0; sfx('thud'); shake = Math.max(shake, 0.15); dustAt(e.x, e.g, e.z); }
    } else if (e.st === 'rest') { if ((e.tm -= dt) <= 0) e.st = 'rise'; }
    else if (e.st === 'rise') { e.y += 3 * dt; if (e.y >= e.y0) { e.y = e.y0; e.st = 'wait'; e.tm = 0.8; } }
    e.m.position.set(e.x + (e.st === 'shake' ? rand(-0.06, 0.06) : 0), e.y, e.z);
    e.sh.scale.setScalar(e.st === 'wait' ? 1.0 : 1.6);
  } else if (e.k === 'spin') {
    e.a += e.sp * dt; e.bar.rotation.y = e.a;
  } else if (e.k === 'swim') {
    e.a += dt * e.sp;
    const nx = e.cx + Math.cos(e.a) * e.rad, nz = e.cz + Math.sin(e.a) * e.rad;
    e.m.rotation.y = Math.atan2(nx - e.x, nz - e.z);
    e.x = nx; e.z = nz; e.y = e.y0 + Math.sin(T * 1.5) * 0.2;
    e.m.position.set(e.x, e.y, e.z);
    const u = e.m.userData; if (u.tail) u.tail.rotation.y = Math.sin(T * 6) * 0.4;
  } else if (e.k === 'jelly') {
    e.y = e.y0 + Math.sin(T * 1.2 + e.a) * 1.2;
    e.m.position.set(e.x, e.y, e.z);
    e.m.userData.tent.forEach((t, i) => { t.rotation.x = Math.sin(T * 3 + i) * 0.3; });
  } else if (e.k === 'fanprop') { e.blades.rotation.y += dt * 14; }
  else if (e.k === 'streak') {
    e.m.position.y += e.v[1] * dt; if (e.m.position.y > e.y1) e.m.position.y = e.y0;
  } else if (e.k === 'floaty') { e.m.position.y = e.y0 + Math.sin(T * 0.6 + e.ph) * 0.8; }
  else if (e.k === 'cloud') { e.m.position.x += dt * 0.6; if (e.m.position.x > G.W * CS + 40) e.m.position.x = -40; }
  else if (e.k === 'kelp') { e.m.rotation.z = Math.sin(T * 1.3 + e.ph) * 0.2; }
}
function dustAt(x, y, z) {
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, s = A.sprite(A.TEX.puff, 0.5, 0.5); s.position.set(x, y + 0.1, z); world.add(s); G.parts.push({ m: s, v: new THREE.Vector3(Math.cos(a) * 3, 0.5, Math.sin(a) * 3), life: 0.5, grow: 1.4, drag: true }); }
}
function touchEnemy(e) {
  const p = P;
  if (e.k === 'spin') {
    if (Math.abs(p.y + p.hgt / 2 - e.y) > p.hgt / 2 + 0.25) return;
    const ax = Math.cos(e.a) * e.R, az = -Math.sin(e.a) * e.R;
    // distance from the poop to the spinning bar
    const px = p.x - e.x, pz = p.z - e.z, t = clamp((px * ax + pz * az) / (e.R * e.R), -1, 1);
    if (Math.hypot(px - ax * t, pz - az * t) < p.r + 0.3) hurt({ x: e.x + ax * t, z: e.z + az * t });
    return;
  }
  if (!['walker', 'flyer', 'drip', 'drop', 'swim', 'jelly'].includes(e.k)) return;
  if (e.k === 'drop') {
    if (e.st !== 'fall') return;
    if (Math.hypot(p.x - e.x, p.z - e.z) < p.r + 0.7 && p.y < e.y + 0.6 && p.y + p.hgt > e.y) hurt(e);
    return;
  }
  if (e.k === 'drip' && e.wait > 0) return;
  const hgt = e.hgt || 0.8, er = e.r || 0.5;
  if (Math.hypot(p.x - e.x, p.z - e.z) > p.r + er) return;
  const ey = e.k === 'swim' || e.k === 'jelly' ? e.y - hgt / 2 : e.k === 'flyer' ? e.y - 0.3 : e.y;
  if (p.y > ey + hgt || p.y + p.hgt < ey) return;
  const stomp = e.stomp && p.vy < -1 && p.y > ey + hgt * 0.45;
  if (stomp || (e.stomp && p.mode === 'roll')) {
    e.dead = true; world.remove(e.m); if (e.sh) world.remove(e.sh);
    poof(new THREE.Vector3(e.x, ey + 0.5, e.z)); sfx('stomp');
    if (stomp) { p.vy = keys.jump ? 13 : 9; p.canFart = true; }
    gotCorn(new THREE.Vector3(e.x, ey + 1, e.z));
  } else hurt(e);
}
function gotCorn(pos) {
  S.corn++; S.grow++;
  sfx('corn'); floatText('+1', pos, '#ffe066');
  if (S.grow >= 5) {
    S.grow = 0;
    if (S.size < 6) {
      S.size++; sizePlayer(P); sfx('grow');
      floatText('BIGGER!', new THREE.Vector3(P.x, P.y + P.hgt + 1, P.z), '#9cff7a');
      sparkle(new THREE.Vector3(P.x, P.y + 0.5, P.z), '#9cff7a', 18);
    }
  }
  persist();
}
function gotGold(it) {
  sparkle(it.m.position, '#ffe066', 26);
  if (it.got) { sfx('corn'); say('You already found this Golden Corn. Look for more!', 3); return; }
  S.golden[it.id] = true; persist(); sfx('golden'); shake = 0.2;
  goldBanner('GOLDEN CORN!', '');
}
function goldBanner(title, pre) {
  const n = goldIn(G.L.key), tot = GOLD_TOTAL[G.i];
  let sub = `${n} of ${tot} in this kingdom.`;
  if (n === G.L.needed) sub = G.L.final ? 'Now find the beach umbrella!' : 'The exit pipe is OPEN! Keep exploring or jump on the pipe!';
  banner(title, pre + sub, 3.4);
  updateExitLabel();
}
function gotTreasure(it) {
  const o = OUTFITS[it.outfit];
  sparkle(it.m.position, '#ff8fd1', 26);
  if (owns(it.outfit)) return;
  S.owned.push(it.outfit); S[o.slot] = it.outfit; persist();
  A.setOutfit(P.m, S.hat, S.face);
  sfx('fanfare');
  banner(`You found the ${o.name}!`, o.power || 'You put it on! Press C to open your closet and change clothes.', 4);
}
function useThing(z) {
  const p = P;
  if (z.k === 'exit') {
    const got = goldIn(G.L.key);
    if (got >= G.L.needed || S.beaten[G.L.key]) {
      if (p.mode !== 'poop') releaseCap(false);
      G.exiting = G.L.final ? 1.6 : 0.9; p.vx = p.vz = 0; p.vy = 0;
      if (!G.L.final) { p.x = G.exit.p.x; p.z = G.exit.p.z; }
      sfx(G.L.final ? 'fanfare' : 'whoosh');
    } else { sfx('nope'); say(`${G.L.final ? 'The beach' : 'This pipe'} needs ${G.L.needed} Golden Corn. You have ${got}. Keep exploring!`, 4); }
  } else if (z.k === 'door') {
    const d = z.d, o = OUTFITS[d.outfit];
    if (d.open) { say('You already partied in here! It gave you a Golden Corn.', 3); return; }
    if (wearing(d.outfit)) {
      d.open = true; S.golden[d.id] = true; persist(); openDoorLook(d);
      sfx('golden'); sparkle(d.p.clone().add(new THREE.Vector3(0, 2, 1)), '#ff8fd1', 30); sparkle(d.p.clone().add(new THREE.Vector3(0, 3, 1)), '#ffe066', 20);
      goldBanner('COSTUME PARTY!', `They loved your ${o.name}! Here's a Golden Corn. `);
    } else {
      sfx('nope');
      let where;
      if (owns(d.outfit)) where = 'You have it! Press C and put it on.';
      else if (o.price) where = `The rat's shop sells it for ${o.price} corn.`;
      else where = `It's hidden in the ${LV[FOUND_IN[d.outfit]].name}.`;
      say(`Costume door! Only a poop wearing the ${o.name} can come in. ${where}`, 5);
    }
  } else if (z.k === 'shop') openShop();
}
function finishLevel() {
  S.beaten[G.L.key] = true;
  if (G.L.final) { S.won = true; S.best = Math.max(S.best || 0, S.size); persist(); startEnding(); return; }
  S.unlocked = Math.max(S.unlocked, G.i + 2); persist();
  openMap(G.i, G.i + 1);
}

// ------------------------------------------------------------------ drawing the player & camera
function syncPlayer(dt) {
  const p = P, s = pScale() * 1.05;
  const blinkOn = p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0;
  if (p.mode === 'poop' || p.mode === 'bubble') {
    p.m.position.set(p.x, p.y + (p.mode === 'bubble' ? 0.25 : 0), p.z);
    p.m.rotation.y = p.yaw;
    const sq = p.sq;
    p.m.scale.set(s * (1 + sq * 0.5), s * (1 - sq), s * (1 + sq * 0.5));
    if (p.mode === 'bubble') p.m.scale.multiplyScalar(0.7);
    const b = p.m.userData.body;
    b.rotation.z = p.onGround ? 0 : clamp(-p.vx * 0.02, -0.15, 0.15);
    b.position.y = p.onGround && Math.hypot(p.vx, p.vz) > 1 ? Math.abs(Math.sin(G.time * 14)) * 0.06 : 0;
    p.blink -= dt; if (p.blink < 0) p.blink = rand(2, 4);
    p.m.userData.eyes.forEach((e, i) => { e.scale.y = (i % 2 ? 0.12 : 0.24) * (p.blink < 0.12 ? 0.15 : 1); });
  }
  p.m.visible = (p.mode === 'poop' || p.mode === 'bubble') && !blinkOn;
  if (p.capM) {
    p.capM.visible = p.mode !== 'poop' && !blinkOn;
    p.capM.position.set(p.x, p.y, p.z); p.capM.rotation.y = p.yaw;
    const inner = p.capM.userData.inner;
    if (p.mode === 'roll' && inner) inner.userData.roll.rotation.x += Math.hypot(p.vx, p.vz) * dt * 1.6;
    if (p.mode === 'fish' && inner) inner.userData.tail.rotation.y = Math.sin(G.time * 12) * 0.4;
    if (p.mode === 'duck' && inner) inner.rotation.z = Math.sin(G.time * 3) * 0.06;
  }
  // a soft shadow under the poop shows where you'll land
  const sup = support(p.x, p.z, 0.05, p.y + 0.3);
  const [cx, cz] = cellOf(p.x, p.z), wl = wlAt(cx, cz);
  const gy = wl !== null && wl > sup.y && p.y > wl - 0.1 ? wl : sup.y;
  const hgt = Math.max(0, p.y - gy);
  p.sh.position.set(p.x, gy + 0.04, p.z);
  p.sh.scale.setScalar((p.r * 2.8 + 0.3) * clamp(1 - hgt / 14, 0.35, 1));
  p.sh.visible = gy > -1e5;
}
function placeCamera(dt) {
  const p = P;
  const mv = moveInput();
  if (keys.camL) camYaw += 2.2 * dt;
  if (keys.camR) camYaw -= 2.2 * dt;
  camYaw += camYawDrag; camYawDrag = 0;
  // swing slowly behind the poop while it runs forward
  const sp = Math.hypot(p.vx, p.vz);
  if (sp > 2 && mv.f > -0.3 && dt < 1) {
    const want = Math.atan2(-p.vx, -p.vz);
    camYaw = lerpAng(camYaw, want, Math.min(1, dt * 0.9 * (sp / SPEED)));
  }
  const tx = p.x, ty = p.y + 1.1 + (p.mode === 'bubble' ? 0.6 : 0), tz = p.z;
  let d = camDist + (S.size - 3) * 0.5;
  const pitch = camPitch + (p.swim ? 0.12 : 0);
  const ox = Math.sin(camYaw) * Math.cos(pitch), oy = Math.sin(pitch), oz = Math.cos(camYaw) * Math.cos(pitch);
  // pull in if a wall is in the way
  for (let i = 1; i <= 12; i++) {
    const k = i / 12 * d, sx = tx + ox * k, sy = ty + oy * k, sz = tz + oz * k;
    const [cx, cz] = cellOf(sx, sz);
    const tt = Math.min(top(cx, cz), G.wallH);
    if (tt > sy - 0.4) { d = Math.max(2.2, k - 0.6); break; }
  }
  const want = new THREE.Vector3(tx + ox * d, ty + oy * d, tz + oz * d);
  if (dt >= 1) camera.position.copy(want); else camera.position.lerp(want, Math.min(1, dt * 7));
  if (shake > 0) camera.position.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shake * 0.6));
  camera.lookAt(tx, ty, tz);
  // under the water everything looks blue
  const [ccx, ccz] = cellOf(camera.position.x, camera.position.z), cwl = wlAt(ccx, ccz);
  const under = cwl !== null && camera.position.y < cwl && ctype(ccx, ccz) === 'w';
  if (under !== G.under) {
    G.under = under;
    if (under) { scene.fog = new THREE.Fog('#1f6fb0', 2, 38); scene.background = new THREE.Color('#1f6fb0'); }
    else { scene.fog = new THREE.Fog(G.th.sky, 34, 120); scene.background = new THREE.Color(G.th.sky); }
  }
}

// ------------------------------------------------------------------ shop, closet, pause
function openShop() {
  overlay = 'shop'; menuSel = 0; sfx('blip');
  $('#shopsay').textContent = 'Squeak! Welcome to my shop! I trade cool stuff for corn.';
  renderShop(); showOverlay('#shop');
}
function showOverlay(id) { for (const s of ['#shop', '#closet', '#pause']) $(s).hidden = s !== id; }
function closeOverlay() { overlay = null; showOverlay(null); if (state === 'map') markSel(null); }
function renderShop() {
  const list = $('#shoplist'); list.innerHTML = '';
  $('#shopcount').textContent = S.corn;
  for (const it of SHOP.concat(['bye'])) {
    const b = document.createElement('button'); b.className = 'mbtn';
    if (it === 'bye') { b.textContent = 'Bye bye!'; b.onclick = closeOverlay; }
    else if (it === 'snack') {
      b.innerHTML = `<img src="${ICON.corn}" alt=""><span>Grow Snack (get bigger)</span><span>${S.size >= 6 ? 'MAX!' : SNACK_PRICE + ' corn'}</span>`;
      b.onclick = () => shopBuy(it);
    } else {
      const o = OUTFITS[it];
      b.innerHTML = `<img src="${poopThumb(o.slot === 'hat' ? it : null, o.slot === 'face' ? it : null, 96)}" alt=""><span>${o.name}</span><span>${owns(it) ? (wearing(it) ? 'Wearing ✓' : 'Got it!') : o.price + ' corn'}</span>`;
      b.onclick = () => shopBuy(it);
    }
    list.appendChild(b);
  }
  markSel(list);
}
function shopBuy(it) {
  const sayEl = $('#shopsay');
  if (it === 'snack') {
    if (S.size >= 6) { sayEl.textContent = "You're already as BIG as you can get! Wow!"; sfx('nope'); return; }
    if (S.corn < SNACK_PRICE) { sayEl.textContent = `A Grow Snack costs ${SNACK_PRICE} corn. Go find some more!`; sfx('nope'); return; }
    S.corn -= SNACK_PRICE; S.size++; S.grow = 0; persist(); sizePlayer(P); sfx('grow');
    sayEl.textContent = 'Crunch crunch! You got BIGGER!'; renderShop(); return;
  }
  const o = OUTFITS[it];
  if (owns(it)) { wear(it); A.setOutfit(P.m, S.hat, S.face); sayEl.textContent = wearing(it) ? `Looking good in the ${o.name}!` : `You took off the ${o.name}.`; sfx('blip'); renderShop(); return; }
  if (S.corn < o.price) { sayEl.textContent = `The ${o.name} costs ${o.price} corn. You have ${S.corn}. Go find more corn!`; sfx('nope'); return; }
  S.corn -= o.price; S.owned.push(it); S[o.slot] = it; persist(); sfx('buy');
  A.setOutfit(P.m, S.hat, S.face);
  sayEl.textContent = `Squeak! The ${o.name} is yours! You put it on.`; renderShop();
}
const CLOSET = [null, ...Object.keys(OUTFITS)];
function openCloset() { overlay = 'closet'; menuSel = 0; renderCloset(); showOverlay('#closet'); sfx('blip'); }
function renderCloset() {
  const grid = $('#closetgrid'); grid.innerHTML = '';
  CLOSET.forEach((o, i) => {
    const b = document.createElement('button'); b.className = 'mbtn';
    if (o === null) b.innerHTML = '<span class="q">✕</span>Nothing';
    else if (owns(o)) { const d = OUTFITS[o]; b.innerHTML = `<img src="${poopThumb(d.slot === 'hat' ? o : null, d.slot === 'face' ? o : null, 96)}" alt="${d.name}">`; if (wearing(o)) b.classList.add('on'); }
    else b.innerHTML = '<span class="q">?</span>';
    b.onclick = () => { menuSel = i; closetPick(o); };
    b.onmouseenter = () => { menuSel = i; markSel(grid); closetInfo(); };
    grid.appendChild(b);
  });
  $('#closetprev').src = poopThumb(S.hat, S.face, 240);
  markSel(grid); closetInfo();
}
function closetInfo() {
  const o = CLOSET[menuSel];
  let info = 'Take everything off.';
  if (o) {
    const d = OUTFITS[o];
    if (owns(o)) info = `${d.name}${d.power ? ': ' + d.power : '.'} ${wearing(o) ? '(Wearing it!)' : 'Press SPACE to wear it.'}`;
    else if (d.price) info = `??? Buy it at the rat's shop for ${d.price} corn.`;
    else info = `??? It's hidden somewhere in the ${LV[FOUND_IN[o]].name}.`;
  }
  $('#closetinfo').textContent = `${info}  (You have ${S.owned.length} of ${CLOSET.length - 1} outfits.)`;
}
function closetPick(o) {
  if (o === null) { S.hat = null; S.face = null; persist(); sfx('blip'); }
  else if (!owns(o)) { sfx('nope'); return; }
  else { wear(o); sfx('pop'); }
  if (state === 'play' && P) A.setOutfit(P.m, S.hat, S.face);
  if (state === 'map' && mapS) A.setOutfit(mapS.boat.userData.poop, S.hat, S.face);
  renderCloset();
}
function pauseAct(a) {
  if (a === 'resume') closeOverlay();
  else if (a === 'closet') openCloset();
  else if (a === 'map') { closeOverlay(); openMap(G.i, G.i); }
  else if (a === 'sound') toggleMute();
}
document.querySelectorAll('#pause [data-act]').forEach(b => { b.onclick = () => pauseAct(b.dataset.act); });
$('#bCloset').onclick = () => { if (state === 'play' && !overlay) openCloset(); };
$('#bSound').onclick = toggleMute;
$('#bPause').onclick = () => { if (state === 'play' && !overlay) { overlay = 'pause'; menuSel = 0; showOverlay('#pause'); } };
function updateOverlay() {
  if (hit.esc || (hit.closet && overlay === 'closet')) { closeOverlay(); return; }
  const el = overlay === 'shop' ? $('#shoplist') : overlay === 'closet' ? $('#closetgrid') : $('#pause .card');
  menuNav(el);
}

// ------------------------------------------------------------------ title screen
let titleS = null;
function openTitle() {
  state = 'title'; overlay = null; G = null;
  newWorld();
  scene.background = new THREE.Color('#bfe9ff'); scene.fog = new THREE.Fog('#bfe9ff', 20, 70);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ map: (() => {
    const t = A.canvasTex(256, 256, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#d6eeff'; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128); g.strokeStyle = '#9fd2f2'; g.lineWidth = 4; g.strokeRect(0, 0, 256, 256); g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128); });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 20); return t;
  })() }));
  floor.rotation.x = -Math.PI / 2; world.add(floor);
  const poop = A.makePoop(); A.setOutfit(poop, S.hat || 'party', S.face); poop.scale.setScalar(1.6); world.add(poop);
  const gold = A.makeGold(); gold.position.set(3, 1.6, -1); world.add(gold);
  const sh = shadowBlob(2.4); sh.position.y = 0.02; world.add(sh);
  const bubbles = [];
  for (let i = 0; i < 12; i++) { const b = A.part('sph', '#e6f7ff', 0, 0, 0, rand(-12, 12), rand(1, 10), rand(-14, 2), world, { transparent: true, opacity: 0.35 }); b.scale.setScalar(rand(0.5, 1.6)); bubbles.push(b); }
  const toilet = A.makeToilet(); toilet.position.set(-6, 0.6, -7); toilet.rotation.y = 0.5; world.add(toilet);
  titleS = { poop, gold, sh, bubbles, t: 0 };
  showOnly(['#title']);
  const menu = $('#titlemenu'); menu.innerHTML = '';
  const add = (label, fn) => { const b = document.createElement('button'); b.className = 'mbtn'; b.textContent = label; b.onclick = fn; menu.appendChild(b); return b; };
  if (S.started) {
    add('Continue', () => { audioInit(); openMap(Math.min(S.unlocked - 1, 6), Math.min(S.unlocked - 1, 6)); });
    const nb = add('New adventure', () => {
      if (nb.dataset.sure) { const m = S.muted; S = freshSave(); S.muted = m; persist(); startIntro(); }
      else { nb.dataset.sure = 1; nb.textContent = 'Sure? Press again'; sfx('nope'); }
    });
  } else add('Start!', () => { audioInit(); startIntro(); });
  menuSel = 0; markSel(menu);
  musicRoot = 262; musicTempo = 0.15;
}
function updateTitle(dt) {
  const s = titleS; s.t += dt;
  const b = Math.abs(Math.sin(s.t * 3));
  s.poop.position.set(0, b * 1.6, 0); s.poop.rotation.y = Math.sin(s.t * 0.7) * 0.6;
  s.poop.scale.set(1.6 * (1 + (b < 0.1 ? 0.15 : 0)), 1.6 * (1 - (b < 0.1 ? 0.15 : 0)), 1.6);
  s.sh.scale.setScalar(2.4 - b * 0.8);
  s.gold.userData.spin.rotation.y = s.t * 2; s.gold.position.y = 1.6 + Math.sin(s.t * 2) * 0.2;
  s.bubbles.forEach((bb, i) => { bb.position.y += dt * (0.4 + i % 3 * 0.2); if (bb.position.y > 12) bb.position.y = 0; });
  const a = s.t * 0.15;
  camera.position.set(Math.sin(a) * 2 + 1.5, 3.2, 9.5); camera.lookAt(0.8, 1.9, 0);
  if (hit.mute) toggleMute();
  menuNav($('#titlemenu'));
}

// ------------------------------------------------------------------ the big flush
let introS = null;
function startIntro() {
  state = 'intro'; newWorld();
  scene.background = new THREE.Color('#d9f1ff'); scene.fog = new THREE.Fog('#d9f1ff', 20, 60);
  const floor = A.part('box', '#c99a6a', 40, 0.2, 40, 0, -1.3, 0, world);
  const wall = A.part('box', '#e8f6ff', 40, 20, 0.4, 0, 8, -6, world);
  const toilet = A.makeToilet(); world.add(toilet);
  const poop = A.makePoop(); A.setOutfit(poop, S.hat, S.face); poop.scale.setScalar(0.9); world.add(poop);
  introS = { t: 0, toilet, poop, flushed: false };
  showOnly(['#intro']); $('#introsay').textContent = ''; $('#intro').style.background = 'transparent';
}
function updateIntro(dt) {
  const s = introS; s.t += dt;
  const u = s.toilet.userData;
  camera.position.set(0, 7.5, 6.5); camera.lookAt(0, 2, 0);
  if (s.t < 1.4) { s.poop.position.set(0.4, 2.0 + Math.sin(s.t * 6) * 0.08, 0.2); s.poop.rotation.y = Math.sin(s.t * 2) * 0.5; $('#introsay').textContent = s.t > 0.4 ? 'La la la...' : ''; $('#introsay').style.color = '#ffffff'; }
  else {
    if (!s.flushed) { s.flushed = true; sfx('flush'); u.handle.rotation.z = -0.5; $('#introsay').textContent = 'FLUSH!'; $('#introsay').style.color = ''; }
    const k = Math.min(1, (s.t - 1.4) / 2.6);
    u.swirl.material.opacity = Math.min(1, (s.t - 1.4) * 2); u.swirl.rotation.z += dt * 6;
    const an = (s.t - 1.4) * 7, r = 1.6 * (1 - k);
    s.poop.position.set(Math.cos(an) * r, 2.0 - k * 1.6, Math.sin(an) * r);
    s.poop.rotation.y = -an; s.poop.scale.setScalar(0.9 * (1 - k * 0.85));
    if (s.t > 2.4) $('#introsay').textContent = 'WHEEEEE!';
    if (s.t > 3.6) $('#intro').style.background = `rgba(43,22,80,${Math.min(1, (s.t - 3.6) / 0.6)})`;
  }
  if (s.t > 4.3 || (s.t > 0.3 && (hit.jump || hit.ok))) { $('#intro').style.background = 'transparent'; startLevel(0); }
}

// ------------------------------------------------------------------ the map with the toilet paper boat
let mapS = null;
const ISLES = LV.map((L, i) => new THREE.Vector3(-27 + i * 9, 0, i % 2 ? -5 : 4));
function openMap(from, to) {
  state = 'map'; overlay = null; G = null; P = null;
  newWorld();
  scene.background = new THREE.Color('#8fd8ff'); scene.fog = new THREE.Fog('#8fd8ff', 30, 90);
  const seaTex = A.TEX.ripple.clone(); seaTex.needsUpdate = true; seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(10, 10);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: '#3a9be0' }));
  sea.rotation.x = -Math.PI / 2; world.add(sea);
  const rip = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ map: seaTex, transparent: true, opacity: 0.5, depthWrite: false }));
  rip.rotation.x = -Math.PI / 2; rip.position.y = 0.02; world.add(rip);
  const labels = [];
  LV.forEach((L, i) => {
    const open = i < S.unlocked, th = THEMES[L.key], p = ISLES[i];
    const isle = new THREE.Group(); isle.position.copy(p); world.add(isle);
    A.part('cyl', open ? th.side : '#7d8696', 6, 1.2, 6, 0, 0.2, 0, isle);
    A.part('cyl', open ? th.top : '#a3abb8', 5.4, 0.3, 5.4, 0, 0.9, 0, isle);
    if (open) isle.add(landmark(L.key));
    else { const q = A.sprite(A.labelTex('?', { size: 80, color: '#ffd23f', w: 128, h: 128 }), 2.4, 2.4); q.position.y = 2.6; isle.add(q); }
    const n = goldIn(L.key);
    if (open) { const lb = A.sprite(A.labelTex(`${n}/${GOLD_TOTAL[i]}`, { bg: n >= GOLD_TOTAL[i] ? '#ffd23f' : '#ffffff', color: '#2b1a10', stroke: false, w: 256, h: 110, size: 64 }), 2.2, 0.95); lb.position.set(0, 5.4, 0); isle.add(lb); }
  });
  for (let i = 0; i < 6; i++) {
    const a = ISLES[i], b = ISLES[i + 1];
    for (let k = 1; k < 6; k++) { const d = A.part('sph', '#ffffff', 0.35, 0.12, 0.35, lerp(a.x, b.x, k / 6), 0.1, lerp(a.z, b.z, k / 6), world); }
  }
  const boat = A.makeBoat(); A.setOutfit(boat.userData.poop, S.hat, S.face); world.add(boat);
  for (let i = 0; i < 6; i++) { const c = A.makeCloud(); c.position.set(rand(-40, 40), rand(12, 18), rand(-30, -10)); world.add(c); }
  mapS = { sel: to, from, to, k: from === to ? 1 : 0, t: 0, boat, seaTex, cam: ISLES[to].clone() };
  showOnly(['#mapui']);
  musicRoot = 262; musicTempo = 0.15;
  if (from !== to) sfx('whoosh');
  mapInfo();
}
function landmark(key) {
  const g = new THREE.Group(); g.position.y = 1;
  if (key === 'toilet') { const t = A.makeToilet(); t.scale.setScalar(0.45); g.add(t); }
  else if (key === 'pipes') { const t = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.4, 8, 20, Math.PI), A.mat('#c8743a')); g.add(t); A.part('cyl', '#c8743a', 0.8, 1.6, 0.8, 1.4, 0, 0, g); }
  else if (key === 'sewer') { const t = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.45, 8, 20, Math.PI), A.mat('#7b6b5a')); g.add(t); A.part('box', '#7ddc3a', 2.4, 0.1, 1.4, 0, 0.05, 0, g); }
  else if (key === 'fans') { A.part('cyl', '#7b8496', 0.3, 3, 0.3, 0, 1.5, 0, g); const f = new THREE.Group(); f.position.y = 3; for (let i = 0; i < 4; i++) { const b = A.part('box', '#c1cad9', 0.4, 1.6, 0.1, 0, 0.8, 0, null); const pv = new THREE.Group(); pv.rotation.z = i * Math.PI / 2; pv.add(b); f.add(pv); } g.add(f); g.userData.spin = f; }
  else if (key === 'plant') { A.part('cyl', '#9fe8df', 2.4, 2.6, 2.4, 0, 1.3, 0, g); A.part('cyl', '#ffffff', 2.6, 0.3, 2.6, 0, 2.6, 0, g); }
  else if (key === 'bigpipe') { const p = A.part('cyl', '#2f9e44', 2.2, 3, 2.2, 0, 1, 0, g); p.rotation.z = Math.PI / 2; }
  else if (key === 'ocean') { g.add(A.makePalm(3)); }
  return g;
}
function mapInfo() {
  const i = mapS.sel, L = LV[i];
  $('#mapname').textContent = `${i + 1}. ${L.name}`;
  $('#mapsub').textContent = `Golden Corn: ${goldIn(L.key)} of ${GOLD_TOTAL[i]}   ·   SPACE to go!`;
  $('#mapL').disabled = i <= 0; $('#mapR').disabled = i >= S.unlocked - 1;
  $('#mapgo').classList.add('sel');
}
$('#mapL').onclick = () => mapMove(-1);
$('#mapR').onclick = () => mapMove(1);
$('#mapgo').onclick = () => { if (mapS && mapS.k >= 1) startLevel(mapS.sel); };
$('#mapcloset').onclick = () => { if (state === 'map') openCloset(); };
$('#maphome').onclick = () => openTitle();
function mapMove(d) {
  if (!mapS || mapS.k < 1) return;
  const n = mapS.sel + d;
  if (n < 0 || n > S.unlocked - 1) { sfx('nope'); if (n > S.unlocked - 1 && n < 7) say('', 0); return; }
  mapS.sel = n; sfx('blip'); mapInfo();
}
function updateMap(dt) {
  const m = mapS; m.t += dt;
  m.seaTex.offset.x += dt * 0.02;
  if (overlay) { updateOverlay(); }
  else {
    if (m.k >= 1) {
      if (hit.left) mapMove(-1);
      if (hit.right) mapMove(1);
      if (hit.closet) openCloset();
      if (hit.esc) { openTitle(); return; }
      if (hit.mute) toggleMute();
      if (hit.jump || hit.ok) { startLevel(m.sel); return; }
    }
  }
  let bp;
  if (m.k < 1) {
    m.k = Math.min(1, m.k + dt * 0.55);
    const a = ISLES[m.from], b = ISLES[m.to];
    bp = new THREE.Vector3(lerp(a.x, b.x, m.k), Math.sin(m.k * Math.PI) * 3, lerp(a.z, b.z, m.k));
    m.boat.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
    if (m.k >= 1) { sfx('fanfare'); mapInfo(); }
  } else {
    const s = ISLES[m.sel];
    bp = m.boat.position.clone().lerp(new THREE.Vector3(s.x + 4, 0, s.z + 3.5), Math.min(1, dt * 4)); bp.y = 0;
    m.boat.rotation.y = lerpAng(m.boat.rotation.y, 0.4, dt * 3);
  }
  m.boat.position.set(bp.x, bp.y + Math.sin(m.t * 2.2) * 0.12, bp.z);
  m.boat.rotation.z = Math.sin(m.t * 1.7) * 0.06;
  m.cam.lerp(m.k < 1 ? bp : ISLES[m.sel], Math.min(1, dt * 3));
  camera.position.set(m.cam.x, 15, m.cam.z + 17); camera.lookAt(m.cam.x, 0, m.cam.z - 1);
  world.traverse(o => { if (o.userData && o.userData.spin && o.userData.spin.isGroup) o.userData.spin.rotation.z += dt * 3; });
}

// ------------------------------------------------------------------ ending
let endS = null;
const ENDINGS = [
  { title: 'BEST FRIENDS!', text: "You're teeny tiny, so a baby fish made you its best friend forever!" },
  { title: 'CRAB RIDE!', text: 'A friendly crab gave you a ride all the way to Sandy Beach!' },
  { title: 'TURTLE TOUR!', text: 'You were so big, a giant sea turtle gave you a ride around the whole ocean!' },
  { title: 'POOP ISLAND!', text: 'You were SO HUGE you turned into POOP ISLAND! A palm tree grows on you and seagulls live on you now.' },
];
function startEnding() {
  state = 'ending'; G = null; P = null; newWorld();
  const tier = S.size <= 2 ? 0 : S.size <= 4 ? 1 : S.size === 5 ? 2 : 3;
  scene.background = new THREE.Color('#ffc99a'); scene.fog = new THREE.Fog('#ffc99a', 40, 140);
  const sea = A.part('box', '#2c8fd6', 300, 0.2, 300, 0, -0.1, 0, world);
  const sunS = A.sprite(A.TEX.glow, 40, 40); sunS.position.set(20, 18, -60); world.add(sunS);
  const poop = A.makePoop(); A.setOutfit(poop, S.hat, S.face); world.add(poop);
  const extra = [];
  if (tier === 0) {
    poop.scale.setScalar(1); poop.position.set(0, 0.1, 0);
    const f = A.makeCapture('fish'); f.scale.setScalar(0.7); world.add(f); extra.push({ m: f, k: 'fish' });
  } else if (tier === 1) {
    const crab = A.makeEnemy('crab'); crab.scale.setScalar(3); world.add(crab); extra.push({ m: crab, k: 'crab' });
    A.part('cyl', '#f0d38a', 18, 0.6, 12, 8, 0.1, -4, world);
    poop.scale.setScalar(1.5); poop.position.set(0, 2.2, 0); crab.add(poop); crab.remove(poop); world.add(poop); extra.push({ m: poop, k: 'rider', on: crab, dy: 2.2 });
  } else if (tier === 2) {
    const turtle = new THREE.Group(); A.part('sph', '#3f9e5a', 5, 1.6, 6, 0, 0.6, 0, turtle); A.part('sph', '#6cc47e', 4.2, 1.2, 5.2, 0, 1.0, 0, turtle); A.part('sph', '#3f9e5a', 1.6, 1.4, 1.8, 0, 0.6, 3.4, turtle);
    for (const s of [-1, 1]) A.part('sph', '#14101f', 0.25, 0.25, 0.25, s * 0.5, 0.9, 4.1, turtle);
    world.add(turtle); extra.push({ m: turtle, k: 'turtle' });
    poop.scale.setScalar(2.2); extra.push({ m: poop, k: 'rider', on: turtle, dy: 1.5 });
  } else {
    A.part('cyl', '#f0d38a', 14, 0.6, 14, 0, 0.1, 0, world);
    poop.scale.setScalar(6); poop.position.set(0, 0.3, 0);
    const palm = A.makePalm(4); palm.position.set(0.3, 6.6, 0); world.add(palm);
    for (let i = 0; i < 3; i++) { const g = A.makeEnemy('gull'); world.add(g); extra.push({ m: g, k: 'gull', a: i * 2.1 }); }
  }
  endS = { t: 0, tier, extra, poop, confirm: false };
  const E = ENDINGS[tier];
  $('#endtitle').textContent = E.title; $('#endtext').textContent = E.text;
  $('#endstats').textContent = `Size: ${S.size} of 6   ·   Golden Corn: ${Object.keys(S.golden).length} of ${ALL_GOLD}   ·   Outfits: ${S.owned.length} of ${CLOSET.length - 1}`;
  $('#endtip').textContent = S.size < 6 ? 'Eat more corn and get bigger for an even better ending!' : 'The biggest, best ending! You did it!';
  $('#endnew').textContent = 'New adventure';
  showOnly(['#ending']); menuSel = 0; markSel($('#ending .menu'));
  sfx('fanfare'); setTimeout(() => sfx('golden'), 700);
  musicRoot = 330; musicTempo = 0.13;
}
$('#endmap').onclick = () => openMap(6, 6);
$('#endnew').onclick = () => {
  if (!endS.confirm) { endS.confirm = true; $('#endnew').textContent = 'Sure? Press again'; sfx('nope'); return; }
  const m = S.muted; S = freshSave(); S.muted = m; persist(); startIntro();
};
function updateEnding(dt) {
  const s = endS; s.t += dt; const t = s.t;
  for (const e of s.extra) {
    if (e.k === 'fish') { const y = Math.abs(Math.sin(t * 1.6)) * 3; e.m.position.set(2.4 + Math.sin(t * 0.8) * 0.5, y, 0); e.m.rotation.z = Math.cos(t * 1.6) * 0.6; e.m.rotation.y = -Math.PI / 2; }
    else if (e.k === 'crab') { e.m.position.set(Math.sin(t * 0.5) * 4, 0, 0); e.m.rotation.y = Math.cos(t * 0.5) > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (e.k === 'turtle') { e.m.position.set(Math.sin(t * 0.3) * 6, Math.sin(t * 1.5) * 0.15, Math.cos(t * 0.3) * 3); e.m.rotation.y = t * 0.3 + Math.PI / 2; }
    else if (e.k === 'rider') { e.m.position.set(e.on.position.x, e.on.position.y + e.dy + Math.abs(Math.sin(t * 4)) * 0.2, e.on.position.z); e.m.rotation.y = e.on.rotation.y; }
    else if (e.k === 'gull') { const a = t * 0.6 + e.a; e.m.position.set(Math.cos(a) * 10, 12 + Math.sin(t * 2 + e.a), Math.sin(a) * 10); e.m.rotation.y = -a; e.m.userData.wings.forEach((w, i) => { w.rotation.z = Math.sin(t * 8) * (i ? 0.5 : -0.5); }); }
  }
  if (s.tier === 0) s.poop.position.y = 0.1 + Math.sin(t * 2) * 0.1;
  const d = s.tier === 3 ? 26 : s.tier === 2 ? 18 : 11, a = t * 0.12;
  camera.position.set(Math.sin(a) * d, d * 0.45, Math.cos(a) * d); camera.lookAt(0, s.tier === 3 ? 4 : 1.5, 0);
  if (hit.left || hit.right || hit.up || hit.down) { menuSel = 1 - menuSel; sfx('blip'); markSel($('#ending .menu')); }
  if (t > 1 && (hit.jump || hit.ok)) menuButtons($('#ending .menu'))[menuSel].click();
}

// ------------------------------------------------------------------ main loop
function update(dt) {
  if (state === 'title') updateTitle(dt);
  else if (state === 'intro') updateIntro(dt);
  else if (state === 'map') updateMap(dt);
  else if (state === 'ending') updateEnding(dt);
  else if (state === 'play') {
    if (hit.mute) toggleMute();
    if (overlay) updateOverlay();
    else if (hit.esc) { overlay = 'pause'; menuSel = 0; showOverlay('#pause'); markSel($('#pause .card')); }
    else if (hit.closet) openCloset();
    else updateLevel(dt);
    if (state === 'play') { syncPlayer(dt); placeCamera(dt); updateHUD(); }
  }
  if (G) updateFloaters(dt); else clearFloaters();
}
let last = performance.now(), acc = 0;
const STEP_T = 1 / 60;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  let n = 0;
  while (acc >= STEP_T && n < 4) {
    update(STEP_T); acc -= STEP_T; n++;
    for (const k in hit) hit[k] = false;
  }
  if (n === 4) acc = 0;
  renderer.render(scene, camera);
  musicTick();
  requestAnimationFrame(frame);
}
function boot() {
  buildIcons();
  toggleMute(); toggleMute();
  openTitle();
  requestAnimationFrame(frame);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot, boot); else boot();

// handy for testing in the browser console
window.__poop = { get G() { return G; }, get P() { return P; }, get S() { return S; }, get state() { return state; }, startLevel, openMap, startEnding, persist, sizePlayer: () => sizePlayer(P) };
})();
