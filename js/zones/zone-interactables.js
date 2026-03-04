import * as THREE from 'three';
import { PORTAL_DEFS } from '../world/portal-config.js';

/**
 * ZoneInteractables — registers interactable objects for every zone
 * and tracks them as collectibles.
 *
 * Each interactable is registered with the CollectionTracker so the
 * player can see per-zone and total progress. First interactions
 * trigger satisfying discovery popups.
 */

/** Descriptions for the prime stones (keyed by their label number). */
const STONE_DESCRIPTIONS = {
    2:  'A mysterious stone. It hums softly.',
    3:  'A peculiar stone. Warm to the touch.',
    5:  'A strange stone. It glows faintly.',
    7:  'An ancient stone. Covered in moss.',
    11: 'A weathered stone. Older than memory.',
};

/**
 * Create an invisible interaction marker mesh.
 * @param {THREE.Vector3} position
 * @returns {THREE.Mesh}
 */
function marker(position) {
    const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 4, 4),
        new THREE.MeshBasicMaterial({ visible: false }),
    );
    m.position.copy(position);
    return m;
}

// ─────────────────────────────────────────────────────────────────────────
//  Green Field (Zone 1) interactables
// ─────────────────────────────────────────────────────────────────────────

/**
 * Register bench, mailbox, and prime stones.
 */
export function registerFieldInteractables({
    interactions, josh, cameraCtrl, benchData, mailboxData, field,
    pageManager, secretsManager, subconscious, showExamine, onBoardTrain,
    tracker, operatorZero,
}) {
    // ── Bench ───────────────────────────────────────────────────────────
    const benchId = tracker?.register('green_field', 'Bench') ?? null;

    interactions.register(benchData.mesh, {
        type: 'sit',
        radius: 3.0,
        label: 'Sit',
        onInteract: () => {
            if (benchId && tracker) tracker.discover(benchId);
            if (josh.isSitting) {
                josh.stand();
                if (cameraCtrl) cameraCtrl.endSitPullback();
            } else {
                josh.sit(benchData.sitPosition, benchData.sitLookAt);
                if (cameraCtrl) cameraCtrl.beginSitPullback();
                if (subconscious) subconscious.recordBenchSit();
                if (secretsManager) {
                    secretsManager.recordBenchSit();
                    secretsManager.checkSecret('bench_watcher');
                }
            }
        },
    });

    // ── Mailbox ─────────────────────────────────────────────────────────
    const mailboxId = tracker?.register('green_field', 'Mailbox') ?? null;

    interactions.register(mailboxData.mesh, {
        type: 'read',
        radius: 2.5,
        label: 'Check Mail',
        onInteract: () => {
            if (mailboxId && tracker) tracker.discover(mailboxId);
            josh.animation.setState('interact');
            if (secretsManager) secretsManager.checkSecret('mailbox_opener');
            setTimeout(() => pageManager.openPage('/math/'), 300);
        },
    });

    // ── Prime stones ────────────────────────────────────────────────────
    const examinedStones = new Set();
    const totalStones = 5;
    const stoneNumbers = [2, 3, 5, 7, 11];
    let stoneIdx = 0;
    field.children.forEach(child => {
        if (child.type === 'Group' && child !== benchData.mesh && child !== mailboxData.mesh) {
            const body = child.children.find(c =>
                c.geometry?.type === 'IcosahedronGeometry' ||
                c.geometry?.type === 'IcosahedronBufferGeometry' ||
                (c.geometry?.parameters?.detail === 0 && c.geometry?.type?.includes?.('Icosahedron'))
            );
            if (body) {
                const badge = child.children.find(c => c.geometry?.type === 'PlaneGeometry');
                const num = stoneNumbers[stoneIdx] || '?';
                stoneIdx++;

                const label = `Examine Stone ${num}`;
                const stoneId = tracker?.register('green_field', label) ?? null;

                interactions.register(child, {
                    type: 'examine',
                    radius: 2.5,
                    label,
                    onInteract: () => {
                        if (stoneId && tracker) tracker.discover(stoneId);
                        josh.animation.setState('interact');
                        examinedStones.add(child.uuid);

                        if (showExamine) {
                            if (operatorZero && operatorZero.shouldGlitchExamine()) {
                                showExamine(operatorZero.getGlitchExamineText());
                            } else if (STONE_DESCRIPTIONS[num]) {
                                showExamine(STONE_DESCRIPTIONS[num]);
                            }
                        }

                        if (examinedStones.size >= totalStones && secretsManager) {
                            secretsManager.checkSecret('prime_collector');
                        }
                    },
                });
            }
        }
    });

    // ── Number Line train ───────────────────────────────────────────────
    const trainData = field.userData.trainData;
    if (trainData && trainData.interactionMesh) {
        const trainLabel = 'Board the Number Line';
        const trainId = tracker?.register('green_field', trainLabel) ?? null;

        interactions.register(trainData.interactionMesh, {
            type: 'enter',
            radius: 4.0,
            label: trainLabel,
            onInteract: () => {
                if (trainId && tracker) tracker.discover(trainId);
                josh.animation.setState('interact');
                if (onBoardTrain) onBoardTrain();
            },
        });
    }

    // ── Distant Landmark Switch ─────────────────────────────────────────
    const distantSwitch = field.getObjectByName('distant_switch');
    if (distantSwitch) {
        const switchLabel = 'Toggle Giant Obelisk Switch';
        const switchId = tracker?.register('green_field', switchLabel) ?? null;
        
        // Auto-activate if already discovered
        if (switchId && tracker && tracker.isDiscovered(switchId)) {
            const def = PORTAL_DEFS.find(d => d.zone === 'fractal_boundary');
            if (def) def.active = true;
            if (field.userData.revealPortals) field.userData.revealPortals();
            const handle = field.getObjectByName('switch_handle');
            if (handle && handle.material) handle.material.color.setHex(0x00ff00);
        }

        interactions.register(distantSwitch, {
            type: 'examine',
            radius: 3.5,
            label: 'Toggle Switch',
            onInteract: () => {
                const wasNew = switchId && tracker ? tracker.discover(switchId) : false;
                josh.animation.setState('interact');
                
                // Show message
                if (showExamine) {
                    showExamine(wasNew 
                        ? "A distant rumble is heard... Something has changed in the hub."
                        : "The switch is already active. The hub remains changed."
                    );
                }

                // Activate the secret portal
                const def = PORTAL_DEFS.find(d => d.zone === 'fractal_boundary');
                if (def) {
                    def.active = true;
                }
                if (field.userData.revealPortals) {
                    field.userData.revealPortals();
                }

                // Visual feedback on switch
                const handle = field.getObjectByName('switch_handle');
                if (handle && handle.material) {
                    handle.material.color.setHex(0x00ff00);
                }
            },
        });
    }

    // ── Distant Discoveries ─────────────────────────────────────────────
    const disc = field.userData.discoveries;
    if (disc) {
        const discoveryDefs = [
            { target: disc.spireTarget,    label: 'Examine the Spire',
              text: 'An impossible needle. It was here before everything.' },
            { target: disc.colossusTarget, label: 'Examine the Colossus',
              text: 'Something ancient sleeps face-down in the earth.' },
            { target: disc.riftTarget,     label: 'Examine the Rift',
              text: 'The ground is split open. Something pulses far below.' },
            { target: disc.vesselTarget,   label: 'Examine the Vessel',
              text: 'A hull without an ocean. It carried something here.' },
            { target: disc.ringTarget,     label: 'Examine the Ring',
              text: 'A perfect circle. The stone is smooth on the inside.' },
        ];
        for (const def of discoveryDefs) {
            if (!def.target) continue;
            const dId = tracker?.register('green_field', def.label) ?? null;
            interactions.register(def.target, {
                type: 'examine',
                radius: 8.0,
                label: def.label,
                onInteract: () => {
                    if (dId && tracker) tracker.discover(dId);
                    josh.animation.setState('interact');
                    if (showExamine) showExamine(def.text);
                },
            });
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────
//  Per-zone interactables (zones with getInteractablePositions)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generic helper: register all positions returned by a zone's
 * getInteractablePositions() method as interaction markers.
 *
 * @param {object}  opts
 * @param {string}  deps.zoneKey      Zone key for collection tracking
 * @param {object}  deps.zone         Zone instance
 * @param {object}  deps.interactions InteractionManager
 * @param {object}  deps.josh         Josh character
 * @param {object}  [deps.tracker]    CollectionTracker
 * @param {string}  [deps.defaultType='examine']
 * @param {number}  [deps.radius=1.5]
 * @param {Function} [deps.onInteract] Custom callback per-item
 */
function registerGenericInteractables({ zoneKey, zone, interactions, josh, tracker, defaultType = 'examine', radius = 1.5, onInteract }) {
    if (typeof zone.getInteractablePositions !== 'function') return;

    const items = zone.getInteractablePositions();
    for (const item of items) {
        const m = marker(item.position);
        if (item.parent) {
            item.parent.add(m);
        } else {
            zone.getScene().add(m);
        }

        const label = item.label || '';
        const itemId = tracker?.register(zoneKey, label || `item_${item.position.x.toFixed(1)}_${item.position.z.toFixed(1)}`) ?? null;

        interactions.register(m, {
            type: item.type || defaultType,
            radius: item.radius || radius,
            label,
            onInteract: () => {
                if (itemId && tracker) tracker.discover(itemId);
                josh.animation.setState('interact');
                if (item.action) item.action();
                if (onInteract) onInteract(item);
            },
        });
    }
}

/**
 * Register Coordinate Plane integer grid points.
 */
function registerCoordinatePlaneInteractables({ zone, interactions, josh, secretsManager, tracker }) {
    if (typeof zone.getIntegerPoints === 'function') {
        for (const pt of zone.getIntegerPoints()) {
            const m = marker(pt.position);
            zone.getScene().add(m);

            const label = 'Grid Marker';
            const ptId = tracker?.register('coordinate_plane', label) ?? null;

            interactions.register(m, {
                type: 'examine',
                radius: 1.0,
                label,
                onInteract: () => {
                    if (ptId && tracker) tracker.discover(ptId);
                    josh.animation.setState('look_around');
                    if (secretsManager) secretsManager.checkSecret('function_walker');
                },
            });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────
//  Master registration function
// ─────────────────────────────────────────────────────────────────────────

/**
 * Register interactables for ALL zones at once.
 *
 * @param {object} deps
 * @param {import('./zone-registry.js').ZoneRegistry} deps.registry
 * @param {import('../interactions/interaction-manager.js').InteractionManager} deps.interactions
 * @param {import('../josh/josh.js').Josh} deps.josh
 * @param {import('../pages/page-manager.js').PageManager} deps.pageManager
 * @param {object|null} deps.secretsManager
 * @param {object} deps.benchData
 * @param {object} deps.mailboxData
 * @param {THREE.Group} deps.field
 * @param {import('../systems/collection-tracker.js').CollectionTracker} [deps.tracker]
 */
export function registerAllInteractables(deps) {
    const { registry, interactions, josh, cameraCtrl, pageManager, secretsManager, subconscious, showExamine, tracker, operatorZero } = deps;

    // ── Field (special case) ───────────────────────────────────────────
    registerFieldInteractables({
        interactions, josh, cameraCtrl,
        benchData: deps.benchData,
        mailboxData: deps.mailboxData,
        field: deps.field,
        pageManager,
        secretsManager,
        subconscious,
        showExamine,
        onBoardTrain: deps.onBoardTrain,
        tracker,
        operatorZero,
    });

    // ── Coordinate Plane ───────────────────────────────────────────────
    const coordPlane = registry.getInstance('coordinate_plane');
    if (coordPlane) {
        registerCoordinatePlaneInteractables({ zone: coordPlane, interactions, josh, secretsManager, tracker });
    }

    // ── Generic registration for all remaining zones ───────────────────
    const genericZones = [
        'wireframe_void', 'non_euclidean', 'fractal_boundary',
        'number_caverns',
    ];

    for (const key of genericZones) {
        const zone = registry.getInstance(key);
        if (!zone) continue;

        registerGenericInteractables({
            zoneKey: key,
            field: deps.field,
            registry: deps.registry,
            zone, interactions, josh, tracker,
            onInteract: (item) => {
                // ── Lava death mechanic ──
                if (item.type === 'lava_pool') {
                    const el = document.getElementById('hud-examine');
                    if (el) {
                        el.innerHTML = 'You fell into the lava and died.<br><br>' +
                            '<span style="color:#ffaa44">[ Press Space to Wake Up ]</span>';
                        el.style.display = 'block';
                        el.style.opacity = '1';
                        const wakeFn = (e) => {
                            if (e.code === 'Space' || e.code === 'KeyE') {
                                document.removeEventListener('keydown', wakeFn);
                                el.style.display = 'none';
                                el.style.opacity = '0';
                                if (deps.registry) deps.registry.setActiveZone('green_field', deps.field);
                                if (deps.josh) deps.josh.model.position.set(0, 0, 0);
                            }
                        };
                        document.addEventListener('keydown', wakeFn);
                    }
                    return;
                }

                // Zone-specific secret hooks
                if (key === 'wireframe_void' && secretsManager) {
                    secretsManager.checkSecret('void_explorer');
                }
                if (key === 'fractal_boundary' && secretsManager) {
                    secretsManager.checkSecret('fractal_zoom');
                }
            },
        });
    }
}
