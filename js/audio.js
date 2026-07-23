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

  // a band-passed noise burst - the raw material for crowd roar, whoosh and
  // net swish. cut0 -> cut1 sweeps the centre frequency across the burst.
  function noiseBurst(t0, dur, vol, cut0, cut1, dest) {
    if (!ctx) return;
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(cut0, t0);
    if (cut1 && cut1 !== cut0) f.frequency.exponentialRampToValueAtTime(cut1, t0 + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest || master);
    src.start(t0); src.stop(t0 + dur + 0.02);
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
    basement: 'basement-theme.mp3',
    playground: 'introtheme.mp3' // sunny outdoor vibes for recess
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
      partyEl = new Audio('dancemusic.mp3');
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

  // ---- Mrs. Todd's 9 to 5 dance break -------------------------------------
  // wants 9to5.mp3 in the repo root; borrows the gym dance track until then
  var dollyEl = null;
  function playDolly() {
    if (bgmEl) bgmEl.pause();
    if (!dollyEl) {
      dollyEl = new Audio('9to5.mp3');
      dollyEl.loop = true; // the party outlasts a short clip
      dollyEl.addEventListener('error', function () {
        dollyEl = new Audio('dancemusic.mp3');
        dollyEl.loop = true;
        dollyEl.volume = muted ? 0 : 0.65;
        var p2 = dollyEl.play();
        if (p2 && p2.catch) p2.catch(function () {});
      });
    }
    dollyEl.volume = muted ? 0 : 0.65;
    try { dollyEl.currentTime = 0; } catch (e) {}
    var p = dollyEl.play();
    if (p && p.catch) p.catch(function () {});
  }
  function stopDolly() {
    if (dollyEl) { try { dollyEl.pause(); } catch (e) {} }
    // the floor theme comes right back
    if (bgmEl && !fellBack) { var p = bgmEl.play(); if (p && p.catch) p.catch(function () {}); }
  }

  // ---- Mr. Piercey's dad-joke rimshot --------------------------------------
  var rimshotEl = null;
  function playRimshot() {
    if (rimshotEl === 'missing') return;
    if (!rimshotEl) {
      rimshotEl = new Audio('rimshot_01.mp3');
      rimshotEl.addEventListener('error', function () { rimshotEl = 'missing'; });
    }
    rimshotEl.volume = muted ? 0 : 0.6;
    try { rimshotEl.currentTime = 0; } catch (e) {}
    var p = rimshotEl.play();
    if (p && p.catch) p.catch(function () {});
  }

  // ---- Mr. Richards's dunk crowd roar --------------------------------------
  // plays a real crowd-roar clip if dunkroar.mp3 is dropped in the repo root;
  // otherwise falls back to the synthesized 'crowdRoar' swell. Either way the
  // per-beat whoosh/jam sfx layer on top from the cutscene.
  var dunkRoarEl = null;
  function playDunkRoar() {
    if (dunkRoarEl === 'missing') { sfx('crowdRoar'); return; }
    if (!dunkRoarEl) {
      dunkRoarEl = new Audio('dunkroar.mp3');
      dunkRoarEl.addEventListener('error', function () { dunkRoarEl = 'missing'; });
    }
    dunkRoarEl.volume = muted ? 0 : 0.6;
    try { dunkRoarEl.currentTime = 0; } catch (e) {}
    var p = dunkRoarEl.play();
    if (p && p.catch) p.catch(function () { dunkRoarEl = 'missing'; sfx('crowdRoar'); });
  }
  function stopDunkRoar() {
    if (dunkRoarEl && dunkRoarEl !== 'missing') { try { dunkRoarEl.pause(); } catch (e) {} }
  }

  // ---- Mr. Richards's NBA-Jam dunk soundtrack ------------------------------
  // jammusic.mp3 is the ~20s backing track for the whole cutscene; it starts a
  // couple beats before he walks out and ducks quieter once he catches fire.
  // hesonfireclip / whoa / boomshakalasound are one-shots fired on the beats.
  var jamEl = null;
  var jamBaseVol = 0.62;
  var dunkClips = {};
  function playJamMusic() {
    if (bgmEl) { try { bgmEl.pause(); } catch (e) {} }   // hush the floor theme
    if (jamEl === 'missing') return 0;
    if (!jamEl) {
      jamEl = new Audio('jammusic.mp3');
      jamEl.addEventListener('error', function () { jamEl = 'missing'; });
    }
    jamEl.volume = muted ? 0 : jamBaseVol;
    try { jamEl.currentTime = 0; } catch (e) {}
    var p = jamEl.play(); if (p && p.catch) p.catch(function () {});
    var d = jamEl.duration;
    return (d && isFinite(d) && d > 0) ? d : 20;
  }
  function setJamVolume(v) {
    if (jamEl && jamEl !== 'missing') jamEl.volume = muted ? 0 : Math.max(0, v);
  }
  function playDunkClip(file, vol) {
    var el = dunkClips[file];
    if (el === 'missing') return;
    if (!el) {
      el = new Audio(file);
      el.addEventListener('error', function () { dunkClips[file] = 'missing'; });
      dunkClips[file] = el;
    }
    el.volume = muted ? 0 : (vol || 0.85);
    try { el.currentTime = 0; } catch (e) {}
    var p = el.play(); if (p && p.catch) p.catch(function () {});
  }
  function stopDunkMusic() {
    if (jamEl && jamEl !== 'missing') { try { jamEl.pause(); } catch (e) {} }
    Object.keys(dunkClips).forEach(function (k) {
      var el = dunkClips[k];
      if (el && el !== 'missing') { try { el.pause(); } catch (e) {} }
    });
    // bring the floor theme back
    if (bgmEl && !fellBack) { var p = bgmEl.play(); if (p && p.catch) p.catch(function () { armRetry(); }); }
  }

  // ---- footsteps on the stairwell ------------------------------------------
  // Plays over the whole fade-out / fade-in, so the student lands on the new
  // floor as the last step dies away. Returns how long the clip runs (or 0 if
  // it will not play), which is what paces the transition in main.js.
  var stairEl = null;
  var STAIR_FALLBACK = 2.1; // the clip is ~2.1s; used until metadata loads
  // fetched up front so the FIRST trip upstairs knows its real length and
  // starts instantly, instead of falling back to the estimate
  (function preloadStairs() {
    try {
      stairEl = new Audio('stair.mp3');
      stairEl.preload = 'auto';
      stairEl.addEventListener('error', function () { stairEl = 'missing'; });
    } catch (e) { stairEl = null; }
  })();
  function playStairs() {
    if (stairEl === 'missing') { sfx('stairs'); return 0; }
    if (!stairEl) {
      stairEl = new Audio('stair.mp3');
      stairEl.addEventListener('error', function () { stairEl = 'missing'; });
    }
    stairEl.volume = muted ? 0 : 0.65;
    try { stairEl.currentTime = 0; } catch (e) {}
    var p = stairEl.play();
    if (p && p.catch) p.catch(function () {});
    var d = stairEl.duration;
    return (d && isFinite(d) && d > 0) ? d : STAIR_FALLBACK;
  }
  function stopStairs() {
    if (stairEl && stairEl !== 'missing') { try { stairEl.pause(); } catch (e) {} }
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
    // the office intercom clearing its throat: bing... bong
    chime: function (t) {
      note(midi(76), t, 0.28, 'sine', 0.34);
      note(midi(69), t + 0.26, 0.42, 'sine', 0.34);
    },
    // Eddie announcing himself: a bright two-note bird call
    squawk: function (t) {
      note(midi(88), t, 0.07, 'square', 0.3);
      note(midi(83), t + 0.07, 0.05, 'square', 0.28);
      note(midi(90), t + 0.14, 0.1, 'square', 0.3);
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
    },
    // ---- Mr. Richards's Double Dribble dunk ----
    // a swelling arena crowd (two layered noise beds) - the synth stand-in
    // used until a real dunkroar.mp3 is dropped in the repo
    crowdRoar: function (t) {
      noiseBurst(t, 2.6, 0.42, 480, 820);
      noiseBurst(t + 0.25, 2.3, 0.26, 1300, 1700);
    },
    // the whoosh as he blasts up out of the room into the graphic
    whoosh: function (t) {
      noiseBurst(t, 0.34, 0.5, 2000, 320);
    },
    // the two-hand JAM: rim clank + net swish + the crowd erupting + a cheer
    jam: function (t) {
      note(midi(52), t, 0.05, 'square', 0.5);          // metallic rim clank
      note(midi(64), t, 0.06, 'square', 0.4);
      note(midi(59), t + 0.02, 0.09, 'triangle', 0.4);
      noiseBurst(t + 0.04, 0.22, 0.4, 5200, 1100);      // net swish
      noiseBurst(t + 0.05, 1.2, 0.55, 700, 1300);       // crowd erupts
      [[72, 0.05], [79, 0.17], [84, 0.30]].forEach(function (n) {
        note(midi(n[0]), t + n[1], 0.2, 'square', 0.3); // triumphant cheer motif
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
    if (dollyEl) dollyEl.volume = m ? 0 : 0.65;
    if (rimshotEl && rimshotEl !== 'missing') rimshotEl.volume = m ? 0 : 0.6;
    if (dunkRoarEl && dunkRoarEl !== 'missing') dunkRoarEl.volume = m ? 0 : 0.6;
    if (jamEl && jamEl !== 'missing') jamEl.volume = m ? 0 : jamBaseVol;
    Object.keys(dunkClips).forEach(function (k) {
      if (dunkClips[k] && dunkClips[k] !== 'missing') dunkClips[k].volume = m ? 0 : 0.85;
    });
    if (stairEl && stairEl !== 'missing') stairEl.volume = m ? 0 : 0.65;
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
    playDolly: playDolly,
    stopDolly: stopDolly,
    playRimshot: playRimshot,
    playDunkRoar: playDunkRoar,
    stopDunkRoar: stopDunkRoar,
    playJamMusic: playJamMusic,
    setJamVolume: setJamVolume,
    playDunkClip: playDunkClip,
    stopDunkMusic: stopDunkMusic,
    playStairs: playStairs,
    stopStairs: stopStairs,
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
