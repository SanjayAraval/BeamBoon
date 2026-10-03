import Phaser from 'phaser'
import { COLORS, DEPTH, GAME_HEIGHT, GAME_WIDTH } from './config.ts'

/** Thickness of the border wall the player cannot walk into. */
export const WALL = 24

/** The rectangle the player and enemies are allowed to move inside. */
export const FLOOR_BOUNDS = new Phaser.Geom.Rectangle(
  WALL,
  WALL,
  GAME_WIDTH - WALL * 2,
  GAME_HEIGHT - WALL * 2,
)

/**
 * Paints the static room: a walled floor with a faint grid so that movement
 * reads clearly once the flashlight sweeps across it.
 */
export function drawRoom(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  g.setDepth(DEPTH.floor)

  g.fillStyle(COLORS.wall, 1)
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  g.fillStyle(COLORS.floor, 1)
  g.fillRect(FLOOR_BOUNDS.x, FLOOR_BOUNDS.y, FLOOR_BOUNDS.width, FLOOR_BOUNDS.height)

  const step = 64
  g.lineStyle(1, COLORS.floorGrid, 1)
  for (let x = FLOOR_BOUNDS.left + step; x < FLOOR_BOUNDS.right; x += step) {
    g.lineBetween(x, FLOOR_BOUNDS.top, x, FLOOR_BOUNDS.bottom)
  }
  for (let y = FLOOR_BOUNDS.top + step; y < FLOOR_BOUNDS.bottom; y += step) {
    g.lineBetween(FLOOR_BOUNDS.left, y, FLOOR_BOUNDS.right, y)
  }

  return g
}
