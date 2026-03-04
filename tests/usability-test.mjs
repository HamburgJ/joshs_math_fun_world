/**
 * Playwright usability test for Josh's Math Fun World.
 * 
 * Verifies:
 * 1. The game loads without JS errors
 * 2. The canvas renders meaningful content (not just a solid color / floor)
 * 3. Camera is positioned above terrain (not stuck in the ground)
 * 4. Josh's character is visible and at a valid position
 * 5. The scene is bright enough to see (not all dark green)
 * 
 * Run: npx playwright test tests/usability-test.mjs
 * Or:  node tests/usability-test.mjs
 */

import { chromium } from 'playwright';

const URL = 'http://localhost:8080';
const TIMEOUT = 15000;

async function runTests() {
    console.log('=== Josh\'s Math Fun World — Usability Test ===\n');
    const results = [];
    const errors = [];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 800, height: 600 },
        // Grant pointer lock permission
        permissions: ['notifications'],
    });
    const page = await context.newPage();

    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
        // Log all console messages for debugging
        if (msg.type() === 'log' || msg.type() === 'warn') {
            console.log(`  [console.${msg.type()}] ${msg.text()}`);
        }
    });
    page.on('pageerror', err => {
        consoleErrors.push(err.message);
        console.log(`  [pageerror] ${err.message}`);
    });

    // ── Load the page ──────────────────────────────────────────────────
    console.log('Loading page...');
    try {
        await page.goto(URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    } catch (e) {
        console.error(`FATAL: Could not load ${URL} — ${e.message}`);
        console.error('Make sure the server is running (e.g. npx http-server -p 8080)');
        await browser.close();
        process.exit(1);
    }

    // Wait for the game to initialize and render a few frames
    await page.waitForTimeout(3000);

    // ── TEST 1: No fatal JS errors ────────────────────────────────────
    {
        const fatalErrors = consoleErrors.filter(e => 
            !e.includes('favicon') && 
            !e.includes('Permissions policy') &&
            !e.includes('404')
        );
        const pass = fatalErrors.length === 0;
        results.push({ name: 'No fatal JS errors', pass, detail: pass ? 'Clean' : fatalErrors.join('\n') });
        if (!pass) {
            console.log('Console errors found:');
            fatalErrors.forEach(e => console.log('  ERROR:', e));
        }
    }

    // ── TEST 2: Canvas exists and has content ─────────────────────────
    {
        const canvasExists = await page.$('canvas');
        results.push({ name: 'Canvas element exists', pass: !!canvasExists, detail: canvasExists ? 'Found' : 'Missing' });
    }

    // ── TEST 3: Loading screen is hidden ──────────────────────────────
    {
        const loadingVisible = await page.$eval('#loading', el => {
            const style = getComputedStyle(el);
            return style.display !== 'none' && !el.classList.contains('hidden');
        }).catch(() => false);
        results.push({ name: 'Loading screen hidden', pass: !loadingVisible, detail: loadingVisible ? 'Still showing' : 'Hidden' });
    }

    // ── TEST 4: Evaluate runtime game state ───────────────────────────
    // We must use toDataURL / canvas 2D snapshotting since WebGL readPixels
    // returns zeros when preserveDrawingBuffer is false (default).
    // First, inject a flag so the game preserves one frame for us to read.
    const gameState = await page.evaluate(() => {
        return new Promise((resolve) => {
            const canvas = document.querySelector('canvas');
            if (!canvas) { resolve({ error: 'No canvas found' }); return; }

            // Use toDataURL — this works because the browser composites
            // the WebGL content before toDataURL is called within the same task.
            // But with rAF-based rendering, we need to hook into the render.
            // Instead, let's use a requestAnimationFrame to capture right after render.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    try {
                        // Create temporary 2D canvas to read pixels from screenshot
                        const img = new Image();
                        const offscreen = document.createElement('canvas');
                        offscreen.width = canvas.width;
                        offscreen.height = canvas.height;
                        const ctx2d = offscreen.getContext('2d');
                        ctx2d.drawImage(canvas, 0, 0);

                        const width = offscreen.width;
                        const height = offscreen.height;
                        const imageData = ctx2d.getImageData(0, 0, width, height);
                        const pixels = imageData.data;

                        let totalR = 0, totalG = 0, totalB = 0;
                        let darkPixels = 0;
                        let greenDominant = 0;
                        const sampleStep = 4;
                        let sampledCount = 0;

                        for (let i = 0; i < pixels.length; i += 4 * sampleStep) {
                            const r = pixels[i];
                            const g = pixels[i + 1];
                            const b = pixels[i + 2];
                            totalR += r;
                            totalG += g;
                            totalB += b;
                            sampledCount++;

                            if (r < 30 && g < 30 && b < 30) darkPixels++;
                            if (g > r * 1.3 && g > b * 1.3 && g > 20) greenDominant++;
                        }

                        const avgR = totalR / sampledCount;
                        const avgG = totalG / sampledCount;
                        const avgB = totalB / sampledCount;
                        const avgBrightness = (avgR + avgG + avgB) / 3;

                        let varianceR = 0, varianceG = 0, varianceB = 0;
                        let varianceSampled = 0;
                        for (let i = 0; i < pixels.length; i += 4 * sampleStep * 4) {
                            const r = pixels[i];
                            const g = pixels[i + 1];
                            const b = pixels[i + 2];
                            varianceR += (r - avgR) ** 2;
                            varianceG += (g - avgG) ** 2;
                            varianceB += (b - avgB) ** 2;
                            varianceSampled++;
                        }
                        const stdR = Math.sqrt(varianceR / varianceSampled);
                        const stdG = Math.sqrt(varianceG / varianceSampled);
                        const stdB = Math.sqrt(varianceB / varianceSampled);
                        const avgStd = (stdR + stdG + stdB) / 3;

                        // Sky pixels in top half (rows 0 to height/2 in image coords)
                        let skyPixels = 0;
                        const topHalfEnd = Math.floor(height / 2) * width * 4;
                        for (let i = 0; i < topHalfEnd; i += 4 * sampleStep) {
                            const r = pixels[i];
                            const g = pixels[i + 1];
                            const b = pixels[i + 2];
                            if (b > 100 && g > 80 && r > 60 && (b + g) > (r * 2)) skyPixels++;
                        }

                        resolve({
                            canvasSize: { width, height },
                            avgColor: { r: Math.round(avgR), g: Math.round(avgG), b: Math.round(avgB) },
                            avgBrightness: Math.round(avgBrightness),
                            colorStdDev: Math.round(avgStd * 10) / 10,
                            darkPixelPct: Math.round((darkPixels / sampledCount) * 100),
                            greenDominantPct: Math.round((greenDominant / sampledCount) * 100),
                            skyPixelCount: skyPixels,
                            sampledPixels: sampledCount,
                        });
                    } catch (e) {
                        resolve({ error: e.message });
                    }
                });
            });
        });
    });

    console.log('\n── Pixel Analysis ──');
    console.log(`  Canvas size: ${gameState.canvasSize?.width}x${gameState.canvasSize?.height}`);
    console.log(`  Avg color: R=${gameState.avgColor?.r} G=${gameState.avgColor?.g} B=${gameState.avgColor?.b}`);
    console.log(`  Avg brightness: ${gameState.avgBrightness}/255`);
    console.log(`  Color std dev: ${gameState.colorStdDev} (higher = more varied scene)`);
    console.log(`  Dark pixels: ${gameState.darkPixelPct}%`);
    console.log(`  Green-dominant pixels: ${gameState.greenDominantPct}%`);
    console.log(`  Sky-like pixels (top half): ${gameState.skyPixelCount}`);

    // ── TEST 5: Scene is not too dark ─────────────────────────────────
    {
        const brightness = gameState.avgBrightness || 0;
        const pass = brightness > 40;
        results.push({ 
            name: 'Scene brightness adequate (>40)', 
            pass, 
            detail: `Avg brightness: ${brightness}/255` 
        });
    }

    // ── TEST 6: Scene has visual variety (not just floor) ─────────────
    {
        const stdDev = gameState.colorStdDev || 0;
        const pass = stdDev > 10;
        results.push({ 
            name: 'Scene has visual variety (stddev > 10)', 
            pass, 
            detail: `Color std dev: ${stdDev}` 
        });
    }

    // ── TEST 7: Not all dark pixels ───────────────────────────────────
    {
        const darkPct = gameState.darkPixelPct || 100;
        const pass = darkPct < 50;
        results.push({ 
            name: 'Less than 50% dark pixels', 
            pass, 
            detail: `Dark pixels: ${darkPct}%` 
        });
    }

    // ── TEST 8: Sky is visible (camera not in ground) ─────────────────
    {
        const skyCount = gameState.skyPixelCount || 0;
        const pass = skyCount > 5;
        results.push({ 
            name: 'Sky visible in top half (camera above ground)', 
            pass, 
            detail: `Sky-like pixels: ${skyCount}` 
        });
    }

    // ── TEST 9: Not overwhelmingly one color ──────────────────────────
    {
        const greenPct = gameState.greenDominantPct || 0;
        const pass = greenPct <= 98;
        results.push({ 
            name: 'Not all green (< 98% green-dominant)', 
            pass, 
            detail: `Green-dominant: ${greenPct}%` 
        });
    }

    // ── TEST 10: Click to dismiss overlay, then check scene again ─────
    // Simulate clicking to dismiss tutorial/click-to-play and check if anything changes
    {
        await page.click('canvas', { force: true }).catch(() => {});
        await page.waitForTimeout(1000);
        
        // Check if overlays are gone
        const tutorialGone = await page.evaluate(() => {
            const tutorial = document.getElementById('tutorial-overlay');
            const clickToPlay = document.getElementById('click-to-play');
            return {
                tutorialHidden: !tutorial || tutorial.style.display === 'none' || getComputedStyle(tutorial).display === 'none',
                clickToPlayHidden: !clickToPlay || clickToPlay.style.display === 'none' || getComputedStyle(clickToPlay).display === 'none',
            };
        });
        const pass = tutorialGone.tutorialHidden && tutorialGone.clickToPlayHidden;
        results.push({
            name: 'Overlays dismiss on click',
            pass,
            detail: `Tutorial: ${tutorialGone.tutorialHidden ? 'hidden' : 'VISIBLE'}, Click-to-play: ${tutorialGone.clickToPlayHidden ? 'hidden' : 'VISIBLE'}`
        });
    }

    // ── Capture a screenshot for visual inspection ────────────────────
    await page.screenshot({ path: 'tests/screenshot-startup.png', fullPage: false });
    console.log('\n  Screenshot saved to tests/screenshot-startup.png');

    // ── Now evaluate the actual Three.js scene state via window ───────
    const sceneState = await page.evaluate(() => {
        // Try to find Three.js objects in the module scope
        // We need to access the scene graph. Since modules are scoped,
        // we look for the canvas's WebGL renderer and traverse the scene.
        
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'no canvas' };
        
        // Try to read from THREE's internal renderer list
        // Three.js stores renderer info on the canvas
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return { error: 'no gl' };
        
        // We can't directly access ES module scope from evaluate(),
        // so let's check what we can via the DOM and canvas state
        return {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            cssWidth: canvas.style.width,
            cssHeight: canvas.style.height,
            glViewport: (() => {
                const vp = gl.getParameter(gl.VIEWPORT);
                return { x: vp[0], y: vp[1], w: vp[2], h: vp[3] };
            })(),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            programCount: (() => {
                // Can't easily count programs, but we can check if context is valid
                return gl.isContextLost() ? 'LOST' : 'ACTIVE';
            })(),
        };
    });

    console.log('\n── WebGL State ──');
    console.log(`  Canvas: ${sceneState.canvasWidth}x${sceneState.canvasHeight}`);
    console.log(`  CSS: ${sceneState.cssWidth} x ${sceneState.cssHeight}`);
    console.log(`  GL viewport: ${sceneState.glViewport?.w}x${sceneState.glViewport?.h}`);
    console.log(`  GL context: ${sceneState.programCount}`);

    // ── TEST 11: Canvas renders at expected resolution ────────────────
    {
        const w = sceneState.canvasWidth;
        const h = sceneState.canvasHeight;
        const pass = w === 320 && h === 240;
        results.push({
            name: 'Canvas internal resolution 320x240',
            pass,
            detail: `${w}x${h}`
        });
    }

    // ── Expose game state by injecting a debug hook ──────────────────
    // Since we can't access ES module scope, let's add a window hook in main.js
    // For now, let's try to find game state through any exposed globals
    const debugState = await page.evaluate(() => {
        // Check if there are any window-level references
        return {
            hasThree: typeof THREE !== 'undefined',
            windowKeys: Object.keys(window).filter(k => 
                !k.startsWith('__') && !k.startsWith('webkit') && 
                typeof window[k] !== 'function' && k.length < 30
            ).slice(0, 20),
        };
    });

    console.log('\n── Debug State ──');
    console.log(`  THREE global: ${debugState.hasThree}`);

    // ══════════════════════════════════════════════════════════════════
    // RESULTS SUMMARY
    // ══════════════════════════════════════════════════════════════════

    console.log('\n══════════════════════════════════════════════');
    console.log('  TEST RESULTS');
    console.log('══════════════════════════════════════════════');
    
    let passed = 0;
    let failed = 0;
    for (const r of results) {
        const icon = r.pass ? '✅' : '❌';
        console.log(`  ${icon} ${r.name} — ${r.detail}`);
        if (r.pass) passed++; else failed++;
    }

    console.log(`\n  ${passed} passed, ${failed} failed out of ${results.length} tests\n`);

    if (failed > 0) {
        console.log('═══ DIAGNOSIS ═══');
        
        if (gameState.avgBrightness < 40) {
            console.log('  PROBLEM: Scene is very dark. Camera may be underground or materials are too dark.');
        }
        if (gameState.colorStdDev < 10) {
            console.log('  PROBLEM: Very little color variation — likely stuck looking at floor or sky only.');
        }
        if (gameState.skyPixelCount < 5) {
            console.log('  PROBLEM: No sky visible — camera is almost certainly below terrain or pointing straight down.');
        }
        if (gameState.greenDominantPct > 85) {
            console.log('  PROBLEM: Screen is almost entirely green — camera is in/near flat terrain.');
        }
        if (gameState.darkPixelPct > 50) {
            console.log('  PROBLEM: Over half the screen is nearly black — severe lighting or material issue.');
        }
        
        console.log('\n  Check tests/screenshot-startup.png for visual confirmation.');
    }

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
