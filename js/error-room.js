/* Ashland Elementary 26/27 - the ERROR room.
 *
 * Type ZELDA while standing in the old man's cave and a hole opens in the
 * roof. Step into it and the game turns sideways: a brick room seen from the
 * side, a man in a purple tunic who will not let you past, and one thing to
 * say when you ask him.
 *
 * The room IS a picture. errorroom.png is iamerrorscreen.png sampled back
 * down to its native 256x200 (the screenshot is that art blown up ~4x, and
 * scaling the big one down in the browser turns the mortar lines to mush).
 * The man is part of that picture -- he is never drawn separately, which is
 * why the numbers below are measured off the image rather than chosen. */
var G = window.G = window.G || {};

(function () {
  var SRC_W = 256, SRC_H = 200;

  // Landmarks, measured on the artwork and converted to the 320x240 view
  // (x * 320/256, y * 240/200):
  //   his feet rest on native y 172   -> 206
  //   he stands across native x 160..176 -> 200..220
  //   his hair starts at native y 142 -> 170
  var FLOOR_Y = 206;          // the line he and the student both stand on
  var ERROR_X = 200;          // his left shoulder
  var ERROR_W = 20;
  var ERROR_TOP = 170;

  var room = new Image();
  room.src = 'errorroom.png';
  function roomReady() { return room.complete && room.naturalWidth > 0; }

  function drawScene(g, SW, SH) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, SW, SH);
    if (!roomReady()) return;
    var sm = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = false;
    g.drawImage(room, 0, 0, SRC_W, SRC_H, 0, 0, SW, SH);
    g.imageSmoothingEnabled = sm;
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

  // Type ERROR back at him and he is gone -- but he is painted INTO the
  // picture, so "gone" means rebuilding the wall behind him. Two clones from
  // just left of where he sat (measured on the artwork like everything else):
  // brick above the bench, shifted a whole number of bricks so the courses
  // line up, and bench planks with the shadow under them for his legs.
  function drawManPatch(g) {
    if (!roomReady()) return;
    var sm = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = false;
    var kx = 320 / SRC_W, ky = 240 / SRC_H;
    [{ x: 158, y: 134, w: 22, h: 26, ox: -32 },   // brick (he sits at 161..177)
     { x: 158, y: 160, w: 22, h: 16, ox: -24 }].forEach(function (r) {  // bench
      g.drawImage(room, r.x + r.ox, r.y, r.w, r.h,
        Math.round(r.x * kx), Math.round(r.y * ky),
        Math.round(r.w * kx), Math.round(r.h * ky));
    });
    g.imageSmoothingEnabled = sm;
  }

  G.ErrorRoom = {
    FLOOR_Y: FLOOR_Y,
    ERROR_X: ERROR_X,
    ERROR_W: ERROR_W,
    ERROR_TOP: ERROR_TOP,
    TOTAL_CHARS: TOTAL,
    drawScene: drawScene,
    drawBox: drawBox,
    drawManPatch: drawManPatch
  };
})();
