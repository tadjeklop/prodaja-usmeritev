import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dataDir = path.join(root, 'data');
const out = {
  hr: {},
  sr: {}
};

const skipKeys = new Set(['id', 'url', 'barva', 'status', 'tema', 'avtor', 'drzava', 'datum', 'dan']);

function walk(value, key = '') {
  if (typeof value === 'string') {
    const text = value.trim();
    if (text && !skipKeys.has(key) && !looksLikeCode(text)) {
      out.hr[value] = translateHr(value);
      out.sr[value] = translateSr(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => walk(item, key));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      walk(childValue, childKey);
    }
  }
}

function looksLikeCode(text) {
  return /^https?:\/\//.test(text) ||
    /^[a-z0-9-]+$/i.test(text) ||
    /^\d{4}-\d{2}/.test(text) ||
    /[{};]/.test(text) ||
    /\b(function|const|let|return|Promise|querySelector)\b/.test(text);
}

const common = [
  ['Slovenija', 'Hrvatska', 'Srbija'],
  ['slovenski', 'hrvatski', 'srpski'],
  ['slovenščini', 'hrvatskom', 'srpskom'],
  ['slovenščina', 'hrvatski', 'srpski'],
  ['slovenščino', 'hrvatski', 'srpski'],
  ['Slovenska', 'Hrvatska', 'Srpska'],
  ['slovenska', 'hrvatska', 'srpska'],
  ['Slovenske', 'Hrvatske', 'Srpske'],
  ['slovenske', 'hrvatske', 'srpske'],
  ['stranka', 'klijent', 'klijent'],
  ['stranke', 'klijenta', 'klijenta'],
  ['stranko', 'klijenta', 'klijenta'],
  ['stranki', 'klijentu', 'klijentu'],
  ['strankam', 'klijentima', 'klijentima'],
  ['strankami', 'klijentima', 'klijentima'],
  ['podjetje', 'tvrtka', 'kompanija'],
  ['podjetja', 'tvrtke', 'kompanije'],
  ['podjetij', 'tvrtki', 'kompanija'],
  ['podjetjem', 'tvrtkom', 'kompanijom'],
  ['prodajalec', 'prodavač', 'prodavac'],
  ['prodajalca', 'prodavača', 'prodavca'],
  ['prodajalcu', 'prodavaču', 'prodavcu'],
  ['komercialist', 'komercijalist', 'komercijalista'],
  ['vodja', 'voditelj', 'menadžer'],
  ['vodjo', 'voditelja', 'menadžera'],
  ['sestanek', 'sastanak', 'sastanak'],
  ['sestanka', 'sastanka', 'sastanka'],
  ['sestanku', 'sastanku', 'sastanku'],
  ['ponudba', 'ponuda', 'ponuda'],
  ['ponudbe', 'ponude', 'ponude'],
  ['ponudbo', 'ponudu', 'ponudu'],
  ['ugovor', 'prigovor', 'prigovor'],
  ['ugovori', 'prigovori', 'prigovori'],
  ['ugovora', 'prigovora', 'prigovora'],
  ['odgovor', 'odgovor', 'odgovor'],
  ['odgovori', 'odgovori', 'odgovori'],
  ['vprašanje', 'pitanje', 'pitanje'],
  ['vprašanja', 'pitanja', 'pitanja'],
  ['vprašanji', 'pitanja', 'pitanja'],
  ['rešitev', 'rješenje', 'rešenje'],
  ['rešitve', 'rješenja', 'rešenja'],
  ['rešitvijo', 'rješenjem', 'rešenjem'],
  ['obveznosti', 'obveze', 'obaveze'],
  ['obveznost', 'obveza', 'obaveza'],
  ['zakonodaja', 'zakonodavstvo', 'zakonodavstvo'],
  ['zakonodaje', 'zakonodavstva', 'zakonodavstva'],
  ['embalaža', 'ambalaža', 'ambalaža'],
  ['embalaže', 'ambalaže', 'ambalaže'],
  ['odpadki', 'otpad', 'otpad'],
  ['odpadkov', 'otpada', 'otpada'],
  ['odpadke', 'otpad', 'otpad'],
  ['ravnanje', 'upravljanje', 'upravljanje'],
  ['poročanje', 'izvještavanje', 'izveštavanje'],
  ['poročila', 'izvještaja', 'izveštaja'],
  ['poročilo', 'izvještaj', 'izveštaj'],
  ['poročil', 'izvještaja', 'izveštaja'],
  ['dobavitelj', 'dobavljač', 'dobavljač'],
  ['dobavitelja', 'dobavljača', 'dobavljača'],
  ['dobavitelji', 'dobavljači', 'dobavljači'],
  ['kupec', 'kupac', 'kupac'],
  ['kupca', 'kupca', 'kupca'],
  ['kupci', 'kupci', 'kupci'],
  ['trg', 'tržište', 'tržište'],
  ['trga', 'tržišta', 'tržišta'],
  ['trgu', 'tržištu', 'tržištu'],
  ['država', 'država', 'država'],
  ['države', 'države', 'države'],
  ['državah', 'državama', 'državama'],
  ['hrvaška', 'hrvatska', 'hrvatska'],
  ['Hrvaška', 'Hrvatska', 'Hrvatska'],
  ['Srbija', 'Srbija', 'Srbija'],
  ['srbščina', 'srpski', 'srpski'],
  ['srbščini', 'srpskom', 'srpskom'],
  ['ključne', 'ključne', 'ključne'],
  ['ključnih', 'ključnih', 'ključnih'],
  ['ključno', 'ključno', 'ključno'],
  ['točke', 'točke', 'tačke'],
  ['točka', 'točka', 'tačka'],
  ['bolečine', 'bolne točke', 'bolne tačke'],
  ['bolečina', 'bolna točka', 'bolna tačka'],
  ['tveganje', 'rizik', 'rizik'],
  ['tveganja', 'rizika', 'rizika'],
  ['strošek', 'trošak', 'trošak'],
  ['stroški', 'troškovi', 'troškovi'],
  ['stroškov', 'troškova', 'troškova'],
  ['vrednost', 'vrijednost', 'vrednost'],
  ['vrednosti', 'vrijednosti', 'vrednosti'],
  ['cena', 'cijena', 'cena'],
  ['cene', 'cijene', 'cene'],
  ['čas', 'vrijeme', 'vreme'],
  ['časa', 'vremena', 'vremena'],
  ['tednov', 'tjedana', 'nedelja'],
  ['teden', 'tjedan', 'nedelja'],
  ['mesec', 'mjesec', 'mesec'],
  ['mesečno', 'mjesečno', 'mesečno'],
  ['letno', 'godišnje', 'godišnje'],
  ['naslednji', 'sljedeći', 'sledeći'],
  ['naslednja', 'sljedeća', 'sledeća'],
  ['naslednje', 'sljedeće', 'sledeće'],
  ['prejšnje', 'prethodne', 'prethodne'],
  ['prvič', 'prvi put', 'prvi put'],
  ['prvi', 'prvi', 'prvi'],
  ['drugi', 'drugi', 'drugi'],
  ['zadnji', 'zadnji', 'poslednji'],
  ['zadnja', 'zadnja', 'poslednja'],
  ['novo', 'novo', 'novo'],
  ['nova', 'nova', 'nova'],
  ['novi', 'novi', 'novi'],
  ['stari', 'stari', 'stari'],
  ['majhno', 'malo', 'malo'],
  ['majhna', 'mala', 'mala'],
  ['večja', 'veća', 'veća'],
  ['večji', 'veći', 'veći'],
  ['večino', 'većinu', 'većinu'],
  ['večina', 'većina', 'većina'],
  ['pogosto', 'često', 'često'],
  ['običajno', 'obično', 'obično'],
  ['trenutno', 'trenutno', 'trenutno'],
  ['skupaj', 'zajedno', 'zajedno'],
  ['lahko', 'može', 'može'],
  ['morate', 'morate', 'morate'],
  ['moraš', 'moraš', 'moraš'],
  ['moramo', 'moramo', 'moramo'],
  ['želijo', 'žele', 'žele'],
  ['želite', 'želite', 'želite'],
  ['imate', 'imate', 'imate'],
  ['imamo', 'imamo', 'imamo'],
  ['nimamo', 'nemamo', 'nemamo'],
  ['nimajo', 'nemaju', 'nemaju'],
  ['nimate', 'nemate', 'nemate'],
  ['pomeni', 'znači', 'znači'],
  ['pomenijo', 'znače', 'znače'],
  ['preveri', 'provjeri', 'proveri'],
  ['preverimo', 'provjerimo', 'proverimo'],
  ['preveriti', 'provjeriti', 'proveriti'],
  ['pripravi', 'pripremi', 'pripremi'],
  ['pripraviti', 'pripremiti', 'pripremiti'],
  ['priprava', 'priprema', 'priprema'],
  ['pripravljeno', 'pripremljeno', 'pripremljeno'],
  ['pošlji', 'pošalji', 'pošalji'],
  ['pošljite', 'pošaljite', 'pošaljite'],
  ['pošljem', 'pošaljem', 'pošaljem'],
  ['pošlje', 'pošalje', 'pošalje'],
  ['pokliče', 'nazove', 'pozove'],
  ['kličem', 'zovem', 'zovem'],
  ['delamo', 'radimo', 'radimo'],
  ['dela', 'radi', 'radi'],
  ['naredimo', 'napravimo', 'uradimo'],
  ['naredite', 'napravite', 'uradite'],
  ['naredi', 'napravi', 'uradi'],
  ['urejeno', 'uređeno', 'uređeno'],
  ['urejamo', 'uređujemo', 'uređujemo'],
  ['urejati', 'uređivati', 'uređivati'],
  ['spremljati', 'pratiti', 'pratiti'],
  ['spremljamo', 'pratimo', 'pratimo'],
  ['izboljšati', 'poboljšati', 'poboljšati'],
  ['zmanjša', 'smanjuje', 'smanjuje'],
  ['zmanjšanje', 'smanjenje', 'smanjenje'],
  ['poveča', 'povećava', 'povećava'],
  ['učenje', 'učenje', 'učenje'],
  ['vaja', 'vježba', 'vežba'],
  ['vaje', 'vježbe', 'vežbe'],
  ['glosar', 'pojmovnik', 'pojmovnik'],
  ['koledar', 'kalendar', 'kalendar'],
  ['zgodovina', 'povijest', 'istorija'],
  ['iskanje', 'pretraga', 'pretraga'],
  ['išči', 'pretraži', 'pretraži'],
  ['nalagam', 'učitavam', 'učitavam'],
  ['napaka', 'greška', 'greška'],
  ['opomba', 'napomena', 'napomena'],
  ['opombe', 'napomene', 'napomene'],
  ['primer', 'primjer', 'primer'],
  ['primeri', 'primjeri', 'primeri'],
  ['uporabe', 'upotrebe', 'upotrebe'],
  ['uporaba', 'upotreba', 'upotreba'],
  ['vsebina', 'sadržaj', 'sadržaj'],
  ['vsebine', 'sadržaji', 'sadržaji'],
  ['govori', 'govori', 'govori'],
  ['skripte', 'skripte', 'skripte'],
  ['kopiraj', 'kopiraj', 'kopiraj'],
  ['beri', 'čitaj', 'čitaj'],
  ['zapri', 'zatvori', 'zatvori'],
  ['shrani', 'spremi', 'sačuvaj'],
  ['prekini', 'otkaži', 'otkaži'],
  ['izbriši', 'obriši', 'obriši'],
  ['izvozi', 'izvezi', 'izvezi'],
  ['uvozi', 'uvezi', 'uvezi']
];

const phrase = [
  ['Dober dan', 'Dobar dan', 'Dobar dan'],
  ['Lep pozdrav', 'Lijep pozdrav', 'Srdačan pozdrav'],
  ['Hvala za čas', 'Hvala na vremenu', 'Hvala na vremenu'],
  ['Razumem', 'Razumijem', 'Razumem'],
  ['Predlagam', 'Predlažem', 'Predlažem'],
  ['Na koncu', 'Na kraju', 'Na kraju'],
  ['Kdo smo', 'Tko smo', 'Ko smo'],
  ['Kaj dobite', 'Što dobivate', 'Šta dobijate'],
  ['Kaj potrebujemo od vas', 'Što trebamo od vas', 'Šta nam treba od vas'],
  ['Naslednji korak', 'Sljedeći korak', 'Sledeći korak'],
  ['Ključne obveznosti', 'Ključne obveze', 'Ključne obaveze'],
  ['Uradni viri', 'Službeni izvori', 'Zvanični izvori'],
  ['Ni podatkov', 'Nema podataka', 'Nema podataka'],
  ['Ne morem naložiti podatkov', 'Ne mogu učitati podatke', 'Ne mogu da učitam podatke']
];

function translateHr(text) {
  return translate(text, 1);
}

function translateSr(text) {
  return translate(text, 2)
    .replaceAll('rje', 're')
    .replaceAll('Rje', 'Re')
    .replaceAll('cij', 'cen')
    .replaceAll('Cij', 'Cen');
}

function translate(text, idx) {
  let result = text;
  for (const item of phrase) result = replaceLiteral(result, item[0], item[idx]);
  for (const item of common.sort((a, b) => b[0].length - a[0].length)) {
    result = replaceWord(result, item[0], item[idx]);
    result = replaceWord(result, capitalize(item[0]), capitalize(item[idx]));
  }
  result = result
    .replaceAll('Č', 'Č')
    .replaceAll('č', 'č')
    .replaceAll('ž', 'ž')
    .replaceAll('š', 'š')
    .replaceAll('—', '—');
  return result;
}

function replaceLiteral(text, from, to) {
  return text.split(from).join(to);
}

function replaceWord(text, from, to) {
  return text.replace(new RegExp(`(^|[^\\p{L}])${escapeRegExp(from)}(?=$|[^\\p{L}])`, 'gu'), `$1${to}`);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

for (const file of fs.readdirSync(dataDir).filter(file => file.endsWith('.json') && !file.startsWith('content-'))) {
  walk(JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')));
}

for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const text of extractHtmlText(html)) addText(text);
  for (const text of extractAttributes(html)) addText(text);
  for (const text of extractQuotedStrings(html)) addText(text);
}

for (const file of fs.readdirSync(path.join(root, 'js')).filter(file => file.endsWith('.js'))) {
  const js = fs.readFileSync(path.join(root, 'js', file), 'utf8');
  for (const text of extractQuotedStrings(js)) addText(text);
}

fs.writeFileSync(path.join(dataDir, 'content-hr.json'), JSON.stringify(out.hr, null, 2) + '\n');
fs.writeFileSync(path.join(dataDir, 'content-sr.json'), JSON.stringify(out.sr, null, 2) + '\n');

console.log(`content-hr.json: ${Object.keys(out.hr).length} entries`);
console.log(`content-sr.json: ${Object.keys(out.sr).length} entries`);

function addText(text) {
  const value = decodeEntities(text).trim();
  if (!value || value.length < 2 || looksLikeCode(value)) return;
  out.hr[value] = translateHr(value);
  out.sr[value] = translateSr(value);
}

function extractHtmlText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .split(/<[^>]+>/g)
    .map(text => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function extractAttributes(html) {
  return [...html.matchAll(/\s(?:title|placeholder|aria-label)="([^"]+)"/g)].map(match => match[1]);
}

function extractQuotedStrings(text) {
  const found = [];
  for (const match of text.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S]){2,}?)\1/g)) {
    const value = match[2]
      .replace(/\\n/g, ' ')
      .replace(/\$\{[^}]+\}/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (/[A-ZČŠŽa-zčšžćđ]/.test(value) && /[\sČŠŽčšžćđ]/.test(value)) found.push(value);
  }
  return found;
}

function decodeEntities(text) {
  return text
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}
