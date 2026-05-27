// Predloga ponudbe — generator s pre-fill iz predlog in živim predogledom.

let TPL = null;

const FORM_IDS = [
  'naziv','naslov','kontakt','datum','stevilka',
  'ponudba-naslov','bolecine','povzetek','obseg','vhodi',
  'postavke','zacetek','trajanje','veljavnost','naslednji-korak'
];

async function init() {
  TPL = await loadData('predloga-ponudbe');
  if (!TPL) {
    document.getElementById('preview').innerHTML =
      '<p class="text-red-700">Ne morem naložiti predloge. Aplikacijo poženi prek lokalnega strežnika.</p>';
    return;
  }

  // Populate predloga dropdown — group generic vs sektorske
  const sel = document.getElementById('predloga');
  const generic = TPL.predloge.filter(p => !p.sektor);
  const sektorske = TPL.predloge.filter(p => p.sektor);
  sel.innerHTML = '<option value="">— izberi izhodišče —</option>' +
    '<optgroup label="Splošni paketi">' +
    generic.map(p => `<option value="${p.id}">${p.naslov}</option>`).join('') +
    '</optgroup>' +
    (sektorske.length ? '<optgroup label="Sektorski paketi">' +
    sektorske.map(p => `<option value="${p.id}">${p.naslov}</option>`).join('') +
    '</optgroup>' : '');
  sel.addEventListener('change', applyPredloga);

  // Defaults
  document.getElementById('datum').value = new Date().toISOString().slice(0, 10);
  document.getElementById('veljavnost').value = TPL.veljavnost_dni;

  // Live update
  FORM_IDS.forEach(id => {
    document.getElementById(id).addEventListener('input', renderPreview);
  });

  document.getElementById('btn-shrani').addEventListener('click', shrani);
  document.getElementById('btn-pocisti').addEventListener('click', pocisti);

  // Auto-load if returning to edit
  const editId = qs('id');
  if (editId) {
    const saved = Storage.findInList('ponudbe', editId);
    if (saved) loadIntoForm(saved);
  }

  renderPreview();
}

function applyPredloga(e) {
  const p = TPL.predloge.find(x => x.id === e.target.value);
  if (!p) return;
  document.getElementById('ponudba-naslov').value = p.naslov;
  document.getElementById('povzetek').value = p.povzetek_resitve;
  document.getElementById('obseg').value = p.obseg_storitev.join('\n');
  document.getElementById('vhodi').value = p.kaj_potrebujemo_od_stranke.join('\n');
  if (!document.getElementById('naslednji-korak').value) {
    document.getElementById('naslednji-korak').value =
      'Predlagamo, da se v naslednjem tednu slišimo za 20-minutni pregled ponudbe. V tem času lahko odgovorim na morebitna vprašanja in skupaj postaviva časovnico za začetek sodelovanja.';
  }
  renderPreview();
}

function getState() {
  const state = {};
  FORM_IDS.forEach(id => state[id] = document.getElementById(id).value);
  return state;
}

function loadIntoForm(saved) {
  FORM_IDS.forEach(id => {
    if (saved[id] !== undefined) document.getElementById(id).value = saved[id];
  });
}

function pocisti() {
  if (!confirm('Pobrišem vsa polja?')) return;
  FORM_IDS.forEach(id => document.getElementById(id).value = '');
  document.getElementById('datum').value = new Date().toISOString().slice(0, 10);
  document.getElementById('veljavnost').value = TPL.veljavnost_dni;
  document.getElementById('predloga').value = '';
  renderPreview();
}

function shrani() {
  const s = getState();
  if (!s.naziv) {
    alert('Vnesi vsaj naziv stranke, da lahko shranim.');
    return;
  }
  Storage.push('ponudbe', s);
  const btn = document.getElementById('btn-shrani');
  const orig = btn.textContent;
  btn.textContent = '✓ Shranjeno';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
}

function parsePostavke(raw) {
  return raw.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const parts = l.split('|').map(p => p.trim());
    return { opis: parts[0] || '', cena: parseFloat(parts[1]) || 0, enota: parts[2] || '' };
  });
}

function fmtDatum(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

function veljavnostDo(iso, dni) {
  if (!iso) return '—';
  const d = new Date(iso);
  d.setDate(d.getDate() + parseInt(dni || 0));
  return fmtDatum(d.toISOString().slice(0, 10));
}

function renderPreview() {
  const s = getState();
  const postavke = parsePostavke(s.postavke);
  const bullets = txt => txt.split('\n').map(l => l.trim()).filter(Boolean);

  const html = `
    <div class="ponudba-doc">
      <div class="pon-header">
        <div>
          <div class="text-xs uppercase tracking-wider text-stone-500">Ponudba</div>
          <div class="text-2xl font-bold mt-1">${s['ponudba-naslov'] || '(naslov ponudbe)'}</div>
          <div class="text-sm text-stone-600 mt-1">${s.stevilka ? 'Št. ' + s.stevilka + ' · ' : ''}${fmtDatum(s.datum)}</div>
        </div>
        <div class="text-right text-sm">
          <div class="font-bold" style="color: #1b5e20">${TPL.ponudnik.naziv}</div>
          <div class="text-stone-600">${TPL.ponudnik.naslov}</div>
          <div class="text-stone-600 mt-1">${TPL.ponudnik.kontakt_email}</div>
          <div class="text-stone-600">${TPL.ponudnik.kontakt_telefon}</div>
        </div>
      </div>

      <div class="mb-6">
        <div class="text-xs uppercase tracking-wider text-stone-500">Za</div>
        <div class="font-semibold text-lg">${s.naziv || '(naziv podjetja)'}</div>
        ${s.naslov ? `<div class="text-sm text-stone-600">${s.naslov}</div>` : ''}
        ${s.kontakt ? `<div class="text-sm text-stone-600 mt-1">${s.kontakt}</div>` : ''}
      </div>

      <div class="whitespace-pre-line text-sm">${TPL.uvodno_pismo}</div>

      ${bullets(s.bolecine).length ? `
        <h2>Razumevanje vaše situacije</h2>
        <p class="text-sm text-stone-600">Na podlagi pogovora razumemo, da so za vas trenutno ključne naslednje teme:</p>
        <ul>${bullets(s.bolecine).map(b => `<li>${b}</li>`).join('')}</ul>
      ` : ''}

      ${s.povzetek ? `
        <h2>Predlagana rešitev</h2>
        <p>${s.povzetek}</p>
      ` : ''}

      ${bullets(s.obseg).length ? `
        <h3>Obseg storitev</h3>
        <ul>${bullets(s.obseg).map(b => `<li>${b}</li>`).join('')}</ul>
      ` : ''}

      ${bullets(s.vhodi).length ? `
        <h3>Kaj potrebujemo od vas</h3>
        <ul>${bullets(s.vhodi).map(b => `<li>${b}</li>`).join('')}</ul>
      ` : ''}

      ${postavke.length ? `
        <h2>Cena</h2>
        <table>
          <thead><tr><th>Postavka</th><th style="text-align:right">Cena (EUR)</th><th>Enota</th></tr></thead>
          <tbody>
            ${postavke.map(p => `<tr><td>${p.opis}</td><td style="text-align:right">${fmtNum(p.cena, 2)}</td><td>${p.enota}</td></tr>`).join('')}
          </tbody>
        </table>
        <p class="text-xs text-stone-500 mt-2">Cene so v EUR brez DDV. Davek se obračuna skladno z veljavno zakonodajo.</p>
      ` : ''}

      ${(s.zacetek || s.trajanje) ? `
        <h2>Roki</h2>
        <table>
          ${s.zacetek ? `<tr><td><strong>Predviden začetek</strong></td><td>${s.zacetek}</td></tr>` : ''}
          ${s.trajanje ? `<tr><td><strong>Trajanje pogodbe</strong></td><td>${s.trajanje}</td></tr>` : ''}
          <tr><td><strong>Veljavnost ponudbe</strong></td><td>do ${veljavnostDo(s.datum, s.veljavnost)}</td></tr>
        </table>
      ` : `
        <h3>Veljavnost ponudbe</h3>
        <p>Ponudba velja do ${veljavnostDo(s.datum, s.veljavnost)}.</p>
      `}

      <h2>Zakaj Interzero</h2>
      <ul>${TPL.tipicna_resitev_blocks.zakaj_interzero.map(b => `<li>${b}</li>`).join('')}</ul>

      <h2>Kaj dobite</h2>
      <ul>${TPL.tipicna_resitev_blocks.kaj_dobite.map(b => `<li>${b}</li>`).join('')}</ul>

      ${s['naslednji-korak'] ? `
        <h2>Naslednji korak</h2>
        <p>${s['naslednji-korak']}</p>
      ` : ''}

      <h3 class="mt-8">Splošni pogoji</h3>
      <p class="text-xs text-stone-600">${TPL.splosni_pogoji}</p>

      <div class="mt-10 pt-6 border-t border-stone-200 text-sm text-stone-600">
        <div>${TPL.ponudnik.naziv}</div>
        <div>${TPL.ponudnik.web}</div>
      </div>
    </div>
  `;

  document.getElementById('preview').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', init);
