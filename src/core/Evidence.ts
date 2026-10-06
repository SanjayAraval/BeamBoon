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
  isCovered: boolean; // Draped with a bedsheet: still in place, but reads as "something under a sheet"
}

// How damning one piece of evidence looks to a visitor, 0..100
export const SEVERITY = {
  body: 100,
  coveredBodyFactor: 0.4, // a covered body counts 40% of an uncovered one
  bloodTrace: 60
};
// Above this, a visitor who gets no answer forces the door
export const FORCED_ENTRY_SEVERITY = 50;

export class Evidence {
  private totalNoise = 0;
  private visitorsStruck = 0;
  private bloodTraces: BloodTrace[] = [];
  private bodies: BodyEvidence[] = [];
  private curtainsClosed = false;
  private pistolHidden = false;
  private visitorSuspicion = 0; // a visitor walked past something under a sheet

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
    this.visitorSuspicion = 0;

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
      isHidden: false,
      isCovered: false
    });
  }

  public hideBody(id: string): void {
    const body = this.bodies.find(b => b.id === id);
    if (body) body.isHidden = true;
  }

  // Drape a sheet over a body. It stays where it is (not hidden).
  public coverBody(id: string): boolean {
    const body = this.bodies.find(b => b.id === id);
    if (!body || body.isHidden || body.isCovered) return false;
    body.isCovered = true;
    return true;
  }

  // 100 for a body in plain view, 40 under a sheet, 0 once hidden away
  public getBodySeverity(id: string): number {
    const body = this.bodies.find(b => b.id === id);
    if (!body || body.isHidden) return 0;
    return SEVERITY.body * (body.isCovered ? SEVERITY.coveredBodyFactor : 1);
  }

  // The worst thing a visitor could see. Both bodies and their blood lie in the front rooms
  // (living room and foyer), in view of the windows and the front door.
  public getVisibleSeverity(): number {
    let worst = 0;
    for (const b of this.bodies) worst = Math.max(worst, this.getBodySeverity(b.id));
    if (this.getUncleanedTracesCount() > 0) worst = Math.max(worst, SEVERITY.bloodTrace);
    return worst;
  }

  // Each body is covered or hidden
  public areBodiesDealtWith(): boolean {
    return this.bodies.every(b => b.isHidden || b.isCovered);
  }

  public addVisitorSuspicion(amount: number): void {
    this.visitorSuspicion += amount;
  }

  // A body dragged somewhere (not into a hiding place)
  public moveBody(id: string, pos: { x: number; y: number; z: number }): void {
    const body = this.bodies.find(b => b.id === id);
    if (body) body.position = { ...pos };
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
    // Exposed bodies add 0.4 each (a covered body 40% of that)
    for (const b of this.bodies) score += 0.4 * (this.getBodySeverity(b.id) / SEVERITY.body);
    // Something under a sheet that a visitor walked past
    score += this.visitorSuspicion;
    // Open curtains add 0.15
    if (!this.curtainsClosed) score += 0.15;
    // Unhidden pistol adds 0.2
    if (!this.pistolHidden) score += 0.2;
    // High noise level adds up to 0.3
    score += Math.min(0.3, this.totalNoise / 100);

    return Math.min(1.0, score);
  }
}
