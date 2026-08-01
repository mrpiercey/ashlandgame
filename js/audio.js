/* Ashland Elementary 26/27 - WebAudio chiptune music + sound effects */
var G = window.G = window.G || {};

(function () {
  var ctx = null;
  var master = null;
  // Two independent switches: the songs, and the beeps/boops. Either can be
  // off on its own, and both are remembered between visits.
  var musicMuted = localStorage.getItem('ashland-mute') === '1';
  var sfxMuted = localStorage.getItem('ashland-sfx-mute') === '1';
  var bgmTimer = null;
  var started = false;

  // The synthesized audio runs through two buses hanging off the master, so
  // the chiptune fallback tune and the sound effects can be silenced apart.
  var musicGain = null;
  var sfxGain = null;
  // Where the notes being scheduled right now belong. Scheduling is
  // synchronous, so setting this around a batch is enough to route it.
  var voice = null;

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = musicMuted ? 0 : 1;
      musicGain.connect(master);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = sfxMuted ? 0 : 1;
      sfxGain.connect(master);
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
    g.connect(dest || voice || sfxGain);
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
    src.connect(f); f.connect(g); g.connect(dest || voice || sfxGain);
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
    voice = musicGain;          // this batch is the tune, not an effect
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
    voice = null;
    bgmTimer = setTimeout(scheduleLoop, (loopLen - 0.1) * 1000);
  }

  // background music: one looping mp3 theme per floor. Each floor's track
  // remembers its position, so going up and down the stairs resumes the song.
  // Falls back to the built-in chiptune if a file is missing or can't play.
  var FLOOR_TRACKS = {
    middle: 'middlefloor-theme.webm',
    top: 'topfloor-theme.webm',
    basement: 'basement-theme.webm',
    playground: 'introtheme.webm' // sunny outdoor vibes for recess
  };
  var bgmEl = null;         // currently playing track
  var trackEls = {};        // floor -> Audio element
  var currentFloor = null;
  var fellBack = false;
  var retryArmed = false;
  var floorHushed = false;   // a room asked for silence (the cave, the ERROR house)

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
      // a room that asked for silence keeps it: the retry must not sneak the
      // floor theme back in behind the old man's line
      if (bgmEl && bgmEl.paused && !fellBack && !floorHushed) {
        var p = bgmEl.play();
        if (p && p.catch) p.catch(function () { armRetry(); });
      }
    };
    window.addEventListener('keydown', retry, true);
    window.addEventListener('pointerdown', retry, true);
  }

  function playFloor(floor) {
    if (!started || fellBack || !FLOOR_TRACKS[floor] || floor === currentFloor) return;
    floorHushed = false;        // the school has its soundtrack back
    clearInterval(fadeTimer);   // a duck in progress belongs to the old floor
    fadeTimer = null;
    currentFloor = floor;
    if (bgmEl) bgmEl.pause();
    var el = trackEls[floor];
    if (!el) {
      el = new Audio(FLOOR_TRACKS[floor]);
      el.loop = true;
      el.addEventListener('error', fallBack);
      trackEls[floor] = el;
    }
    el.volume = musicMuted ? 0 : 0.55;
    bgmEl = el;
    var p = el.play();
    if (p && p.catch) p.catch(function () { armRetry(); });
  }

  // A stinger (the LINK door, or the rupee fanfare) wants the floor music out
  // of its way. It FADES out and back in rather than cutting, and it pauses
  // where it stands -- so the theme picks up mid-phrase instead of restarting
  // from the top every time a secret fires.
  var BGM_VOL = 0.55;
  var fadeTimer = null;

  // The fade holds onto the element it started on, so changing floors partway
  // through can never leave the new track stuck at the old one's volume.
  function fadeBgm(to, ms, then) {
    var el = bgmEl;
    if (!el) { if (then) then(); return; }
    clearInterval(fadeTimer);
    var from = el.volume;
    var steps = Math.max(1, Math.round(ms / 25));
    var i = 0;
    fadeTimer = setInterval(function () {
      i++;
      try { el.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps))); }
      catch (e) {}
      if (i >= steps) {
        clearInterval(fadeTimer);
        fadeTimer = null;
        if (then) then(el);
      }
    }, 25);
  }

  function pauseBgm() {
    if (!bgmEl) return;
    fadeBgm(0, 260, function (el) {
      try { el.pause(); } catch (e) {}
    });
  }

  function resumeBgm() {
    if (!bgmEl) return;
    try {
      bgmEl.volume = 0;                 // come back up from silence...
      var p = bgmEl.play();             // ...at the point it left off
      if (p && p.catch) p.catch(function () { armRetry(); });
    } catch (e) { return; }
    fadeBgm(musicMuted ? 0 : BGM_VOL, 420);
  }

  function startBgm() {
    if (started) return;
    started = true;
    stopTitle();
    playFloor('middle');
  }

  // Some rooms want no soundtrack at all -- the cave is lit by one voice and
  // one fanfare and nothing else. The theme stops where it stands; the next
  // playFloor picks it up again from that spot.
  function hushFloor() {
    clearInterval(fadeTimer);
    fadeTimer = null;
    floorHushed = true;    // and it stays hushed until the next playFloor
    if (bgmEl) { try { bgmEl.pause(); } catch (e) {} }
    currentFloor = null;   // so walking back onto that floor restarts the tune
  }

  // ---- named one-shot clips -----------------------------------------------
  // Sound effects that live in a file rather than the synth: loaded once,
  // restarted on every play. A file that is not on disk is remembered as
  // missing and quietly skipped, so the game never waits on it.
  var clipEls = {};
  function clip(file, vol) {
    var el = clipEls[file];
    if (el === 'missing') return null;
    if (!el) {
      el = new Audio(file);
      el.addEventListener('error', function () { clipEls[file] = 'missing'; });
      clipEls[file] = el;
      trackSfx(el, vol);          // follows the sound-effects switch from here
    }
    el.volume = sfxMuted ? 0 : vol;
    try { el.currentTime = 0; } catch (e) {}
    var p = el.play();
    if (p && p.catch) p.catch(function () {});
    return el;
  }

  // every door in the school, and the stairwell doors too
  function playDoor() { return clip('doorsoundeffect.webm', 0.7); }
  // one per line of talk: when somebody speaks, and on every page turn
  function playTextBlip() { return clip('text.webm', 0.55); }
  // the old man's one line, which the words in the cave are timed to
  function playCaveLine() { return clip('itsdangeroustogoalone.webm', 0.85); }
  // the pencil going up over a student's head
  function playPencilFanfare() { return clip('getpencil.webm', 0.85); }

  // ---- the I AM ERROR room -------------------------------------------------
  // his house has its own record on the turntable, looping until you leave
  var errorEl = null;
  function playErrorMusic() {
    hushFloor();                        // nothing from the school reaches in here
    if (errorEl === 'missing') return;
    if (!errorEl) {
      errorEl = new Audio('iamerrorhousemusic.webm');
      errorEl.loop = true;
      errorEl.addEventListener('error', function () { errorEl = 'missing'; });
    }
    errorEl.volume = musicMuted ? 0 : 0.5;
    try { errorEl.currentTime = 0; } catch (e) {}
    var p = errorEl.play();
    if (p && p.catch) p.catch(function () {});
  }
  function stopErrorMusic() {
    if (errorEl && errorEl !== 'missing') { try { errorEl.pause(); } catch (e) {} }
  }

  // ---- the ending ----------------------------------------------------------
  // The last screen, where the four letters come home: its own theme, playing
  // over the confetti with everything else in the school gone quiet.
  var endingEl = null;
  function playEnding() {
    hushFloor();
    stopParty();
    stopErrorMusic();
    if (endingEl === 'missing') return;
    if (!endingEl) {
      endingEl = new Audio('endingtheme.webm');
      endingEl.loop = true;   // however long they sit and look at it
      endingEl.addEventListener('error', function () { endingEl = 'missing'; });
    }
    endingEl.volume = musicMuted ? 0 : 0.55;
    try { endingEl.currentTime = 0; } catch (e) {}
    var p = endingEl.play();
    if (p && p.catch) p.catch(function () {});
  }
  function stopEnding() {
    if (endingEl && endingEl !== 'missing') { try { endingEl.pause(); } catch (e) {} }
  }

  // ---- title screen music -------------------------------------------------
  // plays on the title screen and through Eddie's takeoff; a browser may
  // block it until the first real key press (armRetry handles that)
  var titleEl = null;
  function playTitle() {
    if (started || fellBack) return;
    if (!titleEl) {
      titleEl = new Audio('introtheme.webm');
      titleEl.loop = true;
      // a missing title track just means a quiet title screen
      titleEl.addEventListener('error', function () { titleEl = 'missing'; });
    }
    if (titleEl === 'missing') return;
    titleEl.volume = musicMuted ? 0 : 0.55;
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
      battleEl = new Audio('lettermusic.webm');
      battleEl.loop = true;
      battleEl.addEventListener('error', function () {
        battleEl = 'missing';
        if (bgmEl && !fellBack) { var p0 = bgmEl.play(); if (p0 && p0.catch) p0.catch(function () {}); }
      });
    }
    battleEl.volume = musicMuted ? 0 : 0.55;
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
  // the letter leaves the screen (victorysound.webm; chiptune fallback)
  var victoryTimer = null;
  var victoryEl = null;
  function playVictory() {
    if (battleEl && battleEl !== 'missing') battleEl.pause();
    stopVictory();
    if (victoryEl !== 'missing') {
      if (!victoryEl) {
        victoryEl = new Audio('victorysound.webm');
        victoryEl.loop = true;
        victoryEl.addEventListener('error', function () { victoryEl = 'missing'; });
      }
      victoryEl.volume = musicMuted ? 0 : 0.55;
      try { victoryEl.currentTime = 0; } catch (e) {}
      var p = victoryEl.play();
      if (p && p.catch) p.catch(function () {});
      return;
    }
    // no mp3? the old chiptune jingle still saves the day
    if (!ensure()) return;
    var run = function () {
      voice = musicGain;        // the jingle stands in for the song here
      SFX.victory(ctx.currentTime + 0.02);
      voice = null;
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
      flightEl = new Audio('introtheme.webm');
      flightEl.loop = true;
      flightEl.addEventListener('error', function () { flightEl = 'missing'; });
    }
    if (flightEl === 'missing') return;
    flightEl.volume = musicMuted ? 0 : 0.55;
    try { flightEl.currentTime = 0; } catch (e) {}
    var p = flightEl.play();
    if (p && p.catch) p.catch(function () {});
  }
  // The gym party has a whole crate of records. Every one of them gets played,
  // shuffled into a fresh order each time the party starts, and when a song
  // runs out the next one drops -- so the ending never sounds the same twice.
  // A track that turns out not to be on disk is dropped from the crate.
  var PARTY_TRACKS = [
    'dancemusic.webm', 'dance2.webm', 'dance3.webm',
    'dance4.webm', 'dance5.webm', 'dance6.webm', 'dance7.webm'
  ];
  var partyEls = {};
  var partyOrder = [];     // this party's running order
  var partyAt = 0;         // which record is on

  function shuffled(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {   // Fisher-Yates
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function partyTrackEl(file) {
    var el = partyEls[file];
    if (el === 'missing') return null;
    if (!el) {
      el = new Audio(file);
      el.addEventListener('error', function () {
        partyEls[file] = 'missing';
        if (partyEl === el) nextPartyTrack();   // that one is gone: drop the next
      });
      // each song hands over to the next instead of looping on its own
      el.addEventListener('ended', function () {
        if (partyEl === el) nextPartyTrack();
      });
      partyEls[file] = el;
    }
    return el;
  }

  function spinPartyTrack() {
    var tries = partyOrder.length;
    while (tries-- > 0) {
      var file = partyOrder[partyAt % partyOrder.length];
      var el = partyTrackEl(file);
      if (el) {
        partyEl = el;
        el.volume = musicMuted ? 0 : 0.55;
        try { el.currentTime = 0; } catch (e) {}
        var p = el.play();
        if (p && p.catch) p.catch(function () {});
        return file;
      }
      partyAt++;                 // that one is missing: reach for the next
    }
    partyEl = null;              // no dance music on disk at all
    return null;
  }

  function playParty() {
    if (flightEl && flightEl !== 'missing') flightEl.pause();
    if (bgmEl) bgmEl.pause();
    partyOrder = shuffled(PARTY_TRACKS);
    partyAt = 0;
    return spinPartyTrack();
  }

  // the next record in the running order -- what DJ Eddie reaches for when
  // somebody asks him for a new song, and what an ending song hands over to
  function nextPartyTrack() {
    if (!partyOrder.length) return playParty();
    if (partyEl) { try { partyEl.pause(); } catch (e) {} }
    partyAt++;
    // round the crate and back to the top, reshuffled so the second lap
    // through is a different running order than the first
    if (partyAt >= partyOrder.length) { partyOrder = shuffled(PARTY_TRACKS); partyAt = 0; }
    return spinPartyTrack();
  }

  function stopParty() {
    if (flightEl && flightEl !== 'missing') flightEl.pause();
    Object.keys(partyEls).forEach(function (f) {
      if (partyEls[f] && partyEls[f] !== 'missing') { try { partyEls[f].pause(); } catch (e) {} }
    });
    partyEl = null;
  }

  // ---- Mrs. Todd's 9 to 5 dance break -------------------------------------
  // wants 9to5.webm in the repo root; borrows the gym dance track until then
  var dollyEl = null;
  function playDolly() {
    if (bgmEl) bgmEl.pause();
    if (!dollyEl) {
      dollyEl = new Audio('9to5.webm');
      dollyEl.loop = true; // the party outlasts a short clip
      dollyEl.addEventListener('error', function () {
        dollyEl = new Audio('dancemusic.webm');
        dollyEl.loop = true;
        dollyEl.volume = musicMuted ? 0 : 0.65;
        var p2 = dollyEl.play();
        if (p2 && p2.catch) p2.catch(function () {});
      });
    }
    dollyEl.volume = musicMuted ? 0 : 0.65;
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
      rimshotEl = new Audio('rimshot_01.webm');
      rimshotEl.addEventListener('error', function () { rimshotEl = 'missing'; });
    }
    rimshotEl.volume = sfxMuted ? 0 : 0.6;
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
    dunkRoarEl.volume = sfxMuted ? 0 : 0.6;
    try { dunkRoarEl.currentTime = 0; } catch (e) {}
    var p = dunkRoarEl.play();
    if (p && p.catch) p.catch(function () { dunkRoarEl = 'missing'; sfx('crowdRoar'); });
  }
  function stopDunkRoar() {
    if (dunkRoarEl && dunkRoarEl !== 'missing') { try { dunkRoarEl.pause(); } catch (e) {} }
  }

  // ---- Mr. Richards's NBA-Jam dunk soundtrack ------------------------------
  // jammusic.webm is the ~20s backing track for the whole cutscene; it starts a
  // couple beats before he walks out and ducks quieter once he catches fire.
  // hesonfireclip / whoa / boomshakalasound are one-shots fired on the beats.
  var jamEl = null;
  var jamBaseVol = 0.62;
  var dunkClips = {};
  function playJamMusic() {
    if (bgmEl) { try { bgmEl.pause(); } catch (e) {} }   // hush the floor theme
    if (jamEl === 'missing') return 0;
    if (!jamEl) {
      jamEl = new Audio('jammusic.webm');
      jamEl.addEventListener('error', function () { jamEl = 'missing'; });
    }
    jamEl.volume = musicMuted ? 0 : jamBaseVol;
    try { jamEl.currentTime = 0; } catch (e) {}
    var p = jamEl.play(); if (p && p.catch) p.catch(function () {});
    var d = jamEl.duration;
    return (d && isFinite(d) && d > 0) ? d : 20;
  }
  function setJamVolume(v) {
    if (jamEl && jamEl !== 'missing') jamEl.volume = musicMuted ? 0 : Math.max(0, v);
  }
  function playDunkClip(file, vol) {
    var el = dunkClips[file];
    if (el === 'missing') return;
    if (!el) {
      el = new Audio(file);
      el.addEventListener('error', function () { dunkClips[file] = 'missing'; });
      dunkClips[file] = el;
    }
    el.volume = sfxMuted ? 0 : (vol || 0.85);
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
      stairEl = new Audio('stair.webm');
      stairEl.preload = 'auto';
      stairEl.addEventListener('error', function () { stairEl = 'missing'; });
    } catch (e) { stairEl = null; }
  })();
  function playStairs() {
    if (stairEl === 'missing') { sfx('stairs'); return 0; }
    if (!stairEl) {
      stairEl = new Audio('stair.webm');
      stairEl.addEventListener('error', function () { stairEl = 'missing'; });
    }
    stairEl.volume = sfxMuted ? 0 : 0.65;
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
    // the door has a real recording now; if the file is missing the old
    // two-note chiptune still answers, so every door always says something
    if (name === 'door' && playDoor()) return;
    if (!ensure()) return;
    var fn = SFX[name];
    if (fn) fn(ctx.currentTime + 0.01);
  }

  function setMuted(m) {
    musicMuted = m;
    clearInterval(fadeTimer);   // a fade in flight must not undo the mute
    fadeTimer = null;
    localStorage.setItem('ashland-mute', m ? '1' : '0');
    if (musicGain) musicGain.gain.value = m ? 0 : 1;
    Object.keys(trackEls).forEach(function (f) { trackEls[f].volume = m ? 0 : 0.55; });
    if (battleEl && battleEl !== 'missing') battleEl.volume = m ? 0 : 0.55;
    if (titleEl && titleEl !== 'missing') titleEl.volume = m ? 0 : 0.55;
    if (victoryEl && victoryEl !== 'missing') victoryEl.volume = m ? 0 : 0.55;
    if (flightEl && flightEl !== 'missing') flightEl.volume = m ? 0 : 0.55;
    Object.keys(partyEls).forEach(function (f) {
      if (partyEls[f] && partyEls[f] !== 'missing') partyEls[f].volume = m ? 0 : 0.55;
    });
    if (dollyEl) dollyEl.volume = m ? 0 : 0.65;
    if (jamEl && jamEl !== 'missing') jamEl.volume = m ? 0 : jamBaseVol;
    if (errorEl && errorEl !== 'missing') errorEl.volume = m ? 0 : 0.5;
    if (endingEl && endingEl !== 'missing') endingEl.volume = m ? 0 : 0.55;
    var btn = document.getElementById('mute-btn');
    if (btn) btn.classList.toggle('muted', m);
  }

  // the one-shot clips: rimshots, footsteps, the crowd, the dunk hollers
  function setSfxMuted(m) {
    sfxMuted = m;
    localStorage.setItem('ashland-sfx-mute', m ? '1' : '0');
    if (sfxGain) sfxGain.gain.value = m ? 0 : 1;
    if (rimshotEl && rimshotEl !== 'missing') rimshotEl.volume = m ? 0 : 0.6;
    if (dunkRoarEl && dunkRoarEl !== 'missing') dunkRoarEl.volume = m ? 0 : 0.6;
    Object.keys(dunkClips).forEach(function (k) {
      if (dunkClips[k] && dunkClips[k] !== 'missing') dunkClips[k].volume = m ? 0 : 0.85;
    });
    if (stairEl && stairEl !== 'missing') stairEl.volume = m ? 0 : 0.65;
    // clips other files own (the secret stingers) follow along too
    extraSfxEls.forEach(function (r) {
      if (r.el) r.el.volume = m ? 0 : r.vol;
    });
    var btn = document.getElementById('sfx-btn');
    if (btn) btn.classList.toggle('muted', m);
  }

  // main.js keeps its own <audio> elements for the secret stingers; it hands
  // them over here so the sound-effects switch reaches them as well
  var extraSfxEls = [];
  function trackSfx(el, vol) {
    if (!el) return el;
    vol = vol || 1;
    var known = false;
    extraSfxEls.forEach(function (r) { if (r.el === el) { r.vol = vol; known = true; } });
    if (!known) extraSfxEls.push({ el: el, vol: vol });
    el.volume = sfxMuted ? 0 : vol;
    return el;
  }

  function toggleMute() { setMuted(!musicMuted); }
  function toggleSfx() { setSfxMuted(!sfxMuted); }

  G.Audio = {
    startBgm: startBgm,
    pauseBgm: pauseBgm,
    resumeBgm: resumeBgm,
    playTitle: playTitle,
    stopTitle: stopTitle,
    playFloor: playFloor,
    playBattle: playBattle,
    stopBattle: stopBattle,
    playFlight: playFlight,
    playParty: playParty,
    nextPartyTrack: nextPartyTrack,
    stopParty: stopParty,
    hushFloor: hushFloor,
    playTextBlip: playTextBlip,
    playCaveLine: playCaveLine,
    playPencilFanfare: playPencilFanfare,
    playErrorMusic: playErrorMusic,
    stopErrorMusic: stopErrorMusic,
    playEnding: playEnding,
    stopEnding: stopEnding,
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
    trackSfx: trackSfx,
    toggleMute: toggleMute,
    toggleSfx: toggleSfx,
    isMuted: function () { return musicMuted; },
    isSfxMuted: function () { return sfxMuted; },
    initButton: function () {
      var wire = function (id, state, toggle) {
        var btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.toggle('muted', state);
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          ensure();
          toggle();
          btn.blur();
        });
      };
      wire('mute-btn', musicMuted, toggleMute);
      wire('sfx-btn', sfxMuted, toggleSfx);
    }
  };
})();
