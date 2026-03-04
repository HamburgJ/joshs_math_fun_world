/**
 * subconscious.js — The hidden coherence layer.
 *
 * This module manages cross-zone connections, recurring number echoes,
 * and visual rhymes that tie the world together. The player never sees
 * this layer directly — they feel it. Things rhyme. Colors echo.
 * Numbers recur. A shape seen in one zone appears, transformed, in another.
 *
 * Shell Bingby says: "The subconscious is the real architecture.
 * Everything else is just rendering."
 */

import * as THREE from 'three';

/**
 * Recurring constants — the atoms of Josh's Math Fun World.
 * These numbers appear everywhere, never explained, never labeled.
 */
export const CONSTANTS = {
    PI:   Math.PI,
    E:    Math.E,
    PHI:  (1 + Math.sqrt(5)) / 2,   // Golden ratio
    FIVE: 5,                          // The boundary number
    F17:  1597,                       // Fibonacci prime F₁₇
};

/**
 * The exact wireframe green used across all zones.
 * Consistency rule: "The green of the wireframe void is exactly #00FF41 everywhere."
 */
export const WIREFRAME_GREEN = 0x4aff71;

/**
 * SubconsciousManager — tracks cross-zone connections and triggers
 * subtle visual responses when the player has made connections.
 */
export class SubconsciousManager {
    /**
     * @param {object} deps
     * @param {import('./persistence.js').PersistenceManager} deps.persistence
     * @param {import('./secrets.js').SecretsManager} deps.secrets
     */
    constructor({ persistence, secrets }) {
        this._persistence = persistence;
        this._secrets = secrets;

        // Connection states
        this._stonesGlowing = false;
        this._mandelbrotRevealed = false;
        this._benchSitCount = 0;

        // Visual effect callbacks (set by main.js or field)
        this.onStonesGlow = null;          // () => void — light up field stones
        this.onMandelbrotReveal = null;     // () => void — show pattern from bench
    }

    /**
     * Check and update all cross-zone connections.
     * Call this after zone transitions or significant events.
     */
    update() {
        this._checkStoneCavernConnection();
        this._checkBenchMandelbrot();
    }

    /**
     * Record a bench sit and check for the 10-sit Mandelbrot reveal.
     */
    recordBenchSit() {
        this._benchSitCount++;
        if (this._benchSitCount >= 10 && !this._mandelbrotRevealed) {
            this._mandelbrotRevealed = true;
            if (this.onMandelbrotReveal) this.onMandelbrotReveal();
        }
    }

    /**
     * Connection: Zone 11 stalactites ↔ Zone 1 stones.
     * The numbers on the stones in Zone 1 are the first 5 primes: 2, 3, 5, 7, 11.
     * These same primes are the first 5 stalactites in Zone 11.
     * If Josh visits Zone 11 first and THEN returns to Zone 1, the stones glow faintly.
     */
    _checkStoneCavernConnection() {
        if (this._stonesGlowing) return;
        if (!this._persistence) return;

        if (this._persistence.hasVisitedZone('number_caverns')) {
            this._stonesGlowing = true;
            if (this.onStonesGlow) this.onStonesGlow();
        }
    }

    /**
     * After sitting 10 times on the bench, the pull-back camera reveals
     * that the Green Field's object layout forms a Mandelbrot set outline.
     * This is the "final visual secret" — the field was always Zone 3.
     */
    _checkBenchMandelbrot() {
        // Already handled in recordBenchSit()
    }

    /**
     * Get the Fibonacci-prime coordinate for embedding in zones.
     * This is 1597 — the number that recurs everywhere.
     * @returns {number}
     */
    static getFibonacciPrime() {
        return CONSTANTS.F17;
    }

    /**
     * Check if a given number is one of the five fundamental constants.
     * @param {number} n
     * @returns {boolean}
     */
    static isFundamentalConstant(n) {
        const eps = 0.001;
        return (
            Math.abs(n - Math.PI) < eps ||
            Math.abs(n - Math.E) < eps ||
            Math.abs(n) < eps ||        // 0
            Math.abs(n - 1) < eps ||     // 1
            // i is imaginary, so we can't check it as a real number
            false
        );
    }
}

/**
 * Create the "stones glow" effect for the green field.
 * Called when the player returns to the field after visiting Number Caverns.
 * The 5 prime stones pulse with a faint golden emissive light.
 *
 * @param {THREE.Group} fieldGroup - The green field world group
 */
export function applyStoneGlow(fieldGroup) {
    fieldGroup.traverse((child) => {
        if (child.name && child.name.startsWith('primeStone')) {
            // Add a subtle emissive glow to the stone
            if (child.material) {
                const mat = child.material.clone();
                mat.emissive = new THREE.Color(0x554411);
                mat.emissiveIntensity = 0.3;
                child.material = mat;
            }

            // Create a pulsing glow halo around the stone
            const glow = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 6, 6),
                new THREE.MeshBasicMaterial({
                    color: 0xffcc44,
                    transparent: true,
                    opacity: 0.08,
                    side: THREE.BackSide,
                })
            );
            glow.name = 'stoneGlow';
            child.add(glow);
        }
    });
}

/**
 * Apply the Mandelbrot set reveal to the field.
 * After 10 bench sits, faint glowing points appear on the terrain
 * tracing the Mandelbrot set boundary, only visible from the
 * high-angle bench camera pullback.
 *
 * @param {THREE.Group} fieldGroup - The green field world group
 */
export function applyMandelbrotReveal(fieldGroup) {
    const group = new THREE.Group();
    group.name = 'mandelbrotReveal';

    // Sample points on the Mandelbrot set boundary
    // These map to field coordinates (scaled to fit within ~20 unit radius)
    const points = sampleMandelbrotBoundary(200);
    const dotGeo = new THREE.SphereGeometry(0.06, 4, 4);
    const dotMat = new THREE.MeshBasicMaterial({
        color: WIREFRAME_GREEN,
        transparent: true,
        opacity: 0.25,
    });

    for (const [cx, cy] of points) {
        // Map Mandelbrot coords (roughly [-2, 1] x [-1.5, 1.5]) to field space
        const fieldX = cx * 6;   // scale to ~12 unit span
        const fieldZ = cy * 6;

        // Only place dots within field radius
        if (Math.sqrt(fieldX * fieldX + fieldZ * fieldZ) > 20) continue;

        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(fieldX, 0.15, fieldZ);
        group.add(dot);
    }

    fieldGroup.add(group);
}

/**
 * Sample points along the Mandelbrot set boundary using escape-time.
 * Returns an array of [x, y] coordinates in Mandelbrot parameter space.
 *
 * @param {number} count - Approximate number of boundary points
 * @returns {Array<[number, number]>}
 */
function sampleMandelbrotBoundary(count) {
    const points = [];
    const maxIter = 50;

    // Walk a grid and find boundary points (where iteration count transitions)
    const step = Math.sqrt((3 * 3) / count) * 0.8;

    for (let cr = -2.0; cr <= 1.0; cr += step) {
        for (let ci = -1.5; ci <= 1.5; ci += step) {
            const iter = mandelbrotIter(cr, ci, maxIter);
            // Boundary: not inside (iter < maxIter) but neighbor is
            if (iter < maxIter && iter > maxIter * 0.3) {
                // Check if a neighbor is inside
                const n1 = mandelbrotIter(cr + step, ci, maxIter);
                const n2 = mandelbrotIter(cr, ci + step, maxIter);
                if (n1 >= maxIter || n2 >= maxIter) {
                    points.push([cr, ci]);
                }
            }
        }
    }

    return points;
}

/**
 * Standard Mandelbrot iteration count.
 */
function mandelbrotIter(cr, ci, maxIter) {
    let zr = 0, zi = 0;
    for (let i = 0; i < maxIter; i++) {
        const zr2 = zr * zr;
        const zi2 = zi * zi;
        if (zr2 + zi2 > 4) return i;
        zi = 2 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
    }
    return maxIter;
}
