import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../core/config.ts'
import { DarknessOverlay } from '../core/DarknessOverlay.ts'
import { Enemy } from '../core/Enemy.ts'
import { Flashlight } from '../core/Flashlight.ts'
import { Player } from '../core/Player.ts'
import { drawRoom } from '../core/room.ts'
import { ACT2_BEATS, Narrator } from '../story/index.ts'
import type { StoryState } from '../story/index.ts'

const SPAWN = new Phaser.Math.Vector2(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.78)

/**
 * Act 2 takes place in a blacked-out building. The player only sees what the
 * flashlight is pointed at, which is also the only way to tell who is still
 * human.
 */
export class Act2Scene extends Phaser.Scene {
  private player!: Player
  private flashlight!: Flashlight
  private darkness!: DarknessOverlay
  private enemy!: Enemy
  private narrator!: Narrator

  private readonly story: StoryState = {
    moved: false,
    figureSpotted: false,
    secondsLit: 0,
  }

  constructor() {
    super('act2')
  }

  create(): void {
    drawRoom(this)
    this.player = new Player(this, SPAWN.x, SPAWN.y)
    this.flashlight = new Flashlight(this)
    this.enemy = new Enemy(this, GAME_WIDTH * 0.3, GAME_HEIGHT * 0.28, Math.PI * 0.3)
    this.darkness = new DarknessOverlay(this)
    this.narrator = new Narrator(this, ACT2_BEATS)
  }

  update(_time: number, delta: number): void {
    this.player.update(delta)
    this.flashlight.update(this.player, this.input.activePointer)
    this.darkness.update(this.flashlight.cone)
    this.enemy.update(this.flashlight.cone)

    this.trackStory(delta)
    this.narrator.update(this.story)
  }

  private trackStory(delta: number): void {
    if (!this.story.moved && SPAWN.distance(this.player.body) > 48) {
      this.story.moved = true
    }
    if (this.enemy.isLit) {
      this.story.figureSpotted = true
      this.story.secondsLit += delta / 1000
    }
  }
}
