/**
 * number-line-train.js — The Number Line Express
 *
 * A blocky PS1-style train sitting on the green field, waiting to whisk
 * Josh away to the Number Caverns. Instead of a portal, the player walks
 * up to the train, presses E to board, and a cutscene plays: the doors
 * slam shut, the camera pulls to side-view, and the train rockets down
 * the number line toward infinity.
 *
 * Shell Bingby says: "Every number has a stop. This train visits all of
 * them — even the ones that don't exist yet."
 */

import * as THREE from 'three';
import { getTerrainHeight } from './noise.js';
import { createPS1Material } from './ps1-material.js';

// =====================================================================
//  CONFIGURATION
// =====================================================================

/** Train placement in the hub field (northeast area, clear of other landmarks) */
const TRAIN_X = 50;
const TRAIN_Z = -55;
const TRAIN_ROTATION = Math.PI * 0.15;  // angled so tracks aim NE → ∞

/** Train dimensions (low-poly subway car vibe) */
const CAR_LENGTH  = 16;
const CAR_WIDTH   = 4;
const CAR_HEIGHT  = 4.5;
const ROOF_HEIGHT = 1.0;
const WHEEL_R     = 0.5;

/** Track / rails */
const TRACK_LEN      = 120;  // visible track length
const RAIL_GAUGE     = 3.2;  // distance between rails
const SLEEPER_COUNT  = 40;
const SLEEPER_SPACE  = TRACK_LEN / SLEEPER_COUNT;

/** Number ticks painted on the car side */
const NUMBER_TICKS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

/** Cutscene timing */
const DOOR_CLOSE_TIME = 0.8;   // seconds for doors to shut
const CAMERA_SETTLE   = 0.4;   // camera transition to side view
const ACCEL_DURATION  = 2.8;   // seconds of acceleration
const TOTAL_CUTSCENE  = DOOR_CLOSE_TIME + CAMERA_SETTLE + ACCEL_DURATION + 0.3;

// =====================================================================
//  COLORS
// =====================================================================

const BODY_COLOR     = 0x2a5999;  // deep blue
const TRIM_COLOR     = 0xf5cc45;  // gold trim
const DOOR_COLOR     = 0x3366bb;  // slightly lighter blue doors
const WHEEL_COLOR    = 0x2a364a;
const RAIL_COLOR     = 0x9595b2;
const SLEEPER_COLOR  = 0x5e452c;
const INTERIOR_COLOR = 0x1c1a2e;
const PLATFORM_COLOR = 0x7a7068;
const SIGN_BG_COLOR  = 0x15152a;

// =====================================================================
//  BUILD TRAIN
// =====================================================================

/**
 * Creates the Number Line train group, including tracks, platform, and
 * the train car itself with animated doors.
 *
 * @returns {{
 *   group: THREE.Group,
 *   collider: object,
 *   doorLeft: THREE.Mesh,
 *   doorRight: THREE.Mesh,
 *   interactionMesh: THREE.Mesh,
 *   update: (dt: number) => void,
 * }}
 */
export function createNumberLineTrain() {
    const group = new THREE.Group();
    group.name = 'number-line-train';

    const baseY = getTerrainHeight(TRAIN_X, TRAIN_Z);

    // Everything is built in local space, then positioned + rotated
    const local = new THREE.Group();

    // ── Tracks ──────────────────────────────────────────────────────────
    const tracks = buildTracks(baseY);
    local.add(tracks);

    // ── Platform (small raised area beside the train) ───────────────────
    const platform = buildPlatform(baseY);
    local.add(platform);

    // ── Train car body ──────────────────────────────────────────────────
    const car = buildTrainCar(baseY);
    local.add(car.group);

    // ── Number line markings along the side ─────────────────────────────
    const markings = buildNumberLineMarkings(baseY);
    local.add(markings);

    // ── Station sign "THE NUMBER LINE" ──────────────────────────────────
    const sign = buildStationSign(baseY);
    local.add(sign);

    // ── Wheels ──────────────────────────────────────────────────────────
    const wheels = buildWheels(baseY);
    local.add(wheels);

    // ── Interior glow (visible through windows) ─────────────────────────
    const interiorLight = new THREE.PointLight(0x4488ff, 1.5, 12, 1.5);
    interiorLight.position.set(0, baseY + 1.5 + CAR_HEIGHT * 0.5, 0);
    local.add(interiorLight);

    // ── Interaction marker (invisible sphere for E prompt) ──────────────
    // Placed on the platform side (+z) so the player can reach it from
    // the boarding platform without being blocked by the train collider.
    const interactionMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 4, 4),
        new THREE.MeshBasicMaterial({ visible: false }),
    );
    interactionMesh.position.set(0, baseY + 1.5, RAIL_GAUGE / 2 + 3.0);
    interactionMesh.name = 'train-interact';
    local.add(interactionMesh);

    // Position & rotate the whole assembly
    local.position.set(TRAIN_X, 0, TRAIN_Z);
    local.rotation.y = TRAIN_ROTATION;
    group.add(local);

    // ── Collider (axis-aligned bounding box, approximate) ───────────────
    const halfLen = CAR_LENGTH / 2 + 1;
    const halfWid = CAR_WIDTH / 2 + 1;
    const collider = {
        type: 'box',
        minX: TRAIN_X - halfLen,
        maxX: TRAIN_X + halfLen,
        minZ: TRAIN_Z - halfWid,
        maxZ: TRAIN_Z + halfWid,
    };

    // ── Platform surfaces Josh can stand on ─────────────────────────────
    // The platform slab is at local (0, baseY+0.4, RAIL_GAUGE/2+2.5) rotated
    // by TRAIN_ROTATION. Compute the AABB of the rotated rectangle.
    const platLocalZ = RAIL_GAUGE / 2 + 2.5;
    const platHalfX = (CAR_LENGTH + 4) / 2;  // 10
    const platHalfZ = 1.5;                    // half of depth 3
    const cosR = Math.cos(TRAIN_ROTATION);
    const sinR = Math.sin(TRAIN_ROTATION);
    // Compute all 4 corners in world space
    const platCorners = [
        [-platHalfX, platLocalZ - platHalfZ],
        [ platHalfX, platLocalZ - platHalfZ],
        [-platHalfX, platLocalZ + platHalfZ],
        [ platHalfX, platLocalZ + platHalfZ],
    ].map(([lx, lz]) => [
        TRAIN_X + lx * cosR + lz * sinR,
        TRAIN_Z - lx * sinR + lz * cosR,
    ]);
    const platMinX = Math.min(...platCorners.map(c => c[0]));
    const platMaxX = Math.max(...platCorners.map(c => c[0]));
    const platMinZ = Math.min(...platCorners.map(c => c[1]));
    const platMaxZ = Math.max(...platCorners.map(c => c[1]));
    const platforms = [{
        minX: platMinX, maxX: platMaxX,
        minZ: platMinZ, maxZ: platMaxZ,
        topY: baseY + 0.8,  // top of the 0.8-high slab centered at baseY+0.4
    }];

    // Idle animation state
    let idleTime = 0;
    const headlight = car.headlight;

    return {
        group,
        collider,
        platforms,
        doorLeft: car.doorLeft,
        doorRight: car.doorRight,
        interactionMesh,
        carGroup: car.group,
        localGroup: local,
        baseY,
        headlight,
        update(dt) {
            idleTime += dt;
            // Gentle idle bob
            car.group.position.y = Math.sin(idleTime * 0.8) * 0.03;
            // Headlight flicker
            if (headlight) {
                headlight.intensity = 1.8 + Math.sin(idleTime * 3.7) * 0.3;
            }
        },
    };
}


// =====================================================================
//  SUB-BUILDERS
// =====================================================================

function buildTracks(baseY) {
    const g = new THREE.Group();
    g.name = 'tracks';

    const railMat = createPS1Material({
        color: new THREE.Color(RAIL_COLOR),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    const sleeperMat = createPS1Material({
        color: new THREE.Color(SLEEPER_COLOR),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    // Two rails
    for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(
            new THREE.BoxGeometry(TRACK_LEN, 0.15, 0.2),
            railMat,
        );
        rail.position.set(0, baseY + 0.08, side * RAIL_GAUGE / 2);
        g.add(rail);
    }

    // Sleepers (ties)
    const sleeperGeo = new THREE.BoxGeometry(0.3, 0.12, RAIL_GAUGE + 0.6);
    for (let i = 0; i < SLEEPER_COUNT; i++) {
        const sx = -TRACK_LEN / 2 + i * SLEEPER_SPACE + SLEEPER_SPACE / 2;
        const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
        sleeper.position.set(sx, baseY + 0.02, 0);
        g.add(sleeper);
    }

    // Gravel bed under tracks
    const bedMat = createPS1Material({
        color: new THREE.Color(0x6e5e4e),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    const bed = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_LEN, 0.25, RAIL_GAUGE + 1.4),
        bedMat,
    );
    bed.position.set(0, baseY - 0.12, 0);
    g.add(bed);

    return g;
}

function buildPlatform(baseY) {
    const g = new THREE.Group();
    g.name = 'platform';

    const platMat = createPS1Material({
        color: new THREE.Color(PLATFORM_COLOR),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    // Main platform slab (on the +z side of the track, i.e. the right side)
    const slab = new THREE.Mesh(
        new THREE.BoxGeometry(CAR_LENGTH + 4, 0.8, 3),
        platMat,
    );
    slab.position.set(0, baseY + 0.4, RAIL_GAUGE / 2 + 2.5);
    g.add(slab);

    // Yellow safety line along edge
    const safetyLine = new THREE.Mesh(
        new THREE.BoxGeometry(CAR_LENGTH + 4, 0.05, 0.3),
        new THREE.MeshBasicMaterial({ color: TRIM_COLOR, fog: false }),
    );
    safetyLine.position.set(0, baseY + 0.82, RAIL_GAUGE / 2 + 1.1);
    g.add(safetyLine);

    // Small bench on platform
    const benchMat = createPS1Material({
        color: new THREE.Color(0x556655),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    const benchSeat = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.3, 0.8),
        benchMat,
    );
    benchSeat.position.set(4, baseY + 1.5, RAIL_GAUGE / 2 + 3.2);
    g.add(benchSeat);

    // Bench legs
    for (const dx of [-1.2, 1.2]) {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.7, 0.2),
            benchMat,
        );
        leg.position.set(4 + dx, baseY + 1.15, RAIL_GAUGE / 2 + 3.2);
        g.add(leg);
    }

    return g;
}

function buildTrainCar(baseY) {
    const g = new THREE.Group();
    g.name = 'train-car';

    const bodyY = baseY + 1.5;  // raise car above tracks

    // ── Main body ───────────────────────────────────────────────────────
    const bodyMat = createPS1Material({
        color: new THREE.Color(BODY_COLOR),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(CAR_LENGTH, CAR_HEIGHT, CAR_WIDTH),
        bodyMat,
    );
    body.position.set(0, bodyY + CAR_HEIGHT / 2, 0);
    g.add(body);

    // ── Roof (slightly wider, rounded-ish via beveled box) ──────────────
    const roofMat = createPS1Material({
        color: new THREE.Color(0x2a3e59),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(CAR_LENGTH - 0.2, ROOF_HEIGHT, CAR_WIDTH + 0.4),
        roofMat,
    );
    roof.position.set(0, bodyY + CAR_HEIGHT + ROOF_HEIGHT / 2, 0);
    g.add(roof);

    // ── Gold trim strips ────────────────────────────────────────────────
    const trimMat = new THREE.MeshBasicMaterial({ color: TRIM_COLOR, fog: false });
    for (const side of [-1, 1]) {
        // Bottom trim
        const bottomTrim = new THREE.Mesh(
            new THREE.BoxGeometry(CAR_LENGTH + 0.1, 0.15, 0.1),
            trimMat,
        );
        bottomTrim.position.set(0, bodyY + 0.08, side * (CAR_WIDTH / 2 + 0.05));
        g.add(bottomTrim);

        // Top trim (below roof)
        const topTrim = new THREE.Mesh(
            new THREE.BoxGeometry(CAR_LENGTH + 0.1, 0.15, 0.1),
            trimMat,
        );
        topTrim.position.set(0, bodyY + CAR_HEIGHT - 0.08, side * (CAR_WIDTH / 2 + 0.05));
        g.add(topTrim);
    }

    // ── Windows (holes punched with transparent planes) ─────────────────
    const windowMat = new THREE.MeshBasicMaterial({
        color: INTERIOR_COLOR,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
    });
    const windowGlowMat = new THREE.MeshBasicMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
    });

    const winCount = 6;
    const winW = 1.2;
    const winH = 1.5;
    const winSpacing = CAR_LENGTH / (winCount + 1);

    for (const side of [-1, 1]) {
        for (let i = 0; i < winCount; i++) {
            // Skip window at door position (center)
            const wx = -CAR_LENGTH / 2 + (i + 1) * winSpacing;
            if (Math.abs(wx) < 1.5) continue;

            const win = new THREE.Mesh(
                new THREE.PlaneGeometry(winW, winH),
                windowMat,
            );
            win.position.set(wx, bodyY + CAR_HEIGHT * 0.6, side * (CAR_WIDTH / 2 + 0.06));
            win.rotation.y = side > 0 ? 0 : Math.PI;
            g.add(win);

            // Inner glow plane
            const glow = new THREE.Mesh(
                new THREE.PlaneGeometry(winW - 0.1, winH - 0.1),
                windowGlowMat,
            );
            glow.position.copy(win.position);
            glow.position.z -= side * 0.02;
            glow.rotation.y = win.rotation.y;
            g.add(glow);
        }
    }

    // ── Doors (animated — these slide shut during cutscene) ─────────────
    const doorMat = createPS1Material({
        color: new THREE.Color(DOOR_COLOR),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    const doorW = 1.3;
    const doorH = CAR_HEIGHT - 0.5;
    const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.15);

    // Platform side doors (+z side) — these are the ones Josh enters
    const doorLeft = new THREE.Mesh(doorGeo, doorMat);
    doorLeft.position.set(-doorW / 2 - 0.05, bodyY + doorH / 2 + 0.25, CAR_WIDTH / 2 + 0.08);
    doorLeft.userData.closedX = 0;
    doorLeft.userData.openX = -doorW / 2 - 0.05;
    g.add(doorLeft);

    const doorRight = new THREE.Mesh(doorGeo, doorMat);
    doorRight.position.set(doorW / 2 + 0.05, bodyY + doorH / 2 + 0.25, CAR_WIDTH / 2 + 0.08);
    doorRight.userData.closedX = 0;
    doorRight.userData.openX = doorW / 2 + 0.05;
    g.add(doorRight);

    // ── Front face / headlight ──────────────────────────────────────────
    const frontMat = createPS1Material({
        color: new THREE.Color(0x2a3e59),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    const frontFace = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, CAR_HEIGHT + ROOF_HEIGHT, CAR_WIDTH),
        frontMat,
    );
    frontFace.position.set(-CAR_LENGTH / 2 - 0.15, bodyY + (CAR_HEIGHT + ROOF_HEIGHT) / 2, 0);
    g.add(frontFace);

    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffdf2, fog: false });
    const headlight = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 6),
        headlightMat,
    );
    headlight.position.set(-CAR_LENGTH / 2 - 0.32, bodyY + CAR_HEIGHT * 0.7, 0);
    headlight.rotation.y = Math.PI / 2;
    g.add(headlight);

    const headlightGlow = new THREE.PointLight(0xfffdf2, 1.8, 20, 1.5);
    headlightGlow.position.copy(headlight.position);
    headlightGlow.position.x -= 0.5;
    g.add(headlightGlow);

    // ── Rear face ───────────────────────────────────────────────────────
    const rearFace = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, CAR_HEIGHT + ROOF_HEIGHT, CAR_WIDTH),
        frontMat,
    );
    rearFace.position.set(CAR_LENGTH / 2 + 0.15, bodyY + (CAR_HEIGHT + ROOF_HEIGHT) / 2, 0);
    g.add(rearFace);

    // Rear lights
    for (const dz of [-1, 1]) {
        const rearLight = new THREE.Mesh(
            new THREE.CircleGeometry(0.25, 4),
            new THREE.MeshBasicMaterial({ color: 0xff2222, fog: false }),
        );
        rearLight.position.set(CAR_LENGTH / 2 + 0.32, bodyY + CAR_HEIGHT * 0.7, dz * 1.2);
        rearLight.rotation.y = -Math.PI / 2;
        g.add(rearLight);
    }

    return { group: g, doorLeft, doorRight, headlight: headlightGlow };
}

function buildWheels(baseY) {
    const g = new THREE.Group();
    const wheelMat = createPS1Material({
        color: new THREE.Color(WHEEL_COLOR),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.3, 6);
    wheelGeo.rotateX(Math.PI / 2);

    // 4 wheel pairs (2 per side, front and back bogies)
    const wheelPositions = [
        [-CAR_LENGTH / 2 + 2, -1],
        [-CAR_LENGTH / 2 + 2,  1],
        [ CAR_LENGTH / 2 - 2, -1],
        [ CAR_LENGTH / 2 - 2,  1],
        [-CAR_LENGTH / 2 + 4, -1],
        [-CAR_LENGTH / 2 + 4,  1],
        [ CAR_LENGTH / 2 - 4, -1],
        [ CAR_LENGTH / 2 - 4,  1],
    ];

    for (const [wx, side] of wheelPositions) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(wx, baseY + WHEEL_R + 0.1, side * RAIL_GAUGE / 2);
        g.add(wheel);
    }

    return g;
}

function buildNumberLineMarkings(baseY) {
    const g = new THREE.Group();
    g.name = 'number-markings';

    const bodyY = baseY + 1.5;
    const markY = bodyY + CAR_HEIGHT * 0.25;
    const markZ = -(CAR_WIDTH / 2 + 0.07);  // far side of train

    // Create tick marks + number sprites along the car
    for (let i = 0; i < NUMBER_TICKS.length; i++) {
        const num = NUMBER_TICKS[i];
        const t = i / (NUMBER_TICKS.length - 1);
        const mx = -CAR_LENGTH / 2 + 1 + t * (CAR_LENGTH - 2);

        // Tick mark
        const tick = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.6, 0.05),
            new THREE.MeshBasicMaterial({ color: TRIM_COLOR, fog: false }),
        );
        tick.position.set(mx, markY, markZ);
        g.add(tick);

        // Number labels removed
    }

    // Horizontal number line along the car
    const lineStrip = new THREE.Mesh(
        new THREE.BoxGeometry(CAR_LENGTH - 2, 0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: TRIM_COLOR, fog: false }),
    );
    lineStrip.position.set(0, markY, markZ);
    g.add(lineStrip);

    // Arrow heads at each end of the number line
    for (const dir of [-1, 1]) {
        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.5, 3),
            new THREE.MeshBasicMaterial({ color: TRIM_COLOR, fog: false }),
        );
        arrow.rotation.z = dir * Math.PI / 2;
        arrow.position.set(dir * (CAR_LENGTH / 2 - 0.7), markY, markZ);
        g.add(arrow);
    }

    // Also add markings on the +z (platform) side
    const markZPlat = CAR_WIDTH / 2 + 0.07;
    for (let i = 0; i < NUMBER_TICKS.length; i++) {
        const num = NUMBER_TICKS[i];
        const t = i / (NUMBER_TICKS.length - 1);
        const mx = -CAR_LENGTH / 2 + 1 + t * (CAR_LENGTH - 2);

        const tick = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.6, 0.05),
            new THREE.MeshBasicMaterial({ color: TRIM_COLOR, fog: false }),
        );
        tick.position.set(mx, markY, markZPlat);
        g.add(tick);

        // Number labels removed
    }

    const lineStrip2 = new THREE.Mesh(
        new THREE.BoxGeometry(CAR_LENGTH - 2, 0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: TRIM_COLOR, fog: false }),
    );
    lineStrip2.position.set(0, markY, markZPlat);
    g.add(lineStrip2);

    for (const dir of [-1, 1]) {
        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.5, 3),
            new THREE.MeshBasicMaterial({ color: TRIM_COLOR, fog: false }),
        );
        arrow.rotation.z = dir * Math.PI / 2;
        arrow.position.set(dir * (CAR_LENGTH / 2 - 0.7), markY, markZPlat);
        g.add(arrow);
    }

    return g;
}

function buildStationSign(baseY) {
    const g = new THREE.Group();
    g.name = 'station-sign';

    const signY = baseY + 6;
    const signZ = RAIL_GAUGE / 2 + 3.5;

    // Sign post
    const postMat = createPS1Material({
        color: new THREE.Color(0x444444),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 5, 0.3),
        postMat,
    );
    post.position.set(0, baseY + 2.5, signZ);
    g.add(post);

    // Sign panel
    const panelGeo = new THREE.BoxGeometry(7, 2, 0.3);
    const panelMat = createPS1Material({
        color: new THREE.Color(SIGN_BG_COLOR),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, signY, signZ);
    g.add(panel);

    // Gold border around sign
    const borderMat = new THREE.MeshBasicMaterial({ color: TRIM_COLOR, fog: false });
    // Top
    g.add(makeBorder(7.2, 0.12, 0.35, 0, signY + 1.06, signZ, borderMat));
    // Bottom
    g.add(makeBorder(7.2, 0.12, 0.35, 0, signY - 1.06, signZ, borderMat));
    // Left
    g.add(makeBorder(0.12, 2.24, 0.35, -3.54, signY, signZ, borderMat));
    // Right
    g.add(makeBorder(0.12, 2.24, 0.35, 3.54, signY, signZ, borderMat));

    // Text sprite — "THE NUMBER LINE"
    const titleSprite = makeTextSprite('THE NUMBER LINE', {
        fontSize: 48,
        fontFamily: 'monospace',
        color: '#F5CC45',
        bgColor: 'transparent',
    });
    titleSprite.position.set(0, signY + 0.2, signZ + 0.2);
    titleSprite.scale.set(6, 1.5, 1);
    g.add(titleSprite);

    // Subtitle — "→ NUMBER CAVERNS"
    const subSprite = makeTextSprite('→ NUMBER CAVERNS', {
        fontSize: 28,
        fontFamily: 'monospace',
        color: '#FFAA44',
        bgColor: 'transparent',
    });
    subSprite.position.set(0, signY - 0.5, signZ + 0.2);
    subSprite.scale.set(5, 1, 1);
    g.add(subSprite);

    return g;
}

function makeBorder(w, h, d, x, y, z, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    return mesh;
}


// =====================================================================
//  CUTSCENE CONTROLLER
// =====================================================================

/**
 * NumberLineCutscene — manages the door-close → acceleration → transition
 * sequence when Josh boards the train.
 *
 * @param {object} opts
 * @param {THREE.Group} opts.carGroup       The train car group (to translate)
 * @param {THREE.Group} opts.localGroup     The whole local assembly
 * @param {THREE.Mesh}  opts.doorLeft       Left sliding door
 * @param {THREE.Mesh}  opts.doorRight      Right sliding door
 * @param {object}      opts.josh           Josh character
 * @param {object}      opts.cameraCtrl     Camera controller
 * @param {THREE.Camera} opts.camera        The scene camera
 * @param {object}      opts.postProcess    PostProcessing instance
 * @param {Function}    opts.onComplete     Called when cutscene ends
 */
export class NumberLineCutscene {
    constructor(opts) {
        this._car         = opts.carGroup;
        this._local       = opts.localGroup;
        this._doorL       = opts.doorLeft;
        this._doorR       = opts.doorRight;
        this._josh        = opts.josh;
        this._cameraCtrl  = opts.cameraCtrl;
        this._camera      = opts.camera;
        this._postProcess = opts.postProcess;
        this._onComplete  = opts.onComplete;
        this._baseY       = opts.baseY || 0;

        this._running  = false;
        this._elapsed  = 0;
        this._phase    = 'idle';  // idle → doors_closing → accelerating → done

        // Store door open positions
        this._doorLOpenX = this._doorL.position.x;
        this._doorROpenX = this._doorR.position.x;

        // Camera override state
        this._savedCamPos = null;
        this._camOverride = false;

        // Motion blur accumulator (faked with post-process)
        this._speed = 0;

        // Overlay element for screen wipe
        this._overlay = null;
    }

    get isRunning() { return this._running; }

    start() {
        if (this._running) return;
        this._running = true;
        this._elapsed = 0;
        this._phase = 'doors_closing';
        this._speed = 0;

        // Teleport Josh inside the train (hide him visually)
        this._josh.model.visible = false;

        // Save camera state
        this._savedCamPos = this._cameraCtrl.currentPosition.clone();

        // Create overlay for final wipe
        this._overlay = document.createElement('div');
        this._overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999;
            background: black; opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(this._overlay);
    }

    /**
     * Update the cutscene each frame. Returns true while active.
     * @param {number} dt
     * @returns {boolean}
     */
    update(dt) {
        if (!this._running) return false;

        this._elapsed += dt;
        const t = this._elapsed;

        // ── Phase 1: Doors closing (0 → DOOR_CLOSE_TIME) ───────────────
        if (t < DOOR_CLOSE_TIME) {
            const doorT = smoothstep(t / DOOR_CLOSE_TIME);
            // Slide doors toward center (x → 0)
            this._doorL.position.x = lerp(this._doorLOpenX, 0, doorT);
            this._doorR.position.x = lerp(this._doorROpenX, 0, doorT);
            return true;
        }

        // ── Phase 2: Camera settle (DOOR_CLOSE_TIME → +CAMERA_SETTLE) ──
        const phase2Start = DOOR_CLOSE_TIME;
        if (t < phase2Start + CAMERA_SETTLE) {
            this._phase = 'camera_settle';
            // Move camera to dramatic side view
            const settleT = (t - phase2Start) / CAMERA_SETTLE;
            this._setCutsceneCamera(settleT);
            return true;
        }

        // ── Phase 3: Acceleration (train rockets away) ──────────────────
        const phase3Start = phase2Start + CAMERA_SETTLE;
        if (t < phase3Start + ACCEL_DURATION) {
            this._phase = 'accelerating';
            const accelT = (t - phase3Start) / ACCEL_DURATION;

            // Exponential acceleration — starts slow, gets absurdly fast
            this._speed = 5 + 200 * Math.pow(accelT, 2.5);
            this._car.position.x -= this._speed * dt;

            // Camera tracks the train, getting left behind
            const trainWorldPos = new THREE.Vector3();
            this._car.getWorldPosition(trainWorldPos);

            // Camera stays fixed, watching train vanish → dramatic
            this._setCutsceneCamera(1.0);

            // Screen shake increases with speed
            if (this._postProcess) {
                const shakeIntensity = Math.min(0.02, accelT * 0.02);
                // We can't directly shake, but we can trigger a subtle flash
                if (accelT > 0.7) {
                    this._postProcess.setDithering(false);
                }
            }

            // Fade to black in final 30%
            if (accelT > 0.7 && this._overlay) {
                this._overlay.style.opacity = String((accelT - 0.7) / 0.3);
            }

            return true;
        }

        // ── Phase 4: Complete ───────────────────────────────────────────
        this._phase = 'done';
        this._running = false;

        // Clean up
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }

        // Reset train position for when player returns
        this._car.position.x = 0;
        this._doorL.position.x = this._doorLOpenX;
        this._doorR.position.x = this._doorROpenX;

        // Show Josh again
        this._josh.model.visible = true;

        // Restore post-processing
        if (this._postProcess) {
            this._postProcess.setDithering(true);
        }

        // Fire completion callback (triggers zone transition)
        if (this._onComplete) this._onComplete();

        return false;
    }

    /** @private Position camera for the cutscene side view */
    _setCutsceneCamera(t) {
        // Calculate a cinematic side view of the train
        const trainWorldPos = new THREE.Vector3();
        this._local.getWorldPosition(trainWorldPos);

        // Camera positioned to the side and slightly above, looking at the train
        const camTarget = new THREE.Vector3(
            trainWorldPos.x,
            trainWorldPos.y + this._baseY + 5,
            trainWorldPos.z + 12,
        );

        const lerpFactor = Math.min(1, t);
        this._cameraCtrl.currentPosition.lerp(camTarget, lerpFactor * 0.1);

        // Look at the train car
        const lookTarget = new THREE.Vector3();
        this._car.getWorldPosition(lookTarget);
        lookTarget.y += 3;
        this._camera.lookAt(lookTarget);
    }
}


// =====================================================================
//  SPRITE HELPERS
// =====================================================================

function makeNumberSprite(num) {
    return makeTextSprite(String(num), {
        fontSize: 64,
        fontFamily: 'monospace',
        color: '#F5CC45',
        bgColor: 'transparent',
        bold: true,
    });
}

function makeTextSprite(text, opts = {}) {
    const {
        fontSize = 48,
        fontFamily = 'monospace',
        color = '#ffffff',
        bgColor = 'transparent',
        bold = false,
    } = opts;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;

    const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        fog: false,
    });

    return new THREE.Sprite(mat);
}


// =====================================================================
//  MATH HELPERS
// =====================================================================

function smoothstep(t) {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}
