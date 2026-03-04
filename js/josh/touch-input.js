/**
 * Mobile touch control system for Josh's Math Fun World.
 *
 * Virtual joystick (left side) for movement, swipe (right side) for camera,
 * tap buttons for interact/jump, pinch for zoom (fractal zones).
 *
 * Mirrors the {@link Input} class interface so the game loop can read
 * the same properties regardless of input source.
 *
 * @module touch-input
 */

/**
 * @class TouchInput
 * @description Full multi-touch input layer with virtual joystick, camera
 *   swipe, action buttons, and pinch-to-zoom.
 */
class TouchInput {

    /* ------------------------------------------------------------------ */
    /*  Static helpers                                                     */
    /* ------------------------------------------------------------------ */

    /**
     * Detect whether the current device supports touch.
     * @returns {boolean}
     */
    static isTouchDevice() {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Constructor                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * @param {HTMLCanvasElement} canvasElement - The game canvas.
     */
    constructor(canvasElement) {
        /** @type {HTMLCanvasElement} */
        this._canvas = canvasElement;

        /* ---------- output properties (match Input class) ---------- */

        /** @type {boolean} */ this.forward  = false;
        /** @type {boolean} */ this.backward = false;
        /** @type {boolean} */ this.left     = false;
        /** @type {boolean} */ this.right    = false;
        /** @type {boolean} */ this.jump     = false;
        /** @type {boolean} */ this.jumpHeld  = false;
        /** @type {boolean} */ this.jumpReleased = false;
        /** @type {boolean} */ this.interact = false;
        /** @type {boolean} */ this.sprint   = false;

        /** @type {number} */ this.mouseDeltaX = 0;
        /** @type {number} */ this.mouseDeltaY = 0;
        /** @type {number} */ this.scrollDelta = 0;

        /* ---------- internal touch tracking ---------- */

        /** @private */ this._joystickTouchId  = null;
        /** @private */ this._cameraTouchId    = null;
        /** @private */ this._pinchTouchIds    = [];
        /** @private */ this._lastPinchDist    = 0;

        /** @private */ this._joystickOrigin   = { x: 0, y: 0 };
        /** @private */ this._joystickCurrent  = { x: 0, y: 0 };
        /** @private */ this._cameraLast       = { x: 0, y: 0 };

        /** @private */ this._jumpEdge     = false;
        /** @private */ this._jumpTouchActive = false;
        /** @private */ this._jumpReleaseEdge = false;
        /** @private */ this._interactEdge = false;

        /** @private */ this._visible = false;
        /** @private */ this._destroyed = false;

        /* ---------- DOM overlay ---------- */

        /** @private */ this._overlay = null;
        /** @private */ this._joystickOuter = null;
        /** @private */ this._joystickInner = null;
        /** @private */ this._jumpBtn = null;
        /** @private */ this._interactBtn = null;

        this._buildUI();
        this._bindEvents();
    }

    /* ------------------------------------------------------------------ */
    /*  DOM creation                                                       */
    /* ------------------------------------------------------------------ */

    /** @private */
    _buildUI() {
        // Root overlay — covers the viewport, fully transparent to game canvas
        const overlay = document.createElement('div');
        _applyStyles(overlay, {
            position:       'fixed',
            inset:          '0',
            zIndex:         '900',          // below retro overlay (z-1000)
            pointerEvents:  'none',         // toggled per-child
            userSelect:     'none',
            webkitUserSelect: 'none',
            touchAction:    'none',
            display:        'none',         // hidden until show()
        });
        overlay.id = 'touch-controls-overlay';

        /* -------- joystick -------- */

        const JOYSTICK_SIZE = 140;
        const KNOB_SIZE     = 56;

        const joystickOuter = document.createElement('div');
        _applyStyles(joystickOuter, {
            position:        'fixed',
            left:            '24px',
            bottom:          '24px',
            width:           `${JOYSTICK_SIZE}px`,
            height:          `${JOYSTICK_SIZE}px`,
            borderRadius:    '50%',
            background:      'rgba(255,255,255,0.12)',
            border:          '2px solid rgba(255,255,255,0.25)',
            pointerEvents:   'auto',
            touchAction:     'none',
            boxSizing:       'border-box',
        });

        const joystickInner = document.createElement('div');
        _applyStyles(joystickInner, {
            position:     'absolute',
            left:         `${(JOYSTICK_SIZE - KNOB_SIZE) / 2}px`,
            top:          `${(JOYSTICK_SIZE - KNOB_SIZE) / 2}px`,
            width:        `${KNOB_SIZE}px`,
            height:       `${KNOB_SIZE}px`,
            borderRadius: '50%',
            background:   'rgba(255,255,255,0.35)',
            pointerEvents:'none',
            transition:   'left 0.04s, top 0.04s',
        });
        joystickOuter.appendChild(joystickInner);
        overlay.appendChild(joystickOuter);

        /* -------- action buttons -------- */

        const BTN_SIZE = 64;

        const jumpBtn = this._makeButton('JUMP', '⬆');
        _applyStyles(jumpBtn, {
            position:     'fixed',
            right:        '24px',
            bottom:       '24px',
            width:        `${BTN_SIZE}px`,
            height:       `${BTN_SIZE}px`,
        });
        overlay.appendChild(jumpBtn);

        const interactBtn = this._makeButton('ACT', '✋');
        _applyStyles(interactBtn, {
            position:     'fixed',
            right:        '24px',
            bottom:       `${24 + BTN_SIZE + 16}px`,
            width:        `${BTN_SIZE}px`,
            height:       `${BTN_SIZE}px`,
        });
        overlay.appendChild(interactBtn);

        /* -------- camera swipe zone (invisible, right half) -------- */
        const cameraZone = document.createElement('div');
        _applyStyles(cameraZone, {
            position:       'fixed',
            top:            '0',
            right:          '0',
            width:          '50%',
            height:         '100%',
            pointerEvents:  'auto',
            touchAction:    'none',
        });
        cameraZone.id = 'touch-camera-zone';
        overlay.appendChild(cameraZone);

        /* -------- store refs -------- */

        document.body.appendChild(overlay);
        this._overlay       = overlay;
        this._joystickOuter = joystickOuter;
        this._joystickInner = joystickInner;
        this._jumpBtn       = jumpBtn;
        this._interactBtn   = interactBtn;
        this._cameraZone    = cameraZone;
    }

    /**
     * Create a round action button.
     * @private
     * @param {string} label
     * @param {string} icon
     * @returns {HTMLDivElement}
     */
    _makeButton(label, icon) {
        const btn = document.createElement('div');
        _applyStyles(btn, {
            borderRadius:    '50%',
            background:      'rgba(255,255,255,0.15)',
            border:          '2px solid rgba(255,255,255,0.3)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexDirection:   'column',
            color:           'rgba(255,255,255,0.8)',
            fontSize:        '22px',
            fontFamily:      'monospace, sans-serif',
            pointerEvents:   'auto',
            touchAction:     'none',
            boxSizing:       'border-box',
            lineHeight:      '1',
        });
        btn.textContent = icon;
        btn.setAttribute('aria-label', label);
        return btn;
    }

    /* ------------------------------------------------------------------ */
    /*  Event binding                                                      */
    /* ------------------------------------------------------------------ */

    /** @private */
    _bindEvents() {
        // Keep references so we can removeEventListener in destroy()
        this._onTouchStart = this._handleTouchStart.bind(this);
        this._onTouchMove  = this._handleTouchMove.bind(this);
        this._onTouchEnd   = this._handleTouchEnd.bind(this);

        // Joystick
        this._joystickOuter.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this._joystickOuter.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
        this._joystickOuter.addEventListener('touchend',   this._onTouchEnd,   { passive: false });
        this._joystickOuter.addEventListener('touchcancel', this._onTouchEnd,  { passive: false });

        // Camera zone
        this._cameraZone.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this._cameraZone.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
        this._cameraZone.addEventListener('touchend',   this._onTouchEnd,   { passive: false });
        this._cameraZone.addEventListener('touchcancel', this._onTouchEnd,  { passive: false });

        // Action buttons
        this._jumpBtn.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this._jumpBtn.addEventListener('touchend',   this._onTouchEnd,   { passive: false });
        this._jumpBtn.addEventListener('touchcancel', this._onTouchEnd,  { passive: false });

        this._interactBtn.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this._interactBtn.addEventListener('touchend',   this._onTouchEnd,   { passive: false });
        this._interactBtn.addEventListener('touchcancel', this._onTouchEnd,  { passive: false });

        // Pinch-to-zoom: listen on the whole overlay so two-finger gestures
        // anywhere are caught.
        this._overlay.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this._overlay.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
        this._overlay.addEventListener('touchend',   this._onTouchEnd,   { passive: false });
        this._overlay.addEventListener('touchcancel', this._onTouchEnd,  { passive: false });
    }

    /* ------------------------------------------------------------------ */
    /*  Touch handlers                                                     */
    /* ------------------------------------------------------------------ */

    /**
     * Route an incoming touch to the correct subsystem.
     * @private
     * @param {TouchEvent} e
     */
    _handleTouchStart(e) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const target = t.target;

            /* -- Jump button -- */
            if (target === this._jumpBtn || this._jumpBtn.contains(target)) {
                this._jumpEdge = true;
                this._jumpTouchActive = true;
                this._highlightBtn(this._jumpBtn);
                continue;
            }

            /* -- Interact button -- */
            if (target === this._interactBtn || this._interactBtn.contains(target)) {
                this._interactEdge = true;
                this._highlightBtn(this._interactBtn);
                continue;
            }

            /* -- Joystick -- */
            if (target === this._joystickOuter || this._joystickOuter.contains(target)) {
                if (this._joystickTouchId === null) {
                    this._joystickTouchId = t.identifier;
                    const rect = this._joystickOuter.getBoundingClientRect();
                    this._joystickOrigin.x = rect.left + rect.width / 2;
                    this._joystickOrigin.y = rect.top  + rect.height / 2;
                    this._joystickCurrent.x = t.clientX;
                    this._joystickCurrent.y = t.clientY;
                }
                continue;
            }

            /* -- Camera zone -- */
            if (target === this._cameraZone || this._cameraZone.contains(target)) {
                if (this._cameraTouchId === null) {
                    this._cameraTouchId = t.identifier;
                    this._cameraLast.x = t.clientX;
                    this._cameraLast.y = t.clientY;
                }
                continue;
            }
        }

        /* -- Pinch detection (any two active touches on overlay) -- */
        this._updatePinchState(e.touches);
    }

    /**
     * @private
     * @param {TouchEvent} e
     */
    _handleTouchMove(e) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];

            /* -- Joystick drag -- */
            if (t.identifier === this._joystickTouchId) {
                this._joystickCurrent.x = t.clientX;
                this._joystickCurrent.y = t.clientY;
                this._updateJoystick();
                continue;
            }

            /* -- Camera drag -- */
            if (t.identifier === this._cameraTouchId) {
                const dx = t.clientX - this._cameraLast.x;
                const dy = t.clientY - this._cameraLast.y;
                this.mouseDeltaX += dx;
                this.mouseDeltaY += dy;
                this._cameraLast.x = t.clientX;
                this._cameraLast.y = t.clientY;
                continue;
            }
        }

        /* -- Pinch zoom -- */
        this._handlePinchMove(e.touches);
    }

    /**
     * @private
     * @param {TouchEvent} e
     */
    _handleTouchEnd(e) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];

            if (t.identifier === this._joystickTouchId) {
                this._joystickTouchId = null;
                this._resetJoystick();
                continue;
            }

            if (t.identifier === this._cameraTouchId) {
                this._cameraTouchId = null;
                continue;
            }
        }

        // Un-highlight buttons on touchend
        this._unhighlightBtn(this._jumpBtn);
        this._jumpTouchActive = false;
        this._jumpReleaseEdge = true;
        this._unhighlightBtn(this._interactBtn);

        this._updatePinchState(e.touches);
    }

    /* ------------------------------------------------------------------ */
    /*  Joystick maths                                                     */
    /* ------------------------------------------------------------------ */

    /** @private */
    _updateJoystick() {
        const OUTER_RADIUS = 70; // half of JOYSTICK_SIZE (140)
        const KNOB_SIZE    = 56;
        const SPRINT_THRESHOLD = 0.70;

        let dx = this._joystickCurrent.x - this._joystickOrigin.x;
        let dy = this._joystickCurrent.y - this._joystickOrigin.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Clamp to outer boundary
        if (dist > OUTER_RADIUS) {
            dx = (dx / dist) * OUTER_RADIUS;
            dy = (dy / dist) * OUTER_RADIUS;
            dist = OUTER_RADIUS;
        }

        // Normalised intensity (0..1)
        const intensity = dist / OUTER_RADIUS;
        const deadzone  = 0.15;

        if (intensity < deadzone) {
            this.forward = this.backward = this.left = this.right = false;
            this.sprint  = false;
        } else {
            // Determine axis from angle
            const angle = Math.atan2(-dy, dx); // -dy because screen-Y is inverted
            // Forward = up on screen
            this.forward  = dy < -dist * 0.38;
            this.backward = dy >  dist * 0.38;
            this.left     = dx < -dist * 0.38;
            this.right    = dx >  dist * 0.38;
            this.sprint   = intensity > SPRINT_THRESHOLD;
        }

        // Move the inner knob visually
        const centerOffset = (140 - KNOB_SIZE) / 2; // (JOYSTICK_SIZE - KNOB_SIZE) / 2
        this._joystickInner.style.left = `${centerOffset + dx}px`;
        this._joystickInner.style.top  = `${centerOffset + dy}px`;
    }

    /** @private */
    _resetJoystick() {
        const JOYSTICK_SIZE = 140;
        const KNOB_SIZE     = 56;
        const center = (JOYSTICK_SIZE - KNOB_SIZE) / 2;
        this._joystickInner.style.left = `${center}px`;
        this._joystickInner.style.top  = `${center}px`;

        this.forward = this.backward = this.left = this.right = false;
        this.sprint  = false;
    }

    /* ------------------------------------------------------------------ */
    /*  Pinch-to-zoom                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * Record current pinch finger ids when exactly 2 touches are present.
     * @private
     * @param {TouchList} touches
     */
    _updatePinchState(touches) {
        if (touches.length === 2) {
            this._pinchTouchIds = [touches[0].identifier, touches[1].identifier];
            this._lastPinchDist = _touchDistance(touches[0], touches[1]);
        } else {
            this._pinchTouchIds = [];
            this._lastPinchDist = 0;
        }
    }

    /**
     * @private
     * @param {TouchList} touches
     */
    _handlePinchMove(touches) {
        if (this._pinchTouchIds.length !== 2 || touches.length < 2) return;

        let a = null;
        let b = null;
        for (let i = 0; i < touches.length; i++) {
            if (touches[i].identifier === this._pinchTouchIds[0]) a = touches[i];
            if (touches[i].identifier === this._pinchTouchIds[1]) b = touches[i];
        }
        if (!a || !b) return;

        const dist = _touchDistance(a, b);
        const delta = dist - this._lastPinchDist;

        // Map pinch delta → scrollDelta (negative = pinch out / zoom in)
        this.scrollDelta += -delta * 3;
        this._lastPinchDist = dist;
    }

    /* ------------------------------------------------------------------ */
    /*  Button visual feedback                                             */
    /* ------------------------------------------------------------------ */

    /** @private */
    _highlightBtn(btn) {
        btn.style.background = 'rgba(255,255,255,0.35)';
    }

    /** @private */
    _unhighlightBtn(btn) {
        btn.style.background = 'rgba(255,255,255,0.15)';
    }

    /* ------------------------------------------------------------------ */
    /*  Public API                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Process accumulated touch state. Call once per frame before reading
     * output properties.
     */
    update() {
        // Edge-triggered buttons: set to true for exactly one frame, then
        // cleared in the next update() or resetDeltas().
        if (this._jumpEdge) {
            this.jump = true;
            this._jumpEdge = false;
        } else {
            this.jump = false;
        }
        this.jumpHeld = this._jumpTouchActive;
        if (this._jumpReleaseEdge) {
            this.jumpReleased = true;
            this._jumpReleaseEdge = false;
        } else {
            this.jumpReleased = false;
        }

        if (this._interactEdge) {
            this.interact = true;
            this._interactEdge = false;
        } else {
            this.interact = false;
        }
    }

    /**
     * Clear per-frame deltas. Call at the END of each frame, matching the
     * Input class contract.
     */
    resetDeltas() {
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.scrollDelta = 0;
    }

    /**
     * @returns {boolean} True if any touch is currently tracked.
     */
    isActive() {
        return (
            this._joystickTouchId !== null ||
            this._cameraTouchId   !== null ||
            this._pinchTouchIds.length > 0
        );
    }

    /**
     * Show the touch control overlay. Does nothing on non-touch devices.
     */
    show() {
        if (!TouchInput.isTouchDevice() || this._destroyed) return;
        this._overlay.style.display = 'block';
        this._visible = true;
    }

    /**
     * Hide the touch control overlay.
     */
    hide() {
        if (this._destroyed) return;
        this._overlay.style.display = 'none';
        this._visible = false;
    }

    /**
     * Remove all event listeners and DOM elements. The instance should not
     * be used after calling destroy().
     */
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        const targets = [
            this._joystickOuter,
            this._cameraZone,
            this._jumpBtn,
            this._interactBtn,
            this._overlay,
        ];

        for (const el of targets) {
            el.removeEventListener('touchstart',  this._onTouchStart);
            el.removeEventListener('touchmove',   this._onTouchMove);
            el.removeEventListener('touchend',     this._onTouchEnd);
            el.removeEventListener('touchcancel',  this._onTouchEnd);
        }

        this._overlay.remove();
    }
}

/* ====================================================================== */
/*  Private helpers                                                        */
/* ====================================================================== */

/**
 * Apply a map of CSS properties to an element.
 * @param {HTMLElement} el
 * @param {Record<string, string>} styles
 */
function _applyStyles(el, styles) {
    for (const key in styles) {
        el.style[key] = styles[key];
    }
}

/**
 * Euclidean distance between two Touch objects.
 * @param {Touch} a
 * @param {Touch} b
 * @returns {number}
 */
function _touchDistance(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

export { TouchInput };
