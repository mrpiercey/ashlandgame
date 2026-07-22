/* Ashland Elementary - Android full screen.
 *
 * On an Android phone the first tap makes the game fill the screen, so it
 * reads as an app instead of a web page with a URL bar on top.
 *
 * Deliberately Android only:
 *   - iPhone Safari CANNOT do this. Apple allows full screen for <video>
 *     only, never for a page, so requestFullscreen is not even defined and
 *     this whole file is a silent no-op there. Add to Home Screen is the
 *     only chrome-free route on iOS.
 *   - Chromebooks and laptops are left alone on purpose: a teacher clicking
 *     the link mid-lesson should not have their screen taken over. They
 *     still have the F11 / fullscreen key if they want it.
 */
var G = window.G = window.G || {};

(function () {
  var root = document.documentElement;

  // Chromebooks report "CrOS" and desktops report Windows/Mac/X11, so
  // matching Android is enough to exclude them
  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }
  function isTouch() {
    return ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches);
  }
  function alreadyFullPage() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return true;
    // added to the home screen: it is already chrome-free
    return navigator.standalone === true ||
      ['fullscreen', 'standalone', 'minimal-ui'].some(function (m) {
        return window.matchMedia('(display-mode: ' + m + ')').matches;
      });
  }
  function canGoFull() {
    return !!(root.requestFullscreen || root.webkitRequestFullscreen);
  }

  function goFullscreen() {
    if (!canGoFull() || alreadyFullPage()) return;
    try {
      var p = root.requestFullscreen
        ? root.requestFullscreen({ navigationUI: 'hide' })
        : root.webkitRequestFullscreen();
      // rejects if the gesture expired or the user declined -- never throw
      if (p && p.catch) p.catch(function () {});
    } catch (e) { /* full screen is a nicety; never break the game over it */ }
  }
  G.goFullscreen = goFullscreen;

  if (!isAndroid() || !isTouch() || !canGoFull() || alreadyFullPage()) return;

  // The browser only grants full screen from inside a real gesture, so this
  // has to run in the event itself -- not from the game loop. Capture phase,
  // because input.js and the canvas handler both preventDefault() on
  // pointerdown and would otherwise consume the gesture first.
  var armed = true;
  function firstTap() {
    if (!armed) return;
    armed = false;
    window.removeEventListener('pointerdown', firstTap, true);
    window.removeEventListener('keydown', firstTap, true);
    goFullscreen();
  }
  window.addEventListener('pointerdown', firstTap, true);
  window.addEventListener('keydown', firstTap, true);

  // Going full screen gives back ~100px of height, and the whole layout is
  // sized from window.innerHeight in main.js fit(). A synthetic resize lets
  // the existing listener re-fit, so nothing in main.js needs to know.
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
    });
  });
})();
