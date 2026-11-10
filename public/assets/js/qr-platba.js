// KMG stav – QR kód a PAY by square (slovenský štandard QR platieb, SBA) bez externých knižníc.
//
//   KMGQr.qr(text, 'M')        → { velkost, tmavy(x, y) }   matica QR kódu
//   KMGQr.payBySquare({...})   → text pre QR kód platby (base32hex)
//
// PAY by square: údaje oddelené tabulátorom → CRC32 (4 B, little-endian) + údaje → LZMA1 (lc=3, lp=0, pb=2,
// slovník 128 kB, bez hlavičky) → 2 B hlavička (typ PAY, verzia 0) + 2 B dĺžka nekomprimovaných údajov → base32hex.
// LZMA tu kóduje len literály a koncovú značku (bez hľadania zhôd) – výstup je platný LZMA prúd, len menej
// skomprimovaný, čo pri ~150 B platby nevadí.
(function (koren) {
  // ---------- CRC32 ----------
  const CRC_TAB = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bajty) {
    let c = 0xffffffff;
    for (const b of bajty) c = CRC_TAB[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // ---------- LZMA1 (raw): literály + koncová značka ----------
  function lzma(vstup) {
    const out = [];
    let low = 0; // až 2^40, preto obyčajné číslo, nie 32-bit operácie
    let range = 0xffffffff;
    let cache = 0;
    let cacheSize = 1;
    const shiftLow = () => {
      const lo = low % 0x100000000;
      const hi = low >= 0x100000000 ? 1 : 0;
      if (lo < 0xff000000 || hi) {
        let temp = cache;
        do {
          out.push((temp + hi) & 0xff);
          temp = 0xff;
        } while (--cacheSize !== 0);
        cache = Math.floor(lo / 0x1000000);
      }
      cacheSize++;
      low = (lo % 0x1000000) * 256;
    };
    const normalizuj = () => {
      while (range < 0x1000000) {
        range = (range * 256) >>> 0;
        shiftLow();
      }
    };
    const bit = (p, i, b) => {
      const v = p[i];
      const bound = (range >>> 11) * v;
      if (b === 0) {
        range = bound;
        p[i] = v + ((2048 - v) >>> 5);
      } else {
        low += bound;
        range = (range - bound) >>> 0;
        p[i] = v - (v >>> 5);
      }
      normalizuj();
    };
    const priame = (hodnota, pocet) => {
      for (let i = pocet - 1; i >= 0; i--) {
        range >>>= 1;
        if ((hodnota >>> i) & 1) low += range;
        normalizuj();
      }
    };
    const strom = (p, zaklad, pocet, symbol) => {
      let m = 1;
      for (let i = pocet - 1; i >= 0; i--) {
        const b = (symbol >>> i) & 1;
        bit(p, zaklad + m, b);
        m = (m << 1) | b;
      }
    };
    const stromOpacne = (p, pocet, symbol) => {
      let m = 1;
      for (let i = 0; i < pocet; i++) {
        const b = symbol & 1;
        symbol >>>= 1;
        bit(p, m, b);
        m = (m << 1) | b;
      }
    };
    const pravdepodobnosti = (n) => new Uint16Array(n).fill(1024);
    const isMatch = pravdepodobnosti(12 * 16);
    const isRep = pravdepodobnosti(12);
    const lenChoice = pravdepodobnosti(1);
    const lenLow = pravdepodobnosti(16 * 8);
    const posSlot = pravdepodobnosti(4 * 64);
    const align = pravdepodobnosti(16);
    const literal = pravdepodobnosti(0x300 * 8); // lc = 3, lp = 0
    const stav = 0; // po literáli ostáva stav 0
    let predchadzajuci = 0;
    for (let pos = 0; pos < vstup.length; pos++) {
      bit(isMatch, (stav << 4) + (pos & 3), 0); // pb = 2
      const zaklad = 0x300 * (predchadzajuci >>> 5);
      const bajt = vstup[pos];
      let s = 1;
      for (let i = 7; i >= 0; i--) {
        const b = (bajt >>> i) & 1;
        bit(literal, zaklad + s, b);
        s = (s << 1) | b;
      }
      predchadzajuci = bajt;
    }
    // Koncová značka (zhoda dĺžky 2 so vzdialenosťou 0xFFFFFFFF)
    const posState = vstup.length & 3;
    bit(isMatch, (stav << 4) + posState, 1);
    bit(isRep, stav, 0);
    bit(lenChoice, 0, 0);
    strom(lenLow, posState * 8, 3, 0);
    strom(posSlot, 0, 6, 63);
    priame(0x3ffffff, 26);
    stromOpacne(align, 4, 15);
    for (let i = 0; i < 5; i++) shiftLow();
    return Uint8Array.from(out);
  }

  // ---------- base32hex (RFC 4648, bez '=') ----------
  function base32hex(bajty) {
    const ABC = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
    let vystup = '';
    let buffer = 0;
    let bity = 0;
    for (const b of bajty) {
      buffer = (buffer << 8) | b;
      bity += 8;
      while (bity >= 5) {
        vystup += ABC[(buffer >>> (bity - 5)) & 31];
        bity -= 5;
      }
      buffer &= (1 << bity) - 1;
    }
    if (bity > 0) vystup += ABC[(buffer << (5 - bity)) & 31];
    return vystup;
  }

  // ---------- Kontrola bankových údajov ----------
  const bezMedzier = (v) => String(v ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  /** IBAN s platným kontrolným súčtom (mod 97), inak ''. */
  function platnyIban(v) {
    const iban = bezMedzier(v);
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(iban)) return '';
    const cisla = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
    let zvysok = 0;
    for (const c of cisla) zvysok = (zvysok * 10 + Number(c)) % 97;
    return zvysok === 1 ? iban : '';
  }
  /** BIC/SWIFT (8 alebo 11 znakov) z krajiny IBAN-u, inak ''. Iná krajina = banky platbu odmietnu. */
  function platnyBic(v, iban = '') {
    const bic = bezMedzier(v);
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) return '';
    const krajina = bezMedzier(iban).slice(0, 2);
    if (krajina && bic.slice(4, 6) !== krajina) return '';
    return bic;
  }

  // ---------- PAY by square ----------
  const ciste = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max).trim();
  function payBySquare({ suma, iban, swift = '', vs = '', splatnost = '', poznamka = '', prijemca = '', adresa1 = '', adresa2 = '' }) {
    const ucet = platnyIban(iban);
    if (!ucet) throw new Error('Neplatný IBAN.');
    const castka = Math.round(Number(suma) * 100) / 100;
    if (!(castka > 0)) throw new Error('Suma na úhradu musí byť väčšia ako 0.');
    const polia = [
      '', // InvoiceID
      '1', // počet platieb
      '1', // PaymentOptions: platobný príkaz
      castka.toFixed(2),
      'EUR',
      String(splatnost || '').replace(/-/g, ''), // RRRRMMDD
      ciste(vs, 10).replace(/\D/g, ''),
      '', // konštantný symbol
      '', // špecifický symbol
      '', // OriginatorsReferenceInformation
      ciste(poznamka, 140),
      '1', // počet účtov
      ucet,
      platnyBic(swift, ucet), // nepovinný; nesprávny alebo z inej krajiny sa radšej vynechá
      '0', // trvalý príkaz: nie
      '0', // inkaso: nie
      ciste(prijemca, 70), // od 1.2.0 povinné
      ciste(adresa1, 70),
      ciste(adresa2, 70),
    ];
    const text = new TextEncoder().encode(polia.join('\t'));
    const surove = new Uint8Array(4 + text.length);
    const crc = crc32(text);
    surove[0] = crc & 0xff;
    surove[1] = (crc >>> 8) & 0xff;
    surove[2] = (crc >>> 16) & 0xff;
    surove[3] = (crc >>> 24) & 0xff;
    surove.set(text, 4);
    const komprimovane = lzma(surove);
    const vsetko = new Uint8Array(4 + komprimovane.length);
    vsetko[0] = 0x00; // typ PAY, verzia 0
    vsetko[1] = 0x00; // typ dokladu 0, rezerva
    vsetko[2] = surove.length & 0xff;
    vsetko[3] = (surove.length >>> 8) & 0xff;
    vsetko.set(komprimovane, 4);
    return base32hex(vsetko);
  }

  // ---------- QR kód (ISO/IEC 18004) ----------
  // Počet kódových slov opravy chýb na blok a počet blokov, pre úrovne L a M, verzie 1–40.
  const ECC_KODY = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  };
  const ECC_BLOKY = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  };
  const FORMAT_UROVNE = { L: 1, M: 0 };
  const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  function surovychModulov(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  }
  const datovychKodov = (v, u) => Math.floor(surovychModulov(v) / 8) - ECC_KODY[u][v] * ECC_BLOKY[u][v];

  function gfNasob(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }
  function rsDelitel(stupen) {
    const r = new Array(stupen).fill(0);
    r[stupen - 1] = 1;
    let koren2 = 1;
    for (let i = 0; i < stupen; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = gfNasob(r[j], koren2);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      koren2 = gfNasob(koren2, 0x02);
    }
    return r;
  }
  function rsZvysok(data, delitel) {
    const r = delitel.map(() => 0);
    for (const b of data) {
      const f = b ^ r.shift();
      r.push(0);
      delitel.forEach((c, i) => { r[i] ^= gfNasob(c, f); });
    }
    return r;
  }

  function qr(text, uroven = 'M') {
    const u = uroven === 'L' ? 'L' : 'M';
    const alnum = [...text].every((c) => ALNUM.includes(c));
    const bajty = alnum ? null : new TextEncoder().encode(text);
    const dlzka = alnum ? text.length : bajty.length;
    const bitovDlzky = (v) => (alnum ? (v <= 9 ? 9 : v <= 26 ? 11 : 13) : v <= 9 ? 8 : 16);
    const bitovDat = (v) => 4 + bitovDlzky(v) + (alnum ? Math.floor(dlzka / 2) * 11 + (dlzka % 2) * 6 : dlzka * 8);
    let verzia = 1;
    while (verzia <= 40 && bitovDat(verzia) > datovychKodov(verzia, u) * 8) verzia++;
    if (verzia > 40) throw new Error('Príliš veľa údajov pre QR kód.');

    // Dáta
    const bb = [];
    const pridaj = (hodnota, n) => { for (let i = n - 1; i >= 0; i--) bb.push((hodnota >>> i) & 1); };
    pridaj(alnum ? 0b0010 : 0b0100, 4);
    pridaj(dlzka, bitovDlzky(verzia));
    if (alnum) {
      for (let i = 0; i + 1 < dlzka; i += 2) pridaj(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
      if (dlzka % 2) pridaj(ALNUM.indexOf(text[dlzka - 1]), 6);
    } else {
      for (const b of bajty) pridaj(b, 8);
    }
    const kapacita = datovychKodov(verzia, u) * 8;
    pridaj(0, Math.min(4, kapacita - bb.length));
    pridaj(0, (8 - (bb.length % 8)) % 8);
    for (let vypln = 0xec; bb.length < kapacita; vypln ^= 0xec ^ 0x11) pridaj(vypln, 8);
    const data = [];
    for (let i = 0; i < bb.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bb[i + j];
      data.push(b);
    }

    // Oprava chýb a prekladanie blokov
    const pocetBlokov = ECC_BLOKY[u][verzia];
    const eccDlzka = ECC_KODY[u][verzia];
    const vsetkych = Math.floor(surovychModulov(verzia) / 8);
    const kratkych = pocetBlokov - (vsetkych % pocetBlokov);
    const kratkyBlok = Math.floor(vsetkych / pocetBlokov);
    const delitel = rsDelitel(eccDlzka);
    const bloky = [];
    for (let i = 0, k = 0; i < pocetBlokov; i++) {
      const d = data.slice(k, k + kratkyBlok - eccDlzka + (i < kratkych ? 0 : 1));
      k += d.length;
      const ecc = rsZvysok(d, delitel);
      if (i < kratkych) d.push(0);
      bloky.push(d.concat(ecc));
    }
    const kody = [];
    for (let i = 0; i < bloky[0].length; i++) {
      bloky.forEach((b, j) => { if (i !== kratkyBlok - eccDlzka || j >= kratkych) kody.push(b[i]); });
    }

    // Matica
    const n = verzia * 4 + 17;
    const m = Array.from({ length: n }, () => new Array(n).fill(false));
    const fn = Array.from({ length: n }, () => new Array(n).fill(false));
    const nastav = (x, y, tmavy) => { m[y][x] = tmavy; fn[y][x] = true; };
    for (let i = 0; i < n; i++) {
      nastav(6, i, i % 2 === 0);
      nastav(i, 6, i % 2 === 0);
    }
    const hladac = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < n && y >= 0 && y < n) nastav(x, y, d !== 2 && d !== 4);
        }
      }
    };
    hladac(3, 3);
    hladac(n - 4, 3);
    hladac(3, n - 4);
    if (verzia > 1) {
      const pocet = Math.floor(verzia / 7) + 2;
      const krok = verzia === 32 ? 26 : Math.ceil((verzia * 4 + 4) / (pocet * 2 - 2)) * 2;
      const poz = [6];
      for (let p = n - 7; poz.length < pocet; p -= krok) poz.splice(1, 0, p);
      poz.forEach((a, i) => poz.forEach((b, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === pocet - 1) || (i === pocet - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) nastav(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }));
    }
    const kresliFormat = (maska) => {
      const d = (FORMAT_UROVNE[u] << 3) | maska;
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const bity = ((d << 10) | r) ^ 0x5412;
      const b = (i) => ((bity >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) nastav(8, i, b(i));
      nastav(8, 7, b(6));
      nastav(8, 8, b(7));
      nastav(7, 8, b(8));
      for (let i = 9; i < 15; i++) nastav(14 - i, 8, b(i));
      for (let i = 0; i < 8; i++) nastav(n - 1 - i, 8, b(i));
      for (let i = 8; i < 15; i++) nastav(8, n - 15 + i, b(i));
      nastav(8, n - 8, true);
    };
    kresliFormat(0);
    if (verzia >= 7) {
      let r = verzia;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const bity = (verzia << 12) | r;
      for (let i = 0; i < 18; i++) {
        const b = ((bity >>> i) & 1) !== 0;
        const a = n - 11 + (i % 3);
        const c = Math.floor(i / 3);
        nastav(a, c, b);
        nastav(c, a, b);
      }
    }
    // Kódové slová (cikcak zdola nahor po dvojstĺpcoch)
    let i = 0;
    for (let vpravo = n - 1; vpravo >= 1; vpravo -= 2) {
      if (vpravo === 6) vpravo = 5;
      for (let vert = 0; vert < n; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = vpravo - j;
          const hore = ((vpravo + 1) & 2) === 0;
          const y = hore ? n - 1 - vert : vert;
          if (!fn[y][x] && i < kody.length * 8) {
            m[y][x] = ((kody[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
    // Maska s najmenšou penalizáciou
    const maskuj = (k) => {
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (fn[y][x]) continue;
          let inv;
          switch (k) {
            case 0: inv = (x + y) % 2 === 0; break;
            case 1: inv = y % 2 === 0; break;
            case 2: inv = x % 3 === 0; break;
            case 3: inv = (x + y) % 3 === 0; break;
            case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
            case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
            case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
          }
          if (inv) m[y][x] = !m[y][x];
        }
      }
    };
    const penalizacia = () => {
      let s = 0;
      for (let smer = 0; smer < 2; smer++) {
        for (let a = 0; a < n; a++) {
          let beh = 0;
          let farba = null;
          let riadok = '';
          for (let b = 0; b < n; b++) {
            const c = smer ? m[b][a] : m[a][b];
            riadok += c ? '1' : '0';
            if (c === farba) {
              beh++;
              if (beh === 5) s += 3;
              else if (beh > 5) s++;
            } else {
              farba = c;
              beh = 1;
            }
          }
          s += 40 * (riadok.match(/(?=10111010000|00001011101)/g) || []).length;
        }
      }
      let tmave = 0;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (m[y][x]) tmave++;
          if (y < n - 1 && x < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) s += 3;
        }
      }
      const k = Math.ceil(Math.abs(tmave * 20 - n * n * 10) / (n * n)) - 1;
      return s + Math.max(0, k) * 10;
    };
    let najlepsia = 0;
    let najmensia = Infinity;
    for (let k = 0; k < 8; k++) {
      maskuj(k);
      kresliFormat(k);
      const p = penalizacia();
      if (p < najmensia) { najmensia = p; najlepsia = k; }
      maskuj(k);
    }
    maskuj(najlepsia);
    kresliFormat(najlepsia);
    return { velkost: n, verzia, tmavy: (x, y) => m[y][x] };
  }

  koren.KMGQr = { qr, payBySquare, platnyIban, platnyBic, crc32, lzma, base32hex };
})(typeof window !== 'undefined' ? window : globalThis);
