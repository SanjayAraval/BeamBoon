// comicArt.ts : hand-drawn-style ink SVG scenes for the CoverUp intro comic. No external assets.
// Every scene is drawn in a 400 x 300 viewBox. Style: thick black outlines, halftone shading, one yellow accent.

const INK = '#0b0b0b';
const PAPER = '#f2ecdc';
const GREY = '#cfc8b6';
const YEL = '#ffd400';

const defs = `
<defs>
  <pattern id="ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.7" fill="${INK}"/></pattern>
  <pattern id="ht2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.1" fill="${INK}"/></pattern>
  <pattern id="hty" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="2.3" fill="${YEL}"/></pattern>
  <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="7" fill="${INK}"/></pattern>
  <radialGradient id="glowy"><stop offset="0" stop-color="${YEL}" stop-opacity=".95"/><stop offset="1" stop-color="${YEL}" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
</defs>`;

const S = `stroke="${INK}" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"`;
const ST = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;

function wrap(inner: string, opts: { bg?: string; vig?: boolean } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${defs}
  <rect width="400" height="300" fill="${opts.bg ?? PAPER}"/>${inner}
  ${opts.vig === false ? '' : '<rect width="400" height="300" fill="url(#vig)"/>'}</svg>`;
}

/* ---------- characters ---------- */
type Mood = 'calm' | 'scared' | 'sleepy' | 'talk' | 'grim' | 'smile';
interface Face { cx: number; cy: number; r: number; mood: Mood; look?: number; }

function eyes(f: Face, glasses = false): string {
  const { cx, cy, r, mood } = f;
  const look = f.look ?? 0;
  const ex = r * 0.38, ey = cy - r * 0.05;
  const big = mood === 'scared' ? r * 0.3 : mood === 'sleepy' ? r * 0.19 : r * 0.23;
  const pup = mood === 'scared' ? big * 0.38 : big * 0.55;
  let out = '';
  for (const sx of [-1, 1]) {
    out += `<ellipse cx="${cx + sx * ex}" cy="${ey}" rx="${big}" ry="${mood === 'sleepy' ? big * 0.55 : big * 1.15}" fill="#fff" ${ST}/>`;
    out += `<circle cx="${cx + sx * ex + look * big * 0.45}" cy="${ey + (mood === 'sleepy' ? 1 : 0)}" r="${pup}" fill="${INK}"/>`;
    if (mood === 'sleepy') out += `<path d="M${cx + sx * ex - big} ${ey - 1} Q${cx + sx * ex} ${ey - big * 0.9} ${cx + sx * ex + big} ${ey - 1}" fill="${PAPER}" ${ST}/>`;
    if (mood === 'sleepy') out += `<path d="M${cx + sx * ex - big} ${ey + big * 0.9} q${big} ${big * 0.6} ${big * 2} 0" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
    const by = ey - big * (mood === 'scared' ? 1.9 : mood === 'grim' ? 1.4 : 1.6);
    const tilt = mood === 'scared' ? -sx * 5 : mood === 'grim' ? sx * 5 : 0;
    out += `<path d="M${cx + sx * ex - big * 1.1} ${by + tilt * sx * 0.0 + (sx > 0 ? -tilt : tilt) * -0.0} L${cx + sx * ex + big * 1.1} ${by + (sx > 0 ? 0 : 0)}" ${S} stroke-width="3"/>`;
  }
  if (glasses) for (const sx of [-1, 1]) out += `<circle cx="${cx + sx * ex}" cy="${ey}" r="${big * 1.7}" fill="rgba(255,255,255,.35)" ${ST}/>`;
  if (glasses) out += `<path d="M${cx - ex + big * 1.7} ${ey} L${cx + ex - big * 1.7} ${ey}" ${ST}/>`;
  return out;
}

function mouth(f: Face): string {
  const { cx, cy, r, mood } = f;
  const my = cy + r * 0.5;
  if (mood === 'scared') return `<ellipse cx="${cx}" cy="${my}" rx="${r * 0.16}" ry="${r * 0.22}" fill="${INK}"/>`;
  if (mood === 'talk') return `<path d="M${cx - r * 0.3} ${my - 2} Q${cx} ${my + r * 0.4} ${cx + r * 0.3} ${my - 2} Z" fill="${INK}" ${ST}/><path d="M${cx - r * 0.2} ${my + 1} h${r * 0.4}" stroke="#fff" stroke-width="3"/>`;
  if (mood === 'grim') return `<path d="M${cx - r * 0.3} ${my + 3} Q${cx} ${my - 5} ${cx + r * 0.3} ${my + 3}" fill="none" ${S}/>`;
  if (mood === 'smile') return `<path d="M${cx - r * 0.3} ${my - 2} Q${cx} ${my + r * 0.3} ${cx + r * 0.3} ${my - 2}" fill="none" ${S}/>`;
  return `<path d="M${cx - r * 0.22} ${my} h${r * 0.44}" fill="none" ${S}/>`;
}

function kidHead(f: Face, spiky = true): string {
  const { cx, cy, r } = f;
  const hair = spiky
    ? `<path d="M${cx - r} ${cy - r * 0.1} L${cx - r * 1.12} ${cy - r * 0.75} L${cx - r * 0.55} ${cy - r * 0.55} L${cx - r * 0.5} ${cy - r * 1.25} L${cx - r * 0.1} ${cy - r * 0.8} L${cx + r * 0.2} ${cy - r * 1.3} L${cx + r * 0.4} ${cy - r * 0.78} L${cx + r * 0.85} ${cy - r * 1.05} L${cx + r * 0.8} ${cy - r * 0.35} L${cx + r * 1.0} ${cy - r * 0.1} Q${cx} ${cy - r * 0.65} ${cx - r} ${cy - r * 0.1} Z" fill="${INK}" ${S}/>`
    : '';
  return `<ellipse cx="${cx - r}" cy="${cy + r * 0.1}" rx="${r * 0.14}" ry="${r * 0.22}" fill="${PAPER}" ${ST}/><ellipse cx="${cx + r}" cy="${cy + r * 0.1}" rx="${r * 0.14}" ry="${r * 0.22}" fill="${PAPER}" ${ST}/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${PAPER}" ${S}/>${hair}${eyes(f)}${mouth(f)}`;
}

function kidBody(x: number, y: number, s: number, shirt = 'ht'): string {
  // x,y = neck point, s = scale
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-22 0 Q-30 38 -26 70 L26 70 Q30 38 22 0 Q0 10 -22 0Z" fill="${PAPER}" ${S}/>
    <path d="M-22 0 Q-30 38 -26 70 L26 70 Q30 38 22 0 Q0 10 -22 0Z" fill="url(#${shirt})" opacity=".85"/>
    <path d="M-22 6 Q-34 30 -28 52" fill="none" ${S}/><path d="M22 6 Q34 30 28 52" fill="none" ${S}/>
  </g>`;
}

function dad(x: number, y: number, s: number, mood: Mood, opts: { cap?: boolean; gesture?: boolean; flip?: boolean } = {}): string {
  // x,y = center of head
  const r = 30;
  const f: Face = { cx: 0, cy: 0, r, mood: mood === 'talk' ? 'talk' : mood, look: 0 };
  return `<g transform="translate(${x} ${y}) scale(${(opts.flip ? -1 : 1) * s} ${s})">
    <path d="M-52 34 Q-60 90 -56 150 L56 150 Q60 90 52 34 Q0 52 -52 34Z" fill="#2a3858" ${S}/>
    <path d="M-52 34 Q-60 90 -56 150 L56 150 Q60 90 52 34 Q0 52 -52 34Z" fill="url(#ht2)" opacity=".5"/>
    <path d="M-14 38 L0 78 L14 38" fill="#fff" ${S}/><path d="M-3 52 h6 l2 28 h-10Z" fill="${INK}"/>
    <circle cx="-30" cy="80" r="6" fill="${YEL}" ${ST}/>
    <rect x="-56" y="124" width="112" height="9" fill="${INK}"/><rect x="-7" y="122" width="14" height="13" fill="${YEL}" ${ST}/>
    ${opts.gesture ? `<path d="M52 56 Q96 40 108 8" fill="none" stroke="#2a3858" stroke-width="22" stroke-linecap="round"/><path d="M52 56 Q96 40 108 8" fill="none" ${S} stroke-width="26" opacity=".0"/><circle cx="110" cy="2" r="13" fill="${PAPER}" ${S}/>` : ''}
    <rect x="-9" y="22" width="18" height="16" fill="${PAPER}" ${S}/>
    <ellipse cx="0" cy="${r * 0.15}" rx="${r * 1.05}" ry="${r * 1.12}" fill="${PAPER}" ${S}/>
    <path d="M${-r * 1.0} ${r * 0.3} Q0 ${r * 1.75} ${r * 1.0} ${r * 0.3} Q0 ${r * 1.05} ${-r * 1.0} ${r * 0.3}Z" fill="url(#ht2)" opacity=".5"/>
    ${eyes(f)}
    <path d="M${-r * 0.5} ${r * 0.42} Q0 ${r * 0.14} ${r * 0.5} ${r * 0.42} Q0 ${r * 0.62} ${-r * 0.5} ${r * 0.42}Z" fill="${INK}" ${ST}/>
    ${mouth({ ...f, cy: f.cy + 3 })}
    ${opts.cap !== false ? `<path d="M${-r * 1.08} ${-r * 0.4} Q0 ${-r * 1.7} ${r * 1.08} ${-r * 0.4} L${r * 1.4} ${-r * 0.25} L${-r * 1.4} ${-r * 0.25}Z" fill="#1b2a4a" ${S}/><path d="M${-r * 1.08} ${-r * 0.4} Q0 ${-r * 1.7} ${r * 1.08} ${-r * 0.4}" fill="url(#ht2)" opacity=".4"/><circle cx="0" cy="${-r * 0.78}" r="5.5" fill="${YEL}" ${ST}/>` : ''}
  </g>`;
}

function mom(x: number, y: number, s: number, mood: Mood, drink = false): string {
  const r = 27;
  const f: Face = { cx: 0, cy: 0, r, mood, look: 0 };
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-44 34 Q-62 100 -70 150 L70 150 Q62 100 44 34 Q0 50 -44 34Z" fill="${PAPER}" ${S}/>
    <path d="M-44 34 Q-62 100 -70 150 L70 150 Q62 100 44 34 Q0 50 -44 34Z" fill="url(#ht)" opacity=".75"/>
    <rect x="-8" y="22" width="16" height="16" fill="${PAPER}" ${S}/>
    <circle cx="-30" cy="-16" r="26" fill="${INK}" ${S}/><circle cx="30" cy="-16" r="26" fill="${INK}" ${S}/><circle cx="0" cy="-30" r="30" fill="${INK}" ${S}/><circle cx="-34" cy="14" r="16" fill="${INK}" ${S}/><circle cx="34" cy="14" r="16" fill="${INK}" ${S}/>
    <ellipse cx="0" cy="${r * 0.12}" rx="${r * 1.0}" ry="${r * 1.1}" fill="${PAPER}" ${S}/>
    <path d="M${-r} ${-r * 0.2} Q0 ${-r * 1.2} ${r} ${-r * 0.2} Q${r * 0.4} ${-r * 0.55} 0 ${-r * 0.3} Q${-r * 0.4} ${-r * 0.55} ${-r} ${-r * 0.2}Z" fill="${INK}" ${S}/>
    ${eyes(f)}${mouth(f)}
    ${drink ? `<g transform="translate(46 100)"><path d="M-8 -16 h24 l-5 26 q-7 5 -14 0Z" fill="rgba(255,255,255,.7)" ${S}/><path d="M-6 -4 h20 l-3 14 q-7 4 -14 0Z" fill="url(#ht2)"/><path d="M4 12 v14 M-4 26 h16" ${S}/></g>` : ''}
  </g>`;
}

/* ---------- scenes ---------- */

export function scene1(): string {
  // age 6, bedroom, storm, shadow claw
  return wrap(`
  <rect width="400" height="210" fill="${GREY}"/><rect width="400" height="210" fill="url(#ht2)" opacity=".18"/>
  <rect x="236" y="26" width="132" height="132" fill="${INK}" ${S}/>
  <path d="M236 26 h132 v132 h-132Z" fill="#fff" opacity=".95"/>
  <path d="M312 26 L286 88 L308 88 L280 158 L342 80 L318 80 L346 26Z" fill="${YEL}" ${S}/>
  <g ${S} fill="none" stroke-width="7"><path d="M368 70 Q330 70 300 100"/><path d="M368 112 Q340 112 316 132"/><path d="M340 70 L330 50"/></g>
  <path d="M236 92 h132 M302 26 v132" ${S}/>
  <path d="M232 160 L12 296 L400 296 L400 188Z" fill="url(#ht)" opacity=".55"/>
  <g stroke="${INK}" fill="${INK}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M36 150 Q70 120 110 138 Q150 150 168 188 Q130 184 90 176 Q56 168 36 150Z" stroke-width="3"/>
    <path d="M96 140 Q104 96 122 70 Q116 108 124 142Z" stroke-width="3"/><path d="M122 144 Q144 104 178 88 Q150 120 140 152Z" stroke-width="3"/>
    <path d="M80 148 Q70 106 52 84 Q82 108 100 144Z" stroke-width="3"/><path d="M46 158 Q18 134 6 104 Q36 126 62 156Z" stroke-width="3"/>
  </g>
  <rect x="0" y="206" width="400" height="94" fill="${PAPER}" ${S}/>
  <path d="M-4 214 h408 v90 h-408Z" fill="url(#hatch)" opacity=".18"/>
  <path d="M20 296 L20 232 Q20 214 40 214 L400 214 L400 296Z" fill="#e8e2d0" ${S}/>
  <path d="M30 236 Q180 218 396 232 L396 296 L30 296Z" fill="${PAPER}" ${S}/>
  <path d="M30 236 Q180 218 396 232 L396 296 L30 296Z" fill="url(#ht2)" opacity=".28"/>
  <path d="M90 252 q16 18 4 40 M180 240 q18 22 4 52 M290 242 q14 20 2 50" fill="none" ${ST}/>
  ${kidHead({ cx: 84, cy: 232, r: 28, mood: 'scared', look: 1 })}
  <path d="M50 252 Q84 232 118 252 L124 300 L40 300Z" fill="${PAPER}" ${S}/>
  <path d="M50 252 Q84 232 118 252 L124 300 L40 300Z" fill="url(#ht2)" opacity=".35"/>
  <circle cx="58" cy="256" r="10" fill="${PAPER}" ${S}/><circle cx="110" cy="256" r="10" fill="${PAPER}" ${S}/>
  `);
}

export function scene2(): string {
  // kitchen table, dad telling a story, kid listening
  return wrap(`
  <rect width="400" height="300" fill="${GREY}"/><rect width="400" height="300" fill="url(#ht2)" opacity=".15"/>
  <rect x="150" y="14" width="80" height="60" fill="${PAPER}" ${S}/><path d="M150 44 h80 M190 14 v60" ${S}/>
  <path d="M296 0 v40" ${S}/><path d="M270 40 h54 l-12 28 h-30Z" fill="${YEL}" ${S}/>
  <path d="M280 68 L252 300 L346 300 L318 68Z" fill="url(#hty)" opacity=".5"/>
  ${dad(104, 112, 1.25, 'talk', { gesture: true })}
  <rect x="0" y="236" width="400" height="64" fill="${PAPER}" ${S}/><rect x="0" y="236" width="400" height="64" fill="url(#hatch)" opacity=".16"/>
  <path d="M-4 236 h408" ${S} stroke-width="6"/>
  <path d="M236 292 v-84 M388 292 v-84" ${S} stroke-width="8"/>
  ${kidBody(310, 206, 1.0)}
  ${kidHead({ cx: 310, cy: 180, r: 32, mood: 'scared', look: -1 })}
  <path d="M258 236 q52 -14 104 0" fill="none" ${S}/>
  <path d="M40 252 h54 l-6 30 h-42Z" fill="#fff" ${S}/><path d="M94 262 q16 2 12 12 q-4 6 -14 4" fill="none" ${S}/>
  `);
}

export function scene3(): string {
  // living room at night: parents drinking on couch, TV glow, kid on the stairs
  return wrap(`
  <rect width="400" height="300" fill="#16161a"/>
  <rect width="400" height="300" fill="url(#ht2)" opacity=".22"/>
  <circle cx="60" cy="130" r="170" fill="url(#glowy)" opacity=".55"/>
  <rect x="18" y="68" width="112" height="82" fill="${INK}" ${S}/><rect x="26" y="76" width="96" height="66" fill="${YEL}" opacity=".95"/><rect x="26" y="76" width="96" height="66" fill="url(#ht2)" opacity=".4"/>
  <path d="M50 150 h48 l6 20 h-60Z" fill="${INK}" ${S}/>
  <path d="M60 128 q14 -24 28 0 q8 10 -4 16 h-20 q-12 -6 -4 -16Z" fill="${INK}"/><path d="M52 112 h14 M84 112 h14" ${S} stroke-width="3"/>
  <rect x="120" y="200" width="270" height="100" rx="14" fill="#3a3a44" ${S}/>
  <rect x="118" y="168" width="280" height="50" rx="14" fill="#4a4a56" ${S}/>
  <g transform="translate(0 6)">${mom(188, 150, 0.95, 'sleepy', true)}</g>
  <g transform="translate(0 6)">${dad(272, 152, 1.0, 'sleepy', { cap: false })}</g>
  <rect x="108" y="206" width="294" height="40" rx="10" fill="#555563" ${S}/>
  <g ${S} stroke-width="9"><path d="M334 0 v300"/><path d="M360 0 v300"/><path d="M386 0 v300"/><path d="M312 0 v300"/></g>
  <path d="M300 0 h100 v300 h-100" fill="none" ${S} stroke-width="5" opacity="0"/>
  <path d="M290 76 h110" stroke="${INK}" stroke-width="10"/>
  ${kidHead({ cx: 349, cy: 120, r: 26, mood: 'scared', look: -1 })}
  <rect x="318" y="100" width="62" height="10" fill="${INK}" opacity=".0"/>
  <g ${S} stroke-width="9"><path d="M334 0 v300" stroke="${INK}"/><path d="M360 0 v300"/></g>
  <g ${S} stroke-width="9" opacity="0"><path d="M334 0 v300"/></g>
  `, { bg: '#111' });
}

export function scene4(): string {
  // age 10 kid at midnight checking locks, door with chain, bolts
  return wrap(`
  <rect width="400" height="300" fill="${GREY}"/><rect width="400" height="300" fill="url(#ht2)" opacity=".18"/>
  <rect x="190" y="14" width="190" height="276" fill="#7c6a52" ${S}/><rect x="190" y="14" width="190" height="276" fill="url(#hatch)" opacity=".22"/>
  <rect x="210" y="34" width="150" height="104" fill="none" ${S}/><rect x="210" y="156" width="150" height="116" fill="none" ${S}/>
  <circle cx="288" cy="86" r="11" fill="#fff" ${S}/><circle cx="288" cy="86" r="4" fill="${INK}"/>
  <rect x="194" y="150" width="40" height="22" fill="#b8b8b8" ${S}/><circle cx="214" cy="161" r="6" fill="${YEL}" ${ST}/>
  <rect x="332" y="120" width="40" height="18" fill="#aaa" ${S}/><rect x="338" y="124" width="12" height="10" fill="${INK}"/>
  <rect x="332" y="170" width="36" height="16" fill="#aaa" ${S}/>
  <path d="M232 100 q-14 22 0 40 M232 140 h42" fill="none" ${S} stroke-width="3"/>
  <g ${ST} fill="none"><circle cx="258" cy="190" r="4"/><circle cx="268" cy="196" r="4"/><circle cx="278" cy="202" r="4"/><circle cx="288" cy="208" r="4"/><circle cx="298" cy="214" r="4"/></g>
  <circle cx="68" cy="52" r="34" fill="#fff" ${S}/><path d="M68 52 v-22 M68 52 l16 10" ${S}/><circle cx="68" cy="52" r="3" fill="${INK}"/>
  <path d="M52 24 l8 6 M84 24 l-8 6" ${ST}/>
  <path d="M0 290 h400" ${S}/><rect x="0" y="262" width="400" height="38" fill="${PAPER}" ${S}/><rect x="0" y="262" width="400" height="38" fill="url(#hatch)" opacity=".15"/>
  <g transform="translate(112 0)">
  ${kidBody(30, 150, 1.5)}
  <path d="M-6 190 q-28 30 -10 56" fill="none" ${S}/>
  <path d="M50 160 q34 -8 56 -28" fill="none" stroke="${PAPER}" stroke-width="18" stroke-linecap="round"/><path d="M50 160 q34 -8 56 -28" fill="none" ${S} stroke-width="22" opacity="0"/>
  <path d="M42 150 q36 -4 66 -24" fill="none" ${S} stroke-width="20" stroke-linecap="round" opacity=".0"/>
  <circle cx="112" cy="130" r="10" fill="${PAPER}" ${S}/>
  ${kidHead({ cx: 30, cy: 98, r: 38, mood: 'sleepy', look: 1 })}
  </g>
  <path d="M0 0 h400 v300 h-400Z" fill="none" stroke="${INK}" stroke-width="0"/>
  `);
}

export function scene5(): string {
  // closet: dad's hand puts a gun box on the top shelf, kid's eye at the door gap
  return wrap(`
  <rect width="400" height="300" fill="${INK}"/>
  <rect x="20" y="28" width="300" height="240" fill="#26262c" ${S}/>
  <rect x="20" y="28" width="300" height="240" fill="url(#ht2)" opacity=".4"/>
  <rect x="20" y="96" width="300" height="12" fill="#3c3c44" ${S}/>
  <path d="M30 108 v160 M310 108 v160" ${ST}/>
  <g ${S} fill="#33333a"><path d="M52 108 l22 0 l8 40 l-38 0Z"/><path d="M100 108 h6 v108 h-6Z"/><path d="M122 108 h6 v108 h-6Z"/><path d="M144 108 h6 v108 h-6Z"/></g>
  <g ${S}><path d="M60 108 q0 -20 22 -20 q22 0 22 20" fill="#3b3b42"/><path d="M60 98 h44" /></g>
  <g transform="translate(168 18)">
    <rect x="0" y="22" width="110" height="52" fill="#555" ${S}/><rect x="0" y="22" width="110" height="52" fill="url(#ht)" opacity=".55"/>
    <rect x="44" y="40" width="22" height="16" fill="${YEL}" ${S}/><circle cx="55" cy="48" r="3" fill="${INK}"/>
    <path d="M0 22 h110" ${S}/>
  </g>
  <path d="M320 70 q40 6 80 40 v60 h-80Z" fill="${PAPER}" ${S}/>
  <path d="M276 50 q-20 40 -52 60 l-8 14 q-6 12 6 14 q16 0 24 -12 l36 -24 q10 -34 -6 -52Z" fill="#2a3858" ${S}/>
  <path d="M232 112 q-30 6 -62 6 q-8 4 -6 12 q4 8 16 6 q30 -2 56 -10Z" fill="${PAPER}" ${S}/>
  <path d="M176 118 l-14 -6 M176 126 l-16 0 M178 134 l-14 6" ${ST}/>
  <path d="M320 70 l0 230" ${S} stroke-width="5"/>
  <path d="M342 200 h56 v80 h-56Z" fill="${INK}"/>
  <path d="M338 130 l64 0 l0 120 l-64 0Z" fill="#14141a"/>
  <path d="M344 190 q22 -22 48 0 q-22 22 -48 0Z" fill="#fff" ${S}/><circle cx="368" cy="190" r="10" fill="${INK}"/><circle cx="371" cy="187" r="3" fill="#fff"/>
  <path d="M344 172 q24 -14 48 0" fill="none" ${S}/>
  <rect x="320" y="70" width="10" height="230" fill="${YEL}" opacity=".0"/>
  `, { bg: '#0d0d10' });
}

export function scene6(): string {
  // age 14 on couch, zombie movie glowing, popcorn spilled
  return wrap(`
  <rect width="400" height="300" fill="#121214"/><rect width="400" height="300" fill="url(#ht2)" opacity=".2"/>
  <rect x="198" y="26" width="178" height="124" fill="${INK}" ${S}/><rect x="208" y="36" width="158" height="104" fill="${YEL}"/><rect x="208" y="36" width="158" height="104" fill="url(#ht2)" opacity=".5"/>
  <g ${S} fill="${INK}"><path d="M264 140 L262 96 Q262 84 274 82 L296 82 Q308 84 308 96 L308 140Z"/><circle cx="285" cy="68" r="14"/><path d="M262 94 L228 78 L226 90 L260 106Z"/><path d="M308 94 L342 78 L344 90 L310 106Z"/></g>
  <circle cx="279" cy="66" r="3" fill="${YEL}"/><circle cx="291" cy="66" r="3" fill="${YEL}"/>
  <path d="M204 140 h166" ${S}/>
  <circle cx="287" cy="88" r="200" fill="url(#glowy)" opacity=".35"/>
  <rect x="0" y="190" width="400" height="110" fill="#22222a" ${S}/><rect x="0" y="190" width="400" height="110" fill="url(#hatch)" opacity=".1"/>
  <g transform="translate(0 22)">
    <path d="M30 130 Q30 70 100 80 L180 84 L186 186 L30 186Z" fill="#33333b" ${S}/>
    ${kidBody(100, 106, 1.3)}
    ${kidHead({ cx: 100, cy: 70, r: 34, mood: 'scared', look: 1 })}
    <path d="M58 142 Q60 118 82 118" fill="none" ${S}/>
    <path d="M30 122 Q70 112 100 130 L140 190 L34 190Z" fill="${GREY}" ${S}/><path d="M30 122 Q70 112 100 130 L140 190 L34 190Z" fill="url(#ht)" opacity=".55"/>
    <path d="M96 118 q-20 -4 -24 12 M114 116 q22 -2 24 14" fill="none" ${S}/><circle cx="76" cy="130" r="9" fill="${PAPER}" ${S}/><circle cx="134" cy="130" r="9" fill="${PAPER}" ${S}/>
  </g>
  <g ${ST}><path d="M190 262 l14 -8 l8 10 l-10 10Z" fill="${PAPER}"/><path d="M230 270 l12 -4 l4 12 l-14 2Z" fill="${PAPER}"/><path d="M270 258 l10 -10 l10 8 l-8 12Z" fill="${PAPER}"/><path d="M300 276 l10 -4 l4 10 l-12 2Z" fill="${PAPER}"/></g>
  <g transform="translate(168 244) rotate(-14)"><path d="M0 0 h38 l-6 38 h-26Z" fill="${PAPER}" ${S}/><path d="M6 0 v38 M13 0 v38 M20 0 v38 M27 0 v38" ${ST}/></g>
  `, { bg: '#111' });
}

export function scene7(): string {
  // peephole view: fisheye circle, distorted neighbour with a trash bag, paranoid scribbles
  return wrap(`
  <rect width="400" height="300" fill="#0b0b0b"/>
  <g ${ST} stroke="#e5e0d0" fill="none" opacity=".85">
    <path d="M10 40 l40 12 l-38 4 l50 14" /><path d="M360 36 l-50 18 l44 6 l-60 14"/><path d="M14 250 l50 -10 l-44 -14 l60 -4"/><path d="M346 262 l-46 -14 l48 -8 l-56 -16"/>
    <path d="M30 120 q20 -14 40 0 q-20 14 -40 0Z"/><circle cx="50" cy="120" r="5" fill="#e5e0d0"/><path d="M330 150 q20 -14 40 0 q-20 14 -40 0Z"/><circle cx="350" cy="150" r="5" fill="#e5e0d0"/>
  </g>
  <clipPath id="pc"><circle cx="200" cy="150" r="128"/></clipPath>
  <g clip-path="url(#pc)">
    <rect x="60" y="20" width="280" height="260" fill="${GREY}"/><rect x="60" y="20" width="280" height="260" fill="url(#ht2)" opacity=".3"/>
    <rect x="60" y="205" width="280" height="80" fill="#8c8a7c"/><rect x="60" y="205" width="280" height="80" fill="url(#hatch)" opacity=".2"/>
    <g transform="translate(200 160) scale(1.35 1.2)">
      <path d="M-62 130 Q-72 40 -40 18 L-24 8 Q0 2 24 8 L40 18 Q72 40 62 130Z" fill="#7a5a3a" ${S}/><path d="M-62 130 Q-72 40 -40 18 L-24 8 Q0 2 24 8 L40 18 Q72 40 62 130Z" fill="url(#ht2)" opacity=".5"/>
      <path d="M-12 8 L0 56 L12 8" fill="#fff" ${S}/>
      <ellipse cx="0" cy="-34" rx="34" ry="40" fill="${PAPER}" ${S}/>
      <path d="M-34 -40 Q-40 -76 0 -80 Q40 -76 34 -40 Q18 -62 0 -58 Q-18 -62 -34 -40Z" fill="#cfcfcf" ${S}/>
      <g transform="translate(0 -36)"><circle cx="-14" cy="0" r="12" fill="rgba(255,255,255,.5)" ${ST}/><circle cx="14" cy="0" r="12" fill="rgba(255,255,255,.5)" ${ST}/><path d="M-2 0 h4" ${ST}/><circle cx="-12" cy="0" r="3" fill="${INK}"/><circle cx="16" cy="0" r="3" fill="${INK}"/></g>
      <path d="M-12 -12 q12 8 24 0" fill="none" ${S}/>
      <g transform="translate(46 70)"><path d="M0 0 q-30 -4 -34 28 q4 34 34 34 q34 -2 38 -34 q-4 -30 -38 -28Z" fill="#1a1a1a" ${S}/><path d="M-14 6 q10 10 6 24 M10 4 q-4 16 6 28" fill="none" stroke="#555" stroke-width="2"/><path d="M-4 -6 q4 -14 10 0" fill="none" ${S}/></g>
    </g>
  </g>
  <circle cx="200" cy="150" r="128" fill="none" stroke="#b7b7b7" stroke-width="12"/><circle cx="200" cy="150" r="136" fill="none" ${S} stroke-width="5"/>
  <circle cx="200" cy="150" r="128" fill="url(#vig)" opacity=".9"/>
  `, { bg: '#0b0b0b', vig: false });
}

export function scene8(): string {
  // TV storm warning + phone text from mom
  return wrap(`
  <rect width="400" height="300" fill="#121214"/><rect width="400" height="300" fill="url(#ht2)" opacity=".18"/>
  <rect x="14" y="30" width="206" height="150" fill="${INK}" ${S}/><rect x="24" y="40" width="186" height="130" fill="#d9d4c0"/><rect x="24" y="40" width="186" height="130" fill="url(#ht2)" opacity=".4"/>
  <path d="M117 62 q-30 6 -30 34 q0 18 22 22 q-26 8 -22 28 q6 12 28 8" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
  <path d="M117 62 q30 6 30 34 q0 18 -22 22 q26 8 22 28" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" opacity="0"/>
  <path d="M140 52 L112 112 L136 112 L108 166 L156 98 L132 98 L158 52Z" fill="${YEL}" ${S}/>
  <rect x="24" y="130" width="186" height="28" fill="${INK}"/><rect x="24" y="130" width="186" height="28" fill="none"/>
  <rect x="24" y="130" width="52" height="28" fill="#c92b2b" ${ST}/><path d="M30 144 h40" stroke="#fff" stroke-width="5"/>
  <path d="M92 144 h100" stroke="#fff" stroke-width="3" stroke-dasharray="14 6"/>
  <path d="M96 188 h30 l8 20 h-46Z" fill="${INK}" ${S}/>
  <g transform="translate(264 18) rotate(6)">
    <rect x="0" y="0" width="114" height="226" rx="18" fill="${INK}" ${S}/>
    <rect x="8" y="14" width="98" height="198" rx="8" fill="#e8e4d4"/><rect x="8" y="14" width="98" height="198" rx="8" fill="url(#ht2)" opacity=".18"/>
    <rect x="40" y="4" width="34" height="5" rx="2" fill="#555"/>
    <path d="M16 38 h58 q8 0 8 8 v22 q0 8 -8 8 h-50 l-10 10 v-10 q-4 -2 -4 -8 v-22 q0 -8 6 -8Z" fill="#fff" ${ST}/>
    <path d="M24 50 h46 M24 60 h30" stroke="${INK}" stroke-width="2.6"/>
    <path d="M98 108 h-58 q-8 0 -8 8 v24 q0 8 8 8 h46 l12 10 v-10 q6 -2 6 -8 v-24 q0 -8 -6 -8Z" fill="${YEL}" ${ST}/>
    <path d="M44 122 h46 M44 132 h34" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="57" cy="192" r="6" fill="none" ${ST}/>
  </g>
  <g transform="translate(236 150)"><path d="M0 0 q20 -20 46 -10" fill="none" ${S}/></g>
  `, { bg: '#111' });
}

export function scene9(): string {
  // the front door in the dark, handle turning, lightning behind frosted glass, light under door
  return wrap(`
  <rect width="400" height="300" fill="#08080a"/>
  <rect x="96" y="0" width="208" height="300" fill="#15151a" ${S}/><rect x="96" y="0" width="208" height="300" fill="url(#ht2)" opacity=".3"/>
  <rect x="122" y="26" width="156" height="120" fill="none" ${S}/><rect x="122" y="164" width="156" height="110" fill="none" ${S}/>
  <rect x="150" y="38" width="100" height="40" fill="#e9e4d2" ${S}/><rect x="150" y="38" width="100" height="40" fill="url(#ht2)" opacity=".5"/>
  <path d="M206 38 L190 62 L204 62 L196 78 L224 54 L210 54 L224 38Z" fill="${YEL}"/>
  <path d="M140 296 h120 l14 4 h-148Z" fill="${YEL}" opacity=".85"/>
  <path d="M150 300 L124 296 L276 296 L250 300Z" fill="url(#glowy)"/>
  <g transform="translate(246 168) rotate(26)"><rect x="-6" y="-6" width="44" height="12" rx="6" fill="#d8d8d8" ${S}/><circle cx="0" cy="0" r="14" fill="#9a9a9a" ${S}/></g>
  <circle cx="244" cy="168" r="18" fill="none" ${ST} stroke="${YEL}" opacity=".8"/>
  <g ${ST} stroke="${YEL}" opacity=".9"><path d="M230 140 l-8 -12 M252 138 l4 -14 M266 154 l12 -8"/></g>
  <circle cx="200" cy="100" r="10" fill="#fff" ${S}/><circle cx="200" cy="100" r="3.5" fill="${INK}"/>
  `, { bg: '#000' });
}

export const SCENES = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9];
