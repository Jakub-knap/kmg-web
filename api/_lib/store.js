// Pomocné funkcie nad Vercel Blob úložiskom.
import { list, put, del } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export async function listAll(prefix) {
  const blobs = [];
  let cursor;
  do {
    const res = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...res.blobs);
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return blobs;
}

export function newest(blobs) {
  return [...blobs].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
}

export async function readJson(blob) {
  const res = await fetch(blob.url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Súbor sa nepodarilo načítať (${res.status})`);
  return res.json();
}

/** Súbory s daným začiatkom cesty z hotového výpisu – bez ďalšej operácie úložiska. */
export const vPriecinku = (vsetky, prefix) => vsetky.filter((b) => b.pathname.startsWith(prefix));

/** Výpis po zápise: staré verzie preč, nová pridaná. Ušetrí ďalší výpis (list = platená operácia). */
export function poZapise(vsetky, stare = [], ulozeny = null) {
  const prec = new Set(stare.map((b) => b.url));
  const out = vsetky.filter((b) => !prec.has(b.url));
  if (ulozeny) out.push({ url: ulozeny.url, pathname: ulozeny.pathname, uploadedAt: new Date().toISOString() });
  return out;
}

/**
 * Uloží JSON do priečinka ako novú verziu s náhodným menom a staré verzie zmaže.
 * Každá verzia má vlastnú adresu, takže sa nikdy nenačíta stará kópia z cache.
 * `stare` = staré verzie z hotového výpisu (ušetrí operáciu list).
 */
export async function writeJsonVersion(folder, data, stare) {
  const old = stare ?? (await listAll(folder));
  const saved = await put(`${folder}${Date.now()}-${randomUUID()}.json`, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  const stale = old.map((b) => b.url).filter((u) => u !== saved.url);
  if (stale.length) await del(stale);
  return saved;
}

export async function removeFolder(folder) {
  const blobs = await listAll(folder);
  if (blobs.length) await del(blobs.map((b) => b.url));
  return blobs.length;
}

export { put, del };
