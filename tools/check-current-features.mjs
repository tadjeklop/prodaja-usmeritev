import fs from 'node:fs';

const app = fs.readFileSync('js/app.js', 'utf8');
const i18n = fs.readFileSync('data/i18n.json', 'utf8');
const auth = fs.readFileSync('js/auth.js', 'utf8');
const koledar = fs.readFileSync('koledar.html', 'utf8');
const vsebine = fs.readFileSync('vsebine.html', 'utf8');
const zakonodaja = fs.readFileSync('zakonodaja.html', 'utf8');

const checks = [
  ['nav CRM label', app.includes("label: 'CRM'") && i18n.includes('"sl": "CRM"')],
  ['nav roleplay label', app.includes("label: 'Roleplay'") && i18n.includes('"sl": "Roleplay"')],
  ['nav brief label', app.includes("label: 'Brief'") && i18n.includes('"sl": "Brief"')],
  ['nav discovery label', app.includes("label: 'Discovery'") && i18n.includes('"sl": "Discovery"')],
  ['nav skripte label', app.includes("label: 'Skripte'") && i18n.includes('"sl": "Skripte"')],
  ['nav besednjak label', app.includes("label: 'Besednjak'") && i18n.includes('"sl": "Besednjak"')],
  ['nav LI vsebine label', app.includes("label: 'LI vsebine'") && i18n.includes('"sl": "LI vsebine"')],
  ['nav grouped categories', app.includes('NAV_GROUPS') && app.includes('app-nav-group') && i18n.includes('"nav.group.sales"')],
  ['auth respects manual language', auth.includes('i18n-lang-user-set') && auth.includes('shouldApplyProfileLanguage')],
  ['calendar custom events', koledar.includes('koledar-custom-items') && koledar.includes('lastnik') && koledar.includes('zadnji rok')],
  ['content custom ideas', vsebine.includes('li-content-ideas') && vsebine.includes('objavil') && vsebine.includes('tagi')],
  ['law source management', zakonodaja.includes('law-sources-') && zakonodaja.includes('Uradni viri in revizija zakonodaje')]
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`Missing features:\n- ${failed.join('\n- ')}`);

for (const file of ['koledar.html', 'vsebine.html', 'zakonodaja.html']) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    new Function(match[1]);
  }
}

console.log('current feature checks passed');
