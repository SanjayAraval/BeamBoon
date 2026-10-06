// Paranoia shadows: dark figures with red eyes that appear in unlit corners when paranoia runs
// high. Looking at one raises paranoia; light (flashlight beam or a nearby lamp) dissolves it.
// Self-contained: Game owns one instance, calls update() every frame and clear() whenever
// shadows must vanish at once (pause, peephole, hiding, ending, reset).

import * as THREE from 'three';
import { Collider } from '../world/House';
import { houseLayout, findRoom } from '../world/houseLayout';
import { npcLayout } from '../world/npcLayout';

// --- Balance ---------------------------------------------------------------------------------
export const SHADOW_PARANOIA_THRESHOLD = 50;   // shadows only come above this paranoia (%)
export const SHADOW_SPAWN_INTERVAL_MIN = 6;    // seconds between spawn waves (random in range)
export const SHADOW_SPAWN_INTERVAL_MAX = 12;
export const SHADOW_WAVE_MAX = 3;              // 1..3 figures per wave
export const SHADOW_MAX_ALIVE = 3;             // hard cap
export const SHADOW_LIFETIME = 8;              // seconds before a shadow despawns by itself
export const SHADOW_FADE_IN = 1.2;             // seconds
export const SHADOW_DISSOLVE_TIME = 0.5;       // seconds to dissolve once hit by light
export const SHADOW_SEEN_PARANOIA_PER_SEC = 3; // extra paranoia/s while any shadow is in view
export const SHADOW_DISPEL_RELIEF = -4;        // paranoia change when the player dispels one
export const SHADOW_MIN_DISTANCE = 2;          // never closer to the player than this (m)
export const SHADOW_MAX_SPAWN_DISTANCE = 12;
export const SHADOW_LAMP_RADIUS = 3;           // a lit lamp this close dissolves a shadow (m)
export const SHADOW_DRIFT_SPEED = 0.12;        // m/s toward the player
export const SHADOW_VIEW_HALF_ANGLE = THREE.MathUtils.degToRad(50); // the player's view cone
const SPAWN_VIEW_MARGIN = THREE.MathUtils.degToRad(15);              // spawn well outside it
const DOOR_CLEARANCE = 1.2;  // keep doorways free (m)
const BODY_RADIUS = 0.3;
const FLOOR_HEIGHT = 3;

export interface ShadowWorld {
  scene: THREE.Scene;
  colliders: Collider[];
  isSpotLit(x: number, z: number, floor: number): boolean;      // the room's lights are on
  isLampOnNear(point: THREE.Vector3, radius: number): boolean;   // any switched-on light within radius
  onAppear?(): void;                                             // a wave appeared (audio hint)
  random?: () => number;
}

export interface ShadowFrame {
  active: boolean; // false: no shadows allowed right now (they are removed at once)
  paranoia: number;
  eye: THREE.Vector3;
  forward: THREE.Vector3;
  floor: number;
  flashlight: { on: boolean; origin: THREE.Vector3; dir: THREE.Vector3; range: number; halfAngle: number };
}

interface Shadow {
  group: THREE.Group;
  bodyMat: THREE.MeshBasicMaterial;
  eyeMat: THREE.MeshBasicMaterial;
  geometries: THREE.BufferGeometry[];
  pos: THREE.Vector3; // feet
  floor: number;
  age: number;
  dissolving: number; // -1 while alive, else seconds into dissolving
  flickerSeed: number;
}

export class ParanoiaShadows {
  private world: ShadowWorld;
  private shadows: Shadow[] = [];
  private spawnTimer = -1;
  private spots: { x: number; z: number; floor: number }[] = [];
  private random: () => number;
  private ray = new THREE.Ray();
  // For tests and leak checks
  public readonly stats = { spawned: 0, disposed: 0, dispelled: 0 };
  public onSpawn?: (pos: THREE.Vector3, frame: ShadowFrame) => void;

  constructor(world: ShadowWorld) {
    this.world = world;
    this.random = world.random ?? Math.random;
    this.spots = this.findSpots();
  }

  get count(): number {
    return this.shadows.length;
  }

  getPositions(): THREE.Vector3[] {
    return this.shadows.map(s => s.pos.clone());
  }

  // Remove every shadow at once (and dispose it)
  clear(): void {
    for (const s of this.shadows) this.dispose(s);
    this.shadows = [];
    this.spawnTimer = -1;
  }

  // Returns the paranoia change this frame (extra dread from looking at shadows, relief from dispelling)
  update(dt: number, frame: ShadowFrame): number {
    if (!frame.active) {
      if (this.shadows.length > 0) this.clear();
      this.spawnTimer = -1;
      return 0;
    }

    let paranoiaDelta = 0;

    // Spawning, on the game clock
    if (frame.paranoia > SHADOW_PARANOIA_THRESHOLD) {
      if (this.spawnTimer < 0) this.spawnTimer = this.nextInterval();
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.nextInterval();
        const wave = 1 + Math.floor(this.random() * SHADOW_WAVE_MAX);
        let appeared = 0;
        for (let i = 0; i < wave && this.shadows.length < SHADOW_MAX_ALIVE; i++) {
          const spot = this.pickSpot(frame);
          if (!spot) break;
          this.spawn(spot.x, spot.z, spot.floor, frame);
          appeared++;
        }
        if (appeared > 0) this.world.onAppear?.();
      }
    } else {
      this.spawnTimer = -1;
    }

    let anySeen = false;
    for (const s of [...this.shadows]) {
      s.age += dt;
      if (s.dissolving >= 0) {
        s.dissolving += dt;
        if (s.dissolving >= SHADOW_DISSOLVE_TIME - 1e-6) this.remove(s);
        else this.setOpacity(s, 1 - s.dissolving / SHADOW_DISSOLVE_TIME);
        continue;
      }
      if (s.age >= SHADOW_LIFETIME) {
        this.remove(s);
        continue;
      }
      // Light dissolves it
      const chest = this.chest(s);
      if (this.inFlashlight(chest, s.floor, frame) || this.world.isLampOnNear(chest, SHADOW_LAMP_RADIUS)) {
        s.dissolving = dt; // the frame the light hit counts toward the dissolve
        this.stats.dispelled++;
        paranoiaDelta += SHADOW_DISPEL_RELIEF;
        continue;
      }
      this.drift(s, frame, dt);
      const fade = Math.min(1, s.age / SHADOW_FADE_IN);
      const flicker = 0.88 + 0.12 * Math.sin(s.age * 9 + s.flickerSeed) * Math.sin(s.age * 3.7 + s.flickerSeed * 2);
      this.setOpacity(s, fade * flicker);
      if (this.isSeen(s, frame)) anySeen = true;
    }

    if (anySeen) paranoiaDelta += SHADOW_SEEN_PARANOIA_PER_SEC * dt;
    return paranoiaDelta;
  }

  // Place a shadow directly (tests, debugging). Returns false at the cap or on a blocked spot.
  spawnAt(x: number, z: number, floor: number, frame?: ShadowFrame): boolean {
    if (this.shadows.length >= SHADOW_MAX_ALIVE || this.blocked(x, z, floor)) return false;
    this.spawn(x, z, floor, frame);
    return true;
  }

  // Is this shadow inside the view cone with a clear line of sight?
  isSeen(s: { pos: THREE.Vector3; floor: number } | Shadow, frame: ShadowFrame): boolean {
    if (s.floor !== frame.floor) return false;
    const chest = 'group' in s ? this.chest(s) : new THREE.Vector3(s.pos.x, s.pos.y + 1.2, s.pos.z);
    return this.angleTo(chest, frame) <= SHADOW_VIEW_HALF_ANGLE && this.lineOfSight(frame.eye, chest, s.floor);
  }

  // --- internals -------------------------------------------------------------------------

  private nextInterval(): number {
    return SHADOW_SPAWN_INTERVAL_MIN + this.random() * (SHADOW_SPAWN_INTERVAL_MAX - SHADOW_SPAWN_INTERVAL_MIN);
  }

  private chest(s: Shadow): THREE.Vector3 {
    return new THREE.Vector3(s.pos.x, s.pos.y + 1.2, s.pos.z);
  }

  private angleTo(point: THREE.Vector3, frame: ShadowFrame): number {
    const to = point.clone().sub(frame.eye);
    if (to.lengthSq() < 1e-6) return 0;
    return frame.forward.angleTo(to);
  }

  private lineOfSight(from: THREE.Vector3, to: THREE.Vector3, floor: number): boolean {
    const dir = to.clone().sub(from);
    const dist = dir.length();
    this.ray.set(from, dir.normalize());
    const hit = new THREE.Vector3();
    for (const c of this.world.colliders) {
      if (!c.enabled || (c.level !== 'both' && c.level !== floor)) continue;
      if (c.box.containsPoint(to)) continue;
      if (this.ray.intersectBox(c.box, hit) && from.distanceTo(hit) < dist - 0.05) return false;
    }
    return true;
  }

  private inFlashlight(chest: THREE.Vector3, floor: number, frame: ShadowFrame): boolean {
    const f = frame.flashlight;
    if (!f.on) return false;
    const to = chest.clone().sub(f.origin);
    if (to.length() > f.range || f.dir.angleTo(to) > f.halfAngle) return false;
    return this.lineOfSight(f.origin, chest, floor);
  }

  // Candidate floor spots: the NPC waypoints plus a 1 m grid inside every room, clear of
  // walls, furniture and doorways
  private findSpots(): { x: number; z: number; floor: number }[] {
    const spots: { x: number; z: number; floor: number }[] = [];
    for (const w of npcLayout.waypoints) spots.push({ x: w.x, z: w.z, floor: w.floor });
    for (const r of houseLayout.rooms) {
      for (let x = r.xMin + 0.6; x <= r.xMax - 0.6; x += 1) {
        for (let z = r.zMin + 0.6; z <= r.zMax - 0.6; z += 1) spots.push({ x, z, floor: r.floor });
      }
    }
    // Inside a room only (the porch waypoint is outdoors) and clear of obstacles
    return spots.filter(s => findRoom(s.x, s.z, s.floor) !== null && !this.blocked(s.x, s.z, s.floor));
  }

  private blocked(x: number, z: number, floor: number): boolean {
    const feet = floor * FLOOR_HEIGHT;
    const body = new THREE.Box3(new THREE.Vector3(x - BODY_RADIUS, feet + 0.1, z - BODY_RADIUS), new THREE.Vector3(x + BODY_RADIUS, feet + 1.7, z + BODY_RADIUS));
    for (const c of this.world.colliders) {
      if (c.level !== 'both' && c.level !== floor) continue;
      if (c.box.max.y <= feet + 0.45) continue; // floor slabs, rugs
      if (c.box.intersectsBox(body)) return true;
    }
    for (const d of houseLayout.doors) {
      if (d.floor === floor && Math.hypot(d.x - x, d.z - z) < DOOR_CLEARANCE) return true;
    }
    return false;
  }

  private pickSpot(frame: ShadowFrame): { x: number; z: number; floor: number } | null {
    const ok = this.spots.filter(s => {
      if (s.floor !== frame.floor) return false;
      const d = Math.hypot(s.x - frame.eye.x, s.z - frame.eye.z);
      if (d < SHADOW_MIN_DISTANCE || d > SHADOW_MAX_SPAWN_DISTANCE) return false;
      if (this.shadows.some(o => Math.hypot(o.pos.x - s.x, o.pos.z - s.z) < 1.0)) return false;
      const chest = new THREE.Vector3(s.x, s.floor * FLOOR_HEIGHT + 1.2, s.z);
      if (this.angleTo(chest, frame) <= SHADOW_VIEW_HALF_ANGLE + SPAWN_VIEW_MARGIN) return false;
      if (this.world.isSpotLit(s.x, s.z, s.floor) || this.world.isLampOnNear(chest, SHADOW_LAMP_RADIUS)) return false;
      return true;
    });
    if (ok.length === 0) return null;
    return ok[Math.floor(this.random() * ok.length)];
  }

  private spawn(x: number, z: number, floor: number, frame?: ShadowFrame): void {
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0 });
    const torso = new THREE.CapsuleGeometry(0.24, 0.85, 4, 10);
    const head = new THREE.SphereGeometry(0.17, 12, 10);
    const eye = new THREE.SphereGeometry(0.026, 8, 6);
    const group = new THREE.Group();
    const torsoMesh = new THREE.Mesh(torso, bodyMat);
    torsoMesh.position.y = 0.85;
    const headMesh = new THREE.Mesh(head, bodyMat);
    headMesh.position.y = 1.55;
    group.add(torsoMesh, headMesh);
    for (const sx of [-0.06, 0.06]) {
      const e = new THREE.Mesh(eye, eyeMat);
      e.position.set(sx, 1.58, 0.15);
      group.add(e);
    }
    const pos = new THREE.Vector3(x, floor * FLOOR_HEIGHT, z);
    group.position.copy(pos);
    group.name = 'paranoia_shadow';
    this.world.scene.add(group);
    const s: Shadow = { group, bodyMat, eyeMat, geometries: [torso, head, eye], pos, floor, age: 0, dissolving: -1, flickerSeed: this.random() * 10 };
    this.shadows.push(s);
    this.stats.spawned++;
    if (frame) {
      this.face(s, frame.eye);
      this.onSpawn?.(pos.clone(), frame);
    }
  }

  private face(s: Shadow, target: THREE.Vector3): void {
    s.group.rotation.y = Math.atan2(target.x - s.pos.x, target.z - s.pos.z);
  }

  // Drift very slowly toward the player, never closer than the minimum distance, never into
  // walls, furniture or doorways
  private drift(s: Shadow, frame: ShadowFrame, dt: number): void {
    this.face(s, frame.eye);
    if (s.floor !== frame.floor) return;
    const dx = frame.eye.x - s.pos.x;
    const dz = frame.eye.z - s.pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= SHADOW_MIN_DISTANCE + 0.05) return;
    const step = Math.min(SHADOW_DRIFT_SPEED * dt, d - SHADOW_MIN_DISTANCE);
    const nx = s.pos.x + (dx / d) * step;
    const nz = s.pos.z + (dz / d) * step;
    if (this.blocked(nx, nz, s.floor)) return;
    s.pos.set(nx, s.pos.y, nz);
    s.group.position.copy(s.pos);
  }

  private setOpacity(s: Shadow, k: number): void {
    s.bodyMat.opacity = 0.93 * k;
    s.eyeMat.opacity = k;
  }

  private remove(s: Shadow): void {
    this.dispose(s);
    this.shadows = this.shadows.filter(o => o !== s);
  }

  private dispose(s: Shadow): void {
    s.group.removeFromParent();
    for (const g of s.geometries) g.dispose();
    s.bodyMat.dispose();
    s.eyeMat.dispose();
    s.group.clear();
    this.stats.disposed++;
  }
}
