import * as THREE from 'three';

// Cenário de arena (estilo ginásio de anime): piso azul ao redor, arquibancada
// com torcida em alguns degraus e paredes escuras ao fundo. Tudo afastado e
// baixo o bastante para não atrapalhar a visão da meia quadra.

const CROWD_PALETTE = [
  0x9aa3ad, 0x6b7280, 0x4b5563, 0xb9a48a, 0x8a5a44,
  0x2f3b52, 0x7a2e34, 0x35506b, 0xc9c2b6, 0x586072,
];

// Constrói uma arquibancada (degraus em escada + torcida) no espaço local:
// tangente = X (comprimento), profundidade/altura sobem em +Z/+Y.
function buildStand(length) {
  const group = new THREE.Group();
  const rows = 4;
  const rowRise = 0.6;
  const rowDepth = 1.25;
  const spacing = 0.95;
  const bodyH = 1.0;

  // Degraus (escada que sobe afastando-se da quadra)
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x232833, roughness: 0.9 });
  for (let r = 0; r < rows; r++) {
    const h = (r + 1) * rowRise;
    const step = new THREE.Mesh(new THREE.BoxGeometry(length, h, rowDepth), stepMat);
    step.position.set(0, h / 2, r * rowDepth + rowDepth / 2);
    group.add(step);
  }

  // Torcida (InstancedMesh: corpos + cabeças)
  const seatsPerRow = Math.floor(length / spacing);
  const total = rows * seatsPerRow;

  const bodyGeo = new THREE.BoxGeometry(0.45, bodyH, 0.45);
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, total);

  const headGeo = new THREE.SphereGeometry(0.17, 10, 8);
  const headMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const heads = new THREE.InstancedMesh(headGeo, headMat, total);

  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  const skin = new THREE.Color(0x9c6b4f);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const topY = (r + 1) * rowRise;            // topo do degrau
    const z = r * rowDepth + rowDepth * 0.32;  // assento na frente do degrau
    for (let s = 0; s < seatsPerRow; s++) {
      const x = -length / 2 + spacing / 2 + s * spacing + (Math.random() - 0.5) * 0.2;
      const yBody = topY + bodyH / 2;
      m.makeTranslation(x, yBody, z);
      bodies.setMatrixAt(i, m);
      bodies.setColorAt(i, color.setHex(CROWD_PALETTE[(Math.random() * CROWD_PALETTE.length) | 0]));

      m.makeTranslation(x, topY + bodyH + 0.15, z);
      heads.setMatrixAt(i, m);
      heads.setColorAt(i, skin);
      i++;
    }
  }
  bodies.instanceColor.needsUpdate = true;
  heads.instanceColor.needsUpdate = true;
  group.add(bodies, heads);

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
