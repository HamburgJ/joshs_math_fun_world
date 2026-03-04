/**
 * entrance.js — The Grand Gate of Josh's Math Fun World.
 *
 * The player spawns in twilight ~260 units from a massive glowing gate.
 * The gate, clock tower spire, and path lanterns are all fog:false so
 * they shine as beacons through the mist. As the player walks forward
 * the fog thins, ambient light rises, and the walled hub is revealed.
 *
 * NOT total darkness — the approach is a dusky twilight with clear
 * direction. The player should never feel lost.
 *
 * Shell Bingby says: "Every great world deserves a great door.
 * Make it big enough to see from orbit."
 */

import * as THREE from 'three';
import { getTerrainHeight } from './noise.js';


// =====================================================================
//  CONFIGURATION
// =====================================================================

const GATE_Z          = 80;      // z of the gate (south edge of hub oval)
const GATE_HALF_W     = 9;       // half-width of the gate opening (matches field.js)
const GATE_HEIGHT     = 18;      // tall gate pillars
const BEAM_HEIGHT     = 1.5;     // horizontal beam thickness
const SIGN_PANEL_W    = 16;      // width of the title text panel
const SIGN_PANEL_H    = 5;       // height of the title text panel

const ARRIVAL_START_Z = 260;     // Josh's spawn z
const ARRIVAL_END_Z   = 75;      // z at which arrival completes (just past gate)

// Approach lighting — NOT total darkness, more like deep twilight
const APPROACH_FOG_DENSITY  = 0.007;  // thin enough to see gate from far away
const APPROACH_AMBIENT      = 0.12;   // twilight floor — things are dimly visible
const APPROACH_SKY_COLOR    = 0x0a1530; // deep navy blue, not black

// ── Reusable scratch colors for per-frame arrival update ────────────────
const _duskTop = new THREE.Color();
const _duskBot = new THREE.Color();
const _duskBg  = new THREE.Color();

// Title colors matching the HTML title-screen blocks
const TITLE_COLORS = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#6C5CE7', '#F38181', '#00B894',
    '#FF9F43', '#0984E3', '#FD79A8', '#2ED573',
    '#E17055', '#A29BFE', '#00CEC9',
    '#FF4757', '#FDCB6E', '#6C5CE7', '#55E6C1', '#FF9F43',
];

// Title lines — must match title-screen.js exactly
const TITLE_LINES = [
    {
        text: "JOSH'S",
        colors:    ['#FF6B6B', '#4ECDC4', '#FFE66D', '#6C5CE7', '#F38181', '#00B894'],
        rotations: [-4, 3, -6, 5, -2, 4],
    },
    {
        text: 'MATH FUN',
        colors:    ['#FF9F43', '#0984E3', '#FD79A8', '#2ED573', null, '#E17055', '#A29BFE', '#00CEC9'],
        rotations: [-5, 3, -4, 6, 0, 3, -5, 4],
    },
    {
        text: 'WORLD',
        colors:    ['#FF4757', '#FDCB6E', '#6C5CE7', '#55E6C1', '#FF9F43'],
        rotations: [3, -5, 4, -3, 6],
    },
];


// =====================================================================
//  SIGN GEOMETRY
// =====================================================================

/**
 * Build the massive entrance gate — visible from 260 units away.
 * All materials use fog: false so they glow through the twilight mist.
 */
function buildSignGroup() {
    const group = new THREE.Group();
    group.name = 'entrance-sign';

    const groundL = getTerrainHeight(-GATE_HALF_W, GATE_Z);
    const groundR = getTerrainHeight( GATE_HALF_W, GATE_Z);
    const groundC = getTerrainHeight(0, GATE_Z);
    const baseY   = Math.min(groundL, groundR, groundC) - 0.5;

    // ── Massive gate pillars ────────────────────────────────────────
    const pillarGeo = new THREE.BoxGeometry(2.0, GATE_HEIGHT, 2.0);
    const pillarMat = new THREE.MeshBasicMaterial({
        color: 0x6e63d9, fog: false,
    });

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-GATE_HALF_W, baseY + GATE_HEIGHT / 2, GATE_Z);
    group.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(GATE_HALF_W, baseY + GATE_HEIGHT / 2, GATE_Z);
    group.add(rightPillar);

    // ── Pillar caps (golden pyramids) ───────────────────────────────
    const capGeo = new THREE.ConeGeometry(1.5, 2.5, 4);
    const capMat = new THREE.MeshBasicMaterial({ color: 0xf5cc45, fog: false });
    const leftCap = new THREE.Mesh(capGeo, capMat);
    leftCap.position.set(-GATE_HALF_W, baseY + GATE_HEIGHT + 1.25, GATE_Z);
    group.add(leftCap);
    const rightCap = new THREE.Mesh(capGeo, capMat);
    rightCap.position.set(GATE_HALF_W, baseY + GATE_HEIGHT + 1.25, GATE_Z);
    group.add(rightCap);

    // ── Outer wing walls connecting to perimeter ────────────────────
    const wingGeo = new THREE.BoxGeometry(5, GATE_HEIGHT * 0.6, 1.5);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x43328e, fog: false });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-GATE_HALF_W - 3.5, baseY + GATE_HEIGHT * 0.3, GATE_Z);
    group.add(leftWing);
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(GATE_HALF_W + 3.5, baseY + GATE_HEIGHT * 0.3, GATE_Z);
    group.add(rightWing);

    // ── Horizontal beam ─────────────────────────────────────────────
    const beamWidth = GATE_HALF_W * 2 + 2.0;
    const beamGeo = new THREE.BoxGeometry(beamWidth, BEAM_HEIGHT, 2.0);
    const beamMat = new THREE.MeshBasicMaterial({
        color: 0x43bda6, fog: false,
    });
    const beamY = baseY + GATE_HEIGHT + BEAM_HEIGHT / 2;
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, beamY, GATE_Z);
    group.add(beam);

    // ── Secondary lower beam ────────────────────────────────────────
    const lowerBeamGeo = new THREE.BoxGeometry(beamWidth - 2, 0.5, 1.0);
    const lowerBeam = new THREE.Mesh(lowerBeamGeo,
        new THREE.MeshBasicMaterial({ color: 0x5c50c4, fog: false })
    );
    lowerBeam.position.set(0, baseY + GATE_HEIGHT - 1, GATE_Z);
    group.add(lowerBeam);

    // ── Text panel ──────────────────────────────────────────────────
    const textPanel = createTitlePanel();
    textPanel.position.set(0, beamY - BEAM_HEIGHT / 2 - SIGN_PANEL_H / 2 - 0.3, GATE_Z + 1.2);
    group.add(textPanel);

    // ── Decorative bulbs along the beam ─────────────────────────────
    const bulbGeo = new THREE.SphereGeometry(0.25, 4, 3);
    const bulbCount = 20;
    for (let i = 0; i < bulbCount; i++) {
        const t = (i / (bulbCount - 1));
        const bx = -GATE_HALF_W + t * GATE_HALF_W * 2;
        const color = TITLE_COLORS[i % TITLE_COLORS.length];
        const bulb = new THREE.Mesh(bulbGeo,
            new THREE.MeshBasicMaterial({ color, fog: false })
        );
        bulb.position.set(bx, beamY + BEAM_HEIGHT / 2 + 0.25, GATE_Z);
        bulb.userData.phase = i * 0.35;
        group.add(bulb);
    }

    // ── Bulbs along the pillars ─────────────────────────────────────
    for (let side = -1; side <= 1; side += 2) {
        for (let j = 0; j < 8; j++) {
            const py = baseY + 1.5 + j * 2.0;
            const color = TITLE_COLORS[(j + (side > 0 ? 8 : 0)) % TITLE_COLORS.length];
            const bulb = new THREE.Mesh(bulbGeo,
                new THREE.MeshBasicMaterial({ color, fog: false })
            );
            bulb.position.set(side * GATE_HALF_W, py, GATE_Z + 1.1);
            bulb.userData.phase = j * 0.7 + side * 2;
            group.add(bulb);
        }
    }

    // ── Approach path lanterns (every ~15 units along the corridor) ──
    const lanternGeo = new THREE.SphereGeometry(0.3, 4, 3);
    const lanternPostGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
    const lanternPostMat = new THREE.MeshBasicMaterial({ color: 0x5a4a3a, fog: false });

    for (let d = 0; d < 12; d++) {
        const pz = GATE_Z + 12 + d * 15;
        for (let side = -1; side <= 1; side += 2) {
            const px = side * 4;
            const gy = getTerrainHeight(px, pz);
            const color = TITLE_COLORS[(d * 2 + (side > 0 ? 1 : 0)) % TITLE_COLORS.length];

            // Post
            const post = new THREE.Mesh(lanternPostGeo, lanternPostMat);
            post.position.set(px, gy + 1.25, pz);
            group.add(post);

            // Lantern globe
            const lantern = new THREE.Mesh(lanternGeo,
                new THREE.MeshBasicMaterial({ color, fog: false, transparent: true, opacity: 0.85 })
            );
            lantern.position.set(px, gy + 2.7, pz);
            lantern.userData.phase = d * 0.4 + side;
            group.add(lantern);

            // Small point light for local illumination
            if (d % 2 === 0) {
                const light = new THREE.PointLight(
                    parseInt(color.replace('#', ''), 16), 0.8, 12, 2
                );
                light.position.set(px, gy + 2.8, pz);
                group.add(light);
            }
        }
    }

    // ── Point lights for glow ───────────────────────────────────────
    const centerLight = new THREE.PointLight(0xf5cc45, 4.0, 60, 1.2);
    centerLight.position.set(0, beamY - 2, GATE_Z + 5);
    group.add(centerLight);

    const leftLight = new THREE.PointLight(0xe86464, 2.0, 35, 1.5);
    leftLight.position.set(-GATE_HALF_W, beamY - 4, GATE_Z + 3);
    group.add(leftLight);

    const rightLight = new THREE.PointLight(0x43bda6, 2.0, 35, 1.5);
    rightLight.position.set(GATE_HALF_W, beamY - 4, GATE_Z + 3);
    group.add(rightLight);

    // Far-reaching beacon — THIS is what draws the player forward
    const beaconLight = new THREE.PointLight(0xf5cc45, 5.0, 200, 0.8);
    beaconLight.position.set(0, beamY + 5, GATE_Z + 2);
    group.add(beaconLight);

    // Ground glow around gate entrance
    const groundGlow = new THREE.PointLight(0xf5cc45, 2.5, 40, 1.5);
    groundGlow.position.set(0, baseY + 0.5, GATE_Z + 8);
    group.add(groundGlow);

    // ── Arrow on the ground ─────────────────────────────────────────
    const arrowMat = new THREE.MeshBasicMaterial({
        color: 0xf5cc45, fog: false, transparent: true, opacity: 0.6,
    });
    const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 1.5, 3),
        arrowMat
    );
    const arrowGroundY = getTerrainHeight(0, GATE_Z + 5);
    arrow.position.set(0, arrowGroundY + 0.2, GATE_Z + 5);
    arrow.rotation.x = -Math.PI / 2;
    arrow.rotation.z = Math.PI;
    group.add(arrow);

    return group;
}


// =====================================================================
//  HELPER FUNCTIONS
// =====================================================================

function createTitlePanel() {
    const canvasW = 1024;
    const canvasH = 340;
    const canvas  = document.createElement('canvas');
    canvas.width  = canvasW;
    canvas.height = canvasH;
    const ctx     = canvas.getContext('2d');

    // Background
    ctx.fillStyle = 'rgba(15, 10, 30, 0.9)';
    roundRect(ctx, 4, 4, canvasW - 8, canvasH - 8, 18);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#FFE66D';
    ctx.lineWidth = 5;
    roundRect(ctx, 4, 4, canvasW - 8, canvasH - 8, 18);
    ctx.stroke();
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 3;
    roundRect(ctx, 12, 12, canvasW - 24, canvasH - 24, 14);
    ctx.stroke();

    function drawBlock(char, color, rot, x, y) {
        const isApo = char === "'";
        const w = isApo ? 38 : 84;
        const h = isApo ? 55 : 84;
        const r = isApo ? 10 : 14; 

        ctx.save();
        ctx.translate(x, y + (isApo ? -14 : 0)); 
        ctx.rotate((rot * Math.PI) / 180);

        // Box shadow - blurred
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'; // matches box-shadow blur part
        ctx.shadowBlur = 16;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath(); roundRect(ctx, -w/2, -h/2, w, h, r); ctx.fill();

        // Solid sharp shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.save();
        ctx.translate(3, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); roundRect(ctx, -w/2, -h/2, w, h, r); ctx.fill();
        ctx.restore();

        // Main background fill
        ctx.fillStyle = color;
        ctx.beginPath(); roundRect(ctx, -w/2, -h/2, w, h, r); ctx.fill();

        // Insets
        ctx.save();
        ctx.clip(); 
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 4; 
        ctx.beginPath(); roundRect(ctx, -w/2, -h/2 - 2, w, h, r); ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.beginPath(); roundRect(ctx, -w/2, -h/2 + 2, w, h, r); ctx.stroke();
        ctx.restore();

        // Border
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.beginPath(); roundRect(ctx, -w/2, -h/2, w, h, r); ctx.stroke();

        // Top and Left lighter borders
        ctx.beginPath();
        ctx.moveTo(-w/2, h/2 - r);
        ctx.lineTo(-w/2, -h/2 + r);
        ctx.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
        ctx.lineTo(w/2 - r, -h/2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.stroke();

        // Text
        ctx.font = `900 ${isApo ? 42 : 52}px "Arial Black", "Impact", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text shadow 
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.fillText(char, 0, isApo ? -2 : 4); 

        ctx.restore();
    }

    const startY = 82;
    const dy = 88;

    for (let l = 0; l < TITLE_LINES.length; l++) {
        const line = TITLE_LINES[l];
        // Calculate total width
        let totalW = 0;
        const gaps = line.text.length - 1;
        for (let i = 0; i < line.text.length; i++) {
            const ch = line.text[i];
            if (ch === ' ') totalW += 32;
            else if (ch === "'") totalW += 38;
            else totalW += 84;
        }
        totalW += gaps * 10;

        let currX = (canvasW - totalW) / 2;
        const y = startY + l * dy;

        for (let i = 0; i < line.text.length; i++) {
            const ch = line.text[i];
            let bw;
            if (ch === ' ') {
                bw = 32;
            } else if (ch === "'") {
                bw = 38;
                drawBlock(ch, line.colors[i], line.rotations[i], currX + bw/2, y);
            } else {
                bw = 84;
                drawBlock(ch, line.colors[i], line.rotations[i], currX + bw/2, y);
            }
            currX += bw + 10;
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;

    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        fog: false,
        side: THREE.DoubleSide,
    });

    return new THREE.Mesh(new THREE.PlaneGeometry(SIGN_PANEL_W, SIGN_PANEL_H), mat);
}


function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}


// =====================================================================
//  ARRIVAL CONTROLLER
// =====================================================================

/**
 * Manages the twilight-to-daylight arrival sequence.
 *
 * Key difference from before: NOT total darkness.
 * The approach starts in deep twilight (ambient ~0.12) with a
 * navy blue sky. The gate, clock tower, and lanterns glow brightly
 * through thin fog (density ~0.007). The player can always see where
 * to go. As they walk, fog thins and light increases until full daylight.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.DirectionalLight} sunlight
 * @param {THREE.AmbientLight} ambient
 * @param {object} [opts]
 * @param {boolean} [opts.skip=false]
 * @param {THREE.Group} [opts.field]
 */
export class ArrivalController {
    constructor(scene, sunlight, ambient, opts = {}) {
        this.scene    = scene;
        this.sun      = sunlight;
        this.ambient  = ambient;
        this.complete = opts.skip || false;
        this.progress = this.complete ? 1 : 0;
        this.elapsed  = 0;
        this._field   = opts.field || null;

        // Build the gate and add to the field group (not scene root)
        // so it's automatically hidden when leaving the hub
        this.signGroup = buildSignGroup();
        if (opts.field) {
            opts.field.add(this.signGroup);
        } else {
            scene.add(this.signGroup);
        }

        // Find sky dome
        this._skyDome = scene.getObjectByName('sky-dome');
        this._skyOriginalTop    = this._skyDome?.material?.uniforms?.topColor?.value?.clone();
        this._skyOriginalBottom = this._skyDome?.material?.uniforms?.bottomColor?.value?.clone();
        this._originalBackground = scene.background?.clone();

        // Store target light values
        this._targetSunIntensity     = sunlight.intensity;
        this._targetAmbientIntensity = ambient.intensity;

        if (!this.complete) {
            // Twilight approach — NOT pitch black
            scene.fog = new THREE.FogExp2(APPROACH_SKY_COLOR, APPROACH_FOG_DENSITY);
            scene.background = new THREE.Color(APPROACH_SKY_COLOR);
            sunlight.intensity = 0.05;
            ambient.intensity  = APPROACH_AMBIENT;

            // Dim the sky dome to deep twilight navy
            if (this._skyDome) {
                this._skyDome.material.uniforms.topColor.value.set(0x050e22);
                this._skyDome.material.uniforms.bottomColor.value.set(APPROACH_SKY_COLOR);
            }
        } else {
            // Returning player: reveal portals immediately
            if (this._field && this._field.userData.revealPortals) {
                this._field.userData.revealPortals();
            }
        }
    }

    /**
     * Call each frame. Adjusts fog and lighting based on Josh's position.
     */
    update(joshPosition, dt) {
        this.elapsed += dt;

        // Animate sign bulbs
        for (const child of this.signGroup.children) {
            if (child.userData.phase !== undefined) {
                const pulse = 0.7 + 0.4 * Math.sin(this.elapsed * 3 + child.userData.phase);
                child.scale.setScalar(pulse);
            }
        }

        if (this.complete) return;

        // Progress: z=260 (spawn) → progress 0; z=75 (through gate) → progress 1
        const rawProgress = 1 - (joshPosition.z - ARRIVAL_END_Z) / (ARRIVAL_START_Z - ARRIVAL_END_Z);
        const targetProgress = Math.max(0, Math.min(1, rawProgress));

        this.progress += (targetProgress - this.progress) * (1 - Math.exp(-3 * dt));

        // Time bonus (curiosity reward for standing still)
        const timeBonus = Math.min(0.08, this.elapsed * 0.003);
        const p = Math.min(1, this.progress + timeBonus);

        // Cubic easing — stays dusky longer, clears fast near end
        const fogProgress = p * p * p;

        // Fog density: 0.007 → ~0.001 (very thin at end, world state takes over)
        this.scene.fog.density = APPROACH_FOG_DENSITY * (1 - fogProgress * 0.85);

        // Sky: twilight navy → original bright sky
        if (this._skyDome && this._skyOriginalTop) {
            _duskTop.set(0x050e22);
            _duskBot.set(APPROACH_SKY_COLOR);
            this._skyDome.material.uniforms.topColor.value.copy(
                _duskTop.lerp(this._skyOriginalTop, fogProgress)
            );
            _duskBot.set(APPROACH_SKY_COLOR); // reset after lerp mutates it
            this._skyDome.material.uniforms.bottomColor.value.copy(
                _duskBot.lerp(this._skyOriginalBottom, fogProgress)
            );
        }
        if (this._originalBackground) {
            _duskBg.set(APPROACH_SKY_COLOR);
            this.scene.background.copy(_duskBg.lerp(this._originalBackground, fogProgress));
        }

        // Lighting: twilight → full daylight
        this.sun.intensity    = 0.05 + (this._targetSunIntensity - 0.05) * fogProgress;
        this.ambient.intensity = APPROACH_AMBIENT +
            (this._targetAmbientIntensity - APPROACH_AMBIENT) * fogProgress;

        // Completion check
        if (p > 0.97) {
            this.complete = true;
            this.scene.fog = new THREE.Fog(0xD8ECFF, 80, 350);
            if (this._originalBackground) this.scene.background.copy(this._originalBackground);
            if (this._skyDome && this._skyOriginalTop) {
                this._skyDome.material.uniforms.topColor.value.copy(this._skyOriginalTop);
                this._skyDome.material.uniforms.bottomColor.value.copy(this._skyOriginalBottom);
            }
            this.sun.intensity    = this._targetSunIntensity;
            this.ambient.intensity = this._targetAmbientIntensity;

            // Reveal portal arches
            if (this._field && this._field.userData.revealPortals) {
                this._field.userData.revealPortals();
            }
        }
    }
}
