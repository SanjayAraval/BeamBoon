import * as THREE from 'three';
import { Character } from './characters';
import { Collider } from './House';
import { npcLayout, Waypoint } from './npcLayout';

export class NpcController {
  character: Character;
  colliders: Collider[];
  
  targetWaypoint: Waypoint | null = null;
  path: Waypoint[] = [];
  
  onArrive?: (wp: Waypoint) => void;
  
  x: number = 0;
  y: number = 0;
  z: number = 0;
  vy: number = 0;
  yaw: number = 0;
  
  isZombie: boolean = false;
  isDead: boolean = false;

  public setDead(dead: boolean) {
    this.isDead = dead;
    this.character.setDead(dead);
    if (dead) {
      this.path = [];
      this.targetWaypoint = null;
      this.character.setPose('idle');
    }
  }
  
  constructor(char: Character, colliders: Collider[]) {
    this.character = char;
    this.colliders = colliders;
    
    this.x = char.root.position.x;
    this.y = char.root.position.y;
    this.z = char.root.position.z;
    this.yaw = char.root.rotation.y;
  }
  
  setPosition(x: number, y: number, z: number, rotation: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.yaw = rotation;
    this.character.root.position.set(x, y, z);
    this.character.root.rotation.y = rotation;
  }
  
  setZombie(on: boolean) {
    this.isZombie = on;
    this.character.setZombie(on);
  }
  
  walkTo(waypointName: string) {
    const end = npcLayout.waypoints.find(w => w.name === waypointName);
    if (!end) return;
    
    // Find closest starting waypoint
    let start = npcLayout.waypoints[0];
    let minDist = Infinity;
    for (const w of npcLayout.waypoints) {
      if (w.floor !== (this.y >= 1.5 ? 1 : 0)) continue;
      const d = Math.hypot(w.x - this.x, w.z - this.z);
      if (d < minDist) {
        minDist = d;
        start = w;
      }
    }
    
    // A* 
    const path = this.findPath(start.name, end.name);
    if (path.length > 0) {
      // If we are already close to the start node, don't walk backwards to it
      if (path.length > 1 && Math.hypot(path[1].x - this.x, path[1].z - this.z) < minDist) {
        path.shift();
      }
      this.path = path;
      this.targetWaypoint = end;
      this.character.setPose('walk');
    }
  }
  
  private findPath(startName: string, endName: string): Waypoint[] {
    const nodes = npcLayout.waypoints;
    const edges = npcLayout.edges;
    
    const adj = new Map<string, string[]>();
    for (const w of nodes) adj.set(w.name, []);
    for (const e of edges) {
      if (adj.has(e.from) && adj.has(e.to)) {
        adj.get(e.from)!.push(e.to);
        adj.get(e.to)!.push(e.from);
      }
    }
    
    const getWp = (name: string) => nodes.find(w => w.name === name)!;
    const dist = (a: Waypoint, b: Waypoint) => Math.hypot(a.x - b.x, a.z - b.z);
    
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, string>();
    const openSet = new Set<string>([startName]);
    
    gScore.set(startName, 0);
    fScore.set(startName, dist(getWp(startName), getWp(endName)));
    
    while (openSet.size > 0) {
      let curr = '';
      let minF = Infinity;
      for (const n of openSet) {
        const f = fScore.get(n) ?? Infinity;
        if (f < minF) { minF = f; curr = n; }
      }
      
      if (curr === endName) {
        const path = [];
        let cur = curr;
        while (cur) {
          path.unshift(getWp(cur));
          cur = cameFrom.get(cur)!;
        }
        return path;
      }
      
      openSet.delete(curr);
      const currWp = getWp(curr);
      
      for (const neighbor of adj.get(curr)!) {
        const neighborWp = getWp(neighbor);
        const d = dist(currWp, neighborWp);
        const tgScore = (gScore.get(curr) ?? Infinity) + d;
        if (tgScore < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, curr);
          gScore.set(neighbor, tgScore);
          fScore.set(neighbor, tgScore + dist(neighborWp, getWp(endName)));
          openSet.add(neighbor);
        }
      }
    }
    return [];
  }
  public drunk = false;
  private drunkTime = 0;

  update(dt: number) {
    this.character.update(dt);
    
    if (this.path.length > 0) {
      const target = this.path[0];
      const dx = target.x - this.x;
      const dz = target.z - this.z;
      const d2 = Math.hypot(dx, dz);
      
      if (d2 < 0.2) {
        this.path.shift();
        if (this.path.length === 0) {
          this.character.setPose('idle');
          if (this.onArrive && this.targetWaypoint) this.onArrive(this.targetWaypoint);
          this.targetWaypoint = null;
        }
      } else {
        let speed = this.isZombie ? 0.9 : 1.4;
        if (this.drunk) speed *= 0.75; // 25% slower
        const targetYaw = Math.atan2(-dx, -dz);
        
        // Smooth rotation
        let diff = targetYaw - this.yaw;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.yaw += diff * 10 * dt;
        
        // Move with collisions
        const moveDist = speed * dt;
        this.simStep(Math.sin(-targetYaw) * moveDist, Math.cos(-targetYaw) * moveDist, dt);
      }
    }
    
    let renderX = this.x;
    let renderZ = this.z;

    if (this.drunk && this.path.length > 0) {
      this.drunkTime += dt;
      const swayAmt = Math.sin(this.drunkTime * Math.PI * 2 * 1.2) * 0.12;
      const swayDx = Math.cos(this.yaw) * swayAmt;
      const swayDz = -Math.sin(this.yaw) * swayAmt;

      const playerBox = new THREE.Box3(
        new THREE.Vector3(this.x + swayDx - 0.35, this.y, this.z + swayDz - 0.35),
        new THREE.Vector3(this.x + swayDx + 0.35, this.y + 1.6, this.z + swayDz + 0.35)
      );
      
      const currentFloorLevel = this.y >= 2.0 ? 1 : 0;
      let hit = false;
      for (const c of this.colliders) {
        if (!c.enabled) continue;
          if ((c as any).propId && (c as any).propId.startsWith('door_')) continue;
        if (c.level !== 'both' && c.level !== currentFloorLevel) continue;
        if (c.box.max.y <= this.y + 0.45) continue;
        if (c.box.intersectsBox(playerBox)) {
          hit = true;
          break;
        }
      }
      if (!hit) {
        renderX += swayDx;
        renderZ += swayDz;
      }
    }

    this.character.root.position.set(renderX, this.y, renderZ);
    this.character.root.rotation.y = this.yaw;
  }
  
  private simStep(dx: number, dz: number, dt: number) {
    const targetX = this.x + dx;
    const targetZ = this.z + dz;

    this.vy -= 9.8 * dt;
    let nextFeetY = this.y + this.vy * dt;

    const groundY = this.getGroundHeight(targetX, targetZ, this.y);
    if (nextFeetY <= groundY + 0.05) {
      nextFeetY = groundY;
      this.vy = 0;
    }

    const currentFloorLevel = nextFeetY >= 2.0 ? 1 : 0;
    const active = this.colliders.filter(c => {
      if (!c.enabled) return false;
      if ((c as any).propId && (c as any).propId.startsWith('door_')) return false;
      if (c.level !== 'both' && c.level !== currentFloorLevel) return false;
      if (c.box.max.y <= nextFeetY + 0.45) return false;
      return true;
    });

    const PLAYER_RADIUS = 0.35;
    const check = (cx: number, cz: number): boolean => {
      const pBox = new THREE.Box3(
        new THREE.Vector3(cx - PLAYER_RADIUS, nextFeetY + 0.1, cz - PLAYER_RADIUS),
        new THREE.Vector3(cx + PLAYER_RADIUS, nextFeetY + 1.5, cz + PLAYER_RADIUS)
      );
      for (const c of active) {
        if (c.box.intersectsBox(pBox)) return true;
      }
      return false;
    };

    let finalX = targetX;
    let finalZ = targetZ;

    if (check(finalX, this.z)) finalX = this.x;
    if (check(finalX, finalZ)) finalZ = this.z;

    const finalBox = new THREE.Box3(
      new THREE.Vector3(finalX - PLAYER_RADIUS, nextFeetY + 0.1, finalZ - PLAYER_RADIUS),
      new THREE.Vector3(finalX + PLAYER_RADIUS, nextFeetY + 1.5, finalZ + PLAYER_RADIUS)
    );
    for (const c of active) {
      if (c.box.intersectsBox(finalBox)) {
        const bc = new THREE.Vector3();
        c.box.getCenter(bc);
        const dir = new THREE.Vector2(finalX - bc.x, finalZ - bc.z);
        if (dir.lengthSq() > 0) dir.normalize();
        else dir.set(1, 0);
        finalX += dir.x * 0.05;
        finalZ += dir.y * 0.05;
      }
    }

    this.x = finalX;
    this.z = finalZ;
    this.y = nextFeetY;
  }
  
  private getGroundHeight(cx: number, cz: number, feetY: number): number {
    let groundHeight = 0;
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
          if ((c as any).propId && (c as any).propId.startsWith('door_')) continue;
      if (c.level !== 'both' && c.level !== currentFloorLevel && c.level !== currentFloorLevel - 1) continue;
      if (c.box.max.y > feetY + 0.45) continue;
      for (const off of offsets) {
        const sx = cx + off.dx;
        const sz = cz + off.dz;
        if (sx >= c.box.min.x && sx <= c.box.max.x && sz >= c.box.min.z && sz <= c.box.max.z) {
          groundHeight = Math.max(groundHeight, c.box.max.y);
          break;
        }
      }
    }
    return groundHeight;
  }
}

import { createCharacter } from './characters';

export class NpcManager {
  scene: THREE.Scene;
  colliders: Collider[];
  
  parents: NpcController[] = [];
  visitors: NpcController[] = [];
  
  private spawnTimer: number = -1;
  
  constructor(scene: THREE.Scene, colliders: Collider[]) {
    this.scene = scene;
    this.colliders = colliders;
  }
  
  spawnParents() {
    this.cancelSpawns();
    const mother = createCharacter('mother');
    const mSpawn = npcLayout.parentEntry.motherStart;
    const mCtrl = new NpcController(mother, this.colliders);
    mCtrl.setPosition(mSpawn.x, mSpawn.floor === 1 ? 3.0 : 0.0, mSpawn.z, mSpawn.rotation);
    mCtrl.drunk = true;
    this.scene.add(mother.root);
    this.parents.push(mCtrl);
    mCtrl.walkTo('living_room');
    
    // Spawn father 1.5 seconds later
    this.spawnTimer = 1.5;
  }
  
  public update(dt: number) {
    if (this.spawnTimer > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnFather();
      }
    }
    
    for (const ctrl of this.parents) ctrl.update(dt);
    for (const ctrl of this.visitors) ctrl.update(dt);
  }
  
  private spawnFather() {
    this.spawnTimer = -1;
    const father = createCharacter('father');
    const fSpawn = npcLayout.parentEntry.fatherStart;
    const fCtrl = new NpcController(father, this.colliders);
    fCtrl.setPosition(fSpawn.x, fSpawn.floor === 1 ? 3.0 : 0.0, fSpawn.z, fSpawn.rotation);
    fCtrl.drunk = true;
    this.scene.add(father.root);
    this.parents.push(fCtrl);
    fCtrl.walkTo('living_room');
  }

  public getParent(kind: 'mother' | 'father'): NpcController | undefined {
    return this.parents.find(p => p.character.kind === kind);
  }

  private cancelSpawns() {
    this.spawnTimer = -1;
  }
  
  reset() {
    this.cancelSpawns();
    for (const p of this.parents) {
      this.scene.remove(p.character.root);
      p.character.dispose();
    }
    for (const v of this.visitors) {
      this.scene.remove(v.character.root);
      v.character.dispose();
    }
    this.parents = [];
    this.visitors = [];
  }
  
  killParents() {
    // The shot can happen before the father has walked in; spawn him now so both end up down
    if (this.spawnTimer > 0) this.spawnFather();
    for (const kind of ['mother', 'father'] as const) {
      const ctrl = this.getParent(kind);
      if (!ctrl) continue;
      const dp = npcLayout.deadPoses[kind];
      ctrl.setDead(true);
      ctrl.setPosition(dp.x, dp.floor === 1 ? 3.0 : 0.0, dp.z, dp.rotation);
    }
  }
  
  spawnVisitor(kind: 'neighbour' | 'officer' | 'partner') {
    const vis = createCharacter(kind);
    const stand = npcLayout.visitorStand.stand;
    const ctrl = new NpcController(vis, this.colliders);
    ctrl.setPosition(stand.x, stand.floor === 1 ? 3.0 : 0.0, stand.z, stand.rotation);
    this.scene.add(vis.root);
    this.visitors.push(ctrl);
    
    vis.setPose('knock');
    setTimeout(() => {
      vis.setPose('idle');
    }, 2000);
  }
  
  inviteVisitor() {
    for (const v of this.visitors) {
      v.walkTo(npcLayout.visitorStand.inside);
    }
  }
  
}
