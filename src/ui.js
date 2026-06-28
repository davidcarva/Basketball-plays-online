import {
  addFrame, deleteFrame, setFrame, startPlayback, stopPlayback,
  applyFrameInstant, rebuildPaths, setSelection, setPathsVisible,
  createPlay, defaultPositions,
} from './play.js';
import { goToPreset } from './cameras.js';
import { getAllPlays, savePlay, deletePlay, exportPlay, importPlayFile } from './storage.js';

export function initUI(app) {
  const $ = (id) => document.getElementById(id);

  const els = {
    playName: $('playName'),
    menuBtn: $('menuBtn'),
    tools: $('tools'),
    newBtn: $('newBtn'),
    saveBtn: $('saveBtn'),
    libraryBtn: $('libraryBtn'),
    togglePaths: $('togglePaths'),
    toggleDefense: $('toggleDefense'),
    toggleLabels: $('toggleLabels'),
    resetFormationBtn: $('resetFormationBtn'),
    clearFramesBtn: $('clearFramesBtn'),
    playBtn: $('playBtn'),
    frames: $('frames'),
    addFrameBtn: $('addFrameBtn'),
    speed: $('speed'),
    libraryModal: $('libraryModal'),
    closeLibraryBtn: $('closeLibraryBtn'),
    setFilter: $('setFilter'),
    importBtn: $('importBtn'),
    importFile: $('importFile'),
    playList: $('playList'),
    toast: $('toast'),
  };

  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 1800);
  }

  // ---------- Linha do tempo ----------
  function renderFrames() {
    els.frames.innerHTML = '';
    app.state.play.frames.forEach((f, i) => {
      const chip = document.createElement('div');
      chip.className = 'frame-chip' + (i === app.state.currentFrame ? ' active' : '');
      chip.textContent = i + 1;
      chip.title = f.label || `Quadro ${i + 1}`;
      chip.addEventListener('click', () => setFrame(app, i));

      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '✕';
      del.title = 'Excluir quadro';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFrame(app, i);
      });
      chip.appendChild(del);
      els.frames.appendChild(chip);
    });
  }

  // ---------- Callbacks usados pelo motor ----------
  app.onFrameChange = renderFrames;
  app.onPlayStateChange = (playing) => {
    els.playBtn.textContent = playing ? '⏸' : '▶';
  };
  app.onPlayhead = (p) => {
    const n = app.state.play.frames.length - 1;
    const idx = Math.min(n, Math.round(p * n));
    [...els.frames.children].forEach((c, i) => c.classList.toggle('active', i === idx));
  };

  // ---------- Câmeras ----------
  document.querySelectorAll('.cam-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cam-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      goToPreset(app.cameraTween, app.camera, app.controls, btn.dataset.cam);
    });
  });

  // ---------- Painel de ferramentas ----------
  els.menuBtn.addEventListener('click', () => els.tools.classList.toggle('hidden'));
  if (window.innerWidth < 720) els.tools.classList.add('hidden');

  els.togglePaths.addEventListener('change', (e) => {
    app.state.showPaths = e.target.checked;
    setPathsVisible(app, e.target.checked);
    rebuildPaths(app);
  });
  els.toggleDefense.addEventListener('change', (e) => {
    app.state.showDefense = e.target.checked;
    for (const a of app.actors.values()) {
      if (a.id.startsWith('X')) a.mesh.visible = e.target.checked;
    }
    rebuildPaths(app);
  });
  els.toggleLabels.addEventListener('change', (e) => {
    for (const a of app.actors.values()) {
      const lbl = a.mesh.userData.label;
      if (lbl) lbl.visible = e.target.checked;
    }
  });

  els.resetFormationBtn.addEventListener('click', () => {
    app.state.play.frames[app.state.currentFrame].positions = defaultPositions();
    applyFrameInstant(app, app.state.currentFrame);
    rebuildPaths(app);
    toast('Formação resetada');
  });

  els.clearFramesBtn.addEventListener('click', () => {
    if (!confirm('Apagar todos os quadros (menos o atual)?')) return;
    const cur = app.state.play.frames[app.state.currentFrame];
    app.state.play.frames = [cur];
    setFrame(app, 0);
    toast('Quadros limpos');
  });

  // ---------- Reprodução ----------
  els.playBtn.addEventListener('click', () => {
    if (app.state.playing) stopPlayback(app);
    else startPlayback(app);
  });
  els.addFrameBtn.addEventListener('click', () => {
    addFrame(app);
    toast('Quadro adicionado — mova os jogadores');
  });
  els.speed.addEventListener('input', (e) => { app.state.speed = parseFloat(e.target.value); });

  // ---------- Nova / Salvar ----------
  els.playName.addEventListener('change', (e) => { app.state.play.name = e.target.value; });
  els.newBtn.addEventListener('click', () => {
    if (!confirm('Criar uma nova jogada? Salve a atual antes se quiser mantê-la.')) return;
    loadPlay(createPlay('Nova jogada'));
    toast('Nova jogada');
  });
  els.saveBtn.addEventListener('click', () => {
    app.state.play.name = els.playName.value || 'Sem nome';
    if (!app.state.play.set) {
      app.state.play.set = (prompt('Set / categoria (opcional):', '') || '').trim();
    }
    savePlay(app.state.play);
    toast('Jogada salva ✓');
  });

  // ---------- Biblioteca ----------
  function loadPlay(play) {
    app.state.play = JSON.parse(JSON.stringify(play));
    app.state.currentFrame = 0;
    app.state.playing = false;
    els.playName.value = app.state.play.name || '';
    applyFrameInstant(app, 0);
    rebuildPaths(app);
    renderFrames();
    setSelection(app, null);
    els.libraryModal.classList.add('hidden');
  }
  app.loadPlay = loadPlay;

  function renderLibrary() {
    const filter = (els.setFilter.value || '').toLowerCase();
    const plays = getAllPlays()
      .filter((p) => !filter || (p.set || '').toLowerCase().includes(filter) || (p.name || '').toLowerCase().includes(filter))
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    els.playList.innerHTML = '';
    if (!plays.length) {
      els.playList.innerHTML = '<div class="empty">Nenhuma jogada salva ainda.</div>';
      return;
    }
    for (const p of plays) {
      const row = document.createElement('div');
      row.className = 'play-row';
      const sub = [p.set ? `Set: ${p.set}` : null, `${p.frames.length} quadros`].filter(Boolean).join(' · ');
      row.innerHTML = `<div class="meta"><div class="name"></div><div class="sub"></div></div>`;
      row.querySelector('.name').textContent = p.name || 'Sem nome';
      row.querySelector('.sub').textContent = sub;

      const load = document.createElement('button');
      load.className = 'btn mini';
      load.textContent = 'Abrir';
      load.addEventListener('click', () => { loadPlay(p); toast('Jogada carregada'); });

      const exp = document.createElement('button');
      exp.className = 'btn mini';
      exp.textContent = 'Exportar';
      exp.addEventListener('click', () => exportPlay(p));

      const del = document.createElement('button');
      del.className = 'btn mini';
      del.textContent = 'Excluir';
      del.addEventListener('click', () => {
        if (!confirm(`Excluir "${p.name}"?`)) return;
        deletePlay(p.id);
        renderLibrary();
      });

      row.append(load, exp, del);
      els.playList.appendChild(row);
    }
  }

  els.libraryBtn.addEventListener('click', () => {
    els.libraryModal.classList.remove('hidden');
    renderLibrary();
  });
  els.closeLibraryBtn.addEventListener('click', () => els.libraryModal.classList.add('hidden'));
  els.libraryModal.addEventListener('click', (e) => {
    if (e.target === els.libraryModal) els.libraryModal.classList.add('hidden');
  });
  els.setFilter.addEventListener('input', renderLibrary);
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const play = await importPlayFile(file);
      savePlay(play);
      renderLibrary();
      toast('Importada ✓');
    } catch {
      toast('Arquivo inválido');
    }
    e.target.value = '';
  });

  // estado inicial da UI
  els.playName.value = app.state.play.name || '';
  renderFrames();
}
