import * as THREE from 'three';
import { Textures } from './Textures';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface InteractiveProp {
  id: string;
  name: string;
  mesh: THREE.Object3D;
  interactionType: string;
  position: THREE.Vector3;
}

export class Props {
  public static createSofa(): THREE.Group {
    const group = new THREE.Group();
    
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0x6b4a3a, roughness: 0.9 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x7d5a46, roughness: 0.9 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a120f, roughness: 0.7 });

    // Base frame
    const baseGeo = new THREE.BoxGeometry(2.1, 0.30, 0.90);
    const base = new THREE.Mesh(baseGeo, fabricMat);
    base.position.set(0, 0.12 + 0.15, 0); // Legs are 0.12 + half height 0.15
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.12, 8);
    const legXs = [-0.95, 0.95];
    const legZs = [-0.35, 0.35];
    for (const lx of legXs) {
      for (const lz of legZs) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(lx, 0.06, lz);
        leg.castShadow = true;
        group.add(leg);
      }
    }

    // Seat cushions
    const seatGeo = new RoundedBoxGeometry(0.62, 0.16, 0.62, 2, 0.04);
    const cXs = [-0.64, 0, 0.64];
    for (const cx of cXs) {
      const cushion = new THREE.Mesh(seatGeo, cushionMat);
      cushion.position.set(cx, 0.12 + 0.30 + 0.08, 0.08);
      cushion.castShadow = true;
      cushion.receiveShadow = true;
      group.add(cushion);
    }

    // Backrest
    const backGeo = new THREE.BoxGeometry(2.1, 0.50, 0.20);
    const back = new THREE.Mesh(backGeo, fabricMat);
    back.position.set(0, 0.12 + 0.30 + 0.25, -0.35);
    back.castShadow = true;
    back.receiveShadow = true;
    group.add(back);

    // Back cushions
    const backCushionGeo = new RoundedBoxGeometry(0.62, 0.45, 0.16, 2, 0.04);
    for (const cx of cXs) {
      const bCushion = new THREE.Mesh(backCushionGeo, cushionMat);
      bCushion.position.set(cx, 0.12 + 0.30 + 0.16 + 0.15, -0.22);
      bCushion.rotation.x = -0.14; // ~8 degrees backwards
      bCushion.castShadow = true;
      group.add(bCushion);
    }

    // Armrests
    const armGeo = new RoundedBoxGeometry(0.20, 0.60, 0.90, 2, 0.04);
    const arm1 = new THREE.Mesh(armGeo, fabricMat);
    arm1.position.set(-0.95, 0.12 + 0.30, 0);
    arm1.castShadow = true;
    arm1.receiveShadow = true;
    
    const arm2 = new THREE.Mesh(armGeo, fabricMat);
    arm2.position.set(0.95, 0.12 + 0.30, 0);
    arm2.castShadow = true;
    arm2.receiveShadow = true;
    
    group.add(arm1);
    group.add(arm2);

    // Throw pillow
    const pillowGeo = new RoundedBoxGeometry(0.35, 0.35, 0.1, 2, 0.03);
    const pillow = new THREE.Mesh(pillowGeo, new THREE.MeshStandardMaterial({ color: 0x8a3a3a }));
    pillow.position.set(-0.75, 0.12 + 0.30 + 0.16 + 0.1, -0.15);
    pillow.rotation.set(-0.2, 0.4, 0.1);
    pillow.castShadow = true;
    group.add(pillow);

    return group;
  }

  public static createTV(): { group: THREE.Group; screenMat: THREE.MeshBasicMaterial } {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 0.3 });

    // Stand
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), frameMat);
    stand.position.y = 0.2;
    group.add(stand);

    // TV Casing
    const casing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.15), frameMat);
    casing.position.y = 0.85;
    casing.castShadow = true;
    group.add(casing);

    // Animated TV Screen
    const tvTex = Textures.getTVScreenTexture();
    const screenMat = new THREE.MeshBasicMaterial({ map: tvTex });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), screenMat);
    screen.position.set(0, 0.85, 0.08);
    group.add(screen);

    return { group, screenMat };
  }

  public static createCoffeeTable(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.6 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.8), mat);
    top.position.y = 0.45;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const pos = [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]];
    for (const [x, z] of pos) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(x, 0.2, z);
      leg.castShadow = true;
      group.add(leg);
    }
    return group;
  }

  public static createKitchenCounter(): THREE.Group {
    const group = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x18181f });
    const topMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d5, roughness: 0.3 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.7), baseMat);
    base.position.y = 0.45;
    base.castShadow = true;
    base.receiveShadow = true;

    const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.75), topMat);
    top.position.y = 0.94;
    top.castShadow = true;

    group.add(base);
    group.add(top);

    // Knife Block on counter
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.15), blockMat);
    block.position.set(-0.8, 1.05, 0);
    block.rotation.y = 0.3;
    group.add(block);

    return group;
  }

  public static createBed(): THREE.Group {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b1e16 });
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0x384252 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });

    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 2.1), frameMat);
    frame.position.y = 0.18;
    frame.castShadow = true;

    // Mattress / Sheet
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 2.0), sheetMat);
    sheet.position.y = 0.45;
    sheet.castShadow = true;

    // Pillows
    const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.35), pillowMat);
    pillow1.position.set(-0.35, 0.62, -0.75);
    const pillow2 = pillow1.clone();
    pillow2.position.set(0.35, 0.62, -0.75);

    group.add(frame);
    group.add(sheet);
    group.add(pillow1);
    group.add(pillow2);

    return group;
  }

  public static createWardrobeCloset(): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x241a14 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 }); // Gold handle

    const closet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.6), woodMat);
    closet.position.y = 1.1;
    closet.castShadow = true;
    closet.receiveShadow = true;

    // Door handles
    const handle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15), handleMat);
    handle1.position.set(-0.06, 1.1, 0.32);
    const handle2 = handle1.clone();
    handle2.position.set(0.06, 1.1, 0.32);

    group.add(closet);
    group.add(handle1);
    group.add(handle2);

    return group;
  }

  public static createPoliceBadge(): THREE.Group {
    const group = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });

    // Star shield shape
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.02, 7), goldMat);
    badge.rotation.x = Math.PI / 2;
    group.add(badge);

    return group;
  }

  public static createPartyHat(): THREE.Group {
    const group = new THREE.Group();
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xff0066 });

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 12), hatMat);
    cone.position.y = 0.15;
    cone.rotation.z = 0.2;
    group.add(cone);

    return group;
  }

  public static createBalloon(): THREE.Group {
    const group = new THREE.Group();
    const balloonMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, roughness: 0.2 });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), balloonMat);
    sphere.position.y = 1.2;
    
    // String
    const stringGeo = new THREE.CylinderGeometry(0.003, 0.003, 1.0);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const str = new THREE.Mesh(stringGeo, stringMat);
    str.position.y = 0.6;

    group.add(sphere);
    group.add(str);

    return group;
  }

  public static createFamilyPhotoFrame(): THREE.Group {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    const photoMat = new THREE.MeshStandardMaterial({ color: 0xfffaed });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.04), frameMat);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.42), photoMat);
    photo.position.z = 0.022;

    group.add(frame);
    group.add(photo);

    return group;
  }
}
