// Načítanie a čistenie nastavení (cenník, firma, galéria).
import { DEFAULT_SETTINGS } from './defaults.js';
import { listAll, newest, readJson } from './store.js';

export const FOLDER = 'nastavenia/';

function text(v, max = 300) {
  return String(v ?? '').slice(0, max).trim();
}

function num(v, def = 0) {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : def;
}

export function clean(input) {
  const f = input?.firma || {};
  const firma = {};
  for (const k of Object.keys(DEFAULT_SETTINGS.firma)) {
    if (k === 'platcaDph') firma[k] = Boolean(f[k]);
    else if (k === 'sadzbaDph' || k === 'platnostDni') firma[k] = Math.max(0, num(f[k], DEFAULT_SETTINGS.firma[k]));
    else firma[k] = text(f[k], k === 'pata' ? 1000 : 300);
  }
  const cennik = (Array.isArray(input?.cennik) ? input.cennik : [])
    .slice(0, 500)
    .map((p) => ({ kategoria: text(p.kategoria, 60) || 'Ostatné', nazov: text(p.nazov, 200), jednotka: text(p.jednotka, 20) || 'ks', cena: Math.max(0, num(p.cena)) }))
    .filter((p) => p.nazov);
  const max = Math.round(num(input?.galeria?.maxZakaziek, DEFAULT_SETTINGS.galeria.maxZakaziek));
  const galeria = { maxZakaziek: Math.min(50, Math.max(1, max)) };
  return { firma, cennik, galeria };
}

export async function loadSettings() {
  const blob = newest(await listAll(FOLDER));
  if (!blob) return structuredClone(DEFAULT_SETTINGS);
  const data = await readJson(blob);
  return {
    firma: { ...DEFAULT_SETTINGS.firma, ...(data.firma || {}) },
    cennik: Array.isArray(data.cennik) ? data.cennik : [],
    galeria: { ...DEFAULT_SETTINGS.galeria, ...(data.galeria || {}) },
  };
}

