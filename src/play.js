import * as THREE from 'three';
import { COURT } from './court.js';

export const PLAYER_IDS = ['O1', 'O2', 'O3', 'O4', 'O5', 'X1', 'X2', 'X3', 'X4', 'X5'];
export const ALL_IDS = [...PLAYER_IDS, 'BALL'];

const BASE_SEG_DUR = 1.1; // segundos por trecho (antes do multiplicador de velocidade)
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

export function defaultPositions() {
  return {
    O1: { x: 0, z: 8.5 },
    O2: { x: -5.5, z: 6.5 },
    O3: { x: 5.5, z: 6.5 },
    O4: { x: -3.2, z: 2.6 },
    O5: { x: 3.2, z: 3.2 },
    X1: { x: 0, z: 6.8 },
    X2: { x: -4.2, z: 5.2 },
    X3: { x: 4.2, z: 5.2 },
    X4: { x: -2.6, z: 1.9 },
    X5: { x: 2.4, z: 2.2 },
    BALL: { x: 0.45, z: 8.1 },
  };
}

export function createPlay(name = 'Nova jogada') {
  return {
    id: crypto.randomUUID(),
    name,
    set: '',
    createdAt: Date.now(),
    frames: [{ label: 'Início', positions: defaultPositions() }],
  };
}

const clonePositions = (p) => {
  const out = {};
  for (const id of ALL_IDS) out[id] = { x: p[id].x, z: p[id].z };
  return out;
};

// ---------- Aplicar um quadro instantaneamente aos meshes ----------
export function applyFrameInstant(app, index) {
  const frame = app.state.play.frames[index];
  if (!frame) return;
  for (const id of ALL_IDS) {
    const actor = app.actors.get(id);
    const p = frame.positions[id];
    const y = id === 'BALL' ? 0.16 : 0;
    actor.mesh.position.set(p.x, y, p.z);
  }
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
    app.onPlayhead?.(maxPh / maxPh);
    stopPlayback(app, false);
    app.state.currentFrame = maxPh;
    app.onFrameChange?.();
    return;
  }

  const seg = Math.floor(app.state.playhead);
  const t = app.state.playhead - seg;
  const e = easeInOut(t);
  const A = frames[seg].positions;
  const B = frames[seg + 1].positions;

  for (const id of ALL_IDS) {
    const actor = app.actors.get(id);
    const a = A[id];
    const b = B[id];
    const x = lerp(a.x, b.x, e);
    const z = lerp(a.z, b.z, e);
    if (id === 'BALL') {
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      const arc = Math.min(dist * 0.18, 2.2);
      const y = 0.16 + arc * 4 * t * (1 - t);
      actor.mesh.position.set(x, y, z);
    } else {
      actor.mesh.position.set(x, 0, z);
    }
  }
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
  const copy = { label: `Q${frames.length + 1}`, positions: clonePositions(frames[cur].positions) };
  frames.splice(cur + 1, 0, copy);
  setFrame(app, cur + 1);
}

export function deleteFrame(app, index) {
  const frames = app.state.play.frames;
  if (frames.length <= 1) return;
  frames.splice(index, 1);
  setFrame(app, Math.min(index, frames.length - 1));
}

export function updateActorPosition(app, id, x, z) {
  // clamp dentro da quadra
  const hw = COURT.width / 2 - 0.2;
  x = Math.max(-hw, Math.min(hw, x));
  z = Math.max(0.2, Math.min(COURT.halfLength - 0.2, z));
  app.state.play.frames[app.state.currentFrame].positions[id] = { x, z };
  const actor = app.actors.get(id);
  actor.mesh.position.x = x;
  actor.mesh.position.z = z;
  rebuildPaths(app);
}

// ---------- Seleção ----------
export function setSelection(app, id) {
  app.state.selected = id;
  for (const a of app.actors.values()) a.selectionRing.visible = a.id === id;
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

function arrowHead(from, to, color) {
  const dir = new THREE.Vector3(to.x - from.x, 0, to.z - from.z);
  const len = dir.length();
  if (len < 0.3) return null;
  dir.normalize();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.42, 12),
    new THREE.MeshBasicMaterial({ color })
  );
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  cone.quaternion.copy(q);
  cone.position.set(to.x, 0.08, to.z);
  return cone;
}

export function rebuildPaths(app) {
  const group = app.pathsGroup;
  disposeGroup(group);
  if (!app.state.showPaths) return;

  const frames = app.state.play.frames;
  if (frames.length < 2) return;

  const drawFor = (id, colorHex, dashed) => {
    if (id.startsWith('X') && !app.state.showDefense) return;
    const pts = frames.map((f) => f.positions[id]);
    // pula se não houver movimento
    const moves = pts.some((p, i) => i > 0 && (Math.abs(p.x - pts[i - 1].x) > 0.05 || Math.abs(p.z - pts[i - 1].z) > 0.05));
    if (!moves) return;

    const vecs = pts.map((p) => new THREE.Vector3(p.x, 0.06, p.z));
    const geo = new THREE.BufferGeometry().setFromPoints(vecs);
    let line;
    if (dashed) {
      const mat = new THREE.LineDashedMaterial({ color: colorHex, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.9 });
      line = new THREE.Line(geo, mat);
      line.computeLineDistances();
    } else {
      const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
      line = new THREE.Line(geo, mat);
    }
    group.add(line);

    for (let i = 1; i < pts.length; i++) {
      const head = arrowHead(pts[i - 1], pts[i], colorHex);
      if (head) group.add(head);
    }
  };

  for (const id of ['O1', 'O2', 'O3', 'O4', 'O5']) drawFor(id, 0x6fa8ff, false);
  for (const id of ['X1', 'X2', 'X3', 'X4', 'X5']) drawFor(id, 0xff7a7a, false);
  drawFor('BALL', 0xffb066, true);
}

export function setPathsVisible(app, visible) {
  app.pathsGroup.visible = visible;
}
