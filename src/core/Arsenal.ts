import * as THREE from 'three';
import { SoundManager } from '../audio/SoundManager';

export type WeaponType = 'unarmed' | 'knife' | 'pistol';

export class Arsenal {
  private currentWeapon: WeaponType = 'unarmed';
  private pistolAmmo = 2; // 2 rounds max
  private hasPistol = false;
  private hasKnife = false;
  private weaponMesh: THREE.Group;
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.weaponMesh = new THREE.Group();
    this.camera.add(this.weaponMesh);
    this.updateWeaponVisual();
  }

  public getWeapon(): WeaponType {
    return this.currentWeapon;
  }

  public getPistolAmmo(): number {
    return this.pistolAmmo;
  }

  public unlockPistol(): void {
    this.hasPistol = true;
    this.equip('pistol');
  }

  public unlockKnife(): void {
    this.hasKnife = true;
    this.equip('knife');
  }

  public ownsPistol(): boolean {
    return this.hasPistol;
  }

  public ownsKnife(): boolean {
    return this.hasKnife;
  }

  // Put the pistol away (e.g. back in the gun safe)
  public removePistol(): void {
    this.hasPistol = false;
    if (this.currentWeapon === 'pistol') {
      this.currentWeapon = this.hasKnife ? 'knife' : 'unarmed';
      this.updateWeaponVisual();
    }
  }

  public equip(type: WeaponType): void {
    if (type === 'pistol' && !this.hasPistol) return;
    if (type === 'knife' && !this.hasKnife) return;
    this.currentWeapon = type;
    this.updateWeaponVisual();
  }

  public switchNext(): void {
    const weapons: WeaponType[] = ['unarmed'];
    if (this.hasKnife) weapons.push('knife');
    if (this.hasPistol) weapons.push('pistol');

    const idx = weapons.indexOf(this.currentWeapon);
    const nextIdx = (idx + 1) % weapons.length;
    this.equip(weapons[nextIdx]);
  }

  // Create procedural low-poly 3D models for held weapons
  private updateWeaponVisual(): void {
    // Clear previous meshes
    while (this.weaponMesh.children.length > 0) {
      this.weaponMesh.remove(this.weaponMesh.children[0]);
    }

    if (this.currentWeapon === 'knife') {
      const knifeGroup = new THREE.Group();
      // Handle
      const handleGeo = new THREE.BoxGeometry(0.04, 0.12, 0.04);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x1f140e });
      const handle = new THREE.Mesh(handleGeo, handleMat);

      // Blade
      const bladeGeo = new THREE.BoxGeometry(0.02, 0.22, 0.04);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.15;

      knifeGroup.add(handle);
      knifeGroup.add(blade);

      knifeGroup.position.set(0.25, -0.22, -0.4);
      knifeGroup.rotation.set(0.2, -0.3, 0);
      this.weaponMesh.add(knifeGroup);
    } else if (this.currentWeapon === 'pistol') {
      const pistolGroup = new THREE.Group();
      // Grip
      const gripGeo = new THREE.BoxGeometry(0.05, 0.12, 0.06);
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const grip = new THREE.Mesh(gripGeo, gripMat);
      grip.rotation.x = 0.2;

      // Barrel / Slide
      const barrelGeo = new THREE.BoxGeometry(0.05, 0.06, 0.22);
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(0, 0.07, -0.06);

      pistolGroup.add(grip);
      pistolGroup.add(barrel);

      pistolGroup.position.set(0.22, -0.2, -0.38);
      pistolGroup.rotation.set(0.1, -0.15, 0);
      this.weaponMesh.add(pistolGroup);
    }
  }

  // Attack action
  public attack(onNoise: (noiseAmount: number) => void): { hit: boolean; weaponUsed: WeaponType } {
    if (this.currentWeapon === 'unarmed') {
      return { hit: false, weaponUsed: 'unarmed' };
    }

    if (this.currentWeapon === 'knife') {
      SoundManager.getInstance().playKnifeSlash();
      // Quick swing visual animation
      this.animateKnifeSwing();
      return { hit: true, weaponUsed: 'knife' };
    }

    if (this.currentWeapon === 'pistol') {
      if (this.pistolAmmo <= 0) {
        // Empty click sound
        SoundManager.getInstance().playLampClick();
        return { hit: false, weaponUsed: 'pistol' };
      }

      this.pistolAmmo--;
      SoundManager.getInstance().playGunshot();
      // Gunfire adds +30 noise
      onNoise(30);
      this.animatePistolRecoil();
      return { hit: true, weaponUsed: 'pistol' };
    }

    return { hit: false, weaponUsed: 'unarmed' };
  }

  private animateKnifeSwing(): void {
    const origZ = this.weaponMesh.rotation.z;
    this.weaponMesh.rotation.z -= 0.6;
    setTimeout(() => {
      this.weaponMesh.rotation.z = origZ;
    }, 150);
  }

  private animatePistolRecoil(): void {
    const origX = this.weaponMesh.rotation.x;
    this.weaponMesh.rotation.x += 0.4;
    setTimeout(() => {
      this.weaponMesh.rotation.x = origX;
    }, 120);
  }
}
