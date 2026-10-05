import * as THREE from 'three';
import { HalftoneShader } from './HalftoneShader';

export class PostProcessing {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  private renderTarget: THREE.WebGLRenderTarget;
  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;
  private postMaterial: THREE.ShaderMaterial;
  private postQuad: THREE.Mesh;

  private enabled = true;
  private quality: 'low' | 'medium' | 'high' = 'medium';

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Render target for initial 3D scene pass
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    // Orthographic quad for full-screen post-processing shader
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(HalftoneShader.uniforms),
      vertexShader: HalftoneShader.vertexShader,
      fragmentShader: HalftoneShader.fragmentShader
    });

    this.postMaterial.uniforms['tDiffuse'].value = this.renderTarget.texture;
    (this.postMaterial.uniforms['uResolution'].value as THREE.Vector2).set(width, height);

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.postQuad = new THREE.Mesh(quadGeo, this.postMaterial);
    this.postScene.add(this.postQuad);

    window.addEventListener('resize', this.onResize);
  }

  public setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.quality = quality;
    if (quality === 'low') {
      this.postMaterial.uniforms['uQuality'].value = 0.0;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    } else if (quality === 'medium') {
      this.postMaterial.uniforms['uQuality'].value = 1.0;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    } else {
      this.postMaterial.uniforms['uQuality'].value = 1.0;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderTarget.setSize(width, height);
    (this.postMaterial.uniforms['uResolution'].value as THREE.Vector2).set(width, height);
  };

  public render(time: number): void {
    if (!this.enabled || this.quality === 'low') {
      // Direct render for max performance on low quality
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Render main 3D scene to offscreen texture
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // 2. Render post-processing shader quad to screen
    this.postMaterial.uniforms['uTime'].value = time;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }

  // Brightness setting: scales the post shader input, and the exposure of the direct (low quality) path
  public setBrightness(value: number): void {
    this.postMaterial.uniforms['uBrightness'].value = value;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = value;
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderTarget.dispose();
    this.postMaterial.dispose();
    this.postQuad.geometry.dispose();
  }
}
