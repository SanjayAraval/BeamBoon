// Onomatopoeia comic popups generator (e.g. BANG!, KNOCK KNOCK!, CREAK...)

export class ComicOverlays {
  public static popOnomatopoeia(text: string, xPercent = 50, yPercent = 50): void {
    const container = document.getElementById('onomatopoeia-container');
    if (!container) return;

    const popup = document.createElement('div');
    popup.className = 'onomatopoeia';
    popup.innerText = text;
    popup.style.left = `${xPercent}%`;
    popup.style.top = `${yPercent}%`;

    container.appendChild(popup);

    setTimeout(() => {
      if (container.contains(popup)) {
        container.removeChild(popup);
      }
    }, 900);
  }
}
