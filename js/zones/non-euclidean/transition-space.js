import * as THREE from 'three';

/**
 * Sub-zone 5C: Transition / Flat Space (κ = 0)
 *
 * The eerily normal Euclidean zone. A plain grid. Curvature zero.
 * Somehow the most unsettling of all three — because after hyperbolic
 * and spherical, flatness feels WRONG.
 */
export class TransitionSpace {
    constructor() {
        /** @type {THREE.Group} */
        this.group = new THREE.Group();
        this.group.name = 'Transition_5C';

        this._build();
    }

    /** @private */
    _build() {
        // Standard grid
        const grid = new THREE.GridHelper(60, 60, 0xAAAAAA, 0x666666);
        grid.name = 'FlatGrid';
        this.group.add(grid);

        // Faint floor surface
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
        this.group.add(floor);

        // Curvature label
        

        // Eerie flatness caption
    }

    // ─── Public API ─────────────────────────────────────────────────────

    /** @param {number} _dt */
    update(_dt) {
        // Nothing animates here. That's the point.
    }

    /** @returns {{ position: THREE.Vector3, label: string, type: string }[]} */
    getInteractables() {
        return [{
            position: new THREE.Vector3(0, 3, -5),
            label: 'The Still Place',
            type: 'info',
        }];
    }

    /** @returns {number} */
    getTerrainHeight(_x, _z) {
        return 0;
    }
}
