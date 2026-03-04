import * as THREE from 'three';

const DEFAULT_RADIUS = 3.0;
const GLOW_EMISSIVE = new THREE.Color(0x443322);
const GLOW_INTENSITY = 0.4;
const WIREFRAME_GLOW_COLOR = 0x33ff66;

export class InteractionManager {
    constructor(scene) {
        this.scene = scene;
        this.interactables = new Map();   // mesh → { mesh, type, radius, onInteract, label, originalEmissive, originalIntensity, glowing }
        this.nearest = null;              // current nearest interactable entry, or null
    }

    /**
     * Register an interactable object.
     * @param {THREE.Object3D} mesh
     * @param {{ type: 'examine'|'activate'|'enter'|'sit'|'read', radius?: number, onInteract: Function, label?: string }} options
     */
    register(mesh, options) {
        const entry = {
            mesh,
            type: options.type,
            radius: options.radius ?? DEFAULT_RADIUS,
            onInteract: options.onInteract,
            label: options.label ?? options.type,
            originalEmissive: null,
            originalIntensity: null,
            glowing: false,
        };

        // Snapshot original emissive so we can restore later
        this._snapshotEmissive(entry);

        this.interactables.set(mesh, entry);
    }

    /**
     * Remove an interactable, restoring its material first.
     * @param {THREE.Object3D} mesh
     */
    unregister(mesh) {
        const entry = this.interactables.get(mesh);
        if (!entry) return;

        if (entry.glowing) this._removeGlow(entry);

        if (this.nearest?.mesh === mesh) this.nearest = null;

        this.interactables.delete(mesh);
    }

    /**
     * Call each frame with Josh's world position.
     * Returns the nearest interactable within range, or null.
     * @param {THREE.Vector3} joshPosition
     * @returns {{ mesh: THREE.Object3D, type: string, label: string, distance: number } | null}
     */
    update(joshPosition) {
        let closest = null;
        let closestDist = Infinity;

        const pos = _v1;

        for (const entry of this.interactables.values()) {
            // Skip objects that aren't effectively visible (hidden zone scenes)
            if (!this._isEffectivelyVisible(entry.mesh)) continue;

            entry.mesh.getWorldPosition(pos);
            const dist = pos.distanceTo(joshPosition);

            if (dist <= entry.radius && dist < closestDist) {
                closestDist = dist;
                closest = entry;
            }
        }

        // Handle glow transitions
        for (const entry of this.interactables.values()) {
            const shouldGlow = entry === closest;

            if (shouldGlow && !entry.glowing) {
                this._applyGlow(entry);
            } else if (!shouldGlow && entry.glowing) {
                this._removeGlow(entry);
            }
        }

        if (closest) {
            this.nearest = closest;
            return {
                mesh: closest.mesh,
                type: closest.type,
                label: closest.label,
                distance: closestDist,
            };
        }

        this.nearest = null;
        return null;
    }

    /**
     * Trigger the nearest interactable's callback (call on E-key press).
     * @returns {boolean} true if an interaction occurred
     */
    interact() {
        if (!this.nearest) return false;

        this.nearest.onInteract(this.nearest.mesh);
        return true;
    }

    /**
     * Get normalized direction from Josh to the nearest interactable (for head tracking).
     * @param {THREE.Vector3} joshPosition
     * @returns {THREE.Vector3 | null}
     */
    getTargetDirection(joshPosition) {
        if (!this.nearest) return null;

        const target = _v2;
        this.nearest.mesh.getWorldPosition(target);
        target.sub(joshPosition);

        const len = target.length();
        if (len < 1e-6) return null;

        // Reuse _v2 in-place — divideScalar modifies _v2 directly.
        // Callers must use the result before the next update() call.
        return target.divideScalar(len);
    }

    // ---- private helpers ---- //

    /** Check whether a material supports emissive properties. */
    _supportsEmissive(material) {
        if (!material) return false;
        if (material.isShaderMaterial || material.isRawShaderMaterial) return false;
        return material.emissive !== undefined;
    }

    /** Check whether any material on the mesh needs the wireframe overlay path. */
    _needsWireframeOverlay(mesh) {
        const mat = mesh.material;
        if (!mat) return false;
        const mats = Array.isArray(mat) ? mat : [mat];
        // If every material supports emissive, no overlay needed
        return mats.some(m => !this._supportsEmissive(m));
    }

    /** Save the original emissive values from the mesh's material(s). */
    _snapshotEmissive(entry) {
        const mat = entry.mesh.material;
        if (!mat) return;

        if (Array.isArray(mat)) {
            entry.originalEmissive = mat.map(m =>
                this._supportsEmissive(m) ? m.emissive.clone() : null
            );
            entry.originalIntensity = mat.map(m =>
                this._supportsEmissive(m) ? m.emissiveIntensity : null
            );
        } else if (this._supportsEmissive(mat)) {
            entry.originalEmissive = mat.emissive.clone();
            entry.originalIntensity = mat.emissiveIntensity;
        }
    }

    /** Create a wireframe overlay mesh as a child of the target. */
    _addWireframeOverlay(mesh) {
        // Walk the object tree to find the first geometry we can clone
        const overlays = [];

        mesh.traverse((child) => {
            if (!child.isMesh || !child.geometry) return;
            // Skip invisible meshes — don't create visible overlays for hidden markers
            const mat = child.material;
            const mats = Array.isArray(mat) ? mat : [mat];
            if (mats.every(m => m && m.visible === false)) return;

            const overlayMat = new THREE.MeshBasicMaterial({
                color: WIREFRAME_GLOW_COLOR,
                wireframe: true,
                transparent: true,
                opacity: 0.45,
                depthTest: true,
                depthWrite: false,
            });

            const overlay = new THREE.Mesh(child.geometry, overlayMat);
            overlay.name = '__proximityGlowOverlay';
            overlay.raycast = () => {};  // non-interactive

            // If the child is the root mesh itself, attach as a direct child at identity
            if (child === mesh) {
                overlay.position.set(0, 0, 0);
                overlay.rotation.set(0, 0, 0);
                overlay.scale.set(1, 1, 1);
            } else {
                // Copy child's local transform so overlay sits in the same spot
                overlay.position.copy(child.position);
                overlay.rotation.copy(child.rotation);
                overlay.scale.copy(child.scale);
            }

            child.add(overlay);
            overlays.push(overlay);
        });

        // Store references on userData for cleanup
        mesh.userData.__proximityGlowOverlays = overlays;
    }

    /** Remove wireframe overlay meshes previously added. */
    _removeWireframeOverlay(mesh) {
        const overlays = mesh.userData.__proximityGlowOverlays;
        if (!overlays) return;

        for (const overlay of overlays) {
            if (overlay.parent) overlay.parent.remove(overlay);
            overlay.geometry = null;  // don't dispose — it's shared with the original
            overlay.material.dispose();
        }

        delete mesh.userData.__proximityGlowOverlays;
    }

    /** Apply glow emissive to the mesh's material(s), with wireframe fallback. */
    _applyGlow(entry) {
        const mat = entry.mesh.material;

        if (this._needsWireframeOverlay(entry.mesh)) {
            // Wireframe overlay path for ShaderMaterials / unsupported materials
            this._addWireframeOverlay(entry.mesh);
        } else if (mat) {
            // Standard emissive path
            if (Array.isArray(mat)) {
                for (let i = 0; i < mat.length; i++) {
                    if (this._supportsEmissive(mat[i])) {
                        mat[i].emissive.copy(GLOW_EMISSIVE);
                        mat[i].emissiveIntensity = GLOW_INTENSITY;
                    }
                }
            } else if (this._supportsEmissive(mat)) {
                mat.emissive.copy(GLOW_EMISSIVE);
                mat.emissiveIntensity = GLOW_INTENSITY;
            }
        }

        entry.glowing = true;
    }

    /** Restore original emissive values / remove wireframe overlay. */
    _removeGlow(entry) {
        // Always try to clean up wireframe overlays
        this._removeWireframeOverlay(entry.mesh);

        // Restore emissive if applicable
        const mat = entry.mesh.material;
        if (mat) {
            if (Array.isArray(mat)) {
                for (let i = 0; i < mat.length; i++) {
                    if (this._supportsEmissive(mat[i]) && entry.originalEmissive?.[i]) {
                        mat[i].emissive.copy(entry.originalEmissive[i]);
                        mat[i].emissiveIntensity = entry.originalIntensity[i];
                    }
                }
            } else if (this._supportsEmissive(mat) && entry.originalEmissive) {
                mat.emissive.copy(entry.originalEmissive);
                mat.emissiveIntensity = entry.originalIntensity;
            }
        }

        entry.glowing = false;
    }

    /** Check if an object and all its ancestors are visible. */
    _isEffectivelyVisible(obj) {
        let o = obj;
        while (o) {
            if (!o.visible) return false;
            o = o.parent;
        }
        return true;
    }
}

// Reusable vectors to avoid per-frame allocations
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
