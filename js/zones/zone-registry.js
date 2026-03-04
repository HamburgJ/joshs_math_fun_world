import * as THREE from 'three';

// ── Zone classes ────────────────────────────────────────────────────────
import { WireframeVoid }      from './wireframe-void/index.js';
import { CoordinatePlane }    from './coordinate-plane/index.js';
import { NonEuclideanZone }   from './non-euclidean/index.js';
import { FractalBoundary }    from './fractal-boundary/index.js';
import { NumberCaverns }      from './number-caverns/index.js';
import { InnerSphere }        from './inner-sphere/index.js';

// ── World-state presets ─────────────────────────────────────────────────
import {
    GREEN_FIELD_STATE,
    WIREFRAME_VOID_STATE,
    COORDINATE_PLANE_STATE,
    NON_EUCLIDEAN_STATE,
    FRACTAL_BOUNDARY_STATE,
    NUMBER_CAVERNS_STATE,
    INNER_SPHERE_STATE,
} from '../shifts/world-state.js';

import { TransitionType } from '../shifts/transitions.js';

/**
 * ZoneRegistry — single source of truth for every zone in the world.
 *
 * Each entry maps a zone key to:
 *   • instance   – the zone class instance (has getScene/setVisible/update)
 *   • state      – the WorldState preset used when entering the zone
 *   • transition – the default TransitionType to use when arriving
 *   • duration   – default transition duration in seconds
 *   • entryPos   – default spawn position for Josh when entering the zone
 *   • exitRadius – how far Josh walks before hitting a zone boundary
 *
 * The green field is NOT in this registry because it's a raw THREE.Group
 * (different API). It's handled as a special case in main / game-loop.
 */

/** @typedef {{ instance: object, state: object, transition: string, duration: number, entryPos: THREE.Vector3, exitRadius: number }} ZoneEntry */

export class ZoneRegistry {
    constructor() {
        /** @type {Map<string, ZoneEntry>} */
        this._zones = new Map();

        /** @type {string} */
        this._activeZone = 'green_field';
    }

    /**
     * Create all zone instances and register them.
     * Call once during bootstrap.
     * @param {THREE.Scene} scene  The Three.js scene to add zone groups to.
     */
    init(scene) {
        const defs = [
            { key: 'wireframe_void',       Ctor: WireframeVoid,      state: WIREFRAME_VOID_STATE,      trans: TransitionType.GLITCH,    dur: 0.8,  entry: [0, 0, 0],    exitR: 25  },
            { key: 'coordinate_plane',     Ctor: CoordinatePlane,    state: COORDINATE_PLANE_STATE,     trans: TransitionType.MORPH,     dur: 1.5,  entry: [0, 0, 0],    exitR: 90  },
            { key: 'non_euclidean',        Ctor: NonEuclideanZone,   state: NON_EUCLIDEAN_STATE,        trans: TransitionType.MORPH,     dur: 2.0,  entry: [0, 0, 0],    exitR: 40  },
            { key: 'fractal_boundary',     Ctor: FractalBoundary,    state: FRACTAL_BOUNDARY_STATE,     trans: TransitionType.GLITCH,    dur: 1.2,  entry: [0, 0, 0],    exitR: 60  },
            { key: 'number_caverns',       Ctor: NumberCaverns,      state: NUMBER_CAVERNS_STATE,       trans: TransitionType.CROSSFADE, dur: 1.5,  entry: [0, 0, 0],    exitR: 40  },
            { key: 'inner_sphere',         Ctor: InnerSphere,        state: INNER_SPHERE_STATE,         trans: TransitionType.MORPH,     dur: 1.5,  entry: [0, 0, 0],    exitR: 85  },
        ];

        for (const def of defs) {
            const instance = new def.Ctor();
            scene.add(instance.getScene());
            instance.setVisible(false);

            this._zones.set(def.key, {
                instance,
                state:      def.state,
                transition: def.trans,
                duration:   def.dur,
                entryPos:   new THREE.Vector3(...def.entry),
                exitRadius: def.exitR,
            });
        }
    }

    /** Get a zone entry by key. @returns {ZoneEntry|undefined} */
    get(key) { return this._zones.get(key); }

    /** Get the zone instance (class) by key. */
    getInstance(key) { return this._zones.get(key)?.instance; }

    /** Iterate over all zone entries. */
    forEach(fn) { this._zones.forEach(fn); }

    /** All zone keys (excluding green_field). */
    keys() { return [...this._zones.keys()]; }

    /** Number of registered zones. */
    get size() { return this._zones.size; }

    // ── Visibility ──────────────────────────────────────────────────────

    /** @returns {string} */
    get activeZone() { return this._activeZone; }

    /**
     * Switch which zone is visible.
     * @param {string} key            Zone to show.
     * @param {THREE.Group} fieldGroup The green field group (special case).
     */
    setActiveZone(key, fieldGroup) {
        if (key === this._activeZone) return;

        // Hide everything
        fieldGroup.visible = false;
        this._zones.forEach(z => z.instance.setVisible(false));

        // Show target
        if (key === 'green_field') {
            fieldGroup.visible = true;
        } else {
            const entry = this._zones.get(key);
            if (entry) entry.instance.setVisible(true);
        }

        this._activeZone = key;
    }

    // ── Per-frame updates ───────────────────────────────────────────────

    /** Tick every zone's animation (cheap when hidden). */
    updateAll(dt) {
        this._zones.forEach(z => z.instance.update(dt));
    }
}
