// Všetko, čo potrebuje verejný web, jedným volaním: zákazky s fotkami, limit a údaje o firme.
//   GET /api/web
// Číta hotový súbor verejne/web.json – návštevy webu nemíňajú operácie výpisu úložiska.
import { fail, json } from './_lib/auth.js';
import { nacitajVerejne, VEREJNA_CACHE } from './_lib/verejne.js';

export async function GET() {
  try {
    const { zakazky = [], ine = [], max = 10, firma = {} } = await nacitajVerejne();
    return json({ zakazky, ine, max, firma }, 200, VEREJNA_CACHE);
  } catch (e) {
    console.error(e);
    return fail(500, 'Údaje webu sa nepodarilo načítať. Skontrolujte, či je vo Verceli pripojené Blob úložisko.');
  }
}
