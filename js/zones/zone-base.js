import * as THREE from 'three';

/**
 * ZoneBase — Abstract base class for all zones.
 *
 * Every zone extends this and gets:
 *  1. A root THREE.Group with lifecycle (getScene, setVisible, update)
 *  2. A proximity-reaction system — register regions that trigger effects when Josh is near
 *  3. A spectacle system — one-shot "wow" moments tied to position, triggered once per visit
 *  4. A sub-module pattern — build() delegates to small focused builders
 *  5. Interactable registration via a consistent pattern
 *
 * Zones are NOT games. They are theme-park rides. Things happen TO you.
 * The world is alive, it reacts to your presence, it reveals itself spatially.
 *
 * Shell Bingby designed this base class in 43 seconds.
 */
export class ZoneBase {
    /**
     * @param {string} name — Scene group name (e.g. 'FractalBoundary')
     */
    constructor(name) {
        /** @type {THREE.Group} Root scenegraph node */
        this.group = new THREE.Group();
        this.group.name = name;

        /** @type {number} Accumulated time for animations */
        this._time = 0;

        /** @type {Array<ProximityReaction>} Proximity-triggered reactions */
        this._reactions = [];

        /** @type {Array<Spectacle>} One-shot spectacle events */
        this._spectacles = [];

        /** @type {Set<string>} IDs of spectacles already fired this visit */
        this._firedSpectacles = new Set();

        /** @type {Array<{position: THREE.Vector3, label: string, type: string, radius?: number}>} */
        this._interactables = [];

        /** @type {THREE.Vector3|null} Last known Josh position (set externally) */
        this._joshPos = null;

        /** @type {Array<(dt: number, time: number, joshPos: THREE.Vector3|null) => void>} */
        this._animators = [];

        /** @type {Array<Object>} Collision boxes/circles for Josh to collide with */
        this._colliders = [];

        /** @type {Array<{minX:number,maxX:number,minZ:number,maxZ:number,topY:number}>} Platform surfaces */
        this._platformSurfaces = [];
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Proximity Reactions
    //  The world notices Josh. No buttons. Just being there changes things.
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Register a proximity reaction — something that happens when Josh is near.
     *
     * @param {Object} opts
     * @param {THREE.Vector3} opts.center — World position of the reaction center
     * @param {number} opts.radius — Trigger radius
     * @param {(distance: number, intensity: number) => void} opts.onNear — Called each frame Josh is within radius. intensity = 1 at center, 0 at edge.
     * @param {(() => void)} [opts.onEnter] — Called once when Josh enters the radius
     * @param {(() => void)} [opts.onExit] — Called once when Josh leaves the radius
     * @param {string} [opts.id] — Optional ID for tracking
     */
    addReaction(opts) {
        this._reactions.push({
            center: opts.center,
            radius: opts.radius,
            onNear: opts.onNear,
            onEnter: opts.onEnter || null,
            onExit: opts.onExit || null,
            id: opts.id || null,
            _wasInside: false,
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Spectacles
    //  One-shot "holy shit" moments. Triggered by position, fired once per visit.
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Register a spectacle — a one-time event that fires when Josh reaches a location.
     *
     * @param {Object} opts
     * @param {string} opts.id — Unique ID (prevents re-firing within a visit)
     * @param {THREE.Vector3} opts.position — Trigger position
     * @param {number} opts.radius — Trigger radius
     * @param {() => void} opts.action — What happens (animate something, reveal something, etc.)
     * @param {boolean} [opts.oncePerSession=true] — If false, fires every visit
     */
    addSpectacle(opts) {
        this._spectacles.push({
            id: opts.id,
            position: opts.position,
            radius: opts.radius,
            action: opts.action,
            oncePerSession: opts.oncePerSession !== false,
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Animators
    //  Small update functions that run every frame. Keeps update() clean.
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Register an animation function that runs every frame.
     * @param {(dt: number, time: number, joshPos: THREE.Vector3|null) => void} fn
     */
    addAnimator(fn) {
        this._animators.push(fn);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Interactables helper
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Register an interactable position for the interaction system.
     * @param {THREE.Vector3} position
     * @param {string} label
     * @param {string} [type='landmark']
     * @param {number} [radius]
     */
    addInteractable(position, label, type = 'landmark', radius = undefined) {
        const entry = { position: position.clone(), label, type };
        if (radius !== undefined) entry.radius = radius;
        this._interactables.push(entry);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Text Texture Helper (PS1 style)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Create a canvas texture with rendered text — PS1 NearestFilter style.
     * @param {string} text
     * @param {Object} [opts]
     * @param {number} [opts.width=64]
     * @param {number} [opts.height=64]
     * @param {string} [opts.fg='#FFAA44']
     * @param {string} [opts.bg='#0d0804']
     * @param {number} [opts.fontSize=28]
     * @returns {THREE.CanvasTexture}
     */
    makeTextTexture(text, opts = {}) {
        const width = opts.width || 64;
        const height = opts.height || 64;
        const fg = opts.fg || '#FFAA44';
        const bg = opts.bg || '#0d0804';
        const fontSize = opts.fontSize || 28;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (bg) {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.clearRect(0, 0, width, height);
        }

        ctx.fillStyle = fg;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        return tex;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Public API — satisfies the zone interface contract
    // ═══════════════════════════════════════════════════════════════════

    /** @returns {THREE.Group} */
    getScene() {
        return this.group;
    }

    /** @param {boolean} visible */
    setVisible(visible) {
        this.group.visible = visible;
        if (!visible) {
            // Reset spectacles on hide (so they fire again next visit)
            this._firedSpectacles.clear();
            // Reset reaction states
            for (const r of this._reactions) {
                r._wasInside = false;
            }
        }
    }

    /**
     * Per-frame update. Drives reactions, spectacles, and animators.
     * Subclasses should call super.update(dt) or just let this run.
     * @param {number} dt
     */
    update(dt) {
        this._time += dt;

        // Run all registered animators
        for (const fn of this._animators) {
            fn(dt, this._time, this._joshPos);
        }

        // Process proximity reactions
        if (this._joshPos) {
            for (const r of this._reactions) {
                const dist = r.center.distanceTo(this._joshPos);
                const inside = dist <= r.radius;

                if (inside) {
                    const intensity = 1 - (dist / r.radius);
                    r.onNear(dist, intensity);

                    if (!r._wasInside && r.onEnter) {
                        r.onEnter();
                    }
                } else if (r._wasInside && r.onExit) {
                    r.onExit();
                }

                r._wasInside = inside;
            }

            // Process spectacles
            for (const s of this._spectacles) {
                if (s.oncePerSession && this._firedSpectacles.has(s.id)) continue;

                const dist = s.position.distanceTo(this._joshPos);
                if (dist <= s.radius) {
                    s.action();
                    this._firedSpectacles.add(s.id);
                }
            }
        }
    }

    /**
     * Set Josh's current position for proximity checks.
     * Called externally by the game loop.
     * @param {THREE.Vector3} pos
     */
    setJoshPosition(pos) {
        this._joshPos = pos;
    }

    /**
     * Get the terrain height at a world position. Subclasses override this.
     * @param {number} _x
     * @param {number} _z
     * @returns {number}
     */
    getTerrainHeight(_x, _z) {
        return 0;
    }

    /**
     * Get interactable positions for the interaction system.
     * @returns {Array<{position: THREE.Vector3, label: string, type: string, radius?: number}>}
     */
    getInteractablePositions() {
        return this._interactables;
    }

    /**
     * Get collision boxes for Josh.
     * @returns {Array<Object>}
     */
    getColliders() {
        return this._colliders;
    }

    /**
     * Get platform surfaces for Josh.
     * @returns {Array<{minX:number,maxX:number,minZ:number,maxZ:number,topY:number}>}
     */
    getPlatformSurfaces() {
        return this._platformSurfaces;
    }

    /**
     * Add a collision box (AABB) for Josh.
     * @param {number} minX
     * @param {number} maxX
     * @param {number} minZ
     * @param {number} maxZ
     */
    addColliderBox(minX, maxX, minZ, maxZ) {
        this._colliders.push({ minX, maxX, minZ, maxZ });
    }

    /**
     * Add a platform surface Josh can stand on.
     * @param {number} minX
     * @param {number} maxX
     * @param {number} minZ
     * @param {number} maxZ
     * @param {number} topY
     */
    addPlatformSurface(minX, maxX, minZ, maxZ, topY) {
        this._platformSurfaces.push({ minX, maxX, minZ, maxZ, topY });
    }
}
