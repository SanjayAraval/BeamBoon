import { GamePhase } from '../game/GameFlow';
import { ProceduralAudio } from './ProceduralAudio';
import { MusicDirector, MusicState } from './MusicDirector';

const GESTURES = ['click', 'mousedown', 'keydown', 'touchstart', 'pointerdown'];

export class SoundManager {
  private static instance: SoundManager | null = null;
  private audio: ProceduralAudio;
  private director: MusicDirector | null = null;
  private paused = false;

  private constructor() {
    this.audio = new ProceduralAudio();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  // No AudioContext until the first user gesture (the browser rule): the first click or key
  // creates it, resumes it and starts the music. The listener stays (it is a no-op afterwards);
  // adding the same listener again is ignored, so every new Game (or test window) can call this.
  public init(): void {
    for (const type of GESTURES) window.addEventListener(type, this.unlock, true);
  }

  private unlock = (): void => {
    if (this.director) return;
    this.audio.init();
    const ctx = this.audio.getContext();
    const bus = this.audio.getMusicBus();
    const noise = this.audio.getNoiseBuffer();
    if (!ctx || !bus || !noise) return;
    if (this.paused) ctx.suspend(); else if (ctx.state === 'suspended') ctx.resume();
    this.director = new MusicDirector(ctx, bus, noise);
  };

  public isUnlocked(): boolean {
    return this.director !== null;
  }

  public getContext(): AudioContext | null {
    return this.audio.getContext();
  }

  public getDirector(): MusicDirector | null {
    return this.director;
  }

  // Called every unpaused frame with what the score should follow
  public updateMusic(delta: number, state: MusicState): void {
    this.director?.update(delta, state);
  }

  // Esc: the whole mix stops where it is (and nothing queues up), then carries on
  public setPaused(paused: boolean): void {
    this.paused = paused;
    const ctx = this.audio.getContext();
    if (!ctx) return;
    if (paused && ctx.state === 'running') ctx.suspend();
    else if (!paused && ctx.state === 'suspended') ctx.resume();
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public toggleMute(): boolean {
    this.audio.setMuted(!this.audio.isMuted());
    return this.audio.isMuted();
  }

  public isMuted(): boolean {
    return this.audio.isMuted();
  }

  public getOutputLevel(): number {
    return this.audio.getOutputLevel();
  }

  private ambientInterval: ReturnType<typeof setInterval> | null = null;
  public setPhaseAudio(phase: number): void {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }

    // Loop TV audio in ACT1_MOVIE (phase 2)
    if (phase === GamePhase.ACT1_MOVIE) {
      this.ambientInterval = setInterval(() => this.playTVAudio(), 4000);
    }
  }

  public setVolume(vol: number): void {
    this.audio.setMasterVolume(vol);
  }

  public getVolume(): number {
    return this.audio.getMasterVolume();
  }

  public updateHeartbeat(paranoia: number): void {
    this.audio.updateHeartbeat(paranoia);
  }

  public isHeartbeatOn(): boolean {
    return this.audio.isHeartbeatOn();
  }

  public playFootstep(surface: 'wood' | 'tile' | 'carpet' = 'wood'): void {
    this.audio.playFootstep(surface);
  }

  public playKnock(panX = 0): void {
    this.audio.playDoorKnock(panX);
  }

  // distance 0 (overhead) .. 1 (far); random when not given
  public playThunder(i: number, distance = Math.random()) { this.audio.playThunder(i, distance); }
  public playCreak() { this.audio.playCreak(); }
  public playDoorCreak(open: boolean) { this.audio.playDoorCreak(open); }
  public playDrawer(open: boolean) { this.audio.playDrawer(open); }
  public playPickup() { this.audio.playPickup(); }
  public playUiTick() { this.audio.playUiTick(); }
  public playSting() { this.director?.sting(); }
  public playWindowTap() { this.audio.playWindowTap(); }
  public playGroan() { this.audio.playGroan(); }
  public playBreath() { this.audio.playBreath(); }
  public playNewsWarning() { this.audio.playNewsWarning(); }
  public playGunshot(): void {
    this.audio.playGunshot();
  }

  public playKnifeSlash(): void {
    this.audio.playKnifeSlash();
  }

  public playLampClick(): void {
    this.audio.playLampClick();
  }

  public playTVAudio(): void {
    this.audio.playTVAudio();
  }

  public playDogBark(): void {
    this.audio.playDogBark();
  }

  // Short, quiet sounds for the intro comic's cues. Unknown cues play nothing.
  public playComicCue(cue: string): void {
    switch (cue) {
      case 'thunder': this.audio.playThunder(0.3, 0.8); break;   // distant rumble
      case 'tv': this.audio.playTVAudio(); break;                // muffled low murmur
      case 'click': this.audio.playLampClick(); break;           // door / lock click
      case 'heartbeat': this.audio.playHeartbeatPulse(0.5); break;
    }
  }

  public playSiren(): void {
    this.audio.playSiren();
  }
}
