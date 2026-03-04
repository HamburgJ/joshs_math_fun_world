import * as THREE from 'three';
import { createPS1Material } from '../../world/ps1-material.js';

// ═══════════════════════════════════════════════════════════════════════
//  Inner Sphere Terrain — builds the INSIDE of a giant sphere.
//
//  Everything is placed on the inner surface:
//    • Sphere shell (inverted normals, seen from inside)
//    • Trees growing inward (trunks point toward center)
//    • Glowing collectables pinned to the surface
//    • A pond at the south pole (bottom)
//    • A winding path from the bottom upward
//
//  Objects are positioned via spherical coordinates (θ, φ) and oriented
//  with their local Y pointing toward the sphere center (inward normal).
// ═══════════════════════════════════════════════════════════════════════

export class InnerSphereTerrain {
    constructor(group, radius) {
        this.group = group;
        this.R = radius || 80;
        this.interactables = [];
        this._time = 0;
        this.gems = [];

        this._build();
    }

    // Terrain height is always 0 (physics works on a flat plane;
    // sphere mapping is handled by the zone's mapToSphere method).
    getHeight(/* x, z */) {
        return 0;
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    /**
     * Convert spherical coords to a 3D position on the sphere surface.
     * θ = co-latitude (0 = north pole, π = south pole)
     * φ = azimuth
     */
    _spherePoint(theta, phi) {
        const R = this.R;
        return new THREE.Vector3(
            R * Math.sin(theta) * Math.cos(phi),
            R * Math.cos(theta),
            R * Math.sin(theta) * Math.sin(phi),
        );
    }

    /**
     * Place an Object3D on the inner sphere surface at (θ, φ).
     * The object's +Y axis points toward the sphere center (inward).
     * @param {THREE.Object3D} obj
     * @param {number} theta  co-latitude
     * @param {number} phi    azimuth
     * @param {number} [inwardOffset=0]  how far toward center to offset
     */
    _placeOnSphere(obj, theta, phi, inwardOffset = 0) {
        const pos = this._spherePoint(theta, phi);

        // Outward normal (center → surface)
        const outward = pos.clone().normalize();

        // Inward = toward center
        const inward = outward.clone().negate();

        // Offset inward from surface
        if (inwardOffset > 0) {
            pos.addScaledVector(inward, inwardOffset);
        }

        obj.position.copy(pos);

        // Orient so the object's +Y points toward center
        // We use lookAt + rotation trick: point the object's +Y toward center
        // by finding a quaternion that rotates (0,1,0) to inward direction.
        const up = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(up, inward);
        obj.quaternion.copy(q);
    }

    // ── Build ───────────────────────────────────────────────────────────

    _build() {
        this._buildShell();
        this._buildPond();
        this._buildTrees();
        this._buildCollectables();
        this._buildLandmarks();
    }

    /**
     * The sphere shell — a large inverted sphere that the player sees
     * from the inside. Colored with vertex colors: green "grass" on the
     * lower hemisphere, blue "sky" on the upper hemisphere.
     */
    _buildShell() {
        const R = this.R;
        const geo = new THREE.SphereGeometry(R - 0.5, 48, 36);

        // Flip normals so lighting works from inside
        geo.scale(-1, 1, -1);

        // Vertex colours: grass (bottom) → sky (top)
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        const grassColor = new THREE.Color(0x71a94e);
        const dirtColor  = new THREE.Color(0x7a6a5a);
        const skyColor   = new THREE.Color(0x88ccff);
        const cloudColor = new THREE.Color(0xddeeff);
        const c = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const normalizedY = y / R;  // −1 (south pole) to +1 (north pole)

            if (normalizedY < -0.3) {
                // Lower hemisphere — grass with variation
                const t = Math.random() * 0.3;
                c.copy(grassColor).lerp(dirtColor, t);
            } else if (normalizedY < 0.1) {
                // Equator band — dirt/transition
                const t = (normalizedY + 0.3) / 0.4;
                c.copy(grassColor).lerp(dirtColor, t);
            } else {
                // Upper hemisphere — sky with clouds
                const t = Math.random() * 0.25;
                c.copy(skyColor).lerp(cloudColor, t);
            }

            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = createPS1Material({ color: new THREE.Color(0xffffff), dither: true });
        const mesh = new THREE.Mesh(geo, mat);
        this.group.add(mesh);

        // ── Painted clouds near the top (box sprites) ───────────────────
        for (let i = 0; i < 25; i++) {
            const theta = Math.random() * 0.8;            // near north pole (top)
            const phi   = Math.random() * Math.PI * 2;
            const cloudGeo = new THREE.BoxGeometry(
                8 + Math.random() * 12,
                1 + Math.random() * 1.5,
                8 + Math.random() * 12,
            );
            const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
            const cloud = new THREE.Mesh(cloudGeo, cloudMat);
            this._placeOnSphere(cloud, theta, phi, 3);
            this.group.add(cloud);
        }
    }

    /**
     * A small reflective pond at the very bottom (south pole).
     */
    _buildPond() {
        const pondR = 8;
        const geo = new THREE.CircleGeometry(pondR, 20);

        this.pondMat = new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geo, this.pondMat);
        // Place at south pole, facing inward (toward center)
        this._placeOnSphere(mesh, Math.PI, 0, 0.3);
        this.group.add(mesh);
    }

    /**
     * Trees scattered on the inner surface.  Trunks point toward center.
     */
    _buildTrees() {
        const trunkMat  = createPS1Material({ color: new THREE.Color(0x553311) });
        const leavesMat = createPS1Material({ color: new THREE.Color(0x33aa55) });

        for (let i = 0; i < 30; i++) {
            // Scatter trees on the lower 2/3 of the sphere (θ > π/3)
            const theta = Math.PI / 3 + Math.random() * (Math.PI * 0.55);
            const phi   = Math.random() * Math.PI * 2;

            // Skip trees too close to the south pole (pond area)
            if (theta > Math.PI - 0.2) continue;

            const treeGroup = new THREE.Group();

            // Trunk (grows inward from surface — along +Y in local space)
            const trunkH = 3 + Math.random() * 2;
            const trunk = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, trunkH, 0.8),
                trunkMat,
            );
            trunk.position.y = trunkH / 2;  // base at origin, extends along +Y
            treeGroup.add(trunk);

            // Leaves (cone sitting on top of trunk)
            const leavesH = 4 + Math.random() * 2;
            const leaves = new THREE.Mesh(
                new THREE.ConeGeometry(2.5, leavesH, 5),
                leavesMat,
            );
            leaves.position.y = trunkH + leavesH / 2 - 0.5;
            treeGroup.add(leaves);

            this._placeOnSphere(treeGroup, theta, phi, 0);
            this.group.add(treeGroup);
        }
    }

    /**
     * Glowing collectables pinned to the sphere surface.
     */
    _buildCollectables() {
        const mat = new THREE.MeshBasicMaterial({ color: 0xff33aa, wireframe: true });

        const spots = [
            { theta: Math.PI * 0.7, phi: 0.5 },
            { theta: Math.PI * 0.5, phi: 2.5 },
            { theta: Math.PI * 0.4, phi: 4.5 },
        ];

        this.gems = [];

        for (const s of spots) {
            const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.0), mat);
            this._placeOnSphere(gem, s.theta, s.phi, 2.5);
            this.group.add(gem);
            this.gems.push(gem);
        }
    }

    /**
     * Visual landmarks so the player has reference points inside the sphere.
     */
    _buildLandmarks() {
        // A large glowing ring around the equator
        const ringGeo = new THREE.TorusGeometry(this.R - 1, 0.4, 8, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0.3 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2; // lie flat (equator)
        this.group.add(ring);

        // Stone pillars at cardinal points (lower hemisphere)
        const pillarMat = createPS1Material({ color: new THREE.Color(0x888899) });
        const cardinals = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
        for (const phi of cardinals) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), pillarMat);
            this._placeOnSphere(pillar, Math.PI * 0.65, phi, 0);
            // Shift pillar up along its local Y so base is on surface
            const inward = this._spherePoint(Math.PI * 0.65, phi).normalize().negate();
            pillar.position.addScaledVector(inward, 4);
            this.group.add(pillar);
        }
    }

    // ── Per-frame ───────────────────────────────────────────────────────

    update(dt) {
        this._time += dt;
        for (const gem of this.gems) {
            if (gem.parent) {
                gem.rotation.y += dt;
            }
        }
    }

    getInteractables() {
        return this.interactables;
    }
}
