# Sound design

The picture in this style is all attack: hard edges, hard cuts, full-range flips. The sound is
the opposite: one loud, low, sustained track. The tutorial teaches no sound at all (its result
plays silent), so everything here comes from the 3.08 s of the creator's posted edit that play
under the reel's opening, and from what follows from them.

## What the reference does

- **One track, loud and flat.** It measures -9.0 LUFS integrated, with sample peaks at 0.0 dBFS
  and a crest factor of 7 dB.
- **A wall of sub bass.** 92% of its energy is below 150 Hz: 11% under 30 Hz, 60% at 30-60 Hz,
  and 22% at 60-150 Hz. The spectral peak is at 33 Hz. The band from 500 Hz to 2 kHz, where a
  voice would sit, holds 1.3%.
- **Nearly mono.** L/R correlation is 0.99.
- **A fast tick on top.** High-band onsets repeat every 0.1155 s: sixteenth notes at 130 BPM,
  8.7 a second. Peak-picking finds about 16 a second, so there are onsets between the sixteenths
  too.
- **The cut is not on the grid.** The picture changes every 4 frames (0.167 s) and the ticks
  come every 0.1155 s. They do not divide. But with a tick every 116 ms, no cut is more than
  58 ms (1.4 frames) from one, so every cut has a sound near it and the edit feels synced.
- **No effects are audible** in what plays. The track does all of it.

`track-fit.mjs` reads those 3 s as 87% bass and 15.9 ticks a second (its filters are gentler
than an FFT bin edge). Compare candidates against those two numbers, not the FFT ones.

## The rules the builder follows

1. **Pick the bed by measurement first, then by ear.**

   ```sh
   node .agents/skills/negative-strobe/scripts/track-fit.mjs assets/audio/*.mp3 --len 10 --fps 24
   ```

   Want "bass wall" (40% or more of the energy below 150 Hz) and "dense ticks" (6 or more a
   second above 4 kHz). A track with a thin low end cannot carry this cut, and the audit says so.
   A bass wall with sparse highs works if the `tick` and `buzz` effects supply the top.

   Dark trap, phonk, drill, techno, and tech house are where to look. Avoid a vocal: the style
   has no faces and no words, and a voice asks for both.
2. **Put the bursts on the grid.** The reference gets away with a frame-counted cut because its
   track ticks everywhere. A sparser track does not forgive it, so the skill locks to the beat:
   - `music.start` is a bar line, and `music.grid` gives the tempo and a downbeat.
   - An item with `"to": "bar"` (or `"beat"`) runs up to the line, so the burst after it starts
     on it.
   - A burst with `"on": "grid"` starts each clip on the frame nearest a sixteenth.

   The builder prints how far every hit sits from its sixteenth and warns past one frame.

   How a tempo sits on the frame grid:

   | Frame rate | Sixteenth = 2 frames | 3 frames | 4 frames |
   | --- | --- | --- | --- |
   | 24 fps | 180 BPM | 120 BPM | 90 BPM |
   | 25 fps | 187.5 BPM | 125 BPM | 93.75 BPM |
   | 30 fps | 225 BPM | 150 BPM | 112.5 BPM |

   At those tempos a three-piece clip is exactly one sixteenth. At any other tempo use
   `"on": "grid"`: the groups vary by a frame and the burst stays on the track.
3. **The grid is on the click, not the thump.** A kick's energy peaks tens of milliseconds
   after its attack. A beat tracker that follows energy puts the grid late, and a cut on a late
   grid looks early against the sound. `track-fit.mjs` refines the phase on the attack (the rise
   in log power). On the demo track that moved the grid 80 ms, two frames. Check a new track the
   same way before trusting any grid.
4. **Effects mark the picture and stay under the bed.**

   | Kind | Where | Level |
   | --- | --- | --- |
   | `hit` | The first frame of a burst, a card, and any picture after black | -10 |
   | `tick` | Every other clip change, and each clip inside a burst | -14 |
   | `flip` | A polarity flip inside a clip, on pieces of 2 frames or more | -16 |
   | `buzz` | A static bed under each run of one-frame pieces, cut dead at both ends | -22 |
   | `rise` | A riser's tail, ending on the first frame of a burst | -18 |

   A level is the effect's loudest 10 ms against the bed's loudest 10 ms, in dB, so a click and a
   thud are set by how loud they are and not by their peak sample. The builder warns when the
   effects stem sits less than 6 LU under the bed.

   For a pure music mix like the reference, use `"sfx": {}`.
5. **Black and silence go together.** `{ "black": 6, "mute": true }` stops the track for those
   frames. Use it once in the body at most, and at the end: the film stops dead on a muted black.
   There is no fade-out unless `music.fade` asks for one.
6. **Loudness:** -14 LUFS, peaks limited at 4x oversampling to -5 dBFS, so the AAC encode lands
   under -1 dBTP. The reference's -9 LUFS and clipped peaks are not something to copy; the
   platforms turn it down anyway.
   - The mix opens over 20 ms. A bed that starts at full level on its first sample made the
     renderer's AAC encoder overshoot to -0.4 dBTP on the demo, 12 ms in. With the 20 ms opening
     the same mix encodes between -2.5 and -4 dBTP.

## Sourcing

The user's standing rule is to use real, licensed tracks found in a browser and downloaded once
with provenance. Never synthesize music. Mixkit's "Stock Music Free License" allows web and
social video, and its "Sound Effects Free License" covers the effects. Download with:

```sh
node .agents/skills/ip-17-pro-style/scripts/fetch-audio.mjs <file-url> video-projects/<slug>/assets/audio/<name>.mp3 \
  --page "<page>" --license "<licence>" --license-url "<url>" --title "<title>" --artist "<artist>"
```

The demo's files, each with its `.provenance.json`:

| Role | Mixkit item | Measured |
| --- | --- | --- |
| Bed | Tech House vibes by Alejandro Magaña (A. M.), music 130 | 122 BPM, 75% bass and 10.3 ticks/s in the window used, -9.9 LUFS |
| `hit` | Cinematic sci fi glitch, sfx 1022 | 0.83 s, attack at 0.10 s, 71% bass |
| `tick` | Cool interface click tone, sfx 2568 | 0.20 s |
| `flip` | Camera shutter click, sfx 1133 | 0.35 s |
| `buzz` | Static electric glitch, sfx 2597 | 1.5 s of static |
| `rise` | Cinematic trailer riser, sfx 790 | 2.58 s, peak at 2.49 s |

The bed was chosen by its numbers: of sixteen Mixkit tracks scored, it had a bass wall, among
the densest ticks, and a tempo two points from a three-frame sixteenth. Its mood was not judged by
ear. Listen before using it for real work, and swap it for something darker if the brief wants
the reference's menace.

Do not use a commercial song you have no licence for.
