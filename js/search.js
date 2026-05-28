// Globalno iskanje (Cmd+K / Ctrl+K) čez vse module.
// Naloži JSON-e v ozadju, indeksira po teksto in odpre modal s sezadetki.

const Search = {
  index: [],
  loaded: false,
  loading: null,

  async build() {
    if (this.loaded) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const sources = [
        { name: 'govori.json', module: 'Govori', url: 'govori.html', extractor: (d) => d.scenariji.flatMap(s => s.govori.map(g => ({ title: `${s.naziv}: ${g.naslov}`, text: g.tekst, link: `govori.html?scenarij=${s.id}` }))) },
        { name: 'ugovori.json', module: 'Ugovori', url: 'ugovori.html', extractor: (d) => d.ugovori.map(u => ({ title: u.ugovor, text: u.kratek_odgovor + ' ' + (u.dolgi_odgovor || ''), link: 'ugovori.html', kategorija: u.kategorija })) },
        { name: 'glosar.json', module: 'Glosar', url: 'glosar.html', extractor: (d) => d.kategorije.flatMap(k => k.pojmi.map(p => ({ title: p.izraz, text: p.razlaga + ' ' + (p.v_praksi || ''), link: 'glosar.html' }))) },
        { name: 'reference.json', module: 'Reference', url: 'reference.html', extractor: (d) => d.primeri.map(p => ({ title: `${p.panoga}: ${p.velikost}`, text: p.izziv + ' ' + p.kaj_smo_naredili.join(' ') + ' ' + p.rezultat.join(' '), link: 'reference.html' })) },
        { name: 'panoge.json', module: 'Panoge', url: 'priprava.html', extractor: (d) => d.panoge.map(p => ({ title: p.naziv, text: p.bolecine.join(' ') + ' ' + (p.kljucne_storitve || []).join(' '), link: 'priprava.html' })) },
        { name: 'odlocevalci.json', module: 'Odločevalci', url: 'priprava.html', extractor: (d) => d.odlocevalci.map(o => ({ title: o.naziv, text: o.kaj_jih_skrbi + ' ' + o.pravi_argumenti.join(' '), link: 'priprava.html' })) },
        { name: 'segmentacija.json', module: 'Segmenti', url: 'segmentacija.html', extractor: (d) => d.segmenti.map(s => ({ title: s.kratko, text: s.opis + ' ' + s.indikatorji.join(' ') + ' ' + s.ce_je_to_segment, link: 'segmentacija.html' })) },
        { name: 'vodic.json', module: 'Vodič', url: 'vodic.html', extractor: (d) => d.faze.flatMap(f => [
          { title: f.naziv, text: f.cilj + ' ' + (f.kljucne_tocke || []).join(' '), link: `vodic.html#${f.id}` },
          ...(f.govori || []).map(g => ({ title: `${f.naziv}: ${g.kdaj}`, text: g.tekst, link: `vodic.html#${f.id}` }))
        ]) },
        { name: 'proces.json', module: 'Proces', url: 'proces.html', extractor: (d) => d.faze.map(f => ({ title: `Faza ${f.stevilka}: ${f.naziv}`, text: f.cilj + ' ' + f.kljucna_vprasanja.join(' '), link: 'proces.html' })) },
        { name: 'konkurenca.json', module: 'Konkurenca', url: 'konkurenca.html', extractor: (d) => d.konkurenti.map(k => ({ title: k.naziv, text: k.tip + ' ' + k.nase_razlike.join(' ') + ' ' + (k.kako_odgovoriti || ''), link: 'konkurenca.html' })) },
        { name: 'zakonodaja-si.json', module: 'Zakonodaja SI', url: 'zakonodaja.html', extractor: (d) => d.sklopi.map(s => ({ title: s.naslov, text: s.vsebina + ' ' + (s.koga_zavezuje || ''), link: 'zakonodaja.html' })) },
        { name: 'zakonodaja-hr.json', module: 'Zakonodaja HR', url: 'zakonodaja.html', extractor: (d) => d.sklopi.map(s => ({ title: s.naslov, text: s.vsebina + ' ' + (s.koga_zavezuje || ''), link: 'zakonodaja.html' })) },
        { name: 'zakonodaja-rs.json', module: 'Zakonodaja RS', url: 'zakonodaja.html', extractor: (d) => d.sklopi.map(s => ({ title: s.naslov, text: s.vsebina + ' ' + (s.koga_zavezuje || ''), link: 'zakonodaja.html' })) },
        { name: 'koledar.json', module: 'Koledar EPR', url: 'koledar.html', extractor: (d) => d.letni_cikel.flatMap(m => m.dogodki.map(e => ({ title: `${m.naziv}: ${e.naslov}`, text: e.kaj + ' ' + (e.interzero_vloga || ''), link: 'koledar.html' }))) },
        { name: 'kpi.json', module: 'KPI', url: 'kpi.html', extractor: (d) => d.kpi.map(k => ({ title: k.naziv, text: k.meri + ' ' + k.coaching_vprasanja.join(' '), link: 'kpi.html' })) },
        { name: 'vsebine.json', module: 'Vsebine', url: 'vsebine.html', extractor: (d) => d.predlogi.map(p => ({ title: p.naslov, text: p.hook_si, link: 'vsebine.html' })) },
        { name: 'onboarding.json', module: 'Onboarding', url: 'onboarding.html', extractor: (d) => d.obdobja.flatMap(o => [
          { title: o.naziv, text: o.cilj + ' ' + (o.preverljiv_rezultat || ''), link: 'onboarding.html' },
          ...o.naloge.map(n => ({ title: `${o.naziv}: ${n.naziv}`, text: n.kategorija || '', link: 'onboarding.html' }))
        ]) }
      ];

      for (const src of sources) {
        try {
          const res = await fetch(`data/${src.name}`);
          if (!res.ok) continue;
          const d = await res.json();
          const items = src.extractor(d);
          items.forEach(it => this.index.push({ ...it, module: src.module }));
        } catch (e) {
          console.warn('Search index skip:', src.name, e);
        }
      }
      this.loaded = true;
    })();
    return this.loading;
  },

  query(q) {
    q = (q || '').toLowerCase().trim();
    if (!q) return [];
    const words = q.split(/\s+/);
    const scored = [];
    this.index.forEach(it => {
      const hay = (it.title + ' ' + it.text + ' ' + it.module).toLowerCase();
      let score = 0;
      words.forEach(w => {
        if (it.title.toLowerCase().includes(w)) score += 10;
        if (it.module.toLowerCase().includes(w)) score += 5;
        if (hay.includes(w)) score += 1;
      });
      if (score > 0) scored.push({ ...it, score });
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 30);
  },

  injectModal() {
    if (document.getElementById('search-modal')) return;
    const div = document.createElement('div');
    div.id = 'search-modal';
    div.className = 'search-modal-back hidden';
    div.innerHTML = `
      <div class="search-modal">
        <input id="search-input" type="text" placeholder="Iskaj po vseh modulih… (npr. PPWR, cena, ESG, Slopak)" autofocus />
        <div id="search-loading" class="search-empty">Nalagam indeks…</div>
        <div id="search-results"></div>
        <div class="search-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigiraj · <kbd>Enter</kbd> odpri · <kbd>Esc</kbd> zapri</span>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    const input = document.getElementById('search-input');
    let selectedIdx = 0;
    let results = [];

    const renderResults = () => {
      const slot = document.getElementById('search-results');
      if (!results.length) {
        slot.innerHTML = input.value ? '<div class="search-empty">Brez zadetkov</div>' : '<div class="search-empty">Vnesi iskalni izraz</div>';
        return;
      }
      slot.innerHTML = results.map((r, i) => `
        <a class="search-result ${i === selectedIdx ? 'selected' : ''}" href="${r.link}" data-idx="${i}">
          <span class="search-module">${r.module}</span>
          <span class="search-title">${escape(r.title)}</span>
          <span class="search-snippet">${escape(r.text.slice(0, 120))}…</span>
        </a>
      `).join('');
      const sel = slot.querySelector('.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    };

    const escape = s => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    input.addEventListener('input', () => {
      results = this.query(input.value);
      selectedIdx = 0;
      renderResults();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (selectedIdx < results.length - 1) selectedIdx++; renderResults(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (selectedIdx > 0) selectedIdx--; renderResults(); }
      else if (e.key === 'Enter' && results[selectedIdx]) { window.location.href = results[selectedIdx].link; }
      else if (e.key === 'Escape') this.close();
    });

    div.addEventListener('click', e => { if (e.target === div) this.close(); });
  },

  open() {
    this.injectModal();
    document.getElementById('search-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('search-input').focus(), 50);
    this.build().then(() => {
      const loading = document.getElementById('search-loading');
      if (loading) loading.style.display = 'none';
    });
  },

  close() {
    const m = document.getElementById('search-modal');
    if (m) m.classList.add('hidden');
  }
};

// CSS
(function injectSearchCSS() {
  const css = `
    .search-modal-back {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 300;
      display: flex; justify-content: center; padding-top: 5rem;
    }
    .search-modal-back.hidden { display: none; }
    .search-modal {
      background: white; border-radius: 0.75rem; width: 90%; max-width: 640px;
      max-height: 70vh; display: flex; flex-direction: column;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    }
    #search-input {
      padding: 1rem 1.25rem; font-size: 1.1rem; border: none; border-bottom: 1px solid #d9e2e8;
      outline: none; border-radius: 0.75rem 0.75rem 0 0;
    }
    #search-results { overflow-y: auto; flex: 1; }
    .search-result {
      display: block; padding: 0.75rem 1.25rem; border-bottom: 1px solid #f5f5f4;
      text-decoration: none; color: inherit; cursor: pointer;
    }
    .search-result:hover, .search-result.selected { background: #eef9fd; }
    .search-module {
      display: inline-block; font-size: 0.7rem; padding: 0.125rem 0.5rem;
      background: #f4f7f9; color: #51606c; border-radius: 9999px; margin-right: 0.5rem;
      font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .search-result.selected .search-module { background: #009dd3; color: white; }
    .search-title { font-weight: 600; }
    .search-snippet { display: block; font-size: 0.85rem; color: #51606c; margin-top: 0.25rem; }
    .search-empty { padding: 2rem; text-align: center; color: #78716c; }
    .search-footer {
      padding: 0.5rem 1.25rem; border-top: 1px solid #d9e2e8; font-size: 0.75rem;
      color: #78716c; background: #fafaf9; border-radius: 0 0 0.75rem 0.75rem;
    }
    .search-footer kbd {
      display: inline-block; padding: 0.125rem 0.375rem; background: white;
      border: 1px solid #d9e2e8; border-radius: 0.25rem; font-size: 0.7rem; margin: 0 0.125rem;
    }
    .search-trigger {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.375rem 0.75rem; background: #f5f5f4;
      border: 1px solid #d9e2e8; border-radius: 0.5rem;
      cursor: pointer; font-size: 0.85rem; color: #51606c;
    }
    .search-trigger:hover { background: #eef9fd; border-color: #009dd3; }
    .search-trigger kbd {
      padding: 0.125rem 0.375rem; background: white; border: 1px solid #d9e2e8;
      border-radius: 0.25rem; font-size: 0.7rem;
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// Global hotkey: Cmd+K or Ctrl+K
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    Search.open();
  }
});

// Add trigger button into nav (after nav is rendered)
function injectSearchTrigger() {
  const nav = document.querySelector('.app-nav-inner');
  if (!nav) return false;
  if (nav.querySelector('.search-trigger')) return true;
  const btn = document.createElement('button');
  btn.className = 'search-trigger';
  btn.innerHTML = '🔍 <span class="hidden md:inline">Iskanje</span> <kbd>Ctrl K</kbd>';
  btn.addEventListener('click', () => Search.open());
  nav.appendChild(btn);
  return true;
}
// Inject after nav renders
const searchObserver = new MutationObserver(() => {
  if (injectSearchTrigger()) searchObserver.disconnect();
});
searchObserver.observe(document.body, { childList: true });
setTimeout(() => {
  if (injectSearchTrigger()) searchObserver.disconnect();
}, 200);
