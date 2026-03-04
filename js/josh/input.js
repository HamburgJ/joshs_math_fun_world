/**
 * Input handler.
 * Tracks keyboard (WASD + arrows) and mouse with pointer lock.
 *
 * Provides both edge-triggered (`jump`) and held (`jumpHeld`) flags
 * to support variable jump height and jump buffering.
 */

export class Input {
    constructor(canvas) {
        this.forward  = false;
        this.backward = false;
        this.left     = false;
        this.right    = false;
        this.jump     = false;       // edge-triggered: true for one frame on press
        this.jumpHeld = false;       // continuous: true while space is held
        this.jumpReleased = false;   // edge-triggered: true for one frame on release
        this.interact = false;
        this.sprint = false;
        this.axisX = 0;
        this.axisY = 0;

        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.scrollDelta = 0;

        this._canvas = canvas;
        this._keys = {};
        this._jumpPressed = false;
        this._interactPressed = false;

        // Keyboard
        window.addEventListener('keydown', (e) => {
            this._keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this._keys[e.code] = false;
        });

        // Pointer lock on click
        canvas.addEventListener('click', () => {
            if (document.pointerLockElement !== canvas) {
                canvas.requestPointerLock();
            }
        });

        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                this.mouseDeltaX += e.movementX;
                this.mouseDeltaY += e.movementY;
            }
        });

        // Scroll wheel (camera distance)
        canvas.addEventListener('wheel', (e) => {
            this.scrollDelta += e.deltaY;
        }, { passive: true });
    }

    /** Call once per frame to read keyboard state and prepare deltas. */
    update() {
        this.forward  = !!(this._keys['KeyW'] || this._keys['ArrowUp']);
        this.backward = !!(this._keys['KeyS'] || this._keys['ArrowDown']);
        this.left     = !!(this._keys['KeyA'] || this._keys['ArrowLeft']);
        this.right    = !!(this._keys['KeyD'] || this._keys['ArrowRight']);
        this.sprint   = !!(this._keys['ShiftLeft'] || this._keys['ShiftRight']);

        // Edge-triggered jump: fire once per press
        const spaceDown = !!(this._keys['Space']);
        this.jump     = spaceDown && !this._jumpPressed;
        this.jumpHeld = spaceDown;
        this.jumpReleased = !spaceDown && this._jumpPressed;
        this._jumpPressed = spaceDown;

        const eDown = !!(this._keys['KeyE']);
        this.interact = eDown && !this._interactPressed;
        this._interactPressed = eDown;
    }

    /** Call at the END of each frame to reset per-frame mouse deltas. */
    resetDeltas() {
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.scrollDelta = 0;
    }
}
