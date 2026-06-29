import * as THREE from 'three';
import { updateActorPosition, setSelection, assignBallByPosition } from './play.js';

// Arrastar jogadores/bola na quadra (mouse e toque)
export function initInteraction(app) {
  const canvas = app.renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  let dragging = null; // id do ator sendo arrastado
  let lastX = 0, lastZ = 0;

  function setPointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function actorRoots() {
    const list = [];
    for (const a of app.actors.values()) {
      if (a.id.startsWith('X') && !app.state.showDefense) continue;
      list.push(a.mesh);
    }
    return list;
  }

  function pickActor() {
    raycaster.setFromCamera(pointer, app.camera);
    const hits = raycaster.intersectObjects(actorRoots(), true);
    for (const h of hits) {
      let o = h.object;
      while (o && o.userData.actorId === undefined) o = o.parent;
      if (o) return o.userData.actorId;
    }
    return null;
  }

  function onDown(e) {
    if (app.state.playing) return;
    setPointer(e);
    const id = pickActor();
    if (id) {
      dragging = id;
      app.controls.enabled = false; // bloqueia orbit durante o arraste
      setSelection(app, id);
      canvas.setPointerCapture?.(e.pointerId);
    } else {
      setSelection(app, null);
    }
  }

  function onMove(e) {
    if (!dragging) return;
    setPointer(e);
    raycaster.setFromCamera(pointer, app.camera);
    if (raycaster.ray.intersectPlane(dragPlane, hit)) {
      lastX = hit.x;
      lastZ = hit.z;
      updateActorPosition(app, dragging, hit.x, hit.z);
    }
  }

  function onUp(e) {
    if (!dragging) return;
    // soltar a bola: define posse (gruda no jogador mais próximo) ou bola solta
    if (dragging === 'BALL') assignBallByPosition(app, lastX, lastZ);
    dragging = null;
    app.controls.enabled = true;
    canvas.releasePointerCapture?.(e.pointerId);
    app.commit?.(); // marca ponto no histórico (dedupe ignora cliques sem mover)
  }

  // capture:true => roda antes do OrbitControls, permitindo desligá-lo a tempo
  canvas.addEventListener('pointerdown', onDown, { capture: true });
  canvas.addEventListener('pointermove', onMove, { capture: true });
  window.addEventListener('pointerup', onUp, { capture: true });
  window.addEventListener('pointercancel', onUp, { capture: true });
}
