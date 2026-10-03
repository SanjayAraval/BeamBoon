import Phaser from 'phaser'
import { COLORS, DEPTH, FLASHLIGHT } from './config.ts'
import { LightCone } from './LightCone.ts'
import type { Player } from './Player.ts'

/**
 * The player's flashlight: a cone that follows the mouse, plus the warm wash
 * it lays on the floor. The darkness overlay is what actually hides the rest
 * of the room; this only adds the colour of the beam.
 */
export class Flashlight {
  readonly cone = new LightCone(FLASHLIGHT.radius, FLASHLIGHT.halfAngle)

  private readonly gfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(DEPTH.beam)
  }

  update(player: Player, pointer: Phaser.Input.Pointer): void {
    this.cone.aim(player.x, player.y, pointer.worldX, pointer.worldY)
    player.aim = this.cone.direction
    this.draw()
  }

  private draw(): void {
    this.gfx.clear()

    // Two washes: a wide one for the whole beam and a tighter, brighter one
    // so the floor the player is about to walk onto reads warmest.
    this.gfx.fillStyle(COLORS.lightWash, 0.09)
    this.gfx.fillPoints(this.cone.toPolygon(), true)

    const core = FLASHLIGHT.falloff[FLASHLIGHT.falloff.length - 1]
    this.gfx.fillStyle(COLORS.lightWash, 0.14)
    this.gfx.fillPoints(
      this.cone.toPolygon(this.cone.radius * core.radius, this.cone.halfAngle * core.halfAngle),
      true,
    )
  }
}
