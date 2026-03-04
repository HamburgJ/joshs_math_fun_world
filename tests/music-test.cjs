/**
 * Music system test — Josh's Math Fun World
 * Verifies that:
 *   1. The music MP3 file exists and is served
 *   2. AudioManager loads the music sample
 *   3. Music actually starts playing after user interaction
 *   4. isMusicPlaying() returns true
 *   5. stopMusic() stops playback
 *   6. No JS errors during the whole flow
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const jsErrors = [];
    const consoleLogs = [];
    page.on('pageerror', err => jsErrors.push(err.message));
    page.on('console', msg => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
        if (msg.type() === 'error') jsErrors.push(msg.text());
    });

    // ── 1. Check that the music file is served ────────────────────────
    const musicResp = await page.request.get('http://localhost:8080/assets/audio/music/main-theme.mp3');
    const musicFileOk = musicResp.ok();
    const musicFileSize = (await musicResp.body()).length;

    // ── 2. Load the game ──────────────────────────────────────────────
    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Click to dismiss title screen + trigger audio init
    await page.click('body');
    // Give enough time for sample loading & music playback to begin
    await page.waitForTimeout(5000);

    // ── 3. Query audio state from the game ────────────────────────────
    const audioState = await page.evaluate(() => {
        const g = window.__JMFW__;
        if (!g) return { error: 'No __JMFW__ exposed' };
        if (!g.audio) return { error: 'No audio on __JMFW__' };

        const a = g.audio;
        return {
            ctxExists: !!a._ctx,
            ctxState: a._ctx ? a._ctx.state : null,
            isEnabled: a.isEnabled(),
            hasMusicBuffer: a._hasSample('mus-main-theme'),
            musicGainExists: !!a._musicGain,
            musicGainValue: a._musicGain ? a._musicGain.gain.value : null,
            currentMusicExists: a._currentMusic !== null,
            currentMusicSourceExists: a._currentMusic ? !!a._currentMusic.source : false,
            isMusicPlaying: typeof a.isMusicPlaying === 'function' ? a.isMusicPlaying() : 'no method',
            masterVolume: a.getMasterVolume(),
            muted: a._muted,
            loadedBufferCount: Object.keys(a._buffers).length,
            loadedBufferKeys: Object.keys(a._buffers),
        };
    });

    // ── 4. Test stopMusic ─────────────────────────────────────────────
    const stopResult = await page.evaluate(() => {
        const a = window.__JMFW__?.audio;
        if (!a) return { error: 'no audio' };
        a.stopMusic();
        return {
            musicAfterStop: a.isMusicPlaying(),
        };
    });

    // Wait for fade-out
    await page.waitForTimeout(1500);

    // ── 5. Test playMusic again ───────────────────────────────────────
    const replayResult = await page.evaluate(async () => {
        const a = window.__JMFW__?.audio;
        if (!a) return { error: 'no audio' };
        await a.playMusic('mus-main-theme', 0.2);
        return {
            musicAfterReplay: a.isMusicPlaying(),
        };
    });

    // ── Output ────────────────────────────────────────────────────────
    console.log('\n=== MUSIC SYSTEM TEST ===\n');

    if (jsErrors.length > 0) {
        console.log('JS Errors:', jsErrors.length);
        jsErrors.forEach(e => console.log('  -', e.substring(0, 200)));
    } else {
        console.log('JS Errors: NONE');
    }

    // Print audio-related console logs
    const audioLogs = consoleLogs.filter(l => l.text.includes('[AudioManager]'));
    if (audioLogs.length > 0) {
        console.log('\nAudio console logs:');
        audioLogs.forEach(l => console.log(`  [${l.type}] ${l.text}`));
    }

    console.log('\nMusic file served:', musicFileOk, `(${musicFileSize} bytes)`);

    if (audioState.error) {
        console.log('ERROR:', audioState.error);
    } else {
        console.log('AudioContext exists:', audioState.ctxExists);
        console.log('AudioContext state:', audioState.ctxState);
        console.log('isEnabled():', audioState.isEnabled);
        console.log('Music buffer loaded:', audioState.hasMusicBuffer);
        console.log('Music gain node exists:', audioState.musicGainExists);
        console.log('Music gain value:', audioState.musicGainValue);
        console.log('Current music exists:', audioState.currentMusicExists);
        console.log('Current music source:', audioState.currentMusicSourceExists);
        console.log('isMusicPlaying():', audioState.isMusicPlaying);
        console.log('Master volume:', audioState.masterVolume);
        console.log('Muted:', audioState.muted);
        console.log('Loaded buffers:', audioState.loadedBufferCount, '/', audioState.loadedBufferKeys.length);
        console.log('Buffer keys:', audioState.loadedBufferKeys.join(', '));
    }

    console.log('\nstopMusic() -> isMusicPlaying:', stopResult.musicAfterStop);
    console.log('replay  -> isMusicPlaying:', replayResult.musicAfterReplay);

    // ── Assertions ────────────────────────────────────────────────────
    const passed = [];
    const failed = [];
    const check = (name, cond) => (cond ? passed : failed).push(name);

    check('No JS errors', jsErrors.length === 0);
    check('Music MP3 served (HTTP 200)', musicFileOk);
    check('Music file size > 100KB', musicFileSize > 100000);
    check('AudioContext created', audioState.ctxExists === true);
    check('AudioContext running', audioState.ctxState === 'running');
    check('isEnabled() true', audioState.isEnabled === true);
    check('mus-main-theme buffer loaded', audioState.hasMusicBuffer === true);
    check('Music gain node created', audioState.musicGainExists === true);
    check('Music is playing after init', audioState.isMusicPlaying === true);
    check('Current music source exists', audioState.currentMusicSourceExists === true);
    check('stopMusic() stops playback', stopResult.musicAfterStop === false);
    check('playMusic() replays correctly', replayResult.musicAfterReplay === true);

    console.log('\nPASSED:', passed.length);
    passed.forEach(p => console.log('  ✓', p));
    if (failed.length > 0) {
        console.log('FAILED:', failed.length);
        failed.forEach(f => console.log('  ✗', f));
    }

    console.log('\nResult:', failed.length === 0 ? 'ALL PASS' : 'SOME FAILED');

    await browser.close();
    process.exit(failed.length > 0 ? 1 : 0);
})();
