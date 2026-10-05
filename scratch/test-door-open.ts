import { houseLayout } from './src/world/houseLayout';
import * as THREE from 'three';

const DoorThickness = 0.12;

for (const d of houseLayout.doors) {
  if (d.isArchway) continue;

  const isX = d.axis === 'x';
  let hx = d.x;
  let hz = d.z;
  if (isX) hx += d.hingeOffset;
  if (!isX) hz += d.hingeOffset;
  
  const sign = Math.sign(d.hingeOffset) < 0 ? 1 : -1;
  const closedAngle = isX ? 0 : -Math.PI / 2;
  
  let openAngle = d.openAngle;
  if (!isX) {
    if (d.id === 'door_study') openAngle = 0;
    if (d.id === 'door_powder') openAngle = -Math.PI;
    if (d.id === 'door_player_bed') openAngle = -Math.PI;
    if (d.id === 'door_master_bed') openAngle = 0;
    if (d.id === 'door_bathroom') openAngle = -Math.PI;
    if (d.id === 'door_spare') openAngle = 0;
  }
  
  const pivot = new THREE.Group();
  pivot.position.set(hx, 0, hz);
  pivot.rotation.y = openAngle;
  
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(d.width, d.height, DoorThickness));
  mesh.position.set(sign * d.width / 2, d.height / 2, 0);
  pivot.add(mesh);
  pivot.updateMatrixWorld(true);
  
  const openBox = new THREE.Box3().setFromObject(mesh);
  console.log(`${d.name} Fixed Open Box: min[${openBox.min.x.toFixed(2)}, ${openBox.min.z.toFixed(2)}] max[${openBox.max.x.toFixed(2)}, ${openBox.max.z.toFixed(2)}]`);
}
