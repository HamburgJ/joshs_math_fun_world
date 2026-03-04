/**
 * Deep diagnostic test — injects debug hooks into the game to read
 * camera position, Josh position, terrain height, and scene graph state.
 * 
 * Run: node tests/deep-diagnostic.mjs
 */

import { chromium } from 'playwright';

const URL = 'http://localhost:8080';

async function run() {
    console.log('=== Deep Diagnostic Test ===\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
        console.log(`[PAGE ERROR] ${err.message}`);
    });

    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });

    // Wait for game to initialize and render several frames
    await page.waitForTimeout(3000);

    // Inject debug window globals into main.js by adding a script tag
    // that patches into the module scope. But since we can't access ES modules
    // directly, we need to modify main.js to expose debug info.
    // Instead, let's read the Three.js scene from the renderer.
    
    // The renderer is attached to the canvas. Three.js r170 uses WebGL2.
    // We can't get scene objects from GL context alone, BUT we CAN:
    // 1. Read what the camera currently sees from pixel data
    // 2. Inject a script to main.js to expose state on window

    // First approach: modify main.js to expose debug globals, then reload
    console.log('Injecting debug hooks...\n');
    
    // We'll add a small inline script before main.js loads that patches window
    await page.addScriptTag({
        content: `
            // Monkey-patch to intercept module globals
            window.__JMFW_DEBUG__ = {};
        `
    });

    // Since we can't directly intercept ES module scope, let's modify the 
    // actual source file temporarily. Instead, let's use a simpler approach:
    // use page.evaluate to read the Three.js scene via the WebGL renderer
    // stored on the canvas.

    const diagnostics = await page.evaluate(() => {
        return new Promise((resolve) => {
            // Wait one more frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) { resolve({ error: 'no canvas' }); return; }

                    // Three.js r170 uses a __three_webgl_renderer__ property or
                    // stores renderer info. Let's check canvas properties.
                    const canvasKeys = Object.keys(canvas).filter(k => k.startsWith('__'));
                    
                    // Look at canvas.__r (Three.js internal)
                    // In Three.js, the renderer doesn't directly expose on canvas,
                    // but we can find scene children via DOM traversal isn't useful.

                    // Let's analyze the actual rendered frame more carefully
                    const offscreen = document.createElement('canvas');
                    offscreen.width = canvas.width;
                    offscreen.height = canvas.height;
                    const ctx = offscreen.getContext('2d');
                    ctx.drawImage(canvas, 0, 0);
                    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
                    const pixels = imageData.data;
                    const w = offscreen.width;
                    const h = offscreen.height;

                    // Sample specific rows to understand the view
                    const rows = {};
                    for (const rowPct of [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99]) {
                        const y = Math.floor(h * rowPct / 100);
                        let rowR = 0, rowG = 0, rowB = 0;
                        for (let x = 0; x < w; x++) {
                            const idx = (y * w + x) * 4;
                            rowR += pixels[idx];
                            rowG += pixels[idx + 1];
                            rowB += pixels[idx + 2];
                        }
                        rows[`row_${rowPct}pct`] = {
                            r: Math.round(rowR / w),
                            g: Math.round(rowG / w),
                            b: Math.round(rowB / w),
                        };
                    }

                    // Check for a horizon line — row where color changes significantly
                    let horizonRow = -1;
                    let prevBrightness = 0;
                    for (let y = 0; y < h; y++) {
                        let rowBrightness = 0;
                        for (let x = 0; x < w; x += 4) {
                            const idx = (y * w + x) * 4;
                            rowBrightness += pixels[idx] + pixels[idx + 1] + pixels[idx + 2];
                        }
                        rowBrightness /= (w / 4);
                        if (y > 0 && Math.abs(rowBrightness - prevBrightness) > 30) {
                            horizonRow = y;
                            break;
                        }
                        prevBrightness = rowBrightness;
                    }

                    // Min/max pixel values
                    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
                    for (let i = 0; i < pixels.length; i += 16) {
                        const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
                        if (r < minR) minR = r; if (r > maxR) maxR = r;
                        if (g < minG) minG = g; if (g > maxG) maxG = g;
                        if (b < minB) minB = b; if (b > maxB) maxB = b;
                    }

                    // Check overlay visibility
                    const overlays = {};
                    for (const id of ['loading', 'tutorial-overlay', 'click-to-play', 'hud-interact', 'hud-zone']) {
                        const el = document.getElementById(id);
                        if (el) {
                            const cs = getComputedStyle(el);
                            overlays[id] = {
                                display: cs.display,
                                visibility: cs.visibility,
                                opacity: cs.opacity,
                                zIndex: cs.zIndex,
                            };
                        }
                    }

                    resolve({
                        canvasInternalKeys: canvasKeys,
                        rowSamples: rows,
                        horizonRow,
                        pixelRange: {
                            r: [minR, maxR],
                            g: [minG, maxG],
                            b: [minB, maxB],
                        },
                        overlays,
                        bodyChildren: document.body.children.length,
                    });
                });
            });
        });
    });

    console.log('── Row-by-row color analysis (top to bottom) ──');
    for (const [key, val] of Object.entries(diagnostics.rowSamples)) {
        const brightness = Math.round((val.r + val.g + val.b) / 3);
        console.log(`  ${key}: R=${val.r} G=${val.g} B=${val.b}  (brightness: ${brightness})`);
    }

    console.log(`\n  Horizon line at row: ${diagnostics.horizonRow} / ${240} (-1 = none found)`);
    
    console.log('\n── Pixel value ranges ──');
    console.log(`  R: ${diagnostics.pixelRange.r[0]} - ${diagnostics.pixelRange.r[1]}`);
    console.log(`  G: ${diagnostics.pixelRange.g[0]} - ${diagnostics.pixelRange.g[1]}`);
    console.log(`  B: ${diagnostics.pixelRange.b[0]} - ${diagnostics.pixelRange.b[1]}`);

    console.log('\n── Overlay states ──');
    for (const [id, state] of Object.entries(diagnostics.overlays)) {
        console.log(`  #${id}: display=${state.display}, opacity=${state.opacity}`);
    }
    
    console.log(`\n  Canvas internal keys: ${diagnostics.canvasInternalKeys.join(', ') || '(none)'}`);

    // Now let's add a debug export to main.js and test with it
    // First, let's add window.__debug__ to main.js
    console.log('\n── Adding debug export to main.js and reloading ──');

    // Read current main.js and add debug line
    const fs = await import('fs');
    const mainPath = 'js/main.js';
    const mainContent = fs.readFileSync(mainPath, 'utf8');
    
    // Add debug export at the very end
    const debugLine = `\n// DEBUG: expose game state for testing\nwindow.__JMFW__ = { josh, cameraCtrl, camera, scene, field, registry, renderer };\n`;
    
    if (!mainContent.includes('window.__JMFW__')) {
        fs.writeFileSync(mainPath, mainContent + debugLine);
        console.log('  Added window.__JMFW__ to main.js');
    }

    // Reload and test again
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);

    const gameDebug = await page.evaluate(() => {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const d = window.__JMFW__;
                    if (!d) { resolve({ error: 'Debug not available' }); return; }

                    try {
                        const joshPos = d.josh.getPosition();
                        const camPos = d.camera.position;
                        const camCtrlPos = d.cameraCtrl.currentPosition;
                        
                        // Get terrain height at Josh's position
                        // We can't call getTerrainHeight directly, but we can read Josh's Y
                        
                        resolve({
                            joshPosition: { x: joshPos.x.toFixed(2), y: joshPos.y.toFixed(2), z: joshPos.z.toFixed(2) },
                            cameraPosition: { x: camPos.x.toFixed(2), y: camPos.y.toFixed(2), z: camPos.z.toFixed(2) },
                            cameraCtrlPosition: { x: camCtrlPos.x.toFixed(2), y: camCtrlPos.y.toFixed(2), z: camCtrlPos.z.toFixed(2) },
                            cameraFov: d.camera.fov,
                            cameraNear: d.camera.near,
                            cameraFar: d.camera.far,
                            cameraAspect: d.camera.aspect.toFixed(4),
                            cameraCtrlPitch: d.cameraCtrl.pitchAngle.toFixed(4),
                            cameraCtrlDistance: d.cameraCtrl.distance.toFixed(2),
                            cameraCtrlOrbit: d.cameraCtrl.orbitAngle.toFixed(4),
                            sceneChildCount: d.scene.children.length,
                            sceneChildren: d.scene.children.map(c => `${c.type}:${c.name || 'unnamed'}`),
                            fieldChildCount: d.field.children.length,
                            rendererSize: { w: d.renderer.domElement.width, h: d.renderer.domElement.height },
                            fogNear: d.scene.fog?.near,
                            fogFar: d.scene.fog?.far,
                            activeZone: d.registry?.activeZone,
                        });
                    } catch(e) {
                        resolve({ error: e.message, stack: e.stack });
                    }
                });
            });
        });
    });

    console.log('\n══════════════════════════════════════════════');
    console.log('  GAME STATE SNAPSHOT');
    console.log('══════════════════════════════════════════════');

    if (gameDebug.error) {
        console.log(`  ERROR: ${gameDebug.error}`);
        if (gameDebug.stack) console.log(gameDebug.stack);
    } else {
        console.log(`  Josh position:    (${gameDebug.joshPosition.x}, ${gameDebug.joshPosition.y}, ${gameDebug.joshPosition.z})`);
        console.log(`  Camera position:  (${gameDebug.cameraPosition.x}, ${gameDebug.cameraPosition.y}, ${gameDebug.cameraPosition.z})`);
        console.log(`  Camera ctrl pos:  (${gameDebug.cameraCtrlPosition.x}, ${gameDebug.cameraCtrlPosition.y}, ${gameDebug.cameraCtrlPosition.z})`);
        console.log(`  Camera pitch:     ${gameDebug.cameraCtrlPitch} rad`);
        console.log(`  Camera distance:  ${gameDebug.cameraCtrlDistance}`);
        console.log(`  Camera orbit:     ${gameDebug.cameraCtrlOrbit} rad`);
        console.log(`  Camera FOV:       ${gameDebug.cameraFov}°`);
        console.log(`  Camera aspect:    ${gameDebug.cameraAspect}`);
        console.log(`  Camera near/far:  ${gameDebug.cameraNear} / ${gameDebug.cameraFar}`);
        console.log(`  Scene children:   ${gameDebug.sceneChildCount} — ${gameDebug.sceneChildren.join(', ')}`);
        console.log(`  Field children:   ${gameDebug.fieldChildCount}`);
        console.log(`  Fog near/far:     ${gameDebug.fogNear} / ${gameDebug.fogFar}`);
        console.log(`  Active zone:      ${gameDebug.activeZone}`);
        console.log(`  Renderer size:    ${gameDebug.rendererSize.w}x${gameDebug.rendererSize.h}`);

        // Diagnosis
        console.log('\n── Diagnosis ──');
        const jy = parseFloat(gameDebug.joshPosition.y);
        const cy = parseFloat(gameDebug.cameraPosition.y);
        
        if (cy < jy) {
            console.log(`  ⚠️ Camera Y (${cy}) is BELOW Josh Y (${jy}) — camera is underground!`);
        }
        if (cy < 0) {
            console.log(`  ⚠️ Camera Y is negative — likely below terrain!`);
        }
        if (cy < 2) {
            console.log(`  ⚠️ Camera Y is very low (${cy}) — likely stuck at/near ground level`);
        }
        const pitch = parseFloat(gameDebug.cameraCtrlPitch);
        if (pitch > 0.5) {
            console.log(`  ⚠️ Camera pitch is high (${pitch} rad) — looking too far down`);
        }
        if (parseFloat(gameDebug.cameraCtrlDistance) < 2) {
            console.log(`  ⚠️ Camera is very close to target (${gameDebug.cameraCtrlDistance})`);
        }
        if (gameDebug.sceneChildCount < 3) {
            console.log(`  ⚠️ Scene has very few children (${gameDebug.sceneChildCount}) — world may not be loaded`);
        }
    }

    // Clean up — remove debug line from main.js
    if (mainContent && !mainContent.includes('window.__JMFW__')) {
        fs.writeFileSync(mainPath, mainContent);
        console.log('\n  Cleaned up debug hook from main.js');
    }

    // Capture final screenshot
    await page.screenshot({ path: 'tests/screenshot-diagnostic.png' });
    console.log('  Screenshot saved to tests/screenshot-diagnostic.png');

    await browser.close();
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
