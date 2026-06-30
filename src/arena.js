import * as THREE from 'three';

// Cenário de arena (estilo ginásio de anime): piso azul ao redor e a
// estrutura das arquibancadas (degraus vazios) ao fundo. Tudo afastado e
// baixo o bastante para não atrapalhar a visão da meia quadra.

// Constrói uma arquibancada (só a estrutura de degraus em escada) no espaço
// local: tangente = X (comprimento), profundidade/altura sobem em +Z/+Y.
function buildStand(length) {
  const group = new THREE.Group();
  const rows = 4;
  const rowRise = 0.6;
  const rowDepth = 1.25;

  // Degraus (escada que sobe afastando-se da quadra)
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x232833, roughness: 0.9 });
  for (let r = 0; r < rows; r++) {
    const h = (r + 1) * rowRise;
    const step = new THREE.Mesh(new THREE.BoxGeometry(length, h, rowDepth), stepMat);
    step.position.set(0, h / 2, r * rowDepth + rowDepth / 2);
    group.add(step);
  }

  return group;
}

export function buildArena(mode = 'half') {
  const arena = new THREE.Group();
  const courtLen = mode === 'full' ? 28 : 14;
  const courtCenterZ = courtLen / 2;

  // ----- Piso azul ao redor da quadra (apron) -----
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(40, courtLen + 30),
    new THREE.MeshStandardMaterial({ color: 0x163769, roughness: 0.85 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, -0.02, courtCenterZ);
  arena.add(apron);

  // Sem paredes/teto: o fog faz o fundo (a arquibancada some na distância).

  // ----- Arquibancadas nos 4 lados -----
  const innerX = 10, innerZF = courtLen + 2, innerZB = -2.5;
  const sideLen = courtLen + 16, endLen = 32;

  const front = buildStand(endLen);
  front.position.set(0, 0, innerZF);
  arena.add(front);

  const back = buildStand(endLen);
  back.position.set(0, 0, innerZB);
  back.rotation.y = Math.PI;
  arena.add(back);

  const left = buildStand(sideLen);
  left.position.set(-innerX, 0, courtCenterZ);
  left.rotation.y = -Math.PI / 2;
  arena.add(left);

  const right = buildStand(sideLen);
  right.position.set(innerX, 0, courtCenterZ);
  right.rotation.y = Math.PI / 2;
  arena.add(right);

  return arena;
}
