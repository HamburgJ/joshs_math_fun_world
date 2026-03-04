/**
 * Test if vertex snapping in ps1-material is causing terrain to cover sky.
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
        const gl = d.renderer.getContext();
        const rt = d.postProcess.renderTarget;

        function readRT() {
            const w = rt.width, h = rt.height;
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
            let tR=0,tG=0,tB=0,sky=0,green=0,n=0;
            for(let i=0;i<px.length;i+=16){
                const r=px[i],g=px[i+1],b=px[i+2];
                tR+=r;tG+=g;tB+=b;n++;
                if(g>r*1.3&&g>b*1.3&&g>20) green++;
                if(b>80&&g>60) sky++;
            }
            // top quarter
            let topSky=0,topN=0;
            const topEnd = Math.floor(h*0.25)*w*4;
            for(let i=0;i<topEnd;i+=16){
                const r=px[i],g=px[i+1],b=px[i+2];topN++;
                if(b>80&&g>60) topSky++;
            }
            return {
                avgR:Math.round(tR/n),avgG:Math.round(tG/n),avgB:Math.round(tB/n),
                brightness:Math.round((tR+tG+tB)/(n*3)),
                skyPct:Math.round(sky/n*100),greenPct:Math.round(green/n*100),
                topSkyPct:Math.round(topSky/Math.max(topN,1)*100),
            };
        }

        function renderAndRead(label) {
            d.renderer.setRenderTarget(rt);
            d.renderer.render(d.scene, d.camera);
            return readRT();
        }

        const jp = d.josh.getPosition();
        const terrainMesh = d.field.children.find(c => c.name === 'terrain');
        const results = {};

        // Setup a good camera position for all tests
        d.camera.position.set(jp.x, jp.y + 10, jp.z + 15);
        d.camera.lookAt(jp.x, jp.y + 1.8, jp.z);

        // Test A: current (snap=320)
        results.a_snap320 = renderAndRead();

        // Test B: disable vertex snapping entirely (snap=0 or very low)
        terrainMesh.material.uniforms.uSnap.value = 1;
        results.b_snap1 = renderAndRead();

        // Test C: high snap (should be fine)
        terrainMesh.material.uniforms.uSnap.value = 10000;
        results.c_snap10000 = renderAndRead();
        
        // Restore
        terrainMesh.material.uniforms.uSnap.value = 320;

        // Test D: use a basic MeshBasicMaterial instead
        const origMat = terrainMesh.material;
        // We can't easily create new material classes without THREE import
        // But we can test by changing the vertex shader
        
        // Test E: completely replace the material with something basic
        // Access THREE via an existing object
        const Color = d.scene.background.constructor;
        const MeshBasicMat = terrainMesh.material.constructor; // ShaderMaterial - won't help
        
        // Instead, test with fog disabled
        const origFog = d.scene.fog;
        d.scene.fog = null;
        terrainMesh.material.uniforms.uSnap.value = 10000;
        results.e_nofog_nosnap = renderAndRead();
        d.scene.fog = origFog;
        terrainMesh.material.uniforms.uSnap.value = 320;

        return results;
    });

    console.log('=== Vertex Snapping Tests ===\n');
    for (const [key, val] of Object.entries(result)) {
        const ok = val.skyPct > 5 || val.topSkyPct > 10;
        console.log(`${ok?'✅':'❌'} ${key.padEnd(20)} rgb=(${val.avgR},${val.avgG},${val.avgB}) bright=${val.brightness} sky=${val.skyPct}% topSky=${val.topSkyPct}% green=${val.greenPct}%`);
    }

    await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
