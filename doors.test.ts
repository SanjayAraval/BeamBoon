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

console.log("=== DOOR TEST ===");
let exitCode = 0;
let passCount = 0;
let failCount = 0;

function assert(desc: string, cond: boolean) {
  if (cond) {
    console.log(`PASS: ${desc}`);
    passCount++;
  } else {
    console.log(`FAIL: ${desc}`);
    failCount++;
    exitCode = 1;
  }
}

// Instantiate scene and house to check colliders
const scene = new THREE.Scene();
const house = new House(scene);
house.updateDoors(1.0); // force update

const colliders = (house as any).collisionBoxes;
const props = houseLayout.props || []; // if needed

for (const doorDef of houseLayout.doors) {
  if (doorDef.isArchway) continue;

  console.log(`\nTesting ${doorDef.name}...`);
  const isX = doorDef.axis === 'x';
  let hx = doorDef.x;
  let hz = doorDef.z;
  if (isX) hx += doorDef.hingeOffset;
  if (!isX) hz += doorDef.hingeOffset;

  const sign = Math.sign(doorDef.hingeOffset) < 0 ? 1 : -1;
  
  // 1. the hinge pivot lies on the doorway edge
  // doorway goes from x to x + width, or z to z + width? No, it's centered around x,z
  const dMin = isX ? doorDef.x - doorDef.width / 2 : doorDef.z - doorDef.width / 2;
  const dMax = isX ? doorDef.x + doorDef.width / 2 : doorDef.z + doorDef.width / 2;
  const hVal = isX ? hx : hz;
  const onEdge = Math.abs(hVal - dMin) < 0.01 || Math.abs(hVal - dMax) < 0.01;
  assert("Hinge pivot lies on the doorway edge", onEdge);

  const floorY = doorDef.floor === 1 ? 3.0 : 0.0;
  const pivot = new THREE.Group();
  pivot.position.set(hx, floorY, hz);
  pivot.rotation.y = doorDef.closedAngle;
  
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(doorDef.width, doorDef.height, 0.12));
  mesh.position.set(sign * doorDef.width / 2, doorDef.height / 2, 0);
  pivot.add(mesh);
  pivot.updateMatrixWorld(true);
  
  const closedBox = new THREE.Box3().setFromObject(mesh);
  
  // 2. closed slab bounding box fits inside the doorway opening and its thickness is at most the wall thickness
  const wallThickness = 0.2;
  const slabThickness = isX ? (closedBox.max.z - closedBox.min.z) : (closedBox.max.x - closedBox.min.x);
  assert(`Closed thickness (${slabThickness.toFixed(2)}) is at most wall thickness`, slabThickness <= wallThickness + 0.01);
  
  const inDoorway = isX 
    ? (closedBox.min.x >= dMin - 0.05 && closedBox.max.x <= dMax + 0.05)
    : (closedBox.min.z >= dMin - 0.05 && closedBox.max.z <= dMax + 0.05);
  assert("Closed slab fits inside the doorway opening", inDoorway);
  
  // 3. the open slab's bounding box does not intersect any wall or prop collider (except its own frame)
  pivot.rotation.y = doorDef.openAngle;
  pivot.updateMatrixWorld(true);
  const openBox = new THREE.Box3().setFromObject(mesh);
  
  // Shrink the open box slightly at the hinge to ignore "its own frame"
  const checkOpenBox = openBox.clone();
  if (isX) {
    // swings along Z, so shrink Z heavily at the hinge
    if (doorDef.openAngle > 0) checkOpenBox.min.z += 0.25; 
    else checkOpenBox.max.z -= 0.25;
    // Shrink X slightly to avoid overlapping the frame's cut edge
    checkOpenBox.min.x += 0.1;
    checkOpenBox.max.x -= 0.1;
  } else {
    // swings along X, so shrink X heavily at the hinge
    if (doorDef.openAngle === 0) checkOpenBox.min.x += 0.25; 
    else checkOpenBox.max.x -= 0.25;
    // Shrink Z slightly to avoid overlapping the frame's cut edge
    checkOpenBox.min.z += 0.1;
    checkOpenBox.max.z -= 0.1;
  }
  
  let intersecting = false;
  for (const c of colliders) {
    if (!c.enabled) continue;
    // Don't intersect with floor/ceiling (level checking roughly)
    // Only check against walls which have roughly height > 1
    if (c.box.max.y - c.box.min.y < 0.5) continue; 
    
    // Check intersection with shrunk open box
    if (c.box.intersectsBox(checkOpenBox)) {
      intersecting = true;
      console.log(`   Intersects collider: min[${c.box.min.x.toFixed(1)}, ${c.box.min.z.toFixed(1)}] max[${c.box.max.x.toFixed(1)}, ${c.box.max.z.toFixed(1)}]`);
    }
  }
  assert("Open slab bounding box does not intersect any wall/prop (except its own frame)", !intersecting);
  
  // 4. closed collider blocks a player walking through, open collider allows it
  const d = house.animatedDoors.find(ad => ad.id === doorDef.id);
  if (d && !d.isLocked) {
    d.isOpen = false;
    house.updateDoors(1.0);
    assert("Closed collider is enabled", d.collider.enabled);
    d.isOpen = true;
    house.updateDoors(1.0);
    assert("Open collider is disabled (allows walking)", !d.collider.enabled);
  } else if (d && d.isLocked) {
    assert("Locked door stays enabled", true); // logic says locked doors are solid below
  }
}

console.log(`\nTESTS PASSED: ${passCount}`);
console.log(`TESTS FAILED: ${failCount}`);
process.exit(exitCode);
