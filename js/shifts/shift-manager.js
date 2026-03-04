import { WorldState } from './world-state.js';
import { TransitionType, getTransitionEasing } from './transitions.js';

/**
 * ShiftManager — the core state machine that drives world-state transitions.
 *
 * Holds the current WorldState, manages timed transitions between states,
 * evaluates registered triggers each frame, and keeps a history stack.
 */
export class ShiftManager {
    /**
     * @param {WorldState} initialState
     */
    constructor(initialState) {
        /** @type {WorldState} */
        this._currentState = initialState;

        // ── Transition bookkeeping ──────────────────────────────────────
        /** @type {WorldState|null} */
        this._fromState    = null;
        /** @type {WorldState|null} */
        this._targetState  = null;
        /** @type {number} total duration in seconds */
        this._duration     = 0;
        /** @type {number} elapsed time in seconds */
        this._elapsed      = 0;
        /** @type {string|null} TransitionType value */
        this._transType    = null;
        /** @type {((t:number)=>number)|null} */
        this._easingFn     = null;
        /** @type {boolean} */
        this._transitioning = false;

        // ── History ─────────────────────────────────────────────────────
        /** @type {WorldState[]} */
        this._history = [];

        // ── Triggers ────────────────────────────────────────────────────
        /** @type {Map<string, {id:string, condition:()=>boolean, targetState:WorldState, duration:number, type:string, once:boolean, fired:boolean}>} */
        this._triggers = new Map();
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Transitions
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Begin a transition from the current state to `targetState`.
     *
     * @param {WorldState} targetState
     * @param {number}     duration  Seconds (0 for instant)
     * @param {string}     type      One of TransitionType values
     */
    beginTransition(targetState, duration, type = TransitionType.CROSSFADE) {
        // Snapshot the current (possibly mid-interpolation) state as source
        this._fromState    = this.getCurrentState();
        this._targetState  = targetState;
        this._duration     = Math.max(0, duration);
        this._elapsed      = 0;
        this._transType    = type;
        this._easingFn     = getTransitionEasing(type);
        this._transitioning = true;

        // Hard-cut with zero duration → finish immediately
        if (type === TransitionType.HARD_CUT || duration <= 0) {
            this._finishTransition();
        }
    }

    /**
     * Frame update. Call once per frame with delta-time in seconds.
     *
     * @param {number} dt  Delta time in seconds
     * @returns {WorldState}  The current (possibly interpolated) state
     */
    update(dt) {
        this._checkTriggers();

        if (this._transitioning) {
            this._elapsed += dt;
            const rawT = this._duration > 0
                ? Math.min(this._elapsed / this._duration, 1)
                : 1;

            const easedT = this._easingFn(rawT);
            this._currentState = WorldState.lerp(this._fromState, this._targetState, easedT);

            if (rawT >= 1) {
                this._finishTransition();
            }
        }

        return this._currentState;
    }

    /**
     * Get the current world state (interpolated if mid-transition).
     * @returns {WorldState}
     */
    getCurrentState() {
        return this._currentState;
    }

    /**
     * @returns {boolean}
     */
    isTransitioning() {
        return this._transitioning;
    }

    /**
     * Returns transition progress 0‑1, or -1 if not transitioning.
     * @returns {number}
     */
    getProgress() {
        if (!this._transitioning) return -1;
        return this._duration > 0
            ? Math.min(this._elapsed / this._duration, 1)
            : 1;
    }

    /** @private */
    _finishTransition() {
        this._currentState  = this._targetState;
        this._fromState     = null;
        this._targetState   = null;
        this._transitioning = false;
        this._easingFn      = null;
        this._transType     = null;
    }

    // ────────────────────────────────────────────────────────────────────────
    //  History
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Push the current state onto the history stack.
     */
    pushHistory() {
        // Deep-copy via constructor so mutations don't leak
        this._history.push(new WorldState({ ...this._currentState }));
    }

    /**
     * Pop and return the most recent history entry, or null.
     * @returns {WorldState|null}
     */
    popHistory() {
        return this._history.length > 0 ? this._history.pop() : null;
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Triggers
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Register a trigger that will fire a transition when its condition is met.
     *
     * @param {{
     *   id:          string,
     *   condition:   () => boolean,
     *   targetState: WorldState,
     *   duration:    number,
     *   type:        string,
     *   once?:       boolean
     * }} triggerDef
     */
    registerTrigger(triggerDef) {
        this._triggers.set(triggerDef.id, {
            id:          triggerDef.id,
            condition:   triggerDef.condition,
            targetState: triggerDef.targetState,
            duration:    triggerDef.duration,
            type:        triggerDef.type,
            once:        triggerDef.once ?? true,
            fired:       false,
        });
    }

    /**
     * Remove a previously registered trigger by id.
     * @param {string} id
     */
    removeTrigger(id) {
        this._triggers.delete(id);
    }

    /** @private — evaluated every frame from update() */
    _checkTriggers() {
        for (const trigger of this._triggers.values()) {
            if (trigger.once && trigger.fired) continue;

            try {
                if (trigger.condition()) {
                    trigger.fired = true;
                    this.beginTransition(trigger.targetState, trigger.duration, trigger.type);
                    // Only fire one trigger per frame to avoid conflicting transitions
                    break;
                }
            } catch (_) {
                // Silently skip broken trigger conditions
            }
        }
    }
}
