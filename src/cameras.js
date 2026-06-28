import * as THREE from 'three';

// Presets de câmera: posição + alvo (foco) na meia quadra
// A ação acontece em torno de z ~ 6, x = 0
const TARGET = new THREE.Vector3(0, 1, 6);

export const PRESETS = {
  top:  { pos: new THREE.Vector3(0, 24, 6.5), target: new THREE.Vector3(0, 0, 6.5) },
  diag: { pos: new THREE.Vector3(9, 11, 21),  target: TARGET.clone() },
  hoop: { pos: new THREE.Vector3(0, 6.5, -7), target: new THREE.Vector3(0, 1.2, 7) },
  side: { pos: new THREE.Vector3(18, 9, 6),   target: TARGET.clone() },
};

export function createCameraRig() {
  const tween = {
    active: false,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTgt: new THREE.Vector3(),
    toTgt: new THREE.Vector3(),
    t: 0,
    dur: 0.7,
  };
  return tween;
}

export function goToPreset(tween, camera, controls, name) {
  const p = PRESETS[name];
  if (!p) return; // 'free' => não faz nada, só libera o orbit
  tween.fromPos.copy(camera.position);
  tween.toPos.copy(p.pos);
  tween.fromTgt.copy(controls.target);
  tween.toTgt.copy(p.target);
  tween.t = 0;
  tween.active = true;
}

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function updateCameraTween(tween, camera, controls, dt) {
  if (!tween.active) return;
  tween.t = Math.min(1, tween.t + dt / tween.dur);
  const e = easeInOut(tween.t);
  camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
  controls.target.lerpVectors(tween.fromTgt, tween.toTgt, e);
  if (tween.t >= 1) tween.active = false;
}
