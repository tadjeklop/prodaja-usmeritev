// Shared app logic: navigation, JSON loading, copy buttons.

let i18nLoadPromise = null;
let authLoadPromise = null;
const APP_ASSET_VERSION = 'v16';

(function clearOldRuntimeCache() {
  try {
    if (Storage.get('app-asset-version') === APP_ASSET_VERSION) return;
    Storage.set('app-asset-version', APP_ASSET_VERSION);
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.filter(key => key.startsWith('interzero-epr-')).forEach(key => caches.delete(key));
      }).catch(() => {});
    }
  } catch {}
})();

const NAV_ITEMS = [
  { href: 'index.html',       label: 'Domov',       i18n: 'nav.domov' },
  { href: 'dashboard.html',   label: 'Dashboard',   i18n: 'nav.dashboard' },
  { href: 'stranke.html',     label: 'Stranke',     i18n: 'nav.stranke' },
  { href: 'segmentacija.html',label: 'Segmenti',    i18n: 'nav.segmenti' },
  { href: 'vodic.html',       label: 'Vodič',       i18n: 'nav.vodic' },
  { href: 'roleplay.html',    label: 'Vaja',        i18n: 'nav.roleplay' },
  { href: 'priprava.html',    label: 'Priprava',    i18n: 'nav.priprava' },
  { href: 'obrazec.html',     label: 'Obrazec',     i18n: 'nav.obrazec' },
  { href: 'govori.html',      label: 'Govori',      i18n: 'nav.govori' },
  { href: 'ugovori.html',     label: 'Ugovori',     i18n: 'nav.ugovori' },
  { href: 'konkurenca.html',  label: 'Konkurenca',  i18n: 'nav.konkurenca' },
  { href: 'reference.html',   label: 'Reference',   i18n: 'nav.reference' },
  { href: 'kalkulacije.html', label: 'Kalkulacije', i18n: 'nav.kalkulacije' },
  { href: 'ponudba.html',     label: 'Ponudba',     i18n: 'nav.ponudba' },
  { href: 'proces.html',      label: 'Proces',      i18n: 'nav.proces' },
  { href: 'glosar.html',      label: 'Glosar',      i18n: 'nav.glosar' },
  { href: 'koledar.html',     label: 'Koledar',     i18n: 'nav.koledar' },
  { href: 'vsebine.html',     label: 'Vsebine',     i18n: 'nav.vsebine' },
  { href: 'zakonodaja.html',  label: 'Zakonodaja',  i18n: 'nav.zakonodaja' },
  { href: 'onboarding.html',  label: 'Onboarding',  i18n: 'nav.onboarding' },
  { href: 'kpi.html',         label: 'KPI',         i18n: 'nav.kpi' },
  { href: 'asistent.html',    label: 'AI',          i18n: 'nav.asistent' },
  { href: 'zgodovina.html',   label: 'Zgodovina',   i18n: 'nav.zgodovina' },
  { href: 'settings.html',    label: 'Settings',    i18n: 'nav.settings', always: true }
];

const DEFAULT_MODULES = NAV_ITEMS.map(item => item.href.replace('.html', ''));

const DEFAULT_PROFILES = [
  {
    id: 'admin',
    name: 'Admin',
    role: 'admin',
    defaultLanguage: 'sl',
    markets: ['sl', 'hr', 'sr'],
    enabledModules: DEFAULT_MODULES
  },
  {
    id: 'sl-prodaja',
    name: 'Slovenija prodaja',
    role: 'viewer',
    defaultLanguage: 'sl',
    markets: ['sl'],
    enabledModules: ['index', 'stranke', 'segmentacija', 'vodic', 'roleplay', 'priprava', 'obrazec', 'govori', 'ugovori', 'konkurenca', 'reference', 'kalkulacije', 'ponudba', 'proces', 'glosar', 'koledar', 'vsebine', 'zakonodaja']
  },
  {
    id: 'hr-prodaja',
    name: 'Hrvatska prodaja',
    role: 'editor',
    defaultLanguage: 'hr',
    markets: ['hr'],
    enabledModules: ['index', 'stranke', 'segmentacija', 'vodic', 'roleplay', 'priprava', 'obrazec', 'govori', 'ugovori', 'konkurenca', 'reference', 'kalkulacije', 'ponudba', 'proces', 'glosar', 'koledar', 'vsebine', 'zakonodaja']
  },
  {
    id: 'sr-prodaja',
    name: 'Srbija prodaja',
    role: 'editor',
    defaultLanguage: 'sr',
    markets: ['sr'],
    enabledModules: ['index', 'stranke', 'segmentacija', 'vodic', 'roleplay', 'priprava', 'obrazec', 'govori', 'ugovori', 'konkurenca', 'reference', 'kalkulacije', 'ponudba', 'proces', 'glosar', 'koledar', 'vsebine', 'zakonodaja']
  }
];

const ProfileManager = {
  usingCloudProfile() {
    return typeof Auth !== 'undefined' && Auth.isEnabled() && !!Auth.profile;
  },

  getProfiles() {
    if (this.usingCloudProfile()) return [Auth.profile];
    const profiles = Storage.get('profiles', null);
    if (Array.isArray(profiles) && profiles.length) return profiles;
    Storage.set('profiles', DEFAULT_PROFILES);
    Storage.set('active-profile-id', 'admin');
    return DEFAULT_PROFILES;
  },

  saveProfiles(profiles) {
    if (this.usingCloudProfile()) return;
    Storage.set('profiles', profiles);
  },

  getActiveProfile() {
    if (this.usingCloudProfile()) return Auth.profile;
    const profiles = this.getProfiles();
    const activeId = Storage.get('active-profile-id', 'admin');
    return profiles.find(profile => profile.id === activeId) || profiles[0] || DEFAULT_PROFILES[0];
  },

  setActiveProfile(id) {
    if (this.usingCloudProfile()) return;
    const profile = this.getProfiles().find(item => item.id === id);
    if (!profile) return;
    Storage.set('active-profile-id', id);
    if (profile.defaultLanguage) Storage.set('i18n-lang', profile.defaultLanguage);
    location.reload();
  },

  isAdmin() {
    if (this.usingCloudProfile()) return Auth.isAdmin();
    return this.getActiveProfile().role === 'admin';
  },

  canEditContent() {
    if (this.usingCloudProfile()) return Auth.canEditContent();
    const profile = this.getActiveProfile();
    return ['admin', 'editor'].includes(profile.role);
  },

  canAccess(moduleId) {
    const profile = this.getActiveProfile();
    if (profile.role === 'admin') return true;
    if (moduleId === 'settings') return true;
    return (profile.enabledModules || []).includes(moduleId);
  },

  visibleNavItems() {
    return NAV_ITEMS.filter(item => item.always || this.canAccess(item.href.replace('.html', '')));
  }
};

window.ProfileManager = ProfileManager;

function currentPage() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  return path;
}

function renderNav() {
  const here = currentPage();
  const visibleItems = ProfileManager.visibleNavItems();
  const links = visibleItems.map(item => {
    const active = item.href === here ? ' active' : '';
    const i18nAttr = item.i18n ? ` data-i18n="${item.i18n}"` : '';
    return `<a href="${item.href}" class="app-nav-link${active}"${i18nAttr}>${item.label}</a>`;
  }).join('');

  const html = `
    <nav class="app-nav">
      <div class="app-nav-inner">
        <a href="index.html" class="app-nav-logo">Interzero EPR</a>
        <details class="app-nav-menu">
          <summary class="app-nav-menu-button" data-i18n="nav.menu">Meni</summary>
          <div class="app-nav-links">${links}</div>
        </details>
        ${renderAccountControl()}
      </div>
    </nav>
  `;
  const slot = document.getElementById('app-nav');
  if (slot) {
    slot.innerHTML = html;
    const switcher = slot.querySelector('.profile-switcher');
    if (switcher) switcher.addEventListener('change', () => ProfileManager.setActiveProfile(switcher.value));
    const logout = slot.querySelector('[data-auth-logout]');
    if (logout) logout.addEventListener('click', () => Auth.signOut());
    slot.querySelectorAll('.app-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        const menu = slot.querySelector('.app-nav-menu');
        if (menu) menu.open = false;
      });
    });
    document.addEventListener('click', event => {
      const menu = slot.querySelector('.app-nav-menu');
      if (menu?.open && !menu.contains(event.target)) menu.open = false;
    });
  }
}

function renderAccountControl() {
  if (typeof Auth !== 'undefined' && Auth.isEnabled() && Auth.user) {
    return `
      <div class="account-chip">
        <span>${Auth.user.email}</span>
        <button type="button" data-auth-logout>Odjava</button>
      </div>
    `;
  }
  return `
    <select class="profile-switcher" title="Profil" aria-label="Profil">
      ${ProfileManager.getProfiles().map(profile => `<option value="${profile.id}" ${profile.id === ProfileManager.getActiveProfile().id ? 'selected' : ''}>${profile.name}</option>`).join('')}
    </select>
  `;
}

function tr(key, fallback = null) {
  return typeof I18n !== 'undefined' ? I18n.t(key, fallback) : (fallback || key);
}

// Load a JSON file from /data folder. Fallback message on failure (e.g. file:// CORS).
async function loadData(name) {
  try {
    await waitForI18n();
    const res = await fetch(`data/${name}.json`);
    if (!res.ok) throw new Error(res.status);
    return localizeLoadedData(await res.json());
  } catch (err) {
    console.error(`Cannot load data/${name}.json`, err);
    return null;
  }
}

async function waitForI18n() {
  if (i18nLoadPromise) await i18nLoadPromise;
  if (typeof I18n !== 'undefined' && I18n.ready) {
    await I18n.ready;
  }
}

function localizeLoadedData(value) {
  if (typeof I18n === 'undefined' || !I18n.localizeText) return value;
  if (typeof value === 'string') return I18n.localizeText(value);
  if (Array.isArray(value)) return value.map(localizeLoadedData);
  if (!value || typeof value !== 'object') return value;
  const langSuffix = I18n.jezik === 'hr' ? '_hr' : I18n.jezik === 'sr' ? '_sr' : null;
  const localized = {};
  for (const [key, item] of Object.entries(value)) {
    if (langSuffix && key.endsWith('_si')) {
      const sibling = value[key.slice(0, -3) + langSuffix];
      localized[key] = sibling === undefined ? localizeLoadedData(item) : localizeLoadedData(sibling);
    } else {
      localized[key] = localizeLoadedData(item);
    }
  }
  return localized;
}

function moduleIdFromHref(href) {
  if (!href) return null;
  const clean = href.split('?')[0].split('#')[0].split('/').pop();
  return clean && clean.endsWith('.html') ? clean.replace('.html', '') : null;
}

function applyProfileVisibility(root = document) {
  root.querySelectorAll('a[href$=".html"]').forEach(link => {
    const moduleId = moduleIdFromHref(link.getAttribute('href'));
    if (!moduleId || moduleId === 'settings') return;
    if (link.classList.contains('app-nav-link')) return;
    link.hidden = !ProfileManager.canAccess(moduleId);
  });
}

function enforcePageAccess() {
  const moduleId = moduleIdFromHref(currentPage());
  if (!moduleId || ProfileManager.canAccess(moduleId)) return;
  const main = document.querySelector('main');
  if (!main) return;
  main.innerHTML = `
    <section class="panel text-center py-12">
      <h1 class="text-2xl font-bold mb-2">Modul ni omogoÄen za ta profil</h1>
      <p class="text-stone-600 mb-4">Admin lahko v Settings vkljuÄi ali izkljuÄi zavihke za vsak profil.</p>
      <a class="btn btn-primary" href="settings.html">Settings</a>
    </section>
  `;
}

// Wire up any element with [data-copy] to copy its text content (or specified target).
function wireCopyButtons(root = document) {
  root.querySelectorAll('[data-copy]').forEach(btn => {
    if (btn._wired) return;
    btn._wired = true;
    btn.addEventListener('click', async () => {
      const sel = btn.getAttribute('data-copy');
      const target = sel ? root.querySelector(sel) : btn.previousElementSibling;
      if (!target) return;
      const text = target.innerText || target.textContent;
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = tr('common.kopirano', '✓ Kopirano');
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 1500);
      } catch {
        alert(tr('common.copy_error', 'Kopiranje ni uspelo. Označi tekst ročno.'));
      }
    });
  });

  // Ko se kopirajo gumbi, povežemo tudi „Beri" gumbe (če je Speech naložen)
  if (typeof Speech !== 'undefined' && Speech.attachReadButtons) {
    Speech.attachReadButtons(root);
  }
}

// Samodejno naloži speech.js, če še ni
(function loadSpeech() {
  if (document.querySelector('script[src*="speech.js"]')) return;
  const s = document.createElement('script');
  s.src = `js/speech.js?${APP_ASSET_VERSION}`;
  document.head.appendChild(s);
  // Po nalaganju ponovno poveži vse že obstoječe .script-block
  s.onload = () => {
    if (typeof Speech !== 'undefined') {
      // Počakaj, da se Speech.init() izvrši
      setTimeout(() => Speech.attachReadButtons(document), 100);
    }
  };
})();

// Samodejno naloži search.js
(function loadSearch() {
  if (document.querySelector('script[src*="search.js"]')) return;
  const s = document.createElement('script');
  s.src = `js/search.js?${APP_ASSET_VERSION}`;
  document.head.appendChild(s);
})();

// Samodejno naloži i18n.js
(function loadI18n() {
  if (document.querySelector('script[src*="i18n.js"]')) return;
  const s = document.createElement('script');
  s.src = `js/i18n.js?${APP_ASSET_VERSION}`;
  i18nLoadPromise = new Promise(resolve => {
    s.onload = resolve;
    s.onerror = resolve;
  });
  document.head.appendChild(s);
})();

// Samodejno nalozi auth guard pred zagonom strani.
(function loadAuth() {
  if (document.querySelector('script[src*="auth.js"]')) return;
  const s = document.createElement('script');
  s.src = `js/auth.js?${APP_ASSET_VERSION}`;
  authLoadPromise = new Promise(resolve => {
    s.onload = resolve;
    s.onerror = resolve;
  });
  document.head.appendChild(s);
})();

// Samodejno nalozi lokalni admin/profil/editor sloj.
(function loadAdminTools() {
  if (document.querySelector('script[src*="admin.js"]')) return;
  const s = document.createElement('script');
  s.src = `js/admin.js?${APP_ASSET_VERSION}`;
  document.head.appendChild(s);
})();

// PWA: registriraj service worker in vstavi manifest link
(function setupPWA() {
  // Manifest link
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
  }
  // Theme color
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#2e7d32';
    document.head.appendChild(meta);
  }
  // Apple touch icon
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.href = 'icons/icon-192.svg';
    document.head.appendChild(link);
  }

  // Service worker — samo na http(s), ne na file://
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  }
})();

// URL query helpers
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Slovenian-formatted numbers
function localeForCurrentLanguage() {
  const lang = typeof I18n !== 'undefined' ? I18n.jezik : Storage.get('i18n-lang', 'sl');
  if (lang === 'hr') return 'hr-HR';
  if (lang === 'sr') return 'sr-RS';
  return 'sl-SI';
}

function fmtEUR(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat(localeForCurrentLanguage(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
}
function fmtNum(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat(localeForCurrentLanguage(), { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  bootApp();
});

async function bootApp() {
  if (authLoadPromise) await authLoadPromise;
  if (typeof Auth !== 'undefined' && Auth.ready) await Auth.ready;
  renderNav();
  if (i18nLoadPromise) await i18nLoadPromise;
  if (typeof I18n !== 'undefined' && I18n.ready) await I18n.ready;
  if (typeof I18n !== 'undefined' && I18n.injectSwitcher) I18n.injectSwitcher();
  enforcePageAccess();
  applyProfileVisibility();
  wireCopyButtons();
}
