/**
 * Visual elements for The Arrival intro sequence.
 *
 * Each builder returns a group (and any materials needed for animation)
 * so the orchestrator can manipulate them per-phase. Every element starts
 * invisible / collapsed — the update loop brings them to life.
 *
 * Shell Bingby always said: "Build everything at scale zero, then let
 * mathematics decide when it deserves to exist."
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════
//  Number Line
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create the number-line geometry: a long horizontal line along X with
 * tick marks at integer positions. The line uses a clipping approach —
 * we build the full line but scale the group so it starts as a point.
 *
 * @returns {{ group: THREE.Group }}
 */
export function buildNumberLine() {
    const group = new THREE.Group();
    group.name = 'NumberLine';

    const mat = new THREE.LineBasicMaterial({ color: 0x00ff41 }); // terminal green
    const halfSpan = 20; // ±20 units

    // Main horizontal line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfSpan, 0.01, 0),
        new THREE.Vector3(halfSpan, 0.01, 0),
    ]);
    const line = new THREE.Line(lineGeo, mat);
    line.name = 'numberLineMain';
    group.add(line);

    // Tick marks at every integer
    const tickPositions = [];
    const tickHeight = 0.3;
    for (let i = -halfSpan; i <= halfSpan; i++) {
        tickPositions.push(i, 0.01 - tickHeight * 0.5, 0);
        tickPositions.push(i, 0.01 + tickHeight * 0.5, 0);
    }
    const tickGeo = new THREE.BufferGeometry();
    tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPositions, 3));
    const ticks = new THREE.LineSegments(tickGeo, mat);
    ticks.name = 'numberLineTicks';
    group.add(ticks);

    // Start collapsed to a point
    group.scale.set(0, 1, 1);

    return { group };
}

// ═══════════════════════════════════════════════════════════════════════
//  Coordinate Axes
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build X (red) and Z (blue) axes that bloom outward from the origin.
 * Includes arrowhead-ish line segments at the tips.
 *
 * @returns {{ group: THREE.Group }}
 */
export function buildAxes() {
    const group = new THREE.Group();
    group.name = 'CoordinateAxes';
    group.visible = false;

    const axisLen = 20;

    // X axis (red)
    const xMat = new THREE.LineBasicMaterial({ color: 0xff4444 });
    const xGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-axisLen, 0.02, 0),
        new THREE.Vector3(axisLen, 0.02, 0),
    ]);
    const xAxis = new THREE.Line(xGeo, xMat);
    xAxis.name = 'xAxis';
    group.add(xAxis);

    // Z axis (blue) — in world space, "Y axis" on the coordinate plane
    const zMat = new THREE.LineBasicMaterial({ color: 0x4444ff });
    const zGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.02, -axisLen),
        new THREE.Vector3(0, 0.02, axisLen),
    ]);
    const zAxis = new THREE.Line(zGeo, zMat);
    zAxis.name = 'zAxis';
    group.add(zAxis);

    // Start at zero scale (will bloom)
    group.scale.set(0, 1, 0);

    return { group };
}

// ═══════════════════════════════════════════════════════════════════════
//  Grid
// ═══════════════════════════════════════════════════════════════════════

/**
 * A subtle ground grid that fades in during the axes phase.
 *
 * @returns {{ group: THREE.Group, material: THREE.Material | THREE.Material[] }}
 */
export function buildGrid() {
    const group = new THREE.Group();
    group.name = 'Grid';
    group.visible = false;

    const grid = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    grid.position.y = 0.005;
    grid.name = 'arrivalGrid';
    group.add(grid);

    // Material starts transparent
    /** @type {THREE.Material | THREE.Material[]} */
    const material = grid.material;
    if (Array.isArray(material)) {
        material.forEach(m => { m.transparent = true; m.opacity = 0; });
    } else {
        material.transparent = true;
        material.opacity = 0;
    }

    return { group, material };
}

// ═══════════════════════════════════════════════════════════════════════
//  Circle (projective line metaphor)
// ═══════════════════════════════════════════════════════════════════════

/**
 * A circle that the number line "wraps into". Built as a wireframe
 * ring that glows terminal-green. Positioned upright (in the XY plane)
 * at Josh's feet, starts invisible and scales to full size.
 *
 * @returns {{ group: THREE.Group, circleMat: THREE.LineBasicMaterial, circleGlowMat: THREE.LineBasicMaterial }}
 */
export function buildCircle() {
    const group = new THREE.Group();
    group.name = 'Circle';
    group.visible = false;

    const segments = 64;
    const radius = 4;
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
            Math.cos(theta) * radius,
            Math.sin(theta) * radius + radius, // lifted so bottom touches y=0
            0,
        ));
    }

    const circleGeo = new THREE.BufferGeometry().setFromPoints(points);
    const circleMat = new THREE.LineBasicMaterial({
        color: 0x00ff41,
        transparent: true,
        opacity: 0,
    });
    const circle = new THREE.Line(circleGeo, circleMat);
    circle.name = 'projectiveCircle';
    group.add(circle);

    // Glow ring (slightly larger, dimmer)
    const glowPoints = [];
    const glowRadius = radius + 0.15;
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        glowPoints.push(new THREE.Vector3(
            Math.cos(theta) * glowRadius,
            Math.sin(theta) * glowRadius + radius,
            0,
        ));
    }
    const glowGeo = new THREE.BufferGeometry().setFromPoints(glowPoints);
    const circleGlowMat = new THREE.LineBasicMaterial({
        color: 0x88ffaa,
        transparent: true,
        opacity: 0,
    });
    const glow = new THREE.Line(glowGeo, circleGlowMat);
    glow.name = 'projectiveCircleGlow';
    group.add(glow);

    group.scale.set(0, 0, 0);

    return { group, circleMat, circleGlowMat };
}

// ═══════════════════════════════════════════════════════════════════════
//  Grass Disk
// ═══════════════════════════════════════════════════════════════════════

/**
 * A flat green disk that expands outward to become the ground.
 * Starts at scale 0; the colour-fill phase grows it.
 * Uses a gradient from bright center to darker edge.
 *
 * @returns {{ group: THREE.Group, grassMat: THREE.MeshBasicMaterial }}
 */
export function buildGrass() {
    const group = new THREE.Group();
    group.name = 'GrassDisk';
    group.visible = false;

    const radius = 60;
    const segments = 64;
    const geometry = new THREE.CircleGeometry(radius, segments);
    geometry.rotateX(-Math.PI / 2); // lay flat

    // Vertex colours: brighter green at center, darker at edge
    const colors = [];
    const posAttr = geometry.getAttribute('position');
    const center = new THREE.Vector3(0, 0, 0);
    const temp = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
        temp.fromBufferAttribute(posAttr, i);
        const dist = temp.distanceTo(center) / radius;
        const g = THREE.MathUtils.lerp(0.55, 0.30, dist);
        const r = THREE.MathUtils.lerp(0.20, 0.12, dist);
        const b = THREE.MathUtils.lerp(0.10, 0.06, dist);
        colors.push(r, g, b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const grassMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
    });
    const disk = new THREE.Mesh(geometry, grassMat);
    disk.position.y = 0.003; // just above y=0
    disk.name = 'grassDisk';
    group.add(disk);

    group.scale.set(0, 1, 0);

    return { group, grassMat };
}

// ═══════════════════════════════════════════════════════════════════════
//  Opacity Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Set the opacity of Josh's meshes. On first call we make all Josh
 * materials transparent-ready so we can fade him in.
 * @param {THREE.Group} josh
 * @param {number} opacity
 */
export function setJoshOpacity(josh, opacity) {
    josh.traverse(child => {
        if (child.isMesh && child.material) {
            const mat = child.material;
            if (!mat._arrivalTransparent) {
                mat.transparent = true;
                mat._arrivalTransparent = true;
            }
            mat.opacity = opacity;
        }
    });
}

/**
 * Set opacity on number-line line materials.
 * @param {THREE.Group} group
 * @param {number} opacity
 */
export function setNumberLineOpacity(group, opacity) {
    group.traverse(child => {
        if (child.isLine && child.material) {
            child.material.transparent = true;
            child.material.opacity = opacity;
        }
    });
}

/**
 * Set opacity on the ground grid.
 * @param {THREE.Material | THREE.Material[]} gridMaterial
 * @param {number} opacity
 */
export function setGridOpacity(gridMaterial, opacity) {
    if (Array.isArray(gridMaterial)) {
        gridMaterial.forEach(m => { m.opacity = opacity; });
    } else if (gridMaterial) {
        gridMaterial.opacity = opacity;
    }
}
