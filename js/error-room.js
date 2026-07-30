/* Ashland Elementary 26/27 - the ERROR room.
 *
 * Type ZELDA while standing in the old man's cave and a hole opens in the
 * roof. Step into it and the game turns sideways: a brick room seen from the
 * side, a man in a purple tunic who will not let you past, and one thing to
 * say when you ask him.
 *
 * This file is all pictures -- the scene, the man, and his text box. The
 * walking and the talking live in main.js. */
var G = window.G = window.G || {};

(function () {
  // Where the room's floor is and where the man stands on it. main.js shares
  // these so the student lands on the same line he does.
  var FLOOR_Y = 190;
  var ERROR_X = 208;

  // ---- brickwork -----------------------------------------------------------
  // Courses of brick with staggered joints, clipped to whatever shape is
  // already on the context. Cheap, and it tiles the odd angled walls happily.
  function bricks(g, x0, y0, w, h, face, mortar, rowH, brickW) {
    g.fillStyle = mortar;
    g.fillRect(x0, y0, w, h);
    g.fillStyle = face;
    for (var y = y0, row = 0; y < y0 + h; y += rowH, row++) {
      var off = (row % 2) ? -Math.floor(brickW / 2) : 0;
      for (var x = x0 + off; x < x0 + w; x += brickW) {
        var bx = Math.max(x0, x + 1), bw = Math.min(x + brickW - 1, x0 + w) - bx;
        var bh = Math.min(rowH - 1, y0 + h - y);
        if (bw > 0 && bh > 0) g.fillRect(bx, y, bw, bh);
      }
    }
  }

  function poly(g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  }

  // ---- the room ------------------------------------------------------------
  var LIGHT_FACE = '#e08c74', LIGHT_MORTAR = '#f8ccbc';   // the lit back wall
  var DARK_FACE = '#9c3826', DARK_MORTAR = '#c05a40';     // the walls either side
  var FLOOR_FACE = '#6c2414', FLOOR_LINE = '#4a1408';

  function drawScene(g, SW, SH) {
    var backL = 56, backR = SW - 56, backTop = 92, ceil = 26;

    g.fillStyle = '#000';
    g.fillRect(0, 0, SW, SH);

    // the ceiling course running the full width
    bricks(g, 0, 0, SW, ceil, LIGHT_FACE, LIGHT_MORTAR, 8, 22);

    // the two side walls, angled in towards the back wall
    [[[0, ceil], [backL, backTop], [backL, FLOOR_Y], [0, SH]],
     [[SW, ceil], [backR, backTop], [backR, FLOOR_Y], [SW, SH]]].forEach(function (p) {
      g.save();
      poly(g, p);
      g.clip();
      bricks(g, 0, 0, SW, SH, DARK_FACE, DARK_MORTAR, 9, 26);
      g.restore();
    });

    // the back wall, and the windows in it
    bricks(g, backL, backTop, backR - backL, FLOOR_Y - backTop,
      LIGHT_FACE, LIGHT_MORTAR, 8, 22);
    for (var i = 0; i < 4; i++) drawWindow(g, backL + 28 + i * 44, 122);

    // the floor: dark boards, lightest at the front
    g.fillStyle = FLOOR_FACE;
    g.fillRect(0, FLOOR_Y, SW, SH - FLOOR_Y);
    g.fillStyle = FLOOR_LINE;
    for (var fy = FLOOR_Y + 4; fy < SH; fy += 9) g.fillRect(0, fy, SW, 2);
    g.fillStyle = '#2c0c04';
    g.fillRect(0, FLOOR_Y, SW, 2);

    drawBench(g);
  }

  function drawWindow(g, x, y) {
    g.fillStyle = '#f8e0d4';                 // frame
    g.fillRect(x - 2, y - 2, 22, 38);
    g.fillStyle = '#5c9ce8';                 // glass
    g.fillRect(x, y, 18, 34);
    g.fillStyle = '#8cc4f8';                 // the lit half of each pane
    g.fillRect(x, y, 8, 16);
    g.fillRect(x + 10, y + 18, 8, 16);
    g.fillStyle = '#f8e0d4';                 // mullions
    g.fillRect(x + 8, y, 2, 34);
    g.fillRect(x, y + 16, 18, 2);
  }

  // the green bench he stands in front of
  function drawBench(g) {
    var x0 = 148, x1 = 276, top = 176;
    [[152, '#58a818'], [160, '#c02818'], [168, '#c02818'],
     [248, '#58a818'], [262, '#58a818']].forEach(function (leg) {
      g.fillStyle = leg[1];
      g.fillRect(leg[0], top + 6, 4, FLOOR_Y - top - 6);
    });
    g.fillStyle = '#78c828';
    g.fillRect(x0, top, x1 - x0, 6);
    g.fillStyle = '#a8e858';
    g.fillRect(x0, top, x1 - x0, 2);
  }

  // ---- the man himself -----------------------------------------------------
  var E_PAL = {
    K: '#241820',   // hair and beard
    S: '#f8c088',   // face and hands
    s: '#d89860',
    P: '#5838b0',   // the purple tunic
    p: '#382080',
    L: '#f0d0a8',   // bare legs
    B: '#241820'    // boots
  };
  var E_ROWS = [
    '.....KKKKKK.....',
    '....KKKKKKKK....',
    '...KKKKKKKKKK...',
    '...KSSSSSSSSK...',
    '...KSSSSSSSSK...',
    '...KSKSSSSKSK...',
    '...KSSSSSSSSK...',
    '...KKSSSSSSKK...',
    '....KKKKKKKK....',
    '.....PPPPPP.....',
    '....PPPPPPPP....',
    '...PPPPPPPPPP...',
    '..SPPPPPPPPPPS..',
    '..SPPPPPPPPPPS..',
    '..SPPPPPPPPPPS..',
    '...PPPPPPPPPP...',
    '...PPPPPPPPPP...',
    '...pPPPPPPPPp...',
    '....pppppppp....',
    '....LLLLLLLL....',
    '....LLLL.LLL....',
    '....LLLL.LLL....',
    '....LLLL.LLL....',
    '....LLLL.LLL....',
    '....LLL..LLL....',
    '...BBBB..BBBB...',
    '...BBBB..BBBB...',
    '..BBBBB..BBBBB..'
  ];
  var E_W = 16, E_H = E_ROWS.length;
  var errorCanvas = null;
  function errorSprite() {
    if (errorCanvas) return errorCanvas;
    var c = document.createElement('canvas');
    c.width = E_W; c.height = E_H;
    var x = c.getContext('2d');
    for (var y = 0; y < E_H; y++) {
      for (var i = 0; i < E_W; i++) {
        var ch = E_ROWS[y][i];
        if (ch === '.') continue;
        x.fillStyle = E_PAL[ch];
        x.fillRect(i, y, 1, 1);
      }
    }
    return (errorCanvas = c);
  }

  function drawError(g) {
    g.drawImage(errorSprite(), ERROR_X, FLOOR_Y - E_H);
  }

  // ---- his text box --------------------------------------------------------
  // Black inside, a doubled blue frame, and a red stud in each corner.
  var LINES = ['I AM', 'ERROR.'];
  var TOTAL = LINES.join('').length;
  var BOX = { x: 148, y: 14, w: 156, h: 88 };

  function drawBox(g, fontFor, shownChars) {
    var b = BOX;
    g.fillStyle = '#000';
    g.fillRect(b.x, b.y, b.w, b.h);
    g.strokeStyle = '#5878f8';
    g.lineWidth = 2;
    g.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    g.strokeRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
    g.fillStyle = '#c02818';
    [[b.x, b.y], [b.x + b.w - 9, b.y],
     [b.x, b.y + b.h - 9], [b.x + b.w - 9, b.y + b.h - 9]].forEach(function (c) {
      g.fillStyle = '#e8e8f8';
      g.fillRect(c[0], c[1], 9, 9);
      g.fillStyle = '#c02818';
      g.fillRect(c[0] + 2, c[1] + 2, 5, 5);
    });

    // reveal the letters a few at a time, running on across both lines
    g.font = fontFor(11);
    g.textBaseline = 'top';
    g.textAlign = 'left';
    g.fillStyle = '#f8f8f8';
    var left = 0;
    for (var i = 0; i < LINES.length; i++) {
      var take = Math.max(0, Math.min(LINES[i].length, shownChars - left));
      if (take > 0) g.fillText(LINES[i].slice(0, take), b.x + 26, b.y + 26 + i * 22);
      left += LINES[i].length;
    }
  }

  G.ErrorRoom = {
    FLOOR_Y: FLOOR_Y,
    ERROR_X: ERROR_X,
    ERROR_W: E_W,
    ERROR_H: E_H,
    TOTAL_CHARS: TOTAL,
    drawScene: drawScene,
    drawError: drawError,
    drawBox: drawBox
  };
})();
