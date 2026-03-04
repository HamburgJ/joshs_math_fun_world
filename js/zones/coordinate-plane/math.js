import * as THREE from 'three';

/**
 * Pure math for the Coordinate Plane zone.
 *
 * Height functions for each surface, coordinate formatting,
 * and integer point enumeration.
 */

/** Surface height functions keyed by name. */
export const SURFACE_FUNCTIONS = {
    parabola:   (x, _z) => 0.1 * x * x,
    sincos:     (x, z)  => 1.5 * Math.sin(x) * Math.cos(z),
    reciprocal: (x, z)  => Math.min(2.0 / (x * x + z * z + 0.5), 4.0),
};

/**
 * Get terrain height at (x, z) for the given active surface.
 * @param {string|null} activeSurface
 * @param {number} x
 * @param {number} z
 * @returns {number}
 */
export function getTerrainHeightForSurface(activeSurface, x, z) {
    const fn = SURFACE_FUNCTIONS[activeSurface];
    return fn ? fn(x, z) : 0;
}

/**
 * Format a world position as a math coordinate string.
 * @param {number} x
 * @param {number} z — represents mathematical y-axis
 * @returns {string} e.g. "(3.14, 2.72)"
 */
export function getCoordinateText(x, z) {
    return `(${x.toFixed(2)}, ${z.toFixed(2)})`;
}

/**
 * Returns all integer coordinate points within [-range, range].
 * @param {number} [range=5]
 * @returns {{ position: THREE.Vector3, value: { x: number, z: number } }[]}
 */
export function getIntegerPoints(range = 5) {
    const points = [];
    for (let ix = -range; ix <= range; ix++) {
        for (let iz = -range; iz <= range; iz++) {
            points.push({
                position: new THREE.Vector3(ix, 0, iz),
                value: { x: ix, z: iz },
            });
        }
    }
    return points;
}
