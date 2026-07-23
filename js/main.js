/* Ashland Elementary 26/27 - main game loop */
var G = window.G = window.G || {};

(function () {
  var SW = 320, SH = 240;      // the game viewport (left side)
  var SIDE_W = 112;            // Gauntlet-style stats panel (right side)
  var TOTAL_W = SW + SIDE_W;
  var TOP_H = 36, BOT_H = 64;  // upright phones: HUD above and below instead
  var portrait = false;
  var TS = 16;
  var canvas, ctx;
  var visited = {};            // roomIds the player has entered
  var met = {};                // staff the player has talked to (roomId, '__officer__' or '__eddie__')
  var staffRosterOpen = false; // the "ASHLAND STAFF" roster overlay is up
  var floorsSeen = { middle: true }; // floors walked on (we spawn on the ground)
  var flybyRoom = null;        // room a just-won letter was caught in, or null

  var state = 'title'; // title | play | ending
  var player = { x: 0, y: 0, dir: 'down', anim: 0, moving: false };
  var currentMapId = 'middle';
  var playerFrames = null;
  var teacherFrames = {};
  var eagleSprite = null;
  var eagleFlyFrames = null;
  var officerFrames = null;

  var transition = null; // {phase:'out'|'in', t, onMid}
  var autoWalk = null;   // click-to-move: {path:[[tx,ty]..], i, target, tries}
  var banner = null;     // {text, timer}
  var bumpCooldown = 0;
  var confetti = [];
  var endingTimer = 0;

  function font(px) { return px + 'px "Press Start 2P", monospace'; }
  function map() { return G.Maps.all[currentMapId]; }

  // ---- boot ---------------------------------------------------------------
  function boot() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    G.buildMaps();
    G.Quest.init();
    G.Input.init();
    G.Audio.initButton();
    G.Audio.playTitle();

    // shh: ...?ashlandway is the teacher-testing code. It loads the game
    // with every staff member met and all four letters already caught, so
    // the full-blowout gym party is one Walker visit away.
    if (/[?&]ashlandway\b/.test(location.search)) {
      debugMeetAll();
      G.Quest.LETTERS.forEach(function (l) { G.Quest.collect(l); });
    }
    // ...and ?ending=N jumps straight to the last scene: all four letters in
    // hand, N staff already met, standing in front of Mrs. Walker. One link
    // per party tier, for showing off the endings without replaying the game.
    var em = /[?&]ending=(\d+|all)\b/.exec(location.search);
    if (em) previewEnding = em[1] === 'all' ? Infinity : parseInt(em[1], 10);

    playerFrames = G.Sprites.make({
      hair: '#c8451f', skin: '#f2c398', shirt: '#2e8f57', pants: '#3d5c92', shoes: '#e8e8e2', style: 'short'
    });
    Object.keys(G.TEACHERS).forEach(function (id) {
      teacherFrames[id] = G.Sprites.makeAdult(G.TEACHERS[id].sprite);
    });
    eagleSprite = G.Sprites.eagle();
    eagleFlyFrames = G.Sprites.eagleFly();
    // Officer Garth: dark navy police blues, friendly buzz cut
    officerFrames = G.Sprites.makeAdult({
      hair: '#4a3625', skin: '#e8b48c', shirt: '#1c2f52', pants: '#141f38', shoes: '#111118', style: 'buzz'
    });

    var spawn = G.Maps.all.middle.spawn;
    player.x = spawn.x * TS;
    player.y = spawn.y * TS;
    player.dir = spawn.dir;
    unstickPlayer(); // in case the spawn area was painted over in the editor

    // mouse (and tap) support: click a teacher or an object to walk over
    // and interact; anywhere else the click is just the action button
    canvas.addEventListener('pointerdown', onCanvasClick);
    // touching the keyboard always hands control back to the player
    // (run and mute keys don't steer, so they don't interrupt the walk)
    window.addEventListener('keydown', function (e) {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' ||
          e.code === 'KeyX' || e.code === 'KeyM') return;
      autoWalk = null;
    });

    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', function () { setTimeout(fit, 60); });
    // live-reload edits from the editors in other tabs
    window.addEventListener('storage', function (e) {
      if (e.key === 'ashland-sign-overrides') {
        Object.keys(G.Maps.all).forEach(function (id) {
          delete G.Maps.all[id]._signLayout;
        });
        return;
      }
      if (e.key === 'ashland-teacher-sprites') {
        try {
          var sprites = JSON.parse(e.newValue || '{}');
          Object.keys(sprites).forEach(function (id) {
            if (G.TEACHERS[id] && sprites[id]) {
              G.TEACHERS[id].sprite = G.Sprites.cfgFrom(sprites[id]);
              teacherFrames[id] = G.Sprites.makeAdult(G.TEACHERS[id].sprite);
            }
          });
        } catch (err) {}
        return;
      }
      if (e.key === 'ashland-teacher-names') {
        try {
          var names = JSON.parse(e.newValue || '{}');
          Object.keys(G.TEACHERS).forEach(function (id) {
            if (names[id]) G.TEACHERS[id].name = names[id];
          });
          G.Signs.clearCache(); // door signs re-render with the new names
        } catch (err) {}
        return;
      }
      if (e.key !== 'ashland-room-overrides' && e.key !== 'ashland-custom-rooms') return;
      G.buildMaps();
      countableCache = null; // doors may have moved: recount the rooms
      // any freshly created teachers need sprites
      Object.keys(G.TEACHERS).forEach(function (id) {
        if (!teacherFrames[id]) teacherFrames[id] = G.Sprites.makeAdult(G.TEACHERS[id].sprite);
      });
      G.Signs.clearCache();
      // if the edit walled the player in, slide them to the nearest open tile
      if (state === 'play') unstickPlayer();
    });
    fit();
    requestAnimationFrame(loop);
  }

  // A phone held upright gets the HUD stacked above and below the world
  // instead of squeezed beside it -- a 432-wide strip on a portrait screen
  // shrinks to nothing, which is what used to make us beg for landscape.
  function fit() {
    // portrait only matters when the screen is genuinely taller than wide
    portrait = window.innerHeight > window.innerWidth * 1.15;
    var w = portrait ? SW : TOTAL_W;
    var h = portrait ? SH + TOP_H + BOT_H : SH;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingEnabled = false;
    }
    // Upright, the game takes the full width and the controls flow in
    // underneath. Reserve room for them off a COARSE height so a phone's
    // sliding URL bar doesn't rescale the canvas on every scroll tick.
    var avail = portrait
      ? Math.round(window.innerHeight / 40) * 40 - 240 // room for the big pad
      : window.innerHeight;
    var scale = Math.min(window.innerWidth / w, Math.max(1, avail) / h);
    // big screens snap to whole-number scaling (crispest pixels); small
    // screens (phones, tablets) take the exact fit so the game fills them
    if (scale >= 2) scale = Math.floor(scale);
    canvas.style.width = Math.floor(w * scale) + 'px';
    canvas.style.height = Math.floor(h * scale) + 'px';
    document.body.classList.toggle('portrait', portrait);
  }

  // ---- game loop ----------------------------------------------------------
  var lastT = 0;
  function loop(t) {
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (bumpCooldown > 0) bumpCooldown -= dt;

    if (transition) {
      var tspeed = transition.speed || 2.6;
      transition.t += dt * tspeed;
      if (transition.t >= 1) {
        if (transition.phase === 'out') {
          // stairs hold on black while the footsteps keep climbing
          if (transition.hold > 0) {
            transition.hold -= dt;
            transition.t = 1;
            return;
          }
          if (transition.onMid) transition.onMid();
          transition = { phase: 'in', t: 0, speed: tspeed };
        } else {
          transition = null;
        }
      }
      return;
    }

    if (banner && banner.timer > 0) banner.timer -= dt;

    if (state === 'title') {
      if (G.Input.consumeAction()) {
        G.Audio.sfx('fanfare');
        startTitleFly();
      }
      return;
    }

    if (state === 'charselect') {
      updateCharSelect();
      return;
    }

    if (state === 'titlefly') {
      updateTitleFly(dt);
      return;
    }

    if (state === 'partyfly') {
      updatePartyFly(dt);
      return;
    }

    if (state === 'ending') {
      endingTimer += dt;
      updateConfetti(dt);
      if (endingTimer > 3 && G.Input.consumeAction()) location.reload();
      return;
    }

    if (state === 'battle') {
      updateBattle(dt);
      return;
    }

    if (state === 'dunk') {
      updateDunk(dt);
      return;
    }

    // ---- play ----
    // the staff roster freezes the world; Enter (or a tap) closes it
    if (staffRosterOpen) {
      if (G.Input.consumeAction()) { staffRosterOpen = false; G.Audio.sfx('blip'); }
      return;
    }

    // the cafeteria "hdd" sushi secret -- only counts letters typed in here
    if (currentMapId === 'm-caf') {
      if (!G.Quest.sushiOn() && G.Input.recentTyped().indexOf('hdd') !== -1) {
        G.Quest.setSushi();
        G.Input.clearTyped();
        playSecretSound();
      }
    } else {
      G.Input.clearTyped();
    }

    if (ceremony) {
      updateCeremony(dt);
      updateNpcs(dt);
      return;
    }

    updateFollowers(dt);
    // the party never stops -- not even while you're chatting
    if (party) updateParty(dt);
    if (playerDance) {
      playerDance.t += dt;
      if (!party || playerDance.t > DANCE_LIFE) playerDance = null;
    }
    if (toddParty) updateToddParty(dt);
    // Eddie keeps flapping while his hint box is on screen
    if (eddieVisit) updateEddieVisit(dt);

    if (G.Dialogue.isActive()) {
      G.Dialogue.update(ctx);
      return;
    }

    movePlayer(dt);
    updateNpcs(dt);

    // the lead Eddie queued during the battle. Only if the student is still
    // standing in the room where they caught it -- walk out and the moment
    // has passed (the sidebar and arrow already carry the lead anyway).
    if (flybyRoom !== null) {
      var stillThere = flybyRoom === currentMapId ||
        (flybyRoom === 'b-gym' && currentMapId === 'basement');
      flybyRoom = null;
      var queued = G.Quest.takeFlyby();
      if (queued && stillThere && !eddieVisit && !party && !toddParty) {
        startEddieVisit(queued);
      }
    }

    // adrift for a few minutes? Eddie comes to the rescue. Reaching this line
    // already means we're in play with no transition, ceremony or dialogue.
    // The clock simply pauses when a flyby would be wrong (mid-party, or with
    // the real Eddie already standing on screen), so no nudge is ever lost.
    if (!eddieVisit && !party && !toddParty && !autoWalk && !eagleOnScreen() &&
        G.Quest.idleTick(dt)) startEddieVisit();

    // the gym is an open area off the basement hallway, not a separate room
    var nowInGym = inGymArea();
    if (nowInGym && !wasInGym) {
      visited['b-gym'] = true;
      showBanner(G.ROOMS['b-gym'].name);
    }
    wasInGym = nowInGym;

    // at the party, number keys are dance moves, not "talk" -- catch them
    // before the action button so pressing 5 doesn't end the celebration
    if (party) {
      var dk = G.Input.consumeDanceKey();
      if (dk !== null) { startPlayerDance(dk); G.Input.consumeAction(); return; }
    } else {
      G.Input.consumeDanceKey(); // don't let a stray number leak into the party
    }
    if (G.Input.consumeAction()) tryInteract();
  }

  // the player's own dance move at the party: {style 0-9, t}. Number keys
  // pick a move; tapping your own character rolls a random one.
  var playerDance = null;
  var DANCE_LIFE = 2.6;

  // Mr. Richards's running joke: talk to him ten times and he offers to dunk
  var richardsTalks = 0;
  var dunk = null;          // the NBA-Jam "on fire" dunk cutscene: {t, ...}
  // the real arena backdrop; if it loads we play the cutscene over it, else we
  // fall back to a look-alike arena drawn in code
  var dunkImg = new Image();
  var dunkImgOk = false;
  dunkImg.onload = function () { dunkImgOk = dunkImg.width > 0; };
  dunkImg.src = 'richardsslam.png';

  // the cafeteria "hdd" sushi secret: plays secretsound.mp3 if present
  var secretAudio = null;
  function playSecretSound() {
    try {
      if (!secretAudio) {
        secretAudio = new Audio('secretsound.mp3');
        secretAudio.addEventListener('error', function () { secretAudio = 'missing'; });
      }
      if (secretAudio === 'missing') return;
      secretAudio.currentTime = 0;
      var p = secretAudio.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { /* no audio, no problem */ }
  }
  function startPlayerDance(style) {
    playerDance = { style: ((style % 10) + 10) % 10, t: 0 };
    G.Audio.sfx('blip');
  }

  var wasInGym = false;
  function inGymArea() {
    if (currentMapId !== 'basement') return false;
    return Math.floor((player.x + 8) / TS) >= 21;
  }

  // ---- letter hunts: the letter hides at an object; enter reveals it -----
  function huntSpotAt(tx, ty) {
    var h = G.Quest.getHunt();
    if (!h || !h.spot) return null;
    var inHuntRoom = currentMapId === h.roomId ||
      (h.roomId === 'b-gym' && currentMapId === 'basement');
    if (!inHuntRoom) return null;
    // multi-tile furniture counts as one object: any tile of it is a hit
    if (h.spot.tiles) {
      for (var i = 0; i < h.spot.tiles.length; i++) {
        if (h.spot.tiles[i][0] === tx && h.spot.tiles[i][1] === ty) return h;
      }
      return null;
    }
    return (h.spot.x === tx && h.spot.y === ty) ? h : null;
  }

  // ---- the letter encounter ----------------------------------------------
  var battle = null;
  var battleSnap = null;
  var bigLetterCache = {};

  function makeBigLetter(letter) {
    if (bigLetterCache[letter]) return bigLetterCache[letter];
    var size = 170;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var x = c.getContext('2d');
    x.font = '100px "Press Start 2P", monospace';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    var cx = size / 2 - 7, cy = size / 2 - 8;
    // 3D extrusion: stacked dark-gold layers receding down-right
    for (var d = 14; d >= 1; d--) {
      var shade = d > 9 ? '#4a350a' : d > 4 ? '#6b4d10' : '#8a6d1a';
      x.fillStyle = shade;
      x.fillText(letter, cx + d, cy + d);
    }
    // bright gold face with a vertical shine
    var grad = x.createLinearGradient(0, cy - 55, 0, cy + 55);
    grad.addColorStop(0, '#fdf5c0');
    grad.addColorStop(0.35, '#f7d84d');
    grad.addColorStop(1, '#d9a520');
    x.fillStyle = grad;
    x.fillText(letter, cx, cy);
    // crisp dark edge
    x.strokeStyle = '#3a2a08';
    x.lineWidth = 3;
    x.strokeText(letter, cx, cy);
    return (bigLetterCache[letter] = c);
  }

  function startEncounter(h) {
    eddieVisit = null; // the quiz takes over the screen; don't strand him on it
    battleSnap = document.createElement('canvas');
    battleSnap.width = SW; battleSnap.height = SH;
    // upright, the world is drawn below the top bar -- grab THAT, not the HUD
    battleSnap.getContext('2d').drawImage(canvas, 0, portrait ? TOP_H : 0, SW, SH, 0, 0, SW, SH);
    battle = { phase: 'intro', t: 0, letter: h.letter };
    state = 'battle';
    G.Audio.sfx('encounter');
    G.Audio.playBattle();
  }

  function winBattle() {
    battle.phase = 'outro';
    battle.t = 0;
  }

  // the moment the quiz is answered right: looping victory jingle +
  // celebration until the player presses enter, then the award pages
  function battleVictory(next) {
    battle.phase = 'victory';
    battle.t = 0;
    battle.next = next;
    battle.remaining = 3 - G.Quest.countFound();
    G.Input.clearEdges();
    G.Audio.playVictory();
  }

  function updateBattle(dt) {
    battle.t += dt;
    if (battle.phase === 'intro') {
      if (battle.t >= 1.4) {
        battle.phase = 'ask';
        battle.t = 0;
        G.Dialogue.start([
          { text: 'THE LETTER ' + battle.letter + ' APPEARS!' }
        ], { onDone: function () { G.Quest.battleAsk(winBattle); } });
      }
    } else if (battle.phase === 'ask') {
      G.Dialogue.update(ctx);
    } else if (battle.phase === 'victory') {
      if (G.Input.consumeAction()) {
        G.Audio.sfx('blip');
        battle.phase = 'ask';
        battle.t = 0;
        var next = battle.next;
        battle.next = null;
        if (next) next();
      }
    } else if (battle.phase === 'outro') {
      if (battle.t >= 0.6) {
        state = 'play';
        battle = null;
        battleSnap = null;
        // the victory song plays right up until the letter leaves the screen
        G.Audio.stopVictory();
        G.Audio.stopBattle();
        // Eddie couldn't fly while the battle screen covered the world;
        // now that it's gone, let him swoop in with the next lead
        flybyRoom = G.Quest.catchRoom();
      }
    }
  }

  function drawBattle() {
    if (battle.phase === 'intro' && battleSnap) {
      // the classic encounter swirl: spin + shrink + strobe
      var p = Math.min(1, battle.t / 1.4);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SW, SH);
      ctx.save();
      ctx.translate(SW / 2, SH / 2);
      ctx.rotate(p * Math.PI * 3);
      var sc = 1 - p * 0.92;
      ctx.scale(sc, sc);
      ctx.drawImage(battleSnap, -SW / 2, -SH / 2);
      ctx.restore();
      if (battle.t < 0.6 && Math.floor(battle.t * 14) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(0, 0, SW, SH);
      }
      return;
    }

    // the showdown: big letter on a dark stage
    var grad = ctx.createLinearGradient(0, 0, 0, SH);
    grad.addColorStop(0, '#060a18');
    grad.addColorStop(0.7, '#0e1c3a');
    grad.addColorStop(1, '#123626');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SW, SH);
    // starry sparkle backdrop
    for (var i = 0; i < 24; i++) {
      var sx = (i * 67) % SW, sy = (i * 41) % 150;
      ctx.fillStyle = (Math.floor(Date.now() / 350) + i) % 5 === 0 ? '#fff' : 'rgba(255,255,255,0.25)';
      ctx.fillRect(sx, sy, 1, 1);
    }
    // floor platform (like the battle ground patch)
    ctx.fillStyle = '#d9c9a8';
    ctx.beginPath();
    ctx.ellipse(SW / 2, 152, 92, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(SW / 2, 156, 80, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE LETTER - big, golden, 3D (happy bounce while celebrating)
    var bob = battle.phase === 'victory'
      ? -Math.abs(Math.sin(battle.t * 5)) * 16
      : Math.sin(battle.t * 2.5) * 4;
    var big = makeBigLetter(battle.letter);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(SW / 2, 150, 52, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(big, SW / 2 - big.width / 2, -4 + bob);
    // orbiting sparkles
    for (var s = 0; s < 4; s++) {
      var a = battle.t * 2 + s * 1.6;
      ctx.fillStyle = s % 2 ? '#fdf0a8' : '#ffffff';
      ctx.fillRect(SW / 2 + Math.cos(a) * 82 - 1, 76 + bob + Math.sin(a) * 48 - 1, 3, 3);
    }

    if (battle.phase === 'ask') G.Dialogue.draw(ctx);

    if (battle.phase === 'victory') {
      // star burst radiating out from the letter
      for (var v = 0; v < 12; v++) {
        var ang = v * 0.524 + Math.floor(battle.t * 4) * 0.26;
        var rad = 34 + ((battle.t * 95 + v * 17) % 62);
        ctx.fillStyle = v % 3 === 0 ? '#fff' : '#f7d84d';
        ctx.fillRect(SW / 2 + Math.cos(ang) * rad - 1, 78 + Math.sin(ang) * rad * 0.6 - 1, 3, 3);
      }
      // flashing THAT'S CORRECT!
      ctx.textAlign = 'center';
      ctx.font = font(11);
      ctx.fillStyle = '#000';
      ctx.fillText("THAT'S CORRECT!", SW / 2 + 1, 172 + 1);
      ctx.fillStyle = Math.floor(battle.t * 6) % 2 ? '#f7d84d' : '#ffffff';
      ctx.fillText("THAT'S CORRECT!", SW / 2, 172);
      // message window (matches the dialogue style)
      var wx = 6, wy = 182, ww = SW - 12, wh = 52;
      var wg = ctx.createLinearGradient(0, wy, 0, wy + wh);
      wg.addColorStop(0, '#1d5c35');
      wg.addColorStop(1, '#0d3a1f');
      ctx.fillStyle = wg;
      ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = '#e8e8f4';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx + 1.5, wy + 1.5, ww - 3, wh - 3);
      ctx.font = font(8);
      ctx.fillStyle = '#fff';
      var msg = battle.remaining <= 0
        ? 'You found ALL FOUR letters!'
        : 'Only ' + battle.remaining + (battle.remaining === 1 ? ' letter remains!' : ' letters remain!');
      ctx.fillText(msg, SW / 2, wy + 22);
      if (Math.floor(battle.t * 2.5) % 2 === 0) {
        ctx.fillStyle = '#f7d84d';
        ctx.fillText('- PRESS ENTER -', SW / 2, wy + 40);
      }
      ctx.textAlign = 'left';
    }

    if (battle.phase === 'outro') {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, 1 - battle.t / 0.6) + ')';
      ctx.fillRect(0, 0, SW, SH);
    }
  }

  // ---- caught letters trail behind the player like a golden parade --------
  // the trail always READS S-O-A-R on screen: the order the letters line up
  // in flips with the direction the player faces (left/up walks would
  // otherwise show them reversed as "RAOS")
  var trail = [];        // sampled player footprints, newest first
  var followers = {};    // letter -> {x, y} current float position

  function recordTrail() {
    if (!trail.length ||
        Math.abs(trail[0].x - player.x) + Math.abs(trail[0].y - player.y) >= 4) {
      trail.unshift({ x: player.x, y: player.y });
      if (trail.length > 80) trail.pop();
    }
  }

  // the point `dist` pixels back along the player's path
  function trailPoint(dist) {
    var prev = { x: player.x, y: player.y };
    var d = 0;
    for (var i = 0; i < trail.length; i++) {
      var seg = Math.hypot(trail[i].x - prev.x, trail[i].y - prev.y);
      if (d + seg >= dist) {
        var f = (dist - d) / (seg || 1);
        return { x: prev.x + (trail[i].x - prev.x) * f, y: prev.y + (trail[i].y - prev.y) * f };
      }
      d += seg;
      prev = trail[i];
    }
    return prev;
  }

  function resetFollowers() {
    trail.length = 0;
    G.Quest.carriedLetters().forEach(function (l) {
      followers[l] = { x: player.x, y: player.y };
    });
  }

  function updateFollowers(dt) {
    var carried = G.Quest.carriedLetters();
    // facing right/down: the trail stretches left/up of the player, so S
    // rides FARTHEST to sit leftmost/topmost. facing left/up: the trail
    // stretches right/down, so S rides CLOSEST instead. either way the
    // letters read S-O-A-R across (or down) the screen.
    var flip = player.dir === 'left' || player.dir === 'up';
    carried.forEach(function (l, i) {
      var f = followers[l] || (followers[l] = { x: player.x, y: player.y });
      var rank = flip ? i + 1 : carried.length - i;
      var t = trailPoint(rank * 14);
      var k = Math.min(1, dt * 10);
      f.x += (t.x - f.x) * k;
      f.y += (t.y - f.y) * k;
    });
  }

  function drawFollowers(cam) {
    if (ceremony) return; // they're busy flying to the wall
    var carried = G.Quest.carriedLetters();
    carried.forEach(function (l, i) {
      var f = followers[l];
      if (!f) return;
      var bob = Math.sin(Date.now() / 240 + i * 1.3) * 2;
      var x = Math.round(f.x - cam.x), y = Math.round(f.y - cam.y);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 15.5, 4.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(G.Quest.icons[l], x + 2, y - 7 + bob, 12, 12);
      // an occasional twinkle so the gold really reads as magic
      if ((Math.floor(Date.now() / 160) + i * 3) % 9 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1 + (i * 5) % 12, y - 8 + bob, 2, 2);
      }
    });
  }

  // ---- guide arrow: points the student toward the current objective -------
  // far away: a gold arrow floats in front of the student, aimed at the
  // target. within a few tiles: it hops above the target and points straight
  // down so there's no missing who (or what) to visit.
  function guideTargetPos() {
    var g = G.Quest.guide();
    if (!g) return null;
    var m = map();
    function npcPos(match) {
      for (var i = 0; i < m.npcs.length; i++) {
        var n = m.npcs[i];
        if (match(n)) {
          return {
            x: (n.px !== undefined ? n.px : n.x * TS) + 8,
            y: (n.py !== undefined ? n.py : n.y * TS) + 8
          };
        }
      }
      return null;
    }
    function tileMid(k) {
      var xy = k.split(',');
      return { x: +xy[0] * TS + 8, y: +xy[1] * TS + 8 };
    }
    // nearest tile on this map matching a test, measured from the student
    function nearestStair(test) {
      var best = null, bd = Infinity;
      Object.keys(m.stairs || {}).forEach(function (k) {
        if (!test(m.stairs[k])) return;
        var p = tileMid(k);
        var dx = p.x - (player.x + 8), dy = p.y - (player.y + 8);
        var d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = p; }
      });
      return best;
    }
    // the target is somewhere else entirely: point at the way there rather
    // than going blank. Inside a room that means its door; out in a hallway
    // it means the closest stairwell that actually serves the right floor.
    function towardRoom(roomId) {
      var r = G.ROOMS[roomId];
      if (!r) return null;
      if (!m.isHall) {
        return nearestStair(function (st) { return st.exit; }) ||
               nearestStair(function (st) { return st.goRoom; });
      }
      // aim for the hallway the room's door actually opens onto, NOT its
      // nominal floor (see G.Maps.hallOf -- Dance & Drama is the awkward one)
      var hall = G.Maps.hallOf(roomId);
      if (hall === currentMapId) return null; // same hallway, nothing to add
      return nearestStair(function (st) {
        return st.options && st.options.some(function (o) { return o.map === hall; });
      });
    }
    function doorTo(roomId) {
      var r = G.Maps.returns[roomId + ':0'];
      if (r && r.map === currentMapId) return { x: r.x * TS + 8, y: r.y * TS + 8 };
      return towardRoom(roomId);
    }
    if (g.kind === 'eddie') return npcPos(function (n) { return n.kind === 'eagle'; });
    if (g.kind === 'walker') {
      if (currentMapId === 'm-walker') return npcPos(function (n) { return n.roomId === 'm-walker'; });
      return doorTo('m-walker');
    }
    var roomId = g.roomId;
    var inRoom = currentMapId === roomId ||
      (roomId === 'b-gym' && currentMapId === 'basement' && inGymArea());
    if (g.kind === 'hunt') {
      if (inRoom && g.spot && g.spot.tiles && g.spot.tiles.length) {
        // the nearest object that counts
        var best = null, bd = Infinity;
        g.spot.tiles.forEach(function (t) {
          var dx = t[0] * TS + 8 - (player.x + 8), dy = t[1] * TS + 8 - (player.y + 8);
          var d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = { x: t[0] * TS + 8, y: t[1] * TS + 8 }; }
        });
        return best;
      }
      // the gym has no door of its own, so doorTo/towardRoom come up empty
      // once you're already on the basement map -- aim at Ms. Kirk instead
      if (roomId === 'b-gym' && currentMapId === 'basement') {
        return npcPos(function (n) { return n.roomId === 'b-gym'; }) || doorTo(roomId);
      }
      return doorTo(roomId);
    }
    // g.kind === 'room': a hint points at a teacher
    if (roomId === 'b-gym' && currentMapId === 'basement') {
      return npcPos(function (n) { return n.roomId === 'b-gym'; });
    }
    if (currentMapId === roomId) return npcPos(function (n) { return n.roomId === roomId; });
    return doorTo(roomId);
  }

  function drawArrowAt(x, y, angle) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.fillStyle = '#1e7a3c';                     // school-green outline,
                                                   // same as the sidebar prompt
    ctx.beginPath();
    ctx.moveTo(9, 0); ctx.lineTo(-3, -7); ctx.lineTo(-3, -2.5); ctx.lineTo(-9, -2.5);
    ctx.lineTo(-9, 2.5); ctx.lineTo(-3, 2.5); ctx.lineTo(-3, 7); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7d84d';                     // gold
    ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-1.5, -5); ctx.lineTo(-1.5, -1.2); ctx.lineTo(-7.5, -1.2);
    ctx.lineTo(-7.5, 1.2); ctx.lineTo(-1.5, 1.2); ctx.lineTo(-1.5, 5); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGuideArrow(cam) {
    if (G.Dialogue.isActive() || ceremony) return;
    var t = guideTargetPos();
    if (!t) return;
    var px = player.x + 8, py = player.y + 8;
    var dx = t.x - px, dy = t.y - py;
    var dist = Math.hypot(dx, dy);
    if (dist < 56) {
      // hover right above the target, pointing down at it
      var bob = Math.sin(Date.now() / 180) * 2.5;
      drawArrowAt(t.x - cam.x, t.y - 30 - cam.y + bob, Math.PI / 2);
    } else {
      // float ahead of the student, aimed at the target
      var a = Math.atan2(dy, dx);
      var pulse = Math.sin(Date.now() / 200) * 2;
      drawArrowAt(
        px + Math.cos(a) * (22 + pulse) - cam.x,
        py + Math.sin(a) * (22 + pulse) - cam.y - 4,
        a
      );
    }
  }

  // ---- the delivery ceremony: letters fly onto Mrs. Walker's banner -------
  var ceremony = null; // {items, t, sparkles, flash, settle, onDone}

  function deliverLetters(letters, onDone) {
    var m = map();
    var slots = {};
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        var t = m.get(x, y);
        if (t && t.indexOf('banner:') === 0) slots[t.split(':')[1]] = { x: x, y: y };
      }
    }
    var items = letters.map(function (l, i) {
      var f = followers[l] || { x: player.x, y: player.y };
      var slot = slots[l] || { x: Math.floor(player.x / TS), y: 0 };
      return {
        letter: l,
        sx: f.x + 2, sy: f.y - 7,
        tx: slot.x * TS + 2, ty: slot.y * TS + 2,
        delay: 0.6 + i * 0.55,
        t: 0, landed: false
      };
    });
    ceremony = { items: items, t: 0, sparkles: [], flash: 0, settle: 0, onDone: onDone };
    G.Audio.sfx('encounter'); // the dramatic wind-up sting
  }

  function ceremonyPos(it) {
    // an eased arc: up and over from the player to the banner slot
    var p = it.t < 0.5 ? 2 * it.t * it.t : 1 - Math.pow(-2 * it.t + 2, 2) / 2;
    var mx = (it.sx + it.tx) / 2;
    var my = Math.min(it.sy, it.ty) - 46;
    var u = 1 - p;
    return {
      x: u * u * it.sx + 2 * u * p * mx + p * p * it.tx,
      y: u * u * it.sy + 2 * u * p * my + p * p * it.ty
    };
  }

  function burstSparkles(x, y) {
    for (var i = 0; i < 14; i++) {
      var a = (i / 14) * Math.PI * 2;
      var sp = 24 + Math.random() * 42;
      ceremony.sparkles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 12,
        life: 0.5 + Math.random() * 0.45,
        c: i % 3 === 0 ? '#ffffff' : '#f7d84d'
      });
    }
  }

  function updateCeremony(dt) {
    var c = ceremony;
    c.t += dt;
    var FLY = 1.1;
    var allLanded = true;
    c.items.forEach(function (it) {
      if (it.landed) return;
      var lt = c.t - it.delay;
      if (lt < 0) { allLanded = false; return; }
      it.t = lt / FLY;
      if (it.t >= 1) {
        it.landed = true;
        G.Quest.deliver(it.letter);
        delete followers[it.letter];
        burstSparkles(it.tx + 6, it.ty + 6);
        c.flash = 0.22;
        G.Audio.sfx(G.Quest.allDelivered() ? 'victory' : 'fanfare');
      } else {
        allLanded = false;
      }
    });
    if (c.flash > 0) c.flash -= dt;
    c.sparkles = c.sparkles.filter(function (s) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 60 * dt;
      return s.life > 0;
    });
    if (allLanded) {
      c.settle += dt;
      if (c.settle > 1.1) {
        var done = c.onDone;
        ceremony = null;
        G.Input.clearEdges(); // mashing enter mid-ceremony shouldn't skip her reaction
        if (done) done();
      }
    }
  }

  function drawCeremony(cam) {
    var c = ceremony;
    ctx.imageSmoothingEnabled = false;
    c.items.forEach(function (it, i) {
      if (it.landed) return;
      var lt = c.t - it.delay;
      var x, y, w = 12;
      if (lt < 0) {
        // waiting its turn: quivering with excitement where it floated
        x = it.sx + Math.sin(c.t * 22 + i) * 1.2;
        y = it.sy + Math.sin(c.t * 17 + i * 2) * 1.2;
      } else {
        var pos = ceremonyPos(it);
        x = pos.x; y = pos.y;
        // spin as it flies
        w = Math.max(2, Math.abs(Math.cos(it.t * Math.PI * 4)) * 12);
        // glittering comet tail
        if (Math.floor(c.t * 60) % 2 === 0) {
          c.sparkles.push({
            x: x + 6, y: y + 6,
            vx: (Math.random() - 0.5) * 14, vy: 8 + Math.random() * 10,
            life: 0.3 + Math.random() * 0.2, c: '#fdf0a8'
          });
        }
      }
      ctx.drawImage(G.Quest.icons[it.letter], Math.round(x - cam.x + (12 - w) / 2), Math.round(y - cam.y), w, 12);
    });
    c.sparkles.forEach(function (s) {
      ctx.globalAlpha = Math.min(1, s.life * 2.5);
      ctx.fillStyle = s.c;
      ctx.fillRect(Math.round(s.x - cam.x), Math.round(s.y - cam.y), 2, 2);
    });
    ctx.globalAlpha = 1;
    if (c.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (c.flash * 2.6).toFixed(2) + ')';
      ctx.fillRect(0, 0, SW, SH);
    }
  }

  // ---- Eddie's rescue flyby ----------------------------------------------
  // Wander too long without turning up a letter or a clue and Eddie swoops in,
  // hovers over the student, names a teacher who really has one, and leaves.
  // He works in SCREEN pixels: he is pinned to the player, so the off-screen
  // entrance and the "stay clear of the dialogue box" clamp both fall out.
  var eddieVisit = null; // {phase:'in'|'talk'|'out', t, flap, fromLeft, x, y}
  var EDDIE_IN = 1.1, EDDIE_OUT = 1.1;

  // the real Eddie stands in the spawn hallway (maps.js) -- one is plenty
  function eagleOnScreen() {
    var m = map(), cam = cameraPos();
    for (var i = 0; i < m.npcs.length; i++) {
      var n = m.npcs[i];
      if (n.kind !== 'eagle') continue;
      var sx = (n.px !== undefined ? n.px : n.x * TS) - cam.x;
      var sy = (n.py !== undefined ? n.py : n.y * TS) - cam.y;
      if (sx > -24 && sx < SW + 24 && sy > -24 && sy < SH + 24) return true;
    }
    return false;
  }

  // line is optional: without one he improvises a rescue hint on arrival
  function startEddieVisit(line) {
    var cam = cameraPos();
    var pSX = player.x + 8 - cam.x;
    // come from whichever side gives the longer, more visible run
    var fromLeft = pSX > SW / 2;
    eddieVisit = {
      phase: 'in', t: 0, flap: 0, fromLeft: fromLeft,
      x: fromLeft ? -40 : SW + 40,
      y: 60, line: line || null
    };
    G.Audio.sfx('squawk');
  }

  // where he wants to sit: just above the student's head, but always high
  // enough that the dialogue box (70px tall at the bottom) can't swallow him
  function eddieHoverSpot() {
    var cam = cameraPos();
    return {
      x: Math.max(24, Math.min(SW - 24, player.x + 8 - cam.x)),
      y: Math.max(14, Math.min(138, player.y + 8 - cam.y - 34))
    };
  }

  function updateEddieVisit(dt) {
    var e = eddieVisit;
    e.t += dt;
    e.flap += dt; // monotonic, so the wings don't stutter when a phase resets t
    var spot = eddieHoverSpot();

    if (e.phase === 'in') {
      var p = Math.min(1, e.t / EDDIE_IN);
      var ease = 1 - (1 - p) * (1 - p); // glide in and settle
      var x0 = e.fromLeft ? -40 : SW + 40;
      e.x = x0 + (spot.x - x0) * ease;
      e.y = 60 + (spot.y - 60) * ease;
      if (p < 1) return;
      // the student sorted themselves out mid-swoop: peel off without a word
      // (a post-catch visit carries its own line, so it always gets said)
      if (!e.line && !G.Quest.needsHint()) { e.phase = 'out'; e.t = 0; return; }
      // somebody else is mid-sentence -- hover and wait rather than barge in
      if (G.Dialogue.isActive()) return;
      var line = e.line || G.Quest.eddieHintLine();
      if (!line) { e.phase = 'out'; e.t = 0; return; }
      e.phase = 'talk';
      e.t = 0;
      G.Input.clearEdges(); // a button held during the swoop mustn't skip his line
      G.Dialogue.start([{ name: 'EDDIE THE EAGLE', text: 'SQUAWK! ' + line }], {
        onDone: function () {
          if (!eddieVisit) return;
          eddieVisit.phase = 'out';
          eddieVisit.t = 0;
        }
      });
      return;
    }

    // hovering while the hint is on screen: keep tracking the student and flap
    if (e.phase === 'talk') {
      e.x = spot.x;
      e.y = spot.y + Math.sin(e.t * 4) * 2.5;
      return;
    }

    // and away he goes, out the far side
    var op = e.t / EDDIE_OUT;
    e.x += (e.fromLeft ? 1 : -1) * (90 + op * 260) * dt;
    e.y -= 24 * dt;
    if (e.t >= EDDIE_OUT || e.x < -60 || e.x > SW + 60) eddieVisit = null;
  }

  function drawEddieVisit() {
    var e = eddieVisit;
    // the flight frames face LEFT, so mirror him when he is heading right
    // (entering from the left edge means he travels rightward throughout)
    var goingRight = e.fromLeft;
    var frame = eagleFlyFrames[Math.floor(e.flap * 7) % 2];
    var x = Math.round(e.x), y = Math.round(e.y);
    ctx.save();
    if (goingRight) {
      ctx.translate(x + 16, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(frame, 0, y);
    } else {
      ctx.drawImage(frame, x - 16, y);
    }
    ctx.restore();
  }

  // ---- movement & collision ----------------------------------------------
  function solidAt(px, py) {
    var m = map();
    var tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    // during the party the gym is the whole world (and the DJ table is real)
    if (party) {
      if (px < 21 * TS) return 'wall';
      if (ty === BOOTH.y && tx >= BOOTH.x0 && tx <= BOOTH.x1) return 'booth';
    }
    var t = m.get(tx, ty);
    if (!G.Tiles.isWalkable(t)) return t || 'void';
    // NPCs are solid (their body, plus the tile they're stepping into)
    for (var i = 0; i < m.npcs.length; i++) {
      var n = m.npcs[i];
      var nx = (n.px !== undefined) ? n.px : n.x * TS;
      var ny = (n.py !== undefined) ? n.py : n.y * TS;
      if (px >= nx && px < nx + TS && py >= ny && py < ny + TS) return 'npc';
      if (n.tx !== undefined && tx === n.tx && ty === n.ty) return 'npc';
    }
    return null;
  }

  // a tile is off-limits to wandering staff if it -- or any tile right next
  // to it -- is a doorway, mat or stairway. That one-tile buffer means a
  // roaming staff member can never park in front of a door and block it.
  function nearDoorish(m, x, y) {
    var D = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < D.length; i++) {
      var t = m.get(x + D[i][0], y + D[i][1]);
      if (t === 'door' || t === 'mat' || t === 'stairU' || t === 'stairD') return true;
      var key = (x + D[i][0]) + ',' + (y + D[i][1]);
      if ((m.doors && m.doors[key]) || (m.stairs && m.stairs[key])) return true;
    }
    return false;
  }

  // ---- wandering teachers -------------------------------------------------
  function npcCanWalk(m, x, y) {
    var t = m.get(x, y);
    if (!G.Tiles.isWalkable(t)) return false;
    if (t === 'door' || t === 'mat' || t === 'stairU' || t === 'stairD') return false;
    if (nearDoorish(m, x, y)) return false; // never block a doorway
    var ptx = Math.floor((player.x + 8) / TS), pty = Math.floor((player.y + 11) / TS);
    if (x === ptx && y === pty) return false;
    for (var i = 0; i < m.npcs.length; i++) {
      var o = m.npcs[i];
      if (o.x === x && o.y === y) return false;
      if (o.tx === x && o.ty === y) return false;
    }
    return true;
  }

  function updateNpcs(dt) {
    var m = map();
    m.npcs.forEach(function (n) {
      if (n.dancing) return; // party dancers groove via updateParty instead
      if (n.dollyDancing) return; // Mrs. Todd grooves via updateToddParty
      if (n.kind !== 'teacher' && n.kind !== 'eagle' && n.kind !== 'officer') return;
      var eagle = n.kind === 'eagle';   // Eddie is restless: fast, far-ranging
      if (n.hx === undefined) {
        n.hx = n.x; n.hy = n.y;
        n.px = n.x * TS; n.py = n.y * TS;
        n.timer = 1 + Math.random() * 2;
        n.anim = 0;
      }
      if (eagle) {
        // every few seconds Eddie spreads his wings for a beat as he roams --
        // just a happy stretch, not flying
        if (n.wingT === undefined) { n.wingT = 1.5 + Math.random() * 2.5; n.wingOpen = 0; }
        if (n.wingOpen > 0) { n.wingOpen -= dt; }
        else { n.wingT -= dt; if (n.wingT <= 0) { n.wingOpen = 0.45 + Math.random() * 0.35; n.wingT = 2.5 + Math.random() * 4; } }
      }
      if (n.tx !== undefined) {
        // mid-step
        var speed = (eagle ? 48 : 34) * dt;
        var dx = n.tx * TS - n.px, dy = n.ty * TS - n.py;
        n.anim += dt * 6;
        if (Math.abs(dx) <= speed && Math.abs(dy) <= speed) {
          n.px = n.tx * TS; n.py = n.ty * TS;
          n.x = n.tx; n.y = n.ty;
          n.tx = undefined;
          n.anim = 0;
          n.timer = eagle ? 0.15 + Math.random() * 0.5 : 0.6 + Math.random() * 1.2;
        } else {
          n.px += Math.sign(dx) * speed;
          n.py += Math.sign(dy) * speed;
        }
        return;
      }
      n.timer -= dt;
      if (n.timer > 0) return;
      var dirs = [['down', 0, 1], ['up', 0, -1], ['left', -1, 0], ['right', 1, 0]];
      var d;
      if (eagle && n.patrol && Math.random() < 0.85) {
        // Eddie patrols: keep marching the same way until he hits something
        d = dirs.filter(function (dd) { return dd[0] === n.patrol; })[0];
      } else {
        d = dirs[Math.floor(Math.random() * 4)];
      }
      n.dir = d[0];
      n.timer = eagle ? 0.15 + Math.random() * 0.4 : 0.5 + Math.random() * 1;
      if (!eagle && Math.random() < 0.15) return; // teachers sometimes just look around
      var nx = n.x + d[1], ny = n.y + d[2];
      var range = eagle ? 11 : 6;
      if (Math.abs(nx - n.hx) > range || Math.abs(ny - n.hy) > range ||
          !npcCanWalk(m, nx, ny)) {
        n.patrol = null; // blocked: pick a fresh direction next tick
        return;
      }
      n.patrol = d[0];
      n.tx = nx; n.ty = ny;
    });
  }

  function boxBlocked(x, y) {
    // feet collision box
    var pts = [
      [x + 2, y + 7], [x + 13, y + 7],
      [x + 2, y + 15], [x + 13, y + 15]
    ];
    for (var i = 0; i < pts.length; i++) {
      var s = solidAt(pts[i][0], pts[i][1]);
      if (s) return s;
    }
    return null;
  }

  // ---- click-to-move: walk to whatever the mouse picked -------------------
  function playerTile() {
    return { x: Math.floor((player.x + 8) / TS), y: Math.floor((player.y + 11) / TS) };
  }

  function onCanvasClick(e) {
    // stop iOS treating a quick second tap as double-tap-to-zoom
    if (e.cancelable) e.preventDefault();
    var r = canvas.getBoundingClientRect();
    var gx = (e.clientX - r.left) / r.width * canvas.width;
    var gy = (e.clientY - r.top) / r.height * canvas.height;
    // upright, the world sits below the top bar
    if (portrait) gy -= TOP_H;
    // the staff roster overlay swallows the next tap to close itself
    if (staffRosterOpen) { staffRosterOpen = false; G.Audio.sfx('blip'); return; }
    // tapping the "ASHLAND STAFF" readout opens the roster
    if (state === 'play' && !party && !G.Dialogue.isActive() && !transition &&
        !ceremony && staffHudHit(gx, gy)) {
      staffRosterOpen = true; G.Audio.sfx('blip'); return;
    }
    // picking a student, or an option in a conversation: press the one you
    // want with your finger instead of hunting for the right button
    if (state === 'charselect' && charSelectTap(gx, gy)) return;
    if (G.Dialogue.tapChoice(gx, gy)) return;
    // outside free play (title, dialogue, battle, menus...) a click is
    // simply the action button -- it advances whatever is on screen
    if (state !== 'play' || G.Dialogue.isActive() || transition || ceremony) {
      G.Input.pressAction();
      return;
    }
    // the stats panel isn't clickable, whichever side of the world it is on
    if (portrait ? (gy < 0 || gy >= SH) : gx >= SW) return;
    var cam = cameraPos();
    clickToWalk(gx + cam.x, gy + cam.y);
  }

  function clickToWalk(wx, wy) {
    var m = map();
    // at the party, tapping your OWN character busts a random dance move
    if (party && wx >= player.x - 3 && wx <= player.x + 19 &&
        wy >= player.y - 12 && wy <= player.y + 18) {
      startPlayerDance(Math.floor(Math.random() * 10));
      return;
    }
    // a person under the click? (generous box around the sprite)
    var who = null;
    m.npcs.forEach(function (n) {
      var npx = (n.px !== undefined) ? n.px : n.x * TS;
      var npy = (n.py !== undefined) ? n.py : n.y * TS;
      if (wx >= npx - 2 && wx <= npx + 18 && wy >= npy - 15 && wy <= npy + 18) who = n;
    });
    if (who) { startAutoWalk({ kind: 'npc', npc: who }); return; }

    var tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return;
    var t = m.get(tx, ty);
    var trigger = (m.doors && m.doors[tx + ',' + ty]) || (m.stairs && m.stairs[tx + ',' + ty]);
    if (G.Tiles.isWalkable(t) && !trigger && t !== 'door' && t !== 'stairU' && t !== 'stairD') {
      // plain floor: just walk there
      startAutoWalk({ kind: 'tile', x: tx, y: ty, onto: true });
    } else if (G.Tiles.isWalkable(t)) {
      // a door or stairway: walk onto it (the warp fires by itself)
      if (!party) startAutoWalk({ kind: 'tile', x: tx, y: ty, onto: true, goal: true });
    } else {
      // furniture, a sign, a switch: walk up next to it and take a look
      startAutoWalk({ kind: 'tile', x: tx, y: ty, interact: true });
    }
  }

  // BFS over walkable tiles; door/stair/warp tiles only allowed as the goal
  function findWalkPath(m, tx, ty, adjacent, goalIsTrigger) {
    function open(x, y) {
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
      var t = m.get(x, y);
      if (!G.Tiles.isWalkable(t)) return false;
      if (t === 'door' || t === 'mat' || t === 'stairU' || t === 'stairD') return false;
      if ((m.doors && m.doors[x + ',' + y]) || (m.stairs && m.stairs[x + ',' + y])) return false;
      return true;
    }
    var goals = {};
    if (adjacent) {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        if (open(tx + d[0], ty + d[1])) goals[(tx + d[0]) + ',' + (ty + d[1])] = true;
      });
    } else {
      if (!goalIsTrigger && !open(tx, ty)) return null;
      goals[tx + ',' + ty] = true;
    }
    if (!Object.keys(goals).length) return null;
    var s = playerTile();
    if (goals[s.x + ',' + s.y]) return [];
    var q = [[s.x, s.y]], from = {};
    from[s.x + ',' + s.y] = null;
    while (q.length) {
      var cur = q.shift();
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < dirs.length; i++) {
        var nx = cur[0] + dirs[i][0], ny = cur[1] + dirs[i][1];
        var key = nx + ',' + ny;
        if (from[key] !== undefined) continue;
        var isGoal = goals[key];
        if (!isGoal && !open(nx, ny)) continue;
        from[key] = cur;
        if (isGoal) {
          var path = [[nx, ny]];
          var b = cur;
          while (b && from[b[0] + ',' + b[1]] !== null) {
            path.unshift(b);
            b = from[b[0] + ',' + b[1]];
          }
          return path;
        }
        q.push([nx, ny]);
      }
    }
    return null;
  }

  function startAutoWalk(target) {
    var m = map();
    var path = target.kind === 'npc'
      ? findWalkPath(m, target.npc.x, target.npc.y, true)
      : findWalkPath(m, target.x, target.y, !target.onto, target.goal);
    if (!path) { autoWalk = null; return; }
    autoWalk = { path: path, i: 0, target: target };
    if (!path.length) arriveAutoWalk();
  }

  function arriveAutoWalk() {
    var t = autoWalk.target;
    autoWalk = null;
    var p = playerTile();
    var faceAndTalk = function (tx, ty) {
      var ddx = tx - p.x, ddy = ty - p.y;
      // interactions need a straight line, two tiles at most
      if ((ddx === 0) === (ddy === 0) || Math.abs(ddx) + Math.abs(ddy) > 2) return false;
      player.dir = ddx > 0 ? 'right' : ddx < 0 ? 'left' : ddy > 0 ? 'down' : 'up';
      tryInteract();
      return true;
    };
    if (t.kind === 'npc') {
      var n = t.npc;
      // teachers wander -- if this one strolled off mid-walk, chase once more
      var talked = faceAndTalk(n.tx !== undefined ? n.tx : n.x, n.ty !== undefined ? n.ty : n.y);
      if (!talked && (t.tries || 0) < 3) {
        startAutoWalk({ kind: 'npc', npc: n, tries: (t.tries || 0) + 1 });
      }
    } else if (t.interact) {
      faceAndTalk(t.x, t.y);
    }
  }

  function updateAutoWalk(dt) {
    var speed = (G.Input.held.run ? 148 : 88) * dt;
    var wp = autoWalk.path[autoWalk.i];
    var gx = wp[0] * TS, gy = wp[1] * TS - 3; // feet centered on the tile
    var moved = false;
    var ddx = gx - player.x, ddy = gy - player.y;
    if (Math.abs(ddx) > 0.5) {
      var sx = Math.sign(ddx) * Math.min(speed, Math.abs(ddx));
      player.dir = ddx > 0 ? 'right' : 'left';
      if (boxBlocked(player.x + sx, player.y)) { autoWalk = null; }
      else { player.x += sx; moved = true; }
    } else if (Math.abs(ddy) > 0.5) {
      var sy = Math.sign(ddy) * Math.min(speed, Math.abs(ddy));
      player.dir = ddy > 0 ? 'down' : 'up';
      if (boxBlocked(player.x, player.y + sy)) { autoWalk = null; }
      else { player.y += sy; moved = true; }
    }
    player.moving = moved;
    if (moved) {
      player.anim += dt * (G.Input.held.run ? 11 : 7);
      recordTrail();
    } else if (!autoWalk) {
      player.anim = 0;
      return;
    }
    if (Math.abs(gx - player.x) <= 0.5 && Math.abs(gy - player.y) <= 0.5) {
      player.x = gx; player.y = gy;
      autoWalk.i++;
      if (autoWalk.i >= autoWalk.path.length) {
        player.moving = false;
        player.anim = 0;
        arriveAutoWalk();
        return;
      }
      // chasing someone who wandered off our route's end? re-route (Eddie
      // especially never stands still for long)
      if (autoWalk.target.kind === 'npc') {
        var n2 = autoWalk.target.npc;
        var ntx = n2.tx !== undefined ? n2.tx : n2.x;
        var nty = n2.ty !== undefined ? n2.ty : n2.y;
        var last = autoWalk.path[autoWalk.path.length - 1];
        if (Math.abs(last[0] - ntx) + Math.abs(last[1] - nty) !== 1) {
          var tgt = autoWalk.target;
          tgt.replans = (tgt.replans || 0) + 1;
          if (tgt.replans <= 20) { startAutoWalk(tgt); return; }
        }
      }
    }
    checkTriggers();
  }

  function movePlayer(dt) {
    var held = G.Input.held;
    var speed = (held.run ? 148 : 88) * dt;
    var dx = 0, dy = 0;
    if (held.left) { dx = -1; player.dir = 'left'; }
    else if (held.right) { dx = 1; player.dir = 'right'; }
    if (held.up) { dy = -1; if (!dx) player.dir = 'up'; }
    else if (held.down) { dy = 1; if (!dx) player.dir = 'down'; }

    if (dx || dy) autoWalk = null;      // the d-pad overrides the mouse too
    else if (autoWalk) { updateAutoWalk(dt); return; }

    player.moving = !!(dx || dy);
    if (!player.moving) { player.anim = 0; return; }
    player.anim += dt * (held.run ? 11 : 7);
    recordTrail();

    if (dx && dy) { dx *= 0.72; dy *= 0.72; }

    if (dx) {
      var nx = player.x + dx * speed;
      var blockedX = boxBlocked(nx, player.y);
      if (blockedX) {
        // corner assist: slide vertically toward a nearby opening (e.g. a door)
        var nudgeY = findNudge(function (off) { return boxBlocked(nx, player.y + off); });
        if (nudgeY !== null) {
          player.y += Math.sign(nudgeY) * Math.min(Math.abs(nudgeY), speed);
        } else {
          bump(blockedX);
        }
      } else {
        player.x = nx;
      }
    }

    if (dy) {
      var ny = player.y + dy * speed;
      var blockedY = boxBlocked(player.x, ny);
      if (blockedY) {
        var nudgeX = findNudge(function (off) { return boxBlocked(player.x + off, ny); });
        if (nudgeX !== null) {
          player.x += Math.sign(nudgeX) * Math.min(Math.abs(nudgeX), speed);
        } else {
          bump(blockedY);
        }
      } else {
        player.y = ny;
      }
    }

    checkTriggers();
  }

  function findNudge(test) {
    // smallest offset (up to 7px either way) that would clear the obstacle
    for (var off = 1; off <= 7; off++) {
      if (!test(off)) return off;
      if (!test(-off)) return -off;
    }
    return null;
  }

  function bump(tileType) {
    if (tileType === 'purple' && bumpCooldown <= 0) {
      bumpCooldown = 2;
      G.Audio.sfx('locked');
      G.Dialogue.start([{ text: 'The doors to outside are locked until the first day of school!' }]);
    }
  }

  var lastTriggerKey = null;
  function checkTriggers() {
    if (party) return; // nobody leaves through a door mid-party
    var m = map();
    var cx = Math.floor((player.x + 8) / TS);
    var cy = Math.floor((player.y + 11) / TS);
    var key = cx + ',' + cy;

    var door = m.doors && m.doors[key];
    var st = m.stairs && m.stairs[key];
    if (!door && !st) { lastTriggerKey = null; return; }
    if (key === lastTriggerKey) return; // stay put until they step off and back on
    lastTriggerKey = key;

    if (door) enterRoom(door.roomId, door.exitIndex);
    else if (st.passTo) {
      // a door straight through the wall to the other side
      warpTo(currentMapId, st.passTo.x, st.passTo.y, player.dir, G.Maps.all[currentMapId].name, 'door');
    }
    else if (st.goRoom) goCustomDoor(st.goRoom, st.pairIndex);
    else if (st.exit) leaveRoom(st.roomId, st.exitIndex);
    else takeStairs(st);
  }

  var returnPoint = null; // where you were before your last door warp

  function rememberReturn() {
    returnPoint = {
      map: currentMapId,
      x: Math.floor((player.x + 8) / TS),
      y: Math.floor((player.y + 11) / TS)
    };
  }

  function goCustomDoor(targetId, pairIndex) {
    if (targetId === '_back') {
      var rp = returnPoint;
      if (!rp) {
        var sp0 = G.Maps.all.middle.spawn;
        rp = { map: 'middle', x: sp0.x, y: sp0.y };
      }
      warpTo(rp.map, rp.x, rp.y, 'down', G.Maps.all[rp.map].name, 'door');
      return;
    }
    var tm = G.Maps.all[targetId];
    if (tm && tm.isHall) {
      rememberReturn();
      var sp = tm.spawn;
      warpTo(targetId, sp.x, sp.y, sp.dir, tm.name, 'door');
    } else if (tm) {
      rememberReturn();
      enterRoom(targetId, pairIndex || 0);
    }
  }

  // if a destination tile has been painted over, find the closest open spot
  function findNearbyOpen(tx, ty) {
    var m = map();
    var queue = [[tx, ty]];
    var seen = {};
    var best = null;
    while (queue.length) {
      var c = queue.shift();
      var x = c[0], y = c[1];
      var k = x + ',' + y;
      if (seen[k] || x < -2 || y < -2 || x > m.w + 2 || y > m.h + 2) continue;
      seen[k] = 1;
      if (Math.abs(x - tx) > 25 || Math.abs(y - ty) > 25) continue;
      if (!boxBlocked(x * TS, y * TS)) {
        var t = m.get(x, y);
        var isTrigger = t === 'door' || t === 'mat' || t === 'stairU' || t === 'stairD';
        if (!isTrigger) return { x: x, y: y };
        if (!best) best = { x: x, y: y }; // a trigger tile beats being stuck
      }
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return best;
  }

  function unstickPlayer() {
    if (!boxBlocked(player.x, player.y)) return;
    var tx = Math.floor((player.x + 8) / TS);
    var ty = Math.floor((player.y + 11) / TS);
    var safe = findNearbyOpen(tx, ty);
    if (safe) {
      player.x = safe.x * TS;
      player.y = safe.y * TS;
      lastTriggerKey = safe.x + ',' + safe.y; // don't instantly re-trigger
    }
  }

  function warpTo(mapId, tx, ty, dir, bannerText, sfxName) {
    autoWalk = null; // a room change makes any old walking route nonsense
    eddieVisit = null; // he doesn't follow you through doors
    if (toddParty) endDollyParty(true); // leaving mid-boogie ends it quietly
    // stairwells get the real footsteps clip, and the fade is stretched to
    // match it so the last step lands as the new floor appears
    var fadeSpeed = 2.6, holdBlack = 0;
    if (sfxName === 'stairs') {
      var climb = G.Audio.playStairs();
      if (climb > 0) {
        var fade = Math.min(0.55, climb * 0.3);   // out, then in
        fadeSpeed = 1 / fade;
        holdBlack = Math.max(0, climb - fade * 2);
      } else {
        G.Audio.sfx(sfxName); // no clip: the old chiptune, old timing
      }
    } else {
      G.Audio.sfx(sfxName);
    }
    transition = {
      phase: 'out', t: 0, speed: fadeSpeed, hold: holdBlack,
      onMid: function () {
        currentMapId = mapId;
        player.x = tx * TS;
        player.y = ty * TS;
        player.dir = dir || 'down';
        player.anim = 0;
        unstickPlayer(); // edited maps may have walls where arrivals used to be
        // latch whatever tile we landed on: if the arrival spot is itself a
        // door/warp (e.g. a _back door returning you onto the outside door),
        // it must not fire until the player steps off and back on
        lastTriggerKey = Math.floor((player.x + 8) / TS) + ',' + Math.floor((player.y + 11) / TS);
        resetFollowers(); // the letters pop through the door right behind you
        showBanner(bannerText);
        // each floor has its own looping theme (the playground counts as
        // its own "floor" -- sunshine has a soundtrack too)
        var mm = G.Maps.all[mapId];
        var floor = (mm.isHall || mm.outdoor) ? mapId : G.ROOMS[mapId].floor;
        // "have they been downstairs?" means the hallway they actually walked
        // through, not the room's floor label -- a room entered through
        // another room's door shouldn't tick off a floor they never saw
        floorsSeen[(mm.isHall || mm.outdoor) ? mapId : G.Maps.hallOf(mapId)] = true;
        G.Audio.playFloor(floor);
      }
    };
  }

  function enterRoom(roomId, exitIndex) {
    // nothing opens until the player hears Eddie's story (before that they
    // can only be in the spawn hallway, so this gate can be global)
    if (!G.Quest.hasMetEddie()) {
      if (bumpCooldown <= 0) {
        bumpCooldown = 2;
        G.Audio.sfx('locked');
        G.Dialogue.start([{ text: 'EDDIE THE EAGLE looks like he REALLY needs to talk to you first!' }]);
      }
      return;
    }
    // the bookkeeper's office is the one room students are never let into
    if (roomId === 'm-eagles') {
      if (bumpCooldown <= 0) {
        bumpCooldown = 2;
        G.Audio.sfx('locked');
        G.Dialogue.start([{ text: "That's the bookkeeper's office -- students aren't allowed in there!" }]);
      }
      return;
    }
    // after Eddie, the ONLY room they may enter is Mrs. Walker's office, until
    // they have actually gone in and talked to her
    if (roomId !== 'm-walker' && !G.Quest.hasMetWalker()) {
      if (bumpCooldown <= 0) {
        bumpCooldown = 2;
        G.Audio.sfx('locked');
        G.Dialogue.start([{ text: 'Better see MRS. WALKER in her office first!' }]);
      }
      return;
    }
    var entry = G.Maps.entries[roomId + ':' + exitIndex] || G.Maps.entries[roomId + ':0'];
    if (!entry) return;
    // leaving the hallway to explore a real room -> the staff may speak up now
    if (roomId !== 'm-walker') G.Quest.unlockSuggestions();
    rememberReturn();
    visited[roomId] = true;
    warpTo(entry.map, entry.x, entry.y, entry.dir, locationLabel(roomId), 'door');
  }

  function leaveRoom(roomId, exitIndex) {
    // never strand the player: exact door, then the room's first door, then
    // ANY door of this room, then wherever they came from, then spawn
    var R = G.Maps.returns;
    var ret = R[roomId + ':' + exitIndex] || R[roomId + ':0'];
    if (!ret) {
      var anyKey = Object.keys(R).filter(function (k) {
        return k.indexOf(roomId + ':') === 0;
      })[0];
      if (anyKey) ret = R[anyKey];
    }
    if (!ret && returnPoint && returnPoint.map !== currentMapId) ret = returnPoint;
    if (!ret) {
      var sp = G.Maps.all.middle.spawn;
      ret = { map: 'middle', x: sp.x, y: sp.y, dir: sp.dir };
    }
    warpTo(ret.map, ret.x, ret.y, ret.dir || 'down', G.Maps.all[ret.map].name, 'door');
  }

  function takeStairs(st) {
    // stairwells stay shut until the player hears Eddie's story too
    if (!G.Quest.hasMetEddie()) {
      if (bumpCooldown <= 0) {
        bumpCooldown = 2;
        G.Audio.sfx('locked');
        G.Dialogue.start([{ text: 'EDDIE THE EAGLE looks like he REALLY needs to talk to you first!' }]);
      }
      return;
    }
    // ...and then until Mrs. Walker has sent them on their way
    if (!G.Quest.hasMetWalker()) {
      if (bumpCooldown <= 0) {
        bumpCooldown = 2;
        G.Audio.sfx('locked');
        G.Dialogue.start([{ text: 'Better see MRS. WALKER in her office before you go exploring!' }]);
      }
      return;
    }
    // leaving the hallway/floor -> the staff may speak up now
    G.Quest.unlockSuggestions();
    // stairwell doors ask which floor you want
    var choices = st.options.map(function (o) {
      return {
        label: o.label,
        cb: function () {
          if (G.ROOMS[o.map]) visited[o.map] = true; // stairs-only rooms
          warpTo(o.map, o.x, o.y, o.dir, o.label, 'stairs');
        }
      };
    });
    G.Audio.sfx('door');
    G.Dialogue.start([
      { text: 'You push open the heavy stairwell doors... Where do you want to go?' }
    ], { choices: choices });
  }

  function showBanner(text) {
    banner = { text: text, timer: 2.4 };
  }

  // ---- interaction --------------------------------------------------------
  // ---- look closer: press enter at wall decor to learn about it -----------
  var FACTS = {
    "wall": [
      "That's a wall.",
      "That's still a wall... why do you keep looking at it?",
      "Yep. Wall.",
      "The wall is flattered by all this attention.",
      "Okay! The wall says hi. Adventure is THAT way!"
    ],
    "floor": [
      "That's the floor. It's holding everything up!",
      "The floor is doing a great job today.",
      "Sparkling clean! Custodians are the real heroes.",
      "You could eat off this floor. Please don't.",
      "Floor rating: 10 out of 10."
    ],
    "green": [
      "Green tiles! Ashland's school color.",
      "These green tiles lead the way all around school.",
      "So shiny! Someone polished these this morning.",
      "Green means GO... but walk, don't run!",
      "Eagle green. Very stylish."
    ],
    "blue": [
      "Cool blue squares, right in the middle of the hall.",
      "Blue is for calm, happy walking.",
      "It is VERY tempting to hop on these. One small hop allowed.",
      "The hallway's favorite decoration.",
      "Blue! Like the sky at recess."
    ],
    "carpet": [
      "Soft carpet. Comfy!",
      "Perfect for sitting criss-cross applesauce.",
      "No muddy shoes on the carpet, please!",
      "This is where the best stories get read.",
      "So cozy you could nap. Don't, though. School!"
    ],
    "wood": [
      "A nice wood floor.",
      "Perfect for sock-sliding. Which is NOT allowed. But perfect.",
      "Shiny and smooth!",
      "Knock knock. It's wood.",
      "The fanciest floor in the whole school."
    ],
    "darkblue": [
      "Deep blue tiles. Fancy!",
      "Like walking on the ocean.",
      "Cool and calm, just like a good hallway walker.",
      "Somebody picked a GREAT color.",
      "Navy blue, Ashland true."
    ],
    "checker": [
      "A checkerboard floor!",
      "Perfect for a giant game of checkers.",
      "Check out this pattern!",
      "One square, two square, red square, blue square...",
      "Don't stare too long -- it makes your eyes wiggle."
    ],
    "starrug": [
      "A star rug! Every star is a student.",
      "Twinkle, twinkle.",
      "Circle time happens right here.",
      "Find YOUR star and take a seat.",
      "The comfiest constellation in school."
    ],
    "maprug": [
      "A world map rug! Can you find Kentucky?",
      "The blue parts are oceans. No swimming.",
      "So many places to visit someday.",
      "The whole world, right under your feet.",
      "Step on a continent! Now you're a world traveler."
    ],
    "shaperug": [
      "A shape rug! Circles, squares, triangles...",
      "Can you name every shape on it?",
      "Sit on your favorite shape.",
      "Triangles have three sides. Count them!",
      "Shapes are everywhere. Look around you!"
    ],
    "hopscotch": [
      "Hopscotch! 1... 2... 3...",
      "Hop to it!",
      "No skipping numbers. The floor is counting.",
      "The floor says: HOP.",
      "World-championship hopscotch happens right here."
    ],
    "foursquare": [
      "Four square! The greatest recess game ever invented.",
      "Serve it up!",
      "Everybody wants the king square.",
      "Bounce, bounce, WHAP!",
      "Winner stays. That's the rule."
    ],
    "gymfloor": [
      "The gym floor. Squeaky sneakers welcome.",
      "Bounce, bounce, SWISH!",
      "This is where the Eagles play.",
      "Painted lines mean serious basketball.",
      "That gym floor smell? That's the smell of victory."
    ],
    "door": [
      "A door! Walk into it to go through.",
      "Doors love being used. Go ahead!",
      "Knock knock. Who's there? You!",
      "Adventure is on the other side.",
      "The door is ready when you are."
    ],
    "stairs": [
      "Stairwell doors! Walk in to change floors.",
      "Up or down? You decide.",
      "Hold the handrail!",
      "One step at a time.",
      "The fastest way to another floor. Besides sliding. NO sliding."
    ],
    "mat": [
      "A door mat. Step on it to head out.",
      "WELCOME! That's what mats do best.",
      "Wipe your feet!",
      "Step here to leave the room.",
      "The politest part of the floor."
    ],
    "purple": [
      "Glass doors to outside. Locked until the first day of school!",
      "You can see summer out there.",
      "Locked tight. Safety first!",
      "Soon these doors will be FULL of students.",
      "The sunshine is just visiting for now."
    ],
    "deskS": [
      "A student desk, all ready for day one.",
      "Somebody amazing is going to sit here.",
      "Fresh pencils fit perfectly inside.",
      "No gum under THIS desk. Let's keep it that way!",
      "Could this be YOUR desk this year?"
    ],
    "deskT": [
      "The teacher's desk. Command central!",
      "Papers, pens, and probably a secret snack drawer.",
      "The stapler has a name. It's Gary.",
      "Everything a teacher needs, right here.",
      "Neat and tidy... for now."
    ],
    "shelf": [
      "A bookshelf FULL of adventures.",
      "So many books, so little time!",
      "Please put books back where you found them.",
      "There's a dinosaur book in here somewhere. There always is.",
      "Pick one book and the shelf is happy."
    ],
    "table": [
      "A big table for working together.",
      "Room for the whole crew.",
      "Perfect for art projects.",
      "Teamwork happens at this table.",
      "The table has heard a MILLION great ideas."
    ],
    "counter": [
      "A long counter. Very useful!",
      "Experiments happen here.",
      "Keep it clean, keep it neat.",
      "Great for lining things up in a row.",
      "This counter has seen a LOT of glue."
    ],
    "piano": [
      "A piano! Do, re, mi!",
      "Eighty-eight keys of fun.",
      "Please play gently.",
      "Chopsticks is always allowed.",
      "The piano is warming up for the first concert."
    ],
    "plant": [
      "A happy classroom plant.",
      "His name is Fernando. Ask anyone.",
      "Plants love water and sunshine.",
      "Still growing. Just like you!",
      "Green and proud of it."
    ],
    "hoop": [
      "The basketball hoop. SWISH!",
      "Ms. Kirk says she can dunk. Nobody has ever seen it.",
      "Nothing but net!",
      "Practice makes progress.",
      "The rim is ten feet up. That's TALL."
    ],
    "chair": [
      "A chair. Four legs, no waiting.",
      "Have a seat!",
      "Push it in when you're done, please.",
      "This chair is saving a spot for someone special.",
      "Sit tall, learn big."
    ],
    "smarttv": [
      "The smart TV! Teachers can draw right on the screen.",
      "It shows an Ashland Eagles logo when it sleeps.",
      "No, you cannot watch cartoons on it. Nice try!",
      "It knows math games. GOOD math games.",
      "Please don't touch with sticky fingers."
    ],
    "tvcart": [
      "The smart board on its rolling cart.",
      "It goes wherever the learning goes.",
      "The wheels squeak a tiny bit. It adds character.",
      "Wires everywhere. Do not tug!",
      "Movie day? Maybe... if everyone works hard."
    ],
    "bigchair": [
      "The teacher's big chair. VERY official.",
      "Comfy AND in charge.",
      "Only the teacher sits here. House rules.",
      "It spins. Slowly. Majestically.",
      "The throne of learning."
    ],
    "poster1": [
      "A poster that says: READING TAKES YOU PLACES!",
      "A kitten hanging from a branch: HANG IN THERE!",
      "It says: WORK HARD AND BE KIND.",
      "Posters are the walls' way of cheering for you.",
      "Somebody picked this poster with love."
    ],
    "poster2": [
      "This poster says: MISTAKES MEAN YOU ARE LEARNING!",
      "It says: ASK GREAT QUESTIONS!",
      "A very encouraging poster.",
      "The corners are taped down EXTRA well.",
      "Ten out of ten poster."
    ],
    "abc": [
      "A B C D E F G... you know the rest!",
      "The alphabet marches across the wall.",
      "Which letter is YOUR favorite?",
      "Twenty-six letters, infinite words.",
      "The alphabet: now with all the letters."
    ],
    "rug": [
      "A classroom rug. Best seat in the house.",
      "Story time headquarters.",
      "The criss-cross applesauce zone.",
      "A soft landing for big ideas.",
      "The rug welcomes all readers."
    ],
    "cabinet": [
      "A big blue cabinet. What's inside?",
      "Supplies! Probably. It's locked.",
      "This is where the glue sticks live.",
      "Do NOT climb it.",
      "Organized on the outside. Mystery on the inside."
    ],
    "cubbies": [
      "Cubbies! One for every student.",
      "Backpacks, coats, and lunchboxes go here.",
      "Every cubby gets a name tag on day one.",
      "Ashland blue, of course.",
      "A tidy cubby is a happy cubby."
    ],
    "clock": [
      "Tick tock! Almost time for the new school year.",
      "The clock says it's letter-hunting time!",
      "Tick... tock... tick... tock...",
      "Time flies when you're having fun at Ashland.",
      "Is it lunchtime yet? The clock knows. It's not telling."
    ],
    "flag": [
      "The American flag stands proudly in every classroom.",
      "Fifty stars and thirteen stripes!",
      "Students say the Pledge of Allegiance here every morning.",
      "It waves a tiny bit when the air conditioning kicks on.",
      "Red, white, and blue -- right at home in green-and-white Ashland."
    ],
    "calendar": [
      "The calendar says AUGUST. Almost the first day!",
      "Picture day is circled in red. Practice your smile!",
      "Every day at Ashland is a good day.",
      "Somebody's birthday is on there. Maybe yours!",
      "Flip, flip, flip... summer went fast!"
    ],
    "numberline": [
      "The number line marches up the wall!",
      "Skip counting: 5... 10... 15... 20!",
      "Numbers go on forever. This wall had to stop somewhere.",
      "Count up, count down, count all around.",
      "Math starts HERE."
    ],
    "extinguisher": [
      "A fire extinguisher. Safety first -- that's the S in SOAR!",
      "For emergencies only!",
      "Red, ready, and hopefully very bored.",
      "Firefighters approve of this wall.",
      "Do not touch. DO feel safe."
    ],
    "beanbag": [
      "A beanbag chair. FLUMP!",
      "The squishiest seat in school.",
      "Great for reading. Amazing for flopping.",
      "It remembers your shape. Cozy!",
      "One flop per customer, please."
    ],
    "fishtank": [
      "A fish tank! Blub blub.",
      "The fish are excellent listeners.",
      "Feeding the fish is a VERY important classroom job.",
      "The fish have names. They keep forgetting them.",
      "Watching fish is scientifically calming."
    ],
    "globe": [
      "Give the globe a gentle spin!",
      "Where in the world will YOU go someday?",
      "Kentucky is right... THERE.",
      "Oceans, mountains, and deserts, all on one ball.",
      "The world is round. The globe agrees."
    ],
    "easel": [
      "An art easel, ready for a masterpiece.",
      "Smocks on before painting!",
      "This easel has seen some beautiful messes.",
      "Your art could hang in the hallway someday.",
      "Paint happy. Paint big."
    ],
    "trash": [
      "The trash can. Feed it garbage!",
      "A clean room is a happy room.",
      "Nice shot! Now go make sure it went IN.",
      "The unsung hero of the classroom.",
      "It only eats trash. Homework doesn't count."
    ],
    "sink": [
      "A sink for washing up.",
      "Soap. Water. Twenty seconds. Go!",
      "Painty hands? This is the place.",
      "Squeaky clean!",
      "The sink says: bubbles are fun."
    ],
    "kidney": [
      "The rainbow table! Small groups meet here.",
      "The teacher sits in the curvy part. Clever!",
      "Reading group headquarters.",
      "Shaped like a rainbow. A very educational rainbow.",
      "The best seat for extra help."
    ],
    "couch": [
      "A comfy couch!",
      "The coziest reading spot in the room.",
      "No jumping. The couch is trusting you.",
      "Room for three friends.",
      "Ahhh. Couch."
    ],
    "rocker": [
      "A rocking chair. Creak, creak.",
      "Story time happens right here.",
      "Gentle rocking only!",
      "It squeaks in exactly one spot. The teacher knows where.",
      "The most soothing seat in school."
    ],
    "computer": [
      "A classroom computer.",
      "Type, type, type!",
      "The mouse is not a real mouse. Good news for everyone.",
      "Learning games live in there.",
      "Please log out when you're done!"
    ],
    "lamp": [
      "A cozy reading lamp.",
      "Warm light for good books.",
      "Click! On. Click! Off. Click! On...  okay, leave it on.",
      "Lamp: the sun's indoor cousin.",
      "It makes the reading corner glow."
    ],
    "toybin": [
      "A bin full of toys!",
      "Cleanup time means EVERYTHING goes back in.",
      "There's a dinosaur at the bottom. There always is.",
      "Sharing makes the toys more fun.",
      "The toy bin is never truly organized. It tries."
    ],
    "stool": [
      "A little stool.",
      "Perfect for reaching tall shelves.",
      "Small but mighty.",
      "Sit and create!",
      "It wobbles once. Consider it a feature."
    ],
    "musicstand": [
      "A music stand, holding the next big hit.",
      "The notes go on the lines. Mostly.",
      "Practice makes music!",
      "It stands. For music. All day.",
      "Sheet music goes here. Sheets do not."
    ],
    "drum": [
      "A drum! Boom boom!",
      "Keep the beat!",
      "Quiet hands until music time.",
      "Boom-chicka-boom.",
      "The loudest thing in the room. Treat it kindly."
    ],
    "tent": [
      "A reading tent! Cozy headquarters.",
      "Books read better in a tent. It's science. Sort of.",
      "Two readers max!",
      "Flashlight reading: highly recommended.",
      "Welcome to Camp Read-A-Lot."
    ],
    "lockers": [
      "Rows of lockers, ready for backpacks and coats.",
      "One still has a super-cool sticker from last year.",
      "Clang! That's the locker song.",
      "Remember your locker number!",
      "Everything fits if you believe. And push a little."
    ],
    "cubbiesTall": [
      "Tall blue cubbies stuffed with backpacks.",
      "Every cubby gets a student's name on day one.",
      "Ashland blue, floor to top.",
      "The top shelf is for tall dreams.",
      "A place for everything, everything in its place."
    ],
    "chalkboard": [
      "A real chalkboard! This one has been here for years.",
      "There's still half a math problem in the corner.",
      "Chalk dust: the original glitter.",
      "Screeech -- oops, sorry! Wrong angle.",
      "Old school. Literally."
    ],
    "trophycase": [
      "The trophy case shines with Eagle pride!",
      "There's a spelling bee trophy in there from years ago.",
      "One shelf is saved for THIS year's champions.",
      "Sparkle, sparkle.",
      "Future trophy: yours?"
    ],
    "mapposter": [
      "A map of the whole world! Find Kentucky.",
      "Someone marked Lexington with a gold star.",
      "So many places to learn about.",
      "North is up. Usually.",
      "Adventure looks close on a map."
    ],
    "pencilposter": [
      "A giant pencil poster that says: WRITE ON!",
      "It shows exactly how to hold your pencil.",
      "The world's largest pencil. Probably not real.",
      "Write on, writers!",
      "Sharpened and ready."
    ],
    "welcome": [
      "The sign says WELCOME! And it means it.",
      "Teachers cannot WAIT to meet everyone.",
      "The friendliest sign in school.",
      "WELCOME! (It never gets tired of saying it.)",
      "You are exactly where you belong."
    ],
    "pennants": [
      "Colorful pennants! GO EAGLES!",
      "Every pennant shows a different college. Dream big!",
      "Flap, flap. That's pennant language for hooray.",
      "Pick a favorite color. They're all winners.",
      "Someday YOUR college pennant could be up there."
    ],
    "curtainwin": [
      "Cozy curtains! They make the room feel like home.",
      "Somebody sewed those with love.",
      "Open for sunshine, closed for movies.",
      "The window's fancy outfit.",
      "Very stylish, window. Very stylish."
    ],
    "curtain": [
      "The big red stage curtain. Break a leg, Eagles!",
      "Drama class puts on TWO shows a year.",
      "Behind this curtain: pure talent.",
      "Shhh... places, everyone!",
      "The curtain rises soon."
    ],
    "stage": [
      "The stage! Concerts and plays happen right here.",
      "Speak up so the back row can hear you!",
      "Every star started on a stage like this one.",
      "The spotlight is warm. Like a hug made of light.",
      "Take a bow!"
    ],
    "fountain": [
      "A water fountain. Ahh, refreshing!",
      "The water is extra cold. Best fountain in the school!",
      "Count to five, then let the next person drink.",
      "Slurp responsibly.",
      "The fountain of... hydration!"
    ],
    "exit": [
      "The EXIT sign glows so everyone can find the way out.",
      "Safety first!",
      "It's always on. Always ready.",
      "Red and bright and very important.",
      "Exits are for emergencies AND for going home time."
    ],
    "whiteboard": [
      "The whiteboard is squeaky clean and ready for lessons.",
      "Someone drew a tiny eagle in the corner.",
      "It smells like brand new markers.",
      "Erasing the whiteboard is the BEST classroom job.",
      "Tomorrow's lesson goes here."
    ],
    "window": [
      "You can see outside! What a sunny day.",
      "A bird just flew past... was that Eddie?",
      "The windows are sparkling clean for day one.",
      "Summer is out there finishing up.",
      "Best view in the school."
    ],
    "bulletinP": [
      "A bulletin board, ready for amazing student work.",
      "It will say WELCOME BACK EAGLES very soon.",
      "The border is brand new.",
      "YOUR work could be up here this year.",
      "Push pins only. No tape. The board insists."
    ],
    "bulletinC": [
      "A fresh bulletin board, waiting for art projects.",
      "Teachers take bulletin boards VERY seriously.",
      "Corkboard: nature's push-pin holder.",
      "Coming soon: masterpieces.",
      "It smells faintly of new paper. Wonderful."
    ],
    "banner:S": [
      "The golden S! S is for SAFETY AT WORK AND PLAY!",
      "One of the four famous SOAR letters.",
      "S comes first, because safety comes first.",
      "It sparkles a little when you walk by.",
      "S stands for Safety. And for Shiny."
    ],
    "banner:O": [
      "The golden O! O is for ON TASK EVERY DAY!",
      "One of the four famous SOAR letters.",
      "Round and golden and very focused.",
      "O is watching you stay on task. In a friendly way.",
      "On task! Every day! That's the O way."
    ],
    "banner:A": [
      "The golden A! A is for ACCOUNTABLE FOR ALL WE DO!",
      "One of the four famous SOAR letters.",
      "Accountable means owning your choices. Big word, big deal.",
      "A+ letter, honestly.",
      "The A stands tall, just like you."
    ],
    "banner:R": [
      "The golden R! R is for RESPECT FOR ME AND YOU!",
      "One of the four famous SOAR letters.",
      "Respect: pass it on!",
      "R is the last letter, but never least.",
      "Respect for me AND for you. That's the whole deal."
    ],
    "lightswitchFacts": [
      "That's the light switch. Press it to flip the lights!",
      "Lights on, lights off. The choice is yours.",
      "Click!",
      "The most powerful button in the room.",
      "With great switches comes great responsibility."
    ]
  };
  // the bonus facts in js/facts-extra.js top every object up to 10-15 lines
  Object.keys(G.FACTS_EXTRA || {}).forEach(function (k) {
    FACTS[k] = (FACTS[k] || []).concat(G.FACTS_EXTRA[k]);
  });

  var FACT_ALIAS = {
    "carpetRed": "carpet",
    "carpetGreen": "carpet",
    "carpetGray": "carpet",
    "gymlineH": "gymfloor",
    "gymlineV": "gymfloor",
    "gymkey": "gymfloor",
    "gymcirTL": "gymfloor",
    "gymcirTR": "gymfloor",
    "gymcirBL": "gymfloor",
    "gymcirBR": "gymfloor",
    "stairU": "stairs",
    "stairD": "stairs",
    "deskTL": "deskT",
    "deskTR": "deskT",
    "deskTLV": "deskT",
    "deskTRV": "deskT",
    "shelfLow": "shelf",
    "gtable": "table",
    "tableTop": "table",
    "tableMid": "table",
    "tableBot": "table",
    "pianoL": "piano",
    "pianoR": "piano",
    "pianoLV": "piano",
    "pianoRV": "piano",
    "plant2": "plant",
    "cubbiesBlue": "cubbies",
    "kidneyL": "kidney",
    "kidneyM": "kidney",
    "kidneyR": "kidney",
    "kidneyLV": "kidney",
    "kidneyMV": "kidney",
    "kidneyRV": "kidney",
    "couchL": "couch",
    "couchR": "couch",
    "couchLV": "couch",
    "couchRV": "couch",
    "welcomeL": "welcome",
    "welcomeR": "welcome",
    "goalL": "soccergoal",
    "goalR": "soccergoal",
    "picnicL": "picnic",
    "picnicR": "picnic",
    "woodstage": "stage"
  };

  var factIdx = {}; // tile type -> next fact to show (cycles through them)
  var lightsOff = {}; // mapId -> true while that room's lights are switched off

  function tryInteract() {
    var m = map();
    var px = Math.floor((player.x + 8) / TS);
    var py = Math.floor((player.y + 11) / TS);
    var dx = player.dir === 'left' ? -1 : player.dir === 'right' ? 1 : 0;
    var dy = player.dir === 'up' ? -1 : player.dir === 'down' ? 1 : 0;

    // reach 2 tiles so you can talk to a teacher across their desk
    for (var step = 1; step <= 2; step++) {
      var tx = px + dx * step, ty = py + dy * step;
      for (var i = 0; i < m.npcs.length; i++) {
        var n = m.npcs[i];
        var hit = (n.x === tx && n.y === ty) || (n.tx === tx && n.ty === ty);
        if (hit) {
          // mid-boogie, Mrs. Todd has exactly one thing on her mind
          if (toddParty && n.dollyDancing) {
            G.Dialogue.start([{
              name: 'MRS. TODD',
              text: toddParty.phase === 'dance' ? 'WOOO! THIS IS MY SONG!!' : 'Watch THIS!'
            }]);
            return;
          }
          // settle onto a tile and face the player
          if (n.tx !== undefined) {
            n.x = n.tx; n.y = n.ty;
            n.px = n.x * TS; n.py = n.y * TS;
            n.tx = undefined;
            n.anim = 0;
          }
          n.dir = player.dir === 'up' ? 'down' : player.dir === 'down' ? 'up'
            : player.dir === 'left' ? 'right' : 'left';
          if (party) {
            // party guests only have one thing to say: THANK YOU
            if (n.dj || n.kind === 'eagle') G.Quest.djDialogue(null);
            else G.Quest.partyDialogue(n, null);
            return;
          }
          if (n.kind === 'eagle') {
            // Eddie is our mascot AND a staff member: hearing his story
            // counts him toward the roster
            met['__eddie__'] = true;
            G.Quest.eagleDialogue(null);
          } else if (n.kind === 'officer') {
            met['__officer__'] = true;
            G.Quest.officerDialogue(null);
          } else {
            met[n.roomId] = true;
            if (n.roomId === 't-216' && maybeRichardsDunk(n)) return;
            G.Quest.teacherDialogue(n.roomId, null);
          }
          return;
        }
      }
    }

    if (party) {
      // facing the DJ table works just like facing the DJ
      for (var bs = 1; bs <= 2; bs++) {
        var btx = px + dx * bs, bty = py + dy * bs;
        if (bty === BOOTH.y && btx >= BOOTH.x0 && btx <= BOOTH.x1) {
          G.Quest.djDialogue(null);
          return;
        }
      }
      return; // no hunts, facts or switches during the party
    }

    // hunting? check whether we pressed on the object hiding the letter
    var h1 = huntSpotAt(px + dx, py + dy) || huntSpotAt(px + dx * 2, py + dy * 2);
    if (h1) {
      startEncounter(h1);
      return;
    }

    // nothing to talk to? look closer at whatever we're facing
    var ft = m.get(px + dx, py + dy);
    if (ft === 'lightswitch') {
      lightsOff[currentMapId] = !lightsOff[currentMapId];
      G.Audio.sfx('blip');
      return;
    }
    var hunting = G.Quest.getHunt();
    var inHuntRoom = hunting && (currentMapId === hunting.roomId ||
      (hunting.roomId === 'b-gym' && currentMapId === 'basement'));
    if (inHuntRoom && G.Quest.isSpotType(ft)) {
      // wrong object: a little suspense, then keep searching
      G.Audio.sfx('tick');
      G.Dialogue.start([{ text: 'Hmm... nothing here. Keep looking!' }]);
      return;
    }
    // an empty banner slot: the letter isn't back on the wall yet
    if (ft && ft.indexOf('banner:') === 0) {
      var bl = ft.split(':')[1];
      if (!G.Quest.delivered[bl]) {
        G.Audio.sfx('tick');
        G.Dialogue.start([{
          text: G.Quest.found[bl]
            ? 'An empty spot on the banner... hey! The golden ' + bl + ' floating behind you belongs RIGHT here! Show Mrs. Walker!'
            : 'An empty spot shaped like the letter ' + bl + '... the golden ' + bl + ' is still missing!'
        }]);
        return;
      }
    }
    // plain floor stays quiet: facts are only for real objects (and walls),
    // never the tile you could simply walk onto
    if (G.Tiles.isWalkable(ft)) return;
    var factKey = FACT_ALIAS[ft] || ft;
    var facts = FACTS[factKey];
    if (facts) {
      var fi = factIdx[factKey] || 0;
      factIdx[factKey] = (fi + 1) % facts.length;
      G.Audio.sfx('tick');
      G.Dialogue.start([{ text: facts[fi] }]);
    }
  }

  // ---- intro / ending -----------------------------------------------------
  // ?ending=N: skip the adventure and open on the moment that matters --
  // four letters floating behind you, N staff already greeted, Mrs. Walker
  // one keypress away. Her desk moves around between loads, so we find her
  // and take whichever side of her is walkable.
  var previewEnding = null;

  function startWalkerPreview(n) {
    var ids = Object.keys(G.TEACHERS).concat(['__officer__']);
    for (var i = 0; i < Math.min(n, ids.length); i++) met[ids[i]] = true;
    G.Quest.LETTERS.forEach(function (l) { G.Quest.collect(l); });
    G.Quest.setWalkerMet(true);

    currentMapId = 'm-walker';
    visited['m-walker'] = true;
    floorsSeen.middle = true;
    var w = (map().npcs || []).filter(function (x) { return x.kind === 'teacher'; })[0];
    var sides = [
      { dx: 0, dy: 1, dir: 'up', bx: 0, by: 1 },
      { dx: 1, dy: 0, dir: 'left', bx: 1, by: 0 },
      { dx: -1, dy: 0, dir: 'right', bx: -1, by: 0 },
      { dx: 0, dy: -1, dir: 'down', bx: 0, by: -1 }
    ];
    var spot = null;
    for (var s = 0; s < sides.length && !spot; s++) {
      var sx = w.x + sides[s].dx, sy = w.y + sides[s].dy;
      if (!boxBlocked(sx * TS, sy * TS)) spot = { x: sx, y: sy, s: sides[s] };
    }
    if (!spot) spot = { x: w.x, y: w.y + 1, s: sides[0] };

    player.x = spot.x * TS;
    player.y = spot.y * TS;
    player.dir = spot.s.dir;
    player.moving = false;
    lastTriggerKey = spot.x + ',' + spot.y;

    // fan the letters out behind the player instead of stacking them. They
    // ride the footprint trail, so lay down a fake one leading back the way
    // an arriving student would have walked in.
    trail.length = 0;
    for (var k = 1; k <= 14; k++) {
      trail.push({ x: player.x + spot.s.bx * k * 6, y: player.y + spot.s.by * k * 6 });
    }
    var flip = player.dir === 'left' || player.dir === 'up';
    var carried = G.Quest.carriedLetters();
    carried.forEach(function (l, i) {
      var rank = flip ? i + 1 : carried.length - i;
      followers[l] = {
        x: player.x + spot.s.bx * rank * 14,
        y: player.y + spot.s.by * rank * 14
      };
    });

    state = 'play';
    G.Audio.startBgm();
    showBanner("MRS. WALKER'S OFFICE");
  }

  function startIntro() {
    if (previewEnding !== null) { startWalkerPreview(previewEnding); return; }
    state = 'play';
    G.Audio.startBgm(); // stops the title theme, starts the floor theme
    showBanner('MIDDLE FLOOR');
    G.Dialogue.start([
      { text: 'Summer is almost over, and Ashland Elementary is getting ready for the 26/27 school year...' },
      { text: '...but something is WRONG. The four golden letters of the SOAR EXPECTATIONS -- S, O, A, R -- are MISSING!' },
      { text: 'EDDIE THE EAGLE is racing around this hallway -- the MIDDLE FLOOR -- and he looks worried. Walk up to him and press almost any key -- he knows what happened!' },
      { text: 'Use the ARROW KEYS (or the d-pad) to walk. Walk into doors to enter rooms!' },
      { text: 'Lost? Look for the big YELLOW ARROW floating near you. It always points at wherever you need to go next!' },
      { text: 'On a computer you can also use the MOUSE: click a teacher or an object and you will walk right over and check it out!' }
    ]);
  }

  function beginEnding() {
    state = 'ending';
    endingTimer = 0;
    confetti = [];
    for (var i = 0; i < 120; i++) {
      confetti.push({
        x: Math.random() * SW,
        y: Math.random() * -SH,
        vy: 30 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 20,
        c: ['#f7d84d', '#2e8f57', '#c43a3a', '#3a63c4', '#9a6ee0', '#ffffff'][i % 6],
        s: 2 + (i % 3)
      });
    }
    G.Audio.sfx('victory');
  }

  function startEnding() {
    eddieVisit = null;
    transition = { phase: 'out', t: 0, onMid: beginEnding };
  }

  // ---- EASTER EGG: Mrs. Todd's 9 to 5 dance break --------------------------
  // she walks out to the front of her office, says "Hit it!", and THEN: 30
  // seconds of pure Dolly. She boogies around the open floor (never up by
  // the banner), the lights sweep and pulse (kid-safe, no hard strobe),
  // confetti falls, and a big I LOVE DOLLY PARTON! banner unfurls from the
  // back wall.
  var toddParty = null; // {phase:'walk'|'hitit'|'dance', t, npc, path, i}

  // BFS an NPC route to the open floor at the FRONT of the room
  function toddPathToFront(m, n) {
    var q = [[n.x, n.y]];
    var from = {};
    from[n.x + ',' + n.y] = null;
    var best = null;
    while (q.length) {
      var cur = q.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = cur[0] + d[0], ny = cur[1] + d[1];
        var key = nx + ',' + ny;
        if (from[key] !== undefined || !npcCanWalk(m, nx, ny)) return;
        from[key] = cur;
        q.push([nx, ny]);
        // front of the room: as far DOWN as possible, then near the middle
        if (ny >= 4) {
          var score = ny * 100 - Math.abs(nx - m.w / 2);
          if (!best || score > best.score) best = { x: nx, y: ny, score: score };
        }
      });
    }
    if (!best) return null;
    var path = [];
    var b = [best.x, best.y];
    while (b && from[b[0] + ',' + b[1]] !== null) {
      path.unshift(b);
      b = from[b[0] + ',' + b[1]];
    }
    return path;
  }

  function startDollyParty() {
    eddieVisit = null;
    var m = map();
    var n = null;
    for (var i = 0; i < m.npcs.length; i++) {
      if (m.npcs[i].roomId === 'm-todd') n = m.npcs[i];
    }
    if (!n) return;
    // settle her onto a tile before the show begins
    if (n.tx !== undefined) { n.x = n.tx; n.y = n.ty; n.tx = undefined; }
    n.px = n.x * TS; n.py = n.y * TS;
    n.dollyDancing = true;
    n.anim = 0;
    n.hop = 0;
    var path = toddPathToFront(m, n);
    toddParty = { phase: path && path.length ? 'walk' : 'hitit', t: 0, npc: n, path: path || [], i: 0 };
    if (toddParty.phase === 'hitit') toddSayHitIt();
  }

  function toddSayHitIt() {
    var p = toddParty;
    p.npc.dir = 'down';
    G.Dialogue.start([{ name: 'MRS. TODD', text: 'Hit it!' }], {
      onDone: function () {
        if (!toddParty) return;
        toddParty.phase = 'dance';
        toddParty.t = 0;
        G.Audio.playDolly();
        showBanner('DANCE BREAK!');
      }
    });
  }

  function endDollyParty(silent) {
    var n = toddParty && toddParty.npc;
    toddParty = null;
    if (n) {
      n.dollyDancing = false;
      n.hop = 0;
      n.anim = 0;
    }
    G.Audio.stopDolly();
    if (!silent) {
      G.Dialogue.start([
        { name: 'MRS. TODD', text: 'WHEW! That song gets me EVERY single time! Okay, okay... back to setting up my room!' }
      ]);
    }
  }

  // slide her toward her current step target; returns true while mid-step
  function toddStep(n, speed) {
    if (n.tx === undefined) return false;
    var dx = n.tx * TS - n.px, dy = n.ty * TS - n.py;
    if (Math.abs(dx) <= speed && Math.abs(dy) <= speed) {
      n.px = n.tx * TS; n.py = n.ty * TS;
      n.x = n.tx; n.y = n.ty;
      n.tx = undefined;
      return false;
    }
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    n.px += Math.sign(dx) * speed;
    n.py += Math.sign(dy) * speed;
    return true;
  }

  function updateToddParty(dt) {
    var p = toddParty;
    var n = p.npc;
    var m = map();

    // phase 1: she marches out to the front of the room first
    if (p.phase === 'walk') {
      if (n.tx === undefined) {
        var next = p.path[p.i++];
        if (!next) { toddSayHitIt(); p.phase = 'hitit'; return; }
        n.tx = next[0]; n.ty = next[1];
      }
      toddStep(n, 44 * dt);
      n.anim += dt * 6;
      return;
    }
    // phase 2: "Hit it!" is on screen; she holds still until the kid answers
    if (p.phase === 'hitit') return;

    // phase 3: THE DANCE
    p.t += dt;
    if (p.t >= 30) { endDollyParty(); return; }
    // quick tile-to-tile boogie around the open floor, no pauses -- and
    // never up by the banner (rows 4+ only)
    if (n.tx === undefined) {
      var dirs = [['down', 0, 1], ['up', 0, -1], ['left', -1, 0], ['right', 1, 0]];
      var d = dirs[Math.floor(Math.random() * 4)];
      n.dir = d[0];
      var nty = n.y + d[2];
      if (nty >= 4 && npcCanWalk(m, n.x + d[1], nty)) {
        n.tx = n.x + d[1]; n.ty = nty;
      }
    }
    if (toddStep(n, 62 * dt)) n.anim += dt * 9;
    // the hop -- and a twirl every few beats
    n.hop = Math.abs(Math.sin(p.t * 7)) * 3;
    if (p.t % 3 < 0.6) n.dir = ['down', 'left', 'up', 'right'][Math.floor(p.t * 12) % 4];
  }

  // the big banner unfurls from the back wall (and rolls back up at the end);
  // drawn BEFORE the characters so Mrs. Todd always dances in front of it
  function drawDollyBanner(cam) {
    if (toddParty.phase !== 'dance') return;
    var t = toddParty.t;
    var m = map();
    var u = Math.min(1, Math.max(0, (t - 0.4) / 1.2));       // unroll
    u = Math.min(u, Math.max(0, (30 - t) / 1.2));            // ...and roll away
    if (u <= 0) return;
    ctx.imageSmoothingEnabled = false;
    var bw = Math.min(m.w * TS - 12, 176);
    var bx = Math.round(m.w * TS / 2 - cam.x);
    var by = Math.round(TS + 2 - cam.y);
    var bh = Math.round(u * 26);
    ctx.fillStyle = '#e06a92';                                // Dolly pink
    ctx.fillRect(bx - bw / 2, by, bw, bh);
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(bx - bw / 2, by, bw, Math.min(2, bh));
    ctx.fillStyle = '#8a2d4f';                                // rolled hem
    ctx.fillRect(bx - bw / 2, by + bh - 2, bw, 2);
    if (u > 0.95) {
      G.Tiles.drawTinyText(ctx, 'I LOVE', bx - 24, by + 4, '#fdf0a8', 2);
      G.Tiles.drawTinyText(ctx, 'DOLLY PARTON!', bx - 52, by + 15, '#fdf0a8', 2);
    }
  }

  function drawToddParty(cam) {
    var p = toddParty;
    if (p.phase !== 'dance') return; // no effects until she says "Hit it!"
    var t = p.t;
    var m = map();
    ctx.imageSmoothingEnabled = false;

    // confetti rains the whole time (stateless: positions derive from t)
    var cols = ['#f7d84d', '#e06a92', '#9a6ee0', '#2e8f57', '#3a63c4', '#ffffff'];
    for (var i = 0; i < 46; i++) {
      var cx2 = ((i * 53 + Math.floor(i / 6) * 29) % SW + Math.sin(t * 2 + i) * 6 + SW) % SW;
      var cy2 = ((t * (26 + (i % 5) * 9) + i * 47) % (SH + 10)) - 5;
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(Math.round(cx2), Math.round(cy2), 2, 2 + (i % 2));
    }

    // party lights: a gentle pulse plus three sweeping colored spotlights
    ctx.fillStyle = 'rgba(30,8,44,' + (0.16 + 0.07 * Math.sin(t * 3)).toFixed(3) + ')';
    ctx.fillRect(0, 0, SW, SH);
    ctx.globalCompositeOperation = 'lighter';
    var lcols = ['#f7d84d', '#e06a92', '#3a63c4'];
    for (var li = 0; li < 3; li++) {
      var lx = (m.w / 2 + (m.w / 3) * Math.sin(t * (1.0 + li * 0.3) + li * 2.1)) * TS - cam.x;
      var ly = (m.h / 2 + (m.h / 4) * Math.sin(t * (1.3 + li * 0.25) + li * 1.4)) * TS - cam.y;
      var g = ctx.createRadialGradient(lx, ly, 3, lx, ly, 46);
      g.addColorStop(0, lcols[li]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = g;
      ctx.fillRect(lx - 46, ly - 46, 92, 92);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- THE ENDING PARTY: the Ashland gym dance -----------------------------
  // The party always happens once the banner is whole -- but only the staff
  // the student actually MET show up, and how loud the room gets depends on
  // how many that is. Four tiers, each a clear step up from the last:
  //
  //   1   0-10  a quiet gym dance. Your people, the music, and that's it.
  //   2  11-20  a real crowd now, under green-and-gold lights.
  //   3  21-49  DJ Eddie sets up his decks in the corner.
  //   4  50+    the blowout: front-of-stage rig, speaker stacks, confetti,
  //             fireworks, glowsticks, green/gold fountains, and eight of
  //             the staff cartwheeling all over the floor.
  //
  // Lights stay kid-safe at every tier: slow sweeps and fades, no hard strobe.
  var party = null;    // {t, savedNpcs, tier, confetti, fireworks}
  var partyFly = null; // {t, sparkles, ending}
  var BOOTH = { x0: 41, x1: 43, y: 18 }; // DJ table tiles; startPartyRoom repositions

  // everyone who counts toward STAFF MET: every teacher-record (classroom
  // teachers, office staff, roaming custodians...) plus Officer Garth AND
  // Eddie the Eagle -- our mascot is an Ashland staff member too.
  function staffTotal() { return Object.keys(G.TEACHERS).length + 2; }
  function countMet() { return Object.keys(met).length; }
  function allStaffMet() { return countMet() >= staffTotal(); }
  function debugMeetAll() {
    Object.keys(G.TEACHERS).forEach(function (id) { met[id] = true; });
    met['__officer__'] = true;
    met['__eddie__'] = true;
  }

  // the full roster, in a stable order, each flagged met/not-met. Officer
  // Garth and Eddie the Eagle round out the 60.
  function staffRosterList() {
    var list = Object.keys(G.TEACHERS).map(function (id) {
      return { name: G.TEACHERS[id].name, met: !!met[id] };
    });
    list.push({ name: 'Officer Garth', met: !!met['__officer__'] });
    list.push({ name: 'Eddie the Eagle', met: !!met['__eddie__'] });
    return list;
  }

  // is this click on the "ASHLAND STAFF" readout? (gy already has the portrait
  // top-strip offset removed, so the bottom strip sits at gy >= SH)
  function staffHudHit(gx, gy) {
    if (portrait) return gy >= SH && gy <= SH + BOT_H && gx >= 244 && gx <= 300;
    return gx >= SW && gy >= 100 && gy <= 144;
  }

  // a tap-to-close panel listing every staff member: bright gold if you have
  // met them, dim grey if you have not. Names only -- no sprites.
  function drawStaffRoster() {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(6,10,24,0.86)';
    ctx.fillRect(0, 0, SW, SH);
    var px = 7, py = 6, pw = SW - 14, ph = SH - 12;
    G.Dialogue.drawWindow(ctx, px, py, pw, ph);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = font(9);
    ctx.fillStyle = '#f7d84d';
    ctx.fillText('ASHLAND STAFF', SW / 2, py + 5);

    var list = staffRosterList();
    var metN = 0;
    for (var i = 0; i < list.length; i++) if (list[i].met) metN++;
    ctx.font = font(7);
    ctx.fillStyle = '#5fbd87';
    ctx.fillText(metN + ' OF ' + list.length + ' MET', SW / 2, py + 17);

    // three columns, filled top-to-bottom so it still reads in order
    ctx.textAlign = 'left';
    ctx.font = font(6);
    var cols = 3;
    var rows = Math.ceil(list.length / cols);
    var gridX = px + 8, gridY = py + 30;
    var colW = (pw - 16) / cols;
    var rowH = (ph - 44) / rows;
    list.forEach(function (s, idx) {
      var c = Math.floor(idx / rows), r = idx % rows;
      ctx.fillStyle = s.met ? '#f7d84d' : 'rgba(255,255,255,0.24)';
      ctx.fillText(s.name, gridX + c * colW, gridY + r * rowH);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fd4e8';
    ctx.fillText('TAP ANYWHERE TO CLOSE', SW / 2, py + ph - 11);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  function partyTier() {
    var n = countMet();
    if (n >= 50) return 4;
    if (n >= 21) return 3;
    if (n >= 11) return 2;
    return 1;
  }
  // Eddie only works the decks from tier 3 up; below that he is out on the
  // floor dancing with everyone else (talking to him still ends the party)
  function partyHasDj() { return !!party && party.tier >= 3; }

  // the tumbling crew at the biggest party. Looked up by name so the roster
  // stays the source of truth -- `hair` picks between same-name teachers
  // (there are two Mrs. Smiths; the cartwheeling one is the black-haired one).
  var TUMBLERS = [
    { name: 'Mrs. Smith', hair: 0 },
    { name: 'Mrs. Oldham' },
    { name: 'Mrs. Hill' },
    { name: 'Mrs. Messer' },
    { name: 'Mrs. Brown' },
    { name: 'Mrs. Slaughter' },
    { name: 'Mr. Piercey' },
    { name: 'Mr. Givan' }
  ];
  // spread right across the gym rather than lined up: one anchor each, and
  // whoever is nearest a free tile there gets it
  var TUMBLE_ANCHORS = [
    [24, 18], [30, 18], [36, 18], [42, 18],
    [24, 24], [30, 24], [36, 24], [42, 24]
  ];
  function findStaffId(want) {
    var hits = Object.keys(G.TEACHERS).filter(function (id) {
      return G.TEACHERS[id].name === want.name;
    });
    if (hits.length > 1 && want.hair !== undefined) {
      var exact = hits.filter(function (id) {
        var ov = G.TEACHERS[id].spriteOv;
        return ov && ov.hairColor === want.hair;
      });
      if (exact.length) return exact[0];
    }
    return hits[0] || null;
  }

  function startParty() {
    eddieVisit = null;
    transition = { phase: 'out', t: 0, onMid: startPartyFly };
  }

  // -- the dramatic fly-over ------------------------------------------------
  function startPartyFly() {
    if (!titleBgFly) titleBgFly = buildTitleBg(true, true);
    partyFly = { t: 0, sparkles: [] };
    state = 'partyfly';
    G.Input.clearEdges();
    G.Audio.playFlight();
  }

  // Eddie's sky show: burst up from behind the roof, loop a big figure
  // eight way up high, then dive off toward the gym
  function partyFlyPos(t) {
    if (t < 1) {
      var e = 1 - (1 - t) * (1 - t);
      return { x: 200 - 40 * e, y: 122 - 67 * e };
    }
    if (t < 4.5) {
      var c = t - 1;
      return { x: 160 + 95 * Math.sin(c * 1.3), y: 55 + 28 * Math.sin(c * 2.6) };
    }
    var d = t - 4.5;
    return { x: 66 + d * d * 150, y: 64 + d * d * 95 };
  }

  function updatePartyFly(dt) {
    var f = partyFly;
    f.t += dt;
    if (f.t > 0.5 && G.Input.consumeAction()) { endPartyFly(); return; }
    var ep = partyFlyPos(f.t);
    if (f.t < 6 && Math.floor(f.t * 60) % 2 === 0) {
      f.sparkles.push({
        x: ep.x + 14, y: ep.y + 10,
        vx: (Math.random() - 0.5) * 20, vy: 8 + Math.random() * 16,
        life: 0.5 + Math.random() * 0.4,
        c: Math.random() < 0.3 ? '#ffffff' : '#f7d84d'
      });
    }
    f.sparkles = f.sparkles.filter(function (s) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      return s.life > 0;
    });
    if (f.t > 6.2) endPartyFly();
  }

  function endPartyFly() {
    if (!partyFly || partyFly.ending) return;
    partyFly.ending = true;
    transition = {
      phase: 'out', t: 0,
      onMid: function () { partyFly = null; startPartyRoom(); }
    };
  }

  function drawPartyFly() {
    if (!titleBgFly) titleBgFly = buildTitleBg(true, true);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(titleBgFly, 0, 0);
    // dusk falls over the school: this flight is a big deal
    ctx.fillStyle = 'rgba(16,10,48,0.35)';
    ctx.fillRect(0, 0, SW, SH);
    var f = partyFly;
    f.sparkles.forEach(function (s) {
      ctx.globalAlpha = Math.min(1, s.life * 2.5);
      ctx.fillStyle = s.c;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
    });
    ctx.globalAlpha = 1;
    var ep = partyFlyPos(f.t);
    var vx = partyFlyPos(f.t + 0.05).x - ep.x;
    var frame = eagleFlyFrames[Math.floor(f.t * 8) % 2];
    ctx.save();
    if (vx > 0) {
      // the flying frames face left: mirror when he swoops rightward
      ctx.translate(Math.round(ep.x) + 16, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(frame, 0, Math.round(ep.y));
    } else {
      ctx.drawImage(frame, Math.round(ep.x) - 16, Math.round(ep.y));
    }
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#f7d84d';
    if (f.t > 1.6 && f.t < 4.1) {
      ctx.font = font(9);
      ctx.fillText('EDDIE HAS ONE MORE SURPRISE...', SW / 2, 200);
    } else if (f.t >= 4.1 && Math.floor(Date.now() / 300) % 2 === 0) {
      ctx.font = font(12);
      ctx.fillText('TO THE GYM!', SW / 2, 196);
    }
    ctx.textAlign = 'left';
  }

  // -- the party itself -------------------------------------------------------
  function startPartyRoom() {
    currentMapId = 'basement';
    var m = map();
    player.x = 23 * TS;
    player.y = 21 * TS;
    player.dir = 'right';
    player.moving = false;
    visited['b-gym'] = true;
    lastTriggerKey = '23,21';
    var tier = partyTier();
    // met EVERY staff member? the celebration goes completely over the top
    party = { t: 0, savedNpcs: m.npcs, tier: tier, perfect: allStaffMet() };

    // tier 4 hauls the big rig out in front of the stage; tier 3 is the
    // little table in the far corner; below that there are no decks at all
    if (tier >= 4) { BOOTH.x0 = 31; BOOTH.x1 = 35; BOOTH.y = 12; }
    else { BOOTH.x0 = 41; BOOTH.x1 = 43; BOOTH.y = 18; }

    var dancers = [];
    if (tier >= 3) {
      dancers.push({ kind: 'eagle', dj: true, x: BOOTH.x0 + 2, y: BOOTH.y - 1, dancing: true });
    } else {
      // no decks yet -- Eddie is just another Eagle out on the floor
      dancers.push({ kind: 'eagle', x: 33, y: 16, dancing: true });
    }

    // the guest list is everyone the student actually MET on their adventure
    var ids = Object.keys(G.TEACHERS).filter(function (id) { return met[id]; });
    if (met['__officer__']) ids.push('__officer__');

    var slots = [];
    for (var sy = 12; sy <= 26; sy += 2) {
      for (var sx = 22; sx <= 44; sx += 2) {
        if (tier >= 3 && sx >= BOOTH.x0 - 1 && sx <= BOOTH.x1 + 1 &&
            sy >= BOOTH.y - 2 && sy <= BOOTH.y + 1) continue;          // DJ corner
        if (tier >= 4 && sy <= 13 && sx >= BOOTH.x0 - 3 && sx <= BOOTH.x1 + 2) continue; // speaker stacks
        if (tier < 3 && Math.abs(sx - 33) <= 1 && Math.abs(sy - 16) <= 1) continue;      // Eddie's spot
        if (Math.abs(sx - 23) <= 1 && Math.abs(sy - 21) <= 1) continue;                  // player spawn
        if (m.get(sx, sy) !== 'gymfloor') continue;
        slots.push([sx, sy]);
      }
    }

    // the cartwheel crew get their pitch first: scattered to their own
    // corners of the gym, with the tile either side kept clear so a flip
    // never lands on somebody's head
    var tumblers = {};
    if (tier >= 4) {
      var ti = 0;
      TUMBLERS.forEach(function (want) {
        var id = findStaffId(want);
        if (!id || !met[id] || ti >= TUMBLE_ANCHORS.length || !slots.length) return;
        var a = TUMBLE_ANCHORS[ti];
        var best = 0, bestD = Infinity;
        for (var s = 0; s < slots.length; s++) {
          var d = Math.abs(slots[s][0] - a[0]) + Math.abs(slots[s][1] - a[1]);
          if (d < bestD) { bestD = d; best = s; }
        }
        var spot = slots.splice(best, 1)[0];
        tumblers[id] = { x: spot[0], y: spot[1], i: ti };
        ti++;
        slots = slots.filter(function (sl) {
          return !(sl[1] === spot[1] && Math.abs(sl[0] - spot[0]) <= 2);
        });
      });
    }

    ids.forEach(function (id) {
      var h = 5381;
      for (var k = 0; k < id.length; k++) h = ((h << 5) + h + id.charCodeAt(k)) | 0;
      h = Math.abs(h);
      var tum = tumblers[id];
      var slot;
      if (tum) slot = [tum.x, tum.y];
      else if (slots.length) slot = slots.splice(h % slots.length, 1)[0];
      if (!slot) return;
      var d = {
        x: slot[0], y: slot[1],
        px: slot[0] * TS + ((h % 7) - 3),
        py: slot[1] * TS + ((h >> 3) % 5) - 2,
        dancing: true,
        anim: 0,
        dance: { phase: (h % 100) / 100 * Math.PI * 2, style: h % 3, speed: 5 + (h % 4) }
      };
      if (tum) {
        // each one flips on their own clock, so the gym is never in sync
        d.px = slot[0] * TS;
        d.py = slot[1] * TS;
        d.tumble = {
          phase: tum.i * 0.43,
          period: 1.45 + (tum.i % 4) * 0.13,
          drift: 4 + (tum.i % 3)
        };
        d.dance.style = 3;
      }
      // glowsticks come out at the blowout
      if (tier >= 4) d.glow = GLOW_COLORS[h % GLOW_COLORS.length];
      if (id === '__officer__') d.kind = 'officer';
      else { d.kind = 'teacher'; d.roomId = id; }
      dancers.push(d);
    });
    m.npcs = dancers;

    state = 'play';
    G.Quest.setPartyMode(true);
    G.Audio.playParty();
    showBanner(tier >= 4 ? 'ASHLAND BLOWOUT!!!'
      : tier === 3 ? 'DJ EDDIE IS IN THE HOUSE!'
        : tier === 2 ? 'THE GYM IS ROCKING!' : 'DANCE PARTY!');
  }

  var GLOW_COLORS = ['#7dff9e', '#f7ff5a', '#6ff0ff', '#ff8ad4', '#ffae4a'];

  // four dance styles, doled out by hash: spin, bounce, shuffle -- plus the
  // somersault, handed out by name to the tumbling crew at the blowout
  function updateDancer(n, dt) {
    var d = n.dance;
    var t = party ? party.t : 0;
    n.anim = (n.anim || 0) + dt * 6;
    if (d.style === 3) {
      // A real cartwheel: leap, turn all the way over in the air, land on
      // your feet. The hop peaks at exactly the moment they are upside down
      // (half a turn), which is what keeps anyone's head off the gym floor --
      // at full inversion the sprite's lowest point sits `hop` above the
      // ground. Then a short breather before they go again.
      var tm = n.tumble;
      var u = (((t + tm.phase) % tm.period) + tm.period) % tm.period / tm.period;
      var AIR = 0.62; // fraction of the cycle actually spent airborne
      n.dir = 'right';
      if (u < AIR) {
        var a = u / AIR;                          // 0 -> 1 through one turn
        var lift = Math.sin(a * Math.PI);         // 0 at takeoff and landing
        n.spin = a * Math.PI * 2;
        n.hop = lift * 20;
        n.px = n.x * TS + Math.round(lift * tm.drift);
      } else {
        var b = (u - AIR) / (1 - AIR);            // feet down, catching breath
        n.spin = 0;
        n.hop = Math.abs(Math.sin(b * Math.PI * 2)) * 2;
        n.px = n.x * TS;
      }
      return;
    }
    if (d.style === 0) {
      var dirs = ['down', 'left', 'up', 'right'];
      n.dir = dirs[Math.floor(t * 2.8 + d.phase) % 4];
      n.hop = 0;
    } else if (d.style === 1) {
      // bouncers face the DJ: up toward the stage rig, or right at the side
      // table. With no decks at all they just bounce toward the middle.
      n.dir = !partyHasDj() ? (n.y > 16 ? 'up' : 'down')
        : BOOTH.y <= 13 ? 'up' : (n.x < BOOTH.x0 ? 'right' : 'down');
      n.hop = Math.abs(Math.sin(t * d.speed + d.phase)) * 3;
    } else {
      n.dir = Math.floor(t * 2 + d.phase) % 2 ? 'left' : 'right';
      n.hop = Math.abs(Math.sin(t * d.speed + d.phase)) * 1.5;
      n.px = n.x * TS + Math.round(Math.sin(t * 3 + d.phase) * 2);
    }
  }

  // one firework: a shell that climbs, bursts, and rains sparks
  function spawnFirework() {
    var cols = ['#5fbd87', '#f7d84d', '#7dff9e', '#fff3a8', '#6ff0ff', '#ff8ad4'];
    var parts = [];
    var n = 16 + Math.floor(Math.random() * 10);
    var c = cols[Math.floor(Math.random() * cols.length)];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var sp = 26 + Math.random() * 26;
      parts.push({ a: a, sp: sp });
    }
    return {
      x: 26 + Math.random() * 130,
      y: 22 + Math.random() * 46,
      t: 0, life: 1.1 + Math.random() * 0.5,
      c: c, parts: parts
    };
  }

  function updateParty(dt) {
    party.t += dt;
    var m = map();
    m.npcs.forEach(function (n) {
      // Eddie has no dance card -- he freestyles (see the eagle draw)
      if (n.dancing && n.dance && !n.dj) updateDancer(n, dt);
    });
    if (party.tier < 4) return;

    // confetti rains the whole time -- blowout only
    if (!party.confetti) {
      party.confetti = [];
      for (var i = 0; i < 90; i++) {
        party.confetti.push({
          x: Math.random() * SW,
          y: Math.random() * SH,
          vy: 22 + Math.random() * 40,
          vx: (Math.random() - 0.5) * 14,
          c: ['#f7d84d', '#2e8f57', '#c43a3a', '#3a63c4', '#9a6ee0', '#ffffff', '#e06a92'][i % 7],
          s: 2 + (i % 2)
        });
      }
    }
    party.confetti.forEach(function (p) {
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin((p.y + p.x) / 16) * 0.5;
      if (p.y > SH + 4) { p.y = -4; p.x = Math.random() * SW; }
    });

    // fireworks going off over the gym -- a full barrage when every last
    // staff member made it (perfect run)
    if (!party.fireworks) { party.fireworks = []; party.nextFw = 0.2; }
    party.nextFw -= dt;
    if (party.nextFw <= 0) {
      var burst = party.perfect ? 3 : 1;
      for (var fwi = 0; fwi < burst; fwi++) party.fireworks.push(spawnFirework());
      party.nextFw = party.perfect ? 0.18 + Math.random() * 0.22 : 0.55 + Math.random() * 0.7;
    }
    party.fireworks = party.fireworks.filter(function (f) {
      f.t += dt;
      return f.t < f.life;
    });

    // the two fountains either side of Eddie, throwing green and gold
    if (!party.fountain) party.fountain = [];
    party.fountain.forEach(function (s) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 92 * dt;
    });
    party.fountain = party.fountain.filter(function (s) { return s.t < s.life; });
    for (var f2 = 0; f2 < 2; f2++) {
      for (var q = 0; q < 4; q++) {
        party.fountain.push({
          side: f2, t: 0, life: 0.9 + Math.random() * 0.6,
          x: (Math.random() - 0.5) * 5, y: 0,
          vx: (Math.random() - 0.5) * 34, vy: -(112 + Math.random() * 62),
          c: Math.random() < 0.5 ? '#5fbd87' : '#f7d84d'
        });
      }
    }
  }

  // the player's ten dance moves. Each number key (0-9) maps to a distinct
  // combination of hop / sway / spin / squash, drawn with the walk frames so
  // the legs stay busy. Little notes puff off on the beat.
  function drawDancePlayer(cam, dropShadow) {
    var d = playerDance, t = d.t;
    var baseX = Math.round(player.x - cam.x);
    var footY = Math.round(player.y - cam.y) + 15.5;
    var fset = playerFrames[player.dir];
    var frame = fset[1 + (Math.floor(t * 9) % 2)];
    var hop = 0, dx = 0, rot = 0, sx = 1, sy = 1;
    switch (d.style) {
      case 0: hop = Math.abs(Math.sin(t * 8)) * 6; break;                        // bounce
      case 1: rot = Math.sin(t * 11) * 0.5; break;                               // twist
      case 2: dx = Math.sin(t * 9) * 6; break;                                   // side shuffle
      case 3: rot = t * 9; hop = Math.abs(Math.sin(t * 9)) * 3; break;           // spin
      case 4: sy = 1 + Math.sin(t * 13) * 0.2; sx = 2 - sy; break;               // pump
      case 5: hop = Math.abs(Math.sin(t * 6)) * 10; break;                       // big jumps
      case 6: rot = Math.sin(t * 15) * 0.3; dx = Math.sin(t * 7) * 5; break;     // wiggle
      case 7: rot = (Math.sin(t * 7) > 0 ? 1 : -1) * 0.4; hop = 2; break;        // lean
      case 8: sx = 1 + Math.sin(t * 10) * 0.22; sy = 1 + Math.cos(t * 10) * 0.22; break; // wobble
      case 9: rot = -t * 11; hop = Math.abs(Math.sin(t * 11)) * 5; break;        // reverse spin
    }
    dropShadow(baseX + 8, footY);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(baseX + 8 + dx, Math.round(player.y - 8 - cam.y) + 12 - hop);
    if (rot) ctx.rotate(rot);
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    ctx.drawImage(frame, -8, -12);
    ctx.restore();
    // musical notes popping off to the beat
    if (Math.floor(t * 6) % 2 === 0) {
      ctx.fillStyle = ['#f7d84d', '#5fbd87', '#6ff0ff', '#ff8ad4'][d.style % 4];
      var nx = baseX + (d.style % 2 ? 16 : -2) + Math.sin(t * 8) * 2;
      var ny = Math.round(player.y - 10 - cam.y) - (t * 6 % 1) * 6;
      ctx.fillRect(Math.round(nx), Math.round(ny), 2, 2);
      ctx.fillRect(Math.round(nx) + 2, Math.round(ny) - 2, 1, 2);
    }
  }

  // a single basketball: orange sphere with the classic seams and a shine
  function drawBasketball(cx, cy, r) {
    ctx.fillStyle = '#20140a';
    ctx.beginPath(); ctx.arc(cx, cy + 0.5, r + 0.5, 0, Math.PI * 2); ctx.fill(); // rim shadow
    ctx.fillStyle = '#e07a1e';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1c1108';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();          // equator
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();          // meridian
    ctx.beginPath(); ctx.arc(cx - r, cy, r, -0.9, 0.9); ctx.stroke();                       // left seam
    ctx.beginPath(); ctx.arc(cx + r, cy, r, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();    // right seam
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx - r * 0.38, cy - r * 0.4, r * 0.24, 0, Math.PI * 2); ctx.fill();
  }

  // a little pair of chopsticks resting on a table tile
  function drawChopsticks(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.5);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#c99a5a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(6, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, 1.5); ctx.lineTo(6, 1.5); ctx.stroke();
    ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 1.5;   // darker eating tips
    ctx.beginPath(); ctx.moveTo(3.5, -2); ctx.lineTo(6, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3.5, 1.5); ctx.lineTo(6, 1.5); ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'butt';
  }
  // after Mrs. Adams's sushi announcement, a pair of chopsticks sits on every
  // cafeteria table tile
  function drawCafeteriaChopsticks(cam, m) {
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        if (m.get(x, y) !== 'table') continue;
        drawChopsticks(x * TS + TS / 2 - cam.x, y * TS + TS / 2 - cam.y);
      }
    }
  }

  // Mr. Richards keeps four basketballs scattered around his room. Drawn in
  // world space so they sit behind the characters like other floor props.
  function drawRichardsGoal(cam, m) {
    var balls = [
      [2.6, m.h - 3.2], [m.w - 3.4, m.h - 3.0],
      [4.2, m.h - 5.0], [m.w - 4.6, m.h - 4.6]
    ];
    balls.forEach(function (b) {
      drawBasketball(Math.round(b[0] * TS) - cam.x, Math.round(b[1] * TS) - cam.y, 7);
    });
  }

  // ---- Mr. Richards's NBA-Jam "he's on fire" dunk cutscene ----------------
  // phase boundaries, in seconds, all paced to the ~20s jammusic.mp3:
  //   0..walk    fade in; he stands watching the court, the jam music playing
  //   ..reach    strides out to the free-throw line, ball hovering
  //   ..ignite   plants on the line -> flames erupt ("HE'S ON FIRE!", music ducks)
  //   ..launch   a long beat on fire, then crouch + JUMP ("WHOA!")
  //   ..slam     soars, spinning, and SLAMS -> "BOOMSHAKALAKA!", backboard shatters
  //   ..land     drops back down through the raining glass
  //   ..(done)   celebrates amid the broken glass until the music fades out
  //              (dunk.done is set from the real track length in startDunk)
  var DK = { walk: 3.0, reach: 6.5, ignite: 7.5, launch: 10.5, slam: 12.2, land: 14.0 };

  function maybeRichardsDunk() {
    richardsTalks++;
    if (richardsTalks < 10) return false;
    G.Dialogue.start([
      { name: 'MR. RICHARDS', text: 'You again, champ! I like your hustle. Tell you what... want to watch me DUNK this basketball?' }
    ], { choices: [
      { label: 'YES!', cb: function () { startDunk(); } },
      { label: 'Maybe later', cb: function () { G.Quest.teacherDialogue('t-216', null); } }
    ] });
    return true;
  }

  // the tall tale he spins after every dunk, before pointing you onward
  var RICHARDS_BRAGS = [
    'Yeah, if coach had put me in in the fourth quarter, we\'d be state champions. No doubt.',
    'You know... back in 2002, I used to be able to shoot a basketball from a quarter mile away?',
    'I used to be able to shoot a basketball over the school. Man. We could\'ve won state...'
  ];
  // after the dunk he brags, THEN gives his usual hint (or sends you to Mrs.
  // Walker if you've already got the letters -- exactly like his normal chat)
  function richardsAfterDunk() {
    var brag = RICHARDS_BRAGS[Math.floor(Math.random() * RICHARDS_BRAGS.length)];
    G.Dialogue.start([{ name: 'MR. RICHARDS', text: brag }], {
      onDone: function () { G.Quest.teacherDialogue('t-216', null); }
    });
  }

  var JAM_DUCK = 0.34;   // how far the jam music drops once he's on fire
  var DUNK_FADE = 1.4;   // screen/sound fade-in and fade-out length, seconds
  var BOOM_DUR = 5.8;    // length of boomshakalasound.mp3 -- the scene ends when it does

  function startDunk() {
    // the jam track backs the whole thing; the scene fades out the moment the
    // BOOMSHAKALAKA clip finishes (slam + its length), then the fade tail.
    G.Audio.playJamMusic();
    dunk = { t: 0, done: DK.slam + BOOM_DUR + DUNK_FADE, glass: null };
    state = 'dunk';
    G.Input.clearEdges();
  }

  function updateDunk(dt) {
    dunk.t += dt;
    var t = dunk.t, DONE = dunk.done;
    // beat-synced one-shots over the jam track
    if (!dunk.fired && t >= DK.ignite) {
      dunk.fired = true;
      G.Audio.playDunkClip('hesonfireclip.mp3', 0.95);
      G.Audio.setJamVolume(JAM_DUCK);                 // duck the music once he's lit
    }
    if (!dunk.whoaed && t >= DK.launch) { dunk.whoaed = true; G.Audio.playDunkClip('whoa.mp3', 0.95); }
    if (!dunk.slammed && t >= DK.slam) {
      dunk.slammed = true;
      G.Audio.playDunkClip('boomshakalasound.mp3', 0.95);
      spawnGlass();                                    // shatter the backboard
    }
    if (dunk.glass) updateGlass(dt);
    // ride the music down as the whole scene fades out at the end
    if (t > DONE - DUNK_FADE) {
      G.Audio.setJamVolume(JAM_DUCK * Math.max(0, (DONE - t) / DUNK_FADE));
    }
    var skipped = t > 0.6 && G.Input.consumeAction();
    if (t >= DONE || skipped) {
      G.Audio.stopDunkMusic();
      if (skipped) {
        transition = { phase: 'out', t: 0, onMid: function () { dunk = null; state = 'play'; richardsAfterDunk(); } };
      } else {
        // the scene already faded itself to black -> bring gameplay back up, and
        // he brags + points you onward back in the room
        dunk = null; state = 'play'; transition = { phase: 'in', t: 0 };
        richardsAfterDunk();
      }
    }
  }

  // a look-alike arena built once (deterministic, so the crowd never flickers)
  var dunkArena = null;
  function buildDunkArena(hoopX, hoopY) {
    var c = document.createElement('canvas'); c.width = SW; c.height = SH;
    var x = c.getContext('2d');
    x.fillStyle = '#05060a'; x.fillRect(0, 0, SW, SH);
    // a bright, speckled crowd fills the upper stands
    var crowd = ['#d8d0bc', '#8a94a8', '#b0705e', '#6f9068', '#c6a24e', '#7f6c9e', '#a85e7c', '#c9c2b0'];
    var crowdH = Math.floor(SH * 0.6);
    for (var i = 0; i < 4200; i++) {
      var r = (i * 2654435761) >>> 0;
      var pxv = r % SW;
      var pyv = ((r >>> 9) % crowdH);
      x.globalAlpha = 0.45 + ((r >>> 4) % 55) / 100;
      x.fillStyle = crowd[(r >>> 2) % crowd.length];
      x.fillRect(pxv, pyv, 1, 1);
    }
    x.globalAlpha = 1;
    // court floor: a warm parquet fading into the baseline
    var fy = Math.floor(SH * 0.6);
    var g = x.createLinearGradient(0, fy, 0, SH);
    g.addColorStop(0, '#4a7a44'); g.addColorStop(0.45, '#c9a15a'); g.addColorStop(1, '#8f6a30');
    x.fillStyle = g; x.fillRect(0, fy, SW, SH - fy);
    x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 1;
    for (var l = -3; l <= 3; l++) {
      x.beginPath(); x.moveTo(SW / 2 + l * 20, fy); x.lineTo(SW / 2 + l * 90, SH); x.stroke();
    }
    x.strokeStyle = 'rgba(255,255,255,0.25)';
    x.beginPath(); x.ellipse(SW / 2, fy + 4, 34, 8, 0, 0, Math.PI * 2); x.stroke();
    dunkArena = c;
  }

  // for the dunk he suits up: a green #23 basketball jersey. Built once from his
  // real sprite config -- shirt recolored green, tie dropped, and "23" stamped
  // onto the chest of every frame.
  var dunkFrames = null;
  function stampJerseyNumber(cv) {
    var g = cv.getContext('2d'), W = cv.width, H = cv.height;
    var y0 = Math.round(H * 0.48), y1 = Math.round(H * 0.66);   // the shirt band
    var px = g.getImageData(0, 0, W, H).data;
    var minX = W, maxX = -1;
    for (var y = y0; y <= y1; y++) for (var x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3] > 40) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    }
    if (maxX < 0) return;
    var glyphs = { '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'] };
    var num = '23', gw = 3 * num.length + (num.length - 1);     // 3px digits, 1px gap
    var startX = Math.round((minX + maxX) / 2 - gw / 2);
    var startY = Math.round((y0 + y1) / 2 - 2);
    g.fillStyle = '#f4f4ee';
    for (var d = 0; d < num.length; d++) {
      var gl = glyphs[num[d]];
      for (var r = 0; r < 5; r++) for (var c = 0; c < 3; c++) {
        if (gl[r][c] === '1') g.fillRect(startX + d * 4 + c, startY + r, 1, 1);
      }
    }
  }
  function getDunkFrames() {
    if (dunkFrames) return dunkFrames;
    var base = G.TEACHERS['t-216'] && G.TEACHERS['t-216'].sprite;
    if (!base || !G.Sprites) return teacherFrames['t-216'] || null;
    var cfg = {}; for (var k in base) cfg[k] = base[k];
    cfg.shirt = '#2fa652'; cfg.tie = null;                      // green jersey, no tie
    var f = G.Sprites.makeAdult(cfg);
    ['down', 'up', 'left', 'right'].forEach(function (dir) {
      (f[dir] || []).forEach(function (cv) { stampJerseyNumber(cv); });
    });
    dunkFrames = f;
    return dunkFrames;
  }
  function richFrame(dir, walking, step) {
    var tf = getDunkFrames();
    if (!tf) return null;
    var set = tf[dir] || tf.down;
    if (!walking) return set[0];
    var sub = (step != null) ? step : Math.floor(dunk.t * 9);
    return set[1 + (sub % 2)];
  }
  // draw a Richards frame anchored at his FEET (cx, cy), scaled and optionally
  // squashed/rotated for drama
  function blitRich(frame, cx, cy, scale, squash, rot) {
    if (!frame) return;
    var w = frame.width * scale, h = frame.height * scale * (squash || 1);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(frame, -w / 2, -h, w, h);
    ctx.restore();
    return h;
  }
  // draw a Richards frame anchored at his MIDDLE (cx, cy) -- used for the
  // head-first fall (rot) and the head-spin (sx squashes width to fake a
  // spin-around; negative sx mirrors him mid-turn)
  function blitRichCentered(frame, cx, cy, scale, rot, sx) {
    if (!frame) return 0;
    var w = frame.width * scale, h = frame.height * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    if (sx != null && sx !== 1) ctx.scale(sx, 1);
    ctx.drawImage(frame, -w / 2, -h / 2, w, h);
    ctx.restore();
    return h;
  }
  // one licking flame tongue -- a wavering teardrop rising from (x, baseY)
  function drawFlameTongue(x, baseY, h, w, sway) {
    ctx.beginPath();
    ctx.moveTo(x - w, baseY);
    ctx.quadraticCurveTo(x - w * 0.8, baseY - h * 0.55, x + sway, baseY - h);
    ctx.quadraticCurveTo(x + w * 0.8, baseY - h * 0.55, x + w, baseY);
    ctx.quadraticCurveTo(x, baseY + h * 0.12, x - w, baseY);
    ctx.closePath(); ctx.fill();
  }
  // NBA-Jam "on fire" aura: layered flames licking up around a body of size
  // bodyW x bodyH standing on (cx, footY). intensity 0..1 scales it in/out.
  function drawFireAura(cx, footY, bodyW, bodyH, t, intensity) {
    if (intensity <= 0) return;
    var top = footY - bodyH;
    var roots = [], i, n = 7;
    for (i = 0; i < n; i++) roots.push([cx - bodyW / 2 + bodyW * (i / (n - 1)), footY, 1]);
    for (i = 0; i < 4; i++) {                        // flames climbing both flanks
      var yy = footY - bodyH * (0.22 + 0.2 * i);
      roots.push([cx - bodyW * 0.5, yy, 0.7]);
      roots.push([cx + bodyW * 0.5, yy, 0.7]);
    }
    roots.push([cx - bodyW * 0.18, top, 0.6]);       // and over the head
    roots.push([cx + bodyW * 0.18, top, 0.6]);
    var layers = [
      { col: 'rgba(190,40,10,0.85)', hs: 1.18, ws: 1.3 },
      { col: 'rgba(255,120,20,0.9)', hs: 0.9, ws: 0.95 },
      { col: 'rgba(255,214,74,0.95)', hs: 0.58, ws: 0.58 }
    ];
    for (var L = 0; L < layers.length; L++) {
      ctx.fillStyle = layers[L].col;
      for (var r = 0; r < roots.length; r++) {
        var rt = roots[r];
        var flick = 0.65 + 0.5 * Math.sin(t * 13 + r * 1.7 + L);
        var h = bodyH * 0.5 * rt[2] * intensity * flick * layers[L].hs;
        var w = (2.5 + bodyW * 0.09) * rt[2] * layers[L].ws;
        drawFlameTongue(rt[0], rt[1], h, w, Math.sin(t * 9 + r) * w * 1.1);
      }
    }
  }
  // the basketball, wreathed in fire when he's lit up
  function drawFireBall(cx, cy, r, t, intensity) {
    if (intensity > 0) {
      var layers = [['rgba(200,50,10,0.8)', r * 2.2], ['rgba(255,130,25,0.85)', r * 1.7], ['rgba(255,222,92,0.9)', r * 1.15]];
      for (var L = 0; L < layers.length; L++) {
        ctx.fillStyle = layers[L][0];
        ctx.beginPath();
        for (var i = 0; i <= 8; i++) {
          var a = i / 8 * Math.PI * 2;
          var rr = layers[L][1] * (1 + 0.45 * Math.sin(t * 16 + i * 2 + L)) * intensity;
          var px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr - r * 0.35;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
      }
    }
    drawBasketball(cx, cy, r);
  }
  // the ball punching down through the backdrop's net at the rim
  function drawNetSwish(rimX, rimY, k) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
    for (var s = 0; s <= 8; s++) {
      var a = s / 8 * Math.PI * 2, rx = 12;
      ctx.beginPath();
      ctx.moveTo(rimX + Math.cos(a) * rx, rimY + Math.sin(a) * 4);
      ctx.lineTo(rimX + Math.cos(a) * rx * 0.4, rimY + 15 + k * 9);
      ctx.stroke();
    }
    if (k > 0.12) drawBasketball(rimX, rimY + 6 + (1 - k) * 16, 6);
  }
  // the big callout text + impact flash
  function drawDunkText(t) {
    if (t >= DK.slam) {
      var fl = Math.max(0, 1 - (t - DK.slam) / 0.25);
      if (fl > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (fl * 0.6).toFixed(3) + ')'; ctx.fillRect(0, 0, SW, SH); }
    }
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (t >= DK.ignite && t < DK.slam) {
      ctx.globalAlpha = Math.min(1, (t - DK.ignite) / 0.25);
      ctx.font = font(13);
      var wob = 1 + Math.sin(t * 14) * 0.06;
      ctx.translate(SW * 0.5, SH * 0.13); ctx.scale(wob, wob);
      ctx.lineWidth = 5; ctx.strokeStyle = '#1c1108';
      ctx.strokeText("HE'S ON FIRE!", 0, 0);
      ctx.fillStyle = '#ffcf3a'; ctx.fillText("HE'S ON FIRE!", 0, 0);
    } else if (t >= DK.slam) {
      ctx.font = font(12);
      var wob2 = 1 + Math.sin(t * 20) * 0.05;
      ctx.translate(SW * 0.5, SH * 0.18); ctx.scale(wob2, wob2);
      ctx.lineWidth = 5; ctx.strokeStyle = '#1c1108';
      ctx.strokeText('BOOMSHAKALAKA!', 0, 0);
      ctx.fillStyle = '#ff8a1e'; ctx.fillText('BOOMSHAKALAKA!', 0, 0);
    }
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // the NBA-Jam corner HUD: "TO CONTROL RICHARDS" in the backdrop's gold arcade
  // lettering, with his turbo meter below (pinned full and strobing while lit up)
  function drawDunkHUD(t) {
    var onFire = t >= DK.ignite && t < DK.land;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = font(7);
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#4a1c06';
    ctx.strokeText('TO CONTROL', 5, 4);
    ctx.strokeText('RICHARDS', 5, 13);
    ctx.fillStyle = '#f4ad1e';
    ctx.fillText('TO CONTROL', 5, 4);
    ctx.fillText('RICHARDS', 5, 13);
    // turbo bar
    var bx = 5, by = 24, bw = 74, bh = 6;
    ctx.fillStyle = 'rgba(8,6,12,0.8)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    var lvl = onFire ? 1 : 0.7 + 0.06 * Math.sin(t * 4);
    var fw = Math.max(0, Math.round(bw * lvl));
    var g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    if (onFire) {                                     // on fire = unlimited turbo, strobing hot
      var s = Math.sin(t * 28) > 0;
      g.addColorStop(0, s ? '#ffe24a' : '#ff7a1e');
      g.addColorStop(1, s ? '#ff7a1e' : '#ffe24a');
    } else {
      g.addColorStop(0, '#37cf46'); g.addColorStop(0.6, '#e6cf1e'); g.addColorStop(1, '#ff5a1e');
    }
    ctx.fillStyle = g; ctx.fillRect(bx, by, fw, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';              // segment ticks
    for (var sx = bx + 8; sx < bx + bw; sx += 8) ctx.fillRect(sx, by, 1, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // the backboard, dead centre above the rim -- origin of the shatter
  function backboardXY() { return [Math.round(SW * 0.575), Math.round(SH * 0.18)]; }
  // SLAM! -- the backboard explodes into a burst of glass shards that arc out
  // and rain down all over the court floor
  function spawnGlass() {
    var bb = backboardXY(), bx = bb[0], by = bb[1];
    var shades = ['rgba(205,232,255,0.92)', 'rgba(230,246,255,0.88)', 'rgba(170,210,245,0.92)', 'rgba(245,251,255,0.85)'];
    var g = [];
    for (var i = 0; i < 52; i++) {
      var x = bx + (Math.random() - 0.5) * 58;
      g.push({
        x: x, y: by + (Math.random() - 0.5) * 34,
        vx: (x - bx) * 0.7 + (Math.random() - 0.5) * 120,   // blast outward
        vy: -70 + Math.random() * 60,                        // up and out first
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 12,
        size: 1.6 + Math.random() * 3.2,
        restY: 108 + Math.random() * 122,                    // scatter across the floor depth
        shade: shades[i % shades.length], rest: false
      });
    }
    dunk.glass = g;
  }
  function updateGlass(dt) {
    var GRAV = 540;
    for (var i = 0; i < dunk.glass.length; i++) {
      var p = dunk.glass[i];
      if (p.rest) continue;
      p.vy += GRAV * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.vy > 0 && p.y >= p.restY) {                       // settle where it lands
        p.y = p.restY; p.rest = true; p.vx = 0; p.vy = 0; p.vr = 0;
      }
    }
  }
  function drawGlass() {
    if (!dunk.glass) return;
    for (var i = 0; i < dunk.glass.length; i++) {
      var p = dunk.glass[i], s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.shade;
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s * 0.85); ctx.lineTo(-s * 0.6, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';                // a sharp glint
      ctx.fillRect(-1, -Math.round(s * 0.4), 1, 1);
      ctx.restore();
    }
  }
  // a white starburst + radiating cracks on the backboard at the instant of impact
  function drawBackboardShatter(t) {
    var age = t - DK.slam;
    if (age < 0 || age > 0.6) return;
    var k = 1 - age / 0.6, bb = backboardXY(), bx = bb[0], by = bb[1];
    ctx.save();
    ctx.strokeStyle = 'rgba(235,247,255,' + k.toFixed(2) + ')'; ctx.lineWidth = 1;
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * Math.PI * 2 + i * 0.4;
      var r1 = 5 + (1 - k) * 30;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * 3, by + Math.sin(a) * 3);
      ctx.lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,' + (k * 0.7).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(bx, by, 4 + (1 - k) * 12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // the whole scene fades up from black at the start and back to black at the end
  function drawDunkFade(t) {
    var a = 0;
    if (t < DUNK_FADE) a = 1 - t / DUNK_FADE;
    else if (t > dunk.done - DUNK_FADE) a = (t - (dunk.done - DUNK_FADE)) / DUNK_FADE;
    a = Math.min(1, Math.max(0, a));
    if (a > 0) { ctx.fillStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, SW, SH); }
  }

  function drawDunk() {
    var t = dunk.t;
    var scale = 2.1;
    var rimX = Math.round(SW * 0.575), rimY = Math.round(SH * 0.235);  // the net in the backdrop
    var launchX = Math.round(SW * 0.30), floorY = Math.round(SH * 0.74); // free-throw line, foreground
    var watchX = Math.round(SW * 0.11), landX = Math.round(SW * 0.56), landY = Math.round(SH * 0.60);

    // backdrop: the real arena photo (fallback to the drawn look-alike arena)
    if (dunkImgOk) ctx.drawImage(dunkImg, 0, 0, SW, SH);
    else { if (!dunkArena) buildDunkArena(); ctx.drawImage(dunkArena, 0, 0); }

    var ease = function (x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
    var lerp = function (a, b, x) { return a + (b - a) * x; };

    // fire intensity: ramps up quickly once he ignites, holds through the slam,
    // then dies out as he settles amid the glass
    var fire = 0;
    if (t >= DK.ignite && t < DK.land) fire = Math.min(1, (t - DK.ignite) / 0.8);
    else if (t >= DK.land) fire = Math.max(0, 1 - (t - DK.land) / 1.2);

    // a rim-rattling shake on impact
    var shake = (t >= DK.slam) ? Math.max(0, 1 - (t - DK.slam) / 0.4) * 6 : 0;
    ctx.save();
    if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    var frame0 = richFrame('right', false);
    var bodyH = ((frame0 && frame0.height) || 29) * scale;
    var bodyW = ((frame0 && frame0.width) || 16) * scale;

    if (t < DK.launch) {
      // ---- PART 1: watch the court, stride out to the line, catch fire, load ----
      var cx, walking = false;
      if (t < DK.walk) {                              // stand at the edge, watching
        cx = watchX;
      } else if (t < DK.reach) {                      // stride out to the free-throw line
        cx = lerp(watchX, launchX, ease((t - DK.walk) / (DK.reach - DK.walk))); walking = true;
      } else {                                        // planted on the line
        cx = launchX;
      }
      var squash = 1;
      if (t >= DK.launch - 0.28) squash = 1 - 0.22 * ((t - (DK.launch - 0.28)) / 0.28); // crouch to load
      var bodyHs = bodyH * squash;
      var handY = floorY - bodyHs * 0.55, ballX = cx + bodyW * 0.44, ballY = handY;
      drawFireAura(cx, floorY, bodyW, bodyHs, t, fire);
      blitRich(richFrame('right', walking), cx, floorY, scale, squash, 0);
      drawFireBall(ballX, ballY, 7, t, fire);
      ctx.restore();
      drawDunkText(t);
      drawDunkHUD(t);
      drawDunkFade(t);
      return;
    }

    // ---- PART 2: soar to the rim, spinning, SLAM, shatter the glass, land ----
    var cx2, cy2, rot;
    if (t < DK.slam) {                                // flight: an arc up to the rim
      var u = ease((t - DK.launch) / (DK.slam - DK.launch));
      cx2 = lerp(launchX, rimX, u);
      cy2 = lerp(floorY - bodyH * 0.5, rimY + bodyH * 0.2, u) - Math.sin(u * Math.PI) * bodyH * 0.55;
      rot = (t - DK.launch) / (DK.slam - DK.launch) * Math.PI * 4;   // two full spins
    } else {                                          // hang a beat, then drop to the floor upright
      var d = Math.min(1, (t - DK.slam) / (DK.land - DK.slam));
      cx2 = lerp(rimX, landX, d);
      cy2 = lerp(rimY + bodyH * 0.2, landY - bodyH * 0.5, d * d);
      rot = 0;
    }

    // his flames spin with him
    ctx.save();
    ctx.translate(cx2, cy2); ctx.rotate(rot);
    drawFireAura(0, bodyH * 0.5, bodyW, bodyH, t, fire);
    ctx.restore();
    blitRichCentered(frame0, cx2, cy2, scale, rot, 1);

    // the ball rides in his hands until the slam, then it's punched through the net
    if (t < DK.slam) {
      var ox = bodyW * 0.44, oy = -bodyH * 0.12;
      drawFireBall(cx2 + ox * Math.cos(rot) - oy * Math.sin(rot),
                   cy2 + ox * Math.sin(rot) + oy * Math.cos(rot), 7, t, fire);
    } else {
      drawNetSwish(rimX, rimY, Math.max(0, 1 - (t - DK.slam) / 0.5));
    }
    ctx.restore();

    drawBackboardShatter(t);   // the burst at the moment of impact
    drawGlass();               // shards flying out and settling on the floor
    drawDunkText(t);
    drawDunkHUD(t);
    drawDunkFade(t);
  }

  // one bobbing balloon bunch (three balloons + strings)
  function drawBalloons(x, y, t, seed) {
    var cols = ['#c43a3a', '#f7d84d', '#3a63c4', '#2e8f57', '#9a6ee0', '#e06a92'];
    for (var i = 0; i < 3; i++) {
      var bx = x + (i - 1) * 6 + Math.sin(t * 1.4 + seed + i) * 1.5;
      var by = y + (i === 1 ? -4 : 0) + Math.sin(t * 1.8 + seed + i * 2) * 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.moveTo(bx, by + 5); ctx.lineTo(x, y + 16); ctx.stroke();
      ctx.fillStyle = cols[(seed + i) % cols.length];
      ctx.beginPath(); ctx.ellipse(bx, by, 3.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 3, 1, 2);
    }
  }

  // the DJ table draws inside the y-sorted entity pass, so dancers walking
  // in FRONT of it appear in front (and Eddie stays tucked behind the decks)
  function drawDjBooth(cam) {
    var t = party.t;
    var tiles = BOOTH.x1 - BOOTH.x0 + 1;
    var bw = TS * tiles;
    var bx = BOOTH.x0 * TS - cam.x, by = BOOTH.y * TS - cam.y;

    // the blowout rig gets speaker stacks flanking the booth: tall dark
    // cabinets, woofers thumping in time with the music
    if (party.tier >= 4) {
      [bx - TS * 2 + 2, bx + bw + 2].forEach(function (sx0, si) {
        var sw2 = TS + 8, sh2 = TS * 2 + 6;
        var sy0 = by - TS - 4;
        ctx.fillStyle = '#14141c';
        ctx.fillRect(sx0 - 2, sy0 - 2, sw2 + 4, sh2 + 4);
        ctx.fillStyle = '#20202c';
        ctx.fillRect(sx0, sy0, sw2, sh2);
        // two woofers, radius pulsing on the beat
        [sy0 + 11, sy0 + 27].forEach(function (wy, wi) {
          var pump = 1 + Math.abs(Math.sin(t * 8 + si + wi)) * 1.6;
          ctx.fillStyle = '#0a0a10';
          ctx.beginPath(); ctx.arc(sx0 + sw2 / 2, wy, 5.5 + pump, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#3a3a4c';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(sx0 + sw2 / 2, wy, 3 + pump * 0.6, 0, Math.PI * 2); ctx.stroke();
        });
        // tweeter
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(sx0 + sw2 / 2 - 2, sy0 + 2, 4, 4);
      });
    }

    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(bx - 2, by - 2, bw + 4, TS + 4);
    ctx.fillStyle = '#2a3450';
    ctx.fillRect(bx, by, bw, TS);
    ctx.fillStyle = '#4a5a80';
    ctx.fillRect(bx, by, bw, 3);
    G.Tiles.drawTinyText(ctx, 'DJ EDDIE', bx + Math.round(bw / 2) - 16, by + 10, '#f7d84d', 1);
    // two spinning vinyls
    [bx + 9, bx + bw - 9].forEach(function (cxx, i) {
      var cy = by + 5;
      ctx.fillStyle = '#0c0c14';
      ctx.beginPath(); ctx.arc(cxx, cy, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2a3a';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cxx, cy, 3.5, 0, Math.PI * 2); ctx.stroke();
      var a = t * 6 + i * 1.2;
      ctx.strokeStyle = '#8a8f96';
      ctx.beginPath(); ctx.moveTo(cxx, cy); ctx.lineTo(cxx + Math.cos(a) * 5, cy + Math.sin(a) * 5); ctx.stroke();
      ctx.fillStyle = '#f7d84d';
      ctx.fillRect(cxx - 1, cy - 1, 2, 2);
    });
    // full rig only: a bar of color-cycling party lights along the booth front
    if (party.tier >= 4) {
      var LC = ['#f7d84d', '#5fbd87', '#3a63c4', '#e06a92', '#9a6ee0'];
      for (var li2 = 0; li2 < 5; li2++) {
        var lx2 = bx + 6 + li2 * ((bw - 12) / 4);
        var on = Math.sin(t * 5 + li2 * 1.3) > 0;
        ctx.fillStyle = on ? LC[(li2 + Math.floor(t)) % LC.length] : '#20202c';
        ctx.fillRect(Math.round(lx2) - 1, by + TS, 3, 3);
      }
      drawFountains(bx, by, bw);
    }
  }

  // two sparks fountains, one either side of Eddie, jetting green and gold.
  // Cold-spark style: they arc up and fade, no flame, nothing that scorches
  // the gym floor a real principal would have to answer for.
  function drawFountains(bx, by, bw) {
    var bases = [bx - 46, bx + bw + 42]; // clear of the speaker stacks
    var ny = by + 12;                    // nozzle height
    ctx.globalCompositeOperation = 'lighter';
    (party.fountain || []).forEach(function (s) {
      var b = bases[s.side];
      var fade = 1 - s.t / s.life;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = s.c;
      var sz = s.t < 0.2 ? 3 : 2;
      ctx.fillRect(Math.round(b + s.x), Math.round(ny + s.y), sz, sz);
    });
    // a bright column of light standing over each nozzle
    bases.forEach(function (b) {
      var col = ctx.createLinearGradient(0, ny - 46, 0, ny + 4);
      col.addColorStop(0, 'rgba(120,255,170,0)');
      col.addColorStop(0.55, 'rgba(190,255,150,0.16)');
      col.addColorStop(1, 'rgba(255,248,190,0.5)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.fillRect(b - 9, ny - 46, 20, 50);
      var g = ctx.createRadialGradient(b + 1, ny, 1, b + 1, ny, 18);
      g.addColorStop(0, 'rgba(255,255,225,0.95)');
      g.addColorStop(1, 'rgba(255,255,225,0)');
      ctx.fillStyle = g;
      ctx.fillRect(b - 17, ny - 17, 36, 36);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // the canisters they fire out of
    bases.forEach(function (b) {
      ctx.fillStyle = '#14141c';
      ctx.fillRect(b - 6, ny + 1, 14, 13);
      ctx.fillStyle = '#2a3450';
      ctx.fillRect(b - 5, ny + 2, 12, 11);
      ctx.fillStyle = '#5fbd87';
      ctx.fillRect(b - 5, ny + 2, 12, 2);
    });
  }

  // kid-safe disco lights + decorations, layered over the gym
  function drawPartyScene(cam) {
    var t = party.t;
    ctx.imageSmoothingEnabled = false;

    // party banner across the stage curtain
    var bnx = 33 * TS - cam.x, bny = 9 * TS + 5 - cam.y;
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(bnx - 44, bny - 2, 88, 11);
    ctx.fillStyle = '#8a6d1a';
    ctx.fillRect(bnx - 44, bny - 2, 88, 1);
    ctx.fillRect(bnx - 44, bny + 8, 88, 1);
    G.Tiles.drawTinyText(ctx, 'GO EAGLES!', bnx - 24, bny + 1, '#14522f', 1);

    // giant golden S-O-A-R bobbing above the banner -- and MASSIVE, spanning
    // the whole top of the gym, on a perfect (everyone-met) run
    var SOAR = ['S', 'O', 'A', 'R'];
    var ls = party.perfect ? 54 : 28, lgap = party.perfect ? 12 : 5;
    var lw = SOAR.length * ls + (SOAR.length - 1) * lgap;
    var soarBase = party.perfect ? bny - 4 : bny - 10;
    for (var li = 0; li < SOAR.length; li++) {
      var glx = Math.round(bnx - lw / 2 + li * (ls + lgap));
      var gly = Math.round(soarBase - ls + Math.sin(t * 2 + li * 0.9) * (party.perfect ? 4 : 2.5));
      ctx.drawImage(G.Quest.icons[SOAR[li]], glx, gly, ls, ls);
      // the followers' twinkle, supersized
      if ((Math.floor(t * 6) + li * 3) % 9 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(glx + 3 + (li * 9) % 20, gly + 3, 3, 3);
      }
    }

    // streamers scalloped along the top of the gym -- blowout only
    if (party.tier >= 4) {
      var cols2 = ['#c43a3a', '#3a63c4', '#2e8f57', '#9a6ee0', '#e06a92'];
      for (var st = 0; st < 12; st++) {
        var sx0 = (22 + st * 2) * TS - cam.x;
        ctx.strokeStyle = cols2[st % cols2.length];
        ctx.beginPath();
        ctx.moveTo(sx0, 9 * TS - cam.y);
        ctx.quadraticCurveTo(sx0 + TS, 9 * TS + 10 - cam.y, sx0 + TS * 2, 9 * TS - cam.y);
        ctx.stroke();
      }
    }

    // balloon bunches: the works at the blowout, a couple otherwise
    drawBalloons(23 * TS - cam.x, 11 * TS - cam.y, t, 0);
    drawBalloons(43 * TS - cam.x, 11 * TS - cam.y, t, 2);
    if (party.tier >= 4) {
      drawBalloons(22 * TS - cam.x, 25 * TS - cam.y, t, 4);
      drawBalloons(44 * TS - cam.x, 24 * TS - cam.y, t, 1);
      drawBalloons(33 * TS - cam.x, 26 * TS - cam.y, t, 3);
    }

    // TIER 1 keeps the house lights up: it is a gym, with people dancing in
    // it, and that is the whole charm. The light show starts at tier 2.
    if (party.tier >= 2) {
      // gentle dimming pulse (never dark, never strobing)
      ctx.fillStyle = 'rgba(12,8,44,' + (0.30 + 0.08 * Math.sin(t * 3)).toFixed(3) + ')';
      ctx.fillRect(0, 0, SW, SH);
      // tier 2 is a pair of school-colour lights fading green <-> gold; tiers
      // 3 and 4 open up the full three-colour sweep
      ctx.globalCompositeOperation = 'lighter';
      var colors = party.tier === 2
        ? ['#5fbd87', '#f7d84d']
        : ['#f7d84d', '#5fbd87', '#3a63c4'];
      for (var i2 = 0; i2 < colors.length; i2++) {
        var lx = (33 + 10 * Math.sin(t * (0.9 + i2 * 0.35) + i2 * 2.1)) * TS - cam.x;
        var ly = (18 + 6 * Math.sin(t * (1.2 + i2 * 0.3) + i2 * 1.4)) * TS - cam.y;
        var g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 55);
        g.addColorStop(0, colors[i2]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        // tier 2's two lights breathe in and out of each other, so the room
        // reads as flashing green and gold -- a slow fade, never a strobe
        ctx.globalAlpha = party.tier === 2
          ? 0.10 + 0.32 * (0.5 + 0.5 * Math.sin(t * 3 + i2 * Math.PI))
          : 0.22;
        ctx.fillStyle = g;
        ctx.fillRect(lx - 55, ly - 55, 110, 110);
      }
      // tier 2 washes the WHOLE gym green, then gold, then green again, so
      // there is no mistaking what colour the room is doing
      if (party.tier === 2) {
        var swing = 0.5 + 0.5 * Math.sin(t * 3);
        ctx.globalAlpha = 0.20 * (1 - swing);
        ctx.fillStyle = '#5fbd87';
        ctx.fillRect(0, 0, SW, SH);
        ctx.globalAlpha = 0.20 * swing;
        ctx.fillStyle = '#f7d84d';
        ctx.fillRect(0, 0, SW, SH);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // disco ball above the stage
    var dbx = 33 * TS - cam.x, dby = 10 * TS + 4 - cam.y;
    ctx.strokeStyle = '#8a8f96';
    ctx.beginPath(); ctx.moveTo(dbx, dby - 8); ctx.lineTo(dbx, dby); ctx.stroke();
    ctx.fillStyle = '#c9cfd5';
    ctx.beginPath(); ctx.arc(dbx, dby + 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (var s3 = 0; s3 < 6; s3++) {
      var sa = t * 1.5 + s3;
      ctx.fillRect(Math.round(dbx + Math.cos(sa) * (10 + s3 * 5)), Math.round(dby + 4 + Math.sin(sa) * 5), 2, 2);
    }
    // fireworks bursting over the gym, brightest thing in the room
    if (party.fireworks) {
      ctx.globalCompositeOperation = 'lighter';
      party.fireworks.forEach(function (f) {
        var p = f.t / f.life;
        ctx.globalAlpha = Math.max(0, 1 - p * p);
        ctx.fillStyle = f.c;
        f.parts.forEach(function (sp) {
          var r = sp.sp * f.t;
          var px = f.x + Math.cos(sp.a) * r;
          var py = f.y + Math.sin(sp.a) * r + 34 * f.t * f.t;
          ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
        });
        // the white flash right at the burst
        if (f.t < 0.12) {
          ctx.globalAlpha = 1 - f.t / 0.12;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(f.x, f.y, 7, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // confetti rains over everything, bright above the lights
    if (party.confetti) {
      party.confetti.forEach(function (p) {
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      });
    }

    // the perfect-run spectacle: laser beams raking the room and a couple of
    // ridiculous giant beach balls bouncing right over the crowd
    if (party.perfect) drawPerfectExtras(cam, t);
  }

  // sweeping laser fan + oversized bouncing beach balls (stateless: positions
  // come straight off the clock, so there is nothing to update or reset)
  function drawPerfectExtras(cam, t) {
    // lasers fan out from the disco ball and sweep across the whole gym
    var ox = 33 * TS - cam.x, oy = 10 * TS + 4 - cam.y;
    var LZ = ['#ff3a6e', '#3aff8a', '#3a9dff', '#f7ff3a', '#c46aff', '#ff8a3a'];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.5;
    for (var i = 0; i < 6; i++) {
      var ang = Math.PI * 0.28 + Math.sin(t * 1.6 + i * 1.05) * 0.9 + i * 0.06;
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 6 + i);
      ctx.strokeStyle = LZ[i % LZ.length];
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(ang) * 260, oy + Math.sin(ang) * 260);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // three big beach balls arcing across the gym floor, spinning as they go
    var BALL = [
      { c: '#f7d84d', c2: '#5fbd87', spd: 40, ph: 0, r: 9 },
      { c: '#ff8ad4', c2: '#6ff0ff', spd: -33, ph: 2.1, r: 11 },
      { c: '#ffae4a', c2: '#3a63c4', spd: 27, ph: 4.2, r: 8 }
    ];
    var gx0 = 22 * TS, gx1 = 45 * TS, span = gx1 - gx0;
    BALL.forEach(function (b) {
      var wx = gx0 + (((b.ph * 90 + t * b.spd) % span) + span) % span;
      var groundY = 25 * TS;
      var wy = groundY - Math.abs(Math.sin(t * 2.2 + b.ph)) * 60;
      var sx = Math.round(wx - cam.x), sy = Math.round(wy - cam.y);
      // striped ball: two colours split down a spinning axis
      var a = t * 5 + b.ph;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a);
      ctx.fillStyle = b.c;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = b.c2;
      ctx.beginPath(); ctx.arc(0, 0, b.r, -0.5, 0.5); ctx.arc(0, 0, 0, 0, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, b.r, Math.PI - 0.5, Math.PI + 0.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(-b.r * 0.35, -b.r * 0.35, b.r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function finishParty() {
    transition = {
      phase: 'out', t: 0,
      onMid: function () {
        var m = G.Maps.all.basement;
        if (party) {
          m.npcs = party.savedNpcs;
          party = null;
        }
        G.Quest.setPartyMode(false);
        G.Audio.stopParty();
        beginEnding();
      }
    };
  }

  function updateConfetti(dt) {
    confetti.forEach(function (p) {
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin((p.y + p.x) / 20) * 0.4;
      if (p.y > SH + 4) { p.y = -4; p.x = Math.random() * SW; }
    });
  }

  // ---- rendering ----------------------------------------------------------
  function cameraPos() {
    var m = map();
    var mw = m.w * TS, mh = m.h * TS;
    var cx = Math.round(player.x + 8 - SW / 2);
    var cy = Math.round(player.y + 8 - SH / 2);
    cx = Math.max(0, Math.min(mw - SW, cx));
    cy = Math.max(0, Math.min(mh - SH, cy));
    if (mw < SW) cx = Math.round((mw - SW) / 2);
    if (mh < SH) cy = Math.round((mh - SH) / 2);
    return { x: cx, y: cy };
  }

  function tileCanvas(type) {
    if (type.indexOf('banner:') === 0) {
      // a letter only appears on the wall once Mrs. Walker puts it back up
      var letter = type.split(':')[1];
      return G.Tiles.get(type + ':' + (G.Quest.delivered[letter] ? '1' : '0'));
    }
    return G.Tiles.get(type);
  }

  function drawWorld() {
    var m = map();
    var cam = cameraPos();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SW, SH);

    var x0 = Math.floor(cam.x / TS), y0 = Math.floor(cam.y / TS);
    var x1 = Math.ceil((cam.x + SW) / TS), y1 = Math.ceil((cam.y + SH) / TS);

    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        var t = m.get(tx, ty);
        var dx = tx * TS - cam.x, dy = ty * TS - cam.y;
        if (t === 'void') {
          // the school is solid building mass outside the halls and rooms
          ctx.drawImage(tileCanvas('voidwall'), dx, dy);
          continue;
        }
        // FF6-style walls: bright FACE where it meets the floor below,
        // darker TOP everywhere else
        var drawType = t;
        if (t === 'wall' && !G.Tiles.isWalkable(m.get(tx, ty + 1))) {
          drawType = 'wallTop';
        } else if (t === 'table') {
          // tables join vertically: edge on top, wood through, bench at bottom
          var tUp = m.get(tx, ty - 1) === 'table';
          var tDn = m.get(tx, ty + 1) === 'table';
          drawType = tUp && tDn ? 'tableMid' : tUp ? 'tableBot' : tDn ? 'tableTop' : 'table';
        } else if (t === 'gtable') {
          var gUp = m.get(tx, ty - 1) === 'gtable';
          var gDn = m.get(tx, ty + 1) === 'gtable';
          drawType = gUp && gDn ? 'gtableMid' : gUp ? 'gtableBot' : gDn ? 'gtableTop' : 'gtable';
        } else if (t === 'kidney') {
          var kL = m.get(tx - 1, ty) === 'kidney';
          var kR = m.get(tx + 1, ty) === 'kidney';
          drawType = kL && kR ? 'kidneyM' : kL ? 'kidneyR' : kR ? 'kidneyL' : 'kidney';
        } else if (t === 'welcome') {
          drawType = m.get(tx - 1, ty) === 'welcome' ? 'welcomeR' : 'welcomeL';
        }
        ctx.drawImage(tileCanvas(drawType), dx, dy);
        var walkable = G.Tiles.isWalkable(t);
        if (walkable) {
          // soft graded shadow cast by the wall above (16-bit style)
          var above = m.get(tx, ty - 1);
          if (!G.Tiles.isWalkable(above) && above !== 'void') {
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.fillRect(dx, dy, TS, 3);
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(dx, dy + 3, TS, 3);
          }
        } else if (t !== 'void') {
          // dark baseboard where wall meets floor
          var below = m.get(tx, ty + 1);
          if (G.Tiles.isWalkable(below)) {
            ctx.fillStyle = '#17171c';
            ctx.fillRect(dx, dy + TS - 3, TS, 3);
          }
        }
      }
    }

    // the gym's basketball court lines (smooth vector arcs over the wood)
    if (currentMapId === 'basement') {
      ctx.save();
      ctx.translate(-cam.x, -cam.y);
      G.drawCourtLines(ctx, TS);
      ctx.restore();
    }
    // Mr. Richards keeps four basketballs scattered around his room
    if (currentMapId === 't-216') drawRichardsGoal(cam, m);
    // once Mrs. Adams announces sushi day, chopsticks appear on every table
    if (currentMapId === 'm-caf' && G.Quest.sushiSpoken && G.Quest.sushiSpoken()) {
      drawCafeteriaChopsticks(cam, m);
    }
    // the big playground structure over its platform tiles
    if (m.playset) {
      ctx.save();
      ctx.translate(-cam.x, -cam.y);
      G.drawPlayset(ctx, TS, m.playset);
      ctx.restore();
    }

    // wall-mounted name signs sit behind the characters
    // (except at the party -- the gym goes full decoration, no signage)
    if (!party) drawDoorSigns(cam);
    // the Dolly banner hangs on the wall BEHIND everybody
    if (toddParty) drawDollyBanner(cam);

    // entities sorted by y
    var ents = [];
    m.npcs.forEach(function (n) {
      ents.push({ y: (n.py !== undefined ? n.py : n.y * TS), npc: n });
    });
    ents.push({ y: player.y, player: true });
    // the DJ table takes part in the sort like any other body in the room
    if (partyHasDj()) ents.push({ y: BOOTH.y * TS + 8, booth: true });
    ents.sort(function (a, b) { return a.y - b.y; });

    function dropShadow(cx, cy) {
      // soft oval shadow under every character - classic SNES touch
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ents.forEach(function (e) {
      if (e.booth) { drawDjBooth(cam); return; }
      if (e.player) {
        if (playerDance && party) { drawDancePlayer(cam, dropShadow); return; }
        var fset = playerFrames[player.dir];
        var frame = fset[0];
        if (player.moving) {
          frame = fset[1 + (Math.floor(player.anim) % 2)];
        }
        dropShadow(Math.round(player.x - cam.x) + 8, Math.round(player.y - cam.y) + 15.5);
        ctx.drawImage(frame, Math.round(player.x - cam.x), Math.round(player.y - 8 - cam.y));
      } else {
        var n = e.npc;
        var npx = (n.px !== undefined) ? n.px : n.x * TS;
        var npy = (n.py !== undefined) ? n.py : n.y * TS;
        var nx = Math.round(npx - cam.x), ny = Math.round(npy - cam.y);
        dropShadow(nx + 8, ny + 15.5);
        if (n.kind === 'eagle') {
          if (n.dj && party) {
            // DJ Eddie: bobbing at the decks, occasionally throwing his
            // wings up, headphones on
            var djBob = Math.round(Math.sin(party.t * 7) * 2);
            if (party.t % 2.4 < 0.5) {
              ctx.drawImage(eagleFlyFrames[Math.floor(party.t * 6) % 2], nx - 8, ny - 6 + djBob);
            } else {
              ctx.drawImage(eagleSprite, nx, ny - 4 + djBob);
              ctx.fillStyle = '#20203a';
              ctx.fillRect(nx + 4, ny - 4 + djBob, 9, 2);   // headphone band
              ctx.fillRect(nx + 3, ny - 2 + djBob, 2, 4);   // ear cups
              ctx.fillRect(nx + 12, ny - 2 + djBob, 2, 4);
            }
          } else if (party && n.dancing) {
            // no decks tonight: Eddie is out on the floor busting a move
            var hop = Math.round(Math.abs(Math.sin(party.t * 5)) * 4);
            ctx.drawImage(eagleSprite, nx, ny - 4 - hop);
          } else if (n.wingOpen > 0) {
            // wings spread for a beat -- a single held pose, not a flap (the
            // fly frames are 32 wide, so center them over his 16-wide body)
            ctx.drawImage(eagleFlyFrames[0], nx - 8, ny - 4);
          } else {
            ctx.drawImage(eagleSprite, nx, ny - 4);
          }
        } else {
          var tf = n.kind === 'officer' ? officerFrames : teacherFrames[n.roomId];
          var frame = (n.tx !== undefined || n.dancing)
            ? tf[n.dir || 'down'][1 + (Math.floor(n.anim) % 2)]
            : tf[n.dir || 'down'][0];
          // grown-ups use the native 16x29 adult template (and Mr. Farmer
          // stands taller than everyone) -- feet stay planted on the same tile
          var t2 = n.kind === 'teacher' && G.TEACHERS[n.roomId];
          var ah = t2 && t2.tall ? frame.height + 2 : frame.height;
          var dy = ny - (ah - 16) - Math.round(n.hop || 0);
          if (n.tumble) {
            // head over heels: spin the whole sprite about its middle
            ctx.save();
            ctx.translate(nx + 8, dy + ah / 2);
            ctx.rotate(n.spin || 0);
            ctx.drawImage(frame, 0, 0, 16, frame.height, -8, -ah / 2, 16, ah);
            ctx.restore();
          } else {
            // dancers hop; the shadow stays on the ground
            ctx.drawImage(frame, 0, 0, 16, frame.height, nx, dy, 16, ah);
          }
          // glowsticks: waved overhead, one per guest at the blowout
          if (n.glow && party) {
            var ga = Math.sin(party.t * 4 + (n.dance ? n.dance.phase : 0)) * 0.9;
            var gx = nx + 8 + Math.cos(ga - Math.PI / 2) * 9;
            var gy = dy + 4 + Math.sin(ga - Math.PI / 2) * 9;
            ctx.globalCompositeOperation = 'lighter';
            var gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 7);
            gg.addColorStop(0, n.glow);
            gg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gg;
            ctx.fillRect(gx - 7, gy - 7, 14, 14);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = n.glow;
            ctx.fillRect(Math.round(gx) - 1, Math.round(gy) - 2, 2, 5);
          }
        }
      }
    });

    // lights out! a pool of light follows the player through the dark
    if (lightsOff[currentMapId]) {
      var lx = Math.round(player.x - cam.x) + 8;
      var ly = Math.round(player.y - cam.y) + 8;
      var lg = ctx.createRadialGradient(lx, ly, 14, lx, ly, 64);
      lg.addColorStop(0, 'rgba(4,6,22,0)');
      lg.addColorStop(0.55, 'rgba(4,6,22,0.55)');
      lg.addColorStop(1, 'rgba(4,6,22,0.88)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, SW, SH);
      ctx.fillStyle = 'rgba(4,6,22,0.88)';
      // darken beyond the gradient's reach
      if (lx - 64 > 0) ctx.fillRect(0, 0, lx - 64, SH);
      if (lx + 64 < SW) ctx.fillRect(lx + 64, 0, SW - lx - 64, SH);
      if (ly - 64 > 0) ctx.fillRect(Math.max(0, lx - 64), 0, 128, ly - 64);
      if (ly + 64 < SH) ctx.fillRect(Math.max(0, lx - 64), ly + 64, 128, SH - ly - 64);
    }

    // the golden letters float along behind the player
    drawFollowers(cam);
    if (ceremony) drawCeremony(cam);
    // DJ booth, spinning vinyls and disco lights over everything
    if (party) drawPartyScene(cam);
    // Mrs. Todd's office turns into a one-woman Dolly concert
    if (toddParty) drawToddParty(cam);
    // the objective arrow rides above everything, even the dark
    drawGuideArrow(cam);
    // ...and Eddie rides above even that
    if (eddieVisit) drawEddieVisit();
  }

  // ---- door signs: the shared engine lives in js/signs.js -----------------
  function signLabel(roomId) { return G.Signs.label(roomId); }
  function getSign(roomId, orient) { return G.Signs.get(roomId, orient); }
  function signLayout(m) { return G.Signs.layout(m); }

  // ---- friendly place names: "MRS. SMITH'S ROOM (213)", not "MRS. SMITH" --
  function locationLabel(roomId) {
    var room = G.ROOMS[roomId];
    var t = G.TEACHERS[roomId];
    var num = /^ROOM (\d+)(?: - (.+))?$/.exec(room.name);
    if (t && num) {
      var who = (t.co ? t.name + ' & ' + t.co : t.name).toUpperCase();
      // team-taught rooms skip the possessive: two names is already a mouthful
      if (t.co) return who + ' (ROOM ' + num[1] + ')';
      var poss = who + (who.slice(-1) === 'S' ? "'" : "'S");
      var kind = num[2] && num[2] !== 'PLC ROOM' ? num[2] + ' ROOM' : 'ROOM';
      return poss + ' ' + kind + ' (' + num[1] + ')';
    }
    return room.name;   // offices, gym, specials: their names already say it
  }

  // what "CURRENT LOCATION" says, for both HUD layouts. A hallway names its
  // floor -- kids need to know they're on the MIDDLE FLOOR for "up on the top
  // floor" to mean anything -- and the map already carries that name.
  function currentPlaceLabel() {
    if (party) return "LET'S CELEBRATE THE ASHLAND WAY!";
    var m = G.Maps.all[currentMapId];
    if (m.outdoor) return 'THE PLAYGROUND';
    if (!m.isHall) return locationLabel(currentMapId);
    return inGymArea() ? G.ROOMS['b-gym'].name : m.name + ' HALLWAY';
  }

  // wrap sidebar text into centered lines that fit the panel (max 3)
  function wrapSide(text) {
    var max = SIDE_W - 8;
    var lines = [];
    var cur = '';
    String(text).split(' ').forEach(function (w) {
      var tryLine = cur ? cur + ' ' + w : w;
      if (!cur || ctx.measureText(tryLine).width <= max) cur = tryLine;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    while (lines.length > 3) lines[2] += ' ' + lines.splice(3, 1)[0];
    return lines;
  }

  function drawDoorSigns(cam) {
    var m = map();
    if (!m.isHall) return;
    var rects = signLayout(m);
    rects.forEach(function (r) {
      ctx.drawImage(r.sign, r.x - cam.x, r.y - cam.y);
    });
    // redraw doors and wall decor so they sit in FRONT of the signs
    rects.forEach(function (r) {
      var x0 = Math.floor(r.x / TS), x1 = Math.floor((r.x + r.w - 1) / TS);
      var y0 = Math.floor(r.y / TS), y1 = Math.floor((r.y + r.h - 1) / TS);
      for (var ty = y0; ty <= y1; ty++) {
        for (var tx = x0; tx <= x1; tx++) {
          var t = m.get(tx, ty);
          if (t === 'wall' || t === 'wallTop' || t === 'voidwall' || t === 'void') continue;
          if (G.Tiles.isWalkable(t) && t !== 'door' && t !== 'stairU' && t !== 'stairD') continue;
          ctx.drawImage(tileCanvas(t), tx * TS - cam.x, ty * TS - cam.y);
        }
      }
    });
  }

  // ---- the same stats, stacked above and below (upright phones) -----------
  function hudLocation() { return currentPlaceLabel(); }
  function hudObjective() {
    var m = G.Maps.all[currentMapId];
    var focus = m.isHall ? (inGymArea() ? 'b-gym' : null) : currentMapId;
    var curFloor = m.isHall ? currentMapId : (G.ROOMS[currentMapId] ? G.ROOMS[currentMapId].floor : 'middle');
    return G.Quest.objective(focus, curFloor);
  }
  // wrap to an arbitrary pixel width (the sidebar version is fixed at 104)
  function wrapTo(text, max) {
    var lines = [], cur = '';
    String(text).split(' ').forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (!cur || ctx.measureText(t).width <= max) cur = t;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function drawStackedHud() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = font(8);

    // ---- top strip: the school badge, and where you are ----
    G.Dialogue.drawWindow(ctx, 4, 2, 150, TOP_H - 6);
    ctx.fillStyle = '#f7d84d';
    ctx.fillText('ASHLAND', 79, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ELEMENTARY', 79, 20);

    ctx.fillStyle = '#9fd4e8';
    ctx.fillText('CURRENT LOCATION', 238, 4);
    ctx.fillStyle = '#ffffff';
    var loc = wrapTo(hudLocation(), 150);
    while (loc.length > 2) loc[1] += ' ' + loc.splice(2, 1)[0];
    loc.forEach(function (line, i) { ctx.fillText(line, 238, 17 + i * 10); });

    // ---- bottom strip: letters, what to do next, rooms visited ----
    var y0 = TOP_H + SH;
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(0, y0, SW, 1);

    ctx.fillStyle = '#f7d84d';
    ctx.fillText('LETTERS', 52, y0 + 6);
    G.Quest.LETTERS.forEach(function (l, i) {
      ctx.fillStyle = G.Quest.delivered[l] ? '#f7d84d'
        : G.Quest.found[l]
          ? (Math.floor(Date.now() / 400) % 2 ? '#fdf0a8' : '#f7d84d')
          : 'rgba(255,255,255,0.18)';
      ctx.fillText(l, 25 + i * 18, y0 + 20);
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillText(G.Quest.countFound() + ' OF 4', 52, y0 + 34);

    ctx.fillStyle = '#5fbd87';
    ctx.fillText('ASHLAND', 270, y0 + 6);
    ctx.fillStyle = '#f7d84d';
    ctx.fillText('STAFF', 270, y0 + 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(countMet() + '/' + staffTotal(), 270, y0 + 32);

    // the blinking prompt sits between them, under its own little rule,
    // with Eddie keeping watch below
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(122, y0 + 9, 78, 1);
    if (Date.now() % 2400 > 450) {
      var obj = hudObjective();
      var lines = wrapTo(obj.text, 108);
      while (lines.length > 3) lines[2] += ' ' + lines.splice(3, 1)[0];
      ctx.strokeStyle = '#1e7a3c';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.fillStyle = '#f7d84d';
      var top = y0 + (lines.length === 3 ? 12 : lines.length === 2 ? 16 : 21);
      lines.forEach(function (line, i) {
        ctx.strokeText(line, 161, top + i * 11);
        ctx.fillText(line, 161, top + i * 11);
      });
      ctx.lineWidth = 1;
    }
    ctx.drawImage(eagleSprite, 153, y0 + BOT_H - 19);
    ctx.textAlign = 'left';
  }

  // ---- Gauntlet-style stats panel on the right ----------------------------
  function drawSidebar() {
    var x0 = SW;
    var cx = x0 + SIDE_W / 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(x0, 0, SIDE_W, SH);
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(x0, 0, 2, SH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // marquee
    G.Dialogue.drawWindow(ctx, x0 + 5, 4, SIDE_W - 10, 40);
    ctx.font = font(8);
    ctx.fillStyle = '#f7d84d';
    ctx.fillText('ASHLAND', cx, 13);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ELEMENTARY', cx, 27);

    function divider(y) {
      ctx.fillStyle = '#3a3f4a';
      ctx.fillRect(x0 + 8, y, SIDE_W - 16, 1);
    }

    // letters found
    ctx.font = font(8);
    ctx.fillStyle = '#f7d84d';
    ctx.fillText('LETTERS', cx, 54);
    G.Quest.LETTERS.forEach(function (l, i) {
      // on the wall: solid gold. following you: gold that gently pulses.
      ctx.fillStyle = G.Quest.delivered[l] ? '#f7d84d'
        : G.Quest.found[l]
          ? (Math.floor(Date.now() / 400) % 2 ? '#fdf0a8' : '#f7d84d')
          : 'rgba(255,255,255,0.18)';
      ctx.fillText(l, x0 + 26 + i * 20, 70);
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillText(G.Quest.countFound() + ' OF 4', cx, 86);
    divider(102);

    // Ashland staff -- every hello grows the party waiting in the gym
    ctx.fillStyle = '#5fbd87';
    ctx.fillText('ASHLAND', cx, 106);
    ctx.fillStyle = '#f7d84d';
    ctx.fillText('STAFF', cx, 118);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(countMet() + '/' + staffTotal(), cx, 131);
    divider(142);

    // where the player is right now
    var m = G.Maps.all[currentMapId];
    var location = currentPlaceLabel();
    // "CURRENT LOCATION" is wider than the panel, so it stacks -- the same
    // shape as ASHLAND / STAFF just above it
    ctx.fillStyle = '#9fd4e8';
    ctx.fillText('CURRENT', cx, 146);
    ctx.fillText('LOCATION', cx, 157);
    ctx.fillStyle = '#ffffff';
    var locLines = wrapSide(location);
    var LOC_YS = { 1: [174], 2: [170, 181], 3: [168, 177, 186] };
    locLines.forEach(function (line, i) {
      ctx.fillText(line, cx, LOC_YS[locLines.length][i]);
    });
    divider(194);

    // the arcade prompt: whatever the player should do RIGHT NOW. It blinks
    // off briefly every couple of seconds so the eye keeps coming back to it
    if (Date.now() % 2400 > 450) {
      var focus = m.isHall ? (inGymArea() ? 'b-gym' : null) : currentMapId;
      var curFloor = m.isHall ? currentMapId : (G.ROOMS[currentMapId] ? G.ROOMS[currentMapId].floor : 'middle');
      var obj = G.Quest.objective(focus, curFloor);
      var objLines = wrapSide(obj.text);
      var OBJ_YS = { 1: [203], 2: [199, 210], 3: [197, 206, 215] };
      // school colours, and the outline makes it pop off the dark sidebar
      ctx.strokeStyle = '#1e7a3c';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.fillStyle = '#f7d84d';
      objLines.forEach(function (line, i) {
        var ly = OBJ_YS[objLines.length][i];
        ctx.strokeText(line, cx, ly);
        ctx.fillText(line, cx, ly);
      });
      ctx.lineWidth = 1;
    }

    // Eddie keeps watch at the bottom
    ctx.drawImage(eagleSprite, Math.round(cx - 8), SH - 16);
    ctx.textAlign = 'left';
  }

  function drawBanner() {
    if (!banner || banner.timer <= 0) return;
    ctx.font = font(8);
    var tw = ctx.measureText(banner.text).width;
    // extra-long names (team-taught rooms) drop a font size to stay on screen
    if (tw + 28 > SW) {
      ctx.font = font(7);
      tw = ctx.measureText(banner.text).width;
    }
    var w = tw + 28, h = 24;
    var x = (SW - w) / 2, y = 10;
    var alpha = Math.min(1, banner.timer / 0.4);
    ctx.globalAlpha = alpha;
    G.Dialogue.drawWindow(ctx, x, y, w, h);
    ctx.fillStyle = '#f4f4f4';
    ctx.textBaseline = 'top';
    ctx.fillText(banner.text, x + 14, y + 9);
    ctx.globalAlpha = 1;
  }

  // ---- title screen: the front of Ashland Elementary in 16-bit ------------
  var titleBg = null;

  function titleDither(x, px, py, w, h, color) {
    x.fillStyle = color;
    for (var yy = 0; yy < h; yy++) {
      for (var xx = (yy % 2); xx < w; xx += 2) x.fillRect(px + xx, py + yy, 1, 1);
    }
  }

  function buildTitleBg(noEddie, noLogo) {
    var c = document.createElement('canvas');
    c.width = SW; c.height = SH;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;

    // summer sky
    x.fillStyle = '#4a90d8'; x.fillRect(0, 0, SW, 40);
    x.fillStyle = '#5aa0e0'; x.fillRect(0, 40, SW, 30);
    titleDither(x, 0, 66, SW, 4, '#78b8ea');
    x.fillStyle = '#78b8ea'; x.fillRect(0, 70, SW, 20);
    titleDither(x, 0, 86, SW, 4, '#a0d0f0');
    x.fillStyle = '#a0d0f0'; x.fillRect(0, 90, SW, 22);

    // chunky SNES clouds
    [[26, 94, 40], [232, 96, 52], [130, 100, 30]].forEach(function (cl) {
      x.fillStyle = '#ffffff';
      x.fillRect(cl[0], cl[1], cl[2], 6);
      x.fillRect(cl[0] + 6, cl[1] - 4, cl[2] - 14, 4);
      x.fillStyle = '#d8e8f4';
      x.fillRect(cl[0] + 2, cl[1] + 4, cl[2] - 4, 2);
    });

    // ---- the school facade: white ribbed panels over a brick base ---------
    x.fillStyle = '#6a6a62'; x.fillRect(0, 110, SW, 2);            // roof line
    x.fillStyle = '#f4f4ee'; x.fillRect(0, 112, SW, 3);            // top trim
    x.fillStyle = '#e2e2d8'; x.fillRect(0, 115, SW, 33);           // panels
    x.fillStyle = '#b8b8aa'; x.fillRect(0, 115, SW, 2);            // trim shadow
    for (var rx = 3; rx < SW; rx += 6) {
      x.fillStyle = '#ccccbe'; x.fillRect(rx, 117, 1, 31);          // vertical ribs
    }
    for (var seam = 0; seam < SW; seam += 54) {
      x.fillStyle = '#a8a89a'; x.fillRect(seam, 115, 1, 33);        // panel seams
    }
    // ASHLAND SCHOOL lettering on the facade
    x.fillStyle = '#e8e8de'; x.fillRect(SW / 2 - 32, 121, 64, 11);
    G.Tiles.drawTinyText(x, 'ASHLAND SCHOOL', SW / 2 - 27, 124, '#3a4450', 1);

    // brick base with dark windows
    x.fillStyle = '#7a4234'; x.fillRect(0, 148, SW, 26);
    titleDither(x, 0, 148, SW, 26, '#8a5040');
    for (var bw = 8; bw < SW; bw += 44) {
      if (bw > SW / 2 - 44 && bw < SW / 2 + 28) continue;           // entrance gap
      x.fillStyle = '#16283e'; x.fillRect(bw, 152, 26, 18);          // window
      x.fillStyle = '#2a4a68'; x.fillRect(bw + 2, 152, 3, 18);       // reflections
      x.fillRect(bw + 9, 152, 2, 18);
      x.fillStyle = '#d8d8cc'; x.fillRect(bw - 1, 170, 28, 2);       // sill
    }
    // entrance: canopy + brick columns + dark glass double doors
    x.fillStyle = '#f4f4ee'; x.fillRect(SW / 2 - 40, 144, 66, 6);   // canopy
    x.fillStyle = '#9a9a8c'; x.fillRect(SW / 2 - 40, 150, 66, 2);
    x.fillStyle = '#5a3226'; x.fillRect(SW / 2 - 40, 152, 6, 22);
    x.fillRect(SW / 2 + 20, 152, 6, 22);
    x.fillStyle = '#101c2c'; x.fillRect(SW / 2 - 32, 152, 50, 22);  // glass
    x.fillStyle = '#2a3a4e';
    x.fillRect(SW / 2 - 8, 152, 2, 22);
    x.fillRect(SW / 2 - 30, 154, 2, 20);
    x.fillRect(SW / 2 + 12, 154, 2, 20);
    x.fillStyle = '#c9cfd5'; x.fillRect(SW / 2 - 14, 162, 2, 5);    // handles
    x.fillRect(SW / 2 + 4, 162, 2, 5);

    // sidewalk + lawn
    x.fillStyle = '#b4b4aa'; x.fillRect(0, 174, SW, 12);
    x.fillStyle = '#9a9a90';
    for (var sw2 = 0; sw2 < SW; sw2 += 24) x.fillRect(sw2, 174, 1, 12);
    x.fillRect(0, 174, SW, 1);
    x.fillStyle = '#4a8a3e'; x.fillRect(0, 186, SW, SH - 186);
    titleDither(x, 0, 186, SW, SH - 186, '#3a7032');
    x.fillStyle = '#5aa04c';
    for (var g = 0; g < 40; g++) x.fillRect((g * 41) % SW, 190 + (g * 13) % (SH - 196), 2, 1);

    // the brick marquee sign out front (right of the building), Eddie on top
    x.fillStyle = '#5a3226'; x.fillRect(226, 196, 60, 26);          // brick base
    titleDither(x, 226, 196, 60, 26, '#7a4234');
    x.fillStyle = '#8a4a3a'; x.fillRect(222, 192, 68, 6);           // cap
    x.fillStyle = '#ece8dc'; x.fillRect(230, 168, 52, 24);          // sign board
    x.fillStyle = '#8a4a3a'; x.fillRect(230, 168, 52, 2);
    x.fillRect(230, 190, 52, 2);
    G.Tiles.drawTinyText(x, 'ASHLAND', 242, 172, '#2e5a8a', 1);
    x.fillStyle = '#b8b4a4';                                        // changeable letters
    x.fillRect(234, 180, 44, 2); x.fillRect(234, 184, 32, 2);
    if (!noEddie) x.drawImage(eagleSprite, 248, 148);               // Eddie on the sign

    if (!noLogo) drawTitleLogoInto(x);
    return c;
  }

  // the FF3-style metallic logo + subtitle (its own layer so the flight
  // cutscene can fade it out before Eddie takes off)
  function drawTitleLogoInto(x) {
    x.textAlign = 'center';
    x.textBaseline = 'top';
    function metalWord(word, size, y) {
      x.font = size + 'px "Press Start 2P", monospace';
      x.fillStyle = '#1a1006';
      x.fillText(word, SW / 2 + 2, y + 3);                          // drop shadow
      var mg = x.createLinearGradient(0, y, 0, y + size);
      mg.addColorStop(0, '#fff8d8');
      mg.addColorStop(0.35, '#f7d84d');
      mg.addColorStop(0.7, '#c87820');
      mg.addColorStop(1, '#7a4210');
      x.fillStyle = mg;
      x.fillText(word, SW / 2, y);
      x.strokeStyle = '#3a1c08';
      x.lineWidth = 1;
      x.strokeText(word, SW / 2, y);
    }
    metalWord('ASHLAND', 24, 14);
    metalWord('ELEMENTARY', 17, 44);
    // subtitle banner
    x.fillStyle = 'rgba(10,16,40,0.8)';
    x.fillRect(0, 68, SW, 16);
    x.fillStyle = '#f7d84d';
    x.font = font(8);
    x.fillText('THE MISSING LETTERS ADVENTURE', SW / 2, 72);
    x.textAlign = 'left';
  }

  function buildTitleLogo() {
    var c = document.createElement('canvas');
    c.width = SW; c.height = SH;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    drawTitleLogoInto(x);
    return c;
  }

  // ---- character select: who is exploring Ashland today? ------------------
  // ten students -- a mix of names, hair, skin tones and outfits so every
  // kid can find someone who feels like them
  var CHARACTERS = [
    { name: 'HANK',   ov: { style: 0, skin: 1, hairColor: 4, outfit: 0 } },
    { name: 'MAYA',   ov: { style: 1, skin: 5, hairColor: 0, outfit: 3 } },
    { name: 'MARCUS', ov: { style: 8, skin: 8, hairColor: 0, outfit: 9 } },
    { name: 'SOFIA',  ov: { style: 6, skin: 4, hairColor: 1, outfit: 10, shirtColor: 6 } },
    { name: 'LILY',   ov: { style: 7, skin: 0, hairColor: 6, outfit: 2 } },
    { name: 'DIEGO',  ov: { style: 3, skin: 3, hairColor: 1, outfit: 4 } },
    { name: 'AMARA',  ov: { style: 5, skin: 9, hairColor: 0, outfit: 7 } },
    { name: 'KAI',    ov: { style: 2, skin: 2, hairColor: 0, outfit: 5 } },
    { name: 'JADEN',  ov: { style: 4, skin: 7, hairColor: 1, outfit: 8 } },
    { name: 'ZOE',    ov: { style: 1, skin: 6, hairColor: 3, outfit: 6 } }
  ];
  var charSel = null;

  function startCharSelect() {
    charSel = {
      i: 0,
      frames: CHARACTERS.map(function (c) {
        return G.Sprites.make(G.Sprites.cfgFrom(c.ov));
      })
    };
    G.Input.clearEdges();
    state = 'charselect';
  }

  // where each student's card sits -- shared by the drawing and the
  // finger hit-test so the two can never drift apart
  var CHAR_BOX = { w: 52, h: 76, gap: 8 };
  function charBox(i) {
    var left = (SW - (5 * CHAR_BOX.w + 4 * CHAR_BOX.gap)) / 2;
    return {
      x: left + (i % 5) * (CHAR_BOX.w + CHAR_BOX.gap),
      y: 44 + Math.floor(i / 5) * (CHAR_BOX.h + 10),
      w: CHAR_BOX.w, h: CHAR_BOX.h
    };
  }
  // a tap picks that student; tapping the one already picked starts the game
  function charSelectTap(gx, gy) {
    if (!charSel) return false;
    for (var i = 0; i < CHARACTERS.length; i++) {
      var b = charBox(i);
      // a generous target: fingers are bigger than 52px boxes
      if (gx >= b.x - 4 && gx <= b.x + b.w + 4 && gy >= b.y - 4 && gy <= b.y + b.h + 6) {
        if (charSel.i === i) {
          playerFrames = charSel.frames[i];
          G.playerName = CHARACTERS[i].name;
          G.Audio.sfx('fanfare');
          startIntro();
        } else {
          charSel.i = i;
          G.Audio.sfx('blip');
        }
        return true;
      }
    }
    return false;
  }

  function updateCharSelect() {
    var c = charSel;
    if (G.Input.consumeDir('left')) { c.i = (c.i + CHARACTERS.length - 1) % CHARACTERS.length; G.Audio.sfx('blip'); }
    if (G.Input.consumeDir('right')) { c.i = (c.i + 1) % CHARACTERS.length; G.Audio.sfx('blip'); }
    if (G.Input.consumeDir('up') || G.Input.consumeDir('down')) {
      c.i = (c.i + 5) % CHARACTERS.length;
      G.Audio.sfx('blip');
    }
    if (G.Input.consumeAction()) {
      playerFrames = c.frames[c.i];   // this is who walks the halls
      G.playerName = CHARACTERS[c.i].name;
      G.Audio.sfx('fanfare');
      startIntro();
    }
  }

  function drawCharSelect() {
    var c = charSel;
    ctx.fillStyle = '#0a1430';
    ctx.fillRect(0, 0, SW, SH);
    // a few twinkly stars so the screen isn't flat black
    ctx.fillStyle = '#22355e';
    for (var st = 0; st < 28; st++) {
      ctx.fillRect((st * 53) % SW, (st * 37) % 44, 1, 1);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = font(10);
    ctx.fillStyle = '#f7d84d';
    ctx.fillText('CHOOSE YOUR STUDENT', SW / 2, 10);
    ctx.font = font(7);
    ctx.fillStyle = '#9fd4e8';
    ctx.fillText('WHO IS EXPLORING ASHLAND TODAY?', SW / 2, 28);

    var BOX_W = CHAR_BOX.w, BOX_H = CHAR_BOX.h;
    ctx.imageSmoothingEnabled = false;
    CHARACTERS.forEach(function (ch, i) {
      var box = charBox(i);
      var x = box.x, y = box.y;
      var sel = i === c.i;
      G.Dialogue.drawWindow(ctx, x, y, BOX_W, BOX_H);
      // a brighter panel behind each student so they pop off the dark screen
      ctx.fillStyle = sel ? 'rgba(247,216,77,0.22)' : 'rgba(120,170,230,0.20)';
      ctx.fillRect(x + 3, y + 3, BOX_W - 6, BOX_H - 6);
      var bob = sel ? Math.sin(Date.now() / 200) * 1.5 : 0;
      ctx.drawImage(c.frames[i].down[0], 0, 0, G.Sprites.W, G.Sprites.H,
        x + (BOX_W - 32) / 2, Math.round(y + 7 + bob), 32, 48);
      // a bright frame around every box, gold and thicker on the selected one
      ctx.strokeStyle = sel ? '#ffe66a' : '#9fd4e8';
      ctx.lineWidth = sel ? 3 : 2;
      ctx.strokeRect(x + 1.5, y + 1.5, BOX_W - 3, BOX_H - 3);
    });
    ctx.lineWidth = 1;

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = font(7);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(document.body.classList.contains('touch')
        ? 'TAP A STUDENT  -  TAP AGAIN TO START'
        : 'ARROWS TO PICK  -  ENTER TO START', SW / 2, 226);
    }
    ctx.textAlign = 'left';
  }

  // ---- title flight: Eddie takes off from the sign and drops S-O-A-R ------
  // into the school (they vanish through the roof -- that's how the letters
  // ended up scattered inside for the quest). The logo fades out FIRST so
  // the whole show happens in a clear sky.
  var titleBgFly = null;   // the facade with no Eddie and no logo
  var titleLogoLayer = null;
  var titleFly = null;     // {t, letters, sparkles}
  var FLY_FADE = 1.5;      // seconds of logo fade before takeoff
  var FLY_RISE = 1.2;      // seconds of climb off the sign
  var FLY_SPEED = 52;      // cruise, px/s (a lazy, watchable glide)

  // one big golden SOAR tile, drawn crisply at whatever size is asked (the
  // 16px letter icons look rough scaled up, so the drop draws its own)
  function drawDropLetter(letter, cx, cy, S) {
    var x = Math.round(cx - S / 2), y = Math.round(cy - S / 2);
    var b = Math.max(2, Math.round(S / 12));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#5a3f0d'; ctx.fillRect(x - 1, y - 1, S + 2, S + 2);   // dark keyline
    ctx.fillStyle = '#8a6d1a'; ctx.fillRect(x, y, S, S);                    // deep gold rim
    ctx.fillStyle = '#f7d84d'; ctx.fillRect(x + b, y + b, S - 2 * b, S - 2 * b); // gold face
    ctx.fillStyle = '#fdf0a8'; ctx.fillRect(x + b, y + b, S - 2 * b, Math.round(S * 0.2)); // top shine
    ctx.fillStyle = '#c9992a'; ctx.fillRect(x + b, y + S - b - Math.round(S * 0.15), S - 2 * b, Math.round(S * 0.15)); // base shade
    ctx.fillStyle = '#5a3f0d';
    ctx.font = Math.round(S * 0.6) + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, x + S / 2, y + S / 2 + Math.round(S * 0.06));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // the show is over: fade to black, then fade into character select
  function endTitleFly() {
    if (!titleFly || titleFly.ending) return;
    titleFly.ending = true;
    transition = {
      phase: 'out', t: 0,
      onMid: function () {
        titleFly = null;
        startCharSelect();
      }
    };
  }

  function startTitleFly() {
    G.Input.clearEdges(); // the Enter that started us shouldn't also skip us
    titleFly = {
      t: 0,
      sparkles: [],
      // S lands leftmost so any freeze-frame still reads S-O-A-R
      letters: G.Quest.LETTERS.map(function (l, i) {
        return { l: l, delay: 0.32 * (i + 1), dropX: 92 + i * 38, mode: 'trail', x: 248, y: 148, vy: 0 };
      })
    };
    state = 'titlefly';
  }

  // where Eddie is `ft` seconds into the FLIGHT (after the logo fade):
  // rise off the sign, then cruise right-to-left through the middle of
  // the open sky, well above the roof
  function eagleFlyPos(ft) {
    if (ft <= 0) return { x: 248, y: 148 };
    if (ft < FLY_RISE) {
      var p = ft / FLY_RISE;
      var e = 1 - (1 - p) * (1 - p); // ease out
      return { x: 248 - 14 * e, y: 148 - 100 * e };
    }
    var ct = ft - FLY_RISE;
    return { x: 234 - ct * FLY_SPEED, y: 48 + Math.sin(ct * 4) * 2.5 };
  }

  function updateTitleFly(dt) {
    var f = titleFly;
    f.t += dt;
    if (f.t > 0.5 && G.Input.consumeAction()) { // mashing Enter skips the show
      endTitleFly();
      return;
    }
    var ft = f.t - FLY_FADE; // the flight clock starts after the fade
    f.letters.forEach(function (L) {
      if (L.mode === 'trail') {
        var p = eagleFlyPos(ft - L.delay);
        L.x = p.x + 6; L.y = p.y + 8;
        if (ft - L.delay > FLY_RISE && L.x <= L.dropX) { L.mode = 'fall'; L.vy = -10; }
      } else if (L.mode === 'fall') {
        L.vy += 300 * dt;
        L.y += L.vy * dt;
        if (L.y >= 100) { // the letter sinks through the roof (line at 110)
          L.mode = 'gone';
          for (var i = 0; i < 10; i++) {
            var a = (i / 10) * Math.PI * 2;
            f.sparkles.push({
              x: L.x + 6, y: 106,
              vx: Math.cos(a) * 26, vy: Math.sin(a) * 18 - 10,
              life: 0.4 + (i % 3) * 0.12,
              c: i % 3 === 0 ? '#ffffff' : '#f7d84d'
            });
          }
          G.Audio.sfx('blip');
        }
      }
    });
    f.sparkles = f.sparkles.filter(function (s) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 50 * dt;
      return s.life > 0;
    });
    var ep = eagleFlyPos(ft);
    var allGone = f.letters.every(function (L) { return L.mode === 'gone'; });
    if ((ep.x < -40 && allGone) || f.t > 12) {
      endTitleFly();
    }
  }

  function drawTitleFly() {
    if (!titleBgFly) titleBgFly = buildTitleBg(true, true);
    if (!titleLogoLayer) titleLogoLayer = buildTitleLogo();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(titleBgFly, 0, 0);
    var f = titleFly;
    var ft = f.t - FLY_FADE;

    // the title fades away so all eyes are on Eddie
    if (f.t < FLY_FADE) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / (FLY_FADE - 0.2));
      ctx.drawImage(titleLogoLayer, 0, 0);
      ctx.globalAlpha = 1;
    }

    // the golden letters, trailing then tumbling
    f.letters.forEach(function (L) {
      if (L.mode === 'gone') return;
      if (L.mode === 'trail' && ft - L.delay <= 0.05) return; // still with Eddie
      // big, crisp golden tiles (drawn at size, so no upscaling blur)
      drawDropLetter(L.l, Math.round(L.x + 6), Math.round(L.y + 6), 24);
    });
    f.sparkles.forEach(function (s) {
      ctx.globalAlpha = Math.min(1, s.life * 2.5);
      ctx.fillStyle = s.c;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
    });
    ctx.globalAlpha = 1;

    // Eddie: perched until the title is gone, then wings across the sky
    if (ft <= 0) {
      ctx.drawImage(eagleSprite, 248, 148);
    } else {
      var ep = eagleFlyPos(ft);
      var frame = eagleFlyFrames[Math.floor(ft * 5) % 2];
      ctx.drawImage(frame, Math.round(ep.x) - 8, Math.round(ep.y) - 2);
    }
  }

  function drawTitle() {
    if (!titleBg) titleBg = buildTitleBg();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(titleBg, 0, 0);

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = font(8);
      var start = document.body.classList.contains('touch') ? 'TAP THE RED BUTTON TO START' : 'PRESS ENTER';
      ctx.fillStyle = '#0a1430';
      ctx.fillText(start, SW / 2 + 1, 213);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(start, SW / 2, 212);
      ctx.textAlign = 'left';
    }
  }

  function drawEnding() {
    ctx.fillStyle = '#0a1440';
    ctx.fillRect(0, 0, SW, SH);
    confetti.forEach(function (p) {
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    });

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(eagleSprite, 0, 0, 16, 20, SW / 2 - 20, 26, 40, 50);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = font(14);
    ctx.fillStyle = '#f7d84d';
    ctx.fillText('CONGRATULATIONS!', SW / 2, 88);

    ctx.font = font(10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('YOU FOUND  S - O - A - R', SW / 2, 116);

    ctx.font = font(8);
    ctx.fillStyle = '#9fd4e8';
    ctx.fillText('YOU ARE READY TO SOAR', SW / 2, 140);
    ctx.fillText('INTO THE 26/27 SCHOOL YEAR!', SW / 2, 154);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SEE YOU ON THE FIRST DAY!', SW / 2, 176);

    if (endingTimer > 3 && Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#f7d84d';
      ctx.fillText('PRESS ENTER TO PLAY AGAIN', SW / 2, 210);
    }
    ctx.textAlign = 'left';
  }

  function draw() {
    // upright: clear the whole tall canvas, then slide the 320x240 world
    // down under the top bar. Everything else draws exactly as it always has.
    if (portrait) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SW, SH + TOP_H + BOT_H);
    }
    ctx.save();
    if (portrait) {
      ctx.translate(0, TOP_H);
      // Fence the world into its 320x240 window. The tile loop deliberately
      // draws a row past each edge so scrolling has no seam; in landscape the
      // canvas ends exactly there and clips it, but this taller canvas would
      // let that spare row bleed over the HUD -- and repaint it every time
      // the camera stepped, which reads as the screen loading a line at a time.
      ctx.beginPath();
      ctx.rect(0, 0, SW, SH);
      ctx.clip();
    }

    if (state === 'title') {
      drawTitle();
    } else if (state === 'charselect') {
      drawCharSelect();
    } else if (state === 'titlefly') {
      drawTitleFly();
    } else if (state === 'partyfly') {
      drawPartyFly();
    } else if (state === 'ending') {
      drawEnding();
    } else if (state === 'battle') {
      drawBattle();
    } else if (state === 'dunk') {
      drawDunk();
    } else {
      drawWorld();
      drawBanner();
      G.Dialogue.draw(ctx);
      if (staffRosterOpen) drawStaffRoster();
    }
    if (!portrait) drawSidebar();

    if (transition) {
      var a = transition.phase === 'out' ? transition.t : 1 - transition.t;
      ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, Math.max(0, a)) + ')';
      ctx.fillRect(0, 0, SW, SH);
    }
    ctx.restore();

    if (portrait) drawStackedHud();
  }

  G.Game = {
    startEnding: startEnding,
    startParty: startParty,
    startDollyParty: startDollyParty,
    finishParty: finishParty,
    allStaffMet: allStaffMet,
    countMet: countMet,
    staffTotal: staffTotal,
    partyTier: function () { return party ? party.tier : partyTier(); },
    metStaff: function () { return met; },
    hasSeenFloor: function (f) { return !!floorsSeen[f]; },
    debugMeetAll: debugMeetAll,
    battleVictory: battleVictory,
    deliverLetters: deliverLetters,
    // debug helpers (used for testing; harmless to leave in)
    debug: function () {
      return { state: state, map: currentMapId, tx: Math.floor((player.x + 8) / TS), ty: Math.floor((player.y + 11) / TS) };
    },
    teleport: function (mapId, tx, ty) {
      currentMapId = mapId;
      player.x = tx * TS;
      player.y = ty * TS;
      state = 'play';
    },
    step: function (dt) { update(dt || 0.016); draw(); },
    // used by signeditor.html
    signLayoutFor: function (mapId) {
      var m = G.Maps.all[mapId];
      delete m._signLayout;
      return signLayout(m);
    },
    getSign: function (roomId, orient) { return getSign(roomId, orient); }
  };

  // wait for the pixel font, but don't block forever
  function ready() {
    boot();
  }
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('8px "Press Start 2P"'),
      new Promise(function (res) { setTimeout(res, 1500); })
    ]).then(ready);
  } else {
    ready();
  }
})();
