/**
 * hub-assets.js — Big detailed set-pieces for the hub world.
 *
 * Ferris wheel, windmill, stream, parkour tower, bushes, covered bridge,
 * lampposts, and picnic area. All PS1-style chunky geometry.
 *
 * Shell Bingby says: "A world without things in it is just a floor."
 */

import * as THREE from 'three';
import { getTerrainHeight } from './noise.js';
import { createPS1Material } from './ps1-material.js';

// Hub oval params (match field.js)
const HUB_RX = 100;
const HUB_RZ = 80;

// =====================================================================
//  1.  FERRIS WHEEL  — southeast quadrant, big colorful set piece
// =====================================================================

export function createFerrisWheel() {
    const group = new THREE.Group();
    group.name = 'ferris-wheel';

    const cx = 40, cz = 35;
    const baseY = getTerrainHeight(cx, cz);
    const wheelRadius = 14;
    const gondolaCount = 8;
    const axleHeight = wheelRadius + 4;

    // ── Support structure (A-frame legs) ─────────────────────────────
    const legMat = createPS1Material({ color: new THREE.Color(0x9595b2) });

    for (const side of [-1, 1]) {
        const legCenterY = baseY + (axleHeight + 2) / 2;
        const dyToAxle = baseY + axleHeight - legCenterY;
        const zSpread = 3.2;
        const angle = Math.atan(zSpread / dyToAxle);

        // Front leg
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, axleHeight + 2, 1.0),
            legMat
        );
        leg.position.set(cx + side * 3.5, legCenterY, cz + zSpread);
        leg.rotation.x = -angle;
        group.add(leg);

        // Back leg
        const backLeg = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, axleHeight + 2, 1.0),
            legMat
        );
        backLeg.position.set(cx + side * 3.5, legCenterY, cz - zSpread);
        backLeg.rotation.x = angle;
        group.add(backLeg);

        // Cross brace
        const brace = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.6, 6.0),
            legMat
        );
        brace.position.set(cx + side * 3.5, baseY + axleHeight * 0.5, cz);
        group.add(brace);
    }

    // Top crossbar
    const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(10, 1.0, 1.5),
        legMat
    );
    topBar.position.set(cx, baseY + axleHeight + 1.5, cz);
    group.add(topBar);

    // ── Axle hub ─────────────────────────────────────────────────────
    const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 8, 6),
        createPS1Material({ color: new THREE.Color(0x70708c) })
    );
    axle.position.set(cx, baseY + axleHeight, cz);
    axle.rotation.z = Math.PI / 2;
    group.add(axle);

    // ── Wheel frame — the rotating part ──────────────────────────────
    const wheel = new THREE.Group();
    wheel.name = 'ferris-wheel-rotor';
    wheel.position.set(cx, baseY + axleHeight, cz);

    // Outer rim (two rings made of segments)
    const rimMat = createPS1Material({ color: new THREE.Color(0xdd5555) });
    const rimSegments = 24;
    for (let i = 0; i < rimSegments; i++) {
        const a0 = (i / rimSegments) * Math.PI * 2;
        const a1 = ((i + 1) / rimSegments) * Math.PI * 2;
        const my = (Math.cos(a0) + Math.cos(a1)) / 2 * wheelRadius;
        const mz = (Math.sin(a0) + Math.sin(a1)) / 2 * wheelRadius;
        const segLen = 2 * wheelRadius * Math.sin(Math.PI / rimSegments) * 1.05;

        for (const ringX of [-1.5, 1.5]) {
            const seg = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.4, segLen),
                rimMat
            );
            seg.position.set(ringX, my, mz);
            seg.rotation.x = -(a0 + a1) / 2;
            // second coordinate is actually Z in world, but we're in the wheel group
            wheel.add(seg);
        }
    }

    // Spokes
    const spokeMat = createPS1Material({ color: new THREE.Color(0xCCCCDD) });
    for (let i = 0; i < gondolaCount; i++) {
        const angle = (i / gondolaCount) * Math.PI * 2;
        for (const ringX of [-1.5, 1.5]) {
            const spoke = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, wheelRadius * 2, 0.25),
                spokeMat
            );
            spoke.position.x = ringX;
            spoke.rotation.x = angle;
            wheel.add(spoke);
        }
    }

    // Inner rim (smaller decorative ring)
    const innerRimMat = createPS1Material({ color: new THREE.Color(0xEE6644) });
    for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * Math.PI * 2;
        const a1 = ((i + 1) / 16) * Math.PI * 2;
        const r2 = wheelRadius * 0.4;
        const my = (Math.cos(a0) + Math.cos(a1)) / 2 * r2;
        const mz = (Math.sin(a0) + Math.sin(a1)) / 2 * r2;
        const segLen = 2 * r2 * Math.sin(Math.PI / 16) * 1.05;
        for (const ringX of [-1.5, 1.5]) {
            const seg = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.3, segLen),
                innerRimMat
            );
            seg.position.set(ringX, my, mz);
            seg.rotation.x = -(a0 + a1) / 2;
            wheel.add(seg);
        }
    }

    // ── Gondolas ─────────────────────────────────────────────────────
    const gondolaColors = [
        0xe86464, 0x43bda6, 0xf5cc45, 0x6e63d9,
        0xF38181, 0x00B894, 0xFFA07A, 0x74B9FF,
    ];

    const gondolas = [];
    for (let i = 0; i < gondolaCount; i++) {
        const angle = (i / gondolaCount) * Math.PI * 2;
        const gy = Math.cos(angle) * wheelRadius;
        const gz = Math.sin(angle) * wheelRadius;

        const gondola = new THREE.Group();
        gondola.name = `gondola-${i}`;

        // Crossbar connecting the two rims
        const crossbar = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 0.15, 0.15),
            spokeMat
        );
        gondola.add(crossbar);

        // Hanging arm
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 1.5, 0.15),
            spokeMat
        );
        arm.position.y = -0.75;
        gondola.add(arm);

        // Bucket body
        const bucket = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 1.4, 1.6),
            createPS1Material({ color: new THREE.Color(gondolaColors[i % gondolaColors.length]) })
        );
        bucket.position.y = -2.0;
        gondola.add(bucket);

        // Seat inside
        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.2, 0.8),
            createPS1Material({ color: new THREE.Color(0x624f3c) })
        );
        seat.position.y = -2.2;
        gondola.add(seat);

        // Canopy roof
        const canopy = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 0.2, 1.8),
            createPS1Material({ color: new THREE.Color(gondolaColors[i % gondolaColors.length]).multiplyScalar(0.7) })
        );
        canopy.position.y = -1.1;
        gondola.add(canopy);

        gondola.position.set(0, gy, gz);
        wheel.add(gondola);
        gondolas.push({ mesh: gondola, index: i });
    }

    group.add(wheel);

    // ── Platform / boarding area ─────────────────────────────────────
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.5, 8),
        createPS1Material({ color: new THREE.Color(0x9a917a) })
    );
    platform.position.set(cx, baseY + 0.25, cz);
    group.add(platform);

    // Fence posts around platform
    const fenceMat = createPS1Material({ color: new THREE.Color(0x8f8274) });
    for (let i = 0; i < 10; i++) {
        const fx = cx - 5.5 + (i * 11 / 9);
        for (const fz of [cz + 3.8, cz - 3.8]) {
            const post = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 1.5, 0.2),
                fenceMat
            );
            post.position.set(fx, baseY + 1.0, fz);
            group.add(post);
        }
    }
    // Fence rails
    for (const fz of [cz + 3.8, cz - 3.8]) {
        const rail = new THREE.Mesh(
            new THREE.BoxGeometry(11, 0.15, 0.15),
            fenceMat
        );
        rail.position.set(cx, baseY + 1.5, fz);
        group.add(rail);
    }

    // ── Decorative lights on rim ─────────────────────────────────────
    for (let i = 0; i < gondolaCount; i++) {
        const angle = (i / gondolaCount) * Math.PI * 2;
        const lx = Math.sin(angle) * (wheelRadius + 0.5);
        const ly = Math.cos(angle) * (wheelRadius + 0.5);

        for (const ringX of [-1.5, 1.5]) {
            const bulb = new THREE.PointLight(gondolaColors[i], 0.6, 8, 2);
            bulb.position.set(ringX, ly, lx);
            wheel.add(bulb);
        }
    }

    // Collider
    const collider = {
        type: 'box',
        minX: cx - 6, maxX: cx + 6,
        minZ: cz - 5, maxZ: cz + 5,
    };

    function update(dt) {
        // Slow rotation
        wheel.rotation.x += dt * 0.15;

        // Counter-rotate gondolas so they hang upright
        for (const g of gondolas) {
            // Gondola started upright, so just counter the wheel's rotation
            g.mesh.rotation.x = -wheel.rotation.x + Math.sin(wheel.rotation.x * 2 + g.index) * 0.05;
        }
    }

    return { group, collider, update };
}


// =====================================================================
//  2.  WINDMILL — northwest area, slowly spinning sails
// =====================================================================

export function createWindmill() {
    const group = new THREE.Group();
    group.name = 'windmill';

    const wx = -35, wz = 40;
    const baseY = getTerrainHeight(wx, wz);
    const towerH = 18;

    // ── Tower body (tapered) ──────────────────────────────────────
    const towerMat = createPS1Material({ color: new THREE.Color(0xE8DCC8) });
    const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 4.0, towerH, 6),
        towerMat
    );
    tower.position.set(wx, baseY + towerH / 2, wz);
    group.add(tower);

    // Stone base ring
    const baseMat = createPS1Material({ color: new THREE.Color(0x8f8174) });
    const baseRing = new THREE.Mesh(
        new THREE.CylinderGeometry(4.5, 5.0, 2.0, 8),
        baseMat
    );
    baseRing.position.set(wx, baseY + 1.0, wz);
    group.add(baseRing);

    // Doorway (dark recess)
    const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2.8, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x221100 })
    );
    door.position.set(wx, baseY + 1.4, wz + 4.1);
    group.add(door);

    // Window (two small dark squares)
    for (const wy of [baseY + 8, baseY + 13]) {
        const win = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.0, 0.3),
            new THREE.MeshBasicMaterial({ color: 0xFFDD88, fog: false })
        );
        win.position.set(wx, wy, wz + 2.6);
        group.add(win);
    }

    // ── Conical roof ──────────────────────────────────────────────
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(3.5, 4.0, 6),
        createPS1Material({ color: new THREE.Color(0x7b5030) })
    );
    roof.position.set(wx, baseY + towerH + 2.0, wz);
    group.add(roof);

    // ── Sails (the rotating part) ─────────────────────────────────
    const sails = new THREE.Group();
    sails.name = 'windmill-sails';
    sails.position.set(wx, baseY + towerH - 1, wz + 2.8);

    // Axle boss
    const boss = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 1.5, 6),
        createPS1Material({ color: new THREE.Color(0x624f3c) })
    );
    boss.rotation.x = Math.PI / 2;
    sails.add(boss);

    const sailArmLen = 10;
    const sailMat = createPS1Material({ color: new THREE.Color(0xD4C098) });
    const sailClothMat = createPS1Material({ color: new THREE.Color(0xFFF8E8) });

    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const arm = new THREE.Group();

        // Main spar
        const spar = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, sailArmLen, 0.3),
            sailMat
        );
        spar.position.y = sailArmLen / 2;
        arm.add(spar);

        // Cross battens (3 per sail)
        for (let b = 0; b < 3; b++) {
            const battenY = 3 + b * 2.5;
            const batten = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.15, 2.2),
                sailMat
            );
            batten.position.set(0, battenY, 1.0);
            arm.add(batten);
        }

        // Cloth panel (flat box)
        const cloth = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 7, 2.0),
            sailClothMat
        );
        cloth.position.set(0, 5.5, 1.0);
        arm.add(cloth);

        // Tip ornament
        const tip = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            createPS1Material({ color: new THREE.Color(0xdd5555) })
        );
        tip.position.set(0, sailArmLen + 0.25, 0);
        arm.add(tip);

        arm.rotation.z = angle;
        sails.add(arm);
    }

    group.add(sails);

    // ── Surrounding stone wall / garden ───────────────────────────
    const gardenWallMat = createPS1Material({ color: new THREE.Color(0x998877) });
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = 7;
        const gx = wx + Math.cos(a) * r;
        const gz = wz + Math.sin(a) * r;
        const gy = getTerrainHeight(gx, gz);
        const wallSeg = new THREE.Mesh(
            new THREE.BoxGeometry(3.8, 1.2, 0.8),
            gardenWallMat
        );
        wallSeg.position.set(gx, gy + 0.6, gz);
        wallSeg.rotation.y = a;
        group.add(wallSeg);
    }

    const collider = {
        type: 'box',
        minX: wx - 4.5, maxX: wx + 4.5,
        minZ: wz - 4.5, maxZ: wz + 4.5,
    };

    function update(dt) {
        sails.rotation.z -= dt * 0.3;
    }

    return { group, collider, update };
}


// =====================================================================
//  3.  STREAM — winding creek from northeast flowing into the pond
// =====================================================================

export function createStream() {
    const group = new THREE.Group();
    group.name = 'stream';

    // Stream path: control points from NE corner winding to center pond
    const controlPts = [
        { x:  60, z: -55 },   // source (up in NE hills)
        { x:  50, z: -40 },
        { x:  35, z: -30 },
        { x:  25, z: -18 },
        { x:  18, z: -10 },
        { x:  12, z:  -5 },
        { x:   6, z:  -2 },
        { x:   0, z:   0 },   // pond center
    ];

    const streamWidth = 2.0;
    const waterMat = new THREE.MeshBasicMaterial({
        color: 0x5599CC,
        transparent: true,
        opacity: 0.65,
    });

    const bankMat = createPS1Material({ color: new THREE.Color(0x6A7A5A) });

    // Build stream as a series of flat quads along the path
    for (let i = 0; i < controlPts.length - 1; i++) {
        const p0 = controlPts[i];
        const p1 = controlPts[i + 1];

        const dx = p1.x - p0.x;
        const dz = p1.z - p0.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);

        // Width narrows toward pond
        const w = streamWidth * (1 - i * 0.06);

        // Water surface
        const waterGeo = new THREE.PlaneGeometry(w, len * 1.05);
        waterGeo.rotateX(-Math.PI / 2);
        const water = new THREE.Mesh(waterGeo, waterMat);
        const midX = (p0.x + p1.x) / 2;
        const midZ = (p0.z + p1.z) / 2;
        const midY = getTerrainHeight(midX, midZ) + 0.08;
        water.position.set(midX, midY, midZ);
        water.rotation.y = angle;
        group.add(water);

        // Bank edges (raised ridges along each side)
        for (const side of [-1, 1]) {
            const bankGeo = new THREE.BoxGeometry(0.6, 0.4, len * 1.05);
            const bank = new THREE.Mesh(bankGeo, bankMat);
            const bx = midX + Math.cos(angle + Math.PI / 2) * side * (w / 2 + 0.3);
            const bz = midZ + Math.sin(angle + Math.PI / 2) * side * (w / 2 + 0.3);
            const by = getTerrainHeight(bx, bz) + 0.15;
            bank.position.set(bx, by, bz);
            bank.rotation.y = angle;
            group.add(bank);
        }
    }

    // ── Source — small rocky spring  ──────────────────────────────
    const sourceX = 60, sourceZ = -55;
    const sourceY = getTerrainHeight(sourceX, sourceZ);

    // Rock pile at source
    const rockMat = createPS1Material({ color: new THREE.Color(0x7A7A70) });
    const rockPositions = [
        [0, 0, 0], [-0.6, 0.1, 0.4], [0.5, -0.1, -0.3],
        [-0.3, 0.3, -0.5], [0.7, 0.2, 0.2], [0, 0.4, 0],
    ];
    for (const [px, py, pz] of rockPositions) {
        const size = 0.5 + Math.random() * 0.5;
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(size, 0),
            rockMat
        );
        rock.position.set(sourceX + px, sourceY + py + size * 0.5, sourceZ + pz);
        rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        group.add(rock);
    }

    // Stepping stones across the stream (near midpoint)
    const stonesMat = createPS1Material({ color: new THREE.Color(0x9A9A8A) });
    const crossIdx = 3; // cross at control point 3
    const crossPt = controlPts[crossIdx];
    const crossAngle = Math.atan2(
        controlPts[crossIdx + 1].x - controlPts[crossIdx].x,
        controlPts[crossIdx + 1].z - controlPts[crossIdx].z
    );
    for (let s = -1; s <= 1; s++) {
        const sx = crossPt.x + Math.cos(crossAngle + Math.PI / 2) * s * 0.9;
        const sz = crossPt.z + Math.sin(crossAngle + Math.PI / 2) * s * 0.9;
        const sy = getTerrainHeight(sx, sz) + 0.12;
        const stone = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.5, 0.25, 5),
            stonesMat
        );
        stone.position.set(sx, sy, sz);
        group.add(stone);
    }

    return { group };
}


// =====================================================================
//  4.  COVERED BRIDGE — over the stream
// =====================================================================

export function createBridge() {
    const group = new THREE.Group();
    group.name = 'covered-bridge';

    // Bridge crosses the stream around control point 4-5 area
    const bx = 20, bz = -14;
    const baseY = getTerrainHeight(bx, bz);
    const bridgeLen = 6;
    const bridgeW = 3.5;
    const angle = Math.atan2(25 - 18, -18 - (-10)); // stream direction at that point

    // Deck
    const deckMat = createPS1Material({ color: new THREE.Color(0x8B6E4E) });
    const deck = new THREE.Mesh(
        new THREE.BoxGeometry(bridgeW, 0.3, bridgeLen),
        deckMat
    );
    deck.position.set(bx, baseY + 0.8, bz);
    deck.rotation.y = angle + Math.PI / 2;
    group.add(deck);

    // Planks (cross-boards for detail)
    const plankMat = createPS1Material({ color: new THREE.Color(0x7A5E3E) });
    for (let p = 0; p < 8; p++) {
        const pz = -bridgeLen / 2 + 0.3 + p * (bridgeLen / 8);
        const plank = new THREE.Mesh(
            new THREE.BoxGeometry(bridgeW - 0.2, 0.05, 0.4),
            plankMat
        );
        plank.position.set(0, 0.18, pz);
        deck.add(plank);
    }

    // Support posts underneath
    const postMat = createPS1Material({ color: new THREE.Color(0x6A4E2E) });
    for (const sx of [-bridgeW / 2 + 0.3, bridgeW / 2 - 0.3]) {
        for (const sz of [-bridgeLen / 2 + 0.5, bridgeLen / 2 - 0.5]) {
            const post = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 2.0, 0.4),
                postMat
            );
            post.position.set(sx, -0.85, sz);
            deck.add(post);
        }
    }

    // Side rails
    const railMat = createPS1Material({ color: new THREE.Color(0x9A7E5E) });
    for (const sx of [-bridgeW / 2 + 0.1, bridgeW / 2 - 0.1]) {
        // Vertical posts
        for (let rp = 0; rp < 4; rp++) {
            const rpz = -bridgeLen / 2 + 0.8 + rp * (bridgeLen / 3.5);
            const railPost = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 2.5, 0.2),
                railMat
            );
            railPost.position.set(sx, 1.25, rpz);
            deck.add(railPost);
        }
        // Horizontal rail
        const hRail = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, bridgeLen - 0.4),
            railMat
        );
        hRail.position.set(sx, 2.3, 0);
        deck.add(hRail);
    }

    // ── Roof (covered bridge!) ───────────────────────────────────
    const roofMat = createPS1Material({ color: new THREE.Color(0x8B4513) });

    // Ridge beam
    const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, bridgeLen + 0.6),
        roofMat
    );
    ridge.position.set(0, 3.8, 0);
    deck.add(ridge);

    // Roof panels (two angled planes)
    for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(bridgeW * 0.7, 0.15, bridgeLen + 0.5),
            roofMat
        );
        panel.position.set(side * bridgeW * 0.28, 3.2, 0);
        panel.rotation.z = side * 0.45;
        deck.add(panel);
    }

    const collider = {
        type: 'box',
        minX: bx - 3, maxX: bx + 3,
        minZ: bz - 3.5, maxZ: bz + 3.5,
    };

    return { group, collider };
}


// =====================================================================
//  5.  PARKOUR TOWER — ascending platforms spiralling skyward
// =====================================================================

export function createParkourTower() {
    const group = new THREE.Group();
    group.name = 'parkour-tower';
    const colliders = [];

    const px = -20, pz = 30;
    const baseY = getTerrainHeight(px, pz);

    const platformCount = 12;
    const heightStep = 2.8;
    const spiralRadius = 5;

    // ── Starting platform (large, easy) ──────────────────────────
    const startMat = createPS1Material({ color: new THREE.Color(0x9A8A6A) });
    const startPlat = new THREE.Mesh(
        new THREE.BoxGeometry(5, 1.5, 5),
        startMat
    );
    startPlat.position.set(px, baseY + 0.75, pz);
    group.add(startPlat);

    // ── Ascending platforms spiralling up ─────────────────────────
    const platMats = [
        createPS1Material({ color: new THREE.Color(0xCC8844) }),
        createPS1Material({ color: new THREE.Color(0x44AACC) }),
        createPS1Material({ color: new THREE.Color(0xAA44CC) }),
        createPS1Material({ color: new THREE.Color(0x44CC88) }),
    ];

    for (let i = 0; i < platformCount; i++) {
        const angle = (i / platformCount) * Math.PI * 3.5; // ~1.75 full rotations
        const h = baseY + 2 + i * heightStep;
        const r = spiralRadius + (i > 8 ? (i - 8) * 0.5 : 0); // widens near top
        const platX = px + Math.cos(angle) * r;
        const platZ = pz + Math.sin(angle) * r;

        // Platform size decreases as you go up (harder jumps)
        const size = Math.max(1.8, 3.5 - i * 0.12);
        const thickness = 0.5;

        const plat = new THREE.Mesh(
            new THREE.BoxGeometry(size, thickness, size),
            platMats[i % platMats.length]
        );
        plat.position.set(platX, h, platZ);
        group.add(plat);

        // Edge trim detail
        const trimMat = createPS1Material({
            color: new THREE.Color(platMats[i % platMats.length].uniforms.uColor.value).multiplyScalar(0.6)
        });
        for (const side of [-1, 1]) {
            const trim = new THREE.Mesh(
                new THREE.BoxGeometry(size + 0.1, 0.15, 0.15),
                trimMat
            );
            trim.position.set(platX, h + 0.3, platZ + side * size / 2);
            group.add(trim);

            const trim2 = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.15, size + 0.1),
                trimMat
            );
            trim2.position.set(platX + side * size / 2, h + 0.3, platZ);
            group.add(trim2);
        }

        // Every 3rd platform gets a small pillar decoration
        if (i % 3 === 2) {
            const pillar = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 1.2, 0.4),
                createPS1Material({ color: new THREE.Color(0xB0A890) })
            );
            pillar.position.set(platX + size / 2 - 0.3, h + 0.85, platZ + size / 2 - 0.3);
            group.add(pillar);
        }
    }

    // ── Summit platform — reward at the top ──────────────────────
    const topAngle = (platformCount / platformCount) * Math.PI * 3.5;
    const topH = baseY + 2 + platformCount * heightStep;
    const topPlat = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.8, 5),
        createPS1Material({ color: new THREE.Color(0xf5cc45) })
    );
    const topX = px + Math.cos(topAngle) * spiralRadius;
    const topZ = pz + Math.sin(topAngle) * spiralRadius;
    topPlat.position.set(topX, topH, topZ);
    group.add(topPlat);

    // Summit flag pole
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 5, 4),
        createPS1Material({ color: new THREE.Color(0x888888) })
    );
    pole.position.set(topX, topH + 3, topZ);
    group.add(pole);

    // Flag (colorful triangle)
    const flagGeo = new THREE.BufferGeometry();
    const flagVerts = new Float32Array([
        0, 0, 0,
        0, -1.2, 0,
        1.8, -0.6, 0,
    ]);
    flagGeo.setAttribute('position', new THREE.BufferAttribute(flagVerts, 3));
    flagGeo.computeVertexNormals();
    const flag = new THREE.Mesh(
        flagGeo,
        new THREE.MeshBasicMaterial({ color: 0xFF4444, side: THREE.DoubleSide })
    );
    flag.position.set(topX + 0.1, topH + 5.2, topZ);
    group.add(flag);

    // Summit glow
    const glow = new THREE.PointLight(0xf5cc45, 2.0, 30, 1.5);
    glow.position.set(topX, topH + 2, topZ);
    group.add(glow);

    // ── Platform surfaces Josh can stand on ──────────────────────
    const platforms = [];

    // Starting platform
    platforms.push({
        minX: px - 2.5, maxX: px + 2.5,
        minZ: pz - 2.5, maxZ: pz + 2.5,
        topY: baseY + 1.5,
    });

    // Spiral platforms
    for (let i = 0; i < platformCount; i++) {
        const angle = (i / platformCount) * Math.PI * 3.5;
        const h = baseY + 2 + i * heightStep;
        const r = spiralRadius + (i > 8 ? (i - 8) * 0.5 : 0);
        const platX = px + Math.cos(angle) * r;
        const platZ = pz + Math.sin(angle) * r;
        const size = Math.max(1.8, 3.5 - i * 0.12);
        platforms.push({
            minX: platX - size / 2, maxX: platX + size / 2,
            minZ: platZ - size / 2, maxZ: platZ + size / 2,
            topY: h + 0.25,
        });
    }

    // Summit platform
    platforms.push({
        minX: topX - 2.5, maxX: topX + 2.5,
        minZ: topZ - 2.5, maxZ: topZ + 2.5,
        topY: topH + 0.4,
    });

    return { group, colliders, platforms };
}


// =====================================================================
//  5b.  AQUEDUCT RUN — crumbling stone pillars in the NE quadrant
// =====================================================================

export function createAqueductRun() {
    const group = new THREE.Group();
    group.name = 'aqueduct-run';
    const colliders = [];
    const platforms = [];

    // Course runs through NE interior, roughly (55,20) → (70,-10)
    const cx = 62, cz = 5;
    const baseY = getTerrainHeight(cx, cz);

    // 10 waypoints arcing N→S through the east hub
    const waypoints = [];
    for (let i = 0; i < 10; i++) {
        const t = i / 9;
        const wx = 55 + Math.sin(t * Math.PI * 0.6) * 12;
        const wz = 20 - t * 30; // from z=20 to z=-10
        waypoints.push({ x: wx, z: wz });
    }

    const HEIGHT_STEP = 1.6;   // gentle climb
    const MIN_SIZE    = 2.2;
    const MAX_SIZE    = 3.0;

    const pillarMat  = createPS1Material({ color: new THREE.Color(0x8a7e6a) });
    const capMat     = createPS1Material({ color: new THREE.Color(0xa69880) });
    const mossMat    = createPS1Material({ color: new THREE.Color(0x6a8a5a) });

    // Starting platform (large, on the ground)
    const startX = waypoints[0].x, startZ = waypoints[0].z;
    const startY = getTerrainHeight(startX, startZ);
    const startPlat = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1.5, 4),
        capMat
    );
    startPlat.position.set(startX, startY + 0.75, startZ);
    group.add(startPlat);
    platforms.push({
        minX: startX - 2, maxX: startX + 2,
        minZ: startZ - 2, maxZ: startZ + 2,
        topY: startY + 1.5,
    });

    let prevTopY = startY + 1.5;

    for (let i = 1; i < waypoints.length; i++) {
        const wp = waypoints[i];
        const localH = getTerrainHeight(wp.x, wp.z);
        const blockTop = Math.max(localH + 0.5, prevTopY + HEIGHT_STEP);
        const pillarH  = blockTop - localH;

        const t    = i / (waypoints.length - 1);
        const size = MAX_SIZE - t * (MAX_SIZE - MIN_SIZE);

        // Stone pillar underneath
        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(size * 0.5, pillarH, size * 0.5),
            pillarMat
        );
        pillar.position.set(wp.x, localH + pillarH / 2, wp.z);
        group.add(pillar);

        // Platform cap
        const cap = new THREE.Mesh(
            new THREE.BoxGeometry(size, 0.5, size),
            capMat
        );
        cap.position.set(wp.x, blockTop, wp.z);
        group.add(cap);

        // Moss accent on every 3rd pillar
        if (i % 3 === 0) {
            const moss = new THREE.Mesh(
                new THREE.BoxGeometry(size * 0.6, 0.2, size * 0.6),
                mossMat
            );
            moss.position.set(wp.x, blockTop + 0.25, wp.z);
            group.add(moss);
        }

        platforms.push({
            minX: wp.x - size / 2, maxX: wp.x + size / 2,
            minZ: wp.z - size / 2, maxZ: wp.z + size / 2,
            topY: blockTop + 0.25,
        });

        prevTopY = blockTop + 0.25;
    }

    // Summit with a small archway
    const lastWP = waypoints[waypoints.length - 1];
    const summitY = prevTopY + HEIGHT_STEP;
    const summitLocalH = getTerrainHeight(lastWP.x + 3, lastWP.z);
    const summitTop = Math.max(summitLocalH + 1, summitY);

    const summit = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.7, 4),
        createPS1Material({ color: new THREE.Color(0xdacc88) })
    );
    summit.position.set(lastWP.x + 3, summitTop, lastWP.z);
    group.add(summit);

    // Archway decoration
    for (const side of [-1, 1]) {
        const archLeg = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 3, 0.4),
            pillarMat
        );
        archLeg.position.set(lastWP.x + 3 + side * 1.5, summitTop + 1.85, lastWP.z);
        group.add(archLeg);
    }
    const archTop = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.4, 0.6),
        capMat
    );
    archTop.position.set(lastWP.x + 3, summitTop + 3.55, lastWP.z);
    group.add(archTop);

    // Summit glow
    const glow = new THREE.PointLight(0xdacc88, 1.5, 20, 1.5);
    glow.position.set(lastWP.x + 3, summitTop + 2, lastWP.z);
    group.add(glow);

    platforms.push({
        minX: lastWP.x + 1, maxX: lastWP.x + 5,
        minZ: lastWP.z - 2, maxZ: lastWP.z + 2,
        topY: summitTop + 0.35,
    });

    return { group, colliders, platforms };
}


// =====================================================================
//  5c.  RUINS HOP — zigzag platforms near the south entrance
// =====================================================================

export function createRuinsHop() {
    const group = new THREE.Group();
    group.name = 'ruins-hop';
    const colliders = [];
    const platforms = [];

    // Located near the south gate, slightly SE, visible on entry
    const ox = 30, oz = 50;
    const baseY = getTerrainHeight(ox, oz);

    // 8 platforms zigzagging upward
    const defs = [];
    const HEIGHT_STEP = 2.0;
    const ZIG_W       = 2.5;   // horizontal zig distance
    const FWD_STEP    = 3.5;   // forward step per platform

    for (let i = 0; i < 8; i++) {
        const side = (i % 2 === 0) ? -1 : 1;
        const px = ox + side * ZIG_W;
        const pz = oz - i * FWD_STEP; // move north
        defs.push({ x: px, z: pz });
    }

    // Materials — weathered stone
    const stoneMats = [
        createPS1Material({ color: new THREE.Color(0x8a7a6a) }),
        createPS1Material({ color: new THREE.Color(0x7a6a5a) }),
        createPS1Material({ color: new THREE.Color(0x9a8a7a) }),
    ];
    const vineMat = createPS1Material({ color: new THREE.Color(0x5a7a4a) });

    // Starting slab
    const startPlat = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 1.5, 4.5),
        stoneMats[0]
    );
    startPlat.position.set(ox, baseY + 0.75, oz + 3);
    group.add(startPlat);
    platforms.push({
        minX: ox - 2.25, maxX: ox + 2.25,
        minZ: oz + 0.75, maxZ: oz + 5.25,
        topY: baseY + 1.5,
    });

    let prevTopY = baseY + 1.5;

    for (let i = 0; i < defs.length; i++) {
        const d = defs[i];
        const localH = getTerrainHeight(d.x, d.z);
        const blockTop = Math.max(localH + 0.5, prevTopY + HEIGHT_STEP);
        const pillarH  = blockTop - localH;
        const t = i / (defs.length - 1);
        const size = 3.0 - t * 0.8; // 3.0 → 2.2

        // Ruined pillar base
        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(size * 0.45, pillarH, size * 0.45),
            stoneMats[i % stoneMats.length]
        );
        pillar.position.set(d.x, localH + pillarH / 2, d.z);
        // Slight random tilt for "ruined" look
        pillar.rotation.z = ((i * 13) % 7 - 3) * 0.02;
        pillar.rotation.x = ((i * 17) % 5 - 2) * 0.015;
        group.add(pillar);

        // Platform slab (slightly rotated for character)
        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(size, 0.45, size),
            stoneMats[(i + 1) % stoneMats.length]
        );
        slab.position.set(d.x, blockTop, d.z);
        slab.rotation.y = ((i * 31) % 11) * 0.08;
        group.add(slab);

        // Vine details on odd platforms
        if (i % 2 === 1) {
            const vine = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, pillarH * 0.6, 0.2),
                vineMat
            );
            vine.position.set(d.x + size * 0.25, localH + pillarH * 0.4, d.z + size * 0.25);
            group.add(vine);
        }

        // Broken column fragment on every 4th platform
        if (i % 4 === 3) {
            const frag = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.3, 1.2, 5),
                stoneMats[2]
            );
            frag.position.set(d.x + size * 0.3, blockTop + 0.85, d.z - size * 0.3);
            frag.rotation.z = 0.15;
            group.add(frag);
        }

        platforms.push({
            minX: d.x - size / 2, maxX: d.x + size / 2,
            minZ: d.z - size / 2, maxZ: d.z + size / 2,
            topY: blockTop + 0.225,
        });

        prevTopY = blockTop + 0.225;
    }

    // Summit — broken altar with reward glow
    const lastD = defs[defs.length - 1];
    const altarX = lastD.x, altarZ = lastD.z - 4;
    const altarLocalH = getTerrainHeight(altarX, altarZ);
    const altarTop = Math.max(altarLocalH + 1, prevTopY + HEIGHT_STEP);

    const altar = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.6, 4),
        createPS1Material({ color: new THREE.Color(0xc8b888) })
    );
    altar.position.set(altarX, altarTop, altarZ);
    group.add(altar);

    // Altar pillars
    for (const corner of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cp = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 2.5, 0.35),
            stoneMats[0]
        );
        cp.position.set(altarX + corner[0] * 1.5, altarTop + 1.55, altarZ + corner[1] * 1.5);
        group.add(cp);
    }

    // Altar glow
    const glow = new THREE.PointLight(0xffaa44, 1.5, 18, 1.5);
    glow.position.set(altarX, altarTop + 2, altarZ);
    group.add(glow);

    platforms.push({
        minX: altarX - 2, maxX: altarX + 2,
        minZ: altarZ - 2, maxZ: altarZ + 2,
        topY: altarTop + 0.3,
    });

    return { group, colliders, platforms };
}


// =====================================================================
//  5d.  MOONSTONE RING — glowing platforms spiralling around a crystal
// =====================================================================

export function createMoonstoneRing() {
    const group = new THREE.Group();
    group.name = 'moonstone-ring';
    const colliders = [];
    const platforms = [];

    // SW-west area, between windmill and west wall
    const cx = -60, cz = 25;
    const baseY = getTerrainHeight(cx, cz);

    const RING_COUNT  = 10;
    const SPIRAL_R    = 6;
    const HEIGHT_STEP = 1.8;
    const PLAT_SIZE   = 2.4;

    // Central crystal pillar
    const crystalMat = createPS1Material({ color: new THREE.Color(0x88aadd) });
    const crystalH = RING_COUNT * HEIGHT_STEP + 6;
    const crystal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 1.2, crystalH, 6),
        crystalMat
    );
    crystal.position.set(cx, baseY + crystalH / 2, cz);
    group.add(crystal);

    // Crystal glow (visible from distance)
    const crystalGlow = new THREE.PointLight(0x88aadd, 2.5, 40, 1.5);
    crystalGlow.position.set(cx, baseY + crystalH, cz);
    group.add(crystalGlow);

    // Crystal cap
    const cap = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.5, 0),
        createPS1Material({ color: new THREE.Color(0xaaccff) })
    );
    cap.position.set(cx, baseY + crystalH + 1.2, cz);
    group.add(cap);

    // Starting platform at the base
    const startAngle = 0;
    const startX = cx + Math.cos(startAngle) * SPIRAL_R;
    const startZ = cz + Math.sin(startAngle) * SPIRAL_R;
    const startLocalH = getTerrainHeight(startX, startZ);

    const startPlat = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1.5, 4),
        createPS1Material({ color: new THREE.Color(0x9a8aaa) })
    );
    startPlat.position.set(startX, startLocalH + 0.75, startZ);
    group.add(startPlat);
    platforms.push({
        minX: startX - 2, maxX: startX + 2,
        minZ: startZ - 2, maxZ: startZ + 2,
        topY: startLocalH + 1.5,
    });

    let prevTopY = startLocalH + 1.5;

    // Moonstone platform materials — alternating cool tones
    const moonMats = [
        createPS1Material({ color: new THREE.Color(0x7788aa) }),
        createPS1Material({ color: new THREE.Color(0x8899bb) }),
        createPS1Material({ color: new THREE.Color(0x6677aa) }),
    ];

    for (let i = 0; i < RING_COUNT; i++) {
        const angle = ((i + 1) / (RING_COUNT + 1)) * Math.PI * 2.5; // 1.25 full turns
        const px = cx + Math.cos(angle) * SPIRAL_R;
        const pz = cz + Math.sin(angle) * SPIRAL_R;
        const localH = getTerrainHeight(px, pz);

        const blockTop = Math.max(localH + 0.5, prevTopY + HEIGHT_STEP);

        // Moonstone slab (slightly hexagonal look via rotation)
        const plat = new THREE.Mesh(
            new THREE.BoxGeometry(PLAT_SIZE, 0.5, PLAT_SIZE),
            moonMats[i % moonMats.length]
        );
        plat.position.set(px, blockTop, pz);
        plat.rotation.y = angle * 0.3;
        group.add(plat);

        // Glowing trim ring on every 3rd platform
        if (i % 3 === 0) {
            const trimGlow = new THREE.PointLight(0x88aadd, 0.8, 8, 1.5);
            trimGlow.position.set(px, blockTop + 0.5, pz);
            group.add(trimGlow);
        }

        // Connecting beam to central crystal (visual only)
        const beamLen = SPIRAL_R;
        const beam = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, beamLen),
            crystalMat
        );
        beam.position.set(
            (px + cx) / 2,
            blockTop + 0.1,
            (pz + cz) / 2
        );
        beam.rotation.y = -angle;
        group.add(beam);

        platforms.push({
            minX: px - PLAT_SIZE / 2, maxX: px + PLAT_SIZE / 2,
            minZ: pz - PLAT_SIZE / 2, maxZ: pz + PLAT_SIZE / 2,
            topY: blockTop + 0.25,
        });

        prevTopY = blockTop + 0.25;
    }

    // Summit platform — at the top, near the crystal cap
    const summitAngle = ((RING_COUNT + 1) / (RING_COUNT + 1)) * Math.PI * 2.5;
    const summitX = cx + Math.cos(summitAngle) * (SPIRAL_R * 0.5);
    const summitZ = cz + Math.sin(summitAngle) * (SPIRAL_R * 0.5);
    const summitTop = prevTopY + HEIGHT_STEP;

    const summitPlat = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.7, 3.5),
        createPS1Material({ color: new THREE.Color(0xccddff) })
    );
    summitPlat.position.set(summitX, summitTop, summitZ);
    group.add(summitPlat);

    // Summit glow
    const summitGlow = new THREE.PointLight(0xccddff, 2.0, 25, 1.5);
    summitGlow.position.set(summitX, summitTop + 1.5, summitZ);
    group.add(summitGlow);

    platforms.push({
        minX: summitX - 1.75, maxX: summitX + 1.75,
        minZ: summitZ - 1.75, maxZ: summitZ + 1.75,
        topY: summitTop + 0.35,
    });

    return { group, colliders, platforms };
}


// =====================================================================
//  6.  BUSHES — clusters of rounded shrubs scattered through the hub
// =====================================================================

export function createBushes() {
    const group = new THREE.Group();
    group.name = 'bushes';
    const colliders = [];

    const bushDefs = [
        // Along paths
        { x: 5, z: 15, scale: 1.0 },
        { x: -5, z: 12, scale: 0.8 },
        { x: 10, z: 25, scale: 1.2 },
        { x: -8, z: 22, scale: 0.9 },
        // Near gazebo
        { x: 48, z: -20, scale: 1.1 },
        { x: 50, z: -30, scale: 0.7 },
        { x: 60, z: -22, scale: 1.3 },
        // Near amphitheater
        { x: -48, z: -8, scale: 1.0 },
        { x: -45, z: -22, scale: 0.9 },
        { x: -60, z: -10, scale: 1.1 },
        // Near walls
        { x: 30, z: -60, scale: 1.0 },
        { x: -30, z: -55, scale: 0.8 },
        { x: 70, z: 10, scale: 1.2 },
        { x: -70, z: 15, scale: 1.0 },
        // Near windmill
        { x: -28, z: 35, scale: 0.9 },
        { x: -42, z: 45, scale: 1.1 },
        // Near ferris wheel
        { x: 32, z: 30, scale: 0.8 },
        { x: 48, z: 40, scale: 1.0 },
        // Path borders
        { x: 15, z: -10, scale: 0.7 },
        { x: -15, z: -15, scale: 0.8 },
        { x: 20, z: 5, scale: 1.0 },
        { x: -18, z: 8, scale: 0.9 },
        // Scattered
        { x: 35, z: -45, scale: 1.0 },
        { x: -25, z: -40, scale: 0.7 },
        { x: 65, z: -40, scale: 1.1 },
        { x: -65, z: -35, scale: 0.9 },
    ];

    const bushColors = [
        new THREE.Color(0x539c4e),
        new THREE.Color(0x61a858),
        new THREE.Color(0x43873e),
        new THREE.Color(0x72b569),
        new THREE.Color(0x4f874c),
    ];

    let seed = 77777;
    function rand() {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    }

    for (const def of bushDefs) {
        const bx = def.x, bz = def.z;

        // Check inside hub (with margin)
        const nx = bx / HUB_RX;
        const nz = bz / HUB_RZ;
        if (nx * nx + nz * nz > 0.82) continue;

        const by = getTerrainHeight(bx, bz);
        const bush = new THREE.Group();

        // Each bush is 2-4 overlapping spheroid boxes
        const blobCount = 2 + Math.floor(rand() * 3);
        for (let b = 0; b < blobCount; b++) {
            const color = bushColors[Math.floor(rand() * bushColors.length)];
            const mat = createPS1Material({ color });

            const sx = (0.8 + rand() * 0.6) * def.scale;
            const sy = (0.5 + rand() * 0.4) * def.scale;
            const sz = (0.8 + rand() * 0.6) * def.scale;

            const blob = new THREE.Mesh(
                new THREE.DodecahedronGeometry(1.0, 0),
                mat
            );
            blob.scale.set(sx, sy, sz);
            blob.position.set(
                (rand() - 0.5) * 1.2 * def.scale,
                sy * 0.5,
                (rand() - 0.5) * 1.2 * def.scale
            );
            blob.rotation.set(rand(), rand(), rand());
            bush.add(blob);
        }

        bush.position.set(bx, by, bz);
        group.add(bush);

        // Small collider
        colliders.push({
            type: 'box',
            minX: bx - 1.0 * def.scale, maxX: bx + 1.0 * def.scale,
            minZ: bz - 1.0 * def.scale, maxZ: bz + 1.0 * def.scale,
        });
    }

    return { group, colliders };
}


// =====================================================================
//  7.  LAMPPOSTS — along stone paths, warm glow
// =====================================================================

export function createLampposts() {
    const group = new THREE.Group();
    group.name = 'lampposts';

    const lampDefs = [
        // Along main entrance path
        { x:  4, z: 50 },
        { x: -4, z: 50 },
        { x:  4, z: 35 },
        { x: -4, z: 35 },
        // Near center
        { x:  8, z: 5 },
        { x: -8, z: 5 },
        { x:  8, z: -5 },
        { x: -8, z: -5 },
        // Along cross path
        { x:  35, z: 3 },
        { x: -35, z: 3 },
        { x:  55, z: 3 },
        { x: -55, z: 3 },
    ];

    const poleMat = createPS1Material({ color: new THREE.Color(0x444444) });
    const topMat = createPS1Material({ color: new THREE.Color(0x333333) });

    for (const def of lampDefs) {
        const ly = getTerrainHeight(def.x, def.z);

        // Pole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.15, 4.5, 4),
            poleMat
        );
        pole.position.set(def.x, ly + 2.25, def.z);
        group.add(pole);

        // Base plate
        const basePlate = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.5, 0.3, 6),
            poleMat
        );
        basePlate.position.set(def.x, ly + 0.15, def.z);
        group.add(basePlate);

        // Lantern housing (box on top)
        const lantern = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.8, 0.6),
            topMat
        );
        lantern.position.set(def.x, ly + 4.8, def.z);
        group.add(lantern);

        // Lantern cap (little pyramid)
        const cap = new THREE.Mesh(
            new THREE.ConeGeometry(0.45, 0.4, 4),
            topMat
        );
        cap.position.set(def.x, ly + 5.4, def.z);
        group.add(cap);

        // Glowing glass panels (visible warm light)
        const glassMat = new THREE.MeshBasicMaterial({
            color: 0xFFDD88,
            transparent: true,
            opacity: 0.85,
        });
        for (let face = 0; face < 4; face++) {
            const fa = (face / 4) * Math.PI * 2;
            const glass = new THREE.Mesh(
                new THREE.PlaneGeometry(0.45, 0.55),
                glassMat
            );
            glass.position.set(
                def.x + Math.sin(fa) * 0.31,
                ly + 4.8,
                def.z + Math.cos(fa) * 0.31
            );
            glass.rotation.y = fa;
            group.add(glass);
        }

        // Warm point light
        const light = new THREE.PointLight(0xFFCC66, 0.8, 15, 2);
        light.position.set(def.x, ly + 4.5, def.z);
        group.add(light);
    }

    return { group };
}


// =====================================================================
//  8.  PICNIC AREA — tables, blanket, campfire near the park center
// =====================================================================

export function createPicnicArea() {
    const group = new THREE.Group();
    group.name = 'picnic-area';

    const ax = 25, az = 10;
    const baseY = getTerrainHeight(ax, az);

    // ── Picnic table ─────────────────────────────────────────────
    const woodMat = createPS1Material({ color: new THREE.Color(0x8B6E4E) });
    const darkWood = createPS1Material({ color: new THREE.Color(0x6A4E2E) });

    // Table top
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.15, 1.5),
        woodMat
    );
    top.position.set(ax, baseY + 1.2, az);
    group.add(top);

    // Table legs
    for (const lx of [-1.3, 1.3]) {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1.2, 1.5),
            darkWood
        );
        leg.position.set(ax + lx, baseY + 0.6, az);
        group.add(leg);
    }

    // Benches (two, on each side)
    for (const side of [-1, 1]) {
        const bench = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 0.12, 0.6),
            woodMat
        );
        bench.position.set(ax, baseY + 0.65, az + side * 1.3);
        group.add(bench);

        for (const blx of [-1.2, 1.2]) {
            const bLeg = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.65, 0.15),
                darkWood
            );
            bLeg.position.set(ax + blx, baseY + 0.325, az + side * 1.3);
            group.add(bLeg);
        }
    }

    // ── Second table offset ──────────────────────────────────────
    const t2x = ax + 8, t2z = az + 3;
    const t2y = getTerrainHeight(t2x, t2z);

    const top2 = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.15, 1.5),
        woodMat
    );
    top2.position.set(t2x, t2y + 1.2, t2z);
    top2.rotation.y = 0.4;
    group.add(top2);

    for (const lx of [-1.3, 1.3]) {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1.2, 1.5),
            darkWood
        );
        leg.position.set(t2x + lx, t2y + 0.6, t2z);
        leg.rotation.y = 0.4;
        group.add(leg);
    }

    // ── Campfire ─────────────────────────────────────────────────
    const fireX = ax + 4, fireZ = az - 3;
    const fireY = getTerrainHeight(fireX, fireZ);

    // Stone ring
    const stoneMat = createPS1Material({ color: new THREE.Color(0x7A7A70) });
    for (let i = 0; i < 8; i++) {
        const fa = (i / 8) * Math.PI * 2;
        const stone = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.3, 0.4),
            stoneMat
        );
        stone.position.set(
            fireX + Math.cos(fa) * 0.8,
            fireY + 0.15,
            fireZ + Math.sin(fa) * 0.8
        );
        stone.rotation.y = fa;
        group.add(stone);
    }

    // Logs in the fire
    const logMat = createPS1Material({ color: new THREE.Color(0x5e452c) });
    for (let l = 0; l < 3; l++) {
        const la = (l / 3) * Math.PI;
        const log = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.12, 1.0, 4),
            logMat
        );
        log.position.set(fireX, fireY + 0.2, fireZ);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = la;
        group.add(log);
    }

    // Fire glow
    const fireLight = new THREE.PointLight(0xFF6622, 1.5, 12, 2);
    fireLight.position.set(fireX, fireY + 0.8, fireZ);
    group.add(fireLight);

    // Ember sprite (simple glowing dot)
    const emberMat = new THREE.MeshBasicMaterial({
        color: 0xFF4400,
        transparent: true,
        opacity: 0.8,
    });
    const ember = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        emberMat
    );
    ember.position.set(fireX, fireY + 0.5, fireZ);
    ember.name = 'campfire-ember';
    group.add(ember);

    // ── Picnic blanket ───────────────────────────────────────────
    const blanketMat = new THREE.MeshBasicMaterial({
        color: 0xCC4444,
        side: THREE.DoubleSide,
    });
    const blanket = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 2.5),
        blanketMat
    );
    blanket.rotation.x = -Math.PI / 2;
    blanket.position.set(ax - 3, baseY + 0.04, az + 2);
    blanket.rotation.z = 0.3;
    group.add(blanket);

    // Basket on blanket
    const basket = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.4),
        createPS1Material({ color: new THREE.Color(0xC4A070) })
    );
    basket.position.set(ax - 3.2, baseY + 0.3, az + 1.8);
    group.add(basket);

    return { group };
}


// =====================================================================
//  9.  TREES — chunky PS1 foliage clusters
// =====================================================================

export function createTrees() {
    const group = new THREE.Group();
    group.name = 'trees';
    const colliders = [];

    const treeDefs = [
        // East side grove
        { x: 70, z: -30, h: 8, crown: 4.0 },
        { x: 73, z: -25, h: 6, crown: 3.0 },
        { x: 68, z: -35, h: 7, crown: 3.5 },
        { x: 75, z: -20, h: 5, crown: 2.5 },
        // West side grove
        { x: -72, z: -30, h: 7, crown: 3.5 },
        { x: -68, z: -25, h: 9, crown: 4.5 },
        { x: -75, z: -20, h: 6, crown: 3.0 },
        // South approach trees
        { x: 15, z: 55, h: 8, crown: 4.0 },
        { x: -12, z: 52, h: 7, crown: 3.5 },
        { x: 20, z: 62, h: 6, crown: 3.0 },
        { x: -18, z: 60, h: 9, crown: 4.5 },
        // Near windmill
        { x: -28, z: 50, h: 7, crown: 3.5 },
        { x: -45, z: 48, h: 6, crown: 3.0 },
        // Near stream
        { x: 55, z: -48, h: 8, crown: 4.0 },
        { x: 45, z: -35, h: 7, crown: 3.5 },
        { x: 30, z: -25, h: 5, crown: 2.5 },
        // Interior scattered
        { x: 40, z: -10, h: 6, crown: 3.0 },
        { x: -40, z: -35, h: 7, crown: 3.5 },
        { x: 15, z: -40, h: 5, crown: 2.5 },
        { x: -15, z: -55, h: 6, crown: 3.0 },
    ];

    const trunkColors = [
        new THREE.Color(0x7b5030),
        new THREE.Color(0x654321),
        new THREE.Color(0x503314),
    ];

    const crownColors = [
        new THREE.Color(0x539c4e),
        new THREE.Color(0x61a858),
        new THREE.Color(0x43873e),
        new THREE.Color(0x3a7738),
        new THREE.Color(0x72b569),
    ];

    let seed = 42424;
    function rand() {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    }

    for (const def of treeDefs) {
        // Skip if outside hub
        const nx = def.x / HUB_RX;
        const nz = def.z / HUB_RZ;
        if (nx * nx + nz * nz > 0.88) continue;

        const ty = getTerrainHeight(def.x, def.z);
        const tree = new THREE.Group();

        // Trunk
        const trunkColor = trunkColors[Math.floor(rand() * trunkColors.length)];
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.5, def.h, 5),
            createPS1Material({ color: trunkColor })
        );
        trunk.position.y = def.h / 2;
        tree.add(trunk);

        // Crown — 2-3 stacked, slightly offset dodecahedrons
        const layers = 2 + Math.floor(rand() * 2);
        for (let l = 0; l < layers; l++) {
            const crownColor = crownColors[Math.floor(rand() * crownColors.length)];
            const crownSize = def.crown * (1 - l * 0.2);
            const crown = new THREE.Mesh(
                new THREE.DodecahedronGeometry(crownSize, 0),
                createPS1Material({ color: crownColor })
            );
            crown.position.set(
                (rand() - 0.5) * 1.0,
                def.h + l * (crownSize * 0.7),
                (rand() - 0.5) * 1.0
            );
            crown.rotation.set(rand(), rand(), rand());
            crown.scale.y = 0.7 + rand() * 0.3; // squash slightly
            tree.add(crown);
        }

        tree.position.set(def.x, ty, def.z);
        group.add(tree);

        colliders.push({
            type: 'box',
            minX: def.x - 0.6, maxX: def.x + 0.6,
            minZ: def.z - 0.6, maxZ: def.z + 0.6,
        });
    }

    return { group, colliders };
}


// =====================================================================
//  10.  BUTTERFLIES — simple animated quads near flowers
// =====================================================================

export function createButterflies() {
    const group = new THREE.Group();
    group.name = 'butterflies';

    const butterflyDefs = [
        { x: 10, z: -5, color: 0xff9ebc },
        { x: -8, z: 10, color: 0xa3bfff },
        { x: 15, z: -15, color: 0xFFDD44 },
        { x: -20, z: -5, color: 0xbf9eff },
        { x: 5, z: 20, color: 0xFF8844 },
        { x: -15, z: 15, color: 0x44FFAA },
        { x: 30, z: -10, color: 0xFF44AA },
        { x: -25, z: -20, color: 0xa3ffea },
    ];

    const butterflies = [];

    for (const def of butterflyDefs) {
        const by = getTerrainHeight(def.x, def.z) + 1.5 + Math.random() * 2;
        const butterfly = new THREE.Group();
        butterfly.name = 'butterfly';

        // Two wing planes
        const wingMat = new THREE.MeshBasicMaterial({
            color: def.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
        });

        for (const side of [-1, 1]) {
            const wing = new THREE.Mesh(
                new THREE.PlaneGeometry(0.3, 0.2),
                wingMat
            );
            wing.position.x = side * 0.15;
            wing.rotation.y = side * 0.3;
            wing.name = 'wing';
            butterfly.add(wing);
        }

        // Tiny body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.05, 0.2),
            new THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        butterfly.add(body);

        butterfly.position.set(def.x, by, def.z);
        group.add(butterfly);

        butterflies.push({
            mesh: butterfly,
            baseX: def.x,
            baseY: by,
            baseZ: def.z,
            phase: Math.random() * Math.PI * 2,
            radius: 2 + Math.random() * 3,
            speed: 0.5 + Math.random() * 0.5,
        });
    }

    let elapsed = 0;

    function update(dt) {
        elapsed += dt;
        for (const b of butterflies) {
            // Circular flight path with bobbing
            const t = elapsed * b.speed + b.phase;
            b.mesh.position.x = b.baseX + Math.cos(t) * b.radius;
            b.mesh.position.z = b.baseZ + Math.sin(t) * b.radius;
            b.mesh.position.y = b.baseY + Math.sin(t * 3) * 0.5;

            // Face direction of travel
            b.mesh.rotation.y = t + Math.PI / 2;

            // Wing flap
            const wings = b.mesh.children.filter(c => c.name === 'wing');
            const flapAngle = Math.sin(elapsed * 12 + b.phase) * 0.6;
            if (wings[0]) wings[0].rotation.y = -flapAngle;
            if (wings[1]) wings[1].rotation.y = flapAngle;
        }
    }

    return { group, update };
}


// =====================================================================
//  11.  WALL BANNERS — colorful flags on the perimeter wall
// =====================================================================

export function createWallBanners() {
    const group = new THREE.Group();
    group.name = 'wall-banners';

    const bannerColors = [
        0xe86464, 0x43bda6, 0xf5cc45, 0x6e63d9,
        0xF38181, 0x00B894, 0xFFA07A, 0x74B9FF,
    ];

    const bannerCount = 16;
    const banners = [];

    for (let i = 0; i < bannerCount; i++) {
        const angle = (i / bannerCount) * Math.PI * 2;
        const bx = Math.cos(angle) * HUB_RX * 0.97;
        const bz = Math.sin(angle) * HUB_RZ * 0.97;

        // Skip gate area
        if (bz > 70 && Math.abs(bx) < 12) continue;

        const by = getTerrainHeight(bx, bz);
        const bannerGroup = new THREE.Group();

        // Pole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 5, 4),
            createPS1Material({ color: new THREE.Color(0x555555) })
        );
        pole.position.y = 2.5;
        bannerGroup.add(pole);

        // Flag cloth (box as a banner)
        const color = bannerColors[i % bannerColors.length];
        const cloth = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 2.5, 1.5),
            new THREE.MeshBasicMaterial({
                color,
                side: THREE.DoubleSide,
            })
        );
        cloth.position.set(0, 3.8, 0.8);
        cloth.name = 'banner-cloth';
        bannerGroup.add(cloth);

        // Cross bar
        const crossbar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 1.6, 4),
            createPS1Material({ color: new THREE.Color(0x555555) })
        );
        crossbar.rotation.x = Math.PI / 2;
        crossbar.position.set(0, 5.0, 0.8);
        bannerGroup.add(crossbar);

        bannerGroup.position.set(bx, by + 9, bz);
        bannerGroup.rotation.y = angle + Math.PI;
        group.add(bannerGroup);

        banners.push({ mesh: cloth, phase: i * 0.5 });
    }

    let elapsed = 0;

    function update(dt) {
        elapsed += dt;
        for (const b of banners) {
            // Gentle swaying in wind
            b.mesh.rotation.y = Math.sin(elapsed * 1.5 + b.phase) * 0.15;
            b.mesh.rotation.x = Math.sin(elapsed * 2.0 + b.phase * 1.3) * 0.05;
        }
    }

    return { group, update };
}
