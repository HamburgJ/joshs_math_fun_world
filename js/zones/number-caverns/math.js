/**
 * Number theory math utilities — primality, Ulam spiral, Goldbach.
 *
 * Pure math, no Three.js.
 */

/**
 * Trial division primality test.
 * @param {number} n
 * @returns {boolean}
 */
export function isPrime(n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}

/**
 * Generate Ulam spiral positions for integers 1–count.
 * Standard spiral: start at (0,0), right, up, left×2, down×2, right×3, ...
 *
 * @param {number} count — How many integers to place
 * @returns {Array<{n: number, x: number, z: number}>}
 */
export function generateUlamPositions(count = 200) {
    const positions = [];
    let x = 0, z = 0;
    const dx = [1, 0, -1, 0];
    const dz = [0, -1, 0, 1];
    let dir = 0, steps = 1, stepCount = 0, turnCount = 0;

    for (let n = 1; n <= count; n++) {
        positions.push({ n, x, z });
        x += dx[dir];
        z += dz[dir];
        stepCount++;
        if (stepCount === steps) {
            stepCount = 0;
            dir = (dir + 1) % 4;
            turnCount++;
            if (turnCount % 2 === 0) steps++;
        }
    }
    return positions;
}

/**
 * Goldbach decompositions for small even numbers.
 * @type {Array<{even: number, a: number, b: number}>}
 */
export const GOLDBACH_DECOMPOSITIONS = [
    { even: 4,  a: 2,  b: 2 },
    { even: 6,  a: 3,  b: 3 },
    { even: 8,  a: 3,  b: 5 },
    { even: 10, a: 5,  b: 5 },
    { even: 12, a: 5,  b: 7 },
    { even: 14, a: 3,  b: 11 },
    { even: 16, a: 5,  b: 11 },
    { even: 18, a: 7,  b: 11 },
    { even: 20, a: 7,  b: 13 },
];

/**
 * Twin prime pairs up to 50.
 * @type {Array<[number, number]>}
 */
export const TWIN_PRIMES = [[3, 5], [5, 7], [11, 13], [17, 19], [29, 31]];

/**
 * Known non-trivial Riemann zeta zeros (imaginary parts).
 * @type {number[]}
 */
export const RIEMANN_ZEROS = [14.13, 21.02, 25.01, 30.42, 32.94];
