// Every objective line and hint shown on screen, in one place (the tests read them from here).
//
// Layout notes for the hints: the stairs climb from the front hall toward the back of the house
// and arrive at the upstairs landing facing the back. The player's bedroom door is then ahead
// on the left (the first door on that side); the master bedroom door is behind, toward the
// front of the house, on the right once you turn around. Dad's gun is in the master bedroom's
// walk-in closet.

export const OBJECTIVES = {
  // Act 1
  movie: 'Home alone. Storm outside. Stay calm.',
  findFlashlight: 'Find the flashlight: check the desk drawer in your bedroom, upstairs.',
  flashlightGlowHint: 'Follow the glow: stairs, then the first door on your left.',
  flashlightHint: 'Your bedroom is upstairs: at the top of the stairs keep straight, first door on your left.',
  waitListen: 'Wait. Listen.',
  doorUnlocks: 'Someone is at the front door',
  getGun: "Get Dad's gun: master bedroom closet, upstairs.",
  gunHint: 'Master bedroom: at the top of the stairs turn back toward the front of the house, door on your right. The gun is in its closet.',
  goDownstairs: 'Go downstairs.',
  gunCaption: 'Dad keeps his gun in the master bedroom.', // door comic caption

  // Act 2
  hideBodies: 'Hide the bodies: look at a body, press E to drag it, then take it to a hiding spot: behind the living room sofa, or upstairs in the master bedroom walk-in closet or under a bed.',
  oneMoreBody: 'One more body to hide.',
  dragTutorial: 'Drag it to a hiding spot (glowing). Press E to hide it. Dragging makes noise.',
  bodiesInTheOpen: 'The bodies are still in the open. Look at one and press E.',
  cleanUp: 'Clean up evidence and wait for visitors.',
  allClear: 'Everything looks normal. Wait for visitors.'
} as const;
