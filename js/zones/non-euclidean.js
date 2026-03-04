import * as THREE from 'three';

/**
 * Zone 5: The Impossible Space — Non-Euclidean Geometry
 *
 * Three sub-zones where the rules of Euclid bend, break, and disappear:
 *   5A  Hyperbolic Space   (Poincaré disk model, κ < 0)
 *   5B  Spherical Space    (inside a sphere, κ > 0)
 *   5C  Transition / Flat  (ordinary Euclidean grid, κ = 0 — somehow the eeriest of all)
 *
 * Shell Bingby once said: "Euclid had one good idea and then stopped thinking.
 * The universe kept going."
 */
export class NonEuclideanZone {
    constructor() {
        /** @type {THREE.Group} Root container for the entire zone */
        this.group = new THREE.Group();
        this.group.name = 'NonEuclideanZone';

        /**
         * Currently active sub-zone.
         * @type {'hyperbolic'|'spherical'|'transition'}
         */
        this._activeSubZone = 'hyperbolic';

        /** @type {number} Accumulated time for animation */
        this._time = 0;

        /** @type {THREE.Group} Container for hyperbolic sub-zone (5A) */
        this._hyperbolicGroup = new THREE.Group();
        this._hyperbolicGroup.name = 'Hyperbolic_5A';

        /** @type {THREE.Group} Container for spherical sub-zone (5B) */
        this._sphericalGroup = new THREE.Group();
        this._sphericalGroup.name = 'Spherical_5B';

        /** @type {THREE.Group} Container for transition sub-zone (5C) */
        this._transitionGroup = new THREE.Group();
        this._transitionGroup.name = 'Transition_5C';

        this.group.add(this._hyperbolicGroup);
        this.group.add(this._sphericalGroup);
        this.group.add(this._transitionGroup);

        /** @type {THREE.Mesh[]} Glowing spheres that pulse */
        this._glowSpheres = [];

        /** @type {THREE.ShaderMaterial|null} Hyperbolic floor shader */
        this._hyperbolicFloorMat = null;

        /** @type {THREE.ShaderMaterial|null} Spherical floor shader */
        this._sphericalFloorMat = null;

        /** @type {{ mesh: THREE.Object3D, speed: THREE.Vector3 }[]} Animated tree nodes */
        this._treeNodes = [];

        /** @type {THREE.Sprite|null} Curvature label sprite (updated per sub-zone) */
        this._curvatureSprite = null;

        // Build everything
        this._buildHyperbolicZone();
        this._buildSphericalZone();
        this._buildTransitionZone();

        // Start with hyperbolic visible
        this.setSubZone('hyperbolic');
    }

    // ═══════════════════════ 5A: HYPERBOLIC SPACE ══════════════════════

    /**
     * Build the Poincaré disk floor, triangle demo, hyperbolic trees,
     * and curvature label for sub-zone 5A.
     * @private
     */
    _buildHyperbolicZone() {
        this._buildHyperbolicFloor();
        this._buildHyperbolicTriangle();
        this._buildHyperbolicTrees();
    }

    /**
     * Poincaré disk on the floor — a circular PlaneGeometry with a
     * ShaderMaterial that renders concentric hyperbolic rings and radial
     * geodesics.  Disk radius ≈ 20 world units.
     * @private
     */
    _buildHyperbolicFloor() {
        const diskRadius = 20;
        const segments = 48; // low-poly PS1
        const geometry = new THREE.CircleGeometry(diskRadius, segments);
        geometry.rotateX(-Math.PI / 2);

        this._hyperbolicFloorMat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: true,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: { value: 0 },
                uDiskRadius: { value: diskRadius },
            },
            vertexShader: /* glsl */ `
                varying vec3 vWorldPos;
                void main() {
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPos = wp.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float uTime;
                uniform float uDiskRadius;
                varying vec3 vWorldPos;

                void main() {
                    vec2 p = vWorldPos.xz;
                    float r = length(p) / uDiskRadius;  // normalised Euclidean radius [0,1)

                    // Discard outside the disk boundary
                    if (r >= 1.0) discard;

                    // ── Hyperbolic distance from centre ────────────
                    float d = 2.0 * atanh(r);            // d → ∞ as r → 1

                    // ── Background ─────────────────────────────────
                    vec3 bg = vec3(0.02, 0.02, 0.063);   // #050510

                    // ── Concentric hyperbolic rings ─────────────────
                    float ringSpacing = 1.0;
                    float ringFrac = fract(d / ringSpacing);
                    float ring = 1.0 - smoothstep(0.0, 0.08, abs(ringFrac - 0.5) - 0.42);

                    // ── Radial geodesics (straight-line approx) ────
                    float angle = atan(p.y, p.x);
                    float numRadials = 7.0;              // matches {7,3} heptagonal motif
                    float aFrac = fract(angle * numRadials / (2.0 * 3.14159265));
                    float radial = 1.0 - smoothstep(0.0, 0.06, abs(aFrac - 0.5) - 0.42);

                    // Scale radials intensity with distance so they thin out near boundary
                    radial *= smoothstep(0.05, 0.15, r);

                    // ── Boundary circle glow ───────────────────────
                    float edgeGlow = smoothstep(0.92, 1.0, r) * 0.5;

                    // ── Compose ────────────────────────────────────
                    float lineIntensity = max(ring, radial);
                    vec3 lineColor = vec3(0.0, 0.8, 0.4);  // #00CC66

                    // Subtle pulse
                    lineIntensity *= 0.8 + 0.2 * sin(uTime * 1.5 + d * 0.5);

                    vec3 col = mix(bg, lineColor, lineIntensity);
                    col += vec3(0.0, 0.6, 0.3) * edgeGlow;

                    // Fade alpha near edge for blending
                    float alpha = 1.0 - smoothstep(0.96, 1.0, r);

                    gl_FragColor = vec4(col, alpha);
                }
            `,
        });

        const mesh = new THREE.Mesh(geometry, this._hyperbolicFloorMat);
        mesh.position.y = 0;
        mesh.name = 'HyperbolicDisk';
        mesh.renderOrder = -1;
        this._hyperbolicGroup.add(mesh);

        // Thin boundary ring
        const ringGeo = new THREE.RingGeometry(diskRadius - 0.1, diskRadius, segments);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00CC66,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.01;
        ring.name = 'DiskBoundary';
        this._hyperbolicGroup.add(ring);
    }

    /**
     * Three glowing spheres forming a hyperbolic triangle near the centre
     * of the Poincaré disk, with connecting line segments and an angle label.
     * @private
     */
    _buildHyperbolicTriangle() {
        // Triangle vertices (in Euclidean coords, near disk centre)
        const verts = [
            new THREE.Vector3(-3, 0.3, -1),
            new THREE.Vector3(3, 0.3, -1),
            new THREE.Vector3(0, 0.3, 4),
        ];

        const sphereGeo = new THREE.SphereGeometry(0.25, 6, 4);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0x00FFAA });

        for (const v of verts) {
            const sphere = new THREE.Mesh(sphereGeo, sphereMat.clone());
            sphere.position.copy(v);
            this._hyperbolicGroup.add(sphere);
            this._glowSpheres.push(sphere);
        }

        // Connect with line segments (geodesic approx — straight near centre)
        const linePoints = [];
        for (let i = 0; i < 3; i++) {
            const a = verts[i];
            const b = verts[(i + 1) % 3];
            // Subdivide each edge for a slight curve hint
            const subdivisions = 8;
            for (let s = 0; s < subdivisions; s++) {
                const t0 = s / subdivisions;
                const t1 = (s + 1) / subdivisions;
                const p0 = new THREE.Vector3().lerpVectors(a, b, t0);
                const p1 = new THREE.Vector3().lerpVectors(a, b, t1);
                // Slight inward curve: push midpoints toward centre
                const mid = (t0 + t1) / 2;
                const curveFactor = 0.15 * Math.sin(mid * Math.PI);
                const centre = new THREE.Vector3(0, 0.3, 0.67);
                p0.lerp(centre, curveFactor * 0.5);
                p1.lerp(centre, curveFactor * 0.5);
                linePoints.push(p0, p1);
            }
        }

        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x00FFAA });
        const lines = new THREE.LineSegments(lineGeo, lineMat);
        lines.name = 'HyperbolicTriangleEdges';
        this._hyperbolicGroup.add(lines);
    }

    /**
     * Build 4 hyperbolic trees — binary branching structures that spread
     * exponentially.  Very low-poly: cylinders + sphere nodes.
     * @private
     */
    _buildHyperbolicTrees() {
        const positions = [
            new THREE.Vector3(-10, 0, -5),
            new THREE.Vector3(8, 0, -7),
            new THREE.Vector3(-6, 0, 8),
            new THREE.Vector3(9, 0, 6),
        ];

        for (const rootPos of positions) {
            const treeGroup = new THREE.Group();
            treeGroup.position.copy(rootPos);
            treeGroup.name = 'HyperbolicTree';
            this._buildBranch(treeGroup, new THREE.Vector3(0, 0, 0), Math.PI / 2, 2.0, 0, 4);
            this._hyperbolicGroup.add(treeGroup);
        }
    }

    /**
     * Recursively build a hyperbolic-feel branch.
     * @param {THREE.Group} parent   Group to attach to
     * @param {THREE.Vector3} base   Base position of this branch
     * @param {number} angle         Growth angle (radians from vertical, in XY plane)
     * @param {number} length        Branch length
     * @param {number} depth         Current recursion depth
     * @param {number} maxDepth      Maximum recursion depth
     * @private
     */
    _buildBranch(parent, base, angle, length, depth, maxDepth) {
        if (depth >= maxDepth) return;

        const branchColor = new THREE.Color().setHSL(0.38 - depth * 0.04, 0.8, 0.35 + depth * 0.05);

        // End point
        const end = new THREE.Vector3(
            base.x + Math.cos(angle) * length * 0.3,
            base.y + Math.sin(angle) * length,
            base.z,
        );

        // Cylinder segment
        const dir = new THREE.Vector3().subVectors(end, base);
        const dist = dir.length();
        const cylGeo = new THREE.CylinderGeometry(
            0.06 * (1 - depth * 0.15),
            0.08 * (1 - depth * 0.15),
            dist,
            4,
        );
        const cylMat = new THREE.MeshBasicMaterial({ color: branchColor });
        const cyl = new THREE.Mesh(cylGeo, cylMat);

        // Position at midpoint and orient
        const mid = new THREE.Vector3().addVectors(base, end).multiplyScalar(0.5);
        cyl.position.copy(mid);
        cyl.lookAt(end);
        cyl.rotateX(Math.PI / 2);
        parent.add(cyl);

        // Node sphere at end
        const nodeGeo = new THREE.SphereGeometry(0.1, 4, 3);
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00FF88 });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.copy(end);
        parent.add(node);

        this._treeNodes.push({
            mesh: node,
            speed: new THREE.Vector3(0.5 + depth * 0.2, 0.3 + depth * 0.1, 0),
        });

        // Hyperbolic branching: spread angle increases with depth
        const spreadBase = 0.5;
        const spreadGrowth = 0.25; // grows wider per level — "more room" in hyperbolic space
        const spread = spreadBase + spreadGrowth * depth;
        const nextLength = length * 0.72;

        // Two child branches
        this._buildBranch(parent, end, angle + spread, nextLength, depth + 1, maxDepth);
        this._buildBranch(parent, end, angle - spread, nextLength, depth + 1, maxDepth);
    }

    // ═══════════════════════ 5B: SPHERICAL SPACE ═══════════════════════

    /**
     * Build the interior sphere, spherical triangle, antipodal marker,
     * and curvature label for sub-zone 5B.
     * @private
     */
    _buildSphericalZone() {
        this._buildSphericalFloor();
        this._buildSphericalTriangle();
        this._buildAntipodalPoint();
    }

    /**
     * A large sphere rendered from the inside (BackSide) with a lat/long
     * grid shader.  Camera and Josh live inside.
     * @private
     */
    _buildSphericalFloor() {
        const radius = 30;
        const geometry = new THREE.SphereGeometry(radius, 32, 24);

        this._sphericalFloorMat = new THREE.ShaderMaterial({
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
                    // ── Lat / Long grid ────────────────────────────
                    float lat = vUv.y * 3.14159265;       // [0, π]
                    float lon = vUv.x * 2.0 * 3.14159265; // [0, 2π]

                    float numLat = 12.0;
                    float numLon = 12.0;

                    float latLine = abs(fract(lat * numLat / 3.14159265) - 0.5);
                    float lonLine = abs(fract(lon * numLon / (2.0 * 3.14159265)) - 0.5);

                    float lineWidth = 0.04;
                    float gridLat = 1.0 - smoothstep(0.0, lineWidth, latLine);
                    float gridLon = 1.0 - smoothstep(0.0, lineWidth, lonLine);
                    float grid = max(gridLat, gridLon);

                    // ── Pentagon hint: 5-fold symmetry overlay ─────
                    float pentAngle = mod(lon, 2.0 * 3.14159265 / 5.0);
                    float pentLine = 1.0 - smoothstep(0.0, 0.05, abs(pentAngle));
                    grid = max(grid, pentLine * 0.4);

                    // ── Colour ─────────────────────────────────────
                    vec3 bg = vec3(0.06, 0.03, 0.08);
                    vec3 lineColor = vec3(1.0, 0.53, 0.27); // warm orange #FF8844
                    lineColor *= 0.8 + 0.2 * sin(uTime * 1.2 + lat * 2.0);

                    vec3 col = mix(bg, lineColor, grid * 0.9);

                    gl_FragColor = vec4(col, 1.0);
                }
            `,
        });

        const mesh = new THREE.Mesh(geometry, this._sphericalFloorMat);
        mesh.name = 'SphericalShell';
        this._sphericalGroup.add(mesh);
    }

    /**
     * Three glowing spheres forming a triangle on the sphere surface with
     * three right angles (total 270°).  Positioned like a globe:
     *   A = equator / prime meridian
     *   B = equator / 90° E
     *   C = north pole
     * Connected by great-circle arc segments.
     * @private
     */
    _buildSphericalTriangle() {
        const R = 29.5; // slightly inside the shell
        const sphereGeo = new THREE.SphereGeometry(0.4, 6, 4);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xf5cc45 });

        // Positions on the sphere surface
        const A = new THREE.Vector3(R, 0, 0);                               // equator, 0°
        const B = new THREE.Vector3(0, 0, -R);                              // equator, 90°
        const C = new THREE.Vector3(0, R, 0);                               // north pole

        const triVerts = [A, B, C];

        for (const v of triVerts) {
            const sphere = new THREE.Mesh(sphereGeo, sphereMat.clone());
            sphere.position.copy(v);
            this._sphericalGroup.add(sphere);
            this._glowSpheres.push(sphere);
        }

        // Great-circle arcs (subdivided)
        const arcPoints = [];
        for (let i = 0; i < 3; i++) {
            const p0 = triVerts[i];
            const p1 = triVerts[(i + 1) % 3];
            const segs = 12;
            for (let s = 0; s < segs; s++) {
                const t0 = s / segs;
                const t1 = (s + 1) / segs;
                // Slerp on sphere surface
                const a0 = this._slerp(p0, p1, t0, R);
                const a1 = this._slerp(p0, p1, t1, R);
                arcPoints.push(a0, a1);
            }
        }

        const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
        const arcMat = new THREE.LineBasicMaterial({ color: 0xf5cc45 });
        const arcs = new THREE.LineSegments(arcGeo, arcMat);
        arcs.name = 'SphericalTriangleArcs';
        this._sphericalGroup.add(arcs);
    }

    /**
     * Spherical linear interpolation between two points, projected onto
     * a sphere of given radius.
     * @param {THREE.Vector3} a Start point
     * @param {THREE.Vector3} b End point
     * @param {number} t       Interpolation factor [0,1]
     * @param {number} radius  Sphere radius
     * @returns {THREE.Vector3}
     * @private
     */
    _slerp(a, b, t, radius) {
        const na = a.clone().normalize();
        const nb = b.clone().normalize();
        const dot = THREE.MathUtils.clamp(na.dot(nb), -1, 1);
        const omega = Math.acos(dot);
        if (omega < 0.001) {
            // Nearly identical — lerp
            return new THREE.Vector3().lerpVectors(a, b, t);
        }
        const sinOmega = Math.sin(omega);
        const wa = Math.sin((1 - t) * omega) / sinOmega;
        const wb = Math.sin(t * omega) / sinOmega;
        return new THREE.Vector3(
            na.x * wa + nb.x * wb,
            na.y * wa + nb.y * wb,
            na.z * wa + nb.z * wb,
        ).multiplyScalar(radius);
    }

    /**
     * A glowing wireframe marker at the antipodal point from Josh's
     * starting position, plus a ghostly wireframe "person" shape.
     * @private
     */
    _buildAntipodalPoint() {
        const R = 29.5;
        // Josh nominally starts near (+R, 0, 0), so antipodal is (−R, 0, 0)
        const antiPos = new THREE.Vector3(-R, 0, 0);

        // Glow marker
        const markerGeo = new THREE.OctahedronGeometry(1.0);
        const wireGeo = new THREE.WireframeGeometry(markerGeo);
        const wireMat = new THREE.LineBasicMaterial({ color: 0xFF4488 });
        const marker = new THREE.LineSegments(wireGeo, wireMat);
        marker.position.copy(antiPos);
        marker.name = 'AntipodalMarker';
        this._sphericalGroup.add(marker);
        markerGeo.dispose();

        // Ghost wireframe "person" — very rough stick-figure approximation
        const ghostGroup = new THREE.Group();
        ghostGroup.position.copy(antiPos);
        ghostGroup.name = 'AntipodalGhost';

        // Head
        const headGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(0.3, 4, 3));
        const ghostMat = new THREE.LineBasicMaterial({ color: 0xFF4488, transparent: true, opacity: 0.5 });
        const head = new THREE.LineSegments(headGeo, ghostMat);
        head.position.y = 1.8;
        ghostGroup.add(head);

        // Body
        const bodyGeo = new THREE.WireframeGeometry(new THREE.CylinderGeometry(0.15, 0.2, 1.0, 4));
        const body = new THREE.LineSegments(bodyGeo, ghostMat);
        body.position.y = 1.0;
        ghostGroup.add(body);

        // Legs
        const legGeo = new THREE.WireframeGeometry(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 3));
        const legL = new THREE.LineSegments(legGeo, ghostMat);
        legL.position.set(-0.15, 0.3, 0);
        ghostGroup.add(legL);
        const legR = new THREE.LineSegments(legGeo, ghostMat);
        legR.position.set(0.15, 0.3, 0);
        ghostGroup.add(legR);

        this._sphericalGroup.add(ghostGroup);

        this._antipodalMarker = marker;
        this._antipodalGhost = ghostGroup;
    }

    // ═══════════════════════ 5C: TRANSITION SPACE ══════════════════════

    /**
     * Build the eerily normal Euclidean flat zone:
     * plain grid, one lonely curvature label.
     * @private
     */
    _buildTransitionZone() {
        // Standard grid floor — the most unsettling normalcy in Josh's Math Fun World
        const grid = new THREE.GridHelper(60, 60, 0xAAAAAA, 0x666666);
        grid.name = 'FlatGrid';
        this._transitionGroup.add(grid);

        // Faint floor plane so there's a surface to walk on
        const floorGeo = new THREE.PlaneGeometry(60, 60, 1, 1);
        floorGeo.rotateX(-Math.PI / 2);
        const floorMat = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.01;
        floor.name = 'FlatFloor';
        floor.renderOrder = -1;
        this._transitionGroup.add(floor);

        // Floating text: emphasis on the eerie flatness
        const flatLabel = this.
        flatLabel.position.set(0, 2, 0);
        flatLabel.name = 'FlatCaption';
        this._transitionGroup.add(flatLabel);
    }

    // ═══════════════════════ SHARED HELPERS ════════════════════════════

    /**
     * Create a billboard sprite with canvas-rendered text.
     * PS1-aesthetic: nearest-filter, chunky pixels.
     * @param {string} text       Label content
     * @param {string} fillColor  CSS colour for the text
     * @param {number} [w=128]    Canvas width
     * @param {number} [h=64]     Canvas height
     * @param {string} [fontSize='24px'] CSS font-size value
     * @returns {THREE.Sprite}
     * @private
     */

    // ═══════════════════════════ PUBLIC API ═════════════════════════════

    /**
     * Returns the zone's root scene-graph group.
     * @returns {THREE.Group}
     */
    getScene() {
        return this.group;
    }

    /**
     * Per-frame update — animates shaders, glow pulses, tree sway,
     * and the antipodal marker spin.
     * @param {number} dt Delta time in seconds
     */
    update(dt) {
        this._time += dt;

        // Shader time uniforms
        if (this._hyperbolicFloorMat) {
            this._hyperbolicFloorMat.uniforms.uTime.value = this._time;
        }
        if (this._sphericalFloorMat) {
            this._sphericalFloorMat.uniforms.uTime.value = this._time;
        }

        // Glow sphere pulse
        for (const sphere of this._glowSpheres) {
            const s = 0.9 + 0.2 * Math.sin(this._time * 3.0);
            sphere.scale.setScalar(s);
        }

        // Tree node gentle sway
        for (const node of this._treeNodes) {
            node.mesh.position.x += Math.sin(this._time * node.speed.x) * 0.002;
            node.mesh.position.y += Math.cos(this._time * node.speed.y) * 0.001;
        }

        // Antipodal marker spin
        if (this._antipodalMarker) {
            this._antipodalMarker.rotation.y += dt * 1.2;
            this._antipodalMarker.rotation.x += dt * 0.4;
        }
        if (this._antipodalGhost) {
            this._antipodalGhost.rotation.y += dt * 0.3;
        }
    }

    /**
     * Show or hide the entire zone.
     * @param {boolean} visible
     */
    setVisible(visible) {
        this.group.visible = visible;
    }

    /**
     * Switch to a specific sub-zone, hiding the others.
     * @param {'hyperbolic'|'spherical'|'transition'} name
     */
    setSubZone(name) {
        const valid = ['hyperbolic', 'spherical', 'transition'];
        if (!valid.includes(name)) {
            console.warn(`[NonEuclideanZone] Unknown sub-zone: "${name}". Valid: ${valid.join(', ')}`);
            return;
        }

        this._activeSubZone = name;
        this._hyperbolicGroup.visible = (name === 'hyperbolic');
        this._sphericalGroup.visible = (name === 'spherical');
        this._transitionGroup.visible = (name === 'transition');
    }

    /**
     * Returns the currently active sub-zone name.
     * @returns {'hyperbolic'|'spherical'|'transition'}
     */
    getActiveSubZone() {
        return this._activeSubZone;
    }

    /**
     * Returns the terrain height at a given (x, z) position.
     * - Hyperbolic / Transition: flat, returns 0
     * - Spherical: returns the sphere surface height at (x, z)
     * @param {number} x World X
     * @param {number} z World Z
     * @returns {number} Y height
     */
    getTerrainHeight(x, z) {
        if (this._activeSubZone === 'spherical') {
            const R = 30;
            const distSq = x * x + z * z;
            if (distSq >= R * R) return 0;
            // Inside the sphere: surface below Josh is the lower hemisphere
            // y = -sqrt(R² - x² - z²) for lower half, but Josh walks on the inner bottom
            // Return the lowest point — negative Y inner surface
            return -Math.sqrt(R * R - distSq) + R; // maps bottom of sphere to y ≈ 0
        }
        return 0;
    }

    /**
     * Returns an array of interactable positions for the current sub-zone.
     * Used by the interaction system to display prompts / tooltips.
     * @returns {{ position: THREE.Vector3, label: string, type: string }[]}
     */
    getInteractablePositions() {
        const results = [];

        if (this._activeSubZone === 'hyperbolic') {
            results.push({
                position: new THREE.Vector3(0, 1.5, 1),
                label: 'Hyperbolic Triangle: angle sum < 180°',
                type: 'triangle',
            });
        }

        if (this._activeSubZone === 'spherical') {
            results.push({
                position: new THREE.Vector3(10, 5, -5),
                label: 'Spherical Triangle: angle sum > 180°',
                type: 'triangle',
            });
            results.push({
                position: new THREE.Vector3(-29.5, 0, 0),
                label: 'Antipodal Point',
                type: 'antipodal',
            });
        }

        if (this._activeSubZone === 'transition') {
            results.push({
                position: new THREE.Vector3(0, 3, -5),
                label: 'Flat space — curvature κ = 0',
                type: 'info',
            });
        }

        return results;
    }
}
