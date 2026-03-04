/**
 * Quick runtime state diagnostic.
 * main.js now exposes window.__JMFW__ with game objects.
 * 
 * Run: node tests/state-check.mjs
 */

import { chromium } from 'playwright';

async function run() {
    console.log('=== Game State Check ===\n');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

    page.on('pageerror', err => console.log(`  [PAGE ERROR] ${err.message}`));
    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`  [console.error] ${msg.text()}`);
    });

    await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Read game state
    const state = await page.evaluate(() => {
        return new Promise(resolve => {
            // Wait 2 more frames to ensure render cycle has run
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const d = window.__JMFW__;
                    if (!d) { resolve({ error: '__JMFW__ not found on window' }); return; }

                    try {
                        const jp = d.josh.getPosition();
                        const cp = d.camera.position;
                        const cc = d.cameraCtrl.currentPosition;

                        // Try to get terrain height at Josh and camera positions
                        // by looking at the field mesh geometry
                        let terrainAtJosh = 'N/A';
                        let terrainAtCam = 'N/A';
                        
                        // Find terrain mesh in field children
                        const terrainMesh = d.field.children.find(c => c.name === 'terrain');
                        
                        // Also check if the camera lookAt target is reasonable
                        const lookAtY = jp.y + 1.8;

                        // Compute what the camera SHOULD be at
                        const pitch = d.cameraCtrl.pitchAngle;
                        const dist = d.cameraCtrl.distance;
                        const orbit = d.cameraCtrl.orbitAngle;
                        const expectedOffsetY = Math.sin(pitch) * dist;
                        const expectedCamY = lookAtY + expectedOffsetY;

                        // Compute angle from camera to lookAt (how much of view is terrain)
                        const dx = cp.x - jp.x;
                        const dy = cp.y - (jp.y + 1.8);
                        const dz = cp.z - jp.z;
                        const horizDist = Math.sqrt(dx*dx + dz*dz);
                        const viewAngle = Math.atan2(dy, horizDist) * 180 / Math.PI;

                        // Get scene fog
                        const fog = d.scene.fog;

                        // Get camera world direction
                        const dir = new d.camera.position.constructor(); // THREE.Vector3
                        d.camera.getWorldDirection(dir);

                        resolve({
                            josh: { x: jp.x.toFixed(3), y: jp.y.toFixed(3), z: jp.z.toFixed(3) },
                            camera: { x: cp.x.toFixed(3), y: cp.y.toFixed(3), z: cp.z.toFixed(3) },
                            cameraCtrl: { x: cc.x.toFixed(3), y: cc.y.toFixed(3), z: cc.z.toFixed(3) },
                            cameraDir: { x: dir.x.toFixed(3), y: dir.y.toFixed(3), z: dir.z.toFixed(3) },
                            pitch: pitch.toFixed(4),
                            distance: dist.toFixed(2),
                            orbit: orbit.toFixed(4),
                            fov: d.camera.fov,
                            aspect: d.camera.aspect.toFixed(4),
                            near: d.camera.near,
                            far: d.camera.far,
                            lookAtY: lookAtY.toFixed(3),
                            expectedCamY: expectedCamY.toFixed(3),
                            viewAngle: viewAngle.toFixed(1),
                            sceneChildren: d.scene.children.map(c => ({
                                type: c.type,
                                name: c.name || '(unnamed)',
                                visible: c.visible,
                                pos: c.position ? `${c.position.x.toFixed(1)},${c.position.y.toFixed(1)},${c.position.z.toFixed(1)}` : 'N/A',
                            })),
                            fieldChildren: d.field.children.length,
                            terrainExists: !!terrainMesh,
                            terrainVisible: terrainMesh?.visible,
                            terrainGeoVertCount: terrainMesh?.geometry?.attributes?.position?.count,
                            fogType: fog ? fog.constructor.name : 'none',
                            fogNear: fog?.near,
                            fogFar: fog?.far,
                            fogColor: fog?.color ? `${fog.color.r.toFixed(2)},${fog.color.g.toFixed(2)},${fog.color.b.toFixed(2)}` : 'N/A',
                            bgColor: d.scene.background ? `${d.scene.background.r.toFixed(2)},${d.scene.background.g.toFixed(2)},${d.scene.background.b.toFixed(2)}` : 'N/A',
                            rendererInfo: {
                                programs: d.renderer.info.programs?.length,
                                geometries: d.renderer.info.memory?.geometries,
                                textures: d.renderer.info.memory?.textures,
                                calls: d.renderer.info.render?.calls,
                                triangles: d.renderer.info.render?.triangles,
                            },
                            activeZone: d.registry?.activeZone,
                        });
                    } catch(e) {
                        resolve({ error: e.message, stack: e.stack?.split('\n').slice(0, 5).join('\n') });
                    }
                });
            });
        });
    });

    if (state.error) {
        console.log(`ERROR: ${state.error}`);
        if (state.stack) console.log(state.stack);
        await browser.close();
        process.exit(1);
    }

    console.log('── Positions ──');
    console.log(`  Josh:       (${state.josh.x}, ${state.josh.y}, ${state.josh.z})`);
    console.log(`  Camera:     (${state.camera.x}, ${state.camera.y}, ${state.camera.z})`);
    console.log(`  Cam ctrl:   (${state.cameraCtrl.x}, ${state.cameraCtrl.y}, ${state.cameraCtrl.z})`);
    console.log(`  Camera dir: (${state.cameraDir.x}, ${state.cameraDir.y}, ${state.cameraDir.z})`);

    console.log('\n── Camera Config ──');
    console.log(`  Pitch:      ${state.pitch} rad (${(parseFloat(state.pitch) * 180/Math.PI).toFixed(1)}°)`);
    console.log(`  Distance:   ${state.distance}`);
    console.log(`  Orbit:      ${state.orbit} rad`);
    console.log(`  FOV:        ${state.fov}°`);
    console.log(`  Aspect:     ${state.aspect}`);
    console.log(`  Near/Far:   ${state.near} / ${state.far}`);

    console.log('\n── Computed ──');
    console.log(`  LookAt Y:    ${state.lookAtY}`);
    console.log(`  Expected cam Y: ${state.expectedCamY}`);
    console.log(`  View angle:  ${state.viewAngle}° (positive = looking down, negative = looking up)`);

    console.log('\n── Scene ──');
    console.log(`  Active zone:  ${state.activeZone}`);
    console.log(`  Children (${state.sceneChildren.length}):`);
    for (const c of state.sceneChildren) {
        console.log(`    ${c.type} "${c.name}" visible=${c.visible} pos=(${c.pos})`);
    }
    console.log(`  Field children: ${state.fieldChildren}`);
    console.log(`  Terrain: exists=${state.terrainExists}, visible=${state.terrainVisible}, verts=${state.terrainGeoVertCount}`);

    console.log('\n── Fog ──');
    console.log(`  Type:  ${state.fogType}`);
    console.log(`  Near:  ${state.fogNear}`);
    console.log(`  Far:   ${state.fogFar}`);
    console.log(`  Color: ${state.fogColor}`);
    console.log(`  BG:    ${state.bgColor}`);

    console.log('\n── Renderer ──');
    console.log(`  Programs:   ${state.rendererInfo.programs}`);
    console.log(`  Geometries: ${state.rendererInfo.geometries}`);
    console.log(`  Textures:   ${state.rendererInfo.textures}`);
    console.log(`  Draw calls: ${state.rendererInfo.calls}`);
    console.log(`  Triangles:  ${state.rendererInfo.triangles}`);

    // ── DIAGNOSIS ──
    console.log('\n══════════════════════════════════════════════');
    console.log('  DIAGNOSIS');
    console.log('══════════════════════════════════════════════');

    const camY = parseFloat(state.camera.y);
    const joshY = parseFloat(state.josh.y);
    const viewAngle = parseFloat(state.viewAngle);
    const pitch = parseFloat(state.pitch);
    const distance = parseFloat(state.distance);
    const camDirY = parseFloat(state.cameraDir.y);

    if (camY <= joshY) {
        console.log(`  🔴 Camera Y (${camY}) <= Josh Y (${joshY}) → Camera is AT or BELOW Josh`);
    }
    if (camY < 1) {
        console.log(`  🔴 Camera Y is very low (${camY}) → likely near/in terrain`);
    }
    if (Math.abs(viewAngle) < 5) {
        console.log(`  🔴 View angle near 0° → camera looking nearly horizontal AT terrain`);
    }
    if (viewAngle > 0 && viewAngle < 20) {
        console.log(`  🟡 View angle ${viewAngle}° → camera slightly above, mostly ground visible`);
    }
    if (camDirY < -0.5) {
        console.log(`  🔴 Camera pointing steeply downward (dir.y = ${camDirY})`);
    }
    if (state.rendererInfo.triangles === 0) {
        console.log(`  🔴 Zero triangles rendered → scene geometry not being drawn`);
    }
    if (state.rendererInfo.calls === 0) {
        console.log(`  🔴 Zero draw calls → nothing is being rendered`);
    }

    // Check if camera could be INSIDE the terrain
    // Terrain at (5,5) should have some positive Y via noise
    if (camY > 0 && camY < 3 && joshY > -2 && joshY < 5) {
        console.log(`  🟡 Camera and Josh positions look reasonable but scene still appears dark green`);
        console.log(`     This suggests a rendering/material issue rather than a position issue`);
    }

    await page.screenshot({ path: 'tests/screenshot-state.png' });
    console.log('\n  Screenshot: tests/screenshot-state.png');

    await browser.close();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
