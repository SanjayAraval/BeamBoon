import * as THREE from 'three';
import { Player } from '../core/Player';
import { House } from '../world/House';
import { NpcManager } from '../world/NpcController';
import { Narration } from '../story/Narration';
import { Evidence } from '../core/Evidence';
import { VisitorManager, VisitorInfo } from '../core/Visitor';
import { Endings, EndingData } from '../story/Endings';
import { SoundManager } from '../audio/SoundManager';
import { HUD } from '../ui/HUD';
import { Character } from '../world/characters';
import { ComicOverlays } from '../ui/ComicOverlays';
import { ComicPlayer } from '../ui/ComicPlayer';
import { findRoom } from '../world/houseLayout';

export enum GamePhase {
  TITLE,
  MONTAGE,
  ACT1_INTRO,
  ACT1_MOVIE,
  ACT1_BLACKOUT,
  ACT1_ARRIVAL,
  ACT1_SHOOTING,
  ACT1_POWER_BACK,
  ACT2_COVERUP,
  VISITOR_NEIGHBOUR,
  VISITOR_OFFICER,
  VISITOR_PARTNER,
  FINAL_INSPECTION,
  ENDING
}

export function getVisionMode(character: Character, paranoia: number, isLightning: boolean, isRoomLit: boolean): boolean {
  if (paranoia > 70) return true;
  if (isLightning) return false;
  if (isRoomLit) return false;
  return true;
}

const COVERUP_DURATION = 90; // seconds to clean up before the first knock
const BETWEEN_VISITORS = 15; // breathing room after a visitor leaves

const VISITORS: Record<string, VisitorInfo> = {
  neighbour: {
    type: 'neighbour',
    name: 'Curious Neighbor (Mr. Henderson)',
    skepticism: 0.5,
    requiredTraces: 1,
    dialogueSuccess: '"Oh, just watching movies late? Sorry to disturb you son, goodnight!"',
    dialogueFail: '"Wait... what is that smell? And is that blood on your shirt?!"'
  },
  officer: {
    type: 'officer',
    name: 'Patrol Officer Davis',
    skepticism: 0.9,
    requiredTraces: 2,
    dialogueSuccess: '"Your dad left his radio on, just checking everything is alright. Take care."',
    dialogueFail: '"Open this door right now! Something isn\'t right here!"'
  },
  partner: {
    type: 'partner',
    name: "Father's Police Partner (Sgt. Miller)",
    skepticism: 0.7,
    requiredTraces: 2,
    dialogueSuccess: '"Alright kid, tell your dad to call me first thing in the morning."',
    dialogueFail: '"I know your father\'s service weapon... who fired a round in there?!"'
  }
};

export class GameFlow {
  public phase: GamePhase = GamePhase.TITLE;
  public isPaused: boolean = false;

  // The pause overlay opened or closed
  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.comic?.setPaused(paused);
  }
  
  private scene: THREE.Scene;
  private house: House;
  private player: Player;
  private evidence: Evidence;
  private narration: Narration;
  private hud: HUD;
  private npcManager: NpcManager;
  private visitorManager: VisitorManager;
  private comic: ComicPlayer | null = null;
  private comicDone = false; // set by the comic's onDone; acted on in update() so the handoff follows the game clock
  
  private phaseTimer: number = 0;
  private knockTimer: number = 0;
  private lightningTimer: number = 0;
  private isLightning: boolean = false;
  public paranoia: number = 0;
  public blockInput: boolean = false;
  public isPowerOn: boolean = true;
  private visitorGoneTimer = 0;
  private forcedEntryTimer = -1; // counts down (game time) to a visitor pushing inside

  // Fired when the parents go down, so the player always ends up holding the pistol that did it
  public onParentsShot?: () => void;
  
  private onEndingTriggered: (ending: EndingData) => void;
  
  constructor(
    scene: THREE.Scene, 
    house: House, 
    player: Player, 
    evidence: Evidence, 
    narration: Narration, 
    hud: HUD,
    onEndingTriggered: (ending: EndingData) => void
  ) {
    this.scene = scene;
    this.house = house;
    this.player = player;
    this.evidence = evidence;
    this.narration = narration;
    this.hud = hud;
    this.onEndingTriggered = onEndingTriggered;
    
    this.npcManager = new NpcManager(scene, house.collisionBoxes);
    this.visitorManager = new VisitorManager();
  }
  
  public reset(): void {
    this.phase = GamePhase.TITLE;
    this.phaseTimer = 0;
    this.knockTimer = 0;
    this.lightningTimer = 0;
    this.isLightning = false;
    this.paranoia = 0;
    this.blockInput = false;
    this.isPowerOn = true;
    this.forcedEntryTimer = -1;
    this.fadeTimer = -1;
    this.nextPhasePending = false;
    this.disposeComic(); // Play Again: the comic plays again from the start
    
    this.evidence.reset();
    this.visitorManager.dismissVisitor();
    
    this.npcManager.reset();
    this.house.lightManager.setHouseLightsOn(true);
    
    this.hud.updateParanoia(0);
    const bangOverlay = document.getElementById('bang-overlay');
    if (bangOverlay) bangOverlay.classList.add('hidden');
    
    const epilogue = document.getElementById('epilogue');
    if (epilogue) epilogue.classList.add('hidden');
    
    const title = document.getElementById('title-screen');
    if (title) title.classList.remove('hidden');
  }

    private fadeTimer = -1;
  private nextPhasePending = false;
  private skipHoldTimer = 0;
  private introTimelineFlags = new Set<number>();

  public advancePhase(): void {
    const nextPhase = this.phase + 1;
    if (nextPhase === GamePhase.ACT1_SHOOTING || nextPhase === GamePhase.ACT1_POWER_BACK || this.phase === GamePhase.TITLE) {
      this.doPhaseSetup();
      return;
    }
    
    // Trigger fade
    this.hud.fade(1);
    this.blockInput = true;
    this.nextPhasePending = true;
    this.fadeTimer = 0.6;
  }

  private startComic(): void {
    this.disposeComic();
    const comic = new ComicPlayer(document.body, {
      onCue: (cue) => SoundManager.getInstance().playComicCue(cue),
      onDone: () => {
        if (this.comic === comic) this.comicDone = true;
      }
    });
    this.comic = comic;
    if (this.isPaused) comic.setPaused(true);
  }

  private disposeComic(): void {
    this.comic?.dispose();
    this.comic = null;
    this.comicDone = false;
  }

  private doPhaseSetup(): void {
    const oldPhase = this.phase;
    if (oldPhase === GamePhase.MONTAGE) this.disposeComic();
    switch (this.phase) {
      case GamePhase.TITLE:
        this.phase = GamePhase.MONTAGE;
        document.getElementById('title-screen')?.classList.add('hidden');
        this.startComic();
        break;
      case GamePhase.MONTAGE:
        this.phase = GamePhase.ACT1_INTRO;
        this.phaseTimer = 0;
        this.isPowerOn = true;
        this.house.lightManager.setHouseLightsOn(false); // only lamp and TV
        this.hud.show();
        const clickToPlay = document.getElementById('click-to-play');
        if (clickToPlay) clickToPlay.classList.add('hidden');
        
        this.player.lockPointer();
        this.player.setFrozen(true); // cutscene: camera is scripted
        this.player.setPosition(3.6, 1.1, 8.5); // seated on sofa
        this.narration.triggerBeat('act1_intro');
        this.player.setYaw(Math.PI);
        this.player.setFlashlight(false);
        this.blockInput = true;
        break;
      case GamePhase.ACT1_INTRO:
        this.phase = GamePhase.ACT1_MOVIE;
        this.phaseTimer = 0;
        this.isPowerOn = true;
        this.narration.triggerBeat('act1_movie');
        
        this.player.setFrozen(false);
        this.player.setPosition(4.3, 1.6, 6.5); // clear of the armchair (houseLayout.spawns.player)
        this.player.setYaw(Math.PI);
        this.player.setFlashlight(true);
        
        this.hud.showObjective('Home alone. Storm outside. Stay calm.');
        break;
      case GamePhase.ACT1_MOVIE:
        this.phase = GamePhase.ACT1_BLACKOUT;
        this.phaseTimer = 0;
        this.isPowerOn = false;
        SoundManager.getInstance().playSiren();
        
        this.hud.showObjective('The power is out. Find your flashlight.');
        break;
      case GamePhase.ACT1_BLACKOUT:
        this.phase = GamePhase.ACT1_ARRIVAL;
        this.phaseTimer = 0;
        this.npcManager.spawnParents();
        this.narration.triggerBeat('act1_shadows');
        
        this.hud.showObjective('Something is at the door.');
        break;
      case GamePhase.ACT1_ARRIVAL:
        this.phase = GamePhase.ACT1_SHOOTING;
        this.phaseTimer = 0;
        this.npcManager.killParents();
        if (this.onParentsShot) this.onParentsShot();
        SoundManager.getInstance().playGunshot();
        const bangOverlay = document.getElementById('bang-overlay');
        if (bangOverlay) bangOverlay.classList.remove('hidden');
        
        this.hud.showObjective('Do it.');
        break;
      case GamePhase.ACT1_SHOOTING:
        this.phase = GamePhase.ACT1_POWER_BACK;
        this.phaseTimer = 0;
        this.isPowerOn = true;
        this.blockInput = true;
        this.house.lightManager.setHouseLightsOn(true, { flash: true });
        if (document.getElementById('bang-overlay')) {
          document.getElementById('bang-overlay')!.classList.add('hidden');
        }
        this.narration.triggerBeat('act1_defended');
        break;
      case GamePhase.ACT1_POWER_BACK:
        this.phase = GamePhase.ACT2_COVERUP;
        this.phaseTimer = 0;
        this.isPowerOn = true; // lights are switched off (setPhaseLighting) but the switches work again
        this.blockInput = false;
        this.narration.triggerBeat('act2_coverup');
        
        this.hud.showObjective('Hide the bodies, clean the blood, close the curtains, return the gun to the safe.');
        break;
      case GamePhase.ACT2_COVERUP:
        this.phase = GamePhase.VISITOR_NEIGHBOUR;
        this.phaseTimer = 0;
        this.knockTimer = 0;
        this.visitorGoneTimer = 0;
        this.visitorManager.spawnVisitor(VISITORS.neighbour);
        this.triggerKnock();
        this.narration.triggerBeat('visitor_knocking');
        this.hud.showObjective('Someone is knocking.');
        break;
      case GamePhase.VISITOR_NEIGHBOUR:
        this.phase = GamePhase.VISITOR_OFFICER;
        this.phaseTimer = 0;
        this.knockTimer = 0;
        this.visitorGoneTimer = 0;
        this.visitorManager.spawnVisitor(VISITORS.officer);
        this.triggerKnock();
        this.hud.showObjective('Someone is knocking.');
        break;
      case GamePhase.VISITOR_OFFICER:
        this.phase = GamePhase.VISITOR_PARTNER;
        this.phaseTimer = 0;
        this.knockTimer = 0;
        this.visitorGoneTimer = 0;
        this.visitorManager.spawnVisitor(VISITORS.partner);
        this.triggerKnock();
        this.hud.showObjective('Someone is knocking.');
        break;
      case GamePhase.VISITOR_PARTNER:
        this.phase = GamePhase.FINAL_INSPECTION;
        this.phaseTimer = 0;
        this.checkEnding();
        break;
      case GamePhase.FINAL_INSPECTION:
        this.phase = GamePhase.ENDING;
        break;
      case GamePhase.ENDING:
        break;
    }
    
    // Apply Phase Light & Audio
    if (this.phase >= GamePhase.ACT1_INTRO) {
      if ((this.house.lightManager as any).setPhaseLighting) {
        (this.house.lightManager as any).setPhaseLighting(this.phase);
      }
      const sm = SoundManager.getInstance();
      if ((sm as any).setPhaseAudio) (sm as any).setPhaseAudio(this.phase);
    }
    
    console.log('advancePhase: ' + GamePhase[oldPhase] + ' -> ' + GamePhase[this.phase]);
  }

  private triggerKnock(): void {
    this.knockTimer = 0;
    this.visitorManager.triggerKnock();
    SoundManager.getInstance().playKnock();
  }

  public update(delta: number, flashlightOn: boolean, time: number): void {
    if (this.fadeTimer > 0) {
      this.fadeTimer -= delta;
      if (this.fadeTimer <= 0) {
        if (this.nextPhasePending) {
          this.doPhaseSetup();
          this.nextPhasePending = false;
          if (this.hud && this.hud.fade) this.hud.fade(0);
          if (this.phase !== GamePhase.ACT1_INTRO) this.blockInput = false;
        }
      }
      return;
    }
    if (this.phase === GamePhase.TITLE) return;
    if (this.phase === GamePhase.MONTAGE) {
      if (this.comicDone) {
        this.comicDone = false;
        this.advancePhase(); // -> ACT1_INTRO
      } else {
        this.comic?.update(delta);
      }
      return;
    }
    
    this.phaseTimer += delta;

    // Intro Phase Logic
    if (this.phase === GamePhase.ACT1_INTRO) {
      this.blockInput = true; // force block
      
      const isSpaceHeld = (this.player as any).isSkipHeld ? (this.player as any).isSkipHeld() : false;
      if (isSpaceHeld) {
        this.skipHoldTimer += delta;
        if (this.skipHoldTimer >= 1.0) {
          this.paranoia = 34;
          const skipHint = document.getElementById('skip-hint');
          if (skipHint) skipHint.classList.add('hidden');
          this.advancePhase();
          return;
        }
      } else {
        this.skipHoldTimer = 0;
      }
      
      if (this.phaseTimer >= 2.0 && this.phaseTimer < 23.0) {
        const skipHint = document.getElementById('skip-hint');
        if (skipHint) skipHint.classList.remove('hidden');
      } else {
        const skipHint = document.getElementById('skip-hint');
        if (skipHint) skipHint.classList.add('hidden');
      }

      const t = this.phaseTimer;
      const flags = this.introTimelineFlags;
      const pCamera = this.player.getCamera();
      
      if (t >= 4.0 && !flags.has(4)) {
        flags.add(4);
        this.paranoia = 8;
        SoundManager.getInstance().playThunder(0.8);
        this.house.lightManager.triggerFlicker('lamp_living', 0.5);
        pCamera.rotation.z += 0.05; 
      }
      
      if (t >= 7.0 && !flags.has(7)) {
        flags.add(7);
        this.paranoia = 14;
        const sm = SoundManager.getInstance();
        if ((sm as any).playCreak) (sm as any).playCreak();
      }
      if (t >= 7.0 && t < 10.0) {
        if (t < 8.0) {
          this.player.setYaw(Math.PI + (t - 7.0) * 0.5);
        } else if (t < 9.5) {
          this.player.setYaw(Math.PI + 0.5);
        } else {
          this.player.setYaw(Math.PI + 0.5 - (t - 9.5) * 1.0);
        }
      }
      
      if (t >= 11.0 && !flags.has(11)) {
        flags.add(11);
        this.paranoia = 20;
        const sm = SoundManager.getInstance();
        if ((sm as any).playWindowTap) (sm as any).playWindowTap();
        this.player.setYaw(Math.PI - 0.7); 
      }
      if (t >= 11.0 && t < 14.0) {
        if (t >= 12.0) {
           const frac = Math.min((t - 12.0) / 2.0, 1.0);
           this.player.setYaw(Math.PI - 0.7 * (1.0 - frac));
        }
      }

      if (t >= 15.0 && !flags.has(15)) {
        flags.add(15);
        this.paranoia = 28;
        const sm = SoundManager.getInstance();
        if ((sm as any).playGroan) (sm as any).playGroan();
        if ((this.house.lightManager as any).setTVStatic) (this.house.lightManager as any).setTVStatic(true);
        this.player.setYaw(Math.PI + 0.9);
      }
      if (t >= 16.0 && t < 18.0) {
        if ((this.house.lightManager as any).setTVStatic) (this.house.lightManager as any).setTVStatic(false);
        const frac = Math.min((t - 16.0) / 2.0, 1.0);
        this.player.setYaw(Math.PI + 0.9 * (1.0 - frac));
      }

      if (t >= 19.0 && !flags.has(19)) {
        flags.add(19);
        this.paranoia = 34;
        const sm = SoundManager.getInstance();
        if ((sm as any).playBreath) (sm as any).playBreath();
        if ((sm as any).playNewsWarning) (sm as any).playNewsWarning();
        this.house.lightManager.triggerFlicker('lamp_living', 1.0);
      }

      if (t >= 21.0 && t < 22.5) {
        const frac = (t - 21.0) / 1.5;
        const ease = frac < 0.5 ? 2 * frac * frac : 1 - Math.pow(-2 * frac + 2, 2) / 2;
        this.player.setPosition(3.6, 1.1 + 0.5 * ease, 8.5);
      }

      if (t >= 23.4 && !flags.has(23.4)) {
        flags.add(23.4);
        const skipHint = document.getElementById('skip-hint');
        if (skipHint) skipHint.classList.add('hidden');
        this.advancePhase(); 
      }
    }

    // Lightning System
    if (this.phase >= GamePhase.ACT1_MOVIE && this.phase <= GamePhase.FINAL_INSPECTION) {
      this.lightningTimer -= delta;
      if (this.lightningTimer <= 0) {
        if (!this.isLightning) {
          // Trigger lightning flash
          this.isLightning = true;
          this.lightningTimer = 0.3; // Flash duration
          
          // Add paranoia burst
          this.paranoia = Math.min(100, this.paranoia + 3);
        } else {
          // End lightning flash
          this.isLightning = false;
          this.lightningTimer = 8 + Math.random() * 7; // 8 to 15 seconds
        }
      }
    }
    
    // Paranoia updates: a lit room calms you down, the flashlight only slows the dread
    const playerPos = this.player.getPosition();
    const playerRoomLit = this.isLocationLit(playerPos.x, playerPos.z, this.player.getFloor());
    let paranoiaDelta = 0;
    if (this.phase === GamePhase.ACT1_POWER_BACK || playerRoomLit || this.isLightning) {
      paranoiaDelta = -22 * delta;
    } else {
      paranoiaDelta = (flashlightOn ? 2 : 6) * delta;
      if (this.visitorManager.isVisitorAtDoor()) {
        paranoiaDelta += 10 * delta;
      }
    }
    
    this.paranoia = Math.max(0, Math.min(100, this.paranoia + paranoiaDelta));
    this.hud.updateParanoia(this.paranoia);
    
    if (this.paranoia >= 100 && this.phase >= GamePhase.ACT2_COVERUP && this.phase < GamePhase.ENDING) {
      this.triggerEnding(Endings.calculateEnding(100, this.evidence));
      return;
    }
    
    this.npcManager.update(delta);
    this.visitorManager.updateFigure(delta);
    
    for (const parent of this.npcManager.parents) {
      const root = parent.character.root.position;
      const parentRoomLit = this.isLocationLit(root.x, root.z, root.y >= 1.5 ? 1 : 0);
      parent.character.setZombie(getVisionMode(parent.character, this.paranoia, this.isLightning, parentRoomLit));
    }
    
    const activeFigure = this.visitorManager.getCurrentFigure();
    if (activeFigure) {
      const porchLit = this.house.lightManager.getLight('light_porch')?.isOn || false;
      activeFigure.setZombie(getVisionMode(activeFigure, this.paranoia, this.isLightning, porchLit));
      if (!this.scene.children.includes(activeFigure.root)) {
        this.scene.add(activeFigure.root);
      }
    }

    switch (this.phase) {
      case GamePhase.ACT1_MOVIE:
        if (this.phaseTimer >= 20) {
          this.advancePhase();
        }
        break;
      case GamePhase.ACT1_BLACKOUT:
        // Could be a short pause before they arrive
        if (this.phaseTimer >= 3) {
          this.advancePhase();
        }
        break;
      case GamePhase.ACT1_ARRIVAL:
        // Parents walking in. After 25s, auto-shoot.
        if (this.phaseTimer >= 25) {
          this.advancePhase();
        } else {
          // A parent got within 1.5m (horizontally) before the player fired: panic shot
          const targetPos = this.player.getPosition();
          const inRange = this.npcManager.parents.some(parent => {
            const p = parent.character.root.position;
            return Math.hypot(p.x - targetPos.x, p.z - targetPos.z) <= 1.5;
          });
          if (inRange) {
            this.advancePhase();
          }
        }
        break;
      case GamePhase.ACT1_SHOOTING:
        // Delay before power comes back
        if (this.phaseTimer >= 1.8) {
          this.advancePhase();
        }
        break;
      case GamePhase.ACT1_POWER_BACK:
        if (this.phaseTimer >= 4.0) {
          this.advancePhase();
        }
        break;
      case GamePhase.ACT2_COVERUP:
        if (this.phaseTimer >= COVERUP_DURATION) {
          this.advancePhase();
        }
        break;
      case GamePhase.VISITOR_NEIGHBOUR:
      case GamePhase.VISITOR_OFFICER:
      case GamePhase.VISITOR_PARTNER: {
        if (this.forcedEntryTimer >= 0) {
          this.forcedEntryTimer -= delta;
          if (this.forcedEntryTimer <= 0) {
            this.forcedEntryTimer = -1;
            this.forceEntry();
            return;
          }
          break;
        }
        const visitor = this.visitorManager.getActiveVisitor();
        if (visitor) {
          this.knockTimer += delta;
          if (this.knockTimer >= 11.0) {
            this.triggerKnock();
          }
          if (this.visitorManager.hasRunOutOfPatience()) {
            if (visitor.type === 'neighbour') {
              this.narration.showCaption('"Hmph. Kids these days..." The footsteps faded down the porch.', 4.0);
              this.visitorManager.dismissVisitor();
            } else {
              this.forceEntry();
              return;
            }
          }
        } else {
          // Give the player some time before the next knock
          this.visitorGoneTimer += delta;
          if (this.visitorGoneTimer >= BETWEEN_VISITORS) {
            this.advancePhase();
          }
        }
        break;
      }
    }
  }
  
  private isLocationLit(x: number, z: number, floor: number): boolean {
    if (!this.isPowerOn) return false;
    const room = findRoom(x, z, floor);
    return room !== null && this.house.lightManager.isRoomLit(room.name);
  }

  public getParentRoots(): THREE.Object3D[] {
    return this.npcManager.parents.map(p => p.character.root);
  }

  public hideParentBody(kind: 'mother' | 'father'): void {
    const parent = this.npcManager.getParent(kind);
    if (parent) parent.character.root.visible = false;
  }

  // The visitor stopped listening and pushes inside after a short delay. Counted in game
  // time, so the door doesn't burst open while the game is paused.
  public scheduleForcedEntry(delaySeconds: number): void {
    if (this.phase < GamePhase.VISITOR_NEIGHBOUR || this.phase >= GamePhase.FINAL_INSPECTION) return;
    this.forcedEntryTimer = delaySeconds;
  }

  // A visitor pushes inside: the house gets inspected right now
  public forceEntry(): void {
    this.forcedEntryTimer = -1;
    if (this.phase < GamePhase.VISITOR_NEIGHBOUR || this.phase >= GamePhase.ENDING) return;
    this.visitorManager.dismissVisitor();
    this.phase = GamePhase.FINAL_INSPECTION;
    this.checkEnding();
  }

  // Noise only counts once the cover-up starts: a nervous miss during the Act 1
  // zombie scene happens before anyone is listening and must not cost the CLEAN ending
  public recordNoise(amount: number): void {
    if (this.phase < GamePhase.ACT2_COVERUP || this.phase >= GamePhase.ENDING) return;
    this.evidence.addNoise(amount);
  }

  public handlePlayerAttack(): void {
    if (this.phase === GamePhase.ACT1_ARRIVAL) {
      this.advancePhase(); // Transition to shooting
    }
  }
  
  private checkEnding(): void {
    this.triggerEnding(Endings.calculateEnding(this.paranoia, this.evidence));
  }
  
  public tryRunEnding(): void {
    if (this.phase >= GamePhase.ACT2_COVERUP && this.phase <= GamePhase.VISITOR_PARTNER) {
      // Custom run logic
      const data = Endings.calculateEnding(this.paranoia, this.evidence);
      data.type = 'run';
      data.title = 'ENDING: THE COWARD';
      data.story = 'You fled into the night. It is only a matter of time before they find you.';
      this.triggerEnding(data);
    }
  }

  private triggerEnding(ending: EndingData): void {
    console.log(`triggerEnding called! Paranoia: ${this.paranoia}, Phase: ${GamePhase[this.phase]}`);
    if (this.phase === GamePhase.ENDING) return;
    this.phase = GamePhase.ENDING;
    this.onEndingTriggered(ending);
  }
  
  public getVisitorManager(): VisitorManager {
    return this.visitorManager;
  }
}
