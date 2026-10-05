import * as THREE from 'three';

export class Textures {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  // Create procedural wood floor texture
  public static getWoodFloor(): THREE.CanvasTexture {
    const key = 'wood_floor';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark hardwood base
    ctx.fillStyle = '#2b231d';
    ctx.fillRect(0, 0, 512, 512);

    // Planks
    const plankHeight = 64;
    ctx.strokeStyle = '#15100c';
    ctx.lineWidth = 4;

    for (let y = 0; y < 512; y += plankHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      // Vertical plank seams
      const offset = (y / plankHeight) % 2 === 0 ? 0 : 128;
      for (let x = offset; x < 512; x += 256) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + plankHeight);
        ctx.stroke();
      }
    }

    // Wood grain lines
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 300; i++) {
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(150, y + Math.random() * 6 - 3, 350, y + Math.random() * 6 - 3, 512, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    this.cache.set(key, texture);
    return texture;
  }

  // Create procedural tile floor texture
  public static getTileFloor(): THREE.CanvasTexture {
    const key = 'tile_floor';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e1e24';
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 64;
    ctx.strokeStyle = '#08080c';
    ctx.lineWidth = 6;

    for (let x = 0; x <= 512; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Subtle noise per tile
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        const val = Math.floor(Math.random() * 20 - 10);
        ctx.fillStyle = `rgba(${255 + val}, ${255 + val}, ${255 + val}, 0.03)`;
        ctx.fillRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    this.cache.set(key, texture);
    return texture;
  }

  // Create procedural wallpaper texture
  public static getWallpaper(): THREE.CanvasTexture {
    const key = 'wallpaper';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark moody wallpaper
    ctx.fillStyle = '#22222a';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle vertical stripes
    ctx.fillStyle = '#1a1a22';
    for (let x = 0; x < 512; x += 32) {
      ctx.fillRect(x, 0, 16, 512);
    }

    // Noir halftone noise pattern
    for (let i = 0; i < 2000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(rx, ry, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    this.cache.set(key, texture);
    return texture;
  }

  // Create procedural door texture
  public static getDoorTexture(): THREE.CanvasTexture {
    const key = 'door_tex';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3a2e26';
    ctx.fillRect(0, 0, 256, 512);

    // Door border frame
    ctx.strokeStyle = '#1c1510';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 502);

    // Panels (2 recessed panels)
    ctx.fillStyle = '#2c221b';
    ctx.fillRect(25, 25, 206, 210);
    ctx.fillRect(25, 260, 206, 220);

    ctx.strokeStyle = '#140f0c';
    ctx.lineWidth = 5;
    ctx.strokeRect(25, 25, 206, 210);
    ctx.strokeRect(25, 260, 206, 220);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.cache.set(key, texture);
    return texture;
  }

  // Create blood / evidence stain texture
  public static getBloodStain(): THREE.CanvasTexture {
    const key = 'blood_stain';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 256);

    // Dark crimson puddle
    ctx.fillStyle = '#50050a';
    ctx.beginPath();
    ctx.ellipse(128, 128, 70, 50, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Splatters
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 50;
      const r = 3 + Math.random() * 8;
      ctx.beginPath();
      ctx.arc(128 + Math.cos(angle) * dist, 128 + Math.sin(angle) * dist, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.cache.set(key, texture);
    return texture;
  }

  // Create procedural TV screen displaying zombie movie
    private static tvCanvas: HTMLCanvasElement;
  private static tvCtx: CanvasRenderingContext2D;
  private static tvTexture: THREE.CanvasTexture;

  public static getTVScreenTexture(): THREE.CanvasTexture {
    if (this.tvTexture) return this.tvTexture;
    
    this.tvCanvas = document.createElement('canvas');
    this.tvCanvas.width = 512;
    this.tvCanvas.height = 288;
    this.tvCtx = this.tvCanvas.getContext('2d')!;
    
    this.tvTexture = new THREE.CanvasTexture(this.tvCanvas);
    this.tvTexture.colorSpace = THREE.SRGBColorSpace;
    return this.tvTexture;
  }

  public static updateTVTexture(time: number, isStatic: boolean): number {
    if (!this.tvCtx) return 0; // fallback if not initialized
    const ctx = this.tvCtx;
    const w = 512;
    const h = 288;
    
    if (isStatic || (Math.sin(time * 0.5) > 0.98)) {
      // Full Static
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const val = Math.random() * 255;
        data[i] = val;
        data[i+1] = val;
        data[i+2] = val;
        data[i+3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      this.tvTexture.needsUpdate = true;
      return 0.5; // brightness
    }
    
    // Draw Dark Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);
    
    // Zombies (silhouettes moving slowly)
    const zCount = 5;
    ctx.fillStyle = '#111';
    for(let i = 0; i < zCount; i++) {
        // pseudo random based on id
        const speed = 10 + (i * 7);
        const cycle = (time * speed + i * 200) % 600; 
        const x = cycle - 50; 
        const y = 80 + Math.sin(time * 4 + i) * 5; // shuffling y
        const size = 30 + i * 15;
        
        ctx.beginPath();
        // Head
        ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
        // Body
        ctx.rect(x - size*0.4, y + size*0.4, size*0.8, size*1.5);
        // Arms reaching
        ctx.rect(x + size*0.2, y + size*0.6, size, size*0.2);
        ctx.fill();
    }
    
    // Film Grain & Scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for(let i=0; i<100; i++) {
        ctx.fillRect(Math.random()*w, Math.random()*h, 2, 2);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    const scanlineY = (time * 100) % h;
    ctx.fillRect(0, scanlineY, w, 20);
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
    
    // News Ticker
    const tickerText = "...UNEXPLAINED ATTACKS REPORTED... STAY INDOORS... LOCK YOUR DOORS... ";
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, h - 30, w, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    const textWidth = ctx.measureText(tickerText).width;
    const tickerX = w - ((time * 100) % (textWidth + w));
    ctx.fillText(tickerText, tickerX, h - 8);
    
    this.tvTexture.needsUpdate = true;
    
    // calculate brightness based on screen content (mostly dark + red ticker)
    // roughly constant brightness but flicker on scanline
    return 0.3 + (Math.random() * 0.05); 
  }

}
