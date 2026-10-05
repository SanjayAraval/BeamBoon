
export interface ComicPanelDef {
    id: string;
    svgContent: () => string;
    caption?: string;
    bubbles?: { text: string, x: string, y: string, tailX: string, tailY: string }[];
    sfx?: { text: string, x: string, y: string, color?: string };
    duration?: number;
    soundEvent?: 'thunder' | 'creak' | 'tv' | 'click' | 'heartbeat';
    cameraMotion?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-down';
}

export interface ComicPageDef {
    id: string;
    panels: ComicPanelDef[];
}

const yellow = '#ffd700';
const ink = '#111';

// Reusable SVG parts
const svgDefs = `
  <defs>
    <pattern id="halftone" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="${ink}" opacity="0.4"/>
    </pattern>
    <pattern id="hatching" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="10" stroke="${ink}" stroke-width="2" />
    </pattern>
    <filter id="paper-texture" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.1 0" in="noise" result="coloredNoise" />
      <feBlend in="SourceGraphic" in2="coloredNoise" mode="multiply" />
    </filter>
  </defs>
`;

function renderKid(age: number, x: number, y: number, scale: number = 1, back: boolean = false): string {
    const height = age === 6 ? 60 : age === 10 ? 80 : age === 14 ? 100 : 120;
    const face = back ? '' : `<circle cx="0" cy="-20" r="15" fill="#fff" stroke="${ink}" stroke-width="3"/>
                            <circle cx="-5" cy="-22" r="2" fill="${ink}"/>
                            <circle cx="5" cy="-22" r="2" fill="${ink}"/>
                            `;
    const hair = `<path d="M -18 -25 Q 0 -45 18 -25 Q 10 -40 0 -40 Q -10 -40 -18 -25 Z" fill="${ink}"/>`;
    const body = `<path d="M -15 0 L 15 0 L 10 ${height} L -10 ${height} Z" fill="url(#halftone)" stroke="${ink}" stroke-width="3"/>`;
    
    return `<g transform="translate(${x}, ${y}) scale(${scale})">
        ${body}
        ${face}
        ${hair}
    </g>`;
}

function renderDad(x: number, y: number, scale: number = 1): string {
    return `<g transform="translate(${x}, ${y}) scale(${scale})">
        <!-- Body (belly) -->
        <path d="M -25 0 Q -40 60 -20 120 L 20 120 Q 25 60 25 0 Z" fill="#fff" stroke="${ink}" stroke-width="4"/>
        <!-- Badge -->
        <polygon points="-10,20 0,35 10,20" fill="${yellow}" stroke="${ink}" stroke-width="2"/>
        <!-- Head -->
        <circle cx="0" cy="-30" r="20" fill="#fff" stroke="${ink}" stroke-width="3"/>
        <!-- Mustache -->
        <path d="M -10 -25 Q 0 -35 10 -25 Q 5 -20 -5 -20 Z" fill="${ink}"/>
        <!-- Cap -->
        <path d="M -25 -40 L 25 -40 L 15 -60 L -15 -60 Z" fill="${ink}"/>
        <path d="M -25 -40 Q -35 -40 -35 -35 Q -10 -35 0 -40" fill="${ink}"/>
    </g>`;
}

function renderMom(x: number, y: number, scale: number = 1): string {
    return `<g transform="translate(${x}, ${y}) scale(${scale})">
        <!-- Dress -->
        <path d="M -15 0 L 15 0 L 25 110 L -25 110 Z" fill="url(#hatching)" stroke="${ink}" stroke-width="3"/>
        <!-- Head -->
        <circle cx="0" cy="-25" r="18" fill="#fff" stroke="${ink}" stroke-width="3"/>
        <!-- Big Hair -->
        <path d="M -22 -20 Q -35 -50 0 -55 Q 35 -50 22 -20 Q 25 -5 15 -10 Q 0 -25 -15 -10 Q -25 -5 -22 -20 Z" fill="${ink}"/>
    </g>`;
}

export const pages: ComicPageDef[] = [
    {
        id: 'page1',
        panels: [
            {
                id: 'p1',
                caption: "Age six. Every shadow had teeth.",
                sfx: { text: "BOOM", x: "70%", y: "20%", color: yellow },
                soundEvent: "thunder",
                cameraMotion: "zoom-in",
                duration: 5,
                svgContent: () => `
                    <rect width="100%" height="100%" fill="#fff"/>
                    ${svgDefs}
                    <!-- Window with lightning -->
                    <rect x="60%" y="10%" width="30%" height="50%" fill="${yellow}" stroke="${ink}" stroke-width="6"/>
                    <line x1="75%" y1="10%" x2="75%" y2="60%" stroke="${ink}" stroke-width="4"/>
                    <line x1="60%" y1="35%" x2="90%" y2="35%" stroke="${ink}" stroke-width="4"/>
                    <!-- Shadow Claw -->
                    <path d="M 0 100 Q 150 120 200 40 L 180 150 Q 250 180 300 120 L 220 200 Q 300 250 280 300 L 0 350 Z" fill="${ink}" opacity="0.9"/>
                    <!-- Kid in bed -->
                    <path d="M 20 80 Q 80 80 100 120 L 20 120 Z" fill="#fff" stroke="${ink}" stroke-width="4"/>
                    <circle cx="70" cy="90" r="15" fill="#fff" stroke="${ink}" stroke-width="3"/>
                    <circle cx="75" cy="85" r="2" fill="${ink}"/>
                `
            },
            {
                id: 'p2',
                caption: "Dad always brought the job home.",
                bubbles: [{ text: "...and that's why we ALWAYS lock the door.", x: "30%", y: "20%", tailX: "60%", tailY: "40%" }],
                cameraMotion: "pan-right",
                svgContent: () => `
                    <rect width="100%" height="100%" fill="#fff"/>
                    ${svgDefs}
                    <!-- Kitchen Table -->
                    <rect x="10%" y="70%" width="80%" height="5%" fill="url(#halftone)" stroke="${ink}" stroke-width="4"/>
                    <rect x="20%" y="75%" width="5%" height="25%" fill="#fff" stroke="${ink}" stroke-width="4"/>
                    <rect x="75%" y="75%" width="5%" height="25%" fill="#fff" stroke="${ink}" stroke-width="4"/>
                    ${renderDad(250, 150, 1.2)}
                    ${renderKid(6, 80, 200, 1)}
                `
            }
        ]
    },
    {
        id: 'page2',
        panels: [
            {
                id: 'p3',
                caption: "Mom and Dad drank to forget the day.",
                bubbles: [
                    { text: "...are you okay?", x: "15%", y: "15%", tailX: "10%", tailY: "35%" },
                    { text: "Go to bed, sweetie.", x: "65%", y: "20%", tailX: "50%", tailY: "50%" }
                ],
                soundEvent: "tv",
                cameraMotion: "zoom-out",
                svgContent: () => `
                    <rect width="100%" height="100%" fill="#111"/>
                    ${svgDefs}
                    <!-- TV Glow -->
                    <ellipse cx="60%" cy="50%" rx="30%" ry="40%" fill="${yellow}" opacity="0.15"/>
                    <rect x="80%" y="40%" width="15%" height="25%" fill="#fff" stroke="${ink}" stroke-width="4"/>
                    <!-- Couch -->
                    <path d="M 120 180 L 350 180 L 370 250 L 100 250 Z" fill="url(#hatching)" stroke="#333" stroke-width="4"/>
                    ${renderMom(200, 170, 0.9)}
                    ${renderDad(280, 150, 0.9)}
                    <!-- Stairs railing -->
                    <g stroke="${ink}" stroke-width="8">
                        <line x1="0" y1="0" x2="100" y2="300"/>
                        <line x1="30" y1="0" x2="30" y2="300"/>
                        <line x1="70" y1="0" x2="70" y2="300"/>
                    </g>
                    ${renderKid(6, 40, 120, 0.8)}
                `
            },
            {
                id: 'p4',
                caption: "He checked the locks. Then he checked them again.",
                soundEvent: "click",
                cameraMotion: "zoom-in",
                svgContent: () => `
                    <rect width="100%" height="100%" fill="#fff"/>
                    ${svgDefs}
                    <!-- Door -->
                    <rect x="20%" y="10%" width="50%" height="90%" fill="#eee" stroke="${ink}" stroke-width="6"/>
                    <circle cx="28%" cy="50%" r="5%" fill="#fff" stroke="${ink}" stroke-width="4"/>
                    <rect x="25%" y="60%" width="8%" height="3%" fill="#fff" stroke="${ink}" stroke-width="4"/>
                    <rect x="26%" y="40%" width="2%" height="10%" fill="${yellow}" stroke="${ink}" stroke-width="2"/> <!-- Chain -->
                    ${renderKid(10, 200, 180, 1.2, true)}
                `
            }
        ]
    },
    {
        id: 'page3',
        panels: [
            {
                id: 'p5',
                sfx: { text: "CLICK", x: "10%", y: "80%", color: yellow },
                bubbles: [{ text: "Never touch this. Ever.", x: "40%", y: "15%", tailX: "60%", tailY: "40%" }],
                soundEvent: "click",
                cameraMotion: "pan-down",
                svgContent: () => `
                    <rect width="100%" height="100%" fill="#111"/>
                    ${svgDefs}
                    <rect x="40%" y="0" width="60%" height="100%" fill="#fff"/>
                    <rect x="40%" y="30%" width="60%" height="5%" fill="url(#hatching)" stroke="${ink}" stroke-width="4"/>
                    <!-- Gun Box -->
                    <rect x="50%" y="20%" width="30%" height="10%" fill="#333" stroke="${ink}" stroke-width="4"/>
                    <!-- Dad Hand -->
                    <path d="M 100 300 Q 200 150 250 80 L 280 70 Q 250 150 150 350 Z" fill="#fff" stroke="${ink}" stroke-width="4"/>
                    <!-- Eye -->
                    <circle cx="20%" cy="50%" r="15" fill="#fff" stroke="${ink}" stroke-width="3"/>
                    <circle cx="20%" cy="50%" r="5" fill="${ink}"/>
                `
            },
            {
                id: 'p6',
                caption: "The more he watched, the more he saw.",
                soundEvent: "tv",
                cameraMotion: "zoom-in",
                svgContent: () => `
                    <rect width="100%" height="100%" fill="#0a0a0a"/>
                    ${svgDefs}
                    <!-- TV Glow -->
                    <polygon points="0,0 400,100 400,200 0,300" fill="${yellow}" opacity="0.2"/>
                    ${renderKid(14, 200, 160, 1.2)}
                    <!-- Popcorn -->
                    <circle cx="250" cy="250" r="20" fill="#fff" stroke="${ink}" stroke-width="3"/>
                    <circle cx="260" cy="260" r="8" fill="#fff" stroke="${ink}" stroke-width="2"/>
                    <circle cx="240" cy="270" r="6" fill="#fff" stroke="${ink}" stroke-width="2"/>
                    <circle cx="280" cy="250" r="5" fill="#fff" stroke="${ink}" stroke-width="2"/>
                `
            }
        ]
    },
    {
        id: 'page4',
        panels: [
            {
                id: 'p7',
                caption: "Even the neighbours looked wrong.",
                soundEvent: "creak",
                cameraMotion: "zoom-out",
                svgContent: () => `
                    <rect width="100%" height="100%" fill="#fff"/>
                    ${svgDefs}
                    <!-- Peephole -->
                    <circle cx="50%" cy="50%" r="40%" fill="none" stroke="${ink}" stroke-width="15"/>
                    <circle cx="50%" cy="50%" r="39%" fill="url(#halftone)"/>
                    <!-- Neighbour Distorted -->
                    <path d="M 180 300 Q 200 150 250 150 Q 300 150 250 300 Z" fill="#fff" stroke="${ink}" stroke-width="5"/>
                    <circle cx="230" cy="160" r="8" fill="${ink}"/>
                    <circle cx="270" cy="160" r="12" fill="${ink}"/>
                    <!-- Trash bag -->
                    <path d="M 280 200 Q 350 250 320 350 L 250 350 Z" fill="#333" stroke="${ink}" stroke-width="4"/>
                    <!-- Scribbles -->
                    <path d="M 20 20 L 80 40 L 30 60 L 90 80" fill="none" stroke="${ink}" stroke-width="3"/>
                    <path d="M 380 280 L 320 250 L 360 220 L 310 190" fill="none" stroke="${ink}" stroke-width="3"/>
                `
            },
            {
                id: 'p8',
                caption: "Tonight, the storm came early.",
                soundEvent: "thunder",
                cameraMotion: "pan-left",
                svgContent: () => `
                    <rect width="100%" height="100%" fill="#111"/>
                    ${svgDefs}
                    <!-- Phone screen -->
                    <rect x="20%" y="20%" width="60%" height="60%" rx="10" fill="#fff" stroke="${ink}" stroke-width="6"/>
                    <text x="30%" y="40%" font-family="Courier Prime, monospace" font-size="16" fill="${ink}">Mom: We'll be late.</text>
                    <text x="30%" y="55%" font-family="Courier Prime, monospace" font-size="16" fill="${ink}">Don't wait up.</text>
                    <!-- TV lightning reflection -->
                    <path d="M 0 0 L 400 100 L 400 300 L 0 200 Z" fill="${yellow}" opacity="0.1"/>
                `
            },
            {
                id: 'p9',
                sfx: { text: "CLICK", x: "40%", y: "50%", color: yellow },
                soundEvent: "click",
                cameraMotion: "zoom-in",
                svgContent: () => `
                    <rect width="100%" height="100%" fill="#050505"/>
                    ${svgDefs}
                    <!-- Flash of lightning illuminating door -->
                    <rect x="30%" y="10%" width="40%" height="90%" fill="#222" stroke="#444" stroke-width="4"/>
                    <path d="M 280 50 L 290 120 L 270 140 L 320 250" fill="none" stroke="${yellow}" stroke-width="3" opacity="0.8"/>
                    <!-- Handle turning -->
                    <circle cx="36%" cy="55%" r="15" fill="#fff" stroke="${ink}" stroke-width="4"/>
                    <rect x="36%" y="54%" width="20" height="8" fill="#fff" stroke="${ink}" stroke-width="3" transform="rotate(15 150 165)"/>
                `
            }
        ]
    }
];
