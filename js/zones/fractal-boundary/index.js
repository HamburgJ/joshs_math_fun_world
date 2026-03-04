/**
 * Zone 3: The Fractal Boundary
 *
 * The Mandelbrot set as a massive walkable 3D heightmap.
 * Iteration count = elevation. The world stretches far in every direction,
 * and PS1-style parkour blocks form climbing paths up to the highest
 * ridges of the set's boundary.
 *
 * The world reacts to you:
 *  - Particles scatter when you walk through them
 *  - The seahorse marker spins faster as you approach
 *  - The orbit trail traces z=z²+c in real-time from your position
 *  - Parkour blocks lead you to the summit of the fractal
 *
 * Shell Bingby computed the Mandelbrot set by hand in 1978.
 * On graph paper. With a fountain pen. Twice.
 */

import * as THREE from 'three';
import { ZoneBase } from '../zone-base.js';
import { complexToWorld } from './math.js';
import { buildTerrain, sampleTerrainHeightMath, WORLD_SIZE } from './terrain.js';
import { buildOrbitTrail, updateOrbitTrail, createOrbitColorAnimator } from './orbit-trail.js';
import { buildParticles, createParticleAnimator } from './particles.js';
import { buildSeahorseMarker, registerReactions } from './reactions.js';
import { buildParkourBlocks, getBlockHeight, createBlockAnimator } from './parkour-blocks.js';

/** Zoom presets: increasingly deeper views into the set */
const ZOOM_PRESETS = [
    { rMin: -2, rMax: 1, iMin: -1.5, iMax: 1.5 },           // Level 1 — full view
    { rMin: -0.8, rMax: -0.7, iMin: 0.05, iMax: 0.15 },     // Level 2 — seahorse region
    { rMin: -0.748, rMax: -0.746, iMin: 0.098, iMax: 0.1 },  // Level 3 — deep zoom
];

export class FractalBoundary extends ZoneBase {
    constructor() {
        super('FractalBoundary');

        this._maxIter = 128;
        this._gridRes = 256;
        this._zoomLevel = 1;
        this._domain = { ...ZOOM_PRESETS[0] };

        // ── Build terrain ──
        const { mesh: terrainMesh, heightmap } = buildTerrain({
            gridRes: this._gridRes,
            maxIter: this._maxIter,
            domain: this._domain,
        });
        this._terrainMesh = terrainMesh;
        this._heightmap = heightmap;
        this.group.add(terrainMesh);

        // ── Build parkour blocks ──
        const { blocks, group: blockGroup } = buildParkourBlocks({
            maxIter: this._maxIter,
            domain: this._domain,
            worldSize: WORLD_SIZE,
            getTerrainHeight: (x, z) => this._getBaseTerrainHeight(x, z),
        });
        this._parkourBlocks = blocks;
        this.group.add(blockGroup);
        this.addAnimator(createBlockAnimator(blocks));

        // ── Build seahorse marker ──
        const { marker: seahorseMarker, baseY: seahorseBaseY } = buildSeahorseMarker(
            this._domain, WORLD_SIZE, (x, z) => this._getBaseTerrainHeight(x, z)
        );
        this._seahorseMarker = seahorseMarker;
        this._seahorseBaseY = seahorseBaseY;
        this.group.add(seahorseMarker);

        // ── Build orbit trail ──
        this._orbitLine = buildOrbitTrail(this._maxIter);
        this.group.add(this._orbitLine);
        this.addAnimator(createOrbitColorAnimator(this._orbitLine));

        // ── Build particles ──
        const { points: particles, velocities } = buildParticles(this._maxIter);
        this._particles = particles;
        this.group.add(particles);
        this.addAnimator(createParticleAnimator(particles, velocities));

        // ── Orbit trail updater (runs every frame with Josh position) ──
        this.addAnimator((_dt, _time, joshPos) => {
            if (!joshPos) return;
            // Removed bounds restriction so you can cast orbits from the infinite floor
            updateOrbitTrail(
                this._orbitLine, joshPos.x, joshPos.z,
                this._domain, WORLD_SIZE, this._maxIter,
                (x, z) => this._getBaseTerrainHeight(x, z)
            );
        });

        // ── Seahorse marker ambient animation ──
        this.addAnimator((dt, time) => {
            if (this._seahorseMarker) {
                this._seahorseMarker.rotation.x = Math.sin(time * 0.8) * 0.3;
                this._seahorseMarker.rotation.y += 0.4 * dt;
            }
        });

        // ── Register proximity reactions and spectacles ──
        registerReactions(this, {
            seahorseMarker: this._seahorseMarker,
            seahorseBaseY: this._seahorseBaseY,
            juliaIslands: [],
            orbitLine: this._orbitLine,
            getTerrainHeight: (x, z) => this._getBaseTerrainHeight(x, z),
            domain: this._domain,
            worldSize: WORLD_SIZE,
            maxIter: this._maxIter,
        });

        // ── Register interactables ──
        this.addInteractable(
            seahorseMarker.position.clone(),
            'Seahorse Valley',
            'landmark'
        );

        // Register summit block as interactable
        for (const block of this._parkourBlocks) {
            if (block.mesh.name === 'SummitBlock') {
                this.addInteractable(
                    block.mesh.position.clone(),
                    'Fractal Summit',
                    'landmark'
                );
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Zoom system
    // ═══════════════════════════════════════════════════════════════════

    setZoomLevel(level) {
        const clamped = Math.max(1, Math.min(3, Math.round(level)));
        if (clamped === this._zoomLevel) return;

        this._zoomLevel = clamped;
        this._domain = { ...ZOOM_PRESETS[clamped - 1] };

        const { mesh, heightmap } = buildTerrain({
            gridRes: this._gridRes,
            maxIter: this._maxIter,
            domain: this._domain,
            existingMesh: this._terrainMesh,
        });
        this._terrainMesh = mesh;
        this._heightmap = heightmap;

        if (this._seahorseMarker) {
            const worldPos = complexToWorld(-0.75, 0.1, this._domain, WORLD_SIZE);
            const terrainH = this._getBaseTerrainHeight(worldPos.x, worldPos.z);
            this._seahorseBaseY = terrainH + 2.5;
            this._seahorseMarker.position.set(worldPos.x, this._seahorseBaseY, worldPos.z);
        }
    }

    getZoomLevel() {
        return this._zoomLevel;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Terrain height (overrides ZoneBase)
    //  Now checks parkour blocks in addition to the terrain heightmap.
    // ═══════════════════════════════════════════════════════════════════

    /** Raw Mandelbrot terrain height (no blocks). */
    _getBaseTerrainHeight(x, z) {
        return sampleTerrainHeightMath(x, z, this._domain, this._maxIter);
    }

    /**
     * Combined terrain + parkour block height.
     * Physics uses this — Josh can stand on blocks.
     */
    getTerrainHeight(x, z) {
        const terrainH = this._getBaseTerrainHeight(x, z);

        if (this._parkourBlocks) {
            // Use Josh's current Y to determine if he's above a block
            const joshY = this._joshPos ? this._joshPos.y : terrainH;
            const blockH = getBlockHeight(this._parkourBlocks, x, z, joshY);
            if (blockH !== null && blockH > terrainH) {
                return blockH;
            }
        }

        return terrainH;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Legacy compat — updateOrbitTrail called directly by old code
    // ═══════════════════════════════════════════════════════════════════

    updateOrbitTrail(worldX, worldZ) {
        updateOrbitTrail(
            this._orbitLine, worldX, worldZ,
            this._domain, WORLD_SIZE, this._maxIter,
            (x, z) => this.getTerrainHeight(x, z)
        );
    }
}
