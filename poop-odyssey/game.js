// Super Poop Odyssey: a 3D explore-em-up by Asa, age 6. three.js r128, no other libraries.
// Kingdom layouts live in levels.js (built by tools/levels.py); the models live in art.js.
'use strict';
(function () {
const A = window.ART, LV = window.LEVELS;
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
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 400);
const headLight = new THREE.PointLight('#fff8e8', 0.55, 22); camera.add(headLight);
function resize() {
  const w = holder.clientWidth || innerWidth, h = holder.clientHeight || innerHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
scene.add(new THREE.HemisphereLight('#f2fbff', '#ffcf9a', 0.9));
const sun = new THREE.DirectionalLight('#ffffff', 0.55); sun.position.set(8, 14, 10); scene.add(sun);
let world = null;
function newWorld() { camera.up.set(0, 1, 0); if (world) scene.remove(world); world = new THREE.Group(); scene.add(world); clearFloaters(); }

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
  toilet:  { sky: '#bfe6ff', fog: '#d6efff', floor: '#e8f2ff', wall: '#cfe6fb', ceil: '#f4f8ff', pipe: '#f6f8fc', trim: '#4fa8e8', plat: '#8fd0f7', water: '#4fb0ee', tiles: 'tiles',
             walker: 'tp', flyer: 'fly', swimmer: 'poop', dropper: 'plunger', spinner: 'fan', spike: 'plain', root: 262, tempo: 0.14 },
  pipes:   { sky: '#3a2418', fog: '#4a3020', floor: '#e09656', wall: '#c8743a', ceil: '#9a5a2e', pipe: '#e8a060', trim: '#7a3f17', plat: '#f0aa6a', water: '#4a9ad0', tiles: 'plain',
             walker: 'car', flyer: 'fly', swimmer: 'poop', dropper: 'plunger', spinner: 'fan', spike: 'lego', root: 294, tempo: 0.14 },
  sewer:   { sky: '#1f2a1c', fog: '#2b3a28', floor: '#9a8a70', wall: '#7b6b5a', ceil: '#5a4a3a', pipe: '#8f9a6a', trim: '#7f9a46', plat: '#a89878', water: '#4f8f78', tiles: 'bricks',
             walker: 'poop', flyer: 'fly', swimmer: 'gator', dropper: 'plunger', spinner: 'fan', spike: 'plain', root: 220, tempo: 0.15 },
  fans:    { sky: '#2b3240', fog: '#3a4357', floor: '#b0b9ca', wall: '#8b95a8', ceil: '#6d7689', pipe: '#c1cad9', trim: '#ffcf3f', plat: '#c9d1de', water: '#4fa0e0', tiles: 'plates',
             walker: 'dust', flyer: 'fly', swimmer: 'poop', dropper: 'press', spinner: 'fan', spike: 'grate', root: 247, tempo: 0.13 },
  plant:   { sky: '#16505a', fog: '#1f6470', floor: '#68cfc6', wall: '#3fa6a0', ceil: '#2a7a74', pipe: '#a8efe6', trim: '#ffffff', plat: '#a8efe6', water: '#58c8f0', tiles: 'tiles',
             walker: 'bot', flyer: 'fly', swimmer: 'poop', dropper: 'press', spinner: 'paddle', spike: 'grate', root: 277, tempo: 0.14 },
  bigpipe: { sky: '#2f3d3a', fog: '#3d4f4a', floor: '#98ac9e', wall: '#8fa396', ceil: '#6f7d74', pipe: '#8fa396', trim: '#c96f3a', plat: '#b0906a', water: '#3f8fc8', tiles: 'plates',
             walker: 'crab', flyer: 'fly', swimmer: 'poop', dropper: 'press', spinner: 'fan', spike: 'plain', root: 330, tempo: 0.13 },
  ocean:   { sky: '#9fe2ff', fog: '#bfeaff', floor: '#f2d690', wall: '#f2d690', ceil: '#ffffff', pipe: '#3fbf55', trim: '#ff8fb1', plat: '#8a6a4a', water: '#2c8fd6', tiles: 'sand',
             walker: 'crab', flyer: 'gull', swimmer: 'shark', dropper: 'press', spinner: 'fan', spike: 'urchin', root: 196, tempo: 0.17 },
};

// ------------------------------------------------------------------ save
const SAVE_KEY = 'poop-odyssey-pipes-v1';
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
  loadSamples();
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
// real recordings (CC0, see sounds/CREDITS.md); the made-up sounds above fill in until they load
const SAMPLES = { fart: 7, squish: 3, splash: 2, flush: 1, blub: 1, pop: 1, quack: 1, whoosh: 1, smash: 1, crunch: 1 };
const SAMPLE_VOL = { fart: 1, squish: 1, splash: 1.3, flush: 0.9, blub: 0.8, pop: 0.8, quack: 0.9, whoosh: 0.7, smash: 1.6, crunch: 1.2 };
const BUF = {};
let lastPick = {};
function loadSamples() {
  for (const [name, n] of Object.entries(SAMPLES)) {
    BUF[name] = [];
    for (let i = 1; i <= n; i++) {
      const file = n === 1 ? name : name + i;
      fetch(`sounds/${file}.mp3`).then(r => r.arrayBuffer()).then(ab => AC.decodeAudioData(ab, b => { BUF[name].push(b); }, () => {})).catch(() => {});
    }
  }
}
function playSample(name) {
  const list = BUF[name]; if (!list || !list.length) return false;
  let k = Math.floor(Math.random() * list.length);
  if (list.length > 1 && k === lastPick[name]) k = (k + 1) % list.length;
  lastPick[name] = k;
  const src = AC.createBufferSource(); src.buffer = list[k];
  src.playbackRate.value = name === 'flush' ? 1 : rand(0.9, 1.12);
  const g = AC.createGain(); g.gain.value = SAMPLE_VOL[name] || 1;
  src.connect(g); g.connect(sfxBus); src.start();
  return true;
}
function sfx(n) { if (!AC || S.muted) return; try { if (!playSample(n)) SFX[n](); } catch (e) { /* ignore */ } }
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
  holder.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) { camYawDrag -= (e.clientX - drag.x) * 0.006; camPitchDrag -= (e.clientY - drag.y) * 0.005; drag.x = e.clientX; drag.y = e.clientY; } });
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
  $('#eyes').hidden = !ids.includes('#hud');
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
let camYaw = 0;

// ------------------------------------------------------------------ building a kingdom: rooms joined by round pipes
const V3 = THREE.Vector3;
const EXT = 0.8;            // pipes poke this far into their rooms, so walking from one to the other is smooth
const GRAV = 30, JUMP = 12, FART = 10, SPEED = 6;
function startLevel(i) {
  const L = LV[i], th = THEMES[L.key];
  newWorld();
  G = { i, L, th, time: 0, rooms: [], tubes: [], solids: [], items: [], ents: [], caps: [], doors: [], signs: [], spikes: [], parts: [],
        exit: null, shop: null, zone: null, exiting: 0, hurtT: 0, goldN: 0 };
  const byId = {};
  for (const r of L.rooms) { const rm = { id: r.id, min: new V3(...r.min), max: new V3(...r.max), water: r.water, open: r.open, tubes: [] }; G.rooms.push(rm); byId[r.id] = rm; }
  for (const t of L.tubes) {
    const p0 = new V3(...t.p0), p1 = new V3(...t.p1), d = p1.clone().sub(p0), len = d.length();
    const tb = { id: t.id, a: byId[t.a], b: byId[t.b], p0, p1, dir: d.normalize(), len, r: t.r, axis: t.axis, req: t.req,
                 water: t.water, cur: t.cur ? new V3(...t.cur) : null, wind: t.wind, goo: t.req === 'duck' };
    G.tubes.push(tb); tb.a.tubes.push(tb); tb.b.tubes.push(tb);
  }
  G.vols = [...G.rooms.map(r => ({ room: r })), ...G.tubes.map(t => ({ tube: t }))];
  scene.background = new THREE.Color(th.sky);
  scene.fog = new THREE.Fog(th.fog, L.key === 'ocean' ? 25 : 8, L.key === 'ocean' ? 150 : 65);
  G.mats = {
    floor: new THREE.MeshLambertMaterial({ color: th.floor, map: tiles(th.tiles, 0.5) }),
    wall: new THREE.MeshLambertMaterial({ color: th.wall, map: tiles(th.tiles, 0.5) }),
    ceil: new THREE.MeshLambertMaterial({ color: th.ceil, map: tiles('plain', 0.35) }),
  };
  G.rooms.forEach(buildRoom);
  G.tubes.forEach(buildTube);
  if (L.key === 'ocean') buildSea();
  for (const s of L.solids) addSolid(s);
  for (const o of L.objs) spawn(o);
  P = makePlayer(G.start);
  camYaw = 0; camPitch = 0;
  state = 'play'; overlay = null;
  showOnly(['#hud']); hudCache = ''; $('#eyes').hidden = false;
  musicRoot = th.root; musicTempo = th.tempo;
  S.started = true; persist();
  say(L.final ? 'The ocean! Swim around, then find the beach umbrella on the sandy island.' : `Welcome to the ${L.name}! Find ${L.needed} Golden Corn, then jump into the big green exit pipe.`, 4.5);
}
const texCache = {};
function tiles(kind, rep) {
  const t = A.tileTex(kind); t.repeat.set(rep, rep); return t;
}
function pipeTex(len) {
  const t = A.canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.13)'; g.fillRect(0, 0, w, 14);
    g.fillStyle = 'rgba(255,255,255,1)'; g.fillRect(0, 14, w, 6);
    g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, 70, w, 40);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, Math.max(1, Math.round(len / 2.2)));
  return t;
}
// each room is six tiled faces with round holes wherever a pipe comes in
const FACES = {
  floor: { U: [1, 0, 0], V: [0, 0, -1], N: [0, 1, 0] },
  ceil: { U: [1, 0, 0], V: [0, 0, 1], N: [0, -1, 0] },
  north: { U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1] },
  south: { U: [-1, 0, 0], V: [0, 1, 0], N: [0, 0, -1] },
  west: { U: [0, 0, -1], V: [0, 1, 0], N: [1, 0, 0] },
  east: { U: [0, 0, 1], V: [0, 1, 0], N: [-1, 0, 0] },
};
function faceOrigin(rm, f) {
  return { floor: [0, rm.min.y, 0], ceil: [0, rm.max.y, 0], north: [0, 0, rm.min.z], south: [0, 0, rm.max.z], west: [rm.min.x, 0, 0], east: [rm.max.x, 0, 0] }[f];
}
function tubeFace(rm, tb) {
  const lo = tb.a === rm;   // the pipe starts at p0 on the "low" room's far face
  if (tb.axis === 'x') return lo ? 'east' : 'west';
  if (tb.axis === 'z') return lo ? 'south' : 'north';
  return lo ? 'ceil' : 'floor';
}
function buildRoom(rm) {
  const th = G.th;
  for (const f of Object.keys(FACES)) {
    if (rm.open && f !== 'floor') continue;
    const F = FACES[f], U = new V3(...F.U), Vv = new V3(...F.V), N = new V3(...F.N), O = new V3(...faceOrigin(rm, f));
    const corners = [rm.min, rm.max, new V3(rm.min.x, rm.max.y, rm.max.z), new V3(rm.max.x, rm.min.y, rm.min.z)].map(c => [c.dot(U), c.dot(Vv)]);
    const us = corners.map(c => c[0]), vs = corners.map(c => c[1]);
    const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
    const shape = new THREE.Shape(); shape.moveTo(u0, v0); shape.lineTo(u1, v0); shape.lineTo(u1, v1); shape.lineTo(u0, v1); shape.lineTo(u0, v0);
    const holes = [];
    for (const tb of rm.tubes) {
      if (tubeFace(rm, tb) !== f) continue;
      const c = tb.a === rm ? tb.p0 : tb.p1;
      const hc = [c.dot(U), c.dot(Vv)];
      const hole = new THREE.Path(); hole.absarc(hc[0], hc[1], tb.r, 0, Math.PI * 2, true); shape.holes.push(hole);
      holes.push({ c, tb });
    }
    const geo = new THREE.ShapeGeometry(shape, 24);
    const m4 = new THREE.Matrix4().makeBasis(U, Vv, N); m4.setPosition(O.clone().sub(new V3()));
    // ShapeGeometry is drawn in the XY plane; makeBasis maps (u, v, 0) into the face, then the origin moves it onto the wall
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(U, Vv, N));
    geo.translate(O.x, O.y, O.z);
    const mat = f === 'floor' ? G.mats.floor : f === 'ceil' ? G.mats.ceil : G.mats.wall;
    world.add(new THREE.Mesh(geo, mat));
    for (const h of holes) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(h.tb.r + 0.12, 0.2, 8, 32), A.mat(th.trim));
      rim.position.copy(h.c).addScaledVector(N, 0.06);
      rim.lookAt(rim.position.clone().add(N));
      world.add(rim);
    }
  }
  // a baseboard and a ceiling lamp make the room feel like a cosy toy room
  if (!rm.open) {
    const cx = (rm.min.x + rm.max.x) / 2, cz = (rm.min.z + rm.max.z) / 2, w = rm.max.x - rm.min.x, d = rm.max.z - rm.min.z;
    const lamp = A.part('cyl', '#fff6c0', Math.min(2, w * 0.3), 0.16, Math.min(2, d * 0.3), cx, rm.max.y - 0.06, cz, world, { emissive: '#fff0a0', emissiveIntensity: 0.9 });
    const hasHole = rm.tubes.some(tb => tb.axis === 'y' && tb.a === rm);
    if (hasHole) lamp.visible = false;
    for (const [x, z, sw, sd] of [[cx, rm.min.z + 0.08, w, 0.16], [cx, rm.max.z - 0.08, w, 0.16], [rm.min.x + 0.08, cz, 0.16, d], [rm.max.x - 0.08, cz, 0.16, d]]) {
      A.part('box', th.trim, sw, 0.35, sd, x, rm.min.y + 0.17, z, world);
    }
  }
  if (rm.water !== null && rm.water !== undefined && !rm.open) addWaterBox(rm.min.x, rm.max.x, rm.min.z, rm.max.z, rm.water, false);
}
function buildTube(tb) {
  const th = G.th;
  const geo = new THREE.CylinderGeometry(tb.r, tb.r, tb.len, 32, 1, true);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: th.pipe, map: pipeTex(tb.len), side: THREE.BackSide }));
  m.position.copy(tb.p0).add(tb.p1).multiplyScalar(0.5);
  if (tb.axis === 'x') m.rotation.z = Math.PI / 2;
  if (tb.axis === 'z') m.rotation.x = Math.PI / 2;
  world.add(m);
  // ribs every few steps help you feel how fast you're going
  for (let s = 2.5; s < tb.len - 1; s += 3) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(tb.r - 0.05, 0.09, 6, 32), A.mat(th.trim));
    rib.position.copy(tb.p0).addScaledVector(tb.dir, s);
    rib.lookAt(rib.position.clone().add(tb.dir));
    world.add(rib);
  }
  if (tb.water !== null && tb.water !== undefined && tb.axis !== 'y') {
    const dy = tb.water - tb.p0.y, half = Math.sqrt(Math.max(0.01, tb.r * tb.r - dy * dy));
    if (tb.axis === 'x') addWaterBox(tb.p0.x - EXT, tb.p1.x + EXT, tb.p0.z - half, tb.p0.z + half, tb.water, tb.goo);
    else addWaterBox(tb.p0.x - half, tb.p0.x + half, tb.p0.z - EXT, tb.p1.z + EXT, tb.water, tb.goo);
  }
}
function addWaterBox(x0, x1, z0, z1, y, goo) {
  const mat = goo ? new THREE.MeshLambertMaterial({ color: '#7ddc3a', emissive: '#2a5a00', transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false })
                  : new THREE.MeshLambertMaterial({ color: G.th.water, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
  pl.rotation.x = -Math.PI / 2; pl.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); pl.renderOrder = 3; world.add(pl);
  if (!G.ripple) { G.ripple = A.TEX.ripple.clone(); G.ripple.needsUpdate = true; G.ripple.wrapS = G.ripple.wrapT = THREE.RepeatWrapping; G.ripple.repeat.set(0.25, 0.25); }
  const rp = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ map: G.ripple, transparent: true, opacity: goo ? 0.35 : 0.5, depthWrite: false, color: goo ? '#d8ff9a' : '#ffffff' }));
  rp.rotation.x = -Math.PI / 2; rp.position.set((x0 + x1) / 2, y + 0.02, (z0 + z1) / 2); rp.renderOrder = 4; world.add(rp);
  // planes have world-sized UVs so ripples line up
  const uv = rp.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 4, uv.getY(i) * (z1 - z0) / 4);
}
function buildSea() {
  const rm = G.rooms.find(r => r.open);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: G.th.floor, map: tiles('sand', 150) }));
  sand.rotation.x = -Math.PI / 2; sand.position.y = rm.min.y - 0.01; world.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: G.th.water, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = rm.water; sea.renderOrder = 3; world.add(sea);
  G.ripple = A.TEX.ripple.clone(); G.ripple.needsUpdate = true; G.ripple.wrapS = G.ripple.wrapT = THREE.RepeatWrapping; G.ripple.repeat.set(80, 80);
  const rp = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ map: G.ripple, transparent: true, opacity: 0.5, depthWrite: false }));
  rp.rotation.x = -Math.PI / 2; rp.position.y = rm.water + 0.03; rp.renderOrder = 4; world.add(rp);
  for (let i = 0; i < 10; i++) { const c = A.makeCloud(); c.position.set(rand(-120, 120), rand(28, 40), rand(-120, 60)); c.scale.setScalar(rand(1.2, 2.2)); world.add(c); G.ents.push({ k: 'cloud', m: c }); }
  const sunS = A.sprite(A.TEX.glow, 50, 50); sunS.position.set(80, 70, -120); world.add(sunS);
  for (let i = 0; i < 50; i++) {
    const x = rand(-42, 42), z = rand(-42, 42);
    if (x > 18 && z < -18) continue;
    const sw = new THREE.Group(); sw.position.set(x, rm.min.y, z); const len = rand(2, 6);
    A.part('box', ['#2fae6b', '#3fc27a', '#1f8f55'][i % 3], 0.35, len, 0.14, 0, len / 2, 0, sw); world.add(sw);
    G.ents.push({ k: 'kelp', m: sw, ph: rand(0, 6) });
  }
  for (let i = 0; i < 20; i++) A.part('sphLo', ['#ff8fb1', '#ffb36b', '#c08aff'][i % 3], rand(1, 2.4), rand(1, 3), rand(1, 2.4), rand(-40, 15), rm.min.y + 0.6, rand(-15, 40), world);
  const palm = A.makePalm(5); palm.position.set(41, 1, -41); world.add(palm);
  const palm2 = A.makePalm(4); palm2.position.set(26, 1, -42); world.add(palm2);
}
function addSolid(s) {
  const mn = new V3(...s.min), mx = new V3(...s.max);
  const sol = { min: mn, max: mx, ghost: !!s.ghost, crack: !!s.crack };
  let mat;
  if (s.ghost) mat = new THREE.MeshLambertMaterial({ map: A.TEX.ghost, transparent: true, opacity: 0.35, depthWrite: false });
  else if (s.crack) mat = new THREE.MeshLambertMaterial({ color: '#e8c9a0', map: A.TEX.crack });
  else if (s.island || s.beach) mat = new THREE.MeshLambertMaterial({ color: '#f2d690', map: tiles('sand', 0.5) });
  else if (s.coral) mat = A.mat('#ff8fb1');
  else if (s.ship) mat = A.mat('#8a5a2b');
  else mat = new THREE.MeshLambertMaterial({ color: s.color || G.th.plat, map: tiles('plain', 0.5) });
  const m = new THREE.Mesh(A.GEO.box, mat);
  m.scale.copy(mx.clone().sub(mn)); m.position.copy(mn).add(mx).multiplyScalar(0.5);
  world.add(m); sol.mesh = m;
  G.solids.push(sol);
  return sol;
}

// ------------------------------------------------------------------ things in the kingdom
const FACE = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
function spawn(o) {
  const th = G.th, L = G.L;
  const p = new V3(...o.p);
  switch (o.kind) {
    case 'start': G.start = p; break;
    case 'corn': { const m = A.makeCorn(); m.position.copy(p); world.add(m); G.items.push({ k: 'corn', m, p, ph: rand(0, 6) }); break; }
    case 'gold': {
      const id = `${L.key}:${G.goldN++}`, got = !!S.golden[id];
      const m = A.makeGold(got); m.position.copy(p); world.add(m);
      G.items.push({ k: 'gold', m, p, id, got, ph: rand(0, 6) }); break;
    }
    case 'treasure': {
      if (owns(o.outfit)) break;
      const m = A.makePresent(); m.position.copy(p); world.add(m);
      const gl = A.sprite(A.TEX.glow, 3, 3); gl.material.color.set('#ffb3e6'); gl.position.y = 0.5; m.add(gl);
      G.items.push({ k: 'treasure', m, p, outfit: o.outfit, ph: 0, ground: true }); break;
    }
    case 'sign': {
      const m = A.makeSign(); m.position.copy(p); world.add(m);
      const rm = roomAt(p);
      if (rm) m.rotation.y = Math.atan2((rm.min.x + rm.max.x) / 2 - p.x, (rm.min.z + rm.max.z) / 2 - p.z);
      G.signs.push({ p, text: o.text }); break;
    }
    case 'door': {
      const id = `${L.key}:door`, f = FACE[o.face || 's'];
      const tex = new THREE.TextureLoader().load(poopThumb(OUTFITS[o.outfit].slot === 'hat' ? o.outfit : null, OUTFITS[o.outfit].slot === 'face' ? o.outfit : null, 160));
      const m = A.makeDoor(tex); m.position.copy(p); m.rotation.y = Math.atan2(f[0], f[1]); world.add(m);
      const d = { p, outfit: o.outfit, id, open: !!S.golden[id], m, front: p.clone().add(new V3(f[0], 0, f[1])) };
      if (d.open) openDoorLook(d);
      G.doors.push(d);
      const hw = f[0] ? 0.25 : 0.9, hd = f[0] ? 0.9 : 0.25;
      G.solids.push({ min: new V3(p.x - hw, p.y, p.z - hd), max: new V3(p.x + hw, p.y + 2.6, p.z + hd) });
      break;
    }
    case 'shop': {
      const f = FACE[o.face || 's'];
      const m = A.makeShop(); m.position.copy(p); m.rotation.y = Math.atan2(f[0], f[1]); world.add(m);
      G.shop = { p, m, front: p.clone().add(new V3(f[0] * 2.1, 0, f[1] * 2.1)) };
      const c = p.clone().add(new V3(f[0] * 0.6, 0, f[1] * 0.6)), hw = f[0] ? 0.5 : 1.3, hd = f[0] ? 1.3 : 0.5;
      G.solids.push({ min: new V3(c.x - hw, p.y, c.z - hd), max: new V3(c.x + hw, p.y + 1.1, c.z + hd) });
      break;
    }
    case 'exit': {
      const m = A.makeExit(L.final); m.position.copy(p); world.add(m);
      G.exit = { p, m };
      if (!L.final) { G.exit.sol = { min: new V3(p.x - 1.05, p.y, p.z - 1.05), max: new V3(p.x + 1.05, p.y + 1.8, p.z + 1.05) }; G.solids.push(G.exit.sol); }
      updateExitLabel(); break;
    }
    case 'walker': {
      const m = A.makeEnemy(th.walker); m.position.copy(p); world.add(m);
      G.ents.push({ k: 'walker', m, pos: p.clone().setY(p.y + 0.45), vel: new V3(), r: 0.45, home: p.clone(), yaw: rand(0, 6), turnT: 0, stomp: true });
      break;
    }
    case 'flyer': {
      const m = A.makeEnemy(th.flyer); world.add(m);
      const y0 = p.y + (o.p[1] === p.y && roomAt(p) && Math.abs(roomAt(p).min.y - p.y) < 0.1 ? 2.4 : 0);
      G.ents.push({ k: 'flyer', m, c: p.clone().setY(y0), pos: p.clone().setY(y0), a: rand(0, 6), rad: 2.2, r: 0.45, stomp: true });
      break;
    }
    case 'drip': {
      const m = A.makeEnemy('drip'); world.add(m);
      const sh = shadowBlob(0.8); world.add(sh);
      const fl = floorBelow(p);
      G.ents.push({ k: 'drip', m, sh, top: p.clone(), pos: p.clone(), floor: fl, vy: 0, wait: rand(0, 2), r: 0.3 });
      break;
    }
    case 'dropper': {
      const m = A.makeEnemy(th.dropper); world.add(m);
      const rm = roomAt(p), y0 = (rm ? rm.max.y : p.y + 6) - 1.2;
      m.position.set(p.x, y0, p.z);
      const sh = shadowBlob(1.4); sh.position.set(p.x, p.y + 0.03, p.z); world.add(sh);
      G.ents.push({ k: 'drop', m, sh, pos: new V3(p.x, y0, p.z), g: p.y, y0, vy: 0, st: 'wait', tm: 0 });
      break;
    }
    case 'spinner': {
      const skin = o.skin || th.spinner;
      if (o.axis === 'y') {
        const R = o.r || 3, m = new THREE.Group(); m.position.copy(p); world.add(m);
        const bar = A.makeSpinBar(skin, R); m.add(bar);
        A.part('cyl', '#ffcf3f', 0.6, 0.5, 0.6, 0, 0, 0, m);
        G.ents.push({ k: 'spinY', m, bar, pos: p.clone(), a: rand(0, 6), R, sp: 1.0 });
      } else {
        const tb = G.tubes.find(t => tubeContains(t, p, 0));
        const t = p.clone().sub(tb.p0).dot(tb.dir), c = tb.p0.clone().addScaledVector(tb.dir, t);
        const m = new THREE.Group(); m.position.copy(c); m.lookAt(c.clone().add(tb.dir)); world.add(m);
        const blades = new THREE.Group(); m.add(blades);
        A.part('box', '#c1cad9', tb.r * 2 - 0.1, 0.42, 0.14, 0, 0, 0, blades);
        A.part('box', '#e3242b', 0.5, 0.44, 0.16, tb.r - 0.35, 0, 0, blades); A.part('box', '#e3242b', 0.5, 0.44, 0.16, -tb.r + 0.35, 0, 0, blades);
        A.part('cyl', '#ffcf3f', 0.5, 0.3, 0.5, 0, 0, 0, blades).rotation.x = Math.PI / 2;
        G.ents.push({ k: 'fan', m, blades, tb, t, c, a: rand(0, 6), sp: 1.25 });
      }
      break;
    }
    case 'swimmer': case 'shark': case 'jelly': {
      const skin = o.kind === 'shark' ? 'shark' : o.kind === 'jelly' ? 'jelly' : th.swimmer;
      const m = A.makeEnemy(skin); world.add(m);
      const big = o.kind === 'shark';
      G.ents.push({ k: o.kind === 'jelly' ? 'jelly' : 'swim', m, c: p.clone(), pos: p.clone(), a: rand(0, 6), rad: o.rad || (big ? 7 : 3), sp: big ? 0.3 : 0.5, r: big ? 1.4 : 0.6 });
      break;
    }
    case 'spikes': {
      let mn, mx;
      if (o.len) { const ax = o.axis === 'x'; mn = new V3(p.x - (ax ? o.len / 2 : 1.1), p.y - 0.8, p.z - (ax ? 1.1 : o.len / 2)); mx = new V3(p.x + (ax ? o.len / 2 : 1.1), p.y, p.z + (ax ? 1.1 : o.len / 2)); }
      else { mn = new V3(p.x - o.w / 2, p.y, p.z - o.d / 2); mx = new V3(p.x + o.w / 2, p.y + 0.6, p.z + o.d / 2); }
      G.spikes.push({ min: mn, max: mx });
      addSpikeArt(mn, mx, o.len ? p.y - 0.7 : p.y);
      break;
    }
    case 'duck': case 'bubble': case 'roll': case 'fish': {
      const m = A.makeCapture(o.kind); world.add(m);
      const r = o.kind === 'bubble' ? 0.9 : 0.6;
      const c = { type: o.kind, m, home: p.clone().setY(p.y + r), pos: p.clone().setY(p.y + r), vel: new V3(), r, hidden: false, back: 0, yaw: 0 };
      G.caps.push(c); break;
    }
  }
}
function addSpikeArt(mn, mx, y) {
  const kind = G.th.spike;
  const w = mx.x - mn.x, d = mx.z - mn.z;
  if (kind === 'lego') {
    const cols = ['#e3242b', '#0a6cd6', '#ffcd03', '#2f9e44'];
    let i = 0;
    for (let x = mn.x + 0.5; x < mx.x; x += 1) for (let z = mn.z + 0.5; z < mx.z; z += 1) {
      const c = cols[i++ % 4];
      A.part('box', c, 0.9, 0.4, 0.9, x, y + 0.2, z, world);
      for (const sx of [-0.22, 0.22]) for (const sz of [-0.22, 0.22]) A.part('cyl', c, 0.24, 0.16, 0.24, x + sx, y + 0.47, z + sz, world);
    }
  } else {
    for (let x = mn.x + 0.3; x < mx.x; x += 0.55) for (let z = mn.z + 0.3; z < mx.z; z += 0.55) A.part('cone', kind === 'grate' ? '#d6dce6' : '#d0d4dc', 0.3, 0.6, 0.3, x, y + 0.3, z, world);
  }
}
function shadowBlob(s) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: A.TEX.shadow, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(s, s, 1); m.renderOrder = 1;
  return m;
}
function openDoorLook(d) { d.m.userData.door.material = A.mat('#ffe066'); d.m.userData.top.material = A.mat('#ffe066'); }
function updateExitLabel() {
  if (!G.exit) return;
  const got = goldIn(G.L.key), open = got >= G.L.needed || S.beaten[G.L.key];
  A.setLabel(G.exit.m.userData.label, open ? (G.L.final ? 'BEACH!' : 'GO!') : `${got}/${G.L.needed}`, open ? '#9cff7a' : '#ffffff');
}

// ------------------------------------------------------------------ where can you be? inside a room box or a pipe
function roomContains(rm, c, pr) {
  return c.x >= rm.min.x + pr && c.x <= rm.max.x - pr && c.z >= rm.min.z + pr && c.z <= rm.max.z - pr && c.y >= rm.min.y + pr && (rm.open || c.y <= rm.max.y - pr);
}
// tall pipes reach further down into the room below, so jumping under one puts you "in" it
const extLo = tb => tb.axis === 'y' ? 2.6 : EXT;
function tubeContains(tb, c, pr) {
  const v = c.clone().sub(tb.p0), t = v.dot(tb.dir);
  if (t < -extLo(tb) || t > tb.len + EXT) return false;
  return v.addScaledVector(tb.dir, -t).length() <= tb.r - pr;
}
function projRoom(rm, c, pr) {
  return new V3(clamp(c.x, rm.min.x + pr, rm.max.x - pr), Math.max(c.y, rm.min.y + pr) - (rm.open ? 0 : Math.max(0, c.y - (rm.max.y - pr))), clamp(c.z, rm.min.z + pr, rm.max.z - pr));
}
function projTube(tb, c, pr) {
  const v = c.clone().sub(tb.p0); let t = v.dot(tb.dir);
  const rad = v.addScaledVector(tb.dir, -t);
  t = clamp(t, -extLo(tb), tb.len + EXT);
  const rl = rad.length(), lim = tb.r - pr;
  if (rl > lim) rad.multiplyScalar(lim / rl);
  return tb.p0.clone().addScaledVector(tb.dir, t).add(rad);
}
function roomAt(c) { return G.rooms.find(r => roomContains(r, c, 0)) || null; }
function volsAt(c, pr) {
  const out = [];
  for (const rm of G.rooms) if (roomContains(rm, c, pr)) out.push({ room: rm });
  for (const tb of G.tubes) if (tubeContains(tb, c, pr)) out.push({ tube: tb });
  return out;
}
function floorBelow(p) {
  const rm = roomAt(p);
  if (rm) { let y = rm.min.y; for (const s of G.solids) if (p.x > s.min.x && p.x < s.max.x && p.z > s.min.z && p.z < s.max.z && s.max.y <= p.y) y = Math.max(y, s.max.y); return y; }
  const tb = G.tubes.find(t => tubeContains(t, p, 0));
  if (tb && tb.axis !== 'y') { const v = p.clone().sub(tb.p0), t = v.dot(tb.dir); const rad = v.addScaledVector(tb.dir, -t); const side = tb.axis === 'x' ? rad.z : rad.x; return tb.p0.y - Math.sqrt(Math.max(0, tb.r * tb.r - side * side)); }
  return p.y - 10;
}
// keep a ball inside the rooms and pipes, and out of solid boxes
function constrain(b, o = {}) {
  b.onGround = false; b.hitWall = false;
  for (let iter = 0; iter < 2; iter++) {
    let inside = false;
    for (const v of G.vols) if (v.room ? roomContains(v.room, b.pos, b.r) : tubeContains(v.tube, b.pos, b.r)) { inside = true; break; }
    if (inside) break;
    let best = null, bd = 1e9;
    for (const v of G.vols) {
      const q = v.room ? projRoom(v.room, b.pos, b.r) : projTube(v.tube, b.pos, b.r);
      let d = q.distanceToSquared(b.pos);
      // a small push straight up is a step, so take it before being pushed back
      const up = q.y - b.pos.y;
      if (up > 0 && up < 0.45 && up * up > d * 0.6) d *= 0.05;
      if (d < bd) { bd = d; best = q; }
    }
    const n = best.clone().sub(b.pos);
    const l = n.length();
    if (l < 1e-6) break;
    n.divideScalar(l);
    b.pos.copy(best);
    const vn = b.vel.dot(n); if (vn < 0) b.vel.addScaledVector(n, -vn);
    if (n.y > 0.55) b.onGround = true; else if (n.y > -0.5) b.hitWall = true;
  }
  for (const s of G.solids) {
    if (s.ghost && S.face !== 'goggles') continue;
    if (s.gone) continue;
    const q = new V3(clamp(b.pos.x, s.min.x, s.max.x), clamp(b.pos.y, s.min.y, s.max.y), clamp(b.pos.z, s.min.z, s.max.z));
    const n = b.pos.clone().sub(q); let l = n.length();
    if (l >= b.r) continue;
    if (s.crack && o.breakC) { smash(s); continue; }
    if (l < 1e-6) { n.set(0, 1, 0); b.pos.y = s.max.y + b.r; }
    else { n.divideScalar(l); b.pos.copy(q).addScaledVector(n, b.r); }
    const vn = b.vel.dot(n); if (vn < 0) b.vel.addScaledVector(n, -vn);
    if (n.y > 0.55) { b.onGround = true; b.onSolid = s; } else b.hitWall = true;
  }
}
function waterAt(c) {
  let wl = null, goo = false;
  for (const rm of G.rooms) if (rm.water !== null && rm.water !== undefined && roomContains(rm, c, 0)) wl = Math.max(wl === null ? -1e9 : wl, rm.water);
  for (const tb of G.tubes) if (tb.water !== null && tb.water !== undefined && tubeContains(tb, c, 0)) { if (wl === null || tb.water > wl) { wl = tb.water; goo = tb.goo; } }
  return { wl, goo };
}
function inVertical(c, pr) { return G.tubes.find(tb => tb.axis === 'y' && tubeContains(tb, c, Math.min(pr, tb.r - 0.2))) || null; }
function smash(s) {
  if (s.gone) return;
  s.gone = true; world.remove(s.mesh);
  const c = s.min.clone().add(s.max).multiplyScalar(0.5);
  for (let i = 0; i < 12; i++) {
    const m = A.part('box', '#e8c9a0', rand(0.3, 0.6), rand(0.3, 0.6), rand(0.3, 0.6), c.x + rand(-1, 1), c.y + rand(-1, 1), c.z + rand(-1, 1), world);
    G.parts.push({ m, v: new V3(rand(-5, 5), rand(3, 8), rand(-5, 5)), life: 1.2, grav: true, spin: true });
  }
  sfx('smash'); shake = 0.3;
}

// ------------------------------------------------------------------ you (a pair of eyes in a poop)
function pRadius() { return 0.34 + (S.size - 1) * 0.05; }
function makePlayer(at) {
  const m = A.makePoop(); m.visible = false;          // kept for the closet code; you never see yourself
  const p = { m, pos: at.clone(), vel: new V3(), r: pRadius(), yaw: 0, onGround: false, canFart: true, inv: 0, mode: 'poop', cap: null, capCool: 0,
              coyote: 0, jbuf: 0, swim: false, blink: 2.5, bob: 0, look: 0 };
  p.pos.y = Math.max(p.pos.y, at.y);
  return p;
}
function sizePlayer(p) { if (p && p.mode === 'poop') p.r = pRadius(); }
function moveInput() {
  let f = 0, s = 0, turn = 0;
  if (keys.up) f += 1; if (keys.down) f -= 1; if (keys.right) turn -= 1; if (keys.left) turn += 1;
  if (keys.camL) s -= 1; if (keys.camR) s += 1;
  if (joy.id !== null) { f -= joy.y; turn -= joy.x * 0.9; }
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
  return { x: fx * f + rx * s, z: fz * f + rz * s, f, s, turn, mag: Math.min(1, Math.hypot(f, s)) };
}
function updatePlayer(dt) {
  const p = P;
  if (p.inv > 0) p.inv -= dt;
  if (p.capCool > 0) p.capCool -= dt;
  if (G.hurtT > 0) G.hurtT -= dt;
  if (G.exiting) return;
  const mv = moveInput();
  camYaw += mv.turn * 2.3 * dt;
  if (hit.jump) p.jbuf = 0.15; else p.jbuf = Math.max(0, p.jbuf - dt);
  if (p.mode !== 'poop' && hit.out) { releaseCap(false); return; }
  const { wl, goo } = waterAt(p.pos);
  const water = wl !== null && !goo && p.pos.y < wl - 0.05;
  const vt = inVertical(p.pos, p.r);
  const wasSwim = p.swim; p.swim = false;
  const v = p.vel;
  if (p.mode === 'poop' || p.mode === 'roll' || p.mode === 'fish') {
    const sp = p.mode === 'roll' ? 10 : p.mode === 'fish' && water ? 10 : water ? 4.2 : SPEED;
    const acc = p.onGround || water ? (p.mode === 'roll' ? 3 : 12) : 5;
    v.x = lerp(v.x, mv.x * sp, Math.min(1, acc * dt)); v.z = lerp(v.z, mv.z * sp, Math.min(1, acc * dt));
    if (p.mode === 'roll' && water) { releaseCap(false); floatText('Soggy!', p.pos.clone().setY(p.pos.y + 1.5), '#bfe3ff'); return; }
    if (water) {
      p.swim = true;
      if (!wasSwim && v.y < -3) { sfx('splash'); splash(p.pos, wl); }
      v.y = Math.max(v.y - 7 * dt, -2.6); v.y *= 1 - 1.5 * dt;
      if (keys.jump) v.y = Math.min(v.y + (p.mode === 'fish' ? 24 : 16) * dt, p.mode === 'fish' ? 6 : 4);
      p.canFart = true;
      if (p.jbuf > 0 && p.pos.y > wl - p.r - 0.35) { v.y = 11; p.jbuf = 0; sfx('splash'); splash(p.pos, wl); }
      if (Math.random() < 0.04) bubbleP(p.pos.clone().add(new V3(rand(-0.3, 0.3), 0, rand(-0.3, 0.3))));
    } else {
      v.y -= (vt ? 20 : GRAV) * dt; if (v.y < -24) v.y = -24;
      if (p.onGround) { p.coyote = 0.12; p.canFart = true; } else p.coyote -= dt;
      if (p.jbuf > 0) {
        if (p.coyote > 0) { v.y = p.mode === 'fish' ? 6 : JUMP; p.coyote = 0; p.jbuf = 0; sfx(p.mode === 'fish' ? 'blub' : 'jump'); }
        else if (p.mode !== 'poop') { releaseCap(false); return; }
        else if (p.canFart || vt) { v.y = vt ? Math.max(v.y, 0) + 8.5 : FART; p.canFart = false; p.jbuf = 0; sfx('fart'); fartPuff(p); fartBlast(p); }
      }
    }
  } else if (p.mode === 'duck') {
    const lt = wl;
    const afloat = lt !== null && p.pos.y < lt + 0.15;
    if (afloat) { v.y += 30 * dt + (lt + 0.05 - p.pos.y) * 12 * dt; v.y *= 1 - 4 * dt; } else v.y -= GRAV * dt;
    const sp = afloat ? 9 : 4.5;
    v.x = lerp(v.x, mv.x * sp, Math.min(1, 4 * dt)); v.z = lerp(v.z, mv.z * sp, Math.min(1, 4 * dt));
    if (p.jbuf > 0) {
      if (p.onGround || afloat) { v.y = 10; p.jbuf = 0; sfx('quack'); }
      else { releaseCap(false); return; }
    }
  } else if (p.mode === 'bubble') {
    v.y = lerp(v.y, 3, Math.min(1, 2 * dt));
    v.x = lerp(v.x, mv.x * 5, Math.min(1, 4 * dt)); v.z = lerp(v.z, mv.z * 5, Math.min(1, 4 * dt));
    if (p.jbuf > 0) { p.jbuf = 0; releaseCap(false); return; }
  }
  // popping out of the top of a tall pipe: hop forward onto the floor instead of falling back in
  if (vt && v.y > 0 && p.pos.y > vt.p1.y - 0.6 && !(p.popT > 0)) { p.popT = 0.8; p.popTop = vt.p1.y; }
  if (p.popT > 0) {
    p.popT -= dt;
    if (p.pos.y < p.popTop + p.r + 0.25) v.y = Math.max(v.y, 6);
    else { v.x = -Math.sin(camYaw) * 5; v.z = -Math.cos(camYaw) * 5; }
    if (p.onGround) p.popT = 0;
  }
  // wind pipes blow you up
  if (vt && vt.wind && p.mode !== 'roll') { v.y = lerp(v.y, 9, Math.min(1, 4 * dt)); p.canFart = true; }
  for (const tb of G.tubes) if (tb.wind && tubeContains(tb, p.pos.clone().setY(p.pos.y + 2.5), 0) && p.pos.y < tb.p0.y) v.y += 40 * dt;
  // rushing water carries you
  for (const tb of G.tubes) if (tb.cur && tb.water !== null && p.pos.y < tb.water + 0.3 && tubeContains(tb, p.pos, 0)) p.pos.addScaledVector(tb.cur, dt);
  const wasGround = p.onGround, fallV = v.y;
  p.pos.addScaledVector(v, dt);
  p.onSolid = null;
  constrain(p, { breakC: p.mode === 'roll' || (p.mode === 'poop' && S.hat === 'hardhat') });
  if (p.onGround && !wasGround && fallV < -9) { sfx('thud'); G.shakeV = 0.15; }
  p.bob += Math.hypot(v.x, v.z) * dt * (p.onGround ? 1.6 : 0);
  // goo hurts (unless you ride the ducky)
  if (goo && p.mode !== 'duck' && wl !== null && p.pos.y - p.r < wl + 0.05) {
    hurt(null); v.y = 12; p.canFart = true;
    for (let i = 0; i < 8; i++) G.parts.push(sparkP(p.pos.x, wl, p.pos.z, '#8be04a', true));
  }
  // spikes
  for (const s of G.spikes) {
    if (p.pos.x > s.min.x - p.r && p.pos.x < s.max.x + p.r && p.pos.z > s.min.z - p.r && p.pos.z < s.max.z + p.r && p.pos.y - p.r < s.max.y && p.pos.y + p.r > s.min.y) { hurt(null); v.y = 9; }
  }
  // auto look: up while climbing a tall pipe, down while falling
  const wantLook = vt ? clamp(v.y * 0.09, -0.9, 0.9) : (p.onGround || p.swim ? 0 : clamp(v.y * 0.03, -0.35, 0.2));
  p.look = lerp(p.look, wantLook, Math.min(1, 3 * dt));
  if (p.pos.y < -200) { p.pos.copy(G.start); v.set(0, 0, 0); }
}
function fartBlast(p) {
  // a fart knocks out grumpy things right next to you
  for (const e of G.ents) {
    if (!e.stomp || e.dead || !e.pos) continue;
    if (e.pos.distanceTo(p.pos) < 2.6) { knockOut(e, false); floatText('STINKY!', e.pos.clone().setY(e.pos.y + 1), '#b8ff7a'); }
  }
}
function hurt(src) {
  const p = P;
  if (p.inv > 0) return;
  shake = 0.25; G.hurtT = 0.6;
  if (p.mode !== 'poop') { releaseCap(true); p.inv = 1.2; return; }
  if (S.size > 1) { S.size--; S.grow = 0; persist(); sizePlayer(p); }
  sfx('squish'); p.inv = 1.6;
  floatText('SQUISH!', p.pos.clone().add(new V3(-Math.sin(camYaw) * 2, 0.6, -Math.cos(camYaw) * 2)), '#ffb38a');
  if (S.size === 1) say('You are as small as you can get, but you can keep going! Eat corn to grow back.', 4);
  p.vel.y = Math.max(p.vel.y, 6);
  if (src && src.pos) { const d = p.pos.clone().sub(src.pos).setY(0); if (d.lengthSq() > 0) { d.normalize(); p.vel.x = d.x * 6; p.vel.z = d.z * 6; } }
}
const CAPMSG = {
  duck: 'Ducky power! Zoom across water AND goo. SPACE hops. SPACE again in the air hops out.',
  bubble: 'Bubble ride! It floats way up. Steer with the arrows. Press SPACE to hop out.',
  roll: 'Toilet paper roll! Roll into cracked blocks to smash them. SPACE twice to hop out.',
  fish: 'Fish power! Swim super fast. Hold SPACE to swim up. X hops out.',
};
function capture(c) {
  const p = P;
  p.mode = c.type; p.cap = c; c.hidden = true; c.m.visible = false; c.back = 0;
  p.pos.copy(c.pos); p.vel.set(0, 0, 0); p.r = c.r;
  sfx(c.type === 'duck' ? 'quack' : 'pop'); sparkle(p.pos.clone(), '#ffffff', 12);
  say(CAPMSG[c.type], 5);
}
function releaseCap(popped) {
  const p = P, c = p.cap;
  p.mode = 'poop'; p.cap = null; p.r = pRadius();
  c.pos.copy(p.pos); c.vel.set(0, 0, 0);
  if (c.type === 'bubble') { c.back = 1.5; sfx('pop'); sparkle(p.pos.clone(), '#e6f7ff', 16); }
  else {
    c.hidden = false; c.m.visible = true; c.back = 6;
    // leave it just behind you
    c.pos.add(new V3(Math.sin(camYaw), 0, Math.cos(camYaw)).multiplyScalar(1.2));
  }
  p.vel.y = 7; p.canFart = true; p.capCool = 0.8;
  constrain(p);
  if (popped) { sfx('squish'); } else { sfx('fart'); fartPuff(p); }
}
function knockOut(e, stomped) {
  e.dead = true; world.remove(e.m); if (e.sh) world.remove(e.sh);
  poof(e.pos.clone()); sfx('stomp');
  gotCorn(e.pos.clone().setY(e.pos.y + 0.8));
}

// ------------------------------------------------------------------ particles
function sparkP(x, y, z, color, big) {
  const s = A.sprite(A.TEX.puff, big ? 0.5 : 0.3, big ? 0.5 : 0.3, { color }); s.position.set(x, y, z); world.add(s);
  return { m: s, v: new V3(rand(-2, 2), rand(2, 5), rand(-2, 2)), life: 0.6, grav: true };
}
function sparkle(pos, color = '#ffe066', n = 14) {
  for (let i = 0; i < n; i++) { const p = sparkP(pos.x, pos.y, pos.z, color); p.v.set(rand(-4, 4), rand(0, 6), rand(-4, 4)); p.life = 0.8; G.parts.push(p); }
}
function fartPuff(p) {
  for (let i = 0; i < 10; i++) {
    const s = A.sprite(A.TEX.puff, 0.7, 0.7, { color: '#a8c46a', opacity: 0.75 });
    s.position.set(p.pos.x + rand(-0.4, 0.4), p.pos.y - p.r * 0.6, p.pos.z + rand(-0.4, 0.4)); world.add(s);
    G.parts.push({ m: s, v: new V3(rand(-2, 2), rand(-3, -0.5), rand(-2, 2)), life: 1.0, grow: 1.4, drag: true });
  }
}
function splash(pos, wl) {
  for (let i = 0; i < 10; i++) { const s = sparkP(pos.x, wl, pos.z, '#e6f7ff', true); s.v.set(rand(-3, 3), rand(3, 7), rand(-3, 3)); G.parts.push(s); }
}
function bubbleP(pos) {
  const s = A.sprite(A.TEX.puff, 0.22, 0.22, { color: '#e6f7ff', opacity: 0.8 }); s.position.copy(pos); world.add(s);
  G.parts.push({ m: s, v: new V3(0, 2, 0), life: 1.5, bubble: true });
}
function poof(pos) {
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, s = A.sprite(A.TEX.puff, 0.7, 0.7, { opacity: 0.9 }); s.position.copy(pos); world.add(s);
    G.parts.push({ m: s, v: new V3(Math.cos(a) * 3, rand(0, 2), Math.sin(a) * 3), life: 0.5, grow: 1.5, drag: true });
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
    if (q.bubble) { const w = waterAt(q.m.position).wl; if (w === null || q.m.position.y > w) q.life = 0; }
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
  for (const e of G.ents) {
    if (e.dead) continue;
    updateEnemy(e, dt, T);
    if (!G.exiting && p.inv <= 0) touchEnemy(e);
  }
  G.ents = G.ents.filter(e => !e.dead);
  // rides waiting to be grabbed
  for (const c of G.caps) {
    if (c === p.cap) continue;
    if (c.back > 0 && (c.back -= dt) <= 0) {
      if (c.pos.distanceTo(c.home) > 0.5 || c.hidden) { poof(c.pos.clone()); c.pos.copy(c.home); poof(c.pos.clone()); }
      c.hidden = false; c.m.visible = true;
    }
    if (c.hidden) continue;
    const { wl } = waterAt(c.pos);
    if (c.type === 'duck') { if (wl !== null && c.pos.y < wl + 0.15) { c.vel.y += 30 * dt + (wl + 0.05 - c.pos.y) * 12 * dt; c.vel.y *= 1 - 4 * dt; } else c.vel.y -= GRAV * dt; }
    else if (c.type === 'bubble') { c.pos.y = c.home.y + 0.2 + Math.sin(T * 2) * 0.15; c.vel.set(0, 0, 0); }
    else if (c.type === 'fish' && wl !== null && c.pos.y < wl) { c.pos.x = c.home.x + Math.sin(T * 0.7) * 1.5; c.yaw = Math.cos(T * 0.7) > 0 ? Math.PI / 2 : -Math.PI / 2; c.vel.set(0, 0, 0); }
    else c.vel.y -= GRAV * dt;
    c.vel.x *= 1 - 3 * dt; c.vel.z *= 1 - 3 * dt;
    c.pos.addScaledVector(c.vel, dt); constrain(c);
    c.m.position.copy(c.pos).setY(c.pos.y - c.r); c.m.rotation.y = c.yaw || 0;
    if (c.type === 'duck') c.m.rotation.z = Math.sin(T * 2) * 0.08;
    if (p.mode === 'poop' && p.capCool <= 0 && !G.exiting && p.pos.distanceTo(c.pos) < p.r + c.r + 0.5) capture(c);
  }
  // pickups
  for (const it of G.items) {
    if (it.taken) continue;
    it.m.position.y = it.p.y + (it.ground ? 0 : Math.sin(T * 2.5 + it.ph) * 0.15);
    if (it.k === 'gold') it.m.userData.spin.rotation.y = T * 2;
    else it.m.rotation.y = T * (it.k === 'corn' ? 3 : 1) + it.ph;
    const rr = it.k === 'corn' ? 0.7 : 1.0;
    const c = it.m.position.clone(); if (it.ground) c.y += 0.4;
    if (c.distanceTo(p.pos) < p.r + rr + (p.mode !== 'poop' ? 0.3 : 0)) {
      it.taken = true; world.remove(it.m);
      if (it.k === 'corn') gotCorn(c);
      else if (it.k === 'gold') gotGold(it);
      else gotTreasure(it);
    }
  }
  // doors, shop, exit pipe, signs
  let zone = null;
  const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  for (const d of G.doors) if (flat(p.pos, d.front) < 1.2 && Math.abs(p.pos.y - p.r - d.p.y) < 1.2) zone = { k: 'door', d };
  if (G.shop && flat(p.pos, G.shop.front) < 1.3 && Math.abs(p.pos.y - p.r - G.shop.p.y) < 1.2) zone = { k: 'shop' };
  if (G.exit) {
    if (G.L.final ? flat(p.pos, G.exit.p) < 2.4 && Math.abs(p.pos.y - G.exit.p.y) < 2.5 : p.onGround && p.onSolid === G.exit.sol) zone = { k: 'exit' };
  }
  const zk = zone ? zone.k + (zone.d ? zone.d.id : '') : null;
  if (zk !== G.zone) { G.zone = zk; if (zone) useThing(zone); }
  let sign = null;
  for (const s of G.signs) if (s.p.distanceTo(p.pos) < 3.2) sign = s;
  G.sign = sign;
  if (G.exiting) {
    G.exiting -= dt;
    if (G.L.final) p.pos.y += dt * 0.6; else p.pos.y -= dt * 2.4;
    camYaw += dt * 3;
    if (G.exiting <= 0) { finishLevel(); return; }
  }
  updateParts(dt);
  if (G.ripple) { G.ripple.offset.x += 0.012 * dt; G.ripple.offset.y += 0.02 * dt; }
  const gog = S.face === 'goggles';
  for (const s of G.solids) if (s.ghost && s.mesh) { s.mesh.material.opacity = gog ? 0.9 : 0.2 + Math.sin(T * 3) * 0.08; s.mesh.material.color.set(gog ? '#9cefff' : '#ffffff'); }
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
    const d = p.pos.clone().sub(e.pos), dist = d.length();
    const chase = dist < 8 && Math.abs(d.y) < 2 && p.mode !== 'bubble';
    let want = e.yaw, sp = 1.3;
    if (chase) { want = Math.atan2(d.x, d.z); sp = 2.4; }
    else if ((e.turnT -= dt) <= 0) { e.turnT = rand(1.5, 3.5); want = e.yaw = e.yaw + rand(-1.5, 1.5); if (e.pos.distanceTo(e.home) > 7) want = e.yaw = Math.atan2(e.home.x - e.pos.x, e.home.z - e.pos.z); }
    e.yaw = lerpAng(e.yaw, want, Math.min(1, 4 * dt));
    e.vel.x = Math.sin(e.yaw) * sp; e.vel.z = Math.cos(e.yaw) * sp; e.vel.y -= GRAV * dt;
    // don't walk off ledges or into water
    const ahead = e.pos.clone().add(new V3(Math.sin(e.yaw) * 0.9, 0, Math.cos(e.yaw) * 0.9));
    const wa = waterAt(ahead).wl;
    if ((wa !== null && wa > e.pos.y - 0.6) || Math.abs(floorBelow(ahead) - (e.pos.y - e.r)) > 0.6) { e.yaw += Math.PI * rand(0.6, 1.4); e.vel.x = e.vel.z = 0; }
    e.pos.addScaledVector(e.vel, dt); constrain(e);
    if (e.hitWall) e.yaw += Math.PI * rand(0.5, 1.5);
    e.m.position.copy(e.pos).setY(e.pos.y - e.r + Math.abs(Math.sin(T * 8)) * 0.08); e.m.rotation.y = e.yaw;
    const u = e.m.userData;
    if (u.wheels) u.wheels.forEach(w => { w.rotation.x += dt * 8; });
    if (u.brush) u.brush.rotation.y += dt * 12;
    if (u.claws) u.claws.forEach((c, i) => { c.position.y = 0.66 + Math.sin(T * 6 + i * 3) * 0.08; });
    if (u.tail) u.tail.rotation.y = Math.sin(T * 6) * 0.4;
  } else if (e.k === 'flyer') {
    e.a += dt * 0.9;
    const nx = e.c.x + Math.cos(e.a) * e.rad, nz = e.c.z + Math.sin(e.a) * e.rad;
    e.m.rotation.y = Math.atan2(nx - e.pos.x, nz - e.pos.z);
    e.pos.set(nx, e.c.y + Math.sin(T * 3) * 0.3, nz);
    e.m.position.copy(e.pos);
    const u = e.m.userData;
    if (u.wings) u.wings.forEach((w, i) => { w.rotation.z = Math.sin(T * (w.isGroup ? 8 : 40)) * (i ? 0.6 : -0.6); });
  } else if (e.k === 'drip') {
    if (e.wait > 0) { e.wait -= dt; e.m.visible = e.wait < 0.6; e.pos.copy(e.top); e.m.position.copy(e.pos); e.sh.visible = false; return; }
    e.sh.visible = true; e.m.visible = true;
    e.vy -= 20 * dt; e.pos.y += e.vy * dt;
    e.sh.position.set(e.pos.x, e.floor + 0.03, e.pos.z); e.sh.scale.setScalar(0.5 + clamp(1 - (e.pos.y - e.floor) / 8, 0, 1) * 0.8);
    if (e.pos.y <= e.floor) {
      for (let i = 0; i < 6; i++) G.parts.push(sparkP(e.pos.x, e.floor + 0.1, e.pos.z, '#9fd8ff'));
      e.pos.copy(e.top); e.vy = 0; e.wait = rand(1, 2.5);
    }
    e.m.position.copy(e.pos);
  } else if (e.k === 'drop') {
    const dp = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    if (e.st === 'wait') { if ((e.tm -= dt) <= 0 && dp < 1.8 && p.pos.y < e.pos.y) { e.st = 'shake'; e.tm = 0.45; } }
    else if (e.st === 'shake') { if ((e.tm -= dt) <= 0) { e.st = 'fall'; e.vy = 0; } }
    else if (e.st === 'fall') {
      e.vy -= 40 * dt; e.pos.y += e.vy * dt;
      if (e.pos.y <= e.g) { e.pos.y = e.g; e.st = 'rest'; e.tm = 1.0; sfx('thud'); shake = Math.max(shake, 0.15); }
    } else if (e.st === 'rest') { if ((e.tm -= dt) <= 0) e.st = 'rise'; }
    else if (e.st === 'rise') { e.pos.y += 3 * dt; if (e.pos.y >= e.y0) { e.pos.y = e.y0; e.st = 'wait'; e.tm = 0.8; } }
    e.m.position.set(e.pos.x + (e.st === 'shake' ? rand(-0.06, 0.06) : 0), e.pos.y, e.pos.z);
    e.sh.scale.setScalar(e.st === 'wait' ? 1.0 : 1.6);
  } else if (e.k === 'fan') {
    e.a += e.sp * dt; e.blades.rotation.z = e.a;
  } else if (e.k === 'spinY') {
    e.a += e.sp * dt; e.bar.rotation.y = e.a;
  } else if (e.k === 'swim') {
    e.a += dt * e.sp;
    const nx = e.c.x + Math.cos(e.a) * e.rad, nz = e.c.z + Math.sin(e.a) * e.rad;
    e.m.rotation.y = Math.atan2(nx - e.pos.x, nz - e.pos.z);
    e.pos.set(nx, e.c.y + Math.sin(T * 1.5) * 0.2, nz);
    e.m.position.copy(e.pos);
    const u = e.m.userData; if (u.tail) u.tail.rotation.y = Math.sin(T * 6) * 0.4;
  } else if (e.k === 'jelly') {
    e.pos.set(e.c.x, e.c.y + Math.sin(T * 1.2 + e.a) * 1.2, e.c.z);
    e.m.position.copy(e.pos);
    e.m.userData.tent.forEach((t, i) => { t.rotation.x = Math.sin(T * 3 + i) * 0.3; });
  } else if (e.k === 'cloud') { e.m.position.x += dt * 0.6; if (e.m.position.x > 150) e.m.position.x = -150; }
  else if (e.k === 'kelp') { e.m.rotation.z = Math.sin(T * 1.3 + e.ph) * 0.2; }
}
function touchEnemy(e) {
  const p = P;
  if (e.k === 'fan') {
    // where are you in the fan's circle?
    const v = p.pos.clone().sub(e.tb.p0), t = v.dot(e.tb.dir);
    if (Math.abs(t - e.t) > p.r + 0.25) return;
    const rad = v.addScaledVector(e.tb.dir, -t);
    const bladeDir = new V3(Math.cos(e.a), Math.sin(e.a), 0).applyQuaternion(e.m.quaternion);
    const along = rad.dot(bladeDir), off = rad.clone().addScaledVector(bladeDir, -along).length();
    if (off < p.r + 0.22) hurt({ pos: e.c });
    return;
  }
  if (e.k === 'spinY') {
    if (Math.abs(p.pos.y - e.pos.y) > p.r + 0.3) return;
    const ax = Math.cos(e.a) * e.R, az = -Math.sin(e.a) * e.R;
    const px = p.pos.x - e.pos.x, pz = p.pos.z - e.pos.z, t = clamp((px * ax + pz * az) / (e.R * e.R), -1, 1);
    if (Math.hypot(px - ax * t, pz - az * t) < p.r + 0.35) hurt({ pos: e.pos });
    return;
  }
  if (e.k === 'drop') {
    if (e.st !== 'fall') return;
    if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < p.r + 0.7 && p.pos.y - p.r < e.pos.y + 0.8 && p.pos.y + p.r > e.pos.y) hurt(e);
    return;
  }
  if (!['walker', 'flyer', 'drip', 'swim', 'jelly'].includes(e.k)) return;
  if (e.k === 'drip' && e.wait > 0) return;
  const er = e.r || 0.5;
  if (p.pos.distanceTo(e.pos) > p.r + er) return;
  const stomp = e.stomp && p.vel.y < -1 && p.pos.y > e.pos.y + er * 0.4;
  if (stomp || (e.stomp && p.mode === 'roll')) {
    knockOut(e, true);
    if (stomp) { p.vel.y = keys.jump ? 13 : 9; p.canFart = true; }
  } else hurt(e);
}
function gotCorn(pos) {
  S.corn++; S.grow++;
  sfx('corn'); sfx('crunch'); floatText('+1', pos, '#ffe066');
  if (S.grow >= 5) {
    S.grow = 0;
    if (S.size < 6) {
      S.size++; sizePlayer(P); sfx('grow');
      banner('BIGGER!', 'Your eyes are higher up now!', 1.6);
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
  if (n === G.L.needed) sub = G.L.final ? 'Now find the beach umbrella!' : 'The exit pipe is OPEN! Jump into the big green pipe!';
  banner(title, pre + sub, 3.4);
  updateExitLabel();
}
function gotTreasure(it) {
  const o = OUTFITS[it.outfit];
  sparkle(it.m.position, '#ff8fd1', 26);
  if (owns(it.outfit)) return;
  S.owned.push(it.outfit); S[o.slot] = it.outfit; persist();
  sfx('fanfare');
  banner(`You found the ${o.name}!`, o.power || 'You put it on! Press C to open your closet and change clothes.', 4);
}
function useThing(z) {
  const p = P;
  if (z.k === 'exit') {
    const got = goldIn(G.L.key);
    if (got >= G.L.needed || S.beaten[G.L.key]) {
      if (p.mode !== 'poop') releaseCap(false);
      G.exiting = G.L.final ? 1.6 : 1.1; p.vel.set(0, 0, 0);
      if (!G.L.final) { p.pos.x = G.exit.p.x; p.pos.z = G.exit.p.z; G.solids = G.solids.filter(s => s !== G.exit.sol); }
      sfx(G.L.final ? 'fanfare' : 'flush');
    } else { sfx('nope'); say(`${G.L.final ? 'The beach' : 'This pipe'} needs ${G.L.needed} Golden Corn. You have ${got}. Keep exploring!`, 4); }
  } else if (z.k === 'door') {
    const d = z.d, o = OUTFITS[d.outfit];
    if (d.open) { say('You already partied in here! It gave you a Golden Corn.', 3); return; }
    if (wearing(d.outfit)) {
      d.open = true; S.golden[d.id] = true; persist(); openDoorLook(d);
      sfx('golden'); sparkle(d.p.clone().add(new V3(0, 2, 0)), '#ff8fd1', 30); sparkle(d.p.clone().add(new V3(0, 3, 0)), '#ffe066', 20);
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
  S.beaten[G.L.key] = true; $('#eyes').hidden = true;
  if (G.L.final) { S.won = true; S.best = Math.max(S.best || 0, S.size); persist(); startEnding(); return; }
  S.unlocked = Math.max(S.unlocked, G.i + 2); persist();
  openMap(G.i, G.i + 1);
}

// ------------------------------------------------------------------ the camera is your eyes
let camPitch = 0, camPitchDrag = 0;
function syncPlayer(dt) { P.blink -= dt; if (P.blink < -0.14) P.blink = rand(2.5, 5); }
function placeCamera(dt) {
  const p = P;
  camYaw += camYawDrag; camYawDrag = 0;
  camPitch = clamp(camPitch + camPitchDrag, -1.1, 1.1); camPitchDrag = 0;
  if (Math.abs(camPitch) > 0.001 && !keys.lookHold) camPitch *= 1 - Math.min(1, dt * 0.6);
  const eyeH = p.mode === 'poop' ? p.r * 0.45 : p.mode === 'duck' ? 0.75 : p.mode === 'roll' ? 0.35 : 0.2;
  const bob = p.onGround && p.mode === 'poop' ? Math.sin(p.bob * 2.2) * 0.05 : 0;
  camera.position.copy(p.pos).add(new V3(0, eyeH + bob, 0));
  if (shake > 0) camera.position.add(new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shake * 0.25));
  const pitch = clamp(camPitch + p.look, -1.3, 1.3);
  const dir = new V3(-Math.sin(camYaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(camYaw) * Math.cos(pitch));
  camera.lookAt(camera.position.clone().add(dir));
  const { wl, goo } = waterAt(camera.position);
  const under = wl !== null && camera.position.y < wl;
  if (under !== G.under) {
    G.under = under;
    if (under) { scene.fog = new THREE.Fog(goo ? '#4f8f2a' : '#1f6fb0', 1, 26); scene.background = new THREE.Color(goo ? '#4f8f2a' : '#1f6fb0'); }
    else { scene.fog = new THREE.Fog(G.th.fog, G.L.key === 'ocean' ? 25 : 8, G.L.key === 'ocean' ? 150 : 65); scene.background = new THREE.Color(G.th.sky); }
  }
  drawEyes();
}

// two lenses side by side, so the frames only show around the edges and the nose bridge
function lensFrames(color, lw) {
  const w = innerWidth, h = innerHeight;
  eg.save(); eg.fillStyle = color;
  eg.beginPath(); eg.rect(0, 0, w, h);
  for (const cx of [w * 0.25, w * 0.75]) { eg.moveTo(cx + w * 0.27, h * 0.5); eg.ellipse(cx, h * 0.5, w * 0.27, h * 0.78, 0, 0, Math.PI * 2, true); }
  eg.fill('evenodd'); eg.restore();
}
// ------------------------------------------------------------------ what your eyes see around the edges: eyelids, hats, glasses, rides
const eyeCv = $('#eyes'), eg = eyeCv.getContext('2d');
function drawEyes() {
  const w = innerWidth, h = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
  if (eyeCv.width !== Math.round(w * dpr) || eyeCv.height !== Math.round(h * dpr)) { eyeCv.width = Math.round(w * dpr); eyeCv.height = Math.round(h * dpr); }
  eg.setTransform(dpr, 0, 0, dpr, 0, 0);
  eg.clearRect(0, 0, w, h);
  const p = P, s = Math.min(w, h);
  // underwater
  if (G.under) { eg.fillStyle = 'rgba(40,120,200,.18)'; eg.fillRect(0, 0, w, h); }
  // your own poop cheeks at the bottom of the view
  if (p.mode === 'poop') {
    eg.fillStyle = '#8b5a2b';
    const ch = s * (0.05 + S.size * 0.006);
    eg.beginPath(); eg.ellipse(w * 0.08, h + ch * 0.4, w * 0.22, ch * 1.6, 0.25, 0, Math.PI * 2); eg.fill();
    eg.beginPath(); eg.ellipse(w * 0.92, h + ch * 0.4, w * 0.22, ch * 1.6, -0.25, 0, Math.PI * 2); eg.fill();
    eg.fillStyle = 'rgba(255,230,190,.25)';
    eg.beginPath(); eg.ellipse(w * 0.12, h - ch * 0.6, w * 0.06, ch * 0.3, 0.25, 0, Math.PI * 2); eg.fill();
  }
  // rides
  if (p.mode === 'duck') {
    eg.fillStyle = '#ffd93b'; eg.strokeStyle = '#2b1a10'; eg.lineWidth = 4;
    eg.beginPath(); eg.ellipse(w / 2, h + s * 0.08, s * 0.32, s * 0.2, 0, 0, Math.PI * 2); eg.fill(); eg.stroke();
    eg.fillStyle = '#ff8a1c'; eg.beginPath(); eg.moveTo(w / 2 - s * 0.07, h - s * 0.08); eg.lineTo(w / 2, h - s * 0.17); eg.lineTo(w / 2 + s * 0.07, h - s * 0.08); eg.closePath(); eg.fill(); eg.stroke();
  } else if (p.mode === 'bubble') {
    const g = eg.createRadialGradient(w / 2, h / 2, s * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(200,240,255,.25)'); g.addColorStop(0.85, 'rgba(255,160,230,.35)'); g.addColorStop(1, 'rgba(160,230,255,.6)');
    eg.fillStyle = g; eg.fillRect(0, 0, w, h);
    eg.fillStyle = 'rgba(255,255,255,.6)'; eg.beginPath(); eg.ellipse(w * 0.22, h * 0.2, s * 0.08, s * 0.03, -0.6, 0, Math.PI * 2); eg.fill();
  } else if (p.mode === 'roll') {
    eg.fillStyle = '#ffffff'; eg.strokeStyle = '#d8d8e0'; eg.lineWidth = 3;
    for (const sx of [0, w]) { eg.beginPath(); eg.ellipse(sx, h / 2, w * 0.12, h * 0.7, 0, 0, Math.PI * 2); eg.fill(); for (let i = 1; i < 4; i++) { eg.beginPath(); eg.ellipse(sx, h / 2, w * 0.12 - i * 8, h * 0.7 - i * 8, 0, 0, Math.PI * 2); eg.stroke(); } }
  } else if (p.mode === 'fish') {
    eg.fillStyle = '#ff8a1c'; eg.strokeStyle = '#2b1a10'; eg.lineWidth = 4;
    for (const sgn of [-1, 1]) { const x = w / 2 + sgn * w * 0.4, f = Math.sin(G.time * 10) * 10; eg.beginPath(); eg.moveTo(x, h); eg.lineTo(x + sgn * s * 0.12, h - s * 0.15 + f); eg.lineTo(x - sgn * s * 0.05, h - s * 0.12); eg.closePath(); eg.fill(); eg.stroke(); }
  }
  // face things
  if (S.face === 'shades') {
    eg.fillStyle = 'rgba(0,0,20,.32)'; eg.fillRect(0, 0, w, h);
    lensFrames('#111', s * 0.04);
    eg.fillStyle = '#111'; eg.fillRect(w / 2 - s * 0.06, h * 0.06, s * 0.12, s * 0.035);
  } else if (S.face === 'goggles') {
    eg.fillStyle = 'rgba(120,230,255,.12)'; eg.fillRect(0, 0, w, h);
    lensFrames('#ff9f1c', s * 0.05);
  } else if (S.face === 'stache') {
    eg.fillStyle = '#3b2412';
    for (const sgn of [-1, 1]) { eg.beginPath(); eg.moveTo(w / 2, h - s * 0.02); eg.quadraticCurveTo(w / 2 + sgn * s * 0.2, h - s * 0.16, w / 2 + sgn * s * 0.42, h - s * 0.04); eg.quadraticCurveTo(w / 2 + sgn * s * 0.5, h - s * 0.12, w / 2 + sgn * s * 0.47, h - s * 0.18); eg.quadraticCurveTo(w / 2 + sgn * s * 0.55, h + s * 0.02, w / 2 + sgn * s * 0.2, h + s * 0.02); eg.closePath(); eg.fill(); }
  } else if (S.face === 'nose') {
    eg.fillStyle = 'rgba(255,45,59,.92)'; eg.beginPath(); eg.arc(w / 2, h + s * 0.05, s * 0.13, 0, Math.PI * 2); eg.fill();
    eg.fillStyle = 'rgba(255,255,255,.5)'; eg.beginPath(); eg.arc(w / 2 - s * 0.04, h - s * 0.04, s * 0.03, 0, Math.PI * 2); eg.fill();
  }
  // hats you can see poking over your eyes
  const hat = S.hat;
  if (hat) {
    eg.lineWidth = 5; eg.strokeStyle = '#2b1a10';
    const top = (c, ht, wide = 1.4) => { eg.fillStyle = c; eg.beginPath(); eg.ellipse(w / 2, -ht * 0.35, w * 0.5 * wide, ht, 0, 0, Math.PI * 2); eg.fill(); eg.stroke(); };
    if (hat === 'plumber') { top('#e3242b', s * 0.12, 0.9); }
    else if (hat === 'cowboy') { top('#a0612d', s * 0.1, 1.6); }
    else if (hat === 'hardhat') { top('#ffcd03', s * 0.1, 1.2); eg.fillStyle = '#e0a800'; eg.fillRect(w / 2 - 8, 0, 16, s * 0.06); }
    else if (hat === 'sailor') { top('#ffffff', s * 0.06, 1.0); eg.fillStyle = '#1f5fbf'; eg.fillRect(0, 0, w, s * 0.015); }
    else if (hat === 'pirate') { top('#1d1d26', s * 0.1, 1.3); }
    else if (hat === 'chef') { top('#ffffff', s * 0.08, 1.0); }
    else if (hat === 'viking') { eg.fillStyle = '#f5ecd6'; for (const sgn of [-1, 1]) { eg.beginPath(); eg.moveTo(w / 2 + sgn * w * 0.5, s * 0.02); eg.quadraticCurveTo(w / 2 + sgn * w * 0.42, s * 0.14, w / 2 + sgn * w * 0.32, s * 0.22); eg.quadraticCurveTo(w / 2 + sgn * w * 0.4, s * 0.06, w / 2 + sgn * w * 0.3, -2); eg.closePath(); eg.fill(); eg.stroke(); } top('#9aa3b5', s * 0.05, 1.1); }
    else if (hat === 'crown') { eg.fillStyle = '#ffcd03'; eg.beginPath(); eg.moveTo(0, 0); for (let i = 0; i <= 10; i++) eg.lineTo(i / 10 * w, i % 2 ? s * 0.07 : s * 0.02); eg.lineTo(w, 0); eg.closePath(); eg.fill(); eg.stroke(); }
    else if (hat === 'party') { eg.fillStyle = '#ff5fa2'; eg.beginPath(); eg.moveTo(w * 0.3, 0); eg.lineTo(w * 0.5, s * 0.07); eg.lineTo(w * 0.7, 0); eg.closePath(); eg.fill(); eg.stroke(); eg.fillStyle = '#ffd93b'; eg.fillRect(w * 0.42, 0, w * 0.04, s * 0.03); eg.fillRect(w * 0.54, 0, w * 0.04, s * 0.03); }
    else if (hat === 'bow') { eg.fillStyle = '#ff5fa2'; eg.beginPath(); eg.moveTo(w * 0.04, s * 0.02); eg.lineTo(w * 0.16, s * 0.12); eg.lineTo(w * 0.04, s * 0.2); eg.closePath(); eg.fill(); eg.stroke(); eg.beginPath(); eg.moveTo(w * 0.28, s * 0.02); eg.lineTo(w * 0.16, s * 0.12); eg.lineTo(w * 0.28, s * 0.2); eg.closePath(); eg.fill(); eg.stroke(); eg.beginPath(); eg.arc(w * 0.16, s * 0.12, s * 0.035, 0, 7); eg.fill(); eg.stroke(); }
  }
  // ouch!
  if (G.hurtT > 0) {
    const a = G.hurtT / 0.6;
    eg.fillStyle = `rgba(139,90,43,${0.55 * a})`;
    for (let i = 0; i < 9; i++) { const ang = i / 9 * Math.PI * 2, r = s * 0.25; eg.beginPath(); eg.arc(w / 2 + Math.cos(ang) * w * 0.55, h / 2 + Math.sin(ang) * h * 0.55, r * (1 + Math.sin(i * 3) * 0.3), 0, 7); eg.fill(); }
  }
  // eyelids (blink!)
  const lid = p.blink < 0 ? 1 - Math.abs(p.blink + 0.07) / 0.07 : G.exiting ? Math.min(1, 1 - G.exiting / 1.1) : 0;
  if (lid > 0) {
    eg.fillStyle = '#6b4220';
    eg.fillRect(0, 0, w, h / 2 * lid); eg.fillRect(0, h - h / 2 * lid, w, h / 2 * lid);
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
  state = 'title'; overlay = null; G = null; P = null;
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
    if (state === 'play') { if (!G.slide) { syncPlayer(dt); placeCamera(dt); } updateHUD(); }
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
window.__poop = { setYaw: y => { camYaw = y; }, get G() { return G; }, get P() { return P; }, get S() { return S; }, get state() { return state; }, startLevel, openMap, startEnding, persist, sizePlayer: () => sizePlayer(P) };
})();
