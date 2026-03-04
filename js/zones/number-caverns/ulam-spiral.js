import * as THREE from 'three';
import { isPrime, generateUlamPositions } from './math.js';

/**
 * Ulam Spiral Floor — prime numbers arranged in a spiral on the cavern floor.
 *
 * Primes glow amber. Composites are dark stone. Walk over them and primes
 * light up brighter beneath your feet while composites sink slightly.
 */

/**
 * Build the Ulam spiral.
 *
 * @param {(text: string, opts?: object) => THREE.CanvasTexture} makeTextTexture
 * @returns {{ group: THREE.Group, primeTiles: THREE.Mesh[], interactables: Array<{position: THREE.Vector3, label: string, type: string}> }}
 */
export function buildUlamSpiral(makeTextTexture) {
    const group = new THREE.Group();
    group.name = 'UlamSpiral';

    const tileGeo = new THREE.BoxGeometry(0.8, 0.05, 0.8);
    const compositeMat = new THREE.MeshLambertMaterial({
        color: 0x2a1a10,
        emissive: 0x1a1008,
        emissiveIntensity: 1.0,
        flatShading: true,
    });
    const primeMat = new THREE.MeshLambertMaterial({
        color: 0xFFAA44,
        emissive: 0xFFAA44,
        emissiveIntensity: 0.4,
        flatShading: true,
    });

    const positions = generateUlamPositions(200);
    const primeTiles = [];
    const interactables = [];

    for (const { n, x, z } of positions) {
        const prime = isPrime(n);
        const tile = new THREE.Mesh(tileGeo, prime ? primeMat.clone() : compositeMat);
        tile.position.set(x, 0.025, z);
        tile.userData.originalY = 0.025;
        tile.userData.isPrime = prime;
        tile.userData.number = n;
        group.add(tile);

        if (prime) {
            primeTiles.push(tile);

            interactables.push({
                position: new THREE.Vector3(x, 0.5, z),
                label: 'Glowing Tile',
                type: 'spiral-prime',
            });
        }
    }

    return { group, primeTiles, interactables };
}
