// Koniec dávky nahratých fotiek: označenia pred/po a obnovenie verejného súboru webu naraz.
//   POST /api/verejne  [{ zakazka: <zid>, oznacenia: { <fid>: 'pred' | 'po' } }]
// Stojí 1 výpis + 1–2 zápisy za celú dávku, nie za každú fotku.
// Ostatné zmeny (zákazky, označenia, mazanie, údaje o firme) obnovujú web samé.
import { deny, fail, json } from './_lib/auth.js';
import { nastavOznacenia, ZID } from './_lib/galeria.js';
import { del, listAll, poZapise, vPriecinku } from './_lib/store.js';
import { obnovVerejne } from './_lib/verejne.js';

export async function POST(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;
  let body = {};
  try {
    body = (await request.json()) || {};
  } catch { /* bez tela: len obnoviť web */ }
  try {
    let vsetky = await listAll('');
    const zid = String(body.zakazka || '');
    let oznacenia;
    if (ZID.test(zid)) {
      if (!vPriecinku(vsetky, `zakazky/${zid}/`).length) {
        // zákazku medzitým niekto zmazal – fotky z dávky by v úložisku ostali navždy neviditeľné
        const siroty = [...vPriecinku(vsetky, `galeria/${zid}/`), ...vPriecinku(vsetky, `nahlady/${zid}/`)];
        if (siroty.length) await del(siroty.map((b) => b.url));
        return fail(404, 'Zákazku medzitým niekto zmazal, fotky sa preto neuložili.');
      }
      const zmeny = body.oznacenia && typeof body.oznacenia === 'object' ? Object.entries(body.oznacenia).slice(0, 500) : [];
      if (zmeny.length) {
        const vysledok = await nastavOznacenia(zid, Object.fromEntries(zmeny), vsetky);
        if (vysledok) ({ oznacenia, vsetky } = vysledok);
      }
    }
    const { obnovene } = await obnovVerejne(vsetky);
    return json({ ok: true, obnovene, ...(oznacenia ? { oznacenia } : {}) });
  } catch (e) {
    console.error(e);
    return fail(500, 'Web sa nepodarilo obnoviť. Skúste to o chvíľu znova.');
  }
}
