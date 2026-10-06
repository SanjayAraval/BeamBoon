import { Evidence } from './Evidence';
import { Character, createCharacter } from '../world/characters';

export interface VisitorInfo {
  type: 'neighbour' | 'officer' | 'partner';
  name: string;
  skepticism: number; // 0.5 to 0.9
  requiredTraces: number;
  dialogueSuccess: string;
  dialogueFail: string;
}

export type TalkOutcome = 'success' | 'fail' | 'forced_entry';

// After this many failed excuses the visitor stops listening and pushes inside.
const MAX_FAILED_TALKS = 2;
// After this many ignored knocks the visitor gives up (neighbour) or forces entry (police).
const MAX_UNREPLIED_KNOCKS = 3;
const TALK_COOLDOWN = 3.0;

export class VisitorManager {
  private activeVisitor: VisitorInfo | null = null;
  private currentFigure: Character | null = null;
  private isKnocking = false;
  private unrepliedKnocks = 0;
  private failedTalks = 0;
  private talkCooldown = 0;

  public spawnVisitor(info: VisitorInfo): void {
    this.activeVisitor = info;
    this.currentFigure = createCharacter(this.activeVisitor.type);
    this.currentFigure.root.position.set(7.4, 0, 12.6);
    this.currentFigure.root.rotation.y = Math.PI;
    this.currentFigure.setPose('knock');
    this.isKnocking = true;
    this.unrepliedKnocks = 0;
    this.failedTalks = 0;
    this.talkCooldown = 0;
  }

  // A knock nobody could have heard (the player is hiding) is not an ignored knock
  public triggerKnock(counted = true): void {
    if (counted) this.unrepliedKnocks++;
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

  public hasRunOutOfPatience(): boolean {
    return this.activeVisitor !== null && this.unrepliedKnocks > MAX_UNREPLIED_KNOCKS;
  }

  public updateFigure(delta: number): void {
    if (this.talkCooldown > 0) this.talkCooldown -= delta;
    if (this.currentFigure) {
      this.currentFigure.update(delta);
    }
  }

  // The player opens the door to talk (the dialogue follows). False while still cooling down
  // from the last talk.
  public beginTalk(): boolean {
    if (!this.activeVisitor || this.talkCooldown > 0) return false;
    this.talkCooldown = TALK_COOLDOWN;
    // Answering the door counts as a reply.
    this.unrepliedKnocks = 0;
    return true;
  }

  // The dialogue's verdict, with the same branches the old talk roll had: success sends the
  // visitor away; a fail can be retried, until the visitor stops listening and pushes inside.
  public resolveTalk(success: boolean): { outcome: TalkOutcome; message: string } {
    if (!this.activeVisitor) return { outcome: 'success', message: '' };
    if (success) {
      const msg = this.activeVisitor.dialogueSuccess;
      this.dismissVisitor();
      return { outcome: 'success', message: msg };
    }
    this.failedTalks++;
    const msg = this.activeVisitor.dialogueFail;
    if (this.failedTalks >= MAX_FAILED_TALKS) {
      return { outcome: 'forced_entry', message: msg };
    }
    return { outcome: 'fail', message: msg };
  }

  public dismissVisitor(): void {
    if (this.currentFigure) {
      this.currentFigure.root.removeFromParent();
      this.currentFigure.dispose();
    }
    this.activeVisitor = null;
    this.currentFigure = null;
    this.isKnocking = false;
  }
}
