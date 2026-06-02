import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const input = process.argv[2];

if (!input) {
  console.error('Usage: node tools/import-slovenian-review.mjs slovenian-review.tsv');
  process.exit(1);
}

const rows = parseTsv(fs.readFileSync(path.resolve(input), 'utf8'));
const jsonCache = new Map();
let updates = 0;

for (const row of rows) {
  const original = clean(row.original_sl);
  const corrected = clean(row.corrected_sl);
  if (!original || !corrected || original === corrected) continue;

  if (row.kind === 'i18n') {
    const file = 'data/i18n.json';
    const data = getJson(file);
    if (!data[row.path]) data[row.path] = { sl: original };
    data[row.path].sl = corrected;
    updates++;
    continue;
  }

  if (row.kind === 'json') {
    const data = getJson(row.source_file);
    setPath(data, row.path, corrected);
    updates++;
    continue;
  }

  if (['html_text', 'html_attr', 'js_string'].includes(row.kind)) {
    const file = path.join(root, row.source_file);
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes(original)) {
      console.warn(`Skipped, original not found: ${row.source_file} :: ${original.slice(0, 80)}`);
      continue;
    }
    fs.writeFileSync(file, text.replaceAll(original, corrected));
    updates++;
  }
}

for (const [file, data] of jsonCache.entries()) {
  fs.writeFileSync(path.join(root, file), JSON.stringify(data, null, 2) + '\n');
}

console.log(`Imported ${updates} Slovenian text corrections.`);

function getJson(file) {
  if (!jsonCache.has(file)) {
    jsonCache.set(file, JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')));
  }
  return jsonCache.get(file);
}

function setPath(data, dotPath, value) {
  const parts = dotPath.split('.');
  let node = data;
  for (const part of parts.slice(0, -1)) {
    node = node[Number.isInteger(Number(part)) ? Number(part) : part];
  }
  const last = parts.at(-1);
  node[Number.isInteger(Number(last)) ? Number(last) : last] = value;
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
