// Jogadas modelo (acervo) inspiradas em fundamentos FIBA/3x3.
// Cada etapa define só o ATAQUE; a DEFESA é gerada REAGINDO à cena (não fica
// parada/aleatória). `vs` = defesas contra as quais a jogada funciona.
import { reactiveDefense } from './defense.js';

const BENCH = { 4: { x: 7.4, z: 12.8 }, 5: { x: -7.4, z: 12.8 } }; // jogadores ocultos (3v3)

// Base só com ataque + reservas (a defesa entra reativa em cada quadro)
function base(off) {
  const full = { ...off };
  for (let i = 1; i <= 5; i++) if (!full[`O${i}`]) full[`O${i}`] = BENCH[i] || { x: 0, z: 13 };
  for (let i = 1; i <= 5; i++) if (!full[`X${i}`]) full[`X${i}`] = BENCH[i] ? { x: BENCH[i].x * 0.85, z: BENCH[i].z } : { x: 0, z: 13 };
  full.BALL = { x: full.O1.x + 0.45, z: full.O1.z };
  return full;
}

function buildFrames(baseObj, steps, scheme, n) {
  const frames = [];
  const cur = JSON.parse(JSON.stringify(baseObj));
  steps.forEach((s, i) => {
    // só o ataque se move por etapa
    if (s.moves) for (const id in s.moves) if (id.startsWith('O')) cur[id] = { ...s.moves[id] };
    const owner = s.ballOwner ?? null;
    // defesa REAGE à cena atual
    const D = reactiveDefense(cur, owner, scheme, n);
    for (const k in D) cur[k] = D[k];
    const positions = JSON.parse(JSON.stringify(cur));
    if (owner && positions[owner]) positions.BALL = { x: positions[owner].x + 0.45, z: positions[owner].z };
    frames.push({ label: s.label || `Q${i + 1}`, positions, ballOwner: owner });
  });
  return frames;
}

function makePreset(name, set, vs, off, steps, opts = {}) {
  const teamSize = opts.teamSize || 5;
  const scheme = teamSize < 5 ? 'man' : (opts.scheme || 'man');
  return {
    name, set, vs, preset: true, teamSize, mode: opts.mode || 'half',
    frames: buildFrames(base(off), steps, scheme, teamSize),
  };
}

export function getPresets() {
  return [
    // ===================== 5v5 vs INDIVIDUAL =====================
    makePreset('Pick & Roll central', 'Bloqueio direto', ['man'],
      { O1: { x: 0, z: 8.5 }, O2: { x: -6, z: 6 }, O3: { x: 6, z: 6 }, O4: { x: -2.45, z: 2 }, O5: { x: 2.45, z: 5 } },
      [
        { label: 'Início', ballOwner: 'O1' },
        { label: 'Bloqueio', ballOwner: 'O1', moves: { O5: { x: 0.8, z: 7.6 }, X5: { x: 1.2, z: 6.8 } } },
        { label: 'Drible + rolagem', ballOwner: 'O1', moves: { O1: { x: -1.6, z: 6.0 }, O5: { x: 1.0, z: 2.5 }, X1: { x: -1.1, z: 6.5 }, X5: { x: 1.0, z: 3.6 } } },
        { label: 'Passe na rolagem', ballOwner: 'O5', moves: { O5: { x: 0.8, z: 1.9 }, O1: { x: -2.6, z: 6.2 } } },
      ]),

    makePreset('Dá-e-vai', 'Cortes', ['man'],
      { O1: { x: 0, z: 8.5 }, O2: { x: -5.5, z: 6.5 }, O3: { x: 5.5, z: 6.5 }, O4: { x: -2.45, z: 2.2 }, O5: { x: 2.45, z: 2.2 } },
      [
        { label: 'Início', ballOwner: 'O1' },
        { label: 'Passe + corte', ballOwner: 'O2', moves: { O1: { x: -1.2, z: 5.5 }, X1: { x: -1.0, z: 6.2 } } },
        { label: 'Corte ao aro', ballOwner: 'O2', moves: { O1: { x: -0.9, z: 2.6 }, X1: { x: -1.2, z: 4.2 } } },
        { label: 'Devolução / bandeja', ballOwner: 'O1', moves: { O1: { x: -0.6, z: 1.9 } } },
      ]),

    makePreset('Horns (chifres)', 'Conjuntos', ['man'],
      { O1: { x: 0, z: 8.8 }, O4: { x: -2.45, z: 5.8 }, O5: { x: 2.45, z: 5.8 }, O2: { x: -6.6, z: 1.6 }, O3: { x: 6.6, z: 1.6 } },
      [
        { label: 'Início', ballOwner: 'O1' },
        { label: 'Passe ao poste', ballOwner: 'O4', moves: { O5: { x: 1.5, z: 6.8 } } },
        { label: 'Bloqueio + corte', ballOwner: 'O4', moves: { O5: { x: 0.6, z: 7.6 }, O1: { x: 1.2, z: 2.8 }, X1: { x: 0.4, z: 6.5 } } },
        { label: 'Passe ao cortador', ballOwner: 'O1', moves: { O1: { x: 0.8, z: 1.9 } } },
      ]),

    makePreset('Cortina dupla', 'Bloqueios sem bola', ['man'],
      { O1: { x: 0, z: 8.5 }, O2: { x: 2.0, z: 1.6 }, O4: { x: 3.4, z: 3.8 }, O5: { x: 4.6, z: 5.8 }, O3: { x: -5.5, z: 6.5 } },
      [
        { label: 'Início', ballOwner: 'O1' },
        { label: 'Sai da cortina', ballOwner: 'O1', moves: { O2: { x: 5.6, z: 6.8 }, X2: { x: 4.6, z: 6.0 } } },
        { label: 'Passe p/ arremesso', ballOwner: 'O2' },
      ]),

    // ===================== 5v5 vs ZONA =====================
    makePreset('Vs 2-3: poste alto + corte de fundo', 'Ataque de zona', ['2-3'],
      { O1: { x: -2.0, z: 8.2 }, O2: { x: 2.0, z: 8.2 }, O3: { x: -6.6, z: 1.6 }, O4: { x: 6.6, z: 1.6 }, O5: { x: 2.45, z: 2.2 } },
      [
        { label: 'Dois na cabeça', ballOwner: 'O1' },
        { label: 'Flash ao poste alto', ballOwner: 'O5', moves: { O5: { x: 0, z: 5.6 } } },
        { label: 'Corte de fundo', ballOwner: 'O5', moves: { O4: { x: 1.3, z: 1.3 } } },
        { label: 'Passe p/ bandeja', ballOwner: 'O4', moves: { O4: { x: 0.6, z: 1.5 } } },
      ], { scheme: '2-3' }),

    makePreset('Vs 3-2: meio e short corner', 'Ataque de zona', ['3-2'],
      { O1: { x: 0, z: 8.5 }, O2: { x: 5.6, z: 6.6 }, O3: { x: -5.6, z: 6.6 }, O4: { x: 2.45, z: 5.8 }, O5: { x: -6.0, z: 1.6 } },
      [
        { label: 'Início', ballOwner: 'O1' },
        { label: 'Entra no meio (poste alto)', ballOwner: 'O4', moves: {} },
        { label: 'Short corner + baseline', ballOwner: 'O4', moves: { O5: { x: -4.2, z: 1.8 }, O3: { x: -2.0, z: 1.5 } } },
        { label: 'Passe ao short corner', ballOwner: 'O5' },
      ], { scheme: '3-2' }),

    makePreset('Vs 1-3-1: ataque pelos cantos', 'Ataque de zona', ['1-3-1'],
      { O1: { x: 0, z: 8.5 }, O4: { x: 4.6, z: 6.6 }, O5: { x: -4.6, z: 6.6 }, O2: { x: 6.7, z: 1.6 }, O3: { x: -6.7, z: 1.6 } },
      [
        { label: 'Início', ballOwner: 'O1' },
        { label: 'Lado (ala)', ballOwner: 'O4' },
        { label: 'Short corner', ballOwner: 'O2', moves: { O2: { x: 4.6, z: 2.2 } } },
        { label: 'Ataca o canto', ballOwner: 'O2', moves: { O2: { x: 4.0, z: 1.6 } } },
      ], { scheme: '1-3-1' }),

    // ===================== 3v3 (individual) =====================
    makePreset('3x3 Pick & Roll', '3x3', ['man'],
      { O1: { x: 0, z: 8.0 }, O2: { x: 5.5, z: 5.5 }, O3: { x: -5.5, z: 5.5 } },
      [
        { label: 'Início', ballOwner: 'O1' },
        { label: 'Bloqueio no topo', ballOwner: 'O1', moves: { O2: { x: 1.0, z: 7.0 }, X2: { x: 1.3, z: 6.3 } } },
        { label: 'Drible + rolagem', ballOwner: 'O1', moves: { O1: { x: -1.6, z: 5.6 }, O2: { x: 1.0, z: 2.3 }, X1: { x: -1.1, z: 6.2 }, X2: { x: 1.0, z: 3.4 } } },
        { label: 'Passe na rolagem', ballOwner: 'O2', moves: { O2: { x: 0.8, z: 1.7 } } },
      ], { teamSize: 3 }),

    makePreset('3x3 Dá-e-vai + cross', '3x3', ['man'],
      { O1: { x: 0, z: 8.0 }, O2: { x: 5.5, z: 5.5 }, O3: { x: -5.5, z: 5.5 } },
      [
        { label: 'Início', ballOwner: 'O1' },
        { label: 'Passe + corte', ballOwner: 'O2', moves: { O1: { x: -1.2, z: 4.5 }, X1: { x: -1.0, z: 5.6 } } },
        { label: 'Cross screen', ballOwner: 'O2', moves: { O1: { x: -2.5, z: 2.2 }, O3: { x: 1.0, z: 2.0 }, X3: { x: 1.1, z: 3.0 } } },
        { label: 'Passe ao cortador', ballOwner: 'O3', moves: { O3: { x: 0.7, z: 1.7 } } },
      ], { teamSize: 3 }),

    makePreset('3x3 Ram → Pick & Roll', '3x3', ['man'],
      { O1: { x: 0, z: 8.5 }, O2: { x: 4.5, z: 4.0 }, O3: { x: -5.5, z: 5.5 } },
      [
        { label: 'Início', ballOwner: 'O1' },
        { label: 'Ram screen', ballOwner: 'O1', moves: { O3: { x: 2.2, z: 5.0 }, O2: { x: 1.0, z: 7.0 } } },
        { label: 'Pick & roll', ballOwner: 'O1', moves: { O1: { x: -1.6, z: 6.0 }, O2: { x: 1.0, z: 2.5 } } },
        { label: 'Passe na rolagem', ballOwner: 'O2', moves: { O2: { x: 0.8, z: 1.8 } } },
      ], { teamSize: 3 }),
  ];
}
