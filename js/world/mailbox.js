/**
 * mailbox.js — A classic US-style rural mailbox for Josh's Math Fun World
 *
 * Upgraded slightly but maintaining the low-poly charm.
 */

import * as THREE from 'three';
import { createPS1Material } from './ps1-material.js';

export const MAILBOX_X = -5;
export const MAILBOX_Z = -6;

export function createMailbox() {
    const group = new THREE.Group();
    group.position.set(MAILBOX_X, 0, MAILBOX_Z);

    // ── Post ────────────────────────────────────────────────────────
    // Tall thin wooden post, y=0 to y=1.2
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.3, 5);
    const postMat = createPS1Material({ color: new THREE.Color(0x5C3A1E) });
    const postMesh = new THREE.Mesh(postGeo, postMat);
    postMesh.position.set(0, 0.65, 0); 
    group.add(postMesh);

    // ── Mailbox body ────────────────────────────────────────────────
    // Sleek arched top
    const shape = new THREE.Shape();
    shape.moveTo(-0.4, -0.2);
    shape.lineTo(0.4, -0.2);
    shape.lineTo(0.4, 0.0);
    shape.absarc(0, 0, 0.4, 0, Math.PI, false);
    shape.lineTo(-0.4, -0.2);

    const extrudeSettings = {
        depth: 0.8,
        bevelEnabled: false,
        steps: 1
    };

    const boxGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center it
    boxGeo.translate(0, 0, -0.4);
    
    const boxMat = createPS1Material({ color: new THREE.Color(0x2244AA) });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.position.set(0, 1.5, 0);
    // Depth is already along Z
    // Darker blue door on the front
    const doorGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.05, 12, 1, false, 0, Math.PI);
    const doorMat = createPS1Material({ color: new THREE.Color(0x112288) });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(0, 1.5, 0.42);
    doorMesh.rotation.x = Math.PI / 2;
    group.add(doorMesh);
    
    // Tiny little handle/knob
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), new THREE.MeshBasicMaterial({color: 0x888888}));
    handle.position.set(0, 0.2, 0.05);
    doorMesh.add(handle);

    // ── Flag ────────────────────────────────────────────────────────
    // Small red flag
    const flagGeo = new THREE.BoxGeometry(0.04, 0.25, 0.1);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xCC2222 });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.geometry.translate(0, 0.125, 0); 
    flagMesh.position.set(0.42, 1.35, 0.2);
    flagMesh.rotation.z = Math.PI / 4; 
    group.add(flagMesh);

    // ── Label ───────────────────────────────────────────────────────
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const ctx = labelCanvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MATH DEPT', 128, 32);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.minFilter = THREE.NearestFilter;
    labelTexture.magFilter = THREE.NearestFilter; 

    // Adjust plane for the side of the mailbox
    const labelGeo = new THREE.PlaneGeometry(0.6, 0.15);
    const labelMat = new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: false,
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.set(-0.41, 1.4, 0);
    labelMesh.rotation.y = -Math.PI / 2;
    group.add(labelMesh);

    // ── Collider ────────────────────────────────────────────────────
    const margin = 0.15;
    const collider = {
        min: new THREE.Vector3(
            MAILBOX_X - 0.4 - margin,
            0,
            MAILBOX_Z - 0.5 - margin,
        ),
        max: new THREE.Vector3(
            MAILBOX_X + 0.4 + margin,
            1.8,
            MAILBOX_Z + 0.5 + margin,
        ),
    };

    const interactPosition = new THREE.Vector3(MAILBOX_X, 0, MAILBOX_Z + 1.2);  

    return {
        mesh: group,
        collider,
        interactPosition,
        flagMesh,
    };
}
