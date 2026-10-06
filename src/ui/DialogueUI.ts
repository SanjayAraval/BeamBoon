// Dialogue box for visitors at the door (drives #dialogue-overlay): visitor name, their line,
// their reply to the last answer, three answer buttons and the DOUBT bar.

export class DialogueUI {
  private overlay: HTMLElement | null;
  private onChoose: (index: number) => void;

  constructor(onChoose: (index: number) => void) {
    this.overlay = document.getElementById('dialogue-overlay');
    this.onChoose = onChoose;
    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById(`dialogue-answer-${i + 1}`);
      if (btn) btn.onclick = () => this.onChoose(i);
    }
  }

  show(name: string): void {
    this.overlay?.classList.remove('hidden');
    this.setText('dialogue-name', name);
    this.setText('dialogue-reply', '');
  }

  hide(): void {
    this.overlay?.classList.add('hidden');
  }

  isOpen(): boolean {
    return !!this.overlay && !this.overlay.classList.contains('hidden');
  }

  setQuestion(line: string, answers: string[]): void {
    this.setText('dialogue-line', line);
    answers.forEach((text, i) => {
      const btn = document.getElementById(`dialogue-answer-${i + 1}`);
      if (!btn) return;
      btn.innerText = `${i + 1}. ${text}`;
      btn.classList.remove('hidden');
    });
  }

  // Last line of the talk: no more answers
  setFinal(line: string): void {
    this.setText('dialogue-line', line);
    for (let i = 1; i <= 3; i++) document.getElementById(`dialogue-answer-${i}`)?.classList.add('hidden');
  }

  setReply(text: string): void {
    this.setText('dialogue-reply', text);
  }

  setDoubt(doubt: number): void {
    const v = Math.round(doubt);
    const fill = document.getElementById('doubt-fill');
    if (fill) {
      fill.style.width = `${v}%`;
      fill.style.backgroundColor = v >= 50 ? '#d23a2a' : '#ffd400';
    }
    this.setText('doubt-val', `${v}`);
  }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }
}
