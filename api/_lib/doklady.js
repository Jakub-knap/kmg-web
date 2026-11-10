// Zoznamy ponúk a faktúr z výpisu úložiska.
// Volá sa s výpisom, ktorý už volajúci má – aplikácia pri otvorení vypíše úložisko len raz.
import { newest, readJson } from './store.js';

export const ROOT_PONUKY = 'ponuky/';
export const ROOT_FAKTURY = 'faktury/';
export const ID_PONUKY = /^\d{4}-\d{3,4}$/;
export const ID_FAKTURY = /^\d{7,8}$/;

function podlaId(blobs, root, vzor) {
  const map = new Map();
  for (const b of blobs) {
    if (!b.pathname.startsWith(root)) continue;
    const id = b.pathname.slice(root.length).split('/')[0];
    if (!vzor.test(id)) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(b);
  }
  return map;
}

/** Ponuky zoskupené podľa čísla: Map<'2026-001', blob[]> */
export const ponukyPodlaCisla = (blobs) => podlaId(blobs, ROOT_PONUKY, ID_PONUKY);
/** Faktúry zoskupené podľa čísla: Map<'2026001', blob[]> */
export const fakturyPodlaCisla = (blobs) => podlaId(blobs, ROOT_FAKTURY, ID_FAKTURY);

export const suhrnFaktury = (f) => ({
  id: f.id,
  ponuka: f.ponuka || '',
  odberatel: f.odberatel?.meno || '',
  predmet: f.predmet || '',
  datumVystavenia: f.datumVystavenia,
  datumSplatnosti: f.datumSplatnosti,
  spolu: f.sucty?.spolu ?? 0,
  zaplatena: Boolean(f.zaplatena),
  datumZaplatenia: f.datumZaplatenia || '',
});

const suhrnPonuky = (p) => ({
  id: p.id,
  datum: p.datum,
  stav: p.stav,
  zakaznik: p.zakaznik?.meno || '',
  predmet: p.predmet || '',
  spolu: p.sucty?.spolu ?? 0,
  upravene: p.upravene,
});

async function zoznam(skupiny, suhrn) {
  const vysledok = await Promise.all(
    [...skupiny.values()].map(async (blobs) => {
      try {
        return suhrn(await readJson(newest(blobs)));
      } catch {
        return null;
      }
    }),
  );
  return vysledok.filter(Boolean).sort((a, b) => b.id.localeCompare(a.id));
}

export const zoznamPonuk = (blobs) => zoznam(ponukyPodlaCisla(blobs), suhrnPonuky);
export const zoznamFaktur = (blobs) => zoznam(fakturyPodlaCisla(blobs), suhrnFaktury);
