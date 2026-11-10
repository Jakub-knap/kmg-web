// Cenník a údaje o firme (len pre admina).
//   GET /api/settings
//   PUT /api/settings[?verejne=1]  { firma, cenniky, galeria } – s ?verejne=1 sa obnoví aj verejný web
//                                  (údaje o firme, limit zákaziek; pri cenníku netreba)
import { deny, fail, json } from './_lib/auth.js';
import { clean, FOLDER, loadSettings } from './_lib/settings.js';
import { listAll, poZapise, vPriecinku, writeJsonVersion } from './_lib/store.js';
import { skusObnovit } from './_lib/verejne.js';

export async function GET(request) {
  const denied = deny(request, ['admin']);
  if (denied) return denied;
  try {
    return json(await loadSettings());
  } catch (e) {
    console.error(e);
    return fail(500, 'Nastavenia sa nepodarilo načítať. Skontrolujte pripojenie Blob úložiska.');
  }
}

export async function PUT(request) {
  const denied = deny(request, ['admin']);
  if (denied) return denied;
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Nastavenia neprišli celé.');
  }
  try {
    const data = clean(body);
    if (new URL(request.url).searchParams.get('verejne') === '1') {
      // jeden výpis úložiska poslúži na uloženie aj na obnovenie webu
      const vsetky = await listAll('');
      const stare = vPriecinku(vsetky, FOLDER);
      const ulozeny = await writeJsonVersion(FOLDER, data, stare);
      await skusObnovit(poZapise(vsetky, stare, ulozeny));
    } else {
      await writeJsonVersion(FOLDER, data);
    }
    return json(data);
  } catch (e) {
    console.error(e);
    return fail(500, 'Nastavenia sa nepodarilo uložiť.');
  }
}
