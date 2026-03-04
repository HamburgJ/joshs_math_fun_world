import * as THREE from 'three';

/**
 * Klein Bottle — figure-8 immersion in 3D.
 *
 * Shell Bingby once said: "A Klein bottle has no inside or outside.
 * Kind of like my house in the '90s."
 *
 * Figure-8 Klein bottle immersion:
 *   x = (a + cos(v/2)·sin(u) − sin(v/2)·sin(2u))·cos(v)
 *   y = (a + cos(v/2)·sin(u) − sin(v/2)·sin(2u))·sin(v)
 *   z = sin(v/2)·sin(u) + cos(v/2)·sin(2u)
 *
 * a = 3,  u ∈ [0, 2π],  v ∈ [0, 2π],  resolution 32×32.
 * Scaled to ~4 units wide, positioned at (−15, 4, 10).
 */

/**
 * Build the Klein bottle wireframe.
 *
 * @returns {{group: THREE.Group}}
 */
export function buildKleinBottle() {
    const a = 3;
    const segU = 32;
    const segV = 32;
    const positions = [];

    /**
     * @param {number} u
     * @param {number} v
     * @returns {THREE.Vector3}
     */
    const klein = (u, v) => {
        const halfV = v / 2;
        const sinU = Math.sin(u);
        const sin2U = Math.sin(2 * u);
        const cosHalfV = Math.cos(halfV);
        const sinHalfV = Math.sin(halfV);
        const r = a + cosHalfV * sinU - sinHalfV * sin2U;
        return new THREE.Vector3(
            r * Math.cos(v),
            r * Math.sin(v),
            sinHalfV * sinU + cosHalfV * sin2U,
        );
    };

    for (let i = 0; i <= segU; i++) {
        const u0 = (i / segU) * Math.PI * 2;
        const u1 = ((i + 1) / segU) * Math.PI * 2;

        for (let j = 0; j <= segV; j++) {
            const v0 = (j / segV) * Math.PI * 2;
            const v1 = ((j + 1) / segV) * Math.PI * 2;

            // Lines along u
            if (i < segU) {
                const pA = klein(u0, v0);
                const pB = klein(u1, v0);
                positions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
            }

            // Lines along v
            if (j < segV) {
                const pA = klein(u0, v0);
                const pB = klein(u0, v1);
                positions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
            }
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    // Determine bounding box so we can scale to ~4 units wide
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const extent = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
    const desiredSize = 4;
    const scaleFactor = desiredSize / extent;

    const mat = new THREE.LineBasicMaterial({ color: 0x00ff41 });
    const bottle = new THREE.LineSegments(geo, mat);
    bottle.name = 'KleinBottle';
    bottle.scale.setScalar(scaleFactor);

    const group = new THREE.Group();
    group.name = 'KleinBottleGroup';
    group.position.set(-15, 4, 10);
    group.add(bottle);

    return { group };
}
