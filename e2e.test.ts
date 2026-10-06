// End-to-end playthrough test.
//
// Builds the real Game (headless: no WebGL), and plays it start to finish on a simulated clock
// with scripted input: button clicks, held keys, mouse movement to aim, E/T/F key presses and
// mouse clicks to fire, all dispatched as DOM events into the game's own handlers. The only
// scripted shortcut is locomotion: the player is placed next to what they want to use instead
// of walking there with WASD. One playthrough per ending: CLEAN, CAUGHT, RUN, BREAKDOWN.

import { resetHeadless, isHidden, elementText, comicRoot, simClock, losePointerLock } from './test-support/headless';
import { SoundManager } from './src/audio/SoundManager';
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

// --- Cover-up mechanics: bedsheets and hiding in the closet ---------------------------------

const sheetVisible = (d: Driver, bedId: string) => (d.game as any).bedSheets.get(bedId).visible as boolean;
const drapeOf = (d: Driver, bodyId: string) => (d.game as any).bodySheets.get(bodyId) as THREE.Group | undefined;
const body = (d: Driver, id: string) => d.evidence.getBodies().find((b: any) => b.id === id);
const task = (d: Driver, label: string) => d.flow.getTasks().find(t => t.label === label)!;

// Open the walk-in closet and step inside to hide (fade included)
function openCloset(d: Driver): void {
  const door = d.house.animatedDoors.find((x: any) => x.id === 'door_closet');
  if (!door.isOpen) d.interact('door_closet');
  check('Closet door is open', door.isOpen === true);
}
function hide(d: Driver): boolean {
  if (!d.interact('hiding_spot')) return false;
  d.run(0.4);
  return d.flow.playerHidden;
}
function stepOut(d: Driver): void {
  d.press('KeyE');
  d.run(0.4);
}

function bedsheets(): void {
  console.log('\nBEDSHEETS: take a sheet, cover a body, beds go bare, Play Again restores them');
  const { d } = newGame(5);
  startGame(d);
  playAct1(d, false);

  check('All three beds are made', ['bed_player', 'bed_master', 'bed_spare'].every(b => sheetVisible(d, b)));
  check('Takes the sheet off the master bed', d.interact('sheet_bed_master'));
  check('Carrying a sheet; the HUD says so', d.flow.carryingSheet && !isHidden('carry-status') && elementText('carry-status') === 'Carrying: sheet');
  check('Master bed is now a bare mattress', !sheetVisible(d, 'bed_master'));
  d.interact('sheet_bed_spare');
  check('Cannot take a second sheet while carrying one', sheetVisible(d, 'bed_spare') && d.flow.carryingSheet);

  check("Father's body offers \"Cover\" while carrying a sheet", d.approach('body_father') && d.interactions.focused.promptText() === "Cover Father's body");
  d.press('KeyE');
  check('Father is covered (not hidden)', body(d, 'body_father').isCovered && !body(d, 'body_father').isHidden);
  check('Covered body counts 40% of an uncovered one', d.evidence.getBodySeverity('body_father') === 0.4 * d.evidence.getBodySeverity('body_mother'), `${d.evidence.getBodySeverity('body_father')} vs ${d.evidence.getBodySeverity('body_mother')}`);
  check('The sheet was used up', !d.flow.carryingSheet && isHidden('carry-status'));
  const drape = drapeOf(d, 'body_father');
  check('A draped sheet lies over the body, with a blood spot (still bleeding)', !!drape && drape.parent !== null && drape.children.length === 2);
  check('Covering is not hiding: the body still counts as exposed', d.evidence.getExposedBodiesCount() === 2);
  check('Second cover attempt without a sheet fails', d.flow.tryCoverBody('body_mother') === false && !body(d, 'body_mother').isCovered);
  check('...and the body offers "Hide" instead', d.approach('body_mother') && d.interactions.focused.promptText() === "Hide Mother's body");
  check('Checklist: "Cover or hide both bodies" not done yet', task(d, 'Cover or hide both bodies').done === false);
  d.interact('sheet_bed_spare');
  d.interact('body_mother');
  check('Second sheet covers Mother', body(d, 'body_mother').isCovered);
  check('Checklist: "Cover or hide both bodies" done', task(d, 'Cover or hide both bodies').done === true);
  check('Checklist is on screen', !isHidden('task-list'));
  check('Two beds are bare, the player bed is made', !sheetVisible(d, 'bed_master') && !sheetVisible(d, 'bed_spare') && sheetVisible(d, 'bed_player'));

  d.flow.reset(); // Play Again in the same session
  check('Play Again remakes every bed', ['bed_player', 'bed_master', 'bed_spare'].every(b => sheetVisible(d, b)));
  check('Play Again removes the draped sheets', drape!.parent === null && drapeOf(d, 'body_father') === undefined);
  check('Play Again drops the carried sheet and the hidden state', !d.flow.carryingSheet && !d.flow.playerHidden && isHidden('carry-status'));
  check('Beds can be stripped again', d.interactions.interactables.some((i: any) => i.id === 'sheet_bed_master'));
}

function hideDuringKnock(): void {
  console.log('\nHIDE: in the closet during the neighbour\'s knock, then a CLEAN ending');
  const { d, ending } = newGame(6);
  const sm = SoundManager.getInstance() as any;
  let knocks = 0;
  const playKnock = sm.playKnock.bind(sm);
  sm.playKnock = (...a: unknown[]) => { knocks++; playKnock(...a); };

  startGame(d);
  playAct1(d, false);
  d.interact('body_father');
  d.interact('body_mother');
  d.interact('trace_0');
  d.interact('trace_1');
  d.interact('curtains_living');
  d.interact('gun_safe');
  check('Evidence cleared', d.evidence.getVisibleSeverity() === 0 && d.evidence.isPistolHidden());
  openCloset(d);
  waitInFoyer(d);

  const vm = d.flow.getVisitorManager();
  check('The neighbour knocks', waitForKnock(d, 120) && vm.getActiveVisitor()?.type === 'neighbour');
  const counted = vm.getUnrepliedKnocks();
  d.run(7.5);
  check('Hides in the closet', hide(d));
  check('Hidden: slit view on, movement locked', !isHidden('hide-overlay') && (d.player as any).frozen === true);
  const knocksBefore = knocks;
  check('The neighbour knocks again while the player hides', d.runUntil(() => knocks > knocksBefore, 5));
  const knockAt = simClock.now();
  check('That knock is not counted as ignored', vm.getUnrepliedKnocks() === counted, `${vm.getUnrepliedKnocks()} vs ${counted}`);
  d.run(2.0);
  stepOut(d);
  check('Steps out of the closet', !d.flow.playerHidden && isHidden('hide-overlay') && (d.player as any).frozen === false);
  waitInFoyer(d);
  check('The neighbour is still waiting at 19s', d.runUntil(() => simClock.now() - knockAt >= 19, 30) && vm.isVisitorAtDoor());
  check('...and leaves ("nobody home") at 20s', d.runUntil(() => !vm.isVisitorAtDoor(), 2) && Math.abs(simClock.now() - knockAt - 20) < 0.2, `${(simClock.now() - knockAt).toFixed(2)}s`);
  check('No ignored knocks were added', vm.getUnrepliedKnocks() === counted);

  for (const who of ['officer', 'partner']) {
    check(`The ${who} knocks`, waitForKnock(d, 60) && vm.getActiveVisitor()?.type === who, d.phaseName);
    d.run(1.0);
    d.press('KeyT');
    check(`Talks the ${who} away`, !vm.isVisitorAtDoor());
  }
  d.runUntil(() => d.phase === GamePhase.ENDING, 30);
  checkEndingScreen(d, ending, 'clean');
  sm.playKnock = playKnock;
}

function hideWithBodyInView(): void {
  console.log('\nHIDE: with a body in plain view, the visitor breaks in');
  const { d, ending } = newGame(7);
  startGame(d);
  playAct1(d, false);
  openCloset(d);
  check('Severity is above 50 (bodies in the front rooms)', d.evidence.getVisibleSeverity() > 50);
  waitInFoyer(d);
  check('The neighbour knocks', waitForKnock(d, 120));
  d.run(7.5);
  check('Hides in the closet', hide(d));
  check('Next knock: forced entry and the ending is decided at once', d.runUntil(() => d.phase === GamePhase.ENDING, 5), d.phaseName);
  checkEndingScreen(d, ending, 'caught');
  check('Slit view is cleared at the ending', isHidden('hide-overlay'));
}

function hiddenParanoia(): void {
  console.log('\nHIDE: paranoia rises 10/s in the closet until BREAKDOWN');
  const { d, ending } = newGame(8);
  startGame(d);
  playAct1(d, false);
  openCloset(d);
  check('Hides in the closet', hide(d));
  const p0 = d.flow.paranoia;
  d.run(2.0);
  const rate = (d.flow.paranoia - p0) / 2;
  check('Paranoia rises 10 per second while hidden', Math.abs(rate - 10) < 0.2, `${rate.toFixed(2)}/s from ${p0.toFixed(1)}`);
  check('BREAKDOWN when paranoia reaches 100', d.runUntil(() => d.phase === GamePhase.ENDING, 12), `paranoia ${d.flow.paranoia.toFixed(0)}`);
  check('Paranoia maxed out', d.flow.paranoia >= 100);
  checkEndingScreen(d, ending, 'breakdown');
}

function hidingKeepsOtherSystems(): void {
  console.log('\nHIDE: pause, peephole and the RUN ending still work around hiding');
  const { d, ending } = newGame(9);
  startGame(d);
  playAct1(d, false);
  openCloset(d);
  check('Hides in the closet', hide(d));
  d.press('Digit2');
  d.click();
  check('Weapons are locked while hidden', d.arsenal.getPistolAmmo() === 2);
  const p = d.flow.paranoia;
  losePointerLock();
  d.run(5);
  check('Pause freezes paranoia while hidden', d.flow.isPaused && d.flow.paranoia === p);
  d.clickButton('btn-resume');
  check('Resume returns to the closet view', !d.flow.isPaused && d.flow.playerHidden);
  stepOut(d);
  check('Peephole works after hiding', d.interact('peephole') && (d.game as any).peepholeManager.isActive());
  d.press('KeyQ');
  check('Leaves the peephole', !(d.game as any).peepholeManager.isActive());
  check('Reaches the rear door', d.interact('door_rear'));
  d.run(0.5);
  d.press('KeyE');
  checkEndingScreen(d, ending, 'run');
}

function visitorSearchesWhileHidden(): void {
  console.log('\nHIDE: a visitor lets themselves in and searches while the player hides');
  const { d, ending } = newGame(10);
  startGame(d);
  playAct1(d, false);
  d.interact('trace_0');
  d.interact('trace_1');
  d.interact('sheet_bed_master');
  d.interact('body_father');
  d.interact('sheet_bed_spare');
  d.interact('body_mother');
  check('Only covered bodies remain: severity 40 (not above 50)', d.evidence.getVisibleSeverity() === 40);
  openCloset(d);
  waitInFoyer(d);
  const vm = d.flow.getVisitorManager();
  check('The neighbour knocks', waitForKnock(d, 120));
  const suspicionBefore = d.evidence.calculateSuspicion();
  check('Hides in the closet', hide(d));
  d.flow.scheduleForcedEntry(0.5); // e.g. after a failed excuse, they push the door
  d.run(1.0);
  check('Severity 50 or below: the visitor walks in and searches instead of arresting', d.flow.isVisitorSearching() && !vm.isVisitorAtDoor() && d.phase !== GamePhase.ENDING);
  check('Walking past the sheet in the living room makes them suspicious (not a witness)',
    d.runUntil(() => d.evidence.calculateSuspicion() > suspicionBefore, 8) && d.phase !== GamePhase.ENDING,
    `${suspicionBefore.toFixed(2)} -> ${d.evidence.calculateSuspicion().toFixed(2)}`);
  // At 10 paranoia/s the player breaks down about 10s into hiding, before the 25s search ends
  d.runUntil(() => d.phase === GamePhase.ENDING, 20);
  check('(Spec conflict, recorded) staying hidden through the 25s search ends in BREAKDOWN', ending() === 'breakdown', `${ending()}`);
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
bedsheets();
hideDuringKnock();
hideWithBodyInView();
hiddenParanoia();
hidingKeepsOtherSystems();
visitorSearchesWhileHidden();

console.log(`\n=== E2E: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
