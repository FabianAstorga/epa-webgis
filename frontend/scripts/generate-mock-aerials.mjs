/**
 * Generador de ortomosaicos simulados para el prototipo EPA WebGIS.
 *
 * No se utilizan fotografías reales ni material de terceros: las imágenes son
 * composiciones vectoriales (SVG) que representan patios, muelles y accesos del
 * recinto portuario. Cada sector tiene una versión "A" y una "B" con cambios
 * visibles para demostrar la herramienta de cortina.
 *
 * Uso: npm run mock:images
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'mock');
mkdirSync(outDir, { recursive: true });

const W = 1600;
const H = 900;

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

const CONTAINER_COLORS = [
  '#9f3a2f',
  '#1f4e8c',
  '#13736b',
  '#8c6a1f',
  '#7a2f3a',
  '#3f5d73',
  '#a8562c',
  '#2f6b4f',
  '#8a4b24',
  '#365f89',
];

const TRUCK_COLORS = ['#e7e8e6', '#d9dcdd', '#cfd6d9', '#b33a2f', '#24548c', '#d8b13a'];

const shadow = (x, y, w, h, dx = 9, dy = 11, opacity = 0.2) =>
  `<rect x="${x + dx}" y="${y + dy}" width="${w}" height="${h}" fill="#000" opacity="${opacity}"/>`;

const container = (x, y, w, h, color, rotated = false) => {
  const t = rotated
    ? `transform="rotate(90 ${x + w / 2} ${y + h / 2})"`
    : '';
  return `
    <g ${t}>
      ${shadow(x, y, w, h, 6, 7, 0.26)}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>
      <rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${Math.max(2, h * 0.18)}" fill="#ffffff" opacity="0.18"/>
      <rect x="${x + 1}" y="${y + h - 2}" width="${w - 2}" height="1" fill="#000" opacity="0.32"/>
      <rect x="${x + w * 0.14}" y="${y + 2}" width="1" height="${h - 4}" fill="#000" opacity="0.18"/>
      <rect x="${x + w * 0.82}" y="${y + 2}" width="1" height="${h - 4}" fill="#000" opacity="0.18"/>
    </g>`;
};

const containerBlock = (x, y, cols, rows, rand, occupied = 0.86) => {
  const cw = 34;
  const ch = 11;
  const gx = 2;
  const gy = 2;
  let out = '';
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (rand() > occupied) continue;
      const color = pick(rand, CONTAINER_COLORS);
      out += container(x + c * (cw + gx), y + r * (ch + gy), cw, ch, color);
    }
  }
  return out;
};

const overlayContainers = (x, y, cols, colors) => {
  let out = '';
  for (let c = 0; c < cols; c += 1) {
    out += container(x + c * 36, y, 34, 11, colors[c % colors.length]);
  }
  return out;
};

const truck = (x, y, color = '#e7e8e6', rotated = false, trailer = true) => {
  const t = rotated ? `transform="rotate(90 ${x + 11} ${y + 15})"` : '';
  const body = trailer
    ? `<rect x="${x + 8}" y="${y}" width="30" height="12" fill="#d7dbdc"/>
       <rect x="${x + 8}" y="${y}" width="30" height="12" fill="${color}" opacity="0.42"/>
       <rect x="${x + 10}" y="${y + 2}" width="26" height="1" fill="#fff" opacity="0.55"/>
       <rect x="${x}" y="${y - 1}" width="9" height="14" fill="${color}"/>
       <rect x="${x + 1}" y="${y}" width="4" height="5" fill="#1f2937" opacity="0.55"/>`
    : `<rect x="${x}" y="${y}" width="12" height="8" fill="${color}"/>`;
  return `
    <g ${t}>
      ${shadow(x, y, 39, 13, 5, 6, 0.3)}
      ${body}
      <rect x="${x + 1}" y="${y + 12}" width="37" height="2" fill="#000" opacity="0.25"/>
    </g>`;
};

const building = (x, y, w, h, fill = '#c7ccce') => {
  const vents = Math.max(1, Math.floor(w / 92));
  let units = '';
  for (let i = 0; i < vents; i += 1) {
    units += `<rect x="${x + 18 + i * 84}" y="${y + 18}" width="30" height="18" fill="#8e979c"/>
      <rect x="${x + 18 + i * 84}" y="${y + 18}" width="30" height="4" fill="#eef1f2" opacity="0.7"/>`;
  }
  return `
    ${shadow(x, y, w, h, 12, 14, 0.24)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#7b858a" stroke-width="2"/>
    <rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.4"/>
    <line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="#8b9498" stroke-width="2" opacity="0.8"/>
    ${units}
    <rect x="${x + w - 46}" y="${y + h - 24}" width="30" height="14" fill="#aeb6b9"/>`;
};

const lightPole = (x, y) => `
  <line x1="${x}" y1="${y}" x2="${x + 16}" y2="${y + 30}" stroke="#000" stroke-width="2" opacity="0.28"/>
  <circle cx="${x}" cy="${y}" r="3" fill="#e8ecec" stroke="#5a6368" stroke-width="1"/>`;

const pothole = (x, y, s = 1, seed = 1) => {
  const rand = mulberry32(seed);
  const pts = [];
  const n = 10;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const r = (10 + rand() * 8) * s;
    pts.push(`${x + Math.cos(a) * r},${y + Math.sin(a) * r * 0.62}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#1b1f22" opacity="0.92"/>
    <polygon points="${pts.join(' ')}" fill="none" stroke="#0c0f11" stroke-width="${2 * s}" opacity="0.55"/>
    <ellipse cx="${x - 3 * s}" cy="${y - 2 * s}" rx="${7 * s}" ry="${3.5 * s}" fill="#2a3033" opacity="0.7"/>`;
};

const crack = (x, y, len = 120, angle = 0) => {
  const x2 = x + Math.cos((angle * Math.PI) / 180) * len;
  const y2 = y + Math.sin((angle * Math.PI) / 180) * len;
  return `<path d="M${x} ${y} L${x + (x2 - x) * 0.35} ${y + (y2 - y) * 0.35 + 5}
    L${x + (x2 - x) * 0.7} ${y + (y2 - y) * 0.7 - 4} L${x2} ${y2}"
    fill="none" stroke="#20262a" stroke-width="2.4" opacity="0.8"/>`;
};

const debris = (x, y, seed = 1, count = 12) => {
  const rand = mulberry32(seed);
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const dx = rand() * 62 - 31;
    const dy = rand() * 42 - 21;
    out += `<rect x="${x + dx}" y="${y + dy}" width="${2 + rand() * 7}" height="${1 + rand() * 4}"
      fill="${pick(rand, ['#8a7a5b', '#a9a08d', '#5e5a51', '#b9b2a0'])}" opacity="0.9"
      transform="rotate(${rand() * 90} ${x + dx} ${y + dy})"/>`;
  }
  return out;
};

const oilStain = (x, y, s = 1, seed = 2) => {
  const rand = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    const r = (14 + rand() * 14) * s;
    pts.push(`${x + Math.cos(a) * r},${y + Math.sin(a) * r * 0.55}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#1a2024" opacity="0.55"/>
    <polygon points="${pts.join(' ')}" fill="none" stroke="#0e1215" stroke-width="2" opacity="0.35"/>`;
};

const tree = (x, y, r = 12) => `
  <ellipse cx="${x + 7}" cy="${y + 8}" rx="${r + 4}" ry="${r * 0.7}" fill="#000" opacity="0.2"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="#405a38"/>
  <circle cx="${x - r * 0.3}" cy="${y - r * 0.25}" r="${r * 0.65}" fill="#4d6b41"/>
  <circle cx="${x + r * 0.28}" cy="${y + r * 0.2}" r="${r * 0.45}" fill="#395231"/>`;

const road = (d, width, fill = '#30353a') => `
  <path d="${d}" fill="none" stroke="${fill}" stroke-width="${width}" stroke-linecap="butt" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="#e9ecec" stroke-width="2" stroke-dasharray="18 16" opacity="0.55"/>
  <path d="${d}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.2"
    transform="translate(0 ${-width / 2 + 3})"/>
  <path d="${d}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.2"
    transform="translate(0 ${width / 2 - 3})"/>`;

const marking = (x, y, text, size = 44, rotate = 0, fill = '#e8e8e2') => `
  <text x="${x}" y="${y}" font-family="ui-monospace, monospace" font-size="${size}" font-weight="700"
    fill="${fill}" opacity="0.42" letter-spacing="2"
    transform="rotate(${rotate} ${x} ${y})">${text}</text>`;

const arrow = (x, y, rotate = 0) => `
  <g transform="rotate(${rotate} ${x} ${y})" opacity="0.32" fill="#f4f4ef">
    <rect x="${x - 3}" y="${y - 26}" width="6" height="38"/>
    <polygon points="${x - 13},${y - 2} ${x + 13},${y - 2} ${x},${y + 20}"/>
  </g>`;

const bollard = (x, y) => `
  <ellipse cx="${x + 4}" cy="${y + 5}" rx="4" ry="2" fill="#000" opacity="0.3"/>
  <circle cx="${x}" cy="${y}" r="3.4" fill="#e8c04a" stroke="#5c4a16" stroke-width="1"/>`;

const svgDoc = (inner, seed = 1, info = 'ZEAP') => {
  const rand = mulberry32(seed);
  const flecks = Array.from({ length: 26 }, () => {
    const x = rand() * W;
    const y = rand() * H;
    const w = 1 + rand() * 4;
    const h = 1 + rand() * 3;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"
      fill="${pick(rand, ['#ffffff', '#000000', '#c7b98e'])}" opacity="${(0.04 + rand() * 0.08).toFixed(2)}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.20"/></feComponentTransfer>
    </filter>
    <radialGradient id="vignette" cx="50%" cy="46%" r="72%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="72%" stop-color="#000000" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
    </radialGradient>
    <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#255a6b"/>
      <stop offset="55%" stop-color="#1c4a5a"/>
      <stop offset="100%" stop-color="#133844"/>
    </linearGradient>
    <pattern id="hazard" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="16" height="16" fill="#d4a824"/>
      <rect width="8" height="16" fill="#252a2d"/>
    </pattern>
    <pattern id="padGrid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.09"/>
    </pattern>
  </defs>

  <g>
    ${inner}
    ${flecks}
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.55" style="mix-blend-mode:multiply"/>
    <rect width="${W}" height="${H}" fill="#0a2d4a" opacity="0.045"/>
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  </g>

  <g transform="translate(38 842)" opacity="0.78">
    <rect x="-12" y="-22" width="210" height="46" fill="#0b1d2b" opacity="0.55"/>
    <line x1="0" y1="0" x2="160" y2="0" stroke="#ffffff" stroke-width="2"/>
    <line x1="0" y1="-5" x2="0" y2="5" stroke="#ffffff" stroke-width="2"/>
    <line x1="80" y1="-4" x2="80" y2="4" stroke="#ffffff" stroke-width="2"/>
    <line x1="160" y1="-5" x2="160" y2="5" stroke="#ffffff" stroke-width="2"/>
    <text x="0" y="18" font-family="ui-monospace, monospace" font-size="10" fill="#ffffff" opacity="0.9">0</text>
    <text x="70" y="18" font-family="ui-monospace, monospace" font-size="10" fill="#ffffff" opacity="0.9">50 m</text>
    <text x="142" y="18" font-family="ui-monospace, monospace" font-size="10" fill="#ffffff" opacity="0.9">100 m</text>
  </g>
  <g transform="translate(1520 52)" opacity="0.72">
    <circle cx="0" cy="0" r="24" fill="#0b1d2b" opacity="0.45"/>
    <path d="M0 -17 L8 10 L0 5 L-8 10 Z" fill="#ffffff"/>
    <text x="-4" y="-27" font-family="ui-monospace, monospace" font-size="10" fill="#ffffff">N</text>
  </g>
  <text x="${W - 38}" y="${H - 30}" text-anchor="end" font-family="ui-monospace, monospace"
    font-size="11" letter-spacing="2" fill="#ffffff" opacity="0.45">EPA · WEBGIS · ${info}</text>
</svg>`;
};

const yardGround = (tone = '#7f868b') => `
  <rect width="${W}" height="${H}" fill="#565c60"/>
  <rect x="64" y="56" width="1472" height="788" fill="${tone}"/>
  <rect x="64" y="56" width="1472" height="788" fill="url(#padGrid)"/>
  <rect x="64" y="56" width="1472" height="788" fill="none" stroke="#4d555a" stroke-width="5"/>`;

const perimeter = () => `
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="#2c3236" stroke-width="14" opacity="0.9"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="#aab2b5" stroke-width="2" opacity="0.35"/>`;

const patioNorte = (variant) => {
  const rand = mulberry32(20260914);
  let s = yardGround('#858c90');
  s += perimeter();
  s += road('M -20 392 H 1620', 74, '#2f3438');
  s += road('M 780 -20 V 940', 66, '#2f3438');
  s += road('M -20 858 H 1620', 54, '#33383c');
  s += marking(1200, 390, 'PATIO NORTE', 34);
  s += marking(110, 700, 'P1', 64);
  s += marking(700, 760, 'P2', 64);
  s += arrow(280, 430, 0);
  s += arrow(1420, 430, 180);

  s += building(96, 96, 220, 108, '#c4c9cb');
  s += building(1250, 700, 280, 126, '#bfc5c7');

  const blocks = [
    [140, 150, 10, 4],
    [140, 232, 10, 4],
    [140, 520, 12, 4],
    [520, 150, 7, 4],
    [520, 520, 7, 4],
    [920, 150, 11, 4],
    [920, 232, 11, 4],
    [920, 520, 11, 4],
    [140, 660, 12, 3],
  ];
  for (const [x, y, c, r] of blocks) s += containerBlock(x, y, c, r, rand, 0.85);

  // Zona de camiones y grúa de patio.
  s += `<g transform="translate(1190 520)">
    <rect x="0" y="0" width="120" height="72" fill="#4a5156"/>
    <rect x="12" y="12" width="96" height="48" fill="#5f686d"/>
    <path d="M22 24 H92 M22 40 H92" stroke="#d3b03a" stroke-width="4" opacity="0.7"/>
  </g>`;
  s += truck(300, 408, '#e4e6e5');
  s += truck(380, 410, '#cdd4d7');
  s += truck(1190, 408, '#d8b13a');
  s += truck(1260, 410, '#e4e6e5');
  s += truck(830, 140, '#24548c', true);
  s += truck(830, 600, '#b33a2f', true);

  for (const [x, y] of [
    [700, 120],
    [700, 300],
    [700, 600],
    [1460, 120],
    [1460, 300],
    [1460, 600],
    [80, 330],
    [80, 830],
  ]) {
    s += lightPole(x, y);
  }

  if (variant === 'B') {
    // Cola de camiones, deterioro y residuos: cambios visibles al mover la cortina.
    s += truck(460, 410, '#e4e6e5');
    s += truck(540, 408, '#d8b13a');
    s += truck(620, 412, '#cfd6d9');
    s += truck(700, 408, '#b33a2f');
    s += truck(1020, 410, '#e4e6e5');
    s += pothole(920, 425, 1.6, 11);
    s += pothole(1100, 418, 1.15, 12);
    s += pothole(640, 620, 1.1, 13);
    s += crack(300, 470, 170, 8);
    s += crack(1040, 700, 220, -14);
    s += oilStain(1180, 690, 1.25, 21);
    s += debris(380, 640, 31, 20);
    s += debris(1340, 610, 32, 14);
    s += overlayContainers(920, 284, 11, ['#1f4e8c', '#9f3a2f', '#13736b', '#8c6a1f']);
    s += overlayContainers(140, 300, 10, ['#2f6b4f', '#a8562c', '#3f5d73', '#9f3a2f']);
    s += `<g transform="translate(960 690)">
      <rect x="0" y="0" width="188" height="66" fill="#5a6165" opacity="0.75"/>
      <path d="M8 12 H180 M8 30 H180 M8 48 H180" stroke="#d8b13a" stroke-width="3" opacity="0.55"/>
    </g>`;
  }

  return svgDoc(s, 1001, 'PATIO NORTE');
};

const patioSur = (variant) => {
  const rand = mulberry32(20260915);
  let s = yardGround('#7e8589');
  s += perimeter();
  s += road('M -20 486 H 1620', 80, '#2e3337');
  s += road('M 352 -20 V 940', 62, '#2e3337');
  s += road('M 1210 -20 V 940', 62, '#2e3337');
  s += marking(560, 470, 'PATIO SUR', 34);
  s += marking(80, 810, 'P3', 64);
  s += arrow(760, 520, 0);
  s += arrow(1050, 520, 0);

  // Línea férrea diagonal.
  s += `<g opacity="0.85">
    <path d="M -40 790 L 1650 690" stroke="#3b3f42" stroke-width="18" fill="none"/>
    <path d="M -40 784 L 1650 684" stroke="#d9d9d4" stroke-width="2" fill="none" opacity="0.45"/>
    <path d="M -40 796 L 1650 696" stroke="#d9d9d4" stroke-width="2" fill="none" opacity="0.45"/>
    ${Array.from({ length: 26 }, (_, i) => {
      const x = -20 + i * 64;
      const y = 792 - i * 3.9;
      return `<line x1="${x}" y1="${y - 9}" x2="${x + 9}" y2="${y + 9}" stroke="#4b4a45" stroke-width="5" opacity="0.8"/>`;
    }).join('')}
  </g>`;

  s += building(980, 350, 250, 92, '#c8cdcf');
  s += building(100, 730, 210, 92, '#c1c7c9');
  s += building(1320, 120, 180, 120, '#bcc3c5');

  const blocks = [
    [440, 110, 13, 4],
    [440, 194, 13, 4],
    [440, 560, 14, 4],
    [440, 644, 14, 4],
    [900, 110, 7, 4],
    [900, 560, 7, 4],
    [1310, 560, 6, 4],
  ];
  for (const [x, y, c, r] of blocks) s += containerBlock(x, y, c, r, rand, 0.82);

  s += truck(470, 502, '#e4e6e5');
  s += truck(560, 506, '#24548c');
  s += truck(900, 502, '#cfd6d9');
  s += truck(980, 506, '#d8b13a');
  s += truck(1135, 250, '#e4e6e5', true);
  s += truck(320, 700, '#b33a2f', true);

  for (const [x, y] of [
    [400, 70],
    [400, 460],
    [1260, 70],
    [1260, 460],
    [1260, 850],
    [80, 460],
  ]) {
    s += lightPole(x, y);
  }

  if (variant === 'B') {
    s += truck(820, 500, '#d8b13a');
    s += truck(1040, 502, '#e4e6e5');
    s += truck(1115, 500, '#cfd6d9');
    s += pothole(720, 515, 1.5, 41);
    s += pothole(1030, 522, 1.1, 42);
    s += pothole(560, 420, 1.2, 43);
    s += crack(880, 460, 240, 4);
    s += crack(150, 620, 160, -18);
    s += oilStain(800, 610, 1.3, 44);
    s += debris(680, 680, 45, 22);
    s += overlayContainers(440, 246, 13, ['#9f3a2f', '#2f6b4f', '#8c6a1f']);
    s += overlayContainers(900, 246, 7, ['#1f4e8c', '#a8562c', '#3f5d73']);
    s += `<g transform="translate(420 330)">
      <rect x="0" y="0" width="170" height="52" fill="#5d6468" opacity="0.6"/>
      <path d="M8 10 H160 M8 26 H160 M8 42 H160" stroke="#d8b13a" stroke-width="3" opacity="0.5"/>
    </g>`;
  }

  return svgDoc(s, 1002, 'PATIO SUR');
};

const muelle1 = (variant) => {
  const rand = mulberry32(20260916);
  let s = `<rect width="${W}" height="${H}" fill="url(#water)"/>`;
  // Ondulación del agua.
  s += `<g opacity="0.25" stroke="#bfe3ea" fill="none">
    ${Array.from({ length: 16 }, (_, i) => {
      const y = 22 + i * 23;
      return `<path d="M -20 ${y} Q 120 ${y - 8} 260 ${y} T 540 ${y} T 820 ${y} T 1100 ${y} T 1380 ${y} T 1660 ${y}" stroke-width="1.2"/>`;
    }).join('')}
  </g>`;

  // Muelle / explanada.
  s += `<rect x="0" y="378" width="${W}" height="${H - 378}" fill="#858c90"/>`;
  s += `<rect x="0" y="378" width="${W}" height="${H - 378}" fill="url(#padGrid)"/>`;
  s += `<rect x="0" y="370" width="${W}" height="26" fill="#b9bdbd"/>`;
  s += `<rect x="0" y="370" width="${W}" height="8" fill="url(#hazard)" opacity="0.85"/>`;
  s += `<rect x="0" y="378" width="${W}" height="6" fill="#2f3438" opacity="0.5"/>`;
  s += road('M -20 760 H 1620', 70, '#2f3438');
  s += marking(1090, 580, 'MUELLE 1', 34);

  // Buque atracado.
  s += `<g>
    <path d="M 250 120 L 1320 120 L 1380 160 L 1320 205 L 250 205 L 210 162 Z" fill="#24333c"/>
    <path d="M 250 120 L 1320 120 L 1380 160 L 1320 205 L 250 205 L 210 162 Z" fill="none" stroke="#0e1a21" stroke-width="4"/>
    <rect x="280" y="138" width="980" height="52" fill="#3b4a52"/>
    ${Array.from({ length: 24 }, (_, i) =>
      container(300 + i * 39, 146, 34, 11, pick(rand, CONTAINER_COLORS)),
    ).join('')}
    ${Array.from({ length: 17 }, (_, i) =>
      container(360 + i * 39, 164, 34, 11, pick(rand, CONTAINER_COLORS)),
    ).join('')}
    <rect x="1230" y="128" width="74" height="72" fill="#c9ced0"/>
    <rect x="1250" y="142" width="34" height="18" fill="#7d878c"/>
  </g>`;
  // Amarras.
  s += `<g stroke="#d9d4c3" stroke-width="2" opacity="0.7">
    <line x1="260" y1="205" x2="300" y2="382"/>
    <line x1="1320" y1="205" x2="1280" y2="382"/>
  </g>`;

  // Grúas pórtico (vista superior).
  const crane = (x) => `
    <g>
      <rect x="${x - 9}" y="300" width="18" height="220" fill="#c8a32c" opacity="0.9"/>
      <rect x="${x - 5}" y="300" width="10" height="220" fill="#e4bd3a"/>
      <rect x="${x - 120}" y="296" width="240" height="12" fill="#d6b033"/>
      <rect x="${x - 120}" y="296" width="240" height="5" fill="#f0d05f"/>
      <rect x="${x - 120}" y="308" width="14" height="26" fill="#5d4b16"/>
      <rect x="${x + 106}" y="308" width="14" height="26" fill="#5d4b16"/>
      <rect x="${x - 4}" y="330" width="8" height="44" fill="#3b3420"/>
      <rect x="${x - 26}" y="374" width="52" height="18" fill="#bfc4c5"/>
    </g>`;
  s += crane(560);
  s += crane(900);
  s += crane(1200);

  for (const x of [250, 430, 700, 980, 1260, 1480]) {
    s += bollard(x, 390);
  }

  s += building(90, 800, 260, 82, '#c3c8ca');
  s += building(1300, 800, 230, 82, '#bcc3c5');

  const blocks = [
    [180, 500, 12, 4],
    [180, 590, 12, 4],
    [700, 500, 12, 4],
    [700, 590, 12, 4],
    [1180, 500, 8, 4],
  ];
  for (const [x, y, c, r] of blocks) s += containerBlock(x, y, c, r, rand, 0.84);

  s += truck(380, 775, '#e4e6e5');
  s += truck(470, 778, '#cfd6d9');
  s += truck(1080, 778, '#24548c');
  s += truck(640, 440, '#d8b13a', true);

  for (const [x, y] of [
    [400, 430],
    [820, 430],
    [1100, 430],
    [1450, 430],
    [1450, 700],
  ]) {
    s += lightPole(x, y);
  }

  if (variant === 'B') {
    s += overlayContainers(300, 186, 18, ['#9f3a2f', '#1f4e8c', '#8c6a1f', '#13736b']);
    s += overlayContainers(180, 640, 12, ['#2f6b4f', '#a8562c', '#3f5d73']);
    s += oilStain(600, 690, 1.5, 61);
    s += oilStain(1110, 610, 1.1, 62);
    s += pothole(900, 782, 1.5, 63);
    s += pothole(520, 730, 1.15, 64);
    s += crack(1000, 700, 220, 10);
    s += debris(760, 690, 65, 20);
    s += truck(1180, 778, '#b33a2f');
    s += truck(1260, 780, '#e4e6e5');
    s += truck(1020, 780, '#d8b13a');
    s += `<g transform="translate(280 470)">
      <rect x="0" y="0" width="150" height="22" fill="#d8b13a" opacity="0.7"/>
      <text x="8" y="16" font-family="ui-monospace, monospace" font-size="12" fill="#232323" opacity="0.9">ZONA RESTRINGIDA</text>
    </g>`;
  }

  return svgDoc(s, 1003, 'MUELLE 1');
};

const accesoVial = (variant) => {
  const rand = mulberry32(20260917);
  let s = `<rect width="${W}" height="${H}" fill="#5d6357"/>`;
  // Terreno y parcelas.
  s += `<rect x="0" y="0" width="430" height="900" fill="#646b5c"/>`;
  s += `<rect x="1180" y="0" width="420" height="900" fill="#5a6055"/>`;
  s += `<rect x="60" y="80" width="320" height="240" fill="#6f7566" opacity="0.8"/>`;
  s += `<rect x="1220" y="520" width="320" height="280" fill="#6c7263" opacity="0.8"/>`;
  s += road('M -40 610 C 300 600 340 300 720 290 S 1180 430 1660 380', 118, '#2e3337');
  s += road('M 1100 -40 C 1120 250 1290 330 1600 320', 70, '#34393d');
  // Rotonda.
  s += `<circle cx="1180" cy="430" r="132" fill="#2e3337"/>`;
  s += `<circle cx="1180" cy="430" r="132" fill="none" stroke="#e9ecec" stroke-width="2" stroke-dasharray="18 16" opacity="0.45"/>`;
  s += `<circle cx="1180" cy="430" r="74" fill="#5f6a51"/>`;
  s += tree(1180, 430, 22);
  s += tree(1148, 452, 15);
  // Acceso y garita.
  s += building(240, 220, 250, 86, '#c6cbcd');
  s += `<rect x="240" y="330" width="250" height="54" fill="#3a4044"/>`;
  s += `<rect x="250" y="338" width="230" height="38" fill="url(#hazard)" opacity="0.55"/>`;
  s += `<g transform="translate(250 360)">
    <rect x="0" y="0" width="230" height="12" fill="#d8d8d3" opacity="0.7"/>
    <rect x="0" y="0" width="230" height="3" fill="#ffffff" opacity="0.8"/>
  </g>`;
  s += `<rect x="500" y="240" width="24" height="24" fill="#d8b13a"/>`;
  s += `<text x="506" y="258" font-family="ui-monospace, monospace" font-size="12" fill="#222">A1</text>`;
  s += marking(760, 560, 'ACCESO VIAL', 36, -2);
  s += arrow(520, 570, 0);
  s += arrow(960, 415, 0);

  // Estacionamientos y camiones.
  s += `<rect x="70" y="690" width="420" height="150" fill="#454b4f" opacity="0.85"/>`;
  s += `<g stroke="#d9dcdc" stroke-width="2" opacity="0.35">
    ${Array.from({ length: 8 }, (_, i) => `<line x1="${84 + i * 50}" y1="700" x2="${84 + i * 50}" y2="830"/>`).join('')}
  </g>`;
  s += truck(100, 716, '#e4e6e5');
  s += truck(170, 716, '#d8b13a');
  s += truck(240, 716, '#24548c');
  s += truck(380, 716, '#cfd6d9');

  s += truck(600, 590, '#e4e6e5');
  s += truck(700, 570, '#cfd6d9');
  s += truck(840, 520, '#24548c');
  s += truck(1000, 470, '#d8b13a');
  s += truck(1300, 330, '#e4e6e5', false);

  for (const [x, y] of [
    [180, 500],
    [520, 690],
    [760, 180],
    [1100, 700],
    [1420, 210],
    [1480, 780],
  ]) {
    s += lightPole(x, y);
  }
  for (const [x, y] of [
    [90, 380],
    [360, 430],
    [80, 560],
    [1440, 600],
    [1500, 120],
    [1130, 760],
    [670, 760],
  ]) {
    s += tree(x, y, 14);
  }

  if (variant === 'B') {
    s += truck(740, 555, '#e4e6e5');
    s += truck(920, 495, '#b33a2f');
    s += truck(1090, 450, '#e4e6e5');
    s += truck(1210, 420, '#cfd6d9');
    s += pothole(680, 620, 1.7, 71);
    s += pothole(880, 500, 1.4, 72);
    s += pothole(1340, 350, 1.2, 73);
    s += crack(520, 640, 260, -3);
    s += crack(1080, 380, 160, 18);
    s += debris(430, 630, 74, 18);
    s += oilStain(940, 600, 1.2, 75);
    s += `<g opacity="0.5" stroke="#20262a" stroke-width="5" fill="none">
      <path d="M 600 690 C 720 660 860 670 980 620"/>
      <path d="M 610 700 C 730 670 870 680 990 630"/>
    </g>`;
  }

  return svgDoc(s, 1004, 'ACCESO VIAL');
};

const zeapC = (variant) => {
  const rand = mulberry32(20260918);
  let s = `<rect width="${W}" height="${H}" fill="#716b58"/>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#6b6654"/>`;
  // Manchas de terreno.
  const randGround = mulberry32(909);
  for (let i = 0; i < 40; i += 1) {
    const x = randGround() * W;
    const y = randGround() * H;
    const r = 20 + randGround() * 120;
    s += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.45}" fill="${pick(randGround, ['#78725d', '#615c4d', '#7d7661'])}" opacity="0.35"/>`;
  }
  // Explanadas de grava.
  s += `<rect x="120" y="120" width="600" height="300" fill="#8a8575" opacity="0.9"/>`;
  s += `<rect x="120" y="120" width="600" height="300" fill="url(#padGrid)" opacity="0.5"/>`;
  s += `<rect x="900" y="470" width="560" height="300" fill="#8d8878" opacity="0.85"/>`;
  s += `<rect x="900" y="470" width="560" height="300" fill="url(#padGrid)" opacity="0.5"/>`;
  s += road('M -40 710 C 360 690 420 380 860 350 S 1280 220 1660 200', 90, '#34383a');
  s += road('M 820 -40 C 840 220 980 330 1220 420 S 1480 640 1500 940', 60, '#393d3f');
  s += marking(250, 400, 'ZEAP · SECTOR C', 40);
  s += arrow(500, 680, -8);
  s += arrow(980, 365, -8);
  s += building(1250, 90, 240, 130, '#c2c6c5');
  s += building(700, 750, 280, 96, '#bcc1c0');
  s += building(1000, 790, 120, 54, '#b4b9b8');

  // Contenedores en patio de grava.
  const blocks = [
    [160, 160, 12, 4],
    [160, 244, 12, 4],
    [940, 520, 10, 4],
  ];
  for (const [x, y, c, r] of blocks) s += containerBlock(x, y, c, r, rand, 0.8);

  // Camiones en bermas.
  s += truck(500, 160, '#e4e6e5');
  s += truck(570, 162, '#cfd6d9');
  s += truck(640, 160, '#24548c');
  s += truck(940, 230, '#e4e6e5', true);
  s += truck(990, 230, '#d8b13a', true);
  s += truck(1040, 235, '#e4e6e5', true);
  s += truck(260, 760, '#e4e6e5');
  s += truck(330, 764, '#b33a2f');
  s += truck(400, 760, '#cfd6d9');
  s += truck(1380, 680, '#e4e6e5');
  s += truck(1420, 760, '#d8b13a');
  s += truck(1380, 840, '#24548c');

  for (const [x, y] of [
    [100, 100],
    [780, 140],
    [780, 460],
    [1470, 400],
    [860, 700],
    [100, 850],
    [1520, 840],
  ]) {
    s += lightPole(x, y);
  }
  for (const [x, y] of [
    [60, 520],
    [820, 600],
    [1560, 300],
    [760, 240],
  ]) {
    s += tree(x, y, 16);
  }

  if (variant === 'B') {
    // Ocupación de bermas y deterioro del terreno.
    s += truck(940, 310, '#e4e6e5', true);
    s += truck(990, 310, '#b33a2f', true);
    s += truck(1040, 310, '#e4e6e5', true);
    s += truck(1090, 310, '#d8b13a', true);
    s += truck(1140, 315, '#cfd6d9', true);
    s += truck(1380, 760, '#e4e6e5');
    s += truck(1420, 840, '#b33a2f');
    s += pothole(680, 700, 1.6, 81);
    s += pothole(900, 760, 1.2, 82);
    s += pothole(1240, 620, 1.1, 83);
    s += crack(400, 660, 240, 6);
    s += crack(1050, 700, 200, -8);
    s += debris(760, 560, 84, 24);
    s += debris(1300, 500, 85, 18);
    s += oilStain(560, 590, 1.3, 86);
    s += `<g opacity="0.45" stroke="#4c4738" stroke-width="6" fill="none">
      <path d="M 1100 200 C 1180 300 1160 420 1240 520"/>
      <path d="M 1120 200 C 1200 300 1180 420 1260 520"/>
      <path d="M 420 500 C 520 540 600 620 700 660"/>
    </g>`;
  }

  return svgDoc(s, 1005, 'ZEAP SECTOR C');
};

const images = {
  'patio-norte-a': patioNorte('A'),
  'patio-norte-b': patioNorte('B'),
  'patio-sur-a': patioSur('A'),
  'patio-sur-b': patioSur('B'),
  'muelle-1-a': muelle1('A'),
  'muelle-1-b': muelle1('B'),
  'acceso-vial-a': accesoVial('A'),
  'acceso-vial-b': accesoVial('B'),
  'zeap-c-a': zeapC('A'),
  'zeap-c-b': zeapC('B'),
};

for (const [name, svg] of Object.entries(images)) {
  writeFileSync(join(outDir, `aerial-${name}.svg`), svg, 'utf8');
}

console.log(`Generados ${Object.keys(images).length} ortomosaicos simulados en ${outDir}`);
