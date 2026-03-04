const fs = require('fs');
let code = fs.readFileSync('js/audio/audio-manager.js', 'utf8');

// 1. Refactor _loadAllSamples
const loadMatch = /async _loadAllSamples\(\) \{[\s\S]*?console\.log\(`\[AudioManager\] Loaded \$\{loaded\}\/\$\{entries\.length\} samples`\);\n    \}/;

const newLoad = `async _loadAllSamples() {
    const entries = Object.entries(SAMPLE_MANIFEST);
    await Promise.allSettled(
      entries.map(async ([key, path]) => {
        try {
          if (key.startsWith('amb-') || key.startsWith('mus-')) {
            const audioEl = new Audio(AUDIO_BASE + path);
            audioEl.crossOrigin = 'anonymous';
            audioEl.loop = true;
            this._buffers[key] = { isStream: true, element: audioEl };
          } else {
            const resp = await fetch(AUDIO_BASE + path);
            if (!resp.ok) throw new Error(\`HTTP \${resp.status}\`);
            const arrayBuf = await resp.arrayBuffer();
            const audioBuf = await this._ctx.decodeAudioData(arrayBuf);
            this._buffers[key] = audioBuf;
          }
        } catch (e) {
          console.warn(\`[AudioManager] Failed to load \${key}: \${e.message}\`);
        }
      })
    );
    const loaded = Object.keys(this._buffers).length;
    console.log(\`[AudioManager] Loaded \${loaded}/\${entries.length} samples (some streamed)\`);
  }`;

code = code.replace(loadMatch, newLoad);

// 2. Refactor _playLoop
// Wait, I need to know exactly how _playLoop looks first. Let me just replace the body of _playLoop.
// I will use regex.
const playLoopMatch = /_playLoop\(key, gainVal, destination\) \{[\s\S]*?return \{ source: src, gain: g \};\n    \}/;
const newPlayLoop = `_playLoop(key, gainVal, destination) {
      if (!this._buffers[key]) return null;
      const b = this._buffers[key];
      const g = this._gain(gainVal);
      g.connect(destination);

      if (b.isStream) {
        let el;
        // reuse element if possible or clone
        if (b.element.paused) el = b.element;
        else {
             el = new Audio(b.element.src);
             el.crossOrigin = 'anonymous';
        }
        el.loop = true;
        const src = this._ctx.createMediaElementSource(el);
        src.connect(g);
        // browsers block play without interaction, but audio ctx is running so maybe ok
        el.play().catch(e=>console.warn('Audio play blocked:', e));
        return { source: { stop: () => { el.pause(); el.currentTime=0; } }, gain: g };
      } else {
        const src = this._ctx.createBufferSource();
        src.buffer = b;
        src.loop = true;
        src.connect(g);
        src.start();
        return { source: src, gain: g };
      }
    }`;

code = code.replace(playLoopMatch, newPlayLoop);

// Also update _hasSample to check both
code = code.replace(/_hasSample\(key\) \{\n\s+return !!this\._buffers\[key\];\n\s+\}/, `_hasSample(key) { return !!this._buffers[key]; }`);

// Also music
code = code.replace(/playMusic\(key, volume = 0\.5\) \{[\s\S]*?\n\s+\}/, `playMusic(key, volume = 0.5) {
      if (!this._ctx) return;
      if (this._currentMusic) {
        this._currentMusic.source.stop();
      }
      this._currentMusic = this._playLoop(key, volume, this._musicGain);
    }`);

fs.writeFileSync('js/audio/audio-manager.js', code, 'utf8');
