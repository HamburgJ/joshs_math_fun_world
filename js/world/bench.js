import * as THREE from 'three';
import { createPS1Material } from './ps1-material.js';
import { getTerrainHeight } from './noise.js';

/**
 * Creates a low-poly park bench.
 * Upgraded from simple boxes to multiple slats of wood for better detail
 * while maintaining the retro feeling.
 */
export function createBench() {
    const benchX = Math.PI + 2;
    const benchZ = Math.E;
    const groundY = getTerrainHeight(benchX, benchZ);

    const bench = new THREE.Group();
    bench.name = 'bench';

    const woodMat = createPS1Material({
        color: new THREE.Color(0x8b6914),
        dither: true,
        fogNear: 80,
        fogFar: 350,
    });

    const ironMat = createPS1Material({
        color: new THREE.Color(0x222222),
        dither: true,
        fogNear: 80,
        fogFar: 350,
    });

    // ── Iron framing/legs ──
    const supportGeo = new THREE.BoxGeometry(0.08, 0.4, 0.6);
    
    // Left Support
    const legLeftSupport = new THREE.Mesh(supportGeo, ironMat);
    legLeftSupport.position.set(-0.7, 0.25, 0);
    bench.add(legLeftSupport);

    const leftBackSupport = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), ironMat);
    leftBackSupport.position.set(-0.7, 0.7, -0.26);
    leftBackSupport.rotation.x = -0.15; // lean back slightly
    bench.add(leftBackSupport);

    // Right Support
    const legRightSupport = new THREE.Mesh(supportGeo, ironMat);
    legRightSupport.position.set(0.7, 0.25, 0);
    bench.add(legRightSupport);

    const rightBackSupport = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), ironMat);
    rightBackSupport.position.set(0.7, 0.7, -0.26);
    rightBackSupport.rotation.x = -0.15;
    bench.add(rightBackSupport);


    // ── Wooden Slats (Seat) ──
    const slatGeo = new THREE.BoxGeometry(1.6, 0.05, 0.15);
    
    for(let i=0; i<3; i++) {
        const seatSlat = new THREE.Mesh(slatGeo, woodMat);
        seatSlat.position.set(0, 0.45, -0.2 + (i * 0.2));
        bench.add(seatSlat);
    }

    // ── Wooden Slats (Backrest) ──
    for(let i=0; i<3; i++) {
        const backSlat = new THREE.Mesh(slatGeo, woodMat);
        // Position relies on the backwards lean
        backSlat.position.set(0, 0.6 + (i * 0.18), -0.28 - (i * 0.03));
        backSlat.rotation.x = -0.15;
        bench.add(backSlat);
    }

    // Place on terrain
    bench.position.set(benchX, groundY, benchZ);

    // Face the bench toward the pond at origin
    const dirToPond = new THREE.Vector2(-benchX, -benchZ).normalize();
    bench.rotation.y = Math.atan2(dirToPond.x, dirToPond.y);

    // Sit position: slightly in front of backrest
    const sitPosition = new THREE.Vector3(benchX, groundY + 0.55, benchZ);      

    // Look toward the pond at origin
    const sitLookAt = new THREE.Vector3(0, getTerrainHeight(0, 0), 0);

    return {
        mesh: bench,
        collider: { x: benchX, z: benchZ, radius: 1.0 },
        sitPosition,
        sitLookAt,
    };
}
