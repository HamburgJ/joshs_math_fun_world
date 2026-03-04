import * as THREE from 'three';

// ── Reusable scratch state for lerp (avoids per-frame allocations) ──────
const _lerpScratch = {
    state: null, // lazily created on first use
};

export class WorldState {
    constructor({
        name            = 'unnamed',
        fogColor        = new THREE.Color(0xddeeff),
        fogNear         = 40,
        fogFar          = 170,
        skyTopColor     = new THREE.Color(0x5ebced),
        skyBottomColor  = new THREE.Color(0xddeeff),
        bgColor         = new THREE.Color(0xddeeff),
        shaderSnap      = 320,
        ambientIntensity = 0.3,
        sunIntensity    = 1.5,
        sunColor        = new THREE.Color(0xfffdf2),
        gravity         = 24,
        moveSpeed       = 5,
        cameraDistance   = 10,
        cameraPitch     = 0.4,
        renderScale     = 1.0,
    } = {}) {
        this.name            = name;
        this.fogColor        = fogColor.clone();
        this.fogNear         = fogNear;
        this.fogFar          = fogFar;
        this.skyTopColor     = skyTopColor.clone();
        this.skyBottomColor  = skyBottomColor.clone();
        this.bgColor         = bgColor.clone();
        this.shaderSnap      = shaderSnap;
        this.ambientIntensity = ambientIntensity;
        this.sunIntensity    = sunIntensity;
        this.sunColor        = sunColor.clone();
        this.gravity         = gravity;
        this.moveSpeed       = moveSpeed;
        this.cameraDistance   = cameraDistance;
        this.cameraPitch     = cameraPitch;
        this.renderScale     = renderScale;
    }

    /**
     * Copy all properties from another WorldState into this one in-place.
     * @param {WorldState} src
     */
    copyFrom(src) {
        this.name             = src.name;
        this.fogColor.copy(src.fogColor);
        this.fogNear          = src.fogNear;
        this.fogFar           = src.fogFar;
        this.skyTopColor.copy(src.skyTopColor);
        this.skyBottomColor.copy(src.skyBottomColor);
        this.bgColor.copy(src.bgColor);
        this.shaderSnap       = src.shaderSnap;
        this.ambientIntensity = src.ambientIntensity;
        this.sunIntensity     = src.sunIntensity;
        this.sunColor.copy(src.sunColor);
        this.gravity          = src.gravity;
        this.moveSpeed        = src.moveSpeed;
        this.cameraDistance   = src.cameraDistance;
        this.cameraPitch      = src.cameraPitch;
        this.renderScale      = src.renderScale;
    }

    /**
     * Interpolate between two WorldStates. Returns a new WorldState.
     * @param {WorldState} stateA
     * @param {WorldState} stateB
     * @param {number} t  0‑1 blend factor (0 = A, 1 = B)
     * @returns {WorldState}
     */
    static lerp(stateA, stateB, t) {
        const clamp = (v) => Math.max(0, Math.min(1, v));
        const ct = clamp(t);
        const mix = (a, b) => a + (b - a) * ct;

        // Reuse a single scratch WorldState to avoid creating ~11 objects
        // (5 Color clones in lerpColor + 5 more in constructor + 1 WorldState)
        // on every call. This is called every frame when Josh is far from
        // the hub center, so zero-alloc is critical.
        if (!_lerpScratch.state) {
            _lerpScratch.state = new WorldState();
        }
        const out = _lerpScratch.state;

        out.name             = ct < 0.5 ? stateA.name : stateB.name;
        out.fogColor.copy(stateA.fogColor).lerp(stateB.fogColor, ct);
        out.fogNear          = mix(stateA.fogNear, stateB.fogNear);
        out.fogFar           = mix(stateA.fogFar, stateB.fogFar);
        out.skyTopColor.copy(stateA.skyTopColor).lerp(stateB.skyTopColor, ct);
        out.skyBottomColor.copy(stateA.skyBottomColor).lerp(stateB.skyBottomColor, ct);
        out.bgColor.copy(stateA.bgColor).lerp(stateB.bgColor, ct);
        out.shaderSnap       = Math.round(mix(stateA.shaderSnap, stateB.shaderSnap));
        out.ambientIntensity = mix(stateA.ambientIntensity, stateB.ambientIntensity);
        out.sunIntensity     = mix(stateA.sunIntensity, stateB.sunIntensity);
        out.sunColor.copy(stateA.sunColor).lerp(stateB.sunColor, ct);
        out.gravity          = mix(stateA.gravity, stateB.gravity);
        out.moveSpeed        = mix(stateA.moveSpeed, stateB.moveSpeed);
        out.cameraDistance   = mix(stateA.cameraDistance, stateB.cameraDistance);
        out.cameraPitch      = mix(stateA.cameraPitch, stateB.cameraPitch);
        out.renderScale      = mix(stateA.renderScale, stateB.renderScale);

        return out;
    }
}

// ── Preset states ───────────────────────────────────────────────────────────

export const GREEN_FIELD_STATE = new WorldState({
    name:             'green_field',
    fogColor:         new THREE.Color(0xd5efff),
    fogNear:          80,
    fogFar:           350,
    skyTopColor:      new THREE.Color(0x48b6f7),
    skyBottomColor:   new THREE.Color(0xd5efff),
    bgColor:          new THREE.Color(0xd5efff),
    shaderSnap:       320,
    ambientIntensity: 0.5,
    sunIntensity:     1.8,
    sunColor:         new THREE.Color(0xfffdf2),
    gravity:          24,
    moveSpeed:        5,
    cameraDistance:   10,
    cameraPitch:      0.35,
    renderScale:      1.0,
});

export const WIREFRAME_VOID_STATE = new WorldState({
    name:             'wireframe_void',
    fogColor:         new THREE.Color(0x001100),
    fogNear:          20,
    fogFar:           100,
    skyTopColor:      new THREE.Color(0x000000),
    skyBottomColor:   new THREE.Color(0x001100),
    bgColor:          new THREE.Color(0x000000),
    shaderSnap:       480,
    ambientIntensity: 0.05,
    sunIntensity:     0.3,
    sunColor:         new THREE.Color(0x00FF41),
    gravity:          8,
    moveSpeed:        4,
    cameraDistance:   12,
    cameraPitch:      0.5,
    renderScale:      1.0,
});

export const COORDINATE_PLANE_STATE = new WorldState({
    name:             'coordinate_plane',
    fogColor:         new THREE.Color(0xF0F0F8),
    fogNear:          60,
    fogFar:           200,
    skyTopColor:      new THREE.Color(0x1a1a2e),
    skyBottomColor:   new THREE.Color(0x16213e),
    bgColor:          new THREE.Color(0x0f0f23),
    shaderSnap:       320,
    ambientIntensity: 0.5,
    sunIntensity:     1.0,
    sunColor:         new THREE.Color(0xDDDDFF),
    gravity:          24,
    moveSpeed:        5,
    cameraDistance:   14,
    cameraPitch:      0.6,
    renderScale:      1.0,
});

export const NON_EUCLIDEAN_STATE = new WorldState({
    name:             'non_euclidean',
    fogColor:         new THREE.Color(0x051515),
    fogNear:          15,
    fogFar:           80,
    skyTopColor:      new THREE.Color(0x020a0a),
    skyBottomColor:   new THREE.Color(0x0a2020),
    bgColor:          new THREE.Color(0x030808),
    shaderSnap:       240,
    ambientIntensity: 0.2,
    sunIntensity:     0.5,
    sunColor:         new THREE.Color(0x44CCCC),
    gravity:          16,
    moveSpeed:        4,
    cameraDistance:   12,
    cameraPitch:      0.5,
    renderScale:      1.0,
});

export const FRACTAL_BOUNDARY_STATE = new WorldState({
    name:             'fractal_boundary',
    fogColor:         new THREE.Color(0x0a0020),
    fogNear:          40,
    fogFar:           160,
    skyTopColor:      new THREE.Color(0x050010),
    skyBottomColor:   new THREE.Color(0x150030),
    bgColor:          new THREE.Color(0x030008),
    shaderSnap:       320,
    ambientIntensity: 0.6,
    sunIntensity:     0.4,
    sunColor:         new THREE.Color(0xFF44FF),
    gravity:          24,
    moveSpeed:        5,
    cameraDistance:   15,
    cameraPitch:      0.7,
    renderScale:      1.0,
});

export const NUMBER_CAVERNS_STATE = new WorldState({
    name:             'number_caverns',
    fogColor:         new THREE.Color(0x2a1a0a),
    fogNear:          20,
    fogFar:           120,
    skyTopColor:      new THREE.Color(0x1a0f05),
    skyBottomColor:   new THREE.Color(0x2a1a0a),
    bgColor:          new THREE.Color(0x0f0805),
    shaderSnap:       240,
    ambientIntensity: 0.5,
    sunIntensity:     0.8,
    sunColor:         new THREE.Color(0xFFBB66),
    gravity:          24,
    moveSpeed:        4,
    cameraDistance:   10,
    cameraPitch:      0.4,
    renderScale:      1.0,
});

export const THE_ARRIVAL_STATE = new WorldState({
    name:             'the_arrival',
    fogColor:         new THREE.Color(0x000000),
    fogNear:          500,
    fogFar:           1000,
    skyTopColor:      new THREE.Color(0x000000),
    skyBottomColor:   new THREE.Color(0x000000),
    bgColor:          new THREE.Color(0x000000),
    shaderSnap:       320,
    ambientIntensity: 0.05,
    sunIntensity:     0.1,
    sunColor:         new THREE.Color(0x222222),
    gravity:          24,
    moveSpeed:        0,
    cameraDistance:   20,
    cameraPitch:      0.8,
    renderScale:      1.0,
});

export const INNER_SPHERE_STATE = new WorldState({
    name:         'inner_sphere',
    fogColor:     new THREE.Color(0xaaddff),
    fogNear:      60,
    fogFar:       300,
    skyTopColor:  new THREE.Color(0xaaddff),
    skyBottomColor: new THREE.Color(0xaaddff),
    bgColor:      new THREE.Color(0xaaddff),
    ambientIntensity: 1.0,
    dirIntensity: 0.6,
    shaderSnap:   320,
    cameraDistance:   10,
    cameraPitch:      0.4,
    renderScale:      1.0,
});

export const DARK_FIELD_STATE = new WorldState({
    name:             'dark_field',
    fogColor:         new THREE.Color(0x0a1530),

    fogColor:         new THREE.Color(0x0a1530),
    fogNear:          40,
    fogFar:           200,
    skyTopColor:      new THREE.Color(0x050e22),
    skyBottomColor:   new THREE.Color(0x0a1530),
    bgColor:          new THREE.Color(0x0a1530),
    shaderSnap:       320,
    ambientIntensity: 0.12,
    sunIntensity:     0.05,
    sunColor:         new THREE.Color(0xfffdf2),
    gravity:          24,
    moveSpeed:        5,
    cameraDistance:   10,
    cameraPitch:      0.35,
    renderScale:      1.0,
});
