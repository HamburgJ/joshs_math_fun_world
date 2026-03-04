import * as THREE from 'three';

/**
 * Boundary walls and asymptote walls for the Coordinate Plane.
 *
 * The zone is bounded — translucent asymptote walls mark the edges of each room,
 * and invisible collision walls prevent Josh from walking off into the void.
 *
 * Layout rooms:
 *  - Central Arena (±15)
 *  - 4 Axis Corridors (3-wide passages)
 *  - 4 Quadrant Alcoves (12×12 rooms)
 */

/**
 * Creates a glowing grid material for the asymptote boundary walls.
 * @param {number} [opacity=0.7]
 * @returns {THREE.MeshBasicMaterial}
 */
function createGlowingGridMaterial(opacity = 0.7) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = 'rgba(0, 20, 50, 0.4)';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 12;

    ctx.strokeRect(0, 0, 512, 512);
    ctx.beginPath();
    ctx.moveTo(256, 0); ctx.lineTo(256, 512);
    ctx.moveTo(0, 256); ctx.lineTo(512, 256);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 4);

    return new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: tex,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
}

/**
 * Create a visual wall plane.
 * @param {number} cx
 * @param {number} cz
 * @param {number} width
 * @param {number} height
 * @param {boolean} facingX - true = wall faces along X axis (rotated 90°)
 * @param {THREE.Material} material
 * @returns {THREE.Mesh}
 */
function makeWallVisual(cx, cz, width, height, facingX, material) {
    const geo = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(cx, height / 2, cz);
    if (facingX) mesh.rotation.y = Math.PI / 2;
    mesh.name = `Wall_${cx}_${cz}`;
    return mesh;
}

/**
 * Build all boundary walls (visual + collision data).
 *
 * The boundary is a complex shape: central arena with 4 corridors and 4 alcoves.
 * We use wall segments along the outside edges of each room, with openings
 * where the corridors connect.
 *
 * @returns {{ visuals: THREE.Mesh[], colliders: Array<{minX:number,maxX:number,minZ:number,maxZ:number}> }}
 */
export function buildAsymptoteWalls() {
    const H = 8;  // wall height
    const material = createGlowingGridMaterial(0.5);
    const visuals = [];

    // ── Helper to add a wall segment ──
    function addWall(cx, cz, width, facingX) {
        visuals.push(makeWallVisual(cx, cz, width, H, facingX, material));
    }

    // ══════════════════════════════════════════════════════════
    //  Central Arena boundary walls (with corridor openings)
    //  Arena: x ∈ [-15, 15], z ∈ [-15, 15]
    //  Corridor openings: 4 units wide centered on each axis
    // ══════════════════════════════════════════════════════════

    // East wall (x=15): two segments with gap for east corridor (z ∈ [-2, 2])
    addWall(15, -8.5, 13, true);  // z: -15 to -2
    addWall(15, 8.5, 13, true);   // z: 2 to 15

    // West wall (x=-15): two segments with gap for west corridor
    addWall(-15, -8.5, 13, true);
    addWall(-15, 8.5, 13, true);

    // North wall (z=15): two segments with gap for north corridor (x ∈ [-2, 2])
    addWall(-8.5, 15, 13, false);
    addWall(8.5, 15, 13, false);

    // South wall (z=-15)
    addWall(-8.5, -15, 13, false);
    addWall(8.5, -15, 13, false);

    // ══════════════════════════════════════════════════════════
    //  Corridor walls (3-wide corridors from arena to alcoves)
    // ══════════════════════════════════════════════════════════

    // East corridor (x: 15→27, z: ±2) — top and bottom walls
    addWall(21, 2, 12, false);   // north wall of corridor
    addWall(21, -2, 12, false);  // south wall of corridor

    // West corridor (x: -15→-27, z: ±2)
    addWall(-21, 2, 12, false);
    addWall(-21, -2, 12, false);

    // North corridor (z: 15→27, x: ±2)
    addWall(2, 21, 12, true);
    addWall(-2, 21, 12, true);

    // South corridor (z: -15→-27, x: ±2)
    addWall(2, -21, 12, true);
    addWall(-2, -21, 12, true);

    // ══════════════════════════════════════════════════════════
    //  Alcove walls (12×12 rooms, with corridor opening)
    // ══════════════════════════════════════════════════════════

    // Q1 Alcove (+X direction): x ∈ [27, 39], z ∈ [-6, 6]
    addWall(39, 0, 12, true);    // far east wall
    addWall(33, 6, 12, false);   // north wall
    addWall(33, -6, 12, false);  // south wall
    // West wall of alcove (facing arena) — two segments with corridor opening
    addWall(27, -4, 4, true);
    addWall(27, 4, 4, true);

    // Q2 Alcove (-X direction): x ∈ [-39, -27], z ∈ [-6, 6]
    addWall(-39, 0, 12, true);
    addWall(-33, 6, 12, false);
    addWall(-33, -6, 12, false);
    addWall(-27, -4, 4, true);
    addWall(-27, 4, 4, true);

    // Q3 Alcove (-Z direction): x ∈ [-6, 6], z ∈ [-39, -27]
    addWall(0, -39, 12, false);
    addWall(6, -33, 12, true);
    addWall(-6, -33, 12, true);
    addWall(-4, -27, 4, false);
    addWall(4, -27, 4, false);

    // Q4 Alcove (+Z direction): x ∈ [-6, 6], z ∈ [27, 39]
    addWall(0, 39, 12, false);
    addWall(6, 33, 12, true);
    addWall(-6, 33, 12, true);
    addWall(-4, 27, 4, false);
    addWall(4, 27, 4, false);

    // ══════════════════════════════════════════════════════════
    //  Collision boxes (invisible walls for physics)
    //  These are thin AABB strips along each wall segment
    // ══════════════════════════════════════════════════════════
    const T = 0.5; // wall thickness for collision
    const colliders = [
        // Central arena east wall segments (with corridor gap)
        { minX: 15 - T, maxX: 15 + T, minZ: -15, maxZ: -2 },
        { minX: 15 - T, maxX: 15 + T, minZ: 2, maxZ: 15 },
        // Central arena west wall segments
        { minX: -15 - T, maxX: -15 + T, minZ: -15, maxZ: -2 },
        { minX: -15 - T, maxX: -15 + T, minZ: 2, maxZ: 15 },
        // Central arena north wall segments
        { minX: -15, maxX: -2, minZ: 15 - T, maxZ: 15 + T },
        { minX: 2, maxX: 15, minZ: 15 - T, maxZ: 15 + T },
        // Central arena south wall segments
        { minX: -15, maxX: -2, minZ: -15 - T, maxZ: -15 + T },
        { minX: 2, maxX: 15, minZ: -15 - T, maxZ: -15 + T },

        // East corridor walls
        { minX: 15, maxX: 27, minZ: 2 - T, maxZ: 2 + T },
        { minX: 15, maxX: 27, minZ: -2 - T, maxZ: -2 + T },
        // West corridor walls
        { minX: -27, maxX: -15, minZ: 2 - T, maxZ: 2 + T },
        { minX: -27, maxX: -15, minZ: -2 - T, maxZ: -2 + T },
        // North corridor walls
        { minX: 2 - T, maxX: 2 + T, minZ: 15, maxZ: 27 },
        { minX: -2 - T, maxX: -2 + T, minZ: 15, maxZ: 27 },
        // South corridor walls
        { minX: 2 - T, maxX: 2 + T, minZ: -27, maxZ: -15 },
        { minX: -2 - T, maxX: -2 + T, minZ: -27, maxZ: -15 },

        // Q1 Alcove walls
        { minX: 39 - T, maxX: 39 + T, minZ: -6, maxZ: 6 },       // far east
        { minX: 27, maxX: 39, minZ: 6 - T, maxZ: 6 + T },        // north
        { minX: 27, maxX: 39, minZ: -6 - T, maxZ: -6 + T },      // south
        { minX: 27 - T, maxX: 27 + T, minZ: -6, maxZ: -2 },      // west-south segment
        { minX: 27 - T, maxX: 27 + T, minZ: 2, maxZ: 6 },        // west-north segment

        // Q2 Alcove walls
        { minX: -39 - T, maxX: -39 + T, minZ: -6, maxZ: 6 },
        { minX: -39, maxX: -27, minZ: 6 - T, maxZ: 6 + T },
        { minX: -39, maxX: -27, minZ: -6 - T, maxZ: -6 + T },
        { minX: -27 - T, maxX: -27 + T, minZ: -6, maxZ: -2 },
        { minX: -27 - T, maxX: -27 + T, minZ: 2, maxZ: 6 },

        // Q3 Alcove walls (south, -Z)
        { minX: -6, maxX: 6, minZ: -39 - T, maxZ: -39 + T },
        { minX: 6 - T, maxX: 6 + T, minZ: -39, maxZ: -27 },
        { minX: -6 - T, maxX: -6 + T, minZ: -39, maxZ: -27 },
        { minX: -6, maxX: -2, minZ: -27 - T, maxZ: -27 + T },
        { minX: 2, maxX: 6, minZ: -27 - T, maxZ: -27 + T },

        // Q4 Alcove walls (north, +Z)
        { minX: -6, maxX: 6, minZ: 39 - T, maxZ: 39 + T },
        { minX: 6 - T, maxX: 6 + T, minZ: 27, maxZ: 39 },
        { minX: -6 - T, maxX: -6 + T, minZ: 27, maxZ: 39 },
        { minX: -6, maxX: -2, minZ: 27 - T, maxZ: 27 + T },
        { minX: 2, maxX: 6, minZ: 27 - T, maxZ: 27 + T },
    ];

    return { visuals, colliders };
}
