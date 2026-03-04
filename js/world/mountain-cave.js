/**
 * mountain-cave.js — A deep cave system carved into the NW mountain.
 *
 * Josh discovers a rocky canyon cutting through the mountains northwest
 * of the hub. The path narrows into a cave mouth framed by ancient stone.
 * Inside, a winding tunnel descends through amber-lit passages, past
 * dripping stalactites and glowing crystals, deeper and deeper underground.
 * At the very bottom, a vast darkness pulls Josh into the Number Caverns.
 *
 * The cave is NOT a portal arch. It's a place you explore.
 * You walk into the mountain. The light fades. The air changes.
 * Then you're underground.
 *
 * Shell Bingby once spelunked through the Carlsbad Caverns in dress shoes.
 * He said the formations reminded him of prime factorization trees.
 */

import * as THREE from 'three';
import { getTerrainHeight } from './noise.js';
import { createPS1Material } from './ps1-material.js';

// =====================================================================
//  CAVE CONFIGURATION
// =====================================================================

/** Where the cave entrance sits in the NW mountain. */
export const CAVE_ENTRANCE_X = -55;
export const CAVE_ENTRANCE_Z = -82;

/** The deep end of the cave — triggers transition to Number Caverns. */
export const CAVE_TRIGGER_X  = -58;
export const CAVE_TRIGGER_Z  = -118;
export const CAVE_TRIGGER_RADIUS = 5;

/** Where Josh appears when leaving Number Caverns back to the hub. */
export const CAVE_RETURN_POS = [-52, 0, -75];

// Internal layout
const CAVE_FLOOR_Y    = 1.0;     // floor height inside the canyon/cave
const TUNNEL_SEGMENTS = 8;       // number of tunnel segments
const TUNNEL_START_Z  = -82;
const TUNNEL_END_Z    = -120;
const TUNNEL_WIDTH    = 8;
const TUNNEL_HEIGHT   = 7;
const CAVE_WALL_COLOR = 0x2a2830;
const CAVE_CEIL_COLOR = 0x201e26;
const CAVE_FLOOR_COLOR = 0x15141c;

// =====================================================================
//  MAIN BUILDER
// =====================================================================

/**
 * Creates the mountain cave system — entrance, tunnel, deep chamber.
 * @returns {{ group: THREE.Group, colliders: Array }}
 */
export function createMountainCave() {
    const group = new THREE.Group();
    group.name = 'mountain-cave';

    const colliders = [];

    // ── Canyon approach (outdoor gorge leading to cave mouth) ────────
    const canyon = buildCanyon();
    group.add(canyon);

    // ── Cave entrance arch ──────────────────────────────────────────
    const entrance = buildCaveEntrance();
    group.add(entrance);

    // ── Tunnel passage (descending, enclosed) ───────────────────────
    const tunnel = buildTunnel();
    group.add(tunnel.group);
    colliders.push(...tunnel.colliders);

    // ── Deep chamber at the bottom ──────────────────────────────────
    const deepChamber = buildDeepChamber();
    group.add(deepChamber);

    // ── Lighting throughout the cave ────────────────────────────────
    const lights = buildCaveLighting();
    group.add(lights);

    // ── Ambient details (stalactites, crystals, drips) ──────────────
    const details = buildCaveDetails();
    group.add(details);

    return { group, colliders };
}


// =====================================================================
//  CANYON APPROACH — outdoor gorge through the mountain
// =====================================================================

function buildCanyon() {
    const group = new THREE.Group();
    group.name = 'cave-canyon';

    const rockMat = createPS1Material({
        color: new THREE.Color(0x5a5048),
        dither: true,
        fogNear: 60,
        fogFar: 200,
    });

    const darkRockMat = createPS1Material({
        color: new THREE.Color(0x2a2830),
        dither: true,
        fogNear: 40,
        fogFar: 150,
    });

    // We use Dodecahedrons for a craggy low-poly rock look instead of just boxes
    const canyonLength = 16;
    const baseHeight = 15;

    for (let i = 0; i < canyonLength; i++) {
        const t = i / canyonLength;
        const z = -68 - t * 15;
        const narrowing = 1 - t * 0.4;
        
        // Use an Icosahedron with low detail for pure geometric retro rocks
        const rockGeo = new THREE.IcosahedronGeometry(1, 0);

        // Left wall rocks
        for(let j=0; j<3; j++) {
            const leftRock = new THREE.Mesh(rockGeo, Math.random() > 0.5 ? rockMat : darkRockMat);
            const scaleX = 4 + Math.random() * 3;
            const scaleY = (baseHeight + Math.random() * 8) / 2;
            const scaleZ = 4 + Math.random() * 4;
            leftRock.scale.set(scaleX, scaleY, scaleZ);
            
            leftRock.position.set(
                CAVE_ENTRANCE_X - 6 * narrowing - 2 + Math.random() * 2,
                CAVE_FLOOR_Y + scaleY * 0.7 - (j * 2), // layer them
                z + (Math.random() - 0.5) * 3
            );
            leftRock.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(leftRock);
        }

        // Right wall rocks
        for(let j=0; j<3; j++) {
            const rightRock = new THREE.Mesh(rockGeo, Math.random() > 0.5 ? rockMat : darkRockMat);
            const scaleX = 4 + Math.random() * 3;
            const scaleY = (baseHeight + Math.random() * 8) / 2;
            const scaleZ = 4 + Math.random() * 4;
            rightRock.scale.set(scaleX, scaleY, scaleZ);
            
            rightRock.position.set(
                CAVE_ENTRANCE_X + 6 * narrowing + 2 + Math.random() * 2,
                CAVE_FLOOR_Y + scaleY * 0.7 - (j * 2),
                z + (Math.random() - 0.5) * 3
            );
            rightRock.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(rightRock);
        }
    }

    // Loose boulders along the canyon floor
    const boulderMat = createPS1Material({
        color: new THREE.Color(0x3a3842),
        dither: true,
        fogNear: 40,
        fogFar: 150,
    });

    for (let i = 0; i < 12; i++) {
        const boulder = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.8, 0),
            boulderMat
        );
        boulder.position.set(
            CAVE_ENTRANCE_X + (Math.random() - 0.5) * 6,
            CAVE_FLOOR_Y + 0.1,
            -68 - Math.random() * 12
        );
        boulder.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        group.add(boulder);
    }

    return group;
}


// =====================================================================
//  CAVE ENTRANCE — dramatic arch carved into rock
// =====================================================================

function buildCaveEntrance() {
    const group = new THREE.Group();
    group.name = 'cave-entrance';

    const cx = CAVE_ENTRANCE_X;
    const cz = CAVE_ENTRANCE_Z;

    const faceMat = createPS1Material({
        color: new THREE.Color(0x3a3842),
        dither: true,
        fogNear: 40,
        fogFar: 150,
    });

    const rockGeo = new THREE.DodecahedronGeometry(1, 0);

    // Left face
    const leftFace = new THREE.Mesh(rockGeo, faceMat);
    leftFace.scale.set(5, 12, 4);
    leftFace.position.set(cx - 6, CAVE_FLOOR_Y + 8, cz);
    leftFace.rotation.set(0.1, 0.5, -0.1);
    group.add(leftFace);

    // Right face
    const rightFace = new THREE.Mesh(rockGeo, faceMat);
    rightFace.scale.set(5, 12, 4);
    rightFace.position.set(cx + 6, CAVE_FLOOR_Y + 8, cz);
    rightFace.rotation.set(-0.2, -0.4, 0.1);
    group.add(rightFace);

    // Top cap (keystone arch effect)
    const topCap = new THREE.Mesh(rockGeo, faceMat);
    topCap.scale.set(12, 5, 5);
    topCap.position.set(cx, CAVE_FLOOR_Y + 16, cz);
    topCap.rotation.set(0.3, 0.1, 0.05);
    group.add(topCap);

    // Arch frame — darker stone framing the opening
    const archMat = new THREE.MeshBasicMaterial({ color: 0x2a1e14 });

    // Left pillar
    const leftPillar = new THREE.Mesh(rockGeo, archMat);
    leftPillar.scale.set(1.5, 6, 2);
    leftPillar.position.set(cx - 3.8, CAVE_FLOOR_Y + 5, cz + 0.5);
    leftPillar.rotation.set(0, 0, -0.1);
    group.add(leftPillar);

    // Right pillar
    const rightPillar = new THREE.Mesh(rockGeo, archMat);
    rightPillar.scale.set(1.5, 6, 2);
    rightPillar.position.set(cx + 3.8, CAVE_FLOOR_Y + 5, cz + 0.5);
    rightPillar.rotation.set(0, 0, 0.1);
    group.add(rightPillar);

    // Arch top beam
    const archBeam = new THREE.Mesh(rockGeo, archMat);
    archBeam.scale.set(4.5, 1.5, 2);
    archBeam.position.set(cx, CAVE_FLOOR_Y + 10.5, cz + 0.5);
    group.add(archBeam);

    // ── Dark void fill (the darkness inside the cave mouth) ─────────
    const voidMat = new THREE.MeshBasicMaterial({
        color: 0x050302,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
    });
    const voidPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(7.5, 11),
        voidMat
    );
    voidPlane.position.set(cx, CAVE_FLOOR_Y + 5.5, cz - 0.5);
    group.add(voidPlane);

    // ── Mysterious amber light leaking from inside ──────────────────
    const innerGlow = new THREE.PointLight(0xFFAA44, 2.5, 25, 1.5);
    innerGlow.position.set(cx, CAVE_FLOOR_Y + 4, cz - 3);
    group.add(innerGlow);

    // ── Sign carved into rock ───────────────────────────────────────
    const signSprite = createCaveSign();
    signSprite.position.set(cx, CAVE_FLOOR_Y + 12.0, cz + 2.5);
    group.add(signSprite);

    return group;
}
function buildTunnel() {
    const group = new THREE.Group();
    group.name = 'cave-tunnel';
    const colliders = [];

    const wallMat = createPS1Material({
        color: new THREE.Color(CAVE_WALL_COLOR),
        dither: true,
        fogNear: 10,
        fogFar: 50,
    });

    const ceilMat = createPS1Material({
        color: new THREE.Color(CAVE_CEIL_COLOR),
        dither: true,
        fogNear: 10,
        fogFar: 50,
    });

    const floorMat = createPS1Material({
        color: new THREE.Color(CAVE_FLOOR_COLOR),
        dither: true,
        fogNear: 10,
        fogFar: 50,
    });

    // The tunnel snakes from the entrance deeper into the mountain
    // Each segment is a box forming walls, ceiling, and floor
    const segLen = (TUNNEL_END_Z - TUNNEL_START_Z) / TUNNEL_SEGMENTS;

    for (let i = 0; i < TUNNEL_SEGMENTS; i++) {
        const t = i / TUNNEL_SEGMENTS;
        const z = TUNNEL_START_Z + i * segLen;
        const nextZ = z + segLen;
        const midZ = (z + nextZ) / 2;

        // Tunnel curves slightly west as it descends
        const xOff = CAVE_ENTRANCE_X + Math.sin(t * Math.PI * 0.8) * -4;

        // Width narrows then widens for the deep chamber
        const width = TUNNEL_WIDTH * (0.7 + 0.3 * Math.cos(t * Math.PI));
        const height = TUNNEL_HEIGHT * (0.8 + 0.2 * Math.cos(t * Math.PI * 0.5));

        // Floor descends gradually
        const floorY = CAVE_FLOOR_Y - t * 4;

        // ── Floor segment ───────────────────────────────────────
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(width + 2, 0.5, Math.abs(segLen) + 1),
            floorMat
        );
        floor.position.set(xOff, floorY - 0.25, midZ);
        group.add(floor);

        // ── Left wall ───────────────────────────────────────────
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(2, height + 2, Math.abs(segLen) + 1),
            wallMat
        );
        leftWall.position.set(xOff - width / 2 - 1, floorY + height / 2, midZ);
        group.add(leftWall);

        // ── Right wall ──────────────────────────────────────────
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(2, height + 2, Math.abs(segLen) + 1),
            wallMat
        );
        rightWall.position.set(xOff + width / 2 + 1, floorY + height / 2, midZ);
        group.add(rightWall);

        // ── Ceiling ─────────────────────────────────────────────
        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(width + 4, 1.5, Math.abs(segLen) + 1),
            ceilMat
        );
        ceiling.position.set(xOff, floorY + height + 0.75, midZ);
        group.add(ceiling);

        // Wall colliders (prevent Josh from walking through walls)
        colliders.push({
            type: 'box',
            minX: xOff - width / 2 - 2,
            maxX: xOff - width / 2,
            minZ: midZ - Math.abs(segLen) / 2 - 0.5,
            maxZ: midZ + Math.abs(segLen) / 2 + 0.5,
        });
        colliders.push({
            type: 'box',
            minX: xOff + width / 2,
            maxX: xOff + width / 2 + 2,
            minZ: midZ - Math.abs(segLen) / 2 - 0.5,
            maxZ: midZ + Math.abs(segLen) / 2 + 0.5,
        });
    }

    return { group, colliders };
}


// =====================================================================
//  DEEP CHAMBER — the final room before Number Caverns
// =====================================================================

function buildDeepChamber() {
    const group = new THREE.Group();
    group.name = 'deep-chamber';

    const cx = CAVE_TRIGGER_X;
    const cz = CAVE_TRIGGER_Z;
    const floorY = CAVE_FLOOR_Y - 4;  // deepest point

    // Wide cavern opening
    const chamberMat = createPS1Material({
        color: new THREE.Color(0x1a1008),
        dither: true,
        fogNear: 5,
        fogFar: 30,
    });

    // Dome ceiling
    const domeGeo = new THREE.SphereGeometry(12, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const dome = new THREE.Mesh(domeGeo, new THREE.MeshLambertMaterial({
        color: 0x0d0804,
        side: THREE.BackSide,
        flatShading: true,
    }));
    dome.position.set(cx, floorY + 2, cz);
    group.add(dome);

    // Floor
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(10, 12),
        new THREE.MeshLambertMaterial({
            color: 0x0a0604,
            flatShading: true,
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, floorY, cz);
    group.add(floor);

    // ── Glowing amber pool at the center (the descent into caverns) ─
    const poolGeo = new THREE.CircleGeometry(3, 16);
    const poolMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color(0xFFAA44) },
            uColor2: { value: new THREE.Color(0xFF6600) },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            varying vec2 vUv;
            void main() {
                vec2 c = vUv - 0.5;
                float d = length(c);
                float pulse = 0.5 + 0.5 * sin(uTime * 2.0 - d * 8.0);
                vec3 col = mix(uColor1, uColor2, pulse);
                float glow = 1.0 - smoothstep(0.0, 0.5, d);
                gl_FragColor = vec4(col * glow, 0.9 * glow);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx, floorY + 0.05, cz);
    pool.name = 'cavern-pool';
    group.add(pool);

    // Store uniform for animation
    group.userData.poolUniforms = poolMat.uniforms;

    // ── Amber light from the pool ───────────────────────────────────
    const poolLight = new THREE.PointLight(0xFFAA44, 3, 20, 1);
    poolLight.position.set(cx, floorY + 2, cz);
    group.add(poolLight);

    return group;
}


// =====================================================================
//  CAVE LIGHTING — torches and crystal glows
// =====================================================================

function buildCaveLighting() {
    const group = new THREE.Group();
    group.name = 'cave-lighting';

    // Torch positions along the tunnel
    const torchPositions = [
        { x: CAVE_ENTRANCE_X - 3, y: CAVE_FLOOR_Y + 3, z: -86 },
        { x: CAVE_ENTRANCE_X + 3, y: CAVE_FLOOR_Y + 3, z: -86 },
        { x: CAVE_ENTRANCE_X - 3, y: CAVE_FLOOR_Y + 2, z: -92 },
        { x: CAVE_ENTRANCE_X + 2, y: CAVE_FLOOR_Y + 2, z: -98 },
        { x: CAVE_ENTRANCE_X - 4, y: CAVE_FLOOR_Y + 1, z: -104 },
        { x: CAVE_ENTRANCE_X + 1, y: CAVE_FLOOR_Y + 0, z: -110 },
    ];

    const torchMat = new THREE.MeshBasicMaterial({ color: 0x4a3020 });
    const flameMat = new THREE.MeshBasicMaterial({
        color: 0xFFAA44,
        transparent: true,
        opacity: 0.8,
    });

    for (const pos of torchPositions) {
        // Torch bracket
        const bracket = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.8, 0.15),
            torchMat
        );
        bracket.position.set(pos.x, pos.y, pos.z);
        group.add(bracket);

        // Flame
        const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.15, 0.4, 4),
            flameMat
        );
        flame.position.set(pos.x, pos.y + 0.5, pos.z);
        group.add(flame);

        // Point light
        const light = new THREE.PointLight(0xFFAA44, 0.8, 12, 1.5);
        light.position.set(pos.x, pos.y + 0.6, pos.z);
        group.add(light);
    }

    // ── Glowing crystal deposits on walls ───────────────────────────
    const crystalColors = [0xFFDD44, 0xCC8800, 0xFF6600];
    const crystalPositions = [
        { x: CAVE_ENTRANCE_X - 5, y: CAVE_FLOOR_Y + 1, z: -88 },
        { x: CAVE_ENTRANCE_X + 4, y: CAVE_FLOOR_Y + 4, z: -95 },
        { x: CAVE_ENTRANCE_X - 6, y: CAVE_FLOOR_Y + 2, z: -102 },
        { x: CAVE_ENTRANCE_X + 3, y: CAVE_FLOOR_Y - 1, z: -108 },
        { x: CAVE_ENTRANCE_X - 4, y: CAVE_FLOOR_Y - 2, z: -114 },
    ];

    for (let i = 0; i < crystalPositions.length; i++) {
        const pos = crystalPositions[i];
        const color = crystalColors[i % crystalColors.length];

        // Crystal cluster
        for (let c = 0; c < 3; c++) {
            const crystal = new THREE.Mesh(
                new THREE.ConeGeometry(0.1 + Math.random() * 0.15, 0.5 + Math.random() * 0.6, 4),
                new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity: 0.6 + Math.random() * 0.3,
                })
            );
            crystal.position.set(
                pos.x + (Math.random() - 0.5) * 0.5,
                pos.y + Math.random() * 0.5,
                pos.z + (Math.random() - 0.5) * 0.5
            );
            crystal.rotation.z = (Math.random() - 0.5) * 0.8;
            group.add(crystal);
        }

        // Subtle glow
        const crystalLight = new THREE.PointLight(color, 0.4, 8, 2);
        crystalLight.position.set(pos.x, pos.y + 0.3, pos.z);
        group.add(crystalLight);
    }

    return group;
}


// =====================================================================
//  CAVE DETAILS — stalactites, stalagmites, dripping
// =====================================================================

function buildCaveDetails() {
    const group = new THREE.Group();
    group.name = 'cave-details';

    const stalMat = createPS1Material({
        color: new THREE.Color(0x3a3020),
        dither: true,
        fogNear: 5,
        fogFar: 30,
    });

    // Stalactites hanging from ceiling
    for (let i = 0; i < 20; i++) {
        const t = i / 20;
        const z = TUNNEL_START_Z + t * (TUNNEL_END_Z - TUNNEL_START_Z);
        const xOff = CAVE_ENTRANCE_X + Math.sin(t * Math.PI * 0.8) * -4;
        const floorY = CAVE_FLOOR_Y - t * 4;
        const height = TUNNEL_HEIGHT * (0.8 + 0.2 * Math.cos(t * Math.PI * 0.5));

        // Stalactite (hanging from ceiling)
        const stalactite = new THREE.Mesh(
            new THREE.ConeGeometry(0.1 + Math.random() * 0.2, 0.5 + Math.random() * 1.5, 4),
            stalMat
        );
        stalactite.position.set(
            xOff + (Math.random() - 0.5) * 4,
            floorY + height - 0.5,
            z + (Math.random() - 0.5) * 3
        );
        stalactite.rotation.z = Math.PI;  // point downward
        group.add(stalactite);

        // Stalagmite (rising from floor) — fewer of these
        if (i % 3 === 0) {
            const stalagmite = new THREE.Mesh(
                new THREE.ConeGeometry(0.15 + Math.random() * 0.2, 0.4 + Math.random() * 1.0, 4),
                stalMat
            );
            stalagmite.position.set(
                xOff + (Math.random() - 0.5) * 3,
                floorY + 0.3,
                z + (Math.random() - 0.5) * 2
            );
            group.add(stalagmite);
        }
    }

    return group;
}


// =====================================================================
//  HELPERS
// =====================================================================

function createCaveSign() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 64);

    // Weathered stone text
    ctx.fillStyle = '#8a7a5a';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE DEEP', 128, 24);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#6a5a3a';
    ctx.fillText('⚠ descend at your own risk', 128, 46);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;

    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.7 })
    );
    sprite.scale.set(6, 1.5, 1);
    return sprite;
}


// =====================================================================
//  CAVE FLOOR HEIGHT — used by noise.js to override terrain in the cave
// =====================================================================

/**
 * Returns the cave floor Y if the position is inside the cave passage,
 * or null if outside the cave.
 * @param {number} x
 * @param {number} z
 * @returns {number|null}
 */
export function getCaveFloorHeight(x, z) {
    // Canyon approach: from z=-70 to z=-82
    if (z >= TUNNEL_START_Z && z <= -68) {
        const dx = Math.abs(x - CAVE_ENTRANCE_X);
        if (dx < 5) {
            return CAVE_FLOOR_Y;
        }
    }

    // Tunnel: from z=-82 to z=-120
    if (z >= TUNNEL_END_Z && z < TUNNEL_START_Z) {
        const t = (z - TUNNEL_START_Z) / (TUNNEL_END_Z - TUNNEL_START_Z);
        const xCenter = CAVE_ENTRANCE_X + Math.sin(t * Math.PI * 0.8) * -4;
        const width = TUNNEL_WIDTH * (0.7 + 0.3 * Math.cos(t * Math.PI));
        const dx = Math.abs(x - xCenter);
        if (dx < width / 2 + 1) {
            // Descending floor
            return CAVE_FLOOR_Y - t * 4;
        }
    }

    return null;
}

/**
 * Check if a position is inside the cave trigger zone.
 * @param {{ x: number, z: number }} pos
 * @returns {boolean}
 */
export function isInsideCaveTrigger(pos) {
    const dx = pos.x - CAVE_TRIGGER_X;
    const dz = pos.z - CAVE_TRIGGER_Z;
    return dx * dx + dz * dz < CAVE_TRIGGER_RADIUS * CAVE_TRIGGER_RADIUS;
}
