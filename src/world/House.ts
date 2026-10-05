import * as THREE from 'three';
import { Textures } from './Textures';
import { LightManager } from './LightManager';
import { Props, InteractiveProp } from './Props';
import { houseLayout } from './houseLayout';
import { propsLayout } from './propsLayout';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface DoorInstance {
  id: string;
  pivot: THREE.Group;
  collider: Collider;
  mesh: THREE.Mesh;
  isOpen: boolean;
  isLocked: boolean;
  openAngle: number;
  closedAngle: number;
}

export interface Collider {
  box: THREE.Box3;
  level: number | 'both';
  enabled: boolean;
  propId?: string;
}

export class House {
  public group: THREE.Group;
  public collisionBoxes: Collider[] = [];
  public interactiveProps: InteractiveProp[] = [];
  public animatedDoors: DoorInstance[] = [];
  public lightManager: LightManager;
  public curtainsMesh: THREE.Mesh;
  public isCurtainsClosed = false;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.lightManager = new LightManager(scene);

    this.buildFloorsAndCeilings();
    this.buildWalls();
    this.buildWindows();
    this.buildDoors();
    this.buildStaircase();
    this.buildOutside();
    this.curtainsMesh = new THREE.Mesh();
    this.buildProps();

    // Add switches from LightManager to interactive props
    const switches = this.lightManager.getSwitches();
    this.interactiveProps.push(...switches);
  }

  private buildFloorsAndCeilings(): void {
    const woodTex = Textures.getWoodFloor();
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 1.0 });

    for (const room of houseLayout.rooms) {
      const floorY = room.floor === 0 ? 0 : 3.0;

      if (room.name === 'Upstairs Hall') {
        const pieces = [
          { x1: 6, x2: 8.9, z1: 0, z2: 12 },
          { x1: 8.9, x2: 10, z1: 0, z2: 6.9 },
          { x1: 8.9, x2: 10, z1: 11.5, z2: 12 }
        ];
        for (const p of pieces) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.x2 - p.x1, 0.2, p.z2 - p.z1), woodMat);
          mesh.position.set(p.x1 + (p.x2 - p.x1) / 2, floorY - 0.1, p.z1 + (p.z2 - p.z1) / 2);
          mesh.receiveShadow = true;
          this.group.add(mesh);
          mesh.updateMatrixWorld(true);
          this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(mesh), level: room.floor, enabled: true });
        }

        const ceil = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 12), ceilingMat);
        ceil.position.set(8, 5.9, 6);
        this.group.add(ceil);
      } else {
        const w = room.xMax - room.xMin;
        const d = room.zMax - room.zMin;
        const cx = room.xMin + w / 2;
        const cz = room.zMin + d / 2;

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), woodMat);
        mesh.position.set(cx, floorY - 0.1, cz);
        mesh.receiveShadow = true;
        this.group.add(mesh);
        mesh.updateMatrixWorld(true);
        this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(mesh), level: room.floor, enabled: true });

        if (room.floor === 1) {
          const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), ceilingMat);
          ceil.position.set(cx, 5.9, cz);
          this.group.add(ceil);
        }
      }
    }
  }

  private buildWalls(): void {
    const wallTex = Textures.getWallpaper();
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });

    for (const w of houseLayout.walls) {
      const isX = w.z1 === w.z2;
      const floorY = w.floor === 0 ? 0 : 3.0;
      const H = 2.8;

      const minCoord = isX ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2);
      const maxCoord = isX ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2);
      const fixedCoord = isX ? w.z1 : w.x1;
      const L = maxCoord - minCoord;

      interface Cut { sMin: number; sMax: number; yMin: number; yMax: number; }
      const cuts: Cut[] = [];

      for (const d of houseLayout.doors) {
        if (d.floor !== w.floor) continue;
        if (isX && d.axis === 'x' && Math.abs(d.z - fixedCoord) < 0.1) {
          if (d.x >= minCoord && d.x <= maxCoord) {
            cuts.push({ sMin: d.x - minCoord - d.width / 2, sMax: d.x - minCoord + d.width / 2, yMin: 0, yMax: d.height });
          }
        }
        if (!isX && d.axis === 'z' && Math.abs(d.x - fixedCoord) < 0.1) {
          if (d.z >= minCoord && d.z <= maxCoord) {
            cuts.push({ sMin: d.z - minCoord - d.width / 2, sMax: d.z - minCoord + d.width / 2, yMin: 0, yMax: d.height });
          }
        }
      }

      for (const win of houseLayout.windows) {
        if (win.floor !== w.floor) continue;
        if (isX && win.axis === 'x' && Math.abs(win.z - fixedCoord) < 0.1) {
          if (win.x >= minCoord && win.x <= maxCoord) {
            cuts.push({ sMin: win.x - minCoord - win.width / 2, sMax: win.x - minCoord + win.width / 2, yMin: win.yBottom, yMax: win.yBottom + win.height });
          }
        }
        if (!isX && win.axis === 'z' && Math.abs(win.x - fixedCoord) < 0.1) {
          if (win.z >= minCoord && win.z <= maxCoord) {
            cuts.push({ sMin: win.z - minCoord - win.width / 2, sMax: win.z - minCoord + win.width / 2, yMin: win.yBottom, yMax: win.yBottom + win.height });
          }
        }
      }

      cuts.sort((a, b) => a.sMin - b.sMin);

      let currentS = 0;
      const buildBox = (s1: number, s2: number, y1: number, y2: number) => {
        if (s2 <= s1) return;
        if (y2 <= y1) return;
        const width = s2 - s1;
        const height = y2 - y1;
        const geo = new THREE.BoxGeometry(isX ? width : 0.2, height, isX ? 0.2 : width);
        const mesh = new THREE.Mesh(geo, wallMat);

        const cx = isX ? minCoord + s1 + width / 2 : fixedCoord;
        const cz = isX ? fixedCoord : minCoord + s1 + width / 2;
        const cy = floorY + y1 + height / 2;

        mesh.position.set(cx, cy, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
        mesh.updateMatrixWorld(true);
        this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(mesh), level: w.floor, enabled: true });
      };

      for (const cut of cuts) {
        if (cut.sMin > currentS) buildBox(currentS, cut.sMin, 0, H);
        if (cut.yMin > 0) buildBox(Math.max(currentS, cut.sMin), cut.sMax, 0, cut.yMin);
        if (cut.yMax < H) buildBox(Math.max(currentS, cut.sMin), cut.sMax, cut.yMax, H);
        currentS = Math.max(currentS, cut.sMax);
      }
      if (currentS < L) {
        buildBox(currentS, L, 0, H);
      }
    }
  }

  private buildWindows(): void {
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, opacity: 1, transparent: true, roughness: 0.1 });
    for (const win of houseLayout.windows) {
      const isX = win.axis === 'x';
      const floorY = win.floor === 0 ? 0 : 3.0;
      const geo = new THREE.BoxGeometry(isX ? win.width : 0.1, win.height, isX ? 0.1 : win.width);
      const mesh = new THREE.Mesh(geo, glassMat);
      mesh.position.set(win.x, floorY + win.yBottom + win.height / 2, win.z);
      this.group.add(mesh);
      mesh.updateMatrixWorld(true);
      this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(mesh), level: win.floor, enabled: true });
    }
  }

  private buildDoors(): void {
    for (const d of houseLayout.doors) {
      if (d.isArchway) continue;

      const floorY = d.floor === 0 ? 0 : 3.0;
      let hx = d.x;
      let hz = d.z;
      if (d.axis === 'x') hx += d.hingeOffset;
      if (d.axis === 'z') hz += d.hingeOffset;

      const doorTex = Textures.getDoorTexture();
      const doorMat = new THREE.MeshStandardMaterial({ map: doorTex });
      const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(d.width, d.height, 0.12), doorMat);
      
      const sign = Math.sign(d.hingeOffset) < 0 ? 1 : -1;
      doorMesh.position.set(sign * d.width / 2, d.height / 2, 0);
      doorMesh.castShadow = true;

      const pivot = new THREE.Group();
      pivot.position.set(hx, floorY, hz);
      pivot.rotation.y = d.closedAngle;
      pivot.add(doorMesh);
      this.group.add(pivot);

      pivot.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(doorMesh);
      const colliderObj = { box, level: d.floor, enabled: true, propId: d.id };
      this.collisionBoxes.push(colliderObj);

      this.animatedDoors.push({ id: d.id, pivot, collider: colliderObj, mesh: doorMesh, isOpen: false, isLocked: d.locked, openAngle: d.openAngle, closedAngle: d.closedAngle });

      const centerPos = new THREE.Vector3();
      doorMesh.getWorldPosition(centerPos);

      this.interactiveProps.push({
        id: d.id,
        name: d.locked ? d.name + ' (Locked)' : d.name,
        mesh: doorMesh,
        interactionType: 'door',
        position: centerPos
      });
    }
  }

  public updateDoors(delta: number): void {
    const speed = 4.0;
    for (const door of this.animatedDoors) {
      const target = door.isOpen ? door.openAngle : door.closedAngle;
      door.pivot.rotation.y = THREE.MathUtils.lerp(door.pivot.rotation.y, target, delta * speed);
      door.pivot.updateMatrixWorld(true);
      
      door.collider.enabled = !door.isOpen;
      if (!door.isOpen) {
        door.collider.box.setFromObject(door.mesh);
      }
    }
  }

  private buildStaircase(): void {
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x241a14 });
    const { xMin, xMax, zMin, zMax, yBottom, yTop, steps } = houseLayout.stairs;
    const width = xMax - xMin;
    const height = yTop - yBottom;
    const run = Math.abs(zMax - zMin) / steps;
    const rise = height / steps;

    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(width, rise, run), stairMat);
      const zCenter = zMax - (i * run) - run / 2;
      const yCenter = yBottom + (i * rise) + rise / 2;
      step.position.set(xMin + width / 2, yCenter, zCenter);
      step.castShadow = true;
      step.receiveShadow = true;
      this.group.add(step);
      step.updateMatrixWorld(true);
      this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(step), level: 'both', enabled: true });
    }

    const railMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const wRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 11.5 - 6.9), railMat);
    wRail.position.set(8.9, 3.5, 6.9 + (11.5 - 6.9) / 2);
    this.group.add(wRail);
    wRail.updateMatrixWorld(true);
    this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(wRail), level: 'both', enabled: true });

    const sRail = new THREE.Mesh(new THREE.BoxGeometry(10 - 8.9, 1.0, 0.1), railMat);
    sRail.position.set(8.9 + (10 - 8.9) / 2, 3.5, 11.5);
    this.group.add(sRail);
    sRail.updateMatrixWorld(true);
    // South railing only blocks at upstairs level (ground-floor player enters stairs from the south)
    this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(sRail), level: 1, enabled: true });
  }

  private buildOutside(): void {
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x112211, roughness: 1.0 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    this.group.add(ground);

    const porchMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const porch = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 2.0), porchMat);
    porch.position.set(7.5, -0.1, 13.0);
    this.group.add(porch);
    porch.updateMatrixWorld(true);
    this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(porch), level: 0, enabled: true });

    const porchStep = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.1, 0.5), porchMat);
    porchStep.position.set(7.5, -0.15, 14.25);
    this.group.add(porchStep);
    porchStep.updateMatrixWorld(true);
    this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(porchStep), level: 0, enabled: true });

    const porchLight = new THREE.PointLight(0xffddaa, 1.5, 8);
    porchLight.position.set(7.4, 2.5, 12.5);
    this.group.add(porchLight);

    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const fence1 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 0.1), fenceMat);
    fence1.position.set(3, 0.4, 15);
    this.group.add(fence1);
    fence1.updateMatrixWorld(true);
    this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(fence1), level: 0, enabled: true });

    const fence2 = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 0.1), fenceMat);
    fence2.position.set(10.75, 0.4, 15);
    this.group.add(fence2);
    fence2.updateMatrixWorld(true);
    this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(fence2), level: 0, enabled: true });

    const streetMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const street = new THREE.Mesh(new THREE.PlaneGeometry(100, 6), streetMat);
    street.rotation.x = -Math.PI / 2;
    street.position.set(7, 0.01, 22);
    this.group.add(street);
  }

  private buildProps(): void {
    const roomGeoms: Record<string, THREE.BufferGeometry[]> = {};
    const chairInstData: any[] = [];

    const getPropHeight = (p: any): number => {
      const baseHeight = (p.floor === 1 ? 3.0 : 0.0) + p.h / 2;
      const rugOffset = p.type === 'plane' ? 0.01 : 0;
      if (!p.supportId) {
        return baseHeight + rugOffset;
      }
      const support = propsLayout.find(s => s.id === p.supportId);
      if (!support) return baseHeight + rugOffset;
      return getPropHeight(support) + support.h / 2 + p.h / 2 + rugOffset;
    };

    for (const p of propsLayout) {
      if (p.id.startsWith('chair_')) {
        chairInstData.push(p);
        continue;
      }

      const cy = getPropHeight(p);
      const matrix = new THREE.Matrix4();
      matrix.makeTranslation(p.x, cy, p.z);
      
      const rot = new THREE.Matrix4();
      if (p.facing === 'S') rot.makeRotationY(Math.PI);
      else if (p.facing === 'E') rot.makeRotationY(-Math.PI / 2);
      else if (p.facing === 'W') rot.makeRotationY(Math.PI / 2);
      
      matrix.multiply(rot);

      let detailedModel: THREE.Group | null = null;
      if (p.type === 'sofa') {
        detailedModel = Props.createSofa();
      } else if (p.type === 'tv') {
        detailedModel = Props.createTV().group;
      } else if (p.type === 'bed') {
        detailedModel = Props.createBed();
      } else if (p.type === 'kitchen_counter') {
        detailedModel = Props.createKitchenCounter();
      }

      let geo: THREE.BufferGeometry;
      if (p.type === 'cylinder') {
        geo = new THREE.CylinderGeometry(p.w / 2, p.w / 2, p.h, 16);
      } else if (p.type === 'plane') {
        geo = new THREE.PlaneGeometry(p.d, p.w);
        geo.rotateX(-Math.PI / 2);
      } else {
        geo = new THREE.BoxGeometry(p.d, p.h, p.w);
      }
      geo.applyMatrix4(matrix);

      if (detailedModel) {
        // Wire up detailed model and scale to match w, h, d
        const rawBbox = new THREE.Box3().setFromObject(detailedModel);
        const size = new THREE.Vector3();
        rawBbox.getSize(size);
        
        detailedModel.scale.set(p.d / size.x, p.h / size.y, p.w / size.z);
        detailedModel.position.set(p.x, cy, p.z);
        
        detailedModel.position.y -= p.h / 2;
        
        if (p.facing === 'S') detailedModel.rotation.y = Math.PI;
        else if (p.facing === 'E') detailedModel.rotation.y = -Math.PI / 2;
        else if (p.facing === 'W') detailedModel.rotation.y = Math.PI / 2;
        
        this.group.add(detailedModel);
        detailedModel.updateMatrixWorld(true);

        const meshBox = new THREE.Box3().setFromObject(detailedModel);
        geo.computeBoundingBox();
        const collBox = geo.boundingBox!.clone();

        const diffMin = meshBox.min.distanceTo(collBox.min);
        const diffMax = meshBox.max.distanceTo(collBox.max);
        
        if (diffMin > 0.05 || diffMax > 0.05) {
           console.warn(`Mismatch in prop ${p.id}:\nMesh: ${meshBox.min.toArray()} to ${meshBox.max.toArray()}\nColl: ${collBox.min.toArray()} to ${collBox.max.toArray()}`);
        } else {
           console.log(`Prop ${p.id} matches.`);
        }

        if (p.isCollider !== false) {
           this.collisionBoxes.push({ box: collBox, level: p.floor, enabled: true, propId: p.id });
        }
        continue;
      }

      // Colors
      const colorArr = [];
      const col = new THREE.Color(p.color);
      for (let i = 0; i < geo.attributes.position.count; i++) {
        colorArr.push(col.r, col.g, col.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));

      // Find room
      let rName = 'Outside';
      for (const r of houseLayout.rooms) {
        if (r.floor === p.floor && p.x >= r.xMin && p.x <= r.xMax && p.z >= r.zMin && p.z <= r.zMax) {
          rName = r.name;
          break;
        }
      }

      if (p.interactable || p.type === 'plane') {
         // Keep interactables separate
         const mat = new THREE.MeshStandardMaterial({ color: p.color, vertexColors: false });
         if (p.type === 'plane') {
           mat.polygonOffset = true;
           mat.polygonOffsetFactor = -1;
           mat.polygonOffsetUnits = -1;
         }
         const mesh = new THREE.Mesh(geo.clone(), mat);
         // Reset geo matrix for interactive mesh position
         mesh.geometry.applyMatrix4(matrix.invert());
         mesh.position.set(p.x, cy, p.z);
         if (p.facing === 'S') mesh.rotation.y = Math.PI;
         else if (p.facing === 'E') mesh.rotation.y = -Math.PI / 2;
         else if (p.facing === 'W') mesh.rotation.y = Math.PI / 2;
         
         this.group.add(mesh);
         mesh.updateMatrixWorld(true);
         
         if (p.isCollider !== false) {
           this.collisionBoxes.push({ box: new THREE.Box3().setFromObject(mesh), level: p.floor, enabled: true, propId: p.id });
         }

         if (p.interactable) {
           this.interactiveProps.push({ id: p.id, name: p.name, mesh, interactionType: p.interactable, position: mesh.position.clone() });
         }
      } else {
         if (!roomGeoms[rName]) roomGeoms[rName] = [];
         roomGeoms[rName].push(geo);

         if (p.isCollider !== false) {
            geo.computeBoundingBox();
            if (geo.boundingBox) {
               this.collisionBoxes.push({ box: geo.boundingBox.clone(), level: p.floor, enabled: true, propId: p.id });
            }
         }
      }
    }

    // Merge static geometries per room
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    for (const rName in roomGeoms) {
      if (roomGeoms[rName].length > 0) {
         try {
           const merged = BufferGeometryUtils.mergeGeometries(roomGeoms[rName], false);
           if (merged) {
             const mesh = new THREE.Mesh(merged, mat);
             mesh.castShadow = true;
             mesh.receiveShadow = true;
             this.group.add(mesh);
           }
         } catch(e) {
           console.error("Error merging geometry for", rName, e);
         }
      }
    }

    // Chair Instances
    if (chairInstData.length > 0) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const cmat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const instMesh = new THREE.InstancedMesh(geo, cmat, chairInstData.length);
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;
      
      const dummy = new THREE.Object3D();
      const tempColor = new THREE.Color();
      chairInstData.forEach((p, i) => {
         const cy = (p.floor === 1 ? 3.0 : 0.0) + p.h / 2;
         dummy.position.set(p.x, cy, p.z);
         dummy.rotation.set(0, 0, 0);
         if (p.facing === 'S') dummy.rotation.y = Math.PI;
         else if (p.facing === 'E') dummy.rotation.y = -Math.PI / 2;
         else if (p.facing === 'W') dummy.rotation.y = Math.PI / 2;
         dummy.scale.set(p.d, p.h, p.w);
         dummy.updateMatrix();
         instMesh.setMatrixAt(i, dummy.matrix);
         
         tempColor.setHex(p.color);
         instMesh.setColorAt(i, tempColor);
         
         if (p.isCollider !== false) {
            const tbox = new THREE.Box3(
              new THREE.Vector3(-0.5, -0.5, -0.5),
              new THREE.Vector3(0.5, 0.5, 0.5)
            );
            tbox.applyMatrix4(dummy.matrix);
            this.collisionBoxes.push({ box: tbox, level: p.floor, enabled: true });
         }
      });
      instMesh.instanceMatrix.needsUpdate = true;
      if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
      this.group.add(instMesh);
    }
  }
}
