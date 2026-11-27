// 논문 연구실 배경 — 어두운 원목, 칠판, 창문, 책장, 파일 캐비닛, 스탠드 조명.

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function backdropSVG() {
  const rand = seeded(20261127);
  const bookColors = ['#7d3f35', '#3f5a4c', '#33465e', '#8a6a34', '#d8c9a8', '#6a4a5e', '#4e5e3c', '#8f4f3a', '#2f4a52', '#a98447'];
  const rows = [
    { y: 108, h: 118 },
    { y: 238, h: 118 },
    { y: 368, h: 88 },
  ];
  let books = '';
  rows.forEach((row, ri) => {
    let x = 1156;
    const maxX = 1426 - (ri === 2 ? 30 : 0);
    while (x < maxX) {
      const w = 10 + Math.floor(rand() * 12);
      const h = row.h - 18 - Math.floor(rand() * 26);
      const tilt = rand() > 0.9 ? -8 : 0;
      const color = bookColors[Math.floor(rand() * bookColors.length)];
      const y = row.y + row.h - 6 - h;
      books += `<g transform="rotate(${tilt} ${x + w / 2} ${y + h})">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${color}"/>
        <rect x="${x + 2}" y="${y + 8}" width="${w - 4}" height="2" fill="#f4e6c8" opacity=".35"/>
        <rect x="${x + 2}" y="${y + h - 14}" width="${w - 4}" height="2" fill="#f4e6c8" opacity=".25"/>
      </g>`;
      x += w + 2 + Math.floor(rand() * 4);
    }
  });

  const floorLines = [-700, -420, -160, 90, 330, 570, 810, 1050, 1290, 1530, 1770, 2010, 2250]
    .map((x) => `<path d="M768 642 L${x} 864"/>`)
    .join('');

  const rain = Array.from({ length: 26 }, (_, i) => {
    const x = 104 + ((i * 37) % 262);
    const y = 146 + ((i * 67) % 236);
    const len = 10 + ((i * 13) % 22);
    return `<line class="rain-line" x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + len}" style="animation-delay:${(i % 7) * 0.22}s"/>`;
  }).join('');

  const bulbs = [
    [60, 46], [180, 61], [300, 68], [420, 68], [540, 64], [660, 60], [780, 56],
    [900, 53], [1020, 50], [1140, 47], [1260, 43], [1380, 39], [1500, 38],
  ].map(([x, y], i) => `<g class="bulb" style="animation-delay:${(i % 5) * 0.7}s">
    <circle cx="${x}" cy="${y}" r="9" fill="#f4bf74" opacity=".13"/>
    <circle cx="${x}" cy="${y}" r="3.2" fill="#f6cf8c"/>
  </g>`).join('');

  const city = Array.from({ length: 16 }, (_, i) => {
    const w = 14 + (i % 4) * 6;
    const h = 18 + ((i * 29) % 44);
    const x = 104 + i * 17;
    const y = 390 - h;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0c1526"/>
      <rect x="${x + 3}" y="${y + 5}" width="2" height="3" fill="#f0c27b" opacity=".75"/>
      <rect x="${x + 8}" y="${y + 11}" width="2" height="3" fill="#f0c27b" opacity=".45"/>`;
  }).join('');

  return `<svg class="backdrop-svg" viewBox="0 0 1536 864" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#241a14"/>
        <stop offset=".55" stop-color="#2c2018"/>
        <stop offset="1" stop-color="#34261c"/>
      </linearGradient>
      <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a1b12"/>
        <stop offset="1" stop-color="#150d09"/>
      </linearGradient>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#081020"/>
        <stop offset=".65" stop-color="#152843"/>
        <stop offset="1" stop-color="#273e5c"/>
      </linearGradient>
      <radialGradient id="lampGlow" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#f6c17a" stop-opacity=".55"/>
        <stop offset=".55" stop-color="#e9a95c" stop-opacity=".18"/>
        <stop offset="1" stop-color="#e9a95c" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="windowGlow" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#9dc4ef" stop-opacity=".22"/>
        <stop offset="1" stop-color="#9dc4ef" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="boardGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#22372d"/>
        <stop offset=".55" stop-color="#1d3027"/>
        <stop offset="1" stop-color="#182a22"/>
      </linearGradient>
      <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#59605a"/>
        <stop offset="1" stop-color="#3b423d"/>
      </linearGradient>
      <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="16"/>
      </filter>
      <clipPath id="winClip"><rect x="98" y="140" width="276" height="276" rx="2"/></clipPath>
    </defs>

    <!-- wall -->
    <rect width="1536" height="642" fill="url(#wallGrad)"/>
    <g opacity=".05" stroke="#f4dfc4" stroke-width="1">
      <path d="M0 90h1536M0 210h1536M0 330h1536M0 450h1536" opacity=".4"/>
    </g>
    <g opacity=".06" fill="#0b0705">
      <path d="M120 0h90l-30 642h-90zM980 0h60l20 642h-52z"/>
    </g>

    <!-- string lights -->
    <path d="M-20 24C300 96 620 78 900 46S1320 8 1556 42" fill="none" stroke="#3a2a1c" stroke-width="2"/>
    ${bulbs}

    <!-- wainscoting -->
    <rect y="516" width="1536" height="126" fill="#2a1a11"/>
    <rect y="506" width="1536" height="14" fill="#4a3020"/>
    <rect y="506" width="1536" height="3" fill="#6d492d" opacity=".7"/>
    <g fill="none" stroke="#3b2517" stroke-width="2">
      ${Array.from({ length: 9 }, (_, i) => `<rect x="${34 + i * 170}" y="532" width="148" height="86" rx="3"/>`).join('')}
    </g>
    <rect y="632" width="1536" height="12" fill="#160e09"/>

    <!-- floor -->
    <rect y="642" width="1536" height="222" fill="url(#floorGrad)"/>
    <g stroke="#0d0806" stroke-width="2" opacity=".55">${floorLines}</g>
    <g stroke="#4a3220" stroke-width="1.6" opacity=".28">
      <path d="M0 700h1536M0 758h1536M0 820h1536"/>
    </g>
    <ellipse cx="768" cy="792" rx="548" ry="136" fill="#3b2419" opacity=".82"/>
    <ellipse cx="768" cy="792" rx="548" ry="136" fill="none" stroke="#6a4630" stroke-width="6" opacity=".45"/>
    <ellipse cx="768" cy="792" rx="500" ry="112" fill="none" stroke="#6a4630" stroke-width="2" opacity=".35" stroke-dasharray="10 12"/>

    <!-- blackboard -->
    <g class="blackboard">
      <rect x="416" y="52" width="704" height="366" rx="10" fill="#3b2416" stroke="#1b0f08" stroke-width="3"/>
      <rect x="430" y="66" width="676" height="322" rx="6" fill="#4a2e1c"/>
      <rect x="438" y="74" width="660" height="306" rx="4" fill="url(#boardGrad)"/>
      <ellipse cx="610" cy="300" rx="180" ry="46" fill="#e9e4d4" opacity=".028"/>
      <ellipse cx="950" cy="160" rx="130" ry="34" fill="#e9e4d4" opacity=".022"/>
      <ellipse cx="860" cy="350" rx="90" ry="18" fill="#e9e4d4" opacity=".02"/>
      <rect x="412" y="416" width="712" height="17" rx="4" fill="#54351f"/>
      <rect x="412" y="416" width="712" height="4" fill="#7a5433"/>
      <rect x="462" y="421" width="24" height="7" rx="3.5" fill="#efe9d8"/>
      <rect x="494" y="422" width="17" height="6" rx="3" fill="#e6c36a"/>
      <rect x="1002" y="412" width="56" height="13" rx="3" fill="#6c492e"/>
      <rect x="1002" y="412" width="56" height="6" rx="3" fill="#a9a294"/>
      <g fill="#241408">
        <circle cx="426" cy="62" r="3"/><circle cx="1110" cy="62" r="3"/>
        <circle cx="426" cy="408" r="3"/><circle cx="1110" cy="408" r="3"/>
      </g>
    </g>

    <!-- window -->
    <g class="window">
      <circle cx="240" cy="280" r="190" fill="url(#windowGlow)" filter="url(#softGlow)"/>
      <rect x="80" y="122" width="312" height="312" rx="6" fill="#3a2417" stroke="#1c110a" stroke-width="3"/>
      <g clip-path="url(#winClip)">
        <rect x="98" y="140" width="276" height="276" fill="url(#skyGrad)"/>
        <circle cx="326" cy="184" r="24" fill="#f4e8ca" opacity=".92"/>
        <circle cx="326" cy="184" r="42" fill="#f4e8ca" opacity=".10"/>
        <g fill="#f7f2e4">
          <circle cx="140" cy="176" r="1.4"/><circle cx="186" cy="160" r="1"/><circle cx="222" cy="196" r="1.2"/>
          <circle cx="262" cy="158" r="1"/><circle cx="300" cy="214" r="1.3"/><circle cx="164" cy="232" r=".9"/>
          <circle cx="206" cy="250" r="1.1"/><circle cx="346" cy="242" r="1"/><circle cx="128" cy="290" r="1"/>
        </g>
        ${city}
        <g stroke="#a9c6e8" stroke-width="1.4" opacity=".34" class="rain">${rain}</g>
        <rect x="98" y="140" width="276" height="276" fill="#0a1322" opacity=".12"/>
      </g>
      <rect x="232" y="140" width="8" height="276" fill="#3a2417"/>
      <rect x="98" y="274" width="276" height="8" fill="#3a2417"/>
      <rect x="68" y="428" width="336" height="17" rx="4" fill="#5a3b25"/>
      <rect x="68" y="428" width="336" height="4" fill="#7c5535"/>
      <path d="M64 124c22 4 30 32 24 84v236H58V186c0-34 2-52 6-62z" fill="#4a2b22"/>
      <path d="M408 124c-22 4-30 32-24 84v236h30V186c0-34-2-52-6-62z" fill="#4a2b22"/>
      <path d="M66 150c10 60 8 160 4 280" stroke="#6a4234" stroke-width="3" fill="none" opacity=".5"/>
      <path d="M404 150c-10 60-8 160-4 280" stroke="#6a4234" stroke-width="3" fill="none" opacity=".5"/>
    </g>

    <!-- bookshelf -->
    <g class="bookshelf">
      <rect x="1136" y="76" width="318" height="384" rx="6" fill="#38240f" stroke="#1a0f07" stroke-width="3"/>
      <rect x="1148" y="88" width="294" height="360" fill="#241608"/>
      ${books}
      <g fill="#4a2f18">
        <rect x="1140" y="228" width="310" height="10"/>
        <rect x="1140" y="358" width="310" height="10"/>
        <rect x="1140" y="456" width="310" height="8"/>
      </g>
      <g>
        <path d="M1180 442c0-18 8-30 20-34 0 14-6 26-20 34z" fill="#638a5a"/>
        <path d="M1182 442c4-18 16-26 30-26-2 14-12 24-30 26z" fill="#7fa86f"/>
        <path d="M1170 440h42l-6 16h-30z" fill="#8a5a3a"/>
      </g>
      <g transform="translate(1352 92)">
        <rect width="62" height="76" rx="2" fill="#22150c" stroke="#5a3a23" stroke-width="3"/>
        <rect x="7" y="7" width="48" height="44" fill="#c9b48d" opacity=".5"/>
        <circle cx="31" cy="28" r="11" fill="#6b5a45"/>
        <path d="M18 52h26" stroke="#7a674e" stroke-width="3"/>
      </g>
    </g>

    <!-- file cabinet -->
    <g class="cabinet">
      <rect x="1148" y="466" width="238" height="252" rx="6" fill="url(#metalGrad)" stroke="#232a26" stroke-width="3"/>
      <g>
        <rect x="1160" y="480" width="214" height="66" rx="3" fill="#4b534d" stroke="#2c332e"/>
        <rect x="1160" y="552" width="214" height="66" rx="3" fill="#4b534d" stroke="#2c332e"/>
        <rect x="1160" y="624" width="214" height="66" rx="3" fill="#4b534d" stroke="#2c332e"/>
        <rect x="1206" y="506" width="122" height="16" rx="3" fill="#3a413b"/>
        <rect x="1206" y="578" width="122" height="16" rx="3" fill="#3a413b"/>
        <rect x="1206" y="650" width="122" height="16" rx="3" fill="#3a413b"/>
        <g fill="#d8c9a8" font-family="monospace" font-size="9" letter-spacing="1">
          <text x="1224" y="518">GRANTS</text>
          <text x="1224" y="590">PAPERS</text>
          <text x="1224" y="662">DATA</text>
        </g>
        <rect x="1172" y="488" width="26" height="18" rx="2" fill="#d9c9a6" opacity=".8"/>
        <rect x="1172" y="560" width="26" height="18" rx="2" fill="#d9c9a6" opacity=".8"/>
        <rect x="1172" y="632" width="26" height="18" rx="2" fill="#d9c9a6" opacity=".8"/>
      </g>
      <!-- banker's lamp on cabinet -->
      <g transform="translate(1290 404)">
        <ellipse cx="30" cy="42" rx="46" ry="16" fill="url(#lampGlow)"/>
        <rect x="22" y="18" width="16" height="46" rx="3" fill="#7a5a32"/>
        <rect x="8" y="60" width="44" height="7" rx="3" fill="#8a6538"/>
        <path d="M6 18c2-14 14-22 24-22s22 8 24 22z" fill="#2f5c4a" stroke="#1d3d31" stroke-width="2"/>
        <path d="M6 18h48" stroke="#f1c987" stroke-width="2" opacity=".7"/>
      </g>
      <path d="M1360 466c12-14 34-14 46 0" fill="none" stroke="#2c332e" stroke-width="3"/>
    </g>

    <!-- floor plant -->
    <g class="plant">
      <path d="M96 690h96l-10 74H106z" fill="#7a4a30"/>
      <path d="M96 690h96l-3 20H99z" fill="#8f5a3a"/>
      <g fill="#3f6b4c">
        <path d="M144 688c-2-54-26-82-60-96 4 40 22 76 60 96z"/>
        <path d="M144 688c2-64 22-96 52-112-2 46-18 86-52 112z"/>
        <path d="M144 688c-6-44-30-58-54-60 10 28 28 50 54 60z" fill="#4e7d5a"/>
        <path d="M144 688c10-50 34-66 62-68-10 34-30 58-62 68z" fill="#4e7d5a"/>
        <path d="M144 688c0-40-10-86-2-116 14 28 16 78 2 116z" fill="#5b8a63"/>
      </g>
    </g>

    <!-- floor books / archive box -->
    <g transform="translate(1006 728)">
      <rect x="0" y="18" width="26" height="8" rx="1" fill="#7b3f35" transform="rotate(-4 0 20)"/>
      <rect x="8" y="8" width="24" height="8" rx="1" fill="#3f5a4c" transform="rotate(3 8 12)"/>
      <rect x="2" y="0" width="22" height="7" rx="1" fill="#8a6a34"/>
    </g>

    <!-- standing lamp -->
    <g class="standing-lamp">
      <circle cx="1490" cy="392" r="220" fill="url(#lampGlow)"/>
      <rect x="1484" y="400" width="9" height="322" fill="#5a4028"/>
      <ellipse cx="1488" cy="728" rx="48" ry="12" fill="#3a2718"/>
      <path d="M1442 402h94l-16-74h-62z" fill="#d8a45c"/>
      <path d="M1442 402h94l-16-74h-62z" fill="#f0c082" opacity=".45"/>
      <rect x="1452" y="326" width="72" height="5" rx="2" fill="#8a6538"/>
      <ellipse cx="1488" cy="404" rx="44" ry="9" fill="#ffdfa6" opacity=".75"/>
      <circle cx="1488" cy="404" r="70" fill="#ffcf8a" opacity=".14" filter="url(#softGlow)"/>
    </g>

    <!-- scattered floor details -->
    <g opacity=".8">
      <path d="M560 748c30-10 62-8 88 6" stroke="#0d0806" stroke-width="4" fill="none" opacity=".3"/>
      <ellipse cx="860" cy="770" rx="24" ry="8" fill="#0c0705" opacity=".35"/>
    </g>

    <!-- warm room wash + vignette -->
    <rect width="1536" height="864" fill="#f5b968" opacity=".035"/>
    <rect width="1536" height="864" fill="url(#lampGlow)" opacity=".18"/>
  </svg>`;
}
