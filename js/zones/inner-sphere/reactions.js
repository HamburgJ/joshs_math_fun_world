import * as THREE from 'three';

export function initReactions(zone) {
    zone.on('interact', (target) => {
        if (target.type === 'inner_collectable') {
            
            if (target.object && target.object.parent) {
                target.object.parent.remove(target.object);
            }
            // Remove from interactables
            const idx = zone.interactables.findIndex(i => i.object === target.object);
            if (idx >= 0) zone.interactables.splice(idx, 1);
            
            State.secrets.innerSphereFound = true;
            document.dispatchEvent(new CustomEvent('josh-speak', {
                detail: "A shiny gem in this weird inverse world!",
            }));
            return;
        }

        if (target.type === 'bench') {
            document.dispatchEvent(new CustomEvent('josh-speak', {
                detail: "Taking a rest inside a giant sphere... cozy.",
            }));
        }
    });
}
