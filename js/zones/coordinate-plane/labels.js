import * as THREE from 'three';

/**
 * Axis label sprites for the Coordinate Plane.
 *
 * Number sprites at each integer from -10 to 10 along both axes.
 * PS1-style NearestFilter textures.
 */

/**
 * Create a single billboard sprite with a number rendered via canvas texture.
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} tint — hex color
 * @returns {THREE.Sprite}
 */
function makeLabel(text, x, y, z, tint) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Semi-transparent dark backing
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Number text
    ctx.fillStyle = '#' + new THREE.Color(tint).getHexString();
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
        sizeAttenuation: true,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(0.6, 0.6, 1);
    sprite.name = `Label_${text}_${x}_${z}`;
    return sprite;
}

/**
 * Build all axis labels (integers -10..10 on both axes + origin).
 * @returns {THREE.Group}
 */
export function buildAxisLabels() {
    const labelsGroup = new THREE.Group();
    labelsGroup.name = 'AxisLabels';
    // Math formula labels removed
    return labelsGroup;
}
