import Phaser from 'phaser'
import { COLORS, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../core/config.ts'
import type { Beat, StoryState } from './beats.ts'

/**
 * Shows one line of the act at a time, at the bottom of the screen. The
 * narrator never drives the game; it only watches the state the scene hands
 * it and fades in the next beat once that beat's cue has fired.
 */
export class Narrator {
  private readonly beats: Beat[]
  private readonly caption: Phaser.GameObjects.Text
  private played = -1

  constructor(scene: Phaser.Scene, beats: Beat[]) {
    this.beats = beats
    this.caption = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 48, '', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '19px',
      color: COLORS.hudText,
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 160 },
    })
    this.caption.setOrigin(0.5, 0.5)
    this.caption.setDepth(DEPTH.hud)
    this.caption.setAlpha(0)
  }

  update(state: StoryState): void {
    const next = this.played + 1
    if (next < this.beats.length && this.beats[next].cue(state)) {
      this.played = next
      this.show(this.beats[next].line)
    }
  }

  private show(line: string): void {
    this.caption.setText(line)
    this.caption.setAlpha(0)
    this.caption.scene.tweens.add({
      targets: this.caption,
      alpha: 1,
      duration: 700,
      ease: 'Quad.easeOut',
    })
  }
}
