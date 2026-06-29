import * as THREE from 'three';
import { COURT } from './court.js';

export const PLAYER_IDS = ['O1', 'O2', 'O3', 'O4', 'O5', 'X1', 'X2', 'X3', 'X4', 'X5'];
export const OFFENSE_IDS = ['O1', 'O2', 'O3', 'O4', 'O5'];
export const ALL_IDS = [...PLAYER_IDS, 'BALL'];

const BASE_SEG_DUR = 1.1; // segundos por trecho (antes do multiplicador de velocidade)
const BALL_OFFSET = 0.45; // deslocamento lateral da bola quando segura por um jogador
const BALL_HOLD_Y = 0.9;  // segura na altura da cintura
const BALL_LOOSE_Y = 0.12; // raio da bola: descansa no chão
const SNAP_RADIUS = 1.6;  // raio p/ a bola "grudar" num jogador ao soltar

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

// Formação inicial ABERTA (5-out): ataque espalhado nas extremidades.
// Em 3v3 só O1-O3/X1-X3 ficam visíveis (top + duas alas), o resto fica oculto.
export function defaultPositions() {
  return {
    O1: { x: 0, z: 8.8 },     // armador no topo
    O2: { x: 5.6, z: 6.6 },   // ala direita
    O3: { x: -5.6, z: 6.6 },  // ala esquerda
    O4: { x: 6.7, z: 1.7 },   // canto direito
    O5: { x: -6.7, z: 1.7 },  // canto esquerdo
    X1: { x: 0, z: 7.0 },
    X2: { x: 4.8, z: 5.6 },
    X3: { x: -4.8, z: 5.6 },
    X4: { x: 5.4, z: 1.9 },
    X5: { x: -5.4, z: 1.9 },
    BALL: { x: 0.45, z: 8.8 },
  };
}

export function createPlay(name = 'Nova jogada') {
  return {
    id: crypto.randomUUID(),
    name,
    set: '',
    vs: [],          // defesas contra as quais a jogada funciona
    teamSize: 5,     // 5 (5v5) ou 3 (3v3)
    mode: 'half',
    createdAt: Date.now(),
    frames: [{ label: 'Início', positions: defaultPositions(), ballOwner: 'O1' }],
  };
}

// IDs ativos conforme o tamanho da equipe (3v3 ou 5v5)
export function activeOffense(app) {
  return OFFENSE_IDS.slice(0, app.state.teamSize || 5);
}
export function activeDefense(app) {
  return ['X1', 'X2', 'X3', 'X4', 'X5'].slice(0, app.state.teamSize || 5);
}

// Mostra/oculta jogadores conforme tamanho da equipe e o toggle de defesa
export function updateVisibility(app) {
  const n = app.state.teamSize || 5;
  for (const a of app.actors.values()) {
    if (a.id === 'BALL') continue;
    let vis = parseInt(a.id.slice(1), 10) <= n;
    if (a.id.startsWith('X')) vis = vis && app.state.showDefense;
    a.mesh.visible = vis;
  }
}

const clonePositions = (p) => {
  const out = {};
  for (const id of ALL_IDS) out[id] = { x: p[id].x, z: p[id].z };
  return out;
};

const cloneFrame = (f, label) => ({
  label: label ?? f.label,
  positions: clonePositions(f.positions),
  ballOwner: f.ballOwner ?? null,
});

// Onde a bola fica num quadro: junto do dono (held) ou solta na posição própria
function ballAnchor(frame) {
  const owner = frame.ballOwner;
  const pos = frame.positions;
  if (owner && pos[owner]) {
    return { x: pos[owner].x + BALL_OFFSET, z: pos[owner].z, held: true };
  }
  const b = pos.BALL || { x: 0, z: 0 };
  return { x: b.x, z: b.z, held: false };
}

// ---------- Aplicar um quadro instantaneamente aos meshes ----------
export function applyFrameInstant(app, index) {
  const frame = app.state.play.frames[index];
  if (!frame) return;
  for (const id of PLAYER_IDS) {
    const p = frame.positions[id];
    app.actors.get(id).mesh.position.set(p.x, 0, p.z);
  }
  const a = ballAnchor(frame);
  app.actors.get('BALL').mesh.position.set(a.x, a.held ? BALL_HOLD_Y : BALL_LOOSE_Y, a.z);
}

// ---------- Reprodução ----------
export function startPlayback(app) {
  const frames = app.state.play.frames;
  if (frames.length < 2) return;
  app.state.playing = true;
  app.state.playhead = 0;
  setSelection(app, null);
  setPathsVisible(app, false);
  app.onPlayStateChange?.(true);
}

export function stopPlayback(app, applyCurrent = true) {
  app.state.playing = false;
  app.onPlayStateChange?.(false);
  setPathsVisible(app, app.state.showPaths);
  if (applyCurrent) applyFrameInstant(app, app.state.currentFrame);
}

export function updatePlayback(app, dt) {
  if (!app.state.playing) return;
  const frames = app.state.play.frames;
  const maxPh = frames.length - 1;
  const effDur = BASE_SEG_DUR / app.state.speed;
  app.state.playhead += dt / effDur;

  if (app.state.playhead >= maxPh) {
    app.state.playhead = maxPh;
    applyFrameInstant(app, maxPh);
    app.onPlayhead?.(1);
    stopPlayback(app, false);
    app.state.currentFrame = maxPh;
    app.onFrameChange?.();
    return;
  }

  const seg = Math.floor(app.state.playhead);
  const t = app.state.playhead - seg;
  const e = easeInOut(t);
  const fa = frames[seg];
  const fb = frames[seg + 1];

  for (const id of PLAYER_IDS) {
    const a = fa.positions[id];
    const b = fb.positions[id];
    app.actors.get(id).mesh.position.set(lerp(a.x, b.x, e), 0, lerp(a.z, b.z, e));
  }

  // Bola: segue o dono (drible) ou voa num arco quando há passe / bola solta
  const aB = ballAnchor(fa);
  const bB = ballAnchor(fb);
  const bx = lerp(aB.x, bB.x, e);
  const bz = lerp(aB.z, bB.z, e);
  const baseY = lerp(aB.held ? BALL_HOLD_Y : BALL_LOOSE_Y, bB.held ? BALL_HOLD_Y : BALL_LOOSE_Y, e);
  const isPass = fa.ballOwner !== fb.ballOwner;
  const dist = Math.hypot(bB.x - aB.x, bB.z - aB.z);
  const arc = isPass ? Math.min(dist * 0.22, 2.6) : 0;
  app.actors.get('BALL').mesh.position.set(bx, baseY + arc * 4 * t * (1 - t), bz);

  app.onPlayhead?.(app.state.playhead / maxPh);
}

// ---------- Edição de quadros ----------
export function setFrame(app, index) {
  app.state.currentFrame = Math.max(0, Math.min(index, app.state.play.frames.length - 1));
  applyFrameInstant(app, app.state.currentFrame);
  rebuildPaths(app);
  app.onFrameChange?.();
}

export function addFrame(app) {
  const frames = app.state.play.frames;
  const cur = app.state.currentFrame;
  frames.splice(cur + 1, 0, cloneFrame(frames[cur], `Q${frames.length + 1}`));
  setFrame(app, cur + 1);
}

export function deleteFrame(app, index) {
  const frames = app.state.play.frames;
  if (frames.length <= 1) return;
  frames.splice(index, 1);
  setFrame(app, Math.min(index, frames.length - 1));
}

function courtLen(app) {
  return app.state.courtLength || COURT.halfLength;
}

export function updateActorPosition(app, id, x, z) {
  const hw = COURT.width / 2 - 0.2;
  x = Math.max(-hw, Math.min(hw, x));
  z = Math.max(0.2, Math.min(courtLen(app) - 0.2, z));

  const frame = app.state.play.frames[app.state.currentFrame];
  frame.positions[id] = { x, z };
  const actor = app.actors.get(id);

  if (id === 'BALL') {
    actor.mesh.position.set(x, BALL_LOOSE_Y, z);
  } else {
    actor.mesh.position.set(x, 0, z);
    // se este jogador é o dono da bola, a bola o acompanha automaticamente
    if (frame.ballOwner === id) {
      frame.positions.BALL = { x: x + BALL_OFFSET, z };
      app.actors.get('BALL').mesh.position.set(x + BALL_OFFSET, BALL_HOLD_Y, z);
    }
  }
  rebuildPaths(app);
}

// Ao soltar a bola: gruda no jogador mais próximo (passe/posse) ou fica solta
export function assignBallByPosition(app, x, z) {
  const frame = app.state.play.frames[app.state.currentFrame];
  let best = null;
  let bestD = SNAP_RADIUS;
  const ids = [...activeOffense(app), ...(app.state.showDefense ? activeDefense(app) : [])];
  for (const pid of ids) {
    const p = frame.positions[pid];
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) { bestD = d; best = pid; }
  }
  frame.ballOwner = best;
  if (best) frame.positions.BALL = { x: frame.positions[best].x + BALL_OFFSET, z: frame.positions[best].z };
  else frame.positions.BALL = { x, z };
  const a = ballAnchor(frame);
  app.actors.get('BALL').mesh.position.set(a.x, a.held ? BALL_HOLD_Y : BALL_LOOSE_Y, a.z);
  rebuildPaths(app);
  app.onFrameChange?.();
}

export function currentBallOwner(app) {
  return app.state.play.frames[app.state.currentFrame].ballOwner || null;
}

// ---------- Seleção ----------
export function setSelection(app, id) {
  app.state.selected = id;
  for (const a of app.actors.values()) {
    a.selectionRing.visible = a.id === id;
    if (a.glow) a.glow.visible = a.id === id;
  }
}

// ---------- Trajetos (visualização tática) ----------
function disposeGroup(group) {
  for (let i = group.children.length - 1; i >= 0; i--) {
    const c = group.children[i];
    c.geometry?.dispose();
    if (c.material) {
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
      else c.material.dispose();
    }
    group.remove(c);
  }
}

// Pontos de uma linha em zigue-zague (drible) entre a e b
function zigzagPoints(a, b, amp = 0.22, wlen = 0.7) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len, pz = dx / len; // perpendicular unitário
  const n = Math.max(2, Math.round(len / wlen));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = (i > 0 && i < n) ? (i % 2 === 0 ? amp : -amp) : 0;
    pts.push({ x: a.x + dx * t + px * off, z: a.z + dz * t + pz * off });
  }
  return pts;
}

function arrowHead(from, to, color, opacity) {
  const dir = new THREE.Vector3(to.x - from.x, 0, to.z - from.z);
  if (dir.length() < 0.3) return null;
  dir.normalize();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.4, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
  );
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  cone.position.set(to.x, 0.08, to.z);
  return cone;
}

// Onion skin: mostra só o PRÓXIMO movimento (quadro atual -> próximo), baixa opacidade
export function rebuildPaths(app) {
  const group = app.pathsGroup;
  disposeGroup(group);
  if (!app.state.showPaths) return;

  const frames = app.state.play.frames;
  const cur = app.state.currentFrame;
  if (cur + 1 >= frames.length) return; // último quadro: não há próximo movimento

  const fa = frames[cur];
  const fb = frames[cur + 1];
  const OP_LINE = 0.32;
  const OP_HEAD = 0.45;

  // style: 'solid' (corte), 'dashed' (passe), 'zigzag' (drible)
  const drawSeg = (a, b, colorHex, style) => {
    if (Math.hypot(b.x - a.x, b.z - a.z) < 0.1) return;
    const pts = style === 'zigzag' ? zigzagPoints(a, b) : [a, b];
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0.06, p.z)));
    const mat = style === 'dashed'
      ? new THREE.LineDashedMaterial({ color: colorHex, dashSize: 0.3, gapSize: 0.22, transparent: true, opacity: OP_LINE })
      : new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: OP_LINE });
    const line = new THREE.Line(geo, mat);
    if (style === 'dashed') line.computeLineDistances();
    group.add(line);
    const head = arrowHead(a, b, colorHex, OP_HEAD);
    if (head) group.add(head);
  };

  // ataque: com a bola = drible (zigue-zague); sem a bola = corte (seta)
  for (const id of activeOffense(app)) {
    const style = id === fa.ballOwner ? 'zigzag' : 'solid';
    drawSeg(fa.positions[id], fb.positions[id], 0x6fa8ff, style);
  }
  if (app.state.showDefense) {
    for (const id of activeDefense(app)) drawSeg(fa.positions[id], fb.positions[id], 0xff7a7a, 'solid');
  }

  // Bola: só quando há passe (troca de dono) ou bola solta em movimento
  const isPass = fa.ballOwner !== fb.ballOwner;
  const bothLoose = !fa.ballOwner && !fb.ballOwner;
  if (isPass || bothLoose) drawSeg(ballAnchor(fa), ballAnchor(fb), 0xffb066, 'dashed');
}

export function setPathsVisible(app, visible) {
  app.pathsGroup.visible = visible;
}
