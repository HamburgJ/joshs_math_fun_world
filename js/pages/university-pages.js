import { PageManager } from './page-manager.js';

// ═══════════════════════════════════════════════════════════════════════════
//  university-pages.js — Shell Bingby's masterwork
//  All DOM-built pages for the Gauss-Riemann University math department.
//  Zone 7 content: a 1990s university website that is also a portal to truth.
// ═══════════════════════════════════════════════════════════════════════════

/* ── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Shortcut: create an element, optionally set innerHTML, className, style.
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


/* ═══════════════════════════════════════════════════════════════════════════
   PAGE BUILDERS
   ═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────
// 1. HOMEPAGE — /math/
// ─────────────────────────────────────────────────────────────────────────
function buildHomepage() {
    const page = retroPage();

    // Header
    page.appendChild(navyHeader(
        'GAUSS-RIEMANN UNIVERSITY &mdash; Department of Mathematics',
        'Founded 1832 &bull; Motto: &ldquo;In Numeris Veritas&rdquo;'
    ));

    page.appendChild(hr());

    // Welcome
    const welcome = el('p', {
        style: 'font-size: 15px;'
    });
    welcome.innerHTML = '<b>Welcome to the Department of Mathematics at Gauss-Riemann University!</b>';
    page.appendChild(welcome);

    const intro = el('p');
    intro.innerHTML = 'We are committed to excellence in research and teaching across all areas of pure and applied mathematics. Our faculty includes world-class researchers in topology, number theory, complex analysis, and set theory.';
    page.appendChild(intro);

    const building = el('p', { style: 'font-style: italic; font-size: 12px; color: #666;' });
    building.innerHTML = 'Hardy Hall &mdash; Home of the Mathematics Department<br>(Photo taken with a Sony Mavica, 1997)';
    page.appendChild(building);

    page.appendChild(hr());

    // Table layout: nav + main content
    const layoutTable = el('table', { width: '100%', cellpadding: '10', cellspacing: '0', border: '0' });

    const layoutRow = el('tr');
    layoutTable.appendChild(layoutRow);

    // Left nav column
    const navTd = el('td', { valign: 'top', style: 'width: 180px; background: #F0F0FF; border-right: 1px solid #808080; padding: 10px;' });

    const navTitle = el('b');
    navTitle.textContent = 'QUICK LINKS';
    navTd.appendChild(navTitle);
    navTd.appendChild(el('br'));
    navTd.appendChild(el('br'));

    const navItems = [
        ['Faculty Directory', '/math/faculty/'],
        ['Course Listings', '/math/courses/math407/'],
        ['Student Projects', '/math/students/dchen/mandelbrot/'],
        ['Math Tools', '/math/tools/'],
        ['Guestbook', '/math/guestbook/'],
        ['Webring', '/math/webring/']
    ];

    navItems.forEach(([label, path]) => {
        const bullet = document.createTextNode('• ');
        navTd.appendChild(bullet);
        navTd.appendChild(navLink(label, path));
        navTd.appendChild(el('br'));
        navTd.appendChild(el('br'));
    });

    layoutRow.appendChild(navTd);

    // Right content column
    const contentTd = el('td', { valign: 'top', style: 'padding: 10px;' });

    const newsTitle = el('h3', { style: 'color: #000080; margin-top: 0;' });
    newsTitle.textContent = 'Department News';
    contentTd.appendChild(newsTitle);

    const newsList = el('ul', { style: 'font-size: 13px;' });
    newsList.innerHTML = `
        <li><b>Fall 1997 Course Registration</b> is now open. See <a data-href="/math/courses/math101/" style="color:#0000EE;text-decoration:underline;cursor:pointer;">MATH 101</a> and <a data-href="/math/courses/math407/" style="color:#0000EE;text-decoration:underline;cursor:pointer;">MATH 407</a> for details.</li>
        <li><b>Colloquium</b>: Prof. Möbius presents "Topology and the Shape of Space" — Oct 17, Hardy 301.</li>
        <li><b>Student Projects</b>: Check out <a data-href="/math/students/dchen/mandelbrot/" style="color:#0000EE;text-decoration:underline;cursor:pointer;">Dave Chen's Mandelbrot Explorer</a>!</li>
        <li>Our mascot is <b>Klei the Klein Bottle</b>. He holds the school spirit. And nothing else. Because he has no inside.</li>
    `;
    contentTd.appendChild(newsList);

    contentTd.appendChild(hr());

    const contactInfo = el('p', { style: 'font-size: 12px; color: #333;' });
    contactInfo.innerHTML = '&#x1F4E7; Contact: <a href="mailto:mathinfo@gru.edu" style="color:#0000EE;">mathinfo@gru.edu</a><br>&#x1F4DE; Phone: (555) 314-1592<br>&#x1F4CD; Hardy Hall, Room 217';
    contentTd.appendChild(contactInfo);

    layoutRow.appendChild(contentTd);
    page.appendChild(layoutTable);

    page.appendChild(hr());

    // Hit counter
    const hitCount = PageManager.getHitCount();
    const counter = el('p', { style: 'text-align: center; margin: 16px 0;' });
    const counterSpan = el('span', {
        style: 'font-family: "Courier New", monospace; font-size: 14px; color: #00FF00; background: #000000; padding: 4px 12px; border: 1px inset #808080;'
    });
    counterSpan.textContent = `You are visitor #${String(hitCount).padStart(7, '0')}`;
    counter.appendChild(counterSpan);
    page.appendChild(counter);

    // Footer
    const footer = el('p', { style: 'text-align: center; font-size: 11px; color: #808080;' });
    footer.innerHTML = 'Best viewed in Netscape Navigator 3.0 at 800&times;600<br>Made with Notepad<br>Last updated: September 14, 1997';
    page.appendChild(footer);

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 2. FACULTY DIRECTORY — /math/faculty/
// ─────────────────────────────────────────────────────────────────────────
function buildFacultyDirectory() {
    const page = retroPage();

    page.appendChild(navyHeader('Faculty Directory', 'Department of Mathematics &mdash; Gauss-Riemann University'));
    page.appendChild(hr());

    const intro = el('p');
    intro.innerHTML = 'Our faculty are internationally recognized researchers and dedicated educators.';
    page.appendChild(intro);

    const facultyList = [
        {
            name: 'Prof. Carmen Möbius',
            area: 'Topology & Geometry',
            path: '/math/faculty/cmobius/',
            office: 'Hardy Hall 301'
        },
        {
            name: 'Prof. Raj Euler',
            area: 'Graph Theory & Number Theory',
            path: '/math/faculty/reuler/',
            office: 'Hardy Hall 107'
        },
        {
            name: 'Prof. Li Wei',
            area: 'Complex Analysis',
            path: '/math/faculty/lwei/',
            office: 'Hardy Hall 204'
        },
        {
            name: 'Prof. Elena Cantor',
            area: 'Set Theory & Logic',
            path: '/math/faculty/ecantor/',
            office: 'Hardy Hall 415'
        }
    ];

    const table = el('table', { width: '100%', cellpadding: '8', cellspacing: '0', border: '1', style: 'border-collapse: collapse; border-color: #808080;' });

    // Header row
    const headerRow = el('tr', { bgcolor: '#E0E0FF' });
    ['Name', 'Specialization', 'Office'].forEach(label => {
        const th = el('th', { style: 'text-align: left; padding: 6px; color: #000080;' });
        th.textContent = label;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Faculty rows
    facultyList.forEach(f => {
        const row = el('tr');

        const nameCell = el('td', { style: 'padding: 6px;' });
        nameCell.appendChild(navLink(f.name, f.path));
        row.appendChild(nameCell);

        const areaCell = el('td', { style: 'padding: 6px;' });
        areaCell.textContent = f.area;
        row.appendChild(areaCell);

        const officeCell = el('td', { style: 'padding: 6px;' });
        officeCell.textContent = f.office;
        row.appendChild(officeCell);

        table.appendChild(row);
    });

    // Aldric — greyed out, subtle but clickable
    const aldricRow = el('tr', { style: 'color: #C0C0C0;' });
    const aldricName = el('td', { style: 'padding: 6px; color: #C0C0C0; font-style: italic;' });
    const aldricLink = navLink('M. Aldric', '/math/~secret/', 'color: #C0C0C0; text-decoration: none;');
    aldricLink.title = '???';
    aldricName.appendChild(aldricLink);
    aldricRow.appendChild(aldricName);
    const aldricArea = el('td', { style: 'padding: 6px; color: #C0C0C0;' });
    aldricArea.textContent = 'Field Theory (?)';
    aldricRow.appendChild(aldricArea);
    const aldricOffice = el('td', { style: 'padding: 6px; color: #C0C0C0;' });
    aldricOffice.textContent = 'Hardy Hall 000 — NO RECORD';
    aldricRow.appendChild(aldricOffice);
    table.appendChild(aldricRow);

    page.appendChild(table);
    page.appendChild(backLink('Back to Department Homepage', '/math/'));

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. PROF. MÖBIUS — /math/faculty/cmobius/
// ─────────────────────────────────────────────────────────────────────────
function buildMobiusPage() {
    const page = retroPage();

    // Hidden HTML comment
    const comment = document.createComment(' If you\'re reading this, you\'re the kind of person I want in my class. ');
    page.appendChild(comment);

    page.appendChild(navyHeader('Prof. Carmen Möbius', 'Topology &amp; Geometry'));
    page.appendChild(hr());

    // Contact info
    const contactTable = el('table', { cellpadding: '6', cellspacing: '0', border: '0' });
    const contactData = [
        ['Office:', 'Hardy Hall 301'],
        ['Phone:', '(555) 271-8281'],
        ['Email:', '<a href="mailto:cmobius@gru.edu" style="color:#0000EE;">cmobius@gru.edu</a>']
    ];
    contactData.forEach(([label, value]) => {
        const row = el('tr');
        const labelTd = el('td', { style: 'font-weight: bold; color: #000080; white-space: nowrap;' });
        labelTd.textContent = label;
        const valueTd = el('td');
        valueTd.innerHTML = value;
        row.appendChild(labelTd);
        row.appendChild(valueTd);
        contactTable.appendChild(row);
    });
    page.appendChild(contactTable);

    page.appendChild(hr());

    // Research
    const researchTitle = el('h3', { style: 'color: #000080;' });
    researchTitle.textContent = 'Research Interests';
    page.appendChild(researchTitle);

    const research = el('p');
    research.innerHTML = 'Orientability of compact surfaces, classification of 2-manifolds, applications of the Euler characteristic to network topology.';
    page.appendChild(research);

    // Publications
    const pubTitle = el('h3', { style: 'color: #000080;' });
    pubTitle.textContent = 'Selected Publications';
    page.appendChild(pubTitle);

    const pubs = el('ul');
    pubs.innerHTML = `
        <li>"On the Non-Orientability of the Klein Bottle in \u211D\u00B3" (1993), <i>J. Topology</i>, 12(3), 201&ndash;215.</li>
        <li>"A New Proof of the Classification Theorem for Closed Surfaces" (1995), <i>Annals of Mathematics</i>, 141(2), 88&ndash;101.</li>
        <li>"Euler Characteristics of Graphs Embedded in Surfaces" (1996), <i>Discrete Mathematics</i>, 180, 45&ndash;59.</li>
    `;
    page.appendChild(pubs);

    // Teaching
    const teachTitle = el('h3', { style: 'color: #000080;' });
    teachTitle.textContent = 'Teaching — Fall 1997';
    page.appendChild(teachTitle);

    const teachList = el('ul');
    const li1 = el('li');
    li1.appendChild(navLink('MATH 601: Algebraic Topology', '/math/courses/math601/'));
    li1.appendChild(document.createTextNode(' — MWF 10:00–10:50, Hardy 215'));
    teachList.appendChild(li1);

    const li2 = el('li');
    li2.textContent = 'MATH 210: Linear Algebra — TTh 1:00–2:15, Hardy 102';
    teachList.appendChild(li2);

    page.appendChild(teachList);

    page.appendChild(hr());

    // Personal
    const personalTitle = el('h3', { style: 'color: #000080;' });
    personalTitle.textContent = 'Personal';
    page.appendChild(personalTitle);

    const personal = el('p', { style: 'font-style: italic;' });
    personal.textContent = 'When I\'m not doing mathematics, I enjoy origami and baking bread. My sourdough starter is 7 years old. I call him Euler.';
    page.appendChild(personal);

    page.appendChild(backLink('Back to Faculty Directory', '/math/faculty/'));

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 4. PROF. EULER — /math/faculty/reuler/
// ─────────────────────────────────────────────────────────────────────────
function buildEulerPage() {
    const page = retroPage();

    const comment = document.createComment(' Goldbach\'s conjecture is true. I know it in my bones. But bones are not proofs. ');
    page.appendChild(comment);

    page.appendChild(navyHeader('Prof. Raj Euler', 'Graph Theory &amp; Number Theory'));
    page.appendChild(hr());

    // Contact info
    const contactTable = el('table', { cellpadding: '6', cellspacing: '0', border: '0' });
    const contactData = [
        ['Office:', 'Hardy Hall 107 (ground floor, near the coffee machine)'],
        ['Phone:', '(555) 628-3185'],
        ['Email:', '<a href="mailto:reuler@gru.edu" style="color:#0000EE;">reuler@gru.edu</a>']
    ];
    contactData.forEach(([label, value]) => {
        const row = el('tr');
        const labelTd = el('td', { style: 'font-weight: bold; color: #000080; white-space: nowrap;' });
        labelTd.textContent = label;
        const valueTd = el('td');
        valueTd.innerHTML = value;
        row.appendChild(labelTd);
        row.appendChild(valueTd);
        contactTable.appendChild(row);
    });
    page.appendChild(contactTable);

    page.appendChild(hr());

    // Research
    const researchTitle = el('h3', { style: 'color: #000080;' });
    researchTitle.textContent = 'Research Interests';
    page.appendChild(researchTitle);

    const research = el('p');
    research.innerHTML = 'Chromatic polynomials of graphs, prime distribution in arithmetic progressions, computational number theory.';
    page.appendChild(research);

    // Publications
    const pubTitle = el('h3', { style: 'color: #000080;' });
    pubTitle.textContent = 'Selected Publications';
    page.appendChild(pubTitle);

    const pubs = el('ul');
    pubs.innerHTML = `
        <li>"A Computational Survey of Prime Gaps Below 10<sup>12</sup>" (1994), <i>J. Number Theory</i>, 58(1), 73&ndash;91.</li>
        <li>"Chromatic Polynomials and the Four-Color Problem" (1992), <i>Discrete Mathematics</i>, 105, 12&ndash;28.</li>
        <li>"An Elementary Proof of Dirichlet's Theorem for Small Progressions" (1996), <i>American Mathematical Monthly</i>, 103(8), 650&ndash;661.</li>
    `;
    page.appendChild(pubs);

    // Teaching
    const teachTitle = el('h3', { style: 'color: #000080;' });
    teachTitle.textContent = 'Teaching — Fall 1997';
    page.appendChild(teachTitle);

    const teachList = el('ul');
    const li1 = el('li');
    li1.textContent = 'MATH 301: Real Analysis — MWF 11:00–11:50, Hardy 102';
    teachList.appendChild(li1);

    const li2 = el('li');
    li2.appendChild(navLink('MATH 101: Calculus I', '/math/courses/math101/'));
    li2.appendChild(document.createTextNode(' — TTh 9:00–10:15, Hardy 101'));
    teachList.appendChild(li2);

    page.appendChild(teachList);

    page.appendChild(hr());

    // Personal
    const personalTitle = el('h3', { style: 'color: #000080;' });
    personalTitle.textContent = 'Personal';
    page.appendChild(personalTitle);

    const personal = el('p', { style: 'font-style: italic;' });
    personal.textContent = 'My Erdős number is 3. I am unreasonably proud of this.';
    page.appendChild(personal);

    page.appendChild(backLink('Back to Faculty Directory', '/math/faculty/'));

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 5. PROF. WEI — /math/faculty/lwei/
// ─────────────────────────────────────────────────────────────────────────
function buildWeiPage() {
    const page = retroPage();

    const comment = document.createComment(' The zeros know something we don\'t. ');
    page.appendChild(comment);

    page.appendChild(navyHeader('Prof. Li Wei', 'Complex Analysis'));
    page.appendChild(hr());

    // Contact info
    const contactTable = el('table', { cellpadding: '6', cellspacing: '0', border: '0' });
    const contactData = [
        ['Office:', 'Hardy Hall 204'],
        ['Phone:', '(555) 161-8033'],
        ['Email:', '<a href="mailto:lwei@gru.edu" style="color:#0000EE;">lwei@gru.edu</a>']
    ];
    contactData.forEach(([label, value]) => {
        const row = el('tr');
        const labelTd = el('td', { style: 'font-weight: bold; color: #000080; white-space: nowrap;' });
        labelTd.textContent = label;
        const valueTd = el('td');
        valueTd.innerHTML = value;
        row.appendChild(labelTd);
        row.appendChild(valueTd);
        contactTable.appendChild(row);
    });
    page.appendChild(contactTable);

    page.appendChild(hr());

    // Research
    const researchTitle = el('h3', { style: 'color: #000080;' });
    researchTitle.textContent = 'Research Interests';
    page.appendChild(researchTitle);

    const research = el('p');
    research.innerHTML = 'Conformal mappings, Riemann surfaces, analytic continuation, the Riemann zeta function.';
    page.appendChild(research);

    // Publications
    const pubTitle = el('h3', { style: 'color: #000080;' });
    pubTitle.textContent = 'Selected Publications';
    page.appendChild(pubTitle);

    const pubs = el('ul');
    const pub1 = el('li');
    pub1.innerHTML = '"Conformal Maps of Doubly-Connected Domains" (1991), <i>J. Complex Analysis</i>, 4(2), 100&ndash;119.';
    pubs.appendChild(pub1);

    const pub2 = el('li');
    pub2.innerHTML = '"On the Distribution of Zeros of the Riemann Zeta Function" (1995), <i>Mathematische Annalen</i>, 302, 517&ndash;534.';
    pubs.appendChild(pub2);

    const pub3 = el('li');
    pub3.appendChild(document.createTextNode('"'));
    pub3.appendChild(navLink('A Visualization Tool for Complex Functions', '/math/tools/plotter/'));
    pub3.appendChild(document.createTextNode('" (1997)'));
    pubs.appendChild(pub3);

    page.appendChild(pubs);

    // Teaching
    const teachTitle = el('h3', { style: 'color: #000080;' });
    teachTitle.textContent = 'Teaching — Fall 1997';
    page.appendChild(teachTitle);

    const teachList = el('ul');
    const li1 = el('li');
    li1.textContent = 'MATH 450: Complex Analysis — MWF 1:00–1:50, Hardy 205';
    teachList.appendChild(li1);

    const li2 = el('li');
    li2.appendChild(navLink('MATH 407: Projective Geometry', '/math/courses/math407/'));
    li2.appendChild(document.createTextNode(' — TTh 2:30–3:45, Hardy 301'));
    teachList.appendChild(li2);

    page.appendChild(teachList);

    page.appendChild(hr());

    // Personal
    const personalTitle = el('h3', { style: 'color: #000080;' });
    personalTitle.textContent = 'Personal';
    page.appendChild(personalTitle);

    const personal = el('p', { style: 'font-style: italic;' });
    personal.textContent = 'The beauty of complex analysis is that it makes the invisible visible. Every analytic function is secretly a fluid flow, a heat distribution, a conformal map. I have been staring at the Riemann zeta function for twenty years. It stares back.';
    page.appendChild(personal);

    page.appendChild(backLink('Back to Faculty Directory', '/math/faculty/'));

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 6. PROF. CANTOR — /math/faculty/ecantor/
// ─────────────────────────────────────────────────────────────────────────
function buildCantorPage() {
    const page = retroPage();

    const comment = document.createComment(' Am I a set that contains itself? Error 501 ');
    page.appendChild(comment);

    page.appendChild(navyHeader('Prof. Elena Cantor', 'Set Theory &amp; Logic'));
    page.appendChild(hr());

    // No photo
    const noPhoto = el('p', {
        style: 'border: 1px dashed #808080; padding: 16px; text-align:center; font-style: italic; color: #666; margin-bottom: 14px; background: #F8F8F8;'
    });
    noPhoto.textContent = 'This space intentionally left blank. (Is the absence of a photo still a representation? Discuss.)';
    page.appendChild(noPhoto);

    // Contact info
    const contactTable = el('table', { cellpadding: '6', cellspacing: '0', border: '0' });
    const contactData = [
        ['Office:', 'Hardy Hall 415'],
        ['Phone:', '(555) 141-4213'],
        ['Email:', '<a href="mailto:ecantor@gru.edu" style="color:#0000EE;">ecantor@gru.edu</a>']
    ];
    contactData.forEach(([label, value]) => {
        const row = el('tr');
        const labelTd = el('td', { style: 'font-weight: bold; color: #000080; white-space: nowrap;' });
        labelTd.textContent = label;
        const valueTd = el('td');
        valueTd.innerHTML = value;
        row.appendChild(labelTd);
        row.appendChild(valueTd);
        contactTable.appendChild(row);
    });
    page.appendChild(contactTable);

    page.appendChild(hr());

    // Research
    const researchTitle = el('h3', { style: 'color: #000080;' });
    researchTitle.textContent = 'Research Interests';
    page.appendChild(researchTitle);

    const research = el('p');
    research.innerHTML = 'Foundations of mathematics, transfinite cardinal and ordinal numbers, independence results in set theory, the Continuum Hypothesis.';
    page.appendChild(research);

    // Publications
    const pubTitle = el('h3', { style: 'color: #000080;' });
    pubTitle.textContent = 'Selected Publications';
    page.appendChild(pubTitle);

    const pubs = el('ul');
    pubs.innerHTML = `
        <li>"On the Cardinality of the Power Set of \u2135\u2080" (1990), <i>J. Symbolic Logic</i>, 55(3), 912&ndash;925.</li>
        <li>"Independence of the Continuum Hypothesis: A Pedagogical Approach" (1993), <i>Mathematical Intelligencer</i>, 15(1), 22&ndash;30.</li>
        <li>"What We Cannot Know: G&ouml;del, Cohen, and the Limits of Set Theory" (1996), <i>Notices of the AMS</i>, 43(11), 1280&ndash;1294.</li>
    `;
    page.appendChild(pubs);

    // Teaching
    const teachTitle = el('h3', { style: 'color: #000080;' });
    teachTitle.textContent = 'Teaching — Fall 1997';
    page.appendChild(teachTitle);

    const teachList = el('ul');
    const li1 = el('li');
    li1.textContent = 'MATH 502: Abstract Algebra — MWF 2:00–2:50, Hardy 310';
    teachList.appendChild(li1);

    const li2 = el('li');
    li2.textContent = 'MATH 670: Set Theory & Foundations — TTh 11:00–12:15, Hardy 415';
    teachList.appendChild(li2);

    page.appendChild(teachList);

    page.appendChild(hr());

    // Personal
    const personalTitle = el('h3', { style: 'color: #000080;' });
    personalTitle.textContent = 'Personal';
    page.appendChild(personalTitle);

    const personal = el('p', { style: 'font-style: italic;' });
    personal.innerHTML = 'People ask me if I believe the Continuum Hypothesis is true or false. I tell them: it is independent of ZFC. They say &ldquo;but really?&rdquo; I say: it is <em>independent of ZFC</em>. Then they leave my office.';
    page.appendChild(personal);

    page.appendChild(backLink('Back to Faculty Directory', '/math/faculty/'));

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 7. MATH 407 — /math/courses/math407/
// ─────────────────────────────────────────────────────────────────────────
function buildMath407Page() {
    const page = retroPage();

    page.appendChild(navyHeader(
        'MATH 407: Projective Geometry',
        'Prof. Li Wei &mdash; Fall 1997'
    ));
    page.appendChild(hr());

    // Syllabus
    const syllTitle = el('h3', { style: 'color: #000080;' });
    syllTitle.textContent = 'Syllabus';
    page.appendChild(syllTitle);

    const syllabus = el('pre', {
        style: 'background: #FFFFF0; border: 1px solid #808080; padding: 12px; font-size: 12px; overflow-x: auto; font-family: "Courier New", monospace;'
    });
    syllabus.textContent =
`MATH 407 — PROJECTIVE GEOMETRY — FALL 1997
Prof. Li Wei
TTh 2:30-3:45pm, Hardy Hall 301

Prerequisites: MATH 210 (Linear Algebra), MATH 301 (Real Analysis) recommended

Course Description:
An introduction to projective geometry. We study the real projective line
and plane, homogeneous coordinates, the cross-ratio and its invariance,
conics, duality, and projective transformations. The course emphasizes
both the algebraic and geometric viewpoints.

Grading:
  Homework (weekly)      30%
  Midterm Exam           30%
  Final Exam             40%

Textbook:
  Coxeter, H.S.M. "Projective Geometry" (2nd ed.), Springer, 1987.

Office Hours:
  TTh 3:00-4:00pm, Hardy Hall 301
  If the door is closed, I am either not there or solving a problem.
  Knock either way.`;

    page.appendChild(syllabus);

    page.appendChild(hr());

    // Lecture Notes
    const lectTitle = el('h3', { style: 'color: #000080;' });
    lectTitle.textContent = 'Lecture Notes';
    page.appendChild(lectTitle);

    const lectList = el('ol');
    const lectures = [
        'The Real Projective Line',
        'Homogeneous Coordinates',
        'The Cross-Ratio and Its Invariance',
        'The Projective Plane',
        'Conics in Projective Space',
        'Duality',
        'Projective Transformations'
    ];
    lectures.forEach((title, i) => {
        const li = el('li', { style: 'margin-bottom: 4px;' });
        li.appendChild(navLink(`Lecture ${i + 1}: ${title}`, `/math/courses/math407/lecture${i + 1}/`));
        if (i === 0) {
            const newBadge = el('font', { style: 'color: red; font-size: 11px; font-weight: bold;' });
            newBadge.textContent = ' [NOTES POSTED]';
            li.appendChild(newBadge);
        }
        lectList.appendChild(li);
    });
    page.appendChild(lectList);

    page.appendChild(hr());

    // Homework
    const hwTitle = el('h3', { style: 'color: #000080;' });
    hwTitle.textContent = 'Homework Assignments';
    page.appendChild(hwTitle);

    const hwList = el('ul');
    hwList.innerHTML = `
        <li><b>Homework 1</b> (due Sep 18): Exercises 1.1–1.5 from Coxeter.</li>
        <li><b>Homework 2</b> (due Oct 2): Prove that the projective line is homeomorphic to S\u00B9.</li>
        <li><b>Homework 3</b> (due Oct 15): Prove that the cross-ratio of four collinear points is invariant under projection.</li>
        <li><b>Homework 4</b> (due Oct 29): Exercises on conics and poles/polars.</li>
        <li><b>Homework 5</b> (due Nov 12): State and prove the duality principle for the projective plane.</li>
    `;
    page.appendChild(hwList);

    page.appendChild(hr());

    // Exam Info
    const examTitle = el('h3', { style: 'color: #000080;' });
    examTitle.textContent = 'Exams';
    page.appendChild(examTitle);

    const examInfo = el('p');
    examInfo.innerHTML = '<b>Midterm:</b> In class, October 22. Closed book, one page of handwritten notes allowed.<br><b>Final:</b> December 16, 2:00&ndash;5:00pm. Cumulative. Two pages of handwritten notes allowed.';
    page.appendChild(examInfo);

    page.appendChild(hr());

    // Office Hours
    const ohTitle = el('h3', { style: 'color: #000080;' });
    ohTitle.textContent = 'Office Hours';
    page.appendChild(ohTitle);

    const oh = el('p');
    oh.innerHTML = 'TTh 3:00&ndash;4:00pm, Hardy Hall 301.<br>If the door is closed, I am either not there or solving a problem. Knock either way.';
    page.appendChild(oh);

    page.appendChild(backLink('Back to Department Homepage', '/math/'));

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 7b. LECTURE 1 — /math/courses/math407/lecture1/
// ─────────────────────────────────────────────────────────────────────────
function buildLecture1Page() {
    const page = retroPage();

    page.appendChild(navyHeader(
        'MATH 407 &mdash; Lecture 1',
        'The Real Projective Line'
    ));
    page.appendChild(hr());

    const date = el('p', { style: 'font-size: 12px; color: #666;' });
    date.textContent = 'September 4, 1997 — Prof. Li Wei';
    page.appendChild(date);

    // Definition
    const defTitle = el('h3', { style: 'color: #000080;' });
    defTitle.textContent = 'Definition 1.1 — The Real Projective Line';
    page.appendChild(defTitle);

    const defBox = el('div', {
        style: 'border: 1px solid #000080; background: #F0F0FF; padding: 12px; margin: 10px 0;'
    });
    defBox.innerHTML = `
        <b>Definition.</b> The <i>real projective line</i>, denoted \u211D\u2119\u00B9, is defined as:<br><br>
        <div style="text-align:center; font-size: 16px; margin: 8px 0;">
            \u211D\u2119\u00B9 = \u211D \u222A {\u221E}
        </div>
        <br>
        That is, we adjoin a single "point at infinity" to the real line. This turns the line into a <i>circle</i>:
        every pair of parallel lines in the affine plane meets at \u221E in the projective line.
    `;
    page.appendChild(defBox);

    page.appendChild(hr());

    // Motivation
    const motTitle = el('h3', { style: 'color: #000080;' });
    motTitle.textContent = 'Motivation';
    page.appendChild(motTitle);

    const mot = el('p');
    mot.innerHTML = `Why do we need a "point at infinity"? Consider two parallel lines in the Euclidean plane.
    They never meet &mdash; or do they? Stand on a pair of railroad tracks and look toward the horizon.
    The tracks <i>appear</i> to meet at a point. Projective geometry makes this intuition rigorous:
    parallel lines <b>do</b> meet, at the point at infinity.`;
    page.appendChild(mot);

    const mot2 = el('p');
    mot2.innerHTML = `The real projective line \u211D\u2119\u00B9 is topologically equivalent to a circle, S\u00B9.
    We can see this via <i>stereographic projection</i>: place \u221E at the "north pole" of a circle,
    and every real number corresponds to a point on the circle. The mapping is continuous, bijective,
    and its inverse is continuous. Therefore \u211D\u2119\u00B9 \u2245 S\u00B9.`;
    page.appendChild(mot2);

    page.appendChild(hr());

    // Cross-ratio
    const crTitle = el('h3', { style: 'color: #000080;' });
    crTitle.textContent = 'The Cross-Ratio';
    page.appendChild(crTitle);

    const crDef = el('div', {
        style: 'border: 1px solid #000080; background: #F0F0FF; padding: 12px; margin: 10px 0;'
    });
    crDef.innerHTML = `
        <b>Definition 1.2.</b> Given four distinct points <i>a, b, c, d</i> on \u211D\u2119\u00B9,
        their <i>cross-ratio</i> is defined as:<br><br>
        <div style="text-align:center; font-size: 18px; margin: 12px 0; font-family: 'Times New Roman', serif;">
            (<i>a</i>, <i>b</i>; <i>c</i>, <i>d</i>) =
            <span style="display:inline-block; text-align:center; vertical-align:middle;">
                <span style="border-bottom: 1px solid #000; padding: 0 4px;">(<i>a</i> \u2212 <i>c</i>)(<i>b</i> \u2212 <i>d</i>)</span><br>
                <span style="padding: 0 4px;">(<i>a</i> \u2212 <i>d</i>)(<i>b</i> \u2212 <i>c</i>)</span>
            </span>
        </div>
    `;
    page.appendChild(crDef);

    const crText = el('p');
    crText.innerHTML = `The cross-ratio is the fundamental invariant of projective geometry.
    While distances and ratios change under projection, the cross-ratio of four collinear points
    is preserved. This is <b>Theorem 1.3</b>, which we will prove next lecture.`;
    page.appendChild(crText);

    page.appendChild(hr());

    // Example
    const exTitle = el('h3', { style: 'color: #000080;' });
    exTitle.textContent = 'Example 1.4';
    page.appendChild(exTitle);

    const example = el('p');
    example.innerHTML = `Let <i>a</i> = 0, <i>b</i> = 1, <i>c</i> = 2, <i>d</i> = 3. Then:<br><br>
    <div style="text-align:center; margin: 8px 0;">
        (<i>a</i>, <i>b</i>; <i>c</i>, <i>d</i>) =
        <span style="display:inline-block; text-align:center; vertical-align:middle;">
            <span style="border-bottom: 1px solid #000; padding: 0 4px;">(0 \u2212 2)(1 \u2212 3)</span><br>
            <span style="padding: 0 4px;">(0 \u2212 3)(1 \u2212 2)</span>
        </span>
        =
        <span style="display:inline-block; text-align:center; vertical-align:middle;">
            <span style="border-bottom: 1px solid #000; padding: 0 4px;">(\u22122)(\u22122)</span><br>
            <span style="padding: 0 4px;">(\u22123)(\u22121)</span>
        </span>
        =
        <span style="display:inline-block; text-align:center; vertical-align:middle;">
            <span style="border-bottom: 1px solid #000; padding: 0 4px;">4</span><br>
            <span style="padding: 0 4px;">3</span>
        </span>
    </div>`;
    page.appendChild(example);

    page.appendChild(hr());

    // Exercises
    const exerTitle = el('h3', { style: 'color: #000080;' });
    exerTitle.textContent = 'Exercises';
    page.appendChild(exerTitle);

    const exercises = el('ol');
    exercises.innerHTML = `
        <li>Compute the cross-ratio (1, 3; 5, 7). Verify your answer is 4/3.</li>
        <li>Show that if (<i>a</i>, <i>b</i>; <i>c</i>, <i>d</i>) = 1, then either <i>a</i> = <i>b</i> or <i>c</i> = <i>d</i>.</li>
        <li>Prove that \u211D\u2119\u00B9 is compact. (<i>Hint:</i> It is homeomorphic to S\u00B9.)</li>
        <li>Let <i>f</i>(<i>z</i>) = (<i>az</i> + <i>b</i>)/(<i>cz</i> + <i>d</i>) be a M\u00F6bius transformation. Show that <i>f</i> maps \u211D\u2119\u00B9 to itself.</li>
    `;
    page.appendChild(exercises);

    page.appendChild(backLink('Back to MATH 407 Course Page', '/math/courses/math407/'));

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 7c-7g. LECTURE STUBS — /math/courses/math407/lecture2/ through lecture7/
// ─────────────────────────────────────────────────────────────────────────
function buildLecturePlaceholder(num, title) {
    return function () {
        const page = retroPage();
        page.appendChild(navyHeader(
            `MATH 407 &mdash; Lecture ${num}`,
            title
        ));
        page.appendChild(hr());

        const date = el('p', { style: 'font-size: 12px; color: #666;' });
        date.textContent = `Prof. Li Wei — Fall 1997`;
        page.appendChild(date);

        const notice = el('p', {
            style: 'text-align:center; padding: 30px; font-size: 15px; color: #808080; border: 1px dashed #808080;'
        });
        notice.innerHTML = '<i>Lecture notes will be posted after the lecture.</i>';
        page.appendChild(notice);

        page.appendChild(backLink('Back to MATH 407 Course Page', '/math/courses/math407/'));
        return page;
    };
}

// ─────────────────────────────────────────────────────────────────────────
// 8. MATH 101 — /math/courses/math101/
// ─────────────────────────────────────────────────────────────────────────
function buildMath101Page() {
    const page = retroPage();
    page.style.background = '#FFFFF8';

    page.appendChild(navyHeader(
        'MATH 101: Calculus I',
        'Prof. Raj Euler &mdash; Fall 1997'
    ));
    page.appendChild(hr());

    // Welcome
    const welcomeBox = el('div', {
        style: 'background: #E8F0FF; border: 2px solid #4040C0; padding: 16px; margin: 12px 0; border-radius: 0;'
    });
    welcomeBox.innerHTML = `
        <font size="+1" color="#000080"><b>\u2728 Welcome to Calculus! \u2728</b></font><br><br>
        This is the mathematics of <b>change</b>. By the end of this course, you will understand how things
        move, grow, and accumulate. You will never look at a curve the same way again.<br><br>
        Calculus is one of humanity's greatest intellectual achievements. Newton and Leibniz figured out
        how to measure the unmeasurable: instantaneous velocity, areas under curves, the accumulation
        of infinitely many infinitely small things. And now, <i>you</i> get to learn it too.
    `;
    page.appendChild(welcomeBox);

    page.appendChild(hr());

    // Course info
    const infoTitle = el('h3', { style: 'color: #000080;' });
    infoTitle.textContent = 'Course Information';
    page.appendChild(infoTitle);

    const info = el('ul');
    info.innerHTML = `
        <li><b>Lectures:</b> TTh 9:00&ndash;10:15am, Hardy Hall 101</li>
        <li><b>Textbook:</b> Stewart, <i>Calculus: Early Transcendentals</i> (3rd ed.)</li>
        <li><b>Office Hours:</b> MWF 2:00&ndash;3:00pm, Hardy 107</li>
        <li><b>TA:</b> Dave Chen (<a href="mailto:dchen@gru.edu" style="color:#0000EE;">dchen@gru.edu</a>)</li>
    `;
    page.appendChild(info);

    page.appendChild(hr());

    // Resources
    const resTitle = el('h3', { style: 'color: #000080;' });
    resTitle.textContent = 'Resources';
    page.appendChild(resTitle);

    const resList = el('ul', { style: 'font-size: 14px;' });

    const resItems = [
        ['What is a Limit? (An Intuitive Guide)', null],
        ['The Derivative — Definition and Rules', null],
        ['Integration Cheat Sheet', null],
        ['Interactive Function Grapher', '/math/tools/plotter/']
    ];
    resItems.forEach(([label, path]) => {
        const li = el('li', { style: 'margin-bottom: 6px;' });
        if (path) {
            li.appendChild(navLink(label, path));
        } else {
            const a = el('a', { style: 'color: #0000EE; text-decoration: underline; cursor: pointer;' });
            a.textContent = label;
            a.title = 'Coming soon!';
            li.appendChild(a);
        }
        resList.appendChild(li);
    });
    page.appendChild(resList);

    page.appendChild(hr());

    // Integration cheat sheet
    const cheatTitle = el('h3', { style: 'color: #000080;' });
    cheatTitle.textContent = 'Quick Reference: Basic Integrals';
    page.appendChild(cheatTitle);

    const cheatTable = el('table', {
        border: '1',
        cellpadding: '8',
        cellspacing: '0',
        style: 'border-collapse: collapse; border-color: #808080; font-family: "Courier New", monospace; font-size: 13px; margin: 10px 0;'
    });
    const cheatHeader = el('tr', { bgcolor: '#E0E0FF' });
    cheatHeader.innerHTML = '<th style="text-align:left;">Function f(x)</th><th style="text-align:left;">\u222B f(x) dx</th>';
    cheatTable.appendChild(cheatHeader);

    const integrals = [
        ['x\u207F', 'x\u207F\u207A\u00B9/(n+1) + C, n \u2260 \u22121'],
        ['1/x', 'ln|x| + C'],
        ['e\u02E3', 'e\u02E3 + C'],
        ['sin(x)', '\u2212cos(x) + C'],
        ['cos(x)', 'sin(x) + C'],
        ['sec\u00B2(x)', 'tan(x) + C']
    ];
    integrals.forEach(([fn, integral]) => {
        const row = el('tr');
        row.innerHTML = `<td style="padding:4px 8px;">${fn}</td><td style="padding:4px 8px;">${integral}</td>`;
        cheatTable.appendChild(row);
    });
    page.appendChild(cheatTable);

    // Footer
    const footer = el('p', { style: 'text-align: center; font-size: 12px; color: #808080; margin-top: 20px;' });
    footer.innerHTML = '"In mathematics, you don\u2019t understand things. You just get used to them." &mdash; John von Neumann';
    page.appendChild(footer);

    page.appendChild(backLink('Back to Department Homepage', '/math/'));

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 9. DAVE'S MANDELBROT — /math/students/dchen/mandelbrot/
// ─────────────────────────────────────────────────────────────────────────
function buildMandelbrotPage() {
    const page = el('div', {
        className: 'retro-page',
        style: 'font-family: "Courier New", monospace; font-size: 14px; color: #00FF00; background: #000000; padding: 20px; max-width: 760px; margin: 0 auto;'
    });

    const title = el('h2', { style: 'color: #00FF00; text-align: center; text-transform: uppercase; margin-bottom: 4px;' });
    title.textContent = 'MANDELBROT SET EXPLORER v0.3';
    page.appendChild(title);

    const subtitle = el('p', { style: 'text-align: center; color: #00AA00; font-size: 12px;' });
    subtitle.textContent = 'by Dave Chen — MATH 450 Final Project, Fall 1997';
    page.appendChild(subtitle);

    const instruc = el('p', { style: 'color: #00CC00; font-size: 12px; text-align: center;' });
    instruc.textContent = 'Click to zoom in 2x • Right-click to zoom out • Escape-time algorithm, 100 max iterations';
    page.appendChild(instruc);

    // Canvas container (Java applet style)
    const appletBox = el('div', {
        style: 'border: 2px inset #808080; background: #C0C0C0; padding: 4px; display: inline-block; margin: 10px auto; display: block; max-width: 328px;'
    });

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 200;
    canvas.style.cssText = 'display: block; cursor: crosshair; image-rendering: pixelated;';
    appletBox.appendChild(canvas);
    page.appendChild(appletBox);

    // Info display
    const info = el('div', {
        id: 'mandelbrot-info',
        style: 'text-align: center; font-size: 11px; color: #00AA00; margin: 8px 0;'
    });
    info.textContent = 'Center: -0.5 + 0i | Zoom: 1x';
    page.appendChild(info);

    // Mandelbrot renderer state
    let centerX = -0.5;
    let centerY = 0;
    let zoom = 1;
    const maxIter = 100;
    const W = 320;
    const H = 200;

    function hslToRgb(h, s, l) {
        h /= 360;
        const a = s * Math.min(l, 1 - l);
        const f = (n) => {
            const k = (n + h * 12) % 12;
            return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        };
        return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }

    function renderMandelbrot() {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(W, H);
        const data = imageData.data;

        const scale = 3.5 / (zoom * W);
        const xMin = centerX - (W / 2) * scale;
        const yMin = centerY - (H / 2) * scale;

        for (let py = 0; py < H; py++) {
            for (let px = 0; px < W; px++) {
                const x0 = xMin + px * scale;
                const y0 = yMin + py * scale;

                let x = 0, y = 0;
                let iter = 0;

                while (x * x + y * y <= 4 && iter < maxIter) {
                    const xTemp = x * x - y * y + x0;
                    y = 2 * x * y + y0;
                    x = xTemp;
                    iter++;
                }

                const idx = (py * W + px) * 4;
                if (iter === maxIter) {
                    data[idx] = 0;
                    data[idx + 1] = 0;
                    data[idx + 2] = 0;
                } else {
                    const hue = (iter / maxIter) * 360;
                    const [r, g, b] = hslToRgb(hue, 1.0, 0.5);
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                }
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        info.textContent = `Center: ${centerX.toFixed(4)} + ${centerY.toFixed(4)}i | Zoom: ${zoom}x`;
    }

    // Click to zoom in
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        const px = (e.clientX - rect.left) * scaleX;
        const py = (e.clientY - rect.top) * scaleY;

        const scale = 3.5 / (zoom * W);
        centerX = (centerX - (W / 2) * scale) + px * scale;
        centerY = (centerY - (H / 2) * scale) + py * scale;
        zoom *= 2;

        renderMandelbrot();
    });

    // Right-click to zoom out
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        zoom = Math.max(1, zoom / 2);
        renderMandelbrot();
    });

    // Render on next frame (canvas must be in DOM)
    requestAnimationFrame(() => renderMandelbrot());

    page.appendChild(el('hr', { style: 'border:none; border-top: 1px solid #00AA00; margin: 14px 0;' }));

    // Dave's notes
    const notes = el('p', { style: 'color: #00CC00; font-size: 12px;' });
    notes.innerHTML = `I wrote this for my MATH 450 final project. Prof. Wei said it was &ldquo;adequate&rdquo;
    which I think means she loved it. The set is named after Benoit Mandelbrot. The boundary of this set
    has a Hausdorff dimension of 2 &mdash; the same as a filled square. Think about that.`;
    page.appendChild(notes);

    const bugs = el('p', { style: 'color: #FF4444; font-size: 11px;' });
    bugs.textContent = 'Known bugs: sometimes crashes Netscape if you zoom in too far. I think this is a JVM issue, not my code.';
    page.appendChild(bugs);

    page.appendChild(el('hr', { style: 'border:none; border-top: 1px solid #00AA00; margin: 14px 0;' }));

    const footer = el('p', { style: 'font-size: 11px; color: #008800; text-align: center;' });
    footer.appendChild(navLink('dave\'s homepage', '/math/students/dchen/'));
    footer.appendChild(document.createTextNode(' | '));
    footer.appendChild(navLink('math department', '/math/'));
    footer.appendChild(document.createTextNode(' | '));
    footer.appendChild(navLink('guestbook', '/math/guestbook/'));
    page.appendChild(footer);

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 10. GUESTBOOK — /math/guestbook/
// ─────────────────────────────────────────────────────────────────────────

const PRESET_GUESTBOOK_ENTRIES = [
    { name: 'Prof. G. Fibonacci', email: 'gfib@unibo.it', date: 'November 12, 1996',
      message: 'Great website! Greetings from the University of Bologna math department. Your sequence of pages is truly golden.' },
    { name: 'MathLover42', email: 'mathlover@aol.com', date: 'January 8, 1997',
      message: 'I found this site on the Mathematics WebRing. Very informative! Bookmarked.' },
    { name: 'Sarah K.', email: 'sarahk@gru.edu', date: 'February 14, 1997',
      message: 'Happy Valentine\'s Day to the only department where love is expressed as a cardioid r = 1 + cos(\u03B8). \u2764' },
    { name: 'Anonymous', email: '', date: 'March 3, 1997',
      message: 'Your hit counter is broken. It says I\'m visitor #0000312 but I\'ve been here at least 50 times.' },
    { name: 'Pierre', email: 'pierre@fermat-fan.fr', date: 'May 3, 1997',
      message: 'I have found a truly marvelous proof of the Goldbach conjecture, which this guestbook is too small to contain.' },
    { name: 'T. Webmaster', email: 'webmaster@geocities.com', date: 'June 20, 1997',
      message: 'Nice site! You should add more animated GIFs. Maybe a spinning @ sign for your email. Just a thought.' },
    { name: 'Prof. Möbius', email: 'cmobius@gru.edu', date: 'July 4, 1997',
      message: 'I see the guestbook is working. Good. I still think we should add a page about surfaces. — C.M.' },
    { name: 'Dave Chen', email: 'dchen@gru.edu', date: 'September 1, 1997',
      message: 'First day of freshman year! Excited for MATH 101 with Prof. Euler. I\'ve heard he\'s great. Gonna be the best year ever!!' },
    { name: 'Rachel', email: 'rgrimes@gru.edu', date: 'September 15, 1997',
      message: 'Does anyone have notes from MATH 301 lecture 2? I fell asleep. In my defense, it was about epsilon-delta proofs.' },
    { name: 'MATH 210 Student', email: '', date: 'October 8, 1997',
      message: 'Prof. Möbius brought a Klein bottle to class today. She poured coffee into it. Or out of it. I\'m still not sure.' },
    { name: 'Anonymous', email: '', date: 'November 20, 1997',
      message: 'Is anyone else seeing patterns in the prime number page? The 1997th prime doesn\'t look right to me.' },
    { name: 'M.A.', email: '', date: 'November 21, 1997',
      message: 'The field renderer is still running. I can hear the hum. Has anyone else checked the vertex count? 1597. Always 1597. I did not set that value.' },
    { name: 'Mike T.', email: 'miket@aol.com', date: 'January 5, 1998',
      message: 'I\'ve been trying to divide by zero all winter break. My calculator says ERROR but my heart says INFINITY.' },
    { name: 'Keiko', email: 'ktanaka@gru.edu', date: 'March 14, 1998',
      message: 'Happy Pi Day! 3.14159265358979323846... I memorized 50 digits. Am I cool yet?' },
    { name: 'Prof. Li Wei', email: 'lwei@gru.edu', date: 'August 22, 1998',
      message: 'This website has been very helpful for my summer research on conformal mappings. The function plotter applet crashed only twice.' },
    { name: 'S. Bingby', email: 'sbingby@gru.edu', date: 'September 3, 1998',
      message: 'Does anyone remember someone named Aldric in the department? I found some old build files — field rendering stuff — with that name on them. The logs reference a "monolith" that I can\'t find in any version history. Probably nothing.' },
    { name: 'Anonymous', email: '', date: 'October 31, 1998',
      message: 'I was in Hardy Hall late last night and I swear I heard a low hum coming from the old server room. Sounded like 1.597 Hz. Probably just the HVAC. Right?' },
    { name: 'The Math Department', email: 'mathinfo@gru.edu', date: 'December 31, 1999',
      message: 'Y2K is NOT a math problem, it\'s a CS problem. Stop blaming us. Happy New Millennium (which technically starts in 2001, but who\'s counting? We are. We\'re mathematicians).' }
];

function buildGuestbook() {
    const page = retroPage();

    page.appendChild(navyHeader(
        '\uD83D\uDCDD GRU Mathematics Department Guestbook',
        'Leave a message for the department!'
    ));
    page.appendChild(hr());

    const intro = el('p');
    intro.innerHTML = 'Welcome to our guestbook! Please sign in and let us know you visited. We read every entry (well, Prof. Cantor reads every entry &mdash; she says it\'s a countable set and therefore manageable).';
    page.appendChild(intro);

    page.appendChild(hr());

    // Container for entries
    const entriesContainer = el('div', { id: 'guestbook-entries' });

    function renderEntry(entry, index) {
        const entryDiv = el('div', {
            style: 'border: 1px solid #C0C0C0; background: #FFFFF0; padding: 10px; margin: 8px 0;'
        });
        const header = el('p', { style: 'margin: 0 0 6px 0; font-size: 12px; color: #808080;' });
        header.innerHTML = `<b style="color:#000080;">${escapeHtml(entry.name)}</b>` +
            (entry.email ? ` &lt;${escapeHtml(entry.email)}&gt;` : '') +
            ` &mdash; ${escapeHtml(entry.date)}`;
        entryDiv.appendChild(header);

        const msg = el('p', { style: 'margin: 0; font-size: 13px;' });
        msg.textContent = entry.message;
        entryDiv.appendChild(msg);

        return entryDiv;
    }

    function renderAllEntries() {
        entriesContainer.innerHTML = '';
        // Preset entries
        PRESET_GUESTBOOK_ENTRIES.forEach((entry, i) => {
            entriesContainer.appendChild(renderEntry(entry, i));
        });

        // User entries from PageManager
        const userEntries = PageManager.getGuestbookEntries ? PageManager.getGuestbookEntries() : [];
        userEntries.forEach((entry, i) => {
            entriesContainer.appendChild(renderEntry(entry, PRESET_GUESTBOOK_ENTRIES.length + i));
        });
    }

    renderAllEntries();
    page.appendChild(entriesContainer);

    page.appendChild(hr());

    // Sign form
    const formTitle = el('h3', { style: 'color: #000080;' });
    formTitle.textContent = 'Sign the Guestbook';
    page.appendChild(formTitle);

    const form = el('table', { cellpadding: '4', cellspacing: '0', border: '0' });

    const nameRow = el('tr');
    nameRow.innerHTML = '<td style="font-weight:bold;">Name:</td>';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.style.cssText = 'width: 250px; font-family: "Courier New", monospace; border: 1px inset #808080; padding: 2px 4px;';
    nameInput.placeholder = 'Your name';
    const nameTd = el('td');
    nameTd.appendChild(nameInput);
    nameRow.appendChild(nameTd);
    form.appendChild(nameRow);

    const emailRow = el('tr');
    emailRow.innerHTML = '<td style="font-weight:bold;">Email:</td>';
    const emailInput = document.createElement('input');
    emailInput.type = 'text';
    emailInput.style.cssText = 'width: 250px; font-family: "Courier New", monospace; border: 1px inset #808080; padding: 2px 4px;';
    emailInput.placeholder = 'your@email.com';
    const emailTd = el('td');
    emailTd.appendChild(emailInput);
    emailRow.appendChild(emailTd);
    form.appendChild(emailRow);

    const msgRow = el('tr');
    msgRow.innerHTML = '<td style="font-weight:bold; vertical-align:top;">Message:</td>';
    const msgInput = document.createElement('textarea');
    msgInput.style.cssText = 'width: 250px; height: 80px; font-family: "Courier New", monospace; border: 1px inset #808080; padding: 2px 4px; resize: none;';
    msgInput.placeholder = 'Write your message here...';
    const msgTd = el('td');
    msgTd.appendChild(msgInput);
    msgRow.appendChild(msgTd);
    form.appendChild(msgRow);

    const btnRow = el('tr');
    btnRow.innerHTML = '<td></td>';
    const btnTd = el('td');
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Sign Guestbook';
    submitBtn.style.cssText = 'font-family: "Times New Roman", serif; font-size: 14px; padding: 4px 16px; cursor: pointer; border: 2px outset #C0C0C0; background: #C0C0C0;';
    submitBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const message = msgInput.value.trim();

        if (!name || !message) {
            alert('Please enter your name and a message!');
            return;
        }

        PageManager.signGuestbook(name, email, message);

        // Clear inputs
        nameInput.value = '';
        emailInput.value = '';
        msgInput.value = '';

        // Re-render entries
        renderAllEntries();
    });
    btnTd.appendChild(submitBtn);
    btnRow.appendChild(btnTd);
    form.appendChild(btnRow);

    page.appendChild(form);

    page.appendChild(backLink('Back to Department Homepage', '/math/'));

    return page;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ─────────────────────────────────────────────────────────────────────────
// 11. 404 PAGE — /math/404
// ─────────────────────────────────────────────────────────────────────────
function build404Page() {
    const page = retroPage();

    const box = el('pre', {
        style: 'font-family: "Courier New", monospace; font-size: 14px; text-align: center; padding: 30px 20px; line-height: 1.6;'
    });
    box.textContent =
`\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                                                  \u2551
\u2551           404 \u2014 FILE NOT FOUND                  \u2551
\u2551                                                  \u2551
\u2551  The document you requested could not be         \u2551
\u2551  found on this server.                           \u2551
\u2551                                                  \u2551
\u2551  It may have been moved, deleted, or it may      \u2551
\u2551  never have existed at all.                      \u2551
\u2551                                                  \u2551
\u2551  (Does anything truly exist, or are we all       \u2551
\u2551  just points in an infinite-dimensional          \u2551
\u2551  Hilbert space?)                                 \u2551
\u2551                                                  \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D`;
    page.appendChild(box);

    const link = el('p', { style: 'text-align: center; margin-top: 20px;' });
    link.appendChild(document.createTextNode('[ '));
    link.appendChild(navLink('Return to Department Homepage', '/math/'));
    link.appendChild(document.createTextNode(' ]'));
    page.appendChild(link);

    return page;
}

// ─────────────────────────────────────────────────────────────────────────
// 12. UNDER CONSTRUCTION — /math/history/ and /math/graduate/
// ─────────────────────────────────────────────────────────────────────────
function buildUnderConstruction() {
    const page = retroPage();

    const banner = el('div', {
        style: 'text-align: center; padding: 60px 20px;'
    });

    const uc1 = el('p', { style: 'font-size: 24px; font-weight: bold;' });
    uc1.textContent = '\uD83D\uDEA7 UNDER CONSTRUCTION \uD83D\uDEA7';
    banner.appendChild(uc1);

    banner.appendChild(el('br'));

    const uc2 = el('p', { style: 'font-size: 18px; font-weight: bold; color: #FF0000;' });
    uc2.textContent = 'COMING SOON \u2014 CHECK BACK IN SPRING 1998!';
    banner.appendChild(uc2);

    banner.appendChild(el('br'));

    const hard = el('p', { style: 'font-size: 12px; color: #808080;' });
    hard.textContent = 'This page is being constructed by hand in Notepad. Please be patient.';
    banner.appendChild(hard);

    page.appendChild(banner);

    page.appendChild(backLink('Back to Department Homepage', '/math/'));

    return page;
}


/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRATION
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Register every university page with the supplied PageManager instance.
 *
 * @param {object} pageManager  A PageManager exposing registerPage(path, {title, buildFn})
 */
export function registerUniversityPages(pageManager) {

    // ── Homepage ──
    pageManager.registerPage('/math/', {
        title: 'GRU Department of Mathematics',
        buildFn: buildHomepage
    });

    // ── Faculty Directory ──
    pageManager.registerPage('/math/faculty/', {
        title: 'Faculty Directory — GRU Mathematics',
        buildFn: buildFacultyDirectory
    });

    // ── Faculty Pages ──
    pageManager.registerPage('/math/faculty/cmobius/', {
        title: 'Prof. Carmen Möbius — GRU Mathematics',
        buildFn: buildMobiusPage
    });

    pageManager.registerPage('/math/faculty/reuler/', {
        title: 'Prof. Raj Euler — GRU Mathematics',
        buildFn: buildEulerPage
    });

    pageManager.registerPage('/math/faculty/lwei/', {
        title: 'Prof. Li Wei — GRU Mathematics',
        buildFn: buildWeiPage
    });

    pageManager.registerPage('/math/faculty/ecantor/', {
        title: 'Prof. Elena Cantor — GRU Mathematics',
        buildFn: buildCantorPage
    });

    // ── Course Pages ──
    pageManager.registerPage('/math/courses/math407/', {
        title: 'MATH 407: Projective Geometry — GRU',
        buildFn: buildMath407Page
    });

    pageManager.registerPage('/math/courses/math407/lecture1/', {
        title: 'Lecture 1: The Real Projective Line — MATH 407',
        buildFn: buildLecture1Page
    });

    // Lecture 2-7 placeholders
    const lectureTitles = [
        'Homogeneous Coordinates',
        'The Cross-Ratio and Its Invariance',
        'The Projective Plane',
        'Conics in Projective Space',
        'Duality',
        'Projective Transformations'
    ];
    lectureTitles.forEach((title, i) => {
        const num = i + 2;
        pageManager.registerPage(`/math/courses/math407/lecture${num}/`, {
            title: `Lecture ${num}: ${title} — MATH 407`,
            buildFn: buildLecturePlaceholder(num, title)
        });
    });

    pageManager.registerPage('/math/courses/math101/', {
        title: 'MATH 101: Calculus I — GRU',
        buildFn: buildMath101Page
    });

    // ── Student Projects ──
    pageManager.registerPage('/math/students/dchen/mandelbrot/', {
        title: 'Mandelbrot Set Explorer — Dave Chen',
        buildFn: buildMandelbrotPage
    });

    // ── Guestbook ──
    pageManager.registerPage('/math/guestbook/', {
        title: 'Guestbook — GRU Mathematics',
        buildFn: buildGuestbook
    });

    // ── 404 ──
    pageManager.registerPage('/math/404', {
        title: '404 — File Not Found',
        buildFn: build404Page
    });

    // ── Under Construction ──
    pageManager.registerPage('/math/history/', {
        title: 'Department History — GRU Mathematics',
        buildFn: buildUnderConstruction
    });

    pageManager.registerPage('/math/graduate/', {
        title: 'Graduate Programs — GRU Mathematics',
        buildFn: buildUnderConstruction
    });
}
