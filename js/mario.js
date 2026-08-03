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

  // the little flag baked into the artwork disappears behind a patch of
  // sky CLONED from just left of it -- real pixels, so the blues always
  // match -- and the patch stops short of the pole, which stays whole
  function drawSkyPatch(g, camX) {
    if (!ready()) return;
    var sm = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = false;
    g.drawImage(art, 300, 42, 18, 22,
      Math.round((343 - camX) * S), Math.round(42 * S),
      Math.ceil(18 * S), Math.ceil(22 * S));
    g.imageSmoothingEnabled = sm;
  }

  // where feet land, per native x: the ground, the arrival pipe, and the
  // eight-step staircase. Everything else (castle, hills, clouds) is scenery.
  // Boundaries are pulled a couple of pixels PAST the artwork's block faces
  // on purpose: stopping a hair early reads as solid, stopping a hair late
  // reads as clipping.
  function floorAt(x) {
    if (x >= 22 && x <= 58) return 186;                   // the pipe
    if (x >= 61 && x <= 214) {                            // the staircase
      var k = Math.min(7, Math.floor((x - 61) / 18));
      return 205 - k * 18;
    }
    if (x >= 353 && x <= 376) return 202;                 // the pole's base block
    return 216;
  }

  // the GOLDEN BOOK: spine on the left, a proper block of white pages on
  // the fore-edge, and a title bar -- unmistakably a book, even at 16px
  function drawBook(g, sx, sy) {
    g.fillStyle = '#4a2f08';               // outline
    g.fillRect(sx - 1, sy - 1, 16, 14);
    g.fillStyle = '#f2c14e';               // golden cover
    g.fillRect(sx, sy, 11, 12);
    g.fillStyle = '#c9942e';               // the spine...
    g.fillRect(sx, sy, 3, 12);
    g.fillStyle = '#f7e08a';               // ...with its two little bands
    g.fillRect(sx, sy + 2, 3, 1);
    g.fillRect(sx, sy + 9, 3, 1);
    g.fillStyle = '#fff7ea';               // the page block
    g.fillRect(sx + 11, sy + 1, 3, 10);
    g.fillStyle = '#d8cfae';               // page seams
    g.fillRect(sx + 12, sy + 2, 1, 8);
    g.fillStyle = '#fff7d0';               // title lines on the cover
    g.fillRect(sx + 5, sy + 3, 4, 2);
    g.fillRect(sx + 5, sy + 7, 3, 1);
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
