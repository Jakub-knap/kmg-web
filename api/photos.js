// Galéria realizácií.
//   GET    /api/photos[?kategoria=strechy]   – verejný zoznam fotiek
//   POST   /api/photos?kategoria=strechy     – nahratie (FormData: foto, nahlad)
//   DELETE /api/photos?id=strechy/1730000000000-ab12cd
import { randomUUID } from 'node:crypto';
import { deny, fail, json } from './_lib/auth.js';
import { del, listAll, put } from './_lib/store.js';

const KATEGORIE = ['strechy', 'chaty', 'pristresky', 'altanky', 'pergoly', 'drevodomy', 'interier'];
const MAX_BYTES = 4 * 1024 * 1024; // Vercel funkcia prijme najviac 4,5 MB

function idFromPath(pathname) {
  // galeria/strechy/1730000000000-ab12cd.jpg → strechy/1730000000000-ab12cd
  const m = pathname.match(/^(?:galeria|nahlady)\/([a-z]+)\/([0-9]+-[a-z0-9]+)\.(?:jpe?g|webp|png)$/i);
  return m ? { kategoria: m[1], id: `${m[1]}/${m[2]}`, cas: Number(m[2].split('-')[0]) } : null;
}

export async function GET(request) {
  const url = new URL(request.url);
  const kat = url.searchParams.get('kategoria');
  const suffix = kat && KATEGORIE.includes(kat) ? `${kat}/` : '';
  try {
    const [plne, nahlady] = await Promise.all([listAll(`galeria/${suffix}`), listAll(`nahlady/${suffix}`)]);
    const thumbs = new Map();
    for (const b of nahlady) {
      const info = idFromPath(b.pathname);
      if (info) thumbs.set(info.id, b.url);
    }
    const fotky = [];
    for (const b of plne) {
      const info = idFromPath(b.pathname);
      if (!info) continue;
      fotky.push({ id: info.id, kategoria: info.kategoria, url: b.url, nahlad: thumbs.get(info.id) || b.url, cas: info.cas });
    }
    fotky.sort((a, b) => b.cas - a.cas);
    return json({ fotky }, 200, { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=120' });
  } catch (e) {
    console.error(e);
    return fail(500, 'Fotky sa nepodarilo načítať. Skontrolujte, či je vo Verceli pripojené Blob úložisko.');
  }
}

export async function POST(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;

  const kat = new URL(request.url).searchParams.get('kategoria');
  if (!KATEGORIE.includes(kat)) return fail(400, 'Vyberte kategóriu fotky.');

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'Fotka neprišla celá. Skúste ju nahrať znova.');
  }
  const foto = form.get('foto');
  const nahlad = form.get('nahlad');
  if (!foto || typeof foto === 'string') return fail(400, 'Chýba fotka.');
  if (foto.size > MAX_BYTES) return fail(413, 'Fotka je väčšia ako 4 MB. Nahrajte ju cez stránku, ktorá ju sama zmenší.');
  const typ = foto.type || 'image/jpeg';
  if (!/^image\/(jpeg|png|webp)$/.test(typ)) return fail(415, 'Podporované sú fotky JPG, PNG alebo WebP.');
  const ext = typ === 'image/png' ? 'png' : typ === 'image/webp' ? 'webp' : 'jpg';

  const id = `${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  try {
    const plna = await put(`galeria/${kat}/${id}.${ext}`, foto, { access: 'public', addRandomSuffix: false, contentType: typ });
    let mala = plna;
    if (nahlad && typeof nahlad !== 'string' && nahlad.size > 0 && nahlad.size < MAX_BYTES) {
      mala = await put(`nahlady/${kat}/${id}.${ext}`, nahlad, { access: 'public', addRandomSuffix: false, contentType: nahlad.type || typ });
    }
    return json({ foto: { id: `${kat}/${id}`, kategoria: kat, url: plna.url, nahlad: mala.url, cas: Number(id.split('-')[0]) } }, 201);
  } catch (e) {
    console.error(e);
    return fail(500, 'Fotku sa nepodarilo uložiť. Skúste to znova o chvíľu.');
  }
}

export async function DELETE(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') || '';
  const m = id.match(/^([a-z]+)\/([0-9]+-[a-z0-9]+)$/);
  if (!m || !KATEGORIE.includes(m[1])) return fail(400, 'Neplatná fotka.');
  try {
    const najdene = [...(await listAll(`galeria/${m[1]}/${m[2]}.`)), ...(await listAll(`nahlady/${m[1]}/${m[2]}.`))];
    if (!najdene.length) return fail(404, 'Fotka už neexistuje.');
    await del(najdene.map((b) => b.url));
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail(500, 'Fotku sa nepodarilo zmazať.');
  }
}
