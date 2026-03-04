import * as THREE from 'three';
import { createJosh } from './model.js';
import { getTerrainHeight } from '../world/noise.js';
import { AnimationManager } from './animation.js';
import { JoshPhysics } from './physics.js';

// ── Reusable scratch objects (avoid per-frame allocations) ──────────────
const _headLocal = new THREE.Vector3();
const _headQuat  = new THREE.Quaternion();

/**
 * Josh character controller.
 * Manages movement, terrain following, physics, animation, and interaction.
 *
 * Movement feel enhancements:
 *   • Tuned acceleration / deceleration curves (weighty but responsive)
 *   • Separate ground / air / sprint acceleration rates
 *   • Direction-change boost (counter-strafing snaps faster)
 *   • Wall sliding (slide along obstacles instead of dead-stop)
 *   • Variable jump height via physics.releaseJump()
 *   • Jump buffering & coyote time (in physics.js)
 *   • Landing impact → camera bump
 *   • Frame-rate independent head tracking
 *   • Speed-dependent turn rate (snappier turns at low speed)
 *   • Model tilt into movement direction (lean)
 */
export class Josh {
    constructor({ colliders = [] } = {}) {
        this.model = createJosh();
        this.walkSpeed = 6;
        this.runSpeed  = 12;
        this.bodyRadius = 0.55;
        this.colliders = colliders;

        // Platform surfaces Josh can stand on (populated from field.userData.platforms)
        this.platformSurfaces = [];

        // Sub-systems
        this.animation = new AnimationManager(this.model);
        this.physics   = new JoshPhysics();

        // State
        this.isMoving = false;
        this.isSitting = false;
        this._lastPhysState = 'grounded';

        // 15fps animation timer (PS1 chop)
        this.animFrameTimer    = 0;
        this.animFrameInterval = 1 / 15;

        // Movement smoothing — tuned for weight + responsiveness
        this._velocityX = 0;
        this._velocityZ = 0;

        // Ground acceleration/deceleration
        this._accelGround       = 10;   // was 18 — slower ramp-up feels weightier
        this._decelGround       = 12;   // was 14 — slightly slower stop
        // Air acceleration/deceleration (gentler in air)
        this._accelAir          = 6;
        this._decelAir          = 4;
        // Sprint acceleration boost
        this._accelSprint       = 8;
        // Counter-strafe boost: when moving opposite to velocity, accel faster
        this._counterStrafeBoost = 2.0;

        // Turn rate (radians/s base, scaled by speed)
        this._turnSpeedBase = 18;   // fast base turn
        this._turnSpeedMin  = 12;   // minimum turn speed even when sprinting

        // Model lean (tilt body into movement)
        this._leanAmount = 0.06;    // max lean angle (radians)
        this._leanSmooth = 8;       // lean lerp speed
        this._currentLean = 0;

        // Camera reference (set by game loop for landing impact)
        this._cameraCtrl = null;

        // Head tracking
        this._headBone = this.model.getObjectByName('head');
        this._headTrackTarget = null;
        this._headTrackSmooth = 8; // frame-rate independent lerp speed

        /**
         * Optional movement transform for non-Euclidean zones.
         * @type {((x: number, z: number, dx: number, dz: number) => { x: number, z: number })|null}
         */
        this._movementTransform = null;

        /**
         * Optional zone-specific terrain height function.
         * @type {((x: number, z: number) => number)|null}
         */
        this._terrainHeightFn = null;

        // Start Josh far south — the massive gate is visible ahead
        const startX = 0;
        const startZ = 260;
        const startY = getTerrainHeight(startX, startZ);
        this.model.position.set(startX, startY, startZ);
        this.physics.y = startY;
    }

    /**
     * Teleport Josh to an exact world position, syncing both the visual
     * model and the physics engine. Use this for zone transitions instead
     * of setting model.position directly.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    teleportTo(x, y, z) {
        this.model.position.set(x, y, z);
        this.physics.y  = y;
        this.physics.vy = 0;
        this.physics.grounded = false;   // let next frame detect ground
        this._velocityX = 0;
        this._velocityZ = 0;
    }

    /**
     * Give Josh a reference to the camera controller so he can trigger
     * landing impact bumps.
     * @param {import('../camera.js').CameraController} ctrl
     */
    setCameraController(ctrl) {
        this._cameraCtrl = ctrl;
    }

    /**
     * Update Josh each frame.
     * @param {number} dt delta time in seconds
     * @param {import('./input.js').Input} input
     * @param {number} cameraOrbitAngle camera's horizontal orbit angle
     */
    update(dt, input, cameraOrbitAngle) {
        if (this.isSitting) {
            this._tickAnimation(dt);
            return;
        }

        // --- Jump (buffered) ---
        if (input.jump) {
            this.physics.tryJump();
        }
        // --- Variable jump height: release = short hop ---
        if (input.jumpReleased) {
            this.physics.releaseJump();
        }

        // --- Movement direction relative to camera ---
        let dirX = 0;
        let dirZ = 0;

        if (input.forward)  { dirX -= Math.sin(cameraOrbitAngle); dirZ -= Math.cos(cameraOrbitAngle); }
        if (input.backward) { dirX += Math.sin(cameraOrbitAngle); dirZ += Math.cos(cameraOrbitAngle); }
        if (input.left)     { dirX -= Math.cos(cameraOrbitAngle); dirZ += Math.sin(cameraOrbitAngle); }
        if (input.right)    { dirX += Math.cos(cameraOrbitAngle); dirZ -= Math.sin(cameraOrbitAngle); }

        const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const wantsToMove = len > 0.001;

        // --- Physics update ---
        const terrainFn = this._terrainHeightFn || getTerrainHeight;
        let terrainY = terrainFn(this.model.position.x, this.model.position.z);

        // Check platform surfaces — Josh can stand on any platform whose
        // AABB contains his XZ position, as long as he's above it or
        // falling onto it (within a small tolerance from above).
        terrainY = this._getEffectiveGround(terrainY);

        const physResult = this.physics.update(dt, terrainY);
        this._lastPhysState = physResult.state;

        // --- Landing impact → camera ---
        if (physResult.justLanded && this._cameraCtrl) {
            this._cameraCtrl.triggerLandingImpact(physResult.landingSpeed);
        }

        // --- Determine accel/decel rates based on state ---
        const isAirborne = physResult.state === 'rising' || physResult.state === 'falling';
        let accelRate = isAirborne ? this._accelAir : (input.sprint ? this._accelSprint : this._accelGround);
        const decelRate = isAirborne ? this._decelAir : this._decelGround;

        // --- Smooth acceleration / deceleration ---
        if (wantsToMove) {
            const normX = dirX / len;
            const normZ = dirZ / len;

            const targetSpeed = (input.sprint ? this.runSpeed : this.walkSpeed) * physResult.airControl;
            const targetVX = normX * targetSpeed;
            const targetVZ = normZ * targetSpeed;

            // Counter-strafe boost: if input direction opposes current velocity,
            // accelerate faster for responsive direction changes
            const dot = this._velocityX * normX + this._velocityZ * normZ;
            if (dot < 0) {
                accelRate *= this._counterStrafeBoost;
            }

            // Exponential approach (frame-rate independent via 1 - e^(-rate*dt))
            const t = 1 - Math.exp(-accelRate * dt);
            this._velocityX += (targetVX - this._velocityX) * t;
            this._velocityZ += (targetVZ - this._velocityZ) * t;

            // Smoothly rotate to face movement direction
            const targetAngle = Math.atan2(normX, normZ);
            let angleDiff = targetAngle - this.model.rotation.y;
            while (angleDiff >  Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Speed-dependent turn rate: faster turns at low speed, slower at high speed
            const currentSpeed = Math.sqrt(this._velocityX * this._velocityX + this._velocityZ * this._velocityZ);
            const speedRatio = Math.min(1, currentSpeed / this.runSpeed);
            const turnSpeed = this._turnSpeedBase - (this._turnSpeedBase - this._turnSpeedMin) * speedRatio;
            const turnT = 1 - Math.exp(-turnSpeed * dt);
            this.model.rotation.y += angleDiff * turnT;

            // Model lean: tilt body into turn direction
            const targetLean = -angleDiff * this._leanAmount * Math.min(1, currentSpeed / this.walkSpeed);
            const leanT = 1 - Math.exp(-this._leanSmooth * dt);
            this._currentLean += (targetLean - this._currentLean) * leanT;
        } else {
            // Decelerate to stop (frame-rate independent)
            const t = 1 - Math.exp(-decelRate * dt);
            this._velocityX -= this._velocityX * t;
            this._velocityZ -= this._velocityZ * t;

            // Snap to zero below threshold to prevent drift
            if (Math.abs(this._velocityX) < 0.01 && Math.abs(this._velocityZ) < 0.01) {
                this._velocityX = 0;
                this._velocityZ = 0;
            }

            // Ease lean back to zero when stopped
            const leanT = 1 - Math.exp(-this._leanSmooth * dt);
            this._currentLean += (0 - this._currentLean) * leanT;
        }

        const currentSpeed = Math.sqrt(this._velocityX * this._velocityX + this._velocityZ * this._velocityZ);
        this.isMoving = currentSpeed > 0.05;

        // --- Apply horizontal movement with wall sliding ---
        if (currentSpeed > 0.01) {
            const dx = this._velocityX * dt;
            const dz = this._velocityZ * dt;
            let nextX, nextZ;

            if (this._movementTransform) {
                const result = this._movementTransform(
                    this.model.position.x,
                    this.model.position.z,
                    dx, dz,
                );
                nextX = result.x;
                nextZ = result.z;

                if (!this._wouldCollide(nextX, nextZ)) {
                    this.model.position.x = nextX;
                    this.model.position.z = nextZ;
                } else {
                    this._velocityX = 0;
                    this._velocityZ = 0;
                }
            } else {
                nextX = this.model.position.x + dx;
                nextZ = this.model.position.z + dz;

                if (!this._wouldCollide(nextX, nextZ)) {
                    // No collision — move freely
                    this.model.position.x = nextX;
                    this.model.position.z = nextZ;
                } else {
                    // Wall sliding: try each axis independently
                    const slideX = this.model.position.x + dx;
                    const slideZ = this.model.position.z + dz;

                    let movedX = false;
                    let movedZ = false;

                    if (!this._wouldCollide(slideX, this.model.position.z)) {
                        this.model.position.x = slideX;
                        movedX = true;
                    } else {
                        this._velocityX *= -0.1; // slight bounce-back
                    }

                    if (!this._wouldCollide(this.model.position.x, slideZ)) {
                        this.model.position.z = slideZ;
                        movedZ = true;
                    } else {
                        this._velocityZ *= -0.1;
                    }

                    // If both axes blocked, zero velocity
                    if (!movedX && !movedZ) {
                        this._velocityX = 0;
                        this._velocityZ = 0;
                    }
                }
            }
        }

        // Apply vertical position from physics
        this.model.position.y = physResult.y;

        // Apply body lean
        this.model.rotation.z = this._currentLean;

        // --- Animation state machine ---
        this._resolveAnimState(physResult, input);

        // --- Animation tick at 15fps ---
        this._tickAnimation(dt);

        // --- Head tracking (frame-rate independent) ---
        this._applyHeadTracking(dt);
    }

    /** Set a head-tracking target direction (from InteractionManager). */
    setHeadTrackTarget(direction) {
        if (direction) {
            // Copy into a persistent vector to avoid referencing a shared temp
            if (!this._headTrackTarget) {
                this._headTrackTarget = direction.clone();
            } else {
                this._headTrackTarget.copy(direction);
            }
        } else {
            this._headTrackTarget = null;
        }
    }

    /**
     * Set a movement transform function for non-Euclidean movement.
     * Pass null to revert to standard Euclidean movement.
     * @param {((x: number, z: number, dx: number, dz: number) => { x: number, z: number })|null} fn
     */
    setMovementTransform(fn) {
        this._movementTransform = fn;
    }

    /**
     * Set a zone-specific terrain height function.
     * Pass null to revert to the default green-field terrain.
     * @param {((x: number, z: number) => number)|null} fn
     */
    setTerrainHeightFn(fn) {
        this._terrainHeightFn = fn;
    }

    /** Sit on the bench. */
    sit(position, lookAt) {
        this.isSitting = true;
        this.model.position.copy(position);
        this.model.lookAt(lookAt);
        this.animation.setState('sit');
    }

    /** Stand up from sitting. */
    stand() {
        this.isSitting = false;

        // Reset rotation — lookAt() during sit may have set x/z rotation
        // which the normal update loop never clears.
        const facingAngle = this.model.rotation.y;
        this.model.rotation.set(0, facingAngle, 0);

        // Step Josh forward (toward where he was facing) to clear any
        // collider he was placed inside while sitting (e.g. the bench).
        const stepDist = 1.8; // > bench radius (1.0) + body radius (0.55)
        this.model.position.x -= Math.sin(facingAngle) * stepDist;
        this.model.position.z -= Math.cos(facingAngle) * stepDist;

        // Sync terrain height & physics at the new position so Josh
        // doesn't fall from the old pre-sit physics.y value.
        const terrainFn = this._terrainHeightFn || getTerrainHeight;
        const terrainY = terrainFn(this.model.position.x, this.model.position.z);
        this.model.position.y = terrainY;
        this.physics.y = terrainY;
        this.physics.vy = 0;
        this.physics.grounded = true;
        this.physics.landing = false;
        this.physics.landTimer = 0;

        // Reset movement velocity & lean
        this._velocityX = 0;
        this._velocityZ = 0;
        this._currentLean = 0;

        this.animation.setState('idle');
    }

    /** World position of Josh (for camera targeting). */
    getPosition() {
        return this.model.position;
    }

    /** Current physics state: 'grounded' | 'rising' | 'falling' | 'landing'. */
    getPhysicsState() {
        return this._lastPhysState;
    }

    /** Current vertical velocity (for camera tracking). */
    getVerticalVelocity() {
        return this.physics.getVerticalVelocity();
    }

    // --- Private ---

    _resolveAnimState(physResult, input) {
        const { state } = physResult;

        if (state === 'rising') {
            this.animation.setState('jump_up');
        } else if (state === 'falling') {
            this.animation.setState('jump_fall');
        } else if (state === 'landing') {
            this.animation.setState('land');
        } else {
            // Grounded
            if (this.isMoving) {
                this.animation.setState(input.sprint ? 'run' : 'walk');
            } else {
                this.animation.setState('idle');
            }
        }
    }

    _tickAnimation(dt) {
        this.animFrameTimer += dt;
        if (this.animFrameTimer >= this.animFrameInterval) {
            this.animFrameTimer -= this.animFrameInterval;
            this.animation.update(this.animFrameInterval);
        }
    }

    _applyHeadTracking(dt) {
        if (!this._headBone || !this._headTrackTarget) return;

        // Convert world-space direction to Josh's local space
        _headLocal.copy(this._headTrackTarget);
        _headQuat.setFromEuler(this.model.rotation);
        _headQuat.invert();
        _headLocal.applyQuaternion(_headQuat);
        const local = _headLocal;

        // Target yaw/pitch for head
        const targetY = Math.atan2(local.x, local.z);
        const targetX = -Math.atan2(local.y, Math.sqrt(local.x * local.x + local.z * local.z));

        // Clamp
        const clampedY = Math.max(-0.7, Math.min(0.7, targetY));
        const clampedX = Math.max(-0.4, Math.min(0.4, targetX));

        // Frame-rate independent lerp (was fixed * 0.15)
        const t = 1 - Math.exp(-this._headTrackSmooth * dt);
        this._headBone.rotation.y += (clampedY - this._headBone.rotation.y) * t;
        this._headBone.rotation.x += (clampedX - this._headBone.rotation.x) * t;
    }

    _wouldCollide(x, z) {
        for (const obstacle of this.colliders) {
            if (obstacle.min && obstacle.max) {
                // AABB collision
                const closestX = Math.max(obstacle.min.x, Math.min(x, obstacle.max.x));
                const closestZ = Math.max(obstacle.min.z, Math.min(z, obstacle.max.z));
                const dx = x - closestX;
                const dz = z - closestZ;
                if ((dx * dx + dz * dz) < (this.bodyRadius * this.bodyRadius)) {
                    return true;
                }
            } else if (obstacle.minX !== undefined && obstacle.maxX !== undefined) {
                // Box collision with minX/maxX
                const closestX = Math.max(obstacle.minX, Math.min(x, obstacle.maxX));
                const closestZ = Math.max(obstacle.minZ, Math.min(z, obstacle.maxZ));
                const dx = x - closestX;
                const dz = z - closestZ;
                if ((dx * dx + dz * dz) < (this.bodyRadius * this.bodyRadius)) {
                    return true;
                }
            } else {
                // Circle collider
                const dx = x - obstacle.x;
                const dz = z - obstacle.z;
                const minDist = this.bodyRadius + (obstacle.radius || 0);
                if ((dx * dx + dz * dz) < (minDist * minDist)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check platform surfaces and return the effective ground height.
     * Josh can land on a platform if he's within its XZ bounds and
     * approaching it from above (or standing on it).
     * @param {number} baseTerrainY — ground height from noise terrain
     * @returns {number} effective ground height
     */
    _getEffectiveGround(baseTerrainY) {
        if (!this.platformSurfaces || this.platformSurfaces.length === 0) return baseTerrainY;

        const x = this.model.position.x;
        const z = this.model.position.z;
        const joshY = this.physics.y;
        let best = baseTerrainY;

        for (const plat of this.platformSurfaces) {
            // Check if Josh is within the platform's XZ bounds
            if (x < plat.minX || x > plat.maxX) continue;
            if (z < plat.minZ || z > plat.maxZ) continue;

            // Only count this platform if Josh is above it or at its level
            // (within a small step-up tolerance of 1.2 units from below)
            if (plat.topY > best && joshY >= plat.topY - 1.2) {
                best = plat.topY;
            }
        }

        return best;
    }
}
