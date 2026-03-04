import * as THREE from 'three';
import { iterationToColor } from './math.js';

/**
 * Ambient floating particles for the Fractal Boundary zone.
 *
 * 80 glowing dots with fractal-palette colors drifting through
 * the terrain. They scatter away from Josh when he gets close.
 */

/** @type {number} */
const PARTICLE_COUNT = 120;
const BOUNDS = 80;

/**
 * Build the particle system.
 *
 * @param {number} maxIter — For color generation
 * @returns {{ points: THREE.Points, velocities: Float32Array }}
 */
export function buildParticles(maxIter) {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 160;
        positions[i3 + 1] = 2 + Math.random() * 25;
        positions[i3 + 2] = (Math.random() - 0.5) * 160;

        const fakeIter = Math.floor(Math.random() * maxIter) || 1;
        const col = iterationToColor(fakeIter, maxIter);
        colors[i3] = col.r;
        colors[i3 + 1] = col.g;
        colors[i3 + 2] = col.b;

        velocities[i3] = (Math.random() - 0.5) * 0.5;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    points.name = 'AmbientParticles';

    return { points, velocities };
}

/**
 * Create the particle animator.
 * Handles drift, wrapping, and proximity scatter (particles flee Josh).
 *
 * @param {THREE.Points} points
 * @param {Float32Array} velocities
 * @returns {(dt: number, time: number, joshPos: THREE.Vector3|null) => void}
 */
export function createParticleAnimator(points, velocities) {
    const SCATTER_RADIUS = 5;
    const SCATTER_FORCE = 8;

    return (dt, _time, joshPos) => {
        const posAttr = points.geometry.attributes.position;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            let x = posAttr.getX(i);
            let y = posAttr.getY(i);
            let z = posAttr.getZ(i);

            let vx = velocities[i3];
            let vy = velocities[i3 + 1];
            let vz = velocities[i3 + 2];

            // Scatter from Josh
            if (joshPos) {
                const dx = x - joshPos.x;
                const dy = y - joshPos.y;
                const dz = z - joshPos.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < SCATTER_RADIUS && dist > 0.01) {
                    const strength = (1 - dist / SCATTER_RADIUS) * SCATTER_FORCE;
                    vx += (dx / dist) * strength * dt;
                    vy += (dy / dist) * strength * dt;
                    vz += (dz / dist) * strength * dt;
                }
            }

            // Dampen scatter velocity back to drift
            velocities[i3] = vx * 0.98 + (velocities[i3] > 0 ? 0.01 : -0.01);
            velocities[i3 + 1] = vy * 0.98;
            velocities[i3 + 2] = vz * 0.98 + (velocities[i3 + 2] > 0 ? 0.01 : -0.01);

            x += vx * dt;
            y += vy * dt;
            z += vz * dt;

            // Wrap
            if (x > BOUNDS) x = -BOUNDS;
            if (x < -BOUNDS) x = BOUNDS;
            if (z > BOUNDS) z = -BOUNDS;
            if (z < -BOUNDS) z = BOUNDS;
            if (y > 30) y = 2;
            if (y < 1) y = 28;

            posAttr.setXYZ(i, x, y, z);
        }
        posAttr.needsUpdate = true;
    };
}
