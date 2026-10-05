import * as THREE from 'three';
import { GameFlow, GamePhase } from './src/game/GameFlow';
import { House } from './src/world/House';
import { Player } from './src/core/Player';
import { Evidence } from './src/core/Evidence';
import { Narration } from './src/story/Narration';
import { HUD } from './src/ui/HUD';
import { pages } from './src/ui/comicPanels';
import { EndingData } from './src/story/Endings';

// Mock DOM
const domElements: Record<string, HTMLElement> = {};
(global as any).document = {
  head: { appendChild: () => {} },
  body: { appendChild: () => {} },
  getElementById: (id: string) => {
    if (!domElements[id]) {
      domElements[id] = {
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false
        },
        style: {},
        innerText: '',
        onclick: null,
        requestPointerLock: () => {}
      } as any;
    }
    return domElements[id];
  },
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 256,
        height: 256,
        getContext: () => new Proxy({}, {
          get: (target, prop) => {
            if (prop === 'createRadialGradient') return () => ({ addColorStop: () => {} });
            return () => {};
          },
          set: () => true
        })
      };
    }
    return {
      style: {},
      appendChild: () => {},
      remove: () => {},
      classList: { add: () => {}, remove: () => {} },
      setAttribute: () => {}
    } as any;
  }
};
(global as any).window = { 
  innerWidth: 800, 
  innerHeight: 600,
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: (cb: any, t: number) => setTimeout(cb, t),
  clearTimeout: (id: any) => clearTimeout(id)
};

(global as any).performance = { now: () => Date.now() };
global.KeyboardEvent = class KeyboardEvent { code: string; repeat: boolean; constructor(type: string, dict: any) { this.code = dict.code; this.repeat = dict.repeat || false; } } as any;
console.log("--- RUNNING FLOW TEST ---");

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

// Helper to wait until a specific phase is reached
function waitUntilPhase(targetPhase: GamePhase, timeoutSeconds: number = 60) {
  const steps = Math.ceil(timeoutSeconds / 0.1);
  for (let i = 0; i < steps; i++) {
    gameFlow.update(0.1, true, 0);
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


  // 1. Initial State
  assert("Game starts in TITLE phase", gameFlow.phase === GamePhase.TITLE);
  gameFlow.advancePhase(); // TITLE -> MONTAGE
  
  assert("Advanced to MONTAGE phase", gameFlow.phase === GamePhase.MONTAGE);
  
  const montage = (gameFlow as any).montage;
  assert("Montage initialized", montage !== null);

  assert("Montage has 4 pages", pages.length === 4);
  const totalPanels = pages.reduce((sum, page) => sum + page.panels.length, 0);
  assert("Montage has 9 panels total", totalPanels === 9);

  assert("Montage starts on page 1", montage.pageIndex === 0 && montage.panelIndex === 0);
  
  // Test click advance
  montage.boundClick(); // Simulate click
  assert("Click advances to next panel", montage.panelIndex === 1);
  
  // Test Space advance
  montage.boundKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));
  assert("Space advances to next page", montage.pageIndex === 1 && montage.panelIndex === 0);
  
  // Simulate natural time progression
  let simulatedTime = 0;
  while (gameFlow.phase === GamePhase.MONTAGE && simulatedTime < 60) {
      gameFlow.update(0.1, false, 0);
      simulatedTime += 0.1;
  }
  assert("Ends by itself within 60 simulated seconds", simulatedTime < 60 && gameFlow.phase === GamePhase.ACT1_INTRO);
  
  // Wait for ACT1_INTRO to transition
  assert("Advanced to ACT1_INTRO", gameFlow.phase === GamePhase.ACT1_INTRO);
  

  gameFlow.reset();
  (gameFlow as any).hasPlayedMontage = false; // Force it to play again
  gameFlow.advancePhase(); // TITLE -> MONTAGE
  
  const montage2 = (gameFlow as any).montage;
  montage2.boundKeyDown(new KeyboardEvent('keydown', { code: 'Enter' }));
  gameFlow.update(0.5, false, 0);
  assert("Hold Enter 0.5s does NOT skip", gameFlow.phase === GamePhase.MONTAGE);

  gameFlow.update(0.6, false, 0);
  gameFlow.update(1.0, false, 0); // let fade finish
  assert("Hold Enter 1.0s DOES skip", gameFlow.phase === GamePhase.ACT1_INTRO);

  

  gameFlow.reset();
  gameFlow.advancePhase(); // TITLE -> MONTAGE (skips naturally this time)
  gameFlow.update(1.0, false, 0); // let fade finish
  assert("Skips montage on replay", gameFlow.phase === GamePhase.ACT1_INTRO);


  
  // We need to bypass ACT1_INTRO for the rest of the tests to run normally,
  // but ACT1_INTRO blocks input and waits 24s.
    // 3. Test INTRO full duration and pause
  gameFlow.reset();
  gameFlow.advancePhase(); // TITLE -> MONTAGE -> (auto skips to ACT1_INTRO)
  gameFlow.update(1.0, false, 0); // let fade finish
  
  // Pause test during INTRO
  gameFlow.isPaused = true;
  gameFlow.update(5.0, false, 0);
  assert("Pause stops intro clock", gameFlow.phase === GamePhase.ACT1_INTRO);
  gameFlow.isPaused = false;
  
  assert("Waited for ACT1_MOVIE naturally", waitUntilPhase(GamePhase.ACT1_MOVIE, 26));

gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_BLACKOUT, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_ARRIVAL, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_SHOOTING, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT1_POWER_BACK, 2);
gameFlow.advancePhase(); waitUntilPhase(GamePhase.ACT2_COVERUP, 2);

// Set paranoia high
gameFlow.paranoia = 98;
gameFlow.isPowerOn = false; // Dark
for(let i = 0; i < 20; i++) gameFlow.update(0.1, false, 0); // Advance 2s in dark
assert("Paranoia hit 100", gameFlow.paranoia >= 100);
assert("Triggered BREAKDOWN ending", (triggeredEnding as EndingData | null)?.type === 'breakdown');

// 4. Test RUN ending
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
assert("Triggered RUN ending", (triggeredEnding as EndingData | null)?.type === 'run');

console.log('Flow Test Complete: ' + pass + ' PASS, ' + fail + ' FAIL');
if (fail > 0) process.exit(1);
