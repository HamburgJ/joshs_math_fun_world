import * as THREE from 'three';
import { getTerrainHeight } from './world/noise.js';

// ── Reusable scratch vectors (avoid per-frame allocations) ──────────────
const _camVec          = new THREE.Vector3();
const _desiredLookAhead = new THREE.Vector3();
const _lookAtPoint     = new THREE.Vector3();
const _desiredPos      = new THREE.Vector3();

/**
 * Third-person camera controller.
 * Orbits around a target (Josh) with:
 *   • Smooth exponential follow (frame-rate independent)
 *   • Movement look-ahead (camera leads in velocity direction)
 *   • Vertical velocity tracking (look-at adjusts for jumps/falls)
 *   • Landing impact bump
 *   • Bench sit pullback
 *   • Terrain collision avoidance
 */
export class CameraController {
    constructor(camera) {
        this.camera = camera;

        // Orbit parameters
        this.orbitAngle = 0;          // horizontal angle (radians)
        this.pitchAngle = 0.35;       // vertical angle (radians) — slightly above
        this.distance   = 8;          // distance from target
        this.minDistance = 4;
        this.maxDistance = 18;
        this.zoomSpeed   = 0.002;

        // Limits
        this.minPitch = 0.05;         // never look up from below
        this.maxPitch = 1.2;

        // Sensitivity
        this.horizontalSens = 0.004;
        this.verticalSens   = 0.004;

        // Smooth follow
        this.currentPosition = new THREE.Vector3();
        this.lerpSpeed = 12;

        // Terrain collision clearance
        this._terrainClearance = 1.5;
        this.colliders = [];

        // Zone-aware terrain height function
        this._getGroundHeight = getTerrainHeight;

        // ── Look-ahead (camera leads in movement direction) ─────
        this._lookAheadAmount  = 1.2;    // max offset in world units (reduced for PS1 stability)
        this._lookAheadSmooth  = 6;      // lerp speed for look-ahead offset
        this._lookAheadOffset  = new THREE.Vector3();
        this._prevTargetPos    = new THREE.Vector3();
        this._targetVelocity   = new THREE.Vector3();
        this._firstFrame       = true;

        // ── Smoothed look-at target (prevents rotation flickering) ──
        this._smoothedLookAt      = new THREE.Vector3();
        this._lookAtInitialized   = false;

        // ── Vertical tracking (look-at adjusts for jumps/falls) ──
        this._lookAtBaseY        = 1.8;    // base height above feet
        this._verticalTrackBias  = 0.0;    // smoothed vertical bias
        this._verticalTrackSmooth = 5;     // lerp speed for vertical tracking

        // ── Landing impact bump ─────────────────────────────────
        this._impactBump      = 0;        // current bump displacement
        this._impactDecay     = 8;        // how fast bump decays
        this._impactStrength  = 0.25;     // bump per unit of landing speed
        this._maxImpactBump   = 0.6;      // max bump displacement

        // ── Bench sit pullback state ────────────────────────────────────
        this._sitPullback = false;
        this._sitPullbackT = 0;
        this._sitSavedDistance = 8;
        this._sitSavedPitch = 0.35;
    }

    /** Set a custom ground-height function (for zone-specific terrain). */
    setGroundHeightFn(fn) {
        this._getGroundHeight = fn || getTerrainHeight;
    }

    /**
     * Trigger a landing impact camera bump.
     * @param {number} landingSpeed — vertical speed at moment of impact
     */
    triggerLandingImpact(landingSpeed) {
        this._impactBump = Math.min(
            this._maxImpactBump,
            landingSpeed * this._impactStrength
        );
    }

    /**
     * Begin dramatic camera pull-back when Josh sits on the bench.
     */
    beginSitPullback() {
        if (this._sitPullback) return;
        this._sitPullback = true;
        this._sitPullbackT = 0;
        this._sitSavedDistance = this.distance;
        this._sitSavedPitch = this.pitchAngle;
    }

    /**
     * End the sit pullback — smoothly return camera to normal.
     */
    endSitPullback() {
        this._sitPullback = false;
    }

    /**
     * Update camera based on mouse deltas and target position.
     * @param {number} dt - delta time
     * @param {{mouseDeltaX: number, mouseDeltaY: number, scrollDelta: number}} input
     * @param {THREE.Vector3} targetPosition - Josh's world position
     * @param {number} [verticalVelocity=0] - Josh's vertical velocity (for tracking)
     */
    update(dt, input, targetPosition, verticalVelocity = 0) {
        // ── Sit pullback animation ──────────────────────────────────────
        const SIT_DISTANCE = 16;
        const SIT_PITCH    = 1.15;
        const SIT_SPEED    = 1.2;

        if (this._sitPullback) {
            this._sitPullbackT = Math.min(1, this._sitPullbackT + dt * SIT_SPEED);
        } else if (this._sitPullbackT > 0) {
            this._sitPullbackT = Math.max(0, this._sitPullbackT - dt * SIT_SPEED * 1.5);
        }

        const pullT = this._sitPullbackT * this._sitPullbackT * (3 - 2 * this._sitPullbackT);

        // Apply mouse input to orbit (reduced sensitivity when pulled back)
        // Clamp mouse delta to prevent pointer-lock activation spike
        const maxDelta = 60;
        const mdx = Math.max(-maxDelta, Math.min(maxDelta, input.mouseDeltaX));
        const mdy = Math.max(-maxDelta, Math.min(maxDelta, input.mouseDeltaY));
        const inputScale = 1 - pullT * 0.7;
        this.orbitAngle -= mdx * this.horizontalSens * inputScale;
        this.pitchAngle -= mdy * this.verticalSens * inputScale;

        // Scroll wheel zoom (disabled during full pullback)
        if (input.scrollDelta && pullT < 0.5) {
            this.distance += input.scrollDelta * this.zoomSpeed;
            this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
        }

        // Clamp pitch
        this.pitchAngle = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitchAngle));

        // ── Apply pullback interpolation to effective distance/pitch ────
        const effDistance = this.distance + (SIT_DISTANCE - this.distance) * pullT;
        const effPitch   = this.pitchAngle + (SIT_PITCH - this.pitchAngle) * pullT;
        const effYaw     = this.orbitAngle;

        let finalDistance = effDistance;

        // --- Raycast Collisions (against 2D colliders mapped to 3D) ---
        if (this.colliders && this.colliders.length > 0) {
            _camVec.set(
                Math.sin(effPitch) * Math.sin(this.orbitAngle),
                Math.cos(effPitch),
                Math.sin(effPitch) * Math.cos(this.orbitAngle)
            );
            const camVec = _camVec;
            
            const px = targetPosition.x, pz = targetPosition.z;
            const cx = camVec.x, cz = camVec.z;
            
            for (const col of this.colliders) {
                // Circle collider
                if (col.x !== undefined && col.radius !== undefined) {
                    // Line-circle intersection
                    const f = {x: px - col.x, z: pz - col.z};
                    const a = cx*cx + cz*cz;
                    const b = 2 * (f.x*cx + f.z*cz);
                    const c = (f.x*f.x + f.z*f.z) - col.radius*col.radius;
                    let discriminant = b*b - 4*a*c;
                    if (discriminant > 0) {
                        discriminant = Math.sqrt(discriminant);
                        const t1 = (-b - discriminant)/(2*a);
                        if (t1 > 0 && t1 < finalDistance) finalDistance = t1 * 0.9;
                    }
                }
                // AABB collider
                if ((col.min && col.max) || (col.minX !== undefined && col.maxX !== undefined)) {
                    const minX = col.min ? col.min.x : col.minX;
                    const maxX = col.max ? col.max.x : col.maxX;
                    const minZ = col.min ? col.min.z : col.minZ;
                    const maxZ = col.max ? col.max.z : col.maxZ;
                    let tNear = -Infinity, tFar = Infinity;
                    const axes = [ { d: cx, p: px, min: minX, max: maxX }, { d: cz, p: pz, min: minZ, max: maxZ } ];
                    let intersects = true;
                    for (const axis of axes) {
                        if (axis.d === 0) { if (axis.p < axis.min || axis.p > axis.max) intersects = false; }
                        else {
                            let t1 = (axis.min - axis.p) / axis.d;
                            let t2 = (axis.max - axis.p) / axis.d;
                            if (t1 > t2) { const temp = t1; t1 = t2; t2 = temp; }
                            if (t1 > tNear) tNear = t1;
                            if (t2 < tFar) tFar = t2;
                            if (tNear > tFar || tFar < 0) intersects = false;
                        }
                    }
                    if (intersects && tNear > 0 && tNear < finalDistance) finalDistance = tNear * 0.9;
                }
            }
        }

        // ── Compute target velocity for look-ahead ──────────────────────
        if (this._firstFrame) {
            this._prevTargetPos.copy(targetPosition);
            this._firstFrame = false;
        }

        if (dt > 0.0001) {
            this._targetVelocity.subVectors(targetPosition, this._prevTargetPos).divideScalar(dt);
            this._targetVelocity.y = 0; // horizontal only for look-ahead
        }
        this._prevTargetPos.copy(targetPosition);

        // ── Look-ahead offset (smoothed) ─────────────────────────────────
        const speed = this._targetVelocity.length();
        _desiredLookAhead.set(0, 0, 0);
        if (speed > 0.5) {
            const scale = Math.min(1, speed / 10) * this._lookAheadAmount;
            _desiredLookAhead.copy(this._targetVelocity).normalize().multiplyScalar(scale);
        }
        const lookAheadT = 1 - Math.exp(-this._lookAheadSmooth * dt);
        this._lookAheadOffset.lerp(_desiredLookAhead, lookAheadT);

        // ── Vertical tracking bias (smooth look-at shift during jumps) ──
        let targetVerticalBias = 0;
        if (verticalVelocity > 2) {
            targetVerticalBias = Math.min(0.5, verticalVelocity * 0.04);
        } else if (verticalVelocity < -3) {
            targetVerticalBias = Math.max(-0.3, verticalVelocity * 0.02);
        }
        const vertT = 1 - Math.exp(-this._verticalTrackSmooth * dt);
        this._verticalTrackBias += (targetVerticalBias - this._verticalTrackBias) * vertT;

        // ── Landing impact bump decay ────────────────────────────────────
        if (this._impactBump > 0.001) {
            this._impactBump *= Math.exp(-this._impactDecay * dt);
        } else {
            this._impactBump = 0;
        }

        // ── Calculate look-at point ──────────────────────────────────────
        _lookAtPoint.copy(targetPosition);
        _lookAtPoint.y += this._lookAtBaseY + this._verticalTrackBias;
        _lookAtPoint.add(this._lookAheadOffset);

        const offsetX = Math.sin(this.orbitAngle) * Math.cos(effPitch) * finalDistance;
        const offsetZ = Math.cos(this.orbitAngle) * Math.cos(effPitch) * finalDistance;
        const offsetY = Math.sin(effPitch) * effDistance;

        _desiredPos.set(
            _lookAtPoint.x + offsetX,
            _lookAtPoint.y + offsetY - this._impactBump,
            _lookAtPoint.z + offsetZ
        );

        // Clamp desired position above terrain
        const groundAtCamera = this._getGroundHeight(_desiredPos.x, _desiredPos.z);
        const minY = groundAtCamera + this._terrainClearance;
        if (_desiredPos.y < minY) _desiredPos.y = minY;

        // Smooth follow via lerp
        const t = 1 - Math.exp(-this.lerpSpeed * dt);
        this.currentPosition.lerp(_desiredPos, t);

        // Also clamp final position above terrain (safety net during lerp)
        const groundAtFinal = this._getGroundHeight(this.currentPosition.x, this.currentPosition.z);
        const minYFinal = groundAtFinal + this._terrainClearance;
        if (this.currentPosition.y < minYFinal) this.currentPosition.y = minYFinal;

        this.camera.position.copy(this.currentPosition);
        
        // Smooth look-at target to prevent rotation flickering
        if (!this._lookAtInitialized) {
            this._smoothedLookAt.copy(_lookAtPoint);
            this._lookAtInitialized = true;
        } else {
            const lookAtLerpT = 1 - Math.exp(-10 * dt);
            this._smoothedLookAt.lerp(_lookAtPoint, lookAtLerpT);
        }
        this.camera.lookAt(this._smoothedLookAt);
    }

    /** Returns the horizontal orbit angle so Josh can move relative to camera. */
    getOrbitAngle() {
        return this.orbitAngle;
    }
}
