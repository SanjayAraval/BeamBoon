// Procedural Web Audio Synthesizer for CoverUp

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private heartbeatOsc: OscillatorNode | null = null;
  private heartbeatGain: GainNode | null = null;
  private isHeartbeatRunning = false;
  private heartbeatBpm = 60;
  private heartbeatTimer: number | null = null;
  private masterVolume = 0.8;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  public init(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.ctx.destination);

    this.startAmbientHum();
  }

    public setAmbientVolume(vol: number): void {
    if (this.ambientGain) {
      this.ambientGain.gain.value = vol;
    }
  }
  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  // Continuous ambient house hum / dark drone
  private startAmbientHum(): void {
    if (!this.ctx || !this.masterGain) return;

    // Sub-bass drone
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    this.ambientGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.value = 45; // Low hum

    osc2.type = 'sine';
    osc2.frequency.value = 48.5; // Slight binaural beat

    filter.type = 'lowpass';
    filter.frequency.value = 120;

    this.ambientGain.gain.value = 0.25;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    osc1.start();
    osc2.start();

    // Subtle wind noise modulation
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 250;
    noiseFilter.Q.value = 3.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.04;

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start();
  }

  // Heartbeat sound system - updates rate dynamically with paranoia (0 - 100)
  public updateHeartbeat(paranoia: number): void {
    if (!this.ctx) return;
    
    // BPM scales from 60 (at 0 paranoia) to 150 (at 100 paranoia)
    const targetBpm = 60 + (paranoia / 100) * 90;
    this.heartbeatBpm = targetBpm;

    if (!this.isHeartbeatRunning && paranoia > 10) {
      this.isHeartbeatRunning = true;
      this.scheduleHeartbeatPulse();
    } else if (paranoia <= 5 && this.isHeartbeatRunning) {
      this.isHeartbeatRunning = false;
      if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    }
  }

  private scheduleHeartbeatPulse = (): void => {
    if (!this.isHeartbeatRunning || !this.ctx || !this.masterGain) return;

    // Double thump (lub-dub)
    const now = this.ctx.currentTime;
    this.playThump(now, 65, 0.12, 0.8);
    this.playThump(now + 0.14, 50, 0.1, 0.5);

    const intervalMs = (60 / this.heartbeatBpm) * 1000;
    this.heartbeatTimer = window.setTimeout(this.scheduleHeartbeatPulse, intervalMs);
  };

  // A single quiet lub-dub, without starting the heartbeat loop
  public playHeartbeatPulse(volume = 0.5): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.playThump(now, 65, 0.12, 0.8 * volume);
    this.playThump(now + 0.14, 50, 0.1, 0.5 * volume);
  }

  private playThump(time: number, freq: number, duration: number, vol: number): void {
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
  }

  // Door knock sound (spatial panning optional)
  public playDoorKnock(panX = 0): void {
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
    if (!this.ctx || !this.masterGain) return;

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
  public playThunder(intensity: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 2.0);
    gain.gain.setValueAtTime(intensity, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2.0);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 2.0);
  }

  public playCreak(): void {
    if (!this.ctx || !this.masterGain) return;
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
    if (!this.ctx || !this.masterGain) return;
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
    if (!this.ctx || !this.masterGain) return;
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
    if (!this.ctx || !this.masterGain) return;
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
    if (!this.ctx || !this.masterGain) return;
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
