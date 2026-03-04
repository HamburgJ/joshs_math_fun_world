import * as THREE from 'three';
import { getTerrainHeight } from './noise.js';
import { createPS1Material } from './ps1-material.js';

// =====================================================================
//  INFINITE PARKOUR — procedurally generated vertical platformer
//  Located far east of the hub.  Platforms generate upward as Josh
//  climbs and are cleaned up far below to keep memory bounded.
// =====================================================================

const CENTER_X = 550;
const CENTER_Z = -50;

const LEVEL_HEIGHT  = 2.8;   // vertical gap between platform levels
const GEN_AHEAD     = 18;    // generate this many levels above Josh
const KEEP_BELOW    = 12;    // keep this many levels below Josh
const ACTIVE_RADIUS = 80;    // horizontal distance — don't update if further away

const TIER_COLORS = [
    0xCC8844,   //  0-29   warm brown
    0x44AACC,   // 30-59   cool blue
    0xAA44CC,   // 60-89   purple
    0x44CC88,   // 90-119  green
    0xCC4444,   // 120-149 red
    0xFFCC44,   // 150+    gold
];

const TIER_SIZE = 30; // levels per color tier

// ─── Seeded PRNG (mulberry32) ───────────────────────────────────────

function mulberry32(seed) {
    let a = seed | 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}


// ─── Material cache ──────────────────────────────────────────────────

const _matCache = new Map();

function getPlatMat(tier) {
    const colorIdx = Math.min(tier, TIER_COLORS.length - 1);
    const hex = TIER_COLORS[colorIdx];
    if (_matCache.has(hex)) return _matCache.get(hex);
    const mat = createPS1Material({
        color: new THREE.Color(hex),
        dither: true,
        fogColor: new THREE.Color(0x667788),
        fogNear: 100,
        fogFar: 600,
    });
    _matCache.set(hex, mat);
    return mat;
}

function getTrimMat(tier) {
    const key = 'trim_' + tier;
    if (_matCache.has(key)) return _matCache.get(key);
    const colorIdx = Math.min(tier, TIER_COLORS.length - 1);
    const base = new THREE.Color(TIER_COLORS[colorIdx]);
    const mat = createPS1Material({
        color: base.multiplyScalar(0.55),
        dither: true,
        fogColor: new THREE.Color(0x667788),
        fogNear: 100,
        fogFar: 600,
    });
    _matCache.set(key, mat);
    return mat;
}


// =====================================================================
//  INFINITE PARKOUR CLASS
// =====================================================================

export class InfiniteParkour {

    /**
     * @param {THREE.Group} fieldGroup — the field world group to add meshes into
     * @param {Array} platformsArray — reference to field.userData.platforms
     */
    constructor(fieldGroup, platformsArray) {
        this._platforms = platformsArray;
        this._group = new THREE.Group();
        this._group.name = 'infinite-parkour';

        this._baseY = getTerrainHeight(CENTER_X, CENTER_Z);

        /** Map<level, { meshes: THREE.Mesh[], platData: object }> */
        this._active = new Map();
        this._highestGenerated = -1;

        this._wasNear = false;   // track whether Josh is near

        // ── Build the base structure ────────────────────────────────
        this._buildBase();

        // ── Generate initial batch of platforms ─────────────────────
        for (let lvl = 0; lvl < GEN_AHEAD; lvl++) {
            this._generateLevel(lvl);
        }
        this._highestGenerated = GEN_AHEAD - 1;

        fieldGroup.add(this._group);
    }


    // ── Per-frame update ─────────────────────────────────────────────

    /**
     * Called every frame from field's updateParkour callback.
     * @param {{ x:number, y:number, z:number }} joshPos
     */
    update(joshPos) {
        const dx = joshPos.x - CENTER_X;
        const dz = joshPos.z - CENTER_Z;
        const dist2d = Math.sqrt(dx * dx + dz * dz);

        if (dist2d > ACTIVE_RADIUS) {
            // Josh is far away — remove dynamic platforms from the
            // physics array so they don't cost checks every frame.
            if (this._wasNear) {
                this._removeAllFromPhysics();
                this._wasNear = false;
            }
            return;
        }

        if (!this._wasNear) {
            // Josh just arrived — re-inject existing platforms
            this._injectAllToPhysics();
            this._wasNear = true;
        }

        const joshHeight = joshPos.y - this._baseY;
        const currentLevel = Math.floor(joshHeight / LEVEL_HEIGHT);

        // Generate ahead
        while (this._highestGenerated < currentLevel + GEN_AHEAD) {
            this._highestGenerated++;
            this._generateLevel(this._highestGenerated);
        }

        // Clean up far below
        const cutoff = currentLevel - KEEP_BELOW;
        for (const [lvl, data] of this._active) {
            if (lvl < cutoff) {
                // Remove meshes
                for (const m of data.meshes) this._group.remove(m);
                // Remove from physics
                const idx = this._platforms.indexOf(data.platData);
                if (idx >= 0) this._platforms.splice(idx, 1);
                this._active.delete(lvl);
            }
        }
    }


    // ── Base structure ───────────────────────────────────────────────

    _buildBase() {
        const baseMat = createPS1Material({
            color: new THREE.Color(0x8a7e6a),
            dither: true,
            fogColor: new THREE.Color(0x667788),
            fogNear: 150,
            fogFar: 800,
        });
        const pillarMat = createPS1Material({
            color: new THREE.Color(0x6a6a5e),
            dither: true,
            fogColor: new THREE.Color(0x667788),
            fogNear: 150,
            fogFar: 800,
        });

        // Large starting platform
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(18, 2, 18),
            baseMat,
        );
        base.position.set(CENTER_X, this._baseY + 1, CENTER_Z);
        this._group.add(base);

        // Four corner pillars (20 units tall) — visually mark the entrance
        for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
                const pillar = new THREE.Mesh(
                    new THREE.BoxGeometry(2, 20, 2),
                    pillarMat,
                );
                pillar.position.set(
                    CENTER_X + sx * 8,
                    this._baseY + 11,
                    CENTER_Z + sz * 8,
                );
                this._group.add(pillar);
            }
        }

        // Cross-beam connecting pillars at top
        for (const axis of ['x', 'z']) {
            for (const side of [-1, 1]) {
                const beam = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        axis === 'x' ? 18 : 1.2,
                        1.2,
                        axis === 'z' ? 18 : 1.2,
                    ),
                    pillarMat,
                );
                beam.position.set(
                    CENTER_X + (axis === 'z' ? side * 8 : 0),
                    this._baseY + 21,
                    CENTER_Z + (axis === 'x' ? side * 8 : 0),
                );
                this._group.add(beam);
            }
        }

        // Static base platform data (always in physics array)
        this._platforms.push({
            minX: CENTER_X - 9,
            maxX: CENTER_X + 9,
            minZ: CENTER_Z - 9,
            maxZ: CENTER_Z + 9,
            topY: this._baseY + 2,
        });
    }


    // ── Level generation ─────────────────────────────────────────────

    _generateLevel(level) {
        if (this._active.has(level)) return;

        const rng = mulberry32(level * 73856093 + 12345);
        const y = this._baseY + 3 + level * LEVEL_HEIGHT;
        const tier = Math.floor(level / TIER_SIZE);
        const mat = getPlatMat(tier);
        const trim = getTrimMat(tier);

        // Difficulty scaling
        const diff = Math.min(level / 150, 1); // 0→1 over 150 levels
        const platSize = Math.max(1.6, 4.0 - diff * 2.2);
        const count = level < 20 ? 2 : (rng() < 0.4 + diff * 0.3 ? 1 : 2);

        // Milestone rest platforms every 30 levels
        const isMilestone = level > 0 && level % TIER_SIZE === 0;

        const meshes = [];
        let platData = null;

        if (isMilestone) {
            // Large rest platform
            const restSize = 6;
            const rest = new THREE.Mesh(
                new THREE.BoxGeometry(restSize, 0.8, restSize),
                mat,
            );
            rest.position.set(CENTER_X, y, CENTER_Z);
            this._group.add(rest);
            meshes.push(rest);

            // Edge trims
            for (const axis of ['x', 'z']) {
                for (const side of [-1, 1]) {
                    const t = new THREE.Mesh(
                        new THREE.BoxGeometry(
                            axis === 'x' ? restSize + 0.2 : 0.2,
                            0.3,
                            axis === 'z' ? restSize + 0.2 : 0.2,
                        ),
                        trim,
                    );
                    t.position.set(
                        CENTER_X + (axis === 'z' ? side * restSize / 2 : 0),
                        y + 0.4,
                        CENTER_Z + (axis === 'x' ? side * restSize / 2 : 0),
                    );
                    this._group.add(t);
                    meshes.push(t);
                }
            }

            // Glow on milestones
            const glow = new THREE.PointLight(
                TIER_COLORS[Math.min(tier, TIER_COLORS.length - 1)],
                2.0, 25, 1.5,
            );
            glow.position.set(CENTER_X, y + 2, CENTER_Z);
            this._group.add(glow);
            meshes.push(glow);

            platData = {
                minX: CENTER_X - restSize / 2,
                maxX: CENTER_X + restSize / 2,
                minZ: CENTER_Z - restSize / 2,
                maxZ: CENTER_Z + restSize / 2,
                topY: y + 0.4,
            };
        } else {
            // Normal platform(s) — pick the first one for physics
            const angle = rng() * Math.PI * 2;
            const radius = 3 + rng() * (7 + diff * 3);
            const px = CENTER_X + Math.cos(angle) * radius;
            const pz = CENTER_Z + Math.sin(angle) * radius;

            const plat = new THREE.Mesh(
                new THREE.BoxGeometry(platSize, 0.5, platSize),
                mat,
            );
            plat.position.set(px, y, pz);
            this._group.add(plat);
            meshes.push(plat);

            platData = {
                minX: px - platSize / 2,
                maxX: px + platSize / 2,
                minZ: pz - platSize / 2,
                maxZ: pz + platSize / 2,
                topY: y + 0.25,
            };

            // Second platform on easier levels
            if (count >= 2) {
                const a2 = angle + Math.PI * (0.5 + rng() * 1.0);
                const r2 = 3 + rng() * (6 + diff * 2);
                const px2 = CENTER_X + Math.cos(a2) * r2;
                const pz2 = CENTER_Z + Math.sin(a2) * r2;
                const s2 = Math.max(1.6, platSize - 0.3 + rng() * 0.6);

                const plat2 = new THREE.Mesh(
                    new THREE.BoxGeometry(s2, 0.5, s2),
                    mat,
                );
                plat2.position.set(px2, y, pz2);
                this._group.add(plat2);
                meshes.push(plat2);

                // Also add to physics — append as a second push
                this._platforms.push({
                    minX: px2 - s2 / 2,
                    maxX: px2 + s2 / 2,
                    minZ: pz2 - s2 / 2,
                    maxZ: pz2 + s2 / 2,
                    topY: y + 0.25,
                });
            }
        }

        if (platData) {
            if (this._wasNear) this._platforms.push(platData);
            this._active.set(level, { meshes, platData });
        }
    }


    // ── Physics array management ─────────────────────────────────────

    _removeAllFromPhysics() {
        for (const [, data] of this._active) {
            const idx = this._platforms.indexOf(data.platData);
            if (idx >= 0) this._platforms.splice(idx, 1);
        }
    }

    _injectAllToPhysics() {
        for (const [, data] of this._active) {
            if (data.platData && !this._platforms.includes(data.platData)) {
                this._platforms.push(data.platData);
            }
        }
    }
}
