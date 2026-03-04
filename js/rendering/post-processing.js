import * as THREE from 'three';

/**
 * Retro post-processing pipeline.
 * Renders the scene to a low-res render target, then upscales with nearest-
 * neighbour filtering onto a fullscreen quad. Optional CRT scanlines and
 * Bayer 4×4 ordered dither give it that crunchy PS1-era vibe.
 */

// ── Shaders ──────────────────────────────────────────────────────────────────

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uTexture;
uniform vec2      uResolution;
uniform int       uScanlines;
uniform int       uDither;
uniform float     uHyperbolicWarp;
uniform float     uSaturation;
uniform float     uChromaShift;
uniform float     uFlashIntensity;
uniform vec3      uFlashColor;

varying vec2 vUv;

/*
 * Classic Bayer 4×4 threshold matrix (values 0‑15, normalised to 0‑1).
 * Used for ordered dithering — subtle enough to feel retro, not distracting.
 */
float bayer4x4(ivec2 p) {
    int x = p.x & 3;          // mod 4
    int y = p.y & 3;
    // Bayer matrix as a flat lookup — GLSL ES doesn't love const int arrays,
    // so we just branch-free it with some bit-math.
    int index = (x ^ y) * 4 + y;

    // Canonical 4×4 Bayer matrix, row-major:
    //  0  8  2 10
    // 12  4 14  6
    //  3 11  1  9
    // 15  7 13  5
    int val;
    if      (y == 0) { if (x == 0) val =  0; else if (x == 1) val =  8; else if (x == 2) val =  2; else val = 10; }
    else if (y == 1) { if (x == 0) val = 12; else if (x == 1) val =  4; else if (x == 2) val = 14; else val =  6; }
    else if (y == 2) { if (x == 0) val =  3; else if (x == 1) val = 11; else if (x == 2) val =  1; else val =  9; }
    else             { if (x == 0) val = 15; else if (x == 1) val =  7; else if (x == 2) val = 13; else val =  5; }

    return float(val) / 16.0;
}

/*
 * Hyperbolic warp: applies a Poincaré-disk-inspired radial distortion.
 * Maps screen UVs through the inverse of the Poincaré conformal map,
 * so the rendered view matches the curvature of the space Josh is in.
 *
 * At uHyperbolicWarp = 0, no distortion.
 * At uHyperbolicWarp = 1, full hyperbolic lens effect.
 */
vec2 hyperbolicWarpUV(vec2 uv, float intensity) {
    vec2 centered = uv * 2.0 - 1.0;                  // [-1, 1]
    float r = length(centered);
    if (r < 0.001 || intensity < 0.001) return uv;    // no distortion at center

    // Apply tanh-based warping (inverse Poincaré map):
    //   warped_r = tanh(r * strength) / tanh(strength)
    // This pulls the edges inward (compressing the periphery) exactly like
    // looking out from inside a hyperbolic space.
    float strength = 1.0 + intensity * 1.5;
    float warpedR = tanh(r * strength) / tanh(strength);
    vec2 warped = centered * (warpedR / r);

    return warped * 0.5 + 0.5;                        // back to [0, 1]
}

void main() {
    // ── Hyperbolic warp ──────────────────────────────────────────────────
    vec2 sampleUV = vUv;
    if (uHyperbolicWarp > 0.001) {
        sampleUV = hyperbolicWarpUV(vUv, uHyperbolicWarp);
    }
    // Clamp to valid range (don't sample outside texture)
    sampleUV = clamp(sampleUV, 0.0, 1.0);

    // ── Chromatic aberration ─────────────────────────────────────────────
    // When uChromaShift > 0, offset R and B channels by ±N texels.
    vec4 color;
    if (uChromaShift > 0.001) {
        vec2 texelSize = 1.0 / uResolution;
        float offset = uChromaShift * texelSize.x;
        float r = texture2D(uTexture, sampleUV + vec2(offset, 0.0)).r;
        float g = texture2D(uTexture, sampleUV).g;
        float b = texture2D(uTexture, sampleUV - vec2(offset, 0.0)).b;
        float a = texture2D(uTexture, sampleUV).a;
        color = vec4(r, g, b, a);
    } else {
        color = texture2D(uTexture, sampleUV);
    }
    // ── Vibrance / saturation boost ───────────────────────────────────────
    // Pump up saturation so the retro world pops with colour.
    // Use a lower boost (1.25) to avoid crushing dark-scene colour channels
    // to zero — the old 1.50 destroyed any warm-tinted cave/dark surface.
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(luma), color.rgb, 1.25);

    // Brightness lift — push midtones up so the world feels sun-drenched
    color.rgb = pow(color.rgb, vec3(0.92));

    // Soft contrast — preserve shadow detail so dark zones aren't crushed
    // to pure black. The old '(c-0.5)*1.10+0.5' set a hard floor at ~0.045
    // that wiped out every cave/dark surface. This gentler curve keeps darks
    // visible while still snapping bright scenes.
    vec3 preContrast = color.rgb;
    color.rgb = clamp((color.rgb - 0.5) * 1.06 + 0.5, 0.0, 1.0);
    // Preserve shadow detail: dark pixels keep at least 40% of their
    // pre-contrast value so caves and dimly-lit zones stay visible.
    color.rgb = max(color.rgb, preContrast * 0.4);
    // ── Scanlines ────────────────────────────────────────────────────────
    // Darken every other row by ~10 % for a subtle CRT look.
    if (uScanlines == 1) {
        float row = floor(vUv.y * uResolution.y);
        float scanline = mod(row, 2.0);            // 0 or 1
        color.rgb *= 1.0 - scanline * 0.1;
    }

    // ── Ordered dither ───────────────────────────────────────────────────
    // Adds a tiny threshold nudge per-pixel, giving banding-free gradients
    // with that classic early-3D look.
    if (uDither == 1) {
        ivec2 pixel = ivec2(floor(vUv * uResolution));
        float threshold = bayer4x4(pixel);
        // Shift colour by a small amount (±1/64) based on threshold
        color.rgb += (threshold - 0.5) / 64.0;
    }

    // ── Saturation control ────────────────────────────────────────────────
    // uSaturation 1.0 = normal, 0.0 = full grayscale
    if (uSaturation < 0.999) {
        float grey = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(vec3(grey), color.rgb, uSaturation * 1.15);
    }

    // ── Transition flash ────────────────────────────────────────────────
    // When uFlashIntensity > 0, overlay the flash color (zone entrance spectacle).
    if (uFlashIntensity > 0.001) {
        color.rgb = mix(color.rgb, uFlashColor, uFlashIntensity);
    }

    gl_FragColor = color;
}
`;

// ── PostProcessing class ─────────────────────────────────────────────────────

export class PostProcessing {
    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {number} baseWidth  Internal render width  (e.g. 320)
     * @param {number} baseHeight Internal render height (e.g. 240)
     */
    constructor(renderer, baseWidth, baseHeight) {
        this.renderer = renderer;
        this.baseWidth = baseWidth;
        this.baseHeight = baseHeight;
        this.renderScale = 1.0;

        // ── Render target (low-res, nearest filter = chunky pixels) ──────
        this.renderTarget = this._createRenderTarget();

        // ── Fullscreen quad ──────────────────────────────────────────────
        this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this.quadMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTexture:        { value: this.renderTarget.texture },
                uResolution:     { value: new THREE.Vector2(baseWidth, baseHeight) },
                uScanlines:      { value: 0 },
                uDither:         { value: 1 },
                uHyperbolicWarp: { value: 0.0 },
                uSaturation:     { value: 1.0 },
                uChromaShift:    { value: 0.0 },
                uFlashIntensity: { value: 0.0 },
                uFlashColor:     { value: new THREE.Color(1, 1, 1) },
            },
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            depthTest: false,
            depthWrite: false,
        });

        this.quadGeometry = new THREE.PlaneGeometry(2, 2);
        this.quadMesh = new THREE.Mesh(this.quadGeometry, this.quadMaterial);

        this.quadScene = new THREE.Scene();
        this.quadScene.add(this.quadMesh);
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Render the scene through the post-processing pipeline.
     * @param {THREE.Scene}  scene
     * @param {THREE.Camera} camera
     */
    render(scene, camera) {
        // 1. Render scene into the low-res target
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(scene, camera);

        // 2. Blit the target onto the fullscreen quad (back to screen)
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.quadScene, this.quadCamera);
    }

    /**
     * Enable or disable CRT scanlines.
     * @param {boolean} enabled
     */
    setScanlines(enabled) {
        this.quadMaterial.uniforms.uScanlines.value = enabled ? 1 : 0;
    }

    /**
     * Enable or disable ordered dithering.
     * @param {boolean} enabled
     */
    setDithering(enabled) {
        this.quadMaterial.uniforms.uDither.value = enabled ? 1 : 0;
    }

    /**
     * Set the hyperbolic lens warp intensity.
     * 0 = no warp (Euclidean), 1 = full Poincaré disk view distortion.
     * @param {number} intensity  [0, 1]
     */
    setHyperbolicWarp(intensity) {
        this.quadMaterial.uniforms.uHyperbolicWarp.value = Math.max(0, Math.min(1, intensity));
    }

    /**
     * Set saturation multiplier. 1 = normal, 0 = grayscale.
     * @param {number} value  [0, 2]
     */
    setSaturation(value) {
        this.quadMaterial.uniforms.uSaturation.value = Math.max(0, Math.min(2, value));
    }

    /**
     * Set chromatic aberration pixel shift.
     * @param {number} pixels  0 = off, 2 = subtle, 5 = heavy
     */
    setChromaShift(pixels) {
        this.quadMaterial.uniforms.uChromaShift.value = Math.max(0, pixels);
    }

    /**
     * Flash the screen for zone transition spectacle.
     * Animates a color overlay from full intensity to zero over the given duration.
     * @param {object} [opts]
     * @param {THREE.Color|number} [opts.color=0xffffff]  Flash overlay color
     * @param {number} [opts.duration=0.4]  Flash duration in seconds
     * @param {number} [opts.intensity=0.8]  Peak flash intensity (0-1)
     */
    flashTransition(opts = {}) {
        const color = opts.color ?? 0xffffff;
        const duration = opts.duration ?? 0.4;
        const intensity = opts.intensity ?? 0.8;

        this.quadMaterial.uniforms.uFlashColor.value.set(color);
        this.quadMaterial.uniforms.uFlashIntensity.value = intensity;

        const startTime = performance.now();
        const animate = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const t = Math.min(1, elapsed / duration);
            // Ease out: fast start, slow fade
            this.quadMaterial.uniforms.uFlashIntensity.value = intensity * (1 - t * t);
            if (t < 1) requestAnimationFrame(animate);
            else this.quadMaterial.uniforms.uFlashIntensity.value = 0;
        };
        requestAnimationFrame(animate);
    }

    /**
     * Adjust the internal render scale.  0.5 = half-res (extra chunky).
     * @param {number} scale
     */
    setRenderScale(scale) {
        this.renderScale = scale;

        // Rebuild the render target at the new size
        this.renderTarget.dispose();
        this.renderTarget = this._createRenderTarget();
        this.quadMaterial.uniforms.uTexture.value = this.renderTarget.texture;

        const w = Math.max(1, Math.floor(this.baseWidth * scale));
        const h = Math.max(1, Math.floor(this.baseHeight * scale));
        this.quadMaterial.uniforms.uResolution.value.set(w, h);
    }

    /**
     * Free GPU resources.
     */
    dispose() {
        this.renderTarget.dispose();
        this.quadGeometry.dispose();
        this.quadMaterial.dispose();
    }

    // ── Internals ────────────────────────────────────────────────────────────

    /**
     * Build (or rebuild) the low-res render target.
     * @returns {THREE.WebGLRenderTarget}
     */
    _createRenderTarget() {
        const w = Math.max(1, Math.floor(this.baseWidth * this.renderScale));
        const h = Math.max(1, Math.floor(this.baseHeight * this.renderScale));

        return new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            depthBuffer: true,
        });
    }
}
