/* Ashland Elementary 26/27 - the S.O.A.R. letter quest */
var G = window.G = window.G || {};

(function () {
  var LETTERS = ['S', 'O', 'A', 'R'];
  var holders = {};   // letter -> roomId
  var found = { S: false, O: false, A: false, R: false };     // caught: trails behind the player
  var delivered = { S: false, O: false, A: false, R: false }; // handed to Mrs. Walker: on the wall
  var icons = {};

  var FLOOR_NAMES = { middle: 'the ground floor', top: 'the top floor', basement: 'the lower floor' };

  // the Ashland S.O.A.R. motto - teachers quiz students on these before
  // handing a letter over
  var MEANINGS = {
    S: 'SAFETY AT WORK AND PLAY',
    O: 'ON TASK EVERY DAY',
    A: 'ACCOUNTABLE FOR ALL WE DO',
    R: 'RESPECT FOR ME AND YOU'
  };

  // convincing wrong answers for each letter's quiz (all start with the
  // same letter, so students have to really know the motto)
  var DISTRACTORS = {
    S: ['SIT STILL IN CLASS', 'SUPER SPELLING SKILLS', 'STAY IN A STRAIGHT LINE', 'SMILE AT EVERYONE', 'SHARE YOUR SNACKS'],
    O: ['OBEY ALL THE RULES', 'ONE VOICE AT A TIME', 'OPEN YOUR BOOKS OFTEN', 'ORGANIZE YOUR DESK', 'ONLY WALK IN THE HALLS'],
    A: ['ALWAYS DO YOUR HOMEWORK', 'ACT KINDLY EVERY DAY', 'AIM FOR PERFECT GRADES', 'ARRIVE ON TIME', 'ASK GOOD QUESTIONS'],
    R: ['READ EVERY SINGLE DAY', 'RAISE YOUR HAND TO TALK', 'RUN FAST IN GYM CLASS', 'REMEMBER YOUR BACKPACK', 'RECYCLE EVERY DAY']
  };

  // non-holder teachers who volunteer a hint: with the 4 holders, about 1 in 4
  // teachers overall brings up the missing letters on their own
  var hinters = {};

  // the most recent hint the player has heard: {letter, roomId}. The sidebar
  // objective points at it until that letter is found.
  var pendingHint = null;

  function roomNum(roomId) {
    var r = G.ROOMS[roomId];
    var m = r && /^ROOM (\d+)/.exec(r.name);
    return m ? m[1] : null;
  }

  // short "go here" phrasing for the sidebar objective
  var SHORT_PLACE = {
    'b-gym': 'THE GYM',
    'b-music': 'THE MUSIC ROOM',
    'b-dance': 'THE DANCE ROOM',
    't-lib': 'THE LIBRARY',
    'm-caf': 'THE CAFETERIA'
  };
  function shortPlace(roomId) {
    var num = roomNum(roomId);
    if (num) return 'ROOM ' + num;
    return SHORT_PLACE[roomId] || G.ROOMS[roomId].name;
  }

  function spotPrompt(label) {
    return label
      .replace(/^one of /, 'the ')
      .replace(/^my /, "the teacher's ")
      .toUpperCase();
  }

  // what the blinking sidebar prompt should say right now.
  // focusRoomId is the room the player is standing in (null in a hallway).
  function objective(focusRoomId) {
    // (only the win state gets an exclamation point -- the rest stay calm)
    if (allDelivered()) return { text: 'READY TO SOAR!', color: '#f7d84d' };
    if (allFound()) return { text: 'SEE MRS. WALKER', color: '#ff5a4a' };
    if (hunt) {
      if (focusRoomId === hunt.roomId) {
        return {
          text: hunt.spot ? 'CHECK ' + spotPrompt(hunt.spot.label) : 'SEARCH THIS ROOM',
          color: '#f7d84d'
        };
      }
      return { text: 'GO TO ' + shortPlace(hunt.roomId), color: '#f7d84d' };
    }
    if (pendingHint && !found[pendingHint.letter]) {
      var who = G.TEACHERS[pendingHint.roomId].name.toUpperCase();
      var num = roomNum(pendingHint.roomId);
      // classrooms need the number: there are two Mrs. Smiths!
      return { text: 'GO FIND ' + who + (num ? ' (ROOM ' + num + ')' : ''), color: '#9fd4e8' };
    }
    // quest on-ramp: Eddie's story, then Mrs. Walker -- but if the player
    // dives straight into chatting with the staff, that step is skipped
    if (!metEddie) return { text: 'TALK TO EDDIE THE EAGLE', color: '#9fd4e8' };
    if (!metWalker && !chattedWithStaff()) return { text: 'TALK TO MRS. WALKER', color: '#9fd4e8' };
    // exploring: one steady nudge, in Eddie-green so it reads as a tip
    return { text: 'GO TALK TO SOME OF YOUR TEACHERS', color: '#5fbd87' };
  }

  function chattedWithStaff() {
    return Object.keys(talkCount).length > 0 || countFound() > 0;
  }

  // what the GTA-style guide arrow should point at right now (semantic
  // target -- main.js resolves it to pixels on the current map)
  function guide() {
    if (allDelivered()) return null;
    if (hunt) return { kind: 'hunt', roomId: hunt.roomId, spot: hunt.spot };
    if (allFound()) return { kind: 'walker' };
    if (pendingHint && !found[pendingHint.letter]) return { kind: 'room', roomId: pendingHint.roomId };
    if (!metEddie) return { kind: 'eddie' };
    if (!metWalker && !chattedWithStaff()) return { kind: 'walker' };
    return null;
  }

  function init() {
    // every room with a teacher except the principal can hold a letter
    // (co-teachers like Mrs. Songstad defer to their room's main teacher)
    var eligible = Object.keys(G.TEACHERS).filter(function (id) {
      return id !== 'm-walker' && !G.TEACHERS[id].noLetter && G.ROOMS[id];
    });
    // shuffle
    for (var i = eligible.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = eligible[i]; eligible[i] = eligible[j]; eligible[j] = tmp;
    }
    LETTERS.forEach(function (letter, idx) {
      holders[letter] = eligible[idx];
      icons[letter] = G.Sprites.letterIcon(letter);
    });
    hinters = {};
    // 1 in 3 people know where a letter is: the 4 holders plus enough hinters
    var wanted = Math.max(0, Math.round(eligible.length / 3) - LETTERS.length);
    eligible.slice(LETTERS.length, LETTERS.length + wanted).forEach(function (id) {
      hinters[id] = true;
    });
  }

  function countFound() {
    return LETTERS.filter(function (l) { return found[l]; }).length;
  }
  function allFound() { return countFound() === 4; }

  function countDelivered() {
    return LETTERS.filter(function (l) { return delivered[l]; }).length;
  }
  function allDelivered() { return countDelivered() === 4; }

  // letters caught but not yet handed to Mrs. Walker (in SOAR order)
  function carriedLetters() {
    return LETTERS.filter(function (l) { return found[l] && !delivered[l]; });
  }

  function letterList(arr) {
    return arr.length === 1 ? arr[0]
      : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }

  function letterHeldBy(roomId) {
    for (var i = 0; i < LETTERS.length; i++) {
      if (holders[LETTERS[i]] === roomId && !found[LETTERS[i]]) return LETTERS[i];
    }
    return null;
  }

  function hintPage(hinterRoomId) {
    var missing = LETTERS.filter(function (l) { return !found[l]; });
    if (!missing.length) return null;
    // each hinter always points at the SAME letter (until it is found), so
    // repeat chats never contradict themselves
    var letter = hinterRoomId
      ? missing[chash(hinterRoomId + 'pick') % missing.length]
      : missing[Math.floor(Math.random() * missing.length)];
    var roomId = holders[letter];
    var room = G.ROOMS[roomId];
    var who = G.TEACHERS[roomId].name;
    var where = { middle: 'on the ground floor', top: 'up on the top floor', basement: 'down on the lower floor' }[room.floor];
    // name the room number too: "Mrs. Smith's room" alone is ambiguous
    // (rooms 213 AND 235!) -- and rooms with real names (The Office, the
    // Cafeteria...) go by their name, not "so-and-so's room"
    var num = roomNum(roomId);
    var title = room.name.toLowerCase().replace(/(^|[\s/])\w/g, function (c) { return c.toUpperCase(); });
    var place = num
      ? who + "'s room (Room " + num + ')'
      : (/^the\b/i.test(room.name) ? title : 'the ' + title);
    var hints = [
      'I heard ' + who + ' found something shiny while setting up! Check ' + place + ', ' + where + '.',
      'Psst... someone spotted a golden letter in ' + place + ', ' + where + '!',
      'Try ' + place + ', ' + where + ' -- Eddie was flying around in there all summer!'
    ];
    pendingHint = { letter: letter, roomId: roomId };
    return { text: hints[Math.floor(Math.random() * hints.length)] };
  }

  function teacherDialogue(roomId, onClose) {
    var t = G.TEACHERS[roomId];
    // co-teachers (t-233b) borrow their shared room's info
    var room = G.ROOMS[roomId] || G.ROOMS[t.roomOf];
    var name = t.name.toUpperCase();
    var pages = [];

    if (roomId === 'm-walker') {
      walkerDialogue(onClose);
      return;
    }

    var n = talkCount[roomId] || 0;
    talkCount[roomId] = n + 1;
    var num = room ? roomNum(room.id) : null;
    var roomLabel = room ? room.name.toLowerCase().replace(/(^|[\s/])\w/g, function (c) { return c.toUpperCase(); }) : '';
    // "the Cafeteria", but never "the Mrs. Todd's Office"
    var placeName = num || !room ? null
      : /^(mrs|mr|ms|dr|the)\b/i.test(room.name) ? roomLabel : 'the ' + roomLabel;
    var introFirst = {
      name: name,
      text: t.intro ||
        ("Hi there! I'm " + t.name + ', and this is ' +
          (num ? 'my room -- Room ' + num : placeName) +
          '. Welcome to Ashland!')
    };

    var letter = letterHeldBy(roomId);
    if (letter) {
      dryStreak = 0; // this teacher has real letter news
      // a polite hello first (on the first visit), THEN the letter news
      if (n === 0) pages.push(introFirst);
      if (hunt && hunt.roomId === roomId) {
        // already hunting in here? repeat where it is
        pages.push({
          name: name,
          text: hunt.spot
            ? "Keep looking! I'm SURE I saw it land right by " + hunt.spot.label + '!'
            : 'Keep looking! The letter ' + hunt.letter + ' is somewhere in this room!'
        });
      } else {
        // the teacher SAW where Eddie dropped it
        startHunt(roomId);
        var spotText = hunt && hunt.spot
          ? 'Yes! I saw Eddie drop it -- it landed right by ' + hunt.spot.label + '! Go take a look... but be ready!'
          : 'It is somewhere in this room... go look around, and be ready!';
        pages.push({
          name: name,
          text: 'Oh! Eddie the Eagle dropped the golden letter ' + letter + ' in here while he was helping me set up!'
        });
        pages.push({ name: name, text: spotText });
      }
      G.Dialogue.start(pages, { onDone: onClose });
      return;
    }

    if (allFound()) {
      if (n === 0) pages.push(introFirst);
      pages.push({ name: name, text: 'You found all four letters?! Amazing! Mrs. Walker is waiting for you in her office!' });
      G.Dialogue.start(pages, { onDone: onClose });
      return;
    }

    // pity timer: never let a kid hit three clueless teachers in a row.
    // After two info-less NEW teachers, the next new teacher a student
    // meets is quietly promoted to hinter (staff never get promoted).
    if (!t.noLetter && !hinters[roomId] && n === 0 && dryStreak >= 2) {
      hinters[roomId] = true;
    }

    // hinter teachers share their letter tip EVERY chat until that letter
    // is found -- introduction first, then the clue
    if (hinters[roomId]) {
      var hp = hintPage(roomId);
      if (hp) {
        dryStreak = 0;
        pages = n === 0
          ? [introFirst, { name: name, text: hp.text }]
          : [{ name: name, text: hp.text }];
        G.Dialogue.start(pages, { onDone: onClose });
        return;
      }
    }

    // no menus: everyone else just chats, saying something new each visit
    if (!t.noLetter && n === 0) dryStreak++;
    var lines = personalLines(roomId, t);
    var line = lines[n % lines.length];
    if (n === 0) {
      pages = [introFirst, { name: name, text: line }];
    } else {
      pages = [{ name: name, text: line }];   // no re-introductions
    }
    // ...and admit they haven't seen the letters, pointing the kid onward
    pages.push({ name: name, text: SHRUGS[chash(roomId + 'shrug') % SHRUGS.length] });
    G.Dialogue.start(pages, { onDone: onClose });
  }

  // what a teacher with no letter news says to keep the quest moving
  var SHRUGS = [
    "Hmmm... I haven't seen any of those golden SOAR letters in here. Maybe another teacher has -- go ask around!",
    'No golden letters in MY room, sorry! Try asking another teacher -- somebody must have spotted one.',
    "I haven't spotted a single SOAR letter... but keep asking teachers! One of them is bound to know something."
  ];
  var dryStreak = 0;    // new teachers met since the last real clue

  var talkCount = {};   // roomId -> how many chats so far
  var metEddie = false;  // has the player heard Eddie's story yet?
  var metWalker = false; // has the player met Mrs. Walker yet?

  function chash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  // teachers WITHOUT a real welcome letter never invent facts or claim years
  // of teaching -- they only look forward to the new school year
  var FORWARD = [
    'I cannot WAIT for the first day of school!',
    'This year is going to be one to remember. I can feel it!',
    'We have so many fun things planned for this year!',
    'I am SO excited to meet all my new students!',
    'The first week of school is my favorite week of the whole year!',
    'Big things are coming this year. BIG things!',
    'Every new school year feels like a brand new adventure!',
    'New year, new friends, new things to learn. I love it!'
  ];

  // specials teachers describe (generically) what their class does
  var SPECIALS_LINES = {
    'b-gym': [
      'In PE we warm up, play games, and get MOVING!',
      'We play basketball, run relay races, and learn to be good sports!',
      'My number one gym rule: try your best and cheer for your team!',
      'The big red curtain means the gym is our stage too!'
    ],
    'b-music': [
      'In music class we sing, clap rhythms, and play instruments!',
      'Music is for EVERYONE -- every voice belongs in this room!',
      'Wait until you hear our first concert of the year!',
      'We learn songs, beats, and maybe even a little dancing!'
    ],
    'b-dance': [
      'I teach Dance AND Drama -- jazz hands, everyone!',
      'In our class we move, act, and put on little shows!',
      'Our stage is right upstairs in the gym!',
      'Warm-ups, stretches, and BIG dramatic feelings. That is drama class!'
    ],
    't-221': [
      "I'm the ART teacher! We get to use paint, clay, and glitter this year!",
      'In art class we draw, paint, and create something new every week!',
      'Every artist starts somewhere -- this room is where YOU start!',
      'Messy hands mean a masterpiece is happening!'
    ],
    't-lib': [
      'Welcome to the library -- home of Media Arts!',
      'We read amazing books and learn to find GREAT information!',
      'In media arts we get creative with stories and technology!',
      'There is a perfect book in here for every single reader!'
    ]
  };

  function personalLines(roomId, t) {
    var hiLines = [
      'I LOVE meeting new students before the year starts!',
      'Welcome to Ashland -- this year is going to be great!',
      'Hey there, future Eagle! Ready to SOAR this year?',
      'Thanks for stopping by my room!'
    ];
    var lines = [hiLines[chash(roomId + 'hi') % hiLines.length]];
    if (t.intro) lines = []; // roaming staff already greet with their own intro
    var real = (G.TEACHER_LINES || {})[roomId];
    if (real && real.length) {
      // this teacher's ACTUAL facts from their welcome letter
      return lines.concat(real);
    }
    var specials = SPECIALS_LINES[t.roomOf || roomId];
    if (specials) return lines.concat(specials);
    // everyone else: pure excitement for the year ahead (4 distinct picks,
    // stride 3 is coprime with the pool size so no repeats)
    var off = chash(roomId + 'fw') % FORWARD.length;
    for (var i = 0; i < 4; i++) lines.push(FORWARD[(off + i * 3) % FORWARD.length]);
    return lines;
  }

  // ---- letter hunts: the letter hides at a real object in the room --------
  // the teacher tells you WHERE Eddie dropped it; press enter on the right
  // object and the letter pops out (the encounter)
  var SPOT_LABELS = {
    deskS: 'one of the student desks',
    deskTL: 'my desk', deskTR: 'my desk', deskTLV: 'my desk', deskTRV: 'my desk',
    shelf: 'the bookshelf', shelfLow: 'the low bookshelf',
    plant: 'the plant', plant2: 'the tall plant',
    counter: 'the counter',
    easel: 'one of the easels',
    fishtank: 'the fish tank',
    table: 'one of the tables', gtable: 'one of the green tables',
    kidney: 'the rainbow table', kidneyL: 'the rainbow table', kidneyM: 'the rainbow table', kidneyR: 'the rainbow table',
    kidneyLV: 'the rainbow table', kidneyMV: 'the rainbow table', kidneyRV: 'the rainbow table',
    cubbies: 'the cubbies', cubbiesBlue: 'the blue cubbies', cubbiesTall: 'the tall cubbies',
    cabinet: 'the big blue cabinet',
    beanbag: 'a beanbag',
    couchL: 'the couch', couchR: 'the couch', couchLV: 'the couch', couchRV: 'the couch',
    pianoL: 'the piano', pianoR: 'the piano', pianoLV: 'the piano', pianoRV: 'the piano',
    drum: 'the drums', musicstand: 'a music stand',
    tent: 'the reading tent', toybin: 'the toy bin',
    computer: 'the computer', rocker: 'the rocking chair', bigchair: 'my big chair',
    globe: 'the globe', sink: 'the sink', lamp: 'the lamp', stool: 'a stool',
    tvcart: 'the smart board', smarttv: 'the smart TV',
    trophycase: 'the trophy case', lockers: 'the lockers',
    whiteboard: 'the whiteboard', chalkboard: 'the chalkboard',
    hoop: 'one of the basketball hoops', stage: 'the stage', curtain: 'the stage curtain'
  };

  var hunt = null;

  function pickSpot(roomId) {
    var isGym = roomId === 'b-gym';
    var m = G.Maps.all[isGym ? 'basement' : roomId];
    if (!m) return null;
    var cands = [];
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        if (isGym && x < 21) continue;
        var t = m.grid[y][x];
        if (SPOT_LABELS[t]) cands.push({ x: x, y: y, type: t });
      }
    }
    if (!cands.length) return null;
    var c = cands[Math.floor(Math.random() * cands.length)];
    var label = SPOT_LABELS[c.type];
    // everything sharing the name counts: "one of the student desks" means
    // ANY desk in the room -- kids shouldn't have to try every single one
    var tiles = [];
    cands.forEach(function (cd) {
      if (SPOT_LABELS[cd.type] === label) tiles.push([cd.x, cd.y]);
    });
    return { x: c.x, y: c.y, type: c.type, label: label, tiles: tiles };
  }

  function startHunt(roomId) {
    var letter = letterHeldBy(roomId);
    if (!letter) return;
    hunt = {
      roomId: roomId,
      letter: letter,
      name: G.TEACHERS[roomId].name.toUpperCase(),
      spot: pickSpot(roomId)
    };
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function battleAsk(onWin) {
    if (!hunt) return;
    var letter = hunt.letter;
    var name = hunt.name;
    var fakes = shuffle(DISTRACTORS[letter].slice()).slice(0, 3);
    var labels = shuffle([MEANINGS[letter]].concat(fakes));
    var choices = labels.map(function (label) {
      return {
        label: label,
        cb: label === MEANINGS[letter]
          ? function () {
              // celebrate first (looping victory jingle + animation), then
              // hand out the letter when the player presses enter
              if (G.Game && G.Game.battleVictory) {
                G.Game.battleVictory(function () { battleWin(onWin); });
              } else {
                battleWin(onWin);
              }
            }
          : function () {
              G.Audio.sfx('locked');
              G.Dialogue.start([
                { name: name, text: 'Not quite! Take a breath and try again!' }
              ], { onDone: function () { battleAsk(onWin); } });
            }
      };
    });
    G.Dialogue.start([
      { name: name, text: 'Quick... what does the letter ' + letter + ' stand for in the SOAR expectations?!' }
    ], { choices: choices });
  }

  function battleWin(onWin) {
    var letter = hunt.letter;
    var name = hunt.name;
    hunt = null;
    var pages = [
      { name: name, text: "That's IT! " + letter + ' is for ' + MEANINGS[letter] + '! You caught it!' },
      {
        text: 'You caught the letter ' + letter + '!  (' + (countFound() + 1) + ' of 4)',
        icon: icons[letter],
        fanfare: true,
        letter: letter
      }
    ];
    if (countFound() + 1 === 4) {
      pages.push({
        name: name,
        text: "That's all four letters! S... O... A... R! Hurry and take them to Mrs. Walker's office on the ground floor!"
      });
    }
    G.Dialogue.start(pages, { onDone: onWin });
  }

  var walkerMet = false;

  function walkerDialogue(onClose) {
    metWalker = true;
    var name = 'MRS. WALKER';
    var carried = carriedLetters();

    // the whole banner is back up: time to celebrate
    if (allDelivered()) {
      G.Dialogue.start([
        { name: name, text: 'Just LOOK at that banner shine! S! O! A! R! Ashland is whole again, and it is all thanks to YOU!' }
      ], {
        choices: [
          { label: "We're ready to SOAR!", cb: function () { G.Game.startEnding(); } },
          { label: 'Just visiting!', cb: onClose }
        ]
      });
      return;
    }

    // carrying letters? she takes however many you have, right now
    if (carried.length) {
      var pages = [];
      if (!walkerMet) {
        walkerMet = true;
        pages.push({ name: name, text: "Hello! I'm Mrs. Walker, the principal of Ashland Elementary. And you must be the student Eddie has been squawking about!" });
      }
      pages.push({
        name: name,
        text: carried.length === 4
          ? 'My goodness... ALL FOUR golden letters are floating right behind you! S! O! A! R! You wonderful Eagle!'
          : 'Is that the golden ' + letterList(carried) + ' floating behind you?! You found ' + (carried.length === 1 ? 'it' : 'them') + '!'
      });
      pages.push({
        name: name,
        text: carried.length === 1
          ? 'Quick -- let me put it back on the wall where it belongs. Watch this!'
          : 'Quick -- let me put them back on the wall where they belong. Watch this!'
      });
      G.Dialogue.start(pages, {
        onDone: function () {
          if (G.Game && G.Game.deliverLetters) {
            G.Game.deliverLetters(carried, function () { afterDelivery(onClose); });
          } else {
            carried.forEach(deliver);
            afterDelivery(onClose);
          }
        }
      });
      return;
    }

    // empty-handed visits
    if (countDelivered() > 0) {
      var missing = LETTERS.filter(function (l) { return !delivered[l]; });
      G.Dialogue.start([
        { name: name, text: 'The banner is looking better already... but the golden ' + letterList(missing) + (missing.length === 1 ? ' is' : ' are') + ' still out there somewhere!' },
        { name: name, text: 'Bring me any letter you catch -- even one at a time! Eddie the Eagle can always remind you which ones are missing.' }
      ], { onDone: onClose });
      return;
    }

    var hello = [];
    if (!walkerMet) {
      walkerMet = true;
      hello.push({ name: name, text: "Hello! I'm Mrs. Walker, the principal of Ashland Elementary. I'm SO excited for the 26/27 school year!" });
    }
    // she knows whether Eddie's story has been heard -- no sending kids
    // back to a conversation they already had
    if (metEddie) {
      hello.push({ name: name, text: 'Oh, I see you already talked to Eddie about him losing our golden letters!' });
      hello.push({ name: name, text: suggestTeacher() + ' Maybe they have seen something!' });
    } else {
      hello.push({ name: name, text: 'See that empty banner up on my wall? Our four golden letters -- S, O, A, R -- are MISSING! Have you talked to EDDIE THE EAGLE yet? He is waddling around the hallway near the front doors. Go hear his story!' });
    }
    G.Dialogue.start(hello, { onDone: onClose });
  }

  // Mrs. Walker sends the student to a random teacher somewhere in the
  // building: "Go see Mr. Piercey in Room 217, up on the top floor!"
  function suggestTeacher() {
    var ids = Object.keys(G.TEACHERS).filter(function (id) {
      return id !== 'm-walker' && !G.TEACHERS[id].noLetter && !G.TEACHERS[id].roomOf && G.ROOMS[id];
    });
    var id = ids[Math.floor(Math.random() * ids.length)];
    var r = G.ROOMS[id];
    var who = G.TEACHERS[id].name;
    var num = roomNum(id);
    var where = { middle: 'on the ground floor', top: 'up on the top floor', basement: 'down on the lower floor' }[r.floor];
    if (num) return 'Go see ' + who + ' in Room ' + num + ', ' + where + '!';
    var title = r.name.toLowerCase().replace(/(^|[\s/])\w/g, function (c) { return c.toUpperCase(); });
    var place = /^the\b/i.test(r.name) ? title : 'the ' + title;
    return 'Go see ' + who + ' in ' + place + ', ' + where + '!';
  }

  // Mrs. Walker's reaction right after the letters fly onto the wall
  function afterDelivery(onClose) {
    var name = 'MRS. WALKER';
    var left = 4 - countDelivered();
    if (left === 0) {
      G.Dialogue.start([
        { name: name, text: 'S! O! A! R! The banner is COMPLETE! Every Eagle in this school is going to SOAR this year because of YOU!' }
      ], {
        choices: [
          { label: "We're ready to SOAR!", cb: function () { G.Game.startEnding(); } },
          { label: 'Let me look around!', cb: onClose }
        ]
      });
      return;
    }
    var cheer = left === 1
      ? 'Only ONE more to go! I can practically hear the whole school cheering already!'
      : left === 2
        ? 'Halfway there -- only 2 more to go! You are on a ROLL!'
        : 'Only ' + left + ' more to go! Keep it up, super Eagle!';
    G.Dialogue.start([
      { name: name, text: 'Just look at it sparkle up there! Perfect!' },
      { name: name, text: cheer }
    ], { onDone: onClose });
  }

  function eagleDialogue(onClose) {
    metEddie = true;
    var pages = [
      { name: 'EDDIE THE EAGLE', text: 'SQUAWK! Oh no, oh no... am I glad to see you! I need your help, friend!' },
      { name: 'EDDIE THE EAGLE', text: 'All summer I was flying around the school helping the teachers get their rooms set up for the new year...' },
      { name: 'EDDIE THE EAGLE', text: '...and while I was swooping through the halls, I accidentally DROPPED all four golden letters of our motto! S! O! A! R! They scattered EVERYWHERE!' },
      { name: 'EDDIE THE EAGLE', text: 'Will you help me find them? Talk to the teachers in their rooms -- they keep spotting the letters while they set up!' },
      { name: 'EDDIE THE EAGLE', text: 'But KNOW our SOAR expectations first, because the teachers will quiz you!' },
      { name: 'EDDIE THE EAGLE', text: 'S is for SAFETY AT WORK AND PLAY.' },
      { name: 'EDDIE THE EAGLE', text: 'O is for ON TASK EVERY DAY.' },
      { name: 'EDDIE THE EAGLE', text: 'A is for ACCOUNTABLE FOR ALL WE DO.' },
      { name: 'EDDIE THE EAGLE', text: 'And R is for RESPECT FOR ME AND YOU. That is how Eagles SOAR!' },
      { name: 'EDDIE THE EAGLE', text: 'When you have all four letters, take them to Mrs. Walker, our principal -- her office is at the far end of this hallway. SQUAWK! Good luck!' }
    ];
    if (allFound()) {
      pages = [{ name: 'EDDIE THE EAGLE', text: 'SQUAWK! You found all four letters! You are a true Eagle! Hurry to Mrs. Walker\'s office at the far end of this hallway!' }];
    } else if (countFound() > 0) {
      var still = LETTERS.filter(function (l) { return !found[l]; });
      var list = still.length === 1 ? still[0]
        : still.slice(0, -1).join(', ') + ' and ' + still[still.length - 1];
      pages.splice(1, 3,
        { name: 'EDDIE THE EAGLE', text: 'You have found ' + countFound() + ' of the letters I dropped! You still need ' + list + ' -- keep talking to the teachers!' });
    }
    G.Dialogue.start(pages, { onDone: onClose });
  }

  function officerDialogue(onClose) {
    var name = 'OFFICER GARTH';
    var pages;
    if (allFound()) {
      pages = [
        { name: name, text: 'Well would you look at that -- you found ALL FOUR letters! Up top, buddy! HIGH FIVE!' },
        { name: name, text: 'Now hustle over to Mrs. Walker\'s office and show her. I am SO proud of you!' }
      ];
    } else {
      pages = [
        { name: name, text: 'Well hey there, friend! I\'m Officer Garth, Ashland\'s school resource officer. Welcome to The Office!' },
        { name: name, text: 'Mrs. Coleman and I keep everything running smooth around here. She does the important stuff... I mostly hand out high fives!' },
        { name: name, text: 'You know my favorite letter? S! Because S is for SAFETY AT WORK AND PLAY -- the first word in SOAR. Safety is kind of my whole thing!' },
        { name: name, text: 'If you ever need anything, you come find me or Mrs. Coleman right here. Now go help Eddie track down those letters!' }
      ];
      if (countFound() > 0) {
        pages.splice(3, 0, { name: name, text: 'Hey, I heard you already found ' + countFound() + ' of the letters Eddie dropped! You are on a ROLL!' });
      }
    }
    G.Dialogue.start(pages, { onDone: onClose });
  }

  function collect(letter) {
    if (!found[letter]) {
      found[letter] = true;
      G.Audio.sfx('fanfare');
    }
  }

  function deliver(letter) {
    delivered[letter] = true;
  }

  G.Quest = {
    LETTERS: LETTERS,
    init: init,
    found: found,
    delivered: delivered,
    holders: holders,
    countFound: countFound,
    allFound: allFound,
    countDelivered: countDelivered,
    allDelivered: allDelivered,
    carriedLetters: carriedLetters,
    collect: collect,
    deliver: deliver,
    teacherDialogue: teacherDialogue,
    eagleDialogue: eagleDialogue,
    officerDialogue: officerDialogue,
    icons: icons,
    startHunt: startHunt,
    getHunt: function () { return hunt; },
    clearHunt: function () { hunt = null; },
    isSpotType: function (t) { return !!SPOT_LABELS[t]; },
    battleAsk: battleAsk,
    objective: objective,
    guide: guide
  };
})();
