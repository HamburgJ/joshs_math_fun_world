const fs = require('fs');
let c = fs.readFileSync('js/world/field.js', 'utf8');

// 1. Insert hub assets after trainData block
const anchor = 'world.userData.trainData = trainData;';
const idx = c.indexOf(anchor);
if (idx === -1) { console.log('ERROR: anchor not found'); process.exit(1); }

const insertAfter = idx + anchor.length;

const hubBlock = [
    '',
    '    // ── Hub set pieces ──────────────────────────────────────────────',
    '    const ferrisWheel = createFerrisWheel();',
    '    world.add(ferrisWheel.group);',
    '    world.userData.colliders.push(ferrisWheel.collider);',
    '',
    '    const windmill = createWindmill();',
    '    world.add(windmill.group);',
    '    world.userData.colliders.push(windmill.collider);',
    '',
    '    const stream = createStream();',
    '    world.add(stream.group);',
    '',
    '    const bridge = createBridge();',
    '    world.add(bridge.group);',
    '    world.userData.colliders.push(bridge.collider);',
    '',
    '    const parkour = createParkourTower();',
    '    world.add(parkour.group);',
    '    world.userData.colliders.push(...parkour.colliders);',
    '',
    '    const bushes = createBushes();',
    '    world.add(bushes.group);',
    '    world.userData.colliders.push(...bushes.colliders);',
    '',
    '    const lampposts = createLampposts();',
    '    world.add(lampposts.group);',
    '',
    '    const picnic = createPicnicArea();',
    '    world.add(picnic.group);',
    '',
    '    const trees = createTrees();',
    '    world.add(trees.group);',
    '    world.userData.colliders.push(...trees.colliders);',
    '',
    '    const butterflies = createButterflies();',
    '    world.add(butterflies.group);',
    '',
    '    const wallBanners = createWallBanners();',
    '    world.add(wallBanners.group);',
    '',
].join('\n');

c = c.slice(0, insertAfter) + '\n' + hubBlock + c.slice(insertAfter);

// 2. Update updateAmbience to include hub asset animations
const ambienceAnchor = 'if (trainData) trainData.update(dt);';
const ambienceIdx = c.indexOf(ambienceAnchor);
if (ambienceIdx === -1) {
    console.log('WARNING: updateAmbience anchor not found, skipping animation hookup');
} else {
    const afterAmbience = ambienceIdx + ambienceAnchor.length;
    const animBlock = [
        '',
        '        // Hub set piece animations',
        '        ferrisWheel.update(dt);',
        '        windmill.update(dt);',
        '        butterflies.update(dt);',
        '        wallBanners.update(dt);',
    ].join('\n');
    c = c.slice(0, afterAmbience) + animBlock + c.slice(afterAmbience);
}

fs.writeFileSync('js/world/field.js', c, 'utf8');
console.log('Done: hub assets + animations wired in');
