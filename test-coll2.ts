import { houseLayout } from './src/world/houseLayout';
import { House } from './src/world/House';
import * as THREE from 'three';

(global as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return {
        getContext: () => new Proxy({}, { get: () => () => ({ addColorStop: () => {} }) }),
        width: 0, height: 0
      };
    }
    return {};
  }
};

const scene = new THREE.Scene();
const house = new House(scene);

for (const door of house.animatedDoors) {
  door.isOpen = true;
  door.collider.enabled = false;
}
house.updateDoors(1.0);

const colliders = (house as any).collisionBoxes;
for (const c of colliders) {
  if (c.box.min.z <= 12 && c.box.max.z >= 12 && c.box.min.x <= 7.4 && c.box.max.x >= 7.4) {
    console.log(`Found: z=[${c.box.min.z.toFixed(2)}, ${c.box.max.z.toFixed(2)}] y=[${c.box.min.y.toFixed(2)}, ${c.box.max.y.toFixed(2)}] enabled=${c.enabled}`);
  }
}
