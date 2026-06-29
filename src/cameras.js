import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Presets de câmera por modo de quadra
function presetsFor(mode) {
  if (mode === 'full') {
    return {
      top:  { pos: V(0, 34, 14.5), target: V(0, 0, 14) },
      diag: { pos: V(12, 17, 39),  target: V(0, 1, 13) },
      hoop: { pos: V(0, 7, -7),    target: V(0, 1.2, 10) },
      side: { pos: V(27, 14, 14),  target: V(0, 1, 14) },
    };
  }
  return {
    top:  { pos: V(0, 24, 6.5), target: V(0, 0, 6.5) },
    diag: { pos: V(9, 11, 21),  target: V(0, 1, 6) },
    hoop: { pos: V(0, 6.5, -7), target: V(0, 1.2, 7) },
    side: { pos: V(18, 9, 6),   target: V(0, 1, 6) },
  };
}

export function createCameraRig() {
  return {
    active: false,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTgt: new THREE.Vector3(),
    toTgt: new THREE.Vector3(),
    t: 0,
    dur: 0.7,
  };
}

export function goToPreset(tween, camera, controls, name, mode = 'half') {
  const p = presetsFor(mode)[name];
  if (!p) return; // 'free' => não faz nada
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
