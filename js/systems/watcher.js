import * as THREE from 'three';

export class WatcherSystem {
    constructor(scene, camera, player) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;

        this.spawnInterval = 10 * 60; // 10 minutes in seconds
        this.timer = 0;
        this.spawnDistance = 250;
        this.despawnDistance = 40;

        this.mesh = null;
        this.wasSeen = false;
        
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();
    }

    createWatcher() {
        if (this.mesh) return;

        // Slender, tall, dark figure
        // Really thin (0.25 radius), very tall (8 height) -> 8.5 total height
        const geometry = new THREE.CapsuleGeometry(0.25, 8, 4, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x020202,
            transparent: true,
            opacity: 0.65, // Hard to make out
            fog: true
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        // Position it far away at random angle
        const angle = Math.random() * Math.PI * 2;
        const px = this.player.position.x + Math.cos(angle) * this.spawnDistance;
        const pz = this.player.position.z + Math.sin(angle) * this.spawnDistance;
        // Assume floor around y=0. Some zones might have weird Y coords, so try to match player's Y.
        const py = this.player.position.y + 4.25; 

        this.mesh.position.set(px, py, pz);
        
        // Make sure it faces the player but remains upright
        this.mesh.lookAt(this.player.position.x, py, this.player.position.z);

        // Update bounding boxes for accurate frustum culling
        this.mesh.geometry.computeBoundingSphere();
        this.mesh.updateMatrixWorld();

        this.scene.add(this.mesh);
        this.wasSeen = false;
        this.timer = 0; // Reset spawn timer when spawned
    }

    removeWatcher() {
        if (!this.mesh) return;
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;
        this.wasSeen = false;
        this.timer = 0; // Restart countdown until next spawn
    }

    update(dt) {
        if (!this.mesh) {
            this.timer += dt;
            if (this.timer >= this.spawnInterval) {
                this.createWatcher();
            }
            return;
        }

        // We have a watcher currently spawned.
        // Update frustum
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();
        this.projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

        const isVisible = this.frustum.intersectsObject(this.mesh);
        const distanceToPlayer = this.player.position.distanceTo(this.mesh.position);

        // Disappears if we walk too close
        if (distanceToPlayer < this.despawnDistance) {
            this.removeWatcher();
            return;
        }

        // If you look in their direction and then away, they disappear
        if (isVisible) {
            this.wasSeen = true;
        } else if (this.wasSeen) {
            // It was seen, and is no longer visible -> remove
            this.removeWatcher();
        }
    }
}
