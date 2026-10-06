# Credits

## Built with AI assistance

CoverUp was built with AI assistance. The team used **Claude Code** (Anthropic) and **Gemini in
Antigravity** (Google) to write and review the code.

## Assets: all generated in code at runtime

The project contains no asset files. Every model, texture, sound and comic panel is generated
in code when the game runs:

- **3D models**: the house, furniture and characters are built from Three.js primitives
  (boxes, cylinders, cones, planes) in `src/world/`.
- **Textures**: wood grain, tiles, wallpaper, blood stains and the TV picture are drawn on
  HTML canvases at runtime (`src/world/Textures.ts`).
- **Sound**: wind, thunder, sirens, gunshots, footsteps, knocks, creaks, groans and the heartbeat are
  synthesised with the Web Audio API (`src/audio/ProceduralAudio.ts`).
- **Comic art**: the intro comic is drawn in code. Every scene and character is SVG
  generated at runtime (`src/ui/comicArt.ts`); captions, speech bubbles and sound-effect
  lettering are styled text, and `src/ui/ComicPlayer.ts` animates the panels and page turns.
- **Visual style**: the halftone comic look is a GLSL shader (`src/render/HalftoneShader.ts`).

No image, model, audio or video files were downloaded, bought or bundled.

**One exception: fonts.** The game loads its typefaces from Google Fonts when the page opens
(`index.html` for the game UI; the intro comic adds Comic Neue). If they can't load (for
example, offline), the browser falls back to system fonts.

| Font | Used for | Designer | Licence |
| :--- | :--- | :--- | :--- |
| Bangers | Titles, comic sound effects | Vernon Adams | SIL Open Font License 1.1 |
| Comic Neue | Comic speech bubbles | Craig Rozynski, Hrant Papazian | SIL Open Font License 1.1 |
| Special Elite | Comic captions, typewriter text | Astigmatic | Apache License 2.0 |
| Courier Prime | Body text | Alan Dague-Greene | SIL Open Font License 1.1 |

## Libraries

| Library | Used for | Licence |
| :--- | :--- | :--- |
| [Three.js](https://threejs.org/) (`three`) | 3D rendering | MIT |
| [Vite](https://vitejs.dev/) | Dev server and production build | MIT |
| [TypeScript](https://www.typescriptlang.org/) | Language and type checking | Apache License 2.0 |
| [tsx](https://github.com/privatenumber/tsx) | Running the test suite in Node | MIT |

`@types/three` and `@types/node` (type definitions, MIT) are also used during development.
