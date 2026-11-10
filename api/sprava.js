// Všetko, čo aplikácia potrebuje pri otvorení, jedným výpisom úložiska.
//   GET /api/sprava – admin: galéria, nastavenia, ponuky, faktúry; heslo na fotky: len galéria
// Predtým to boli 4 samostatné výpisy (list = platená operácia, bezplatný plán ich má 2 000 mesačne).
import { deny, fail, getRole, json } from './_lib/auth.js';
import { zoznamFaktur, zoznamPonuk } from './_lib/doklady.js';
import { listAll } from './_lib/store.js';
import { nacitajNazivo } from './_lib/verejne.js';

export async function GET(request) {
  const denied = deny(request, ['admin', 'fotky']);
  if (denied) return denied;
  try {
    const vsetky = await listAll('');
    const { galeria, nastavenia } = await nacitajNazivo(vsetky);
    const vystup = { galeria: { ...galeria, max: nastavenia.galeria.maxZakaziek } };
    if (getRole(request) === 'admin') {
      const [ponuky, faktury] = await Promise.all([zoznamPonuk(vsetky), zoznamFaktur(vsetky)]);
      Object.assign(vystup, { nastavenia, ponuky, faktury });
    }
    return json(vystup);
  } catch (e) {
    console.error(e);
    return fail(500, 'Údaje sa nepodarilo načítať. Skontrolujte, či je vo Verceli pripojené Blob úložisko.');
  }
}
