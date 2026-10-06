// Game flow test: drives the real GameFlow (with the real House, HUD, Narration and intro comic)
// on a simulated clock. The DOM, timers and Web Audio come from the headless shim.

import { simClock, resetHeadless, keyDown, keyUp, mouseDownOn, comicRoot, windowListenerCount } from './test-support/headless';
import * as THREE from 'three';
import { GameFlow, GamePhase, ACT2_DARKNESS_CEILING } from './src/game/GameFlow';
import { House } from './src/world/House';
import { Player } from './src/core/Player';
import { Evidence } from './src/core/Evidence';
import { Narration } from './src/story/Narration';
import { HUD } from './src/ui/HUD';
import { EndingData } from './src/story/Endings';
import { COMIC_PAGES } from './src/ui/ComicPlayer';
import { SoundManager } from './src/audio/SoundManager';

console.log('--- RUNNING FLOW TEST ---');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const house = new House(scene);
const player = new Player(camera);
const evidence = new Evidence();
const narration = new Narration();
const hud = new HUD();

let triggeredEnding: EndingData | null = null;
const gameFlow = new GameFlow(scene, house, player, evidence, narration, hud, (ending) => {
  triggeredEnding = ending;
});
const comic = () => (gameFlow as any).comic;

// Record which comic cues reach the SoundManager, and which sounds they play
const sound = SoundManager.getInstance() as any;
const cues: string[] = [];
const played: string[] = [];
const playComicCue = sound.playComicCue.bind(sound);
sound.playComicCue = (cue: string) => { cues.push(cue); playComicCue(cue); };
const audio = sound.audio;
for (const name of ['playThunder', 'playTVAudio', 'playLampClick', 'playHeartbeatPulse', 'playCreak', 'playDoorKnock', 'playGroan']) {
  const original = audio[name].bind(audio);
  audio[name] = (...args: unknown[]) => { played.push(name); return original(...args); };
}

// One frame: wall time and game time advance together (timers fire on the same clock)
function step(dt: number, flashlightOn = false): void {
  simClock.advance(dt);
  gameFlow.update(dt, flashlightOn, 0);
}

function waitUntilPhase(targetPhase: GamePhase, timeoutSeconds = 60): boolean {
  const steps = Math.ceil(timeoutSeconds / 0.1);
  for (let i = 0; i < steps; i++) {
    step(0.1, true);
    if (gameFlow.phase === targetPhase) return true;
  }
  console.log(`waitUntilPhase failed. Current phase: ${GamePhase[gameFlow.phase]}`);
  return false;
}

let pass = 0;
let fail = 0;
function assert(desc: string, cond: boolean) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${desc}`);
  if (cond) pass++; else fail++;
}

// --- 1. Sound cues: each comic cue maps to one short existing sound; others play nothing ----
played.length = 0;
sound.playComicCue('thunder');
sound.playComicCue('tv');
sound.playComicCue('click');
sound.playComicCue('heartbeat');
assert("Cues play thunder / TV murmur / click / one heartbeat", played.join() === 'playThunder,playTVAudio,playLampClick,playHeartbeatPulse');
played.length = 0;
sound.playComicCue('creak');
sound.playComicCue('knock');
sound.playComicCue('anything-else');
assert('Other cues play nothing', played.length === 0);
cues.length = 0;

// --- 2. The comic plays by itself and hands off to ACT1_INTRO within 60 simulated seconds ---
assert('Game starts in TITLE phase', gameFlow.phase === GamePhase.TITLE);
const baseListeners = windowListenerCount();
gameFlow.advancePhase(); // TITLE -> MONTAGE
assert('Advanced to MONTAGE phase', gameFlow.phase === GamePhase.MONTAGE);
assert('Comic player created and shown on the page', comic() !== null && comicRoot() !== null);
const panelCount = COMIC_PAGES.reduce((n, p) => n + p.panels.length, 0);
assert(`Comic has ${COMIC_PAGES.length} pages, ${panelCount} panels`, COMIC_PAGES.length === 5 && panelCount === 9);
assert('Comic starts on the first panel', comic().beat === 0);
assert('First panel cue (thunder) reached the SoundManager', cues[0] === 'thunder');

// Pausing freezes the comic: GameFlow is not updated while paused (as in Game.step) and the comic is told
gameFlow.setPaused(true);
assert('Pause is forwarded to the comic', comic().paused === true && comicRoot()!.classList.contains('cmc-paused'));
simClock.advance(30); // 30s of wall time with the pause menu open
assert('Comic does not move while paused', comic().beat === 0 && gameFlow.phase === GamePhase.MONTAGE);
gameFlow.setPaused(false);
assert('Unpause is forwarded to the comic', comic().paused === false && !comicRoot()!.classList.contains('cmc-paused'));

// Clicking the comic: the first click completes the caption, the next one turns the panel
step(0.5);
mouseDownOn(comicRoot()!);
mouseDownOn(comicRoot()!);
assert('Clicking advances to the next panel', comic().beat === 1);

// Let it play out on the game clock
let elapsed = 0.5;
while (gameFlow.phase === GamePhase.MONTAGE && elapsed < 60) {
  step(0.1);
  elapsed += 0.1;
}
assert(`Ends by itself within 60 simulated seconds (took ${elapsed.toFixed(1)}s)`, elapsed < 60);
assert('Hands off to ACT1_INTRO', gameFlow.phase === GamePhase.ACT1_INTRO);
assert('Comic is disposed and removed from the page', comic() === null && comicRoot() === null);
assert("Comic's key listeners are removed", windowListenerCount() === baseListeners);
assert('All comic cues reached the SoundManager in order', cues.join() === COMIC_PAGES.flatMap(p => p.panels.map(x => x.cue)).filter(Boolean).join());

// --- 3. Play Again replays the comic; holding Enter for 1s skips it -------------------------
gameFlow.reset();
assert('Play Again returns to the title', gameFlow.phase === GamePhase.TITLE);
gameFlow.advancePhase();
assert('Play Again shows the comic again (replay)', gameFlow.phase === GamePhase.MONTAGE && comic() !== null && comicRoot() !== null && comic().beat === 0);

keyDown('Enter');
for (let i = 0; i < 5; i++) step(0.1);
assert('Holding Enter 0.5s does NOT skip', gameFlow.phase === GamePhase.MONTAGE && !comic().finished);
for (let i = 0; i < 6; i++) step(0.1);
keyUp('Enter');
assert('Holding Enter 1.0s skips the comic', comic()?.finished === true);
assert('Skip hands off to ACT1_INTRO', waitUntilPhase(GamePhase.ACT1_INTRO, 3) && comicRoot() === null);

// Play Again in the middle of the comic disposes it
gameFlow.reset();
gameFlow.advancePhase();
const midway = comic();
step(2);
gameFlow.reset();
assert('Play Again mid-comic disposes it', comic() === null && comicRoot() === null && midway.cleanup.length === 0);

// A comic that finishes after it was replaced must not advance the new game
gameFlow.advancePhase();
midway.opts.onDone();
step(0.1);
assert("A stale comic's onDone is ignored", gameFlow.phase === GamePhase.MONTAGE);

// --- 4. Intro runs on the game clock and stops while paused ---------------------------------
gameFlow.advancePhase(); // skip the comic
assert('Reached ACT1_INTRO', waitUntilPhase(GamePhase.ACT1_INTRO, 2));
gameFlow.setPaused(true);
for (let i = 0; i < 50; i++) simClock.advance(0.1); // paused: GameFlow is not updated
assert('Pause stops intro clock', gameFlow.phase === GamePhase.ACT1_INTRO);
gameFlow.setPaused(false);
assert('Waited for ACT1_MOVIE naturally', waitUntilPhase(GamePhase.ACT1_MOVIE, 26));

// --- 5. Act 1 waits for the flashlight, then the gun ----------------------------------------
assert('The movie ends in the blackout by itself', waitUntilPhase(GamePhase.ACT1_BLACKOUT, 22));
assert('No flashlight: the blackout never ends (60s)', !waitUntilPhase(GamePhase.ACT1_ARRIVAL, 60));
gameFlow.takeFlashlight();
assert('Flashlight found: door unlock, door comic, then the parents arrive', waitUntilPhase(GamePhase.ACT1_ARRIVAL, 30));
assert('No gun: the arrival never turns into the shooting (130s)', !waitUntilPhase(GamePhase.ACT1_SHOOTING, 130));
gameFlow.handlePlayerAttack();
assert('Attacking without the gun does nothing', gameFlow.phase === GamePhase.ACT1_ARRIVAL);
gameFlow.takeGun();
gameFlow.handlePlayerAttack();
assert('With the gun, attacking starts the shooting', gameFlow.phase === GamePhase.ACT1_SHOOTING);

// --- 6. Breakdown ending --------------------------------------------------------------------
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_POWER_BACK, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT2_COVERUP, 2);

gameFlow.paranoia = 40;
gameFlow.isPowerOn = false; // Dark
for (let i = 0; i < 300; i++) step(0.1); // 30s in the dark
assert('Darkness alone stops at the Act 2 ceiling (no breakdown from standing still)', gameFlow.paranoia <= ACT2_DARKNESS_CEILING + 3 && gameFlow.phase === GamePhase.ACT2_COVERUP);
gameFlow.paranoia = 98;
gameFlow.setPlayerHidden(true); // a real mistake: staying hidden in the cramped closet
for (let i = 0; i < 20; i++) step(0.1);
assert('Paranoia hit 100', gameFlow.paranoia >= 100);
assert('Triggered BREAKDOWN ending', (triggeredEnding as EndingData | null)?.type === 'breakdown');

// --- 6. Run ending --------------------------------------------------------------------------
gameFlow.reset();
triggeredEnding = null;
gameFlow.advancePhase(); // TITLE -> MONTAGE
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_INTRO, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_MOVIE, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_BLACKOUT, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_ARRIVAL, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_SHOOTING, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_POWER_BACK, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT2_COVERUP, 2);
gameFlow.tryRunEnding();
assert('Triggered RUN ending', (triggeredEnding as EndingData | null)?.type === 'run');

console.log('Flow Test Complete: ' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail > 0 ? 1 : 0);
