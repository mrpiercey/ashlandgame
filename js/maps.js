/* Ashland Elementary 26/27 - tile maps: 3 floors + room interiors */
var G = window.G = window.G || {};

(function () {
  var T = G.Tiles;

  function GB(id, w, h) {
    var grid = [];
    for (var y = 0; y < h; y++) {
      grid.push(new Array(w).fill('void'));
    }
    return {
      id: id, w: w, h: h, grid: grid,
      doors: {}, stairs: {}, exitList: [], npcs: [],
      set: function (x, y, t) { if (x >= 0 && x < w && y >= 0 && y < h) grid[y][x] = t; },
      get: function (x, y) { return (x >= 0 && x < w && y >= 0 && y < h) ? grid[y][x] : 'void'; },
      rect: function (x, y, rw, rh, t) {
        for (var yy = y; yy < y + rh; yy++) for (var xx = x; xx < x + rw; xx++) this.set(xx, yy, t);
      }
    };
  }

  function wallify(m) {
    var changes = [];
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        if (m.get(x, y) !== 'void') continue;
        var near = false;
        for (var dy = -1; dy <= 1 && !near; dy++) {
          for (var dx = -1; dx <= 1 && !near; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (T.isWalkable(m.get(x + dx, y + dy))) near = true;
          }
        }
        if (near) changes.push([x, y]);
      }
    }
    changes.forEach(function (c) { m.set(c[0], c[1], 'wall'); });
  }

  function greenBands(m) {
    // hallway floors adjacent to a solid tile become the green tile band
    var changes = [];
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        if (m.get(x, y) !== 'floor') continue;
        var edge = false;
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
          if (!T.isWalkable(m.get(x + d[0], y + d[1]))) edge = true;
        });
        if (edge) changes.push([x, y]);
      }
    }
    changes.forEach(function (c) { m.set(c[0], c[1], 'green'); });
  }

  function scatterDecor(m) {
    // bulletin boards on hallway-facing walls
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        if (m.get(x, y) !== 'wall') continue;
        var facing = false;
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
          if (T.isWalkable(m.get(x + d[0], y + d[1]))) facing = true;
        });
        if (!facing) continue;
        var s = (x * 31 + y * 17) % 23;
        if (s === 0) m.set(x, y, 'bulletinP');
        else if (s === 7) m.set(x, y, 'bulletinC');
      }
    }
  }

  function addDoor(m, x, y, roomId, exitIndex) {
    m.set(x, y, 'door');
    m.doors[x + ',' + y] = { roomId: roomId, exitIndex: exitIndex || 0 };
  }

  // options: destinations the stairwell can take you to; the game asks which
  function addStairs(m, coords, type, options) {
    coords.forEach(function (c) {
      m.set(c[0], c[1], type);
      m.stairs[c[0] + ',' + c[1]] = { options: options };
    });
  }

  // stairwell destinations (arrival spots on each floor)
  var DEST = {
    top: { map: 'top', x: 17, y: 9, dir: 'down', label: 'TOP FLOOR' },
    middle: { map: 'middle', x: 19, y: 12, dir: 'down', label: 'GROUND FLOOR' },
    basement: { map: 'basement', x: 7, y: 22, dir: 'right', label: 'LOWER FLOOR' },
    dance: { map: 'b-dance', x: 2, y: 2, dir: 'down', label: 'DANCE & DRAMA' },
    middleAtDance: { map: 'middle', x: 41, y: 4, dir: 'down', label: 'GROUND FLOOR' }
  };

  // ---- MIDDLE FLOOR (spawn) ----------------------------------------------
  function buildMiddle() {
    var m = GB('middle', 54, 30);
    m.name = 'GROUND FLOOR';
    m.isHall = true;

    // hallways
    m.rect(18, 11, 6, 13, 'floor');   // center vertical hall
    m.rect(7, 20, 6, 4, 'floor');     // left branch (to Todd / Walker)
    m.rect(7, 24, 39, 4, 'floor');    // bottom hall
    m.rect(40, 5, 6, 19, 'floor');    // right vertical hall
    m.rect(40, 1, 10, 4, 'floor');    // top area near cafeteria

    wallify(m);
    greenBands(m);

    // blue accent rectangles (like the real hallway floor)
    m.rect(12, 25, 2, 2, 'blue');
    m.rect(20, 25, 2, 2, 'blue');
    m.rect(28, 25, 2, 2, 'blue');
    m.rect(36, 25, 2, 2, 'blue');
    m.rect(20, 14, 2, 2, 'blue');
    m.rect(20, 19, 2, 2, 'blue');
    m.rect(42, 8, 2, 2, 'blue');
    m.rect(42, 13, 2, 2, 'blue');
    m.rect(42, 18, 2, 2, 'blue');

    // stairwell doors at top of the center hall (serves top floor + basement)
    addStairs(m, [[18, 10], [19, 10], [20, 10], [21, 10]], 'stairU',
      [DEST.top, DEST.basement]);
    m.set(22, 10, 'purple');
    m.set(23, 10, 'purple');

    // right-hall stairwell by the cafeteria goes DOWN to Dance & Drama
    addStairs(m, [[39, 4], [39, 5]], 'stairD', [DEST.dance]);

    // purple exterior doors
    for (var px = 42; px <= 47; px++) m.set(px, 0, 'purple');   // top doors to outside
    for (var qx = 28; qx <= 35; qx++) m.set(qx, 28, 'purple');  // front doors to outside

    // room doors
    addDoor(m, 9, 19, 'm-todd');
    addDoor(m, 6, 25, 'm-walker');
    addDoor(m, 15, 28, 'm-nurse');
    addDoor(m, 23, 28, 'm-front');
    addDoor(m, 41, 28, 'm-eagles');
    addDoor(m, 46, 25, 'm-caf', 0);
    addDoor(m, 46, 26, 'm-caf', 0);
    addDoor(m, 50, 2, 'm-caf', 1);
    addDoor(m, 50, 3, 'm-caf', 1);

    wallify(m); // frame the newly punched doors/stairs
    scatterDecor(m);
    m.set(15, 23, 'fountain');
    m.set(27, 28, 'exit');
    m.set(48, 0, 'exit');
    m.set(17, 10, 'exit');

    // Eddie the Eagle mascot hangs out near the spawn point
    m.npcs.push({ kind: 'eagle', x: 33, y: 23 });

    // name sign behind the stairs down to Dance & Drama (no hallway door)
    m.extraSigns = [{ tiles: [[39, 4], [39, 5]], dir: 'right', roomId: 'b-dance' }];

    // start in the main hallway, right in front of the (locked) front doors
    m.spawn = { x: 31, y: 24, dir: 'up' };
    return m;
  }

  // ---- TOP FLOOR ----------------------------------------------------------
  function buildTop() {
    var m = GB('top', 56, 32);
    m.name = 'TOP FLOOR';
    m.isHall = true;

    m.rect(6, 7, 47, 4, 'floor');    // top corridor
    m.rect(6, 22, 47, 4, 'floor');   // bottom corridor
    // the vertical halls poke PAST the corridors at all four corners --
    // the corner rooms open onto those little spurs (odd, but that's Ashland!)
    m.rect(6, 3, 4, 27, 'floor');    // left vertical + corner spurs
    m.rect(49, 3, 4, 27, 'floor');   // right vertical + corner spurs

    wallify(m);
    greenBands(m);

    m.rect(14, 8, 2, 2, 'blue');
    m.rect(24, 8, 2, 2, 'blue');
    m.rect(34, 8, 2, 2, 'blue');
    m.rect(44, 8, 2, 2, 'blue');
    m.rect(14, 23, 2, 2, 'blue');
    m.rect(24, 23, 2, 2, 'blue');
    m.rect(34, 23, 2, 2, 'blue');
    m.rect(44, 23, 2, 2, 'blue');
    m.rect(7, 14, 2, 2, 'blue');
    m.rect(50, 14, 2, 2, 'blue');

    // corner rooms: doors face the four hallway spurs (like the real map)
    addDoor(m, 5, 4, 't-225');    // top-left spur, west side
    addDoor(m, 10, 4, 't-226');   // top-left spur, east side
    addDoor(m, 48, 4, 't-232');   // top-right spur, west side
    addDoor(m, 53, 4, 't-233');   // top-right spur, east side
    addDoor(m, 5, 28, 't-221');   // bottom-left spur, west side
    addDoor(m, 10, 28, 't-222');  // bottom-left spur, east side
    addDoor(m, 48, 28, 't-215');  // bottom-right spur, west side
    addDoor(m, 53, 28, 't-214');  // bottom-right spur, east side
    // north wall of the top corridor
    addDoor(m, 14, 6, 't-227');
    addDoor(m, 21, 6, 't-228');
    addDoor(m, 28, 6, 't-229');
    addDoor(m, 35, 6, 't-230');
    addDoor(m, 42, 6, 't-231');
    // west wall
    addDoor(m, 5, 12, 't-224');
    addDoor(m, 5, 17, 't-223');
    // east wall
    addDoor(m, 53, 12, 't-234');
    addDoor(m, 53, 17, 't-235');
    // south wall of the bottom corridor
    addDoor(m, 14, 26, 't-220');
    addDoor(m, 21, 26, 't-219');
    addDoor(m, 28, 26, 't-218');
    addDoor(m, 35, 26, 't-217');
    addDoor(m, 42, 26, 't-216');
    // inner block - facing top corridor
    addDoor(m, 13, 11, 't-201');
    addDoor(m, 25, 11, 't-lib', 1);
    addDoor(m, 26, 11, 't-lib', 1);
    addDoor(m, 44, 11, 't-212');
    // inner block - facing bottom corridor
    addDoor(m, 13, 21, 't-200');
    addDoor(m, 29, 21, 't-lib', 0);
    addDoor(m, 35, 21, 't-205');
    addDoor(m, 44, 21, 't-213');

    // stairwell doors (red squares on the map) - serve middle floor + basement
    var down = [DEST.middle, DEST.basement];
    addStairs(m, [[17, 11], [18, 11]], 'stairD', down);
    addStairs(m, [[17, 21], [18, 21]], 'stairD', down);
    addStairs(m, [[41, 11], [42, 11]], 'stairD', down);
    addStairs(m, [[41, 21], [42, 21]], 'stairD', down);

    wallify(m);
    scatterDecor(m);
    m.set(16, 11, 'exit');
    m.set(43, 11, 'exit');
    m.set(16, 21, 'exit');
    m.set(43, 21, 'exit');
    m.set(24, 6, 'fountain');
    m.set(24, 26, 'fountain');

    m.spawn = { x: 17, y: 9, dir: 'down' };
    return m;
  }

  // ---- BASEMENT -----------------------------------------------------------
  function buildBasement() {
    var m = GB('basement', 48, 30);
    m.name = 'LOWER FLOOR';
    m.isHall = true;

    m.rect(6, 20, 15, 4, 'floor');       // hallway by the music room...
    m.rect(21, 9, 24, 18, 'gymfloor');   // ...opens straight into the gym

    wallify(m);
    greenBands(m);

    m.rect(10, 21, 2, 2, 'blue');
    m.rect(16, 21, 2, 2, 'blue');

    // stage with the big red curtain along the gym's back wall
    for (var sx = 26; sx <= 39; sx++) {
      m.set(sx, 9, 'curtain');
      m.set(sx, 10, 'stage');
    }

    // (the basketball court lines are drawn by G.drawCourtLines - smooth arcs
    // that tiles can't manage)

    addStairs(m, [[5, 21], [5, 22]], 'stairU', [DEST.middle, DEST.top]);

    addDoor(m, 12, 24, 'b-music');
    addDoor(m, 13, 24, 'b-music');

    wallify(m);
    scatterDecor(m);
    m.set(5, 20, 'exit');
    // hoops on the end walls + glass doors to outside
    m.set(20, 17, 'hoop');
    m.set(45, 17, 'hoop');
    m.set(29, 27, 'purple'); m.set(30, 27, 'purple');
    m.set(36, 27, 'purple'); m.set(37, 27, 'purple');

    // Ms. Kirk holds court
    m.npcs.push({ kind: 'teacher', roomId: 'b-gym', x: 33, y: 20 });

    m.spawn = { x: 7, y: 22, dir: 'right' };
    return m;
  }

  // ---- INTERIORS ----------------------------------------------------------
  function addExit(m, x, y) {
    m.set(x, y, 'mat');
    m.exitList.push({ x: x, y: y });
  }

  function buildClassroom(room) {
    var m = GB(room.id, 15, 13);
    m.rect(1, 1, 13, 11, 'floor');
    wallify(m);
    // front of the room
    m.set(4, 0, 'whiteboard'); m.set(5, 0, 'whiteboard'); m.set(6, 0, 'whiteboard');
    m.set(7, 0, 'whiteboard'); m.set(8, 0, 'whiteboard'); m.set(9, 0, 'whiteboard');
    m.set(2, 0, 'flag');
    m.set(14, 3, 'window'); m.set(14, 5, 'window'); m.set(14, 7, 'window');
    m.set(0, 4, 'bulletinP'); m.set(0, 8, 'bulletinC');
    // teacher desk
    m.set(3, 3, 'deskTL'); m.set(4, 3, 'deskTR');
    m.set(13, 1, 'plant');
    // student desks
    [6, 8, 10].forEach(function (y) {
      [3, 5, 7, 9, 11].forEach(function (x) { m.set(x, y, 'deskS'); });
    });
    addExit(m, 7, 12);
    m.set(8, 12, 'lightswitch');
    // some rooms (like the PLC Room) have no homeroom teacher
    if (G.TEACHERS[room.id]) {
      m.npcs.push({ kind: 'teacher', roomId: room.id, x: 7, y: 5 });
    }
    return m;
  }

  function buildOffice(room) {
    var m = GB(room.id, 11, 9);
    m.rect(1, 1, 9, 7, 'carpet');
    wallify(m);
    m.set(3, 0, 'window'); m.set(7, 0, 'window');
    m.set(0, 3, 'bulletinP');
    m.set(4, 3, 'deskTL'); m.set(5, 3, 'deskTR');
    m.set(1, 1, 'plant'); m.set(9, 1, 'plant');
    m.set(8, 5, 'chair'); m.set(2, 5, 'chair');
    addExit(m, 5, 8);
    m.set(6, 8, 'lightswitch');
    m.npcs.push({ kind: 'teacher', roomId: room.id, x: 5, y: 2 });
    return m;
  }

  function buildPrincipal(room) {
    var m = GB(room.id, 13, 10);
    m.rect(1, 1, 11, 8, 'carpet');
    wallify(m);
    // the S O A R banner - letters appear as you find them
    m.set(4, 0, 'banner:S'); m.set(5, 0, 'banner:O');
    m.set(6, 0, 'banner:A'); m.set(7, 0, 'banner:R');
    m.set(10, 0, 'window'); m.set(2, 0, 'window');
    m.set(5, 4, 'deskTL'); m.set(6, 4, 'deskTR');
    m.set(1, 1, 'plant'); m.set(11, 1, 'plant');
    m.set(3, 6, 'chair'); m.set(9, 6, 'chair');
    addExit(m, 6, 9);
    m.set(7, 9, 'lightswitch');
    m.npcs.push({ kind: 'teacher', roomId: room.id, x: 6, y: 3 });
    return m;
  }

  function buildCafeteria(room) {
    var m = GB(room.id, 22, 15);
    m.rect(1, 1, 20, 13, 'floor');
    wallify(m);
    for (var cx = 3; cx <= 12; cx++) m.set(cx, 2, 'counter');
    [5, 8, 11].forEach(function (y) {
      for (var x = 4; x <= 9; x++) m.set(x, y, 'table');
      for (var x2 = 12; x2 <= 17; x2++) m.set(x2, y, 'table');
    });
    m.set(20, 1, 'plant');
    m.set(0, 4, 'bulletinP'); m.set(0, 11, 'bulletinC');
    m.set(16, 0, 'window'); m.set(18, 0, 'window');
    addExit(m, 0, 7);   // exit 0 -> bottom hallway door
    addExit(m, 15, 0);  // exit 1 -> top hallway door
    m.set(14, 0, 'lightswitch');
    m.npcs.push({ kind: 'teacher', roomId: room.id, x: 7, y: 1 });
    return m;
  }

  function buildLibrary(room) {
    var m = GB(room.id, 20, 14);
    m.rect(1, 1, 18, 12, 'carpet');
    wallify(m);
    [3, 6].forEach(function (y) {
      for (var x = 3; x <= 7; x++) m.set(x, y, 'shelf');
      for (var x2 = 12; x2 <= 16; x2++) m.set(x2, y, 'shelf');
    });
    for (var tx = 4; tx <= 7; tx++) m.set(tx, 10, 'table');
    for (var tx2 = 12; tx2 <= 15; tx2++) m.set(tx2, 10, 'table');
    m.set(9, 4, 'deskTL'); m.set(10, 4, 'deskTR');
    m.set(1, 1, 'plant'); m.set(18, 1, 'plant');
    m.set(0, 8, 'bulletinP');
    addExit(m, 9, 13);  // exit 0 -> bottom corridor door
    addExit(m, 9, 0);   // exit 1 -> top corridor door
    m.set(10, 13, 'lightswitch');
    m.npcs.push({ kind: 'teacher', roomId: room.id, x: 10, y: 3 });
    return m;
  }

  function buildMusic(room) {
    var m = GB(room.id, 14, 11);
    m.rect(1, 1, 12, 9, 'floor');
    wallify(m);
    m.set(2, 3, 'pianoL'); m.set(3, 3, 'pianoR');
    [[7, 3], [9, 3], [11, 3], [7, 5], [9, 5], [11, 5]].forEach(function (c) {
      m.set(c[0], c[1], 'chair');
    });
    m.set(3, 0, 'bulletinP'); m.set(10, 0, 'bulletinC');
    m.set(1, 8, 'plant');
    addExit(m, 6, 0); // entered from the hallway above
    m.set(7, 0, 'lightswitch');
    m.npcs.push({ kind: 'teacher', roomId: room.id, x: 4, y: 2 });
    return m;
  }

  function buildDance(room) {
    // reached by the stairs at the top-right of the middle floor (no hallway door)
    var m = GB(room.id, 16, 12);
    m.rect(1, 1, 14, 10, 'floor');
    wallify(m);
    // drama curtain along the back wall
    for (var sx = 5; sx <= 12; sx++) m.set(sx, 0, 'curtain');
    // dance mirrors along the west wall
    m.set(0, 3, 'window'); m.set(0, 5, 'window'); m.set(0, 7, 'window');
    m.set(15, 4, 'bulletinP'); m.set(15, 8, 'bulletinC');
    m.set(14, 1, 'plant');
    m.set(3, 8, 'chair'); m.set(5, 8, 'chair'); m.set(7, 8, 'chair');
    // stairs back up to the middle floor
    m.set(1, 1, 'stairU'); m.set(2, 1, 'stairU');
    var back = { options: [DEST.middleAtDance] };
    m.stairs['1,1'] = back;
    m.stairs['2,1'] = back;
    m.set(3, 0, 'lightswitch');
    m.npcs.push({ kind: 'teacher', roomId: room.id, x: 8, y: 3 });
    return m;
  }

  var INTERIOR_BUILDERS = {
    classroom: buildClassroom,
    office: buildOffice,
    principal: buildPrincipal,
    cafeteria: buildCafeteria,
    library: buildLibrary,
    music: buildMusic,
    dance: buildDance
  };

  // ---- room overrides (from roomeditor.html) ------------------------------
  // precedence: localStorage working copy > baked js/room-overrides.js > template
  function loadOverrides() {
    var baked = G.ROOM_OVERRIDES || {};
    var local = {};
    try { local = JSON.parse(localStorage.getItem('ashland-room-overrides') || '{}'); } catch (e) {}
    var merged = {};
    Object.keys(baked).forEach(function (k) { merged[k] = baked[k]; });
    // a null in localStorage is a tombstone: "reverted, ignore the baked copy"
    Object.keys(local).forEach(function (k) {
      if (local[k]) merged[k] = local[k];
      else delete merged[k];
    });
    return merged;
  }

  function applyOverride(m, ov, roomId) {
    if (!ov || !ov.grid || !ov.grid.length) return;

    // remember the template's exits and warp-stairs before replacing the grid
    var tmplExits = m.exitList.slice();
    var tmplStairs = [];
    Object.keys(m.stairs).forEach(function (k) {
      if (m.stairs[k].target) {
        var xy = k.split(',');
        tmplStairs.push({ x: +xy[0], y: +xy[1], type: m.get(+xy[0], +xy[1]), meta: m.stairs[k] });
      }
    });

    m.w = ov.w;
    m.h = ov.h;
    m.grid = ov.grid.map(function (row) { return row.slice(); });
    m.get = function (x, y) {
      return (x >= 0 && x < m.w && y >= 0 && y < m.h) ? m.grid[y][x] : 'void';
    };
    m.set = function (x, y, t) {
      if (x >= 0 && x < m.w && y >= 0 && y < m.h) m.grid[y][x] = t;
    };

    // exits: every painted door mat (custom-destination doors pair separately)
    var custom = ov.doorTargets || {};
    var mats = [];
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        if (m.grid[y][x] === 'mat' && !custom[x + ',' + y]) mats.push({ x: x, y: y });
      }
    }
    if (!mats.length && !Object.keys(custom).length) {
      tmplExits.forEach(function (e) {
        if (e.x < m.w && e.y < m.h) { m.set(e.x, e.y, 'mat'); mats.push({ x: e.x, y: e.y }); }
      });
    }
    // adjacent mats form ONE doorway: cluster them, then pair clusters to
    // the template's exit indices by proximity, so double-door rooms
    // (cafeteria, library) keep the right hallway pairing
    var clusters = [];
    mats.forEach(function (mt) {
      var hit = null;
      for (var ci = 0; ci < clusters.length && !hit; ci++) {
        if (clusters[ci].some(function (t) {
          return Math.abs(t.x - mt.x) + Math.abs(t.y - mt.y) <= 2;
        })) hit = clusters[ci];
      }
      if (hit) hit.push(mt); else clusters.push([mt]);
    });
    var used = {};
    var exitList = [];
    var clusterIdx = {};
    tmplExits.forEach(function (te, i) {
      var best = -1, bd = Infinity;
      clusters.forEach(function (c, j) {
        if (used[j]) return;
        c.forEach(function (mt) {
          var d = (mt.x - te.x) * (mt.x - te.x) + (mt.y - te.y) * (mt.y - te.y);
          if (d < bd) { bd = d; best = j; }
        });
      });
      if (best >= 0) { used[best] = 1; exitList[i] = clusters[best][0]; clusterIdx[best] = i; }
    });
    clusters.forEach(function (c, j) {
      if (!used[j]) { clusterIdx[j] = exitList.length; exitList.push(c[0]); }
    });
    // compact (some template exits may have found no mat at all)
    var compact = [], remap = {};
    exitList.forEach(function (e, i) {
      if (e) { remap[i] = compact.length; compact.push(e); }
    });
    m.exitList = compact;
    m._exitClusters = {};
    clusters.forEach(function (c, j) {
      var idx = remap[clusterIdx[j]] !== undefined ? remap[clusterIdx[j]] : 0;
      m._exitClusters[idx] = c.map(function (mt) { return [mt.x, mt.y]; });
    });

    // warp stairs (e.g. Dance & Drama's way back up): reattach targets to any
    // painted stair tiles; if none painted, restore the template's
    m.stairs = {};
    if (tmplStairs.length) {
      var stairTiles = [];
      for (var sy = 0; sy < m.h; sy++) {
        for (var sx = 0; sx < m.w; sx++) {
          if (m.grid[sy][sx] === 'stairU' || m.grid[sy][sx] === 'stairD') {
            stairTiles.push({ x: sx, y: sy });
          }
        }
      }
      if (!stairTiles.length && !Object.keys(custom).length) {
        // only a room with NO stairs and NO custom doors gets its template
        // stairs back -- the painted plan is otherwise the final word
        tmplStairs.forEach(function (st) {
          if (st.x < m.w && st.y < m.h) {
            m.set(st.x, st.y, st.type);
            stairTiles.push({ x: st.x, y: st.y });
          }
        });
      }
      stairTiles.forEach(function (t) {
        m.stairs[t.x + ',' + t.y] = tmplStairs[0].meta;
      });
    }

    // doors the user pointed at a specific room ("this door leads to...")
    Object.keys(custom).forEach(function (k) {
      var xy = k.split(',');
      var t = m.get(+xy[0], +xy[1]);
      if (t === 'mat' || t === 'door') m.stairs[k] = { goRoom: custom[k] };
    });

    // teacher position
    if (ov.npc && m.npcs.length) {
      m.npcs[0].x = ov.npc.x;
      m.npcs[0].y = ov.npc.y;
    }
  }

  function applyHallOverride(m, ov) {
    if (!ov || !ov.grid || !ov.grid.length) return;

    // remember where the doors and stairwells were, with their wiring
    var tmplDoors = Object.keys(m.doors).map(function (k) {
      var xy = k.split(',');
      return { x: +xy[0], y: +xy[1], meta: m.doors[k] };
    });
    var tmplStairs = Object.keys(m.stairs).map(function (k) {
      var xy = k.split(',');
      return { x: +xy[0], y: +xy[1], type: m.get(+xy[0], +xy[1]), meta: m.stairs[k] };
    });

    m.w = ov.w;
    m.h = ov.h;
    m.grid = ov.grid.map(function (row) { return row.slice(); });
    m.get = function (x, y) {
      return (x >= 0 && x < m.w && y >= 0 && y < m.h) ? m.grid[y][x] : 'void';
    };
    m.set = function (x, y, t) {
      if (x >= 0 && x < m.w && y >= 0 && y < m.h) m.grid[y][x] = t;
    };

    function scan(types) {
      var out = [];
      for (var y = 0; y < m.h; y++) {
        for (var x = 0; x < m.w; x++) {
          if (types.indexOf(m.grid[y][x]) >= 0) out.push({ x: x, y: y });
        }
      }
      return out;
    }
    function rewire(found, tmpl, store, restore) {
      if (!found.length) {
        // never orphan the building: put the originals back
        tmpl.forEach(function (t) {
          restore(t);
          store[t.x + ',' + t.y] = t.meta;
        });
        return;
      }
      var used = {};
      tmpl.forEach(function (t) {
        var best = -1, bd = Infinity;
        found.forEach(function (f, j) {
          if (used[j]) return;
          var d = (f.x - t.x) * (f.x - t.x) + (f.y - t.y) * (f.y - t.y);
          if (d < bd) { bd = d; best = j; }
        });
        if (best >= 0) {
          used[best] = 1;
          store[found[best].x + ',' + found[best].y] = t.meta;
        }
      });
    }

    var custom = ov.doorTargets || {};
    m.doors = {};
    // THE PAINTED MAP IS THE PLAN: template doors come back only if the hall
    // has NO doors at all (a truly empty map). Pinned (custom) doors count as
    // doors, so they never trigger a phantom restore.
    var paintedDoors = scan(['door']);
    if (!paintedDoors.length) {
      tmplDoors.forEach(function (t) {
        m.set(t.x, t.y, 'door');
        m.doors[t.x + ',' + t.y] = t.meta;
      });
    } else {
      var pool = paintedDoors.filter(function (f) { return !custom[f.x + ',' + f.y]; });
      var usedD = {};
      tmplDoors.forEach(function (t) {
        var best = -1, bd = Infinity;
        pool.forEach(function (f, j) {
          if (usedD[j]) return;
          var d = (f.x - t.x) * (f.x - t.x) + (f.y - t.y) * (f.y - t.y);
          if (d < bd) { bd = d; best = j; }
        });
        if (best >= 0) {
          usedD[best] = 1;
          m.doors[pool[best].x + ',' + pool[best].y] = t.meta;
        }
      });
    }
    m.stairs = {};
    rewire(scan(['stairU', 'stairD']), tmplStairs, m.stairs, function (t) { m.set(t.x, t.y, t.type); });
    // custom-destination doors
    Object.keys(custom).forEach(function (k) {
      var xy = k.split(',');
      var t = m.get(+xy[0], +xy[1]);
      if (t === 'door' || t === 'mat') {
        delete m.doors[k];
        m.stairs[k] = { goRoom: custom[k] };
      }
    });
  }

  // ---- assembly -----------------------------------------------------------
  function neighborWalkable(m, x, y) {
    var dirs = [[0, 1, 'down'], [0, -1, 'up'], [-1, 0, 'left'], [1, 0, 'right']];
    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      var t = m.get(x + d[0], y + d[1]);
      if (T.isWalkable(t) && t !== 'door' && t !== 'mat') {
        return { x: x + d[0], y: y + d[1], dir: d[2] };
      }
    }
    return null;
  }

  function registerCustomRooms() {
    // rooms invented in the editor (baked file + this browser)
    var customs = {};
    Object.keys(G.CUSTOM_ROOMS || {}).forEach(function (k) { customs[k] = G.CUSTOM_ROOMS[k]; });
    try {
      var local = JSON.parse(localStorage.getItem('ashland-custom-rooms') || '{}');
      Object.keys(local).forEach(function (k) {
        if (local[k]) customs[k] = local[k];
        else delete customs[k]; // null tombstone: deleted in the editor
      });
    } catch (e) {}
    Object.keys(customs).forEach(function (id) {
      var c = customs[id];
      if (!c) return; // deleted room tombstone
      if (!G.ROOMS[id]) {
        G.ROOMS[id] = { id: id, name: c.name || 'NEW ROOM', interior: 'classroom', floor: c.floor || 'middle' };
      } else {
        G.ROOMS[id].name = c.name || G.ROOMS[id].name;
        G.ROOMS[id].floor = c.floor || G.ROOMS[id].floor;
      }
      if (G.addCustomTeacher) G.addCustomTeacher(id, c.teacherName);
    });
  }

  function build() {
    registerCustomRooms();
    var maps = {};
    maps.middle = buildMiddle();
    maps.top = buildTop();
    maps.basement = buildBasement();

    var overrides = loadOverrides();
    applyHallOverride(maps.middle, overrides.middle);
    applyHallOverride(maps.top, overrides.top);
    applyHallOverride(maps.basement, overrides.basement);
    // older saves painted the court with tiles - the vector court replaces them
    (function (m) {
      var legacy = { gymlineH: 1, gymlineV: 1, gymkey: 1, gymcirTL: 1, gymcirTR: 1, gymcirBL: 1, gymcirBR: 1 };
      for (var y = 0; y < m.h; y++) {
        for (var x = 0; x < m.w; x++) {
          if (legacy[m.grid[y][x]]) m.grid[y][x] = 'gymfloor';
        }
      }
    })(maps.basement);
    // every painted door and stair on a hallway must DO something:
    // - stairs with no wiring become a floor-picker for the other floors
    // - doors with no wiring pass through the wall if there's floor on the
    //   other side, otherwise they lead to the nearest room on the hall
    ['middle', 'top', 'basement'].forEach(function (mid) {
      var m = maps[mid];
      var others = {
        middle: [DEST.top, DEST.basement],
        top: [DEST.middle, DEST.basement],
        basement: [DEST.middle, DEST.top]
      }[mid];
      for (var y = 0; y < m.h; y++) {
        for (var x = 0; x < m.w; x++) {
          var t = m.grid[y][x];
          var key = x + ',' + y;
          if ((t === 'stairU' || t === 'stairD') && !m.stairs[key]) {
            m.stairs[key] = { options: others };
          }
          if (t === 'door' && !m.doors[key] && !m.stairs[key]) {
            // which side does the player approach from?
            var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            var wired = false;
            for (var d = 0; d < dirs.length && !wired; d++) {
              var ax = x + dirs[d][0], ay = y + dirs[d][1];
              if (!T.isWalkable(m.get(ax, ay))) continue;
              // pass through the wall: first open tile on the far side
              for (var step = 1; step <= 4; step++) {
                var px2 = x - dirs[d][0] * step, py2 = y - dirs[d][1] * step;
                var pt = m.get(px2, py2);
                if (T.isWalkable(pt) && pt !== 'door' && pt !== 'mat' && pt !== 'stairU' && pt !== 'stairD') {
                  m.stairs[key] = { passTo: { x: px2, y: py2 } };
                  wired = true;
                  break;
                }
              }
            }
            if (!wired) {
              // no floor behind it: lead to the closest room on this hall
              var bestRoom = null, bd = Infinity;
              Object.keys(m.doors).forEach(function (dk) {
                var xy = dk.split(',');
                var dd = (x - xy[0]) * (x - xy[0]) + (y - xy[1]) * (y - xy[1]);
                if (dd < bd) { bd = dd; bestRoom = m.doors[dk].roomId; }
              });
              if (bestRoom) m.stairs[key] = { goRoom: bestRoom };
            }
          }
        }
      }
    });

    Object.keys(G.ROOMS).forEach(function (id) {
      var room = G.ROOMS[id];
      if (room.noInterior) return; // e.g. the gym lives on the basement map itself
      maps[id] = INTERIOR_BUILDERS[room.interior](room);
      maps[id].name = room.name;
      maps[id].isHall = false;
      applyOverride(maps[id], overrides[id], id);
    });

    // room 233 is team-taught: Mrs. Songstad joins Mrs. Patel in there
    if (maps['t-233'] && G.TEACHERS['t-233b']) {
      maps['t-233'].npcs.push({ kind: 'teacher', roomId: 't-233b', x: 10, y: 7 });
    }

    // ---- support staff: custodians, aides and helpers ---------------------
    // opts: {x, y} preferred tile (nudged to the nearest open one), or omit
    // for a random open tile; {zone} limits where random picks may land
    function placeStaff(m, id, opts) {
      if (!m || !G.TEACHERS[id]) return;
      opts = opts || {};
      function ok(x, y) {
        var t2 = m.get(x, y);
        if (!T.isWalkable(t2) || t2 === 'mat' || t2 === 'door' || t2 === 'stairU' || t2 === 'stairD') return false;
        if (opts.zone && !opts.zone(x, y, t2)) return false;
        for (var i = 0; i < m.npcs.length; i++) {
          if (m.npcs[i].x === x && m.npcs[i].y === y) return false;
        }
        return true;
      }
      var sx = opts.x, sy = opts.y;
      if (sx === undefined) {
        // a random spot: custodians start somewhere new every day
        for (var tries = 0; tries < 500 && sx === undefined; tries++) {
          var rx = 1 + Math.floor(Math.random() * (m.w - 2));
          var ry = 1 + Math.floor(Math.random() * (m.h - 2));
          if (ok(rx, ry)) { sx = rx; sy = ry; }
        }
      } else if (!ok(sx, sy)) {
        var found = false;
        for (var r = 1; r < Math.max(m.w, m.h) && !found; r++) {
          for (var dy = -r; dy <= r && !found; dy++) {
            for (var dx = -r; dx <= r && !found; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              if (ok(sx + dx, sy + dy)) { sx += dx; sy += dy; found = true; }
            }
          }
        }
        if (!found) return;
      }
      if (sx !== undefined) m.npcs.push({ kind: 'teacher', roomId: id, x: sx, y: sy });
    }

    var inGym = function (x, y, t2) { return x >= 23 && t2 === 'gymfloor'; };
    placeStaff(maps.top, 'staff-mellow');                     // roams the top floor
    placeStaff(maps['m-caf'], 'staff-rampulla', { x: 4, y: 10 });
    placeStaff(maps['m-caf'], 'staff-zimmerman', { x: 6, y: 15 });
    placeStaff(maps['m-caf'], 'staff-marsh', { x: 2, y: 15 });
    // the kitchen crew works behind the serving counter
    placeStaff(maps['m-caf'], 'staff-haskins', { x: 11, y: 2 });
    placeStaff(maps['m-caf'], 'staff-taylor', { x: 11, y: 4 });
    placeStaff(maps['m-caf'], 'staff-martin', { x: 11, y: 6 });
    placeStaff(maps.basement, 'staff-perry', { zone: inGym });   // cleaning the gym
    placeStaff(maps.basement, 'staff-jackson', { zone: inGym });
    placeStaff(maps.basement, 'staff-elshaarawy', { zone: inGym });
    placeStaff(maps['t-lib'], 'staff-murt', { x: 10, y: 10 });
    placeStaff(maps['t-lib'], 'staff-seivers', { x: 16, y: 10 });
    placeStaff(maps['t-lib'], 'staff-shadler', { x: 4, y: 9 });
    placeStaff(maps['t-234'], 'staff-farmer', { x: 9, y: 4 });
    placeStaff(maps['t-224'], 'staff-garcia', { x: 9, y: 6 });
    placeStaff(maps['custom-2'], 'staff-helton', { x: 7, y: 5 });

    // if a teacher's start tile is buried under furniture (template says the
    // middle of the room, but edited rooms vary), nudge them to the nearest
    // open tile
    Object.keys(G.ROOMS).forEach(function (id) {
      var im = maps[id];
      if (!im) return;
      im.npcs.forEach(function (n) {
        var ok = function (x, y) {
          var t = im.get(x, y);
          return T.isWalkable(t) && t !== 'mat' && t !== 'door' && t !== 'stairU' && t !== 'stairD';
        };
        if (ok(n.x, n.y)) return;
        for (var r = 1; r < Math.max(im.w, im.h); r++) {
          for (var dy = -r; dy <= r; dy++) {
            for (var dx = -r; dx <= r; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              if (ok(n.x + dx, n.y + dy)) { n.x += dx; n.y += dy; return; }
            }
          }
        }
      });
    });

    // Officer Garth, our friendly school resource officer, hangs out in the
    // front office with Mrs. Coleman. Placed on an open tile so he fits any
    // edited layout.
    (function (m) {
      if (!m) return;
      var anchor = m.npcs[0] || { x: Math.floor(m.w / 2), y: Math.floor(m.h / 2) };
      var spot = null, bd = Infinity;
      for (var y = 1; y < m.h - 1; y++) {
        for (var x = 1; x < m.w - 1; x++) {
          var t = m.get(x, y);
          if (!T.isWalkable(t) || t === 'mat' || t === 'door' || t === 'stairU' || t === 'stairD') continue;
          if (x === anchor.x && y === anchor.y) continue;
          var d = (x - anchor.x) * (x - anchor.x) + (y - anchor.y) * (y - anchor.y);
          // at least a couple tiles from Mrs. Coleman so they don't stack
          if (d >= 4 && d < bd) { bd = d; spot = { x: x, y: y }; }
        }
      }
      if (spot) m.npcs.push({ kind: 'officer', x: spot.x, y: spot.y });
    })(maps['m-front']);

    // pair hallway doors with interior exits
    var returns = {}; // roomId:exitIndex -> where you pop out in the hallway
    var entries = {}; // roomId:exitIndex -> where you appear inside the room
    ['middle', 'top', 'basement'].forEach(function (mid) {
      var m = maps[mid];
      Object.keys(m.doors).forEach(function (key) {
        var d = m.doors[key];
        var xy = key.split(',');
        var x = +xy[0], y = +xy[1];
        var out = neighborWalkable(m, x, y);
        var rk = d.roomId + ':' + d.exitIndex;
        if (out && !returns[rk]) {
          returns[rk] = { map: mid, x: out.x, y: out.y, dir: out.dir };
        }
      });
    });
    Object.keys(G.ROOMS).forEach(function (id) {
      var im = maps[id];
      if (!im) return;
      im.exitList.forEach(function (e, idx) {
        var inn = neighborWalkable(im, e.x, e.y);
        if (inn) entries[id + ':' + idx] = { map: id, x: inn.x, y: inn.y, dir: inn.dir };
        im.stairs[e.x + ',' + e.y] = { exit: true, roomId: id, exitIndex: idx };
      });
      // every tile of a multi-tile doorway shares the same exit number
      Object.keys(im._exitClusters || {}).forEach(function (cidx) {
        im._exitClusters[cidx].forEach(function (t) {
          im.stairs[t[0] + ',' + t[1]] = { exit: true, roomId: id, exitIndex: +cidx };
        });
      });
      // custom rooms may only have custom-destination doors - still need a way in
      if (!entries[id + ':0']) {
        outer:
        for (var y = 0; y < im.h; y++) {
          for (var x = 0; x < im.w; x++) {
            if (im.grid[y][x] === 'mat') {
              var inn2 = neighborWalkable(im, x, y);
              if (inn2) { entries[id + ':0'] = { map: id, x: inn2.x, y: inn2.y, dir: inn2.dir }; break outer; }
            }
          }
        }
      }
      // still nothing? (stairs-only rooms like Dance & Drama that get pointed
      // at by a custom door) - land just inside the room's own exit (its
      // painted _back door or stairs), or failing that any open tile
      if (!entries[id + ':0']) {
        var best = null;
        Object.keys(im.stairs).forEach(function (sk) {
          if (best) return;
          var sxy = sk.split(',');
          var inn3 = neighborWalkable(im, +sxy[0], +sxy[1]);
          if (inn3) best = { map: id, x: inn3.x, y: inn3.y, dir: inn3.dir };
        });
        for (var fy2 = 0; fy2 < im.h && !best; fy2++) {
          for (var fx2 = 0; fx2 < im.w && !best; fx2++) {
            var ft2 = im.grid[fy2][fx2];
            if (T.isWalkable(ft2) && ft2 !== 'mat' && ft2 !== 'door' && ft2 !== 'stairU' && ft2 !== 'stairD') {
              best = { map: id, x: fx2, y: fy2, dir: 'down' };
            }
          }
        }
        if (best) entries[id + ':0'] = best;
      }
    });

    // custom-linked doors (goRoom) get proper PAIRING: each cluster of
    // adjacent door tiles claims one of the room's entrances, so going in
    // door 2 puts you at mat 2, and mat 2 brings you back out of door 2
    ['middle', 'top', 'basement'].forEach(function (mid) {
      var hm = maps[mid];
      var clusters = {};
      Object.keys(hm.stairs).forEach(function (k) {
        var st = hm.stairs[k];
        if (!st.goRoom || !G.ROOMS[st.goRoom]) return;
        if (maps[st.goRoom] && maps[st.goRoom].isHall) return;
        var xy = k.split(',');
        var x = +xy[0], y = +xy[1];
        var list = clusters[st.goRoom] = clusters[st.goRoom] || [];
        var hit = null;
        for (var ci = 0; ci < list.length && !hit; ci++) {
          if (list[ci].tiles.some(function (t) { return Math.abs(t[0] - x) + Math.abs(t[1] - y) <= 2; })) hit = list[ci];
        }
        if (hit) hit.tiles.push([x, y]);
        else list.push({ tiles: [[x, y]] });
      });
      Object.keys(clusters).forEach(function (rid) {
        var avail = Object.keys(entries)
          .filter(function (k) { return k.indexOf(rid + ':') === 0; })
          .map(function (k) { return +k.split(':')[1]; })
          .sort(function (a, b) { return a - b; });
        var taken = {};
        Object.keys(returns).forEach(function (k) {
          if (k.indexOf(rid + ':') === 0) taken[+k.split(':')[1]] = 1;
        });
        clusters[rid].sort(function (a, b) {
          return (a.tiles[0][1] - b.tiles[0][1]) || (a.tiles[0][0] - b.tiles[0][0]);
        });
        clusters[rid].forEach(function (c) {
          var idx;
          for (var ai = 0; ai < avail.length; ai++) {
            if (!taken[avail[ai]]) { idx = avail[ai]; break; }
          }
          if (idx === undefined) idx = avail.length ? avail[0] : 0;
          taken[idx] = 1;
          c.tiles.forEach(function (t) {
            hm.stairs[t[0] + ',' + t[1]].pairIndex = idx;
          });
          if (!returns[rid + ':' + idx]) {
            var out = neighborWalkable(hm, c.tiles[0][0], c.tiles[0][1]);
            if (out) returns[rid + ':' + idx] = { map: mid, x: out.x, y: out.y, dir: out.dir };
          }
        });
      });
    });

    G.Maps = { all: maps, returns: returns, entries: entries };
  }

  G.buildMaps = build;

  // ---- the basketball court, drawn as real court lines --------------------
  // (tile art can't do smooth arcs; this draws over the basement's gym floor)
  // geometry is in TILE units x scale, so the game (16px) and editor (32px)
  // render the identical court
  G.drawCourtLines = function (ctx, s) {
    function X(v) { return v * s; }
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // shaded lanes (the "paint")
    ctx.fillStyle = 'rgba(96, 64, 28, 0.30)';
    ctx.fillRect(X(22), X(15.5), X(5), X(6));
    ctx.fillRect(X(39), X(15.5), X(5), X(6));

    ctx.strokeStyle = 'rgba(248, 245, 235, 0.95)';
    ctx.lineWidth = Math.max(2, Math.round(s / 10));

    // boundary
    ctx.strokeRect(X(22), X(12), X(22), X(13));
    // half-court line + center circle
    ctx.beginPath(); ctx.moveTo(X(33), X(12)); ctx.lineTo(X(33), X(25)); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(33), X(18.5), X(1.8), 0, Math.PI * 2); ctx.stroke();
    // keys
    ctx.strokeRect(X(22), X(15.5), X(5), X(6));
    ctx.strokeRect(X(39), X(15.5), X(5), X(6));
    // free-throw circles
    ctx.beginPath(); ctx.arc(X(27), X(18.5), X(1.8), 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(39), X(18.5), X(1.8), 0, Math.PI * 2); ctx.stroke();
    // three-point arcs (with the short straight bits at the baselines)
    var a = 1.25, r = 6.8;
    var ey = 6.8 * Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(X(22), X(18.5 - ey));
    ctx.arc(X(22.4), X(18.5), X(r), -a, a);
    ctx.lineTo(X(22), X(18.5 + ey));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(44), X(18.5 + ey));
    ctx.arc(X(43.6), X(18.5), X(r), Math.PI - a, Math.PI + a);
    ctx.lineTo(X(44), X(18.5 - ey));
    ctx.stroke();
    // lane hash marks
    ctx.lineWidth = Math.max(1, Math.round(s / 14));
    [23.6, 24.6, 25.6].forEach(function (hx) {
      [hx, 66 - hx].forEach(function (x) {
        ctx.beginPath(); ctx.moveTo(X(x), X(15.1)); ctx.lineTo(X(x), X(15.5)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X(x), X(21.5)); ctx.lineTo(X(x), X(21.9)); ctx.stroke();
      });
    });
    ctx.restore();
  };
})();
