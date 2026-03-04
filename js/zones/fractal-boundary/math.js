/**
 * Fractal math utilities — Mandelbrot and Julia set computation.
 *
 * Pure math, no Three.js. These functions are the engine
 * that everything else in the Fractal Boundary zone references.
 */

/**
 * Compute the Mandelbrot iteration count for c = cr + ci·i.
 * @param {number} cr Real component
 * @param {number} ci Imaginary component
 * @param {number} maxIter Maximum iterations
 * @returns {number} Iteration count (0 = inside the set)
 */
export function mandelbrot(cr, ci, maxIter) {
    let zr = 0;
    let zi = 0;
    for (let n = 0; n < maxIter; n++) {
        const zr2 = zr * zr;
        const zi2 = zi * zi;
        if (zr2 + zi2 > 4) return n;
        zi = 2 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
    }
    return 0;
}

/**
 * Compute the Julia iteration count for z₀ = zr + zi·i with parameter c.
 * @param {number} zr Real component of starting point
 * @param {number} zi Imaginary component of starting point
 * @param {number} cr Real component of c
 * @param {number} ci Imaginary component of c
 * @param {number} maxIter Maximum iterations
 * @returns {number} Iteration count (0 = inside the set)
 */
export function julia(zr, zi, cr, ci, maxIter) {
    for (let n = 0; n < maxIter; n++) {
        const zr2 = zr * zr;
        const zi2 = zi * zi;
        if (zr2 + zi2 > 4) return n;
        const newZi = 2 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
        zi = newZi;
    }
    return 0;
}

/**
 * Classic Mandelbrot palette — matches the GPU shader exactly.
 * 5-stop gradient that cycles every 32 iterations.
 *
 * @param {number} n Iteration count (0 = inside the set)
 * @param {number} maxIter Maximum iterations
 * @returns {{ r: number, g: number, b: number }} RGB [0, 1]
 */
export function iterationToColor(n, maxIter) {
    if (n === 0) {
        return { r: 0.0, g: 0.008, b: 0.06 };
    }

    // Same palette stops as the fragment shader
    const stops = [
        { p: 0.0,    r: 0.0,   g: 0.027, b: 0.392 },
        { p: 0.16,   r: 0.125, g: 0.420, b: 0.796 },
        { p: 0.42,   r: 0.929, g: 1.0,   b: 1.0   },
        { p: 0.6425, r: 1.0,   g: 0.667, b: 0.0   },
        { p: 0.8575, r: 0.0,   g: 0.008, b: 0.0   },
    ];

    let t = (n / 32) % 1;
    if (t < 0) t += 1;

    for (let i = 0; i < stops.length - 1; i++) {
        if (t < stops[i + 1].p) {
            const f = (t - stops[i].p) / (stops[i + 1].p - stops[i].p);
            return {
                r: stops[i].r + (stops[i + 1].r - stops[i].r) * f,
                g: stops[i].g + (stops[i + 1].g - stops[i].g) * f,
                b: stops[i].b + (stops[i + 1].b - stops[i].b) * f,
            };
        }
    }
    const last = stops[stops.length - 1];
    const f = (t - last.p) / (1.0 - last.p);
    return {
        r: last.r + (stops[0].r - last.r) * f,
        g: last.g + (stops[0].g - last.g) * f,
        b: last.b + (stops[0].b - last.b) * f,
    };
}

/**
 * HSL to RGB conversion.
 * @param {number} h Hue [0, 1]
 * @param {number} s Saturation [0, 1]
 * @param {number} l Lightness [0, 1]
 * @returns {{ r: number, g: number, b: number }}
 */
function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    const sector = Math.floor(h * 6);
    switch (sector % 6) {
        case 0: r = c; g = x; b = 0; break;
        case 1: r = x; g = c; b = 0; break;
        case 2: r = 0; g = c; b = x; break;
        case 3: r = 0; g = x; b = c; break;
        case 4: r = x; g = 0; b = c; break;
        case 5: r = c; g = 0; b = x; break;
        default: r = 0; g = 0; b = 0;
    }
    return { r: r + m, g: g + m, b: b + m };
}

/**
 * Convert complex coords to world XZ.
 * @param {number} cr Real part
 * @param {number} ci Imaginary part
 * @param {{ rMin: number, rMax: number, iMin: number, iMax: number }} domain
 * @param {number} worldSize
 * @returns {{ x: number, z: number }}
 */
export function complexToWorld(cr, ci, domain, worldSize) {
    const x = ((cr - domain.rMin) / (domain.rMax - domain.rMin) - 0.5) * worldSize;
    const z = ((ci - domain.iMin) / (domain.iMax - domain.iMin) - 0.5) * worldSize;
    return { x, z };
}

/**
 * Convert world XZ to complex coords.
 * @param {number} wx World X
 * @param {number} wz World Z
 * @param {{ rMin: number, rMax: number, iMin: number, iMax: number }} domain
 * @param {number} worldSize
 * @returns {{ cr: number, ci: number }}
 */
export function worldToComplex(wx, wz, domain, worldSize) {
    const cr = domain.rMin + ((wx / worldSize) + 0.5) * (domain.rMax - domain.rMin);
    const ci = domain.iMin + ((wz / worldSize) + 0.5) * (domain.iMax - domain.iMin);
    return { cr, ci };
}
