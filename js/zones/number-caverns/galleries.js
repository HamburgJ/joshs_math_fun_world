import * as THREE from 'three';

/**
 * The Number Caverns — 6 interconnected areas descending deep underground.
 *
 * 1. Entrance Tunnel — dimly lit, first primes float in the air
 * 2. Fermat Suite — wider chamber with Fermat primes
 * 3. Perfect Number Drop — a dark room with perfect numbers
 * 4. Fibonacci Winding — a long narrow passage with Fibonacci sequence
 * 5. Mersenne Chamber — purple-lit room with Mersenne primes
 * 6. Lava Core — the deepest point, glowing red, jumping in kills you
 */

const HALLWAY_AREAS = [
    { name: 'Entrance Tunnel',   pos: [0, 0, 0],       size: [12, 0.5, 22],  color: 0x4a2a11, wallH: 6,  numbers: [2, 3, 5, 7, 11, 13] },
    { name: 'Fermat Suite',      pos: [14, -6, -24],   size: [26, 0.5, 26],  color: 0x3a2800, wallH: 8,  numbers: [3, 5, 17, 257, 65537] },
    { name: 'Perfect Drop',      pos: [24, -14, -48],  size: [16, 0.5, 16],  color: 0x221144, wallH: 7,  numbers: [6, 28, 496, 8128] },
    { name: 'Fibonacci Winding', pos: [38, -22, -40],  size: [8, 0.5, 32],   color: 0x224422, wallH: 5,  numbers: [1, 1, 2, 3, 5, 8, 13, 21] },
    { name: 'Mersenne Chamber',  pos: [52, -32, -24],  size: [22, 0.5, 22],  color: 0x442244, wallH: 10, numbers: [3, 7, 31, 127, 8191] },
    { name: 'Lava Core',         pos: [52, -48, 0],    size: [36, 0.5, 36],  color: 0xff3300, wallH: 12, isLava: true },
];

export { HALLWAY_AREAS };

// Seeded random for consistent number placement
function seededRandom(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

export function buildNumberHallways(makeTextTexture) {
    const group = new THREE.Group();
    group.position.set(25, 0, 0);
    group.name = 'NumberHallways';
    const interactables = [];
    const rooms = new THREE.Group();
    group.add(rooms);

    const rampMat  = new THREE.MeshLambertMaterial({ color: 0x4a3520, emissive: 0x2a1808, emissiveIntensity: 1.0, flatShading: true });
    const wallMat  = new THREE.MeshLambertMaterial({ color: 0x3a2a18, emissive: 0x241508, emissiveIntensity: 1.0, flatShading: true });

    HALLWAY_AREAS.forEach((area, i) => {
        const isLava = !!area.isLava;
        const rand = seededRandom(i * 1337 + 42);

        // ── Floor ──
        const floorColor = isLava ? area.color : area.color;
        const mat = isLava
            ? new THREE.MeshLambertMaterial({
                  color: 0xff2200,
                  emissive: 0xcc4400,
                  emissiveIntensity: 0.8,
                  flatShading: true,
              })
            : new THREE.MeshLambertMaterial({ color: floorColor, emissive: 0x2a1808, emissiveIntensity: 1.0, flatShading: true });

        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(area.size[0], area.size[1], area.size[2]), mat
        );
        floor.position.set(area.pos[0], area.pos[1], area.pos[2]);
        rooms.add(floor);

        // ── Walls (4 sides) ──
        const wH = area.wallH || 6;
        const hw = area.size[0] / 2;
        const hd = area.size[2] / 2;
        const wallColor = isLava ? 0x330000 : 0x3a2a18;
        const wMat = new THREE.MeshLambertMaterial({ color: wallColor, emissive: isLava ? 0x220000 : 0x241508, emissiveIntensity: 1.0, flatShading: true });

        // North wall
        const nWall = new THREE.Mesh(new THREE.BoxGeometry(area.size[0], wH, 0.5), wMat);
        nWall.position.set(area.pos[0], area.pos[1] + wH / 2, area.pos[2] - hd);
        rooms.add(nWall);
        // South wall
        const sWall = new THREE.Mesh(new THREE.BoxGeometry(area.size[0], wH, 0.5), wMat);
        sWall.position.set(area.pos[0], area.pos[1] + wH / 2, area.pos[2] + hd);
        rooms.add(sWall);
        // East wall
        const eWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, wH, area.size[2]), wMat);
        eWall.position.set(area.pos[0] + hw, area.pos[1] + wH / 2, area.pos[2]);
        rooms.add(eWall);
        // West wall
        const wWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, wH, area.size[2]), wMat);
        wWall.position.set(area.pos[0] - hw, area.pos[1] + wH / 2, area.pos[2]);
        rooms.add(wWall);

        // ── Ceiling ──
        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(area.size[0], 0.5, area.size[2]),
            new THREE.MeshLambertMaterial({ color: 0x2e1a10, emissive: 0x1a0f05, emissiveIntensity: 1.0, flatShading: true })
        );
        ceiling.position.set(area.pos[0], area.pos[1] + wH, area.pos[2]);
        rooms.add(ceiling);

        // ── Lighting ──
        if (isLava) {
            const lavaLight = new THREE.PointLight(0xff4400, 2.5, 50);
            lavaLight.position.set(area.pos[0], area.pos[1] + 4, area.pos[2]);
            rooms.add(lavaLight);
            // Secondary glow from below
            const underGlow = new THREE.PointLight(0xff2200, 1.5, 30);
            underGlow.position.set(area.pos[0], area.pos[1] + 1, area.pos[2]);
            rooms.add(underGlow);
        } else {
            // Amber torch-like lights — bright enough to see the room
            const light = new THREE.PointLight(0xFFBB66, 1.8, 40);
            light.position.set(area.pos[0], area.pos[1] + wH - 1, area.pos[2]);
            rooms.add(light);
            // Secondary fill — wider reach
            const fill = new THREE.PointLight(0xFFAA44, 1.0, 25);
            fill.position.set(area.pos[0] + hw * 0.5, area.pos[1] + 2, area.pos[2]);
            rooms.add(fill);
            // Third fill on opposite side
            const fill2 = new THREE.PointLight(0xFFAA44, 0.8, 20);
            fill2.position.set(area.pos[0] - hw * 0.5, area.pos[1] + 2, area.pos[2]);
            rooms.add(fill2);
        }

        // ── Floating numbers (sprites scattered in the room) ──
        if (area.numbers) {
            area.numbers.forEach((num, idx) => {
                const tex = makeTextTexture(String(num), {
                    width: 128, height: 128, fg: '#FFAA44', bg: '', fontSize: 64
                });
                const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                const sprite = new THREE.Sprite(spriteMat);

                const rx = area.pos[0] + (rand() - 0.5) * (area.size[0] * 0.7);
                const rz = area.pos[2] + (rand() - 0.5) * (area.size[2] * 0.7);
                const ry = area.pos[1] + 1.5 + rand() * 2.5;

                sprite.position.set(rx, ry, rz);
                sprite.scale.set(1.8, 1.8, 1);
                rooms.add(sprite);

                interactables.push({
                    position: new THREE.Vector3(25 + rx, ry, rz),
                    label: 'Number: ' + num,
                    type: 'examine',
                    radius: 2,
                });
            });
        }

        // ── Lava Core special interactable ──
        if (isLava) {
            interactables.push({
                position: new THREE.Vector3(25 + area.pos[0], area.pos[1] + 1, area.pos[2]),
                label: 'The Lava Core',
                type: 'lava_pool',
                radius: 12,
            });
        }

        // ── Ramp to the next area ──
        if (i < HALLWAY_AREAS.length - 1) {
            const next = HALLWAY_AREAS[i + 1];
            const dx = next.pos[0] - area.pos[0];
            const dy = next.pos[1] - area.pos[1];
            const dz = next.pos[2] - area.pos[2];
            const distXZ = Math.sqrt(dx * dx + dz * dz);

            // Ramp floor
            const rampGeo = new THREE.BoxGeometry(4, 0.5, distXZ);
            const ramp = new THREE.Mesh(rampGeo, rampMat);
            ramp.position.set(
                area.pos[0] + dx / 2,
                area.pos[1] + dy / 2,
                area.pos[2] + dz / 2,
            );
            ramp.rotation.order = 'YXZ';
            ramp.rotation.y = Math.atan2(dx, dz);
            ramp.rotation.x = -Math.atan2(dy, distXZ);
            rooms.add(ramp);

            // Ramp walls (left and right)
            const rampWallH = 4;
            for (const side of [-1, 1]) {
                const rwGeo = new THREE.BoxGeometry(0.4, rampWallH, distXZ);
                const rw = new THREE.Mesh(rwGeo, wallMat);
                // If yaw is Math.atan2(dx, dz), then the vector pointing "right" is:
                // rotated from +X by the same yaw.
                // +X rotated by yaw in XZ plane: X' = cos(yaw), Z' = -sin(yaw)
                // Wait, yaw = atan2(dx, dz). cos(yaw) = dz/dist, sin(yaw) = dx/dist.
                // So X' = dz/dist, Z' = -dx/dist.
                // Their nx, nz was: -sin(yaw) vs cos(yaw). Let's see: side is +/- 1.
                // Let's just use the Three.js local coordinate system by adding the walls as children to a group!
                // But if they are independent, let's fix nx, nz:
                // We want the walls offset to the left and right of the ramp center.
                // Ramp direction vector is (dx, 0, dz) / dist.
                // Right vector is (dz, 0, -dx) / dist.
                const rightX = dz / distXZ;
                const rightZ = -dx / distXZ;
                
                rw.position.set(
                    area.pos[0] + dx / 2 + rightX * side * 2,
                    area.pos[1] + dy / 2 + rampWallH / 2,
                    area.pos[2] + dz / 2 + rightZ * side * 2,
                );
                rw.rotation.order = 'YXZ';
                rw.rotation.y = Math.atan2(dx, dz);
                rw.rotation.x = -Math.atan2(dy, distXZ);
                rooms.add(rw);
            }

            // Dim ramp light
            const rampLight = new THREE.PointLight(0xFFAA44, 0.3, 15);
            rampLight.position.set(
                area.pos[0] + dx / 2,
                area.pos[1] + dy / 2 + 3,
                area.pos[2] + dz / 2,
            );
            rooms.add(rampLight);
        }
    });

    return { group, interactables };
}

export function buildModularRoom(makeTextTexture) {
    const group = new THREE.Group();
    group.position.set(-25, 0, 10);
    group.name = 'ModularArithmeticRoom';

    const platformGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.2, 6);
    const circleRadius = 4;
    const platforms = [];
    const interactables = [];

    for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * circleRadius;
        const pz = Math.sin(angle) * circleRadius;

        const hueShift = i / 7;
        const r = 0.8 + 0.2 * Math.sin(hueShift * Math.PI * 2);
        const g = 0.4 + 0.2 * Math.sin(hueShift * Math.PI * 2 + 1.0);
        const b = 0.1 + 0.1 * Math.sin(hueShift * Math.PI * 2 + 2.0);

        const platMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(r, g, b),
            emissive: new THREE.Color(r * 0.3, g * 0.3, b * 0.3),
            flatShading: true,
        });

        const platform = new THREE.Mesh(platformGeo, platMat);
        platform.position.set(px, 0.1, pz);
        platform.userData.index = i;
        platform.userData.baseEmissiveR = r * 0.3;
        platform.userData.baseEmissiveG = g * 0.3;
        platform.userData.baseEmissiveB = b * 0.3;
        group.add(platform);
        platforms.push(platform);

        // Number label sprite
        const tex = makeTextTexture(String(i), {
            width: 64, height: 64, fg: '#FFAA44', bg: '', fontSize: 36,
        });
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(0.6, 0.6, 1);
        sprite.position.set(px, 0.6, pz);
        group.add(sprite);

        interactables.push({
            position: new THREE.Vector3(-25 + px, 0.6, 10 + pz),
            label: i + ' mod 7',
            type: 'mod-ring',
        });
    }

    return { group, platforms, interactables };
}
