/* Ashland Elementary 26/27 - WebAudio chiptune music + sound effects */
var G = window.G = window.G || {};

(function () {
  var ctx = null;
  var master = null;
  var muted = localStorage.getItem('ashland-mute') === '1';
  var bgmTimer = null;
  var started = false;

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.16;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function note(freq, t0, dur, type, vol, dest) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.setValueAtTime(vol, t0 + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g);
    g.connect(dest || master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  // ---- background music: a cheerful little school march -------------------
  // lead (square) and bass (triangle); note = [midi, beats], rest = [0, beats]
  var LEAD = [
    [72, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [81, 1], [79, 1],
    [76, 0.5], [72, 0.5], [74, 0.5], [76, 0.5], [72, 1.5], [0, 0.5],
    [72, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [84, 1], [81, 1],
    [79, 0.5], [81, 0.5], [76, 0.5], [74, 0.5], [72, 1.5], [0, 0.5],
    [74, 0.5], [77, 0.5], [81, 0.5], [77, 0.5], [79, 1], [76, 1],
    [72, 0.5], [76, 0.5], [79, 0.5], [83, 0.5], [84, 1.5], [0, 0.5],
    [84, 0.5], [83, 0.5], [81, 0.5], [79, 0.5], [81, 0.5], [79, 0.5], [76, 0.5], [74, 0.5],
    [72, 2]
  ];
  var BASS = [
    [48, 1], [55, 1], [52, 1], [55, 1],
    [48, 1], [55, 1], [48, 1], [55, 1],
    [48, 1], [55, 1], [52, 1], [55, 1],
    [48, 1], [55, 1], [48, 1], [55, 1],
    [50, 1], [57, 1], [48, 1], [55, 1],
    [48, 1], [52, 1], [55, 1], [59, 1],
    [53, 1], [55, 1], [53, 1], [55, 1],
    [48, 1], [43, 1]
  ];
  var TEMPO = 132;

  function scheduleLoop() {
    if (!ctx) return;
    var beat = 60 / TEMPO;
    var t = ctx.currentTime + 0.05;
    var t0 = t;
    LEAD.forEach(function (n) {
      if (n[0]) note(midi(n[0]), t, n[1] * beat * 0.92, 'square', 0.20);
      t += n[1] * beat;
    });
    var loopLen = t - t0;
    var tb = t0;
    BASS.forEach(function (n) {
      if (n[0]) note(midi(n[0]), tb, n[1] * beat * 0.9, 'triangle', 0.35);
      tb += n[1] * beat;
    });
    bgmTimer = setTimeout(scheduleLoop, (loopLen - 0.1) * 1000);
  }

  // background music: one looping mp3 theme per floor. Each floor's track
  // remembers its position, so going up and down the stairs resumes the song.
  // Falls back to the built-in chiptune if a file is missing or can't play.
  var FLOOR_TRACKS = {
    middle: 'middlefloor-theme.mp3',
    top: 'topfloor-theme.mp3',
    basement: 'basement-theme.mp3'
  };
  var bgmEl = null;         // currently playing track
  var trackEls = {};        // floor -> Audio element
  var currentFloor = null;
  var fellBack = false;
  var retryArmed = false;

  function fallBack() {
    // only for real file problems (missing/broken mp3) - use the chiptune
    if (fellBack) return;
    fellBack = true;
    Object.keys(trackEls).forEach(function (f) { try { trackEls[f].pause(); } catch (e) {} });
    bgmEl = null;
    if (ensure()) scheduleLoop();
  }

  function armRetry() {
    // browser blocked autoplay - try again on the next real key press / tap
    if (retryArmed) return;
    retryArmed = true;
    var retry = function () {
      window.removeEventListener('keydown', retry, true);
      window.removeEventListener('pointerdown', retry, true);
      retryArmed = false;
      if (ensure()) { /* also unlocks the sfx context */ }
      if (bgmEl && bgmEl.paused && !fellBack) {
        var p = bgmEl.play();
        if (p && p.catch) p.catch(function () { armRetry(); });
      }
    };
    window.addEventListener('keydown', retry, true);
    window.addEventListener('pointerdown', retry, true);
  }

  function playFloor(floor) {
    if (!started || fellBack || !FLOOR_TRACKS[floor] || floor === currentFloor) return;
    currentFloor = floor;
    if (bgmEl) bgmEl.pause();
    var el = trackEls[floor];
    if (!el) {
      el = new Audio(FLOOR_TRACKS[floor]);
      el.loop = true;
      el.addEventListener('error', fallBack);
      trackEls[floor] = el;
    }
    el.volume = muted ? 0 : 0.55;
    bgmEl = el;
    var p = el.play();
    if (p && p.catch) p.catch(function () { armRetry(); });
  }

  function startBgm() {
    if (started) return;
    started = true;
    stopTitle();
    playFloor('middle');
  }

  // ---- title screen music -------------------------------------------------
  // plays on the title screen and through Eddie's takeoff; a browser may
  // block it until the first real key press (armRetry handles that)
  var titleEl = null;
  function playTitle() {
    if (started || fellBack) return;
    if (!titleEl) {
      titleEl = new Audio('introtheme.mp3');
      titleEl.loop = true;
      // a missing title track just means a quiet title screen
      titleEl.addEventListener('error', function () { titleEl = 'missing'; });
    }
    if (titleEl === 'missing') return;
    titleEl.volume = muted ? 0 : 0.55;
    bgmEl = titleEl; // so the autoplay retry restarts THIS track
    var p = titleEl.play();
    if (p && p.catch) p.catch(function () { armRetry(); });
  }
  function stopTitle() {
    if (titleEl && titleEl !== 'missing') {
      try { titleEl.pause(); } catch (e) {}
    }
    if (bgmEl === titleEl) bgmEl = null;
  }

  // ---- letter-encounter music ---------------------------------------------
  var battleEl = null;
  function playBattle() {
    if (bgmEl) bgmEl.pause();
    if (battleEl === 'missing') return;
    if (!battleEl) {
      battleEl = new Audio('lettermusic.mp3');
      battleEl.loop = true;
      battleEl.addEventListener('error', function () {
        battleEl = 'missing';
        if (bgmEl && !fellBack) { var p0 = bgmEl.play(); if (p0 && p0.catch) p0.catch(function () {}); }
      });
    }
    battleEl.volume = muted ? 0 : 0.55;
    try { battleEl.currentTime = 0; } catch (e) {}
    var p = battleEl.play();
    if (p && p.catch) p.catch(function () {});
  }
  function stopBattle() {
    if (battleEl && battleEl !== 'missing') battleEl.pause();
    if (bgmEl && !fellBack) {
      var p = bgmEl.play();
      if (p && p.catch) p.catch(function () { armRetry(); });
    }
  }

  // victory music: plays from the moment the quiz is answered right until
  // the letter leaves the screen (victorysound.mp3; chiptune fallback)
  var victoryTimer = null;
  var victoryEl = null;
  function playVictory() {
    if (battleEl && battleEl !== 'missing') battleEl.pause();
    stopVictory();
    if (victoryEl !== 'missing') {
      if (!victoryEl) {
        victoryEl = new Audio('victorysound.mp3');
        victoryEl.loop = true;
        victoryEl.addEventListener('error', function () { victoryEl = 'missing'; });
      }
      victoryEl.volume = muted ? 0 : 0.55;
      try { victoryEl.currentTime = 0; } catch (e) {}
      var p = victoryEl.play();
      if (p && p.catch) p.catch(function () {});
      return;
    }
    // no mp3? the old chiptune jingle still saves the day
    if (!ensure()) return;
    var run = function () {
      SFX.victory(ctx.currentTime + 0.02);
      victoryTimer = setTimeout(run, 1900);
    };
    run();
  }
  function stopVictory() {
    if (victoryTimer) { clearTimeout(victoryTimer); victoryTimer = null; }
    if (victoryEl && victoryEl !== 'missing') {
      try { victoryEl.pause(); } catch (e) {}
    }
  }

  // ---- secret ending music --------------------------------------------------
  // Eddie's dramatic fly-over reprises the title theme; the gym party pumps
  // the upbeat letter-encounter track
  var flightEl = null;
  var partyEl = null;
  function playFlight() {
    if (bgmEl) bgmEl.pause();
    if (!flightEl) {
      flightEl = new Audio('introtheme.mp3');
      flightEl.loop = true;
      flightEl.addEventListener('error', function () { flightEl = 'missing'; });
    }
    if (flightEl === 'missing') return;
    flightEl.volume = muted ? 0 : 0.55;
    try { flightEl.currentTime = 0; } catch (e) {}
    var p = flightEl.play();
    if (p && p.catch) p.catch(function () {});
  }
  function playParty() {
    if (flightEl && flightEl !== 'missing') flightEl.pause();
    if (bgmEl) bgmEl.pause();
    if (!partyEl) {
      partyEl = new Audio('lettermusic.mp3');
      partyEl.loop = true;
      partyEl.addEventListener('error', function () { partyEl = 'missing'; });
    }
    if (partyEl === 'missing') return;
    partyEl.volume = muted ? 0 : 0.55;
    var p = partyEl.play();
    if (p && p.catch) p.catch(function () {});
  }
  function stopParty() {
    if (flightEl && flightEl !== 'missing') flightEl.pause();
    if (partyEl && partyEl !== 'missing') partyEl.pause();
  }

  // ---- sfx ----------------------------------------------------------------
  var SFX = {
    blip: function (t) { note(midi(84), t, 0.06, 'square', 0.25); },
    tick: function (t) { note(midi(96), t, 0.02, 'square', 0.06); },
    door: function (t) {
      note(midi(67), t, 0.08, 'square', 0.25);
      note(midi(72), t + 0.08, 0.1, 'square', 0.25);
    },
    stairs: function (t) {
      note(midi(60), t, 0.07, 'square', 0.22);
      note(midi(64), t + 0.07, 0.07, 'square', 0.22);
      note(midi(67), t + 0.14, 0.09, 'square', 0.22);
    },
    locked: function (t) {
      note(midi(41), t, 0.12, 'square', 0.4);
      note(midi(40), t + 0.12, 0.18, 'square', 0.35);
    },
    encounter: function (t) {
      // dramatic encounter sting
      [[45, 0], [45, 0.1], [51, 0.2], [57, 0.3], [63, 0.42]].forEach(function (n) {
        note(midi(n[0]), t + n[1], 0.12, 'square', 0.4);
        note(midi(n[0] - 12), t + n[1], 0.12, 'triangle', 0.4);
      });
    },
    fanfare: function (t) {
      [[72, 0], [76, 0.1], [79, 0.2], [84, 0.3]].forEach(function (n) {
        note(midi(n[0]), t + n[1], 0.14, 'square', 0.3);
      });
      note(midi(88), t + 0.42, 0.45, 'square', 0.3);
      note(midi(60), t + 0.42, 0.45, 'triangle', 0.4);
    },
    victory: function (t) {
      var seq = [[72, 0], [72, 0.12], [72, 0.24], [72, 0.36], [68, 0.72], [70, 1.0], [72, 1.3], [70, 1.42], [72, 1.54]];
      seq.forEach(function (n) {
        note(midi(n[0]), t + n[1], 0.16, 'square', 0.3);
        note(midi(n[0] - 12), t + n[1], 0.16, 'triangle', 0.35);
      });
    }
  };

  function sfx(name) {
    if (!ensure()) return;
    var fn = SFX[name];
    if (fn) fn(ctx.currentTime + 0.01);
  }

  function setMuted(m) {
    muted = m;
    localStorage.setItem('ashland-mute', m ? '1' : '0');
    if (master) master.gain.value = m ? 0 : 0.16;
    Object.keys(trackEls).forEach(function (f) { trackEls[f].volume = m ? 0 : 0.55; });
    if (battleEl && battleEl !== 'missing') battleEl.volume = m ? 0 : 0.55;
    if (titleEl && titleEl !== 'missing') titleEl.volume = m ? 0 : 0.55;
    if (victoryEl && victoryEl !== 'missing') victoryEl.volume = m ? 0 : 0.55;
    if (flightEl && flightEl !== 'missing') flightEl.volume = m ? 0 : 0.55;
    if (partyEl && partyEl !== 'missing') partyEl.volume = m ? 0 : 0.55;
    var btn = document.getElementById('mute-btn');
    if (btn) btn.classList.toggle('muted', m);
  }

  function toggleMute() { setMuted(!muted); }

  G.Audio = {
    startBgm: startBgm,
    playTitle: playTitle,
    stopTitle: stopTitle,
    playFloor: playFloor,
    playBattle: playBattle,
    stopBattle: stopBattle,
    playFlight: playFlight,
    playParty: playParty,
    stopParty: stopParty,
    playVictory: playVictory,
    stopVictory: stopVictory,
    sfx: sfx,
    toggleMute: toggleMute,
    isMuted: function () { return muted; },
    initButton: function () {
      var btn = document.getElementById('mute-btn');
      btn.classList.toggle('muted', muted);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        ensure();
        toggleMute();
        btn.blur();
      });
    }
  };
})();
