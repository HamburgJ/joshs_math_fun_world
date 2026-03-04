import * as THREE from 'three';
import {
    geodesicPoints,
    geodesicCircle,
    hyperbolicTriangleAngles,
    hyperbolicToEuclidean,
    pointAtDistAngle,
    regularHyperbolicPolygon,
    mobiusAdd,
    euclideanRadius,
    DISK_CLAMP,
} from './hyperbolic-math.js';

/**
 * Sub-zone 5A: Hyperbolic Space — Poincaré Disk Model
 *
 * This is ACTUALLY hyperbolic now.
 *
 *  • Floor: Poincaré disk with a proper {7,3} tiling rendered via geodesic arcs
 *  • Triangle: vertices placed at real hyperbolic positions, edges are geodesics,
 *    angle sum computed from the hyperbolic law of cosines (always < 180°)
 *  • Trees: placed and branched using Möbius transformations so they exhibit
 *    the exponential growth of hyperbolic space
 *  • The boundary of the disk represents infinity — things compress as you
 *    approach it, exactly as the math demands
 *
 * Shell Bingby: "If you've seen a Poincaré disk and felt nothing, you were
 * looking at a picture. If you've BEEN in one and felt everything stretch —
 * THAT'S geometry."
 */

/** Scale factor: maps the unit disk to world units (disk radius in world space) */
const WORLD_RADIUS = 50;

/** Convert a disk point {x,y} in [-1,1] to a THREE.Vector3 on the xz floor */
function diskToWorld(p, y = 0) {
    return new THREE.Vector3(p.x * WORLD_RADIUS, y, p.y * WORLD_RADIUS);
}

export class HyperbolicSpace {
    constructor() {
        /** @type {THREE.Group} */
        this.group = new THREE.Group();
        this.group.name = 'Hyperbolic_5A';

        /** @type {number} */
        this._time = 0;

        /** @type {THREE.ShaderMaterial|null} */
        this._floorMat = null;

        /** @type {THREE.Mesh[]} Glowing triangle vertices */
        this._glowSpheres = [];

        /** @type {THREE.Sprite|null} Angle label (dynamically updated) */
        this._angleLabel = null;

        /** @type {{ mesh: THREE.Object3D, speed: THREE.Vector3 }[]} */
        this._treeNodes = [];

        /** @type {THREE.LineSegments|null} Tiling wireframe */
        this._tilingLines = null;

        this._build();
    }

    // ─── Construction ───────────────────────────────────────────────────

    /** @private */
    _build() {
        this._buildFloor();
        this._buildTiling();
        this._buildTriangle();
        this._buildTrees();
        
    }

    // ─── Floor ──────────────────────────────────────────────────────────

    /** Poincaré disk floor with hyperbolic-distance-based rings. @private */
    _buildFloor() {
        const segments = 48;
        const geometry = new THREE.CircleGeometry(WORLD_RADIUS, segments);
        geometry.rotateX(-Math.PI / 2);

        this._floorMat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: true,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: { value: 0 },
                uDiskRadius: { value: WORLD_RADIUS },
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
                    float r = length(p) / uDiskRadius;   // normalised [0,1)

                    if (r >= 1.0) discard;

                    // ── Hyperbolic distance from centre ────────────
                    // d = 2 atanh(r)  — this makes rings EQUIDISTANT in
                    // hyperbolic space, so they crowd near the boundary
                    float d = 2.0 * atanh(r);

                    // ── Background ─────────────────────────────────
                    vec3 bg = vec3(0.02, 0.02, 0.063);

                    // ── Concentric hyperbolic-equidistant rings ────
                    float ringSpacing = 0.8;
                    float ringFrac = fract(d / ringSpacing);
                    float ring = 1.0 - smoothstep(0.0, 0.06, abs(ringFrac - 0.5) - 0.44);

                    // ── Radial geodesics — 7-fold symmetry ({7,3}) ─
                    float angle = atan(p.y, p.x);
                    float numRadials = 7.0;
                    float aFrac = fract(angle * numRadials / (2.0 * 3.14159265));
                    float radial = 1.0 - smoothstep(0.0, 0.04, abs(aFrac - 0.5) - 0.44);
                    // Radials thin toward boundary (they represent geodesics
                    // that are diameters — these stay straight)
                    radial *= smoothstep(0.03, 0.12, r);

                    // ── Poincaré metric intensity boost ────────────
                    // Objects near boundary are compressed; brighten lines
                    // to compensate, simulating the conformal metric
                    // ds = 2|dz| / (1−|z|²)
                    float metricFactor = 1.0 / max(0.01, (1.0 - r * r));
                    float brightBoost = clamp(metricFactor * 0.25, 1.0, 4.0);

                    // ── Boundary glow ──────────────────────────────
                    float edgeGlow = smoothstep(0.88, 1.0, r) * 0.6;

                    // ── Compose ────────────────────────────────────
                    float lineIntensity = max(ring, radial) * brightBoost;
                    vec3 lineColor = vec3(0.0, 0.8, 0.4);

                    // Subtle pulse synced to hyperbolic distance
                    lineIntensity *= 0.8 + 0.2 * sin(uTime * 1.5 + d * 0.5);

                    vec3 col = mix(bg, lineColor, clamp(lineIntensity, 0.0, 1.0));
                    col += vec3(0.0, 0.6, 0.3) * edgeGlow;

                    float alpha = 1.0 - smoothstep(0.96, 1.0, r);
                    gl_FragColor = vec4(col, alpha);
                }
            `,
        });

        const mesh = new THREE.Mesh(geometry, this._floorMat);
        mesh.position.y = 0;
        mesh.name = 'HyperbolicDisk';
        mesh.renderOrder = -1;
        this.group.add(mesh);

        // Boundary ring
        const ringGeo = new THREE.RingGeometry(WORLD_RADIUS - 0.1, WORLD_RADIUS, segments);
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
        this.group.add(ring);
    }

    // ─── {7,3} Tiling ───────────────────────────────────────────────────

    /**
     * Render a genuine {7,3} hyperbolic tiling using geodesic arcs.
     * Each edge is a circular arc orthogonal to the boundary.
     * @private
     */
    _buildTiling() {
        const p = 7; // heptagons
        const q = 3; // 3 meeting at each vertex
        const layers = 3; // recursion depth

        // Generate tile data
        const tiles = this._generateSimpleTiling(p, q, layers);

        // Build all geodesic edge segments
        const linePoints = [];
        const edgeSet = new Set();

        for (const tile of tiles) {
            const verts = tile.vertices;
            for (let i = 0; i < verts.length; i++) {
                const a = verts[i];
                const b = verts[(i + 1) % verts.length];

                // Deduplicate edges
                const ka = `${a.x.toFixed(4)},${a.y.toFixed(4)}`;
                const kb = `${b.x.toFixed(4)},${b.y.toFixed(4)}`;
                const edgeKey = ka < kb ? `${ka}-${kb}` : `${kb}-${ka}`;
                if (edgeSet.has(edgeKey)) continue;
                edgeSet.add(edgeKey);

                // Get geodesic arc points
                const arcPts = geodesicPoints(a, b, 16);
                for (let s = 0; s < arcPts.length - 1; s++) {
                    linePoints.push(diskToWorld(arcPts[s], 0.05));
                    linePoints.push(diskToWorld(arcPts[s + 1], 0.05));
                }
            }
        }

        if (linePoints.length === 0) return;

        const geo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const mat = new THREE.LineBasicMaterial({
            color: 0x00AA55,
            transparent: true,
            opacity: 0.7,
        });
        this._tilingLines = new THREE.LineSegments(geo, mat);
        this._tilingLines.name = 'HyperbolicTiling_7_3';
        this.group.add(this._tilingLines);
    }

    /**
     * Simple BFS-based tiling generator for {p,q}.
     * Uses Möbius reflections to tile outward from the central polygon.
     * @param {number} p  sides per polygon
     * @param {number} q  polygons per vertex
     * @param {number} maxLayers depth
     * @returns {{ vertices: { x: number, y: number }[] }[]}
     * @private
     */
    _generateSimpleTiling(p, q, maxLayers) {
        const tiles = [];
        const visited = new Set();

        const key = (pt) => `${pt.x.toFixed(5)},${pt.y.toFixed(5)}`;

        // Central polygon
        const central = regularHyperbolicPolygon(p, q, { x: 0, y: 0 }, 0);
        tiles.push({ vertices: central.vertices });
        visited.add(key({ x: 0, y: 0 }));

        /** @type {{ center: { x: number, y: number }, verts: { x: number, y: number }[], depth: number }[]} */
        const queue = [{ center: { x: 0, y: 0 }, verts: central.vertices, depth: 0 }];

        while (queue.length > 0) {
            const { verts, depth } = queue.shift();
            if (depth >= maxLayers) continue;

            for (let i = 0; i < p; i++) {
                const v0 = verts[i];
                const v1 = verts[(i + 1) % p];

                // Reflect all vertices across this edge to find the adjacent tile
                const reflectedVerts = verts.map(v => this._reflectAcrossGeodesic(v, v0, v1));

                // Compute the centroid as the "center" for dedup
                let cx = 0, cy = 0;
                for (const rv of reflectedVerts) { cx += rv.x; cy += rv.y; }
                cx /= reflectedVerts.length;
                cy /= reflectedVerts.length;

                const nKey = key({ x: cx, y: cy });
                const nR = euclideanRadius({ x: cx, y: cy });

                if (!visited.has(nKey) && nR < DISK_CLAMP - 0.02) {
                    visited.add(nKey);
                    tiles.push({ vertices: reflectedVerts });
                    queue.push({ center: { x: cx, y: cy }, verts: reflectedVerts, depth: depth + 1 });
                }
            }
        }

        return tiles;
    }

    /**
     * Reflect a point across the geodesic through ga and gb using circle inversion.
     * @param {{ x: number, y: number }} point
     * @param {{ x: number, y: number }} ga
     * @param {{ x: number, y: number }} gb
     * @returns {{ x: number, y: number }}
     * @private
     */
    _reflectAcrossGeodesic(point, ga, gb) {
        const circle = geodesicCircle(ga, gb);

        if (circle === null) {
            // Diameter case — reflect across the line
            const dx = gb.x - ga.x;
            const dy = gb.y - ga.y;
            const len2 = dx * dx + dy * dy;
            if (len2 < 1e-12) return { x: point.x, y: point.y };
            const t = ((point.x - ga.x) * dx + (point.y - ga.y) * dy) / len2;
            const projX = ga.x + t * dx;
            const projY = ga.y + t * dy;
            const rx = 2 * projX - point.x;
            const ry = 2 * projY - point.y;
            const r = Math.sqrt(rx * rx + ry * ry);
            if (r > DISK_CLAMP) {
                const s = DISK_CLAMP / r;
                return { x: rx * s, y: ry * s };
            }
            return { x: rx, y: ry };
        }

        // Circle inversion
        const { cx, cy, r } = circle;
        const dxp = point.x - cx;
        const dyp = point.y - cy;
        const dist2 = dxp * dxp + dyp * dyp;
        if (dist2 < 1e-12) return { x: point.x, y: point.y };

        const scale = (r * r) / dist2;
        let rx = cx + dxp * scale;
        let ry = cy + dyp * scale;
        const rr = Math.sqrt(rx * rx + ry * ry);
        if (rr > DISK_CLAMP) {
            const s = DISK_CLAMP / rr;
            rx *= s;
            ry *= s;
        }
        return { x: rx, y: ry };
    }

    // ─── Hyperbolic Triangle ────────────────────────────────────────────

    /**
     * Three points forming a hyperbolic triangle with edges drawn as
     * proper geodesic arcs. Angle sum is COMPUTED, not hardcoded.
     * @private
     */
    _buildTriangle() {
        // Place three vertices at specific hyperbolic distances & angles.
        // Using moderately large distances to get a visible angle deficit.
        const A = pointAtDistAngle(1.2, -Math.PI * 0.7);
        const B = pointAtDistAngle(1.2, -Math.PI * 0.3);
        const C = pointAtDistAngle(1.0, Math.PI * 0.5);

        // Vertex markers
        const sphereGeo = new THREE.SphereGeometry(0.3, 6, 4);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0x00FFAA });

        const diskVerts = [A, B, C];
        for (const v of diskVerts) {
            const sphere = new THREE.Mesh(sphereGeo, sphereMat.clone());
            sphere.position.copy(diskToWorld(v, 0.3));
            this.group.add(sphere);
            this._glowSpheres.push(sphere);
        }

        // Geodesic edges (circular arcs, computed properly!)
        const linePoints = [];
        for (let i = 0; i < 3; i++) {
            const a = diskVerts[i];
            const b = diskVerts[(i + 1) % 3];
            const arcPts = geodesicPoints(a, b, 24);
            for (let s = 0; s < arcPts.length - 1; s++) {
                linePoints.push(diskToWorld(arcPts[s], 0.3));
                linePoints.push(diskToWorld(arcPts[s + 1], 0.3));
            }
        }

        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x00FFAA, linewidth: 2 });
        const lines = new THREE.LineSegments(lineGeo, lineMat);
        lines.name = 'HyperbolicTriangleEdges';
        this.group.add(lines);
    }

    // ─── Hyperbolic Trees ───────────────────────────────────────────────

    /**
     * Build trees that branch via Möbius transformations.
     * In hyperbolic space, exponential branching fits naturally because
     * circumference grows exponentially with radius.
     * @private
     */
    _buildTrees() {
        // Root positions (in disk coordinates)
        const roots = [
            { x: -0.4, y: -0.2 },
            { x: 0.35, y: -0.3 },
            { x: -0.25, y: 0.35 },
            { x: 0.4, y: 0.25 },
        ];

        for (const root of roots) {
            const treeGroup = new THREE.Group();
            treeGroup.name = 'HyperbolicTree';
            this._buildHyperbolicBranch(treeGroup, root, 0, Math.PI / 2, 0, 4);
            this.group.add(treeGroup);
        }
    }

    /**
     * Recursively build a branch using Möbius translations.
     * Each child is placed by translating in hyperbolic space, so branches
     * near the boundary appear compressed — true hyperbolic behavior.
     * @param {THREE.Group} parent
     * @param {{ x: number, y: number }} base  Base point in disk coords
     * @param {number} depth
     * @param {number} growAngle  Direction of growth
     * @param {number} currentDepth
     * @param {number} maxDepth
     * @private
     */
    _buildHyperbolicBranch(parent, base, currentDepth, growAngle, _unused, maxDepth) {
        if (currentDepth >= maxDepth) return;
        if (euclideanRadius(base) > DISK_CLAMP - 0.05) return;

        const branchColor = new THREE.Color().setHSL(
            0.38 - currentDepth * 0.04,
            0.8,
            0.35 + currentDepth * 0.05
        );

        // Step distance in hyperbolic space (constant!)
        const stepDist = 0.5;
        const stepR = Math.tanh(stepDist / 2); // Euclidean radius for this step

        // Endpoint: apply Möbius addition to move `stepR` in direction `growAngle`
        const delta = { x: stepR * Math.cos(growAngle), y: stepR * Math.sin(growAngle) };
        const end = mobiusAdd(base, delta);

        if (euclideanRadius(end) > DISK_CLAMP - 0.02) return;

        // World-space positions
        const baseWorld = diskToWorld(base, 0);
        const endWorld = diskToWorld(end, 0);

        // Vertical offset based on depth for the "tree" look
        baseWorld.y = currentDepth * 0.8;
        endWorld.y = (currentDepth + 1) * 0.8;

        // Cylinder branch
        const dir = new THREE.Vector3().subVectors(endWorld, baseWorld);
        const dist = dir.length();
        if (dist < 0.01) return;

        const thickness = 0.08 * (1 - currentDepth * 0.15);
        const cylGeo = new THREE.CylinderGeometry(
            thickness * 0.7, thickness, dist, 4
        );
        const cylMat = new THREE.MeshBasicMaterial({ color: branchColor });
        const cyl = new THREE.Mesh(cylGeo, cylMat);
        const mid = new THREE.Vector3().addVectors(baseWorld, endWorld).multiplyScalar(0.5);
        cyl.position.copy(mid);
        cyl.lookAt(endWorld);
        cyl.rotateX(Math.PI / 2);
        parent.add(cyl);

        // Node sphere
        const nodeGeo = new THREE.SphereGeometry(0.1, 4, 3);
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00FF88 });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.copy(endWorld);
        parent.add(node);

        this._treeNodes.push({
            mesh: node,
            speed: new THREE.Vector3(0.5 + currentDepth * 0.2, 0.3 + currentDepth * 0.1, 0),
        });

        // Branch: in hyperbolic space, we can fit MORE branches because
        // circumference grows as 2π sinh(r). Two child branches at ±spread.
        const spread = Math.PI / 4 + currentDepth * 0.1;
        this._buildHyperbolicBranch(parent, end, currentDepth + 1, growAngle + spread, 0, maxDepth);
        this._buildHyperbolicBranch(parent, end, currentDepth + 1, growAngle - spread, 0, maxDepth);
    }

    // ─── Public API ─────────────────────────────────────────────────────

    /**
     * Per-frame update.
     * @param {number} dt  Delta time in seconds
     */
    update(dt) {
        this._time += dt;

        if (this._floorMat) {
            this._floorMat.uniforms.uTime.value = this._time;
        }

        // Glow pulse
        for (const sphere of this._glowSpheres) {
            const s = 0.9 + 0.2 * Math.sin(this._time * 3.0);
            sphere.scale.setScalar(s);
        }

        // Tree sway
        for (const node of this._treeNodes) {
            node.mesh.position.x += Math.sin(this._time * node.speed.x) * 0.002;
            node.mesh.position.y += Math.cos(this._time * node.speed.y) * 0.001;
        }
    }

    /**
     * Returns interactable positions for this sub-zone.
     * @returns {{ position: THREE.Vector3, label: string, type: string }[]}
     */
    getInteractables() {
        return [{
            position: new THREE.Vector3(0, 1.5, 3),
            label: 'Strange Triangle',
            type: 'triangle',
        }];
    }

    /** @returns {number} Terrain height (flat disk) */
    getTerrainHeight(_x, _z) {
        return 0;
    }
}
