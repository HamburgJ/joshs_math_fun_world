/**
 * Zone 11 — The Number Theory Caverns
 *
 * A deep underground network of rooms and hallways.
 * Dark, amber-lit, glowing numbers scattered throughout.
 * 6 distinct areas descend deeper into the earth.
 * At the very bottom: a lava core you can jump into (and die).
 *
 * The world reacts to you:
 *  - Ulam spiral tiles glow brighter beneath your feet
 *  - Twin-prime stalactites sync-pulse when you stand between them
 *  - Numbers float in each chamber, getting stranger as you go deeper
 *  - The deepest chamber glows red with molten lava
 */

import * as THREE from 'three';
import { ZoneBase } from '../zone-base.js';
import { buildCavernShell, buildLighting } from './cavern-shell.js';
import { buildSieveWaterfall } from './sieve-waterfall.js';
import { buildUlamSpiral } from './ulam-spiral.js';
import { buildStalactites } from './stalactites.js';
import { buildNumberHallways, buildModularRoom, HALLWAY_AREAS } from './galleries.js';
import { buildRiemannGrotto } from './riemann-grotto.js';
import { registerReactions } from './reactions.js';

export class NumberCaverns extends ZoneBase {
    constructor() {
        super('NumberCaverns');
        this._hallwaysOffset = new THREE.Vector3(25, 0, 0);

        // ── Cavern shell (ceiling, floor, base light) ──
        const shell = buildCavernShell();
        this.group.add(shell);

        // ── Lighting ──
        const lighting = buildLighting();
        this.group.add(lighting);

        // ── Sieve Waterfall ──
        const { group: sieveGroup, uniforms: sieveUniforms } = buildSieveWaterfall();
        this.group.add(sieveGroup);
        this._sieveUniforms = sieveUniforms;

        // Sieve time animation
        this.addAnimator((dt, time) => {
            this._sieveUniforms.uTime.value = time;
        });

        // ── Ulam Spiral ──
        const {
            group: spiralGroup,
            primeTiles,
            interactables: spiralInteractables,
        } = buildUlamSpiral((text, opts) => this.makeTextTexture(text, opts));
        this.group.add(spiralGroup);

        for (const ia of spiralInteractables) {
            this.addInteractable(ia.position, ia.label, ia.type);
        }

        // ── Stalactites & Stalagmites ──
        const {
            group: stalGroup,
            tips: stalactiteTips,
            twinPairPositions,
        } = buildStalactites();
        this.group.add(stalGroup);

        // ── Deep Hallways (6 descending areas) ──
        const {
            group: hallwaysGroup,
            interactables: hallwaysInteractables,
        } = buildNumberHallways((text, opts) => this.makeTextTexture(text, opts));
        this.group.add(hallwaysGroup);

        for (const ia of hallwaysInteractables) {
            this.addInteractable(ia.position, ia.label, ia.type);
        }

        // ── Modular Arithmetic Room ──
        const {
            group: modGroup,
            platforms: modPlatforms,
            interactables: modInteractables,
        } = buildModularRoom((text, opts) => this.makeTextTexture(text, opts));
        this.group.add(modGroup);

        for (const ia of modInteractables) {
            this.addInteractable(ia.position, ia.label, ia.type);
        }

        // ── Riemann Grotto ──
        const {
            group: riemannGroup,
            uniforms: riemannUniforms,
            zeros: riemannZeros,
            interactables: riemannInteractables,
        } = buildRiemannGrotto((text, opts) => this.makeTextTexture(text, opts));
        this.group.add(riemannGroup);
        this._riemannUniforms = riemannUniforms;

        // Riemann time animation
        this.addAnimator((_dt, time) => {
            this._riemannUniforms.uTime.value = time;
        });

        // ── Ambient animations (stalactite tips, Riemann zeros, Ulam tiles) ──
        this.addAnimator((_dt, time) => {
            // Stalactite tip amber glow pulse
            const tipPulse = 0.4 + 0.3 * Math.sin(time * 2.5);
            for (const tip of stalactiteTips) {
                tip.material.emissiveIntensity = tipPulse;
            }

            // Riemann zero spheres gentle pulse
            const zeroPulse = 0.6 + 0.3 * Math.sin(time * 1.8 + 1.0);
            for (const sphere of riemannZeros) {
                sphere.material.emissiveIntensity = zeroPulse;
            }

            // Ulam spiral prime tiles subtle emissive breathing
            const tilePulse = 0.3 + 0.15 * Math.sin(time * 1.2);
            for (const tile of primeTiles) {
                tile.material.emissiveIntensity = tilePulse;
            }
        });

        for (const ia of riemannInteractables) {
            this.addInteractable(ia.position, ia.label, ia.type);
        }

        // Sieve interactable
        this.addInteractable(
            new THREE.Vector3(0, 5, -25),
            'The Waterfall',
            'sieve'
        );

        // ── Register all proximity reactions ──
        registerReactions(this, {
            primeTiles,
            stalactiteTips,
            twinPairPositions,
            sieveUniforms: this._sieveUniforms,
            riemannUniforms: this._riemannUniforms,
            riemannZeros,
            modPlatforms,
        });
    }
    getTerrainHeight(x, z) {
        const hx = x - this._hallwaysOffset.x;
        const hz = z - this._hallwaysOffset.z;
        
        for (let i = 0; i < HALLWAY_AREAS.length; i++) {
            const area = HALLWAY_AREAS[i];
            const dx = hx - area.pos[0];
            const dz = hz - area.pos[2];
            const halfW = area.size[0] / 2;
            const halfD = area.size[2] / 2;
            if (Math.abs(dx) <= halfW && Math.abs(dz) <= halfD) {
                return area.pos[1];
            }
        }
        
        for (let i = 0; i < HALLWAY_AREAS.length - 1; i++) {
            const a1 = HALLWAY_AREAS[i];
            const a2 = HALLWAY_AREAS[i+1];
            const cx = (a1.pos[0] + a2.pos[0]) / 2;
            const cz = (a1.pos[2] + a2.pos[2]) / 2;
            const distX = Math.abs(hx - cx);
            const distZ = Math.abs(hz - cz);
            const spanX = Math.abs(a2.pos[0] - a1.pos[0]);
            const spanZ = Math.abs(a2.pos[2] - a1.pos[2]);
            const rampLen = Math.sqrt(spanX*spanX + spanZ*spanZ);
            const dx = hx - a1.pos[0];
            const dz = hz - a1.pos[2];
            const curDist = Math.sqrt(dx*dx + dz*dz);
            if (Math.abs((hx - cx)*spanZ - (hz - cz)*spanX) / rampLen < 4) {
                if (curDist < rampLen) {
                    const t = curDist / rampLen;
                    return a1.pos[1] * (1 - t) + a2.pos[1] * t;
                }
            }
        }
        return 0;
    }
}
