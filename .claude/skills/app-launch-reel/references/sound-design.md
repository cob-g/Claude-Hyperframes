# Sound design

In this style the sound is half the energy. The rule is **every visual event has a sound, and
every sound sits on the grid**. The builder turns the plan's events into a cue sheet
(`alr/cues.json`) and premixes one soundtrack (`alr/audio/mix.wav`), so the audio can never
drift from the picture. Use real, licensed recordings; never synthesize the music or the
effects.

## Layers

| Layer | Kind | Where the builder puts it | Default gain |
| --- | --- | --- | --- |
| Music bed | `music` | From t = 0, cued so a drop lands on the opening hit. It swells in under the riser, drops out for half a beat before the manifesto, comes back `lift` times louder, and fades over a bar under the end card | 0.5, lift 3.2 |
| Transition whoosh | `whoosh` | Every transition. The peak lands one frame before a whip's cut, 0.06 s before an iris or focus cut, and at a pixel wipe's midpoint. Soft ones also play under the sheet, the swipe, and the theme wipe | 0.85 (0.3 soft) |
| UI pop | `pop` | Every list row, new row, detection tag, card, pill, widget lift, URL pill, toast, and the wordmark. Also module tiles, KPI tiles, chat bubbles, figure cards, and a number appearing | 0.6 |
| Tap | `tap` | Chip select, Save, swipe start, theme toggle. Also a number landing, each diagonal of a permission grid, and every burst word | 0.6 |
| Typing | `type` | Under each typed field, cut to the field's typing time | 0.5 |
| Riser | `riser` | Into the opening hit, and into the manifesto drop (at most 2 beats long) | 0.7 |
| Impact | `impact` | The opening hit; manifesto line 1 at full level, later lines at half; the modules card landing and the last burst word at about half | 1.3 |
| Success | `success` | A completed action (the green row) | 0.6 |
| Scan | `scan` | The scan line, and a dashboard chart growing | 0.55 |
| Shimmer | `shimmer` | The end card lockup | 1.0 |
| Voiceover | `voice` | One file per line, its first syllable on a scene beat. The bed and effects duck under it | level -12 LUFS, duck 3.5 |

The alignment rules come from the reference:

- **Audio leads picture.** Whoosh peaks land 1-4 frames before the cut; the eye reads the change
  a moment after the ear.
- **Peaks, not file starts.** The builder finds each file's loudest 10 ms (or its onset for
  pops, taps, and the shimmer) and aligns that point to the event. A whoosh with a long swell
  still peaks on time.
- **Sixteenths.** Rows, cards, pills, and chips are timed on sixteenths, so their pops form a
  rhythm with the hats.
- **Quiet, loud, quiet.** The reel breathes: a riser from near silence, a steady body, a
  louder drop at the manifesto, and a decay to silence. The reference measured 6.9 LU of
  loudness range; the audit wants at least 4.

### A minute-long mix

Over a minute, the bed's own sections carry the dynamics:

- Raise `gain` to about 0.7 so the music drives the first act.
- Let the track's breakdown be the quiet middle, where the chat, languages, and trust frames
  play. There the effects sit on top without a gain change.
- Lower `lift` to about 2.0 for the second drop.
- Stretch `fade` to about 3.2 s under an 8-beat end card.

A 60 s reel mixed this way measured -14.6 LUFS, 6.7 LU of range, and -1.2 dBTP.

### Voiceover

- **Density:** write one short line per frame or less.
  - Echo the on-screen idea rather than read every word.
  - Say one word per stat frame, on its first beat.
  - Leave the opening hit, the word burst, and the drop's impacts room to land.
  - Keep lines inside their scene; crossing a cut is fine when the sentence carries the momentum.
- **Local voice:** Kokoro TTS runs locally with no key:
  `HYPERFRAMES_PYTHON=~/.cache/hyperframes/tts-venv/bin/python npx hyperframes tts "<line>" -v af_heart -s 1.1 -o assets/vo/01.wav`.
  - Female voices: `af_heart` (the best), `af_nova`, `af_sky`, `bf_emma`, and `bf_isabella`.
  - Speed 1.1-1.25 matches this style.
  - Generate each line separately, so each one can sit on its beat.
- **Check every line with local Whisper** (`npm run transcribe:local`). Respell names the
  model misreads, for example "Ed-you-sphere" for EduSphere, and keep the display text in the
  plan.
- **Balance:** the voice should sit at least 8 dB over the bed during speech; the audit reports
  it. Lift lines that fall on a loud drop with `gain` (about 1.4). A voice fills the quiet
  sections, so expect the loudness range to fall toward 4 LU.

## Choosing the bed

- **Tempo 118-124 BPM,** four-on-the-floor house, electro-pop, or "technology" corporate. At
  120 BPM a two-beat feature frame is exactly one second, like the reference.
- **Wanted:** a clear kick, and a build that drops. Cue the drop onto the opening hit, and the
  track's own build becomes the intro.
- **Avoid:** vocals, busy leads, and half-time trap. The bed sits under the sound design; it is
  not the star.

Measure it:

```sh
node .claude/skills/app-launch-reel/scripts/beat-grid.mjs video-projects/<slug>/assets/audio/<bed>.mp3 --hit 1.0
```

It prints the tempo and each drop, with a ready `"music": { "bpm": ..., "start": ... }`. Use
the builder's printed hit time for `--hit`. Put the tempo in the plan too: the whole grid is
built from `music.bpm`.

## Sourcing

Search free libraries whose licence allows commercial web video, then download with the kit's
provenance script. The build and the render stay offline.

| Library | Licence | Notes |
| --- | --- | --- |
| [Mixkit music](https://mixkit.co/free-stock-music/house/) | Mixkit Stock Music Free License | Web, social, online ads, YouTube; no attribution. The file URL is in the player's `data-audio-player-preview-url-value` |
| [Mixkit sound effects](https://mixkit.co/free-sound-effects/whoosh/) | Mixkit Sound Effects Free License | Commercial use; never redistribute the file on its own |
| [Pixabay music](https://pixabay.com/music/) | Pixabay Content License | Skip tracks marked Content ID registered |

```sh
node .claude/skills/ip-17-pro-style/scripts/fetch-audio.mjs <file-url> video-projects/<slug>/assets/audio/<name>.mp3 \
  --page "<page>" --license "<licence>" --license-url "<licence url>" --title "<title>" --artist "<artist>"
```

The demo's picks (all Mixkit, found through each category page's player URLs):

| Kind | Title | File URL |
| --- | --- | --- |
| music | Electro Dreams (Arulo), 120.00 BPM, drop at 16.03 s, `start` 15.03 | https://assets.mixkit.co/music/190/190.mp3 |
| whoosh | Fast small sweep transition | https://assets.mixkit.co/active_storage/sfx/166/166-preview.mp3 |
| pop | Explainer video pops whoosh light pop | https://assets.mixkit.co/active_storage/sfx/3005/3005-preview.mp3 |
| tap | Select click | https://assets.mixkit.co/active_storage/sfx/1109/1109-preview.mp3 |
| type | Smartphone typing | https://assets.mixkit.co/active_storage/sfx/1393/1393-preview.mp3 |
| riser | Cinematic trailer riser | https://assets.mixkit.co/active_storage/sfx/790/790-preview.mp3 |
| impact | Cinematic whoosh deep impact | https://assets.mixkit.co/active_storage/sfx/1143/1143-preview.mp3 |
| success | Confirmation tone | https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3 |
| scan | Fast sci fi transition sweep | https://assets.mixkit.co/active_storage/sfx/3114/3114-preview.mp3 |
| shimmer | Magic notification ring | https://assets.mixkit.co/active_storage/sfx/2344/2344-preview.mp3 |

Other good fits in the same libraries: "Fast whoosh transition" (1490) and "Air woosh" (1489)
for whooshes; "Bubble pop up alert notification" (2357) for pops; "Positive notification"
(951) or "Correct answer tone" (2870) for success; "Big cinematic impact" (788) for a longer
drop. Play every file first. Many "impacts" open with a swell, and the builder aligns their
loudest point, so a file whose loudest moment is the wrong event will land wrong. Set
`"peak"` on that sfx entry to override the detected peak time.

## The mix

- The builder places every cue with `atrim` and `adelay` and sums everything with `amix`
  (no normalisation).
- It measures loudness, applies a linear gain to -14 LUFS, and limits at -4 dBFS. The ceiling
  sits that low because the renderer's AAC encode adds up to 3 dB of inter-sample overshoot;
  the audit wants -1 dBTP or lower on the render.
- It also writes `alr/audio/stems/sfx.wav` and `stems/bed.wav`, where the audit checks whoosh
  timing and the kick grid.
- To rebalance, change `music.gain`, `music.lift`, `music.gap`, or a sfx entry's `gain`, then
  rebuild. Never edit `mix.wav`.

## Listen for

- The hit at 1.0 s should be the first loud moment.
- Each whoosh should feel like it *pulls* the cut.
- Pops should read as the UI reacting, not as clutter.
- The gap before the manifesto should feel like a held breath.
- The end should ring out. If the bed fights the whooshes, lower `music.gain`; if the drop
  doesn't land, raise `lift` or the impact's gain.
