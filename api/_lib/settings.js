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
const MIGRACIE = ['plechy', 'atiky', 'cenniky'];

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

const ZAKLADNE = [{ id: 'cennik', nazov: 'Cenník' }, { id: 'praca', nazov: 'Cena práce' }];
const ZOZNAM_ID = /^[a-z0-9-]{1,40}$/;

function cistiPolozky(arr) {
  return (Array.isArray(arr) ? arr : [])
    .slice(0, 500)
    .map((p) => ({ kategoria: text(p.kategoria, 60) || 'Ostatné', nazov: text(p.nazov, 200), jednotka: text(p.jednotka, 20) || 'ks', cena: Math.max(0, num(p.cena)) }))
    .filter((p) => p.nazov);
}

/** Cenníky z uložených dát (aj zo starého formátu s jedným „cennik“), so zaručenými základnými zoznamami. */
function zostavCenniky(input, { doplnPracu = false } = {}) {
  let zoznamy = Array.isArray(input?.cenniky)
    ? input.cenniky
    : [{ id: 'cennik', nazov: 'Cenník', polozky: Array.isArray(input?.cennik) ? input.cennik : [] }];
  const videne = new Set();
  zoznamy = zoznamy.slice(0, 30).map((z, i) => {
    let id = ZOZNAM_ID.test(z?.id) ? z.id : `k-${i}-${Date.now().toString(36)}`;
    while (videne.has(id)) id = `${id}-x`;
    videne.add(id);
    return { id, nazov: text(z?.nazov, 60) || 'Kategória', polozky: cistiPolozky(z?.polozky) };
  });
  ZAKLADNE.forEach((zak, poradie) => {
    if (zoznamy.some((z) => z.id === zak.id)) return;
    const predvolene = DEFAULT_SETTINGS.cenniky.find((z) => z.id === zak.id);
    const polozky = doplnPracu ? structuredClone(predvolene.polozky) : [];
    zoznamy.splice(Math.min(poradie, zoznamy.length), 0, { ...zak, polozky });
  });
  return zoznamy;
}

export function clean(input) {
  const f = input?.firma || {};
  const firma = {};
  for (const k of Object.keys(DEFAULT_SETTINGS.firma)) {
    if (k === 'platcaDph') firma[k] = Boolean(f[k]);
    else if (k === 'sadzbaDph' || k === 'platnostDni' || k === 'splatnostDni') firma[k] = Math.max(0, Math.min(365, num(f[k], DEFAULT_SETTINGS.firma[k])));
    else firma[k] = text(f[k], k === 'pata' ? 1000 : 300);
  }
  const cenniky = zostavCenniky(input);
  const max = Math.round(num(input?.galeria?.maxZakaziek, DEFAULT_SETTINGS.galeria.maxZakaziek));
  const galeria = { maxZakaziek: Math.min(50, Math.max(1, max)) };
  const migracie = (Array.isArray(input?.migracie) ? input.migracie : []).filter((m) => MIGRACIE.includes(m));
  return { firma, cenniky, galeria, migracie };
}

/** `vsetky` = hotový výpis celého úložiska (ušetrí jednu operáciu list). */
export async function loadSettings(vsetky) {
  const blob = newest(vsetky ? vsetky.filter((b) => b.pathname.startsWith(FOLDER)) : await listAll(FOLDER));
  if (!blob) return { ...structuredClone(DEFAULT_SETTINGS), migracie: [...MIGRACIE] };
  const data = await readJson(blob);
  const migracie = Array.isArray(data.migracie) ? [...data.migracie] : [];
  // Cena práce sa so vzorovými položkami doplní len raz (pri prechode zo starého formátu).
  const cenniky = zostavCenniky(data, { doplnPracu: !migracie.includes('cenniky') });
  const hlavny = cenniky.find((z) => z.id === 'cennik');
  if (!migracie.includes('plechy')) {
    hlavny.polozky = doplnPlechy(hlavny.polozky);
    migracie.push('plechy');
  }
  if (!migracie.includes('atiky')) {
    hlavny.polozky = doplnAtiky(hlavny.polozky);
    migracie.push('atiky');
  }
  if (!migracie.includes('cenniky')) migracie.push('cenniky');
  return {
    firma: { ...DEFAULT_SETTINGS.firma, ...(data.firma || {}), ...(data.firma?.web === 'kmg.sk' ? { web: 'kmgstav.sk' } : {}) },
    cenniky,
    galeria: { ...DEFAULT_SETTINGS.galeria, ...(data.galeria || {}) },
    migracie,
  };
}
