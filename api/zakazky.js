// Zákazky v galérii.
//   GET    /api/zakazky              – zoznam zákaziek s fotkami (verejne z verejného súboru webu,
//                                       prihlásený v aplikácii dostane čerstvý stav z úložiska)
//   POST   /api/zakazky              – nová zákazka { nazov, kategoria }; najstaršie nad limit sa zmažú
//   PUT    /api/zakazky?id=<zid>     – úprava názvu alebo druhu stavby,
//                                       alebo { foto: <fid>, oznacenie: 'pred' | 'po' | '' } – označenie fotky
//   DELETE /api/zakazky?id=<zid>     – zmazanie zákazky aj s fotkami
import { deny, fail, getRole, json } from './_lib/auth.js';
import { cistiZakazku, FID, nacitajZakazku, nastavOznacenie, noveId, orezNaLimit, ulozZakazku, zmazZakazku, ZID } from './_lib/galeria.js';
import { loadSettings } from './_lib/settings.js';
import { VEREJNA_CACHE, nacitajNazivo, nacitajVerejne, skusObnovit } from './_lib/verejne.js';

async function limitZakaziek() {
  try {
    return (await loadSettings()).galeria.maxZakaziek;
  } catch {
    return 10;
  }
}

export async function GET(request) {
  try {
    if (getRole(request)) {
      // aplikácia: čerstvý stav jedným výpisom úložiska
      const { galeria, nastavenia } = await nacitajNazivo();
      return json({ ...galeria, max: nastavenia.galeria.maxZakaziek });
    }
    const { zakazky = [], ine = [], max = 10 } = await nacitajVerejne();
    return json({ zakazky, ine, max }, 200, VEREJNA_CACHE);
  } catch (e) {
    console.error(e);
    return fail(500, 'Galériu sa nepodarilo načítať. Skontrolujte, či je vo Verceli pripojené Blob úložisko.');
  }
}

export async function POST(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Údaje o zákazke neprišli celé.');
  }
  const data = cistiZakazku(body);
  if (!data.nazov) return fail(400, 'Napíšte názov zákazky.');
  if (!data.kategoria) return fail(400, 'Vyberte druh stavby.');
  try {
    const zid = noveId();
    const vytvorene = Date.now();
    await ulozZakazku(zid, { ...data, vytvorene });
    const zmazane = await orezNaLimit(await limitZakaziek());
    await skusObnovit();
    return json({ zakazka: { id: zid, ...data, vytvorene, fotky: [] }, zmazane }, 201);
  } catch (e) {
    console.error(e);
    return fail(500, 'Zákazku sa nepodarilo vytvoriť.');
  }
}

export async function PUT(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;
  const zid = new URL(request.url).searchParams.get('id') || '';
  if (!ZID.test(zid)) return fail(400, 'Neplatná zákazka.');
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Údaje o zákazke neprišli celé.');
  }
  try {
    if (body?.foto !== undefined) {
      if (!FID.test(String(body.foto))) return fail(400, 'Neplatná fotka.');
      const oznacenia = await nastavOznacenie(zid, String(body.foto), body.oznacenie);
      if (!oznacenia) return fail(404, 'Zákazka už neexistuje.');
      await skusObnovit();
      return json({ foto: body.foto, oznacenie: oznacenia[body.foto] || null });
    }
    const povodna = await nacitajZakazku(zid);
    if (!povodna) return fail(404, 'Zákazka už neexistuje.');
    const data = cistiZakazku(body, povodna);
    if (!data.nazov) return fail(400, 'Napíšte názov zákazky.');
    await ulozZakazku(zid, { ...povodna, ...data, vytvorene: povodna.vytvorene });
    await skusObnovit();
    return json({ zakazka: { id: zid, ...data, vytvorene: povodna.vytvorene } });
  } catch (e) {
    console.error(e);
    return fail(500, 'Zákazku sa nepodarilo uložiť.');
  }
}

export async function DELETE(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;
  const zid = new URL(request.url).searchParams.get('id') || '';
  if (!ZID.test(zid)) return fail(400, 'Neplatná zákazka.');
  try {
    const n = await zmazZakazku(zid);
    if (!n) return fail(404, 'Zákazka už neexistuje.');
    await skusObnovit();
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail(500, 'Zákazku sa nepodarilo zmazať.');
  }
}
