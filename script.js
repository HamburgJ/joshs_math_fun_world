const fs = require('fs');
let code = fs.readFileSync('js/josh/josh.js', 'utf8');

const collideMatch = /_wouldCollide\(x, z\) \{[\s\S]*?return false;\n    \}/;

const newCollide = `_getCollisions(x, z) {
        let cols = [];
        for (const obstacle of this.colliders) {
            if (obstacle.min && obstacle.max) {
                // AABB
                const closestX = Math.max(obstacle.min.x, Math.min(x, obstacle.max.x));
                const closestZ = Math.max(obstacle.min.z, Math.min(z, obstacle.max.z));
                const dx = x - closestX;
                const dz = z - closestZ;
                const distSq = dx * dx + dz * dz;
                if (distSq < (this.bodyRadius * this.bodyRadius)) {
                    const dist = Math.sqrt(distSq);
                    if (dist === 0) cols.push({ nx: 1, nz: 0, depth: this.bodyRadius });
                    else cols.push({ nx: dx/dist, nz: dz/dist, depth: this.bodyRadius - dist });
                }
            } else {
                // Circle
                const dx = x - obstacle.x;
                const dz = z - obstacle.z;
                const minDist = this.bodyRadius + (obstacle.radius || 0);
                const distSq = dx * dx + dz * dz;
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    if (dist === 0) cols.push({ nx: 1, nz: 0, depth: minDist });
                    else cols.push({ nx: dx/dist, nz: dz/dist, depth: minDist - dist });
                }
            }
        }
        return cols;
    }`;

code = code.replace(collideMatch, newCollide);

const movementOld = /if \(!this\._wouldCollide\(nextX, nextZ\)\) \{[\s\S]*?this\._velocityZ = 0;\n\s+\}\n\s+\}\n\s+\}/;

const movementNew = `let collisions = this._getCollisions(nextX, nextZ);
                
                // Add slope check
                const nextY = terrainFn(nextX, nextZ);
                const currentY = terrainFn(this.model.position.x, this.model.position.z);
                const maxIncline = 0.6; // Max Y difference per unit
                const distMoved = Math.sqrt(dx*dx + dz*dz) || 0.001;
                const slope = (nextY - currentY) / distMoved;
                
                // If moving upward too steeply, treat as collision pushing backward
                if (slope > maxIncline && nextY > currentY) {
                    collisions.push({ nx: -dx/distMoved, nz: -dz/distMoved, depth: distMoved });
                }

                if (collisions.length === 0) {
                    // Move freely
                    this.model.position.x = nextX;
                    this.model.position.z = nextZ;
                } else {
                    // Vector Wall Sliding
                    for (const col of collisions) {
                        nextX += col.nx * col.depth;
                        nextZ += col.nz * col.depth;
                        
                        // Adjust velocity to slide along normal
                        const dot = this._velocityX * col.nx + this._velocityZ * col.nz;
                        if (dot < 0) {
                            this._velocityX -= dot * col.nx;
                            this._velocityZ -= dot * col.nz;
                        }
                    }
                    this.model.position.x = nextX;
                    this.model.position.z = nextZ;
                }`;

code = code.replace(movementOld, movementNew);

code = code.replace(/if \(!this\._wouldCollide\(nextX, nextZ\)\) \{\n\s+this\.model\.position\.x = nextX;\n\s+this\.model\.position\.z = nextZ;\n\s+\} else \{\n\s+this\._velocityX = 0;\n\s+this\._velocityZ = 0;\n\s+\}/, `let neCols = this._getCollisions(nextX, nextZ);
                if (neCols.length === 0) {
                    this.model.position.x = nextX;
                    this.model.position.z = nextZ;
                } else {
                    for (const col of neCols) {
                        nextX += col.nx * col.depth;
                        nextZ += col.nz * col.depth;
                        const dot = this._velocityX * col.nx + this._velocityZ * col.nz;
                        if (dot < 0) {
                            this._velocityX -= dot * col.nx;
                            this._velocityZ -= dot * col.nz;
                        }
                    }
                    this.model.position.x = nextX;
                    this.model.position.z = nextZ;
                }`);

fs.writeFileSync('js/josh/josh.js', code, 'utf8');
