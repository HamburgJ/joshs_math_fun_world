import * as THREE from 'three';

/**
 * Zone Graph — a floating graph of zone connections.
 *
 * Shell Bingby once said: "Every world is a graph.
 * Every graph is a world. The trick is knowing which nodes to visit first."
 *
 * 8 nodes arranged in a circle (radius 6) at (15, 4, 15).
 * Edges represent in-game zone transitions.
 * Visited zones glow brighter.
 */

/**
 * Build the zone connection graph.
 *
 * @returns {{group: THREE.Group, nodes: Array<{mesh: THREE.LineSegments, label: string}>}}
 */
export function buildZoneGraph() {
    const group = new THREE.Group();
    group.name = 'ZoneGraph';
    group.position.set(15, 4, 15);

    // Zone labels + angular placement (rough circle, radius 6)
    const zoneIds = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6', 'Zone 7', 'Zone 9'];
    const layoutRadius = 6;

    /** @type {Map<string, THREE.Vector3>} */
    const nodePositions = new Map();

    const dimMat = new THREE.LineBasicMaterial({ color: 0x004400 });

    /** @type {Array<{mesh: THREE.LineSegments, label: string}>} */
    const nodes = [];

    for (let i = 0; i < zoneIds.length; i++) {
        const angle = (i / zoneIds.length) * Math.PI * 2;
        const x = Math.cos(angle) * layoutRadius;
        const z = Math.sin(angle) * layoutRadius;
        const pos = new THREE.Vector3(x, 0, z);
        nodePositions.set(zoneIds[i], pos);

        // Small wireframe sphere node
        const sphereGeo = new THREE.IcosahedronGeometry(0.3, 0);
        const wireGeo = new THREE.WireframeGeometry(sphereGeo);
        const node = new THREE.LineSegments(wireGeo, dimMat.clone());
        node.name = zoneIds[i];
        node.position.copy(pos);
        group.add(node);
        nodes.push({ mesh: node, label: zoneIds[i] });
        sphereGeo.dispose();
    }

    // Edges (transitions)
    const edges = [
        ['Zone 1', 'Zone 2'],   // north edge
        ['Zone 1', 'Zone 4'],   // east edge
        ['Zone 1', 'Zone 6'],   // south edge
        ['Zone 1', 'Zone 7'],   // mailbox
        ['Zone 2', 'Zone 9'],   // origin interact
        ['Zone 6', 'Zone 7'],   // division by zero → lecture
    ];

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x004400 });

    for (const [a, b] of edges) {
        const pA = nodePositions.get(a);
        const pB = nodePositions.get(b);
        if (!pA || !pB) continue;

        const lineGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        const line = new THREE.LineSegments(lineGeo, edgeMat);
        line.name = `Edge_${a}_${b}`;
        group.add(line);
    }

    return { group, nodes };
}

/**
 * Update graph node materials based on visited zones.
 *
 * @param {Array<{mesh: THREE.LineSegments, label: string}>} nodes
 * @param {Set<string>} visitedZones
 */
export function refreshNodeColors(nodes, visitedZones) {
    for (const entry of nodes) {
        const visited = visitedZones.has(entry.label);
        /** @type {THREE.LineBasicMaterial} */
        const mat = entry.mesh.material;
        mat.color.set(visited ? 0x00ff41 : 0x004400);
    }
}
