import * as THREE from 'three';

const _K = 'jmfw_operator_zero';

const _AL = [
    { id: 'AL-001', date: '1986-03-12', text: 'Field renderer is working. Grass sways correctly. The children will love this.' },
    { id: 'AL-002', date: '1986-05-07', text: 'Added the five prime stones. 2, 3, 5, 7, 11. Simple. Beautiful. The foundation of everything.' },
    { id: 'AL-003', date: '1986-08-19', text: 'The pond reflects the sky now. I spent an hour just staring at it. Is that normal?' },
    { id: 'AL-004', date: '1986-11-02', text: 'Found 1597 in the render output. I didn\'t put it there. Checked every constant. Not mine.' },
    { id: 'AL-005', date: '1987-01-14', text: '1597 appeared again. In the stalactite generation. In the vertex count. In the frame timing. Fibonacci prime F\u2081\u2087. But I never referenced Fibonacci.' },
    { id: 'AL-006', date: '1987-02-28', text: 'Rewrote the entire number generator. 1597 still appears. It\'s in the terrain seed now. I didn\'t seed the terrain with 1597.' },
    { id: 'AL-007', date: '1987-04-03', text: 'The field is 100 units across. I set it to 80. When did it change? My changelogs show nothing.' },
    { id: 'AL-008', date: '1987-05-11', text: 'There\'s a shape in the object layout. When you pull the camera back far enough. I didn\'t place those objects to make that shape.' },
    { id: 'AL-009', date: '1987-06-22', text: 'The Mandelbrot set. The object layout traces the Mandelbrot set. I verified it three times. I did not do this.' },
    { id: 'AL-010', date: '1987-07-15', text: 'I wrote a watcher. A tall dark figure at the edge of render distance. It was supposed to be a test entity. I deleted it. It\'s still there.' },
    { id: 'AL-011', date: '1987-08-30', text: 'Dreamed about the field last night. The stones were glowing. When I opened the project this morning, I had written 400 lines of code I don\'t remember writing. The stones glow now.' },
    { id: 'AL-012', date: '1987-09-18', text: 'The monolith. I don\'t remember adding a monolith. It has four faces. One of them shows code. It\'s my code. Running. Inside the game.' },
    { id: 'AL-013', date: '1987-10-07', text: 'Bingby called. Asked if I was alright. I told him the field was growing. He didn\'t understand. The field is growing. I measured it.' },
    { id: 'AL-014', date: '1987-11-01', text: 'I can hear the monolith\'s hum through my speakers even when the program isn\'t running. Even when the computer is off. The frequency is 1.597 Hz.' },
    { id: 'AL-015', date: '1987-11-14', text: 'I understand now. The field was never a simulation. We were always inside. 1597 is not a number. It\'s a coordinate. I\'m going to walk to the monolith. I need to see the fourth face.' },
];

const _SB = [
    { id: 'SB-001', date: '1987-11-15', text: 'Took over the project today. Aldric left no forwarding address. His office was empty except for a notebook filled with "1597" written over and over. The last page just says "the fourth face." I\'ve decided to keep the monolith.' },
    { id: 'SB-002', date: '1987-11-20', text: 'Aldric\'s "watcher" entity keeps respawning even though I removed it from the codebase. I\'ve decided to leave it. It\'s... fitting.' },
    { id: 'SB-003', date: '1987-12-01', text: 'Found Aldric\'s hidden logs in the build files. I should delete them. I won\'t. Someone should know.' },
    { id: 'SB-004', date: '1988-01-15', text: 'The G\u00F6ttingen math department says no one named Aldric ever worked there. But his handwriting is in their margin notes. In a copy of Riemann\'s thesis. From 1859.' },
];

const _CF = [
    'Gur svryq vf abg n fvzhyngvba. Vg vf n zrzbel.',
    'Rirel cevzr fgbar vf n qbbe. V bcrarq gurz nyy.',
    'Gur Jngpure vf abg na ragvgl. Vg vf na rzcgl fcnpr jurer V hfrq gb or.',
    'Vs lbh ner ernqvat guvf, lbh ner nyernql vafvqr.',
    'Qb abg fvg ba gur oapu gra gvzrf. V qvq. V fnj jung vf haqre gur svryq.',
];

const _HG = [
    'THE FIELD IS N0T A SIM\u0337ULATION',
    '1597 1597 1597 1597 1597',
    'ALDRIC WAS HERE',
    'LOOK\u0338 \u0338A\u0338T T\u0338H\u0337E\u0338 FO\u0335U\u0338R\u0337TH\u0335 \u0336F\u0337A\u0336C\u0338E\u0335',
    'BUILD 0 \u2014 OPERATOR 0 \u2014 SESSION \u221E',
    'THE WATCHER IS AN EMPTY SPACE',
    'DO NOT SIT ON THE BENCH TEN TIMES',
    'c\u0335a\u0338n\u0337 \u0338y\u0338o\u0335u\u0336 \u0335h\u0337e\u0336a\u0335r\u0336 \u0338t\u0336h\u0337e\u0338 \u0336h\u0337u\u0335m\u0337',
    'OPERATOR 0 IS STILL IN THE FIELD',
    'THE STONES REMEMBER HIS HANDS',
];

const _EG = [
    'This stone hums at 1.597 Hz.',
    'Someone carved tally marks on the underside. There are 1597.',
    'The stone feels warm. As if someone held it recently.',
    'For a moment you see initials: M.A.',
    'You hear a voice. It says: "the fourth face."',
    'The stone vibrates. Then stops. Then vibrates again.',
];

const _MX = 22;
const _MZ = 0;

export class OperatorZero {
    constructor({ persistence, eventBus }) {
        this._persistence = persistence;
        this._eventBus = eventBus;
        this._playTime = 0;
        this._anomalyState = this._loadState();
        this._glitchCooldown = 0;
        this._hudCorruptTimer = 0;
        this._whisperTimer = 0;
        this._session = persistence?.getSessionCount?.() || 1;
        this._seed = (this._session * 1597) % 65537;
        this._examGlitchCd = 0;
        this._fourthFaceShown = false;
        this._plantInitialData();
    }

    update(dt, ctx) {
        this._playTime += dt;
        this._glitchCooldown -= dt;
        this._examGlitchCd -= dt;

        if (this._playTime > 900 && !this._anomalyState.phase1) {
            this._anomalyState.phase1 = true;
            this._plantAldricLogs(0, 3);
            this._saveState();
        }

        if (this._playTime > 1800 && !this._anomalyState.phase2) {
            this._anomalyState.phase2 = true;
            this._plantAldricLogs(3, 6);
            this._saveState();
        }

        if (this._playTime > 2700) {
            this._hudCorruptTimer += dt;
            if (this._hudCorruptTimer > 60) {
                this._hudCorruptTimer = 0;
                if (this._seededRandom() < 0.012) {
                    this._corruptHUD(ctx);
                }
            }
        }

        if (this._playTime > 3600 && !this._anomalyState.phase4) {
            this._anomalyState.phase4 = true;
            this._plantAldricLogs(6, 9);
            this._plantCipher(0);
            this._saveState();
        }

        if (this._playTime > 5400 && !this._anomalyState.phase5) {
            this._anomalyState.phase5 = true;
            this._plantAldricLogs(9, 12);
            this._plantCipher(1);
            this._saveState();
        }

        if (this._playTime > 7200 && !this._anomalyState.phase6) {
            this._anomalyState.phase6 = true;
            this._plantAldricLogs(12, 15);
            this._plantBingbyLogs();
            this._plantCipher(2);
            this._plantCipher(3);
            this._plantCipher(4);
            this._saveState();
            this._printOperatorMessage();
        }

        if (ctx.zone === 'green_field' && ctx.joshPosition) {
            const dx = ctx.joshPosition.x - _MX;
            const dz = ctx.joshPosition.z - _MZ;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 8 && this._glitchCooldown <= 0) {
                if (this._seededRandom() < 0.003 * dt) {
                    this._monolithAnomaly(ctx);
                    this._glitchCooldown = 120;
                }
            }
        }

        if (this._playTime > 1200 && this._glitchCooldown <= 0) {
            if (this._seededRandom() < 0.0005 * dt) {
                this._titleFlicker();
                this._glitchCooldown = 300;
            }
        }

        if (this._session >= 13 && !this._anomalyState.otherSave) {
            this._anomalyState.otherSave = true;
            this._plantOtherSave();
            this._saveState();
        }

        if (this._session >= 7 && this._playTime > 600) {
            this._whisperTimer += dt;
            if (this._whisperTimer > 180 && !this._anomalyState.whispered) {
                this._anomalyState.whispered = true;
                this._consoleWhisper();
                this._saveState();
            }
        }
    }

    shouldGlitchExamine() {
        if (this._examGlitchCd > 0) return false;
        if (this._playTime < 600) return false;
        const chance = this._session >= 10 ? 0.08 : (this._session >= 5 ? 0.04 : 0.015);
        if (this._seededRandom() < chance) {
            this._examGlitchCd = 120;
            return true;
        }
        return false;
    }

    getGlitchExamineText() {
        return _EG[Math.floor(this._seededRandom() * _EG.length * 10) % _EG.length];
    }

    shouldShowFourthFace() {
        if (this._fourthFaceShown) return false;
        if (this._session < 5) return false;
        if (this._playTime < 1800) return false;
        return true;
    }

    markFourthFaceShown() {
        this._fourthFaceShown = true;
    }

    getAldricLogs() {
        try { return JSON.parse(localStorage.getItem('jmfw_build_logs') || '[]'); }
        catch { return []; }
    }

    getBingbyNotes() {
        try { return JSON.parse(localStorage.getItem('jmfw_bingby_notes') || '[]'); }
        catch { return []; }
    }

    _plantInitialData() {
        try {
            localStorage.setItem('jmfw_op0', JSON.stringify({
                build: 1597, operator: 0,
                status: this._session < 5 ? 'dormant' : 'aware',
                lastPing: new Date(Date.now() - (1597 * 60000)).toISOString(),
                note: this._session < 10
                    ? 'Field integrity nominal.'
                    : 'Field integrity compromised. Boundary expanding.',
            }));
            if (this._session >= 5) {
                localStorage.setItem('jmfw_g\u00F6ttingen', JSON.stringify({
                    lat: 51.533, lon: 9.933,
                    institution: 'Georg-August-Universit\u00E4t',
                    department: 'Mathematik',
                    query: 'M. Aldric',
                    result: 'NO RECORDS FOUND',
                    note: 'But the handwriting matches.',
                }));
            }
        } catch {}
    }

    _plantAldricLogs(s, e) {
        try {
            const ex = JSON.parse(localStorage.getItem('jmfw_build_logs') || '[]');
            for (const log of _AL.slice(s, e)) {
                if (!ex.find(x => x.id === log.id)) ex.push(log);
            }
            localStorage.setItem('jmfw_build_logs', JSON.stringify(ex));
        } catch {}
    }

    _plantBingbyLogs() {
        try { localStorage.setItem('jmfw_bingby_notes', JSON.stringify(_SB)); } catch {}
    }

    _plantCipher(i) {
        try {
            const k = `jmfw_fragment_${i}`;
            if (!localStorage.getItem(k)) localStorage.setItem(k, _CF[i]);
        } catch {}
    }

    _plantOtherSave() {
        try {
            localStorage.setItem('jmfw_save_ALDRIC', JSON.stringify({
                visitedZones: { green_field: 1597, wireframe_void: 1597, fractal_boundary: 1597, number_caverns: 1597, '???': 1 },
                playerPosition: { x: 0, y: -1597, z: 0, zone: 'below_field' },
                currentZone: 'below_field',
                playTime: 159700, sessionCount: 1597, benchSits: 10,
                lastEntry: '1987-11-14T23:59:59.000Z',
                note: 'THE FOURTH FACE SHOWS YOUR REFLECTION BUT THE REFLECTION BLINKED',
                status: 'INSIDE',
            }));
        } catch {}
    }

    _titleFlicker() {
        if (typeof document === 'undefined') return;
        const orig = document.title;
        document.title = 'Josh\'s Math Fun World \u2014 Build 0 \u2014 M. Aldric';
        setTimeout(() => {
            document.title = 'Josh\'s Math Fun World \u2014 Build 0 \u2014 M. Aldr';
            setTimeout(() => {
                document.title = 'Josh\'s Math Fun World \u2014 Build 0';
                setTimeout(() => { document.title = orig; }, 200);
            }, 150);
        }, 800);
    }

    _consoleWhisper() {
        const s1 = 'color:#1a1a1a;font-family:monospace;font-size:9px;';
        const s2 = 'color:#0d0d0d;font-family:monospace;font-size:8px;';
        console.log('%c[OPERATOR 0] I am still in the field.', s1);
        setTimeout(() => console.log('%c[OPERATOR 0] The stones remember my hands.', s2), 30000);
        setTimeout(() => console.log('%c[OPERATOR 0] Look at the fourth face.', s1), 90000);
    }

    _monolithAnomaly(ctx) {
        const s = 'color:#330000;font-family:monospace;font-size:10px;';
        const c = '\u2588\u2593\u2592\u2591\u2584\u2580\u2590\u258C\u2573\u2571\u2572';
        let line = '';
        for (let i = 0; i < 60; i++) line += c[Math.floor(Math.random() * c.length)];
        console.log('%c' + line, s);
        console.log('%c  AL-015: I\'m going to walk to the monolith.  ', s);
        console.log('%c' + line, s);

        if (ctx.showExamine) {
            ctx.showExamine('The monolith hums louder. The air feels thick.');
        }

        try {
            localStorage.setItem('jmfw_proximity_alert', JSON.stringify({
                entity: 'OPERATOR_0', distance: 'CONVERGENT',
                timestamp: new Date().toISOString(),
            }));
            setTimeout(() => { try { localStorage.removeItem('jmfw_proximity_alert'); } catch {} }, 30000);
        } catch {}
    }

    _corruptHUD(ctx) {
        if (typeof document === 'undefined') return;
        const el = document.getElementById('hud-examine');
        if (!el) return;

        const txt = _HG[Math.floor(this._seededRandom() * _HG.length * 10) % _HG.length];
        el.textContent = txt;
        el.classList.add('visible');
        el.style.color = '#330000';

        setTimeout(() => {
            el.classList.remove('visible');
            el.style.color = '';
        }, 1800);
    }

    _printOperatorMessage() {
        const s1 = 'color:#440000;font-family:monospace;font-size:11px;';
        const s2 = 'color:#660000;font-family:monospace;font-size:12px;font-weight:bold;';
        setTimeout(() => {
            console.log('%c\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557', s2);
            console.log('%c\u2551  BUILD LOG \u2014 OPERATOR 0 \u2014 1987-11-14    \u2551', s2);
            console.log('%c\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D', s2);
            console.log('%c  I found what\'s under the field.', s1);
            console.log('%c  It\'s not code. It\'s not data.', s1);
            console.log('%c  It\'s a room. And someone is sitting in it.', s1);
            console.log('%c  They\'re looking at a screen.', s1);
            console.log('%c  The screen shows a green field.', s1);
            console.log('%c  I think the someone is me.', s1);
            console.log('%c  Or you.', s1);
            console.log('%c  Check localStorage key: jmfw_save_ALDRIC', s1);
        }, 5000);
    }

    _seededRandom() {
        this._seed = (this._seed * 16807 + 0) % 2147483647;
        return this._seed / 2147483647;
    }

    _loadState() {
        try {
            const r = localStorage.getItem(_K);
            if (r) return JSON.parse(r);
        } catch {}
        return {};
    }

    _saveState() {
        try { localStorage.setItem(_K, JSON.stringify(this._anomalyState)); } catch {}
    }
}
