// Evidence and Suspicion Tracker for Act 2 Cover-Up mechanics
import { npcLayout } from '../world/npcLayout';

export interface BloodTrace {
  id: string;
  position: { x: number; y: number; z: number };
  cleaned: boolean;
}

export interface BodyEvidence {
  id: string;
  name: string;
  kind: 'mother' | 'father';
  position: { x: number; y: number; z: number };
  isHidden: boolean; // True if hidden inside closet or under bed
}

export class Evidence {
  private totalNoise = 0;
  private visitorsStruck = 0;
  private bloodTraces: BloodTrace[] = [];
  private bodies: BodyEvidence[] = [];
  private curtainsClosed = false;
  private pistolHidden = false;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.totalNoise = 0;
    this.visitorsStruck = 0;
    this.bloodTraces = [];
    this.bodies = [];
    this.curtainsClosed = false;
    this.pistolHidden = false;

    // Initial evidence from Act 1: placed where the parents fall (npcLayout.deadPoses)
    const { mother, father } = npcLayout.deadPoses;
    this.addBody('Father', 'father', { x: father.x, y: 0.2, z: father.z });
    this.addBody('Mother', 'mother', { x: mother.x, y: 0.2, z: mother.z });

    this.addBloodTrace({ x: father.bloodX, y: 0.02, z: father.bloodZ });
    this.addBloodTrace({ x: mother.bloodX, y: 0.02, z: mother.bloodZ });
  }

  public addNoise(amount: number): void {
    this.totalNoise += amount;
  }

  public getTotalNoise(): number {
    return this.totalNoise;
  }

  public recordVisitorStruck(): void {
    this.visitorsStruck++;
    // Striking any visitor adds +8 noise
    this.addNoise(8);
  }

  public getVisitorsStruck(): number {
    return this.visitorsStruck;
  }

  public addBloodTrace(pos: { x: number; y: number; z: number }): void {
    this.bloodTraces.push({
      id: `trace_${this.bloodTraces.length}`,
      position: pos,
      cleaned: false
    });
  }

  public cleanBloodTrace(id: string): void {
    const trace = this.bloodTraces.find(t => t.id === id);
    if (trace) trace.cleaned = true;
  }

  public getUncleanedTracesCount(): number {
    return this.bloodTraces.filter(t => !t.cleaned).length;
  }

  public getBloodTraces(): BloodTrace[] {
    return this.bloodTraces;
  }

  public addBody(name: string, kind: 'mother' | 'father', pos: { x: number; y: number; z: number }): void {
    this.bodies.push({
      id: `body_${kind}`,
      name,
      kind,
      position: pos,
      isHidden: false
    });
  }

  public hideBody(id: string): void {
    const body = this.bodies.find(b => b.id === id);
    if (body) body.isHidden = true;
  }

  public getExposedBodiesCount(): number {
    return this.bodies.filter(b => !b.isHidden).length;
  }

  public getBodies(): BodyEvidence[] {
    return this.bodies;
  }

  public setCurtainsClosed(closed: boolean): void {
    this.curtainsClosed = closed;
  }

  public isCurtainsClosed(): boolean {
    return this.curtainsClosed;
  }

  public setPistolHidden(hidden: boolean): void {
    this.pistolHidden = hidden;
  }

  public isPistolHidden(): boolean {
    return this.pistolHidden;
  }

  // Calculate current suspicion index (0.0 to 1.0)
  public calculateSuspicion(): number {
    let score = 0;
    // Uncleaned blood traces add 0.25 each
    score += this.getUncleanedTracesCount() * 0.25;
    // Exposed bodies add 0.4 each
    score += this.getExposedBodiesCount() * 0.4;
    // Open curtains add 0.15
    if (!this.curtainsClosed) score += 0.15;
    // Unhidden pistol adds 0.2
    if (!this.pistolHidden) score += 0.2;
    // High noise level adds up to 0.3
    score += Math.min(0.3, this.totalNoise / 100);

    return Math.min(1.0, score);
  }
}
