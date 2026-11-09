// Verejné údaje o firme pre web (päta, telefóny, e-mail, Facebook).
// Berú sa z Ponuky → Údaje na ponuke v správe webu.
//   GET /api/firma
import { fail, json } from './_lib/auth.js';
import { VYMYSLENE } from './_lib/defaults.js';
import { loadSettings } from './_lib/settings.js';

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

export async function GET() {
  try {
    const { firma: f } = await loadSettings();
    const telefony = t(f.telefon).split(/[,;\n]+/).map((s) => s.trim()).filter((s) => /\d{6,}/.test(s.replace(/\s/g, ''))).slice(0, 4);
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t(f.email)) ? t(f.email) : '';
    return json({
      nazov: t(f.nazov),
      adresa: skutocne(f, 'adresa'),
      ico: skutocne(f, 'ico'),
      dic: skutocne(f, 'dic'),
      icdph: t(f.icdph),
      telefony,
      email,
      facebook: facebook(f.facebook),
    }, 200, { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' });
  } catch (e) {
    console.error(e);
    return fail(500, 'Údaje o firme sa nepodarilo načítať.');
  }
}
