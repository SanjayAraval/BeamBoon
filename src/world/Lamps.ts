import * as THREE from 'three';
import { SoundManager } from '../audio/SoundManager';

export interface RoomLamp {
  id: string;
  name: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  light: THREE.PointLight;
  isOn: boolean;
}

export class LampManager {
  private lamps: RoomLamp[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addLamp(id: string, name: string, pos: THREE.Vector3): RoomLamp {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Lamp Base
    const baseGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.08, 12);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    group.add(base);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
    const pole = new THREE.Mesh(poleGeo, baseMat);
    pole.position.y = 0.44;
    group.add(pole);

    // Shade
    const shadeGeo = new THREE.CylinderGeometry(0.18, 0.28, 0.35, 12, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0xffeeaa, side: THREE.DoubleSide });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.y = 0.85;
    group.add(shade);

    // Light Source
    const light = new THREE.PointLight(0xffeedd, 0, 8); // 0 intensity initially
    light.position.set(pos.x, pos.y + 0.8, pos.z);
    this.scene.add(light);
    this.scene.add(group);

    const lamp: RoomLamp = {
      id,
      name,
      position: pos,
      mesh: group,
      light,
      isOn: false
    };

    this.lamps.push(lamp);
    return lamp;
  }

  public toggleLamp(id: string): boolean {
    const lamp = this.lamps.find(l => l.id === id);
    if (!lamp) return false;

    lamp.isOn = !lamp.isOn;
    lamp.light.intensity = lamp.isOn ? 2.5 : 0;
    SoundManager.getInstance().playLampClick();
    return lamp.isOn;
  }

  public isRoomLit(playerPos: THREE.Vector3): boolean {
    for (const lamp of this.lamps) {
      if (lamp.isOn) {
        const dist = lamp.position.distanceTo(playerPos);
        if (dist < 5.5) return true;
      }
    }
    return false;
  }

  public getLamps(): RoomLamp[] {
    return this.lamps;
  }
}
