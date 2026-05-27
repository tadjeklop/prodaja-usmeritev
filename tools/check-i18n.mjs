import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const i18n = JSON.parse(read('data/i18n.json'));

const requiredKeys = [
  'common.kopirano',
  'common.copy_error',
  'common.beri_scenarij',
  'common.beri_prikazane',
  'common.kategorija',
  'common.kratek_odgovor',
  'common.daljsi_odgovor',
  'common.opomba_prodajalcu',
  'common.vse_kategorije',
  'common.nalaganje_error',
  'zakonodaja.subtitle',
  'zakonodaja.opozorilo',
  'zakonodaja.zadnja_revizija',
  'zakonodaja.kljucne_obveznosti',
  'zakonodaja.uradni_viri',
  'stranke.prazno',
  'stranke.alarm_hint',
  'stranke.samo_zmage',
  'stranke.samo_izgube',
  'stranke.nova_modal',
  'stranke.panoga',
  'stranke.kontakt',
  'stranke.funkcija',
  'stranke.verjetnost',
  'stranke.datum_koraka',
  'stranke.bolecine',
  'stranke.opombe',
  'stranke.razlog_izgube',
  'stranke.aktivno',
  'stranke.zmaga',
  'stranke.izguba'
];

const requiredHtmlMarkers = {
  'govori.html': ['data-i18n="common.beri_scenarij"'],
  'ugovori.html': [
    'data-i18n="common.beri_prikazane"',
    'data-i18n="common.iskanje"',
    'data-i18n-placeholder="ph.ugovori"',
    'data-i18n="common.kategorija"'
  ],
  'stranke.html': [
    'data-i18n="stranke.audit"',
    'data-i18n="common.izvozi"',
    'data-i18n="common.uvozi"',
    'data-i18n="stranke.nova"',
    'data-i18n-placeholder="ph.iskaj_stranke"',
    'data-i18n="stranke.prazno"',
    'data-i18n="stranke.alarm_hint"'
  ],
  'zakonodaja.html': [
    'data-i18n="zakonodaja.subtitle"',
    'tr(\'zakonodaja.opozorilo\'',
    'tr(\'zakonodaja.uradni_viri\''
  ]
};

const errors = [];

for (const key of requiredKeys) {
  if (!i18n[key]) {
    errors.push(`Missing i18n key: ${key}`);
    continue;
  }
  for (const lang of ['sl', 'hr', 'sr']) {
    if (!i18n[key][lang]) errors.push(`Missing ${lang} translation for ${key}`);
  }
}

for (const [file, markers] of Object.entries(requiredHtmlMarkers)) {
  const text = read(file);
  for (const marker of markers) {
    if (!text.includes(marker)) errors.push(`${file} missing marker: ${marker}`);
  }
}

const i18nJs = read('js/i18n.js');
if (i18nJs.includes('MutationObserver')) errors.push('js/i18n.js must not use MutationObserver for whole-page translation');
if (!i18nJs.includes('i18n:changed')) errors.push('js/i18n.js must dispatch i18n:changed after language changes');

const appJs = read('js/app.js');
if (!appJs.includes("tr('common.kopirano'")) errors.push('js/app.js copy feedback must use i18n');
if (!appJs.includes("tr('common.copy_error'")) errors.push('js/app.js copy error must use i18n');
if (!appJs.includes('localeForCurrentLanguage')) errors.push('js/app.js number formatting must honor current language');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('i18n checks passed');
