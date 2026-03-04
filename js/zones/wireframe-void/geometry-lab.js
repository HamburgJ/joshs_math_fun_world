import * as THREE from 'three';

/**
 * Geometry Lab — a circular wireframe platform with interactable solids.
 *
 * Shell Bingby once said: "Every lab needs exactly three things:
 * a tetrahedron, an octahedron, and an icosahedron. Everything else is optional."
 */

/**
 * Build the Geometry Lab platform and its three interactable solids.
 *
 * @returns {{group: THREE.Group, interactables: Array<{position: THREE.Vector3, label: string, type: string}>}}
 */
export function buildGeometryLab() {
    const group = new THREE.Group();
    group.name = 'GeometryLab';

    const labCenter = new THREE.Vector3(0, 0, 20);

    // Circular platform
    const platGeo = new THREE.CylinderGeometry(5, 5, 0.1, 16);
    const platWire = new THREE.WireframeGeometry(platGeo);
    const platMat = new THREE.LineBasicMaterial({ color: 0x00ff41 });
    const platform = new THREE.LineSegments(platWire, platMat);
    platform.name = 'GeometryLabPlatform';
    platform.position.copy(labCenter);
    group.add(platform);
    platGeo.dispose();

    // Three smaller interactable solids on the platform
    const labColor = 0x33ff66;
    const labMat = new THREE.LineBasicMaterial({ color: labColor });
    const smallRadius = 0.6;

    const labSolids = [
        {
            label: 'Lab Tetrahedron',
            geometry: new THREE.TetrahedronGeometry(smallRadius),
            offset: new THREE.Vector3(-2.5, 0.8, 0),
        },
        {
            label: 'Lab Octahedron',
            geometry: new THREE.OctahedronGeometry(smallRadius),
            offset: new THREE.Vector3(0, 0.8, 0),
        },
        {
            label: 'Lab Icosahedron',
            geometry: new THREE.IcosahedronGeometry(smallRadius),
            offset: new THREE.Vector3(2.5, 0.8, 0),
        },
    ];

    /** @type {Array<{position: THREE.Vector3, label: string, type: string}>} */
    const interactables = [];

    for (const def of labSolids) {
        const wireGeo = new THREE.WireframeGeometry(def.geometry);
        const mesh = new THREE.LineSegments(wireGeo, labMat);
        mesh.name = def.label;
        mesh.position.addVectors(labCenter, def.offset);
        group.add(mesh);

        interactables.push({
            position: mesh.position.clone(),
            label: def.label,
            type: 'geometry_lab_solid',
        });

        def.geometry.dispose();
    }

    return { group, interactables };
}
