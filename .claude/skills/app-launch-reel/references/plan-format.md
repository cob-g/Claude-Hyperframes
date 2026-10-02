# Plan format (`alr-plan.json`)

The plan lives in the project folder. Start from
[../templates/alr-plan.example.json](../templates/alr-plan.example.json). Every path is relative
to the project and must stay inside it; URLs are rejected. Rebuild after every change.

## Top level

| Field | Required | Meaning |
| --- | --- | --- |
| `title` | no | The page title |
| `format` | no | `"landscape"` (1920x1080, the reference) or `"portrait"` (1080x1920; split frames stack copy above the device) |
| `fps` | no | Default 30 |
| `brand` | yes | See below |
| `palette` | no | Colour overrides, `#rrggbb` only |
| `hud` | no | `false` removes the HUD; `{ "top": false }` drops the brand and chapter labels, and `{ "bottom": false }` drops the timecode and progress bar |
| `music` | no | The bed; without it the reel has only sfx, or is silent |
| `sfx` | no | Map of cue kind to file (see [sound-design.md](sound-design.md)) |
| `voice` | no | A voiceover, one file per line (see below) |
| `scenes` | yes | The ordered frames |

## brand

| Field | Meaning |
| --- | --- |
| `name` | Wordmark text, also shown in the HUD |
| `badge` | Optional boxed tag after the wordmark, for example `"AI"` |
| `reel` | HUD label after the name (default "Motion reel") |
| `tagline` | End card line |
| `url` | End card pill; use your real domain, or `something.example` in templates |
| `cta` | Optional second, solid end-card pill, for example `"Book a demo"` |
| `mark` | `"check"`, `"ring"`, `"bars"`, `"spark"`, a project SVG whose `<path d>` elements are drawn as strokes, or the brand's own logo image |

A custom SVG mark should be a stroke drawing: a few `<path>` elements, a numeric `viewBox`, and
no fills, text, or images.

A logo image is `{ "image": "assets/brand/mark-white.png", "imageOnLight": "assets/brand/mark-black.png" }`
(or just the path). Use a transparent PNG. The light-background version is used on paper
frames; the box keeps the PNG's aspect ratio. Image marks are revealed, not drawn.

## palette

Keys: `ink`, `glow`, `brand`, `brand2`, `paper`, `haze`, `violet`, `violetEdge`, `night`,
`black`, `soft`, `accent`, `success`. The defaults are the reference's measured values. Swap
`brand`/`brand2` for the product's colour and keep `accent` warm and rare.

For a black-and-white brand, set `"palette": { "mono": true }`. Only colour changes; the motion
is identical.
- The mid tone becomes graphite (#48484c to #1c1c1e) and every glow turns grey.
- Second lines and emphasis turn grey.
- On light frames the underline, buttons, hero card, approved row, and assistant bubbles turn
  black. On dark frames the checks, live pills, and highlighted bars turn white.
- Confetti is greyscale.
- Also set the plan's own icon `color`s to black (#1c1c1e) on light UI and white on dark cards.
- Re-tone scenes so black and white alternate. Keep graphite for the frames between a black and
  a white one.
- Put a black end card on `ink`, not `black`: pure black reads as black frames to the audit.

## music

| Field | Meaning |
| --- | --- |
| `file` | The bed (mp3, wav, m4a...) |
| `bpm` | Tempo; the whole grid is built from it (80-170; aim for 118-124) |
| `start` | Track time at reel time 0. `beat-grid.mjs --hit <hit>` prints it for each drop |
| `gain` | Bed level under the sound design, default 0.5 |
| `lift` | Multiplier after the manifesto drop, default 3.2 |
| `gap` | Seconds of bed silence before the drop, default half a beat; `false` for none |
| `swell` | `false` to start the bed at full level instead of swelling into the hit |
| `fade` | Seconds the bed takes to die away under the end card, default 1.3; about 2.5 for a longer end card |

For a minute-long reel, cue the bed so its own sections land on chapters. `beat-grid.mjs` lists
every drop; profile the bars in between to find the breakdown. Raise `gain` (0.7) so the music
carries the first act, and lower `lift` (2.0).

## voice

```json
"voice": {
  "level": -12, "duck": 3.5, "duckSfx": 2,
  "lines": [
    { "file": "assets/vo/01.wav", "scene": 1, "beat": 3, "text": "Meet EduSphere AI." },
    { "file": "assets/vo/22.wav", "scene": 19, "beat": 0, "gain": 1.4, "text": "One platform." }
  ]
}
```

- **Placement:** each line's first syllable lands on `beat` beats after the cut of `scene` (a
  1-based number or a scene id). Use `at` for an absolute time instead. Lines follow the
  retimed scenes automatically.
- **Level:** every line is levelled to `level` LUFS (pre-mix, default -12) times its `gain`.
  Trailing silence is trimmed.
- **Ducking:** `duck` is the sidechain compression ratio on the bed under speech (default 6;
  3.5 is about 6-8 dB). `duckSfx` is the ratio on the effects (default 2).
- **Warnings:** the builder warns when a line runs into the next one, or past the last 0.3 s.
- **Stems:** `alr/audio/stems/voice.wav` is written for the audit.


`{ "whoosh": "assets/audio/sfx/whoosh.mp3", ... }` or, per kind,
`{ "file": "...", "gain": 0.8, "trim": 0.1, "peak": 0.42 }`.

- `trim` skips the head of the file.
- `peak` overrides the detected loudest point (seconds into the file).
- Kinds: `whoosh`, `pop`, `tap`, `type`, `riser`, `impact`, `success`, `scan`, `shimmer`. A
  missing kind leaves its cues silent, with a warning.

## scenes

Every scene has these fields:

| Field | Meaning |
| --- | --- |
| `type` | `identity`, `statement`, `product`, `scan`, `widget`, `stack`, `lines`, `manifesto`, `endcard`, or the long-reel types `modules`, `metric`, `dashboard`, `chat`, `matrix`, `burst` |
| `beats` | Length in beats; whole or half beats. The reference is 4, 3, 8, 2, 2, 2, 2, 3, 4 = 30 beats = 15 s at 120 |
| `chapter` | HUD chapter name; later scenes inherit it until a new one is set |
| `tone` | Override the background: `ink`, `brand`, `paper`, `violet`, `night`, `black` |
| `exit` | Override the transition out: `whip`, `pixel`, `iris`, `focus`, `cut` |
| `id` | Optional stable id |

Text conventions:

- Titles are arrays of lines; the builder never inserts `<br>`.
- `*word*` or `*two words*` marks emphasis: tinted on dark and paper, underlined in a
  statement.
- A whole line in `~tildes~` is a secondary line in the soft colour.

### identity

`hitBeat` (default 2): the beat of the opening hit.

### statement

`eyebrow`, `title` (one or two lines), `ticker` (strings for the ghost numerals), `circle`
(the ticker entry to circle).

### product

- `copy`: one block, or an array of blocks for `swap` steps. Each block has `eyebrow`,
  `title` (lines), and `sub`.
- `app`:
  - `title` and `subtitle`.
  - `currency` (default `$`) and `decimals` (default 2).
  - `hero`: `{ label, badge, value? }`. `value` defaults to the sum of the rows.
  - `rows`: up to 5 rows, each `{ icon, color, title, meta, metaColor?, value }`.
- `steps`, each with `at` in beats from the cut:
  - `{ "do": "add", "at": 2, "index": 0, "row": {...}, "fields": ["Design tools", "12.00"], "chips": [...], "labels": [...], "sheetTitle": "...", "button": "Save" }`.
    `fields` defaults to the row's title and value.
  - `{ "do": "swap", "at": 5 }` moves to the next copy block.
  - `{ "do": "complete", "at": 5.5, "row": "Gym", "label": "Cancelled", "toast": "Saved $39.00 a month" }`.
  - `delta` on an `add` or `complete` step moves the hero counter by that amount instead of the
    row's value, for a count (`"delta": 1`) rather than a price. Row `value`s can then be
    strings such as `"10 min"`.
- `app.decimals` also formats numeric row values; use `0` and `currency: ""` for counts.

Row icons: `home`, `bolt`, `play`, `cloud`, `music`, `dumbbell`, `wifi`, `card`, `cart`, `pen`,
`bell`, `doc`, `lock`, `offline`, `block`, `globe`, `check`, `star`, `pin`, `chart`, `spark`,
`mic`, `users`, `book`, `shield`, `calendar`, `clock`, `grid`, `upload`, `question`, `wallet`,
`cap`.

### scan

- `copy`: one block.
- `doc`: `{ vendor, fields: [{ label, value }] }`, with two fields.
- `tags`: `[[label, value], ...]`, with two tags.

### widget

- `copy`: one block.
- `widget`: `{ title, count, rows: [{ title, meta, value }] }`, with two rows.

### stack

- `title` (lines).
- `cards`: row objects, up to 4.
- `flip`: in beats (default 0.92); `false` for no theme flip. Without a flip, a dark or mid
  `tone` shows the dark cards.
- `currency` and `decimals`.

### lines

- `eyebrow`: a string, or an array joined with middle dots.
- `lines`: up to 5 strings.

### manifesto

- `title`: two lines, the last in `~soft~`. Use three when the second line is too wide at
  138 px; each line lands one beat after the last.
- `sub`.
- `pills`: up to 3, each `{ icon, text }`.

### endcard

No fields; it uses `brand` (mark, name, badge, tagline, url, cta).

### modules

- `eyebrow` and `title` (one line).
- `tiles`: up to 6 of `{ icon, color, title, meta }`.
- `merge`: the beat at which the tiles converge (default 4). Leave at least a second after it.
- `card`: `{ title?, sub?, chips? }`. The title defaults to the brand name and badge, and the
  chips default to the tile titles.

### metric

- `eyebrow`.
- `value` (a number), plus `from`, `prefix`, `suffix`, and `decimals`.
- `label`: one short line.
- `bars` (heights 0-1) or `progress` (0-1). A `%` suffix without bars fills to the value.

### dashboard

- `copy`: one block.
- `window`:
  - `title`.
  - `tiles`: up to 4 of `{ label, value, from?, prefix?, suffix?, decimals?, delta? }`.
  - `chart`: `{ label, note, bars: [0-1, ...] }`.

### chat

- `eyebrow`.
- `avatar`: `{ video | image, name, meta, meta2 }`. `video` is a silent clip in the project, at
  least as long as the scene minus about 0.6 s. It plays over the card's 488x610 slot.
- `messages`, each with `at` in beats:
  - `{ from: "user", label, text, at }` types in.
  - `{ from: "ai", label, text, at }` follows typing dots.
  - `{ from: "figure", kind: "triangle", label, at }` draws.
  - Add `beside: true` to put an item on the same row as the one before it.
- `chips`: `[{ icon, text }]`, popping at `chipsAt` beats.

### matrix

- `copy`: one block.
- `table`:
  - `title`, `badge`, and `cols` (up to 5).
  - `rows`: up to 5 of `{ label, cells }`, where each cell is `true` (full), `"view"`, or `0`.
  - `footer` and `footerIcon`.
  - `legend: false` hides the legend; `fullLabel` and `viewLabel` rename its entries.

### burst

- `words`: one per beat. `each` sets beats per word (default 1); the words must fill the
  scene.
- `tones`: the background cycle, default `["brand", "paper", "ink"]`.
- `index: false` hides the `01 / 08` counter.
