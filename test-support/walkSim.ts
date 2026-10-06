// Pure-logic player movement (mirrors Player.ts): ground height, step-up, gravity and wall sliding
// against the real House colliders. Shared by walk.test.ts and the blackout route test.

import * as THREE from 'three';
import type { Collider } from '../src/world/House';

export const SPEED = 3.5;
export const PLAYER_RADIUS = 0.35;
export const STEP_HEIGHT = 0.45;

export function getGroundHeight(
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

export interface SimState {
  x: number;
  y: number;   // feet Y
  z: number;
  vy: number;
}

export function simStep(
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

// Walk straight at a waypoint (sliding along walls) until within 0.2 m. False if stuck for maxTime.
export function walkTo(state: SimState, x: number, z: number, colls: Collider[], delta = 0.016, maxTime = 15): boolean {
  for (let t = 0; t < maxTime; t += delta) {
    const dx = x - state.x;
    const dz = z - state.z;
    if (Math.hypot(dx, dz) < 0.2) return true;
    simStep(state, dx, dz, delta, colls);
  }
  return Math.hypot(x - state.x, z - state.z) < 0.2;
}
