import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

import { buildCourt } from './court.js';
import { createActors } from './entities.js';
import { createCameraRig, updateCameraTween, goToPreset } from './cameras.js';
import { createPlay, applyFrameInstant, rebuildPaths, updatePlayback } from './play.js';
import { initInteraction } from './interaction.js';
import { initUI } from './ui.js';

// ---------- Renderer ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// ---------- Cena ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1115);
scene.fog = new THREE.Fog(0x0f1115, 35, 70);

// ---------- Câmera ----------
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(9, 11, 21);

// ---------- Controles ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 1, 6);
controls.minDistance = 4;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI / 2 - 0.03; // não passar por baixo do chão
controls.update();

// ---------- Luzes ----------
scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x4a3b2a, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(8, 20, 6);
scene.add(dir);

// ---------- Quadra + atores ----------
const { group: courtGroup } = buildCourt();
scene.add(courtGroup);

const actors = createActors(scene);

const pathsGroup = new THREE.Group();
scene.add(pathsGroup);

// ---------- Estado global do app ----------
const app = {
  scene, camera, renderer, controls, actors, pathsGroup,
  cameraTween: createCameraRig(),
  state: {
    play: createPlay('Minha jogada'),
    currentFrame: 0,
    playing: false,
    playhead: 0,
    speed: 1,
    showPaths: true,
    showDefense: true,
    selected: null,
  },
};

// posiciona tudo no quadro inicial
applyFrameInstant(app, 0);
rebuildPaths(app);

// ---------- Inicializa interação e UI ----------
initInteraction(app);
initUI(app);

// ---------- Resize ----------
let lastW = 0;
let lastH = 0;
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w === 0 || h === 0 || (w === lastW && h === lastH)) return;
  lastW = w;
  lastH = h;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);

// ---------- Loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  resize(); // reaplica o tamanho se a viewport mudou (robusto p/ viewport inicial 0)
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayback(app, dt);
  updateCameraTween(app.cameraTween, camera, controls, dt);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// câmera inicial num bom ângulo
goToPreset(app.cameraTween, camera, controls, 'diag');
