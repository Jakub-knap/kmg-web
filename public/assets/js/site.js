// KMG stav – galéria zákaziek na webe a zväčšovanie fotiek
(() => {
  const NAZVY = {
    strechy: 'Strechy', atiky: 'Atiky', chaty: 'Chaty', pristresky: 'Prístrešky', altanky: 'Altánky',
    pergoly: 'Pergoly', drevodomy: 'Drevodomy', interier: 'Interiér a pivnice',
  };
  const pocetFotiek = (n) => `${n} ${n === 1 ? 'fotka' : n >= 2 && n <= 4 ? 'fotky' : 'fotiek'}`;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const maPredPo = (a) => a.fotky.some((f) => f.oznacenie === 'pred') && a.fotky.some((f) => f.oznacenie === 'po');
  const obalAlbumu = (a) => a.fotky.find((f) => f.oznacenie === 'po') || a.fotky[0];

  // Porovnanie pred a po: posuvná čiara medzi dvoma fotkami
  function porovnanie(kontajner, pred, po, { uvod = true } = {}) {
    kontajner.innerHTML = `
      <div class="porovnanie" style="--x:50%">
        <img class="porovnanie__po" src="${po.url}" alt="Po realizácii" draggable="false">
        <div class="porovnanie__pred"><img src="${pred.url}" alt="Pred realizáciou" draggable="false"></div>
        <div class="porovnanie__ciara" aria-hidden="true"></div>
        <button type="button" class="porovnanie__uchop" role="slider" aria-label="Posunúť porovnanie pred a po" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6 3 12l6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="porovnanie__stitok porovnanie__stitok--pred">Pred</span>
        <span class="porovnanie__stitok porovnanie__stitok--po">Po</span>
      </div>`;
    const el = kontajner.firstElementChild;
    const uchop = el.querySelector('.porovnanie__uchop');
    let x = 50;
    let animacia = null;
    const nastav = (v) => {
      x = Math.min(100, Math.max(0, v));
      el.style.setProperty('--x', `${x}%`);
      uchop.setAttribute('aria-valuenow', Math.round(x));
    };
    const zastav = () => { if (animacia) cancelAnimationFrame(animacia); animacia = null; };
    const naX = (clientX) => {
      const r = el.getBoundingClientRect();
      nastav(((clientX - r.left) / r.width) * 100);
    };
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      zastav();
      start = { x: e.clientX, ide: false };
      el.setPointerCapture(e.pointerId);
      if (e.target.closest('.porovnanie__uchop')) start.ide = true;
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      if (!start.ide && Math.abs(e.clientX - start.x) > 4) start.ide = true;
      if (start.ide) naX(e.clientX);
    });
    el.addEventListener('pointerup', (e) => {
      if (start && !start.ide) naX(e.clientX);
      start = null;
    });
    el.addEventListener('pointercancel', () => { start = null; });
    ['touchstart', 'touchend'].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation(), { passive: true }));
    uchop.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { zastav(); nastav(x - 5); e.preventDefault(); e.stopPropagation(); }
      if (e.key === 'ArrowRight') { zastav(); nastav(x + 5); e.preventDefault(); e.stopPropagation(); }
    });
    if (uvod && !reduce) {
      // Krátka ukážka, že sa čiara dá ťahať
      const krivka = (t) => 50 + Math.sin(t * Math.PI * 2) * 28 * (1 - t);
      const spusti = () => {
        const t0 = performance.now();
        const krok = (now) => {
          const t = Math.min(1, (now - t0) / 2200);
          nastav(krivka(t));
          animacia = t < 1 ? requestAnimationFrame(krok) : null;
        };
        animacia = requestAnimationFrame(krok);
      };
      const pozor = new IntersectionObserver(([z]) => {
        if (!z.isIntersecting) return;
        pozor.disconnect();
        setTimeout(spusti, 300);
      }, { threshold: 0.5 });
      pozor.observe(el);
    }
    return el;
  }

  const IKONA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  document.querySelectorAll('[data-rok]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Údaje o firme zo správy webu (Ponuky → Údaje na ponuke): päta, telefóny, e-mail, Facebook.
  // V HTML ostávajú telefóny a e-mail ako záloha, keby sa údaje nenačítali.
  function telOdkaz(cislo) {
    let c = cislo.replace(/[^\d+]/g, '');
    if (c.startsWith('00')) c = `+${c.slice(2)}`;
    else if (c.startsWith('0')) c = `+421${c.slice(1)}`;
    return `tel:${c}`;
  }
  function nastavCislo(el, text) {
    const teraz = el.getAttribute('aria-label') || el.textContent.replace(/\s+/g, ' ').trim();
    if (teraz === text) return;
    if (el.querySelector('.cislica')) {
      // číslo už rozdelené na číslice (animácia na úvodnej stránke)
      el.setAttribute('aria-label', text);
      el.replaceChildren(...[...text].map((c, i) => {
        if (c === ' ') return document.createTextNode(' ');
        const s = document.createElement('span');
        s.className = 'cislica';
        s.style.setProperty('--i', i);
        s.setAttribute('aria-hidden', 'true');
        s.textContent = c;
        return s;
      }));
    } else {
      el.textContent = text;
    }
  }
  function vyplnFirmu(f) {
    const tel = Array.isArray(f.telefony) ? f.telefony : [];
    if (tel.length) {
      const zoznam = document.querySelector('[data-telefony]');
      if (zoznam) {
        const vzor = zoznam.querySelector('[data-tel]');
        for (let i = zoznam.querySelectorAll('[data-tel]').length; i < tel.length && vzor; i++) {
          const novy = vzor.cloneNode(false);
          novy.dataset.tel = String(i);
          novy.removeAttribute('aria-label');
          zoznam.append(novy);
        }
      }
      document.querySelectorAll('[data-tel]').forEach((el) => {
        const cislo = tel[Number(el.dataset.tel)];
        if (!cislo) { el.hidden = true; return; }
        el.hidden = false;
        el.href = telOdkaz(cislo);
        const miesto = el.hasAttribute('data-tel-cislo') ? el : el.querySelector('[data-tel-cislo]');
        if (miesto) nastavCislo(miesto, cislo);
        if (el.hasAttribute('data-tel-label')) el.setAttribute('aria-label', `Zavolať ${cislo}`);
      });
    }
    if (f.email) {
      document.querySelectorAll('[data-email]').forEach((el) => {
        if (el.hasAttribute('data-kopiruj')) el.dataset.kopiruj = f.email;
        else el.href = `mailto:${f.email}`;
        if (el.hasAttribute('data-email-text')) el.textContent = f.email;
      });
    }
    if (f.facebook) {
      document.querySelectorAll('[data-facebook]').forEach((el) => { el.href = f.facebook; });
    }
    document.querySelectorAll('[data-firma-nazov]').forEach((el) => { if (f.nazov) el.textContent = f.nazov; });
    const ids = [
      f.ico && `IČO: ${f.ico}`,
      f.dic && `DIČ: ${f.dic}`,
      f.icdph && `IČ DPH: ${f.icdph}`,
    ].filter(Boolean).join(', ');
    document.querySelectorAll('[data-firma-udaje]').forEach((el) => {
      el.replaceChildren(...[f.adresa, ids].filter(Boolean).map((riadok) => {
        const p = document.createElement('p');
        p.textContent = riadok;
        return p;
      }));
    });
  }
  if (document.querySelector('[data-firma-udaje], [data-tel], [data-email]')) {
    fetch('/api/firma', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => { if (f) vyplnFirmu(f); })
      .catch(() => {});
  }

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
      img.src = obalAlbumu(a).nahlad;
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
      if (maPredPo(a)) {
        const pp = document.createElement('span');
        pp.className = 'album__predpo';
        pp.textContent = 'Pred a po';
        btn.append(pp);
      }
      btn.addEventListener('click', () => otvor(a, 0));
      mriezka.append(btn);
    });
  }

  async function nacitaj() {
    if (!mriezka) return;
    try {
      const res = await fetch('/api/zakazky', { cache: 'no-cache' });
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
    sekciaPredPo();
  }

  // Úvodná stránka: sekcia Pred a po
  function sekciaPredPo() {
    const sekcia = document.querySelector('[data-predpo-sekcia]');
    if (!sekcia) return;
    const s = albumy.filter(maPredPo).slice(0, 4);
    if (!s.length) return;
    const box = sekcia.querySelector('[data-predpo]');
    const nazov = sekcia.querySelector('[data-predpo-nazov]');
    const dalsie = sekcia.querySelector('[data-predpo-dalsie]');
    const ukazAlbum = (a, uvod) => {
      porovnanie(box, a.fotky.find((f) => f.oznacenie === 'pred'), a.fotky.find((f) => f.oznacenie === 'po'), { uvod });
      nazov.textContent = `${a.nazov}${NAZVY[a.kategoria] ? `, ${NAZVY[a.kategoria].toLowerCase()}` : ''}`;
      dalsie.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === a.id)));
    };
    if (s.length > 1) {
      s.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.id = a.id;
        b.textContent = a.nazov;
        b.addEventListener('click', () => ukazAlbum(a, false));
        dalsie.append(b);
      });
    }
    sekcia.hidden = false;
    ukazAlbum(s[0], true);
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

  // Zväčšená fotka – listovanie v rámci zákazky (pri pred a po najprv porovnanie)
  const lupa = document.querySelector('.lupa');
  const lupaFoto = lupa?.querySelector('.lupa__foto');
  const lupaImg = lupa?.querySelector('img');
  const lupaPocet = lupa?.querySelector('[data-lupa-pocet]');
  const porovnanieBox = document.createElement('div');
  porovnanieBox.className = 'lupa__porovnanie';
  porovnanieBox.hidden = true;
  const stitok = document.createElement('span');
  stitok.className = 'lupa__stitok';
  stitok.hidden = true;
  lupaFoto?.append(porovnanieBox, stitok);
  let album = null;
  let snimky = [];
  let index = 0;

  function ukaz() {
    const sn = snimky[index];
    if (!sn) return;
    if (sn === 'porovnanie') {
      lupaImg.hidden = true;
      stitok.hidden = true;
      porovnanieBox.hidden = false;
      porovnanie(porovnanieBox, album.fotky.find((f) => f.oznacenie === 'pred'), album.fotky.find((f) => f.oznacenie === 'po'));
      lupaPocet.textContent = `${album.nazov} – porovnanie pred a po`;
      return;
    }
    porovnanieBox.hidden = true;
    porovnanieBox.replaceChildren();
    lupaImg.hidden = false;
    lupaImg.src = sn.url;
    const poradie = album.fotky.indexOf(sn);
    lupaImg.alt = `${album.nazov}, fotka ${poradie + 1}`;
    stitok.hidden = !sn.oznacenie;
    stitok.dataset.ozn = sn.oznacenie || '';
    stitok.textContent = sn.oznacenie === 'pred' ? 'Pred realizáciou' : sn.oznacenie === 'po' ? 'Po realizácii' : '';
    lupaPocet.textContent = `${album.nazov} – ${poradie + 1} / ${album.fotky.length}`;
    const dalsia = snimky[(index + 1) % snimky.length];
    if (dalsia && dalsia !== 'porovnanie') new Image().src = dalsia.url;
  }
  function otvor(a, i) {
    album = a;
    snimky = maPredPo(a) ? ['porovnanie', ...a.fotky] : a.fotky;
    index = i;
    ukaz();
    if (!lupa.open) lupa.showModal();
  }
  function posun(o) {
    if (!album) return;
    index = (index + o + snimky.length) % snimky.length;
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
