const fs = require('fs');
let code = fs.readFileSync('js/world/sky.js', 'utf8');

const tOld = `// Crazy trippy sky noise`;
const tNew = `vec4 finalColor = dayColor;
                if (uTrippyForce > 0.001) {
                // Crazy trippy sky noise`;

code = code.replace(tOld, tNew);

const oldMix = `gl_FragColor = vec4(mix(dayColor.rgb, trippyColor, uTrippyForce), 1.0);`;
const newMix = `finalColor = vec4(mix(dayColor.rgb, trippyColor, uTrippyForce), 1.0);
                }`;

code = code.replace(oldMix, newMix);

const oldFrag = `gl_FragColor = floor(gl_FragColor * 32.0) / 32.0;`;
const newFrag = `gl_FragColor = floor(finalColor * 32.0) / 32.0;`;

if (code.includes(oldFrag)) {
    code = code.replace(oldFrag, newFrag);
} else {
    // maybe it does not have banding? Let's check where gl_FragColor is set
}

fs.writeFileSync('js/world/sky.js', code, 'utf8');