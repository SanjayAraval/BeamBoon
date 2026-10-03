import Phaser from 'phaser'
import { DEPTH } from './config.ts'
import { FLOOR_BOUNDS } from './room.ts'

const SPEED = 190
const RADIUS = 12

/**
 * The player: a WASD-driven dot with a short nose showing which way the
 * flashlight is pointed. Movement is frame-rate independent and clamped to
 * the room's floor.
 */
export class Player {
  readonly body: Phaser.Geom.Circle
  /** Direction the flashlight is aimed, in radians. Set by the Flashlight. */
  aim = 0

  private readonly keys: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>
  private readonly gfx: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = new Phaser.Geom.Circle(x, y, RADIUS)

    const keyboard = scene.input.keyboard
    if (!keyboard) {
      throw new Error('CoverUp needs a keyboard to play')
    }
    this.keys = keyboard.addKeys(
      {
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      },
      true,
    ) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>

    this.gfx = scene.add.graphics()
    this.gfx.setDepth(DEPTH.actors)
  }

  get x(): number {
    return this.body.x
  }

  get y(): number {
    return this.body.y
  }

  update(deltaMs: number): void {
    const dx = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0)
    const dy = (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0)

    if (dx !== 0 || dy !== 0) {
      // Normalise so diagonals are not faster than the cardinals.
      const length = Math.hypot(dx, dy)
      const step = (SPEED * deltaMs) / 1000
      this.body.x += (dx / length) * step
      this.body.y += (dy / length) * step
      this.clampToFloor()
    }

    this.draw()
  }

  private clampToFloor(): void {
    const r = this.body.radius
    this.body.x = Phaser.Math.Clamp(this.body.x, FLOOR_BOUNDS.left + r, FLOOR_BOUNDS.right - r)
    this.body.y = Phaser.Math.Clamp(this.body.y, FLOOR_BOUNDS.top + r, FLOOR_BOUNDS.bottom - r)
  }

  private draw(): void {
    const { x, y, radius } = this.body
    this.gfx.clear()

    this.gfx.fillStyle(0x101218, 0.45)
    this.gfx.fillEllipse(x, y + radius * 0.7, radius * 2.1, radius * 0.9)

    this.gfx.fillStyle(0xe9e4f0, 1)
    this.gfx.fillCircle(x, y, radius)
    this.gfx.lineStyle(2, 0x6f6a7a, 1)
    this.gfx.strokeCircle(x, y, radius)

    // Nose marking the aim direction, so the beam never looks detached.
    this.gfx.fillStyle(0xffd98a, 1)
    this.gfx.fillCircle(
      x + Math.cos(this.aim) * radius,
      y + Math.sin(this.aim) * radius,
      radius * 0.35,
    )
  }
}
