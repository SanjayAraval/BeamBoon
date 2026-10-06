// Procedural score: one layered track per moment of the game, crossfaded (1.5 s) as the phase,
// the visitor and paranoia change. Everything is synthesized (oscillators, filtered noise, small
// step sequencers). Each track owns its nodes: when it has faded out it stops and disconnects
// them all, so nothing piles up over a long session.
//
// Time: the director keeps its own clock, advanced by update(delta) on the game clock. Notes are
// scheduled a little ahead on the AudioContext clock relative to it.

import { GamePhase } from '../game/GameFlow';
import type { EndingType } from '../story/Endings';

export type TrackId =
  | 'none' | 'musicbox' | 'explore' | 'blackout' | 'tension' | 'coverup' | 'visitor'
  | 'end_caught' | 'end_run' | 'end_clean' | 'end_breakdown';

export interface MusicState {
  phase: GamePhase;
  paranoia: number;        // 0..100
  visitorAtDoor: boolean;
  inDialogue: boolean;
  ending: EndingType | null;
}

export const CROSSFADE = 1.5;
const LOOKAHEAD = 0.25; // seconds of notes scheduled ahead

export function pickTrack(s: MusicState): TrackId {
  switch (s.phase) {
    case GamePhase.TITLE:
    case GamePhase.MONTAGE:
      return 'musicbox';
    case GamePhase.ACT1_INTRO:
    case GamePhase.ACT1_MOVIE:
    case GamePhase.ACT1_POWER_BACK:
      return 'explore';
    case GamePhase.ACT1_BLACKOUT:
      return 'blackout';
    case GamePhase.ACT1_ARRIVAL:
    case GamePhase.ACT1_SHOOTING:
      return 'tension';
    case GamePhase.ENDING:
      return s.ending ? `end_${s.ending}` as TrackId : 'none';
    default: // the cover-up, the visitors and the final inspection
      return s.visitorAtDoor || s.inDialogue ? 'visitor' : 'coverup';
  }
}

interface OneShot { nodes: AudioNode[]; end: number; }

class Track {
  readonly out: GainNode;
  private persistent: AudioNode[] = [];
  private sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private oneShots: OneShot[] = [];
  next = 0;              // director time of the next sequencer step
  step = 0;
  started: number;       // director time the track started
  fadeEnd = 0;           // director time its current fade completes
  fadingOut = false;
  disposed = false;

  constructor(readonly id: TrackId, readonly dir: MusicDirector, now: number) {
    this.out = dir.ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dir.dest);
    this.started = now;
    this.next = now;
  }

  // A node that lives as long as the track
  keep<T extends AudioNode>(n: T): T {
    this.persistent.push(n);
    if ((n as any).start && (n as any).stop) this.sources.push(n as any);
    return n;
  }

  // Nodes for one note, released after `end` (director time)
  shot(nodes: AudioNode[], end: number): void {
    this.oneShots.push({ nodes, end });
  }

  prune(now: number): void {
    if (!this.oneShots.length) return;
    const keep: OneShot[] = [];
    for (const s of this.oneShots) {
      if (s.end <= now) for (const n of s.nodes) n.disconnect();
      else keep.push(s);
    }
    this.oneShots = keep;
  }

  liveNodes(): number {
    if (this.disposed) return 0;
    return 1 + this.persistent.length + this.oneShots.reduce((a, s) => a + s.nodes.length, 0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    for (const n of this.persistent) n.disconnect();
    for (const s of this.oneShots) for (const n of s.nodes) n.disconnect();
    this.persistent = [];
    this.sources = [];
    this.oneShots = [];
    this.out.disconnect();
  }
}

export class MusicDirector {
  private tracks: Track[] = [];   // the current one last; earlier ones are fading out
  private current: Track | null = null;
  private time = 0;
  private paranoia = 0;

  constructor(readonly ctx: AudioContext, readonly dest: AudioNode, private noise: AudioBuffer) {}

  // --- Public ------------------------------------------------------------------------------

  public update(delta: number, state: MusicState): void {
    this.time += Math.max(0, delta);
    this.paranoia = Math.max(0, Math.min(100, state.paranoia));
    const want = pickTrack(state);
    if (!this.current || this.current.id !== want) this.switchTo(want);

    for (const t of this.tracks) {
      t.prune(this.time);
      if (t.fadingOut && this.time >= t.fadeEnd) t.dispose();
      else if (!t.fadingOut) this.sequence(t);
    }
    this.tracks = this.tracks.filter(t => !t.disposed);
  }

  public getTrack(): TrackId {
    return this.current?.id ?? 'none';
  }

  // Tracks still sounding (the current one plus any fading out)
  public getTrackCount(): number {
    return this.tracks.length;
  }

  public isCrossfading(): boolean {
    return this.tracks.some(t => t.fadingOut) || (!!this.current && this.time < this.current.fadeEnd);
  }

  public getLiveNodeCount(): number {
    return this.tracks.reduce((a, t) => a + t.liveNodes(), 0);
  }

  // The shot in the shooting scene: a short orchestral-ish stab over the tension drone
  public sting(): void {
    const t = this.current;
    if (!t) return;
    const at = this.at(this.time);
    [220, 233, 330, 349].forEach(f => this.tone(t, at, f, 0.9, 0.12, 'sawtooth', 0.004, 1800));
    this.tone(t, at, 55, 1.4, 0.4, 'sine', 0.004);
  }

  public dispose(): void {
    for (const t of this.tracks) t.dispose();
    this.tracks = [];
    this.current = null;
  }

  // --- Track switching -----------------------------------------------------------------------

  private switchTo(id: TrackId): void {
    const now = this.time;
    const at = this.at(now);
    for (const t of this.tracks) {
      if (t.fadingOut) continue;
      t.fadingOut = true;
      t.fadeEnd = now + CROSSFADE;
      const g = t.out.gain;
      g.cancelScheduledValues(at);
      g.setValueAtTime(g.value, at);
      g.linearRampToValueAtTime(0, at + CROSSFADE);
    }
    const track = new Track(id, this, now);
    track.fadeEnd = now + CROSSFADE;
    track.out.gain.setValueAtTime(0, at);
    track.out.gain.linearRampToValueAtTime(1, at + CROSSFADE);
    this.current = track;
    this.tracks.push(track);
    this.build(track);
  }

  // Context time for a director time (never in the past)
  private at(t: number): number {
    return this.ctx.currentTime + Math.max(0, t - this.time);
  }

  // --- Building blocks -----------------------------------------------------------------------

  private loopNoise(t: Track, type: BiquadFilterType, freq: number, q: number, vol: number): { filter: BiquadFilterNode; gain: GainNode } {
    const src = t.keep(this.ctx.createBufferSource());
    src.buffer = this.noise;
    src.loop = true;
    const filter = t.keep(this.ctx.createBiquadFilter());
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = t.keep(this.ctx.createGain());
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(t.out);
    src.start(this.at(this.time), Math.random() * 1.5);
    return { filter, gain };
  }

  private drone(t: Track, type: OscillatorType, freq: number, vol: number, cutoff = 400): OscillatorNode {
    const osc = t.keep(this.ctx.createOscillator());
    osc.type = type;
    osc.frequency.value = freq;
    const filter = t.keep(this.ctx.createBiquadFilter());
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = t.keep(this.ctx.createGain());
    gain.gain.value = vol;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(t.out);
    osc.start(this.at(this.time));
    return osc;
  }

  // Slow wobble on an AudioParam
  private lfo(t: Track, rate: number, depth: number, param: AudioParam): void {
    const osc = t.keep(this.ctx.createOscillator());
    osc.frequency.value = rate;
    const g = t.keep(this.ctx.createGain());
    g.gain.value = depth;
    osc.connect(g);
    g.connect(param);
    osc.start(this.at(this.time));
  }

  // One enveloped note
  private tone(t: Track, at: number, freq: number, dur: number, vol: number, type: OscillatorType = 'sine', attack = 0.005, cutoff = 0): void {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    const nodes: AudioNode[] = [osc, gain];
    if (cutoff > 0) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      osc.connect(f);
      f.connect(gain);
      nodes.push(f);
    } else {
      osc.connect(gain);
    }
    gain.connect(t.out);
    osc.start(at);
    osc.stop(at + dur + 0.02);
    t.shot(nodes, this.time + (at - this.ctx.currentTime) + dur + 0.1);
  }

  private hit(t: Track, at: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 1): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(t.out);
    src.start(at, Math.random() * 1.5);
    src.stop(at + dur + 0.02);
    t.shot([src, filter, gain], this.time + (at - this.ctx.currentTime) + dur + 0.1);
  }

  // A heartbeat-like double pulse
  private pulse(t: Track, at: number, freq: number, vol: number): void {
    const thump = (when: number, f: number, v: number) => {
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(f, when);
      osc.frequency.exponentialRampToValueAtTime(f * 0.5, when + 0.18);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(v, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
      osc.connect(gain);
      gain.connect(t.out);
      osc.start(when);
      osc.stop(when + 0.22);
      t.shot([osc, gain], this.time + (when - this.ctx.currentTime) + 0.3);
    };
    thump(at, freq, vol);
    thump(at + 0.16, freq * 0.8, vol * 0.6);
  }

  // --- The tracks ------------------------------------------------------------------------------

  // Persistent layers, built once when the track starts; one-shot cues for the endings
  private build(t: Track): void {
    const at = this.at(this.time);
    switch (t.id) {
      case 'musicbox':
        this.loopNoise(t, 'lowpass', 500, 0.5, 0.015); // a faint hiss under the box
        break;
      case 'explore': {
        this.loopNoise(t, 'lowpass', 350, 0.5, 0.05);           // room tone
        const rain = this.loopNoise(t, 'bandpass', 2600, 0.6, 0.06); // rain on the windows
        this.lfo(t, 0.13, 0.02, rain.gain.gain);
        const d1 = this.drone(t, 'sawtooth', 55, 0.07, 160);    // slow low drone
        this.drone(t, 'sine', 82.6, 0.06);
        this.lfo(t, 0.05, 1.5, d1.frequency);
        break;
      }
      case 'blackout': {
        // No music: wind, and the house breathing
        const wind = this.loopNoise(t, 'bandpass', 420, 1.2, 0.09);
        this.lfo(t, 0.09, 220, wind.filter.frequency);
        this.lfo(t, 0.21, 0.04, wind.gain.gain);
        break;
      }
      case 'tension': {
        const a = this.drone(t, 'sawtooth', 55, 0.06, 300);
        const b = this.drone(t, 'sawtooth', 55.7, 0.06, 300);
        for (const o of [a, b]) {
          o.frequency.setValueAtTime(o.frequency.value, at);
          o.frequency.exponentialRampToValueAtTime(o.frequency.value * 2, at + 60); // keeps rising
        }
        this.drone(t, 'sine', 41.2, 0.08);
        this.loopNoise(t, 'highpass', 5000, 0.5, 0.008);
        break;
      }
      case 'coverup':
        this.drone(t, 'sine', 49, 0.04);
        break;
      case 'visitor': {
        // Hush: just a held, beating minor second
        const n1 = this.drone(t, 'triangle', 233.1, 0.035, 900);
        this.drone(t, 'triangle', 246.9, 0.025, 900);
        this.lfo(t, 5.5, 2, n1.frequency);
        break;
      }
      case 'end_caught': // siren-like sting
        for (let i = 0; i < 4; i++) {
          const s = at + i * 0.7;
          this.tone(t, s, i % 2 ? 660 : 880, 0.65, 0.09, 'sawtooth', 0.02, 2500);
          this.tone(t, s, i % 2 ? 667 : 887, 0.65, 0.06, 'square', 0.02, 1800);
        }
        this.tone(t, at, 41, 2.5, 0.35, 'sine', 0.005);
        this.hit(t, at, 1.2, 0.3, 'lowpass', 400);
        break;
      case 'end_run': { // a fast, running rhythm
        const beat = 60 / 180 / 2;
        for (let i = 0; i < 24; i++) {
          const s = at + i * beat;
          if (i % 4 === 0) this.pulse(t, s, 70, 0.35);
          this.hit(t, s, 0.04, i % 2 ? 0.05 : 0.09, 'highpass', 6000);
          if (i % 2 === 0) this.tone(t, s, [110, 110, 131, 147][(i / 2) % 4], beat * 1.8, 0.07, 'sawtooth', 0.005, 900);
        }
        break;
      }
      case 'end_clean': // relief: a slow major chord swelling up
        [261.6, 329.6, 392.0, 523.3].forEach((f, i) => this.tone(t, at + i * 0.12, f, 5, 0.07, 'triangle', 0.8, 2000));
        this.tone(t, at, 130.8, 5, 0.08, 'sine', 1.0);
        break;
      case 'end_breakdown': { // distorted, chaotic
        const shaper = this.ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 12); }
        shaper.curve = curve;
        const g = this.ctx.createGain();
        g.gain.value = 0.25;
        shaper.connect(g);
        g.connect(t.out);
        const nodes: AudioNode[] = [shaper, g];
        for (let i = 0; i < 14; i++) {
          const s = at + Math.random() * 3.5;
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(60 + Math.random() * 500, s);
          osc.frequency.exponentialRampToValueAtTime(30 + Math.random() * 900, s + 0.6);
          const og = this.ctx.createGain();
          og.gain.setValueAtTime(0.0001, s);
          og.gain.exponentialRampToValueAtTime(0.5, s + 0.02);
          og.gain.exponentialRampToValueAtTime(0.0001, s + 0.6);
          osc.connect(og);
          og.connect(shaper);
          osc.start(s);
          osc.stop(s + 0.65);
          nodes.push(osc, og);
        }
        t.shot(nodes, this.time + 4.5);
        this.hit(t, at, 3.5, 0.15, 'bandpass', 900, 0.5);
        break;
      }
    }
  }

  // Step sequencers: schedule each looping track's next notes up to LOOKAHEAD ahead
  private sequence(t: Track): void {
    const until = this.time + LOOKAHEAD;
    let guard = 0;
    while (t.next < until && guard++ < 32) {
      const at = this.at(t.next);
      const p = this.paranoia / 100;
      switch (t.id) {
        case 'musicbox': {
          // A slightly out-of-tune music box in A minor, slowing at the end of each bar
          const melody = [0, 3, 7, 12, 10, 7, 3, 5, 0, 3, 7, 8, 7, 3, 2, -2];
          const semis = melody[t.step % melody.length];
          const f = 440 * Math.pow(2, semis / 12) * (1 + (Math.random() - 0.5) * 0.006);
          this.tone(t, at, f, 1.4, 0.08, 'sine', 0.003);
          this.tone(t, at, f * 2.01, 0.5, 0.025, 'triangle', 0.003); // tine shimmer
          t.next += t.step % 8 === 7 ? 0.9 : 0.42;
          break;
        }
        case 'explore':
          // A distant, sparse low note now and then
          if (t.step % 3 === 0) this.tone(t, at, [110, 98, 103.8][(t.step / 3) % 3], 4, 0.035, 'sine', 1.2);
          t.next += 4;
          break;
        case 'blackout':
          this.pulse(t, at, 52, 0.18); // slow, heartbeat-like
          t.next += 1.6;
          break;
        case 'tension':
          // A ticking pulse that tightens the longer it goes
          this.pulse(t, at, 60, 0.12);
          t.next += Math.max(0.45, 1.2 - (t.next - t.started) * 0.02);
          break;
        case 'coverup': {
          // Clock tick/tock; the low pulse rises in tempo and pitch with paranoia
          const interval = 1.0 - 0.5 * p;
          this.hit(t, at, 0.03, 0.08, 'bandpass', t.step % 2 ? 2600 : 3400, 8);
          if (t.step % 2 === 0) this.pulse(t, at, 45 + 40 * p, 0.12 + 0.1 * p);
          t.next += interval;
          break;
        }
        case 'visitor':
          // Silence, then a faint high tick, like someone listening
          if (t.step % 2 === 1) this.tone(t, at, 1975, 0.08, 0.015, 'sine', 0.002);
          t.next += 2.5;
          break;
        default:
          t.next = Infinity; // the endings and 'none' do not loop
      }
      t.step++;
    }
  }
}
