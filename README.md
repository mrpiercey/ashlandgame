# Ashland Elementary – 26/27

A Final-Fantasy-3-(SNES)-style exploration game that lets students wander Ashland
Elementary before the school year starts, learn where the classrooms are, and meet
their teachers. No battles — the quest is to find the four missing golden letters
**S, O, A, R** (hidden with 4 random teachers every time the game loads) and bring
them to **Mrs. Walker**, the principal.

## How to play

**Easiest:** double-click `index.html` — it runs straight from the file.

**Or serve it** (recommended — also enables the room editor's SAVE button):

```
cd ashlandgame
python3 serve.py
# then open http://localhost:8123
```

It's a static site — it can be dropped onto GitHub Pages, Google Sites (embed), or
any web host as-is. Works on Chromebooks (keyboard) and iPads (on-screen d-pad +
A button appear automatically on touch devices).

### Controls

| Action | Keys |
|---|---|
| Walk | Arrow keys or WASD |
| Talk / advance text | Space, Enter, or Z |
| Run | Hold Shift or X |
| Mute music | M or the ♪ button |

Walk into a door to enter a room. Red/gray stairs go between floors. Purple doors
lead outside and are locked until the first day of school.

## The building

Built from the real floor maps:

- **Middle floor** (start): Front Office, Nurse, Mrs. Todd's Office, Mrs. Walker's
  Office, Bookkeeper's Office (staff only -- nobody in it, and students can
  never go in), Cafeteria, Dance & Drama (around the corner from the
  cafeteria), the two purple exterior doors, stairs up + down.
- **Top floor**: classrooms 214–235 around the ring hallway; 200, 201, 205, 212,
  213 and the Library/Media Arts in the inner core; four stairwells down.
- **Lower floor** (`basement` internally): Basketball Gym (with the big red stage
  curtain) and the Music Room.

## Map editor (the easy way to assign teachers)

Open **`mapeditor.html`** in Chrome (e.g. `http://localhost:8123/mapeditor.html`).
It shows all three floors as one big map with a green block for every room — just
type each teacher's name into their room:

- Names **save automatically in that browser** and the game (opened from the same
  address) uses them immediately.
- When you're done, click **COPY LIST** at the bottom and paste the list to Claude
  to have the names written permanently into `js/teachers.js` (so they work for
  everyone, not just your browser).
- **RESET ALL TO PLACEHOLDERS** clears everything you typed.

## Letter encounters

Sometimes a letter-holding teacher says the eagle **hid the letter somewhere in
the room** instead of handing it over. Walk around — within a few paces the
screen flashes and spins, `lettermusic.mp3` kicks in, and a giant golden letter
appears RPG-battle style. The teacher fires the quiz ("Quick... what does the
letter S stand for in the SOAR expectations?!"); wrong answers re-ask, the right
answer captures the letter.

## Room editor (WYSIWYG)

Open **`roomeditor.html`** (http://localhost:8123/roomeditor.html) to redesign any
room by painting tiles:

- Click a teacher's name on the left → their room appears.
- Pick a tile from the palette (floors, walls, whiteboards, desks, plants, the
  Door/Exit tile...) and click/drag to paint. Right-click a tile to copy it
  (eyedropper). The teacher-sprite button moves the teacher.
- Changes appear **live in the game** if it's open in another tab — even while
  standing in the room.
- **SAVE** writes everything into `js/room-overrides.js` (requires
  `python3 serve.py` to be running) so the layouts are part of the game's code
  and work when hosted. Without the server it downloads the file for you to
  drop into `js/` yourself.
- REVERT buttons restore the original layouts (save afterwards to make the
  revert permanent).
- A red warning appears if a room has no door — don't trap the students! (It also
  warns if walls block the path to a door or the teacher.)

**Editor v2 tools**: BRUSH / FILL / RECT modes (keys B, F, R), brush sizes 1–3×,
UNDO/REDO (Ctrl+Z / Ctrl+Shift+Z), one-click furniture **stamps** (teacher desk,
piano, couch, kidney table...), COPY LAYOUT from any room, tabbed color-coded
palette with hover previews, and a **DOWNLOAD BACKUP** button (drag the file back
onto the editor to restore everything).

**Doors & new rooms**: the "DOOR LEADS TO" dropdown makes any painted door go to
any room or hallway — or pick **+ NEW ROOM** to invent a brand-new room with its
own teacher on the spot (its exit leads back to wherever the entrance is).
Custom rooms can be deleted with DELETE THIS ROOM. Every door shows a gold label
saying where it leads. SAVE also writes a safety copy to `js/room-overrides.bak`.

## Editing the teachers by hand (the important part!)

Everything about teachers lives in **`js/teachers.js`**, keyed by room:

```js
T['t-218'] = auto('t-218', 'Mr. Jenkins');   // placeholder
```

To put in a real teacher, replace the `auto(...)` call with a full entry:

```js
T['t-218'] = {
  name: 'Ms. RealName',
  sprite: {
    hair: '#3a2a1a',    // any hex color
    skin: '#e0a878',
    shirt: '#c43a3a',
    pants: '#3a3f45',
    style: 'long',      // 'short' | 'long' | 'bald'
    glasses: true
  },
  quirk: 'A fun line this teacher says!'
};
```

Room ids: `t-200` … `t-235` (classrooms), `t-lib` (library), `m-front`, `m-nurse`,
`m-todd`, `m-walker`, `m-eagles`, `m-caf`, `b-gym`, `b-music`.

Room display names (the banner when you walk in) are in `js/rooms.js`.

## Code map

| File | What's in it |
|---|---|
| `js/tiles.js` | procedural 16×16 tileset (floors, walls, doors, furniture) |
| `js/sprites.js` | pixel-art character sprite builder + Eddie the Eagle |
| `js/teachers.js` | **teacher roster — edit this for real teachers** |
| `js/rooms.js` | room registry (names + numbers) |
| `js/maps.js` | the three floor layouts + room interior templates |
| `js/dialogue.js` | FF6-style blue dialogue windows |
| `js/quest.js` | random S-O-A-R placement, hints, Mrs. Walker's ending |
| `js/audio.js` | per-floor mp3 themes + sound effects (chiptune fallback) |
| `js/input.js` | keyboard + touch controls |
| `js/main.js` | game loop, movement, room transitions, title/ending screens |

## Music

Each floor has its own looping theme, swapped automatically when you take the
stairs (rooms play their floor's theme; tracks resume where they left off):

| File | Plays on |
|---|---|
| `middlefloor-theme.mp3` | middle floor + its rooms (including dance & drama) |
| `topfloor-theme.mp3` | top floor + its rooms |
| `basement-theme.mp3` | lower floor, gym, music room |
| `lettermusic.mp3` | letter encounters (see below) |

To change a theme, just replace the mp3 file (keep the same name). If a file is
missing, the game falls back to a built-in chiptune.

No build step, no dependencies — plain HTML5 canvas + vanilla JS.
