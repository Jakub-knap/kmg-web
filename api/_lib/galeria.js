// Galéria po zákazkách. Každá zákazka je album s názvom a druhom stavby.
// Úložisko:
//   zakazky/<zid>/<verzia>.json   – názov, druh stavby, dátum (nová verzia pri každej úprave)
//   galeria/<zid>/<fid>.jpg       – fotka
//   nahlady/<zid>/<fid>.jpg       – zmenšenina
// Staršie fotky bez zákazky (galeria/<kategoria>/<fid>.jpg) sa stále zobrazujú.
import { randomUUID } from 'node:crypto';
import { del, listAll, newest, poZapise, readJson, vPriecinku, writeJsonVersion } from './store.js';

export const KATEGORIE = ['strechy', 'atiky', 'chaty', 'pristresky', 'altanky', 'pergoly', 'drevodomy', 'interier'];
export const OZNACENIA = ['pred', 'po']; // voliteľné označenie fotky: pred realizáciou / po realizácii
const PORADIE = { pred: 0, po: 2 };
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

// Funkcie nižšie dostávajú hotový výpis úložiska (`vsetky`) a vracajú ho upravený po zmene.
// Výpis (list) je platená „pokročilá operácia“ – každá akcia v aplikácii ho tak robí najviac raz.

/** Id všetkých zákaziek (podľa uložených údajov), od najnovšej. */
export function idZakaziek(vsetky) {
  const ids = new Set();
  for (const b of vPriecinku(vsetky, 'zakazky/')) {
    const zid = b.pathname.split('/')[1];
    if (ZID.test(zid)) ids.add(zid);
  }
  return [...ids].sort((a, b) => casZ(b) - casZ(a));
}

/** Uložené údaje zákazky { stare: verzie v úložisku, data } alebo null, ak zákazka nie je. */
export async function metaZakazky(zid, vsetky) {
  const stare = vPriecinku(vsetky, `zakazky/${zid}/`);
  if (!stare.length) return null;
  return { stare, data: await readJson(newest(stare)) };
}

/** Uloží údaje zákazky ako novú verziu. Vráti výpis po zápise. */
export async function ulozZakazku(zid, data, vsetky) {
  const stare = vPriecinku(vsetky, `zakazky/${zid}/`);
  const ulozeny = await writeJsonVersion(`zakazky/${zid}/`, { id: zid, ...data, vytvorene: data.vytvorene || casZ(zid) }, stare);
  return poZapise(vsetky, stare, ulozeny);
}

/**
 * Nastaví alebo zruší označenia fotiek naraz: { <fid>: 'pred' | 'po' | '' }.
 * Vráti { oznacenia, vsetky } alebo null, ak zákazka neexistuje.
 */
export async function nastavOznacenia(zid, zmeny, vsetky) {
  const m = await metaZakazky(zid, vsetky);
  if (!m) return null;
  const oznacenia = { ...(m.data.oznacenia || {}) };
  for (const [fid, hodnota] of Object.entries(zmeny || {})) {
    if (!FID.test(fid)) continue;
    if (OZNACENIA.includes(hodnota)) oznacenia[fid] = hodnota;
    else delete oznacenia[fid];
  }
  return { oznacenia, vsetky: await ulozZakazku(zid, { ...m.data, oznacenia }, vsetky) };
}

/** Zmaže zákazku aj s fotkami (mazanie je zadarmo). Vráti { pocet, vsetky }. */
export async function zmazZakazku(zid, vsetky) {
  const vsetko = [
    ...vPriecinku(vsetky, `zakazky/${zid}/`),
    ...vPriecinku(vsetky, `galeria/${zid}/`),
    ...vPriecinku(vsetky, `nahlady/${zid}/`),
  ];
  for (let i = 0; i < vsetko.length; i += 500) await del(vsetko.slice(i, i + 500).map((b) => b.url));
  return { pocet: vsetko.length, vsetky: poZapise(vsetky, vsetko) };
}

/** Zmaže najstaršie zákazky nad limit. Vráti { zmazane: [{ id, nazov }], vsetky }. */
export async function orezNaLimit(limit, vsetky) {
  const navyse = idZakaziek(vsetky).slice(Math.max(1, limit));
  const zmazane = [];
  let zvysok = vsetky;
  for (const zid of navyse) {
    let nazov = '';
    try { nazov = (await metaZakazky(zid, zvysok))?.data?.nazov || ''; } catch { /* aj tak zmažeme */ }
    zvysok = (await zmazZakazku(zid, zvysok)).vsetky;
    zmazane.push({ id: zid, nazov });
  }
  return { zmazane, vsetky: zvysok };
}

/**
 * Celá galéria: zákazky s fotkami (od najnovšej) a staršie fotky bez zákazky.
 * `vsetky` = hotový výpis celého úložiska (ušetrí operácie list); bez neho sa vypíšu priečinky zvlášť.
 */
export async function nacitajGaleriu(vsetky) {
  const vypis = (prefix) => (vsetky ? vPriecinku(vsetky, prefix) : listAll(prefix));
  const [meta, plne, nahlady] = await Promise.all([vypis('zakazky/'), vypis('galeria/'), vypis('nahlady/')]);
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
      zakazky.set(zid, { id: zid, nazov: d.nazov || 'Zákazka', kategoria: d.kategoria || 'strechy', vytvorene: d.vytvorene || casZ(zid), oznacenia: d.oznacenia || {}, fotky: [] });
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
      const z = zakazky.get(m[2]);
      if (!z) continue;
      const oz = z.oznacenia[m[3]];
      z.fotky.push({ id, url: b.url, nahlad: nahladPre.get(id) || b.url, cas: casZ(m[3]), ...(OZNACENIA.includes(oz) ? { oznacenie: oz } : {}) });
      continue;
    }
    const s = b.pathname.match(STARA);
    if (s && KATEGORIE.includes(s[2])) {
      const id = `${s[2]}/${s[3]}`;
      ine.push({ id, kategoria: s[2], url: b.url, nahlad: nahladPre.get(id) || b.url, cas: casZ(s[3]) });
    }
  }
  const zoznam = [...zakazky.values()]
    // poradie: pred realizáciou, bez označenia, po realizácii; v rámci skupiny podľa času
    .map(({ oznacenia, ...z }) => ({ ...z, fotky: z.fotky.sort((a, b) => (PORADIE[a.oznacenie] ?? 1) - (PORADIE[b.oznacenie] ?? 1) || a.cas - b.cas) }))
    .sort((a, b) => b.vytvorene - a.vytvorene);
  return { zakazky: zoznam, ine: ine.sort((a, b) => b.cas - a.cas) };
}
