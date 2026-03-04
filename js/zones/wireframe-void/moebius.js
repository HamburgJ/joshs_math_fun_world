import * as THREE from 'three';

/**
 * Möbius Walkway — a non-orientable wireframe strip.
 *
 * Shell Bingby once said: "If you walk long enough on a Möbius strip,
 * you end up exactly where you started — but upside down.
 * Just like my career."
 *
 * Parameterisation (standard Möbius strip):
 *   x = (R + s·cos(t/2))·cos(t)
 *   y = s·sin(t/2)
 *   z = (R + s·cos(t/2))·sin(t)
 *
 * R = 8,  s ∈ [−1, 1],  t ∈ [0, 2π]
 * Resolution: 64 around (t) × 4 across (s).
 * Positioned at (0, 2, 15).
 */

/**
 * Build the Möbius strip wireframe and its twist marker.
 *
 * @returns {{strip: THREE.LineSegments, marker: THREE.LineSegments}}
 */
export function buildMoebiusStrip() {
    const R = 8;
    const segT = 64;
    const segS = 4;
    const positions = [];

    /**
     * Evaluate the Möbius strip at parameter values t and s.
     * @param {number} t - Angle around the strip [0, 2π]
     * @param {number} s - Cross-section parameter [-1, 1]
     * @returns {THREE.Vector3}
     */
    const mobius = (t, s) => {
        const halfT = t / 2;
        const r = R + s * Math.cos(halfT);
        return new THREE.Vector3(
            r * Math.cos(t),
            s * Math.sin(halfT),
            r * Math.sin(t),
        );
    };

    // Build line segments: longitudinal + transverse lines
    for (let i = 0; i <= segT; i++) {
        const t0 = (i / segT) * Math.PI * 2;
        const t1 = ((i + 1) / segT) * Math.PI * 2;

        for (let j = 0; j <= segS; j++) {
            const s = -1 + (j / segS) * 2;

            // Longitudinal segments (along t)
            if (i < segT) {
                const a = mobius(t0, s);
                const b = mobius(t1, s);
                positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
            }

            // Transverse segments (along s)
            if (j < segS) {
                const sNext = -1 + ((j + 1) / segS) * 2;
                const a = mobius(t0, s);
                const b = mobius(t0, sNext);
                positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
            }
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({ color: 0x00ff41 });
    const strip = new THREE.LineSegments(geo, mat);
    strip.name = 'MoebiusWalkway';
    strip.position.set(0, 2, 15);

    // Small glowing twist marker — a wireframe sphere at the halfway twist point
    // Place it at t = π (the halfway twist point), s = 0
    const markerPos = mobius(Math.PI, 0);
    const markerGeo = new THREE.SphereGeometry(0.25, 6, 4);
    const markerWire = new THREE.WireframeGeometry(markerGeo);
    const markerMat = new THREE.LineBasicMaterial({ color: 0x66ff99 });
    const marker = new THREE.LineSegments(markerWire, markerMat);
    marker.name = 'MoebiusTwistMarker';
    marker.position.copy(markerPos);
    strip.add(marker);

    markerGeo.dispose();

    return { strip, marker };
}

/**
 * Create an animator that pulses the Möbius twist marker.
 * Uses the time parameter from ZoneBase instead of Date.now() for determinism.
 *
 * @param {THREE.LineSegments} marker
 * @returns {(dt: number, time: number, joshPos: THREE.Vector3|null) => void}
 */
export function createMoebiusAnimator(marker) {
    return (_dt, time, _joshPos) => {
        const pulse = 0.8 + 0.2 * Math.sin(time * 3.0);
        marker.scale.setScalar(pulse);
    };
}
