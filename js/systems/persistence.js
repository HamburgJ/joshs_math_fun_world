/**
 * @fileoverview Save/load persistence system for Josh's Math Fun World.
 * Uses localStorage to track player progress across sessions.
 * All state lives under a single localStorage key: 'jmfw_save'.
 *
 * Shell Bingby knew persistence mattered before browsers even had localStorage.
 * The data must survive. The math must be remembered.
 *
 * @module systems/persistence
 */

const STORAGE_KEY = 'jmfw_save';
const DEBOUNCE_MS = 1000;

/**
 * @typedef {Object} PlayerPosition
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} zone
 */

/**
 * @typedef {Object} SaveData
 * @property {Object<string, number>} visitedZones - zone name -> visit count
 * @property {PlayerPosition|null} playerPosition
 * @property {string|null} currentZone
 * @property {string[]} secrets - unlocked secret IDs
 * @property {number} playTime - total seconds played
 * @property {number} sessionCount
 * @property {string[]} sightings1597 - locations where 1597 was spotted
 * @property {number} benchSits
 */

/**
 * Returns a fresh, empty save data object.
 * @returns {SaveData}
 */
function createDefaultData() {
    return {
        visitedZones: {},
        playerPosition: null,
        currentZone: null,
        secrets: [],
        playTime: 0,
        sessionCount: 0,
        sightings1597: [],
        benchSits: 0,
    };
}

/**
 * Manages all persistent state for Josh's Math Fun World.
 * Reads from and writes to localStorage, auto-saving on every mutation.
 */
class PersistenceManager {
    constructor() {
        /** @type {SaveData} */
        this._data = createDefaultData();

        /** @type {number|null} */
        this._saveTimer = null;

        /** @type {boolean} */
        this._storageAvailable = PersistenceManager._checkStorage();

        this.load();

        // Save on tab close to avoid losing accumulated play time
        window.addEventListener('beforeunload', () => this.save());
    }

    /* ------------------------------------------------------------------
     * Internal helpers
     * ----------------------------------------------------------------*/

    /**
     * Check whether localStorage is usable.
     * @returns {boolean}
     * @private
     */
    static _checkStorage() {
        try {
            const test = '__jmfw_test__';
            localStorage.setItem(test, '1');
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Schedule a debounced save. Called after every mutation.
     * @private
     */
    _scheduleSave() {
        if (this._saveTimer !== null) {
            clearTimeout(this._saveTimer);
        }
        this._saveTimer = setTimeout(() => {
            this.save();
            this._saveTimer = null;
        }, DEBOUNCE_MS);
    }

    /**
     * Validate and sanitise loaded data, filling in any missing fields
     * with defaults so the rest of the code can trust the shape.
     * @param {*} raw
     * @returns {SaveData}
     * @private
     */
    static _validate(raw) {
        const defaults = createDefaultData();
        if (!raw || typeof raw !== 'object') return defaults;

        return {
            visitedZones:
                raw.visitedZones && typeof raw.visitedZones === 'object'
                    ? { ...raw.visitedZones }
                    : defaults.visitedZones,
            playerPosition:
                raw.playerPosition && typeof raw.playerPosition === 'object'
                    ? {
                          x: Number(raw.playerPosition.x) || 0,
                          y: Number(raw.playerPosition.y) || 0,
                          z: Number(raw.playerPosition.z) || 0,
                          zone: String(raw.playerPosition.zone ?? ''),
                      }
                    : defaults.playerPosition,
            currentZone:
                typeof raw.currentZone === 'string'
                    ? raw.currentZone
                    : defaults.currentZone,
            secrets: Array.isArray(raw.secrets)
                ? raw.secrets.map(String)
                : defaults.secrets,
            playTime: Number(raw.playTime) || defaults.playTime,
            sessionCount: Number(raw.sessionCount) || defaults.sessionCount,
            sightings1597: Array.isArray(raw.sightings1597)
                ? raw.sightings1597.map(String)
                : defaults.sightings1597,
            benchSits: Number(raw.benchSits) || defaults.benchSits,
        };
    }

    /* ------------------------------------------------------------------
     * Visited zones tracking
     * ----------------------------------------------------------------*/

    /**
     * Record that a zone has been visited (increments its visit count).
     * @param {string} zoneName
     */
    markZoneVisited(zoneName) {
        if (!zoneName) return;
        this._data.visitedZones[zoneName] =
            (this._data.visitedZones[zoneName] || 0) + 1;
        this._scheduleSave();
    }

    /**
     * Check whether a zone has ever been visited.
     * @param {string} zoneName
     * @returns {boolean}
     */
    hasVisitedZone(zoneName) {
        return (this._data.visitedZones[zoneName] || 0) > 0;
    }

    /**
     * Get the set of all visited zone names.
     * @returns {Set<string>}
     */
    getVisitedZones() {
        return new Set(Object.keys(this._data.visitedZones));
    }

    /**
     * Get how many times a particular zone has been entered.
     * @param {string} zoneName
     * @returns {number}
     */
    getVisitCount(zoneName) {
        return this._data.visitedZones[zoneName] || 0;
    }

    /* ------------------------------------------------------------------
     * Player state
     * ----------------------------------------------------------------*/

    /**
     * Save Josh's current position and zone.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} currentZone
     */
    savePlayerPosition(x, y, z, currentZone) {
        this._data.playerPosition = {
            x: Number(x) || 0,
            y: Number(y) || 0,
            z: Number(z) || 0,
            zone: String(currentZone ?? ''),
        };
        this._scheduleSave();
    }

    /**
     * Retrieve the last saved player position.
     * @returns {PlayerPosition|null}
     */
    getPlayerPosition() {
        return this._data.playerPosition
            ? { ...this._data.playerPosition }
            : null;
    }

    /**
     * Save which zone the player is currently in.
     * @param {string} zoneName
     */
    saveCurrentZone(zoneName) {
        this._data.currentZone = zoneName;
        this._scheduleSave();
    }

    /**
     * Get the last saved zone name.
     * @returns {string|null}
     */
    getCurrentZone() {
        return this._data.currentZone;
    }

    /* ------------------------------------------------------------------
     * Secrets tracker
     * ----------------------------------------------------------------*/

    /**
     * Record that a secret has been discovered.
     * @param {string} secretId
     */
    unlockSecret(secretId) {
        if (!secretId) return;
        if (!this._data.secrets.includes(secretId)) {
            this._data.secrets.push(secretId);
            this._scheduleSave();
        }
    }

    /**
     * Check whether a particular secret has been found.
     * @param {string} secretId
     * @returns {boolean}
     */
    hasSecret(secretId) {
        return this._data.secrets.includes(secretId);
    }

    /**
     * Get all unlocked secret IDs.
     * @returns {string[]}
     */
    getSecrets() {
        return [...this._data.secrets];
    }

    /**
     * Get the total number of secrets found.
     * @returns {number}
     */
    getSecretCount() {
        return this._data.secrets.length;
    }

    /* ------------------------------------------------------------------
     * Statistics
     * ----------------------------------------------------------------*/

    /**
     * Add to the total play time counter.
     * @param {number} seconds
     */
    incrementPlayTime(seconds) {
        this._data.playTime += Math.max(0, Number(seconds) || 0);
        // Use a separate non-resetting interval for play time so it doesn't defer forever
        if (!this._playTimeSaveTimer) {
            this._playTimeSaveTimer = setTimeout(() => {
                this.save();
                this._playTimeSaveTimer = null;
            }, 30000); // Save play time at most every 30 seconds
        }
    }

    /**
     * Get total seconds played across all sessions.
     * @returns {number}
     */
    getPlayTime() {
        return this._data.playTime;
    }

    /**
     * Get how many sessions have been started.
     * @returns {number}
     */
    getSessionCount() {
        return this._data.sessionCount;
    }

    /**
     * Increment the session counter by one.
     */
    incrementSessionCount() {
        this._data.sessionCount += 1;
        this._scheduleSave();
    }

    /**
     * Returns true if no save data existed when we loaded (brand-new player).
     * @returns {boolean}
     */
    isFirstVisit() {
        return this._data.sessionCount === 0 &&
            Object.keys(this._data.visitedZones).length === 0 &&
            this._data.secrets.length === 0 &&
            this._data.playTime === 0;
    }

    /* ------------------------------------------------------------------
     * The 1597 thread
     * ----------------------------------------------------------------*/

    /**
     * Record spotting the number 1597 at a particular location.
     * @param {string} locationId
     */
    recordSighting(locationId) {
        if (!locationId) return;
        if (!this._data.sightings1597.includes(locationId)) {
            this._data.sightings1597.push(locationId);
            this._scheduleSave();
        }
    }

    /**
     * Get all locations where 1597 has been spotted.
     * @returns {string[]}
     */
    getSightings() {
        return [...this._data.sightings1597];
    }

    /**
     * Get the number of unique 1597 sightings.
     * @returns {number}
     */
    getSightingCount() {
        return this._data.sightings1597.length;
    }

    /* ------------------------------------------------------------------
     * Bench sits counter
     * ----------------------------------------------------------------*/

    /**
     * Increment the bench-sitting counter.
     */
    incrementBenchSits() {
        this._data.benchSits += 1;
        this._scheduleSave();
    }

    /**
     * Get how many times the player has sat on a bench.
     * @returns {number}
     */
    getBenchSits() {
        return this._data.benchSits;
    }

    /* ------------------------------------------------------------------
     * Utility – save / load / reset / import / export
     * ----------------------------------------------------------------*/

    /**
     * Persist all data to localStorage immediately.
     */
    save() {
        if (!this._storageAvailable) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
        } catch (err) {
            console.warn('[PersistenceManager] Failed to save:', err);
        }
    }

    /**
     * Load data from localStorage, merging with defaults for safety.
     */
    load() {
        if (!this._storageAvailable) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw === null) {
                this._data = createDefaultData();
                return;
            }
            const parsed = JSON.parse(raw);
            this._data = PersistenceManager._validate(parsed);
        } catch (err) {
            console.warn('[PersistenceManager] Failed to load, resetting:', err);
            this._data = createDefaultData();
        }
    }

    /**
     * Clear all save data from memory and localStorage.
     */
    reset() {
        if (this._saveTimer !== null) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        this._data = createDefaultData();
        if (this._storageAvailable) {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (err) {
                console.warn('[PersistenceManager] Failed to clear storage:', err);
            }
        }
    }

    /**
     * Export all save data as a JSON string (for backup / sharing).
     * @returns {string}
     */
    exportData() {
        return JSON.stringify(this._data, null, 2);
    }

    /**
     * Import save data from a JSON string.
     * Validates the data before accepting it.
     * @param {string} json
     * @throws {Error} If the JSON string is invalid.
     */
    importData(json) {
        let parsed;
        try {
            parsed = JSON.parse(json);
        } catch (err) {
            throw new Error(`[PersistenceManager] Invalid JSON: ${err.message}`);
        }
        this._data = PersistenceManager._validate(parsed);
        this.save();
    }
}

/** Singleton instance – import this for global access. */
const persistence = new PersistenceManager();

export default persistence;
export { PersistenceManager };
