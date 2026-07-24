/* Ashland Elementary 26/27 - FF6-style 16x24 character sprites from pixel templates */
var G = window.G = window.G || {};

(function () {
  var W = 16, H = 24;

  // palette keys:
  // . transparent  O outline  H hair  h hair shadow  S skin  s skin shadow
  // W eye white    E eye dark T shirt t shirt shadow L pants F shoes

  // G = hair shine, U = shirt highlight (FF6-style 3-shade ramps)
  var FACE_DOWN = [
    '................',
    '......OOOO......',
    '....OSSSSSSO....',
    '...OSSSSSSSSO...',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSWESSSSEWSO..',   // eyes: mirror-symmetric, pupils facing forward
    '..OSSSSSSSSSSO..',
    '..OSSSESSESSSO..',   // smile: raised corners (dark)...
    '...OSSSEESSSO...',   // ...center dips for a clear ‿ curve
    '....OSSSSSSO....'
  ];

  var FACE_UP = [
    '................',
    '......OOOO......',
    '....OSSSSSSO....',
    '...OSSSSSSSSO...',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '...OSSSSSSSSO...',
    '....OSSSSSSO....'
  ];

  var FACE_LEFT = [
    '................',
    '......OOOO......',
    '....OSSSSSSO....',
    '...OSSSSSSSSO...',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OWESSSSSSSSO..',
    '..OSSSSSSSSSSO..',
    '..OsSSSSSSSSO...',
    '...OSSSSSSSO....',
    '....OSSSSO......'
  ];

  var HAIR = {
    'short': {
      down: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGGHHHHHHO...',
        '..OGGHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OhHHHHHHHHhO..',
        '...h........h...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
      up: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGGHHHHHHO...',
        '..OGGHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '..OHhHHHHHHhHO..',
        '..OHHHHHHHHHHO..',
        '..OHHHHhhHHHHO..',
        '...hHHHHHHHHh...',
        '....HhhhhhhH....',
        '................',
        '................',
        '................',
        '................',
        '................'],
      left: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '.......hHHHHHO..',
        '..........HHHO..',
        '..........hHHh..',
        '...........hh...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
    },
    'long': {
      down: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OHGHHHHGHO...',
        '..OHGHHhHHHGHO..',
        '..OHhHHHHHHhHO..',
        '..OHh......hHO..',
        '..OH........HO..',
        '..OE........EO..',
        '..Oh........hO..',
        '..OH........HO..',
        '...O........O...',
        '....H......H....',
        '....H......H....',
        '....H......H....',
        '....h......h....',
        '....h......h....'],
      up: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGGHHHHHHO...',
        '..OGGHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '..OHhHHHHHHhHO..',
        '..OHHHHHHHHHHO..',
        '..OHHHhHHhHHHO..',
        '..OHHHHHHHHHHO..',
        '...OHHHHHHHHO...',
        '....HHHHHHHH....',
        '....HhHHHHhH....',
        '....HHHHHHHH....',
        '.....HhHHhH.....',
        '....hhhhhhhh....'],
      left: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGhHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '......hHHHHHHO..',
        '..O.....HHHHHO..',
        '.........hHHHO..',
        '.........HHHH...',
        '.........hHHh...',
        '.........HHHH...',
        '.........hHHh...',
        '.........HHHH...',
        '.........hHh....',
        '..........h.....'],
    },
    'bowl': {
      down: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGGHHHHHHO...',
        '..OGGHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '..OhHHHHHHHHhO..',
        '..OE........EO..',
        '..OH........HO..',
        '..OH........HO..',
        '....h......h....',
        '................',
        '................',
        '................',
        '................',
        '................'],
      up: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGGHHHHHHO...',
        '..OGGHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '..OHhHHHHHHhHO..',
        '..OHHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '...OhHHHHHHhO...',
        '................',
        '................',
        '................',
        '................',
        '................'],
      left: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '..O.....HHHHHO..',
        '.........hHHHO..',
        '.........hHHHh..',
        '..........hh....',
        '................',
        '................',
        '................',
        '................',
        '................'],
    },
    'spiky': {
      down: [
        '....H..HH..H....',
        '...OHOOHHOOHO...',
        '....OHHHHHHO....',
        '...OGGHHHHHHO...',
        '..OGGHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OhHHHHHHHHhO..',
        '...h........h...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
      up: [
        '....H..HH..H....',
        '...OHOOHHOOHO...',
        '....OHHHHHHO....',
        '...OGGHHHHHHO...',
        '..OGGHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '..OHhHHHHHHhHO..',
        '..OHHHHHHHHHHO..',
        '..OHHHHhhHHHHO..',
        '...hHHHHHHHHh...',
        '....HhhhhhhH....',
        '................',
        '................',
        '................',
        '................',
        '................'],
      left: [
        '...H..HH..H.....',
        '..OHOOHHOOHO....',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '.......hHHHHHO..',
        '..........HHHO..',
        '..........hHHh..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
    },
    'afro': {
      down: [
        '.....OOOOOO.....',
        '...OHHhHHhHHO...',
        '..OHhHHHHHHhHO..',
        '..OHHHhHHhHHHO..',
        '.OhHHHHHHHHHHhO.',
        '.OHhHHhHHhHHhHO.',
        '.OHHHHHHHHHHHHO.',
        '..Oh........hO..',
        '..OH........HO..',
        '..OH........HO..',
        '...O........O...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
      up: [
        '.....OOOOOO.....',
        '...OHHhHHhHHO...',
        '..OHhHHHHHHhHO..',
        '..OHHHhHHhHHHO..',
        '.OhHHHHHHHHHHhO.',
        '.OHhHHhHHhHHhHO.',
        '.OHHHHHHHHHHHHO.',
        '..OHhHHHHHhHHO..',
        '..OhHHhHHhHHhO..',
        '..OHHHHHHHHHHO..',
        '...OhHHhHHhHO...',
        '....hHHHHHh.....',
        '................',
        '................',
        '................',
        '................',
        '................'],
      left: [
        '.....OOOOOO.....',
        '...OHHhHHhHHO...',
        '..OHhHHHHHHhHO..',
        '..OHHHhHHhHHHO..',
        '.OhHHHHHHHHHHhO.',
        '.OHhHHhHHhHHhHO.',
        '.OhHHHHHHHHHHO..',
        '..OhHHHHhHHHHO..',
        '.......hHHHhH...',
        '.........hHHh...',
        '.........hHHh...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
    },
    'bun': {
      down: [
        '......OHHO......',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGHHHHHHGO...',
        '..OGHHHHHHHHGO..',
        '..OhHHHHHHHHhO..',
        '..OhHHHHHHHHhO..',
        '...h........h...',
        '...E........E...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
      up: [
        '......OHHO......',
        '......OhhO......',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGHHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OHHHhHHhHHHO..',
        '..OHHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '...hHHHHHHHHh...',
        '....HhhhhhhH....',
        '................',
        '................',
        '................',
        '................',
        '................'],
      left: [
        '.........OHHO...',
        '......OOOOhO....',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '.......hHHHHHO..',
        '..O......HHHHO..',
        '..........hHh...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
    },
    'ponytail': {
      down: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGHHHHHHGO...',
        '..OGHHHHHHHHGO..',
        '..OhHHHHHHHHhO..',
        '..OhHHHHHHHHhO..',
        '...h........h...',
        '...E........E...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
      up: [
        '......hHHh......',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGHHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OHHHhHHhHHHO..',
        '..OHHHOHHOHHHO..',
        '..OHHHhHHhHHHO..',
        '..OHHHHhhHHHHO..',
        '...hHHhHHhHHh...',
        '....HHhHHhH.....',
        '......hHHh......',
        '......hHHh......',
        '.......HH.......',
        '.......hh.......',
        '................'],
      left: [
        '.........hHHh...',
        '......OOOOHO....',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '.......hHHHHHO..',
        '..O......HHHHO..',
        '...........HHH..',
        '...........hHH..',
        '............HH..',
        '............hH..',
        '............Hh..',
        '............h...',
        '................',
        '................'],
    },
    'pigtails': {
      down: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGHHHHHHGO...',
        '..OGHHHHHHHHGO..',
        '..OhHHHHHHHHhO..',
        '..OhHHHHHHHHhO..',
        '.H.h........h.H.',
        '.H.E........E.H.',
        '.h............h.',
        '.H............H.',
        '.h............h.',
        '..h..........h..',
        '................',
        '................',
        '................',
        '................'],
      up: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGHHHHHHHHHO..',
        '..OGHHHHHHHHHO..',
        '..OHHHhHHhHHHO..',
        '.HHHHHHHHHHHHHH.',
        '.HOHHHHHHHHHHOH.',
        '.hOhHHHHHHHHhOh.',
        '.H.hHHHHHHHHh.H.',
        '.h..HHhhhhHH..h.',
        '..h..........h..',
        '................',
        '................',
        '................',
        '................'],
      left: [
        '................',
        '......OOOO......',
        '....OHHHHHHO....',
        '...OGHHHHHHHO...',
        '..OGHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '..OhHHHHHHHHHO..',
        '.......hHHHHHHH.',
        '..O......HHHHOH.',
        '...........hHOh.',
        '.............HH.',
        '.............hh.',
        '................',
        '................',
        '................',
        '................',
        '................'],
    },
    'buzz': {
      down: [
        '................',
        '......OOOO......',
        '....OhHhHhHO....',
        '...OHhHhHhHhO...',
        '..OHhHhHhHhHhO..',
        '..O.h.h.h.h.hO..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
      up: [
        '................',
        '......OOOO......',
        '....OhHhHhHO....',
        '...OHhHhHhHhO...',
        '..OHhHhHhHhHhO..',
        '..OhHhHhHhHhHO..',
        '..OHhHhHhHhHhO..',
        '..Oh.h.hh.h.hO..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
      left: [
        '................',
        '......OOOO......',
        '....OhHhHhHO....',
        '...OHhHhHhHhO...',
        '..OHhHhHhHhHhO..',
        '..O.h.hHhHhHhO..',
        '........hhHhO...',
        '..........h.h...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
    },
    'bald': {
      down: [
        '................',
        '......OOOO......',
        '....GG..........',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
      up: [
        '................',
        '......OOOO......',
        '....GG..........',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
      left: [
        '................',
        '......OOOO......',
        '....GG..........',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'],
    },
  };

  var BODY_DOWN_STAND = [
    '...OUTTTTTTUO...',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OTtttttttTTO..',
    '...OTTTTTTTTO...',
    '....OLLLLLLO....',
    '....OlLOOLlO....',
    '....OLO..OLO....',
    '....OlO..OLO....',
    '....OFO..OFO....',
    '...OFFO..OFFO...'
  ];

  var BODY_DOWN_STEP = [
    '...OUTTTTTTUO...',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OTtttttttTTO..',
    '...OTTTTTTTTO...',
    '....OLLLLLLO....',
    '....OlLOOLlO....',
    '....OLO..OLO....',
    '....OlO..OFO....',
    '....OFO..OFO....',
    '..OFFFO.........'
  ];

  // dress bodies: fitted top, flared skirt, legs peeking out at the hem
  var BODY_DRESS_DOWN_STAND = [
    '...OUTTTTTTUO...',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OTTTTTTTTTTO..',
    '...OTTTTTTTTO...',
    '...OtTTTTTTtO...',
    '..OTTTTTTTTTTO..',
    '..OtTTTTTTTTtO..',
    '...OOOOOOOOOO...',
    '.....OS..SO.....',
    '....OFO..OFO....'
  ];
  var BODY_DRESS_DOWN_STEP = [
    '...OUTTTTTTUO...',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OTTTTTTTTTTO..',
    '...OTTTTTTTTO...',
    '...OtTTTTTTtO...',
    '..OTTTTTTTTTTO..',
    '..OtTTTTTTTTtO..',
    '...OOOOOOOOOO...',
    '.....OS..SO.....',
    '...OFO...OFO....'
  ];
  var BODY_DRESS_LEFT_STAND = [
    '...OUTTTTTTO....',
    '...OtTTTTTTO....',
    '...OTtTTTTTO....',
    '...OTTTTTTTO....',
    '....OTTTTTO.....',
    '...OtTTTTTTO....',
    '..OTTTTTTTTO....',
    '..OTTTTTTTTO....',
    '...OOOOOOOO.....',
    '.....OS.SO......',
    '.....OFOFO......'
  ];
  var BODY_DRESS_LEFT_STEP = [
    '...OUTTTTTTO....',
    '...OtTTTTTTO....',
    '...OTtTTTTTO....',
    '...OTTTTTTTO....',
    '....OTTTTTO.....',
    '...OtTTTTTTO....',
    '..OTTTTTTTTO....',
    '..OTTTTTTTTO....',
    '...OOOOOOOO.....',
    '....OS...SO.....',
    '....OFO..OFO....'
  ];

  var BODY_LEFT_STAND = [
    '...OUTTTTTTO....',
    '...OtTTTTTTO....',
    '...OTtTTTTTO....',
    '...OTtttttTO....',
    '....OTTTTTO.....',
    '....OLLLLLO.....',
    '....OlLLLlO.....',
    '.....OLOLO......',
    '.....OlOLO......',
    '.....OFOFO......',
    '....OFFOFFO.....'
  ];

  var BODY_LEFT_STEP = [
    '...OUTTTTTTO....',
    '...OtTTTTTTO....',
    '...OTtTTTTTO....',
    '...OTtttttTO....',
    '....OTTTTTO.....',
    '....OLLLLLO.....',
    '....OlLLLlO.....',
    '....OLO.OLO.....',
    '...OLO...OLO....',
    '...OFO...OFO....',
    '...OFO...OFFO...'
  ];

  // ---- adult bodies: teachers get real 16-bit grown-up proportions --------
  // same 13-row head/hair system on top, but a 16-row body underneath
  // (H = 29): a neck, squared shoulders, sleeved arms ending in hands,
  // a belt line, and legs long enough to look like they pay taxes
  var AH = 29;

  var ADULT_DOWN_STAND = [
    '.....OsSSsO.....',
    '..OUTTTTTTTTUO..',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OTtttttttTTO..',
    '..OsTTTTTTTTsO..',
    '...OTTTTTTTTO...',
    '...OllllllllO...',
    '....OLLLLLLO....',
    '....OlLOOLlO....',
    '....OLO..OLO....',
    '....OLO..OLO....',
    '....OlO..OlO....',
    '....OFO..OFO....',
    '...OFFO..OFFO...'
  ];

  var ADULT_DOWN_STEP = [
    '.....OsSSsO.....',
    '..OUTTTTTTTTUO..',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OTtttttttTTO..',
    '..OsTTTTTTTTsO..',
    '...OTTTTTTTTO...',
    '...OllllllllO...',
    '....OLLLLLLO....',
    '....OlLOOLlO....',
    '....OLO..OLO....',
    '....OLO..OLO....',
    '....OlO..OFO....',
    '....OFO..OFO....',
    '..OFFFO.........'
  ];

  var ADULT_LEFT_STAND = [
    '.....OsSsO......',
    '...OUTTTTTTO....',
    '...OtTTTTTTO....',
    '...OTtTTTTTO....',
    '...OTtTTTTTO....',
    '...OTtttttTO....',
    '....OsTTTTO.....',
    '....OTTTTTO.....',
    '....OlllllO.....',
    '....OLLLLLO.....',
    '....OlLLLlO.....',
    '.....OLOLO......',
    '.....OLOLO......',
    '.....OlOLO......',
    '.....OFOFO......',
    '....OFFOFFO.....'
  ];

  var ADULT_LEFT_STEP = [
    '.....OsSsO......',
    '...OUTTTTTTO....',
    '...OtTTTTTTO....',
    '...OTtTTTTTO....',
    '...OTtTTTTTO....',
    '...OTtttttTO....',
    '....OsTTTTO.....',
    '....OTTTTTO.....',
    '....OlllllO.....',
    '....OLLLLLO.....',
    '....OlLLLlO.....',
    '....OLO.OLO.....',
    '...OLO...OLO....',
    '...OlO...OlO....',
    '...OFO...OFO....',
    '...OFO...OFFO...'
  ];

  // adult dress: fitted top, hands at the waist, a longer flared skirt
  var ADULT_DRESS_DOWN_STAND = [
    '.....OsSSsO.....',
    '..OUTTTTTTTTUO..',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OsTTTTTTTTsO..',
    '...OTTTTTTTTO...',
    '...OtTTTTTTtO...',
    '..OTTTTTTTTTTO..',
    '..OTTTTTTTTTTO..',
    '..OtTTTTTTTTtO..',
    '.OTTTTTTTTTTTTO.',
    '.OOOOOOOOOOOOOO.',
    '.....OS..SO.....',
    '.....Os..sO.....',
    '....OFO..OFO....',
    '...OFFO..OFFO...'
  ];
  var ADULT_DRESS_DOWN_STEP = [
    '.....OsSSsO.....',
    '..OUTTTTTTTTUO..',
    '..OtTTTTTTTTtO..',
    '..OtTTTTTTTTtO..',
    '..OsTTTTTTTTsO..',
    '...OTTTTTTTTO...',
    '...OtTTTTTTtO...',
    '..OTTTTTTTTTTO..',
    '..OTTTTTTTTTTO..',
    '..OtTTTTTTTTtO..',
    '.OTTTTTTTTTTTTO.',
    '.OOOOOOOOOOOOOO.',
    '.....OS..SO.....',
    '.....Os..sO.....',
    '....OFO..OFO....',
    '..OFFO...OFFO...'
  ];
  var ADULT_DRESS_LEFT_STAND = [
    '.....OsSsO......',
    '...OUTTTTTTO....',
    '...OtTTTTTTO....',
    '...OTtTTTTTO....',
    '....OsTTTTO.....',
    '....OTTTTTO.....',
    '...OtTTTTTTO....',
    '..OTTTTTTTTO....',
    '..OTTTTTTTTO....',
    '..OtTTTTTTtO....',
    '.OTTTTTTTTTTO...',
    '.OOOOOOOOOOOO...',
    '.....OS.SO......',
    '.....Os.sO......',
    '.....OFOFO......',
    '....OFFOFFO.....'
  ];
  var ADULT_DRESS_LEFT_STEP = [
    '.....OsSsO......',
    '...OUTTTTTTO....',
    '...OtTTTTTTO....',
    '...OTtTTTTTO....',
    '....OsTTTTO.....',
    '....OTTTTTO.....',
    '...OtTTTTTTO....',
    '..OTTTTTTTTO....',
    '..OTTTTTTTTO....',
    '..OtTTTTTTtO....',
    '.OTTTTTTTTTTO...',
    '.OOOOOOOOOOOO...',
    '.....OS.SO......',
    '....OS...SO.....',
    '....OFO.OFO.....',
    '...OFFO.OFFO....'
  ];

  function mirrorRows(rows) {
    return rows.map(function (r) { return r.split('').reverse().join(''); });
  }

  function composeFrame(head, body) {
    return head.concat(body);
  }

  function applyGlasses(rows, dir) {
    // draw dark frames across the eye row
    var out = rows.slice();
    function repl(rowIdx, from, to) {
      var r = out[rowIdx].split('');
      for (var i = from; i <= to; i++) {
        if (r[i] === 'W' || r[i] === 'E' || r[i] === 'S') r[i] = 'E';
      }
      out[rowIdx] = r.join('');
    }
    if (dir === 'down') { repl(8, 3, 12); }
    else if (dir === 'left') { repl(8, 2, 7); }
    else if (dir === 'right') { repl(8, 8, 13); }
    return out;
  }

  // ---- beard ----------------------------------------------------------------
  // a bushy overlay across the lower face; big enough to spill past the jaw
  // outline and drape over the neck onto the collar. B = beard, b = shadow.
  // built for 'down' and 'left'; 'right' is mirrored from left, 'up' shows none.
  var BEARD_DOWN = {
    9:  '...BB.BBBB.BB...',   // mustache + upper cheeks
    10: '..bBBBBBBBBBBb..',   // full cheeks, spilling past the outline
    11: '...bBBBBBBBBb...',   // chin
    12: '....bBBBBBBb....',   // jaw
    13: '.....bBBBBb.....',   // draping over the neck
    14: '.......bBb......'    // a tuft on the collar
  };
  var BEARD_SIDE = {
    9:  '...BBBBBB.......',   // front cheek
    10: '..bBBBBBBBB.....',   // jaw, past the outline
    11: '...BBBBBBB......',   // chin
    12: '....bBBBBb......',   // under the chin
    13: '.....bBBb.......'    // drape onto the neck
  };
  function applyBeard(rows, dir) {
    if (dir === 'up') return rows;
    var map = dir === 'down' ? BEARD_DOWN : BEARD_SIDE;
    var out = rows.slice();
    Object.keys(map).forEach(function (y) {
      if (!out[y]) return;
      var src = map[y], dst = out[y].split('');
      for (var x = 0; x < W; x++) {
        if (src[x] && src[x] !== '.') dst[x] = src[x];
      }
      out[y] = dst.join('');
    });
    return out;
  }

  // ---- suit tie -------------------------------------------------------------
  // a knot under the chin and a short tail down the chest, with two white
  // collar points. Front view only (you can't see a tie from behind, and at
  // one pixel wide it reads as noise from the side).
  function applyTie(rows) {
    var out = rows.slice();
    function set(y, x, ch) {
      if (!out[y]) return;
      var r = out[y].split('');
      if (r[x] === 'T' || r[x] === 't' || r[x] === 'U') { r[x] = ch; out[y] = r.join(''); }
    }
    set(14, 6, 'W'); set(14, 9, 'W');   // collar points on the shoulder row
    set(15, 7, 'V'); set(15, 8, 'V');   // the knot
    set(16, 7, 'V'); set(16, 8, 'V');   // the tail...
    set(17, 7, 'v'); set(17, 8, 'v');   // ...tapering into shadow
    return out;
  }

  // ---- hair overlays --------------------------------------------------------
  // each style has a full 17-row overlay per direction (13 head rows + 4
  // rows that drape over the shoulders); non-dot cells replace the frame
  function applyHair(rows, dir, style) {
    var overlay = (HAIR[style] || HAIR.short)[dir === 'right' ? 'left' : dir];
    var out = rows.slice();
    for (var y = 0; y < overlay.length && y < out.length; y++) {
      var src = overlay[y];
      var dst = out[y].split('');
      for (var x = 0; x < W; x++) {
        if (src[x] && src[x] !== '.') dst[x] = src[x];
      }
      out[y] = dst.join('');
    }
    return out;
  }

  // ---- the designer palettes (10 of each) ---------------------------------
  var STYLES = [
    { id: 'short', name: 'Short' },
    { id: 'long', name: 'Long' },
    { id: 'bowl', name: 'Bob' },
    { id: 'spiky', name: 'Spiky' },
    { id: 'afro', name: 'Curly' },
    { id: 'bun', name: 'Bun' },
    { id: 'ponytail', name: 'Ponytail' },
    { id: 'pigtails', name: 'Pigtails' },
    { id: 'buzz', name: 'Buzz' },
    { id: 'bald', name: 'Bald' }
  ];
  var SKINS = ['#f7d6b0', '#f2c398', '#e8b284', '#e0a878', '#cf9463',
               '#c98a5a', '#b57a4a', '#a06a42', '#8a5632', '#6f4526'];
  var HAIRCOLORS = ['#20203a', '#3a2a1a', '#6f4a26', '#8a5a33', '#c14a24',
                    '#d98a2b', '#e8b64c', '#8a8f96', '#e8e8e2', '#4a3a5a'];
  var OUTFITS = [
    { name: 'Green polo', shirt: '#2e8f57', pants: '#3d5c92', shoes: '#e8e8e2' },
    { name: 'Navy blazer', shirt: '#33406e', pants: '#3a3f45', shoes: '#20242a' },
    { name: 'Red cardigan', shirt: '#c43a3a', pants: '#555b63', shoes: '#e8e8e2' },
    { name: 'Purple sweater', shirt: '#9a6ee0', pants: '#4a3a5a', shoes: '#e8e8e2' },
    { name: 'Orange tee', shirt: '#e8722c', pants: '#3d5c92', shoes: '#e8e8e2' },
    { name: 'Teal button-up', shirt: '#2a8f8f', pants: '#6f4a26', shoes: '#6f4a26' },
    { name: 'Pink cardigan', shirt: '#e06a92', pants: '#555b63', shoes: '#e8e8e2' },
    { name: 'Gold polo', shirt: '#d9a520', pants: '#3a3f45', shoes: '#e8e8e2' },
    { name: 'Gray hoodie', shirt: '#7a8089', pants: '#3a3f45', shoes: '#e8e8e2' },
    { name: 'Sky blue shirt', shirt: '#4a9ad4', pants: '#33406e', shoes: '#e8e8e2' },
    { name: 'Dress', shirt: '#9a6ee0', pants: '#4a3a5a', shoes: '#20242a', dress: true },
    // brighter dresses and proper suits (append only -- saved outfit
    // numbers point into this list, so the old entries must not move)
    { name: 'Sunny dress', shirt: '#f2c14e', pants: '#4a3a5a', shoes: '#e8e8e2', dress: true },
    { name: 'Sky dress', shirt: '#4a9ad4', pants: '#33406e', shoes: '#f4f0e6', dress: true },
    { name: 'Rose dress', shirt: '#e05a6e', pants: '#4a3a5a', shoes: '#20242a', dress: true },
    { name: 'Mint dress', shirt: '#57c28f', pants: '#2d5a4a', shoes: '#f4f0e6', dress: true },
    { name: 'Navy suit & tie', shirt: '#33406e', pants: '#2a3350', shoes: '#20242a', tie: '#c43a3a' },
    { name: 'Gray suit & tie', shirt: '#6a7078', pants: '#4a4f57', shoes: '#20242a', tie: '#d9a520' },
    { name: 'Shirt & tie', shirt: '#f4f0e6', pants: '#3a3f45', shoes: '#20242a', tie: '#2a6ed4' }
  ];

  // clothing colors the outfit can be re-dyed with
  var SHIRTCOLORS = ['#2e8f57', '#c43a3a', '#3a63c4', '#9a6ee0', '#e8722c',
                     '#2a8f8f', '#e06a92', '#d9a520', '#7a8089', '#33406e'];
  var PANTSCOLORS = ['#3d5c92', '#20242a', '#555b63', '#6f4a26', '#3a3f45',
                     '#4a3a5a', '#7a2d2d', '#2d5a4a', '#c9b78a', '#f4f0e6'];

  // ov = {style, skin, hairColor, outfit, shirtColor?, pantsColor?, glasses} -> sprite cfg
  function cfgFrom(ov) {
    var outfit = OUTFITS[(ov.outfit || 0) % OUTFITS.length];
    return {
      style: STYLES[(ov.style || 0) % STYLES.length].id,
      skin: SKINS[(ov.skin || 0) % SKINS.length],
      hair: HAIRCOLORS[(ov.hairColor || 0) % HAIRCOLORS.length],
      shirt: (ov.shirtColor === undefined || ov.shirtColor === null)
        ? outfit.shirt
        : SHIRTCOLORS[ov.shirtColor % SHIRTCOLORS.length],
      pants: (ov.pantsColor === undefined || ov.pantsColor === null)
        ? outfit.pants
        : PANTSCOLORS[ov.pantsColor % PANTSCOLORS.length],
      shoes: outfit.shoes,
      dress: !!outfit.dress,
      tie: outfit.tie || null,
      glasses: !!ov.glasses,
      beard: ov.beard || null   // hex color, e.g. '#8a8f96' for gray
    };
  }

  function paint(rows, pal) {
    var c = document.createElement('canvas');
    c.width = W; c.height = rows.length;
    var ctx = c.getContext('2d');
    for (var y = 0; y < rows.length; y++) {
      var row = rows[y];
      for (var x = 0; x < W; x++) {
        var ch = row[x];
        if (!ch || ch === '.') continue;
        var col = pal[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
    var g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
    var b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /**
   * cfg: { skin, hair, shirt, pants, shoes, glasses, style: 'short'|'long'|'bald' }
   * returns { down:[stand,a,b], up:[...], left:[...], right:[...] } of canvases
   */
  function buildFrames(cfg, bodies) {
    var pal = {
      O: '#1c1c26',
      H: cfg.hair || '#c14a24',
      h: shade(cfg.hair || '#c14a24', 0.68),
      G: shade(cfg.hair || '#c14a24', 1.4),   // hair shine
      S: cfg.skin || '#f2c398',
      s: shade(cfg.skin || '#f2c398', 0.78),
      W: '#ffffff',
      E: '#20203a',
      T: cfg.shirt || '#2e8f57',
      t: shade(cfg.shirt || '#2e8f57', 0.7),
      U: shade(cfg.shirt || '#2e8f57', 1.35),  // shirt highlight
      L: cfg.pants || '#3d5c92',
      l: shade(cfg.pants || '#3d5c92', 0.72),  // pants shadow
      F: cfg.shoes || '#e8e8e2',
      V: cfg.tie || '#c43a3a',
      v: shade(cfg.tie || '#c43a3a', 0.7),
      B: cfg.beard || '#8a8f96',
      b: shade(cfg.beard || '#8a8f96', 0.7)   // beard shadow
    };

    function prep(rows, dir) {
      var out = applyHair(rows, dir, cfg.style || 'short');
      if (cfg.beard) out = applyBeard(out, dir);
      if (cfg.glasses) out = applyGlasses(out, dir);
      // ties belong to the tall adult template only (rows 14-17 are the
      // chest there; on the kid template those rows are legs)
      if (cfg.tie && !cfg.dress && bodies.adult && dir === 'down') out = applyTie(out);
      return out;
    }

    var dDownStand = bodies.downStand;
    var dDownStep = bodies.downStep;
    var dLeftStand = bodies.leftStand;
    var dLeftStep = bodies.leftStep;
    var downStand = prep(composeFrame(FACE_DOWN, dDownStand), 'down');
    var downStep = prep(composeFrame(FACE_DOWN, dDownStep), 'down');
    var upStand = prep(composeFrame(FACE_UP, dDownStand), 'up');
    var upStep = prep(composeFrame(FACE_UP, dDownStep), 'up');
    var leftStand = prep(composeFrame(FACE_LEFT, dLeftStand), 'left');
    var leftStep = prep(composeFrame(FACE_LEFT, dLeftStep), 'left');
    // the alternate walk frame mirrors ONLY the body (other leg steps out);
    // face and hair stay put so the eyes don't flick back and forth
    var downStep2 = prep(composeFrame(FACE_DOWN, mirrorRows(dDownStep)), 'down');
    var upStep2 = prep(composeFrame(FACE_UP, mirrorRows(dDownStep)), 'up');

    var frames = {
      down: [paint(downStand, pal), paint(downStep, pal), paint(downStep2, pal)],
      up: [paint(upStand, pal), paint(upStep, pal), paint(upStep2, pal)],
      left: [paint(leftStand, pal), paint(leftStep, pal), paint(leftStand, pal)],
      right: [paint(mirrorRows(leftStand), pal), paint(mirrorRows(leftStep), pal), paint(mirrorRows(leftStand), pal)]
    };
    return frames;
  }

  // kids: the classic chibi 16x24 template
  function make(cfg) {
    return buildFrames(cfg, {
      downStand: cfg.dress ? BODY_DRESS_DOWN_STAND : BODY_DOWN_STAND,
      downStep: cfg.dress ? BODY_DRESS_DOWN_STEP : BODY_DOWN_STEP,
      leftStand: cfg.dress ? BODY_DRESS_LEFT_STAND : BODY_LEFT_STAND,
      leftStep: cfg.dress ? BODY_DRESS_LEFT_STEP : BODY_LEFT_STEP
    });
  }

  // grown-ups: same head and hair, taller 16x29 body with human proportions
  function makeAdult(cfg) {
    return buildFrames(cfg, {
      adult: true,
      downStand: cfg.dress ? ADULT_DRESS_DOWN_STAND : ADULT_DOWN_STAND,
      downStep: cfg.dress ? ADULT_DRESS_DOWN_STEP : ADULT_DOWN_STEP,
      leftStand: cfg.dress ? ADULT_DRESS_LEFT_STAND : ADULT_LEFT_STAND,
      leftStep: cfg.dress ? ADULT_DRESS_LEFT_STEP : ADULT_LEFT_STEP
    });
  }

  // Eddie the Eagle mascot: one 16x20 frame
  var EAGLE_ROWS = [
    '................',
    '.....OOOO.......',
    '....OWWWWO......',
    '...OWWEWWWO.....',
    '...OWWWWWYYO....',
    '...OWWWWWYYYO...',
    '....OWWWWYYO....',
    '..OOBBBBBBOO....',
    '.OBBBBBBBBBBO...',
    'OBbBBBBBBBBbBO..',
    'OBbBBBBBBBBbBO..',
    'OBBbBBBBBBbBBO..',
    '.OBBBBBBBBBBO...',
    '.OBBbBBBBbBBO...',
    '..OBBBBBBBBO....',
    '...OBBBBBBO.....',
    '....OWWWWO......',
    '....OYYYYO......',
    '...OYYOOYYO.....',
    '................'
  ];

  var EAGLE_PAL = {
    O: '#1c1c26', W: '#f4f4ee', E: '#20203a', Y: '#e8a62c',
    B: '#6f4a26', b: '#553516'
  };

  function paintRows(rows, w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < w; x++) {
        var ch = rows[y][x];
        if (!ch || ch === '.') continue;
        ctx.fillStyle = EAGLE_PAL[ch];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function eagle() {
    return paintRows(EAGLE_ROWS, 16, 20);
  }

  // Eddie in flight (side view, flying left): a proper eagle silhouette --
  // white head with hooked beak, big brown wing with splayed primary
  // feathers, fanned white tail. Two frames: wings up / wings down.
  var EAGLE_FLY_UP = [
    '................................',
    '..................b..b..b.......',
    '..................bBbBbBb.......',
    '.................bBBBBBBb.......',
    '................bBBBBBBb........',
    '...............bBBBBBb..........',
    '....OOOO.......bBBBBb...........',
    '...OWWWWWO....bBBBBb............',
    '.YYYWWEWWWO...BBBBb.............',
    '...OWWWWWWBBBBBBBBBBBBBWWWWW....',
    '....OWBBBBBBBBBBBBBBBBBWWWWWW...',
    '.....OBBBBBBBBBBBBBBBBBWWWWW....',
    '......OBBBBBBBBBBBBBBBO.........',
    '.......ObBBBBBBBBBBbO...........',
    '.........YY..YY.................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................'
  ];
  var EAGLE_FLY_DOWN = [
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '....OOOO........................',
    '...OWWWWWO......................',
    '.YYYWWEWWWO.....................',
    '...OWWWWWWBBBBBBBBBBBBBWWWWW....',
    '....OWBBBBBBBBBBBBBBBBBWWWWWW...',
    '.....OBBBBBBBBBBBBBBBBBWWWWW....',
    '......OBBBBBBBbBBBBBBBO.........',
    '.........bBBBBBb................',
    '..........bBBBBb................',
    '...........bBBBBb...............',
    '............bBbBb...............',
    '.............b.b.b..............',
    '................................',
    '................................'
  ];

  function eagleFly() {
    return [paintRows(EAGLE_FLY_UP, 32, 20), paintRows(EAGLE_FLY_DOWN, 32, 20)];
  }

  // gold quest letter icon (for fanfares / HUD sparkle)
  function letterIcon(letter) {
    var c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#8a6d1a';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#f7d84d';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#fdf0a8';
    ctx.fillRect(2, 2, 12, 3);
    G.Tiles.drawTinyText(ctx, letter, 5, 5, '#6b4d10', 2);
    return c;
  }

  G.Sprites = {
    make: make, makeAdult: makeAdult, eagle: eagle, eagleFly: eagleFly,
    letterIcon: letterIcon, W: W, H: H, AH: AH,
    STYLES: STYLES, SKINS: SKINS, HAIRCOLORS: HAIRCOLORS, OUTFITS: OUTFITS,
    SHIRTCOLORS: SHIRTCOLORS, PANTSCOLORS: PANTSCOLORS,
    cfgFrom: cfgFrom
  };
})();
