// Storage helpers — vse v localStorage, brez strežnika.

const Storage = {
  PREFIX: 'izepr.',

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },

  set(key, value) {
    localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  // Append to a list (e.g. history of meeting preps)
  push(listKey, item) {
    const list = this.get(listKey, []);
    list.unshift({ ...item, _id: Date.now() + Math.random().toString(36).slice(2, 8), _created: new Date().toISOString() });
    this.set(listKey, list.slice(0, 100)); // hold last 100
    return list[0]._id;
  },

  // Remove item from list by _id
  removeFromList(listKey, id) {
    const list = this.get(listKey, []).filter(x => x._id !== id);
    this.set(listKey, list);
  },

  // Get item by _id
  findInList(listKey, id) {
    return this.get(listKey, []).find(x => x._id === id);
  },

  // Format ISO date as DD.MM.YYYY HH:mm
  formatDate(iso) {
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  // Audit log: shrani vsako spremembo v dnevnik
  audit(entity, action, id, opis) {
    const log = this.get('audit-log', []);
    log.unshift({
      ts: new Date().toISOString(),
      entity, action, id, opis
    });
    // Obdrži zadnjih 500
    this.set('audit-log', log.slice(0, 500));
  },

  getAudit(entity = null, id = null) {
    let log = this.get('audit-log', []);
    if (entity) log = log.filter(x => x.entity === entity);
    if (id) log = log.filter(x => x.id === id);
    return log;
  }
};
