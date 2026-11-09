# KMG stav – web

Web pre KMG stav: strechy, oplechovanie atík, chaty, prístrešky, altánky, pergoly a drevodomy.

| Adresa | Čo tam je |
|---|---|
| `kmg.sk` | Úvod: služby, ukážka realizácií, postup, kontakt |
| `kmg.sk/galeria` | Posledné zákazky (albumy fotiek) s filtrom podľa druhu stavby |
| `kmg.sk/admin` | Správa webu a aplikácia (na heslo): **Fotky** a **Ponuky**. Cenník, Cena práce, vlastné kategórie a údaje na ponuke sú v Ponukách. |
| `kmg.sk/fotky`, `kmg.sk/ponuky` | Skratky, ktoré otvoria príslušnú záložku v správe |

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

### 5. Doména z Websupportu
1. Vo Verceli: **Settings → Domains → Add**, zadajte `kmg.sk` a potom aj `www.kmg.sk`.
2. Vercel ukáže DNS záznamy, ktoré treba nastaviť (A záznam pre `kmg.sk`, CNAME pre `www`).
3. Vo Websupport admine: **Domény → kmg.sk → DNS**. Zmažte staré A/AAAA záznamy pre `@` a `www`
   (ak smerujú na Websupport hosting) a pridajte presne tie, ktoré ukázal Vercel.
4. Zmena sa prejaví do pár hodín. HTTPS certifikát nastaví Vercel sám.

E-mail `kmg.stav@gmail.com` beží na Gmaile, takže zmena DNS ho neovplyvní.

## Čo ešte doplniť
- **IČO a DIČ sú vymyslené.** Opravte ich v `public/index.html` a `public/galeria.html` (päta stránky)
  a v správe webu v **Ponuky → Údaje na ponuke** (tie sa tlačia na ponuky).
- **Adresa** – v **Ponuky → Údaje na ponuke**.
- **Facebook** – v `public/index.html` je zatiaľ odkaz na vyhľadávanie „KMG stav“.
  Nahraďte ho priamou adresou stránky (napr. `https://www.facebook.com/...`).
- **Ceny v cenníku** sú nastavené na 0 €. Položky bez ceny sú v Cenníku zvýraznené.

## Ako sa to používa
- **Fotky (zákazky):** Nová zákazka → názov (napr. „Rekonštrukcia strechy, Žilina“) a druh stavby →
  Vytvoriť zákazku → **Pridať fotky**. Fotky sa v telefóne samé zmenšia a na webe sa objavia do pol minúty.
  Každá zákazka je na webe jeden album. Na webe ostáva najviac **10** posledných zákaziek
  (počet sa dá zmeniť v aplikácii). Pri vytvorení ďalšej sa najstaršia zákazka **zmaže aj s fotkami**,
  aplikácia na to vopred upozorní. Zákazku aj jednotlivé fotky sa dá premenovať a zmazať.
  Pri nahrávaní sa fotky dajú voliteľne označiť **Pred realizáciou** / **Po realizácii** (aj neskôr ťuknutím
  na štítok pri fotke). Ak má zákazka fotky pred aj po, web ukáže interaktívne porovnanie s posuvnou čiarou –
  v albume zákazky aj v sekcii **Pred a po** na úvodnej stránke.
- **Ponuky:** Nová ponuka → zákazník → **Výmery** (plocha v m², dĺžka v bm, atika v bm) → Pridať z cenníka
  (alebo vlastnú položku) → Uložiť. Výmery sa samé doplnia ako množstvo ku všetkým položkám v m² a bm;
  pri položke sa dajú ručne zmeniť (napr. fólia s presahom) a ručne zmenené sa potom neprepisujú.
  Položky atiky v bm (oplechovanie, podkladová konštrukcia, demontáž) berú výmeru **Atika**, ostatné bm berú **Dĺžku**.
  **Stiahnuť PDF** uloží hotový súbor do telefónu (napr. `Cenova-ponuka-2026-001-Jan-Novak.pdf`).
  **Poslať** (v mobile) ho rovno odošle cez WhatsApp, e-mail a pod.
  Čísla ponúk idú za sebou podľa roka: 2026-001, 2026-002…
- **Cenník, Cena práce a vlastné kategórie** (tlačidlá hore v Ponukách): každá je samostatný zoznam položiek
  s jednotkami a cenami bez DPH. **+ Nová kategória** vytvorí ďalší zoznam (napr. Materiál, Doprava, Lešenie),
  ktorý sa dá premenovať aj zmazať; Cenník a Cena práce sa zmazať nedajú. V ponuke sa položky pridávajú
  cez **Pridať z cenníka** (karty podľa kategórií, hľadanie vo všetkých). Ak sú v ponuke položky z viacerých
  kategórií, editor aj PDF ich zoskupia a ukážu súčet za každú kategóriu zvlášť (napr. Cenník, Cena práce).
  V ponuke sa cena dá vždy zmeniť.
  Atiky sa účtujú v bm podľa rozvinutej šírky plechu (r.š. do 330 / do 500 / nad 500 mm).
- **Údaje na ponuke** (v Ponukách): údaje do hlavičky ponuky, platca DPH, sadzba DPH, platnosť ponuky, text pod ponukou.

## Aplikácia v mobile (PWA)
Správa webu sa dá nainštalovať na plochu telefónu ako aplikácia s ikonou KMG:
- **Android (Chrome):** otvorte `kmg.sk/admin` a ťuknite na **Inštalovať appku** v hlavičke
  (alebo menu ⋮ → **Pridať na plochu**).
- **iPhone (Safari):** otvorte `kmg.sk/admin`, ťuknite **Zdieľať** → **Pridať na plochu**.

Po dlhom podržaní ikony sú skratky **Pridať fotky** a **Nová cenová ponuka**.
Prihlásenie vydrží 180 dní. Bez internetu sa aplikácia otvorí, ale fotky a ponuky sa načítajú až po pripojení.

## Technika (pre programátora)
- Statické stránky v `public/` (HTML, CSS, JS bez buildu), funkcie vo `api/` (Vercel Functions, Node).
- Dáta vo Vercel Blob: `zakazky/<zid>/*.json` (názov, druh, označenia pred/po), `galeria/<zid>/<fid>.jpg`, `nahlady/…` (zmenšeniny),
  staršie fotky `galeria/<kategoria>/<fid>.jpg`, `nastavenia/*.json` (firma, `cenniky[]`, galéria),
  `ponuky/<cislo>/*.json`. Každé uloženie vytvorí novú verziu súboru a staré zmaže.
- Prihlásenie: heslo sa porovnáva na serveri, prehliadač dostane podpísaný HttpOnly cookie na 180 dní.
- Ponuky sú uložené v úložisku ako súbory s náhodnými, neuhádnuteľnými adresami a zoznam vidí len admin.
- PDF ponuky sa vytvára priamo v prehliadači (knižnica pdf-lib, MIT) s vloženým písmom KMG Pismo –
  podmnožina písma Carlito (SIL OFL 1.1, licencia v `public/assets/pdf/LICENSE-Carlito.txt`).
- Fotka po zmenšení môže mať najviac 4 MB (limit Vercel funkcie je 4,5 MB).
- Bezplatný plán Vercel Hobby je podľa podmienok Vercelu len na nekomerčné použitie. Pre firemný web
  je oficiálne potrebný plán Pro.
