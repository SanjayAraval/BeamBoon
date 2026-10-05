import * as THREE from 'three';
import { House, Collider } from './src/world/House';
import { npcLayout } from './src/world/npcLayout';
import { createCharacter, CharacterKind } from './src/world/characters';
import { houseLayout } from './src/world/houseLayout';

// Unlock doors so we don't accidentally block raycasts? Wait, door blocks peephole?
// The camera is OUTSIDE the door, so the door is BEHIND the camera.
for (const door of houseLayout.doors) {
  door.locked = false;
}

// Mock document for headless mode
if (typeof document === 'undefined') {
  (global as any).document = {
    createElement: () => ({
      getContext: () => ({ 
        createRadialGradient: () => ({ addColorStop: () => {} }), 
        createLinearGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        arc: () => {},
        fill: () => {},
        bezierCurveTo: () => {},
        strokeRect: () => {}
      }),
      width: 0, height: 0
    })
  };
}

const scene = new THREE.Scene();
const house = new House(scene);

let allPass = true;
function assert(name: string, condition: boolean) {
  if (condition) {
    console.log(`PASS: ${name}`);
  } else {
    console.log(`FAIL: ${name}`);
    allPass = false;
  }
}

console.log('Testing peephole camera setup...');

const peepholePos = new THREE.Vector3(7.4, 1.55, 12.06); // 12.0 + 0.06 to be on outside surface
const peepholeCam = new THREE.PerspectiveCamera(110, 16/9, 0.1, 100);
peepholeCam.position.copy(peepholePos);
peepholeCam.lookAt(peepholePos.clone().add(new THREE.Vector3(0, 0, 1)));
peepholeCam.updateMatrixWorld();
peepholeCam.updateProjectionMatrix();

// 1. Position on door plane
assert('Camera is on the front door plane facing the porch', peepholeCam.position.x === 7.4 && peepholeCam.position.z >= 12.0);

// 2. Frustum test
const frustum = new THREE.Frustum();
frustum.setFromProjectionMatrix(
  new THREE.Matrix4().multiplyMatrices(peepholeCam.projectionMatrix, peepholeCam.matrixWorldInverse)
);

const visitorKinds: CharacterKind[] = ['neighbour', 'officer', 'partner'];
const porchPos = new THREE.Vector3(7.4, 0, 12.6);

for (const kind of visitorKinds) {
  const char = createCharacter(kind);
  char.root.position.copy(porchPos);
  char.root.updateMatrixWorld(true);
  
  // Head point: y = height
  const headPos = new THREE.Vector3(7.4, char.height, 12.6);
  // Chest point: y = height * 0.7
  const chestPos = new THREE.Vector3(7.4, char.height * 0.7, 12.6);
  
  const headVisible = frustum.containsPoint(headPos);
  const chestVisible = frustum.containsPoint(chestPos);
  
  assert(`Visitor ${kind} head/chest is inside peephole frustum`, headVisible && chestVisible);
}

// 3. Raycast against colliders
const rayDir = new THREE.Vector3(0, 0, 1);
const raycaster = new THREE.Raycaster(peepholePos, rayDir);
let blocked = false;
for (const c of house.collisionBoxes) {
  if (!c.enabled) continue;
  if (c.box.containsPoint(peepholePos)) continue; // Don't hit the door we are inside
  
  const target = new THREE.Vector3(7.4, 1.55, 12.6);
  const ray = new THREE.Ray(peepholePos, rayDir);
  const boxTarget = new THREE.Vector3();
  if (ray.intersectBox(c.box, boxTarget)) {
    // Is it between camera and visitor?
    if (peepholePos.distanceTo(boxTarget) < peepholePos.distanceTo(target)) {
       blocked = true;
       console.log(`Blocked by collider:`, c.box);
    }
  }
}
assert('No colliders between peephole and visitor', !blocked);

// 5. The real PeepholeManager must still face the porch after update() runs
{
  const g = globalThis as any;
  g.window = g.window || {};
  g.window.addEventListener = g.window.addEventListener || (() => {});
  g.window.innerWidth = g.window.innerWidth || 1280;
  g.window.innerHeight = g.window.innerHeight || 720;
  const { PeepholeManager } = await import('./src/world/PeepholeManager');
  const mockPlayer = { setFrozen: () => {}, getCamera: () => new THREE.PerspectiveCamera() } as any;
  const pm = new PeepholeManager(mockPlayer, { show: () => {}, hide: () => {} } as any);
  pm.enter({ setCamera: () => {} });
  pm.update(0.016, 0);
  const cam = pm.getCamera();
  cam.updateMatrixWorld();
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  assert('PeepholeManager camera faces the porch (+Z) after update()', dir.z > 0.9);
}

if (!allPass) process.exit(1);
console.log('=== PEEPHOLE TESTS PASSED ===');
