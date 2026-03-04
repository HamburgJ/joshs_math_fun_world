import * as THREE from 'three';
import { ZoneBase } from '../zone-base.js';
import { buildPlatonicSolids, createSolidAnimator } from './solids.js';
import { buildMoebiusStrip, createMoebiusAnimator } from './moebius.js';
import { buildKleinBottle } from './klein.js';
import { buildZoneGraph, refreshNodeColors } from './zone-graph.js';
import { buildGeometryLab } from './geometry-lab.js';

/**
 * Zone 4 — The Wireframe Void
 *
 * A dark, terminal-green wireframe dimension with multiple connected rooms:
 *
 *   Layout (top-down):
 *                [Topology Lab]
 *                     |
 *   [Euler Gallery]--[Central Hub]--[Graph Chamber]
 *                     |
 *                [Geometry Lab]
 *
 *   Central Hub (40×40):  Platonic solids gallery
 *   Topology Lab (+Z):    Möbius strip + Klein bottle
 *   Graph Chamber (+X):   Zone connection graph
 *   Geometry Lab (-Z):    Interactive wireframe solids
 *   Euler Gallery (-X):   V-E+F=2 displays + wireframe torus/sphere
 *
 * All rooms bounded by wireframe walls. No walking into the void forever.
 *
 * Shell Bingby once said: "The void isn't empty — it's full of edges."
 */
export class WireframeVoid extends ZoneBase {
    constructor() {
        super('WireframeVoid');

        /** Flag consumed by rendering pipeline for PS1 wireframe hint */
        this.joshWireframe = true;

        /** @type {Set<string>} Zones the player has visited — graph nodes glow brighter */
        this.visitedZones = new Set();

        // ══════════════════════════════════════════════════════════
        //  ROOM LAYOUT — Build floors, corridors, walls, boundaries
        // ══════════════════════════════════════════════════════════
        this._buildRoomLayout();

        // ══════════════════════════════════════════════════════════
        //  CENTRAL HUB — Platonic Solids Gallery
        // ══════════════════════════════════════════════════════════
        this.solids = buildPlatonicSolids();
        for (const solid of this.solids) {
            this.group.add(solid.mesh);
        }
        this.addAnimator(createSolidAnimator(this.solids));

        // ══════════════════════════════════════════════════════════
        //  TOPOLOGY LAB (north room, centered at z=+45)
        // ══════════════════════════════════════════════════════════

        // Möbius Walkway — repositioned to topology lab
        const moebius = buildMoebiusStrip();
        this._moebiusStrip = moebius.strip;
        this._moebiusMarker = moebius.marker;
        this._moebiusStrip.position.set(-5, 2, 45);
        this.group.add(moebius.strip);
        this.addAnimator(createMoebiusAnimator(moebius.marker));

        // Klein Bottle — repositioned to topology lab
        const klein = buildKleinBottle();
        this._kleinGroup = klein.group;
        this._kleinGroup.position.set(8, 4, 45);
        this.group.add(klein.group);
        this.addAnimator((dt) => {
            this._kleinGroup.rotation.y += 0.15 * dt;
        });

        // Topology lab sign
        this._addRoomSign('TOPOLOGY LAB', 0, 5, 33);

        // ══════════════════════════════════════════════════════════
        //  GRAPH CHAMBER (east room, centered at x=+45)
        // ══════════════════════════════════════════════════════════
        const graph = buildZoneGraph();
        this._graphGroup = graph.group;
        this._graphNodes = graph.nodes;
        // Reposition graph to east room
        this._graphGroup.position.set(45, 4, 0);
        this.group.add(graph.group);
        this.visitedZones.add('Zone 4');
        refreshNodeColors(this._graphNodes, this.visitedZones);
        this.addAnimator((dt) => {
            this._graphGroup.rotation.y += 0.1 * dt;
        });

        this._addRoomSign('GRAPH CHAMBER', 33, 5, 0);

        // ══════════════════════════════════════════════════════════
        //  GEOMETRY LAB (south room, centered at z=-45)
        // ══════════════════════════════════════════════════════════
        const lab = buildGeometryLab();
        // Reposition geometry lab to south room
        // Lab items are at local z=20, we want world z=-45
        // So offset the group by -65 on z: 20 + (-65) = -45
        lab.group.position.set(0, 0, -65);
        this.group.add(lab.group);
        for (const item of lab.interactables) {
            // Interactable positions are in local group space,
            // convert to world by adding group offset
            const worldPos = item.position.clone().add(lab.group.position);
            this.addInteractable(worldPos, item.label, item.type);
        }

        this._addRoomSign('GEOMETRY LAB', 0, 5, -33);

        // ══════════════════════════════════════════════════════════
        //  EULER GALLERY (west room, centered at x=-45)
        // ══════════════════════════════════════════════════════════
        this._buildEulerGallery();

        this._addRoomSign('EULER GALLERY', -33, 5, 0);

        // ══════════════════════════════════════════════════════════
        //  INTERACTABLES
        // ══════════════════════════════════════════════════════════

        for (const solid of this.solids) {
            this.addInteractable(solid.mesh.position, solid.info.name, 'platonic_solid');
        }

        this.addInteractable(this._moebiusStrip.position, 'Möbius Walkway', 'moebius_strip');
        this.addInteractable(this._kleinGroup.position, 'Klein Bottle', 'klein_bottle');

        // Room entrance markers
        this.addInteractable(new THREE.Vector3(0, 0.5, 20), 'North Passage → Topology Lab', 'corridor');
        this.addInteractable(new THREE.Vector3(20, 0.5, 0), 'East Passage → Graph Chamber', 'corridor');
        this.addInteractable(new THREE.Vector3(0, 0.5, -20), 'South Passage → Geometry Lab', 'corridor');
        this.addInteractable(new THREE.Vector3(-20, 0.5, 0), 'West Passage → Euler Gallery', 'corridor');

        // ══════════════════════════════════════════════════════════
        //  PROXIMITY REACTIONS
        // ══════════════════════════════════════════════════════════
        for (const solid of this.solids) {
            const baseSpeed = solid.speed.clone();
            this.addReaction({
                center: solid.mesh.position,
                radius: 4,
                id: `solid_proximity_${solid.info.name}`,
                onNear: (_dist, intensity) => {
                    const boost = 1 + intensity * 2;
                    solid.speed.copy(baseSpeed).multiplyScalar(boost);
                },
                onExit: () => {
                    solid.speed.copy(baseSpeed);
                },
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  Room Layout Builder
    // ═══════════════════════════════════════════════════════════════

    _buildRoomLayout() {
        const wallMat = new THREE.LineBasicMaterial({ color: 0x00ff41 });

        // ── Floor grids ──
        // Central Hub (40×40)
        const hubGrid = new THREE.GridHelper(40, 40, 0x003300, 0x001a00);
        hubGrid.position.set(0, 0, 0);
        this.group.add(hubGrid);
        this.grid = hubGrid;

        // Topology Lab (25×25 at z=+45)
        const topoGrid = new THREE.GridHelper(25, 25, 0x002233, 0x001122);
        topoGrid.position.set(0, 0, 45);
        this.group.add(topoGrid);

        // Graph Chamber (20×20 at x=+45)
        const graphGrid = new THREE.GridHelper(20, 20, 0x003300, 0x001a00);
        graphGrid.position.set(45, 0, 0);
        this.group.add(graphGrid);

        // Geometry Lab (25×25 at z=-45)
        const geoGrid = new THREE.GridHelper(25, 25, 0x220033, 0x110022);
        geoGrid.position.set(0, 0, -45);
        this.group.add(geoGrid);

        // Euler Gallery (20×20 at x=-45)
        const eulerGrid = new THREE.GridHelper(20, 20, 0x332200, 0x221100);
        eulerGrid.position.set(-45, 0, 0);
        this.group.add(eulerGrid);

        // Corridor floors (4-wide grid strips)
        const corridorDefs = [
            { cx: 0,   cz: 30,  sx: 4, sz: 18 },  // North corridor
            { cx: 30,  cz: 0,   sx: 18, sz: 4 },   // East corridor
            { cx: 0,   cz: -30, sx: 4, sz: 18 },   // South corridor
            { cx: -30, cz: 0,   sx: 18, sz: 4 },    // West corridor
        ];
        for (const cd of corridorDefs) {
            const dim = Math.max(cd.sx, cd.sz);
            const corrGrid = new THREE.GridHelper(dim, dim, 0x002200, 0x001100);
            corrGrid.position.set(cd.cx, 0, cd.cz);
            corrGrid.scale.set(cd.sx / dim, 1, cd.sz / dim);
            this.group.add(corrGrid);
        }

        // ── Wireframe boundary walls (visual) ──
        this._buildBoundaryWalls(wallMat);

        // ── Collision boundaries ──
        this._buildCollisionBoundaries();

        // ── Corridor arch decorations ──
        this._buildCorridorArches(wallMat);
    }

    _buildBoundaryWalls(wallMat) {
        const H = 6;
        const CW = 2; // corridor half-width

        // Helper: add wireframe wall segment between two XZ points
        const addWall = (x1, z1, x2, z2) => {
            const dx = x2 - x1;
            const dz = z2 - z1;
            const len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.1) return;

            const segs = Math.max(2, Math.floor(len / 2));
            const geo = new THREE.PlaneGeometry(len, H, segs, 3);
            const wireGeo = new THREE.WireframeGeometry(geo);
            const wall = new THREE.LineSegments(wireGeo, wallMat);
            wall.position.set((x1 + x2) / 2, H / 2, (z1 + z2) / 2);
            wall.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
            wall.name = 'BoundaryWall';
            this.group.add(wall);
            geo.dispose();
        };

        // ── Central Hub walls (40×40, center 0,0) with 4 corridor openings ──
        // North wall (z=20): gap at x ∈ [-CW, CW]
        addWall(-20, 20, -CW, 20);
        addWall(CW, 20, 20, 20);
        // South wall (z=-20)
        addWall(-20, -20, -CW, -20);
        addWall(CW, -20, 20, -20);
        // East wall (x=20)
        addWall(20, -20, 20, -CW);
        addWall(20, CW, 20, 20);
        // West wall (x=-20)
        addWall(-20, -20, -20, -CW);
        addWall(-20, CW, -20, 20);

        // ── Corridor walls ──
        // North corridor (x=±CW, z: 20→32.5)
        addWall(CW, 20, CW, 32.5);
        addWall(-CW, 20, -CW, 32.5);
        // South corridor
        addWall(CW, -20, CW, -32.5);
        addWall(-CW, -20, -CW, -32.5);
        // East corridor
        addWall(20, CW, 35, CW);
        addWall(20, -CW, 35, -CW);
        // West corridor
        addWall(-20, CW, -35, CW);
        addWall(-20, -CW, -35, -CW);

        // ── Topology Lab walls (25×25 at z=45) ──
        addWall(-12.5, 57.5, 12.5, 57.5);      // north
        addWall(12.5, 32.5, 12.5, 57.5);        // east
        addWall(-12.5, 32.5, -12.5, 57.5);      // west
        addWall(-12.5, 32.5, -CW, 32.5);        // south-left
        addWall(CW, 32.5, 12.5, 32.5);          // south-right

        // ── Graph Chamber walls (20×20 at x=45) ──
        addWall(35, -10, 35, -CW);
        addWall(35, CW, 35, 10);
        addWall(55, -10, 55, 10);
        addWall(35, 10, 55, 10);
        addWall(35, -10, 55, -10);

        // ── Geometry Lab walls (25×25 at z=-45) ──
        addWall(-12.5, -57.5, 12.5, -57.5);     // south
        addWall(12.5, -57.5, 12.5, -32.5);      // east
        addWall(-12.5, -57.5, -12.5, -32.5);    // west
        addWall(-12.5, -32.5, -CW, -32.5);      // north-left
        addWall(CW, -32.5, 12.5, -32.5);        // north-right

        // ── Euler Gallery walls (20×20 at x=-45) ──
        addWall(-55, -10, -55, 10);
        addWall(-55, 10, -35, 10);
        addWall(-55, -10, -35, -10);
        addWall(-35, -10, -35, -CW);
        addWall(-35, CW, -35, 10);
    }

    _buildCollisionBoundaries() {
        const CW = 2;
        const T = 0.5;

        // Central Hub walls (with corridor gaps)
        this.addColliderBox(-20, -CW, 20 - T, 20 + T);
        this.addColliderBox(CW, 20, 20 - T, 20 + T);
        this.addColliderBox(-20, -CW, -20 - T, -20 + T);
        this.addColliderBox(CW, 20, -20 - T, -20 + T);
        this.addColliderBox(20 - T, 20 + T, -20, -CW);
        this.addColliderBox(20 - T, 20 + T, CW, 20);
        this.addColliderBox(-20 - T, -20 + T, -20, -CW);
        this.addColliderBox(-20 - T, -20 + T, CW, 20);

        // Corridor walls
        this.addColliderBox(CW - T, CW + T, 20, 32.5);
        this.addColliderBox(-CW - T, -CW + T, 20, 32.5);
        this.addColliderBox(CW - T, CW + T, -32.5, -20);
        this.addColliderBox(-CW - T, -CW + T, -32.5, -20);
        this.addColliderBox(20, 35, CW - T, CW + T);
        this.addColliderBox(20, 35, -CW - T, -CW + T);
        this.addColliderBox(-35, -20, CW - T, CW + T);
        this.addColliderBox(-35, -20, -CW - T, -CW + T);

        // Topology Lab
        this.addColliderBox(-12.5, 12.5, 57.5 - T, 57.5 + T);
        this.addColliderBox(12.5 - T, 12.5 + T, 32.5, 57.5);
        this.addColliderBox(-12.5 - T, -12.5 + T, 32.5, 57.5);
        this.addColliderBox(-12.5, -CW, 32.5 - T, 32.5 + T);
        this.addColliderBox(CW, 12.5, 32.5 - T, 32.5 + T);

        // Graph Chamber
        this.addColliderBox(55 - T, 55 + T, -10, 10);
        this.addColliderBox(35, 55, 10 - T, 10 + T);
        this.addColliderBox(35, 55, -10 - T, -10 + T);
        this.addColliderBox(35 - T, 35 + T, -10, -CW);
        this.addColliderBox(35 - T, 35 + T, CW, 10);

        // Geometry Lab
        this.addColliderBox(-12.5, 12.5, -57.5 - T, -57.5 + T);
        this.addColliderBox(12.5 - T, 12.5 + T, -57.5, -32.5);
        this.addColliderBox(-12.5 - T, -12.5 + T, -57.5, -32.5);
        this.addColliderBox(-12.5, -CW, -32.5 - T, -32.5 + T);
        this.addColliderBox(CW, 12.5, -32.5 - T, -32.5 + T);

        // Euler Gallery
        this.addColliderBox(-55 - T, -55 + T, -10, 10);
        this.addColliderBox(-55, -35, 10 - T, 10 + T);
        this.addColliderBox(-55, -35, -10 - T, -10 + T);
        this.addColliderBox(-35 - T, -35 + T, -10, -CW);
        this.addColliderBox(-35 - T, -35 + T, CW, 10);
    }

    _buildCorridorArches(wallMat) {
        const archGeo = new THREE.TorusGeometry(2.5, 0.15, 4, 8, Math.PI);
        const archWire = new THREE.WireframeGeometry(archGeo);

        const archPositions = [
            { x: 0, z: 20, ry: 0 },
            { x: 0, z: -20, ry: 0 },
            { x: 20, z: 0, ry: Math.PI / 2 },
            { x: -20, z: 0, ry: Math.PI / 2 },
        ];

        for (const ap of archPositions) {
            const arch = new THREE.LineSegments(archWire, wallMat);
            arch.position.set(ap.x, 5, ap.z);
            arch.rotation.y = ap.ry;
            arch.name = 'CorridorArch';
            this.group.add(arch);
        }

        archGeo.dispose();
    }

    // ═══════════════════════════════════════════════════════════════
    //  Euler Gallery (west room)
    // ═══════════════════════════════════════════════════════════════

    _buildEulerGallery() {
        const wireMat = new THREE.LineBasicMaterial({ color: 0x00ff41 });
        const accentMat = new THREE.LineBasicMaterial({ color: 0x66ff99 });

        // Wireframe Torus — demonstrates V-E+F=0 (genus 1)
        const torusGeo = new THREE.TorusGeometry(3, 1, 8, 12);
        const torusWire = new THREE.WireframeGeometry(torusGeo);
        const torus = new THREE.LineSegments(torusWire, wireMat);
        torus.position.set(-45, 4, -4);
        torus.name = 'EulerTorus';
        this.group.add(torus);
        torusGeo.dispose();

        this.addInteractable(torus.position.clone(), 'Torus (\u03C7 = 0)', 'euler_solid');

        // Wireframe Sphere — demonstrates V-E+F=2 (genus 0)
        const sphereGeo = new THREE.IcosahedronGeometry(2.5, 1);
        const sphereWire = new THREE.WireframeGeometry(sphereGeo);
        const sphere = new THREE.LineSegments(sphereWire, accentMat);
        sphere.position.set(-45, 4, 4);
        sphere.name = 'EulerSphere';
        this.group.add(sphere);
        sphereGeo.dispose();

        this.addInteractable(sphere.position.clone(), 'Sphere (\u03C7 = 2)', 'euler_solid');

        // Wireframe Cylinder
        const cylGeo = new THREE.CylinderGeometry(1.5, 1.5, 4, 8);
        const cylWire = new THREE.WireframeGeometry(cylGeo);
        const cyl = new THREE.LineSegments(cylWire, wireMat);
        cyl.position.set(-50, 3, 0);
        cyl.name = 'EulerCylinder';
        this.group.add(cyl);
        cylGeo.dispose();

        this.addInteractable(cyl.position.clone(), 'Cylinder (\u03C7 = 2)', 'euler_solid');

        // Wireframe Cone
        const coneGeo = new THREE.ConeGeometry(1.5, 4, 8);
        const coneWire = new THREE.WireframeGeometry(coneGeo);
        const cone = new THREE.LineSegments(coneWire, accentMat);
        cone.position.set(-40, 3, 0);
        cone.name = 'EulerCone';
        this.group.add(cone);
        coneGeo.dispose();

        this.addInteractable(cone.position.clone(), 'Cone (\u03C7 = 1)', 'euler_solid');

        this.addInteractable(new THREE.Vector3(-45, 0.5, 0), 'Euler Gallery Center', 'landmark');

        // Spin all Euler gallery shapes
        this.addAnimator((dt) => {
            torus.rotation.x += 0.2 * dt;
            torus.rotation.y += 0.15 * dt;
            sphere.rotation.y += 0.25 * dt;
            cyl.rotation.y += 0.1 * dt;
            cone.rotation.y += 0.3 * dt;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  Room Signs
    // ═══════════════════════════════════════════════════════════════

    _addRoomSign(text, x, y, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 128);
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, 504, 120);

        ctx.fillStyle = '#00ff41';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 64);

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;

        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            side: THREE.DoubleSide,
        });

        const geo = new THREE.PlaneGeometry(6, 1.5);
        const sign = new THREE.Mesh(geo, mat);
        sign.position.set(x, y, z);

        // Face toward the hub center
        const angle = Math.atan2(-x, -z);
        sign.rotation.y = angle;

        sign.name = `Sign_${text}`;
        this.group.add(sign);
    }

    // ─────────────────────────────────────────────
    //  Public API
    // ─────────────────────────────────────────────

    /**
     * Show or hide the ground grid independently.
     * @param {boolean} visible
     */
    setGridVisible(visible) {
        this.grid.visible = visible;
    }

    /**
     * Get topological info for the Platonic solid nearest to `position`.
     *
     * @param {THREE.Vector3} position - World-space query point.
     * @returns {{name: string, V: number, E: number, F: number, chi: number}|null}
     *   The nearest solid's data, or null if there are no solids.
     */
    getNearestSolidInfo(position) {
        if (this.solids.length === 0) return null;

        let bestDist = Infinity;
        let bestInfo = null;

        const worldPos = new THREE.Vector3();

        for (const solid of this.solids) {
            solid.mesh.getWorldPosition(worldPos);
            const d = position.distanceTo(worldPos);
            if (d < bestDist) {
                bestDist = d;
                bestInfo = solid.info;
            }
        }

        return bestInfo;
    }

    /**
     * Mark a zone as visited in the zone graph. The corresponding node
     * will glow brighter on the next frame.
     *
     * @param {string} zoneName - e.g. "Zone 1", "Zone 4", "Zone 9".
     */
    markZoneVisited(zoneName) {
        if (!this.visitedZones.has(zoneName)) {
            this.visitedZones.add(zoneName);
            refreshNodeColors(this._graphNodes, this.visitedZones);
        }
    }

    /**
     * Return terrain height at the given world position.
     * The Wireframe Void is a flat plane at Y = 0.
     * @param {number} _x
     * @param {number} _z
     * @returns {number}
     */
    getTerrainHeight(_x, _z) {
        return 0;
    }
}
