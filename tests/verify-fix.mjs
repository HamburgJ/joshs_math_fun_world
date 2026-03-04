/**
 * Verify the PS1 shader fix: terrain should no longer cover the entire sky.
 */
import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    page.on('pageerror', err => console.log(`[ERR] ${err.message}`));
    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[CONSOLE ERR] ${msg.text()}`);
    });
    
    // Use cache-busting
    await page.goto('http://localhost:8080?nocache=' + Date.now(), { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
        const d = window.__JMFW__;
        const gl = d.renderer.getContext();
        const rt = d.postProcess.renderTarget;
        const w = rt.width, h = rt.height;
        
        function readStats() {
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
            let sky=0,green=0,n=0;
            for(let i=0;i<px.length;i+=4){
                const r=px[i],g=px[i+1],b=px[i+2];n++;
                if(g>r*1.3&&g>b*1.3&&g>20) green++;
                if(b>80&&g>60&&r<200) sky++;
            }
            const topIdx = (h-1)*w*4 + Math.floor(w/2)*4;
            const midIdx = Math.floor(h/2)*w*4 + Math.floor(w/2)*4;
            const botIdx = Math.floor(w/2)*4;
            return { 
                sky: Math.round(sky/n*100), green: Math.round(green/n*100),
                topPx: `(${px[topIdx]},${px[topIdx+1]},${px[topIdx+2]})`,
                midPx: `(${px[midIdx]},${px[midIdx+1]},${px[midIdx+2]})`,
                botPx: `(${px[botIdx]},${px[botIdx+1]},${px[botIdx+2]})`,
            };
        }
        
        const jp = d.josh.getPosition();
        const r = {};
        
        // Check the shader source to confirm fix is loaded
        const terrainMesh = d.field.children.find(c => c.name === 'terrain');
        r.shaderHasOldBug = terrainMesh.material.vertexShader.includes('max(clipPos.w, 0.0001)');
        r.shaderHasNewFix = terrainMesh.material.vertexShader.includes('clipPos.w > 0.0');
        
        // Test 1: Game default camera
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        r.t1_gameDefault = readStats();
        
        // Test 2: Looking at horizon
        d.camera.position.set(5, 4.16, 16.63);
        d.camera.lookAt(5, 4.16, -100);
        d.camera.updateMatrixWorld(true);
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        r.t2_horizon = readStats();
        
        // Test 3: Slightly above horizon
        d.camera.position.set(5, 4.16, 16.63);
        d.camera.lookAt(5, 6, -100);
        d.camera.updateMatrixWorld(true);
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        r.t3_aboveHorizon = readStats();
        
        // Test 4: Third-person behind Josh (game's actual camera angle)
        d.camera.position.set(jp.x, jp.y + 5, jp.z + 12);
        d.camera.lookAt(jp.x, jp.y + 1.8, jp.z);
        d.camera.updateMatrixWorld(true);
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        r.t4_thirdPerson = readStats();
        
        return r;
    });

    console.log('=== PS1 SHADER FIX VERIFICATION ===\n');
    console.log(`Shader has OLD bug (max(w,0.0001)):  ${result.shaderHasOldBug}`);
    console.log(`Shader has NEW fix (w > 0.0):        ${result.shaderHasNewFix}`);
    console.log('');
    
    for (const [key, val] of Object.entries(result)) {
        if (typeof val !== 'object' || !('sky' in val)) continue;
        const ok = val.sky > 10;
        console.log(`${ok?'✅':'❌'} ${key.padEnd(22)} sky=${String(val.sky).padStart(3)}% green=${String(val.green).padStart(3)}%  top=${val.topPx}  mid=${val.midPx}  bot=${val.botPx}`);
    }
    
    const anyFailed = Object.values(result).some(v => typeof v === 'object' && 'sky' in v && v.sky < 10);
    console.log(`\n${anyFailed ? '❌ FIX NOT WORKING' : '✅ ALL TESTS PASS — SKY IS VISIBLE!'}`);

    await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
