/**
 * MicroShiftManager — subtle aesthetic flickers that remind the player
 * this world is unstable.
 *
 * "Not every shift is a zone change. Some shifts are micro-shifts —
 *  brief aesthetic flickers within a zone."
 *
 * One micro-shift runs at a time. Each manages its own lifecycle.
 * The game loop calls update() every frame and uses the returned timeScale.
 *
 * Shell Bingby says: "The uncanny valley isn't a valley. It's a frequency.
 * These micro-shifts ARE that frequency."
 */

import * as THREE from 'three';

// ── Constants ────────────────────────────────────────────────────────────────

const BASE_CHANCE       = 0.0002;   // per-frame probability (~0.7%/s at 60fps)
const COOLDOWN          = 20;       // minimum seconds between micro-shifts
const TIME_FACTOR_CAP   = 2.0;     // max time factor after 5 min in same zone
const TIME_FACTOR_RAMP  = 300;     // seconds to reach cap (5 min)

// Instability multipliers
const INSTABILITY_NORMAL       = 1.0;
const INSTABILITY_BOUNDARY     = 2.0;
const INSTABILITY_SINGULARITY  = 3.0;

// ── Micro-shift definitions ──────────────────────────────────────────────────

/**
 * @typedef {Object} MicroShiftDef
 * @property {string}   id
 * @property {function} start   — called once when the shift begins
 * @property {function} update  — called each frame while active; return true when done
 * @property {function} finish  — called once to clean up / restore state
 */

// ── Helper: ease-in-out quad ─────────────────────────────────────────────────
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ── MicroShiftManager ────────────────────────────────────────────────────────

export class MicroShiftManager {
    /**
     * @param {{
     *   postProcess:  import('../rendering/post-processing.js').PostProcessing,
     *   scene:        THREE.Scene,
     *   shiftManager: import('./shift-manager.js').ShiftManager
     * }} opts
     */
    constructor({ postProcess, scene, shiftManager }) {
        this._postProcess  = postProcess;
        this._scene        = scene;
        this._shiftManager = shiftManager;

        // ── State ──────────────────────────────────────────────────
        this._cooldownRemaining = 5;     // small initial cooldown before first ever shift
        this._zoneTime          = 0;     // seconds spent in current zone
        this._currentZone       = null;

        // ── Active micro-shift tracking ────────────────────────────
        this._active      = null;        // { def, elapsed, state }
        this._timeScale   = 1.0;         // returned to game loop each frame

        // ── Build the catalog ─────────────────────────────────────
        this._catalog = this._buildCatalog();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Public API
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Called every frame by the game loop.
     *
     * @param {number} dt           Delta time in seconds
     * @param {{
     *   zone:          string,
     *   playTime:      number,
     *   joshPosition:  THREE.Vector3,
     *   nearBoundary:  boolean,
     *   nearSingularity?: boolean
     * }} context
     * @returns {{ timeScale: number }}
     */
    update(dt, context) {
        // ── Zone change detection ──────────────────────────────────
        if (context.zone !== this._currentZone) {
            this._currentZone = context.zone;
            this._zoneTime    = 0;
        }
        this._zoneTime += dt;

        // ── If a micro-shift is active, tick it ────────────────────
        if (this._active) {
            this._active.elapsed += dt;
            const done = this._active.def.update(
                this._active.elapsed,
                this._active.state,
                dt
            );
            if (done) {
                this._active.def.finish(this._active.state);
                this._active = null;
                this._timeScale = 1.0;
                this._cooldownRemaining = COOLDOWN;
            }
            return { timeScale: this._timeScale };
        }

        // ── Cooldown ───────────────────────────────────────────────
        this._cooldownRemaining -= dt;
        if (this._cooldownRemaining > 0) {
            return { timeScale: 1.0 };
        }

        // ── Roll for trigger ───────────────────────────────────────
        const instability = context.nearSingularity
            ? INSTABILITY_SINGULARITY
            : context.nearBoundary
                ? INSTABILITY_BOUNDARY
                : INSTABILITY_NORMAL;

        const timeFactor = 1.0 + (TIME_FACTOR_CAP - 1.0) *
            Math.min(this._zoneTime / TIME_FACTOR_RAMP, 1.0);

        const chance = BASE_CHANCE * instability * timeFactor;

        if (Math.random() < chance) {
            this._trigger();
        }

        return { timeScale: 1.0 };
    }

    /**
     * Force-trigger a specific micro-shift by id (useful for testing / events).
     * @param {string} [id]  If omitted, picks randomly.
     */
    trigger(id) {
        if (this._active) return; // don't overlap
        this._trigger(id);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Internals
    // ──────────────────────────────────────────────────────────────────────────

    /** @private */
    _trigger(id) {
        const def = id
            ? this._catalog.find(d => d.id === id)
            : this._catalog[Math.floor(Math.random() * this._catalog.length)];

        if (!def) return;

        const state = {};
        def.start(state);

        this._active = { def, elapsed: 0, state };
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Catalog
    // ──────────────────────────────────────────────────────────────────────────

    /** @private */
    _buildCatalog() {
        const pp    = this._postProcess;
        const scene = this._scene;
        const sm    = this._shiftManager;
        const self  = this;

        return [

            // ──────────────────────────────────────────────────────────
            // 1. WIREFRAME FLASH
            //    2-4 frames (~50-80ms): scanlines ON, near-black bg,
            //    green tint via scene background. Then snap back.
            // ──────────────────────────────────────────────────────────
            {
                id: 'wireframe_flash',
                start(s) {
                    s.duration = 0.05 + Math.random() * 0.03; // 50-80ms
                    // Save current state
                    s.prevScanlines = pp.quadMaterial.uniforms.uScanlines.value;
                    s.prevBg = scene.background.clone();
                    // Apply flash
                    pp.setScanlines(true);
                    scene.background.set(0x050505);
                    // Tint via saturation drop + green-ish fog trick
                    if (scene.fog) {
                        s.prevFogColor = scene.fog.color.clone();
                        scene.fog.color.set(0x001500);
                    }
                },
                update(elapsed, s) {
                    return elapsed >= s.duration;
                },
                finish(s) {
                    pp.quadMaterial.uniforms.uScanlines.value = s.prevScanlines;
                    scene.background.copy(s.prevBg);
                    if (scene.fog && s.prevFogColor) {
                        scene.fog.color.copy(s.prevFogColor);
                    }
                },
            },

            // ──────────────────────────────────────────────────────────
            // 2. COLOR DRAIN
            //    Desaturate over 0.5s → hold grayscale 0.3s → restore 0.5s.
            //    Uses uSaturation uniform on post-processing shader.
            // ──────────────────────────────────────────────────────────
            {
                id: 'color_drain',
                start(s) {
                    s.fadeOut  = 0.5;
                    s.hold     = 0.3;
                    s.fadeIn   = 0.5;
                    s.total    = s.fadeOut + s.hold + s.fadeIn;
                },
                update(elapsed, s) {
                    if (elapsed < s.fadeOut) {
                        // Fading to grayscale
                        const t = elapsed / s.fadeOut;
                        pp.setSaturation(1.0 - easeInOutQuad(t));
                    } else if (elapsed < s.fadeOut + s.hold) {
                        // Holding at zero
                        pp.setSaturation(0.0);
                    } else if (elapsed < s.total) {
                        // Restoring
                        const t = (elapsed - s.fadeOut - s.hold) / s.fadeIn;
                        pp.setSaturation(easeInOutQuad(t));
                    } else {
                        return true;
                    }
                    return false;
                },
                finish() {
                    pp.setSaturation(1.0);
                },
            },

            // ──────────────────────────────────────────────────────────
            // 3. SKY FLICKER
            //    Briefly change sky mesh top color to midnight blue with
            //    star-like specks. Hold 200ms, snap back.
            // ──────────────────────────────────────────────────────────
            {
                id: 'sky_flicker',
                start(s) {
                    s.duration = 0.2; // 200ms
                    // Find sky mesh (SphereGeometry with BackSide material)
                    const sky = scene.children.find(
                        c => c.isMesh && c.material && c.material.side === THREE.BackSide
                    );
                    s.sky = sky;
                    if (sky && sky.material.uniforms) {
                        s.prevTop = sky.material.uniforms.topColor.value.clone();
                        s.prevBottom = sky.material.uniforms.bottomColor.value.clone();
                        // Midnight sky
                        sky.material.uniforms.topColor.value.set(0x0a0a2e);
                        sky.material.uniforms.bottomColor.value.set(0x0f0f1a);
                    }
                },
                update(elapsed, s) {
                    return elapsed >= s.duration;
                },
                finish(s) {
                    if (s.sky && s.sky.material.uniforms) {
                        s.sky.material.uniforms.topColor.value.copy(s.prevTop);
                        s.sky.material.uniforms.bottomColor.value.copy(s.prevBottom);
                    }
                },
            },

            // ──────────────────────────────────────────────────────────
            // 4. RESOLUTION DROP
            //    Halve render resolution for 300ms. Extra chunky.
            // ──────────────────────────────────────────────────────────
            {
                id: 'resolution_drop',
                start(s) {
                    s.duration = 0.3;
                    s.prevScale = pp.renderScale;
                    pp.setRenderScale(s.prevScale * 0.5);
                },
                update(elapsed, s) {
                    return elapsed >= s.duration;
                },
                finish(s) {
                    pp.setRenderScale(s.prevScale);
                },
            },

            // ──────────────────────────────────────────────────────────
            // 5. TIME STUTTER
            //    For ~1s, oscillate timeScale between 0.3 and 1.5
            //    rapidly, making animations stutter.
            //    NOT a visual effect — modifies the returned timeScale.
            // ──────────────────────────────────────────────────────────
            {
                id: 'time_stutter',
                start(s) {
                    s.duration = 1.0;
                    s.freq = 12; // oscillations per second
                },
                update(elapsed, s) {
                    if (elapsed >= s.duration) return true;
                    // Fast sine oscillation between 0.3 and 1.5
                    const wave = Math.sin(elapsed * s.freq * Math.PI * 2);
                    // Map [-1, 1] → [0.3, 1.5]
                    self._timeScale = 0.9 + wave * 0.6;
                    return false;
                },
                finish() {
                    self._timeScale = 1.0;
                },
            },

            // ──────────────────────────────────────────────────────────
            // 6. CHROMATIC ABERRATION
            //    Shift R and B channels by ±2px for 400ms.
            //    Uses uChromaShift uniform on post-processing shader.
            // ──────────────────────────────────────────────────────────
            {
                id: 'chromatic_aberration',
                start(s) {
                    s.duration = 0.4;
                    pp.setChromaShift(2.0);
                },
                update(elapsed, s) {
                    if (elapsed >= s.duration) return true;
                    // Pulse the intensity slightly for organic feel
                    const pulse = 1.5 + 0.5 * Math.sin(elapsed * 20);
                    pp.setChromaShift(pulse);
                    return false;
                },
                finish() {
                    pp.setChromaShift(0.0);
                },
            },

            // ──────────────────────────────────────────────────────────
            // 7. VERTEX JITTER SPIKE
            //    Drop shaderSnap from 320 to 80 (much coarser vertex
            //    snapping) for 300ms, then restore.
            // ──────────────────────────────────────────────────────────
            {
                id: 'vertex_jitter',
                start(s) {
                    s.duration = 0.3;
                    const ws = sm.getCurrentState();
                    s.prevSnap = ws.shaderSnap;
                    // Override the shaderSnap on the live state
                    ws.shaderSnap = 80;
                },
                update(elapsed, s) {
                    // Keep forcing it in case a transition overrides it
                    const ws = sm.getCurrentState();
                    ws.shaderSnap = 80;
                    return elapsed >= s.duration;
                },
                finish(s) {
                    const ws = sm.getCurrentState();
                    ws.shaderSnap = s.prevSnap;
                },
            },

            // ──────────────────────────────────────────────────────────
            // 8. FOG PULSE
            //    Pull fog near to 5 instantly, hold 200ms, push back
            //    over 500ms.
            // ──────────────────────────────────────────────────────────
            {
                id: 'fog_pulse',
                start(s) {
                    s.pullDuration  = 0;      // instant pull
                    s.holdDuration  = 0.2;    // 200ms
                    s.pushDuration  = 0.5;    // 500ms
                    s.total = s.pullDuration + s.holdDuration + s.pushDuration;

                    if (scene.fog) {
                        s.prevNear = scene.fog.near;
                        s.prevFar  = scene.fog.far;
                        // Instant pull: smash fog right up to the camera
                        scene.fog.near = 5;
                        scene.fog.far  = 15;
                    }
                },
                update(elapsed, s) {
                    if (!scene.fog) return true;

                    const holdEnd = s.pullDuration + s.holdDuration;

                    if (elapsed < holdEnd) {
                        // Still holding at near-zero visibility
                        scene.fog.near = 5;
                        scene.fog.far  = 15;
                    } else if (elapsed < s.total) {
                        // Smoothly push fog back
                        const t = (elapsed - holdEnd) / s.pushDuration;
                        const ease = easeInOutQuad(t);
                        scene.fog.near = 5 + (s.prevNear - 5) * ease;
                        scene.fog.far  = 15 + (s.prevFar - 15) * ease;
                    } else {
                        return true;
                    }
                    return false;
                },
                finish(s) {
                    if (scene.fog) {
                        scene.fog.near = s.prevNear;
                        scene.fog.far  = s.prevFar;
                    }
                },
            },

            // ──────────────────────────────────────────────────────────
            // 9. GHOST GEOMETRY
            //    Faint wireframe polyhedra drift at the fog boundary,
            //    visible for 3-5 frames before dissolving. Mathematical
            //    hallucinations at the edge of perception.
            // ──────────────────────────────────────────────────────────
            {
                id: 'ghost_geometry',
                start(s) {
                    s.duration = 0.12 + Math.random() * 0.05; // 120-170ms (3-5 frames at 30fps)
                    s.ghosts = [];

                    // Pick 1-3 ghost shapes
                    const count = 1 + Math.floor(Math.random() * 3);
                    const geometries = [
                        new THREE.IcosahedronGeometry(0.8, 0),
                        new THREE.DodecahedronGeometry(0.7, 0),
                        new THREE.OctahedronGeometry(0.9, 0),
                        new THREE.TetrahedronGeometry(1.0, 0),
                    ];

                    const fogFar = scene.fog ? scene.fog.far : 80;

                    for (let i = 0; i < count; i++) {
                        const geo = geometries[Math.floor(Math.random() * geometries.length)];
                        const mat = new THREE.MeshBasicMaterial({
                            color: 0x4aff71,       // WIREFRAME_GREEN
                            wireframe: true,
                            transparent: true,
                            opacity: 0.08 + Math.random() * 0.06,
                            depthWrite: false,
                        });
                        const mesh = new THREE.Mesh(geo, mat);

                        // Position at fog boundary in a random direction
                        const angle = Math.random() * Math.PI * 2;
                        const dist = fogFar * (0.7 + Math.random() * 0.2);
                        // Offset from camera position, not origin
                        const camPos = scene.children.find(c => c.isCamera)?.position || new THREE.Vector3();
                        mesh.position.set(
                            camPos.x + Math.cos(angle) * dist,
                            camPos.y + (Math.random() - 0.3) * 8,
                            camPos.z + Math.sin(angle) * dist
                        );

                        // Random slow rotation
                        mesh.rotation.set(
                            Math.random() * Math.PI,
                            Math.random() * Math.PI,
                            Math.random() * Math.PI
                        );

                        scene.add(mesh);
                        s.ghosts.push({ mesh, mat, geo });
                    }
                },
                update(elapsed, s) {
                    // Spin gently during their brief existence
                    for (const g of s.ghosts) {
                        g.mesh.rotation.x += 0.02;
                        g.mesh.rotation.y += 0.015;
                        // Fade out over duration
                        g.mat.opacity *= 0.92;
                    }
                    return elapsed >= s.duration;
                },
                finish(s) {
                    for (const g of s.ghosts) {
                        scene.remove(g.mesh);
                        g.geo.dispose();
                        g.mat.dispose();
                    }
                    s.ghosts = [];
                },
            },

            // ──────────────────────────────────────────────────────────
            // 10. BREATHING FOG
            //     Fog distance slowly oscillates like breathing
            //     (4s inhale, 6s exhale) for ~20 seconds. The world
            //     feels alive. Subtle enough to question whether you
            //     saw it.
            // ──────────────────────────────────────────────────────────
            {
                id: 'breathing_fog',
                start(s) {
                    s.duration = 20;          // 2 full breath cycles
                    s.breathPeriod = 10;      // 10s per breath (4 in, 6 out)
                    s.inhaleRatio = 0.4;      // 40% of cycle = inhale
                    s.maxPull = 0.15;         // pull fog 15% closer at peak

                    if (scene.fog) {
                        s.baseNear = scene.fog.near;
                        s.baseFar  = scene.fog.far;
                    }
                },
                update(elapsed, s) {
                    if (!scene.fog) return true;
                    if (elapsed >= s.duration) return true;

                    const cycleT = (elapsed % s.breathPeriod) / s.breathPeriod;
                    let breathAmount;

                    if (cycleT < s.inhaleRatio) {
                        // Inhale: fog pulls closer (ease-in)
                        const t = cycleT / s.inhaleRatio;
                        breathAmount = easeInOutQuad(t);
                    } else {
                        // Exhale: fog pushes back (slower ease-out)
                        const t = (cycleT - s.inhaleRatio) / (1 - s.inhaleRatio);
                        breathAmount = 1 - easeInOutQuad(t);
                    }

                    const pull = breathAmount * s.maxPull;
                    scene.fog.near = s.baseNear * (1 - pull);
                    scene.fog.far  = s.baseFar  * (1 - pull);
                    return false;
                },
                finish(s) {
                    if (scene.fog) {
                        scene.fog.near = s.baseNear;
                        scene.fog.far  = s.baseFar;
                    }
                },
            },

            // ──────────────────────────────────────────────────────────
            // 11. GRAVITY HICCUP
            //     For exactly 2 frames (~33ms), all scene children
            //     (except camera, lights, sky) drop 0.5 units, then
            //     snap back. Like the world briefly forgot physics.
            //     Only noticeable if you're looking at something.
            // ──────────────────────────────────────────────────────────
            {
                id: 'gravity_hiccup',
                start(s) {
                    s.duration = 0.05; // ~2-3 frames
                    s.dropDist = 0.5;
                    s.affected = [];

                    // Collect all mesh-like objects (skip sky, lights, camera)
                    scene.traverse((child) => {
                        if (!child.isMesh) return;
                        // Skip sky (BackSide), skip the player model
                        if (child.material?.side === THREE.BackSide) return;
                        if (child.name === 'josh' || child.name === 'joshGroup') return;
                        // Skip anything parented to a camera
                        let p = child.parent;
                        while (p) {
                            if (p.isCamera) return;
                            p = p.parent;
                        }
                        s.affected.push({
                            obj: child,
                            origY: child.position.y,
                        });
                    });

                    // Drop everything
                    for (const a of s.affected) {
                        a.obj.position.y -= s.dropDist;
                    }
                },
                update(elapsed, s) {
                    return elapsed >= s.duration;
                },
                finish(s) {
                    // Snap everything back
                    for (const a of s.affected) {
                        a.obj.position.y = a.origY;
                    }
                    s.affected = [];
                },
            },

        ];
    }
}
