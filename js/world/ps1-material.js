import * as THREE from 'three';

export function createPS1Material({
    color = new THREE.Color(0x71a94e),
    dither = true,
    snap = 320,
    fogColor = new THREE.Color(0xd5efff),
    fogNear = 100,
    fogFar = 400,
}) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: color.clone() },
            uSnap: { value: snap },
            uFogColor: { value: fogColor.clone() },
            uFogNear: { value: fogNear },
            uFogFar: { value: fogFar },
            uDither: { value: dither ? 1 : 0 },
            uLightDirection: { value: new THREE.Vector3(0.5, 0.8, 0.4).normalize() },
        },
        vertexColors: true,
        vertexShader: `
            varying vec3 vColor;
            varying vec3 vNormal;
            varying float vFogDepth;

            uniform float uSnap;

            void main() {
                vec3 transformed = position;
                vec4 viewPos = modelViewMatrix * vec4(transformed, 1.0);
                vec4 clipPos = projectionMatrix * viewPos;

                // Only apply PS1 vertex snapping to vertices in front of the
                // camera (w > 0).  Behind-camera vertices (w ≤ 0) must pass
                // through unmodified so the GPU's clip hardware can discard
                // them properly.  The old max(w, 0.0001) trick projected
                // behind-camera vertices to wild positions, creating giant
                // screen-filling triangles.
                if (clipPos.w > 0.0) {
                    vec2 ndc = clipPos.xy / clipPos.w;
                    vec2 snappedNdc = floor(ndc * uSnap) / uSnap;
                    clipPos.xy = snappedNdc * clipPos.w;
                }

                gl_Position = clipPos;

                vColor = color;
                vNormal = normalize(normalMatrix * normal);
                vFogDepth = -viewPos.z;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying vec3 vNormal;
            varying float vFogDepth;

            uniform vec3 uColor;
            uniform vec3 uFogColor;
            uniform float uFogNear;
            uniform float uFogFar;
            uniform int uDither;
            uniform vec3 uLightDirection;

            float bayer4(vec2 p) {
                int x = int(mod(p.x, 4.0));
                int y = int(mod(p.y, 4.0));
                int i = x + y * 4;
                if (i == 0) return 0.0 / 16.0;
                if (i == 1) return 8.0 / 16.0;
                if (i == 2) return 2.0 / 16.0;
                if (i == 3) return 10.0 / 16.0;
                if (i == 4) return 12.0 / 16.0;
                if (i == 5) return 4.0 / 16.0;
                if (i == 6) return 14.0 / 16.0;
                if (i == 7) return 6.0 / 16.0;
                if (i == 8) return 3.0 / 16.0;
                if (i == 9) return 11.0 / 16.0;
                if (i == 10) return 1.0 / 16.0;
                if (i == 11) return 9.0 / 16.0;
                if (i == 12) return 15.0 / 16.0;
                if (i == 13) return 7.0 / 16.0;
                if (i == 14) return 13.0 / 16.0;
                return 5.0 / 16.0;
            }

            void main() {
                float nDotL = max(dot(normalize(vNormal), normalize(uLightDirection)), 0.0);
                float lightBand = floor(nDotL * 4.0 + 0.5) / 4.0;
                // Use vertex color as the main surface color, tinted slightly by uColor
                vec3 base = uColor;
                vec3 lit = base * (0.68 + lightBand * 0.72);

                if (uDither == 1) {
                    float threshold = bayer4(gl_FragCoord.xy);
                    float luminance = dot(lit, vec3(0.299, 0.587, 0.114));
                    float d = step(threshold, luminance + 0.1);
                    lit = lit * (0.97 + 0.03 * d);
                }

                float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
                vec3 finalColor = mix(lit, uFogColor, fogFactor);
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
    });
}