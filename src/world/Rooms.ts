import * as THREE from 'three';

export interface RoomDefinition {
  name: string;
  bounds: THREE.Box3;
  center: THREE.Vector3;
}

export class Rooms {
  public static getRoomDefinitions(): RoomDefinition[] {
    return [
      {
        name: 'Living Room',
        bounds: new THREE.Box3(new THREE.Vector3(-4.5, 0, -4.5), new THREE.Vector3(0, 3, 0)),
        center: new THREE.Vector3(-2.25, 1.5, -2.25)
      },
      {
        name: 'Kitchen',
        bounds: new THREE.Box3(new THREE.Vector3(0, 0, -4.5), new THREE.Vector3(4.5, 3, 0)),
        center: new THREE.Vector3(2.25, 1.5, -2.25)
      },
      {
        name: 'Hallway',
        bounds: new THREE.Box3(new THREE.Vector3(-2, 0, 0), new THREE.Vector3(2, 3, 4.5)),
        center: new THREE.Vector3(0, 1.5, 2.25)
      },
      {
        name: 'Master Bedroom',
        bounds: new THREE.Box3(new THREE.Vector3(-4.5, 3, -4.5), new THREE.Vector3(0, 6, 0)),
        center: new THREE.Vector3(-2.25, 4.5, -2.25)
      },
      {
        name: 'Upstairs Hallway',
        bounds: new THREE.Box3(new THREE.Vector3(0, 3, -4.5), new THREE.Vector3(4.5, 6, 4.5)),
        center: new THREE.Vector3(2.25, 4.5, 0)
      }
    ];
  }
}
