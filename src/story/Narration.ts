// Narrator caption queue system that fires on game state beats without blocking

export interface NarratorBeat {
  id: string;
  text: string;
  duration: number; // in seconds
  fired: boolean;
}

export class Narration {
  private beats: Map<string, NarratorBeat> = new Map();
  private captionElement: HTMLElement | null = null;
  private textElement: HTMLElement | null = null;
  private currentTimeout: number | null = null;

  constructor() {
    this.captionElement = document.getElementById('narrator-caption');
    this.textElement = document.getElementById('narrator-text');

    this.registerBeat('act1_intro', '"It was just another Friday night horror movie marathon..."', 4.0);
    this.registerBeat('act1_shadows', '"The shadows in the hall seemed taller tonight. Or was it just his mind playing tricks?"', 4.5);
    this.registerBeat('act1_defended', '"The gun dropped from his trembling hands... as the room flooded with light."', 5.0);
    this.registerBeat('act2_coverup', '"No time to panic. If anyone sees this... it\'s over. He had to cover it up."', 5.0);
    this.registerBeat('visitor_knocking', '"A heavy knock rattled the front door. Someone was standing outside in the dark."', 4.0);
    this.registerBeat('evidence_cleaned', '"The floor was spotless. But the stain in his memory would never wash out."', 4.5);
  }

  public registerBeat(id: string, text: string, duration = 4.0): void {
    this.beats.set(id, { id, text, duration, fired: false });
  }

  public triggerBeat(id: string): void {
    const beat = this.beats.get(id);
    if (!beat || beat.fired) return;

    beat.fired = true;
    this.showCaption(beat.text, beat.duration);
  }

  public showCaption(text: string, duration = 4.0): void {
    if (!this.captionElement || !this.textElement) return;

    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }

    this.textElement.innerText = text;
    this.captionElement.classList.remove('hidden');

    this.currentTimeout = window.setTimeout(() => {
      if (this.captionElement) {
        this.captionElement.classList.add('hidden');
      }
    }, duration * 1000);
  }
}
