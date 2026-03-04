import * as THREE from 'three';

/**
 * Proximity reactions for the Coordinate Plane.
 *
 * The world notices Josh:
 *  - Asymptote walls shimmer more intensely as he approaches
 *  - The origin glows when Josh stands on it
 *  - Spectacle: first time reaching the origin
 *  - Spectacle: first time touching an asymptote wall
 */

/**
 * Register proximity reactions and spectacles.
 * @param {import('../zone-base.js').ZoneBase} zone
 * @param {Object} refs
 * @param {THREE.Mesh[]} refs.walls — the four asymptote wall meshes
 */
export function registerReactions(zone, { walls }) {
    // ── Origin glow ──
    // When Josh stands near (0,0), the gridfloor pulses subtly brighter
    zone.addSpectacle({
        id: 'origin_discovery',
        position: new THREE.Vector3(0, 0, 0),
        radius: 2.0,
        action: () => {
            // Just a one-shot moment — the origin is special
        },
    });

    // ── Asymptote wall shimmer ──
    // As Josh approaches any wall, its opacity increases
    for (const wall of walls) {
        zone.addReaction({
            center: wall.position.clone(),
            radius: 8,
            onNear: (_dist, intensity) => {
                wall.material.opacity = 0.15 + intensity * 0.25;
            },
            onExit: () => {
                wall.material.opacity = 0.15;
            },
        });
    }

    // ── First asymptote approach spectacle ──
    zone.addSpectacle({
        id: 'asymptote_approach',
        position: new THREE.Vector3(15, 5, 0),
        radius: 5,
        action: () => {
            // One-shot: you felt the boundary
        },
    });
}
