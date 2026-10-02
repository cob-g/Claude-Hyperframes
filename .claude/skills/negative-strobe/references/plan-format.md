# ns-plan.json

Every time is a whole frame at `fps`. Paths are inside the project folder (symlinks are fine).
Start from [../templates/ns-plan.example.json](../templates/ns-plan.example.json).

```jsonc
{
  "title": "Night run",                 // the page <title>
  "fps": 24,                            // 24 (the reference), 25, or 30
  "format": "portrait",                 // "portrait" 1080x1920, "landscape" 1920x1080, "square" 1080x1080

  "look": {
    "grade": "ink",                     // the default grade for P and N: "ink", "stamp", or "soft"
    "grain": 9,                         // luma noise before the curve (0 = off, 20 = heavy)
    "seed": 7,                          // the grain pattern
    "blur": 16,                         // the starting blur of "blurIn", in px at the canvas size
    "bands": { "ink": 0.3 }             // override a band width (see "Grades")
  },

  "clips": {
    "runner": {
      "src": "assets/footage/runner.mp4",
      "in": 4.0,                        // seconds: frame 0 of this clip
      "focus": [0.44, 0.47],            // the subject's position in the source frame, x and y, 0-1
      "zoom": 1.5,                      // extra scale on top of filling the canvas (1 = none)
      "crop": [0, 0.1, 1, 0.8],         // optional [x, y, w, h] of the source, applied first
      "pivot": "auto",                  // "auto" or the luma (0-1) that lands on mid grey
      "bias": -0.05,                    // added to the pivot: negative = more white, positive = more black
      "grade": "stamp"                  // optional default grade for this clip
    }
  },

  "music": {
    "file": "assets/audio/bed.mp3", "title": "Track name",
    "start": 33.984,                    // seconds into the file at frame 0
    "grid": { "bpm": 122, "downbeat": 0.542, "beats": 4 },  // the beat grid in file seconds, from track-fit.mjs
    "gain": 1,
    "fade": 0                           // frames of fade-out at the very end (0 = stop dead)
  },
  "sfx": {                              // all optional; {} or omit for a music-only mix
    "hit": "assets/audio/hit.mp3",
    "tick": "assets/audio/tick.mp3",
    "flip": { "file": "assets/audio/shutter.mp3", "level": -18 },
    "buzz": { "file": "assets/audio/static.mp3", "trim": 0.05 },
    "rise": { "file": "assets/audio/riser.mp3", "len": 1.5, "gain": 0.8 }
  },

  "timeline": [ /* in order; see below */ ]
}
```

## Clips

A clip is a source file and an in point. The plan addresses it in frames after that in point
(`at`), at the plan's frame rate, whatever the source's rate.

- **`focus`** is where the subject sits in the source frame. The crop keeps that point at the
  same place on the canvas, and every `punch` zooms about it, so a stepped zoom walks in on the
  subject. Read it off `ns/probe/<clip>-frame.png`.
- **`pivot`** places the curve. Below it is ink, above it is paper. `"auto"` is Otsu's threshold
  over the frames the timeline uses, which finds the gap between a dark shape and a light ground.
  It fails when the subject is not the darkest or lightest thing in frame (a texture under a
  strip of sky): the builder warns that the clip comes out flat, and `ns/probe/<clip>.png` shows
  three pivots to choose from. The auto pivot follows the frames in use, so it can move when the
  timeline changes. Pin it with a number once it looks right.
- **Each clip keeps a cursor.** An item without `at` continues from where the clip's last item
  stopped. An item with `at` jumps there.

## Grades

One curve, three widths. The band is the share of the tonal range the curve spends getting from
black to white, centred on the pivot.

| Grade | Band | Looks like | Use for |
| --- | --- | --- | --- |
| `stamp` | 0.06 | A stencil: two tones, speckled edges | Textures, marks, low-contrast footage, the hardest flash |
| `ink` | 0.30 | The reference: blown whites, crushed blacks, a little tone in between | Everything, by default |
| `soft` | 0.80 | A plain black-and-white frame | The grey breath, one piece at a time |

## Patterns

A pattern is a string with one letter per piece.

| Letter | Piece |
| --- | --- |
| `P` | Positive, in the item's grade |
| `N` | Negative, in the item's grade |
| `T` / `t` | Stamp, positive / negative |
| `G` / `g` | Soft (grey), positive / negative |
| `K` | A black frame (the clip does not advance) |
| `W` | A white frame (the clip does not advance) |

## Timeline items

### A clip

```jsonc
{ "clip": "runner", "pattern": "PNP", "each": 4, "step": 3, "at": 18,
  "grade": "ink", "punch": 0.06, "label": "the stride" }
```

- `pattern`: default `"P"`.
- `each`: frames per piece. A number, or a list with one entry per piece (`[2, 2, 4]`; the last
  entry repeats). Default 1.
- `step`: source frames between pieces. 3 is the reference's "keep one, drop two". 1 is real
  time. 0 freezes on one frame. Default 3.
- `at`: frames after the clip's in point. Omit it to continue from the clip's cursor.
- `frames`: instead of counting letters, cycle the pattern to fill this many frames.
  `{ "clip": "runner", "frames": 24, "step": 1 }` plays one second live, in ink.
- `grade`: the grade for `P` and `N` in this item. Falls back to the clip's, then `look.grade`.
- `punch`: a stepped zoom. A number adds that much scale per piece (0.06: 1, 1.06, 1.12). A list
  gives each piece's scale (`[1, 1.2, 1.5]`; the last repeats).
- `shift`: a stepped reframe: a list of `[x, y]` per piece, in percent of the canvas. The scale
  rises to cover the move.
- `blur`: a number (px, every piece) or a list per piece. `blurIn: 2` starts two pieces soft and
  steps them to sharp.
- `to`: `"16th"`, `"8th"`, `"beat"`, or `"bar"`. The pattern keeps cycling until the next grid
  line, so the following item starts on it. Needs `music.grid`. With `"step": 0` it is a freeze
  to the line; with a step it is a stutter to the line.
- `rise`: `true` ends a `rise` sound on the item's first frame.
- `cue`: `"hit"` or `"tick"` overrides the sound on the item's first frame. `sound: false`
  silences the item.
- `label`: a note for the build report. Nothing is drawn.

### A burst

```jsonc
{ "burst": ["cloth", "runner", { "clip": "logo", "grade": "stamp", "pieces": 5 }, "runner"],
  "pieces": 3, "step": 3, "pattern": "PN", "on": "grid", "div": 4, "rise": true }
```

Each clip in the list gives `pieces` one-frame pieces, `step` source frames apart, cycling
`pattern`. A list entry can be a clip name or an object that overrides `pieces`, `step`, `at`,
`pattern`, `grade`, `punch`, `shift`, or `blur` for that clip. Naming a clip twice brings it back
with the action further on.

With `"on": "grid"` each clip starts on the whole frame nearest a grid step (`div` steps per
beat; 4 = sixteenths), and its pieces fill the frames up to the next step. Group sizes then vary
by a frame (3, 3, 2, 3 at 122 BPM) and the burst stays on the track. It ignores `pieces`.

### Black and white

```jsonc
{ "black": 2 }
{ "black": 6, "mute": true }   // the track is silent for these frames
{ "white": 1 }
```

### A card

```jsonc
{ "card": "NIGHT\nRUN", "sub": "out friday", "pattern": "PNP", "each": [2, 2, 12], "to": "bar" }
```

One or two words, upper-cased, black on white (`P`) or white on black (`N`). `K` and `W` work in
the pattern too. `size` sets the type size in px; by default the longest line is fitted to 84% of
the width. `to` holds the last piece to the grid line.

## Sound

Cues are placed by the builder, not the plan:

| Kind | Where | Default level |
| --- | --- | --- |
| `hit` | The first frame of a burst, a card, and any picture that follows black or white | -10 |
| `tick` | Every other clip change, and each clip inside a burst | -14 |
| `flip` | A change of polarity or grade inside an item, when both pieces last 2 frames or more | -16 |
| `buzz` | Under every run of 6 or more one-frame pieces, cut dead at both ends | -22 |
| `rise` | Ends on the first frame of an item marked `"rise": true` | -18 |

A level is the effect's loudest 10 ms against the bed's loudest 10 ms, in dB. Each `sfx` entry
is a path or `{ file, level, gain, trim, len }`:

- `level` replaces the default.
- `gain` multiplies on top of it.
- `trim` skips the head of the file, in seconds.
- `len` keeps only that many seconds.

A sound's onset (the first moment it reaches a tenth of its peak) is placed on the cue's frame.

## What the builder writes

- `index.html`: one element per still, one switch on and one switch off per piece.
- `ns/media/`: the stills, named `<clip>-<frame>-<grade><p|n>` plus any blur, zoom, or shift.
- `ns/audio/mix.wav`, with `stems/bed.wav` and `stems/sfx.wav`.
- `ns/cues.json`: every state (frame, length, clip, grade, polarity, file), the items, the pace,
  and every placed sound. The audit reads it.
- `DESIGN.md`: the project's design record, regenerated on every build.
