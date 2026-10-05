# CoverUp - Dark Comic-Noir 3D Horror Game

**CoverUp** is a first-person 3D psychological horror game created with Three.js, TypeScript, and Vite. Everything runs 100% client-side with procedurally generated low-poly geometry, canvas textures, and Web Audio synthesis.

---

## 📖 Premise

A paranoid young man watches a zombie movie alone at night. His parents return home drunk from a costume party. In his hyper-vigilant panic, he mistakes them for undead monsters. His father is a veteran police officer, so the service pistol rests in the closet...

After the shooting, the lights come on, and he realizes what he has done. The rest of the night is a desperate cover-up while his escalating paranoia keeps tricking his mind.

---

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Movement** | `WASD` |
| **Look Around** | `Mouse` (Click to lock cursor) |
| **Interact / Clean / Hide** | `E` |
| **Toggle Flashlight** | `F` |
| **Switch Weapon** | `1` (Knife) / `2` (Pistol) / `Scroll` |
| **Attack / Shoot** | `Left Click` |
| **Talk at Front Door** | `T` |
| **Pause Menu** | `ESC` |
| **Restart Game** | `R` |

---

## 🛠️ Setup & Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Local Dev Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

3. **Build Production Bundle**:
   ```bash
   npm run build
   ```

---

## 📦 Itch.io HTML5 Export Guide

The project is pre-configured in `vite.config.ts` with `base: './'` for seamless relative asset resolution when packaged for itch.io or static HTML5 hosting.

To package for itch.io:
1. Run `npm run build`.
2. Zip the contents of the `dist/` directory:
   - Ensure `index.html` is at the root of the zip archive.
3. Upload the zip file to your itch.io project page and select **"Play in browser"**.
