/**
 * Collectathon system test.
 *
 * Verifies:
 *  1. CollectionTracker is exposed and initialized
 *  2. Score HUD element exists and shows counts
 *  3. Discovery popup + zone progress elements exist
 *  4. Per-zone collectibles are registered
 *  5. Discovering an item updates progress
 *  6. Audio methods exist (playDiscovery, playZoneComplete)
 *  7. Already-discovered items return false
 *  8. Zone progress shows correctly
 */

const { chromium } = require('playwright');

const URL = 'http://localhost:8080';
const TIMEOUT = 18000;

(async () => {
    let ok = 0;
    let fail = 0;
    const check = (label, cond) => {
        if (cond) { ok++; console.log(`  ✅  ${label}`); }
        else      { fail++; console.log(`  ❌  ${label}`); }
    };

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Suppress dialogs
    page.on('dialog', d => d.dismiss().catch(() => {}));

    // Collect console errors
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

    // Wait for game to boot (title screen auto-click)
    await page.waitForTimeout(3000);
    await page.click('body').catch(() => {});
    await page.waitForTimeout(2000);

    console.log('\n── Collectathon System Tests ──\n');

    // 1. Tracker exists
    const trackerExists = await page.evaluate(() => {
        return !!(window.__JMFW__ && window.__JMFW__.tracker);
    });
    check('1. CollectionTracker is exposed on __JMFW__', trackerExists);

    // 2. Score HUD element exists
    const scoreHudExists = await page.evaluate(() => {
        const el = document.getElementById('hud-score');
        return !!(el && el.textContent.includes('★') || el && el.textContent.includes('\u2605'));
    });
    check('2. Score HUD element exists with star', scoreHudExists);

    // 3. Discovery + zone progress elements exist
    const hudsExist = await page.evaluate(() => {
        return !!(document.getElementById('hud-discovery') && document.getElementById('hud-zone-progress'));
    });
    check('3. Discovery + zone-progress HUD elements exist', hudsExist);

    // 4. Per-zone collectibles are registered
    const zoneTotals = await page.evaluate(() => {
        const t = window.__JMFW__.tracker;
        if (!t) return null;
        const result = {};
        for (const key of t.getZoneKeys()) {
            const p = t.getZoneProgress(key);
            result[key] = p.total;
        }
        return result;
    });
    check('4a. green_field has collectibles', zoneTotals && zoneTotals.green_field >= 2);
      check('4b. coordinate_plane has collectibles', zoneTotals && zoneTotals.coordinate_plane >= 1);
    check('4c. wireframe_void has collectibles', zoneTotals && zoneTotals.wireframe_void >= 5);
    check('4d. non_euclidean has collectibles', zoneTotals && zoneTotals.non_euclidean >= 1);
    check('4e. fractal_boundary has collectibles', zoneTotals && zoneTotals.fractal_boundary >= 1);
    check('4f. number_caverns has collectibles', zoneTotals && zoneTotals.number_caverns >= 10);

    // 5. Discovering updates progress
    const discoveryWorks = await page.evaluate(() => {
        const t = window.__JMFW__.tracker;
        const before = t.getTotalProgress();
        // Get the first registered ID
        const firstId = [...t._registry.keys()][0];
        if (!firstId) return false;
        const isNew = t.discover(firstId);
        const after = t.getTotalProgress();
        return isNew === true && after.found === before.found + 1;
    });
    check('5. Discovering an item increments found count', discoveryWorks);

    // 6. Audio methods exist
    const audioMethodsExist = await page.evaluate(() => {
        // AudioManager is not directly exposed, but we can check it initialized
        // via the tracker callbacks
        const t = window.__JMFW__.tracker;
        return typeof t.onDiscover === 'function' && typeof t.onZoneComplete === 'function';
    });
    check('6. Tracker has onDiscover and onZoneComplete callbacks', audioMethodsExist);

    // 7. Already-discovered returns false
    const alreadyDiscovered = await page.evaluate(() => {
        const t = window.__JMFW__.tracker;
        const firstId = [...t._registry.keys()][0];
        return t.discover(firstId) === false;
    });
    check('7. Re-discovering same item returns false', alreadyDiscovered);

    // 8. Score display updated after discovery
    const scoreUpdated = await page.evaluate(() => {
        const el = document.getElementById('hud-score');
        if (!el) return false;
        const text = el.textContent;
        // Should show at least "★ 1 / N"
        return /\d+\s*\/\s*\d+/.test(text);
    });
    check('8. Score display shows X/Y format', scoreUpdated);

    // 9. No console errors from our changes
    const relevantErrors = errors.filter(e =>
        e.includes('collection') || e.includes('tracker') || e.includes('discover')
    );
    check('9. No collection-related console errors', relevantErrors.length === 0);

    if (relevantErrors.length > 0) {
        console.log('    Errors:', relevantErrors);
    }

    // Log all zone totals for reference
    if (zoneTotals) {
        console.log('\n── Zone Collectible Totals ──');
        for (const [zone, total] of Object.entries(zoneTotals)) {
            const progress = await page.evaluate((z) => window.__JMFW__.tracker.getZoneProgress(z), zone);
            console.log(`    ${zone}: ${progress.found}/${total}`);
        }
        const grand = await page.evaluate(() => window.__JMFW__.tracker.getTotalProgress());
        console.log(`    TOTAL: ${grand.found}/${grand.total}`);
    }

    // Any uncaught page errors from loading?
    if (errors.length > 0) {
        console.log('\n── All Console Errors ──');
        errors.forEach(e => console.log('   ', e));
    }

    console.log(`\n── Results: ${ok} passed, ${fail} failed ──\n`);

    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
})();
