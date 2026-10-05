import * as THREE from 'three';
import { Player } from './core/Player';
import { Flashlight } from './core/Flashlight';
import { Evidence } from './core/Evidence';
import { Arsenal } from './core/Arsenal';
import { House } from './world/House';
import { PostProcessing } from './render/PostProcessing';
import { SoundManager } from './audio/SoundManager';
import { Narration } from './story/Narration';
import { GameFlow, GamePhase } from './game/GameFlow';
import { EndingData } from './story/Endings';
import { HUD } from './ui/HUD';
import { TitleScreen } from './ui/TitleScreen';
import { PauseMenu } from './ui/PauseMenu';
import { PeepholeUI } from './ui/PeepholeUI';
import { PeepholeManager } from './world/PeepholeManager';
import { ComicOverlays } from './ui/ComicOverlays';
import { houseLayout } from './world/houseLayout';
import { propsLayout } from './world/propsLayout';
import { InteractionSystem } from './game/InteractionSystem';
import { Textures } from './world/Textures';

const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1';
const FRONT_DOOR = new THREE.Vector3(7.4, 0, 12.0);
const DOOR_REACH = 2.5; // how close the player must be to the front door to talk / strike
const CONFIRM_WINDOW = 2000; // ms to press a key again to confirm (restart, flee)

const FLAVOR_TEXT: Record<string, string> = {
  phone: 'No dial tone. The storm took the line.',
  radio: 'Static... "all units, disturbance reported on Oak Street..."',
  badge: "Dad's badge. Twenty years on the force."
};

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private gameFlow!: GameFlow;

  private player: Player;
  private flashlight: Flashlight;
  private evidence: Evidence;
  private arsenal: Arsenal;
  private house: House;
  private postProcessing: PostProcessing;
  private soundManager: SoundManager;
  private narration: Narration;
  private interactionSystem: InteractionSystem;

  private hud: HUD;
  private titleScreen: TitleScreen;
  private pauseMenu: PauseMenu;
  private peepholeUI: PeepholeUI;
  private peepholeManager: PeepholeManager;

  private bloodDecals = new Map<string, THREE.Mesh>();

  private debugBoxes: THREE.Group | null = null;
  private debugArrows: THREE.Group | null = null;
  private debugRoomIndex = 0;

  private raycaster = new THREE.Raycaster();
  private clock = new THREE.Clock();
  private gameTime = 0;
  private lastRestartPress = 0;
  private lastFleePress = 0;

  constructor() {
    const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040406);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(-2.5, 2.0, 1.0);
    this.camera.lookAt(-2.25, 1.0, -2.5);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize Core Modules
    this.soundManager = SoundManager.getInstance();
    this.soundManager.init();

    this.player = new Player(this.camera);
    this.flashlight = new Flashlight(this.scene, this.camera);
    this.evidence = new Evidence();
    this.arsenal = new Arsenal(this.camera);
    this.house = new House(this.scene);
    this.player.setColliders(this.house.collisionBoxes);

    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
    this.narration = new Narration();

    // UI Modules
    this.hud = new HUD();
    this.peepholeUI = new PeepholeUI();
    this.peepholeManager = new PeepholeManager(this.player, this.peepholeUI);
    this.interactionSystem = new InteractionSystem(this.scene, this.hud);

    this.registerInteractables();

    this.pauseMenu = new PauseMenu(
      () => this.player.lockPointer(), // unpausing happens in the pointerlockchange handler
      () => location.reload()
    );

    this.player.onSetFlashlight = (on) => {
      if (this.flashlight.isTurnedOn() !== on) {
        this.flashlight.toggle();
        this.hud.updateFlashlight(on);
      }
    };
    this.gameFlow = new GameFlow(
      this.scene,
      this.house,
      this.player,
      this.evidence,
      this.narration,
      this.hud,
      (ending) => this.triggerEnding(ending)
    );
    // The shot is fired with Dad's service pistol whether or not the player fetched it first
    this.gameFlow.onParentsShot = () => {
      this.arsenal.unlockPistol();
      this.evidence.setPistolHidden(false);
      this.hud.updateWeapon(this.arsenal.getWeapon(), this.arsenal.getPistolAmmo());
      for (const [id, decal] of this.bloodDecals) {
        const trace = this.evidence.getBloodTraces().find(t => t.id === id);
        decal.visible = !!trace && !trace.cleaned;
      }
    };

    this.titleScreen = new TitleScreen(
      () => this.gameFlow.advancePhase(),
      (settings) => {
        this.soundManager.setVolume(settings.volume);
        this.player.setMouseSensitivity(settings.sensitivity);
        this.postProcessing.setQuality(settings.quality);
        this.player.setHeadBob(settings.headbob);
        this.house.lightManager.setBrightness(settings.brightness);
        this.postProcessing.setBrightness(settings.brightness);
      }
    );

    // Hide Loading Screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      loadingScreen.style.display = 'none';
    }
    this.titleScreen.show();

    this.bindEvents();
    if (DEBUG) this.runSelfCheck();
    this.animate();
  }

  // ---------------------------------------------------------------------------
  // Interactables
  // ---------------------------------------------------------------------------

  private registerInteractables(): void {
    for (const prop of this.house.interactiveProps) {
      let interactFn = () => {};
      let canInteractFn: (() => { allowed: boolean; reason?: string }) | undefined = undefined;
      let promptTextFn = () => `Examine ${prop.name}`;
      const type = prop.interactionType;

      if (type === 'knife') {
        promptTextFn = () => `Take a knife from the ${prop.name}`;
        interactFn = () => {
          this.arsenal.unlockKnife();
          this.hud.updateWeapon(this.arsenal.getWeapon(), this.arsenal.getPistolAmmo());
          ComicOverlays.popOnomatopoeia('EQUIPPED!', 50, 50);
          this.interactionSystem.unregister(prop.id);
        };
      } else if (type === 'gun_safe' || type === 'pistol_closet') {
        promptTextFn = () => this.arsenal.ownsPistol() ? `Lock the pistol in the ${prop.name}` : `Take the service pistol from the ${prop.name}`;
        interactFn = () => {
          if (this.arsenal.ownsPistol()) {
            this.arsenal.removePistol();
            this.evidence.setPistolHidden(true);
            ComicOverlays.popOnomatopoeia('LOCKED AWAY', 50, 50);
          } else {
            this.arsenal.unlockPistol();
            this.evidence.setPistolHidden(false);
            ComicOverlays.popOnomatopoeia('SERVICE PISTOL!', 50, 50);
          }
          this.hud.updateWeapon(this.arsenal.getWeapon(), this.arsenal.getPistolAmmo());
        };
      } else if (type === 'curtains') {
        promptTextFn = () => this.house.isCurtainsClosed ? `Open ${prop.name}` : `Close ${prop.name}`;
        interactFn = () => {
          this.house.setCurtainsClosed(!this.house.isCurtainsClosed);
          this.evidence.setCurtainsClosed(this.house.isCurtainsClosed);
          ComicOverlays.popOnomatopoeia(this.house.isCurtainsClosed ? 'CURTAINS CLOSED' : 'CURTAINS OPEN', 50, 50);
          this.soundManager.playLampClick();
        };
      } else if (type === 'door' && prop.id === 'door_rear') {
        // The rear door is the way out for the "run" ending
        const canFlee = () => this.gameFlow.phase >= GamePhase.ACT2_COVERUP && this.gameFlow.phase <= GamePhase.VISITOR_PARTNER;
        promptTextFn = () => canFlee() ? 'Flee through the Rear Door (press twice)' : prop.name;
        canInteractFn = () => canFlee() ? { allowed: true } : { allowed: false, reason: 'Locked' };
        interactFn = () => {
          const now = performance.now();
          if (now - this.lastFleePress < CONFIRM_WINDOW) {
            this.gameFlow.tryRunEnding();
          } else {
            this.lastFleePress = now;
            this.hud.flashInteractionPrompt('Press E again to run. There is no coming back.');
          }
        };
      } else if (type === 'door') {
        const door = this.house.animatedDoors.find(d => d.id === prop.id);
        if (door) {
          promptTextFn = () => door.isOpen ? `Close ${prop.name}` : `Open ${prop.name}`;
          canInteractFn = () => {
            return door.isLocked ? { allowed: false, reason: 'Locked' } : { allowed: true };
          };
          interactFn = () => {
            door.isOpen = !door.isOpen;
            ComicOverlays.popOnomatopoeia(door.isOpen ? 'CREAK...' : 'SLAM', 50, 50);
            this.soundManager.playLampClick();
          };
        }
      } else if (type === 'switch' || type === 'tv' || type.startsWith('lamp')) {
        // Lamp props carry their light id as the interaction type (e.g. 'lamp_living')
        const targetId: string =
          type === 'switch' ? (prop as any).targetLightId :
          type === 'tv' ? 'tv' :
          type === 'lamp' ? prop.id : type;
        promptTextFn = () => {
          const light = this.house.lightManager.getLight(targetId);
          return (light && light.isOn) ? `Turn off ${prop.name}` : `Turn on ${prop.name}`;
        };
        canInteractFn = () => this.gameFlow.isPowerOn ? { allowed: true } : { allowed: false, reason: 'No power' };
        interactFn = () => {
          const light = this.house.lightManager.getLight(targetId);
          if (light) {
            this.house.lightManager.toggleLight(targetId);
            this.hud.flashInteractionPrompt(light.isOn ? 'Turned ON' : 'Turned OFF');
          } else {
            this.hud.flashInteractionPrompt('Broken');
            this.soundManager.playLampClick();
          }
        };
      } else if (FLAVOR_TEXT[type]) {
        interactFn = () => this.narration.showCaption(FLAVOR_TEXT[type], 3.5);
      }

      this.interactionSystem.register({
        id: prop.id,
        mesh: prop.mesh,
        position: prop.position,
        promptText: promptTextFn,
        onInteract: interactFn,
        canInteract: canInteractFn
      });
    }

    // Front door peephole
    this.interactionSystem.register({
      id: 'peephole',
      position: new THREE.Vector3(7.4, 1.55, 12.0),
      promptText: () => 'Look through the peephole',
      canInteract: () => this.canUsePeephole() ? { allowed: true } : { allowed: false, reason: 'Not now' },
      onInteract: () => this.enterPeephole()
    });

    const coverupStarted = () => this.gameFlow.phase >= GamePhase.ACT1_POWER_BACK;

    // Blood traces: a decal on the floor, revealed when the parents are shot
    const bloodMat = new THREE.MeshBasicMaterial({ map: Textures.getBloodStain(), transparent: true, depthWrite: false });
    const bloodGeo = new THREE.PlaneGeometry(1.0, 1.0);
    bloodGeo.rotateX(-Math.PI / 2);
    for (const trace of this.evidence.getBloodTraces()) {
      const decal = new THREE.Mesh(bloodGeo, bloodMat);
      decal.position.set(trace.position.x, 0.012, trace.position.z);
      decal.visible = false;
      this.scene.add(decal);
      this.bloodDecals.set(trace.id, decal);

      this.interactionSystem.register({
        id: trace.id,
        position: new THREE.Vector3(trace.position.x, trace.position.y, trace.position.z),
        promptText: () => 'Clean blood',
        canInteract: () => coverupStarted() ? { allowed: true } : { allowed: false, reason: 'Nothing here' },
        onInteract: () => {
          this.evidence.cleanBloodTrace(trace.id);
          decal.visible = false;
          this.interactionSystem.unregister(trace.id);
          this.narration.triggerBeat('evidence_cleaned');
          ComicOverlays.popOnomatopoeia('CLEANED!', 50, 50);
        }
      });
    }

    // Bodies
    for (const body of this.evidence.getBodies()) {
      this.interactionSystem.register({
        id: body.id,
        position: new THREE.Vector3(body.position.x, body.position.y, body.position.z),
        promptText: () => `Hide ${body.name}'s body`,
        canInteract: () => coverupStarted() ? { allowed: true } : { allowed: false, reason: 'Nothing here' },
        onInteract: () => {
          this.evidence.hideBody(body.id);
          this.gameFlow.hideParentBody(body.kind);
          this.interactionSystem.unregister(body.id);
          ComicOverlays.popOnomatopoeia('HIDDEN!', 50, 50);
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Door / visitor helpers
  // ---------------------------------------------------------------------------

  private isNearFrontDoor(): boolean {
    const pos = this.player.getPosition();
    return this.player.getFloor() === 0 && Math.hypot(pos.x - FRONT_DOOR.x, pos.z - FRONT_DOOR.z) <= DOOR_REACH;
  }

  private canUsePeephole(): boolean {
    return this.gameFlow.phase > GamePhase.MONTAGE && this.gameFlow.phase < GamePhase.FINAL_INSPECTION;
  }

  private enterPeephole(): void {
    if (this.peepholeManager.isActive()) return;
    this.peepholeManager.enter(this.flashlight);
    this.hud.togglePeepholeMode(true);
    this.interactionSystem.setEnabled(false); // disable while peeking
  }

  private exitPeephole(): void {
    if (!this.peepholeManager.isActive()) return;
    this.peepholeManager.exit(this.flashlight);
    this.hud.togglePeepholeMode(false);
    this.interactionSystem.setEnabled(true);
  }

  private talkToVisitor(): void {
    const vm = this.gameFlow.getVisitorManager();
    if (!vm.getActiveVisitor()) return;
    if (!this.isNearFrontDoor()) {
      this.hud.flashInteractionPrompt('Go to the front door to answer');
      return;
    }
    const result = vm.attemptTalk(this.gameFlow.paranoia, this.evidence);
    this.narration.showCaption(result.message, 4.0);
    if (result.outcome === 'forced_entry') {
      this.hud.hideDoorPrompt();
      ComicOverlays.popOnomatopoeia('BAM! BAM!', 50, 40);
      setTimeout(() => this.gameFlow.forceEntry(), 2000);
    } else if (result.outcome === 'success') {
      this.hud.hideDoorPrompt();
    }
  }

  private strikeVisitor(): void {
    this.evidence.recordVisitorStruck();
    ComicOverlays.popOnomatopoeia('BANG!', 50, 40);
    this.gameFlow.getVisitorManager().dismissVisitor();
    this.hud.hideDoorPrompt();
  }

  // Does the crosshair ray hit any of these objects within range?
  private aimHits(targets: THREE.Object3D[], range: number): boolean {
    if (targets.length === 0) return false;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = range;
    const hits = this.raycaster.intersectObjects(targets, true);
    this.raycaster.far = Infinity;
    return hits.length > 0;
  }

  private isInGame(): boolean {
    return this.gameFlow.phase > GamePhase.MONTAGE && this.gameFlow.phase < GamePhase.FINAL_INSPECTION;
  }

  // ---------------------------------------------------------------------------
  // Pause
  // ---------------------------------------------------------------------------

  private pause(): void {
    this.gameFlow.isPaused = true;
    this.pauseMenu.show();
  }

  private resume(): void {
    this.gameFlow.isPaused = false;
    this.pauseMenu.hide();
    this.clock.getDelta(); // don't feed the paused time into the next frame
  }

  private runSelfCheck(): void {
    console.log("--- RUNNING LAYOUT SELF-CHECK ---");
    let passCount = 0;
    let failCount = 0;
    const check = (desc: string, cond: boolean) => {
      console.log(`[${cond ? 'PASS' : 'FAIL'}] ${desc}`);
      if (cond) passCount++; else failCount++;
    };

    const graph = new Map<string, string[]>();
    for (const r of houseLayout.rooms) graph.set(r.name, []);

    for (const d of houseLayout.doors) {
      const roomsFound = [];
      const floorY = d.floor;
      for (const r of houseLayout.rooms) {
         if (r.floor !== floorY) continue;
         if (d.axis === 'x') {
            if (Math.abs(r.zMin - d.z) < 0.1 || Math.abs(r.zMax - d.z) < 0.1) {
               if (d.x >= r.xMin - 0.1 && d.x <= r.xMax + 0.1) roomsFound.push(r.name);
            }
         } else {
            if (Math.abs(r.xMin - d.x) < 0.1 || Math.abs(r.xMax - d.x) < 0.1) {
               if (d.z >= r.zMin - 0.1 && d.z <= r.zMax + 0.1) roomsFound.push(r.name);
            }
         }
      }

      check(`Door '${d.name}' connects rooms (${roomsFound.join(', ')})`, roomsFound.length === 2 || roomsFound.length === 1);
      if (roomsFound.length === 2) {
         graph.get(roomsFound[0])!.push(roomsFound[1]);
         graph.get(roomsFound[1])!.push(roomsFound[0]);
      }
    }

    graph.get('Foyer')?.push('Upstairs Hall');
    graph.get('Upstairs Hall')?.push('Foyer');

    // Walk-in closet is entirely inside Master Bedroom bounds, so the door boundary check misses the Master Bedroom side
    graph.get('Master Bedroom')?.push('Walk-in Closet');
    graph.get('Walk-in Closet')?.push('Master Bedroom');

    const visited = new Set<string>();
    const queue = ['Foyer'];
    visited.add('Foyer');
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const nxt of graph.get(curr) || []) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push(nxt);
        }
      }
    }

    for (const r of houseLayout.rooms) {
       check(`Room '${r.name}' is reachable from Foyer`, visited.has(r.name));
    }

    const checkSpawn = (name: string, pos: THREE.Vector3) => {
       const box = new THREE.Box3(
         new THREE.Vector3(pos.x - 0.35, pos.y, pos.z - 0.35),
         new THREE.Vector3(pos.x + 0.35, pos.y + 1.6, pos.z + 0.35)
       );
       let overlap = false;
       for (const c of this.house.collisionBoxes) {
         if (pos.y < 1.0 && c.box.min.y >= 2.0) continue;
         if (pos.y >= 2.0 && c.box.max.y <= 2.0) continue;
         if (c.box.max.y <= pos.y + 0.1) continue;

         if (c.box.intersectsBox(box)) overlap = true;
       }
       check(`Spawn '${name}' is free of colliders`, !overlap);
    };
    checkSpawn('player', houseLayout.spawns.player);
    checkSpawn('parents', houseLayout.spawns.parents);
    checkSpawn('visitor', houseLayout.spawns.visitor);

    for (const p of propsLayout) {
      if (p.supportId) {
         const sup = propsLayout.find(s => s.id === p.supportId);
         check(`Support item '${p.id}' is on support '${p.supportId}'`, !!sup);
      }

      let inside = false;
      for (const r of houseLayout.rooms) {
         if (r.floor === p.floor && p.x >= r.xMin && p.x <= r.xMax && p.z >= r.zMin && p.z <= r.zMax) {
           inside = true;
           break;
         }
      }
      check(`Prop '${p.id}' is inside its room`, inside);
    }

    console.log(`Self-Check Complete: ${passCount} PASS, ${failCount} FAIL`);
  }

  private triggerEnding(ending: EndingData): void {
    this.exitPeephole();
    this.hud.hide();
    this.hud.hideDoorPrompt();
    this.pauseMenu.hide();
    this.player.setLocked(false);
    document.exitPointerLock();

    const endingScreen = document.getElementById('ending-screen');
    const titleEl = document.getElementById('ending-title');
    const storyEl = document.getElementById('ending-story');

    const statParanoia = document.getElementById('stat-paranoia');
    const statNoise = document.getElementById('stat-noise');
    const statEvidence = document.getElementById('stat-evidence');
    const statVisitors = document.getElementById('stat-visitors');

    if (endingScreen) endingScreen.classList.remove('hidden');
    if (titleEl) titleEl.innerText = ending.title;
    if (storyEl) storyEl.innerText = ending.story;

    if (statParanoia) statParanoia.innerText = `${Math.round(this.gameFlow.paranoia)}%`;
    if (statNoise) statNoise.innerText = `${this.evidence.getTotalNoise()}`;
    if (statEvidence) statEvidence.innerText = `${this.evidence.getUncleanedTracesCount() + this.evidence.getExposedBodiesCount()}`;
    if (statVisitors) statVisitors.innerText = `${this.evidence.getVisitorsStruck()}`;

    const btnRestart = document.getElementById('btn-ending-restart');
    if (btnRestart) {
      btnRestart.onclick = () => location.reload();
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.peepholeManager.setAspect(window.innerWidth / window.innerHeight);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const clickToPlay = document.getElementById('click-to-play');
    if (clickToPlay) {
      clickToPlay.addEventListener('click', () => {
        clickToPlay.classList.add('hidden');
        this.player.lockPointer();
      });
    }

    document.addEventListener('pointerlockchange', () => {
      const isLocked = document.pointerLockElement !== null;
      this.player.setLocked(isLocked);
      if (isLocked) {
        if (clickToPlay) clickToPlay.classList.add('hidden');
        if (this.gameFlow.isPaused) this.resume();
      } else if (this.isInGame()) {
        this.pause();
      }
    });

    document.addEventListener('pointerlockerror', () => {
      // Pointer lock needs a user gesture; the pause menu's Resume button provides one
      if (this.isInGame()) this.pause();
    });

    window.addEventListener('keydown', (e) => {
      if (this.gameFlow.isPaused) return;

      if (DEBUG) this.handleDebugKey(e);

      if (e.code === 'KeyR' && (this.isInGame() || this.gameFlow.phase === GamePhase.ENDING)) {
        const now = performance.now();
        if (now - this.lastRestartPress < CONFIRM_WINDOW) {
          location.reload();
        } else {
          this.lastRestartPress = now;
          this.hud.flashInteractionPrompt('Press R again to restart');
        }
        return;
      }

      if (!this.isInGame()) return;

      if (e.code === 'KeyF') {
        const isOn = this.flashlight.toggle();
        this.hud.updateFlashlight(isOn);
        this.soundManager.playLampClick();
      }

      if (e.code === 'Digit1') {
        this.arsenal.equip('knife');
        this.hud.updateWeapon(this.arsenal.getWeapon(), this.arsenal.getPistolAmmo());
      }

      if (e.code === 'Digit2') {
        this.arsenal.equip('pistol');
        this.hud.updateWeapon(this.arsenal.getWeapon(), this.arsenal.getPistolAmmo());
      }

      if (e.code === 'KeyE') {
        this.handleInteraction();
      }

      if (e.code === 'KeyT' && this.gameFlow.phase >= GamePhase.ACT2_COVERUP && this.gameFlow.phase <= GamePhase.VISITOR_PARTNER) {
        this.talkToVisitor();
      }

      if (e.code === 'KeyQ') {
        this.exitPeephole();
      }
    });

    window.addEventListener('wheel', () => {
      if (this.gameFlow.isPaused || !this.isInGame() || this.peepholeManager.isActive()) return;
      this.arsenal.switchNext();
      this.hud.updateWeapon(this.arsenal.getWeapon(), this.arsenal.getPistolAmmo());
    });

    window.addEventListener('mousedown', (e) => {
      if (this.gameFlow.isPaused || !this.isInGame()) return;
      if (e.button === 2) {
        this.exitPeephole();
        return;
      }
      if (e.button !== 0 || this.gameFlow.blockInput || this.peepholeManager.isActive()) return;
      // Clicks on HUD buttons (door prompt) are handled by their own handlers
      if (document.pointerLockElement === null) return;

      const weapon = this.arsenal.getWeapon();
      const result = this.arsenal.attack((noise) => this.evidence.addNoise(noise));
      this.hud.updateWeapon(this.arsenal.getWeapon(), this.arsenal.getPistolAmmo());
      if (!result.hit) return;

      const range = weapon === 'knife' ? 2.0 : 25.0;
      if (this.gameFlow.phase === GamePhase.ACT1_ARRIVAL) {
        if (this.aimHits(this.gameFlow.getParentRoots(), range)) {
          this.gameFlow.handlePlayerAttack();
        }
      } else if (this.gameFlow.phase >= GamePhase.ACT2_COVERUP) {
        const vm = this.gameFlow.getVisitorManager();
        const figure = vm.getCurrentFigure();
        if (figure && vm.isVisitorAtDoor() && this.isNearFrontDoor() && this.aimHits([figure.root], range)) {
          this.strikeVisitor();
        }
      }
    });

    // Door prompt buttons (usable when the pointer is free, e.g. from the pause menu)
    const btnPeephole = document.getElementById('btn-door-peephole');
    const btnTalk = document.getElementById('btn-door-talk');
    const btnAttack = document.getElementById('btn-door-attack');

    if (btnPeephole) {
      btnPeephole.onclick = () => {
        if (this.canUsePeephole()) this.enterPeephole();
      };
    }

    if (btnTalk) {
      btnTalk.onclick = () => {
        if (this.gameFlow.phase >= GamePhase.ACT2_COVERUP) this.talkToVisitor();
      };
    }

    if (btnAttack) {
      btnAttack.onclick = () => {
        const vm = this.gameFlow.getVisitorManager();
        if (this.gameFlow.phase >= GamePhase.ACT2_COVERUP && vm.isVisitorAtDoor() && this.isNearFrontDoor()) {
          this.strikeVisitor();
        }
      };
    }
  }

  private handleDebugKey(e: KeyboardEvent): void {
    if (e.code === 'KeyN') {
      this.gameFlow.advancePhase();
    }

    if (e.code === 'F3') {
      e.preventDefault();
      const debugOverlay = document.getElementById('debug-overlay');
      if (debugOverlay) debugOverlay.classList.toggle('hidden');
    }

    if (e.code === 'F4') {
      e.preventDefault();
      if (!this.debugBoxes) {
        this.debugBoxes = new THREE.Group();
        for (const box of this.house.collisionBoxes) {
          const helper = new THREE.Box3Helper(box.box, new THREE.Color(0xffff00));
          this.debugBoxes.add(helper);
        }
        this.scene.add(this.debugBoxes);
      } else {
        this.debugBoxes.visible = !this.debugBoxes.visible;
      }
    }

    if (e.code === 'F5') {
      e.preventDefault();
      const rooms = houseLayout.rooms;
      const room = rooms[this.debugRoomIndex];
      this.player.setPosition(room.xMin + (room.xMax - room.xMin) / 2, room.floor * 3.0 + 1.6, room.zMin + (room.zMax - room.zMin) / 2);
      this.debugRoomIndex = (this.debugRoomIndex + 1) % rooms.length;
      console.log(`Teleported to ${room.name}`);
    }

    if (e.code === 'F6') {
      e.preventDefault();
      const pos = this.player.getPosition();
      const floor = this.player.getFloor();
      let roomName = 'Outside';
      for (const r of houseLayout.rooms) {
        if (r.floor === floor && pos.x >= r.xMin && pos.x <= r.xMax && pos.z >= r.zMin && pos.z <= r.zMax) {
          roomName = r.name;
          break;
        }
      }
      console.log(`Pos: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}), Floor: ${floor}, Room: ${roomName}`);
    }

    if (e.code === 'F7') {
      e.preventDefault();
      if (!this.debugArrows) {
        this.debugArrows = new THREE.Group();
        for (const p of propsLayout) {
           const cy = (p.floor === 1 ? 3.0 : 0.0) + p.h / 2;
           const pos = new THREE.Vector3(p.x, cy, p.z);
           let dir = new THREE.Vector3(0, 0, -1);
           if (p.facing === 'S') dir.set(0, 0, 1);
           else if (p.facing === 'E') dir.set(1, 0, 0);
           else if (p.facing === 'W') dir.set(-1, 0, 0);

           const arrow = new THREE.ArrowHelper(dir, pos, 0.8, 0xff0000);
           this.debugArrows.add(arrow);

           // Create label sprite
           const canvas = document.createElement('canvas');
           canvas.width = 256; canvas.height = 64;
           const ctx = canvas.getContext('2d')!;
           ctx.fillStyle = 'rgba(0,0,0,0.5)';
           ctx.fillRect(0, 0, 256, 64);
           ctx.font = '24px monospace';
           ctx.fillStyle = 'white';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'middle';
           ctx.fillText(p.id, 128, 32);

           const tex = new THREE.CanvasTexture(canvas);
           const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
           const sprite = new THREE.Sprite(mat);
           sprite.scale.set(1.5, 0.375, 1.0);
           sprite.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0));
           this.debugArrows.add(sprite);
        }
        this.scene.add(this.debugArrows);
      } else {
        this.debugArrows.visible = !this.debugArrows.visible;
      }
    }

    if (e.code === 'F8') {
      e.preventDefault();
      this.house.lightManager.debugGizmos.visible = !this.house.lightManager.debugGizmos.visible;
    }

    if (e.code === 'F9') {
      e.preventDefault();
      this.house.lightManager.toggleAllLights();
    }
  }

  private handleInteraction(): void {
    if (this.peepholeManager.isActive()) {
      this.exitPeephole();
      return;
    }
    this.interactionSystem.interact();
  }

  private updateDoorPrompt(): void {
    const vm = this.gameFlow.getVisitorManager();
    if (vm.isVisitorAtDoor() && this.isNearFrontDoor() && !this.peepholeManager.isActive()) {
      this.hud.showDoorPrompt(this.gameFlow.paranoia);
    } else {
      this.hud.hideDoorPrompt();
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const realDelta = Math.min(this.clock.getDelta(), 0.1);
    const delta = this.gameFlow.isPaused ? 0 : realDelta;
    if (!this.gameFlow.isPaused) {
      this.gameTime += delta;
    }
    const time = this.gameTime;

    if (!this.gameFlow.isPaused) {
      this.gameFlow.update(delta, this.flashlight.isTurnedOn(), time);

      // Update Player & Flashlight
      if (this.gameFlow.phase > GamePhase.MONTAGE) {
        this.player.update(delta, this.gameFlow.paranoia, () => {
          this.soundManager.playFootstep('wood');
        });

        this.house.updateDoors(delta);
        this.house.lightManager.update(delta, this.gameFlow.paranoia, this.player.getPosition());

        this.flashlight.update(delta, this.gameFlow.paranoia);
        this.soundManager.updateHeartbeat(this.gameFlow.paranoia);

        this.interactionSystem.update(this.camera, this.player.getPosition(), this.house.collisionBoxes, this.player.getFloor());
        if (this.isInGame()) this.updateDoorPrompt();
      }

      if (this.peepholeManager.isActive()) {
        this.peepholeManager.update(delta, time);
      }
    }

    if (this.peepholeManager.isActive()) {
      this.postProcessing.setCamera(this.peepholeManager.getCamera());
    } else {
      this.postProcessing.setCamera(this.camera);
    }

    this.postProcessing.render(time);

    const debugOverlay = document.getElementById('debug-overlay');
    if (debugOverlay && !debugOverlay.classList.contains('hidden')) {
      document.getElementById('debug-fps')!.innerText = `FPS: ${realDelta > 0 ? Math.round(1 / realDelta) : 0}`;
      const pos = this.player.getPosition();
      document.getElementById('debug-pos')!.innerText = `Pos: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`;
      document.getElementById('debug-lock')!.innerText = `Lock: ${document.pointerLockElement !== null}`;
      document.getElementById('debug-state')!.innerText = `Phase: ${GamePhase[this.gameFlow.phase]}`;
      document.getElementById('debug-keys')!.innerText = `Keys: ${this.player.getKeyStates()}`;
      document.getElementById('debug-light')!.innerText = `Light: ${this.flashlight.isTurnedOn() ? 'ON' : 'OFF'}, Actives: ${this.house.lightManager.getActiveCount()}`;
    }
  };
}

// Start Game application when DOM is ready
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
} else {
  new Game();
}
