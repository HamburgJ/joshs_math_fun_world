const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const title = await page.locator('[id="title-screen"]').count();
    console.log('Title screen present:', title > 0);

    await page.click('body');
    await page.waitForTimeout(3000);

    const state = await page.evaluate(() => {
        const g = window.__JMFW__;
        if (!g) return null;
        const p = g.josh.getPosition();
        return {
            joshZ: Math.round(p.z * 10) / 10,
            hasReveal: typeof g.field.userData.revealPortals === 'function',
            portalCount: g.field.userData.beacons ? g.field.userData.beacons.length : 0,
            portalsVis: g.field.userData.beacons ? g.field.userData.beacons[0].visible : null,
            arrivalComplete: g.arrival.complete,
            signExists: !!g.scene.getObjectByName('entrance-sign'),
        };
    });

    console.log('Game state:', JSON.stringify(state, null, 2));

    const real = errors.filter(e =>
        !e.includes('pointer') &&
        !e.includes('Permissions') &&
        !e.includes('pointerlock')
    );
    if (real.length) {
        console.log('JS ERRORS:', real);
    } else {
        console.log('No JS errors!');
    }

    await browser.close();
    process.exit(real.length > 0 ? 1 : 0);
})().catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
});
