#!/usr/bin/env python3
"""Generátor statických stránok KMG stav: stránky služieb (SEO Bardejov), Ochrana osobných údajov,
spoločná päta, sitemap.xml a robots.txt.

Spustenie z koreňa repozitára:  python3 nastroje/stranky.py
Vygenerované súbory sa commitujú (Vercel nič nespúšťa). Texty upravujte tu a skript spustite znova.
"""
import datetime
import html
import json
import pathlib
import re

KOREN = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = KOREN / 'public'
WEB = 'https://www.kmgstav.sk'
DNES = datetime.date.today().isoformat()
PLATNE_OD = '10. 11. 2026'
MESTO = 'Bardejov'
OBLAST = 'Bardejov a okolie'

TEL = [('0951 259 327', '+421951259327'), ('0914 138 335', '+421914138335')]
EMAIL = 'kmg.stav@gmail.com'
FB_HLADAT = 'https://www.facebook.com/search/top?q=KMG%20stav'

IKONA_TEL = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z"/></svg>'

e = html.escape

# ---------------------------------------------------------------- služby
SLUZBY = [
    {
        'slug': 'strechy-bardejov',
        'kratko': 'Strechy',
        'kategorie': ['strechy'],
        'title': 'Strechy Bardejov – nové strechy a rekonštrukcie striech | KMG stav',
        'description': 'Nové strechy a rekonštrukcie striech v Bardejove a okolí: krov, plechové krytiny, klampiarske práce a odkvapy. Obhliadka a cenová ponuka – KMG stav, 0951 259 327.',
        'h1': 'Strechy Bardejov',
        'podnadpis': 'Nové strechy a rekonštrukcie striech',
        'lead': 'Postavíme novú strechu alebo zrekonštruujeme starú – v Bardejove a okolí. Postaráme sa o celú strechu: od krovu cez krytinu a oplechovanie až po odkvapy.',
        'sluzba': 'Rekonštrukcia a výstavba striech',
        'obsah': [
            ('h2', 'Čo na streche urobíme'),
            ('ul', [
                'nový krov, oprava a výmena poškodených častí krovu',
                'demontáž starej krytiny',
                'poistná fólia, kontralaty a laty',
                'plechové krytiny: trapézový plech, plech v tvare škridly, falcovaná krytina, modulová krytina a krytina na klik',
                'klampiarske práce – oplechovanie komínov, štítov, úžľabí a atík',
                'odkvapové systémy – žľaby a zvody',
            ]),
            ('h2', 'Nová strecha alebo rekonštrukcia'),
            ('p', 'Pri rekonštrukcii najprv skontrolujeme krov a podklad. Podľa jeho stavu navrhneme, čo treba vymeniť – niekedy stačí nová fólia, laty a krytina, inokedy je potrebné opraviť aj časť krovu. Pri novostavbe staviame strechu od krovu až po posledný žľab.'),
            ('h2', 'Akú krytinu zvoliť'),
            ('dl', [
                ('Trapézový plech', 'jednoduchá a cenovo dostupná krytina, vhodná najmä na garáže, prístrešky a hospodárske stavby'),
                ('Plech v tvare škridly', 'vzhľadom pripomína klasickú škridlu, pritom je ľahký a rýchlo sa montuje – častá voľba na rodinné domy'),
                ('Falcovaná krytina', 'hladké pásy so stojatou drážkou pre moderný, čistý vzhľad strechy'),
                ('Modulová krytina', 'menšie dielce, ktoré sa dobre prispôsobia členitým strechám'),
                ('Krytina na klik', 'falcovaná krytina so zacvakávacím spojom a skrytým kotvením'),
            ]),
            ('p', 'Ktorá krytina sa hodí práve na vašu strechu, poradíme na obhliadke podľa sklonu strechy, tvaru a rozpočtu.'),
        ],
        'faq': [
            ('Koľko stojí nová strecha?', 'Cena závisí od plochy a tvaru strechy, zvolenej krytiny a stavu krovu. Po obhliadke a zameraní vám pripravíme cenovú ponuku s rozpisom materiálu a práce.'),
            ('Robíte aj klampiarske práce a odkvapy?', 'Áno. Oplechovanie komínov, štítov, úžľabí a atík aj nové žľaby a zvody robíme spolu so strechou alebo samostatne.'),
            ('Kde pracujete?', 'V Bardejove a okolí. Ak ste ďalej, zavolajte – dohodneme sa.'),
        ],
    },
    {
        'slug': 'oplechovanie-atiky-bardejov',
        'kratko': 'Atiky',
        'kategorie': ['atiky'],
        'title': 'Oplechovanie atiky Bardejov – atiky plochých striech na mieru | KMG stav',
        'description': 'Oplechovanie atík plochých striech a múrikov v Bardejove a okolí: zameranie, podkladová konštrukcia so spádom, oplechovanie s okapničkou. KMG stav, 0951 259 327.',
        'h1': 'Oplechovanie atiky Bardejov',
        'podnadpis': 'Atiky plochých striech a múrikov na mieru',
        'lead': 'Oplechujeme atiky plochých striech, múriky a štíty v Bardejove a okolí. Plech vyrobíme na mieru, so spádom a okapničkou, aby voda nestekala po fasáde.',
        'sluzba': 'Oplechovanie atiky',
        'obsah': [
            ('h2', 'Prečo na oplechovaní atiky záleží'),
            ('p', 'Atika je najviac vystavená dažďu, snehu a mrazu. Ak je oplechovanie poškodené alebo nemá spád, voda zateká do muriva, zatepľovacieho systému a fasády. Opravy fasády sú potom oveľa drahšie ako nové oplechovanie.'),
            ('h2', 'Čo urobíme'),
            ('ul', [
                'zameranie atiky a výrobu oplechovania na mieru',
                'demontáž starého oplechovania',
                'podkladovú konštrukciu so spádom smerom na strechu',
                'oplechovanie s okapničkou a správne riešenými rohmi a spojmi',
                'nadväzné klampiarske práce na streche',
            ]),
            ('h2', 'Ako sa počíta cena'),
            ('p', 'Oplechovanie atiky sa počíta za bežný meter (bm) podľa rozvinutej šírky plechu – teda podľa toho, aký široký je plech po rozložení (do 330 mm, do 500 mm alebo nad 500 mm). Presnú cenu vám povieme po zameraní.'),
        ],
        'faq': [
            ('Robíte len atiku, alebo aj celú strechu?', 'Oboje. Atiku oplechujeme samostatne, pri rekonštrukcii strechy ju riešime spolu s ostatnými klampiarskymi prácami.'),
            ('Čo ak je pod plechom poškodený podklad?', 'Pri demontáži starého oplechovania skontrolujeme podklad. Poškodené časti vymeníme a urobíme novú podkladovú konštrukciu so spádom.'),
            ('Kde pracujete?', 'V Bardejove a okolí. Ak ste ďalej, zavolajte – dohodneme sa.'),
        ],
    },
    {
        'slug': 'drevodomy-bardejov',
        'kratko': 'Drevodomy',
        'kategorie': ['drevodomy'],
        'title': 'Drevodomy Bardejov – drevené domy a stavby z dreva | KMG stav',
        'description': 'Drevodomy a stavby z dreva v Bardejove a okolí: drevená konštrukcia, krov a strecha z jednej ruky. KMG stav, 0951 259 327.',
        'h1': 'Drevodomy Bardejov',
        'podnadpis': 'Drevené domy a stavby z dreva',
        'lead': 'Staviame drevodomy a ďalšie stavby z dreva v Bardejove a okolí – drevenú konštrukciu, krov aj strechu. Drevo a strechy sú naša práca, preto ich máte z jednej ruky.',
        'sluzba': 'Stavba drevodomov',
        'obsah': [
            ('h2', 'Čo postavíme'),
            ('ul', [
                'drevenú nosnú konštrukciu domu',
                'krov a kompletnú strechu s krytinou',
                'klampiarske práce a odkvapy',
                'drevené prístavby a nadstavby',
            ]),
            ('h2', 'Prečo drevo'),
            ('p', 'Drevená stavba je ľahká, rýchlo sa stavia a dobre sa s ňou pracuje aj na menších pozemkoch. Rozsah prác, materiál a postup s vami dohodneme vopred a všetko uvidíte v cenovej ponuke.'),
        ],
        'faq': [
            ('Postavíte aj samotnú strechu na drevodom?', 'Áno. Krov a strechu robíme aj na drevostavby, ktoré staval niekto iný.'),
            ('Ako začať?', 'Zavolajte alebo napíšte. Prídeme sa pozrieť, prejdeme si vaše predstavy a projekt a pripravíme cenovú ponuku.'),
            ('Kde pracujete?', 'V Bardejove a okolí. Ak ste ďalej, zavolajte – dohodneme sa.'),
        ],
    },
    {
        'slug': 'chaty-bardejov',
        'kratko': 'Chaty',
        'kategorie': ['chaty'],
        'title': 'Chaty a chalupy Bardejov – drevené chaty, krovy a strechy | KMG stav',
        'description': 'Drevené chaty a chalupy v Bardejove a okolí – stavba od krovu po strechu, rekonštrukcie striech chát. KMG stav, 0951 259 327.',
        'h1': 'Chaty Bardejov',
        'podnadpis': 'Drevené chaty a chalupy',
        'lead': 'Postavíme drevenú chatu alebo chalupu v Bardejove a okolí, prípadne zrekonštruujeme strechu na tej, ktorú už máte.',
        'sluzba': 'Stavba drevených chát',
        'obsah': [
            ('h2', 'Čo urobíme'),
            ('ul', [
                'drevenú konštrukciu chaty',
                'krov a strechu s plechovou krytinou',
                'rekonštrukciu strechy na existujúcej chate',
                'prístrešky, terasy a ďalšie drevené doplnky k chate',
            ]),
            ('h2', 'Chata, ktorá vydrží'),
            ('p', 'Chata býva často v ťažšom teréne a vystavená počasiu. Preto dbáme na správnu strechu, oplechovanie a odvod vody – to rozhoduje o tom, ako dlho bude chata slúžiť bez opráv.'),
        ],
        'faq': [
            ('Opravíte aj strechu na starej chate?', 'Áno. Skontrolujeme krov, vymeníme poškodené časti a urobíme novú krytinu aj oplechovanie.'),
            ('Kde pracujete?', 'V Bardejove a okolí. Ak ste ďalej, zavolajte – dohodneme sa.'),
        ],
    },
    {
        'slug': 'pristresky-bardejov',
        'kratko': 'Prístrešky',
        'kategorie': ['pristresky'],
        'title': 'Prístrešky Bardejov – prístrešky na auto, drevo a nad terasu | KMG stav',
        'description': 'Drevené prístrešky na auto, na drevo a nad terasu v Bardejove a okolí, s plechovou krytinou. Na mieru – KMG stav, 0951 259 327.',
        'h1': 'Prístrešky Bardejov',
        'podnadpis': 'Prístrešky na auto, na drevo a nad terasu',
        'lead': 'Postavíme drevený prístrešok na auto, na drevo alebo nad terasu v Bardejove a okolí – v rozmeroch, ktoré potrebujete.',
        'sluzba': 'Stavba prístreškov',
        'obsah': [
            ('h2', 'Aké prístrešky robíme'),
            ('ul', [
                'prístrešky na auto pre jedno aj viac áut',
                'prístrešky na drevo',
                'prekrytie terasy alebo vstupu do domu',
                'pultové, sedlové aj ploché strechy prístreškov',
                'krytinu z trapézového plechu, plechu v tvare škridly alebo falcovanej krytiny',
            ]),
            ('h2', 'Na mieru vášmu pozemku'),
            ('p', 'Rozmery, tvar strechy aj krytinu prispôsobíme domu a pozemku. Prístrešok tak bude ladiť so strechou domu a voda z neho pôjde tam, kam má.'),
        ],
        'faq': [
            ('Môže mať prístrešok rovnakú krytinu ako dom?', 'Áno, krytinu vieme zvoliť tak, aby ladila so strechou domu.'),
            ('Kde pracujete?', 'V Bardejove a okolí. Ak ste ďalej, zavolajte – dohodneme sa.'),
        ],
    },
    {
        'slug': 'altanky-pergoly-bardejov',
        'kratko': 'Altánky a pergoly',
        'kategorie': ['altanky', 'pergoly'],
        'title': 'Altánky a pergoly Bardejov – drevené altánky do záhrady na mieru | KMG stav',
        'description': 'Drevené altánky a pergoly do záhrady v Bardejove a okolí, v rozmeroch podľa vás. KMG stav, 0951 259 327.',
        'h1': 'Altánky a pergoly Bardejov',
        'podnadpis': 'Drevené altánky a pergoly do záhrady',
        'lead': 'Postavíme drevený altánok alebo pergolu do vašej záhrady v Bardejove a okolí – v rozmeroch a tvare podľa vás.',
        'sluzba': 'Stavba altánkov a pergol',
        'obsah': [
            ('h2', 'Čo postavíme'),
            ('ul', [
                'záhradné altánky so strechou a krytinou',
                'pergoly k domu alebo na terasu',
                'altánky a pergoly v rozmeroch podľa vášho priestoru',
                'strechu altánku s plechovou krytinou a oplechovaním',
            ]),
            ('h2', 'Altánok, ktorý sedí do záhrady'),
            ('p', 'Tvar, veľkosť aj strechu altánku navrhneme tak, aby zapadol do záhrady a k domu. Všetko si vopred prejdeme a uvidíte to v cenovej ponuke.'),
        ],
        'faq': [
            ('Robíte altánky aj s pevnou strechou?', 'Áno. Altánky staviame so strechou a krytinou, rovnako ako ostatné strechy.'),
            ('Kde pracujete?', 'V Bardejove a okolí. Ak ste ďalej, zavolajte – dohodneme sa.'),
        ],
    },
    {
        'slug': 'pivnice-interiery-bardejov',
        'kratko': 'Pivnice a interiéry',
        'kategorie': ['interier'],
        'title': 'Pivnice a interiéry z dreva Bardejov – drevené obklady a úpravy | KMG stav',
        'description': 'Úpravy pivníc a interiérov z dreva v Bardejove a okolí – drevené obklady, podhľady a vybavenie. Najmä v zimnom období. KMG stav, 0951 259 327.',
        'h1': 'Pivnice a interiéry Bardejov',
        'podnadpis': 'Práce z dreva v interiéri a v pivniciach',
        'lead': 'Keď je zima a na strechách sa robiť nedá, pracujeme vo vnútri. V Bardejove a okolí upravíme pivnice a interiéry z dreva.',
        'sluzba': 'Úpravy pivníc a interiérov z dreva',
        'obsah': [
            ('h2', 'Čo urobíme'),
            ('ul', [
                'drevené obklady stien a stropov',
                'drevené podhľady',
                'úpravy a vybavenie pivníc z dreva',
                'ďalšie práce z dreva v interiéri podľa dohody',
            ]),
            ('h2', 'Zimné obdobie je na to ideálne'),
            ('p', 'Práce v interiéri plánujeme najmä na zimu, keď sú strechy v pokoji. Ak chcete mať pivnicu alebo izbu hotovú do jari, ozvite sa včas.'),
        ],
        'faq': [
            ('Robíte interiéry aj mimo zimy?', 'Väčšinou ich plánujeme na zimné mesiace. Termín si dohodneme podľa toho, ako máme rozpracované strechy.'),
            ('Kde pracujete?', 'V Bardejove a okolí. Ak ste ďalej, zavolajte – dohodneme sa.'),
        ],
    },
]

# ---------------------------------------------------------------- spoločné časti
def hlava(title, description, cesta, extra='', og_typ='website'):
    url = f'{WEB}{cesta}'
    return f'''<!doctype html>
<html lang="sk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{e(title)}</title>
  <meta name="description" content="{e(description)}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="{og_typ}">
  <meta property="og:locale" content="sk_SK">
  <meta property="og:site_name" content="KMG stav">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(description)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{WEB}/assets/img/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#2f2e2c">
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preload" href="/assets/fonts/firasans-regular.woff" as="font" type="font/woff" crossorigin>
  <link rel="preload" href="/assets/fonts/firasansextracondensed-extrabold.woff" as="font" type="font/woff" crossorigin>
  <link rel="stylesheet" href="/assets/css/site.css">
{extra}</head>'''


def hlavicka(aktivna=''):
    real = ' aria-current="page"' if aktivna == 'galeria' else ''
    return f'''  <header class="hlavicka">
    <div class="obal">
      <a class="logo" href="/" aria-label="KMG stav – úvod"><img src="/assets/img/logo.png" alt="KMG stav" width="621" height="344"></a>
      <nav class="menu" aria-label="Hlavné menu">
        <a href="/#sluzby">Čo robíme</a>
        <a href="/galeria"{real}>Realizácie</a>
        <a href="#kontakt">Kontakt</a>
        <a class="tlacidlo tlacidlo--male" href="tel:{TEL[0][1]}" data-tel="0">
          {IKONA_TEL}
          Zavolať
        </a>
      </nav>
    </div>
  </header>'''


def pata():
    sluzby = '\n'.join(f'        <a href="/{s["slug"]}">{e(s["kratko"])}</a>' for s in SLUZBY)
    return f'''  <!-- PATA (generuje nastroje/stranky.py) -->
  <footer class="pata">
    <div class="obal pata__mriezka">
      <div class="pata__firma">
        <p><strong data-firma-nazov>KMG stav</strong></p>
        <p>Strechy a stavby z dreva – {OBLAST}</p>
        <div class="pata__udaje" data-firma-udaje></div>
      </div>
      <nav class="pata__stlpec" aria-label="Služby">
        <p><strong>Služby</strong></p>
{sluzby}
        <a href="/galeria">Realizácie</a>
      </nav>
      <div class="pata__stlpec">
        <p><strong>Kontakt</strong></p>
        <a href="tel:{TEL[0][1]}" data-tel="0" data-tel-cislo>{TEL[0][0]}</a>
        <a href="tel:{TEL[1][1]}" data-tel="1" data-tel-cislo>{TEL[1][0]}</a>
        <a href="mailto:{EMAIL}" data-email data-email-text>{EMAIL}</a>
      </div>
    </div>
    <div class="obal pata__spodok">
      <p>© <span data-rok>2026</span> KMG stav</p>
      <nav aria-label="Právne informácie">
        <a href="/ochrana-osobnych-udajov">Ochrana osobných údajov</a>
        <a href="/ochrana-osobnych-udajov#cookies">Cookies</a>
        <a href="/admin" rel="nofollow">Správa webu</a>
      </nav>
    </div>
  </footer>
  <!-- /PATA -->'''


LUPA = '''  <dialog class="lupa" aria-label="Zväčšená fotka">
    <div class="lupa__hore"><span data-lupa-pocet></span><button type="button" data-lupa-zavriet>Zavrieť</button></div>
    <div class="lupa__foto"><img alt=""></div>
    <div class="lupa__dole"><button type="button" data-lupa-spat aria-label="Predchádzajúca fotka">Predošlá</button><button type="button" data-lupa-dalej aria-label="Ďalšia fotka">Ďalšia</button></div>
  </dialog>'''


def ld(data):
    return f'  <script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>\n'


def kontakt(nadpis):
    return f'''    <section class="sekcia sekcia--tmava sluzba__kontakt" id="kontakt" aria-labelledby="kontakt-nadpis">
      <div class="obal">
        <h2 id="kontakt-nadpis">{e(nadpis)}</h2>
        <p class="sluzba__kontakt-popis">Zavolajte alebo napíšte. Prídeme na obhliadku v Bardejove a okolí a pripravíme cenovú ponuku.</p>
        <div class="sluzba__telefony" data-telefony>
          <a href="tel:{TEL[0][1]}" data-tel="0" data-tel-cislo>{TEL[0][0]}</a>
          <a href="tel:{TEL[1][1]}" data-tel="1" data-tel-cislo>{TEL[1][0]}</a>
        </div>
        <p><a class="sluzba__email" href="mailto:{EMAIL}" data-email data-email-text>{EMAIL}</a></p>
      </div>
    </section>'''


def blok(typ, obsah):
    if typ == 'h2':
        return f'        <h2>{e(obsah)}</h2>'
    if typ == 'p':
        return f'        <p>{e(obsah)}</p>'
    if typ == 'ul':
        return '        <ul class="fajky">\n' + '\n'.join(f'          <li>{e(x)}</li>' for x in obsah) + '\n        </ul>'
    if typ == 'dl':
        return '        <dl class="krytiny">\n' + '\n'.join(f'          <div><dt>{e(a)}</dt><dd>{e(b)}</dd></div>' for a, b in obsah) + '\n        </dl>'
    raise ValueError(typ)


FIRMA_LD = {
    '@context': 'https://schema.org',
    '@type': 'RoofingContractor',
    '@id': f'{WEB}/#firma',
    'name': 'KMG stav',
    'url': f'{WEB}/',
    'logo': f'{WEB}/assets/img/logo.png',
    'image': f'{WEB}/assets/img/og.jpg',
    'telephone': TEL[0][1],
    'email': EMAIL,
    'description': 'Nové strechy a rekonštrukcie striech, oplechovanie atík, drevodomy, chaty, prístrešky, altánky a pergoly v Bardejove a okolí.',
    'areaServed': [{'@type': 'City', 'name': MESTO}, {'@type': 'AdministrativeArea', 'name': 'okres Bardejov'}],
    'knowsLanguage': 'sk',
    'makesOffer': [
        {'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': s['sluzba'], 'url': f'{WEB}/{s["slug"]}'}}
        for s in SLUZBY
    ],
}


def stranka_sluzby(s):
    cesta = f'/{s["slug"]}'
    data_sluzba = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        'name': s['sluzba'],
        'serviceType': s['sluzba'],
        'url': f'{WEB}{cesta}',
        'description': s['description'],
        'provider': {'@id': f'{WEB}/#firma', '@type': 'RoofingContractor', 'name': 'KMG stav', 'url': f'{WEB}/'},
        'areaServed': {'@type': 'City', 'name': MESTO},
    }
    data_cesta = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'KMG stav', 'item': f'{WEB}/'},
            {'@type': 'ListItem', 'position': 2, 'name': s['h1'], 'item': f'{WEB}{cesta}'},
        ],
    }
    data_faq = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in s['faq']],
    }
    obsah = '\n'.join(blok(t, o) for t, o in s['obsah'])
    faq = '\n'.join(f'''        <details>
          <summary>{e(q)}</summary>
          <p>{e(a)}</p>
        </details>''' for q, a in s['faq'])
    dalsie = '\n'.join(f'          <a href="/{x["slug"]}">{e(x["h1"])}</a>' for x in SLUZBY if x is not s)
    kat = ','.join(s['kategorie'])
    return f'''{hlava(s['title'], s['description'], cesta, ld(data_sluzba) + ld(data_cesta) + ld(data_faq))}
<body class="sluzba-stranka">
{hlavicka()}

  <main>
    <section class="sluzba__uvod">
      <div class="obal">
        <nav class="omrvinky" aria-label="Omrvinky"><a href="/">Úvod</a><span aria-hidden="true">/</span><span aria-current="page">{e(s['kratko'])}</span></nav>
        <h1>{e(s['h1'])}</h1>
        <p class="sluzba__podnadpis">{e(s['podnadpis'])}</p>
        <p class="sluzba__lead">{e(s['lead'])}</p>
        <div class="akcie">
          <a class="tlacidlo" href="tel:{TEL[0][1]}" data-tel="0">{IKONA_TEL}<span data-tel-cislo>{TEL[0][0]}</span></a>
          <a class="tlacidlo tlacidlo--svetle" href="#realizacie">Pozrieť realizácie</a>
        </div>
      </div>
    </section>

    <section class="sekcia">
      <div class="obal sluzba__mriezka">
        <div class="sluzba__text">
{obsah}
        </div>
        <aside class="sluzba-postup" aria-labelledby="postup-nadpis">
          <h2 id="postup-nadpis">Ako postupujeme</h2>
          <ol>
            <li><span><strong>Zavoláte alebo napíšete.</strong> Poviete nám, čo potrebujete.</span></li>
            <li><span><strong>Obhliadka.</strong> Prídeme na miesto, všetko zameriame a poradíme.</span></li>
            <li><span><strong>Cenová ponuka.</strong> Dostanete ju s rozpisom materiálu a práce.</span></li>
            <li><span><strong>Realizácia.</strong> Prácu urobíme v dohodnutom termíne.</span></li>
          </ol>
        </aside>
      </div>
    </section>

    <section class="sekcia sekcia--kamen" id="realizacie" aria-labelledby="realizacie-nadpis" data-galeria-sekcia>
      <div class="obal">
        <h2 id="realizacie-nadpis">Naše realizácie</h2>
        <div class="mriezka" data-galeria data-kategorie="{kat}" data-pocet="8">
          <p class="prazdne">Načítavam fotky…</p>
        </div>
        <p class="sluzba__viac"><a href="/galeria?kategoria={s['kategorie'][0]}">Všetky realizácie</a></p>
      </div>
    </section>

    <section class="sekcia" aria-labelledby="faq-nadpis">
      <div class="obal">
        <h2 id="faq-nadpis">Časté otázky</h2>
        <div class="faq">
{faq}
        </div>
      </div>
    </section>

{kontakt(f"{s['kratko']} v Bardejove? Zavolajte.")}

    <section class="sekcia" aria-labelledby="dalsie-nadpis">
      <div class="obal">
        <h2 id="dalsie-nadpis">Ďalej robíme</h2>
        <nav class="dalsie-sluzby" aria-labelledby="dalsie-nadpis">
{dalsie}
        </nav>
      </div>
    </section>
  </main>

{pata()}

{LUPA}

  <script src="/assets/js/site.js" defer></script>
</body>
</html>
'''


def stranka_gdpr():
    cesta = '/ochrana-osobnych-udajov'
    title = 'Ochrana osobných údajov a cookies | KMG stav'
    desc = 'Ako KMG stav spracúva osobné údaje zákazníkov a návštevníkov webu, ako dlho ich uchováva, aké máte práva a prečo web nepoužíva cookies.'
    return f'''{hlava(title, desc, cesta, '  <meta name="robots" content="noindex, follow">\n')}
<body class="pravne-stranka">
{hlavicka()}

  <main class="obal">
    <article class="pravne">
      <h1>Ochrana osobných údajov</h1>
      <p class="pravne__datum">Platné od {PLATNE_OD}</p>
      <p class="pravne__uvod">Osobné údaje spracúvame len v rozsahu, ktorý potrebujeme na prípravu ponuky, vykonanie zákazky a splnenie zákonných povinností. Na tejto stránke nájdete, aké údaje to sú, prečo ich máme, ako dlho ich uchovávame a aké máte práva. Postupujeme podľa nariadenia (EÚ) 2016/679 (GDPR) a zákona č. 18/2018 Z. z. o ochrane osobných údajov.</p>

      <h2>Kto vaše údaje spracúva</h2>
      <dl class="pravne__karta">
        <div><dt>Prevádzkovateľ</dt><dd data-firma-pole="prevadzkovatel">KMG stav</dd></div>
        <div data-firma-riadok hidden><dt>Miesto podnikania</dt><dd data-firma-pole="adresa"></dd></div>
        <div data-firma-riadok hidden><dt>IČO</dt><dd data-firma-pole="ico"></dd></div>
        <div data-firma-riadok hidden><dt>Zápis</dt><dd data-firma-pole="register"></dd></div>
        <div><dt>E-mail</dt><dd><a href="mailto:{EMAIL}" data-firma-pole="email">{EMAIL}</a></dd></div>
        <div><dt>Telefón</dt><dd data-firma-pole="telefony">{TEL[0][0]}, {TEL[1][0]}</dd></div>
      </dl>
      <p>Zodpovednú osobu sme nevymenovali – pri našom rozsahu spracúvania ju zákon nevyžaduje. S otázkami o vašich údajoch sa obráťte priamo na nás.</p>

      <h2>Aké údaje spracúvame a prečo</h2>

      <h3>Dopyt a komunikácia</h3>
      <p>Keď nám zavoláte, napíšete e-mail alebo správu, spracúvame vaše meno, kontakt a obsah správy, aby sme vám mohli odpovedať a pripraviť ponuku.</p>
      <p class="pravne__zaklad"><strong>Právny základ:</strong> opatrenia pred uzavretím zmluvy na vašu žiadosť – čl. 6 ods. 1 písm. b) GDPR.<br><strong>Ako dlho:</strong> kým dopyt vybavujeme; ak zmluvu neuzavrieme, najdlhšie 3 roky od poslednej komunikácie.</p>

      <h3>Cenová ponuka a zákazka</h3>
      <p>Na prípravu cenovej ponuky a vykonanie prác spracúvame meno, adresu, miesto stavby, telefón, e-mail a údaje o stavbe (výmery a rozsah prác).</p>
      <p class="pravne__zaklad"><strong>Právny základ:</strong> plnenie zmluvy a predzmluvné vzťahy – čl. 6 ods. 1 písm. b) GDPR.<br><strong>Ako dlho:</strong> počas trvania zmluvy a záručnej doby, potom do uplynutia premlčacích lehôt na uplatnenie nárokov.</p>

      <h3>Faktúry a účtovníctvo</h3>
      <p>Údaje odberateľa na faktúre (meno alebo obchodné meno, adresa, prípadne IČO, DIČ a IČ DPH) musíme spracúvať a uchovávať podľa zákona č. 431/2002 Z. z. o účtovníctve a daňových predpisov.</p>
      <p class="pravne__zaklad"><strong>Právny základ:</strong> plnenie zákonnej povinnosti – čl. 6 ods. 1 písm. c) GDPR.<br><strong>Ako dlho:</strong> 10 rokov nasledujúcich po roku, ktorého sa doklad týka.</p>

      <h3>Fotografie realizácií</h3>
      <p>Na webe zverejňujeme fotografie našich prác. Pri nich neuvádzame mená zákazníkov ani presné adresy, najviac obec, a dbáme na to, aby na fotografiách neboli rozpoznateľné osoby. Ak je na fotografii vaša nehnuteľnosť a nechcete, aby bola zverejnená, napíšte nám a fotografiu odstránime.</p>
      <p class="pravne__zaklad"><strong>Právny základ:</strong> oprávnený záujem prezentovať našu prácu – čl. 6 ods. 1 písm. f) GDPR.<br><strong>Ako dlho:</strong> kým je zákazka v galérii (na webe je najviac niekoľko posledných zákaziek, staršie sa mažú automaticky) alebo kým nevznesiete námietku.</p>

      <h3>Návšteva webu</h3>
      <p>Pri návšteve webu sa automaticky prenášajú technické údaje (IP adresa, typ prehliadača, čas a navštívená stránka). Potrebuje ich poskytovateľ hostingu na doručenie stránky a ochranu pred zneužitím a uchováva ich len v krátkodobých záznamoch servera. Nepoužívame analytické, reklamné ani sledovacie nástroje. Písma, obrázky a skripty načítavame výlučne z nášho webu, nie od tretích strán. Odkaz na Facebook je obyčajný odkaz – Facebook sa otvorí, až keď naň kliknete.</p>
      <p class="pravne__zaklad"><strong>Právny základ:</strong> oprávnený záujem na bezpečnej prevádzke webu – čl. 6 ods. 1 písm. f) GDPR.</p>

      <h2>Komu údaje poskytujeme</h2>
      <p>Údaje nepredávame ani ich neposkytujeme na marketing. Prístup k nim majú len títo príjemcovia, a to v nevyhnutnom rozsahu:</p>
      <ul>
        <li><span><strong>Vercel Inc.</strong> (USA) – hosting webu a úložisko našej aplikácie na fotky, ponuky a faktúry. Prenos do USA je chránený rámcom EÚ – USA pre ochranu údajov (Data Privacy Framework), v ktorom je Vercel certifikovaný.</span></li>
        <li><span><strong>Google Ireland Limited</strong> – e-mailová schránka, ak nám píšete e-mail.</span></li>
        <li><span><strong>Meta Platforms Ireland Limited</strong> – ak nás kontaktujete cez Facebook.</span></li>
        <li>osoba, ktorá nám vedie účtovníctvo, a banka – pri spracovaní faktúr a platieb,</li>
        <li>orgány verejnej moci (napríklad daňový úrad), ak to vyžaduje zákon.</li>
      </ul>

      <h2>Vaše práva</h2>
      <p>Máte právo:</p>
      <ul>
        <li>získať prístup k svojim údajom a ich kópiu (čl. 15 GDPR),</li>
        <li>na opravu nesprávnych údajov (čl. 16),</li>
        <li>na vymazanie údajov, ak už nie sú potrebné alebo ich nemusíme uchovávať zo zákona (čl. 17),</li>
        <li>na obmedzenie spracúvania (čl. 18),</li>
        <li>na prenosnosť údajov (čl. 20),</li>
        <li>namietať proti spracúvaniu na základe oprávneného záujmu, napríklad proti zverejneniu fotografie (čl. 21).</li>
      </ul>
      <p>Stačí nám napísať alebo zavolať. Odpovieme bez zbytočného odkladu, najneskôr do jedného mesiaca. Ak si myslíte, že s vašimi údajmi zaobchádzame nesprávne, môžete podať návrh na začatie konania na <strong>Úrad na ochranu osobných údajov Slovenskej republiky</strong>, Hraničná 12, 820 07 Bratislava 27, <a href="https://dataprotection.gov.sk" rel="noopener">dataprotection.gov.sk</a>.</p>
      <p>Bez kontaktu a údajov o stavbe vám nevieme pripraviť ponuku; údaje na faktúre vyžaduje zákon. Automatizované rozhodovanie ani profilovanie nepoužívame.</p>

      <h2 id="cookies">Cookies</h2>
      <p>Verejný web <strong>nepoužíva súbory cookies</strong> ani iné ukladanie údajov vo vašom zariadení (napríklad localStorage), preto nezobrazujeme lištu so súhlasom. Jediný cookie používa neverejná správa webu na prihlásenie našich pracovníkov – je nevyhnutný na jej fungovanie a návštevníkov webu sa netýka.</p>

      <h2>Zmeny</h2>
      <p>Tieto informácie môžeme aktualizovať, napríklad pri zmene poskytovateľov služieb. Aktuálna verzia je vždy na tejto stránke.</p>
    </article>
  </main>

{pata()}

  <script src="/assets/js/site.js" defer></script>
</body>
</html>
'''


def sitemap():
    adresy = [('/', '1.0'), ('/galeria', '0.8')] + [(f'/{s["slug"]}', '0.9') for s in SLUZBY]
    riadky = '\n'.join(f'  <url><loc>{WEB}{u}</loc><lastmod>{DNES}</lastmod><priority>{p}</priority></url>' for u, p in adresy)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{riadky}\n</urlset>\n'


ROBOTS = f'''User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: {WEB}/sitemap.xml
'''


def nahrad_patu(cesta):
    s = cesta.read_text()
    nova = pata()
    if '<!-- PATA' in s:
        s = re.sub(r'  <!-- PATA.*?<!-- /PATA -->', lambda _: nova, s, flags=re.S)
    else:
        s, n = re.subn(r'  <footer class="pata">.*?</footer>', lambda _: nova, s, flags=re.S)
        assert n == 1, cesta
    cesta.write_text(s)


def main():
    for s in SLUZBY:
        (PUBLIC / f'{s["slug"]}.html').write_text(stranka_sluzby(s))
    (PUBLIC / 'ochrana-osobnych-udajov.html').write_text(stranka_gdpr())
    (PUBLIC / 'sitemap.xml').write_text(sitemap())
    (PUBLIC / 'robots.txt').write_text(ROBOTS)
    for f in ['index.html', 'galeria.html']:
        nahrad_patu(PUBLIC / f)
    # štruktúrované dáta firmy na úvodnej stránke (site.js ich doplní o adresu a IČO z aplikácie)
    uvod = PUBLIC / 'index.html'
    t, n = re.subn(r'(<script type="application/ld\+json" id="ld-firma">).*?(</script>)',
                   lambda m: m.group(1) + json.dumps(FIRMA_LD, ensure_ascii=False) + m.group(2), uvod.read_text(), flags=re.S)
    assert n == 1, 'ld-firma'
    uvod.write_text(t)
    (KOREN / 'nastroje' / 'firma-ld.json').write_text(json.dumps(FIRMA_LD, ensure_ascii=False, indent=2))
    print('Hotovo:', len(SLUZBY), 'stránok služieb, ochrana údajov, sitemap, robots, päta')


if __name__ == '__main__':
    main()
