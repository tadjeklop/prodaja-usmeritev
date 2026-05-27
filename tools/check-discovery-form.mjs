import fs from 'node:fs';

const html = fs.readFileSync('obrazec.html', 'utf8');
const sql = fs.readFileSync('supabase-schema.sql', 'utf8');

const checks = [
  ['Supabase schema defines discovery_forms', /create table if not exists public\.discovery_forms/i.test(sql)],
  ['Discovery form has saved-form list', html.includes('id="saved-forms"')],
  ['Discovery form has editable customer input', html.includes('id="customer"')],
  ['Discovery form has save draft button', html.includes('id="save-draft"')],
  ['Discovery form has complete button', html.includes('id="complete-form"')],
  ['Discovery form has CRM summary output', html.includes('id="crm-summary"')],
  ['Discovery form has CRM copy button', html.includes('id="copy-crm-summary"')],
  ['Discovery form generates CRM summary', html.includes('function buildCrmSummary')],
  ['Discovery form writes through Auth.rest', html.includes('Auth.rest(')],
  ['Discovery form renders answer textareas', html.includes('class="answer-field"')]
];

const failed = checks.filter(([, passed]) => !passed);

if (failed.length) {
  console.error('Discovery form checks failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('Discovery form checks passed.');
