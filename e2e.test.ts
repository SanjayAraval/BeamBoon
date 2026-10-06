// End-to-end playthrough test.
//
// Builds the real Game (headless: no WebGL), and plays it start to finish on a simulated clock
// with scripted input: button clicks, held keys, mouse movement to aim, E/T/F key presses and
// mouse clicks to fire, all dispatched as DOM events into the game's own handlers. The only
// scripted shortcut is locomotion: the player is placed next to what they want to use instead
// of walking there with WASD. One playthrough per ending: CLEAN, CAUGHT, RUN, BREAKDOWN.

import { resetHeadless, isHidden, elementText, comicRoot } from './test-support/headless';
import { Driver } from './test-support/driver';
import * as THREE from 'three';
import { GamePhase } from './src/game/GameFlow';
import { EndingType } from './src/story/Endings';

let pass = 0;
let fail = 0;
function check(desc: string, cond: boolean, detail = ''): void {
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${desc}${!cond && detail ? ` (${detail})` : ''}`);
  if (cond) pass++; else fail++;
}

// Deterministic randomness (lightning timing, visitor skepticism rolls)
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

const ENDING_TITLES: Record<EndingType, string> = {
  clean: 'ENDING: THE CLEAN COVER-UP',
  caught: 'ENDING: ARRESTED',
  run: 'ENDING: THE COWARD',
  breakdown: 'ENDING: PSYCHOTIC BREAKDOWN'
};

// Fresh page load, a new Game, and a hook that records which ending fired
function newGame(seed: number): { d: Driver; ending: () => EndingType | null } {
  resetHeadless();
  seedRandom(seed);
  const d = new Driver();
  let ending: EndingType | null = null;
  const flow = d.flow as any;
  const original = flow.onEndingTriggered;
  flow.onEndingTriggered = (e: { type: EndingType }) => {
    ending = e.type;
    original(e);
  };
  return { d, ending: () => ending };
}

// Title -> comic montage (hold Enter to skip) -> sofa intro (hold Space to skip) -> free roam
function startGame(d: Driver): void {
  check('Title screen is showing', !isHidden('title-screen') && d.phase === GamePhase.TITLE);
  d.clickButton('btn-start');
  check('Start button opens the comic montage', d.phase === GamePhase.MONTAGE);
  check('The intro comic is on screen', comicRoot() !== null);
  d.holdKey('Enter', 1.2);
  check('Holding Enter skips the comic into the intro', d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3), d.phaseName);
  check('The comic is removed from the page', comicRoot() === null);
  check('Intro grabs pointer lock', d.player.isLocked === true);
  d.holdKey('Space', 1.2);
  d.run(1.0);
  check('Holding Space skips the intro; player is free to move', d.phase === GamePhase.ACT1_MOVIE, d.phaseName);
}

// Act 1 plays out by itself; optionally the player takes Dad's pistol and fires two nervous misses
function playAct1(d: Driver, nervousShots: boolean): void {
  if (nervousShots) {
    check('Takes the service pistol from the gun safe', d.interact('gun_safe'));
    check('Pistol is in hand', d.arsenal.getWeapon() === 'pistol');
    const up = () => d.player.getPosition().clone().add(new THREE.Vector3(0.3, 2, 0)); // fire at the ceiling
    d.aimAt(up());
    d.click();
    check('Nervous shot #1 fired during the movie', d.arsenal.getPistolAmmo() === 1);
    check('Act 1 not over yet', d.runUntil(() => d.phase === GamePhase.ACT1_ARRIVAL, 40), d.phaseName);
    d.aimAt(up());
    d.click();
    check('Nervous shot #2 fired as the "zombies" arrive', d.arsenal.getPistolAmmo() === 0);
  }
  check('Act 1 ends and the cover-up begins', d.runUntil(() => d.phase === GamePhase.ACT2_COVERUP, 60), d.phaseName);
  check('Both parents are down: 2 bodies, 2 blood traces', d.evidence.getExposedBodiesCount() === 2 && d.evidence.getUncleanedTracesCount() === 2);
  d.run(0.5);
}

function turnOn(d: Driver, lightId: string, switchId: string): void {
  const light = d.house.lightManager.getLight(lightId);
  if (!light.isOn) d.interact(switchId);
  check(`${lightId} is on`, light.isOn === true);
}

// Stand in the lit foyer within reach of the front door
function waitInFoyer(d: Driver): void {
  turnOn(d, 'light_foyer', 'switch_light_foyer');
  d.placePlayer(7.4, 10.6, 0);
  d.aimAt(new THREE.Vector3(7.4, 1.6, 12));
}

function waitForKnock(d: Driver, maxSeconds: number): boolean {
  return d.runUntil(() => d.flow.getVisitorManager().isVisitorAtDoor(), maxSeconds);
}

function checkEndingScreen(d: Driver, ending: () => EndingType | null, expected: EndingType): void {
  check(`Ending is ${expected.toUpperCase()}`, ending() === expected, `got ${ending()}`);
  check('Game is in the ENDING phase', d.phase === GamePhase.ENDING, d.phaseName);
  check('Ending screen is shown with the right title', !isHidden('ending-screen') && elementText('ending-title') === ENDING_TITLES[expected], elementText('ending-title'));
}

// ---------------------------------------------------------------------------------------------

function cleanEnding(): void {
  console.log('\nCLEAN: hide everything, answer every visitor calmly (after two nervous Act 1 shots)');
  const { d, ending } = newGame(1);
  startGame(d);
  playAct1(d, true);
  check('Act 1 gunfire did not count as noise', d.evidence.getTotalNoise() === 0, `noise ${d.evidence.getTotalNoise()}`);

  check("Hides Father's body", d.interact('body_father'));
  check("Hides Mother's body", d.interact('body_mother'));
  check('Cleans the first blood trace', d.interact('trace_0'));
  check('Cleans the second blood trace', d.interact('trace_1'));
  check('Closes the curtains', d.interact('curtains_living'));
  check('Locks the pistol back in the safe', d.interact('gun_safe'));
  check('No evidence left', d.evidence.getExposedBodiesCount() === 0 && d.evidence.getUncleanedTracesCount() === 0 && d.evidence.isCurtainsClosed() && d.evidence.isPistolHidden());

  waitInFoyer(d);
  for (const who of ['neighbour', 'officer', 'partner']) {
    check(`The ${who} knocks`, waitForKnock(d, 120) && d.flow.getVisitorManager().getActiveVisitor()?.type === who, d.phaseName);
    d.run(1.0);
    d.press('KeyT');
    check(`Talks the ${who} away`, !d.flow.getVisitorManager().isVisitorAtDoor(), `paranoia ${d.flow.paranoia.toFixed(0)}`);
  }
  d.runUntil(() => d.phase === GamePhase.ENDING, 30);
  checkEndingScreen(d, ending, 'clean');
}

function caughtEnding(): void {
  console.log('\nCAUGHT: leave the bodies where they fell and try to talk your way out');
  const { d, ending } = newGame(2);
  startGame(d);
  playAct1(d, false);
  waitInFoyer(d);

  check('The neighbour knocks', waitForKnock(d, 120));
  check('Ignored, the neighbour gives up and leaves', d.runUntil(() => !d.flow.getVisitorManager().isVisitorAtDoor(), 60));
  check('The officer knocks', waitForKnock(d, 30) && d.flow.getVisitorManager().getActiveVisitor()?.type === 'officer');
  // Keep answering until the officer stops listening and pushes inside
  for (let i = 0; i < 10 && d.phase !== GamePhase.ENDING; i++) {
    d.press('KeyT');
    d.run(3.5);
  }
  checkEndingScreen(d, ending, 'caught');
  check('Bodies were still out', d.evidence.getExposedBodiesCount() === 2);
}

function runEnding(): void {
  console.log('\nRUN: flee through the rear door during the cover-up');
  const { d, ending } = newGame(3);
  startGame(d);
  playAct1(d, false);

  check('Reaches the rear door and presses E', d.interact('door_rear'));
  check('One press only asks for confirmation', d.phase === GamePhase.ACT2_COVERUP && ending() === null);
  d.run(0.5);
  d.press('KeyE');
  checkEndingScreen(d, ending, 'run');
}

function breakdownEnding(): void {
  console.log('\nBREAKDOWN: sit in the dark with the flashlight off until paranoia hits 100');
  const { d, ending } = newGame(4);
  startGame(d);
  playAct1(d, false);

  d.placePlayer(2.0, 2.0, 0); // dark kitchen
  d.setFlashlight(false);
  check('Flashlight is off', !d.flashlight.isTurnedOn());
  check('Paranoia climbs to 100 before the first knock', d.runUntil(() => d.phase === GamePhase.ENDING, 85), `paranoia ${d.flow.paranoia.toFixed(0)}, ${d.phaseName}`);
  check('Paranoia maxed out', d.flow.paranoia >= 100);
  checkEndingScreen(d, ending, 'breakdown');
}

// Engine logs (phase changes, light dumps) would bury the results
const log = console.log;
console.log = (...args: unknown[]) => {
  const s = String(args[0]);
  if (s.startsWith('  [') || s.startsWith('\n') || s.startsWith('===')) log(...args);
};

cleanEnding();
caughtEnding();
runEnding();
breakdownEnding();

console.log(`\n=== E2E: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
