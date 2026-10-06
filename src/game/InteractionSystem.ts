import * as THREE from 'three';
import { Collider } from '../world/House';
import { HUD } from '../ui/HUD';
import { SoundManager } from '../audio/SoundManager';

export interface Interactable {
  id: string;
  mesh?: THREE.Object3D;
  position?: THREE.Vector3;
  promptText: () => string;
  maxDistance?: number;
  canInteract?: () => { allowed: boolean; reason?: string };
  onInteract: () => void;
  hitMesh?: THREE.Mesh; 
  originalEmissive?: THREE.Color;
  materials?: THREE.MeshStandardMaterial[];
}

const WALL_TOLERANCE = 0.05;

export class InteractionSystem {
  private interactables: Interactable[] = [];
  private raycaster = new THREE.Raycaster();
  private focused: Interactable | null = null;
  private enabled = true;
  private hud: HUD;
  private hitMeshesGroup: THREE.Group;

  constructor(scene: THREE.Scene, hud: HUD) {
    this.hud = hud;
    this.hitMeshesGroup = new THREE.Group();
    scene.add(this.hitMeshesGroup);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!this.enabled) {
      this.clearFocus();
    }
  }

  public register(interactable: Interactable): void {
    interactable.maxDistance = interactable.maxDistance || 1.8;
    
    // Create hitMesh for forgiving aim
    if (interactable.mesh || interactable.position) {
      interactable.hitMesh = this.createHitMesh(interactable);
      this.hitMeshesGroup.add(interactable.hitMesh);
      
      // Store original emissive colors
      interactable.materials = [];
      if (interactable.mesh) {
        interactable.mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = (child as THREE.Mesh).material;
            if (Array.isArray(m)) {
              for (const mat of m) {
                if ((mat as THREE.MeshStandardMaterial).emissive) {
                  interactable.materials!.push(mat as THREE.MeshStandardMaterial);
                }
              }
            } else if ((m as THREE.MeshStandardMaterial).emissive) {
              interactable.materials!.push(m as THREE.MeshStandardMaterial);
            }
          }
        });
        if (interactable.materials.length > 0) {
          interactable.originalEmissive = interactable.materials[0].emissive.clone();
        }
      }
    }
    
    this.interactables.push(interactable);
  }

  public unregister(id: string): void {
    const idx = this.interactables.findIndex(i => i.id === id);
    if (idx === -1) return;
    const interactable = this.interactables[idx];
    if (this.focused === interactable) this.clearFocus();
    if (interactable.hitMesh) {
      this.hitMeshesGroup.remove(interactable.hitMesh);
      interactable.hitMesh.geometry.dispose();
      (interactable.hitMesh.material as THREE.Material).dispose();
    }
    this.interactables.splice(idx, 1);
  }

  private createHitMesh(interactable: Interactable): THREE.Mesh {
    let size = 0.5; // default lamp size
    if (interactable.id.includes('switch') || interactable.id.includes('peephole')) size = 0.25;
    if (interactable.id.includes('door') || interactable.id.includes('closet')) size = 1.0;

    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshBasicMaterial({ visible: false, depthTest: false }); // invisible
    const mesh = new THREE.Mesh(geo, mat);
    
    // Place hitmesh at mesh center or position
    if (interactable.mesh) {
      const box = new THREE.Box3().setFromObject(interactable.mesh);
      const center = new THREE.Vector3();
      box.getCenter(center);
      mesh.position.copy(center);
    } else if (interactable.position) {
      mesh.position.copy(interactable.position);
    }
    mesh.userData = { interactable };
    return mesh;
  }

  public update(camera: THREE.PerspectiveCamera, playerPos: THREE.Vector3, colliders: Collider[], floor: number): void {
    if (!this.enabled) {
      this.clearFocus();
      return;
    }

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // 1. Raycast colliders to find nearest wall blocking
    let nearestWallDist = Infinity;
    const ray = this.raycaster.ray;
    for (const c of colliders) {
      if (!c.enabled) continue;
      if (c.level !== 'both' && c.level !== floor) continue;
      
      const target = new THREE.Vector3();
      if (ray.intersectBox(c.box, target)) {
        const dist = camera.position.distanceTo(target);
        if (dist < nearestWallDist) {
          nearestWallDist = dist;
        }
      }
    }

    // 2. Raycast interactable hit meshes
    let nearestDist = Infinity;
    let nearestInteractable: Interactable | null = null;

    const hitObjects = this.hitMeshesGroup.children;
    const intersects = this.raycaster.intersectObjects(hitObjects, false);
    
    for (const intersect of intersects) {
      const obj = intersect.object;
      const interactable = obj.userData.interactable as Interactable;
      if (!interactable) continue;
      
      const dist = intersect.distance;
      if (dist <= (interactable.maxDistance || 1.8) && dist < nearestDist) {
        // Must be closer than wall. A solid interactable (the gun safe) is its own collider and
        // its hit box face sits at the same distance, so allow a hair of tolerance.
        if (dist < nearestWallDist + WALL_TOLERANCE) {
          nearestDist = dist;
          nearestInteractable = interactable;
        }
      }
    }
    
    if (this.focused !== nearestInteractable) {
      this.clearFocus();
      this.focused = nearestInteractable;
      if (this.focused) {
        this.highlight(this.focused, true);
        this.hud.showInteractionPrompt(`[E] ${this.focused.promptText()}`);
      }
    } else if (this.focused) {
       // Update prompt text in case state changed
       this.hud.showInteractionPrompt(`[E] ${this.focused.promptText()}`);
    }
  }

  // Something that moved (a dragged body): move where it can be aimed at
  public moveInteractable(id: string, pos: THREE.Vector3): void {
    const it = this.interactables.find(i => i.id === id);
    if (!it) return;
    it.position = pos.clone();
    if (it.hitMesh) {
      it.hitMesh.position.copy(pos);
      it.hitMesh.updateMatrixWorld(true);
    }
  }

  public hasFocus(): boolean {
    return this.enabled && this.focused !== null;
  }

  public interact(): void {
    if (!this.enabled || !this.focused) return;
    
    if (this.focused.canInteract) {
      const check = this.focused.canInteract();
      if (!check.allowed) {
        // Feedback blocked
        this.hud.flashInteractionPrompt(check.reason || 'Blocked');
        SoundManager.getInstance().playLampClick();
        return;
      }
    }
    
    this.focused.onInteract();
  }

  private clearFocus(): void {
    if (this.focused) {
      this.highlight(this.focused, false);
      this.hud.hideInteractionPrompt();
      this.focused = null;
    }
  }

  private highlight(interactable: Interactable, active: boolean): void {
    if (interactable.materials && interactable.originalEmissive) {
      for (const mat of interactable.materials) {
        if (active) {
          mat.emissive.copy(interactable.originalEmissive).add(new THREE.Color(0x333333));
        } else {
          mat.emissive.copy(interactable.originalEmissive);
        }
      }
    }
  }
}
