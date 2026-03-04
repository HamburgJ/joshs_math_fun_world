import * as THREE from 'three';
import { isPrime } from './math.js';

/**
 * The Sieve of Eratosthenes Waterfall.
 *
 * A shader-driven plane where numbers cascade downward.
 * Composites dissolve. Primes survive as bright amber glyphs.
 *
 * When Josh approaches, the sieve runs faster.
 */

/**
 * Build the sieve waterfall.
 *
 * @returns {{ group: THREE.Group, uniforms: { uTime: { value: number } } }}
 */
export function buildSieveWaterfall() {
    const group = new THREE.Group();
    group.position.set(0, 0, -25);
    group.name = 'SieveWaterfall';

    // Dark backdrop wall
    const backdropGeo = new THREE.BoxGeometry(12, 17, 1);
    const backdropMat = new THREE.MeshLambertMaterial({
        color: 0x1a0f08,
        emissive: 0x150a05,
        emissiveIntensity: 1.0,
        flatShading: true,
    });
    const backdrop = new THREE.Mesh(backdropGeo, backdropMat);
    backdrop.position.set(0, 8, -0.6);
    group.add(backdrop);

    // Data texture: which numbers 1–100 are prime
    const primeData = new Uint8Array(10 * 10 * 4);
    for (let i = 0; i < 100; i++) {
        const n = i + 1;
        const idx = i * 4;
        if (isPrime(n)) {
            primeData[idx + 0] = 255;
            primeData[idx + 1] = 170;
            primeData[idx + 2] = 68;
            primeData[idx + 3] = 255;
        } else {
            primeData[idx + 0] = 34;
            primeData[idx + 1] = 17;
            primeData[idx + 2] = 0;
            primeData[idx + 3] = n >= 2 ? 60 : 0;
        }
    }
    const primeTex = new THREE.DataTexture(primeData, 10, 10);
    primeTex.needsUpdate = true;
    primeTex.minFilter = THREE.NearestFilter;
    primeTex.magFilter = THREE.NearestFilter;

    const uniforms = {
        uTime: { value: 0 },
        uPrimeTex: { value: primeTex },
        uSpeed: { value: 0.15 },
    };

    const sieveGeo = new THREE.PlaneGeometry(10, 15);
    const sieveMat = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform sampler2D uPrimeTex;
            uniform float uSpeed;
            varying vec2 vUv;

            void main() {
                float cols = 10.0;
                float rows = 10.0;

                vec2 uv = vUv;
                uv.y = fract(uv.y + uTime * uSpeed);

                float col = floor(uv.x * cols);
                float row = floor(uv.y * rows);
                vec2 cellUv = fract(vec2(uv.x * cols, uv.y * rows));

                vec2 texCoord = vec2((col + 0.5) / cols, (row + 0.5) / rows);
                vec4 primeInfo = texture2D(uPrimeTex, texCoord);

                float d = length(cellUv - 0.5);
                float glyph = smoothstep(0.35, 0.25, d);

                bool isPrimeCell = primeInfo.r > 0.5;
                vec3 color;
                float alpha;
                if (isPrimeCell) {
                    color = vec3(1.0, 0.667, 0.267);
                    alpha = glyph * 0.95;
                    float halo = smoothstep(0.45, 0.2, d) * 0.3;
                    alpha = max(alpha, halo);
                } else {
                    color = vec3(0.133, 0.067, 0.0);
                    float fadePos = fract(uv.y + uTime * uSpeed * 0.5);
                    alpha = glyph * 0.15 * (1.0 - fadePos);
                }

                gl_FragColor = vec4(color, alpha);
            }
        `,
    });

    const sievePlane = new THREE.Mesh(sieveGeo, sieveMat);
    sievePlane.position.set(0, 8, 0);
    group.add(sievePlane);

    return { group, uniforms };
}
