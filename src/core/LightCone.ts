import Phaser from 'phaser'

/**
 * A circular sector: the patch of world the flashlight is currently lighting.
 *
 * This is the single source of truth for "is that thing lit?" — the darkness
 * overlay draws its complement and the enemies test themselves against it, so
 * what you see and what the game thinks you see cannot drift apart.
 */
export class LightCone {
  x = 0
  y = 0
  /** Direction the cone points, in radians. */
  direction = 0

  radius: number
  halfAngle: number

  constructor(radius: number, halfAngle: number) {
    this.radius = radius
    this.halfAngle = halfAngle
  }

  /** Moves the apex to (x, y) and points the cone at (targetX, targetY). */
  aim(x: number, y: number, targetX: number, targetY: number): void {
    this.x = x
    this.y = y
    const dx = targetX - x
    const dy = targetY - y
    if (dx !== 0 || dy !== 0) {
      this.direction = Math.atan2(dy, dx)
    }
  }

  contains(x: number, y: number): boolean {
    return this.containsWithin(x, y, this.radius, this.halfAngle)
  }

  /** Same test as `contains`, but against a tighter cone than the full one. */
  containsWithin(x: number, y: number, radius: number, halfAngle: number): boolean {
    const dx = x - this.x
    const dy = y - this.y
    const distanceSq = dx * dx + dy * dy
    if (distanceSq > radius * radius) {
      return false
    }
    if (distanceSq === 0) {
      return true
    }
    const offset = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - this.direction)
    return Math.abs(offset) <= halfAngle
  }

  /**
   * The cone as a polygon, apex first, for filling with a Graphics object.
   */
  toPolygon(radius = this.radius, halfAngle = this.halfAngle, steps = 20): Phaser.Math.Vector2[] {
    const points = [new Phaser.Math.Vector2(this.x, this.y)]
    for (let i = 0; i <= steps; i++) {
      const angle = this.direction - halfAngle + (2 * halfAngle * i) / steps
      points.push(this.pointAt(angle, radius))
    }
    return points
  }

  pointAt(angle: number, radius: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.x + Math.cos(angle) * radius,
      this.y + Math.sin(angle) * radius,
    )
  }
}
