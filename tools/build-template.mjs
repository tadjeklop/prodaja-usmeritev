import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = process.argv[2] || path.resolve('..', '..', 'Codex', 'COWORK', 'sales-portal-template');
const skipNames = new Set([
  '.git',
  '.claude',
  'actions-log',
  'translations-review.tsv'
]);
const skipFiles = new Set([
  path.normalize('data/content-hr.json'),
  path.normalize('data/content-sr.json'),
  path.normalize('tools/machine-translate-content.mjs'),
  path.normalize('tools/build-content-translations.mjs'),
  path.normalize('tools/transliterate-sr-latin.mjs'),
  path.normalize('tools/check-translation-coverage.mjs'),
  path.normalize('tools/import-texts.mjs'),
  path.normalize('tools/export-texts.mjs'),
  path.normalize('tools/build-template.mjs'),
  path.normalize('tools/check-template.mjs'),
  path.normalize('tools/check-content-i18n.mjs'),
  path.normalize('tools/check-i18n-responsiveness.mjs'),
  path.normalize('tools/check-translation-coverage.mjs')
]);

fs.rmSync(target, { recursive: true, force: true });
copyDir(root, target);

rewriteTextFiles(target);
rewriteI18n(path.join(target, 'data/i18n.json'));
rewriteI18nScript(path.join(target, 'js/i18n.js'));
rewriteTemplateTests(target);
writeTemplateDocs(target);

console.log(`Template created at ${target}`);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skipNames.has(entry.name)) continue;
    const source = path.join(from, entry.name);
    const relative = path.normalize(path.relative(root, source));
    if (skipFiles.has(relative)) continue;
    const destination = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, destination);
    else fs.copyFileSync(source, destination);
  }
}

function rewriteTextFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteTextFiles(full);
      continue;
    }
    if (!isTextFile(full)) continue;
    let text = fs.readFileSync(full, 'utf8');
    text = text
      .replace(/Interzero EPR/g, 'Prodajni portal')
      .replace(/Interzero/g, 'Podjetje')
      .replace(/interzero/g, 'podjetje')
      .replace(/EPR/g, 'prodaja')
      .replace(/Extended Producer Responsibility/g, 'prodajna odgovornost')
      .replace(/SI\/HR\/SR/g, 'Slovenija')
      .replace(/HR\/SR/g, 'slovenščina')
      .replace(/Hrvatska|Hrvaška/g, 'Trg 2')
      .replace(/Srbija|Srpski|Srpsko/g, 'Trg 3')
      .replace(/Hrvatski/g, 'Slovenščina')
      .replace(/https:\/\/tadjeklop\.github\.io\/prodaja-usmeritev/g, 'https://example.com/prodajni-portal')
      .replace(/prodaja-usmeritev/g, 'prodajni-portal')
      .replace(/tadjeklop/g, 'your-github-user')
      .replace(/#009dd3/g, '#2563eb')
      .replace(/#183362/g, '#0f172a')
      .replace(/#ffce00/g, '#f59e0b')
      .replace(/#eef9fd/g, '#eff6ff')
      .replace(/#fff8d6/g, '#fffbeb')
      .replace(/#d9e2e8/g, '#dbe4ef');
    fs.writeFileSync(full, text);
  }
}

function rewriteI18n(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data._opis = 'Slovenski UI prevodi za generični prodajni portal.';
  data._jeziki = ['sl'];
  data._privzeti = 'sl';
  data._status = 'Samo slovenščina.';
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('_') && value && typeof value === 'object' && 'sl' in value) {
      data[key] = { sl: value.sl };
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function rewriteI18nScript(file) {
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/contentPrevodi: \{ hr: \{\}, sr: \{\} \},/, 'contentPrevodi: {},');
  text = text.replace(/this\.jezik = Storage\.get\('i18n-lang', 'sl'\);/, "this.jezik = 'sl';");
  text = text.replace(/if \(this\.jezik === 'hr'\) requests\.push\(fetch\('data\/content-hr\.json'\)\);\n\s+if \(this\.jezik === 'sr'\) requests\.push\(fetch\('data\/content-sr\.json'\)\);/, '');
  text = text.replace(/if \(!\['sl', 'hr', 'sr'\]\.includes\(lang\)\) return;\n\s+this\.jezik = lang;\n\s+Storage\.set\('i18n-lang', lang\);\n\s+Storage\.set\('i18n-lang-user-set', true\);\n\s+document\.documentElement\.lang = lang;\n\s+location\.reload\(\);/, "return;");
  text = text.replace(/injectSwitcher\(\) \{[\s\S]*?\n  \},\n\n  notifyChange\(\)/, "injectSwitcher() {},\n\n  notifyChange()");
  fs.writeFileSync(file, text);
}

function rewriteTemplateTests(dir) {
  const smokePages = path.join(dir, 'tools/smoke-pages.mjs');
  if (fs.existsSync(smokePages)) {
    let text = fs.readFileSync(smokePages, 'utf8');
    text = text.replace(", 'translations-review.tsv'", '');
    fs.writeFileSync(smokePages, text);
  }

  const smokeUgovori = path.join(dir, 'tools/smoke-ugovori.mjs');
  if (fs.existsSync(smokeUgovori)) {
    let text = fs.readFileSync(smokeUgovori, 'utf8');
    text = text.replace(
      "    await waitForCondition(browser, `document.querySelectorAll('.lang-switcher .lang-btn').length === 3`);\n",
      ''
    );
    text = text.replace(
      "      langButtons: document.querySelectorAll('.lang-switcher .lang-btn').length,\n",
      "      langButtons: document.querySelectorAll('.lang-switcher .lang-btn').length,\n"
    );
    text = text.replace("    assert(result.langButtons === 3, 'language switcher buttons were not rendered');\n", '');
    fs.writeFileSync(smokeUgovori, text);
  }
}

function writeTemplateDocs(dir) {
  fs.writeFileSync(path.join(dir, 'README.md'), `# Prodajni portal template

Generična statična predloga za izdelavo novega prodajnega portala iz obstoječega portala.

Template je namenjen temu, da v novem chatu ali novem folderju dodaš nov poslovni kontekst in hitro dobiš nov portal za drug trg, podjetje ali prodajno ekipo.

## Hitra uporaba

1. Kopiraj ta folder v nov projekt.
2. Odpri \`TEMPLATE-CONTEXT.md\` ali \`data/portal-context.example.json\` in dodaj nov kontekst.
3. V novem chatu povej: "Uporabi ta template, preberi kontekst in posodobi portal po PORTAL-CONTENT-MAP.md."
4. Portal naj ohrani vse module, spremeni pa naj vsebino, primere, vprašanja, skripte, ugovore, koledar, vire in brand.

## Jezik

Template je namenoma samo v slovenščini. Če bo nov portal potreboval druge jezike, jih dodaj kot novo fazo, ko je osnovni portal že stabilen.
`);

  fs.writeFileSync(path.join(dir, 'TEMPLATE-CONTEXT.md'), `# Kontekst za nov prodajni portal

Izpolni ta dokument pred začetkom novega portala.

## 1. Osnovni podatki

- Ime podjetja:
- Kratek opis podjetja:
- Trg ali regija:
- Ciljna prodajna ekipa:
- Glavni produkti ali storitve:
- Glavni kupci:

## 2. Prodajni proces

- Tipičen prvi kontakt:
- Tipičen prodajni cikel:
- Ključne faze prodaje:
- Kdaj nastane ponudba:
- Kdaj se izgubi največ priložnosti:
- Kaj pomeni dober CRM zapis:

## 3. Discovery

- Katere informacije mora prodajalec dobiti na sestanku:
- Najpomembnejša vprašanja:
- Kateri odgovori pomenijo visoko priložnost:
- Kateri odgovori pomenijo tveganje:

## 4. Ugovori in skripte

- Najpogostejši ugovori:
- Najboljši odgovori:
- Česa prodajalec ne sme obljubiti:
- Ton komunikacije:

## 5. Segmentacija

- Tipi kupcev:
- Panoge:
- Odločevalci:
- Kriteriji za prioritizacijo:

## 6. Vsebine in koledar

- Teme za LinkedIn ali outreach:
- Sezonski dogodki:
- Pomembni roki:
- Lastniki vsebin:

## 7. Zakonodaja ali strokovni viri

- Uradni viri:
- Interni dokumenti:
- Kdo potrjuje aktualnost:
- Kako pogosto se preverja:

## 8. Brand

- Ime portala:
- Primarna barva:
- Sekundarna barva:
- Ton oblikovanja:
- Logotip ali znak:

## 9. Pravila prilagoditve

- Ohrani vse obstoječe module, razen če izrecno naročim drugače.
- Ne briši funkcionalnosti, samo prilagodi vsebino in brand.
- Vse konkretne primere, vprašanja, skripte in ugovore prilagodi novemu trgu.
- Če kontekst ne vsebuje dovolj informacij, pusti generične placeholderje in jih označi z "DOPOLNI".
- Najprej posodobi podatkovne datoteke v \`data/\`, nato UI besedila.

## 10. Moduli

Označi, kaj naj ostane v novem portalu:

- [ ] CRM
- [ ] Brief
- [ ] Discovery
- [ ] Skripte
- [ ] Ugovori
- [ ] Koledar
- [ ] LI vsebine
- [ ] Zakonodaja / strokovni viri
- [ ] KPI
- [ ] Onboarding
- [ ] AI asistent
- [ ] Settings / uporabniki
`);

  fs.writeFileSync(path.join(dir, 'PORTAL-CONTENT-MAP.md'), `# Portal Content Map

Ta dokument pove, katero vsebino mora nov chat spremeniti, ko dobi nov poslovni kontekst.

Pravilo: **ohrani module in funkcionalnost, zamenjaj vsebino.**

## Brand in osnovni UI

- \`index.html\` - naslov portala, uvodni tekst, seznam modulov na prvi strani.
- \`manifest.json\` - ime aplikacije.
- \`css/style.css\` - barve, tipografija, nevtralni CGP.
- \`js/app.js\` - ime portala v navigaciji, kategorije menija, seznam modulov.
- \`data/i18n.json\` - slovenske UI oznake.

## CRM in prodajni proces

- \`stranke.html\` in \`js/stranke.js\` - polja CRM, statusi, pipeline, prikazi.
- \`data/proces.json\` - faze prodajnega procesa, CRM polja, izhodi iz faz.
- \`data/panoge.json\` - panoge ali segmenti trga.
- \`data/odlocevalci.json\` - buyer persone, motivi, vprašanja.

## Brief in priprava na sestanek

- \`priprava.html\` in \`js/priprava.js\` - logika briefa.
- \`data/panoge.json\`
- \`data/odlocevalci.json\`
- \`data/ugovori.json\`
- \`data/govori.json\`

## Discovery

- \`obrazec.html\` - UI obrazca in CRM povzetek.
- \`data/discovery.json\` - sklopi, vprašanja, namigi, CRM zapisnik.

## Skripte in ugovori

- \`data/govori.json\` - prodajne skripte, emaili, follow-up, pitch.
- \`data/ugovori.json\` - ugovori, odgovori, opombe, kategorije.
- \`govori.html\` in \`ugovori.html\` - prikaz in filtri.

## Segmentacija, konkurenca, reference

- \`data/segmentacija.json\` - segmenti kupcev in kviz.
- \`data/konkurenca.json\` - battlecards in primerjava.
- \`data/reference.json\` - case studies ali dokazni primeri.

## Kalkulacije in ponudba

- \`data/epr-cene-si.json\` - ceniki, paketni primeri, vhodni parametri.
- \`data/predloga-ponudbe.json\` - predloga ponudbe in podatki ponudnika.
- \`js/kalkulacije.js\`, \`js/ponudba.js\` - logika kalkulacije in predogleda.

## Koledar, LI vsebine, zakonodaja / viri

- \`data/koledar.json\` - letni cikli, roki, dogodki, taski.
- \`data/vsebine.json\` - LinkedIn / outreach ideje, tedni, statusi, lastniki.
- \`data/zakonodaja-si.json\` - uradni viri, strokovni viri, opombe za prodajo.

## Onboarding, KPI, trening

- \`data/onboarding.json\` - 30/60/90 plan, vaje, pričakovanja.
- \`data/kpi.json\` - KPI metrika, coaching vprašanja, vodenje ekipe.
- \`data/roleplay.json\` - roleplay scenariji, kriteriji ocenjevanja.
- \`data/vodic.json\` - vodnik po prodajnem razgovoru.

## AI asistent

- \`asistent.html\` - sistemski prompt, hitri prompti, ton odgovora.

## Settings, uporabniki, Supabase

- \`settings.html\`, \`js/admin.js\`, \`js/auth.js\` - profili, uporabniki, pravice.
- \`supabase-schema.sql\` - opcijska cloud shema.
- \`data/auth-config.json\` - vklop/izklop prijave.

## Priporočeno zaporedje pri novem kontekstu

1. Preberi \`TEMPLATE-CONTEXT.md\` ali \`data/portal-context.example.json\`.
2. Posodobi brand: \`index.html\`, \`manifest.json\`, \`css/style.css\`, \`js/app.js\`.
3. Posodobi prodajno jedro: \`data/proces.json\`, \`data/discovery.json\`, \`data/govori.json\`, \`data/ugovori.json\`.
4. Posodobi podporne module: segmentacija, konkurenca, reference, kalkulacije, koledar, vsebine, viri.
5. Zaženi smoke teste.
`);

  fs.writeFileSync(path.join(dir, 'CREATE-NEW-PORTAL.md'), `# Kako iz tega template-a ustvariti nov portal

## Priporočen proces

1. Ustvari nov folder za projekt.
2. Kopiraj vsebino tega template-a v ta folder.
3. Izpolni \`TEMPLATE-CONTEXT.md\`.
4. V novem chatu prilepi kratko zahtevo:

\`\`\`
Uporabi ta sales portal template.
Preberi TEMPLATE-CONTEXT.md.
Prilagodi portal novemu podjetju/trgu.
Ohrani samo slovenščino, dokler ne rečem drugače.
Ohrani vse module in funkcionalnost, razen če izrecno rečem drugače.
Uporabi PORTAL-CONTENT-MAP.md kot zemljevid datotek.
Najprej posodobi podatkovne JSON-e, nato UI, nato teste.
\`\`\`

## Kaj je treba običajno prilagoditi

- \`data/discovery.json\` - vprašanja za Discovery
- \`data/govori.json\` - skripte
- \`data/ugovori.json\` - ugovori
- \`data/segmentacija.json\` - segmenti kupcev
- \`data/proces.json\` - prodajni proces
- \`data/vsebine.json\` - LI ideje
- \`data/koledar.json\` - dogodki in roki
- \`data/zakonodaja-si.json\` - strokovni ali pravni viri
- \`css/style.css\` - brand barve

## Supabase

Supabase je opcijski. Uporabi ga, če potrebuješ prijavo, uporabnike, profile in pravice dostopa.

Če ga ne potrebuješ, lahko ostane \`data/auth-config.json\` nastavljen na \`enabled: false\`.
`);

  fs.writeFileSync(path.join(dir, 'data/portal-context.example.json'), JSON.stringify({
    portal: {
      name: 'Prodajni portal',
      market: 'Slovenija',
      language: 'sl',
      brand: {
        primaryColor: '#2563eb',
        secondaryColor: '#f59e0b',
        tone: 'miren, profesionalen, uporaben'
      }
    },
    company: {
      name: '',
      shortDescription: '',
      productsOrServices: [],
      targetCustomers: [],
      differentiators: []
    },
    salesProcess: {
      stages: [],
      crmFields: [],
      qualificationCriteria: [],
      commonLossReasons: []
    },
    discovery: {
      sections: [],
      mustAskQuestions: [],
      highIntentSignals: [],
      riskSignals: []
    },
    scripts: {
      openingPitch: '',
      followUpEmail: '',
      objectionHandlingStyle: '',
      forbiddenClaims: []
    },
    objections: [],
    segmentation: {
      customerSegments: [],
      industries: [],
      decisionMakers: []
    },
    contentCalendar: {
      themes: [],
      seasonalEvents: [],
      owners: []
    },
    sources: {
      officialSources: [],
      internalDocuments: [],
      reviewOwner: '',
      reviewCycle: ''
    },
    modules: {
      keepAll: true,
      notes: 'Ne briši modulov. Vsebino prilagodi kontekstu.'
    }
  }, null, 2) + '\n');
}

function isTextFile(file) {
  return /\.(html|js|css|json|md|sql|txt|yml|yaml|svg|mjs)$/i.test(file);
}
