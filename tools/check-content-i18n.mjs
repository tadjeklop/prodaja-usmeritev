import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('js/app.js');
const i18n = read('js/i18n.js');

const errors = [];

if (!app.includes('localizeLoadedData')) errors.push('js/app.js must localize JSON returned by loadData');
if (!app.includes('await waitForI18n')) errors.push('js/app.js loadData must wait for i18n before returning localized data');
if (!i18n.includes('contentPrevodi')) errors.push('js/i18n.js must load content translation dictionaries');
if (!i18n.includes('data/content-hr.json')) errors.push('js/i18n.js must load Croatian content translations');
if (!i18n.includes('data/content-sr.json')) errors.push('js/i18n.js must load Serbian content translations');
if (!i18n.includes('localizeText')) errors.push('js/i18n.js must expose text localization for JSON values');
if (!i18n.includes('translateTextNodes')) errors.push('js/i18n.js must translate unmarked static and generated text nodes');

for (const file of ['data/content-hr.json', 'data/content-sr.json']) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`${file} is missing`);
    continue;
  }
  JSON.parse(read(file));
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('content i18n infrastructure checks passed');
