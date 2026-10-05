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
for (const c of (house as any).collisionBoxes) {
  if (c.box.min.z <= 12 && c.box.max.z >= 12 && c.box.min.x <= 7.4 && c.box.max.x >= 7.4) {
    console.log(`Found box around front door: min[${c.box.min.x.toFixed(2)}, ${c.box.min.z.toFixed(2)}] max[${c.box.max.x.toFixed(2)}, ${c.box.max.z.toFixed(2)}] level=${c.level}`);
  }
}
