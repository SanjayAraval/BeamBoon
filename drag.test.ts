// Body dragging: grab / drop, half speed, the body trailing behind, drop zones (hidden) vs the
// open floor (still evidence), noise, automatic release, and the sheet cover still working.

import { resetHeadless, keyDown, keyUp, elementText } from './test-support/headless';
import { Driver } from './test-support/driver';
import * as THREE from 'three';
import { GamePhase } from './src/game/GameFlow';
import { DRAG_SPEED_FACTOR, DRAG_TRAIL_DISTANCE, DRAG_NOISE_PER_METER, findDropZone, DROP_ZONES } from './src/game/BodyDrag';
import { SEVERITY, Evidence } from './src/core/Evidence';
import { Endings } from './src/story/Endings';

let pass = 0;
let fail = 0;
function check(desc: string, cond: boolean, detail = ''): void {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${desc}${!cond && detail ? ` (${detail})` : ''}`);
  if (cond) pass++; else fail++;
}

function toCoverUp(seed: number): Driver {
  resetHeadless();
  let a = seed;
  Math.random = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  const d = new Driver();
  d.clickButton('btn-start');
  d.holdKey('Enter', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3);
  d.clickButton('btn-resume');
  d.holdKey('Space', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_MOVIE, 3);
  d.playThroughAct1();
  d.run(0.5);
  return d;
}

const dragged = (d: Driver) => (d.game as any).getDraggedBody() as string | null;
const body = (d: Driver, id: string) => d.evidence.getBodies().find((b: any) => b.id === id);
const root = (d: Driver, kind: 'father' | 'mother') => d.flow.getParentRoot(kind)!.position;
const flat = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

// Walk forward for `seconds` (WASD) and return the distance covered
function walk(d: Driver, seconds: number): number {
  const start = d.player.getPosition().clone();
  keyDown('KeyW');
  d.run(seconds);
  keyUp('KeyW');
  return flat(start, d.player.getPosition());
}

console.log('--- RUNNING BODY DRAG TEST ---');

{
  const d = toCoverUp(51);
  check('Zones: closet and under each bed upstairs, behind the sofa downstairs', DROP_ZONES.map(z => z.id).join() === 'closet,under_bed_master,under_bed_player,under_bed_spare,behind_sofa');

  // Normal speed first, in the open foyer, facing north (-z)
  d.placePlayer(8.0, 11.0, 0);
  d.aimAt(new THREE.Vector3(8.0, 1.6, 0));
  const normal = walk(d, 0.5);

  check('Looking at a body: "[E] Drag body"', d.approach('body_father') && elementText('interaction-text') === '[E] Drag body', elementText('interaction-text'));
  d.press('KeyE');
  check('E grabs it', dragged(d) === 'body_father');
  d.run(0.2);
  check(`It trails about ${DRAG_TRAIL_DISTANCE} m behind, on the floor`, Math.abs(flat(root(d, 'father'), d.player.getPosition()) - DRAG_TRAIL_DISTANCE) < 0.05 && root(d, 'father').y === 0);

  d.placePlayer(8.0, 11.0, 0);
  d.aimAt(new THREE.Vector3(8.0, 1.6, 0));
  d.run(0.2);
  const noise0 = d.evidence.getTotalNoise();
  const slow = walk(d, 0.5);
  check(`Half speed while dragging (${normal.toFixed(2)} m -> ${slow.toFixed(2)} m in 0.5s)`, Math.abs(slow / normal - DRAG_SPEED_FACTOR) < 0.03 && d.player.getSpeedFactor() === DRAG_SPEED_FACTOR);
  const moreNoise = walk(d, 1.5) + slow;
  const noise = d.evidence.getTotalNoise() - noise0;
  check(`Dragging makes noise: ${noise} for ${moreNoise.toFixed(1)} m (${DRAG_NOISE_PER_METER}/m)`, noise >= Math.floor(moreNoise * DRAG_NOISE_PER_METER) - 1 && noise <= Math.ceil(moreNoise * DRAG_NOISE_PER_METER) + 1 && noise > 0);
  // (here suspicion is already maxed out by the bodies, so show the noise part on a tidy house)
  const tidy = new Evidence();
  for (const b of tidy.getBodies()) tidy.hideBody(b.id);
  for (const t of tidy.getBloodTraces()) tidy.cleanBloodTrace(t.id);
  tidy.setCurtainsClosed(true);
  tidy.setPistolHidden(true);
  const quiet = tidy.calculateSuspicion();
  tidy.addNoise(noise);
  check(`...which feeds suspicion (tidy house: ${quiet.toFixed(2)} -> ${tidy.calculateSuspicion().toFixed(2)})`, tidy.calculateSuspicion() > quiet && d.evidence.getTotalNoise() > noise0);

  // One body at a time: E now drops; the prompt says so
  check('While dragging the prompt says "[E] Drop body"', elementText('interaction-text') === '[E] Drop body', elementText('interaction-text'));
  const sevBefore = d.evidence.getBodySeverity('body_father');
  d.press('KeyE');
  const where = root(d, 'father').clone();
  check('E drops it, speed back to normal', dragged(d) === null && d.player.getSpeedFactor() === 1);
  check('Dropped in the hall (no zone): still visible evidence, now where it lies', !body(d, 'body_father').isHidden && d.evidence.getBodySeverity('body_father') === sevBefore &&
    d.evidence.getExposedBodiesCount() === 2 && Math.abs(body(d, 'body_father').position.x - where.x) < 1e-6 && findDropZone(where.x, where.z, 0) === null);
  check('It can be grabbed again where it now lies', d.approach('body_father') && elementText('interaction-text') === '[E] Drag body');
  d.press('KeyE');
  check('Grabbed again', dragged(d) === 'body_father');

  // Upstairs into the walk-in closet
  d.placePlayer(1.1, 10.4, 1);
  d.aimAt(new THREE.Vector3(1.1, 4.6, 8));
  d.run(0.2);
  check('In the closet the prompt says "[E] Hide body in the closet"', elementText('interaction-text') === '[E] Hide body in the closet', elementText('interaction-text'));
  d.press('KeyE');
  check('Dropped in the closet: hidden', body(d, 'body_father').isHidden && dragged(d) === null);
  check(`Hidden counts 0, less than a sheet (${SEVERITY.body * SEVERITY.coveredBodyFactor}), and not visible to visitors`,
    d.evidence.getBodySeverity('body_father') === 0 && d.evidence.getExposedBodiesCount() === 1 && !d.flow.getParentRoot('father')!.visible);
  check('A hidden body is no longer grabbable', !d.interactions.interactables.some((i: any) => i.id === 'body_father'));

  // Under the master bed, after covering Mother with a sheet: the cover still works and the sheet travels with her
  d.interact('sheet_bed_spare');
  d.interact('body_mother');
  check('Sheet cover still works', body(d, 'body_mother').isCovered && d.evidence.getBodySeverity('body_mother') === SEVERITY.body * SEVERITY.coveredBodyFactor);
  check('A covered body offers "Drag body"', d.approach('body_mother') && elementText('interaction-text') === '[E] Drag body');
  d.press('KeyE');
  const drape = (d.game as any).bodySheets.get('body_mother') as THREE.Group;
  d.placePlayer(5.8, 6.2, 1);
  d.aimAt(new THREE.Vector3(10, 4.6, 6.2)); // facing east: she trails west, beside the bed
  d.run(0.2);
  check('The sheet travels with the body', flat(drape.position, root(d, 'mother')) < 1e-6);
  check('Next to the double bed: "[E] Hide body under the double bed"', elementText('interaction-text') === '[E] Hide body under the double bed', elementText('interaction-text'));
  d.press('KeyE');
  check('Under the bed: hidden, sheet gone, severity 0', body(d, 'body_mother').isHidden && drape.parent === null && d.evidence.getBodySeverity('body_mother') === 0);
  check('No bodies left in view', d.evidence.getExposedBodiesCount() === 0 && d.evidence.getVisibleSeverity() <= SEVERITY.bloodTrace);
}

// Ground floor: behind the sofa ------------------------------------------------------------------
{
  const d = toCoverUp(53);
  check('Grab Mother', d.approach('body_mother') && (d.press('KeyE'), dragged(d) === 'body_mother'));
  d.placePlayer(6.4, 8.5, 0);
  d.aimAt(new THREE.Vector3(12, 1.6, 8.5)); // facing the foyer, she trails behind the sofa
  d.run(0.2);
  check('Behind the sofa: "[E] Hide body behind the sofa"', elementText('interaction-text') === '[E] Hide body behind the sofa', elementText('interaction-text'));
  d.press('KeyE');
  check('Hidden exactly like upstairs: severity 0, invisible, not counted',
    body(d, 'body_mother').isHidden && d.evidence.getBodySeverity('body_mother') === 0 && !d.flow.getParentRoot('mother')!.visible && d.evidence.getExposedBodiesCount() === 1);
  check('Father into the upstairs closet', d.hideBody('body_father') && d.evidence.getExposedBodiesCount() === 0);
  // With everything else tidied, a body behind the sofa is as safe as one upstairs
  for (const t of d.evidence.getBloodTraces()) d.evidence.cleanBloodTrace(t.id);
  d.evidence.setCurtainsClosed(true);
  d.evidence.setPistolHidden(true);
  const result = Endings.calculateEnding(10, d.evidence);
  check(`Otherwise clean house, one body behind the sofa: the inspection ends ${result.type.toUpperCase()}`, result.type === 'clean' && d.evidence.getVisibleSeverity() === 0);
}

// Automatic release ---------------------------------------------------------------------------
{
  const d = toCoverUp(52);
  const g = d.game as any;
  const grab = () => { d.approach('body_father'); d.press('KeyE'); return dragged(d) === 'body_father'; };

  check('Grab, then a visitor arrives', grab() && d.runUntil(() => d.flow.getVisitorManager().isVisitorAtDoor(), 120));
  d.run(0.1);
  check('A visitor arriving makes you let go', dragged(d) === null && d.player.getSpeedFactor() === 1);

  check('Grab, then the peephole opens', grab());
  g.enterPeephole();
  check('The peephole makes you let go', dragged(d) === null && g.peepholeManager.isActive());
  d.press('KeyQ');

  check('Grab, then hide in the closet', grab());
  const door = d.house.animatedDoors.find((x: any) => x.id === 'door_closet');
  door.isOpen = true;
  g.enterHiding();
  check('Hiding makes you let go', dragged(d) === null);
  d.run(0.4);
  d.press('KeyE');
  d.run(0.4);

  check('Grab, then a cutscene blocks input', grab());
  d.flow.blockInput = true;
  d.run(0.1);
  check('A cutscene makes you let go', dragged(d) === null);
  d.flow.blockInput = false;

  check('Grab, then talk to the visitor', grab());
  d.placePlayer(7.4, 10.6, 0);
  d.run(0.2);
  d.press('KeyT');
  check('Opening the door to talk makes you let go', dragged(d) === null && g.isDialogueOpen());
}

console.log(`Drag Test Complete: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
