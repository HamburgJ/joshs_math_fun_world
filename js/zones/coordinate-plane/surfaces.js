import * as THREE from 'three';
import { SURFACE_FUNCTIONS } from './math.js';

/**
 * Mathematical function surfaces for the Coordinate Plane.
 *
 * Three surfaces over [-8, 8]²: parabola, sin·cos, and reciprocal.
 * All start hidden; toggled via the zone's `setActiveSurface()`.
 */

const SURFACE_DEFS = [
    { name: 'parabola',   key: 'parabola',   color: 0xff8833 },
    { name: 'SinCos',     key: 'sincos',     color: 0x33dddd },
    { name: 'Reciprocal', key: 'reciprocal', color: 0xdd33dd },
];

const RES = 64;
const DOMAIN_MIN = -8;
const DOMAIN_MAX = 8;

/**
 * Generate a BufferGeometry mesh from a height function f(x, z) → y.
 * @param {string} name
 * @param {(x: number, z: number) => number} fn
 * @param {number} color
 * @returns {THREE.Mesh}
 */
function buildSurface(name, fn, color) {
    const segments = RES;
    const vertCount = (segments + 1) * (segments + 1);
    const positions = new Float32Array(vertCount * 3);
    const indices = [];
    const step = (DOMAIN_MAX - DOMAIN_MIN) / segments;

    let idx = 0;
    for (let iz = 0; iz <= segments; iz++) {
        for (let ix = 0; ix <= segments; ix++) {
            const x = DOMAIN_MIN + ix * step;
            const z = DOMAIN_MIN + iz * step;
            positions[idx * 3]     = x;
            positions[idx * 3 + 1] = fn(x, z);
            positions[idx * 3 + 2] = z;
            idx++;
        }
    }

    for (let iz = 0; iz < segments; iz++) {
        for (let ix = 0; ix < segments; ix++) {
            const a = iz * (segments + 1) + ix;
            const b = a + 1;
            const c = a + (segments + 1);
            const d = c + 1;
            indices.push(a, c, b);
            indices.push(b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    return mesh;
}

/**
 * Build all three function surfaces, all starting hidden.
 * @returns {Record<string, THREE.Mesh>}
 */
export function buildFunctionSurfaces() {
    /** @type {Record<string, THREE.Mesh>} */
    const surfaces = {};

    for (const def of SURFACE_DEFS) {
        const fn = SURFACE_FUNCTIONS[def.key];
        surfaces[def.key] = buildSurface(def.name, fn, def.color);
        surfaces[def.key].visible = false;
    }

    return surfaces;
}
