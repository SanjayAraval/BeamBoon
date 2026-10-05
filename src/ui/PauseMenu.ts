// Pause menu controller

export class PauseMenu {
  private pauseElement: HTMLElement | null;
  private isPaused = false;
  private onResumeCallback: () => void;
  private onRestartCallback: () => void;

  constructor(onResume: () => void, onRestart: () => void) {
    this.pauseElement = document.getElementById('pause-menu');
    this.onResumeCallback = onResume;
    this.onRestartCallback = onRestart;

    this.bindEvents();
  }

  private bindEvents(): void {
    const btnResume = document.getElementById('btn-resume');
    const btnRestart = document.getElementById('btn-restart');
    const btnSettings = document.getElementById('btn-pause-settings');
    const settingsModal = document.getElementById('settings-modal');

    if (btnResume) {
      btnResume.onclick = () => {
        this.hide();
        this.onResumeCallback();
      };
    }

    if (btnRestart) {
      btnRestart.onclick = () => {
        this.hide();
        this.onRestartCallback();
      };
    }

    if (btnSettings && settingsModal) {
      btnSettings.onclick = () => {
        settingsModal.classList.remove('hidden');
      };
    }
  }

  public show(): void {
    this.isPaused = true;
    if (this.pauseElement) this.pauseElement.classList.remove('hidden');
  }

  public hide(): void {
    this.isPaused = false;
    if (this.pauseElement) this.pauseElement.classList.add('hidden');
  }

  public toggle(): boolean {
    if (this.isPaused) {
      this.hide();
      this.onResumeCallback();
    } else {
      this.show();
    }
    return this.isPaused;
  }
}
