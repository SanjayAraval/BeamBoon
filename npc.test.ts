import { House, Collider } from './src/world/House';
import { npcLayout } from './src/world/npcLayout';
import { houseLayout } from './src/world/houseLayout';
import { createCharacter } from './src/world/characters';
import { NpcController } from './src/world/NpcController';
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
const colliders = house.collisionBoxes;

let allPass = true;
const PLAYER_RADIUS = 0.35;
const STEP_HEIGHT = 0.45;

function checkCollision(cx: number, cy: number, cz: number, floor: number, debug = false): boolean {
  const pBox = new THREE.Box3(
    new THREE.Vector3(cx - PLAYER_RADIUS, cy + 0.1, cz - PLAYER_RADIUS),
    new THREE.Vector3(cx + PLAYER_RADIUS, cy + 1.5, cz + PLAYER_RADIUS)
  );
  
  for (const c of colliders) {
    if (!c.enabled) continue;
    if ((c as any).propId && (c as any).propId.startsWith('door_')) continue;
    if (c.level !== 'both' && c.level !== floor) continue;
    if (c.box.max.y <= cy + STEP_HEIGHT) continue;
    if (c.box.intersectsBox(pBox)) {
      if (debug) console.log(`Blocked by collider: propId=${(c as any).propId}, min=[${c.box.min.x.toFixed(2)},${c.box.min.y.toFixed(2)},${c.box.min.z.toFixed(2)}], max=[${c.box.max.x.toFixed(2)},${c.box.max.y.toFixed(2)},${c.box.max.z.toFixed(2)}]`);
      return true;
    }
  }
  return false;
}

function getGroundHeight(cx: number, cz: number, floor: number): number {
  let groundHeight = 0;
  for (const c of colliders) {
    if (!c.enabled) continue;
    if ((c as any).propId && (c as any).propId.startsWith('door_')) continue;
    if (c.level !== 'both' && c.level !== floor && c.level !== floor - 1) continue;
    
    // Simplification for the test: check center
    if (cx >= c.box.min.x && cx <= c.box.max.x && cz >= c.box.min.z && cz <= c.box.max.z) {
      if (c.box.max.y > groundHeight && c.box.max.y <= (floor === 1 ? 3.0 : 0.0) + 1.0) {
        groundHeight = c.box.max.y;
      }
    }
  }
  return groundHeight;
}

console.log("Checking spawns and waypoints...");
let pointsPass = true;
for (const [name, spawn] of Object.entries(npcLayout.parentEntry)) {
  const y = spawn.floor === 1 ? 3.0 : 0.0;
  if (checkCollision(spawn.x, y, spawn.z, spawn.floor, true)) {
    console.log(`FAIL: Spawn ${name} is inside a collider at (${spawn.x}, ${spawn.z})`);
    pointsPass = false;
  }
}
for (const wp of npcLayout.waypoints) {
  const y = wp.floor === 1 ? 3.0 : 0.0;
  if (checkCollision(wp.x, y, wp.z, wp.floor, true)) {
    console.log(`FAIL: Waypoint ${wp.name} is inside a collider at (${wp.x}, ${wp.z})`);
    pointsPass = false;
  }
}
if (pointsPass) console.log("PASS: All spawns and waypoints are clear.");
else allPass = false;

console.log("Checking edges...");
let edgesPass = true;
for (const edge of npcLayout.edges) {
  const w1 = npcLayout.waypoints.find(w => w.name === edge.from)!;
  const w2 = npcLayout.waypoints.find(w => w.name === edge.to)!;
  
  const dx = w2.x - w1.x;
  const dz = w2.z - w1.z;
  const dist = Math.hypot(dx, dz);
  const steps = Math.ceil(dist / 0.1);
  
  let edgeOk = true;
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const cx = w1.x + dx * t;
    const cz = w1.z + dz * t;
    
    // For stairs, interpolate Y
    let cy = 0;
    let floor = 0;
    if (edge.from === 'stairs_bottom' && edge.to === 'stairs_top' || 
        edge.to === 'stairs_bottom' && edge.from === 'stairs_top') {
      const startY = w1.floor === 1 ? 3.0 : 0.0;
      const endY = w2.floor === 1 ? 3.0 : 0.0;
      cy = startY + (endY - startY) * t;
      floor = cy >= 1.5 ? 1 : 0;
    } else {
      floor = w1.floor;
      cy = floor === 1 ? 3.0 : 0.0;
    }
    
    if (checkCollision(cx, cy, cz, floor, true)) {
      console.log(`FAIL: Edge ${edge.from} -> ${edge.to} blocked at (${cx.toFixed(2)}, ${cz.toFixed(2)})`);
      edgeOk = false;
      edgesPass = false;
      break;
    }
  }
}
if (edgesPass) console.log("PASS: All edges are walkable.");
else allPass = false;

console.log("Checking reachability...");
const startWp = npcLayout.waypoints[0].name;
const visited = new Set<string>();
const q = [startWp];
while (q.length > 0) {
  const curr = q.shift()!;
  if (visited.has(curr)) continue;
  visited.add(curr);
  for (const edge of npcLayout.edges) {
    if (edge.from === curr) q.push(edge.to);
    if (edge.to === curr) q.push(edge.from);
  }
}
let reachPass = true;
for (const wp of npcLayout.waypoints) {
  if (!visited.has(wp.name)) {
    console.log(`FAIL: Waypoint ${wp.name} is unreachable from ${startWp}`);
    reachPass = false;
  }
}
if (reachPass) console.log("PASS: All waypoints are reachable.");
else allPass = false;


console.log("Checking drunk sway from porch to living room...");
const swayPath = ['porch_outside', 'front_door_inside', 'foyer', 'living_room_entry', 'living_room'];
let swayPass = true;
for (let i = 0; i < swayPath.length - 1; i++) {
  const w1 = npcLayout.waypoints.find(w => w.name === swayPath[i])!;
  const w2 = npcLayout.waypoints.find(w => w.name === swayPath[i+1])!;
  
  const dx = w2.x - w1.x;
  const dz = w2.z - w1.z;
  const dist = Math.hypot(dx, dz);
  const steps = Math.ceil(dist / 0.1);
  
  let drunkTime = 0;
  const dt = (dist / steps) / 1.05; // speed = 1.4 * 0.75 = 1.05
  const yaw = Math.atan2(-dx, -dz);
  
  for (let step = 0; step <= steps; step++) {
    const t = steps === 0 ? 0 : step / steps;
    const cx = w1.x + dx * t;
    const cz = w1.z + dz * t;
    
    drunkTime += dt;
    const swayAmt = Math.sin(drunkTime * Math.PI * 2 * 1.2) * 0.12;
    const swayDx = Math.cos(yaw) * swayAmt;
    const swayDz = -Math.sin(yaw) * swayAmt;
    
    // Test +sway
    let finalPlusX = cx;
    let finalPlusZ = cz;
    if (!checkCollision(cx + swayDx, 0, cz + swayDz, 0, true)) {
      finalPlusX += swayDx;
      finalPlusZ += swayDz;
    }
    if (checkCollision(finalPlusX, 0, finalPlusZ, 0, true)) {
       console.log(`FAIL: Clamped +sway is in collider at (${finalPlusX.toFixed(2)}, ${finalPlusZ.toFixed(2)})`);
       swayPass = false;
    }

    // Test -sway
    let finalMinusX = cx;
    let finalMinusZ = cz;
    if (!checkCollision(cx - swayDx, 0, cz - swayDz, 0, true)) {
      finalMinusX -= swayDx;
      finalMinusZ -= swayDz;
    }
    if (checkCollision(finalMinusX, 0, finalMinusZ, 0, true)) {
       console.log(`FAIL: Clamped -sway is in collider at (${finalMinusX.toFixed(2)}, ${finalMinusZ.toFixed(2)})`);
       swayPass = false;
    }
  }
}
if (swayPass) console.log("PASS: Drunk sway never pushes NPCs into colliders.");
else allPass = false;

// DEAD NPC TEST
const deadChar = createCharacter('mother');
const deadCtrl = new NpcController(deadChar, house.collisionBoxes);
deadCtrl.setPosition(0, 0, 0, 0);
deadCtrl.walkTo('foyer');
deadCtrl.setDead(true);
deadCtrl.update(0.1);
const deadX = deadCtrl.x;
const deadZ = deadCtrl.z;

let deadMoved = false;
for (let i = 0; i < 100; i++) { // 10 seconds at 0.1 delta
  deadCtrl.update(0.1);
  if (Math.abs(deadCtrl.x - deadX) > 0.001 || Math.abs(deadCtrl.z - deadZ) > 0.001) {
    deadMoved = true;
  }
}
if (deadMoved || deadCtrl.path.length > 0) {
  console.log("FAIL: Dead NPC moved or retained path!");
  allPass = false;
} else {
  console.log("PASS: Dead NPC does not move or animate after setDead().");
}

if (allPass) {
  console.log("=== ALL TESTS PASSED ===");
} else {
  console.log("TESTS FAILED.");
  process.exit(1);
}
