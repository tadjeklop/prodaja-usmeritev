import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const hr = JSON.parse(fs.readFileSync(path.join(root, 'data/content-hr.json'), 'utf8'));
const sr = JSON.parse(fs.readFileSync(path.join(root, 'data/content-sr.json'), 'utf8'));
const missing = [];

const skipKeys = new Set(['id', 'url', 'barva', 'status', 'tema', 'avtor', 'drzava', 'datum', 'dan']);

function add(text, source) {
  const value = decodeEntities(text).trim();
  if (!value || value.length < 2 || looksLikeCode(value)) return;
  if (!hr[value]) missing.push(`${source}: missing HR translation for "${value.slice(0, 80)}"`);
  if (!sr[value]) missing.push(`${source}: missing SR translation for "${value.slice(0, 80)}"`);
}

function walk(value, source, key = '') {
  if (typeof value === 'string') {
    if (!skipKeys.has(key)) add(value, source);
    return;
  }
  if (Array.isArray(value)) value.forEach(item => walk(item, source, key));
  else if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) walk(childValue, source, childKey);
  }
}

for (const file of fs.readdirSync(path.join(root, 'data')).filter(file => file.endsWith('.json') && !file.startsWith('content-') && file !== 'translation-cache.json')) {
  walk(JSON.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8')), `data/${file}`);
}

for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  extractHtmlText(html).forEach(text => add(text, file));
  extractAttributes(html).forEach(text => add(text, file));
  extractQuotedStrings(html).forEach(text => add(text, file));
}

for (const file of fs.readdirSync(path.join(root, 'js')).filter(file => file.endsWith('.js'))) {
  const js = fs.readFileSync(path.join(root, 'js', file), 'utf8');
  extractQuotedStrings(js).forEach(text => add(text, `js/${file}`));
}

if (missing.length) {
  console.error(missing.slice(0, 100).join('\n'));
  console.error(`${missing.length} missing translations`);
  process.exit(1);
}

console.log('translation coverage checks passed');

function looksLikeCode(text) {
  return /^https?:\/\//.test(text) ||
    /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text) ||
    /^[a-z0-9-]+$/i.test(text) ||
    /^[,'"`.:\-)\]}]/.test(text) ||
    /^\d{4}-\d{2}/.test(text) ||
    /[{};[\]()]/.test(text) ||
    /[=>]/.test(text) ||
    /\b(text|bg|border|rounded|hidden|flex|grid|w-full|mt|mb|pt|py|px)-/.test(text) ||
    /\b(btn|login-error|justify-center)\b/.test(text) ||
    /^data\/[-a-z0-9/.]+$/i.test(text) ||
    /\b(function|const|let|return|Promise|querySelector)\b/.test(text);
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
