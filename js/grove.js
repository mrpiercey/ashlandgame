/* Ashland Elementary 26/27 - the Master Ruler grove.
 *
 * Type ERROR at the man in purple and he vanishes; keep walking right and
 * you come up out of the old stump at the bottom of a quiet forest. At the
 * top, ringed by a stone plaza: the MASTER RULER, stuck in its pedestal for
 * as long as anyone can remember. Only a student who knows their
 * measurements can pull it free (see main.js for the quiz and the storm).
 *
 * The grove IS a picture (masterruler.jpeg, 285x571): it draws 320 wide and
 * the camera slides up and down its length -- a top-and-bottom scroller,
 * one screen across. Every number in here is measured on the artwork in
 * its native pixels and scaled by 320/285 at use. */
var G = window.G = window.G || {};

(function () {
  var NAT_W = 285, NAT_H = 571;
  var S = 320 / NAT_W;                                 // native px -> world px
  var WORLD_W = 320, WORLD_H = Math.round(NAT_H * S);  // 320 x 641

  var art = new Image();
  art.src = 'masterruler.jpeg';
  function ready() { return art.complete && art.naturalWidth > 0; }

  function drawScene(g, camY, SW, SH) {
    g.fillStyle = '#12351d';
    g.fillRect(0, 0, SW, SH);
    if (!ready()) return;
    var sm = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = false;
    g.drawImage(art, 0, 0, NAT_W, NAT_H, 0, -camY, WORLD_W, WORLD_H);
    g.imageSmoothingEnabled = sm;
  }

  // ---- where feet may go --------------------------------------------------
  // The open grove floor, the stump corridor at the bottom, and the plaza,
  // whose rim is solid all the way around except the steps at its bottom
  // left. The pedestal itself never moves for anybody.
  function blocked(wx, wy) {
    var x = wx / S, y = wy / S;
    var inField = x >= 40 && x <= 245 && y >= 30 && y <= 505;
    var inStump = x >= 96 && x <= 176 && y > 505 && y <= 552;
    var inSteps = x >= 98 && x <= 166 && y >= 200 && y <= 236;
    if (!inField && !inStump && !inSteps) return true;
    if (x >= 104 && x <= 160 && y >= 122 && y <= 172) return true;  // pedestal
    var inPlaza = x >= 46 && x <= 212 && y >= 82 && y <= 232;
    var inFloor = x >= 64 && x <= 196 && y >= 94 && y <= 218;
    if (inPlaza && !inFloor && !inSteps) return true;               // the rim
    return false;
  }

  // the pedestal, in world pixels: where the ruler stands, and how close
  // counts as close enough to grab for it
  var PED = { x: Math.round(132 * S), y: Math.round(147 * S) };
  function nearPedestal(wx, wy) {
    return Math.abs(wx - PED.x) < 44 && wy > 100 * S && wy < 205 * S;
  }

  var SPAWN = { x: Math.round(138 * S), y: Math.round(520 * S) };
  var EXIT_Y = Math.round(546 * S);   // feet past this = back down the stump

  // ---- the MASTER RULER ---------------------------------------------------
  // a golden one-footer with proper tick marks, drawn standing in the
  // pedestal the way a certain sword once stood, and later held flat over
  // the student's head
  function rulerBody(g, x, y, w, h, vertical) {
    g.fillStyle = '#7c4a12';
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = '#f2c14e';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#7c4a12';
    if (vertical) {
      for (var i = 3; i < h - 1; i += 4) g.fillRect(x, y + i, i % 8 === 3 ? 4 : 2, 1);
    } else {
      for (var j = 3; j < w - 1; j += 4) g.fillRect(x + j, y, 1, j % 8 === 3 ? 4 : 2);
    }
  }

  function drawRuler(g, camY, nowMs) {
    var x = PED.x - 3;
    var top = PED.y - camY - 24;
    rulerBody(g, x, top, 6, 24, true);
    // it glints, the way legendary school supplies do
    if (Math.floor(nowMs / 700) % 3 === 0) {
      g.fillStyle = '#fff7d0';
      g.fillRect(x + 4, top + 2 + (Math.floor(nowMs / 700) * 7) % 14, 2, 2);
    }
  }

  // held straight up over the student's head, point to the sky -- the same
  // pose the pencil gets, because that is the pose that matters
  function drawRulerHeld(g, cx, headY) {
    rulerBody(g, Math.round(cx) - 3, headY - 26, 6, 24, true);
  }

  // a lightning bolt, jagged fresh every frame, from the sky down to a point
  function drawBolt(g, x1, y1) {
    g.strokeStyle = '#fff7b0';
    g.lineWidth = 2;
    g.beginPath();
    var x = x1 + (Math.random() * 40 - 20), y = -6;
    g.moveTo(x, y);
    while (y < y1 - 8) {
      y += 14 + Math.random() * 16;
      x += Math.random() * 28 - 14;
      g.lineTo(Math.min(310, Math.max(10, x)), Math.min(y, y1));
    }
    g.lineTo(x1, y1);
    g.stroke();
  }

  G.Grove = {
    WORLD_W: WORLD_W,
    WORLD_H: WORLD_H,
    SPAWN: SPAWN,
    EXIT_Y: EXIT_Y,
    PED: PED,
    blocked: blocked,
    nearPedestal: nearPedestal,
    drawScene: drawScene,
    drawRuler: drawRuler,
    drawRulerHeld: drawRulerHeld,
    drawBolt: drawBolt
  };
})();
