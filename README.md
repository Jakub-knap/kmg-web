# KMG stav – web

Web pre KMG stav: strechy, oplechovanie atík, chaty, prístrešky, altánky, pergoly a drevodomy.

| Adresa | Čo tam je |
|---|---|
| `kmgstav.sk` | Úvod: služby, ukážka realizácií, postup, kontakt |
| `kmgstav.sk/galeria` | Posledné zákazky (albumy fotiek) s filtrom podľa druhu stavby |
| `kmgstav.sk/admin` | Správa webu a aplikácia (na heslo): **Fotky**, **Ponuky** a **Faktúry**. Cenník, Cena práce, vlastné kategórie a údaje firmy sú v Ponukách. |
| `kmgstav.sk/fotky`, `kmgstav.sk/ponuky` | Skratky, ktoré otvoria príslušnú záložku v správe |

## Nasadenie (raz, asi 15 minút)

### 1. GitHub
1. Na github.com vytvorte nový **súkromný** repozitár, napr. `kmg-web`.
2. Nahrajte doň **obsah** tohto priečinka (nie zip): `api/`, `public/`, `package.json`, `vercel.json`, `README.md`, `.gitignore`.

### 2. Vercel
1. Na vercel.com: **Add New → Project**, vyberte repozitár `kmg-web`.
2. Framework Preset nechajte **Other** a kliknite **Deploy**.

### 3. Úložisko na fotky a ponuky
1. V projekte otvorte **Storage → Create Database → Blob**.
2. Ak sa pýta na prístup, zvoľte **Public**.
3. Pripojte úložisko k projektu `kmg-web` (Connect Project).

### 4. Heslá
V projekte **Settings → Environment Variables** pridajte:

| Názov | Hodnota | Povinné |
|---|---|---|
| `ADMIN_PASSWORD` | heslo do celej správy (fotky, ponuky, cenník, firma) | áno |
| `FOTKY_PASSWORD` | druhé heslo len na pridávanie fotiek, napr. pre partiu na stavbe | nie |
| `SESSION_SECRET` | dlhý náhodný text (30+ znakov) | odporúčané |

Potom **Deployments → … → Redeploy**, aby sa heslá načítali.
Zmena hesla odhlási všetkých, ktorí boli prihlásení.

### 5. Doména z Websupportu (kmgstav.sk) – napojená 9. 11. 2026
Hlavná adresa je `www.kmgstav.sk`, `kmgstav.sk` na ňu presmeruje (voľba Vercelu „Redirect apex domains to www“).

Nastavenie vo Websupporte (**Služby → kmgstav.sk → DNS → DNS nastavenia**):

| Typ | Pre adresu | Hodnota |
|---|---|---|
| A | (prázdne) = `kmgstav.sk` | `216.198.79.1` |
| CNAME | `www` | `3977eb96c3b259f0.vercel-dns-017.com.` |

- Zmazané boli: A a AAAA pre `kmgstav.sk` a `www.kmgstav.sk` (pôvodne smerovali na server Websupportu).
- Nechané bez zmeny: `*`, `admin`, `mail`, `webmail`, `smtp`, `pop3`, `imap`, `autodiscover`, `autoconfig`, MX, TXT.
- CNAME je vlastný cieľ projektu podľa Vercelu. Starší všeobecný `cname.vercel-dns.com` tiež funguje,
  Vercel pri ňom len ukazuje žlté „DNS Change Recommended“.
- Ak by sa doména niekedy pridávala nanovo: Vercel → projekt `kmg-web` → **Settings → Domains → Add Existing**.
  Hodnoty vždy overte na karte domény vo Verceli (**View DNS configuration**).
- Chyba `ERR_CERT_COMMON_NAME_INVALID` hneď po zmene DNS je normálna. Zmizne, keď Vercel dokončí
  certifikát („Generating SSL Certificate“ → „Valid Configuration“).

E-mail `kmg.stav@gmail.com` beží na Gmaile, takže zmena DNS ho neovplyvní.

## Čo ešte doplniť
- **IČO, DIČ a adresa sú vymyslené.** Prepíšte ich v aplikácii v **Ponuky → Údaje na ponuke**.
  Kým sú vymyslené, web ich nezobrazuje (na ponukách sa tlačia) a aplikácia na to upozorňuje.
- **Facebook** – adresu stránky zadajte tamtiež (pole Facebook stránka). Kým je prázdne,
  odkaz na webe vedie na vyhľadávanie „KMG stav“ na Facebooku.
- **Ceny v cenníku** sú nastavené na 0 €. Položky bez ceny sú v Cenníku zvýraznené.
- **Na faktúry** (Ponuky → Údaje na ponuke, časť „Na faktúre“): obchodné meno živnostníka, zápis v živnostenskom
  registri a IBAN. Kým chýbajú, záložka Faktúry na to upozorňuje; bez IBAN nebude na faktúre QR platba.

## Ako sa to používa
- **Fotky (zákazky):** Nová zákazka → názov (napr. „Rekonštrukcia strechy, Žilina“) a druh stavby →
  Vytvoriť zákazku → **Pridať fotky**. Fotky sa v telefóne samé zmenšia (najviac 2000 px, JPG, väčšinou 0,3–0,8 MB) a na webe sa objavia
  do 2 minút po nahratí celej dávky.
  Každá zákazka je na webe jeden album. Na webe ostáva najviac **10** posledných zákaziek
  (počet sa dá zmeniť v aplikácii). Pri vytvorení ďalšej sa najstaršia zákazka **zmaže aj s fotkami**,
  aplikácia na to vopred upozorní. Zákazku aj jednotlivé fotky sa dá premenovať a zmazať.
  Pri nahrávaní sa fotky dajú voliteľne označiť **Pred realizáciou** / **Po realizácii** (aj neskôr ťuknutím
  na štítok pri fotke). Ak má zákazka fotky pred aj po, web ukáže interaktívne porovnanie s posuvnou čiarou –
  v albume zákazky aj v sekcii **Pred a po** na úvodnej stránke.
- **Ponuky:** Nová ponuka → zákazník → **Výmery** (plocha v m², dĺžka v bm, atika v bm) → v časti Položky
  „Pridať položky z:“ ťuknite **Cenník** (materiál a práce podľa cenníka), potom **Cena práce** (prípadne vlastnú
  kategóriu alebo vlastnú položku) → Uložiť. Výmery sa samé doplnia ako množstvo ku všetkým položkám v m² a bm;
  pri položke sa dajú ručne zmeniť (napr. fólia s presahom) a ručne zmenené sa potom neprepisujú.
  Položky atiky v bm (oplechovanie, podkladová konštrukcia, demontáž) berú výmeru **Atika**, ostatné bm berú **Dĺžku**.
  **Stiahnuť PDF** uloží hotový súbor do telefónu (napr. `Cenova-ponuka-2026-001-Jan-Novak.pdf`).
  **Poslať** (v mobile) ho rovno odošle cez WhatsApp, e-mail a pod.
  Čísla ponúk idú za sebou podľa roka: 2026-001, 2026-002…
- **Cenník, Cena práce a vlastné kategórie** (tlačidlá hore v Ponukách): každá je samostatný zoznam položiek
  s jednotkami a cenami bez DPH. **+ Nová kategória** vytvorí ďalší zoznam (napr. Materiál, Doprava, Lešenie),
  ktorý sa dá premenovať aj zmazať; Cenník a Cena práce sa zmazať nedajú. V ponuke má každý zoznam
  vlastné tlačidlo (Cenník, Cena práce, …); v okne výberu sa dá prepínať kartami hore a hľadať vo všetkých. Ak sú v ponuke položky z viacerých
  kategórií, editor aj PDF ich zoskupia a ukážu súčet za každú kategóriu zvlášť (napr. Cenník, Cena práce).
  V ponuke sa cena dá vždy zmeniť.
  Atiky sa účtujú v bm podľa rozvinutej šírky plechu (r.š. do 330 / do 500 / nad 500 mm).
- **Faktúry:** tri časti pod sebou.
  - **Na vystavenie** – prijaté ponuky (stav „prijatá“), z ktorých ešte nie je faktúra. Ťuknite **Vystaviť faktúru**.
    Rovnaké tlačidlo je aj priamo v uloženej ponuke (ponuke pri tom nastaví stav „prijatá“).
  - **Nezaplatené** – zoradené podľa splatnosti, po splatnosti sú červené. Tlačidlo **Zaplatená** faktúru presunie do archívu.
  - **Archív – zaplatené** – zelené, s dátumom zaplatenia. Omylom zaplatenú vrátite v detaile faktúry.
  Faktúra preberie z ponuky zákazníka, predmet a položky; v editore sa dá všetko upraviť (pri firme doplňte IČO/DIČ).
  Číslo dostane pri **Vystaviť**: 2026001, 2026002… (rovnaké je aj variabilným symbolom). Splatnosť je podľa
  nastavenia (predvolene 14 dní). **Stiahnuť PDF / Poslať** vytvorí faktúru s QR kódom **PAY by square** – zákazník
  ho naskenuje v aplikácii banky a platba sa vyplní sama. Zaplatená faktúra má v PDF pečiatku „UHRADENÉ“ a QR kód nemá.
  Údaje dodávateľa sa do faktúry zapíšu pri uložení; kým nie je zaplatená, každé uloženie ich obnoví podľa nastavení.
  Faktúra sa dá vystaviť aj bez ponuky (**Prázdna faktúra**).
  Pozor: aplikácia nie je účtovný program – správnosť údajov na faktúre si overte s účtovníkom.
- **Údaje na ponuke** (v Ponukách): údaje do hlavičky ponuky, platca DPH, sadzba DPH, platnosť ponuky, text pod ponukou.
  Tie isté údaje sa zobrazujú aj **na webe**: telefóny (viac čísel oddeľte čiarkou) v úvode, v kontakte a v plávajúcom
  tlačidle, e-mail a Facebook v kontakte, adresa, IČO, DIČ a IČ DPH v päte stránky. Na webe sa zmena prejaví do 2 minút.

## Limity bezplatného úložiska (Vercel Blob, plán Hobby, mesačne)
| Čo | Limit | Ako to vychádza |
|---|---|---|
| Miesto | 1 GB | fotka + náhľad ≈ 0,6 MB → asi 1 500 fotiek; 10 zákaziek po 30 fotkách ≈ 200 MB |
| Prenos | 10 GB | stovky návštevníkov, ktorí si prezerajú veľké fotky |
| Pokročilé operácie (nahratie, výpis súborov) | 2 000 | nahratie fotky = 2, uloženie ponuky/faktúry/zákazky/údajov ≈ 2–4, otvorenie aplikácie ≈ 4; **návštevy webu = 0** |
| Jednoduché operácie (čítanie súboru mimo cache) | 10 000 | návšteva webu ≈ 1 |

- **Po prekročení limitu Vercel úložisko na 30 dní zablokuje** (zmiznú fotky na webe aj ponuky v aplikácii).
  Vercel predtým pošle e-mail. Na pláne Pro (20 $ mesačne) sa úložisko neblokuje, spotreba nad rámec sa doplatí
  (pri vašom objeme centy) a Pro je aj oficiálne určený na firemné použitie.
- Web preto nečíta úložisko výpisom pri každej návšteve, ale jeden hotový súbor `verejne/web.json`,
  ktorý sa obnoví len pri zmene v aplikácii.
- **Aj prezeranie súborov úložiska vo Vercel dashboarde (Storage → Browser) sa počíta do operácií** – zbytočne tam neklikajte.
- Spotreba sa dá pozrieť vo Verceli: **Storage → kmg-web-blob → Usage** (alebo Observability → Blob).

## Aplikácia v mobile (PWA)
Správa webu sa dá nainštalovať na plochu telefónu ako aplikácia s ikonou KMG:
- **Android (Chrome):** otvorte `kmgstav.sk/admin` a ťuknite na **Inštalovať appku** v hlavičke
  (alebo menu ⋮ → **Pridať na plochu**).
- **iPhone (Safari):** otvorte `kmgstav.sk/admin`, ťuknite **Zdieľať** → **Pridať na plochu**.

Po dlhom podržaní ikony sú skratky **Pridať fotky** a **Nová cenová ponuka**.
Prihlásenie vydrží 180 dní. Bez internetu sa aplikácia otvorí, ale fotky a ponuky sa načítajú až po pripojení.

## Technika (pre programátora)
- Statické stránky v `public/` (HTML, CSS, JS bez buildu), funkcie vo `api/` (Vercel Functions, Node).
- Dáta vo Vercel Blob: `zakazky/<zid>/*.json` (názov, druh, označenia pred/po), `galeria/<zid>/<fid>.jpg`, `nahlady/…` (zmenšeniny),
  staršie fotky `galeria/<kategoria>/<fid>.jpg`, `nastavenia/*.json` (firma, `cenniky[]`, galéria),
  `ponuky/<cislo>/*.json`, `faktury/<cislo>/*.json` (so snímkou údajov dodávateľa). Každé uloženie vytvorí novú
  verziu súboru a staré zmaže.
- Faktúry: `api/faktury.js` (GET zoznam/detail, POST uloženie a číslovanie RRRRNNN, PUT stav platby, DELETE).
  QR platba: `public/assets/js/qr-platba.js` – vlastný QR enkóder a PAY by square 1.2.0 (CRC32, LZMA1 lc=3 lp=0 pb=2
  len s literálmi a koncovou značkou, base32hex), bez externých knižníc; overené dekódovaním cez Python `lzma` a OpenCV.
- Verejný web volá len `GET /api/web` (zákazky, limit a údaje o firme bez IBAN a bez vymyslených hodnôt).
  Odpoveď sa číta zo súboru `verejne/web.json` (prepisuje sa, cache 60 s), nie výpisom úložiska.
  Súbor obnovujú zmeny zákaziek, označení a mazanie fotiek priamo na serveri, po dávke fotiek
  `POST /api/verejne` z aplikácie a uloženie údajov o firme alebo limitu (`PUT /api/settings?verejne=1`).
  Aplikácia (prihlásený používateľ) dostáva z `GET /api/zakazky` čerstvý stav jedným výpisom celého úložiska.
  `GET /api/zakazky`, `/api/firma` a `/api/photos` bez prihlásenia vracajú tiež len dáta z verejného súboru.
- `site.js` prepíše telefóny, e-mail, Facebook a pätu údajmi z aplikácie; v HTML ostávajú telefóny a e-mail ako záloha.
- Prihlásenie: heslo sa porovnáva na serveri, prehliadač dostane podpísaný HttpOnly cookie na 180 dní.
- Ponuky sú uložené v úložisku ako súbory s náhodnými, neuhádnuteľnými adresami a zoznam vidí len admin.
- PDF ponuky sa vytvára priamo v prehliadači (knižnica pdf-lib, MIT) s vloženým písmom KMG Pismo –
  podmnožina písma Carlito (SIL OFL 1.1, licencia v `public/assets/pdf/LICENSE-Carlito.txt`).
- Fotka po zmenšení môže mať najviac 4 MB (limit Vercel funkcie je 4,5 MB).
- Bezplatný plán Vercel Hobby je podľa podmienok Vercelu len na nekomerčné použitie. Pre firemný web
  je oficiálne potrebný plán Pro.
