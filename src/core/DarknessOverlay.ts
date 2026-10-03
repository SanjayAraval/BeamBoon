import Phaser from 'phaser'
import { COLORS, DEPTH, FLASHLIGHT, GAME_HEIGHT, GAME_WIDTH } from './config.ts'
import type { LightCone } from './LightCone.ts'

/**
 * Far enough that a ray from anywhere on screen leaves the canvas, so the
 * darkness polygons always run off the edge instead of stopping short.
 */
const FAR = Math.hypot(GAME_WIDTH, GAME_HEIGHT) * 1.2

/** Resolution of the two arcs bounding each darkness polygon. */
const SWEEP_STEPS = 48
const ARC_STEPS = 16

/**
 * Covers the world in darkness everywhere the light cone does not reach.
 *
 * Rather than masking a hole in a black rectangle — which Phaser 4 only
 * supports on the Canvas renderer — the unlit area is drawn directly, as two
 * simple polygons per layer: the wedge of angles outside the cone, and the
 * band beyond the cone's reach inside those angles.
 */
export class DarknessOverlay {
  private readonly gfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(DEPTH.darkness)
  }

  update(cone: LightCone): void {
    this.gfx.clear()

    this.gfx.fillStyle(COLORS.darkness, 1)
    this.fillOutside(cone, cone.radius, cone.halfAngle)

    for (const tier of FLASHLIGHT.falloff) {
      this.gfx.fillStyle(COLORS.darkness, tier.alpha)
      this.fillOutside(cone, cone.radius * tier.radius, cone.halfAngle * tier.halfAngle)
    }
  }

  /** Fills everything except the sector (radius, halfAngle) of `cone`. */
  private fillOutside(cone: LightCone, radius: number, halfAngle: number): void {
    const behind = [new Phaser.Math.Vector2(cone.x, cone.y)]
    const sweep = Math.PI * 2 - halfAngle * 2
    for (let i = 0; i <= SWEEP_STEPS; i++) {
      behind.push(cone.pointAt(cone.direction + halfAngle + (sweep * i) / SWEEP_STEPS, FAR))
    }
    this.gfx.fillPoints(behind, true)

    const beyond: Phaser.Math.Vector2[] = []
    for (let i = 0; i <= ARC_STEPS; i++) {
      beyond.push(cone.pointAt(cone.direction - halfAngle + (2 * halfAngle * i) / ARC_STEPS, radius))
    }
    for (let i = ARC_STEPS; i >= 0; i--) {
      beyond.push(cone.pointAt(cone.direction - halfAngle + (2 * halfAngle * i) / ARC_STEPS, FAR))
    }
    this.gfx.fillPoints(beyond, true)
  }
}
