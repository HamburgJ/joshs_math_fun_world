/**
 * bomber-plane.js — The Doomsday Bomber
 *
 * A single plane circles high above the hub world at all times.
 * After 1 hour of cumulative hub time, it drops a bomb.
 * The bomb falls from the plane, impacts the ground, and an
 * expanding white-hot explosion grows outward, consuming the world.
 * The player is forcibly ejected to another zone.
 *
 * It should feel unsettling — the plane is always there, always watching.
 * The bomb drop is sudden. The explosion is slow, silent, and absolute.
 */

import * as THREE from 'three';
import { createPS1Material } from './ps1-material.js';

// ── Constants ───────────────────────────────────────────────────────────

const PLANE_ALTITUDE   = 120;          // how high the plane flies
const ORBIT_RADIUS     = 70;           // circle radius over hub
const ORBIT_SPEED      = 0.04;         // radians per second (slow, ominous)
const NUKE_DELAY       = 3600;         // seconds before the bomb drops (1 hour)
const BOMB_FALL_TIME   = 4.0;          // seconds for the bomb to fall
const EXPLOSION_GROW   = 12.0;         // seconds for the explosion to consume everything
const EXPLOSION_MAX_R  = 300;          // max explosion radius
const EXPLOSION_LINGER = 3.0;          // seconds of white-out before zone change

// ── Plane mesh builder ──────────────────────────────────────────────────

function buildPlaneMesh() {
    const group = new THREE.Group();
    group.name = 'bomber-plane';

    // Fuselage — elongated box, dark military grey
    const fuselageGeo = new THREE.BoxGeometry(1.2, 0.8, 6);
    const fuselageMat = new THREE.MeshBasicMaterial({
        color: 0x2a2a2a,
        fog: true,
    });
    const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
    group.add(fuselage);

    // Wings — wide, flat
    const wingGeo = new THREE.BoxGeometry(10, 0.15, 2);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x333333, fog: true });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 0.1, 0.5);
    group.add(wings);

    // Tail fin — vertical
    const tailGeo = new THREE.BoxGeometry(0.15, 1.8, 1.2);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a, fog: true });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 0.8, -2.7);
    group.add(tail);

    // Horizontal stabilizers
    const stabGeo = new THREE.BoxGeometry(3.5, 0.12, 0.9);
    const stab = new THREE.Mesh(stabGeo, tailMat);
    stab.position.set(0, 0.2, -2.7);
    group.add(stab);

    // Cockpit window — small dark blue strip
    const cockpitGeo = new THREE.BoxGeometry(0.7, 0.35, 0.6);
    const cockpitMat = new THREE.MeshBasicMaterial({ color: 0x0a0a20, fog: true });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.45, 2.2);
    group.add(cockpit);

    // Engine pods under wings
    const engineGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.0, 6);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0x222222, fog: true });
    for (const side of [-1, 1]) {
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(side * 3.2, -0.3, 0.5);
        group.add(engine);
    }

    // Scale to look right at altitude
    group.scale.setScalar(1.5);

    return group;
}

// ── Bomb mesh builder ───────────────────────────────────────────────────

function buildBombMesh() {
    const group = new THREE.Group();
    group.name = 'nuke-bomb';

    // Bomb body — dark cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.2, 2.0, 6);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Nose cone
    const noseGeo = new THREE.ConeGeometry(0.3, 0.6, 6);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.y = -1.3;
    nose.rotation.x = Math.PI; // point down
    group.add(nose);

    // Tail fins
    const finGeo = new THREE.BoxGeometry(0.8, 0.5, 0.08);
    const finMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.y = 0.9;
        fin.rotation.y = (Math.PI / 2) * i;
        group.add(fin);
    }

    group.scale.setScalar(1.2);
    return group;
}

// ── Explosion sphere ────────────────────────────────────────────────────

function buildExplosionSphere() {
    // Custom shader for an unsettling, pulsing white-hot sphere
    const geo = new THREE.SphereGeometry(1, 24, 24);
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uTime:     { value: 0 },
            uRadius:   { value: 0 },
            uOpacity:  { value: 1.0 },
        },
        vertexShader: `
            varying vec3 vPos;
            varying vec3 vNormal;
            uniform float uTime;
            uniform float uRadius;

            void main() {
                // Distort surface with noise-like wobble
                float wobble = sin(position.x * 3.0 + uTime * 2.0) *
                               cos(position.y * 4.0 - uTime * 1.5) *
                               sin(position.z * 2.5 + uTime * 3.0) * 0.08;
                vec3 displaced = position * (uRadius + wobble * uRadius);
                vPos = displaced;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uOpacity;
            varying vec3 vPos;
            varying vec3 vNormal;

            void main() {
                // Core is blinding white, edges fade to sickly orange/red
                float dist = length(vPos);
                float edge = 1.0 - dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)) * 0.3;

                // Pulsing, flickering core
                float pulse = 0.85 + 0.15 * sin(uTime * 8.0 + dist * 2.0);
                float flicker = 0.9 + 0.1 * sin(uTime * 23.7) * cos(uTime * 17.3);

                // Color gradient: white core -> yellow -> orange -> dark red edge
                vec3 white  = vec3(1.0, 1.0, 0.95);
                vec3 yellow = vec3(1.0, 0.85, 0.2);
                vec3 orange = vec3(1.0, 0.4, 0.05);
                vec3 red    = vec3(0.6, 0.05, 0.0);
                vec3 black  = vec3(0.1, 0.0, 0.0);

                float t = clamp(edge, 0.0, 1.0);
                vec3 col;
                if (t < 0.3) {
                    col = mix(white, yellow, t / 0.3);
                } else if (t < 0.6) {
                    col = mix(yellow, orange, (t - 0.3) / 0.3);
                } else if (t < 0.85) {
                    col = mix(orange, red, (t - 0.6) / 0.25);
                } else {
                    col = mix(red, black, (t - 0.85) / 0.15);
                }

                col *= pulse * flicker;

                gl_FragColor = vec4(col, uOpacity);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    const sphere = new THREE.Mesh(geo, mat);
    sphere.name = 'nuke-explosion';
    sphere.visible = false;
    return sphere;
}

// ── White-out overlay (DOM) ─────────────────────────────────────────────

function createWhiteoutOverlay() {
    const el = document.createElement('div');
    el.id = 'nuke-whiteout';
    el.style.cssText = `
        position: fixed; inset: 0; z-index: 800;
        background: white; opacity: 0; pointer-events: none;
        transition: none;
    `;
    document.body.appendChild(el);
    return el;
}

// ── Warning text (appears subtly near the end) ─────────────────────────

function createWarningText() {
    const el = document.createElement('div');
    el.id = 'nuke-warning';
    el.style.cssText = `
        position: fixed; bottom: 20%; left: 50%;
        transform: translateX(-50%);
        font-family: monospace; font-size: 14px;
        color: rgba(180, 0, 0, 0); z-index: 810;
        pointer-events: none; white-space: nowrap;
        letter-spacing: 4px; text-transform: uppercase;
        transition: color 10s linear;
    `;
    el.textContent = '';
    document.body.appendChild(el);
    return el;
}

// ═════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — BomberPlane system
// ═════════════════════════════════════════════════════════════════════════

/**
 * @typedef {'circling'|'dropping'|'exploding'|'whiteout'|'done'} BomberPhase
 */

export class BomberPlane {
    /**
     * @param {object} opts
     * @param {THREE.Group} opts.worldGroup  The hub field group to attach to
     * @param {THREE.Scene} opts.scene       The main scene (for explosion)
     * @param {Function} opts.onDetonation   Called when whiteout is complete — should trigger zone transition
     */
    constructor({ worldGroup, scene, onDetonation }) {
        this._scene = scene;
        this._worldGroup = worldGroup;
        this._onDetonation = onDetonation;

        // Build meshes
        this._plane = buildPlaneMesh();
        this._plane.position.y = PLANE_ALTITUDE;
        this._scene.add(this._plane);

        this._bomb = buildBombMesh();
        this._bomb.visible = false;
        this._scene.add(this._bomb);

        this._explosion = buildExplosionSphere();
        this._scene.add(this._explosion);

        // DOM overlays
        this._whiteout = createWhiteoutOverlay();
        this._warning = createWarningText();

        // State
        /** @type {BomberPhase} */
        this._phase = 'circling';
        this._hubTime = 0;           // cumulative seconds in hub
        this._orbitAngle = 0;
        this._bombTimer = 0;
        this._explosionTimer = 0;
        this._lingerTimer = 0;

        // Bomb fall start/end positions
        this._bombStart = new THREE.Vector3();
        this._bombTarget = new THREE.Vector3(0, 0, 0); // center of hub

        // Sound-like visual cue: subtle contrail behind plane
        this._contrail = this._createContrail();
        this._scene.add(this._contrail);

        // Track if active (only when in green_field)
        this._active = true;
    }

    /** Build a simple contrail line behind the plane */
    _createContrail() {
        const points = [];
        for (let i = 0; i < 40; i++) {
            points.push(new THREE.Vector3(0, 0, 0));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.25,
        });
        const line = new THREE.Line(geo, mat);
        line.name = 'contrail';
        line.frustumCulled = false;
        return line;
    }

    /** Update contrail points to trail behind plane position */
    _updateContrail() {
        const positions = this._contrail.geometry.attributes.position;
        const arr = positions.array;
        // Shift all points back one slot
        for (let i = arr.length - 3; i >= 3; i -= 3) {
            arr[i]     = arr[i - 3];
            arr[i + 1] = arr[i - 2];
            arr[i + 2] = arr[i - 1];
        }
        // First point = current plane position
        arr[0] = this._plane.position.x;
        arr[1] = this._plane.position.y;
        arr[2] = this._plane.position.z;
        positions.needsUpdate = true;
    }

    /**
     * Set whether the bomber system is active (only when player is in green_field).
     * The plane is always visible when in hub, timer only ticks when active.
     */
    setActive(active) {
        this._active = active;
        this._plane.visible = active;
        this._contrail.visible = active;
        // If deactivated mid-explosion, clean up
        if (!active && this._phase !== 'circling') {
            this._resetToCircling();
        }
    }

    /** Get cumulative hub time (for persistence if desired) */
    getHubTime() { return this._hubTime; }

    /** Set cumulative hub time (e.g. restored from save) */
    setHubTime(t) { this._hubTime = t; }

    /** Force the nuke to drop now (debug) */
    forceNuke() {
        if (this._phase === 'circling') {
            this._hubTime = NUKE_DELAY;
        }
    }

    /**
     * Per-frame update. Call from game loop.
     * @param {number} dt  Delta time in seconds
     * @param {THREE.Vector3} joshPos  Josh's current position
     */
    update(dt, joshPos) {
        if (!this._active) return;
        if (this._phase === 'done') return;

        switch (this._phase) {
            case 'circling':
                this._updateCircling(dt);
                break;
            case 'dropping':
                this._updateDropping(dt);
                break;
            case 'exploding':
                this._updateExploding(dt, joshPos);
                break;
            case 'whiteout':
                this._updateWhiteout(dt);
                break;
        }
    }

    /** @private */
    _updateCircling(dt) {
        this._hubTime += dt;
        this._orbitAngle += ORBIT_SPEED * dt;

        // Position the plane in a circle
        const x = Math.cos(this._orbitAngle) * ORBIT_RADIUS;
        const z = Math.sin(this._orbitAngle) * ORBIT_RADIUS;
        this._plane.position.set(x, PLANE_ALTITUDE, z);

        // Face direction of travel
        const nextAngle = this._orbitAngle + 0.01;
        const nx = Math.cos(nextAngle) * ORBIT_RADIUS;
        const nz = Math.sin(nextAngle) * ORBIT_RADIUS;
        this._plane.lookAt(nx, PLANE_ALTITUDE, nz);

        this._updateContrail();

        // Warning phase — subtle text appears in last 2 minutes
        const timeLeft = NUKE_DELAY - this._hubTime;
        if (timeLeft < 120 && timeLeft > 0) {
            // Slowly fade in the warning
            const t = 1 - (timeLeft / 120);
            const alpha = t * 0.35; // never fully opaque — just unsettling
            this._warning.style.color = `rgba(120, 0, 0, ${alpha.toFixed(3)})`;
            // Text changes as time runs out
            if (timeLeft > 60) {
                this._warning.textContent = 'something feels wrong';
            } else if (timeLeft > 30) {
                this._warning.textContent = 'the sky is watching';
            } else if (timeLeft > 10) {
                this._warning.textContent = 'run';
            } else {
                this._warning.textContent = '';
            }
        }

        // Time's up — drop the bomb
        if (this._hubTime >= NUKE_DELAY) {
            this._startBombDrop();
        }
    }

    /** @private */
    _startBombDrop() {
        this._phase = 'dropping';
        this._bombTimer = 0;
        this._warning.textContent = '';
        this._warning.style.color = 'rgba(180, 0, 0, 0)';

        // Bomb starts at plane position, falls to ground center
        this._bombStart.copy(this._plane.position);
        this._bombTarget.set(
            this._plane.position.x * 0.3, // drift toward center
            0,
            this._plane.position.z * 0.3,
        );

        this._bomb.visible = true;
        this._bomb.position.copy(this._bombStart);
    }

    /** @private */
    _updateDropping(dt) {
        this._bombTimer += dt;
        this._orbitAngle += ORBIT_SPEED * dt;

        // Keep plane moving
        const px = Math.cos(this._orbitAngle) * ORBIT_RADIUS;
        const pz = Math.sin(this._orbitAngle) * ORBIT_RADIUS;
        this._plane.position.set(px, PLANE_ALTITUDE, pz);
        const na = this._orbitAngle + 0.01;
        this._plane.lookAt(Math.cos(na) * ORBIT_RADIUS, PLANE_ALTITUDE, Math.sin(na) * ORBIT_RADIUS);
        this._updateContrail();

        // Bomb falls with acceleration (gravity feel)
        const t = Math.min(this._bombTimer / BOMB_FALL_TIME, 1);
        const eased = t * t; // quadratic ease-in (accelerating fall)

        // Interpolate position
        this._bomb.position.lerpVectors(this._bombStart, this._bombTarget, eased);

        // Bomb spins slightly as it falls
        this._bomb.rotation.x += dt * 0.5;
        this._bomb.rotation.z += dt * 0.3;

        // Screen starts to darken slightly as bomb falls
        if (t > 0.5) {
            const darkness = (t - 0.5) * 0.15;
            this._whiteout.style.background = 'black';
            this._whiteout.style.opacity = darkness.toFixed(3);
        }

        // Impact
        if (t >= 1) {
            this._startExplosion();
        }
    }

    /** @private */
    _startExplosion() {
        this._phase = 'exploding';
        this._explosionTimer = 0;

        // Hide the bomb, show explosion at impact point
        this._bomb.visible = false;
        this._explosion.visible = true;
        this._explosion.position.copy(this._bombTarget);
        this._explosion.position.y = 0;

        // Initial flash — instant white frame
        this._whiteout.style.background = 'white';
        this._whiteout.style.opacity = '0.9';

        // Fade the whiteout opacity back down so the explosion sphere is visible
        setTimeout(() => {
            this._whiteout.style.transition = 'opacity 1.5s ease-out';
            this._whiteout.style.opacity = '0.15';
        }, 100);
    }

    /** @private */
    _updateExploding(dt, joshPos) {
        this._explosionTimer += dt;
        const t = Math.min(this._explosionTimer / EXPLOSION_GROW, 1);

        // Explosion radius grows — fast at first, then decelerating
        const eased = 1 - Math.pow(1 - t, 2); // ease-out quad
        const radius = eased * EXPLOSION_MAX_R;

        // Update explosion shader
        const mat = this._explosion.material;
        mat.uniforms.uTime.value += dt;
        mat.uniforms.uRadius.value = Math.max(0.1, radius);

        // Pulsing opacity — the explosion breathes
        mat.uniforms.uOpacity.value = 0.7 + 0.3 * Math.sin(this._explosionTimer * 3);

        // Hide the plane once the explosion engulfs its altitude
        if (radius > PLANE_ALTITUDE) {
            this._plane.visible = false;
            this._contrail.visible = false;
        }

        // As explosion approaches Josh, intensify whiteout
        if (joshPos) {
            const distToJosh = Math.sqrt(
                (joshPos.x - this._bombTarget.x) ** 2 +
                (joshPos.z - this._bombTarget.z) ** 2
            );
            if (radius > distToJosh * 0.7) {
                const engulf = Math.min(1, (radius - distToJosh * 0.7) / (distToJosh * 0.5 + 10));
                this._whiteout.style.transition = 'none';
                this._whiteout.style.opacity = (0.15 + engulf * 0.85).toFixed(3);
            }
        }

        // Explosion done — transition to full whiteout
        if (t >= 1) {
            this._phase = 'whiteout';
            this._lingerTimer = 0;
            this._whiteout.style.transition = 'opacity 0.5s linear';
            this._whiteout.style.opacity = '1';
            this._whiteout.style.background = 'white';
        }
    }

    /** @private */
    _updateWhiteout(dt) {
        this._lingerTimer += dt;

        // Unsettling: text appears in the void
        if (this._lingerTimer > 1.0 && this._lingerTimer < 1.1) {
            this._warning.style.color = 'rgba(0, 0, 0, 0.3)';
            this._warning.style.transition = 'color 2s';
            this._warning.textContent = '';
        }

        if (this._lingerTimer >= EXPLOSION_LINGER) {
            this._phase = 'done';
            this._cleanup();

            // Trigger zone transition
            if (this._onDetonation) {
                this._onDetonation();
            }
        }
    }

    /** @private — Reset everything to circling state */
    _resetToCircling() {
        this._phase = 'circling';
        this._hubTime = 0;
        this._bombTimer = 0;
        this._explosionTimer = 0;
        this._lingerTimer = 0;

        this._bomb.visible = false;
        this._explosion.visible = false;
        this._plane.visible = true;
        this._contrail.visible = true;

        this._whiteout.style.transition = 'none';
        this._whiteout.style.opacity = '0';
        this._whiteout.style.background = 'white';

        this._warning.textContent = '';
        this._warning.style.color = 'rgba(180, 0, 0, 0)';
    }

    /** @private — Clean up after detonation */
    _cleanup() {
        this._explosion.visible = false;
        this._bomb.visible = false;
        this._plane.visible = false;
        this._contrail.visible = false;

        // Fade out whiteout over 2 seconds (the zone transition visuals take over)
        this._whiteout.style.transition = 'opacity 2s ease-out';
        this._whiteout.style.opacity = '0';

        // Remove warning text
        this._warning.textContent = '';
        this._warning.style.color = 'rgba(0, 0, 0, 0)';

        // Reset for next time player returns to hub
        setTimeout(() => {
            this._resetToCircling();
        }, 3000);
    }

    /** Clean up DOM elements if the system is destroyed */
    dispose() {
        this._whiteout?.remove();
        this._warning?.remove();
        if (this._plane.parent) this._plane.parent.remove(this._plane);
        if (this._bomb.parent) this._bomb.parent.remove(this._bomb);
        if (this._explosion.parent) this._explosion.parent.remove(this._explosion);
        if (this._contrail.parent) this._contrail.parent.remove(this._contrail);
    }
}
