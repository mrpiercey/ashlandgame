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

  // ---- the stuck-player clock ---------------------------------------------
  // wander this long without turning up a letter or a clue and Eddie flies in
  // to name a teacher who actually has one. Any real progress restarts it.
  var HINT_AFTER = 300; // seconds
  var idleT = 0;
  function noteProgress() { idleT = 0; }

  // is the player stuck in a way a hint can actually fix?
  function needsHint() {
    if (hunt || allFound() || allDelivered() || partyMode) return false;
    if (!metEddie || !metWalker) return false; // the opening already guides them
    // there has to be an unfound letter sitting in a real, reachable room
    return missingLetters().some(function (l) {
      return holders[l] && G.ROOMS[holders[l]] && G.TEACHERS[holders[l]];
    });
  }

  // true exactly once each time the player has been adrift for HINT_AFTER.
  // The clock only runs while a hint would actually help.
  function idleTick(dt) {
    if (!needsHint()) return false;
    idleT += dt;
    if (idleT < HINT_AFTER) return false;
    idleT = 0;
    return true;
  }

  // Eddie names a teacher whose room really does still hold a letter, and
  // sets pendingHint so the sidebar and the guide arrow follow him for free.
  function eddieHintLine() {
    var missing = missingLetters().filter(function (l) {
      return holders[l] && G.ROOMS[holders[l]] && G.TEACHERS[holders[l]];
    });
    if (!missing.length) return null;
    // don't just repeat the room they already ignored, if there's another
    var fresh = missing.filter(function (l) {
      return !pendingHint || holders[l] !== pendingHint.roomId;
    });
    var pool = fresh.length ? fresh : missing;
    var letter = pool[Math.floor(Math.random() * pool.length)];
    var roomId = holders[letter];
    pendingHint = { letter: letter, roomId: roomId };
    var d = describeTeacherPlace(roomId);
    return 'Looking for a hint? Go check with ' + d.who + ' in ' + d.place + ', ' + d.where + '!';
  }

  function roomNum(roomId) {
    var r = G.ROOMS[roomId];
    var m = r && /^ROOM (\d+)/.exec(r.name);
    return m ? m[1] : null;
  }

  // how everyone -- hinter teachers, Mrs. Walker, Eddie -- names a place:
  // "Room 220" / "Mrs. Smith's room (Room 213)" / "the Cafeteria", plus the
  // floor. Classrooms need their number: there are two Mrs. Smiths!
  var FLOOR_WORDS = {
    middle: 'on the ground floor',
    top: 'up on the top floor',
    basement: 'down on the lower floor'
  };
  function describeTeacherPlace(roomId) {
    var room = G.ROOMS[roomId];
    var who = G.TEACHERS[roomId].name;
    var num = roomNum(roomId);
    var title = room.name.toLowerCase().replace(/(^|[\s/])\w/g, function (c) { return c.toUpperCase(); });
    var named = /^the\b/i.test(room.name) ? title : 'the ' + title;
    return {
      who: who,
      num: num,
      where: FLOOR_WORDS[room.floor],
      // "Room 220" for a classroom, "the Cafeteria" for a named space
      place: num ? 'Room ' + num : named,
      // the longer form a gossiping teacher uses
      ownedPlace: num ? who + "'s room (Room " + num + ')' : named
    };
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
  function objective(focusRoomId, curFloor) {
    // (only the win state gets an exclamation point -- the rest stay calm)
    if (partyMode) return { text: 'DANCE! DJ EDDIE ENDS THE PARTY', color: '#f7d84d' };
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
    // Mrs. Walker pointed the student at a specific teacher
    if (walkerTip && G.TEACHERS[walkerTip] && G.ROOMS[walkerTip]) {
      var tw = G.TEACHERS[walkerTip].name.toUpperCase();
      var ORDER = { basement: 0, middle: 1, top: 2 };
      var tFloor = G.ROOMS[walkerTip].floor;
      var stairs = curFloor === undefined || tFloor === curFloor ? ''
        : ORDER[tFloor] > ORDER[curFloor] ? 'GO UPSTAIRS AND ' : 'GO DOWNSTAIRS AND ';
      var tn = roomNum(walkerTip);
      return { text: stairs + 'TALK TO ' + tw + (!stairs && tn ? ' (ROOM ' + tn + ')' : ''), color: '#9fd4e8' };
    }
    // quest on-ramp: Eddie's story first, then Mrs. Walker's briefing
    if (!metEddie) return { text: 'TALK TO EDDIE THE EAGLE', color: '#9fd4e8' };
    if (!metWalker) return { text: 'TALK TO MRS. WALKER', color: '#9fd4e8' };
    // exploring: one steady nudge, in Eddie-green so it reads as a tip
    return { text: 'GO TALK TO SOME OF YOUR TEACHERS', color: '#5fbd87' };
  }

  // what the GTA-style guide arrow should point at right now (semantic
  // target -- main.js resolves it to pixels on the current map)
  function guide() {
    if (partyMode) return null; // free play: just dance
    if (allDelivered()) return null;
    if (hunt) return { kind: 'hunt', roomId: hunt.roomId, spot: hunt.spot };
    if (allFound()) return { kind: 'walker' };
    if (pendingHint && !found[pendingHint.letter]) return { kind: 'room', roomId: pendingHint.roomId };
    if (walkerTip && G.ROOMS[walkerTip]) return { kind: 'room', roomId: walkerTip };
    if (!metEddie) return { kind: 'eddie' };
    if (!metWalker) return { kind: 'walker' };
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

  // letters still out there somewhere in the school
  function missingLetters() {
    return LETTERS.filter(function (l) { return !found[l]; });
  }

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
    var d = describeTeacherPlace(roomId);
    var place = d.ownedPlace, where = d.where;
    var hints = [
      'I heard ' + d.who + ' found something shiny while setting up! Check ' + place + ', ' + where + '.',
      'Psst... someone spotted a golden letter in ' + place + ', ' + where + '!',
      'Try ' + place + ', ' + where + ' -- Eddie was flying around in there all summer!'
    ];
    pendingHint = { letter: letter, roomId: roomId };
    noteProgress(); // a real clue counts as making headway
    return { text: hints[Math.floor(Math.random() * hints.length)] };
  }

  // ---- EASTER EGG: Mrs. Todd loves Dolly Parton ---------------------------
  // talk to her 9 times IN A ROW (visiting anyone else resets the count) and
  // she starts thinking about Dolly; a 10th visit unlocks the full playlist
  var toddTalks = 0;

  function dollyDialogue(name, onClose) {
    // the 11th visit: the FULL Dolly experience (and the streak resets after)
    if (toddTalks >= 11) {
      G.Dialogue.start([
        { name: name, text: 'Do you want to hear my favorite Dolly song?' }
      ], {
        choices: [
          { label: 'YES!', cb: function () {
            toddTalks = 0; // the party is the grand finale -- streak resets
            if (G.Game && G.Game.startDollyParty) G.Game.startDollyParty();
          } },
          { label: 'Maybe later!', cb: onClose }
        ]
      });
      return;
    }
    if (toddTalks === 9) {
      G.Dialogue.start([
        { name: name, text: "You know what I've been thinking about? DOLLY PARTON. The Queen of Country! She's my favorite singer in the whole wide world." },
        { name: name, text: "And she isn't just a singer -- she mails FREE books to kids all over the planet! Kindness AND great music. Now THAT's a superstar." }
      ], { onDone: onClose });
      return;
    }
    // the 10th visit: the full playlist
    var SONGS = [
      { name: name, text: 'YAY!! Okay, here we go -- Mrs. Todd\'s OFFICIAL favorite Dolly Parton songs! Ready? Deep breath...' },
      { name: name, text: 'COAT OF MANY COLORS. Five stars! It\'s about kindness, empathy, and being thankful for what you have.' },
      { name: name, text: 'I BELIEVE IN YOU -- a whole song about believing in yourself! And IMAGINATION -- it celebrates creativity!' },
      { name: name, text: 'YOU CAN DO IT -- never, ever give up! And RESPONSIBILITY -- all about making good choices.' },
      { name: name, text: 'A FRIEND LIKE YOU -- friendship! And I AM A RAINBOW -- loving exactly who you are, every color of you.' },
      { name: name, text: 'TOGETHER FOREVER -- sticking together! And MAKIN\' FUN AIN\'T FUNNY -- because making fun of someone is NEVER funny.' },
      { name: name, text: 'BRAVE LITTLE SOLDIER -- staying brave through tough times. And LOVE IS LIKE A BUTTERFLY -- gentle as a garden.' },
      { name: name, text: 'MY TENNESSEE MOUNTAIN HOME -- family and sweet memories. And APPLEJACK -- the funnest bluegrass sing-along there is!' },
      { name: name, text: 'And LIGHT OF A CLEAR BLUE MORNING -- a song about hope. Every morning is a brand-new chance to shine!' },
      { name: name, text: "Whew! That's the whole list! Now you know the secret: be kind, be brave, and SING while you do it. Just like Dolly!" }
    ];
    G.Dialogue.start([
      { name: name, text: 'Do you want to hear about ALL of my favorite Dolly Parton songs?' }
    ], {
      choices: [
        { label: 'YES! Tell me!', cb: function () { G.Dialogue.start(SONGS, { onDone: onClose }); } },
        { label: 'Maybe later!', cb: onClose }
      ]
    });
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

    // reached the teacher Mrs. Walker suggested? mission accomplished
    if (roomId === walkerTip) walkerTip = null;

    // Dolly Parton watch: only an unbroken streak of Mrs. Todd visits counts
    toddTalks = roomId === 'm-todd' ? toddTalks + 1 : 0;

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

    // the 9th straight visit tips Mrs. Todd into Dolly Parton territory
    if (roomId === 'm-todd' && toddTalks >= 9) {
      dollyDialogue(name, onClose);
      return;
    }

    // the 10th chat with Mr. Piercey unlocks his dad-joke stash for good
    if (roomId === 't-217' && talkCount[roomId] >= 10) {
      pierceyJokeOffer(name, onClose);
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
  // the big shared pool: forty school-positive lines, nothing personal.
  // every teacher draws a different dozen, so no two neighbors sound alike
  var FORWARD = [
    'I cannot WAIT for the first day of school!',
    'This year is going to be one to remember. I can feel it!',
    'We have so many fun things planned for this year!',
    'I am SO excited to meet all my new students!',
    'The first week of school is my favorite week of the whole year!',
    'Big things are coming this year. BIG things!',
    'Every new school year feels like a brand new adventure!',
    'New year, new friends, new things to learn. I love it!',
    'Mistakes are proof that you are trying. We LOVE mistakes here!',
    'Ask questions! Great questions are how great learning starts.',
    'Readers are leaders. Grab a book every chance you get!',
    'Being kind is always the right answer.',
    'S-O-A-R: Safety, On task, Accountable, Respect. That is the Ashland Way!',
    'The best classrooms are full of curious kids. Bring your curiosity!',
    'Every single student in this school matters. Including YOU.',
    'Hard things become easy things with practice. Every time!',
    'A good night of sleep is a secret school superpower.',
    'Eat a good breakfast and your brain says THANK YOU.',
    'Teamwork makes everything better -- and more fun!',
    'You do not have to be perfect. You just have to try!',
    'Some days are tricky. We help each other through those.',
    'Every expert was once a beginner. Every single one!',
    'Your brain grows every time you learn something new. Really!',
    'Helping a friend is one of the best feelings there is.',
    'We celebrate effort here, not just answers!',
    'There is no such thing as a silly question in my class.',
    'When you feel stuck, take a deep breath and try again.',
    'Listening is a superpower. So is sharing.',
    'The library is full of adventures. Have you visited yet?',
    'Recess, lunch, learning -- every part of the day matters!',
    'Say good morning to somebody tomorrow. It changes their whole day!',
    'You belong here. Every Eagle does.',
    'Try something NEW this year. You might love it!',
    'Neat desks are nice, but kind hearts are better.',
    'The more you read, the more places you will go!',
    'Water, sleep, and a smile -- the school day starter pack!',
    'If you see someone sitting alone, invite them in. That is the Eagle way.',
    'Learning is not a race. Go at YOUR pace and keep going!',
    'Practice makes progress. Progress makes pride!',
    'One day soon this hallway will be FULL of happy noise. I cannot wait!'
  ];

  // specials teachers describe (generically) what their class does
  var SPECIALS_LINES = {
    'b-gym': [
      'In PE we warm up, play games, and get MOVING!',
      'We play basketball, run relay races, and learn to be good sports!',
      'My number one gym rule: try your best and cheer for your team!',
      'The big red curtain means the gym is our stage too!',
      'Stretch first, play hard, high-five after. That is PE!',
      'You do not have to be the fastest. You just have to MOVE!',
      'Good sports say GOOD GAME no matter who wins.',
      'Sneakers tied tight? Then you are ready for my class!',
      'We learn new games all year -- some you have never even heard of!',
      'Exercise makes your body AND your brain stronger.'
    ],
    'b-music': [
      'In music class we sing, clap rhythms, and play instruments!',
      'Music is for EVERYONE -- every voice belongs in this room!',
      'Wait until you hear our first concert of the year!',
      'We learn songs, beats, and maybe even a little dancing!',
      'Clap this: ta, ta, ti-ti, ta! You just read rhythm!',
      'Loud parts, quiet parts -- music is full of surprises.',
      'Xylophones, drums, shakers... we get to play them ALL.',
      'If you can talk, you can sing. Everyone can!',
      'Some days we listen, some days we PERFORM!',
      'The best sound in this school is a whole class singing together.'
    ],
    'b-dance': [
      'I teach Dance AND Drama -- jazz hands, everyone!',
      'In our class we move, act, and put on little shows!',
      'Our stage is right upstairs in the gym!',
      'Warm-ups, stretches, and BIG dramatic feelings. That is drama class!',
      'Freeze like a statue... now MELT like ice cream! That is a drama game.',
      'Every story needs actors. This year, that is YOU.',
      'We practice speaking loud and proud so the back row can hear!',
      'Dancers count to eight. Five, six, seven, eight!',
      'Being a little nervous before a show is totally normal -- even for grown-ups.',
      'Take a bow! You always end a performance with a bow.'
    ],
    't-221': [
      "I'm the ART teacher! We get to use paint, clay, and glitter this year!",
      'In art class we draw, paint, and create something new every week!',
      'Every artist starts somewhere -- this room is where YOU start!',
      'Messy hands mean a masterpiece is happening!',
      'Red and yellow make orange. Blue and yellow make green. Try it!',
      'There is no WRONG way to make art. That is the best part.',
      'We learn about real artists and then create like them!',
      'Smocks on, sleeves up -- it is about to get creative in here.',
      'Some of the best art in this school hangs right in the hallway!',
      'Scissors, glue, paint, clay... this room has ALL the good stuff.'
    ],
    't-lib': [
      'Welcome to the library -- home of Media Arts!',
      'We read amazing books and learn to find GREAT information!',
      'In media arts we get creative with stories and technology!',
      'There is a perfect book in here for every single reader!',
      'Picture books, chapter books, joke books -- we have them ALL.',
      'You can borrow books and take them home. For FREE. Forever the best deal.',
      'Treat books gently and they will last for hundreds of readers.',
      'If you loved a book, tell me -- I will find you another one just like it!',
      'Shhh is only SOMETIMES the rule in here. Sometimes we get loud about books!',
      'Authors and illustrators make books together. Maybe you will make one someday!'
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
      // this teacher's ACTUAL facts from their welcome letter come first
      lines = lines.concat(real);
    } else {
      var specials = SPECIALS_LINES[t.roomOf || roomId];
      if (specials) lines = lines.concat(specials);
    }
    // everyone tops up to a baker's dozen from the shared pool -- each
    // teacher draws a different slice (stride 7 is coprime with the pool
    // size, so a single teacher never repeats a line)
    var off = chash(roomId + 'fw') % FORWARD.length;
    for (var i = 0; lines.length < 13 && i < FORWARD.length; i++) {
      lines.push(FORWARD[(off + i * 7) % FORWARD.length]);
    }
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
    noteProgress(); // found a teacher who really has one
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
  var walkerBriefed = false; // heard her how-to-get-the-letters-back speech

  function walkerDialogue(onClose) {
    metWalker = true;
    var name = 'MRS. WALKER';
    var carried = carriedLetters();

    // the whole banner is back up: time to celebrate
    if (allDelivered()) {
      // they may have finished touring the building after delivering the
      // last letter -- check again so the party unlocks either way
      if (G.Game && G.Game.allRoomsVisited && G.Game.allRoomsVisited()) secretParty = true;
      // visited every room? the party is the only way forward
      var doneChoices = secretParty
        ? [{ label: "Let's CELEBRATE!", cb: function () { G.Game.startParty(); } }]
        : [
            { label: "We're ready to SOAR!", cb: function () { G.Game.startEnding(); } },
            { label: 'Just visiting!', cb: onClose }
          ];
      G.Dialogue.start([
        { name: name, text: 'Just LOOK at that banner shine! S! O! A! R! Ashland is whole again, and it is all thanks to YOU!' }
      ], { choices: doneChoices });
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
    if (metEddie && !walkerBriefed) {
      // the one-time briefing: HOW to get the letters back, then she
      // sends the student off to a specific teacher
      walkerBriefed = true;
      hello.push({ name: name, text: 'Oh good, Eddie sent you! He told me ALL about dropping our four golden letters. Here is how we get them back...' });
      hello.push({ name: name, text: 'Talk to the teachers in their rooms -- they keep spotting the letters while they set up for the new year!' });
      hello.push({ name: name, text: 'But the teachers will QUIZ you before they help, so learn our SOAR expectations first!' });
      hello.push({ name: name, text: 'S is for SAFETY AT WORK AND PLAY.' });
      hello.push({ name: name, text: 'O is for ON TASK EVERY DAY.' });
      hello.push({ name: name, text: 'A is for ACCOUNTABLE FOR ALL WE DO.' });
      hello.push({ name: name, text: 'And R is for RESPECT FOR ME AND YOU. That is how Eagles SOAR!' });
      hello.push({ name: name, text: suggestTeacher() + ' Maybe they have seen something!' });
    } else if (metEddie) {
      hello.push({ name: name, text: 'Any luck finding those golden letters?' });
      hello.push({ name: name, text: suggestTeacher() + ' Maybe they have seen something!' });
    } else {
      hello.push({ name: name, text: 'See that empty banner up on my wall? Our four golden letters -- S, O, A, R -- are MISSING! Have you talked to EDDIE THE EAGLE yet? He is waddling around the hallway near the front doors. Go hear his story!' });
    }
    G.Dialogue.start(hello, { onDone: onClose });
  }

  // Mrs. Walker sends the student to a random teacher somewhere in the
  // building: "Go see Mr. Piercey in Room 217, up on the top floor!"
  // The pick becomes the live objective (sidebar text + guide arrow).
  var walkerTip = null;
  function suggestTeacher() {
    var ids = Object.keys(G.TEACHERS).filter(function (id) {
      return id !== 'm-walker' && !G.TEACHERS[id].noLetter && !G.TEACHERS[id].roomOf && G.ROOMS[id];
    });
    var id = ids[Math.floor(Math.random() * ids.length)];
    walkerTip = id;
    noteProgress(); // a fresh lead from the principal restarts the clock
    var d = describeTeacherPlace(id);
    return 'Go see ' + d.who + ' in ' + d.place + ', ' + d.where + '!';
  }

  // Mrs. Walker's reaction right after the letters fly onto the wall
  function afterDelivery(onClose) {
    var name = 'MRS. WALKER';
    var left = 4 - countDelivered();
    if (left === 0) {
      var pages = [
        { name: name, text: 'S! O! A! R! The banner is COMPLETE! Every Eagle in this school is going to SOAR this year because of YOU!' }
      ];
      var choices = [
        { label: "We're ready to SOAR!", cb: function () { G.Game.startEnding(); } },
        { label: 'Let me look around!', cb: onClose }
      ];
      // SECRET ENDING: they explored EVERY room before finishing the quest,
      // so the party is the only option on the menu
      if (G.Game && G.Game.allRoomsVisited && G.Game.allRoomsVisited()) {
        secretParty = true;
        pages.push({
          name: name,
          text: 'Wait a minute... YOU FOUND ALL OF THE LETTERS AND VISITED EVERY CLASSROOM! We love to celebrate effort here the Ashland Way... so let\'s CELEBRATE!'
        });
        choices = [{ label: "Let's CELEBRATE!", cb: function () { G.Game.startParty(); } }];
      }
      G.Dialogue.start(pages, { choices: choices });
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

  // ---- the secret dance party -----------------------------------------------
  var secretParty = false; // earned by visiting every room before finishing
  var partyMode = false;   // the party is happening right now
  var partyTalk = {};      // who the student has thanked-back so far

  function setPartyMode(on) { partyMode = on; }

  // everyone at the party thanks the student -- each guest cycles their own
  // personal 3-4 line set drawn from this pool
  var PARTY_LINES = [
    'Thank you for bringing our letters home!',
    'You found every letter AND visited every room. INCREDIBLE!',
    'This is the best back-to-school party EVER!',
    'Nice moves! You have earned this dance!',
    'S-O-A-R! S-O-A-R! Sing it with me!',
    'The banner looks PERFECT thanks to you!',
    'You are a true Ashland Eagle!',
    'I told everyone about the student who saved our motto!',
    'Best. Scavenger. Hunt. EVER!',
    'You explored the WHOLE school. Even I have not done that!',
    'When I heard the news, I cheered out loud!',
    'The 26/27 school year is going to be AMAZING because of you!',
    'DJ Eddie is playing my favorite song!',
    'Look at that banner shine! You did that!',
    'Three cheers for our letter finder! Hip hip HOORAY!',
    'You never gave up. That is the Ashland Way!',
    'I saved you a spot on the dance floor!',
    'Somebody get this Eagle a trophy!',
    'You worked hard and it PAID OFF!',
    'Our hero is HERE! Everybody dance!',
    'I am dancing because of YOU!',
    'The whole school is proud of you tonight!',
    'Safety, On task, Accountable, Respect -- and YOU showed all four!',
    'I could not stop smiling when the last letter went up!',
    'This party has your name all over it!',
    'Eddie has not stopped squawking about you!',
    'What a school year this is going to be!',
    'You made back-to-school feel like a celebration!'
  ];

  // a few guests get lines written just for them
  var PARTY_SPECIAL = {
    '__officer__': [
      'Even my HIGH FIVES are dancing tonight!',
      'Great job, buddy! Stay safe out there on the dance floor!',
      'S is for SAFETY... and SUPERSTAR! That is you!'
    ],
    'm-walker': [
      'THIS is what celebrating effort looks like! The Ashland Way!',
      'You found the letters AND visited every classroom. Remarkable!',
      'I could not be prouder of an Ashland Eagle!',
      'Enjoy every minute -- you EARNED this party!'
    ],
    'b-gym': [
      'MY gym has never looked better!',
      'Save some energy for PE class!',
      'Look at those moves -- ever thought about the basketball team?'
    ]
  };

  function partyDialogue(npc, onClose) {
    var id = npc.kind === 'officer' ? '__officer__' : npc.roomId;
    var name = npc.kind === 'officer' ? 'OFFICER GARTH'
      : (G.TEACHERS[id] ? G.TEACHERS[id].name.toUpperCase() : '???');
    var lines = PARTY_SPECIAL[id];
    if (!lines) {
      var base = chash(id + 'party');
      var count = 3 + (base % 2);            // 3 or 4 lines each
      lines = [];
      [0, 5, 9, 13].slice(0, count).forEach(function (off) {
        lines.push(PARTY_LINES[(base + off) % PARTY_LINES.length]);
      });
    }
    var k = partyTalk[id] || 0;
    partyTalk[id] = k + 1;
    G.Dialogue.start([{ name: name, text: lines[k % lines.length] }], { onDone: onClose });
  }

  function djDialogue(onClose) {
    var name = 'DJ EDDIE';
    G.Dialogue.start([
      { name: name, text: 'SQUAWK-SQUAWK! DJ EDDIE ON THE ONES AND TWOS! This party is all for YOU, letter-finder!' },
      { name: name, text: 'Dance as long as you want! When you are ready to wrap up the celebration, just say the word.' }
    ], {
      choices: [
        { label: 'Keep dancing!', cb: function () { if (onClose) onClose(); } },
        { label: 'Time to SOAR!', cb: function () { G.Game.finishParty(); } }
      ]
    });
  }

  // ---- Mr. Piercey's 50 dad jokes ----------------------------------------
  // dealt from a shuffled deck: random order, but no repeats until all 50
  // have been told, then the deck reshuffles and starts over
  var DAD_JOKES = [
    ['Why did the math book look so sad?', 'Because it had too many problems.'],
    ["What do you call cheese that isn't yours?", 'Nacho cheese.'],
    ["Why couldn't the bicycle stand up by itself?", 'It was two-tired.'],
    ['What do you call a bear with no teeth?', 'A gummy bear.'],
    ['Why did the student eat his homework?', 'Because the teacher said it was a piece of cake.'],
    ['What do you call a fish wearing a bowtie?', 'Sofishticated.'],
    ['Why did the golfer bring two pairs of pants?', 'In case he got a hole in one.'],
    ['How do you organize a space party?', 'You planet.'],
    ["Why don't eggs tell jokes?", "They'd crack each other up."],
    ['What kind of tree fits in your hand?', 'A palm tree.'],
    ['Why did the scarecrow win an award?', 'Because he was outstanding in his field.'],
    ['What do you call an alligator in a vest?', 'An investigator.'],
    ["Why can't your nose be 12 inches long?", 'Because then it would be a foot.'],
    ['What did one wall say to the other wall?', "I'll meet you at the corner."],
    ['What kind of music do planets like?', 'Neptunes.'],
    ['Why was the broom late?', 'It swept in.'],
    ['What do you call a sleeping dinosaur?', 'A dino-snore.'],
    ['Why did the cookie go to the doctor?', 'Because it felt crummy.'],
    ['How do bees get to school?', 'On the school buzz.'],
    ['What did the ocean say to the beach?', 'Nothing. It just waved.'],
    ['Why did the computer go to the doctor?', 'It had a virus.'],
    ['What do you call a cow with no legs?', 'Ground beef.'],
    ['Why did the pencil get an award?', 'It had a sharp mind.'],
    ['What did one plate say to the other plate?', 'Lunch is on me.'],
    ['Why are frogs so happy?', 'They eat whatever bugs them.'],
    ['What do you call a fake noodle?', 'An impasta.'],
    ['Why did the banana go to the nurse?', "Because it wasn't peeling well."],
    ['What do you call a snowman in July?', 'A puddle.'],
    ['Why did the music teacher need a ladder?', 'To reach the high notes.'],
    ['What did the stamp say to the envelope?', "Stick with me and we'll go places."],
    ['Why did the tomato blush?', 'Because it saw the salad dressing.'],
    ['What kind of shoes do ninjas wear?', 'Sneakers.'],
    ['Why did the clock get detention?', 'It kept tocking back.'],
    ["What do you call a boomerang that won't come back?", 'A stick.'],
    ['Why did the duck become a detective?', 'It always quacked the case.'],
    ["Why don't skeletons fight each other?", "They don't have the guts."],
    ['What do elves learn in school?', 'The elf-abet.'],
    ['Why was the library so tall?', 'Because it had lots of stories.'],
    ['What do you call a dog magician?', 'A labra-cadabra-dor.'],
    ['Why was the belt arrested?', 'It was holding up a pair of pants.'],
    ['What do you call a cloud that loves school?', 'A brainstorm.'],
    ['Why did the chicken join the band?', 'Because it had the drumsticks.'],
    ['What kind of room has no doors or windows?', 'A mushroom.'],
    ['Why did the crayon quit its job?', 'It was feeling drawn out.'],
    ['What do you call a rabbit with fleas?', 'Bugs Bunny.'],
    ['Why was the stadium so cool?', 'It was full of fans.'],
    ['What did one volcano say to the other?', 'I lava you.'],
    ['Why did the astronaut break up with the moon?', 'It needed space.'],
    ["What kind of key can't open a lock?", 'A turkey.'],
    ['Why are elevators so good at telling jokes?', 'They always work on so many levels.']
  ];
  var jokeDeck = [];

  function pierceyJokeOffer(name, onClose) {
    G.Dialogue.start([
      { name: name, text: 'Say, do you want to hear a dad joke?' }
    ], {
      choices: [
        { label: 'Yes!', cb: function () { tellDadJoke(name, onClose); } },
        { label: 'Not right now!', cb: function () { if (onClose) onClose(); } }
      ]
    });
  }

  function tellDadJoke(name, onClose) {
    if (!jokeDeck.length) {
      jokeDeck = DAD_JOKES.slice();
      for (var i = jokeDeck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = jokeDeck[i]; jokeDeck[i] = jokeDeck[j]; jokeDeck[j] = tmp;
      }
    }
    var joke = jokeDeck.pop();
    // setup on its own card; the punchline lands on the next click,
    // with the rimshot the instant it appears
    G.Dialogue.start([{ name: name, text: joke[0] }], {
      onDone: function () {
        G.Audio.playRimshot();
        G.Dialogue.start([{ name: name, text: joke[1] }], {
          onDone: function () {
            G.Dialogue.start([
              { name: name, text: 'Do you want to hear another one?' }
            ], {
              choices: [
                { label: 'Yes! Another!', cb: function () { tellDadJoke(name, onClose); } },
                { label: "That's enough!", cb: function () { if (onClose) onClose(); } }
              ]
            });
          }
        });
      }
    });
  }

  function eagleDialogue(onClose) {
    metEddie = true;
    // Eddie tells the story and points at the principal -- Mrs. Walker is
    // the one who explains HOW to get the letters back (quiz briefing etc.)
    var pages = [
      { name: 'EDDIE THE EAGLE', text: 'SQUAWK! Oh no, oh no... am I glad to see you! I need your help, friend!' },
      { name: 'EDDIE THE EAGLE', text: 'All summer I was flying around the school helping the teachers get their rooms set up for the new year...' },
      { name: 'EDDIE THE EAGLE', text: '...and while I was swooping through the halls, I accidentally DROPPED all four golden letters of our motto! S! O! A! R! They scattered EVERYWHERE!' },
      { name: 'EDDIE THE EAGLE', text: 'Will you help me find them? Go talk to MRS. WALKER, our principal, first -- her office is at the far end of this hallway. She knows how to get them back! SQUAWK!' }
    ];
    if (allFound()) {
      pages = [{ name: 'EDDIE THE EAGLE', text: 'SQUAWK! You found all four letters! You are a true Eagle! Hurry to Mrs. Walker\'s office at the far end of this hallway!' }];
    } else if (countFound() > 0) {
      var still = LETTERS.filter(function (l) { return !found[l]; });
      var list = still.length === 1 ? still[0]
        : still.slice(0, -1).join(', ') + ' and ' + still[still.length - 1];
      pages = [
        { name: 'EDDIE THE EAGLE', text: 'SQUAWK! You have found ' + countFound() + ' of the letters I dropped! You still need ' + list + ' -- keep talking to the teachers!' },
        { name: 'EDDIE THE EAGLE', text: 'And remember: when you are carrying letters, bring them to Mrs. Walker\'s office at the far end of this hallway!' }
      ];
    } else if (metWalker) {
      // heard the story already AND been briefed -- just a nudge
      pages = [
        { name: 'EDDIE THE EAGLE', text: 'SQUAWK! Mrs. Walker filled you in, right? Talk to the teachers in their rooms -- they keep spotting my letters while they set up!' }
      ];
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
      noteProgress();
      G.Audio.sfx('fanfare');
    }
  }

  function deliver(letter) {
    delivered[letter] = true;
    noteProgress();
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
    guide: guide,
    hasMetEddie: function () { return metEddie; },
    idleTick: idleTick,
    needsHint: needsHint,
    eddieHintLine: eddieHintLine,
    noteProgress: noteProgress,
    partyDialogue: partyDialogue,
    djDialogue: djDialogue,
    setPartyMode: setPartyMode
  };
})();
