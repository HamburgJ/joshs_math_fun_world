import { TransitionType } from '../shifts/transitions.js';
import {
    GREEN_FIELD_STATE,
    WIREFRAME_VOID_STATE,
    COORDINATE_PLANE_STATE,
    NON_EUCLIDEAN_STATE,
    FRACTAL_BOUNDARY_STATE,
    NUMBER_CAVERNS_STATE,
    INNER_SPHERE_STATE,
} from '../shifts/world-state.js';
import { isInsidePortal, getPortalByZone } from '../world/portal-config.js';
import { isInsideCaveTrigger, CAVE_RETURN_POS } from '../world/mountain-cave.js';
import { globalEventBus, EVENTS } from '../events/event-bus.js';

/**
 * ZoneTransitions — spatial rules for moving between zones.
 *
 * Given Josh's current position and zone, this module decides if a zone
 * transition should occur and to where. It also handles the actual
 * mechanics of executing a transition (shift manager, josh repositioning,
 * zone visibility swap).
 *
 * Green-field transitions fire when Josh walks into a portal arch
 * (proximity check via portal-config.js). Other zones still use
 * edge-distance rules.
 */

const FIELD_EDGE = 130;  // Fallback boundary — hub is much larger now

/**
 * Transition rules.
 *
 * Each rule says: "When in zone X, if condition C is true, go to zone Y."
 * `check` receives { x, z } position and optional context, returns boolean.
 *
 * @typedef {{
 *   from:       string,
 *   to:         string,
 *   state:      import('../shifts/world-state.js').WorldState,
 *   transition: string,
 *   duration:   number,
 *   check:      (pos: {x:number, z:number}, ctx?: object) => boolean,
 *   entryPos?:  [number, number, number],
 * }} TransitionRule
 */

/** @type {TransitionRule[]} */
const RULES = [
    // ── From Green Field (portal proximity triggers) ────────────────────
    {
        from: 'green_field', to: 'coordinate_plane',
        state: COORDINATE_PLANE_STATE, transition: TransitionType.MORPH, duration: 1.5,
        check: (p) => isInsidePortal(p, getPortalByZone('coordinate_plane')),
        entryPos: [0, 0, 80],
    },
    {
        from: 'green_field', to: 'wireframe_void',
        state: WIREFRAME_VOID_STATE, transition: TransitionType.GLITCH, duration: 0.8,
        check: (p) => isInsidePortal(p, getPortalByZone('wireframe_void')),
        entryPos: [0, 0, 0],
    },
    {
        from: 'green_field', to: 'non_euclidean',
        state: NON_EUCLIDEAN_STATE, transition: TransitionType.MORPH, duration: 2.0,
        check: (p) => isInsidePortal(p, getPortalByZone('non_euclidean')),
        entryPos: [0, 0, 0],
    },
    {
        from: 'green_field', to: 'fractal_boundary',
        state: FRACTAL_BOUNDARY_STATE, transition: TransitionType.GLITCH, duration: 1.2,
        check: (p) => isInsidePortal(p, getPortalByZone('fractal_boundary')),
        entryPos: [0, 0, 0],
    },
    // ── Green Field → Number Caverns (portal arch OR deep cave trigger) ─
    {
        from: 'green_field', to: 'number_caverns',
        state: NUMBER_CAVERNS_STATE, transition: TransitionType.CROSSFADE, duration: 2.0,
        check: (p) => isInsidePortal(p, getPortalByZone('number_caverns')) || isInsideCaveTrigger(p),
        entryPos: [0, 0, 0],
    },
    {
        from: 'green_field', to: 'inner_sphere',
        state: INNER_SPHERE_STATE, transition: TransitionType.MORPH, duration: 1.5,
        check: p => isInsidePortal(p, getPortalByZone('inner_sphere')),
        entryPos: [0, 0, 0],
    },

    // ── From Coordinate Plane ───────────────────────────────────────────
    {
        from: 'coordinate_plane', to: 'green_field',
        state: GREEN_FIELD_STATE, transition: TransitionType.MORPH, duration: 1.5,
        check: (p) => p.z > FIELD_EDGE,
        entryPos: [0, 0, -60],
    },
    {
        from: 'coordinate_plane', to: 'fractal_boundary',
        state: FRACTAL_BOUNDARY_STATE, transition: TransitionType.GLITCH, duration: 1.2,
        check: (p) => p.x > FIELD_EDGE,
        entryPos: [0, 0, 0],
    },
    {
        from: 'coordinate_plane', to: 'non_euclidean',
        state: NON_EUCLIDEAN_STATE, transition: TransitionType.MORPH, duration: 2.0,
        check: (p) => p.z < -FIELD_EDGE,
        entryPos: [0, 0, 0],
    },

    // ── From Wireframe Void ─────────────────────────────────────────────
    // Rooms extend to x=±55, z=±57.5 — boundary must be beyond all walls
    {
        from: 'wireframe_void', to: 'green_field',
        state: GREEN_FIELD_STATE, transition: TransitionType.GLITCH, duration: 0.8,
        check: (p) => Math.abs(p.x) > 62 || Math.abs(p.z) > 62,
        entryPos: [80, 0, 0],
    },

    // ── From Non-Euclidean ──────────────────────────────────────────────
    {
        from: 'non_euclidean', to: 'green_field',
        state: GREEN_FIELD_STATE, transition: TransitionType.MORPH, duration: 2.0,
        check: (p) => Math.abs(p.x) > 40 || Math.abs(p.z) > 40,
        entryPos: [-80, 0, 0],
    },

    // ── From Fractal Boundary ───────────────────────────────────────────
    {
        from: 'fractal_boundary', to: 'coordinate_plane',
        state: COORDINATE_PLANE_STATE, transition: TransitionType.CROSSFADE, duration: 1.5,
        check: (p) => p.x < -60,
        entryPos: [80, 0, 0],
    },
    {
        from: 'fractal_boundary', to: 'green_field',
        state: GREEN_FIELD_STATE, transition: TransitionType.CROSSFADE, duration: 1.5,
        check: (p) => p.x > 60 || Math.abs(p.z) > 60,
        entryPos: [0, 0, -60],
    },

    // ── From Number Caverns ─────────────────────────────────────────────
    // Exit returns Josh to the cave mouth in the NW mountain
    {
        from: 'number_caverns', to: 'green_field',
        state: GREEN_FIELD_STATE, transition: TransitionType.CROSSFADE, duration: 2.0,
        check: (p) => Math.abs(p.x) > 40 || Math.abs(p.z) > 40,
        entryPos: CAVE_RETURN_POS,
    },

    // ── From Inner Sphere ───────────────────────────────────────────────
    {
        from: 'inner_sphere', to: 'green_field',
        state: GREEN_FIELD_STATE, transition: TransitionType.MORPH, duration: 1.5,
        // Exit if he falls through the middle hole or walks to edge
        check: (p) => Math.sqrt(p.x*p.x + p.z*p.z) > 130,
        entryPos: [-20, 36, 25], // Parkour tower summit (where the sphere portal is)
    },
];

/**
 * Flash effect parameters per transition type.
 * Each zone entrance gets a screen-space visual spectacle.
 */
const TRANSITION_FLASH = {
    [TransitionType.HARD_CUT]:  { color: 0xffffff, duration: 0.15, intensity: 1.0 },
    [TransitionType.CROSSFADE]: { color: 0xeeeeff, duration: 0.6,  intensity: 0.4 },
    [TransitionType.MORPH]:     { color: 0xaaccff, duration: 0.8,  intensity: 0.35 },
    [TransitionType.GLITCH]:    { color: 0x00ff44, duration: 0.3,  intensity: 0.7 },
    default:                    { color: 0xffffff, duration: 0.4,  intensity: 0.5 },
};

/**
 * ZoneTransitionManager — checks boundary rules and executes transitions.
 */
export class ZoneTransitionManager {
    /**
     * @param {object} deps
     * @param {import('./zone-registry.js').ZoneRegistry} deps.registry
     * @param {import('../shifts/shift-manager.js').ShiftManager} deps.shiftManager
     * @param {import('../josh/josh.js').Josh} deps.josh
     * @param {THREE.Group} deps.fieldGroup  The green-field Group
     * @param {import('../rendering/post-processing.js').PostProcessing} [deps.postProcess]
     */
    constructor({ registry, shiftManager, josh, fieldGroup, postProcess }) {
        this._registry     = registry;
        this._shiftManager = shiftManager;
        this._josh         = josh;
        this._fieldGroup   = fieldGroup;
        this._postProcess  = postProcess || null;
        this._transitioning = false;

        /** Callback fired when a zone transition completes. (fromZone, toZone) => void */
        this.onTransition = null;
    }

    /** @returns {boolean} */
    get isTransitioning() { return this._transitioning; }

    /**
     * Called every frame. Checks all rules for the current zone and
     * fires the first match.
     *
     * @param {{ interact: boolean }} ctx  Additional context (e.g. input state)
     */
    check(ctx) {
        if (this._transitioning) return;

        const currentZone = this._registry.activeZone;
        const pos = this._josh.getPosition();
        const p = { x: pos.x, y: pos.y, z: pos.z };

        for (const rule of RULES) {
            if (rule.from !== currentZone) continue;
            if (!rule.check(p, ctx)) continue;

            this._execute(rule);
            return;
        }
    }

    /**
     * Force a transition to a specific zone (e.g. from an interaction trigger).
     * @param {string} targetZone
     * @param {string} [transType]
     * @param {number} [duration]
     */
    goTo(targetZone, transType, duration) {
        const entry = this._registry.get(targetZone);
        if (!entry) return;

        /** @type {TransitionRule} */
        const rule = {
            from: this._registry.activeZone,
            to:   targetZone,
            state: entry.state,
            transition: transType ?? entry.transition,
            duration:   duration  ?? entry.duration,
            check: () => true,
            entryPos: entry.entryPos.toArray(),
        };
        this._execute(rule);
    }

    /** @private */
    _execute(rule) {
        this._transitioning = true;

        this._shiftManager.pushHistory();
        this._shiftManager.beginTransition(rule.state, rule.duration, rule.transition);

        // ── Zone transition spectacle ───────────────────────────────────
        // Flash effect color/intensity depends on transition type.
        if (this._postProcess) {
            const flashOpts = TRANSITION_FLASH[rule.transition] || TRANSITION_FLASH.default;
            this._postProcess.flashTransition(flashOpts);
        }

        const entryPos = rule.entryPos || [0, 0, 0];

        setTimeout(() => {
            this._registry.setActiveZone(rule.to, this._fieldGroup);
            this._josh.teleportTo(entryPos[0], entryPos[1], entryPos[2]);
            this._transitioning = false;

            globalEventBus.emit(EVENTS.ZONE_ENTERED, { fromZone: rule.from, toZone: rule.to });
        }, rule.duration * 1000);
    }
}
