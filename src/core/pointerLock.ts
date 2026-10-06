// Pointer lock helper.
//
// Browsers only grant pointer lock from inside a user gesture (a click or key handler), and
// also refuse it for about a second after the player pressed Esc. Chrome reports a refusal by
// rejecting the promise requestPointerLock() returns; older browsers may throw or fire
// 'pointerlockerror'. A refusal is expected and harmless: the game stays paused behind its
// click-to-continue overlay and asks again on the next click. So this never throws and never
// leaves a rejected promise unhandled.
//
// Call it only from a click or keydown handler.

export const POINTER_LOCK_ERROR = /pointer ?lock/i;

export function tryLockPointer(target: Element | null | undefined): void {
  const el = target as (Element & { requestPointerLock?: () => unknown }) | null | undefined;
  if (!el || typeof el.requestPointerLock !== 'function') return;
  try {
    const result = el.requestPointerLock() as Promise<void> | undefined;
    if (result && typeof result.then === 'function') result.then(undefined, () => {});
  } catch {
    // Not allowed right now; the next click retries
  }
}

// Is this error (message, Error or DOMException) a pointer lock refusal?
export function isPointerLockError(reason: unknown): boolean {
  if (reason == null) return false;
  const r = reason as { name?: string; message?: string };
  return POINTER_LOCK_ERROR.test(String(r.message ?? reason)) || POINTER_LOCK_ERROR.test(String(reason));
}
