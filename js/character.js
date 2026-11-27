// 박사급 연구원 픽클 캐릭터 — 순수 SVG, 상태별 모션은 CSS(.char ...)가 담당합니다.

import { hash, shade, esc } from './util.js';

export const PALETTE = [
  { name: '파랑', hex: '#6f9cf5' },
  { name: '민트', hex: '#57c6a4' },
  { name: '보라', hex: '#a78bfa' },
  { name: '앰버', hex: '#f0b04c' },
  { name: '로즈', hex: '#ef7f9a' },
  { name: '그린', hex: '#8dc06a' },
  { name: '청록', hex: '#54bcd4' },
  { name: '코랄', hex: '#ef8a63' },
];

export const STATES = {
  reading: { label: '논문 리딩 중', short: '리딩', icon: '📖', color: '#e8c07a' },
  typing: { label: '자료 타이핑 중', short: '타이핑', icon: '⌨️', color: '#8fb8ff' },
  experiment: { label: '실험 중', short: '실험', icon: '🧪', color: '#8fd9b6' },
  filing: { label: '자료 정리 중', short: '정리', icon: '🗂️', color: '#f0a97a' },
  rest: { label: '휴식 중', short: '휴식', icon: '☕', color: '#c9b6e8' },
};

export const STATE_ORDER = ['reading', 'typing', 'experiment', 'filing', 'rest'];

export const DEFAULT_ACCESSORIES = {
  glasses: true,
  cap: false,
  tie: true,
  mug: true,
};

const SKIN = '#f3cda8';
const SKIN_D = '#e0b087';
const SKIN_LINE = '#c8936a';
const COAT = '#f7f2e7';
const COAT_D = '#e6dfd0';
const COAT_DD = '#d0c6b3';

function hairMarkup(style, hair, hairD, hairL) {
  const base = `<path d="M84 96c-2-32 15-54 36-54s38 22 36 54c-3-12-6-20-10-25-10 5-24 6-34 4-10-2-16-6-19-12-4 6-7 18-9 33z" fill="${hair}"/>`;
  if (style === 0) {
    return `${base}
      <path d="M96 68c5-13 14-21 26-21 8 0 15 3 20 8-9-1-17 1-23 5-5 3-9 7-12 12-3-2-7-3-11-4z" fill="${hairL}" opacity=".38"/>
      <path d="M105 50c-4 5-6 10-7 16 5-4 10-6 16-7z" fill="${hairD}" opacity=".38"/>
      <path d="M118 43c-2-4-1-8 2-10 1 4 2 7 1 10z" fill="${hair}"/>
      <path d="M84 82c-3 7-4 14-3 22 4 0 6-3 6-7 0-6-1-11-3-15z" fill="${hair}"/>
      <path d="M156 82c3 7 4 14 3 22-4 0-6-3-6-7 0-6 1-11 3-15z" fill="${hair}"/>`;
  }
  return `${base}
    <circle cx="94" cy="67" r="11" fill="${hair}"/>
    <circle cx="110" cy="53" r="12" fill="${hair}"/>
    <circle cx="131" cy="52" r="12" fill="${hair}"/>
    <circle cx="148" cy="67" r="10" fill="${hair}"/>
    <circle cx="103" cy="59" r="7" fill="${hairL}" opacity=".28"/>
    <path d="M84 82c-3 7-4 14-3 22 4 0 6-3 6-7 0-6-1-11-3-15z" fill="${hair}"/>
    <path d="M156 82c3 7 4 14 3 22-4 0-6-3-6-7 0-6 1-11 3-15z" fill="${hair}"/>`;
}

function glassesMarkup() {
  return `<g class="glasses" fill="rgba(180,215,245,.10)" stroke="#3b2e26" stroke-width="3.2" stroke-linejoin="round">
    <rect x="91" y="83" width="29" height="23" rx="8"/>
    <rect x="128" y="83" width="29" height="23" rx="8"/>
    <path d="M120 91h8" fill="none"/>
    <path d="M91 90l-8-3" fill="none"/>
    <path d="M157 90l8-3" fill="none"/>
  </g>`;
}

function capMarkup() {
  return `<g class="grad-cap">
    <path d="M88 60c7-11 18-17 32-17s25 6 32 17v7H88z" fill="#272320"/>
    <path d="M120 18l67 27-67 27-67-27z" fill="#2e2823" stroke="#1a1613" stroke-width="2"/>
    <path d="M120 25l53 20-53 20-53-20z" fill="#3b332c" opacity=".55"/>
    <circle cx="120" cy="45" r="4" fill="#151210"/>
    <path d="M187 45c6 8 8 20 5 30" fill="none" stroke="#d9b26a" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="192" cy="78" r="4.5" fill="#e8c07a"/>
  </g>`;
}

function tieMarkup(tie, enabled) {
  if (!enabled) {
    return `<path d="M120 148l-11 18 11 10 11-10z" fill="${SKIN_D}" opacity=".55"/>`;
  }
  return `<g class="tie">
    <path d="M120 148l-7 9 7 8 7-8z" fill="${tie}"/>
    <path d="M113 157h14l-3 46-4 9-4-9z" fill="${tie}"/>
    <path d="M113 157h14l-2 8h-10z" fill="${shade(tie, -0.18)}"/>
  </g>`;
}

function headMarkup(profile, closed) {
  const acc = { ...DEFAULT_ACCESSORIES, ...(profile.accessories || {}) };
  const color = profile.color || PALETTE[0].hex;
  const style = hash(profile.name || profile.initial || 'pickle') % 2;
  const hair = color;
  const hairD = shade(color, -0.34);
  const hairL = shade(color, 0.32);
  return `<g class="head-group">
    <path d="M120 42c21 0 36 17 36 42 0 29-16 50-36 50s-36-21-36-50c0-25 15-42 36-42z" fill="${SKIN}"/>
    <path d="M120 42c-13 0-24 6-30 17 9-4 19-6 30-6s21 2 30 6c-6-11-17-17-30-17z" fill="#000" opacity=".045"/>
    ${hairMarkup(style, hair, hairD, hairL)}
    <circle cx="84" cy="99" r="9" fill="${SKIN}"/>
    <circle cx="84" cy="99" r="4" fill="${SKIN_D}" opacity=".5"/>
    <circle cx="156" cy="99" r="9" fill="${SKIN}"/>
    <circle cx="156" cy="99" r="4" fill="${SKIN_D}" opacity=".5"/>
    <path d="M92 78q11-6 22-2" stroke="#4a3527" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M126 76q11-4 22 2" stroke="#4a3527" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <g class="eyes ${closed ? 'is-closed' : ''}">
      <ellipse cx="106" cy="96" rx="3.6" ry="4.6" fill="#2c221c"/>
      <ellipse cx="134" cy="96" rx="3.6" ry="4.6" fill="#2c221c"/>
      <circle cx="107.4" cy="94.2" r="1.25" fill="#fff" opacity=".9"/>
      <circle cx="135.4" cy="94.2" r="1.25" fill="#fff" opacity=".9"/>
      <rect class="lid" x="101" y="90.5" width="10" height="11" rx="3.5" fill="${SKIN}"/>
      <rect class="lid" x="129" y="90.5" width="10" height="11" rx="3.5" fill="${SKIN}"/>
    </g>
    <path d="M120 104c2 4 2 7-1 9" stroke="${SKIN_LINE}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M111 120q9 6 18 0" stroke="#a9604f" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="94" cy="112" rx="7" ry="4" fill="#dd8f74" opacity=".2"/>
    <ellipse cx="146" cy="112" rx="7" ry="4" fill="#dd8f74" opacity=".2"/>
    ${acc.glasses ? glassesMarkup() : ''}
    ${acc.cap ? capMarkup() : ''}
  </g>`;
}

function steamMarkup(x, y) {
  return `<g class="steam" stroke="#efe6d2" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8">
    <path class="s1" d="M${x} ${y}c-4-6 4-9 0-15"/>
    <path class="s2" d="M${x + 6} ${y}c-4-7 4-10 0-16"/>
    <path class="s3" d="M${x + 12} ${y}c-4-6 4-9 0-14"/>
  </g>`;
}

function stateBody(state, color) {
  const tie = shade(color, -0.22);
  const sleeve = (d) => `<path d="${d}" fill="none" stroke="${COAT_DD}" stroke-width="27" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${COAT}" stroke-width="22" stroke-linecap="round"/>`;
  const cuff = (d) => `<path d="${d}" fill="none" stroke="${COAT_DD}" stroke-width="23" stroke-linecap="butt" opacity=".5"/>`;
  const hand = (cx, cy, rot = 0) => `<ellipse class="hand" cx="${cx}" cy="${cy}" rx="7.2" ry="9.2" fill="${SKIN}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const handSmall = (cx, cy, rot = 0) => `<ellipse class="hand" cx="${cx}" cy="${cy}" rx="7.4" ry="5.6" fill="${SKIN}" transform="rotate(${rot} ${cx} ${cy})"/>`;

  if (state === 'typing') {
    return `
      <g class="arms">${sleeve('M88 174C73 204 75 236 92 250')}${sleeve('M152 174C167 204 165 236 148 250')}</g>
      <g class="keyboard">
        <rect x="79" y="252" width="82" height="15" rx="3" fill="#3b332b"/>
        <path d="M84 257h72M84 261h72" stroke="#6d5d49" stroke-width="1.5"/>
        <path d="M86 255h4M94 255h4M102 255h4M110 255h4M118 255h4M126 255h4M134 255h4M142 255h4" stroke="#8b7658" stroke-width="1.2"/>
      </g>
      <g class="typing-hands">
        ${handSmall(96, 248, -8)}${handSmall(144, 248, 8)}
        <path d="M92 250v4M96 250v4M100 250v4M140 250v4M144 250v4M148 250v4" stroke="${SKIN_LINE}" stroke-width="1.3" stroke-linecap="round"/>
      </g>`;
  }

  if (state === 'experiment') {
    return `
      <g class="arms">${sleeve('M88 174C74 192 76 208 100 216')}${sleeve('M152 174C166 200 162 226 142 236')}</g>
      <g class="flask">
        <path d="M108 196h16v14l15 30c2 5-1 9-6 9H99c-5 0-8-4-6-9l15-30z" fill="rgba(214,240,235,.30)" stroke="#9fc9c1" stroke-width="2"/>
        <path d="M100 232l8-14h16l11 25c1 3-1 5-4 5H104c-3 0-5-2-4-5z" fill="#8fd9b6" opacity=".92"/>
        <circle class="bubble b1" cx="112" cy="242" r="2.2" fill="#eafff4"/>
        <circle class="bubble b2" cx="119" cy="238" r="1.7" fill="#eafff4"/>
        <circle class="bubble b3" cx="108" cy="238" r="1.4" fill="#eafff4"/>
        <path d="M104 196h24" stroke="#7fb3aa" stroke-width="3" stroke-linecap="round"/>
      </g>
      <g class="hands">${hand(102, 218, -18)}${hand(140, 238, 22)}</g>
      <g class="goggle-strap"><path d="M84 92h-7M156 92h7" stroke="#3b2e26" stroke-width="3"/></g>`;
  }

  if (state === 'filing') {
    return `
      <g class="arms">${sleeve('M88 174C74 194 76 212 90 224')}${sleeve('M152 174C166 194 164 212 150 224')}</g>
      <g class="folders">
        <g transform="rotate(-2 120 220)">
          <rect x="91" y="192" width="58" height="13" rx="2" fill="#e8d6ae"/>
          <rect x="86" y="205" width="68" height="13" rx="2" fill="${shade(color, -0.06)}"/>
          <rect x="91" y="218" width="58" height="13" rx="2" fill="#d8c299"/>
          <rect x="98" y="196" width="44" height="6" rx="1" fill="#fbf7ea" opacity=".85"/>
          <rect x="94" y="209" width="52" height="5" rx="1" fill="#fbf7ea" opacity=".55"/>
          <path d="M100 211h30M104 222h24" stroke="#b9a681" stroke-width="1.4"/>
        </g>
      </g>
      <g class="hands">${hand(91, 226, -14)}${hand(149, 226, 14)}</g>`;
  }

  if (state === 'rest') {
    return `
      <g class="arms">${sleeve('M88 174C72 206 76 240 96 252')}${sleeve('M152 174C168 188 166 208 148 218')}</g>
      <g class="mug">
        <rect x="133" y="196" width="25" height="28" rx="5" fill="#eae1cf" stroke="#c9bda6" stroke-width="1.5"/>
        <path d="M158 204c8 2 8 12 0 14" fill="none" stroke="#c9bda6" stroke-width="3"/>
        <ellipse cx="145.5" cy="198" rx="10" ry="3.2" fill="#4a2f22"/>
        <ellipse cx="145.5" cy="197.5" rx="7.5" ry="2" fill="#6b4630"/>
        ${steamMarkup(140, 192)}
      </g>
      <g class="hands">${hand(96, 254, 0)}${hand(146, 220, 20)}</g>
      <g class="zzz" fill="#e8dcc4" font-family="Georgia, serif" font-style="italic">
        <text class="z1" x="168" y="132" font-size="15">z</text>
        <text class="z2" x="178" y="118" font-size="19">z</text>
      </g>`;
  }

  // reading (default)
  return `
    <g class="arms">${sleeve('M88 174C72 192 74 202 88 208')}${sleeve('M152 174C166 204 160 228 136 240')}</g>
    <g class="paper">
      <g transform="rotate(-4 118 220)">
        <rect x="80" y="180" width="60" height="82" rx="2" fill="#fbf7ea" stroke="#dcd2bd" stroke-width="1.2"/>
        <rect x="87" y="189" width="32" height="4" rx="2" fill="#8f8674"/>
        <path d="M87 200h46M87 207h46M87 214h38M87 221h46M87 228h42" stroke="#bdb4a0" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M87 239l8-6 7 5 8-9 8 7" stroke="#7c9a86" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle cx="128" cy="197" r="6" fill="none" stroke="#b8604f" stroke-width="1.4" opacity=".7"/>
        <path d="M124 197l3 3 5-6" stroke="#b8604f" stroke-width="1.4" fill="none" opacity=".7"/>
        <path d="M134 250l8 9" stroke="#b8604f" stroke-width="2.4" stroke-linecap="round"/>
      </g>
    </g>
    <g class="hands">${hand(88, 206, -20)}${hand(136, 242, 18)}</g>`;
}

export function characterSVG(profile = {}, opts = {}) {
  const color = profile.color || PALETTE[0].hex;
  const state = STATES[opts.state || profile.state] ? (opts.state || profile.state) : 'reading';
  const closed = state === 'rest';
  const faceOnly = opts.crop === 'face';
  const viewBox = faceOnly ? '70 32 100 106' : '0 0 240 320';
  const className = `pickle-char state-${state}${opts.className ? ` ${opts.className}` : ''}`;
  const acc = { ...DEFAULT_ACCESSORIES, ...(profile.accessories || {}) };

  if (faceOnly) {
    return `<svg class="${className}" viewBox="${viewBox}" role="img" aria-label="${esc(profile.name || '연구원')} 프로필">
      ${headMarkup(profile, closed)}
    </svg>`;
  }

  return `<svg class="${className}" viewBox="${viewBox}" role="img" aria-label="${esc(profile.name || '연구원')} 연구원 캐릭터">
    <g class="chair">
      <rect x="64" y="184" width="112" height="124" rx="26" fill="#33231b"/>
      <rect x="72" y="192" width="96" height="110" rx="22" fill="#453027" opacity=".55"/>
      <path d="M74 186h92" stroke="#5a3f30" stroke-width="5" stroke-linecap="round"/>
      <circle cx="98" cy="216" r="2" fill="#241711" opacity=".6"/>
      <circle cx="120" cy="211" r="2" fill="#241711" opacity=".6"/>
      <circle cx="142" cy="216" r="2" fill="#241711" opacity=".6"/>
    </g>
    <g class="breathe">
      <path d="M120 138c-15 0-28 5-37 15-5 6-8 13-10 22l-7 87h108l-7-87c-2-9-5-16-10-22-9-10-22-15-37-15z" fill="${COAT}"/>
      <path d="M148 146c8 8 12 18 14 30l7 86h-22z" fill="${COAT_D}" opacity=".55"/>
      <path d="M120 145l-17 34 17 33 17-33z" fill="#fdfaf3"/>
      <path d="M120 149l-13 30 13 8 13-8z" fill="#fff"/>
      ${tieMarkup(shade(color, -0.22), acc.tie)}
      <path d="M120 142l-23 38 11 8 15-27z" fill="#fffdf7" stroke="${COAT_D}" stroke-width="1.2"/>
      <path d="M120 142l23 38-11 8-15-27z" fill="#fffdf7" stroke="${COAT_D}" stroke-width="1.2"/>
      <path d="M101 141l-9 13 15 9 10-15z" fill="#fbf8f1" stroke="${COAT_D}" stroke-width="1"/>
      <path d="M139 141l9 13-15 9-10-15z" fill="#fbf8f1" stroke="${COAT_D}" stroke-width="1"/>
      <rect x="77" y="196" width="26" height="21" rx="3" fill="${COAT_D}"/>
      <path d="M77 203h26" stroke="${COAT_DD}" stroke-width="1.4"/>
      <rect x="84" y="188" width="3" height="14" rx="1.5" fill="${shade(color, -0.05)}"/>
      <rect x="90" y="186" width="3" height="16" rx="1.5" fill="#57463a"/>
      <g class="id-badge">
        <rect x="136" y="192" width="30" height="42" rx="3" fill="#fbf7ea" stroke="#d8cdb7"/>
        <rect x="136" y="192" width="30" height="7" rx="3" fill="${color}"/>
        <rect x="141" y="204" width="9" height="10" rx="2" fill="${shade(color, 0.45)}"/>
        <path d="M153 206h9M153 211h9M153 216h6" stroke="#b8ab94" stroke-width="1.4"/>
        <text x="151" y="231" text-anchor="middle" font-size="10" font-weight="700" fill="${shade(color, -0.42)}" font-family="sans-serif">${esc(profile.initial || 'ㅂ')}</text>
      </g>
      ${stateBody(state, color)}
      <g class="neck"><path d="M110 128h20v16c0 4-20 4-20 0z" fill="${SKIN_D}"/></g>
      <g class="head-sway">${headMarkup(profile, closed)}</g>
    </g>
  </svg>`;
}

export function faceSVG(profile = {}) {
  return characterSVG(profile, { crop: 'face' });
}
