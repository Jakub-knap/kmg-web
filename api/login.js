import { clearCookie, fail, getRole, json, passwordsConfigured, roleForPassword, sessionCookie } from './_lib/auth.js';

// GET  /api/login  → kto je prihlásený
export function GET(request) {
  if (!passwordsConfigured()) return fail(503, 'Heslo ešte nie je nastavené vo Verceli (ADMIN_PASSWORD).');
  return json({ rola: getRole(request) });
}

// POST /api/login  { heslo } → prihlásenie
export async function POST(request) {
  if (!passwordsConfigured()) return fail(503, 'Heslo ešte nie je nastavené vo Verceli (ADMIN_PASSWORD).');
  let body = {};
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Chýba heslo.');
  }
  const rola = roleForPassword(body.heslo);
  if (!rola) {
    await new Promise((r) => setTimeout(r, 800)); // spomalí hádanie hesla
    return fail(401, 'Nesprávne heslo.');
  }
  return json({ rola }, 200, { 'Set-Cookie': sessionCookie(rola) });
}

// DELETE /api/login → odhlásenie
export function DELETE() {
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
}
