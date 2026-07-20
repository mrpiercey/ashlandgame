/* Ashland Elementary 26/27 - door/name sign engine.
 * Shared by the game (js/main.js) and the editors. */
var G = window.G = window.G || {};

(function () {
  var TS = 16;
  var eagle = null;
  function eagleSpr() { return eagle || (eagle = G.Sprites.eagle()); }

  // ---- teacher name signs mounted on the wall at every door ---------------
  // horizontal above top/bottom doors, vertical alongside side doors,
  // drawn with the tiny pixel font so neighboring signs never collide
  var signCache = {};

  function signLabel(roomId) {
    var t = G.TEACHERS[roomId];
    if (t) return (t.co ? t.name + ' & ' + t.co : t.name).toUpperCase();
    // rooms without a teacher (like the PLC Room) show their short room name
    var parts = G.ROOMS[roomId].name.split(' - ');
    return parts[parts.length - 1].toUpperCase();
  }

  // orient: 'h' icon-left | 'hf' icon-right (flipped) |
  //         'v' reads bottom-to-top | 'vf' reads top-to-bottom (flipped)
  function getSign(roomId, orient) {
    orient = orient || 'h';
    var key = roomId + ':' + orient;
    if (signCache[key]) return signCache[key];

    var flipped = orient === 'hf';
    var label = signLabel(roomId);
    var w = 17 + label.length * 4 + 2;
    var h = 16;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#1f2a5e';                 // navy frame
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#f4f4ee';                 // white banner
    x.fillRect(1, 1, w - 2, h - 2);
    x.fillStyle = '#1f7a4d';                 // green header band
    x.fillRect(1, 1, w - 2, 4);
    x.fillStyle = '#2e9a63';
    x.fillRect(1, 4, w - 2, 1);
    x.fillStyle = '#1f2a5e';                 // navy stripe near the bottom
    x.fillRect(1, h - 4, w - 2, 2);
    // eagle badge (left normally, right when flipped)
    var bx = flipped ? w - 14 : 2;
    x.fillStyle = '#1f2a5e';
    x.fillRect(bx, 2, 12, 12);
    x.fillStyle = '#f4f4ee';
    x.fillRect(bx + 1, 3, 10, 10);
    x.drawImage(eagleSpr(), 3, 1, 10, 7, bx + 2, 5, 8, 7);
    // teacher name
    G.Tiles.drawTinyText(x, label, flipped ? 3 : 16, 7, '#1f2a5e', 1);

    if (orient === 'v' || orient === 'vf') {
      // run the sign up the wall; 'v' reads bottom-to-top, 'vf' top-to-bottom
      var vc = document.createElement('canvas');
      vc.width = h; vc.height = w;
      var vx = vc.getContext('2d');
      vx.imageSmoothingEnabled = false;
      if (orient === 'v') {
        vx.translate(0, w);
        vx.rotate(-Math.PI / 2);
      } else {
        vx.translate(h, 0);
        vx.rotate(Math.PI / 2);
      }
      vx.drawImage(c, 0, 0);
      c = vc;
    }
    return (signCache[key] = c);
  }

  function signGroups(m) {
    if (m._signGroups) return m._signGroups;
    // collect every door-ish tile that deserves a sign
    var raw = [];
    Object.keys(m.doors).forEach(function (key) {
      var xy = key.split(',');
      raw.push({ roomId: m.doors[key].roomId, tiles: [[+xy[0], +xy[1]]] });
    });
    (m.extraSigns || []).forEach(function (s) {
      raw.push({ roomId: s.roomId, tiles: s.tiles.map(function (t) { return t.slice(); }) });
    });
    Object.keys(m.stairs).forEach(function (key) {
      var st = m.stairs[key];
      if (!st.goRoom || !G.TEACHERS[st.goRoom]) return;
      var xy = key.split(',');
      raw.push({ roomId: st.goRoom, tiles: [[+xy[0], +xy[1]]] });
    });

    // ONE sign per room per area: merge same-room groups within 4 tiles
    function closeTo(a, b) {
      for (var i = 0; i < a.length; i++) {
        for (var j = 0; j < b.length; j++) {
          if (Math.abs(a[i][0] - b[j][0]) <= 4 && Math.abs(a[i][1] - b[j][1]) <= 4) return true;
        }
      }
      return false;
    }
    var list = [];
    raw.forEach(function (g) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].roomId === g.roomId && closeTo(list[i].tiles, g.tiles)) {
          g.tiles.forEach(function (t) {
            var dup = list[i].tiles.some(function (h) { return h[0] === t[0] && h[1] === t[1]; });
            if (!dup) list[i].tiles.push(t);
          });
          return;
        }
      }
      list.push({ roomId: g.roomId, tiles: g.tiles });
    });

    // stable key per sign: rooms with several sign groups (like the caf's
    // two door clusters) get roomId#0, roomId#1... so each can be edited alone
    var totals = {}, seen = {};
    list.forEach(function (g) { totals[g.roomId] = (totals[g.roomId] || 0) + 1; });
    list.forEach(function (g) {
      var n = seen[g.roomId] = (seen[g.roomId] || 0);
      seen[g.roomId]++;
      g.key = totals[g.roomId] > 1 ? g.roomId + '#' + n : g.roomId;
    });

    // orientation from the actual wall: which side of the door is hallway?
    list.forEach(function (g) {
      var t0 = g.tiles[0];
      var walk = function (x, y) { return G.Tiles.isWalkable(m.get(x, y)); };
      g.dir = walk(t0[0], t0[1] + 1) ? 'down'   // hall below: north wall
        : walk(t0[0], t0[1] - 1) ? 'up'         // hall above: south wall
        : walk(t0[0] + 1, t0[1]) ? 'right'      // hall right: west wall
        : 'left';
    });
    return (m._signGroups = list);
  }

  // does the wall row have room for a sign here? (nothing walkable under it)
  function wallRun(m, tx, ty, dirStep, tilesNeeded) {
    for (var i = 1; i <= tilesNeeded; i++) {
      if (G.Tiles.isWalkable(m.get(tx + dirStep * i, ty))) return false;
    }
    return true;
  }

  // baked file + this browser's working copy from signeditor.html
  function signOverrides() {
    var baked = G.SIGN_OVERRIDES || {};
    var local = {};
    try { local = JSON.parse(localStorage.getItem('ashland-sign-overrides') || '{}'); } catch (e) {}
    var merged = {};
    [baked, local].forEach(function (src) {
      Object.keys(src).forEach(function (mapId) {
        merged[mapId] = merged[mapId] || {};
        Object.keys(src[mapId]).forEach(function (roomId) {
          if (src[mapId][roomId]) merged[mapId][roomId] = src[mapId][roomId];
          else delete merged[mapId][roomId];   // null = reverted to auto
        });
      });
    });
    return merged;
  }

  function signLayout(m) {
    if (m._signLayout) return m._signLayout;
    var rects = [];
    signGroups(m).forEach(function (g) {
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      g.tiles.forEach(function (t) {
        minX = Math.min(minX, t[0]);
        maxX = Math.max(maxX, t[0]);
        minY = Math.min(minY, t[1]);
        maxY = Math.max(maxY, t[1]);
      });
      var sign, x, y;
      if (g.dir === 'left' || g.dir === 'right') {
        // side doors: sign on the wall column behind the door, centered on
        // it but clamped to the solid wall so it never hangs over the floor
        sign = getSign(g.roomId, 'v');
        var col = g.dir === 'right' ? minX - 1 : minX + 1;
        x = col * TS;
        y = Math.round((minY + maxY + 1) * TS / 2 - sign.height / 2);
        var top = minY, bot = maxY;
        while (top > 0 && !G.Tiles.isWalkable(m.get(col, top - 1))) top--;
        while (bot < m.h - 1 && !G.Tiles.isWalkable(m.get(col, bot + 1))) bot++;
        var runY0 = top * TS, runY1 = (bot + 1) * TS;
        if (runY1 - runY0 <= sign.height) {
          y = Math.round((runY0 + runY1) / 2 - sign.height / 2);
        } else {
          y = Math.max(runY0, Math.min(y, runY1 - sign.height));
        }
      } else if (g.dir === 'up') {
        // south wall: nameplate tucks under the door's bottom edge
        sign = getSign(g.roomId, 'h');
        x = Math.round((minX + maxX + 1) * TS / 2 - sign.width / 2);
        y = (maxY + 1) * TS - 3;
      } else {
        // north wall: nameplate mounted on the wall BESIDE the door
        // (right of it when the wall allows, else left), never split by it
        sign = getSign(g.roomId, 'h');
        y = Math.round(minY * TS + TS / 2 - sign.height / 2);
        var tilesNeeded = Math.ceil(sign.width / TS);
        if (wallRun(m, maxX, minY, 1, tilesNeeded)) {
          x = (maxX + 1) * TS - 2;
        } else if (wallRun(m, minX, minY, -1, tilesNeeded)) {
          x = minX * TS + 2 - sign.width;
        } else {
          x = Math.round((minX + maxX + 1) * TS / 2 - sign.width / 2);
          y = minY * TS - sign.height + 3;   // no room: hang it above instead
        }
      }
      var own = {};
      g.tiles.forEach(function (t) { own[t[0] + ',' + t[1]] = 1; });
      rects.push({
        sign: sign, x: x, y: y, w: sign.width, h: sign.height,
        axis: (g.dir === 'left' || g.dir === 'right') ? 'y' : 'x',
        dir: g.dir, own: own, roomId: g.roomId, key: g.key || g.roomId
      });
    });

    // wall decor AND other rooms' doors: signs slide off these instead of
    // hiding behind them (a sign may still tuck behind its OWN door)
    var obstacles = [];
    for (var oy2 = 0; oy2 < m.h; oy2++) {
      for (var ox2 = 0; ox2 < m.w; ox2++) {
        var ot = m.get(ox2, oy2);
        if (ot === 'wall' || ot === 'wallTop' || ot === 'voidwall' || ot === 'void') continue;
        var isDoorish = ot === 'door' || ot === 'stairU' || ot === 'stairD';
        if (G.Tiles.isWalkable(ot) && !isDoorish) continue;
        obstacles.push({ x: ox2 * TS, y: oy2 * TS, w: TS, h: TS, key: ox2 + ',' + oy2 });
      }
    }

    function overlap(a, b) {
      var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      var oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      return (ox > 0 && oy > 0) ? { x: ox, y: oy } : null;
    }

    // signs must never overlap each other (or decor): push them apart
    for (var pass = 0; pass < 10; pass++) {
      var moved = false;
      for (var i = 0; i < rects.length; i++) {
        for (var j = i + 1; j < rects.length; j++) {
          var a = rects[i], b = rects[j];
          var ov = overlap(a, b);
          if (!ov) continue;
          moved = true;
          if (ov.x <= ov.y) {
            var push = ov.x / 2 + 1;
            if (a.x < b.x) { a.x -= push; b.x += push; }
            else { a.x += push; b.x -= push; }
          } else {
            var pushY = ov.y / 2 + 1;
            if (a.y < b.y) { a.y -= pushY; b.y += pushY; }
            else { a.y += pushY; b.y -= pushY; }
          }
        }
        for (var k = 0; k < obstacles.length; k++) {
          var r = rects[i];
          if (r.own[obstacles[k].key]) continue;   // its own door is fine
          var ov2 = overlap(r, obstacles[k]);
          if (!ov2) continue;
          // only the sign moves, and only along its own wall
          if (r.axis === 'x' && ov2.x < r.w) {
            moved = true;
            r.x += (r.x + r.w / 2 < obstacles[k].x + TS / 2) ? -(ov2.x + 1) : (ov2.x + 1);
          } else if (r.axis === 'y' && ov2.y < r.h) {
            moved = true;
            r.y += (r.y + r.h / 2 < obstacles[k].y + TS / 2) ? -(ov2.y + 1) : (ov2.y + 1);
          }
        }
      }
      if (!moved) break;
    }
    // still pinned against decor on both sides? slide one row deeper onto
    // the wall where there's always open brick
    rects.forEach(function (r) {
      for (var k2 = 0; k2 < obstacles.length; k2++) {
        if (r.own[obstacles[k2].key]) continue;
        if (overlap(r, obstacles[k2])) {
          if (r.axis === 'x') r.y += (r.dir === 'up' ? TS : -TS);
          else r.x += (r.dir === 'right' ? -TS : TS);
          break;
        }
      }
    });
    rects.forEach(function (r) { r.x = Math.round(r.x); r.y = Math.round(r.y); });

    // hand-placed positions from the sign editor beat everything
    var ov = signOverrides()[m.id] || {};
    function ovFor(r) {
      var o = ov[r.key];
      // saved before multi-group keys existed? apply it to the first group
      if (!o && r.key !== r.roomId && /#0$/.test(r.key)) o = ov[r.roomId];
      return o;
    }
    // deleted signs are simply gone
    rects = rects.filter(function (r) {
      var o = ovFor(r);
      return !(o && o.hidden);
    });
    rects.forEach(function (r) {
      var o = ovFor(r);
      if (!o) return;
      if (o.text) {
        // door signs can be renamed in the editor
        r.sign = makeText(o.text, o.orient || (r.w >= r.h ? 'h' : 'v'));
        r.w = r.sign.width;
        r.h = r.sign.height;
      } else if (o.orient) {
        r.sign = getSign(r.roomId, o.orient);
        r.w = r.sign.width;
        r.h = r.sign.height;
      }
      r.x = o.x;
      r.y = o.y;
    });

    // free-standing custom signs created in the editor
    Object.keys(ov).forEach(function (key) {
      var o = ov[key];
      if (!o || !o.text) return;
      var sc = makeText(o.text, o.orient || 'h');
      rects.push({ sign: sc, x: o.x, y: o.y, w: sc.width, h: sc.height,
        axis: 'x', dir: 'down', own: {}, roomId: key, key: key, custom: true });
    });
    return (m._signLayout = rects);
  }


  // custom free-standing signs made in the editor: {text, x, y, orient}
  function makeText(text, orient) {
    orient = orient || 'h';
    var key = 'txt:' + text + ':' + orient;
    if (signCache[key]) return signCache[key];
    var real = signLabel;
    signLabel = function () { return text.toUpperCase(); };
    var c;
    try {
      c = getSign('__custom__' + text, orient);
    } finally {
      signLabel = real;
    }
    return (signCache[key] = c);
  }

  G.Signs = {
    label: signLabel,
    get: getSign,
    makeText: makeText,
    layout: signLayout,
    overrides: signOverrides,
    clearCache: function () { signCache = {}; },
    invalidate: function () {
      if (G.Maps && G.Maps.all) {
        Object.keys(G.Maps.all).forEach(function (id) { delete G.Maps.all[id]._signLayout; });
      }
    }
  };
})();
