/**
 * Headless walk-test: simulates a player walking waypoints through the house
 * using the real collision/ground-height data from House.ts.
 *
 * Run: npx tsx walk.test.ts
 */
import * as THREE from 'three';

// ─── Mocks for Node (House.ts / Textures / LightManager touch DOM) ──────────
(global as any).window = { addEventListener: () => {} };
(global as any).document = {
  createElement: () => ({
    getContext: () => new Proxy({}, {
      get: (_t: any, p: string) => {
        if (p === 'fillStyle' || p === 'strokeStyle' || p === 'lineWidth'
         || p === 'globalAlpha' || p === 'shadowBlur' || p === 'shadowColor') return '';
        return (..._a: any[]) => ({ addColorStop: () => {} });
      },
      set: () => true
    }),
    width: 0, height: 0,
    style: {}, classList: { add: () => {}, remove: () => {} }, appendChild: () => {}
  }),
  addEventListener: () => {},
  getElementById: () => null,
  pointerLockElement: null
};
(global as any).Image = class {};

import { House, Collider } from './src/world/House';
import { houseLayout } from './src/world/houseLayout';

// ─── Build the world ─────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const house = new House(scene);
const colliders = house.collisionBoxes;

console.log(`Total colliders: ${colliders.length}`);

// Open all unlocked doors for the test
for (const door of house.animatedDoors) {
  if (!door.isLocked) {
    door.isOpen = true;
    door.collider.enabled = false;
  }
}

// ─── Pure-logic movement simulator (mirrors Player.ts exactly) ──────────────
const SPEED = 3.5;
const PLAYER_RADIUS = 0.35;
const STEP_HEIGHT = 0.45;

function getGroundHeight(
  x: number, z: number, feetY: number, colls: Collider[]
): number {
  let groundHeight = 0;
  const currentFloorLevel = feetY >= 1.5 ? 1 : 0;
  const offsets = [
    { dx: 0, dz: 0 },
    { dx: 0.3, dz: 0 },
    { dx: -0.3, dz: 0 },
    { dx: 0, dz: 0.3 },
    { dx: 0, dz: -0.3 }
  ];
  for (const c of colls) {
    if (!c.enabled) continue;
    if (c.level !== 'both' && c.level !== currentFloorLevel && c.level !== currentFloorLevel - 1) continue;
    const box = c.box;
    if (box.max.y > feetY + STEP_HEIGHT) continue;
    for (const off of offsets) {
      const sx = x + off.dx;
      const sz = z + off.dz;
      if (sx >= box.min.x && sx <= box.max.x && sz >= box.min.z && sz <= box.max.z) {
        groundHeight = Math.max(groundHeight, box.max.y);
        break;
      }
    }
  }
  return groundHeight;
}

interface SimState {
  x: number;
  y: number;   // feet Y
  z: number;
  vy: number;
}

function simStep(
  state: SimState, dx: number, dz: number, delta: number, colls: Collider[]
): void {
  const len = Math.hypot(dx, dz);
  if (len < 0.0001) return;
  const ndx = dx / len;
  const ndz = dz / len;

  const targetX = state.x + ndx * SPEED * delta;
  const targetZ = state.z + ndz * SPEED * delta;

  // Gravity
  state.vy -= 9.8 * delta;
  let nextFeetY = state.y + state.vy * delta;

  // Ground resolution
  const groundY = getGroundHeight(targetX, targetZ, state.y, colls);
  if (nextFeetY <= groundY + 0.05) {
    nextFeetY = groundY;
    state.vy = 0;
  }

  // Collision filter — skip disabled, wrong level, and step-height colliders
  const currentFloorLevel = nextFeetY >= 2.0 ? 1 : 0;
  const active = colls.filter(c => {
    if (!c.enabled) return false;
    if (c.level !== 'both' && c.level !== currentFloorLevel) return false;
    if (c.box.max.y <= nextFeetY + STEP_HEIGHT) return false;
    return true;
  });

  const check = (cx: number, cz: number): boolean => {
    const pBox = new THREE.Box3(
      new THREE.Vector3(cx - PLAYER_RADIUS, nextFeetY + 0.1, cz - PLAYER_RADIUS),
      new THREE.Vector3(cx + PLAYER_RADIUS, nextFeetY + 1.5, cz + PLAYER_RADIUS)
    );
    for (const c of active) {
      if (c.box.intersectsBox(pBox)) return true;
    }
    return false;
  };

  let finalX = targetX;
  let finalZ = targetZ;

  // Slide: try X alone, then Z alone
  if (check(finalX, state.z)) finalX = state.x;
  if (check(finalX, finalZ)) finalZ = state.z;

  // Safety push-out
  const finalBox = new THREE.Box3(
    new THREE.Vector3(finalX - PLAYER_RADIUS, nextFeetY + 0.1, finalZ - PLAYER_RADIUS),
    new THREE.Vector3(finalX + PLAYER_RADIUS, nextFeetY + 1.5, finalZ + PLAYER_RADIUS)
  );
  for (const c of active) {
    if (c.box.intersectsBox(finalBox)) {
      const bc = new THREE.Vector3();
      c.box.getCenter(bc);
      const dir = new THREE.Vector2(finalX - bc.x, finalZ - bc.z);
      if (dir.lengthSq() > 0) dir.normalize();
      else dir.set(1, 0);
      finalX += dir.x * 0.05;
      finalZ += dir.y * 0.05;
    }
  }

  state.x = finalX;
  state.z = finalZ;
  state.y = nextFeetY;
}

// ─── Waypoints ───────────────────────────────────────────────────────────────
// All doors are open. Archways: living↔foyer at (6, 7..10), kitchen↔dining at (6, 1..4).
// Stairs: x=8.9..10, z=6.9..11.4, climb from z=11.4 down to z=6.9.
const waypoints = [
  { name: 'front door',            x: 7.4,  y: 0,   z: 11.2 },
  { name: 'foyer center',          x: 8.0,  y: 0,   z: 8.5  },
  { name: 'foyer south (avoid rail)', x: 8.0,  y: 0,   z: 11.6 },
  { name: 'stair entry',           x: 9.4,  y: 0,   z: 11.6 },
  { name: 'foot of stairs',        x: 9.4,  y: 0,   z: 11.4 },
  { name: 'top of stairs',         x: 9.4,  y: 3.0, z: 7.2  },
  { name: 'upstairs hall',         x: 8.0,  y: 3.0, z: 5.5  },
  { name: 'master bedroom door',   x: 6.0,  y: 3.0, z: 8.5  },
  { name: 'inside master bedroom', x: 3.0,  y: 3.0, z: 8.5  },
  { name: 'walk-in closet',        x: 1.1,  y: 3.0, z: 10.5 },
  { name: 'exit closet',           x: 1.1,  y: 3.0, z: 9.0  },
  { name: 'master bedroom door 2', x: 6.0,  y: 3.0, z: 8.5  },
  { name: 'upstairs hall 2',       x: 8.0,  y: 3.0, z: 5.5  },
  { name: 'stair entry up',        x: 9.4,  y: 3.0, z: 5.5  }, 
  { name: 'top of stairs 2',       x: 9.4,  y: 3.0, z: 7.2  }, 
  { name: 'foot of stairs 2',      x: 9.4,  y: 0,   z: 11.4 },
  { name: 'stair exit',            x: 9.4,  y: 0,   z: 11.6 },
  { name: 'foyer south 2',         x: 8.0,  y: 0,   z: 11.6 },
  { name: 'foyer center 2',        x: 8.0,  y: 0,   z: 8.5  },
  { name: 'through archway',       x: 5.5,  y: 0,   z: 8.5  },
  { name: 'living room center',    x: 3.0,  y: 0,   z: 9.5  },
  { name: 'back to foyer',         x: 8.0,  y: 0,   z: 8.5  },
  { name: 'dining door entry',     x: 7.5,  y: 0,   z: 5.5  },
  { name: 'dining door exit',      x: 7.5,  y: 0,   z: 4.5  }, // squarely through the door
  { name: 'kitchen archway',       x: 5.5,  y: 0,   z: 2.5  },
  { name: 'kitchen center',        x: 4.5,  y: 0,   z: 1.5  },
];

const DELTA = 0.016;
const MAX_TIME = 15;

const state: SimState = {
  x: waypoints[0].x,
  y: waypoints[0].y,
  z: waypoints[0].z,
  vy: 0
};

let allPass = true;
let failures = 0;

for (let i = 1; i < waypoints.length; i++) {
  const wp = waypoints[i];
  process.stdout.write(`→ [${wp.name}] (${wp.x}, ${wp.y}, ${wp.z}) ... `);

  let t = 0;
  let reached = false;

  while (t < MAX_TIME) {
    const dx = wp.x - state.x;
    const dz = wp.z - state.z;
    const dist2d = Math.hypot(dx, dz);
    if (dist2d < 0.2) { // tighter distance threshold
      reached = true;
      break;
    }
    simStep(state, dx, dz, DELTA, colliders);
    t += DELTA;
  }

  if (reached) {
    const yErr = Math.abs(state.y - wp.y);
    const yOk = yErr < 0.9; // allow being on the first few steps when triggered
    console.log(`✓  (${state.x.toFixed(2)}, ${state.y.toFixed(2)}, ${state.z.toFixed(2)}) ${t.toFixed(1)}s ${yOk ? '' : '⚠ Y-ERR=' + yErr.toFixed(2)}`);
    if (!yOk) { allPass = false; failures++; }
  } else {
    allPass = false;
    failures++;
    console.log(`✗ STUCK (${state.x.toFixed(2)}, ${state.y.toFixed(2)}, ${state.z.toFixed(2)})`);

    const feetY = state.y;
    const floorLvl = feetY >= 2.0 ? 1 : 0;
    const pBox = new THREE.Box3(
      new THREE.Vector3(state.x - PLAYER_RADIUS, feetY + 0.1, state.z - PLAYER_RADIUS),
      new THREE.Vector3(state.x + PLAYER_RADIUS, feetY + 1.5, state.z + PLAYER_RADIUS)
    );
    // Show blocking and nearby colliders
    const bigBox = pBox.clone().expandByScalar(0.5);
    for (const c of colliders) {
      if (!c.enabled) continue;
      if (c.level !== 'both' && c.level !== floorLvl) continue;
      if (c.box.max.y <= feetY + STEP_HEIGHT) continue;
      if (c.box.intersectsBox(bigBox)) {
        const tag = c.propId ?? 'wall/struct';
        const blocking = c.box.intersectsBox(pBox) ? '  BLOCKING' : '  nearby  ';
        console.log(`  ${blocking} [${tag}] (${c.box.min.toArray().map((v:number)=>v.toFixed(2))})->(${c.box.max.toArray().map((v:number)=>v.toFixed(2))}) lvl=${c.level}`);
      }
    }
  }
}

console.log(`\n${failures === 0 ? '=== ALL WAYPOINTS PASSED ===' : `=== ${failures} WAYPOINT(S) FAILED ===`}`);
process.exit(failures === 0 ? 0 : 1);
