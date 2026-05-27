// Supabase auth/profile bridge. Static app stays deployable; identity lives in Supabase.

const Auth = {
  config: { enabled: false, supabaseUrl: '', anonKey: '' },
  session: null,
  user: null,
  access: null,
  profile: null,
  ready: null,

  async init() {
    await this.loadConfig();
    this.session = Storage.get('auth-session', null);
    if (!this.isEnabled()) return;

    if (!this.session?.access_token) {
      this.redirectToLoginIfNeeded();
      return;
    }

    try {
      this.user = await this.fetchUser();
      this.access = await this.fetchAccess();
      this.profile = await this.fetchProfile(this.access.profile_id);
      this.applyProfile();
    } catch (err) {
      console.warn('Auth session invalid', err);
      this.signOut(false);
      this.redirectToLoginIfNeeded();
    }
  },

  async loadConfig() {
    try {
      const res = await fetch('data/auth-config.json', { cache: 'no-store' });
      if (res.ok) this.config = await res.json();
    } catch {
      this.config = { enabled: false, supabaseUrl: '', anonKey: '' };
    }
  },

  isEnabled() {
    return !!(this.config.enabled && this.config.supabaseUrl && this.config.anonKey);
  },

  isLoginPage() {
    return window.location.pathname.split('/').pop() === 'login.html';
  },

  redirectToLoginIfNeeded() {
    if (this.isLoginPage()) return;
    const next = encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
    window.location.href = `login.html?next=${next}`;
  },

  async signIn(email, password) {
    await this.loadConfig();
    if (!this.isEnabled()) throw new Error('Auth ni konfiguriran. Uredi data/auth-config.json.');
    const data = await this.request(`/auth/v1/token?grant_type=password`, {
      method: 'POST',
      body: { email, password }
    });
    this.session = data;
    Storage.set('auth-session', data);
    this.user = data.user || await this.fetchUser();
    this.access = await this.fetchAccess();
    this.profile = await this.fetchProfile(this.access.profile_id);
    this.applyProfile();
    return this.profile;
  },

  signOut(reload = true) {
    Storage.remove('auth-session');
    this.session = null;
    this.user = null;
    this.access = null;
    this.profile = null;
    if (reload) window.location.href = 'login.html';
  },

  async fetchUser() {
    return this.request('/auth/v1/user');
  },

  async fetchAccess() {
    const email = encodeURIComponent(this.user.email.toLowerCase());
    const rows = await this.rest(`portal_user_access?select=*&user_email=eq.${email}&limit=1`);
    if (!rows.length) throw new Error('Uporabnik nima dodeljenega profila.');
    return rows[0];
  },

  async fetchProfile(id) {
    const rows = await this.rest(`portal_profiles?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    if (!rows.length) throw new Error('Profil ne obstaja.');
    return this.normalizeProfile(rows[0], this.access);
  },

  async fetchProfiles() {
    return (await this.rest('portal_profiles?select=*&order=name.asc')).map(row => this.normalizeProfile(row));
  },

  async fetchUsers() {
    return this.rest('portal_user_access?select=*&order=user_email.asc');
  },

  async saveProfile(profile) {
    const row = this.profileToRow(profile);
    await this.rest(`portal_profiles?id=eq.${encodeURIComponent(profile.id)}`, {
      method: 'PATCH',
      body: row,
      prefer: 'return=minimal'
    });
  },

  async createProfile(profile) {
    await this.rest('portal_profiles', {
      method: 'POST',
      body: this.profileToRow(profile),
      prefer: 'return=minimal'
    });
  },

  async deleteProfile(id) {
    await this.rest(`portal_profiles?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      prefer: 'return=minimal'
    });
  },

  async saveUserAccess(access) {
    await this.rest('portal_user_access', {
      method: 'POST',
      body: {
        user_email: access.user_email.toLowerCase().trim(),
        profile_id: access.profile_id,
        can_edit_content: !!access.can_edit_content,
        is_admin: !!access.is_admin
      },
      prefer: 'resolution=merge-duplicates,return=minimal'
    });
  },

  async deleteUserAccess(email) {
    await this.rest(`portal_user_access?user_email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE',
      prefer: 'return=minimal'
    });
  },

  applyProfile() {
    if (!this.profile) return;
    const previousLanguage = Storage.get('i18n-lang', 'sl');
    Storage.set('active-profile-id', this.profile.id);
    if (this.profile.defaultLanguage) Storage.set('i18n-lang', this.profile.defaultLanguage);
    if (!this.isLoginPage() && this.profile.defaultLanguage && previousLanguage !== this.profile.defaultLanguage) {
      location.reload();
    }
  },

  isAdmin() {
    return !!this.access?.is_admin || this.profile?.role === 'admin';
  },

  canEditContent() {
    return !!this.access?.can_edit_content || ['admin', 'editor'].includes(this.profile?.role);
  },

  normalizeProfile(row, access = null) {
    return {
      id: row.id,
      name: row.name,
      role: access?.is_admin ? 'admin' : row.role,
      defaultLanguage: row.default_language,
      markets: row.markets || [],
      enabledModules: row.enabled_modules || []
    };
  },

  profileToRow(profile) {
    return {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      default_language: profile.defaultLanguage,
      markets: profile.markets || [],
      enabled_modules: profile.enabledModules || []
    };
  },

  async rest(path, options = {}) {
    return this.request(`/rest/v1/${path}`, options);
  },

  async request(path, options = {}) {
    const headers = {
      apikey: this.config.anonKey,
      'Content-Type': 'application/json'
    };
    if (this.session?.access_token) headers.Authorization = `Bearer ${this.session.access_token}`;
    if (options.prefer) headers.Prefer = options.prefer;

    const res = await fetch(`${this.config.supabaseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `${res.status} ${res.statusText}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
};

Auth.ready = Auth.init();
window.Auth = Auth;
