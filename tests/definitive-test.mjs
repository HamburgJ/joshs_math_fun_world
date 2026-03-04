/**
 * Definitive test: use the EXACT same camera setup that worked in pixel-dump
 * to confirm rendering still works, then narrow down the issue.
 */
import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    page.on('pageerror', err => console.log(`[ERR] ${err.message}\n${err.stack}`));
    await page.goto('http://localhost:8080?t=' + Date.now(), { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
        const d = window.__JMFW__;
        if (!d) return { error: 'no __JMFW__' };
        
        const gl = d.renderer.getContext();
        const rt = d.postProcess.renderTarget;
        const w = rt.width, h = rt.height;
        
        function readStats(label) {
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
            let sky=0,green=0,n=0;
            const unique = new Set();
            for(let i=0;i<px.length;i+=4){
                const r=px[i],g=px[i+1],b=px[i+2];n++;
                if(g>r*1.3&&g>b*1.3&&g>20) green++;
                if(b>80&&g>60&&r<200) sky++;
            }
            // Top 10% pixels
            let topSky=0, topGreen=0, topN=0;
            const topStart = Math.floor(h * 0.9) * w * 4; // top 10% (Y is inverted in readPixels)
            for(let i=topStart;i<px.length;i+=4){
                const r=px[i],g=px[i+1],b=px[i+2];topN++;
                if(g>r*1.3&&g>b*1.3&&g>20) topGreen++;
                if(b>80&&g>60&&r<200) topSky++;
            }
            // Sample 5 pixels from the very top row
            const topRowIdx = (h - 1) * w * 4;
            const topSamples = [];
            for (let col = 0; col < w; col += Math.floor(w/5)) {
                const idx = topRowIdx + col * 4;
                topSamples.push(`(${px[idx]},${px[idx+1]},${px[idx+2]})`);
            }
            // And 5 from middle row
            const midRowIdx = Math.floor(h/2) * w * 4;
            const midSamples = [];
            for (let col = 0; col < w; col += Math.floor(w/5)) {
                const idx = midRowIdx + col * 4;
                midSamples.push(`(${px[idx]},${px[idx+1]},${px[idx+2]})`);
            }
            return { 
                sky: Math.round(sky/n*100), green: Math.round(green/n*100),
                topSky: Math.round(topSky/Math.max(topN,1)*100),
                topGreen: Math.round(topGreen/Math.max(topN,1)*100),
                topSamples, midSamples
            };
        }
        
        function renderAndRead(label) {
            d.renderer.setRenderTarget(rt);
            d.renderer.render(d.scene, d.camera);
            return readStats(label);
        }
        
        const results = {};
        
        // EXACT pixel-dump test2 setup (KNOWN WORKING)
        d.camera.position.set(0, 50, 0);
        d.camera.lookAt(0, 50, -100);
        d.camera.updateMatrixWorld(true);
        results.known_working = renderAndRead('known_working');
        
        // Game default camera
        const jp = d.josh.getPosition();
        d.camera.position.set(5, 4.16, 16.63);
        d.camera.lookAt(5, 1.19, 5);
        d.camera.updateMatrixWorld(true);
        results.game_default = renderAndRead('game_default');
        
        // Camera pointing 15° ABOVE horizontal from same position
        d.camera.position.set(5, 4.16, 16.63);
        d.camera.lookAt(5, 4.16 + Math.sin(0.26)*30, 16.63 - Math.cos(0.26)*30);
        d.camera.updateMatrixWorld(true);
        results.slightly_up = renderAndRead('slightly_up');
        
        // Camera looking at horizon from game position
        d.camera.position.set(5, 4.16, 16.63);
        d.camera.lookAt(5, 4.16, -100);
        d.camera.updateMatrixWorld(true);
        results.at_horizon = renderAndRead('at_horizon');
        
        // Camera looking slightly above horizon
        d.camera.position.set(5, 4.16, 16.63);
        d.camera.lookAt(5, 6, -100);
        d.camera.updateMatrixWorld(true);
        results.above_horizon = renderAndRead('above_horizon');
        
        // Same as game default but terrain HIDDEN
        d.camera.position.set(5, 4.16, 16.63);
        d.camera.lookAt(5, 1.19, 5);
        d.camera.updateMatrixWorld(true);
        const terrainMesh = d.field.children.find(c => c.name === 'terrain');
        terrainMesh.visible = false;
        results.game_no_terrain = renderAndRead('game_no_terrain');
        terrainMesh.visible = true;
        
        // What objects are between the camera and the sky?
        // Let's check if Josh's model or other objects are blocking
        const allObjects = [];
        d.scene.traverse(obj => {
            if (obj.isMesh && obj.visible) {
                allObjects.push({
                    name: obj.name || obj.uuid.substr(0,8),
                    type: obj.geometry?.type,
                    posY: obj.getWorldPosition(new d.camera.position.constructor()).y.toFixed(1),
                    renderOrder: obj.renderOrder,
                    matType: obj.material?.type,
                    depthTest: obj.material?.depthTest,
                    side: obj.material?.side,
                });
            }
        });
        results.allMeshes = allObjects;
        
        return results;
    });

    console.log('=== DEFINITIVE CAMERA TEST ===\n');
    
    for (const [key, val] of Object.entries(result)) {
        if (key === 'allMeshes') continue;
        if (typeof val !== 'object' || !val.sky) continue;
        const ok = val.sky > 5;
        console.log(`${ok?'✅':'❌'} ${key.padEnd(22)} sky=${val.sky}% green=${val.green}% topSky=${val.topSky}% topGreen=${val.topGreen}%`);
        console.log(`   top: ${val.topSamples.join(' ')}  mid: ${val.midSamples.join(' ')}`);
    }
    
    console.log('\n--- All visible meshes ---');
    if (result.allMeshes) {
        for (const m of result.allMeshes) {
            console.log(`  ${m.name.padEnd(20)} geo=${m.type?.padEnd(18)} y=${m.posY} order=${m.renderOrder} mat=${m.matType} depth=${m.depthTest} side=${m.side}`);
        }
    }

    await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
