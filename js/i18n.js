// i18n okvir za UI nalepke. Vsebina (govori, ugovori) ostaja v svojih JSON-ih.
// Uporaba:
//   <span data-i18n="nav.domov">Domov</span>  → samodejno prevedeno
//   ali v JS: I18n.t('nav.domov')

const I18n = {
  jezik: 'sl',
  prevodi: null,
  contentPrevodi: { hr: {}, sr: {} },
  ready: null,
  textOriginals: new WeakMap(),
  localizedSources: new Map(),
  isApplying: false,

  async init() {
    await this.domReady();
    this.jezik = Storage.get('i18n-lang', 'sl');
    try {
      const requests = [fetch('data/i18n.json')];
      if (this.jezik === 'hr') requests.push(fetch('data/content-hr.json'));
      if (this.jezik === 'sr') requests.push(fetch('data/content-sr.json'));
      const [ui, content] = await Promise.all(requests);
      if (ui.ok) this.prevodi = await ui.json();
      if (content?.ok) this.contentPrevodi[this.jezik] = await content.json();
    } catch (e) {
      console.warn('i18n load failed', e);
    }
    document.documentElement.lang = this.jezik;
    this.applyToPage();
    this.injectSwitcher();
    this.notifyChange();
  },

  t(key, fallback = null) {
    if (!this.prevodi || !this.prevodi[key]) return fallback || key;
    return this.prevodi[key][this.jezik] || this.prevodi[key].sl || fallback || key;
  },

  setLang(lang) {
    if (!['sl', 'hr', 'sr'].includes(lang)) return;
    this.jezik = lang;
    Storage.set('i18n-lang', lang);
    document.documentElement.lang = lang;
    location.reload();
  },

  applyToPage() {
    if (this.isApplying) return;
    this.isApplying = true;
    try {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (this.prevodi && this.prevodi[key]) {
          const text = this.t(key);
          if (el.textContent !== text) el.textContent = text;
        }
      });
      // Placeholder atributi
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (this.prevodi && this.prevodi[key]) {
          const text = this.t(key);
          if (el.getAttribute('placeholder') !== text) el.setAttribute('placeholder', text);
        }
      });
      // Title atributi
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (this.prevodi && this.prevodi[key]) {
          const text = this.t(key);
          if (el.getAttribute('title') !== text) el.setAttribute('title', text);
        }
      });
      this.translateTextNodes();
    } finally {
      this.isApplying = false;
    }
  },

  injectSwitcher() {
    const nav = document.querySelector('.app-nav-inner');
    if (!nav || nav.querySelector('.lang-switcher')) return;
    const sw = document.createElement('div');
    sw.className = 'lang-switcher';
    sw.innerHTML = `
      <button class="lang-btn ${this.jezik==='sl'?'active':''}" data-lang="sl" title="Slovenščina">SI</button>
      <button class="lang-btn ${this.jezik==='hr'?'active':''}" data-lang="hr" title="Hrvatski">HR</button>
      <button class="lang-btn ${this.jezik==='sr'?'active':''}" data-lang="sr" title="Srpski">SR</button>
    `;
    nav.appendChild(sw);
    sw.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setLang(btn.dataset.lang);
        sw.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === this.jezik));
      });
    });
  },

  notifyChange() {
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: this.jezik } }));
  },

  domReady() {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  },

  localizeText(text) {
    if (typeof text !== 'string' || this.jezik === 'sl') return text;
    const overrides = Storage.get('content-overrides', {});
    const localized = overrides[this.jezik]?.[text] || this.contentPrevodi[this.jezik]?.[text] || text;
    if (localized !== text) this.localizedSources.set(localized, text);
    return localized;
  },

  translateTextNodes(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const original = this.textOriginals.get(node) || node.nodeValue;
      this.textOriginals.set(node, original);
      const next = this.translatePreservingWhitespace(original);
      if (node.nodeValue !== next) node.nodeValue = next;
    }
  },

  translatePreservingWhitespace(text) {
    if (this.jezik === 'sl') return text;
    const match = text.match(/^(\s*)(.*?)(\s*)$/s);
    if (!match) return text;
    return match[1] + this.localizeText(match[2]) + match[3];
  }
};

I18n.ready = I18n.init();
window.I18n = I18n;

// CSS za jezikovni preklopnik
(function injectI18nCSS() {
  const css = `
    .lang-switcher {
      display: flex; gap: 0.125rem; padding: 0.125rem;
      background: #eef9fd; border: 1px solid #d9e2e8; border-radius: 0.5rem;
      margin-left: 0.5rem;
    }
    .lang-btn {
      padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 600;
      background: transparent; border: none; color: #51606c;
      cursor: pointer; border-radius: 0.375rem; min-width: 2rem;
    }
    .lang-btn:hover { color: #183362; }
    .lang-btn.active { background: #ffce00; color: #183362; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// Init po DOM
