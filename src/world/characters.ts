// characters.ts (v2, comic style): procedural cartoon humanoids for CoverUp (Three.js, no assets)
// Same API as v1, so it is a drop-in replacement.
//   const mom = createCharacter('mother'); scene.add(mom.root); mom.root.position.set(x, floorY, z);
//   each frame: mom.update(dt);  mom.setZombie(bool);  mom.setDead(bool);  mom.setPose('idle'|'walk'|'knock');
import * as THREE from 'three';

export type CharacterKind = 'mother' | 'father' | 'neighbour' | 'officer' | 'partner';
export type Pose = 'idle' | 'walk' | 'knock';

export interface Character {
  root: THREE.Group;
  kind: CharacterKind;
  height: number;
  setZombie(on: boolean): void;
  setDead(on: boolean): void;
  setPose(p: Pose): void;
  update(dt: number): void;
  dispose(): void;
}

interface Look {
  skin: number; shirt: number; pants: number; shoes: number; hair: number | null;
  hair_style: 'none' | 'poof' | 'short' | 'comb';
  scale: number; width: number; belly: number; head: number; chin: number;
  dress?: boolean; cap?: boolean; glasses?: boolean; mustache?: number; badge?: boolean; belt?: boolean;
  cardigan?: number; vest?: number; drunk?: boolean; tie?: number; thin?: boolean;
}

const LOOKS: Record<CharacterKind, Look> = {
  mother:    { skin: 0xf0c4a0, shirt: 0xe0577f, pants: 0x6a3a55, shoes: 0x2b1b24, hair: 0x4a2a1a, hair_style: 'poof', scale: 1.0,  width: 0.95, belly: 1.0, head: 1.0,  chin: 0.9, dress: true, drunk: true },
  father:    { skin: 0xe2ac84, shirt: 0xe9e6dc, pants: 0x3d4f6b, shoes: 0x1c1612, hair: 0x2a2623, hair_style: 'short', scale: 1.08, width: 1.15, belly: 1.55, head: 1.0, chin: 1.2, mustache: 1.0, drunk: true, tie: 0x9a2a2a },
  neighbour: { skin: 0xf0cfb0, shirt: 0xd7c98f, pants: 0x756b5c, shoes: 0x4a3a2a, hair: 0xc4c4c4, hair_style: 'comb', scale: 1.12, width: 0.8, belly: 0.8, head: 1.05, chin: 0.8, glasses: true, cardigan: 0x8a5a3a, thin: true },
  officer:   { skin: 0xe2ac84, shirt: 0x24396a, pants: 0x161f36, shoes: 0x0c0c0e, hair: 0x2a2018, hair_style: 'short', scale: 1.08, width: 1.1, belly: 1.1, head: 1.0, chin: 1.35, cap: true, badge: true, belt: true },
  partner:   { skin: 0xb98563, shirt: 0x24396a, pants: 0x161f36, shoes: 0x0c0c0e, hair: null, hair_style: 'none', scale: 1.14, width: 1.3, belly: 1.5, head: 0.95, chin: 1.5, cap: true, badge: true, belt: true, mustache: 1.4, vest: 0x2f4580 },
};

const ZOMBIE_SKIN = 0x8fb27f;
const ZOMBIE_EYE = 0xff2a1a;
const OUTLINE = 0.011;

function gradient(): THREE.DataTexture {
  const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
const GRAD = gradient();

export function createCharacter(kind: CharacterKind): Character {
  const L = LOOKS[kind];
  const root = new THREE.Group(); root.name = `char_${kind}`;
  const body = new THREE.Group(); root.add(body);

  const mats: THREE.Material[] = [];
  const geos: THREE.BufferGeometry[] = [];
  const toon = (c: number) => { const m = new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD }); mats.push(m); return m; };
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide });
  outlineMat.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${OUTLINE};`); };
  mats.push(outlineMat);

  const mk = (g: THREE.BufferGeometry, m: THREE.Material, outline = true) => {
    geos.push(g);
    const me = new THREE.Mesh(g, m); me.castShadow = true; me.receiveShadow = true;
    if (outline) { const o = new THREE.Mesh(g, outlineMat); me.add(o); }
    return me;
  };
  const sph = (r: number, m: THREE.Material, o = true) => mk(new THREE.SphereGeometry(r, 18, 12), m, o);
  const cap = (r: number, len: number, m: THREE.Material, o = true) => mk(new THREE.CapsuleGeometry(r, len, 6, 12), m, o);
  const cyl = (rt: number, rb: number, h: number, m: THREE.Material, o = true) => mk(new THREE.CylinderGeometry(rt, rb, h, 16), m, o);
  const box = (w: number, h: number, d: number, m: THREE.Material) => mk(new THREE.BoxGeometry(w, h, d), m, false);

  const skinMat = toon(L.skin), shirtMat = toon(L.shirt), pantsMat = toon(L.pants), shoeMat = toon(L.shoes);
  const hairMat = L.hair !== null ? toon(L.hair) : null;
  const sleeveMat = L.cardigan ? toon(L.cardigan) : shirtMat;
  const w = L.width;

  const legLen = 0.6, torsoH = 0.5, hipY = legLen, shoulderY = legLen + torsoH;
  const headR = 0.215 * L.head;

  // torso (capsule + belly)
  const torso = cap(0.16 * w, torsoH - 0.32, shirtMat); torso.scale.set(1, 1, 0.82);
  torso.position.set(0, hipY + torsoH / 2 + 0.02, 0); body.add(torso);
  if (L.belly > 1.05) { const belly = sph(0.17 * w, shirtMat); belly.scale.set(1, L.belly * 0.75, 0.95 + (L.belly - 1) * 0.35); belly.position.set(0, hipY + 0.13, 0.05); body.add(belly); }
  if (L.cardigan) { const c = cap(0.17 * w, torsoH - 0.3, sleeveMat); c.scale.set(1, 1, 0.9); c.position.copy(torso.position); body.add(c);
    const o = box(0.07, torsoH * 0.9, 0.05, shirtMat); o.position.set(0, torso.position.y, 0.13); body.add(o); }
  if (L.vest) { const v = cap(0.175 * w, torsoH - 0.34, toon(L.vest)); v.scale.set(1, 1, 0.9); v.position.set(0, torso.position.y, 0.005); body.add(v); }
  if (L.tie) { const t = box(0.045, 0.22, 0.02, toon(L.tie)); t.position.set(0, hipY + torsoH * 0.62, 0.15 * L.belly); body.add(t); }
  if (L.belt) { const bt = cyl(0.17 * w + 0.02, 0.17 * w + 0.02, 0.05, toon(0x0a0a0a)); bt.scale.z = 0.85; bt.position.set(0, hipY + 0.06, 0.01); body.add(bt);
    const bu = box(0.06, 0.05, 0.02, toon(0xe0c860)); bu.position.set(0, hipY + 0.06, 0.16 * L.belly); body.add(bu);
    const hol = box(0.07, 0.18, 0.1, toon(0x0a0a0a)); hol.position.set(0.2 * w, hipY - 0.05, 0); body.add(hol); }
  if (L.badge) { const b = sph(0.035, toon(0xe0c860)); b.scale.set(1, 1.1, 0.4); b.position.set(-0.08 * w, hipY + torsoH * 0.7, 0.14); body.add(b); }
  if (L.dress) { const sk = cyl(0.14 * w, 0.28 * w, 0.5, shirtMat); sk.position.set(0, hipY - 0.08, 0); body.add(sk); }
  else { const pel = sph(0.17 * w, pantsMat); pel.scale.set(1, 0.8, 0.85); pel.position.set(0, hipY - 0.02, 0); body.add(pel); }

  // head (big, cartoon)
  const neck = cyl(0.05, 0.055, 0.08, skinMat); neck.position.set(0, shoulderY + 0.02, 0); body.add(neck);
  const head = new THREE.Group(); head.position.set(0, shoulderY + headR * 0.95, 0); body.add(head);
  const skull = sph(headR, skinMat); skull.scale.set(1.0, 1.0, 0.95); head.add(skull);
  const jaw = sph(headR * 0.62 * L.chin, skinMat); jaw.scale.set(1.1, 0.7, 0.9); jaw.position.set(0, -headR * 0.5, headR * 0.12); head.add(jaw);
  const nose = sph(headR * 0.17, skinMat); nose.position.set(0, -headR * 0.12, headR * 0.93); head.add(nose);
  for (const sx of [-1, 1]) { const ear = sph(headR * 0.2, skinMat); ear.scale.z = 0.5; ear.position.set(sx * headR * 0.97, -headR * 0.05, 0); head.add(ear); }

  // eyes
  const eyeWhite = toon(0xffffff), pupilMat = toon(0x0a0a0a);
  const zEye = new THREE.MeshBasicMaterial({ color: ZOMBIE_EYE }); mats.push(zEye);
  const eyes: THREE.Mesh[] = [], pupils: THREE.Mesh[] = [], lids: THREE.Mesh[] = [], brows: THREE.Mesh[] = [];
  const browMat = toon(L.hair ?? 0x2a2018);
  const ex = headR * 0.38, ey = headR * 0.12, ez = headR * 0.86;
  for (const sx of [-1, 1]) {
    const e = sph(headR * 0.24, eyeWhite); e.scale.set(1, 1.15, 0.6); e.position.set(sx * ex, ey, ez); head.add(e); eyes.push(e);
    const p = sph(headR * 0.11, pupilMat, false); p.position.set(sx * ex, ey - 0.005, ez + headR * 0.12); head.add(p); pupils.push(p);
    const brow = box(headR * 0.4, headR * 0.075, headR * 0.1, browMat); brow.position.set(sx * ex, ey + headR * 0.34, ez + headR * 0.05); head.add(brow); brows.push(brow);
    if (L.drunk) { const lid = sph(headR * 0.26, skinMat, false); lid.scale.set(1, 0.55, 0.65); lid.position.set(sx * ex, ey + headR * 0.17, ez + headR * 0.03); head.add(lid); lids.push(lid); }
  }
  const smile = mk(new THREE.TorusGeometry(headR * 0.2, headR * 0.03, 6, 14, Math.PI), toon(0x5a1f1f), false);
  smile.rotation.z = Math.PI; smile.position.set(0, -headR * 0.38, headR * 0.86); head.add(smile);
  const zMouth = box(headR * 0.62, headR * 0.3, headR * 0.1, toon(0x1a0505)); zMouth.position.set(0, -headR * 0.45, headR * 0.86); zMouth.visible = false; head.add(zMouth);
  const teeth: THREE.Mesh[] = [];
  for (let i = -2; i <= 2; i++) { const t = box(headR * 0.09, headR * 0.1, headR * 0.05, toon(0xf0f0d0)); t.position.set(i * headR * 0.12, -headR * 0.33, headR * 0.91); t.visible = false; head.add(t); teeth.push(t); }
  const bagMat = toon(0x3d5a3a);
  const bags: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) { const bg = sph(headR * 0.18, bagMat, false); bg.scale.set(1.2, 0.35, 0.5); bg.position.set(sx * ex, ey - headR * 0.27, ez - headR * 0.02); bg.visible = false; head.add(bg); bags.push(bg); }

  // hair, hats, extras
  if (hairMat) {
    if (L.hair_style === 'poof') {
      const top = sph(headR * 1.12, hairMat); top.scale.set(1.0, 0.8, 1.0); top.position.set(0, headR * 0.28, -headR * 0.12); head.add(top);
      for (const sx of [-1, 1]) { const s = sph(headR * 0.5, hairMat); s.position.set(sx * headR * 0.85, -headR * 0.2, -headR * 0.1); s.scale.set(0.8, 1.4, 0.9); head.add(s); }
      const bun = sph(headR * 0.4, hairMat); bun.position.set(0, headR * 1.05, -headR * 0.4); head.add(bun);
    } else if (L.hair_style === 'short') {
      const top = sph(headR * 1.03, hairMat); top.scale.set(1.0, 0.65, 1.0); top.position.set(0, headR * 0.42, -headR * 0.1); head.add(top);
    } else if (L.hair_style === 'comb') {
      const top = sph(headR * 1.02, hairMat); top.scale.set(1.0, 0.45, 1.0); top.position.set(0, headR * 0.58, -headR * 0.12); head.add(top);
      const sweep = box(headR * 1.5, headR * 0.1, headR * 0.5, hairMat); sweep.position.set(-headR * 0.1, headR * 0.82, headR * 0.1); sweep.rotation.z = 0.12; head.add(sweep);
    }
  }
  if (L.mustache) { const m = cap(headR * 0.07, headR * 0.5 * L.mustache, browMat); m.rotation.z = Math.PI / 2; m.position.set(0, -headR * 0.22, headR * 0.95); m.scale.set(1, 1, 1); head.add(m); }
  if (L.glasses) {
    const gm = toon(0x101010);
    for (const sx of [-1, 1]) { const r = mk(new THREE.TorusGeometry(headR * 0.3, headR * 0.035, 8, 20), gm, false); r.position.set(sx * ex, ey, ez + headR * 0.1); head.add(r); }
    const br = box(headR * 0.2, headR * 0.04, headR * 0.04, gm); br.position.set(0, ey + headR * 0.05, ez + headR * 0.12); head.add(br);
  }
  if (L.cap) {
    const hm = toon(0x14204a);
    const crown = cyl(headR * 0.98, headR * 1.08, headR * 0.5, hm); crown.position.set(0, headR * 0.82, 0); head.add(crown);
    const top = cyl(headR * 1.08, headR * 1.0, headR * 0.12, hm); top.position.set(0, headR * 1.1, 0.01); head.add(top);
    const brim = box(headR * 1.4, headR * 0.07, headR * 0.7, toon(0x05060a)); brim.position.set(0, headR * 0.6, headR * 0.82); head.add(brim);
    const bd = sph(headR * 0.16, toon(0xe0c860)); bd.scale.set(1, 1, 0.4); bd.position.set(0, headR * 0.85, headR * 1.0); head.add(bd);
  }

  // arms and legs (pivots)
  const makeArm = (side: number) => {
    const pivot = new THREE.Group(); pivot.position.set(side * (0.17 * w + 0.07), shoulderY - 0.06, 0);
    const up = cap(0.055 * (L.thin ? 0.8 : 1) * Math.sqrt(w), 0.2, sleeveMat); up.position.y = -0.17; pivot.add(up);
    const elbow = new THREE.Group(); elbow.position.y = -0.33; pivot.add(elbow);
    const fore = cap(0.05 * Math.sqrt(w), 0.17, L.dress ? skinMat : sleeveMat); fore.position.y = -0.14; elbow.add(fore);
    const hand = sph(0.07, skinMat); hand.position.y = -0.3; elbow.add(hand);
    body.add(pivot); return { pivot, elbow };
  };
  const armL = makeArm(-1), armR = makeArm(1);
  const makeLeg = (side: number) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.09 * w, hipY - 0.04, 0);
    const lm = L.dress ? skinMat : pantsMat;
    const th = cap(0.075 * Math.sqrt(w), 0.18, lm); th.position.y = -0.16; pivot.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.3; pivot.add(knee);
    const sh = cap(0.065 * Math.sqrt(w), 0.16, lm); sh.position.y = -0.14; knee.add(sh);
    const foot = sph(0.09, shoeMat); foot.scale.set(0.9, 0.6, 1.5); foot.position.set(0, -0.3, 0.06); knee.add(foot);
    body.add(pivot); return { pivot, knee };
  };
  const legL = makeLeg(-1), legR = makeLeg(1);

  // blood
  const bloodMat = new THREE.MeshToonMaterial({ color: 0x8a0a0a, gradientMap: GRAD }); mats.push(bloodMat);
  const blood = new THREE.Group(); blood.visible = false; body.add(blood);
  for (const [x, y, s] of [[0.05, 0.2, 0.07], [-0.1, 0.1, 0.05], [0.12, 0.02, 0.045]] as const) {
    const b = sph(s, bloodMat, false); b.scale.set(1, 1, 0.3); b.position.set(x, hipY + torsoH * 0.5 + y, 0.16 * w); blood.add(b);
  }
  const pool = cyl(0.55, 0.55, 0.01, bloodMat, false); pool.visible = false; pool.position.set(0, 0.006, 0); root.add(pool);

  root.scale.setScalar(L.scale);
  const height = (shoulderY + headR * 2) * L.scale;

  let zombie = false, dead = false, pose: Pose = 'idle';
  let t = Math.random() * 10, deadBlend = 0;

  const apply = () => {
    (skinMat as THREE.MeshToonMaterial).color.setHex(zombie ? ZOMBIE_SKIN : L.skin);
    eyes.forEach(e => { e.material = zombie ? zEye : eyeWhite; });
    pupils.forEach(p => { p.visible = !zombie; });
    lids.forEach(l => { l.visible = !zombie; });
    bags.forEach(b => { b.visible = zombie; });
    smile.visible = !zombie; zMouth.visible = zombie; teeth.forEach(x => { x.visible = zombie; });
    (shirtMat as THREE.MeshToonMaterial).color.setHex(zombie ? new THREE.Color(L.shirt).lerp(new THREE.Color(0x4a4a3a), 0.45).getHex() : L.shirt);
  };

  const api: Character = {
    root, kind, height,
    setZombie(on) { zombie = on; apply(); },
    setDead(on) { dead = on; blood.visible = on; pool.visible = on; },
    setPose(p) { pose = p; },
    update(dt) {
      t += dt; deadBlend += ((dead ? 1 : 0) - deadBlend) * Math.min(1, dt * 6);
      let aS = 0, lS = 0, lean = 0, bob = 0, fL = 0, fR = 0, eL = 0.15, eR = 0.15, squash = 0;
      if (pose === 'walk') {
        const sp = zombie ? 3.2 : 6.5;
        lS = Math.sin(t * sp) * (zombie ? 0.45 : 0.65); aS = -lS * 0.9;
        bob = Math.abs(Math.sin(t * sp)) * 0.03; squash = Math.sin(t * sp * 2) * 0.02;
      } else { bob = Math.sin(t * 1.6) * 0.006; aS = Math.sin(t * 1.3) * 0.04; squash = Math.sin(t * 1.6) * 0.008; }
      if (pose === 'knock') { fR = -1.4; eR = 1.5 + Math.sin(t * 14) * 0.5; aS = 0; }
      if (zombie) {
        fL = -1.4 + Math.sin(t * 2.2) * 0.1; if (pose !== 'knock') { fR = -1.3 + Math.cos(t * 2.0) * 0.1; eR = 0.2; }
        eL = 0.2; lean = 0.2 + Math.sin(t * 1.1) * 0.04; head.rotation.z = Math.sin(t * 1.7) * 0.15; head.rotation.x = 0.15;
        brows.forEach((b, i) => { b.rotation.z = (i === 0 ? -1 : 1) * -0.5; });
      } else {
        head.rotation.z = L.drunk ? Math.sin(t * 1.2) * 0.07 : 0; head.rotation.x = 0;
        brows.forEach(b => { b.rotation.z = 0; });
      }
      // a dead body must never animate: freeze limbs and squash, whatever pose or zombie state is set
      const live = 1 - Math.min(1, deadBlend * 2);
      aS *= live; lS *= live; fL *= live; fR *= live; eL *= live; eR *= live; squash *= live; bob *= live;
      if (dead) { head.rotation.z *= live; head.rotation.x *= live; }
      armL.pivot.rotation.x = aS + fL; armR.pivot.rotation.x = -aS + fR;
      armL.elbow.rotation.x = -eL; armR.elbow.rotation.x = -eR;
      legL.pivot.rotation.x = lS; legR.pivot.rotation.x = -lS;
      legL.knee.rotation.x = Math.max(0, -lS) * 0.9; legR.knee.rotation.x = Math.max(0, lS) * 0.9;
      head.position.y = shoulderY + headR * 0.95 + bob;
      body.scale.y = 1 + squash;
      body.rotation.x = lean * (1 - deadBlend) - (Math.PI / 2) * deadBlend;
      body.position.y = 0.14 * deadBlend; body.position.z = -0.1 * deadBlend;
      if (deadBlend > 0.5) { armL.pivot.rotation.x = 0.3; armR.pivot.rotation.x = 0.5; armR.pivot.rotation.z = -0.5; } else armR.pivot.rotation.z = 0;
    },
    dispose() { geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); root.removeFromParent(); },
  };
  apply();
  return api;
}
