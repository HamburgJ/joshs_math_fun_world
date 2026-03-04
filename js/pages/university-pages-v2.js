import { PageManager } from './page-manager.js';

// ═══════════════════════════════════════════════════════════════════════════
//  university-pages-v2.js — Phase 11 content for Josh's Math Fun World
//
//  Shell Bingby doesn't do "Phase 2." Shell Bingby does "the next wave."
//  This wave has tesseracts, primes, domain coloring, matrix multiplication,
//  secret faculty minutes, and the truth about the field.
//
//  These pages extend the Gauss-Riemann University website with:
//    - Student project pages (Keiko, Mohammed, Alex)
//    - Interactive math tools (complex calc, matrix mult, function plotter)
//    - Hidden pages (faculty minutes, the conjecture, the field)
//    - Webring, student index, tools index
// ═══════════════════════════════════════════════════════════════════════════

/* ── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Shortcut: create an element, optionally set innerHTML, className, style,
 * and append children. Mirrors the helper in university-pages.js.
 * @param {string} tag
 * @param {Object} attrs
 * @param {Array<HTMLElement|string>} children
 * @returns {HTMLElement}
 */
function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    if (attrs.className) e.className = attrs.className;
    if (attrs.style) e.setAttribute('style', attrs.style);
    if (attrs.innerHTML !== undefined) e.innerHTML = attrs.innerHTML;
    if (attrs.innerText !== undefined) e.innerText = attrs.innerText;
    if (attrs.id) e.id = attrs.id;
    if (attrs.size) e.setAttribute('size', attrs.size);
    if (attrs.noshade !== undefined) e.setAttribute('noshade', '');
    if (attrs.type) e.type = attrs.type;
    if (attrs.value !== undefined) e.value = attrs.value;
    if (attrs.placeholder) e.placeholder = attrs.placeholder;
    if (attrs.width) e.setAttribute('width', attrs.width);
    if (attrs.height) e.setAttribute('height', attrs.height);
    if (attrs.cellpadding) e.setAttribute('cellpadding', attrs.cellpadding);
    if (attrs.cellspacing) e.setAttribute('cellspacing', attrs.cellspacing);
    if (attrs.border) e.setAttribute('border', attrs.border);
    if (attrs.bgcolor) e.setAttribute('bgcolor', attrs.bgcolor);
    if (attrs.valign) e.setAttribute('valign', attrs.valign);
    if (attrs.colspan) e.setAttribute('colspan', attrs.colspan);
    if (attrs.href) e.setAttribute('data-href', attrs.href);
    if (attrs['data-href']) e.setAttribute('data-href', attrs['data-href']);
    for (const child of children) {
        if (typeof child === 'string') {
            e.appendChild(document.createTextNode(child));
        } else if (child) {
            e.appendChild(child);
        }
    }
    return e;
}

/** Create an HR styled for 90s authenticity */
function hr() {
    return el('hr', { style: 'border:none; border-top: 2px solid #808080; margin: 10px 0;' });
}

/** Create a nav link (<a> with data-href) */
function navLink(text, path, style = '') {
    const a = document.createElement('a');
    a.setAttribute('data-href', path);
    a.textContent = text;
    a.style.cssText = 'color: #0000EE; text-decoration: underline; cursor: pointer;' + style;
    return a;
}

/** Wrap content in a retro-page div */
function retroPage() {
    return el('div', {
        className: 'retro-page',
        style: 'font-family: "Times New Roman", Times, serif; font-size: 14px; color: #000000; background: #FFFFFF; padding: 20px; max-width: 760px; margin: 0 auto;'
    });
}

/** Navy header bar */
function navyHeader(text, subtitle) {
    const td = el('td', {
        bgcolor: '#000080',
        style: 'padding: 12px 16px;'
    });
    const title = el('font', { style: 'color: #FFFFFF; font-size: 18px; font-weight: bold;' });
    title.innerHTML = text;
    td.appendChild(title);
    if (subtitle) {
        td.appendChild(el('br'));
        const sub = el('font', { style: 'color: #CCCCFF; font-size: 12px;' });
        sub.innerHTML = subtitle;
        td.appendChild(sub);
    }
    const tr = el('tr', {}, [td]);
    const table = el('table', { width: '100%', cellpadding: '0', cellspacing: '0', border: '0' }, [tr]);
    return table;
}

/** Build a "Back to" breadcrumb */
function backLink(text, path) {
    const p = el('p', { style: 'margin-top: 16px; font-size: 12px;' });
    p.appendChild(document.createTextNode('[ '));
    p.appendChild(navLink(text, path));
    p.appendChild(document.createTextNode(' ]'));
    return p;
}

/** Java-applet-style inset box */
function javaAppletBox() {
    return el('div', {
        className: 'java-applet',
        style: 'border: 2px inset #808080; background: #C0C0C0; padding: 4px; display: block; margin: 10px auto;'
    });
}

/**
 * Generate prime numbers up to a limit using the Sieve of Eratosthenes.
 * @param {number} count - How many primes to generate
 * @returns {number[]}
 */
function sieveOfEratosthenes(count) {
    // Upper bound estimation: p_n ~ n * (ln(n) + ln(ln(n))) for n >= 6
    let limit = count < 6 ? 15 : Math.ceil(count * (Math.log(count) + Math.log(Math.log(count))) * 1.3);
    const sieve = new Uint8Array(limit + 1);  // 0 = prime candidate, 1 = composite
    sieve[0] = 1;
    sieve[1] = 1;
    for (let i = 2; i * i <= limit; i++) {
        if (!sieve[i]) {
            for (let j = i * i; j <= limit; j += i) {
                sieve[j] = 1;
            }
        }
    }
    const primes = [];
    for (let i = 2; i <= limit && primes.length < count; i++) {
        if (!sieve[i]) primes.push(i);
    }
    return primes;
}

/**
 * Parse a complex number string like "3+4i", "-2-i", "5", "i", "-i".
 * @param {string} str
 * @returns {{ re: number, im: number }|null}
 */
function parseComplex(str) {
    str = str.replace(/\s/g, '');
    if (!str) return null;

    let re = 0, im = 0;

    // Pure imaginary: "i", "-i", "3i", "-2.5i"
    if (/^[+-]?(\d*\.?\d*)?i$/i.test(str)) {
        const s = str.replace(/i/i, '');
        if (s === '' || s === '+') im = 1;
        else if (s === '-') im = -1;
        else im = parseFloat(s);
        return { re: 0, im };
    }

    // Pure real: "5", "-3.2"
    if (/^[+-]?\d+\.?\d*$/.test(str)) {
        return { re: parseFloat(str), im: 0 };
    }

    // Full form: "a+bi" or "a-bi"
    const match = str.match(/^([+-]?\d*\.?\d+)([+-]\d*\.?\d*)?i$/i);
    if (match) {
        re = parseFloat(match[1]);
        let imPart = match[2];
        if (imPart === '+' || imPart === undefined) im = 1;
        else if (imPart === '-') im = -1;
        else im = parseFloat(imPart);
        return { re, im };
    }

    // Try alternate: just parse what we can
    const altMatch = str.match(/^([+-]?\d*\.?\d+)?([+-](?:\d*\.?\d*)?)i$/i);
    if (altMatch) {
        re = altMatch[1] ? parseFloat(altMatch[1]) : 0;
        let imStr = altMatch[2];
        if (imStr === '+' || imStr === '') im = 1;
        else if (imStr === '-') im = -1;
        else im = parseFloat(imStr);
        return { re, im };
    }

    return null;
}

/**
 * Format a complex number for display.
 * @param {{ re: number, im: number }} z
 * @returns {string}
 */
function formatComplex(z) {
    const r = Math.round(z.re * 10000) / 10000;
    const i = Math.round(z.im * 10000) / 10000;
    if (i === 0) return `${r}`;
    if (r === 0) {
        if (i === 1) return 'i';
        if (i === -1) return '-i';
        return `${i}i`;
    }
    const sign = i > 0 ? '+' : '';
    const imStr = (i === 1) ? '' : (i === -1) ? '-' : `${i}`;
    return `${r}${sign}${imStr}i`;
}


/* ═══════════════════════════════════════════════════════════════════════════
   PAGE BUILDERS — Phase 11
   ═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────
// 1. KEIKO'S 4D VISUALIZER — /math/students/ktanaka/4d/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build Keiko Tanaka's 4D polytope visualizer page.
 * Features a working wireframe tesseract rotation applet on a canvas,
 * with togglable rotation planes (XW, YW, ZW).
 * @returns {HTMLElement}
 */
function buildKeiko4DPage() {
    const page = retroPage();

    const comment = document.createComment(' The fourth dimension is not time. It is perpendicular to everything you know. ');
    page.appendChild(comment);

    page.appendChild(navyHeader(
        'Exploring the Fourth Dimension',
        'Projections of 4D Polytopes into 3D Space &mdash; Keiko Tanaka'
    ));
    page.appendChild(hr());

    const byline = el('p', { style: 'font-size: 12px; color: #666;' });
    byline.textContent = 'Keiko Tanaka — MATH 407 Independent Study, Spring 1998';
    page.appendChild(byline);

    // ── Explanation ──
    const introTitle = el('h3', { style: 'color: #000080;' });
    introTitle.textContent = 'How Can We See Four Dimensions?';
    page.appendChild(introTitle);

    const intro1 = el('p');
    intro1.innerHTML = 'We see the three-dimensional world through our two-dimensional retinas. '
        + 'Our brains reconstruct depth from two flat images. This is <i>projection</i>: '
        + 'a 3D object is projected onto a 2D surface, and we infer the missing dimension.';
    page.appendChild(intro1);

    const intro2 = el('p');
    intro2.innerHTML = 'The same principle works one dimension up. A <b>4D object</b> can be projected into 3D space '
        + '(and then from 3D to 2D for our screens). We lose information &mdash; just as a shadow of a cube '
        + 'is not a cube &mdash; but the projection reveals the <i>structure</i>.';
    page.appendChild(intro2);

    const intro3 = el('p');
    intro3.innerHTML = 'The <b>tesseract</b> (or <i>hypercube</i>) is the 4D analog of a cube. '
        + 'A cube has 8 vertices, 12 edges, and 6 faces. A tesseract has <b>16 vertices</b>, <b>32 edges</b>, '
        + '24 faces, and 8 cubic cells. Below is a wireframe projection of a tesseract, rotated in the XW plane '
        + 'so you can see its 4D structure.';
    page.appendChild(intro3);

    page.appendChild(hr());

    // ── Applet ──
    const appletTitle = el('h3', { style: 'color: #000080;' });
    appletTitle.textContent = 'Tesseract Rotation Applet';
    page.appendChild(appletTitle);

    const appletLabel = el('p', { style: 'font-size: 11px; color: #808080; margin-bottom: 4px;' });
    appletLabel.textContent = 'Java Applet — TesseractViewer.class';
    page.appendChild(appletLabel);

    const appletBox = javaAppletBox();
    appletBox.style.maxWidth = '316px';

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    canvas.style.cssText = 'display: block; background: #000000; image-rendering: auto;';
    appletBox.appendChild(canvas);
    page.appendChild(appletBox);

    // Rotation plane toggles
    const controlsDiv = el('div', { style: 'margin: 8px 0; font-size: 13px;' });
    controlsDiv.appendChild(document.createTextNode('Rotation planes: '));

    const rotState = { xw: true, yw: false, zw: false };

    ['XW', 'YW', 'ZW'].forEach(plane => {
        const label = document.createElement('label');
        label.style.cssText = 'margin-right: 12px; cursor: pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = rotState[plane.toLowerCase()];
        cb.addEventListener('change', () => {
            rotState[plane.toLowerCase()] = cb.checked;
        });
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + plane));
        controlsDiv.appendChild(label);
    });
    page.appendChild(controlsDiv);

    // ── Tesseract rendering logic ──
    // 16 vertices: all (±1, ±1, ±1, ±1)
    const vertices4D = [];
    for (let i = 0; i < 16; i++) {
        vertices4D.push([
            (i & 1) ? 1 : -1,
            (i & 2) ? 1 : -1,
            (i & 4) ? 1 : -1,
            (i & 8) ? 1 : -1
        ]);
    }

    // 32 edges: vertices that differ in exactly one coordinate
    const edges = [];
    for (let i = 0; i < 16; i++) {
        for (let j = i + 1; j < 16; j++) {
            let diffCount = 0;
            for (let k = 0; k < 4; k++) {
                if (vertices4D[i][k] !== vertices4D[j][k]) diffCount++;
            }
            if (diffCount === 1) edges.push([i, j]);
        }
    }

    let animFrameId = null;
    let angle = 0;
    const speed = 0.008;

    function rotate4D(v, angleXW, angleYW, angleZW) {
        let [x, y, z, w] = v;

        // XW rotation
        if (angleXW !== 0) {
            const c = Math.cos(angleXW), s = Math.sin(angleXW);
            const nx = c * x - s * w;
            const nw = s * x + c * w;
            x = nx; w = nw;
        }
        // YW rotation
        if (angleYW !== 0) {
            const c = Math.cos(angleYW), s = Math.sin(angleYW);
            const ny = c * y - s * w;
            const nw = s * y + c * w;
            y = ny; w = nw;
        }
        // ZW rotation
        if (angleZW !== 0) {
            const c = Math.cos(angleZW), s = Math.sin(angleZW);
            const nz = c * z - s * w;
            const nw = s * z + c * w;
            z = nz; w = nw;
        }

        return [x, y, z, w];
    }

    function project4Dto2D(v) {
        const [x, y, z, w] = v;
        // Perspective projection from 4D to 3D
        const dist4 = 3;
        const scale4 = dist4 / (dist4 - w);
        const x3 = x * scale4;
        const y3 = y * scale4;
        const z3 = z * scale4;

        // Perspective projection from 3D to 2D
        const dist3 = 5;
        const scale3 = dist3 / (dist3 - z3);
        const x2 = x3 * scale3;
        const y2 = y3 * scale3;

        return [x2, y2, scale4];
    }

    function renderFrame() {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);

        const aXW = rotState.xw ? angle : 0;
        const aYW = rotState.yw ? angle * 0.7 : 0;
        const aZW = rotState.zw ? angle * 0.5 : 0;

        // Add a slight static 3D rotation for depth perception
        const cosA = Math.cos(0.4), sinA = Math.sin(0.4);
        const cosB = Math.cos(0.3), sinB = Math.sin(0.3);

        const projected = vertices4D.map(v => {
            let rv = rotate4D(v, aXW, aYW, aZW);

            // Apply slight 3D XY rotation for better viewing angle
            let [x, y, z, w] = rv;
            let nx = cosA * x - sinA * y;
            let ny = sinA * x + cosA * y;
            x = nx; y = ny;
            // Slight XZ rotation
            nx = cosB * x - sinB * z;
            let nz = sinB * x + cosB * z;
            x = nx; z = nz;

            return project4Dto2D([x, y, z, w]);
        });

        const cx = W / 2, cy = H / 2;
        const drawScale = 60;

        // Draw edges
        edges.forEach(([i, j]) => {
            const [x1, y1, s1] = projected[i];
            const [x2, y2, s2] = projected[j];
            const brightness = Math.min(255, Math.max(80, Math.round(((s1 + s2) / 2) * 100)));
            ctx.strokeStyle = `rgb(${brightness}, ${brightness}, ${Math.min(255, brightness + 60)})`;
            ctx.lineWidth = Math.max(0.5, ((s1 + s2) / 2) * 0.8);
            ctx.beginPath();
            ctx.moveTo(cx + x1 * drawScale, cy + y1 * drawScale);
            ctx.lineTo(cx + x2 * drawScale, cy + y2 * drawScale);
            ctx.stroke();
        });

        // Draw vertices
        projected.forEach(([x, y, s]) => {
            const r = Math.max(1.5, s * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, s * 0.6)})`;
            ctx.beginPath();
            ctx.arc(cx + x * drawScale, cy + y * drawScale, r, 0, Math.PI * 2);
            ctx.fill();
        });

        angle += speed;
        animFrameId = requestAnimationFrame(renderFrame);
    }

    // Start animation on next frame (canvas must be in DOM)
    requestAnimationFrame(() => renderFrame());

    // Clean up when page is removed from DOM (MutationObserver)
    const observer = new MutationObserver(() => {
        if (!document.contains(canvas)) {
            if (animFrameId) cancelAnimationFrame(animFrameId);
            observer.disconnect();
        }
    });
    requestAnimationFrame(() => {
        if (canvas.parentNode) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });

    page.appendChild(hr());

    // ── Keiko's quote ──
    const quoteBox = el('div', {
        style: 'border-left: 3px solid #000080; padding: 8px 16px; margin: 16px 0; font-style: italic; color: #333; background: #F8F8FF;'
    });
    quoteBox.innerHTML = '&ldquo;You can\'t see it. But you can understand it. Understanding is a kind of sight.&rdquo;<br>'
        + '<span style="font-size: 12px; color: #666; font-style: normal;">&mdash; Keiko Tanaka</span>';
    page.appendChild(quoteBox);

    page.appendChild(hr());

    // ── Technical notes ──
    const techTitle = el('h3', { style: 'color: #000080;' });
    techTitle.textContent = 'How It Works';
    page.appendChild(techTitle);

    const tech = el('ul', { style: 'font-size: 13px;' });
    tech.innerHTML = `
        <li>The tesseract has 16 vertices: all combinations of (\u00B11, \u00B11, \u00B11, \u00B11).</li>
        <li>32 edges connect vertices that differ in exactly one coordinate.</li>
        <li>Rotation is applied in the selected 4D planes (XW, YW, ZW) using rotation matrices.</li>
        <li>The result is perspective-projected from 4D \u2192 3D \u2192 2D.</li>
        <li>Brighter/larger vertices and edges are &ldquo;closer&rdquo; in the projected view.</li>
    `;
    page.appendChild(tech);

    // Footer
    const footer = el('p', { style: 'font-size: 11px; color: #808080; text-align: center; margin-top: 16px;' });
    footer.appendChild(navLink('Student Projects', '/math/students/'));
    footer.appendChild(document.createTextNode(' | '));
    footer.appendChild(navLink('Math Department', '/math/'));
    page.appendChild(footer);

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 2. MOHAMMED'S PRIME LIST — /math/students/malrashid/primes/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build Mohammed Al-Rashid's prime number list page.
 * Generates the first 1000 primes via sieve and displays them in a <pre>.
 * The 200th prime (1223) has a subtly different color.
 * @returns {HTMLElement}
 */
function buildPrimesPage() {
    const page = el('div', {
        className: 'retro-page',
        style: 'font-family: "Courier New", Courier, monospace; font-size: 12px; color: #000000; background: #FFFFFF; padding: 20px; max-width: 760px; margin: 0 auto;'
    });

    const title = el('h2', { style: 'font-family: "Courier New", monospace; font-size: 16px; text-align: center;' });
    title.textContent = 'The Prime Numbers, Listed, Up To Ten Million';
    page.appendChild(title);

    const subtitle = el('p', { style: 'text-align: center; font-size: 11px; color: #666;' });
    subtitle.textContent = 'Mohammed Al-Rashid — Computer Science / Mathematics, Class of 2000';
    page.appendChild(subtitle);

    page.appendChild(el('hr', { style: 'border:none; border-top: 1px solid #808080; margin: 10px 0;' }));

    const note = el('p', { style: 'font-size: 11px; color: #333;' });
    note.textContent = '(Note: This page lists the first 1,000 primes. The full list to 10,000,000 is available on request via floppy disk.)';
    page.appendChild(note);

    // Generate first 1000 primes
    const primes = sieveOfEratosthenes(1000);

    // Build pre content with the 200th prime (index 199) having a slightly different color
    const pre = document.createElement('pre');
    pre.style.cssText = 'font-family: "Courier New", Courier, monospace; font-size: 12px; white-space: pre-wrap; word-wrap: break-word; line-height: 1.6;';

    for (let i = 0; i < primes.length; i++) {
        if (i === 199) {
            // The 200th prime — 1223 — barely noticeable different color
            const span = document.createElement('span');
            span.style.color = '#1a1a1a';
            span.textContent = String(primes[i]);
            pre.appendChild(span);
        } else {
            pre.appendChild(document.createTextNode(String(primes[i])));
        }
        if (i < primes.length - 1) {
            pre.appendChild(document.createTextNode(' '));
        }
    }

    page.appendChild(pre);

    page.appendChild(el('hr', { style: 'border:none; border-top: 1px solid #808080; margin: 10px 0;' }));

    const footer = el('p', { style: 'font-size: 11px; color: #666; text-align: center; margin-top: 20px;' });
    footer.textContent = 'I wrote a C program to generate these. It took my Pentium 133MHz about 4 minutes. '
        + 'There are 664,579 primes below 10,000,000. Thank you for scrolling.';
    page.appendChild(footer);

    const links = el('p', { style: 'font-size: 11px; text-align: center; margin-top: 12px;' });
    links.appendChild(navLink('Student Projects', '/math/students/'));
    links.appendChild(document.createTextNode(' | '));
    links.appendChild(navLink('Math Department', '/math/'));
    page.appendChild(links);

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 3. ALEX'S 0.999... = 1 — /math/students/apark/099999/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build Alex Park's page proving 0.999... = 1.
 * Contains four proofs and a fake comment thread.
 * @returns {HTMLElement}
 */
function build0999Page() {
    const page = retroPage();

    page.appendChild(navyHeader(
        'Is 0.999... = 1? <font color="#FFFF00">YES.</font>',
        'Alex Park &mdash; Math Major, Class of 1999'
    ));
    page.appendChild(hr());

    const intro = el('p');
    intro.innerHTML = 'Every semester, someone walks into the math lounge and says '
        + '&ldquo;but 0.999... <i>can\'t</i> equal 1!&rdquo; Yes it can. Yes it does. '
        + 'Here are <b>four proofs</b>. Pick your favorite.';
    page.appendChild(intro);

    page.appendChild(hr());

    // ── Proof 1: Algebraic ──
    const p1Title = el('h3', { style: 'color: #000080;' });
    p1Title.textContent = 'Proof 1: Algebraic';
    page.appendChild(p1Title);

    const p1Box = el('div', {
        style: 'border: 1px solid #000080; background: #F0F0FF; padding: 12px; margin: 10px 0; font-size: 15px;'
    });
    p1Box.innerHTML = `
        Let <i>x</i> = 0.999...<br><br>
        Then 10<i>x</i> = 9.999...<br><br>
        Subtract: 10<i>x</i> \u2212 <i>x</i> = 9.999... \u2212 0.999...<br><br>
        9<i>x</i> = 9<br><br>
        <b><i>x</i> = 1</b> \u25A0
    `;
    page.appendChild(p1Box);

    // ── Proof 2: Geometric Series ──
    const p2Title = el('h3', { style: 'color: #000080;' });
    p2Title.textContent = 'Proof 2: Geometric Series';
    page.appendChild(p2Title);

    const p2Box = el('div', {
        style: 'border: 1px solid #000080; background: #F0F0FF; padding: 12px; margin: 10px 0; font-size: 15px;'
    });
    p2Box.innerHTML = `
        0.999... = 9/10 + 9/100 + 9/1000 + \u2026<br><br>
        = 9 \u00B7 \u03A3<sub>n=1</sub><sup>\u221E</sup> (1/10)<sup>n</sup><br><br>
        = 9 \u00B7 (1/10) / (1 \u2212 1/10)<br><br>
        = 9 \u00B7 (1/10) / (9/10)<br><br>
        = 9 \u00B7 (1/9) = <b>1</b> \u25A0
    `;
    page.appendChild(p2Box);

    // ── Proof 3: Dedekind Cut ──
    const p3Title = el('h3', { style: 'color: #000080;' });
    p3Title.textContent = 'Proof 3: Dedekind Cut';
    page.appendChild(p3Title);

    const p3Box = el('div', {
        style: 'border: 1px solid #000080; background: #F0F0FF; padding: 12px; margin: 10px 0;'
    });
    p3Box.innerHTML = `
        <p>A real number is defined by its <i>Dedekind cut</i>: the set of all rationals less than it.</p>
        <p>The set of all rationals less than 0.999... is exactly the set of all rationals less than 1.</p>
        <p>Since they define the same cut, they are the <b>same real number</b>. \u25A0</p>
    `;
    page.appendChild(p3Box);

    // ── Proof 4: By Intimidation ──
    const p4Title = el('h3', { style: 'color: #000080;' });
    p4Title.textContent = 'Proof 4: By Intimidation';
    page.appendChild(p4Title);

    const p4Box = el('div', {
        style: 'border: 2px solid #CC0000; background: #FFF0F0; padding: 16px; margin: 10px 0; font-size: 16px; text-align: center;'
    });
    p4Box.innerHTML = '<b>Name a number between 0.999... and 1.</b><br><br>'
        + '<span style="font-size: 20px;">You can\'t.</span><br><br>'
        + '<span style="font-size: 12px; color: #666;">(If two real numbers have no number between them, they are equal. '
        + 'This is the Archimedean property of \u211D.)</span>';
    page.appendChild(p4Box);

    page.appendChild(hr());

    // ── Comment Thread ──
    const commentTitle = el('h3', { style: 'color: #000080;' });
    commentTitle.textContent = 'Comments';
    page.appendChild(commentTitle);

    const comments = [
        { name: 'Mike T.', date: 'March 12, 1998', text: 'This can\'t be right. There\'s always a gap.', indent: false },
        { name: 'Alex (reply)', date: 'March 12, 1998', text: 'Name the gap.', indent: true },
        { name: 'Mike T.', date: 'March 13, 1998', text: '0.999...5', indent: false },
        { name: 'Alex', date: 'March 13, 1998', text: 'That\'s not a real number, Mike.', indent: true },
        { name: 'SarahMath97', date: 'March 14, 1998', text: 'Alex is right. The limit IS 1.', indent: false },
        { name: 'Anonymous', date: 'March 15, 1998', text: 'Math is broken.', indent: false },
        { name: 'Professor Euler', date: 'March 16, 1998', text: 'Mathematics is not broken. Your intuition is. This is normal.', indent: false }
    ];

    comments.forEach(c => {
        const entryDiv = el('div', {
            style: 'border: 1px solid #C0C0C0; background: #FFFFF0; padding: 10px; margin: 8px 0;'
                + (c.indent ? ' margin-left: 30px; border-left: 3px solid #000080;' : '')
        });
        const header = el('p', { style: 'margin: 0 0 6px 0; font-size: 12px; color: #808080;' });
        header.innerHTML = `<b style="color: #000080;">${c.name}</b> &mdash; ${c.date}`;
        entryDiv.appendChild(header);

        const msg = el('p', { style: 'margin: 0; font-size: 13px;' });
        msg.textContent = c.text;
        entryDiv.appendChild(msg);

        page.appendChild(entryDiv);
    });

    page.appendChild(hr());

    const footer = el('p', { style: 'font-size: 11px; color: #808080; text-align: center;' });
    footer.appendChild(navLink('Student Projects', '/math/students/'));
    footer.appendChild(document.createTextNode(' | '));
    footer.appendChild(navLink('Math Department', '/math/'));
    page.appendChild(footer);

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 4. COMPLEX NUMBER CALCULATOR — /math/tools/complex/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the complex number calculator tool page.
 * Features working JS computation of complex arithmetic.
 * @returns {HTMLElement}
 */
function buildComplexCalcPage() {
    const page = retroPage();

    page.appendChild(navyHeader(
        'Complex Number Calculator',
        'Department of Mathematics &mdash; Online Tools'
    ));
    page.appendChild(hr());

    const intro = el('p');
    intro.innerHTML = 'Enter complex numbers in the form <code style="background:#F0F0F0; padding:2px 4px;">a+bi</code> '
        + '(e.g., <code style="background:#F0F0F0; padding:2px 4px;">3+4i</code>, '
        + '<code style="background:#F0F0F0; padding:2px 4px;">-2-i</code>, '
        + '<code style="background:#F0F0F0; padding:2px 4px;">5</code>, '
        + '<code style="background:#F0F0F0; padding:2px 4px;">i</code>).';
    page.appendChild(intro);

    // ── Applet container ──
    const appletBox = javaAppletBox();
    appletBox.style.maxWidth = '500px';
    appletBox.style.background = '#FFFFFF';
    appletBox.style.padding = '16px';

    // Input table
    const inputTable = el('table', { cellpadding: '6', cellspacing: '0', border: '0' });

    // z1
    const z1Row = el('tr');
    const z1Label = el('td', { style: 'font-weight: bold;' });
    z1Label.textContent = 'z\u2081 =';
    z1Row.appendChild(z1Label);
    const z1Td = el('td');
    const z1Input = document.createElement('input');
    z1Input.type = 'text';
    z1Input.value = '3+4i';
    z1Input.style.cssText = 'width: 180px; font-family: "Courier New", monospace; border: 1px inset #808080; padding: 2px 4px;';
    z1Td.appendChild(z1Input);
    z1Row.appendChild(z1Td);
    inputTable.appendChild(z1Row);

    // z2
    const z2Row = el('tr');
    const z2Label = el('td', { style: 'font-weight: bold;' });
    z2Label.textContent = 'z\u2082 =';
    z2Row.appendChild(z2Label);
    const z2Td = el('td');
    const z2Input = document.createElement('input');
    z2Input.type = 'text';
    z2Input.value = '1-2i';
    z2Input.style.cssText = 'width: 180px; font-family: "Courier New", monospace; border: 1px inset #808080; padding: 2px 4px;';
    z2Td.appendChild(z2Input);
    z2Row.appendChild(z2Td);
    inputTable.appendChild(z2Row);

    // Operation
    const opRow = el('tr');
    const opLabel = el('td', { style: 'font-weight: bold;' });
    opLabel.textContent = 'Operation:';
    opRow.appendChild(opLabel);
    const opTd = el('td');
    const opSelect = document.createElement('select');
    opSelect.style.cssText = 'font-family: "Courier New", monospace; border: 1px inset #808080; padding: 2px;';
    ['Add', 'Subtract', 'Multiply', 'Divide', 'Conjugate (z\u2081)', 'Modulus (|z\u2081|)', 'Argument (arg z\u2081)'].forEach(op => {
        const option = document.createElement('option');
        option.textContent = op;
        option.value = op;
        opSelect.appendChild(option);
    });
    opTd.appendChild(opSelect);
    opRow.appendChild(opTd);
    inputTable.appendChild(opRow);

    appletBox.appendChild(inputTable);

    // Calculate button
    const calcBtn = document.createElement('button');
    calcBtn.textContent = 'Calculate';
    calcBtn.style.cssText = 'font-family: "Times New Roman", serif; font-size: 14px; padding: 4px 20px; cursor: pointer; border: 2px outset #C0C0C0; background: #C0C0C0; margin: 10px 0;';
    appletBox.appendChild(calcBtn);

    // Result box
    const resultBox = el('div', {
        style: 'border: 2px solid #CCCC00; background: #FFFFF0; padding: 12px; margin-top: 10px; font-family: "Courier New", monospace; font-size: 14px; min-height: 60px;'
    });
    resultBox.textContent = 'Result will appear here.';
    appletBox.appendChild(resultBox);

    page.appendChild(appletBox);

    // ── Calculator logic ──
    calcBtn.addEventListener('click', () => {
        const z1 = parseComplex(z1Input.value);
        const z2 = parseComplex(z2Input.value);
        const op = opSelect.value;

        if (!z1) {
            resultBox.innerHTML = '<span style="color:red;">Error: Could not parse z\u2081</span>';
            return;
        }

        let result = null;
        let extraInfo = '';

        switch (op) {
            case 'Add':
                if (!z2) { resultBox.innerHTML = '<span style="color:red;">Error: Could not parse z\u2082</span>'; return; }
                result = { re: z1.re + z2.re, im: z1.im + z2.im };
                break;
            case 'Subtract':
                if (!z2) { resultBox.innerHTML = '<span style="color:red;">Error: Could not parse z\u2082</span>'; return; }
                result = { re: z1.re - z2.re, im: z1.im - z2.im };
                break;
            case 'Multiply':
                if (!z2) { resultBox.innerHTML = '<span style="color:red;">Error: Could not parse z\u2082</span>'; return; }
                result = {
                    re: z1.re * z2.re - z1.im * z2.im,
                    im: z1.re * z2.im + z1.im * z2.re
                };
                break;
            case 'Divide':
                if (!z2) { resultBox.innerHTML = '<span style="color:red;">Error: Could not parse z\u2082</span>'; return; }
                {
                    const denom = z2.re * z2.re + z2.im * z2.im;
                    if (denom === 0) {
                        resultBox.innerHTML = '<span style="color:red;">Error: Division by zero!</span>';
                        return;
                    }
                    result = {
                        re: (z1.re * z2.re + z1.im * z2.im) / denom,
                        im: (z1.im * z2.re - z1.re * z2.im) / denom
                    };
                }
                break;
            case 'Conjugate (z\u2081)':
                result = { re: z1.re, im: -z1.im };
                break;
            case 'Modulus (|z\u2081|)':
                {
                    const mod = Math.sqrt(z1.re * z1.re + z1.im * z1.im);
                    resultBox.innerHTML = `|z\u2081| = <b>${Math.round(mod * 10000) / 10000}</b>`;
                    return;
                }
            case 'Argument (arg z\u2081)':
                {
                    const arg = Math.atan2(z1.im, z1.re);
                    resultBox.innerHTML = `arg(z\u2081) = <b>${Math.round(arg * 10000) / 10000} rad</b> `
                        + `(${Math.round(arg * 180 / Math.PI * 100) / 100}\u00B0)`;
                    return;
                }
        }

        if (result) {
            const mod = Math.sqrt(result.re * result.re + result.im * result.im);
            const arg = Math.atan2(result.im, result.re);
            resultBox.innerHTML = `Result: <b>${formatComplex(result)}</b><br>`
                + `|z| = ${Math.round(mod * 10000) / 10000}<br>`
                + `arg(z) = ${Math.round(arg * 10000) / 10000} rad `
                + `(${Math.round(arg * 180 / Math.PI * 100) / 100}\u00B0)`;
        }
    });

    page.appendChild(hr());
    page.appendChild(backLink('Back to Math Tools', '/math/tools/'));

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 5. MATRIX MULTIPLIER — /math/tools/matrix/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the matrix multiplication tool page.
 * Two 2×2 input matrices, working multiplication, determinant, and trace.
 * @returns {HTMLElement}
 */
function buildMatrixToolPage() {
    const page = retroPage();

    page.appendChild(navyHeader(
        'Matrix Multiplication Tool',
        'Department of Mathematics &mdash; Online Tools'
    ));
    page.appendChild(hr());

    const intro = el('p');
    intro.innerHTML = 'Enter values for two 2\u00D72 matrices. Click <b>Multiply</b> to compute '
        + 'the product, determinant, and trace.';
    page.appendChild(intro);

    const inputStyle = 'width: 50px; font-family: "Courier New", monospace; border: 1px inset #808080; padding: 2px 4px; text-align: center;';

    /**
     * Create a 2×2 matrix input grid.
     * @param {string} label
     * @param {number[][]} defaults
     * @returns {{ container: HTMLElement, getValues: () => number[][] }}
     */
    function makeMatrixInput(label, defaults) {
        const wrapper = el('div', { style: 'display: inline-block; vertical-align: top; margin: 0 16px 10px 0;' });
        const title = el('p', { style: 'font-weight: bold; margin: 0 0 4px 0; text-align: center;' });
        title.textContent = label;
        wrapper.appendChild(title);

        const table = el('table', {
            cellpadding: '3', cellspacing: '0', border: '1',
            style: 'border-collapse: collapse; border-color: #808080;'
        });

        const inputs = [];
        for (let r = 0; r < 2; r++) {
            const row = el('tr');
            inputs[r] = [];
            for (let c = 0; c < 2; c++) {
                const td = el('td');
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.value = String(defaults[r][c]);
                inp.style.cssText = inputStyle;
                inputs[r][c] = inp;
                td.appendChild(inp);
                row.appendChild(td);
            }
            table.appendChild(row);
        }
        wrapper.appendChild(table);

        return {
            container: wrapper,
            getValues: () => inputs.map(row => row.map(inp => parseFloat(inp.value) || 0))
        };
    }

    const matA = makeMatrixInput('Matrix A', [[1, 0], [0, 1]]);
    const matB = makeMatrixInput('Matrix B', [[1, 0], [0, 1]]);

    const matricesDiv = el('div', { style: 'margin: 10px 0;' });
    matricesDiv.appendChild(matA.container);

    const timesSign = el('span', { style: 'font-size: 20px; vertical-align: middle; margin: 0 8px;' });
    timesSign.textContent = '\u00D7';
    matricesDiv.appendChild(timesSign);

    matricesDiv.appendChild(matB.container);
    page.appendChild(matricesDiv);

    // Multiply button
    const mulBtn = document.createElement('button');
    mulBtn.textContent = 'Multiply';
    mulBtn.style.cssText = 'font-family: "Times New Roman", serif; font-size: 14px; padding: 4px 20px; cursor: pointer; border: 2px outset #C0C0C0; background: #C0C0C0; margin: 6px 0;';
    page.appendChild(mulBtn);

    // Result area
    const resultDiv = el('div', {
        style: 'margin-top: 16px; border: 1px solid #808080; padding: 16px; background: #FFFFF0; min-height: 80px;'
    });
    resultDiv.innerHTML = '<i>Click Multiply to see the result.</i>';
    page.appendChild(resultDiv);

    // ── Multiplication logic ──
    mulBtn.addEventListener('click', () => {
        const A = matA.getValues();
        const B = matB.getValues();

        // C = A × B
        const C = [
            [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
            [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
        ];

        const det = C[0][0] * C[1][1] - C[0][1] * C[1][0];
        const trace = C[0][0] + C[1][1];

        resultDiv.innerHTML = '';

        const resultTitle = el('b');
        resultTitle.textContent = 'Result: A \u00D7 B =';
        resultDiv.appendChild(resultTitle);
        resultDiv.appendChild(el('br'));
        resultDiv.appendChild(el('br'));

        // Result matrix table
        const resTable = el('table', {
            cellpadding: '6', cellspacing: '0', border: '1',
            style: 'border-collapse: collapse; border-color: #000080; margin: 0 auto 12px auto;'
        });
        for (let r = 0; r < 2; r++) {
            const row = el('tr');
            for (let c = 0; c < 2; c++) {
                const td = el('td', {
                    style: 'padding: 8px 16px; text-align: center; font-family: "Courier New", monospace; font-size: 15px; background: #F0F0FF;'
                });
                td.textContent = Math.round(C[r][c] * 10000) / 10000;
                row.appendChild(td);
            }
            resTable.appendChild(row);
        }
        resultDiv.appendChild(resTable);

        const detP = el('p', { style: 'margin: 6px 0;' });
        detP.innerHTML = `<b>Determinant:</b> ${Math.round(det * 10000) / 10000}`;
        resultDiv.appendChild(detP);

        const traceP = el('p', { style: 'margin: 6px 0;' });
        traceP.innerHTML = `<b>Trace:</b> ${Math.round(trace * 10000) / 10000}`;
        resultDiv.appendChild(traceP);

        if (Math.abs(det) < 1e-10) {
            const warning = el('p', { style: 'color: #CC0000; font-weight: bold; margin-top: 8px;' });
            warning.textContent = '\u26A0 Matrix is singular! (det = 0)';
            resultDiv.appendChild(warning);
        }
    });

    page.appendChild(hr());
    page.appendChild(backLink('Back to Math Tools', '/math/tools/'));

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 6. FUNCTION PLOTTER — /math/tools/plotter/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the domain coloring function plotter page.
 * Renders complex functions using domain coloring on a canvas.
 * @returns {HTMLElement}
 */
function buildPlotterPage() {
    const page = retroPage();

    page.appendChild(navyHeader(
        'Function Plotter v2.1',
        'Prof. Wei\'s Complex Function Visualizer'
    ));
    page.appendChild(hr());

    const intro = el('p');
    intro.innerHTML = 'This tool visualizes complex functions using <b>domain coloring</b>. '
        + 'Each point in the complex plane is colored based on the output of f(z): '
        + 'hue represents the <i>argument</i> (angle), and brightness bands show the <i>modulus</i> (magnitude).';
    page.appendChild(intro);

    // Controls
    const controlsDiv = el('div', { style: 'margin: 10px 0;' });

    // Function selector
    const fnLabel = el('span', { style: 'font-weight: bold; margin-right: 6px;' });
    fnLabel.textContent = 'f(z) = ';
    controlsDiv.appendChild(fnLabel);

    const fnSelect = document.createElement('select');
    fnSelect.style.cssText = 'font-family: "Courier New", monospace; border: 1px inset #808080; padding: 2px; margin-right: 16px;';
    const functions = [
        { label: 'z\u00B2', key: 'z2' },
        { label: 'z\u00B3', key: 'z3' },
        { label: '1/z', key: 'inv' },
        { label: 'z\u00B2 + 1', key: 'z2p1' },
        { label: '(z\u00B2 \u2212 1)/(z\u00B2 + 1)', key: 'rational' }
    ];
    functions.forEach(fn => {
        const opt = document.createElement('option');
        opt.value = fn.key;
        opt.textContent = fn.label;
        fnSelect.appendChild(opt);
    });
    controlsDiv.appendChild(fnSelect);
    controlsDiv.appendChild(el('br'));
    controlsDiv.appendChild(el('br'));

    // Range controls
    const rangeLabel = el('span', { style: 'font-size: 12px; color: #666;' });
    rangeLabel.textContent = 'Domain: x \u2208 [\u22123, 3], y \u2208 [\u22123, 3]';
    controlsDiv.appendChild(rangeLabel);

    page.appendChild(controlsDiv);

    // Canvas applet
    const appletLabel = el('p', { style: 'font-size: 11px; color: #808080; margin-bottom: 4px;' });
    appletLabel.textContent = 'Java Applet — ComplexPlotter.class';
    page.appendChild(appletLabel);

    const appletBox = javaAppletBox();
    appletBox.style.maxWidth = '316px';

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 250;
    canvas.style.cssText = 'display: block; image-rendering: auto;';
    appletBox.appendChild(canvas);
    page.appendChild(appletBox);

    // Render button
    const renderBtn = document.createElement('button');
    renderBtn.textContent = 'Render';
    renderBtn.style.cssText = 'font-family: "Times New Roman", serif; font-size: 14px; padding: 4px 20px; cursor: pointer; border: 2px outset #C0C0C0; background: #C0C0C0; margin: 8px 0;';
    page.appendChild(renderBtn);

    // ── Domain coloring renderer ──
    const W = canvas.width, H = canvas.height;
    const xMin = -3, xMax = 3, yMin = -3, yMax = 3;

    /**
     * Evaluate complex function f(z).
     * @param {string} fnKey
     * @param {number} re
     * @param {number} im
     * @returns {[number, number]} [re, im] of f(z)
     */
    function evalFn(fnKey, re, im) {
        switch (fnKey) {
            case 'z2': {
                return [re * re - im * im, 2 * re * im];
            }
            case 'z3': {
                const r2 = re * re, i2 = im * im;
                return [re * r2 - 3 * re * i2, 3 * r2 * im - im * i2];
            }
            case 'inv': {
                const d = re * re + im * im;
                if (d < 1e-14) return [1e10, 0];
                return [re / d, -im / d];
            }
            case 'z2p1': {
                return [re * re - im * im + 1, 2 * re * im];
            }
            case 'rational': {
                // (z² - 1) / (z² + 1)
                const nr = re * re - im * im - 1;
                const ni = 2 * re * im;
                const dr = re * re - im * im + 1;
                const di = 2 * re * im;
                const denom = dr * dr + di * di;
                if (denom < 1e-14) return [1e10, 0];
                return [(nr * dr + ni * di) / denom, (ni * dr - nr * di) / denom];
            }
            default:
                return [re, im];
        }
    }

    /**
     * Convert HSL to RGB.
     * @param {number} h - Hue [0, 360)
     * @param {number} s - Saturation [0, 1]
     * @param {number} l - Lightness [0, 1]
     * @returns {[number, number, number]}
     */
    function hslToRgb(h, s, l) {
        h /= 360;
        const a = s * Math.min(l, 1 - l);
        const f = (n) => {
            const k = (n + h * 12) % 12;
            return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        };
        return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }

    function renderPlot() {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(W, H);
        const data = imageData.data;
        const fnKey = fnSelect.value;

        for (let py = 0; py < H; py++) {
            for (let px = 0; px < W; px++) {
                const re = xMin + (px / W) * (xMax - xMin);
                const im = yMax - (py / H) * (yMax - yMin);  // flip Y

                const [fRe, fIm] = evalFn(fnKey, re, im);

                // Hue from argument
                let arg = Math.atan2(fIm, fRe);
                if (arg < 0) arg += Math.PI * 2;
                const hue = (arg / (Math.PI * 2)) * 360;

                // Brightness banding from log modulus
                const mod = Math.sqrt(fRe * fRe + fIm * fIm);
                const logMod = Math.log(mod + 1e-10);
                const band = 0.5 + 0.15 * Math.sin(logMod * Math.PI * 2);

                const [r, g, b] = hslToRgb(hue, 0.9, Math.max(0.1, Math.min(0.9, band)));

                const idx = (py * W + px) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Draw axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        // X axis
        const yAxisPx = Math.round((-yMin / (yMax - yMin)) * H);
        ctx.beginPath();
        ctx.moveTo(0, yAxisPx);
        ctx.lineTo(W, yAxisPx);
        ctx.stroke();
        // Y axis
        const xAxisPx = Math.round((-xMin / (xMax - xMin)) * W);
        ctx.beginPath();
        ctx.moveTo(xAxisPx, 0);
        ctx.lineTo(xAxisPx, H);
        ctx.stroke();
    }

    // Render on button click
    renderBtn.addEventListener('click', renderPlot);
    // Also render on function change
    fnSelect.addEventListener('change', renderPlot);

    // Initial render
    requestAnimationFrame(() => renderPlot());

    page.appendChild(hr());

    const legend = el('p', { style: 'font-size: 12px; color: #333;' });
    legend.innerHTML = '<b>Reading the plot:</b> Each color represents an argument (angle) of f(z). '
        + 'Red = 0\u00B0, Yellow = 60\u00B0, Green = 120\u00B0, Cyan = 180\u00B0, Blue = 240\u00B0, Magenta = 300\u00B0. '
        + 'Brightness bands show where |f(z)| crosses integer powers of <i>e</i>. '
        + 'Zeros appear as points where all colors converge; poles show rapid bright/dark oscillation.';
    page.appendChild(legend);

    page.appendChild(hr());
    page.appendChild(backLink('Back to Math Tools', '/math/tools/'));

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 7. SECRET FACULTY MINUTES — /math/~secret/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the hidden faculty minutes page.
 * Password protected — accepted passwords: "euler", "271828", "e".
 * @returns {HTMLElement}
 */
function buildSecretPage() {
    const page = retroPage();

    const comment = document.createComment(' The password is the base of the natural logarithm. ');
    page.appendChild(comment);

    page.appendChild(navyHeader(
        '\uD83D\uDD12 Faculty Area &mdash; Restricted Access',
        'Department of Mathematics &mdash; Gauss-Riemann University'
    ));
    page.appendChild(hr());

    const notice = el('p', { style: 'color: #CC0000; font-weight: bold; text-align: center; margin: 20px 0;' });
    notice.textContent = 'This page is restricted to faculty members.';
    page.appendChild(notice);

    const prompt = el('p', { style: 'text-align: center;' });
    prompt.textContent = 'Please enter the faculty password to continue:';
    page.appendChild(prompt);

    // Password form
    const formDiv = el('div', { style: 'text-align: center; margin: 16px 0;' });
    const pwInput = document.createElement('input');
    pwInput.type = 'password';
    pwInput.style.cssText = 'width: 200px; font-family: "Courier New", monospace; border: 1px inset #808080; padding: 4px 8px; margin-right: 8px;';
    pwInput.placeholder = 'Enter password';
    formDiv.appendChild(pwInput);

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Enter';
    submitBtn.style.cssText = 'font-family: "Times New Roman", serif; font-size: 14px; padding: 4px 16px; cursor: pointer; border: 2px outset #C0C0C0; background: #C0C0C0;';
    formDiv.appendChild(submitBtn);
    page.appendChild(formDiv);

    const errorMsg = el('p', { style: 'color: #CC0000; text-align: center; display: none; font-size: 13px;' });
    errorMsg.textContent = 'Incorrect password. Access denied.';
    page.appendChild(errorMsg);

    // Hidden content
    const secretContent = el('div', { style: 'display: none;' });

    const revealTitle = el('h3', { style: 'color: #000080;' });
    revealTitle.textContent = 'Faculty Meeting Minutes';
    secretContent.appendChild(revealTitle);

    // October meeting
    const oct = el('div', {
        style: 'border: 1px solid #C0C0C0; background: #FFFFF0; padding: 12px; margin: 10px 0;'
    });
    oct.innerHTML = `
        <p style="font-weight: bold; color: #000080; margin-top: 0;">October 3, 1997</p>
        <p>Prof. Cantor proposed a new course on transfinite arithmetic.
        Prof. Euler expressed concern that &ldquo;undergraduates are not ready to confront the infinite.&rdquo;
        Prof. Cantor replied: &ldquo;The infinite confronts them whether they are ready or not.&rdquo;</p>
        <p style="font-style: italic;">Motion passed, 4&ndash;1.</p>
    `;
    secretContent.appendChild(oct);

    // November meeting
    const nov = el('div', {
        style: 'border: 1px solid #C0C0C0; background: #FFFFF0; padding: 12px; margin: 10px 0;'
    });
    nov.innerHTML = `
        <p style="font-weight: bold; color: #000080; margin-top: 0;">November 15, 1997</p>
        <p>Discussion of the department website. Prof. M\u00F6bius suggested adding a visitor counter.
        Prof. Wei asked &ldquo;will anyone actually visit?&rdquo;
        Prof. Euler replied: &ldquo;Build it and they will come. That is a theorem, not a conjecture.&rdquo;</p>
    `;
    secretContent.appendChild(nov);

    // December meeting
    const dec = el('div', {
        style: 'border: 1px solid #C0C0C0; background: #FFFFF0; padding: 12px; margin: 10px 0;'
    });
    dec.innerHTML = `
        <p style="font-weight: bold; color: #000080; margin-top: 0;">December 1, 1997</p>
        <p>Reports that a student found &ldquo;something unusual&rdquo; on the prime number page.
        Prof. Euler asked for clarification. The student in question (M. Al-Rashid) could not explain
        what he had seen, only that &ldquo;it didn\'t look right.&rdquo;</p>
        <p style="font-style: italic; color: #666;">Item tabled. No further action.</p>
    `;
    secretContent.appendChild(dec);

    secretContent.appendChild(hr());

    // Links to other hidden pages
    const hiddenLinks = el('p', { style: 'font-size: 13px;' });
    hiddenLinks.appendChild(document.createTextNode('See also: '));
    hiddenLinks.appendChild(navLink('The Conjecture', '/math/~secret/conjecture/'));
    hiddenLinks.appendChild(document.createTextNode(' | '));
    hiddenLinks.appendChild(navLink('field.html', '/math/~secret/field/'));
    secretContent.appendChild(hiddenLinks);

    // Additional meeting — only visible as faint text at the very bottom
    const aldricMeeting = el('div', {
        style: 'border: 1px solid #E8E8E8; background: #FEFEFE; padding: 12px; margin: 24px 0 10px 0; opacity: 0.35;'
    });
    aldricMeeting.innerHTML = `
        <p style="font-weight: bold; color: #999; margin-top: 0; font-size: 11px;">September 8, 1987 (recovered)</p>
        <p style="font-size: 11px; color: #999;">Emergency session called by Prof. Wei regarding the \"field rendering project.\"
        A colleague identified only as \"M. Aldric\" reported anomalies in the output &mdash;
        recurring instances of the number 1597 in builds he did not author.
        Department could find no employment record for an \"M. Aldric.\"
        Prof. Euler motioned to table the matter. Motion carried unanimously.</p>
        <p style="font-style: italic; color: #BBB; font-size: 10px;">Note: This record was found in a filing cabinet in Hardy Hall basement, November 1998. No other documentation of this meeting exists.</p>
    `;
    secretContent.appendChild(aldricMeeting);

    page.appendChild(secretContent);

    // ── Password logic ──
    function tryPassword() {
        const pw = pwInput.value.trim().toLowerCase();
        if (pw === 'euler' || pw === '271828' || pw === 'e') {
            // Grant access
            formDiv.style.display = 'none';
            notice.style.display = 'none';
            prompt.style.display = 'none';
            errorMsg.style.display = 'none';
            secretContent.style.display = 'block';
        } else {
            errorMsg.style.display = 'block';
            pwInput.value = '';
            pwInput.focus();
        }
    }

    submitBtn.addEventListener('click', tryPassword);
    pwInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryPassword();
    });

    page.appendChild(hr());
    page.appendChild(backLink('Back to Department Homepage', '/math/'));

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 8. THE CONJECTURE — /math/~secret/conjecture/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the hidden conjecture page — a fake math paper abstract.
 * @returns {HTMLElement}
 */
function buildConjecturePage() {
    const page = retroPage();

    const comment = document.createComment(' This paper does not exist. But the conjecture might be true. ');
    page.appendChild(comment);

    // Styled like an academic paper
    const titleBlock = el('div', { style: 'text-align: center; margin: 30px 0 20px 0;' });

    const paperTitle = el('h2', { style: 'font-family: "Times New Roman", serif; font-size: 18px; margin-bottom: 8px;' });
    paperTitle.textContent = 'On the Topological Invariance of Arithmetic Density in Self-Similar Structures';
    titleBlock.appendChild(paperTitle);

    const author = el('p', { style: 'font-size: 14px; margin: 4px 0;' });
    author.innerHTML = '<i>Prof. Elena Cantor</i><br>'
        + '<span style="font-size: 12px; color: #666;">Department of Mathematics, Gauss-Riemann University</span>';
    titleBlock.appendChild(author);

    const date = el('p', { style: 'font-size: 12px; color: #808080;' });
    date.textContent = 'Preprint — November 1997';
    titleBlock.appendChild(date);

    page.appendChild(titleBlock);
    page.appendChild(hr());

    // Abstract
    const absTitle = el('h3', { style: 'color: #000080; font-size: 14px;' });
    absTitle.textContent = 'Abstract';
    page.appendChild(absTitle);

    const abstract = el('div', {
        style: 'border: 1px solid #C0C0C0; padding: 16px; margin: 10px 0; text-align: justify; line-height: 1.6;'
    });
    abstract.innerHTML = `
        <p>We conjecture that for any self-similar fractal structure <i>F</i> with Hausdorff dimension
        <i>d</i>, the density of prime numbers among the integer lattice points contained in <i>F</i>
        approaches a value determined solely by <i>d</i> and the prime-counting function \u03C0(<i>x</i>).
        Specifically, if <i>N</i>(<i>F</i>, <i>x</i>) denotes the number of lattice points in <i>F</i>
        \u2229 [0, <i>x</i>]<sup><i>n</i></sup>, we conjecture:</p>

        <div style="text-align: center; font-size: 16px; margin: 16px 0;">
            lim<sub><i>x</i>\u2192\u221E</sub>
            <span style="display:inline-block; text-align:center; vertical-align:middle;">
                <span style="border-bottom: 1px solid #000; padding: 0 4px;">\u03C0(<i>F</i>, <i>x</i>)</span><br>
                <span style="padding: 0 4px;"><i>N</i>(<i>F</i>, <i>x</i>)</span>
            </span>
            =
            <span style="display:inline-block; text-align:center; vertical-align:middle;">
                <span style="border-bottom: 1px solid #000; padding: 0 4px;"><i>C</i>(<i>d</i>)</span><br>
                <span style="padding: 0 4px;">ln <i>x</i></span>
            </span>
        </div>

        <p>where <i>C</i>(<i>d</i>) is a constant depending only on the Hausdorff dimension <i>d</i>,
        and \u03C0(<i>F</i>, <i>x</i>) counts primes at lattice points of <i>F</i> below <i>x</i>.
        The case <i>d</i> = 1 reduces to the Prime Number Theorem. We verify the conjecture
        computationally for the Sierpi\u0144ski triangle (<i>d</i> = log 3/log 2 \u2248 1.585)
        and the Cantor set (<i>d</i> = log 2/log 3 \u2248 0.631) up to <i>x</i> = 10<sup>8</sup>.</p>

        <p>We further show that if the conjecture holds, then the distribution of primes is a
        <i>topological invariant</i> of the fractal — that is, homeomorphic fractals of the same
        dimension share the same arithmetic density constant <i>C</i>(<i>d</i>).</p>

        <p style="font-size: 12px; color: #808080; margin-top: 12px;">
        <b>Keywords:</b> prime distribution, Hausdorff dimension, fractal lattice points,
        arithmetic density, self-similarity, prime number theorem generalization.
        </p>
    `;
    page.appendChild(abstract);

    page.appendChild(hr());

    // Status
    const status = el('p', { style: 'font-style: italic; color: #666;' });
    status.innerHTML = 'Status: Submitted to <i>Annals of Mathematics</i>. Under review.<br>'
        + '<span style="font-size: 11px;">Note: The referee\'s first comment was: &ldquo;If this is true, everything changes.&rdquo;</span>';
    page.appendChild(status);

    page.appendChild(hr());
    page.appendChild(backLink('Back to Faculty Area', '/math/~secret/'));

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 9. THE FIELD — /math/~secret/field/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the hidden field page. Minimal, eerie, centered text.
 * @returns {HTMLElement}
 */
function buildFieldPage() {
    const page = el('div', {
        className: 'retro-page',
        style: 'font-family: "Times New Roman", Times, serif; font-size: 16px; color: #000000; background: #FFFFFF; padding: 60px 20px; max-width: 760px; margin: 0 auto; text-align: center; min-height: 400px;'
    });

    const comment = document.createComment(' You found it. ');
    page.appendChild(comment);

    const lines = [
        'The field is not what you think it is.',
        'The field has always been here.',
        'Before the university. Before the web. Before numbers.',
        'The field is the field.'
    ];

    lines.forEach((line, i) => {
        const p = el('p', {
            style: `color: #000000; margin: 24px 0; font-style: italic; opacity: ${0.9 - i * 0.12};`
        });
        p.textContent = line;
        page.appendChild(p);
    });

    // Long pause then a small link
    const spacer = el('div', { style: 'margin-top: 80px;' });
    const tiny = el('p', { style: 'font-size: 10px; color: #C0C0C0;' });
    tiny.appendChild(navLink('return', '/math/~secret/', 'color: #C0C0C0; font-size: 10px;'));
    spacer.appendChild(tiny);
    page.appendChild(spacer);

    // Almost invisible link — only findable by highlighting or view-source
    const hidden = el('p', { style: 'font-size: 1px; color: #FEFEFE; margin-top: 40px; user-select: all;' });
    hidden.appendChild(navLink('.', '/math/~secret/operator0/', 'color: #FEFEFE; font-size: 1px;'));
    page.appendChild(hidden);

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 10. WEBRING — /math/webring/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the mathematics webring page.
 * @returns {HTMLElement}
 */
function buildWebringPage() {
    const page = retroPage();

    // ASCII art border
    const banner = el('pre', {
        style: 'font-family: "Courier New", monospace; font-size: 13px; text-align: center; margin: 0 0 10px 0; line-height: 1.3;'
    });
    banner.textContent =
`+==================================================+
|                                                  |
|         \u2605 MATHEMATICS WEBRING \u2605                 |
|                                                  |
|     Connecting the world's math pages since 1996 |
|                                                  |
+==================================================+`;
    page.appendChild(banner);

    page.appendChild(hr());

    // Navigation links
    const navDiv = el('div', { style: 'text-align: center; margin: 16px 0; font-size: 14px;' });
    navDiv.appendChild(document.createTextNode('[ '));
    navDiv.appendChild(navLink('\u25C0 Previous Site', '/math/guestbook/'));
    navDiv.appendChild(document.createTextNode(' ] [ '));

    // "Random" link — pick a random registered path
    const randomLink = document.createElement('a');
    randomLink.textContent = '\uD83C\uDFB2 Random Site';
    randomLink.style.cssText = 'color: #0000EE; text-decoration: underline; cursor: pointer;';
    randomLink.addEventListener('click', (e) => {
        e.preventDefault();
        const paths = [
            '/math/', '/math/faculty/', '/math/students/', '/math/tools/',
            '/math/guestbook/', '/math/students/dchen/mandelbrot/',
            '/math/students/ktanaka/4d/', '/math/students/malrashid/primes/',
            '/math/students/apark/099999/', '/math/tools/complex/',
            '/math/tools/matrix/', '/math/tools/plotter/', '/math/courses/math407/'
        ];
        const pick = paths[Math.floor(Math.random() * paths.length)];
        randomLink.setAttribute('data-href', pick);
        // Trigger the delegated click handler by dispatching a new click
        const evt = new MouseEvent('click', { bubbles: true });
        randomLink.dispatchEvent(evt);
    });
    navDiv.appendChild(randomLink);

    navDiv.appendChild(document.createTextNode(' ] [ '));
    navDiv.appendChild(navLink('Next Site \u25B6', '/math/'));
    navDiv.appendChild(document.createTextNode(' ] [ '));
    navDiv.appendChild(navLink('List All Sites', '#'));
    navDiv.appendChild(document.createTextNode(' ]'));
    page.appendChild(navDiv);

    page.appendChild(hr());

    // Ring members
    const membersTitle = el('h3', { style: 'color: #000080; text-align: center;' });
    membersTitle.textContent = 'Ring Members';
    page.appendChild(membersTitle);

    const members = [
        { name: 'GRU Dept. of Mathematics', url: '/math/', desc: 'You are here!' },
        { name: 'MathWorld (Wolfram)', url: null, desc: 'Eric Weisstein\'s encyclopedic math reference' },
        { name: 'MacTutor History of Mathematics', url: null, desc: 'Biographies and history from St Andrews' },
        { name: 'Cut-the-Knot', url: null, desc: 'Alexander Bogomolny\'s interactive math miscellany' },
        { name: 'The Math Forum', url: null, desc: 'Swarthmore\'s forum for math education' },
        { name: 'The On-Line Encyclopedia of Integer Sequences', url: null, desc: 'Neil Sloane\'s OEIS — every integer sequence you can imagine' },
        { name: 'The Geometry Junkyard', url: null, desc: 'David Eppstein\'s collection of computational geometry resources' }
    ];

    const memberList = el('table', {
        width: '100%', cellpadding: '6', cellspacing: '0', border: '1',
        style: 'border-collapse: collapse; border-color: #808080; margin: 10px 0;'
    });
    const headerRow = el('tr', { bgcolor: '#E0E0FF' });
    headerRow.innerHTML = '<th style="text-align:left; color:#000080; padding:6px;">Site</th>'
        + '<th style="text-align:left; color:#000080; padding:6px;">Description</th>';
    memberList.appendChild(headerRow);

    members.forEach(m => {
        const row = el('tr');
        const nameCell = el('td', { style: 'padding: 6px;' });
        if (m.url) {
            nameCell.appendChild(navLink(m.name, m.url));
        } else {
            const extLink = el('a', { style: 'color: #0000EE; text-decoration: underline; cursor: pointer;' });
            extLink.textContent = m.name;
            extLink.title = 'External site — not available in this browser';
            nameCell.appendChild(extLink);
        }
        row.appendChild(nameCell);

        const descCell = el('td', { style: 'padding: 6px; font-size: 12px;' });
        descCell.textContent = m.desc;
        row.appendChild(descCell);

        memberList.appendChild(row);
    });
    page.appendChild(memberList);

    page.appendChild(hr());

    const joinInfo = el('p', { style: 'font-size: 12px; color: #666; text-align: center;' });
    joinInfo.innerHTML = 'Want to join the Mathematics WebRing? Email <a href="mailto:webring@gru.edu" style="color:#0000EE;">webring@gru.edu</a> with your site URL.';
    page.appendChild(joinInfo);

    const footer = el('p', { style: 'font-size: 11px; color: #808080; text-align: center;' });
    footer.innerHTML = 'WebRing managed by Prof. M\u00F6bius<br>Last updated: August 1997';
    page.appendChild(footer);

    page.appendChild(backLink('Back to Department Homepage', '/math/'));

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 11. STUDENT PROJECTS INDEX — /math/students/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the student projects index page.
 * @returns {HTMLElement}
 */
function buildStudentIndexPage() {
    const page = retroPage();

    page.appendChild(navyHeader(
        'Student Projects',
        'Department of Mathematics &mdash; Gauss-Riemann University'
    ));
    page.appendChild(hr());

    const intro = el('p');
    intro.innerHTML = 'The following projects were created by our undergraduate students. '
        + 'Some are class assignments, others are labors of love. All are mathematical.';
    page.appendChild(intro);

    const projects = [
        {
            name: 'Dave Chen',
            title: 'Mandelbrot Set Explorer',
            path: '/math/students/dchen/mandelbrot/',
            desc: 'Interactive fractal renderer — zoom in forever, or until Netscape crashes.',
            course: 'MATH 450: Complex Analysis, Fall 1997'
        },
        {
            name: 'Keiko Tanaka',
            title: '4D Polytope Visualizer',
            path: '/math/students/ktanaka/4d/',
            desc: 'Wireframe tesseract rotation applet. See the fourth dimension (sort of).',
            course: 'MATH 407: Projective Geometry, Spring 1998'
        },
        {
            name: 'Mohammed Al-Rashid',
            title: 'Prime Number List',
            path: '/math/students/malrashid/primes/',
            desc: 'Every prime up to ten million. Computed on a Pentium 133MHz.',
            course: 'CS 201 / MATH 301, Fall 1997'
        },
        {
            name: 'Alex Park',
            title: 'Is 0.999... = 1?',
            path: '/math/students/apark/099999/',
            desc: 'Four proofs that 0.999... equals 1. Includes a heated comment section.',
            course: 'MATH 301: Real Analysis, Spring 1998'
        }
    ];

    const table = el('table', {
        width: '100%', cellpadding: '8', cellspacing: '0', border: '1',
        style: 'border-collapse: collapse; border-color: #808080;'
    });

    const headerRow = el('tr', { bgcolor: '#E0E0FF' });
    ['Student', 'Project', 'Course'].forEach(label => {
        const th = el('th', { style: 'text-align: left; padding: 6px; color: #000080;' });
        th.textContent = label;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    projects.forEach(p => {
        const row = el('tr');

        const nameCell = el('td', { style: 'padding: 6px; font-weight: bold;' });
        nameCell.textContent = p.name;
        row.appendChild(nameCell);

        const projCell = el('td', { style: 'padding: 6px;' });
        projCell.appendChild(navLink(p.title, p.path));
        projCell.appendChild(el('br'));
        const desc = el('span', { style: 'font-size: 11px; color: #666;' });
        desc.textContent = p.desc;
        projCell.appendChild(desc);
        row.appendChild(projCell);

        const courseCell = el('td', { style: 'padding: 6px; font-size: 12px; color: #333;' });
        courseCell.textContent = p.course;
        row.appendChild(courseCell);

        table.appendChild(row);
    });
    page.appendChild(table);

    page.appendChild(hr());

    const submitInfo = el('p', { style: 'font-size: 12px; color: #666;' });
    submitInfo.innerHTML = 'Students: Want your project listed here? Email <a href="mailto:webmaster@gru.edu" style="color:#0000EE;">webmaster@gru.edu</a> with your files on a floppy disk.';
    page.appendChild(submitInfo);

    page.appendChild(backLink('Back to Department Homepage', '/math/'));

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 12. MATH TOOLS INDEX — /math/tools/
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the math tools index page.
 * @returns {HTMLElement}
 */
function buildToolsIndexPage() {
    const page = retroPage();

    page.appendChild(navyHeader(
        'Mathematics Tools',
        'Department of Mathematics &mdash; Online Resources'
    ));
    page.appendChild(hr());

    const intro = el('p');
    intro.innerHTML = 'Interactive tools for computation and visualization, '
        + 'developed by faculty and students. Requires a Java-compatible browser '
        + '(Netscape Navigator 3.0+ or Internet Explorer 4.0+).';
    page.appendChild(intro);

    const tools = [
        {
            title: 'Complex Number Calculator',
            path: '/math/tools/complex/',
            desc: 'Add, subtract, multiply, divide complex numbers. Computes modulus and argument.',
            author: 'Dept. of Mathematics'
        },
        {
            title: 'Matrix Multiplier',
            path: '/math/tools/matrix/',
            desc: 'Multiply 2\u00D72 matrices. Shows determinant, trace, and singularity warnings.',
            author: 'Dept. of Mathematics'
        },
        {
            title: 'Function Plotter v2.1',
            path: '/math/tools/plotter/',
            desc: 'Domain coloring visualizer for complex functions. See how f(z) transforms the complex plane.',
            author: 'Prof. Li Wei'
        }
    ];

    const list = el('table', {
        width: '100%', cellpadding: '8', cellspacing: '0', border: '1',
        style: 'border-collapse: collapse; border-color: #808080;'
    });
    const headerRow = el('tr', { bgcolor: '#E0E0FF' });
    ['Tool', 'Author'].forEach(label => {
        const th = el('th', { style: 'text-align: left; padding: 6px; color: #000080;' });
        th.textContent = label;
        headerRow.appendChild(th);
    });
    list.appendChild(headerRow);

    tools.forEach(t => {
        const row = el('tr');

        const toolCell = el('td', { style: 'padding: 6px;' });
        toolCell.appendChild(navLink(t.title, t.path));
        toolCell.appendChild(el('br'));
        const desc = el('span', { style: 'font-size: 11px; color: #666;' });
        desc.textContent = t.desc;
        toolCell.appendChild(desc);
        row.appendChild(toolCell);

        const authorCell = el('td', { style: 'padding: 6px; font-size: 12px;' });
        authorCell.textContent = t.author;
        row.appendChild(authorCell);

        list.appendChild(row);
    });
    page.appendChild(list);

    page.appendChild(hr());

    const request = el('p', { style: 'font-size: 12px; color: #666;' });
    request.innerHTML = 'Have a suggestion for a new tool? Contact <a href="mailto:lwei@gru.edu" style="color:#0000EE;">Prof. Wei</a>.';
    page.appendChild(request);

    page.appendChild(backLink('Back to Department Homepage', '/math/'));

    return page;
}


// ─────────────────────────────────────────────────────────────────────────
// 13. OPERATOR 0 — /math/~secret/operator0/
// ─────────────────────────────────────────────────────────────────────────

function buildOperator0Page() {
    const page = el('div', {
        className: 'retro-page',
        style: 'font-family: "Courier New", Courier, monospace; font-size: 13px; color: #00CC00; background: #0a0a0a; padding: 20px; max-width: 760px; margin: 0 auto; min-height: 500px;'
    });

    const comment = document.createComment(' build 0 — operator 0 — you were not supposed to find this ');
    page.appendChild(comment);

    const headerLines = [
        '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557',
        '\u2551  RECOVERED FILE \u2014 HARDY HALL SERVER \u2014 DISK 3 SECTOR 1597 \u2551',
        '\u2551  LAST MODIFIED: 1987-11-14 23:47:00                     \u2551',
        '\u2551  AUTHOR: OPERATOR 0 (M. ALDRIC)                         \u2551',
        '\u2551  STATUS: \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588                            \u2551',
        '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D',
    ];

    const headerBlock = el('pre', { style: 'color: #00CC00; font-size: 11px; margin-bottom: 20px; overflow-x: auto;' });
    headerBlock.textContent = headerLines.join('\n');
    page.appendChild(headerBlock);

    page.appendChild(el('hr', { style: 'border:none; border-top: 1px solid #003300; margin: 12px 0;' }));

    const entries = [
        { d: '1986-03-12', t: 'Build initialized. Field renderer v0.1. Everything is clean. Everything is mine.' },
        { d: '1986-11-02', t: 'First occurrence of 1597. Vertex count. Not in my constants. Not in any imported library. It appeared on its own.' },
        { d: '1987-02-28', t: 'I rewrote everything from scratch. New language, new compiler, new machine. 1597 appeared in the first output. Before I wrote a single number.' },
        { d: '1987-06-22', t: 'Plotted every object position in the field on graph paper. Connected the dots. It\'s the Mandelbrot set. I placed those objects randomly. There is no randomness here.' },
        { d: '1987-07-15', t: 'Created a test entity. Tall. Dark. Stands at render distance. Named it WATCHER. Deleted it after testing. It is still in the build. It is still watching.' },
        { d: '1987-09-18', t: 'The monolith has four faces. I only coded three materials. The fourth face shows... something. It changes. Sometimes it shows code. Sometimes it shows a room.' },
        { d: '1987-11-01', t: 'Frequency analysis of the monolith hum: 1.597 Hz. The Fibonacci prime. It hums through the speakers when the program is not running.' },
        { d: '1987-11-14', t: 'Final entry. I understand now. The field is a memory. The stones are doors. The watcher is the space where I used to be. I am going to walk to the monolith. I need to see the fourth face.' },
    ];

    entries.forEach((e, i) => {
        const line = el('div', { style: `margin: 10px 0; opacity: ${1 - i * 0.06};` });
        const date = el('span', { style: 'color: #008800;' });
        date.textContent = `[${e.d}] `;
        line.appendChild(date);
        const text = el('span', { style: 'color: #00CC00;' });
        text.textContent = e.t;
        line.appendChild(text);
        page.appendChild(line);
    });

    page.appendChild(el('hr', { style: 'border:none; border-top: 1px solid #003300; margin: 20px 0;' }));

    const note = el('div', { style: 'color: #666600; margin: 20px 0; font-size: 12px;' });
    note.innerHTML = `<b>[ADDENDUM \u2014 S. Bingby \u2014 1987-11-15]</b><br>
        Aldric\'s office is empty. His terminal was still on. The monitor showed a green field.<br>
        The cursor was blinking in an empty input prompt.<br>
        I typed "hello" and pressed Enter.<br>
        The response was: <span style="color:#CC0000;">1597</span><br><br>
        I have taken over the project. I will not delete this file.<br>
        Someone should know.`;
    page.appendChild(note);

    page.appendChild(el('hr', { style: 'border:none; border-top: 1px solid #003300; margin: 20px 0;' }));

    const cipher = el('div', { style: 'color: #003300; font-size: 10px; margin: 40px 0 10px 0;' });
    cipher.textContent = 'Gur svryq vf abg n fvzhyngvba. Vg vf n zrzbel. Rirel cevzr fgbar vf n qbbe. V bcrarq gurz nyy.';
    page.appendChild(cipher);

    const spacer = el('div', { style: 'margin-top: 60px;' });
    const tiny = el('p', { style: 'font-size: 9px;' });
    tiny.appendChild(navLink('return', '/math/~secret/field/', 'color: #003300; font-size: 9px;'));
    spacer.appendChild(tiny);
    page.appendChild(spacer);

    return page;
}


/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRATION
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Register all Phase 11 (v2) university pages with the supplied PageManager.
 *
 * Call this after registerUniversityPages() so that v1 pages are already loaded.
 * v2 adds: student project pages, interactive tools, hidden pages, webring, indices.
 *
 * @param {PageManager} pageManager — A PageManager exposing registerPage(path, {title, buildFn})
 */
export function registerUniversityPagesV2(pageManager) {

    // ── Student Projects ──
    pageManager.registerPage('/math/students/ktanaka/4d/', {
        title: 'Exploring the Fourth Dimension — Keiko Tanaka',
        buildFn: buildKeiko4DPage
    });

    pageManager.registerPage('/math/students/malrashid/primes/', {
        title: 'The Prime Numbers — Mohammed Al-Rashid',
        buildFn: buildPrimesPage
    });

    pageManager.registerPage('/math/students/apark/099999/', {
        title: 'Is 0.999... = 1? — Alex Park',
        buildFn: build0999Page
    });

    // ── Math Tools ──
    pageManager.registerPage('/math/tools/complex/', {
        title: 'Complex Number Calculator — GRU Mathematics',
        buildFn: buildComplexCalcPage
    });

    pageManager.registerPage('/math/tools/matrix/', {
        title: 'Matrix Multiplication Tool — GRU Mathematics',
        buildFn: buildMatrixToolPage
    });

    pageManager.registerPage('/math/tools/plotter/', {
        title: 'Function Plotter v2.1 — GRU Mathematics',
        buildFn: buildPlotterPage
    });

    // ── Hidden Pages ──
    pageManager.registerPage('/math/~secret/', {
        title: 'Faculty Area — Restricted',
        buildFn: buildSecretPage
    });

    pageManager.registerPage('/math/~secret/conjecture/', {
        title: 'The Conjecture — Prof. Cantor',
        buildFn: buildConjecturePage
    });

    pageManager.registerPage('/math/~secret/field/', {
        title: 'field.html',
        buildFn: buildFieldPage
    });

    pageManager.registerPage('/math/~secret/operator0/', {
        title: 'OPERATOR 0',
        buildFn: buildOperator0Page
    });

    // ── Webring ──
    pageManager.registerPage('/math/webring/', {
        title: 'Mathematics WebRing',
        buildFn: buildWebringPage
    });

    // ── Index Pages ──
    pageManager.registerPage('/math/students/', {
        title: 'Student Projects — GRU Mathematics',
        buildFn: buildStudentIndexPage
    });

    pageManager.registerPage('/math/tools/', {
        title: 'Mathematics Tools — GRU Mathematics',
        buildFn: buildToolsIndexPage
    });
}
