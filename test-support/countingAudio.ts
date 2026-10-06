// An instrumented Web Audio stand-in for the audio tests: it records every node created, what it
// connects to, whether it was started / stopped / disconnected, and every automation on its
// parameters. suspend() / resume() change `state`, and currentTime is moved by the test.

export class CountingParam {
  value: number;
  events: { kind: string; value: number; time: number }[] = [];
  constructor(value = 0) { this.value = value; }
  private log(kind: string, value: number, time: number) { this.events.push({ kind, value, time }); return this; }
  setValueAtTime(v: number, t: number) { return this.log('set', v, t); }
  linearRampToValueAtTime(v: number, t: number) { return this.log('linear', v, t); }
  exponentialRampToValueAtTime(v: number, t: number) { return this.log('exp', v, t); }
  setTargetAtTime(v: number, t: number) { return this.log('target', v, t); }
  cancelScheduledValues(t: number) { return this.log('cancel', 0, t); }
  // The value the last scheduled automation heads to
  target(): number {
    const last = [...this.events].reverse().find(e => e.kind !== 'cancel');
    return last ? last.value : this.value;
  }
}

export class CountingNode {
  kind: string;
  outputs = new Set<any>();
  disconnected = false;
  started = false;
  stopped = false;
  startTime = 0;
  // AudioParams by name, created on first use
  private params = new Map<string, CountingParam>();
  [key: string]: any;

  constructor(kind: string) {
    this.kind = kind;
    return new Proxy(this, {
      get: (t, prop) => {
        if (prop in t) return (t as any)[prop];
        if (typeof prop !== 'string' || prop === 'then') return undefined;
        if (!t.params.has(prop)) t.params.set(prop, new CountingParam());
        return t.params.get(prop);
      },
      set: (t, prop, v) => { (t as any)[prop] = v; return true; }
    });
  }
  connect(n: any) { this.outputs.add(n); this.disconnected = false; return n; }
  disconnect() { this.outputs.clear(); this.disconnected = true; }
  start(when = 0) { this.started = true; this.startTime = when; }
  stop() { this.stopped = true; }
  addEventListener() {}
  removeEventListener() {}
  param(name: string): CountingParam { return (this as any)[name]; }
}

export class CountingAudioContext {
  static all: CountingAudioContext[] = [];
  currentTime = 0;
  sampleRate = 8000; // small noise buffers
  state: 'running' | 'suspended' | 'closed' = 'running';
  nodes: CountingNode[] = [];
  destination = new CountingNode('destination');
  listener = new CountingNode('listener');
  suspends = 0;
  resumes = 0;

  constructor() { CountingAudioContext.all.push(this); }
  resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
  suspend() { this.suspends++; this.state = 'suspended'; return Promise.resolve(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (c: number) => data[c] };
  }
  createPeriodicWave() { return {}; }
  private make(kind: string): any {
    const n = new CountingNode(kind);
    this.nodes.push(n);
    return n;
  }
  createGain() { return this.make('gain'); }
  createOscillator() { return this.make('oscillator'); }
  createBufferSource() { return this.make('bufferSource'); }
  createBiquadFilter() { return this.make('biquad'); }
  createStereoPanner() { return this.make('panner'); }
  createPanner() { return this.make('panner3d'); }
  createDelay() { return this.make('delay'); }
  createConvolver() { return this.make('convolver'); }
  createDynamicsCompressor() { return this.make('compressor'); }
  createWaveShaper() { return this.make('waveshaper'); }
  createAnalyser() { return this.make('analyser'); }

  // Nodes still wired into the graph
  connectedNodes(): CountingNode[] {
    return this.nodes.filter(n => !n.disconnected);
  }
}
