import Phaser from 'phaser'
import { DEPTH } from './config.ts'
import type { LightCone } from './LightCone.ts'

const BODY = 14
const HEAD = 7

/** How visible a figure is when the beam is nowhere near it. */
const UNLIT_ALPHA = 0.55

const HUMAN = {
  coat: 0x4c5a7c,
  outline: 0x1d2334,
  skin: 0xd8ab8b,
  /** Arms hang at the sides, a shoulder-width apart. */
  armSpread: (62 * Math.PI) / 180,
  armLength: 21,
} as const

const ZOMBIE = {
  coat: 0x44583a,
  outline: 0x131a10,
  skin: 0x93b077,
  /** Arms are out in front, almost together. */
  armSpread: (14 * Math.PI) / 180,
  armLength: 27,
} as const

/**
 * Someone standing in the dark.
 *
 * In the dark you only catch the shape of them, and the shape is wrong: hunched,
 * sickly, arms out. Put the flashlight on them and they are an ordinary person
 * standing still. Which one is true is the whole question of the act.
 */
export class Enemy {
  readonly position: Phaser.Math.Vector2
  /** Direction the figure faces, in radians. */
  facing: number

  private readonly gfx: Phaser.GameObjects.Graphics
  private lit: boolean | null = null

  constructor(scene: Phaser.Scene, x: number, y: number, facing = Math.PI / 2) {
    this.position = new Phaser.Math.Vector2(x, y)
    this.facing = facing
    this.gfx = scene.add.graphics()
    this.gfx.setDepth(DEPTH.actors)
  }

  get isLit(): boolean {
    return this.lit === true
  }

  update(cone: LightCone): void {
    const lit = cone.contains(this.position.x, this.position.y)
    if (lit !== this.lit) {
      this.lit = lit
      this.draw()
    }
    // The figure sits above the darkness, so fading it is what sinks it back
    // into the gloom as the beam slides off.
    const intensity = cone.intensityAt(this.position.x, this.position.y)
    this.gfx.setAlpha(UNLIT_ALPHA + (1 - UNLIT_ALPHA) * intensity)
  }

  private draw(): void {
    const look = this.lit ? HUMAN : ZOMBIE
    const { x, y } = this.position
    this.gfx.clear()

    this.gfx.fillStyle(0x000000, 0.4)
    this.gfx.fillEllipse(x, y + BODY * 0.6, BODY * 2.3, BODY)

    // Arms first, so the shoulders read as sitting on top of them.
    this.gfx.lineStyle(6, look.coat, 1)
    for (const side of [-1, 1]) {
      const angle = this.facing + side * look.armSpread
      const shoulder = this.offset(this.facing + side * (Math.PI / 2), BODY * 0.6)
      this.gfx.lineBetween(
        shoulder.x,
        shoulder.y,
        x + Math.cos(angle) * look.armLength,
        y + Math.sin(angle) * look.armLength,
      )
    }

    this.gfx.fillStyle(look.coat, 1)
    this.gfx.fillCircle(x, y, BODY)
    this.gfx.lineStyle(2, look.outline, 1)
    this.gfx.strokeCircle(x, y, BODY)

    this.gfx.fillStyle(look.skin, 1)
    this.gfx.fillCircle(x, y, HEAD)
  }

  private offset(angle: number, distance: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.position.x + Math.cos(angle) * distance,
      this.position.y + Math.sin(angle) * distance,
    )
  }
}
