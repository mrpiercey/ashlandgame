/* Ashland Elementary 26/27 - keyboard + touch input */
var G = window.G = window.G || {};

(function () {
  var held = { up: false, down: false, left: false, right: false, run: false };
  var actionPressed = false;   // edge-triggered
  var dirPressed = { up: false, down: false, left: false, right: false }; // edge, for menus

  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };

  function press(dir) {
    if (!held[dir]) dirPressed[dir] = true;
    held[dir] = true;
  }
  function release(dir) { held[dir] = false; }

  // keys that keep their special jobs (or belong to the browser) and
  // therefore never count as the interact button
  var NOT_ACTION = {
    ShiftLeft: 1, ShiftRight: 1, KeyX: 1,        // run
    KeyM: 1,                                     // mute
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
    if (e.code === 'KeyM') G.Audio.toggleMute();
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
    consumeDir: function (dir) {
      var v = dirPressed[dir];
      dirPressed[dir] = false;
      return v;
    },
    clearEdges: function () {
      actionPressed = false;
      dirPressed.up = dirPressed.down = dirPressed.left = dirPressed.right = false;
    }
  };
})();
