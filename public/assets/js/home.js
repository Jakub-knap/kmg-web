// KMG stav – živá úvodná stránka
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mys = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - (1 - t) ** 3;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const ulohy = new Set(); // funkcie volané každý snímok

  // ---------- Rozdelenie nadpisov na písmená ----------
  function rozdel(el) {
    let i = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const uzly = [];
    while (walker.nextNode()) uzly.push(walker.currentNode);
    for (const uzol of uzly) {
      const frag = document.createDocumentFragment();
      uzol.textContent.split(/(\s+)/).forEach((cast) => {
        if (!cast) return;
        if (/^\s+$/.test(cast)) { frag.append(document.createTextNode(' ')); return; }
        const slovo = document.createElement('span');
        slovo.className = 'slovo';
        for (const ch of cast) {
          const p = document.createElement('span');
          p.className = 'pismeno';
          p.style.setProperty('--i', i++);
          p.textContent = ch;
          slovo.append(p);
        }
        frag.append(slovo);
      });
      uzol.replaceWith(frag);
    }
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  }
  if (!reduce) $$('[data-rozdel]').forEach(rozdel);

  // Čísla telefónov – každá číslica zvlášť
  $$('[data-cislice]').forEach((a) => {
    const text = a.textContent;
    a.setAttribute('aria-label', text);
    a.innerHTML = [...text].map((c, i) => (c === ' ' ? ' ' : `<span class="cislica" style="--i:${i}" aria-hidden="true">${c}</span>`)).join('');
  });

  // ---------- Odhaľovanie pri posúvaní ----------
  const pozorovatel = new IntersectionObserver((zaznamy) => {
    for (const z of zaznamy) {
      if (!z.isIntersecting) continue;
      z.target.classList.add('viditelne');
      if (z.target.matches('[data-karta]') && !mys) setTimeout(() => z.target.classList.add('zije'), 1200);
      pozorovatel.unobserve(z.target);
    }
  }, { threshold: 0.18, rootMargin: '0px 0px -5% 0px' });
  $$('[data-odhal], [data-rozdel]:not(.hero h1), [data-karta]').forEach((el) => pozorovatel.observe(el));
  $$('[data-karta]').forEach((k, i) => k.style.setProperty('--d', `${(i % 3) * 90}ms`));

  // ---------- Hlavička, priebeh, plávajúce tlačidlo ----------
  const hlavicka = $('.hlavicka');
  const hero = $('[data-hero]');
  const fab = $('[data-fab]');
  const kontakt = $('[data-kontakt]');
  let poslednyY = scrollY;
  let rychlost = 0;
  let kontaktViditelny = false;
  new IntersectionObserver(([z]) => { kontaktViditelny = z.isIntersecting; }, { threshold: 0.25 }).observe(kontakt);

  function priPosune() {
    const y = scrollY;
    const delta = y - poslednyY;
    rychlost = clamp(rychlost + delta * 0.6, -60, 60);
    const plna = y > hero.offsetHeight - 80;
    hlavicka.classList.toggle('plna', plna);
    hlavicka.classList.toggle('tmava', !plna && y > 10);
    if (Math.abs(delta) > 4) hlavicka.classList.toggle('skryta', delta > 0 && y > 500);
    const max = document.documentElement.scrollHeight - innerHeight;
    hlavicka.style.setProperty('--postup', max > 0 ? (y / max).toFixed(4) : 0);
    hero.style.setProperty('--hero-posun', clamp(y / hero.offsetHeight, 0, 1).toFixed(3));
    fab.classList.toggle('viditelny', y > hero.offsetHeight * 0.7 && !kontaktViditelny);
    casovaOs();
    poslednyY = y;
  }
  addEventListener('scroll', priPosune, { passive: true });

  // ---------- Bežiaci pás ----------
  const pas = $('[data-pas]');
  if (pas) {
    pas.innerHTML += pas.innerHTML; // zdvojený obsah pre nekonečný beh
    let x = 0;
    let smer = -1;
    ulohy.add(() => {
      if (Math.abs(rychlost) > 0.5) smer = rychlost > 0 ? -1 : 1;
      const v = (reduce ? 0 : 0.7) + Math.abs(rychlost) * 0.22;
      const pol = pas.scrollWidth / 2;
      x += smer * v;
      if (x <= -pol) x += pol;
      if (x > 0) x -= pol;
      const skos = reduce ? 0 : clamp(-rychlost * 0.25, -12, 12);
      pas.style.transform = `translate3d(${x}px,0,0) skewX(${skos}deg)`;
      rychlost *= 0.9;
    });
  }

  // ---------- Časová os ----------
  const kroky = $('[data-kroky]');
  function casovaOs() {
    if (!kroky) return;
    const r = kroky.getBoundingClientRect();
    const p = clamp((innerHeight * 0.62 - r.top) / r.height, 0, 1);
    kroky.style.setProperty('--plnenie', p.toFixed(3));
    $$('li', kroky).forEach((li) => {
      const lr = li.getBoundingClientRect();
      li.classList.toggle('aktivny', lr.top < innerHeight * 0.66);
    });
  }

  // ---------- Karty služieb: náklon a svetlo ----------
  if (mys && !reduce) {
    $$('[data-karta]').forEach((k) => {
      k.addEventListener('pointermove', (e) => {
        const r = k.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        k.style.setProperty('--mx', `${x * 100}%`);
        k.style.setProperty('--my', `${y * 100}%`);
        k.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
        k.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
      });
      k.addEventListener('pointerleave', () => {
        k.style.setProperty('--rx', '0deg');
        k.style.setProperty('--ry', '0deg');
      });
    });
  }

  // Sneh v zimnej karte
  const sneh = $('[data-sneh]');
  if (sneh && !reduce) {
    for (let i = 0; i < 26; i += 1) {
      const v = document.createElement('i');
      v.style.left = `${Math.random() * 100}%`;
      v.style.setProperty('--v', `${2 + Math.random() * 4}px`);
      v.style.setProperty('--t', `${5 + Math.random() * 6}s`);
      v.style.setProperty('--o', `${-Math.random() * 10}s`);
      v.style.setProperty('--x', `${-20 + Math.random() * 50}px`);
      sneh.append(v);
    }
  }

  // ---------- Tlačidlá: vlnka a magnet ----------
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.tlacidlo, .typy button');
    if (!t || reduce) return;
    const r = t.getBoundingClientRect();
    const s = Math.max(r.width, r.height);
    const v = document.createElement('span');
    v.className = 'vlna';
    v.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    if (getComputedStyle(t).overflow !== 'hidden') t.style.overflow = 'hidden';
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
    t.append(v);
    setTimeout(() => v.remove(), 700);
  });
  if (mys && !reduce) {
    $$('[data-magnet]').forEach((m) => {
      m.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        m.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
      });
      m.addEventListener('pointerleave', () => { m.style.transform = ''; });
    });
  }

  // Kopírovanie e-mailu
  $$('[data-kopiruj]').forEach((b) => {
    b.addEventListener('click', async () => {
      const povodny = b.textContent;
      try {
        await navigator.clipboard.writeText(b.dataset.kopiruj);
        b.textContent = 'Skopírované';
      } catch {
        b.textContent = b.dataset.kopiruj;
      }
      setTimeout(() => { b.textContent = povodny; }, 2000);
    });
  });

  // ---------- Kurzor ----------
  const kurzor = { x: -100, y: -100, rx: -100, ry: -100 };
  if (mys && !reduce) {
    const kruh = document.createElement('div');
    const bod = document.createElement('div');
    kruh.className = 'kurzor';
    bod.className = 'kurzor-bod';
    document.body.append(kruh, bod);
    document.body.classList.add('ma-kurzor');
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      kurzor.x = e.clientX;
      kurzor.y = e.clientY;
      kruh.classList.add('aktivny');
      bod.classList.add('aktivny');
    });
    document.addEventListener('pointerleave', () => { kruh.classList.remove('aktivny'); bod.classList.remove('aktivny'); });
    document.addEventListener('pointerover', (e) => {
      const nad = e.target.closest('a, button, [data-karta]');
      const uchop = e.target.closest('[data-uchop]');
      kruh.classList.toggle('nad', Boolean(nad) && !uchop);
      kruh.classList.toggle('tahaj', Boolean(uchop));
      kruh.textContent = uchop ? 'Ťahaj' : '';
    });
    ulohy.add(() => {
      kurzor.rx = lerp(kurzor.rx, kurzor.x, 0.2);
      kurzor.ry = lerp(kurzor.ry, kurzor.y, 0.2);
      kruh.style.transform = `translate3d(${kurzor.rx}px,${kurzor.ry}px,0)`;
      bod.style.transform = `translate3d(${kurzor.x}px,${kurzor.y}px,0)`;
    });
  }

  // ---------- Interaktívny dom ----------
  function dom() {
    const box = $('[data-dom]');
    if (!box) return;
    const svg = $('svg', box);
    const scena = $('.dom__scena', box);
    const B = 300;
    const XL = 95;
    const XR = 505;
    const M = 40; // px na meter
    const TYPY = {
      sedlova: { h: 170, min: 70, max: 235, body: (h) => [[XL, B], [300, B - h], [300, B - h], [XR, B]] },
      valbova: { h: 130, min: 55, max: 200, body: (h) => [[XL, B], [215, B - h], [385, B - h], [XR, B]] },
      pultova: { h: 150, min: 70, max: 225, body: (h) => [[XL, B], [XL, B - 34], [XR, B - h], [XR, B]] },
      plocha: { h: 30, min: 22, max: 48, body: (h) => [[XL, B], [XL, B - h], [XR, B - h], [XR, B]] },
    };
    const st = { typ: 'sedlova', h: 170, pts: TYPY.sedlova.body(170), stavba: reduce ? 1 : 0, start: null, morf: null, tahane: false, napoveda: true };

    const el = {
      orez: $('[data-orez]', svg), obrys: $('[data-obrys]', svg), krov: $('[data-krov]', svg), vaznik: $('[data-vaznik]', svg),
      skridly: $('[data-skridly]', svg), hreben: $('[data-hreben]', svg), koty: $('[data-koty]', svg),
      kSirka: $('[data-kota-sirka]', svg), kSirkaT: $('[data-kota-sirka-text]', svg), kVyska: $('[data-kota-vyska]', svg),
      kVyskaT: $('[data-kota-vyska-text]', svg), sklon: $('[data-sklon]', svg), uchop: $('[data-uchop]', svg), napoveda: $('[data-napoveda]', svg),
    };
    const fazy = { zem: $$('[data-faza="zem"]', svg), steny: $$('[data-faza="steny"]', svg), okna: $$('[data-faza="okna"]', svg) };

    const najvyssi = (p) => {
      const minY = Math.min(...p.map((q) => q[1]));
      const vrch = p.filter((q) => Math.abs(q[1] - minY) < 0.5);
      return [vrch.reduce((s, q) => s + q[0], 0) / vrch.length, minY];
    };
    const prieniky = (p, y) => {
      const xs = [];
      for (let i = 0; i < 3; i += 1) {
        const [x1, y1] = p[i];
        const [x2, y2] = p[i + 1];
        if (y1 !== y2 && (y - y1) * (y - y2) <= 0) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
      return xs;
    };
    const vrchPri = (p, x) => {
      for (let i = 0; i < 3; i += 1) {
        const [x1, y1] = p[i];
        const [x2, y2] = p[i + 1];
        if (x1 !== x2 && x >= Math.min(x1, x2) && x <= Math.max(x1, x2)) return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
      }
      return null;
    };
    const prienik = (s1, s2) => {
      const den = s1.u[0] * s2.u[1] - s1.u[1] * s2.u[0];
      if (Math.abs(den) < 1e-6) return null;
      const t = ((s2.a[0] - s1.a[0]) * s2.u[1] - (s2.a[1] - s1.a[1]) * s2.u[0]) / den;
      return [s1.a[0] + s1.u[0] * t, s1.a[1] + s1.u[1] * t];
    };
    function hrebenBody(p, d = 17, ext = 30) {
      const pts = p.filter((q, i) => i === 0 || Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) > 0.5);
      let segs = [];
      for (let i = 0; i < pts.length - 1; i += 1) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        const L = Math.hypot(bx - ax, by - ay);
        const u = [(bx - ax) / L, (by - ay) / L];
        const n = [u[1], -u[0]];
        segs.push({ a: [ax + n[0] * d, ay + n[1] * d], b: [bx + n[0] * d, by + n[1] * d], u });
      }
      const zvisla = (s) => Math.abs(s.u[0]) < 0.2;
      while (segs.length > 1 && zvisla(segs[0])) segs = segs.slice(1);
      while (segs.length > 1 && zvisla(segs.at(-1))) segs = segs.slice(0, -1);
      const prvy = segs[0];
      const posl = segs.at(-1);
      const out = [[prvy.a[0] - prvy.u[0] * ext, prvy.a[1] - prvy.u[1] * ext]];
      for (let i = 0; i < segs.length - 1; i += 1) out.push(prienik(segs[i], segs[i + 1]) || segs[i].b);
      out.push([posl.b[0] + posl.u[0] * ext, posl.b[1] + posl.u[1] * ext]);
      return out;
    }
    const m = (px) => (px / M).toFixed(1).replace('.', ',');

    function vykresli() {
      const p = st.pts;
      const roof = `M${p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z`;
      el.orez.setAttribute('d', roof);
      el.obrys.setAttribute('d', roof);
      el.krov.setAttribute('d', roof);
      const [hx, topY] = najvyssi(p);
      const H = B - topY;

      // Väzník: hambálok a stĺpiky
      let v = '';
      if (H > 50) {
        const yc = B - H * 0.48;
        const xs = prieniky(p, yc);
        if (xs.length >= 2) v += `M${Math.min(...xs) + 4} ${yc}H${Math.max(...xs) - 4}`;
      }
      for (const x of [200, 300, 400]) {
        const y = vrchPri(p, x);
        if (y !== null && B - y > 24) v += `M${x} ${B}V${y + 3}`;
      }
      el.vaznik.setAttribute('d', v || 'M0 0');

      // Fázy stavby
      const b = st.stavba;
      const f = (a, z) => ease(clamp((b - a) / (z - a), 0, 1));
      fazy.zem.forEach((e) => { e.style.strokeDashoffset = 1 - f(0, 0.14); });
      fazy.steny.forEach((e) => { e.style.strokeDashoffset = 1 - f(0.04, 0.3); });
      fazy.okna.forEach((e) => { e.style.strokeDashoffset = 1 - f(0.2, 0.42); });
      el.krov.style.strokeDashoffset = 1 - f(0.3, 0.52);
      el.vaznik.style.strokeDashoffset = 1 - f(0.4, 0.6);
      const sk = f(0.55, 0.82);
      const odkryte = sk >= 1 ? H + 20 : Math.floor((sk * (H + 20)) / 14) * 14;
      el.skridly.setAttribute('y', (B - odkryte).toFixed(1));
      el.skridly.setAttribute('height', Math.max(0, odkryte + 4).toFixed(1));
      el.obrys.style.opacity = f(0.55, 0.7);
      el.hreben.setAttribute('points', hrebenBody(p).map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' '));
      el.hreben.style.strokeDashoffset = 1 - f(0.8, 0.94);
      el.koty.style.opacity = f(0.9, 1);

      // Kóty
      el.kSirka.setAttribute('d', `M${XL} 494V510M${XL} 502H${XR}M${XR} 494V510`);
      el.kSirkaT.setAttribute('x', 300);
      el.kSirkaT.setAttribute('y', 530);
      el.kSirkaT.textContent = `${m(XR - XL)} m`;
      el.kVyska.setAttribute('d', `M550 ${B}H574M562 ${B}V${topY}M550 ${topY}H574`);
      el.kVyskaT.setAttribute('transform', `translate(588 ${(B + topY) / 2}) rotate(-90)`);
      el.kVyskaT.textContent = `${m(H)} m`;

      // Sklon
      let naj = null;
      for (let i = 0; i < 3; i += 1) {
        const [x1, y1] = p[i];
        const [x2, y2] = p[i + 1];
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (Math.abs(dx) > 1 && Math.abs(dy) > 1 && (!naj || Math.hypot(dx, dy) > naj.L)) naj = { x1, y1, x2, y2, dx, dy, L: Math.hypot(dx, dy) };
      }
      if (naj) {
        const uhol = Math.atan(Math.abs(naj.dy) / Math.abs(naj.dx));
        const mx = (naj.x1 + naj.x2) / 2;
        const my = (naj.y1 + naj.y2) / 2;
        const ux = naj.dx / naj.L;
        const uy = naj.dy / naj.L;
        const rot = (Math.atan2(naj.dy, naj.dx) * 180) / Math.PI;
        el.sklon.setAttribute('transform', `translate(${mx + uy * 48} ${my - ux * 48}) rotate(${rot > 90 || rot < -90 ? rot + 180 : rot})`);
        el.sklon.textContent = `sklon ${Math.round((uhol * 180) / Math.PI)}°`;
      } else {
        el.sklon.setAttribute('transform', `translate(300 ${topY - 44})`);
        el.sklon.textContent = 'sklon do 5°';
      }

      // Úchop
      el.uchop.setAttribute('transform', `translate(${hx} ${topY})`);
      el.uchop.style.opacity = f(0.92, 1);
      const t = TYPY[st.typ];
      el.uchop.setAttribute('aria-valuenow', Math.round(((st.h - t.min) / (t.max - t.min)) * 100));
      el.uchop.setAttribute('aria-valuetext', `Výška strechy ${m(H)} metra`);
      const vNapovede = Math.min(Math.max(hx, 90), 510);
      el.napoveda.setAttribute('transform', `translate(${vNapovede} ${topY})`);
      el.napoveda.style.opacity = st.napoveda && b >= 1 ? 1 : 0;
    }

    function nastavH(h) {
      const t = TYPY[st.typ];
      st.h = clamp(h, t.min, t.max);
      t.h = st.h;
      st.pts = t.body(st.h);
      st.napoveda = false;
      vykresli();
    }

    function zmenTyp(typ) {
      if (typ === st.typ && !st.morf) return;
      const od = st.pts.map((q) => [...q]);
      const ciel = TYPY[typ].body(TYPY[typ].h);
      st.typ = typ;
      st.h = TYPY[typ].h;
      st.napoveda = false;
      $$('[data-typ]', box).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.typ === typ)));
      if (reduce) { st.pts = ciel; vykresli(); return; }
      st.morf = { od, ciel, start: performance.now() };
    }
    $('[data-typy]', box).addEventListener('click', (e) => {
      const b = e.target.closest('[data-typ]');
      if (b) zmenTyp(b.dataset.typ);
    });

    // Ťahanie hrebeňa
    const naSvg = (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };
    el.uchop.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      st.tahane = true;
      st.morf = null;
      el.uchop.classList.add('tahane');
      el.uchop.setPointerCapture(e.pointerId);
    });
    el.uchop.addEventListener('pointermove', (e) => {
      if (!st.tahane) return;
      nastavH(B - naSvg(e).y);
    });
    const pusti = () => { st.tahane = false; el.uchop.classList.remove('tahane'); };
    el.uchop.addEventListener('pointerup', pusti);
    el.uchop.addEventListener('pointercancel', pusti);
    el.uchop.addEventListener('keydown', (e) => {
      const krok = e.shiftKey ? 20 : 6;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { nastavH(st.h + krok); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { nastavH(st.h - krok); e.preventDefault(); }
    });

    // Náklon za myšou
    const naklon = { x: 0, y: 0, tx: 0, ty: 0 };
    if (mys && !reduce) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        naklon.tx = (e.clientX - r.left) / r.width - 0.5;
        naklon.ty = (e.clientY - r.top) / r.height - 0.5;
        hero.style.setProperty('--svetlo-x', naklon.tx.toFixed(3));
        hero.style.setProperty('--svetlo-y', naklon.ty.toFixed(3));
      });
      hero.addEventListener('pointerleave', () => { naklon.tx = 0; naklon.ty = 0; });
    }

    ulohy.add((now) => {
      let zmena = false;
      if (st.stavba < 1) {
        st.start ??= now;
        st.stavba = clamp((now - st.start) / 3200, 0, 1);
        zmena = true;
      }
      if (st.morf) {
        const k = easeInOut(clamp((now - st.morf.start) / 750, 0, 1));
        st.pts = st.morf.od.map((q, i) => [lerp(q[0], st.morf.ciel[i][0], k), lerp(q[1], st.morf.ciel[i][1], k)]);
        if (k >= 1) st.morf = null;
        zmena = true;
      }
      if (zmena) vykresli();
      if (mys && !reduce) {
        naklon.x = lerp(naklon.x, naklon.tx, 0.08);
        naklon.y = lerp(naklon.y, naklon.ty, 0.08);
        scena.style.transform = `rotateY(${naklon.x * 14}deg) rotateX(${-naklon.y * 10}deg)`;
      }
    });
    vykresli();
  }
  dom();

  // ---------- Dážď a strecha pod kurzorom ----------
  function dazd() {
    const canvas = $('[data-dazd]');
    if (!canvas || reduce) return;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    let kvapky = [];
    const striekance = [];
    let aktivny = false;
    const strecha = { x: 0, y: 0, tx: null, ty: null, sirka: 90 };

    function velkost() {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pocet = clamp(Math.round((w * h) / 7000), 50, 190);
      kvapky = Array.from({ length: pocet }, () => nova(true));
      strecha.sirka = clamp(w * 0.12, 70, 120);
      strecha.x = w * 0.72;
      strecha.y = h * 0.62;
    }
    function nova(kdekolvek = false) {
      return { x: Math.random() * (w + 200) - 100, y: kdekolvek ? Math.random() * h : -20 - Math.random() * 60, v: 8 + Math.random() * 7, l: 12 + Math.random() * 16 };
    }
    const vietor = 0.16;
    const strechaY = (x) => strecha.y + 10 - (1 - Math.abs(x - strecha.x) / strecha.sirka) * strecha.sirka * 0.62;

    function posun(e) {
      const r = canvas.getBoundingClientRect();
      strecha.tx = e.clientX - r.left;
      strecha.ty = e.clientY - r.top;
    }
    kontakt.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') posun(e); });
    kontakt.addEventListener('pointerdown', posun);
    kontakt.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { strecha.tx = null; } });

    new IntersectionObserver(([z]) => { aktivny = z.isIntersecting; }, { threshold: 0 }).observe(canvas);
    addEventListener('resize', velkost);
    velkost();

    ulohy.add((now) => {
      if (!aktivny) return;
      if (strecha.tx === null) {
        strecha.tx = w * 0.5 + Math.sin(now / 2200) * w * 0.3;
        strecha.ty = h * 0.66 + Math.sin(now / 1300) * 20;
        strecha.x = lerp(strecha.x, strecha.tx, 0.05);
        strecha.y = lerp(strecha.y, strecha.ty, 0.05);
        strecha.tx = null;
      } else {
        strecha.x = lerp(strecha.x, strecha.tx, 0.18);
        strecha.y = lerp(strecha.y, strecha.ty, 0.18);
      }
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.26)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i < kvapky.length; i += 1) {
        const k = kvapky[i];
        k.y += k.v;
        k.x += k.v * vietor;
        const nad = Math.abs(k.x - strecha.x) < strecha.sirka;
        if ((nad && k.y >= strechaY(k.x) && k.y < strecha.y + 30) || k.y > h + 10) {
          const naStreche = nad && k.y < h;
          for (let s = 0; s < (naStreche ? 3 : 1); s += 1) {
            striekance.push({ x: k.x, y: naStreche ? strechaY(k.x) : h, vx: (k.x < strecha.x ? -1 : 1) * (1 + Math.random() * 2.5), vy: -1.5 - Math.random() * 2.5, z: 1 });
          }
          kvapky[i] = nova();
          continue;
        }
        ctx.moveTo(k.x, k.y);
        ctx.lineTo(k.x - k.l * vietor, k.y - k.l);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let i = striekance.length - 1; i >= 0; i -= 1) {
        const s = striekance[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.25;
        s.z -= 0.04;
        if (s.z <= 0) { striekance.splice(i, 1); continue; }
        ctx.globalAlpha = s.z;
        ctx.fillRect(s.x, s.y, 2, 2);
      }
      ctx.globalAlpha = 1;
      // Strecha
      const sx = strecha.x;
      const sy = strecha.y;
      const sw = strecha.sirka;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#d1272a';
      ctx.lineWidth = 9;
      ctx.shadowColor = 'rgba(209,39,42,.6)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(sx - sw, sy + 10);
      ctx.lineTo(sx, sy + 10 - sw * 0.62);
      ctx.lineTo(sx + sw, sy + 10);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }
  dazd();

  // ---------- Hlavná slučka ----------
  priPosune();
  function slucka(now) {
    for (const u of ulohy) u(now);
    requestAnimationFrame(slucka);
  }
  requestAnimationFrame(slucka);
})();
