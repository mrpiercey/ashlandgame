/* Ashland Elementary 26/27 - the ZELDA secret.
 *
 * Type LINK in the middle-floor hallway and the bulletin board in front of
 * Eddie opens into a cave: a black room ringed with carved red figures, two
 * fires, an old man with one thing to say, and a #2 pencil on the floor.
 *
 * The drawing lives here rather than in main.js so the whole easter egg is
 * one file. */
var G = window.G = window.G || {};

(function () {
  // broken across two lines exactly where the original broke it
  var LINES = ["IT'S DANGEROUS TO GO", 'ALONE! TAKE THIS.'];

  // ---- the old man --------------------------------------------------------
  // oldman.png is 16x16 pixel art blown up onto a 240x240 black field. Rather
  // than scale that down and get mush, we find the figure, sample the middle
  // of each of its 16x16 blocks, and rebuild a crisp 16x16 sprite at the
  // game's own scale. The black field is flood-filled away from the edges, so
  // black INSIDE him (his eyes) survives.
  var oldManPng = null;               // the rebuilt sprite, once the file lands
  var oldManImg = new Image();
  oldManImg.onload = function () { oldManPng = rebuild(oldManImg, 16, 16, 1.5); };
  oldManImg.src = 'oldman.png';

  // ---- the prize ----------------------------------------------------------
  // Not a sword and not a rupee: a plain yellow #2 pencil, point up, held the
  // way Link holds the sword. Drawn rather than loaded so it always matches
  // the game's own palette.
  var PENCIL_PAL = {
    G: '#2a2a32', g: '#14141a',            // graphite
    W: '#e6c68f', w: '#c9a86c',            // bare wood
    H: '#ffe173', Y: '#f2c218', y: '#c99a0e',  // the barrel
    S: '#c9ccd4', s: '#9a9da6',            // the ferrule
    E: '#ef8fa2', e: '#c96e80'             // the eraser
  };
  var PENCIL_ROWS = [
    '..GG..',
    '..GG..',
    '.gGGg.',
    '.WWWw.',
    'WWWWww',
    'WWWWww',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'HYYYYy',
    'SSSSss',
    'sSSSss',
    'EEEEee',
    'EEEEee',
    '.EEee.'
  ];
  var PENCIL_W = 6, PENCIL_H = PENCIL_ROWS.length;
  var pencilCanvas = null;
  function pencilSprite() {
    if (pencilCanvas) return pencilCanvas;
    var c = document.createElement('canvas');
    c.width = PENCIL_W; c.height = PENCIL_H;
    var x = c.getContext('2d');
    for (var y = 0; y < PENCIL_H; y++) {
      for (var i = 0; i < PENCIL_W; i++) {
        var ch = PENCIL_ROWS[y][i];
        if (ch === '.') continue;
        x.fillStyle = PENCIL_PAL[ch];
        x.fillRect(i, y, 1, 1);
      }
    }
    return (pencilCanvas = c);
  }

  function isDark(d, i) { return d[i] < 26 && d[i + 1] < 26 && d[i + 2] < 26; }

  function rebuild(img, cols, rows, scale) {
    var iw = img.width, ih = img.height;
    var src = document.createElement('canvas');
    src.width = iw; src.height = ih;
    src.getContext('2d').drawImage(img, 0, 0);
    var d;
    try { d = src.getContext('2d').getImageData(0, 0, iw, ih).data; }
    catch (e) { return null; }        // tainted canvas: keep the drawn fallback

    // trim the black margin so the figure fills the cols x rows grid
    var minX = iw, minY = ih, maxX = -1, maxY = -1;
    for (var y = 0; y < ih; y++) {
      for (var x = 0; x < iw; x++) {
        if (isDark(d, (y * iw + x) * 4)) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) return null;

    // one sample from the centre of each block
    var bw = (maxX - minX + 1) / cols, bh = (maxY - minY + 1) / rows;
    var cell = [];
    for (var by = 0; by < rows; by++) {
      cell.push([]);
      for (var bx = 0; bx < cols; bx++) {
        var sx = Math.min(iw - 1, Math.round(minX + (bx + 0.5) * bw));
        var sy = Math.min(ih - 1, Math.round(minY + (by + 0.5) * bh));
        var i = (sy * iw + sx) * 4;
        cell[by].push({ r: d[i], g: d[i + 1], b: d[i + 2], dark: isDark(d, i), bg: false });
      }
    }

    // Flood the background in from the edges: only black connected to the
    // outside counts as background, so black INSIDE the art (the old man's
    // eyes) stays put instead of going see-through.
    var queue = [];
    for (var k = 0; k < Math.max(cols, rows); k++) {
      if (k < cols) queue.push([k, 0], [k, rows - 1]);
      if (k < rows) queue.push([0, k], [cols - 1, k]);
    }
    while (queue.length) {
      var p = queue.pop(), px = p[0], py = p[1];
      if (px < 0 || py < 0 || px >= cols || py >= rows) continue;
      var c = cell[py][px];
      if (c.bg || !c.dark) continue;
      c.bg = true;
      queue.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }

    // Painting each source pixel as a scale-sized block. The old man's art is
    // 16x16 (Link's size in the original) but Ashland's kids are 16x24, so he
    // gets 1.5 so he stands a head above a student.
    var S = scale || 1;
    var out = document.createElement('canvas');
    out.width = Math.round(cols * S); out.height = Math.round(rows * S);
    var og = out.getContext('2d');
    for (var oy = 0; oy < rows; oy++) {
      for (var ox = 0; ox < cols; ox++) {
        var q = cell[oy][ox];
        if (q.bg) continue;
        var x0 = Math.round(ox * S), y0 = Math.round(oy * S);
        og.fillStyle = 'rgb(' + q.r + ',' + q.g + ',' + q.b + ')';
        og.fillRect(x0, y0, Math.round((ox + 1) * S) - x0, Math.round((oy + 1) * S) - y0);
      }
    }
    return out;
  }

  // the png if it loaded, otherwise the hand-drawn stand-in
  var oldManDrawn = null;
  function oldManSprite() {
    if (oldManPng) return oldManPng;
    if (!oldManDrawn) oldManDrawn = G.Sprites.oldMan();
    return oldManDrawn;
  }

  // A flame standing on the bare floor -- no brazier, just fire, the way the
  // original drew it. Two frames of flicker off the wall clock, so the pair
  // either side of the old man never wave in step.
  // flames.png holds the two frames of flamesgif.gif side by side at their
  // native 16x16 (extracted from the gif; regenerate it if the gif changes).
  // We flip between them on our own clock rather than drawing the <img>: a
  // browser only advances a GIF it is actually painting, so an <img> that
  // lives off-screen just to be drawn onto canvas stays frozen on frame one.
  // Drawn at 24px the fire sits on the same 1.5x grid the old man does.
  var FIRE_PX = 24, FIRE_CELL = 16, FIRE_FRAMES = 2, FIRE_MS = 200;
  var fireSheet = new Image();
  fireSheet.src = 'flames.png';
  function fireReady() { return fireSheet.complete && fireSheet.naturalWidth > 0; }

  function drawFire(g, nx, ny, seed) {
    var t = performance.now() / 1000 + (seed || 0);
    var lean = (Math.floor(t * 8) % 2) ? 1 : -1;
    var base = ny + 16;                       // the flame stands on its tile
    g.save();
    g.globalCompositeOperation = 'lighter';   // a little light on the black
    var gg = g.createRadialGradient(nx + 8, base - 9, 0, nx + 8, base - 9, 28);
    gg.addColorStop(0, 'rgba(255,140,30,0.30)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gg;
    g.fillRect(nx - 20, base - 37, 56, 56);
    g.restore();
    if (fireReady()) {
      // the seed nudges each fire a frame apart so the pair never pulse as one
      var f = (Math.floor(performance.now() / FIRE_MS) + Math.round(seed || 0)) % FIRE_FRAMES;
      var sm = g.imageSmoothingEnabled;
      g.imageSmoothingEnabled = false;
      g.drawImage(fireSheet,
        f * FIRE_CELL, 0, FIRE_CELL, FIRE_CELL,
        nx + 8 - FIRE_PX / 2, base - FIRE_PX, FIRE_PX, FIRE_PX);
      g.imageSmoothingEnabled = sm;
      return;
    }
    // no gif on disk: the hand-drawn stand-in below
    // outer flame: a fat teardrop, wide at the floor, licking to one side
    g.fillStyle = '#d83808';
    g.fillRect(nx + 1, base - 6, 14, 6);
    g.fillRect(nx + 2, base - 11, 12, 5);
    g.fillRect(nx + 4, base - 15, 8, 4);
    g.fillRect(nx + 5 + lean, base - 18, 6, 3);
    g.fillRect(nx + 6 + lean, base - 20, 4, 2);
    g.fillStyle = '#f88818';                  // core
    g.fillRect(nx + 3, base - 5, 10, 5);
    g.fillRect(nx + 4, base - 10, 8, 5);
    g.fillRect(nx + 5, base - 14, 6, 4);
    g.fillRect(nx + 6 + lean, base - 17, 4, 3);
    g.fillStyle = '#f8d878';                  // white-hot heart
    g.fillRect(nx + 5, base - 4, 6, 4);
    g.fillRect(nx + 6, base - 9, 4, 5);
    g.fillRect(nx + 7, base - 13, 2, 4);
  }

  // ---- the poof ------------------------------------------------------------
  // One chunky pixel cloud: a square with its corners knocked off, which is
  // how an 8-bit puff of smoke was always drawn.
  function puffBlob(g, x, y, s, color) {
    var h = Math.max(1, Math.round(s / 2));
    g.fillStyle = color;
    g.fillRect(x - h, y - h + 1, h * 2, h * 2 - 2);
    g.fillRect(x - h + 1, y - h, h * 2 - 2, h * 2);
  }

  // The puff that hides the bulletin board turning into a cave mouth. t runs
  // 0 -> 1: the ring of clouds swells outward, thins, and fades.
  var PUFF_COLORS = ['#f8f8f8', '#d0d0d0', '#a0a0a0'];
  function drawPuff(g, cx, cy, t) {
    if (t < 0 || t >= 1) return;
    var spread = 2 + t * 11;                       // how far the ring has flown
    var size = Math.max(2, Math.round(8 - t * 5)); // each cloud thins as it goes
    g.save();
    g.globalAlpha = 1 - Math.max(0, (t - 0.5) / 0.5);
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2 + t * 0.8;     // and drifts round a little
      puffBlob(g,
        Math.round(cx + Math.cos(a) * spread),
        Math.round(cy + Math.sin(a) * spread * 0.85),
        size, PUFF_COLORS[i % PUFF_COLORS.length]);
    }
    if (t < 0.55) puffBlob(g, Math.round(cx), Math.round(cy), size + 1, '#f8f8f8');
    g.restore();
  }

  // The pencil, wherever it is. On the floor (still = false) it hovers and
  // bobs over its tile; held aloft it sits rock steady. nx,ny is the tile it
  // belongs to -- the pencil is taller than a tile, so it stands up out of it.
  function drawPencil(g, nx, ny, still) {
    var bob = still ? 0 : Math.round(Math.sin(performance.now() / 1000 * 3));
    g.drawImage(pencilSprite(),
      nx + Math.round((16 - PENCIL_W) / 2),
      ny + 16 - PENCIL_H + bob);
  }

  // The message is NOT the usual green dialogue box: two centred white lines
  // painted straight onto the black, the way the original did it. The longest
  // line is stepped down a size at a time until it fits the screen, so a
  // translation can never run off the edge of the cave.
  var TEXT_TOP = 42, TEXT_LEAD = 21, TEXT_MARGIN = 12;
  function drawText(g, fontFor, screenW, alpha) {
    var lines = LINES.map(function (l) { return G.Lang ? G.Lang.t(l) : l; });
    var px = 14;
    while (px > 7) {
      g.font = fontFor(px);
      var widest = 0;
      for (var w = 0; w < lines.length; w++) {
        widest = Math.max(widest, g.measureText(lines[w]).width);
      }
      if (widest <= screenW - TEXT_MARGIN * 2) break;
      px--;
    }
    g.textBaseline = 'top';
    g.textAlign = 'center';
    g.fillStyle = '#f8f8f8';
    g.globalAlpha = alpha === undefined ? 1 : alpha;
    for (var i = 0; i < lines.length; i++) {
      g.fillText(lines[i], screenW / 2, TEXT_TOP + i * TEXT_LEAD);
    }
    g.globalAlpha = 1;
    g.textAlign = 'left';
  }

  G.Secret = {
    LINES: LINES,
    PENCIL_H: PENCIL_H,
    oldManSprite: oldManSprite,
    pencilSprite: pencilSprite,
    drawFire: drawFire,
    drawPencil: drawPencil,
    drawPuff: drawPuff,
    drawText: drawText
  };
})();
