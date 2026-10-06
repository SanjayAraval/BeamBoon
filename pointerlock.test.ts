// Pointer lock: refusals ("A user gesture is required to request Pointer Lock") must never throw,
// never leave an unhandled promise rejection, and never reach the on-screen error log. The game
// only asks for the lock from clicks/keys, and retries on the next click after a refusal.

import { resetHeadless, isHidden, losePointerLock, pointerLockStats, indexHtml, elementText, comicRoot } from './test-support/headless';
import { Driver } from './test-support/driver';
import { tryLockPointer, isPointerLockError } from './src/core/pointerLock';
import { GamePhase } from './src/game/GameFlow';

let pass = 0;
let fail = 0;
function check(desc: string, cond: boolean, detail = ''): void {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${desc}${!cond && detail ? ` (${detail})` : ''}`);
  if (cond) pass++; else fail++;
}

const unhandled: unknown[] = [];
process.on('unhandledRejection', (reason) => { unhandled.push(reason); });
const settleMicrotasks = () => new Promise<void>(resolve => setImmediate(() => setImmediate(resolve)));

function notAllowed(): Error {
  const err = new Error('A user gesture is required to request Pointer Lock');
  err.name = 'NotAllowedError';
  return err;
}

async function main(): Promise<void> {
  console.log('--- RUNNING POINTER LOCK TEST ---');

  // 1. The helper with stubbed requestPointerLock ------------------------------------------
  let threw = false;
  try {
    tryLockPointer({ requestPointerLock: () => Promise.reject(notAllowed()) } as unknown as Element);
  } catch { threw = true; }
  await settleMicrotasks();
  check('Rejecting requestPointerLock (Chrome): no error thrown', !threw);
  check('...and no unhandled promise rejection', unhandled.length === 0, `${unhandled.length}`);

  threw = false;
  try {
    tryLockPointer({ requestPointerLock: () => { throw notAllowed(); } } as unknown as Element);
    tryLockPointer({ requestPointerLock: () => undefined } as unknown as Element); // older browsers: no promise
    tryLockPointer(null);
    tryLockPointer({} as Element);
  } catch { threw = true; }
  await settleMicrotasks();
  check('Throwing, promise-less, missing element or missing API: never throws', !threw && unhandled.length === 0);
  check('Pointer lock refusals are recognised', isPointerLockError(notAllowed()) && isPointerLockError('NotAllowedError: A user gesture is required to request Pointer Lock') && !isPointerLockError(new Error('boom')));

  // 2. The dev error log in index.html ignores them ----------------------------------------
  resetHeadless();
  const script = /<div id="error-log"[^>]*><\/div>\s*<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? '';
  check('Found the error log script in index.html', script.includes('onunhandledrejection'));
  const devWindow: any = {};
  new Function('window', 'document', 'location', script)(devWindow, document, { hostname: 'localhost', search: '' });
  let prevented = false;
  devWindow.onunhandledrejection({ reason: notAllowed(), preventDefault: () => { prevented = true; } });
  const suppressed = devWindow.onerror('Uncaught NotAllowedError: A user gesture is required to request Pointer Lock', 'main.js', 1, 1, notAllowed());
  check('A pointer lock refusal is not shown in the on-screen error log', elementText('error-log') === '' && prevented && suppressed === true, JSON.stringify(elementText('error-log')));
  devWindow.onerror('TypeError: something else broke');
  check('Other errors are still shown (dev builds only)', elementText('error-log').includes('something else broke'));

  // 3. The real game: no lock request outside a gesture; click to continue; retry after a refusal --
  resetHeadless();
  const d = new Driver();
  d.clickButton('btn-start');
  check('Comic is playing (cursor free, no lock requested)', comicRoot() !== null && pointerLockStats.requests === 0);
  d.holdKey('Enter', 1.2); // skip: the comic completes in a timer, not in the key handler
  d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3);
  d.settle();
  check('Comic completion and the phase change request no pointer lock', pointerLockStats.requests === 0);
  check('Gameplay without the lock waits behind "Click to continue" (game clock stopped)', d.flow.isPaused && !isHidden('pause-overlay'));
  const t = d.game.getGameTime();
  d.run(5);
  check('...for as long as it takes', d.flow.isPaused && d.game.getGameTime() === t);
  d.clickButton('pause-overlay'); // a click on the backdrop works too
  check('A click locks the pointer and continues', d.player.isLocked() && !d.flow.isPaused && isHidden('pause-overlay'));

  d.holdKey('Space', 1.2);
  d.run(1.0);
  check('Intro skipped into free play', d.phase === GamePhase.ACT1_MOVIE);

  // Esc, then a click within a second: the browser refuses, the overlay stays, the next click works
  losePointerLock();
  check('Esc pauses', d.flow.isPaused && !isHidden('pause-overlay'));
  pointerLockStats.rejectNext = 1;
  const rejectedBefore = pointerLockStats.rejected;
  threw = false;
  try { d.clickButton('btn-resume'); } catch { threw = true; }
  await settleMicrotasks();
  check('Resume clicked too soon after Esc: refused without an error', !threw && pointerLockStats.rejected === rejectedBefore + 1 && unhandled.length === 0);
  check('...the overlay stays up and the game stays paused', d.flow.isPaused && !isHidden('pause-overlay') && !d.player.isLocked());
  d.run(1.0);
  d.clickButton('btn-resume');
  check('The next click retries and succeeds', d.player.isLocked() && !d.flow.isPaused && isHidden('pause-overlay'));

  check('Throughout: never requested outside a click or key press', pointerLockStats.outsideGesture === 0, `${pointerLockStats.outsideGesture}`);
  await settleMicrotasks();
  check('Throughout: no unhandled promise rejections', unhandled.length === 0, String(unhandled[0]));

  console.log(`Pointer Lock Test Complete: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
