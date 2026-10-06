// Paranoia shadows test: the real Game, headless, on the simulated clock.

import { resetHeadless, losePointerLock, simClock } from './test-support/headless';
import { Driver, FRAME } from './test-support/driver';
import * as THREE from 'three';
import { GamePhase, VISITOR_INSIDE_PARANOIA_FACTOR } from './src/game/GameFlow';
import {
  ParanoiaShadows, SHADOW_MAX_ALIVE, SHADOW_MIN_DISTANCE, SHADOW_VIEW_HALF_ANGLE, SHADOW_SEEN_PARANOIA_PER_SEC,
  SHADOW_DISPEL_RELIEF, SHADOW_DISSOLVE_TIME, SHADOW_LIFETIME, SHADOW_SPAWN_INTERVAL_MAX
} from './src/game/ParanoiaShadows';
import { SoundManager } from './src/audio/SoundManager';

let pass = 0;
let fail = 0;
function check(desc: string, cond: boolean, detail = ''): void {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${desc}${!cond && detail ? ` (${detail})` : ''}`);
  if (cond) pass++; else fail++;
}

function seedRandom(seed: number): void {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shadowsOf = (d: Driver) => (d.game as any).shadows as ParanoiaShadows;

// Run frames with paranoia pinned (so the test controls the spawn condition, not the dark)
function holdParanoia(d: Driver, value: number, seconds: number, each?: () => void): void {
  const frames = Math.round(seconds / FRAME);
  for (let i = 0; i < frames; i++) {
    d.flow.paranoia = value;
    d.run(FRAME);
    each?.();
  }
}

function noLightning(d: Driver): void {
  (d.flow as any).lightningTimer = 9999;
  (d.flow as any).isLightning = false;
}

// New game, skip the comic and intro; optionally play on into the cover-up
function newGame(seed: number, toCoverUp = true): Driver {
  resetHeadless();
  seedRandom(seed);
  const d = new Driver();
  d.clickButton('btn-start');
  d.holdKey('Enter', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3);
  d.clickButton('btn-resume'); // "Click to continue" after the comic
  if (toCoverUp) {
    d.holdKey('Space', 1.2);
    d.runUntil(() => d.phase === GamePhase.ACT1_MOVIE, 3);
    d.playThroughAct1();
    d.run(0.5);
  }
  return d;
}

// Stand in the dark kitchen facing west (toward the counters), flashlight off
const KITCHEN = { x: 4.5, z: 1.5 };
function darkKitchen(d: Driver): void {
  d.house.lightManager.setHouseLightsOn(false);
  d.placePlayer(KITCHEN.x, KITCHEN.z, 0);
  d.setFlashlight(false);
  d.aimAt(new THREE.Vector3(0, 1.6, KITCHEN.z));
  noLightning(d);
}
const IN_FRONT = { x: 1.6, z: 1.5 };   // ~2.9 m ahead of the player, in view
const BEHIND = { x: 1.6, z: 1.0 };     // used after turning to face east

console.log('--- RUNNING PARANOIA SHADOWS TEST ---');

// 1. Threshold, lit areas, spawning in the dark ------------------------------------------------
{
  const d = newGame(11);
  const sh = shadowsOf(d);
  darkKitchen(d);
  // The dark adds 0.2 within each frame before shadows look, so 49.8 reads as 50% to them
  holdParanoia(d, 49.8, 30);
  check('No shadows at 50% paranoia (30s in the dark)', sh.stats.spawned === 0, `${sh.stats.spawned} spawned`);

  d.house.lightManager.setHouseLightsOn(true);
  holdParanoia(d, 80, 30);
  check('No shadows on a fully lit floor at 80% paranoia (30s)', sh.stats.spawned === 0, `${sh.stats.spawned} spawned`);
  d.house.lightManager.setHouseLightsOn(false);

  const sm = SoundManager.getInstance() as any;
  let whispers = 0;
  const playBreath = sm.playBreath.bind(sm);
  sm.playBreath = () => { whispers++; playBreath(); };
  const spawns: { pos: THREE.Vector3; ok: boolean; why: string }[] = [];
  sh.onSpawn = (pos, frame) => {
    const chest = pos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const dist = Math.hypot(pos.x - frame.eye.x, pos.z - frame.eye.z);
    const angle = frame.forward.angleTo(chest.clone().sub(frame.eye));
    const lit = d.flow.isSpotLit(pos.x, pos.z, frame.floor);
    const blocked = (sh as any).blocked(pos.x, pos.z, frame.floor);
    spawns.push({ pos, ok: dist >= SHADOW_MIN_DISTANCE && angle > SHADOW_VIEW_HALF_ANGLE && !lit && !blocked, why: `d=${dist.toFixed(2)} angle=${THREE.MathUtils.radToDeg(angle).toFixed(0)} lit=${lit} blocked=${blocked}` });
  };
  sh.clear(); // restart the spawn timer
  const t0 = simClock.now();
  let firstAt = -1;
  holdParanoia(d, 80, SHADOW_SPAWN_INTERVAL_MAX + 0.5, () => { if (firstAt < 0 && sh.count > 0) firstAt = simClock.now() - t0; });
  check(`Above 50% in the dark, shadows appear within ${SHADOW_SPAWN_INTERVAL_MAX}s`, firstAt >= 0, `none after ${SHADOW_SPAWN_INTERVAL_MAX + 0.5}s`);
  check(`First wave came 6-12s in (game clock): ${firstAt.toFixed(1)}s`, firstAt >= 6 - FRAME && firstAt <= 12 + FRAME);
  check('Every spawn: 2 m+ away, outside the view cone, in the dark, not in walls/furniture/doorways', spawns.length > 0 && spawns.every(s => s.ok), spawns.filter(s => !s.ok).map(s => s.why).join('; '));
  check('A whisper plays when a wave appears', whispers > 0);
  sm.playBreath = playBreath;

  // Cap: a long stretch at high paranoia never exceeds 3 alive
  let maxAlive = 0;
  holdParanoia(d, 95, 60, () => { maxAlive = Math.max(maxAlive, sh.count); });
  check(`Cap of ${SHADOW_MAX_ALIVE} alive holds over 60s (max seen ${maxAlive})`, maxAlive <= SHADOW_MAX_ALIVE && maxAlive >= 1);
  sh.clear();
  const free = [{ x: 1.6, z: 1.5 }, { x: 1.6, z: 4.4 }, { x: 4.6, z: 4.0 }, { x: 5.3, z: 2.6 }];
  const placed = free.map(p => sh.spawnAt(p.x, p.z, 0));
  check('Cap: a 4th shadow is refused', placed.slice(0, 3).every(Boolean) && placed[3] === false && sh.count === 3, placed.join());
  sh.clear();
}

// 2. Never during cutscenes, peephole, hiding, pause -------------------------------------------
{
  const d = newGame(12, false);
  const sh = shadowsOf(d);
  check('In the intro cutscene', d.phase === GamePhase.ACT1_INTRO);
  holdParanoia(d, 80, 15);
  check('No shadows during the intro cutscene', sh.stats.spawned === 0);

  // The rest of Act 1 up to the shooting: dark kitchen, paranoia pinned high, still nothing
  d.holdKey('Space', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_MOVIE, 3);
  const seen = new Set<string>();
  // Paranoia pinned high, in the dark kitchen whenever the player is free to stand there
  const darkAndTense = (seconds: number, until: () => boolean) => {
    const frames = Math.round(seconds / FRAME);
    for (let i = 0; i < frames && !until(); i++) {
      if (d.phase === GamePhase.ACT1_MOVIE || d.phase === GamePhase.ACT1_BLACKOUT || (d.phase === GamePhase.ACT1_ARRIVAL && !d.flow.hasGun)) {
        d.placePlayer(KITCHEN.x, KITCHEN.z, 0);
        if (d.flow.hasFlashlight) d.setFlashlight(false);
      }
      seen.add(GamePhase[d.phase]);
      d.flow.paranoia = 80;
      d.run(FRAME);
    }
  };
  darkAndTense(15, () => false);                        // the movie
  d.takeFlashlight();
  darkAndTense(90, () => d.phase === GamePhase.ACT1_ARRIVAL); // blackout and the door comic
  darkAndTense(20, () => false);                        // the parents sway downstairs
  d.takeGun();
  d.placePlayer(5.0, 9.35, 0);
  darkAndTense(20, () => d.phase >= GamePhase.ACT1_POWER_BACK);
  check(`Played through ${[...seen].join(', ')}`, ['ACT1_MOVIE', 'ACT1_BLACKOUT', 'ACT1_ARRIVAL', 'ACT1_SHOOTING'].every(p => seen.has(p)));
  check('No shadows anywhere in Act 1 before the power comes back (paranoia 80, in the dark)', sh.stats.spawned === 0, `${sh.stats.spawned} spawned`);
  check('Shadows are allowed again from ACT1_POWER_BACK onward', d.runUntil(() => d.phase === GamePhase.ACT2_COVERUP, 10) && (d.game as any).shadowFrame().active === true);

  const d2 = newGame(13);
  const sh2 = shadowsOf(d2);
  check('Peephole entered', d2.interact('peephole') && (d2.game as any).peepholeManager.isActive());
  darkKitchen(d2); // camera stays in the peephole; the player body is moved
  holdParanoia(d2, 80, 25);
  check('No shadows while looking through the peephole', sh2.stats.spawned === 0, `${sh2.stats.spawned}`);
  d2.press('KeyQ');

  darkKitchen(d2);
  sh2.spawnAt(BEHIND.x, BEHIND.z, 0);
  d2.interact('peephole');
  check('Entering the peephole removes shadows at once', sh2.count === 0);
  d2.press('KeyQ');

  const door = d2.house.animatedDoors.find((x: any) => x.id === 'door_closet');
  if (!door.isOpen) d2.interact('door_closet');
  d2.approach('hiding_spot');
  sh2.spawnAt(BEHIND.x, BEHIND.z, 0);
  d2.press('KeyE');
  check('Starting to hide removes shadows at once', sh2.count === 0);
  d2.run(0.4);
  check('Hidden in the closet', d2.flow.playerHidden);
  const before = sh2.stats.spawned;
  holdParanoia(d2, 80, 20);
  check('No shadows while hidden', sh2.stats.spawned === before);
  d2.press('KeyE');
  d2.run(0.4);

  darkKitchen(d2);
  sh2.spawnAt(BEHIND.x, BEHIND.z, 0);
  losePointerLock();
  check('Pausing removes shadows at once', d2.flow.isPaused && sh2.count === 0);
  d2.run(20);
  check('None appear while paused', sh2.count === 0);
  d2.clickButton('btn-resume');

  d2.flow.paranoia = 100;
  d2.runUntil(() => d2.phase === GamePhase.ENDING, 2);
  sh2.spawnAt(BEHIND.x, BEHIND.z, 0);
  d2.run(FRAME);
  check('Shadows are removed in the ending phase', d2.phase === GamePhase.ENDING && sh2.count === 0);
}

// 3. Seeing one raises paranoia; light dispels; lifetime ---------------------------------------
{
  const d = newGame(14);
  const sh = shadowsOf(d);
  darkKitchen(d);
  const frame = (d.game as any).shadowFrame();

  // Baseline rise in the dark with nothing in view
  d.flow.paranoia = 55;
  d.run(1.0);
  const baseRate = d.flow.paranoia - 55;
  check('Shadow placed in front of the player', sh.spawnAt(IN_FRONT.x, IN_FRONT.z, 0, frame));
  check('...and it is in view with line of sight', sh.isSeen({ pos: new THREE.Vector3(IN_FRONT.x, 0, IN_FRONT.z), floor: 0 }, (d.game as any).shadowFrame()));
  (sh as any).spawnTimer = 999; // no extra waves during the measurement
  d.flow.paranoia = 55;
  d.run(1.0);
  const seenRate = d.flow.paranoia - 55;
  check(`Seeing a shadow adds +${SHADOW_SEEN_PARANOIA_PER_SEC}/s (${baseRate.toFixed(2)}/s -> ${seenRate.toFixed(2)}/s)`, Math.abs(seenRate - baseRate - SHADOW_SEEN_PARANOIA_PER_SEC) < 0.25);
  check(`It drifts closer but never within ${SHADOW_MIN_DISTANCE} m`, sh.getPositions().every(p => Math.hypot(p.x - KITCHEN.x, p.z - KITCHEN.z) >= SHADOW_MIN_DISTANCE));

  const pBefore = d.flow.paranoia;
  d.press('KeyF'); // flashlight on, beam straight at it
  d.run(FRAME);
  check(`Flashlight dispel gives relief (about ${SHADOW_DISPEL_RELIEF})`, d.flow.paranoia - pBefore < SHADOW_DISPEL_RELIEF + 0.5, `${(d.flow.paranoia - pBefore).toFixed(2)}`);
  d.run(SHADOW_DISSOLVE_TIME - FRAME);
  check(`Flashlight beam dissolves it within ${SHADOW_DISSOLVE_TIME}s`, sh.count === 0 && sh.stats.dispelled === 1);
  d.setFlashlight(false);

  // Lamp: shadow behind the player near the kitchen lamp
  d.aimAt(new THREE.Vector3(12, 1.6, KITCHEN.z)); // face east, away from it
  d.flow.paranoia = 20;
  check('Shadow placed behind the player, near the (off) kitchen lamp', sh.spawnAt(BEHIND.x, BEHIND.z, 0, (d.game as any).shadowFrame()));
  d.run(1.0);
  check('It stays while the lamp is off', sh.count === 1);
  d.house.lightManager.setLightOn('lamp_kitchen', true);
  d.run(SHADOW_DISSOLVE_TIME);
  check(`A lamp switched on within 3 m dissolves it within ${SHADOW_DISSOLVE_TIME}s`, sh.count === 0 && sh.stats.dispelled === 2);
  sh.spawnAt(4.6, 4.0, 0, (d.game as any).shadowFrame()); // ~5.5 m from the lamp
  d.run(1.0);
  check('A shadow farther than 3 m from the lamp is not dispelled by it', sh.count === 1);
  sh.clear();
  d.house.lightManager.setLightOn('lamp_kitchen', false);

  // Lifetime
  d.flow.paranoia = 20;
  sh.spawnAt(BEHIND.x, BEHIND.z, 0, (d.game as any).shadowFrame());
  d.run(SHADOW_LIFETIME - 0.5);
  check(`Still there at ${SHADOW_LIFETIME - 0.5}s`, sh.count === 1);
  d.run(0.5 + FRAME);
  check(`Despawns on its own after ${SHADOW_LIFETIME}s`, sh.count === 0);

  // Leak check: spawn and remove many times
  // Count shadow groups only: the game moves on meanwhile (a visitor may arrive and join the scene)
  const shadowNodes = () => (d.game as any).scene.children.filter((c: any) => c.name === 'paranoia_shadow').length;
  const s0 = { ...sh.stats };
  for (let i = 0; i < 60; i++) {
    sh.spawnAt(BEHIND.x, BEHIND.z, 0);
    if (i % 2) sh.clear(); else d.run(SHADOW_LIFETIME + FRAME);
  }
  sh.clear();
  check('No leaks: every spawned shadow was disposed and removed from the scene',
    // (natural spawns can join the 60 placed ones while the game runs on)
    sh.stats.spawned - s0.spawned >= 60 && sh.stats.disposed - s0.disposed === sh.stats.spawned - s0.spawned && shadowNodes() === 0);
}

// 4. Visitor inside: paranoia rises at 0.35x, consistently with hiding -------------------------
{
  const d = newGame(15);
  const door = d.house.animatedDoors.find((x: any) => x.id === 'door_closet');
  if (!door.isOpen) d.interact('door_closet');
  d.interact('hiding_spot');
  d.run(0.4);
  check('Hidden in the closet', d.flow.playerHidden);
  noLightning(d);
  d.flow.paranoia = 10;
  d.run(1.0);
  const hiddenRate = d.flow.paranoia - 10;
  (d.flow as any).startSearch('officer'); // a visitor lets themselves in
  check('A visitor is inside the house', d.flow.isVisitorInside());
  d.flow.paranoia = 10;
  d.run(1.0);
  const hiddenWithVisitor = d.flow.paranoia - 10;
  check(`Hidden: 10/s alone, x${VISITOR_INSIDE_PARANOIA_FACTOR} with a visitor inside (${hiddenRate.toFixed(2)} -> ${hiddenWithVisitor.toFixed(2)}/s)`,
    Math.abs(hiddenRate - 10) < 0.2 && Math.abs(hiddenWithVisitor - 10 * VISITOR_INSIDE_PARANOIA_FACTOR) < 0.2);
  const p = d.flow.paranoia;
  d.flow.addParanoia(1);
  check('Outside paranoia sources (shadows) are scaled too', Math.abs(d.flow.paranoia - p - VISITOR_INSIDE_PARANOIA_FACTOR) < 1e-9);
  const p2 = d.flow.paranoia;
  d.flow.addParanoia(SHADOW_DISPEL_RELIEF);
  check('Relief is not scaled', Math.abs(d.flow.paranoia - p2 - SHADOW_DISPEL_RELIEF) < 1e-9);
  (d.flow as any).endSearch();
  d.flow.paranoia = 10;
  d.run(1.0);
  check('Back to 10/s once the visitor is gone', Math.abs(d.flow.paranoia - 10 - 10) < 0.2);
}

console.log(`Shadows Test Complete: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
