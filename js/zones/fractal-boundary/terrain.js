import * as THREE from 'three';
import { mandelbrot, iterationToColor, complexToWorld } from './math.js';

/**
 * Mandelbrot heightmap terrain builder (GPU Displaced).
 *
 * Uses smooth (continuous) iteration count for silky color gradients,
 * and a classic Mandelbrot palette: deep navy interior, cycling through
 * electric blue → cyan → green → gold → burnt orange at the boundary.
 */

export const WORLD_SIZE = 160;

/* ───────────────────────── vertex shader ───────────────────────── */
const vertexShader = `
uniform vec4 uDomain;   // (rMin, rMax, iMin, iMax)
uniform float uMaxIter;
uniform float uWorldSize;
uniform float uIsOuter;

varying float vSmooth;   // smooth (continuous) iteration value

// Smooth iteration: returns fractional escape count for gradient-free banding
float calcMandelbrot(vec2 c) {
    float r = 0.0;
    float im = 0.0;
    float r2, i2;
    for (float j = 0.0; j < 512.0; j++) {
        if (j >= uMaxIter) break;
        r2 = r * r;
        i2 = im * im;
        if (r2 + i2 > 256.0) {               // bail-out at 256 for smoother log
            // smooth iteration count (Douady–Hubbard)
            float log_zn = log(r2 + i2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return j + 1.0 - nu;
        }
        im = 2.0 * r * im + c.y;
        r  = r2 - i2 + c.x;
    }
    return 0.0;   // inside the set
}

void main() {
    float halfSize = uWorldSize / 2.0;
    vec2 posXZ = vec2(position.x, -position.y);

    float cr = uDomain.x + ((posXZ.x + halfSize) / uWorldSize) * (uDomain.y - uDomain.x);
    float ci = uDomain.z + ((posXZ.y + halfSize) / uWorldSize) * (uDomain.w - uDomain.z);

    float n = calcMandelbrot(vec2(cr, ci));

    // For the outer ring, flatten the area already covered by the inner mesh
    if (uIsOuter > 0.5 && abs(posXZ.x) < halfSize && abs(posXZ.y) < halfSize) {
        n = 0.0;
    }

    vSmooth = n;

    vec3 newPos = position;
    if (uIsOuter > 0.5) {
        newPos.z += n * 0.3 - 0.5;   // push outer well below inner to kill z-fight
    } else {
        newPos.z += n * 0.3;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

/* ──────────────────────── fragment shader ──────────────────────── */
const fragmentShader = `
uniform float uMaxIter;
varying float vSmooth;

/*
 * Classic Mandelbrot palette — a hand-tuned 5-stop gradient that
 * cycles smoothly and looks like the iconic deep-zoom renders.
 *
 *  Stop 0  (t=0.0)  → deep navy          #000764
 *  Stop 1  (t=0.16) → electric blue       #206bcb
 *  Stop 2  (t=0.42) → white / ice blue    #edffff
 *  Stop 3  (t=0.6425) → golden yellow     #ffaa00
 *  Stop 4  (t=0.8575) → dark brown/maroon #000200
 *  … then wraps back to Stop 0
 */
vec3 palette(float t) {
    // 5-stop gradient positions & colors
    const int STOPS = 5;
    float pos[5];
    pos[0] = 0.0;
    pos[1] = 0.16;
    pos[2] = 0.42;
    pos[3] = 0.6425;
    pos[4] = 0.8575;

    vec3 col[5];
    col[0] = vec3(0.0, 0.027, 0.392);    // #000764
    col[1] = vec3(0.125, 0.420, 0.796);   // #206bcb
    col[2] = vec3(0.929, 1.0,   1.0);     // #edffff
    col[3] = vec3(1.0,   0.667, 0.0);     // #ffaa00
    col[4] = vec3(0.0,   0.008, 0.0);     // #000200

    // Wrap t into [0,1)
    t = fract(t);

    // Find which segment t falls in (with wrap-around to stop 0)
    for (int i = 0; i < 4; i++) {
        if (t < pos[i + 1]) {
            float f = (t - pos[i]) / (pos[i + 1] - pos[i]);
            return mix(col[i], col[i + 1], f);
        }
    }
    // Between last stop and wrap to stop 0
    float f = (t - pos[4]) / (1.0 - pos[4]);
    return mix(col[4], col[0], f);
}

void main() {
    if (vSmooth < 0.5) {
        // Inside the set — deep blue-black, NOT pure black
        gl_FragColor = vec4(0.0, 0.008, 0.06, 1.0);
    } else {
        // Map smooth iteration to palette, cycling every ~32 iterations
        float t = vSmooth / 32.0;
        vec3 col = palette(t);
        gl_FragColor = vec4(col, 1.0);
    }
}
`;

/**
 * Build (or rebuild) the Mandelbrot terrain mesh mapping.
 */
export function buildTerrain({ gridRes, maxIter, domain, existingMesh = null }) {
    const segs = gridRes - 1;
    let meshOuter, meshInner, group;

    if (existingMesh && existingMesh.isGroup) {
        group = existingMesh;
        meshInner = group.children.find(c => c.name === 'MandelbrotTerrain_Inner');
        meshOuter = group.children.find(c => c.name === 'MandelbrotTerrain_Outer');

        if (meshInner) {
            meshInner.material.uniforms.uDomain.value.set(domain.rMin, domain.rMax, domain.iMin, domain.iMax);
            meshInner.material.uniforms.uMaxIter.value = maxIter;
        }
        if (meshOuter) {
            meshOuter.material.uniforms.uDomain.value.set(domain.rMin, domain.rMax, domain.iMin, domain.iMax);
            meshOuter.material.uniforms.uMaxIter.value = maxIter;
        }
    } else {
        group = new THREE.Group();
        group.name = 'MandelbrotTerrainGroup';

        const baseUniforms = {
            uDomain: { value: new THREE.Vector4(domain.rMin, domain.rMax, domain.iMin, domain.iMax) },
            uMaxIter: { value: maxIter },
            uWorldSize: { value: WORLD_SIZE },
            uIsOuter: { value: 0.0 },
        };

        // ── 1. Inner detailed mesh ──
        const geoInner = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segs, segs);
        geoInner.rotateX(-Math.PI / 2);

        const matInner = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: { ...baseUniforms, uIsOuter: { value: 0.0 } },
            side: THREE.FrontSide,
        });

        meshInner = new THREE.Mesh(geoInner, matInner);
        meshInner.name = 'MandelbrotTerrain_Inner';
        meshInner.renderOrder = 1;                 // draw inner on top
        group.add(meshInner);

        // ── 2. Outer infinite floor ──
        const OUTER_SIZE = 20000;
        const outerSegs = 200;
        const geoOuter = new THREE.PlaneGeometry(OUTER_SIZE, OUTER_SIZE, outerSegs, outerSegs);
        geoOuter.rotateX(-Math.PI / 2);

        const matOuter = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: { ...baseUniforms, uIsOuter: { value: 1.0 } },
            side: THREE.FrontSide,
            polygonOffset: true,               // push outer backwards in depth
            polygonOffsetFactor: 2,
            polygonOffsetUnits: 2,
        });

        meshOuter = new THREE.Mesh(geoOuter, matOuter);
        meshOuter.name = 'MandelbrotTerrain_Outer';
        meshOuter.renderOrder = 0;                 // draw outer first
        group.add(meshOuter);
    }

    return { mesh: group, heightmap: new Float32Array(gridRes * gridRes) };
}

/**
 * On-demand CPU terrain height lookup for collision/parkour.
 */
export function sampleTerrainHeight(heightmap, gridRes, x, z) {
    // Determine height directly by localized CPU m-brot math computation without iterating entire mesh.
    // However, we don't have domain in args here. This function interface needs to stay same 
    // to not break `_getBaseTerrainHeight(x,z)` inside `index.js`, or we adapt `index.js`...
    // Let's assume we can grab domain from global state or we rewrite how the caller sees it.
    console.warn("sampleTerrainHeight used directly, but requires domain.");
    return 0; // Return flat 0 unless overloaded
}

export function sampleTerrainHeightMath(x, z, domain, maxIter) {
    const halfSize = WORLD_SIZE / 2;
    const { rMin, rMax, iMin, iMax } = domain;
    
    const rRange = rMax - rMin;
    const iRange = iMax - iMin;
    
    const cr = rMin + ((x + halfSize) / WORLD_SIZE) * rRange;
    const ci = iMin + ((z + halfSize) / WORLD_SIZE) * iRange;

    const n = mandelbrot(cr, ci, maxIter);
    
    // Smooth boundary logic between inner and outer zones for physics
    if (Math.abs(x) > halfSize || Math.abs(z) > halfSize) {
        return n * 0.3 - 0.5; // Match the downward shift of the outer mesh
    }
    
    return n * 0.3;
}
