/**
 * main.js — Josh's Math Fun World entry point.
 *
 * This file is ONLY bootstrap. It creates all systems, wires them
 * together, and hands off to GameLoop. Per-frame logic lives in
 * game-loop.js; zone management in zones/zone-registry.js and
 * zones/zone-transitions.js; interactable hookups in
 * zones/zone-interactables.js.
 *
 * Shell Bingby keeps the entry point clean.
 */

import * as THREE from 'three';

// ── World building ──────────────────────────────────────────────────────
import { createField }        from './world/field.js';
import { setupSky }           from './world/sky.js';
import { createBench }        from './world/bench.js';
import { createMailbox }      from './world/mailbox.js';
import { ArrivalController }  from './world/entrance.js';
import { NumberLineCutscene } from './world/number-line-train.js';
import { BomberPlane }        from './world/bomber-plane.js';

// ── Character ───────────────────────────────────────────────────────────
import { Josh }  from './josh/josh.js';
import { Input } from './josh/input.js';
import { TouchInput } from './josh/touch-input.js';

// ── Camera ──────────────────────────────────────────────────────────────
import { CameraController } from './camera.js';

// ── Systems ─────────────────────────────────────────────────────────────
import { InteractionManager }     from './interactions/interaction-manager.js';
import { createPhase2EventManager } from './events/event-manager.js';
import { ShiftManager }           from './shifts/shift-manager.js';
import { GREEN_FIELD_STATE, WIREFRAME_VOID_STATE } from './shifts/world-state.js';
import { TransitionType }         from './shifts/transitions.js';
import { PostProcessing }         from './rendering/post-processing.js';

// ── Zones ───────────────────────────────────────────────────────────────
import { ZoneRegistry }           from './zones/zone-registry.js';
import { ZoneTransitionManager }  from './zones/zone-transitions.js';
import { registerAllInteractables } from './zones/zone-interactables.js';

// ── Pages ───────────────────────────────────────────────────────────────
import { PageManager }             from './pages/page-manager.js';
import { registerUniversityPages } from './pages/university-pages.js';
import { registerUniversityPagesV2 } from './pages/university-pages-v2.js';

// ── New systems (Phase 15-17) ───────────────────────────────────────────
import { AudioManager }   from './audio/audio-manager.js';
import persistence        from './systems/persistence.js';
import { SecretsManager } from './systems/secrets.js';
import { SubconsciousManager, applyStoneGlow, applyMandelbrotReveal } from './systems/subconscious.js';
import { CollectionTracker } from './systems/collection-tracker.js';
import { WatcherSystem } from './systems/watcher.js';
import { initARG, onZoneChangeARG } from './systems/arg.js';
import { OperatorZero } from './systems/operator-zero.js';
import { SettingsMenu }   from './ui/settings-menu.js';
import { HUDManager } from './ui/hud-manager.js';
import { showTitleScreen } from './ui/title-screen.js';
import { DebugMenu }       from './ui/debug-menu.js';
import { SceneEditor }     from './ui/scene-editor.js';
import { globalEventBus, EVENTS } from './events/event-bus.js';
// ── Game Loop ───────────────────────────────────────────────────────────
import { GameLoop } from './game-loop.js';

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  CONSTANTS                                                          ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const RENDER_WIDTH  = 320;
const RENDER_HEIGHT = 240;

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  RENDERER                                                           ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
renderer.domElement.style.imageRendering = 'pixelated';
renderer.domElement.style.width  = '100vw';
renderer.domElement.style.height = '100vh';
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SCENE & CAMERA                                                     ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1500);

// ── Lighting ────────────────────────────────────────────────────────────
const sunlight = new THREE.DirectionalLight(0xFFFFF5, 2.4);
sunlight.position.set(30, 50, 20);
scene.add(sunlight);

const ambient = new THREE.AmbientLight(0x80A0C0, 0.9);
scene.add(ambient);

// Fill light from below-left to soften shadows and add warmth
const fillLight = new THREE.DirectionalLight(0xFFE8C0, 0.5);
fillLight.position.set(-20, 10, -15);
scene.add(fillLight);

// ── Sky ─────────────────────────────────────────────────────────────────
setupSky(scene);

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  GREEN FIELD (Zone 1 — special case, raw Group)                     ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const field = createField();
scene.add(field);

const benchData   = createBench();
field.add(benchData.mesh);
field.userData.colliders.push(benchData.collider);

const mailboxData = createMailbox();
field.add(mailboxData.mesh);
field.userData.colliders.push(mailboxData.collider);

// ── Doomsday Bomber — always circling above the hub ────────────────────
const bomber = new BomberPlane({
    worldGroup: field,
    scene,
    onDetonation: () => {
        // Pick a random non-hub zone to eject the player into
        const zoneKeys = [...registry.keys()].filter(k => k !== 'green_field');
        const target = zoneKeys[Math.floor(Math.random() * zoneKeys.length)] || 'wireframe_void';
        transitions.goTo(target, 'hard_cut', 0.2);
    },
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  JOSH                                                               ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const josh = new Josh({ colliders: field.userData.colliders || [] });
josh.platformSurfaces = field.userData.platforms || [];
scene.add(josh.model);

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  INPUT                                                              ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const input = new Input(renderer.domElement);

// Mobile touch controls — auto-show on touch devices
let touchInput = null;
if (TouchInput.isTouchDevice()) {
    touchInput = new TouchInput(renderer.domElement);
    touchInput.show();
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  CAMERA CONTROLLER                                                  ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const cameraCtrl = new CameraController(camera);
// Give Josh a camera reference for landing impact bumps
josh.setCameraController(cameraCtrl);
// Place camera behind and above Josh's starting position
{
    const jPos = josh.getPosition();
    cameraCtrl.currentPosition.set(jPos.x, jPos.y + 8, jPos.z + 12);
}

// ── Window resize — aspect stays constant (4:3 internal render) ─────────
// The camera renders into a fixed 320×240 target; aspect must stay 4:3.
// Only the CSS stretches the canvas to fill the viewport.
window.addEventListener('resize', () => {
    camera.aspect = RENDER_WIDTH / RENDER_HEIGHT;
    camera.updateProjectionMatrix();
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  CORE SYSTEMS                                                       ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const interactions = new InteractionManager(scene);
const shiftManager = new ShiftManager(GREEN_FIELD_STATE);
const postProcess  = new PostProcessing(renderer, RENDER_WIDTH, RENDER_HEIGHT);
postProcess.setScanlines(false);
postProcess.setDithering(true);

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  PAGES (Zone 7)                                                     ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const pageManager = new PageManager();
registerUniversityPages(pageManager);
registerUniversityPagesV2(pageManager);

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  ZONE REGISTRY — all 12 non-field zones                             ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const registry = new ZoneRegistry();
registry.init(scene);

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  ZONE TRANSITIONS                                                   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const transitions = new ZoneTransitionManager({
    registry,
    shiftManager,
    josh,
    fieldGroup: field,
    postProcess,
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  NEW SYSTEMS: Audio, Persistence, Secrets, Settings                 ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ── Persistence (must come before audio for isFirstSession check) ────
const isFirstSession = persistence.isFirstVisit();
persistence.incrementSessionCount();
persistence.markZoneVisited('green_field');

// ── Audio ───────────────────────────────────────────────────────────────
const audio = new AudioManager();

// Init audio on first user interaction (browser requirement)
const initAudioOnce = () => {
    audio.init();
    audio.setZoneAmbience('green_field');
    audio.playMusic('mus-main-theme', 0.15); // Start background music
    document.removeEventListener('click', initAudioOnce);
    document.removeEventListener('keydown', initAudioOnce);
    document.removeEventListener('touchstart', initAudioOnce);
};

// Title screen now handles the entry flow — tutorial & click-to-play
// overlays are superseded by the block-letter title screen.

// ── Arrival Controller (dark-to-light entrance experience) ──────────────
const arrival = new ArrivalController(scene, sunlight, ambient, {
    skip: !isFirstSession,
    field: field,
});

// ── Secrets ─────────────────────────────────────────────────────────────
const secrets = new SecretsManager();

secrets.onSecretUnlocked = (secret) => {
    if (audio.isEnabled()) audio.playSecretFound();
};

// ── Watcher System ──────────────────────────────────────────────────────
const watcher = new WatcherSystem(scene, camera, josh.model);
// ── Operator Zero ──────────────────────────────────────────────────────
const operatorZero = new OperatorZero({ persistence, eventBus: globalEventBus });
// ── Collection Tracker (collectathon progress) ──────────────────────
const tracker = new CollectionTracker();
tracker.bindHUD();

tracker.onDiscover = (data) => {
    if (audio.isEnabled()) audio.playDiscovery();
};

tracker.onZoneComplete = (zone) => {
    tracker.showZoneComplete(zone);
    if (audio.isEnabled()) audio.playZoneComplete();
};
// ── Subconscious Layer ──────────────────────────────────────────────────
const subconscious = new SubconsciousManager({ persistence, secrets });

subconscious.onStonesGlow = () => applyStoneGlow(field);
subconscious.onMandelbrotReveal = () => applyMandelbrotReveal(field);

// Check connections on startup (e.g. if player already visited caverns)
subconscious.update();

// ── Settings ────────────────────────────────────────────────────────────
const hud = new HUDManager();
const settings = new SettingsMenu();

const sceneEditor = new SceneEditor({
    scene,
    camera,
    renderer,
});

const initialLayoutResult = sceneEditor.applySavedLayout();
if (initialLayoutResult.applied > 0 || initialLayoutResult.missing > 0) {
    console.log(
        `[SceneEditor] Loaded saved layout. Applied: ${initialLayoutResult.applied}, missing: ${initialLayoutResult.missing}`
    );
}

// ── Debug Menu (backtick to toggle) ─────────────────────────────────────
const debugMenu = new DebugMenu({
    josh,
    registry,
    transitions,
    shiftManager,
    fieldGroup: field,
    greenFieldState: GREEN_FIELD_STATE,
    sceneEditor,
});

audio.setMasterVolume(settings.getSetting('masterVolume'));

settings.onChange = (key, value) => {
    if (key === 'masterVolume') audio.setMasterVolume(value);
    if (key === 'touchControls') {
        if (value === true) {
            if (!touchInput) {
                touchInput = new TouchInput(renderer.domElement);
            }
            touchInput.show();
            // Update game loop reference
            if (gameLoop) gameLoop._sys.touchInput = touchInput;
        } else if (value === false && touchInput) {
            touchInput.hide();
        }
    }
    if (key === 'renderScale') postProcess.setRenderScale(value);
};

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  ZONE TRANSITION HOOKS                                              ║
// ╚═══════════════════════════════════════════════════════════════════════╝

globalEventBus.on(EVENTS.ZONE_ENTERED, ({ fromZone, toZone }) => {
    // HUD: show zone name
    if (gameLoop) gameLoop.showZoneName(toZone);

    // Set camera distance for the new zone
    if (toZone === 'green_field') {
        cameraCtrl.distance = GREEN_FIELD_STATE.cameraDistance;
    } else {
        const zoneEntry = registry.get(toZone);
        if (zoneEntry && zoneEntry.state) cameraCtrl.distance = zoneEntry.state.cameraDistance;
    }

    // Swap colliders: load zone-specific or green_field obstacles
    if (toZone === 'green_field') {
        josh.colliders = field.userData.colliders || [];
        josh.platformSurfaces = field.userData.platforms || [];
    } else {
        const zoneInst = registry.getInstance(toZone);
        josh.colliders = (zoneInst && typeof zoneInst.getColliders === 'function') ? zoneInst.getColliders() : [];
        josh.platformSurfaces = (zoneInst && typeof zoneInst.getPlatformSurfaces === 'function') ? zoneInst.getPlatformSurfaces() : [];
    }
    cameraCtrl.colliders = josh.colliders;

    // ── Non-Euclidean movement & view warp ──────────────────────────────
    // When entering the non-euclidean zone, activate hyperbolic movement
    // transform and post-processing warp. Clear them on exit.
    if (toZone === 'non_euclidean') {
        const neZone = registry.getInstance('non_euclidean');
        if (neZone) {
            neZone.onSubZoneChange = (subZone) => {
                postProcess.setHyperbolicWarp(subZone === 'hyperbolic' ? 0.6 : 0.0);
            };
            josh.setMovementTransform(neZone.getMovementTransform());
            josh.setTerrainHeightFn((x, z) => neZone.getTerrainHeight(x, z));
            cameraCtrl.setGroundHeightFn((x, z) => neZone.getTerrainHeight(x, z));
            postProcess.setHyperbolicWarp(
                neZone.getActiveSubZone() === 'hyperbolic' ? 0.6 : 0.0
            );
        }
    } else {
        // Leaving a zone — clear any non-Euclidean overrides
        const neZone = registry.getInstance('non_euclidean');
        if (neZone) neZone.onSubZoneChange = null;
        
        josh.setMovementTransform(null);
        postProcess.setHyperbolicWarp(0.0);

        // ── Inner Sphere: restore normal rendering when leaving ─────────
        if (fromZone === 'inner_sphere') {
            const oldSphere = registry.getInstance('inner_sphere');
            if (oldSphere && typeof oldSphere.restoreNormalModel === 'function') {
                oldSphere.restoreNormalModel(josh);
            }
        }

        // ── Inner Sphere: special terrain / camera setup ────────────────
        if (toZone === 'inner_sphere') {
            const sphereZone = registry.getInstance('inner_sphere');
            if (sphereZone) {
                josh.setTerrainHeightFn((x, z) => sphereZone.getTerrainHeight(x, z));
                // Camera ground height must be very low — the fixCamera
                // override in game-loop handles camera positioning inside the
                // sphere; the standard terrain clamp must not interfere.
                cameraCtrl.setGroundHeightFn(() => -1000);
            }
        } else {
            // Set terrain height function for zones with non-flat terrain
            const newZoneInst = (toZone !== 'green_field') ? registry.getInstance(toZone) : null;
            if (newZoneInst && typeof newZoneInst.getTerrainHeight === 'function') {
                // Check if the zone has real terrain (not just the default return 0)
                josh.setTerrainHeightFn((x, z) => newZoneInst.getTerrainHeight(x, z));
                cameraCtrl.setGroundHeightFn((x, z) => newZoneInst.getTerrainHeight(x, z));
            } else {
                josh.setTerrainHeightFn(null);
                cameraCtrl.setGroundHeightFn(null);
            }
        }
    }

    // Persistence
    persistence.markZoneVisited(toZone);
    persistence.saveCurrentZone(toZone);
    const transPos = josh.getPosition();
    persistence.savePlayerPosition(transPos.x, transPos.y, transPos.z, toZone);

    // Secrets
    secrets.recordZoneVisit(toZone);
    if (toZone === 'wireframe_void')   secrets.checkSecret('void_explorer');
    if (toZone === 'fractal_boundary') secrets.checkSecret('fractal_zoom');

    // Audio: crossfade to new zone ambience
    if (audio.isEnabled()) {
        audio.setZoneAmbience(toZone);
        audio.playTransition('crossfade');
    }

    // Mark zone visited in wireframe void graph
    const voidZone = registry.getInstance('wireframe_void');
    if (voidZone && typeof voidZone.markZoneVisited === 'function') {
        voidZone.markZoneVisited(toZone);
    }

    // Apply field evolution traces when returning to green field
    if (toZone === 'green_field' && field.userData.applyEvolution) {
        field.userData.applyEvolution(secrets.getFieldEvolution());
    }

    // Check if all zones visited
    const allZoneKeys = ['green_field', ...registry.keys()];
    const allVisited = allZoneKeys.every(k => persistence.hasVisitedZone(k));
    if (allVisited) secrets.checkSecret('zone_graph_complete');

    // ── Subconscious: update cross-zone connections ────────────────────
    subconscious.update();

    // ── Collection tracker: show zone progress ─────────────────────────
    // Slight delay so it appears under the zone name banner
    setTimeout(() => tracker.showZoneProgress(toZone), 600);
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  NUMBER LINE CUTSCENE                                               ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// The cutscene is a forward-declared var so the interactable callback and
// the game loop both have access to the same instance.
let trainCutscene = null;

{
    const trainData = field.userData.trainData;
    if (trainData) {
        trainCutscene = new NumberLineCutscene({
            carGroup:    trainData.carGroup,
            localGroup:  trainData.localGroup,
            doorLeft:    trainData.doorLeft,
            doorRight:   trainData.doorRight,
            josh,
            cameraCtrl,
            camera,
            postProcess,
            baseY:       trainData.baseY,
            onComplete: () => {
                // Doors done, train gone — now transition to Number Caverns
                transitions.goTo('number_caverns', 'crossfade', 1.2);
            },
        });
    }
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  INTERACTABLES                                                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

registerAllInteractables({
    registry,
    interactions,
    josh,
    cameraCtrl,
    pageManager,
    secretsManager: secrets,
    subconscious,
    benchData,
    mailboxData,
    field,
    tracker,
    operatorZero,
    showExamine: (text) => {
        if (gameLoop) gameLoop.showExamineText(text);
    },
    onBoardTrain: () => {
        if (trainCutscene && !trainCutscene.isRunning && !transitions.isTransitioning) {
            // Pause normal game logic during cutscene
            if (gameLoop) gameLoop.showZoneName('number_caverns');
            // Play a transition sound if audio is enabled
            if (audio && audio.isEnabled()) audio.playTransition('crossfade');
            trainCutscene.start();
        }
    },
});

// ── Giant Game Number interactables ─────────────────────────────────────
function openGameIframe(url) {
    const overlay = document.getElementById('game-iframe-overlay');
    const iframe = document.getElementById('game-iframe-content');
    if (!overlay || !iframe) return;
    iframe.src = url;
    overlay.style.display = 'flex';
    // Release pointer lock so user can interact with the iframe
    document.exitPointerLock?.();
}

function closeGameIframe() {
    const overlay = document.getElementById('game-iframe-overlay');
    const iframe = document.getElementById('game-iframe-content');
    if (!overlay || !iframe) return;
    overlay.style.display = 'none';
    iframe.src = '';
}

// Wire close button
document.getElementById('close-game-iframe')?.addEventListener('click', closeGameIframe);
// Also close on Escape
document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('game-iframe-overlay');
    if (e.key === 'Escape' && overlay && overlay.style.display === 'flex') {
        closeGameIframe();
    }
});

if (field.userData.gameFiveMesh) {
    interactions.register(field.userData.gameFiveMesh, {
        type: 'activate',
        radius: 25,
        label: 'Play Match Five',
        onInteract: () => {
            openGameIframe('https://hamburgj.github.io/match-five/');
        },
    });
}

if (field.userData.gameNineMesh) {
    interactions.register(field.userData.gameNineMesh, {
        type: 'activate',
        radius: 25,
        label: 'Play Four Nines',
        onInteract: () => {
            openGameIframe('https://hamburgj.github.io/four-nines-game');
        },
    });
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  EVENT MANAGER                                                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const eventManager = createPhase2EventManager();

eventManager.cancel('sky_wireframe_flash');
eventManager.schedule({
    id: 'sky_wireframe_flash',
    delay: 180,
    once: true,
    action: () => {
        // Only flash if player is on the green field — otherwise the world
        // state would snap to GREEN_FIELD_STATE and corrupt the current zone.
        if (registry.activeZone !== 'green_field') return;

        shiftManager.pushHistory();
        shiftManager.beginTransition(WIREFRAME_VOID_STATE, 0.3, TransitionType.GLITCH);
        setTimeout(() => {
            shiftManager.beginTransition(GREEN_FIELD_STATE, 0.3, TransitionType.GLITCH);
        }, 500);
        if (audio.isEnabled()) audio.playShiftGlitch();
    },
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  KEYBOARD SHORTCUTS                                                 ║
// ╚═══════════════════════════════════════════════════════════════════════╝

document.addEventListener('keydown', (e) => {
    if (sceneEditor && sceneEditor.isOpen()) {
        return;
    }

    if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        if (pageManager.isOpen()) {
            pageManager.closePage();
        } else {
            settings.toggle();
        }
        return;
    }

    if (e.key === 'g' || e.key === 'G') {
        const pos = josh.getPosition();
        const zone = registry.activeZone;
        console.log('Gödel encoding:', `G(${zone}, ${pos.x.toFixed(2)}, ${pos.z.toFixed(2)})`);
        secrets.checkSecret('godel_number');
    }

    const digit = parseInt(e.key, 10);
    if (!isNaN(digit)) {
        if (transitions.isTransitioning) return; // Guard against concurrent transitions

        const zoneByDigit = [
            null, 'green_field', 'coordinate_plane', 'fractal_boundary',
            'wireframe_void', 'non_euclidean', 'number_caverns', null, null, null,
        ];
        const target = zoneByDigit[digit];
        if (target === 'green_field') {
            // Green field isn't in the registry — return Josh to field via custom rule
            if (registry.activeZone !== 'green_field') {
                const prevZone = registry.activeZone;
                registry.setActiveZone('green_field', field);
                shiftManager.pushHistory();
                shiftManager.beginTransition(GREEN_FIELD_STATE, 0.5, TransitionType.CROSSFADE);
                josh.teleportTo(0, 0, 10);
                josh.colliders = field.userData.colliders || [];
                josh.platformSurfaces = field.userData.platforms || [];
                transitions.onTransition?.(prevZone, 'green_field');
            }
        } else if (target && persistence.hasVisitedZone(target)) {
            transitions.goTo(target);
        }
    }
});

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  HIDE LOADING SCREEN & START                                        ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ── Apply field evolution from previous sessions ────────────────────────
if (field.userData.applyEvolution) {
    field.userData.applyEvolution(secrets.getFieldEvolution());
}

const loadingEl = document.getElementById('loading');
if (loadingEl) loadingEl.classList.add('hidden');

// ── ARG layer — console messages, title drift, favicon shift ────────────
initARG({
    sessionCount: persistence.getSessionCount(),
    visitedZones: [...persistence.getVisitedZones()],
});

globalEventBus.on(EVENTS.ZONE_ENTERED, ({ zone }) => {
    onZoneChangeARG(zone, [...persistence.getVisitedZones()], persistence.getSessionCount());
});

// ── Session restoration ─────────────────────────────────────────────────
let _restoredZone = null;
if (!isFirstSession) {
    const savedZone = persistence.getCurrentZone();
    if (savedZone && savedZone !== 'green_field' && registry.get(savedZone)) {
        registry.setActiveZone(savedZone, field);
        const zoneEntry = registry.get(savedZone);
        shiftManager.beginTransition(zoneEntry.state, 0, TransitionType.CROSSFADE);
        josh.colliders = []; // Non-field zones have no green-field colliders
        josh.platformSurfaces = [];
        // Load zone-specific colliders if available
        const restoredInst = registry.getInstance(savedZone);
        if (restoredInst && typeof restoredInst.getColliders === 'function') {
            josh.colliders = restoredInst.getColliders();
            josh.platformSurfaces = restoredInst.getPlatformSurfaces?.() || [];
        }
        _restoredZone = savedZone;
    }

    const savedPos = persistence.getPlayerPosition();
    if (savedPos) {
        josh.teleportTo(savedPos.x, savedPos.y, savedPos.z);
        // Position camera near Josh so it doesn't start at origin
        cameraCtrl.currentPosition.set(savedPos.x, savedPos.y + 6, savedPos.z + 8);
    }
}

const gameLoop = new GameLoop({
    josh, input, touchInput, cameraCtrl,
    interactions, eventManager, shiftManager,
    registry, transitions, postProcess, pageManager,
    audio, persistence, secrets, watcher, settings, hud,
    scene, camera, sunlight, ambient,
    field, arrival,
    trainCutscene,
    bomber,
    sceneEditor,
    operatorZero,
});

gameLoop.start();

// Show zone name on session restore (after gameLoop exists)
if (_restoredZone) {
    gameLoop.showZoneName(_restoredZone);
}

// ── Title Screen — the grand entrance ──────────────────────────────────
showTitleScreen().then(() => {
    initAudioOnce();
    renderer.domElement.requestPointerLock();
    setupSprintHint();
});

function setupSprintHint() {
    if (localStorage.getItem('jmfw_has_sprinted')) return;
    
    const ui = document.getElementById('sprint-hint-overlay');
    if (!ui) return;
    
    if (TouchInput.isTouchDevice()) {
        ui.textContent = "Push stick far forward to sprint!";
    }
    
    ui.style.display = 'block';
    
    const checkSprint = setInterval(() => {
        if (input.sprint || (touchInput && touchInput.sprint)) {
            ui.style.display = 'none';
            localStorage.setItem('jmfw_has_sprinted', 'true');
            clearInterval(checkSprint);
        }
    }, 100);
}

// DEBUG: expose game state for automated testing (remove in production)
window.__JMFW__ = { josh, cameraCtrl, camera, scene, field, registry, renderer, postProcess, arrival, persistence, tracker, audio, bomber, sceneEditor };
