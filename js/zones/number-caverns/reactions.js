import * as THREE from 'three';

/**
 * Proximity reactions for Number Caverns.
 *
 * The cavern reacts to Josh's presence:
 *  - Ulam spiral tiles light up brighter beneath his feet
 *  - Sieve waterfall speeds up when he's watching
 *  - Twin prime stalactite tips sync-pulse when he's near a pair
 *  - Riemann grotto critical line intensifies on approach
 *  - Mod ring platforms highlight the nearest element
 */

/**
 * Register all proximity reactions.
 *
 * @param {import('../zone-base.js').ZoneBase} zone
 * @param {Object} parts
 * @param {THREE.Mesh[]} parts.primeTiles — Ulam spiral prime tiles
 * @param {THREE.Mesh[]} parts.stalactiteTips — Glowing tips
 * @param {THREE.Vector3[]} parts.twinPairPositions — Center of each twin pair
 * @param {{ uTime: { value: number }, uSpeed: { value: number } }} parts.sieveUniforms
 * @param {{ uTime: { value: number }, uIntensity: { value: number } }} parts.riemannUniforms
 * @param {THREE.Mesh[]} parts.riemannZeros
 * @param {THREE.Mesh[]} parts.modPlatforms
 */
export function registerReactions(zone, parts) {
    const {
        primeTiles, stalactiteTips, twinPairPositions,
        sieveUniforms, riemannUniforms, riemannZeros,
        modPlatforms,
    } = parts;

    // ── Ulam spiral: tiles directly under Josh glow brighter ──
    zone.addAnimator((_dt, time, joshPos) => {
        if (!joshPos) {
            // Default ambient breathing
            const pulse = 0.3 + 0.15 * Math.sin(time * 1.2);
            for (const tile of primeTiles) {
                tile.material.emissiveIntensity = pulse;
            }
            return;
        }

        for (const tile of primeTiles) {
            const dx = tile.position.x - joshPos.x;
            const dz = tile.position.z - joshPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 3) {
                // Close — bright glow, slight rise
                const intensity = 1 - (dist / 3);
                tile.material.emissiveIntensity = 0.4 + intensity * 0.8;
                tile.position.y = tile.userData.originalY + intensity * 0.08;
            } else {
                // Ambient breathing
                tile.material.emissiveIntensity = 0.3 + 0.15 * Math.sin(time * 1.2);
                tile.position.y = tile.userData.originalY;
            }
        }
    });

    // ── Sieve waterfall: speeds up when Josh is near ──
    zone.addReaction({
        id: 'sieve_proximity',
        center: new THREE.Vector3(0, 5, -25),
        radius: 15,
        onNear: (_dist, intensity) => {
            // Speed goes from 0.15 (normal) to 0.45 (close)
            sieveUniforms.uSpeed.value = 0.15 + intensity * 0.3;
        },
        onExit: () => {
            sieveUniforms.uSpeed.value = 0.15;
        },
    });

    // ── Twin prime stalactites: sync pulse when Josh is near a pair ──
    for (let i = 0; i < twinPairPositions.length; i++) {
        const pairCenter = twinPairPositions[i];
        const tipA = stalactiteTips[i * 2];
        const tipB = stalactiteTips[i * 2 + 1];

        zone.addReaction({
            id: `twin_prime_${i}`,
            center: pairCenter,
            radius: 8,
            onNear: (_dist, intensity) => {
                // Both tips pulse together, faster and brighter when close
                const pulse = 0.6 + 0.4 * Math.sin(zone._time * (3 + intensity * 4));
                if (tipA) tipA.material.emissiveIntensity = pulse;
                if (tipB) tipB.material.emissiveIntensity = pulse;
            },
            onExit: () => {
                // Return to default ambient pulse speed
            },
        });
    }

    // ── Stalactite tips: default ambient pulse ──
    zone.addAnimator((_dt, time) => {
        const defaultPulse = 0.4 + 0.3 * Math.sin(time * 2.5);
        for (const tip of stalactiteTips) {
            // Only set if not overridden by proximity (we use a simple flag approach)
            // Since reactions run after animators in ZoneBase, the reaction
            // will override this when Josh is near. When Josh is far, this stands.
            if (!tip._proximityOverride) {
                tip.material.emissiveIntensity = defaultPulse;
            }
        }
    });

    // ── Riemann grotto: critical line intensifies on approach ──
    zone.addReaction({
        id: 'riemann_approach',
        center: new THREE.Vector3(0, 5, 30),
        radius: 20,
        onNear: (_dist, intensity) => {
            // Brighten the critical line shader
            riemannUniforms.uIntensity.value = 1.0 + intensity * 2.0;
            // Zeros pulse faster
            const pulse = 0.6 + 0.4 * Math.sin(zone._time * (1.8 + intensity * 4));
            for (const sphere of riemannZeros) {
                sphere.material.emissiveIntensity = pulse;
            }
        },
        onExit: () => {
            riemannUniforms.uIntensity.value = 1.0;
        },
    });

    // ── Riemann zeros: default ambient pulse ──
    zone.addAnimator((_dt, time) => {
        // Only runs for default state — overridden by reaction above when close
        const pulse = 0.6 + 0.3 * Math.sin(time * 1.8 + 1.0);
        for (const sphere of riemannZeros) {
            // Let the reaction override if Josh is in the grotto
        }
    });

    // ── Modular room: nearest platform highlights ──
    if (modPlatforms && modPlatforms.length > 0) {
        const modCenter = new THREE.Vector3(-25, 0, 10);
        zone.addReaction({
            id: 'mod_ring_proximity',
            center: modCenter,
            radius: 10,
            onNear: (_dist, _intensity) => {
                // Find nearest platform to Josh and highlight it
                // (the reaction center is the room center, but we check individual platforms)
            },
        });

        zone.addAnimator((_dt, _time, joshPos) => {
            if (!joshPos) return;
            let nearestIdx = -1;
            let nearestDist = Infinity;

            for (const plat of modPlatforms) {
                const worldX = plat.position.x + (-25); // parent offset
                const worldZ = plat.position.z + 10;
                const dx = worldX - joshPos.x;
                const dz = worldZ - joshPos.z;
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d < nearestDist && d < 6) {
                    nearestDist = d;
                    nearestIdx = plat.userData.index;
                }
            }

            for (const plat of modPlatforms) {
                if (plat.userData.index === nearestIdx) {
                    plat.material.emissiveIntensity = 0.8;
                    plat.scale.setScalar(1.15);
                } else {
                    plat.material.emissive.setRGB(
                        plat.userData.baseEmissiveR,
                        plat.userData.baseEmissiveG,
                        plat.userData.baseEmissiveB
                    );
                    plat.material.emissiveIntensity = 0.3;
                    plat.scale.setScalar(1.0);
                }
            }
        });
    }
}
