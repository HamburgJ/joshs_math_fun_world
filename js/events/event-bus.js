/**
 * Centralized Event Bus for decoupled system communication.
 */
export class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string} event 
     * @param {Function} callback 
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
        if (this._listeners.has(event)) {
            this._listeners.get(event).delete(callback);
        }
    }

    /**
     * Emit an event to all subscribers.
     * @param {string} event 
     * @param {any} [data] 
     */
    emit(event, data) {
        if (this._listeners.has(event)) {
            for (const callback of this._listeners.get(event)) {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[EventBus] Error in listener for ${event}:`, e);
                }
            }
        }
    }
}

// Global singleton instance
export const globalEventBus = new EventBus();

// Standard Event Names
export const EVENTS = {
    ZONE_ENTERED: 'ZONE_ENTERED',
    ZONE_EXITED: 'ZONE_EXITED',
    ITEM_COLLECTED: 'ITEM_COLLECTED',
    SECRET_DISCOVERED: 'SECRET_DISCOVERED',
    PLAYER_MOVED: 'PLAYER_MOVED',
    PLAYER_JUMPED: 'PLAYER_JUMPED',
    PLAYER_LANDED: 'PLAYER_LANDED',
    UI_SHOW_TOOLTIP: 'UI_SHOW_TOOLTIP',
    UI_HIDE_TOOLTIP: 'UI_HIDE_TOOLTIP',
    UI_UPDATE_HUD: 'UI_UPDATE_HUD',
    GAME_PAUSED: 'GAME_PAUSED',
    GAME_RESUMED: 'GAME_RESUMED'
};
