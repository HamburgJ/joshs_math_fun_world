/**
 * hyperbolic-math.js — Real hyperbolic geometry utilities for the Poincaré disk model.
 *
 * All coordinates live in the open unit disk D = { z ∈ ℂ : |z| < 1 }.
 * We represent points as { x, y } pairs (the disk lies in the xz plane
 * in world space, but math is done in 2D).
 *
 * Key identities used:
 *   Hyperbolic distance:  d(0, r) = 2 atanh(r)
 *   General distance:     d(a, b) = 2 atanh(|a ⊖ b|)
 *   Möbius addition:      a ⊕ b = (a + b) / (1 + ā·b)       (complex)
 *   Möbius subtraction:   a ⊖ b = (a − b) / (1 − ā·b)       (complex)
 *   Geodesics:            circular arcs orthogonal to the boundary ∂D
 *
 * Shell Bingby once said: "Euclid's fifth postulate isn't wrong. It's just lonely."
 */

/** @typedef {{ x: number, y: number }} DiskPoint  A point in the Poincaré disk */

// ─── Constants ──────────────────────────────────────────────────────────────

/** Clamp factor: points are clamped to this radius to avoid numerical blow-up */
export const DISK_CLAMP = 0.999;

/** Pi, because we use it everywhere */
const PI = Math.PI;
const TWO_PI = 2 * PI;

// ─── Basic Operations ───────────────────────────────────────────────────────

/**
 * Clamp a disk point so |p| < DISK_CLAMP.
 * @param {DiskPoint} p
 * @returns {DiskPoint}
 */
export function clampToDisk(p) {
    const r = Math.sqrt(p.x * p.x + p.y * p.y);
    if (r < DISK_CLAMP) return { x: p.x, y: p.y };
    const s = DISK_CLAMP / r;
    return { x: p.x * s, y: p.y * s };
}

/**
 * Euclidean distance from the origin in the Poincaré disk.
 * @param {DiskPoint} p
 * @returns {number}
 */
export function euclideanRadius(p) {
    return Math.sqrt(p.x * p.x + p.y * p.y);
}

/**
 * Hyperbolic distance from the origin.
 * d(0, p) = 2 atanh(|p|)
 * @param {DiskPoint} p
 * @returns {number}
 */
export function hyperbolicDistFromOrigin(p) {
    const r = Math.min(euclideanRadius(p), DISK_CLAMP);
    return 2 * Math.atanh(r);
}

/**
 * Hyperbolic distance between two points a, b in the Poincaré disk.
 * d(a,b) = 2 atanh(|a ⊖ b|)
 * @param {DiskPoint} a
 * @param {DiskPoint} b
 * @returns {number}
 */
export function hyperbolicDist(a, b) {
    const diff = mobiusSub(a, b);
    const r = Math.min(euclideanRadius(diff), DISK_CLAMP);
    return 2 * Math.atanh(r);
}

/**
 * Euclidean radius corresponding to a given hyperbolic distance from the origin.
 * r = tanh(d / 2)
 * @param {number} d  Hyperbolic distance (≥ 0)
 * @returns {number}   Euclidean radius in [0, 1)
 */
export function hyperbolicToEuclidean(d) {
    return Math.tanh(d / 2);
}

// ─── Möbius Arithmetic (complex-number style) ───────────────────────────────

/**
 * Möbius addition: a ⊕ b = (a + b) / (1 + conj(a)·b)
 * This is the translation that moves the origin to a, applied to b.
 * @param {DiskPoint} a
 * @param {DiskPoint} b
 * @returns {DiskPoint}
 */
export function mobiusAdd(a, b) {
    // (a + b) as complex addition
    const nx = a.x + b.x;
    const ny = a.y + b.y;
    // 1 + conj(a) * b  (complex multiplication: conj(a) = (a.x, -a.y))
    const dx = 1 + (a.x * b.x + a.y * b.y);   // real part
    const dy = (a.x * b.y - a.y * b.x);         // imaginary part (note: -a.y for conj)
    // Wait — conj(a) * b = (a.x, -a.y)(b.x, b.y) = (a.x*b.x + a.y*b.y, a.x*b.y - a.y*b.x)
    const denom = dx * dx + dy * dy;
    if (denom < 1e-12) return { x: 0, y: 0 };
    // (nx + i*ny) / (dx + i*dy)
    return clampToDisk({
        x: (nx * dx + ny * dy) / denom,
        y: (ny * dx - nx * dy) / denom,
    });
}

/**
 * Möbius subtraction: a ⊖ b = (-a ⊕ b) with appropriate formula.
 * More precisely: a ⊖ b = (a - b) / (1 - conj(a)·b)
 * @param {DiskPoint} a
 * @param {DiskPoint} b
 * @returns {DiskPoint}
 */
export function mobiusSub(a, b) {
    const nx = a.x - b.x;
    const ny = a.y - b.y;
    // 1 - conj(a) * b
    const dx = 1 - (a.x * b.x + a.y * b.y);
    const dy = -(a.x * b.y - a.y * b.x);
    const denom = dx * dx + dy * dy;
    if (denom < 1e-12) return { x: 0, y: 0 };
    return clampToDisk({
        x: (nx * dx + ny * dy) / denom,
        y: (ny * dx - nx * dy) / denom,
    });
}

/**
 * Apply a Möbius transformation that translates the origin to point `center`,
 * then rotates by `angle`. This is the fundamental isometry.
 * φ_a(z) = (z + a) / (1 + conj(a)·z)   (translation)
 * then multiply by e^{iθ}                (rotation)
 * @param {DiskPoint} z      Point to transform
 * @param {DiskPoint} center Translation target
 * @param {number} angle     Rotation in radians
 * @returns {DiskPoint}
 */
export function mobiusTransform(z, center, angle) {
    const translated = mobiusAdd(center, z);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    return clampToDisk({
        x: translated.x * cosA - translated.y * sinA,
        y: translated.x * sinA + translated.y * cosA,
    });
}

// ─── Geodesics ──────────────────────────────────────────────────────────────

/**
 * Compute points along the geodesic (hyperbolic straight line) between
 * two points a and b in the Poincaré disk.
 *
 * Geodesics in the Poincaré disk are either:
 *   — diameters of the disk (if a, b, and origin are collinear), or
 *   — arcs of circles orthogonal to the boundary circle.
 *
 * We parametrize via the Möbius translation that sends a → origin,
 * walk along a diameter there, and translate back.
 *
 * @param {DiskPoint} a         Start point
 * @param {DiskPoint} b         End point
 * @param {number} [segments=24] Number of line segments
 * @returns {DiskPoint[]}        Array of (segments+1) points along the geodesic
 */
export function geodesicPoints(a, b, segments = 24) {
    // Strategy: translate a to origin via Möbius transform,
    // then b maps to some point b'. The geodesic through origin and b'
    // is a straight line (diameter). Walk along it, then translate back.

    // φ_{-a}(z) = (z - a) / (1 - conj(a)*z)  sends a → 0
    const neg_a = { x: -a.x, y: -a.y };

    // b in translated frame
    const bPrime = mobiusAdd(neg_a, b);
    const bPrimeR = euclideanRadius(bPrime);

    const points = [];

    if (bPrimeR < 1e-10) {
        // a and b are the same point
        for (let i = 0; i <= segments; i++) {
            points.push({ x: a.x, y: a.y });
        }
        return points;
    }

    // Direction of b' from origin (unit vector)
    const dirX = bPrime.x / bPrimeR;
    const dirY = bPrime.y / bPrimeR;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        // Linear interpolation along the diameter in the translated frame
        const px = dirX * bPrimeR * t;
        const py = dirY * bPrimeR * t;
        const pTranslated = { x: px, y: py };

        // Translate back: apply φ_a (Möbius add with a)
        const pOriginal = mobiusAdd(a, pTranslated);
        points.push(pOriginal);
    }

    return points;
}

// ─── Hyperbolic Polygon / Tiling ────────────────────────────────────────────

/**
 * Compute the vertices of a regular hyperbolic polygon {p, q}
 * centered at a given point.
 *
 * For a {p, q} tiling, the edge length is determined by:
 *   cosh(s/2) = cos(π/q) / sin(π/p)
 *
 * @param {number} p           Number of sides
 * @param {number} q           Polygons meeting at each vertex
 * @param {DiskPoint} center   Center point in the disk
 * @param {number} rotation    Rotation offset in radians
 * @returns {{ vertices: DiskPoint[], edgeLength: number }}
 */
export function regularHyperbolicPolygon(p, q, center = { x: 0, y: 0 }, rotation = 0) {
    // Compute the circumradius in hyperbolic distance
    // For a regular polygon {p, q}:
    //   cosh(R) = cos(π/q) / sin(π/p)   where R = circumradius
    const cosQ = Math.cos(PI / q);
    const sinP = Math.sin(PI / p);
    const coshR = cosQ / sinP;
    const R_hyp = Math.acosh(coshR);
    const R_euc = hyperbolicToEuclidean(R_hyp); // Poincaré disk Euclidean radius

    // Edge length: cosh(s/2) = cos(π/q) / sin(π/p)... actually for edge length:
    // cosh(s/2) = cos(π/p) * cos(π/q) / (sin(π/p) * something)
    // Simpler: the edge subtends angle 2π/p at center, so:
    // cosh(s) = cosh²(R) - sinh²(R) * cos(2π/p)
    const sinhR = Math.sinh(R_hyp);
    const coshS = coshR * coshR - sinhR * sinhR * Math.cos(TWO_PI / p);
    const edgeLength = Math.acosh(Math.max(1, coshS));

    const vertices = [];
    for (let i = 0; i < p; i++) {
        const angle = rotation + (TWO_PI * i) / p;
        const vx = R_euc * Math.cos(angle);
        const vy = R_euc * Math.sin(angle);
        // Place relative to center using Möbius addition
        vertices.push(mobiusAdd(center, { x: vx, y: vy }));
    }

    return { vertices, edgeLength };
}

/**
 * Generate a {p, q} hyperbolic tiling centered at the origin, up to
 * a maximum number of layers of recursion.
 *
 * Each polygon is returned as an array of vertices. Geodesic edges
 * connect consecutive vertices.
 *
 * @param {number} p            Sides per polygon
 * @param {number} q            Polygons per vertex
 * @param {number} maxLayers    Number of layers of tiling to generate
 * @param {number} [minRadius=0.01] Skip tiles whose center is too close to boundary
 * @returns {{ center: DiskPoint, rotation: number, vertices: DiskPoint[] }[]}
 */
export function generateTiling(p, q, maxLayers, minRadius = 0.01) {
    const tiles = [];
    const visited = new Set();

    /**
     * Round a disk point to a key for deduplication.
     * @param {DiskPoint} pt
     * @returns {string}
     */
    function key(pt) {
        return `${pt.x.toFixed(5)},${pt.y.toFixed(5)}`;
    }

    // Start with the central polygon
    const centralPoly = regularHyperbolicPolygon(p, q, { x: 0, y: 0 }, 0);

    /** @type {{ center: DiskPoint, rotation: number, depth: number }[]} */
    const queue = [{ center: { x: 0, y: 0 }, rotation: 0, depth: 0 }];
    visited.add(key({ x: 0, y: 0 }));

    while (queue.length > 0) {
        const { center, rotation, depth } = queue.shift();
        const rCenter = euclideanRadius(center);
        if (rCenter > DISK_CLAMP - 0.01) continue;

        const poly = regularHyperbolicPolygon(p, q, center, rotation);
        tiles.push({ center, rotation, vertices: poly.vertices });

        if (depth >= maxLayers) continue;

        // Generate neighbors: reflect the center across each edge midpoint
        for (let i = 0; i < p; i++) {
            const v0 = poly.vertices[i];
            const v1 = poly.vertices[(i + 1) % p];

            // Edge midpoint in hyperbolic coordinates (approximate via Möbius)
            const mid = geodesicMidpoint(v0, v1);

            // Reflect center across the edge.
            // In hyperbolic geometry, reflection across a geodesic through mid
            // at the right angle sends center to the neighboring tile's center.
            // Approximate: the neighbor center is at 2× the hyperbolic distance
            // from center to mid, in the direction of mid.

            // More robust approach: the neighbor center is the Möbius reflection
            // of this center through the geodesic edge.
            const neighbor = hyperbolicReflect(center, mid, v0, v1);

            const nKey = key(neighbor);
            if (!visited.has(nKey) && euclideanRadius(neighbor) < DISK_CLAMP - 0.01) {
                visited.add(nKey);
                // Approximate the rotation for the neighbor tile
                const neighborAngle = Math.atan2(neighbor.y - mid.y, neighbor.x - mid.x);
                queue.push({ center: neighbor, rotation: neighborAngle, depth: depth + 1 });
            }
        }
    }

    return tiles;
}

/**
 * Find the hyperbolic midpoint of two points.
 * @param {DiskPoint} a
 * @param {DiskPoint} b
 * @returns {DiskPoint}
 */
export function geodesicMidpoint(a, b) {
    const pts = geodesicPoints(a, b, 2);
    return pts[1]; // the midpoint
}

/**
 * Reflect a point across the geodesic defined by two points.
 * Uses the circle-inversion formula for the Poincaré disk.
 * @param {DiskPoint} point    Point to reflect
 * @param {DiskPoint} mid      Midpoint of the geodesic edge (unused but kept for API)
 * @param {DiskPoint} ga       First point on the geodesic
 * @param {DiskPoint} gb       Second point on the geodesic
 * @returns {DiskPoint}
 */
export function hyperbolicReflect(point, mid, ga, gb) {
    // Find the circle orthogonal to the unit disk passing through ga and gb.
    // Then invert `point` in that circle.

    const circle = geodesicCircle(ga, gb);

    if (circle === null) {
        // Geodesic is a diameter — reflect across the line through ga and gb
        const dx = gb.x - ga.x;
        const dy = gb.y - ga.y;
        const len2 = dx * dx + dy * dy;
        if (len2 < 1e-12) return point;

        // Project point onto the line
        const t = ((point.x - ga.x) * dx + (point.y - ga.y) * dy) / len2;
        const projX = ga.x + t * dx;
        const projY = ga.y + t * dy;
        return clampToDisk({
            x: 2 * projX - point.x,
            y: 2 * projY - point.y,
        });
    }

    // Circle inversion: reflect `point` in the circle (cx, cy, r)
    const { cx, cy, r } = circle;
    const dxp = point.x - cx;
    const dyp = point.y - cy;
    const dist2 = dxp * dxp + dyp * dyp;
    if (dist2 < 1e-12) return point;

    const scale = (r * r) / dist2;
    return clampToDisk({
        x: cx + dxp * scale,
        y: cy + dyp * scale,
    });
}

/**
 * Find the circle orthogonal to the unit disk that passes through
 * two points (i.e., the circle whose arc is the geodesic).
 *
 * Returns null if the geodesic is a diameter (points are collinear with origin).
 *
 * @param {DiskPoint} a
 * @param {DiskPoint} b
 * @returns {{ cx: number, cy: number, r: number } | null}
 */
export function geodesicCircle(a, b) {
    // The geodesic through a and b is an arc of a circle orthogonal to |z|=1.
    // For a circle orthogonal to the unit circle, if center is (h,k) and radius R:
    //   h² + k² = 1 + R²
    // The circle passes through a and b:
    //   (a.x-h)² + (a.y-k)² = R²
    //   (b.x-h)² + (b.y-k)² = R²

    // Check if it's a diameter (a, b, origin collinear)
    const cross = a.x * b.y - a.y * b.x;
    if (Math.abs(cross) < 1e-8) return null;

    // From the two point-on-circle equations:
    // a.x² - 2a.x*h + h² + a.y² - 2a.y*k + k² = R²
    // b.x² - 2b.x*h + h² + b.y² - 2b.y*k + k² = R²
    // Subtracting: a.x² - b.x² - 2h(a.x - b.x) + a.y² - b.y² - 2k(a.y - b.y) = 0
    // => 2h(a.x - b.x) + 2k(a.y - b.y) = a.x² - b.x² + a.y² - b.y²  ... (eq1)

    // From orthogonality: h² + k² = 1 + R²
    // And from passing through a: (a.x-h)² + (a.y-k)² = R²
    // Expanding: a.x² - 2a.x*h + a.y² - 2a.y*k + h² + k² = R²
    //            a.x² - 2a.x*h + a.y² - 2a.y*k + 1 + R² = R²
    //            a.x² - 2a.x*h + a.y² - 2a.y*k + 1 = 0
    // => 2a.x*h + 2a.y*k = a.x² + a.y² + 1                             ... (eq2)

    // Similarly for b:
    // => 2b.x*h + 2b.y*k = b.x² + b.y² + 1                             ... (eq3)

    // Solve the 2×2 system (eq2, eq3) for h, k:
    const rhs2 = a.x * a.x + a.y * a.y + 1;
    const rhs3 = b.x * b.x + b.y * b.y + 1;

    const det = 2 * (a.x * b.y - a.y * b.x); // = 2 * cross
    if (Math.abs(det) < 1e-10) return null;

    const h = (rhs2 * b.y - rhs3 * a.y) / det;
    const k = (a.x * rhs3 - b.x * rhs2) / det;
    const R = Math.sqrt(h * h + k * k - 1);

    return { cx: h, cy: k, r: R };
}

/**
 * Compute the interior angle of a regular hyperbolic {p, q} polygon.
 * Interior angle = 2π / q  (since q polygons meet at each vertex).
 * The angle deficit compared to Euclidean: Euclidean would be (p-2)π/p.
 * @param {number} p  sides
 * @param {number} q  polygons per vertex
 * @returns {number}   Interior angle in radians
 */
export function regularPolygonAngle(p, q) {
    return TWO_PI / q;
}

/**
 * Compute the angle sum of a hyperbolic triangle given its three vertices
 * in the Poincaré disk, using the Gauss-Bonnet theorem:
 *   angle sum = π + K·A
 * where K = -1 (constant negative curvature) and A is the area.
 *
 * For the Poincaré disk with Gaussian curvature K = -1:
 *   Area of triangle = π - (α + β + γ)   ... wait, that's circular.
 *
 * Instead, compute each angle directly via the hyperbolic law of cosines:
 *   cosh(c) = cosh(a)·cosh(b) - sinh(a)·sinh(b)·cos(C)
 *   => cos(C) = (cosh(a)·cosh(b) - cosh(c)) / (sinh(a)·sinh(b))
 *
 * @param {DiskPoint} A
 * @param {DiskPoint} B
 * @param {DiskPoint} C
 * @returns {{ angles: [number, number, number], sum: number, sumDegrees: number }}
 */
export function hyperbolicTriangleAngles(A, B, C) {
    const a = hyperbolicDist(B, C); // side opposite A
    const b = hyperbolicDist(A, C); // side opposite B
    const c = hyperbolicDist(A, B); // side opposite C

    function angle(oppSide, adj1, adj2) {
        const coshOpp = Math.cosh(oppSide);
        const coshA1 = Math.cosh(adj1);
        const coshA2 = Math.cosh(adj2);
        const sinhA1 = Math.sinh(adj1);
        const sinhA2 = Math.sinh(adj2);
        const denom = sinhA1 * sinhA2;
        if (Math.abs(denom) < 1e-12) return PI / 3; // degenerate
        const cosAngle = (coshA1 * coshA2 - coshOpp) / denom;
        return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    }

    const alpha = angle(a, b, c);
    const beta = angle(b, a, c);
    const gamma = angle(c, a, b);
    const sum = alpha + beta + gamma;

    return {
        angles: [alpha, beta, gamma],
        sum,
        sumDegrees: (sum * 180) / PI,
    };
}

/**
 * Compute the hyperbolic area of a triangle (= π - angle sum, for curvature -1).
 * @param {DiskPoint} A
 * @param {DiskPoint} B
 * @param {DiskPoint} C
 * @returns {number}
 */
export function hyperbolicTriangleArea(A, B, C) {
    const { sum } = hyperbolicTriangleAngles(A, B, C);
    return PI - sum; // always positive for non-degenerate hyperbolic triangles
}

/**
 * Place a point at a given hyperbolic distance and angle from the origin.
 * @param {number} dist   Hyperbolic distance from origin
 * @param {number} angle  Angle in radians
 * @returns {DiskPoint}
 */
export function pointAtDistAngle(dist, angle) {
    const r = hyperbolicToEuclidean(dist);
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
}
