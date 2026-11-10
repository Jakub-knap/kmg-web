// KMG stav – PDF cenovej ponuky a faktúry vytvorené priamo v prehliadači (bez tlače).
// Používa knižnicu pdf-lib a vložené písmo KMG Pismo (podmnožina Carlito, licencia OFL) so slovenskou diakritikou.
// Faktúra má QR kód PAY by square (window.KMGQr z qr-platba.js), ak je vyplnený IBAN a nie je zaplatená.
(function (koren) {
  const ZDROJE = {
    kniznica: '/assets/vendor/pdf-lib.min.js',
    regular: '/assets/pdf/kmg-pismo-regular.ttf',
    bold: '/assets/pdf/kmg-pismo-bold.ttf',
    metriky: '/assets/pdf/metriky.json',
    logo: '/assets/img/logo.png',
  };

  const A4 = [595.28, 841.89];
  const OKRAJ = 42;
  const DOLE = 58;

  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const num = (v) => {
    const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const eur = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });
  const cislo = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 3 });
  const datumSk = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d}. ${m}. ${y}`;
  };
  const pridajDni = (iso, dni) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + dni);
    return d.toISOString().slice(0, 10);
  };

  function spocitaj(p) {
    const medzisucet = r2(p.polozky.reduce((s, x) => s + r2(num(x.mnozstvo) * num(x.cena)), 0));
    const zlava = r2((medzisucet * num(p.zlava)) / 100);
    const zaklad = r2(medzisucet - zlava);
    const dph = p.platcaDph ? r2((zaklad * num(p.sadzbaDph)) / 100) : 0;
    return { medzisucet, zlava, zaklad, dph, spolu: r2(zaklad + dph) };
  }

  // ---------- Načítanie zdrojov (v prehliadači) ----------
  let pripravene = null;
  function nacitajSkript(src) {
    return new Promise((ok, chyba) => {
      if (koren.PDFLib) { ok(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => ok();
      s.onerror = () => chyba(new Error('Nástroj na PDF sa nepodarilo načítať. Skontrolujte pripojenie.'));
      document.head.append(s);
    });
  }
  async function bajty(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Súbory pre PDF sa nepodarilo načítať. Skontrolujte pripojenie.');
    return new Uint8Array(await res.arrayBuffer());
  }
  function priprav() {
    pripravene ??= Promise.all([
      nacitajSkript(ZDROJE.kniznica),
      bajty(ZDROJE.regular),
      bajty(ZDROJE.bold),
      fetch(ZDROJE.metriky).then((r) => r.json()),
      bajty(ZDROJE.logo),
    ]).then(([, regular, bold, metriky, logo]) => ({ L: koren.PDFLib, regular, bold, metriky, logo }))
      .catch((e) => { pripravene = null; throw e; });
    return pripravene;
  }

  // ---------- Vloženie písma (Type0 / CIDFontType2, Identity-H) ----------
  function vlozPismo(L, pdf, ttf, m, nazov) {
    const ctx = pdf.context;
    const k = 1000 / m.upm;
    const subor = ctx.flateStream(ttf, { Length1: ttf.length });
    const popis = ctx.obj({
      Type: 'FontDescriptor', FontName: nazov, Flags: 32,
      FontBBox: m.bbox.map((v) => Math.round(v * k)), ItalicAngle: 0,
      Ascent: Math.round(m.ascent * k), Descent: Math.round(m.descent * k),
      CapHeight: Math.round(m.capHeight * k), StemV: 80, FontFile2: ctx.register(subor),
    });
    const W = [];
    for (const [gid, w] of Object.entries(m.widths)) W.push(Number(gid), [Math.round(w * k)]);
    const cid = ctx.obj({
      Type: 'Font', Subtype: 'CIDFontType2', BaseFont: nazov,
      CIDSystemInfo: { Registry: L.PDFString.of('Adobe'), Ordering: L.PDFString.of('Identity'), Supplement: 0 },
      FontDescriptor: ctx.register(popis), W, CIDToGIDMap: 'Identity',
    });
    const hex4 = (n) => n.toString(16).padStart(4, '0').toUpperCase();
    const videne = new Set();
    const pary = Object.entries(m.cmap)
      .map(([u, g]) => [Number(g), Number(u)])
      .filter(([g]) => (videne.has(g) ? false : (videne.add(g), true)));
    let cmap = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n'
      + '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n'
      + '/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
    for (let i = 0; i < pary.length; i += 100) {
      const blok = pary.slice(i, i + 100);
      cmap += `${blok.length} beginbfchar\n${blok.map(([g, u]) => `<${hex4(g)}> <${hex4(u)}>`).join('\n')}\nendbfchar\n`;
    }
    cmap += 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
    const typ0 = ctx.obj({
      Type: 'Font', Subtype: 'Type0', BaseFont: nazov, Encoding: 'Identity-H',
      DescendantFonts: [ctx.register(cid)], ToUnicode: ctx.register(ctx.flateStream(cmap)),
    });
    return { ref: ctx.register(typ0), m };
  }

  // ---------- Zostavenie dokumentu ----------
  async function zostav(z, ponuka, firma, typ = 'ponuka') {
    const { L } = z;
    const pdf = await L.PDFDocument.create();
    const f = firma || {};
    const p = ponuka;
    const fakt = typ === 'faktura';
    const druh = fakt ? 'Faktúra' : 'Cenová ponuka';
    pdf.setTitle(`${druh} ${p.id}`);
    pdf.setAuthor(f.nazov || 'KMG stav');
    pdf.setCreator('KMG stav');
    pdf.setProducer('KMG stav');
    pdf.setLanguage('sk-SK');

    const R = vlozPismo(L, pdf, z.regular, z.metriky.regular, 'KMGPismo-Regular');
    const B = vlozPismo(L, pdf, z.bold, z.metriky.bold, 'KMGPismo-Bold');
    const logo = await pdf.embedPng(z.logo);

    const CIERNA = L.rgb(0.12, 0.12, 0.11);
    const SEDA = L.rgb(0.4, 0.39, 0.37);
    const LINKA = L.rgb(0.85, 0.84, 0.82);
    const PODKLAD = L.rgb(0.965, 0.96, 0.955);
    const CERVENA = L.rgb(209 / 255, 39 / 255, 42 / 255);
    const ZELENA = L.rgb(45 / 255, 122 / 255, 69 / 255);
    const [SIR, VYS] = A4;
    const PRAVY = SIR - OKRAJ;

    const gid = (pis, ch) => {
      const cp = ch.codePointAt(0);
      const t = pis.m.cmap;
      return t[cp] ?? (cp === 0x202f || cp === 0xa0 ? t[32] : t[63]) ?? 0;
    };
    const sirka = (text, pis, size) => {
      let w = 0;
      for (const ch of String(text)) w += pis.m.widths[gid(pis, ch)] || 0;
      return (w * size) / pis.m.upm;
    };
    const hex = (text, pis) => {
      let h = '';
      for (const ch of String(text)) h += gid(pis, ch).toString(16).padStart(4, '0');
      return h;
    };
    const zalom = (text, pis, size, max) => {
      const riadky = [];
      for (const odsek of String(text ?? '').split('\n')) {
        let r = '';
        for (const slovo of odsek.split(/\s+/)) {
          if (!slovo) continue;
          const t = r ? `${r} ${slovo}` : slovo;
          if (sirka(t, pis, size) <= max) { r = t; continue; }
          if (r) riadky.push(r);
          if (sirka(slovo, pis, size) <= max) { r = slovo; continue; }
          let kus = '';
          for (const ch of slovo) {
            if (sirka(kus + ch, pis, size) > max && kus) { riadky.push(kus); kus = ch; } else kus += ch;
          }
          r = kus;
        }
        riadky.push(r);
      }
      return riadky;
    };

    const strany = [];
    function novaStrana() {
      const page = pdf.addPage(A4);
      const s = { page, kR: page.node.newFontDictionary('KMGR', R.ref), kB: page.node.newFontDictionary('KMGB', B.ref) };
      strany.push(s);
      return s;
    }
    let st = novaStrana();
    const napis = (text, x, y, { pis = R, size = 10, farba = CIERNA, zarovnaj = 'vlavo' } = {}) => {
      const t = String(text ?? '');
      if (!t) return;
      const w = sirka(t, pis, size);
      const xx = zarovnaj === 'vpravo' ? x - w : zarovnaj === 'stred' ? x - w / 2 : x;
      st.page.pushOperators(
        L.pushGraphicsState(), L.setFillingColor(farba), L.beginText(),
        L.setFontAndSize(pis === B ? st.kB : st.kR, size), L.moveText(xx, y),
        L.showText(L.PDFHexString.of(hex(t, pis))), L.endText(), L.popGraphicsState(),
      );
    };
    const ciara = (x1, y1, x2, y2, hrubka = 0.5, farba = LINKA) => st.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: hrubka, color: farba });

    // Hlavička
    let y = VYS - OKRAJ;
    const logoV = 52;
    const logoS = (logoV * logo.width) / logo.height;
    st.page.drawImage(logo, { x: OKRAJ, y: y - logoV, width: logoS, height: logoV });
    napis(f.nazov || 'KMG stav', PRAVY, y - 11, { pis: B, size: 12, zarovnaj: 'vpravo' });
    const riadkyFirmy = [
      f.adresa,
      [f.ico && `IČO: ${f.ico}`, f.dic && `DIČ: ${f.dic}`].filter(Boolean).join('   '),
      f.icdph && `IČ DPH: ${f.icdph}`,
      f.telefon && `Tel.: ${f.telefon}`,
      [f.email, f.web].filter(Boolean).join('   '),
      !fakt && f.iban && `IBAN: ${f.iban}`,
    ].filter(Boolean);
    let yf = y - 25;
    for (const r of riadkyFirmy) { napis(r, PRAVY, yf, { size: 8.5, farba: SEDA, zarovnaj: 'vpravo' }); yf -= 11.5; }
    y = Math.min(y - logoV, yf + 4) - 12;
    st.page.drawRectangle({ x: OKRAJ, y, width: PRAVY - OKRAJ, height: 3, color: CERVENA });

    // Nadpis a dátumy
    y -= 34;
    napis(`${druh} č. ${p.id || 'návrh'}`, OKRAJ, y, { pis: B, size: 22 });
    if (fakt) {
      if (p.platcaDph) { y -= 16; napis('daňový doklad', OKRAJ, y, { size: 10, farba: SEDA }); }
    } else {
      y -= 18;
      const platnost = p.platnostDni ? `Platná do: ${datumSk(pridajDni(p.datum, num(p.platnostDni)))}` : '';
      napis(`Dátum: ${datumSk(p.datum)}${platnost ? `      ${platnost}` : ''}`, OKRAJ, y, { size: 10, farba: SEDA });
    }

    // Faktúra: odberateľ vľavo, platobné údaje vpravo
    if (fakt) {
      y -= 28;
      const o = p.odberatel || {};
      const xBox = OKRAJ + 262;
      const riadkyPlatby = [
        ['Dátum vystavenia', datumSk(p.datumVystavenia)],
        ['Dátum dodania', datumSk(p.datumDodania)],
        ['Dátum splatnosti', datumSk(p.datumSplatnosti), true],
        ['Variabilný symbol', p.vs || p.id, true],
        ['Forma úhrady', 'prevodom na účet'],
        f.iban && ['IBAN', String(f.iban).replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim(), true],
        f.swift && ['SWIFT', f.swift],
      ].filter(Boolean);
      const vyskaBoxu = riadkyPlatby.length * 14 + 12;
      st.page.drawRectangle({ x: xBox - 10, y: y - vyskaBoxu + 8, width: PRAVY - xBox + 10, height: vyskaBoxu + 4, color: PODKLAD });
      let yb = y - 4;
      for (const [n, v, tucne] of riadkyPlatby) {
        napis(n, xBox, yb, { size: 8.5, farba: SEDA });
        napis(v, PRAVY - 8, yb, { pis: tucne ? B : R, size: 9.5, zarovnaj: 'vpravo' });
        yb -= 14;
      }
      napis('Odberateľ', OKRAJ, y, { pis: B, size: 8, farba: SEDA });
      let yo = y - 14;
      if (o.meno) for (const rr of zalom(o.meno, B, 11, 240)) { napis(rr, OKRAJ, yo, { pis: B, size: 11 }); yo -= 14; }
      const riadkyOdb = [
        o.adresa,
        [o.ico && `IČO: ${o.ico}`, o.dic && `DIČ: ${o.dic}`].filter(Boolean).join('   '),
        o.icdph && `IČ DPH: ${o.icdph}`,
        o.email,
      ].filter(Boolean);
      for (const r of riadkyOdb) for (const rr of zalom(r, R, 10, 240)) { napis(rr, OKRAJ, yo, { size: 10 }); yo -= 13; }
      y = Math.min(yo, y - vyskaBoxu) - 10;
    }

    // Zákazník a miesto (ponuka)
    if (!fakt) y -= 30;
    const z0 = fakt ? {} : p.zakaznik || {};
    const stlpec2 = OKRAJ + 270;
    if (!fakt) napis('Pre', OKRAJ, y, { pis: B, size: 8, farba: SEDA });
    if (!fakt && p.miesto) napis('Miesto stavby', stlpec2, y, { pis: B, size: 8, farba: SEDA });
    let yz = fakt ? y : y - 14;
    if (z0.meno) { napis(z0.meno, OKRAJ, yz, { pis: B, size: 10.5 }); yz -= 13; }
    for (const r of [z0.adresa, z0.telefon && `Tel.: ${z0.telefon}`, z0.email].filter(Boolean)) {
      for (const rr of zalom(r, R, 10, 250)) { napis(rr, OKRAJ, yz, { size: 10 }); yz -= 13; }
    }
    let ym = fakt ? y : y - 14;
    if (!fakt && p.miesto) for (const rr of zalom(p.miesto, R, 10, PRAVY - stlpec2)) { napis(rr, stlpec2, ym, { size: 10 }); ym -= 13; }
    y = fakt ? y : Math.min(yz, ym) - 10;

    if (p.predmet) {
      for (const rr of zalom(p.predmet, B, 12.5, PRAVY - OKRAJ)) { y -= 15; napis(rr, OKRAJ, y, { pis: B, size: 12.5 }); }
      y -= 6;
    }
    const v = (!fakt && p.vymery) || {};
    const vymery = [num(v.plocha) && `Plocha: ${cislo.format(num(v.plocha))} m²`, num(v.dlzka) && `Dĺžka: ${cislo.format(num(v.dlzka))} bm`, num(v.atika) && `Atika: ${cislo.format(num(v.atika))} bm`].filter(Boolean).join('      ');
    if (vymery) { y -= 13; napis(vymery, OKRAJ, y, { size: 10, farba: SEDA }); y -= 4; }

    // Tabuľka položiek
    const S = {
      c: OKRAJ, popis: OKRAJ + 24, mnozstvoP: OKRAJ + 24 + 245 + 56, mj: OKRAJ + 24 + 245 + 64,
      cenaP: OKRAJ + 24 + 245 + 64 + 30 + 74, spoluP: PRAVY,
    };
    const popisMax = 245 - 6;
    function hlavickaTabulky() {
      y -= 20;
      st.page.drawRectangle({ x: OKRAJ, y: y - 6, width: PRAVY - OKRAJ, height: 20, color: PODKLAD });
      const o = { pis: B, size: 8, farba: SEDA };
      napis('Č.', S.c + 4, y, o);
      napis('Popis', S.popis, y, o);
      napis('Množstvo', S.mnozstvoP, y, { ...o, zarovnaj: 'vpravo' });
      napis('MJ', S.mj, y, o);
      napis('Cena za MJ', S.cenaP, y, { ...o, zarovnaj: 'vpravo' });
      napis('Spolu', S.spoluP - 4, y, { ...o, zarovnaj: 'vpravo' });
      y -= 6;
      ciara(OKRAJ, y, PRAVY, y, 0.8, CIERNA);
    }
    function pokracovanie() {
      st = novaStrana();
      y = VYS - OKRAJ - 4;
      napis(`${druh} č. ${p.id || 'návrh'} – pokračovanie`, OKRAJ, y, { pis: B, size: 10, farba: SEDA });
      y -= 8;
    }
    hlavickaTabulky();
    // Skupiny podľa cenníka (Cenník, Cena práce, vlastné kategórie) – pri viacerých sa ukážu oddelene s medzisúčtom
    const sumySkupin = new Map();
    p.polozky.forEach((x) => {
      const k = x.skupina || 'Ostatné';
      sumySkupin.set(k, r2((sumySkupin.get(k) || 0) + r2(num(x.mnozstvo) * num(x.cena))));
    });
    const viacSkupin = sumySkupin.size > 1;
    const zoradene = viacSkupin
      ? [...sumySkupin.keys()].flatMap((k) => p.polozky.filter((x) => (x.skupina || 'Ostatné') === k))
      : p.polozky;
    const polozky = zoradene.length ? zoradene : [{ nazov: 'Bez položiek', mnozstvo: '', jednotka: '', cena: '' }];
    const riadokSkupiny = (k) => {
      if (y - 40 < DOLE + 20) { pokracovanie(); hlavickaTabulky(); }
      y -= 18;
      st.page.drawRectangle({ x: OKRAJ, y: y - 5, width: PRAVY - OKRAJ, height: 17, color: PODKLAD });
      napis(k, S.popis, y, { pis: B, size: 9.5 });
      y -= 5;
    };
    const riadokMedzisuctu = (k) => {
      if (y - 20 < DOLE) { pokracovanie(); hlavickaTabulky(); }
      y -= 14;
      napis(`Spolu ${k}`, S.cenaP, y, { pis: B, size: 9, farba: SEDA, zarovnaj: 'vpravo' });
      napis(eur.format(sumySkupin.get(k)), S.spoluP - 4, y, { pis: B, size: 9.5, zarovnaj: 'vpravo' });
      y -= 6;
      ciara(OKRAJ, y, PRAVY, y, 0.6, SEDA);
    };
    let posledna = null;
    polozky.forEach((x, i) => {
      const skupina = x.skupina || 'Ostatné';
      if (viacSkupin && skupina !== posledna) {
        if (posledna !== null) riadokMedzisuctu(posledna);
        riadokSkupiny(skupina);
        posledna = skupina;
      }
      const riadky = zalom(x.nazov, R, 9.5, popisMax);
      const vyska = riadky.length * 12 + 9;
      if (y - vyska < DOLE + 20) { pokracovanie(); hlavickaTabulky(); }
      const yt = y - 14;
      napis(`${i + 1}.`, S.c + 4, yt, { size: 9.5, farba: SEDA });
      riadky.forEach((r, j) => napis(r, S.popis, yt - j * 12, { size: 9.5 }));
      if (x.mnozstvo !== '') {
        napis(cislo.format(num(x.mnozstvo)), S.mnozstvoP, yt, { size: 9.5, zarovnaj: 'vpravo' });
        napis(x.jednotka, S.mj, yt, { size: 9.5 });
        napis(eur.format(num(x.cena)), S.cenaP, yt, { size: 9.5, zarovnaj: 'vpravo' });
        napis(eur.format(r2(num(x.mnozstvo) * num(x.cena))), S.spoluP - 4, yt, { pis: B, size: 9.5, zarovnaj: 'vpravo' });
      }
      y -= vyska;
      ciara(OKRAJ, y, PRAVY, y, 0.4);
    });
    if (viacSkupin && posledna !== null) riadokMedzisuctu(posledna);

    // Súčty
    const s = spocitaj(p);
    const riadkySum = viacSkupin ? [...sumySkupin].map(([k, v]) => [k, eur.format(v)]) : [];
    riadkySum.push(['Medzisúčet', eur.format(s.medzisucet)]);
    if (s.zlava) riadkySum.push([`Zľava ${cislo.format(num(p.zlava))} %`, `−${eur.format(s.zlava)}`]);
    if (p.platcaDph) {
      riadkySum.push(['Základ dane', eur.format(s.zaklad)]);
      riadkySum.push([`DPH ${cislo.format(num(p.sadzbaDph))} %`, eur.format(s.dph)]);
    }
    // QR platba (len nezaplatená faktúra s IBAN a sumou)
    let qrKod = null;
    if (fakt && !p.zaplatena && f.iban && s.spolu > 0 && koren.KMGQr) {
      try {
        const text = koren.KMGQr.payBySquare({
          suma: s.spolu, iban: f.iban, swift: f.swift, vs: p.vs || p.id, splatnost: p.datumSplatnosti,
          poznamka: `Faktúra ${p.id}`, prijemca: f.nazov, adresa1: f.adresa,
        });
        qrKod = koren.KMGQr.qr(text, 'M');
      } catch (e) {
        qrKod = null; // neplatný IBAN a pod. – faktúra bude bez QR
      }
    }
    const QR = 102; // 36 mm podľa odporúčania PAY by square
    const potrebaSum = Math.max(riadkySum.length * 16 + 50, qrKod || (fakt && p.zaplatena) ? QR + 40 : 0);
    if (y - potrebaSum < DOLE) pokracovanie();
    const x0 = PRAVY - 235;
    const yBlok = y;
    y -= 22;
    for (const [n, v] of riadkySum) {
      napis(n, x0, y, { size: 10, farba: SEDA });
      napis(v, PRAVY - 4, y, { size: 10, zarovnaj: 'vpravo' });
      y -= 16;
    }
    y -= 2;
    ciara(x0, y + 10, PRAVY, y + 10, 1.2, CIERNA);
    y -= 10;
    const nazovSpolu = fakt ? 'Na úhradu' : 'Spolu';
    napis(p.platcaDph ? `${nazovSpolu} s DPH` : nazovSpolu, x0, y, { pis: B, size: 12 });
    napis(eur.format(s.spolu), PRAVY - 4, y - 1, { pis: B, size: 16, zarovnaj: 'vpravo', farba: CERVENA });
    y -= 30;
    if (qrKod) {
      const n = qrKod.velkost;
      const mod = QR / n;
      const qx = OKRAJ;
      const qy = yBlok - 14;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (!qrKod.tmavy(c, r)) continue;
          let dlzka = 1;
          while (c + dlzka < n && qrKod.tmavy(c + dlzka, r)) dlzka++;
          st.page.drawRectangle({ x: qx + c * mod, y: qy - (r + 1) * mod, width: dlzka * mod + 0.02, height: mod + 0.02, color: CIERNA });
          c += dlzka - 1;
        }
      }
      const yPod = qy - QR - 13;
      napis('PAY by square', qx, yPod, { pis: B, size: 9 });
      napis('Naskenujte v aplikácii banky', qx, yPod - 11, { size: 7.5, farba: SEDA });
      y = Math.min(y, yPod - 22);
    } else if (fakt && p.zaplatena) {
      const text = `UHRADENÉ ${datumSk(p.datumZaplatenia)}`;
      const sz = 15;
      const w = sirka(text, B, sz) + 24;
      const yp = yBlok - 50;
      st.page.drawRectangle({ x: OKRAJ, y: yp - 9, width: w, height: 30, borderColor: ZELENA, borderWidth: 2 });
      napis(text, OKRAJ + 12, yp, { pis: B, size: sz, farba: ZELENA });
      y = Math.min(y, yp - 30);
    }

    // Poznámka a text pod ponukou
    const odsek = (nadpis, text, size, farba) => {
      const riadky = zalom(text, R, size, PRAVY - OKRAJ);
      if (y - (riadky.length * (size + 3.5) + 20) < DOLE) pokracovanie();
      if (nadpis) { y -= 4; napis(nadpis, OKRAJ, y, { pis: B, size: 8, farba: SEDA }); y -= 4; }
      for (const r of riadky) { y -= size + 3.5; napis(r, OKRAJ, y, { size, farba }); }
      y -= 10;
    };
    if (p.poznamka) odsek('Poznámka', p.poznamka, 10, CIERNA);
    if (fakt) {
      if (!p.platcaDph) odsek('', 'Dodávateľ nie je platiteľom DPH.', 9, SEDA);
      if (f.register) odsek('', f.register, 9, SEDA);
    } else {
      const pata = `${p.platcaDph ? '' : 'Nie sme platcami DPH. '}${f.pata || ''}`.trim();
      if (pata) odsek('', pata, 9, SEDA);

      // Podpis
      if (y - 60 < DOLE) pokracovanie();
      y -= 42;
      ciara(PRAVY - 180, y, PRAVY, y, 0.6, CIERNA);
      napis('Vypracoval', PRAVY - 90, y - 12, { size: 8.5, farba: SEDA, zarovnaj: 'stred' });
    }

    // Päta na každej strane
    const kontakt = [f.nazov || 'KMG stav', f.telefon, f.email].filter(Boolean).join('   ');
    strany.forEach((str, i) => {
      st = str;
      ciara(OKRAJ, 40, PRAVY, 40, 0.4);
      napis(kontakt, OKRAJ, 28, { size: 7.5, farba: SEDA });
      napis(`Strana ${i + 1} z ${strany.length}`, PRAVY, 28, { size: 7.5, farba: SEDA, zarovnaj: 'vpravo' });
    });

    return pdf.save();
  }

  function nazovSuboru(doklad, typ = 'ponuka') {
    const fakt = typ === 'faktura';
    const meno = String((fakt ? doklad.odberatel?.meno : doklad.zakaznik?.meno) || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
    return `${fakt ? 'Faktura' : 'Cenova-ponuka'}-${doklad.id || 'navrh'}${meno ? `-${meno}` : ''}.pdf`;
  }

  koren.KMGPdf = {
    priprav,
    zostav,
    nazovSuboru,
    async vytvor(doklad, firma, typ = 'ponuka') {
      const z = await priprav();
      const data = await zostav(z, doklad, firma, typ);
      return new Blob([data], { type: 'application/pdf' });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
