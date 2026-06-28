import * as THREE from 'three';

// Sprite com o número/rótulo do jogador
function makeLabel(text, bgColor) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 70px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(0.9, 0.9, 0.9);
  sprite.position.y = 2.35;
  sprite.renderOrder = 10;
  return sprite;
}

// Sombra de contato (disco escuro)
function makeShadow() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.015;
  return mesh;
}

// Cria um jogador (corpo cônico + cabeça)
function makePlayer(color) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 24), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe0bd, roughness: 0.5 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), headMat);
  head.position.y = 1.75;
  head.castShadow = true;
  group.add(head);

  // anel da cor no chão pra reforçar o time
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.04, 8, 28),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  group.userData.body = body;
  return group;
}

function makeBall() {
  const group = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xff7a18, roughness: 0.55 })
  );
  ball.castShadow = true;
  ball.position.y = 0.16;
  group.add(ball);
  group.userData.ball = ball;
  return group;
}

const COLORS = { offense: 0x2f7bff, defense: 0xff4d4d };

// Cria todos os atores e devolve um Map id -> ator
export function createActors(scene) {
  const actors = new Map();

  const add = (id, team, label, color) => {
    const root = new THREE.Group();
    const visual = team === 'ball' ? makeBall() : makePlayer(color);
    root.add(visual);

    const shadow = makeShadow();
    root.add(shadow);

    if (team !== 'ball') {
      const lbl = makeLabel(label, color === COLORS.offense ? '#1d5fd6' : '#cc2b2b');
      root.add(lbl);
      root.userData.label = lbl;
    }

    // Disco de seleção (escondido por padrão)
    const sel = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.66, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    sel.rotation.x = -Math.PI / 2;
    sel.position.y = 0.02;
    sel.visible = false;
    root.add(sel);

    scene.add(root);

    const actor = { id, team, label, color, mesh: root, selectionRing: sel, visual };
    root.userData.actorId = id;
    actors.set(id, actor);
  };

  for (let i = 1; i <= 5; i++) add(`O${i}`, 'offense', String(i), COLORS.offense);
  for (let i = 1; i <= 5; i++) add(`X${i}`, 'defense', String(i), COLORS.defense);
  add('BALL', 'ball', '', COLORS.offense);

  return actors;
}

export { COLORS };
