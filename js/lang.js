/* Ashland Elementary 26/27 - language layer (English / Español / Kiswahili).
 * Dictionaries live in js/lang-data.js, keyed by the exact English string.
 * Anything missing from a dictionary falls back to English -- and the SOAR
 * expectations are deliberately absent, so they stay English everywhere. */
var G = window.G = window.G || {};

(function () {
  var current = 'en';

  function dict() {
    if (current === 'es') return G.LANG_ES || null;
    if (current === 'sw') return G.LANG_SW || null;
    return null;
  }

  // exact-match lookup with English fallback
  function t(s) {
    if (!s) return s;
    var d = dict();
    return (d && d[s]) || s;
  }

  // template lookup: translate the template, then drop the values in.
  // Each value gets its own t() pass so place names translate too.
  function f(template, vars) {
    var s = t(template);
    for (var k in vars) {
      s = s.split('{' + k + '}').join(t(String(vars[k])));
    }
    return s;
  }

  G.Lang = {
    t: t,
    f: f,
    set: function (code) {
      current = code;
      // the two bits of text that live in the page instead of the canvas
      var btn = document.getElementById('a-btn');
      if (btn) btn.innerHTML = t('TALK &<br>CHECK');
      var hint = document.getElementById('rotate-hint');
      if (hint) hint.innerHTML = '📱 ' + t('TURN YOUR DEVICE SIDEWAYS FOR THE BEST VIEW!');
    },
    get: function () { return current; }
  };
})();
