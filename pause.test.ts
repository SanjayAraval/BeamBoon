import { GameFlow, GamePhase } from './src/game/GameFlow';
import { Player } from './src/core/Player';
import { Flashlight } from './src/core/Flashlight';
import { Paranoia } from './src/game/Paranoia';
import * as THREE from 'three';

// Mock DOM for Player
(global as any).document = {
  getElementById: (id: string) => {
    if (id === 'webgl-canvas') return { requestPointerLock: () => {} };
    return null;
  },
  addEventListener: () => {}
};
(global as any).window = {
  addEventListener: () => {}
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const flashlight = new Flashlight(scene, camera);

// We need a dummy object for house and others to instantiate GameFlow
const mockHouse = {
  lightManager: {
    turnOffAll: () => {},
    turnOnAll: () => {}
  }
} as any;

const mockNarration = {
  showCaption: () => {},
  hideCaption: () => {}
} as any;

const mockSound = {
  playEffect: () => {},
  playFootstep: () => {},
  startHeartbeat: () => {},
  stopHeartbeat: () => {}
} as any;

const mockHud = {
  updateParanoia: () => {},
  showPhaseText: () => {},
  hidePhaseText: () => {},
  updateWeapon: () => {},
  showCrosshair: () => {},
  hideCrosshair: () => {}
} as any;

const player = new Player(camera, []);
const gameFlow = new GameFlow(scene, mockHouse, player, mockNarration, mockSound, mockHud);

let gameTime = 0;
let timeDelta = 0.1; // 100ms per frame

function tick(realDelta: number) {
  const delta = gameFlow.isPaused ? 0 : realDelta;
  if (!gameFlow.isPaused) {
    gameTime += delta;
    gameFlow.update(delta, flashlight.isTurnedOn(), gameTime);
    player.update(delta, gameFlow.paranoia, () => {});
  }
}

// TEST 1: Normal Time progression
gameFlow.phase = GamePhase.ACT1_BLACKOUT;
(gameFlow as any).phaseTimer = 0;

tick(0.1);
tick(0.1);
const beforePauseTimer = (gameFlow as any).phaseTimer;

if (beforePauseTimer !== 0.2) {
  console.log(`FAIL: Expected timer to be 0.2, got ${beforePauseTimer}`);
  process.exit(1);
} else {
  console.log("PASS: Simulated clock progresses normally.");
}

// TEST 2: Pausing stops the clock
gameFlow.isPaused = true;
player.setLocked(false); // Simulate pointer lock lost

tick(0.1);
tick(0.1);
tick(0.1);

if ((gameFlow as any).phaseTimer !== 0.2) {
  console.log(`FAIL: Timer should not progress while paused! Got ${(gameFlow as any).phaseTimer}`);
  process.exit(1);
} else {
  console.log("PASS: Pausing stops the simulated clock and game logic.");
}

// TEST 3: No input accepted while paused
// Simulate a keypress logic (similar to Player's onKeyDown but via our mock)
const keyboardEvent = { code: 'KeyW' } as KeyboardEvent;
(player as any).onKeyDown(keyboardEvent);

if (player.getKeyStates() !== 'NONE') {
  console.log(`FAIL: Input was accepted while paused/unlocked! Keys: ${player.getKeyStates()}`);
  process.exit(1);
} else {
  console.log("PASS: No input is accepted while paused.");
}

// TEST 4: Resuming restarts clock and input
gameFlow.isPaused = false;
player.setLocked(true);

tick(0.1);

if (Math.abs((gameFlow as any).phaseTimer - 0.3) > 0.0001) {
  console.log(`FAIL: Timer should resume! Got ${(gameFlow as any).phaseTimer}`);
  process.exit(1);
} else {
  console.log("PASS: Resuming restarts the clock.");
}

(player as any).onKeyDown(keyboardEvent);
if (player.getKeyStates() !== 'W') {
  console.log(`FAIL: Input should be accepted after resume! Keys: ${player.getKeyStates()}`);
  process.exit(1);
} else {
  console.log("PASS: Input is accepted after resume.");
}

console.log("=== PAUSE TESTS PASSED ===");
