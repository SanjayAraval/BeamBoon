/** Shared tuning values for the game. Everything visual reads from here. */

export const GAME_WIDTH = 960
export const GAME_HEIGHT = 640

export const COLORS = {
  /** Base floor of the room, visible where the flashlight reaches. */
  floor: 0x2f3038,
  floorGrid: 0x3f4150,
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
  /** The warm wash the beam lays on the floor, under the darkness. */
  beam: 5,
  darkness: 10,
  /** Actors sit above the darkness: a shape in the dark is still a shape. */
  actors: 20,
  hud: 30,
} as const

const degrees = (value: number): number => (value * Math.PI) / 180

/** One ring of the beam's soft edge. See `FLASHLIGHT.falloff`. */
export type FalloffLayer = {
  /** Fraction of the full radius this layer's cone reaches. */
  radius: number
  /** Fraction of the full opening angle. */
  halfAngle: number
  alpha: number
}

const FALLOFF_LAYERS = 8
const LAYER_ALPHA = 0.32

/**
 * Fraction of the beam that is at full brightness. Outside it the light
 * ramps down to nothing at the rim.
 */
const BEAM_CORE = 0.62

/**
 * Darkness is painted once at full strength outside the cone, then again for
 * each of these progressively tighter cones. Stacking the alphas is what
 * turns a hard-edged wedge into a beam that fades towards its rim and tip.
 */
const falloff: FalloffLayer[] = Array.from({ length: FALLOFF_LAYERS }, (_unused, index) => {
  const t = (index + 1) / FALLOFF_LAYERS
  return {
    radius: 1 - (1 - BEAM_CORE) * t,
    halfAngle: 1 - (1 - BEAM_CORE) * t,
    alpha: LAYER_ALPHA,
  }
})

export const FLASHLIGHT = {
  /** How far the beam reaches, in pixels. */
  radius: 320,
  /** Half the opening angle of the cone. */
  halfAngle: degrees(26),
  core: BEAM_CORE,
  falloff,
}
