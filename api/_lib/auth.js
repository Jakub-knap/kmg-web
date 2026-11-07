// Prihlásenie do správy webu.
// Heslá sú len v nastaveniach Vercelu (Environment Variables), nikdy nie v kóde:
//   ADMIN_PASSWORD  – plný prístup (fotky, ponuky, cenník, firma)
//   FOTKY_PASSWORD  – voliteľné, len nahrávanie fotiek (napr. pre partiu na stavbe)
//   SESSION_SECRET  – voliteľné, dlhý náhodný text na podpis prihlásenia
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'kmg_s';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dní

function secret() {
  return process.env.SESSION_SECRET || `kmg:${process.env.ADMIN_PASSWORD || ''}:${process.env.FOTKY_PASSWORD || ''}`;
}

function sign(data) {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

function sameText(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

export function passwordsConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Vráti rolu ('admin' | 'fotky') pre zadané heslo, alebo null. */
export function roleForPassword(input) {
  const heslo = String(input || '');
  if (!heslo) return null;
  const admin = process.env.ADMIN_PASSWORD;
  const fotky = process.env.FOTKY_PASSWORD;
  let role = null;
  // Porovnáme vždy obe, aby čas odpovede neprezrádzal, ktoré heslo sedelo.
  const isAdmin = admin ? sameText(heslo, admin) : false;
  const isFotky = fotky ? sameText(heslo, fotky) : false;
  if (isFotky) role = 'fotky';
  if (isAdmin) role = 'admin';
  return role;
}

export function sessionCookie(role) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const data = `${role}.${exp}`;
  return `${COOKIE}=${data}.${sign(data)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function getRole(request) {
  if (!passwordsConfigured()) return null;
  const header = request.headers.get('cookie') || '';
  const match = header.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const value = match.slice(COOKIE.length + 1);
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [role, exp, sig] = parts;
  const expected = sign(`${role}.${exp}`);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  if (role !== 'admin' && role !== 'fotky') return null;
  return role;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function fail(status, chyba) {
  return json({ chyba }, status);
}

/** Ak používateľ nemá jednu z rolí, vráti Response s chybou; inak null. */
export function deny(request, roles) {
  const role = getRole(request);
  if (!role) return fail(401, 'Prihláste sa znova.');
  if (!roles.includes(role)) return fail(403, 'Na toto nemáte oprávnenie.');
  return null;
}
