// Drives a real headless Game with scripted input on the simulated clock.
// Import './headless' first so the browser globals exist before src/ modules load.

import * as THREE from 'three';
import { simClock, keyDown, keyUp, pressKey, mouseDown, mouseMove, clickElement } from './headless';
import { Game } from '../src/game/Game';
import { GameFlow, GamePhase } from '../src/game/GameFlow';
import { findRoom } from '../src/world/houseLayout';
import { bestAnswer, worstAnswer } from '../src/game/VisitorDialogue';

export const FRAME = 1 / 30;

export class Driver {
  readonly game: Game;

  constructor() {
    this.game = new Game({ headless: true, clock: simClock });
  }

  // Internals the scenarios inspect (read-only use)
  get flow(): GameFlow { return (this.game as any).gameFlow; }
  get evidence() { return (this.game as any).evidence; }
  get player() { return (this.game as any).player; }
  get flashlight() { return (this.game as any).flashlight; }
  get arsenal() { return (this.game as any).arsenal; }
  get house() { return (this.game as any).house; }
  get interactions() { return (this.game as any).interactionSystem; }
  get phase(): GamePhase { return this.flow.phase; }
  get phaseName(): string { return GamePhase[this.flow.phase]; }

  // Advance wall time by `seconds`, one rendered frame at a time
  run(seconds: number): void {
    const frames = Math.round(seconds / FRAME);
    for (let i = 0; i < frames; i++) {
      simClock.advance(FRAME);
      this.game.step();
    }
  }

  runUntil(cond: () => boolean, maxSeconds: number): boolean {
    const frames = Math.round(maxSeconds / FRAME);
    for (let i = 0; i < frames; i++) {
      if (cond()) return true;
      simClock.advance(FRAME);
      this.game.step();
    }
    return cond();
  }

  // A frame with no time passing (lets aim / focus update without moving the clock)
  settle(): void {
    this.game.step();
  }

  holdKey(code: string, seconds: number): void {
    keyDown(code);
    this.run(seconds);
    keyUp(code);
  }

  press(code: string): void {
    pressKey(code);
  }

  click(button = 0): void {
    mouseDown(button);
  }

  clickButton(id: string): void {
    clickElement(id);
  }

  // Locomotion is scripted (the player is placed), everything else goes through real input
  placePlayer(x: number, z: number, floor: number): void {
    this.player.setPosition(x, floor * 3 + 1.6, z);
  }

  // Turn the view toward a point by sending mouse movement, as the player would
  aimAt(target: THREE.Vector3): void {
    const pos: THREE.Vector3 = this.player.getPosition();
    const d = target.clone().sub(pos);
    const wantYaw = Math.atan2(-d.x, -d.z);
    const wantPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    const p = this.player as any;
    let dYaw = wantYaw - p.yaw;
    dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw)); // shortest turn
    const sens = p.mouseSensitivity;
    mouseMove(-dYaw / sens, -(wantPitch - p.pitch) / sens);
    this.settle();
  }

  focusedId(): string | null {
    return this.interactions.focused?.id ?? null;
  }

  private interactableCenter(id: string): THREE.Vector3 {
    const it = this.interactions.interactables.find((i: any) => i.id === id);
    if (!it) throw new Error(`No interactable '${id}' registered`);
    return it.hitMesh.position.clone();
  }

  // Walk up to an interactable (placed at a free spot within reach) and look at it.
  // Returns false if no spot in reach can see it.
  approach(id: string): boolean {
    const target = this.interactableCenter(id);
    const floor = target.y >= 2.5 ? 1 : 0;
    const colliders = this.house.collisionBoxes as { box: THREE.Box3; level: number | 'both'; enabled: boolean }[];
    for (const dist of [1.0, 0.7, 1.3]) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const x = target.x + Math.cos(a) * dist;
        const z = target.z + Math.sin(a) * dist;
        if (!findRoom(x, z, floor)) continue;
        const feet = floor * 3;
        const body = new THREE.Box3(new THREE.Vector3(x - 0.35, feet + 0.1, z - 0.35), new THREE.Vector3(x + 0.35, feet + 1.5, z + 0.35));
        const blocked = colliders.some(c => c.enabled && (c.level === 'both' || c.level === floor) && c.box.max.y > feet + 0.45 && c.box.intersectsBox(body));
        if (blocked) continue;
        this.placePlayer(x, z, floor);
        this.settle();
        this.aimAt(target);
        if (this.focusedId() === id) return true;
      }
    }
    return false;
  }

  // Approach and press E on an interactable
  interact(id: string): boolean {
    if (!this.approach(id)) return false;
    this.press('KeyE');
    return true;
  }

  // --- Act 1, the way a player does it --------------------------------------------------------

  // Open the desk drawer in the player's bedroom and take the flashlight
  takeFlashlight(): boolean {
    if (!this.flow.hasFlashlight && !this.interact('drawer_player')) return false;
    if (!this.flow.hasFlashlight) this.interact('drawer_player');
    return this.flow.hasFlashlight;
  }

  // Blackout -> door unlocks -> door comic -> the parents are in
  waitForArrival(maxSeconds = 90): boolean {
    return this.runUntil(() => this.phase === GamePhase.ACT1_ARRIVAL, maxSeconds);
  }

  takeGun(): boolean {
    return this.interact('gun_safe') && this.flow.hasGun;
  }

  // Go down to the living room where the parents sway: with the gun, that starts the shooting
  goToParents(maxSeconds = 20): boolean {
    this.placePlayer(5.0, 9.35, 0);
    return this.runUntil(() => this.phase >= GamePhase.ACT1_SHOOTING, maxSeconds);
  }

  // From free roam in Act 1 to the start of the cover-up
  playThroughAct1(): boolean {
    return this.takeFlashlight() && this.waitForArrival() && this.takeGun() && this.goToParents() &&
      this.runUntil(() => this.phase === GamePhase.ACT2_COVERUP, 15);
  }

  // Walk up to the front door, look at it and press E: the peephole. Leave with E, Q or right-click.
  usePeephole(exitWith: 'KeyE' | 'KeyQ' | 'right', standZ = 10.9): { entered: boolean; exited: boolean } {
    const pm = (this.game as any).peepholeManager;
    this.placePlayer(7.4, standZ, 0);
    this.settle();
    this.aimAt(new THREE.Vector3(7.4, 1.2, 12)); // at the door, the way a player looks at it
    this.press('KeyE');
    const entered = pm.isActive();
    this.run(0.5);
    if (exitWith === 'right') this.click(2); else this.press(exitWith);
    return { entered, exited: entered && !pm.isActive() };
  }

  // Talk to the visitor at the door: T opens the dialogue, 1 / 2 / 3 answer each round ('best' and
  // 'worst' pick by answer quality, or give the indices). Waits for the last line, then clicks
  // through "Click to continue". Deterministic: the dialogue has no randomness.
  talk(plan: 'best' | 'worst' | number[]): { opened: boolean; success: boolean | null; doubt: number } {
    this.press('KeyT');
    const session = (this.game as any).dialogue;
    if (!session) return { opened: false, success: null, doubt: 0 };
    for (let r = 0; r < 3 && !session.finished; r++) {
      const round = session.current;
      const pick = plan === 'best' ? bestAnswer(round) : plan === 'worst' ? worstAnswer(round) : plan[r];
      this.press(`Digit${pick + 1}`);
      this.run(0.3);
    }
    const result = { opened: true, success: session.success as boolean | null, doubt: session.doubt as number };
    this.runUntil(() => !(this.game as any).dialogue, 4);
    this.settle();
    if (this.flow.isPaused) this.clickButton('btn-resume'); // "Click to continue"
    return result;
  }

  // Grab a body (E), drag it upstairs into the walk-in closet and drop it there (E): hidden.
  // Locomotion is scripted (placed), so the drag noise is the straight-line distance.
  hideBody(id: string): boolean {
    if (!this.interact(id) || (this.game as any).getDraggedBody() !== id) return false;
    this.placePlayer(1.1, 10.4, 1);
    this.aimAt(new THREE.Vector3(1.1, 4.6, 8)); // face out of the closet: the body trails inside
    this.run(0.2);
    this.press('KeyE');
    return (this.game as any).getDraggedBody() === null && this.evidence.getBodies().find((b: any) => b.id === id)?.isHidden === true;
  }

  setFlashlight(on: boolean): void {
    if (this.flashlight.isTurnedOn() !== on) this.press('KeyF');
  }
}
