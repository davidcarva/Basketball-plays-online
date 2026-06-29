const KEY = 'bball_plays_v1';
const DRAFT_KEY = 'bball_draft_v1';

// Rascunho (autosave) — preserva o trabalho não salvo entre sessões
export function saveDraft(play) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(play)); } catch { /* cota cheia */ }
}
export function getDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}
export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function getAllPlays() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function writeAll(plays) {
  localStorage.setItem(KEY, JSON.stringify(plays));
}

// Salva ou atualiza pelo id
export function savePlay(play) {
  const plays = getAllPlays();
  const i = plays.findIndex((p) => p.id === play.id);
  const stored = JSON.parse(JSON.stringify(play));
  stored.updatedAt = Date.now();
  if (i >= 0) plays[i] = stored;
  else plays.push(stored);
  writeAll(plays);
  return stored;
}

export function deletePlay(id) {
  writeAll(getAllPlays().filter((p) => p.id !== id));
}

export function exportPlay(play) {
  const blob = new Blob([JSON.stringify(play, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(play.name || 'jogada').replace(/[^\w\-]+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Compartilhar por link (jogada codificada na URL) ----------
function encodePlay(play) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(play))));
}
export function sharePlayURL(play) {
  return location.origin + location.pathname + '#play=' + encodePlay(play);
}
export function readSharedPlay() {
  const m = location.hash.match(/[#&]play=([^&]+)/);
  if (!m) return null;
  try {
    const play = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    if (!Array.isArray(play.frames)) return null;
    play.id = crypto.randomUUID();
    return play;
  } catch {
    return null;
  }
}
export function clearShareHash() {
  history.replaceState(null, '', location.pathname + location.search);
}

export function importPlayFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const play = JSON.parse(reader.result);
        if (!play.frames || !Array.isArray(play.frames)) throw new Error('Arquivo inválido');
        play.id = crypto.randomUUID();
        resolve(play);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
