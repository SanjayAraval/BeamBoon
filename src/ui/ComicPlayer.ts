// ComicPlayer.ts : animated comic book intro for CoverUp. Self-contained: no dependencies, no assets.
//
//   import { ComicPlayer } from './ComicPlayer';
//   const comic = new ComicPlayer(document.body, { onCue: name => sound.play(name), onDone: () => flow.advance() });
//   // every frame, with the GAME clock (so pause works):  comic.update(dt);
//   comic.setPaused(true/false);   comic.dispose();
//
// Cues sent to onCue: 'thunder' | 'tv' | 'click' | 'creak' | 'heartbeat' | 'knock'
// Controls: click / Space / Enter advances. HOLD Enter (or Space) 1s to skip all. Esc is NOT used.
import { SCENES } from './comicArt';

type Bubble = { x: number; y: number; w?: number; text: string; tail?: 'dl' | 'dr' | 'ul' | 'ur' | 'none'; kind?: 'say' | 'think' | 'shout' };
type Sfx = { text: string; x: number; y: number; rot?: number; size?: number; color?: 'yellow' | 'white' | 'black' };
export interface PanelDef { scene: number; caption?: string; bubbles?: Bubble[]; sfx?: Sfx; cue?: string; dur?: number; motion?: 'in' | 'left' | 'right' | 'up'; origin?: string; }
export interface PageDef { layout: 'stagger' | 'stagger2' | 'full'; panels: PanelDef[]; }

export const COMIC_PAGES: PageDef[] = [
  { layout: 'stagger', panels: [
    { scene: 0, caption: 'AGE SIX. EVERY SHADOW HAD TEETH.', sfx: { text: 'BOOM!', x: 6, y: 8, rot: -8, size: 62 }, cue: 'thunder', origin: '30% 80%' },
    { scene: 1, caption: 'DAD ALWAYS BROUGHT THE JOB HOME.', bubbles: [{ x: 36, y: 5, w: 52, text: '...and THAT is why we ALWAYS lock the door.', tail: 'dl' }], motion: 'left', origin: '30% 40%' },
  ] },
  { layout: 'stagger2', panels: [
    { scene: 2, caption: 'MOM AND DAD DRANK TO FORGET THE DAY.', bubbles: [{ x: 44, y: 6, w: 34, text: '...are you okay?', tail: 'dr', kind: 'think' }, { x: 24, y: 66, w: 36, text: 'Go to bed, sweetie.', tail: 'ur' }], cue: 'tv', motion: 'right', origin: '50% 40%' },
    { scene: 3, caption: 'HE CHECKED THE LOCKS. THEN HE CHECKED THEM AGAIN.', sfx: { text: 'click', x: 66, y: 76, rot: 6, size: 40, color: 'white' }, cue: 'click', origin: '70% 50%' },
  ] },
  { layout: 'stagger', panels: [
    { scene: 4, bubbles: [{ x: 3, y: 6, w: 44, text: 'Never touch this. Ever.', tail: 'dr', kind: 'shout' }], sfx: { text: 'CLICK', x: 58, y: 14, rot: 8, size: 56, color: 'yellow' }, cue: 'click', motion: 'left', origin: '85% 60%' },
    { scene: 5, caption: 'THE MORE HE WATCHED, THE MORE HE SAW.', cue: 'tv', origin: '70% 30%' },
  ] },
  { layout: 'stagger2', panels: [
    { scene: 6, caption: 'EVEN THE NEIGHBOURS LOOKED WRONG.', sfx: { text: "THEY'RE WATCHING.", x: 3, y: 80, rot: -5, size: 34, color: 'white' }, cue: 'heartbeat', origin: '50% 50%' },
    { scene: 7, caption: 'TONIGHT, THE STORM CAME EARLY.', sfx: { text: 'RUMBLE', x: 6, y: 72, rot: -4, size: 40, color: 'yellow' }, cue: 'thunder', motion: 'right', origin: '60% 40%' },
  ] },
  { layout: 'full', panels: [
    { scene: 8, sfx: { text: 'CLICK.', x: 56, y: 38, rot: -4, size: 96, color: 'yellow' }, cue: 'click', dur: 4.6, motion: 'up', origin: '60% 60%' },
  ] },
];

const CSS = `
.cmc-root{position:fixed;inset:0;z-index:9000;background:#07070a;display:flex;align-items:center;justify-content:center;overflow:hidden;user-select:none;cursor:pointer;font-family:var(--cmc-body,'Comic Neue','Comic Sans MS','Segoe Print',cursive)}
.cmc-stage{position:relative;width:1280px;height:720px;flex:none;transform-origin:center center;background:#e9e2cf}
.cmc-stage:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,rgba(0,0,0,.05),transparent 50%),radial-gradient(circle,rgba(0,0,0,.14) 1px,transparent 1.6px) 0 0/9px 9px;pointer-events:none}
.cmc-page{position:absolute;inset:0;animation:cmc-pagein .5s ease-out both}
.cmc-page.out{animation:cmc-pageout .45s ease-in both}
@keyframes cmc-pagein{from{opacity:0;transform:translateX(40px) rotate(.6deg)}to{opacity:1;transform:none}}
@keyframes cmc-pageout{to{opacity:0;transform:translateX(-60px) rotate(-.8deg)}}
.cmc-panel{position:absolute;aspect-ratio:4/3;background:#000;border:7px solid #0b0b0b;box-shadow:10px 10px 0 rgba(0,0,0,.85);overflow:hidden;visibility:hidden}
.cmc-panel.in{visibility:visible;animation:cmc-slam .42s cubic-bezier(.2,1.6,.4,1) both}
@keyframes cmc-slam{0%{transform:scale(1.35) rotate(var(--rot,0deg));opacity:0}55%{opacity:1}100%{transform:scale(1) rotate(var(--rot,0deg))}}
.cmc-panel.full{aspect-ratio:auto}
.cmc-art{position:absolute;inset:0;transform-origin:var(--org,50% 50%)}
.cmc-art svg{width:100%;height:100%;display:block}
.cmc-panel.in .cmc-art{animation:var(--kb,cmc-kbin) var(--dur,5s) linear both}
@keyframes cmc-kbin{from{transform:scale(1)}to{transform:scale(1.14)}}
@keyframes cmc-kbleft{from{transform:scale(1.12) translateX(3%)}to{transform:scale(1.12) translateX(-3%)}}
@keyframes cmc-kbright{from{transform:scale(1.12) translateX(-3%)}to{transform:scale(1.12) translateX(3%)}}
@keyframes cmc-kbup{from{transform:scale(1.02) translateY(3%)}to{transform:scale(1.2) translateY(-1%)}}
.cmc-paused *{animation-play-state:paused!important}
.cmc-cap{position:absolute;left:0;top:0;max-width:78%;background:#ffd400;color:#0b0b0b;border:4px solid #0b0b0b;border-left:0;border-top:0;padding:8px 14px 9px;font:700 21px/1.18 var(--cmc-cap,'Special Elite','Courier New',monospace);letter-spacing:.5px;text-transform:uppercase;min-height:26px;z-index:4}
.cmc-bub{position:absolute;background:#fff;color:#0b0b0b;border:4px solid #0b0b0b;border-radius:50% / 42%;padding:14px 22px;font:700 22px/1.12 var(--cmc-body,'Comic Neue','Comic Sans MS',cursive);text-align:center;z-index:5;transform:scale(0);transform-origin:50% 100%}
.cmc-bub.show{animation:cmc-pop .32s cubic-bezier(.2,1.8,.4,1) both}
@keyframes cmc-pop{to{transform:scale(1)}}
.cmc-bub.shout{border-radius:6px;background:#fff7c2;font-family:var(--cmc-sfx,'Bangers','Impact',sans-serif);letter-spacing:1px;font-size:27px;clip-path:polygon(0 8%,6% 0,16% 8%,28% 0,40% 7%,52% 0,64% 8%,76% 0,88% 7%,100% 0,95% 40%,100% 62%,94% 100%,80% 92%,66% 100%,52% 93%,38% 100%,24% 92%,12% 100%,0 90%,5% 55%)}
.cmc-bub.think{border-style:dashed}
.cmc-bub:after{content:"";position:absolute;width:26px;height:30px;background:#fff;border:4px solid #0b0b0b;border-top:0;border-right:0;transform:skewX(-25deg) rotate(10deg)}
.cmc-bub.tdl:after{left:20%;bottom:-22px}
.cmc-bub.tdr:after{right:20%;bottom:-22px;transform:scaleX(-1) skewX(-25deg) rotate(10deg)}
.cmc-bub.tul:after{left:20%;top:-24px;transform:scaleY(-1) skewX(-25deg) rotate(10deg)}
.cmc-bub.tur:after{right:20%;top:-24px;transform:scale(-1,-1) skewX(-25deg) rotate(10deg)}
.cmc-bub.tnone:after,.cmc-bub.shout:after{display:none}
.cmc-sfx{position:absolute;z-index:6;font-family:var(--cmc-sfx,'Bangers','Impact',sans-serif);letter-spacing:2px;line-height:.95;transform:scale(0) rotate(var(--r,0deg));text-shadow:3px 3px 0 #0b0b0b,-3px 3px 0 #0b0b0b,3px -3px 0 #0b0b0b,-3px -3px 0 #0b0b0b,0 5px 0 #0b0b0b;-webkit-text-stroke:2px #0b0b0b;white-space:nowrap;pointer-events:none}
.cmc-sfx.yellow{color:#ffd400}.cmc-sfx.white{color:#f4f1e6}.cmc-sfx.black{color:#0b0b0b;text-shadow:none;-webkit-text-stroke:0}
.cmc-sfx.show{animation:cmc-sfxin .38s cubic-bezier(.2,2,.4,1) both,cmc-shake .12s .4s 4 linear}
@keyframes cmc-sfxin{to{transform:scale(1) rotate(var(--r,0deg))}}
@keyframes cmc-shake{0%,100%{margin:0}25%{margin:-3px 0 0 3px}75%{margin:3px 0 0 -3px}}
.cmc-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:7}
.cmc-flash.go{animation:cmc-fl .35s ease-out}
@keyframes cmc-fl{0%{opacity:.85}100%{opacity:0}}
.cmc-hint{position:absolute;right:22px;bottom:16px;font:700 15px 'Special Elite','Courier New',monospace;color:#0b0b0b;background:rgba(255,255,255,.85);border:3px solid #0b0b0b;padding:4px 10px;z-index:20;opacity:0;transition:opacity .4s}
.cmc-hint.show{opacity:1}
.cmc-hint i{display:block;height:5px;margin-top:4px;background:#0b0b0b;width:0}
.cmc-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:30;transition:opacity .9s}
.cmc-fade.on{opacity:1}
`;

const LAYOUTS: Record<string, Array<Record<string, string>>> = {
  stagger:  [{ left: '3.2%', top: '4.5%', width: '54%', '--rot': '-0.7deg' }, { right: '3.2%', bottom: '4.5%', width: '47%', '--rot': '0.8deg' }],
  stagger2: [{ right: '3.2%', top: '4.5%', width: '54%', '--rot': '0.7deg' }, { left: '3.2%', bottom: '4.5%', width: '47%', '--rot': '-0.8deg' }],
  full:     [{ left: '2.6%', top: '3.6%', width: '94.8%', height: '92.8%', '--rot': '0deg' }],
};

interface Beat { page: number; idx: number; def: PanelDef; }

export interface ComicOptions {
  onCue?: (cue: string) => void;
  onDone?: () => void;
  injectFonts?: boolean;       // load Bangers + Comic Neue + Special Elite from Google Fonts (OFL). Default true.
  autoAdvance?: boolean;       // default true
  pages?: PageDef[];           // play these pages instead of the intro comic
}

export class ComicPlayer {
  private root: HTMLDivElement;
  private stage: HTMLDivElement;
  private hint: HTMLDivElement;
  private fade: HTMLDivElement;
  private beats: Beat[] = [];
  private beat = -1;
  private t = 0;
  private pageEl: HTMLDivElement | null = null;
  private panels: HTMLDivElement[] = [];
  private paused = false;
  private done = false;
  private turning = 0;
  private pendingBeat = -1;
  private holdT = 0;
  private holding = false;
  private holdKey = '';
  private elapsed = 0;
  private typedFor = -1;
  private captionEl: HTMLDivElement | null = null;
  private cleanup: Array<() => void> = [];
  private opts: ComicOptions;
  private started = false;
  private pages: PageDef[];

  constructor(parent: HTMLElement, opts: ComicOptions = {}) {
    this.opts = { autoAdvance: true, injectFonts: true, ...opts };
    this.pages = opts.pages ?? COMIC_PAGES;
    this.pages.forEach((p, pi) => p.panels.forEach((def, idx) => this.beats.push({ page: pi, idx, def })));
    if (!document.getElementById('cmc-css')) { const s = document.createElement('style'); s.id = 'cmc-css'; s.textContent = CSS; document.head.appendChild(s); }
    if (this.opts.injectFonts && !document.getElementById('cmc-fonts')) {
      const l = document.createElement('link'); l.id = 'cmc-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@700&family=Special+Elite&display=swap';
      document.head.appendChild(l);
    }
    this.root = document.createElement('div'); this.root.className = 'cmc-root';
    this.stage = document.createElement('div'); this.stage.className = 'cmc-stage';
    this.hint = document.createElement('div'); this.hint.className = 'cmc-hint'; this.hint.innerHTML = 'Hold ENTER to skip<i></i>';
    this.fade = document.createElement('div'); this.fade.className = 'cmc-fade';
    this.root.append(this.stage, this.hint, this.fade);
    parent.appendChild(this.root);
    this.fit();
    const onResize = () => this.fit(); window.addEventListener('resize', onResize); this.cleanup.push(() => window.removeEventListener('resize', onResize));
    const onClick = (e: MouseEvent) => { e.stopPropagation(); if (!this.paused) this.next(); };
    this.root.addEventListener('mousedown', onClick); this.cleanup.push(() => this.root.removeEventListener('mousedown', onClick));
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.repeat) return;
      if (e.code === 'Enter' || e.code === 'Space') { this.holding = true; this.holdT = 0; this.holdKey = e.code; e.preventDefault(); e.stopPropagation(); }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === this.holdKey && this.holding) { const quick = this.holdT < 0.35; this.holding = false; this.holdT = 0; this.setHold(0); if (quick && !this.paused) this.next(); e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', kd, true); window.addEventListener('keyup', ku, true);
    this.cleanup.push(() => { window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); });
    this.go(0);
  }

  get finished() { return this.done; }
  setPaused(p: boolean) { this.paused = p; this.root.classList.toggle('cmc-paused', p); }

  private fit() { const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720); this.stage.style.transform = `scale(${s})`; }
  private setHold(f: number) { const bar = this.hint.querySelector('i') as HTMLElement; if (bar) bar.style.width = `${Math.round(f * 100)}%`; }

  /** advance with the game clock */
  update(dt: number) {
    if (this.done || this.paused) return;
    this.elapsed += dt;
    if (this.elapsed > 2.5 && !this.hint.classList.contains('show')) this.hint.classList.add('show');
    if (this.holding) { this.holdT += dt; this.setHold(Math.min(1, this.holdT / 1)); if (this.holdT >= 1) { this.holding = false; this.finish(); return; } }
    if (this.turning > 0) { this.turning -= dt; if (this.turning <= 0 && this.pendingBeat >= 0) { const b = this.pendingBeat; this.pendingBeat = -1; this.go(b); } return; }
    this.t += dt;
    const def = this.beats[this.beat].def;
    // typewriter
    if (this.captionEl && def.caption) {
      const n = Math.min(def.caption.length, Math.floor(Math.max(0, this.t - 0.35) * 34));
      if (n !== this.typedFor) { this.typedFor = n; this.captionEl.textContent = def.caption.slice(0, n); }
    }
    if (this.opts.autoAdvance && this.t >= (def.dur ?? this.dwell(def))) this.next();
  }

  private dwell(def: PanelDef) { return Math.max(4.2, (def.caption?.length ?? 0) * 0.075 + 2.2); }

  next() {
    if (this.done || this.turning > 0) return;
    const def = this.beats[this.beat].def;
    // first click completes the caption, second advances
    if (def.caption && this.captionEl && this.typedFor < def.caption.length && this.t < 1.6) { this.typedFor = def.caption.length; this.captionEl.textContent = def.caption; this.t = Math.max(this.t, 1.0); return; }
    const nb = this.beat + 1;
    if (nb >= this.beats.length) { this.finish(); return; }
    if (this.beats[nb].page !== this.beats[this.beat].page) {
      if (this.pageEl) this.pageEl.classList.add('out');
      this.turning = 0.45; this.pendingBeat = nb;
    } else this.go(nb);
  }

  private go(i: number) {
    const b = this.beats[i];
    if (!this.pageEl || this.beat < 0 || this.beats[this.beat].page !== b.page) this.buildPage(b.page);
    this.beat = i; this.t = 0; this.typedFor = -1;
    const el = this.panels[b.idx]; el.classList.add('in');
    const def = b.def;
    const art = el.querySelector('.cmc-art') as HTMLElement;
    art.style.setProperty('--dur', `${(def.dur ?? this.dwell(def)) + 1.5}s`);
    art.style.setProperty('--kb', def.motion === 'left' ? 'cmc-kbleft' : def.motion === 'right' ? 'cmc-kbright' : def.motion === 'up' ? 'cmc-kbup' : 'cmc-kbin');
    this.captionEl = el.querySelector('.cmc-cap');
    if (this.captionEl) this.captionEl.textContent = '';
    el.querySelectorAll('.cmc-bub').forEach((n, k) => setTimeout(() => n.classList.add('show'), 700 + k * 650));
    el.querySelectorAll('.cmc-sfx').forEach(n => setTimeout(() => n.classList.add('show'), 380));
    const fl = el.querySelector('.cmc-flash') as HTMLElement | null;
    if (fl && (def.cue === 'thunder' || def.cue === 'click')) { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); }
    if (def.cue) this.opts.onCue?.(def.cue);
  }

  private buildPage(pi: number) {
    this.stage.innerHTML = ''; this.panels = [];
    const page = document.createElement('div'); page.className = 'cmc-page';
    const pg = this.pages[pi]; const lay = LAYOUTS[pg.layout];
    pg.panels.forEach((def, k) => {
      const p = document.createElement('div'); p.className = 'cmc-panel' + (pg.layout === 'full' ? ' full' : '');
      for (const [key, v] of Object.entries(lay[k])) key.startsWith('--') ? p.style.setProperty(key, v) : (p.style as any)[key] = v;
      const art = document.createElement('div'); art.className = 'cmc-art'; art.style.setProperty('--org', def.origin ?? '50% 50%'); art.innerHTML = SCENES[def.scene](); p.appendChild(art);
      if (def.caption) { const c = document.createElement('div'); c.className = 'cmc-cap'; p.appendChild(c); }
      (def.bubbles ?? []).forEach(bb => {
        const d = document.createElement('div'); d.className = `cmc-bub t${bb.tail ?? 'dl'} ${bb.kind ?? 'say'}`;
        d.style.left = `${bb.x}%`; d.style.top = `${bb.y}%`; d.style.width = `${bb.w ?? 40}%`; d.textContent = bb.text; p.appendChild(d);
      });
      if (def.sfx) { const s = def.sfx; const d = document.createElement('div'); d.className = `cmc-sfx ${s.color ?? 'yellow'}`; d.style.left = `${s.x}%`; d.style.top = `${s.y}%`; d.style.fontSize = `${s.size ?? 50}px`; d.style.setProperty('--r', `${s.rot ?? 0}deg`); d.textContent = s.text; p.appendChild(d); }
      const fl = document.createElement('div'); fl.className = 'cmc-flash'; p.appendChild(fl);
      page.appendChild(p); this.panels.push(p);
    });
    this.stage.appendChild(page); this.pageEl = page;
  }

  private finish() {
    if (this.done) return; this.done = true; this.fade.classList.add('on');
    setTimeout(() => { this.opts.onDone?.(); this.dispose(); }, 950);
  }

  dispose() { this.cleanup.forEach(f => f()); this.cleanup = []; this.root.remove(); }
}
