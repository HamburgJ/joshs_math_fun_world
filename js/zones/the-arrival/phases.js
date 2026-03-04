/**
 * Phase definitions and easing utilities for The Arrival intro sequence.
 *
 * Phases (progress 0 → 1):
 *   0.00–0.15  White void, Josh appears, camera top-down
 *   0.15–0.30  Number line extends left/right, tick marks appear
 *   0.30–0.50  Coordinate axes bloom, grid lines fade in
 *   0.50–0.70  Number line curves upward into a glowing circle
 *   0.70–0.85  Circle becomes green disk, colour fills outward — grass
 *   0.85–1.00  Camera swings from top-down to behind Josh
 *
 * Shell Bingby once proved that six phases is the minimum to make
 * a loading screen feel like an existential journey. Q.E.D.
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════
//  Phase Definitions
// ═══════════════════════════════════════════════════════════════════════

export const PHASES = [
    { name: 'void',         start: 0.00, end: 0.15 },
    { name: 'number-line',  start: 0.15, end: 0.30 },
    { name: 'axes',         start: 0.30, end: 0.50 },
    { name: 'circle',       start: 0.50, end: 0.70 },
    { name: 'colour-fill',  start: 0.70, end: 0.85 },
    { name: 'camera-swing', start: 0.85, end: 1.00 },
];

// ═══════════════════════════════════════════════════════════════════════
//  Easing
// ═══════════════════════════════════════════════════════════════════════

/**
 * Smooth-step easing (cubic Hermite).
 * @param {number} t - Value in [0, 1]
 * @returns {number}
 */
export function smoothstep(t) {
    t = THREE.MathUtils.clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
}

/**
 * Map a global progress value into a local 0–1 value for a sub-range.
 * @param {number} progress - Global progress [0, 1]
 * @param {number} start    - Phase start
 * @param {number} end      - Phase end
 * @returns {number}        - Local progress clamped to [0, 1]
 */
export function phaseProgress(progress, start, end) {
    return THREE.MathUtils.clamp((progress - start) / (end - start), 0, 1);
}

// ═══════════════════════════════════════════════════════════════════════
//  Phase Resolver
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the current phase name and effective (possibly remapped) progress.
 *
 * Returning players have progress remapped so they skip phases 1–4 and
 * jump straight to colour-fill / camera-swing.
 *
 * @param {number} progress     Raw loading progress [0, 1]
 * @param {boolean} isFirstVisit
 * @returns {{ p: number, phaseName: string }}
 */
export function computePhase(progress, isFirstVisit) {
    let p = THREE.MathUtils.clamp(progress, 0, 1);

    // Returning players: remap progress to skip directly to phase 5
    // (colour-fill at 0.70) so they don't sit through the whole intro.
    if (!isFirstVisit) {
        p = 0.70 + p * 0.30;
    }

    // Walk through phases until we find the one containing p
    let phaseName = 'camera-swing'; // default: last phase
    for (const phase of PHASES) {
        if (p < phase.end) {
            phaseName = phase.name;
            break;
        }
    }

    return { p, phaseName };
}
