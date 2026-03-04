/**
 * Test: What happens when we fix the PS1 shader's behind-camera vertex handling?
 * Also test wireframe mode to see terrain coverage.
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
        const THREE = d.scene.constructor.__proto__; // won't work, use another approach
        
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
            };
        }
        
        function test(setupFn) {
            setupFn();
            d.renderer.setRenderTarget(rt);
            d.renderer.render(d.scene, d.camera);
            return readStats();
        }
        
        const terrainMesh = d.field.children.find(c => c.name === 'terrain');
        const jp = d.josh.getPosition();
        const r = {};
        
        // Setup camera
        function setGameCamera() {
            d.camera.position.set(5, 4.16, 16.63);
            d.camera.lookAt(5, 4.16, -100); // looking at horizon
            d.camera.updateMatrixWorld(true);
        }
        
        // Test 1: Normal terrain, looking at horizon
        r.t1_normal = test(() => setGameCamera());
        
        // Test 2: Wireframe terrain
        r.t2_wireframe = test(() => {
            setGameCamera();
            terrainMesh.material.wireframe = true;
        });
        terrainMesh.material.wireframe = false;
        
        // Test 3: Change material to discard behind-camera vertices
        // Save old vertex shader
        const origVert = terrainMesh.material.vertexShader;
        r.t3_nodisplace = test(() => {
            setGameCamera();
            // Replace the vertex shader with one that clips behind-camera verts
            terrainMesh.material.vertexShader = `
                varying vec3 vColor;
                varying vec3 vNormal;
                varying float vFogDepth;
                uniform float uSnap;
                void main() {
                    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
                    vec4 clipPos = projectionMatrix * viewPos;
                    
                    // SKIP vertex snapping entirely
                    gl_Position = clipPos;
                    
                    vColor = color;
                    vNormal = normalize(normalMatrix * normal);
                    vFogDepth = -viewPos.z;
                }
            `;
            terrainMesh.material.needsUpdate = true;
        });
        
        // Test 4: Just use MeshBasicMaterial (green)
        const origMat = terrainMesh.material;
        r.t4_basicMat = test(() => {
            setGameCamera();
            // Can't create new material without THREE import, but we can test
            // by making the terrain side = DoubleSide
            terrainMesh.material = origMat;
            terrainMesh.material.vertexShader = origVert;
            terrainMesh.material.needsUpdate = true;
        });
        
        // Test 5: Check the terrain's side property
        r.terrainSide = terrainMesh.material.side; // 0=FrontSide, 1=BackSide, 2=DoubleSide
        
        // Test 6: Hide EVERYTHING except sky, render looking at horizon
        r.t6_hideAll = test(() => {
            setGameCamera();
            d.field.visible = false;
            // Also hide Josh and any other objects
            d.josh.model.visible = false;
        });
        d.field.visible = true;
        d.josh.model.visible = true;
        
        // Test 7: With non-snapping shader, looking at horizon
        r.t7_nSnap_horizon = test(() => {
            setGameCamera();
            terrainMesh.material.vertexShader = `
                varying vec3 vColor;
                varying vec3 vNormal;
                varying float vFogDepth;
                uniform float uSnap;
                void main() {
                    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * viewPos;
                    vColor = color;
                    vNormal = normalize(normalMatrix * normal);
                    vFogDepth = -viewPos.z;
                }
            `;
            terrainMesh.material.needsUpdate = true;
        });
        
        // Restore
        terrainMesh.material.vertexShader = origVert;
        terrainMesh.material.needsUpdate = true;
        
        // Test 8: Count how many terrain vertices are in front of camera
        let behindCam = 0, inFrontCam = 0;
        {
            // Camera is at (5, 4.16, 16.63) looking at (5, 4.16, -100)
            // In view space, "in front" means viewPos.z < 0
            // We need to transform terrain vertices to view space
            const pos = terrainMesh.geometry.attributes.position;
            // view matrix = camera.matrixWorldInverse
            setGameCamera();
            const viewMat = d.camera.matrixWorldInverse;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
                // Apply modelMatrix (terrain is in field group which is at origin)
                // Then apply viewMatrix
                const vz = viewMat.elements[8]*x + viewMat.elements[9]*y + viewMat.elements[10]*z + viewMat.elements[11];
                // In view space, z < 0 means in front of camera
                if (vz < 0) inFrontCam++; else behindCam++;
            }
        }
        r.vertexStats = { total: behindCam + inFrontCam, behindCam, inFrontCam };
        
        // Test 9: Frustum culling check
        r.frustumCulled = terrainMesh.frustumCulled;
        
        return r;
    });

    console.log('=== SHADER & MATERIAL TESTS ===\n');
    for (const [key, val] of Object.entries(result)) {
        if (typeof val === 'object' && 'sky' in val) {
            const ok = val.sky > 10;
            console.log(`${ok?'OK':'--'} ${key.padEnd(22)} sky=${String(val.sky).padStart(3)}% green=${String(val.green).padStart(3)}% top=${val.topPx}`);
        } else {
            console.log(`   ${key.padEnd(22)} = ${JSON.stringify(val)}`);
        }
    }

    await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
