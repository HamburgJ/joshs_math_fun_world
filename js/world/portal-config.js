/**
 * Portal configuration — single source of truth for portal positions,
 * orientations, and trigger zones on the green field.
 *
 * Used by both field.js (visual construction) and zone-transitions.js
 * (teleportation triggers).
 *
 * Shell Bingby says: "A portal should work when you walk into it.
 * That's the whole point of a portal."
 */

/** How close Josh must be to a portal center to trigger a transition. */
export const PORTAL_TRIGGER_RADIUS = 4;

/**
 * @typedef {{
 *   zone:      string,
 *   label:     string,
 *   color:     number,
 *   x:         number,
 *   z:         number,
 *   rotation:  number,
 *   direction: 'north'|'east'|'south'|'west',
 * }} PortalDef
 */

/** @type {PortalDef[]} */
export const PORTAL_DEFS = [
    {
        zone:      'coordinate_plane',
        label:     'THE GRID',
        color:     0x4488cc,
        x:         0,
        z:         -68,
        rotation:  0,
        direction: 'north',
    },
    {
        zone:      'wireframe_void',
        label:     'THE VOID',
        color:     0x00ff41,
        x:         88,
        z:         -10,
        rotation:  Math.PI / 2,
        direction: 'east',
    },
    {
        zone:      'non_euclidean',
        label:     'THE IMPOSSIBLE',
        color:     0xcc44aa,
        x:         -88,
        z:         -10,
        rotation:  Math.PI / 2,
        direction: 'west',
    },
    {
        zone:      'fractal_boundary',
        label:     'THE COMPLEX',
        color:     0xff8800,
        x:         0,
        z:         55,
        rotation:  Math.PI,
        direction: 'south',
        secret:    true,
    },
    {
        zone:      'number_caverns',
        label:     'THE CAVERNS',
        color:     0xffaa44,
        x:         -62,
        z:         -55,
        rotation:  Math.PI * 0.75,
        direction: 'north',
    },
    {
        zone:      'inner_sphere',
        label:     'THE SHELL',
        color:     0xffee66,
        x:         -20,
        y:         42,
        z:         25,
        rotation:  0,
        direction: 'north',
    },
];

/**
 * Check if a position is within a portal's trigger zone (circle).
 * @param {{ x: number, z: number }} pos
 * @param {PortalDef} portal
 * @returns {boolean}
 */
export function isInsidePortal(pos, portal) {
    if (portal.secret && !portal.active) return false;
    if (portal.y !== undefined && pos.y !== undefined && Math.abs(pos.y - portal.y) > 10) return false;
    const dx = pos.x - portal.x;
    const dz = pos.z - portal.z;
    return dx * dx + dz * dz < PORTAL_TRIGGER_RADIUS * PORTAL_TRIGGER_RADIUS;
}

/**
 * Find a portal definition by zone name.
 * @param {string} zoneName
 * @returns {PortalDef|undefined}
 */
export function getPortalByZone(zoneName) {
    return PORTAL_DEFS.find(d => d.zone === zoneName);
}
