/* Ashland Elementary 26/27 - teacher roster.
 *
 * >>> EDIT THIS FILE LATER to plug in the REAL teachers. <<<
 * Each entry is keyed by its room id (see rooms.js). Change `name` freely, and
 * tweak `sprite` to change how the teacher looks:
 *   hair / shirt / pants / skin: any CSS hex color
 *   style: 'short' | 'long' | 'bald'
 *   glasses: true | false
 * `quirk` is an extra personality line that teacher says.
 */
var G = window.G = window.G || {};

(function () {
  var QUIRKS = [
    "I've been decorating my room all summer!",
    "I hope you like to read, because I LOVE books!",
    "We're going to do so many fun projects this year!",
    "Did you know I have a class pet? You'll meet them soon!",
    "I can't wait to see everyone on the first day!",
    "Recess is my favorite subject... don't tell anyone!",
    "I put up a brand new bulletin board. Did you see it?",
    "This is going to be the BEST school year ever!",
    "I've got a whole shelf of new markers ready to go!",
    "Remember to bring your biggest smile on day one!"
  ];

  // deterministic pick so each teacher always looks the same
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function pick(arr, seed, salt) { return arr[(hash(seed + salt)) % arr.length]; }

  // every teacher gets a UNIQUE default look (style/skin/hair/outfit combo)
  var autoIndex = 0;
  function auto(roomId, name) {
    var i = autoIndex++;
    var ov = {
      style: i % 10,
      outfit: (i * 3) % 10,
      skin: (i + Math.floor(i / 10)) % 10,
      hairColor: (i * 7 + 2) % 10,
      glasses: i % 3 === 0
    };
    return {
      name: name,
      sprite: G.Sprites.cfgFrom(ov),
      spriteOv: ov,
      quirk: pick(QUIRKS, roomId, 'qk')
    };
  }

  // ---- ROSTER (room number -> teacher) ------------------------------------
  // Real names provided July 2026. Names still marked "placeholder" below can
  // be updated any time (mapeditor.html, or edit here directly).
  var T = {};

  // Middle floor
  T['m-walker'] = {
    name: 'Mrs. Walker',
    role: 'Principal',
    sprite: G.Sprites.cfgFrom({ style: 5, skin: 3, hairColor: 7, outfit: 1, glasses: true }),
    spriteOv: { style: 5, skin: 3, hairColor: 7, outfit: 1, glasses: true },
    quirk: ''
  };
  T['m-todd'] = auto('m-todd', 'Mrs. Todd');
  T['m-nurse'] = auto('m-nurse', 'Nurse Maria');
  T['m-front'] = auto('m-front', 'Mrs. Coleman');
  T['m-eagles'] = auto('m-eagles', 'Mrs. Wang');
  T['m-eagles'].noLetter = true;   // students can't enter her room
  T['m-eagles'].role = 'Bookkeeper';
  T['m-eagles'].intro = "Hi! I'm Mrs. Wang, Ashland's bookkeeper. The Eagle's Nest is staff-only, but it's lovely to meet you!";
  T['m-caf'] = auto('m-caf', 'Mrs. Adams');

  // Basement / downstairs
  T['b-gym'] = auto('b-gym', 'Ms. Kirk');
  T['b-gym'].quirk = 'Welcome to MY court! We play basketball, and the big red curtain means the gym is our stage too!';
  T['b-music'] = auto('b-music', 'Dr. Snyder');
  T['b-music'].quirk = 'Music is for EVERYONE! Wait until you hear our first concert of the year!';
  T['b-dance'] = auto('b-dance', 'Mrs. Oldham');
  T['b-dance'].quirk = 'I teach Dance AND Drama -- jazz hands, everyone! Our stage is right upstairs in the gym!';

  // Top floor - Library / Media Arts
  T['t-lib'] = auto('t-lib', 'Mrs. Basham');

  // Top floor classrooms: ROOM NUMBER -> teacher name
  // (Room 201 is the PLC Room and has no homeroom teacher, so it's not listed)
  var CLASSROOM_NAMES = {
    200: 'Mrs. Wilson',
    205: 'Mrs. Lewis',
    212: 'Mrs. Myers',
    213: 'Mrs. Smith',
    214: 'Mr. Foster',     // placeholder
    215: 'Mrs. Hill',
    216: 'Mr. Richards',
    217: 'Mr. Piercey',
    218: 'Ms. White',
    219: 'Mrs. Yoo',
    220: 'Mrs. Laborio',
    221: 'Mrs. Schaub',
    222: 'Mrs. Gaddis',
    223: 'Mr. Givan',
    224: 'Mrs. Messer',
    225: 'Ms. Mullins',
    226: 'Mrs. Goff',
    227: 'Mrs. Little',
    228: 'Mrs. Edelman',
    229: 'Mrs. German',
    230: 'Mrs. Mulert',
    231: 'Mrs. Boaz',
    232: 'Mrs. Brown',
    233: 'Mrs. Patel',
    234: 'Mrs. Maisy',
    235: 'Mrs. Smith'
  };
  Object.keys(CLASSROOM_NAMES).forEach(function (num) {
    T['t-' + num] = auto('t-' + num, CLASSROOM_NAMES[num]);
  });

  // Mrs. Schaub is the ART teacher (room 221)
  T['t-221'].quirk = "I'm the ART teacher! Wait until you see all the paint, clay and glitter we get to use this year!";

  // Room 233 is team-taught: Mrs. Patel AND Mrs. Songstad share it
  T['t-233'].co = 'Mrs. Songstad';
  T['t-233b'] = auto('t-233b', 'Mrs. Songstad');
  T['t-233b'].roomOf = 't-233';    // she lives in room 233's map
  T['t-233b'].noLetter = true;     // the room's letter is handled by Mrs. Patel

  // Mrs. Wilson (room 200) designed look
  T['t-200'].spriteOv = { style: 2, skin: 1, hairColor: 0, outfit: 6, glasses: false };
  T['t-200'].sprite = G.Sprites.cfgFrom(T['t-200'].spriteOv);

  // ---- support staff: custodians, aides and helpers -----------------------
  // each gets a T entry (dialogue + sprite frames); WHERE they stand is
  // decided in maps.js placeStaff. noLetter: staff never hold quest letters.
  function staff(id, name, ov, extra) {
    T[id] = {
      name: name,
      sprite: G.Sprites.cfgFrom(ov),
      spriteOv: ov,
      noLetter: true,
      quirk: ''
    };
    Object.keys(extra || {}).forEach(function (k) { T[id][k] = extra[k]; });
  }
  // custodians (they wander while they work) -- the whole crew keeps the
  // top floor shining together
  staff('staff-mellow', 'Mr. Mellow', { style: 8, skin: 8, hairColor: 0, outfit: 8 },
    { intro: "Hi there! I'm Mr. Mellow, one of Ashland's custodians. I keep this whole floor SHINING!" });
  staff('staff-rampulla', 'Mr. Rampulla', { style: 0, skin: 1, hairColor: 2, outfit: 8 },
    { intro: "Hello! I'm Mr. Rampulla, one of Ashland's custodians. This floor doesn't clean itself!" });
  staff('staff-perry', 'Mrs. Perry', { style: 5, skin: 0, hairColor: 7, outfit: 8 },
    { intro: "Hi! I'm Mrs. Perry, one of Ashland's custodians. We keep every corner of this school sparkling!" });
  // helpers around the building
  staff('staff-hurt', 'Mrs. Hurt', { style: 1, skin: 1, hairColor: 3, outfit: 2 }, { roomOf: 't-lib' });
  staff('staff-farmer', 'Mr. Farmer', { style: 8, skin: 9, hairColor: 0, outfit: 9 },
    { roomOf: 't-234', tall: true });
  staff('staff-jackson', 'Mr. Jackson', { style: 8, skin: 6, hairColor: 1, outfit: 4 }, { roomOf: 'b-gym' });
  staff('staff-elshaarawy', 'Mr. El-Shaarawy', { style: 0, skin: 5, hairColor: 0, outfit: 7 }, { roomOf: 'b-gym' });
  staff('staff-zimmerman', 'Mrs. Zimmermann', { style: 6, skin: 1, hairColor: 3, outfit: 9 },
    { intro: "Hi there! I'm Mrs. Zimmermann. You'll see me all around the building helping wherever I'm needed!" });
  staff('staff-marsh', 'Mrs. Marsh', { style: 2, skin: 2, hairColor: 1, outfit: 5 }, { roomOf: 'm-caf' });
  staff('staff-seivers', 'Mrs. Seivers', { style: 1, skin: 1, hairColor: 1, outfit: 7 },
    { intro: "Hello! I'm Mrs. Seivers. I help students all over this school -- maybe I'll get to help YOU this year!" });
  staff('staff-shadler', 'Mrs. Shadler', { style: 5, skin: 3, hairColor: 2, outfit: 0 },
    { intro: "Hi! I'm Mrs. Shadler. I'm always somewhere in the building lending a hand!" });
  staff('staff-helton', 'Mrs. Helton', { style: 1, skin: 0, hairColor: 6, outfit: 3 },
    { intro: "Hi there! I'm Mrs. Helton. If you ever need help finding your way, just ask me!" });
  staff('staff-garcia', 'Mrs. Garcia', { style: 1, skin: 5, hairColor: 1, outfit: 6 }, { roomOf: 't-224' });
  // teacher support, roaming the halls
  staff('staff-kjackson', 'Ms. Kay Jackson', { style: 6, skin: 6, hairColor: 0, outfit: 3 },
    { intro: "Hi! I'm Ms. Kay Jackson. I support students and teachers all over Ashland!" });
  staff('staff-stanfield', 'Mrs. Stanfield', { style: 1, skin: 0, hairColor: 3, outfit: 4 },
    { intro: "Hello! I'm Mrs. Stanfield. I'm part of the teacher support team -- we help make every classroom great!" });
  // band and orchestra, by the gym stage
  staff('staff-baker', 'Mrs. Baker', { style: 5, skin: 1, hairColor: 5, outfit: 2 },
    { intro: "Hi! I'm Mrs. Baker, the BAND teacher! When you're in 5th grade, you can join band and learn an instrument!" });
  staff('staff-komprs', 'Mrs. Komprs', { style: 2, skin: 2, hairColor: 1, outfit: 9 },
    { intro: "Hello! I'm Mrs. Komprs, the ORCHESTRA teacher! You can join orchestra in 4th or 5th grade -- strings are the best!" });
  // cafeteria crew, behind the serving counter
  staff('staff-haskins', 'Mrs. Hoskins', { style: 5, skin: 4, hairColor: 7, outfit: 7 }, { roomOf: 'm-caf' });
  staff('staff-taylor', 'Mrs. Taylor', { style: 4, skin: 8, hairColor: 0, outfit: 3 }, { roomOf: 'm-caf' });
  staff('staff-martin', 'Mrs. Martin', { style: 1, skin: 3, hairColor: 0, outfit: 6 }, { roomOf: 'm-caf' });

  // custom rooms whose teacher is a greeter, not a letter-holder
  var STAFF_NO_LETTER = { 'custom-2': true };

  // names saved into the code by the editors (js/room-overrides.js)
  Object.keys(G.TEACHER_NAME_OVERRIDES || {}).forEach(function (id) {
    if (T[id] && G.TEACHER_NAME_OVERRIDES[id]) T[id].name = G.TEACHER_NAME_OVERRIDES[id];
  });

  // names typed into the editors override everything (saved in this browser)
  try {
    var overrides = JSON.parse(localStorage.getItem('ashland-teacher-names') || '{}');
    Object.keys(overrides).forEach(function (id) {
      if (T[id] && overrides[id]) T[id].name = overrides[id];
    });
  } catch (e) { /* ignore bad saved data */ }

  // sprite looks designed in roomeditor.html (baked file, then this browser)
  function applySprites(map) {
    Object.keys(map || {}).forEach(function (id) {
      if (T[id] && map[id]) {
        T[id].spriteOv = map[id];
        T[id].sprite = G.Sprites.cfgFrom(map[id]);
      }
    });
  }
  applySprites(G.TEACHER_SPRITE_OVERRIDES);
  try {
    applySprites(JSON.parse(localStorage.getItem('ashland-teacher-sprites') || '{}'));
  } catch (e) { /* ignore bad saved data */ }

  // rooms created in the editor get a teacher on demand
  G.addCustomTeacher = function (id, name) {
    if (T[id]) return T[id];
    var ov = { style: 0, skin: 1, hairColor: 2, outfit: 0, glasses: false };
    T[id] = {
      name: name || 'New Teacher',
      sprite: G.Sprites.cfgFrom(ov),
      spriteOv: ov,
      quirk: pick(QUIRKS, id, 'qk')
    };
    if (STAFF_NO_LETTER[id]) T[id].noLetter = true;
    // apply any saved name/sprite for this id (localStorage wins over baked)
    var lsNames = {};
    try { lsNames = JSON.parse(localStorage.getItem('ashland-teacher-names') || '{}'); } catch (e) {}
    var bakedNames = G.TEACHER_NAME_OVERRIDES || {};
    if (lsNames[id]) T[id].name = lsNames[id];
    else if (bakedNames[id]) T[id].name = bakedNames[id];
    try {
      var sprites = JSON.parse(localStorage.getItem('ashland-teacher-sprites') || '{}');
      var sv = sprites[id] || (G.TEACHER_SPRITE_OVERRIDES || {})[id];
      if (sv) { T[id].spriteOv = sv; T[id].sprite = G.Sprites.cfgFrom(sv); }
    } catch (e) {}
    return T[id];
  };

  // She/He/They for a teacher. An explicit pick from the look editor wins
  // (stored as spriteOv.gender: 'f' | 'm'); otherwise the honorific in the
  // name decides; otherwise a respectful they/them.
  G.pronounsFor = function (id) {
    var t = T[id];
    var g = t && t.spriteOv && t.spriteOv.gender;
    if (!g && t) {
      if (/^(mrs|ms|miss|nurse)\.?\s/i.test(t.name)) g = 'f';
      else if (/^mr\.?\s/i.test(t.name)) g = 'm';
    }
    if (g === 'f') return { subj: 'she', obj: 'her', poss: 'her', has: 'has' };
    if (g === 'm') return { subj: 'he', obj: 'him', poss: 'his', has: 'has' };
    return { subj: 'they', obj: 'them', poss: 'their', has: 'have' };
  };

  G.TEACHERS = T;
})();
