# Sound design

In this style the track is the edit list. The picture does not decorate the music; it draws the
track's bass, on and off, frame for frame. So the sound work is mostly choosing a track with the
right shape and putting the film on it.

## What the reference does

Measured from the reel's 19.3 s of audio (see
[reference-breakdown.md](reference-breakdown.md) for the frame map):

- **One track, no voice.** A heavy instrumental: -14.1 LUFS, true peak -2.2 dBFS, 82% of its
  energy below 120 Hz, L/R correlation 0.94.
- **The bass plays in blocks and stops dead.** Six blocks of about 1.45 s, all at the same level
  (-10.9 dBFS RMS, within 0.1 dB), with 0.45 s rests in which the bass is 22 dB down. A block
  starts every 1.92 s.
- **An intro with no bass.** Four seconds of a tremolo build that rises 11 dB.
- **Three stabs before the drop**, each 0.1 s, with silence between.
- **A breakdown in the middle:** 2.1 s at 10 dB under the blocks.
- **Where the picture sits on it:**

  | Sound | Picture |
  | --- | --- |
  | The build | The montage clears as a slit closes |
  | Each stab | A white silhouette on its first frame |
  | Bass comes in | The landing: two smeared frames, then the wall |
  | Half a cycle in (29 frames), on an attack | The flash |
  | Bass stops | The step starts on the same frame |
  | A 0.16 s pulse in the rest | White hits every 5 frames |
  | The breakdown | A run of plain shots, 8 to 12 frames each |

## The rules the builder follows

1. **Pick the bed by its bass shape first, then by ear.**

   ```sh
   node .agents/skills/cutout-strobe/scripts/bass-map.mjs assets/audio/*.mp3 --len 20
   ```

   For each file it prints the tempo, the share of energy below 120 Hz, how often the bass is
   in, how many rests it has and how deep they are, the bass cycle, and a verdict for the best
   window of `--len` seconds:
   - **FITS:** a rest between walls at least every 4 s, the bass in for 35% to 80% of the window,
     12 dB or more down in the rests.
   - **PARTLY:** some rests. Put steps on the ones there are, and gate the others.
   - **NO RESTS:** the bass never stops. Pick another track, or use `music.gate`.

   Trap, drill, phonk, dubstep, and breakdown-heavy metal are where to look: music written with
   stop-start bass. A four-on-the-floor track almost never fits.
2. **Write the timeline from the frame map.**

   ```sh
   node .agents/skills/cutout-strobe/scripts/bass-map.mjs assets/audio/bed.mp3 --from 11.52 --len 19.4 --fps 30
   ```

   It prints every wall and rest in frames, where each wall's flash goes, and a skeleton with an
   `until` for every item. Walls go on walls, steps on rests. A rest under 6 frames is too short
   for a step; leave it inside the wall, or land a whip on it.
3. **A rest starts where the bass starts to fall.** The picture leaves on the first frame the
   level drops 4 dB under the wall, not when the tail has rung out. The map and the audit both
   read rests that way.
4. **The flash goes on the backbeat, not the loudest hit.** Inside a wall the mix is flat against
   the limiter and no attack stands out by level. The flash sits half a bass cycle after the bass
   comes in, moved onto the nearest attack within 70 ms. Attacks are found by spectral flux (new
   energy in any band), because a snare inside a wall of bass barely moves the total power.
5. **Steps of 5 frames sit on a 0.16 s pulse; steps of 3 are faster than it.** At 30 fps a
   sixteenth at 93.75 BPM is 4.8 frames. Use `"each": 5` when the rest has an audible pulse and
   3 or 4 when it is a plain gap. Four or five hits is the most a rest holds.
6. **Effects mark the picture and stay under the bed.**

   | Kind | Where | Level |
   | --- | --- | --- |
   | `hit` | Each flash | -7 |
   | `tick` | Each step hit and each blink | -13 |
   | `whip` | Peaks on each landing | -10 |
   | `rise` | Ends on an item with `"rise"` (use it into the first drop) | -15 |

   A level is the effect's loudest 10 ms against the bed's loudest 10 ms, in dB. The builder warns
   when the effects stem sits less than 6 LU under the bed. For a pure music mix, use `"sfx": {}`.
7. **`music.gate` makes a rest where the track has none.** Under a gated step the bed is
   high-passed at 220 Hz with 8 ms crossfades at both ends, so the bass drops out and comes back
   on the landing. It works, and it is an edit to someone's music: listen to every gated step.
8. **Loudness:** -14 LUFS, peaks limited at 4x oversampling to -5 dBFS, so the AAC encode lands
   under -1 dBTP. The mix opens over 20 ms and fades over the last 8 frames.

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
| Bed | Lil Pump Type by Arulo, music 410 | 1.92 s bass cycle (the reference's), 77% of its energy below 120 Hz, bass in 63% of the window used, 40 dB down in the rests |
| `hit` | Cinematic sci fi glitch, sfx 1022 | 0.83 s |
| `tick` | Cool interface click tone, sfx 2568 | 0.20 s |
| `whip` | Fast transitions swoosh, sfx 3115 | 0.57 s |
| `rise` | Cinematic trailer riser, sfx 790 | 2.57 s |

The bed was chosen by measurement: of 45 Mixkit trap, hip hop, rock, and metal tracks scored, it
was the one whose bass cycle matched the reference's to the frame. Its mood was not judged by
ear. Listen before using it for real work.

Do not use a commercial song you have no licence for. When the performer in the footage is the
track's own artist, as in the reference, the track is theirs to use; say so in `VERIFY.md`.
