import * as THREE from 'three';

// ----- Dimensões (padrão FIBA, em metros) -----
export const COURT = {
  width: 15,        // largura (eixo X): -7.5 .. 7.5
  halfLength: 14,   // comprimento da meia quadra (eixo Z)
  fullLength: 28,   // comprimento da quadra inteira
  basketZ: 1.575,   // centro do aro a partir da linha de fundo
  basketH: 3.05,    // altura do aro
  rimRadius: 0.225,
  backboardZ: 1.2,
  laneWidth: 4.9,
  ftLineZ: 5.8,
  ftCircleR: 1.8,
  threeR: 6.75,
  restrictedR: 1.25,
};

const LINE_Y = 0.02;

const lineMat = () => new THREE.LineBasicMaterial({ color: 0xf2f4f7, transparent: true, opacity: 0.85 });

function makeLine(points, mat) {
  const pts = points.map((p) => new THREE.Vector3(p.x, LINE_Y, p.z));
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
}

function arc(cx, cz, r, a0, a1, segments = 48) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = a0 + ((a1 - a0) * i) / segments;
    pts.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r });
  }
  return pts;
}

// Textura de madeira procedural (tábuas + grão) p/ o piso
function woodTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9b079';
  ctx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 56) {
    const v = 18 + Math.random() * 22;
    ctx.fillStyle = `rgba(150,108,58,${(v / 100).toFixed(2)})`;
    ctx.fillRect(x, 0, 56, 512);
    ctx.strokeStyle = 'rgba(80,50,20,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(120,80,40,${(0.04 + Math.random() * 0.05).toFixed(3)})`;
      const y = Math.random() * 512;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 18, y + 2, x + 38, y - 2, x + 56, y); ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Emblema central (personalidade), desenhado num disco no chão
function makeCenterLogo() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const cx = s / 2, cy = s / 2, r = s / 2 - 8;
  // disco
  ctx.fillStyle = 'rgba(10,22,48,0.55)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // aro externo laranja
  ctx.strokeStyle = '#ff7a18'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, Math.PI * 2); ctx.stroke();
  // linhas de bola de basquete
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(cx, cy - r + 10); ctx.lineTo(cx, cy + r - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r + 10, cy); ctx.lineTo(cx + r - 10, cy); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx - r, cy, r * 0.85, -0.6, 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + r, cy, r * 0.85, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
  // estrela central
  ctx.fillStyle = '#ff9a3a';
  ctx.font = 'bold 70px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cy + 4);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 48),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// Constrói metade de quadra em coords locais: linha de fundo em z=0, quadra estende +z
function buildEndGroup(mat) {
  const g = new THREE.Group();
  const { width, basketZ, basketH, rimRadius, backboardZ, laneWidth, ftLineZ, ftCircleR, threeR, restrictedR } = COURT;
  const hw = width / 2;

  // garrafão (azul)
  const laneFill = new THREE.Mesh(
    new THREE.PlaneGeometry(laneWidth, ftLineZ),
    new THREE.MeshStandardMaterial({ color: 0x1f55b0, roughness: 0.85 })
  );
  laneFill.rotation.x = -Math.PI / 2;
  laneFill.position.set(0, 0.012, ftLineZ / 2);
  g.add(laneFill);

  g.add(makeLine([
    { x: -laneWidth / 2, z: 0 }, { x: -laneWidth / 2, z: ftLineZ },
    { x: laneWidth / 2, z: ftLineZ }, { x: laneWidth / 2, z: 0 },
  ], mat));
  g.add(makeLine(arc(0, ftLineZ, ftCircleR, 0, Math.PI * 2), mat));
  g.add(makeLine(arc(0, basketZ, restrictedR, 0, Math.PI), mat));

  // linha de 3
  const cornerX = hw - 0.9;
  const aCorner = Math.acos(Math.min(1, cornerX / threeR));
  const straightZ = basketZ + threeR * Math.sin(aCorner);
  g.add(makeLine([{ x: -cornerX, z: 0 }, { x: -cornerX, z: straightZ }], mat));
  g.add(makeLine([{ x: cornerX, z: 0 }, { x: cornerX, z: straightZ }], mat));
  g.add(makeLine(arc(0, basketZ, threeR, aCorner, Math.PI - aCorner), mat));

  // ----- Aro + tabela + suporte (com ênfase/glow) -----
  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.05, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.3 })
  );
  backboard.position.set(0, basketH + 0.3, backboardZ);
  g.add(backboard);

  // quadrado-alvo na tabela
  const tw = 0.59, th = 0.45;
  const target = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-tw / 2, basketH - 0.05, backboardZ - 0.03),
      new THREE.Vector3(tw / 2, basketH - 0.05, backboardZ - 0.03),
      new THREE.Vector3(tw / 2, basketH - 0.05 + th, backboardZ - 0.03),
      new THREE.Vector3(-tw / 2, basketH - 0.05 + th, backboardZ - 0.03),
    ]),
    new THREE.LineBasicMaterial({ color: 0xff7a18 })
  );
  g.add(target);

  // aro: laranja emissivo
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(rimRadius, 0.025, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0xff5a00, emissive: 0xff4d00, emissiveIntensity: 0.85, metalness: 0.3, roughness: 0.4 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, basketH, basketZ);
  rim.name = 'rim';
  g.add(rim);

  // glow do aro (anel aditivo) — pulsa ao converter uma cesta
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(rimRadius + 0.06, 0.08, 12, 32),
    new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.set(0, basketH, basketZ);
  glow.name = 'rimGlow';
  g.add(glow);

  // rede (cone aberto) — balança quando a bola entra
  const net = new THREE.Mesh(
    new THREE.CylinderGeometry(rimRadius * 0.9, rimRadius * 0.55, 0.35, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, wireframe: true })
  );
  net.position.set(0, basketH - 0.2, basketZ);
  net.name = 'net';
  g.add(net);

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, basketH + 0.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x444b56, metalness: 0.4, roughness: 0.6 })
  );
  post.position.set(0, (basketH + 0.5) / 2, -0.4);
  g.add(post);

  return g;
}

export function buildCourt(mode = 'half') {
  const group = new THREE.Group();
  const { width, halfLength, fullLength } = COURT;
  const length = mode === 'full' ? fullLength : halfLength;
  const hw = width / 2;
  const mat = lineMat();

  // ----- Piso (madeira) -----
  const wood = woodTexture();
  wood.repeat.set(3, Math.max(2, Math.round(length / 4)));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length),
    new THREE.MeshStandardMaterial({ map: wood, color: 0xffffff, roughness: 0.85, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, length / 2);
  floor.receiveShadow = true;
  floor.name = 'floor';
  group.add(floor);

  // ----- Contorno -----
  group.add(makeLine([
    { x: -hw, z: 0 }, { x: hw, z: 0 }, { x: hw, z: length }, { x: -hw, z: length }, { x: -hw, z: 0 },
  ], mat));

  // ----- Aro(s) / metade(s) -----
  const end1 = buildEndGroup(mat);
  group.add(end1);

  if (mode === 'full') {
    const end2 = buildEndGroup(mat);
    end2.rotation.y = Math.PI;       // espelha
    end2.position.z = fullLength;    // posiciona no fundo oposto
    group.add(end2);

    // linha e círculo central
    group.add(makeLine([{ x: -hw, z: length / 2 }, { x: hw, z: length / 2 }], mat));
    group.add(makeLine(arc(0, length / 2, 1.8, 0, Math.PI * 2), mat));
  } else {
    // meia quadra: meio-círculo na linha do meio
    group.add(makeLine(arc(0, length, 1.8, Math.PI, Math.PI * 2), mat));
  }

  // emblema central
  const logo = makeCenterLogo();
  logo.position.set(0, 0.016, length / 2);
  group.add(logo);

  return { group, floor, length };
}
