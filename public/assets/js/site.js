// KMG stav – načítanie galérie a zväčšovanie fotiek
(() => {
  const NAZVY = {
    strechy: 'Strecha', chaty: 'Chata', pristresky: 'Prístrešok', altanky: 'Altánok',
    pergoly: 'Pergola', drevodomy: 'Drevodom', interier: 'Interiér a pivnice',
  };

  document.querySelectorAll('[data-rok]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  const mriezka = document.querySelector('[data-galeria]');
  const uvodna = document.querySelector('[data-uvodna-foto]');
  const filtre = document.querySelector('[data-filtre]');
  const limit = Number(mriezka?.dataset.pocet) || 0;
  let vsetky = [];
  let zobrazene = [];

  function vykresli(fotky) {
    zobrazene = limit ? fotky.slice(0, limit) : fotky;
    mriezka.replaceChildren();
    if (!zobrazene.length) {
      const p = document.createElement('p');
      p.className = 'prazdne';
      p.textContent = vsetky.length ? 'V tejto kategórii zatiaľ nie sú fotky.' : 'Prvé fotky z realizácií pribudnú čoskoro.';
      mriezka.append(p);
      return;
    }
    zobrazene.forEach((f, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', `${NAZVY[f.kategoria] || 'Fotka'}, zväčšiť`);
      const img = document.createElement('img');
      img.src = f.nahlad;
      img.alt = NAZVY[f.kategoria] || 'Realizácia';
      img.loading = 'lazy';
      img.decoding = 'async';
      const popis = document.createElement('span');
      popis.className = 'popis';
      popis.textContent = NAZVY[f.kategoria] || 'Realizácia';
      btn.append(img, popis);
      btn.addEventListener('click', () => otvor(i));
      mriezka.append(btn);
    });
  }

  async function nacitaj() {
    if (!mriezka) return;
    try {
      const res = await fetch('/api/photos');
      if (!res.ok) throw new Error(res.status);
      vsetky = (await res.json()).fotky || [];
    } catch {
      vsetky = [];
    }
    if (uvodna && vsetky.length) {
      const f = vsetky.find((x) => x.kategoria === 'strechy') || vsetky[0];
      const img = new Image();
      img.alt = '';
      img.src = f.url;
      img.onload = () => uvodna.replaceChildren(img);
    }
    const kat = new URLSearchParams(location.search).get('kategoria') || '';
    if (filtre) nastavFilter(kat);
    else vykresli(vsetky);
  }

  function nastavFilter(kat) {
    filtre.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kategoria === kat)));
    vykresli(kat ? vsetky.filter((f) => f.kategoria === kat) : vsetky);
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

  // Zväčšená fotka
  const lupa = document.querySelector('.lupa');
  const lupaImg = lupa?.querySelector('img');
  const lupaPocet = lupa?.querySelector('[data-lupa-pocet]');
  let index = 0;

  function ukaz() {
    const f = zobrazene[index];
    if (!f) return;
    lupaImg.src = f.url;
    lupaImg.alt = NAZVY[f.kategoria] || 'Realizácia';
    lupaPocet.textContent = `${index + 1} / ${zobrazene.length}`;
  }
  function otvor(i) {
    index = i;
    ukaz();
    if (!lupa.open) lupa.showModal();
  }
  function posun(o) {
    index = (index + o + zobrazene.length) % zobrazene.length;
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
