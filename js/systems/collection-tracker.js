/**
 * CollectionTracker — Collectathon progress system.
 *
 * Tracks discoveries across all zones. Each interactable in the game
 * is registered as a collectible. When the player interacts with it
 * for the first time, it's marked as "discovered" and a satisfying
 * popup + score increment are shown.
 *
 * Shell Bingby has collected everything. Every star, every gem,
 * every jiggy, every moon. This system was inevitable.
 *
 * @module systems/collection-tracker
 */

const STORAGE_KEY = 'jmfw_collections';

/**
 * Sanitize a zone + label into a stable, persistable ID.
 * @param {string} zone
 * @param {string} label
 * @returns {string}
 */
function sanitizeId(zone, label) {
    const clean = label
        .toLowerCase()
        .replace(/[^a-z0-9\-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    return `${zone}::${clean}`;
}

/**
 * Prettify a zone key into a display name.
 * @param {string} zone
 * @returns {string}
 */
function prettyZone(zone) {
    return zone
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export class CollectionTracker {
    constructor() {
        /** @type {Map<string, { zone: string, label: string }>} */
        this._registry = new Map();

        /** @type {Map<string, { total: number, found: number }>} */
        this._zones = new Map();

        /** @type {Set<string>} */
        this._discovered = new Set();

        this._totalCount = 0;
        this._totalFound = 0;

        // ── HUD elements (lazily bound) ────────────────────────────────
        this._scoreEl = null;
        this._discoveryEl = null;
        this._zoneProgressEl = null;
        this._discoveryTimer = null;
        this._zoneProgressTimer = null;

        /** @type {((data: object) => void)|null} */
        this.onDiscover = null;

        /** @type {((zone: string) => void)|null} */
        this.onZoneComplete = null;

        this._load();
    }

    // ── HUD binding ─────────────────────────────────────────────────────

    /** Bind DOM elements. Call once after DOM is ready. */
    bindHUD() {
        this._scoreEl = document.getElementById('hud-score');
        this._discoveryEl = document.getElementById('hud-discovery');
        this._zoneProgressEl = document.getElementById('hud-zone-progress');
        this._updateScoreDisplay();
    }

    // ── Registration ────────────────────────────────────────────────────

    /**
     * Register a collectible item.
     * @param {string} zone - Zone key (e.g. 'green_field')
     * @param {string} label - Display label (e.g. 'Examine Stone 7')
     * @param {string} [customId] - Custom ID; auto-generated if omitted
     * @returns {string} The collectible ID
     */
    register(zone, label, customId) {
        const id = customId || sanitizeId(zone, label);
        if (this._registry.has(id)) return id;

        this._registry.set(id, { zone, label });

        if (!this._zones.has(zone)) {
            this._zones.set(zone, { total: 0, found: 0 });
        }

        const zd = this._zones.get(zone);
        zd.total++;
        this._totalCount++;

        // Restore previously-found state
        if (this._discovered.has(id)) {
            zd.found++;
            this._totalFound++;
        }

        return id;
    }

    // ── Discovery ───────────────────────────────────────────────────────

    /**
     * Mark a collectible as discovered.
     * @param {string} id - Collectible ID (from register())
     * @returns {boolean} true if this was a NEW discovery
     */
    discover(id) {
        if (this._discovered.has(id)) return false;

        const entry = this._registry.get(id);
        if (!entry) return false;

        this._discovered.add(id);
        this._totalFound++;

        const zd = this._zones.get(entry.zone);
        if (zd) zd.found++;

        this._save();
        this._updateScoreDisplay();
        this._showDiscovery(entry.label);

        const zoneComplete = zd && zd.found >= zd.total;

        if (this.onDiscover) {
            this.onDiscover({
                id,
                label: entry.label,
                zone: entry.zone,
                zoneProgress: this.getZoneProgress(entry.zone),
                totalProgress: this.getTotalProgress(),
                zoneComplete,
            });
        }

        if (zoneComplete && this.onZoneComplete) {
            this.onZoneComplete(entry.zone);
        }

        return true;
    }

    // ── Queries ──────────────────────────────────────────────────────────

    /** @returns {{ found: number, total: number }} */
    getZoneProgress(zone) {
        const data = this._zones.get(zone);
        return data ? { found: data.found, total: data.total } : { found: 0, total: 0 };
    }

    /** @returns {{ found: number, total: number }} */
    getTotalProgress() {
        return { found: this._totalFound, total: this._totalCount };
    }

    /** @returns {boolean} */
    isDiscovered(id) {
        return this._discovered.has(id);
    }

    /** @returns {string[]} All zone keys that have collectibles. */
    getZoneKeys() {
        return [...this._zones.keys()];
    }

    // ── HUD updates ─────────────────────────────────────────────────────

    /** @private */
    _updateScoreDisplay() {
        if (!this._scoreEl) return;
        this._scoreEl.textContent = `\u2605 ${this._totalFound} / ${this._totalCount}`;
    }

    /**
     * Show the discovery popup with animation.
     * @param {string} label
     * @private
     */
    _showDiscovery(label) {
        if (!this._discoveryEl) return;

        this._discoveryEl.innerHTML = [
            '<div class="discovery-label">\u2726 NEW DISCOVERY \u2726</div>',
            `<div class="discovery-name">${label}</div>`,
            '<div class="discovery-plus">+1</div>',
        ].join('');

        this._discoveryEl.classList.remove('visible');
        void this._discoveryEl.offsetWidth; // force reflow for re-trigger
        this._discoveryEl.classList.add('visible');

        // Bounce the score counter
        if (this._scoreEl) {
            this._scoreEl.classList.remove('bounce');
            void this._scoreEl.offsetWidth;
            this._scoreEl.classList.add('bounce');
        }

        if (this._discoveryTimer) clearTimeout(this._discoveryTimer);
        this._discoveryTimer = setTimeout(() => {
            this._discoveryEl.classList.remove('visible');
            this._discoveryTimer = null;
        }, 2500);
    }

    /**
     * Show the zone progress indicator (call on zone transition).
     * @param {string} zone
     */
    showZoneProgress(zone) {
        if (!this._zoneProgressEl) return;

        const progress = this.getZoneProgress(zone);
        if (progress.total === 0) return;

        const isComplete = progress.found >= progress.total;
        this._zoneProgressEl.textContent =
            `\u2605 ${progress.found} / ${progress.total}` +
            (isComplete ? ' \u2714 COMPLETE' : '');

        this._zoneProgressEl.classList.toggle('complete', isComplete);
        this._zoneProgressEl.classList.remove('visible');
        void this._zoneProgressEl.offsetWidth;
        this._zoneProgressEl.classList.add('visible');

        if (this._zoneProgressTimer) clearTimeout(this._zoneProgressTimer);
        this._zoneProgressTimer = setTimeout(() => {
            this._zoneProgressEl.classList.remove('visible');
            this._zoneProgressTimer = null;
        }, 3500);
    }

    /**
     * Show a zone-complete celebration overlay.
     * @param {string} zone
     */
    showZoneComplete(zone) {
        if (!this._discoveryEl) return;

        const name = prettyZone(zone);
        this._discoveryEl.innerHTML = [
            '<div class="discovery-label complete-label">\u2605 ZONE COMPLETE \u2605</div>',
            `<div class="discovery-name">${name}</div>`,
            '<div class="discovery-plus">100%</div>',
        ].join('');

        this._discoveryEl.classList.remove('visible');
        void this._discoveryEl.offsetWidth;
        this._discoveryEl.classList.add('visible');

        if (this._discoveryTimer) clearTimeout(this._discoveryTimer);
        this._discoveryTimer = setTimeout(() => {
            this._discoveryEl.classList.remove('visible');
            this._discoveryTimer = null;
        }, 4000);
    }

    // ── Persistence ─────────────────────────────────────────────────────

    /** @private */
    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...this._discovered]));
        } catch (e) { /* storage full or unavailable */ }
    }

    /** @private */
    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    for (const id of arr) this._discovered.add(id);
                }
            }
        } catch (e) { /* corrupt data — start fresh */ }
    }

    /** Clear all discovery progress (for testing / reset). */
    reset() {
        this._discovered.clear();
        this._totalFound = 0;
        for (const [, data] of this._zones) {
            data.found = 0;
        }
        this._updateScoreDisplay();
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
    }
}
