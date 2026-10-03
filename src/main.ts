import './style.css'
import Phaser from 'phaser'
import { Act2Scene } from './act2/index.ts'
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './core/config.ts'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.darkness,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Act2Scene],
})

if (import.meta.env.DEV) {
  // Lets us poke at scenes from the browser console while building act 2.
  Object.assign(globalThis, { game })
}
