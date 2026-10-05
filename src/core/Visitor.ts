import { Evidence } from './Evidence';
import { Character, createCharacter } from '../world/characters';

export interface VisitorInfo {
  type: 'neighbor' | 'officer' | 'partner' | 'inspector';
  name: string;
  skepticism: number; // 0.5 to 0.9
  requiredTraces: number;
  dialogueSuccess: string;
  dialogueFail: string;
}

export class VisitorManager {
  private activeVisitor: VisitorInfo | null = null;
  private currentFigure: Character | null = null;
  private isKnocking = false;
  private unrepliedKnocks = 0;

  public spawnVisitor(info: VisitorInfo): void {
    this.activeVisitor = info;
    this.currentFigure = createCharacter(this.activeVisitor.type as any);
    this.currentFigure.root.position.set(7.4, 0, 12.6);
    this.currentFigure.root.rotation.y = Math.PI;
    this.currentFigure.setPose('knock');
    this.isKnocking = true;
    this.unrepliedKnocks = 0;
  }

  public triggerKnock(): void {
    this.unrepliedKnocks++;
    if (this.currentFigure) this.currentFigure.setPose('knock');
  }

  public getActiveVisitor(): VisitorInfo | null {
    return this.activeVisitor;
  }

  public getCurrentFigure(): Character | null {
    return this.currentFigure;
  }

  public isVisitorAtDoor(): boolean {
    return this.activeVisitor !== null && this.isKnocking;
  }

  public getUnrepliedKnocks(): number {
    return this.unrepliedKnocks;
  }

  public updateFigure(delta: number): void {
    if (this.currentFigure) {
      this.currentFigure.update(delta);
    }
  }

  public attemptTalk(paranoia: number, evidence: Evidence): { success: boolean; message: string } {
    if (!this.activeVisitor) return { success: true, message: 'No visitor at door.' };

    const suspicion = evidence.calculateSuspicion();
    const severity = evidence.getUncleanedTracesCount() / 4;

    if (paranoia < 70) {
      if (suspicion < 0.8) {
        const msg = this.activeVisitor.dialogueSuccess;
        this.dismissVisitor();
        return { success: true, message: msg };
      }
    }

    const failChance = Math.min(
      0.90,
      this.activeVisitor.skepticism * (0.3 + 0.45 * severity + 0.5 * suspicion)
    );

    const roll = Math.random();
    if (roll > failChance) {
      const msg = this.activeVisitor.dialogueSuccess;
      this.dismissVisitor();
      return { success: true, message: msg };
    } else {
      const msg = this.activeVisitor.dialogueFail;
      return { success: false, message: msg };
    }
  }

  public dismissVisitor(): void {
    if (this.currentFigure) {
      this.currentFigure.dispose();
    }
    this.activeVisitor = null;
    this.currentFigure = null;
    this.isKnocking = false;
  }
}
