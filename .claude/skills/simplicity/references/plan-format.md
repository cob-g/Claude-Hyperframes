# simp-plan.json

Every time is a whole frame at `fps`. Paths are inside the project folder (symlinks are fine).
Start from [../templates/simp-plan.example.json](../templates/simp-plan.example.json).

```jsonc
{
  "title": "Echo",                      // the page <title>
  "fps": 24,                            // 24 (the reference), 25, or 30
  "settle": true,                       // plain cuts land at 103% and settle in 5 frames; false = dead-hard cuts

  "film": {
    "grade": "cream",                   // "cream" (reference), "soft" (already-graded footage), "clean", "none", or { "filter": "<ffmpeg vf>" }
    "exposure": "auto",                 // default for shots: "auto", a gamma number, or false (keep the source's grade)
    "sharpen": 0.4,                     // luma unsharp on cropped (upscaled) shots; 0 = off
    "crops": { "film": [0.137, 0.114, 0.773, 0.774] },  // named crops, [x, y, w, h] fractions of the source
    "crop": null,                       // default crop for every shot (a name or an array)
    "behind": true,                     // default for shots: the subject passes in front of the title
    "fadeOut": 30,                      // frames of fade to black at the very end (0 = none)
    "title": {
      "left":  { "kicker": "JUNE 13", "word": "BIRTHDAY" },
      "right": { "kicker": "DJI POCKET 3", "word": "VLOG" },
      "at": 1, "gap": 8, "color": "#ffffff", "dark": "#0a0a0a", "seed": 13
    }
  },

  "music": {
    "file": "assets/audio/song.mp3", "title": "Song name",
    "start": 46.524,                    // seconds into the file at frame 0
    // or cut the song to length on its bar lines (spans of the file, played back to back):
    // "segments": [ { "from": 179.616, "to": 203.640 }, { "from": 224.515, "to": 231.033 } ],
    // "xfade": 0.02,                   // seconds of crossfade at each join
    "grid": { "bpm": 91.995, "downbeat": 187.875 },  // the song's beat grid (file seconds), from kick attacks
    "drop": 200,                        // frame where the bass lands (for the energy check)
    "dropout": { "at": 194, "frames": 6 },   // optional mute before the drop; must end before its first kick
    "gain": 1, "fade": 6,               // fade = frames of fade-out at the very end (without an outro)
    "outro": { "echo": { "beats": 1, "source": 1, "taps": 5, "feedback": 0.6 } }
                                        // echo-out: the song stops at its end and its last `source` beats
                                        // repeat every `beats`, each tap x feedback, darker, and ping-ponged
  },
  "sfx": {                              // all optional; {} or omit for a music-only mix
    "shutter": "assets/audio/shutter.mp3",
    "click": "assets/audio/click.mp3",
    "pop": "assets/audio/pop.mp3",
    "swoosh": "assets/audio/swoosh.mp3",
    "sparkle": { "file": "assets/audio/chime.mp3", "len": 0.3, "gain": 0.3 },
    "tile": { "file": "assets/audio/click.mp3", "gain": 0.8 },   // grid tile build: one per tile, pitch climbing 12 semitones
    "riser": { "file": "assets/audio/riser.mp3", "gain": 0.9 }   // grid tile build: the file's tail ends on the cut
  },

  "shots": [ /* in order; see below */ ]
}
```

## Shots

A video shot:

```jsonc
{ "src": "assets/footage/wide.mp4", "in": 9.0, "frames": 20,
  "sync": 0,                                      // instead of "in": lip-sync to the song (below)
  "crop": "film",                                 // a film.crops name or [x, y, w, h]; false for none
  "label": "TITLE ANIMATION",                     // names the technique (documentation only, never drawn)
  "title": "light",                               // the film title's ink from this shot on: "light" | "dark" | "hide"
  "exposure": "auto",                             // "auto" | a gamma number (1.2 brighter, 0.9 darker) | false
  "behind": true,                                 // override film.behind for this shot
  "fx": [ ... ],
  "exit": "cut" }                                 // or an exit object, below
```

A burst of one-frame clips (stills, each `each` frames long):

```jsonc
{ "burst": [ { "src": "assets/footage/a.mp4", "in": 6.0 }, { "src": "...", "in": 60.0 } ],
  "each": 2, "label": "1 FRAME CLIPS" }
```

The shot's own length is `frames` (or `burst.length * each`). The reel's duration is the sum.

In points snap to whole source frames, so a shot that starts exactly on a source cut never
flashes the neighbouring shot for a frame.

### Lip sync and repeated choruses

`"sync": <seconds>` sets the shot's in point from the song instead of from `in`. The source time
becomes the song's time at the shot's first frame (through `music.start` or `music.segments`),
plus the offset.

- **Footage cut to the same song** (a music video with the song as `music.file`): `0` keeps every
  performance in sync.
- **A chorus that repeats:** each chorus's takes are in sync with every other chorus. Measure the
  offsets between the choruses by cross-correlating the audio. Then a shot from chorus 1 carries
  `"sync": -(chorus3 - chorus1)`. That gives the edit three synced takes of every line to cut
  between.
- **`stutter.with.sync`** does the same for the other take, so both takes of a "synced take
  stutter" stay on the words.

A synced shot that crosses a `segments` join drifts out of sync; the builder warns, so cut on the
join. Frame-accurate source cuts are worth listing before planning. Scene detection misses cuts
when a constant border covers the frame, so detect inside the border.

## Effects inside a shot (`fx`)

`at` is a frame offset from the shot's first frame. Any effect may carry `label` to name the
technique (documentation only).

| type | fields | What it does |
| --- | --- | --- |
| `glow` | `hops: [{ frames, gap, pick \| spot }]` or `count`, `each`, `gap` | The subject goes pure white with a bloom for a frame or two, hop after hop. By default every hop masks the frame with Apple Vision and hops through the subjects by size (`pick`: 1 = largest, `"all"`). For objects Vision merges together (plates on a table), give `spot: [cx, cy, w, h]` as fractions of the frame: a soft white disc. Use `--probe` to read coordinates |
| `stutter` | `frames`, `with: { in \| sync, src?, crop? }`, `settle: "b" \| "a"` | Frames alternate between this take and another (`with`) for `frames`, then settle on the other take (`b`) or back (`a`) |
| `teleport` | `frames`, `plate: { in, src? }`, `pattern`, `settle: "live" \| "plate"` | A locked shot flickers against a clean plate of the same framing (the subject blinks away). `pattern` like `"PPLPLLP"` (P = plate) |
| `freeze` | `sound` | Holds the frame from `at` to the end of the shot, with a shutter click |

## Exits (transition into the next shot)

```jsonc
"exit": { "type": "cutout", "frames": 3, "style": "white", "pick": "largest", "label": "CUT OUT TRANSITION" }
```

| type | fields | What it does |
| --- | --- | --- |
| `cut` | – | A hard cut (with the 5-frame settle unless `settle: false`) |
| `cutout` | `frames` (2-4), `style: "white"`, `pick` | The next shot's subject (its first frame, masked by Vision) appears in place over everything, the title included, for the last `frames` of this shot. `white` makes it a glowing silhouette |
| `tiles` | `frames` (about 18), `cols`, `rows`, `seed` | The next shot's first frame arrives as a mosaic of tiles in a seeded order, some flashing cream for a frame, coverage climbing to full by the cut |
| `tiles` + `"on": "grid"` | `cols`, `rows`, `seed` (no `frames`) | Beat-synced build (needs `music.grid`). The shot's end must sit on a beat, ideally the drop. With N tiles, one tile lands per step: thirty-seconds through the last beat, sixteenths before it. The build lasts about 2 beats for 12 tiles. Each landing flashes cream for a frame and cues a `tile` click pitched up to +12 semitones, with a `riser` ending on the cut. The builder warns if the cut is off the grid |
| `stutter` | `frames` (about 5) | The two shots alternate frame by frame for `frames`, then the cut |

An exit's frames come out of the end of the outgoing shot. The next shot must be a video shot.

## Labels

`label` on a shot, an effect, or an exit names the technique, for example "STUTTER EFFECT".
Labels are never drawn on the film. The builder lists them in its report, in
`simp/cues.json` (`techniques`), and in `DESIGN.md`, so every trick in the edit is documented.

## What the builder writes

- `index.html`: the 1920x1080 film with every clip, still, effect, the title, the audio, and the
  config.
- `simp/media/`: graded proxies (1920x1080, the plan's fps, a keyframe every half second), stills,
  Vision masks, and subject mattes (`remove-background` on a 1280x720 copy, cached).
- `simp/audio/mix.wav` and `stems/{bed,sfx}.wav`: the premix at -14 LUFS.
- `simp/cues.json`: cuts, techniques, and every sound cue with its source file.
- `DESIGN.md`: regenerated on every build.

The first build is slow: about 12 s per matte. Later builds reuse `simp/cache/manifest.json`.
