// Act 1 flow: flashlight in the bedroom drawer -> blackout -> door unlocks -> door comic ->
// parents sway downstairs -> Dad's gun -> the shooting. The real Game, headless, game clock.

import { resetHeadless, isHidden, losePointerLock, comicRoot, elementText, keyDown, keyUp, pointerLockStats } from './test-support/headless';
import { Driver } from './test-support/driver';
import { GamePhase, ACT1_MIN_BLACKOUT, ACT1_FLASHLIGHT_HINT_AFTER, ACT1_GUN_HINT_AFTER, ACT1_ARRIVAL_PAGES } from './src/game/GameFlow';
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

function toFreeRoam(seed: number): Driver {
  resetHeadless();
  seedRandom(seed);
  const d = new Driver();
  d.clickButton('btn-start');
  d.holdKey('Enter', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3);
  d.clickButton('btn-resume');
  d.holdKey('Space', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_MOVIE, 3);
  return d;
}

const parents = (d: Driver) => (d.flow as any).npcManager.parents as any[];
const objective = (d: Driver) => d.flow.getObjective();
const shadows = (d: Driver) => (d.game as any).shadows;

console.log('--- RUNNING ACT 1 FLOW TEST ---');

// 1. No flashlight in hand; parents never come before it is found -------------------------------
{
  const d = toFreeRoam(21);
  check('Free roam starts without a flashlight', !d.flow.hasFlashlight && !d.flashlight.isTurnedOn());
  d.press('KeyF');
  check('F does nothing without a flashlight', !d.flashlight.isTurnedOn());
  const line = () => (document.getElementById('objective-line') as any).innerHTML as string;
  check('The objective is on screen', !isHidden('objective-line') && line() === OBJECTIVES.movie, line());

  check('The blackout comes', d.runUntil(() => d.phase === GamePhase.ACT1_BLACKOUT, 25));
  d.run(0.1);
  check('From the first frame of the blackout the objective says where: desk drawer, your bedroom, upstairs', objective(d).text === OBJECTIVES.findFlashlight && line() === OBJECTIVES.findFlashlight, line());
  d.placePlayer(4.5, 1.5, 0); // the kitchen, far from the drawer
  d.run(ACT1_FLASHLIGHT_HINT_AFTER - 2);
  check(`No hint before ${ACT1_FLASHLIGHT_HINT_AFTER}s`, objective(d).hint === '');
  d.run(3);
  check(`After ${ACT1_FLASHLIGHT_HINT_AFTER}s: a stronger hint with directions (on screen)`, objective(d).hint === OBJECTIVES.flashlightHint && line().includes(OBJECTIVES.flashlightHint) && (OBJECTIVES.flashlightHint as string) !== OBJECTIVES.findFlashlight);
  d.run(60);
  check('Still the blackout at 150s: nobody comes without the flashlight', d.phase === GamePhase.ACT1_BLACKOUT && parents(d).length === 0, d.phaseName);

  // Esc during the objective
  const timer = (d.flow as any).phaseTimer;
  losePointerLock();
  d.run(10);
  check('Esc pauses during the blackout objective (game clock stopped)', d.flow.isPaused && (d.flow as any).phaseTimer === timer && !isHidden('pause-overlay'));
  d.clickButton('btn-resume');
  check('A click resumes', !d.flow.isPaused && d.player.isLocked());

  check('The drawer offers "Open drawer"', d.approach('drawer_player') && d.interactions.focused.promptText() === 'Open drawer');
  d.press('KeyE');
  check('...then "[E] Take flashlight"', d.approach('drawer_player') && d.interactions.focused.promptText() === 'Take flashlight' && elementText('interaction-text') === '[E] Take flashlight', elementText('interaction-text'));
  d.press('KeyE');
  check('Flashlight taken and switched on', d.flow.hasFlashlight && d.flashlight.isTurnedOn());
  check('Already 20s+ into the blackout: the front door unlocks', d.runUntil(() => comicRoot() !== null, 3) && objective(d).text === OBJECTIVES.doorUnlocks);
  check('The door comic plays (game clock) and the player is held still', d.phase === GamePhase.ACT1_BLACKOUT && (d.player as any).frozen === true);

  // Pause over the door comic
  const comic = (d.flow as any).comic;
  const beat = comic.beat;
  losePointerLock();
  d.run(10);
  check('Esc pauses the door comic', d.flow.isPaused && comic.paused === true && comic.beat === beat);
  d.clickButton('btn-resume');
  d.run(0.5);
  d.click(); d.click(); // first click completes the caption, then advances (pointer is locked)
  check('A click advances the door comic', comic.beat > beat || comic.finished, `beat ${comic.beat}`);
  keyDown('Enter');
  d.run(1.1);
  keyUp('Enter');
  check('Holding Enter skips it: the parents are in', d.runUntil(() => d.phase === GamePhase.ACT1_ARRIVAL, 3) && comicRoot() === null, d.phaseName);
  check('Two parents in the house', parents(d).length === 2 || d.runUntil(() => parents(d).length === 2, 2));
  check('Objective: "Get Dad\'s gun: master bedroom closet, upstairs."', objective(d).text === OBJECTIVES.getGun);
}

// 2. The door waits at least 20s after the blackout even with the flashlight already in hand ----
{
  const d = toFreeRoam(22);
  check('Flashlight taken during the movie', d.takeFlashlight());
  d.runUntil(() => d.phase === GamePhase.ACT1_BLACKOUT, 25);
  d.run(ACT1_MIN_BLACKOUT - 1);
  check(`No knock at the door before ${ACT1_MIN_BLACKOUT}s of blackout`, comicRoot() === null && (d.flow as any).doorUnlockTimer < 0);
  check('...then the door unlocks and the comic plays', d.runUntil(() => comicRoot() !== null, 4));
  check('The gun objective shows the moment the door comic ends (before the fade into the arrival)',
    d.runUntil(() => objective(d).text === OBJECTIVES.getGun, 30) && d.phase === GamePhase.ACT1_BLACKOUT, d.phaseName);
  check('The comic hands off to the arrival on its own', d.waitForArrival(5));
}

// 3. No shooting before the gun; no soft lock; shooting only downstairs, near them --------------
{
  const d = toFreeRoam(23);
  d.takeFlashlight();
  d.waitForArrival();
  check('Gun was locked away until now, available now', d.flow.isGunAvailable() && !d.flow.hasGun);
  d.placePlayer(4.0, 9.35, 0);
  d.press('Digit2');
  d.click();
  check('Standing right by the parents without the gun: nothing happens', d.runUntil(() => d.phase !== GamePhase.ACT1_ARRIVAL, 30) === false);
  d.run(ACT1_GUN_HINT_AFTER - 30 - 2);
  check(`No gun hint before ${ACT1_GUN_HINT_AFTER}s`, objective(d).hint === '');
  d.run(4);
  check(`After ${ACT1_GUN_HINT_AFTER}s: a stronger hint with directions`, objective(d).hint === OBJECTIVES.gunHint && (OBJECTIVES.gunHint as string) !== OBJECTIVES.getGun);
  const captions = ACT1_ARRIVAL_PAGES.flatMap(p => p.panels.map(x => x.caption ?? ''));
  check('Door comic caption says where the gun really is (no drawer)', captions.includes(OBJECTIVES.gunCaption) && !captions.some(c => /drawer/i.test(c)));
  check('No gun objective or hint mentions a drawer', !/drawer/i.test(objective(d).text + objective(d).hint));
  check('No soft lock: still the arrival, both parents alive, no ending', d.phase === GamePhase.ACT1_ARRIVAL && parents(d).length === 2 && parents(d).every(p => p.isDead === false) && isHidden('ending-screen'));

  check('Takes the gun: "[E] Take gun"', d.approach('gun_safe') && elementText('interaction-text') === '[E] Take gun' && (d.press('KeyE'), d.flow.hasGun));
  d.placePlayer(3.5, 8.5, 1); // the master bedroom, right above the living room
  check('With the gun but upstairs: no shooting', d.runUntil(() => d.phase !== GamePhase.ACT1_ARRIVAL, 5) === false);
  check('Downstairs near the parents with the gun: the shooting scene', d.goToParents(), d.phaseName);
  check('...then the power comes back and the cover-up starts as before', d.runUntil(() => d.phase === GamePhase.ACT2_COVERUP, 15));
  check('No paranoia shadows anywhere in Act 1', shadows(d).stats.spawned === 0);
  check('Pointer lock only ever requested from clicks', pointerLockStats.outsideGesture === 0);
}

console.log(`Act 1 Test Complete: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
