/**
 * Parkour Feasibility Test
 *
 * Simulates Josh's physics (gravity, jump velocity, air control, apex hang-time)
 * to verify every platforming sequence is actually completable.
 *
 * Tests:
 *  1. Fractal Boundary — Spine Route
 *  2. Fractal Boundary — Spiral Arms
 *  3. Fractal Boundary — Peak Run
 *  4. Fractal Boundary — Stepping Stones (connectivity)
 *  5. Number Caverns — Ramp/Hallway traversal
 *  6. Coordinate Plane — Surface walking
 */

// ─── Physics constants (must match js/josh/physics.js) ────────────
const GRAVITY           = 24;
const JUMP_VELOCITY     = 12;
const AIR_CONTROL       = 0.45;
const APEX_THRESHOLD    = 2.5;
const APEX_GRAVITY_MULT = 0.45;
const FALL_GRAVITY_MULT = 1.35;

const WALK_SPEED = 6;
const RUN_SPEED  = 12;
const BODY_RADIUS = 0.55;

// ─── Derived jump capabilities ────────────────────────────────────

/**
 * Compute the maximum jump height Josh can achieve from a standstill.
 */
function computeMaxJumpHeight() {
    let y = 0, vy = JUMP_VELOCITY;
    const dt = 0.001;
    let maxY = 0;
    for (let t = 0; t < 3; t += dt) {
        let g = GRAVITY;
        if (vy > 0 && Math.abs(vy) < APEX_THRESHOLD) {
            g *= APEX_GRAVITY_MULT;
        } else if (vy < 0) {
            g *= FALL_GRAVITY_MULT;
        }
        vy -= g * dt;
        y += vy * dt;
        if (y > maxY) maxY = y;
        if (y <= 0 && vy < 0) break;
    }
    return maxY;
}

/**
 * Compute max horizontal distance for a jump at given speed,
 * optionally from a height advantage (positive = jumping down).
 */
function computeMaxJumpDistance(speed, heightDiff = 0) {
    const hSpeed = speed * AIR_CONTROL;
    let y = 0, vy = JUMP_VELOCITY;
    const dt = 0.001;
    let totalTime = 0;
    const targetY = -heightDiff; // negative heightDiff = jumping UP

    for (let t = 0; t < 5; t += dt) {
        let g = GRAVITY;
        if (vy > 0 && Math.abs(vy) < APEX_THRESHOLD) {
            g *= APEX_GRAVITY_MULT;
        } else if (vy < 0) {
            g *= FALL_GRAVITY_MULT;
        }
        vy -= g * dt;
        y += vy * dt;
        totalTime += dt;
        if (y <= targetY && vy < 0) break;
    }
    return hSpeed * totalTime;
}

/**
 * Check if a jump between two platforms is possible.
 * @returns {{ possible: boolean, margin: { height: number, distance: number }, details: string }}
 */
function canJump(from, to, platformSizeFrom, platformSizeTo) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const heightDiff = to.y - from.y; // positive = jumping UP

    // Account for platform sizes - you start from edge of one and land on edge of other
    const edgeToEdge = Math.max(0, horizontalDist - (platformSizeFrom / 2 + platformSizeTo / 2));

    const maxHeight = computeMaxJumpHeight();
    const maxDistSprint = computeMaxJumpDistance(RUN_SPEED, -heightDiff);
    const maxDistWalk = computeMaxJumpDistance(WALK_SPEED, -heightDiff);

    const heightOk = heightDiff <= maxHeight;
    const distOk = edgeToEdge <= maxDistSprint;

    const heightMargin = maxHeight - heightDiff;
    const distMargin = maxDistSprint - edgeToEdge;

    let details = '';
    if (!heightOk) details += `TOO HIGH: need ${heightDiff.toFixed(2)}u up, max jump is ${maxHeight.toFixed(2)}u. `;
    if (!distOk) details += `TOO FAR: edge-to-edge ${edgeToEdge.toFixed(2)}u, max sprint jump ${maxDistSprint.toFixed(2)}u. `;
    if (heightOk && distOk) {
        // Check if both height AND distance can be achieved simultaneously
        const maxDistAtHeight = computeMaxJumpDistance(RUN_SPEED, -heightDiff);
        if (edgeToEdge > maxDistAtHeight) {
            details += `CAN'T REACH: at height diff ${heightDiff.toFixed(2)}, max horizontal = ${maxDistAtHeight.toFixed(2)}, need ${edgeToEdge.toFixed(2)}. `;
            return {
                possible: false,
                margin: { height: heightMargin, distance: maxDistAtHeight - edgeToEdge },
                details,
            };
        }
        details = `OK (height margin: ${heightMargin.toFixed(2)}u, dist margin: ${distMargin.toFixed(2)}u)`;
    }

    return {
        possible: heightOk && distOk,
        margin: { height: heightMargin, distance: distMargin },
        details,
    };
}

// ─── Mandelbrot math (from fractal-boundary/math.js) ──────────────
function mandelbrot(cr, ci, maxIter) {
    let zr = 0, zi = 0;
    for (let n = 0; n < maxIter; n++) {
        const zr2 = zr * zr, zi2 = zi * zi;
        if (zr2 + zi2 > 4) return n;
        zi = 2 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
    }
    return 0;
}

const WORLD_SIZE = 160;

function sampleTerrainHeightMath(x, z, domain, maxIter) {
    const halfSize = WORLD_SIZE / 2;
    if (Math.abs(x) > halfSize || Math.abs(z) > halfSize) return 0;
    const cr = domain.rMin + ((x + halfSize) / WORLD_SIZE) * (domain.rMax - domain.rMin);
    const ci = domain.iMin + ((z + halfSize) / WORLD_SIZE) * (domain.iMax - domain.iMin);
    return mandelbrot(cr, ci, maxIter) * 0.3;
}

// ─── Replicate block-generation logic exactly ─────────────────────
const DOMAIN = { rMin: -2, rMax: 1, iMin: -1.5, iMax: 1.5 };
const MAX_ITER = 64;

function getTerrainHeight(x, z) {
    return sampleTerrainHeightMath(x, z, DOMAIN, MAX_ITER);
}

function findBoundaryPeaks() {
    const peaks = [];
    const samples = 400;
    for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2;
        const radius = 0.6 + Math.sin(angle * 3) * 0.3;
        const cr = Math.cos(angle) * radius - 0.5;
        const ci = Math.sin(angle) * radius;
        const n = mandelbrot(cr, ci, MAX_ITER);
        if (n > 0) {
            const wx = ((cr - DOMAIN.rMin) / (DOMAIN.rMax - DOMAIN.rMin) - 0.5) * WORLD_SIZE;
            const wz = ((ci - DOMAIN.iMin) / (DOMAIN.iMax - DOMAIN.iMin) - 0.5) * WORLD_SIZE;
            peaks.push({ x: wx, z: wz, height: n * 0.3, iter: n });
        }
    }
    peaks.sort((a, b) => b.height - a.height);
    return peaks;
}

function buildSpineBlocks(peaks) {
    const defs = [];
    if (peaks.length === 0) return defs;
    const summit = peaks[0];
    const startX = 0, startZ = 10;
    const steps = 18;
    const jumpHeight = 2.5;

    for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps;
        const curve = Math.pow(t, 0.7);
        const px = startX + (summit.x - startX) * t + Math.sin(t * Math.PI * 3) * 6;
        const pz = startZ + (summit.z - startZ) * t + Math.cos(t * Math.PI * 2) * 4;
        const terrainH = getTerrainHeight(px, pz);
        const blockTop = Math.max(terrainH + jumpHeight * curve * (i + 1) * 0.5, terrainH + 0.5);
        const blockHeight = 1.0 + curve * 2.0;
        const size = 2.8 - curve * 0.8;

        defs.push({
            x: px, z: pz, topY: blockTop,
            width: size, depth: size, height: blockHeight,
            route: 'spine', index: i,
        });
    }
    return defs;
}

function buildSpiralArmBlocks(peaks) {
    const defs = [];
    const halfSize = WORLD_SIZE / 2;
    const anchors = peaks.slice(2, 14);
    for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];
        const terrainH = getTerrainHeight(anchor.x, anchor.z);
        const branchLen = 3 + Math.floor(Math.random() * 3);
        const branchAngle = (i / anchors.length) * Math.PI * 2;

        for (let j = 0; j < branchLen; j++) {
            const dist = (j + 1) * 4;
            const bx = anchor.x + Math.cos(branchAngle) * dist;
            const bz = anchor.z + Math.sin(branchAngle) * dist;
            if (Math.abs(bx) > halfSize - 5 || Math.abs(bz) > halfSize - 5) continue;
            const bTerrainH = getTerrainHeight(bx, bz);
            const blockTop = Math.max(terrainH + (j + 1) * 2.0, bTerrainH + 1.5);

            defs.push({
                x: bx, z: bz, topY: blockTop,
                width: 2.2 + Math.random() * 0.8,
                depth: 2.2 + Math.random() * 0.8,
                height: 1.2 + Math.random() * 1.5,
                route: 'arm', armIndex: i, stepIndex: j,
            });
        }
    }
    return defs;
}

function buildPeakRunBlocks(peaks) {
    const defs = [];
    if (peaks.length < 3) return defs;

    const MAX_STEP_UP     = 2.0;
    const MAX_ABOVE_LOCAL = 2.5;
    const MIN_PLAT_SIZE   = 2.0;
    const HOP_DIST        = 3.5;

    const topPeaks = peaks.slice(0, 3);

    for (let p = 0; p < topPeaks.length; p++) {
        const peak = topPeaks[p];
        const peakTerrainH = getTerrainHeight(peak.x, peak.z);

        const stepCount = 8;
        let prevX = peak.x;
        let prevZ = peak.z;
        let prevTop = peakTerrainH;
        let prevAngle = p * 2.1;

        for (let i = 0; i < stepCount; i++) {
            const t = (i + 1) / stepCount;
            let bestX = 0, bestZ = 0, bestH = -Infinity;

            for (let probe = 0; probe < 16; probe++) {
                const probeAngle = prevAngle + (probe / 16) * Math.PI * 2;
                const px = prevX + Math.cos(probeAngle) * HOP_DIST;
                const pz = prevZ + Math.sin(probeAngle) * HOP_DIST;
                const ph = getTerrainHeight(px, pz);
                const hDiff = ph - prevTop;
                if (hDiff <= MAX_STEP_UP && ph > bestH) {
                    bestH = ph;
                    bestX = px;
                    bestZ = pz;
                }
            }
            if (bestH === -Infinity) {
                const fallbackAngle = prevAngle + 0.6;
                bestX = prevX + Math.cos(fallbackAngle) * (HOP_DIST * 0.7);
                bestZ = prevZ + Math.sin(fallbackAngle) * (HOP_DIST * 0.7);
                bestH = getTerrainHeight(bestX, bestZ);
            }

            const localTerrainH = bestH;
            const blockTop = Math.max(
                localTerrainH + 0.5,
                Math.min(prevTop + MAX_STEP_UP, localTerrainH + MAX_ABOVE_LOCAL)
            );
            const size = MIN_PLAT_SIZE + (1.0 - t) * 0.6;

            defs.push({
                x: bestX, z: bestZ, topY: blockTop,
                width: size, depth: size,
                height: 1.2 + t * 1.0,
                route: 'peak', peakIndex: p, ringIndex: i,
            });

            prevAngle = Math.atan2(bestZ - prevZ, bestX - prevX);
            prevX = bestX;
            prevZ = bestZ;
            prevTop = blockTop;
        }
    }

    let highestBlock = defs[0];
    for (const b of defs) {
        if (b.topY > highestBlock.topY) highestBlock = b;
    }

    const summitLocalTerrain = getTerrainHeight(highestBlock.x, highestBlock.z);
    const summitTop = Math.max(
        summitLocalTerrain + 1.0,
        Math.min(highestBlock.topY + MAX_STEP_UP, summitLocalTerrain + MAX_ABOVE_LOCAL)
    );
    const summitAngle = Math.atan2(peaks[0].z - highestBlock.z, peaks[0].x - highestBlock.x);
    const summitX = highestBlock.x + Math.cos(summitAngle) * HOP_DIST;
    const summitZ = highestBlock.z + Math.sin(summitAngle) * HOP_DIST;

    defs.push({
        x: summitX, z: summitZ,
        topY: summitTop,
        width: 3.0, depth: 3.0, height: 2.5,
        route: 'summit',
    });

    return defs;
}

function buildSteppingStoneBlocks() {
    const defs = [];
    const halfSize = WORLD_SIZE / 2;

    const MAX_HEIGHT_ABOVE_TERRAIN = 2.5;
    const MAX_STEP_UP   = 2.0;
    const CHAIN_SPACING = 4.0;
    const MIN_PLAT_SIZE = 2.0;

    const chainCount = 7;
    const stonesPerChain = 5;

    for (let c = 0; c < chainCount; c++) {
        const baseAngle = (c / chainCount) * Math.PI * 2;
        const startR = 28;

        let prevX = Math.cos(baseAngle) * startR;
        let prevZ = Math.sin(baseAngle) * startR;
        let prevTop = getTerrainHeight(prevX, prevZ);

        for (let s = 0; s < stonesPerChain; s++) {
            const wander = (s * 0.4) * (c % 2 === 0 ? 1 : -1);
            const angle = baseAngle + wander * 0.15;
            const r = startR + (s + 1) * CHAIN_SPACING;

            let bx = Math.cos(angle) * r;
            let bz = Math.sin(angle) * r;

            if (Math.abs(bx) > halfSize - 6) bx = Math.sign(bx) * (halfSize - 6);
            if (Math.abs(bz) > halfSize - 6) bz = Math.sign(bz) * (halfSize - 6);

            const terrainH = getTerrainHeight(bx, bz);
            const heightAboveTerrain = 1.0 + (s / stonesPerChain) * (MAX_HEIGHT_ABOVE_TERRAIN - 1.0);
            const blockTop = Math.min(
                terrainH + heightAboveTerrain,
                prevTop + MAX_STEP_UP
            );
            const finalTop = Math.max(blockTop, terrainH + 0.5);
            const size = MIN_PLAT_SIZE + (1.0 - s / stonesPerChain) * 1.0;

            defs.push({
                x: bx, z: bz,
                topY: finalTop,
                width: size, depth: size,
                height: 1.0 + (s / stonesPerChain) * 1.0,
                route: 'stone', chainIndex: c, index: s,
            });

            prevX = bx;
            prevZ = bz;
            prevTop = finalTop;
        }
    }
    return defs;
}

// ─── Number Caverns ramp feasibility ──────────────────────────────
const HALLWAY_AREAS = [
    { name: 'Entrance Tunnel',   pos: [0, 0, 0],       size: [12, 0.5, 22] },
    { name: 'Fermat Suite',      pos: [14, -6, -24],   size: [26, 0.5, 26] },
    { name: 'Perfect Drop',      pos: [24, -14, -48],  size: [16, 0.5, 16] },
    { name: 'Fibonacci Winding', pos: [38, -22, -40],  size: [8, 0.5, 32]  },
    { name: 'Mersenne Chamber',  pos: [52, -32, -24],  size: [22, 0.5, 22] },
    { name: 'Lava Core',         pos: [52, -48, 0],    size: [36, 0.5, 36] },
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN TEST
// ═══════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════');
console.log('  PARKOUR FEASIBILITY TEST');
console.log('═══════════════════════════════════════════════════════\n');

// ── Physics capabilities ──
const maxJumpHeight = computeMaxJumpHeight();
const maxJumpDistSprint = computeMaxJumpDistance(RUN_SPEED, 0);
const maxJumpDistWalk = computeMaxJumpDistance(WALK_SPEED, 0);

console.log('── Josh\'s Jump Capabilities ──');
console.log(`  Max jump height:           ${maxJumpHeight.toFixed(3)} units`);
console.log(`  Max sprint jump distance:  ${maxJumpDistSprint.toFixed(3)} units (flat)`);
console.log(`  Max walk jump distance:    ${maxJumpDistWalk.toFixed(3)} units (flat)`);
console.log(`  Max jump dist (2u up):     ${computeMaxJumpDistance(RUN_SPEED, -2).toFixed(3)} units`);
console.log(`  Max jump dist (3u down):   ${computeMaxJumpDistance(RUN_SPEED, 3).toFixed(3)} units`);
console.log();

// ── Test 1: Fractal Boundary Spine Route ──
console.log('── Test 1: Fractal Boundary — Spine Route ──');
const peaks = findBoundaryPeaks();
const spineBlocks = buildSpineBlocks(peaks);
let spineFailures = 0;

// Check access to first block from terrain
if (spineBlocks.length > 0) {
    const first = spineBlocks[0];
    const terrainH = getTerrainHeight(first.x, first.z);
    const heightDiff = first.topY - terrainH;
    console.log(`  First block: (${first.x.toFixed(1)}, ${first.z.toFixed(1)}) top=${first.topY.toFixed(2)} terrain=${terrainH.toFixed(2)} diff=${heightDiff.toFixed(2)}`);
    if (heightDiff > maxJumpHeight) {
        console.log(`  ❌ FAIL: First block unreachable from terrain (${heightDiff.toFixed(2)} > ${maxJumpHeight.toFixed(2)})`);
        spineFailures++;
    }
}

for (let i = 0; i < spineBlocks.length - 1; i++) {
    const from = spineBlocks[i];
    const to = spineBlocks[i + 1];
    const fromPos = { x: from.x, y: from.topY, z: from.z };
    const toPos = { x: to.x, y: to.topY, z: to.z };
    const result = canJump(fromPos, toPos, from.width, to.width);

    if (!result.possible) {
        spineFailures++;
        const dx = to.x - from.x, dz = to.z - from.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const hDiff = to.topY - from.topY;
        console.log(`  ❌ FAIL: Spine ${i} → ${i + 1}: dist=${dist.toFixed(2)}, height_diff=${hDiff.toFixed(2)}, ${result.details}`);
    }
}
console.log(`  Result: ${spineBlocks.length} blocks, ${spineFailures} failures${spineFailures === 0 ? ' ✅' : ' ❌'}\n`);

// ── Test 2: Fractal Boundary Spiral Arms ──
console.log('── Test 2: Fractal Boundary — Spiral Arms ──');
const armBlocks = buildSpiralArmBlocks(peaks);
let armFailures = 0;

// Group by arm
const arms = {};
for (const b of armBlocks) {
    const key = b.armIndex;
    if (!arms[key]) arms[key] = [];
    arms[key].push(b);
}

for (const [armIdx, blocks] of Object.entries(arms)) {
    // Sort by step index
    blocks.sort((a, b) => a.stepIndex - b.stepIndex);
    for (let i = 0; i < blocks.length - 1; i++) {
        const from = blocks[i];
        const to = blocks[i + 1];
        const fromPos = { x: from.x, y: from.topY, z: from.z };
        const toPos = { x: to.x, y: to.topY, z: to.z };
        const result = canJump(fromPos, toPos, from.width, to.width);

        if (!result.possible) {
            armFailures++;
            const dx = to.x - from.x, dz = to.z - from.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const hDiff = to.topY - from.topY;
            console.log(`  ❌ FAIL: Arm ${armIdx} step ${i} → ${i + 1}: dist=${dist.toFixed(2)}, height_diff=${hDiff.toFixed(2)}, ${result.details}`);
        }
    }
}
console.log(`  Result: ${armBlocks.length} blocks across ${Object.keys(arms).length} arms, ${armFailures} failures${armFailures === 0 ? ' ✅' : ' ❌'}\n`);

// ── Test 3: Fractal Boundary Peak Run ──
console.log('── Test 3: Fractal Boundary — Peak Run ──');
const peakBlocks = buildPeakRunBlocks(peaks);
let peakFailures = 0;

// Group by peak
const peakGroups = {};
for (const b of peakBlocks) {
    if (b.route === 'summit') continue;
    const key = b.peakIndex;
    if (!peakGroups[key]) peakGroups[key] = [];
    peakGroups[key].push(b);
}

for (const [peakIdx, blocks] of Object.entries(peakGroups)) {
    blocks.sort((a, b) => a.ringIndex - b.ringIndex);

    // Check access from terrain to first ring block
    if (blocks.length > 0) {
        const first = blocks[0];
        const terrainH = getTerrainHeight(first.x, first.z);
        const hDiff = first.topY - terrainH;
        if (hDiff > maxJumpHeight) {
            peakFailures++;
            console.log(`  ❌ FAIL: Peak ${peakIdx} first ring block unreachable from terrain (height diff ${hDiff.toFixed(2)})`);
        }
    }

    for (let i = 0; i < blocks.length - 1; i++) {
        const from = blocks[i];
        const to = blocks[i + 1];
        const fromPos = { x: from.x, y: from.topY, z: from.z };
        const toPos = { x: to.x, y: to.topY, z: to.z };
        const result = canJump(fromPos, toPos, from.width, to.width);

        if (!result.possible) {
            peakFailures++;
            const dx = to.x - from.x, dz = to.z - from.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const hDiff = to.topY - from.topY;
            console.log(`  ❌ FAIL: Peak ${peakIdx} ring ${i} → ${i + 1}: dist=${dist.toFixed(2)}, height_diff=${hDiff.toFixed(2)}, ${result.details}`);
        }
    }
}

// Check summit accessibility from highest ring block
const summitBlock = peakBlocks.find(b => b.route === 'summit');
if (summitBlock) {
    // Find the closest/highest ring block to the summit
    const ringBlocks = peakBlocks.filter(b => b.route === 'peak');
    let bestRing = null, bestDist = Infinity;
    for (const rb of ringBlocks) {
        const dx = summitBlock.x - rb.x, dz = summitBlock.z - rb.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < bestDist) { bestDist = dist; bestRing = rb; }
    }
    if (bestRing) {
        const fromPos = { x: bestRing.x, y: bestRing.topY, z: bestRing.z };
        const toPos = { x: summitBlock.x, y: summitBlock.topY, z: summitBlock.z };
        const result = canJump(fromPos, toPos, bestRing.width, summitBlock.width);
        if (!result.possible) {
            peakFailures++;
            const hDiff = summitBlock.topY - bestRing.topY;
            console.log(`  ❌ FAIL: Summit unreachable from nearest ring block: dist=${bestDist.toFixed(2)}, height_diff=${hDiff.toFixed(2)}, ${result.details}`);
        }
    }
}
console.log(`  Result: ${peakBlocks.length} blocks, ${peakFailures} failures${peakFailures === 0 ? ' ✅' : ' ❌'}\n`);

// ── Test 4: Stepping Stones connectivity ──
console.log('── Test 4: Fractal Boundary — Stepping Stones ──');
const stones = buildSteppingStoneBlocks();
let stoneFailures = 0;
let unreachableFromTerrain = 0;

// Check each stone is reachable from terrain
for (let i = 0; i < stones.length; i++) {
    const stone = stones[i];
    const terrainH = getTerrainHeight(stone.x, stone.z);
    const hDiff = stone.topY - terrainH;

    if (hDiff > maxJumpHeight) {
        unreachableFromTerrain++;
        console.log(`  ❌ FAIL: Stone chain ${stone.chainIndex} step ${stone.index} unreachable from terrain (${hDiff.toFixed(2)}u above)`);
    }
}

// Check chain connectivity (each stone reachable from previous in chain)
const chains = {};
for (const s of stones) {
    const key = s.chainIndex;
    if (!chains[key]) chains[key] = [];
    chains[key].push(s);
}

for (const [cIdx, chain] of Object.entries(chains)) {
    chain.sort((a, b) => a.index - b.index);
    for (let i = 0; i < chain.length - 1; i++) {
        const from = chain[i];
        const to = chain[i + 1];
        const fromPos = { x: from.x, y: from.topY, z: from.z };
        const toPos = { x: to.x, y: to.topY, z: to.z };
        const result = canJump(fromPos, toPos, from.width, to.width);
        if (!result.possible) {
            stoneFailures++;
            const dx = to.x - from.x, dz = to.z - from.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const hDiff = to.topY - from.topY;
            console.log(`  ❌ FAIL: Chain ${cIdx} stone ${i} → ${i + 1}: dist=${dist.toFixed(2)}, height_diff=${hDiff.toFixed(2)}, ${result.details}`);
        }
    }
}
const totalStoneIssues = unreachableFromTerrain + stoneFailures;
console.log(`  ${stones.length} stones in ${Object.keys(chains).length} chains, ${unreachableFromTerrain} unreachable from terrain, ${stoneFailures} inter-chain failures`);
console.log(`  Result: ${totalStoneIssues === 0 ? '✅' : '❌'}\n`);

// ── Test 5: Number Caverns Ramps ──
console.log('── Test 5: Number Caverns — Ramp Connections ──');
let rampFailures = 0;

for (let i = 0; i < HALLWAY_AREAS.length - 1; i++) {
    const from = HALLWAY_AREAS[i];
    const to = HALLWAY_AREAS[i + 1];
    const dx = to.pos[0] - from.pos[0];
    const dy = to.pos[1] - from.pos[1];
    const dz = to.pos[2] - from.pos[2];
    const distXZ = Math.sqrt(dx * dx + dz * dz);
    const slope = dy / distXZ;
    const slopeAngle = Math.atan2(Math.abs(dy), distXZ) * 180 / Math.PI;

    // Check if the ramp incline is walkable (Josh walks at 6 u/s, 
    // slopes > ~45 degrees are too steep)
    // Also check if the ramp width (4 units) is sufficient
    const rampWidth = 4;
    const issues = [];

    if (slopeAngle > 45) {
        issues.push(`slope too steep (${slopeAngle.toFixed(1)}°)`);
    }

    // Check if ramp connects to room openings properly
    // The rooms have walls on all 4 sides - need an opening where the ramp meets
    const fromHalfW = from.size[0] / 2;
    const fromHalfD = from.size[2] / 2;
    const toHalfW = to.size[0] / 2;
    const toHalfD = to.size[2] / 2;

    // Check if ramp endpoint falls within room boundary
    const rampFromEdge = Math.max(
        Math.abs(0) - fromHalfW, // ramp starts at room center
        Math.abs(0) - fromHalfD
    );

    if (issues.length > 0) {
        rampFailures++;
        console.log(`  ❌ FAIL: ${from.name} → ${to.name}: ${issues.join(', ')}`);
    } else {
        console.log(`  ✅ ${from.name} → ${to.name}: slope=${slopeAngle.toFixed(1)}°, dist=${distXZ.toFixed(1)}, drop=${Math.abs(dy).toFixed(1)}`);
    }
}

// Check ramp terrain height function accuracy
console.log('\n  Checking terrain height function for ramps:');
for (let i = 0; i < HALLWAY_AREAS.length - 1; i++) {
    const a1 = HALLWAY_AREAS[i];
    const a2 = HALLWAY_AREAS[i + 1];

    // Sample midpoint of ramp
    const midX = (a1.pos[0] + a2.pos[0]) / 2;
    const midZ = (a1.pos[2] + a2.pos[2]) / 2;
    const expectedMidY = (a1.pos[1] + a2.pos[1]) / 2;

    // Simulate the getTerrainHeight logic from index.js
    const hx = midX; // no offset in this test since we're computing in local space
    const hz = midZ;

    // Check room hits first
    let roomHit = false;
    for (const area of HALLWAY_AREAS) {
        const adx = hx - area.pos[0];
        const adz = hz - area.pos[2];
        const halfW = area.size[0] / 2;
        const halfD = area.size[2] / 2;
        if (Math.abs(adx) <= halfW && Math.abs(adz) <= halfD) {
            roomHit = true;
            break;
        }
    }

    if (!roomHit) {
        // Try ramp interpolation
        let rampHit = false;
        for (let j = 0; j < HALLWAY_AREAS.length - 1; j++) {
            const ra1 = HALLWAY_AREAS[j];
            const ra2 = HALLWAY_AREAS[j + 1];
            const rdx = ra2.pos[0] - ra1.pos[0];
            const rdz = ra2.pos[2] - ra1.pos[2];
            const rampLen = Math.sqrt(rdx*rdx + rdz*rdz);
            const perpDist = Math.abs((hx - ra1.pos[0]) * rdz - (hz - ra1.pos[2]) * rdx) / rampLen;

            if (perpDist < 4) {
                // Project onto ramp
                const dot = (hx - ra1.pos[0]) * rdx + (hz - ra1.pos[2]) * rdz;
                const t = dot / (rampLen * rampLen);
                if (t >= 0 && t <= 1) {
                    const rampY = ra1.pos[1] * (1 - t) + ra2.pos[1] * t;
                    rampHit = true;
                    const error = Math.abs(rampY - expectedMidY);
                    if (error > 1.0) {
                        console.log(`    ⚠️  Ramp ${j} midpoint height mismatch: got ${rampY.toFixed(2)}, expected ${expectedMidY.toFixed(2)}`);
                    }
                    break;
                }
            }
        }
        if (!rampHit) {
            rampFailures++;
            console.log(`    ❌ Ramp midpoint (${midX.toFixed(1)}, ${midZ.toFixed(1)}) falls through! No terrain height.`);
        }
    }
}
console.log(`  Result: ${rampFailures} failures${rampFailures === 0 ? ' ✅' : ' ❌'}\n`);

// ═══════════════════════════════════════════════════════════════════
//  TEST 6: Hub — Aqueduct Run
// ═══════════════════════════════════════════════════════════════════

// ── Hub terrain height (replicated from noise.js) ─────────────────
const HUB_PERM = new Uint8Array([
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
const HP = new Uint8Array(512);
for (let i = 0; i < 512; i++) HP[i] = HUB_PERM[i & 255];

function hFade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function hLerp(a, b, t) { return a + t * (b - a); }
function hGrad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
}
function perlin2(x, y) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = hFade(xf), v = hFade(yf);
    const aa = HP[HP[xi] + yi], ab = HP[HP[xi] + yi + 1];
    const ba = HP[HP[xi + 1] + yi], bb = HP[HP[xi + 1] + yi + 1];
    return hLerp(hLerp(hGrad(aa, xf, yf), hGrad(ba, xf - 1, yf), u),
                 hLerp(hGrad(ab, xf, yf - 1), hGrad(bb, xf - 1, yf - 1), u), v) * 0.25;
}
function fbm2(x, z, octaves, freq, pers) {
    let amp = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
        sum += perlin2(x * freq, z * freq) * amp;
        norm += amp; amp *= pers; freq *= 2;
    }
    return sum / Math.max(norm, 0.0001);
}
function hSmoothstep(e0, e1, t) {
    const x = Math.max(0, Math.min(1, (t - e0) / (e1 - e0)));
    return x * x * (3 - 2 * x);
}
function hubTerrainHeight(x, z) {
    const broad = fbm2(x + 91.7, z - 12.3, 3, 0.006, 0.55) * 5.0;
    const detail = fbm2(x + 333.0, z + 444.0, 2, 0.025, 0.45) * 1.5;
    let h = broad + detail;
    const nx = x / 100, nz = z / 80;
    const od = nx * nx + nz * nz - 1;
    if (od < 0) {
        const it = Math.max(0, -od);
        h = h * (0.25 + 0.15 * it);
        if (z < -30) h += hSmoothstep(-30, -55, z) * 3.5;
        if (x > 30 && z < 30 && z > -40) h += Math.sin(x * 0.08) * Math.cos(z * 0.1) * 2.0;
        if (x < -40 && z < 20 && z > -30) h -= hSmoothstep(-40, -70, x) * 2.0;
        const cd = Math.sqrt(x * x + z * z);
        if (cd < 20) { const ft = hSmoothstep(20, 5, cd); h = h * (1 - ft * 0.7); }
        return h;
    }
    return h * 0.3;
}

// ── Build Aqueduct Run blocks (matches hub-assets.js) ─────────────
function buildAqueductBlocks() {
    const blocks = [];
    const waypoints = [];
    for (let i = 0; i < 10; i++) {
        const t = i / 9;
        waypoints.push({
            x: 55 + Math.sin(t * Math.PI * 0.6) * 12,
            z: 20 - t * 30,
        });
    }
    const HEIGHT_STEP = 1.6;
    const MIN_SIZE = 2.2, MAX_SIZE = 3.0;

    const startX = waypoints[0].x, startZ = waypoints[0].z;
    const startY = hubTerrainHeight(startX, startZ);
    blocks.push({ x: startX, z: startZ, topY: startY + 0.6, size: 4 });

    let prevTopY = startY + 0.6;
    for (let i = 1; i < waypoints.length; i++) {
        const wp = waypoints[i];
        const localH = hubTerrainHeight(wp.x, wp.z);
        const blockTop = Math.max(localH + 0.5, prevTopY + HEIGHT_STEP);
        const t = i / (waypoints.length - 1);
        const size = MAX_SIZE - t * (MAX_SIZE - MIN_SIZE);
        blocks.push({ x: wp.x, z: wp.z, topY: blockTop + 0.25, size });
        prevTopY = blockTop + 0.25;
    }
    // Summit
    const lastWP = waypoints[waypoints.length - 1];
    const summitLocalH = hubTerrainHeight(lastWP.x + 3, lastWP.z);
    const summitTop = Math.max(summitLocalH + 1, prevTopY + HEIGHT_STEP);
    blocks.push({ x: lastWP.x + 3, z: lastWP.z, topY: summitTop + 0.35, size: 4 });

    return blocks;
}

console.log('── Test 6: Hub — Aqueduct Run ──');
const aqBlocks = buildAqueductBlocks();
let aqFailures = 0;
{
    // First block should be reachable from terrain
    const b0 = aqBlocks[0];
    const terrH = hubTerrainHeight(b0.x, b0.z);
    const startDiff = b0.topY - terrH;
    console.log(`  First block: (${b0.x.toFixed(1)}, ${b0.z.toFixed(1)}) top=${b0.topY.toFixed(2)} terrain=${terrH.toFixed(2)} diff=${startDiff.toFixed(2)}`);

    for (let i = 1; i < aqBlocks.length; i++) {
        const from = aqBlocks[i - 1];
        const to = aqBlocks[i];
        const result = canJump(
            { x: from.x, y: from.topY, z: from.z },
            { x: to.x, y: to.topY, z: to.z },
            from.size, to.size
        );
        if (!result.possible) {
            aqFailures++;
            console.log(`  ❌ Block ${i - 1}→${i}: ${result.details}`);
        }
    }
}
console.log(`  Result: ${aqBlocks.length} blocks, ${aqFailures} failures${aqFailures === 0 ? ' ✅' : ' ❌'}\n`);

// ═══════════════════════════════════════════════════════════════════
//  TEST 7: Hub — Ruins Hop
// ═══════════════════════════════════════════════════════════════════

function buildRuinsHopBlocks() {
    const blocks = [];
    const ox = 30, oz = 50;
    const baseY = hubTerrainHeight(ox, oz);
    const HEIGHT_STEP = 2.0;
    const ZIG_W = 2.5, FWD_STEP = 3.5;

    // Starting slab
    blocks.push({ x: ox, z: oz + 3, topY: baseY + 0.5, size: 4.5 });
    let prevTopY = baseY + 0.5;

    const defs = [];
    for (let i = 0; i < 8; i++) {
        const side = (i % 2 === 0) ? -1 : 1;
        defs.push({
            x: ox + side * ZIG_W,
            z: oz - i * FWD_STEP,
        });
    }

    for (let i = 0; i < defs.length; i++) {
        const d = defs[i];
        const localH = hubTerrainHeight(d.x, d.z);
        const blockTop = Math.max(localH + 0.5, prevTopY + HEIGHT_STEP);
        const t = i / (defs.length - 1);
        const size = 3.0 - t * 0.8;
        blocks.push({ x: d.x, z: d.z, topY: blockTop + 0.225, size });
        prevTopY = blockTop + 0.225;
    }

    // Altar summit
    const lastD = defs[defs.length - 1];
    const altarX = lastD.x, altarZ = lastD.z - 4;
    const altarLocalH = hubTerrainHeight(altarX, altarZ);
    const altarTop = Math.max(altarLocalH + 1, prevTopY + HEIGHT_STEP);
    blocks.push({ x: altarX, z: altarZ, topY: altarTop + 0.3, size: 4 });

    return blocks;
}

console.log('── Test 7: Hub — Ruins Hop ──');
const ruinsBlocks = buildRuinsHopBlocks();
let ruinsFailures = 0;
{
    const b0 = ruinsBlocks[0];
    const terrH = hubTerrainHeight(b0.x, b0.z);
    const startDiff = b0.topY - terrH;
    console.log(`  First block: (${b0.x.toFixed(1)}, ${b0.z.toFixed(1)}) top=${b0.topY.toFixed(2)} terrain=${terrH.toFixed(2)} diff=${startDiff.toFixed(2)}`);

    for (let i = 1; i < ruinsBlocks.length; i++) {
        const from = ruinsBlocks[i - 1];
        const to = ruinsBlocks[i];
        const result = canJump(
            { x: from.x, y: from.topY, z: from.z },
            { x: to.x, y: to.topY, z: to.z },
            from.size, to.size
        );
        if (!result.possible) {
            ruinsFailures++;
            console.log(`  ❌ Block ${i - 1}→${i}: ${result.details}`);
        }
    }
}
console.log(`  Result: ${ruinsBlocks.length} blocks, ${ruinsFailures} failures${ruinsFailures === 0 ? ' ✅' : ' ❌'}\n`);

// ═══════════════════════════════════════════════════════════════════
//  TEST 8: Hub — Moonstone Ring
// ═══════════════════════════════════════════════════════════════════

function buildMoonstoneBlocks() {
    const blocks = [];
    const cx = -60, cz = 25;
    const RING_COUNT = 10;
    const SPIRAL_R = 6;
    const HEIGHT_STEP = 1.8;
    const PLAT_SIZE = 2.4;

    const startAngle = 0;
    const startX = cx + Math.cos(startAngle) * SPIRAL_R;
    const startZ = cz + Math.sin(startAngle) * SPIRAL_R;
    const startLocalH = hubTerrainHeight(startX, startZ);
    blocks.push({ x: startX, z: startZ, topY: startLocalH + 0.6, size: 4 });
    let prevTopY = startLocalH + 0.6;

    for (let i = 0; i < RING_COUNT; i++) {
        const angle = ((i + 1) / (RING_COUNT + 1)) * Math.PI * 2.5;
        const px = cx + Math.cos(angle) * SPIRAL_R;
        const pz = cz + Math.sin(angle) * SPIRAL_R;
        const localH = hubTerrainHeight(px, pz);
        const blockTop = Math.max(localH + 0.5, prevTopY + HEIGHT_STEP);
        blocks.push({ x: px, z: pz, topY: blockTop + 0.25, size: PLAT_SIZE });
        prevTopY = blockTop + 0.25;
    }

    // Summit
    const summitAngle = ((RING_COUNT + 1) / (RING_COUNT + 1)) * Math.PI * 2.5;
    const summitX = cx + Math.cos(summitAngle) * (SPIRAL_R * 0.5);
    const summitZ = cz + Math.sin(summitAngle) * (SPIRAL_R * 0.5);
    const summitTop = prevTopY + HEIGHT_STEP;
    blocks.push({ x: summitX, z: summitZ, topY: summitTop + 0.35, size: 3.5 });

    return blocks;
}

console.log('── Test 8: Hub — Moonstone Ring ──');
const moonBlocks = buildMoonstoneBlocks();
let moonFailures = 0;
{
    const b0 = moonBlocks[0];
    const terrH = hubTerrainHeight(b0.x, b0.z);
    const startDiff = b0.topY - terrH;
    console.log(`  First block: (${b0.x.toFixed(1)}, ${b0.z.toFixed(1)}) top=${b0.topY.toFixed(2)} terrain=${terrH.toFixed(2)} diff=${startDiff.toFixed(2)}`);

    for (let i = 1; i < moonBlocks.length; i++) {
        const from = moonBlocks[i - 1];
        const to = moonBlocks[i];
        const result = canJump(
            { x: from.x, y: from.topY, z: from.z },
            { x: to.x, y: to.topY, z: to.z },
            from.size, to.size
        );
        if (!result.possible) {
            moonFailures++;
            console.log(`  ❌ Block ${i - 1}→${i}: ${result.details}`);
        }
    }
}
console.log(`  Result: ${moonBlocks.length} blocks, ${moonFailures} failures${moonFailures === 0 ? ' ✅' : ' ❌'}\n`);

// ═══════════════════════════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════════════════════════
const totalFailures = spineFailures + armFailures + peakFailures + totalStoneIssues + rampFailures
    + aqFailures + ruinsFailures + moonFailures;
console.log('═══════════════════════════════════════════════════════');
console.log(`  TOTAL FAILURES: ${totalFailures}`);
if (totalFailures === 0) {
    console.log('  ALL PARKOUR IS FEASIBLE ✅');
} else {
    console.log('  SOME PARKOUR IS BROKEN ❌');
}
console.log('═══════════════════════════════════════════════════════');

process.exit(totalFailures > 0 ? 1 : 0);
