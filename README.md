# CoverUp

Play: <itch link>

A paranoid teenager is home alone on a stormy night, watching a zombie movie, when the power
cuts out. His parents come home drunk from a costume party, and in the dark, with his nerves
shot, he sees two zombies walking through the front door. His father is a police officer, and
the service pistol is upstairs. When the lights come back on he understands what he has done.
The rest of the night is a desperate cover-up: hide the bodies, scrub the blood, put the gun
away and get rid of the neighbour, the patrol officer and his father's partner when they
knock, while his paranoia keeps turning shadows and visitors into monsters. Four endings:
clean, caught, run, or breakdown.

CoverUp is a first-person 3D horror game in a comic-noir style. It runs in the browser
(Three.js, TypeScript, Vite), and every model, texture, sound and comic panel is generated in
code. See [CREDITS.md](CREDITS.md).

## Controls

| Key / input | Action |
| :--- | :--- |
| `W` `A` `S` `D` | Move |
| Mouse | Look around (click the game to lock the cursor) |
| `E` | Interact: pick up, hide a body, clean blood, toggle lights, open doors, look through the peephole |
| `E` twice on the rear door | Flee (run ending), during the cover-up |
| `T` | Talk to the visitor (stand at the front door): opens the dialogue |
| `1` / `2` / `3` or click | Dialogue: pick an answer (keep the DOUBT bar low) |
| Left click | Attack / shoot |
| `1` / `2` | Knife / pistol |
| Mouse wheel | Cycle weapons |
| `F` | Flashlight on/off |
| `E`, `Q` or right click | Leave the peephole |
| `Esc` | Pause menu (Resume, Settings, Restart), also during the opening comic |
| `R` twice | Restart |
| Click / `Space` / `Enter` | Opening comic: next panel |
| Hold `Enter` (or `Space`) | Skip the opening comic |
| Hold `Space` | Skip the sofa intro |

Debug keys (only with `?debug=1` in the URL): `N` next phase, `F3` debug overlay,
`F4` collision boxes, `F5` teleport to the next room, `F6` log position, `F7` prop labels,
`F8` light gizmos, `F9` toggle all lights.

## How to run

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## How to build

```bash
npm run build
```

This type-checks and writes a static build to `dist/`. `vite.config.ts` sets `base: './'`, so
the build works from any folder or from itch.io: zip the contents of `dist/` (with
`index.html` at the top level of the zip) and upload it as an HTML5 game. Preview the build
locally with `npm run preview`.

Tests: `npm test` runs the type check, the unit tests and an end-to-end playthrough to each of
the four endings (`npm run test:e2e`).

## Team

**Packet Loss**

- <name 1>
- <name 2>
- <name 3>
- <name 4>
- <name 5>
