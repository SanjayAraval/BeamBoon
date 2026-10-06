// Pause menu controller (drives #pause-overlay)

export class PauseMenu {
  private pauseElement: HTMLElement | null;
  private visible = false;
  private onResumeCallback: () => void;
  private onRestartCallback: () => void;

  constructor(onResume: () => void, onRestart: () => void) {
    this.pauseElement = document.getElementById('pause-overlay');
    this.onResumeCallback = onResume;
    this.onRestartCallback = onRestart;

    this.bindEvents();
  }

  private bindEvents(): void {
    const btnResume = document.getElementById('btn-resume');
    const btnRestart = document.getElementById('btn-restart');
    const btnSettings = document.getElementById('btn-pause-settings');
    const settingsModal = document.getElementById('settings-modal');

    // Resume must run inside the click handler: requestPointerLock needs a user gesture
    if (btnResume) {
      btnResume.onclick = () => this.onResumeCallback();
    }
    // A click on the dark backdrop (outside the menu box) also continues
    if (this.pauseElement) {
      this.pauseElement.addEventListener('click', (e) => {
        if (this.visible && e.target === this.pauseElement) this.onResumeCallback();
      });
    }

    if (btnRestart) {
      btnRestart.onclick = () => this.onRestartCallback();
    }

    if (btnSettings && settingsModal) {
      btnSettings.onclick = () => {
        settingsModal.classList.remove('hidden');
      };
    }
  }

  public show(): void {
    this.visible = true;
    if (this.pauseElement) this.pauseElement.classList.remove('hidden');
  }

  public hide(): void {
    this.visible = false;
    if (this.pauseElement) this.pauseElement.classList.add('hidden');
  }

  public isVisible(): boolean {
    return this.visible;
  }
}
