import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../core/config.ts'
import { DarknessOverlay } from '../core/DarknessOverlay.ts'
import { Enemy } from '../core/Enemy.ts'
import { Flashlight } from '../core/Flashlight.ts'
import { Player } from '../core/Player.ts'
import { drawRoom } from '../core/room.ts'

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

  constructor() {
    super('act2')
  }

  create(): void {
    drawRoom(this)
    this.player = new Player(this, GAME_WIDTH * 0.5, GAME_HEIGHT * 0.72)
    this.flashlight = new Flashlight(this)
    this.enemy = new Enemy(this, GAME_WIDTH * 0.3, GAME_HEIGHT * 0.3, Math.PI * 0.25)
    this.darkness = new DarknessOverlay(this)
  }

  update(_time: number, delta: number): void {
    this.player.update(delta)
    this.flashlight.update(this.player, this.input.activePointer)
    this.darkness.update(this.flashlight.cone)
    this.enemy.update(this.flashlight.cone)
  }
}
