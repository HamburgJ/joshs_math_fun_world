/**
 * Centralized Update Manager to replace scattered userData.update() calls.
 * Objects/systems can register themselves to be ticked every frame.
 */
export class UpdateManager {
    constructor() {
        this._updatables = new Set();
    }

    /**
     * Register an object with an update(dt) method
     * @param {Object} obj 
     */
    register(obj) {
        if (typeof obj.update === 'function') {
            this._updatables.add(obj);
        } else {
            console.warn('[UpdateManager] Cannot register object without update(dt) method', obj);
        }
    }

    /**
     * Unregister an object
     * @param {Object} obj 
     */
    unregister(obj) {
        this._updatables.delete(obj);
    }

    /**
     * Tick all registered objects
     * @param {number} dt 
     */
    update(dt) {
        for (const obj of this._updatables) {
            try {
                obj.update(dt);
            } catch(e) {
                console.error('[UpdateManager] Error updating object:', e);
            }
        }
    }
}

export const globalUpdateManager = new UpdateManager();
