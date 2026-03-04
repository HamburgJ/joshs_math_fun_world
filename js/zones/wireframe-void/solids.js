import * as THREE from 'three';

/**
 * Platonic Solids — the five perfect wireframe forms.
 *
 * Shell Bingby once said: "Plato was wrong about the cave,
 * but dead right about the polyhedra."
 */

/**
 * Build all 5 Platonic solids as wireframe LineSegments.
 *
 * @returns {Array<{mesh: THREE.LineSegments, speed: THREE.Vector3, info: {name: string, V: number, E: number, F: number, chi: number}}>}
 */
export function buildPlatonicSolids() {
    const radius = 1.5;
    const color = 0x00ff41;

    /** @type {Array<{name:string, geometry:THREE.BufferGeometry, position:THREE.Vector3, speed:THREE.Vector3, V:number, E:number, F:number}>} */
    const definitions = [
        {
            name: 'Tetrahedron',
            geometry: new THREE.TetrahedronGeometry(radius),
            position: new THREE.Vector3(-8, 3, -5),
            speed: new THREE.Vector3(0.3, 0.5, 0.2),
            V: 4, E: 6, F: 4,
        },
        {
            name: 'Hexahedron',
            geometry: new THREE.BoxGeometry(radius * 1.6, radius * 1.6, radius * 1.6),
            position: new THREE.Vector3(-3, 5, -8),
            speed: new THREE.Vector3(0.2, 0.3, 0.4),
            V: 8, E: 12, F: 6,
        },
        {
            name: 'Octahedron',
            geometry: new THREE.OctahedronGeometry(radius),
            position: new THREE.Vector3(2, 4, 0),
            speed: new THREE.Vector3(0.4, 0.2, 0.3),
            V: 6, E: 12, F: 8,
        },
        {
            name: 'Dodecahedron',
            geometry: new THREE.DodecahedronGeometry(radius),
            position: new THREE.Vector3(7, 6, -4),
            speed: new THREE.Vector3(0.15, 0.4, 0.25),
            V: 20, E: 30, F: 12,
        },
        {
            name: 'Icosahedron',
            geometry: new THREE.IcosahedronGeometry(radius),
            position: new THREE.Vector3(12, 3, -7),
            speed: new THREE.Vector3(0.35, 0.15, 0.45),
            V: 12, E: 30, F: 20,
        },
    ];

    const material = new THREE.LineBasicMaterial({ color });

    /** @type {Array<{mesh: THREE.LineSegments, speed: THREE.Vector3, info: {name: string, V: number, E: number, F: number, chi: number}}>} */
    const solids = [];

    for (const def of definitions) {
        const wireGeo = new THREE.WireframeGeometry(def.geometry);
        const lineSegments = new THREE.LineSegments(wireGeo, material);
        lineSegments.name = def.name;
        lineSegments.position.copy(def.position);

        solids.push({
            mesh: lineSegments,
            speed: def.speed.clone(),
            info: {
                name: def.name,
                V: def.V,
                E: def.E,
                F: def.F,
                chi: def.V - def.E + def.F,
            },
        });

        def.geometry.dispose();
    }

    return solids;
}

/**
 * Create an animator function that rotates the Platonic solids each frame.
 *
 * @param {Array<{mesh: THREE.LineSegments, speed: THREE.Vector3}>} solids
 * @returns {(dt: number, time: number, joshPos: THREE.Vector3|null) => void}
 */
export function createSolidAnimator(solids) {
    return (dt, _time, _joshPos) => {
        for (const solid of solids) {
            solid.mesh.rotation.x += solid.speed.x * dt;
            solid.mesh.rotation.y += solid.speed.y * dt;
            solid.mesh.rotation.z += solid.speed.z * dt;
        }
    };
}
