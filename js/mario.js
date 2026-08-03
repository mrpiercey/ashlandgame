/* Ashland Elementary 26/27 - the world down the library pipe.
 *
 * Five finds deep in the library shelves sits "Super Mario Brothers: The
 * Book". Type its title and a green pipe grows where the reading tent was;
 * step on and you drop into mariolevel.png -- the end of a certain very
 * famous level, played sideways: run, jump, catch the pole, and instead of
 * a flag a GOLDEN BOOK slides down to meet you.
 *
 * The level IS the picture (772x248, drawn at the canvas's 240 height, so
 * everything here is measured native and scaled by 240/248 at draw):
 *   ground top 216; the pipe you arrive in at x 24..56 (top 186);
 *   the staircase x 63..215, eight 18px steps from 205 up to 79;
 *   the flagpole at x 363 (its little flag, y 42..62, gets a patch of sky
 *   painted over it so the book can take its place); castle door at 466. */
var G = window.G = window.G || {};

(function () {
  var W = 772, H = 248;
  var S = 240 / 248;                 // native px -> screen px

  var art = new Image();
  art.src = 'mariolevel.png';
  function ready() { return art.complete && art.naturalWidth > 0; }

  function drawScene(g, camX, SW, SH) {
    g.fillStyle = '#6993f4';         // the exact sky, for the frame or two before load
    g.fillRect(0, 0, SW, SH);
    if (!ready()) return;
    var sm = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = false;
    g.drawImage(art, camX, 0, SW / S, H, 0, 0, SW, SH);
    g.imageSmoothingEnabled = sm;
  }

  // the little flag baked into the artwork gets the sky painted over it --
  // the golden book flies from that pole instead
  var FLAG = { x0: 343, y0: 40, x1: 368, y1: 64 };
  function drawSkyPatch(g, camX) {
    g.fillStyle = '#6993f4';
    g.fillRect(Math.round((FLAG.x0 - camX) * S), Math.round(FLAG.y0 * S),
      Math.ceil((FLAG.x1 - FLAG.x0) * S), Math.ceil((FLAG.y1 - FLAG.y0) * S));
  }

  // where feet land, per native x: the ground, the arrival pipe, and the
  // eight-step staircase. Everything else (castle, hills, clouds) is scenery.
  function floorAt(x) {
    if (x >= 24 && x <= 56) return 186;                   // the pipe
    if (x >= 63 && x <= 214) {                            // the staircase
      var k = Math.min(7, Math.floor((x - 63) / 18));
      return 205 - k * 18;
    }
    return 216;
  }

  // the GOLDEN BOOK, small enough to fly a pole and follow a student
  function drawBook(g, sx, sy) {
    g.fillStyle = '#7c4a12';
    g.fillRect(sx - 1, sy - 1, 14, 12);
    g.fillStyle = '#f2c14e';
    g.fillRect(sx, sy, 12, 10);
    g.fillStyle = '#fff7d0';
    g.fillRect(sx + 9, sy + 1, 2, 8);      // the page block
    g.fillStyle = '#7c4a12';
    g.fillRect(sx + 2, sy, 1, 10);         // the spine
    g.fillStyle = '#fff7d0';
    g.fillRect(sx + 5, sy + 3, 2, 2);      // a glint of title
  }

  G.Mario = {
    W: W,
    H: H,
    S: S,
    PIPE: { x0: 24, x1: 56, top: 186 },
    POLE: { x: 363, bookTop: 46, bookBottom: 196 },
    DOOR_X: 462,
    GROUND: 216,
    ready: ready,
    drawScene: drawScene,
    drawSkyPatch: drawSkyPatch,
    floorAt: floorAt,
    drawBook: drawBook
  };
})();
