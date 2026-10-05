import { Textures } from './Textures';
import { GamePhase } from '../game/GameFlow';
import * as THREE from 'three';
import { SoundManager } from '../audio/SoundManager';
import { lightsLayout, LightDef } from './lightsLayout';
import { houseLayout } from './houseLayout';
import { InteractiveProp } from './Props';

export class LightManager {
  private scene: THREE.Scene;
  
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  
  private lights = new Map<string, {
    def: LightDef,
    isOn: boolean,
    pointLight: THREE.PointLight | null,
    fakeDecal: THREE.Mesh | null,
    emissiveMesh: THREE.Mesh | null,
    flickerPhase: number,
    animIntensity: number
  }>();

  private pointLightPool: THREE.PointLight[] = [];
  
  public debugGizmos = new THREE.Group();
  private gizmosMap = new Map<string, THREE.Mesh>();
  
  private paranoia = 0;
  private time = 0;
  
  private baseAmbient = 0.05;
  private baseHemi = 0.08;
  
  private isFlashing = false;
  private flashStartTime = 0;
  private brightnessScalar = 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Baseline environment
    this.ambientLight = new THREE.AmbientLight(0xffffff, this.baseAmbient);
    this.scene.add(this.ambientLight);
    
    this.hemiLight = new THREE.HemisphereLight(0x223044, 0x0a0a0f, this.baseHemi);
    this.scene.add(this.hemiLight);
    
    this.debugGizmos.visible = false;
    this.scene.add(this.debugGizmos);
    
    // Setup light pool (max 6 active point lights for performance)
    for (let i = 0; i < 6; i++) {
      const p = new THREE.PointLight(0xffffff, 0, 10);
      p.castShadow = false; // No shadows from point lights
      this.scene.add(p);
      this.pointLightPool.push(p);
    }
    
    this.initLights();
    this.initMoonlight();
  }

  private initLights() {
    const decalTex = this.createRadialTexture();
    const decalMat = new THREE.MeshBasicMaterial({ 
      map: decalTex, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.25, depthWrite: false 
    });
    const emitMatTpl = new THREE.MeshBasicMaterial();

    for (const def of lightsLayout) {
      // Fake floor decal
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(def.range * 1.5, def.range * 1.5), decalMat.clone());
      decal.rotation.x = -Math.PI / 2;
      const floorY = def.position.y > 2.0 ? 3.01 : 0.01; // slightly above floor
      decal.position.set(def.position.x, floorY, def.position.z);
      (decal.material as THREE.MeshBasicMaterial).color.setHex(def.color);
      this.scene.add(decal);
      decal.visible = def.defaultOn;
      
      // Emissive bulb
      const emitMat = emitMatTpl.clone();
      emitMat.color.setHex(def.color);
      const em = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), emitMat);
      em.position.copy(def.position);
      this.scene.add(em);
      em.visible = def.defaultOn;
      
      // Debug gizmo
      const gMat = new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true });
      const gizmo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), gMat);
      gizmo.position.copy(def.position);
      this.debugGizmos.add(gizmo);
      this.gizmosMap.set(def.id, gizmo);

      this.lights.set(def.id, {
        def,
        isOn: def.defaultOn,
        pointLight: null,
        fakeDecal: decal,
        emissiveMesh: em,
        flickerPhase: Math.random() * Math.PI * 2,
        animIntensity: def.defaultOn ? def.intensity : 0
      });
    }
  }

  private createRadialTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  private initMoonlight() {
    const tex = this.createRadialTexture();
    const mat = new THREE.MeshBasicMaterial({ 
      map: tex, color: 0x6688aa, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.08, depthWrite: false 
    });
    
    for (const win of houseLayout.windows) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), mat);
      plane.rotation.x = -Math.PI / 2;
      const y = win.floor === 1 ? 3.01 : 0.01;
      
      const pos = new THREE.Vector3(win.x, y, win.z);
      if (win.normal) {
        pos.add(win.normal.clone().multiplyScalar(0.05));
      }
      
      plane.position.copy(pos);
      
      if (win.axis === 'z') plane.scale.set(0.6, 1.2, 1);
      else plane.scale.set(1.2, 0.6, 1);
      
      this.scene.add(plane);
    }
  }
  
  public getSwitches(): InteractiveProp[] {
    const switches: InteractiveProp[] = [];
    const mat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
    const geo = new THREE.BoxGeometry(0.1, 0.15, 0.02);
    
    for (const def of lightsLayout) {
      if ((def.type === 'ceiling' || def.type === 'porch') && def.switchPosition && def.switchNormal) {
        const mesh = new THREE.Mesh(geo, mat);
        
        const finalPos = def.switchPosition.clone().add(def.switchNormal.clone().multiplyScalar(0.02));
        finalPos.y = def.switchPosition.y; // Ensure y is preserved (1.3 or 4.3)
        mesh.position.copy(finalPos);
        
        // Orient flat on wall facing inward
        const targetPoint = finalPos.clone().add(def.switchNormal);
        mesh.lookAt(targetPoint);
        
        this.scene.add(mesh);
        
        switches.push({
          id: 'switch_' + def.id,
          name: 'Switch',
          mesh,
          interactionType: 'switch',
          position: finalPos,
          targetLightId: def.id
        } as any);
      }
    }
    return switches;
  }

    // REPLACED
    public triggerFlicker(id: string, intensity: number): void {
    const state = this.lights.get(id);
    if (state && state.pointLight) {
      state.animIntensity = Math.random() * intensity;
      state.pointLight.intensity = state.animIntensity;
    }
  }

  public setPhaseLighting_OLD(phase: number): void {
    if (phase === GamePhase.ACT1_MOVIE) { // ACT1_MOVIE
      this.setHouseLightsOn(false);
      const lamp = this.lights.get('lamp_living');
      if (lamp) lamp.isOn = true;
      const tv = this.lights.get('tv');
      if (tv) tv.isOn = true;
    } else if (phase === GamePhase.ACT1_BLACKOUT || phase === GamePhase.ACT2_COVERUP) { // BLACKOUT or COVERUP
      this.setHouseLightsOn(false);
      const tv = this.lights.get('tv');
      if (tv) tv.isOn = false;
    } else if (phase === GamePhase.ACT1_POWER_BACK) { // POWER_BACK
      this.setHouseLightsOn(true);
      const tv = this.lights.get('tv');
      if (tv) tv.isOn = false;
    }
  }
  public setPhaseLighting(phase: number): void {
    if (phase === GamePhase.ACT1_MOVIE) { // ACT1_MOVIE
      this.setHouseLightsOn(false);
      const lamp = this.lights.get('lamp_living');
      if (lamp) lamp.isOn = true;
      const tv = this.lights.get('tv');
      if (tv) tv.isOn = true;
      this.hemiLight.color.setHex(0x223044); // cold outside, warm inside (handled by lights)
    } else if (phase === GamePhase.ACT1_BLACKOUT || phase === GamePhase.ACT2_COVERUP) { // BLACKOUT or COVERUP
      this.setHouseLightsOn(false);
      const tv = this.lights.get('tv');
      if (tv) tv.isOn = false;
      this.hemiLight.color.setHex(0x182535); // colder
    } else if (phase === GamePhase.ACT1_POWER_BACK) { // POWER_BACK
      this.setHouseLightsOn(true);
      const tv = this.lights.get('tv');
      if (tv) tv.isOn = false;
      this.hemiLight.color.setHex(0x333333); // normal warm
    }
    
    // Print the light list
    const onLights = [];
    for (const [id, state] of this.lights.entries()) {
      if (state.isOn) onLights.push(id);
    }
    console.log('Phase ' + phase + ' Lights ON: ' + onLights.join(', '));
  }
  public setHouseLightsOn(on: boolean, opts: { flash?: boolean } = {}) {
    for (const [id, state] of this.lights.entries()) {
      if (state.def.type === 'ceiling' || state.def.type === 'lamp') {
        state.isOn = on;
      }
    }
    
    if (on && opts.flash) {
      this.isFlashing = true;
      this.flashStartTime = performance.now();
      const el = document.getElementById('flash-overlay');
      if (el) {
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.backgroundColor = 'white';
        setTimeout(() => {
          el.style.transition = 'opacity 0.4s ease-out';
          el.style.opacity = '0';
        }, 50);
      }
    }
    SoundManager.getInstance().playLampClick();
  }
  public getLight(id: string) {
    return this.lights.get(id);
  }

  public toggleLight(id: string): boolean {
    const state = this.lights.get(id);
    if (!state) return false;
    state.isOn = !state.isOn;
    SoundManager.getInstance().playLampClick();
    return true;
  }

  public setBrightness(val: number) {
    this.brightnessScalar = val;
  }

  public toggleAllLights() {
    let anyOn = false;
    for (const state of this.lights.values()) {
      if (state.isOn) anyOn = true;
    }
    this.setHouseLightsOn(!anyOn);
  }

  public getActiveCount(): number {
    return this.pointLightPool.filter(p => p.intensity > 0).length;
  }

  public update(delta: number, paranoia: number, playerPos: THREE.Vector3) {
    this.time += delta;
    this.paranoia = paranoia;
    
    // Ambient dimming & color shift above 70 paranoia
    let base = this.baseAmbient * this.brightnessScalar;
    if (this.paranoia >= 70) {
      const f = Math.min((this.paranoia - 70) / 30.0, 1.0);
      this.ambientLight.intensity = base * (1 - 0.3 * f);
      // shift hemi slightly colder
      this.hemiLight.color.setHex(0x182535); 
    } else {
      this.ambientLight.intensity = base;
      this.hemiLight.color.setHex(0x223044);
    }
    
    // Calculate allowed lights (top 6 closest ON lights)
    const onLights = Array.from(this.lights.values())
      .filter(l => l.isOn)
      .map(l => ({ l, dist: l.def.position.distanceToSquared(playerPos) }))
      .sort((a, b) => a.dist - b.dist);
      
    const allowedOnLights = new Set(onLights.slice(0, 6).map(x => x.l.def.id));

    // Update all lights
    for (const state of this.lights.values()) {
      let target = (state.isOn && allowedOnLights.has(state.def.id)) ? state.def.intensity : 0;
      
      if (target > 0) {
        if (state.def.type === 'tv') {
          const hz = this.paranoia >= 70 ? 12 : 8;
          const noise = Math.sin(this.time * hz + state.flickerPhase) * 0.4;
            
            // Update TV Screen Canvas
            const isStatic = (this as any).tvStatic === true;
            const screenBrightness = Textures.updateTVTexture(this.time, isStatic);
            
            // Apply brightness to the point light
            state.animIntensity = screenBrightness * state.def.intensity;

          target = state.def.intensity * (1.0 + noise);
        } else if (this.paranoia >= 70) {
          if (Math.random() < 0.05) {
            target = state.def.intensity * (0.4 + Math.random() * 0.6);
          }
        }
      }
      
      // Smooth fade
      state.animIntensity += (target - state.animIntensity) * Math.min(delta * 10.0, 1.0);
      if (state.animIntensity < 0.001) state.animIntensity = 0;
      
      const safeIntensity = Math.max(state.def.intensity, 0.0001);

      if (state.fakeDecal) {
        state.fakeDecal.visible = state.animIntensity > 0.05;
        (state.fakeDecal.material as THREE.MeshBasicMaterial).opacity = (state.animIntensity / safeIntensity) * 0.25;
      }
      if (state.emissiveMesh) {
        state.emissiveMesh.visible = state.animIntensity > 0.05;
        (state.emissiveMesh.material as THREE.MeshBasicMaterial).color.setHex(state.def.color).multiplyScalar(state.animIntensity);
      }
      
      // Release point light if fully faded
      if (state.animIntensity === 0 && state.pointLight) {
        state.pointLight.intensity = 0;
        (state.pointLight as any)._assignedId = null;
        state.pointLight = null;
      }
    }
    
    // Assign free point lights to allowed lights that don't have one
    const availablePool = this.pointLightPool.filter(p => !(p as any)._assignedId);
    
    for (const item of onLights) {
      if (allowedOnLights.has(item.l.def.id) && !item.l.pointLight) {
        if (availablePool.length > 0) {
          const p = availablePool.shift()!;
          item.l.pointLight = p;
          (p as any)._assignedId = item.l.def.id;
          p.position.copy(item.l.def.position);
          p.color.setHex(item.l.def.color);
          p.distance = item.l.def.range;
        }
      }
    }

    // Update assigned point lights
    for (const state of this.lights.values()) {
      if (state.pointLight) {
        state.pointLight.intensity = state.animIntensity;
      }
    }
    
    // Turn off unused pool lights smoothly
    for (const p of this.pointLightPool) {
      if (!(p as any)._matched) {
        p.intensity *= (1.0 - Math.min(delta * 5.0, 1.0));
        if (p.intensity < 0.01) p.intensity = 0;
      }
    }
    
    // Update Gizmos
    if (this.debugGizmos.visible) {
      for (const [id, state] of this.lights.entries()) {
        const g = this.gizmosMap.get(id);
        if (g) {
          if (state.pointLight) (g.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00);
          else if (state.animIntensity > 0.05) (g.material as THREE.MeshBasicMaterial).color.setHex(0xffa500);
          else (g.material as THREE.MeshBasicMaterial).color.setHex(0x444444);
        }
      }
    }
  }
}
