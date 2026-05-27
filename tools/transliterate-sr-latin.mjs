import fs from 'node:fs';
import path from 'node:path';

if (process.argv[1]?.endsWith('transliterate-sr-latin.mjs')) {
  const file = path.resolve('data/content-sr.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toLatin(value)]));
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  console.log(`transliterated ${Object.keys(out).length} Serbian entries to Latin`);
}

export function toLatin(text) {
  const digraphs = [
    ['Љ', 'Lj'], ['љ', 'lj'],
    ['Њ', 'Nj'], ['њ', 'nj'],
    ['Џ', 'Dž'], ['џ', 'dž']
  ];
  const chars = {
    А: 'A', а: 'a', Б: 'B', б: 'b', В: 'V', в: 'v', Г: 'G', г: 'g',
    Д: 'D', д: 'd', Ђ: 'Đ', ђ: 'đ', Е: 'E', е: 'e', Ж: 'Ž', ж: 'ž',
    З: 'Z', з: 'z', И: 'I', и: 'i', Ј: 'J', ј: 'j', К: 'K', к: 'k',
    Л: 'L', л: 'l', М: 'M', м: 'm', Н: 'N', н: 'n', О: 'O', о: 'o',
    П: 'P', п: 'p', Р: 'R', р: 'r', С: 'S', с: 's', Т: 'T', т: 't',
    Ћ: 'Ć', ћ: 'ć', У: 'U', у: 'u', Ф: 'F', ф: 'f', Х: 'H', х: 'h',
    Ц: 'C', ц: 'c', Ч: 'Č', ч: 'č', Ш: 'Š', ш: 'š'
  };

  let result = text;
  for (const [from, to] of digraphs) result = result.replaceAll(from, to);
  return [...result].map(char => chars[char] || char).join('');
}
