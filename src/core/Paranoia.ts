export class Paranoia {
  private value = 0; // 0 to 100
  private isLit = false;
  private isVisitorNear = false;
  private isBeamOnVisitor = false;

  public getValue(): number {
    return this.value;
  }

  public setValue(val: number): void {
    this.value = Math.max(0, Math.min(100, val));
  }

  public add(amount: number): void {
    this.setValue(this.value + amount);
  }

  public setLitState(isLit: boolean): void {
    this.isLit = isLit;
  }

  public setVisitorNear(isNear: boolean): void {
    this.isVisitorNear = isNear;
  }

  public setBeamOnVisitor(isBeam: boolean): void {
    this.isBeamOnVisitor = isBeam;
  }

  public update(delta: number): void {
    let rate = 0;

    if (this.isLit) {
      // Drains 22 per second when standing in bright light
      rate -= 22;
    } else {
      // Rises 6 per second in the dark
      rate += 6;
    }

    if (this.isVisitorNear) {
      // Additional +16 per second when visitor is at door / close
      let visitorRate = 16;
      if (this.isBeamOnVisitor) {
        // Pointing beam at visitor HALVES dread increment
        visitorRate *= 0.5;
      }
      rate += visitorRate;
    }

    this.value = Math.max(0, Math.min(100, this.value + rate * delta));
  }

  public isHighParanoia(): boolean {
    return this.value >= 70;
  }
}
