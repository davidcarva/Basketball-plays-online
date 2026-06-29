import { applyFrameInstant, rebuildPaths, updateVisibility } from './play.js';

// Esquemas defensivos
export const DEFENSE_SCHEMES = [
  { id: 'man',   name: 'Individual (homem a homem)' },
  { id: '2-3',   name: 'Zona 2-3' },
  { id: '3-2',   name: 'Zona 3-2' },
  { id: '1-3-1', name: 'Zona 1-3-1' },
  { id: '2-1-2', name: 'Zona 2-1-2' },
  { id: '1-2-2', name: 'Zona 1-2-2' },
  { id: 'box1',  name: 'Box-and-1' },
  { id: 'press', name: 'Pressão 2-2-1 (quadra inteira)' },
];

// Formações-base das zonas (lado atacado, perto de z=0)
export const ZONES = {
  '2-3':   { X1: { x: -2.2, z: 6.0 }, X2: { x: 2.2, z: 6.0 }, X3: { x: -3.6, z: 2.2 }, X4: { x: 0, z: 1.5 }, X5: { x: 3.6, z: 2.2 } },
  '3-2':   { X1: { x: 0, z: 7.0 },    X2: { x: -3.6, z: 6.0 }, X3: { x: 3.6, z: 6.0 }, X4: { x: -2.6, z: 2.3 }, X5: { x: 2.6, z: 2.3 } },
  '1-3-1': { X1: { x: 0, z: 7.8 },    X2: { x: -4.0, z: 5.0 }, X3: { x: 0, z: 4.6 },   X4: { x: 4.0, z: 5.0 }, X5: { x: 0, z: 1.6 } },
  '2-1-2': { X1: { x: -2.4, z: 6.4 }, X2: { x: 2.4, z: 6.4 }, X3: { x: 0, z: 4.2 },   X4: { x: -3.2, z: 1.8 }, X5: { x: 3.2, z: 1.8 } },
  '1-2-2': { X1: { x: 0, z: 7.8 },    X2: { x: -4.2, z: 5.2 }, X3: { x: 4.2, z: 5.2 }, X4: { x: -3.0, z: 2.0 }, X5: { x: 3.0, z: 2.0 } },
};

const BOX1 = { X1: { x: -2.1, z: 5.0 }, X2: { x: 2.1, z: 5.0 }, X3: { x: -2.1, z: 2.2 }, X4: { x: 2.1, z: 2.2 } };
const PRESS = { X1: { x: -3.5, z: 23 }, X2: { x: 3.5, z: 23 }, X3: { x: -5, z: 18 }, X4: { x: 5, z: 18 }, X5: { x: 0, z: 11 } };

const BASKET = { x: 0, z: 1.575 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Defesa REATIVA (reage ao ataque, quadro a quadro) ----------

// Individual: cada Xi entre seu Oi e o aro; quem marca a bola pressiona mais
// perto; quem está sem bola "afunda" um pouco na direção da bola (ajuda).
function manReact(off, owner, n) {
  const out = {};
  const ball = owner && off[owner] ? off[owner] : null;
  for (let i = 1; i <= n; i++) {
    const o = off[`O${i}`];
    const dx = BASKET.x - o.x, dz = BASKET.z - o.z;
    const l = Math.hypot(dx, dz) || 1;
    const onBall = `O${i}` === owner;
    const gap = onBall ? 0.9 : 1.4;
    const X = { x: o.x + (dx / l) * gap, z: o.z + (dz / l) * gap };
    if (!onBall && ball) { // ajuda: desloca p/ a linha da bola
      X.x += (ball.x - X.x) * 0.18;
      X.z += (ball.z - X.z) * 0.10;
    }
    X.z = Math.max(0.9, X.z);
    out[`X${i}`] = X;
  }
  return out;
}

// Zona: a forma desliza p/ o lado da bola e o defensor mais próximo sobe a contestar.
function zoneReact(scheme, off, owner) {
  const baseZone = ZONES[scheme];
  const ball = owner && off[owner] ? off[owner] : null;
  const out = {};
  for (const k in baseZone) {
    const p = { x: baseZone[k].x, z: baseZone[k].z };
    if (ball) {
      p.x += clamp(ball.x * 0.28, -2.2, 2.2); // desliza p/ o lado da bola
      p.z += (ball.z - p.z) * 0.06;           // ajusta profundidade levemente
    }
    out[k] = p;
  }
  if (ball) { // contesta a bola com o defensor mais próximo
    let best = null, bd = Infinity;
    for (const k in out) {
      const d = Math.hypot(out[k].x - ball.x, out[k].z - ball.z);
      if (d < bd) { bd = d; best = k; }
    }
    if (best) {
      out[best].x += (ball.x - out[best].x) * 0.5;
      out[best].z += (ball.z - out[best].z) * 0.45;
      out[best].z = Math.max(0.9, out[best].z);
    }
  }
  return out;
}

// Box-and-1: caixa desliza levemente + perseguidor (X5) cola em quem tem a bola
function box1React(off, owner) {
  const ball = owner && off[owner] ? off[owner] : null;
  const out = {};
  const shift = ball ? clamp(ball.x * 0.2, -1.6, 1.6) : 0;
  for (const k in BOX1) out[k] = { x: BOX1[k].x + shift, z: BOX1[k].z };
  const target = (owner && owner.startsWith('O')) ? owner : 'O1';
  const o = off[target] || off.O1;
  const dx = BASKET.x - o.x, dz = BASKET.z - o.z;
  const l = Math.hypot(dx, dz) || 1;
  out.X5 = { x: o.x + (dx / l) * 1.0, z: Math.max(0.9, o.z + (dz / l) * 1.0) };
  return out;
}

// Posições reativas da defesa p/ um quadro
export function reactiveDefense(off, owner, scheme, n) {
  if (n < 5 || scheme === 'man') return manReact(off, owner, n);
  if (ZONES[scheme]) return zoneReact(scheme, off, owner);
  if (scheme === 'box1') return box1React(off, owner);
  if (scheme === 'press') {
    const ball = owner && off[owner] ? off[owner] : null;
    const out = {};
    const shift = ball ? clamp(ball.x * 0.2, -2, 2) : 0;
    for (const k in PRESS) out[k] = { x: PRESS[k].x + shift, z: PRESS[k].z };
    return out;
  }
  return manReact(off, owner, 5);
}

// Aplica defesa reativa à jogada INTEIRA (cada quadro reage à sua cena)
export function applyReactiveToPlay(app, scheme) {
  const n = app.state.teamSize || 5;
  const sc = n < 5 ? 'man' : scheme;
  for (const fr of app.state.play.frames) {
    const D = reactiveDefense(fr.positions, fr.ballOwner, sc, n);
    for (const k in D) fr.positions[k] = D[k];
  }
  app.state.showDefense = true;
  updateVisibility(app);
  applyFrameInstant(app, app.state.currentFrame);
  rebuildPaths(app);
  app.onDefenseChange?.();
}

// Aplica defesa só ao quadro atual (posicionamento manual rápido)
export function applyDefense(app, schemeId) {
  const frame = app.state.play.frames[app.state.currentFrame];
  const n = app.state.teamSize || 5;
  const D = reactiveDefense(frame.positions, frame.ballOwner, n < 5 ? 'man' : schemeId, n);
  for (const k in D) frame.positions[k] = D[k];
  app.state.showDefense = true;
  updateVisibility(app);
  applyFrameInstant(app, app.state.currentFrame);
  rebuildPaths(app);
  app.onDefenseChange?.();
}
