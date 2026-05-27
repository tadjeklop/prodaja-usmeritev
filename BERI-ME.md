# Prodajno orodje Interzero EPR

Spletna aplikacija za prodajno ekipo EPR (Slovenija, Hrvaška, Srbija). Trenutna verzija: **slovenski jezik**, pripravljen prostor za HR in RS.

## Kaj aplikacija ponuja

| Modul | Za koga | Kaj naredi |
|---|---|---|
| **Domov** (`index.html`) | Vsi | Hitri začetek po situaciji (sestanek, ponudba, ugovor, učenje). |
| **Stranke** (`stranke.html`) | Vsi | Mini-CRM: aktivni pipeline s fazami, vrednostmi, naslednjimi koraki, alarmi za zapadle datume, tehtano vrednostjo. **Segment** filter in stolpec. |
| **Segmenti** (`segmentacija.html`) | Vsi | 7 segmentov strank po motivaciji (compliance, cost-optimizer, ESG, regional, kriza, strateški, novi). Vsak ima indikatorje, pristop, povezave na govore/ugovore/pakete/reference. Plus **kviz** za hitro hipotezo segmenta. |
| **Vodič po razgovoru** (`vodic.html`) | Predvsem nov + senior za osvežitev | Korak za korakom: pred sestankom → uvod → discovery → predstavitev → ugovori → zaključek → po sestanku. Z dobesednimi govori, branchi (če stranka reče X), tipičnimi napakami. |
| **Reference / case studies** (`reference.html`) | Vsi | 8 anonimiziranih primerov uporabe po panogah: izziv → kaj smo naredili → rezultat. Iskanje. |
| **Onboarding 30/60/90** (`onboarding.html`) | Nov komercialist + vodja | Tedenski plan s checklisti, napredek se shrani lokalno. Cilj: v 90 dneh sposoben samostojno voditi sestanek + ponudbo. |
| **Priprava na sestanek** (`priprava.html`) | Terenski + nov komercialist | Wizard: vneseš panogo, odločevalca, status → dobiš pripravljen brief z vprašanji, govori, ugovori. |
| **Govori in skripte** (`govori.html`) | Vsi | Pripravljeni bloki za hladni klic, prvi sestanek, predstavitev, follow-up. Klik za kopiranje. |
| **Ugovori** (`ugovori.html`) | Vsi | 12 najpogostejših ugovorov z kratkim in dolgim odgovorom. Iskanje, filter po kategoriji. |
| **Kalkulacije** (`kalkulacije.html`) | Terenski + vodja | 4 kalkulatorji: EPR taksa, primerjava pred/po, ROI, paketi. |
| **Ponudba** (`ponudba.html`) | Terenski + vodja | Generator ponudbe z živim predogledom, izhodišča iz 4 paketov, PDF preko brskalnika. |
| **Discovery obrazec** (`obrazec.html`) | Terenski | Tiskljiv list z vsemi discovery vprašanji — komercialist ga nese na sestanek za ročne zapiske. |
| **Konkurenca** (`konkurenca.html`) | Vsi | Battlecards: kako pošteno predstaviti razliko brez napadanja konkurenta. |
| **Glosar** (`glosar.html`) | Novi komercialist + ko stranka zameša pojme | Slovar EPR/ESG/regulativnih pojmov, iskanje, kategorije. |
| **Koledar** (`koledar.html`) | Vsi | Letni cikel EPR obveznosti, prodajne sezone, večletni regulativni horizont. |
| **Vsebine** (`vsebine.html`) | Koordinator, leadi, marketing | Koledar 40 LinkedIn predlogov: 12 tednov, 7 avtorjev, 4 teme (PPWR, regulatorni updateji, primeri iz prakse, eco-design). Hook v SI/HR/SR za vsak predlog. Filtri po statusu, temi, avtorju, trgu. |
| **Prodajni proces** (`proces.html`) | Nov + vodja | 10 faz s cilji, vprašanji, izhodi, CRM polji. |
| **Zakonodaja** (`zakonodaja.html`) | Vsi | SI pripravljen; HR in RS prostor za vsebino. |
| **KPI** (`kpi.html`) | Vodja prodaje | 9 KPI-jev z coaching vprašanji. |
| **Moja zgodovina** (`zgodovina.html`) | Vsi | Shranjeni pripravljeni sestanki, izračuni, ponudbe (lokalno v brskalniku). |

## Kako zaženeš lokalno

**Pomembno:** aplikacija uporablja `fetch()` za branje JSON datotek. Pri odpiranju z dvojnim klikom (`file://`) brskalniki to **blokirajo**. Potrebuješ lokalni strežnik.

### Najlažji način — VS Code Live Server

1. Odpri mapo `prodaja interzero` v VS Code.
2. Namesti razširitev **Live Server** (avtor Ritwick Dey).
3. Desni klik na `index.html` → **Open with Live Server**.
4. Aplikacija se odpre na `http://127.0.0.1:5500`.

### Alternativa — Python (če je nameščen)

```powershell
cd "C:\Users\tadej\Desktop\claude\prodaja interzero"
python -m http.server 8000
```

Nato v brskalniku odpri `http://localhost:8000`.

## Kako objaviš na spletu (brezplačno)

### Cloudflare Pages (priporočeno)

1. Pojdi na [pages.cloudflare.com](https://pages.cloudflare.com), prijava.
2. **Create project** → **Upload assets**.
3. Povleci celotno mapo `prodaja interzero`.
4. Dobiš URL oblike `https://prodaja-interzero.pages.dev`.

### Netlify (alternativa)

1. Pojdi na [app.netlify.com/drop](https://app.netlify.com/drop).
2. Povleci mapo `prodaja interzero` v okno.
3. Dobiš javni URL.

Oba sta brezplačna in ne zahtevata kartice za majhne projekte.

## Kako urejaš vsebino

Vsa vsebina je v mapi `data/` v `.json` datotekah. Odpreš jih v urejevalniku (Notepad, VS Code, Notepad++) in spremeniš tekst med narekovaji.

### Pomembno pravilo

JSON datoteke imajo strogo sintakso. Pazi na:
- Vse vrednosti v narekovajih: `"besedilo"`.
- Vejica med elementi, **NE** za zadnjim.
- Oklepaji `{ }` in `[ ]` morajo biti pravilno zaprti.

Če nisi prepričan ali datoteka deluje, jo prilepi v [jsonlint.com](https://jsonlint.com) — pove ti, kje je napaka.

### Najpogostejša urejanja

#### Spremeniti EPR cene (placeholder!)

**Datoteka:** `data/epr-cene-si.json`

Trenutno so vrednosti placeholder. Pred uporabo v ponudbi za stranko zamenjaj `cena_eur_kg` z aktualnimi Interzero cenovniki:

```json
{ "id": "papir-karton", "naziv": "Papir in karton", "cena_eur_kg": 0.045 }
```

#### Dodati ugovor

**Datoteka:** `data/ugovori.json`. Skopiraj obstoječ ugovor in spremeni polja:

```json
{
  "kategorija": "cena",
  "ugovor": "Tekst ugovora stranke",
  "kratek_odgovor": "Kratek odgovor za na sestanku",
  "dolgi_odgovor": "Daljši odgovor za pripravo",
  "opomba": "Opomba prodajalcu (neobvezno)"
}
```

#### Dodati govor/skripto

**Datoteka:** `data/govori.json`. V obstoječ scenarij dodaj nov element pod `govori`:

```json
{
  "naslov": "Naslov govora",
  "tekst": "Tekst govora.\n\nNova vrstica gre z \\n."
}
```

#### Dodati panogo

**Datoteka:** `data/panoge.json`. Vsaka panoga potrebuje: `id`, `naziv`, `bolecine`, `tipicni_odlocevalci`, `kljucne_storitve`.

#### Posodobiti zakonodajo

**Datoteka:** `data/zakonodaja-si.json`. Posodobi `_zadnja_revizija` ob spremembi.

#### Dodati HR ali RS zakonodajo

1. Skopiraj `data/zakonodaja-si.json` v `data/zakonodaja-hr.json` (ali `-rs.json`).
2. Prevedi vsebino.
3. V `zakonodaja.html` odpri sekcijo `STATUS_DRZAVE` in spremeni `naloziti: false` v `true` za želeno državo.

### Po vsaki spremembi

Osveži stran v brskalniku (Ctrl+F5 za hard reload). Če se ne posodobi, preveri konzolo brskalnika (F12) za napake.

## Struktura mape

```
prodaja interzero/
├── index.html              ← domov, dashboard
├── vodic.html              ← vodič po prodajnem razgovoru (korak za korakom)
├── priprava.html           ← wizard za pripravo na sestanek
├── obrazec.html            ← tiskljiv discovery obrazec za sestanek
├── konkurenca.html         ← battlecards
├── glosar.html             ← slovar EPR pojmov
├── koledar.html            ← letni cikel EPR datumov
├── ponudba.html            ← generator ponudbe
├── stranke.html            ← mini-CRM aktivnih strank
├── reference.html          ← knjižnica case studies
├── onboarding.html         ← 90-dnevni plan za nove komercialiste
├── vsebine.html            ← koledar LinkedIn vsebin (64 predlogov, vključno 24 komunikacijskih)
├── segmentacija.html       ← 7 segmentov strank + kviz
├── govori.html             ← knjižnica govorov
├── ugovori.html            ← ugovori in odgovori
├── kalkulacije.html        ← 4 kalkulatorji
├── proces.html             ← 10 faz prodaje
├── zakonodaja.html         ← SI / HR / RS
├── kpi.html                ← KPI za vodjo
├── zgodovina.html          ← shranjeni sestanki/izračuni
├── BERI-ME.md              ← ta datoteka
├── css/style.css
├── js/
│   ├── app.js              ← skupna logika (navigacija, fetch)
│   ├── storage.js          ← localStorage
│   ├── priprava.js         ← logika wizarda
│   └── kalkulacije.js      ← logika kalkulatorjev
└── data/
    ├── panoge.json
    ├── odlocevalci.json
    ├── govori.json
    ├── ugovori.json
    ├── discovery.json
    ├── proces.json
    ├── vodic.json
    ├── konkurenca.json
    ├── glosar.json
    ├── koledar.json
    ├── predloga-ponudbe.json
    ├── reference.json
    ├── onboarding.json
    ├── vsebine.json
    ├── segmentacija.json
    ├── kpi.json
    ├── zakonodaja-si.json
    ├── zakonodaja-hr.json
    ├── zakonodaja-rs.json
    └── epr-cene-si.json
```

## Branje na glas (slovenski glasovi)

Aplikacija ima vgrajeno branje besedila na glas s slovenskim glasom prek brskalnikove **Speech Synthesis API**.

### Kako deluje

- **🔊 Beri** gumb se samodejno pojavi na vsakem bloku govorov, skript in odgovorov.
- **🔊 Beri ves vodič / scenarij / prikazane** gumbi v Vodiču, Govorih in Ugovorih preberejo celotno vsebino v sekvenci.
- **Plavajoči player** v desnem spodnjem kotu — pavza, ustavi, nastavitve.
- **Nastavitve** (gumb ⚙): izbira glasu, nastavitev hitrosti (0.5–2.0x).

### Slovenski glas — namestitev

Brskalniki uporabljajo sistemske glasove. Če slovenski glas ni nameščen, aplikacija avtomatsko poskuša s hrvaškim ali srbskim (zveni dovolj podobno).

**Windows 10/11:**
1. Settings → Time & Language → Speech (oz. Language & region → Add language)
2. Add a language → izberi „Slovenian / Slovenščina"
3. Pri jezikovnih možnostih označi „Speech" → namesti

**macOS:**
1. System Settings → Accessibility → Spoken Content
2. System Voice → Manage Voices
3. Označi „Slovenian" → Done (prenos lahko traja nekaj minut)

**Chrome / Edge na Windows:**
- Imata pogosto že vgrajen Microsoft Lado (slovenski cloud glas) — ni treba dodatno namestiti.

**Firefox:**
- Uporablja sistemske glasove — najprej namesti v OS.

### Opombe

- Branje deluje samo s **klikom** uporabnika (politika brskalnikov za samodejno predvajanje zvoka).
- Dolgi teksti se prekinejo, če zapustiš zavihek — to je omejitev brskalnika, ne aplikacije.
- Tekst v oglatih oklepajih (npr. `[ime stranke]`) je avtomatsko odstranjen pri branju.

## Kaj manjka v prvi verziji (in kaj prihaja kasneje)

- **HR in RS zakonodaja** — pripravljen prostor, manjka vsebina.
- **Prevodi v HR in srbščino** — UI je za zdaj samo v slovenščini.
- **Skupna baza** — trenutno vsak komercialist vidi samo svojo zgodovino (localStorage v brskalniku).
- **Prave EPR cene** — vrednosti v `epr-cene-si.json` so placeholder. Nujno zamenjaj pred prodajno uporabo.
- **PDF izvoz** — za zdaj uporabi „Natisni" (Ctrl+P) → „Shrani kot PDF" v brskalniku.

## Pomembno terminološko opozorilo

**EPR ≠ ERP.**

- **EPR** = Extended Producer Responsibility (razširjena odgovornost proizvajalca). To je tisto, kar prodajamo.
- **ERP** = Enterprise Resource Planning (SAP, Oracle, MS Dynamics). To je nekaj povsem drugega.

Če stranka uporablja napačen izraz, takoj razloži razliko. Ta napaka uniči verodostojnost nastopa.

## Kontakt

Za vprašanja, predloge ali napake — Tadej Klopčič.
