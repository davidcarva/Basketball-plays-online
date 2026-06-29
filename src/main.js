import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

import { buildCourt } from './court.js';
import { buildArena } from './arena.js';
import { createActors } from './entities.js';
import { createCameraRig, updateCameraTween, goToPreset } from './cameras.js';
import { createPlay, applyFrameInstant, rebuildPaths, updatePlayback, updateVisibility, startPlayback } from './play.js';
import { initHistory, commit, undo, redo, resetHistory } from './history.js';
import { getDraft, readSharedPlay, clearShareHash } from './storage.js';
import { initInteraction } from './interaction.js';
import { initUI } from './ui.js';

// ---------- Renderer ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; // cores mais ricas/cinematográficas
renderer.toneMappingExposure = 1.15;

// Fundo em gradiente (azulado em cima, escuro embaixo) p/ dar profundidade
function makeGradientBg() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#10131c');
  g.addColorStop(0.5, '#0c0e13');
  g.addColorStop(1, '#05060a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- Cena ----------
const scene = new THREE.Scene();
scene.background = makeGradientBg();
scene.fog = new THREE.Fog(0x0a0c12, 24, 70); // densa: arena fica só como pano de fundo

// ---------- Câmera ----------
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(9, 11, 21);

// ---------- Controles ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 1, 6);
controls.minDistance = 4;
controls.maxDistance = 70;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.update();

// ---------- Luzes (esquema de 3 pontos p/ dar volume e carisma) ----------
scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x2a3550, 0.7));
const key = new THREE.DirectionalLight(0xfff2e0, 1.25); // luz principal, quente
key.position.set(9, 22, 8);
scene.add(key);
const rim = new THREE.DirectionalLight(0x7fb0ff, 0.7);  // contraluz fria (realça silhuetas)
rim.position.set(-8, 9, -10);
scene.add(rim);
const fill = new THREE.DirectionalLight(0x9fc0ff, 0.3);
fill.position.set(-10, 6, 12);
scene.add(fill);

// ---------- Atores ----------
const actors = createActors(scene);

const pathsGroup = new THREE.Group();
scene.add(pathsGroup);

// ---------- Estado global ----------
const app = {
  scene, camera, renderer, controls, actors, pathsGroup,
  cameraTween: createCameraRig(),
  courtGroup: null,
  arenaGroup: null,
  state: {
    play: createPlay('Minha jogada'),
    currentFrame: 0,
    playing: false,
    playhead: 0,
    speed: 1,
    showPaths: true,
    showDefense: true,
    selected: null,
    mode: 'half',
    courtLength: 14,
    teamSize: 5,
    cam: 'diag',
    view: '3d',
  },
};

function disposeObject(obj) {
  obj.traverse((c) => {
    c.geometry?.dispose();
    if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose());
  });
}

// Alterna meia quadra / quadra inteira (reconstrói quadra + arena)
app.setCourtMode = (mode) => {
  app.state.mode = mode;
  app.state.courtLength = mode === 'full' ? 28 : 14;

  if (app.courtGroup) { scene.remove(app.courtGroup); disposeObject(app.courtGroup); }
  if (app.arenaGroup) { scene.remove(app.arenaGroup); disposeObject(app.arenaGroup); }

  app.courtGroup = buildCourt(mode).group;
  app.arenaGroup = buildArena(mode);
  app.arenaGroup.visible = app.state.view !== '2d'; // arena some no modo 2D
  scene.add(app.arenaGroup, app.courtGroup);

  applyFrameInstant(app, app.state.currentFrame);
  updateVisibility(app);
  rebuildPaths(app);
  goToPreset(app.cameraTween, camera, controls, app.state.cam, mode);
};

// Alterna 3D ↔ 2D (prancheta tática): topo travado, sem arena/fog
const bgGradient = scene.background;
const sceneFog = scene.fog;
app.setView = (view) => {
  app.state.view = view;
  if (view === '2d') {
    app.arenaGroup.visible = false;
    scene.background = new THREE.Color(0x0e1726);
    scene.fog = null;
    controls.enableRotate = false;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = 0.0001;
    app.setCamera('top');
  } else {
    app.arenaGroup.visible = true;
    scene.background = bgGradient;
    scene.fog = sceneFog;
    controls.enableRotate = true;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    app.setCamera('diag');
  }
};

// Exporta a vista atual como imagem PNG
app.exportImage = () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = (app.state.play.name || 'jogada').replace(/[^\w\-]+/g, '_') + '.png';
  a.click();
};

// Grava a reprodução como vídeo WebM (MediaRecorder, sem dependências)
app.exportVideo = () => {
  const cv = renderer.domElement;
  if (!cv.captureStream || typeof MediaRecorder === 'undefined') return false;
  let mime = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
  const rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (app.state.play.name || 'jogada').replace(/[^\w\-]+/g, '_') + '.webm';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  rec.start();
  startPlayback(app);
  const iv = setInterval(() => { if (!app.state.playing) { clearInterval(iv); rec.stop(); } }, 100);
  return true;
};

app.setCamera = (name) => {
  app.state.cam = name;
  goToPreset(app.cameraTween, camera, controls, name, app.state.mode);
};

// Alterna 5v5 / 3v3 (oculta jogadores 4-5)
app.setTeamSize = (n) => {
  app.state.teamSize = n;
  updateVisibility(app);
  rebuildPaths(app);
};

// histórico (desfazer/refazer)
app.commit = () => commit(app);
app.undo = () => undo(app);
app.redo = () => redo(app);
app.resetHistory = () => resetHistory(app);

// jogada vinda de link compartilhado tem prioridade; senão, rascunho (autosave)
const shared = readSharedPlay();
const initial = shared || getDraft();
if (initial && Array.isArray(initial.frames)) {
  app.state.play = initial;
  app.state.mode = initial.mode === 'full' ? 'full' : 'half';
  app.state.teamSize = initial.teamSize === 3 ? 3 : 5;
  app.state.courtLength = app.state.mode === 'full' ? 28 : 14;
}
if (shared) clearShareHash();

// monta a quadra/arena iniciais e posiciona tudo
app.setCourtMode(app.state.mode);

// ---------- Interação e UI ----------
initInteraction(app);
initUI(app);
initHistory(app);

// ---------- Resize ----------
let lastW = 0, lastH = 0;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  if (w === 0 || h === 0 || (w === lastW && h === lastH)) return;
  lastW = w; lastH = h;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);

// ---------- Loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  resize();
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayback(app, dt);
  updateCameraTween(app.cameraTween, camera, controls, dt);

  // pulso do glow neon no jogador selecionado
  const sel = app.state.selected && app.actors.get(app.state.selected);
  if (sel && sel.glow && sel.glow.visible) {
    const o = 0.45 + 0.3 * Math.sin(performance.now() * 0.006);
    for (const m of sel.glow.children) m.material.opacity = o;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

window.__app = app; // depuração no console

// PWA: registra o service worker (instalável/offline) — só em produção/https
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
