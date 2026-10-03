import Phaser from 'phaser'
import { drawRoom } from '../core/room.ts'

/**
 * Act 2 takes place in a blacked-out building. The player only sees what the
 * flashlight is pointed at, which is also the only way to tell who is still
 * human.
 */
export class Act2Scene extends Phaser.Scene {
  constructor() {
    super('act2')
  }

  create(): void {
    drawRoom(this)
  }
}
