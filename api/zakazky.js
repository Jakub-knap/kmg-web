// Zákazky v galérii.
//   GET    /api/zakazky              – verejný zoznam zákaziek s fotkami
//   POST   /api/zakazky              – nová zákazka { nazov, kategoria }; najstaršie nad limit sa zmažú
//   PUT    /api/zakazky?id=<zid>     – úprava názvu alebo druhu stavby
//   DELETE /api/zakazky?id=<zid>     – zmazanie zákazky aj s fotkami
import { deny, fail, json } from './_lib/auth.js';
import { cistiZakazku, nacitajGaleriu, nacitajZakazku, noveId, orezNaLimit, ulozZakazku, zmazZakazku, ZID } from './_lib/galeria.js';
import { loadSettings } from './_lib/settings.js';

async function limitZakaziek() {
  try {
    return (await loadSettings()).galeria.maxZakaziek;
  } catch {
    return 10;
  }
}

export async function GET() {
  try {
    const [galeria, max] = await Promise.all([nacitajGaleriu(), limitZakaziek()]);
    return json({ ...galeria, max }, 200, { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=120' });
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
    const povodna = await nacitajZakazku(zid);
    if (!povodna) return fail(404, 'Zákazka už neexistuje.');
    const data = cistiZakazku(body, povodna);
    if (!data.nazov) return fail(400, 'Napíšte názov zákazky.');
    await ulozZakazku(zid, { ...data, vytvorene: povodna.vytvorene });
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
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail(500, 'Zákazku sa nepodarilo zmazať.');
  }
}
