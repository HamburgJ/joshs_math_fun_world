// ============================================================
//  AudioManager — Josh's Math Fun World
//  Sample-based audio with procedural accents.
//  Real sounds for a real fun world. — Shell Bingby
//  All samples CC0 from Freesound.org (see assets/audio/CREDITS.md)
// ============================================================

const AUDIO_BASE = 'assets/audio/';

const SAMPLE_MANIFEST = {
  // ambience loops
  'amb-field':   'ambience/field.mp3',
  'amb-birds':   'ambience/birds.mp3',
  'amb-ocean':   'ambience/ocean.mp3',
  'amb-stream':  'ambience/stream.mp3',
  'amb-cave':    'ambience/cave.mp3',
  'amb-wind':    'ambience/wind.mp3',
  'amb-hum':     'ambience/hum.mp3',
  'amb-woods':   'ambience/woods.mp3',
  'amb-beach':   'ambience/beach.mp3',
  // sfx one-shots
  'sfx-footstep-grass': 'sfx/footstep-grass.mp3',
  'sfx-footstep-stone': 'sfx/footstep-stone.mp3',
  'sfx-jump':           'sfx/jump.mp3',
  'sfx-land':           'sfx/land.mp3',
  'sfx-interact':       'sfx/interact.mp3',
  'sfx-secret':         'sfx/secret.mp3',
  'sfx-bounce':         'sfx/bounce.mp3',
  // music
  'mus-main-theme':     'music/main-theme.mp3',
};

// Zone → sample layers: each entry is { key, vol }
const ZONE_CONFIGS = {
  green_field:         [{ key: 'amb-field', vol: 0.7 }, { key: 'amb-birds', vol: 0.4 }],
  wireframe_void:      [{ key: 'amb-hum', vol: 0.6 }],
  coordinate_plane:    [{ key: 'amb-wind', vol: 0.35 }],
  non_euclidean:       [{ key: 'amb-cave', vol: 0.4 }],
  fractal_boundary:    [{ key: 'amb-woods', vol: 0.35 }],
  number_caverns:      [{ key: 'amb-cave', vol: 0.7 }],
};

class AudioManager {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._ambienceGain = null;
    this._effectsGain = null;
    this._masterVolume = 0.5;
    this._muted = false;
    this._currentZone = null;
    this._currentAmbience = null;   // { sources, rootGain, stop }
    this._currentMusic = null;      // { source, rootGain, stop }
    this._fadingOut = null;
    this._buffers = {};             // sample key → AudioBuffer
    this._loadingPromise = null;
    this._lastFootstepTime = 0;     // cooldown guard for footsteps
  }

  // ---- lifecycle --------------------------------------------------

  init() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._ctx.state === 'suspended') this._ctx.resume();

    this._master = this._ctx.createGain();
    this._master.gain.value = this._muted ? 0 : this._masterVolume;
    this._master.connect(this._ctx.destination);

    this._ambienceGain = this._ctx.createGain();
    this._ambienceGain.gain.value = 0.55;
    this._ambienceGain.connect(this._master);

    this._musicGain = this._ctx.createGain();
    this._musicGain.gain.value = 0.4; // a bit lower because it's BGM
    this._musicGain.connect(this._master);

    this._effectsGain = this._ctx.createGain();
    this._effectsGain.gain.value = 0.8;
    this._effectsGain.connect(this._master);

    // start loading samples immediately
    this._loadingPromise = this._loadAllSamples();
  }

  isEnabled() { return this._ctx !== null && this._ctx.state === 'running'; }

  setMasterVolume(v) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (this._master && !this._muted) this._master.gain.value = this._masterVolume;
  }
  getMasterVolume() { return this._masterVolume; }

  mute()   { this._muted = true;  if (this._master) this._master.gain.value = 0; }
  unmute() { this._muted = false; if (this._master) this._master.gain.value = this._masterVolume; }
  toggleMute() { this._muted ? this.unmute() : this.mute(); }

  // ---- sample loading ---------------------------------------------

  async _loadAllSamples() {
    const entries = Object.entries(SAMPLE_MANIFEST);
    await Promise.allSettled(
      entries.map(async ([key, path]) => {
        try {
          const resp = await fetch(AUDIO_BASE + path);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const arrayBuf = await resp.arrayBuffer();
          const audioBuf = await this._ctx.decodeAudioData(arrayBuf);
          this._buffers[key] = audioBuf;
        } catch (e) {
          console.warn(`[AudioManager] Failed to load ${key}: ${e.message}`);
        }
      })
    );
    const loaded = Object.keys(this._buffers).length;
    console.log(`[AudioManager] Loaded ${loaded}/${entries.length} samples`);
  }

  _hasSample(key) {
    return !!this._buffers[key];
  }

  // ---- helpers ----------------------------------------------------

  _now() { return this._ctx.currentTime; }

  _gain(v = 1) {
    const g = this._ctx.createGain();
    g.gain.value = v;
    return g;
  }

  _osc(type, freq) {
    const o = this._ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    return o;
  }

  _filter(type, freq, Q = 1) {
    const f = this._ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = Q;
    return f;
  }

  _createWhiteNoise(duration) {
    const sr = this._ctx.sampleRate;
    const len = sr * duration;
    const buf = this._ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _noiseSrc(dur, loop = true) {
    const src = this._ctx.createBufferSource();
    src.buffer = this._createWhiteNoise(dur);
    src.loop = loop;
    return src;
  }

  /** Play a loaded sample buffer as a looping source */
  _loopSample(key, gainVal, destination) {
    if (!this._buffers[key]) return null;
    const src = this._ctx.createBufferSource();
    src.buffer = this._buffers[key];
    src.loop = true;
    const g = this._gain(gainVal);
    src.connect(g);
    g.connect(destination);
    src.start();
    return { source: src, gain: g };
  }

  /** Play a loaded sample buffer once (one-shot) */
  _playSampleOnce(key, gainVal, playbackRate = 1) {
    if (!this._buffers[key]) return null;
    const src = this._ctx.createBufferSource();
    src.buffer = this._buffers[key];
    src.playbackRate.value = playbackRate;
    const g = this._gain(gainVal);
    src.connect(g);
    g.connect(this._effectsGain);
    src.start();
    return src;
  }

  // ---- zone ambience ----------------------------------------------

  setZoneAmbience(zoneName) {
    if (!this._ctx) return;
    if (zoneName === this._currentZone) return;
    this._currentZone = zoneName;

    // fade out old
    if (this._currentAmbience) {
      const old = this._currentAmbience;
      const t = this._now();
      if (old.rootGain) {
        old.rootGain.gain.setValueAtTime(old.rootGain.gain.value, t);
        old.rootGain.gain.linearRampToValueAtTime(0, t + 2);
      }
      setTimeout(() => old.stop(), 2200);
      this._fadingOut = old;
    }

    const config = ZONE_CONFIGS[zoneName];
    if (!config) return;

    const root = this._gain(0);
    root.connect(this._ambienceGain);
    const sources = [];
    const intervals = [];

    // create looping sample layers from config
    for (const layer of config) {
      const result = this._loopSample(layer.key, layer.vol, root);
      if (result) sources.push(result);
    }

    // add procedural accents for specific zones
    this._addZoneAccents(zoneName, root, sources, intervals);

    const amb = {
      sources,
      rootGain: root,
      stop: () => {
        for (const s of sources) {
          try { s.source.stop(); } catch (_) {}
        }
        for (const iv of intervals) clearInterval(iv);
        root.disconnect();
      }
    };

    this._currentAmbience = amb;

    // fade in
    root.gain.setValueAtTime(0, this._now());
    root.gain.linearRampToValueAtTime(1, this._now() + 2);
  }

  /** Add procedural/synthetic accents on top of sample layers */
  _addZoneAccents(zone, root, sources, intervals) {
    if (zone === 'wireframe_void') {
      // subtle pulsing high tone on top of the hum sample
      const hi = this._osc('sine', 880);
      const hg = this._gain(0);
      const lfo = this._ctx.createOscillator();
      const lfoGain = this._ctx.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 0.15;
      lfoGain.gain.value = 0.025;
      lfo.connect(lfoGain); lfoGain.connect(hg.gain);
      hg.gain.value = 0;
      hi.connect(hg); hg.connect(root);
      hi.start(); lfo.start();
      sources.push({ source: hi, gain: hg }, { source: lfo, gain: lfoGain });
    }

    if (zone === 'non_euclidean') {
      // dissonant detuned sine pair for unease
      const o1 = this._osc('sine', 150);
      const g1 = this._gain(0.04);
      o1.connect(g1); g1.connect(root); o1.start();

      const o2 = this._osc('sine', 150 * Math.SQRT2); // tritone
      const g2 = this._gain(0.03);
      o2.connect(g2); g2.connect(root); o2.start();

      sources.push({ source: o1, gain: g1 }, { source: o2, gain: g2 });
    }

    if (zone === 'coordinate_plane') {
      // quiet math-interval chord
      [261.63, 329.63, 392].forEach(f => {
        const o = this._osc('sine', f);
        const g = this._gain(0.018);
        o.connect(g); g.connect(root); o.start();
        sources.push({ source: o, gain: g });
      });
    }

    if (zone === 'fractal_boundary') {
      // self-similar harmonics
      const base = 110;
      for (let i = 0; i < 4; i++) {
        const f = base * Math.pow(2, i * 0.618);
        const o = this._osc('sine', f);
        const g = this._gain(0.025 / (i + 1));
        o.connect(g); g.connect(root); o.start();
        sources.push({ source: o, gain: g });
      }
    }
  }

  // ---- sound effects ----------------------------------------------

  // ---- music ------------------------------------------------------

  async playMusic(key, volume = 0.5) {
      if (!this._ctx) return;
      // Wait for samples to finish loading before attempting playback
      if (this._loadingPromise) await this._loadingPromise;
      if (this._currentMusic) {
        try { this._currentMusic.source.stop(); } catch (_) {}
      }
      this._currentMusic = this._loopSample(key, volume, this._musicGain);
      if (this._currentMusic) {
        console.log(`[AudioManager] Music playing: ${key}`);
      } else {
        console.warn(`[AudioManager] Music sample not found: ${key}`);
      }
  }

  stopMusic() {
    if (this._currentMusic) {
      if (this._ctx) {
        const old = this._currentMusic;
        const t = this._now();
        if (old.gain) {
          old.gain.gain.setValueAtTime(old.gain.gain.value, t);
          old.gain.gain.linearRampToValueAtTime(0, t + 1);
        }
        setTimeout(() => {
          try { old.source.stop(); } catch (_) {}
          old.gain.disconnect();
        }, 1100);
      } else {
        try { this._currentMusic.source.stop(); } catch (_) {}
      }
      this._currentMusic = null;
    }
  }

  isMusicPlaying() {
    return this._currentMusic !== null;
  }

  // ---- interactions and events ------------------------------------

  playFootstep(surface = 'grass') {
    if (!this._ctx) return;

    // Cooldown guard — prevent overlapping/rapid-fire footstep sounds
    const now = performance.now();
    const MIN_FOOTSTEP_MS = 180; // minimum ms between footstep sounds
    if (now - this._lastFootstepTime < MIN_FOOTSTEP_MS) return;
    this._lastFootstepTime = now;

    // sample-based footsteps
    if (surface === 'grass' && this._hasSample('sfx-footstep-grass')) {
      const rate = 0.9 + Math.random() * 0.2; // slight variation
      this._playSampleOnce('sfx-footstep-grass', 0.25, rate);
      return;
    }
    if (surface === 'stone' && this._hasSample('sfx-footstep-stone')) {
      const rate = 0.9 + Math.random() * 0.2;
      this._playSampleOnce('sfx-footstep-stone', 0.30, rate);
      return;
    }

    // fallback: procedural for unknown surfaces
    const t = this._now();
    const n = this._noiseSrc(0.1, false);
    const g = this._gain(0);
    const f = this._filter('bandpass', 400, 1);
    const profiles = {
      grass:  { freq: 300,  Q: 0.5, vol: 0.08, dur: 0.06 },
      stone:  { freq: 1200, Q: 2,   vol: 0.12, dur: 0.04 },
      metal:  { freq: 2500, Q: 5,   vol: 0.10, dur: 0.03 },
      void:   { freq: 100,  Q: 0.3, vol: 0.04, dur: 0.08 },
    };
    const p = profiles[surface] || profiles.grass;
    f.frequency.value = p.freq; f.Q.value = p.Q;
    g.gain.setValueAtTime(p.vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + p.dur);
    n.connect(f); f.connect(g); g.connect(this._effectsGain);
    n.start(t); n.stop(t + p.dur + 0.01);
  }

  playInteract() {
    if (!this._ctx) return;
    if (this._hasSample('sfx-interact')) {
      this._playSampleOnce('sfx-interact', 0.4);
      return;
    }
    // fallback
    const t = this._now();
    [523.25, 659.25].forEach((freq, i) => {
      const o = this._osc('sine', freq);
      const g = this._gain(0);
      const offset = i * 0.08;
      g.gain.setValueAtTime(0.1, t + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);
      o.connect(g); g.connect(this._effectsGain);
      o.start(t + offset); o.stop(t + offset + 0.15);
    });
  }

  playJump() {
    if (!this._ctx) return;
    if (this._hasSample('sfx-jump')) {
      this._playSampleOnce('sfx-jump', 0.5, 1.0 + Math.random() * 0.15);
      return;
    }
    // fallback
    const t = this._now();
    const o = this._osc('sine', 200);
    const g = this._gain(0.1);
    o.frequency.linearRampToValueAtTime(600, t + 0.15);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(this._effectsGain);
    o.start(t); o.stop(t + 0.25);
  }

  playLand() {
    if (!this._ctx) return;
    if (this._hasSample('sfx-land')) {
      this._playSampleOnce('sfx-land', 0.4);
      return;
    }
    // fallback
    const t = this._now();
    const n = this._noiseSrc(0.15, false);
    const f = this._filter('lowpass', 200, 1);
    const g = this._gain(0);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(f); f.connect(g); g.connect(this._effectsGain);
    n.start(t); n.stop(t + 0.15);
  }

  playShiftGlitch() {
    if (!this._ctx) return;
    // glitch stays procedural — it's supposed to sound synthetic
    const t = this._now();
    for (let i = 0; i < 6; i++) {
      const o = this._osc('sawtooth', 100 + Math.random() * 4000);
      const g = this._gain(0);
      const start = t + i * 0.033;
      g.gain.setValueAtTime(0.06, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.03);
      o.connect(g); g.connect(this._effectsGain);
      o.start(start); o.stop(start + 0.035);
    }
  }

  playTransition(type = 'crossfade') {
    if (!this._ctx) return;
    const t = this._now();

    if (type === 'crossfade') {
      // gentle whoosh via bounce sample + sine
      if (this._hasSample('sfx-bounce')) {
        this._playSampleOnce('sfx-bounce', 0.15, 0.5);
      }
      const o = this._osc('sine', 300);
      const g = this._gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.3);
      g.gain.linearRampToValueAtTime(0, t + 0.6);
      o.connect(g); g.connect(this._effectsGain);
      o.start(t); o.stop(t + 0.65);
    } else if (type === 'glitch') {
      const n = this._noiseSrc(0.2, false);
      const g = this._gain(0);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      n.connect(g); g.connect(this._effectsGain);
      n.start(t); n.stop(t + 0.2);
    } else if (type === 'morph') {
      const o = this._osc('sine', 400);
      const g = this._gain(0.07);
      o.frequency.linearRampToValueAtTime(100, t + 0.4);
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g); g.connect(this._effectsGain);
      o.start(t); o.stop(t + 0.5);
    }
  }

  playSecretFound() {
    if (!this._ctx) return;
    if (this._hasSample('sfx-secret')) {
      this._playSampleOnce('sfx-secret', 0.5);
      return;
    }
    // fallback: C - E - G - C arpeggio
    const t = this._now();
    [261.63, 329.63, 392, 523.25].forEach((freq, i) => {
      const o = this._osc('sine', freq);
      const g = this._gain(0);
      const start = t + i * 0.12;
      g.gain.setValueAtTime(0.1, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      o.connect(g); g.connect(this._effectsGain);
      o.start(start); o.stop(start + 0.25);
    });
  }

  /**
   * Play a satisfying "discovery" chime — ascending two-note sparkle.
   * Distinct from playSecretFound (shorter, snappier, more frequent).
   */
  playDiscovery() {
    if (!this._ctx) return;
    const t = this._now();
    // E5 → G5 quick sparkle with harmonics
    const notes = [659.25, 783.99];
    notes.forEach((freq, i) => {
      const o = this._osc('sine', freq);
      const o2 = this._osc('sine', freq * 2); // octave harmonic
      const g = this._gain(0);
      const g2 = this._gain(0);
      const start = t + i * 0.07;
      g.gain.setValueAtTime(0.12, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      g2.gain.setValueAtTime(0.04, start);
      g2.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      o.connect(g);  g.connect(this._effectsGain);
      o2.connect(g2); g2.connect(this._effectsGain);
      o.start(start);  o.stop(start + 0.22);
      o2.start(start); o2.stop(start + 0.15);
    });
  }

  /**
   * Play a triumphant zone-complete fanfare — ascending C major arpeggio.
   */
  playZoneComplete() {
    if (!this._ctx) return;
    const t = this._now();
    // C5 → E5 → G5 → C6 with sustain
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = this._osc('sine', freq);
      const g = this._gain(0);
      const start = t + i * 0.1;
      g.gain.setValueAtTime(0.12, start);
      g.gain.linearRampToValueAtTime(0.08, start + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      o.connect(g); g.connect(this._effectsGain);
      o.start(start); o.stop(start + 0.55);
    });
  }
}

export { AudioManager };
