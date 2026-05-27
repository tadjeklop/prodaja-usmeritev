// Stranke — mini-CRM s pipelinom.

let FAZE = [];
let PANOGE = [];
let SEGMENTI = [];

async function init() {
  const [proces, panoge, segmentacija] = await Promise.all([
    loadData('proces'),
    loadData('panoge'),
    loadData('segmentacija')
  ]);
  if (!proces || !panoge) {
    document.getElementById('seznam-body').innerHTML =
      `<tr><td colspan="7" class="p-4 text-red-700">${tr('common.nalaganje_error', 'Ne morem naložiti podatkov. Poženi prek lokalnega strežnika.')}</td></tr>`;
    return;
  }
  FAZE = proces.faze;
  PANOGE = panoge.panoge;
  SEGMENTI = segmentacija ? segmentacija.segmenti : [];

  fillFazeSelect('s-faza');
  fillFazeSelect('filter-faza', true);
  fillPanogaSelect();
  fillSegmentSelect('s-segment', true);
  fillSegmentSelect('filter-segment', true);

  document.getElementById('btn-dodaj').addEventListener('click', () => odpriModal());
  document.getElementById('btn-zapri').addEventListener('click', zapriModal);
  document.getElementById('btn-prekini').addEventListener('click', zapriModal);
  document.getElementById('forma-stranka').addEventListener('submit', shrani);
  document.getElementById('btn-izbrisi').addEventListener('click', izbrisi);
  document.getElementById('s-status').addEventListener('change', toggleRazlog);
  document.getElementById('iskanje').addEventListener('input', render);
  document.getElementById('filter-faza').addEventListener('change', render);
  document.getElementById('filter-segment').addEventListener('change', render);
  document.getElementById('filter-status').addEventListener('change', render);
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', importJSON);
  document.getElementById('btn-audit').addEventListener('click', odpriAuditLog);
  document.getElementById('btn-ics').addEventListener('click', exportICS);

  render();
}

function exportJSON() {
  const stranke = Storage.get('stranke', []);
  const audit = Storage.get('audit-log', []);
  const dump = {
    _format: 'interzero-epr-stranke-v1',
    _exported: new Date().toISOString(),
    stranke,
    audit
  };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stranke-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Storage.audit('stranke', 'export', null, `Izvoz ${stranke.length} strank`);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data._format !== 'interzero-epr-stranke-v1' || !Array.isArray(data.stranke)) {
        alert('Datoteka ni veljaven izvoz Interzero EPR aplikacije.');
        return;
      }
      const obstojece = Storage.get('stranke', []);
      const obstojeceIds = new Set(obstojece.map(s => s._id));
      const nove = data.stranke.filter(s => !obstojeceIds.has(s._id));
      const choice = confirm(
        `Datoteka vsebuje ${data.stranke.length} strank.\n` +
        `${nove.length} jih je novih, ${data.stranke.length - nove.length} jih že imaš.\n\n` +
        'OK = dodaj samo nove. Cancel = prepiši VSE (tudi obstoječe).'
      );
      if (choice) {
        Storage.set('stranke', [...obstojece, ...nove]);
        Storage.audit('stranke', 'import', null, `Uvoz ${nove.length} novih strank`);
      } else {
        Storage.set('stranke', data.stranke);
        Storage.audit('stranke', 'import-replace', null, `Prepis z ${data.stranke.length} strank`);
      }
      render();
      alert('Uvoz končan.');
    } catch (err) {
      alert('Napaka pri branju datoteke: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // reset input
}

function exportICS() {
  const stranke = Storage.get('stranke', []).filter(s => s.status === 'aktivno' && s.datum && s.korak);
  if (!stranke.length) {
    alert('Ni aktivnih strank z naslednjim korakom in datumom.');
    return;
  }
  const pad = n => String(n).padStart(2, '0');
  const isoToICS = (d) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const now = isoToICS(new Date());

  const events = stranke.map(s => {
    const d = new Date(s.datum + 'T09:00:00');
    const end = new Date(d.getTime() + 60 * 60 * 1000);
    const uid = `${s._id}@interzero-epr`;
    const summary = `Interzero EPR: ${s.podjetje} — ${s.korak.slice(0, 60)}`;
    const desc = [
      `Stranka: ${s.podjetje}`,
      s.kontakt ? `Kontakt: ${s.kontakt}${s.funkcija ? ' (' + s.funkcija + ')' : ''}` : '',
      s.email ? `Email: ${s.email}` : '',
      s.tel ? `Tel: ${s.tel}` : '',
      '',
      `Naslednji korak: ${s.korak}`,
      s.bolecine ? `\\nBolečine:\\n${s.bolecine}` : '',
      s.opombe ? `\\nOpombe:\\n${s.opombe}` : ''
    ].filter(Boolean).join('\\n');
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${isoToICS(d)}`,
      `DTEND:${isoToICS(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      `DESCRIPTION:Opomnik: ${s.podjetje}`,
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Interzero//EPR Sales Tool//SL',
    'CALSCALE:GREGORIAN',
    events,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interzero-koraki-${new Date().toISOString().slice(0,10)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  alert(`✓ Izvoženih ${stranke.length} dogodkov v koledar.\nDvojni klik na .ics datoteko jih uvozi v Google Calendar / Outlook / Apple Calendar.`);
}

function odpriAuditLog() {
  const log = Storage.get('audit-log', []);
  if (!log.length) {
    alert('Audit log je prazen.');
    return;
  }
  // Modal z log zapisi
  const modal = document.createElement('div');
  modal.className = 'modal-back';
  modal.innerHTML = `
    <div class="modal" style="max-width: 800px">
      <div class="flex justify-between items-start mb-4">
        <h2 class="text-xl font-bold">Audit log — zadnjih ${Math.min(log.length, 100)} sprememb</h2>
        <button class="btn btn-ghost" onclick="this.closest('.modal-back').remove()">✕</button>
      </div>
      <div class="space-y-2 text-sm">
        ${log.slice(0, 100).map(e => `
          <div class="p-2 border border-stone-200 rounded">
            <div class="flex items-baseline justify-between gap-3">
              <span class="badge badge-${e.action === 'create' ? 'green' : e.action === 'delete' ? 'amber' : 'blue'}">${e.entity}.${e.action}</span>
              <span class="text-xs text-stone-500">${Storage.formatDate(e.ts)}</span>
            </div>
            <div class="mt-1">${e.opis || ''}</div>
          </div>
        `).join('')}
      </div>
      <div class="mt-4 pt-3 border-t flex justify-between">
        <button class="btn btn-ghost text-red-700" onclick="if(confirm('Pobriši cel audit log?')){Storage.set('audit-log',[]); this.closest('.modal-back').remove();}">Pobriši log</button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-back').remove()">Zapri</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.remove(); });
}

function fillSegmentSelect(id, withEmpty = false) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = (withEmpty ? `<option value="">${tr('nav.segmenti', 'Vsi segmenti')}</option>` : '<option value="">—</option>') +
    SEGMENTI.map(s => `<option value="${s.id}">${s.kratko}</option>`).join('');
}

function segmentLabel(id) {
  const s = SEGMENTI.find(x => x.id === id);
  return s ? s.kratko : null;
}

function segmentBarva(id) {
  const s = SEGMENTI.find(x => x.id === id);
  return s ? s.barva : 'stone';
}

function fillFazeSelect(id, withAll = false) {
  const sel = document.getElementById(id);
  sel.innerHTML = (withAll ? `<option value="">${tr('common.vse', 'Vse')} ${tr('stranke.faza', 'faze').toLowerCase()}</option>` : '') +
    FAZE.map(f => `<option value="${f.stevilka}">${f.stevilka}. ${f.naziv}</option>`).join('');
}

function fillPanogaSelect() {
  const sel = document.getElementById('s-panoga');
  sel.innerHTML = '<option value="">—</option>' +
    PANOGE.map(p => `<option value="${p.id}">${p.naziv}</option>`).join('');
}

function toggleRazlog() {
  const status = document.getElementById('s-status').value;
  document.getElementById('div-razlog').classList.toggle('hidden', status !== 'izguba');
}

function odpriModal(stranka = null) {
  const form = document.getElementById('forma-stranka');
  form.reset();
  document.getElementById('btn-izbrisi').classList.toggle('hidden', !stranka);
  document.getElementById('modal-naslov').textContent = stranka ? tr('common.uredi', 'Uredi') : tr('stranke.nova_modal', 'Nova stranka');

  if (stranka) {
    document.getElementById('s-id').value = stranka._id;
    document.getElementById('s-podjetje').value = stranka.podjetje || '';
    document.getElementById('s-panoga').value = stranka.panoga || '';
    document.getElementById('s-kontakt').value = stranka.kontakt || '';
    document.getElementById('s-funkcija').value = stranka.funkcija || '';
    document.getElementById('s-email').value = stranka.email || '';
    document.getElementById('s-tel').value = stranka.tel || '';
    document.getElementById('s-faza').value = stranka.faza || 1;
    document.getElementById('s-segment').value = stranka.segment || '';
    document.getElementById('s-status').value = stranka.status || 'aktivno';
    document.getElementById('s-vrednost').value = stranka.vrednost || '';
    document.getElementById('s-verjetnost').value = stranka.verjetnost || '';
    document.getElementById('s-korak').value = stranka.korak || '';
    document.getElementById('s-datum').value = stranka.datum || '';
    document.getElementById('s-bolecine').value = stranka.bolecine || '';
    document.getElementById('s-opombe').value = stranka.opombe || '';
    document.getElementById('s-razlog').value = stranka.razlog || '';
  } else {
    document.getElementById('s-id').value = '';
    document.getElementById('s-faza').value = 1;
    document.getElementById('s-segment').value = '';
    document.getElementById('s-status').value = 'aktivno';
  }
  toggleRazlog();
  document.getElementById('modal').classList.remove('hidden');
}

function zapriModal() {
  document.getElementById('modal').classList.add('hidden');
}

function shrani(e) {
  e.preventDefault();
  const id = document.getElementById('s-id').value;
  const data = {
    podjetje: document.getElementById('s-podjetje').value.trim(),
    panoga: document.getElementById('s-panoga').value,
    kontakt: document.getElementById('s-kontakt').value.trim(),
    funkcija: document.getElementById('s-funkcija').value.trim(),
    email: document.getElementById('s-email').value.trim(),
    tel: document.getElementById('s-tel').value.trim(),
    faza: parseInt(document.getElementById('s-faza').value),
    segment: document.getElementById('s-segment').value,
    status: document.getElementById('s-status').value,
    vrednost: parseFloat(document.getElementById('s-vrednost').value) || 0,
    verjetnost: parseFloat(document.getElementById('s-verjetnost').value) || 0,
    korak: document.getElementById('s-korak').value.trim(),
    datum: document.getElementById('s-datum').value,
    bolecine: document.getElementById('s-bolecine').value.trim(),
    opombe: document.getElementById('s-opombe').value.trim(),
    razlog: document.getElementById('s-razlog').value
  };

  if (id) {
    // Update obstoječe — primerjaj in zabeleži spremembe
    const list = Storage.get('stranke', []);
    const idx = list.findIndex(x => x._id === id);
    if (idx >= 0) {
      const stari = list[idx];
      const spremembe = [];
      ['faza', 'segment', 'status', 'korak', 'datum', 'vrednost', 'verjetnost'].forEach(k => {
        if (String(stari[k] || '') !== String(data[k] || '')) {
          spremembe.push(`${k}: ${stari[k] || '—'} → ${data[k] || '—'}`);
        }
      });
      list[idx] = { ...stari, ...data, _updated: new Date().toISOString() };
      Storage.set('stranke', list);
      if (spremembe.length) {
        Storage.audit('stranka', 'update', id, `${data.podjetje}: ${spremembe.join('; ')}`);
      }
    }
  } else {
    const newId = Storage.push('stranke', data);
    Storage.audit('stranka', 'create', newId, `Nova stranka: ${data.podjetje}`);
  }
  zapriModal();
  render();
}

function izbrisi() {
  const id = document.getElementById('s-id').value;
  if (!id) return;
  if (!confirm('Izbrišem to stranko? (Zapis v audit logu ostane.)')) return;
  const s = Storage.findInList('stranke', id);
  Storage.removeFromList('stranke', id);
  Storage.audit('stranka', 'delete', id, `Izbrisana: ${s?.podjetje || id}`);
  zapriModal();
  render();
}

function isAlarm(s) {
  if (s.status !== 'aktivno') return false;
  if (!s.datum) return true; // manjka datum
  return new Date(s.datum) < new Date(new Date().toDateString()); // zapadel
}

function render() {
  const all = Storage.get('stranke', []);
  const q = document.getElementById('iskanje').value.toLowerCase().trim();
  const fFaza = document.getElementById('filter-faza').value;
  const fSegment = document.getElementById('filter-segment').value;
  const fStatus = document.getElementById('filter-status').value;

  let filtered = all;
  if (q) filtered = filtered.filter(s =>
    (s.podjetje + ' ' + (s.kontakt||'') + ' ' + (s.opombe||'')).toLowerCase().includes(q)
  );
  if (fFaza) filtered = filtered.filter(s => s.faza == fFaza);
  if (fSegment) filtered = filtered.filter(s => s.segment === fSegment);
  if (fStatus) filtered = filtered.filter(s => s.status === fStatus);

  // STATS — iz vseh aktivnih (ne filtriranih)
  renderStats(all);

  if (!filtered.length) {
    document.getElementById('seznam-body').innerHTML = '';
    document.getElementById('prazno').classList.remove('hidden');
    return;
  }
  document.getElementById('prazno').classList.add('hidden');

  document.getElementById('seznam-body').innerHTML = filtered.map(s => {
    const faza = FAZE.find(f => f.stevilka == s.faza);
    const alarm = isAlarm(s);
    const segLbl = segmentLabel(s.segment);
    return `
      <tr class="stranka-row border-t border-stone-200" data-id="${s._id}">
        <td class="p-3">
          <div class="font-semibold">${s.podjetje}</div>
          ${s.kontakt ? `<div class="text-xs text-stone-500">${s.kontakt}${s.funkcija ? ' · ' + s.funkcija : ''}</div>` : ''}
        </td>
        <td class="p-3">${segLbl ? `<span class="badge badge-${segmentBarva(s.segment)==='blue'?'blue':segmentBarva(s.segment)==='green'?'green':segmentBarva(s.segment)==='amber'?'amber':'stone'}">${segLbl}</span>` : '<span class="text-stone-400">—</span>'}</td>
        <td class="p-3"><span class="faza-pill faza-${s.faza}">${faza ? faza.naziv : '—'}</span></td>
        <td class="p-3 text-right">${s.vrednost ? fmtEUR(s.vrednost) : '—'}${s.verjetnost ? `<div class="text-xs text-stone-500">${s.verjetnost}%</div>` : ''}</td>
        <td class="p-3">${s.korak || '<span class="text-stone-400">—</span>'}</td>
        <td class="p-3 ${alarm ? 'alarm' : ''}">${s.datum ? Storage.formatDate(s.datum + 'T00:00:00').split(' ')[0] : '<span class="text-stone-400">manjka</span>'}</td>
        <td class="p-3">${renderStatus(s)}</td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.stranka-row').forEach(r => {
    r.addEventListener('click', () => {
      const s = Storage.findInList('stranke', r.dataset.id);
      if (s) odpriModal(s);
    });
  });
}

function renderStatus(s) {
  if (s.status === 'zmaga') return `<span class="status-zmaga">✓ ${tr('stranke.zmaga', 'Zmaga')}</span>`;
  if (s.status === 'izguba') return `<span class="status-izguba">✗ ${tr('stranke.izguba', 'Izguba')}</span>${s.razlog ? `<div class="text-xs text-stone-500">${s.razlog}</div>` : ''}`;
  return `<span class="text-stone-600">${tr('stranke.aktivno', 'Aktivno')}</span>`;
}

function renderStats(all) {
  const aktivne = all.filter(s => s.status === 'aktivno');
  const zmage = all.filter(s => s.status === 'zmaga');
  const izgube = all.filter(s => s.status === 'izguba');
  const pipelineValue = aktivne.reduce((sum, s) => sum + (s.vrednost || 0), 0);
  const weightedValue = aktivne.reduce((sum, s) => sum + (s.vrednost || 0) * (s.verjetnost || 0) / 100, 0);
  const alarm = aktivne.filter(isAlarm).length;

  document.getElementById('stats').innerHTML = `
    <div class="panel text-center"><div class="text-xs uppercase text-stone-500">${tr('stranke.aktivne', 'Aktivne')}</div><div class="text-2xl font-bold mt-1">${aktivne.length}</div></div>
    <div class="panel text-center"><div class="text-xs uppercase text-stone-500">Pipeline (EUR)</div><div class="text-xl font-bold mt-1">${fmtEUR(pipelineValue)}</div></div>
    <div class="panel text-center"><div class="text-xs uppercase text-stone-500">${tr('stranke.tehtano', 'Tehtano')} (po %)</div><div class="text-xl font-bold mt-1 text-green-800">${fmtEUR(weightedValue)}</div></div>
    <div class="panel text-center"><div class="text-xs uppercase text-stone-500">${tr('stranke.zmage', 'Zmage')} / ${tr('stranke.izgube', 'izgube').toLowerCase()}</div><div class="text-xl font-bold mt-1">${zmage.length} / ${izgube.length}</div></div>
    <div class="panel text-center ${alarm > 0 ? 'bg-red-50 border-red-200' : ''}"><div class="text-xs uppercase ${alarm > 0 ? 'text-red-800' : 'text-stone-500'}">${tr('stranke.alarm', 'Alarm')}</div><div class="text-2xl font-bold mt-1 ${alarm > 0 ? 'text-red-700' : ''}">${alarm}</div></div>
  `;
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('i18n:changed', () => {
  fillFazeSelect('filter-faza', true);
  fillSegmentSelect('filter-segment', true);
  render();
});
