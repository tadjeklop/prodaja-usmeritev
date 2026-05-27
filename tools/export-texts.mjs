import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const outFile = process.argv[2] || 'translations-review.tsv';
const skip = new Set(['content-hr.json', 'content-sr.json']);

const i18n = readJson(path.join(dataDir, 'i18n.json'));
const hr = readJson(path.join(dataDir, 'content-hr.json'));
const sr = readJson(path.join(dataDir, 'content-sr.json'));
const rows = [];
const seenContent = new Set();

for (const [key, value] of Object.entries(i18n)) {
  if (!value || typeof value !== 'object' || !('sl' in value)) continue;
  rows.push({
    kind: 'ui',
    source_file: 'data/i18n.json',
    id: key,
    json_path: key,
    sl: value.sl || '',
    hr: value.hr || '',
    sr: value.sr || '',
    notes: ''
  });
}

for (const file of fs.readdirSync(dataDir).filter(name => name.endsWith('.json') && !skip.has(name))) {
  const full = path.join(dataDir, file);
  const data = readJson(full);
  walk(data, [], (value, jsonPath) => {
    if (!isReviewableText(value)) return;
    if (seenContent.has(value)) return;
    seenContent.add(value);
    rows.push({
      kind: 'content',
      source_file: `data/${file}`,
      id: stableId(file, jsonPath),
      json_path: jsonPath.join('.'),
      sl: value,
      hr: hr[value] || '',
      sr: sr[value] || '',
      notes: ''
    });
  });
}

rows.sort((a, b) => `${a.kind}\t${a.source_file}\t${a.json_path}`.localeCompare(`${b.kind}\t${b.source_file}\t${b.json_path}`));

const header = ['kind', 'source_file', 'id', 'json_path', 'sl', 'hr', 'sr', 'notes'];
const body = [header.join('\t'), ...rows.map(row => header.map(key => tsv(row[key])).join('\t'))].join('\n') + '\n';
fs.writeFileSync(path.join(root, outFile), body);
console.log(`${outFile}: ${rows.length} rows`);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function walk(value, jsonPath, visit) {
  if (typeof value === 'string') {
    visit(value, jsonPath);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, [...jsonPath, index], visit));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (key.endsWith('_hr') || key.endsWith('_sr')) continue;
    walk(item, [...jsonPath, key], visit);
  }
}

function isReviewableText(value) {
  if (value.length < 2) return false;
  if (/^https?:\/\//.test(value)) return false;
  if (/^[\d\s.,:%/-]+$/.test(value)) return false;
  return /[A-Za-zČŠŽĆĐčšžćđ]/.test(value);
}

function stableId(file, jsonPath) {
  return `${file.replace('.json', '')}:${jsonPath.join('.')}`;
}

function tsv(value) {
  return String(value ?? '').replace(/\r?\n/g, '\\n').replace(/\t/g, ' ');
}
