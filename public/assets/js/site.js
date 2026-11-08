// KMG stav – galéria zákaziek na webe a zväčšovanie fotiek
(() => {
  const NAZVY = {
    strechy: 'Strechy', chaty: 'Chaty', pristresky: 'Prístrešky', altanky: 'Altánky',
    pergoly: 'Pergoly', drevodomy: 'Drevodomy', interier: 'Interiér a pivnice',
  };
  const pocetFotiek = (n) => `${n} ${n === 1 ? 'fotka' : n >= 2 && n <= 4 ? 'fotky' : 'fotiek'}`;
  const IKONA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  document.querySelectorAll('[data-rok]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  const mriezka = document.querySelector('[data-galeria]');
  const filtre = document.querySelector('[data-filtre]');
  const limit = Number(mriezka?.dataset.pocet) || 0;
  let albumy = [];

  function vykresli(zoznam) {
    const zobrazene = limit ? zoznam.slice(0, limit) : zoznam;
    mriezka.replaceChildren();
    if (!zobrazene.length) {
      const p = document.createElement('p');
      p.className = 'prazdne';
      p.textContent = albumy.length ? 'V tejto kategórii zatiaľ nie sú žiadne zákazky.' : 'Prvé fotky z realizácií pribudnú čoskoro.';
      mriezka.append(p);
      return;
    }
    zobrazene.forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'album';
      btn.setAttribute('aria-label', `${a.nazov}, ${pocetFotiek(a.fotky.length)}, otvoriť`);
      const img = document.createElement('img');
      img.src = a.fotky[0].nahlad;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      const popis = document.createElement('span');
      popis.className = 'album__popis';
      const nazov = document.createElement('strong');
      nazov.textContent = a.nazov;
      const druh = document.createElement('small');
      druh.textContent = NAZVY[a.kategoria] === a.nazov ? '' : NAZVY[a.kategoria] || '';
      popis.append(nazov, druh);
      const pocet = document.createElement('span');
      pocet.className = 'album__pocet';
      pocet.innerHTML = `${IKONA}${a.fotky.length}`;
      btn.append(img, popis, pocet);
      btn.addEventListener('click', () => otvor(a, 0));
      mriezka.append(btn);
    });
  }

  async function nacitaj() {
    if (!mriezka) return;
    try {
      const res = await fetch('/api/zakazky');
      if (!res.ok) throw new Error(res.status);
      const d = await res.json();
      const max = d.max || 10;
      albumy = (d.zakazky || []).slice(0, max).filter((z) => z.fotky.length);
      // Staršie fotky bez zákazky – jeden album za každý druh stavby
      const stare = new Map();
      for (const f of d.ine || []) {
        if (!stare.has(f.kategoria)) stare.set(f.kategoria, { id: `stare-${f.kategoria}`, nazov: NAZVY[f.kategoria] || 'Realizácie', kategoria: f.kategoria, fotky: [] });
        stare.get(f.kategoria).fotky.push(f);
      }
      albumy.push(...stare.values());
    } catch {
      albumy = [];
    }
    const kat = new URLSearchParams(location.search).get('kategoria') || '';
    if (filtre) nastavFilter(kat);
    else vykresli(albumy);
  }

  function nastavFilter(kat) {
    filtre.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kategoria === kat)));
    vykresli(kat ? albumy.filter((a) => a.kategoria === kat) : albumy);
  }

  filtre?.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const kat = b.dataset.kategoria;
    nastavFilter(kat);
    const url = new URL(location.href);
    if (kat) url.searchParams.set('kategoria', kat); else url.searchParams.delete('kategoria');
    history.replaceState(null, '', url);
  });

  // Zväčšená fotka – listovanie v rámci zákazky
  const lupa = document.querySelector('.lupa');
  const lupaImg = lupa?.querySelector('img');
  const lupaPocet = lupa?.querySelector('[data-lupa-pocet]');
  let album = null;
  let index = 0;

  function ukaz() {
    const f = album?.fotky[index];
    if (!f) return;
    lupaImg.src = f.url;
    lupaImg.alt = `${album.nazov}, fotka ${index + 1}`;
    lupaPocet.textContent = `${album.nazov} – ${index + 1} / ${album.fotky.length}`;
    const dalsia = album.fotky[(index + 1) % album.fotky.length];
    if (dalsia) new Image().src = dalsia.url;
  }
  function otvor(a, i) {
    album = a;
    index = i;
    ukaz();
    if (!lupa.open) lupa.showModal();
  }
  function posun(o) {
    if (!album) return;
    index = (index + o + album.fotky.length) % album.fotky.length;
    ukaz();
  }
  lupa?.querySelector('[data-lupa-zavriet]').addEventListener('click', () => lupa.close());
  lupa?.querySelector('[data-lupa-spat]').addEventListener('click', () => posun(-1));
  lupa?.querySelector('[data-lupa-dalej]').addEventListener('click', () => posun(1));
  lupa?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') posun(-1);
    if (e.key === 'ArrowRight') posun(1);
  });
  let startX = null;
  lupa?.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  lupa?.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) posun(dx < 0 ? 1 : -1);
    startX = null;
  });

  nacitaj();
})();
