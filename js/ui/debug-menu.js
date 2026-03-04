/**
 * DebugMenu — teleport to any zone from a retro overlay panel.
 *
 * Toggle with backtick (`). Click any zone name to warp there instantly.
 * Shows Josh's position, current zone, and FPS. Pure vanilla JS, inline
 * styles, no external CSS.
 *
 * Shell Bingby says: "Debug menus are for geniuses who don't waste time walking."
 */

const GREEN  = '#00FF41';
const DIM    = '#009926';
const BLACK  = '#0a0a0a';
const OVERLAY_BG = 'rgba(0, 4, 2, 0.92)';

const ZONE_LABELS = {
    green_field:         '🌿  Green Field (Hub)',
    coordinate_plane:    '📐  Coordinate Plane',
    wireframe_void:      '🕸️  Wireframe Void',
    non_euclidean:       '🔮  Non-Euclidean',
    fractal_boundary:    '🦋  Fractal Boundary',
    number_caverns:      '⛏️   Number Caverns',
};

export class DebugMenu {
    /**
     * @param {object} deps
     * @param {import('../josh/josh.js').Josh} deps.josh
     * @param {import('../zones/zone-registry.js').ZoneRegistry} deps.registry
     * @param {import('../zones/zone-transitions.js').ZoneTransitionManager} deps.transitions
     * @param {import('../shifts/shift-manager.js').ShiftManager} deps.shiftManager
     * @param {THREE.Group} deps.fieldGroup
     * @param {import('../shifts/world-state.js')} deps.greenFieldState
     * @param {import('./scene-editor.js').SceneEditor|null} [deps.sceneEditor]
     */
        constructor({ josh, registry, transitions, shiftManager, fieldGroup, greenFieldState, sceneEditor = null }) {
        this._josh         = josh;
        this._registry     = registry;
        this._transitions  = transitions;
        this._shiftManager = shiftManager;
        this._fieldGroup   = fieldGroup;
        this._greenFieldState = greenFieldState;
            this._sceneEditor = sceneEditor;

        this._visible = false;
        this._raf = null;
        this._posEl = null;
        this._zoneEl = null;
        this._buttons = new Map();
        this._editorBtn = null;

        this._buildDOM();
        this._attachKeys();
    }

    /* ── public ──────────────────────────────────────────────── */

    open() {
        if (this._visible) return;
        this._visible = true;
        this._overlay.style.display = 'flex';
        this._startTicker();
        this._highlightActive();
        this._syncEditorButton();
    }

    close() {
        if (!this._visible) return;
        this._visible = false;
        this._overlay.style.display = 'none';
        this._stopTicker();
    }

    toggle() { this._visible ? this.close() : this.open(); }
    isOpen()  { return this._visible; }

    /* ── DOM ─────────────────────────────────────────────────── */

    _buildDOM() {
        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'debug-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            background: OVERLAY_BG,
            zIndex: '99999',
            fontFamily: "'Courier New', monospace",
            color: GREEN,
        });
        // Close on overlay bg click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // Panel
        const panel = document.createElement('div');
        Object.assign(panel.style, {
            background: BLACK,
            border: `2px solid ${GREEN}`,
            borderRadius: '4px',
            padding: '20px 28px',
            minWidth: '340px',
            maxWidth: '440px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: `0 0 30px ${DIM}, inset 0 0 60px rgba(0,255,65,0.03)`,
        });

        // Title
        const title = document.createElement('div');
        title.textContent = '[ DEBUG  MODE ]';
        Object.assign(title.style, {
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '4px',
            letterSpacing: '4px',
            color: GREEN,
            textShadow: `0 0 8px ${GREEN}`,
        });
        panel.appendChild(title);

        // Subtitle
        const sub = document.createElement('div');
        sub.textContent = 'press `  to close';
        Object.assign(sub.style, {
            textAlign: 'center',
            fontSize: '11px',
            color: DIM,
            marginBottom: '14px',
        });
        panel.appendChild(sub);

        // Status bar
        const status = document.createElement('div');
        Object.assign(status.style, {
            background: 'rgba(0,255,65,0.06)',
            border: `1px solid ${DIM}`,
            borderRadius: '2px',
            padding: '8px 10px',
            marginBottom: '14px',
            fontSize: '12px',
            lineHeight: '1.6',
        });

        this._zoneEl = document.createElement('div');
        this._zoneEl.textContent = 'Zone: ...';
        status.appendChild(this._zoneEl);

        this._posEl = document.createElement('div');
        this._posEl.textContent = 'Pos: ...';
        status.appendChild(this._posEl);

        panel.appendChild(status);

        // Section header
        const header = document.createElement('div');
        header.textContent = '── TELEPORT ──';
        Object.assign(header.style, {
            textAlign: 'center',
            fontSize: '13px',
            color: DIM,
            marginBottom: '8px',
            letterSpacing: '2px',
        });
        panel.appendChild(header);

        // Zone buttons
        const list = document.createElement('div');
        Object.assign(list.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
        });

        const allZones = ['green_field', ...Object.keys(ZONE_LABELS).filter(k => k !== 'green_field')];
        for (const key of allZones) {
            const btn = document.createElement('button');
            btn.textContent = ZONE_LABELS[key] || key;
            btn.dataset.zone = key;
            Object.assign(btn.style, {
                background: 'transparent',
                border: `1px solid ${DIM}`,
                borderRadius: '2px',
                color: GREEN,
                fontFamily: "'Courier New', monospace",
                fontSize: '13px',
                padding: '6px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(0,255,65,0.12)';
                btn.style.borderColor = GREEN;
                btn.style.textShadow = `0 0 6px ${GREEN}`;
            });
            btn.addEventListener('mouseleave', () => {
                if (this._registry.activeZone !== key) {
                    btn.style.background = 'transparent';
                    btn.style.borderColor = DIM;
                    btn.style.textShadow = 'none';
                }
            });
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._teleportTo(key);
            });

            this._buttons.set(key, btn);
            list.appendChild(btn);
        }

        panel.appendChild(list);

        // Tools header
        const toolsHeader = document.createElement('div');
        toolsHeader.textContent = '── TOOLS ──';
        Object.assign(toolsHeader.style, {
            textAlign: 'center',
            fontSize: '13px',
            color: DIM,
            marginTop: '12px',
            marginBottom: '8px',
            letterSpacing: '2px',
        });
        panel.appendChild(toolsHeader);

        // Scene editor toggle
        const editorBtn = document.createElement('button');
        Object.assign(editorBtn.style, {
            width: '100%',
            background: 'transparent',
            border: `1px solid ${DIM}`,
            borderRadius: '2px',
            color: GREEN,
            fontFamily: "'Courier New', monospace",
            fontSize: '13px',
            padding: '6px 12px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
        });
        editorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleSceneEditor();
        });
        this._editorBtn = editorBtn;
        this._syncEditorButton();
        panel.appendChild(editorBtn);

        // Keyboard shortcut hint
        const hint = document.createElement('div');
        hint.textContent = 'Tip: also works while paused';
        Object.assign(hint.style, {
            textAlign: 'center',
            fontSize: '10px',
            color: DIM,
            marginTop: '12px',
            fontStyle: 'italic',
        });
        panel.appendChild(hint);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        this._overlay = overlay;
    }

    /* ── key binding ─────────────────────────────────────────── */

    _attachKeys() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            }
        });
    }

    /* ── teleport ────────────────────────────────────────────── */

    _teleportTo(zoneKey) {
        if (this._transitions.isTransitioning) return;

        const current = this._registry.activeZone;
        if (zoneKey === current) {
            this.close();
            return;
        }

        if (zoneKey === 'green_field') {
            // Green field is special — not in the registry
            const prevZone = this._registry.activeZone;
            this._registry.setActiveZone('green_field', this._fieldGroup);
            this._shiftManager.pushHistory();
            this._shiftManager.beginTransition(this._greenFieldState, 0.3, 'crossfade');
            this._josh.model.position.set(0, 0, 10);
            this._josh.colliders = this._fieldGroup.userData.colliders || [];
            if (this._transitions.onTransition) {
                this._transitions.onTransition(prevZone, 'green_field');
            }
        } else {
            // Use goTo which handles everything (transition, reposition, callbacks)
            this._transitions.goTo(zoneKey, 'crossfade', 0.3);
        }

        this.close();
    }

    /* ── live status ticker ──────────────────────────────────── */

    _startTicker() {
        const tick = () => {
            if (!this._visible) return;
            const pos = this._josh.getPosition();
            this._posEl.textContent = `Pos:  x=${pos.x.toFixed(1)}  y=${pos.y.toFixed(1)}  z=${pos.z.toFixed(1)}`;
            this._zoneEl.textContent = `Zone: ${this._registry.activeZone}`;
            this._highlightActive();
            this._syncEditorButton();
            this._raf = requestAnimationFrame(tick);
        };
        tick();
    }

    _stopTicker() {
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = null;
    }

    _highlightActive() {
        const active = this._registry.activeZone;
        for (const [key, btn] of this._buttons) {
            if (key === active) {
                btn.style.background = 'rgba(0,255,65,0.18)';
                btn.style.borderColor = GREEN;
                btn.style.textShadow = `0 0 6px ${GREEN}`;
            } else {
                btn.style.background = 'transparent';
                btn.style.borderColor = DIM;
                btn.style.textShadow = 'none';
            }
        }
    }

    _toggleSceneEditor() {
        if (!this._sceneEditor) return;
        this._sceneEditor.toggle();
        this._syncEditorButton();
    }

    _syncEditorButton() {
        if (!this._editorBtn) return;
        if (!this._sceneEditor) {
            this._editorBtn.textContent = '🛠️  Scene Editor (Unavailable)';
            this._editorBtn.style.borderColor = DIM;
            this._editorBtn.style.textShadow = 'none';
            this._editorBtn.style.background = 'transparent';
            this._editorBtn.disabled = true;
            this._editorBtn.style.opacity = '0.6';
            this._editorBtn.style.cursor = 'not-allowed';
            return;
        }

        const open = this._sceneEditor.isOpen();
        this._editorBtn.disabled = false;
        this._editorBtn.style.opacity = '1';
        this._editorBtn.style.cursor = 'pointer';
        this._editorBtn.textContent = open
            ? '🛠️  Scene Editor: ON (click to close)'
            : '🛠️  Scene Editor: OFF (click to open)';
        this._editorBtn.style.background = open ? 'rgba(0,255,65,0.18)' : 'transparent';
        this._editorBtn.style.borderColor = open ? GREEN : DIM;
        this._editorBtn.style.textShadow = open ? `0 0 6px ${GREEN}` : 'none';
    }
}
