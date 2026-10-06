// Pause test: the real Game, the real PauseMenu (#pause-overlay and its buttons) and the real
// frame clock, driven headless on a simulated wall clock. Pausing is triggered the way the
// browser does it (pointer lock lost on Esc) and resumed with the Resume button. During the
// intro comic the cursor is free, so there Esc itself opens and closes the pause menu.

import { readFileSync } from 'node:fs';
import { simClock, losePointerLock, isHidden, keyDown, keyUp, pressKey, reloads, resetHeadless, comicRoot, indexHtml } from './test-support/headless';
import { Driver, FRAME } from './test-support/driver';
import { GamePhase } from './src/game/GameFlow';
import { MAX_FRAME_DELTA } from './src/game/Game';

let pass = 0;
let fail = 0;
function check(desc: string, cond: boolean, detail = ''): void {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${desc}${!cond && detail ? ` (${detail})` : ''}`);
  if (cond) pass++; else fail++;
}

// Wall time passes and the browser keeps rendering frames (pause menu on screen)
function wallFrames(d: Driver, seconds: number): void {
  d.run(seconds);
}

resetHeadless();
Math.random = () => 0.5;
const d = new Driver();
const game = d.game;
const pauseMenu = (game as any).pauseMenu;

// Esc on the title screen is not a pause
losePointerLock();
check('No pause on the title screen', !d.flow.isPaused && isHidden('pause-overlay'));

// --- Pause over the intro comic ---------------------------------------------------------
d.clickButton('btn-start');
check('Comic is playing', d.phase === GamePhase.MONTAGE && comicRoot() !== null);
d.run(1.0);
const comic = (d.flow as any).comic;
const beat = comic.beat;
const zOf = (re: RegExp, src: string) => Number(re.exec(src)?.[1]);
const comicSrc = readFileSync('src/ui/ComicPlayer.ts', 'utf8');
check('Pause overlay stacks above the comic',
  zOf(/id="pause-overlay"[^>]*z-index:\s*(\d+)/, indexHtml) > zOf(/\.cmc-root\{[^}]*z-index:(\d+)/, comicSrc) &&
  zOf(/id="settings-modal"[^>]*z-index:\s*(\d+)/, indexHtml) > zOf(/\.cmc-root\{[^}]*z-index:(\d+)/, comicSrc));
pressKey('Escape');
check('Esc during the comic opens the pause menu', d.flow.isPaused && !isHidden('pause-overlay'));
check('The comic is paused with it', comic.paused === true && comicRoot()!.classList.contains('cmc-paused'));
const comicClock = game.getGameTime();
wallFrames(d, 30);
check('Comic and game clock are frozen while paused', comic.beat === beat && game.getGameTime() === comicClock && d.phase === GamePhase.MONTAGE);
pressKey('Escape');
check('Esc again closes the pause menu and resumes the comic', !d.flow.isPaused && isHidden('pause-overlay') && comic.paused === false);
pressKey('Escape');
d.clickButton('btn-resume');
check('Resume button resumes the comic without grabbing the pointer', !d.flow.isPaused && comic.paused === false && !d.player.isLocked());
d.run(6.0);
check('Comic plays on after resume', comic.beat > beat);

d.holdKey('Enter', 1.2);
d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3);
d.clickButton('btn-resume'); // "Click to continue" after the comic
d.holdKey('Space', 1.2);
d.run(1.0);
check('Reached free roam (ACT1_MOVIE) with pointer lock', d.phase === GamePhase.ACT1_MOVIE && d.player.isLocked());

d.run(2.0);
const clockBefore = game.getGameTime();
const timerBefore = (d.flow as any).phaseTimer;
check('Game clock runs while playing', timerBefore > 1.9, `phaseTimer ${timerBefore}`);

// --- Pause -----------------------------------------------------------------------------
losePointerLock();
check('Losing pointer lock (Esc) pauses the game', d.flow.isPaused);
check('Pause menu is visible', pauseMenu.isVisible() && !isHidden('pause-overlay'));

const pos = d.player.getPosition().clone();
const paranoia = d.flow.paranoia;
const flashlightOn = d.flashlight.isTurnedOn();
keyDown('KeyW');
d.press('KeyF');
wallFrames(d, 30); // longer than the 20s movie phase
keyUp('KeyW');

check('Game clock is frozen while paused', game.getGameTime() === clockBefore, `${game.getGameTime()} vs ${clockBefore}`);
check('Phase timer is frozen while paused', (d.flow as any).phaseTimer === timerBefore);
check('Phase does not advance while paused (20s movie timer, 30s paused)', d.phase === GamePhase.ACT1_MOVIE, d.phaseName);
check('Paranoia does not change while paused', d.flow.paranoia === paranoia);
check('Movement keys are ignored while paused', d.player.getPosition().equals(pos) && d.player.getKeyStates() === 'NONE');
check('Flashlight key is ignored while paused', d.flashlight.isTurnedOn() === flashlightOn);

// --- Resume ----------------------------------------------------------------------------
// The tab was hidden for a minute: no frames rendered, but wall time moved on
simClock.advance(60);
d.clickButton('btn-resume');
check('Resume button re-locks the pointer and unpauses', !d.flow.isPaused && d.player.isLocked());
check('Pause menu is hidden after resume', !pauseMenu.isVisible() && isHidden('pause-overlay'));
d.settle();
check('Time spent paused is not fed into the first frame back', game.getGameTime() === clockBefore, `jumped ${game.getGameTime() - clockBefore}s`);

d.run(1.0);
const advanced = game.getGameTime() - clockBefore;
check('Game clock runs again after resume', Math.abs(advanced - 1.0) < FRAME, `advanced ${advanced}`);
d.holdKey('KeyW', 0.5);
check('Movement works again after resume', !d.player.getPosition().equals(pos));

// --- Frame hitch -----------------------------------------------------------------------
const t0 = game.getGameTime();
simClock.advance(5);
d.settle();
check(`A 5s hitch advances the game by at most ${MAX_FRAME_DELTA}s`, Math.abs(game.getGameTime() - t0 - MAX_FRAME_DELTA) < 1e-9);

// --- A visitor forcing their way in waits for the player to come back ------------------
d.runUntil(() => d.phase === GamePhase.ACT2_COVERUP, 80);
d.placePlayer(7.4, 10.6, 0);
d.interact('switch_light_foyer');
d.placePlayer(7.4, 10.6, 0);
check('A visitor knocks', d.runUntil(() => d.flow.getVisitorManager().isVisitorAtDoor(), 120), d.phaseName);
d.flow.scheduleForcedEntry(2.0);
losePointerLock();
wallFrames(d, 10);
check('Paused: the forced entry does not happen', d.phase !== GamePhase.ENDING && d.phase !== GamePhase.FINAL_INSPECTION, d.phaseName);
d.clickButton('btn-resume');
d.run(2.2);
check('After resume the visitor pushes in on the game clock', d.phase === GamePhase.ENDING, d.phaseName);

// --- Restart from the pause menu -------------------------------------------------------
resetHeadless();
const d2 = new Driver();
d2.clickButton('btn-start');
d2.holdKey('Enter', 1.2);
d2.runUntil(() => d2.phase === GamePhase.ACT1_INTRO, 3);
d2.clickButton('btn-resume');
d2.holdKey('Space', 1.2);
d2.run(1.0);
losePointerLock();
d2.clickButton('btn-restart');
check('Restart button in the pause menu reloads the game', reloads.count === 1);

console.log(pass + ' PASS, ' + fail + ' FAIL');
if (fail > 0) {
  process.exit(1);
}
console.log('=== PAUSE TESTS PASSED ===');
process.exit(0);
