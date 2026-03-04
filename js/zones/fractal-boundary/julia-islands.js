import * as THREE from 'three';
import { julia, iterationToColor } from './math.js';

/**
 * Julia-set floating islands.
 *
 * Three small 32×32 heightmaps of different Julia sets, hovering above
 * the Mandelbrot terrain. Each one slowly rotates, bobbing gently.
 */

/** @type {Array<{cr: number, ci: number, pos: THREE.Vector3, name: string}>} */
const JULIA_DEFS = [
    { cr: -0.7, ci: 0.27, pos: new THREE.Vector3(20, 8, -10), name: 'JuliaConnected' },
    { cr: 0.355, ci: 0.355, pos: new THREE.Vector3(-15, 12, 15), name: 'JuliaDouadyRabbit' },
    { cr: -0.4, ci: 0.6, pos: new THREE.Vector3(10, 10, 20), name: 'JuliaSpiral' },
];

/**
 * Build all Julia islands and return their meshes + animation data.
 *
 * @param {number} maxIter
 * @param {number} [juliaRes=32]
 * @returns {Array<{mesh: THREE.Mesh, speed: number, baseY: number}>}
 */
export function buildJuliaIslands(maxIter, juliaRes = 32) {
    const islands = [];

    for (const def of JULIA_DEFS) {
        const mesh = createJuliaIsland(def.cr, def.ci, maxIter, juliaRes);
        mesh.name = def.name;
        mesh.position.copy(def.pos);

        islands.push({
            mesh,
            speed: 0.15 + Math.random() * 0.15,
            baseY: def.pos.y,
        });
    }

    return islands;
}

/**
 * Generate a single Julia island mesh.
 * @param {number} cr
 * @param {number} ci
 * @param {number} maxIter
 * @param {number} res
 * @returns {THREE.Mesh}
 */
function createJuliaIsland(cr, ci, maxIter, res) {
    const segs = res - 1;
    const size = 10;
    const domainMin = -1.5;
    const domainMax = 1.5;
    const domainRange = domainMax - domainMin;

    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const count = posAttr.count;
    const colors = new Float32Array(count * 3);
    const halfSize = size / 2;

    for (let i = 0; i < count; i++) {
        const wx = posAttr.getX(i);
        const wz = posAttr.getZ(i);

        const zr = domainMin + ((wx + halfSize) / size) * domainRange;
        const zi = domainMin + ((wz + halfSize) / size) * domainRange;

        const n = julia(zr, zi, cr, ci, maxIter);
        const height = n * 0.15;

        posAttr.setY(i, height);

        const col = iterationToColor(n, maxIter);
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
    }

    posAttr.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geo, mat);
}

/**
 * Create the animator function for Julia islands.
 * Handles rotation and gentle vertical bob.
 *
 * @param {Array<{mesh: THREE.Mesh, speed: number, baseY: number}>} islands
 * @returns {(dt: number, time: number) => void}
 */
export function createJuliaAnimator(islands) {
    return (dt, time) => {
        for (const island of islands) {
            island.mesh.rotation.y += island.speed * dt;
            // Gentle bob
            island.mesh.position.y = island.baseY + Math.sin(time * 0.5 + island.speed * 10) * 0.5;
        }
    };
}
