/**
 * Full usability verification: Is the game playable?
 * - Sky visible
 * - Josh visible
 * - Camera follows
 * - Movement works
 * - Objects visible (trees, bench, etc.)
 */
import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto('http://localhost:8080?nocache=' + Date.now(), { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Dismiss tutorial overlay
    await page.click('body');
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
        const d = window.__JMFW__;
        const gl = d.renderer.getContext();
        const rt = d.postProcess.renderTarget;
        const w = rt.width, h = rt.height;
        
        function readStats() {
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
            let sky=0,green=0,other=0,n=0;
            let avgR=0,avgG=0,avgB=0;
            for(let i=0;i<px.length;i+=4){
                const r=px[i],g=px[i+1],b=px[i+2];n++;
                avgR+=r;avgG+=g;avgB+=b;
                if(g>r*1.3&&g>b*1.3&&g>20) green++;
                else if(b>80&&g>60&&r<200) sky++;
                else other++;
            }
            return { 
                sky: Math.round(sky/n*100), 
                green: Math.round(green/n*100),
                other: Math.round(other/n*100),
                brightness: Math.round((avgR+avgG+avgB)/(n*3)),
                uniqueColors: new Set(Array.from({length: Math.min(n, 10000)}, (_,idx) => {
                    const i = idx * 4;
                    return `${px[i]},${px[i+1]},${px[i+2]}`;
                })).size,
            };
        }
        
        const checks = {};
        
        // 1. Initial render check
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        checks.initialRender = readStats();
        
        // 2. Josh position check
        const jp = d.josh.getPosition();
        checks.josh = {
            x: +jp.x.toFixed(2),
            y: +jp.y.toFixed(2),
            z: +jp.z.toFixed(2),
            visible: d.josh.model.visible,
        };
        
        // 3. Camera check
        checks.camera = {
            x: +d.camera.position.x.toFixed(2),
            y: +d.camera.position.y.toFixed(2),
            z: +d.camera.position.z.toFixed(2),
            aboveTerrain: d.camera.position.y > 1,
        };
        
        // 4. Simulate movement (advance Josh forward)
        const startPos = d.josh.getPosition().clone();
        d.josh.update(0.1, { moveX: 0, moveZ: -1, jump: false, interact: false }, 0);
        d.josh.update(0.1, { moveX: 0, moveZ: -1, jump: false, interact: false }, 0);
        d.josh.update(0.1, { moveX: 0, moveZ: -1, jump: false, interact: false }, 0);
        const endPos = d.josh.getPosition();
        checks.movement = {
            startZ: +startPos.z.toFixed(2),
            endZ: +endPos.z.toFixed(2),
            moved: Math.abs(endPos.z - startPos.z) > 0.01,
        };
        
        // 5. Update camera to follow moved Josh
        d.cameraCtrl.update(0.5, {mouseDeltaX:0, mouseDeltaY:0, scrollDelta:0}, d.josh.getPosition());
        d.renderer.setRenderTarget(rt);
        d.renderer.render(d.scene, d.camera);
        checks.afterMovement = readStats();
        
        // 6. Visible objects count
        let visibleMeshes = 0;
        d.scene.traverse(obj => {
            if (obj.isMesh) {
                // Check if effectively visible (all ancestors visible)
                let o = obj;
                let vis = true;
                while (o) {
                    if (!o.visible) { vis = false; break; }
                    o = o.parent;
                }
                if (vis) visibleMeshes++;
            }
        });
        checks.visibleMeshes = visibleMeshes;
        
        // 7. Render info
        const info = d.renderer.info;
        checks.renderInfo = {
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            textures: info.memory.textures,
        };
        
        // 8. Terrain PS1 vertex shader check
        const terrainMesh = d.field.children.find(c => c.name === 'terrain');
        checks.shaderFixed = !terrainMesh.material.vertexShader.includes('max(clipPos.w, 0.0001)');
        
        return checks;
    });

    console.log('=== GAME USABILITY VERIFICATION ===\n');
    
    const pass = (label, ok) => console.log(`${ok?'✅':'❌'} ${label}`);
    
    // Render checks
    pass(`Sky visible: ${result.initialRender.sky}%`, result.initialRender.sky > 10);
    pass(`Terrain visible: ${result.initialRender.green}%`, result.initialRender.green > 20);
    pass(`Other objects: ${result.initialRender.other}%`, result.initialRender.other > 0);
    pass(`Not too dark: brightness=${result.initialRender.brightness}`, result.initialRender.brightness > 30);
    pass(`Visual variety: ${result.initialRender.uniqueColors} unique colors`, result.initialRender.uniqueColors > 10);
    
    // Josh
    pass(`Josh visible: ${result.josh.visible}`, result.josh.visible);
    pass(`Josh position valid: (${result.josh.x}, ${result.josh.y}, ${result.josh.z})`, 
        Math.abs(result.josh.x) < 100 && Math.abs(result.josh.z) < 100);
    
    // Camera
    pass(`Camera above terrain: y=${result.camera.y}`, result.camera.aboveTerrain);
    
    // Movement
    pass(`Josh can move: ${result.movement.startZ} → ${result.movement.endZ}`, result.movement.moved);
    
    // After movement
    pass(`Sky still visible after movement: ${result.afterMovement.sky}%`, result.afterMovement.sky > 10);
    
    // Scene
    pass(`Visible meshes: ${result.visibleMeshes}`, result.visibleMeshes > 3);
    pass(`Draw calls: ${result.renderInfo.drawCalls}`, result.renderInfo.drawCalls > 0);
    pass(`Triangles: ${result.renderInfo.triangles}`, result.renderInfo.triangles > 100);
    
    // Shader fix
    pass(`PS1 shader fix applied`, result.shaderFixed);
    
    // Errors
    pass(`No JS errors: ${errors.length} errors`, errors.length === 0);
    if (errors.length > 0) {
        errors.forEach(e => console.log(`   [ERR] ${e}`));
    }
    
    const allPass = [
        result.initialRender.sky > 10,
        result.initialRender.green > 20,
        result.initialRender.brightness > 30,
        result.josh.visible,
        result.camera.aboveTerrain,
        result.movement.moved,
        result.afterMovement.sky > 10,
        result.shaderFixed,
    ].every(Boolean);
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(allPass ? '✅ GAME IS PLAYABLE!' : '❌ GAME HAS ISSUES');
    console.log(`${'='.repeat(50)}`);

    await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
