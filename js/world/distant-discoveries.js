import * as THREE from 'three';
import { getTerrainHeight } from './noise.js';
import { createPS1Material } from './ps1-material.js';

// =====================================================================
//  DISTANT DISCOVERIES — five massive landmarks at the edge of the world
// =====================================================================

/** Helper: create a PS1 material with extended fog for distant visibility. */
function farMat(hex, fogFar = 1200) {
    return createPS1Material({
        color: new THREE.Color(hex),
        dither: true,
        fogColor: new THREE.Color(0x667788),
        fogNear: 200,
        fogFar,
    });
}

/** Place an invisible interaction target at a position. */
function interactionBox(w, h, d) {
    return new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshBasicMaterial({ visible: false }),
    );
}

// =====================================================================
//  PUBLIC API
// =====================================================================

export function createDistantDiscoveries() {
    const group = new THREE.Group();
    group.name = 'distant-discoveries';
    const colliders = [];
    const animated = [];

    const spire    = buildSpire();
    const colossus = buildColossus();
    const rift     = buildRift();
    const vessel   = buildVessel();
    const ring     = buildRing();

    for (const d of [spire, colossus, rift, vessel, ring]) {
        group.add(d.group);
        colliders.push(...d.colliders);
        if (d.update) animated.push(d);
    }

    return {
        group,
        colliders,
        update(dt) {
            for (const a of animated) a.update(dt);
        },
        // Expose interaction targets for zone-interactables
        spireTarget:    spire.interactionTarget,
        colossusTarget: colossus.interactionTarget,
        riftTarget:     rift.interactionTarget,
        vesselTarget:   vessel.interactionTarget,
        ringTarget:     ring.interactionTarget,
    };
}


// =====================================================================
//  1.  THE SPIRE — impossibly tall black needle, due north
// =====================================================================

function buildSpire() {
    const g = new THREE.Group();
    g.name = 'the-spire';

    const CX = 0, CZ = -450;
    const baseY = getTerrainHeight(CX, CZ);

    const mat     = farMat(0x1a1a2e, 1500);
    const matAlt  = farMat(0x12121e, 1500);

    // 6 stacked boxes tapering from 8 → 1 unit wide, 50 units each = 300 total
    const widths = [8, 6.5, 5, 3.5, 2, 1];
    const segH = 50;

    for (let i = 0; i < widths.length; i++) {
        const w = widths[i];
        const seg = new THREE.Mesh(
            new THREE.BoxGeometry(w, segH, w),
            i % 2 === 0 ? mat : matAlt,
        );
        seg.position.set(0, segH * i + segH / 2, 0);
        g.add(seg);
    }

    // Rubble fragments at the base
    const fragMat = farMat(0x222233, 1200);
    for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const d = 10 + (i * 7.3 % 15);
        const s = 1 + (i * 3.7 % 3);
        const frag = new THREE.Mesh(
            new THREE.BoxGeometry(s, s * 0.6, s),
            fragMat,
        );
        frag.position.set(Math.cos(a) * d, s * 0.3, Math.sin(a) * d);
        frag.rotation.y = i * 1.1;
        frag.rotation.z = (i % 3 - 1) * 0.15;
        g.add(frag);
    }

    g.position.set(CX, baseY, CZ);
    g.rotation.x = 0.035; // slight tilt

    // Interaction target at the base
    const target = interactionBox(14, 4, 14);
    target.position.set(0, 2, 0);
    g.add(target);

    return {
        group: g,
        colliders: [{ x: CX, z: CZ, radius: 6 }],
        interactionTarget: target,
    };
}


// =====================================================================
//  2.  THE COLOSSUS — massive humanoid figure lying face-down
// =====================================================================

function buildColossus() {
    const g = new THREE.Group();
    g.name = 'the-colossus';

    const CX = 420, CZ = -280;
    const baseY = getTerrainHeight(CX, CZ);

    const stone    = farMat(0x6a7a5a);
    const stoneDk  = farMat(0x4a5a3a);

    // Simplified humanoid — 8 large boxes
    const parts = [
        // Torso (belly/chest)
        { w: 35, h: 12, d: 22, x: 0,   y: 6,  z: 0,   mat: stone },
        // Pelvis / hips
        { w: 22, h: 10, d: 24, x: -22, y: 5,  z: 0,   mat: stoneDk },
        // Head (slightly raised)
        { w: 14, h: 12, d: 12, x: 27,  y: 9,  z: 0,   mat: stone,
          rx: -0.15 },
        // Left arm — reaching forward
        { w: 40, h: 8,  d: 9,  x: 32,  y: 4,  z: 16,  mat: stoneDk },
        // Left hand
        { w: 10, h: 4,  d: 7,  x: 55,  y: 2,  z: 16,  mat: stone },
        // Right arm — bent at side
        { w: 30, h: 8,  d: 9,  x: 5,   y: 4,  z: -16, mat: stoneDk },
        // Left leg
        { w: 45, h: 10, d: 11, x: -48, y: 5,  z: 10,  mat: stone },
        // Right leg (slightly bent outward)
        { w: 45, h: 10, d: 11, x: -46, y: 5,  z: -12, mat: stoneDk,
          ry: 0.08 },
    ];

    for (const p of parts) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(p.w, p.h, p.d),
            p.mat,
        );
        mesh.position.set(p.x, p.y, p.z);
        if (p.rx) mesh.rotation.x = p.rx;
        if (p.ry) mesh.rotation.y = p.ry;
        g.add(mesh);
    }

    // Moss patches on exposed surfaces
    const mossMat = farMat(0x3a5a2a, 1000);
    for (let i = 0; i < 8; i++) {
        const moss = new THREE.Mesh(
            new THREE.BoxGeometry(6 + i % 3 * 2, 0.3, 4 + i % 2 * 3),
            mossMat,
        );
        moss.position.set(
            -30 + i * 9,
            12 + (i % 3) * 0.5,
            -8 + (i % 5) * 4,
        );
        g.add(moss);
    }

    g.position.set(CX, baseY, CZ);
    g.rotation.y = -0.3; // angled slightly

    const target = interactionBox(20, 4, 20);
    target.position.set(27, 2, 0); // near the head
    g.add(target);

    return {
        group: g,
        colliders: [
            // Torso area
            { minX: CX - 35, maxX: CX + 40, minZ: CZ - 20, maxZ: CZ + 20 },
        ],
        interactionTarget: target,
    };
}


// =====================================================================
//  3.  THE RIFT — glowing crack in the earth, northwest
// =====================================================================

function buildRift() {
    const g = new THREE.Group();
    g.name = 'the-rift';

    const CX = -380, CZ = -200;
    const baseY = getTerrainHeight(CX, CZ);

    const wallMat  = farMat(0x2a1a1a, 1200);
    const edgeMat  = farMat(0x3a2a2a, 1200);
    const glowMat  = farMat(0xff4400, 1200);

    // The rift runs roughly N-S, 150 units long
    const RIFT_LEN = 150;
    const RIFT_WIDTH = 20;
    const RIFT_DEPTH = 60;
    const SEGMENTS = 8;

    for (let i = 0; i < SEGMENTS; i++) {
        const t = i / (SEGMENTS - 1);
        const segLen = RIFT_LEN / SEGMENTS;
        const z = -RIFT_LEN / 2 + segLen * i + segLen / 2;

        // Width narrows at ends
        const widthScale = 1 - Math.pow(t * 2 - 1, 4); // 0 at ends, 1 at center
        const w = RIFT_WIDTH * Math.max(0.3, widthScale);

        // Left wall (angled inward)
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(3, RIFT_DEPTH, segLen + 1),
            wallMat,
        );
        leftWall.position.set(-w / 2 - 1, -RIFT_DEPTH / 2 + 2, z);
        leftWall.rotation.z = 0.12;
        g.add(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(3, RIFT_DEPTH, segLen + 1),
            wallMat,
        );
        rightWall.position.set(w / 2 + 1, -RIFT_DEPTH / 2 + 2, z);
        rightWall.rotation.z = -0.12;
        g.add(rightWall);

        // Edge lips (ground level, flanking the crack)
        for (const side of [-1, 1]) {
            const lip = new THREE.Mesh(
                new THREE.BoxGeometry(5, 1.5, segLen + 1),
                edgeMat,
            );
            lip.position.set(side * (w / 2 + 4), 0.5, z);
            g.add(lip);
        }

        // Bottom glow strip
        if (widthScale > 0.4) {
            const glowStrip = new THREE.Mesh(
                new THREE.BoxGeometry(w * 0.4, 0.5, segLen),
                glowMat,
            );
            glowStrip.position.set(0, -RIFT_DEPTH + 2, z);
            g.add(glowStrip);
        }
    }

    // Glow lights inside the rift
    const lights = [];
    for (let i = 0; i < 4; i++) {
        const light = new THREE.PointLight(0xff5500, 3.0, 80, 1.5);
        light.position.set(
            0,
            -RIFT_DEPTH + 8,
            -RIFT_LEN / 2 + (i + 0.5) * (RIFT_LEN / 4),
        );
        g.add(light);
        lights.push(light);
    }

    // Scattered debris around the edges
    const debrisMat = farMat(0x3a2a1a, 1000);
    for (let i = 0; i < 16; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const s = 1 + (i * 2.3 % 3);
        const debris = new THREE.Mesh(
            new THREE.BoxGeometry(s, s * 0.5, s),
            debrisMat,
        );
        debris.position.set(
            side * (RIFT_WIDTH / 2 + 6 + (i * 4.7 % 10)),
            s * 0.25,
            -RIFT_LEN / 2 + (i * 11.3 % RIFT_LEN),
        );
        debris.rotation.y = i * 0.8;
        g.add(debris);
    }

    g.position.set(CX, baseY, CZ);

    const target = interactionBox(16, 4, 16);
    target.position.set(RIFT_WIDTH / 2 + 8, 2, 0);
    g.add(target);

    let _time = 0;

    return {
        group: g,
        colliders: [
            // Prevent walking into the rift
            { minX: CX - RIFT_WIDTH / 2, maxX: CX + RIFT_WIDTH / 2,
              minZ: CZ - RIFT_LEN / 2, maxZ: CZ + RIFT_LEN / 2 },
        ],
        interactionTarget: target,
        update(dt) {
            _time += dt;
            for (let i = 0; i < lights.length; i++) {
                // Slow pulsing glow, each light slightly offset
                lights[i].intensity = 2.0 + Math.sin(_time * 1.2 + i * 1.5) * 1.5;
            }
        },
    };
}


// =====================================================================
//  4.  THE VESSEL — half-buried hull shape, southeast
// =====================================================================

function buildVessel() {
    const g = new THREE.Group();
    g.name = 'the-vessel';

    const CX = 380, CZ = 350;
    const baseY = getTerrainHeight(CX, CZ);

    const hullMat  = farMat(0x6a3a2a);
    const hullDk   = farMat(0x4a2a1a);
    const deckMat  = farMat(0x5a4a3a);

    const HULL_LEN = 100;
    const HULL_H   = 35;
    const HULL_W   = 28;
    const SEGMENTS = 6;

    for (let i = 0; i < SEGMENTS; i++) {
        const t = i / (SEGMENTS - 1);
        const segLen = HULL_LEN / SEGMENTS;
        const z = -HULL_LEN / 2 + segLen * i + segLen / 2;

        // Hull tapers at bow and stern
        const taper = 1 - Math.pow(t * 2 - 1, 2) * 0.6;
        const w = HULL_W * taper;
        const h = HULL_H * taper;

        // Break in the middle (segment 2-3 gap)
        if (i === 3) continue;
        const xOff = i > 3 ? 3 : 0; // stern section shifted slightly

        // Left hull plate
        const left = new THREE.Mesh(
            new THREE.BoxGeometry(3, h, segLen + 0.5),
            i % 2 === 0 ? hullMat : hullDk,
        );
        left.position.set(-w / 2 + xOff, h / 2 - 8, z);
        left.rotation.z = 0.2;
        g.add(left);

        // Right hull plate
        const right = new THREE.Mesh(
            new THREE.BoxGeometry(3, h, segLen + 0.5),
            i % 2 === 0 ? hullMat : hullDk,
        );
        right.position.set(w / 2 + xOff, h / 2 - 8, z);
        right.rotation.z = -0.2;
        g.add(right);

        // Keel (bottom V)
        const keel = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.3, 3, segLen + 0.5),
            hullDk,
        );
        keel.position.set(xOff, -6, z);
        g.add(keel);

        // Cross beams (deck ribs)
        if (i !== 0 && i !== SEGMENTS - 1) {
            const beam = new THREE.Mesh(
                new THREE.BoxGeometry(w * 0.8, 2, 2),
                deckMat,
            );
            beam.position.set(xOff, h - 10, z);
            g.add(beam);
        }
    }

    // Debris in the break gap
    const debrisMat = farMat(0x4a3a2a, 1000);
    for (let i = 0; i < 8; i++) {
        const s = 2 + (i * 2.1 % 4);
        const d = new THREE.Mesh(
            new THREE.BoxGeometry(s, s * 0.4, s),
            debrisMat,
        );
        d.position.set(
            -6 + (i * 3.3 % 12),
            s * 0.2 - 4,
            -2 + (i * 2.7 % 6),
        );
        d.rotation.set(i * 0.3, i * 0.7, i * 0.2);
        g.add(d);
    }

    g.position.set(CX, baseY - 8, CZ); // partially buried
    g.rotation.y = 0.4;

    const target = interactionBox(16, 4, 16);
    target.position.set(0, 10, 0);
    g.add(target);

    return {
        group: g,
        colliders: [
            { minX: CX - 18, maxX: CX + 18,
              minZ: CZ - HULL_LEN / 2, maxZ: CZ + HULL_LEN / 2 },
        ],
        interactionTarget: target,
    };
}


// =====================================================================
//  5.  THE RING — massive stone ring standing upright, southwest
// =====================================================================

function buildRing() {
    const g = new THREE.Group();
    g.name = 'the-ring';

    const CX = -350, CZ = 350;
    const baseY = getTerrainHeight(CX, CZ);

    const stoneMat = farMat(0x7a7a6a, 1200);
    const mossMat  = farMat(0x5a6a4a, 1000);

    const RING_RADIUS = 40;  // center of the ring tube
    const TUBE_SIZE = 5;     // cross-section half-width
    const SEGMENTS = 28;     // boxes around the circle

    for (let i = 0; i < SEGMENTS; i++) {
        const a = (i / SEGMENTS) * Math.PI * 2;
        const px = Math.cos(a) * RING_RADIUS;
        const py = Math.sin(a) * RING_RADIUS;

        // Determine material — moss on lower quarter
        const isMoss = a > Math.PI * 0.6 && a < Math.PI * 1.4;

        const seg = new THREE.Mesh(
            new THREE.BoxGeometry(TUBE_SIZE * 2, TUBE_SIZE * 2, RING_RADIUS * 0.25),
            isMoss ? mossMat : stoneMat,
        );
        seg.position.set(px, py, 0);
        seg.rotation.z = a;
        seg.lookAt(new THREE.Vector3(px + Math.cos(a), py + Math.sin(a), 0));
        // Rotate to face along the ring's tangent
        seg.rotation.z = a + Math.PI / 2;
        g.add(seg);
    }

    // Partially sunk into terrain — offset Y so bottom is below ground
    g.position.set(CX, baseY - RING_RADIUS * 0.15, CZ);
    g.rotation.y = 0.6;  // angled toward hub
    g.rotation.x = 0.09; // slight lean

    const target = interactionBox(16, 4, 16);
    target.position.set(0, RING_RADIUS * 0.15, RING_RADIUS + TUBE_SIZE + 4);
    g.add(target);

    return {
        group: g,
        colliders: [
            // Ring base footprint
            { x: CX, z: CZ, radius: TUBE_SIZE + 2 },
        ],
        interactionTarget: target,
    };
}
