/** What the story layer is allowed to know about the scene. */
export type StoryState = {
  /** The player has walked away from where they started. */
  moved: boolean
  /** The beam has crossed the figure at least once. */
  figureSpotted: boolean
  /** Seconds the figure has spent in the beam, in total. */
  secondsLit: number
}

export type Beat = {
  id: string
  line: string
  /** Beats fire in order; each waits for its own cue. */
  cue: (state: StoryState) => boolean
}

/**
 * Act 2's narration. The beats are ordered and fire at most once, so the act
 * reads the same way however long the player takes to sweep the room.
 */
export const ACT2_BEATS: Beat[] = [
  {
    id: 'blackout',
    line: 'The power went out an hour ago. Nobody has come.',
    cue: () => true,
  },
  {
    id: 'controls',
    line: 'WASD to move. The torch goes where you point it.',
    cue: (state) => state.moved,
  },
  {
    id: 'spotted',
    line: 'Something is standing over there. It has not moved.',
    cue: (state) => state.figureSpotted,
  },
  {
    id: 'revealed',
    line: 'In the light it is just a person. Just someone standing very still.',
    cue: (state) => state.secondsLit > 0.5,
  },
  {
    id: 'doubt',
    line: 'Keep the beam on them. They are only wrong when you look away.',
    cue: (state) => state.secondsLit > 4,
  },
]
