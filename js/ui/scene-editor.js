import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const STORAGE_KEY = 'jmfw_scene_layout_v1';
const BACKUP_KEY = 'jmfw_scene_layout_backups_v1';
const MAX_BACKUPS = 20;

export class SceneEditor {
    constructor({ scene, camera, renderer }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this._open = false;
        this._dragging = false;
        this._mouseLookActive = false;
        this._mouseLookEnabled = true;
        this._lookDeltaX = 0;
        this._lookDeltaY = 0;
        this._yaw = 0;
        this._pitch = 0;

        this._transformSpace = 'world';
        this._moveSnapEnabled = true;
        this._moveSnapStep = 0.25;
        this._moveNudgeStep = 0.25;

        this._moveKeys = {
            forward: false,
            back: false,
            left: false,
            right: false,
            up: false,
            down: false,
            fast: false,
        };

        this._baseFlySpeed = 16;
        this._lookSensitivity = 0.0024;

        this._raycaster = new THREE.Raycaster();
        this._pointer = new THREE.Vector2();

        this._editableEntries = [];
        this._keyToObject = new Map();
        this._objectToKey = new WeakMap();

        this._selected = null;
        this._selectedKey = null;

        this._draft = new Map();
        this._baseline = new Map();

        this._buildUI();
        this._setupTransformControls();
        this._bindGlobalKeys();
        this._bindPointerPicking();
        this._syncCameraAnglesFromCurrent();
        this.refreshObjects();
    }

    isOpen() {
        return this._open;
    }

    update(dt = 1 / 60) {
        if (!this._open) return;
        this._updateFlyCamera(dt);
        if (this._selected) {
            this._syncInputsFromObject();
        }
    }

    open() {
        if (this._open) return;
        this._open = true;
        this._root.style.display = 'block';
        this._syncCameraAnglesFromCurrent();
        this._applyTransformSettings();
        this._updateMouseLookButton();
        this.refreshObjects();
        this._setStatus('Editor open. Objects can be moved in draft mode.');
        document.exitPointerLock?.();
    }

    close() {
        if (!this._open) return;
        this._open = false;
        this._root.style.display = 'none';
        this._transform.detach();
        this._releasePointerLock();
        this._stopMouseLook();
        this._resetMoveKeys();
        this._setStatus('Editor closed.');
        try {
            this.renderer.domElement.requestPointerLock?.();
        } catch {
            // Ignore pointer-lock failures outside direct user gesture contexts
        }
    }

    toggle() {
        if (this._open) this.close();
        else this.open();
    }

    applySavedLayout() {
        const saved = this._readSaved();
        if (!saved || !saved.positions) return { applied: 0, missing: 0 };

        this.refreshObjects();

        let applied = 0;
        let missing = 0;

        for (const [key, pos] of Object.entries(saved.positions)) {
            const obj = this._keyToObject.get(key);
            if (!obj) {
                missing += 1;
                continue;
            }
            if (!this._isValidPosition(pos)) continue;
            obj.position.set(pos.x, pos.y, pos.z);
            applied += 1;
        }

        this.refreshObjects();
        return { applied, missing };
    }

    refreshObjects() {
        const prevKey = this._selectedKey;

        this._editableEntries = [];
        this._keyToObject.clear();
        this._objectToKey = new WeakMap();

        this.scene.traverse((obj) => {
            if (!this._isEditableObject(obj)) return;
            const key = this._buildObjectKey(obj);
            this._editableEntries.push({
                key,
                label: this._buildLabel(obj, key),
                object: obj,
            });
            this._keyToObject.set(key, obj);
            this._objectToKey.set(obj, key);
        });

        this._editableEntries.sort((a, b) => a.label.localeCompare(b.label));

        this._populateObjectList();

        if (prevKey && this._keyToObject.has(prevKey)) {
            this._selectByKey(prevKey);
        } else {
            this._clearSelection();
        }

        this._updateDraftCount();
    }

    _setupTransformControls() {
        this._transform = new TransformControls(this.camera, this.renderer.domElement);
        this._transform.setMode('translate');
        this._transform.addEventListener('dragging-changed', (event) => {
            this._dragging = !!event.value;
        });

        this._transform.addEventListener('mouseDown', () => {
            if (!this._selectedKey || !this._selected) return;
            if (!this._baseline.has(this._selectedKey)) {
                this._baseline.set(this._selectedKey, this._snapshot(this._selected.position));
            }
        });

        this._transform.addEventListener('objectChange', () => {
            if (!this._selected || !this._selectedKey) return;
            this._recordDraftForSelected();
            this._syncInputsFromObject();
        });

        this.scene.add(this._transform);
    }

    _buildUI() {
        const root = document.createElement('div');
        root.id = 'scene-editor';
        Object.assign(root.style, {
            position: 'fixed',
            top: '12px',
            right: '12px',
            width: '420px',
            maxHeight: 'calc(100vh - 24px)',
            overflow: 'auto',
            padding: '12px',
            background: '#f5f5f5',
            border: '1px solid #c8c8c8',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: '100000',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            color: '#222',
            display: 'none',
        });

        const title = document.createElement('div');
        title.textContent = 'Scene Editor';
        Object.assign(title.style, { fontWeight: '600', fontSize: '18px', marginBottom: '8px' });
        root.appendChild(title);

        const help = document.createElement('div');
        help.textContent = 'F2 toggle • Fly: WASD + Q/E (Shift fast) • Mouse-look: move mouse (Capture ON) • Left Click: select';
        Object.assign(help.style, { fontSize: '12px', color: '#555', marginBottom: '10px' });
        root.appendChild(help);

        const status = document.createElement('div');
        Object.assign(status.style, {
            fontSize: '12px',
            background: '#fff',
            border: '1px solid #ddd',
            padding: '6px 8px',
            borderRadius: '4px',
            marginBottom: '10px',
            whiteSpace: 'pre-wrap',
        });
        status.textContent = 'Ready.';
        root.appendChild(status);
        this._status = status;

        const row1 = document.createElement('div');
        Object.assign(row1.style, { display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '8px' });

        const search = document.createElement('input');
        search.type = 'text';
        search.placeholder = 'Search by name/type/path...';
        Object.assign(search.style, this._inputStyle());
        search.addEventListener('input', () => this._populateObjectList());
        row1.appendChild(search);
        this._search = search;

        const refreshBtn = this._button('Refresh', () => {
            this.refreshObjects();
            this._setStatus('Object list refreshed.');
        });
        row1.appendChild(refreshBtn);
        root.appendChild(row1);

        const cameraRow = document.createElement('div');
        Object.assign(cameraRow.style, { display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', marginBottom: '8px', alignItems: 'center' });

        const speedLabel = document.createElement('div');
        speedLabel.style.fontSize = '12px';
        this._speedLabel = speedLabel;
        this._updateSpeedLabel();
        cameraRow.appendChild(speedLabel);

        cameraRow.appendChild(this._button('-', () => {
            this._baseFlySpeed = Math.max(2, this._baseFlySpeed - 2);
            this._updateSpeedLabel();
        }));
        cameraRow.appendChild(this._button('+', () => {
            this._baseFlySpeed = Math.min(100, this._baseFlySpeed + 2);
            this._updateSpeedLabel();
        }));
        cameraRow.appendChild(this._button('Reset View', () => this._syncCameraAnglesFromCurrent()));

        const mouseLookBtn = this._button('Mouse Look: ON', () => {
            this._mouseLookEnabled = !this._mouseLookEnabled;
            if (!this._mouseLookEnabled) {
                this._releasePointerLock();
                this._stopMouseLook();
            }
            this._updateMouseLookButton();
        });
        this._mouseLookBtn = mouseLookBtn;
        cameraRow.appendChild(mouseLookBtn);

        root.appendChild(cameraRow);

        const list = document.createElement('select');
        list.size = 14;
        Object.assign(list.style, {
            width: '100%',
            border: '1px solid #bbb',
            borderRadius: '4px',
            padding: '4px',
            marginBottom: '10px',
            background: '#fff',
            fontFamily: 'Consolas, monospace',
            fontSize: '12px',
        });
        list.addEventListener('change', () => {
            if (!list.value) return;
            this._selectByKey(list.value);
        });
        root.appendChild(list);
        this._list = list;

        const selected = document.createElement('div');
        Object.assign(selected.style, {
            fontSize: '12px',
            marginBottom: '8px',
            padding: '6px 8px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
        });
        selected.textContent = 'Selected: none';
        root.appendChild(selected);
        this._selectedLabel = selected;

        const posGrid = document.createElement('div');
        Object.assign(posGrid.style, {
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr',
            gap: '6px',
            alignItems: 'center',
            marginBottom: '8px',
        });

        const xInput = this._numInput();
        const yInput = this._numInput();
        const zInput = this._numInput();
        this._xInput = xInput;
        this._yInput = yInput;
        this._zInput = zInput;

        posGrid.appendChild(this._label('X'));
        posGrid.appendChild(xInput);
        posGrid.appendChild(this._label('Y'));
        posGrid.appendChild(yInput);
        posGrid.appendChild(this._label('Z'));
        posGrid.appendChild(zInput);
        root.appendChild(posGrid);

        const posButtons = document.createElement('div');
        Object.assign(posButtons.style, { display: 'flex', gap: '8px', marginBottom: '10px' });
        posButtons.appendChild(this._button('Apply XYZ', () => this._applyPositionInputs()));
        posButtons.appendChild(this._button('Snap 0.1', () => this._snapSelected(0.1)));
        posButtons.appendChild(this._button('Snap 0.5', () => this._snapSelected(0.5)));
        root.appendChild(posButtons);

        const moveHeader = document.createElement('div');
        moveHeader.textContent = 'Move Settings';
        Object.assign(moveHeader.style, {
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '6px',
        });
        root.appendChild(moveHeader);

        const moveSettings = document.createElement('div');
        Object.assign(moveSettings.style, {
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto 1fr',
            gap: '6px',
            alignItems: 'center',
            marginBottom: '8px',
        });

        const spaceSelect = document.createElement('select');
        Object.assign(spaceSelect.style, this._inputStyle());
        spaceSelect.style.padding = '5px 6px';
        for (const s of ['world', 'local']) {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s.toUpperCase();
            spaceSelect.appendChild(opt);
        }
        spaceSelect.value = this._transformSpace;
        spaceSelect.addEventListener('change', () => {
            this._transformSpace = spaceSelect.value;
            this._applyTransformSettings();
        });
        this._spaceSelect = spaceSelect;

        const snapEnabled = document.createElement('input');
        snapEnabled.type = 'checkbox';
        snapEnabled.checked = this._moveSnapEnabled;
        snapEnabled.addEventListener('change', () => {
            this._moveSnapEnabled = !!snapEnabled.checked;
            this._applyTransformSettings();
        });
        this._snapEnabledCheckbox = snapEnabled;

        const snapStepInput = this._numInput();
        snapStepInput.min = '0';
        snapStepInput.step = '0.01';
        snapStepInput.value = String(this._moveSnapStep);
        snapStepInput.addEventListener('change', () => {
            const v = Number(snapStepInput.value);
            if (Number.isFinite(v) && v > 0) {
                this._moveSnapStep = v;
                this._applyTransformSettings();
            }
            snapStepInput.value = String(this._moveSnapStep);
        });
        this._snapStepInput = snapStepInput;

        const nudgeStepInput = this._numInput();
        nudgeStepInput.min = '0';
        nudgeStepInput.step = '0.01';
        nudgeStepInput.value = String(this._moveNudgeStep);
        nudgeStepInput.addEventListener('change', () => {
            const v = Number(nudgeStepInput.value);
            if (Number.isFinite(v) && v > 0) {
                this._moveNudgeStep = v;
            }
            nudgeStepInput.value = String(this._moveNudgeStep);
        });
        this._nudgeStepInput = nudgeStepInput;

        moveSettings.appendChild(this._label('Space'));
        moveSettings.appendChild(spaceSelect);
        moveSettings.appendChild(this._label('Snap'));

        const snapCell = document.createElement('div');
        Object.assign(snapCell.style, { display: 'flex', gap: '6px', alignItems: 'center' });
        snapCell.appendChild(snapEnabled);
        snapCell.appendChild(snapStepInput);
        moveSettings.appendChild(snapCell);

        moveSettings.appendChild(this._label('Nudge Step'));
        moveSettings.appendChild(nudgeStepInput);
        moveSettings.appendChild(this._label(''));
        moveSettings.appendChild(document.createElement('div'));
        root.appendChild(moveSettings);

        const nudgeGrid = document.createElement('div');
        Object.assign(nudgeGrid.style, {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
            marginBottom: '10px',
        });
        nudgeGrid.appendChild(this._button('-X', () => this._nudgeSelected('x', -1)));
        nudgeGrid.appendChild(this._button('-Y', () => this._nudgeSelected('y', -1)));
        nudgeGrid.appendChild(this._button('-Z', () => this._nudgeSelected('z', -1)));
        nudgeGrid.appendChild(this._button('+X', () => this._nudgeSelected('x', 1)));
        nudgeGrid.appendChild(this._button('+Y', () => this._nudgeSelected('y', 1)));
        nudgeGrid.appendChild(this._button('+Z', () => this._nudgeSelected('z', 1)));
        root.appendChild(nudgeGrid);

        const draftBar = document.createElement('div');
        Object.assign(draftBar.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '12px',
        });
        const draftCount = document.createElement('span');
        draftCount.textContent = 'Draft changes: 0';
        this._draftCount = draftCount;
        draftBar.appendChild(draftCount);
        draftBar.appendChild(this._button('Discard Draft', () => this._discardAllDraft()));
        root.appendChild(draftBar);

        const saveRow = document.createElement('div');
        Object.assign(saveRow.style, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' });
        saveRow.appendChild(this._button('Save Draft', () => this._saveDraftToStorage(), true));
        saveRow.appendChild(this._button('Load Saved', () => this._loadSavedNow()));
        root.appendChild(saveRow);

        const backupRow = document.createElement('div');
        Object.assign(backupRow.style, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' });
        backupRow.appendChild(this._button('Restore Latest Backup', () => this._restoreLatestBackup()));
        backupRow.appendChild(this._button('Delete Saved', () => this._deleteSaved(), false, '#8b1e1e'));
        root.appendChild(backupRow);

        const exportRow = document.createElement('div');
        Object.assign(exportRow.style, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' });
        exportRow.appendChild(this._button('Export JSON', () => this._exportJson()));
        exportRow.appendChild(this._button('Copy JSON', () => this._copyJson()));
        root.appendChild(exportRow);

        const output = document.createElement('textarea');
        output.readOnly = true;
        output.rows = 10;
        Object.assign(output.style, {
            width: '100%',
            resize: 'vertical',
            border: '1px solid #bbb',
            borderRadius: '4px',
            fontFamily: 'Consolas, monospace',
            fontSize: '12px',
            padding: '6px',
            background: '#fff',
            boxSizing: 'border-box',
        });
        root.appendChild(output);
        this._output = output;

        document.body.appendChild(root);
        this._root = root;
    }

    _bindGlobalKeys() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F2') {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.toggle();
                return;
            }

            if (!this._open) return;

            if (this._isTypingTarget(event.target)) return;

            if (this._trackMoveKey(event.key, true)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.close();
                return;
            }

            if (event.key === 'Delete' && this._selectedKey) {
                event.preventDefault();
                event.stopImmediatePropagation();
                this._revertSelected();
                return;
            }

            if (event.ctrlKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                event.stopImmediatePropagation();
                this._saveDraftToStorage();
            }
        }, true);

        document.addEventListener('keyup', (event) => {
            if (!this._open) return;
            if (this._trackMoveKey(event.key, false)) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);
    }

    _bindPointerPicking() {
        document.addEventListener('pointerlockchange', () => {
            const locked = document.pointerLockElement === this.renderer.domElement;
            this._mouseLookActive = locked;
            this.renderer.domElement.style.cursor = locked ? 'none' : '';
            this._updateMouseLookButton();
        });

        this.renderer.domElement.addEventListener('contextmenu', (event) => {
            if (this._open) event.preventDefault();
        });

        this.renderer.domElement.addEventListener('pointerdown', (event) => {
            if (!this._open) return;

            if (event.button === 0 && this._mouseLookEnabled && document.pointerLockElement !== this.renderer.domElement) {
                this.renderer.domElement.requestPointerLock?.();
            }

            if (event.button === 2) {
                this._mouseLookActive = true;
                this.renderer.domElement.style.cursor = 'grabbing';
                event.preventDefault();
            }
        });

        window.addEventListener('pointerup', (event) => {
            if (!this._open) return;
            if (event.button === 2) {
                this._stopMouseLook();
            }
        });

        this.renderer.domElement.addEventListener('pointermove', (event) => {
            if (!this._open || !this._mouseLookActive) return;
            this._lookDeltaX += event.movementX || 0;
            this._lookDeltaY += event.movementY || 0;
        });

        this.renderer.domElement.addEventListener('pointerdown', (event) => {
            if (!this._open || this._dragging || this._mouseLookActive) return;
            if (event.button !== 0) return;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this._pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this._pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            this._raycaster.setFromCamera(this._pointer, this.camera);

            const meshes = [];
            for (const entry of this._editableEntries) {
                entry.object.traverse((child) => {
                    if (child.isMesh && child.visible) meshes.push(child);
                });
            }

            const hits = this._raycaster.intersectObjects(meshes, false);
            if (!hits.length) return;

            let obj = hits[0].object;
            while (obj && !this._objectToKey.get(obj)) {
                obj = obj.parent;
            }

            const key = obj ? this._objectToKey.get(obj) : null;
            if (key) this._selectByKey(key);
        });
    }

    _selectByKey(key) {
        const obj = this._keyToObject.get(key);
        if (!obj) return;

        this._selected = obj;
        this._selectedKey = key;
        this._transform.attach(obj);

        this._selectedLabel.textContent = `Selected: ${this._buildLabel(obj, key)}`;
        this._syncInputsFromObject();

        for (const option of this._list.options) {
            option.selected = option.value === key;
        }
    }

    _clearSelection() {
        this._selected = null;
        this._selectedKey = null;
        this._transform.detach();
        this._selectedLabel.textContent = 'Selected: none';
    }

    _applyPositionInputs() {
        if (!this._selected || !this._selectedKey) return;

        const x = Number(this._xInput.value);
        const y = Number(this._yInput.value);
        const z = Number(this._zInput.value);

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            this._setStatus('Invalid XYZ values.');
            return;
        }

        if (!this._baseline.has(this._selectedKey)) {
            this._baseline.set(this._selectedKey, this._snapshot(this._selected.position));
        }

        this._selected.position.set(x, y, z);
        this._recordDraftForSelected();
        this._setStatus('Draft updated from XYZ inputs.');
    }

    _nudgeSelected(axis, direction) {
        if (!this._selected || !this._selectedKey) return;
        const step = Number(this._moveNudgeStep);
        if (!Number.isFinite(step) || step <= 0) {
            this._setStatus('Nudge step must be greater than 0.');
            return;
        }

        if (!this._baseline.has(this._selectedKey)) {
            this._baseline.set(this._selectedKey, this._snapshot(this._selected.position));
        }

        this._selected.position[axis] += direction * step;
        this._recordDraftForSelected();
        this._syncInputsFromObject();
        this._setStatus(`Nudged ${axis.toUpperCase()} by ${(direction * step).toFixed(3)}.`);
    }

    _snapSelected(step) {
        if (!this._selected || !this._selectedKey) return;

        if (!this._baseline.has(this._selectedKey)) {
            this._baseline.set(this._selectedKey, this._snapshot(this._selected.position));
        }

        this._selected.position.set(
            this._snap(this._selected.position.x, step),
            this._snap(this._selected.position.y, step),
            this._snap(this._selected.position.z, step)
        );

        this._recordDraftForSelected();
        this._syncInputsFromObject();
        this._setStatus(`Snapped selected object to ${step}.`);
    }

    _recordDraftForSelected() {
        if (!this._selected || !this._selectedKey) return;
        this._draft.set(this._selectedKey, this._snapshot(this._selected.position));
        this._updateDraftCount();
    }

    _revertSelected() {
        if (!this._selected || !this._selectedKey) return;
        const base = this._baseline.get(this._selectedKey);
        if (!base) {
            this._setStatus('No draft baseline for selected object.');
            return;
        }

        this._selected.position.set(base.x, base.y, base.z);
        this._draft.delete(this._selectedKey);
        this._baseline.delete(this._selectedKey);
        this._syncInputsFromObject();
        this._updateDraftCount();
        this._setStatus('Selected object reverted to baseline.');
    }

    _discardAllDraft() {
        for (const [key, pos] of this._baseline.entries()) {
            const obj = this._keyToObject.get(key);
            if (!obj) continue;
            obj.position.set(pos.x, pos.y, pos.z);
        }

        this._draft.clear();
        this._baseline.clear();
        this._syncInputsFromObject();
        this._updateDraftCount();
        this._setStatus('All draft changes discarded.');
    }

    _saveDraftToStorage() {
        const draftPositions = this._serializeDraft();
        const draftCount = Object.keys(draftPositions).length;

        if (draftCount === 0) {
            this._setStatus('No draft changes to save.');
            return;
        }

        const existing = this._readSaved();
        if (existing && existing.positions && Object.keys(existing.positions).length > 0) {
            const backups = this._readBackups();
            backups.unshift({
                timestamp: new Date().toISOString(),
                payload: existing,
            });
            if (!this._setStorage(BACKUP_KEY, backups.slice(0, MAX_BACKUPS))) return;
        }

        const mergedPositions = {
            ...(existing?.positions || {}),
            ...draftPositions,
        };

        const payload = {
            version: 1,
            timestamp: new Date().toISOString(),
            positions: mergedPositions,
        };
        if (!this._setStorage(STORAGE_KEY, payload)) return;

        this._output.value = JSON.stringify(payload, null, 2);
        this._clearDraftState();
        this._setStatus(`Draft saved (${draftCount} objects). Backup captured.`);
    }

    _loadSavedNow() {
        const result = this.applySavedLayout();
        this._clearDraftState();
        this._setStatus(`Loaded saved layout. Applied: ${result.applied}, missing: ${result.missing}.`);
        this._syncInputsFromObject();
    }

    _restoreLatestBackup() {
        const backups = this._readBackups();
        if (!backups.length) {
            this._setStatus('No backups available.');
            return;
        }

        const latest = backups[0];

        if (!latest || !latest.payload) {
            this._setStatus('Latest backup is invalid.');
            return;
        }

        if (!latest.payload.positions || typeof latest.payload.positions !== 'object') {
            this._setStatus('Latest backup has invalid position data.');
            return;
        }

        if (!this._setStorage(STORAGE_KEY, latest.payload)) return;
        const result = this.applySavedLayout();
        this._clearDraftState();
        this._output.value = JSON.stringify(latest.payload, null, 2);
        this._setStatus(`Backup restored. Applied: ${result.applied}, missing: ${result.missing}.`);

        backups.shift();
        this._setStorage(BACKUP_KEY, backups);
    }

    _deleteSaved() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            this._setStatus('Could not delete saved layout (storage error).');
            return;
        }
        this._setStatus('Saved layout deleted. Scene remains unchanged until you load/refresh.');
    }

    _exportJson() {
        const payload = {
            version: 1,
            timestamp: new Date().toISOString(),
            positions: this._serializeDraft(),
        };
        this._output.value = JSON.stringify(payload, null, 2);
        this._setStatus('Draft JSON exported to output box.');
    }

    async _copyJson() {
        const payload = {
            version: 1,
            timestamp: new Date().toISOString(),
            positions: this._serializeDraft(),
        };
        const text = JSON.stringify(payload, null, 2);
        this._output.value = text;

        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            this._setStatus('Clipboard API unavailable. Use Export JSON output manually.');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this._setStatus('Draft JSON copied to clipboard.');
        } catch {
            this._setStatus('Copy failed (browser permission denied).');
        }
    }

    _populateObjectList() {
        const q = (this._search.value || '').trim().toLowerCase();
        const entries = !q
            ? this._editableEntries
            : this._editableEntries.filter((entry) => entry.label.toLowerCase().includes(q));

        this._list.innerHTML = '';

        for (const entry of entries) {
            const option = document.createElement('option');
            option.value = entry.key;
            option.textContent = entry.label;
            if (entry.key === this._selectedKey) option.selected = true;
            this._list.appendChild(option);
        }
    }

    _syncInputsFromObject() {
        if (!this._selected) return;
        this._xInput.value = this._selected.position.x.toFixed(3);
        this._yInput.value = this._selected.position.y.toFixed(3);
        this._zInput.value = this._selected.position.z.toFixed(3);
    }

    _serializeDraft() {
        const out = {};
        for (const [key, pos] of this._draft.entries()) {
            out[key] = { x: pos.x, y: pos.y, z: pos.z };
        }
        return out;
    }

    _readSaved() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    _readBackups() {
        const raw = localStorage.getItem(BACKUP_KEY);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    _isEditableObject(obj) {
        if (!obj || obj === this.scene) return false;
        if (obj === this._transform) return false;
        if (obj.parent === this._transform) return false;
        if (obj.userData && obj.userData._sceneEditorIgnore) return false;
        return !!(obj.isGroup || obj.isMesh || obj.isLight);
    }

    _buildObjectKey(obj) {
        const path = [];
        let current = obj;

        while (current && current.parent) {
            const parent = current.parent;
            const tag = this._nodeTag(current);
            const peers = parent.children.filter((child) => this._nodeTag(child) === tag);
            const rank = peers.indexOf(current);
            path.unshift(`${tag}@${rank}`);
            current = parent;
        }

        return path.join('/');
    }

    _nodeTag(obj) {
        return (obj.name && obj.name.trim()) ? obj.name.trim() : obj.type;
    }

    _buildLabel(obj, key) {
        const name = (obj.name && obj.name.trim()) ? obj.name.trim() : '(unnamed)';
        return `${name} [${obj.type}] :: ${key}`;
    }

    _snapshot(v3) {
        return {
            x: Number(v3.x.toFixed(6)),
            y: Number(v3.y.toFixed(6)),
            z: Number(v3.z.toFixed(6)),
        };
    }

    _isValidPosition(pos) {
        return pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z);
    }

    _snap(value, step) {
        return Math.round(value / step) * step;
    }

    _setStatus(message) {
        this._status.textContent = message;
    }

    _applyTransformSettings() {
        if (!this._transform) return;
        this._transform.setSpace(this._transformSpace);
        this._transform.setTranslationSnap(this._moveSnapEnabled ? this._moveSnapStep : null);
    }

    _updateFlyCamera(dt) {
        if (!this._open) return;

        if (this._lookDeltaX !== 0 || this._lookDeltaY !== 0) {
            this._yaw -= this._lookDeltaX * this._lookSensitivity;
            this._pitch -= this._lookDeltaY * this._lookSensitivity;
            this._pitch = Math.max(-1.45, Math.min(1.45, this._pitch));
            this._cameraQuatFromAngles();
            this._lookDeltaX = 0;
            this._lookDeltaY = 0;
        }

        const moveX = (this._moveKeys.right ? 1 : 0) - (this._moveKeys.left ? 1 : 0);
        const moveY = (this._moveKeys.up ? 1 : 0) - (this._moveKeys.down ? 1 : 0);
        const moveZ = (this._moveKeys.forward ? 1 : 0) - (this._moveKeys.back ? 1 : 0);

        if (moveX === 0 && moveY === 0 && moveZ === 0) return;

        const speed = this._baseFlySpeed * (this._moveKeys.fast ? 2.5 : 1);
        const step = speed * dt;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0);

        const delta = new THREE.Vector3();
        if (moveZ !== 0) delta.addScaledVector(forward, moveZ);
        if (moveX !== 0) delta.addScaledVector(right, moveX);
        if (moveY !== 0) delta.addScaledVector(up, moveY);

        if (delta.lengthSq() < 1e-8) return;
        delta.normalize().multiplyScalar(step);
        this.camera.position.add(delta);
    }

    _trackMoveKey(key, pressed) {
        const k = (key || '').toLowerCase();
        if (k === 'w') { this._moveKeys.forward = pressed; return true; }
        if (k === 's') { this._moveKeys.back = pressed; return true; }
        if (k === 'a') { this._moveKeys.left = pressed; return true; }
        if (k === 'd') { this._moveKeys.right = pressed; return true; }
        if (k === 'q') { this._moveKeys.down = pressed; return true; }
        if (k === 'e') { this._moveKeys.up = pressed; return true; }
        if (k === 'shift') { this._moveKeys.fast = pressed; return true; }
        return false;
    }

    _cameraQuatFromAngles() {
        const e = new THREE.Euler(this._pitch, this._yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(e);
    }

    _syncCameraAnglesFromCurrent() {
        const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        this._pitch = e.x;
        this._yaw = e.y;
    }

    _stopMouseLook() {
        if (document.pointerLockElement === this.renderer.domElement) {
            this._mouseLookActive = true;
            this.renderer.domElement.style.cursor = 'none';
            return;
        }
        this._mouseLookActive = false;
        this.renderer.domElement.style.cursor = '';
    }

    _releasePointerLock() {
        if (document.pointerLockElement === this.renderer.domElement) {
            document.exitPointerLock?.();
        }
    }

    _updateMouseLookButton() {
        if (!this._mouseLookBtn) return;
        const locked = document.pointerLockElement === this.renderer.domElement;
        const enabled = this._mouseLookEnabled;
        if (!enabled) {
            this._mouseLookBtn.textContent = 'Mouse Look: OFF';
            this._mouseLookBtn.style.background = '#efefef';
            this._mouseLookBtn.style.color = '#222';
            return;
        }
        this._mouseLookBtn.textContent = locked ? 'Mouse Look: ON (Captured)' : 'Mouse Look: ON';
        this._mouseLookBtn.style.background = '#1f6feb';
        this._mouseLookBtn.style.color = '#fff';
    }

    _isTypingTarget(target) {
        if (!target || !target.tagName) return false;
        const t = target.tagName.toLowerCase();
        return t === 'input' || t === 'textarea' || t === 'select' || target.isContentEditable;
    }

    _resetMoveKeys() {
        this._moveKeys.forward = false;
        this._moveKeys.back = false;
        this._moveKeys.left = false;
        this._moveKeys.right = false;
        this._moveKeys.up = false;
        this._moveKeys.down = false;
        this._moveKeys.fast = false;
    }

    _updateSpeedLabel() {
        if (!this._speedLabel) return;
        this._speedLabel.textContent = `Fly speed: ${this._baseFlySpeed.toFixed(0)} (Shift = fast)`;
    }

    _setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            this._setStatus('Storage write failed (quota/permission).');
            return false;
        }
    }

    _clearDraftState() {
        this._draft.clear();
        this._baseline.clear();
        this._updateDraftCount();
    }

    _updateDraftCount() {
        this._draftCount.textContent = `Draft changes: ${this._draft.size}`;
    }

    _label(text) {
        const el = document.createElement('span');
        el.textContent = text;
        el.style.fontSize = '12px';
        return el;
    }

    _numInput() {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.1';
        Object.assign(input.style, this._inputStyle());
        return input;
    }

    _inputStyle() {
        return {
            width: '100%',
            border: '1px solid #bbb',
            borderRadius: '4px',
            padding: '6px 8px',
            fontSize: '12px',
            boxSizing: 'border-box',
            background: '#fff',
        };
    }

    _button(text, onClick, primary = false, customBg = null) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = text;
        const background = customBg || (primary ? '#1f6feb' : '#efefef');
        const color = (customBg || primary) ? '#fff' : '#222';
        Object.assign(btn.style, {
            border: '1px solid #999',
            borderRadius: '4px',
            padding: '7px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            background,
            color,
        });
        btn.addEventListener('click', onClick);
        return btn;
    }
}
