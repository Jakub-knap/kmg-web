// Fotky v zákazkách.
//   GET    /api/photos                       – verejný zoznam všetkých fotiek (pre staršie verzie stránky)
//   POST   /api/photos?zakazka=<zid>[&prvy=1] – nahratie do zákazky (FormData: foto, nahlad);
//                                               prvy=1 (prvá fotka dávky) overí, či zákazka existuje.
//                                               Označenie pred/po a obnovenie webu idú raz za celú dávku
//                                               cez POST /api/verejne. (Starší parameter &oznacenie=
//                                               ešte funguje, ale stojí 2 operácie navyše na fotku.)
//   DELETE /api/photos?id=<zid>/<fid>        – zmazanie fotky (aj staršie <kategoria>/<fid>)
import { deny, fail, json } from './_lib/auth.js';
import { FID, KATEGORIE, nastavOznacenia, noveId, OZNACENIA, ZID } from './_lib/galeria.js';
import { del, listAll, poZapise, put } from './_lib/store.js';
import { VEREJNA_CACHE, nacitajVerejne, skusObnovit } from './_lib/verejne.js';

const MAX_BYTES = 4 * 1024 * 1024; // Vercel funkcia prijme najviac 4,5 MB

export async function GET() {
  try {
    const { zakazky = [], ine = [] } = await nacitajVerejne();
    const fotky = [
      ...zakazky.flatMap((z) => z.fotky.map((f) => ({ ...f, kategoria: z.kategoria, zakazka: z.nazov }))),
      ...ine,
    ].sort((a, b) => b.cas - a.cas);
    return json({ fotky }, 200, VEREJNA_CACHE);
  } catch (e) {
    console.error(e);
    return fail(500, 'Fotky sa nepodarilo načítať. Skontrolujte, či je vo Verceli pripojené Blob úložisko.');
  }
}

export async function POST(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const zid = params.get('zakazka') || '';
  const oznacenie = OZNACENIA.includes(params.get('oznacenie')) ? params.get('oznacenie') : null;
  if (!ZID.test(zid)) return fail(400, 'Vyberte zákazku, do ktorej fotky patria.');
  // Kontrola stojí operáciu list, preto len pri prvej fotke dávky (ostatné overí POST /api/verejne).
  if (params.get('prvy') === '1' && !(await listAll(`zakazky/${zid}/`)).length) {
    return fail(404, 'Zákazka už neexistuje. Obnovte stránku.');
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'Fotka neprišla celá. Skúste ju nahrať znova.');
  }
  const foto = form.get('foto');
  const nahlad = form.get('nahlad');
  if (!foto || typeof foto === 'string') return fail(400, 'Chýba fotka.');
  if (foto.size > MAX_BYTES) return fail(413, 'Fotka je väčšia ako 4 MB. Nahrajte ju cez aplikáciu, ktorá ju sama zmenší.');
  const typ = foto.type || 'image/jpeg';
  if (!/^image\/(jpeg|png|webp)$/.test(typ)) return fail(415, 'Podporované sú fotky JPG, PNG alebo WebP.');
  const ext = typ === 'image/png' ? 'png' : typ === 'image/webp' ? 'webp' : 'jpg';

  const fid = noveId();
  try {
    const plna = await put(`galeria/${zid}/${fid}.${ext}`, foto, { access: 'public', addRandomSuffix: false, contentType: typ });
    let mala = plna;
    if (nahlad && typeof nahlad !== 'string' && nahlad.size > 0 && nahlad.size < MAX_BYTES) {
      mala = await put(`nahlady/${zid}/${fid}.${ext}`, nahlad, { access: 'public', addRandomSuffix: false, contentType: nahlad.type || typ });
    }
    if (oznacenie) await nastavOznacenia(zid, { [fid]: oznacenie }, await listAll(`zakazky/${zid}/`));
    return json({ foto: { id: `${zid}/${fid}`, url: plna.url, nahlad: mala.url, cas: Number(fid.split('-')[0]), ...(oznacenie ? { oznacenie } : {}) } }, 201);
  } catch (e) {
    console.error(e);
    return fail(500, 'Fotku sa nepodarilo uložiť. Skúste to znova o chvíľu.');
  }
}

export async function DELETE(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') || '';
  const [a, b] = id.split('/');
  const platne = b && /^\d+-[a-z0-9]+$/.test(b) && (ZID.test(a) ? FID.test(b) : KATEGORIE.includes(a));
  if (!platne) return fail(400, 'Neplatná fotka.');
  try {
    const vsetky = await listAll('');
    const najdene = vsetky.filter((x) => x.pathname.startsWith(`galeria/${a}/${b}.`) || x.pathname.startsWith(`nahlady/${a}/${b}.`));
    if (!najdene.length) return fail(404, 'Fotka už neexistuje.');
    await del(najdene.map((x) => x.url));
    await skusObnovit(poZapise(vsetky, najdene));
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail(500, 'Fotku sa nepodarilo zmazať.');
  }
}
