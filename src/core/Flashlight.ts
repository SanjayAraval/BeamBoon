import * as THREE from 'three';

export class Flashlight {
  private spotLight: THREE.SpotLight;
  private targetObject: THREE.Object3D;
  private isOn = true;
  private baseIntensity = 6.0;
  private baseDistance = 18;
  private camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera;

    // Create primary SpotLight following camera
    this.spotLight = new THREE.SpotLight(0xfff1d0, this.baseIntensity);
    this.spotLight.angle = 0.45; // ~26 degrees cone
    this.spotLight.penumbra = 0.6;
    this.spotLight.decay = 1.6;
    this.spotLight.distance = this.baseDistance;

    // Shadow configuration
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.spotLight.shadow.camera.near = 0.2;
    this.spotLight.shadow.camera.far = 20;
    this.spotLight.shadow.bias = -0.001;

    this.targetObject = new THREE.Object3D();
    this.camera.add(this.spotLight);
    this.spotLight.position.set(0, 0, 0);
    scene.add(this.targetObject);
    this.spotLight.target = this.targetObject;
  }

  public setShadowResolution(res: number): void {
    this.spotLight.shadow.mapSize.width = res;
    this.spotLight.shadow.mapSize.height = res;
    if (this.spotLight.shadow.map) {
      this.spotLight.shadow.map.dispose();
      this.spotLight.shadow.map = null as any;
    }
  }

  public toggle(): boolean {
    this.isOn = !this.isOn;
    this.spotLight.visible = this.isOn;
    return this.isOn;
  }

  public isTurnedOn(): boolean {
    return this.isOn;
  }

  public update(delta: number, paranoia: number): void {
    // Calculate look direction 5 meters ahead for target
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.camera.getWorldPosition(this.targetObject.position);
    this.targetObject.position.add(dir.multiplyScalar(5));

    if (!this.isOn) {
      this.spotLight.intensity = 0;
      return;
    }

    // Flashlight flicker & range shortening at >= 70 Paranoia
    if (paranoia >= 70) {
      const flicker = Math.random() > 0.3 ? 1.0 : Math.random() * 0.4;
      this.spotLight.intensity = this.baseIntensity * flicker;
      this.spotLight.distance = 8 + Math.random() * 2;
    } else {
      this.spotLight.intensity = this.baseIntensity;
      this.spotLight.distance = this.baseDistance;
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.spotLight.position;
  }

  // Half-angle of the beam cone (radians) and how far it reaches
  public getConeAngle(): number {
    return this.spotLight.angle;
  }

  public getRange(): number {
    return this.spotLight.distance;
  }

  public getDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  public setCamera(newCamera: THREE.Camera): void {
    this.camera.remove(this.spotLight);
    this.camera = newCamera;
    this.camera.add(this.spotLight);
  }
}
