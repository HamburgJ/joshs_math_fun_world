import {
    mobiusAdd,
    euclideanRadius,
    clampToDisk,
    DISK_CLAMP,
} from './hyperbolic-math.js';

/**
 * hyperbolic-movement.js — Movement transform for walking inside
 * the Poincaré disk model with proper hyperbolic geometry.
 *
 * The key insight: in Euclidean space, if Josh walks 1 unit in any
 * direction, he moves 1 unit onscreen regardless of where he is.
 * In hyperbolic space (Poincaré disk), the SAME input should produce
 * different visual results depending on position:
 *
 *   Near the center: movement looks normal.
 *   Near the boundary: movement looks MASSIVE in terms of hyperbolic
 *   distance but TINY on screen — because the Poincaré metric
 *   squashes everything near the edge.
 *
 * The metric is:  ds = 2|dz| / (1 - |z|²)
 *
 * So for a constant-speed walk in hyperbolic space, the Euclidean
 * displacement shrinks as |z| → 1. This is implemented via Möbius
 * addition: each frame, we treat the velocity as a small tangent
 * vector, scale it by the inverse conformal factor, and compose
 * via Möbius addition to get the new position.
 *
 * Shell Bingby: "When the math IS the movement, you don't watch
 * hyperbolic geometry — you FEEL it."
 */

/** World radius — maps [-WORLD_RADIUS, WORLD_RADIUS] to disk [-1, 1] */
const WORLD_RADIUS = 50;

/**
 * Convert world-space (x, z) to Poincaré disk coordinates.
 * @param {number} wx  World X
 * @param {number} wz  World Z
 * @returns {{ x: number, y: number }}  Disk point
 */
function worldToDisk(wx, wz) {
    return clampToDisk({ x: wx / WORLD_RADIUS, y: wz / WORLD_RADIUS });
}

/**
 * Convert disk coordinates back to world space.
 * @param {{ x: number, y: number }} dp  Disk point
 * @returns {{ wx: number, wz: number }}
 */
function diskToWorld(dp) {
    return { wx: dp.x * WORLD_RADIUS, wz: dp.y * WORLD_RADIUS };
}

/**
 * The hyperbolic movement transform.
 *
 * Instead of adding (vx*dt, vz*dt) in Euclidean space, we:
 *  1. Convert Josh's current world position to disk coordinates
 *  2. Scale the velocity by the inverse conformal factor at that point
 *     so the player walks at a constant HYPERBOLIC speed
 *  3. Compose the displacement via Möbius addition
 *  4. Convert back to world coordinates
 *
 * The result: Josh moves normally near the disk center but can never
 * reach the boundary — he approaches it asymptotically, which IS
 * what it's like to walk in hyperbolic space.
 *
 * @param {number} x   Current world X
 * @param {number} z   Current world Z
 * @param {number} vx  Velocity X (world units/s, already multiplied by dt)
 * @param {number} vz  Velocity Z (world units/s, already multiplied by dt)
 * @returns {{ x: number, z: number }}  New world position
 */
export function hyperbolicMovementTransform(x, z, vx, vz) {
    // Current position in disk space
    const pos = worldToDisk(x, z);
    const r = euclideanRadius(pos);

    // Conformal factor: λ(z) = 2 / (1 - |z|²)
    // For constant hyperbolic speed, Euclidean displacement scales as
    //   dz_euc = dz_hyp * (1 - |z|²) / 2
    // This makes movement naturally slow down near the boundary.
    const oneMinusR2 = Math.max(0.001, 1 - r * r);
    const scale = oneMinusR2 / 2;

    // Convert velocity to disk-space displacement
    const dDisk = {
        x: (vx / WORLD_RADIUS) * scale,
        y: (vz / WORLD_RADIUS) * scale,
    };

    // Möbius addition: this is the CORRECT way to "translate"
    // in the Poincaré disk. It preserves the hyperbolic metric.
    const newPos = mobiusAdd(pos, dDisk);

    // Enforce boundary (should already be clamped, belt-and-suspenders)
    const newR = euclideanRadius(newPos);
    const maxR = DISK_CLAMP - 0.01;
    if (newR > maxR) {
        const s = maxR / newR;
        newPos.x *= s;
        newPos.y *= s;
    }

    const world = diskToWorld(newPos);
    return { x: world.wx, z: world.wz };
}

/**
 * Get the conformal factor at a given world position.
 * Returns a value ≥ 1 (1 at center, → ∞ at boundary).
 * Useful for UI: display "local expansion factor" or scale
 * labels so they appear consistent size in hyperbolic space.
 *
 * @param {number} wx  World X
 * @param {number} wz  World Z
 * @returns {number}
 */
export function getConformalFactor(wx, wz) {
    const dp = worldToDisk(wx, wz);
    const r2 = dp.x * dp.x + dp.y * dp.y;
    return 2 / Math.max(0.001, 1 - r2);
}

/**
 * Compute the hyperbolic distance the player is from the center,
 * given their world-space position.
 * @param {number} wx
 * @param {number} wz
 * @returns {number}
 */
export function getHyperbolicDistFromCenter(wx, wz) {
    const dp = worldToDisk(wx, wz);
    const r = Math.min(euclideanRadius(dp), DISK_CLAMP);
    return 2 * Math.atanh(r);
}
