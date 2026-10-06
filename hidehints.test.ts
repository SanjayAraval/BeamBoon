// Guidance for hiding the bodies: the objective names the spots and counts down, a first-grab
// toast (once), glowing markers and a "nearest hiding spot" hint only while dragging, a prompt
// from the middle of every spot, and a reminder after 60 s (then 120 s) if no body was touched.
// The real Game, headless, game clock.

import * as THREE from 'three';
import { resetHeadless, isHidden, elementText } from './test-support/headless';
import { Driver } from './test-support/driver';
import { GamePhase } from './src/game/GameFlow';
import { BODY_REMINDER_AFTER } from './src/game/Game';
import { DROP_ZONES, ZONE_GRACE, zoneCenter } from './src/game/BodyDrag';
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

// Captions shown, in order (the narrator caption carries the toast and the reminders)
let captions: string[] = [];

function toCoverUp(seed: number): Driver {
  resetHeadless();
  seedRandom(seed);
  const d = new Driver();
  const narration = (d.game as any).narration;
  const show = narration.showCaption.bind(narration);
  captions = [];
  narration.showCaption = (text: string, dur?: number) => { captions.push(text); show(text, dur); };
  d.clickButton('btn-start');
  d.holdKey('Enter', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3);
  d.clickButton('btn-resume');
  d.holdKey('Space', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_MOVIE, 3);
  const ok = d.playThroughAct1();
  check(`[seed ${seed}] Act 1 played through to the cover-up`, ok && d.phase === GamePhase.ACT2_COVERUP, d.phaseName);
  d.run(0.1);
  return d;
}

const objective = (d: Driver) => d.flow.getObjective();
const line = () => (document.getElementById('objective-line') as any).innerHTML as string;
const markersOn = (d: Driver) => (d.game as any).areDropMarkersVisible() as boolean;
const dragged = (d: Driver) => (d.game as any).getDraggedBody() as string | null;
const hint = () => elementText('drag-hint');
const tutorialCount = () => captions.filter(c => c === OBJECTIVES.dragTutorial).length;

console.log('--- RUNNING HIDING GUIDANCE TEST ---');

// 1. Objective text for each state; the toast once; markers and the nearest-spot hint ----------
{
  const d = toCoverUp(51);
  const text = objective(d).text;
  check('Bodies in the open: the objective says how (look, E, drag) and where', text === OBJECTIVES.hideBodies && line() === OBJECTIVES.hideBodies &&
    /look at a body, press E to drag it/.test(text) && /behind the living room sofa/.test(text) && /walk-in closet/.test(text) && /under a bed/.test(text), text);
  check('No markers, no hint before a body is grabbed', !markersOn(d) && isHidden('drag-hint'));

  // First grab: the toast, the markers, the hint
  check('Grab the father', d.interact('body_father') && dragged(d) === 'body_father');
  d.run(0.2);
  check('First grab: the tutorial toast', tutorialCount() === 1 && elementText('narrator-text') === OBJECTIVES.dragTutorial && !isHidden('narrator-caption'));
  const group = (d.game as any).dropMarkers as THREE.Group;
  const zonesMarked = new Set(group.children.map(c => c.name.replace('drop_marker_', '')));
  check('While dragging: a marker on every hiding spot', markersOn(d) && DROP_ZONES.every(z => zonesMarked.has(z.id)), [...zonesMarked].join());
  check('Markers sit on the right floor', DROP_ZONES.every(z => group.children.some(c => c.name === 'drop_marker_' + z.id && Math.abs(c.position.y - (z.floor * 3 + 0.03)) < 0.01)));
  const op1 = (group.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  const a = op1.opacity; d.run(0.4); const b = op1.opacity;
  check('The markers pulse, softly', a !== b && Math.max(a, b) <= 0.6, `${a.toFixed(2)} -> ${b.toFixed(2)}`);

  // Nearest spot by name, updating as the player moves
  d.placePlayer(5.0, 7.0, 0); d.run(0.1);
  const h1 = hint();
  check('Living room: "Nearest hiding spot: behind the living room sofa, N m"', !isHidden('drag-hint') && /^Nearest hiding spot: behind the living room sofa, \d+ m$/.test(h1), h1);
  d.placePlayer(8.0, 8.5, 0); d.run(0.1);
  check('...the distance updates as the player moves', hint() !== h1 && hint().includes('behind the living room sofa'), hint());
  d.placePlayer(3.5, 8.3, 1); d.run(0.1); // by the foot of the bed (the closet is 1.7 m away)
  check('Master bedroom: the master bed', hint().includes('under the master bed'), hint());
  d.placePlayer(1.1, 11.0, 1); d.run(0.1);
  check('In the closet: the walk-in closet, 0 m', hint() === 'Nearest hiding spot: the walk-in closet (master bedroom), 0 m', hint());
  d.placePlayer(12.0, 2.0, 1); d.run(0.1);
  check('Bathroom: the spare room bed', hint().includes('under the spare room bed'), hint());
  d.placePlayer(3.0, 3.0, 1); d.run(0.1);
  check('Your bedroom: your bed', hint().includes('under your bed'), hint());

  // The prompt from the middle of every spot, whichever way the player faces
  const misses: string[] = [];
  for (const z of DROP_ZONES) {
    const c = zoneCenter(z);
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      d.placePlayer(c.x, c.z, z.floor);
      (d.player as any).yaw = yaw;
      d.run(0.05);
      if (!/^\[E\] Hide body /.test(elementText('interaction-text'))) misses.push(`${z.id}@${yaw.toFixed(1)}: ${elementText('interaction-text')}`);
    }
  }
  check('"[E] Hide body ..." shows from the middle of every spot, facing any way', misses.length === 0, misses.join('; '));
  const small = DROP_ZONES.filter(z => Math.min(z.xMax - z.xMin, z.zMax - z.zMin) / 2 + ZONE_GRACE < 1.15).map(z => z.id);
  check(`Every spot is generous (half-size with the ${ZONE_GRACE} m grace >= ~1.2 m)`, small.length === 0, small.join());

  // Hide him behind the sofa from the middle of the zone
  const sofa = zoneCenter(DROP_ZONES.find(z => z.id === 'behind_sofa')!);
  d.placePlayer(sofa.x, sofa.z, 0);
  d.aimAt(new THREE.Vector3(2, 1.6, sofa.z)); // facing into the room: the body trails toward the archway
  d.run(0.1);
  d.press('KeyE');
  d.run(0.1);
  check('E in the middle of the sofa spot hides the body', dragged(d) === null && d.evidence.getBodies().find((x: any) => x.id === 'body_father').isHidden);
  check('Dropped: markers and hint gone', !markersOn(d) && isHidden('drag-hint'));
  check('One hidden: "One more body to hide."', objective(d).text === OBJECTIVES.oneMoreBody && line() === OBJECTIVES.oneMoreBody, line());

  // Second grab: no toast this time
  d.run(6); // the first toast is long gone
  check('Grab the mother', d.interact('body_mother') && dragged(d) === 'body_mother');
  d.run(0.2);
  check('Second grab: no tutorial toast (once per run)', tutorialCount() === 1, `${tutorialCount()}`);
  check('...but the markers show again', markersOn(d));
  d.press('KeyE');
  check('Dropped in the open: markers off', !markersOn(d));
  check('Hidden in the closet', d.hideBody('body_mother'));
  d.run(0.1);
  check('Both hidden: "Clean up evidence and wait for visitors."', objective(d).text === OBJECTIVES.cleanUp && line() === OBJECTIVES.cleanUp, line());
  check('No markers after both are hidden', !markersOn(d));
}

// 2. The reminder at 60 s, again at 120 s, then never; gone once a body is touched ---------------
{
  const d = toCoverUp(52);
  d.placePlayer(12, 8, 0); // the study, away from everything
  d.run(BODY_REMINDER_AFTER - 2);
  check(`No reminder before ${BODY_REMINDER_AFTER}s`, (d.game as any).getBodyHintsShown() === 0 && !captions.includes(OBJECTIVES.bodiesInTheOpen));
  d.run(3);
  check(`At ${BODY_REMINDER_AFTER}s: "${OBJECTIVES.bodiesInTheOpen}" (caption and objective hint)`,
    (d.game as any).getBodyHintsShown() === 1 && elementText('narrator-text') === OBJECTIVES.bodiesInTheOpen && objective(d).hint === OBJECTIVES.bodiesInTheOpen && line().includes(OBJECTIVES.bodiesInTheOpen));
  d.run(BODY_REMINDER_AFTER - 3);
  check('Not repeated before another 60s', (d.game as any).getBodyHintsShown() === 1);
  d.run(3);
  check('Repeated once at 120s', (d.game as any).getBodyHintsShown() === 2 && captions.filter(c => c === OBJECTIVES.bodiesInTheOpen).length === 2);
  d.run(BODY_REMINDER_AFTER + 5);
  check('...and never a third time', (d.game as any).getBodyHintsShown() === 2 || d.phase === GamePhase.ENDING, `${(d.game as any).getBodyHintsShown()}`);
}
{
  const d = toCoverUp(53);
  d.interact('body_father');
  d.run(0.5);
  d.press('KeyE'); // touched, then dropped in the open
  check('Grabbing a body clears the reminder line', objective(d).hint === '');
  d.run(BODY_REMINDER_AFTER * 2 + 5);
  check('A body was touched: no reminder', (d.game as any).getBodyHintsShown() === 0 && !captions.includes(OBJECTIVES.bodiesInTheOpen));
}
{
  const d = toCoverUp(54);
  check('Both hidden straight away', d.hideBody('body_father') && d.hideBody('body_mother'));
  d.run(BODY_REMINDER_AFTER * 2 + 5);
  check('No reminder after both bodies are hidden', (d.game as any).getBodyHintsShown() === 0 && objective(d).hint !== OBJECTIVES.bodiesInTheOpen);
}

console.log(`Hiding Guidance Test Complete: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
