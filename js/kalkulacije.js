// Logika za vse štiri kalkulatorje.

let CENE = null;

async function init() {
  CENE = await loadData('epr-cene-si');
  if (!CENE) {
    document.querySelectorAll('[data-panel]').forEach(p => {
      p.innerHTML = '<p class="text-red-700">Ne morem naložiti cenikov. Aplikacijo poženi prek lokalnega strežnika.</p>';
    });
    return;
  }
  setupTabs();
  setupEPR();
  setupPredPo();
  setupRoi();
  setupPaketi();
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const id = tab.dataset.tab;
      document.querySelectorAll('[data-panel]').forEach(p => {
        p.classList.toggle('hidden', p.dataset.panel !== id);
      });
    });
  });
}

// === EPR taksa ===
function setupEPR() {
  const wrap = document.getElementById('epr-materiali');
  wrap.innerHTML = CENE.materiali.map(m => `
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <div class="text-sm font-medium">${m.naziv}</div>
        <div class="text-xs text-stone-500">${fmtEUR(m.cena_eur_kg)}/kg ${m.opomba ? '· ' + m.opomba : ''}</div>
      </div>
      <div class="w-32">
        <input type="number" min="0" step="100" placeholder="0" class="input epr-kol" data-id="${m.id}" data-cena="${m.cena_eur_kg}" />
      </div>
      <div class="text-xs text-stone-500">kg/leto</div>
      <div class="w-28 text-right font-semibold" data-out="${m.id}">—</div>
    </div>
  `).join('');

  document.querySelectorAll('.epr-kol').forEach(inp => {
    inp.addEventListener('input', preracunajEPR);
  });
}

function preracunajEPR() {
  let skupaj = 0;
  let detali = [];
  document.querySelectorAll('.epr-kol').forEach(inp => {
    const kg = parseFloat(inp.value) || 0;
    const cena = parseFloat(inp.dataset.cena);
    const subtotal = kg * cena;
    skupaj += subtotal;
    document.querySelector(`[data-out="${inp.dataset.id}"]`).textContent = subtotal ? fmtEUR(subtotal) : '—';
    if (kg) detali.push(`${fmtNum(kg)} kg`);
  });
  document.getElementById('epr-skupaj').textContent = skupaj ? fmtEUR(skupaj) : '—';
  document.getElementById('epr-skupaj-detail').textContent = detali.length ?
    `Skupaj ${detali.length} materialov vneseno.` : '';
}

// === Pred / po ===
function setupPredPo() {
  ['pred-odpadki','pred-epr','pred-delo','pred-drugo','po-paket','po-zunanji','po-delo']
    .forEach(id => document.getElementById(id).addEventListener('input', preracunajPredPo));
}

function preracunajPredPo() {
  const pred = ['pred-odpadki','pred-epr','pred-delo','pred-drugo']
    .reduce((s, id) => s + (parseFloat(document.getElementById(id).value) || 0), 0);
  const po = ['po-paket','po-zunanji','po-delo']
    .reduce((s, id) => s + (parseFloat(document.getElementById(id).value) || 0), 0);
  const razlika = pred - po;
  document.getElementById('pred-skupaj').textContent = fmtEUR(pred);
  document.getElementById('po-skupaj').textContent = fmtEUR(po);

  const razlikaEl = document.getElementById('razlika');
  razlikaEl.textContent = fmtEUR(razlika);
  razlikaEl.className = 'text-2xl font-bold ' + (razlika > 0 ? 'text-green-800' : razlika < 0 ? 'text-red-700' : '');

  const pct = pred > 0 ? (razlika / pred) * 100 : 0;
  document.getElementById('razlika-pct').textContent = pred > 0 ?
    `${pct >= 0 ? '−' : '+'}${fmtNum(Math.abs(pct), 1)} % glede na trenutno stanje` : '';
}

// === ROI ===
function setupRoi() {
  ['roi-cena','roi-prihranek','roi-cas','roi-tveganje']
    .forEach(id => document.getElementById(id).addEventListener('input', preracunajRoi));
}

function preracunajRoi() {
  const cena = parseFloat(document.getElementById('roi-cena').value) || 0;
  const prihranek = parseFloat(document.getElementById('roi-prihranek').value) || 0;
  const cas = parseFloat(document.getElementById('roi-cas').value) || 0;
  const tveganje = parseFloat(document.getElementById('roi-tveganje').value) || 0;
  const bruto = prihranek + cas + tveganje;
  const neto = bruto - cena;

  document.getElementById('roi-neto').textContent = fmtEUR(neto);
  document.getElementById('roi-pct').textContent = cena > 0 ? `${fmtNum((neto / cena) * 100, 0)} %` : '—';
  document.getElementById('roi-povracilo').textContent =
    (bruto > 0 && cena > 0) ? `${fmtNum(cena / bruto * 12, 1)} mes.` : '—';
}

// === Paketi ===
function setupPaketi() {
  const wrap = document.getElementById('paketi-seznam');
  wrap.innerHTML = CENE.paketi_storitev.map(p => `
    <label class="flex gap-3 items-start p-3 border border-stone-200 rounded cursor-pointer hover:bg-stone-50">
      <input type="checkbox" class="mt-1 paket-cb" data-id="${p.id}" data-cena="${parseFloat(p.okvirna_cena_letno.replace(/[^0-9]/g, '')) || 0}" />
      <div class="flex-1">
        <div class="flex items-baseline justify-between gap-3">
          <div class="font-semibold">${p.naziv}</div>
          <div class="text-sm text-green-800 font-semibold">${p.okvirna_cena_letno}</div>
        </div>
        <div class="text-sm text-stone-600 mt-1"><strong>Primeren za:</strong> ${p.primeren_za}</div>
        <ul class="text-sm text-stone-700 mt-2 list-disc pl-5">
          ${p.vsebina.map(v => `<li>${v}</li>`).join('')}
        </ul>
      </div>
    </label>
  `).join('');

  document.querySelectorAll('.paket-cb').forEach(cb => cb.addEventListener('change', preracunajPakete));
}

function preracunajPakete() {
  let skupaj = 0;
  document.querySelectorAll('.paket-cb:checked').forEach(cb => {
    skupaj += parseFloat(cb.dataset.cena) || 0;
  });
  document.getElementById('paketi-skupaj').textContent = skupaj ? `od ${fmtEUR(skupaj)}` : '—';
}

// === Shranjevanje izračunov ===
function shraniIzracun(tip) {
  const naslovi = { epr: 'EPR taksa', predpo: 'Primerjava pred/po', roi: 'ROI', paketi: 'Paketi' };
  const data = { tip, naslov: naslovi[tip] };

  if (tip === 'epr') {
    data.materiali = {};
    document.querySelectorAll('.epr-kol').forEach(inp => {
      const v = parseFloat(inp.value);
      if (v) data.materiali[inp.dataset.id] = v;
    });
    data.skupaj = document.getElementById('epr-skupaj').textContent;
  } else if (tip === 'predpo') {
    data.pred = ['pred-odpadki','pred-epr','pred-delo','pred-drugo'].map(id => parseFloat(document.getElementById(id).value) || 0);
    data.po = ['po-paket','po-zunanji','po-delo'].map(id => parseFloat(document.getElementById(id).value) || 0);
    data.razlika = document.getElementById('razlika').textContent;
  } else if (tip === 'roi') {
    data.vhod = ['roi-cena','roi-prihranek','roi-cas','roi-tveganje'].map(id => parseFloat(document.getElementById(id).value) || 0);
    data.neto = document.getElementById('roi-neto').textContent;
  } else if (tip === 'paketi') {
    data.izbrani = Array.from(document.querySelectorAll('.paket-cb:checked')).map(cb => cb.dataset.id);
    data.skupaj = document.getElementById('paketi-skupaj').textContent;
  }

  const opomba = prompt('Opomba (npr. ime stranke), pusti prazno če ni potrebno:');
  if (opomba !== null) data.opomba = opomba.trim();

  Storage.push('izracuni', data);
  alert('✓ Shranjeno v zgodovino.');
}

document.addEventListener('DOMContentLoaded', init);
