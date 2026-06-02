import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outFile = process.argv[2] || 'slovenian-review.tsv';
const rows = [];
const seen = new Set();

exportI18n();
exportDataJson();
exportHtml();
exportJs();

rows.sort((a, b) => `${a.source_file}\t${a.kind}\t${a.path}`.localeCompare(`${b.source_file}\t${b.kind}\t${b.path}`));

const header = ['kind', 'source_file', 'path', 'original_sl', 'corrected_sl', 'notes'];
const body = [header.join('\t'), ...rows.map(row => header.map(key => tsv(row[key])).join('\t'))].join('\n') + '\n';
fs.writeFileSync(path.join(root, outFile), body);
console.log(`${outFile}: ${rows.length} rows`);

function exportI18n() {
  const file = 'data/i18n.json';
  const data = readJson(file);
  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object' || !('sl' in value)) continue;
    add({
      kind: 'i18n',
      source_file: file,
      path: key,
      original_sl: value.sl || ''
    });
  }
}

function exportDataJson() {
  const dataDir = path.join(root, 'data');
  const skip = new Set(['content-hr.json', 'content-sr.json', 'translation-cache.json', 'i18n.json']);
  for (const name of fs.readdirSync(dataDir).filter(file => file.endsWith('.json') && !skip.has(file))) {
    const file = `data/${name}`;
    walk(readJson(file), [], (value, jsonPath) => {
      if (!isReviewableText(value)) return;
      add({
        kind: 'json',
        source_file: file,
        path: jsonPath.join('.'),
        original_sl: value
      });
    });
  }
}

function exportHtml() {
  for (const name of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    extractHtmlText(html).forEach((text, index) => add({
      kind: 'html_text',
      source_file: name,
      path: `text.${index}`,
      original_sl: text
    }));
    extractAttributes(html).forEach((item, index) => add({
      kind: 'html_attr',
      source_file: name,
      path: `${item.attr}.${index}`,
      original_sl: item.value
    }));
  }
}

function exportJs() {
  for (const name of fs.readdirSync(path.join(root, 'js')).filter(file => file.endsWith('.js'))) {
    const source = `js/${name}`;
    const js = fs.readFileSync(path.join(root, source), 'utf8');
    extractQuotedStrings(js).forEach((text, index) => add({
      kind: 'js_string',
      source_file: source,
      path: `string.${index}`,
      original_sl: text
    }));
  }
}

function add(row) {
  const original = normalize(row.original_sl);
  if (!isReviewableText(original)) return;
  const key = `${row.source_file}\t${row.kind}\t${original}`;
  if (seen.has(key)) return;
  seen.add(key);
  rows.push({ ...row, original_sl: original, corrected_sl: '', notes: '' });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
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

function extractHtmlText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .split(/<[^>]+>/g)
    .map(normalize)
    .filter(Boolean);
}

function extractAttributes(html) {
  return [...html.matchAll(/\s(title|placeholder|aria-label)="([^"]+)"/g)]
    .map(match => ({ attr: match[1], value: decodeEntities(match[2]) }));
}

function extractQuotedStrings(text) {
  const found = [];
  for (const match of text.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S]){2,}?)\1/g)) {
    const value = normalize(match[2]
      .replace(/\\n/g, ' ')
      .replace(/\$\{[^}]+\}/g, '')
      .replace(/<[^>]+>/g, ' '));
    if (isReviewableText(value)) found.push(value);
  }
  return found;
}

function isReviewableText(value) {
  if (!value || value.length < 2) return false;
  if (/^https?:\/\//.test(value)) return false;
  if (/^[\d\s.,:%/-]+$/.test(value)) return false;
  if (/^[a-z0-9_.:/?#=&-]+$/i.test(value)) return false;
  if (/[{}[\]();=>]/.test(value)) return false;
  if (/\b(text|bg|border|rounded|hidden|flex|grid|w-full|mt|mb|pt|py|px)-/.test(value)) return false;
  return /[A-Za-zČŠŽĆĐčšžćđ]/.test(value);
}

function normalize(value) {
  return decodeEntities(String(value || '').replace(/\s+/g, ' ').trim());
}

function decodeEntities(text) {
  return text
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function tsv(value) {
  return String(value ?? '').replace(/\r?\n/g, '\\n').replace(/\t/g, ' ');
}
