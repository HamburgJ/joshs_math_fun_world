import * as THREE from 'three';
import { RIEMANN_ZEROS } from './math.js';

/**
 * The Riemann Grotto — a sub-cave with the critical strip visualization.
 *
 * The critical line Re(s) = 1/2 glows amber. Non-trivial zeros
 * are placed as small pulsing spheres. The grotto is dark, mysterious,
 * and the deepest part of the cavern.
 *
 * When Josh approaches, the critical line glows brighter and the zeros
 * begin to hum (pulse faster).
 */

/**
 * Build the Riemann Grotto.
 *
 * @param {(text: string, opts?: object) => THREE.CanvasTexture} makeTextTexture
 * @returns {{ group: THREE.Group, uniforms: { uTime: { value: number } }, zeros: THREE.Mesh[], interactables: Array<{position: THREE.Vector3, label: string, type: string}> }}
 */
export function buildRiemannGrotto(makeTextTexture) {
    const group = new THREE.Group();
    group.position.set(0, 0, 30);
    group.name = 'RiemannGrotto';

    // Sub-cave dome
    const domeGeo = new THREE.SphereGeometry(15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshLambertMaterial({
        color: 0x1a0f20,
        emissive: 0x150a18,
        emissiveIntensity: 1.0,
        side: THREE.BackSide,
        flatShading: true,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    group.add(dome);

    // Critical strip shader
    const uniforms = {
        uTime: { value: 0 },
        uIntensity: { value: 1.0 },
    };

    const stripGeo = new THREE.PlaneGeometry(20, 8);
    const stripMat = new THREE.ShaderMaterial({
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
            uniform float uIntensity;
            varying vec2 vUv;

            void main() {
                float re = mix(-1.0, 2.0, vUv.x);

                vec3 bg = vec3(0.03, 0.01, 0.06);
                vec3 color = bg;

                // Critical strip
                if (re > 0.0 && re < 1.0) {
                    color = vec3(0.06, 0.02, 0.10);
                }

                // Edge lines
                float lineWidth = 0.015;
                float line0 = smoothstep(lineWidth, 0.0, abs(re));
                float line1 = smoothstep(lineWidth, 0.0, abs(re - 1.0));
                color = mix(color, vec3(0.3, 0.15, 0.5), line0);
                color = mix(color, vec3(0.3, 0.15, 0.5), line1);

                // Critical line at Re(s) = 1/2 — glows based on proximity intensity
                float critDist = abs(re - 0.5);
                float critGlow = smoothstep(0.03, 0.0, critDist) * (0.8 + 0.2 * sin(uTime * 2.0)) * uIntensity;
                float critHalo = exp(-critDist * 40.0) * 0.4 * uIntensity;
                color = mix(color, vec3(1.0, 0.667, 0.267), critGlow + critHalo);

                gl_FragColor = vec4(color, 0.9);
            }
        `,
    });

    const stripPlane = new THREE.Mesh(stripGeo, stripMat);
    stripPlane.position.set(0, 5, -10);
    group.add(stripPlane);

    // Non-trivial zeros
    const zeros = [];
    const zeroGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const zeroMat = new THREE.MeshLambertMaterial({
        color: 0xFFAA44,
        emissive: 0xFFAA44,
        emissiveIntensity: 0.8,
        flatShading: true,
    });

    const imMin = 0, imMax = 40, planeHeight = 8;
    const planeBottom = stripPlane.position.y - planeHeight / 2;

    for (const im of RIEMANN_ZEROS) {
        const yNorm = (im - imMin) / (imMax - imMin);
        const yPos = planeBottom + yNorm * planeHeight;

        const sphere = new THREE.Mesh(zeroGeo, zeroMat.clone());
        sphere.position.set(0, yPos, -10 + 0.15);
        group.add(sphere);
        zeros.push(sphere);
    }

    const interactables = [{
        position: new THREE.Vector3(0, 5, 30),
        label: 'The Grotto',
        type: 'riemann',
    }];

    return { group, uniforms, zeros, interactables };
}
