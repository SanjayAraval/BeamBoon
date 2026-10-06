import { WeaponType } from '../core/Arsenal';

export class HUD {
  private hudElement: HTMLElement | null;
  private paranoiaFill: HTMLElement | null;
  private paranoiaVal: HTMLElement | null;
  private flashlightStatus: HTMLElement | null;
  private weaponName: HTMLElement | null;
  private promptElement: HTMLElement | null;
  private promptText: HTMLElement | null;
  private doorPromptElement: HTMLElement | null;
  private btnDoorAttack: HTMLElement | null;

  constructor() {
    this.hudElement = document.getElementById('hud');
    this.paranoiaFill = document.getElementById('paranoia-fill');
    this.paranoiaVal = document.getElementById('paranoia-val');
    this.flashlightStatus = document.getElementById('flashlight-status');
    this.weaponName = document.getElementById('weapon-name');
    this.promptElement = document.getElementById('interaction-prompt');
    this.promptText = document.getElementById('interaction-text');
    this.doorPromptElement = document.getElementById('door-prompt');
    this.btnDoorAttack = document.getElementById('btn-door-attack');
  }

    public showObjective(text: string): void {
    const objCap = document.getElementById('objective-caption');
    const objText = document.getElementById('objective-text');
    if (objCap && objText) {
      objText.innerText = text;
      objCap.classList.remove('hidden');
      objCap.style.opacity = '1';
      setTimeout(() => {
        objCap.style.opacity = '0';
        setTimeout(() => objCap.classList.add('hidden'), 500);
      }, 5000);
    }
  }

  public fade(opacity: number): void {
    const fadeOverlay = document.getElementById('fade-overlay');
    if (fadeOverlay) {
      fadeOverlay.style.opacity = opacity.toString();
    }
  }
  public show(): void {
    if (this.hudElement) this.hudElement.classList.remove('hidden');
  }

  public hide(): void {
    if (this.hudElement) this.hudElement.classList.add('hidden');
  }

  public updateParanoia(val: number): void {
    const round = Math.round(val);
    if (this.paranoiaFill) this.paranoiaFill.style.width = `${round}%`;
    if (this.paranoiaVal) this.paranoiaVal.innerText = `${round}%`;
  }

  // The speaker icon (M toggles it)
  public updateMute(muted: boolean): void {
    const el = document.getElementById('audio-status');
    if (!el) return;
    el.innerText = muted ? '\u{1F507}' : '\u{1F50A}';
    el.title = muted ? 'Sound off (M)' : 'Sound on (M)';
    el.classList.toggle('muted', muted);
  }

  public updateFlashlight(isOn: boolean): void {
    if (this.flashlightStatus) {
      this.flashlightStatus.innerText = isOn ? 'ON' : 'OFF';
      this.flashlightStatus.style.color = isOn ? '#ffee00' : '#888';
    }
  }

  public updateWeapon(weapon: WeaponType, ammo: number): void {
    if (!this.weaponName) return;
    if (weapon === 'unarmed') {
      this.weaponName.innerText = 'UNARMED';
    } else if (weapon === 'knife') {
      this.weaponName.innerText = 'KITCHEN KNIFE';
    } else if (weapon === 'pistol') {
      this.weaponName.innerText = `PISTOL (${ammo} RDS)`;
    }
  }

  public showInteractionPrompt(text: string): void {
    if (this.promptElement && this.promptText) {
      this.promptText.innerText = text;
      this.promptElement.classList.remove('hidden');
    }
  }

  public flashInteractionPrompt(text: string): void {
    this.showInteractionPrompt(text);
    setTimeout(() => {
      this.hideInteractionPrompt();
    }, 1000);
  }

  public hideInteractionPrompt(): void {
    if (this.promptElement) {
      this.promptElement.classList.add('hidden');
    }
  }

  public showDoorPrompt(paranoia: number): void {
    if (this.doorPromptElement) {
      this.doorPromptElement.classList.remove('hidden');
    }
    // ATTACK option appears if Paranoia >= 70
    if (this.btnDoorAttack) {
      if (paranoia >= 70) {
        this.btnDoorAttack.classList.remove('hidden');
      } else {
        this.btnDoorAttack.classList.add('hidden');
      }
    }
  }

  public hideDoorPrompt(): void {
    if (this.doorPromptElement) {
      this.doorPromptElement.classList.add('hidden');
    }
  }

  public togglePeepholeMode(active: boolean): void {
    const bottom = document.querySelector('.hud-bottom-right');
    const crosshair = document.getElementById('crosshair');
    if (active) {
      if (bottom) bottom.classList.add('hidden');
      if (crosshair) crosshair.classList.add('hidden');
      this.hideInteractionPrompt();
      this.hideDoorPrompt();
    } else {
      if (bottom) bottom.classList.remove('hidden');
      if (crosshair) crosshair.classList.remove('hidden');
    }
  }
}
