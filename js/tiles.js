/* Ashland Elementary 26/27 - procedural 16x16 tileset (SNES style) */
var G = window.G = window.G || {};

(function () {
  var TS = 16; // tile size
  var cache = new Map();

  // deterministic rng per tile type so repeated tiles look identical
  function seeded(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h |= 0; h = (h + 0x6D2B79F5) | 0;
      var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mk() {
    var c = document.createElement('canvas');
    c.width = TS; c.height = TS;
    return c;
  }

  // tiny 3x5 pixel font (signs, banners, name plates)
  var FONT35 = {
    A: ['010', '101', '111', '101', '101'],
    B: ['110', '101', '110', '101', '110'],
    C: ['011', '100', '100', '100', '011'],
    D: ['110', '101', '101', '101', '110'],
    E: ['111', '100', '110', '100', '111'],
    F: ['111', '100', '110', '100', '100'],
    G: ['011', '100', '101', '101', '011'],
    H: ['101', '101', '111', '101', '101'],
    I: ['111', '010', '010', '010', '111'],
    J: ['011', '001', '001', '101', '010'],
    K: ['101', '110', '100', '110', '101'],
    L: ['100', '100', '100', '100', '111'],
    M: ['101', '111', '111', '101', '101'],
    N: ['110', '101', '101', '101', '101'],
    O: ['010', '101', '101', '101', '010'],
    P: ['110', '101', '110', '100', '100'],
    Q: ['010', '101', '101', '010', '001'],
    R: ['110', '101', '110', '110', '101'],
    S: ['011', '100', '010', '001', '110'],
    T: ['111', '010', '010', '010', '010'],
    U: ['101', '101', '101', '101', '111'],
    V: ['101', '101', '101', '101', '010'],
    W: ['101', '101', '111', '111', '101'],
    X: ['101', '101', '010', '101', '101'],
    Y: ['101', '101', '010', '010', '010'],
    Z: ['111', '001', '010', '100', '111'],
    0: ['111', '101', '101', '101', '111'],
    1: ['010', '110', '010', '010', '111'],
    2: ['110', '001', '010', '100', '111'],
    3: ['110', '001', '010', '001', '110'],
    4: ['101', '101', '111', '001', '001'],
    5: ['111', '100', '110', '001', '110'],
    6: ['011', '100', '111', '101', '111'],
    7: ['111', '001', '010', '010', '010'],
    8: ['111', '101', '010', '101', '111'],
    9: ['111', '101', '111', '001', '110'],
    '.': ['000', '000', '000', '000', '010'],
    '-': ['000', '000', '111', '000', '000'],
    '&': ['010', '101', '010', '101', '011'],
    '/': ['001', '001', '010', '100', '100'],
    "'": ['010', '010', '000', '000', '000'],
    '!': ['010', '010', '010', '000', '010']
  };

  function drawTinyText(ctx, text, x, y, color, scale) {
    scale = scale || 1;
    ctx.fillStyle = color;
    for (var i = 0; i < text.length; i++) {
      var glyph = FONT35[text[i]];
      if (!glyph) continue;
      for (var r = 0; r < 5; r++) {
        for (var c = 0; c < 3; c++) {
          if (glyph[r][c] === '1') {
            ctx.fillRect(x + (i * 4 + c) * scale, y + r * scale, scale, scale);
          }
        }
      }
    }
  }

  function speckle(ctx, rnd, n, colors) {
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      ctx.fillRect(Math.floor(rnd() * TS), Math.floor(rnd() * TS), 1, 1);
    }
  }

  // checkerboard dithering - the signature 16-bit shading technique
  function dither(ctx, x, y, w, h, color, phase) {
    ctx.fillStyle = color;
    for (var yy = y; yy < y + h; yy++) {
      for (var xx = x; xx < x + w; xx++) {
        if ((xx + yy + (phase || 0)) % 2 === 0) ctx.fillRect(xx, yy, 1, 1);
      }
    }
  }

  // ---- floors -------------------------------------------------------------
  function pFloor(ctx, rnd) {
    // waxed tile, FF6-style: 4-shade ramp with dithered transitions
    ctx.fillStyle = '#f2ecdf';
    ctx.fillRect(0, 0, TS, 4);
    ctx.fillStyle = '#ece5d8';
    ctx.fillRect(0, 4, TS, 5);
    ctx.fillStyle = '#e4dccd';
    ctx.fillRect(0, 9, TS, 4);
    ctx.fillStyle = '#dbd2c0';
    ctx.fillRect(0, 13, TS, 3);
    dither(ctx, 0, 3, TS, 2, '#f2ecdf');
    dither(ctx, 0, 8, TS, 2, '#ece5d8');
    dither(ctx, 0, 12, TS, 2, '#e4dccd');
    speckle(ctx, rnd, 16, ['#f6f1e6', '#d8cfbd']);
    // glossy diagonal glint
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (var g = 0; g < 5; g++) ctx.fillRect(3 + g, 8 - g, 1, 1);
    ctx.fillStyle = '#f8f4ea';
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillRect(0, 0, 1, TS);
    ctx.fillStyle = '#cfc6b2';
    ctx.fillRect(0, 15, TS, 1);
    ctx.fillRect(15, 0, 1, TS);
  }

  function pGreen(ctx, rnd) {
    ctx.fillStyle = '#4cae76';
    ctx.fillRect(0, 0, TS, 4);
    ctx.fillStyle = '#3a9a63';
    ctx.fillRect(0, 4, TS, 5);
    ctx.fillStyle = '#2f8654';
    ctx.fillRect(0, 9, TS, 4);
    ctx.fillStyle = '#256e44';
    ctx.fillRect(0, 13, TS, 3);
    dither(ctx, 0, 3, TS, 2, '#4cae76');
    dither(ctx, 0, 8, TS, 2, '#3a9a63');
    dither(ctx, 0, 12, TS, 2, '#2f8654');
    speckle(ctx, rnd, 12, ['#5fbd87', '#2f8654']);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var g = 0; g < 5; g++) ctx.fillRect(9 + g, 9 - g, 1, 1);
    ctx.fillStyle = '#6cc492';
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillRect(0, 0, 1, TS);
    ctx.fillStyle = '#1f5e3a';
    ctx.fillRect(0, 15, TS, 1);
    ctx.fillRect(15, 0, 1, TS);
  }

  function pBlue(ctx, rnd) {
    ctx.fillStyle = '#5c80ba';
    ctx.fillRect(0, 0, TS, 4);
    ctx.fillStyle = '#4b6ea9';
    ctx.fillRect(0, 4, TS, 5);
    ctx.fillStyle = '#3d5c92';
    ctx.fillRect(0, 9, TS, 4);
    ctx.fillStyle = '#31497a';
    ctx.fillRect(0, 13, TS, 3);
    dither(ctx, 0, 3, TS, 2, '#5c80ba');
    dither(ctx, 0, 8, TS, 2, '#4b6ea9');
    dither(ctx, 0, 12, TS, 2, '#3d5c92');
    speckle(ctx, rnd, 12, ['#6383b8', '#31497a']);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var g = 0; g < 5; g++) ctx.fillRect(4 + g, 10 - g, 1, 1);
    ctx.fillStyle = '#87a3d0';
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillRect(0, 0, 1, TS);
    ctx.fillStyle = '#28406a';
    ctx.fillRect(0, 15, TS, 1);
    ctx.fillRect(15, 0, 1, TS);
  }

  function pGymFloor(ctx, rnd) {
    // varnished wood planks with a dithered sheen
    ctx.fillStyle = '#e2c185';
    ctx.fillRect(0, 0, TS, 6);
    ctx.fillStyle = '#d9b877';
    ctx.fillRect(0, 6, TS, 6);
    ctx.fillStyle = '#cca960';
    ctx.fillRect(0, 12, TS, 4);
    dither(ctx, 0, 5, TS, 2, '#e2c185');
    dither(ctx, 0, 11, TS, 2, '#d9b877');
    speckle(ctx, rnd, 10, ['#d1ad66', '#eccf98']);
    ctx.fillStyle = '#b8944c';
    ctx.fillRect(0, 5, TS, 1);
    ctx.fillRect(0, 11, TS, 1);
    ctx.fillStyle = 'rgba(140,105,50,0.5)';
    ctx.fillRect(8, 0, 1, TS);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (var g = 0; g < 4; g++) ctx.fillRect(11 + g, 4 - g, 1, 1);
  }

  function pGymLine(ctx, rnd, dir) {
    pGymFloor(ctx, rnd);
    ctx.fillStyle = '#f4f0e6';
    if (dir === 'h') ctx.fillRect(0, 7, TS, 2);
    else ctx.fillRect(7, 0, 2, TS);
  }

  function pGymKey(ctx, rnd) {
    // painted free-throw lane in school green
    pGymFloor(ctx, rnd);
    ctx.fillStyle = 'rgba(31, 122, 77, 0.6)';
    ctx.fillRect(0, 0, TS, TS);
  }

  function pGymCircle(ctx, rnd, corner) {
    // quarter of the white center circle; shared center at the joined corner
    pGymFloor(ctx, rnd);
    var cx = (corner === 'tl' || corner === 'bl') ? TS : 0;
    var cy = (corner === 'tl' || corner === 'tr') ? TS : 0;
    ctx.strokeStyle = '#f4f0e6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  function pCarpet(ctx, rnd) {
    // woven carpet with dithered nap
    ctx.fillStyle = '#7c93bb';
    ctx.fillRect(0, 0, TS, TS);
    dither(ctx, 0, 0, TS, TS, '#7288b0');
    speckle(ctx, rnd, 22, ['#6f86ae', '#8aa0c6', '#8598c0']);
    ctx.fillStyle = '#8aa0c6';
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillStyle = '#66799e';
    ctx.fillRect(0, 15, TS, 1);
  }

  // ---- walls --------------------------------------------------------------
  function pWall(ctx, rnd) {
    // white cinderblock, FF6-style: beveled faces with dithered falloff
    ctx.fillStyle = '#d9d9d3';
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#e9e9e3';
    ctx.fillRect(0, 1, TS, 3);
    ctx.fillRect(0, 9, TS, 3);
    ctx.fillStyle = '#c4c4bb';
    ctx.fillRect(0, 5, TS, 2);
    ctx.fillRect(0, 13, TS, 2);
    dither(ctx, 0, 4, TS, 2, '#e9e9e3');
    dither(ctx, 0, 12, TS, 2, '#e9e9e3');
    ctx.fillStyle = '#a2a297';           // mortar
    ctx.fillRect(0, 7, TS, 1);
    ctx.fillRect(0, 15, TS, 1);
    ctx.fillRect(7, 0, 1, 7);
    ctx.fillRect(3, 8, 1, 7);
    ctx.fillRect(11, 8, 1, 7);
    ctx.fillStyle = '#f2f2ec';           // top bevels
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillRect(0, 8, TS, 1);
    speckle(ctx, rnd, 8, ['#cfcfc7', '#e2e2da', '#d4d4cc']);
  }

  function pBulletin(ctx, rnd, frame, paper) {
    pWall(ctx, rnd);
    ctx.fillStyle = frame;
    ctx.fillRect(1, 2, 14, 12);
    ctx.fillStyle = paper;
    ctx.fillRect(2, 3, 12, 10);
    // pinned papers
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 4, 4, 4);
    ctx.fillRect(9, 7, 4, 4);
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(8, 4, 3, 2);
    ctx.fillStyle = '#e06a92';
    ctx.fillRect(4, 9, 3, 2);
  }

  function pExitSign(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#101014';
    ctx.fillRect(1, 4, 14, 9);
    ctx.fillStyle = '#7a1616';
    ctx.fillRect(2, 5, 12, 7);
    drawTinyText(ctx, 'EXIT', 1, 6, '#ff5a4a', 1);
  }

  function pFountain(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(3, 6, 10, 9);
    ctx.fillStyle = '#9aa2ac';
    ctx.fillRect(4, 7, 8, 7);
    ctx.fillStyle = '#c3cad2';
    ctx.fillRect(4, 7, 8, 2);
    ctx.fillStyle = '#5b6570';
    ctx.fillRect(6, 9, 4, 1);
    ctx.fillStyle = '#8fd4ff';
    ctx.fillRect(9, 8, 1, 1);
  }

  function pWhiteboard(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#8b9098';
    ctx.fillRect(0, 3, TS, 11);
    ctx.fillStyle = '#fbfbf6';
    ctx.fillRect(1, 4, 14, 9);
    ctx.fillStyle = '#3a63c4';
    ctx.fillRect(3, 6, 5, 1);
    ctx.fillStyle = '#c43a3a';
    ctx.fillRect(4, 9, 7, 1);
    ctx.fillStyle = '#2e8f57';
    ctx.fillRect(9, 6, 4, 1);
  }

  function pWindow(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242e';
    ctx.fillRect(1, 2, 14, 12);
    ctx.fillStyle = '#8ec8f0';
    ctx.fillRect(2, 3, 12, 10);
    ctx.fillStyle = '#bfe3fa';
    ctx.fillRect(2, 3, 12, 4);
    dither(ctx, 2, 6, 12, 2, '#bfe3fa');
    // FF-style diagonal glass gleam
    ctx.fillStyle = '#ffffff';
    for (var g = 0; g < 6; g++) ctx.fillRect(4 + g, 11 - g, 1, 1);
    for (var g2 = 0; g2 < 4; g2++) ctx.fillRect(8 + g2, 12 - g2, 1, 1);
    ctx.fillStyle = '#5b6570';
    ctx.fillRect(7, 2, 1, 12);
    ctx.fillRect(1, 8, 14, 1);
    ctx.fillStyle = '#e8e8e2';           // sill highlight
    ctx.fillRect(1, 13, 14, 1);
  }

  function pCurtain(ctx, rnd) {
    // big red stage curtain, FF6-style folds with dithered rolloff
    for (var x = 0; x < TS; x++) {
      var m = x % 5;
      var shade = m === 0 ? '#5e0e18' : m === 1 ? '#8e1826' : m === 2 ? '#c22838' : m === 3 ? '#d84656' : '#a01e2c';
      ctx.fillStyle = shade;
      ctx.fillRect(x, 0, 1, TS);
    }
    for (var x2 = 2; x2 < TS; x2 += 5) dither(ctx, x2, 0, 2, 14, '#e06070', x2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';   // top shadow
    ctx.fillRect(0, 0, TS, 2);
    ctx.fillStyle = '#e8b64c';            // gold fringe
    ctx.fillRect(0, 13, TS, 2);
    ctx.fillStyle = '#b9862c';
    for (var f = 0; f < TS; f += 2) ctx.fillRect(f, 15, 1, 1);
  }

  function pStageFront(ctx, rnd) {
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#a06b3f';
    ctx.fillRect(0, 0, TS, 4);
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, 4, TS, 1);
    ctx.fillStyle = '#6f4726';
    ctx.fillRect(0, 9, TS, 1);
    ctx.fillRect(5, 5, 1, TS - 5);
    ctx.fillRect(11, 10, 1, 6);
  }

  // ---- doors & stairs -----------------------------------------------------
  function pDoor(ctx, rnd) {
    // the real Ashland door: birch wood, black frame, tall window slit, silver lever
    ctx.fillStyle = '#15151a';                 // black frame
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#cda45e';                 // birch wood
    ctx.fillRect(2, 1, 12, 15);
    ctx.fillStyle = '#bd9350';                 // soft grain
    ctx.fillRect(4, 1, 1, 15);
    ctx.fillRect(7, 2, 1, 13);
    ctx.fillStyle = '#dbb672';
    ctx.fillRect(3, 1, 1, 15);
    ctx.fillRect(6, 1, 1, 14);
    // tall narrow window slit (right of center)
    ctx.fillStyle = '#15151a';
    ctx.fillRect(9, 2, 2, 9);
    ctx.fillStyle = '#2e3a44';
    ctx.fillRect(9, 3, 2, 7);
    // silver lever handle
    ctx.fillStyle = '#c0c6cc';
    ctx.fillRect(10, 11, 3, 1);
    ctx.fillRect(12, 10, 1, 2);
  }

  function pWallTop(ctx, rnd) {
    // the TOP of a wall (FF6-style): cooler, darker slab pattern so only
    // the wall faces read bright
    ctx.fillStyle = '#aeb2b8';
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#bcc0c6';
    ctx.fillRect(0, 1, TS, 2);
    ctx.fillRect(0, 9, TS, 2);
    ctx.fillStyle = '#9a9ea6';
    ctx.fillRect(0, 5, TS, 2);
    ctx.fillRect(0, 13, TS, 2);
    dither(ctx, 0, 3, TS, 2, '#bcc0c6');
    dither(ctx, 0, 11, TS, 2, '#bcc0c6');
    ctx.fillStyle = '#83878f';           // slab seams
    ctx.fillRect(0, 7, TS, 1);
    ctx.fillRect(0, 15, TS, 1);
    ctx.fillRect(7, 0, 1, 7);
    ctx.fillRect(3, 8, 1, 7);
    ctx.fillRect(11, 8, 1, 7);
    ctx.fillStyle = '#ccd0d6';           // lit slab tops
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillRect(0, 8, TS, 1);
    speckle(ctx, rnd, 8, ['#a5a9b0', '#b8bcc2']);
  }

  function pVoidWall(ctx, rnd) {
    // solid building mass outside the halls and rooms: dimmed wall-top slabs
    pWallTop(ctx, rnd);
    ctx.fillStyle = 'rgba(16, 18, 26, 0.38)';
    ctx.fillRect(0, 0, TS, TS);
  }

  function pPurple(ctx, rnd) {
    // glass entry doors (locked until the first day of school)
    ctx.fillStyle = '#2e3238';                 // aluminum frame
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#9fcede';                 // glass
    ctx.fillRect(2, 1, 12, 14);
    ctx.fillStyle = '#c9e6f2';                 // sky reflection up top
    ctx.fillRect(2, 1, 12, 4);
    dither(ctx, 2, 5, 12, 2, '#c9e6f2');
    ctx.fillStyle = '#6fa8bc';                 // darker glass below
    ctx.fillRect(2, 11, 12, 4);
    dither(ctx, 2, 10, 12, 2, '#6fa8bc');
    // diagonal gleam
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (var g = 0; g < 6; g++) ctx.fillRect(3 + g, 9 - g, 1, 1);
    // center stile + silver push bar
    ctx.fillStyle = '#2e3238';
    ctx.fillRect(7, 1, 2, 14);
    ctx.fillStyle = '#d5dae0';
    ctx.fillRect(2, 8, 12, 2);
    ctx.fillStyle = '#8f959c';
    ctx.fillRect(2, 9, 12, 1);
  }

  function pStairs(ctx, rnd, up) {
    // heavy stairwell door (like the real ones): dark leaf, lit window slit,
    // silver push bar, stainless kick plate - two side by side = double doors
    ctx.fillStyle = '#101216';                 // frame
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#3a3e46';                 // charcoal leaf
    ctx.fillRect(1, 2, 14, 13);
    ctx.fillStyle = '#4a4f58';                 // top sheen
    ctx.fillRect(1, 2, 14, 2);
    dither(ctx, 1, 4, 14, 2, '#4a4f58');
    // tall window with lit safety glass
    ctx.fillStyle = '#101216';
    ctx.fillRect(6, 3, 4, 6);
    ctx.fillStyle = '#efe6b4';
    ctx.fillRect(7, 4, 2, 4);
    // silver push bar
    ctx.fillStyle = '#e0e5ea';
    ctx.fillRect(1, 9, 14, 2);
    ctx.fillStyle = '#9aa0a8';
    ctx.fillRect(1, 10, 14, 1);
    // stainless kick plate
    ctx.fillStyle = '#c3cad2';
    ctx.fillRect(1, 12, 14, 3);
    ctx.fillStyle = '#e2e8ee';
    ctx.fillRect(1, 12, 14, 1);
    ctx.fillStyle = '#7c828a';
    ctx.fillRect(1, 15, 14, 1);
  }

  function pMat(ctx, rnd) {
    // the way out of a room is just... the door
    pDoor(ctx, rnd);
  }

  // ---- furniture ----------------------------------------------------------
  function pDeskS(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';                 // outline
    ctx.fillRect(1, 3, 14, 9);
    ctx.fillStyle = '#c9974f';
    ctx.fillRect(2, 4, 12, 7);
    ctx.fillStyle = '#e0b06a';                 // lit desktop
    ctx.fillRect(2, 4, 12, 2);
    dither(ctx, 2, 6, 12, 2, '#e0b06a');
    ctx.fillStyle = '#a87a3c';                 // shaded lip
    ctx.fillRect(2, 10, 12, 1);
    ctx.fillStyle = '#ffffff';                 // paper
    ctx.fillRect(4, 6, 4, 3);
    ctx.fillStyle = '#d8d8e0';
    ctx.fillRect(4, 8, 4, 1);
    ctx.fillStyle = '#1c1c26';                 // chair outline
    ctx.fillRect(3, 11, 10, 4);
    ctx.fillStyle = '#7c4f2a';
    ctx.fillRect(4, 12, 8, 3);
    ctx.fillStyle = '#9a6538';
    ctx.fillRect(4, 12, 8, 1);
  }

  function pDeskT(ctx, rnd, side) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#2a2018';
    var x0 = side === 'l' ? 1 : 0, w = side === 'l' ? 15 : 15;
    ctx.fillRect(x0, 3, w, 11);
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(side === 'l' ? 2 : 0, 4, side === 'l' ? 14 : 14, 9);
    ctx.fillStyle = '#a06b3f';
    ctx.fillRect(side === 'l' ? 2 : 0, 4, side === 'l' ? 14 : 14, 3);
    if (side === 'l') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 5, 5, 3);
      ctx.fillStyle = '#c43a3a';
      ctx.fillRect(11, 8, 3, 3);
    } else {
      ctx.fillStyle = '#3a63c4';
      ctx.fillRect(3, 6, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(8, 5, 4, 3);
    }
  }

  function pShelf(ctx, rnd) {
    ctx.fillStyle = '#4a2f16';
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#6f4a26';
    ctx.fillRect(1, 0, 14, 15);
    var books = ['#c43a3a', '#3a63c4', '#2e8f57', '#e8b64c', '#9a6ee0', '#e06a92', '#4aa9c4'];
    for (var row = 0; row < 2; row++) {
      var y = 2 + row * 7;
      ctx.fillStyle = '#3a2510';
      ctx.fillRect(1, y + 5, 14, 1);
      var x = 2;
      while (x < 14) {
        var w = 1 + Math.floor(rnd() * 2);
        ctx.fillStyle = books[Math.floor(rnd() * books.length)];
        ctx.fillRect(x, y, w, 5);
        x += w + (rnd() < 0.2 ? 1 : 0);
      }
    }
  }

  function pTable(ctx, rnd) {
    // light brown wooden table (tiles connect into one long table)
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 3, TS, 8);
    ctx.fillStyle = '#d9b076';
    ctx.fillRect(0, 4, TS, 6);
    ctx.fillStyle = '#ecca94';                 // lit top edge
    ctx.fillRect(0, 4, TS, 2);
    dither(ctx, 0, 6, TS, 2, '#ecca94');
    ctx.fillStyle = '#c1965a';                 // wood grain
    ctx.fillRect(0, 8, TS, 1);
    speckle(ctx, rnd, 5, ['#c99e60', '#e2bd85']);
    ctx.fillStyle = '#a97f47';                 // shaded lip
    ctx.fillRect(0, 9, TS, 1);
    ctx.fillStyle = '#1c1c26';                 // bench outline
    ctx.fillRect(0, 11, TS, 4);
    ctx.fillStyle = '#c1965a';                 // matching wood bench
    ctx.fillRect(0, 12, TS, 3);
    ctx.fillStyle = '#daaf72';
    ctx.fillRect(0, 12, TS, 1);
  }

  // table pieces for auto-joining: top edge / continuous middle / bench bottom
  function pTableTop(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 3, TS, 13);
    ctx.fillStyle = '#d9b076';
    ctx.fillRect(0, 4, TS, 12);
    ctx.fillStyle = '#ecca94';
    ctx.fillRect(0, 4, TS, 2);
    dither(ctx, 0, 6, TS, 2, '#ecca94');
    ctx.fillStyle = '#c1965a';
    ctx.fillRect(0, 10, TS, 1);
    ctx.fillRect(0, 14, TS, 1);
    speckle(ctx, rnd, 4, ['#c99e60', '#e2bd85']);
  }

  function pTableMid(ctx, rnd) {
    ctx.fillStyle = '#d9b076';
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#c1965a';
    ctx.fillRect(0, 4, TS, 1);
    ctx.fillRect(0, 10, TS, 1);
    dither(ctx, 0, 12, TS, 2, '#e2bd85');
    speckle(ctx, rnd, 6, ['#c99e60', '#e2bd85', '#cfa468']);
  }

  function pTableBot(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 0, TS, 11);
    ctx.fillStyle = '#d9b076';
    ctx.fillRect(0, 0, TS, 9);
    ctx.fillStyle = '#c1965a';
    ctx.fillRect(0, 3, TS, 1);
    speckle(ctx, rnd, 4, ['#c99e60', '#e2bd85']);
    ctx.fillStyle = '#a97f47';                 // shaded lip
    ctx.fillRect(0, 9, TS, 1);
    ctx.fillStyle = '#1c1c26';                 // bench outline
    ctx.fillRect(0, 11, TS, 4);
    ctx.fillStyle = '#c1965a';                 // wood bench
    ctx.fillRect(0, 12, TS, 3);
    ctx.fillStyle = '#daaf72';
    ctx.fillRect(0, 12, TS, 1);
  }

  // green-topped versions of the joining tables
  var GT = { top: '#4e9a5e', lit: '#74c084', grain: '#3d7f4c', lip: '#2f6a3d',
             bench: '#3d7f4c', benchLit: '#5eae70', sp: ['#46905a', '#68b878'] };

  function pGTable(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 3, TS, 8);
    ctx.fillStyle = GT.top;
    ctx.fillRect(0, 4, TS, 6);
    ctx.fillStyle = GT.lit;
    ctx.fillRect(0, 4, TS, 2);
    dither(ctx, 0, 6, TS, 2, GT.lit);
    ctx.fillStyle = GT.grain;
    ctx.fillRect(0, 8, TS, 1);
    speckle(ctx, rnd, 5, GT.sp);
    ctx.fillStyle = GT.lip;
    ctx.fillRect(0, 9, TS, 1);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 11, TS, 4);
    ctx.fillStyle = GT.bench;
    ctx.fillRect(0, 12, TS, 3);
    ctx.fillStyle = GT.benchLit;
    ctx.fillRect(0, 12, TS, 1);
  }
  function pGTableTop(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 3, TS, 13);
    ctx.fillStyle = GT.top;
    ctx.fillRect(0, 4, TS, 12);
    ctx.fillStyle = GT.lit;
    ctx.fillRect(0, 4, TS, 2);
    dither(ctx, 0, 6, TS, 2, GT.lit);
    ctx.fillStyle = GT.grain;
    ctx.fillRect(0, 10, TS, 1);
    ctx.fillRect(0, 14, TS, 1);
    speckle(ctx, rnd, 4, GT.sp);
  }
  function pGTableMid(ctx, rnd) {
    ctx.fillStyle = GT.top;
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = GT.grain;
    ctx.fillRect(0, 4, TS, 1);
    ctx.fillRect(0, 10, TS, 1);
    dither(ctx, 0, 12, TS, 2, GT.lit);
    speckle(ctx, rnd, 6, GT.sp.concat(['#529c64']));
  }
  function pGTableBot(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 0, TS, 11);
    ctx.fillStyle = GT.top;
    ctx.fillRect(0, 0, TS, 9);
    ctx.fillStyle = GT.grain;
    ctx.fillRect(0, 3, TS, 1);
    speckle(ctx, rnd, 4, GT.sp);
    ctx.fillStyle = GT.lip;
    ctx.fillRect(0, 9, TS, 1);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 11, TS, 4);
    ctx.fillStyle = GT.bench;
    ctx.fillRect(0, 12, TS, 3);
    ctx.fillStyle = GT.benchLit;
    ctx.fillRect(0, 12, TS, 1);
  }

  function pMapRug(ctx, rnd) {
    // world-map rug: ocean blue with little green continents and a tan border
    ctx.fillStyle = '#2e6da8';
    ctx.fillRect(0, 0, TS, TS);
    dither(ctx, 0, 0, TS, TS, '#3a7db8');
    ctx.fillStyle = '#d9c9a0';                 // rug border
    ctx.fillRect(0, 0, TS, 1); ctx.fillRect(0, TS - 1, TS, 1);
    ctx.fillRect(0, 0, 1, TS); ctx.fillRect(TS - 1, 0, 1, TS);
    ctx.fillStyle = '#4a9a54';                 // continents
    ctx.fillRect(3, 3, 4, 3);
    ctx.fillRect(5, 6, 2, 2);
    ctx.fillRect(10, 4, 3, 2);
    ctx.fillRect(9, 9, 4, 3);
    ctx.fillRect(4, 11, 3, 2);
    ctx.fillStyle = '#63b46d';                 // lit edges
    ctx.fillRect(3, 3, 4, 1);
    ctx.fillRect(10, 4, 3, 1);
    ctx.fillRect(9, 9, 4, 1);
    ctx.fillStyle = '#f4f4ee';                 // tiny ice caps
    ctx.fillRect(7, 1, 2, 1);
    ctx.fillRect(7, 14, 2, 1);
  }

  function pShapeRug(ctx, rnd) {
    // kindergarten shape rug: soft gray with a bright shape per tile
    ctx.fillStyle = '#b8bcc4';
    ctx.fillRect(0, 0, TS, TS);
    dither(ctx, 0, 0, TS, TS, '#c8ccd4');
    ctx.fillStyle = '#9aa0aa';                 // grid seams
    ctx.fillRect(0, 0, TS, 1); ctx.fillRect(0, 0, 1, TS);
    var pick = rnd() * 4;
    if (pick < 1) {                            // red circle
      ctx.fillStyle = '#c43a3a';
      ctx.fillRect(5, 4, 6, 8); ctx.fillRect(4, 5, 8, 6);
      ctx.fillStyle = '#e06a6a'; ctx.fillRect(5, 5, 3, 2);
    } else if (pick < 2) {                     // blue triangle
      ctx.fillStyle = '#2e6da8';
      for (var t = 0; t < 6; t++) ctx.fillRect(8 - t, 5 + t, 1 + t * 2, 1);
      ctx.fillRect(3, 11, 11, 1);
    } else if (pick < 3) {                     // yellow square
      ctx.fillStyle = '#e8c22c';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#f7dc6a'; ctx.fillRect(4, 4, 8, 2);
    } else {                                   // green diamond
      ctx.fillStyle = '#3a8a4e';
      for (var d = 0; d < 4; d++) { ctx.fillRect(8 - d, 4 + d, 1 + d * 2, 1); ctx.fillRect(8 - d, 11 - d, 1 + d * 2, 1); }
      ctx.fillStyle = '#63b46d'; ctx.fillRect(7, 5, 2, 1);
    }
  }

  function pLightSwitch(ctx, rnd) {
    // wall plate with a flip switch
    pWall(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(5, 4, 6, 9);
    ctx.fillStyle = '#ece8dc';
    ctx.fillRect(6, 5, 4, 7);
    ctx.fillStyle = '#c9c4b4';
    ctx.fillRect(6, 10, 4, 2);
    ctx.fillStyle = '#3a3f45';                 // the switch
    ctx.fillRect(7, 6, 2, 3);
    ctx.fillStyle = '#6a707a';
    ctx.fillRect(7, 6, 2, 1);
  }

  function pCounter(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(0, 2, TS, 12);
    ctx.fillStyle = '#b8bec6';
    ctx.fillRect(0, 3, TS, 5);
    ctx.fillStyle = '#d5dae0';
    ctx.fillRect(0, 3, TS, 2);
    ctx.fillStyle = '#8a9098';
    ctx.fillRect(0, 8, TS, 5);
    ctx.fillStyle = '#c43a3a';
    ctx.fillRect(3, 4, 3, 2);
    ctx.fillStyle = '#e8b64c';
    ctx.fillRect(9, 4, 3, 2);
  }

  function pPiano(ctx, rnd, side) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#101014';
    ctx.fillRect(0, 1, TS, 13);
    ctx.fillStyle = '#26262e';
    ctx.fillRect(side === 'l' ? 1 : 0, 2, 15, 4);
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(side === 'l' ? 2 : 0, 8, side === 'l' ? 14 : 14, 4);
    ctx.fillStyle = '#101014';
    for (var x = (side === 'l' ? 3 : 1); x < 15; x += 3) ctx.fillRect(x, 8, 1, 2);
  }

  function pPlant(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#8e4a26';
    ctx.fillRect(5, 10, 6, 5);
    ctx.fillStyle = '#a65c30';
    ctx.fillRect(5, 10, 6, 2);
    ctx.fillStyle = '#1f7a3d';
    ctx.fillRect(6, 3, 4, 7);
    ctx.fillRect(3, 5, 4, 4);
    ctx.fillRect(9, 5, 4, 4);
    ctx.fillStyle = '#37a45c';
    ctx.fillRect(7, 2, 2, 4);
    ctx.fillRect(4, 5, 2, 2);
    ctx.fillRect(10, 5, 2, 2);
  }

  function pSmartTV(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#101216';                 // bezel
    ctx.fillRect(1, 2, 14, 10);
    ctx.fillStyle = '#1c3050';                 // screen
    ctx.fillRect(2, 3, 12, 8);
    ctx.fillStyle = '#2a4a78';                 // glow
    ctx.fillRect(2, 3, 12, 3);
    dither(ctx, 2, 5, 12, 2, '#2a4a78');
    ctx.fillStyle = 'rgba(255,255,255,0.6)';   // screen gleam
    for (var g = 0; g < 4; g++) ctx.fillRect(4 + g, 8 - g, 1, 1);
    ctx.fillStyle = '#4a5058';                 // wall mount
    ctx.fillRect(6, 12, 4, 2);
  }

  function pBigChair(ctx, rnd) {
    // the teacher's big black leather chair
    pFloor(ctx, rnd);
    ctx.fillStyle = '#101216';                 // high back
    ctx.fillRect(3, 1, 10, 12);
    ctx.fillStyle = '#26282e';
    ctx.fillRect(4, 2, 8, 10);
    ctx.fillStyle = '#383b42';                 // sheen
    ctx.fillRect(4, 2, 8, 2);
    // tufted leather buttons
    ctx.fillStyle = '#14161a';
    ctx.fillRect(6, 5, 1, 1); ctx.fillRect(9, 5, 1, 1);
    ctx.fillRect(6, 8, 1, 1); ctx.fillRect(9, 8, 1, 1);
    // armrests
    ctx.fillStyle = '#101216';
    ctx.fillRect(1, 8, 3, 5);
    ctx.fillRect(12, 8, 3, 5);
    ctx.fillStyle = '#2e3138';
    ctx.fillRect(1, 8, 3, 1);
    ctx.fillRect(12, 8, 3, 1);
    // star base
    ctx.fillStyle = '#3a3f45';
    ctx.fillRect(7, 13, 2, 2);
    ctx.fillRect(4, 14, 8, 1);
  }

  function pPlant2(ctx, rnd) {
    // tall potted tree
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1f7a3d';
    ctx.fillRect(4, 1, 8, 6);
    ctx.fillRect(2, 3, 5, 4);
    ctx.fillRect(9, 3, 5, 4);
    ctx.fillStyle = '#37a45c';
    ctx.fillRect(5, 1, 3, 3);
    ctx.fillRect(3, 4, 2, 2);
    ctx.fillRect(10, 4, 2, 2);
    ctx.fillStyle = '#155c2c';
    ctx.fillRect(6, 6, 4, 2);
    ctx.fillStyle = '#6f4a26';                 // trunk
    ctx.fillRect(7, 7, 2, 4);
    ctx.fillStyle = '#8e4a26';                 // pot
    ctx.fillRect(4, 11, 8, 4);
    ctx.fillStyle = '#a65c30';
    ctx.fillRect(4, 11, 8, 1);
    ctx.fillStyle = '#5e3319';
    ctx.fillRect(4, 14, 8, 1);
  }

  function pPoster1(ctx, rnd) {
    // motivational star poster
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = '#f7d84d';                 // star
    ctx.fillRect(7, 4, 2, 2);
    ctx.fillRect(5, 6, 6, 2);
    ctx.fillRect(6, 8, 4, 1);
    ctx.fillRect(5, 9, 2, 1); ctx.fillRect(9, 9, 2, 1);
    ctx.fillStyle = '#3a63c4';                 // caption
    ctx.fillRect(5, 11, 6, 1);
  }

  function pPoster2(ctx, rnd) {
    // rainbow poster
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(3, 3, 10, 10);
    var arcs = ['#c43a3a', '#e8722c', '#f7d84d', '#2e8f57', '#3a63c4'];
    arcs.forEach(function (col, i) {
      ctx.fillStyle = col;
      ctx.fillRect(4 + i, 5 + i, 8 - i * 2, 1);
    });
    ctx.fillStyle = '#9fd4e8';                 // clouds
    ctx.fillRect(4, 10, 3, 2);
    ctx.fillRect(9, 10, 3, 2);
  }

  function pABC(ctx, rnd) {
    // alphabet strip
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(0, 4, TS, 9);
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(1, 5, 14, 7);
    drawTinyText(ctx, 'A', 2, 6, '#c43a3a', 1);
    drawTinyText(ctx, 'B', 6, 6, '#3a63c4', 1);
    drawTinyText(ctx, 'C', 10, 6, '#2e8f57', 1);
  }

  function pRug(ctx, rnd) {
    // colorful classroom rug (tiles continue the pattern)
    var cols = ['#c43a3a', '#e8722c', '#f7d84d', '#2e8f57', '#3a63c4', '#9a6ee0'];
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        ctx.fillStyle = cols[(x + y * 3) % 6];
        ctx.fillRect(x * 4, y * 4, 4, 4);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (var yy = 0; yy < TS; yy++) {
      for (var xx = 0; xx < TS; xx++) {
        if ((xx + yy) % 2 === 0 && (xx % 4 === 0 || yy % 4 === 0)) ctx.fillRect(xx, yy, 1, 1);
      }
    }
  }

  function pClock(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(4, 3, 8, 8);
    ctx.fillRect(3, 4, 10, 6);
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(5, 4, 6, 6);
    ctx.fillRect(4, 5, 8, 4);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(7, 5, 1, 3);   // hands
    ctx.fillRect(8, 7, 2, 1);
    ctx.fillStyle = '#c43a3a';
    ctx.fillRect(7, 7, 1, 1);
  }

  function pFlag(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#6f4a26';    // pole
    ctx.fillRect(2, 1, 1, 13);
    ctx.fillStyle = '#33406e';    // canton
    ctx.fillRect(3, 2, 5, 4);
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(4, 3, 1, 1); ctx.fillRect(6, 3, 1, 1); ctx.fillRect(5, 4, 1, 1);
    for (var i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#c43a3a' : '#f4f4ee';
      if (i < 4) ctx.fillRect(8, 2 + i, 6, 1);
      else ctx.fillRect(3, 2 + i, 11, 1);
    }
  }

  function pCalendar(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(3, 2, 10, 12);
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(4, 3, 8, 10);
    ctx.fillStyle = '#c43a3a';
    ctx.fillRect(4, 3, 8, 2);
    ctx.fillStyle = '#8a8f96';
    for (var y = 6; y <= 11; y += 2) {
      for (var x = 5; x <= 10; x += 2) ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = '#c43a3a';
    ctx.fillRect(7, 8, 2, 2);     // today!
  }

  function pNumberLine(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(0, 4, TS, 9);
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(1, 5, 14, 7);
    drawTinyText(ctx, '1', 2, 6, '#3a63c4', 1);
    drawTinyText(ctx, '2', 6, 6, '#c43a3a', 1);
    drawTinyText(ctx, '3', 10, 6, '#2e8f57', 1);
  }

  function pExtinguisher(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(5, 4, 6, 10);
    ctx.fillStyle = '#c43a3a';
    ctx.fillRect(6, 5, 4, 8);
    ctx.fillStyle = '#e06a6a';
    ctx.fillRect(6, 5, 1, 8);
    ctx.fillStyle = '#c9cfd5';
    ctx.fillRect(6, 3, 4, 2);
    ctx.fillRect(9, 2, 2, 1);
  }

  function pBeanbag(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(3, 6, 10, 8);
    ctx.fillRect(2, 8, 12, 5);
    ctx.fillStyle = '#9a6ee0';
    ctx.fillRect(4, 7, 8, 6);
    ctx.fillRect(3, 9, 10, 3);
    ctx.fillStyle = '#b48cf0';
    ctx.fillRect(5, 7, 5, 2);
    dither(ctx, 4, 9, 8, 2, '#b48cf0');
    ctx.fillStyle = '#6f4aa8';
    ctx.fillRect(3, 12, 10, 1);
  }

  function pCubbies(ctx, rnd, frameDark, frame) {
    pFloor(ctx, rnd);
    ctx.fillStyle = frameDark || '#3a2510';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = frame || '#8a5a33';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = frameDark || '#3a2510';
    ctx.fillRect(7, 2, 1, 12);
    ctx.fillRect(2, 8, 12, 1);
    // backpacks in the cubbies
    var packs = ['#c43a3a', '#3a63c4', '#2e8f57', '#e8722c'];
    [[3, 3], [9, 3], [3, 10], [9, 10]].forEach(function (p, i) {
      ctx.fillStyle = packs[i];
      ctx.fillRect(p[0], p[1], 4, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(p[0] + 1, p[1], 2, 1);
    });
  }

  function pTVCart(ctx, rnd) {
    // the smart board: big TV on a rolling cart
    pFloor(ctx, rnd);
    ctx.fillStyle = '#101216';                 // screen bezel
    ctx.fillRect(1, 0, 14, 10);
    ctx.fillStyle = '#1c3050';                 // screen
    ctx.fillRect(2, 1, 12, 8);
    ctx.fillStyle = '#2a4a78';
    ctx.fillRect(2, 1, 12, 3);
    dither(ctx, 2, 3, 12, 2, '#2a4a78');
    ctx.fillStyle = '#f4f4ee';                 // something on screen
    ctx.fillRect(4, 5, 4, 1);
    ctx.fillRect(4, 7, 6, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (var g = 0; g < 3; g++) ctx.fillRect(10 + g, 4 - g, 1, 1);
    // cart
    ctx.fillStyle = '#3a3f45';
    ctx.fillRect(6, 10, 4, 2);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(3, 12, 10, 2);
    ctx.fillStyle = '#101216';                 // wheels
    ctx.fillRect(4, 14, 2, 2);
    ctx.fillRect(10, 14, 2, 2);
  }

  function pFishtank(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#16181c';
    ctx.fillRect(1, 3, 14, 12);
    ctx.fillStyle = '#3a72ba';
    ctx.fillRect(2, 4, 12, 8);
    ctx.fillStyle = '#5c92d4';
    ctx.fillRect(2, 4, 12, 3);
    dither(ctx, 2, 6, 12, 2, '#5c92d4');
    ctx.fillStyle = '#e8722c';   // fish!
    ctx.fillRect(5, 8, 3, 2);
    ctx.fillRect(4, 9, 1, 1);
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(10, 6, 2, 1);
    ctx.fillStyle = '#2e8f57';   // plants
    ctx.fillRect(3, 9, 1, 3);
    ctx.fillRect(12, 8, 1, 4);
    ctx.fillStyle = '#4a3a2a';   // stand
    ctx.fillRect(2, 12, 12, 3);
  }

  function pGlobe(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(5, 2, 7, 7);
    ctx.fillStyle = '#3a72ba';
    ctx.fillRect(6, 3, 5, 5);
    ctx.fillStyle = '#2e8f57';
    ctx.fillRect(7, 3, 2, 2);
    ctx.fillRect(9, 5, 2, 2);
    ctx.fillRect(6, 6, 1, 1);
    ctx.fillStyle = '#6f4a26';   // stand
    ctx.fillRect(8, 9, 1, 3);
    ctx.fillRect(5, 12, 7, 2);
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(5, 12, 7, 1);
  }

  function pEasel(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#6f4a26';
    ctx.fillRect(3, 12, 2, 3);
    ctx.fillRect(11, 12, 2, 3);
    ctx.fillRect(7, 11, 2, 4);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(2, 1, 12, 11);
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(3, 2, 10, 9);
    ctx.fillStyle = '#c43a3a';   // finger paint
    ctx.fillRect(5, 4, 2, 2);
    ctx.fillStyle = '#3a63c4';
    ctx.fillRect(8, 5, 3, 2);
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(4, 8, 3, 1);
  }

  function pTrash(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(4, 5, 8, 10);
    ctx.fillStyle = '#7c828a';
    ctx.fillRect(5, 6, 6, 8);
    ctx.fillStyle = '#9aa0a8';
    ctx.fillRect(5, 6, 6, 2);
    ctx.fillStyle = '#f4f4ee';   // liner
    ctx.fillRect(5, 5, 6, 1);
    ctx.fillStyle = '#5b6068';
    ctx.fillRect(7, 9, 2, 4);
  }

  function pSink(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(1, 4, 14, 11);
    ctx.fillStyle = '#c3cad2';
    ctx.fillRect(2, 5, 12, 9);
    ctx.fillStyle = '#8f959c';
    ctx.fillRect(4, 7, 8, 4);
    ctx.fillStyle = '#5b6068';   // drain
    ctx.fillRect(7, 9, 2, 1);
    ctx.fillStyle = '#e2e8ee';   // faucet
    ctx.fillRect(7, 4, 2, 3);
    ctx.fillRect(6, 4, 4, 1);
  }

  function pCarpetColor(ctx, rnd, base, light, dark) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, TS, TS);
    dither(ctx, 0, 0, TS, TS, dark);
    speckle(ctx, rnd, 22, [dark, light, base]);
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 15, TS, 1);
  }

  function pChecker(ctx, rnd) {
    // classic school checkerboard floor
    for (var y = 0; y < 2; y++) {
      for (var x = 0; x < 2; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#ece5d8' : '#3a7a6a';
        ctx.fillRect(x * 8, y * 8, 8, 8);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 15, TS, 1);
  }

  // ---- editor v2 furniture ------------------------------------------------
  // the RAINBOW table: a wide kidney-shaped small-group table -- a deep
  // wooden crescent with rounded ends and a concave bite at the bottom
  // middle (where the teacher sits). Drawn column-by-column from per-x
  // top/bottom edge arrays.
  function rainbowCols(ctx, top, bot) {
    for (var x = 0; x < TS; x++) {
      var t = top[x], b = bot[x];
      if (b <= t) continue;
      ctx.fillStyle = '#1c1c26';                 // outline column
      ctx.fillRect(x, t, 1, b - t);
      if (b - t > 2) {
        ctx.fillStyle = '#d9b076';               // wood top
        ctx.fillRect(x, t + 1, 1, b - t - 2);
        ctx.fillStyle = '#ecca94';               // glossy highlight
        ctx.fillRect(x, t + 1, 1, 2);
        ctx.fillStyle = '#a97f47';               // front edge shadow
        ctx.fillRect(x, b - 2, 1, 1);
      }
    }
  }
  function kidneyBase(ctx, rnd) {                // middle: full slab + bite
    pFloor(ctx, rnd);
    rainbowCols(ctx,
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [14, 14, 13, 12, 11, 10, 10, 10, 10, 10, 10, 11, 12, 13, 14, 14]);
  }
  function pKidneyL(ctx, rnd) {                  // rounded left end
    pFloor(ctx, rnd);
    rainbowCols(ctx,
      [8, 6, 5, 4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [10, 12, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
  }
  function pKidneyR(ctx, rnd) {                  // rounded right end
    pFloor(ctx, rnd);
    rainbowCols(ctx,
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4, 5, 6, 8],
      [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 13, 13, 12, 10]);
  }
  function pKidneySolo(ctx, rnd) {               // a mini one-tile kidney
    pFloor(ctx, rnd);
    rainbowCols(ctx,
      [9, 7, 5, 4, 3, 2, 2, 2, 2, 2, 2, 3, 4, 5, 7, 9],
      [11, 13, 14, 14, 14, 13, 12, 11, 11, 12, 13, 14, 14, 14, 13, 11]);
  }

  function pCouchL(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(1, 3, 15, 11);
    ctx.fillStyle = '#3a63c4';
    ctx.fillRect(2, 4, 14, 9);
    ctx.fillStyle = '#5c82d8';
    ctx.fillRect(2, 4, 14, 3);
    ctx.fillStyle = '#2a4a94';
    ctx.fillRect(2, 10, 14, 3);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(2, 7, 14, 1);
    ctx.fillRect(5, 4, 1, 9);   // armrest seam
  }
  function pCouchR(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 3, 15, 11);
    ctx.fillStyle = '#3a63c4';
    ctx.fillRect(0, 4, 14, 9);
    ctx.fillStyle = '#5c82d8';
    ctx.fillRect(0, 4, 14, 3);
    ctx.fillStyle = '#2a4a94';
    ctx.fillRect(0, 10, 14, 3);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 7, 14, 1);
    ctx.fillRect(10, 4, 1, 9);
  }

  function pRocker(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(3, 1, 10, 12);
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(4, 2, 8, 10);
    ctx.fillStyle = '#a06b3f';
    ctx.fillRect(4, 2, 8, 2);
    ctx.fillStyle = '#6f4726';
    ctx.fillRect(5, 5, 6, 1);
    ctx.fillRect(5, 8, 6, 1);
    // rockers
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(2, 13, 12, 1);
    ctx.fillRect(1, 14, 2, 1);
    ctx.fillRect(13, 14, 2, 1);
  }

  function pComputer(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(1, 4, 14, 9);
    ctx.fillStyle = '#c9974f';
    ctx.fillRect(2, 5, 12, 7);
    ctx.fillStyle = '#101216';   // monitor
    ctx.fillRect(4, 1, 8, 6);
    ctx.fillStyle = '#2a6a9a';
    ctx.fillRect(5, 2, 6, 4);
    ctx.fillStyle = '#4a9ad4';
    ctx.fillRect(5, 2, 6, 1);
    ctx.fillStyle = '#e2e8ee';   // keyboard
    ctx.fillRect(4, 8, 8, 2);
    ctx.fillStyle = '#8f959c';
    ctx.fillRect(4, 9, 8, 1);
  }

  function pLamp(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(5, 1, 6, 4);
    ctx.fillStyle = '#fdf0a8';
    ctx.fillRect(6, 1, 4, 2);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(4, 0, 8, 1);
    ctx.fillRect(4, 5, 8, 1);
    ctx.fillRect(7, 6, 2, 7);
    ctx.fillRect(4, 13, 8, 2);
    ctx.fillStyle = '#3a3f45';
    ctx.fillRect(5, 13, 6, 1);
  }

  function pToybin(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(2, 6, 12, 9);
    ctx.fillStyle = '#c43a3a';
    ctx.fillRect(3, 7, 10, 7);
    ctx.fillStyle = '#d85a5a';
    ctx.fillRect(3, 7, 10, 2);
    // toys spilling out
    ctx.fillStyle = '#3a63c4';
    ctx.fillRect(4, 4, 3, 3);
    ctx.fillStyle = '#2e8f57';
    ctx.fillRect(8, 3, 3, 4);
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(11, 5, 2, 2);
  }

  function pStool(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(4, 4, 8, 8);
    ctx.fillStyle = '#e8722c';
    ctx.fillRect(5, 5, 6, 6);
    ctx.fillStyle = '#f4924e';
    ctx.fillRect(5, 5, 6, 2);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(5, 12, 2, 3);
    ctx.fillRect(9, 12, 2, 3);
  }

  function pShelfLow(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#3a2510';
    ctx.fillRect(1, 6, 14, 9);
    ctx.fillStyle = '#6f4a26';
    ctx.fillRect(2, 7, 12, 7);
    var books = ['#c43a3a', '#3a63c4', '#2e8f57', '#e8b64c', '#9a6ee0'];
    var x = 3;
    while (x < 13) {
      var w = 1 + Math.floor(rnd() * 2);
      ctx.fillStyle = books[Math.floor(rnd() * books.length)];
      ctx.fillRect(x, 8, w, 5);
      x += w;
    }
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(1, 6, 14, 1);
  }

  function pMusicStand(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(4, 1, 8, 6);
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(5, 2, 6, 4);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(6, 3, 4, 1);
    ctx.fillRect(6, 5, 3, 1);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(7, 7, 2, 6);
    ctx.fillRect(4, 13, 8, 1);
  }

  function pDrum(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(3, 4, 10, 10);
    ctx.fillStyle = '#c43a3a';
    ctx.fillRect(4, 6, 8, 7);
    ctx.fillStyle = '#f4f4ee';   // drum head
    ctx.fillRect(4, 4, 8, 3);
    ctx.fillStyle = '#e2e2da';
    ctx.fillRect(4, 6, 8, 1);
    ctx.fillStyle = '#f7d84d';   // lugs
    ctx.fillRect(4, 9, 1, 2); ctx.fillRect(7, 9, 1, 2); ctx.fillRect(11, 9, 1, 2);
  }

  function pTent(ctx, rnd) {
    // cozy reading tent
    pFloor(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(7, 1, 2, 2);
    ctx.fillStyle = '#2a8f8f';
    ctx.fillRect(6, 3, 4, 2);
    ctx.fillRect(4, 5, 8, 3);
    ctx.fillRect(2, 8, 12, 6);
    ctx.fillStyle = '#3aa8a8';
    ctx.fillRect(6, 3, 2, 2);
    ctx.fillRect(4, 5, 3, 3);
    ctx.fillRect(2, 8, 4, 6);
    ctx.fillStyle = '#12406a';   // opening
    ctx.fillRect(6, 9, 4, 5);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(2, 14, 12, 1);
  }

  // ---- editor v2 walls ----------------------------------------------------
  function pLockers(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 2, TS, 13);
    var cols = ['#2a5a9a', '#2a5a9a', '#2a5a9a'];
    for (var i = 0; i < 3; i++) {
      ctx.fillStyle = cols[i];
      ctx.fillRect(1 + i * 5, 3, 4, 11);
      ctx.fillStyle = '#3a72ba';
      ctx.fillRect(1 + i * 5, 3, 4, 2);
      ctx.fillStyle = '#1e4474';
      ctx.fillRect(2 + i * 5, 6, 2, 1);   // vents
      ctx.fillRect(2 + i * 5, 8, 2, 1);
      ctx.fillStyle = '#c9cfd5';
      ctx.fillRect(4 + i * 5, 10, 1, 2);  // handle
    }
  }

  function pCubbiesTall(ctx, rnd) {
    // locker-sized open cubbies in Ashland blue, stuffed with backpacks
    pWall(ctx, rnd);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 1, TS, 14);
    ctx.fillStyle = '#2a5a9a';
    ctx.fillRect(1, 2, 14, 12);
    ctx.fillStyle = '#3a72ba';
    ctx.fillRect(1, 2, 14, 1);
    var packs = ['#c43a3a', '#e8722c', '#2e8f57', '#c4a02a', '#8a4ac4', '#d05a8a'];
    var k = 0;
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 2; col++) {
        var hx = 2 + col * 7, hy = 3 + row * 4;
        ctx.fillStyle = '#12263e';               // open cubby hole
        ctx.fillRect(hx, hy, 5, 3);
        ctx.fillStyle = packs[k++];              // backpack inside
        ctx.fillRect(hx + 1, hy + 1, 3, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(hx + 1, hy + 1, 2, 1);
      }
    }
    ctx.fillStyle = '#1e4474';                    // shelf shadows
    ctx.fillRect(1, 6, 14, 1);
    ctx.fillRect(1, 10, 14, 1);
  }

  function pChalkboard(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#6f4a26';
    ctx.fillRect(0, 2, TS, 12);
    ctx.fillStyle = '#2d5a3a';
    ctx.fillRect(1, 3, 14, 9);
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(3, 5, 5, 1);
    ctx.fillRect(4, 8, 7, 1);
    ctx.fillStyle = '#8a5a33';   // chalk tray
    ctx.fillRect(1, 12, 14, 2);
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(3, 12, 2, 1);
  }

  function pTrophycase(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#3a2510';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#8ec8f0';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var g = 0; g < 5; g++) ctx.fillRect(3 + g, 12 - g, 1, 1);
    ctx.fillStyle = '#3a2510';
    ctx.fillRect(2, 8, 12, 1);
    // trophies
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(4, 4, 2, 3); ctx.fillRect(3, 4, 4, 1);
    ctx.fillRect(9, 5, 2, 2);
    ctx.fillRect(4, 10, 3, 3);
    ctx.fillStyle = '#c9cfd5';
    ctx.fillRect(9, 10, 3, 3);
  }

  function pMapPoster(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(1, 2, 14, 12);
    ctx.fillStyle = '#7cb8dc';
    ctx.fillRect(2, 3, 12, 10);
    ctx.fillStyle = '#2e8f57';
    ctx.fillRect(3, 4, 4, 3);
    ctx.fillRect(8, 5, 3, 2);
    ctx.fillRect(5, 9, 3, 3);
    ctx.fillRect(10, 9, 2, 2);
    ctx.fillStyle = '#4aa96c';
    ctx.fillRect(4, 4, 2, 1);
  }

  function pPencilPoster(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#f7e8c0';
    ctx.fillRect(3, 3, 10, 10);
    // big pencil
    ctx.fillStyle = '#e8a62c';
    ctx.fillRect(5, 4, 2, 7);
    ctx.fillStyle = '#e06a92';
    ctx.fillRect(5, 3, 2, 1);
    ctx.fillStyle = '#f2c398';
    ctx.fillRect(5, 11, 2, 1);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(5, 12, 2, 1);
    ctx.fillStyle = '#3a63c4';
    ctx.fillRect(9, 5, 2, 6);
  }

  function pWelcomeL(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#1f7a4d';
    ctx.fillRect(1, 4, 15, 9);
    ctx.fillStyle = '#2e9a63';
    ctx.fillRect(1, 4, 15, 2);
    drawTinyText(ctx, 'WEL', 3, 6, '#f7d84d', 1);
  }
  function pWelcomeR(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#1f7a4d';
    ctx.fillRect(0, 4, 15, 9);
    ctx.fillStyle = '#2e9a63';
    ctx.fillRect(0, 4, 15, 2);
    drawTinyText(ctx, 'COME', 0, 6, '#f7d84d', 1);
  }

  function pPennants(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(0, 2, TS, 1);
    var cols = ['#2e8f57', '#f7d84d', '#1f2a5e', '#2e8f57'];
    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = cols[i];
      var x = i * 4;
      ctx.fillRect(x, 3, 4, 3);
      ctx.fillRect(x + 1, 6, 2, 2);
      ctx.fillRect(x + 1, 8, 1, 1);
    }
  }

  function pCurtainWin(ctx, rnd) {
    pWindow(ctx, rnd);
    ctx.fillStyle = '#e06a92';
    ctx.fillRect(1, 2, 3, 12);
    ctx.fillRect(12, 2, 3, 12);
    ctx.fillStyle = '#f294b8';
    ctx.fillRect(1, 2, 1, 12);
    ctx.fillRect(12, 2, 1, 12);
    ctx.fillStyle = '#c04a72';
    ctx.fillRect(3, 2, 1, 12);
    ctx.fillRect(14, 2, 1, 12);
  }

  // ---- editor v2 floors ---------------------------------------------------
  function pWood(ctx, rnd) {
    ctx.fillStyle = '#c99e60';
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#d9b076';
    ctx.fillRect(0, 0, TS, 4);
    ctx.fillRect(0, 8, TS, 4);
    dither(ctx, 0, 3, TS, 2, '#d9b076');
    ctx.fillStyle = '#a97f47';
    ctx.fillRect(0, 3, TS, 1);
    ctx.fillRect(0, 7, TS, 1);
    ctx.fillRect(0, 11, TS, 1);
    ctx.fillRect(0, 15, TS, 1);
    speckle(ctx, rnd, 8, ['#b98f52', '#e2bd85']);
  }

  function pDarkBlue(ctx, rnd) {
    ctx.fillStyle = '#2a3a6a';
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#33477e';
    ctx.fillRect(0, 0, TS, 5);
    dither(ctx, 0, 4, TS, 2, '#33477e');
    speckle(ctx, rnd, 14, ['#1f2c52', '#40548c']);
    ctx.fillStyle = '#4a5e96';
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillStyle = '#182342';
    ctx.fillRect(0, 15, TS, 1);
  }

  function pStarRug(ctx, rnd) {
    ctx.fillStyle = '#3a63c4';
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#2a4a94';
    ctx.fillRect(0, 0, TS, 1); ctx.fillRect(0, 15, TS, 1);
    ctx.fillRect(0, 0, 1, TS); ctx.fillRect(15, 0, 1, TS);
    ctx.fillStyle = '#f7d84d';   // star
    ctx.fillRect(7, 3, 2, 3);
    ctx.fillRect(4, 6, 8, 2);
    ctx.fillRect(5, 8, 6, 1);
    ctx.fillRect(4, 9, 3, 3);
    ctx.fillRect(9, 9, 3, 3);
    ctx.fillStyle = '#fdf0a8';
    ctx.fillRect(7, 6, 2, 2);
  }

  function pHopscotch(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(3, 1, 10, 1); ctx.fillRect(3, 8, 10, 1); ctx.fillRect(3, 14, 10, 1);
    ctx.fillRect(3, 1, 1, 14); ctx.fillRect(12, 1, 1, 14);
    ctx.fillRect(3, 4, 10, 1); ctx.fillRect(3, 11, 10, 1);
    drawTinyText(ctx, '1', 6, 2, '#c43a3a', 1);
    drawTinyText(ctx, '2', 6, 5, '#3a63c4', 1);
    drawTinyText(ctx, '3', 6, 9, '#2e8f57', 1);
  }

  function pFourSquare(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#c43a3a';
    ctx.fillRect(0, 7, TS, 2);
    ctx.fillRect(7, 0, 2, TS);
    ctx.fillStyle = '#d85a5a';
    ctx.fillRect(0, 7, TS, 1);
    ctx.fillRect(7, 0, 1, TS);
  }

  function pCabinet(ctx, rnd) {
    // big blue storage cabinet
    pFloor(ctx, rnd);
    ctx.fillStyle = '#16181c';                 // outline
    ctx.fillRect(1, 0, 14, 15);
    ctx.fillStyle = '#2a5a9a';                 // blue body
    ctx.fillRect(2, 1, 12, 13);
    ctx.fillStyle = '#3a72ba';                 // lit top
    ctx.fillRect(2, 1, 12, 3);
    dither(ctx, 2, 4, 12, 2, '#3a72ba');
    ctx.fillStyle = '#1e4474';                 // door split + shadow
    ctx.fillRect(7, 1, 1, 13);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = '#c9cfd5';                 // handles
    ctx.fillRect(5, 6, 1, 3);
    ctx.fillRect(10, 6, 1, 3);
  }

  function pHoop(ctx, rnd) {
    pWall(ctx, rnd);
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(3, 2, 10, 7);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(6, 4, 4, 3);
    ctx.fillStyle = '#e8722c';
    ctx.fillRect(5, 9, 6, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 11, 1, 3);
    ctx.fillRect(8, 11, 1, 3);
    ctx.fillRect(9, 11, 1, 2);
  }

  function pBannerLetter(ctx, rnd, letter, found) {
    pWall(ctx, rnd);
    ctx.fillStyle = found ? '#1f7a4d' : '#5a5f5a';
    ctx.fillRect(2, 2, 12, 10);
    ctx.fillStyle = found ? '#155c39' : '#4a4f4a';
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillRect(4, 14, 8, 1);
    if (found) {
      drawTinyText(ctx, letter, 6, 4, '#f7d84d', 2);
    } else {
      drawTinyText(ctx, '!', 6, 4, '#8a8f8a', 2);
    }
  }

  function pVoid(ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TS, TS);
  }

  function pChair(ctx, rnd) {
    pFloor(ctx, rnd);
    ctx.fillStyle = '#3a3f45';
    ctx.fillRect(4, 4, 8, 9);
    ctx.fillStyle = '#4d6ea9';
    ctx.fillRect(5, 5, 6, 7);
    ctx.fillStyle = '#6383b8';
    ctx.fillRect(5, 5, 6, 2);
  }

  // registry ---------------------------------------------------------------
  // rotate any painter 90 degrees clockwise: horizontal furniture pairs
  // become vertical ones (couch, kidney table, piano, teacher desk...)
  function rot90(base) {
    return function (ctx, rnd) {
      var tmp = mk();
      base(tmp.getContext('2d'), rnd);
      ctx.save();
      ctx.translate(TS, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(tmp, 0, 0);
      ctx.restore();
    };
  }

  // ---- the playground: outdoor tiles --------------------------------------
  function pMulch(ctx, rnd) {
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(0, 0, TS, TS);
    speckle(ctx, rnd, 14, ['#7d5834', '#5a3c20', '#8a6540', '#4e3419']);
  }
  function pConcrete(ctx, rnd) {
    ctx.fillStyle = '#d8d8d4';
    ctx.fillRect(0, 0, TS, TS);
    speckle(ctx, rnd, 8, ['#c9c9c4', '#e2e2de', '#cfcfca']);
    if (rnd() < 0.2) { ctx.fillStyle = '#c2c2bd'; ctx.fillRect(0, 7, TS, 1); }
  }
  function pFence(ctx, rnd) {
    pMulch(ctx, rnd);
    // chain-link: diamond mesh under a top rail, post on some tiles
    ctx.strokeStyle = '#b5babf';
    ctx.lineWidth = 1;
    for (var i = -TS; i < TS; i += 4) {
      ctx.beginPath(); ctx.moveTo(i, 3); ctx.lineTo(i + 13, TS); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + 13, 3); ctx.lineTo(i, TS); ctx.stroke();
    }
    ctx.fillStyle = '#9aa0a6';
    ctx.fillRect(0, 1, TS, 2);
    if (rnd() < 0.5) { ctx.fillStyle = '#7a8086'; ctx.fillRect(7, 1, 2, TS - 1); }
  }
  function pTree(ctx, rnd) {
    pMulch(ctx, rnd);
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(7, 12, 3, 3);
    ctx.fillStyle = '#1f6a35';
    ctx.beginPath(); ctx.arc(8, 7, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e8f4c';
    ctx.beginPath(); ctx.arc(6, 5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#37a45c';
    ctx.fillRect(4, 3, 2, 2);
    ctx.fillRect(10, 6, 2, 2);
    ctx.fillStyle = '#175a2b';
    ctx.fillRect(10, 10, 2, 2);
    ctx.fillRect(5, 9, 2, 2);
  }
  function pPicnic(ctx, rnd, side) {
    pMulch(ctx, rnd);
    var x0 = side === 'l' ? 2 : 0, x1 = side === 'l' ? TS : 14;
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(x0, 3, x1 - x0, 2);      // far bench
    ctx.fillRect(x0, 12, x1 - x0, 2);     // near bench
    ctx.fillStyle = '#a97f47';
    ctx.fillRect(x0, 6, x1 - x0, 5);      // table top
    ctx.fillStyle = '#c99e60';
    ctx.fillRect(x0, 6, x1 - x0, 2);
    ctx.fillStyle = '#6e4a24';
    ctx.fillRect(x0, 10, x1 - x0, 1);
  }
  function pPlayset(ctx, rnd) {
    // platform base; the towers, roofs and slides are painted over the
    // whole structure by G.drawPlayset
    ctx.fillStyle = '#3a63c4';
    ctx.fillRect(0, 0, TS, TS);
    speckle(ctx, rnd, 6, ['#4a73d4', '#2e53b4']);
  }
  function pGoal(ctx, rnd, side) {
    pConcrete(ctx, rnd);
    ctx.strokeStyle = 'rgba(244,244,238,0.55)';
    ctx.lineWidth = 1;
    for (var nx = 1; nx < TS; nx += 3) {
      ctx.beginPath(); ctx.moveTo(nx, 4); ctx.lineTo(nx, 12); ctx.stroke();
    }
    for (var ny = 5; ny < 13; ny += 3) {
      ctx.beginPath(); ctx.moveTo(0, ny); ctx.lineTo(TS, ny); ctx.stroke();
    }
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(0, 2, TS, 2);                       // crossbar
    ctx.fillRect(0, 12, TS, 1);                      // ground bar
    if (side === 'l') ctx.fillRect(0, 2, 2, 11);     // post
    else ctx.fillRect(14, 2, 2, 11);
  }
  function pWoodStage(ctx, rnd) {
    // outdoor wooden performance stage, weathered planks
    ctx.fillStyle = '#b08a52';
    ctx.fillRect(0, 0, TS, TS);
    ctx.fillStyle = '#c09a62';
    ctx.fillRect(0, 0, TS, 3);
    ctx.fillRect(0, 8, TS, 3);
    ctx.fillStyle = '#93703e';
    ctx.fillRect(0, 3, TS, 1);
    ctx.fillRect(0, 7, TS, 1);
    ctx.fillRect(0, 11, TS, 1);
    ctx.fillRect(0, 15, TS, 1);
    speckle(ctx, rnd, 7, ['#a37c46', '#cca972']);
  }
  function pBBall(ctx, rnd) {
    pConcrete(ctx, rnd);
    ctx.fillStyle = '#555b63';
    ctx.fillRect(7, 8, 2, 7);                        // pole
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(3, 1, 10, 6);                       // backboard
    ctx.fillStyle = '#20242a';
    ctx.fillRect(6, 3, 4, 3);                        // target square
    ctx.fillStyle = '#e8722c';
    ctx.fillRect(5, 6, 6, 2);                        // rim
    ctx.strokeStyle = 'rgba(244,244,238,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(6, 8); ctx.lineTo(7, 11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(9, 11); ctx.stroke();
  }

  var PAINTERS = {
    'void': function (ctx, rnd) { pVoid(ctx); },
    'mulch': pMulch,
    'concrete': pConcrete,
    'fence': pFence,
    'tree': pTree,
    'picnicL': function (ctx, rnd) { pPicnic(ctx, rnd, 'l'); },
    'picnicR': function (ctx, rnd) { pPicnic(ctx, rnd, 'r'); },
    'playset': pPlayset,
    'goalL': function (ctx, rnd) { pGoal(ctx, rnd, 'l'); },
    'goalR': function (ctx, rnd) { pGoal(ctx, rnd, 'r'); },
    'bballnet': pBBall,
    'woodstage': pWoodStage,
    'floor': pFloor,
    'green': pGreen,
    'blue': pBlue,
    'carpet': pCarpet,
    'gymfloor': pGymFloor,
    'gymlineH': function (ctx, rnd) { pGymLine(ctx, rnd, 'h'); },
    'gymlineV': function (ctx, rnd) { pGymLine(ctx, rnd, 'v'); },
    'gymkey': pGymKey,
    'gymcirTL': function (ctx, rnd) { pGymCircle(ctx, rnd, 'tl'); },
    'gymcirTR': function (ctx, rnd) { pGymCircle(ctx, rnd, 'tr'); },
    'gymcirBL': function (ctx, rnd) { pGymCircle(ctx, rnd, 'bl'); },
    'gymcirBR': function (ctx, rnd) { pGymCircle(ctx, rnd, 'br'); },
    'wall': pWall,
    'wallTop': pWallTop,
    'voidwall': pVoidWall,
    'bulletinP': function (ctx, rnd) { pBulletin(ctx, rnd, '#e8628c', '#9fd4e8'); },
    'bulletinC': function (ctx, rnd) { pBulletin(ctx, rnd, '#8a5a33', '#c9a063'); },
    'exit': pExitSign,
    'fountain': pFountain,
    'whiteboard': pWhiteboard,
    'window': pWindow,
    'curtain': pCurtain,
    'stage': pStageFront,
    'door': pDoor,
    'purple': pPurple,
    'stairU': function (ctx, rnd) { pStairs(ctx, rnd, true); },
    'stairD': function (ctx, rnd) { pStairs(ctx, rnd, false); },
    'mat': pMat,
    'deskS': pDeskS,
    'deskTL': function (ctx, rnd) { pDeskT(ctx, rnd, 'l'); },
    'deskTR': function (ctx, rnd) { pDeskT(ctx, rnd, 'r'); },
    'shelf': pShelf,
    'table': pTable,
    'tableTop': pTableTop,
    'tableMid': pTableMid,
    'tableBot': pTableBot,
    'gtable': pGTable,
    'gtableTop': pGTableTop,
    'gtableMid': pGTableMid,
    'gtableBot': pGTableBot,
    'maprug': pMapRug,
    'shaperug': pShapeRug,
    'lightswitch': pLightSwitch,
    'counter': pCounter,
    'pianoL': function (ctx, rnd) { pPiano(ctx, rnd, 'l'); },
    'pianoR': function (ctx, rnd) { pPiano(ctx, rnd, 'r'); },
    'plant': pPlant,
    'plant2': pPlant2,
    'hoop': pHoop,
    'chair': pChair,
    'smarttv': pSmartTV,
    'bigchair': pBigChair,
    'poster1': pPoster1,
    'poster2': pPoster2,
    'abc': pABC,
    'rug': pRug,
    'cabinet': pCabinet,
    'cubbiesBlue': function (ctx, rnd) { pCubbies(ctx, rnd, '#1e4474', '#2a5a9a'); },
    'cubbiesTall': pCubbiesTall,
    'tvcart': pTVCart,
    'clock': pClock,
    'flag': pFlag,
    'calendar': pCalendar,
    'numberline': pNumberLine,
    'extinguisher': pExtinguisher,
    'beanbag': pBeanbag,
    'cubbies': pCubbies,
    'fishtank': pFishtank,
    'globe': pGlobe,
    'easel': pEasel,
    'trash': pTrash,
    'sink': pSink,
    'carpetRed': function (ctx, rnd) { pCarpetColor(ctx, rnd, '#a84848', '#c46a6a', '#8a3a3a'); },
    'carpetGreen': function (ctx, rnd) { pCarpetColor(ctx, rnd, '#4a8a5e', '#6aa87e', '#3a7050'); },
    'carpetGray': function (ctx, rnd) { pCarpetColor(ctx, rnd, '#8a8f96', '#a5aab0', '#70757c'); },
    'checker': pChecker,
    'kidney': pKidneySolo,
    'kidneyL': pKidneyL,
    'kidneyM': kidneyBase,
    'kidneyR': pKidneyR,
    'couchL': pCouchL,
    'couchR': pCouchR,
    'couchLV': rot90(pCouchL),
    'couchRV': rot90(pCouchR),
    'kidneyLV': rot90(pKidneyL),
    'kidneyMV': rot90(kidneyBase),
    'kidneyRV': rot90(pKidneyR),
    'pianoLV': rot90(function (ctx, rnd) { pPiano(ctx, rnd, 'l'); }),
    'pianoRV': rot90(function (ctx, rnd) { pPiano(ctx, rnd, 'r'); }),
    'deskTLV': rot90(function (ctx, rnd) { pDeskT(ctx, rnd, 'l'); }),
    'deskTRV': rot90(function (ctx, rnd) { pDeskT(ctx, rnd, 'r'); }),
    'rocker': pRocker,
    'computer': pComputer,
    'lamp': pLamp,
    'toybin': pToybin,
    'stool': pStool,
    'shelfLow': pShelfLow,
    'musicstand': pMusicStand,
    'drum': pDrum,
    'tent': pTent,
    'lockers': pLockers,
    'chalkboard': pChalkboard,
    'trophycase': pTrophycase,
    'mapposter': pMapPoster,
    'pencilposter': pPencilPoster,
    'welcome': pWelcomeL,
    'welcomeL': pWelcomeL,
    'welcomeR': pWelcomeR,
    'pennants': pPennants,
    'curtainwin': pCurtainWin,
    'wood': pWood,
    'darkblue': pDarkBlue,
    'starrug': pStarRug,
    'hopscotch': pHopscotch,
    'foursquare': pFourSquare
  };

  function get(type) {
    if (cache.has(type)) return cache.get(type);
    var c = mk();
    var ctx = c.getContext('2d');
    var rnd = seeded(type);
    if (type.indexOf('banner:') === 0) {
      // banner:S:1  -> letter S, found
      var parts = type.split(':');
      pBannerLetter(ctx, rnd, parts[1], parts[2] === '1');
    } else {
      var p = PAINTERS[type] || PAINTERS['void'];
      p(ctx, rnd);
    }
    cache.set(type, c);
    return c;
  }

  // which tile types can be walked on
  var WALKABLE = {
    'floor': 1, 'green': 1, 'blue': 1, 'carpet': 1, 'rug': 1,
    'carpetRed': 1, 'carpetGreen': 1, 'carpetGray': 1, 'checker': 1,
    'wood': 1, 'darkblue': 1, 'starrug': 1, 'hopscotch': 1, 'foursquare': 1,
    'maprug': 1, 'shaperug': 1,
    'gymfloor': 1, 'gymlineH': 1, 'gymlineV': 1,
    'gymkey': 1, 'gymcirTL': 1, 'gymcirTR': 1, 'gymcirBL': 1, 'gymcirBR': 1,
    'door': 1, 'stairU': 1, 'stairD': 1, 'mat': 1,
    'mulch': 1, 'concrete': 1, 'woodstage': 1
  };

  G.Tiles = {
    SIZE: TS,
    get: get,
    isWalkable: function (type) { return !!WALKABLE[type]; },
    drawTinyText: drawTinyText
  };
})();
