import { globalEventBus, EVENTS } from './events/event-bus.js';
/**
 * GameLoop — the per-frame update/render cycle.
 *
 * Separated from main.js so that bootstrap (one-time setup) and
 * per-frame logic (recurring update) live in different files.
 * Makes it easy to add/remove systems without touching the init code.
 */

import { MicroShiftManager } from './shifts/micro-shifts.js';
import { WorldState, GREEN_FIELD_STATE, DARK_FIELD_STATE } from './shifts/world-state.js';

/**
 * @typedef {Object} GameSystems
 * @property {import('./josh/josh.js').Josh} josh
 * @property {import('./josh/input.js').Input} input
 * @property {import('./josh/touch-input.js').TouchInput|null} touchInput
 * @property {import('./camera.js').CameraController} cameraCtrl
 * @property {import('./interactions/interaction-manager.js').InteractionManager} interactions
 * @property {import('./events/event-manager.js').EventManager} eventManager
 * @property {import('./shifts/shift-manager.js').ShiftManager} shiftManager
 * @property {import('./zones/zone-registry.js').ZoneRegistry} registry
 * @property {import('./zones/zone-transitions.js').ZoneTransitionManager} transitions
 * @property {import('./rendering/post-processing.js').PostProcessing} postProcess
 * @property {import('./pages/page-manager.js').PageManager} pageManager
 * @property {import('./audio/audio-manager.js').AudioManager|null} audio
 * @property {import('./systems/persistence.js').PersistenceManager|null} persistence
 * @property {import('./systems/secrets.js').SecretsManager|null} secrets
 * @property {import('./systems/watcher.js').WatcherSystem|null} watcher
 * @property {import('./ui/settings-menu.js').SettingsMenu|null} settings
 * @property {import('./world/bomber-plane.js').BomberPlane|null} bomber
 * @property {import('./ui/scene-editor.js').SceneEditor|null} sceneEditor
 * @property {THREE.Scene} scene
 * @property {THREE.Camera} camera
 * @property {THREE.DirectionalLight} sunlight
 * @property {THREE.AmbientLight} ambient
 */

export class GameLoop {
    /**
     * @param {GameSystems} sys  All the game subsystems.
     */
    constructor(sys) {
        this._sys = sys;
        this._lastTime = performance.now();
        this._paused = false;
        this._fpsTime = 0;
        this._fpsFrames = 0;
        this._fpsDisplay = null;

        // Audio state tracking
        this._prevPhysState = 'grounded';
        this._footstepTimer = 0;

        // ── HUD elements ────────────────────────────────────────────────
        this._hud = sys.hud;

        // Listen for page manager open/close
        sys.pageManager.onOpen  = () => { this._paused = true; };
        sys.pageManager.onClose = () => { this._paused = false; };

        // Settings menu pausing
        if (sys.settings) {
            const prev = { onOpen: sys.settings.onOpen, onClose: sys.settings.onClose };
            sys.settings.onOpen  = () => { this._paused = true;  prev.onOpen?.(); };
            sys.settings.onClose = () => { this._paused = false; prev.onClose?.(); };
        }

        // Periodic position save accumulator (saves every 5 seconds)
        this._positionSaveTimer = 0;

        // Contextual hints state
        this._hintCooldown = 0;
        this._hintsShown = new Set();
        this._totalPlayTime = 0;

        // Bind the loop so we can pass it to rAF
        this._tick = this._tick.bind(this);

        // ── Micro-shift system ──────────────────────────────────────────
        this._microShifts = new MicroShiftManager({
            postProcess: sys.postProcess,
            scene: sys.scene,
            shiftManager: sys.shiftManager,
        });
    }

    /** Kick off the animation loop. */
    start() {
        this._lastTime = performance.now();
        requestAnimationFrame(this._tick);
    }

    /** @private */
    _tick(now) {
        requestAnimationFrame(this._tick);

        const dt = Math.max(0, Math.min((now - this._lastTime) / 1000, 0.1));
        this._lastTime = now;

        const s = this._sys;

        // ── Input ───────────────────────────────────────────────────────
        s.input.update();
        if (s.touchInput) s.touchInput.update();

        // Merge touch input into primary input when active
        const activeInput = (s.touchInput && s.touchInput.isActive()) ? s.touchInput : s.input;

        // ── Scene editor mode (F2) ────────────────────────────────────
        if (s.sceneEditor && s.sceneEditor.isOpen()) {
            s.sceneEditor.update(dt);
            s.input.resetDeltas();
            if (s.touchInput) s.touchInput.resetDeltas();
            s.postProcess.render(s.scene, s.camera);
            return;
        }

        // ── Paused (overlay open) ───────────────────────────────────────
        if (this._paused) {
            s.input.resetDeltas();
            if (s.touchInput) s.touchInput.resetDeltas();
            return;
        }

        // ── Settings hotkey (Escape opens settings) ─────────────────────
        // (handled by settings menu internally)

        // ── Shift / World State ─────────────────────────────────────────
        const worldState = s.shiftManager.update(dt);
        // Only apply world state visuals when the arrival sequence is complete
        // (otherwise the arrival controller manages fog & lighting)
        if (!s.arrival || s.arrival.complete) {
            let computedState = worldState;
            if (s.registry.activeZone === 'green_field' && !s.shiftManager.isTransitioning()) {
                const pos = s.josh.getPosition();
                const distX = Math.abs(pos.x);
                const distZ = Math.abs(pos.z);
                
                // For positive z (path to arrival), keep path lit:
                let pathLightFade = 0;
                if (pos.z > 80 && distX < 40) {
                    // Along the path, calculate distance outward
                    let d = Math.max(0, distX - 10);
                    pathLightFade = Math.max(0, Math.min(1, d / 30));
                }

                const baseDistScale = Math.max(0, Math.min(1, (Math.max(distX, distZ) - 100) / (250 - 100)));
                const t = pos.z > 80 && Math.abs(pos.x) < 40 ? pathLightFade : baseDistScale;
                if (t > 0) computedState = WorldState.lerp(GREEN_FIELD_STATE, DARK_FIELD_STATE, t);
            }
            this._applyWorldState(computedState);
        }

        // ── Micro-shifts (subtle aesthetic flickers) ────────────────────
        // Suppress during arrival — don't confuse the player with glitches
        let timeScale = 1;
        if (!s.arrival || s.arrival.complete) {
            const result = this._microShifts.update(dt, {
                zone: s.registry.activeZone,
                playTime: this._totalPlayTime,
                joshPosition: s.josh.getPosition(),
                nearBoundary: s.transitions.isNearBoundary?.() ?? false,
            });
            timeScale = result.timeScale;
        }
        const effectiveDt = dt * timeScale;

        // ── Timed events ────────────────────────────────────────────────
        s.eventManager.update(dt);

        // ── Zone animation ticks ────────────────────────────────────────
        s.registry.updateAll(effectiveDt);

        // ── Sky ─────────────────────────────────────────────────────────
        if (s.scene.userData.skyMat) {
            const sm = s.scene.userData.skyMat;
            sm.uniforms.uTime.value += effectiveDt;

            const inHub = s.registry.activeZone === 'green_field';

            // Target trippy force depends on whether Josh is sitting and we are in the green field
            const targetTrippy = (s.josh.isSitting && inHub) ? 1.0 : 0.0;
            // Target sun opacity: visible ONLY in green field when NOT sitting
            const targetSun = (!s.josh.isSitting && inHub) ? 1.0 : 0.0;

            // In non-hub zones, snap immediately to avoid hub sky leaking;
            // in the hub, lerp smoothly for gentle transitions.
            const trippyRate = inHub ? effectiveDt * 1.5 : effectiveDt * 12.0;
            const sunRate    = inHub ? effectiveDt * 2.0 : effectiveDt * 12.0;

            const currentTrippy = sm.uniforms.uTrippyForce.value;
            sm.uniforms.uTrippyForce.value += (targetTrippy - currentTrippy) * trippyRate;

            if (sm.uniforms.uSunOpacity !== undefined) {
                const currentSun = sm.uniforms.uSunOpacity.value;
                sm.uniforms.uSunOpacity.value += (targetSun - currentSun) * sunRate;
            }

            // Snap to zero below threshold so tiny residual values don't
            // produce faint artefacts in dark zones.
            if (!inHub) {
                if (sm.uniforms.uTrippyForce.value < 0.005) sm.uniforms.uTrippyForce.value = 0;
                if (sm.uniforms.uSunOpacity && sm.uniforms.uSunOpacity.value < 0.005) sm.uniforms.uSunOpacity.value = 0;
            }
        }

        // ── Portal arch animations & ambience (green field only) ────────
        if (s.registry.activeZone === 'green_field') {
            if (s.field && s.field.userData.updatePortals) {
                s.field.userData.updatePortals(effectiveDt);
            }
            if (s.field && s.field.userData.updateAmbience) {
                s.field.userData.updateAmbience(effectiveDt);
            }
            // Distant discoveries (pulsing rift lights, etc.)
            if (s.field && s.field.userData.updateDiscoveries) {
                s.field.userData.updateDiscoveries(effectiveDt);
            }
            // Infinite parkour (procedural platform generation)
            if (s.field && s.field.userData.updateParkour) {
                s.field.userData.updateParkour(s.josh.getPosition());
            }
        }

        // ── Arrival sequence (dark-to-light entrance, hub only) ─────────
        if (s.arrival && !s.arrival.complete && s.registry.activeZone === 'green_field') {
            s.arrival.update(s.josh.getPosition(), dt);
        }

        // ── Number Line train cutscene ──────────────────────────────────
        if (s.trainCutscene && s.trainCutscene.isRunning) {
            s.trainCutscene.update(dt);
            // While cutscene is running suppress all player input except render
            this._sys.input.resetDeltas();
            if (this._sys.touchInput) this._sys.touchInput.resetDeltas();
        }

        // ── Inner Sphere: restore flat position for transition checks ──
        let _innerSphereInst = null;
        if (s.registry.activeZone === 'inner_sphere') {
            _innerSphereInst = s.registry.getInstance('inner_sphere');
            if (_innerSphereInst) _innerSphereInst.restoreFlatPosition(s.josh);
        }

        // ── Zone transitions ────────────────────────────────────────────
        if (!s.transitions.isTransitioning && !(s.trainCutscene && s.trainCutscene.isRunning)) {
            s.transitions.check({ interact: activeInput.interact });
        }

        // ── Interactions ────────────────────────────────────────────────
        s.interactions.update(s.josh.getPosition());

        const headDir = s.interactions.getTargetDirection(s.josh.getPosition());
        s.josh.setHeadTrackTarget(headDir);

        if (activeInput.interact) {
            const didInteract = s.interactions.interact();
            if (didInteract && s.audio && s.audio.isEnabled()) {
                s.audio.playInteract();
            }
        }

        // ── HUD: interact prompt ────────────────────────────────────────
        if (this._hud) {
            const nearest = s.interactions.nearest;
            if (nearest && nearest.label !== this._lastInteractLabel) {
                 this._lastInteractLabel = nearest.label;
                 globalEventBus.emit(EVENTS.UI_UPDATE_HUD, { interactLabel: nearest.label });
            } else if (!nearest && this._lastInteractLabel !== null) {
                 this._lastInteractLabel = null;
                 globalEventBus.emit(EVENTS.UI_UPDATE_HUD, { interactLabel: null });
            }
        }

        // ── Josh ────────────────────────────────────────────────────────
        s.josh.update(dt, activeInput, s.cameraCtrl.getOrbitAngle());

        // ── Inner Sphere: map Josh onto the sphere surface ──────────────
        if (_innerSphereInst) {
            _innerSphereInst.mapToSphere(s.josh);
        }

        // ── Update zone-specific Josh position tracking ────────────────
        {
            const activeZone = s.registry.activeZone;
            // Pass Josh position to the active zone (enables proximity reactions)
            if (activeZone && activeZone !== 'green_field') {
                const inst = s.registry.getInstance(activeZone);
                if (inst && typeof inst.setJoshPosition === 'function') {
                    inst.setJoshPosition(s.josh.getPosition());
                }
            }
            // Non-Euclidean: update hyperbolic warp intensity based on
            // Josh's position (stronger warp near disk boundary)
            if (activeZone === 'non_euclidean') {
                const inst = s.registry.getInstance('non_euclidean');
                if (inst && inst.getActiveSubZone() === 'hyperbolic') {
                    const pos = s.josh.getPosition();
                    const cf = inst.getConformalFactor(pos.x, pos.z);
                    // Map conformal factor [1, ∞) to warp intensity [0.3, 0.85]
                    // Higher conformal factor = closer to boundary = stronger warp
                    const warpIntensity = Math.min(0.85, 0.3 + (cf - 1) * 0.05);
                    s.postProcess.setHyperbolicWarp(warpIntensity);
                }
            }
        }
        // ── Audio: sound effects ────────────────────────────────────────
        {
            const physState = s.josh.getPhysicsState();

            if (s.audio && s.audio.isEnabled()) {
                // Jump: grounded → rising
                if (this._prevPhysState === 'grounded' && physState === 'rising') {
                    s.audio.playJump();
                }

                // Land: falling → landing or falling → grounded
                if (this._prevPhysState === 'falling' && (physState === 'landing' || physState === 'grounded')) {
                    s.audio.playLand();
                }

                // Footsteps — surface type depends on current zone
                const animState = s.josh.animation.getState();
                if (animState === 'walk' || animState === 'run') {
                    const interval = animState === 'run' ? 0.25 : 0.4;
                    this._footstepTimer += dt;
                    if (this._footstepTimer >= interval) {
                        const surface = s.registry.activeZone === 'green_field' ? 'grass' : 'stone';
                        s.audio.playFootstep(surface);
                        // Clamp instead of subtract — prevents burst after lag spikes
                        this._footstepTimer = 0;
                    }
                } else {
                    this._footstepTimer = 0;
                }
            }

            this._prevPhysState = physState;
        }

        // ── Camera ──────────────────────────────────────────────────────
        s.cameraCtrl.update(dt, activeInput, s.josh.getPosition(), s.josh.getVerticalVelocity());

        // ── Inner Sphere: override camera for spherical view ────────────
        if (_innerSphereInst) {
            _innerSphereInst.fixCamera(s.camera, s.josh, s.cameraCtrl, dt);
        }

        // ── Watcher System (hub only — don't spawn in other zones) ─────
        if (s.watcher) {
            if (s.registry.activeZone === 'green_field') {
                s.watcher.update(dt);
            } else if (s.watcher.mesh) {
                // Entered a non-hub zone while watcher was alive — remove it
                s.watcher.removeWatcher();
            }
        }

        // ── Bomber Plane (hub-world doomsday system) ────────────────────
        if (s.bomber) {
            s.bomber.setActive(s.registry.activeZone === 'green_field');
            s.bomber.update(dt, s.josh.getPosition());
        }

        // ── Operator Zero (deep anomaly layer) ─────────────────────────
        if (s.operatorZero) {
            s.operatorZero.update(dt, {
                zone: s.registry.activeZone,
                joshPosition: s.josh.getPosition(),
                showExamine: (text) => this.showExamineText(text),
            });
        }

        // ── Persistence: play time & periodic position save ────────────
        if (s.persistence) {
            s.persistence.incrementPlayTime(dt);
            this._positionSaveTimer += dt;
            if (this._positionSaveTimer >= 5) {
                this._positionSaveTimer = 0;
                const pos = s.josh.getPosition();
                s.persistence.savePlayerPosition(pos.x, pos.y, pos.z, s.registry.activeZone);
            }
        }

        // ── Contextual Hints ────────────────────────────────────────────
        this._updateHints(dt);

        // ── Reset per-frame deltas ──────────────────────────────────────
        s.input.resetDeltas();
        if (s.touchInput) s.touchInput.resetDeltas();

        // ── Apply settings-driven render params ─────────────────────────
        if (s.settings) {
            s.postProcess.setScanlines(s.settings.getSetting('crtScanlines'));
            s.postProcess.setDithering(s.settings.getSetting('dithering'));
        }

        // ── Render ──────────────────────────────────────────────────────
        s.postProcess.render(s.scene, s.camera);

        // ── FPS counter ─────────────────────────────────────────────────
        if (s.settings?.getSetting('showFps')) {
            this._updateFps(now);
        } else if (this._fpsDisplay) {
            this._fpsDisplay.style.display = 'none';
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Display a zone name in the top-center HUD, fading out after 3 s.
     * Prettifies snake_case names → Title Case.
     * @param {string} zoneName  e.g. 'wireframe_void'
     */
    showZoneName(zoneName) {
        if (!this._hudZone) return;

        const pretty = zoneName
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

        this._hudZone.textContent = pretty;
        this._hudZone.classList.add('visible');

        if (this._zoneTimer) clearTimeout(this._zoneTimer);
        this._zoneTimer = setTimeout(() => {
            this._hudZone.classList.remove('visible');
            this._zoneTimer = null;
        }, 3000);
    }

    /**
     * Display an examine text popup (e.g. when examining a stone).
     * @param {string} text
     * @param {number} [duration=4000]
     */
    showExamineText(text, duration = 4000) {
        if (!this._hudExamine) return;

        this._hudExamine.textContent = text;
        this._hudExamine.classList.add('visible');

        if (this._examineTimer) clearTimeout(this._examineTimer);
        this._examineTimer = setTimeout(() => {
            this._hudExamine.classList.remove('visible');
            this._examineTimer = null;
        }, duration);
    }

    /**
     * Display a contextual hint in the bottom-left.
     * @param {string} text
     * @param {number} [duration=8000]
     */
    showHint(text, duration = 8000) {
        if (!this._hudHint) return;

        this._hudHint.textContent = text;
        this._hudHint.classList.add('visible');

        if (this._hintTimer) clearTimeout(this._hintTimer);
        this._hintTimer = setTimeout(() => {
            this._hudHint.classList.remove('visible');
            this._hintTimer = null;
        }, duration);
    }

    /** @private  — Contextual hint system */
    _updateHints(dt) {
        this._totalPlayTime += dt;
        this._hintCooldown -= dt;
        if (this._hintCooldown > 0) return;

        const s = this._sys;
        const pos = s.josh.getPosition();
        const zone = s.registry.activeZone;
        const visited = s.persistence ? s.persistence.getVisitedZones?.() || [] : [];
        const visitedCount = visited.length || 0;

        // Only show each hint once
        const show = (id, text, dur = 8000) => {
            if (this._hintsShown.has(id)) return false;
            this._hintsShown.add(id);
            this.showHint(text, dur);
            this._hintCooldown = dur / 1000 + 3; // cooldown so hints don't stack
            return true;
        };

        // Early game hints (on the green field)
        if (zone === 'green_field') {
            // During arrival, give a directional hint
            if (s.arrival && !s.arrival.complete && this._totalPlayTime > 2) {
                show('arrival_hint', 'Walk forward toward the glowing sign ahead.');
                return;
            }
            if (this._totalPlayTime > 8 && this._totalPlayTime < 30 && s.arrival?.complete) {
                show('explore', 'Walk toward one of the glowing portals around you.');
                return;
            }
            if (this._totalPlayTime > 40 && visitedCount <= 1) {
                show('interact', 'Press E near objects to interact with them.');
                return;
            }
            if (this._totalPlayTime > 90 && visitedCount <= 1) {
                show('edge', 'Walk through the glowing portals to enter new zones.');
                return;
            }
        }

        // After visiting first zone
        if (visitedCount > 1 && visitedCount < 4) {
            show('more_zones', 'Each zone has discoveries to find. How many can you collect?');
            return;
        }

        // After visiting several zones
        if (visitedCount >= 4 && visitedCount < 8) {
            show('secrets_hint', 'Press E near objects to discover them all. Check ★ in the corner for progress!');
            return;
        }

        // Deep play
        if (visitedCount >= 8) {
            show('deep', 'The Wireframe Void has a map of all zones you\'ve visited.');
            return;
        }
    }

    /** @private */
    _applyWorldState(state) {
        const s = this._sys;
        const fog = s.scene.fog;
        if (fog) {
            fog.color.copy(state.fogColor);
            fog.near = state.fogNear;
            fog.far  = state.fogFar;
        }
        s.scene.background.copy(state.bgColor);
        s.sunlight.intensity = state.sunIntensity;
        s.sunlight.color.copy(state.sunColor);
        s.ambient.intensity  = state.ambientIntensity;
        if (s.scene.userData.skyMat) {
            s.scene.userData.skyMat.uniforms.topColor.value.copy(state.skyTopColor);
            s.scene.userData.skyMat.uniforms.bottomColor.value.copy(state.skyBottomColor);
        }
        // Camera distance is set once per zone transition (not every frame)
        // so the player can zoom in/out with the scroll wheel.
    }

    /** @private */
    _updateFps(now) {
        this._fpsFrames++;
        if (now - this._fpsTime >= 1000) {
            const fps = this._fpsFrames;
            this._fpsFrames = 0;
            this._fpsTime = now;

            if (!this._fpsDisplay) {
                this._fpsDisplay = document.createElement('div');
                this._fpsDisplay.style.cssText =
                    'position:fixed;top:4px;left:4px;color:#00FF41;font:bold 14px monospace;' +
                    'background:rgba(0,0,0,0.6);padding:2px 6px;z-index:900;pointer-events:none;';
                document.body.appendChild(this._fpsDisplay);
            }
            this._fpsDisplay.style.display = 'block';
            this._fpsDisplay.textContent = `${fps} FPS`;
        }
    }
}
