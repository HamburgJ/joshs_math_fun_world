/**
 * field-ambience.js — Ambient life systems for the massive hub world.
 *
 * Clouds drift overhead (scaled for the huge terrain). Flowers bloom
 * inside the hub oval with complex-plane color mapping. Wind ripples
 * the terrain.
 *
 * Shell Bingby says: "A field without wind is just a texture.
 * A field with wind is a world."
 */

import * as THREE from 'three';
import { getTerrainHeight } from './noise.js';

// Hub oval parameters (must match field.js / noise.js)
const HUB_RX = 100;
const HUB_RZ = 80;

// =====================================================================
//  1.  CLOUDS
// =====================================================================

/**
 * Create chunky PS1-style cloud groups spread across the large terrain.
 */
export function createClouds() {
    const group = new THREE.Group();
    group.name = 'clouds';

    // More clouds spread across the much larger terrain
    const cloudDefs = [
        { x: -70, z: -50, y: 32, speed: 0.45, sx: 1.2, sz: 0.8 },
        { x: -20, z:  30, y: 36, speed: 0.60, sx: 1.4, sz: 0.9 },
        { x:  50, z: -60, y: 30, speed: 0.35, sx: 1.0, sz: 0.7 },
        { x: -60, z:  20, y: 38, speed: 0.70, sx: 1.5, sz: 1.0 },
        { x:  80, z:  40, y: 34, speed: 0.50, sx: 1.3, sz: 0.8 },
        { x:   0, z: -70, y: 40, speed: 0.38, sx: 1.0, sz: 0.7 },
        { x:  60, z:   0, y: 31, speed: 0.55, sx: 1.2, sz: 0.8 },
        { x: -90, z: -30, y: 35, speed: 0.42, sx: 1.1, sz: 0.75 },
        { x:  30, z:  80, y: 33, speed: 0.48, sx: 1.0, sz: 0.7 },
        { x: -40, z: -80, y: 37, speed: 0.52, sx: 1.3, sz: 0.85 },
        { x:  20, z: 160, y: 34, speed: 0.40, sx: 1.1, sz: 0.8 },
        { x: -10, z: 200, y: 36, speed: 0.58, sx: 1.2, sz: 0.9 },
    ];

    const cloudEntries = [];

    const cloudMat = new THREE.MeshLambertMaterial({
        color: 0xf5f5ff,
        flatShading: true,
        transparent: true,
        opacity: 0.8,
    });

    for (const def of cloudDefs) {
        const cloud = new THREE.Group();
        cloud.name = 'cloud';

        const numBlobs = 2 + (Math.abs(def.x * 7 + def.z * 13) % 2);

        for (let i = 0; i < numBlobs; i++) {
            const w = (3.0 + i * 0.8) * def.sx;
            const h = 0.5 + i * 0.15;
            const d = (2.2 + i * 0.5) * def.sz;
            const box = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d),
                cloudMat
            );
            box.position.set(
                (i - 1) * 0.8 * def.sx,
                def.y + i * 0.4,
                (i - 1) * 0.4 * def.sz
            );
            cloud.add(box);
        }

        cloud.position.set(def.x, 0, def.z);
        group.add(cloud);

        cloudEntries.push({
            cloud,
            speed: def.speed,
            baseY: def.y,
        });
    }

    // Drift NW → SE
    const driftAngle = Math.PI / 4 + 0.15;
    const driftDirX = Math.cos(driftAngle);
    const driftDirZ = Math.sin(driftAngle);

    const BOUND = 150; // much larger wrap boundary

    function update(dt) {
        for (const entry of cloudEntries) {
            entry.cloud.position.x += driftDirX * entry.speed * dt;
            entry.cloud.position.z += driftDirZ * entry.speed * dt;

            if (entry.cloud.position.x > BOUND) entry.cloud.position.x -= BOUND * 2;
            if (entry.cloud.position.x < -BOUND) entry.cloud.position.x += BOUND * 2;
            if (entry.cloud.position.z > BOUND) entry.cloud.position.z -= BOUND * 2;
            if (entry.cloud.position.z < -BOUND) entry.cloud.position.z += BOUND * 2;
        }
    }

    return { group, update };
}


// =====================================================================
//  2.  FLOWERS — complex plane color garden (inside hub only)
// =====================================================================

export function createFlowers() {
    const group = new THREE.Group();
    group.name = 'flowers';

    // Flowers only inside the hub oval
    function isInsideHub(fx, fz) {
        const nx = fx / HUB_RX;
        const nz = fz / HUB_RZ;
        return nx * nx + nz * nz < 0.85; // well inside the wall
    }

    // Keep some exclusion zones
    const exclusions = [
        { x: 0, z: 0, r: 6 },           // pond (now radius 5)
        { x: 0, z: -50, r: 5 },          // clock tower
        { x: 55, z: -25, r: 5 },         // gazebo
        { x: -55, z: -15, r: 8 },        // amphitheater
    ];

    function isExcluded(px, pz) {
        if (!isInsideHub(px, pz)) return true;
        for (const e of exclusions) {
            const dx = px - e.x, dz = pz - e.z;
            if (dx * dx + dz * dz < e.r * e.r) return true;
        }
        return false;
    }

    const FLOWER_COUNT = 80;
    const flowers = [];

    let seed = 31415;
    function rand() {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    }

    const stemMat = new THREE.MeshBasicMaterial({ color: 0x4DA838 });

    for (let i = 0; i < FLOWER_COUNT * 3 && flowers.length < FLOWER_COUNT; i++) {
        const fx = (rand() - 0.5) * HUB_RX * 1.6;
        const fz = (rand() - 0.5) * HUB_RZ * 1.6;

        if (isExcluded(fx, fz)) continue;

        const dist = Math.sqrt(fx * fx + fz * fz);
        const angle = Math.atan2(fz, fx);

        const hue = ((angle / (Math.PI * 2)) + 1) % 1;
        const sat = Math.max(0.45, Math.min(1, dist / 40));
        const lit = 0.55;

        const petalColor = new THREE.Color().setHSL(hue, sat, lit);
        const petalMat = new THREE.MeshLambertMaterial({
            color: petalColor,
            flatShading: true,
        });

        const flowerGroup = new THREE.Group();
        flowerGroup.name = 'flower';

        const stem = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.15, 0.03),
            stemMat
        );
        stem.position.y = 0.075;
        flowerGroup.add(stem);

        const headH = 0.15 + rand() * 0.10;
        const head = new THREE.Mesh(
            new THREE.ConeGeometry(0.06, headH, 3),
            petalMat
        );
        head.position.y = 0.15 + headH * 0.5;
        head.rotation.y = rand() * Math.PI * 2;
        flowerGroup.add(head);

        const baseY = getTerrainHeight(fx, fz);
        flowerGroup.position.set(fx, baseY, fz);

        group.add(flowerGroup);

        flowers.push({
            mesh: flowerGroup,
            baseY,
            phase: rand() * Math.PI * 2,
        });
    }

    let elapsed = 0;

    function update(dt) {
        elapsed += dt;
        for (const f of flowers) {
            f.mesh.position.y = f.baseY + Math.sin(elapsed * 1.5 + f.phase) * 0.03;
        }
    }

    return { group, update };
}


// =====================================================================
//  3.  WIND — vertex displacement on terrain mesh
// =====================================================================

/**
 * Wind system scaled for the massive terrain.
 * No edge morphing since the hub has walls now.
 */
export function createWindSystem(terrainGeometry) {
    const position = terrainGeometry.attributes.position;
    const color = terrainGeometry.attributes.color;
    const count = position.count;

    // Snapshot original Y values
    const originalY = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        originalY[i] = position.getY(i);
    }

    let elapsed = 0;

    function update(dt) {
        elapsed += dt;

        for (let i = 0; i < count; i++) {
            const x = position.getX(i);
            const z = position.getZ(i);

            // Wind displacement — gentle rolling waves
            const deltaY = Math.sin(elapsed * 1.5 + x * 0.08 + z * 0.06) * 0.04
                         + Math.sin(elapsed * 0.8 + x * 0.04 - z * 0.05) * 0.02;

            position.setY(i, originalY[i] + deltaY);
        }

        position.needsUpdate = true;
    }

    return { update };
}
