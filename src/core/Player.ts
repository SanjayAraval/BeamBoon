import * as THREE from 'three';

export class Player {
  private camera: THREE.PerspectiveCamera;
  public skipHold = false;
  public onSetFlashlight?: (on: boolean) => void;

  public setFlashlight(on: boolean): void {
    if (this.onSetFlashlight) this.onSetFlashlight(on);
  }

  public isSkipHeld(): boolean {
    return this.skipHold;
  }

  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;

  // isLocked mirrors pointer lock; frozen is set by game logic (cutscenes, peephole)
  private isLocked = false;
  private frozen = false;
  private mouseSensitivity = 0.002;
  private enableHeadBob = true;

  private lastMouseX = 0;
  private lastMouseY = 0;

  private velocityY = 0;
  private pitch = 0;
  private yaw = 0;

  private headBobTimer = 0;
  
  private colliders: { box: THREE.Box3, level: number | 'both', enabled: boolean }[] = [];

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  public setMouseSensitivity(sens: number): void {
    this.mouseSensitivity = sens * 0.0004;
  }

  public setHeadBob(enabled: boolean): void {
    this.enableHeadBob = enabled;
  }

  public setColliders(colliders: { box: THREE.Box3, level: number | 'both', enabled: boolean }[]): void {
    this.colliders = colliders;
  }

  public lockPointer(): void {
    const canvas = document.getElementById('webgl-canvas');
    if (canvas) canvas.requestPointerLock();
  }

  public setLocked(locked: boolean): void {
    this.isLocked = locked;
  }

  public setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    if (frozen) {
      this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = false;
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') this.skipHold = true;
    if (!this.isLocked || this.frozen) return;
    switch (e.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyD': this.moveRight = true; break;
    }
  };

  public getKeyStates(): string {
    const keys = [];
    if (this.moveForward) keys.push('W');
    if (this.moveBackward) keys.push('S');
    if (this.moveLeft) keys.push('A');
    if (this.moveRight) keys.push('D');
    return keys.length > 0 ? keys.join(',') : 'NONE';
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'Space': this.skipHold = false; break;
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyD': this.moveRight = false; break;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isLocked || this.frozen) return;

    if (document.pointerLockElement !== null) {
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;
    } else {
      if (this.lastMouseX !== 0 || this.lastMouseY !== 0) {
        this.yaw -= (e.clientX - this.lastMouseX) * this.mouseSensitivity;
        this.pitch -= (e.clientY - this.lastMouseY) * this.mouseSensitivity;
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }

    const maxPitch = Math.PI / 2 - 0.08;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    this.updateCameraRotation();
  };

  private updateCameraRotation(): void {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);
  }

  private getGroundHeight(x: number, z: number, feetY: number): number {
    let groundHeight = 0; // default to ground level 0
    const currentFloorLevel = feetY >= 1.5 ? 1 : 0;
    const offsets = [
      { dx: 0, dz: 0 },
      { dx: 0.3, dz: 0 },
      { dx: -0.3, dz: 0 },
      { dx: 0, dz: 0.3 },
      { dx: 0, dz: -0.3 }
    ];

    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (c.level !== 'both' && c.level !== currentFloorLevel && c.level !== currentFloorLevel - 1) continue;
      const box = c.box;
      if (box.max.y > feetY + 0.45) continue;
      
      for (const off of offsets) {
        const sx = x + off.dx;
        const sz = z + off.dz;
        if (sx >= box.min.x && sx <= box.max.x && sz >= box.min.z && sz <= box.max.z) {
          groundHeight = Math.max(groundHeight, box.max.y);
          break; // found highest for this box, move to next box
        }
      }
    }
    return groundHeight;
  }

  public update(delta: number, paranoia: number, onFootstep: () => void): void {
    if (!this.isLocked || this.frozen) return;

    const speed = 3.5;
    const moveDir = new THREE.Vector3();
    if (this.moveForward) moveDir.z -= 1;
    if (this.moveBackward) moveDir.z += 1;
    if (this.moveLeft) moveDir.x -= 1;
    if (this.moveRight) moveDir.x += 1;
    moveDir.normalize();
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const oldPos = this.camera.position.clone();
    
    // Head bob offset should be stripped to get actual feet Y
    let currentBobY = 0;
    if (this.enableHeadBob && moveDir.lengthSq() > 0) {
      currentBobY = Math.sin(this.headBobTimer) * 0.05;
    }
    const feetY = oldPos.y - 1.6 - currentBobY;

    const targetX = oldPos.x + moveDir.x * speed * delta;
    const targetZ = oldPos.z + moveDir.z * speed * delta;

    // Apply gravity
    this.velocityY -= 9.8 * delta;
    let nextFeetY = feetY + this.velocityY * delta;

    // Resolve Y
    const groundY = this.getGroundHeight(targetX, targetZ, feetY);
    if (nextFeetY <= groundY + 0.05) { // snap to ground
      nextFeetY = groundY;
      this.velocityY = 0;
    }

    // Resolve X and Z collisions
    const currentFloorLevel = nextFeetY >= 2.0 ? 1 : 0;
    const colliders = this.colliders.filter(c => {
       if (!c.enabled) return false;
       if (c.level !== 'both' && c.level !== currentFloorLevel) return false;
       // Skip colliders at or below step-up height (walkable surfaces, not walls)
       if (c.box.max.y <= nextFeetY + 0.45) return false;
       return true;
    });

    const playerRadius = 0.35;
    const checkCollision = (cx: number, cz: number) => {
       const pBox = new THREE.Box3(
         new THREE.Vector3(cx - playerRadius, nextFeetY + 0.1, cz - playerRadius),
         new THREE.Vector3(cx + playerRadius, nextFeetY + 1.5, cz + playerRadius)
       );
       for (const c of colliders) {
         if (c.box.intersectsBox(pBox)) return true;
       }
       return false;
    };

    let finalX = targetX;
    let finalZ = targetZ;

    if (checkCollision(finalX, oldPos.z)) finalX = oldPos.x;
    if (checkCollision(finalX, finalZ)) finalZ = oldPos.z;

    // Safety push-out
    const finalBox = new THREE.Box3(
      new THREE.Vector3(finalX - playerRadius, nextFeetY + 0.1, finalZ - playerRadius),
      new THREE.Vector3(finalX + playerRadius, nextFeetY + 1.5, finalZ + playerRadius)
    );
    for (const c of colliders) {
      if (c.box.intersectsBox(finalBox)) {
        const boxCenter = new THREE.Vector3();
        c.box.getCenter(boxCenter);
        const dir = new THREE.Vector2(finalX - boxCenter.x, finalZ - boxCenter.z).normalize();
        if (dir.lengthSq() === 0) dir.set(1, 0);
        finalX += dir.x * 0.05;
        finalZ += dir.y * 0.05;
      }
    }

    // Animation & Bob
    const isMoving = (Math.abs(finalX - oldPos.x) > 0.001 || Math.abs(finalZ - oldPos.z) > 0.001);
    if (isMoving) {
      this.headBobTimer += delta * 10;
      if (Math.sin(this.headBobTimer) < -0.95) {
        onFootstep();
      }
    }

    let bobY = 0;
    let swayRoll = 0;
    if (this.enableHeadBob && isMoving) {
      bobY = Math.sin(this.headBobTimer) * 0.05;
    }
    if (paranoia >= 70) {
      swayRoll = Math.sin(Date.now() * 0.003) * 0.04;
    }

    this.camera.position.set(finalX, nextFeetY + 1.6 + bobY, finalZ);

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    euler.z = swayRoll;
    this.camera.quaternion.setFromEuler(euler);
  }

  public getPosition(): THREE.Vector3 {
    return this.camera.position;
  }
  
  public getFloor(): number {
    return this.camera.position.y >= 3.0 ? 1 : 0;
  }

  public setLook(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.updateCameraRotation();
  }

  public getLook(): { yaw: number; pitch: number } {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  public setYaw(yaw: number): void {
    this.yaw = yaw;
    this.updateCameraRotation();
  }

  public setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.velocityY = 0;
  }

  public getForwardVector(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}
