import { GamePhase } from '../game/GameFlow';
import { ProceduralAudio } from './ProceduralAudio';

export class SoundManager {
  private static instance: SoundManager | null = null;
  private audio: ProceduralAudio;
  private initialized = false;

  private constructor() {
    this.audio = new ProceduralAudio();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public init(): void {
    if (this.initialized) return;
    this.audio.init();
    this.initialized = true;

    // Resume AudioContext on any user interaction if suspended
    const unlock = () => {
      const ctx = this.audio.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
  }

    private ambientInterval: number | null = null;
  public setPhaseAudio(phase: number): void {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    
    // Silence ambient rain/wind in ACT1_POWER_BACK (phase 6)
    if (phase === GamePhase.ACT1_POWER_BACK) {
      this.audio.setAmbientVolume(0);
    } else {
      this.audio.setAmbientVolume(0.25);
    }

    // Loop TV audio in ACT1_MOVIE (phase 2)
    if (phase === GamePhase.ACT1_MOVIE) {
      this.ambientInterval = setInterval(() => this.playTVAudio(), 4000);
    }
  }
  public setVolume(vol: number): void {
    this.audio.setMasterVolume(vol);
  }

  public updateHeartbeat(paranoia: number): void {
    this.audio.updateHeartbeat(paranoia);
  }

  public playFootstep(surface: 'wood' | 'tile' | 'carpet' = 'wood'): void {
    this.audio.playFootstep(surface);
  }

  public playKnock(panX = 0): void {
    this.audio.playDoorKnock(panX);
  }


  
  public playThunder(i: number) { this.audio.playThunder(i); }
  public playCreak() { this.audio.playCreak(); }
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

  public playSiren(): void {
    this.audio.playSiren();
  }
}
