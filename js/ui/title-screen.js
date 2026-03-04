/**
 * title-screen.js — The grand entrance to Josh's Math Fun World.
 *
 * Each letter of the title is rendered as a colorful toy block,
 * slightly tilted and bounced in with staggered spring physics.
 *
 * Shell Bingby prototyped this screen on a Commodore 64 in 1986
 * using nothing but POKE statements and sheer force of will.
 * The technology has finally caught up.
 */

// ── Letter block definitions ─────────────────────────────────────────────
// Each line of the logo: text, per-character colors, per-character rotations.
// Spaces get a gap, apostrophes get a mini-block.
export const TITLE_LINES = [
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

/**
 * Creates and displays the title screen overlay.
 * Returns a Promise that resolves when the user clicks/taps/presses a key.
 * The overlay removes itself from the DOM after a fade-out transition.
 *
 * @returns {Promise<void>}
 */
export function showTitleScreen() {
    const screen = document.createElement('div');
    screen.id = 'title-screen';

    // ── Logo — the block letters ─────────────────────────────────────
    const logo = document.createElement('div');
    logo.className = 'title-logo';

    let blockIndex = 0;

    TITLE_LINES.forEach((line) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'title-line';

        for (let i = 0; i < line.text.length; i++) {
            const ch = line.text[i];

            // Spaces become gaps between words
            if (ch === ' ') {
                const spacer = document.createElement('span');
                spacer.className = 'title-spacer';
                lineEl.appendChild(spacer);
                continue;
            }

            const block = document.createElement('span');
            block.className = 'title-block';
            if (ch === "'") block.classList.add('apostrophe');

            block.textContent = ch;
            block.style.backgroundColor = line.colors[i];
            block.style.setProperty('--rot', `${line.rotations[i]}deg`);
            block.style.animationDelay = `${blockIndex * 0.07}s`;

            lineEl.appendChild(block);
            blockIndex++;
        }

        logo.appendChild(lineEl);
    });

    screen.appendChild(logo);

    // ── Controls hint ────────────────────────────────────────────────
    const controls = document.createElement('div');
    controls.className = 'title-controls';
    controls.innerHTML =
        'WASD \u2014 Move \u00A0\u2022\u00A0 Mouse \u2014 Look \u00A0\u2022\u00A0 ' +
        'Space \u2014 Jump \u00A0\u2022\u00A0 E \u2014 Interact';
    screen.appendChild(controls);

    // ── "Click to Enter" prompt ──────────────────────────────────────
    const subtitle = document.createElement('div');
    subtitle.className = 'title-subtitle';
    subtitle.textContent = '\u2726 CLICK TO ENTER \u2726';
    screen.appendChild(subtitle);

    document.body.appendChild(screen);

    // ── Dismiss logic ────────────────────────────────────────────────
    return new Promise((resolve) => {
        const dismiss = () => {
            screen.classList.add('title-exit');
            setTimeout(() => {
                screen.remove();
                resolve();
            }, 700);

            // Clean up listeners immediately
            screen.removeEventListener('click', dismiss);
            document.removeEventListener('keydown', keyDismiss);
            document.removeEventListener('touchstart', dismiss);
        };

        const keyDismiss = (e) => {
            if (e.key === 'Escape') return;
            dismiss();
        };

        // Small delay so the drop-in animation plays before input is active
        setTimeout(() => {
            screen.addEventListener('click', dismiss);
            document.addEventListener('keydown', keyDismiss);
            document.addEventListener('touchstart', dismiss);
        }, 800);
    });
}
