import * as THREE from 'three';
import { getTerrainColorFactor, getTerrainHeight } from './noise.js';
import { createPS1Material } from './ps1-material.js';
import { PORTAL_DEFS } from './portal-config.js';
import { createClouds, createFlowers, createWindSystem } from './field-ambience.js';
import { createMountainCave, CAVE_ENTRANCE_X, CAVE_ENTRANCE_Z } from './mountain-cave.js';
import { createNumberLineTrain } from './number-line-train.js';
import {
    createFerrisWheel,
    createWindmill,
    createStream,
    createBridge,
    createParkourTower,
    createAqueductRun,
    createRuinsHop,
    createMoonstoneRing,
    createBushes,
    createLampposts,
    createPicnicArea,
    createTrees,
    createButterflies,
    createWallBanners,
    
} from './hub-assets.js';
import { createMonolith } from './monolith.js';
import { createDistantDiscoveries } from './distant-discoveries.js';
import { InfiniteParkour } from './infinite-parkour.js';

// =====================================================================
//  HUB CONSTANTS
// =====================================================================

const HUB_RX = 100;     // oval x-radius
const HUB_RZ = 80;      // oval z-radius
const WALL_HEIGHT = 9;
const WALL_SEGMENTS = 64;
const GATE_HALF_W = 9;  // half-width of the gate opening
const GATE_Z = 80;      // z position of the gate (south edge of oval)

const TERRAIN_W = 1200;
const TERRAIN_D = 1200;
const TERRAIN_SEG_X = 168;
const TERRAIN_SEG_Z = 168;
const TERRAIN_OFFSET_Z = 80; // shift terrain south to cover approach

// =====================================================================
//  MAIN FUNCTION
// =====================================================================

/**
 * Creates the massive hub world â€” oval walled compound with portals,
 * landmarks, paths, and varied terrain.
 */
export function createField() {
    const world = new THREE.Group();
    world.name = 'fieldWorld';
    world.userData.colliders = [];

    // â”€â”€ Terrain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const terrain = createTerrain();
    world.add(terrain);

    // â”€â”€ Perimeter wall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const walls = createPerimeterWall();
    world.add(walls.group);
    world.userData.colliders.push(...walls.colliders);

    // â”€â”€ Central pond â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const pondY = getTerrainHeight(0, 0) + 0.06;
    const pond = createPond();
    pond.position.set(0, pondY, 0);
    world.add(pond);

    // â”€â”€ Clock tower (north landmark) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const tower = createClockTower();
    world.add(tower.group);
    world.userData.colliders.push(tower.collider);

    // â”€â”€ Gazebo (east garden area) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const gazebo = createGazebo();
    world.add(gazebo.group);
    world.userData.colliders.push(gazebo.collider);

    // â”€â”€ Amphitheater (west area) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const amphitheater = createAmphitheater();
    world.add(amphitheater);

    // â”€â”€ Stone paths radiating from center â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const paths = createPaths();
    world.add(paths);

    // â”€â”€ Wall towers at cardinal points â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const wallTowers = createWallTowers();
    world.add(wallTowers);

    // â”€â”€ Obelisks along paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const obelisks = createObelisks();
    world.add(obelisks);

    // ── Number Line train ─────────────────────────────────────────
    const trainData = createNumberLineTrain();
    world.add(trainData.group);
    world.userData.colliders.push(trainData.collider);
    world.userData.trainData = trainData;

    // ── Platform surfaces (for Josh to stand on) ────────────────────
    world.userData.platforms = [];
    if (trainData.platforms) world.userData.platforms.push(...trainData.platforms);

    // ── Hub set pieces ──────────────────────────────────────────────
    const ferrisWheel = createFerrisWheel();
    world.add(ferrisWheel.group);
    world.userData.colliders.push(ferrisWheel.collider);

    const windmill = createWindmill();
    world.add(windmill.group);
    world.userData.colliders.push(windmill.collider);

    const stream = createStream();
    world.add(stream.group);

    const bridge = createBridge();
    world.add(bridge.group);
    world.userData.colliders.push(bridge.collider);

    const parkour = createParkourTower();
    world.add(parkour.group);
    world.userData.colliders.push(...parkour.colliders);
    if (parkour.platforms) world.userData.platforms.push(...parkour.platforms);

    const aqueduct = createAqueductRun();
    world.add(aqueduct.group);
    world.userData.colliders.push(...aqueduct.colliders);
    if (aqueduct.platforms) world.userData.platforms.push(...aqueduct.platforms);

    const ruins = createRuinsHop();
    world.add(ruins.group);
    world.userData.colliders.push(...ruins.colliders);
    if (ruins.platforms) world.userData.platforms.push(...ruins.platforms);

    const moonstone = createMoonstoneRing();
    world.add(moonstone.group);
    world.userData.colliders.push(...moonstone.colliders);
    if (moonstone.platforms) world.userData.platforms.push(...moonstone.platforms);

    const bushes = createBushes();
    world.add(bushes.group);
    world.userData.colliders.push(...bushes.colliders);

    const lampposts = createLampposts();
    world.add(lampposts.group);

    const picnic = createPicnicArea();
    world.add(picnic.group);

    const trees = createTrees();
    world.add(trees.group);
    world.userData.colliders.push(...trees.colliders);

    const butterflies = createButterflies();
    world.add(butterflies.group);

    const wallBanners = createWallBanners();
    world.add(wallBanners.group);

    
    
    

    // Distant secret landmark
    const distantSecret = createDistantSecret();
    world.add(distantSecret.group);
    world.userData.colliders.push(...distantSecret.colliders);

    // The Monolith — tall, humming, four-faced obelisk
    const monolith = createMonolith();
    world.add(monolith.mesh);
    world.userData.colliders.push(monolith.collider);

    // â”€â”€ Field evolution traces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    world.userData._appliedTraces = new Set();

    // â”€â”€ Zone beacons (portal arches) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const beacons = createZoneBeacons();
    for (const beacon of beacons) {
        beacon.visible = false;
        world.add(beacon);
    }
    world.userData.beacons = beacons;

    world.userData.revealPortals = function () {
        for (let i = 0; i < beacons.length; i++) {
            const def = PORTAL_DEFS[i];
            if (def && def.secret && !def.active) {
                beacons[i].visible = false;
                continue;
            }
            beacons[i].visible = true;
        }
    };

    world.userData.updatePortals = function (dt) {
        const t = performance.now() / 1000;
        for (const beacon of beacons) {
            beacon.traverse(child => {
                if (child.name === 'portalFill' && child.material) {
                    child.material.opacity = 0.10 + 0.10 * Math.sin(t * 2.0);
                }
            });
        }
    };

    // â”€â”€ Ambient life â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Mountain cave system (entrance to Number Caverns)
    const cave = createMountainCave();
    world.add(cave.group);
    world.userData.colliders.push(...cave.colliders);

    // Animate the deep chamber pool
    world.userData.updateCave = function () {
        const t = performance.now() / 1000;
        const deepChamber = cave.group.getObjectByName('deep-chamber');
        if (deepChamber && deepChamber.userData.poolUniforms) {
            deepChamber.userData.poolUniforms.uTime.value = t;
        }
    };
    const clouds = createClouds();
    world.add(clouds.group);

    const fieldFlowers = createFlowers();
    world.add(fieldFlowers.group);

    const terrainMesh = world.getObjectByName('terrain');
    const wind = createWindSystem(terrainMesh.geometry);

    world.userData.updateAmbience = function (dt) {
        clouds.update(dt);
        fieldFlowers.update(dt);
        wind.update(dt);
        if (pond.material.uniforms.uTime) {
            pond.material.uniforms.uTime.value += dt;
        }
        if (trainData) trainData.update(dt);
        // Hub set piece animations
        ferrisWheel.update(dt);
        windmill.update(dt);
        butterflies.update(dt);
        wallBanners.update(dt);
        monolith.update(dt, world);
        if (world.userData.updateCave) world.userData.updateCave();
    };

    world.userData.applyEvolution = function (evolutions) {
        if (!Array.isArray(evolutions)) return;
        for (const evo of evolutions) {
            const zone = typeof evo === 'string' ? evo : evo.zone;
            if (!zone || world.userData._appliedTraces.has(zone)) continue;
            world.userData._appliedTraces.add(zone);
            const trace = createZoneTrace(zone);
            if (trace) world.add(trace);
        }
    };

    // ── Giant Game Numbers (far outside the hub walls) ────────────────
    const gameFive = createGiantGameNumber('5', 0xCC4444);
    const fiveX = -190, fiveZ = 160;
    const fiveBaseY = getTerrainHeight(fiveX, fiveZ);
    gameFive.group.position.set(fiveX, fiveBaseY, fiveZ);
    gameFive.group.rotation.y = Math.PI * 0.25; // angled toward gate approach
    world.add(gameFive.group);
    world.userData.gameFiveMesh = gameFive.interactionTarget;
    world.userData.colliders.push({
        type: 'box',
        minX: fiveX - 25, maxX: fiveX + 25,
        minZ: fiveZ - 12, maxZ: fiveZ + 12,
    });

    const gameNine = createGiantGameNumber('9', 0x4488CC);
    const nineX = 190, nineZ = 160;
    const nineBaseY = getTerrainHeight(nineX, nineZ);
    gameNine.group.position.set(nineX, nineBaseY, nineZ);
    gameNine.group.rotation.y = -Math.PI * 0.25; // angled toward gate approach
    world.add(gameNine.group);
    world.userData.gameNineMesh = gameNine.interactionTarget;
    world.userData.colliders.push({
        type: 'box',
        minX: nineX - 25, maxX: nineX + 25,
        minZ: nineZ - 12, maxZ: nineZ + 12,
    });

    // ── Giant Mathematical Sphere (atop the parkour tower) ───────────────
    const giantSphere = createGiantSphere();
    world.add(giantSphere.group);
    // No collider — walking into the sphere triggers the inner_sphere portal.

    // ── Distant Discoveries (5 massive landmarks at world edge) ──────────
    const discoveries = createDistantDiscoveries();
    world.add(discoveries.group);
    world.userData.colliders.push(...discoveries.colliders);
    world.userData.discoveries = discoveries;

    // ── Infinite Parkour (procedurally generated vertical course) ────────
    const infParkour = new InfiniteParkour(world, world.userData.platforms);
    world.userData.infiniteParkour = infParkour;

    // Per-frame update for discoveries (pulsing rift lights, etc.)
    world.userData.updateDiscoveries = function (dt) {
        discoveries.update(dt);
    };

    // Per-frame update for infinite parkour (platform generation)
    world.userData.updateParkour = function (joshPosition) {
        infParkour.update(joshPosition);
    };

    return world;
}


// =====================================================================
//  TERRAIN
// =====================================================================

function createTerrain() {
    const geometry = new THREE.PlaneGeometry(
        TERRAIN_W, TERRAIN_D, TERRAIN_SEG_X, TERRAIN_SEG_Z
    );
    geometry.rotateX(-Math.PI / 2);

    // Offset south to cover approach corridor
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const z = position.getZ(i);
        position.setZ(i, z + TERRAIN_OFFSET_Z);
    }

    // Displace vertices with noise
    const colors = new Float32Array(position.count * 3);
    const grassDark  = new THREE.Color(0x71a94e);
    const grassLight = new THREE.Color(0xa1cf71);
    const rockDark   = new THREE.Color(0x74777e);
    const rockLight  = new THREE.Color(0xa4a7ae);
    const pathColor  = new THREE.Color(0xc8ab83);
    const blended    = new THREE.Color();

    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const y = getTerrainHeight(x, z);
        position.setY(i, y);

        const colorT = getTerrainColorFactor(x, z);
        // Choose palette based on region
        const ox = x / HUB_RX;
        const oz = z / HUB_RZ;
        const od = ox * ox + oz * oz - 1;

        if (od < 0) {
            // Inside hub: green grass
            blended.copy(grassDark).lerp(grassLight, colorT);
        } else if (z > 70 && Math.abs(x) < 40) {
            // Approach corridor: muted green
            blended.copy(grassDark).lerp(pathColor, colorT);
        } else {
            // Mountains: rocky tones
            blended.copy(rockDark).lerp(rockLight, colorT);
            // Snow caps on tall peaks
            if (y > 25) {
                const snowT = Math.min(1, (y - 25) / 15);
                blended.lerp(new THREE.Color(0xdde8ee), snowT * 0.7);
            }
        }

        colors[i * 3]     = blended.r;
        colors[i * 3 + 1] = blended.g;
        colors[i * 3 + 2] = blended.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // Apply path markings
    applyTerrainPaths(geometry);

    const material = createPS1Material({
        color: new THREE.Color(0x79b964),
        dither: true,
        snap: 320,
        fogColor: new THREE.Color(0xE8F4FF),
        fogNear: 100,
        fogFar: 400,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = false;
    mesh.name = 'terrain';
    return mesh;
}


// =====================================================================
//  PERIMETER WALL
// =====================================================================

function createPerimeterWall() {
    const group = new THREE.Group();
    group.name = 'perimeter-wall';
    const colliders = [];

    const wallMat = createPS1Material({
        color: new THREE.Color(0x8f846d),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    const wallTopMat = createPS1Material({
        color: new THREE.Color(0x998f79),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    for (let i = 0; i < WALL_SEGMENTS; i++) {
        const t0 = (i / WALL_SEGMENTS) * Math.PI * 2;
        const t1 = ((i + 1) / WALL_SEGMENTS) * Math.PI * 2;

        const x0 = Math.cos(t0) * HUB_RX;
        const z0 = Math.sin(t0) * HUB_RZ;
        const x1 = Math.cos(t1) * HUB_RX;
        const z1 = Math.sin(t1) * HUB_RZ;

        // Skip segments near the gate opening (south, around z = HUB_RZ)
        const midX = (x0 + x1) / 2;
        const midZ = (z0 + z1) / 2;
        if (midZ > GATE_Z - 5 && Math.abs(midX) < GATE_HALF_W + 3) continue;
        // Skip NW wall segment where the cave canyon opens into the hub
        if (midX < -50 && midX > -70 && midZ < -55 && midZ > -75) continue;

        const dx = x1 - x0;
        const dz = z1 - z0;
        const segLen = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(-dz, dx);

        const baseY = Math.min(
            getTerrainHeight(x0, z0),
            getTerrainHeight(x1, z1)
        ) - 1;

        // Main wall segment
        const wallGeo = new THREE.BoxGeometry(segLen + 0.5, WALL_HEIGHT, 2.5);
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(midX, baseY + WALL_HEIGHT / 2, midZ);
        wall.rotation.y = angle;
        group.add(wall);

        // Battlements (small boxes on top)
        const crenCount = Math.max(2, Math.floor(segLen / 2.5));
        for (let c = 0; c < crenCount; c++) {
            const ct = (c + 0.5) / crenCount;
            const cx = x0 + dx * ct;
            const cz = z0 + dz * ct;
            if (c % 2 === 0) {
                const crenGeo = new THREE.BoxGeometry(1.2, 1.5, 2.8);
                const cren = new THREE.Mesh(crenGeo, wallTopMat);
                cren.position.set(cx, baseY + WALL_HEIGHT + 0.75, cz);
                cren.rotation.y = angle;
                group.add(cren);
            }
        }

        // Collider box
        colliders.push({
            type: 'box',
            minX: Math.min(x0, x1) - 1.5,
            maxX: Math.max(x0, x1) + 1.5,
            minZ: Math.min(z0, z1) - 1.5,
            maxZ: Math.max(z0, z1) + 1.5,
        });
    }

    // â”€â”€ Gate pillars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const gatePillarMat = createPS1Material({
        color: new THREE.Color(0x6e63d9),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    for (const side of [-1, 1]) {
        const px = side * GATE_HALF_W;
        const pz = GATE_Z;
        const baseY = getTerrainHeight(px, pz) - 0.5;
        const pillarH = WALL_HEIGHT + 5;

        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, pillarH, 2.0),
            gatePillarMat
        );
        pillar.position.set(px, baseY + pillarH / 2, pz);
        group.add(pillar);

        // Cap
        const cap = new THREE.Mesh(
            new THREE.ConeGeometry(1.5, 2.5, 4),
            new THREE.MeshBasicMaterial({ color: 0xf5cc45, fog: false })
        );
        cap.position.set(px, baseY + pillarH + 1.25, pz);
        group.add(cap);
    }

    return { group, colliders };
}


// =====================================================================
//  CLOCK TOWER (north landmark, visible above walls from approach)
// =====================================================================

function createClockTower() {
    const group = new THREE.Group();
    group.name = 'clock-tower';

    const tx = 0, tz = -50;
    const baseY = getTerrainHeight(tx, tz);
    const towerH = 35;

    const towerMat = createPS1Material({
        color: new THREE.Color(0x706050),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    // Base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(6, 4, 6),
        towerMat
    );
    base.position.set(tx, baseY + 2, tz);
    group.add(base);

    // Shaft
    const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(4, towerH, 4),
        towerMat
    );
    shaft.position.set(tx, baseY + 4 + towerH / 2, tz);
    group.add(shaft);

    // Spire
    const spire = new THREE.Mesh(
        new THREE.ConeGeometry(3.5, 8, 4),
        createPS1Material({
            color: new THREE.Color(0x5b7080),
            dither: true,
            fogNear: 100,
            fogFar: 400,
        })
    );
    spire.position.set(tx, baseY + 4 + towerH + 4, tz);
    group.add(spire);

    // Clock face (glowing, fog:false so visible from approach)
    const clockFaceMat = new THREE.MeshBasicMaterial({
        color: 0xf5cc45,
        fog: false,
    });
    for (let side = 0; side < 4; side++) {
        const face = new THREE.Mesh(
            new THREE.CircleGeometry(1.8, 8),
            clockFaceMat
        );
        const angle = (side / 4) * Math.PI * 2;
        face.position.set(
            tx + Math.sin(angle) * 2.1,
            baseY + 4 + towerH - 3,
            tz + Math.cos(angle) * 2.1
        );
        face.lookAt(
            face.position.x + Math.sin(angle) * 10,
            face.position.y,
            face.position.z + Math.cos(angle) * 10
        );
        group.add(face);
    }

    // Beacon light on top (visible through fog from approach)
    const beacon = new THREE.PointLight(0xf5cc45, 3.0, 150, 1);
    beacon.position.set(tx, baseY + 4 + towerH + 10, tz);
    group.add(beacon);

    const collider = {
        type: 'box',
        minX: tx - 3, maxX: tx + 3,
        minZ: tz - 3, maxZ: tz + 3,
    };

    return { group, collider };
}


// =====================================================================
//  GAZEBO (east garden area)
// =====================================================================

function createGazebo() {
    const group = new THREE.Group();
    group.name = 'gazebo';

    const gx = 55, gz = -25;
    const baseY = getTerrainHeight(gx, gz);

    const pillarMat = createPS1Material({
        color: new THREE.Color(0xdbd1b4),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    // 6 pillars in a hexagon
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px = gx + Math.cos(angle) * 3;
        const pz = gz + Math.sin(angle) * 3;
        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 4, 0.4),
            pillarMat
        );
        pillar.position.set(px, baseY + 2, pz);
        group.add(pillar);
    }

    // Roof (cone)
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(4.5, 2.5, 6),
        createPS1Material({
            color: new THREE.Color(0x8B4513),
            dither: true,
            fogNear: 100,
            fogFar: 400,
        })
    );
    roof.position.set(gx, baseY + 5.25, gz);
    group.add(roof);

    const collider = {
        type: 'box',
        minX: gx - 3.5, maxX: gx + 3.5,
        minZ: gz - 3.5, maxZ: gz + 3.5,
    };

    return { group, collider };
}


// =====================================================================
//  AMPHITHEATER (west area â€” sunken seating)
// =====================================================================

function createAmphitheater() {
    const group = new THREE.Group();
    group.name = 'amphitheater';

    const ax = -55, az = -15;
    const baseY = getTerrainHeight(ax, az);

    const seatMat = createPS1Material({
        color: new THREE.Color(0x7a7068),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    // 3 tiers of semicircular seating
    for (let tier = 0; tier < 3; tier++) {
        const radius = 6 + tier * 3;
        const height = 0.6 * (tier + 1);
        const segments = 8 + tier * 2;

        for (let s = 0; s < segments; s++) {
            const angle = (s / segments) * Math.PI - Math.PI / 2;
            const sx = ax + Math.cos(angle) * radius;
            const sz = az + Math.sin(angle) * radius;

            const seat = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 0.5, 1.2),
                seatMat
            );
            seat.position.set(sx, baseY + height, sz);
            seat.rotation.y = angle + Math.PI / 2;
            group.add(seat);
        }
    }

    // Stage platform
    const stage = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.4, 5),
        createPS1Material({
            color: new THREE.Color(0x8a6c4c),
            dither: true,
            fogNear: 100,
            fogFar: 400,
        })
    );
    stage.position.set(ax, baseY + 0.2, az + 5);
    group.add(stage);

    return group;
}


// =====================================================================
//  STONE PATHS â€” radiate from center to each portal
// =====================================================================

function createPaths() {
    const group = new THREE.Group();
    group.name = 'paths';

    const pathDefs = [
        // Gate entrance to center
        { start: [0, 70], end: [0, 8], width: 3.5 },
        // Center to each portal
        ...PORTAL_DEFS.map(def => ({
            start: [0, 0],
            end: [def.x, def.z],
            width: 2.5,
        })),
        // Cross path (east-west through center)
        { start: [-80, 0], end: [80, 0], width: 2.0 },
        // Path to the cave canyon (NW mountain entrance)
        { start: [0, 0], end: [-55, -68], width: 2.0 },
    ];

    const pathMat = createPS1Material({
        color: new THREE.Color(0x9a917a),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    for (const pathDef of pathDefs) {
        const [sx, sz] = pathDef.start;
        const [ex, ez] = pathDef.end;
        const dx = ex - sx;
        const dz = ez - sz;
        const len = Math.sqrt(dx * dx + dz * dz);
        const steps = Math.floor(len / 4);
        const angle = Math.atan2(dx, dz);

        for (let s = 0; s < steps; s++) {
            const t = (s + 0.5) / steps;
            const px = sx + dx * t;
            const pz = sz + dz * t;
            const py = getTerrainHeight(px, pz) + 0.05;

            const stone = new THREE.Mesh(
                new THREE.BoxGeometry(pathDef.width, 0.1, 3.5),
                pathMat
            );
            stone.position.set(px, py, pz);
            stone.rotation.y = Math.atan2(dx, dz);
            group.add(stone);
        }
    }

    return group;
}


// =====================================================================
//  WALL TOWERS â€” turrets at cardinal points
// =====================================================================

function createWallTowers() {
    const group = new THREE.Group();
    group.name = 'wall-towers';

    const towerPositions = [
        { x: 0, z: -HUB_RZ, label: 'N' },       // North
        { x: HUB_RX, z: 0, label: 'E' },         // East
        { x: -HUB_RX, z: 0, label: 'W' },        // West
    ];

    const towerMat = createPS1Material({
        color: new THREE.Color(0x7b6d5f),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    for (const pos of towerPositions) {
        const baseY = getTerrainHeight(pos.x, pos.z) - 1;
        const towerH = WALL_HEIGHT + 4;

        // Cylindrical tower (approximated with 6-sided geometry)
        const tower = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3.5, towerH, 6),
            towerMat
        );
        tower.position.set(pos.x, baseY + towerH / 2, pos.z);
        group.add(tower);

        // Conical roof
        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(4, 3, 6),
            createPS1Material({
                color: new THREE.Color(0x5b7080),
                dither: true,
                fogNear: 100,
                fogFar: 400,
            })
        );
        roof.position.set(pos.x, baseY + towerH + 1.5, pos.z);
        group.add(roof);

        // Torch light on top
        const torch = new THREE.PointLight(0xffaa44, 1.5, 40, 1.5);
        torch.position.set(pos.x, baseY + towerH + 3, pos.z);
        group.add(torch);
    }

    return group;
}


// =====================================================================
//  OBELISKS â€” math-themed pillars along paths
// =====================================================================

function createObelisks() {
    const group = new THREE.Group();
    group.name = 'obelisks';

    const obeliskDefs = [
        { x: 0, z: 40, symbol: '\u03C0', color: 0xe86464 },
        { x: 0, z: 20, symbol: '\u2211', color: 0x43bda6 },
        { x: 30, z: -20, symbol: 'e', color: 0xf5cc45 },
        { x: -30, z: -20, symbol: '\u221E', color: 0x6e63d9 },
        { x: 50, z: 30, symbol: '\u222B', color: 0xF38181 },
        { x: -50, z: 20, symbol: '\u03C6', color: 0x00B894 },
    ];

    const stoneMat = createPS1Material({
        color: new THREE.Color(0xb1a890),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    const capMat = createPS1Material({
        color: new THREE.Color(0xc0b8a0),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    const baseMat = createPS1Material({
        color: new THREE.Color(0x8a7f6b),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    for (const def of obeliskDefs) {
        const baseY = getTerrainHeight(def.x, def.z);
        const obelisk = new THREE.Group();

        // Stepped pedestal base (two tiers)
        const tier1 = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.4, 1.8),
            baseMat
        );
        tier1.position.set(def.x, baseY + 0.2, def.z);
        obelisk.add(tier1);

        const tier2 = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 0.3, 1.3),
            baseMat
        );
        tier2.position.set(def.x, baseY + 0.55, def.z);
        obelisk.add(tier2);

        // Tapered stone column (wider at base, narrower at top)
        const column = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.42, 3.8, 4),
            stoneMat
        );
        column.rotation.y = Math.PI / 4; // Rotate so flat faces are cardinal
        column.position.set(def.x, baseY + 2.6, def.z);
        obelisk.add(column);

        // Pyramidion cap
        const cap = new THREE.Mesh(
            new THREE.ConeGeometry(0.38, 0.8, 4),
            capMat
        );
        cap.rotation.y = Math.PI / 4;
        cap.position.set(def.x, baseY + 4.9, def.z);
        obelisk.add(cap);

        // Glowing symbol panel on front face
        const symbolCanvas = document.createElement('canvas');
        symbolCanvas.width = 64;
        symbolCanvas.height = 128;
        const ctx = symbolCanvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 128);
        const hexColor = '#' + def.color.toString(16).padStart(6, '0');
        ctx.shadowColor = hexColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = hexColor;
        ctx.font = 'bold 48px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.symbol, 32, 64);
        ctx.fillText(def.symbol, 32, 64); // Double draw for glow

        const symbolTex = new THREE.CanvasTexture(symbolCanvas);
        symbolTex.generateMipmaps = false;
        symbolTex.minFilter = THREE.LinearFilter;

        const panel = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 1.0),
            new THREE.MeshBasicMaterial({
                map: symbolTex,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
            })
        );
        panel.position.set(def.x, baseY + 2.8, def.z + 0.44);
        obelisk.add(panel);

        // Soft glow light at symbol
        const glow = new THREE.PointLight(def.color, 0.5, 6, 2);
        glow.position.set(def.x, baseY + 2.8, def.z + 0.6);
        obelisk.add(glow);

        group.add(obelisk);
    }

    return group;
}


// =====================================================================
//  ZONE BEACONS â€” portal arches at each portal location
// =====================================================================

function createZoneBeacons() {
    const beacons = [];

    for (const def of PORTAL_DEFS) {
        const arch = makePortalArch(def);
        beacons.push(arch);
    }

    return beacons;
}

function makePortalArch(def) {
    const { x, z, color, zone: zoneName, label, rotation } = def;

    const g = new THREE.Group();
    g.name = `portal_${zoneName}`;
    const baseY = getTerrainHeight(x, z);

    // Larger portal arches for the bigger hub
    const pillarH = 6;
    const pillarSpread = 2.5;

    const pillarMat = createPS1Material({
        color: new THREE.Color(color),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    // Fluted round columns instead of plain boxes
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.35, pillarH, 8);

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-pillarSpread, baseY + pillarH / 2, 0);
    g.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(pillarSpread, baseY + pillarH / 2, 0);
    g.add(rightPillar);

    // Decorative capitals on top of pillars
    const capitalMat = createPS1Material({
        color: new THREE.Color(color).multiplyScalar(1.3),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    const capitalGeo = new THREE.CylinderGeometry(0.45, 0.28, 0.3, 8);
    const leftCap = new THREE.Mesh(capitalGeo, capitalMat);
    leftCap.position.set(-pillarSpread, baseY + pillarH + 0.15, 0);
    g.add(leftCap);
    const rightCap = new THREE.Mesh(capitalGeo, capitalMat);
    rightCap.position.set(pillarSpread, baseY + pillarH + 0.15, 0);
    g.add(rightCap);

    // Pillar bases
    const baseGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.3, 8);
    const leftBase = new THREE.Mesh(baseGeo, capitalMat);
    leftBase.position.set(-pillarSpread, baseY + 0.15, 0);
    g.add(leftBase);
    const rightBase = new THREE.Mesh(baseGeo, capitalMat);
    rightBase.position.set(pillarSpread, baseY + 0.15, 0);
    g.add(rightBase);

    // Curved arch top instead of flat beam
    const archSegments = 12;
    const archRadius = pillarSpread;
    const archCenterY = baseY + pillarH + 0.3;
    for (let i = 0; i < archSegments; i++) {
        const a0 = (i / archSegments) * Math.PI;
        const a1 = ((i + 1) / archSegments) * Math.PI;
        const mx = (Math.cos(a0) + Math.cos(a1)) * 0.5 * archRadius;
        const my = (Math.sin(a0) + Math.sin(a1)) * 0.5 * archRadius;
        const segLen = archRadius * Math.PI / archSegments;
        const angle = (a0 + a1) / 2;

        const seg = new THREE.Mesh(
            new THREE.BoxGeometry(segLen * 1.1, 0.4, 0.5),
            pillarMat
        );
        seg.position.set(-mx, archCenterY + my, 0);
        seg.rotation.z = angle;
        g.add(seg);
    }

    // Keystone at top of arch
    const keystone = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.6, 0.55),
        capitalMat
    );
    keystone.position.set(0, archCenterY + archRadius + 0.1, 0);
    g.add(keystone);

    // Glowing portal fill
    const portalGeo = new THREE.PlaneGeometry(pillarSpread * 2 - 0.4, pillarH - 0.5);
    const portalMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
    });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(0, baseY + pillarH / 2 + 0.2, 0);
    portal.name = 'portalFill';
    g.add(portal);

    // Glowing edge lines (arch shape)
    const edgePts = [];
    edgePts.push(new THREE.Vector3(-pillarSpread + 0.2, baseY + 0.2, 0));
    edgePts.push(new THREE.Vector3(-pillarSpread + 0.2, baseY + pillarH, 0));
    for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI;
        edgePts.push(new THREE.Vector3(
            -Math.cos(a) * (pillarSpread - 0.2),
            archCenterY + Math.sin(a) * (pillarSpread - 0.2),
            0
        ));
    }
    edgePts.push(new THREE.Vector3(pillarSpread - 0.2, baseY + pillarH, 0));
    edgePts.push(new THREE.Vector3(pillarSpread - 0.2, baseY + 0.2, 0));

    const edgeLine = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(edgePts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }),
    );
    g.add(edgeLine);

    // Label sprite
    const labelSprite = createBeaconLabel(label, color);
    labelSprite.position.set(0, archCenterY + archRadius + 1.5, 0);
    g.add(labelSprite);

    // Glow light
    const glow = new THREE.PointLight(color, 1.5, 25, 1.5);
    glow.position.set(0, baseY + pillarH / 2, 1);
    g.add(glow);

    g.position.set(x, 0, z);
    g.rotation.y = rotation;

    g.userData.portalColor = color;
    g.userData.zoneName = zoneName;

    return g;
}


function applyTerrainPaths(geometry) {
    const position = geometry.attributes.position;
    const color = geometry.attributes.color;
    if (!color) return;

    const pathColor = new THREE.Color(0xbc9d75);

    const paths = [
        // Gate to center
        { start: [0, 70], end: [0, 0], width: 4.0 },
        // Center to each portal
        ...PORTAL_DEFS.map(def => ({
            start: [0, 0],
            end: [def.x, def.z],
            width: 3.0,
        })),
        // Approach corridor
        { start: [0, 80], end: [0, 260], width: 5.0 },
        // Path to cave canyon
        { start: [0, 0], end: [-55, -68], width: 2.5 },
    ];

    for (let i = 0; i < position.count; i++) {
        const vx = position.getX(i);
        const vz = position.getZ(i);

        for (const path of paths) {
            const [sx, sz] = path.start;
            const [ex, ez] = path.end;
            const dx = ex - sx, dz = ez - sz;
            const len = Math.sqrt(dx * dx + dz * dz);
            if (len === 0) continue;
            const t = Math.max(0, Math.min(1, ((vx - sx) * dx + (vz - sz) * dz) / (len * len)));
            const px = sx + dx * t;
            const pz = sz + dz * t;
            const dist = Math.sqrt((vx - px) ** 2 + (vz - pz) ** 2);

            const w = path.width * (1 - t * 0.2);
            if (dist < w) {
                const blend = 1 - (dist / w);
                const strength = blend * 0.25;
                const r = color.getX(i);
                const g = color.getY(i);
                const b = color.getZ(i);
                color.setXYZ(i,
                    r + (pathColor.r - r) * strength,
                    g + (pathColor.g - g) * strength,
                    b + (pathColor.b - b) * strength,
                );
            }
        }
    }

    color.needsUpdate = true;
}


// =====================================================================
//  POND
// =====================================================================

function createPond() {
    const geometry = new THREE.CircleGeometry(5, 24);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTop:  { value: new THREE.Color(0xaad6f2) },
            uDeep: { value: new THREE.Color(0x1c3a38) },
            uTime: { value: 0.0 },
        },
        vertexShader: [
            'varying vec3 vWorldPos;',
            'varying vec3 vNormal;',
            'varying vec2 vLocalUV;',
            'void main() {',
            '    vec4 worldPos = modelMatrix * vec4(position, 1.0);',
            '    vWorldPos = worldPos.xyz;',
            '    vNormal = normalize(mat3(modelMatrix) * normal);',
            '    vLocalUV = position.xz / 5.0;',
            '    gl_Position = projectionMatrix * viewMatrix * worldPos;',
            '}',
        ].join('\n'),
        fragmentShader: [
            'uniform vec3 uTop;',
            'uniform vec3 uDeep;',
            'uniform float uTime;',
            'varying vec3 vWorldPos;',
            'varying vec3 vNormal;',
            'varying vec2 vLocalUV;',
            '',
            'float wireGrid(vec2 uv, float spacing, float thickness) {',
            '    vec2 grid = abs(fract(uv * spacing + 0.5) - 0.5);',
            '    float line = min(grid.x, grid.y);',
            '    return 1.0 - smoothstep(0.0, thickness, line);',
            '}',
            '',
            'void main() {',
            '    vec3 viewDir = normalize(cameraPosition - vWorldPos);',
            '    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);',
            '    vec3 reflectedSky = mix(uDeep, uTop, clamp(viewDir.y * 0.5 + 0.5, 0.0, 1.0));',
            '    vec2 gridUV = vLocalUV * 3.0 + vec2(sin(uTime * 0.3) * 0.1, uTime * 0.05);',
            '    float grid1 = wireGrid(gridUV, 2.0, 0.06);',
            '    float grid2 = wireGrid(gridUV * 0.5, 1.5, 0.04) * 0.5;',
            '    float gridIntensity = grid1 + grid2;',
            '    vec3 wireColor = vec3(0.0, 0.9, 0.25) * gridIntensity;',
            '    float pulse = 0.4 + 0.3 * sin(uTime * 1.5);',
            '    vec3 depthColor = uDeep + wireColor * pulse;',
            '    vec3 water = mix(depthColor, reflectedSky, 0.35 + fresnel * 0.45);',
            '    float edgeDist = length(vLocalUV);',
            '    float depthFade = smoothstep(0.3, 1.0, edgeDist);',
            '    water = mix(water, depthColor * 0.3, depthFade * 0.4);',
            '    gl_FragColor = vec4(water, 0.92);',
            '}',
        ].join('\n'),
        transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'pond';
    return mesh;
}


// =====================================================================
//  HELPER SPRITES
// =====================================================================

function createBeaconLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    ctx.shadowColor = '#' + color.toString(16).padStart(6, '0');
    ctx.shadowBlur = 8;
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85 })
    );
    sprite.scale.set(8, 2, 1);
    return sprite;
}

// =====================================================================
//  ZONE TRACES â€” visual marks on the field for visited zones
// =====================================================================

function createZoneTrace(zone) {
    const trace = new THREE.Group();
    trace.name = 'trace_' + zone;

    switch (zone) {
        case 'wireframe_void': {
            const cube = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.5, 0.5),
                new THREE.MeshBasicMaterial({
                    color: 0x00ff41, wireframe: true,
                    transparent: true, opacity: 0.45,
                })
            );
            const x = 20, z = 15;
            cube.position.set(x, getTerrainHeight(x, z) + 0.7, z);
            trace.add(cube);
            break;
        }
        case 'coordinate_plane': {
            const grid = new THREE.GridHelper(2.5, 5, 0x336633, 0x224422);
            const x = -15, z = -30;
            grid.position.set(x, getTerrainHeight(x, z) + 0.03, z);
            if (Array.isArray(grid.material)) {
                grid.material.forEach(m => { m.transparent = true; m.opacity = 0.25; });
            } else {
                grid.material.transparent = true;
                grid.material.opacity = 0.25;
            }
            trace.add(grid);
            break;
        }
        case 'fractal_boundary': {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xff6600, transparent: true, opacity: 0.4,
            });
            const offsets = [[0, 0], [-0.2, -0.35], [0.2, -0.35]];
            const x = 35, z = 10;
            const baseY = getTerrainHeight(x, z) + 0.06;
            for (const [ox, oz] of offsets) {
                const tri = new THREE.Mesh(
                    new THREE.ConeGeometry(0.12, 0.2, 3), mat
                );
                tri.position.set(x + ox, baseY, z + oz);
                trace.add(tri);
            }
            break;
        }
        case 'number_caverns': {
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(0.15, 0.6, 4),
                new THREE.MeshBasicMaterial({
                    color: 0xffdd44, transparent: true, opacity: 0.45,
                })
            );
            const x = -10, z = -20;
            cone.position.set(x, getTerrainHeight(x, z) + 0.5, z);
            cone.rotation.z = Math.PI;
            trace.add(cone);
            break;
        }
        case 'non_euclidean': {
            const geo = new THREE.PlaneGeometry(0.9, 0.9, 4, 4);
            const pos = geo.getAttribute('position');
            for (let i = 0; i < pos.count; i++) {
                const px = pos.getX(i), py = pos.getY(i);
                pos.setZ(i, Math.sin(px * 3) * Math.cos(py * 3) * 0.15);
            }
            geo.computeVertexNormals();
            const warped = new THREE.Mesh(geo,
                new THREE.MeshBasicMaterial({
                    color: 0x993366, wireframe: true,
                    transparent: true, opacity: 0.3,
                    side: THREE.DoubleSide,
                })
            );
            const x = -35, z = -10;
            warped.position.set(x, getTerrainHeight(x, z) + 0.3, z);
            warped.rotation.x = -Math.PI / 3;
            trace.add(warped);
            break;
        }
        default:
            return null;
    }

    return trace;
}

// =====================================================================
//  DISTANT SECRET
// =====================================================================

function createDistantSecret() {
    const group = new THREE.Group();
    group.name = 'distant-secret';
    const colliders = [];

    const tx = 160;
    const tz = -130;
    const baseY = getTerrainHeight(tx, tz);

    // Giant obelisk
    const obeliskGeo = new THREE.BoxGeometry(10, 80, 10);
    const obeliskMat = createPS1Material({
        color: new THREE.Color(0x332244),
        dither: true,
        fogNear: 150,
        fogFar: 450, // slightly more visible over distance
    });
    const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
    obelisk.position.set(0, 40, 0);
    group.add(obelisk);

    colliders.push({
        type: 'box',
        minX: tx - 5, maxX: tx + 5,
        minZ: tz - 5, maxZ: tz + 5,
    });

    // An interactable switch console at the base
    const consoleGeo = new THREE.BoxGeometry(2, 1.5, 2);
    const consoleMat = createPS1Material({
        color: new THREE.Color(0x555555),
        dither: true,
    });
    const switchConsole = new THREE.Mesh(consoleGeo, consoleMat);
    switchConsole.position.set(0, 0.75, 6);
    switchConsole.name = 'distant_switch'; // Tagged for interactions
    group.add(switchConsole);

    // Add glowing switch
    const switchGeo = new THREE.BoxGeometry(0.8, 0.4, 0.4);
    const switchMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const switchPart = new THREE.Mesh(switchGeo, switchMat);
    switchPart.position.set(0, 0.75 + 0.2, 5.8);
    switchPart.name = 'switch_handle';
    group.add(switchPart);

    group.position.set(tx, baseY, tz);
    return { group, colliders };
}

// =====================================================================
//  GIANT GAME NUMBERS
// =====================================================================
function createGiantGameNumber(numStr, colorHex) {
    const g = new THREE.Group();
    g.name = 'giant-game-number-' + numStr;
    const s = 14; // large blocks — numbers stand ~70 units tall
    const mat = createPS1Material({
        color: new THREE.Color(colorHex),
        dither: true,
        fogNear: 200,
        fogFar: 800
    });
    
    let map = [];
    if (numStr === '5') {
        map = [
            "###",
            "#  ",
            "###",
            "  #",
            "###"
        ];
    } else if (numStr === '9') {
        map = [
            "###",
            "# #",
            "###",
            "  #",
            "###"
        ];
    }

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
            if (map[r][c] === '#') {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s * 1.5), mat);
                mesh.position.set((c - 1) * s, (4 - r) * s + s / 2, 0);
                g.add(mesh);
            }
        }
    }

    // Ground-level invisible mesh for interaction detection
    // (so the interaction check doesn't fail due to vertical distance)
    const targetGeo = new THREE.BoxGeometry(s * 4, 4, s * 4);
    const targetMat = new THREE.MeshBasicMaterial({ visible: false });
    const interactionTarget = new THREE.Mesh(targetGeo, targetMat);
    interactionTarget.position.set(0, 2, 0); // at player height, near ground
    g.add(interactionTarget);
    
    return { group: g, interactionTarget };
}


// =====================================================================
//  GIANT MATHEMATICAL SPHERE
// =====================================================================

/**
 * Creates a large PS1-style sphere landmark in the hub world.
 * Semi-transparent solid core with a wireframe overlay and
 * mathematical "latitude/longitude" ring markings.
 */
function createGiantSphere() {
    const group = new THREE.Group();
    group.name = 'giant-math-sphere';

    // ── Positioned at the top of the parkour tower ──────────────────
    // Parkour tower: px=-20, pz=30, 12 platforms, heightStep=2.8, spiralRadius=5
    // Summit: topAngle = 3.5π → cos=0, sin=-1 → topX=-20, topZ=25
    const cx = -20, cz = 25;
    const baseY = getTerrainHeight(-20, 30); // match parkour base
    const topH = baseY + 2 + 12 * 2.8;      // summit platform height
    const radius = 6;
    const centerY = topH + radius + 1.5;     // hovering above summit platform

    // ── Solid inner sphere (translucent) ────────────────────────────
    const innerMat = createPS1Material({
        color: new THREE.Color(0x2244AA),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });
    innerMat.transparent = true;
    innerMat.opacity = 0.35;
    innerMat.side = THREE.DoubleSide;

    const innerSphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(radius * 0.95, 2), // low-poly PS1 style
        innerMat,
    );
    innerSphere.position.set(cx, centerY, cz);
    innerSphere.name = 'sphere-inner';
    group.add(innerSphere);

    // ── Wireframe outer sphere ──────────────────────────────────────
    const wireMat = new THREE.MeshBasicMaterial({
        color: 0x44CCFF,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
    });
    const wireSphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(radius, 2),
        wireMat,
    );
    wireSphere.position.set(cx, centerY, cz);
    group.add(wireSphere);

    // ── Equatorial and meridian rings ───────────────────────────────
    const ringMat = createPS1Material({
        color: new THREE.Color(0xFFCC44),
        dither: true,
        fogNear: 100,
        fogFar: 400,
    });

    // Equator ring
    const equator = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 0.3, 0.2, 6, 32),
        ringMat,
    );
    equator.position.set(cx, centerY, cz);
    equator.rotation.x = Math.PI / 2;
    group.add(equator);

    // Meridian rings (two perpendicular)
    for (let i = 0; i < 2; i++) {
        const meridian = new THREE.Mesh(
            new THREE.TorusGeometry(radius + 0.2, 0.15, 6, 32),
            ringMat,
        );
        meridian.position.set(cx, centerY, cz);
        meridian.rotation.y = (i * Math.PI) / 2;
        group.add(meridian);
    }

    // No pedestal — sphere hovers above the parkour summit as a reward.

    // ── Glow light inside (beacon visible from below) ──────────────
    const glow = new THREE.PointLight(0x4488FF, 4.0, 60, 1.5);
    glow.position.set(cx, centerY, cz);
    group.add(glow);

    // ── Second glow underneath — guides the player climbing up ─────
    const beaconGlow = new THREE.PointLight(0xFFCC44, 2.0, 50, 2);
    beaconGlow.position.set(cx, centerY - radius, cz);
    group.add(beaconGlow);

    // No collider — player walks into the sphere to teleport
    // to the inner_sphere zone (see portal-config.js).
    return { group };
}