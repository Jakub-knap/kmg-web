// Cenové ponuky (len pre admina).
//   GET    /api/offers            – zoznam ponúk
//   GET    /api/offers?id=2026-001 – jedna ponuka
//   POST   /api/offers            – uloženie (nová ponuka dostane ďalšie číslo)
//   DELETE /api/offers?id=2026-001
import { randomUUID } from 'node:crypto';
import { deny, fail, json } from './_lib/auth.js';
import { listAll, newest, put, readJson, removeFolder, del } from './_lib/store.js';

const ROOT = 'ponuky/';
const ID = /^\d{4}-\d{3,4}$/;
const STAVY = ['rozpracovaná', 'odoslaná', 'prijatá', 'zamietnutá'];

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const text = (v, max = 300) => String(v ?? '').slice(0, max).trim();
const num = (v, def = 0) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : def;
};

function groupById(blobs) {
  const map = new Map();
  for (const b of blobs) {
    const id = b.pathname.slice(ROOT.length).split('/')[0];
    if (!ID.test(id)) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(b);
  }
  return map;
}

function spocitaj(p) {
  const medzisucet = r2(p.polozky.reduce((s, x) => s + r2(x.mnozstvo * x.cena), 0));
  const zlava = r2((medzisucet * p.zlava) / 100);
  const zaklad = r2(medzisucet - zlava);
  const dph = p.platcaDph ? r2((zaklad * p.sadzbaDph) / 100) : 0;
  return { medzisucet, zlava, zaklad, dph, spolu: r2(zaklad + dph) };
}

function clean(input, id) {
  const z = input?.zakaznik || {};
  const p = {
    id,
    datum: /^\d{4}-\d{2}-\d{2}$/.test(input?.datum) ? input.datum : new Date().toISOString().slice(0, 10),
    stav: STAVY.includes(input?.stav) ? input.stav : 'rozpracovaná',
    zakaznik: { meno: text(z.meno, 200), adresa: text(z.adresa, 300), telefon: text(z.telefon, 60), email: text(z.email, 120) },
    miesto: text(input?.miesto, 300),
    predmet: text(input?.predmet, 300),
    polozky: (Array.isArray(input?.polozky) ? input.polozky : [])
      .slice(0, 300)
      .map((x) => ({ nazov: text(x.nazov, 300), jednotka: text(x.jednotka, 20) || 'ks', mnozstvo: num(x.mnozstvo), cena: num(x.cena) }))
      .filter((x) => x.nazov),
    zlava: Math.min(100, Math.max(0, num(input?.zlava))),
    platcaDph: Boolean(input?.platcaDph),
    sadzbaDph: Math.max(0, num(input?.sadzbaDph, 23)),
    platnostDni: Math.max(0, Math.round(num(input?.platnostDni, 30))),
    poznamka: text(input?.poznamka, 3000),
    vytvorene: input?.vytvorene || new Date().toISOString(),
    upravene: new Date().toISOString(),
  };
  p.sucty = spocitaj(p);
  return p;
}

export async function GET(request) {
  const denied = deny(request, ['admin']);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id');
  try {
    if (id) {
      if (!ID.test(id)) return fail(400, 'Neplatné číslo ponuky.');
      const blob = newest(await listAll(`${ROOT}${id}/`));
      if (!blob) return fail(404, 'Ponuka sa nenašla.');
      return json(await readJson(blob));
    }
    const groups = groupById(await listAll(ROOT));
    const ponuky = await Promise.all(
      [...groups.values()].map(async (blobs) => {
        try {
          const p = await readJson(newest(blobs));
          return { id: p.id, datum: p.datum, stav: p.stav, zakaznik: p.zakaznik?.meno || '', predmet: p.predmet || '', spolu: p.sucty?.spolu ?? 0, upravene: p.upravene };
        } catch {
          return null;
        }
      }),
    );
    return json({ ponuky: ponuky.filter(Boolean).sort((a, b) => b.id.localeCompare(a.id)) });
  } catch (e) {
    console.error(e);
    return fail(500, 'Ponuky sa nepodarilo načítať. Skontrolujte pripojenie Blob úložiska.');
  }
}

export async function POST(request) {
  const denied = deny(request, ['admin']);
  if (denied) return denied;
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Ponuka neprišla celá.');
  }
  try {
    let id = body?.id;
    let old = [];
    if (id) {
      if (!ID.test(id)) return fail(400, 'Neplatné číslo ponuky.');
      old = await listAll(`${ROOT}${id}/`);
    } else {
      const rok = new Date().getFullYear();
      const cisla = [...groupById(await listAll(`${ROOT}${rok}-`)).keys()].map((k) => Number(k.split('-')[1]));
      id = `${rok}-${String((cisla.length ? Math.max(...cisla) : 0) + 1).padStart(3, '0')}`;
    }
    const ponuka = clean(body, id);
    const saved = await put(`${ROOT}${id}/${Date.now()}-${randomUUID()}.json`, JSON.stringify(ponuka), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
    const stale = old.map((b) => b.url).filter((u) => u !== saved.url);
    if (stale.length) await del(stale);
    return json(ponuka, body?.id ? 200 : 201);
  } catch (e) {
    console.error(e);
    return fail(500, 'Ponuku sa nepodarilo uložiť.');
  }
}

export async function DELETE(request) {
  const denied = deny(request, ['admin']);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!ID.test(id)) return fail(400, 'Neplatné číslo ponuky.');
  try {
    const n = await removeFolder(`${ROOT}${id}/`);
    if (!n) return fail(404, 'Ponuka už neexistuje.');
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail(500, 'Ponuku sa nepodarilo zmazať.');
  }
}
