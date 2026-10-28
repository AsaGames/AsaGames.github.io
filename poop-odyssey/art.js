// Super Poop Odyssey: the toy-box 3D models (built from simple shapes, like Banana Sneak).
'use strict';
(function () {
const rand = (a, b) => a + Math.random() * (b - a);

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(0.5, 16, 12),
  sphLo: new THREE.IcosahedronGeometry(0.5, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  cone: new THREE.ConeGeometry(0.5, 1, 14),
  torus: new THREE.TorusGeometry(0.35, 0.15, 10, 22),
  halfSph: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  disc: new THREE.CircleGeometry(0.5, 24),
};
const MATS = {};
function mat(c, opts) {
  const key = c + (opts ? JSON.stringify(opts) : '');
  return MATS[key] || (MATS[key] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, opts || {})));
}
function part(geo, c, sx, sy, sz, x, y, z, parent, opts) {
  const m = new THREE.Mesh(GEO[geo] || geo, typeof c === 'string' ? mat(c, opts) : c);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ------------------------------------------------------------------ shared textures
const TEX = {};
TEX.glow = canvasTex(128, 128, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,240,150,1)'); gr.addColorStop(0.4, 'rgba(255,220,80,.45)'); gr.addColorStop(1, 'rgba(255,220,80,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
TEX.puff = canvasTex(64, 64, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
TEX.shadow = canvasTex(64, 64, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(0.7, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
TEX.ripple = canvasTex(256, 256, (g, w) => {
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * w, y = Math.random() * w, l = 14 + Math.random() * 26;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 6, x + l, y); g.stroke();
  }
});
TEX.ripple.wrapS = TEX.ripple.wrapT = THREE.RepeatWrapping;
TEX.crack = canvasTex(128, 128, (g, w) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, w);
  g.strokeStyle = '#3b2a1a'; g.lineWidth = 6; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(20, 6); g.lineTo(54, 50); g.lineTo(38, 74); g.lineTo(70, 122);
  g.moveTo(54, 50); g.lineTo(108, 36); g.moveTo(66, 82); g.lineTo(116, 96); g.moveTo(38, 74); g.lineTo(8, 90); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 8; g.strokeRect(0, 0, w, w);
});
TEX.ghost = canvasTex(128, 128, (g, w) => {
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, w, w);
  g.setLineDash([14, 10]); g.strokeStyle = '#ffffff'; g.lineWidth = 8; rr(g, 6, 6, w - 12, w - 12, 18); g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(46, 58, 9, 0, 7); g.arc(82, 58, 9, 0, 7); g.fill();
  g.beginPath(); g.arc(64, 84, 12, 0, Math.PI); g.fill();
});
TEX.sign = canvasTex(128, 96, (g, w, h) => {
  g.fillStyle = '#e9b872'; rr(g, 4, 4, w - 8, h - 8, 14); g.fill();
  g.strokeStyle = '#7a4a22'; g.lineWidth = 6; rr(g, 4, 4, w - 8, h - 8, 14); g.stroke();
  g.font = 'bold 70px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#7a4a22'; g.fillText('!', w / 2, h / 2 + 4);
});
TEX.cob = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#ffb800'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 22) for (let x = (y / 22 % 2) * 11; x < w; x += 22) {
    g.fillStyle = '#ffe36a'; g.beginPath(); g.ellipse(x + 8, y + 9, 8, 9, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x + 5, y + 5, 3, 0, 7); g.fill();
  }
});
// toy tiles for the ground: white so the kingdom colours show through
function tileTex(kind) {
  const t = canvasTex(128, 128, (g, w) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, w);
    const bevel = (x, y, ww, hh) => {
      g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, y, ww, hh);
      g.fillStyle = '#ffffff'; rr(g, x + 3, y + 3, ww - 6, hh - 6, 8); g.fill();
      g.fillStyle = 'rgba(255,255,255,1)'; rr(g, x + 6, y + 5, ww - 14, 6, 3); g.fill();
      g.fillStyle = 'rgba(0,0,0,.06)'; rr(g, x + 6, y + hh - 12, ww - 12, 6, 3); g.fill();
    };
    if (kind === 'bricks') { for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) bevel(c * 64 + (r % 2) * 32, r * 32, 64, 32); }
    else if (kind === 'tiles') { for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) bevel(c * 64, r * 64, 64, 64); }
    else if (kind === 'sand') { g.fillStyle = 'rgba(0,0,0,.07)'; for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * w, 1.5 + Math.random() * 2, 0, 7); g.fill(); } }
    else {
      bevel(0, 0, w, w);
      if (kind === 'plates') { g.fillStyle = 'rgba(0,0,0,.25)'; for (const [x, y] of [[16, 16], [112, 16], [16, 112], [112, 112]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); } }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
TEX.tube = canvasTex(128, 64, (g, w, h) => {
  g.fillStyle = '#3fbf55'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2f9e44'; g.fillRect(0, 0, w / 2, h);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 0, w, 6);
});
TEX.tube.wrapS = TEX.tube.wrapT = THREE.RepeatWrapping;
function makeTubeMouth() {
  // a warp pipe sticking out of the wall, opening toward +z
  const g = new THREE.Group();
  const body = part('cyl', '#2f9e44', 2.5, 1.4, 2.5, 0, 0, -0.3, g); body.rotation.x = Math.PI / 2;
  const rim = part('cyl', '#3fbf55', 2.9, 0.45, 2.9, 0, 0, 0.45, g); rim.rotation.x = Math.PI / 2;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.15, 24), new THREE.MeshBasicMaterial({ color: '#0d2a12' }));
  hole.position.z = 0.68; g.add(hole);
  part('box', '#5fd36f', 0.22, 0.12, 1.2, -0.85, 0.9, -0.1, g);
  return g;
}
function labelTex(text, opts = {}) {
  const w = opts.w || 256, h = opts.h || 96;
  return canvasTex(w, h, (g) => {
    if (opts.bg) { g.fillStyle = opts.bg; rr(g, 6, 6, w - 12, h - 12, 22); g.fill(); g.strokeStyle = '#2b1a10'; g.lineWidth = 8; rr(g, 6, 6, w - 12, h - 12, 22); g.stroke(); }
    g.font = `${opts.size || 60}px "Lilita One", "Arial Rounded MT Bold", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (opts.stroke !== false) { g.lineWidth = 12; g.strokeStyle = '#2b1a10'; g.strokeText(text, w / 2, h / 2 + 3); }
    g.fillStyle = opts.color || '#fff'; g.fillText(text, w / 2, h / 2 + 3);
  });
}
function sprite(tex, w, h, opts) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: tex, transparent: true, depthWrite: false }, opts || {})));
  s.scale.set(w, h, 1);
  return s;
}

// ------------------------------------------------------------------ the poop
const POOP = '#8b5a2b';
function makePoop(o = {}) {
  const color = o.color || POOP;
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  part('sph', color, 1.0, 0.44, 1.0, 0, 0.22, 0, body);
  part('sph', color, 0.8, 0.4, 0.8, 0, 0.53, 0, body);
  part('sph', color, 0.54, 0.34, 0.54, 0, 0.8, 0, body);
  const tip = part('cone', color, 0.22, 0.34, 0.22, 0.05, 1.02, 0, body); tip.rotation.z = -0.5;
  // little highlights make it look shiny like a toy
  part('sph', '#c48a52', 0.22, 0.1, 0.12, -0.24, 0.62, 0.22, body).rotation.y = -0.5;
  // face
  const face = new THREE.Group(); body.add(face);
  const eyes = [];
  for (const s of [-1, 1]) {
    const w = part('sph', '#ffffff', 0.22, 0.24, 0.14, s * 0.15, 0.6, 0.3, face);
    const p = part('sph', '#14101f', 0.11, 0.12, 0.08, s * 0.15, 0.6, 0.37, face);
    eyes.push(w, p);
  }
  if (o.angry) {
    for (const s of [-1, 1]) { const b = part('box', '#2b1a10', 0.2, 0.05, 0.05, s * 0.14, 0.73, 0.36, face); b.rotation.z = s * 0.45; }
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 12, Math.PI), mat('#3b200c'));
  mouth.rotation.z = o.angry ? 0 : Math.PI; mouth.position.set(0, o.angry ? 0.34 : 0.4, 0.47); face.add(mouth);
  const hatSlot = new THREE.Group(); hatSlot.position.set(0.02, 0.92, 0); body.add(hatSlot);
  const faceSlot = new THREE.Group(); faceSlot.position.set(0, 0.6, 0.3); body.add(faceSlot);
  g.userData = { body, eyes, hatSlot, faceSlot, mouth, hat: null, face: null };
  return g;
}
function setOutfit(poop, hat, face) {
  const u = poop.userData;
  if (u.hat !== hat) { u.hatSlot.clear(); if (hat) u.hatSlot.add(makeHat(hat)); u.hat = hat; }
  if (u.face !== face) { u.faceSlot.clear(); if (face) u.faceSlot.add(makeFace(face)); u.face = face; }
}
function makeHat(id) {
  const h = new THREE.Group();
  if (id === 'party') {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 14), new THREE.MeshLambertMaterial({ map: canvasTex(64, 64, (g) => {
      g.fillStyle = '#ff5fa2'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ffd93b'; for (let i = 0; i < 64; i += 16) g.fillRect(0, i, 64, 7);
    }) }));
    c.position.y = 0.3; h.add(c);
    part('sph', '#3fe0b0', 0.16, 0.16, 0.16, 0, 0.62, 0, h);
  } else if (id === 'plumber') {
    part('halfSph', '#e3242b', 0.62, 0.5, 0.62, 0, -0.02, 0, h);
    part('cyl', '#e3242b', 0.5, 0.05, 0.36, 0, 0, 0.3, h);
    part('cyl', '#ffffff', 0.18, 0.02, 0.18, 0, 0.17, 0.26, h).rotation.x = 1.1;
  } else if (id === 'crown') {
    part('cyl', '#ffcd03', 0.5, 0.2, 0.5, 0, 0.08, 0, h);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; part('cone', '#ffcd03', 0.1, 0.18, 0.1, Math.sin(a) * 0.22, 0.26, Math.cos(a) * 0.22, h); }
    part('sph', '#e3242b', 0.09, 0.09, 0.09, 0, 0.1, 0.25, h); part('sph', '#0a6cd6', 0.07, 0.07, 0.07, 0.17, 0.1, 0.18, h); part('sph', '#2f9e44', 0.07, 0.07, 0.07, -0.17, 0.1, 0.18, h);
  } else if (id === 'hardhat') {
    part('halfSph', '#ffcd03', 0.66, 0.56, 0.66, 0, -0.02, 0, h);
    part('cyl', '#ffcd03', 0.86, 0.05, 0.86, 0, 0, 0.04, h);
    part('box', '#e0a800', 0.06, 0.06, 0.6, 0, 0.22, 0, h);
  } else if (id === 'sailor') {
    part('cyl', '#ffffff', 0.5, 0.22, 0.5, 0, 0.08, 0, h);
    part('cyl', '#1f5fbf', 0.51, 0.07, 0.51, 0, 0.04, 0, h);
    part('cyl', '#ffffff', 0.6, 0.05, 0.6, 0, 0.21, 0, h);
  } else if (id === 'pirate') {
    part('halfSph', '#1d1d26', 0.5, 0.42, 0.5, 0, 0, 0, h);
    const b = part('cyl', '#1d1d26', 0.9, 0.06, 0.6, 0, 0.05, 0, h);
    for (const s of [-1, 1]) { const w = part('box', '#1d1d26', 0.36, 0.3, 0.06, s * 0.3, 0.14, 0.18, h); w.rotation.y = -s * 0.6; }
    part('sph', '#ffffff', 0.12, 0.12, 0.05, 0, 0.18, 0.28, h);
    part('box', '#ffcd03', 0.9, 0.03, 0.03, 0, 0.09, 0.3, h);
  } else if (id === 'cowboy') {
    part('cyl', '#a0612d', 0.95, 0.05, 0.95, 0, 0.02, 0, h);
    part('cyl', '#a0612d', 0.42, 0.34, 0.42, 0, 0.2, 0, h);
    part('cyl', '#5a3414', 0.43, 0.07, 0.43, 0, 0.08, 0, h);
    const b = part('box', '#a0612d', 0.02, 0.1, 0.3, 0, 0.36, 0, h);
  } else if (id === 'bow') {
    for (const s of [-1, 1]) { const c = part('cone', '#ff5fa2', 0.2, 0.3, 0.12, s * 0.16, 0.08, 0, h); c.rotation.z = s * Math.PI / 2; }
    part('sph', '#ff5fa2', 0.12, 0.12, 0.1, 0, 0.08, 0, h);
    h.position.set(0.12, 0, 0.05); h.rotation.z = -0.3;
  } else if (id === 'chef') {
    part('cyl', '#ffffff', 0.42, 0.22, 0.42, 0, 0.1, 0, h);
    for (const [x, y, z, s] of [[-0.13, 0.3, 0, 0.3], [0.13, 0.3, 0, 0.3], [0, 0.4, 0.08, 0.32], [0, 0.36, -0.12, 0.3]]) part('sph', '#ffffff', s, s, s, x, y, z, h);
  } else if (id === 'viking') {
    part('halfSph', '#9aa3b5', 0.6, 0.55, 0.6, 0, -0.02, 0, h);
    part('cyl', '#c8a24a', 0.62, 0.06, 0.62, 0, 0.01, 0, h);
    for (const s of [-1, 1]) { const c = part('cone', '#f5ecd6', 0.12, 0.42, 0.12, s * 0.36, 0.26, 0, h); c.rotation.z = -s * 0.75; }
  }
  return h;
}
function makeFace(id) {
  const f = new THREE.Group();
  if (id === 'goggles') {
    for (const s of [-1, 1]) {
      const l = part('cyl', '#8ee8ff', 0.24, 0.08, 0.24, s * 0.15, 0, 0.1, f, { transparent: true, opacity: 0.8 }); l.rotation.x = Math.PI / 2;
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 16), mat('#ff9f1c')); r.position.set(s * 0.15, 0, 0.14); f.add(r);
    }
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 24), mat('#3a2a1a')); strap.rotation.x = Math.PI / 2; strap.position.set(0, 0, -0.3); f.add(strap);
  } else if (id === 'shades') {
    for (const s of [-1, 1]) part('box', '#111111', 0.24, 0.14, 0.04, s * 0.15, 0, 0.12, f);
    part('box', '#111111', 0.12, 0.03, 0.03, 0, 0.03, 0.12, f);
    for (const s of [-1, 1]) part('box', '#555555', 0.07, 0.03, 0.01, s * 0.15 - 0.05, 0.03, 0.145, f);
  } else if (id === 'stache') {
    for (const s of [-1, 1]) { const m = part('sph', '#3b2412', 0.26, 0.09, 0.08, s * 0.12, -0.17, 0.14, f); m.rotation.z = s * 0.35; }
  } else if (id === 'nose') {
    part('sph', '#ff2d3b', 0.16, 0.16, 0.16, 0, -0.1, 0.17, f);
  }
  return f;
}

// ------------------------------------------------------------------ items
function makeCorn() {
  const g = new THREE.Group();
  part('sphLo', '#ffd23f', 0.32, 0.42, 0.32, 0, 0, 0, g);
  part('sph', '#fff3b0', 0.1, 0.14, 0.06, -0.06, 0.06, 0.14, g);
  return g;
}
const cobMat = new THREE.MeshLambertMaterial({ map: TEX.cob, emissive: '#7a4a00', emissiveIntensity: 0.5 });
function makeGold(ghost) {
  const g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
  const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 16), ghost ? mat('#ffe9a0', { transparent: true, opacity: 0.4 }) : cobMat);
  spin.add(cob);
  part('sph', ghost ? '#ffe9a0' : '#ffcf1f', 0.56, 0.4, 0.56, 0, 0.44, 0, spin, ghost ? { transparent: true, opacity: 0.4 } : undefined);
  for (const s of [-1, 1]) {
    const l = part('cone', '#4fb34a', 0.3, 0.9, 0.12, s * 0.2, -0.1, 0.05, spin, ghost ? { transparent: true, opacity: 0.4 } : undefined);
    l.rotation.z = s * 0.35;
  }
  if (!ghost) { const gl = sprite(TEX.glow, 2.4, 2.4); g.add(gl); g.userData.glow = gl; }
  g.userData.spin = spin;
  return g;
}
function makePresent() {
  const g = new THREE.Group();
  part('box', '#ff5fa2', 0.8, 0.6, 0.8, 0, 0.3, 0, g);
  part('box', '#ff7ab6', 0.9, 0.18, 0.9, 0, 0.66, 0, g);
  part('box', '#ffd23f', 0.16, 0.8, 0.84, 0, 0.38, 0, g); part('box', '#ffd23f', 0.84, 0.8, 0.16, 0, 0.38, 0, g);
  for (const s of [-1, 1]) { const b = part('torus', '#ffd23f', 0.5, 0.5, 0.5, s * 0.14, 0.86, 0, g); b.rotation.y = Math.PI / 2; b.rotation.x = s * 0.4; }
  return g;
}
function makeSign() {
  const g = new THREE.Group();
  part('box', '#8a5a2b', 0.12, 1.1, 0.12, 0, 0.55, 0, g);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.82), new THREE.MeshLambertMaterial({ map: TEX.sign, transparent: true, side: THREE.DoubleSide }));
  b.position.set(0, 1.25, 0.08); g.add(b);
  part('box', '#7a4a22', 1.1, 0.82, 0.08, 0, 1.25, 0.02, g);
  return g;
}
function makeDoor(iconTex) {
  const g = new THREE.Group();
  part('box', '#5a2a8a', 1.7, 2.3, 0.4, 0, 1.15, 0, g);
  const arch = part('cyl', '#5a2a8a', 1.7, 0.4, 1.7, 0, 2.3, 0, g); arch.rotation.x = Math.PI / 2; arch.scale.set(1.7, 0.4, 1.7);
  const door = part('box', '#8a4dd6', 1.2, 2.0, 0.1, 0, 1.0, 0.22, g);
  const top = part('cyl', '#8a4dd6', 1.2, 0.1, 1.2, 0, 2.0, 0.22, g); top.rotation.x = Math.PI / 2;
  part('sph', '#ffd23f', 0.14, 0.14, 0.14, 0.38, 1.0, 0.3, g);
  for (let i = 0; i < 5; i++) part('sph', ['#ff5fa2', '#3fe0b0', '#ffd23f'][i % 3], 0.22, 0.22, 0.22, -0.8 + i * 0.4, 3.05 - Math.abs(i - 2) * 0.12, 0.05, g);
  const icon = sprite(iconTex, 1.4, 1.4); icon.position.set(0, 3.9, 0); g.add(icon);
  const board = part('box', '#ffffff', 1.5, 1.5, 0.08, 0, 3.9, -0.1, g);
  g.userData = { door, top, icon };
  return g;
}
function makeRat() {
  const g = new THREE.Group();
  part('sph', '#9a9aa8', 0.9, 0.85, 0.8, 0, 0.45, 0, g);
  part('sph', '#9a9aa8', 0.7, 0.65, 0.7, 0, 1.1, 0.05, g);
  for (const s of [-1, 1]) { part('sph', '#9a9aa8', 0.38, 0.38, 0.12, s * 0.32, 1.48, 0, g); part('sph', '#ffb3c7', 0.24, 0.24, 0.06, s * 0.32, 1.48, 0.06, g); }
  part('sph', '#ffb3c7', 0.14, 0.12, 0.12, 0, 1.06, 0.4, g);
  for (const s of [-1, 1]) { part('sph', '#14101f', 0.1, 0.12, 0.06, s * 0.14, 1.2, 0.34, g); }
  part('box', '#ffffff', 0.12, 0.1, 0.03, 0, 0.92, 0.38, g);
  part('cyl', '#2b1a10', 0.5, 0.32, 0.5, 0, 1.52, 0, g).visible = false;
  return g;
}
function makeShop() {
  const g = new THREE.Group();
  part('box', '#c48a4a', 2.6, 1.0, 1.0, 0, 0.5, 0.6, g);
  part('box', '#e9b872', 2.7, 0.12, 1.1, 0, 1.05, 0.6, g);
  for (const s of [-1, 1]) part('box', '#8a5a2b', 0.14, 2.6, 0.14, s * 1.2, 1.3, 1.0, g);
  for (const s of [-1, 1]) part('box', '#8a5a2b', 0.14, 2.6, 0.14, s * 1.2, 1.3, -0.4, g);
  for (let i = 0; i < 6; i++) { const a = part('box', i % 2 ? '#ffffff' : '#e3242b', 0.46, 0.12, 1.8, -1.15 + i * 0.46, 2.65, 0.3, g); a.rotation.x = 0.25; }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.6), new THREE.MeshBasicMaterial({ map: labelTex('SHOP', { bg: '#ffd23f', color: '#2b1a10', stroke: false, w: 256, h: 80, size: 54 }), transparent: true }));
  sign.position.set(0, 3.2, 1.0); g.add(sign);
  const rat = makeRat(); rat.position.set(0, 0.3, -0.1); rat.scale.setScalar(0.8); g.add(rat);
  for (let i = 0; i < 3; i++) { const c = makeCorn(); c.position.set(-0.8 + i * 0.25, 1.25, 0.7); c.scale.setScalar(0.8); g.add(c); }
  g.userData.rat = rat;
  return g;
}
function makeExit(final) {
  const g = new THREE.Group();
  if (final) {
    part('cyl', '#ffffff', 0.12, 3.2, 0.12, 0, 1.6, 0, g);
    const u = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 12, 1, true), new THREE.MeshLambertMaterial({ map: canvasTex(128, 32, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#ff5fa2'; c.fillRect(i * 16, 0, 16, 32); } }), side: THREE.DoubleSide }));
    u.position.y = 3.3; g.add(u);
    part('box', '#ffcf5a', 1.6, 0.2, 0.8, 1.1, 0.25, 0.8, g);
    part('box', '#ff8fb1', 1.4, 0.1, 0.6, 1.1, 0.4, 0.8, g);
  } else {
    part('cyl', '#2f9e44', 2.1, 1.4, 2.1, 0, 0.7, 0, g);
    part('cyl', '#3fbf55', 2.5, 0.45, 2.5, 0, 1.55, 0, g);
    part('cyl', '#0d2a12', 1.9, 0.05, 1.9, 0, 1.79, 0, g);
    part('box', '#5fd36f', 0.25, 1.2, 0.1, -0.6, 0.75, 1.02, g);
  }
  const lbl = sprite(labelTex('0/3', { bg: '#ffffff', color: '#2b1a10', stroke: false, w: 256, h: 110, size: 64 }), 1.8, 0.78);
  lbl.position.set(0, final ? 4.6 : 3.0, 0); g.add(lbl);
  g.userData.label = lbl;
  return g;
}
function setLabel(spr, text, bg) {
  spr.material.map.dispose();
  spr.material.map = labelTex(text, { bg, color: '#2b1a10', stroke: false, w: 256, h: 110, size: 64 });
  spr.material.needsUpdate = true;
}

// ------------------------------------------------------------------ enemies
function angryEyes(g, y, z, s = 1) {
  for (const k of [-1, 1]) {
    part('sph', '#ffffff', 0.2 * s, 0.22 * s, 0.1 * s, k * 0.13 * s, y, z, g);
    part('sph', '#14101f', 0.1 * s, 0.11 * s, 0.06 * s, k * 0.12 * s, y - 0.02, z + 0.05 * s, g);
    const b = part('box', '#2b1a10', 0.2 * s, 0.05 * s, 0.05 * s, k * 0.13 * s, y + 0.13 * s, z + 0.03, g); b.rotation.z = k * 0.5;
  }
}
function makeEnemy(skin) {
  const g = new THREE.Group(); const u = {};
  if (skin === 'tp') {
    part('cyl', '#ffffff', 0.8, 0.85, 0.8, 0, 0.42, 0, g);
    part('cyl', '#c9b08a', 0.3, 0.86, 0.3, 0, 0.43, 0, g);
    for (let i = 0; i < 3; i++) part('cyl', '#e8e8f0', 0.81, 0.02, 0.81, 0, 0.18 + i * 0.25, 0, g);
    angryEyes(g, 0.55, 0.4);
    const tail = part('box', '#ffffff', 0.4, 0.02, 1.0, 0, 0.03, -0.75, g); u.tail = tail;
  } else if (skin === 'car') {
    part('box', '#e3242b', 1.0, 0.36, 1.4, 0, 0.36, 0, g);
    part('box', '#e3242b', 0.8, 0.32, 0.7, 0, 0.7, -0.1, g);
    part('box', '#bfe8ff', 0.82, 0.22, 0.5, 0, 0.72, 0.0, g);
    u.wheels = [];
    for (const x of [-0.5, 0.5]) for (const z of [-0.45, 0.45]) { const w = part('cyl', '#222222', 0.38, 0.16, 0.38, x, 0.19, z, g); w.rotation.z = Math.PI / 2; u.wheels.push(w); }
    angryEyes(g, 0.45, 0.72, 0.9);
  } else if (skin === 'poop') {
    const p = makePoop({ color: '#6f6a2a', angry: true }); p.scale.setScalar(0.9); g.add(p); u.poop = p;
  } else if (skin === 'dust') {
    part('sphLo', '#9aa0ab', 0.9, 0.8, 0.9, 0, 0.42, 0, g);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; part('sphLo', '#b5bac4', 0.32, 0.32, 0.32, Math.cos(a) * 0.4, 0.42 + Math.sin(i * 2.3) * 0.25, Math.sin(a) * 0.4, g); }
    angryEyes(g, 0.5, 0.4);
  } else if (skin === 'bot') {
    part('cyl', '#e6edf5', 0.9, 0.5, 0.9, 0, 0.4, 0, g);
    part('box', '#1d2b3a', 0.6, 0.18, 0.2, 0, 0.5, 0.36, g);
    u.eye = part('sph', '#ff3b3b', 0.12, 0.12, 0.08, 0, 0.5, 0.46, g);
    const br = part('cyl', '#4fb3ff', 1.0, 0.08, 1.0, 0, 0.1, 0, g); u.brush = br;
    part('cyl', '#9aa3b5', 0.06, 0.4, 0.06, 0, 0.85, 0, g); part('sph', '#ff3b3b', 0.12, 0.12, 0.12, 0, 1.08, 0, g);
  } else if (skin === 'crab') {
    part('sph', '#ff5a3c', 1.0, 0.5, 0.75, 0, 0.4, 0, g);
    for (const s of [-1, 1]) {
      part('cyl', '#ff5a3c', 0.08, 0.5, 0.08, s * 0.55, 0.45, 0.2, g).rotation.z = s * 0.8;
      const c = part('sph', '#ff5a3c', 0.32, 0.26, 0.26, s * 0.75, 0.66, 0.35, g); (u.claws = u.claws || []).push(c);
      part('cyl', '#ff5a3c', 0.05, 0.3, 0.05, s * 0.14, 0.75, 0.2, g);
      part('sph', '#ffffff', 0.14, 0.14, 0.14, s * 0.14, 0.92, 0.2, g); part('sph', '#14101f', 0.07, 0.07, 0.07, s * 0.14, 0.93, 0.27, g);
    }
  } else if (skin === 'fly') {
    part('sph', '#26303a', 0.5, 0.42, 0.6, 0, 0, 0, g);
    for (const s of [-1, 1]) part('sph', '#c0392b', 0.2, 0.22, 0.16, s * 0.13, 0.08, 0.24, g);
    u.wings = [];
    for (const s of [-1, 1]) { const w = part('sph', '#ffffff', 0.5, 0.04, 0.26, s * 0.3, 0.2, -0.05, g, { transparent: true, opacity: 0.7 }); u.wings.push(w); }
  } else if (skin === 'gull') {
    part('sph', '#ffffff', 0.5, 0.42, 0.9, 0, 0, 0, g);
    part('sph', '#ffffff', 0.34, 0.34, 0.34, 0, 0.18, 0.42, g);
    part('cone', '#ffb300', 0.1, 0.24, 0.1, 0, 0.14, 0.66, g).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) part('sph', '#14101f', 0.06, 0.06, 0.06, s * 0.12, 0.24, 0.55, g);
    u.wings = [];
    for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.2, 0.1, 0); part('box', '#e8eef5', 0.9, 0.05, 0.4, s * 0.45, 0, 0, w); g.add(w); u.wings.push(w); }
  } else if (skin === 'drip') {
    part('sph', '#7fd0ff', 0.4, 0.4, 0.4, 0, 0, 0, g, { transparent: true, opacity: 0.9 });
    part('cone', '#7fd0ff', 0.3, 0.36, 0.3, 0, 0.3, 0, g, { transparent: true, opacity: 0.9 });
  } else if (skin === 'plunger') {
    part('cyl', '#c48a4a', 0.16, 12, 0.16, 0, 6.5, 0, g);
    part('halfSph', '#e3242b', 1.0, 0.8, 1.0, 0, 0.0, 0, g).rotation.x = Math.PI;
    part('cyl', '#e3242b', 1.0, 0.2, 1.0, 0, 0.25, 0, g);
    g.children[1].position.y = 0.45;
  } else if (skin === 'press') {
    part('cyl', '#7b8496', 0.24, 12, 0.24, 0, 6.8, 0, g);
    part('box', '#7b8496', 1.3, 0.8, 1.3, 0, 0.4, 0, g);
    for (let i = 0; i < 4; i++) part('box', '#ffcf3f', 0.25, 0.1, 1.32, -0.45 + i * 0.3, 0.1, 0, g);
  } else if (skin === 'fan' || skin === 'paddle') {
    u.bar = new THREE.Group(); g.add(u.bar);
    part('cyl', '#ffcf3f', 0.6, 0.5, 0.6, 0, 0, 0, g);
    part('cyl', '#7b8496', 0.2, 2, 0.2, 0, -1, 0, g);
  } else if (skin === 'gator') {
    part('box', '#3f8f3a', 0.7, 0.4, 1.6, 0, 0, 0, g);
    part('box', '#3f8f3a', 0.55, 0.26, 0.8, 0, -0.03, 1.1, g);
    for (const s of [-1, 1]) { part('sph', '#ffeb3b', 0.18, 0.18, 0.18, s * 0.2, 0.22, 0.6, g); part('box', '#111111', 0.04, 0.12, 0.04, s * 0.2, 0.23, 0.69, g); }
    for (let i = 0; i < 4; i++) part('cone', '#ffffff', 0.08, 0.1, 0.08, -0.2 + i * 0.13, -0.18, 1.35, g).rotation.x = Math.PI;
    u.tail = part('box', '#3f8f3a', 0.3, 0.2, 0.9, 0, 0, -1.1, g);
  } else if (skin === 'shark') {
    part('sph', '#7d8ea3', 1.2, 0.9, 3.2, 0, 0, 0, g);
    part('sph', '#e8eef5', 0.9, 0.5, 2.6, 0, -0.22, 0.2, g);
    part('cone', '#7d8ea3', 0.5, 0.9, 0.18, 0, 0.75, -0.2, g);
    const t = part('cone', '#7d8ea3', 0.9, 0.9, 0.18, 0, 0, -1.8, g); t.rotation.x = -Math.PI / 2; u.tail = t;
    for (const s of [-1, 1]) { part('sph', '#14101f', 0.14, 0.14, 0.14, s * 0.4, 0.15, 1.1, g); }
    for (let i = 0; i < 5; i++) part('cone', '#ffffff', 0.1, 0.14, 0.1, -0.24 + i * 0.12, -0.18, 1.4, g).rotation.x = Math.PI;
  } else if (skin === 'jelly') {
    part('halfSph', '#ff8fd1', 1.0, 0.9, 1.0, 0, 0, 0, g, { transparent: true, opacity: 0.8 });
    u.tent = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const t = part('cyl', '#d65cb0', 0.06, 1.0, 0.06, Math.cos(a) * 0.3, -0.5, Math.sin(a) * 0.3, g); u.tent.push(t); }
    for (const s of [-1, 1]) part('sph', '#ffffff', 0.12, 0.12, 0.08, s * 0.16, 0.18, 0.42, g);
  }
  g.userData = u;
  return g;
}
function makeSpinBar(skin, r) {
  const g = new THREE.Group();
  const col = skin === 'paddle' ? '#c48a4a' : '#b7c0d1';
  part('box', col, r * 2, 0.35, 0.5, 0, 0, 0, g);
  if (skin === 'paddle') for (const s of [-1, 1]) part('box', col, 0.4, 1.0, 1.2, s * (r - 0.3), 0, 0, g);
  else for (const s of [-1, 1]) part('box', '#e3242b', 0.6, 0.38, 0.52, s * (r - 0.3), 0, 0, g);
  return g;
}

// ------------------------------------------------------------------ captures
function makeCapture(type) {
  const g = new THREE.Group(); const u = {};
  if (type === 'duck') {
    part('sph', '#ffd93b', 1.2, 0.8, 1.5, 0, 0.45, 0, g);
    part('sph', '#ffd93b', 0.8, 0.8, 0.8, 0, 1.05, 0.45, g);
    part('cone', '#ff8a1c', 0.3, 0.4, 0.2, 0, 1.0, 0.95, g).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { part('sph', '#14101f', 0.12, 0.14, 0.08, s * 0.22, 1.18, 0.75, g); part('sph', '#f2b705', 0.2, 0.4, 0.7, s * 0.55, 0.5, -0.05, g); }
    part('cone', '#ffd93b', 0.4, 0.4, 0.3, 0, 0.75, -0.75, g).rotation.x = -1.0;
    u.hatPos = [0, 1.42, 0.45];
  } else if (type === 'bubble') {
    const b = part('sph', '#d8f3ff', 1.8, 1.8, 1.8, 0, 0.9, 0, g, { transparent: true, opacity: 0.35, depthWrite: false });
    b.renderOrder = 2;
    part('sph', '#ffffff', 0.35, 0.22, 0.1, -0.4, 1.4, 0.75, g, { transparent: true, opacity: 0.85 });
    part('torus', '#ffb3e6', 2.2, 2.2, 0.4, 0, 0.9, 0, g, { transparent: true, opacity: 0.25 });
    u.inside = true;
  } else if (type === 'roll') {
    const r = new THREE.Group(); r.position.y = 0.6; g.add(r); u.roll = r;
    part('cyl', '#ffffff', 1.2, 1.1, 1.2, 0, 0, 0, r).rotation.z = Math.PI / 2;
    part('cyl', '#b98a5a', 0.45, 1.12, 0.45, 0, 0, 0, r).rotation.z = Math.PI / 2;
    for (let i = -1; i <= 1; i++) part('cyl', '#e4e4ee', 1.21, 0.03, 1.21, i * 0.35, 0, 0, r).rotation.z = Math.PI / 2;
    u.hatPos = [0, 1.18, 0];
  } else if (type === 'fish') {
    part('sph', '#ff8a1c', 0.8, 0.8, 1.5, 0, 0.4, 0, g);
    part('box', '#ffffff', 0.82, 0.6, 0.18, 0, 0.42, 0.1, g);
    const t = part('cone', '#ff8a1c', 0.7, 0.6, 0.15, 0, 0.4, -0.9, g); t.rotation.x = -Math.PI / 2; u.tail = t;
    for (const s of [-1, 1]) { part('sph', '#ffffff', 0.2, 0.2, 0.1, s * 0.3, 0.55, 0.48, g); part('sph', '#14101f', 0.1, 0.1, 0.06, s * 0.33, 0.55, 0.53, g); }
    u.hatPos = [0, 0.8, 0.2];
  }
  g.userData = u;
  return g;
}

// ------------------------------------------------------------------ props for the title, intro, map and ending
function makeToilet() {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.9, 0), new THREE.Vector2(1.6, 0.6), new THREE.Vector2(2.4, 1.6), new THREE.Vector2(2.8, 2.6), new THREE.Vector2(3.0, 2.9), new THREE.Vector2(2.6, 3.0), new THREE.Vector2(2.3, 2.6),
  ], 28), new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }));
  g.add(bowl);
  part('cyl', '#f2f4fa', 1.8, 1.2, 1.8, 0, -0.6, 0, g);
  part('box', '#ffffff', 5.4, 3.4, 1.6, 0, 4.0, -3.2, g);
  part('box', '#c0c8d8', 1.0, 0.25, 0.3, 1.8, 5.4, -2.3, g);
  const seat = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.28, 10, 32), mat('#f4f6fb')); seat.rotation.x = Math.PI / 2; seat.position.y = 3.05; g.add(seat);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.35, 40), new THREE.MeshBasicMaterial({ color: '#5fb8f0' }));
  water.rotation.x = -Math.PI / 2; water.position.y = 2.2; g.add(water);
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (c, w) => {
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 10;
    for (let k = 0; k < 4; k++) { c.beginPath(); for (let a = 0; a < 12; a += 0.1) { const r = 125 - a * 10; const an = a + k * Math.PI / 2; const x = w / 2 + Math.cos(an) * r, y = w / 2 + Math.sin(an) * r; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  }), transparent: true, opacity: 0 }));
  swirl.rotation.x = -Math.PI / 2; swirl.position.y = 2.22; g.add(swirl);
  g.userData = { water, swirl, handle: g.children[3] };
  return g;
}
function makeBoat() {
  const g = new THREE.Group();
  const r = part('cyl', '#ffffff', 1.4, 2.6, 1.4, 0, 0.6, 0, g); r.rotation.z = Math.PI / 2;
  part('cyl', '#b98a5a', 0.5, 2.62, 0.5, 0, 0.6, 0, g).rotation.z = Math.PI / 2;
  part('cyl', '#7a4a22', 0.08, 2.4, 0.08, -0.3, 2.3, 0, g);
  const sail = new THREE.Mesh(new THREE.BufferGeometry(), mat('#ffffff', { side: THREE.DoubleSide }));
  sail.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.26, 1.4, 0, -0.26, 3.4, 0, 1.2, 1.4, 0], 3)); sail.geometry.computeVertexNormals();
  g.add(sail);
  const p = makePoop(); p.position.set(-0.8, 1.25, 0); p.scale.setScalar(0.8); g.add(p);
  g.userData.poop = p;
  return g;
}
function makePalm(h = 4) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const s = part('cyl', '#9a6a3a', 0.4 - i * 0.03, h / 6 + 0.05, 0.4 - i * 0.03, Math.sin(i * 0.4) * 0.3, i * h / 6 + h / 12, 0, g); }
  for (let i = 0; i < 6; i++) { const l = new THREE.Group(); l.position.set(Math.sin(2.4) * 0.3, h, 0); l.rotation.y = i * 1.05; const leaf = part('sph', '#2f9e44', 0.5, 0.1, 2.2, 0, -0.2, 1.0, l); leaf.rotation.x = 0.35; g.add(l); }
  for (let i = 0; i < 3; i++) part('sph', '#7a4a22', 0.35, 0.35, 0.35, Math.cos(i * 2) * 0.3, h - 0.25, Math.sin(i * 2) * 0.3, g);
  return g;
}
function makeCloud() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) part('sph', '#ffffff', rand(2, 3.4), rand(1.4, 2), rand(2, 3), i * 1.4 - 2.8, rand(-0.3, 0.4), rand(-0.5, 0.5), g);
  return g;
}

window.ART = { makeTubeMouth, tileTex, GEO, mat, part, canvasTex, rr, TEX, labelTex, sprite, makePoop, setOutfit, makeHat, makeFace, makeCorn, makeGold, makePresent,
  makeSign, makeDoor, makeShop, makeRat, makeExit, setLabel, makeEnemy, makeSpinBar, makeCapture, makeToilet, makeBoat, makePalm, makeCloud };
})();
