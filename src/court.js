import * as THREE from 'three';

// ----- Dimensões (meia quadra, padrão FIBA, em metros) -----
export const COURT = {
  width: 15,        // largura (eixo X): -7.5 .. 7.5
  halfLength: 14,   // comprimento da meia quadra (eixo Z): 0 (linha de fundo) .. 14 (meio)
  basketZ: 1.575,   // centro do aro a partir da linha de fundo
  basketH: 3.05,    // altura do aro
  rimRadius: 0.225,
  backboardZ: 1.2,
  laneWidth: 4.9,   // largura do garrafão
  ftLineZ: 5.8,     // linha de lance livre (a partir do fundo)
  ftCircleR: 1.8,
  threeR: 6.75,     // raio da linha de 3
  threeCornerX: 6.6,// distância da linha de 3 reta até o centro (corner)
  restrictedR: 1.25,
};

const LINE_Y = 0.02;

function lineMat() {
  return new THREE.LineBasicMaterial({ color: 0xf2f4f7, transparent: true, opacity: 0.85 });
}

// Cria uma linha a partir de pontos {x,z} no plano da quadra
function makeLine(points, mat) {
  const pts = points.map((p) => new THREE.Vector3(p.x, LINE_Y, p.z));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, mat);
}

function arc(cx, cz, r, a0, a1, segments = 48) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = a0 + ((a1 - a0) * i) / segments;
    pts.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r });
  }
  return pts;
}

export function buildCourt() {
  const group = new THREE.Group();
  const { width, halfLength, basketZ, basketH, rimRadius, backboardZ,
          laneWidth, ftLineZ, ftCircleR, threeR, restrictedR } = COURT;
  const hw = width / 2;
  const mat = lineMat();

  // ----- Piso -----
  const floorGeo = new THREE.PlaneGeometry(width, halfLength);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xc8843e, roughness: 0.95, metalness: 0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, halfLength / 2);
  floor.receiveShadow = true;
  floor.name = 'floor';
  group.add(floor);

  // Faixa do garrafão (cor diferente)
  const laneFill = new THREE.Mesh(
    new THREE.PlaneGeometry(laneWidth, ftLineZ),
    new THREE.MeshStandardMaterial({ color: 0xa85e2a, roughness: 0.95 })
  );
  laneFill.rotation.x = -Math.PI / 2;
  laneFill.position.set(0, 0.012, ftLineZ / 2);
  group.add(laneFill);

  // ----- Linhas de contorno -----
  group.add(makeLine([
    { x: -hw, z: 0 }, { x: hw, z: 0 },
    { x: hw, z: halfLength }, { x: -hw, z: halfLength }, { x: -hw, z: 0 },
  ], mat));

  // Garrafão
  group.add(makeLine([
    { x: -laneWidth / 2, z: 0 }, { x: -laneWidth / 2, z: ftLineZ },
    { x: laneWidth / 2, z: ftLineZ }, { x: laneWidth / 2, z: 0 },
  ], mat));

  // Círculo do lance livre
  group.add(makeLine(arc(0, ftLineZ, ftCircleR, 0, Math.PI * 2), mat));

  // Área restritiva (semicírculo sob o aro)
  group.add(makeLine(arc(0, basketZ, restrictedR, 0, Math.PI), mat));

  // Linha de 3 pontos: retas dos cantos + arco
  const cornerX = hw - 0.9;
  // ângulo onde o arco encontra a reta do canto
  const dx = cornerX;
  const inside = Math.min(1, dx / threeR);
  const aCorner = Math.acos(inside); // a partir do eixo +X
  const straightZ = basketZ + threeR * Math.sin(aCorner);
  group.add(makeLine([{ x: -cornerX, z: 0 }, { x: -cornerX, z: straightZ }], mat));
  group.add(makeLine([{ x: cornerX, z: 0 }, { x: cornerX, z: straightZ }], mat));
  group.add(makeLine(arc(0, basketZ, threeR, aCorner, Math.PI - aCorner), mat));

  // Meio-círculo central (no fundo do campo, na linha de meio)
  group.add(makeLine(arc(0, halfLength, 1.8, Math.PI, Math.PI * 2), mat));

  // ----- Aro + tabela + suporte -----
  const hoop = new THREE.Group();

  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.05, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.4 })
  );
  backboard.position.set(0, basketH + 0.3, backboardZ);
  hoop.add(backboard);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(rimRadius, 0.02, 10, 28),
    new THREE.MeshStandardMaterial({ color: 0xff5a00, metalness: 0.3, roughness: 0.5 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, basketH, basketZ);
  hoop.add(rim);

  // Poste de suporte
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, basketH + 0.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x444b56, metalness: 0.4, roughness: 0.6 })
  );
  post.position.set(0, (basketH + 0.5) / 2, -0.4);
  hoop.add(post);

  group.add(hoop);

  return { group, floor };
}
