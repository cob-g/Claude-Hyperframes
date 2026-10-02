# Cutting a music video to its own chorus

This is the method behind `video-projects/sulitin-edit`, a 30 s simplicity edit of a 4-minute
official music video. The video's own song is kept as the soundtrack, cut to the chorus.

## 1. Map the video

```sh
node .claude/skills/simplicity/scripts/mv-map.mjs assets/footage/mv.mp4 --chorus <a second inside a chorus> --out analysis/mv-map.json
```

- **Cuts:** every shot with frame-accurate boundaries and a `border` flag.
  - Detection runs inside the central 70% of the frame. A baked-in film-frame overlay or
    letterbox makes whole-frame detection miss about one cut in ten.
  - A `border` shot needs `"crop"`.
- **Chorus repeats:** every repeat of the chorus, with the `sync` value for shots taken from it.
  - True repeats score about 0.8; anything under 0.6 is left out.

## 2. Find the chorus and its bar lines

- **Section structure:** profile the song bar by bar. The chorus is the section whose vocals
  match across repeats (spectral similarity of about 0.8-0.97 between repeats, against 0.0-0.4
  between verses). Bass energy usually rises with it.
- **Beat grid:** `node .claude/skills/app-launch-reel/scripts/beat-grid.mjs <song>` gives a first
  tempo. Then measure real kick attacks and fit `music.grid` to them:
  - Low-pass at 90 Hz and use 2 ms blocks. An attack is a rise of more than 12 dB within about
    10 ms.
  - Energy-peak grids and windowed onset searches land late, on the 808's body.
  - For Sulitin they were 116 ms late. That put the cut into the chorus 3 frames after the real
    hit, and the dropout muted the hit. Fitting 77 kick attacks gave 91.995 BPM with the downbeat
    at 187.875 s, a median error of 6 ms.
  - Compute times from sample positions. A 2 ms hop rounded to 88 samples drifts 0.2 s over three
    minutes if you multiply the block count by 0.002.
- **Joins:** join two spans at the same position relative to the grid, so the beat carries
  straight through. Check that the phase matches on both sides; within 5 ms is fine. Crossfade
  20 ms.
- **Same bar position:** join between bars at the same position in their phrases, for example
  bar 7 into bar 15 of a 16-bar chorus.
- **Start on a whole line:** the first word the viewer hears must be the start of a phrase.
  Whisper cannot time non-English rap, so read the vocal band (250-3500 Hz) envelope instead: a
  phrase begins right after a dip of about 10 dB (the rapper's breath). Start in that dip, a few
  frames before the first word, and nudge the start by whole frames so the chorus's first kick
  still lands on a whole frame. Then lengthen the opening shot by the same number of frames, and
  every later shot keeps its song timing. The first cut of the Sulitin edit started mid-line
  ("…isipin na parte lang yan"). The user asked for the whole line ("wag mong isipin…"), and the
  fix was to start 13 frames earlier, in the breath at 179.616 s.
- **Ending:** stop the song on the chorus's last bar line and echo it out (`music.outro.echo`):
  - Five quarter-note repeats of the last beat, each at 0.6 of the one before, low-passed
    further each time and panned the other way.
  - Freeze the picture on the same frame and fade to black under the last repeats.

  A plain fade over the start of the outro sounded like a cut. In the Sulitin edit the dry song
  stops at 229.616 s (reel 29.11 s), the repeats ring to 31.7 s, and the film ends at 32.04 s.

The Sulitin cut runs as follows, 30.54 s in all:
- The verse's last line, from "wag mong isipin na parte lang yan alam mo", over the thin build as
  the song's own hi-hats drop out.
- The first 6 bars of the last chorus.
- The chorus's last 2 bars, and the beat stopping.

```json
"segments": [ { "from": 179.628, "to": 203.640 }, { "from": 224.515, "to": 231.0327 } ],
"grid": { "bpm": 91.995, "downbeat": 187.875 }, "xfade": 0.02, "drop": 198, "fade": 14
```

`music.start` or the first segment is chosen so the chorus's first kick lands on a whole frame
(here frame 198, from 179.628 s). The pre-drop cuts sit on sixteenths (49, 92, 116, 159), and the
tile build lands on frames 167-196 into the drop at 198.

## 3. Plan the shots on the video's own cuts

Turn each repeat's shots into reel frames: `frame = (mvTime - sync - segmentFrom) * fps + segmentAt * fps`.
A shot is safe on reel frames [round(start), round(end)).

- **Where to cut:** cut where a take's shot begins or ends, or on a half-bar inside one. The
  video's editor already cut to the beat, so its cuts are musical.
- **Crop consistency:** a plan shot may run across one of the video's cuts only when both sides
  share the same border state, because one crop applies to the whole plan shot.
- **Before the drop:** the verse is not repeated, so its shots are not lip-synced. Use wides,
  silhouettes, landscapes, or the verse's own performance at its real time (`"sync": 0`).
- **After the drop:** use synced performance from any chorus. Change takes on half-bars, and put
  a "synced take stutter" (two takes of the same line) on the chorus's quiet bar.
- **Check before building:** run the builder with `--probe`, then tile about 10 frames of every
  proxy (the first three, evenly spaced middles, and the last two). This catches one-frame
  flashes of a neighbouring shot, whip transitions, and burned-in credits before a render.

## 4. Look

- `"grade": "soft"` and `"exposure": false`. The video is already graded, and the reference's
  `cream` grade over-saturates it.
- `"crops": { "film": [...] }` is measured from the overlay's inner edge, then shrunk to 16:9.
  For the Sulitin overlay: `[0.1367, 0.1139, 0.7734, 0.7736]`.
- **Use the highest-resolution copy.** A crop scales the picture up. From a 720p source the
  Sulitin crop scaled 1.94x and looked soft; from the 1080p source it scales 1.29x. The builder
  adds a light luma unsharp mask to cropped shots (`film.sharpen`, default 0.4; 0 turns it off).
- **Swapping sources:** a new copy of the same video is usually frame-identical, but check before
  reusing the plan. Cross-correlate the audio (expect 0 ms), compare `mv-map` cut lists (expect a
  0-frame offset), and compare a builder-style seek against an old proxy frame. The Sulitin 1080p
  file matched on all three, even though its video stream starts at 0.0417 s.

## Rights

Keep the video's own song, unaltered except for the cut. Credit the artist and producer in the
film title's kickers. Publishing an edit of someone else's official video needs the rights
holder's permission; the user decides that.
