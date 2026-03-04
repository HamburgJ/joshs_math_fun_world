/**
 * Camera interpolation logic for The Arrival intro sequence.
 *
 * The camera starts directly above Josh (top-down) and over the course
 * of the six phases descends into a behind-Josh third-person perspective.
 * Resolution also scales up to simulate "the world coming into focus."
 *
 * Shell Bingby once said: "The best camera move is the one where the
 * viewer forgets a camera exists."
 */

import * as THREE from 'three';
import { smoothstep, phaseProgress } from './phases.js';

// ═══════════════════════════════════════════════════════════════════════
//  Camera Anchors
// ═══════════════════════════════════════════════════════════════════════

/** Top-down starting position (looking straight down at Josh) */
export const CAM_TOP_DOWN = Object.freeze(new THREE.Vector3(0, 30, 0.01));

/** Final third-person position (behind Josh) */
export const CAM_BEHIND = Object.freeze(new THREE.Vector3(0, 5, 10));

// ═══════════════════════════════════════════════════════════════════════
//  Camera State Computation
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute camera position and look-at target for a given effective
 * progress value. Each phase drives its own interpolation.
 *
 * @param {number} p  Effective progress [0, 1] (already remapped for returning players)
 * @returns {{ position: THREE.Vector3, target: THREE.Vector3 }}
 */
export function computeCameraState(p) {
    const position = new THREE.Vector3();
    const target = new THREE.Vector3(0, 1.0, 0);

    // ─── Phase 1: Void (0.00 – 0.15) ───────────────────────────────
    // Camera: straight top-down
    if (p < 0.15) {
        position.copy(CAM_TOP_DOWN);
    }

    // ─── Phase 2: Number Line (0.15 – 0.30) ────────────────────────
    // Camera stays top-down but rises slightly
    else if (p < 0.30) {
        const t = smoothstep(phaseProgress(p, 0.15, 0.30));
        position.lerpVectors(CAM_TOP_DOWN, new THREE.Vector3(0, 35, 0.01), t);
    }

    // ─── Phase 3: Axes (0.30 – 0.50) ───────────────────────────────
    // Camera rises further
    else if (p < 0.50) {
        const t = smoothstep(phaseProgress(p, 0.30, 0.50));
        position.set(0, THREE.MathUtils.lerp(35, 38, t), 0.01);
    }

    // ─── Phase 4: Circle (0.50 – 0.70) ─────────────────────────────
    // Still top-down-ish but starting a gentle tilt
    else if (p < 0.70) {
        const t = smoothstep(phaseProgress(p, 0.50, 0.70));
        position.set(
            0,
            THREE.MathUtils.lerp(38, 30, t * 0.3),
            THREE.MathUtils.lerp(0.01, 3, t),
        );
    }

    // ─── Phase 5: Colour Fill (0.70 – 0.85) ────────────────────────
    // Camera starts swinging down
    else if (p < 0.85) {
        const t = smoothstep(phaseProgress(p, 0.70, 0.85));
        const camT = t * 0.3; // only 30 % of the swing happens here
        position.lerpVectors(
            new THREE.Vector3(0, 30, 3),
            CAM_BEHIND,
            camT,
        );
    }

    // ─── Phase 6: Camera Swing (0.85 – 1.00) ───────────────────────
    // Camera swings from partially-descended to final behind-Josh
    else {
        const t = smoothstep(phaseProgress(p, 0.85, 1.0));
        const swingStart = new THREE.Vector3(0, 22, 5);
        position.lerpVectors(swingStart, CAM_BEHIND, t);

        // Camera target shifts from ground to Josh's head area
        target.set(
            0,
            THREE.MathUtils.lerp(0, 1.8, t),
            THREE.MathUtils.lerp(0, -1, t),
        );
    }

    return { position, target };
}

// ═══════════════════════════════════════════════════════════════════════
//  Render Scale
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the render resolution scale for a given effective progress.
 *
 * Resolution increases across the whole sequence:
 *   progress 0  → 160×120  (scale ≈ 0.083 at 1920)
 *   progress 1  → full resolution (scale 1.0)
 *
 * Uses a stepped approach: sharply low at start, ramps in later phases.
 *
 * @param {number} p  Effective progress [0, 1]
 * @returns {number}   Render scale factor
 */
export function computeRenderScale(p) {
    if (p < 0.50) {
        // Phases 1–3: stay chunky
        return THREE.MathUtils.lerp(0.083, 0.15, p / 0.50);
    } else if (p < 0.85) {
        // Phases 4–5: ramp up
        return THREE.MathUtils.lerp(0.15, 0.5, (p - 0.50) / 0.35);
    } else {
        // Phase 6: final crisp
        return THREE.MathUtils.lerp(0.5, 1.0, (p - 0.85) / 0.15);
    }
}
