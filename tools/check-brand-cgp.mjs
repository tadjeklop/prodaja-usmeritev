import fs from 'node:fs';

const files = [
  'css/style.css',
  'js/app.js',
  'js/i18n.js',
  'js/search.js',
  'js/speech.js',
  'js/ponudba.js'
];

const requiredColors = ['#009dd3', '#183362', '#ffce00'];
const oldPrimaryColors = ['#2e7d32', '#1b5e20', '#e8f5e9', 'rgba(46, 125, 50'];

const combined = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');

const missing = requiredColors.filter(color => !combined.toLowerCase().includes(color));
if (missing.length) {
  throw new Error(`Missing Interzero CGP colors: ${missing.join(', ')}`);
}

const stale = oldPrimaryColors.filter(color => combined.toLowerCase().includes(color));
if (stale.length) {
  throw new Error(`Old green UI colors still present: ${stale.join(', ')}`);
}

console.log('Interzero CGP colors are applied.');
