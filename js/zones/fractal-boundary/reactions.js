import * as THREE from 'three';
import { complexToWorld } from './math.js';

/**
 * Proximity reactions and spectacles for the Fractal Boundary zone.
 *
 * These are the "the world reacts to you" moments:
 *  - Seahorse valley marker pulses faster as you approach
 *  - Julia islands descend toward you when you're underneath
 *  - Terrain colors intensify near Josh
 *  - First-time spectacles when you reach key locations
 */

/**
 * Build the seahorse valley marker (wireframe torus).
 *
 * @param {{ rMin: number, rMax: number, iMin: number, iMax: number }} domain
 * @param {number} worldSize
 * @param {(x: number, z: number) => number} getTerrainHeight
 * @returns {{ marker: THREE.LineSegments, baseY: number }}
 */
export function buildSeahorseMarker(domain, worldSize, getTerrainHeight) {
    const torusGeo = new THREE.TorusGeometry(2, 0.1, 8, 16);
    const wireGeo = new THREE.WireframeGeometry(torusGeo);

    const mat = new THREE.LineBasicMaterial({
        color: 0xff33aa,
        transparent: true,
        opacity: 0.9,
    });

    const marker = new THREE.LineSegments(wireGeo, mat);
    marker.name = 'SeahorseValleyMarker';

    const worldPos = complexToWorld(-0.75, 0.1, domain, worldSize);
    const terrainH = getTerrainHeight(worldPos.x, worldPos.z);
    const baseY = terrainH + 2.5;
    marker.position.set(worldPos.x, baseY, worldPos.z);

    torusGeo.dispose();

    return { marker, baseY };
}

/**
 * Register all proximity reactions for this zone.
 *
 * @param {import('../zone-base.js').ZoneBase} zone
 * @param {Object} parts — Built zone parts
 * @param {THREE.LineSegments} parts.seahorseMarker
 * @param {number} parts.seahorseBaseY
 * @param {Array<{mesh: THREE.Mesh, speed: number, baseY: number}>} parts.juliaIslands
 * @param {THREE.Line} parts.orbitLine
 * @param {() => number} parts.getTerrainHeight
 * @param {{ rMin: number, rMax: number, iMin: number, iMax: number }} parts.domain
 * @param {number} parts.worldSize
 * @param {number} parts.maxIter
 */
export function registerReactions(zone, parts) {
    const {
        seahorseMarker, seahorseBaseY,
        juliaIslands, orbitLine,
        getTerrainHeight, domain, worldSize, maxIter
    } = parts;

    // ── Seahorse marker: spins faster and glows brighter as Josh approaches ──
    if (seahorseMarker) {
        zone.addReaction({
            id: 'seahorse_proximity',
            center: seahorseMarker.position.clone(),
            radius: 12,
            onNear: (dist, intensity) => {
                // Spin faster when closer
                seahorseMarker.rotation.y += (0.4 + intensity * 3.0) * 0.016;
                // Brighten
                seahorseMarker.material.opacity = 0.5 + intensity * 0.5;
                // Rise slightly when Josh is close
                seahorseMarker.position.y = seahorseBaseY + intensity * 1.5;
            },
            onExit: () => {
                seahorseMarker.material.opacity = 0.9;
                seahorseMarker.position.y = seahorseBaseY;
            },
        });
    }

    // ── Julia islands descend when Josh walks beneath them ──
    for (const island of juliaIslands) {
        const groundCenter = island.mesh.position.clone();
        groundCenter.y = 0;

        zone.addReaction({
            id: `julia_descend_${island.mesh.name}`,
            center: groundCenter,
            radius: 10,
            onNear: (_dist, intensity) => {
                // Descend toward the ground — drops from baseY toward baseY - 4
                const targetY = island.baseY - intensity * 4;
                island.mesh.position.y += (targetY - island.mesh.position.y) * 0.05;
                // Spin faster
                island.mesh.rotation.y += (island.speed + intensity * 0.5) * 0.016;
            },
            onExit: () => {
                // Slowly rise back (handled by the regular julia animator restoring baseY)
            },
        });
    }

    // ── Orbit trail updates when Josh is on the terrain ──
    zone.addAnimator((dt, time, joshPos) => {
        if (!joshPos) return;
        // Only update if Josh is within the terrain bounds
        if (Math.abs(joshPos.x) < 30 && Math.abs(joshPos.z) < 30) {
            // Import orbit-trail update is done in the index.js to avoid circular deps
            // The animator is set up there
        }
    });

    // ── Spectacle: first time reaching the deepest part of the set ──
    zone.addSpectacle({
        id: 'deep_set_entry',
        position: new THREE.Vector3(0, 0, 0), // Center of the terrain = roughly inside the set
        radius: 5,
        action: () => {
            // Particles converge briefly toward the center
            // The orbit trail turns golden
            if (orbitLine) {
                orbitLine.material.color.setHex(0xf5cc45);
            }
        },
    });

    // ── Spectacle: first time approaching the seahorse valley ──
    if (seahorseMarker) {
        zone.addSpectacle({
            id: 'seahorse_discovery',
            position: seahorseMarker.position.clone(),
            radius: 6,
            action: () => {
                // The marker explodes into a brief burst — emits many particles
                // For now: make it bright and large
                seahorseMarker.scale.set(1.5, 1.5, 1.5);
                seahorseMarker.material.color.setHex(0xffffff);
                // Gradually return to normal over time via the animator
                setTimeout(() => {
                    seahorseMarker.scale.set(1, 1, 1);
                    seahorseMarker.material.color.setHex(0xff33aa);
                }, 2000);
            },
        });
    }
}
