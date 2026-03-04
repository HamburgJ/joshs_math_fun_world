/**
 * Minimal sync pixel read — reads pixels via WebGL readPixels
 * immediately after manual render, no requestAnimationFrame delay.
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

        const canvas = document.querySelector('canvas');
        const gl = d.renderer.getContext();
        const out = {};

        // Helper: render and read pixels synchronously
        function renderAndRead(label, setupFn) {
            setupFn();
            // Render to render target
            d.renderer.setRenderTarget(d.postProcess.renderTarget);
            d.renderer.render(d.scene, d.camera);
            
            // Read from render target (not the screen — avoids preserveDrawingBuffer issue)
            const rt = d.postProcess.renderTarget;
            const w = rt.width, h = rt.height;
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);

            let tR=0,tG=0,tB=0,sky=0,green=0,dark=0,n=0;
            for(let i=0;i<px.length;i+=16){
                const r=px[i],g=px[i+1],b=px[i+2];
                tR+=r;tG+=g;tB+=b;n++;
                if(r<30&&g<30&&b<30) dark++;
                if(g>r*1.3&&g>b*1.3&&g>20) green++;
                if(b>80&&g>60) sky++;
            }

            // Also read specific pixel rows
            const row0 = [], rowMid = [], rowBot = [];
            for (let x = 0; x < w; x += 40) {
                const i0 = ((h-1)*w + x)*4;
                row0.push([px[i0],px[i0+1],px[i0+2]]);
                const im = (Math.floor(h/2)*w + x)*4;
                rowMid.push([px[im],px[im+1],px[im+2]]);
                const ib = (x)*4;
                rowBot.push([px[ib],px[ib+1],px[ib+2]]);
            }

            return {
                avgR: Math.round(tR/n), avgG: Math.round(tG/n), avgB: Math.round(tB/n),
                brightness: Math.round((tR+tG+tB)/(n*3)),
                skyPct: Math.round(sky/n*100),
                greenPct: Math.round(green/n*100),
                darkPct: Math.round(dark/n*100),
                topRow: row0, midRow: rowMid, botRow: rowBot,
            };
        }

        const jp = d.josh.getPosition();

        // Test 1: current state
        out.test1_current = renderAndRead('current', () => {
            // Don't change anything, just re-render
        });

        // Test 2: camera high above looking down
        out.test2_high = renderAndRead('high', () => {
            d.camera.position.set(jp.x, jp.y + 30, jp.z + 5);
            d.camera.lookAt(jp.x, jp.y, jp.z);
        });

        // Test 3: camera at a completely different position
        out.test3_far = renderAndRead('far', () => {
            d.camera.position.set(0, 20, 50);
            d.camera.lookAt(0, 0, 0);
        });

        // Test 4: make terrain invisible and render
        const terrainMesh = d.field.children.find(c => c.name === 'terrain');
        out.test4_noterrain = renderAndRead('no_terrain', () => {
            terrainMesh.visible = false;
            d.camera.position.set(0, 5, 20);
            d.camera.lookAt(0, 0, 0);
        });
        terrainMesh.visible = true;

        // Test 5: hide EVERYTHING except sky dome
        out.test5_skyonly = renderAndRead('sky_only', () => {
            d.field.visible = false;
            d.josh.model.visible = false;
            d.scene.children.forEach(c => {
                if (c.type === 'Group' && c.name !== '') c.visible = false;
            });
            d.camera.position.set(0, 5, 0);
            d.camera.lookAt(0, 5, -10);
        });
        // Restore all
        d.field.visible = true;
        d.josh.model.visible = true;
        d.scene.children.forEach(c => { c.visible = true; });
        // Re-hide zone groups
        for (const child of d.scene.children) {
            if (child.type === 'Group' && child.name && child.name !== 'fieldWorld' && child.name !== 'josh') {
                child.visible = false;
            }
        }

        // Test 6: render with a totally fresh scene (just a box)
        out.test6_basic = (() => {
            // Can't import THREE easily, but we can get constructor from existing objects
            const THREE_Color = d.scene.background.constructor;
            const camBackup = d.camera.position.clone();
            const tempScene = new d.scene.constructor();
            tempScene.background = new THREE_Color(1, 0, 0); // RED background

            d.renderer.setRenderTarget(d.postProcess.renderTarget);
            d.renderer.render(tempScene, d.camera);

            const rt = d.postProcess.renderTarget;
            const w = rt.width, h = rt.height;
            const px = new Uint8Array(w*h*4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);

            let tR=0,tG=0,tB=0,n=0;
            for(let i=0;i<px.length;i+=16){tR+=px[i];tG+=px[i+1];tB+=px[i+2];n++;}
            d.camera.position.copy(camBackup);
            return { avgR:Math.round(tR/n), avgG:Math.round(tG/n), avgB:Math.round(tB/n), brightness:Math.round((tR+tG+tB)/(n*3)) };
        })();

        out.joshPos = { x: jp.x.toFixed(2), y: jp.y.toFixed(2), z: jp.z.toFixed(2) };
        out.rendererInfo = {
            calls: d.renderer.info.render.calls,
            triangles: d.renderer.info.render.triangles,
        };

        return out;
    });

    console.log('=== Sync Pixel Read Results ===\n');
    console.log(`Josh at: (${result.joshPos.x}, ${result.joshPos.y}, ${result.joshPos.z})`);
    console.log(`Last render: ${result.rendererInfo.calls} calls, ${result.rendererInfo.triangles} tris\n`);

    for (const [key, val] of Object.entries(result)) {
        if (key === 'joshPos' || key === 'rendererInfo') continue;
        if (val.error) { console.log(`${key}: ERROR ${val.error}`); continue; }
        const skyStatus = (val.skyPct > 5 || val.brightness > 50) ? '✅' : '❌';
        console.log(`${skyStatus} ${key.padEnd(20)} rgb=(${val.avgR},${val.avgG},${val.avgB}) bright=${val.brightness} sky=${val.skyPct}% green=${val.greenPct||'-'}% dark=${val.darkPct||'-'}%`);
        if (val.topRow) console.log(`     top: ${JSON.stringify(val.topRow)}`);
    }

    await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
