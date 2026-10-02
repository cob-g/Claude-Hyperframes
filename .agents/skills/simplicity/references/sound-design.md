# Sound design

The reference's soundtrack is a song and almost nothing else. It sounds expensive because the
song is chosen and cut against the picture, not because effects are layered on top.

## What the reference does

- **One licensed vocal track, loud and flat.** It measures -13.9 LUFS integrated, 0.7 LU of
  loudness range, and a true peak that clips on the upload. It is nearly mono (L/R correlation
  0.96), and its energy sits in the low mids.
- **The energy passes between picture and music.**
  - The first 6.5 s are verse over hats with no kick. The edit is at its busiest there: one-frame
    clips, glows, stutters, and cutouts.
  - At 6.4 s the highs drop 40-48 dB for about five frames, a breath.
  - At 7.3 s the 808 and the kick land on the hook ("sometimes we laugh, and sometimes we cry").
    The edit calms to long locked shots and a single gag (the teleport).
- **Added effects are nearly absent.** The high-band onsets that line up with cuts are the
  song's own hats.

## The rules the builder follows

1. **Pick a song with a drop 7-9 s into the cut.** The verse carries the dense opening, and the
   drop carries the calm payoff. Measure the drop with
   `node .agents/skills/app-launch-reel/scripts/beat-grid.mjs <song> --hit <drop-seconds>`, then
   set `music.start` so the file's drop lands on `music.drop / fps`.
2. **Breathe before the drop, but only where the song does not.** Most songs already pull out
   before the drop. `music.dropout` adds a breath for a song that does not. It must end before
   the drop's first kick attack, never on the drop's first frame.
   - Measure the attack from the sub band (<90 Hz). Energy peaks and beat trackers place it late.
   - The first Sulitin mix muted 4 frames that held the chorus's first 808 hit, and the user
     heard it as an off cut.
3. **Effects stay tiny and optional.** Every picture event has a transient 10-14 dB under the
   song, and its onset is aligned to the frame:

   | Kind | Where | Default gain |
   | --- | --- | --- |
   | `shutter` | Each one-frame clip, each freeze | 0.6 |
   | `click` | Each stutter or teleport flip, the tile build | 0.45 |
   | `pop` | Each cutout | 0.75 |
   | `swoosh` | Each title block, each tile run | 0.55 |
   | `sparkle` | Each glow hop (keep `len` about 0.3 s) | 0.4 |

   For a pure music mix like the reference, use `"sfx": {}`.

   A beat-synced tile build (`"on": "grid"`) adds a crescendo:
   - **`tile`:** a crisp click on each tile, pitched from 0 to +12 semitones, with its gain rising
     from 0.55 to 1.
   - **`riser`:** the last 1.5 s of a riser, ending on the cut.

   In the Sulitin edit the build climbs from about 18 dB to about 7 dB under the song, then cuts
   clean into the drop.
4. **Loudness:** -14 LUFS, peaks limited at 4x oversampling to -5 dBFS, so the AAC encode lands
   under -1 dBTP. The reference's clipping is not something to copy.

## Sourcing

The user's standing rule is to use real, licensed tracks found in a browser and downloaded
once with provenance. Never synthesize music. Mixkit's "Stock Music Free License" allows web
and social video. Download with:

```sh
node .agents/skills/ip-17-pro-style/scripts/fetch-audio.mjs <file-url> video-projects/<slug>/assets/audio/<name>.mp3 \
  --page "<page>" --license "<licence>" --license-url "<url>" --title "<title>" --artist "<artist>"
```

The demo reused files already downloaded for earlier projects, each with its `.provenance.json`:

| Role | Mixkit item | File |
| --- | --- | --- |
| Song (trap, 140 BPM, drop at 54.857 s) | Young Trizzy 02 by Arulo, music 431 | young-trizzy-02.mp3 |
| shutter | Camera shutter click, sfx 1133 | shutter.mp3 |
| click | Cool interface click tone, sfx 2568 | ui-click.mp3 |
| pop | Explainer video pops whoosh light pop, sfx 3005 | pop-whoosh.mp3 |
| swoosh | Fast transitions swoosh, sfx 3115 | swoosh-fast.mp3 |
| sparkle | Magic notification ring, sfx 2344 (first 0.3 s) | shimmer.mp3 |

A vocal track ("Laugh Now Cry Later" in the reference) gives the lyric sync its punch. A
licensed instrumental works when it has a clear verse-to-drop change. Do not use a commercial
song you have no licence for.
