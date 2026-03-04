const fs = require('fs');
let code = fs.readFileSync('js/josh/input.js', 'utf8');

const updateMatch = /update\(\) \{[\s\S]*?this\._interactPressed = eDown;\n    \}/;

const newUpdate = `update() {
        this.forward  = !!(this._keys['KeyW'] || this._keys['ArrowUp']);
        this.backward = !!(this._keys['KeyS'] || this._keys['ArrowDown']);
        this.left     = !!(this._keys['KeyA'] || this._keys['ArrowLeft']);
        this.right    = !!(this._keys['KeyD'] || this._keys['ArrowRight']);
        this.sprint   = !!(this._keys['ShiftLeft'] || this._keys['ShiftRight']);
        
        let spaceDown = !!(this._keys['Space']);
        let eDown = !!(this._keys['KeyE']);

        this.axisX = 0;
        this.axisY = 0;

        // Gamepad Support
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (gp) {
                // Left Stick
                if (Math.abs(gp.axes[0]) > 0.1) {
                    this.axisX = gp.axes[0];
                    this.right = this.axisX > 0;
                    this.left = this.axisX < 0;
                }
                if (Math.abs(gp.axes[1]) > 0.1) {
                    this.axisY = gp.axes[1];
                    this.backward = this.axisY > 0;
                    this.forward = this.axisY < 0;
                }
                // Right stick camera
                if (Math.abs(gp.axes[2]) > 0.1) this.mouseDeltaX += gp.axes[2] * 20;
                if (Math.abs(gp.axes[3]) > 0.1) this.mouseDeltaY += gp.axes[3] * 20;

                // Buttons
                if (gp.buttons[0] && gp.buttons[0].pressed) spaceDown = true; // A button / Cross
                if (gp.buttons[2] && gp.buttons[2].pressed) eDown = true; // X button / Square (Interact)
                if (gp.buttons[1] && gp.buttons[1].pressed) this.sprint = true; // B button / Circle
                if (gp.buttons[6] && gp.buttons[6].pressed) this.sprint = true; // L2 trigger
                if (gp.buttons[7] && gp.buttons[7].pressed) this.sprint = true; // R2 trigger
            }
        }

        this.jump     = spaceDown && !this._jumpPressed;
        this.jumpHeld = spaceDown;
        this.jumpReleased = !spaceDown && this._jumpPressed;
        this._jumpPressed = spaceDown;
        this.interact = eDown && !this._interactPressed;
        this._interactPressed = eDown;
    }`;

code = code.replace(updateMatch, newUpdate);
code = code.replace(/this\.sprint\s*=\s*false;/, 'this.sprint = false;\n        this.axisX = 0;\n        this.axisY = 0;');
fs.writeFileSync('js/josh/input.js', code, 'utf8');