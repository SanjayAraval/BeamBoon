/** Shared tuning values for the game. Everything visual reads from here. */

export const GAME_WIDTH = 960
export const GAME_HEIGHT = 640

export const COLORS = {
  /** Base floor of the room, visible where the flashlight reaches. */
  floor: 0x2f3038,
  floorGrid: 0x3a3b45,
  wall: 0x1a1b22,
  /** The unlit world. Drawn on top of everything the player cannot see. */
  darkness: 0x04050a,
  /** Warm tint laid over the floor inside the cone. */
  lightWash: 0xffe9b0,
  hudText: '#cfcad4',
} as const

/** Draw order. Higher numbers sit closer to the camera. */
export const DEPTH = {
  floor: 0,
  actors: 10,
  darkness: 20,
  hud: 30,
} as const
