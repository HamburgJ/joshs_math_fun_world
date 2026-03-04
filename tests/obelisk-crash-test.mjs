import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({
        headless: true,
        args: ['--use-gl=angle', '--use-angle=swiftshader'],
    });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

    const errors = [];
    page.on('pageerror', err => {
        errors.push({ type: 'pageerror', msg: err.message, stack: err.stack });
        console.error('PAGE ERROR:', err.message);
        console.error(err.stack?.split('\n').slice(0, 6).join('\n'));
    });
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const txt = msg.text();
            errors.push({ type: 'console-error', msg: txt });
            console.error('CONSOLE ERROR:', txt);
        }
    });

    console.log('Loading game...');
    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);

    // Click to dismiss title screen
    await page.click('body');
    await page.waitForTimeout(2000);

    // Check WebGL context and game init
    const initCheck = await page.evaluate(() => {
        const g = window.__JMFW__;
        if (!g) return { ok: false, reason: 'no __JMFW__' };
        const gl = g.renderer?.getContext?.();
        return {
            ok: true,
            webgl: !!gl,
            webglLost: gl?.isContextLost?.() ?? 'unknown',
            joshPos: { x: g.josh.model.position.x.toFixed(1), z: g.josh.model.position.z.toFixed(1) },
            zone: g.registry?.activeZone,
            bgType: g.scene.background?.constructor?.name ?? 'null',
            fogType: g.scene.fog?.constructor?.name ?? 'null',
            arrivalComplete: g.arrival?.complete,
        };
    });
    console.log('Init check:', JSON.stringify(initCheck));
    if (!initCheck.ok) {
        console.log('FAILED TO INIT'); await browser.close(); process.exit(1);
    }

    // Force arrival to complete so the world state code path runs
    console.log('\n=== Forcing arrival complete ===');
    await page.evaluate(() => {
        const g = window.__JMFW__;
        if (g.arrival && !g.arrival.complete) {
            g.arrival.complete = true;
            g.arrival.progress = 1;
            // Restore fog to normal Fog (same as arrival completion does)
            // THREE is available from the importmap
            const THREE = g.scene.fog.constructor.__proto__; // not needed, just set fog props
            // Instead of recreating fog, just tweak properties for the FogExp2
            // Or let the game loop do it naturally since arrival.complete = true
        }
        // Also reveal portals
        if (g.field?.userData?.revealPortals) g.field.userData.revealPortals();
    });
    // Wait for a few frames with arrival complete
    await page.waitForTimeout(1000);
    const postArrival = await page.evaluate(() => {
        const g = window.__JMFW__;
        return {
            arrivalComplete: g.arrival?.complete,
            fogType: g.scene.fog?.constructor?.name ?? 'null',
        };
    });
    console.log('After arrival force:', JSON.stringify(postArrival));

    // Teleport Josh near obelisk and let the REAL game loop run via rAF
    console.log('\n=== Teleporting Josh to (140, 15, -110) and waiting for real game loop ===');
    await page.evaluate(() => {
        const g = window.__JMFW__;
        const y = 15; // approximate terrain height in far mountainous area
        g.josh.model.position.set(140, y, -110);
        g.josh.physics.y = y;
        g.josh.physics.grounded = true;
        g.cameraCtrl.currentPosition.set(140, y + 8, -102);
    });
    // Let real RAF loop run for 2 seconds
    await page.waitForTimeout(2000);
    console.log('Errors after teleport to (140,-110):', errors.length);

    // Move closer: (150, -120)
    console.log('\n=== Teleporting to (150, 15, -120) ===');
    await page.evaluate(() => {
        const g = window.__JMFW__;
        g.josh.model.position.set(150, 15, -120);
        g.josh.physics.y = 15;
        g.josh.physics.grounded = true;
    });
    await page.waitForTimeout(2000);
    console.log('Errors after (150,-120):', errors.length);

    // Move to obelisk: (160, -130)
    console.log('\n=== Teleporting to obelisk (160, 15, -130) ===');
    await page.evaluate(() => {
        const g = window.__JMFW__;
        g.josh.model.position.set(160, 15, -130);
        g.josh.physics.y = 15;
        g.josh.physics.grounded = true;
    });
    await page.waitForTimeout(3000);
    console.log('Errors after obelisk (160,-130):', errors.length);

    // Check WebGL after each step
    const postCheck = await page.evaluate(() => {
        const g = window.__JMFW__;
        const gl = g.renderer?.getContext?.();
        return {
            webglLost: gl?.isContextLost?.() ?? 'unknown',
            joshPos: {
                x: g.josh.model.position.x.toFixed(1),
                y: g.josh.model.position.y.toFixed(1),
                z: g.josh.model.position.z.toFixed(1)
            },
            rendering: !!g.renderer?.info,
            renderCalls: g.renderer?.info?.render?.calls,
        };
    });
    console.log('Post-teleport status:', JSON.stringify(postCheck));

    // Now simulate WALKING toward the obelisk using keyboard dispatch
    console.log('\n=== Simulating keyboard walk toward obelisk ===');
    await page.evaluate(() => {
        const g = window.__JMFW__;
        g.josh.model.position.set(145, 15, -115);
        g.josh.physics.y = 15;
        g.josh.physics.grounded = true;
    });
    // Dispatch keydown for 'w' to walk forward
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(5000); // Walk for 5 seconds
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(1000);
    
    const walkCheck = await page.evaluate(() => {
        const g = window.__JMFW__;
        const pos = g.josh.getPosition();
        return {
            x: pos.x.toFixed(1), y: pos.y.toFixed(1), z: pos.z.toFixed(1),
        };
    });
    console.log('After walk:', JSON.stringify(walkCheck));
    console.log('Errors after walking:', errors.length);

    // Check if game loop is still ticking
    const loopAlive = await page.evaluate(() => {
        return new Promise(resolve => {
            const g = window.__JMFW__;
            const posA = g.josh.model.position.clone();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const posB = g.josh.model.position.clone();
                    resolve({ alive: true, posA: posA.toArray().map(v => v.toFixed(1)), posB: posB.toArray().map(v => v.toFixed(1)) });
                });
            });
            setTimeout(() => resolve({ alive: false, timeout: true }), 3000);
        });
    });
    console.log('Game loop alive:', JSON.stringify(loopAlive));

    // Final summary
    console.log('\n========== SUMMARY ==========');
    console.log(`Total errors: ${errors.length}`);
    for (const e of errors) {
        console.log(`  [${e.type}] ${e.msg?.substring(0, 300)}`);
        if (e.stack) console.log('   ', e.stack.split('\n').slice(1, 4).join('\n    '));
    }

    await browser.close();
    process.exit(errors.length > 0 ? 1 : 0);
})();
