/**
 * Deep pixel analysis - dump exact pixel data from render target
 */
import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    page.on('pageerror', err => console.log(`[ERR] ${err.message}`));
    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[CONSOLE ERR] ${msg.text()}`);
    });
    await page.goto('http://localhost:8080?t=' + Date.now(), { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
        const d = window.__JMFW__;
        if (!d) return { error: 'no __JMFW__' };
        
        const gl = d.renderer.getContext();
        const rt = d.postProcess.renderTarget;
        const w = rt.width, h = rt.height;
        
        const results = {};
        
        // Helper: render to RT and read all pixels
        function renderAndAnalyze(label) {
            d.renderer.setRenderTarget(rt);
            d.renderer.render(d.scene, d.camera);
            
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
            
            // Sample unique colors
            const colorSet = new Set();
            const rowSamples = [];
            
            for (let row = 0; row < h; row += Math.max(1, Math.floor(h/10))) {
                const rowColors = [];
                for (let col = 0; col < w; col += Math.max(1, Math.floor(w/5))) {
                    const idx = (row * w + col) * 4;
                    const r = px[idx], g = px[idx+1], b = px[idx+2], a = px[idx+3];
                    const key = `${r},${g},${b}`;
                    colorSet.add(key);
                    rowColors.push({ col, r, g, b, a });
                }
                rowSamples.push({ row, pctFromBottom: Math.round(row/h*100), colors: rowColors });
            }
            
            return {
                uniqueColors: colorSet.size,
                topUniqueColors: [...colorSet].slice(0, 20),
                rowSamples
            };
        }
        
        // Test 1: Camera looking STRAIGHT UP
        const jp = d.josh.getPosition();
        d.camera.position.set(jp.x, jp.y + 5, jp.z);
        d.camera.lookAt(jp.x, jp.y + 100, jp.z); // look straight up
        d.camera.updateMatrixWorld(true);
        results.test1_lookUp = renderAndAnalyze();
        
        // Test 2: Camera far above, looking at horizon
        d.camera.position.set(0, 50, 0);
        d.camera.lookAt(0, 50, -100); // look at horizon from 50 units up
        d.camera.updateMatrixWorld(true);
        results.test2_horizon = renderAndAnalyze();
        
        // Test 3: Simplest possible - empty scene
        const children = [...d.scene.children];
        children.forEach(c => c.visible = false);
        d.camera.position.set(0, 5, 0);
        d.camera.lookAt(0, 5, -10);
        d.camera.updateMatrixWorld(true);
        results.test3_emptyScene = renderAndAnalyze();
        
        // Test 4: Only sky dome visible
        const skyDome = d.scene.children.find(c => c.name === 'sky' || (c.geometry && c.geometry.type === 'SphereGeometry'));
        if (skyDome) {
            skyDome.visible = true;
            results.test4_skyOnly = renderAndAnalyze();
            results.skyDomeInfo = {
                name: skyDome.name,
                type: skyDome.type,
                geoType: skyDome.geometry?.type,
                matType: skyDome.material?.type,
                renderOrder: skyDome.renderOrder,
                depthTest: skyDome.material?.depthTest,
                depthWrite: skyDome.material?.depthWrite,
                side: skyDome.material?.side,
                visible: skyDome.visible,
                position: { x: skyDome.position.x, y: skyDome.position.y, z: skyDome.position.z },
                scale: { x: skyDome.scale.x, y: skyDome.scale.y, z: skyDome.scale.z },
            };
        } else {
            results.skyDomeInfo = 'NOT FOUND';
            // Find any sphere geometries
            results.allChildren = d.scene.children.map(c => ({
                name: c.name, type: c.type, 
                geoType: c.geometry?.type,
                childCount: c.children?.length
            }));
        }
        
        // Restore
        children.forEach(c => c.visible = true);
        
        // Report scene background
        results.sceneBackground = d.scene.background ? {
            type: typeof d.scene.background,
            isColor: d.scene.background.isColor,
            hex: d.scene.background.getHexString?.()
        } : null;
        
        results.rtSize = { w, h };
        results.cameraFOV = d.camera.fov;
        results.cameraNearFar = { near: d.camera.near, far: d.camera.far };
        
        return results;
    });

    console.log('=== PIXEL ANALYSIS ===\n');
    console.log('RT size:', JSON.stringify(result.rtSize));
    console.log('Camera FOV:', result.cameraFOV);
    console.log('Camera near/far:', JSON.stringify(result.cameraNearFar));
    console.log('Scene background:', JSON.stringify(result.sceneBackground));
    console.log('Sky dome info:', JSON.stringify(result.skyDomeInfo, null, 2));
    
    for (const testKey of ['test1_lookUp', 'test2_horizon', 'test3_emptyScene', 'test4_skyOnly']) {
        const t = result[testKey];
        if (!t) { console.log(`\n${testKey}: NO DATA`); continue; }
        console.log(`\n--- ${testKey} ---`);
        console.log(`Unique colors: ${t.uniqueColors}`);
        console.log(`Top colors: ${t.topUniqueColors.join(' | ')}`);
        for (const row of t.rowSamples) {
            const colorStr = row.colors.map(c => `(${c.r},${c.g},${c.b})`).join(' ');
            console.log(`  Row ${row.row} (${row.pctFromBottom}% from bottom): ${colorStr}`);
        }
    }

    await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
