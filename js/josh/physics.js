// ============================================================
//  JoshPhysics — vertical movement for Josh's Math Fun World
//  PS1-era parabolic jump with modern game-feel enhancements:
//    • Coyote time (grace period after leaving ground)
//    • Jump buffering (queue jump before landing)
//    • Variable jump height (release early = short hop)
//    • Apex hang-time (reduced gravity near peak for floatiness)
//    • Tuned landing recovery (jumpable during land squash)
//
//  Base arc: peak 3 units, 0.5s to apex
//  g = 2 * jumpHeight / timeToPeak² = 24 u/s²
//  v₀ = √(2 * g * jumpHeight)       = 12 u/s
// ============================================================

const GRAVITY          = 24;     // units / s²
const JUMP_VELOCITY    = 12;     // units / s  (initial upward kick)
const LANDING_TIME     = 0.10;   // seconds the 'landing' state lingers (was 0.15)
const AIR_CONTROL      = 0.45;   // horizontal multiplier while airborne (was 0.3)

// ── game-feel tuning ───────────────────────────────────────────
const COYOTE_TIME      = 0.10;   // seconds after leaving ground where jump still works
const JUMP_BUFFER_TIME = 0.12;   // seconds before landing where jump input is remembered
const JUMP_CUT_MULT    = 0.4;    // multiply vy by this when releasing jump early (variable height)
const APEX_THRESHOLD   = 2.5;    // vy magnitude below which apex hang-time kicks in
const APEX_GRAVITY_MULT= 0.45;   // gravity multiplier during apex hang-time
const FALL_GRAVITY_MULT= 1.35;   // gravity multiplier when falling (snappier descent)

export class JoshPhysics {

    constructor() {
        this.y          = 0;       // current vertical position
        this.vy         = 0;       // vertical velocity
        this.grounded   = true;    // feet on the ground?
        this.landing    = false;   // in the post-land squash window?
        this.landTimer  = 0;       // counts down during landing state

        // ── game-feel state ────────────────────────────────────
        this._coyoteTimer     = 0;  // time left in coyote window
        this._jumpBufferTimer = 0;  // time left in jump buffer
        this._jumpHeld        = false; // is jump button held? (for variable height)
        this._hasJumped       = false; // did we consume grounded state via jump?
        this._justLanded      = false; // flag for landing event (camera, audio, etc.)
        this._landingSpeed    = 0;     // vertical speed at moment of landing (for impact fx)
    }

    // ── jumping ────────────────────────────────────────────────

    /**
     * Buffer a jump request. Actual launch happens in update() when
     * grounded (or still in coyote window).
     */
    tryJump() {
        this._jumpBufferTimer = JUMP_BUFFER_TIME;
    }

    /**
     * Notify physics that the jump button was released.
     * Enables variable jump height (short-hop).
     */
    releaseJump() {
        if (!this.grounded && this.vy > JUMP_VELOCITY * JUMP_CUT_MULT) {
            // Cut upward velocity for a short hop
            this.vy *= JUMP_CUT_MULT;
        }
        this._jumpHeld = false;
    }

    // ── per-frame update ───────────────────────────────────────
    /**
     * Advance the vertical simulation by dt seconds.
     * @param {number} dt          — frame delta in seconds
     * @param {number} terrainY    — ground height beneath Josh
     * @returns {{ y: number, state: string, airControl: number, justLanded: boolean, landingSpeed: number }}
     */
    update(dt, terrainY) {
        this._justLanded = false;

        // ── tick timers ────────────────────────────────────────
        if (this._coyoteTimer > 0) this._coyoteTimer -= dt;
        if (this._jumpBufferTimer > 0) this._jumpBufferTimer -= dt;

        // ── can we jump? (grounded OR coyote OR landing with buffer) ──
        const canJump = (this.grounded || this._coyoteTimer > 0) && !this._hasJumped;
        if (this._jumpBufferTimer > 0 && canJump) {
            // Execute the jump
            this.vy              = JUMP_VELOCITY;
            this.grounded        = false;
            this.landing         = false;
            this.landTimer       = 0;
            this._hasJumped      = true;
            this._jumpHeld       = true;
            this._jumpBufferTimer = 0;
            this._coyoteTimer    = 0;
            return this._result(terrainY, 'rising');
        }

        // — landing squash timer (grounded, absorbing impact) —
        if (this.landing) {
            this.landTimer -= dt;
            if (this.landTimer <= 0) {
                this.landing  = false;
                this.landTimer = 0;
            }
            this.y = terrainY;
            return this._result(terrainY, 'landing');
        }

        // — grounded & not jumping — stick to terrain —
        if (this.grounded) {
            // Track if we walk off a ledge → start coyote timer
            if (this.y > terrainY + 0.1) {
                // Walked off edge — begin falling with coyote time
                this.grounded     = false;
                this._hasJumped   = false;
                this._coyoteTimer = COYOTE_TIME;
                // Fall through to airborne section below
            } else {
                this.y  = terrainY;
                this.vy = 0;
                this._hasJumped = false;
                return this._result(terrainY, 'grounded');
            }
        }

        // — airborne: integrate gravity with apex hang & fast-fall ——
        let effectiveGravity = GRAVITY;
        if (Math.abs(this.vy) < APEX_THRESHOLD && this.vy > 0) {
            // Near apex: reduce gravity for floaty hang-time
            effectiveGravity *= APEX_GRAVITY_MULT;
        } else if (this.vy < 0) {
            // Falling: increase gravity for snappy descent
            effectiveGravity *= FALL_GRAVITY_MULT;
        }

        this.vy -= effectiveGravity * dt;
        this.y  += this.vy * dt;

        // — check for landing —
        if (this.y <= terrainY && this.vy <= 0) {
            this._landingSpeed = Math.abs(this.vy);
            this.y         = terrainY;
            this.vy        = 0;
            this.grounded  = true;
            this.landing   = true;
            this.landTimer = LANDING_TIME;
            this._hasJumped = false;
            this._justLanded = true;

            // If there's a buffered jump, it will fire next frame
            return this._result(terrainY, 'landing');
        }

        const state = this.vy > 0 ? 'rising' : 'falling';
        return this._result(terrainY, state);
    }

    // ── queries ────────────────────────────────────────────────
    isGrounded() {
        return this.grounded;
    }

    getVerticalVelocity() {
        return this.vy;
    }

    /** True for exactly one frame when Josh touches down. */
    didJustLand() {
        return this._justLanded;
    }

    /** Speed at which Josh hit the ground (for impact FX). */
    getLandingSpeed() {
        return this._landingSpeed;
    }

    // ── internal ───────────────────────────────────────────────
    _result(terrainY, state) {
        return {
            y:           this.y,
            state,
            airControl:  (state === 'grounded' || state === 'landing') ? 1.0 : AIR_CONTROL,
            justLanded:  this._justLanded,
            landingSpeed: this._landingSpeed,
        };
    }
}
