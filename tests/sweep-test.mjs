/**
 * Minimal targeted test - just the camera configs, no mesh list
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
            return { 
                sky: Math.round(sky/n*100), 
                green: Math.round(green/n*100),
                topPx: `(${px[topIdx]},${px[topIdx+1]},${px[topIdx+2]})`,
                midPx: `(${px[midIdx]},${px[midIdx+1]},${px[midIdx+2]})`,
            };
        }
        
        function test(label, posx, posy, posz, lax, lay, laz) {
            d.camera.position.set(posx, posy, posz);
            d.camera.lookAt(lax, lay, laz);
            d.camera.updateMatrixWorld(true);
            d.renderer.setRenderTarget(rt);
            d.renderer.render(d.scene, d.camera);
            return readStats();
        }

        const jp = d.josh.getPosition();
        const r = {};
        
        // Test configs
        r.t01_horizon_50up     = test('a', 0, 50, 0,   0, 50, -100);
        r.t02_game_default     = test('b', 5, 4.16, 16.63,  5, 1.19, 5);
        r.t03_game_pos_horizon = test('c', 5, 4.16, 16.63,  5, 4.16, -100);
        r.t04_above_horizon    = test('d', 5, 4.16, 16.63,  5, 6, -100);
        r.t05_look_up_15deg    = test('e', 5, 4.16, 16.63,  5, 4.16+Math.sin(0.26)*50, 16.63-Math.cos(0.26)*50);
        r.t06_straight_up      = test('f', 5, 4.16, 16.63,  5, 104, 16.63);
        
        // Exhaustive angle sweep: slowly tilt camera from looking down to looking up
        for (let deg = -30; deg <= 30; deg += 10) {
            const rad = deg * Math.PI / 180;
            const ly = 4.16 + Math.sin(rad) * 50;
            const lz = 16.63 - Math.cos(rad) * 50;
            r[`sweep_${deg}deg`] = test(`sweep_${deg}`, 5, 4.16, 16.63, 5, ly, lz);
        }
        
        return r;
    });

    console.log('=== CAMERA ANGLE SWEEP ===\n');
    for (const [key, val] of Object.entries(result)) {
        const ok = val.sky > 10;
        console.log(`${ok?'OK':'--'} ${key.padEnd(25)} sky=${String(val.sky).padStart(3)}% green=${String(val.green).padStart(3)}% top=${val.topPx} mid=${val.midPx}`);
    }

    await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
