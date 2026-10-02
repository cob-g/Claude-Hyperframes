# Plan format

`cs-plan.json` sits in the project folder. Every time is a whole frame at `fps`. File paths are
relative to the project and must stay inside it.

## Top level

| Field | Default | Meaning |
| --- | --- | --- |
| `title` | "Cutout strobe edit" | The page title and the heading of `DESIGN.md` |
| `fps` | 30 | 24, 25, or 30. The style is measured at 30 |
| `format` | `landscape` | `landscape` 1920x1080, `portrait` 1080x1920, `square` 1080x1080 |
| `seed` | 11 | Fixes the montage order and the per-still blur choices |
| `look` | | See below |
| `clips` | required | Named sources |
| `music` | none | The track |
| `sfx` | none | Effect files by kind |
| `timeline` | required | The items, in order |

## `look`

| Field | Default | Meaning |
| --- | --- | --- |
| `grade` | `steel` | `steel` (cool shadows, crushed blacks), `neon` (pushed colour), `soft` (for footage that is already graded), `none`, or `{ "filter": "<ffmpeg filter>" }` |
| `glow` | `#ffffff` | The halo round every cutout, or `false` for none |
| `montage.per` | 3 | Stills taken from each pool clip |
| `montage.gap` | 0.45 | Seconds between a clip's stills |
| `montage.blur` | `mix` | `mix` (two spins to one zoom), `spin`, `zoom`, `v`, `h` |
| `montage.tone` | `mix` | `mix` (seven in ten near grey), `dark` (all near grey), `color` |
| `montage.level` | 0.20 | Mean brightness every still is levelled to (colour stills sit 0.06 higher) |
| `montage.each` | 1 | Frames per montage picture: a number, or a list that repeats, such as `[1, 1, 2]` |
| `montage.pool` | every other clip | The default pool for walls that name none |

## `clips`

```json
"clips": {
  "wide": { "src": "assets/footage/wide.mp4", "in": 6.0 },
  "hands": "assets/footage/hands.mp4"
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `src` | required | The file |
| `in` | 0 | Seconds into the file where the clip starts. Also where its montage stills start |
| `crop` | none | `[x, y, w, h]` as fractions of the source frame, applied first (to cut a border out) |
| `grade` | `look.grade` | A grade for this clip alone |
| `exposure` | 1 | A gamma: 1.2 brightens, 0.85 darkens |

A source that is not the canvas's shape is scaled to cover it and cropped about its centre.

## `music`

| Field | Default | Meaning |
| --- | --- | --- |
| `file` | none | The track |
| `start` | 0 | Seconds into the file where the film starts. Take it from `bass-map.mjs` |
| `gain` | 1 | Linear gain before the mix |
| `gate` | `false` | `true`: under a step where the bass is still in, cut the bed's low end out. `"always"`: under every step |
| `gateHz` | 220 | The gate's high-pass corner |
| `fade` | 8 | Frames of fade-out at the end |

A step may also carry its own `gate`.

## `sfx`

```json
"sfx": {
  "hit": "assets/audio/hit.mp3",
  "tick": { "file": "assets/audio/tick.mp3", "db": -15 },
  "whip": "assets/audio/whoosh.mp3",
  "rise": "assets/audio/riser.mp3"
}
```

| Kind | Placed | Level |
| --- | --- | --- |
| `hit` | Its onset on each flash | -7 |
| `tick` | Its onset on each step hit (a silhouette is a quarter louder) and each blink | -13 |
| `whip` | Its loudest moment on each landing | -10 |
| `rise` | Its tail ending on the first frame of an item with `"rise"` | -15 |

A level (`db`) is the effect's loudest 10 ms against the bed's loudest 10 ms. `trim` skips
seconds at the head of the file; `len` keeps only that many seconds. A kind with no file is
silent, and the builder says so.

## Timeline items

Each item is a `wall`, a `shot`, or a `step`. Give its length as `frames`, or as `until` (the
frame it ends on, as printed by `bass-map.mjs`).

### `wall`

The shot, a window cut into it showing the montage, and the shot's subject cut out on top.

```json
{
  "wall": "wide",
  "until": 331,
  "window": { "shape": "circle", "from": 0.08, "to": 1.05 },
  "montage": ["low", "hands", "feet", { "clip": "stage", "tone": "color" }],
  "flash": [29],
  "label": "the disc grows to the whole frame"
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `wall` | required | The clip |
| `in` | the clip's `in` | Seconds into the file, for this use of the clip |
| `window` | `full` | A shape name, or the object below. `null` or `"none"` for no window |
| `montage` | `look.montage.pool` | Clip names, or `{ "clip", "per", "gap", "in", "tone", "blur" }` |
| `each` | `look.montage.each` | Frames per montage picture in this wall |
| `flash` | none | Frames inside the wall that flash: a number, a list, or `true` for frame 0 |
| `blink` | none | Frames where the subject is white for one frame |
| `enter` | `whip` after a step, else `cut` | `cut`, `whip`, or `flash` |
| `whip` | `zoom` after a step, else `v` | The smear: `zoom`, `spin`, `v`, `h` |
| `base` | `color` | `mono` turns the shot grey behind a subject that keeps its colour |
| `glow` | `look.glow` | A halo colour for this wall, or `false` |
| `rise` | none | `true` or a number of seconds: a riser ends on this wall's first frame |
| `label` | none | A note for the report; never drawn |

#### `window`

| Shape | Value | Default move | Other fields |
| --- | --- | --- | --- |
| `slit` | Height as a fraction of the frame. 1 is the whole frame | 1 to 0.05, fast then slow | `y`: its centre (0.5) |
| `blinds` | How much of the stack is open. Slats shut from the top | 1 to 0 | `count` (5), `fill` (0.62 of each slat's pitch) |
| `cross` | The bands' angle in degrees. 0 is one horizontal bar | 50 to 0 | `width` (0.22 of the height), `cx`, `cy` |
| `circle` | Radius as a fraction of the frame's height | 0.06 to 1.05 | `cx`, `cy` |
| `quad` | Growth from a corner panel (0) to the whole frame (1) | 0 to 1, slow then fast | `corner`: `tl`, `tr`, `bl`, `br` |
| `full` | none | holds | |

| Field | Meaning |
| --- | --- |
| `from`, `to` | The value on the wall's first frame and at the end of the move |
| `over` | Frames the move takes (default: the whole wall). The value holds after it |
| `ease` | `linear`, `expo` (fast then slow), `out`, `in` |
| `keys` | `[[frame, value], ...]` in place of `from` and `to`, for a move with a turn in it |
| `off` | The frame inside the wall where the window closes for good |

Set the window's centre (`y`, `cx`, `cy`) from the probe sheet so it sits behind the subject.

### `shot`

The clip alone, full frame. Use it for the calm after a flash and for the breakdown's run.

```json
{ "shot": "hands", "until": 230, "enter": "flash" }
```

It takes `in`, `enter`, `whip`, `flash`, `base`, `rise`, and `label` as a wall does.

### `step`

Brings the next item in over the previous one. It sits between two walls or shots. The previous
shot keeps playing under it (and its montage keeps strobing), and the next shot plays inside
the shapes.

```json
{ "step": "bars", "until": 173, "each": 4 }
```

| Field | Default | Meaning |
| --- | --- | --- |
| `step` | required | `bars`, `top`, `columns`, `circle`, or `hero` |
| `each` | 3 | Frames per hit. White shows on the first; the next shot shows on the rest. 5 sits on a 0.16 s pulse at 30 fps |
| `count` | as many as fit | The number of hits. Spare frames go before the first hit |
| `sizes` | by shape | A size per hit: the bar's height, the top band's height, or the disc's radius, as fractions of the frame's height |
| `y` | 0.5 | The bars' centre |
| `cx`, `cy`, `r` | 0.5, 0.5, 0.17 | The disc |
| `hero` | by shape | `false` keeps the next subject out of the step |
| `heroFrom` | by shape | The hit from which the white is the next subject's silhouette |
| `gate` | `music.gate` | Cut the bed's low end under this step |

| Shape | Hits |
| --- | --- |
| `bars` | A horizontal bar that grows; from the third hit, the next subject's silhouette standing out of the bar |
| `circle` | A disc; from the second hit, the silhouette standing out of the disc |
| `columns` | Columns left to right; each stays once it has landed, until the frame is covered |
| `top` | A band from the top edge that grows |
| `hero` | Only the next subject: white, then in colour, over the previous shot. Needs a wall next |

When the next item enters by `whip` (the default after a step), the step's last frame is the
whip's first.

## What the builder checks

- A step with the bass in for more than 35% of its frames: move it, or gate it.
- A landing more than 1.5 frames from where the bass comes in.
- A flash with no attack within 1.5 frames.
- A flash whose decay runs more than 3 frames into the step after it.
- A wall whose subject covers under 1.5% or over 70% of the frame.
- A clip that ends before its item does.
- Effects that sit less than 6 LU under the bed.
