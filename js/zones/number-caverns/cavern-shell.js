import * as THREE from 'three';

/**
 * Cavern shell — ceiling dome, floor plane, and base lighting.
 *
 * The cave itself. Warm amber-lit rock, visible but atmospheric.
 * You should be able to see the cave walls and explore freely.
 */

/**
 * Build the cavern structure.
 * @returns {THREE.Group}
 */
export function buildCavernShell() {
    const group = new THREE.Group();
    group.name = 'CavernShell';

    // Inverted dome ceiling — warm brown rock, self-lit so it's visible
    const ceilingGeo = new THREE.SphereGeometry(60, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const ceilingMat = new THREE.MeshLambertMaterial({
        color: 0x6a4d30,
        emissive: 0x3a2510,
        emissiveIntensity: 1.0,
        side: THREE.BackSide,
        flatShading: true,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    group.add(ceiling);

    // Rough cave walls — irregular pillars around the perimeter for shape
    const pillarGeo = new THREE.CylinderGeometry(1.5, 2.5, 18, 6);
    const pillarMat = new THREE.MeshLambertMaterial({
        color: 0x5a4030,
        emissive: 0x2a1808,
        emissiveIntensity: 1.0,
        flatShading: true,
    });
    const pillarAngles = [0, 0.7, 1.3, 2.1, 2.8, 3.5, 4.2, 4.9, 5.6];
    for (const angle of pillarAngles) {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(Math.cos(angle) * 48, 4, Math.sin(angle) * 48);
        pillar.rotation.z = (Math.random() - 0.5) * 0.15;
        pillar.scale.set(1 + Math.random() * 0.6, 0.8 + Math.random() * 0.5, 1 + Math.random() * 0.6);
        group.add(pillar);
    }

    // Flat floor — warm stone, self-lit
    const floorGeo = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.MeshLambertMaterial({
        color: 0x4d3520,
        emissive: 0x2a1808,
        emissiveIntensity: 1.0,
        flatShading: true,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);

    // Centre point light — strong, wide reach
    const centerLight = new THREE.PointLight(0xFFCC77, 4, 120);
    centerLight.position.set(0, 10, 0);
    group.add(centerLight);

    return group;
}

/**
 * Build the full lighting setup for the cavern.
 * Warm amber cave feel — you can see around you, but it still feels underground.
 * @returns {THREE.Group}
 */
export function buildLighting() {
    const group = new THREE.Group();
    group.name = 'CavernLighting';

    // Main amber overhead — strong, wide range
    const mainLight = new THREE.PointLight(0xFFCC77, 4.5, 150);
    mainLight.position.set(0, 18, 0);
    group.add(mainLight);

    // Secondary fill lights spread around so corners are visible
    const fillPositions = [
        [35, 10, 0],
        [-35, 10, 0],
        [0, 10, 35],
        [0, 10, -35],
        [25, 8, 25],
        [-25, 8, -25],
        [25, 8, -25],
        [-25, 8, 25],
    ];
    for (const [fx, fy, fz] of fillPositions) {
        const fill = new THREE.PointLight(0xFFAA44, 2.0, 60);
        fill.position.set(fx, fy, fz);
        group.add(fill);
    }

    // "Torch" accent lights on cave walls — small orange glows
    const torchPositions = [
        [40, 6, 15], [-40, 6, -15], [15, 6, 40], [-15, 6, -40],
        [38, 6, -20], [-38, 6, 20],
    ];
    for (const [tx, ty, tz] of torchPositions) {
        const torch = new THREE.PointLight(0xFF8833, 1.5, 25);
        torch.position.set(tx, ty, tz);
        group.add(torch);
    }

    // Sieve waterfall accent
    const sieveLight = new THREE.PointLight(0xFFBB66, 2.5, 50);
    sieveLight.position.set(0, 10, -24);
    group.add(sieveLight);

    // Spiral center accent
    const spiralLight = new THREE.PointLight(0xFFAA44, 2.0, 40);
    spiralLight.position.set(0, 4, 0);
    group.add(spiralLight);

    // Riemann grotto accent (purple)
    const grottoLight = new THREE.PointLight(0x9955DD, 2.5, 45);
    grottoLight.position.set(0, 8, 30);
    group.add(grottoLight);

    // Hemisphere light for overall cave fill (sky=warm amber, ground=brown)
    const hemi = new THREE.HemisphereLight(0xFFCC88, 0x443322, 1.0);
    group.add(hemi);

    // Ambient — strong enough to see cave surfaces everywhere
    const ambient = new THREE.AmbientLight(0x553322, 0.8);
    group.add(ambient);

    return group;
}
