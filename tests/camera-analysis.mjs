/**
 * Capture exact camera/terrain state during first frames
 */
import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    page.on('pageerror', err => console.log(`[ERR] ${err.message}`));
    await page.goto('http://localhost:8080?t=' + Date.now(), { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
        const d = window.__JMFW__;
        if (!d) return { error: 'no __JMFW__' };
        
        const gl = d.renderer.getContext();
        const rt = d.postProcess.renderTarget;
        const w = rt.width, h = rt.height;
        
        function readStats() {
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
            let sky=0,green=0,n=0;
            for(let i=0;i<px.length;i+=16){
                const r=px[i],g=px[i+1],b=px[i+2];n++;
                if(g>r*1.3&&g>b*1.3&&g>20) green++;
                if(b>80&&g>60&&r<200) sky++;
            }
            // sample a few pixels from each quarter
            const samples = {};
            for (const label of ['bottomRow', 'quarter', 'half', 'threeQuarter', 'topRow']) {
                let row;
                if (label === 'bottomRow') row = 0;
                else if (label === 'quarter') row = Math.floor(h * 0.25);
                else if (label === 'half') row = Math.floor(h * 0.5);
                else if (label === 'threeQuarter') row = Math.floor(h * 0.75);
                else row = h - 1;
                const idx = (row * w + Math.floor(w/2)) * 4;
                samples[label] = { r: px[idx], g: px[idx+1], b: px[idx+2] };
            }
            return { skyPct: Math.round(sky/n*100), greenPct: Math.round(green/n*100), samples };
        }

        // Current state (what the game loop set)
        const jp = d.josh.getPosition();
        const cp = d.camera.position.clone();
        const cq = d.camera.quaternion.clone();
        
        // Get terrain heights around the scene
        const terrainSamples = [];
        for (let x = -100; x <= 100; x += 20) {
            for (let z = -100; z <= 100; z += 50) {
                // We can't directly call getTerrainHeight from here easily
                // but we can check the terrain mesh geometry
            }
        }
        
        // Get the terrain mesh vertex extents
        const terrainMesh = d.field.children.find(c => c.name === 'terrain');
        let minY = Infinity, maxY = -Infinity;
        if (terrainMesh) {
            const pos = terrainMesh.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const y = pos.getY(i);
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        
        const info = {
            josh: { x: jp.x.toFixed(2), y: jp.y.toFixed(2), z: jp.z.toFixed(2) },
            camera: { 
                x: cp.x.toFixed(2), y: cp.y.toFixed(2), z: cp.z.toFixed(2),
                fov: d.camera.fov,
                aspect: d.camera.aspect.toFixed(3),
            },
            cameraCtrl: {
                pitch: d.cameraCtrl.pitchAngle.toFixed(3),
                orbit: d.cameraCtrl.orbitAngle.toFixed(3),
                distance: d.cameraCtrl.distance,
            },
            terrainYRange: { min: minY.toFixed(2), max: maxY.toFixed(2) },
            cameraAboveTerrain: null,
        };
        
        // Camera height above terrain at camera's XZ
        // We can interpolate from the mesh data but let's just check the Josh module
        // Actually, let's just render and check
        
        // Render with CURRENT game camera
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        info.currentView = readStats();
        
        // Now try: same camera but HIGHER pitch
        const origPitch = d.cameraCtrl.pitchAngle;
        const origDist = d.cameraCtrl.distance;
        
        // Fix 1: Higher pitch, same distance
        d.cameraCtrl.pitchAngle = 0.4;
        d.cameraCtrl.update(0.016, {mouseDeltaX:0, mouseDeltaY:0, scrollDelta:0}, jp);
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        info.fix1_higherPitch = readStats();
        info.fix1_camera = { x: d.camera.position.x.toFixed(2), y: d.camera.position.y.toFixed(2), z: d.camera.position.z.toFixed(2) };
        
        // Fix 2: Higher pitch + closer
        d.cameraCtrl.pitchAngle = 0.5;
        d.cameraCtrl.distance = 10;
        d.cameraCtrl.update(0.016, {mouseDeltaX:0, mouseDeltaY:0, scrollDelta:0}, jp);
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        info.fix2_higherCloser = readStats();
        info.fix2_camera = { x: d.camera.position.x.toFixed(2), y: d.camera.position.y.toFixed(2), z: d.camera.position.z.toFixed(2) };
        
        // Fix 3: Reduce terrain size (clone geometry, scale it)
        // Actually let's just MOVE the camera way up
        d.cameraCtrl.pitchAngle = 0.35;
        d.cameraCtrl.distance = 15;
        d.cameraCtrl.update(0.016, {mouseDeltaX:0, mouseDeltaY:0, scrollDelta:0}, jp);
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        info.fix3_further = readStats();
        info.fix3_camera = { x: d.camera.position.x.toFixed(2), y: d.camera.position.y.toFixed(2), z: d.camera.position.z.toFixed(2) };
        
        // Fix 4: Dramatically higher camera
        d.camera.position.set(jp.x, jp.y + 25, jp.z + 15);
        d.camera.lookAt(jp.x, jp.y + 2, jp.z);
        d.camera.updateMatrixWorld(true);
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        info.fix4_manual = readStats();
        
        // Fix 5: Reduce terrain to 50x50
        if (terrainMesh) {
            terrainMesh.scale.set(0.25, 1, 0.25);
            d.camera.position.set(jp.x, jp.y + 8, jp.z + 12);
            d.camera.lookAt(jp.x, jp.y + 2, jp.z);
            d.camera.updateMatrixWorld(true);
            d.renderer.setRenderTarget(rt);
            d.renderer.render(d.scene, d.camera);
            info.fix5_smallTerrain = readStats();
            terrainMesh.scale.set(1, 1, 1); // restore
        }
        
        // Fix 6: Normal camera but terrain only in front region
        d.cameraCtrl.pitchAngle = origPitch;
        d.cameraCtrl.distance = origDist;
        
        // What about fog? Check the renderer's clear color
        info.clearColor = {
            r: Math.round(d.renderer.getClearColor(new (d.scene.background.constructor)()).r * 255),
            g: Math.round(d.renderer.getClearColor(new (d.scene.background.constructor)()).g * 255),
            b: Math.round(d.renderer.getClearColor(new (d.scene.background.constructor)()).b * 255),
        };
        info.sceneBg = d.scene.background.getHexString();
        info.fogColor = d.scene.fog?.color.getHexString();
        info.fogNear = d.scene.fog?.near;
        info.fogFar = d.scene.fog?.far;
        
        return info;
    });

    console.log('=== STARTUP CAMERA ANALYSIS ===\n');
    console.log('Josh:', JSON.stringify(result.josh));
    console.log('Camera:', JSON.stringify(result.camera));
    console.log('Camera Ctrl:', JSON.stringify(result.cameraCtrl));
    console.log('Terrain Y range:', JSON.stringify(result.terrainYRange));
    console.log('Scene BG:', result.sceneBg, '| Fog:', result.fogColor, `near=${result.fogNear} far=${result.fogFar}`);
    console.log('Clear color:', JSON.stringify(result.clearColor));
    
    console.log('\n--- Views ---');
    const views = ['currentView', 'fix1_higherPitch', 'fix2_higherCloser', 'fix3_further', 'fix4_manual', 'fix5_smallTerrain'];
    for (const v of views) {
        const d = result[v];
        if (!d) { console.log(`${v}: NO DATA`); continue; }
        const ok = d.skyPct > 10;
        const camInfo = result[v.replace('View','').replace('_camera','').replace(v, v + '_camera')] || result[v.replace('View','_camera')];
        console.log(`${ok?'✅':'❌'} ${v.padEnd(22)} sky=${d.skyPct}% green=${d.greenPct}% | center pixels: bottom(${d.samples.bottomRow.r},${d.samples.bottomRow.g},${d.samples.bottomRow.b}) top(${d.samples.topRow.r},${d.samples.topRow.g},${d.samples.topRow.b})`);
    }
    
    for (const k of ['fix1_camera', 'fix2_camera', 'fix3_camera']) {
        if (result[k]) console.log(`  ${k}: ${JSON.stringify(result[k])}`);
    }

    await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
