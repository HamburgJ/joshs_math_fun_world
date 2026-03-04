/**
 * SecretsManager — The Subconscious Layer
 * Phase 15: "All cross-zone connections are implemented. Secrets work. The world remembers."
 *
 * Manages 30 secrets across 3 tiers, cross-zone connections,
 * the 1597 thread, green field evolution, and persistence.
 *
 * @module systems/secrets
 */

const SAVE_KEY = 'jmfw_secrets';

/** @type {Array<{id: string, tier: number, title: string, description: string}>} */
const SECRET_DEFS = [
  // ── Tier 1 — Easy to find ──
  { id: 'bench_watcher',   tier: 1, title: 'Bench Watcher',        description: 'Sit on the bench in the green field — reveals patterns from above' },
  { id: 'prime_collector', tier: 1, title: 'Prime Collector',      description: 'Examine all 5 prime stones (2, 3, 5, 7, 11) in the green field' },
  { id: 'pond_void',       tier: 1, title: 'Pond Void',            description: 'Look into the pond — see the wireframe void beneath' },
  { id: 'mailbox_opener',  tier: 1, title: 'Mailbox Opener',       description: 'Open the mailbox to visit the university website' },
  { id: 'euler_pilgrim',   tier: 1, title: 'Euler Pilgrim',        description: "Visit Euler's Identity monument in the Complex Plane" },
  { id: 'infinity_walker', tier: 1, title: 'Infinity Walker',      description: 'Reach the Point at Infinity in the Projective Line' },
  { id: 'void_explorer',   tier: 1, title: 'Void Explorer',        description: 'Visit the Wireframe Void' },
  { id: 'function_walker', tier: 1, title: 'Function Walker',      description: 'Walk on a function surface in the Coordinate Plane' },
  { id: 'mobius_circuit',  tier: 1, title: 'Möbius Circuit',       description: 'Walk the full Möbius strip in the Wireframe Void' },
  { id: 'fractal_zoom',    tier: 1, title: 'Fractal Zoom',         description: 'Zoom into the Mandelbrot set in the Fractal Boundary' },

  // ── Tier 2 — Require exploration ──
  { id: 'all_platonic',       tier: 2, title: 'Platonic Idealist',     description: 'Interact with all 5 Platonic solids in the Wireframe Void' },
  { id: 'conjugate_cross',    tier: 2, title: 'Conjugate Crossing',    description: 'Cross the conjugate mirror in the Complex Plane' },
  { id: 'donut_morph',        tier: 2, title: 'Donut Morph',           description: 'Watch the full coffee-cup-to-donut morph in the Topology Garden' },
  { id: 'sieve_witness',      tier: 2, title: 'Sieve Witness',         description: 'Watch the Sieve of Eratosthenes waterfall in Number Caverns' },
  { id: 'taylor_falls',       tier: 2, title: 'Taylor Falls',          description: 'Visit Taylor Series Falls in the Calculus Current' },
  { id: 'monty_hall',          tier: 2, title: 'Monty Hall',            description: 'Open all 3 doors in the Monty Hall Mansion' },
  { id: 'turing_run',          tier: 2, title: 'Turing Run',            description: 'Run the Turing machine in Logic Gates' },
  { id: 'game_of_life',        tier: 2, title: 'Game of Life',          description: "Create a glider in Conway's Game of Life" },
  { id: 'division_by_zero',    tier: 2, title: 'Division by Zero',      description: 'Enter the Division by Zero building' },
  { id: 'hyperbolic_house',    tier: 2, title: 'Hyperbolic House',      description: 'Enter the bigger-on-inside house in the Non-Euclidean zone' },

  // ── Tier 3 — Deep secrets ──
  { id: 'number_1597',              tier: 3, title: '1597',                    description: 'Find the number 1597 in 5 different locations across zones' },
  { id: 'ten_bench_sits',           tier: 3, title: 'Ten Bench Sits',          description: 'Sit on the bench 10 times — triggers the full pull-back reveal' },
  { id: 'godel_number',             tier: 3, title: 'Gödel Number',            description: 'Press G to encode the current state as a Gödel number' },
  { id: 'flower_domain',            tier: 3, title: 'Flower Domain',           description: 'Notice that the green field flowers are colored by domain coloring' },
  { id: 'view_source',              tier: 3, title: 'View Source',             description: 'View the source of a university web page and find the HTML comment puzzle' },
  { id: 'stone_stalactite',         tier: 3, title: 'Stone ↔ Stalactite',     description: 'Connect the prime stones in Zone 1 to the stalactites in Number Caverns' },
  { id: 'zone_graph_complete',      tier: 3, title: 'Zone Graph Complete',     description: 'Visit all zones, lighting up the full zone graph in the Wireframe Void' },
  { id: 'webring_random',           tier: 3, title: 'Webring Random',          description: "Click 'Random' in the webring nav and get teleported to a 3D zone" },
  { id: 'cross_ratio_invariant',    tier: 3, title: 'Cross-Ratio Invariant',   description: 'Drag all 4 cross-ratio points and verify the invariant in Projective Line' },
  { id: 'mandelbrot_field',         tier: 3, title: 'Mandelbrot Field',        description: 'At the deepest Mandelbrot zoom, find the green field. Zone 1 was always inside the set.' },
];

/** All locations where 1597 can be sighted */
const LOCATIONS_1597 = [
  'field_stone', 'void_graph', 'cave_stalactite', 'web_page_counter', 'projective_road_sign',
];

/** Maps a visited zone to the trace it leaves on the green field */
const FIELD_TRACES = {
  wireframe_void:    'Faint wireframe grid visible under the grass',
  fractal_boundary:  'A small fractal pattern appears on a stone',
  complex_plane:     'Flowers gain more vivid domain-coloring',
  topology_garden:   'A patch of grass subtly deforms like a torus',
  number_caverns:    'Prime-numbered blades of grass glow faintly',
  calculus_current:  'Wind ripples form tangent-line patterns',
  projective_line:   'Parallel fence posts appear to converge at the horizon',
  non_euclidean:     'Shadows bend at impossible angles',
  logic_gates:       'Pebbles arrange into AND / OR gate shapes',
  probability_fog:   'Dew drops land in a bell-curve distribution',
};

class SecretsManager {
  /** @param {{ onSecretUnlocked?: (secret: object) => void }} [opts] */
  constructor(opts = {}) {
    /** @type {Map<string, {id:string, tier:number, title:string, description:string, unlocked:boolean, unlockedAt:number|null}>} */
    this._secrets = new Map();
    SECRET_DEFS.forEach(d => {
      this._secrets.set(d.id, { ...d, unlocked: false, unlockedAt: null });
    });

    /** @type {Set<string>} */
    this._found1597 = new Set();

    /** @type {Array<{zoneA:string, zoneB:string, description:string, at:number}>} */
    this._connections = [];

    /** @type {Set<string>} */
    this._visitedZones = new Set();

    /** @type {number} */
    this._benchSits = 0;

    /** @type {((secret: object) => void)|null} */
    this.onSecretUnlocked = opts.onSecretUnlocked || null;

    this._load();
  }

  /* ────────────────────────────────────────────
   *  Secret state
   * ──────────────────────────────────────────── */

  /**
   * Check whether a secret's conditions are met and unlock it.
   * @param {string} secretId
   * @param {object} [context] - optional context data used by specific checks
   * @returns {boolean} true if the secret was newly unlocked
   */
  checkSecret(secretId, context = {}) {
    const s = this._secrets.get(secretId);
    if (!s || s.unlocked) return false;

    // Tier-3 guards that need accumulated state
    if (secretId === 'number_1597' && this._found1597.size < LOCATIONS_1597.length) return false;
    if (secretId === 'ten_bench_sits' && this._benchSits < 10) return false;
    if (secretId === 'zone_graph_complete' && this._visitedZones.size < Object.keys(FIELD_TRACES).length) return false;

    return this._unlock(s);
  }

  /**
   * @param {string} secretId
   * @returns {boolean}
   */
  isUnlocked(secretId) {
    return this._secrets.get(secretId)?.unlocked ?? false;
  }

  /**
   * @returns {Array<object>} all unlocked secrets
   */
  getUnlockedSecrets() {
    return [...this._secrets.values()].filter(s => s.unlocked);
  }

  /**
   * @returns {{ total: number, found: number, percent: number }}
   */
  getProgress() {
    const total = this._secrets.size;
    const found = this.getUnlockedSecrets().length;
    return { total, found, percent: Math.round((found / total) * 100) };
  }

  /**
   * @param {number} tier - 1, 2, or 3
   * @returns {Array<object>}
   */
  getSecretsByTier(tier) {
    return [...this._secrets.values()].filter(s => s.tier === tier);
  }

  /* ────────────────────────────────────────────
   *  1597 Thread
   * ──────────────────────────────────────────── */

  /**
   * Record a sighting of 1597 at a specific location.
   * Automatically checks for the number_1597 secret.
   * @param {string} locationId - one of LOCATIONS_1597
   */
  record1597Sighting(locationId) {
    if (!LOCATIONS_1597.includes(locationId)) return;
    this._found1597.add(locationId);
    this._save();
    if (this._found1597.size >= LOCATIONS_1597.length) {
      this.checkSecret('number_1597');
    }
  }

  /**
   * @returns {string[]} location ids where 1597 has been found
   */
  get1597Locations() {
    return [...this._found1597];
  }

  /* ────────────────────────────────────────────
   *  Cross-Zone Connections
   * ──────────────────────────────────────────── */

  /**
   * Record a noticed connection between two zones.
   * @param {string} zoneA
   * @param {string} zoneB
   * @param {string} description
   */
  recordConnection(zoneA, zoneB, description) {
    const exists = this._connections.some(
      c => c.zoneA === zoneA && c.zoneB === zoneB && c.description === description
    );
    if (exists) return;
    this._connections.push({ zoneA, zoneB, description, at: Date.now() });
    this._save();
  }

  /** @returns {Array<{zoneA:string, zoneB:string, description:string, at:number}>} */
  getConnections() {
    return [...this._connections];
  }

  /* ────────────────────────────────────────────
   *  Green Field Evolution
   * ──────────────────────────────────────────── */

  /**
   * Register that a zone has been visited. Affects green field traces
   * and may trigger zone_graph_complete.
   * @param {string} zoneId
   */
  recordZoneVisit(zoneId) {
    this._visitedZones.add(zoneId);
    this._save();
    // zone_graph_complete requires all 13 zones (green field + 12 math zones)
    // Don't trigger here — main.js handles this with the full zone list
  }

  /**
   * Returns the set of visual traces that should appear in the green field
   * based on zones visited so far.
   * @returns {{ traces: string[] }}
   */
  getFieldEvolution() {
    const evolutions = [];
    for (const [zone, desc] of Object.entries(FIELD_TRACES)) {
      if (this._visitedZones.has(zone)) evolutions.push({ zone, description: desc });
    }
    return evolutions;
  }

  /* ────────────────────────────────────────────
   *  Bench counter (for ten_bench_sits)
   * ──────────────────────────────────────────── */

  /**
   * Increment bench sit count. Checks bench_watcher on first sit
   * and ten_bench_sits after 10.
   */
  recordBenchSit() {
    this._benchSits++;
    this._save();
    if (this._benchSits === 1) this.checkSecret('bench_watcher');
    if (this._benchSits >= 10) this.checkSecret('ten_bench_sits');
  }

  /* ────────────────────────────────────────────
   *  Internal helpers
   * ──────────────────────────────────────────── */

  /**
   * Unlock a secret, persist, notify, and show DOM popup.
   * @param {object} s - secret record
   * @returns {boolean}
   * @private
   */
  _unlock(s) {
    s.unlocked = true;
    s.unlockedAt = Date.now();
    this._save();
    this._showNotification(s);
    if (this.onSecretUnlocked) this.onSecretUnlocked(s);
    return true;
  }

  /**
   * Display a retro-styled notification at the bottom of the screen.
   * @param {object} secret
   * @private
   */
  _showNotification(secret) {
    if (typeof document === 'undefined') return;

    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#000',
      color: '#0f0',
      fontFamily: 'monospace',
      fontSize: '16px',
      padding: '16px 28px',
      border: '2px solid #0f0',
      imageRendering: 'pixelated',
      boxShadow: '0 0 12px #0f0',
      zIndex: '99999',
      opacity: '0',
      transition: 'opacity 0.4s ease',
      pointerEvents: 'none',
      textAlign: 'center',
      maxWidth: '420px',
      lineHeight: '1.6',
    });

    const tierStars = '★'.repeat(secret.tier);
    const progress = this.getProgress();
    el.innerHTML = `
      <div style="font-size:18px;margin-bottom:6px;">${tierStars} SECRET FOUND ${tierStars}</div>
      <div style="color:#33ff66;font-size:15px;margin-bottom:4px;">${secret.title}</div>
      <div style="color:#88ccaa;font-size:12px;font-style:italic;">"${secret.description}"</div>
      <div style="color:#669966;font-size:11px;margin-top:8px;">${progress.found}/${progress.total} secrets found</div>
    `;
    document.body.appendChild(el);

    // fade in
    requestAnimationFrame(() => { el.style.opacity = '1'; });

    // fade out after 5 s, then remove
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    }, 5000);
  }

  /* ────────────────────────────────────────────
   *  Persistence (localStorage)
   * ──────────────────────────────────────────── */

  /** @private */
  _save() {
    try {
      const data = {
        unlocked: [...this._secrets.values()]
          .filter(s => s.unlocked)
          .map(s => ({ id: s.id, at: s.unlockedAt })),
        found1597: [...this._found1597],
        connections: this._connections,
        visitedZones: [...this._visitedZones],
        benchSits: this._benchSits,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* storage unavailable */ }
  }

  /** @private */
  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      (data.unlocked || []).forEach(({ id, at }) => {
        const s = this._secrets.get(id);
        if (s) { s.unlocked = true; s.unlockedAt = at; }
      });

      (data.found1597 || []).forEach(loc => this._found1597.add(loc));
      this._connections = data.connections || [];
      (data.visitedZones || []).forEach(z => this._visitedZones.add(z));
      this._benchSits = data.benchSits || 0;
    } catch { /* corrupted or unavailable */ }
  }

  /**
   * Wipe all secret progress. Use with caution.
   */
  reset() {
    this._secrets.forEach(s => { s.unlocked = false; s.unlockedAt = null; });
    this._found1597.clear();
    this._connections = [];
    this._visitedZones.clear();
    this._benchSits = 0;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* */ }
  }
}

export { SecretsManager };
