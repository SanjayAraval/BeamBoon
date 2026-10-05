import { houseLayout } from './src/world/houseLayout';
import * as THREE from 'three';

// 1. Build a simple test script that does the logic
// 2. See if the doors pass after we fix houseLayout.ts

const WallThickness = 0.2;
const DoorThickness = 0.12;

console.log("=== DOOR DIAGNOSTICS ===");
for (const d of houseLayout.doors) {
  if (d.isArchway) continue;

  const isX = d.axis === 'x';
  let hx = d.x;
  let hz = d.z;
  if (isX) hx += d.hingeOffset;
  if (!isX) hz += d.hingeOffset;
  
  const sign = Math.sign(d.hingeOffset) < 0 ? 1 : -1;
  
  // closedAngle fix test
  // If isX, closedAngle should be 0.
  // If !isX, closedAngle should be -Math.PI / 2.
  const closedAngle = isX ? 0 : -Math.PI / 2;
  
  const pivot = new THREE.Group();
  pivot.position.set(hx, 0, hz);
  pivot.rotation.y = closedAngle;
  
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(d.width, d.height, DoorThickness));
  mesh.position.set(sign * d.width / 2, d.height / 2, 0);
  pivot.add(mesh);
  pivot.updateMatrixWorld(true);
  
  const closedBox = new THREE.Box3().setFromObject(mesh);
  console.log(`${d.name} Fixed Closed Box: min[${closedBox.min.x.toFixed(2)}, ${closedBox.min.z.toFixed(2)}] max[${closedBox.max.x.toFixed(2)}, ${closedBox.max.z.toFixed(2)}]`);
}
