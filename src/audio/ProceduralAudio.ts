// Procedural Web Audio Synthesizer for CoverUp

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;   // the MusicDirector plays into this, below the SFX
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private heartbeatOsc: OscillatorNode | null = null;
  private heartbeatGain: GainNode | null = null;
  private isHeartbeatRunning = false;
  private heartbeatBpm = 60;
  private heartbeatTimer: number | null = null;
  private masterVolume = 0.6;
  public static readonly HEARTBEAT_ABOVE = 70; // the heartbeat only kicks in above this paranoia
  public static readonly MUSIC_LEVEL = 0.35;   // music sits under the SFX

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  // Called from the first user gesture (browsers refuse audio before one)
  public init(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // master -> limiter -> speakers: nothing the game layers up can clip
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.getOutputLevel();
    this.masterGain.connect(limiter);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = ProceduralAudio.MUSIC_LEVEL;
    this.musicBus.connect(this.masterGain);

    const len = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.applyMaster();
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMaster();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  // The level actually sent to the speakers (0 when muted)
  public getOutputLevel(): number {
    return this.muted ? 0 : this.masterVolume;
  }

  private applyMaster(): void {
    if (!this.masterGain || !this.ctx) return; // also while suspended (muting during pause)
    const g = this.masterGain.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.getOutputLevel(), now + 0.05); // no click
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMusicBus(): GainNode | null {
    return this.musicBus;
  }

  public getNoiseBuffer(): AudioBuffer | null {
    return this.noiseBuffer;
  }

  // A one-shot burst of filtered noise into the master bus
  private noiseBurst(at: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 1, pan = 0, freqEnd?: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.ctx.state !== 'running') return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, at);
    if (freqEnd !== undefined) filter.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.01, dur / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter);
    filter.connect(gain);
    if (pan !== 0) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      gain.connect(p);
      p.connect(this.masterGain);
    } else {
      gain.connect(this.masterGain);
    }
    src.start(at, Math.random() * 1.5);
    src.stop(at + dur + 0.05);
  }

  // Heartbeat sound system - updates rate dynamically with paranoia (0 - 100)
  public updateHeartbeat(paranoia: number): void {
    if (!this.ctx) return;
    
    // BPM scales from 60 (at 0 paranoia) to 150 (at 100 paranoia)
    const targetBpm = 60 + (paranoia / 100) * 90;
    this.heartbeatBpm = targetBpm;

    if (!this.isHeartbeatRunning && paranoia > ProceduralAudio.HEARTBEAT_ABOVE) {
      this.isHeartbeatRunning = true;
      this.scheduleHeartbeatPulse();
    } else if (paranoia <= ProceduralAudio.HEARTBEAT_ABOVE - 5 && this.isHeartbeatRunning) {
      this.isHeartbeatRunning = false;
      if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    }
  }

  public isHeartbeatOn(): boolean {
    return this.isHeartbeatRunning;
  }

  private scheduleHeartbeatPulse = (): void => {
    if (!this.isHeartbeatRunning || !this.ctx || !this.masterGain) return;
    if (this.ctx.state !== 'running') { // paused: keep time silently, never queue beats
      this.heartbeatTimer = window.setTimeout(this.scheduleHeartbeatPulse, (60 / this.heartbeatBpm) * 1000);
      return;
    }

    // Double thump (lub-dub)
    const now = this.ctx.currentTime;
    this.playThump(now, 65, 0.12, 0.8);
    this.playThump(now + 0.14, 50, 0.1, 0.5);

    const intervalMs = (60 / this.heartbeatBpm) * 1000;
    this.heartbeatTimer = window.setTimeout(this.scheduleHeartbeatPulse, intervalMs);
  };

  // A single quiet lub-dub, without starting the heartbeat loop
  public playHeartbeatPulse(volume = 0.5): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    this.playThump(now, 65, 0.12, 0.8 * volume);
    this.playThump(now + 0.14, 50, 0.1, 0.5 * volume);
  }

  private playThump(time: number, freq: number, duration: number, vol: number): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(10, time + duration);

    gain.gain.setValueAtTime(vol * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Footstep sound generator (type: 'wood' | 'tile' | 'carpet')
  public playFootstep(type: 'wood' | 'tile' | 'carpet' = 'wood'): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    let baseFreq = 80;
    let duration = 0.08;
    let volume = 0.2;

    if (type === 'tile') {
      baseFreq = 160;
      duration = 0.05;
      volume = 0.15;
    } else if (type === 'carpet') {
      baseFreq = 50;
      duration = 0.12;
      volume = 0.1;
    }

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 20, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + duration);

    filter.type = 'lowpass';
    filter.frequency.value = baseFreq * 2.5;

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
    if (type === 'wood') this.noiseBurst(now, 0.05, 0.05, 'bandpass', 1800 + Math.random() * 600, 3); // the board clicks
  }

  // Door knock sound (spatial panning optional)
  public playDoorKnock(panX = 0): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, panX));

    for (let i = 0; i < 3; i++) {
      const now = this.ctx.currentTime + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(120 + Math.random() * 30, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.06);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(panner);

      osc.start(now);
      osc.stop(now + 0.06);
    }
    panner.connect(this.masterGain);
  }

  // Gunshot sound (BANG)
  public playGunshot(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    
    // Noise blast
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  // Knife swing / slash sound
  public playKnifeSlash(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Lamp switch click
  public playLampClick(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // Muffled TV zombie audio (plays during Act 1 / Movie night)
  public playTVAudio(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    // Low growl synthesis
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.4);
    osc.frequency.linearRampToValueAtTime(70, now + 0.8);

    filter.type = 'lowpass';
    filter.frequency.value = 350; // Muffled TV speaker effect

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  // Dog bark sound
  public playDogBark(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Distant sirens
  public playSiren(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(900, now + 1.0);
    osc.frequency.linearRampToValueAtTime(600, now + 2.0);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 2.0);
  }
  // Thunder. distance 0 = right overhead (a sharp crack, then the rumble), 1 = far away (late, low, soft)
  public playThunder(intensity: number, distance = 0.5): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const d = Math.max(0, Math.min(1, distance));
    const at = this.ctx.currentTime + d * 1.6; // the sound arrives after the flash
    const vol = Math.min(1, intensity) * (1 - 0.6 * d);
    if (d < 0.5) this.noiseBurst(at, 0.25, 0.5 * vol * (1 - d * 2), 'highpass', 1200, 0.7);
    this.noiseBurst(at, 2.2 + 2 * d, 0.6 * vol, 'lowpass', 900 - 700 * d, 0.8, (Math.random() - 0.5) * 0.6, 60);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(48, at);
    osc.frequency.exponentialRampToValueAtTime(22, at + 2.5);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.4 * vol, at + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.5 + d);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(at);
    osc.stop(at + 2.6 + d);
  }

  // A wooden door swinging: a wobbling hinge creak (open) or a soft thud (close)
  public playDoorCreak(open: boolean): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (!open) {
      this.noiseBurst(now, 0.18, 0.35, 'lowpass', 300, 1);
      this.playThump(now, 70, 0.15, 0.9);
      return;
    }
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160 + Math.random() * 40, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.5);
    osc.frequency.linearRampToValueAtTime(140, now + 0.9);
    lfo.frequency.value = 18 + Math.random() * 8; // the stick-slip of the hinge
    lfoGain.gain.value = 35;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 4;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 1.0);
    lfo.stop(now + 1.0);
  }

  // A desk drawer sliding on wooden runners, then knocking against its stop
  public playDrawer(open = true): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    this.noiseBurst(now, 0.32, 0.18, 'bandpass', open ? 700 : 1100, 2.5, 0, open ? 1100 : 600);
    this.playThump(now + 0.3, 140, 0.06, 0.8);
  }

  // Picking something up: two quick rising blips
  public playPickup(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    [660, 990].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + i * 0.07;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  // Choosing a dialogue answer
  public playUiTick(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playCreak(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playWindowTap(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    for (let i=0; i<2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime + i * 0.2);
      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + i * 0.2 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.2 + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.ctx.currentTime + i * 0.2);
      osc.stop(this.ctx.currentTime + i * 0.2 + 0.1);
    }
  }

  public playGroan(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  public playBreath(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const gain = this.ctx.createGain();
    const bufferSize = this.ctx.sampleRate * 2.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 1.0);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.0);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }

  public playNewsWarning(): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(180, this.ctx.currentTime + 2.0);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2.0);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 2.0);
  }

}
