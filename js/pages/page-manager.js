/**
 * page-manager.js — PageManager for Josh's Math Fun World
 * 
 * Controls DOM overlays that display retro university web pages
 * (Gauss-Riemann University, est. 1687) on top of the 3D game canvas.
 * Handles transitions between 3D ↔ 2D, internal navigation,
 * browser chrome simulation, hit counters, and guestbook persistence.
 * 
 * Zone 7 — The University Web Pages
 * 
 * Shell Bingby saw this pattern coming in 1994.
 * A 3D world with a 2D web layer on top? That's just reality, baby.
 */

export class PageManager {

    /** @type {Map<string, { title: string, buildFn: () => HTMLElement }>} */
    #registry = new Map();

    /** @type {string[]} navigation history stack */
    #history = [];

    /** @type {number} pointer into history for forward nav */
    #historyIndex = -1;

    /** @type {HTMLDivElement|null} */
    #overlay = null;

    /** @type {HTMLDivElement|null} */
    #contentArea = null;

    /** @type {HTMLElement|null} */
    #urlBar = null;

    /** @type {HTMLButtonElement|null} */
    #backBtn = null;

    /** @type {HTMLButtonElement|null} */
    #forwardBtn = null;

    /** @type {string|null} */
    #currentPath = null;

    /** @type {boolean} transitioning flag to prevent double-clicks */
    #transitioning = false;

    /**
     * External callbacks — set these to pause/resume the 3D world.
     * @type {Function|null}
     */
    onOpen = null;

    /** @type {Function|null} */
    onClose = null;

    constructor() {
        this.#buildDOM();
    }

    // ------------------------------------------------------------------ DOM

    /**
     * Construct the overlay container, browser chrome, and content area.
     * Appended to document.body.
     */
    #buildDOM() {
        // --- Overlay wrapper ---
        const overlay = document.createElement('div');
        overlay.id = 'page-overlay';
        overlay.className = 'retro-overlay';
        overlay.style.display = 'none';
        overlay.style.opacity = '0';

        // --- Browser chrome ---
        const chrome = document.createElement('div');
        chrome.className = 'browser-chrome';

        // Title bar
        const titleBar = document.createElement('div');
        titleBar.className = 'browser-title-bar';

        const titleText = document.createElement('span');
        titleText.className = 'browser-title-text';
        titleText.textContent = 'Networth Navigator — [Gauss-Riemann University]';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'browser-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.title = 'Close';
        closeBtn.addEventListener('click', () => this.closePage());

        titleBar.appendChild(titleText);
        titleBar.appendChild(closeBtn);

        // Navigation row
        const navRow = document.createElement('div');
        navRow.className = 'browser-nav-row';

        const backBtn = document.createElement('button');
        backBtn.className = 'browser-nav-btn';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => this.#goBack());

        const forwardBtn = document.createElement('button');
        forwardBtn.className = 'browser-nav-btn';
        forwardBtn.textContent = 'Forward →';
        forwardBtn.addEventListener('click', () => this.#goForward());

        const reloadBtn = document.createElement('button');
        reloadBtn.className = 'browser-nav-btn';
        reloadBtn.textContent = '⟳ Reload';
        reloadBtn.addEventListener('click', () => {
            if (this.#currentPath) this.#renderPage(this.#currentPath);
        });

        const homeBtn = document.createElement('button');
        homeBtn.className = 'browser-nav-btn';
        homeBtn.textContent = '🏠 Home';
        homeBtn.addEventListener('click', () => this._handleLink('/'));

        navRow.appendChild(backBtn);
        navRow.appendChild(forwardBtn);
        navRow.appendChild(reloadBtn);
        navRow.appendChild(homeBtn);

        this.#backBtn = backBtn;
        this.#forwardBtn = forwardBtn;

        // Address bar row
        const addrRow = document.createElement('div');
        addrRow.className = 'browser-address-row';

        const addrLabel = document.createElement('span');
        addrLabel.className = 'browser-address-label';
        addrLabel.textContent = 'Address:';

        const urlBar = document.createElement('span');
        urlBar.className = 'browser-url-bar';
        urlBar.textContent = 'http://www.gru.edu/';

        addrRow.appendChild(addrLabel);
        addrRow.appendChild(urlBar);
        this.#urlBar = urlBar;

        chrome.appendChild(titleBar);
        chrome.appendChild(navRow);
        chrome.appendChild(addrRow);

        // --- Scrollable content area ---
        const content = document.createElement('div');
        content.className = 'page-content';
        this.#contentArea = content;

        // Delegated click listener for internal links
        content.addEventListener('click', (e) => {
            const link = e.target.closest('[data-href]');
            if (link) {
                e.preventDefault();
                e.stopPropagation();
                const href = link.getAttribute('data-href');
                if (href) this._handleLink(href);
            }
        });

        overlay.appendChild(chrome);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        this.#overlay = overlay;
    }

    // -------------------------------------------------------- PUBLIC API

    /**
     * Open a page by URL path.
     * @param {string} path - e.g. '/', '/math/', '/math/faculty/cmobius/'
     */
    openPage(path) {
        if (this.#transitioning) return;

        const normalised = this.#normalise(path);

        // Push to history (truncate any forward entries)
        this.#historyIndex++;
        this.#history.length = this.#historyIndex;
        this.#history.push(normalised);

        this.#renderPage(normalised);

        if (!this.isOpen()) {
            this._transitionIn();
        }
    }

    /**
     * Close the current page overlay, returning to 3D.
     */
    closePage() {
        if (!this.isOpen() || this.#transitioning) return;
        this._transitionOut();
    }

    /**
     * @returns {boolean} Whether a page overlay is currently visible.
     */
    isOpen() {
        return this.#overlay && this.#overlay.style.display !== 'none';
    }

    /**
     * Register a page definition.
     * @param {string} path   - URL path key, e.g. '/math/faculty/lwei/'
     * @param {{ title: string, buildFn: () => HTMLElement }} def
     */
    registerPage(path, { title, buildFn }) {
        this.#registry.set(this.#normalise(path), { title, buildFn });
    }

    /**
     * @returns {HTMLDivElement} The overlay container element.
     */
    getContainer() {
        return this.#overlay;
    }

    // --------------------------------------------------------- NAVIGATION

    /**
     * Handle an internal link click.
     * @param {string} path
     */
    _handleLink(path) {
        if (this.#transitioning) return;

        const normalised = this.#normalise(path);

        // Push to history
        this.#historyIndex++;
        this.#history.length = this.#historyIndex;
        this.#history.push(normalised);

        this.#renderPage(normalised);
    }

    /**
     * Navigate back in history.
     */
    #goBack() {
        if (this.#historyIndex <= 0) return;
        this.#historyIndex--;
        this.#renderPage(this.#history[this.#historyIndex]);
    }

    /**
     * Navigate forward in history.
     */
    #goForward() {
        if (this.#historyIndex >= this.#history.length - 1) return;
        this.#historyIndex++;
        this.#renderPage(this.#history[this.#historyIndex]);
    }

    /**
     * Render a page into the content area by path.
     * @param {string} path
     */
    #renderPage(path) {
        this.#currentPath = path;

        // Update URL bar
        if (this.#urlBar) {
            this.#urlBar.textContent = `http://www.gru.edu${path}`;
        }

        // Update nav button states
        if (this.#backBtn) {
            this.#backBtn.disabled = this.#historyIndex <= 0;
        }
        if (this.#forwardBtn) {
            this.#forwardBtn.disabled = this.#historyIndex >= this.#history.length - 1;
        }

        // Look up registry
        const entry = this.#registry.get(path);

        // Clear content
        this.#contentArea.innerHTML = '';

        if (entry) {
            // Update title bar
            const titleText = this.#overlay.querySelector('.browser-title-text');
            if (titleText) {
                titleText.textContent = `Networth Navigator — [${entry.title}]`;
            }

            // Build and inject
            const el = entry.buildFn();
            this.#contentArea.appendChild(el);

            // Scroll to top
            this.#contentArea.scrollTop = 0;
        } else {
            // 404 page
            this.#render404(path);
        }
    }

    /**
     * Render a 404 page.
     * @param {string} path
     */
    #render404(path) {
        const titleText = this.#overlay.querySelector('.browser-title-text');
        if (titleText) {
            titleText.textContent = 'Networth Navigator — [404 Not Found]';
        }

        const page = document.createElement('div');
        page.className = 'retro-page';
        page.innerHTML = `
            <h1>404 — File Not Found</h1>
            <hr>
            <p>The requested URL <code>${path}</code> was not found on this server.</p>
            <p>Please check the URL and try again, or return to the
            <a data-href="/">GRU Home Page</a>.</p>
            <hr>
            <p><i>Gauss-Riemann University Web Server<br>
            Apache/1.3.6 (Unix) at www.gru.edu Port 80</i></p>
        `;
        this.#contentArea.appendChild(page);
    }

    // -------------------------------------------------------- TRANSITIONS

    /**
     * Fade the overlay in (2D appears over 3D).
     */
    _transitionIn() {
        if (!this.#overlay) return;
        this.#transitioning = true;

        this.#overlay.style.display = 'flex';
        this.#overlay.style.opacity = '0';

        // Force reflow so transition triggers
        void this.#overlay.offsetHeight;

        this.#overlay.style.transition = 'opacity 400ms ease-in';
        this.#overlay.style.opacity = '1';

        const onEnd = () => {
            this.#overlay.removeEventListener('transitionend', onEnd);
            this.#transitioning = false;
            if (typeof this.onOpen === 'function') this.onOpen();
        };
        this.#overlay.addEventListener('transitionend', onEnd);

        // Safety timeout in case transitionend doesn't fire
        setTimeout(() => {
            if (this.#transitioning) {
                this.#overlay.removeEventListener('transitionend', onEnd);
                this.#transitioning = false;
                if (typeof this.onOpen === 'function') this.onOpen();
            }
        }, 500);
    }

    /**
     * Fade the overlay out (return to 3D).
     */
    _transitionOut() {
        if (!this.#overlay) return;
        this.#transitioning = true;

        this.#overlay.style.transition = 'opacity 400ms ease-out';
        this.#overlay.style.opacity = '0';

        const onEnd = () => {
            this.#overlay.removeEventListener('transitionend', onEnd);
            this.#overlay.style.display = 'none';
            this.#transitioning = false;
            this.#currentPath = null;
            if (typeof this.onClose === 'function') this.onClose();
        };
        this.#overlay.addEventListener('transitionend', onEnd);

        // Safety timeout
        setTimeout(() => {
            if (this.#transitioning) {
                this.#overlay.removeEventListener('transitionend', onEnd);
                this.#overlay.style.display = 'none';
                this.#transitioning = false;
                this.#currentPath = null;
                if (typeof this.onClose === 'function') this.onClose();
            }
        }, 500);
    }

    // ------------------------------------------------------------ UTILS

    /**
     * Normalise a path to always have a leading and trailing slash.
     * @param {string} path
     * @returns {string}
     */
    #normalise(path) {
        let p = path.trim();
        if (!p.startsWith('/')) p = '/' + p;
        if (!p.endsWith('/')) p += '/';
        return p;
    }

    // ------------------------------------------------ STATIC PERSISTENCE

    /**
     * Read, increment, persist, and return the site hit counter.
     * @returns {number}
     */
    static getHitCount() {
        const key = 'gru_hits';
        let count = parseInt(localStorage.getItem(key), 10);
        if (isNaN(count)) count = 0;
        count++;
        localStorage.setItem(key, String(count));
        return count;
    }

    /**
     * Retrieve all guestbook entries.
     * @returns {{ name: string, email: string, message: string, timestamp: string }[]}
     */
    static getGuestbookEntries() {
        const key = 'gru_guestbook';
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    /**
     * Append a new entry to the guestbook.
     * @param {string} name
     * @param {string} email
     * @param {string} message
     */
    static signGuestbook(name, email, message) {
        const key = 'gru_guestbook';
        const entries = PageManager.getGuestbookEntries();
        entries.push({
            name,
            email,
            message,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(key, JSON.stringify(entries));
    }
}
