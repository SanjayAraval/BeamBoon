import * as THREE from 'three';
import { Player } from '../core/Player';
import { PeepholeUI } from '../ui/PeepholeUI';

export class PeepholeManager {
  private active = false;
  private camera: THREE.PerspectiveCamera;
  private player: Player;
  private peepholeUI: PeepholeUI;
  private pitch = 0;
  private yaw = 0;
  private readonly MAX_LOOK = Math.PI / 16; // About 11 degrees
  private basePosition = new THREE.Vector3(7.4, 1.55, 12.06);

  constructor(player: Player, peepholeUI: PeepholeUI) {
    this.player = player;
    this.peepholeUI = peepholeUI;
    
    // Create peephole camera with 110 FOV
    this.camera = new THREE.PerspectiveCamera(110, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.basePosition.clone().add(new THREE.Vector3(0, 0, 1)));
    
    // Add mouse move listener
    window.addEventListener('mousemove', this.onMouseMove);
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.active) return;
    
    const sens = 0.002;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens;
    
    this.yaw = Math.max(-this.MAX_LOOK, Math.min(this.MAX_LOOK, this.yaw));
    this.pitch = Math.max(-this.MAX_LOOK, Math.min(this.MAX_LOOK, this.pitch));
  };

  public enter(flashlight: any): void {
    this.active = true;
    this.player.setFrozen(true); // stop WASD / mouse look on the player camera
    this.peepholeUI.show();
    this.yaw = 0;
    this.pitch = 0;
    flashlight.setCamera(this.camera);
  }

  public exit(flashlight: any): void {
    this.active = false;
    this.player.setFrozen(false);
    this.peepholeUI.hide();
    flashlight.setCamera(this.player.getCamera());
  }

  public isActive(): boolean {
    return this.active;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public update(delta: number, time: number): void {
    if (!this.active) return;

    // Tiny idle sway
    const swayX = Math.sin(time * 1.5) * 0.005;
    const swayY = Math.cos(time * 1.2) * 0.005;

    this.camera.position.copy(this.basePosition);
    
    const euler = new THREE.Euler(this.pitch + swayY, this.yaw + swayX, 0, 'YXZ');
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    
    // Cameras look down -Z by default; turn 180 degrees so the peephole faces the porch (+Z)
    const baseQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    this.camera.quaternion.copy(baseQuat).multiply(quaternion);
  }
}
