import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../core/config.ts'
import { Player } from '../core/Player.ts'
import { drawRoom } from '../core/room.ts'

/**
 * Act 2 takes place in a blacked-out building. The player only sees what the
 * flashlight is pointed at, which is also the only way to tell who is still
 * human.
 */
export class Act2Scene extends Phaser.Scene {
  private player!: Player

  constructor() {
    super('act2')
  }

  create(): void {
    drawRoom(this)
    this.player = new Player(this, GAME_WIDTH * 0.5, GAME_HEIGHT * 0.72)
  }

  update(_time: number, delta: number): void {
    this.player.update(delta)
  }
}
