// Načítanie a čistenie nastavení (cenník, firma, galéria).
import { DEFAULT_SETTINGS } from './defaults.js';
import { listAll, newest, readJson } from './store.js';

export const FOLDER = 'nastavenia/';

// Jednorazové doplnenia uloženého cenníka (každé sa použije len raz).
const PLECHY = [
  'Montáž krytiny – trapézový plech',
  'Montáž krytiny – plech v tvare škridly',
  'Montáž krytiny – falcovaná krytina',
  'Montáž krytiny – modulová krytina',
  'Montáž krytiny – plechová krytina klik',
];
const ATIKY = [
  { nazov: 'Oplechovanie atiky – r.š. do 330 mm', jednotka: 'bm' },
  { nazov: 'Oplechovanie atiky – r.š. do 500 mm', jednotka: 'bm' },
  { nazov: 'Oplechovanie atiky – r.š. nad 500 mm', jednotka: 'bm' },
  { nazov: 'Podkladová konštrukcia atiky so spádom (OSB, hranoly)', jednotka: 'bm' },
  { nazov: 'Demontáž starého oplechovania atiky', jednotka: 'bm' },
  { nazov: 'Rohy a ukončenia atiky', jednotka: 'ks' },
];
const MIGRACIE = ['plechy', 'atiky'];

function doplnAtiky(cennik) {
  if (cennik.some((p) => /atik/i.test(String(p.nazov)))) return cennik;
  const nove = ATIKY.map((a) => ({ kategoria: 'Atiky', ...a, cena: 0 }));
  // za poslednú položku kategórie Strechy, inak na koniec
  let kam = -1;
  cennik.forEach((p, j) => { if (p.kategoria === 'Strechy') kam = j; });
  return kam < 0 ? [...cennik, ...nove] : [...cennik.slice(0, kam + 1), ...nove, ...cennik.slice(kam + 1)];
}

function doplnPlechy(cennik) {
  const nazvy = new Set(cennik.map((p) => String(p.nazov).toLowerCase()));
  if (PLECHY.some((n) => nazvy.has(n.toLowerCase()))) return cennik;
  const i = cennik.findIndex((p) => /^montáž krytiny\s*[–-]\s*plech$/i.test(String(p.nazov).trim()));
  if (i >= 0) {
    // Pôvodnú položku „plech“ nahradíme štyrmi druhmi; cenu prevezmeme ako východiskovú.
    const p = cennik[i];
    const nove = PLECHY.map((nazov) => ({ kategoria: p.kategoria, nazov, jednotka: p.jednotka || 'm²', cena: Number(p.cena) || 0 }));
    return [...cennik.slice(0, i), ...nove, ...cennik.slice(i + 1)];
  }
  // Inak ich pridáme za poslednú položku „Montáž krytiny…“ alebo na koniec kategórie Strechy.
  let kam = -1;
  cennik.forEach((p, j) => { if (/^montáž krytiny/i.test(String(p.nazov))) kam = j; });
  if (kam < 0) cennik.forEach((p, j) => { if (p.kategoria === 'Strechy') kam = j; });
  const nove = PLECHY.map((nazov) => ({ kategoria: 'Strechy', nazov, jednotka: 'm²', cena: 0 }));
  return kam < 0 ? [...cennik, ...nove] : [...cennik.slice(0, kam + 1), ...nove, ...cennik.slice(kam + 1)];
}

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
  const migracie = (Array.isArray(input?.migracie) ? input.migracie : []).filter((m) => MIGRACIE.includes(m));
  return { firma, cennik, galeria, migracie };
}

export async function loadSettings() {
  const blob = newest(await listAll(FOLDER));
  if (!blob) return { ...structuredClone(DEFAULT_SETTINGS), migracie: [...MIGRACIE] };
  const data = await readJson(blob);
  const migracie = Array.isArray(data.migracie) ? [...data.migracie] : [];
  let cennik = Array.isArray(data.cennik) ? data.cennik : [];
  if (!migracie.includes('plechy')) {
    cennik = doplnPlechy(cennik);
    migracie.push('plechy');
  }
  if (!migracie.includes('atiky')) {
    cennik = doplnAtiky(cennik);
    migracie.push('atiky');
  }
  return {
    firma: { ...DEFAULT_SETTINGS.firma, ...(data.firma || {}) },
    cennik,
    galeria: { ...DEFAULT_SETTINGS.galeria, ...(data.galeria || {}) },
    migracie,
  };
}

