/**
 * Zone 0 — The Arrival  (orchestrator)
 *
 * The loading screen that isn't a loading screen. A white void with Josh
 * standing at the center, seen from above. As progress advances, mathematical
 * objects materialise around Josh — a number line extends from his feet,
 * coordinate axes bloom outward, the number line curves into a circle, the
 * circle fills with colour and becomes grass, and the camera swings down
 * behind Josh into third-person.
 *
 * This is a scripted intro sequence, NOT a walkable zone. Its update is
 * progress-driven, not movement-driven. There is no terrain, no
 * interactables, no proximity behaviour. It extends ZoneBase only for
 * interface compatibility with the zone registry.
 *
 * Shell Bingby once said: "Every universe begins with a single point.
 * Then the point gets bored and invents axes."
 */

import * as THREE from 'three';
import { ZoneBase } from '../zone-base.js';
import { createJosh } from '../../josh/model.js';

// ── Sub-modules ────────────────────────────────────────────────────────
import { smoothstep, phaseProgress, computePhase } from './phases.js';
import {
    buildNumberLine,
    buildAxes,
    buildGrid,
    buildCircle,
    buildGrass,
    setJoshOpacity,
    setNumberLineOpacity,
    setGridOpacity,
} from './elements.js';
import { computeCameraState, computeRenderScale } from './camera.js';

export class TheArrival extends ZoneBase {
    constructor() {
        super('TheArrival');

        // ── Internal state ──────────────────────────────────────────────
        /** @type {number} Cached progress value */
        this._progress = 0;

        /** @type {string} Current phase label */
        this._phase = 'void';

        /** @type {boolean} Whether this is the player's first visit */
        this._isFirstVisit = true;

        /** @type {object|null} Cached result from the last update */
        this._result = null;

        // ── Josh ────────────────────────────────────────────────────────
        /** @type {THREE.Group} */
        this.josh = createJosh();
        this.josh.position.set(0, 0, 0);
        this.group.add(this.josh);

        // ── Elements ────────────────────────────────────────────────────

        // Number line
        const nl = buildNumberLine();
        /** @type {THREE.Group} */ this._numberLineGroup = nl.group;
        this.group.add(this._numberLineGroup);

        // Coordinate axes
        const ax = buildAxes();
        /** @type {THREE.Group} */ this._axesGroup = ax.group;
        this.group.add(this._axesGroup);

        // Grid
        const gr = buildGrid();
        /** @type {THREE.Group} */ this._gridGroup = gr.group;
        /** @type {THREE.Material | THREE.Material[]} */ this._gridMaterial = gr.material;
        this.group.add(this._gridGroup);

        // Circle (projective line metaphor)
        const ci = buildCircle();
        /** @type {THREE.Group} */ this._circleGroup = ci.group;
        /** @type {THREE.LineBasicMaterial} */ this._circleMat = ci.circleMat;
        /** @type {THREE.LineBasicMaterial} */ this._circleGlowMat = ci.circleGlowMat;
        this.group.add(this._circleGroup);

        // Grass disk
        const ga = buildGrass();
        /** @type {THREE.Group} */ this._grassGroup = ga.group;
        /** @type {THREE.MeshBasicMaterial} */ this._grassMat = ga.grassMat;
        this.group.add(this._grassGroup);
    }

    // =====================================================================
    //  PUBLIC API — progress-driven control
    // =====================================================================

    /**
     * Set the loading/intro progress externally.
     * The next call to update(dt) will use this value.
     * @param {number} p  Progress in [0, 1]
     */
    setProgress(p) {
        this._progress = THREE.MathUtils.clamp(p, 0, 1);
    }

    /**
     * Set whether this is the player's first visit.
     * When false, the arrival sequence skips phases 1–4 and jumps
     * straight to the colour-fill / camera-swing, so returning
     * players aren't forced through the whole intro again.
     * @param {boolean} isFirst
     */
    setFirstVisit(isFirst) {
        this._isFirstVisit = !!isFirst;
    }

    /**
     * Retrieve the result computed by the most recent update().
     * @returns {{
     *   phase: string,
     *   cameraPosition: THREE.Vector3,
     *   cameraTarget: THREE.Vector3,
     *   renderScale: number,
     *   done: boolean
     * } | null}
     */
    getResult() {
        return this._result;
    }

    /**
     * Reset the arrival sequence to the beginning so it can be replayed.
     */
    reset() {
        this._progress = 0;
        this._phase = 'void';
        this._result = null;

        // Josh: fully transparent
        setJoshOpacity(this.josh, 0);

        // Number line: collapsed
        this._numberLineGroup.scale.set(0, 1, 1);
        setNumberLineOpacity(this._numberLineGroup, 1);

        // Axes: hidden and collapsed
        this._axesGroup.visible = false;
        this._axesGroup.scale.set(0, 1, 0);

        // Grid: hidden and transparent
        this._gridGroup.visible = false;
        setGridOpacity(this._gridMaterial, 0);

        // Circle: hidden and collapsed
        this._circleGroup.visible = false;
        this._circleGroup.scale.set(0, 0, 0);
        this._circleMat.opacity = 0;
        this._circleGlowMat.opacity = 0;

        // Grass: hidden and collapsed
        this._grassGroup.visible = false;
        this._grassGroup.scale.set(0, 1, 0);
        this._grassMat.opacity = 0;
    }

    // =====================================================================
    //  UPDATE  — overrides ZoneBase.update(dt)
    // =====================================================================

    /**
     * Advance the arrival sequence. Uses the progress value set via
     * setProgress(). The result is cached and retrievable via getResult().
     *
     * ZoneBase.update(dt) runs animators / reactions / spectacles — we
     * call super first (even though this zone has none) for correctness,
     * then run our progress-driven logic.
     *
     * @param {number} dt  Delta time in seconds
     * @returns {{
     *   phase: string,
     *   cameraPosition: THREE.Vector3,
     *   cameraTarget: THREE.Vector3,
     *   renderScale: number,
     *   done: boolean
     * }}
     */
    update(dt) {
        // Let ZoneBase tick its internals (time, animators, reactions)
        super.update(dt);

        // Resolve effective progress and phase
        const { p, phaseName } = computePhase(this._progress, this._isFirstVisit);
        this._phase = phaseName;

        // Returning players: snap pre-phase-5 elements to completed state
        if (!this._isFirstVisit) {
            this._snapPrePhase5();
        }

        // Apply phase-specific element animations
        this._applyPhase(p, phaseName);

        // Camera & render scale
        const { position: cameraPosition, target: cameraTarget } = computeCameraState(p);
        const renderScale = computeRenderScale(p);

        this._result = {
            phase: this._phase,
            cameraPosition,
            cameraTarget,
            renderScale,
            done: p >= 1.0,
        };

        return this._result;
    }

    // =====================================================================
    //  PHASE ANIMATION  (private)
    // =====================================================================

    /**
     * Apply visibility, scale, and opacity changes for the current phase.
     * @param {number} p          Effective progress [0, 1]
     * @param {string} phaseName  Current phase label
     * @private
     */
    _applyPhase(p, phaseName) {
        switch (phaseName) {

            // ─── Phase 1: Void (0.00 – 0.15) ───────────────────────────
            // Josh is visible, camera is straight above. Nothing else yet.
            case 'void': {
                const t = phaseProgress(p, 0, 0.15);
                // Josh fades in
                setJoshOpacity(this.josh, smoothstep(t));
                break;
            }

            // ─── Phase 2: Number Line (0.15 – 0.30) ────────────────────
            // The green number line extends left and right from Josh's feet.
            case 'number-line': {
                const t = smoothstep(phaseProgress(p, 0.15, 0.30));
                // Scale the number-line group along X from 0 → 1
                this._numberLineGroup.scale.x = t;
                break;
            }

            // ─── Phase 3: Coordinate Axes (0.30 – 0.50) ────────────────
            // X and Z axes bloom outward; grid fades in.
            case 'axes': {
                const t = smoothstep(phaseProgress(p, 0.30, 0.50));
                // Ensure number line is fully extended
                this._numberLineGroup.scale.x = 1;
                // Bloom axes
                this._axesGroup.visible = true;
                this._axesGroup.scale.x = t;
                this._axesGroup.scale.z = t;
                // Fade in grid
                this._gridGroup.visible = true;
                setGridOpacity(this._gridMaterial, t * 0.6); // never fully opaque — keep it subtle
                break;
            }

            // ─── Phase 4: Circle (0.50 – 0.70) ─────────────────────────
            // The number line visually "wraps" into a circle. The circle
            // scales up and glows while the straight line fades out.
            case 'circle': {
                const t = smoothstep(phaseProgress(p, 0.50, 0.70));
                // Fade out the number line
                setNumberLineOpacity(this._numberLineGroup, 1 - t);
                // Scale up the circle
                this._circleGroup.visible = true;
                this._circleGroup.scale.setScalar(t);
                // Circle opacity & glow
                this._circleMat.opacity = t;
                this._circleGlowMat.opacity = t * 0.4;
                break;
            }

            // ─── Phase 5: Colour Fill (0.70 – 0.85) ────────────────────
            // The circle becomes a green disk. Grass expands. Wireframe fades.
            case 'colour-fill': {
                const t = smoothstep(phaseProgress(p, 0.70, 0.85));
                // Fade out wireframe elements
                setNumberLineOpacity(this._numberLineGroup, 0);
                this._circleMat.opacity = 1 - t;
                this._circleGlowMat.opacity = (1 - t) * 0.4;
                setGridOpacity(this._gridMaterial, (1 - t) * 0.6);
                // Grow grass disk
                this._grassGroup.visible = true;
                this._grassGroup.scale.x = t;
                this._grassGroup.scale.z = t;
                this._grassMat.opacity = t;
                break;
            }

            // ─── Phase 6: Camera Swing (0.85 – 1.00) ───────────────────
            // Camera swings from top-down to behind Josh. Resolution scales up.
            case 'camera-swing': {
                // Ensure grass is fully visible
                this._grassGroup.scale.x = 1;
                this._grassGroup.scale.z = 1;
                this._grassMat.opacity = 1;
                // Clean up wireframe remnants
                this._circleMat.opacity = 0;
                this._circleGlowMat.opacity = 0;
                setNumberLineOpacity(this._numberLineGroup, 0);
                setGridOpacity(this._gridMaterial, 0);
                break;
            }
        }
    }

    /**
     * Snap all pre-phase-5 elements to their completed states so the
     * colour-fill / camera-swing phases can begin immediately.
     * Called every frame for returning players who skip the intro.
     * @private
     */
    _snapPrePhase5() {
        // Josh fully visible
        setJoshOpacity(this.josh, 1);

        // Number line fully extended then faded out
        this._numberLineGroup.scale.x = 1;
        setNumberLineOpacity(this._numberLineGroup, 0);

        // Axes fully bloomed
        this._axesGroup.visible = true;
        this._axesGroup.scale.set(1, 1, 1);

        // Grid visible (will fade during colour-fill)
        this._gridGroup.visible = true;

        // Circle fully formed (will fade during colour-fill)
        this._circleGroup.visible = true;
        this._circleGroup.scale.setScalar(1);
        this._circleMat.opacity = 1;
        this._circleGlowMat.opacity = 0.4;
    }
}
