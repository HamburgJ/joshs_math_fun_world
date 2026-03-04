/**
 * Timed event system for Josh's Math Fun World.
 * Fires events based on elapsed time, optional zone, and optional conditions.
 */
export class EventManager {
    constructor() {
        /** @type {Map<string, EventEntry>} */
        this._events = new Map();

        /** Accumulated time in seconds since last reset */
        this._elapsed = 0;

        /** Current zone name (set externally) */
        this.currentZone = null;

        /** IDs of events that have already fired */
        this._firedIds = [];
    }

    /**
     * Register a timed event.
     * @param {Object} eventDef
     * @param {string}   eventDef.id        – unique identifier
     * @param {number}   eventDef.delay     – seconds until the event fires
     * @param {string}  [eventDef.zone]     – if set, event only fires when currentZone matches
     * @param {() => boolean} [eventDef.condition] – must return true at fire-time
     * @param {() => void}     eventDef.action     – callback to execute
     * @param {boolean} [eventDef.once=true] – defaults to true; set false for repeating events
     */
    schedule(eventDef) {
        const entry = {
            id: eventDef.id,
            delay: eventDef.delay,
            zone: eventDef.zone ?? null,
            condition: eventDef.condition ?? null,
            action: eventDef.action,
            once: eventDef.once !== undefined ? eventDef.once : true,
            timer: 0,
            fired: false,
        };
        this._events.set(entry.id, entry);
    }

    /**
     * Cancel a scheduled event by id.
     * @param {string} id
     */
    cancel(id) {
        this._events.delete(id);
    }

    /**
     * Update every frame.
     * @param {number} dt – delta time in seconds
     */
    update(dt) {
        this._elapsed += dt;

        for (const [id, ev] of this._events) {
            // Skip already-fired once-events
            if (ev.once && ev.fired) continue;

            ev.timer += dt;

            if (ev.timer < ev.delay) continue;

            // Zone gate
            if (ev.zone !== null && ev.zone !== this.currentZone) continue;

            // Condition gate
            if (ev.condition && !ev.condition()) continue;

            // — Fire! —
            ev.action();
            ev.fired = true;
            this._firedIds.push(id);

            if (ev.once) {
                // Leave it in the map (marked fired) so getFiredEvents stays correct
            } else {
                // Repeating: reset timer, keep the remainder for accuracy
                ev.timer -= ev.delay;
            }
        }
    }

    /**
     * Reset all timers (e.g. on zone change).
     */
    reset() {
        this._elapsed = 0;
        for (const ev of this._events.values()) {
            ev.timer = 0;
            ev.fired = false;
        }
        this._firedIds = [];
    }

    /**
     * Get list of fired event IDs.
     * @returns {string[]}
     */
    getFiredEvents() {
        return [...this._firedIds];
    }
}

/**
 * Create an EventManager pre-loaded with the Phase 2 template events.
 * The caller should replace the placeholder action for "sky_wireframe_flash"
 * via `manager.cancel('sky_wireframe_flash')` + `manager.schedule(...)` with a real callback,
 * or simply set the action on the returned entry before the timer elapses.
 *
 * @returns {EventManager}
 */
export function createPhase2EventManager() {
    const manager = new EventManager();

    // Phase 2 template: sky wireframe flash after 3 minutes
    manager.schedule({
        id: 'sky_wireframe_flash',
        delay: 180,
        once: true,
        action: () => {
            // Placeholder — the caller should override this action
            // e.g. manager.cancel('sky_wireframe_flash'); manager.schedule({...realAction})
            console.log('[EventManager] sky_wireframe_flash fired (placeholder)');
        },
    });

    return manager;
}
