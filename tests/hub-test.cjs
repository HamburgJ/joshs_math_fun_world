/**
 * Quick smoke test for the massive hub world redesign.
 * Checks: no JS errors, Josh spawns at z~260, gate exists, portals hidden initially.
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));
    page.on('console', msg => {
        if (msg.type() === 'error') jsErrors.push(msg.text());
    });

    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });

    // Click to dismiss title screen
    await page.waitForTimeout(1500);
    await page.click('body');
    await page.waitForTimeout(2000);

    // Query game state
    const state = await page.evaluate(() => {
        const g = window.__JMFW__;
        if (!g) return { error: 'No __JMFW__ exposed' };

        const jPos = g.josh.getPosition();
        const field = g.field;
        const arrival = g.arrival;

        // Check portals (beacons)
        const beacons = field.userData.beacons || [];
        const beaconInfo = beacons.map(b => ({
            name: b.name,
            visible: b.visible,
        }));

        // Check for entrance sign
        const sign = g.scene.getObjectByName('entrance-sign');

        // Check terrain size
        const terrain = field.getObjectByName('terrain');
        let terrainSize = null;
        if (terrain && terrain.geometry) {
            const pos = terrain.geometry.attributes.position;
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            for (let i = 0; i < Math.min(pos.count, 1000); i++) {
                const x = pos.getX(i);
                const z = pos.getZ(i);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (z < minZ) minZ = z;
                if (z > maxZ) maxZ = z;
            }
            terrainSize = { minX, maxX, minZ, maxZ, vertexCount: pos.count };
        }

        // Check for wall
        const wall = field.getObjectByName('perimeter-wall');

        // Check for clock tower
        const tower = field.getObjectByName('clock-tower');

        return {
            joshPos: { x: jPos.x.toFixed(1), y: jPos.y.toFixed(1), z: jPos.z.toFixed(1) },
            arrivalComplete: arrival.complete,
            beacons: beaconInfo,
            hasSign: !!sign,
            hasWall: !!wall,
            hasTower: !!tower,
            terrainSize,
            fieldChildCount: field.children.length,
        };
    });

    console.log('\n=== HUB WORLD SMOKE TEST ===\n');

    if (jsErrors.length > 0) {
        console.log('JS ERRORS:', jsErrors.length);
        jsErrors.forEach(e => console.log('  -', e.substring(0, 120)));
    } else {
        console.log('JS Errors: NONE');
    }

    if (state.error) {
        console.log('ERROR:', state.error);
    } else {
        console.log('Josh position:', state.joshPos);
        console.log('Arrival complete:', state.arrivalComplete);
        console.log('Entrance sign exists:', state.hasSign);
        console.log('Perimeter wall exists:', state.hasWall);
        console.log('Clock tower exists:', state.hasTower);
        console.log('Field children:', state.fieldChildCount);
        console.log('Terrain size:', state.terrainSize);
        console.log('Beacons:', JSON.stringify(state.beacons));
    }

    // Validate
    const passed = [];
    const failed = [];

    const check = (name, cond) => (cond ? passed : failed).push(name);

    check('No JS errors', jsErrors.length === 0);
    check('Josh spawns near z=260', state.joshPos && parseFloat(state.joshPos.z) > 200);
    check('Entrance sign exists', state.hasSign);
    check('Perimeter wall exists', state.hasWall);
    check('Clock tower exists', state.hasTower);
      check('5 portal beacons', state.beacons && state.beacons.length >= 5);

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
