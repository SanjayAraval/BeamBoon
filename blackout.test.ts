// The blackout is navigable before the flashlight is found: night-lights from the stairs to the
// bedroom door, a pulsing drawer, frequent long lightning, a 30s "follow the glow" hint, and a
// clear walking route from the living room to the drawer. All of it stops once the flashlight is taken.
// The real Game, headless, game clock.

import * as THREE from 'three';
import { resetHeadless, isHidden, elementText } from './test-support/headless';
import { Driver } from './test-support/driver';
import { SimState, walkTo } from './test-support/walkSim';
import { GamePhase, ACT1_FLASHLIGHT_GLOW_HINT_AFTER, ACT1_FLASHLIGHT_HINT_AFTER, SEARCH_LIGHTNING_MAX_INTERVAL, SEARCH_LIGHTNING_FLASH } from './src/game/GameFlow';
import { DRAWER_PROMPT_REACH } from './src/game/Game';
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

function toBlackout(seed: number): Driver {
  resetHeadless();
  seedRandom(seed);
  const d = new Driver();
  d.clickButton('btn-start');
  d.holdKey('Enter', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3);
  d.clickButton('btn-resume');
  d.holdKey('Space', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_MOVIE, 3);
  d.runUntil(() => d.phase === GamePhase.ACT1_BLACKOUT, 25);
  d.run(0.1);
  return d;
}

const lm = (d: Driver) => d.house.lightManager;
const guide = (d: Driver, id: string) => lm(d).getGuideLights().find((g: any) => g.id === id);
const lit = (g: any) => !!g && g.intensity > 0 && g.glowVisible;
const drawerLit = (d: Driver) => (d.game as any).isDrawerHighlighted() as boolean;
const objective = (d: Driver) => d.flow.getObjective();
const line = () => (document.getElementById('objective-line') as any).innerHTML as string;

// Run the game, noting when each lightning flash starts and how long it lasts
function sampleLightning(d: Driver, seconds: number): { starts: number[]; lengths: number[]; peak: number } {
  const starts: number[] = [];
  const lengths: number[] = [];
  let peak = 0;
  let was = d.flow.isLightningFlash();
  let t = 0;
  let start = 0;
  const step = 1 / 30;
  for (; t < seconds; t += step) {
    d.run(step);
    const now = d.flow.isLightningFlash();
    if (now && !was) { start = t; starts.push(t); }
    if (!now && was && starts.length) lengths.push(t - start);
    if (now) peak = Math.max(peak, lm(d).getLightningLevel());
    was = now;
  }
  return { starts, lengths, peak };
}

const gaps = (starts: number[]) => starts.slice(1).map((s, i) => s - starts[i]);

console.log('--- RUNNING BLACKOUT NAVIGATION TEST ---');

{
  const d = toBlackout(31);
  check('The blackout objective is "Find the flashlight"', d.flow.isFlashlightSearch() && objective(d).text === OBJECTIVES.findFlashlight);

  // (a) Night-lights and the drawer glow while the objective is active -----------------------
  check('Stairs landing night-light is on (point light + emissive)', lit(guide(d, 'stairs_landing')), JSON.stringify(guide(d, 'stairs_landing')));
  check('Bedroom doorway glow is on', lit(guide(d, 'bedroom_door')));
  check('Upstairs hall and stair-foot night-lights are on', lit(guide(d, 'upstairs_hall')) && lit(guide(d, 'stairs_bottom')));
  check('The desk drawer pulses (emissive + soft light)', drawerLit(d));
  const bedroomGlow = guide(d, 'bedroom_door')!.position;
  const doorDef = { x: 6, z: 2.5 };
  check('The doorway glow is at the player bedroom door', Math.hypot(bedroomGlow.x - doorDef.x, bedroomGlow.z - doorDef.z) < 0.3 && bedroomGlow.y > 3);
  check('Night-lights are not room lights (no false "lit room" relief)', !lm(d).isRoomLit('Upstairs Hall') && !lm(d).isRoomLit('Player Bedroom'));

  // (b) Lightning every 5-8s, ~0.4s long; (d) the 30s hint --------------------------------------
  d.placePlayer(4.5, 1.5, 0); // the kitchen, far from the drawer
  const early = sampleLightning(d, ACT1_FLASHLIGHT_GLOW_HINT_AFTER - 1.5);
  check(`No hint before ${ACT1_FLASHLIGHT_GLOW_HINT_AFTER}s`, objective(d).hint === '', objective(d).hint);
  const late = sampleLightning(d, 3);
  check(`At ${ACT1_FLASHLIGHT_GLOW_HINT_AFTER}s: "${OBJECTIVES.flashlightGlowHint}" (on screen)`,
    objective(d).hint === OBJECTIVES.flashlightGlowHint && line().includes(OBJECTIVES.flashlightGlowHint), objective(d).hint);
  const rest = sampleLightning(d, 40);
  const tAll = early.starts
    .concat(late.starts.map(s => s + ACT1_FLASHLIGHT_GLOW_HINT_AFTER - 1.5))
    .concat(rest.starts.map(s => s + ACT1_FLASHLIGHT_GLOW_HINT_AFTER + 1.5));
  const g = gaps(tAll);
  const firstAt = tAll[0] ?? Infinity;
  const lengths = early.lengths.concat(late.lengths, rest.lengths);
  check(`First flash within ${SEARCH_LIGHTNING_MAX_INTERVAL}s of the blackout`, firstAt <= SEARCH_LIGHTNING_MAX_INTERVAL, `${firstAt.toFixed(2)}s`);
  check(`Lightning cadence during the search is at most ${SEARCH_LIGHTNING_MAX_INTERVAL}s`, g.length >= 8 && Math.max(...g) <= SEARCH_LIGHTNING_MAX_INTERVAL + 0.05, g.map(x => x.toFixed(2)).join(', '));
  check('...and not a strobe (at least 5s apart)', Math.min(...g) >= 5 - 0.05, g.map(x => x.toFixed(2)).join(', '));
  check(`Each flash lasts about ${SEARCH_LIGHTNING_FLASH}s`, lengths.every(l => Math.abs(l - SEARCH_LIGHTNING_FLASH) < 0.06), lengths.map(x => x.toFixed(2)).join(', '));
  check('A flash visibly lights the floor', Math.max(early.peak, late.peak, rest.peak) > 0.8);
  check(`The ${ACT1_FLASHLIGHT_HINT_AFTER}s hint is unchanged and still comes`, d.runUntil(() => objective(d).hint === OBJECTIVES.flashlightHint, ACT1_FLASHLIGHT_HINT_AFTER) && line().includes(OBJECTIVES.flashlightHint));

  // (c) Walk from the start to the drawer, following the glow, and open it ---------------------
  const colliders = d.house.collisionBoxes;
  const start = { x: 4.3, z: 6.5 }; // where the blackout finds the player (houseLayout.spawns.player)
  const state: SimState = { x: start.x, y: 0, z: start.z, vy: 0 };
  const route: [string, number, number, number][] = [
    ['living room archway', 5.5, 8.5, 0],
    ['foyer', 8.0, 8.5, 0],
    ['foyer south', 8.0, 11.6, 0],
    ['stair entry', 9.4, 11.6, 0],
    ['foot of the stairs', 9.4, 11.4, 0],
    ['top of the stairs', 9.4, 7.2, 3],
    ['upstairs hall', 8.0, 5.5, 3],
    ['outside the bedroom door', 7.0, 2.5, 3]
  ];
  let ok = true;
  for (const [name, x, z, y] of route) {
    const reached = walkTo(state, x, z, colliders) && Math.abs(state.y - y) < 0.9;
    if (!reached) { ok = false; check(`Walk: reach ${name}`, false, `stuck at (${state.x.toFixed(2)}, ${state.y.toFixed(2)}, ${state.z.toFixed(2)})`); break; }
  }
  check('Walk: living room -> foyer -> stairs -> upstairs hall, nothing in the way', ok);

  // The bedroom door is shut: open it the way a player does (look at it, E)
  d.placePlayer(state.x, state.z, 1);
  d.settle();
  const doorHit = (d.interactions.interactables as any[]).find(i => i.id === 'door_player_bed').hitMesh.position as THREE.Vector3;
  d.aimAt(doorHit);
  check('The bedroom door offers "Open"', d.focusedId() === 'door_player_bed' && /^\[E\] Open/.test(elementText('interaction-text')), elementText('interaction-text'));
  d.press('KeyE');
  d.run(1.0);

  const stand = { x: 5.0, z: 2.6 }; // just inside the doorway, ~2.2 m from the drawer
  const inside = walkTo(state, 5.0, 2.5, colliders) && walkTo(state, stand.x, stand.z, colliders) && Math.abs(state.y - 3) < 0.2;
  check('Walk: through the bedroom door to the desk side, nothing in the way', inside, `(${state.x.toFixed(2)}, ${state.y.toFixed(2)}, ${state.z.toFixed(2)})`);

  d.placePlayer(state.x, state.z, 1);
  d.settle();
  const drawerHit = (d.interactions.interactables as any[]).find(i => i.id === 'drawer_player').hitMesh.position as THREE.Vector3;
  d.aimAt(drawerHit);
  const pos = d.player.getPosition() as THREE.Vector3;
  const reach = pos.distanceTo(drawerHit);
  check(`"[E] Open drawer" shows from ${reach.toFixed(2)} m (reach ${DRAWER_PROMPT_REACH} m, was 1.8 m)`,
    reach > 1.8 && d.focusedId() === 'drawer_player' && elementText('interaction-text') === '[E] Open drawer' && !isHidden('interaction-prompt'), elementText('interaction-text'));
  d.press('KeyE');
  d.settle();
  check('The drawer opens: "[E] Take flashlight"', elementText('interaction-text') === '[E] Take flashlight', elementText('interaction-text'));
  d.press('KeyE');
  d.run(0.5);
  check('Flashlight taken', d.flow.hasFlashlight && d.flashlight.isTurnedOn());

  // (a) After: no night-lights, no drawer glow; (b) the old lightning timing -------------------
  const all = lm(d).getGuideLights();
  check('After: every night-light is off (no light, no emissive)', all.every((x: any) => x.intensity === 0 && !x.glowVisible), JSON.stringify(all.map((x: any) => [x.id, x.intensity, x.glowVisible])));
  check('After: the drawer no longer glows', !drawerLit(d));
  check('After: the objective is no longer the search', !d.flow.isFlashlightSearch() && objective(d).text !== OBJECTIVES.findFlashlight);
}

// Old lightning timing once the flashlight is in hand (8 to 15s apart, 0.3s flashes)
{
  const d = toBlackout(32);
  check('Flashlight taken straight away', d.takeFlashlight());
  d.run(0.1);
  check('Search aids off at once', !drawerLit(d) && lm(d).getGuideLights().every((x: any) => x.intensity === 0));
  const s = sampleLightning(d, 45);
  const g = gaps(s.starts);
  check('After the flashlight: flashes 8 to 15s apart again', g.every(x => x >= 8 - 0.05 && x <= 15 + 0.35), g.map(x => x.toFixed(2)).join(', ') || `starts ${s.starts.map(x => x.toFixed(2)).join(', ')}`);
  check('After the flashlight: 0.3s flashes, and no search flash lighting', s.lengths.every(l => Math.abs(l - 0.3) < 0.06) && s.peak === 0, `${s.lengths.join(', ')} peak ${s.peak}`);
}

console.log(`Blackout Test Complete: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
