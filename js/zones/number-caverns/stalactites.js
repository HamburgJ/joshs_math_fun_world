import * as THREE from 'three';
import { TWIN_PRIMES } from './math.js';

/**
 * Stalactites and stalagmites — cave formations.
 *
 * Twin-prime pairs hang as close stalactite pairs with glowing amber tips.
 * Regular stalactites fill the ceiling. Stalagmites rise from the floor.
 *
 * Stalactite tips pulse in rhythm. When Josh walks near a twin-prime pair,
 * both tips brighten together and pulse in sync.
 */

/**
 * Build all stalactites and stalagmites.
 *
 * @returns {{ group: THREE.Group, tips: THREE.Mesh[], twinPairPositions: THREE.Vector3[] }}
 */
export function buildStalactites() {
    const group = new THREE.Group();
    group.name = 'StalactitesAndStalagmites';

    const baseMat = new THREE.MeshLambertMaterial({
        color: 0x4a3520,
        emissive: 0x2a1808,
        emissiveIntensity: 1.0,
        flatShading: true,
    });

    const tipMat = new THREE.MeshLambertMaterial({
        color: 0xFFAA44,
        emissive: 0xFFAA44,
        emissiveIntensity: 0.6,
        flatShading: true,
    });

    const tips = [];
    const twinPairPositions = [];
    const twinAngleStep = (Math.PI * 2) / TWIN_PRIMES.length;

    // ── Twin-prime stalactite pairs ──
    for (let i = 0; i < TWIN_PRIMES.length; i++) {
        const angle = twinAngleStep * i;
        const radius = 15 + Math.random() * 10;
        const cx = Math.cos(angle) * radius;
        const cz = Math.sin(angle) * radius;

        twinPairPositions.push(new THREE.Vector3(cx, 0, cz));

        for (let t = 0; t < 2; t++) {
            const offset = (t === 0) ? -1 : 1;
            const height = 1.5 + Math.random() * 2.5;
            const coneGeo = new THREE.ConeGeometry(0.3, height, 5);
            const stalactite = new THREE.Mesh(coneGeo, baseMat.clone());
            stalactite.rotation.x = Math.PI;
            const ceilingY = Math.sqrt(
                Math.max(0, 3600 - (cx + offset) * (cx + offset) - cz * cz)
            ) * Math.sin(Math.PI * 0.6) * 0.5;
            const hangY = Math.min(ceilingY, 25) - height * 0.5;
            stalactite.position.set(cx + offset, hangY, cz);
            group.add(stalactite);

            const tipGeo = new THREE.ConeGeometry(0.15, 0.3, 5);
            const tip = new THREE.Mesh(tipGeo, tipMat.clone());
            tip.rotation.x = Math.PI;
            tip.position.set(cx + offset, hangY - height * 0.5 - 0.15, cz);
            group.add(tip);
            tips.push(tip);
        }
    }

    // ── Regular stalactites (fill ceiling) ──
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 45;
        const px = Math.cos(angle) * radius;
        const pz = Math.sin(angle) * radius;
        if (Math.sqrt(px * px + pz * pz) > 50) continue;

        const height = 1.5 + Math.random() * 2.5;
        const coneGeo = new THREE.ConeGeometry(0.3, height, 5);
        const stalactite = new THREE.Mesh(coneGeo, baseMat.clone());
        stalactite.rotation.x = Math.PI;
        stalactite.position.set(px, 20 + Math.random() * 5 - height * 0.5, pz);
        group.add(stalactite);
    }

    // ── Stalagmites on the floor ──
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 40;
        const px = Math.cos(angle) * radius;
        const pz = Math.sin(angle) * radius;

        const height = 1.0 + Math.random() * 2.0;
        const coneGeo = new THREE.ConeGeometry(0.35, height, 5);
        const stalagMat = new THREE.MeshLambertMaterial({
            color: 0x4a3520,
            emissive: 0x2a1808,
            emissiveIntensity: 1.0,
            flatShading: true,
        });
        const stalagmite = new THREE.Mesh(coneGeo, stalagMat);
        stalagmite.position.set(px, height * 0.5, pz);
        group.add(stalagmite);
    }

    return { group, tips, twinPairPositions };
}
