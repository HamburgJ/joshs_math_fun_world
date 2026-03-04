import * as THREE from 'three';
import { mandelbrot, iterationToColor } from './math.js';

/**
 * Parkour Blocks — climbable platforms across the Fractal Boundary.
 *
 * Instead of floating Julia islands in the sky, the fractal world
 * extends outward with massive terrain AND a series of chunky PS1-style
 * blocks that form parkour paths up to the highest ridges of the
 * Mandelbrot set.
 *
 * Josh can jump across them, climb higher, and eventually reach the
 * peak — the very edge of the set's boundary where iteration counts
 * are maximal and the terrain erupts skyward.
 *
 * Shell Bingby once parkourred across the Mandelbrot set in a dream.
 * He woke up and built this.
 */

/**
 * @typedef {Object} ParkourBlock
 * @property {THREE.Mesh} mesh — Visual mesh
 * @property {number} minX — AABB min X
 * @property {number} maxX — AABB max X
 * @property {number} minZ — AABB min Z
 * @property {number} maxZ — AABB max Z
 * @property {number} topY — Top surface Y (what Josh stands on)
 * @property {number} baseY — Bottom Y of the block
 */

/**
 * Build all parkour blocks for the zone.
 *
 * Generates three ascending routes:
 *  1. The Spine — a main staircase along the boundary ridge
 *  2. The Spiral Arms — side platforms branching off the spine
 *  3. The Peak Run — final precision jumps to the highest point
 *
 * @param {Object} opts
 * @param {number} opts.maxIter
 * @param {{ rMin: number, rMax: number, iMin: number, iMax: number }} opts.domain
 * @param {number} opts.worldSize
 * @param {(x: number, z: number) => number} opts.getTerrainHeight
 * @returns {{ blocks: ParkourBlock[], group: THREE.Group }}
 */
export function buildParkourBlocks({ maxIter, domain, worldSize, getTerrainHeight }) {
    const group = new THREE.Group();
    group.name = 'ParkourBlocks';

    /** @type {ParkourBlock[]} */
    const blocks = [];

    // Find the highest terrain points by sampling the boundary
    const peaks = findBoundaryPeaks(maxIter, domain, worldSize);

    // ── Route 1: The Spine ──
    // A main ascending staircase from the terrain floor up along the boundary
    const spineBlocks = buildSpineRoute(peaks, getTerrainHeight, maxIter, domain, worldSize);

    // ── Route 2: Spiral Arms ──
    // Side platforms branching off the spine for alternate paths
    const armBlocks = buildSpiralArms(peaks, getTerrainHeight, maxIter, domain, worldSize);

    // ── Route 3: Peak Run ──
    // Final precision jumps to the absolute highest point
    const peakBlocks = buildPeakRun(peaks, getTerrainHeight, maxIter, domain, worldSize);

    // ── Scattered Stepping Stones ──
    // Extra blocks around the terrain for exploration
    const stoneBlocks = buildSteppingStones(getTerrainHeight, maxIter, domain, worldSize);

    const allDefs = [...spineBlocks, ...armBlocks, ...peakBlocks, ...stoneBlocks];

    for (const def of allDefs) {
        const block = createBlock(def, maxIter);
        blocks.push(block);
        group.add(block.mesh);
    }

    return { blocks, group };
}

/**
 * Find the highest points along the Mandelbrot boundary by sampling.
 */
function findBoundaryPeaks(maxIter, domain, worldSize) {
    const peaks = [];
    const samples = 400;
    const halfSize = worldSize / 2;
    const { rMin, rMax, iMin, iMax } = domain;

    for (let i = 0; i < samples; i++) {
        // Sample along the boundary region
        const angle = (i / samples) * Math.PI * 2;
        const radius = 0.6 + Math.sin(angle * 3) * 0.3;
        const cr = Math.cos(angle) * radius - 0.5;
        const ci = Math.sin(angle) * radius;

        const n = mandelbrot(cr, ci, maxIter);
        if (n > 0) {
            const wx = ((cr - rMin) / (rMax - rMin) - 0.5) * worldSize;
            const wz = ((ci - iMin) / (iMax - iMin) - 0.5) * worldSize;
            const height = n * 0.3;
            peaks.push({ x: wx, z: wz, height, iter: n });
        }
    }

    // Sort by height descending
    peaks.sort((a, b) => b.height - a.height);
    return peaks;
}

/**
 * Build the main ascending staircase route.
 */
function buildSpineRoute(peaks, getTerrainHeight, maxIter, domain, worldSize) {
    const defs = [];
    if (peaks.length === 0) return defs;

    // Pick the highest peak as destination
    const summit = peaks[0];
    // Start from a low point near center
    const startX = 0;
    const startZ = 10;
    const startH = getTerrainHeight(startX, startZ);

    const steps = 18;
    const jumpHeight = 2.5; // Max comfortable jump height
    const jumpDist = 4.5;   // Max comfortable jump distance

    for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps;
        // Curved path from start to summit
        const curve = Math.pow(t, 0.7); // Ease in slowly then accelerate upward
        const px = startX + (summit.x - startX) * t + Math.sin(t * Math.PI * 3) * 6;
        const pz = startZ + (summit.z - startZ) * t + Math.cos(t * Math.PI * 2) * 4;

        const terrainH = getTerrainHeight(px, pz);
        // Block rises above terrain, increasingly higher
        const blockTop = terrainH + jumpHeight * curve * (i + 1) * 0.5;
        const blockHeight = 1.0 + curve * 2.0; // Taller blocks higher up

        const size = 2.8 - curve * 0.8; // Smaller platforms at the top

        defs.push({
            x: px, z: pz,
            topY: Math.max(blockTop, terrainH + 0.5),
            width: size, depth: size, height: blockHeight,
            iterFraction: t,
        });
    }

    return defs;
}

/**
 * Build side platforms branching off for alternate routes.
 */
function buildSpiralArms(peaks, getTerrainHeight, maxIter, domain, worldSize) {
    const defs = [];
    const halfSize = worldSize / 2;

    // Use high boundary points as anchor positions
    const anchors = peaks.slice(2, 14);
    for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];
        const terrainH = getTerrainHeight(anchor.x, anchor.z);

        // Create a mini-path of 3-5 blocks branching outward
        const branchLen = 3 + Math.floor(Math.random() * 3);
        const branchAngle = (i / anchors.length) * Math.PI * 2;

        for (let j = 0; j < branchLen; j++) {
            const dist = (j + 1) * 4;
            const bx = anchor.x + Math.cos(branchAngle) * dist;
            const bz = anchor.z + Math.sin(branchAngle) * dist;

            // Clamp to world bounds
            if (Math.abs(bx) > halfSize - 5 || Math.abs(bz) > halfSize - 5) continue;

            const bTerrainH = getTerrainHeight(bx, bz);
            const blockTop = Math.max(terrainH + (j + 1) * 2.0, bTerrainH + 1.5);

            defs.push({
                x: bx, z: bz,
                topY: blockTop,
                width: 2.2 + Math.random() * 0.8,
                depth: 2.2 + Math.random() * 0.8,
                height: 1.2 + Math.random() * 1.5,
                iterFraction: anchor.iter / maxIter,
            });
        }
    }

    return defs;
}

/**
 * Build the final precision jump sequence to the very peak.
 *
 * Physics constraints (from physics.js):
 *   Max jump height:  ~3.15 units
 *   Max sprint jump:  ~5.77 units (flat), ~4.7 units (2u up)
 *
 * Blocks are placed by probing around the previous block's position
 * (not the peak center), ensuring both height and distance constraints
 * are satisfied.  The route naturally follows the terrain contour.
 */
function buildPeakRun(peaks, getTerrainHeight, maxIter, domain, worldSize) {
    const defs = [];
    if (peaks.length < 3) return defs;

    // ── Physics budget ──
    const MAX_STEP_UP     = 2.0;  // comfortable upward jump
    const MAX_ABOVE_LOCAL = 2.5;  // max height above local terrain
    const MIN_PLAT_SIZE   = 2.0;  // minimum platform width
    const HOP_DIST        = 3.5;  // center-to-center hop distance between blocks

    // Top 3 peaks each get an ascending contour path
    const topPeaks = peaks.slice(0, 3);

    for (let p = 0; p < topPeaks.length; p++) {
        const peak = topPeaks[p];
        const peakTerrainH = getTerrainHeight(peak.x, peak.z);

        const stepCount = 8;
        let prevX = peak.x;
        let prevZ = peak.z;
        let prevTop = peakTerrainH;
        let prevAngle = p * 2.1; // starting direction

        for (let i = 0; i < stepCount; i++) {
            const t = (i + 1) / stepCount;

            // Probe around the PREVIOUS block position (not the peak center)
            // Try angles fanning out from the current direction
            let bestX = 0, bestZ = 0, bestH = -Infinity;

            for (let probe = 0; probe < 16; probe++) {
                const probeAngle = prevAngle + (probe / 16) * Math.PI * 2;
                const px = prevX + Math.cos(probeAngle) * HOP_DIST;
                const pz = prevZ + Math.sin(probeAngle) * HOP_DIST;
                const ph = getTerrainHeight(px, pz);

                const hDiff = ph - prevTop;
                // Accept if terrain is at most MAX_STEP_UP above previous
                if (hDiff <= MAX_STEP_UP && ph > bestH) {
                    bestH = ph;
                    bestX = px;
                    bestZ = pz;
                }
            }

            // Fallback: straight ahead at reduced distance
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
                x: bestX, z: bestZ,
                topY: blockTop,
                width: size, depth: size,
                height: 1.2 + t * 1.0,
                iterFraction: 0.8 + t * 0.2,
                isPeak: i === stepCount - 1,
            });

            // Update direction for next step
            prevAngle = Math.atan2(bestZ - prevZ, bestX - prevX);
            prevX = bestX;
            prevZ = bestZ;
            prevTop = blockTop;
        }
    }

    // ── The absolute summit block ──
    // Find the overall highest block across all peak paths
    let highestBlock = defs[0];
    for (const b of defs) {
        if (b.topY > highestBlock.topY) highestBlock = b;
    }

    const summitLocalTerrain = getTerrainHeight(highestBlock.x, highestBlock.z);
    const summitTop = Math.max(
        summitLocalTerrain + 1.0,
        Math.min(highestBlock.topY + MAX_STEP_UP, summitLocalTerrain + MAX_ABOVE_LOCAL)
    );

    // Place summit one hop from the highest block
    const summitAngle = Math.atan2(
        peaks[0].z - highestBlock.z,
        peaks[0].x - highestBlock.x
    );
    const summitX = highestBlock.x + Math.cos(summitAngle) * HOP_DIST;
    const summitZ = highestBlock.z + Math.sin(summitAngle) * HOP_DIST;

    defs.push({
        x: summitX,
        z: summitZ,
        topY: summitTop,
        width: 3.0,
        depth: 3.0,
        height: 2.5,
        iterFraction: 1.0,
        isPeak: true,
        isSummit: true,
    });

    return defs;
}

/**
 * Build scattered stepping stones across the expanded terrain.
 *
 * Stones are placed in connected chains so the player can always
 * hop from one to the next.  Each stone is at most 2.5u above its
 * local terrain and no more than 4u edge-to-edge from its neighbour.
 */
function buildSteppingStones(getTerrainHeight, maxIter, domain, worldSize) {
    const defs = [];
    const halfSize = worldSize / 2;

    // ── Physics budget ──
    const MAX_HEIGHT_ABOVE_TERRAIN = 2.5; // must be ≤ max jump height (3.15)
    const MAX_STEP_UP   = 2.0;            // height diff between consecutive stones
    const CHAIN_SPACING = 4.0;            // center-to-center (edge gap ≈ 2u with 2u platforms)
    const MIN_PLAT_SIZE = 2.0;

    // Build 7 chains of 5 stones each (35 total), evenly spaced around the world
    const chainCount = 7;
    const stonesPerChain = 5;

    for (let c = 0; c < chainCount; c++) {
        const baseAngle = (c / chainCount) * Math.PI * 2;
        const startR = 28;

        let prevX = Math.cos(baseAngle) * startR;
        let prevZ = Math.sin(baseAngle) * startR;
        let prevTop = getTerrainHeight(prevX, prevZ);

        for (let s = 0; s < stonesPerChain; s++) {
            // Advance outward along the chain direction with slight wander
            const wander = (s * 0.4) * (c % 2 === 0 ? 1 : -1);
            const angle = baseAngle + wander * 0.15;
            const r = startR + (s + 1) * CHAIN_SPACING;

            let bx = Math.cos(angle) * r;
            let bz = Math.sin(angle) * r;

            // Clamp to world bounds
            if (Math.abs(bx) > halfSize - 6) bx = Math.sign(bx) * (halfSize - 6);
            if (Math.abs(bz) > halfSize - 6) bz = Math.sign(bz) * (halfSize - 6);

            const terrainH = getTerrainHeight(bx, bz);
            // Height: at most MAX_HEIGHT_ABOVE_TERRAIN over local terrain,
            // and at most MAX_STEP_UP above the previous stone
            const heightAboveTerrain = 1.0 + (s / stonesPerChain) * (MAX_HEIGHT_ABOVE_TERRAIN - 1.0);
            const blockTop = Math.min(
                terrainH + heightAboveTerrain,
                prevTop + MAX_STEP_UP
            );
            // Ensure block is at least slightly above terrain
            const finalTop = Math.max(blockTop, terrainH + 0.5);

            const size = MIN_PLAT_SIZE + (1.0 - s / stonesPerChain) * 1.0;

            defs.push({
                x: bx, z: bz,
                topY: finalTop,
                width: size,
                depth: size,
                height: 1.0 + (s / stonesPerChain) * 1.0,
                iterFraction: s / stonesPerChain,
            });

            prevX = bx;
            prevZ = bz;
            prevTop = finalTop;
        }
    }

    return defs;
}

/**
 * Create a single parkour block mesh with AABB data.
 *
 * @param {Object} def — Block definition
 * @param {number} maxIter
 * @returns {ParkourBlock}
 */
function createBlock(def, maxIter) {
    const { x, z, topY, width, depth, height, iterFraction, isPeak, isSummit } = def;
    const baseY = topY - height;

    const geo = new THREE.BoxGeometry(width, height, depth);

    // Color based on fractal iteration fraction
    const fakeIter = Math.floor(iterFraction * maxIter) || 1;
    const col = iterationToColor(fakeIter, maxIter);

    let color;
    if (isSummit) {
        // Summit block glows golden
        color = new THREE.Color(1.0, 0.85, 0.2);
    } else if (isPeak) {
        // Peak blocks glow brighter
        color = new THREE.Color(col.r * 1.4, col.g * 1.4, col.b * 1.8);
    } else {
        color = new THREE.Color(col.r, col.g, col.b);
    }

    const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
    });

    // Add wireframe overlay for PS1 chunky feel
    const wireMat = new THREE.MeshBasicMaterial({
        color: color.clone().multiplyScalar(1.5),
        wireframe: true,
        transparent: true,
        opacity: 0.3,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, baseY + height / 2, z);
    mesh.name = isSummit ? 'SummitBlock' : 'ParkourBlock';

    // Add wireframe child
    const wireMesh = new THREE.Mesh(geo, wireMat);
    mesh.add(wireMesh);

    return {
        mesh,
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
        topY,
        baseY,
    };
}

/**
 * Check if a world position (x, z) is on top of any block.
 * Returns the highest block top Y that the position is over,
 * but ONLY if Josh's current Y is above the block's base
 * (so you can walk under tall blocks).
 *
 * @param {ParkourBlock[]} blocks
 * @param {number} x — World X
 * @param {number} z — World Z
 * @param {number} currentY — Josh's current Y position
 * @returns {number|null} — Block top Y, or null if not on any block
 */
export function getBlockHeight(blocks, x, z, currentY) {
    let bestY = null;

    for (const block of blocks) {
        if (x >= block.minX && x <= block.maxX &&
            z >= block.minZ && z <= block.maxZ) {
            // Josh is within the block's horizontal footprint
            // Only count it if Josh is above the block's base
            if (currentY >= block.baseY - 0.5) {
                if (bestY === null || block.topY > bestY) {
                    bestY = block.topY;
                }
            }
        }
    }

    return bestY;
}

/**
 * Create an animator for subtle block effects.
 * Peak blocks glow/pulse, summit block rotates slowly.
 *
 * @param {ParkourBlock[]} blocks
 * @returns {(dt: number, time: number) => void}
 */
export function createBlockAnimator(blocks) {
    return (_dt, time) => {
        for (const block of blocks) {
            if (block.mesh.name === 'SummitBlock') {
                // Gentle float + rotate
                block.mesh.position.y = block.baseY + block.mesh.geometry.parameters.height / 2
                    + Math.sin(time * 0.8) * 0.3;
                block.mesh.rotation.y = time * 0.2;
                // Pulse opacity
                block.mesh.material.opacity = 0.85 + Math.sin(time * 2) * 0.1;
            }
        }
    };
}
