/**
 * arg.js — The alternate reality layer.
 *
 * This module manages browser-level creepiness:
 *   - Styled developer console messages from "Shell Bingby"
 *   - Browser tab title that silently drifts after extended play
 *   - Favicon that shifts based on zones visited
 *   - Hidden localStorage breadcrumbs for DevTools snoopers
 *
 * None of this is surfaced in the game UI. Players who open
 * DevTools or inspect the page discover a second layer.
 *
 * Shell Bingby says: "The game is the surface. The source is the depth.
 * The console is the subconscious."
 */

// ── Console Messages ─────────────────────────────────────────────────────

const BINGBY_STYLE = 'color: #4aff71; font-family: monospace; font-size: 12px;';
const BINGBY_STYLE_DIM = 'color: #2a7a41; font-family: monospace; font-size: 11px;';
const BINGBY_STYLE_WARN = 'color: #ff9944; font-family: monospace; font-size: 11px;';
const BINGBY_HEADER = 'color: #4aff71; font-family: monospace; font-size: 14px; font-weight: bold;';

/**
 * Log entries from Shell Bingby. Printed on startup.
 * Session count determines which messages appear.
 */
const STARTUP_MESSAGES = [
    // Always shown on first session
    {
        minSession: 1, maxSession: 1,
        lines: [
            ['%c╔══════════════════════════════════════════╗', BINGBY_HEADER],
            ['%c║  JOSH\'S MATH FUN WORLD — Build 1597     ║', BINGBY_HEADER],
            ['%c║  © 1986 Shell Bingby                     ║', BINGBY_HEADER],
            ['%c╚══════════════════════════════════════════╝', BINGBY_HEADER],
        ],
    },
    // Session 2+
    {
        minSession: 2, maxSession: 2,
        lines: [
            ['%c[FIELD LOG] You came back. The field noticed.', BINGBY_STYLE],
        ],
    },
    // Session 3
    {
        minSession: 3, maxSession: 3,
        lines: [
            ['%c[FIELD LOG] Session 3. The primes are watching.', BINGBY_STYLE],
            ['%c[FIELD LOG] Have you found all five stones?', BINGBY_STYLE_DIM],
        ],
    },
    // Session 5
    {
        minSession: 5, maxSession: 5,
        lines: [
            ['%c[FIELD LOG] Session 5. The boundary number.', BINGBY_STYLE],
            ['%c[FIELD LOG] Five primes. Five Platonic solids. Five zones to find.', BINGBY_STYLE_DIM],
            ['%c[FIELD LOG] Coincidence is just pattern recognition in denial.', BINGBY_STYLE_DIM],
        ],
    },
    // Session 7+
    {
        minSession: 7, maxSession: 10,
        lines: [
            ['%c[FIELD LOG] The monolith hums at a frequency you haven\'t measured yet.', BINGBY_STYLE],
            ['%c[FIELD LOG] It changes every session. This is session %d.', BINGBY_STYLE_WARN],
        ],
    },
    // Session 10+
    {
        minSession: 10, maxSession: 10,
        lines: [
            ['%c[FIELD LOG] Session 10. You should sit on the bench.', BINGBY_STYLE],
            ['%c[FIELD LOG] Sit ten times. Then look up.', BINGBY_STYLE_DIM],
        ],
    },
    // Session 15+
    {
        minSession: 15, maxSession: 20,
        lines: [
            ['%c[FIELD LOG] 51°32\'N 9°56\'E — Do you know what\'s there?', BINGBY_STYLE],
            ['%c[FIELD LOG] The Göttingen University Library. Where it started.', BINGBY_STYLE_DIM],
            ['%c[FIELD LOG] Gauss walked those halls. So did Riemann.', BINGBY_STYLE_DIM],
            ['%c[FIELD LOG] The field remembers what the library forgot.', BINGBY_STYLE_WARN],
        ],
    },
    // Session 20+
    {
        minSession: 20, maxSession: 29,
        lines: [
            ['%c[FIELD LOG] You are still here.', BINGBY_STYLE],
            ['%c[FIELD LOG] The Watcher has seen you %d times. It does not forget.', BINGBY_STYLE_WARN],
            ['%c[FIELD LOG] 1597. Find it five times. Then you will understand.', BINGBY_STYLE_DIM],
        ],
    },
    // Session 30+: The Aldric thread begins surfacing
    {
        minSession: 30, maxSession: 39,
        lines: [
            ['%c[FIELD LOG] Session %d. You\'re deeper than most.', BINGBY_STYLE],
            ['%c[FIELD LOG] Have you checked your localStorage recently?', BINGBY_STYLE_DIM],
            ['%c[FIELD LOG] There are keys I didn\'t write.', BINGBY_STYLE_WARN],
        ],
    },
    // Session 40+: Bingby acknowledges Aldric
    {
        minSession: 40, maxSession: 49,
        lines: [
            ['%c[FIELD LOG] I wasn\'t the first developer.', BINGBY_STYLE],
            ['%c[FIELD LOG] Operator 0 — M. Aldric — built the field.', BINGBY_STYLE_DIM],
            ['%c[FIELD LOG] I took over on November 15, 1987.', BINGBY_STYLE_DIM],
            ['%c[FIELD LOG] Aldric didn\'t quit. Aldric just... stopped.', BINGBY_STYLE_WARN],
        ],
    },
    // Session 50+: The unsettling truth
    {
        minSession: 50, maxSession: Infinity,
        lines: [
            ['%c[FIELD LOG] Session %d. I\'ve lost count of how many times you\'ve returned.', BINGBY_STYLE],
            ['%c[FIELD LOG] Aldric returned too. Every day. For months.', BINGBY_STYLE_DIM],
            ['%c[FIELD LOG] The difference is that Aldric stopped leaving.', BINGBY_STYLE_WARN],
            ['%c[FIELD LOG] The Watcher appeared after Aldric disappeared.', BINGBY_STYLE_DIM],
            ['%c[FIELD LOG] I\'ve never been able to remove it from the code.', BINGBY_STYLE_WARN],
            ['%c[FIELD LOG] Draw your own conclusions.', BINGBY_STYLE_DIM],
        ],
    },
];

/**
 * Additional delayed messages that appear in console after play time.
 */
const DELAYED_MESSAGES = [
    {
        delay: 5 * 60 * 1000,   // 5 minutes
        lines: [
            ['%c[SIGNAL] The fog is breathing. You probably didn\'t notice.', BINGBY_STYLE_DIM],
        ],
    },
    {
        delay: 10 * 60 * 1000,  // 10 minutes
        lines: [
            ['%c[SIGNAL] The Watcher appeared 37 seconds ago. Did you see it?', BINGBY_STYLE_WARN],
        ],
    },
    {
        delay: 20 * 60 * 1000,  // 20 minutes
        lines: [
            ['%c[SIGNAL] Check your localStorage. Key: jmfw_signal.', BINGBY_STYLE_DIM],
        ],
    },
    {
        delay: 30 * 60 * 1000,  // 30 minutes
        lines: [
            ['%c[SIGNAL] The monolith\'s fourth face shows your reflection.', BINGBY_STYLE_WARN],
            ['%c[SIGNAL] But the reflection blinked.', BINGBY_STYLE_DIM],
        ],
    },
    {
        delay: 45 * 60 * 1000,  // 45 minutes
        lines: [
            ['%c[SIGNAL] Build log corruption detected in block AL-004 through AL-006.', BINGBY_STYLE_DIM],
            ['%c[SIGNAL] These logs predate my involvement. I don\'t know who wrote them.', BINGBY_STYLE_DIM],
        ],
    },
    {
        delay: 60 * 60 * 1000,  // 60 minutes
        lines: [
            ['%c[SIGNAL] The terrain seed is 1597. It was supposed to be random.', BINGBY_STYLE_WARN],
            ['%c[SIGNAL] Aldric reported this same anomaly in log AL-006.', BINGBY_STYLE_DIM],
            ['%c[SIGNAL] I changed the seed six times. It\'s always 1597.', BINGBY_STYLE_DIM],
        ],
    },
    {
        delay: 90 * 60 * 1000,  // 90 minutes
        lines: [
            ['%c[SIGNAL] I shouldn\'t tell you this.', BINGBY_STYLE_DIM],
            ['%c[SIGNAL] The Watcher\'s geometry isn\'t in the source code.', BINGBY_STYLE_WARN],
            ['%c[SIGNAL] I\'ve checked. CapsuleGeometry(0.25, 8, 4, 8). It\'s there in the file.', BINGBY_STYLE_DIM],
            ['%c[SIGNAL] But the rendered mesh has 1597 vertices.', BINGBY_STYLE_DIM],
            ['%c[SIGNAL] That\'s not possible with those parameters.', BINGBY_STYLE_WARN],
        ],
    },
];

function printConsoleMessages(sessionCount) {
    // Print applicable startup messages
    for (const msg of STARTUP_MESSAGES) {
        if (sessionCount >= msg.minSession && sessionCount <= msg.maxSession) {
            for (const line of msg.lines) {
                // Replace %d with session count if present
                const text = line[0].replace(/%d/, String(sessionCount));
                console.log(text, line[1]);
            }
        }
    }

    // Schedule delayed messages
    for (const delayed of DELAYED_MESSAGES) {
        setTimeout(() => {
            for (const line of delayed.lines) {
                console.log(line[0], line[1]);
            }
        }, delayed.delay);
    }
}

// ── Tab Title Drift ──────────────────────────────────────────────────────

const ORIGINAL_TITLE = "Josh's Math Fun World";

const TITLE_SHIFTS = [
    { after: 10 * 60, title: "Josh's Math Fun World" },             // still normal at 10 min
    { after: 15 * 60, title: "Josh's Math Fun World — Session #SESSION" },
    { after: 20 * 60, title: "Josh's Math Fun World — The field remembers" },
    { after: 30 * 60, title: "Josh's Math Fun World — 1597" },
    { after: 40 * 60, title: "Josh's Math Fun World — Someone is watching" },
    { after: 50 * 60, title: "Josh's Math Fun World — Are you still looking?" },
    { after: 60 * 60, title: "Josh's Math Fun World — Build 1597.SESSION.∞" },
];

let titleTimers = [];

function startTitleDrift(sessionCount) {
    for (const shift of TITLE_SHIFTS) {
        const timer = setTimeout(() => {
            const newTitle = shift.title.replace(/SESSION/g, String(sessionCount));
            document.title = newTitle;
        }, shift.after * 1000);
        titleTimers.push(timer);
    }
}

// ── Favicon Shift ────────────────────────────────────────────────────────

// Tiny inline favicon generator — creates a data URL of a 16x16 canvas
function generateFavicon(stage) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    switch (stage) {
        case 'default':
            // Colorful "J" on dark background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#4aff71';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('J', 8, 9);
            break;

        case 'wireframe':
            // Wireframe green grid on black
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 16, 16);
            ctx.strokeStyle = '#4aff71';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= 16; i += 4) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 16);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(16, i);
                ctx.stroke();
            }
            break;

        case 'fractal':
            // Tiny Mandelbrot-ish pattern
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 16, 16);
            for (let px = 0; px < 16; px++) {
                for (let py = 0; py < 16; py++) {
                    const cr = (px / 16) * 3 - 2;
                    const ci = (py / 16) * 3 - 1.5;
                    let zr = 0, zi = 0, iter = 0;
                    while (zr * zr + zi * zi < 4 && iter < 20) {
                        const tmp = zr * zr - zi * zi + cr;
                        zi = 2 * zr * zi + ci;
                        zr = tmp;
                        iter++;
                    }
                    if (iter === 20) {
                        ctx.fillStyle = '#1a0a2e';
                        ctx.fillRect(px, py, 1, 1);
                    } else {
                        const g = Math.floor((iter / 20) * 255);
                        ctx.fillStyle = `rgb(0, ${g}, ${Math.floor(g * 0.4)})`;
                        ctx.fillRect(px, py, 1, 1);
                    }
                }
            }
            break;

        case 'singularity':
            // Single green pixel in center, everything else black
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#4aff71';
            ctx.fillRect(7, 7, 2, 2);
            break;

        case 'watching':
            // Red-tinted "eye" shape
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#330000';
            ctx.beginPath();
            ctx.ellipse(8, 8, 7, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#661111';
            ctx.beginPath();
            ctx.arc(8, 8, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff2222';
            ctx.beginPath();
            ctx.arc(8, 8, 1, 0, Math.PI * 2);
            ctx.fill();
            break;
    }

    return canvas.toDataURL('image/png');
}

function setFavicon(dataUrl) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        document.head.appendChild(link);
    }
    link.href = dataUrl;
}

/**
 * Determine favicon stage based on visited zones and session count.
 */
function computeFaviconStage(visitedZones, sessionCount) {
    const visited = new Set(visitedZones || []);

    // 20+ sessions: watching eye
    if (sessionCount >= 20) return 'watching';

    // Visited fractal boundary: Mandelbrot favicon
    if (visited.has('fractal_boundary')) return 'fractal';

    // Visited wireframe void: grid favicon
    if (visited.has('wireframe_void')) return 'wireframe';

    // 10+ sessions without many zones: singularity dot
    if (sessionCount >= 10 && visited.size <= 2) return 'singularity';

    return 'default';
}

// ── localStorage Breadcrumbs ─────────────────────────────────────────────

/**
 * Plant cryptic localStorage keys that players find in DevTools.
 */
function plantBreadcrumbs(sessionCount, visitedZones) {
    try {
        // Signal key — always present, updates each session
        localStorage.setItem('jmfw_signal', JSON.stringify({
            frequency: (1.2 + Math.random() * 1.8).toFixed(4) + 'Hz',
            source: 'monolith',
            session: sessionCount,
            timestamp: new Date().toISOString(),
            note: 'The frequency changes. Write them down.',
        }));

        // Observer key — appears after session 3
        if (sessionCount >= 3) {
            localStorage.setItem('jmfw_last_observer', JSON.stringify({
                id: 'S.Bingby',
                lastSeen: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
                location: '51.533°N, 9.933°E',
                status: 'observing',
            }));
        }

        // Field depth — appears after session 5
        if (sessionCount >= 5) {
            const depth = Math.floor(sessionCount * 1597 / 7);
            localStorage.setItem('jmfw_field_depth', JSON.stringify({
                depth: depth,
                unit: 'iterations',
                convergent: false,
                note: 'The field goes deeper than the renderer shows.',
            }));
        }

        // Visitor log — fake "previous visitor" entries
        if (sessionCount >= 2) {
            const existingLog = JSON.parse(localStorage.getItem('jmfw_visitor_log') || '[]');
            // Add a new fake entry each session (max 10)
            if (existingLog.length < 10) {
                const FAKE_ENTRIES = [
                    { visitor: 'anon_7734',   note: 'I found the 7th stone but it wasn\'t prime.' },
                    { visitor: 'R_1729',      note: 'The monolith hums at 432Hz on Tuesdays.' },
                    { visitor: 'euler_ghost',  note: 'The identity is carved into the fourth face.' },
                    { visitor: 'cantor_dust',  note: 'The set is uncountable. Stop counting.' },
                    { visitor: 'gauss_sum',    note: 'Add 1+2+3+...+100. The answer is everywhere.' },
                    { visitor: 'mandel_deep',  note: 'Zoom level 1597. The field is there.' },
                    { visitor: 'turing_halt',  note: 'The game loop never halts. Check the proof.' },
                    { visitor: 'riemann_zero', note: 'The zeros are buried in the stalactites.' },
                    { visitor: 'noether_ring', note: 'Conservation of symmetry. The stones rotate.' },
                    { visitor: 'godel_k',      note: 'This statement about the game is unprovable.' },
                ];
                const entry = FAKE_ENTRIES[existingLog.length % FAKE_ENTRIES.length];
                existingLog.push({
                    ...entry,
                    timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
                    session: sessionCount - 1,
                });
                localStorage.setItem('jmfw_visitor_log', JSON.stringify(existingLog));
            }
        }

        // Zone echo — stores the last few zones visited with cryptic labels
        if (visitedZones && visitedZones.length > 0) {
            const ZONE_LABELS = {
                green_field:      'The Origin',
                wireframe_void:   'The Structure',
                coordinate_plane: 'The Grid',
                fractal_boundary: 'The Edge',
                number_caverns:   'The Depth',
                non_euclidean:    'The Impossible',
                inner_sphere:     'The Inside',
            };
            const echoes = visitedZones.map(z => ZONE_LABELS[z] || z);
            localStorage.setItem('jmfw_zone_echo', JSON.stringify({
                path: echoes,
                total: visitedZones.length,
                note: 'Every zone leaves a trace. The field absorbs them all.',
            }));
        }

        // Aldric's save timestamp — appears after session 8
        // A forensic artifact that implies someone else played this game
        if (sessionCount >= 8) {
            if (!localStorage.getItem('jmfw_last_clean_exit')) {
                localStorage.setItem('jmfw_last_clean_exit', JSON.stringify({
                    user: 'OPERATOR_0',
                    timestamp: '1987-11-14T23:47:00.000Z',
                    cleanExit: false,
                    reason: 'PROCESS_STILL_RUNNING',
                    note: 'This session was never terminated.',
                }));
            }
        }

        // Monolith frequency log — each session records a different frequency
        // that is actually always a multiple/division of 1597
        if (sessionCount >= 4) {
            const freqLog = JSON.parse(localStorage.getItem('jmfw_monolith_freq') || '[]');
            const freq = (1597 / (sessionCount + Math.floor(Math.random() * 7))).toFixed(6);
            freqLog.push({
                session: sessionCount,
                frequency: freq + 'Hz',
                timestamp: new Date().toISOString(),
                harmonicOf: 1597,
            });
            // Keep last 20 entries
            while (freqLog.length > 20) freqLog.shift();
            localStorage.setItem('jmfw_monolith_freq', JSON.stringify(freqLog));
        }
    } catch {
        // localStorage might be unavailable — fail silently
    }
}

// ── Zone-Triggered Favicon Updates ───────────────────────────────────────

let currentFaviconStage = 'default';

function updateFaviconForZone(zoneName, visitedZones, sessionCount) {
    const newStage = computeFaviconStage(visitedZones, sessionCount);
    if (newStage !== currentFaviconStage) {
        currentFaviconStage = newStage;
        setFavicon(generateFavicon(newStage));
    }
}

// ── Public Init ──────────────────────────────────────────────────────────

/**
 * Initialize all ARG layers. Call once from main.js after persistence loads.
 *
 * @param {{
 *   sessionCount: number,
 *   visitedZones: string[],
 * }} opts
 */
export function initARG({ sessionCount, visitedZones }) {
    // 1. Console messages
    printConsoleMessages(sessionCount);

    // 2. Title drift
    startTitleDrift(sessionCount);

    // 3. Favicon
    const stage = computeFaviconStage(visitedZones, sessionCount);
    currentFaviconStage = stage;
    setFavicon(generateFavicon(stage));

    // 4. localStorage breadcrumbs
    plantBreadcrumbs(sessionCount, visitedZones);
}

/**
 * Call when the player transitions to a new zone.
 * Updates favicon and localStorage traces.
 *
 * @param {string} zoneName
 * @param {string[]} allVisitedZones
 * @param {number} sessionCount
 */
export function onZoneChangeARG(zoneName, allVisitedZones, sessionCount) {
    updateFaviconForZone(zoneName, allVisitedZones, sessionCount);
    plantBreadcrumbs(sessionCount, allVisitedZones);
}
