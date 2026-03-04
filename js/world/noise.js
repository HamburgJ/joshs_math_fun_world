/**
 * noise.js — Perlin noise terrain for the massive hub world.
 *
 * The hub is an oval valley (x-radius ~100, z-radius ~80) surrounded
 * by mountains. An approach corridor stretches south (z > 80) giving
 * the player a 30-40 second walk toward the glowing gate.
 *
 * Terrain regions:
 *   - Hub interior:  gentle rolling hills (0 – 3 units)
 *   - Approach path: gradual uphill slope leaving hub, flat corridor
 *   - Mountains:     dramatic peaks outside the oval (15 – 45 units)
 *   - Wall zone:     flattened to seat the perimeter wall
 */

const PERMUTATION = new Uint8Array([
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
    140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
    247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
    57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
    60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
    65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
    200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186,
    3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82,
    85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183,
    170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167,
    43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178,
    185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12,
    191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214,
    31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150,
    254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78,
    66, 215, 61, 156, 180,
]);

const P = new Uint8Array(512);
for (let i = 0; i < 512; i++) {
    P[i] = PERMUTATION[i & 255];
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    return a + t * (b - a);
}

function grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
}

function perlin2(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = P[P[xi] + yi];
    const ab = P[P[xi] + yi + 1];
    const ba = P[P[xi + 1] + yi];
    const bb = P[P[xi + 1] + yi + 1];

    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    const value = lerp(x1, x2, v);

    return value * 0.25;
}

function fbm2(x, z, octaves, baseFrequency, persistence) {
    let amplitude = 1;
    let frequency = baseFrequency;
    let sum = 0;
    let norm = 0;

    for (let i = 0; i < octaves; i++) {
        sum += perlin2(x * frequency, z * frequency) * amplitude;
        norm += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }

    return sum / Math.max(norm, 0.0001);
}

// ── Hub oval parameters ─────────────────────────────────────────────
const HUB_RX = 100;   // oval x-radius
const HUB_RZ = 80;    // oval z-radius
const WALL_THICKNESS = 8; // annular zone where the wall sits

/**
 * How far a point is from the hub oval edge.
 * <0 means inside, 0 on edge, >0 means outside.
 * Returned as normalized distance (oval equation value - 1).
 */
function ovalDist(x, z) {
    const nx = x / HUB_RX;
    const nz = z / HUB_RZ;
    return nx * nx + nz * nz - 1;
}

/**
 * Smooth clamped interpolation.
 */
function smoothstep(edge0, edge1, t) {
    const x = Math.max(0, Math.min(1, (t - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
}

export function getTerrainHeight(x, z) {
    // ── Base noise (broad hills) ────────────────────────────────────
    const broadHills = fbm2(x + 91.7, z - 12.3, 3, 0.006, 0.55) * 5.0;
    const detail = fbm2(x + 333.0, z + 444.0, 2, 0.025, 0.45) * 1.5;
    let h = broadHills + detail;

    const od = ovalDist(x, z);

    // ── Inside hub oval: gentle rolling terrain ─────────────────────
    if (od < 0) {
        // Flatten interior — keep gentle hills
        const interiorT = Math.max(0, -od); // 0 at edge, ~1 deep inside
        h = h * (0.25 + 0.15 * interiorT);  // scale down to gentle hills

        // Create some varied height districts inside the hub
        // North section: slightly elevated plateau
        if (z < -30) {
            const plateauT = smoothstep(-30, -55, z);
            h += plateauT * 3.5;
        }
        // East section: rolling hills
        if (x > 30 && z < 30 && z > -40) {
            h += Math.sin(x * 0.08) * Math.cos(z * 0.1) * 2.0;
        }
        // West section: gentle valley
        if (x < -40 && z < 20 && z > -30) {
            h -= smoothstep(-40, -70, x) * 2.0;
        }
        // Central area near origin: flatten for pond and plaza
        const centerDist = Math.sqrt(x * x + z * z);
        if (centerDist < 20) {
            const flattenT = smoothstep(20, 5, centerDist);
            h = h * (1 - flattenT * 0.7);
        }
        return h;
    }

    // ── Approach corridor (south of gate, z > 80) ───────────────────
    const corridorHalfW = 25;
    const isApproach = z > 70 && Math.abs(x) < corridorHalfW + 15;
    if (isApproach) {
        const approachT = smoothstep(80, 280, z); // 0 at gate, 1 at spawn
        const corridorX = smoothstep(corridorHalfW + 15, corridorHalfW, Math.abs(x));

        // Flat corridor floor with gentle uphill slope
        const corridorH = approachT * 3.0 + h * 0.15;

        // Mountain walls flanking the corridor
        const mountainH = (1 - corridorX) * (12 + fbm2(x + 200, z, 3, 0.01, 0.6) * 20);

        h = lerp(mountainH, corridorH, corridorX);
        return h;
    }

    // ── Wall zone: flatten for wall placement ───────────────────────
    if (od >= 0 && od < 0.15) {
        // Transition zone near wall — flatten
        const wallT = smoothstep(0, 0.15, od);
        h = h * 0.2 * (1 - wallT) + h * wallT;
        return h * 0.3;
    }

    // ── Mountains outside the oval ──────────────────────────────────
    const mountainStart = 0.15;
    const mountainT = smoothstep(mountainStart, 0.6, od);
    const mountainNoise = fbm2(x * 0.8 + 200, z * 0.8, 4, 0.008, 0.6);
    const peakHeight = 15 + Math.max(0, mountainNoise) * 35;
    h = h * 0.3 + mountainT * peakHeight;

    // Extra tall peaks at specific angles for landmarks
    const angle = Math.atan2(z, x);
    // NE mountain peak
    if (angle > 0.3 && angle < 1.2 && od > 0.3) {
        h += smoothstep(0.3, 0.8, od) * 12;
    }
    // NW mountain peak
    if (angle > 1.8 && angle < 2.8 && od > 0.3) {
        h += smoothstep(0.3, 0.8, od) * 15;
    }

    // ── Cave canyon — gorge through the NW mountain to the cave ─────
    // Carve a walkable canyon from the wall gap to the cave entrance
    const CAVE_CX = -55;          // canyon center x
    const CAVE_CANYON_W = 10;     // canyon half-width
    const CAVE_CANYON_Z0 = -66;   // start (near wall)
    const CAVE_CANYON_Z1 = -125;  // end (past cave deep end)
    if (z < CAVE_CANYON_Z0 && z > CAVE_CANYON_Z1) {
        const ct = (z - CAVE_CANYON_Z0) / (CAVE_CANYON_Z1 - CAVE_CANYON_Z0); // 0→1 going deeper
        // Canyon center follows the tunnel curve
        const cxCenter = CAVE_CX + Math.sin(ct * Math.PI * 0.8) * -4;
        const cdx = Math.abs(x - cxCenter);
        if (cdx < CAVE_CANYON_W) {
            // Canyon floor: gently descends as you go deeper
            const canyonFloor = 1.0 - ct * 4.0;
            // Smooth canyon walls: blend from mountain height to floor
            const wallBlend = smoothstep(CAVE_CANYON_W - 3, CAVE_CANYON_W, cdx);
            h = lerp(canyonFloor, h, wallBlend);
        }
    }

    return h;
}

export function getTerrainColorFactor(x, z) {
    const od = ovalDist(x, z);

    // Inside hub: lush green variation
    if (od < 0) {
        const base = fbm2(x - 53.0, z + 71.0, 3, 0.015, 0.5);
        return (base + 1) * 0.5;
    }

    // Approach corridor
    if (z > 70 && Math.abs(x) < 40) {
        return 0.3 + fbm2(x + 10, z - 20, 2, 0.02, 0.5) * 0.3;
    }

    // Mountains: darker, rocky
    return 0.15 + fbm2(x - 53.0, z + 71.0, 2, 0.01, 0.5) * 0.2;
}
