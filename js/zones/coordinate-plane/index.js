/**
 * Zone 2: The Coordinate Plane
 *
 * A bounded mathematical grid world with multiple rooms to explore.
 * Central arena with four corridors leading to themed quadrant alcoves:
 *   Q1 (+X) Parabola Gallery   — warm yellow
 *   Q2 (-X) Trig Observatory   — cool blue
 *   Q3 (-Z) Reciprocal Chamber — muted green
 *   Q4 (+Z) Function Lab       — soft red
 *
 * Each alcove has a raised observation platform.
 * Asymptote walls bound every room — "you can never reach infinity."
 *
 * Shell Bingby called this one "the floor of God's graph paper."
 */

import * as THREE from 'three';
import { ZoneBase } from '../zone-base.js';
import { getTerrainHeightForSurface, getCoordinateText, getIntegerPoints } from './math.js';
import { buildGridFloor } from './terrain.js';
import { buildAxisLabels } from './labels.js';
import { buildFunctionSurfaces } from './surfaces.js';
import { buildAsymptoteWalls } from './walls.js';
import { registerReactions } from './reactions.js';

export class CoordinatePlane extends ZoneBase {
    constructor() {
        super('CoordinatePlane');

        /**
         * Currently active surface name.
         * @type {'parabola'|'sincos'|'reciprocal'|null}
         */
        this.activeSurface = null;

        // ── Grid floors (multi-room layout) ──
        const { meshes: gridMeshes, material: gridMaterial, rooms } = buildGridFloor();
        this._gridMaterial = gridMaterial;
        for (const mesh of gridMeshes) {
            this.group.add(mesh);
        }

        // ── Axis labels ──
        const labelsGroup = buildAxisLabels();
        this.group.add(labelsGroup);

        // ── Function surfaces ──
        this.surfaces = buildFunctionSurfaces();
        for (const mesh of Object.values(this.surfaces)) {
            this.group.add(mesh);
        }

        // ── Asymptote walls + collision data ──
        const { visuals: wallVisuals, colliders: wallColliders } = buildAsymptoteWalls();
        for (const wall of wallVisuals) {
            this.group.add(wall);
        }

        // ── Register collision walls ──
        for (const c of wallColliders) {
            this.addColliderBox(c.minX, c.maxX, c.minZ, c.maxZ);
        }

        // ── Register platforms (raised observation decks in alcoves) ──
        // Q1 platform: centered (33, 0), 6×6, y=2
        this.addPlatformSurface(30, 36, -3, 3, 2);
        // Q2 platform: centered (-33, 0), 6×6, y=2
        this.addPlatformSurface(-36, -30, -3, 3, 2);
        // Q3 platform: centered (0, -33), 6×6, y=2
        this.addPlatformSurface(-3, 3, -36, -30, 2);
        // Q4 platform: centered (0, 33), 6×6, y=2
        this.addPlatformSurface(-3, 3, 30, 36, 2);
        // Corner nooks in central arena (y=1)
        this.addPlatformSurface(8.5, 13.5, 8.5, 13.5, 1);
        this.addPlatformSurface(-13.5, -8.5, 8.5, 13.5, 1);
        this.addPlatformSurface(-13.5, -8.5, -13.5, -8.5, 1);
        this.addPlatformSurface(8.5, 13.5, -13.5, -8.5, 1);

        // ── Alcove decorations (mathematical objects in each room) ──
        this._buildAlcoveDecorations();

        // ── Animator: grid shader time ──
        this.addAnimator((_dt, time) => {
            this._gridMaterial.uniforms.uTime.value = time;
        });

        // ── Animate alcove features ──
        this.addAnimator((dt, time) => {
            if (this._alcoveSpinners) {
                for (const s of this._alcoveSpinners) {
                    s.rotation.y += s.userData.spinSpeed * dt;
                    s.rotation.x += s.userData.spinSpeed * 0.3 * dt;
                }
            }
        });

        // ── Register interactables ──
        this.addInteractable(new THREE.Vector3(0, 0, 0), 'The Origin', 'landmark');
        // Corridor entrances
        this.addInteractable(new THREE.Vector3(15, 0.5, 0), 'East Passage', 'corridor');
        this.addInteractable(new THREE.Vector3(-15, 0.5, 0), 'West Passage', 'corridor');
        this.addInteractable(new THREE.Vector3(0, 0.5, 15), 'North Passage', 'corridor');
        this.addInteractable(new THREE.Vector3(0, 0.5, -15), 'South Passage', 'corridor');
        // Alcove landmarks
        this.addInteractable(new THREE.Vector3(33, 0.5, 0), 'Parabola Gallery', 'landmark');
        this.addInteractable(new THREE.Vector3(-33, 0.5, 0), 'Trig Observatory', 'landmark');
        this.addInteractable(new THREE.Vector3(0, 0.5, -33), 'Reciprocal Chamber', 'landmark');
        this.addInteractable(new THREE.Vector3(0, 0.5, 33), 'Function Lab', 'landmark');
        // Platform tops
        this.addInteractable(new THREE.Vector3(33, 2.5, 0), 'Observation Deck Q1', 'platform');
        this.addInteractable(new THREE.Vector3(-33, 2.5, 0), 'Observation Deck Q2', 'platform');
        this.addInteractable(new THREE.Vector3(0, 2.5, -33), 'Observation Deck Q3', 'platform');
        this.addInteractable(new THREE.Vector3(0, 2.5, 33), 'Observation Deck Q4', 'platform');

        // ── Proximity reactions ──
        registerReactions(this, { walls: wallVisuals });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Alcove Decorations
    // ═══════════════════════════════════════════════════════════════════

    _buildAlcoveDecorations() {
        this._alcoveSpinners = [];
        const wireMat = new THREE.LineBasicMaterial({ color: 0x00ccff });

        // Q1 — Parabola Gallery: floating parabola wireframe arches
        for (let i = 0; i < 3; i++) {
            const pts = [];
            for (let t = -3; t <= 3; t += 0.3) {
                pts.push(new THREE.Vector3(t, 0.1 * t * t * (1 + i * 0.3), 0));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff8833 }));
            line.position.set(33, 1 + i * 1.5, -3 + i * 3);
            line.rotation.y = Math.PI / 4 * i;
            this.group.add(line);
        }

        // Q2 — Trig Observatory: spinning trig function rings
        const trigColors = [0x3399ff, 0x33dddd, 0x6699ff];
        for (let i = 0; i < 3; i++) {
            const pts = [];
            for (let a = 0; a <= Math.PI * 2; a += 0.1) {
                const r = 1.5 + 0.5 * Math.sin(a * (i + 2));
                pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: trigColors[i] }));
            line.position.set(-33, 3, -2 + i * 2);
            line.userData.spinSpeed = 0.3 + i * 0.15;
            this._alcoveSpinners.push(line);
            this.group.add(line);
        }

        // Q3 — Reciprocal Chamber: hyperbola curves
        for (let i = 0; i < 4; i++) {
            const pts = [];
            const sign = (i % 2 === 0) ? 1 : -1;
            for (let t = 0.3; t <= 4; t += 0.15) {
                pts.push(new THREE.Vector3(t * sign, 1.5 / t, 0));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xdd33dd }));
            line.position.set(-2 + i * 1.5, 1, -33);
            line.rotation.y = Math.PI / 6 * i;
            this.group.add(line);
        }

        // Q4 — Function Lab: small spinning wireframe solids
        const labGeos = [
            new THREE.TetrahedronGeometry(0.8),
            new THREE.OctahedronGeometry(0.8),
            new THREE.IcosahedronGeometry(0.8),
            new THREE.DodecahedronGeometry(0.8),
        ];
        const labPositions = [
            new THREE.Vector3(-2, 1.5, 31),
            new THREE.Vector3(2, 1.5, 31),
            new THREE.Vector3(-2, 1.5, 35),
            new THREE.Vector3(2, 1.5, 35),
        ];
        for (let i = 0; i < labGeos.length; i++) {
            const wireGeo = new THREE.WireframeGeometry(labGeos[i]);
            const mesh = new THREE.LineSegments(wireGeo, wireMat);
            mesh.position.copy(labPositions[i]);
            mesh.userData.spinSpeed = 0.4 + i * 0.1;
            this._alcoveSpinners.push(mesh);
            this.group.add(mesh);
            labGeos[i].dispose();
        }

        // ── Pillar markers at corridor entrances ──
        const pillarMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.4 });
        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 6);
        const pillarPositions = [
            [15, 3, -2.5], [15, 3, 2.5],   // East
            [-15, 3, -2.5], [-15, 3, 2.5], // West
            [-2.5, 3, 15], [2.5, 3, 15],   // North
            [-2.5, 3, -15], [2.5, 3, -15], // South
        ];
        for (const [px, py, pz] of pillarPositions) {
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(px, py, pz);
            pillar.name = 'CorridorPillar';
            this.group.add(pillar);
        }
        pillarGeo.dispose();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Terrain height (overrides ZoneBase)
    // ═══════════════════════════════════════════════════════════════════

    getTerrainHeight(x, z) {
        // Corner nooks are raised
        if (Math.abs(x) >= 8.5 && Math.abs(x) <= 13.5 &&
            Math.abs(z) >= 8.5 && Math.abs(z) <= 13.5) {
            return 1;
        }
        // Alcove platforms
        const alcovePlatforms = [
            { cx: 33, cz: 0 }, { cx: -33, cz: 0 },
            { cx: 0, cz: -33 }, { cx: 0, cz: 33 },
        ];
        for (const ap of alcovePlatforms) {
            if (Math.abs(x - ap.cx) <= 3 && Math.abs(z - ap.cz) <= 3) {
                return 2;
            }
        }
        return getTerrainHeightForSurface(this.activeSurface, x, z);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Public methods (preserve old API)
    // ═══════════════════════════════════════════════════════════════════

    /** @param {number} x @param {number} z @returns {string} */
    getCoordinateText(x, z) {
        return getCoordinateText(x, z);
    }

    /** @returns {{ position: THREE.Vector3, value: { x: number, z: number } }[]} */
    getIntegerPoints() {
        return getIntegerPoints();
    }

    /**
     * Switch the active mathematical surface (or clear to flat grid).
     * @param {'parabola'|'sincos'|'reciprocal'|null} name
     */
    setActiveSurface(name) {
        this.activeSurface = name;
        for (const [key, mesh] of Object.entries(this.surfaces)) {
            mesh.visible = key === name;
        }
    }
}
