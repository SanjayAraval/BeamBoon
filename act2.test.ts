// Act 2 playtest regressions, on the real Game after the full Act 1 (flashlight, door comic, gun,
// shooting): (1) standing in the dark cover-up does not end in a breakdown; (2) the peephole
// works at the front door in the cover-up and in every visitor phase.

import { resetHeadless, keyDown, keyUp, mouseMove, isHidden } from './test-support/headless';
import { Driver } from './test-support/driver';
import * as THREE from 'three';
import { GamePhase, PARANOIA_MAX_GAIN_PER_SEC, ACT2_DARKNESS_CEILING } from './src/game/GameFlow';
import { OBJECTIVES } from './src/story/Objectives';

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

// New game through the real Act 1 to the first frame of the cover-up
function toCoverUp(seed: number): Driver {
  resetHeadless();
  seedRandom(seed);
  const d = new Driver();
  d.clickButton('btn-start');
  d.holdKey('Enter', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3);
  d.clickButton('btn-resume');
  d.holdKey('Space', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_MOVIE, 3);
  const ok = d.playThroughAct1();
  check(`[seed ${seed}] Real Act 1 played through to the cover-up`, ok && d.phase === GamePhase.ACT2_COVERUP, d.phaseName);
  return d;
}

console.log('--- RUNNING ACT 2 REGRESSION TEST ---');

// 1. Idle / walking / no flashlight: paranoia stays under 60 for the first 90s ----------------
for (const [mode, seed] of [['idle', 31], ['walking', 32], ['idle, flashlight off', 33]] as const) {
  const d = toCoverUp(seed);
  if (mode === 'idle, flashlight off') d.setFlashlight(false);
  d.flow.resetParanoiaLog();
  let max = d.flow.paranoia;
  let worstSecond = 0;
  for (let t = 0; t < 90; t++) {
    if (mode === 'walking') { keyDown('KeyW'); if (t % 3 === 0) mouseMove(400, 0); }
    const before = d.flow.paranoia;
    d.run(1);
    if (mode === 'walking') keyUp('KeyW');
    max = Math.max(max, d.flow.paranoia);
    worstSecond = Math.max(worstSecond, d.flow.paranoia - before);
  }
  const darkness = [...d.flow.getParanoiaLog().entries()].filter(([k]) => k.startsWith('darkness')).reduce((s, [, v]) => s + v, 0);
  check(`${mode}: 90s in the dark cover-up, paranoia max ${max.toFixed(0)} < 60, no ending`, max < 60 && d.phase === GamePhase.ACT2_COVERUP, d.phaseName);
  check(`${mode}: darkness alone never passes ${ACT2_DARKNESS_CEILING}`, d.flow.paranoia <= ACT2_DARKNESS_CEILING + 3 && darkness >= 0);
  check(`${mode}: no second gains more than ${PARANOIA_MAX_GAIN_PER_SEC} (+3 lightning burst): worst ${worstSecond.toFixed(1)}`, worstSecond <= PARANOIA_MAX_GAIN_PER_SEC + 3 + 1e-6);
}

// 2. Shadows don't stack on a knocking visitor: the total stays within the cap -----------------
{
  const d = toCoverUp(34);
  d.house.lightManager.setHouseLightsOn(false);
  d.setFlashlight(false);
  check('The neighbour knocks', d.runUntil(() => d.flow.getVisitorManager().isVisitorAtDoor(), 120));
  d.placePlayer(4.5, 1.5, 0); // dark kitchen
  d.aimAt(new THREE.Vector3(0, 1.6, 1.5));
  (d.flow as any).lightningTimer = 9999;
  const sh = (d.game as any).shadows;
  sh.clear();
  sh.spawnAt(1.6, 1.5, 0, (d.game as any).shadowFrame());
  (sh as any).spawnTimer = 999;
  d.flow.paranoia = 52;
  d.run(1);
  const gain = d.flow.paranoia - 52;
  check(`Darkness + visitor + a shadow in view: ${gain.toFixed(2)}/s, capped at ${PARANOIA_MAX_GAIN_PER_SEC}/s (was 2+10+3)`, gain <= PARANOIA_MAX_GAIN_PER_SEC + 1e-6 && gain > PARANOIA_MAX_GAIN_PER_SEC - 0.3);
}

// 3. Peephole: cover-up and every visitor phase; enter with E, leave with E, Q or right-click ---
{
  const d = toCoverUp(35);
  const pm = (d.game as any).peepholeManager;
  // Tidy up so each visitor can be talked away; the objective follows the real checklist
  const line = () => (document.getElementById('objective-line') as any).innerHTML as string;
  check('Cover-up objective: "Hide the bodies: drag them (E) to a hiding spot."', d.flow.getObjective().text === OBJECTIVES.hideBodies && line() === OBJECTIVES.hideBodies, line());
  d.hideBody('body_father');
  check('One body still out: same objective', d.flow.getObjective().text === OBJECTIVES.hideBodies);
  d.hideBody('body_mother');
  d.run(0.1);
  check('Both bodies hidden: "Clean up evidence and wait for visitors."', d.flow.getObjective().text === OBJECTIVES.cleanUp && line() === OBJECTIVES.cleanUp, line());
  for (const id of ['trace_0', 'trace_1', 'curtains_living', 'gun_safe']) d.interact(id);
  d.run(0.1);
  check('Everything done: "Everything looks normal. Wait for visitors."', d.flow.getObjective().text === OBJECTIVES.allClear);
  d.interact('switch_light_foyer');

  const exits = ['KeyE', 'KeyQ', 'right'] as const;
  const tryAll = (label: string) => {
    for (const exit of exits) {
      const r = d.usePeephole(exit);
      check(`${label}: look at the front door, E enters; ${exit === 'right' ? 'right-click' : exit.slice(3)} leaves`, r.entered && r.exited, JSON.stringify(r));
    }
  };
  tryAll('ACT2_COVERUP');

  for (const phase of [GamePhase.VISITOR_NEIGHBOUR, GamePhase.VISITOR_OFFICER, GamePhase.VISITOR_PARTNER]) {
    const name = GamePhase[phase];
    check(`${name}: a visitor knocks`, d.runUntil(() => d.phase === phase && d.flow.getVisitorManager().isVisitorAtDoor(), 120), d.phaseName);
    tryAll(name);
    // The visitor prompt says "[E] PEEPHOLE": from 2.2 m, looking at the floor, E still does that
    d.placePlayer(7.4, 9.8, 0);
    d.aimAt(new THREE.Vector3(7.4, 0, 9.0));
    d.settle();
    check(`${name}: visitor prompt is up`, !isHidden('door-prompt'));
    d.press('KeyE');
    check(`${name}: E at the visitor prompt opens the peephole`, pm.isActive());
    d.press('KeyQ');
    check(`${name}: and Q closes it`, !pm.isActive());
    d.placePlayer(7.4, 10.6, 0);
    d.run(1);
    d.talk('best');
    check(`${name}: talked the visitor away`, !d.flow.getVisitorManager().isVisitorAtDoor());
  }
}

console.log(`Act 2 Test Complete: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
