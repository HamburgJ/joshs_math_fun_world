import * as THREE from 'three';

/**
 * Grid floor for the Coordinate Plane — multi-room layout.
 *
 * Central grid arena (±15) with four quadrant alcoves connected by
 * axis corridors. Each quadrant has a raised observation platform.
 * All rooms have grid-patterned floors with distinct quadrant tinting.
 *
 * Layout (top-down, Z+ is "north"):
 *
 *              [Q2 Alcove]
 *                  |
 *   [Q2 Alcove]--[  Central  ]--[Q1 Alcove]
 *                  |
 *              [Q4 Alcove]
 *
 * Q1 (+X,+Z) = Parabola Gallery   — warm yellow
 * Q2 (-X,+Z) = Trig Observatory   — cool blue
 * Q3 (-X,-Z) = Reciprocal Chamber — muted green
 * Q4 (+X,-Z) = Function Lab       — soft red
 */

const GRID_SHADER_VERT = /* glsl */ `
    varying vec2 vWorldXZ;
    void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldXZ = world.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const GRID_SHADER_FRAG = /* glsl */ `
    uniform float uTime;
    varying vec2 vWorldXZ;

    void main() {
        vec2 coord = vWorldXZ;

        // ── Quadrant tinting ────────────────────────────────────
        vec3 q1 = vec3(0.95, 0.92, 0.80);
        vec3 q2 = vec3(0.82, 0.85, 0.95);
        vec3 q3 = vec3(0.82, 0.92, 0.82);
        vec3 q4 = vec3(0.95, 0.82, 0.82);

        vec3 bgColor;
        if (coord.x >= 0.0 && coord.y >= 0.0) bgColor = q1;
        else if (coord.x < 0.0 && coord.y >= 0.0) bgColor = q2;
        else if (coord.x < 0.0 && coord.y < 0.0) bgColor = q3;
        else bgColor = q4;

        // ── Integer grid lines ──────────────────────────────────
        vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
        float line = min(grid.x, grid.y);
        float gridAlpha = 1.0 - min(line, 1.0);
        vec3 gridColor = vec3(0.5, 0.5, 0.55);

        // ── Axis highlighting ───────────────────────────────────
        float xAxis = 1.0 - min(abs(coord.y) / fwidth(coord.y) * 0.5, 1.0);
        float yAxis = 1.0 - min(abs(coord.x) / fwidth(coord.x) * 0.5, 1.0);
        vec3 xAxisColor = vec3(0.9, 0.2, 0.15);
        vec3 yAxisColor = vec3(0.15, 0.2, 0.9);

        // ── Composite ───────────────────────────────────────────
        vec3 color = bgColor;
        color = mix(color, gridColor, gridAlpha * 0.5);
        color = mix(color, xAxisColor, xAxis * 0.8);
        color = mix(color, yAxisColor, yAxis * 0.8);

        gl_FragColor = vec4(color, 1.0);
    }
`;

/**
 * Create a grid floor tile at the given position/size with the shared shader.
 * @param {number} cx - Center X
 * @param {number} cz - Center Z
 * @param {number} sizeX - Width
 * @param {number} sizeZ - Depth
 * @param {number} y - Height
 * @param {THREE.ShaderMaterial} material
 * @returns {THREE.Mesh}
 */
function makeFloorTile(cx, cz, sizeX, sizeZ, y, material) {
    const geo = new THREE.PlaneGeometry(sizeX, sizeZ, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(cx, y, cz);
    mesh.name = `GridFloor_${cx}_${cz}`;
    return mesh;
}

/**
 * Build a ramp mesh connecting two heights.
 * @param {number} x1
 * @param {number} z1
 * @param {number} x2
 * @param {number} z2
 * @param {number} width
 * @param {number} yLow
 * @param {number} yHigh
 * @param {THREE.Material} material
 * @returns {THREE.Mesh}
 */
function makeRamp(x1, z1, x2, z2, width, yLow, yHigh, material) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const dy = yHigh - yLow;
    const rampLen = Math.sqrt(length * length + dy * dy);

    const geo = new THREE.PlaneGeometry(width, rampLen, 1, 1);
    geo.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set((x1 + x2) / 2, (yLow + yHigh) / 2, (z1 + z2) / 2);

    // Rotate to face the direction
    const angle = Math.atan2(dx, dz);
    mesh.rotation.y = angle;

    // Tilt for slope
    const slopeAngle = Math.atan2(dy, length);
    mesh.rotation.x = -slopeAngle;

    mesh.name = 'Ramp';
    return mesh;
}

/**
 * Build the entire multi-room grid floor layout.
 * @returns {{ meshes: THREE.Mesh[], material: THREE.ShaderMaterial, rooms: Object }}
 */
export function buildGridFloor() {
    const material = new THREE.ShaderMaterial({
        transparent: false,
        depthWrite: true,
        side: THREE.DoubleSide,
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: GRID_SHADER_VERT,
        fragmentShader: GRID_SHADER_FRAG,
    });

    const meshes = [];

    // ═══════════════════════════════════════════════════════════════
    //  1. Central Arena (30×30, centered at origin, y=0)
    // ═══════════════════════════════════════════════════════════════
    meshes.push(makeFloorTile(0, 0, 30, 30, 0, material));

    // ═══════════════════════════════════════════════════════════════
    //  2. Axis Corridors (3 units wide, extending from arena to alcoves)
    //     Each corridor is 12 units long, connecting arena edge to alcove
    // ═══════════════════════════════════════════════════════════════
    // East corridor (+X): from x=15 to x=27
    meshes.push(makeFloorTile(21, 0, 12, 4, 0, material));
    // West corridor (-X): from x=-15 to x=-27
    meshes.push(makeFloorTile(-21, 0, 12, 4, 0, material));
    // North corridor (+Z): from z=15 to z=27
    meshes.push(makeFloorTile(0, 21, 4, 12, 0, material));
    // South corridor (-Z): from z=-15 to z=-27
    meshes.push(makeFloorTile(0, -21, 4, 12, 0, material));

    // ═══════════════════════════════════════════════════════════════
    //  3. Quadrant Alcoves (12×12 rooms at the end of each corridor)
    // ═══════════════════════════════════════════════════════════════
    // Q1 Alcove (Parabola Gallery): centered at (33, 0, 0) → extends 27-39
    meshes.push(makeFloorTile(33, 0, 12, 12, 0, material));
    // Q2 Alcove (Trig Observatory): centered at (-33, 0, 0) → extends -27 to -39
    meshes.push(makeFloorTile(-33, 0, 12, 12, 0, material));
    // Q3 Alcove (Reciprocal Chamber): centered at (0, 0, -33)
    meshes.push(makeFloorTile(0, -33, 12, 12, 0, material));
    // Q4 Alcove (Function Lab): centered at (0, 0, 33)
    meshes.push(makeFloorTile(0, 33, 12, 12, 0, material));

    // ═══════════════════════════════════════════════════════════════
    //  4. Raised platforms in each alcove (elevated observation decks)
    // ═══════════════════════════════════════════════════════════════
    const platformMat = material.clone();
    // Q1 platform at y=2
    meshes.push(makeFloorTile(33, 0, 6, 6, 2, platformMat));
    // Q2 platform at y=2
    meshes.push(makeFloorTile(-33, 0, 6, 6, 2, platformMat));
    // Q3 platform at y=2
    meshes.push(makeFloorTile(0, -33, 6, 6, 2, platformMat));
    // Q4 platform at y=2
    meshes.push(makeFloorTile(0, 33, 6, 6, 2, platformMat));

    // ═══════════════════════════════════════════════════════════════
    //  5. Corner nooks in the central arena (small raised areas in corners)
    // ═══════════════════════════════════════════════════════════════
    const cornerPositions = [
        { x: 11, z: 11 },   // Q1 corner
        { x: -11, z: 11 },  // Q2 corner
        { x: -11, z: -11 }, // Q3 corner
        { x: 11, z: -11 },  // Q4 corner
    ];
    for (const cp of cornerPositions) {
        meshes.push(makeFloorTile(cp.x, cp.z, 5, 5, 1, platformMat));
    }

    const rooms = {
        centralArena:  { cx: 0,   cz: 0,   halfW: 15, halfD: 15 },
        eastCorridor:  { cx: 21,  cz: 0,   halfW: 6,  halfD: 2  },
        westCorridor:  { cx: -21, cz: 0,   halfW: 6,  halfD: 2  },
        northCorridor: { cx: 0,   cz: 21,  halfW: 2,  halfD: 6  },
        southCorridor: { cx: 0,   cz: -21, halfW: 2,  halfD: 6  },
        q1Alcove:      { cx: 33,  cz: 0,   halfW: 6,  halfD: 6  },
        q2Alcove:      { cx: -33, cz: 0,   halfW: 6,  halfD: 6  },
        q3Alcove:      { cx: 0,   cz: -33, halfW: 6,  halfD: 6  },
        q4Alcove:      { cx: 0,   cz: 33,  halfW: 6,  halfD: 6  },
    };

    return { meshes, material, rooms };
}
