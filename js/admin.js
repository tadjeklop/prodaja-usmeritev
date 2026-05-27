// Local admin tools: simple profiles, module visibility and HR/SR content overrides.

const AdminTools = {
  downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
    this.downloadBlob(filename, blob);
  },

  downloadBlob(filename, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
};

const SettingsAdmin = {
  modules: NAV_ITEMS.map(item => ({
    id: item.href.replace('.html', ''),
    label: item.label,
    i18n: item.i18n,
    always: item.always
  })),

  init() {
    const root = document.getElementById('admin-settings');
    if (!root) return;
    this.root = root;
    this.renderShell();
    if (typeof Auth !== 'undefined' && Auth.isEnabled()) this.renderCloud();
    else this.renderLocal();
  },

  t(key, fallback) {
    return typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback;
  },

  profileLabel(profile) {
    return `${profile.name} (${profile.role})`;
  },

  renderShell() {
    this.root.innerHTML = '<div id="settings-content"></div>';
    this.content = document.getElementById('settings-content');
  },

  async renderCloud() {
    if (!Auth.isAdmin()) {
      this.content.innerHTML = `
        <section class="panel">
          <h2 class="text-xl font-bold mb-2">${this.t('settings.no_admin', 'Nimaš admin dostopa')}</h2>
          <p class="text-stone-600">${this.t('settings.no_admin_hint', 'Tvoj profil določa, katere module vidiš. Urejanje uporabnikov je na voljo samo adminu.')}</p>
        </section>
      `;
      return;
    }

    try {
      this.cloudProfiles = await Auth.fetchProfiles();
      this.cloudUsers = await Auth.fetchUsers();
      this.content.innerHTML = this.renderCloudHtml();
      this.wireCloud();
    } catch (err) {
      this.content.innerHTML = `<section class="panel text-red-700">${this.escape(err.message)}</section>`;
    }
  },

  renderCloudHtml() {
    return `
      <section class="panel mb-6">
        <h2 class="text-xl font-bold">${this.t('settings.users', 'Uporabniki')}</h2>
        <p class="text-sm text-stone-600 mt-1">${this.t('settings.users_hint', 'Uporabnika najprej ustvariÅ¡ v Supabase Authentication, tukaj pa mu dodeliÅ¡ profil in pravice v portalu.')}</p>
        <form id="cloud-user-form" class="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
          <input class="input md:col-span-2" name="user_email" type="email" placeholder="email@podjetje.com" required>
          <select class="select" name="profile_id">
            ${this.cloudProfiles.map(profile => `<option value="${profile.id}">${this.escape(profile.name)}</option>`).join('')}
          </select>
          <label class="admin-check"><input type="checkbox" name="can_edit_content"> ${this.t('settings.can_edit', 'Ureja tekst')}</label>
          <label class="admin-check"><input type="checkbox" name="is_admin"> Admin</label>
          <button class="btn btn-primary md:col-span-5" type="submit">${this.t('settings.save_user', 'Shrani uporabnika')}</button>
        </form>
        <div class="overflow-x-auto mt-5">
          <table class="settings-table">
            <thead><tr><th>Email</th><th>Profil</th><th>Ureja tekst</th><th>Admin</th><th></th></tr></thead>
            <tbody>
              ${this.cloudUsers.map(user => `
                <tr>
                  <td>${this.escape(user.user_email)}</td>
                  <td>${this.escape(this.cloudProfiles.find(profile => profile.id === user.profile_id)?.name || user.profile_id)}</td>
                  <td>${user.can_edit_content ? 'Da' : 'Ne'}</td>
                  <td>${user.is_admin ? 'Da' : 'Ne'}</td>
                  <td><button class="btn btn-ghost cloud-delete-user" data-email="${this.escape(user.user_email)}" type="button">${this.t('common.izbrisi', 'IzbriÅ¡i')}</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel mb-6">
        <div class="flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div>
            <h2 class="text-xl font-bold">${this.t('settings.profiles', 'Profili')}</h2>
            <p class="text-sm text-stone-600 mt-1">${this.t('settings.cloud_notice', 'Profili so shranjeni v Supabase in veljajo za vse uporabnike po prijavi.')}</p>
          </div>
          <button class="btn btn-primary" id="settings-add-profile">${this.t('settings.add_profile', '+ Nov profil')}</button>
        </div>
      </section>

      <section class="space-y-4">
        ${this.cloudProfiles.map(profile => this.renderProfile(profile)).join('')}
      </section>
    `;
  },

  wireCloud() {
    this.content.querySelector('#cloud-user-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await Auth.saveUserAccess({
        user_email: form.get('user_email'),
        profile_id: form.get('profile_id'),
        can_edit_content: form.has('can_edit_content'),
        is_admin: form.has('is_admin')
      });
      this.renderCloud();
    });
    this.content.querySelectorAll('.cloud-delete-user').forEach(button => {
      button.addEventListener('click', async () => {
        await Auth.deleteUserAccess(button.dataset.email);
        this.renderCloud();
      });
    });
    this.content.querySelector('#settings-add-profile')?.addEventListener('click', async () => this.addProfile());
    this.content.querySelectorAll('[data-profile-id]').forEach(card => {
      card.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', () => this.saveCard(card));
      });
      card.querySelector('.admin-delete-profile')?.addEventListener('click', () => this.deleteProfile(card.dataset.profileId));
    });
  },

  renderLocal() {
    const profiles = ProfileManager.getProfiles();
    const active = ProfileManager.getActiveProfile();
    this.content.innerHTML = `
      <section class="panel mb-6">
        <div class="flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div>
            <h2 class="text-xl font-bold">${this.t('settings.profiles', 'Profili')}</h2>
            <p class="text-sm text-stone-600 mt-1">${this.t('settings.local_notice', 'Lokalna nastavitev za poenostavitev portala. To ni varnostni sistem.')}</p>
          </div>
          <button class="btn btn-primary" id="settings-add-profile">${this.t('settings.add_profile', '+ Nov profil')}</button>
        </div>
      </section>

      <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="panel lg:col-span-1">
          <h3 class="font-semibold mb-3">${this.t('settings.active_profile', 'Aktivni profil')}</h3>
          <select class="select" id="settings-active-profile">
            ${profiles.map(profile => `<option value="${profile.id}" ${profile.id === active.id ? 'selected' : ''}>${this.profileLabel(profile)}</option>`).join('')}
          </select>
          <p class="text-xs text-stone-500 mt-3">${this.t('settings.active_hint', 'Preklop profila spremeni privzeti jezik in vidne zavihke.')}</p>
        </div>
        <div class="panel lg:col-span-2">
          <h3 class="font-semibold mb-3">${this.t('settings.text_tools', 'Besedila in popravki')}</h3>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-secondary" id="settings-export-overrides">${this.t('settings.export_overrides', 'Izvozi lokalne popravke')}</button>
            <label class="btn btn-secondary cursor-pointer">
              ${this.t('settings.import_overrides', 'Uvozi lokalne popravke')}
              <input id="settings-import-overrides" type="file" accept=".json" hidden>
            </label>
            <a class="btn btn-secondary" href="translations-review.tsv" download>${this.t('settings.download_tsv', 'Prenesi TSV za prevode')}</a>
          </div>
          <p class="text-xs text-stone-500 mt-3">${this.t('settings.override_hint', 'Popravki se shranijo v tem brskalniku. Izvoz JSON datoteke omogoča, da jih kasneje združimo v aplikacijo.')}</p>
        </div>
      </section>

      <section class="space-y-4">
        ${profiles.map(profile => this.renderProfile(profile)).join('')}
      </section>
    `;
    this.wireLocal();
  },

  renderProfile(profile) {
    return `
      <article class="panel" data-profile-id="${profile.id}">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="label">${this.t('settings.name', 'Ime')}</label>
            <input class="input" data-field="name" value="${this.escape(profile.name)}">
          </div>
          <div>
            <label class="label">${this.t('settings.role', 'Vloga')}</label>
            <select class="select" data-field="role">
              ${['admin', 'editor', 'viewer'].map(role => `<option value="${role}" ${profile.role === role ? 'selected' : ''}>${role}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label">${this.t('settings.language', 'Privzeti jezik')}</label>
            <select class="select" data-field="defaultLanguage">
              ${['sl', 'hr', 'sr'].map(lang => `<option value="${lang}" ${profile.defaultLanguage === lang ? 'selected' : ''}>${lang.toUpperCase()}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label">${this.t('settings.markets', 'Trgi')}</label>
            <div class="flex flex-wrap gap-2">
              ${['sl', 'hr', 'sr'].map(market => `
                <label class="admin-check"><input type="checkbox" data-market="${market}" ${(profile.markets || []).includes(market) ? 'checked' : ''}> ${market.toUpperCase()}</label>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between gap-3 mb-2">
            <label class="label mb-0">${this.t('settings.visible_modules', 'Vidni zavihki')}</label>
            ${profile.id !== 'admin' ? `<button class="btn btn-ghost admin-delete-profile" type="button">${this.t('settings.delete_profile', 'Izbriši profil')}</button>` : ''}
          </div>
          <div class="admin-module-grid">
            ${this.modules.map(module => `
              <label class="admin-check ${module.always ? 'opacity-60' : ''}">
                <input type="checkbox" data-module="${module.id}" ${module.always ? 'disabled checked' : ''} ${(profile.enabledModules || []).includes(module.id) ? 'checked' : ''}>
                ${this.escape(this.t(module.i18n, module.label))}
              </label>
            `).join('')}
          </div>
        </div>
      </article>
    `;
  },

  wireLocal() {
    this.content.querySelector('#settings-active-profile')?.addEventListener('change', event => {
      ProfileManager.setActiveProfile(event.target.value);
    });
    this.content.querySelector('#settings-add-profile')?.addEventListener('click', () => this.addProfile());
    this.content.querySelector('#settings-export-overrides')?.addEventListener('click', () => {
      AdminTools.downloadJson('interzero-content-overrides.json', Storage.get('content-overrides', {}));
    });
    this.content.querySelector('#settings-import-overrides')?.addEventListener('change', event => this.importOverrides(event.target.files?.[0]));

    this.content.querySelectorAll('[data-profile-id]').forEach(card => {
      card.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', () => this.saveCard(card));
      });
      card.querySelector('.admin-delete-profile')?.addEventListener('click', () => this.deleteProfile(card.dataset.profileId));
    });
  },

  async addProfile() {
    const profiles = (typeof Auth !== 'undefined' && Auth.isEnabled()) ? [...this.cloudProfiles] : ProfileManager.getProfiles();
    const id = `profil-${Date.now()}`;
    profiles.push({
      id,
      name: 'Nov profil',
      role: 'viewer',
      defaultLanguage: 'hr',
      markets: ['hr'],
      enabledModules: ['index', 'stranke', 'govori', 'ugovori', 'zakonodaja']
    });
    if (typeof Auth !== 'undefined' && Auth.isEnabled()) {
      await Auth.createProfile(profiles.at(-1));
      this.renderCloud();
    } else {
      ProfileManager.saveProfiles(profiles);
      this.renderLocal();
    }
  },

  async deleteProfile(id) {
    if (typeof Auth !== 'undefined' && Auth.isEnabled()) {
      await Auth.deleteProfile(id);
      this.renderCloud();
      return;
    }
    const profiles = ProfileManager.getProfiles().filter(profile => profile.id !== id);
    ProfileManager.saveProfiles(profiles);
    if (ProfileManager.getActiveProfile().id === id) Storage.set('active-profile-id', 'admin');
    this.renderLocal();
  },

  async saveCard(card) {
    const id = card.dataset.profileId;
    const profiles = (typeof Auth !== 'undefined' && Auth.isEnabled()) ? this.cloudProfiles : ProfileManager.getProfiles();
    const profile = profiles.find(item => item.id === id);
    if (!profile) return;
    profile.name = card.querySelector('[data-field="name"]').value.trim() || profile.name;
    profile.role = card.querySelector('[data-field="role"]').value;
    profile.defaultLanguage = card.querySelector('[data-field="defaultLanguage"]').value;
    profile.markets = [...card.querySelectorAll('[data-market]:checked')].map(input => input.dataset.market);
    profile.enabledModules = [...card.querySelectorAll('[data-module]:checked')].map(input => input.dataset.module);
    if (!profile.enabledModules.includes('settings')) profile.enabledModules.push('settings');
    if (typeof Auth !== 'undefined' && Auth.isEnabled()) {
      await Auth.saveProfile(profile);
      this.renderCloud();
    } else {
      ProfileManager.saveProfiles(profiles);
      renderNav();
      applyProfileVisibility();
    }
  },

  async importOverrides(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await AdminTools.readFile(file));
      Storage.set('content-overrides', data);
      alert(this.t('settings.import_done', 'Popravki so uvoženi. Stran se bo osvežila.'));
      location.reload();
    } catch {
      alert(this.t('settings.import_error', 'Uvoz ni uspel. Preveri JSON datoteko.'));
    }
  },

  escape(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
};

const ContentEditor = {
  enabled: false,
  current: null,

  async init() {
    await this.waitForI18n();
    if (!['hr', 'sr'].includes(I18n.jezik)) return;
    if (!ProfileManager.canEditContent()) return;
    this.injectToolbar();
    window.addEventListener('load', () => setTimeout(() => this.refresh(), 250));
    document.addEventListener('i18n:changed', () => setTimeout(() => this.refresh(), 250));
  },

  waitForI18n() {
    if (typeof I18n !== 'undefined' && I18n.ready) return I18n.ready;
    return Promise.resolve();
  },

  injectToolbar() {
    if (document.getElementById('content-editor-toolbar')) return;
    const div = document.createElement('div');
    div.id = 'content-editor-toolbar';
    div.className = 'content-editor-toolbar no-print';
    div.innerHTML = `
      <button class="btn btn-secondary" id="content-editor-toggle">${I18n.t('editor.toggle', 'Uredi tekst')}</button>
      <button class="btn btn-secondary" id="content-editor-export">${I18n.t('editor.export', 'Izvozi popravke')}</button>
    `;
    document.body.appendChild(div);
    document.getElementById('content-editor-toggle').addEventListener('click', () => this.toggle());
    document.getElementById('content-editor-export').addEventListener('click', () => {
      AdminTools.downloadJson('interzero-content-overrides.json', Storage.get('content-overrides', {}));
    });
  },

  toggle() {
    this.enabled = !this.enabled;
    document.body.classList.toggle('content-editing', this.enabled);
    this.refresh();
  },

  refresh() {
    document.querySelectorAll('.content-edit-btn').forEach(btn => btn.remove());
    document.querySelectorAll('.content-edit-target').forEach(el => el.classList.remove('content-edit-target'));
    if (!this.enabled) return;
    this.candidates().forEach(el => this.addButton(el));
  },

  candidates() {
    const selector = [
      'main .script-block',
      'main .panel p',
      'main .panel li',
      'main details summary',
      'main h1',
      'main h2',
      'main h3',
      'main p',
      'main li'
    ].join(',');
    return [...document.querySelectorAll(selector)].filter(el => {
      if (el.closest('#app-nav, #content-editor-toolbar, #content-editor-modal')) return false;
      if (el.querySelector('input, textarea, select')) return false;
      const text = this.cleanText(el);
      return text.length >= 8 && text.length <= 4000;
    });
  },

  addButton(el) {
    el.classList.add('content-edit-target');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'content-edit-btn';
    btn.textContent = I18n.t('common.uredi', 'Uredi');
    btn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.open(el);
    });
    el.appendChild(btn);
  },

  open(el) {
    const visible = this.cleanText(el);
    const source = this.sourceTextFor(el, visible);
    if (!source) {
      alert(I18n.t('editor.no_source', 'Tega besedila ne morem povezati z izvirnikom.'));
      return;
    }
    this.current = { el, source, visible };
    this.renderModal(visible);
  },

  renderModal(text) {
    document.getElementById('content-editor-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'content-editor-modal';
    modal.className = 'content-editor-modal';
    modal.innerHTML = `
      <div class="content-editor-dialog">
        <h2>${I18n.t('editor.title', 'Popravek besedila')}</h2>
        <textarea class="textarea" id="content-editor-value" rows="10">${this.escape(text)}</textarea>
        <div class="content-editor-actions">
          <button class="btn btn-ghost" id="content-editor-cancel">${I18n.t('common.prekini', 'Prekini')}</button>
          <button class="btn btn-primary" id="content-editor-save">${I18n.t('common.shrani', 'Shrani')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('content-editor-cancel').addEventListener('click', () => modal.remove());
    document.getElementById('content-editor-save').addEventListener('click', () => this.save());
  },

  save() {
    const value = document.getElementById('content-editor-value')?.value.trim();
    if (!this.current || !value) return;
    const overrides = Storage.get('content-overrides', {});
    if (!overrides[I18n.jezik]) overrides[I18n.jezik] = {};
    overrides[I18n.jezik][this.current.source] = value;
    Storage.set('content-overrides', overrides);
    document.getElementById('content-editor-modal')?.remove();
    location.reload();
  },

  sourceTextFor(el, visible) {
    const textNode = [...el.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    const original = textNode && I18n.textOriginals?.get(textNode);
    if (original?.trim()) return original.trim();
    if (I18n.localizedSources?.has(visible)) return I18n.localizedSources.get(visible);
    return null;
  },

  cleanText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('button, .copy-btn, .speech-read-btn, .content-edit-btn').forEach(node => node.remove());
    return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
  },

  escape(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
};

window.AdminTools = AdminTools;
window.SettingsAdmin = SettingsAdmin;
window.ContentEditor = ContentEditor;

async function bootAdminTools() {
  await waitForI18nGlobal();
  await waitForAuthGlobal();
  SettingsAdmin.init();
  ContentEditor.init();
}

function waitForI18nGlobal() {
  if (typeof I18n !== 'undefined' && I18n.ready) return I18n.ready;
  return new Promise(resolve => {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (typeof I18n !== 'undefined' && I18n.ready) {
        clearInterval(timer);
        I18n.ready.then(resolve).catch(resolve);
      } else if (tries > 50) {
        clearInterval(timer);
        resolve();
      }
    }, 50);
  });
}

function waitForAuthGlobal() {
  if (typeof Auth !== 'undefined' && Auth.ready) return Auth.ready;
  return new Promise(resolve => {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (typeof Auth !== 'undefined' && Auth.ready) {
        clearInterval(timer);
        Auth.ready.then(resolve).catch(resolve);
      } else if (tries > 50) {
        clearInterval(timer);
        resolve();
      }
    }, 50);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAdminTools, { once: true });
} else {
  bootAdminTools();
}
