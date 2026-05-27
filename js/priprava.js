// Wizard za pripravo na sestanek.

let DATA = {};

async function init() {
  // Paralelno naloži vse potrebne podatke
  const [panoge, odlocevalci, discovery, govori, ugovori] = await Promise.all([
    loadData('panoge'),
    loadData('odlocevalci'),
    loadData('discovery'),
    loadData('govori'),
    loadData('ugovori')
  ]);
  DATA = { panoge, odlocevalci, discovery, govori, ugovori };

  if (!panoge || !odlocevalci) {
    document.getElementById('step-input').innerHTML =
      '<p class="text-red-700">Napaka: ne morem naložiti podatkov. Aplikacijo poženi prek lokalnega strežnika (npr. VS Code Live Server), ne z dvojnim klikom na index.html — brskalniki blokirajo lokalni fetch.</p>';
    return;
  }

  fillSelects();
  bindEvents();

  // Auto-load if returning to edit a saved brief
  const editId = qs('id');
  if (editId) {
    const saved = Storage.findInList('sestanki', editId);
    if (saved) loadSavedIntoForm(saved);
  }
}

function fillSelects() {
  const panogaSel = document.getElementById('panoga');
  panogaSel.innerHTML = '<option value="">— izberi panogo —</option>' +
    DATA.panoge.panoge.map(p => `<option value="${p.id}">${p.naziv}</option>`).join('');

  const odlSel = document.getElementById('odlocevalec');
  odlSel.innerHTML = '<option value="">— izberi tip sogovornika —</option>' +
    DATA.odlocevalci.odlocevalci.map(o => `<option value="${o.id}">${o.naziv}</option>`).join('');
}

function bindEvents() {
  document.getElementById('btn-pripravi').addEventListener('click', generateBrief);
  document.getElementById('btn-pocisti').addEventListener('click', clearForm);
  document.getElementById('btn-nazaj').addEventListener('click', () => {
    document.getElementById('step-brief').classList.add('hidden');
    document.getElementById('step-input').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('btn-shrani').addEventListener('click', saveBriefToHistory);
  document.getElementById('btn-ponudba').addEventListener('click', skociVPonudbo);
}

function skociVPonudbo() {
  const s = getFormState();
  if (!s.podjetje) {
    alert('Najprej vnesi ime podjetja.');
    return;
  }
  // Shranimo trenutno stanje kot ponudba-osnutek z minimalnimi podatki, da ga ponudba.html lahko prebere
  const seed = {
    naziv: s.podjetje,
    kontakt: s.kontakt,
    datum: new Date().toISOString().slice(0, 10),
    bolecine: (DATA.panoge.panoge.find(p => p.id === s.panoga)?.bolecine || []).join('\n')
  };
  const id = Storage.push('ponudbe', seed);
  window.location.href = `ponudba.html?id=${id}`;
}

function getFormState() {
  return {
    podjetje: document.getElementById('ime-podjetja').value.trim(),
    kontakt: document.getElementById('kontakt').value.trim(),
    panoga: document.getElementById('panoga').value,
    odlocevalec: document.getElementById('odlocevalec').value,
    velikost: document.getElementById('velikost').value,
    trenutni_status: document.getElementById('trenutni-status').value,
    opombe: document.getElementById('opombe').value.trim()
  };
}

function loadSavedIntoForm(saved) {
  document.getElementById('ime-podjetja').value = saved.podjetje || '';
  document.getElementById('kontakt').value = saved.kontakt || '';
  document.getElementById('panoga').value = saved.panoga || '';
  document.getElementById('odlocevalec').value = saved.odlocevalec || '';
  document.getElementById('velikost').value = saved.velikost || 'srednje';
  document.getElementById('trenutni-status').value = saved.trenutni_status || 'drugi';
  document.getElementById('opombe').value = saved.opombe || '';
  generateBrief();
}

function clearForm() {
  ['ime-podjetja', 'kontakt', 'opombe'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('panoga').value = '';
  document.getElementById('odlocevalec').value = '';
  document.getElementById('velikost').value = 'srednje';
  document.getElementById('trenutni-status').value = 'drugi';
}

function generateBrief() {
  const state = getFormState();
  if (!state.panoga || !state.odlocevalec) {
    alert('Izberi panogo in tip odločevalca.');
    return;
  }

  const panoga = DATA.panoge.panoge.find(p => p.id === state.panoga);
  const odl = DATA.odlocevalci.odlocevalci.find(o => o.id === state.odlocevalec);

  // Naslov
  document.getElementById('brief-naslov').textContent =
    `Brief: ${state.podjetje || '(podjetje neimenovano)'}`;
  document.getElementById('brief-podnaslov').textContent =
    `${panoga.naziv} · ${odl.naziv}` + (state.kontakt ? ` · ${state.kontakt}` : '');

  // Bolečine panoge
  document.getElementById('brief-bolecine').innerHTML =
    panoga.bolecine.map(b => `<li>${b}</li>`).join('');

  // Govori odločevalca
  document.getElementById('brief-odlocevalec-opis').textContent = odl.kaj_jih_skrbi;
  document.getElementById('brief-argumenti').innerHTML =
    odl.pravi_argumenti.map(a => `<li>${a}</li>`).join('');
  document.getElementById('brief-izogni').innerHTML =
    odl.ne_govori_jim_o.map(x => `<li>${x}</li>`).join('');

  // Discovery vprašanja — izberi 10 najprimernejših
  const allQuestions = DATA.discovery.sklopi.flatMap(s =>
    s.vprasanja.map(v => ({ sklop: s.naslov, vprasanje: v }))
  );
  const odlocevalecQuestions = odl.kljucna_vprasanja.map(v => ({ sklop: 'Za tega sogovornika', vprasanje: v }));
  const pick = [...odlocevalecQuestions, ...pickRelevantQuestions(allQuestions, state)];
  document.getElementById('brief-vprasanja').innerHTML = pick.slice(0, 12)
    .map(q => `<li><span class="badge badge-stone mr-2">${q.sklop}</span>${q.vprasanje}</li>`).join('');

  // Govori — uvod hladnega klica + uvod prvega sestanka + zaključek
  const hladni = DATA.govori.scenariji.find(s => s.id === 'hladen-klic');
  const prviSestanek = DATA.govori.scenariji.find(s => s.id === 'prvi-sestanek');
  const picksGovori = [
    prviSestanek.govori.find(g => g.naslov.startsWith('Uvod')),
    prviSestanek.govori.find(g => g.naslov.startsWith('Prehod v discovery')),
    prviSestanek.govori.find(g => g.naslov.startsWith('Zaključek'))
  ].filter(Boolean);
  document.getElementById('brief-govori').innerHTML = picksGovori.map(g => `
    <div>
      <div class="font-semibold text-sm">${g.naslov}</div>
      <div class="script-block">${g.tekst.replace(/\n/g, '<br>')}<button class="copy-btn" data-copy="">Kopiraj</button></div>
    </div>
  `).join('');

  // Ugovori — izberi 3 najverjetnejše glede na trenutni status
  const verjetniUgovori = pickProbableObjections(state);
  document.getElementById('brief-ugovori').innerHTML = verjetniUgovori.map(u => `
    <div class="border-l-4 border-amber-400 pl-3">
      <div class="font-semibold text-sm">„${u.ugovor}"</div>
      <div class="text-sm text-stone-700 mt-1">${u.kratek_odgovor}</div>
    </div>
  `).join('');

  // Pokaži brief, skrij input
  document.getElementById('step-input').classList.add('hidden');
  document.getElementById('step-brief').classList.remove('hidden');
  wireCopyButtons(document.getElementById('step-brief'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function pickRelevantQuestions(all, state) {
  // Naivno: vzemi po 2 iz vsakega sklopa do skupno 10. Lahko se kasneje izpopolni.
  const bySklop = {};
  all.forEach(q => {
    if (!bySklop[q.sklop]) bySklop[q.sklop] = [];
    bySklop[q.sklop].push(q);
  });
  const out = [];
  Object.values(bySklop).forEach(arr => out.push(...arr.slice(0, 2)));
  return out;
}

function pickProbableObjections(state) {
  const all = DATA.ugovori.ugovori;
  // Najverjetnejši ugovori glede na trenutni_status
  const priority = {
    'drugi':    ['obstojeci-dobavitelj', 'cena', 'nejasna-vrednost'],
    'interno':  ['interna-ekipa', 'cena', 'nejasna-vrednost'],
    'brez':     ['ni-cas', 'casovni', 'podatki'],
    'neznano':  ['nejasna-vrednost', 'cena', 'obstojeci-dobavitelj']
  };
  const cats = priority[state.trenutni_status] || ['cena', 'obstojeci-dobavitelj', 'nejasna-vrednost'];
  return cats.map(c => all.find(u => u.kategorija === c)).filter(Boolean);
}

function saveBriefToHistory() {
  const state = getFormState();
  if (!state.podjetje) {
    alert('Vnesi ime podjetja, da lahko shranim.');
    return;
  }
  const id = Storage.push('sestanki', state);
  const btn = document.getElementById('btn-shrani');
  const orig = btn.textContent;
  btn.textContent = '✓ Shranjeno';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
}

document.addEventListener('DOMContentLoaded', init);
