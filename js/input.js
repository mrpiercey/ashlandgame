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
    var map = { 'd-up': 'up', 'd-down': 'down', 'd-left': 'left', 'd-right': 'right' };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      var dir = map[id];
      ['pointerdown', 'touchstart'].forEach(function (ev) {
        el.addEventListener(ev, function (e) { e.preventDefault(); press(dir); }, { passive: false });
      });
      ['pointerup', 'pointercancel', 'pointerleave', 'touchend'].forEach(function (ev) {
        el.addEventListener(ev, function (e) { e.preventDefault(); release(dir); }, { passive: false });
      });
    });
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
