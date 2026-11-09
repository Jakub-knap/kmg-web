// Verejné údaje o firme pre web (päta, telefóny, e-mail, Facebook).
// Berú sa z Ponuky → Údaje na ponuke v správe webu, cez verejný súbor webu.
//   GET /api/firma
import { fail, json } from './_lib/auth.js';
import { VEREJNA_CACHE, nacitajVerejne } from './_lib/verejne.js';

export async function GET() {
  try {
    return json((await nacitajVerejne()).firma || {}, 200, VEREJNA_CACHE);
  } catch (e) {
    console.error(e);
    return fail(500, 'Údaje o firme sa nepodarilo načítať.');
  }
}
