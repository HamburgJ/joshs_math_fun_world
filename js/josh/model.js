import * as THREE from 'three';

/**
 * Builds Josh — an unsettling orange blob creature.
 * Lumpy, vaguely humanoid, with asymmetric eyes, a too-wide grin,
 * and stubby nub limbs that sprout from the mass.
 * Returns a THREE.Group with named sub-groups for limb animation.
 */
export function createJosh() {
    const group = new THREE.Group();
    group.name = 'josh';

    // --- Materials ---
    // Fleshy orange with a wet-looking sheen and subtle inner glow
    const blobMat = new THREE.MeshPhongMaterial({
        color: 0xff8c2a,
        emissive: 0x4a1800,
        specular: 0xffcc88,
        shininess: 60,
        flatShading: true,
    });
    // Darker underbelly tint
    const blobDarkMat = new THREE.MeshPhongMaterial({
        color: 0xd46a10,
        emissive: 0x3a1000,
        specular: 0xffaa55,
        shininess: 50,
        flatShading: true,
    });
    // Eyes: glossy off-white with dark pupils built in via a separate mesh
    const eyeWhiteMat = new THREE.MeshPhongMaterial({
        color: 0xf0e8d0,
        emissive: 0x282010,
        specular: 0xffffff,
        shininess: 120,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    // The mouth: a dark void
    const mouthMat = new THREE.MeshBasicMaterial({
        color: 0x1a0505,
        side: THREE.DoubleSide,
    });
    // Nub tips (slightly paler, like exposed lighter flesh)
    const nubTipMat = new THREE.MeshPhongMaterial({
        color: 0xffaa55,
        emissive: 0x3a1200,
        specular: 0xffddaa,
        shininess: 40,
        flatShading: true,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
    });

    // --- Helper: deform sphere geometry to make it lumpy ---
    function makeLumpy(geo, intensity = 0.06) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const len = Math.sqrt(x * x + y * y + z * z) || 1;
            // crude procedural noise via overlapping sines
            const noise = Math.sin(x * 13.7 + y * 7.3) * Math.cos(z * 11.1 + x * 5.9)
                        + Math.sin(y * 19.1 + z * 3.7) * 0.5;
            const offset = 1 + noise * intensity;
            pos.setXYZ(i, x * offset, y * offset, z * offset);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }

    // --- Body group ---
    const body = new THREE.Group();
    body.name = 'body';
    body.position.y = 0;
    group.add(body);

    // --- Torso: large lumpy blob mass ---
    const torsoGeo = makeLumpy(new THREE.SphereGeometry(0.45, 8, 6), 0.08);
    torsoGeo.scale(1, 1.2, 0.95); // slightly taller, slightly squished front-back
    const torso = new THREE.Mesh(torsoGeo, blobMat);
    torso.position.y = 1.1;
    torso.name = 'torso';
    body.add(torso);

    // Underbelly bulge (darker, hangs low — unsettling weight)
    const bellyGeo = makeLumpy(new THREE.SphereGeometry(0.32, 7, 5), 0.05);
    const belly = new THREE.Mesh(bellyGeo, blobDarkMat);
    belly.position.set(0, 0.85, 0.08);
    belly.scale.set(1.1, 0.7, 1.0);
    body.add(belly);

    // Small lumps/warts on the surface (unsettling organic bumps)
    const bumpGeo = new THREE.SphereGeometry(0.07, 5, 4);
    const bumpPositions = [
        [0.25, 1.35, 0.2], [-0.3, 1.0, -0.25], [0.15, 0.95, 0.3],
        [-0.2, 1.4, -0.15], [0.35, 1.15, -0.1], [-0.1, 1.45, 0.25],
    ];
    for (const [bx, by, bz] of bumpPositions) {
        const bump = new THREE.Mesh(bumpGeo, blobMat);
        bump.position.set(bx, by, bz);
        bump.scale.setScalar(0.6 + Math.random() * 0.8);
        body.add(bump);
    }

    // --- Head: oversized sphere, partially merged into torso ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.55, 0.05);
    headGroup.name = 'head';
    body.add(headGroup);

    const headGeo = makeLumpy(new THREE.SphereGeometry(0.38, 8, 6), 0.05);
    const headMesh = new THREE.Mesh(headGeo, blobMat);
    headMesh.scale.set(1.05, 0.95, 1.0); // slightly wide, slightly squashed
    headGroup.add(headMesh);

    // Small cranial bump on top (uncanny)
    const cranialBump = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), blobMat);
    cranialBump.position.set(0.06, 0.32, -0.04);
    headGroup.add(cranialBump);

    // --- Eyes: asymmetric, too wide, slightly bulging ---
    // Left eye (slightly larger — the uncanny one)
    const leftEyeWhiteGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const leftEyeWhite = new THREE.Mesh(leftEyeWhiteGeo, eyeWhiteMat);
    leftEyeWhite.position.set(-0.16, 0.04, 0.3);
    leftEyeWhite.scale.set(1.0, 1.15, 0.7); // bulging
    leftEyeWhite.name = 'leftEye';
    headGroup.add(leftEyeWhite);

    const leftPupilGeo = new THREE.SphereGeometry(0.055, 6, 5);
    const leftPupil = new THREE.Mesh(leftPupilGeo, pupilMat);
    leftPupil.position.set(-0.16, 0.02, 0.36);
    leftPupil.scale.set(1.0, 1.2, 0.5); // vertically elongated slit-ish
    headGroup.add(leftPupil);

    // Right eye (slightly smaller — the asymmetry is the creepy part)
    const rightEyeWhiteGeo = new THREE.SphereGeometry(0.085, 8, 6);
    const rightEyeWhite = new THREE.Mesh(rightEyeWhiteGeo, eyeWhiteMat);
    rightEyeWhite.position.set(0.18, 0.07, 0.29);
    rightEyeWhite.scale.set(1.0, 1.05, 0.7);
    rightEyeWhite.name = 'rightEye';
    headGroup.add(rightEyeWhite);

    const rightPupilGeo = new THREE.SphereGeometry(0.048, 6, 5);
    const rightPupil = new THREE.Mesh(rightPupilGeo, pupilMat);
    rightPupil.position.set(0.18, 0.06, 0.34);
    rightPupil.scale.set(1.0, 1.2, 0.5);
    headGroup.add(rightPupil);

    // --- Mouth: a too-wide, thin, dark grin ---
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.18, 0);
    mouthShape.quadraticCurveTo(-0.09, -0.08, 0, -0.04);
    mouthShape.quadraticCurveTo(0.09, -0.08, 0.2, 0.01);
    // slight upward curl at the right — lopsided grin
    const mouthGeo = new THREE.ShapeGeometry(mouthShape, 6);
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0.0, -0.12, 0.345);
    mouth.scale.set(1.1, 1.0, 1.0);
    headGroup.add(mouth);

    // Tiny teeth-like bumps inside the grin (barely visible, deeply wrong)
    const toothGeo = new THREE.BoxGeometry(0.02, 0.03, 0.015);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xddd8c0 });
    for (let i = -2; i <= 2; i++) {
        const tooth = new THREE.Mesh(toothGeo, toothMat);
        tooth.position.set(i * 0.06, -0.14, 0.35);
        tooth.rotation.z = (Math.random() - 0.5) * 0.3; // slightly crooked
        headGroup.add(tooth);
    }

    // --- Left Arm: stubby nub tentacle ---
    const leftArmGroup = new THREE.Group();
    leftArmGroup.name = 'leftArmGroup';
    leftArmGroup.position.set(-0.48, 1.2, 0);
    body.add(leftArmGroup);

    const leftUpperArmGeo = makeLumpy(new THREE.CylinderGeometry(0.12, 0.1, 0.35, 5), 0.07);
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeo, blobMat);
    leftUpperArm.name = 'leftUpperArm';
    leftUpperArm.position.y = -0.17;
    leftArmGroup.add(leftUpperArm);

    const leftLowerArmGroup = new THREE.Group();
    leftLowerArmGroup.name = 'leftLowerArmGroup';
    leftLowerArmGroup.position.set(0, -0.35, 0);
    leftArmGroup.add(leftLowerArmGroup);

    const leftLowerArmGeo = makeLumpy(new THREE.CylinderGeometry(0.09, 0.05, 0.3, 5), 0.06);
    const leftLowerArm = new THREE.Mesh(leftLowerArmGeo, blobMat);
    leftLowerArm.name = 'leftLowerArm';
    leftLowerArm.position.y = -0.15;
    leftLowerArmGroup.add(leftLowerArm);

    // Nub tip (rounded end, slightly paler — like a fat little finger)
    const leftNub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), nubTipMat);
    leftNub.position.y = -0.32;
    leftLowerArmGroup.add(leftNub);

    // --- Right Arm: stubby nub tentacle ---
    const rightArmGroup = new THREE.Group();
    rightArmGroup.name = 'rightArmGroup';
    rightArmGroup.position.set(0.48, 1.2, 0);
    body.add(rightArmGroup);

    const rightUpperArmGeo = makeLumpy(new THREE.CylinderGeometry(0.12, 0.1, 0.35, 5), 0.07);
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeo, blobMat);
    rightUpperArm.name = 'rightUpperArm';
    rightUpperArm.position.y = -0.17;
    rightArmGroup.add(rightUpperArm);

    const rightLowerArmGroup = new THREE.Group();
    rightLowerArmGroup.name = 'rightLowerArmGroup';
    rightLowerArmGroup.position.set(0, -0.35, 0);
    rightArmGroup.add(rightLowerArmGroup);

    const rightLowerArmGeo = makeLumpy(new THREE.CylinderGeometry(0.09, 0.05, 0.3, 5), 0.06);
    const rightLowerArm = new THREE.Mesh(rightLowerArmGeo, blobMat);
    rightLowerArm.name = 'rightLowerArm';
    rightLowerArm.position.y = -0.15;
    rightLowerArmGroup.add(rightLowerArm);

    const rightNub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), nubTipMat);
    rightNub.position.y = -0.32;
    rightLowerArmGroup.add(rightNub);

    // --- Left Leg: short stubby blob leg ---
    const leftLegGroup = new THREE.Group();
    leftLegGroup.name = 'leftLegGroup';
    leftLegGroup.position.set(-0.2, 0.7, 0);
    body.add(leftLegGroup);

    const leftUpperLegGeo = makeLumpy(new THREE.CylinderGeometry(0.14, 0.12, 0.3, 5), 0.06);
    const leftUpperLeg = new THREE.Mesh(leftUpperLegGeo, blobDarkMat);
    leftUpperLeg.name = 'leftUpperLeg';
    leftUpperLeg.position.y = -0.15;
    leftLegGroup.add(leftUpperLeg);

    const leftLowerLegGroup = new THREE.Group();
    leftLowerLegGroup.name = 'leftLowerLegGroup';
    leftLowerLegGroup.position.set(0, -0.3, 0);
    leftLegGroup.add(leftLowerLegGroup);

    const leftLowerLegGeo = makeLumpy(new THREE.CylinderGeometry(0.11, 0.09, 0.25, 5), 0.05);
    const leftLowerLeg = new THREE.Mesh(leftLowerLegGeo, blobDarkMat);
    leftLowerLeg.name = 'leftLowerLeg';
    leftLowerLeg.position.y = -0.12;
    leftLowerLegGroup.add(leftLowerLeg);

    // Foot nub (rounded blob foot, no shoe)
    const leftFoot = new THREE.Mesh(
        makeLumpy(new THREE.SphereGeometry(0.11, 6, 4), 0.04),
        blobMat
    );
    leftFoot.position.set(0, -0.28, 0.04);
    leftFoot.scale.set(1.1, 0.6, 1.3);
    leftLowerLegGroup.add(leftFoot);

    // --- Right Leg: short stubby blob leg ---
    const rightLegGroup = new THREE.Group();
    rightLegGroup.name = 'rightLegGroup';
    rightLegGroup.position.set(0.2, 0.7, 0);
    body.add(rightLegGroup);

    const rightUpperLegGeo = makeLumpy(new THREE.CylinderGeometry(0.14, 0.12, 0.3, 5), 0.06);
    const rightUpperLeg = new THREE.Mesh(rightUpperLegGeo, blobDarkMat);
    rightUpperLeg.name = 'rightUpperLeg';
    rightUpperLeg.position.y = -0.15;
    rightLegGroup.add(rightUpperLeg);

    const rightLowerLegGroup = new THREE.Group();
    rightLowerLegGroup.name = 'rightLowerLegGroup';
    rightLowerLegGroup.position.set(0, -0.3, 0);
    rightLegGroup.add(rightLowerLegGroup);

    const rightLowerLegGeo = makeLumpy(new THREE.CylinderGeometry(0.11, 0.09, 0.25, 5), 0.05);
    const rightLowerLeg = new THREE.Mesh(rightLowerLegGeo, blobDarkMat);
    rightLowerLeg.name = 'rightLowerLeg';
    rightLowerLeg.position.y = -0.12;
    rightLowerLegGroup.add(rightLowerLeg);

    const rightFoot = new THREE.Mesh(
        makeLumpy(new THREE.SphereGeometry(0.11, 6, 4), 0.04),
        blobMat
    );
    rightFoot.position.set(0, -0.28, 0.04);
    rightFoot.scale.set(1.1, 0.6, 1.3);
    rightLowerLegGroup.add(rightFoot);

    // --- Shadow (slightly larger for blob mass) ---
    const shadowGeo = new THREE.CircleGeometry(0.55, 12);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.01;
    shadow.name = 'shadow';
    group.add(shadow);

    return group;
}
