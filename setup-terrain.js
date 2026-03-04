const fs = require('fs');
const newTerrain = \import * as THREE from 'three';
import { mandelbrot } from './math.js';

export const WORLD_SIZE = 160;

const vertexShader = \\\\\\\
uniform vec4 uDomain;
uniform float uMaxIter;
uniform float uWorldSize;

varying float vIter;

float calcMandelbrot(vec2 c) {
    float r = 0.0;
    float i = 0.0;
    float iter = 0.0;
    for(float j = 0.0; j < 500.0; j++) {
        if (j >= uMaxIter) break;
        float r2 = r * r;
        float i2 = i * i;
        if (r2 + i2 > 4.0) return j;
        i = 2.0 * r * i + c.y;
        r = r2 - i2 + c.x;
        iter += 1.0;
    }
    return 0.0;
}

void main() {
    float halfSize = uWorldSize / 2.0;
    vec2 posXZ = vec2(position.x, position.z);
    
    float cr = uDomain.x + ((posXZ.x + halfSize) / uWorldSize) * (uDomain.y - uDomain.x);
    float ci = uDomain.z + ((posXZ.y + halfSize) / uWorldSize) * (uDomain.w - uDomain.z);
    
    float n = calcMandelbrot(vec2(cr, ci));
    vIter = n;
    
    vec3 newPos = position;
    newPos.y += n * 0.3;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
\\\\\\\;

const fragmentShader = \\\\\\\
uniform float uMaxIter;
varying float vIter;

vec3 hslToRgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float hPrime = h * 6.0;
    float x = c * (1.0 - abs(mod(hPrime, 2.0) - 1.0));
    float m = l - c / 2.0;

    vec3 rgb = vec3(0.0);
    if (hPrime < 1.0) rgb = vec3(c, x, 0.0);
    else if (hPrime < 2.0) rgb = vec3(x, c, 0.0);
    else if (hPrime < 3.0) rgb = vec3(0.0, c, x);
    else if (hPrime < 4.0) rgb = vec3(0.0, x, c);
    else if (hPrime < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);

    return rgb + vec3(m);
}

void main() {
    if (vIter == 0.0) {
        gl_FragColor = vec4(0.039, 0.0, 0.063, 1.0);
    } else {
        float t = vIter / uMaxIter;
        float hue = (1.0 - t) * (240.0 / 360.0);
        float s = 1.0;
        float lColor = 0.35 + t * 0.3;
        vec3 col = hslToRgb(hue, s, lColor);
        gl_FragColor = vec4(col, 1.0);
    }
}
\\\\\\\;

export function buildTerrain({ gridRes, maxIter, domain, existingMesh = null }) {
    const segs = gridRes - 1;
    let geo, mat, mesh;

    if (existingMesh) {
        mesh = existingMesh;
        mat = mesh.material;
        mat.uniforms.uDomain.value.set(domain.rMin, domain.rMax, domain.iMin, domain.iMax);
        mat.uniforms.uMaxIter.value = maxIter;
    } else {
        geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segs, segs);
        geo.rotateX(-Math.PI / 2);

        mat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uDomain: { value: new THREE.Vector4(domain.rMin, domain.rMax, domain.iMin, domain.iMax) },
                uMaxIter: { value: maxIter },
                uWorldSize: { value: WORLD_SIZE }
            },
            side: THREE.DoubleSide
        });

        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'MandelbrotTerrain';
    }

    return { mesh };
}

export function sampleTerrainHeight(domain, maxIter, x, z) {
    const halfSize = WORLD_SIZE / 2;
    const { rMin, rMax, iMin, iMax } = domain;
    
    if (Math.abs(x) > halfSize || Math.abs(z) > halfSize) return 0;
    
    const rRange = rMax - rMin;
    const iRange = iMax - iMin;
    
    const cr = rMin + ((x + halfSize) / WORLD_SIZE) * rRange;
    const ci = iMin + ((z + halfSize) / WORLD_SIZE) * iRange;

    const n = mandelbrot(cr, ci, maxIter);
    return n * 0.3;
}
\;
fs.writeFileSync('js/zones/fractal-boundary/terrain.js', newTerrain);

