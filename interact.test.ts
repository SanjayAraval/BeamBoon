import * as THREE from 'three';
import { InteractionSystem } from './src/game/InteractionSystem';
import { Collider } from './src/world/House';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`PASS: ${msg}`);
    passCount++;
  } else {
    console.error(`FAIL: ${msg}`);
    failCount++;
  }
}

// Mock HUD
const hud = {
  showInteractionPrompt: (t: string) => {},
  hideInteractionPrompt: () => {},
  flashInteractionPrompt: (t: string) => {}
} as any;

const scene = new THREE.Scene();
const system = new InteractionSystem(scene, hud);

const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
// Camera at (0, 0, 0) looking at (0, 0, -1)
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, -1);
camera.updateMatrixWorld();

// 1. Register a lamp
let lampToggled = false;
system.register({
  id: 'lamp_1',
  position: new THREE.Vector3(0, 0, -1), // 1m away
  promptText: () => 'Toggle lamp',
  onInteract: () => { lampToggled = true; }
});

const colliders: Collider[] = [];

// Frame 1: looking at lamp
scene.updateMatrixWorld(true);
system.update(camera, camera.position, colliders, 0);
assert((system as any).focused?.id === 'lamp_1', 'Lamp is targeted when looking at it from 1m');

// Frame 2: look 90 degrees away
camera.lookAt(1, 0, 0); // look right
camera.updateMatrixWorld(true);
scene.updateMatrixWorld(true);
system.update(camera, camera.position, colliders, 0);
assert((system as any).focused === null, 'Lamp is NOT targeted when looking 90 degrees away');

// Frame 3: look at it again, but blocked by wall
camera.lookAt(0, 0, -1);
camera.updateMatrixWorld(true);
const wallBox = new THREE.Box3(
  new THREE.Vector3(-0.5, -1, -0.5),
  new THREE.Vector3(0.5, 1, -0.2) // Wall is at z: -0.5 to -0.2
);
colliders.push({ box: wallBox, level: 0, enabled: true });

system.update(camera, camera.position, colliders, 0);
assert((system as any).focused === null, 'Lamp is NOT targeted through a wall');

// Clear colliders
colliders.length = 0;

// Register second overlapping interactable
system.register({
  id: 'lamp_2',
  position: new THREE.Vector3(0, 0, -0.8), // closer!
  promptText: () => 'Toggle lamp 2',
  onInteract: () => {}
});
scene.updateMatrixWorld(true);

system.update(camera, camera.position, colliders, 0);
assert((system as any).focused?.id === 'lamp_2', 'Only the nearest overlapping interactable is focused');

// Test E with no focus
camera.lookAt(1, 0, 0); // look away again, so focus is null
camera.updateMatrixWorld(true);
system.update(camera, camera.position, colliders, 0);

lampToggled = false;
system.interact(); // E pressed
assert(lampToggled === false, 'Pressing E with no focus calls nothing');

// Test E with focus
camera.lookAt(0, 0, -1);
camera.updateMatrixWorld(true);
system.update(camera, camera.position, colliders, 0);

// Should focus lamp_2, but let's hide lamp_2 by placing it out of view, so lamp_1 is focused again
const lamp2 = (system as any).hitMeshesGroup.children.find((c: any) => c.userData.interactable.id === 'lamp_2');
if (lamp2) lamp2.position.set(100, 100, 100);
scene.updateMatrixWorld(true);

system.update(camera, camera.position, colliders, 0);
system.interact(); // Should trigger lamp_1
assert(lampToggled === true, 'Toggling a lamp changes its state via onInteract');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log("=== INTERACTION TESTS PASSED ===");
}
