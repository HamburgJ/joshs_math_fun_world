/**
 * SettingsMenu — Retro-styled settings panel for Josh's Math Fun World
 * Looks like a 90s game options menu pulled straight from a CRT terminal.
 * All inline styles, no external CSS needed. Pure vanilla JS.
 */

const DEFAULTS = {
  renderScale:   1.0,
  masterVolume:  0.7,
  musicVolume:   0.5,
  sfxVolume:     0.8,
  crtScanlines:  false,
  dithering:     true,
  reducedMotion: false,
  highContrast:  false,
  showFps:       false,
  touchControls: 'auto',
};

const STORAGE_KEY = 'jmfw_settings';

const GREEN  = '#00FF41';
const DIM    = '#009926';
const BLACK  = '#000000';
const WHITE  = '#EAEAEA';
const RED    = '#FF4136';
const OVERLAY_BG = 'rgba(0,0,0,0.85)';

/* ── tiny helpers ─────────────────────────────────────────────── */

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  );
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function pct(v) {
  return `${Math.round(v * 100)}%`;
}

/* ── inline-CSS helper (returns style string) ─────────────────── */

const baseFont = `font-family:'Courier New',monospace;`;

function css(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${v}`)
    .join(';') + ';';
}

/* ═══════════════════════════════════════════════════════════════ */

class SettingsMenu {

  /* ── lifecycle ─────────────────────────────────────────────── */

  constructor() {
    /** @type {Record<string,any>} */
    this._settings = { ...DEFAULTS };

    /** callbacks */
    this.onOpen   = null;
    this.onClose  = null;
    this.onChange  = null;   // (key, value) => void

    this._visible = false;
    this._load();
    this._resolveAuto();
    this._buildDOM();
    this._attachGlobalKeys();
  }

  /* ── public API ────────────────────────────────────────────── */

  open() {
    if (this._visible) return;
    this._visible = true;
    this._overlay.style.display = 'flex';
    if (typeof this.onOpen === 'function') this.onOpen();
  }

  close() {
    if (!this._visible) return;
    this._visible = false;
    this._overlay.style.display = 'none';
    if (typeof this.onClose === 'function') this.onClose();
  }

  toggle() {
    this._visible ? this.close() : this.open();
  }

  isOpen() {
    return this._visible;
  }

  getSetting(key) {
    return this._settings[key];
  }

  setSetting(key, value) {
    if (!(key in DEFAULTS)) return;
    this._settings[key] = value;
    this._save();
    this._syncControl(key);
    if (typeof this.onChange === 'function') this.onChange(key, value);
  }

  /* ── persistence ───────────────────────────────────────────── */

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const k of Object.keys(DEFAULTS)) {
          if (k in parsed) this._settings[k] = parsed[k];
        }
      }
    } catch { /* corrupt data — keep defaults */ }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
    } catch { /* storage full — oh well */ }
  }

  _resolveAuto() {
    if (this._settings.touchControls === 'auto') {
      this._settings.touchControls = isMobile();
    }
  }

  /* ── DOM construction ──────────────────────────────────────── */

  _buildDOM() {
    /* overlay */
    const overlay = document.createElement('div');
    overlay.setAttribute('style', css({
      position:       'fixed',
      top:            '0', left: '0',
      width:          '100vw',
      height:         '100vh',
      background:     OVERLAY_BG,
      display:        'none',
      alignItems:     'center',
      justifyContent: 'center',
      zIndex:         '2000',
      padding:        '16px',
      boxSizing:      'border-box',
    }));
    this._overlay = overlay;

    /* panel */
    const panel = document.createElement('div');
    panel.setAttribute('style', css({
      background:    BLACK,
      border:        `4px double ${GREEN}`,
      padding:       '24px 32px',
      maxWidth:      '560px',
      width:         '100%',
      maxHeight:     '90vh',
      overflowY:     'auto',
      color:         GREEN,
      boxSizing:     'border-box',
      imageRendering:'pixelated',
    }) + baseFont);
    overlay.appendChild(panel);

    /* scrollbar styling — inject a tiny <style> scoped by class */
    panel.classList.add('jmfw-settings-panel');
    const scrollCSS = document.createElement('style');
    scrollCSS.textContent = `
      .jmfw-settings-panel::-webkit-scrollbar { width:8px; }
      .jmfw-settings-panel::-webkit-scrollbar-track { background:${BLACK}; }
      .jmfw-settings-panel::-webkit-scrollbar-thumb { background:${DIM}; }
      /* range input retro styling */
      .jmfw-settings-panel input[type=range] {
        -webkit-appearance:none; appearance:none;
        height:6px; background:${DIM}; outline:none; border-radius:0;
        cursor:pointer;
      }
      .jmfw-settings-panel input[type=range]::-webkit-slider-thumb {
        -webkit-appearance:none; appearance:none;
        width:14px; height:14px; background:${WHITE};
        border:2px solid ${GREEN}; cursor:pointer;
      }
      .jmfw-settings-panel input[type=range]::-moz-range-thumb {
        width:14px; height:14px; background:${WHITE};
        border:2px solid ${GREEN}; cursor:pointer; border-radius:0;
      }
    `;
    overlay.appendChild(scrollCSS);

    /* title */
    const title = document.createElement('div');
    title.textContent = '\u2699 SETTINGS';
    title.setAttribute('style', css({
      fontSize:      '22px',
      letterSpacing: '4px',
      textAlign:     'center',
      marginBottom:  '20px',
      color:         GREEN,
      textTransform: 'uppercase',
      borderBottom:  `2px solid ${DIM}`,
      paddingBottom: '10px',
    }));
    panel.appendChild(title);

    /* controls container */
    this._controls = {};

    /* ── sliders ── */
    this._addSlider(panel, 'renderScale',  'Render Scale',  0.5, 2.0, 0.1, v => `${v.toFixed(1)}x`);
    this._addSlider(panel, 'masterVolume', 'Master Volume', 0,   1,   0.01, pct);
    this._addSlider(panel, 'musicVolume',  'Music Volume',  0,   1,   0.01, pct);
    this._addSlider(panel, 'sfxVolume',    'SFX Volume',    0,   1,   0.01, pct);

    /* divider */
    panel.appendChild(this._divider());

    /* ── toggles ── */
    this._addToggle(panel, 'crtScanlines',  'CRT Scanlines');
    this._addToggle(panel, 'dithering',     'Dithering');
    this._addToggle(panel, 'reducedMotion', 'Reduced Motion');
    this._addToggle(panel, 'highContrast',  'High Contrast');
    this._addToggle(panel, 'showFps',       'Show FPS');
    this._addToggle(panel, 'touchControls', 'Touch Controls');

    /* divider */
    panel.appendChild(this._divider());

    /* ── bottom buttons ── */
    const btnRow = document.createElement('div');
    btnRow.setAttribute('style', css({
      display:        'flex',
      justifyContent: 'center',
      flexWrap:       'wrap',
      gap:            '12px',
      marginTop:      '12px',
    }));

    btnRow.appendChild(this._makeButton('[ RESET DEFAULTS ]', GREEN, () => this._resetDefaults()));
    btnRow.appendChild(this._makeButton('[ CLOSE ]', GREEN, () => this.close()));
    btnRow.appendChild(this._makeButton('[ ERASE SAVE DATA ]', RED, () => this._eraseSaveData()));

    panel.appendChild(btnRow);

    document.body.appendChild(overlay);
  }

  /* ── control builders ──────────────────────────────────────── */

  _row() {
    const row = document.createElement('div');
    row.setAttribute('style', css({
      display:       'flex',
      alignItems:    'center',
      justifyContent:'space-between',
      marginBottom:  '10px',
      gap:           '12px',
    }));
    return row;
  }

  _label(text) {
    const lbl = document.createElement('span');
    lbl.textContent = text;
    lbl.setAttribute('style', css({
      flexShrink:  '0',
      fontSize:    '14px',
      color:       GREEN,
      whiteSpace:  'nowrap',
    }) + baseFont);
    return lbl;
  }

  _divider() {
    const d = document.createElement('div');
    d.setAttribute('style', css({
      borderTop:    `1px solid ${DIM}`,
      margin:       '14px 0',
    }));
    return d;
  }

  _addSlider(parent, key, label, min, max, step, fmt) {
    const row = this._row();
    row.appendChild(this._label(label));

    const right = document.createElement('div');
    right.setAttribute('style', css({
      display:    'flex',
      alignItems: 'center',
      gap:        '8px',
      flexShrink: '0',
    }));

    const input = document.createElement('input');
    input.type  = 'range';
    input.min   = String(min);
    input.max   = String(max);
    input.step  = String(step);
    input.value = String(this._settings[key]);
    input.setAttribute('style', css({ width: '120px' }));

    const valSpan = document.createElement('span');
    valSpan.textContent = fmt(this._settings[key]);
    valSpan.setAttribute('style', css({
      width:     '48px',
      textAlign: 'right',
      fontSize:  '13px',
      color:     WHITE,
    }) + baseFont);

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      this._settings[key] = v;
      valSpan.textContent = fmt(v);
      this._save();
      if (typeof this.onChange === 'function') this.onChange(key, v);
    });

    right.appendChild(input);
    right.appendChild(valSpan);
    row.appendChild(right);
    parent.appendChild(row);

    this._controls[key] = { type: 'slider', input, valSpan, fmt };
  }

  _addToggle(parent, key, label) {
    const row = this._row();
    row.appendChild(this._label(label));

    const btn = document.createElement('button');
    const update = () => {
      const on = !!this._settings[key];
      btn.textContent = on ? '[ ON ]' : '[ OFF ]';
      btn.style.color = on ? GREEN : DIM;
    };

    btn.setAttribute('style', css({
      background:  'none',
      border:      `1px solid ${DIM}`,
      padding:     '4px 10px',
      fontSize:    '14px',
      cursor:      'pointer',
      minWidth:    '80px',
      textAlign:   'center',
      color:       GREEN,
    }) + baseFont);

    btn.addEventListener('mouseenter', () => { btn.style.borderColor = GREEN; });
    btn.addEventListener('mouseleave', () => { btn.style.borderColor = DIM; });

    btn.addEventListener('click', () => {
      this._settings[key] = !this._settings[key];
      update();
      this._save();
      if (typeof this.onChange === 'function') this.onChange(key, this._settings[key]);
    });

    update();
    row.appendChild(btn);
    parent.appendChild(row);

    this._controls[key] = { type: 'toggle', btn, update };
  }

  _makeButton(text, color, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.setAttribute('style', css({
      background:    'none',
      border:        `2px solid ${color}`,
      color:         color,
      padding:       '6px 14px',
      fontSize:      '13px',
      cursor:        'pointer',
      letterSpacing: '1px',
    }) + baseFont);

    btn.addEventListener('mouseenter', () => {
      btn.style.background = color;
      btn.style.color = BLACK;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'none';
      btn.style.color = color;
    });

    btn.addEventListener('click', onClick);
    return btn;
  }

  /* ── sync a single control to current settings value ──────── */

  _syncControl(key) {
    const ctrl = this._controls[key];
    if (!ctrl) return;
    if (ctrl.type === 'slider') {
      ctrl.input.value = String(this._settings[key]);
      ctrl.valSpan.textContent = ctrl.fmt(this._settings[key]);
    } else if (ctrl.type === 'toggle') {
      ctrl.update();
    }
  }

  /* ── actions ───────────────────────────────────────────────── */

  _resetDefaults() {
    Object.assign(this._settings, { ...DEFAULTS });
    this._resolveAuto();
    this._save();
    for (const key of Object.keys(DEFAULTS)) this._syncControl(key);
    if (typeof this.onChange === 'function') {
      for (const [k, v] of Object.entries(this._settings)) this.onChange(k, v);
    }
  }

  _eraseSaveData() {
    const answer = prompt('Are you sure? Type \'yes\' to confirm');
    if (answer && answer.trim().toLowerCase() === 'yes') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('jmfw_save');
      localStorage.removeItem('jmfw_secrets');
      this._resetDefaults();
    }
  }

  /* ── keyboard ──────────────────────────────────────────────── */

  _attachGlobalKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._visible) {
        e.preventDefault();
        this.close();
      }
    });
  }
}

export { SettingsMenu };
