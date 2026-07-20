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

  window.addEventListener('keydown', function (e) {
    if (e.repeat) {
      if (KEYMAP[e.code]) e.preventDefault();
      return;
    }
    var d = KEYMAP[e.code];
    if (d) { press(d); e.preventDefault(); }
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') {
      actionPressed = true;
      e.preventDefault();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') held.run = true;
    if (e.code === 'KeyM') G.Audio.toggleMute();
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
