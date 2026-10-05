
import { pages, ComicPageDef, ComicPanelDef } from './comicPanels';
import { SoundManager } from '../audio/SoundManager';

export class ComicPlayer {
        private pageIndex = 0;
    private panelIndex = 0;
    private onComplete: (startingParanoia: number) => void;
    private timer = 0;
    private isPlaying = false;
    private skipHoldTimer = 0;
    
    // UI elements
    private panelContainer: HTMLElement;
    private overlay: HTMLElement;
    
    private boundKeyDown: (e: KeyboardEvent) => void;
    private boundKeyUp: (e: KeyboardEvent) => void;
    private boundClick: () => void;
    
    private keysHeld = new Set<string>();
    private timeLastFrame = 0;
    private rafId = 0;

    constructor(onComplete: (paranoia: number) => void) {
        this.onComplete = onComplete;
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'comic-overlay overlay';
        this.overlay.style.backgroundColor = '#111';
        this.overlay.style.zIndex = '9500';
        this.overlay.style.display = 'flex';
        this.overlay.style.flexDirection = 'column';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.justifyContent = 'center';
        
        this.panelContainer = document.createElement('div');
        this.panelContainer.className = 'comic-page';
        this.panelContainer.style.display = 'flex';
        this.panelContainer.style.flexWrap = 'wrap';
        this.panelContainer.style.gap = '20px';
        this.panelContainer.style.width = '90vw';
        this.panelContainer.style.maxWidth = '1000px';
        this.panelContainer.style.height = '80vh';
        this.panelContainer.style.justifyContent = 'center';
        this.panelContainer.style.alignItems = 'center';
        
        this.overlay.appendChild(this.panelContainer);
        document.body.appendChild(this.overlay);

        // Add a style tag for animations
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes slam {
                0% { transform: scale(1.15) rotate(5deg); opacity: 0; }
                50% { transform: scale(0.98) rotate(-2deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes pop {
                0% { transform: scale(0); }
                80% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            @keyframes punch {
                0% { transform: scale(0); opacity: 1; }
                20% { transform: scale(1.5); opacity: 1; }
                100% { transform: scale(2); opacity: 0; }
            }
            @keyframes kenz-zoom-in { from { transform: scale(1); } to { transform: scale(1.1); } }
            @keyframes kenz-zoom-out { from { transform: scale(1.1); } to { transform: scale(1); } }
            @keyframes kenz-pan-left { from { transform: translateX(0); } to { transform: translateX(-5%); } }
            @keyframes kenz-pan-right { from { transform: translateX(-5%); } to { transform: translateX(0); } }
            @keyframes kenz-pan-down { from { transform: translateY(0); } to { transform: translateY(5%); } }
            
            .comic-panel-frame {
                position: relative;
                border: 6px solid #111;
                background: #f4f4f0;
                overflow: hidden;
                box-shadow: 8px 8px 0px rgba(0,0,0,0.8);
                animation: slam 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                opacity: 0;
            }
            .comic-panel-svg {
                width: 100%;
                height: 100%;
            }
            .comic-caption {
                position: absolute;
                top: 10px;
                left: 10px;
                background: #ffd700;
                border: 3px solid #111;
                padding: 5px 10px;
                font-family: 'Courier Prime', monospace;
                font-weight: bold;
                font-size: 16px;
                color: #111;
                max-width: 80%;
                box-shadow: 4px 4px 0 #111;
            }
            .comic-bubble {
                position: absolute;
                background: #fff;
                border: 3px solid #111;
                border-radius: 50%;
                padding: 10px 15px;
                font-family: 'Courier Prime', monospace;
                font-size: 14px;
                color: #111;
                text-align: center;
                animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            .comic-sfx {
                position: absolute;
                font-family: 'Bangers', sans-serif;
                font-size: 48px;
                font-style: italic;
                text-shadow: 3px 3px 0 #111;
                animation: punch 1s forwards;
            }
            .comic-skip-hint {
                position: absolute;
                bottom: 20px;
                right: 20px;
                font-family: 'Special Elite', monospace;
                color: #fff;
                font-size: 18px;
                opacity: 0.7;
            }
        `;
        document.head.appendChild(style);

        this.boundKeyDown = this.onKeyDown.bind(this);
        this.boundKeyUp = this.onKeyUp.bind(this);
        this.boundClick = this.advance.bind(this);
    }

    public start(): void {
        this.isPlaying = true;
        this.pageIndex = 0;
        this.panelIndex = 0;
        this.timer = 0;
        
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        window.addEventListener('click', this.boundClick);
        
        
        this.renderPage();
    }
    
    private onKeyDown(e: KeyboardEvent) {
        this.keysHeld.add(e.code);
        if (e.code === 'Space' && !e.repeat) {
            this.advance();
        }
    }
    
    private onKeyUp(e: KeyboardEvent) {
        this.keysHeld.delete(e.code);
        if (e.code === 'Enter') {
            // Check if it was a quick tap vs hold
            if (this.skipHoldTimer < 1.0) {
                this.advance();
            }
        }
    }

    private advance(): void {
        if (!this.isPlaying) return;
        
        const page = pages[this.pageIndex];
        if (this.panelIndex < page.panels.length - 1) {
            this.panelIndex++;
            this.timer = 0;
            this.showPanel(page.panels[this.panelIndex]);
        } else {
            // Next page
            this.pageIndex++;
            this.panelIndex = 0;
            this.timer = 0;
            if (this.pageIndex >= pages.length) {
                this.finish();
            } else {
                this.renderPage();
            }
        }
    }

    private renderPage(): void {
        this.panelContainer.innerHTML = ''; // clear
        const page = pages[this.pageIndex];
        this.showPanel(page.panels[this.panelIndex]);
    }

    private showPanel(def: ComicPanelDef): void {
        const frame = document.createElement('div');
        frame.className = 'comic-panel-frame';
        
        // Randomize slight rotation for comic feel (-2 to 2 deg)
        const rot = (Math.random() - 0.5) * 4;
        frame.style.transform = `rotate(${rot}deg)`;
        
        // Calculate size based on number of panels
        const page = pages[this.pageIndex];
        const numPanels = page.panels.length;
        if (numPanels === 1) {
            frame.style.width = '100%';
            frame.style.height = '100%';
        } else if (numPanels === 2) {
            frame.style.width = '45%';
            frame.style.height = '100%';
        } else {
            // 3 panels
            if (this.panelIndex === 0) {
                frame.style.width = '100%';
                frame.style.height = '45%';
            } else {
                frame.style.width = '45%';
                frame.style.height = '45%';
            }
        }

        // Inner container for camera motion
        const inner = document.createElement('div');
        inner.style.width = '100%';
        inner.style.height = '100%';
        const durStr = (def.duration || 5) + 's';
        if (def.cameraMotion === 'zoom-in') inner.style.animation = `kenz-zoom-in ${durStr} linear forwards`;
        if (def.cameraMotion === 'zoom-out') inner.style.animation = `kenz-zoom-out ${durStr} linear forwards`;
        if (def.cameraMotion === 'pan-left') inner.style.animation = `kenz-pan-left ${durStr} linear forwards`;
        if (def.cameraMotion === 'pan-right') inner.style.animation = `kenz-pan-right ${durStr} linear forwards`;
        if (def.cameraMotion === 'pan-down') inner.style.animation = `kenz-pan-down ${durStr} linear forwards`;

        // SVG
        const svgStr = `<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" class="comic-panel-svg">
            <filter id="paper-${def.id}">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.1 0" in="noise" result="coloredNoise" />
                <feBlend in="SourceGraphic" in2="coloredNoise" mode="multiply" />
            </filter>
            <g filter="url(#paper-${def.id})">
                ${def.svgContent()}
            </g>
        </svg>`;
        inner.innerHTML = svgStr;
        frame.appendChild(inner);

        // Caption (typewriter effect)
        if (def.caption) {
            const cap = document.createElement('div');
            cap.className = 'comic-caption';
            frame.appendChild(cap);
            let charIdx = 0;
            const text = def.caption;
            const typeInterval = setInterval(() => {
                if (charIdx < text.length && this.isPlaying) {
                    // textContent, not innerText: innerText drops the trailing space on every read
                    cap.textContent += text[charIdx];
                    charIdx++;
                } else {
                    clearInterval(typeInterval);
                }
            }, 30);
        }

        // Bubbles
        if (def.bubbles) {
            def.bubbles.forEach((b, i) => {
                setTimeout(() => {
                    if (!this.isPlaying) return;
                    const bub = document.createElement('div');
                    bub.className = 'comic-bubble';
                    bub.innerText = b.text;
                    bub.style.left = b.x;
                    bub.style.top = b.y;
                    frame.appendChild(bub);
                }, 500 + i * 800);
            });
        }

        // SFX
        if (def.sfx) {
            setTimeout(() => {
                if (!this.isPlaying) return;
                const sfx = document.createElement('div');
                sfx.className = 'comic-sfx';
                sfx.innerText = def.sfx!.text;
                sfx.style.left = def.sfx!.x;
                sfx.style.top = def.sfx!.y;
                sfx.style.color = def.sfx!.color || '#fff';
                frame.appendChild(sfx);
            }, 300);
        }

        this.panelContainer.appendChild(frame);

        // Sound Event
        if (def.soundEvent) {
            const sm = SoundManager.getInstance();
            if (def.soundEvent === 'thunder') sm.playThunder(0.8);
            if (def.soundEvent === 'creak') sm.playCreak();
            if (def.soundEvent === 'click') (sm as any).playClick ? (sm as any).playClick() : sm.playKnock(); // fallback to knock if click not exist
            if (def.soundEvent === 'tv') sm.playGroan(); // fallback
            if (def.soundEvent === 'heartbeat') sm.updateHeartbeat(60);
        }
    }

    public update(delta: number): void {
        if (!this.isPlaying) return;
        
        // Timer for auto-advance
        this.timer += delta;
        const page = pages[this.pageIndex];
        const panel = page.panels[this.panelIndex];
        const dur = panel.duration || 5;
        
        if (this.timer >= dur) {
            this.advance();
        }

        // Check hold to skip
        if (this.keysHeld.has('Enter')) {
            this.skipHoldTimer += delta;
            if (this.skipHoldTimer >= 1.0) {
                this.finish();
                return;
            }
        } else {
            this.skipHoldTimer = 0;
        }

        // Show skip hint
        let skipHint = document.getElementById('montage-skip-hint');
        if (!skipHint) {
            skipHint = document.createElement('div');
            skipHint.id = 'montage-skip-hint';
            skipHint.className = 'comic-skip-hint';
            skipHint.innerText = 'Hold ENTER to skip';
            this.overlay.appendChild(skipHint);
        }
        
        // total time checking (rough)
        skipHint.style.display = 'block';

    }

    private finish(): void {
        if (!this.isPlaying) return;
        this.isPlaying = false;

        
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        window.removeEventListener('click', this.boundClick);
        
        // Clean up
        this.overlay.remove();
        
        const sm = SoundManager.getInstance();
        sm.updateHeartbeat(0);
        
        // We set paranoia to 0 since intro will take over
        this.onComplete(0);
    }
}
