// Visitor dialogue: doubt math, modifiers, best/worst answers, early end at 100 doubt, and the
// real Game (keys 1-3, Esc/pause, pointer lock, outcomes, no soft lock).

import { resetHeadless, isHidden, pressKey, losePointerLock, pointerLockStats, elementText } from './test-support/headless';
import { Driver } from './test-support/driver';
import { GamePhase } from './src/game/GameFlow';
import { Evidence } from './src/core/Evidence';
import {
  DIALOGUES, DialogueSession, VisitorType, startingDoubt, answerDoubt, bestAnswer, worstAnswer,
  DOUBT_FAIL, DOUBT_PASS_BELOW, DOUBT_START_MAX, DOUBT_START_MAX_HIGH_SEVERITY, startingDoubtCap,
  LIE_HIGH_SEVERITY_DOUBT, NERVOUS_DOUBT, CALM_BONUS, ANSWER_PARANOIA
} from './src/game/VisitorDialogue';

let pass = 0;
let fail = 0;
function check(desc: string, cond: boolean, detail = ''): void {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${desc}${!cond && detail ? ` (${detail})` : ''}`);
  if (cond) pass++; else fail++;
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const VISITORS: VisitorType[] = ['neighbour', 'officer', 'partner'];

console.log('--- RUNNING DIALOGUE TEST ---');

// 1. Starting doubt from the real evidence values --------------------------------------------
check('Starting doubt: 10 + 40*severity + 30*suspicion', near(startingDoubt(0, 0), 10) && near(startingDoubt(0.5, 0.2), 36) && near(startingDoubt(0.2, 0.5), 33));
check(`Cap: ${DOUBT_START_MAX} up to 50% severity, ${DOUBT_START_MAX_HIGH_SEVERITY} above`, startingDoubtCap(0) === DOUBT_START_MAX && startingDoubtCap(0.5) === DOUBT_START_MAX && startingDoubtCap(0.51) === DOUBT_START_MAX_HIGH_SEVERITY && startingDoubtCap(1) === DOUBT_START_MAX_HIGH_SEVERITY);
check('High severity can reach the 80 cap; at 50% severity the max is 60', near(startingDoubt(1, 1), 80) && near(startingDoubt(0.5, 1), 60) && startingDoubt(0, 0) >= 0);
{
  const messy = new Evidence(); // both bodies out, blood, curtains open, gun out
  const s = messy.getVisibleSeverity() / 100;
  check('Messy house (severity 1, suspicion 1): starts at 80', near(startingDoubt(s, messy.calculateSuspicion()), 80));
  const tidy = new Evidence();
  for (const b of tidy.getBodies()) tidy.hideBody(b.id);
  for (const t of tidy.getBloodTraces()) tidy.cleanBloodTrace(t.id);
  tidy.setCurtainsClosed(true);
  tidy.setPistolHidden(true);
  check('Tidy house (severity 0, suspicion 0): starts at 10', near(startingDoubt(tidy.getVisibleSeverity() / 100, tidy.calculateSuspicion()), 10));
}

// 2. Modifiers --------------------------------------------------------------------------------
{
  const lie = DIALOGUES.neighbour.rounds[0].answers[0];
  const calm = DIALOGUES.neighbour.rounds[0].answers[1];
  const rude = DIALOGUES.neighbour.rounds[0].answers[2];
  check('Answers carry style tags', lie.style === 'lie' && calm.style === 'calm' && rude.style === 'aggressive');
  check(`A lie with high evidence severity: +${LIE_HIGH_SEVERITY_DOUBT}`, answerDoubt(lie, 0.8, 50) === lie.doubt + LIE_HIGH_SEVERITY_DOUBT && answerDoubt(lie, 0.3, 50) === lie.doubt);
  check(`Nervous (paranoia above 70): every answer +${NERVOUS_DOUBT}`, answerDoubt(rude, 0, 71) === rude.doubt + NERVOUS_DOUBT && answerDoubt(rude, 0, 70) === rude.doubt && answerDoubt(calm, 0, 80) === calm.doubt + NERVOUS_DOUBT);
  check(`Calm answer while calm (paranoia below 40): ${CALM_BONUS} extra`, answerDoubt(calm, 0, 39) === calm.doubt + CALM_BONUS && answerDoubt(calm, 0, 40) === calm.doubt && answerDoubt(rude, 0, 10) === rude.doubt);
  check('Modifiers stack (lie, high severity, nervous)', answerDoubt(lie, 0.9, 90) === lie.doubt + LIE_HIGH_SEVERITY_DOUBT + NERVOUS_DOUBT);
  check('Good answers lower paranoia, bad ones raise it', ANSWER_PARANOIA.good < 0 && ANSWER_PARANOIA.neutral === 0 && ANSWER_PARANOIA.bad > 0);
}

// 3. Content: 3 rounds x 3 answers, one good / neutral / bad each; the right answer moves around
{
  let ok = true;
  const bestSlots: number[] = [];
  for (const v of VISITORS) {
    for (const r of DIALOGUES[v].rounds) {
      const q = r.answers.map(a => a.quality).sort().join();
      if (q !== 'bad,good,neutral' || !r.question || r.answers.some(a => !a.text || !a.reply)) ok = false;
      const good = r.answers[bestAnswer(r)].doubt, bad = r.answers[worstAnswer(r)].doubt;
      if (good > -15 || good < -25 || bad < 20 || bad > 35) ok = false;
      bestSlots.push(bestAnswer(r));
    }
    if (DIALOGUES[v].rounds.length !== 3) ok = false;
  }
  check('Every visitor: 3 questions, each with one good (-15..-25), one neutral and one bad (+20..+35) answer, all with replies', ok);
  check(`The right answer is not always button 1 (slots: ${bestSlots.map(i => i + 1).join(' ')})`, new Set(bestSlots).size === 3);
}

// 4. Best always succeeds, worst always fails, for every visitor and situation ----------------
{
  let bestOk = true, worstOk = true;
  const cases: string[] = [];
  const severities = Array.from({ length: 11 }, (_, i) => i / 10);
  for (const v of VISITORS) for (const sev of severities) for (const sus of [0, 0.25, 0.5, 0.75, 1]) for (const par of [0, 39, 50, 71, 100]) {
    const best = new DialogueSession(v, sev, sus);
    while (!best.finished) best.answer(bestAnswer(best.current!), par);
    if (best.success !== true || best.doubt >= DOUBT_PASS_BELOW) { bestOk = false; cases.push(`best ${v} ${sev}/${sus}/${par} -> ${best.doubt}`); }
    const worst = new DialogueSession(v, sev, sus);
    while (!worst.finished) worst.answer(worstAnswer(worst.current!), par);
    if (worst.success !== false) { worstOk = false; cases.push(`worst ${v} ${sev}/${sus}/${par} -> ${worst.doubt}`); }
  }
  check('Best answers always succeed (all visitors, severity 0-1 in 0.1 steps, suspicion 0-1, paranoia 0-100)', bestOk, cases.join('; '));
  // At the cap itself (start 80), nervous (+5 per answer): perfect answers still pass
  let atCapOk = true;
  const atCap: string[] = [];
  for (const v of VISITORS) {
    const s = new DialogueSession(v, 1, 1);
    s.doubt = DOUBT_START_MAX_HIGH_SEVERITY;
    while (!s.finished) s.answer(bestAnswer(s.current!), 100);
    atCap.push(`${v} ${s.doubt}`);
    if (s.success !== true) atCapOk = false;
  }
  check(`Starting at the ${DOUBT_START_MAX_HIGH_SEVERITY} cap while nervous, perfect answers still pass (${atCap.join(', ')})`, atCapOk);
  check('Worst answers always fail (all visitors, evidence 0-1, paranoia 0-100)', worstOk, cases.join('; '));

  const early = new DialogueSession('officer', 1, 1); // starts at 80
  const r = early.answer(worstAnswer(early.current!), 80); // +30 +5 nervous
  check(`Doubt reaching ${DOUBT_FAIL} ends the talk at once (FAIL)`, early.doubt === DOUBT_FAIL && early.finished && early.success === false && r!.finished && early.round === 1);
  check('No more answers after it ends', early.answer(0, 50) === null && early.current === null);
}

// 5. The real game -----------------------------------------------------------------------------
function toVisitor(seed: number): Driver {
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
  d.interact('switch_light_foyer');
  d.placePlayer(7.4, 10.6, 0);
  d.runUntil(() => d.flow.getVisitorManager().isVisitorAtDoor(), 120);
  return d;
}
const dialogueOf = (d: Driver) => (d.game as any).dialogue as DialogueSession | null;

{
  const d = toVisitor(41);
  check('The neighbour knocks', d.phase === GamePhase.VISITOR_NEIGHBOUR && d.flow.getVisitorManager().isVisitorAtDoor());
  const requests = pointerLockStats.requests;
  d.press('KeyT');
  const s = dialogueOf(d)!;
  check('T opens the dialogue: name, line, three answers, DOUBT bar', !!s && !isHidden('dialogue-overlay') && elementText('dialogue-name') === DIALOGUES.neighbour.name &&
    elementText('dialogue-line') === DIALOGUES.neighbour.rounds[0].question && elementText('dialogue-answer-2').startsWith('2. ') && elementText('doubt-val') === String(Math.round(s.doubt)));
  check(`Starting doubt from the evidence (bodies out, high severity): ${s.doubt.toFixed(0)}`, s.doubt > DOUBT_START_MAX && s.doubt <= DOUBT_START_MAX_HIGH_SEVERITY);
  check('Movement frozen, cursor released, game not paused', (d.player as any).frozen === true && !d.player.isLocked() && !d.flow.isPaused);
  d.run(2);
  check('The released cursor does not trigger the pause overlay', !d.flow.isPaused && isHidden('pause-overlay'));

  // Esc pauses (the cursor is free, so Esc is a key press here)
  pressKey('Escape');
  const t = d.game.getGameTime();
  check('Esc pauses the dialogue', d.flow.isPaused && !isHidden('pause-overlay'));
  d.press('Digit2');
  d.run(10);
  check('While paused: answers ignored, game clock stopped', s.round === 0 && d.game.getGameTime() === t);
  d.clickButton('btn-resume');
  check('Resume returns to the dialogue without grabbing the pointer', !d.flow.isPaused && !isHidden('dialogue-overlay') && !d.player.isLocked());

  // Talk for a while: knocks don't pile up and the visitor doesn't give up mid-conversation
  d.run(40);
  check('No ignored knocks while talking (40s)', d.flow.getVisitorManager().getUnrepliedKnocks() === 0 && d.flow.getVisitorManager().isVisitorAtDoor());

  d.flow.paranoia = 30; // (the lit foyer has calmed it to 0)
  const p0 = d.flow.paranoia;
  d.press(`Digit${bestAnswer(s.current!) + 1}`); // a good answer
  check('A good answer lowers paranoia a little and doubt a lot', d.flow.paranoia < p0 && s.round === 1 && s.doubt < DOUBT_START_MAX_HIGH_SEVERITY - 15 && elementText('dialogue-reply').length > 2);
  const p1 = d.flow.paranoia;
  d.press(`Digit${worstAnswer(s.current!) + 1}`); // a bad one
  check('A bad answer raises paranoia a little', d.flow.paranoia > p1 && s.round === 2);
  d.press(`Digit${bestAnswer(s.current!) + 1}`);
  check('After round 3 the verdict shows (no more answers)', s.finished && isHidden('dialogue-answer-1'));
  d.run(3);
  check('Then the box closes and the outcome applies', dialogueOf(d) === null && isHidden('dialogue-overlay'));
  d.settle();
  check('"Click to continue" after the dialogue (pointer was released)', d.flow.isPaused && !isHidden('pause-overlay'));
  d.clickButton('btn-resume');
  check('A click locks the pointer and play resumes', d.player.isLocked() && !d.flow.isPaused);
  check('Pointer lock was never requested except from that click', pointerLockStats.requests === requests + 1 && pointerLockStats.outsideGesture === 0);
  check(`Verdict: doubt ${s.doubt.toFixed(0)} -> ${s.success ? 'SUCCESS, the neighbour leaves' : 'FAIL, still at the door'}`,
    s.success === (s.doubt < DOUBT_PASS_BELOW) && d.flow.getVisitorManager().isVisitorAtDoor() === !s.success);
}

{
  // Nervous and messy: the worst first answer hits 100 doubt and ends it on the spot
  const d = toVisitor(42);
  d.press('KeyT');
  const s = dialogueOf(d)!;
  d.flow.paranoia = 80;
  d.press(`Digit${worstAnswer(s.current!) + 1}`);
  check('100 doubt ends the talk after one answer (FAIL)', s.finished && s.success === false && s.round === 1);
  d.run(3);
  check('FAIL keeps the old branch: the visitor is still at the door, one failed talk', d.flow.getVisitorManager().isVisitorAtDoor() && (d.flow.getVisitorManager() as any).failedTalks === 1);

  // No soft lock: the visitor forcing their way in mid-dialogue closes it and the ending shows
  d.settle();
  if (d.flow.isPaused) d.clickButton('btn-resume');
  d.run(3.5);
  d.press('KeyT');
  check('A second talk opens', dialogueOf(d) !== null);
  d.flow.forceEntry();
  d.run(0.1);
  check('No soft lock: an ending mid-dialogue closes it', dialogueOf(d) === null && isHidden('dialogue-overlay') && d.phase === GamePhase.ENDING && !isHidden('ending-screen'));
}

console.log(`Dialogue Test Complete: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
