/* Ashland Elementary 26/27 - keyboard + touch input */
var G = window.G = window.G || {};

(function () {
  var held = { up: false, down: false, left: false, right: false, run: false };
  var actionPressed = false;   // edge-triggered
  var danceKey = null;         // last number key pressed (0-9), for party dance moves
  var typedBuffer = '';        // recent letter keys, for secret codes (e.g. hdd)
  var rosterKey = false;       // edge-triggered: TAB opens/closes the staff roster
  var dirPressed = { up: false, down: false, left: false, right: false }; // edge, for menus

  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };

  // every secret code the game listens for; a mute key pressed while one of
  // these is being spelled out is a LETTER, not a volume control
  var CODES = ['hdd', 'link', 'zelda', 'error', 'supermario', 'mahjong'];
  function partOfCode(ch) {
    var t = typedBuffer + ch;
    for (var i = 0; i < CODES.length; i++) {
      var c = CODES[i];
      for (var n = Math.min(c.length, t.length); n >= 2; n--) {
        if (t.slice(-n) === c.slice(0, n)) return true;
      }
    }
    return false;
  }

  // "mahjong" STARTS with the mute key, and one lone M can't say whether it
  // is volume control or the first letter of the code. So an M that might
  // open a code waits a moment: the next letter tells us ("ma..." keeps
  // spelling, anything else -- or silence -- means it really was the mute).
  var pendingMute = null;
  function muteMaybeCode() {
    var opensCode = CODES.some(function (c) { return c[0] === 'm'; });
    if (!opensCode) { G.Audio.toggleMute(); return; }
    if (pendingMute) { clearTimeout(pendingMute); G.Audio.toggleMute(); } // M M: the first one pays up
    pendingMute = setTimeout(function () {
      pendingMute = null;
      G.Audio.toggleMute();
    }, 650);
  }
  function settlePendingMute() {
    if (!pendingMute) return;
    clearTimeout(pendingMute);
    pendingMute = null;
    var t2 = typedBuffer.slice(-2);
    var spelling = CODES.some(function (c) { return c[0] === 'm' && c.slice(0, 2) === t2; });
    if (!spelling) G.Audio.toggleMute();   // it was the mute button after all
  }

  function press(dir) {
    if (!held[dir]) dirPressed[dir] = true;
    held[dir] = true;
  }
  function release(dir) { held[dir] = false; }

  // keys that keep their special jobs (or belong to the browser) and
  // therefore never count as the interact button
  var NOT_ACTION = {
    ShiftLeft: 1, ShiftRight: 1, KeyX: 1,        // run
    KeyM: 1,                                     // music on/off
    KeyF: 1,                                     // sound effects on/off
    ControlLeft: 1, ControlRight: 1, AltLeft: 1, AltRight: 1,
    MetaLeft: 1, MetaRight: 1, OSLeft: 1, OSRight: 1,
    Tab: 1, CapsLock: 1, ContextMenu: 1, NumLock: 1, ScrollLock: 1,
    PrintScreen: 1, Pause: 1, Insert: 1,
    PageUp: 1, PageDown: 1, Home: 1, End: 1
  };

  window.addEventListener('keydown', function (e) {
    if (e.repeat) {
      if (KEYMAP[e.code]) e.preventDefault();
      return;
    }
    var d = KEYMAP[e.code];
    if (d) { press(d); e.preventDefault(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') held.run = true;
    // M mutes and F flips the sound effects -- but NOT while the letter is
    // part of a secret code mid-type ("superM..." must not kill the music)
    if (e.code === 'KeyM' && !partOfCode('m')) muteMaybeCode();
    if (e.code === 'KeyF' && !partOfCode('f')) G.Audio.toggleSfx();
    // TAB pulls up the ASHLAND STAFF roster (and puts it away again).
    // preventDefault matters twice over: TAB would otherwise walk the
    // browser's focus ring off the canvas and the game would go deaf.
    if (e.code === 'Tab') { rosterKey = true; e.preventDefault(); }
    // number keys drive the party dance moves (main.js only acts on them
    // during the celebration; they still double as "advance" elsewhere)
    var dm = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
    if (dm) danceKey = parseInt(dm[1], 10);
    // remember the last few letters typed, for secret codes like "hdd"
    // (12 letters of memory: "supermario" is the longest code)
    var lm = /^Key([A-Z])$/.exec(e.code);
    if (lm) {
      typedBuffer = (typedBuffer + lm[1].toLowerCase()).slice(-12);
      if (e.code !== 'KeyM') settlePendingMute();
    }
    // any other key is the interact button (space, enter, letters --
    // whatever a kid mashes) as long as the browser isn't using it
    if (!d && !NOT_ACTION[e.code] && !/^F\d+$/.test(e.code) &&
        !e.metaKey && !e.ctrlKey && !e.altKey) {
      actionPressed = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', function (e) {
    var d = KEYMAP[e.code];
    if (d) release(d);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') held.run = false;
  });

  // touch controls
  function bindTouch() {
    var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches);
    if (!isTouch) return;
    document.body.classList.add('touch');

    // ---- keep iOS Safari from zooming the game ----------------------------
    // Safari ignores the page's user-scalable=no, and older versions ignore
    // touch-action too. Two guards that work everywhere:
    // 1) a second tap right after the first is Safari's zoom gesture -- and
    //    picking a student or an option is exactly two quick taps.
    var lastTapEnd = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - lastTapEnd <= 350 && e.cancelable) e.preventDefault();
      lastTapEnd = now;
    }, { passive: false });
    // 2) pinch, which Safari reports through its own gesture events. A
    //    fixed-size game has nothing useful to zoom into, and letting it
    //    happen is what left students stranded at 1.4x with no way back.
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
    });

    // The pad reads the finger's POSITION, not which button it landed on, so
    // you can slide from left to up to right without lifting off. Buttons
    // still light up individually -- that is just :active on the one under
    // the finger, which we set by hand since the touch belongs to the pad.
    var pad = document.getElementById('dpad');
    var btns = {
      up: document.getElementById('d-up'), down: document.getElementById('d-down'),
      left: document.getElementById('d-left'), right: document.getElementById('d-right')
    };
    var padTouch = null; // the finger currently driving the pad

    function padDir(clientX, clientY) {
      var r = pad.getBoundingClientRect();
      var dx = clientX - (r.left + r.width / 2);
      var dy = clientY - (r.top + r.height / 2);
      // a small dead zone in the middle so a resting thumb doesn't twitch
      if (dx * dx + dy * dy < (r.width * 0.16) * (r.width * 0.16)) return null;
      return Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
    }

    function padSet(dir) {
      ['up', 'down', 'left', 'right'].forEach(function (d) {
        if (d === dir) { press(d); } else { release(d); }
        if (btns[d]) btns[d].classList.toggle('pressed', d === dir);
      });
    }
    function padClear() {
      padTouch = null;
      ['up', 'down', 'left', 'right'].forEach(function (d) {
        release(d);
        if (btns[d]) btns[d].classList.remove('pressed');
      });
    }

    pad.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      padTouch = e.pointerId;
      if (pad.setPointerCapture) { try { pad.setPointerCapture(e.pointerId); } catch (err) {} }
      padSet(padDir(e.clientX, e.clientY));
    }, { passive: false });

    pad.addEventListener('pointermove', function (e) {
      if (padTouch === null || e.pointerId !== padTouch) return;
      e.preventDefault();
      padSet(padDir(e.clientX, e.clientY));
    }, { passive: false });

    ['pointerup', 'pointercancel'].forEach(function (ev) {
      pad.addEventListener(ev, function (e) {
        if (padTouch !== null && e.pointerId !== padTouch) return;
        e.preventDefault();
        padClear();
      }, { passive: false });
    });
    // a finger that slips off the pad entirely should stop the player
    window.addEventListener('pointerup', function () { if (padTouch !== null) padClear(); });
    var a = document.getElementById('a-btn');
    ['pointerdown', 'touchstart'].forEach(function (ev) {
      a.addEventListener(ev, function (e) { e.preventDefault(); actionPressed = true; }, { passive: false });
    });
  }

  G.Input = {
    held: held,
    init: bindTouch,
    consumeAction: function () {
      var v = actionPressed;
      actionPressed = false;
      return v;
    },
    pressAction: function () { actionPressed = true; },
    peekAction: function () { return actionPressed; },
    consumeRosterKey: function () { var v = rosterKey; rosterKey = false; return v; },
    consumeDanceKey: function () { var v = danceKey; danceKey = null; return v; },
    recentTyped: function () { return typedBuffer; },
    clearTyped: function () { typedBuffer = ''; },
    consumeDir: function (dir) {
      var v = dirPressed[dir];
      dirPressed[dir] = false;
      return v;
    },
    clearEdges: function () {
      actionPressed = false;
      rosterKey = false;
      dirPressed.up = dirPressed.down = dirPressed.left = dirPressed.right = false;
    }
  };
})();
