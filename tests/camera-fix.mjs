/**
 * Camera fix finder — tests different camera configs live, renders,
 * and reports which ones produce a visible scene (sky + terrain).
 * 
 * Run: node tests/camera-fix.mjs
 */
import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    page.on('pageerror', err => console.log(`[ERR] ${err.message}`));

    await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Get terrain heights at key positions to understand the landscape
    const terrain = await page.evaluate(() => {
        const d = window.__JMFW__;
        if (!d) return { error: 'no debug' };
        // Access getTerrainHeight through the field's terrain mesh rebuild
        // Instead, let's sample terrain directly from the geometry
        const terrainMesh = d.field.children.find(c => c.name === 'terrain');
        if (!terrainMesh) return { error: 'no terrain mesh' };

        // Sample getTerrainHeight by importing it - can't do in evaluate
        // Instead, compute from Josh's physics
        const jp = d.josh.getPosition();

        // Move Josh to different positions and read terrain heights
        const samples = {};
        const positions = [
            [0,0], [5,5], [5,17], [0,-10], [10,10],
            [5,10], [5,15], [5,20], [5,25], [0,5], [10,5],
            [-5,5], [5,-5], [20,20], [-10,-10]
        ];
        // We can read terrain Y from the mesh geometry by finding nearest vertex
        const pos = terrainMesh.geometry.attributes.position;
        for (const [tx, tz] of positions) {
            let closest = Infinity, closestY = 0;
            for (let i = 0; i < pos.count; i++) {
                const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
                const dist = (vx - tx) ** 2 + (vz - tz) ** 2;
                if (dist < closest) { closest = dist; closestY = vy; }
            }
            samples[`${tx},${tz}`] = closestY.toFixed(2);
        }
        return { joshY: jp.y.toFixed(2), samples };
    });

    console.log('=== Terrain Heights ===');
    for (const [pos, y] of Object.entries(terrain.samples || {})) {
        console.log(`  terrain(${pos}) = ${y}`);
    }

    // Now test different camera configurations
    const configs = [
        { name: 'current',     pitch: 0.25, dist: 12, heightAdd: 0 },
        { name: 'higher',      pitch: 0.15, dist: 12, heightAdd: 5 },
        { name: 'much_higher', pitch: 0.10, dist: 15, heightAdd: 10 },
        { name: 'close_high',  pitch: 0.20, dist: 8,  heightAdd: 8 },
        { name: 'steep_far',   pitch: 0.40, dist: 20, heightAdd: 0 },
        { name: 'flat_look',   pitch: 0.05, dist: 12, heightAdd: 3 },
        { name: 'overhead',    pitch: 1.0,  dist: 15, heightAdd: 0 },
        { name: 'low_pitch_close', pitch: 0.12, dist: 8, heightAdd: 4 },
        { name: 'high_clearance', pitch: 0.20, dist: 10, heightAdd: 3, clearance: 5 },
    ];

    console.log('\n=== Camera Config Tests ===');
    console.log('(Each test: set camera, render one frame, sample pixels)\n');

    for (const cfg of configs) {
        const result = await page.evaluate((cfg) => {
            return new Promise(resolve => {
                const d = window.__JMFW__;
                if (!d) { resolve({ error: 'no debug' }); return; }

                // Set camera config
                d.cameraCtrl.pitchAngle = cfg.pitch;
                d.cameraCtrl.distance = cfg.dist;
                if (cfg.clearance) d.cameraCtrl._terrainClearance = cfg.clearance;

                // Force camera to desired position immediately (skip lerp)
                const jp = d.josh.getPosition();
                const lookAt = { x: jp.x, y: jp.y + 1.8, z: jp.z };
                const orbit = d.cameraCtrl.orbitAngle;

                const oX = Math.sin(orbit) * Math.cos(cfg.pitch) * cfg.dist;
                const oZ = Math.cos(orbit) * Math.cos(cfg.pitch) * cfg.dist;
                const oY = Math.sin(cfg.pitch) * cfg.dist + (cfg.heightAdd || 0);

                const camX = lookAt.x + oX;
                const camY = lookAt.y + oY;
                const camZ = lookAt.z + oZ;

                d.cameraCtrl.currentPosition.set(camX, camY, camZ);
                d.camera.position.set(camX, camY, camZ);
                d.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

                // Render one frame
                d.renderer.setRenderTarget(d.postProcess.renderTarget);
                d.renderer.render(d.scene, d.camera);
                d.renderer.setRenderTarget(null);
                d.renderer.render(d.postProcess.quadScene, d.postProcess.quadCamera);

                // Read pixels
                requestAnimationFrame(() => {
                    const canvas = document.querySelector('canvas');
                    const off = document.createElement('canvas');
                    off.width = canvas.width; off.height = canvas.height;
                    const ctx = off.getContext('2d');
                    ctx.drawImage(canvas, 0, 0);
                    const img = ctx.getImageData(0, 0, off.width, off.height);
                    const px = img.data;
                    const w = off.width, h = off.height;

                    let totalR=0,totalG=0,totalB=0, sky=0, green=0, dark=0, n=0;
                    for (let i = 0; i < px.length; i += 16) {
                        const r=px[i],g=px[i+1],b=px[i+2];
                        totalR+=r; totalG+=g; totalB+=b; n++;
                        if (r<30&&g<30&&b<30) dark++;
                        if (g>r*1.3&&g>b*1.3&&g>20) green++;
                        if (b>80&&g>60&&r>40&&(b+g)>r*2) sky++;
                    }

                    // Top quarter analysis
                    let topSky=0, topN=0;
                    const topEnd = Math.floor(h/4)*w*4;
                    for (let i=0;i<topEnd;i+=16){
                        const r=px[i],g=px[i+1],b=px[i+2];
                        topN++;
                        if(b>80&&g>60&&r>40&&(b+g)>r*2) topSky++;
                    }

                    resolve({
                        camY: camY.toFixed(1),
                        avgR: Math.round(totalR/n), avgG: Math.round(totalG/n), avgB: Math.round(totalB/n),
                        brightness: Math.round((totalR+totalG+totalB)/(n*3)),
                        greenPct: Math.round(green/n*100),
                        skyPct: Math.round(sky/n*100),
                        topSkyPct: Math.round(topSky/Math.max(topN,1)*100),
                        darkPct: Math.round(dark/n*100),
                    });
                });
            });
        }, cfg);

        const ok = result.skyPct > 5 || result.topSkyPct > 10;
        const icon = ok ? '✅' : '❌';
        console.log(`${icon} ${cfg.name.padEnd(20)} camY=${result.camY} rgb=(${result.avgR},${result.avgG},${result.avgB}) bright=${result.brightness} sky=${result.skyPct}% topSky=${result.topSkyPct}% green=${result.greenPct}%`);
    }

    // Also test: what if we bypass post-processing entirely?
    console.log('\n=== Direct render test (no post-processing) ===');
    const directResult = await page.evaluate(() => {
        return new Promise(resolve => {
            const d = window.__JMFW__;
            // Reset camera to a known position
            const jp = d.josh.getPosition();
            d.camera.position.set(jp.x, jp.y + 10, jp.z + 15);
            d.camera.lookAt(jp.x, jp.y + 1.8, jp.z);

            // Render DIRECTLY to screen (no render target)
            d.renderer.setRenderTarget(null);
            d.renderer.render(d.scene, d.camera);

            requestAnimationFrame(() => {
                const canvas = document.querySelector('canvas');
                const off = document.createElement('canvas');
                off.width = canvas.width; off.height = canvas.height;
                const ctx = off.getContext('2d');
                ctx.drawImage(canvas, 0, 0);
                const img = ctx.getImageData(0, 0, off.width, off.height);
                const px = img.data;
                let totalR=0,totalG=0,totalB=0,sky=0,green=0,n=0;
                for(let i=0;i<px.length;i+=16){
                    const r=px[i],g=px[i+1],b=px[i+2];
                    totalR+=r;totalG+=g;totalB+=b;n++;
                    if(g>r*1.3&&g>b*1.3&&g>20) green++;
                    if(b>80&&g>60&&r>40&&(b+g)>r*2) sky++;
                }
                resolve({
                    avgR: Math.round(totalR/n), avgG: Math.round(totalG/n), avgB: Math.round(totalB/n),
                    brightness: Math.round((totalR+totalG+totalB)/(n*3)),
                    skyPct: Math.round(sky/n*100), greenPct: Math.round(green/n*100),
                });
            });
        });
    });
    console.log(`Direct: rgb=(${directResult.avgR},${directResult.avgG},${directResult.avgB}) bright=${directResult.brightness} sky=${directResult.skyPct}% green=${directResult.greenPct}%`);

    // Test with a simple colored cube replacing terrain to isolate material vs geometry
    console.log('\n=== Simple cube test (isolate material issue) ===');
    const cubeResult = await page.evaluate(() => {
        return new Promise(resolve => {
            const d = window.__JMFW__;
            // Add a bright red cube at Josh's position
            const THREE = d.scene.constructor === undefined ? null : null;
            // Use the scene's existing children to access THREE constructors
            const geo = new d.camera.position.constructor().constructor; // won't work
            
            // Actually, just check if the terrain material is the issue
            // by temporarily changing material color
            const terrainMesh = d.field.children.find(c => c.name === 'terrain');
            const oldUColor = terrainMesh.material.uniforms.uColor.value.clone();
            
            // Set to bright white
            terrainMesh.material.uniforms.uColor.value.setRGB(1, 1, 1);
            
            const jp = d.josh.getPosition();
            d.camera.position.set(jp.x, jp.y + 10, jp.z + 15);
            d.camera.lookAt(jp.x, jp.y + 1.8, jp.z);
            
            d.renderer.setRenderTarget(null);
            d.renderer.render(d.scene, d.camera);
            
            // Restore
            terrainMesh.material.uniforms.uColor.value.copy(oldUColor);

            requestAnimationFrame(() => {
                const canvas = document.querySelector('canvas');
                const off = document.createElement('canvas');
                off.width = canvas.width; off.height = canvas.height;
                const ctx = off.getContext('2d');
                ctx.drawImage(canvas, 0, 0);
                const img = ctx.getImageData(0, 0, off.width, off.height);
                const px = img.data;
                let totalR=0,totalG=0,totalB=0,sky=0,n=0;
                for(let i=0;i<px.length;i+=16){
                    const r=px[i],g=px[i+1],b=px[i+2];
                    totalR+=r;totalG+=g;totalB+=b;n++;
                    if(b>80&&g>60&&r>40&&(b+g)>r*2) sky++;
                }
                resolve({
                    avgR: Math.round(totalR/n), avgG: Math.round(totalG/n), avgB: Math.round(totalB/n),
                    brightness: Math.round((totalR+totalG+totalB)/(n*3)),
                    skyPct: Math.round(sky/n*100),
                });
            });
        });
    });
    console.log(`White terrain: rgb=(${cubeResult.avgR},${cubeResult.avgG},${cubeResult.avgB}) bright=${cubeResult.brightness} sky=${cubeResult.skyPct}%`);

    // Save screenshot of the last render
    await page.screenshot({ path: 'tests/screenshot-configs.png' });

    await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
