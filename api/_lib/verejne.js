// Verejný súbor webu: galéria a údaje o firme v jednom JSON (verejne/web.json).
//
// Prečo: výpis úložiska (list) je vo Vercel Blob „pokročilá operácia“ a bezplatný plán ich má
// 2 000 mesačne. Po prekročení sa úložisko na 30 dní zablokuje. Web preto nečíta úložisko
// výpisom pri každej návšteve, ale len tento hotový súbor. Ten sa obnoví vždy, keď sa
// v aplikácii niečo zmení (zákazka, fotky, označenie pred/po, údaje o firme, limit zákaziek).
import { head } from '@vercel/blob';
import { VYMYSLENE } from './defaults.js';
import { nacitajGaleriu } from './galeria.js';
import { loadSettings } from './settings.js';
import { listAll, put } from './store.js';

export const CESTA = 'verejne/web.json';

// Cache odpovedí pre web: CDN Vercelu drží odpoveď 30 s, prehliadač sa vždy pýta znova.
export const VEREJNA_CACHE = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' };

const t = (v) => String(v ?? '').trim();

// Vymyslené predvolené hodnoty sa na web nedostanú.
const skutocne = (f, k) => (t(f[k]) && t(f[k]) !== VYMYSLENE[k] ? t(f[k]) : '');

function facebook(v) {
  let s = t(v);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, '')}`;
  try {
    const u = new URL(s);
    if (!/(^|\.)(facebook|fb)\.com$/i.test(u.hostname)) return '';
    u.protocol = 'https:';
    return u.href;
  } catch {
    return '';
  }
}

/** Údaje o firme, ktoré smú byť na webe (bez IBAN a bez vymyslených hodnôt). */
export function verejnaFirma(f = {}) {
  const telefony = t(f.telefon).split(/[,;\n]+/).map((s) => s.trim())
    .filter((s) => /\d{6,}/.test(s.replace(/\s/g, ''))).slice(0, 4);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t(f.email)) ? t(f.email) : '';
  return {
    nazov: t(f.nazov),
    adresa: skutocne(f, 'adresa'),
    ico: skutocne(f, 'ico'),
    dic: skutocne(f, 'dic'),
    icdph: t(f.icdph),
    telefony,
    email,
    facebook: facebook(f.facebook),
  };
}

/** Galéria a nastavenia z jedného výpisu úložiska (1 operácia na 1 000 súborov). */
export async function nacitajNazivo() {
  const vsetky = await listAll('');
  const [galeria, nastavenia] = await Promise.all([nacitajGaleriu(vsetky), loadSettings(vsetky)]);
  return { galeria, nastavenia };
}

/** Zostaví a uloží verejný súbor. Volá sa po každej zmene v aplikácii. */
export async function obnovVerejne() {
  const { galeria, nastavenia } = await nacitajNazivo();
  const data = {
    ...galeria,
    max: nastavenia.galeria.maxZakaziek,
    firma: verejnaFirma(nastavenia.firma),
    obnovene: Date.now(),
  };
  await put(CESTA, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60, // najkratšia možná doba; zmena sa na webe prejaví do minúty
  });
  return data;
}

/** Obnovenie, ktoré nesmie pokaziť hlavnú akciu (fotka je nahratá, aj keď sa web neobnoví). */
export async function skusObnovit() {
  try {
    await obnovVerejne();
    return true;
  } catch (e) {
    console.error('Verejný súbor webu sa nepodarilo obnoviť', e);
    return false;
  }
}

// Adresa verejného súboru. Odvodí sa z tokenu úložiska, takže na jej zistenie netreba žiadnu operáciu.
let zapamatana;
function odhadAdresy() {
  if (process.env.FAKE_BLOB_BASE) return `${process.env.FAKE_BLOB_BASE}${CESTA}`; // lokálny test
  const m = /^vercel_blob_rw_([a-z0-9]+)_/i.exec(process.env.BLOB_READ_WRITE_TOKEN || '');
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/${CESTA}` : null;
}

async function stiahni(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

/** Načíta verejný súbor; ak ešte neexistuje (prvé spustenie), vytvorí ho. */
export async function nacitajVerejne() {
  const odhad = zapamatana || odhadAdresy();
  if (odhad) {
    try {
      const data = await stiahni(odhad);
      if (data) {
        zapamatana = odhad;
        return data;
      }
    } catch { /* skúsime cez head() */ }
  }
  // Záloha: head() je jednoduchá operácia (10 000 mesačne) a vždy vráti skutočnú adresu.
  let info = null;
  try {
    info = await head(CESTA);
  } catch { /* súbor ešte nie je */ }
  if (info?.url) {
    // verzia v adrese obíde prípadnú starú kópiu v cache
    const data = await stiahni(`${info.url}?v=${new Date(info.uploadedAt).getTime()}`).catch(() => null);
    if (data) {
      zapamatana = info.url;
      return data;
    }
  }
  return obnovVerejne();
}
