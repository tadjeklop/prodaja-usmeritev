import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2] || path.resolve('..', '..', 'Codex', 'COWORK', 'sales-portal-template');
const required = [
  'TEMPLATE-CONTEXT.md',
  'PORTAL-CONTENT-MAP.md',
  'CREATE-NEW-PORTAL.md',
  'README.md',
  'data/portal-context.example.json',
  'index.html',
  'js/app.js',
  'css/style.css',
  'data/i18n.json'
];
const forbidden = [
  'data/content-hr.json',
  'data/content-sr.json',
  'translations-review.tsv'
];

if (!fs.existsSync(target)) throw new Error(`Template folder does not exist: ${target}`);

const missing = required.filter(file => !fs.existsSync(path.join(target, file)));
if (missing.length) throw new Error(`Missing required template files:\n- ${missing.join('\n- ')}`);

const presentForbidden = forbidden.filter(file => fs.existsSync(path.join(target, file)));
if (presentForbidden.length) throw new Error(`Template still contains multilingual/review files:\n- ${presentForbidden.join('\n- ')}`);

const searchable = collectFiles(target).filter(file =>
  !file.includes(`${path.sep}.git${path.sep}`) &&
  !file.endsWith('.svg') &&
  !file.endsWith('.png')
);
const combined = searchable.map(file => fs.readFileSync(file, 'utf8')).join('\n');

const forbiddenText = [
  'Interzero',
  'interzero',
  'Hrvatska',
  'Srbija',
  'Srpski',
  'Hrvatski',
  'content-hr',
  'content-sr',
  'HR/SR',
  'SI/HR/SR'
].filter(value => combined.includes(value));

if (forbiddenText.length) throw new Error(`Template still contains old context markers:\n- ${forbiddenText.join('\n- ')}`);

const app = fs.readFileSync(path.join(target, 'js/app.js'), 'utf8');
if (!app.includes('Prodajni portal')) throw new Error('Template app brand was not neutralized.');
if (!app.includes("const NAV_GROUPS")) throw new Error('Template lost grouped navigation.');

const i18n = JSON.parse(fs.readFileSync(path.join(target, 'data/i18n.json'), 'utf8'));
if (JSON.stringify(i18n).includes('"hr"') || JSON.stringify(i18n).includes('"sr"')) {
  throw new Error('Template i18n still contains HR/SR languages.');
}

console.log(`template check passed: ${target}`);

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.claude'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else out.push(full);
  }
  return out;
}
