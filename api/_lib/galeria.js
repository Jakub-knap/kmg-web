// Galéria po zákazkách. Každá zákazka je album s názvom a druhom stavby.
// Úložisko:
//   zakazky/<zid>/<verzia>.json   – názov, druh stavby, dátum (nová verzia pri každej úprave)
//   galeria/<zid>/<fid>.jpg       – fotka
//   nahlady/<zid>/<fid>.jpg       – zmenšenina
// Staršie fotky bez zákazky (galeria/<kategoria>/<fid>.jpg) sa stále zobrazujú.
import { randomUUID } from 'node:crypto';
import { del, listAll, readJson, writeJsonVersion } from './store.js';

export const KATEGORIE = ['strechy', 'chaty', 'pristresky', 'altanky', 'pergoly', 'drevodomy', 'interier'];
export const ZID = /^\d{13}-[a-z0-9]{6,16}$/;
export const FID = /^\d{13}-[a-z0-9]{6,16}$/;
const FOTO = /^(galeria|nahlady)\/(\d{13}-[a-z0-9]+)\/(\d{13}-[a-z0-9]+)\.(?:jpe?g|png|webp)$/i;
const STARA = /^(galeria|nahlady)\/([a-z]+)\/(\d+-[a-z0-9]+)\.(?:jpe?g|png|webp)$/i;

export const noveId = () => `${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
const casZ = (id) => Number(String(id).split('-')[0]) || 0;

export function cistiZakazku(vstup, povodna = {}) {
  const nazov = String(vstup?.nazov ?? povodna.nazov ?? '').trim().slice(0, 120);
  const kategoria = KATEGORIE.includes(vstup?.kategoria) ? vstup.kategoria : povodna.kategoria;
  return { nazov, kategoria };
}

/** Id všetkých zákaziek (podľa uložených údajov), od najnovšej. */
export async function idZakaziek() {
  const ids = new Set();
  for (const b of await listAll('zakazky/')) {
    const zid = b.pathname.split('/')[1];
    if (ZID.test(zid)) ids.add(zid);
  }
  return [...ids].sort((a, b) => casZ(b) - casZ(a));
}

export async function ulozZakazku(zid, data) {
  await writeJsonVersion(`zakazky/${zid}/`, { id: zid, ...data, vytvorene: data.vytvorene || casZ(zid) });
}

export async function nacitajZakazku(zid) {
  const blobs = await listAll(`zakazky/${zid}/`);
  if (!blobs.length) return null;
  const naj = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  return readJson(naj);
}

export async function zmazZakazku(zid) {
  const vsetko = [
    ...(await listAll(`zakazky/${zid}/`)),
    ...(await listAll(`galeria/${zid}/`)),
    ...(await listAll(`nahlady/${zid}/`)),
  ];
  for (let i = 0; i < vsetko.length; i += 500) await del(vsetko.slice(i, i + 500).map((b) => b.url));
  return vsetko.length;
}

/** Zmaže najstaršie zákazky nad limit. Vráti zoznam zmazaných { id, nazov }. */
export async function orezNaLimit(limit) {
  const ids = await idZakaziek();
  const navyse = ids.slice(Math.max(1, limit));
  const zmazane = [];
  for (const zid of navyse) {
    let nazov = '';
    try { nazov = (await nacitajZakazku(zid))?.nazov || ''; } catch { /* aj tak zmažeme */ }
    await zmazZakazku(zid);
    zmazane.push({ id: zid, nazov });
  }
  return zmazane;
}

/** Celá galéria: zákazky s fotkami (od najnovšej) a staršie fotky bez zákazky. */
export async function nacitajGaleriu() {
  const [meta, plne, nahlady] = await Promise.all([listAll('zakazky/'), listAll('galeria/'), listAll('nahlady/')]);
  const najnovsie = new Map();
  for (const b of meta) {
    const zid = b.pathname.split('/')[1];
    if (!ZID.test(zid)) continue;
    const cur = najnovsie.get(zid);
    if (!cur || new Date(b.uploadedAt) > new Date(cur.uploadedAt)) najnovsie.set(zid, b);
  }
  const zakazky = new Map();
  await Promise.all([...najnovsie].map(async ([zid, b]) => {
    try {
      const d = await readJson(b);
      zakazky.set(zid, { id: zid, nazov: d.nazov || 'Zákazka', kategoria: d.kategoria || 'strechy', vytvorene: d.vytvorene || casZ(zid), fotky: [] });
    } catch { /* poškodený súbor preskočíme */ }
  }));

  const nahladPre = new Map();
  for (const b of nahlady) {
    const m = b.pathname.match(FOTO) || b.pathname.match(STARA);
    if (m) nahladPre.set(`${m[2]}/${m[3]}`, b.url);
  }
  const ine = [];
  for (const b of plne) {
    const m = b.pathname.match(FOTO);
    if (m) {
      const id = `${m[2]}/${m[3]}`;
      const f = { id, url: b.url, nahlad: nahladPre.get(id) || b.url, cas: casZ(m[3]) };
      zakazky.get(m[2])?.fotky.push(f);
      continue;
    }
    const s = b.pathname.match(STARA);
    if (s && KATEGORIE.includes(s[2])) {
      const id = `${s[2]}/${s[3]}`;
      ine.push({ id, kategoria: s[2], url: b.url, nahlad: nahladPre.get(id) || b.url, cas: casZ(s[3]) });
    }
  }
  const zoznam = [...zakazky.values()]
    .map((z) => ({ ...z, fotky: z.fotky.sort((a, b) => a.cas - b.cas) }))
    .sort((a, b) => b.vytvorene - a.vytvorene);
  return { zakazky: zoznam, ine: ine.sort((a, b) => b.cas - a.cas) };
}
