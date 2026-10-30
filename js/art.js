/* ============================================================
   三小时 · 场景美术模块
   所有画面均由代码（SVG）绘制，不依赖任何图片资源。

   统一美术方向：
     · 世界是铅灰色的。整部游戏只有三处颜色：
         餐桌上的暖黄（张阿姨的窗口）／异星的银白／骚乱的猩红。
     · 画布 1600×900，主体集中在 y = 80 ~ 560，
       下方三分之一留给对话框与选项。
   ============================================================ */
const ART = (function () {
  const W = 1600, H = 900;

  /* ---------- 小工具 ---------- */
  const rnd = (seed) => {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const n = (v) => Math.round(v * 10) / 10;

  const poly = (pts, attr) => `<polygon points="${pts.map(p => n(p[0]) + ',' + n(p[1])).join(' ')}" ${attr}/>`;
  const rect = (x, y, w, h, attr) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${attr}/>`;
  const circ = (x, y, r, attr) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" ${attr}/>`;
  const ell = (cx, cy, rx, ry, attr) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" ${attr}/>`;
  const path = (d, attr) => `<path d="${d}" ${attr}/>`;

  function lin(id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
    return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
      stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}" stop-opacity="${s[2] === undefined ? 1 : s[2]}"/>`).join('') +
      `</linearGradient>`;
  }
  function rad(id, stops, cx = .5, cy = .5, r = .5) {
    return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">` +
      stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}" stop-opacity="${s[2] === undefined ? 1 : s[2]}"/>`).join('') +
      `</radialGradient>`;
  }

  /* 站立人形剪影（背身） */
  function person(x, baseY, h, fill, op = 1, arm = 0) {
    const r = h * 0.082;
    const headY = baseY - h + r * 1.15;
    const shY = headY + r * 1.22;
    const hw = h * 0.138;
    const d = `M${n(x - hw)} ${n(baseY)} C${n(x - hw * .95)} ${n(shY + h * .05)} ${n(x - hw * .55)} ${n(shY)} ${n(x)} ${n(shY)} ` +
      `C${n(x + hw * .55)} ${n(shY)} ${n(x + hw * .95)} ${n(shY + h * .05)} ${n(x + hw)} ${n(baseY)} Z`;
    const armPath = arm
      ? path(`M${n(x + hw * .8)} ${n(shY + h * .12)} L${n(x + hw + h * .12)} ${n(shY + h * .40)}`,
        `stroke="${fill}" stroke-width="${(h * .055).toFixed(1)}" stroke-linecap="round"`)
      : '';
    return `<g fill="${fill}" opacity="${op}">` +
      `<ellipse cx="${n(x)}" cy="${n(headY)}" rx="${n(r)}" ry="${n(r * 1.16)}"/>` +
      path(d, '') + armPath + `</g>`;
  }

  /* 半身剪影 */
  function bust(cx, baseY, w, fill, op = 1) {
    const hw = w / 2, sh = baseY - w * 0.50;
    const hr = w * 0.20, hcy = sh - hr * 1.05;
    return `<g fill="${fill}" opacity="${op}">` +
      `<ellipse cx="${n(cx)}" cy="${n(hcy)}" rx="${n(hr)}" ry="${n(hr * 1.14)}"/>` +
      path(`M${n(cx - hw)} ${n(baseY)} C${n(cx - hw)} ${n(sh + w * .06)} ${n(cx - hw * .5)} ${n(sh)} ${n(cx)} ${n(sh)} C${n(cx + hw * .5)} ${n(sh)} ${n(cx + hw)} ${n(sh + w * .06)} ${n(cx + hw)} ${n(baseY)} Z`, '') +
      `</g>`;
  }

  function skyline(seed, baseY, opts = {}) {
    const R = rnd(seed);
    const minH = opts.minH || 40, maxH = opts.maxH || 220;
    const step = opts.step || 46, wMin = opts.wMin || 26, wMax = opts.wMax || 62;
    const fill = opts.fill || '#12151c';
    const winCol = opts.win || '#5c6a86';
    const winOp = opts.winOp === undefined ? .5 : opts.winOp;
    const top = opts.top === undefined ? baseY - 420 : opts.top;
    let x = -40, out = '', wins = '';
    while (x < W + 60) {
      const w = lerp(wMin, wMax, R());
      const h = lerp(minH, maxH, Math.pow(R(), 1.7));
      out += rect(x, baseY - h, w, Math.max(h + 30, baseY - top), `fill="${fill}"`);
      if (R() > .84 && h > 80) out += rect(x + w * .45, baseY - h - 20, 2, 20, `fill="${fill}"`);
      if (R() > .92) out += `<polygon points="${n(x + w * .5)},${n(baseY - h)} ${n(x + w * .34)},${n(baseY - h - 15)} ${n(x + w * .66)},${n(baseY - h - 15)}" fill="${fill}"/>`;
      const cols = Math.max(1, Math.floor(w / 14)), rows = Math.max(1, Math.floor(h / 16));
      for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) {
        if (R() > .88) wins += rect(x + 5 + c * 14, baseY - h + 8 + rr * 16, 5, 7,
          `fill="${winCol}" opacity="${(0.12 + R() * winOp).toFixed(2)}"`);
      }
      x += w + lerp(2, 14, R());
    }
    return `<g>${out}${wins}</g>`;
  }

  function svg(inner) {
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <g class="cam">${inner}</g></svg>`;
  }

  /* ==========================================================
     1. 教学楼走廊 —— 铅灰色的下午
     ========================================================== */
  function corridor() {
    const VP = [800, 440];
    const fp = (edge, t) => [lerp(VP[0], edge[0], t), lerp(VP[1], edge[1], t)];
    const R = rnd(11);
    let winQ = '', beams = '', lockers = '', boards = '';

    for (let i = 0; i < 5; i++) {
      const t0 = 0.24 + i * 0.148, t1 = t0 + 0.112;
      const A = fp([1600, 130], t0), B = fp([1600, 130], t1);
      const C = fp([1600, 470], t1), D = fp([1600, 470], t0);
      const op = (0.55 + (1 - i / 5) * 0.45).toFixed(2);
      winQ += poly([A, B, C, D], `fill="url(#coWin)" opacity="${op}"`);
      winQ += poly([A, B, C, D], `fill="none" stroke="#1b1d21" stroke-width="${(1.4 + i * 1.0).toFixed(1)}"`);
      const m1 = fp([1600, 290], t0), m2 = fp([1600, 290], t1);
      winQ += path(`M${n(m1[0])} ${n(m1[1])} L${n(m2[0])} ${n(m2[1])}`, `stroke="#1b1d21" stroke-width="${(1 + i * 0.8).toFixed(1)}"`);
      const k = 1 - t0;
      beams += poly([D, C, [C[0] - 90 * k, C[1] + 230 * k], [D[0] - 90 * k, D[1] + 230 * k]],
        `fill="url(#coBeam)" opacity="${(0.34 - i * 0.05).toFixed(2)}"`);
    }

    for (let i = 0; i < 6; i++) {
      const t0 = 0.30 + i * 0.115, t1 = t0 + 0.088;
      const A = fp([0, 250], t0), B = fp([0, 250], t1);
      const C = fp([0, 620], t1), D = fp([0, 620], t0);
      lockers += poly([A, B, C, D], `fill="#1a1d22" stroke="#24282e" stroke-width="1"`);
      lockers += poly([A, B, C, D], `fill="url(#coLocker)" opacity=".5"`);
    }

    return svg(`
      <defs>
        ${lin('coCeil', [[0, '#26292e'], [1, '#4b4f55']], 0, 0, 0, 1)}
        ${lin('coFloor', [[0, '#5c6066'], [0.45, '#3a3e44'], [1, '#191b1e']], 0, 1, 0, 0)}
        ${lin('coWallL', [[0, '#15171a'], [1, '#2c3036']], 5, 0, 0, 1)}
        ${lin('coWallR', [[0, '#5b6068'], [1, '#22262b']], 0, 0, 0, 1)}
        ${lin('coWin', [[0, '#f2f5f8'], [0.5, '#ccd4dc'], [1, '#9aa4af']], 1, 0, 0, 1)}
        ${lin('coBeam', [[0, '#dfe6ee'], [1, '#6a737d']], 0, 0, 1, 1)}
        ${lin('coLocker', [[0, '#5a626c'], [1, '#1c1f23']], 0, 0, 1, 0)}
        ${rad('coGlow', [[0, '#d8d8c8', .55], [0.45, '#7a7a70', .22], [1, '#000', 0]], .5, .5, .5)}
      </defs>

      <rect width="1600" height="900" fill="#191b1e"/>
      ${poly([[0, 0], [1600, 0], VP], 'fill="url(#coCeil)"')}
      ${poly([[0, 0], VP, [0, 900]], 'fill="url(#coWallL)"')}
      ${poly([[1600, 0], VP, [1600, 900]], 'fill="url(#coWallR)"')}
      ${poly([[0, 900], [1600, 900], VP], 'fill="url(#coFloor)"')}

      <!-- 尽头出口 -->
      ${ell(VP[0], VP[1] + 4, 260, 170, 'fill="url(#coGlow)"')}
      ${path('M766 500 L834 500 L872 600 L728 600 Z', 'fill="#e8e8dc" opacity=".10"')}
      ${rect(VP[0] - 66, VP[1] - 104, 132, 208, 'fill="#e8e8dc" opacity=".55"')}
      ${rect(VP[0] - 66, VP[1] - 104, 132, 208, 'fill="none" stroke="#2a2d31" stroke-width="3"')}
      ${rect(VP[0] - 4, VP[1] - 104, 8, 208, 'fill="#3a3d41" opacity=".8"')}

      ${lockers}
      ${winQ}
      ${beams}

      <!-- 天花板灯槽 -->
      ${path('M700 96 L900 96 L836 232 L764 232 Z', 'fill="#33373d" stroke="#4a4f56" stroke-width="1"')}
      ${path('M660 20 L940 20 L872 86 L728 86 Z', 'fill="#2b2f34"')}

      <!-- 黑板 -->
      ${(() => {
        const A = fp([0, 240], 0.52), B = fp([0, 240], 0.66);
        const C = fp([0, 470], 0.66), D = fp([0, 470], 0.52);
        return poly([A, B, C, D], 'fill="#2b3630" opacity=".62"');
      })()}

      <!-- 地砖线 -->
      ${(() => {
        let g = '';
        for (let i = 1; i < 10; i++) {
          const t = i / 10;
          const A = fp([-300, 900], t), B = fp([1900, 900], t);
          g += path(`M${n(A[0])} ${n(A[1])} L${n(B[0])} ${n(B[1])}`, 'stroke="#888e96" stroke-opacity=".16" stroke-width="1"');
        }
        return g;
      })()}
      ${path('M0 900 L800 440', 'stroke="#9098a2" stroke-opacity=".18" stroke-width="2"')}

      <!-- 远处的同学 -->
      ${person(738, 466, 92, '#2b3037', .95)}
      ${person(784, 460, 86, '#22262c', .9)}
      ${person(838, 470, 88, '#1b1f24', .85)}

      <!-- 前景压暗 -->
      ${rect(0, 660, 1600, 240, 'fill="#0e1012" opacity=".62"')}
      ${ell(1600, 450, 520, 900, 'fill="#101214" opacity=".28"')}
    `);
  }

  /* ==========================================================
     2. 校门外的街道 —— 铅灰色低空
     ========================================================== */
  function street() {
    const R = rnd(77);
    let crowd = '', glows = '', far = '', litter = '';

    for (let i = 0; i < 26; i++) {
      far += person(R() * 1600, 470 + R() * 22, 26 + R() * 22, '#2a2d31', .8);
    }
    for (let i = 0; i < 42; i++) {
      const x = -40 + R() * 1680;
      const depth = R();
      const h = lerp(96, 172, depth);
      const baseY = lerp(580, 780, depth);
      crowd += person(x, baseY, h, depth > .5 ? '#08090b' : '#15171a', lerp(.72, 1, depth), R() > .65 ? 1 : 0);
      glows += ell(x + (R() - .5) * 8, baseY - h * .55, 18 * (0.7 + depth * .7), 24 * (0.7 + depth * .7),
        `fill="url(#stRed)" opacity="${(0.25 + R() * 0.45).toFixed(2)}"`);
    }
    for (let i = 0; i < 24; i++) {
      const x = R() * 1600, y = 500 + R() * 120, s = 4 + R() * 14;
      litter += rect(x, y, s, s * .6, `fill="#c9c4b4" opacity="${(R() * .22).toFixed(2)}" transform="rotate(${(R() * 60 - 30).toFixed(0)} ${n(x)} ${n(y)})"`);
    }

    return svg(`
      <defs>
        ${lin('stSky', [[0, '#3f4348'], [.42, '#6b6d6a'], [.72, '#8d8a7d'], [1, '#6a6960']], 0, 0, 0, 1)}
        ${lin('stFog', [[0, '#9a978c', 0], [0.5, '#9a978c', .38], [1, '#9a978c', 0]], 0, 0, 0, 1)}
        ${rad('stRed', [[0, '#ff5a4a', .95], [.32, '#c0392b', .48], [1, '#5a1a12', 0]], .5, .5, .5)}
        ${lin('stRoad', [[0, '#4a4a44'], [.4, '#37372f'], [1, '#141412']], 0, 0, 0, 1)}
        ${lin('stFade', [[0, '#101113', .96], [0.55, '#101113', .35], [1, '#101113', 0]], 0, 1, 0, 0)}
      </defs>

      <rect width="1600" height="900" fill="url(#stSky)"/>
      ${rect(0, 300, 1600, 240, 'fill="url(#stFog)"')}

      ${skyline(21, 500, { minH: 40, maxH: 200, fill: '#2c2f33', win: '#b09a6a', winOp: .22, step: 40, top: 120 })}
      ${skyline(9, 516, { minH: 20, maxH: 120, fill: '#212428', win: '#8a7a55', winOp: .18, step: 34, top: 240 })}

      <!-- 街道 -->
      ${rect(0, 500, 1600, 400, 'fill="url(#stRoad)"')}
      ${path('M0 500 L1600 500', 'stroke="#6e6a5c" stroke-width="1.6" stroke-opacity=".7"')}
      ${(() => {
        let g = '';
        for (let i = 0; i < 34; i++) {
          const x = R() * 1600, w = 2 + R() * 9, h = 24 + R() * 120;
          g += rect(x, 508 + R() * 130, w, h, `fill="#b6b0a0" opacity="${(R() * .07).toFixed(3)}"`);
        }
        return g;
      })()}

      <!-- 卷帘门店铺 -->
      ${rect(50, 300, 230, 200, 'fill="#191b1e"')}
      ${rect(66, 314, 198, 186, 'fill="#232629"')}
      ${(() => { let g = ''; for (let i = 0; i < 10; i++) g += rect(66, 320 + i * 18, 198, 6, 'fill="#15171a" opacity=".9"'); return g; })()}
      ${rect(1240, 270, 300, 230, 'fill="#191b1e"')}
      ${rect(1258, 286, 264, 214, 'fill="#222528"')}
      ${path('M1258 286 L1522 500', 'stroke="#15171a" stroke-width="17"')}

      <!-- 立牌 -->
      ${path('M520 546 L796 534 L806 578 L528 590 Z', 'fill="#1c1f22" stroke="#3d4247" stroke-width="1.2"')}
      <text x="556" y="572" font-family="serif" font-size="22" fill="#8f949a" letter-spacing="5">人 类 还 有 三 小 时</text>

      ${litter}
      ${(() => { let g = ''; for (let i = 0; i < 44; i++) { const x = R() * 1600, y = 520 + R() * 220; g += ell(x, y, 62, 42, `fill="url(#stRed)" opacity="${(R() * .14).toFixed(3)}"`); } return g; })()}

      ${far}
      ${crowd}
      ${glows}

      <!-- 前景梧桐 -->
      ${path('M-70 -50 L540 -50 C500 14 452 40 396 28 C376 86 306 110 240 86 C196 144 100 152 34 110 C6 90 -24 60 -70 34 Z', 'fill="#0b0c0e"')}
      ${path('M1600 30 L1210 -10 C1250 48 1310 72 1380 58 C1410 112 1490 128 1570 104 L1680 82 Z', 'fill="#0b0c0e"')}

      ${rect(0, 0, 1600, 900, 'fill="url(#stFade)"')}
    `);
  }

  /* ==========================================================
     3. 梧桐树下的餐车 —— 全世界唯一一盏暖灯
     ========================================================== */
  function truck() {
    const R = rnd(303);
    let dust = '';
    for (let i = 0; i < 50; i++) {
      const x = 250 + R() * 1020, y = 120 + R() * 440;
      dust += circ(x, y, 0.8 + R() * 1.8, `fill="#ffd9a0" opacity="${(R() * .6).toFixed(2)}"`);
    }

    return svg(`
      <defs>
        ${lin('trSky', [[0, '#2a2e34'], [.44, '#454a4f'], [1, '#6a6659']], 0, 0, 0, 1)}
        ${rad('trWarm', [[0, '#ffd79a', .95], [.32, '#f2a44a', .5], [1, '#7a4413', 0]], .5, .5, .5)}
        ${rad('trGlow', [[0, '#ffb96a', .5], [1, '#5a2e08', 0]], .5, .5, .5)}
        ${rad('trPool', [[0, '#ffc37a', .55], [.55, '#e09040', .22], [1, '#7a4413', 0]], .5, .5, .5)}
        ${lin('trWin', [[0, '#fff3d6'], [.45, '#ffc878'], [1, '#c07b2c']], 0, 0, 0, 1)}
        ${lin('trBody', [[0, '#6a7178'], [.42, '#3d434a'], [1, '#191d22']], 0, 0, 0, 1)}
        ${lin('trGround', [[0, '#5a5850'], [1, '#1a1a18']], 0, 0, 0, 1)}
        ${lin('trTrunk', [[0, '#3a3833'], [1, '#131313']], 0, 0, 1, 1)}
      </defs>

      <rect width="1600" height="900" fill="url(#trSky)"/>
      ${ell(720, 480, 700, 340, 'fill="url(#trGlow)" opacity=".8"')}

      ${skyline(55, 560, { minH: 40, maxH: 220, fill: '#33373c', win: '#c0a878', winOp: .22, step: 50, top: 220 })}

      <rect width="1600" height="240" fill="#2b2f34" opacity=".35"/>

      <!-- 地面 -->
      ${rect(0, 560, 1600, 340, 'fill="url(#trGround)"')}
      ${path('M0 560 L1600 560', 'stroke="#6b675c" stroke-width="1.4" stroke-opacity=".7"')}
      ${ell(700, 596, 480, 120, 'fill="url(#trPool)"')}

      <!-- 梧桐 -->
      ${path('M168 566 C176 480 178 396 164 318 C158 278 178 258 196 276 C214 316 220 420 224 566 Z', 'fill="url(#trTrunk)"')}
      ${path('M180 420 C150 392 132 366 124 340', 'stroke="#2f2d28" stroke-width="9" stroke-linecap="round" fill="none"')}
      ${path('M196 380 C226 350 250 336 276 330', 'stroke="#2f2d28" stroke-width="8" stroke-linecap="round" fill="none"')}
      ${path('M20 210 C10 150 66 108 124 120 C136 74 200 58 246 92 C284 56 356 68 370 118 C426 112 462 162 436 202 C468 232 448 284 402 288 C392 330 326 342 288 314 C250 350 178 344 154 308 C104 342 34 322 30 280 C-2 264 -2 228 20 210 Z', 'fill="#1b1c16"')}
      ${path('M246 100 C300 78 356 90 380 122', 'stroke="#1b1c16" stroke-width="18" stroke-linecap="round" fill="none"')}
      ${path('M126 146 C94 122 68 110 36 108', 'stroke="#1b1c16" stroke-width="13" stroke-linecap="round" fill="none"')}

      <!-- 餐车 -->
      <g>
        ${ell(670, 574, 350, 24, 'fill="#000" opacity=".55"')}
        ${path('M330 268 L1010 268 L1010 566 L330 566 Z', 'fill="url(#trBody)" stroke="#7b828a" stroke-width="1.2"')}
        ${path('M330 268 L1010 268 L1010 276 L330 276 Z', 'fill="#9aa2ab" opacity=".8"')}
        ${path('M330 268 L1010 268 L1042 300 L362 300 Z', 'fill="#565d66"')}
        ${rect(356, 212, 628, 58, 'fill="#1c2026" stroke="#6d757e" stroke-width="1.2"')}
        <text x="670" y="253" text-anchor="middle" font-family="serif" font-size="31" letter-spacing="15" fill="#ffd39a">复 刻 牛 肉 汉 堡</text>

        ${path('M338 300 L1022 300 L1002 338 L358 338 Z', 'fill="#63472e"')}
        ${(() => { let g = ''; for (let i = 0; i < 14; i++) g += path(`M${360 + i * 46} 300 L${356 + i * 46} 338`, 'stroke="#2a1c12" stroke-width="8" opacity=".5"'); return g; })()}

        ${rect(420, 356, 410, 122, 'fill="url(#trWin)"')}
        ${rect(420, 356, 410, 122, 'fill="none" stroke="#14171b" stroke-width="7"')}
        ${path('M422 452 L828 452', 'stroke="#2a1c0e" stroke-width="3" opacity=".3"')}

        ${bust(742, 472, 132, '#3a2511', .92)}
        ${rect(676, 452, 132, 16, 'fill="#2a1a0c" opacity=".55"')}

        ${path('M470 356 C462 326 486 310 476 282 C466 254 494 242 486 212', 'stroke="#ffe4b8" stroke-width="10" fill="none" opacity=".18" stroke-linecap="round"')}
        ${path('M566 352 C562 326 584 312 576 286 C568 260 592 248 586 222', 'stroke="#ffe4b8" stroke-width="8" fill="none" opacity=".13" stroke-linecap="round"')}

        ${rect(400, 478, 450, 20, 'fill="#2b3037"')}
        ${rect(400, 498, 450, 10, 'fill="#15181c"')}
        ${ell(520, 476, 28, 8, 'fill="#e8c48a" opacity=".5"')}

        ${path('M1002 300 L1002 356', 'stroke="#252a30" stroke-width="2"')}
        ${circ(1002, 366, 14, 'fill="#ffe4b8"')}
        ${circ(1002, 366, 58, 'fill="url(#trWarm)" opacity=".65"')}

        ${circ(420, 566, 46, 'fill="#0e1013" stroke="#3f444b" stroke-width="3"')}
        ${circ(420, 566, 18, 'fill="#282d34"')}
        ${circ(930, 566, 46, 'fill="#0e1013" stroke="#3f444b" stroke-width="3"')}
        ${circ(930, 566, 18, 'fill="#282d34"')}
        ${circ(430, 566, 3, 'fill="#6b727b"')}
        ${circ(940, 566, 3, 'fill="#6b727b"')}
      </g>

      <!-- 小黑板 -->
      <g transform="translate(1122 424) rotate(-4)">
        ${rect(0, 0, 210, 162, 'fill="#15130f" stroke="#6e5c40" stroke-width="7"')}
        <text x="105" y="50" text-anchor="middle" font-family="serif" font-size="21" fill="#ffe0b0" opacity=".9">今 日</text>
        <text x="105" y="90" text-anchor="middle" font-family="serif" font-size="22" fill="#ffe0b0" opacity=".9">只 做 一 种</text>
        <text x="105" y="130" text-anchor="middle" font-family="serif" font-size="20" fill="#ffc374" opacity=".78">汉 堡</text>
      </g>

      ${dust}
      ${rect(0, 700, 1600, 200, 'fill="#0b0b09" opacity=".65"')}
    `);
  }

  /* ==========================================================
     4. 食堂三楼 —— 唯一亮着的窗口
     ========================================================== */
  function cafeteria() {
    const R = rnd(404);
    let steam = '';

    for (let i = 0; i < 10; i++) {
      const x = 600 + (R() - .5) * 300;
      steam += path(`M${n(x)} 340 C${n(x - 12)} 306 ${n(x + 14)} 278 ${n(x - 2)} 242 C${n(x - 14)} 210 ${n(x + 8)} 186 ${n(x - 4)} 150`,
        `stroke="#ffd9a0" fill="none" stroke-width="${(2 + R() * 6).toFixed(1)}" opacity="${(.06 + R() * .08).toFixed(3)}" stroke-linecap="round"`);
    }

    return svg(`
      <defs>
        ${lin('cfWall', [[0, '#23262c'], [1, '#33373d']], 0, 0, 0, 1)}
        ${lin('cfFloor', [[0, '#4a4f56'], [.45, '#2b2f35'], [1, '#101216']], 0, 0, 0, 1)}
        ${rad('cfHalo', [[0, '#ffcf8a', .85], [.30, '#e59a45', .28], [1, '#5c2f08', 0]], .5, .5, .5)}
        ${lin('cfWinCore', [[0, '#fff2d6'], [.5, '#ffc06e'], [1, '#c07a24']], 0, 0, 0, 1)}
        ${rad('cfLamp', [[0, '#ffe6bb', .45], [1, '#3a2a10', 0]], .5, .5, .5)}
        ${lin('cfShut', [[0, '#24282d'], [1, '#171a1e']], 0, 0, 0, 1)}
        ${lin('cfSteel', [[0, '#565d65'], [.2, '#7a828a'], [.55, '#4a5057'], [1, '#232830']], 0, 0, 0, 1)}
        ${lin('cfSteelTop', [[0, '#c2c9d0'], [.5, '#9aa2aa'], [1, '#767e86']], 0, 0, 0, 1)}
        ${rad('cfFloorGlow', [[0, '#ffb96a', .30], [1, '#ffb96a', 0]], .5, .5, .5)}
      </defs>

      <rect width="1600" height="900" fill="#1b1e22"/>
      ${rect(0, 0, 1600, 620, 'fill="url(#cfWall)"')}

      <!-- 天花板 -->
      ${rect(0, 0, 1600, 66, 'fill="#16181c"')}
      ${path('M0 66 L1600 66', 'stroke="#4a4f56" stroke-width="2" stroke-opacity=".7"')}

      <!-- 后墙 -->
      ${rect(0, 66, 1600, 470, 'fill="#262a30"')}

      <!-- 中央窗口 -->
      ${ell(760, 280, 540, 340, 'fill="url(#cfHalo)" opacity=".34"')}
      ${rect(548, 128, 436, 316, 'fill="#161a1e" stroke="#3b4047" stroke-width="9"')}
      ${rect(566, 146, 400, 280, 'fill="url(#cfWinCore)"')}
      ${rect(590, 170, 130, 78, 'fill="#2a1d0e" opacity=".78"')}
      <text x="655" y="206" text-anchor="middle" font-family="serif" font-size="19" fill="#ffe0b0" opacity=".94">汉 堡</text>
      <text x="655" y="233" text-anchor="middle" font-family="serif" font-size="17" fill="#ffe0b0" opacity=".66">15 元</text>
      ${bust(872, 426, 152, '#4a2d12', .86)}

      <!-- 不锈钢台面 -->
      ${path('M424 428 L1116 428 L1152 462 L388 462 Z', 'fill="url(#cfSteelTop)"')}
      ${path('M424 428 L1116 428 L1152 462 L388 462 Z', 'fill="none" stroke="#e2e7ec" stroke-opacity=".45" stroke-width="1.5"')}
      ${rect(388, 462, 764, 122, 'fill="url(#cfSteel)"')}
      ${rect(388, 462, 764, 5, 'fill="#c9d0d7" opacity=".7"')}
      ${ell(566, 444, 46, 9, 'fill="#3a3f45" opacity=".55"')}
      ${ell(680, 444, 40, 8, 'fill="#3a3f45" opacity=".5"')}
      ${rect(880, 420, 104, 22, 'fill="#d9c49a" opacity=".85" transform="rotate(-3 932 431)"')}
      ${rect(880, 424, 104, 12, 'fill="#c6ad80" opacity=".7" transform="rotate(-3 932 431)"')}

      ${steam}

      <!-- 两侧停业的窗口 -->
      ${rect(96, 170, 372, 288, 'fill="url(#cfShut)" stroke="#23272c" stroke-width="2"')}
      ${(() => { let g = ''; for (let i = 0; i < 15; i++) g += rect(110, 188 + i * 18, 344, 6, 'fill="#14171a" opacity=".9"'); return g; })()}
      <text x="282" y="330" text-anchor="middle" font-family="serif" font-size="30" fill="#3a4047" letter-spacing="14">停 业</text>
      ${rect(1132, 170, 372, 288, 'fill="url(#cfShut)" stroke="#23272c" stroke-width="2"')}
      ${(() => { let g = ''; for (let i = 0; i < 15; i++) g += rect(1146, 188 + i * 18, 344, 6, 'fill="#14171a" opacity=".9"'); return g; })()}
      <text x="1318" y="330" text-anchor="middle" font-family="serif" font-size="30" fill="#3a4047" letter-spacing="14">停 业</text>

      <!-- 吊灯 -->
      ${rect(238, 0, 2, 30, 'fill="#2a2e34"')}${circ(239, 34, 30, 'fill="#20242a"')}
      ${rect(799, 0, 2, 30, 'fill="#2a2e34"')}${circ(800, 34, 30, 'fill="#20242a"')}${circ(800, 34, 92, 'fill="url(#cfLamp)" opacity=".35"')}
      ${rect(1359, 0, 2, 30, 'fill="#2a2e34"')}${circ(1360, 34, 30, 'fill="#20242a"')}

      <!-- 地面 -->
      ${rect(0, 566, 1600, 334, 'fill="url(#cfFloor)"')}
      ${path('M0 566 L1600 566', 'stroke="#6d747c" stroke-width="1.6" stroke-opacity=".65"')}
      ${ell(770, 660, 520, 190, 'fill="url(#cfFloorGlow)"')}
      ${ell(770, 570, 300, 26, 'fill="#ffb96a" opacity=".10"')}

      <!-- 左右柱子 -->
      ${rect(0, 0, 62, 640, 'fill="#15181c"')}
      ${rect(1538, 0, 62, 640, 'fill="#15181c"')}
      ${rect(0, 680, 1600, 220, 'fill="#0b0d10" opacity=".55"')}
    `);
  }

  /* ==========================================================
     5. 骚乱
     ========================================================== */
  function riot() {
    const R = rnd(909);
    let crowd = '', shards = '', streaks = '';

    for (let i = 0; i < 30; i++) {
      const x = -40 + R() * 1680;
      const depth = R();
      const h = lerp(150, 265, depth);
      const baseY = lerp(600, 830, depth);
      const rot = (R() - .5) * 14;
      crowd += `<g transform="rotate(${rot.toFixed(1)} ${n(x)} ${n(baseY)})">` +
        person(x, baseY, h, '#050303', .97, R() > .4 ? 1 : 0) + `</g>`;
    }
    for (let i = 0; i < 70; i++) {
      const x = R() * 1600, y = 100 + R() * 600, s = 2 + R() * 10;
      shards += poly([[x, y], [x + s, y - s * .7], [x + s * 1.5, y + s * .6]],
        `fill="#ffd0a0" opacity="${(R() * .6).toFixed(2)}"`);
    }
    for (let i = 0; i < 16; i++) {
      const x = R() * 1600, y = 60 + R() * 460;
      streaks += path(`M${n(x)} ${n(y)} L${n(x + 90 + R() * 180)} ${n(y + 14)}`,
        `stroke="#ff8a5a" stroke-width="${(1 + R() * 2).toFixed(1)}" opacity="${(R() * .18).toFixed(2)}"`);
    }

    return svg(`
      <defs>
        ${lin('rtBg', [[0, '#2a0d08'], [.42, '#4e1a0d'], [1, '#160806']], 0, 0, 0, 1)}
        ${rad('rtRed', [[0, '#ff6a44', .95], [.32, '#d02a12', .42], [1, '#3a0a04', 0]], .5, .5, .5)}
        ${rad('rtFlare', [[0, '#ffc078', .6], [1, '#4a1206', 0]], .5, .5, .5)}
        ${lin('rtFloor', [[0, '#4a2015'], [1, '#0a0404']], 0, 0, 0, 1)}
      </defs>
      <rect width="1600" height="900" fill="url(#rtBg)"/>

      ${circ(130, 60, 80, 'fill="url(#rtRed)"')}
      ${circ(1470, 44, 100, 'fill="url(#rtRed)"')}
      ${ell(800, 280, 820, 300, 'fill="url(#rtFlare)" opacity=".38"')}
      ${path('M-40 60 L720 520 L1660 60 L1660 900 L-40 900 Z', 'fill="#7a2410" opacity=".22"')}

      <!-- 倒塌的餐桌 -->
      ${(() => {
        let g = '';
        for (let i = 0; i < 6; i++) {
          const x = R() * 1450, y = 420 + R() * 240, w = 190 + R() * 240, a = (R() - .5) * 46;
          g += `<g transform="rotate(${a.toFixed(0)} ${n(x + w / 2)} ${n(y + 20)})">` +
            rect(x, y, w, 22, 'fill="#120909" opacity=".95"') +
            rect(x + 18, y + 22, 11, 70, 'fill="#0c0606"') +
            rect(x + w - 29, y + 22, 11, 70, 'fill="#0c0606"') + `</g>`;
        }
        return g;
      })()}

      ${rect(0, 540, 1600, 360, 'fill="url(#rtFloor)" opacity=".85"')}
      ${streaks}
      ${shards}
      ${crowd}

      ${(() => { let g = ''; for (let i = 0; i < 14; i++) { const x = R() * 1600, y = 80 + R() * 540, s = 12 + R() * 18, a = R() * 70; g += `<g transform="rotate(${a.toFixed(0)} ${n(x)} ${n(y)})"><rect x="${n(x)}" y="${n(y)}" width="${n(s)}" height="${n(s * 1.3)}" fill="#f0e6d2" opacity="${(.12 + R() * .26).toFixed(2)}"/></g>`; } return g; })()}

      ${rect(0, 0, 1600, 900, 'fill="#3a0d06" opacity=".18"')}
      ${rect(0, 660, 1600, 240, 'fill="#080303" opacity=".55"')}
    `);
  }

  /* ==========================================================
     6. 天台 · 异星微光
     ========================================================== */
  function rooftop() {
    const R = rnd(606);
    return svg(`
      <defs>
        ${lin('rfSky', [[0, '#1b1f26'], [.30, '#2b323c'], [.58, '#4a5460'], [1, '#5e6670']], 0, 0, 0, 1)}
        ${rad('rfGlow', [[0, '#9fc8ff', .40], [.42, '#4a6c96', .14], [1, '#0a1018', 0]], .5, .5, .5)}
        ${lin('rfHull', [[0, '#141920'], [.45, '#2a3442'], [1, '#0d1117']], 0, 0, 0, 1)}
        ${rad('rfLight', [[0, '#dceaff', .7], [.4, '#7fa8de', .18], [1, '#173049', 0]], .5, .5, .5)}
        ${rad('rfUnder', [[0, '#eaf4ff', .55], [.42, '#8fc0ff', .16], [1, '#173049', 0]], .5, .5, .5)}
        ${lin('rfCity', [[0, '#2a3038'], [1, '#1a1e24']], 0, 0, 0, 1)}
      </defs>

      <rect width="1600" height="900" fill="url(#rfSky)"/>
      ${(() => { let g = ''; for (let i = 0; i < 80; i++) g += circ(R() * 1600, R() * 340, R() * 1.4 + .3, `fill="#dfe8f5" opacity="${(R() * .42).toFixed(2)}"`); return g; })()}

      ${ell(800, 210, 780, 300, 'fill="url(#rfGlow)"')}

      <!-- 母舰 -->
      ${path('M120 150 C400 78 1200 78 1480 150 C1400 198 1180 222 800 222 C420 222 200 198 120 150 Z', 'fill="url(#rfHull)" stroke="#9dc4ee" stroke-opacity=".5" stroke-width="1.4"')}
      ${path('M120 150 C400 78 1200 78 1480 150', 'fill="none" stroke="#d6ebff" stroke-opacity=".65" stroke-width="1.8"')}
      ${path('M170 158 C430 102 1170 102 1430 158', 'fill="none" stroke="#9dc4ee" stroke-opacity=".25" stroke-width="1"')}
      ${(() => {
        let g = '';
        for (let i = 1; i < 12; i++) {
          const x = 160 + i * 120;
          const s = Math.sin(i / 12 * Math.PI);
          g += path(`M${n(x)} ${n(150 - s * 60)} L${n(x)} ${n(150 + s * 64)}`, 'stroke="#9dc4ee" stroke-opacity=".10" stroke-width="1"');
        }
        return g;
      })()}
      ${ell(800, 202, 470, 64, 'fill="url(#rfUnder)"')}
      ${path('M620 200 L980 200', 'stroke="#eaf4ff" stroke-opacity=".55" stroke-width="2.5"')}
      ${circ(430, 178, 5, 'fill="#d8ecff" opacity=".85"')}
      ${circ(620, 190, 4, 'fill="#d8ecff" opacity=".7"')}
      ${circ(990, 190, 4, 'fill="#d8ecff" opacity=".7"')}
      ${circ(1210, 176, 5, 'fill="#d8ecff" opacity=".85"')}

      <!-- 护航舰 -->
      ${path('M1090 286 C1160 260 1280 260 1350 286 C1290 308 1150 308 1090 286 Z', 'fill="#1a2028" stroke="#9dc4ee" stroke-opacity=".45" stroke-width="1"')}
      ${ell(1220, 286, 90, 5, 'fill="#9dc4ee" opacity=".3"')}
      ${path('M250 306 C312 284 414 284 476 306 C420 326 306 326 250 306 Z', 'fill="#1a2028" stroke="#9dc4ee" stroke-opacity=".45" stroke-width="1"')}
      ${ell(363, 306, 70, 4, 'fill="#9dc4ee" opacity=".24"')}

      ${path('M820 222 L880 222 L980 560 L720 560 Z', 'fill="url(#rfLight)" opacity=".18"')}

      <!-- 城市 -->
      ${skyline(616, 596, { minH: 60, maxH: 230, fill: '#1e232b', win: '#c8a870', winOp: .55, step: 44, top: 380 })}
      ${(() => { let g = ''; for (let i = 0; i < 150; i++) { const x = R() * 1600, y = 420 + R() * 170; g += rect(x, y, 2, 2, `fill="#e0c084" opacity="${(R() * .6).toFixed(2)}"`); } return g; })()}
      ${rect(0, 560, 1600, 60, 'fill="url(#rfCity)"')}

      <!-- 天台地面与栏杆 -->
      ${rect(0, 566, 1600, 334, 'fill="#14171c"')}
      ${rect(0, 566, 1600, 8, 'fill="#3d444d"')}
      ${(() => { let g = ''; for (let i = 0; i < 24; i++) g += rect(i * 70 + 8, 458, 9, 112, 'fill="#1b1f25"'); return g; })()}
      ${rect(0, 458, 1600, 10, 'fill="#232830"')}
      ${rect(0, 520, 1600, 6, 'fill="#1e2229"')}

      <!-- 站在栏杆前的人 -->
      ${person(980, 620, 240, '#0b0e12', 1, 1)}

      ${rect(0, 0, 1600, 900, 'fill="#1d2735" opacity=".10"')}
      ${rect(0, 700, 1600, 200, 'fill="#0b0d10" opacity=".55"')}
    `);
  }

  /* ==========================================================
     7. 零号 · 银光
     ========================================================== */
  function zero() {
    const R = rnd(707);
    let motes = '';
    for (let i = 0; i < 64; i++) {
      const x = 380 + R() * 840, y = 80 + R() * 470;
      motes += circ(x, y, R() * 2.2 + .4, `fill="#d8ecff" opacity="${(R() * .75).toFixed(2)}"`);
    }
    const body = 'M800 128 C868 128 908 182 908 240 C908 286 890 314 890 338 L982 402 C1038 448 1060 520 1064 640 L1070 900 L530 900 L536 640 C540 520 562 448 618 402 L710 338 C710 314 692 286 692 240 C692 182 732 128 800 128 Z';

    return svg(`
      <defs>
        ${lin('zBg', [[0, '#161b23'], [.46, '#0d1219'], [1, '#05070a']], 0, 0, 0, 1)}
        ${rad('zBeam', [[0, '#cfe6ff', .40], [.5, '#5f87b8', .12], [1, '#0a1220', 0]], .5, .5, .5)}
        ${lin('zBody', [[0, '#121820'], [.5, '#06090d'], [1, '#000']], 0, 0, 0, 1)}
        <filter id="zBlur" x="-40%" y="-30%" width="180%" height="180%"><feGaussianBlur stdDeviation="30"/></filter>
        <filter id="zSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
        ${lin('zFloor', [[0, '#000', 0], [1, '#000', .85]], 0, 0, 0, 1)}
      </defs>

      <rect width="1600" height="900" fill="url(#zBg)"/>
      ${ell(800, 340, 560, 520, 'fill="url(#zBeam)" opacity=".50"')}
      ${path('M740 0 L870 0 L980 900 L640 900 Z', 'fill="url(#zBeam)" opacity=".13"')}

      ${ell(800, 400, 330, 96, 'fill="none" stroke="#9dc4ee" stroke-opacity=".22" stroke-width="1"')}
      ${ell(800, 400, 262, 76, 'fill="none" stroke="#9dc4ee" stroke-opacity=".14" stroke-width="1"')}

      <g filter="url(#zBlur)" opacity=".55">${path(body, 'fill="#cfe6ff"')}</g>
      <g filter="url(#zSoft)" opacity=".5">
        ${path('M800 126 C868 126 908 182 908 240', 'stroke="#eaf5ff" stroke-width="10" fill="none"')}
      </g>

      ${path(body, 'fill="url(#zBody)"')}
      ${path('M800 336 L866 372 L800 414 L734 372 Z', 'fill="#0a0f16" opacity=".9"')}
      ${path('M800 336 L866 372 L800 414 L734 372 Z', 'fill="none" stroke="#bfe0ff" stroke-opacity=".35" stroke-width="1.2"')}

      ${path('M800 128 C868 128 908 182 908 240 C908 286 890 314 890 338 L982 402 C1038 448 1060 520 1064 640', 'fill="none" stroke="#e8f4ff" stroke-width="2.6" stroke-opacity=".95"')}
      ${path('M800 128 C732 128 692 182 692 240 C692 286 710 314 710 338 L618 402 C562 448 540 520 536 640', 'fill="none" stroke="#9dc4ee" stroke-width="1.6" stroke-opacity=".4"')}
      ${path('M890 338 L982 402 C1038 448 1060 520 1064 640', 'fill="none" stroke="#cfe6ff" stroke-width="7" stroke-opacity=".14" filter="url(#zSoft)"')}

      ${(() => {
        let g = '';
        for (let i = 0; i < 11; i++) {
          const a = i / 11 * Math.PI * 2, rr = 300 + (i % 3) * 46;
          const x = 800 + Math.cos(a) * rr, y = 386 + Math.sin(a) * rr * .32;
          const s = 9 + (i % 3) * 5;
          g += `<g transform="translate(${n(x)} ${n(y)}) rotate(${(i * 37).toFixed(0)})" opacity="${(0.22 + (i % 3) * .17).toFixed(2)}">` +
            rect(-s / 2, -s / 2, s, s, 'fill="none" stroke="#bfe0ff" stroke-width="1"') + `</g>`;
        }
        return g;
      })()}

      ${motes}
      ${rect(0, 560, 1600, 340, 'fill="url(#zFloor)"')}
      ${rect(0, 0, 1600, 900, 'fill="#070d15" opacity=".20"')}
    `);
  }

  /* ==========================================================
     8. 汉堡特写
     ========================================================== */
  function burger() {
    const R = rnd(808);
    let steam = '', sesame = '';
    for (let i = 0; i < 8; i++) {
      const x = 690 + (R() - .5) * 240;
      steam += path(`M${n(x)} 300 C${n(x - 14)} 262 ${n(x + 16)} 232 ${n(x - 2)} 190 C${n(x - 18)} 150 ${n(x + 10)} 122 ${n(x - 4)} 78`,
        `stroke="#ffe6bb" fill="none" stroke-width="${(3 + R() * 6).toFixed(1)}" opacity="${(.05 + R() * .10).toFixed(3)}" stroke-linecap="round"`);
    }
    for (let i = 0; i < 30; i++) {
      const x = 632 + R() * 336;
      const t = (x - 800) / 208;
      const dome = 422 - 94 * Math.sqrt(Math.max(0, 1 - t * t));
      const y = dome + 10 + R() * 30;
      sesame += ell(x, y, 7, 3.6, `fill="#f7dfb2" opacity="${(.4 + R() * .5).toFixed(2)}" transform="rotate(${((x - 800) / 12).toFixed(0)} ${n(x)} ${n(y)})"`);
    }

    return svg(`
      <defs>
        ${lin('bgBg', [[0, '#201510'], [.45, '#2e1e12'], [1, '#0a0605']], 0, 0, 0, 1)}
        ${rad('bgLamp', [[0, '#ffcf8a', .55], [.45, '#c07a2c', .13], [1, '#2a1508', 0]], .5, .5, .5)}
        ${lin('bgBun', [[0, '#efb469'], [.5, '#d08b3e'], [1, '#9a5a22']], 0, 0, 0, 1)}
        ${lin('bgBunB', [[0, '#c8813a'], [1, '#8a4d1a']], 0, 0, 0, 1)}
        ${lin('bgPatty', [[0, '#6a3a1a'], [1, '#2e1607']], 0, 0, 0, 1)}
        ${lin('bgTable', [[0, '#3a2511'], [1, '#0a0604']], 0, 0, 0, 1)}
        ${lin('bgCheese', [[0, '#ffd977'], [1, '#e0a53c']], 0, 0, 0, 1)}
        ${rad('bgShadow', [[0, '#000', .55], [1, '#000', 0]], .5, .5, .5)}
      </defs>

      <rect width="1600" height="900" fill="url(#bgBg)"/>
      ${ell(800, 90, 660, 430, 'fill="url(#bgLamp)"')}

      ${rect(0, 470, 1600, 430, 'fill="url(#bgTable)"')}
      ${path('M0 470 L1600 470', 'stroke="#c08a44" stroke-width="2" stroke-opacity=".55"')}
      ${(() => { let g = ''; for (let i = 0; i < 20; i++) { const y = 500 + R() * 340; g += path(`M0 ${n(y)} L1600 ${n(y + (R() - .5) * 34)}`, `stroke="#22140a" stroke-width="${(1 + R() * 3).toFixed(1)}" opacity=".6"`); } return g; })()}

      <!-- 油纸 -->
      ${path('M470 476 L1130 476 L1180 540 L420 540 Z', 'fill="#e8d4a8" opacity=".14"')}
      ${path('M470 476 L1130 476 L1180 540 L420 540 Z', 'fill="none" stroke="#ffeec4" stroke-opacity=".16" stroke-width="1.5"')}
      ${ell(800, 512, 280, 26, 'fill="url(#bgShadow)"')}

      <g transform="translate(0 -52)">
        ${path('M596 492 C596 466 1004 466 1004 492 L1004 524 C1004 554 596 554 596 524 Z', 'fill="url(#bgBunB)"')}
        ${path('M582 478 C612 456 648 470 680 456 C712 442 748 464 788 452 C828 440 866 462 900 454 C934 446 974 460 1010 478 C966 500 628 502 582 478 Z', 'fill="#54722f"')}
        ${path('M582 478 C624 490 646 476 686 486 C726 496 766 482 806 492 C846 502 886 488 926 498 C956 504 986 492 1010 478', 'stroke="#8cb054" stroke-width="2.4" fill="none" opacity=".5"')}
        ${path('M590 430 C590 402 1010 402 1010 430 L1010 472 C1010 494 590 494 590 472 Z', 'fill="url(#bgPatty)"')}
        ${(() => { let g = ''; for (let i = 0; i < 26; i++) { const x = 610 + R() * 380, y = 432 + R() * 44; g += circ(x, y, 1 + R() * 3, `fill="#8a5a30" opacity="${(R() * .45).toFixed(2)}"`); } return g; })()}
        ${path('M592 418 C700 404 900 404 1008 418 C1020 432 1020 444 1012 456 L998 442 C900 430 700 430 602 442 L588 456 C580 444 580 432 592 418 Z', 'fill="url(#bgCheese)" opacity=".96"')}
        ${path('M592 422 C592 328 1008 328 1008 422 C1008 444 592 444 592 422 Z', 'fill="url(#bgBun)"')}
        ${path('M592 422 C592 328 1008 328 1008 422', 'fill="none" stroke="#f2c282" stroke-width="2" stroke-opacity=".3"')}
        ${sesame}
      </g>

      ${steam}

      ${ell(1240, 40, 420, 300, 'fill="url(#bgLamp)" opacity=".55"')}

      ${rect(0, 0, 1600, 200, 'fill="#000" opacity=".26"')}
      ${rect(0, 680, 1600, 220, 'fill="#080402" opacity=".55"')}
    `);
  }

  /* ==========================================================
     9. 调停 · 光柱
     ========================================================== */
  function parley() {
    const R = rnd(909);
    return svg(`
      <defs>
        ${lin('plSky', [[0, '#1a2230'], [.42, '#232f40'], [.78, '#39485c'], [1, '#4c5a6c']], 0, 0, 0, 1)}
        ${rad('plCol', [[0, '#f4faff', .9], [.28, '#cfe6ff', .45], [.66, '#7fa8de', .12], [1, '#173049', 0]], .5, .5, .5)}
        ${rad('plWarm', [[0, '#ffcf8a', .95], [1, '#7a4413', 0]], .5, .5, .5)}
        ${lin('plBeam', [[0, '#f4faff', .65], [.7, '#a8cdf5', .14], [1, '#4a6c96', 0]], 0, 0, 0, 1)}
        ${lin('plGround', [[0, '#20262e'], [1, '#0a0d11']], 0, 0, 0, 1)}
      </defs>

      <rect width="1600" height="900" fill="url(#plSky)"/>
      ${(() => { let g = ''; for (let i = 0; i < 110; i++) g += circ(R() * 1600, R() * 380, R() * 1.4 + .3, `fill="#e8f2ff" opacity="${(R() * .55).toFixed(2)}"`); return g; })()}

      <!-- 天缝 -->
      ${path('M796 0 L804 0 L810 250 L790 250 Z', 'fill="#ffffff" opacity=".55"')}
      ${ell(800, 130, 90, 130, 'fill="url(#plCol)" opacity=".35"')}

      <!-- 光柱 -->
      ${path('M700 100 L900 100 L1010 620 L590 620 Z', 'fill="url(#plBeam)" opacity=".38"')}
      ${ell(800, 400, 270, 82, 'fill="none" stroke="#cfe6ff" stroke-opacity=".32" stroke-width="1.4"')}
      ${ell(800, 400, 190, 56, 'fill="none" stroke="#cfe6ff" stroke-opacity=".20" stroke-width="1"')}

      <!-- 地面 -->
      ${rect(0, 590, 1600, 310, 'fill="url(#plGround)"')}
      ${path('M0 590 L1600 590', 'stroke="#7b8998" stroke-width="1.4" stroke-opacity=".6"')}
      ${ell(800, 600, 400, 70, 'fill="url(#plCol)" opacity=".30"')}

      <!-- 远处城市 -->
      ${skyline(1212, 592, { minH: 24, maxH: 100, fill: '#1e242c', win: '#c0a878', winOp: .35, step: 28, top: 520 })}

      <!-- 站着的人 -->
      ${person(800, 640, 280, '#0c1016', 1, 1)}
      ${ell(800, 642, 130, 16, 'fill="#000" opacity=".5"')}
      ${circ(700, 500, 32, 'fill="url(#plWarm)"')}
      ${circ(700, 500, 9, 'fill="#fff3da"')}

      ${rect(0, 0, 1600, 900, 'fill="#0b1524" opacity=".14"')}
      ${rect(0, 700, 1600, 200, 'fill="#080a0d" opacity=".5"')}
    `);
  }

  /* ==========================================================
     10. 抗争
     ========================================================== */
  function fight() {
    const R = rnd(1010);
    let crowd = '', beams = '';
    for (let i = 0; i < 26; i++) {
      const x = -20 + R() * 1640;
      const depth = R();
      const h = lerp(150, 275, depth);
      const baseY = lerp(640, 900, depth);
      const lean = (R() - .5) * 9;
      crowd += `<g transform="rotate(${lean.toFixed(1)} ${n(x)} ${n(baseY)})">` +
        person(x, baseY, h, '#060304', .97, 1) + `</g>`;
    }
    for (let i = 0; i < 14; i++) {
      const x = R() * 1600;
      beams += path(`M${n(x)} 0 L${n(x + (R() - .5) * 280)} 600`, `stroke="#ff8a5a" stroke-width="${(1 + R() * 3).toFixed(1)}" opacity="${(R() * .15).toFixed(2)}"`);
    }

    return svg(`
      <defs>
        ${lin('fgSky', [[0, '#241010'], [.32, '#5c1e12'], [.62, '#a84c1e'], [1, '#e09240']], 0, 0, 0, 1)}
        ${rad('fgSun', [[0, '#ffd08a', .9], [.38, '#e07a2a', .32], [1, '#5a1a08', 0]], .5, .5, .5)}
        ${rad('fgUnder', [[0, '#ffe0b0', .60], [.4, '#e08a2a', .18], [1, '#5a1a08', 0]], .5, .5, .5)}
        ${lin('fgGround', [[0, '#2e150c'], [1, '#060303']], 0, 0, 0, 1)}
        ${lin('fgHull', [[0, '#1a0f0c'], [1, '#241410']], 0, 0, 0, 1)}
      </defs>

      <rect width="1600" height="900" fill="url(#fgSky)"/>
      ${ell(800, 540, 780, 340, 'fill="url(#fgSun)"')}
      ${beams}

      ${path('M300 190 C520 130 1080 130 1300 190 C1180 240 980 262 800 262 C620 262 420 240 300 190 Z', 'fill="url(#fgHull)" stroke="#ffb066" stroke-opacity=".5" stroke-width="1.4"')}
      ${path('M300 190 C520 130 1080 130 1300 190', 'fill="none" stroke="#ffc48a" stroke-opacity=".6" stroke-width="1.6"')}
      ${circ(560, 168, 52, 'fill="url(#fgSun)" opacity=".85"')}
      ${circ(1060, 158, 44, 'fill="url(#fgSun)" opacity=".75"')}
      ${path('M880 142 L968 106 L1024 174 L930 194 Z', 'fill="#1a1013" opacity=".92"')}
      ${ell(800, 244, 380, 54, 'fill="url(#fgUnder)"')}
      ${path('M600 242 L1000 242', 'stroke="#ffe0b0" stroke-opacity=".5" stroke-width="2.5"')}

      ${rect(0, 590, 1600, 310, 'fill="url(#fgGround)"')}
      ${path('M0 590 L1600 590', 'stroke="#ff9a5a" stroke-width="1.6" stroke-opacity=".4"')}

      ${path('M286 596 L286 362 L462 394 L286 434 Z', 'fill="#a81e12" opacity=".92"')}
      ${path('M1276 606 L1276 378 L1442 408 L1276 446 Z', 'fill="#a81e12" opacity=".86"')}
      ${path('M286 362 L1276 378', 'stroke="#3a1210" stroke-width="1" opacity=".3"')}

      ${crowd}

      ${ell(800, 580, 280, 80, 'fill="#ffd9a0" opacity=".12"')}
      <rect width="1600" height="900" fill="#2a0804" opacity=".10"/>
      ${rect(0, 680, 1600, 220, 'fill="#060304" opacity=".5"')}
    `);
  }

  /* ==========================================================
     11. 银雨 · 终末
     ========================================================== */
  function silver() {
    const R = rnd(1111);
    let rain = '';
    for (let i = 0; i < 190; i++) {
      const x = R() * 1700 - 50, y = R() * 900, h = 30 + R() * 130;
      rain += path(`M${n(x)} ${n(y)} L${n(x - h * .22)} ${n(y + h)}`,
        `stroke="#ffffff" stroke-width="${(.6 + R() * 1.9).toFixed(1)}" opacity="${(.06 + R() * .38).toFixed(2)}"`);
    }
    return svg(`
      <defs>
        ${lin('svSky', [[0, '#eef5fc'], [.42, '#b6cde2'], [1, '#8aa4bd']], 0, 0, 0, 1)}
        ${rad('svCore', [[0, '#ffffff', .95], [.48, '#eaf5ff', .38], [1, '#a8c3dd', 0]], .5, .5, .5)}
        ${lin('svCity', [[0, '#9db6cd'], [1, '#cfe0ee']], 0, 0, 0, 1)}
      </defs>

      <rect width="1600" height="900" fill="url(#svSky)"/>
      ${ell(800, 240, 920, 620, 'fill="url(#svCore)" opacity=".55"')}

      ${(() => {
        let g = '';
        for (let i = 0; i < 28; i++) {
          const x = R() * 1600, w = 40 + R() * 90, h = 70 + R() * 320;
          g += rect(x, 900 - h, w, h, `fill="url(#svCity)" opacity="${(.22 + R() * .5).toFixed(2)}"`);
        }
        return g;
      })()}
      ${skyline(1414, 900, { minH: 60, maxH: 320, fill: '#aac0d4', win: '#ffffff', winOp: .25, step: 38, top: 560 })}

      ${rain}
      <rect width="1600" height="900" fill="#ffffff" opacity=".10"/>
      ${rect(0, 700, 1600, 200, 'fill="#ffffff" opacity=".14"')}
    `);
  }

  function blank() { return svg(`<rect width="1600" height="900" fill="#040507"/>`); }

  /* ---------- 场景元数据 ---------- */
  const META = {
    corridor: { particle: 'dust', tint: 'rgba(190,205,225,.10)', count: 34, speed: .18 },
    street: { particle: 'ash', tint: 'rgba(200,198,188,.10)', count: 46, speed: .5 },
    truck: { particle: 'ember', tint: 'rgba(255,200,140,.14)', count: 34, speed: .22 },
    cafeteria: { particle: 'dust', tint: 'rgba(255,205,140,.12)', count: 40, speed: .14 },
    riot: { particle: 'ember', tint: 'rgba(255,110,70,.16)', count: 66, speed: .85 },
    rooftop: { particle: 'ash', tint: 'rgba(200,220,255,.10)', count: 44, speed: .35 },
    zero: { particle: 'snow', tint: 'rgba(200,225,255,.16)', count: 48, speed: .25 },
    burger: { particle: 'ember', tint: 'rgba(255,200,140,.12)', count: 24, speed: .12 },
    parley: { particle: 'snow', tint: 'rgba(220,240,255,.16)', count: 54, speed: .3 },
    fight: { particle: 'ember', tint: 'rgba(255,140,80,.16)', count: 74, speed: .9 },
    silver: { particle: 'rain', tint: 'rgba(230,245,255,.22)', count: 90, speed: 1.4 },
    blank: { particle: 'none', tint: 'transparent', count: 0, speed: 0 }
  };

  const DRAW = { corridor, street, truck, cafeteria, riot, rooftop, zero, burger, parley, fight, silver, blank };

  return {
    render(name) { return (DRAW[name] || DRAW.blank)(); },
    meta(name) { return META[name] || META.blank; },
    names: Object.keys(DRAW)
  };
})();


