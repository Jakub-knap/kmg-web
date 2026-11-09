// KMG stav – správa webu
(() => {
  const KATEGORIE = [
    ['strechy', 'Strechy'], ['atiky', 'Atiky'], ['chaty', 'Chaty'], ['pristresky', 'Prístrešky'], ['altanky', 'Altánky'],
    ['pergoly', 'Pergoly'], ['drevodomy', 'Drevodomy'], ['interier', 'Interiér a pivnice'],
  ];
  const NAZOV_KAT = Object.fromEntries(KATEGORIE);
  const JEDNOTKY = ['m²', 'bm', 'ks', 'hod', 'km', 'm³', 'kg', 'paušál'];
  const KARTY_ADMIN = ['fotky', 'ponuky', 'cennik', 'firma'];

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const eur = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });
  const cislo = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 3 });
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const num = (v) => {
    const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const vstup = (n) => (n || n === 0 ? String(n).replace('.', ',') : '');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const dnes = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
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
  const getPath = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);
  const setPath = (o, path, v) => {
    const ks = path.split('.');
    let a = o;
    for (const k of ks.slice(0, -1)) a = a[k] ??= {};
    a[ks.at(-1)] = v;
  };
  const pamat = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* súkromné okno */ } },
  };

  const stav = {
    rola: null,
    nastavenia: null,
    fotky: [],
    ponuky: [],
    ponuka: null,
    ponukaZmenena: false,
    cennikZmeneny: false,
  };

  // ---------- Pomocníci ----------
  let oznamCas;
  function oznam(text, chyba = false) {
    const o = $('[data-oznam]');
    o.textContent = text;
    o.classList.toggle('chybne', chyba);
    o.classList.add('viditelny');
    clearTimeout(oznamCas);
    oznamCas = setTimeout(() => o.classList.remove('viditelny'), chyba ? 5000 : 2500);
  }

  async function api(path, { method = 'GET', body } = {}) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, opts);
    } catch {
      throw new Error('Nie je pripojenie na internet. Skúste to znova.');
    }
    let data = null;
    try { data = await res.json(); } catch { /* prázdna odpoveď */ }
    if (res.status === 401 && path !== '/api/login') ukazPrihlasenie('Prihlásenie vypršalo. Prihláste sa znova.');
    if (!res.ok) throw new Error(data?.chyba || `Server odpovedal chybou ${res.status}.`);
    return data;
  }

  function dvojklik(btn, text, akcia) {
    // Prvé ťuknutie sa opýta, druhé vykoná. Bez vyskakovacích okien.
    if (btn.dataset.potvrd === '1') {
      btn.dataset.potvrd = '';
      btn.classList.remove('potvrdit');
      btn.textContent = btn.dataset.povodny;
      return akcia();
    }
    btn.dataset.povodny = btn.textContent;
    btn.dataset.potvrd = '1';
    btn.classList.add('potvrdit');
    btn.textContent = text;
    setTimeout(() => {
      if (btn.dataset.potvrd === '1') {
        btn.dataset.potvrd = '';
        btn.classList.remove('potvrdit');
        btn.textContent = btn.dataset.povodny;
      }
    }, 4000);
  }

  // ---------- Prihlásenie ----------
  function ukazPrihlasenie(sprava = '') {
    stav.rola = null;
    $('#prihlasenie').hidden = false;
    $('#sprava').hidden = true;
    $('[data-odhlasit]').hidden = true;
    $('[data-chyba]').textContent = sprava;
    setTimeout(() => $('#heslo').focus(), 50);
  }

  $('[data-prihlasenie]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const heslo = $('#heslo').value;
    if (!heslo) {
      $('[data-chyba]').textContent = 'Zadajte heslo.';
      return;
    }
    btn.disabled = true;
    try {
      const { rola } = await api('/api/login', { method: 'POST', body: { heslo } });
      $('#heslo').value = '';
      prihlaseny(rola);
    } catch (err) {
      $('[data-chyba]').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('[data-odhlasit]').addEventListener('click', async () => {
    if ((stav.ponukaZmenena || stav.cennikZmeneny) && !confirm('Máte neuložené zmeny. Naozaj sa odhlásiť?')) return;
    try { await api('/api/login', { method: 'DELETE' }); } catch { /* aj tak odhlásime */ }
    stav.ponukaZmenena = stav.cennikZmeneny = false;
    ukazPrihlasenie('');
  });

  function prihlaseny(rola) {
    stav.rola = rola;
    $('#prihlasenie').hidden = true;
    $('#sprava').hidden = false;
    $('[data-odhlasit]').hidden = false;
    const admin = rola === 'admin';
    $$('[data-len-admin]').forEach((a) => { a.hidden = !admin; });
    $('.karty').style.setProperty('--pocet', admin ? 2 : 1);
    ukazKartu();
    nacitajFotky();
    if (admin) {
      nacitajNastavenia().then(() => {
        const url = new URL(location.href);
        if (url.searchParams.has('nova')) {
          url.searchParams.delete('nova');
          history.replaceState(null, '', url);
          $('[data-nova-ponuka]').click();
        }
      });
      nacitajPonuky();
    }
  }

  // ---------- Karty ----------
  function povoleneKarty() {
    return stav.rola === 'admin' ? KARTY_ADMIN : ['fotky'];
  }
  function aktualnaKarta() {
    const k = location.hash.slice(1) || new URLSearchParams(location.search).get('tab') || 'fotky';
    return povoleneKarty().includes(k) ? k : 'fotky';
  }
  function ukazKartu() {
    if (!stav.rola) return;
    const k = aktualnaKarta();
    $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== k; });
    const vNav = k === 'cennik' || k === 'firma' ? 'ponuky' : k;
    $$('[data-karta]').forEach((a) => {
      if (a.dataset.karta === vNav) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', ukazKartu);

  window.addEventListener('beforeunload', (e) => {
    if (stav.ponukaZmenena || stav.cennikZmeneny) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ---------- Fotky: zákazky ----------
  const vyberKat = $('[data-kategorie-vyber]');
  const poslednaKat = pamat.get('kmg-kategoria') || 'strechy';
  KATEGORIE.forEach(([k, nazov]) => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="radio" name="kat" value="${k}"><span>${esc(nazov)}</span>`;
    if (k === poslednaKat) label.querySelector('input').checked = true;
    vyberKat.append(label);
  });
  vyberKat.addEventListener('change', (e) => pamat.set('kmg-kategoria', e.target.value));

  const tvarNova = $('[data-nova-zakazka]');
  const zakazkyBox = $('[data-zakazky]');
  const limitVstup = $('[data-limit]');
  stav.galeria = { zakazky: [], ine: [], max: 10 };

  const pocetFotiek = (n) => `${n} ${n === 1 ? 'fotka' : n >= 2 && n <= 4 ? 'fotky' : 'fotiek'}`;
  const datumZ = (ms) => new Date(ms).toLocaleDateString('sk-SK');
  const IKONA_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';

  async function nacitajFotky() {
    try {
      const d = await api(`/api/zakazky?t=${Date.now()}`);
      stav.galeria = { zakazky: d.zakazky || [], ine: d.ine || [], max: d.max || 10 };
    } catch (e) {
      oznam(e.message, true);
    }
    vykresliZakazky();
  }

  function aktualizujVarovanie() {
    const { zakazky, max } = stav.galeria;
    $('[data-max-text]').textContent = max;
    const v = $('[data-varovanie]');
    if (zakazky.length >= max) {
      const zmaze = zakazky.slice(max - 1);
      v.innerHTML = `Limit je naplnený (${zakazky.length} z ${max} zákaziek). Po vytvorení novej sa zmaže ${zmaze.length === 1 ? 'najstaršia' : 'najstaršie'}: ${zmaze.map((z) => `<strong>${esc(z.nazov)}</strong> (${pocetFotiek(z.fotky.length)})`).join(', ')}.`;
      v.hidden = false;
    } else {
      v.hidden = true;
    }
  }

  function vykresliZakazky() {
    const { zakazky, ine, max } = stav.galeria;
    $('[data-pocet-zakaziek]').textContent = `(${zakazky.length} z ${max})`;
    if (stav.rola === 'admin') {
      $('[data-limit-blok]').hidden = false;
      if (document.activeElement !== limitVstup) limitVstup.value = max;
    }
    aktualizujVarovanie();
    zakazkyBox.replaceChildren();
    if (!zakazky.length) {
      zakazkyBox.innerHTML = '<p class="prazdne-admin">Zatiaľ tu nie je žiadna zákazka. Vytvorte prvú vyššie a pridajte do nej fotky.</p>';
    }
    zakazky.forEach((z, i) => zakazkyBox.append(kartaZakazky(z, i >= max)));
    $('[data-ine]').hidden = !ine.length;
    const ib = $('[data-ine-fotky]');
    ib.replaceChildren();
    ine.forEach((f) => ib.append(figurka(f, NAZOV_KAT[f.kategoria] || '', () => {
      stav.galeria.ine = stav.galeria.ine.filter((x) => x.id !== f.id);
      vykresliZakazky();
    })));
  }

  function figurka(f, popis, poZmazani) {
    const fig = document.createElement('figure');
    fig.innerHTML = `<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.nahlad)}" alt="" loading="lazy"></a><figcaption><span>${esc(popis)}</span><button type="button">Zmazať</button></figcaption>`;
    const btn = $('button', fig);
    btn.addEventListener('click', () => dvojklik(btn, 'Naozaj?', async () => {
      btn.disabled = true;
      try {
        await api(`/api/photos?id=${encodeURIComponent(f.id)}`, { method: 'DELETE' });
        poZmazani();
        oznam('Fotka zmazaná');
      } catch (e) {
        btn.disabled = false;
        oznam(e.message, true);
      }
    }));
    return fig;
  }

  const PORADIE_OZN = { pred: 0, po: 2 };
  const NAZOV_OZN = { pred: 'Pred', po: 'Po' };
  const DALSIE_OZN = { '': 'pred', pred: 'po', po: '' };
  const zoradFotky = (z) => z.fotky.sort((a, b) => (PORADIE_OZN[a.oznacenie] ?? 1) - (PORADIE_OZN[b.oznacenie] ?? 1) || a.cas - b.cas);
  const obalZakazky = (z) => z.fotky.find((f) => f.oznacenie === 'po') || z.fotky[0];

  function obnovKartu(el, z) {
    zoradFotky(z);
    const obal = obalZakazky(z);
    const pred = z.fotky.filter((f) => f.oznacenie === 'pred').length;
    const po = z.fotky.filter((f) => f.oznacenie === 'po').length;
    $('h3', el).textContent = z.nazov;
    $('.zakazka__meta', el).textContent = `${NAZOV_KAT[z.kategoria] || ''}, ${pocetFotiek(z.fotky.length)}, ${datumZ(z.vytvorene)}${pred || po ? `, pred: ${pred}, po: ${po}` : ''}`;
    $('.zakazka__obal', el).innerHTML = obal ? `<img src="${esc(obal.nahlad)}" alt="">` : '<span>Bez fotiek</span>';
    const det = $('details', el);
    det.hidden = !z.fotky.length;
    $('summary', det).textContent = `Fotky v zákazke (${z.fotky.length})`;
    const mriezka = $('.admin-mriezka', det);
    mriezka.replaceChildren();
    z.fotky.forEach((f) => {
      const fig = figurka(f, f === obal ? 'Úvodná' : '', () => {
        z.fotky = z.fotky.filter((x) => x.id !== f.id);
        obnovKartu(el, z);
        aktualizujVarovanie();
      });
      const ozn = document.createElement('button');
      ozn.type = 'button';
      ozn.className = 'oznacenie';
      ozn.dataset.ozn = f.oznacenie || '';
      ozn.textContent = NAZOV_OZN[f.oznacenie] || 'Pred/Po?';
      ozn.title = 'Ťuknutím prepnete: bez označenia, pred, po';
      ozn.addEventListener('click', async () => {
        const nove = DALSIE_OZN[f.oznacenie || ''];
        ozn.disabled = true;
        try {
          const fid = f.id.split('/')[1];
          await api(`/api/zakazky?id=${encodeURIComponent(z.id)}`, { method: 'PUT', body: { foto: fid, oznacenie: nove } });
          if (nove) f.oznacenie = nove; else delete f.oznacenie;
          obnovKartu(el, z);
        } catch (err) {
          ozn.disabled = false;
          oznam(err.message, true);
        }
      });
      $('figcaption', fig).prepend(ozn);
      mriezka.append(fig);
    });
    el.classList.toggle('zakazka--prazdna', !z.fotky.length);
  }

  function kartaZakazky(z, mimoWebu) {
    const el = document.createElement('article');
    el.className = 'zakazka';
    el.dataset.id = z.id;
    el.innerHTML = `
      <div class="zakazka__hlava">
        <div class="zakazka__obal"></div>
        <div class="zakazka__info">
          <h3></h3>
          <p class="zakazka__meta"></p>
          ${mimoWebu ? '<p class="zakazka__mimo">Nad limitom: na webe sa nezobrazuje a zmaže sa pri ďalšej novej zákazke.</p>' : ''}
          <p class="zakazka__vyzva">Pridajte do zákazky fotky.</p>
        </div>
      </div>
      <div class="zakazka__oznacenie" role="radiogroup" aria-label="Nové fotky označiť ako">
        <span>Nové fotky:</span>
        <label><input type="radio" name="ozn-${z.id}" value="" checked><span>Bez označenia</span></label>
        <label><input type="radio" name="ozn-${z.id}" value="pred"><span>Pred realizáciou</span></label>
        <label><input type="radio" name="ozn-${z.id}" value="po"><span>Po realizácii</span></label>
      </div>
      <div class="zakazka__akcie">
        <label class="tlacidlo tlacidlo--male pridat"><input type="file" accept="image/*" multiple>${IKONA_PLUS}Pridať fotky</label>
        <button type="button" class="tlacidlo tlacidlo--obrys tlacidlo--male" data-upravit>Upraviť</button>
        <button type="button" class="tlacidlo tlacidlo--zmazat tlacidlo--male" data-zmazat>Zmazať</button>
      </div>
      <form class="zakazka__uprava" hidden novalidate>
        <label>Názov<input name="nazov" maxlength="120"></label>
        <label>Druh stavby<select name="kategoria">${KATEGORIE.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
        <div class="akcie"><button class="tlacidlo tlacidlo--male" type="submit">Uložiť</button><button class="tlacidlo tlacidlo--obrys tlacidlo--male" type="button" data-zrusit>Zrušiť</button></div>
      </form>
      <ul class="fronta"></ul>
      <details><summary></summary><div class="admin-mriezka"></div></details>`;
    obnovKartu(el, z);

    $('input[type=file]', el).addEventListener('change', (e) => {
      const subory = [...e.target.files];
      e.target.value = '';
      const oznacenie = $(`input[name="ozn-${z.id}"]:checked`, el)?.value || '';
      if (subory.length) nahrajDoZakazky(z, subory, el, oznacenie);
    });
    const uprava = $('.zakazka__uprava', el);
    $('[data-upravit]', el).addEventListener('click', () => {
      uprava.hidden = !uprava.hidden;
      uprava.nazov.value = z.nazov;
      uprava.kategoria.value = z.kategoria;
      if (!uprava.hidden) uprava.nazov.focus();
    });
    $('[data-zrusit]', el).addEventListener('click', () => { uprava.hidden = true; });
    uprava.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nazov = uprava.nazov.value.trim();
      if (!nazov) { oznam('Napíšte názov zákazky.', true); return; }
      try {
        const d = await api(`/api/zakazky?id=${encodeURIComponent(z.id)}`, { method: 'PUT', body: { nazov, kategoria: uprava.kategoria.value } });
        Object.assign(z, d.zakazka);
        obnovKartu(el, z);
        uprava.hidden = true;
        oznam('Zákazka uložená');
      } catch (err) {
        oznam(err.message, true);
      }
    });
    const zmaz = $('[data-zmazat]', el);
    zmaz.addEventListener('click', () => dvojklik(zmaz, 'Naozaj zmazať?', async () => {
      zmaz.disabled = true;
      try {
        await api(`/api/zakazky?id=${encodeURIComponent(z.id)}`, { method: 'DELETE' });
        stav.galeria.zakazky = stav.galeria.zakazky.filter((x) => x.id !== z.id);
        vykresliZakazky();
        oznam(`Zákazka ${z.nazov} je zmazaná`);
      } catch (err) {
        zmaz.disabled = false;
        oznam(err.message, true);
      }
    }));
    return el;
  }

  tvarNova.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('[type=submit]', tvarNova);
    const nazov = tvarNova.nazov.value.trim();
    const kategoria = $('input[name="kat"]:checked', vyberKat)?.value || 'strechy';
    if (!nazov) {
      oznam('Napíšte názov zákazky.', true);
      tvarNova.nazov.focus();
      return;
    }
    const { zakazky, max } = stav.galeria;
    if (zakazky.length >= max) {
      const zmaze = zakazky.slice(max - 1);
      if (!confirm(`Vytvorením novej zákazky sa zmaže ${zmaze.map((z) => `„${z.nazov}“`).join(', ')} aj s fotkami. Pokračovať?`)) return;
    }
    btn.disabled = true;
    try {
      const d = await api('/api/zakazky', { method: 'POST', body: { nazov, kategoria } });
      const zmazane = new Set((d.zmazane || []).map((x) => x.id));
      stav.galeria.zakazky = [d.zakazka, ...stav.galeria.zakazky.filter((z) => !zmazane.has(z.id))];
      tvarNova.nazov.value = '';
      vykresliZakazky();
      const karta = zakazkyBox.firstElementChild;
      karta?.classList.add('zakazka--nova');
      karta?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      oznam(d.zmazane?.length ? `Zákazka vytvorená, zmazaná najstaršia: ${d.zmazane.map((x) => x.nazov).join(', ')}` : 'Zákazka vytvorená. Pridajte do nej fotky.');
    } catch (err) {
      oznam(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  limitVstup.addEventListener('change', async () => {
    const n = Math.min(50, Math.max(1, Math.round(num(limitVstup.value)) || 10));
    limitVstup.value = n;
    if (!stav.nastavenia) {
      oznam('Nastavenia sa ešte načítavajú, skúste to o chvíľu.', true);
      return;
    }
    const predtym = stav.nastavenia.galeria?.maxZakaziek ?? stav.galeria.max;
    stav.nastavenia.galeria = { ...(stav.nastavenia.galeria || {}), maxZakaziek: n };
    try {
      await ulozNastavenia();
      stav.galeria.max = n;
      vykresliZakazky();
      oznam(`Na webe bude najviac ${n} zákaziek`);
    } catch (err) {
      stav.nastavenia.galeria.maxZakaziek = predtym;
      limitVstup.value = predtym;
      oznam(err.message, true);
    }
  });

  async function zmensi(file, max, kvalita) {
    let zdroj;
    let url;
    try {
      zdroj = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      url = URL.createObjectURL(file);
      zdroj = new Image();
      zdroj.src = url;
      await zdroj.decode();
    }
    const w = zdroj.width;
    const h = zdroj.height;
    const k = Math.min(1, max / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * k);
    canvas.height = Math.round(h * k);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(zdroj, 0, 0, canvas.width, canvas.height);
    zdroj.close?.();
    if (url) URL.revokeObjectURL(url);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', kvalita));
    if (!blob) throw new Error('Fotku sa nepodarilo zmenšiť.');
    return blob;
  }

  function odosli(url, form, pokrok) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) pokrok(e.loaded / e.total); };
      xhr.onload = () => {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch { /* */ }
        if (xhr.status === 401) ukazPrihlasenie('Prihlásenie vypršalo. Prihláste sa znova.');
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data?.chyba || `Server odpovedal chybou ${xhr.status}.`));
      };
      xhr.onerror = () => reject(new Error('Prerušené pripojenie. Skúste to znova.'));
      xhr.send(form);
    });
  }

  async function nahraj(file, z, li, el, oznacenie = '') {
    const stavText = $('.stav', li);
    const pruh = $('progress', li);
    const img = $('img', li);
    try {
      stavText.textContent = 'Zmenšujem…';
      let foto;
      let nahlad;
      try {
        foto = await zmensi(file, 2000, 0.82);
        if (foto.size > 3.8 * 1024 * 1024) foto = await zmensi(file, 1600, 0.7);
        nahlad = await zmensi(file, 640, 0.74);
      } catch {
        if (/^image\/(jpeg|png|webp)$/.test(file.type) && file.size < 3.8 * 1024 * 1024) {
          foto = file;
          nahlad = null;
        } else {
          throw new Error('Tento formát fotky sa nedá spracovať. Skúste fotku vo formáte JPG.');
        }
      }
      img.src = URL.createObjectURL(nahlad || foto);
      stavText.textContent = 'Nahrávam…';
      pruh.hidden = false;
      const form = new FormData();
      form.append('foto', foto, 'foto.jpg');
      if (nahlad) form.append('nahlad', nahlad, 'nahlad.jpg');
      const data = await odosli(`/api/photos?zakazka=${encodeURIComponent(z.id)}${oznacenie ? `&oznacenie=${oznacenie}` : ''}`, form, (p) => { pruh.value = p; });
      z.fotky.push(data.foto);
      obnovKartu(el, z);
      pruh.hidden = true;
      stavText.textContent = oznacenie ? `Nahraté ako ${oznacenie === 'pred' ? 'pred realizáciou' : 'po realizácii'}` : 'Nahraté';
      stavText.className = 'stav stav--ok';
      setTimeout(() => li.remove(), 5000);
      return true;
    } catch (e) {
      pruh.hidden = true;
      stavText.textContent = e.message;
      stavText.className = 'stav stav--chyba';
      return false;
    }
  }

  async function nahrajDoZakazky(z, subory, el, oznacenie = '') {
    el.classList.remove('zakazka--nova');
    const fronta = $('.fronta', el);
    const polozky = subory.map((f) => {
      const li = document.createElement('li');
      li.innerHTML = '<img alt=""><div><div class="nazov-suboru"></div><div class="stav">Čaká…</div><progress max="1" value="0" hidden></progress></div>';
      $('.nazov-suboru', li).textContent = f.name;
      fronta.append(li);
      return li;
    });
    let ok = 0;
    for (let i = 0; i < subory.length; i += 1) {
      if (await nahraj(subory[i], z, polozky[i], el, oznacenie)) ok += 1;
    }
    if (ok) oznam(`Pridané do zákazky: ${pocetFotiek(ok)}`);
    aktualizujVarovanie();
  }

  // ---------- Nastavenia (cenník + firma) ----------
  async function nacitajNastavenia() {
    try {
      stav.nastavenia = await api('/api/settings');
      vykresliPodmenu();
      vykresliCennik();
      vyplnFirmu();
    } catch (e) {
      oznam(e.message, true);
    }
  }

  async function ulozNastavenia() {
    stav.nastavenia = await api('/api/settings', { method: 'PUT', body: stav.nastavenia });
  }

  // ---------- Cenníky: Cenník, Cena práce a vlastné kategórie ----------
  const ZAKLADNE_ZOZNAMY = ['cennik', 'praca'];
  stav.zoznam = 'cennik';
  const zoznamy = () => stav.nastavenia?.cenniky || [];
  const aktualnyZoznam = () => zoznamy().find((z) => z.id === stav.zoznam) || zoznamy()[0];
  const IKONY_ZOZNAMOV = {
    cennik: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="7.5" cy="8.5" r="1.5" fill="currentColor"/></svg>',
    praca: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4l6 6-3 3-6-6zM11 7l-8 8 3 3 8-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    vlastny: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 2h9v11H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  };

  function vykresliPodmenu() {
    const nav = $('[data-podmenu]');
    nav.replaceChildren();
    for (const z of zoznamy()) {
      const a = document.createElement('a');
      a.href = '#cennik';
      a.dataset.zoznam = z.id;
      a.innerHTML = `${IKONY_ZOZNAMOV[z.id] || IKONY_ZOZNAMOV.vlastny}<span></span>`;
      $('span', a).textContent = z.nazov;
      a.addEventListener('click', (e) => {
        stav.zoznam = z.id;
        vykresliCennik();
        if (location.hash === '#cennik') { e.preventDefault(); ukazKartu(); }
      });
      nav.append(a);
    }
    const nova = document.createElement('button');
    nova.type = 'button';
    nova.className = 'podmenu__nova';
    nova.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Nová kategória';
    nova.addEventListener('click', otvorNovuKategoriu);
    nav.append(nova);
    const firma = document.createElement('a');
    firma.href = '#firma';
    firma.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 4l9 7M5 10v10h14V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2"/></svg>Údaje na ponuke';
    nav.append(firma);
  }

  // Nová kategória (vlastný zoznam)
  const dialogKat = $('[data-nova-kat]');
  function otvorNovuKategoriu() {
    if (!stav.nastavenia) { oznam('Nastavenia sa ešte načítavajú, skúste to o chvíľu.', true); return; }
    if (stav.cennikZmeneny && !confirm('V cenníku máte neuložené zmeny. Uložia sa spolu s novou kategóriou. Pokračovať?')) return;
    $('#nova-kat-nazov').value = '';
    dialogKat.showModal();
    $('#nova-kat-nazov').focus();
  }
  $('[data-nova-kat-zrusit]').addEventListener('click', () => dialogKat.close());
  $('[data-nova-kat-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nazov = $('#nova-kat-nazov').value.trim();
    if (!nazov) { $('#nova-kat-nazov').focus(); return; }
    if (zoznamy().some((z) => z.nazov.toLowerCase() === nazov.toLowerCase())) {
      oznam('Kategória s takým názvom už existuje.', true);
      return;
    }
    const id = `k-${Date.now().toString(36)}`;
    stav.nastavenia.cenniky.push({ id, nazov, polozky: [] });
    try {
      await ulozNastavenia();
      stav.cennikZmeneny = false;
      dialogKat.close();
      stav.zoznam = id;
      vykresliPodmenu();
      vykresliCennik();
      location.hash = 'cennik';
      oznam(`Kategória ${nazov} je vytvorená. Pridajte do nej položky.`);
    } catch (err) {
      stav.nastavenia.cenniky = stav.nastavenia.cenniky.filter((z) => z.id !== id);
      oznam(err.message, true);
    }
  });

  function skupinyCennika(polozky) {
    const skupiny = new Map();
    polozky.forEach((p, i) => {
      if (!skupiny.has(p.kategoria)) skupiny.set(p.kategoria, []);
      skupiny.get(p.kategoria).push(i);
    });
    return skupiny;
  }

  const jednotkyHtml = (vybrana) => {
    const zoznam = JEDNOTKY.includes(vybrana) || !vybrana ? JEDNOTKY : [...JEDNOTKY, vybrana];
    return zoznam.map((j) => `<option${j === vybrana ? ' selected' : ''}>${esc(j)}</option>`).join('');
  };

  function vykresliCennik() {
    const z = aktualnyZoznam();
    if (!z) return;
    stav.zoznam = z.id;
    $('[data-zoznam-nazov]').textContent = z.nazov;
    $('[data-zmazat-zoznam]').hidden = ZAKLADNE_ZOZNAMY.includes(z.id);
    $('[data-zoznam-napoveda]').textContent = z.id === 'praca'
      ? 'Ceny práce bez DPH, napríklad hodinové sadzby alebo práca za m². V ponuke sa spočítajú zvlášť od cenníka.'
      : z.id === 'cennik'
        ? 'Tu si nastavíte položky a ceny bez DPH. Pri tvorbe ponuky ich vyberiete jedným ťuknutím a cenu môžete v ponuke ešte zmeniť.'
        : `Vlastná kategória. Položky a ceny bez DPH, v ponuke sa spočítajú zvlášť pod názvom ${z.nazov}.`;
    $$('[data-podmenu] a[data-zoznam]').forEach((a) => a.classList.toggle('aktivny', a.dataset.zoznam === z.id));
    const box = $('[data-cennik]');
    box.replaceChildren();
    for (const [kat, indexy] of skupinyCennika(z.polozky)) {
      const sek = document.createElement('section');
      sek.className = 'cennik-skupina';
      sek.innerHTML = '<h2></h2>';
      $('h2', sek).textContent = kat;
      for (const i of indexy) {
        const p = z.polozky[i];
        const r = document.createElement('div');
        r.className = 'cennik-riadok';
        r.dataset.i = i;
        r.innerHTML = `
          <label class="nazov">Názov položky<input data-pole="nazov" value="${esc(p.nazov)}"></label>
          <label>MJ<select data-pole="jednotka">${jednotkyHtml(p.jednotka)}</select></label>
          <label>Cena bez DPH (€)<input data-pole="cena" inputmode="decimal" value="${esc(vstup(p.cena))}" class="${p.cena ? '' : 'bez-ceny'}"></label>
          <button type="button" aria-label="Odstrániť položku ${esc(p.nazov)}">Odstrániť</button>`;
        sek.append(r);
      }
      const pridat = document.createElement('button');
      pridat.type = 'button';
      pridat.className = 'tlacidlo tlacidlo--obrys tlacidlo--male pridat-polozku';
      pridat.textContent = 'Pridať položku';
      pridat.addEventListener('click', () => pridajDoCennika(kat));
      sek.append(pridat);
      box.append(sek);
    }
    if (!z.polozky.length) {
      const prazdny = document.createElement('div');
      prazdny.className = 'prazdne-admin';
      prazdny.innerHTML = '<p>Zoznam je zatiaľ prázdny.</p>';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tlacidlo tlacidlo--male';
      b.textContent = 'Pridať prvú položku';
      b.addEventListener('click', () => pridajDoCennika(z.id === 'praca' ? 'Práca' : z.nazov));
      prazdny.append(b);
      box.append(prazdny);
    }
  }

  function pridajDoCennika(kat) {
    const c = aktualnyZoznam().polozky;
    let kam = c.length;
    for (let i = c.length - 1; i >= 0; i -= 1) if (c[i].kategoria === kat) { kam = i + 1; break; }
    c.splice(kam, 0, { kategoria: kat, nazov: '', jednotka: aktualnyZoznam().id === 'praca' ? 'hod' : 'm²', cena: 0 });
    stav.cennikZmeneny = true;
    vykresliCennik();
    $(`.cennik-riadok[data-i="${kam}"] input`)?.focus();
  }

  $('[data-cennik]').addEventListener('input', (e) => {
    const r = e.target.closest('.cennik-riadok');
    if (!r) return;
    const p = aktualnyZoznam().polozky[Number(r.dataset.i)];
    const pole = e.target.dataset.pole;
    if (pole === 'cena') {
      p.cena = num(e.target.value);
      e.target.classList.toggle('bez-ceny', !p.cena);
    } else {
      p[pole] = e.target.value;
    }
    stav.cennikZmeneny = true;
  });
  $('[data-cennik]').addEventListener('click', (e) => {
    const btn = e.target.closest('.cennik-riadok button');
    if (!btn) return;
    aktualnyZoznam().polozky.splice(Number(btn.closest('.cennik-riadok').dataset.i), 1);
    stav.cennikZmeneny = true;
    vykresliCennik();
  });
  $('[data-pridat-kategoriu]').addEventListener('click', () => {
    const vstupKat = $('[data-nova-kategoria]');
    const kat = vstupKat.value.trim();
    if (!kat) {
      vstupKat.focus();
      return;
    }
    vstupKat.value = '';
    pridajDoCennika(kat);
  });
  $('[data-ulozit-cennik]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await ulozNastavenia();
      stav.cennikZmeneny = false;
      vykresliPodmenu();
      vykresliCennik();
      oznam(`${aktualnyZoznam().nazov}: uložené`);
    } catch (err) {
      oznam(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });
  $('[data-premenovat-zoznam]').addEventListener('click', async () => {
    const z = aktualnyZoznam();
    const nazov = (prompt('Nový názov', z.nazov) || '').trim();
    if (!nazov || nazov === z.nazov) return;
    const stary = z.nazov;
    z.nazov = nazov.slice(0, 60);
    try {
      await ulozNastavenia();
      stav.cennikZmeneny = false;
      vykresliPodmenu();
      vykresliCennik();
      oznam('Názov je zmenený');
    } catch (err) {
      z.nazov = stary;
      oznam(err.message, true);
    }
  });
  const btnZmazatZoznam = $('[data-zmazat-zoznam]');
  btnZmazatZoznam.addEventListener('click', () => dvojklik(btnZmazatZoznam, 'Naozaj zmazať aj s položkami?', async () => {
    const z = aktualnyZoznam();
    if (ZAKLADNE_ZOZNAMY.includes(z.id)) return;
    const zaloha = stav.nastavenia.cenniky;
    stav.nastavenia.cenniky = zaloha.filter((x) => x.id !== z.id);
    try {
      await ulozNastavenia();
      stav.cennikZmeneny = false;
      stav.zoznam = 'cennik';
      vykresliPodmenu();
      vykresliCennik();
      location.hash = 'ponuky';
      oznam(`Kategória ${z.nazov} je zmazaná`);
    } catch (err) {
      stav.nastavenia.cenniky = zaloha;
      oznam(err.message, true);
    }
  }));

  // Firma
  const formFirma = $('[data-firma]');
  function vyplnFirmu() {
    const f = stav.nastavenia.firma;
    for (const el of formFirma.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox') el.checked = Boolean(f[el.name]);
      else el.value = el.name === 'sadzbaDph' || el.name === 'platnostDni' ? vstup(f[el.name]) : f[el.name] ?? '';
    }
  }
  formFirma.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formFirma.querySelector('[type=submit]');
    const f = { ...stav.nastavenia.firma };
    for (const el of formFirma.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox') f[el.name] = el.checked;
      else if (el.name === 'sadzbaDph' || el.name === 'platnostDni') f[el.name] = num(el.value);
      else f[el.name] = el.value.trim();
    }
    btn.disabled = true;
    const zaloha = stav.nastavenia.firma;
    stav.nastavenia.firma = f;
    try {
      await ulozNastavenia();
      vyplnFirmu();
      oznam('Údaje na ponuke uložené');
    } catch (err) {
      stav.nastavenia.firma = zaloha;
      oznam(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Ponuky: zoznam ----------
  const zoznamBox = $('[data-ponuky-zoznam]');
  const editor = $('[data-ponuka-editor]');

  async function nacitajPonuky() {
    try {
      stav.ponuky = (await api('/api/offers')).ponuky || [];
    } catch (e) {
      oznam(e.message, true);
    }
    vykresliZoznam();
  }

  function vykresliZoznam() {
    const hladat = $('[data-hladat-ponuku]').value.trim().toLowerCase();
    const ul = $('[data-zoznam-ponuk]');
    const ponuky = stav.ponuky.filter((p) => !hladat || `${p.id} ${p.zakaznik} ${p.predmet}`.toLowerCase().includes(hladat));
    ul.replaceChildren();
    if (!ponuky.length) {
      ul.innerHTML = `<li class="prazdne-admin">${stav.ponuky.length ? 'Žiadna ponuka nezodpovedá hľadaniu.' : 'Zatiaľ tu nie je žiadna ponuka. Vytvorte prvú tlačidlom Nová ponuka.'}</li>`;
      return;
    }
    for (const p of ponuky) {
      const li = document.createElement('li');
      li.innerHTML = `<button type="button">
        <span><span class="cislo">${esc(p.id)}</span> ${esc(p.zakaznik || 'Bez mena')}</span>
        <span class="suma">${eur.format(p.spolu || 0)}</span>
        <span class="predmet">${esc(p.predmet || '')}</span>
        <span class="meta">${esc(datumSk(p.datum))}<span class="stitok" data-stav="${esc(p.stav)}">${esc(p.stav)}</span></span>
      </button>`;
      li.querySelector('button').addEventListener('click', () => otvorPonuku(p.id));
      ul.append(li);
    }
  }
  $('[data-hladat-ponuku]').addEventListener('input', vykresliZoznam);

  function novaPonuka() {
    const f = stav.nastavenia?.firma || {};
    return {
      id: null, datum: dnes(), stav: 'rozpracovaná',
      zakaznik: { meno: '', adresa: '', telefon: '', email: '' },
      miesto: '', predmet: '', polozky: [], zlava: 0,
      platcaDph: Boolean(f.platcaDph), sadzbaDph: f.sadzbaDph ?? 23, platnostDni: f.platnostDni ?? 30,
      vymery: { plocha: 0, dlzka: 0, atika: 0 },
      poznamka: '',
    };
  }

  async function otvorPonuku(id) {
    try {
      stav.ponuka = await api(`/api/offers?id=${encodeURIComponent(id)}`);
      ukazEditor();
    } catch (e) {
      oznam(e.message, true);
    }
  }

  $('[data-nova-ponuka]').addEventListener('click', () => {
    stav.ponuka = novaPonuka();
    ukazEditor();
    stav.ponukaZmenena = false;
    $('[name="zakaznik.meno"]', editor).focus();
  });

  function zavriEditor() {
    if (stav.ponukaZmenena && !confirm('Máte neuložené zmeny v ponuke. Zahodiť ich?')) return;
    stav.ponukaZmenena = false;
    stav.ponuka = null;
    editor.hidden = true;
    zoznamBox.hidden = false;
    window.scrollTo(0, 0);
  }
  $('[data-spat]').addEventListener('click', zavriEditor);

  // ---------- Ponuky: úprava ----------
  const jednotkyList = document.createElement('datalist');
  jednotkyList.id = 'jednotky';
  jednotkyList.innerHTML = JEDNOTKY.map((j) => `<option value="${j}">`).join('');
  document.body.append(jednotkyList);

  function ukazEditor() {
    window.KMGPdf?.priprav().catch(() => {});
    const p = stav.ponuka;
    zoznamBox.hidden = true;
    editor.hidden = false;
    $('[data-ponuka-nadpis]').textContent = p.id ? `Ponuka ${p.id}` : 'Nová ponuka';
    for (const el of editor.elements) {
      if (!el.name) continue;
      const v = getPath(p, el.name);
      if (el.type === 'checkbox') el.checked = Boolean(v);
      else if (CISELNE.includes(el.name)) el.value = v ? vstup(v) : '';
      else el.value = v ?? '';
    }
    $('[data-zmazat-ponuku]').hidden = !p.id;
    $('[data-duplikovat]').hidden = !p.id;
    vykresliPolozky();
    window.scrollTo(0, 0);
  }

  function vykresliPolozky() {
    const ol = $('[data-polozky]');
    ol.replaceChildren();
    stav.ponuka.polozky.forEach((x, i) => {
      const li = document.createElement('li');
      li.dataset.i = i;
      li.innerHTML = `
        ${x.skupina ? `<span class="polozka-skupina">${esc(x.skupina)}</span>` : ''}
        <label class="nazov"><span>Popis</span><input data-pole="nazov" value="${esc(x.nazov)}" placeholder="Popis práce alebo materiálu"></label>
        <label><span>Množstvo</span><input data-pole="mnozstvo" inputmode="decimal" value="${esc(vstup(x.mnozstvo))}"></label>
        <label><span>MJ</span><input data-pole="jednotka" list="jednotky" value="${esc(x.jednotka)}"></label>
        <label><span>Cena za MJ (€)</span><input data-pole="cena" inputmode="decimal" value="${esc(vstup(x.cena))}"></label>
        <div class="spolu"><small>Spolu</small><output></output></div>
        <button type="button" class="odstranit" aria-label="Odstrániť položku">Odstrániť</button>`;
      ol.append(li);
    });
    $('[data-bez-poloziek]').hidden = stav.ponuka.polozky.length > 0;
    prepocitaj();
  }

  function spocitaj(p) {
    const medzisucet = r2(p.polozky.reduce((s, x) => s + r2(num(x.mnozstvo) * num(x.cena)), 0));
    const zlava = r2((medzisucet * num(p.zlava)) / 100);
    const zaklad = r2(medzisucet - zlava);
    const dph = p.platcaDph ? r2((zaklad * num(p.sadzbaDph)) / 100) : 0;
    return { medzisucet, zlava, zaklad, dph, spolu: r2(zaklad + dph) };
  }

  // Medzisúčty podľa kategórie (Cenník, Cena práce, vlastné), ak ich je v ponuke viac
  function sumyPodlaSkupin(p) {
    const m = new Map();
    p.polozky.forEach((x) => {
      const k = x.skupina || 'Ostatné';
      m.set(k, r2((m.get(k) || 0) + r2(num(x.mnozstvo) * num(x.cena))));
    });
    return m;
  }

  function suctyHtml(p, s) {
    let h = '';
    const skupiny = sumyPodlaSkupin(p);
    if (skupiny.size > 1) for (const [k, v] of skupiny) h += `<dt>${esc(k)}</dt><dd>${eur.format(v)}</dd>`;
    h += `<dt class="${skupiny.size > 1 ? 'medzisucet' : ''}">Medzisúčet</dt><dd class="${skupiny.size > 1 ? 'medzisucet' : ''}">${eur.format(s.medzisucet)}</dd>`;
    if (s.zlava) h += `<dt>Zľava ${cislo.format(num(p.zlava))} %</dt><dd>−${eur.format(s.zlava)}</dd>`;
    if (p.platcaDph) {
      h += `<dt>Základ dane</dt><dd>${eur.format(s.zaklad)}</dd><dt>DPH ${cislo.format(num(p.sadzbaDph))} %</dt><dd>${eur.format(s.dph)}</dd>`;
      h += `<dt class="spolu">Spolu s DPH</dt><dd class="spolu">${eur.format(s.spolu)}</dd>`;
    } else {
      h += `<dt class="spolu">Spolu</dt><dd class="spolu">${eur.format(s.spolu)}</dd>`;
    }
    return h;
  }

  function prepocitaj() {
    const p = stav.ponuka;
    $('[data-sadzba]').hidden = !p.platcaDph;
    $$('[data-polozky] li').forEach((li) => {
      const x = p.polozky[Number(li.dataset.i)];
      $('output', li).textContent = eur.format(r2(num(x.mnozstvo) * num(x.cena)));
    });
    $('[data-sucty]').innerHTML = suctyHtml(p, spocitaj(p));
  }

  // Výmery: plocha (m²) a dĺžka (bm) sa prenesú do množstva položiek s rovnakou jednotkou
  const CISELNE = ['zlava', 'sadzbaDph', 'platnostDni', 'vymery.plocha', 'vymery.dlzka', 'vymery.atika'];
  // Položky atiky v bm berú obvod atiky; ostatné bm dĺžku; m² plochu.
  const druhPolozky = (x) => {
    const t = String(x.jednotka || '').trim().toLowerCase().replace(/\s+/g, '');
    if (t === 'm²' || t === 'm2') return 'plocha';
    if (t === 'bm' || t === 'm') return /atik/i.test(String(x.nazov)) ? 'atika' : 'dlzka';
    return null;
  };
  function predvoleneMnozstvo(polozka) {
    const druh = druhPolozky(polozka);
    const v = druh ? num(stav.ponuka.vymery?.[druh]) : 0;
    return v || 1;
  }
  function prenesVymery(druh, stare) {
    const nove = num(stav.ponuka.vymery?.[druh]);
    let zmena = false;
    stav.ponuka.polozky.forEach((x) => {
      if (druhPolozky(x) !== druh) return;
      const m = num(x.mnozstvo);
      // prepíšeme len množstvá, ktoré nikto ručne nezmenil
      if (!m || m === stare || (m === 1 && !stare)) {
        x.mnozstvo = nove || 1;
        zmena = true;
      }
    });
    if (zmena) {
      $$('[data-polozky] li').forEach((li) => {
        const x = stav.ponuka.polozky[Number(li.dataset.i)];
        const inp = $('[data-pole="mnozstvo"]', li);
        if (inp && document.activeElement !== inp) inp.value = vstup(x.mnozstvo);
      });
    }
  }

  editor.addEventListener('input', (e) => {
    const t = e.target;
    const p = stav.ponuka;
    const li = t.closest('[data-polozky] li');
    if (li) {
      const x = p.polozky[Number(li.dataset.i)];
      x[t.dataset.pole] = ['mnozstvo', 'cena'].includes(t.dataset.pole) ? num(t.value) : t.value;
    } else if (t.name) {
      if (t.type === 'checkbox') setPath(p, t.name, t.checked);
      else if (CISELNE.includes(t.name)) {
        const stare = num(getPath(p, t.name));
        setPath(p, t.name, num(t.value));
        if (t.name.startsWith('vymery.')) prenesVymery(t.name.slice(7), stare);
      } else setPath(p, t.name, t.value);
    }
    stav.ponukaZmenena = true;
    prepocitaj();
  });
  // Checkbox a select vyvolajú aj „input“ v moderných prehliadačoch; pre istotu ich spracujeme aj tu.
  editor.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.name || !(t.type === 'checkbox' || t.tagName === 'SELECT')) return;
    setPath(stav.ponuka, t.name, t.type === 'checkbox' ? t.checked : t.value);
    stav.ponukaZmenena = true;
    prepocitaj();
  });

  editor.addEventListener('click', (e) => {
    const btn = e.target.closest('.odstranit');
    if (!btn) return;
    stav.ponuka.polozky.splice(Number(btn.closest('li').dataset.i), 1);
    stav.ponukaZmenena = true;
    vykresliPolozky();
  });

  $('[data-vlastna]').addEventListener('click', () => {
    stav.ponuka.polozky.push({ nazov: '', jednotka: 'ks', mnozstvo: 1, cena: 0 });
    stav.ponukaZmenena = true;
    vykresliPolozky();
    $('[data-polozky] li:last-child input').focus();
  });

  // Výber položiek z cenníkov (karty: Cenník, Cena práce, vlastné kategórie)
  const vyber = $('[data-vyber]');
  let pridaneVyberom = 0;
  let vyberZoznam = 'cennik';
  function vykresliVyber() {
    const hladat = $('[data-vyber-hladat]').value.trim().toLowerCase();
    const karty = $('[data-vyber-karty]');
    karty.replaceChildren();
    zoznamy().forEach((z) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = z.nazov;
      b.setAttribute('aria-pressed', String(!hladat && z.id === vyberZoznam));
      b.addEventListener('click', () => {
        vyberZoznam = z.id;
        $('[data-vyber-hladat]').value = '';
        vykresliVyber();
      });
      karty.append(b);
    });
    const box = $('[data-vyber-zoznam]');
    box.replaceChildren();
    // Pri hľadaní prehľadá všetky cenníky, inak ukáže vybraný
    const zdroje = hladat ? zoznamy() : zoznamy().filter((z) => z.id === vyberZoznam);
    let pocet = 0;
    for (const z of zdroje) {
      const skupiny = new Map();
      z.polozky.forEach((p) => {
        if (hladat && !`${p.nazov} ${p.kategoria} ${z.nazov}`.toLowerCase().includes(hladat)) return;
        if (!skupiny.has(p.kategoria)) skupiny.set(p.kategoria, []);
        skupiny.get(p.kategoria).push(p);
      });
      for (const [kat, polozky] of skupiny) {
        const h = document.createElement('h3');
        h.textContent = hladat ? `${z.nazov}: ${kat}` : kat;
        box.append(h);
        for (const p of polozky) {
          pocet += 1;
          const b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = `<span class="n">${esc(p.nazov)}</span><span class="cena${p.cena ? '' : ' nula'}">${p.cena ? `${eur.format(p.cena)} / ${esc(p.jednotka)}` : `bez ceny / ${esc(p.jednotka)}`}</span>`;
          b.addEventListener('click', () => {
            stav.ponuka.polozky.push({ nazov: p.nazov, jednotka: p.jednotka, mnozstvo: predvoleneMnozstvo(p), cena: p.cena, skupina: z.nazov });
            stav.ponukaZmenena = true;
            pridaneVyberom += 1;
            vykresliPolozky();
            const n = $('.n', b);
            n.classList.add('pridane');
            n.textContent = `Pridané: ${p.nazov}`;
            setTimeout(() => { n.classList.remove('pridane'); n.textContent = p.nazov; }, 1200);
          });
          box.append(b);
        }
      }
    }
    if (!pocet) {
      const prazdny = hladat ? 'Nič sa nenašlo.' : 'Tento zoznam je prázdny. Položky si nastavíte v Ponukách cez tlačidlo s jeho názvom.';
      box.innerHTML = `<p class="prazdne-admin">${prazdny}</p>`;
    }
  }
  $('[data-z-cennika]').addEventListener('click', () => {
    pridaneVyberom = 0;
    $('[data-vyber-hladat]').value = '';
    if (!zoznamy().some((z) => z.id === vyberZoznam)) vyberZoznam = 'cennik';
    vykresliVyber();
    vyber.showModal();
  });
  $('[data-vyber-hladat]').addEventListener('input', vykresliVyber);
  $('[data-vyber-hotovo]').addEventListener('click', () => vyber.close());
  vyber.addEventListener('close', () => {
    if (pridaneVyberom) {
      const inputs = $$('[data-polozky] li [data-pole="mnozstvo"]');
      inputs[inputs.length - pridaneVyberom]?.focus();
      inputs[inputs.length - pridaneVyberom]?.select();
    }
  });

  async function ulozPonuku() {
    const p = stav.ponuka;
    const nova = !p.id;
    const ulozena = await api('/api/offers', { method: 'POST', body: p });
    stav.ponuka = ulozena;
    stav.ponukaZmenena = false;
    $('[data-ponuka-nadpis]').textContent = `Ponuka ${ulozena.id}`;
    $('[data-zmazat-ponuku]').hidden = false;
    $('[data-duplikovat]').hidden = false;
    const suhrn = { id: ulozena.id, datum: ulozena.datum, stav: ulozena.stav, zakaznik: ulozena.zakaznik.meno, predmet: ulozena.predmet, spolu: ulozena.sucty.spolu };
    stav.ponuky = [suhrn, ...stav.ponuky.filter((x) => x.id !== ulozena.id)].sort((a, b) => b.id.localeCompare(a.id));
    vykresliZoznam();
    return nova;
  }

  editor.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = editor.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const nova = await ulozPonuku();
      oznam(nova ? `Ponuka ${stav.ponuka.id} uložená` : 'Zmeny uložené');
    } catch (err) {
      oznam(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  $('[data-duplikovat]').addEventListener('click', () => {
    const p = structuredClone(stav.ponuka);
    delete p.vytvorene; delete p.upravene; delete p.sucty;
    stav.ponuka = { ...p, id: null, datum: dnes(), stav: 'rozpracovaná' };
    ukazEditor();
    stav.ponukaZmenena = true;
    oznam('Kópia je pripravená. Nezabudnite ju uložiť.');
  });

  $('[data-zmazat-ponuku]').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    dvojklik(btn, 'Naozaj zmazať ponuku?', async () => {
      try {
        const id = stav.ponuka.id;
        await api(`/api/offers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        stav.ponuky = stav.ponuky.filter((x) => x.id !== id);
        stav.ponukaZmenena = false;
        zavriEditor();
        vykresliZoznam();
        oznam(`Ponuka ${id} zmazaná`);
      } catch (err) {
        oznam(err.message, true);
      }
    });
  });

  // ---------- Tlač / PDF ----------
  function vymeryText(p) {
    const v = p.vymery || {};
    return [num(v.plocha) && `Plocha: ${cislo.format(num(v.plocha))} m²`, num(v.dlzka) && `Dĺžka: ${cislo.format(num(v.dlzka))} bm`, num(v.atika) && `Atika: ${cislo.format(num(v.atika))} bm`].filter(Boolean).join('   ');
  }

  function tlacovaVerzia() {
    const p = stav.ponuka;
    const f = stav.nastavenia?.firma || {};
    const s = spocitaj(p);
    const riadkyFirmy = [
      f.adresa,
      [f.ico && `IČO: ${f.ico}`, f.dic && `DIČ: ${f.dic}`].filter(Boolean).join(', '),
      f.icdph && `IČ DPH: ${f.icdph}`,
      f.telefon && `Tel.: ${f.telefon}`,
      f.email,
      f.web,
      f.iban && `IBAN: ${f.iban}`,
    ].filter(Boolean).map(esc).join('<br>');
    const z = p.zakaznik || {};
    const riadkyZak = [z.meno && `<strong>${esc(z.meno)}</strong>`, esc(z.adresa), z.telefon && `Tel.: ${esc(z.telefon)}`, esc(z.email)].filter(Boolean).join('<br>');
    const skupiny = sumyPodlaSkupin(p);
    const viac = skupiny.size > 1;
    const poradie = viac ? [...skupiny.keys()].flatMap((k) => p.polozky.filter((x) => (x.skupina || 'Ostatné') === k)) : p.polozky;
    let cislovanie = 0;
    let polozky = '';
    let posledna = null;
    poradie.forEach((x) => {
      const k = x.skupina || 'Ostatné';
      if (viac && k !== posledna) {
        if (posledna !== null) polozky += `<tr class="t-medzisucet"><td></td><td colspan="4">Spolu ${esc(posledna)}</td><td class="c">${eur.format(skupiny.get(posledna))}</td></tr>`;
        polozky += `<tr class="t-skupina"><td colspan="6">${esc(k)}</td></tr>`;
        posledna = k;
      }
      cislovanie += 1;
      polozky += `<tr><td>${cislovanie}.</td><td>${esc(x.nazov)}</td><td class="c">${cislo.format(num(x.mnozstvo))}</td><td>${esc(x.jednotka)}</td><td class="c">${eur.format(num(x.cena))}</td><td class="c">${eur.format(r2(num(x.mnozstvo) * num(x.cena)))}</td></tr>`;
    });
    if (viac && posledna !== null) polozky += `<tr class="t-medzisucet"><td></td><td colspan="4">Spolu ${esc(posledna)}</td><td class="c">${eur.format(skupiny.get(posledna))}</td></tr>`;
    let sucty = viac ? [...skupiny].map(([k, v]) => `<tr><td>${esc(k)}</td><td class="c">${eur.format(v)}</td></tr>`).join('') : '';
    sucty += `<tr><td>Medzisúčet</td><td class="c">${eur.format(s.medzisucet)}</td></tr>`;
    if (s.zlava) sucty += `<tr><td>Zľava ${cislo.format(num(p.zlava))} %</td><td class="c">−${eur.format(s.zlava)}</td></tr>`;
    if (p.platcaDph) sucty += `<tr><td>Základ dane</td><td class="c">${eur.format(s.zaklad)}</td></tr><tr><td>DPH ${cislo.format(num(p.sadzbaDph))} %</td><td class="c">${eur.format(s.dph)}</td></tr>`;
    sucty += `<tr class="spolu"><td>${p.platcaDph ? 'Spolu s DPH' : 'Spolu'}</td><td class="c">${eur.format(s.spolu)}</td></tr>`;
    const platnost = p.platnostDni ? ` &nbsp; Platnosť do: ${datumSk(pridajDni(p.datum, p.platnostDni))}` : '';

    return `
      <header class="t-hlava">
        <img src="/assets/img/logo.png" alt="">
        <div class="t-firma"><strong>${esc(f.nazov || 'KMG stav')}</strong><br>${riadkyFirmy}</div>
      </header>
      <h1>Cenová ponuka č. ${esc(p.id)}</h1>
      <p class="t-meta">Dátum: ${datumSk(p.datum)}${platnost}</p>
      <div class="t-strany">
        <div><h2>Pre</h2><p>${riadkyZak || '&nbsp;'}</p></div>
        ${p.miesto ? `<div><h2>Miesto stavby</h2><p>${esc(p.miesto)}</p></div>` : ''}
      </div>
      ${p.predmet ? `<p class="t-predmet"><strong>${esc(p.predmet)}</strong></p>` : ''}
      ${vymeryText(p) ? `<p class="t-meta">${esc(vymeryText(p))}</p>` : ''}
      <table>
        <thead><tr><th>Č.</th><th>Popis</th><th class="c">Množstvo</th><th>MJ</th><th class="c">Cena za MJ</th><th class="c">Spolu</th></tr></thead>
        <tbody>${polozky || '<tr><td colspan="6">Bez položiek</td></tr>'}</tbody>
      </table>
      <table class="t-sucty"><tbody>${sucty}</tbody></table>
      ${p.poznamka ? `<p class="t-poznamka">${esc(p.poznamka)}</p>` : ''}
      <p class="t-pata">${p.platcaDph ? '' : 'Nie sme platcami DPH. '}${esc(f.pata || '')}</p>
      <div class="t-podpis"><span>Vypracoval</span></div>`;
  }

  // Záloha: tlač cez prehliadač, ak by sa PDF nedalo vytvoriť priamo
  async function tlacitPonuku() {
    const tlac = $('#tlac');
    tlac.innerHTML = tlacovaVerzia();
    await Promise.all([...tlac.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
    await document.fonts?.ready;
    const titul = document.title;
    document.title = (window.KMGPdf?.nazovSuboru(stav.ponuka) || `Cenova-ponuka-${stav.ponuka.id}`).replace(/\.pdf$/, '');
    window.addEventListener('afterprint', () => { document.title = titul; }, { once: true });
    window.print();
  }

  // ---------- PDF: stiahnuť a poslať ----------
  async function pdfPonuky() {
    if (!stav.ponuka.id || stav.ponukaZmenena) await ulozPonuku();
    if (!window.KMGPdf) throw new Error('Nástroj na PDF sa nenačítal.');
    const blob = await window.KMGPdf.vytvor(stav.ponuka, stav.nastavenia?.firma);
    return { blob, nazov: window.KMGPdf.nazovSuboru(stav.ponuka) };
  }
  function stiahni(blob, nazov) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nazov;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function sCakanim(btn, text, akcia) {
    const povodny = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = text;
    try {
      await akcia();
    } finally {
      btn.disabled = false;
      btn.innerHTML = povodny;
    }
  }

  const btnStiahnut = $('[data-stiahnut]');
  const btnPoslat = $('[data-poslat]');
  try {
    const skuska = new File(['x'], 'skuska.pdf', { type: 'application/pdf' });
    btnPoslat.hidden = !(navigator.canShare && navigator.canShare({ files: [skuska] }));
  } catch {
    btnPoslat.hidden = true;
  }

  btnStiahnut.addEventListener('click', () => sCakanim(btnStiahnut, 'Pripravujem PDF…', async () => {
    try {
      const { blob, nazov } = await pdfPonuky();
      stiahni(blob, nazov);
      oznam(`PDF ponuky ${stav.ponuka.id} je stiahnuté`);
    } catch (err) {
      if (!stav.ponuka?.id) { oznam(err.message, true); return; }
      oznam('PDF sa nepodarilo vytvoriť priamo, otváram tlač. Zvoľte Uložiť ako PDF.', true);
      try { await tlacitPonuku(); } catch (e2) { oznam(e2.message, true); }
    }
  }));

  btnPoslat.addEventListener('click', () => sCakanim(btnPoslat, 'Pripravujem…', async () => {
    let pdf;
    try {
      pdf = await pdfPonuky();
    } catch (err) {
      oznam(err.message, true);
      return;
    }
    const subor = new File([pdf.blob], pdf.nazov, { type: 'application/pdf' });
    try {
      await navigator.share({ files: [subor], title: `Cenová ponuka ${stav.ponuka.id}` });
    } catch (err) {
      if (err.name === 'AbortError') return;
      stiahni(pdf.blob, pdf.nazov);
      oznam('Poslať sa nepodarilo, PDF som stiahol do telefónu.');
    }
  }));

  // ---------- Aplikácia (PWA) ----------
  const samostatne = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  const instalPas = $('[data-instal-pas]');
  const navod = $('[data-navod]');
  let instalacia = null;
  if (!samostatne) instalPas.hidden = false;

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    instalacia = e;
  });
  addEventListener('appinstalled', () => {
    instalPas.hidden = true;
    oznam('Aplikácia KMG je na ploche');
  });
  $('[data-instal-zavriet]').addEventListener('click', () => { instalPas.hidden = true; });
  $('[data-navod-zavriet]').addEventListener('click', () => navod.close());

  const IKONA_ZDIELAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  function krokyInstalacie() {
    const ua = navigator.userAgent;
    const iOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (iOS) {
      return [
        `Ťuknite na <strong>Zdieľať</strong> ${IKONA_ZDIELAT} (v Safari dole uprostred, v Chrome hore vpravo).`,
        'Zrolujte nižšie a vyberte <strong>Pridať na plochu</strong>.',
        'Ťuknite na <strong>Pridať</strong>. Ikona KMG bude na ploche.',
      ];
    }
    if (/samsungbrowser/i.test(ua)) {
      return [
        'Ťuknite na menu <strong>☰</strong> dole vpravo.',
        'Vyberte <strong>Pridať stránku na</strong> a potom <strong>Domovská obrazovka</strong>.',
        'Potvrďte <strong>Pridať</strong>.',
      ];
    }
    if (/firefox/i.test(ua) && /android/i.test(ua)) {
      return ['Ťuknite na menu <strong>⋮</strong>.', 'Vyberte <strong>Inštalovať</strong> alebo <strong>Pridať na plochu</strong>.'];
    }
    if (/android/i.test(ua)) {
      return [
        'Ťuknite na <strong>⋮</strong> vpravo hore v prehliadači.',
        'Vyberte <strong>Inštalovať aplikáciu</strong> alebo <strong>Pridať na plochu</strong>.',
        'Potvrďte <strong>Inštalovať</strong>.',
      ];
    }
    return [
      'V Chrome alebo Edge kliknite na ikonu inštalácie vpravo v adresnom riadku.',
      'Alebo otvorte menu <strong>⋮</strong> a vyberte <strong>Inštalovať KMG</strong> (prípadne <strong>Uložiť a zdieľať → Inštalovať stránku ako aplikáciu</strong>).',
      'Na telefóne otvorte túto adresu v mobile a pridajte si ju na plochu.',
    ];
  }

  $('[data-instalovat]').addEventListener('click', async () => {
    if (instalacia) {
      instalacia.prompt();
      const { outcome } = await instalacia.userChoice;
      instalacia = null;
      if (outcome === 'accepted') instalPas.hidden = true;
      return;
    }
    $('[data-navod-kroky]').innerHTML = krokyInstalacie().map((k) => `<li>${k}</li>`).join('');
    navod.showModal();
  });

  // ---------- Štart ----------
  (async () => {
    try {
      const { rola } = await api('/api/login');
      if (rola) prihlaseny(rola);
      else ukazPrihlasenie('');
    } catch (e) {
      ukazPrihlasenie(e.message);
    }
  })();
})();
