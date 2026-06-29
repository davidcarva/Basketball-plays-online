import { applyFrameInstant, rebuildPaths, updateVisibility } from './play.js';

// Histórico de desfazer/refazer: snapshots do estado da jogada.
const LIMIT = 80;

function snapshot(app) {
  return JSON.stringify({
    play: app.state.play,
    currentFrame: app.state.currentFrame,
    mode: app.state.mode,
    teamSize: app.state.teamSize,
  });
}

export function initHistory(app) {
  app.history = { past: [], future: [], last: snapshot(app) };
}

// Marca um ponto no histórico (chamar após cada ação que altera a jogada)
export function commit(app) {
  if (!app.history) return;
  const s = snapshot(app);
  if (s === app.history.last) return; // nada mudou
  app.history.past.push(app.history.last);
  if (app.history.past.length > LIMIT) app.history.past.shift();
  app.history.future.length = 0;
  app.history.last = s;
  app.onHistoryChange?.();
}

function restore(app, s) {
  const d = JSON.parse(s);
  const modeChanged = app.state.mode !== d.mode;
  app.state.play = d.play;
  app.state.currentFrame = d.currentFrame;
  app.state.teamSize = d.teamSize;
  app.history.last = s;
  if (modeChanged) app.setCourtMode(d.mode);
  applyFrameInstant(app, app.state.currentFrame);
  updateVisibility(app);
  rebuildPaths(app);
  app.syncUI?.();
  app.onHistoryChange?.();
}

export function undo(app) {
  if (!app.history?.past.length) return;
  app.history.future.push(app.history.last);
  restore(app, app.history.past.pop());
}

export function redo(app) {
  if (!app.history?.future.length) return;
  app.history.past.push(app.history.last);
  restore(app, app.history.future.pop());
}

export function canUndo(app) { return !!app.history?.past.length; }
export function canRedo(app) { return !!app.history?.future.length; }

// Marca como "salvo" o estado atual (após carregar/nova jogada)
export function resetHistory(app) {
  app.history = { past: [], future: [], last: snapshot(app) };
  app.onHistoryChange?.();
}
