import { globalEventBus, EVENTS } from '../events/event-bus.js';

/**
 * Manages the heads-up display logic so we aren't query-selecting
 * and manipulating DOM continuously in the high-frequency WebGL game loop.
 */
export class HUDManager {
    constructor() {
        this._elements = {
            interact: document.getElementById('hud-interact'),
            zone: document.getElementById('hud-zone'),
            examine: document.getElementById('hud-examine'),
            hint: document.getElementById('hud-hint')
        };

        this._zoneTimer = null;
        this._examineTimer = null;
        this._hintTimer = null;

        // Custom Event for Interactions
        globalEventBus.on(EVENTS.UI_UPDATE_HUD, this._handleHUDUpdate.bind(this));
        
        // Listen to native events (if you want to trigger hints or zones without GameLoop)
    }

    _handleHUDUpdate(data) {
        if (!this._elements.interact) return;

        if (data.interactLabel) {
            this._elements.interact.textContent = `[ E ] ${data.interactLabel}`;
            this._elements.interact.classList.add('visible');
        } else {
            this._elements.interact.classList.remove('visible');
        }
    }

    showZoneName(zoneId) {
        if (!this._elements.zone) return;

        // Format name
        const displayName = zoneId.split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

        this._elements.zone.textContent = displayName;
        this._elements.zone.classList.remove('fade-out');
        this._elements.zone.classList.add('visible');

        if (this._zoneTimer) clearTimeout(this._zoneTimer);
        this._zoneTimer = setTimeout(() => {
            this._elements.zone.classList.add('fade-out');
            setTimeout(() => this._elements.zone.classList.remove('visible', 'fade-out'), 1000);
        }, 4000);
    }

    showExamineText(text, duration = 3000) {
        if (!this._elements.examine) return;
        this._elements.examine.textContent = text;
        this._elements.examine.classList.add('visible');

        if (this._examineTimer) clearTimeout(this._examineTimer);
        this._examineTimer = setTimeout(() => {
            this._elements.examine.classList.remove('visible');
        }, duration);
    }

    showHint(text, duration = 4000) {
        if (!this._elements.hint) return;
        this._elements.hint.textContent = text;
        this._elements.hint.classList.add('visible');

        if (this._hintTimer) clearTimeout(this._hintTimer);
        this._hintTimer = setTimeout(() => {
            this._elements.hint.classList.remove('visible');
        }, duration);
    }
}
