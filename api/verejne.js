// Obnovenie verejného súboru webu (verejne/web.json) po dávke nahratých fotiek.
//   POST /api/verejne
// Ostatné zmeny (zákazky, označenia, mazanie, údaje o firme) ho obnovujú samé.
import { deny, fail, json } from './_lib/auth.js';
import { obnovVerejne } from './_lib/verejne.js';

export async function POST(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;
  try {
    const { obnovene } = await obnovVerejne();
    return json({ ok: true, obnovene });
  } catch (e) {
    console.error(e);
    return fail(500, 'Web sa nepodarilo obnoviť. Skúste to o chvíľu znova.');
  }
}
