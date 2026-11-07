// Cenník a údaje o firme (len pre admina).
//   GET /api/settings
//   PUT /api/settings  { firma, cennik }
import { deny, fail, json } from './_lib/auth.js';
import { clean, FOLDER, loadSettings } from './_lib/settings.js';
import { writeJsonVersion } from './_lib/store.js';

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
    await writeJsonVersion(FOLDER, data);
    return json(data);
  } catch (e) {
    console.error(e);
    return fail(500, 'Nastavenia sa nepodarilo uložiť.');
  }
}
