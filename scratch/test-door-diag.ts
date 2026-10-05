import { houseLayout } from './src/world/houseLayout';
import * as THREE from 'three';

const WallThickness = 0.2;
const DoorThickness = 0.12;

console.log("=== DOOR DIAGNOSTICS ===");
for (const d of houseLayout.doors) {
  if (d.isArchway) continue;

  const isX = d.axis === 'x';
  const doorWidth = d.width;
  
  let hx = d.x;
  let hz = d.z;
  if (isX) hx += d.hingeOffset;
  if (!isX) hz += d.hingeOffset;
  
  const sign = Math.sign(d.hingeOffset) < 0 ? 1 : -1;
  
  console.log(`Door: ${d.name}`);
  console.log(` - wall thickness: ${WallThickness}`);
  console.log(` - door slab thickness: ${DoorThickness}`);
  console.log(` - doorway opening: width ${d.width}, height ${d.height}`);
  console.log(` - door slab: width ${d.width}, height ${d.height}`);
  console.log(` - hinge pivot: x=${hx}, z=${hz}, offsetSide=${d.hingeOffset < 0 ? 'negative' : 'positive'}`);
  console.log(` - closed rot: ${(d.closedAngle * 180 / Math.PI).toFixed(1)}°, open rot: ${(d.openAngle * 180 / Math.PI).toFixed(1)}°`);
  
  // Predict closed box
  const pivot = new THREE.Group();
  pivot.position.set(hx, 0, hz);
  pivot.rotation.y = d.closedAngle;
  
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(d.width, d.height, DoorThickness));
  mesh.position.set(sign * d.width / 2, d.height / 2, 0);
  pivot.add(mesh);
  pivot.updateMatrixWorld(true);
  
  const closedBox = new THREE.Box3().setFromObject(mesh);
  console.log(` - closed box: min[${closedBox.min.x.toFixed(2)}, ${closedBox.min.z.toFixed(2)}] max[${closedBox.max.x.toFixed(2)}, ${closedBox.max.z.toFixed(2)}]`);
  
  pivot.rotation.y = d.openAngle;
  pivot.updateMatrixWorld(true);
  const openBox = new THREE.Box3().setFromObject(mesh);
  console.log(` - open box: min[${openBox.min.x.toFixed(2)}, ${openBox.min.z.toFixed(2)}] max[${openBox.max.x.toFixed(2)}, ${openBox.max.z.toFixed(2)}]`);
  console.log("");
}
