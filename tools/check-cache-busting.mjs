import fs from 'node:fs';
import path from 'node:path';

const version = 'v22';
const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));
const failures = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes(`css/style.css?${version}`)) failures.push(`${file}: css/style.css is not versioned`);
  if (html.includes('js/app.js') && !html.includes(`js/app.js?${version}`)) {
    failures.push(`${file}: js/app.js is not versioned`);
  }
}

const css = fs.readFileSync(path.join('css', 'style.css'), 'utf8');
for (const selector of ['.app-nav-logo::before', 'main > header']) {
  if (!css.includes(selector)) failures.push(`css/style.css: missing visible brand selector ${selector}`);
}

if (failures.length) {
  throw new Error(failures.join('\n'));
}

console.log(`HTML asset cache busting is applied with ${version}.`);
