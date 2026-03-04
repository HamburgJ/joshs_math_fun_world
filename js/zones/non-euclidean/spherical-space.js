import * as THREE from 'three';

/**
 * Sub-zone 5B: Spherical / Elliptic Space (κ > 0)
 *
 * Josh stands inside a sphere. Lines that start parallel converge
 * and meet. A triangle has angle sum > 180°. Walking straight brings
 * you back to where you started.
 *
 * Extracted from the monolithic NonEuclideanZone for maintainability.
 * No changes to visual behavior — just cleaner module boundaries.
 */
export class SphericalSpace {
    constructor() {
        /** @type {THREE.Group} */
        this.group = new THREE.Group();
        this.group.name = 'Spherical_5B';

        /** @type {number} */
        this._time = 0;

        /** @type {THREE.ShaderMaterial|null} */
        this._floorMat = null;

        /** @type {THREE.Mesh[]} Triangle vertex markers */
        this._glowSpheres = [];

        /** @type {THREE.LineSegments|null} antipodal marker */
        this._antipodalMarker = null;

        /** @type {THREE.Group|null} antipodal ghost */
        this._antipodalGhost = null;

        this._build();
    }

    // ─── Construction ───────────────────────────────────────────────────

    /** @private */
    _build() {
        this._buildFloor();
        this._buildTriangle();
        this._buildAntipodalPoint();
        
    }

    // ─── Floor: inside-of-sphere with lat/long shader ───────────────────

    /** @private */
    _buildFloor() {
        const radius = 30;
        const geometry = new THREE.SphereGeometry(radius, 32, 24);

        this._floorMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                uTime: { value: 0 },
                uRadius: { value: radius },
            },
            vertexShader: /* glsl */ `
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPos = wp.xyz;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float uTime;
                uniform float uRadius;
                varying vec3 vWorldPos;
                varying vec2 vUv;

                void main() {
                    float lat = vUv.y * 3.14159265;
                    float lon = vUv.x * 2.0 * 3.14159265;

                    float numLat = 12.0;
                    float numLon = 12.0;

                    float latLine = abs(fract(lat * numLat / 3.14159265) - 0.5);
                    float lonLine = abs(fract(lon * numLon / (2.0 * 3.14159265)) - 0.5);

                    float lineWidth = 0.04;
                    float gridLat = 1.0 - smoothstep(0.0, lineWidth, latLine);
                    float gridLon = 1.0 - smoothstep(0.0, lineWidth, lonLine);
                    float grid = max(gridLat, gridLon);

                    // Pentagon hint: 5-fold symmetry
                    float pentAngle = mod(lon, 2.0 * 3.14159265 / 5.0);
                    float pentLine = 1.0 - smoothstep(0.0, 0.05, abs(pentAngle));
                    grid = max(grid, pentLine * 0.4);

                    vec3 bg = vec3(0.06, 0.03, 0.08);
                    vec3 lineColor = vec3(1.0, 0.53, 0.27);
                    lineColor *= 0.8 + 0.2 * sin(uTime * 1.2 + lat * 2.0);

                    vec3 col = mix(bg, lineColor, grid * 0.9);
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
        });

        const mesh = new THREE.Mesh(geometry, this._floorMat);
        mesh.name = 'SphericalShell';
        this.group.add(mesh);
    }

    // ─── Spherical Triangle (three right angles, 270°) ──────────────────

    /** @private */
    _buildTriangle() {
        const R = 29.5;
        const sphereGeo = new THREE.SphereGeometry(0.4, 6, 4);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xf5cc45 });

        const A = new THREE.Vector3(R, 0, 0);
        const B = new THREE.Vector3(0, 0, -R);
        const C = new THREE.Vector3(0, R, 0);
        const triVerts = [A, B, C];

        for (const v of triVerts) {
            const sphere = new THREE.Mesh(sphereGeo, sphereMat.clone());
            sphere.position.copy(v);
            this.group.add(sphere);
            this._glowSpheres.push(sphere);
        }

        // Great-circle arcs via slerp
        const arcPoints = [];
        for (let i = 0; i < 3; i++) {
            const p0 = triVerts[i];
            const p1 = triVerts[(i + 1) % 3];
            const segs = 12;
            for (let s = 0; s < segs; s++) {
                const t0 = s / segs;
                const t1 = (s + 1) / segs;
                arcPoints.push(this._slerp(p0, p1, t0, R));
                arcPoints.push(this._slerp(p0, p1, t1, R));
            }
        }

        const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
        const arcMat = new THREE.LineBasicMaterial({ color: 0xf5cc45 });
        const arcs = new THREE.LineSegments(arcGeo, arcMat);
        arcs.name = 'SphericalTriangleArcs';
        this.group.add(arcs);
    }

    /**
     * Spherical linear interpolation.
     * @param {THREE.Vector3} a
     * @param {THREE.Vector3} b
     * @param {number} t
     * @param {number} radius
     * @returns {THREE.Vector3}
     * @private
     */
    _slerp(a, b, t, radius) {
        const na = a.clone().normalize();
        const nb = b.clone().normalize();
        const dot = THREE.MathUtils.clamp(na.dot(nb), -1, 1);
        const omega = Math.acos(dot);
        if (omega < 0.001) return new THREE.Vector3().lerpVectors(a, b, t);
        const sinOmega = Math.sin(omega);
        const wa = Math.sin((1 - t) * omega) / sinOmega;
        const wb = Math.sin(t * omega) / sinOmega;
        return new THREE.Vector3(
            na.x * wa + nb.x * wb,
            na.y * wa + nb.y * wb,
            na.z * wa + nb.z * wb,
        ).multiplyScalar(radius);
    }

    // ─── Antipodal Point & Ghost ────────────────────────────────────────

    /** @private */
    _buildAntipodalPoint() {
        const R = 29.5;
        const antiPos = new THREE.Vector3(-R, 0, 0);

        // Wireframe marker
        const markerGeo = new THREE.OctahedronGeometry(1.0);
        const wireGeo = new THREE.WireframeGeometry(markerGeo);
        const wireMat = new THREE.LineBasicMaterial({ color: 0xFF4488 });
        const marker = new THREE.LineSegments(wireGeo, wireMat);
        marker.position.copy(antiPos);
        marker.name = 'AntipodalMarker';
        this.group.add(marker);
        markerGeo.dispose();

        // Ghost stick-figure
        const ghostGroup = new THREE.Group();
        ghostGroup.position.copy(antiPos);
        ghostGroup.name = 'AntipodalGhost';

        const ghostMat = new THREE.LineBasicMaterial({ color: 0xFF4488, transparent: true, opacity: 0.5 });

        const headGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(0.3, 4, 3));
        const head = new THREE.LineSegments(headGeo, ghostMat);
        head.position.y = 1.8;
        ghostGroup.add(head);

        const bodyGeo = new THREE.WireframeGeometry(new THREE.CylinderGeometry(0.15, 0.2, 1.0, 4));
        const body = new THREE.LineSegments(bodyGeo, ghostMat);
        body.position.y = 1.0;
        ghostGroup.add(body);

        const legGeo = new THREE.WireframeGeometry(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 3));
        const legL = new THREE.LineSegments(legGeo, ghostMat);
        legL.position.set(-0.15, 0.3, 0);
        ghostGroup.add(legL);
        const legR = new THREE.LineSegments(legGeo, ghostMat);
        legR.position.set(0.15, 0.3, 0);
        ghostGroup.add(legR);

        this.group.add(ghostGroup);
        this._antipodalMarker = marker;
        this._antipodalGhost = ghostGroup;
    }

    // ─── Public API ─────────────────────────────────────────────────────

    /**
     * Per-frame update.
     * @param {number} dt
     */
    update(dt) {
        this._time += dt;

        if (this._floorMat) {
            this._floorMat.uniforms.uTime.value = this._time;
        }

        for (const sphere of this._glowSpheres) {
            const s = 0.9 + 0.2 * Math.sin(this._time * 3.0);
            sphere.scale.setScalar(s);
        }

        if (this._antipodalMarker) {
            this._antipodalMarker.rotation.y += dt * 1.2;
            this._antipodalMarker.rotation.x += dt * 0.4;
        }
        if (this._antipodalGhost) {
            this._antipodalGhost.rotation.y += dt * 0.3;
        }
    }

    /**
     * @returns {{ position: THREE.Vector3, label: string, type: string }[]}
     */
    getInteractables() {
        return [
            {
                position: new THREE.Vector3(10, 5, -5),
                label: 'Curved Triangle',
                type: 'triangle',
            },
            {
                position: new THREE.Vector3(-29.5, 0, 0),
                label: 'Antipodal Point',
                type: 'antipodal',
            },
        ];
    }

    /**
     * Terrain height for the spherical interior.
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    getTerrainHeight(x, z) {
        const R = 30;
        const distSq = x * x + z * z;
        if (distSq >= R * R) return 0;
        return -Math.sqrt(R * R - distSq) + R;
    }
}
