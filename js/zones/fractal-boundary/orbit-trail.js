import * as THREE from 'three';
import { worldToComplex, complexToWorld } from './math.js';

/**
 * Real-time orbit trail — visualizes z = z² + c iteration
 * using Josh's position as the c parameter.
 *
 * The trail is a line that traces each iterate through the complex plane,
 * mapped back into world space. Watch the orbit spiral in or explode out.
 */

/**
 * Build the orbit trail line object.
 *
 * @param {number} maxIter Maximum number of iterates to draw
 * @returns {THREE.Line}
 */
export function buildOrbitTrail(maxIter) {
    const maxPoints = maxIter + 1;
    const positions = new Float32Array(maxPoints * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({ color: 0xffffff });

    const line = new THREE.Line(geo, mat);
    line.name = 'OrbitTrail';
    line.frustumCulled = false;
    return line;
}

/**
 * Update orbit trail based on Josh's world position.
 * Computes z = z² + c where c is derived from Josh's position,
 * and writes each iterate as a 3D world-space point.
 *
 * @param {THREE.Line} orbitLine
 * @param {number} worldX
 * @param {number} worldZ
 * @param {{ rMin: number, rMax: number, iMin: number, iMax: number }} domain
 * @param {number} worldSize
 * @param {number} maxIter
 * @param {(x: number, z: number) => number} getTerrainHeight
 */
export function updateOrbitTrail(orbitLine, worldX, worldZ, domain, worldSize, maxIter, getTerrainHeight) {
    const c = worldToComplex(worldX, worldZ, domain, worldSize);
    const posAttr = orbitLine.geometry.attributes.position;

    let zr = 0;
    let zi = 0;
    let count = 0;

    // Initial point at Josh's position
    posAttr.setXYZ(count, worldX, 0.5, worldZ);
    count++;

    for (let n = 0; n < maxIter; n++) {
        const zr2 = zr * zr;
        const zi2 = zi * zi;
        if (zr2 + zi2 > 4) break;

        const newZi = 2 * zr * zi + c.ci;
        zr = zr2 - zi2 + c.cr;
        zi = newZi;

        const wp = complexToWorld(zr, zi, domain, worldSize);
        const h = getTerrainHeight(wp.x, wp.z);
        posAttr.setXYZ(count, wp.x, h + 0.5, wp.z);
        count++;
    }

    posAttr.needsUpdate = true;
    orbitLine.geometry.setDrawRange(0, count);
}

/**
 * Create the orbit trail color animator — shifts trail color
 * based on how deep into the set Josh is standing.
 *
 * @param {THREE.Line} orbitLine
 * @returns {(dt: number, time: number) => void}
 */
export function createOrbitColorAnimator(orbitLine) {
    return (_dt, time) => {
        // Gently shift the orbit trail color over time
        const hue = (time * 0.05) % 1;
        orbitLine.material.color.setHSL(hue, 0.8, 0.7);
    };
}
