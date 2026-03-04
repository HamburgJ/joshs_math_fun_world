/**
 * Transition types and easing functions for world-state shifts.
 */

export const TransitionType = {
    HARD_CUT:   'hard_cut',    // instant, 0 frames
    CROSSFADE:  'crossfade',   // 1‑3 seconds
    MORPH:      'morph',       // 3‑10 seconds, geometry/shader interpolation
    GLITCH:     'glitch',      // 0.5‑2 seconds, corrupted intermediate
};

/**
 * Returns an easing function  (t → t')  for the given transition type.
 *
 *   HARD_CUT  → step function (0 until t = 1, then 1)
 *   CROSSFADE → smoothstep    (hermite interpolation)
 *   MORPH     → linear
 *   GLITCH    → linear + random jitter (clamped 0‑1)
 *
 * @param {string} type  One of TransitionType values
 * @returns {(t: number) => number}
 */
export function getTransitionEasing(type) {
    switch (type) {
        case TransitionType.HARD_CUT:
            return (t) => (t >= 1.0 ? 1.0 : 0.0);

        case TransitionType.CROSSFADE:
            // Classic smoothstep: 3t² − 2t³
            return (t) => {
                const c = Math.max(0, Math.min(1, t));
                return c * c * (3 - 2 * c);
            };

        case TransitionType.MORPH:
            return (t) => Math.max(0, Math.min(1, t));

        case TransitionType.GLITCH: {
            return (t) => {
                const base = Math.max(0, Math.min(1, t));
                // Jitter amplitude fades near endpoints so we land cleanly
                const amplitude = 0.25 * Math.sin(base * Math.PI);
                const noise = (Math.random() - 0.5) * 2 * amplitude;
                return Math.max(0, Math.min(1, base + noise));
            };
        }

        default:
            // Fall back to linear for unknown types
            return (t) => Math.max(0, Math.min(1, t));
    }
}
