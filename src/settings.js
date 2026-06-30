// Configurações persistentes (identidade de time)
const KEY = 'bball_settings_v1';
const DEFAULTS = { offenseColor: '#0e3a86', defenseColor: '#c42a37', teamName: '' };

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* cota */ }
}
