import * as THREE from 'three';
import { HyperbolicSpace } from './hyperbolic-space.js';
import { SphericalSpace }  from './spherical-space.js';
import { TransitionSpace }  from './transition-space.js';
import { hyperbolicMovementTransform, getConformalFactor } from './hyperbolic-movement.js';

/**
 * Zone 5: The Impossible Space — Non-Euclidean Geometry (Orchestrator)
 *
 * Drop-in replacement for the old monolithic NonEuclideanZone.
 * Delegates to three modular sub-zone classes:
 *
 *   5A  HyperbolicSpace   – Poincaré disk, {7,3} tiling, REAL geodesics
 *   5B  SphericalSpace    – Inside-of-sphere, great-circle arcs
 *   5C  TransitionSpace   – Eerily flat Euclidean grid
 *
 * Public API is identical: getScene(), setVisible(), update(dt),
 * setSubZone(), getActiveSubZone(), getTerrainHeight(), getInteractablePositions().
 *
 * ── Module layout ──────────────────────────────────────────────────
 *   non-euclidean/
 *     index.js              ← this file (orchestrator)
 *     hyperbolic-math.js    ← Poincaré disk math: Möbius ops, geodesics, tiling
 *     hyperbolic-space.js   ← 5A sub-zone
 *     spherical-space.js    ← 5B sub-zone
 *     transition-space.js   ← 5C sub-zone
 *     shared-helpers.js     ← text sprites, curvature labels
 */
export class NonEuclideanZone {
    constructor() {
        /** @type {THREE.Group} */
        this.group = new THREE.Group();
        this.group.name = 'NonEuclideanZone';

        /** @type {'hyperbolic'|'spherical'|'transition'} */
        this._activeSubZone = 'hyperbolic';

        // ── Sub-zone instances ─────────────────────────────────────────
        /** @type {HyperbolicSpace} */
        this._hyperbolic = new HyperbolicSpace();

        /** @type {SphericalSpace} */
        this._spherical = new SphericalSpace();

        /** @type {TransitionSpace} */
        this._transition = new TransitionSpace();

        this.group.add(this._hyperbolic.group);
        this.group.add(this._spherical.group);
        this.group.add(this._transition.group);

        // Curvature Dial visual
        const crystalGeo = new THREE.OctahedronGeometry(0.5, 0);
        const crystalMat = new THREE.MeshLambertMaterial({
            color: 0x00ffff,
            emissive: 0x004444,
            wireframe: true
        });
        this._crystal = new THREE.Mesh(crystalGeo, crystalMat);
        this._crystal.position.set(0, 1.5, 0);
        this.group.add(this._crystal);

        /** @type {((name: string) => void)|null} */
        this.onSubZoneChange = null;

        // Start with hyperbolic visible
        this.setSubZone('hyperbolic');
    }

    // ─── Lookup helper ──────────────────────────────────────────────────

    /** @private */
    _subZones() {
        return {
            hyperbolic: this._hyperbolic,
            spherical:  this._spherical,
            transition: this._transition,
        };
    }

    // ─── Public API (same shape as the old monolithic class) ────────────

    /** @returns {THREE.Group} */
    getScene() {
        return this.group;
    }

    /**
     * Per-frame update — delegates to the active sub-zone.
     * @param {number} dt  Delta time in seconds
     */
    update(dt) {
        const active = this._subZones()[this._activeSubZone];
        if (active) active.update(dt);
        if (this._crystal) {
            this._crystal.rotation.y += dt * 0.5;
            this._crystal.position.y = 1.5 + Math.sin(Date.now() * 0.002) * 0.2;
        }
    }

    /**
     * Show or hide the entire zone.
     * @param {boolean} visible
     */
    setVisible(visible) {
        this.group.visible = visible;
    }

    /**
     * Switch to a specific sub-zone, hiding the others.
     * @param {'hyperbolic'|'spherical'|'transition'} name
     */
    setSubZone(name) {
        const subs = this._subZones();
        if (!(name in subs)) {
            console.warn(`[NonEuclideanZone] Unknown sub-zone: "${name}". Valid: ${Object.keys(subs).join(', ')}`);
            return;
        }

        this._activeSubZone = name;
        for (const [key, sub] of Object.entries(subs)) {
            sub.group.visible = (key === name);
        }
    }

    /**
     * @returns {'hyperbolic'|'spherical'|'transition'}
     */
    getActiveSubZone() {
        return this._activeSubZone;
    }

    /**
     * Cycles to the next curvature sub-zone.
     */
    cycleCurvature() {
        const subs = Object.keys(this._subZones());
        const idx = subs.indexOf(this._activeSubZone);
        const next = subs[(idx + 1) % subs.length];
        this.setSubZone(next);

        // Update tint color of the dial based on curvature
        if (this._crystal) {
            const mat = this._crystal.material;
            if (next === 'hyperbolic') mat.color.setHex(0x00cc66);
            else if (next === 'spherical') mat.color.setHex(0xaa55ff);
            else mat.color.setHex(0xaaaaaa);
        }

        if (this.onSubZoneChange) {
            this.onSubZoneChange(next);
        }
    }

    /**
     * Terrain height at (x, z) — delegates to the active sub-zone.
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    getTerrainHeight(x, z) {
        const active = this._subZones()[this._activeSubZone];
        return active ? active.getTerrainHeight(x, z) : 0;
    }

    /**
     * Interactable positions for all sub-zones plus the main central dial.
     * @returns {{ position: THREE.Vector3, label: string, type: string }[]}
     */
    getInteractablePositions() {
        let allItems = [];
        const subs = this._subZones();
        for (const key in subs) {
            const items = subs[key].getInteractables().map(item => {
                return { ...item, parent: subs[key].group };
            });
            allItems.push(...items);
        }

        allItems.push({
            position: new THREE.Vector3(0, 1.5, 0),
            label: 'The Curvature Dial',
            type: 'activate',
            action: () => this.cycleCurvature()
        });

        return allItems;
    }

    /**
     * Returns the movement transform function dynamically bound to the active subzone.
     * The game loop should call josh.setMovementTransform() with this value when this zone is entered.
     *
     * @returns {((x: number, z: number, dx: number, dz: number) => { x: number, z: number })|null}
     */
    getMovementTransform() {
        return (x, z, vx, vz) => {
            if (this._activeSubZone === 'hyperbolic') {
                return hyperbolicMovementTransform(x, z, vx, vz);
            }
            return { x: x + vx, z: z + vz };
        };
    }

    /**
     * Returns the conformal factor at a given world position (for UI / scaling).
     * Only meaningful in the hyperbolic sub-zone; returns 1 otherwise.
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    getConformalFactor(x, z) {
        if (this._activeSubZone === 'hyperbolic') {
            return getConformalFactor(x, z);
        }
        return 1;
    }
}
