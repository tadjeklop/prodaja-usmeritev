// Branje na glas s slovenskim glasom (Speech Synthesis API).
// Avtomatsko doda gumbe „🔊 Beri" na vse .script-block elemente.
// Plavajoči player na dnu z nadzorom.

const Speech = {
  voice: null,
  voices: [],
  utterance: null,
  queue: [],
  queueIdx: 0,
  status: 'idle', // 'idle' | 'speaking' | 'paused'
  hitrost: 1.0,
  jezik: 'sl-SI',
  activeBlock: null,

  init() {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis ni podprt v tem brskalniku.');
      return;
    }

    const load = () => {
      this.voices = speechSynthesis.getVoices();
      this.findBestVoice();
      this.renderPlayer();
    };

    speechSynthesis.onvoiceschanged = load;
    load();

    // Naloži preference
    const saved = Storage.get('speech-prefs', {});
    if (saved.hitrost) this.hitrost = saved.hitrost;
    if (saved.voiceURI) {
      const v = this.voices.find(x => x.voiceURI === saved.voiceURI);
      if (v) this.voice = v;
    }

    this.injectPlayer();
  },

  findBestVoice() {
    if (!this.voices.length) return;
    if (this.voice && this.voices.find(v => v.voiceURI === this.voice.voiceURI)) return;
    this.voice =
      this.voices.find(v => v.lang === 'sl-SI') ||
      this.voices.find(v => v.lang.startsWith('sl')) ||
      this.voices.find(v => v.lang.startsWith('hr')) ||
      this.voices.find(v => v.lang.startsWith('sr')) ||
      this.voices[0] ||
      null;
  },

  // Najdi najboljši glas za dani jezik (npr. 'hr-HR', 'sr-RS', 'sl-SI')
  findVoiceFor(lang) {
    if (!lang || !this.voices.length) return this.voice;
    const lang2 = lang.split('-')[0];
    // Posebnost: srbski glas pogosto ni nameščen; hrvaški zveni dovolj blizu (sr→hr fallback)
    return this.voices.find(v => v.lang === lang) ||
           this.voices.find(v => v.lang.startsWith(lang2)) ||
           (lang2 === 'sr' ? this.voices.find(v => v.lang.startsWith('hr')) : null) ||
           this.voice;
  },

  cleanText(text) {
    // Odstrani HTML, normaliziraj
    const div = document.createElement('div');
    div.innerHTML = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6])>/gi, '$&\n');
    let clean = div.textContent || div.innerText || '';
    clean = clean.replace(/\[ime stranke\]|\[vaše ime\]|\[ime\]|\[datum\]|\[obseg\]|\[konkreten korak[^\]]*\]/gi, '');
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
  },

  speakOne(item, onEnd) {
    speechSynthesis.cancel();
    // item je lahko string (samo tekst) ali objekt {text, lang}
    const text = typeof item === 'string' ? item : item.text;
    const lang = typeof item === 'object' ? item.lang : null;
    const voice = lang ? this.findVoiceFor(lang) : this.voice;
    const u = new SpeechSynthesisUtterance(this.cleanText(text));
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : (lang || this.jezik);
    u.rate = this.hitrost;
    u.pitch = 1.0;
    u.volume = 1.0;
    u.onend = () => {
      if (onEnd) onEnd();
      else this.finish();
    };
    u.onerror = (e) => {
      console.warn('Speech error:', e);
      this.finish();
    };
    this.utterance = u;
    this.status = 'speaking';
    this.updatePlayer();
    speechSynthesis.speak(u);
  },

  speakBlock(block) {
    this.unhighlight();
    this.activeBlock = block;
    if (block) block.classList.add('speech-active');
    const text = block ? (block.dataset.speakText || block.innerText) : '';
    const lang = block ? block.dataset.speechLang : null;
    this.queue = [{ text, lang }];
    this.queueIdx = 0;
    this.runQueue();
  },

  // texts je lahko array stringov ali array objektov {text, lang}
  speakSequence(texts, opts = {}) {
    this.unhighlight();
    this.activeBlock = null;
    this.queue = texts.filter(Boolean);
    this.queueIdx = 0;
    this.queueLabel = opts.label || '';
    this.runQueue();
  },

  runQueue() {
    if (this.queueIdx >= this.queue.length) {
      this.finish();
      return;
    }
    const item = this.queue[this.queueIdx];
    this.speakOne(item, () => {
      this.queueIdx++;
      if (this.queueIdx < this.queue.length) {
        this.runQueue();
      } else {
        this.finish();
      }
    });
  },

  pause() {
    if (this.status === 'speaking') {
      speechSynthesis.pause();
      this.status = 'paused';
      this.updatePlayer();
    }
  },

  resume() {
    if (this.status === 'paused') {
      speechSynthesis.resume();
      this.status = 'speaking';
      this.updatePlayer();
    }
  },

  stop() {
    speechSynthesis.cancel();
    this.finish();
  },

  finish() {
    this.status = 'idle';
    this.queue = [];
    this.queueIdx = 0;
    this.unhighlight();
    this.activeBlock = null;
    this.updatePlayer();
  },

  unhighlight() {
    document.querySelectorAll('.speech-active').forEach(el => el.classList.remove('speech-active'));
  },

  setRate(r) {
    this.hitrost = r;
    Storage.set('speech-prefs', { hitrost: this.hitrost, voiceURI: this.voice?.voiceURI });
    // Če trenutno teče, ponovno zaženi z novo hitrostjo
    if (this.status !== 'idle' && this.queue.length) {
      const oldIdx = this.queueIdx;
      speechSynthesis.cancel();
      this.queueIdx = oldIdx;
      this.runQueue();
    }
  },

  setVoice(voiceURI) {
    const v = this.voices.find(x => x.voiceURI === voiceURI);
    if (v) {
      this.voice = v;
      Storage.set('speech-prefs', { hitrost: this.hitrost, voiceURI });
      this.updatePlayer();
    }
  },

  injectPlayer() {
    if (document.getElementById('speech-player')) return;
    const div = document.createElement('div');
    div.id = 'speech-player';
    div.className = 'speech-player';
    document.body.appendChild(div);
    this.renderPlayer();
  },

  renderPlayer() {
    const slot = document.getElementById('speech-player');
    if (!slot) return;

    const hasVoice = !!this.voice;
    const isSlovenian = this.voice && this.voice.lang.startsWith('sl');

    const voiceOpts = this.voices
      .filter(v => /^(sl|hr|sr|cs|sk)/.test(v.lang))
      .map(v => `<option value="${v.voiceURI}" ${this.voice?.voiceURI === v.voiceURI ? 'selected' : ''}>${v.name} (${v.lang})</option>`)
      .join('');

    slot.innerHTML = `
      <div class="speech-player-inner ${this.status === 'idle' ? 'compact' : ''}">
        <div class="speech-controls">
          ${this.status === 'speaking' ? `<button class="speech-btn" onclick="Speech.pause()" title="Pavza">⏸</button>` : ''}
          ${this.status === 'paused' ? `<button class="speech-btn" onclick="Speech.resume()" title="Nadaljuj">▶</button>` : ''}
          ${this.status !== 'idle' ? `<button class="speech-btn" onclick="Speech.stop()" title="Ustavi">⏹</button>` : ''}
          <button class="speech-btn speech-settings-btn" onclick="document.getElementById('speech-settings').classList.toggle('hidden')" title="Nastavitve">⚙</button>
        </div>
        ${this.status !== 'idle' && this.queue.length > 1 ? `<div class="speech-progress">${this.queueIdx + 1} / ${this.queue.length}</div>` : ''}
        ${this.status === 'idle' && !hasVoice ? `<div class="speech-warning">Brez glasu</div>` : ''}
        ${this.status === 'idle' && hasVoice && !isSlovenian ? `<div class="speech-warning" title="Nameščen ni slovenski glas, uporabljam ${this.voice.lang}">⚠ ${this.voice.lang}</div>` : ''}
        <div id="speech-settings" class="speech-settings hidden">
          <div class="speech-settings-row">
            <label>Glas:</label>
            ${voiceOpts ? `<select onchange="Speech.setVoice(this.value)">${voiceOpts}</select>` : '<span class="text-stone-500">Brez slovanskih glasov.</span>'}
          </div>
          <div class="speech-settings-row">
            <label>Hitrost: <span id="rate-val">${this.hitrost.toFixed(1)}x</span></label>
            <input type="range" min="0.5" max="2" step="0.1" value="${this.hitrost}" oninput="document.getElementById('rate-val').textContent = parseFloat(this.value).toFixed(1)+'x'; Speech.setRate(parseFloat(this.value))" />
          </div>
          ${!isSlovenian ? `
            <div class="speech-help">
              Slovenski glas ni nameščen. Za boljšo izkušnjo namesti slovenski glas v sistemskih nastavitvah:
              <ul style="list-style: disc; padding-left: 1rem; margin-top: 0.25rem">
                <li><strong>Windows</strong>: Settings → Time & Language → Speech → Add voices → izberi „Slovenian"</li>
                <li><strong>macOS</strong>: System Settings → Accessibility → Spoken Content → System Voice → Manage Voices → Slovenian</li>
                <li><strong>Chrome/Edge</strong>: lahko ponudi cloud glasove, ki ne potrebujejo namestitve</li>
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  updatePlayer() {
    this.renderPlayer();
  },

  // Doda 🔊 gumb pred copy gumb znotraj .script-block elementov
  attachReadButtons(root = document) {
    root.querySelectorAll('.script-block').forEach(block => {
      if (block._readWired) return;
      block._readWired = true;
      const btn = document.createElement('button');
      btn.className = 'speech-read-btn';
      btn.textContent = '🔊 Beri';
      btn.title = 'Preberi na glas';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        Speech.speakBlock(block);
      });
      // Postavi pred copy-btn, če obstaja
      const copyBtn = block.querySelector('.copy-btn');
      if (copyBtn) {
        block.insertBefore(btn, copyBtn);
      } else {
        block.appendChild(btn);
      }
    });
  }
};

// CSS za player + active blok
(function injectSpeechCSS() {
  const css = `
    .speech-player {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 200;
    }
    .speech-player-inner {
      background: white;
      border: 1px solid #d6d3d1;
      border-radius: 9999px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      padding: 0.375rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .speech-player-inner.compact { padding: 0.25rem 0.5rem; opacity: 0.7; }
    .speech-player-inner.compact:hover { opacity: 1; }
    .speech-controls { display: flex; gap: 0.25rem; }
    .speech-btn {
      width: 2rem; height: 2rem;
      border-radius: 9999px;
      border: 1px solid #d6d3d1;
      background: #f5f5f4;
      cursor: pointer;
      font-size: 0.875rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .speech-btn:hover { background: #e8f5e9; border-color: #2e7d32; }
    .speech-settings-btn { font-size: 1rem; }
    .speech-progress {
      font-size: 0.75rem;
      color: #57534e;
      padding: 0 0.5rem;
      border-left: 1px solid #e7e5e4;
    }
    .speech-warning {
      font-size: 0.7rem;
      color: #92400e;
      background: #fef3c7;
      padding: 0.125rem 0.375rem;
      border-radius: 9999px;
    }
    .speech-settings {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 0.5rem;
      background: white;
      border: 1px solid #d6d3d1;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      padding: 0.75rem 1rem;
      min-width: 280px;
      font-size: 0.875rem;
    }
    .speech-settings.hidden { display: none; }
    .speech-settings-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.375rem 0;
    }
    .speech-settings-row label { font-weight: 600; min-width: 4rem; font-size: 0.8rem; }
    .speech-settings-row select, .speech-settings-row input { flex: 1; padding: 0.25rem; border: 1px solid #d6d3d1; border-radius: 0.25rem; font-size: 0.85rem; }
    .speech-help { font-size: 0.75rem; color: #57534e; padding-top: 0.5rem; margin-top: 0.5rem; border-top: 1px solid #e7e5e4; }
    .speech-read-btn {
      position: absolute;
      top: 0.5rem;
      right: 4.5rem;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: white;
      border: 1px solid #d6d3d1;
      border-radius: 0.375rem;
      cursor: pointer;
      color: #57534e;
    }
    .speech-read-btn:hover { background: #e8f5e9; border-color: #2e7d32; color: #1b5e20; }
    .script-block.speech-active {
      background: #ecfdf5 !important;
      border-color: #2e7d32 !important;
      box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.2);
    }
    .speech-bulk-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: white;
      border: 1px solid #d6d3d1;
      border-radius: 9999px;
      cursor: pointer;
      font-size: 0.875rem;
      color: #1b5e20;
      font-weight: 500;
    }
    .speech-bulk-btn:hover { background: #e8f5e9; border-color: #2e7d32; }
    @media print {
      .speech-player, .speech-read-btn, .speech-bulk-btn { display: none !important; }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// Init takoj ali na DOMContentLoaded — speech.js se naloži dinamično, zato lahko DOMContentLoaded
// ze mine, preden je ta koda izvedena. Preverimo readyState.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Speech.init());
} else {
  Speech.init();
}
