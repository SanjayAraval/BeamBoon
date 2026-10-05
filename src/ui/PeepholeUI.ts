// Door peephole overlay UI manager

export class PeepholeUI {
  private overlayElement: HTMLElement | null;
  private isActive = false;

  constructor() {
    this.overlayElement = document.getElementById('peephole-overlay');
  }

  public show(): void {
    this.isActive = true;
    if (this.overlayElement) this.overlayElement.classList.remove('hidden');
  }

  public hide(): void {
    this.isActive = false;
    if (this.overlayElement) this.overlayElement.classList.add('hidden');
  }

  public toggle(): boolean {
    if (this.isActive) {
      this.hide();
    } else {
      this.show();
    }
    return this.isActive;
  }

  public isOpen(): boolean {
    return this.isActive;
  }
}
