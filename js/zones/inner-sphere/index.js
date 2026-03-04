import * as THREE from 'three';
import { ZoneBase } from '../zone-base.js';
import { InnerSphereTerrain } from './terrain.js';

// ═══════════════════════════════════════════════════════════════════════
//  Inner Sphere — walk on the INSIDE of a giant sphere.
//
//  Gravity points outward (toward the sphere surface).
//  The player walks on the inner surface, camera always inside.
//  Trees grow inward from the sphere surface.
//
//  Implementation:
//    Josh moves on a flat XZ plane internally. An azimuthal equidistant
//    projection maps that flat position onto the sphere's interior surface.
//    After josh.update() each frame, model.position and orientation are
//    overridden to place Josh on the sphere. The camera is repositioned
//    inside the sphere with a local "up" toward the sphere center.
//
//  Coordinate mapping (azimuthal equidistant from south pole):
//    flat distance d → co-latitude θ = π − d/R
//    flat angle φ = atan2(z, x)
//    3D = R · (sinθ·cosφ, cosθ, sinθ·sinφ)
// ═══════════════════════════════════════════════════════════════════════

export const SPHERE_RADIUS = 80;

// Scratch vectors — avoid per-frame allocations
const _camDesired  = new THREE.Vector3();
const _lookTarget  = new THREE.Vector3();
const _tmpV        = new THREE.Vector3();
const _basisX      = new THREE.Vector3();
const _basisY      = new THREE.Vector3();
const _basisZ      = new THREE.Vector3();
const _mat4        = new THREE.Matrix4();

export class InnerSphere extends ZoneBase {
    constructor() {
        super('inner_sphere');
        this.group.name = 'InnerSphereZone';

        this._time = 0;

        // ── Flat-space shadow state ─────────────────────────────────────
        // Josh actually moves on a flat XZ plane. We store that position
        // separately and map it to the sphere each frame.
        this._flatPos  = new THREE.Vector3(0, 0, 0);
        this._flatRotY = 0;
        this._flatLeanZ = 0;
        this._initialized = false;

        // ── Sphere-mapped state (set each frame) ────────────────────────
        this._spherePos     = new THREE.Vector3(0, -SPHERE_RADIUS, 0);
        this._localUp       = new THREE.Vector3(0, 1, 0);  // toward center
        this._sphereForward = new THREE.Vector3(0, 0, 1);
        this._sphereRight   = new THREE.Vector3(1, 0, 0);

        // ── Smoothed camera ─────────────────────────────────────────────
        this._smoothedCamPos = null;

        // ── Build terrain ───────────────────────────────────────────────
        this.terrain = new InnerSphereTerrain(this.group, SPHERE_RADIUS);
        this.interactables = [];
    }

    // ── Zone interface ──────────────────────────────────────────────────

    getTerrainHeight(/* x, z */) {
        // Physics sees a flat plane at y = 0.
        // Jump raises physics.y above 0; sphere mapping converts that
        // to a radial offset from the sphere surface.
        return 0;
    }

    setVisible(visible) {
        super.setVisible(visible);
        if (visible) {
            // Reset state for a fresh visit
            this._flatPos.set(0, 0, 0);
            this._flatRotY = 0;
            this._flatLeanZ = 0;
            this._initialized = false;
            this._smoothedCamPos = null;
        }
    }

    update(dt) {
        this._time += dt;
        this.terrain.update(dt);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Sphere mapping — called from game-loop.js each frame
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Restore Josh's flat-space position and rotation before josh.update()
     * runs. This ensures the standard physics / movement code works on a
     * flat plane rather than the sphere-mapped coordinates from last frame.
     */
    restoreFlatPosition(josh) {
        if (!this._initialized) return;
        josh.model.position.copy(this._flatPos);
        josh.model.rotation.set(0, this._flatRotY, this._flatLeanZ);
        josh.model.matrixAutoUpdate = true;   // let josh.update set position normally
    }

    /**
     * After josh.update(), read the new flat-space state, then override
     * model.position and orientation to place Josh on the sphere interior.
     */
    mapToSphere(josh) {
        // ── Save flat state ─────────────────────────────────────────────
        this._flatPos.copy(josh.model.position);
        this._flatRotY  = josh.model.rotation.y;
        this._flatLeanZ = josh.model.rotation.z;
        this._initialized = true;

        const x = this._flatPos.x;
        const z = this._flatPos.z;
        const jumpY = josh.physics.y;   // 0 = on surface, >0 = jumped toward center

        // ── Azimuthal equidistant projection ────────────────────────────
        const d = Math.sqrt(x * x + z * z);
        const R = SPHERE_RADIUS;

        // co-latitude: d = 0 → θ = π (south pole), d = R·π → θ = 0 (north pole)
        const theta = Math.max(0.02, Math.PI - d / R);
        // longitude
        const phi = d > 0.001 ? Math.atan2(z, x) : 0;

        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);
        const cosP = Math.cos(phi);
        const sinP = Math.sin(phi);

        // Outward direction (center → surface)
        const outX = sinT * cosP;
        const outY = cosT;
        const outZ = sinT * sinP;

        // Actual radius: R when on surface, less when jumping
        const actualR = R - jumpY;

        // ── 3D position on sphere ───────────────────────────────────────
        josh.model.position.set(outX * actualR, outY * actualR, outZ * actualR);
        this._spherePos.copy(josh.model.position);

        // ── Local "up" = toward center = −outward ───────────────────────
        this._localUp.set(-outX, -outY, -outZ);

        // ── Tangent basis on the sphere ─────────────────────────────────
        // "Walk" tangent (along increasing d = decreasing θ):
        const walkX = -cosT * cosP;
        const walkY =  sinT;
        const walkZ = -cosT * sinP;

        // "East" tangent (along increasing φ, normalized):
        const eastX = -sinP;
        const eastY =  0;
        const eastZ =  cosP;

        // ── Josh's facing direction on the sphere ───────────────────────
        const ry = this._flatRotY;
        const alpha = ry + phi;
        const fRad  = Math.sin(alpha);
        const fTan  = Math.cos(alpha);

        // Forward on sphere
        const fwdX = fRad * walkX + fTan * eastX;
        const fwdY = fRad * walkY + fTan * eastY;
        const fwdZ = fRad * walkZ + fTan * eastZ;

        _basisZ.set(fwdX, fwdY, fwdZ).normalize();
        this._sphereForward.copy(_basisZ);

        // Up (toward center)
        _basisY.copy(this._localUp);

        // Right = forward × up
        _basisX.crossVectors(_basisZ, _basisY).normalize();
        this._sphereRight.copy(_basisX);

        // Re-orthogonalize forward
        _basisZ.crossVectors(_basisY, _basisX).normalize();

        // ── Build orientation matrix ────────────────────────────────────
        _mat4.makeBasis(_basisX, _basisY, _basisZ);
        _mat4.setPosition(josh.model.position);

        josh.model.matrixAutoUpdate = false;
        josh.model.matrix.copy(_mat4);
        josh.model.matrixWorldNeedsUpdate = true;
    }

    /**
     * After cameraCtrl.update(), override the camera position and
     * orientation so it sits inside the sphere with the correct local "up".
     */
    fixCamera(camera, josh, cameraCtrl, dt) {
        const R = SPHERE_RADIUS;
        const up = this._localUp;
        const spherePos = this._spherePos;

        // ── Local tangent basis (for camera orbit) ──────────────────────
        _tmpV.set(0, 1, 0);
        const t1 = new THREE.Vector3().crossVectors(_tmpV, up);
        if (t1.lengthSq() < 0.001) {
            t1.set(1, 0, 0);
        }
        t1.normalize();
        const t2 = new THREE.Vector3().crossVectors(up, t1).normalize();

        // ── Camera orbit ────────────────────────────────────────────────
        const orbit = cameraCtrl.orbitAngle;
        const pitch = cameraCtrl.pitchAngle;
        const dist  = Math.min(cameraCtrl.distance, R * 0.35);

        // Horizontal offset direction (in tangent plane)
        const hx = Math.sin(orbit) * t1.x + Math.cos(orbit) * t2.x;
        const hy = Math.sin(orbit) * t1.y + Math.cos(orbit) * t2.y;
        const hz = Math.sin(orbit) * t1.z + Math.cos(orbit) * t2.z;

        _camDesired.set(
            spherePos.x + hx * dist * Math.cos(pitch) + up.x * dist * Math.sin(pitch),
            spherePos.y + hy * dist * Math.cos(pitch) + up.y * dist * Math.sin(pitch),
            spherePos.z + hz * dist * Math.cos(pitch) + up.z * dist * Math.sin(pitch),
        );

        // ── Keep camera inside the sphere ───────────────────────────────
        const camLen = _camDesired.length();
        if (camLen > R - 2) {
            _camDesired.multiplyScalar((R - 2) / camLen);
        }

        // ── Smooth camera follow ────────────────────────────────────────
        if (!this._smoothedCamPos) {
            this._smoothedCamPos = _camDesired.clone();
        } else {
            const lerpT = 1 - Math.exp(-10 * dt);
            this._smoothedCamPos.lerp(_camDesired, lerpT);
        }

        // Clamp smoothed position inside sphere
        const sLen = this._smoothedCamPos.length();
        if (sLen > R - 2) {
            this._smoothedCamPos.multiplyScalar((R - 2) / sLen);
        }

        camera.position.copy(this._smoothedCamPos);

        // ── Look at Josh's head ─────────────────────────────────────────
        _lookTarget.set(
            spherePos.x + up.x * 1.5,
            spherePos.y + up.y * 1.5,
            spherePos.z + up.z * 1.5,
        );
        camera.up.copy(up);
        camera.lookAt(_lookTarget);
    }

    /**
     * When leaving the sphere, restore normal model rendering.
     */
    restoreNormalModel(josh) {
        josh.model.matrixAutoUpdate = true;
    }
}
