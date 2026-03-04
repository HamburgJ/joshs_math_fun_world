import * as THREE from 'three';
import { getTerrainHeight } from './noise.js';

/**
 * The Monolith — a tall, thin rectangular prism on the eastern edge
 * of the field. Proportions 1:4:9 (the first three perfect squares).
 *
 * Each face shows a different aesthetic:
 *   - Front (−Z): Wireframe — green grid lines on black
 *   - Back  (+Z): PS1-textured — dithered stone/concrete with vertex colors
 *   - Left  (−X): HTML — a shader that renders scrolling HTML-esque text
 *   - Right (+X): Mirror — reflects a distorted, darker version of the sky
 *
 * It hums. The hum is encoded as a pulsing emissive glow.
 */

// ── Proportions: 1:4:9 ─────────────────────────────────────────────────
const WIDTH  = 0.5;                  // 1 unit
const HEIGHT = WIDTH * 9;            // 4.5 (9 units)
const DEPTH  = WIDTH * 4;            // 2.0 (4 units)

// ── Placement: eastern edge of the field ────────────────────────────────
const MONOLITH_X = 22;
const MONOLITH_Z = 0;

/**
 * Creates the wireframe face material — green grid on black void.
 */
function createWireframeFaceMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;

            float grid(vec2 uv, float spacing, float thickness) {
                vec2 g = abs(fract(uv * spacing + 0.5) - 0.5);
                float line = min(g.x, g.y);
                return 1.0 - smoothstep(0.0, thickness, line);
            }

            void main() {
                vec2 uv = vUv;
                uv.y += uTime * 0.03; // slow scroll
                float g1 = grid(uv, 8.0, 0.04);
                float g2 = grid(uv, 2.0, 0.02) * 0.4;
                float intensity = g1 + g2;
                // Pulse with time
                float pulse = 0.7 + 0.3 * sin(uTime * 2.0);
                vec3 col = vec3(0.0, 0.85, 0.3) * intensity * pulse;
                gl_FragColor = vec4(col, 1.0);
            }
        `,
    });
}

/**
 * Creates the PS1-textured face — chunky dithered stone appearance.
 */
function createPS1FaceMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPos;
            void main() {
                vUv = uv;
                vPos = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vPos;

            // PS1-style ordered dither (Bayer 4×4)
            float bayer4(vec2 coord) {
                vec2 c = floor(mod(coord, 4.0));
                int idx = int(c.x) + int(c.y) * 4;
                // Unrolled Bayer matrix
                float m[16];
                m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
                m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
                m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
                m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
                return m[idx] / 16.0;
            }

            void main() {
                // Concrete/stone base color with slight variation
                float n = fract(sin(dot(floor(vUv * 16.0), vec2(12.9898, 78.233))) * 43758.5453);
                vec3 base = mix(vec3(0.45, 0.42, 0.38), vec3(0.55, 0.50, 0.44), n);

                // Apply dither
                float dith = bayer4(gl_FragCoord.xy);
                base += (dith - 0.5) * 0.08;

                // Dark veins / cracks
                float crack = smoothstep(0.48, 0.50, fract(vUv.y * 12.0 + sin(vUv.x * 6.0) * 0.3));
                base *= 1.0 - crack * 0.3;

                gl_FragColor = vec4(base, 1.0);
            }
        `,
    });
}

/**
 * Creates the HTML face — scrolling code/markup text effect.
 */
function createHTMLFaceMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;

            // Pseudo-random hash
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            // Simple "character cell" — draws a block at certain grid positions
            // to simulate monospace text scrolling by
            float textCell(vec2 uv, float row, float col) {
                // Each row has a different "line length" (pseudo-random)
                float lineLen = 3.0 + floor(hash(vec2(row, 0.0)) * 12.0);
                float indent  = floor(hash(vec2(row, 1.0)) * 4.0);

                if (col < indent || col > indent + lineLen) return 0.0;

                // Each character is either present or a space
                float charPresent = step(0.35, hash(vec2(row, col)));

                // The character glyph — just a filled rectangle with gap
                vec2 cell = fract(uv);
                float glyph = step(0.15, cell.x) * step(cell.x, 0.85) *
                              step(0.1, cell.y) * step(cell.y, 0.9);
                return glyph * charPresent;
            }

            void main() {
                // Scrolling grid of "text"
                vec2 uv = vUv;
                uv.y += uTime * 0.08; // scroll upward
                uv.x *= 20.0;  // columns
                uv.y *= 40.0;  // rows

                float row = floor(uv.y);
                float col = floor(uv.x);

                float txt = textCell(uv, row, col);

                // Color: white/green text on dark background (terminal aesthetic)
                vec3 bg   = vec3(0.02, 0.02, 0.05);
                vec3 fg   = mix(vec3(0.7, 0.9, 1.0), vec3(0.3, 1.0, 0.5), hash(vec2(row, 42.0)));

                // Highlight "tags" — some lines are orange (HTML tags)
                float isTag = step(0.7, hash(vec2(row, 3.0)));
                fg = mix(fg, vec3(1.0, 0.5, 0.2), isTag * 0.8);

                vec3 col3 = mix(bg, fg, txt);

                // Scanline effect
                float scanline = 0.85 + 0.15 * sin(vUv.y * 200.0 + uTime);
                col3 *= scanline;

                gl_FragColor = vec4(col3, 1.0);
            }
        `,
    });
}

/**
 * Creates the mirror face — reflects a distorted sky/world.
 */
function createMirrorFaceMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldNormal;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vWorldNormal;
            varying vec3 vWorldPos;

            void main() {
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                vec3 reflDir = reflect(-viewDir, vWorldNormal);

                // Fake environment: sky gradient based on reflection direction
                float skyT = reflDir.y * 0.5 + 0.5;

                // The mirror shows a different, darker version of the field
                vec3 darkSky  = vec3(0.05, 0.02, 0.10);  // deep purple void
                vec3 horizSky = vec3(0.15, 0.08, 0.20);
                vec3 reflected = mix(horizSky, darkSky, skyT);

                // Rippling distortion
                float ripple = sin(vUv.y * 20.0 + uTime * 3.0) * 0.02;
                reflected += ripple;

                // Fresnel edge brightening
                float fresnel = pow(1.0 - max(dot(viewDir, vWorldNormal), 0.0), 3.0);
                reflected += vec3(0.2, 0.1, 0.3) * fresnel;

                // Occasional flash — a glimpse of something
                float flash = smoothstep(0.98, 1.0, sin(uTime * 0.7));
                reflected += vec3(0.5, 0.3, 0.6) * flash * 0.3;

                gl_FragColor = vec4(reflected, 1.0);
            }
        `,
    });
}

/**
 * Creates the Monolith and returns { mesh, collider, update(dt, scene) }.
 */
export function createMonolith() {
    const groundY = getTerrainHeight(MONOLITH_X, MONOLITH_Z);

    // Build the geometry with per-face UVs (BoxGeometry has 6 faces, 2 tris each)
    const geo = new THREE.BoxGeometry(WIDTH, HEIGHT, DEPTH);

    // Materials array: [+X, -X, +Y, -Y, +Z, -Z]
    // Right, Left, Top, Bottom, Back, Front
    const matMirror    = createMirrorFaceMaterial();    // +X (right)
    const matHTML      = createHTMLFaceMaterial();      // -X (left)
    const matTop       = new THREE.MeshBasicMaterial({ color: 0x000000 }); // top (void)
    const matBottom    = new THREE.MeshBasicMaterial({ color: 0x000000 }); // bottom
    const matPS1       = createPS1FaceMaterial();       // +Z (back)
    const matWireframe = createWireframeFaceMaterial(); // -Z (front)

    const materials = [matMirror, matHTML, matTop, matBottom, matPS1, matWireframe];

    const mesh = new THREE.Mesh(geo, materials);
    mesh.name = 'monolith';

    // Position: bottom rests on terrain
    mesh.position.set(MONOLITH_X, groundY + HEIGHT / 2, MONOLITH_Z);

    // Subtle slow rotation — barely perceptible
    let rotAccum = 0;

    // Glow pulse for the "hum" effect — emissive outline marker
    const glowGeo = new THREE.BoxGeometry(WIDTH + 0.06, HEIGHT + 0.06, DEPTH + 0.06);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x220044,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.name = 'monolithGlow';

    const group = new THREE.Group();
    group.name = 'monolithGroup';
    group.add(mesh);
    group.add(glow);
    group.position.copy(mesh.position);
    mesh.position.set(0, 0, 0);
    glow.position.set(0, 0, 0);

    // The shader materials that need time updates
    const shaderMats = [matWireframe, matPS1, matHTML, matMirror];

    // ── Hum Shift: the monolith's frequency changes each session ────
    // Nearby objects vibrate when the hum intensifies.
    const humBaseFreq = 1.2 + Math.random() * 1.8;    // different each page load
    const humShiftFreq = 0.07 + Math.random() * 0.06; // slow drift
    const HUM_VIBRATE_RADIUS = 8;                      // radius of influence
    const HUM_VIBRATE_STRENGTH = 0.03;                 // max displacement
    let humShiftTimer = 0;
    let humShiftActive = false;
    let humShiftCooldown = 60 + Math.random() * 120;   // 1-3 min before first
    let humShiftDuration = 0;
    let humShiftElapsed = 0;
    const vibrating = [];  // { obj, origY }

    function startHumShift(scene) {
        humShiftActive = true;
        humShiftElapsed = 0;
        humShiftDuration = 3 + Math.random() * 5; // 3-8 seconds
        vibrating.length = 0;

        // Collect nearby meshes to vibrate
        const mx = group.position.x;
        const mz = group.position.z;
        scene.traverse((child) => {
            if (!child.isMesh) return;
            if (child === mesh || child === glow) return;
            if (child.name === 'monolith' || child.name === 'monolithGlow') return;
            const dx = child.position.x - mx;
            const dz = child.position.z - mz;
            // Use world position for children nested in groups
            const wp = new THREE.Vector3();
            child.getWorldPosition(wp);
            const dist = Math.sqrt((wp.x - mx) ** 2 + (wp.z - mz) ** 2);
            if (dist < HUM_VIBRATE_RADIUS && dist > 0.5) {
                vibrating.push({
                    obj: child,
                    origY: child.position.y,
                    dist,
                });
            }
        });
    }

    function updateHumShift(dt) {
        if (!humShiftActive) return;
        humShiftElapsed += dt;

        if (humShiftElapsed >= humShiftDuration) {
            // Restore all positions
            for (const v of vibrating) {
                v.obj.position.y = v.origY;
            }
            vibrating.length = 0;
            humShiftActive = false;
            humShiftCooldown = 45 + Math.random() * 90; // 45s-2min until next
            humShiftTimer = 0;
            return;
        }

        // Current hum frequency (drifts over time)
        const freq = humBaseFreq + Math.sin(rotAccum * humShiftFreq) * 0.5;

        // Envelope: fade in over 0.5s, sustain, fade out over 0.8s
        let envelope = 1;
        if (humShiftElapsed < 0.5) {
            envelope = humShiftElapsed / 0.5;
        } else if (humShiftElapsed > humShiftDuration - 0.8) {
            envelope = (humShiftDuration - humShiftElapsed) / 0.8;
        }
        envelope = Math.max(0, Math.min(1, envelope));

        // Vibrate each affected object
        for (const v of vibrating) {
            const falloff = 1 - (v.dist / HUM_VIBRATE_RADIUS);
            const vibY = Math.sin(humShiftElapsed * freq * Math.PI * 2 + v.dist * 3)
                       * HUM_VIBRATE_STRENGTH * falloff * envelope;
            v.obj.position.y = v.origY + vibY;
        }
    }

    function update(dt, scene) {
        // Update all shader uniforms
        for (const mat of shaderMats) {
            if (mat.uniforms?.uTime) {
                mat.uniforms.uTime.value += dt;
            }
        }

        // Barely perceptible rotation (one full turn every ~10 minutes)
        rotAccum += dt;
        mesh.rotation.y = Math.sin(rotAccum * 0.01) * 0.003;

        // Hum glow pulse — frequency shifts each session
        const currentFreq = humBaseFreq + Math.sin(rotAccum * humShiftFreq) * 0.5;
        const humPhase = Math.sin(rotAccum * currentFreq) * 0.5 + 0.5;
        glowMat.opacity = 0.05 + humPhase * 0.12;
        glowMat.color.setHSL(0.75 + Math.sin(rotAccum * 0.3) * 0.05, 0.6, 0.15 + humPhase * 0.1);

        // ── Hum Shift: occasionally make nearby objects vibrate ──────
        if (!humShiftActive) {
            humShiftTimer += dt;
            if (humShiftTimer >= humShiftCooldown && scene) {
                startHumShift(scene);
            }
        } else {
            updateHumShift(dt);
        }
    }

    return {
        mesh: group,
        collider: { x: MONOLITH_X, z: MONOLITH_Z, radius: 1.5 },
        update,
    };
}
