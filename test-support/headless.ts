// Headless browser shim for running the real Game in Node.
//
// It installs just enough of `window`, `document`, `performance`, `location`, timers and Web
// Audio for the game modules to construct and run. The DOM is seeded from index.html, so every
// element id the game looks up exists with its real starting classes (e.g. `hidden`).
// Time is simulated: performance.now(), setTimeout/setInterval and the Game's frame clock all
// run on SimClock, so nothing waits on real time.
//
// Import this module before anything from src/ (it installs globals at import time).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const noop = () => {};

type Listener = (e: any) => void;
type ListenerOptions = boolean | { capture?: boolean } | undefined;
const isCapture = (o: ListenerOptions) => typeof o === 'boolean' ? o : !!o?.capture;

// Capture listeners run first; stopPropagation() in one of them stops the rest, as it does for a
// window capture listener in a browser (the event never reaches the target or bubbles back up).
class FakeEventTarget {
  private listeners = new Map<string, Set<Listener>>();
  private captureListeners = new Map<string, Set<Listener>>();
  removeAllListeners(): void {
    this.listeners.clear();
    this.captureListeners.clear();
  }
  addEventListener(type: string, fn: Listener, options?: ListenerOptions): void {
    const map = isCapture(options) ? this.captureListeners : this.listeners;
    if (!map.has(type)) map.set(type, new Set());
    map.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: Listener, options?: ListenerOptions): void {
    (isCapture(options) ? this.captureListeners : this.listeners).get(type)?.delete(fn);
  }
  listenerCount(): number {
    let n = 0;
    for (const set of [...this.listeners.values(), ...this.captureListeners.values()]) n += set.size;
    return n;
  }
  dispatchEvent(e: any): boolean {
    let stopped = false;
    e.stopPropagation = () => { stopped = true; };
    e.preventDefault ??= noop;
    for (const fn of [...(this.captureListeners.get(e.type) ?? [])]) {
      fn(e);
      if (stopped) return true;
    }
    for (const fn of [...(this.listeners.get(e.type) ?? [])]) fn(e);
    const handler = (this as any)['on' + e.type];
    if (typeof handler === 'function') handler.call(this, e);
    return true;
  }
}

class FakeClassList {
  private set = new Set<string>();
  constructor(initial = '') {
    for (const c of initial.split(/\s+/)) if (c) this.set.add(c);
  }
  add(...c: string[]) { c.forEach(x => this.set.add(x)); }
  remove(...c: string[]) { c.forEach(x => this.set.delete(x)); }
  contains(c: string) { return this.set.has(c); }
  toggle(c: string, force?: boolean) {
    const on = force ?? !this.set.has(c);
    if (on) this.set.add(c); else this.set.delete(c);
    return on;
  }
  toString() { return [...this.set].join(' '); }
}

const gradient = () => ({ addColorStop: noop });
// A 2D canvas context where every drawing call is a no-op
const fakeContext2D = () => new Proxy({} as any, {
  get: (t, prop) => {
    if (prop in t) return t[prop];
    if (prop === 'createRadialGradient' || prop === 'createLinearGradient' || prop === 'createPattern') return gradient;
    if (prop === 'measureText') return () => ({ width: 10 });
    if (prop === 'getImageData' || prop === 'createImageData') return (_x: number, _y: number, w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
    return noop;
  },
  set: (t, prop, v) => { t[prop] = v; return true; }
});

export class FakeElement extends FakeEventTarget {
  id = '';
  tagName: string;
  classList: FakeClassList;
  style: any = {
    setProperty(k: string, v: string) { this[k] = v; },
    getPropertyValue(k: string) { return this[k] ?? ''; },
    removeProperty(k: string) { delete this[k]; }
  };
  dataset: Record<string, string> = {};
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  innerText = '';
  textContent = '';
  value = '';
  checked = false;
  width = 256;
  height = 256;
  offsetWidth = 100;
  onclick: ((e?: any) => void) | null = null;
  private html = '';

  constructor(tag: string, className = '') {
    super();
    this.tagName = tag.toUpperCase();
    this.classList = new FakeClassList(className);
  }
  get className() { return this.classList.toString(); }
  set className(v: string) { this.classList = new FakeClassList(v); }
  // Markup is not parsed, but replacing the content drops the old children
  get innerHTML() { return this.html; }
  set innerHTML(v: string) {
    this.html = v;
    for (const c of this.children) c.parentElement = null;
    this.children = [];
  }
  appendChild<T extends FakeElement>(c: T): T {
    c.parentElement?.removeChild(c);
    c.parentElement = this;
    this.children.push(c);
    return c;
  }
  append(...nodes: FakeElement[]) { nodes.forEach(n => this.appendChild(n)); }
  removeChild(c: FakeElement) { this.children = this.children.filter(x => x !== c); c.parentElement = null; return c; }
  remove() { this.parentElement?.removeChild(this); }
  setAttribute(k: string, v: string) { (this as any)[k] = v; }
  getAttribute(k: string) { return (this as any)[k] ?? null; }
  // Simple selectors only: `.class`, `#id` or a tag name, matched against descendants
  matches(sel: string): boolean {
    if (sel.startsWith('.')) return this.classList.contains(sel.slice(1));
    if (sel.startsWith('#')) return this.id === sel.slice(1);
    return this.tagName === sel.toUpperCase();
  }
  querySelectorAll(sel: string): FakeElement[] {
    const out: FakeElement[] = [];
    const walk = (el: FakeElement) => el.children.forEach(c => { if (c.matches(sel)) out.push(c); walk(c); });
    walk(this);
    return out;
  }
  querySelector(sel: string): FakeElement | null { return this.querySelectorAll(sel)[0] ?? null; }
  contains(el: FakeElement | null): boolean {
    for (let n = el; n; n = n.parentElement) if (n === this) return true;
    return false;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.width, height: this.height, right: this.width, bottom: this.height }; }
  focus() {}
  blur() {}
  getContext() { return fakeContext2D(); }
  click() { this.dispatchEvent({ type: 'click', target: this }); }
  requestPointerLock() {
    // The browser grants the lock and fires pointerlockchange on the document
    doc.pointerLockElement = this;
    doc.dispatchEvent({ type: 'pointerlockchange' });
  }
}

class FakeDocument extends FakeEventTarget {
  readyState = 'complete';
  pointerLockElement: FakeElement | null = null;
  head = new FakeElement('head');
  body = new FakeElement('body');
  private byId = new Map<string, FakeElement>();

  register(el: FakeElement) { this.byId.set(el.id, el); }
  clear() {
    this.byId.clear();
    this.head = new FakeElement('head');
    this.body = new FakeElement('body');
    this.pointerLockElement = null;
    this.removeAllListeners();
  }
  getElementById(id: string): FakeElement | null {
    return this.byId.get(id) ?? null;
  }
  createElement(tag: string) {
    const el = new FakeElement(tag);
    // Elements given an id later are looked up by id (e.g. the comic's injected <style>)
    return new Proxy(el, {
      set: (t, prop, v) => {
        (t as any)[prop] = v;
        if (prop === 'id') this.byId.set(v, t);
        return true;
      }
    });
  }
  querySelector(sel: string) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return this.querySelectorAll(sel)[0] ?? null;
  }
  querySelectorAll(sel: string): FakeElement[] {
    const found = new Set<FakeElement>();
    for (const el of this.byId.values()) if (el.matches(sel)) found.add(el);
    for (const el of [...this.body.querySelectorAll(sel), ...this.head.querySelectorAll(sel)]) found.add(el);
    return [...found];
  }
  exitPointerLock() {
    if (this.pointerLockElement === null) return;
    this.pointerLockElement = null;
    this.dispatchEvent({ type: 'pointerlockchange' });
  }
}

// Minimal Web Audio: every node accepts connections and every parameter accepts automation
class FakeParam {
  value = 0;
  setValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
  setTargetAtTime() { return this; }
  cancelScheduledValues() { return this; }
}
const AUDIO_NODE_METHODS = new Set(['connect', 'disconnect', 'start', 'stop', 'setPeriodicWave', 'addEventListener', 'removeEventListener', 'setPosition', 'setOrientation']);
const fakeAudioNode = (): any => new Proxy({} as any, {
  get: (t, prop) => {
    if (prop in t) return t[prop];
    if (typeof prop !== 'string') return undefined;
    if (AUDIO_NODE_METHODS.has(prop)) return prop === 'connect' ? (n: any) => n : noop;
    if (prop === 'then') return undefined;
    t[prop] = new FakeParam();
    return t[prop];
  },
  set: (t, prop, v) => { t[prop] = v; return true; }
});
class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  destination = fakeAudioNode();
  listener = fakeAudioNode();
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (c: number) => data[c] };
  }
  createPeriodicWave() { return {}; }
}
for (const m of ['createGain', 'createOscillator', 'createBufferSource', 'createBiquadFilter', 'createStereoPanner', 'createPanner', 'createDelay', 'createConvolver', 'createDynamicsCompressor', 'createWaveShaper', 'createAnalyser']) {
  (FakeAudioContext.prototype as any)[m] = fakeAudioNode;
}

// --- Simulated time ----------------------------------------------------------

// Timer callbacks fire, in order, as SimClock.advance() passes their due time
interface SimTimer { id: number; due: number; fn: (...a: any[]) => void; args: any[]; every: number | null; }

export class SimClock {
  private seconds = 0;
  private lastDelta = 0;
  private timers = new Map<number, SimTimer>();
  private nextId = 1;
  now(): number { return this.seconds; }
  reset(): void { this.seconds = 0; this.lastDelta = 0; this.timers.clear(); }
  advance(dt: number): void {
    const end = this.seconds + dt;
    for (;;) {
      let next: SimTimer | null = null;
      for (const t of this.timers.values()) {
        if (t.due <= end && (!next || t.due < next.due || (t.due === next.due && t.id < next.id))) next = t;
      }
      if (!next) break;
      this.seconds = Math.max(this.seconds, next.due);
      if (next.every !== null) next.due += Math.max(next.every, 0.001); else this.timers.delete(next.id);
      next.fn(...next.args);
    }
    this.seconds = end;
  }
  schedule(fn: (...a: any[]) => void, ms: number | undefined, args: any[], repeat: boolean): number {
    const id = this.nextId++;
    const secs = Math.max(0, Number(ms) || 0) / 1000;
    this.timers.set(id, { id, due: this.seconds + secs, fn, args, every: repeat ? secs : null });
    return id;
  }
  cancel(id: unknown): void { this.timers.delete(Number(id)); }
  // FrameClock for Game: wall time elapsed since the previous frame
  getDelta(): number {
    const d = this.seconds - this.lastDelta;
    this.lastDelta = this.seconds;
    return d;
  }
}

export const simClock = new SimClock();
const simSetTimeout = (fn: (...a: any[]) => void, ms?: number, ...args: any[]) => simClock.schedule(fn, ms, args, false);
const simSetInterval = (fn: (...a: any[]) => void, ms?: number, ...args: any[]) => simClock.schedule(fn, ms, args, true);
const simClear = (id: unknown) => simClock.cancel(id);

// --- Install globals -------------------------------------------------------------

const doc = new FakeDocument();
const win = new FakeEventTarget() as any;
Object.assign(win, {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  AudioContext: FakeAudioContext,
  setTimeout: simSetTimeout,
  clearTimeout: simClear,
  setInterval: simSetInterval,
  clearInterval: simClear,
  requestAnimationFrame: () => 0,
  getComputedStyle: () => ({ getPropertyValue: () => '' })
});

export const reloads = { count: 0 };

const g = globalThis as any;
g.window = win;
g.document = doc;
g.setTimeout = simSetTimeout;
g.clearTimeout = simClear;
g.setInterval = simSetInterval;
g.clearInterval = simClear;
g.location = { search: '', reload: () => { reloads.count++; } };
Object.defineProperty(g, 'performance', { value: { now: () => simClock.now() * 1000 }, configurable: true, writable: true });
win.location = g.location;

// Seed the DOM from index.html: every element with an id, with its starting classes and value
const root = dirname(dirname(fileURLToPath(import.meta.url)));
export const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
function seedDom(): void {
  for (const m of indexHtml.matchAll(/<([a-zA-Z0-9]+)([^>]*?)\sid="([^"]+)"([^>]*)>/g)) {
    const attrs = m[2] + ' ' + m[4];
    const el = new FakeElement(m[1], /class="([^"]*)"/.exec(attrs)?.[1] ?? '');
    el.id = m[3];
    const value = /value="([^"]*)"/.exec(attrs);
    if (value) el.value = value[1];
    if (/\schecked\b/.test(attrs)) el.checked = true;
    doc.register(el);
  }
}
seedDom();

// A fresh page load: new DOM, no listeners or timers from a previous Game, clock back to zero
export function resetHeadless(): void {
  doc.clear();
  win.removeAllListeners();
  seedDom();
  simClock.reset();
  reloads.count = 0;
}

export function windowListenerCount(): number {
  return win.listenerCount();
}

// --- Input helpers ------------------------------------------------------------------

export function keyDown(code: string, repeat = false): void {
  win.dispatchEvent({ type: 'keydown', code, repeat });
}
export function keyUp(code: string): void {
  win.dispatchEvent({ type: 'keyup', code });
}
export function pressKey(code: string): void {
  keyDown(code);
  keyUp(code);
}
export function mouseDown(button = 0): void {
  win.dispatchEvent({ type: 'mousedown', button });
  win.dispatchEvent({ type: 'mouseup', button });
}
// A click on a page element (e.g. the comic) rather than the locked game canvas
export function mouseDownOn(el: FakeElement, button = 0): void {
  el.dispatchEvent({ type: 'mousedown', button, target: el });
}
export function mouseMove(movementX: number, movementY: number): void {
  win.dispatchEvent({ type: 'mousemove', movementX, movementY, clientX: 0, clientY: 0 });
}
export function clickElement(id: string): void {
  const el = doc.getElementById(id);
  if (!el) throw new Error(`No element #${id}`);
  el.click();
}
// The player presses Esc / alt-tabs: the browser drops pointer lock
export function losePointerLock(): void {
  doc.exitPointerLock();
}
export function isHidden(id: string): boolean {
  return doc.getElementById(id)?.classList.contains('hidden') ?? true;
}
export function elementText(id: string): string {
  return doc.getElementById(id)?.innerText ?? '';
}
// The intro comic's root element, if it is on the page
export function comicRoot(): FakeElement | null {
  return doc.body.querySelector('.cmc-root');
}
