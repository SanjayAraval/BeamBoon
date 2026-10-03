# BeamBoon

CoverUp — a top-down game built with Phaser 4, TypeScript and Vite.

The room is dark. You carry a flashlight, and the only way to tell what is
standing in front of you is to point it there.

```
npm install
npm run dev
```

WASD moves. The beam follows the mouse.

## Layout

- `src/core` — the pieces the game is built from, none of which know about a
  particular act: the player, the flashlight and its `LightCone`, the
  darkness overlay, the enemies and the room.
- `src/act2` — the scene that arranges those pieces into the blacked-out
  building and tracks what the player has seen.
- `src/story` — act 2's script: ordered narration beats and the narrator that
  plays them. It reads a small state struct and never touches the simulation.

`LightCone` is the only description of the lit area. The darkness overlay
draws its complement and the enemies test themselves against it, so what the
beam shows and what the game treats as lit cannot drift apart.
