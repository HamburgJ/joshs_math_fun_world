/**
 * Procedural bone animation system for Josh.
 * All animation is sine-wave / lerp / keyframe driven — no skeletal data.
 * The caller controls timing (e.g. 15 fps for PS1 choppiness).
 *
 * Enhancements:
 *   • Squash & stretch on landing / jumping
 *   • Adaptive blend speed (faster for snappy state changes)
 *   • Body scale modulation for impact feel
 */

// ---- helpers ----
function lerp(a, b, t) { return a + (b - a) * t; }

/** Blend speed per state — some transitions should be snappier than others. */
const STATE_BLEND_SPEED = {
    idle:      0.25,
    walk:      0.3,
    run:       0.35,
    jump_up:   0.5,   // snap into jump pose fast
    jump_fall: 0.35,
    land:      0.55,  // snap into landing fast for impact
    interact:  0.3,
    sit:       0.25,
    pickup:    0.3,
    hold_idle: 0.25,
    look_around: 0.25,
};

/**
 * Lerp-snap a bone's rotation axis toward a target value.
 * Uses state-dependent blend speed for that choppy-but-responsive PS1 feel.
 */
function snapAxis(bone, axis, target, blendT = 0.3) {
    bone.rotation[axis] = lerp(bone.rotation[axis], target, blendT);
}

// ---- state definitions ----

/**
 * Every state function receives (bones, t, stateTime) and returns
 * a target-pose object:  { boneName: { x, y, z }, ... }
 * Only axes that matter need to be specified; missing axes default to 0.
 */
const STATES = {

    // --- IDLE ---------------------------------------------------------
    idle(bones, t, stateTime) {
        const breathe = Math.sin(t * 2) * 0.03;
        const headTilt = Math.sin(t * 0.7) * 0.05;
        return {
            body:              { _y: breathe },
            head:              { x: headTilt },
            leftArmGroup:      { x: 0 },
            rightArmGroup:     { x: 0 },
            leftLowerArmGroup: { x: 0 },
            rightLowerArmGroup:{ x: 0 },
            leftLegGroup:      { x: 0 },
            rightLegGroup:     { x: 0 },
            leftLowerLegGroup: { x: 0 },
            rightLowerLegGroup:{ x: 0 },
        };
    },

    // --- WALK ---------------------------------------------------------
    walk(bones, t, stateTime) {
        const phase = t * 8;
        const bounce = Math.sin(phase * 2) * 0.04;
        const legSwing = Math.sin(phase) * 0.5;
        const armSwing = Math.sin(phase) * 0.3;
        const lowerArmSwing = Math.sin(phase) * 0.2;
        // knees bend backwards (negative x) when leg swings forward (-x rotation on thigh)
        const leftKnee  = legSwing > 0 ? -legSwing * 0.6 : 0;
        const rightKnee = -legSwing > 0 ? legSwing * 0.6 : 0;
        // Subtle torso twist adds life to walk cycle
        const torsoTwist = Math.sin(phase) * 0.04;
        return {
            body:              { _y: bounce, y: torsoTwist },
            head:              { x: 0 },
            leftArmGroup:      { x:  armSwing },
            rightArmGroup:     { x: -armSwing },
            // elbows bend forwards (positive x)
            leftLowerArmGroup: { x: Math.abs(lowerArmSwing) },
            rightLowerArmGroup:{ x: Math.abs(lowerArmSwing) },
            leftLegGroup:      { x: -legSwing },
            rightLegGroup:     { x:  legSwing },
            leftLowerLegGroup: { x:  leftKnee },
            rightLowerLegGroup:{ x:  rightKnee },
        };
    },

    // --- RUN ----------------------------------------------------------
    run(bones, t, stateTime) {
        const phase = t * 12;
        const bounce = Math.sin(phase * 2) * 0.07;
        const legSwing = Math.sin(phase) * 0.7;
        const armSwing = Math.sin(phase) * 0.5;
        const lowerArm = Math.sin(phase) * 0.35;
        const leftKnee  = legSwing > 0 ? -legSwing * 0.7 : 0;
        const rightKnee = -legSwing > 0 ? legSwing * 0.7 : 0;
        // Forward lean + torso twist for run energy
        const torsoTwist = Math.sin(phase) * 0.06;
        const forwardLean = -0.08; // leans forward (-x)
        return {
            body:              { _y: bounce, y: torsoTwist, _rx: forwardLean },
            head:              { x: -forwardLean * 0.5 },
            leftArmGroup:      { x:  armSwing },
            rightArmGroup:     { x: -armSwing },
            leftLowerArmGroup: { x: Math.abs(lowerArm) + 0.3 },
            rightLowerArmGroup:{ x: Math.abs(lowerArm) + 0.3 },
            leftLegGroup:      { x: -legSwing },
            rightLegGroup:     { x:  legSwing },
            leftLowerLegGroup: { x:  leftKnee },
            rightLowerLegGroup:{ x:  rightKnee },
        };
    },

    // --- JUMP_UP ------------------------------------------------------
    jump_up(bones, t, stateTime) {
        const progress = Math.min(stateTime / 0.25, 1); // 0→1 over 0.25s
        // Immediate tuck then extend — feels punchy
        let legBend, armRaise, bodyDip, bodyStretch;
        if (progress < 0.3) {
            // Quick crouch phase (anticipation)
            const p = progress / 0.3;
            const ease = p * p; // ease-in for snap
            legBend     = ease * 0.5; // positive is backwards? We want thighs forward (-), knees back (-)
            armRaise    = 0;
            bodyDip     = -ease * 0.12;
            bodyStretch = 1 - ease * 0.08; // slight squash
        } else {
            // Extension phase (launch)
            const p = (progress - 0.3) / 0.7;
            const ease = 1 - (1 - p) * (1 - p); // ease-out
            legBend     = (1 - ease) * 0.5;
            armRaise    = -ease * 1.2; // arms up (-x)
            bodyDip     = -(1 - ease) * 0.12;
            bodyStretch = 1 + ease * 0.06; // slight vertical stretch
        }
        return {
            body:              { _y: bodyDip, _scaleY: bodyStretch },
            head:              { x: -0.12 },
            leftArmGroup:      { x: armRaise, z:  0.25 },
            rightArmGroup:     { x: armRaise, z: -0.25 },
            leftLowerArmGroup: { x: 0 },
            rightLowerArmGroup:{ x: 0 },
            leftLegGroup:      { x: -legBend }, // thighs go forward
            rightLegGroup:     { x: -legBend },
            leftLowerLegGroup: { x:  legBend * 2.0 }, // knees bend backward to keep feet under center
            rightLowerLegGroup:{ x:  legBend * 2.0 }, // Wait, if thigh goes forward (-), lower leg needs positive X rotation to point down! Yes, positive X rotates toward +Z (backward), countering the forward thigh.
        };
    },

    // --- JUMP_FALL ----------------------------------------------------
    jump_fall(bones, t, stateTime) {
        return {
            body:              { _y: 0 },
            head:              { x: 0.1 },
            leftArmGroup:      { x: 0, z:  0.8 },
            rightArmGroup:     { x: 0, z: -0.8 },
            leftLowerArmGroup: { x: Math.abs(-0.2) }, // bend forward
            rightLowerArmGroup:{ x: Math.abs(-0.2) },
            leftLegGroup:      { x: -0.15 }, // thigh forward
            rightLegGroup:     { x: -0.15 },
            leftLowerLegGroup: { x:  0.25 }, // knee backwards
            rightLowerLegGroup:{ x:  0.25 },
        };
    },

    // --- LAND ---------------------------------------------------------
    land(bones, t, stateTime) {
        const progress = Math.min(stateTime / 0.12, 1);
        // Snappy ease-out for impactful landing
        const ease = 1 - (1 - progress) * (1 - progress);
        const crouch = (1 - ease) * 0.5;
        // Squash on impact, recover to normal
        const squash = 1 - (1 - ease) * 0.12;  // < 1 = squashed
        const armFlair = (1 - ease) * 0.4;      // arms flare out on impact
        return {
            body:              { _y: -crouch * 0.25, _scaleY: squash },
            head:              { x: crouch * 0.2 },
            leftArmGroup:      { x: 0, z:  armFlair },
            rightArmGroup:     { x: 0, z: -armFlair },
            leftLowerArmGroup: { x: 0 },
            rightLowerArmGroup:{ x: 0 },
            leftLegGroup:      { x: -crouch }, // crouch forward thigh
            rightLegGroup:     { x: -crouch },
            leftLowerLegGroup: { x:  crouch * 1.5 }, // bend knees backward
            rightLowerLegGroup:{ x:  crouch * 1.5 },
        };
    },

    // --- INTERACT -----------------------------------------------------
    interact(bones, t, stateTime) {
        const dur = 0.6; // total: reach 0.15 + hold 0.3 + return 0.15
        const p = Math.min(stateTime / dur, 1);
        let shoulder, elbow;
        if (p < 0.25) {
            const q = p / 0.25;
            shoulder = -q * 0.8;
            elbow    = q * 0.5; // positive for elbow
        } else if (p < 0.75) {
            shoulder = -0.8;
            elbow    = 0.5;
        } else {
            const q = (p - 0.75) / 0.25;
            shoulder = -(1 - q) * 0.8;
            elbow    = (1 - q) * 0.5;
        }
        return {
            body:              { _y: 0 },
            head:              { x: -0.1 },
            leftArmGroup:      { x: 0 },
            rightArmGroup:     { x: shoulder },
            leftLowerArmGroup: { x: 0 },
            rightLowerArmGroup:{ x: elbow },
            leftLegGroup:      { x: 0 },
            rightLegGroup:     { x: 0 },
            leftLowerLegGroup: { x: 0 },
            rightLowerLegGroup:{ x: 0 },
        };
    },

    // --- SIT ----------------------------------------------------------
    sit(bones, t, stateTime) {
        const breathe = Math.sin(t * 2) * 0.02;
        return {
            body:              { _y: -0.35 + breathe },
            head:              { x: Math.sin(t * 0.5) * 0.04 },
            leftArmGroup:      { x: 0 },
            rightArmGroup:     { x: 0 },
            leftLowerArmGroup: { x: 0.3 }, // elbows forward
            rightLowerArmGroup:{ x: 0.3 },
            leftLegGroup:      { x: -1.5 }, // thighs forward roughly 90deg
            rightLegGroup:     { x: -1.5 },
            leftLowerLegGroup: { x:  1.5 }, // knees down
            rightLowerLegGroup:{ x:  1.5 },
        };
    },

    // --- PICKUP -------------------------------------------------------
    pickup(bones, t, stateTime) {
        const dur = 0.8;
        const p = Math.min(stateTime / dur, 1);
        let bodyTilt, armReach, elbowBend;
        if (p < 0.4) {
            // bend down
            const q = p / 0.4;
            bodyTilt  = -q * 0.5; // Negative to lean forward! A positive rotation goes BACKWARD!
            armReach  = -q * 1.2;
            elbowBend = q * 0.4;
        } else if (p < 0.6) {
            bodyTilt  = -0.5;
            armReach  = -1.2;
            elbowBend = 0.4;
        } else {
            // come back up, left arm stays forward
            const q = (p - 0.6) / 0.4;
            bodyTilt  = -(1 - q) * 0.5;
            armReach  = -(1 - q) * 1.2;
            elbowBend = (1 - q) * 0.4;
        }
        return {
            body:              { _y: 0, _rx: bodyTilt },
            head:              { x: -bodyTilt * 0.5 }, // head tilts up to look forward? Yes, positive is up relative to body. Wait, -bodyTilt would be positive! Yes.
            leftArmGroup:      { x: armReach },
            rightArmGroup:     { x: armReach },
            leftLowerArmGroup: { x: elbowBend },
            rightLowerArmGroup:{ x: elbowBend },
            leftLegGroup:      { x: 0 },
            rightLegGroup:     { x: 0 },
            leftLowerLegGroup: { x: 0 },
            rightLowerLegGroup:{ x: 0 },
        };
    },

    // --- HOLD_IDLE ----------------------------------------------------
    hold_idle(bones, t, stateTime) {
        const breathe = Math.sin(t * 2) * 0.03;
        const headTilt = Math.sin(t * 0.7) * 0.05;
        return {
            body:              { _y: breathe },
            head:              { x: headTilt },
            leftArmGroup:      { x: -0.5 },
            rightArmGroup:     { x: 0 },
            leftLowerArmGroup: { x: 0.3 },
            rightLowerArmGroup:{ x: 0 },
            leftLegGroup:      { x: 0 },
            rightLegGroup:     { x: 0 },
            leftLowerLegGroup: { x: 0 },
            rightLowerLegGroup:{ x: 0 },
        };
    },

    // --- LOOK_AROUND --------------------------------------------------
    look_around(bones, t, stateTime) {
        // total ≈ 2.0s : left 0.3 → hold 0.4 → right 0.6 → hold 0.4 → center 0.3
        const breathe = Math.sin(t * 2) * 0.03;
        let headY = 0;
        if (stateTime < 0.3) {
            headY = (stateTime / 0.3) * 0.5;
        } else if (stateTime < 0.7) {
            headY = 0.5;
        } else if (stateTime < 1.3) {
            headY = 0.5 - ((stateTime - 0.7) / 0.6) * 1.0; // 0.5 → -0.5
        } else if (stateTime < 1.7) {
            headY = -0.5;
        } else if (stateTime < 2.0) {
            headY = -0.5 + ((stateTime - 1.7) / 0.3) * 0.5;
        }
        return {
            body:              { _y: breathe },
            head:              { y: headY },
            leftArmGroup:      { x: 0 },
            rightArmGroup:     { x: 0 },
            leftLowerArmGroup: { x: 0 },
            rightLowerArmGroup:{ x: 0 },
            leftLegGroup:      { x: 0 },
            rightLegGroup:     { x: 0 },
            leftLowerLegGroup: { x: 0 },
            rightLowerLegGroup:{ x: 0 },
        };
    },
};

// ---- AnimationManager -----------------------------------------------

export class AnimationManager {
    /**
     * @param {THREE.Group} model – the top-level 'josh' group returned by createJosh()
     */
    constructor(model) {
        this._state     = 'idle';
        this._prevState = 'idle';
        this._time      = 0;       // global elapsed time (for sine waves)
        this._stateTime = 0;       // time spent in current state

        // Cache named bones (groups & meshes we need to animate)
        this.bones = {};
        const names = [
            'body', 'head',
            'leftArmGroup', 'rightArmGroup',
            'leftLowerArmGroup', 'rightLowerArmGroup',
            'leftLegGroup', 'rightLegGroup',
            'leftLowerLegGroup', 'rightLowerLegGroup',
        ];
        for (const name of names) {
            const obj = model.getObjectByName(name);
            if (obj) this.bones[name] = obj;
        }

        // Store body's rest Y so we can add offsets on top
        this._bodyRestY = this.bones.body ? this.bones.body.position.y : 0;
    }

    /** Switch to a new animation state. */
    setState(stateName) {
        if (!(stateName in STATES)) {
            console.warn(`AnimationManager: unknown state "${stateName}"`);
            return;
        }
        if (stateName !== this._state) {
            this._prevState = this._state;
            this._state     = stateName;
            this._stateTime = 0;
        }
    }

    /** Returns the current animation state name. */
    getState() {
        return this._state;
    }

    /**
     * Advance time and apply bone rotations.
     * Call this at whatever frequency you like (15 fps for PS1 chop, etc.).
     * @param {number} dt – delta time in seconds since last call
     */
    update(dt) {
        this._time      += dt;
        this._stateTime += dt;

        const fn   = STATES[this._state];
        const pose = fn(this.bones, this._time, this._stateTime);

        // Get blend speed for current state
        const blendT = STATE_BLEND_SPEED[this._state] || 0.3;

        for (const [boneName, target] of Object.entries(pose)) {
            const bone = this.bones[boneName];
            if (!bone) continue;

            // Special keys: _y = positional Y offset, _rx = body tilt
            if ('_y' in target && bone.position) {
                bone.position.y = lerp(bone.position.y, this._bodyRestY + target._y, blendT);
            }
            if ('_rx' in target) {
                snapAxis(bone, 'x', target._rx, blendT);
            }

            // Squash & stretch: _scaleY modulates body Y scale
            if ('_scaleY' in target && bone.scale) {
                const targetSY = target._scaleY;
                bone.scale.y = lerp(bone.scale.y, targetSY, blendT);
                // Compensate X/Z to preserve volume (approximate)
                const invSqrt = 1 / Math.sqrt(targetSY);
                bone.scale.x = lerp(bone.scale.x, invSqrt, blendT);
                bone.scale.z = lerp(bone.scale.z, invSqrt, blendT);
            } else if (bone.scale && boneName === 'body') {
                // Return to normal scale when no squash/stretch specified
                bone.scale.x = lerp(bone.scale.x, 1, blendT);
                bone.scale.y = lerp(bone.scale.y, 1, blendT);
                bone.scale.z = lerp(bone.scale.z, 1, blendT);
            }

            // Standard rotational axes
            if ('x' in target) snapAxis(bone, 'x', target.x, blendT);
            if ('y' in target) snapAxis(bone, 'y', target.y, blendT);
            if ('z' in target) snapAxis(bone, 'z', target.z, blendT);

            // Zero out unspecified axes (so limbs return to rest)
            if (!('x' in target) && !('_rx' in target)) snapAxis(bone, 'x', 0, blendT);
            if (!('y' in target)) snapAxis(bone, 'y', 0, blendT);
            if (!('z' in target)) snapAxis(bone, 'z', 0, blendT);
        }
    }
}
