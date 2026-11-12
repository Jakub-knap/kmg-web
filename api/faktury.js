// Faktúry (len pre admina).
//   GET    /api/faktury               – zoznam faktúr (súhrn)
//   GET    /api/faktury?id=2026001    – jedna faktúra
//   POST   /api/faktury               – uloženie; nová faktúra dostane ďalšie číslo (2026001, 2026002…)
//                                        alebo `cislo` zadané ručne; `cislo` pri uloženej nezaplatenej
//                                        faktúre ju prečísluje (409, ak číslo už existuje)
//   PUT    /api/faktury?id=2026001    – len stav platby { zaplatena, datumZaplatenia }
//   DELETE /api/faktury?id=2026001
//
// Údaje dodávateľa sa do faktúry zapíšu z Ponuky → Údaje na ponuke. Kým faktúra nie je zaplatená,
// pri každom uložení sa obnovia (opravené IČO a pod. sa prejavia); zaplatená faktúra si ich už drží.
import { randomUUID } from 'node:crypto';
import { deny, fail, json } from './_lib/auth.js';
import { loadSettings } from './_lib/settings.js';
import { fakturyPodlaCisla as podlaCisla, ID_FAKTURY as ID, ROOT_FAKTURY as ROOT, zoznamFaktur } from './_lib/doklady.js';
import { del, listAll, newest, put, readJson, removeFolder } from './_lib/store.js';

const PONUKA = /^\d{4}-\d{3,4}$/;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const text = (v, max = 300) => String(v ?? '').slice(0, max).trim();
const num = (v, def = 0) => {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : def;
};
const dnes = () => new Date().toISOString().slice(0, 10);
const pridajDni = (iso, dni) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
};

function spocitaj(f) {
  const medzisucet = r2(f.polozky.reduce((s, x) => s + r2(x.mnozstvo * x.cena), 0));
  const zlava = r2((medzisucet * f.zlava) / 100);
  const zaklad = r2(medzisucet - zlava);
  const dph = f.platcaDph ? r2((zaklad * f.sadzbaDph) / 100) : 0;
  return { medzisucet, zlava, zaklad, dph, spolu: r2(zaklad + dph) };
}

function dodavatel(firma = {}) {
  return {
    nazov: text(firma.obchodneMeno) || text(firma.nazov),
    znacka: text(firma.nazov),
    adresa: text(firma.adresa),
    ico: text(firma.ico, 40),
    dic: text(firma.dic, 40),
    icdph: text(firma.icdph, 40),
    iban: text(firma.iban, 60),
    swift: text(firma.swift, 20),
    bicSprostredkujuca: text(firma.bicSprostredkujuca, 20),
    register: text(firma.register, 300),
    telefon: text(firma.telefon, 120),
    email: text(firma.email, 120),
    web: text(firma.web, 120),
  };
}

/**
 * Ďalšie číslo v poradí pre daný rok: najvyššie RRRRNNN (alebo RRRRNNNN) + 1.
 * Ručne zadané číslo v tomto tvare (napr. 2026016) poradie posunie – ďalšie bude 2026017.
 */
function dalsieCislo(kluce, rok) {
  const vzor = new RegExp(`^${rok}(\\d{3,4})$`);
  let max = 0;
  let sirka = 3;
  for (const k of kluce) {
    const m = vzor.exec(k);
    if (m && Number(m[1]) >= max) {
      max = Number(m[1]);
      sirka = Math.max(3, m[1].length);
    }
  }
  return `${rok}${String(max + 1).padStart(sirka, '0')}`;
}

const obsadene = async (cislo) => (await listAll(`${ROOT}${cislo}/`)).length > 0;
const OBSADENE = (cislo) => `Faktúra s číslom ${cislo} už existuje. Zadajte iné číslo.`;

function clean(input, id, dod, splatnostDni = 14) {
  const o = input?.odberatel || {};
  const vystavena = DATUM.test(input?.datumVystavenia) ? input.datumVystavenia : dnes();
  const f = {
    id,
    vs: id,
    ponuka: PONUKA.test(input?.ponuka) ? input.ponuka : '',
    datumVystavenia: vystavena,
    datumDodania: DATUM.test(input?.datumDodania) ? input.datumDodania : vystavena,
    datumSplatnosti: DATUM.test(input?.datumSplatnosti) ? input.datumSplatnosti : pridajDni(vystavena, splatnostDni),
    odberatel: {
      meno: text(o.meno, 200), adresa: text(o.adresa, 300), ico: text(o.ico, 40), dic: text(o.dic, 40),
      icdph: text(o.icdph, 40), email: text(o.email, 120), telefon: text(o.telefon, 60),
    },
    predmet: text(input?.predmet, 300),
    polozky: (Array.isArray(input?.polozky) ? input.polozky : [])
      .slice(0, 300)
      .map((x) => ({ nazov: text(x.nazov, 300), jednotka: text(x.jednotka, 20) || 'ks', mnozstvo: num(x.mnozstvo), cena: num(x.cena), skupina: text(x.skupina, 60) }))
      .filter((x) => x.nazov),
    zlava: Math.min(100, Math.max(0, num(input?.zlava))),
    platcaDph: Boolean(input?.platcaDph),
    sadzbaDph: Math.max(0, input?.sadzbaDph === undefined || input?.sadzbaDph === '' ? 23 : num(input.sadzbaDph, 23)),
    poznamka: text(input?.poznamka, 3000),
    zaplatena: Boolean(input?.zaplatena),
    datumZaplatenia: '',
    dodavatel: dod,
    vytvorene: text(input?.vytvorene, 40) || new Date().toISOString(),
    upravene: new Date().toISOString(),
  };
  if (f.zaplatena) f.datumZaplatenia = DATUM.test(input?.datumZaplatenia) ? input.datumZaplatenia : dnes();
  f.sucty = spocitaj(f);
  return f;
}

async function uloz(f, stare = []) {
  const ulozene = await put(`${ROOT}${f.id}/${Date.now()}-${randomUUID()}.json`, JSON.stringify(f), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  const zastarane = stare.map((b) => b.url).filter((u) => u !== ulozene.url);
  if (zastarane.length) await del(zastarane);
}

export async function GET(request) {
  const denied = deny(request, ['admin']);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id');
  try {
    if (id) {
      if (!ID.test(id)) return fail(400, 'Neplatné číslo faktúry.');
      const blob = newest(await listAll(`${ROOT}${id}/`));
      if (!blob) return fail(404, 'Faktúra sa nenašla.');
      return json(await readJson(blob));
    }
    const faktury = await zoznamFaktur(await listAll(ROOT));
    return json({ faktury });
  } catch (e) {
    console.error(e);
    return fail(500, 'Faktúry sa nepodarilo načítať. Skontrolujte pripojenie Blob úložiska.');
  }
}

export async function POST(request) {
  const denied = deny(request, ['admin']);
  if (denied) return denied;
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Faktúra neprišla celá.');
  }
  // ručne zadané číslo (prázdne = ďalšie v poradí)
  const cislo = String(body?.cislo ?? '').replace(/\s/g, '');
  if (cislo && !ID.test(cislo)) {
    return fail(400, 'Číslo faktúry môže mať len číslice (najviac 10, nesmie začínať nulou) – je to aj variabilný symbol.');
  }
  try {
    let id = body?.id;
    let stare = [];
    let dod = null;
    if (id) {
      if (!ID.test(id)) return fail(400, 'Neplatné číslo faktúry.');
      stare = await listAll(`${ROOT}${id}/`);
      if (!stare.length) return fail(404, 'Faktúra už neexistuje.');
      const prec = cislo && cislo !== id;
      if (body.zaplatena || prec) {
        const ulozena = await readJson(newest(stare)).catch(() => null);
        // zaplatená faktúra si drží údaje dodávateľa z čias vystavenia
        if (body.zaplatena) dod = ulozena?.dodavatel || null;
        if (prec) {
          if (body.zaplatena || ulozena?.zaplatena) return fail(409, 'Číslo zaplatenej faktúry sa už nedá zmeniť.');
          if (await obsadene(cislo)) return fail(409, OBSADENE(cislo));
          id = cislo; // nová verzia pod novým číslom, staré (stare) sa po uložení zmažú
        }
      }
    } else if (cislo) {
      if (await obsadene(cislo)) return fail(409, OBSADENE(cislo));
      id = cislo;
    } else {
      const rok = new Date().getFullYear();
      id = dalsieCislo(podlaCisla(await listAll(`${ROOT}${rok}`)).keys(), rok);
    }
    const { firma } = await loadSettings();
    if (!dod) dod = dodavatel(firma);
    const faktura = clean(body, id, dod, Math.round(num(firma.splatnostDni, 14)));
    await uloz(faktura, stare);
    return json(faktura, body?.id ? 200 : 201);
  } catch (e) {
    console.error(e);
    return fail(500, 'Faktúru sa nepodarilo uložiť.');
  }
}

export async function PUT(request) {
  const denied = deny(request, ['admin']);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!ID.test(id)) return fail(400, 'Neplatné číslo faktúry.');
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Údaje neprišli celé.');
  }
  try {
    const stare = await listAll(`${ROOT}${id}/`);
    if (!stare.length) return fail(404, 'Faktúra už neexistuje.');
    const f = await readJson(newest(stare));
    f.zaplatena = Boolean(body?.zaplatena);
    f.datumZaplatenia = f.zaplatena ? (DATUM.test(body?.datumZaplatenia) ? body.datumZaplatenia : dnes()) : '';
    f.upravene = new Date().toISOString();
    await uloz(f, stare);
    return json(f);
  } catch (e) {
    console.error(e);
    return fail(500, 'Stav platby sa nepodarilo uložiť.');
  }
}

export async function DELETE(request) {
  const denied = deny(request, ['admin']);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!ID.test(id)) return fail(400, 'Neplatné číslo faktúry.');
  try {
    const n = await removeFolder(`${ROOT}${id}/`);
    if (!n) return fail(404, 'Faktúra už neexistuje.');
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail(500, 'Faktúru sa nepodarilo zmazať.');
  }
}
