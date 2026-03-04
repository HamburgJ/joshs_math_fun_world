const fs = require('fs');
let code = fs.readFileSync('js/camera.js', 'utf8');

code = code.replace(/this\._terrainClearance = 1\.5;/, 'this._terrainClearance = 1.5;\n        this.colliders = [];');

const collisionLogic = `
        let finalDistance = effDistance;

        // --- Raycast Collisions (against 2D colliders mapped to 3D) ---
        if (this.colliders && this.colliders.length > 0) {
            const camVec = new THREE.Vector3(
                Math.sin(effPitch) * Math.sin(this.orbitAngle),
                Math.cos(effPitch),
                Math.sin(effPitch) * Math.cos(this.orbitAngle)
            );
            
            const px = targetPosition.x, pz = targetPosition.z;
            const cx = camVec.x, cz = camVec.z;
            
            for (const col of this.colliders) {
                // Circle collider
                if (col.x !== undefined && col.radius !== undefined) {
                    // Line-circle intersection
                    const f = {x: px - col.x, z: pz - col.z};
                    const a = cx*cx + cz*cz;
                    const b = 2 * (f.x*cx + f.z*cz);
                    const c = (f.x*f.x + f.z*f.z) - col.radius*col.radius;
                    let discriminant = b*b - 4*a*c;
                    if (discriminant > 0) {
                        discriminant = Math.sqrt(discriminant);
                        const t1 = (-b - discriminant)/(2*a);
                        if (t1 > 0 && t1 < finalDistance) finalDistance = t1 * 0.9;
                    }
                }
                // AABB collider
                if (col.min && col.max) {
                    let tNear = -Infinity, tFar = Infinity;
                    const axes = [ { d: cx, p: px, min: col.min.x, max: col.max.x }, { d: cz, p: pz, min: col.min.z, max: col.max.z } ];
                    let intersects = true;
                    for (const axis of axes) {
                        if (axis.d === 0) { if (axis.p < axis.min || axis.p > axis.max) intersects = false; }
                        else {
                            let t1 = (axis.min - axis.p) / axis.d;
                            let t2 = (axis.max - axis.p) / axis.d;
                            if (t1 > t2) { const temp = t1; t1 = t2; t2 = temp; }
                            if (t1 > tNear) tNear = t1;
                            if (t2 < tFar) tFar = t2;
                            if (tNear > tFar || tFar < 0) intersects = false;
                        }
                    }
                    if (intersects && tNear > 0 && tNear < finalDistance) finalDistance = tNear * 0.9;
                }
            }
        }
`;

code = code.replace(/const effDistance = this\.distance \+ \(SIT_DISTANCE - this\.distance\) \* pullT;/, 'const effDistance = this.distance + (SIT_DISTANCE - this.distance) * pullT;\n'+collisionLogic);
code = code.replace(/Math\.sin\(effPitch\) \* Math\.sin\(this\.orbitAngle\) \* effDistance/g, `Math.sin(effPitch) * Math.sin(this.orbitAngle) * finalDistance`);
code = code.replace(/Math\.cos\(effPitch\) \* effDistance/g, `Math.cos(effPitch) * finalDistance`);
code = code.replace(/Math\.sin\(effPitch\) \* Math\.cos\(this\.orbitAngle\) \* effDistance/g, `Math.sin(effPitch) * Math.cos(this.orbitAngle) * finalDistance`);

fs.writeFileSync('js/camera.js', code, 'utf8');

let mainCode = fs.readFileSync('js/main.js', 'utf8');
mainCode = mainCode.replace(/josh\.colliders\s*=\s*\(toZone === 'green_field'\)\s*\?\s*\(field\.userData\.colliders\s*\|\|\s*\[\]\)\s*:\s*\[\];/, (match) => {
    return match + '\n    cameraCtrl.colliders = josh.colliders;';
});
fs.writeFileSync('js/main.js', mainCode, 'utf8');
