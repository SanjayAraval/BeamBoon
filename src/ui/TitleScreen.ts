// Title screen and settings modal controller

export class TitleScreen {
  private titleElement: HTMLElement | null;
  private settingsModal: HTMLElement | null;

  private onStartCallback: () => void;
  private onSettingsChangeCallback: (settings: { volume: number; sensitivity: number; quality: 'low' | 'medium' | 'high'; headbob: boolean; brightness: number }) => void;

  constructor(
    onStart: () => void,
    onSettingsChange: (settings: { volume: number; sensitivity: number; quality: 'low' | 'medium' | 'high'; headbob: boolean; brightness: number }) => void
  ) {
    this.titleElement = document.getElementById('title-screen');
    this.settingsModal = document.getElementById('settings-modal');
    this.onStartCallback = onStart;
    this.onSettingsChangeCallback = onSettingsChange;

    this.bindEvents();
  }

  private bindEvents(): void {
    const btnStart = document.getElementById('btn-start');
    const btnSettings = document.getElementById('btn-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');

    if (btnStart) {
      btnStart.onclick = () => {
        this.hide();
        this.onStartCallback();
      };
    }

    if (btnSettings) {
      btnSettings.onclick = () => {
        if (this.settingsModal) this.settingsModal.classList.remove('hidden');
      };
    }

    if (btnCloseSettings) {
      btnCloseSettings.onclick = () => {
        if (this.settingsModal) this.settingsModal.classList.add('hidden');
      };
    }

    // Input listeners for settings
    const sliderVol = document.getElementById('slider-volume') as HTMLInputElement;
    const sliderSens = document.getElementById('slider-sensitivity') as HTMLInputElement;
    const selectQual = document.getElementById('select-quality') as HTMLSelectElement;
    const chkHeadbob = document.getElementById('chk-headbob') as HTMLInputElement;

    const valVol = document.getElementById('val-volume');
    const valSens = document.getElementById('val-sensitivity');

    const sliderBright = document.getElementById('slider-brightness') as HTMLInputElement;
    const valBright = document.getElementById('val-brightness');

    const updateSettings = () => {
      const vol = parseInt(sliderVol.value) / 100;
      const sens = parseFloat(sliderSens.value);
      const qual = selectQual.value as 'low' | 'medium' | 'high';
      const headbob = chkHeadbob.checked;
      const bright = sliderBright ? parseFloat(sliderBright.value) : 1.0;

      if (valVol) valVol.innerText = `${sliderVol.value}%`;
      if (valSens) valSens.innerText = sliderSens.value;
      if (valBright) valBright.innerText = bright.toFixed(1);

      this.onSettingsChangeCallback({ volume: vol, sensitivity: sens, quality: qual, headbob, brightness: bright });
    };

    if (sliderVol) sliderVol.oninput = updateSettings;
    if (sliderSens) sliderSens.oninput = updateSettings;
    if (selectQual) selectQual.onchange = updateSettings;
    if (chkHeadbob) chkHeadbob.onchange = updateSettings;
    if (sliderBright) sliderBright.oninput = updateSettings;
  }

  public show(): void {
    if (this.titleElement) this.titleElement.classList.remove('hidden');
  }

  public hide(): void {
    if (this.titleElement) this.titleElement.classList.add('hidden');
  }
}
