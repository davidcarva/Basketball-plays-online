import * as THREE from 'three';

// Paleta dos times (estilo Kuroko no Basket)
const COLORS = {
  offense: 0x0e3a86,      // azul-marinho
  offenseDark: 0x081f4d,  // sombra/ombros
  defense: 0xc42a37,      // vermelho
  defenseDark: 0x7d141d,
};
const CSS = { offense: '#0e3a86', defense: '#c42a37' };

// Desenha o disco com o número (reutilizado ao recolorir o time)
function drawLabel(canvas, text, cssColor) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = cssColor;
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
}

// Sprite com o número do jogador
function makeLabel(text, cssColor) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  drawLabel(canvas, text, cssColor);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(0.7, 0.7, 0.7);
  sprite.position.y = 2.35;
  sprite.renderOrder = 10;
  sprite.userData.canvas = canvas;
  sprite.userData.text = text;
  return sprite;
}

// Sombra de contato (disco escuro)
function makeShadow() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.95),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.015;
  return mesh;
}

// Casca de glow neon (faces traseiras ampliadas, blending aditivo) — silhueta luminosa
function makeGlowShell(geometry, scale, y) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0x5af0ff,
      transparent: true,
      opacity: 0.55,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  mesh.scale.setScalar(scale);
  mesh.position.y = y;
  if (geometry === GLOW_BODY_GEO) mesh.rotation.x = Math.PI;
  return mesh;
}

// geometrias compartilhadas p/ o glow (criadas uma vez) — escala realista
// jogador ~2,0 m de altura, corpo ~0,6 m, cabeça ~0,5 m
const GLOW_BODY_GEO = new THREE.ConeGeometry(0.3, 1.5, 30);
const GLOW_HEAD_GEO = new THREE.SphereGeometry(0.25, 26, 18);

// Jogador: cabeça esférica + cone invertido (ponta pra baixo) + "ombros" elípticos
function makePlayer(color, darkColor) {
  const group = new THREE.Group();

  // corpo: cone com a ponta voltada para baixo (ponta ~0,02 m, topo ~1,52 m)
  const body = new THREE.Mesh(
    GLOW_BODY_GEO.clone(),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, emissive: color, emissiveIntensity: 0.14 })
  );
  body.rotation.x = Math.PI; // inverte: base larga em cima, ponta embaixo
  body.position.y = 0.77;
  body.castShadow = true;
  group.add(body);

  // "ombros": disco escuro no topo do cone (a elipse da referência)
  const collar = new THREE.Mesh(
    new THREE.CircleGeometry(0.31, 30),
    new THREE.MeshStandardMaterial({ color: darkColor, roughness: 0.6, side: THREE.DoubleSide })
  );
  collar.rotation.x = -Math.PI / 2;
  collar.position.y = 1.52;
  group.add(collar);

  // cabeça (topo ~2,02 m)
  const head = new THREE.Mesh(
    GLOW_HEAD_GEO.clone(),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: 0.14 })
  );
  head.position.y = 1.77;
  head.castShadow = true;
  group.add(head);

  // glow neon (escondido por padrão; ligado na seleção)
  const glow = new THREE.Group();
  glow.add(makeGlowShell(GLOW_BODY_GEO, 1.18, 0.77));
  glow.add(makeGlowShell(GLOW_HEAD_GEO, 1.22, 1.77));
  glow.visible = false;
  group.add(glow);
  group.userData.glow = glow;
  group.userData.parts = { body, head, collar };

  return group;
}

function makeBall() {
  const group = new THREE.Group();
  // bola tamanho 7 (~0,24 m de diâmetro)
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0xff7a18, roughness: 0.55 })
  );
  ball.castShadow = true;
  group.add(ball);

  // gomos (linhas pretas) p/ leitura de bola de basquete
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x1a1205 });
  const seamGeo = new THREE.TorusGeometry(0.121, 0.006, 6, 36);
  const s1 = new THREE.Mesh(seamGeo, seamMat);
  const s2 = new THREE.Mesh(seamGeo, seamMat); s2.rotation.y = Math.PI / 2;
  const s3 = new THREE.Mesh(seamGeo, seamMat); s3.rotation.x = Math.PI / 2;
  ball.add(s1, s2, s3);

  group.userData.ball = ball;
  return group;
}

// Cria todos os atores e devolve um Map id -> ator
export function createActors(scene) {
  const actors = new Map();

  const add = (id, team, label) => {
    const root = new THREE.Group();
    const isOff = team === 'offense';
    const color = isOff ? COLORS.offense : COLORS.defense;
    const dark = isOff ? COLORS.offenseDark : COLORS.defenseDark;

    const visual = team === 'ball' ? makeBall() : makePlayer(color, dark);
    root.add(visual);

    let labelSprite = null;
    if (team !== 'ball') {
      const shadow = makeShadow();
      root.add(shadow);
      labelSprite = makeLabel(label, isOff ? CSS.offense : CSS.defense);
      root.add(labelSprite);
      root.userData.label = labelSprite;
    }

    // Anel de seleção (escondido por padrão)
    const sel = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.58, 36),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    sel.rotation.x = -Math.PI / 2;
    sel.position.y = 0.02;
    sel.visible = false;
    root.add(sel);

    scene.add(root);

    const actor = {
      id, team, label, color, mesh: root, selectionRing: sel, visual,
      glow: visual.userData.glow || null,
      parts: visual.userData.parts || null,
      labelSprite,
    };
    root.userData.actorId = id;
    actors.set(id, actor);
  };

  for (let i = 1; i <= 5; i++) add(`O${i}`, 'offense', String(i));
  for (let i = 1; i <= 5; i++) add(`X${i}`, 'defense', String(i));
  add('BALL', 'ball', '');

  return actors;
}

// Recolore os times (identidade): corpo/cabeça/ombros + número
export function recolorTeams(actors, offHex, defHex) {
  const dark = (hex) => new THREE.Color(hex).multiplyScalar(0.5);
  for (const a of actors.values()) {
    if (a.team === 'ball' || !a.parts) continue;
    const hex = a.team === 'offense' ? offHex : defHex;
    const c = new THREE.Color(hex);
    a.parts.body.material.color.copy(c); a.parts.body.material.emissive.copy(c);
    a.parts.head.material.color.copy(c); a.parts.head.material.emissive.copy(c);
    a.parts.collar.material.color.copy(dark(hex));
    if (a.labelSprite) {
      drawLabel(a.labelSprite.userData.canvas, a.labelSprite.userData.text, hex);
      a.labelSprite.material.map.needsUpdate = true;
    }
  }
}

export { COLORS };
