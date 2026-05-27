import fs from 'node:fs';
import path from 'node:path';
import { toLatin } from './transliterate-sr-latin.mjs';

const root = path.resolve('.');
const cachePath = path.join(root, 'data', 'translation-cache.json');
const targets = [
  ['hr', 'data/content-hr.json'],
  ['sr', 'data/content-sr.json']
];

if (process.argv.includes('--reset') && fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'content-hr.json'), 'utf8'));
const strings = Object.keys(source).filter(text => text.trim().length > 1);

for (const [lang, outFile] of targets) {
  const result = {};
  for (let i = 0; i < strings.length; i += 10) {
    const batch = strings.slice(i, i + 10);
    await Promise.all(batch.map(async text => {
      const key = cacheKey(text, lang);
      if (!cache[key]) cache[key] = normalizeTranslation(await translateOneWithRetry(text, lang), lang);
      cache[key] = normalizeTranslation(cache[key], lang);
      result[text] = cache[key] || text;
    }));
    fs.writeFileSync(path.join(root, outFile), JSON.stringify(result, null, 2) + '\n');
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n');
    console.log(`${lang}: ${Math.min(i + batch.length, strings.length)}/${strings.length}`);
  }
  fs.writeFileSync(path.join(root, outFile), JSON.stringify(result, null, 2) + '\n');
}

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n');

async function translateOne(text, target) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'sl');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!response.ok) throw new Error(`Translate ${target} failed: ${response.status}`);
  const data = await response.json();
  return data[0].map(part => part[0]).join('');
}

async function translateOneWithRetry(text, target) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await translateOne(text, target);
    } catch (error) {
      lastError = error;
      await sleep(1000 * attempt);
    }
  }
  console.warn(`${target}: keeping source after translation failure: ${lastError.message}`);
  return text;
}

function cacheKey(text, target) {
  return `${target}\n${text}`;
}

function normalizeTranslation(text, target) {
  return target === 'sr' ? toLatin(text) : text;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
