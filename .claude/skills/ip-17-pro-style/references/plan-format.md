# `ip-plan.json` format

`scripts/build-promo.mjs` is driven by one JSON file in the project root.

- File paths are relative to the project and must name a file inside it of the right type:
  - Models: `.glb` or `.gltf`.
  - Images: `.png`, `.jpg`, `.webp`, or `.svg`.
  - Audio: `.wav`, `.mp3`, `.m4a`, `.aac`, `.flac`, or `.ogg`.

  URLs, absolute paths, paths that leave the project, and missing files are errors.
- Times are seconds. Pixel values are canvas pixels.
- Everything except `copy` is optional. The defaults reproduce the reference ad.

```jsonc
{
  "title": "Nova 17 Pro",               // page title only
  "format": "landscape",                // "landscape" 1920x1080 (reference) | "portrait" 1080x1920
  "fps": 60,                            // whole number; written to the root as data-fps, so render defaults to it
  "hold": 1.333,                        // seconds of complete stillness before the reverse
  "exit": true,                         // false: no mirrored exit; the layout holds to the end, no lockup
  "duration": 8,                        // optional; rounded to whole frames; must leave 0.5 s still at the end

  "copy": [                             // top to bottom; first line defaults to "title"
    { "text": "Nova 17 Pro", "role": "title" },
    { "text": "Tomorrow is calling.", "role": "tagline" },
    { "text": "0% APR for 24 months" },                 // role "line" by default
    { "text": "from $49.99/mo.", "role": "price" },      // at most one; revealed by the highlight
    { "text": "FREE GIFT" },
    { "text": "Nova Buds Pro" }
  ],

  "products": [                         // one or two
    { "model": "phone", "finish": "orange" },           // front, flies in from below
    { "model": "phone", "finish": "silver" }            // behind, flies in from above
  ],

  "gift": { "model": "case" },          // the card's content; null removes the card

  "lockup": { "wordmark": "Nova" },     // false removes the end card

  "audio": {
    "music": "assets/audio/young-trizzy-02.mp3", "musicStart": 13.44,   // cut dead as the mark pops
    "stinger": "assets/audio/big-cinematic-impact.mp3", "stingerStart": 2.135   // on the lockup slide
  }
}
```

## `copy`

Each entry is a string or an object:

| Field | Meaning |
| --- | --- |
| `text` | The line. Keep the reference's shape: a product name, a short tagline, two or three offer lines. |
| `role` | `title` (78 px, 700), `tagline` (47.6 px, 500, `palette.tagline`), `line` (56.5 px, 700), or `price` (56.5 px, 700, white on the highlight). |
| `size`, `weight` | Override the role's size and weight (100-900). Sizes are at 1080p; portrait multiplies them by 1.2. |
| `color` | Per-line colour: hex, `rgb()`, `hsl()`, or a colour name. This does not apply to the price. |
| `advance` | Distance in canvas pixels from the previous baseline, replacing the measured table. |

Lines wider than the column (840 px landscape, 940 portrait) are shrunk to fit, with a warning.
The stack is centred vertically; landscape uses the left column, centred on x 570. Every line
except the price slides in from the left, one every 0.083 s.

## `products`

| Field | Meaning |
| --- | --- |
| `model` | `"phone"`: the procedural Pro-style phone. |
| `finish` | `orange`, `silver`, `blue`, `graphite`, or an object: `{ body, plateau, glass, screen, ring, roughness, plateauRoughness, glassRoughness, glassMetalness }`. |
| `src` | A local `.glb` or `.gltf` file used instead of `model`. Its buffers and textures must be embedded or sit next to it, with no Draco or Meshopt compression. See [products.md](products.md). |
| `orient` | `[rx, ry, rz]` degrees that turn a GLB so its back faces the camera and its top is up. The order is Y, then X, then Z. |
| `from` | `"top"` or `"bottom"`: the edge it flies in from. |
| `x`, `y`, `h` | Centre and height in canvas pixels at rest. |
| `z` | Depth in pixels; negative is further away, and the resting size is kept. |
| `rx`, `ry`, `rz` | Rest angles in degrees. `ry` positive turns the left (power-button) edge toward camera. |
| `spin` | Degrees of spin during the fly-in (360). |
| `at` | Start time of the fly-in (0). |
| `layout` | Same fields again: an override block, for readability. |

Each product must end up with numeric `x`, `y`, and `h`, and `from` set to `top` or `bottom`.
Otherwise the builder stops.

Default slots are the measured reference positions:

| Format | Front product | Back product | Single product |
| --- | --- | --- | --- |
| Landscape | (1221, 504), h 785, ry 30 | (1545, 601), h 770, z -260, ry 36 | (1380, 540), h 820 |
| Portrait | (420, 1440), h 760 | (700, 1500), h 745 | (540, 1460), h 800 |

## `gift`

Pick one of these:

- `{ "model": "case", "finish": { "body": "#f2f2f0" }, "rx": 16, "ry": -20 }`: a procedural open
  earbuds case.
- `{ "image": "assets/gift.png" }`: a transparent PNG that pops with the card, without a spin.
- `{ "src": "assets/models/gift.glb", "orient": [0, 0, 0] }`: your own model.
- `null`: no card at all.

The settle time counts the gift's pop (it lands five frames after the card) and its spin, so the
hold that follows is always completely still.

## `lockup`

| Field | Meaning |
| --- | --- |
| `wordmark` | Text that slides out from behind the mark (Inter 600). Leave it empty for a mark-only end card. |
| `mark` | A local SVG or PNG. Only use a mark you have rights to; the default is a placeholder monogram. An SVG is inlined; use `fill="currentColor"` to take `palette.mark`. Its aspect comes from `viewBox`, or from numeric `width` and `height` when there is no viewBox. A PNG's aspect is read from the file. Any other format needs `markAspect`. |
| `markAspect` | Width divided by height. Overrides the detected aspect for any mark. |
| `markHeight` | Mark height in canvas pixels. The default is 137 px, or 171 px in portrait. |
| `wordSize` | Wordmark size in canvas pixels. The default is 0.7 x the mark height. |
| `offsetX` | Shifts the final lockup in pixels, within ±30% of the width; by default it is centred. A mark-only lockup pops at its shifted position. |

The mark is painted above the wordmark, and the word only shows right of the mark's edge, so it
slides out from behind the mark, even for outline logos. The gap and the word's travel scale with
the mark's height (34 px beside a 137 px mark), so wide logos keep a tight lockup. A lockup wider
than 86% of the frame is scaled down to fit, with a warning. An SVG may only reference `#ids`
and `data:` URIs.

`"lockup": false` and `"lockup": null` both remove the end card. The spot then ends 0.5 s after
the last product has left, on the empty stage.

`"exit": false` and a lockup cannot be combined: the lockup would pop on top of the held layout.
With `exit: false` the lockup is off by default, and an explicit `lockup` object is an error.

## `audio`

| Field | Meaning |
| --- | --- |
| `music` | The bed, levelled toward -14 LUFS with a -4.5 dBFS lookahead ceiling (so the AAC encode stays under -1 dBTP) and played at `musicVolume` 1, starting `musicStart` seconds into the file (skip the intro; `music-cue.mjs` suggests a value). With a lockup it is trimmed to `musicOut` (the pop + 0.04 s) with a `musicFade` of 0.06 s. Without one it runs to the end with a 0.25 s fade. The builder warns when the track is too short after `musicStart`. |
| `stinger` | The hit, levelled toward -16 LUFS with the same ceiling and played at `stingerVolume` 1, at `stingerAt` (slide start + 0.08 s) from `stingerStart` seconds into the file. A hit longer than the time left fades out over its last 0.3 s. Without a lockup it is skipped unless you set `stingerAt`. |
| `sfx` | `[{ "src", "at", "start", "volume" }]`. `at` is seconds (0 or more) or one of `products`, `card`, `exit`, `pop`, `slide`. `pop` and `slide` exist only with a lockup, and unknown names are errors. `start` skips into the file. `volume` is 0-1 (default 0.5). Sound effects get the same -4.5 dBFS ceiling. |

Audio that would start at or after the end of the spot is an error. Clips that overlap would add
their peaks past the ceiling. For example, a stinger placed with `stingerAt` under a bed that runs
to the end. The builder pre-mixes overlapping clips into one `ip/audio/mix.wav` behind the same
-4.5 dBFS limiter and says so.

The builder writes trimmed copies to `ip/audio/`. Find and download the files as described in
[music.md](music.md).

## Look and motion

| Field | Meaning |
| --- | --- |
| `palette` | `background`, `ink`, `tagline`, `highlight`, `priceInk`, `card`, `mark`, `word`. Values must be real colours: hex with 3, 4, 6, or 8 digits, `rgb()`/`hsl()`, or a CSS colour name. Finish colours follow the same rule. `background` must be hex or `rgb()`, because the audit measures blank frames against it. |
| `motionBlur` | `{ "samples": 10, "shutter": 0.5 }`. `shutter` is a fraction of a frame from 0 to 1 (0.5 = 180 degrees; 0 turns motion blur off). `samples` is the number of 3D sub-frames, from 1 to 64. |
| `camera` | `{ "fov": 20 }`: vertical field of view in degrees. |
| `look` | 3D lighting: `exposure`, `envIntensity`, `envRotation`, `envTop`, `envMid`, `envBottom`, `envBlur`, `key`, `rim`, `ambient`, and `softboxes` (`[{ az, el, w, h, intensity, color }]`). `env: "room"` switches to three.js RoomEnvironment. |
| `layout` | Overrides for the preset: `scale`, `cx`, `stackCenter`, `maxWidth`, `products` (the slots, merged element by element), `single`, `card` (`{ w, h, radius }`). |
| `timing` | Overrides for any measured value, merged by key. Values must be numbers, durations positive, and eases four numbers. For example, `{ "products": { "duration": 1.4 }, "copy": { "stagger": 0.1 } }`. The keys are `products`, `copy`, `pill`, `card`, `gift`, `lockup`, and `hold`, as defined at the top of `build-promo.mjs`. |
| `css` | Extra CSS for the page, such as brand fonts. It may not contain `<`. Every `url()` must be a `data:` URI or a file inside the project, such as `url(assets/fonts/brand.woff2)`. URLs (including CSS-escaped ones and `image-set()` strings), `//host`, and `@import` are rejected. Only name font families that are declared with `@font-face` (the kit's are "IP Montserrat" and "IP Inter"), because HyperFrames fetches undeclared families from Google Fonts. |

Timeline landmarks are derived from these values:

- Entrance end: the latest settle (2.183 s by default, when the gift lands).
- Mirror time: 2 x the entrance end + `hold`, snapped to a whole frame (5.70 s by default).
- Pop: mirror - 0.337 s.
- Slide: pop + 0.609 s.
- Without a lockup, the spot ends 0.5 s after the exit clears. The exit clears at the mirror
  minus the first moment anything is on screen, plus two frames; 5.97 s by default.
- The duration is rounded to whole frames. A spot always ends on at least 0.5 s of stillness,
  and a `duration` shorter than that is an error.

The builder prints the landmarks and writes them to `IP_CONFIG.markers` in `index.html`.
