import * as THREE from 'three';

/**
 * Sets up the sky background and fog.
 */
export function setupSky(scene) {
    // Sky dome with gradient
    const skyGeo = new THREE.SphereGeometry(700, 16, 16);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            topColor:    { value: new THREE.Color(0x5ebced) },
            bottomColor: { value: new THREE.Color(0xd5efff) },
            uTime:       { value: 0.0 },
            uTrippyForce:{ value: 0.0 },
            uSunOpacity: { value: 1.0 },
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float uTime;
            uniform float uTrippyForce;
            uniform float uSunOpacity;
            varying vec3 vWorldPosition;

            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }

            void main() {
                vec3 dir = normalize(vWorldPosition);
                float h = dir.y;
                float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
                
                vec3 skyDayColor = mix(bottomColor, topColor, t);
                
                // Add a big beautiful bright sun to match sunlight (30, 50, 20)
                vec3 sunPos = normalize(vec3(30.0, 50.0, 20.0));
                
                // Sun metrics
                float sunDist = length(dir - sunPos);
                float sunGlow = exp(-sunDist * 3.5);
                float sunCore = smoothstep(0.08, 0.015, sunDist);
                float sunGlare = pow(max(dot(dir, sunPos), 0.0), 32.0);
                
                // Add to day color
                skyDayColor += vec3(1.0, 0.9, 0.6) * sunGlow * 0.4 * uSunOpacity; // Warm ambient glow
                skyDayColor += vec3(1.0, 0.8, 0.4) * sunGlare * 0.4 * uSunOpacity; // Bright glare
                skyDayColor = mix(skyDayColor, vec3(1.0, 1.0, 0.95), sunCore * uSunOpacity); // Blinding white/yellow center
                
                vec4 dayColor = vec4(skyDayColor, 1.0);
                
                vec4 finalColor = dayColor;
                if (uTrippyForce > 0.001) {
                // Crazy trippy sky noise
                vec3 p = dir * 3.0;
                float n = 0.0;
                
                vec3 p2 = p;
                for(int i=0; i<4; i++) {
                    p2.xy *= rot(uTime * 0.05 + float(i)*1.1);
                    p2.yz *= rot(uTime * 0.07 + float(i)*1.7);
                    n += sin(p2.x)*cos(p2.y)*sin(p2.z);
                    p2 *= 1.6;
                }
                n *= 0.5;
                
                // Cosmic galaxy / aurora palette
                vec3 trippyColor = vec3(
                    0.5 + 0.5 * sin(n * 10.0 + uTime),
                    0.2 + 0.8 * cos(n * 15.0 - uTime * 0.5),
                    0.7 + 0.3 * sin(n * 20.0 + uTime * 0.2)
                );
                
                // Swirling vortex effect
                float swirl = length(dir.xz);
                float angle = atan(dir.z, dir.x) + uTime * 0.2 + swirl * 2.0;
                float vortex = sin(angle * 5.0) * exp(-swirl * 2.0);
                trippyColor += vec3(vortex * 0.5, vortex * 0.2, vortex * 0.8);
                
                // Stars
                float starNoise = fract(sin(dot(dir, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
                if(starNoise > 0.99) {
                    trippyColor += vec3(1.0) * (sin(uTime * 2.0 + starNoise * 100.0) * 0.5 + 0.5);
                }
                
                // Giant celestial eye/planet
                float planetDist = length(dir - normalize(vec3(0.5, 0.8, -0.5)));
                if(planetDist < 0.2) {
                    float ring = abs(planetDist - 0.2) < 0.01 ? 1.0 : 0.0;
                    vec3 planetColor = vec3(1.0, 0.5, 0.0) * (sin(planetDist * 100.0 - uTime * 5.0) * 0.5 + 0.5);
                    trippyColor = mix(trippyColor, planetColor, 1.0 - smoothstep(0.0, 0.2, planetDist));
                }
                
                finalColor = mix(dayColor, vec4(trippyColor, 1.0), uTrippyForce);
                }
                gl_FragColor = finalColor;
            }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
    });

    scene.userData.skyMat = skyMat;

    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = 'sky-dome';
    sky.renderOrder = -1000;  // Render sky first, before all other geometry
    scene.add(sky);

    // Fog
    scene.fog = new THREE.Fog(0xd5efff, 100, 400);
    scene.background = new THREE.Color(0xd5efff);
}
