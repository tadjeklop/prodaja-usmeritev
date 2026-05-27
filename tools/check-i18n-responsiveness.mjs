import fs from 'node:fs';

const i18n = fs.readFileSync('js/i18n.js', 'utf8');
const search = fs.readFileSync('js/search.js', 'utf8');
const errors = [];

if (!i18n.includes('isApplying')) errors.push('i18n must guard against observer/apply recursion');
if (i18n.includes('new MutationObserver')) errors.push('i18n must not observe the whole page; it makes click handling sluggish on large pages');
if (!i18n.includes('location.reload()')) errors.push('language changes must reload so JSON content is localized before render');
if (!i18n.includes("if (this.jezik === 'hr') requests.push(fetch('data/content-hr.json'))")) errors.push('i18n must lazy-load only the active content dictionary');
if (search.includes('subtree: true')) errors.push('search trigger observer must not observe the entire subtree');
if (!search.includes('searchObserver.disconnect()')) errors.push('search trigger observer must disconnect after injection');
if (!i18n.includes('if (el.textContent !== text)')) errors.push('data-i18n textContent must only update when changed');
if (!i18n.includes("if (el.getAttribute('placeholder') !== text)")) errors.push('placeholder must only update when changed');
if (!i18n.includes("if (el.getAttribute('title') !== text)")) errors.push('title must only update when changed');
if (!i18n.includes('if (node.nodeValue !== next)')) errors.push('text nodes must only update when changed');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('i18n responsiveness checks passed');
