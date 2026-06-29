import {
  addFrame, deleteFrame, setFrame, startPlayback, stopPlayback,
  applyFrameInstant, rebuildPaths, setSelection, setPathsVisible,
  createPlay, defaultPositions, updateVisibility,
} from './play.js';
import { applyReactiveToPlay, DEFENSE_SCHEMES } from './defense.js';
import { getPresets } from './presets.js';
import { getAllPlays, savePlay, deletePlay, exportPlay, importPlayFile, saveDraft, sharePlayURL } from './storage.js';
import { canUndo, canRedo } from './history.js';

export function initUI(app) {
  const $ = (id) => document.getElementById(id);

  const els = {
    playName: $('playName'),
    menuBtn: $('menuBtn'),
    tools: $('tools'),
    newBtn: $('newBtn'),
    saveBtn: $('saveBtn'),
    libraryBtn: $('libraryBtn'),
    undoBtn: $('undoBtn'),
    redoBtn: $('redoBtn'),
    helpBtn: $('helpBtn'),
    setInput: $('setInput'),
    legendBtn: $('legendBtn'),
    legendPanel: $('legendPanel'),
    view3d: $('view3d'),
    view2d: $('view2d'),
    cameras: $('cameras'),
    exportImgBtn: $('exportImgBtn'),
    exportVidBtn: $('exportVidBtn'),
    shareBtn: $('shareBtn'),
    onboardModal: $('onboardModal'),
    closeOnboardBtn: $('closeOnboardBtn'),
    startOnboardBtn: $('startOnboardBtn'),
    togglePaths: $('togglePaths'),
    toggleDefense: $('toggleDefense'),
    toggleLabels: $('toggleLabels'),
    modeHalf: $('modeHalf'),
    modeFull: $('modeFull'),
    size5: $('size5'),
    size3: $('size3'),
    defenseSelect: $('defenseSelect'),
    reactBtn: $('reactBtn'),
    vsChips: $('vsChips'),
    vsBadge: $('vsBadge'),
    defFilter: $('defFilter'),
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

  // Sincroniza toda a UI com o estado (usado por desfazer/refazer e carregar)
  function syncUI() {
    els.playName.value = app.state.play.name || '';
    els.setInput.value = app.state.play.set || '';
    renderFrames();
    renderVsChips();
    renderVsBadge();
    renderDefenseSelect();
    syncModeButtons();
    syncSizeButtons();
  }
  app.syncUI = syncUI;

  // histórico: estado dos botões + autosave (rascunho, debounced)
  let draftTimer;
  app.onHistoryChange = () => {
    els.undoBtn.disabled = !canUndo(app);
    els.redoBtn.disabled = !canRedo(app);
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      app.state.play.mode = app.state.mode;
      app.state.play.teamSize = app.state.teamSize;
      saveDraft(app.state.play);
    }, 400);
  };

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
        app.commit();
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

  app.onDefenseChange = () => {
    els.toggleDefense.checked = app.state.showDefense;
  };

  // rótulos curtos das defesas (chips/badges)
  const SHORT = { man: 'Individual', '2-3': '2-3', '3-2': '3-2', '1-3-1': '1-3-1', '2-1-2': '2-1-2', '1-2-2': '1-2-2', box1: 'Box-1', press: 'Pressão' };

  // ---------- "Funciona contra" (tags da jogada) ----------
  function renderVsBadge() {
    const vs = app.state.play.vs || [];
    if (!vs.length) { els.vsBadge.classList.add('hidden'); els.vsBadge.innerHTML = ''; return; }
    els.vsBadge.classList.remove('hidden');
    els.vsBadge.innerHTML = '<span class="vs-label">Funciona contra:</span>' +
      vs.map((v) => `<span class="tag">${SHORT[v] || v}</span>`).join('');
  }
  function renderVsChips() {
    const vs = app.state.play.vs || (app.state.play.vs = []);
    els.vsChips.innerHTML = '';
    for (const s of DEFENSE_SCHEMES) {
      const chip = document.createElement('button');
      chip.className = 'vs-chip' + (vs.includes(s.id) ? ' on' : '');
      chip.textContent = SHORT[s.id] || s.name;
      chip.addEventListener('click', () => {
        const i = vs.indexOf(s.id);
        if (i >= 0) vs.splice(i, 1); else vs.push(s.id);
        chip.classList.toggle('on');
        renderVsBadge();
        app.commit();
      });
      els.vsChips.appendChild(chip);
    }
  }

  // ---------- Câmeras ----------
  document.querySelectorAll('.cam-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cam-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      app.setCamera(btn.dataset.cam);
    });
  });

  // ---------- Modo de quadra ----------
  function syncModeButtons() {
    els.modeHalf.classList.toggle('active', app.state.mode === 'half');
    els.modeFull.classList.toggle('active', app.state.mode === 'full');
  }
  els.modeHalf.addEventListener('click', () => { app.setCourtMode('half'); syncModeButtons(); app.commit(); });
  els.modeFull.addEventListener('click', () => { app.setCourtMode('full'); syncModeButtons(); app.commit(); });

  // ---------- Formato 5v5 / 3v3 ----------
  function syncSizeButtons() {
    els.size5.classList.toggle('active', app.state.teamSize === 5);
    els.size3.classList.toggle('active', app.state.teamSize === 3);
  }
  els.size5.addEventListener('click', () => { app.setTeamSize(5); renderDefenseSelect(); syncSizeButtons(); app.commit(); });
  els.size3.addEventListener('click', () => { app.setTeamSize(3); renderDefenseSelect(); applyReactiveToPlay(app, 'man'); syncSizeButtons(); app.commit(); });

  // ---------- Defesa (esquemas/zonas) ----------
  function renderDefenseSelect() {
    const schemes = app.state.teamSize === 3 ? DEFENSE_SCHEMES.filter((s) => s.id === 'man') : DEFENSE_SCHEMES;
    els.defenseSelect.innerHTML = '';
    for (const s of schemes) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      els.defenseSelect.appendChild(opt);
    }
    els.defenseSelect.value = schemes[0].id;
  }
  els.defenseSelect.addEventListener('change', (e) => {
    applyReactiveToPlay(app, e.target.value);
    app.commit();
    toast('Defesa reage à jogada: ' + e.target.options[e.target.selectedIndex].text);
  });
  els.reactBtn.addEventListener('click', () => {
    applyReactiveToPlay(app, els.defenseSelect.value);
    app.commit();
    toast('Defesa recalculada ↻');
  });

  // ---------- Desfazer / Refazer ----------
  els.undoBtn.addEventListener('click', () => app.undo());
  els.redoBtn.addEventListener('click', () => app.redo());

  // ---------- Set (categoria) inline ----------
  els.setInput.addEventListener('change', (e) => { app.state.play.set = e.target.value.trim(); app.commit(); });

  // ---------- Ajuda / onboarding ----------
  function openOnboard() { els.onboardModal.classList.remove('hidden'); }
  function closeOnboard() { els.onboardModal.classList.add('hidden'); localStorage.setItem('bball_onboarded', '1'); }
  els.helpBtn.addEventListener('click', openOnboard);
  els.closeOnboardBtn.addEventListener('click', closeOnboard);
  els.startOnboardBtn.addEventListener('click', closeOnboard);
  els.onboardModal.addEventListener('click', (e) => { if (e.target === els.onboardModal) closeOnboard(); });
  if (!localStorage.getItem('bball_onboarded')) openOnboard();

  // ---------- Legenda ----------
  els.legendBtn.addEventListener('click', () => els.legendPanel.classList.toggle('hidden'));

  // ---------- Visão 3D / 2D (prancheta) ----------
  function syncViewButtons() {
    els.view3d.classList.toggle('active', app.state.view === '3d');
    els.view2d.classList.toggle('active', app.state.view === '2d');
    els.cameras.style.display = app.state.view === '2d' ? 'none' : '';
  }
  els.view3d.addEventListener('click', () => { app.setView('3d'); syncViewButtons(); });
  els.view2d.addEventListener('click', () => { app.setView('2d'); syncViewButtons(); });

  // ---------- Exportar / compartilhar ----------
  els.exportImgBtn.addEventListener('click', () => { app.exportImage(); toast('Imagem exportada ✓'); });
  els.exportVidBtn.addEventListener('click', () => {
    const ok = app.exportVideo();
    toast(ok ? 'Gravando vídeo da jogada…' : 'Vídeo não suportado neste navegador');
  });
  els.shareBtn.addEventListener('click', async () => {
    app.state.play.name = els.playName.value || 'Sem nome';
    app.state.play.set = els.setInput.value.trim();
    app.state.play.mode = app.state.mode;
    app.state.play.teamSize = app.state.teamSize;
    const url = sharePlayURL(app.state.play);
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado ✓');
    } catch {
      prompt('Copie o link da jogada:', url);
    }
  });

  // ---------- Atalhos de teclado ----------
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); app.undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); app.redo(); }
      return;
    }
    if (e.key === ' ') { e.preventDefault(); app.state.playing ? stopPlayback(app) : startPlayback(app); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setFrame(app, app.state.currentFrame + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setFrame(app, app.state.currentFrame - 1); }
    else if (e.key.toLowerCase() === 'n') { addFrame(app); app.commit(); toast('Quadro adicionado'); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { deleteFrame(app, app.state.currentFrame); app.commit(); }
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
    updateVisibility(app);
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
    app.commit();
    toast('Formação resetada');
  });

  els.clearFramesBtn.addEventListener('click', () => {
    if (!confirm('Apagar todos os quadros (menos o atual)?')) return;
    const cur = app.state.play.frames[app.state.currentFrame];
    app.state.play.frames = [cur];
    setFrame(app, 0);
    app.commit();
    toast('Quadros limpos');
  });

  // ---------- Reprodução ----------
  els.playBtn.addEventListener('click', () => {
    if (app.state.playing) stopPlayback(app);
    else startPlayback(app);
  });
  els.addFrameBtn.addEventListener('click', () => {
    addFrame(app);
    app.commit();
    toast('Quadro adicionado — mova os jogadores');
  });
  els.speed.addEventListener('input', (e) => { app.state.speed = parseFloat(e.target.value); });

  // ---------- Nova / Salvar ----------
  els.playName.addEventListener('change', (e) => { app.state.play.name = e.target.value; app.commit(); });
  els.newBtn.addEventListener('click', () => {
    if (!confirm('Criar uma nova jogada? Salve a atual antes se quiser mantê-la.')) return;
    loadPlay(createPlay('Nova jogada'));
    toast('Nova jogada');
  });
  els.saveBtn.addEventListener('click', () => {
    app.state.play.name = els.playName.value || 'Sem nome';
    app.state.play.set = els.setInput.value.trim();
    app.state.play.mode = app.state.mode;
    app.state.play.teamSize = app.state.teamSize;
    if (!Array.isArray(app.state.play.vs)) app.state.play.vs = [];
    savePlay(app.state.play);
    toast('Jogada salva ✓');
  });

  // ---------- Biblioteca ----------
  function loadPlay(play) {
    const p = JSON.parse(JSON.stringify(play));
    delete p.preset;
    if (!p.id) p.id = crypto.randomUUID();
    if (!Array.isArray(p.vs)) p.vs = [];
    const mode = p.mode === 'full' ? 'full' : 'half';
    const size = p.teamSize === 3 ? 3 : 5;
    app.state.play = p;
    app.state.currentFrame = 0;
    app.state.playing = false;
    if (app.state.mode !== mode) app.setCourtMode(mode);
    if (app.state.teamSize !== size) app.setTeamSize(size);
    applyFrameInstant(app, 0);
    rebuildPaths(app);
    setSelection(app, null);
    syncUI();
    app.resetHistory?.();
    els.libraryModal.classList.add('hidden');
  }
  app.loadPlay = loadPlay;

  function matchesFilter(p, filter, def) {
    const textOk = !filter || (p.set || '').toLowerCase().includes(filter) || (p.name || '').toLowerCase().includes(filter);
    const defOk = !def || (Array.isArray(p.vs) && p.vs.includes(def));
    return textOk && defOk;
  }

  function makeRow(p, isPreset) {
    const row = document.createElement('div');
    row.className = 'play-row';
    const sub = [p.set ? `Set: ${p.set}` : null, `${p.frames.length} quadros`,
      `${p.teamSize === 3 ? '3v3' : '5v5'} · ${p.mode === 'full' ? 'inteira' : 'meia'}`].filter(Boolean).join(' · ');
    row.innerHTML = `<div class="meta"><div class="name"></div><div class="sub"></div><div class="badges"></div></div>`;
    row.querySelector('.name').textContent = p.name || 'Sem nome';
    row.querySelector('.sub').textContent = sub;
    const badges = row.querySelector('.badges');
    (p.vs || []).forEach((v) => {
      const t = document.createElement('span');
      t.className = 'tag';
      t.textContent = SHORT[v] || v;
      badges.appendChild(t);
    });

    const load = document.createElement('button');
    load.className = 'btn mini';
    load.textContent = 'Abrir';
    load.addEventListener('click', () => { loadPlay(p); toast(isPreset ? 'Modelo carregado' : 'Jogada carregada'); });
    row.appendChild(load);

    if (!isPreset) {
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
      row.append(exp, del);
    }
    return row;
  }

  function renderLibrary() {
    const filter = (els.setFilter.value || '').toLowerCase();
    const def = els.defFilter.value || '';
    els.playList.innerHTML = '';

    // Modelos FIBA (somente leitura, abrem como cópia editável)
    const presets = getPresets().filter((p) => matchesFilter(p, filter, def));
    if (presets.length) {
      const h = document.createElement('div');
      h.className = 'list-header';
      h.textContent = '📐 Modelos FIBA';
      els.playList.appendChild(h);
      presets.forEach((p) => els.playList.appendChild(makeRow(p, true)));
    }

    // Minhas jogadas
    const plays = getAllPlays()
      .filter((p) => matchesFilter(p, filter, def))
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    const h2 = document.createElement('div');
    h2.className = 'list-header';
    h2.textContent = '💾 Minhas jogadas';
    els.playList.appendChild(h2);

    if (!plays.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Nenhuma jogada salva ainda.';
      els.playList.appendChild(empty);
    } else {
      plays.forEach((p) => els.playList.appendChild(makeRow(p, false)));
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
  els.defFilter.addEventListener('change', renderLibrary);
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

  // filtro de defesa na biblioteca
  els.defFilter.innerHTML = '<option value="">Toda defesa</option>' +
    DEFENSE_SCHEMES.map((s) => `<option value="${s.id}">vs ${SHORT[s.id] || s.name}</option>`).join('');

  // estado inicial da UI
  syncUI();
  syncViewButtons();
}
