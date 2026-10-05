import { houseLayout } from './src/world/houseLayout';
import { npcLayout } from './src/world/npcLayout';
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
// open all doors like npc.test.ts
for (const door of house.animatedDoors) {
  door.isOpen = true;
  door.collider.enabled = false;
}
house.updateDoors(1.0);

const colliders = (house as any).collisionBoxes;
const PLAYER_RADIUS = 0.35;
const STEP_HEIGHT = 0.45;

function checkCollision(cx: number, cy: number, cz: number, floor: number): boolean {
  const pBox = new THREE.Box3(
    new THREE.Vector3(cx - PLAYER_RADIUS, cy + 0.1, cz - PLAYER_RADIUS),
    new THREE.Vector3(cx + PLAYER_RADIUS, cy + 1.5, cz + PLAYER_RADIUS)
  );
  
  for (const c of colliders) {
    if (!c.enabled) continue;
    if (c.level !== 'both' && c.level !== floor) continue;
    if (c.box.max.y <= cy + STEP_HEIGHT) continue;
    if (c.box.intersectsBox(pBox)) {
      console.log(`Blocked by: min[${c.box.min.x.toFixed(2)}, ${c.box.min.z.toFixed(2)}] max[${c.box.max.x.toFixed(2)}, ${c.box.max.z.toFixed(2)}] y=[${c.box.min.y.toFixed(2)}, ${c.box.max.y.toFixed(2)}]`);
      return true;
    }
  }
  return false;
}

const w1 = npcLayout.waypoints.find(w => w.name === 'porch_outside');
const w2 = npcLayout.waypoints.find(w => w.name === 'front_door_inside');

const dx = w2.x - w1.x;
const dz = w2.z - w1.z;
const dist = Math.hypot(dx, dz);
const steps = Math.ceil(dist / 0.1);

for (let i = 0; i <= steps; i++) {
  const t = steps === 0 ? 0 : i / steps;
  const cx = w1.x + dx * t;
  const cz = w1.z + dz * t;
  const hit = checkCollision(cx, 0, cz, 0);
  console.log(`z=${cz.toFixed(2)} hit=${hit}`);
}
