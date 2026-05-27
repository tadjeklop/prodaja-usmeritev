import fs from 'fs';
import path from 'path';

const root = process.cwd();
const input = process.argv[2];
if (!input) {
  console.error('Usage: node tools/import-texts.mjs translations-review.tsv');
  process.exit(1);
}

const dataDir = path.join(root, 'data');
const i18nFile = path.join(dataDir, 'i18n.json');
const hrFile = path.join(dataDir, 'content-hr.json');
const srFile = path.join(dataDir, 'content-sr.json');

const i18n = readJson(i18nFile);
const hr = readJson(hrFile);
const sr = readJson(srFile);
const rows = parseTsv(fs.readFileSync(path.resolve(input), 'utf8'));

let uiUpdates = 0;
let contentUpdates = 0;

for (const row of rows) {
  const sl = clean(row.sl);
  const hrText = clean(row.hr);
  const srText = clean(row.sr);
  if (!sl) continue;

  if (row.kind === 'ui') {
    if (!i18n[row.id]) i18n[row.id] = { sl };
    i18n[row.id].sl = sl;
    if (hrText) i18n[row.id].hr = hrText;
    if (srText) i18n[row.id].sr = srText;
    uiUpdates++;
    continue;
  }

  if (row.kind === 'content') {
    if (hrText) hr[sl] = hrText;
    if (srText) sr[sl] = srText;
    contentUpdates++;
  }
}

fs.writeFileSync(i18nFile, JSON.stringify(i18n, null, 2) + '\n');
fs.writeFileSync(hrFile, JSON.stringify(hr, null, 2) + '\n');
fs.writeFileSync(srFile, JSON.stringify(sr, null, 2) + '\n');

console.log(`Updated ${uiUpdates} UI rows and ${contentUpdates} content rows`);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseTsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split('\t');
  return lines.map(line => {
    const cols = line.split('\t');
    return Object.fromEntries(header.map((key, index) => [key, cols[index] || '']));
  });
}

function clean(value) {
  return String(value || '').replace(/\\n/g, '\n').trim();
}
